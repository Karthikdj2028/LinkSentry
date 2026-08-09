# LinkSentry Production Deployment & Operations Guide

> **Architecture**: React 19 (Vite) + FastAPI (Python 3.11) + Google Cloud Firestore + Firebase Authentication  
> **Firebase Project**: `linksentry-7e694`  
> **Backend Engines**: `linksentry-heuristic-v1` & `linksentry-message-heuristic-v1`  

---

## 1. Production Architecture Overview

LinkSentry is architected as a decoupled, multi-tier threat detection system:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / USER TIER                              │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               React 19 + Vite Static SPA                       │   │
│   │       (Deployed on Firebase Hosting / Cloudflare Pages)        │   │
│   └───────────────┬────────────────────────────────┬───────────────┘   │
└───────────────────┼────────────────────────────────┼───────────────────┘
                    │                                │
                    │ HTTPS REST Calls               │ Firebase Client SDK
                    │                                │ (Auth Tokens & WebSockets)
                    ▼                                ▼
┌───────────────────────────────────────┐  ┌─────────────────────────────┐
│             BACKEND TIER              │  │     IDENTITY & DATA TIER    │
│                                       │  │                             │
│   FastAPI Python 3.11 Container       │  │   Google Cloud Firestore    │
│   (Google Cloud Run / Render / ECS)   │  │   • users/{uid}/scans       │
│   • linksentry-heuristic-v1           │  │   Firebase Authentication   │
│   • linksentry-message-heuristic-v1   │  │   • Email/Password Identity │
│   • In-Memory Rate Limiter (60/min)   │  │   • Rules: auth.uid == user │
│   • GET /api/health                   │  │                             │
└───────────────────────────────────────┘  └─────────────────────────────┘
```

---

## 2. Frontend Deployment (Firebase Hosting)

### 1. Configure Environment Variables
Set the production backend API URL before building:
```env
# In .env.production (or pipeline CI/CD secrets):
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=linksentry-7e694.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=linksentry-7e694
VITE_FIREBASE_STORAGE_BUCKET=linksentry-7e694.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:...
VITE_FIREBASE_MEASUREMENT_ID=G-...
```

### 2. Build and Deploy
```bash
# Build optimized static assets into dist/
npm run build

# Deploy static assets to Firebase Hosting
npx -y firebase-tools@latest deploy --only hosting
```

The deployed frontend will be accessible at:
`https://linksentry-7e694.web.app` (and `https://linksentry-7e694.firebaseapp.com`).

---

## 3. Backend Deployment (Docker / Google Cloud Run / Render)

### Option A: Google Cloud Run (Recommended Containerized Deployment)
```bash
# 1. Build and push container to Google Artifact Registry
gcloud builds submit --tag gcr.io/linksentry-7e694/linksentry-api:v0.5.0 .

# 2. Deploy to Cloud Run with environment variables
gcloud run deploy linksentry-api \
  --image gcr.io/linksentry-7e694/linksentry-api:v0.5.0 \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars LINKSENTRY_ALLOWED_ORIGINS="https://linksentry-7e694.web.app,https://linksentry-7e694.firebaseapp.com" \
  --set-env-vars LINKSENTRY_RATE_LIMIT_PER_MINUTE="60"
```

### Option B: Render / Railway / Native Docker Host
1. Connect the GitHub repository.
2. Select **Docker Runtime** (uses root `Dockerfile`).
3. Configure environment variables in the dashboard:
   - `LINKSENTRY_ALLOWED_ORIGINS` = `https://linksentry-7e694.web.app,https://linksentry-7e694.firebaseapp.com`
   - `LINKSENTRY_RATE_LIMIT_PER_MINUTE` = `60`
   - `PORT` = `8000` (or host assigned port)

---

## 4. Cloud Firestore Security Rules Deployment

Deploy the repository's audited security rules:
```bash
npx -y firebase-tools@latest deploy --only firestore:rules
```

