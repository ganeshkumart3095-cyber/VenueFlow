"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.callGemini = exports.getBigQueryAnalytics = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const bigquery_1 = require("@google-cloud/bigquery");
const generative_ai_1 = require("@google/generative-ai");
admin.initializeApp();
const bq = new bigquery_1.BigQuery();
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'gen-lang-client-0460255563';
const DATASET_ID = 'venueflow_analytics';
exports.getBigQueryAnalytics = functions.https.onCall(async (data, context) => {
    // Check auth if needed: if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '...');
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
    }
    catch (error) {
        console.error('BigQuery Query Error:', error);
        throw new functions.https.HttpsError('internal', 'BigQuery query failed');
    }
});
/**
 * Secure wrapper for Gemini API with Rate Limiting
 */
exports.callGemini = functions.https.onCall(async (data, context) => {
    // 1. Authenticate
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be signed in.');
    }
    const uid = context.auth.uid;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    // 2. Rate Limiting (Max 10 per minute)
    const rateLimitRef = admin.firestore().collection('rateLimits').doc(uid);
    const rateLimitDoc = await rateLimitRef.get();
    const history = rateLimitDoc.exists ? (rateLimitDoc.data()?.timestamps || []) : [];
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
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    try {
        const result = await model.generateContent(data.prompt);
        const response = await result.response;
        return { text: response.text() };
    }
    catch (error) {
        console.error("Gemini server error:", error);
        throw new functions.https.HttpsError('internal', 'AI generation failed.');
    }
});
//# sourceMappingURL=index.js.map