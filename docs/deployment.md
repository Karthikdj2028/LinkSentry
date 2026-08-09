# LinkSentry Production Hardening & Deployment Guide

> **Version**: Stage 7 Production Ready  
> **Backend Service**: FastAPI (`v0.5.0`)  
> **Frontend**: React 19 + Vite (`v8.x`)  
> **Database & Auth**: Cloud Firestore + Firebase Authentication  

---

## 1. Architecture Overview

LinkSentry operates as a decoupled modern web application:
- **Frontend SPA**: Static HTML/CSS/JS bundle built with Vite, interacting with Firebase client SDK for Authentication/Firestore and FastAPI for static heuristic threat analysis.
- **Backend API**: Stateless FastAPI application executing Python threat heuristics (`linksentry-heuristic-v1` and `linksentry-message-heuristic-v1`).
- **Database & Identity**: Google Cloud Firestore with per-user document security rules (`users/{userId}/scans/{scanId}`) and Firebase Email/Password Authentication.

---

## 2. Frontend Configuration & Deployment

### Environment Configuration
The frontend consumes environment variables via Vite (`import.meta.env`).

Create `.env.local` (or supply deployment pipeline environment variables):
```env
# Firebase Web App Client Configuration (Public API credentials)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=linksentry-demo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=linksentry-demo
VITE_FIREBASE_STORAGE_BUCKET=linksentry-demo.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:...
VITE_FIREBASE_MEASUREMENT_ID=G-...

# FastAPI Backend URL (Production HTTPS domain)
VITE_API_BASE_URL=https://api.yourdomain.com
```

> [!WARNING]
> In production deployments, `VITE_API_BASE_URL` must point to your live HTTPS backend API domain. `localhost` or `127.0.0.1` must never be used in production builds.

### Build Commands
```bash
# 1. Install dependencies
npm install

# 2. Run linter validation
npm run lint

# 3. Compile optimized production bundle to /dist
npm run build
```

---

## 3. Backend Configuration & Deployment

### Requirements & Installation
```bash
# Create and activate Python virtual environment
python -m venv backend/.venv
# Windows:
backend\.venv\Scripts\activate
# Linux/macOS:
source backend/.venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### Environment Variables
| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `LINKSENTRY_ALLOWED_ORIGINS` | `http://localhost:5173, http://127.0.0.1:5173` | Comma-separated list of allowed frontend origins for CORS. In production, set to `https://app.yourdomain.com`. |
| `LINKSENTRY_RATE_LIMIT_PER_MINUTE` | `60` | Max requests per minute per IP for scanner endpoints. Set to `0` or `disabled` to bypass. |

### Running FastAPI with Uvicorn / Gunicorn
For production behind a reverse proxy:
```bash
# Single process / Container:
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4 --proxy-headers --forwarded-allow-ips='*'
```

---

## 4. Cloud Firestore Security Rules

Deploy the repository's audited `firestore.rules` using the Firebase CLI:
```bash
npx -y firebase-tools@latest deploy --only firestore:rules
```

### Verified Guarantees
- Unauthenticated access is completely rejected (`allow read, write: if false;` by default).
- Scans are strictly partitioned under `users/{userId}/scans/{scanId}`.
- Authenticated users can only read, write, and delete their own scans (`request.auth.uid == userId`).
- Document creation requires `request.resource.data.userId == request.auth.uid`.

---

## 5. Security Headers & Reverse Proxy Recommendations

When deploying behind Nginx, Caddy, Cloudflare, or AWS CloudFront, apply standard security headers:

```nginx
# Example Nginx security headers
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(self), geolocation=(), microphone=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Content Security Policy (Allows Firebase Auth, Firestore, and LinkSentry API)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseio.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.yourdomain.com https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com; img-src 'self' data: blob:; media-src 'self' blob:; frame-src https://*.firebaseapp.com;" always;
```

---

## 6. Rate Limiting & Abuse Prevention

- **Built-in Limiter**: LinkSentry includes a thread-safe in-memory sliding-window limiter (`60 requests/minute/IP`).
- **Horizontal Scaling Consideration**: For multi-instance container clusters (e.g. Kubernetes, AWS ECS, Google Cloud Run), replace the in-memory limiter with Redis or enforce rate limiting at the API Gateway / Cloudflare layer.

---

## 7. Health & Monitoring

- **Health Check**: `GET /api/health`
  - Returns `{"status": "ok", "service": "LinkSentry API", "version": "0.5.0"}`
  - Ideal for load balancer target group probes, Kubernetes readiness/liveness checks, and Uptime monitors.