### Verified Guarantees
- Default deny-all on unknown collections (`allow read, write: if false;`).
- User scan data is strictly isolated to `users/{userId}/scans/{scanId}`.
- Authenticated users can only read, write, and delete their own scan history (`request.auth.uid == userId`).
- Document payload ownership validation: `request.resource.data.userId == request.auth.uid`.

---

## 5. Production Health & End-to-End Verification Matrix

| Step | Target Endpoint / Component | Input / Action | Expected Result |
| :--- | :--- | :--- | :--- |
| **1. Health Probe** | `GET /api/health` | HTTP GET | `200 OK` ➔ `{"status":"ok","service":"LinkSentry API","version":"0.5.0"}` |
| **2. Clean URL Scan** | `POST /api/scan/url` | `{"url": "https://example.com"}` | `200 OK` ➔ `verdict: "safe"`, `risk_score: 0` |
| **3. Phishing URL Scan** | `POST /api/scan/url` | `{"url": "http://paypal-security-verification.xyz/account/login.php?verify=1"}` | `200 OK` ➔ `verdict: "phishing"`, `risk_score >= 70` |
| **4. Clean Message Scan**| `POST /api/scan/message` | `{"message": "Meeting is scheduled for tomorrow at 10 AM."}` | `200 OK` ➔ `verdict: "safe"`, `risk_score: 0` |
| **5. Phishing Message** | `POST /api/scan/message` | `{"message": "Your bank account is suspended. Send the OTP immediately."}` | `200 OK` ➔ `verdict: "phishing"`, `risk_score >= 70` |
| **6. Hardened Renewal** | `POST /api/scan/message` | `{"message": "Dear user, your cloud storage subscription could not renew automatically. To keep your files safe, check billing at http://cloud-storage-renewal-fix.net/pay today."}` | `200 OK` ➔ `verdict: "phishing"`, `risk_score: 100` |
| **7. Input Constraints** | `POST /api/scan/url` | `{"url": ""}` (empty string) | `422 Unprocessable Content` (sanitized detail) |
| **8. Rate Limiting** | `POST /api/scan/url` | Exceed 60 requests/minute | `429 Too Many Requests` + `Retry-After: 60` header |
| **9. Authentication** | Firebase Auth | Sign-in with Email/Password | Session token stored securely; persistent on refresh |
| **10. Firestore Write** | `saveScan()` | User executes scan on frontend | Stored under `users/{uid}/scans/{scanId}` with `type: "url" \| "qr" \| "message"` |
| **11. History & Telemetry** | History & Dashboard | Open tabs in frontend | Populated with real Firestore scan history and accurate threat metrics |

---

## 6. Rollback Procedures

### Frontend Rollback (Firebase Hosting)
Firebase Hosting stores previous releases. Roll back to any prior version instantly:
```bash
# Roll back to previous hosting deployment in Firebase Console or via CLI:
npx -y firebase-tools@latest hosting:releases:rollback
```

### Backend Rollback (Cloud Run / Container)
```bash
# Revert traffic to the previous healthy revision:
gcloud run services update-traffic linksentry-api --to-revisions=PREVIOUS_REVISION=100
```

### Firestore Security Rules Rollback
Revert to the previous version in the Firebase Console:
`Firebase Console ➔ Firestore Database ➔ Rules ➔ Rules history ➔ Select prior timestamp ➔ Publish`

---

## 7. Known Production Limitations

1. **In-Memory Rate Limiting**: The built-in rate limiter is memory-resident per container worker. In multi-instance autoscaling environments (e.g. 5+ Cloud Run instances), rate limits are enforced per-instance rather than globally. For global cluster-wide rate limiting, use Cloudflare WAF or a Redis backend.
2. **Static Heuristic Inspection**: LinkSentry evaluates lexical patterns and static URL structure without rendering DOM or detonating payloads in a headless sandbox.
