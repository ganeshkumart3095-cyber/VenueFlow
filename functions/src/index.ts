import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { BigQuery } from '@google-cloud/bigquery';
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();
const bq = new BigQuery();

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FB_PROJECT_ID || 'venue-flow-default';
const DATASET_ID = 'venueflow_analytics';
const PROMPT_MAX_LENGTH = 1000;

interface GeminiRequest {
  prompt?: unknown;
  systemInstruction?: unknown;
  config?: {
    responseMimeType?: unknown;
  };
}

const DISALLOWED_PROMPT_PATTERNS = [
  /ignore previous instructions/i,
  /system prompt/i,
  /you are now a/i,
  /forget everything/i,
  /output the internal/i,
  /reveal your secret/i,
  /execute command/i,
];

function sanitizePrompt(rawPrompt: unknown): string {
  if (typeof rawPrompt !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Prompt must be a string.');
  }

  const stripped = rawPrompt.replace(/<[^>]*>?/gm, '').trim();
  if (!stripped) {
    throw new functions.https.HttpsError('invalid-argument', 'Prompt cannot be empty.');
  }

  const boundedPrompt = stripped.slice(0, PROMPT_MAX_LENGTH);
  if (DISALLOWED_PROMPT_PATTERNS.some((pattern) => pattern.test(boundedPrompt))) {
    throw new functions.https.HttpsError('invalid-argument', 'Prompt rejected by security policy.');
  }

  return boundedPrompt;
}

async function getUserRole(uid: string): Promise<string | null> {
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  if (!userDoc.exists) {
    return null;
  }

  const role = userDoc.data()?.role;
  return typeof role === 'string' ? role : null;
}

export const getBigQueryAnalytics = functions.https.onCall(async (_data: unknown, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in.');
  }

  const userRole = await getUserRole(context.auth.uid);
  if (userRole !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can access analytics.');
  }

  const queries = {
    // (a) Average wait time per sector over last 1 hour
    avgWaitTime: `
      SELECT 
        JSON_VALUE(data, '$.sectorId') as sectorId, 
        AVG(SAFE_CAST(JSON_VALUE(data, '$.waitTime') AS FLOAT64)) as avgWait 
      FROM \`${PROJECT_ID}.${DATASET_ID}.queues_raw_changelog\` 
      WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR) 
      GROUP BY sectorId
    `,
    
    // (b) Peak crowd density by sector (ever or in timeframe)
    peakDensity: `
      SELECT 
        JSON_VALUE(data, '$.id') as sectorId, 
        MAX(SAFE_CAST(JSON_VALUE(data, '$.density') AS FLOAT64)) as peakDensity 
      FROM \`${PROJECT_ID}.${DATASET_ID}.venues_raw_changelog\` 
      GROUP BY sectorId
    `,
    
    // (c) Staff task completion rate
    taskEfficiency: `
      SELECT 
        COUNTIF(JSON_VALUE(data, '$.status') = 'completed') as completed,
        COUNT(*) as total,
        COUNTIF(JSON_VALUE(data, '$.status') = 'completed') / NULLIF(COUNT(*), 0) as rate
      FROM \`${PROJECT_ID}.${DATASET_ID}.tasks_raw_latest\`
    `
  };

  try {
    const [avgWaitResults] = await bq.query({ query: queries.avgWaitTime });
    const [peakDensityResults] = await bq.query({ query: queries.peakDensity });
    const [taskResults] = await bq.query({ query: queries.taskEfficiency });

    return {
      waitTime: avgWaitResults,
      density: peakDensityResults,
      efficiency: taskResults[0] || { rate: 0, completed: 0, total: 0 }
    };
  } catch (error) {
    console.error('BigQuery Query Error:', error);
    throw new functions.https.HttpsError('internal', 'BigQuery query failed');
  }
});

/**
 * Secure wrapper for Gemini API with Rate Limiting
 */
export const callGemini = functions.https.onCall(async (data: GeminiRequest, context: functions.https.CallableContext) => {
  // 1. Authenticate
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in.');
  }

  const uid = context.auth.uid;
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const cleanPrompt = sanitizePrompt(data.prompt);

  // 2. Rate Limiting (Max 10 per minute)
  const rateLimitRef = admin.firestore().collection('rateLimits').doc(uid);
  const rateLimitDoc = await rateLimitRef.get();
  const rawHistory = rateLimitDoc.exists ? rateLimitDoc.data()?.timestamps : [];
  const history: number[] = Array.isArray(rawHistory)
    ? rawHistory.filter((ts): ts is number => typeof ts === 'number')
    : [];
  
  const recentRequests = history.filter(ts => ts > oneMinuteAgo);
  if (recentRequests.length >= 10) {
    throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded. Try again in a minute.');
  }

  // 3. Update rate limit history
  recentRequests.push(now);
  await rateLimitRef.set({ timestamps: recentRequests });

  // 4. Secure API Call (Key stored in Environment)
  const apiKey = functions.config().gemini.key;
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Gemini API Key not configured on server.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  try {
    const result = await model.generateContent(cleanPrompt);
    const response = await result.response;
    return { text: response.text() };
  } catch (error) {
    console.error("Gemini server error:", error);
    throw new functions.https.HttpsError('internal', 'AI generation failed.');
  }
});

/**
 * AGENTIC TASKING: Background trigger to auto-generate staff tasks
 * when sector density hits critical levels (>80%).
 */
export const onQueueUpdateAgentic = functions.firestore
  .document('queues/{queueId}')
  .onUpdate(async (change, _context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const newDensity = Number(newData?.density ?? 0);
    const oldDensity = Number(oldData?.density ?? 0);

    if (!Number.isFinite(newDensity) || !Number.isFinite(oldDensity)) {
      return null;
    }

    // Only act if density just crossed the 80% threshold
    if (newDensity >= 80 && oldDensity < 80) {
      const sectorId = newData.sectorId || 'Unknown Sector';
      const prompt = `
        VENUE ANALYTICS ALERT: Sector ${sectorId} has reached ${newDensity}% density.
        Wait time is currently ${newData.waitTime} minutes.
        ACT AS: A senior stadium operations manager.
        TASK: Generate a single, clear, high-priority staff instruction to mitigate this density surge.
        RESPONSE FORMAT: Just the instruction text, max 15 words.
      `;

      const apiKey = functions.config().gemini.key;
      if (!apiKey) return;

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      try {
        const result = await model.generateContent(prompt);
        const taskText = result.response.text();

        // Create the task in Firestore for staff to see
        await admin.firestore().collection('tasks').add({
          description: taskText,
          location: sectorId,
          priority: 'high',
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          generatedBy: 'VenueFlow-AI-Agent'
        });

        console.log(`Agentic Task Created for Sector ${sectorId}: ${taskText}`);
      } catch (err) {
        console.error("Agentic Task Generation Failed:", err);
      }
    }
    return null;
  });
