# VenueFlow AI 🏟️✨
### *Transforming Venue Congestion into Fluid Experiences with Agentic AI*

[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)](https://firebase.google.com/)
[![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)

---

## 📖 The "Flash Crowd" Problem
At massive events (80k+ people), **seconds matter**. Sudden surges at gates or facilities lead to:
- ⚠️ **Safety Hazards**: Dangerous compression at entry/exit points.
- ⏳ **Economic Loss**: 40min+ wait times discourage facility usage.
- 📉 **Operational Blindness**: Staff are often reactive, not predictive.

**VenueFlow AI** solves this by creating a **Responsive Venue Ecosystem** that predicts surges 30 minutes before they happen.

---

## 🔥 Features at a Glance

### 📱 For Attendees (The Companion)
- **📍 Real-time Heatmaps**: Visualize density across 8+ stadium sectors.
- **🗺️ Intelligent AR Nav**: Avoid the crowd with AR-powered routing to low-density zones.
- **💬 Gemini Concierge**: Ask *"Where is the shortest line for tacos?"* or *"Fastest way to Gate B?"*
- **🔊 Accessible Voice**: Navigation commands read aloud via **Gemini 2.5 Flash TTS**.

### 🛠️ For Staff (The Orchestrator)
- **🤖 Agentic Tasking**: AI automatically generates and assigns tasks when density thresholds are breached.
- **📈 Predictive Analytics**: View AI-generated density forecasts for the next 30 minutes.
- **💬 Stealth Coordination**: Secure staff-only communications channel.

### 🏛️ For Admins (The Strategist)
- **📊 BigQuery Visualizer**: High-fidelity charts streaming directly from Firestore changelogs.
- **⏱️ Efficiency Tracker**: Monitor wait-time reduction and staff response speed.

---

## 🏗️ Technical Architecture

```mermaid
graph TD
    subgraph Client_Layer [Client Layer]
        A[React 19 Frontend]
        B[Maps JS API]
        C[Framer Motion]
    end

    subgraph Security_Gate [Security Gate]
        D[Firebase Auth]
        E[Cloud Functions Wrapper]
    end

    subgraph Data_AI_Engine [Data & AI Engine]
        F[(Cloud Firestore)]
        G[Gemini 2.0 Flash]
        H[Gemini 2.5 TTS]
        I[(BigQuery Warehouse)]
    end

    A <--> D
    A <--> E
    E <--> G
    E <--> H
    A <--> F
    F -->|Extension| I
    E <--> I
    A --- B
```

---

## 🛠️ The Google Stack

| Service | Role | Icon |
| :--- | :--- | :---: |
| **Gemini 2.0 Flash** | **The Brain**: Predictive surge analysis & agentic task generation. | 🧠 |
| **Gemini 2.5 TTS** | **The Voice**: Human-like navigation for accessibility. | 🗣️ |
| **Cloud Functions** | **The Shield**: Secure API proxying and rate-limiting. | 🛡️ |
| **Firestore** | **The Pulse**: Real-time state syncing for crowd data. | 💓 |
| **BigQuery** | **The Memory**: Historical analytics for venue optimization. | 📚 |
| **Maps JS API** | **The Canvas**: Interactive indoor stadium routing. | 🗺️ |

---

## 🚀 Quick Start Guide

### 1️⃣ Clone & Install
```bash
git clone https://github.com/your-username/VenueFlow.git
cd VenueFlow
npm install
cd functions && npm install && cd ..
```

### 2️⃣ Environment Configuration
Create a `.env` file in the root:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_PROJECT_ID=your_id
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
```

### 3️⃣ Backend Deployment
```bash
# Set Gemini Key in Functions
firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"

# Deploy Security Rules & Logic
firebase deploy --only functions,firestore:rules
```

---

## 🧪 Robust Testing Suite
We maintain a **90%+ core logic coverage** with Vitest.

```bash
npm test
```
- **Gemini Mocking**: Validates AI resilience during downtime.
- **Queue Logic**: Ensures wait-time calculations are frame-perfect.
- **RBAC Verification**: Confirms strict data isolation between roles.

---

## 🌍 Impact on SDG 11
By optimizing movement, we reduce idle time (and associated carbon footprint) and create safer, more inclusive public spaces. **VenueFlow AI makes cities smarter, one event at a time.**

---

**VenueFlow AI — Smart Venue Management**

