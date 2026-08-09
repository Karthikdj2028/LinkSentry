# LinkSentry Message Scanner Integration

> **Integration Stage**: Stage 6B  
> **Backend Endpoint**: `POST /api/scan/message`  
> **Engine Identifier**: `linksentry-message-heuristic-v1`  
> **Firestore Vector**: `type: "message"`

---

## 1. Overview & User Flow

The **Message Scanner** allows users to paste suspicious SMS, email, or chat messages for threat evaluation. The client sends the content to the FastAPI backend, renders the explainable threat assessment immediately via `ScanResultCard`, and saves the scan record to Cloud Firestore.

```text
[ User submits message in MessageScanner.jsx ]
                     │
                     ▼
          [ Client-Side Validation ]
                     │
                     ▼
      [ POST /api/scan/message (FastAPI) ]
                     │
                     ▼
    [ linksentry-message-heuristic-v1 Engine ]
                     │
                     ▼
       [ Immediately Render ScanResultCard ]
                     │
                     ▼
     [ Check Authenticated currentUser.uid ]
                     │
                     ▼
   [ mapBackendScanToFirestoreDoc(..., 'message') ]
                     │
                     ▼
    [ saveScan(currentUser.uid, payload) ]
                     │
                     ▼
 [ users/{userId}/scans/{scanId} (type: "message") ]
```

---

## 2. API Contract

- **Endpoint**: `POST http://127.0.0.1:8000/api/scan/message`
- **Content-Type**: `application/json`

### Request Payload
```json
{
  "message": "PayPal: Your account has been suspended. Verify your password immediately: http://login-account-verification.xyz/secure/login"
}
```

### Response Payload
```json
{
  "verdict": "phishing",
  "risk_score": 100,
  "confidence": 0.94,
  "message": "PayPal: Your account has been suspended. Verify your password immediately: http://login-account-verification.xyz/secure/login",
  "indicators": [
    "Urgency or time-pressure language detected: 'immediately'",
    "Account restriction/suspension claim detected ('suspended')",
    "Account security lure combined with verification request detected (account + verify)",
    "Direct credential or password prompt detected",
    "Brand impersonation pattern: Target brand 'Paypal' paired with security or payment lure",
    "Embedded link 'http://login-account-verification.xyz/secure/login' flagged as high-risk phishing destination"
  ],
  "engine": "linksentry-message-heuristic-v1"
}
```

---

## 3. Firestore Document Schema (`type: "message"`)

Every completed message threat scan is persisted under the user's private subcollection:
`users/{currentUser.uid}/scans/{scanId}`

```json
{
  "userId": "nK8L0...",
  "type": "message",
  "input": "Meeting is scheduled for tomorrow at 10 AM.",
  "url": "",
  "domain": "",
  "verdict": "safe",
  "riskScore": 0,
  "confidence": 0.85,
  "indicators": [],
  "engine": "linksentry-message-heuristic-v1",
  "createdAt": "serverTimestamp()"
}
```

> [!NOTE]
> For messages containing an embedded HTTP/HTTPS link, the extracted URL and domain are populated automatically in `url` and `domain`. For messages without links, `url` and `domain` remain empty strings while preserving the entire raw message text in `input`.

---

## 4. Authentication & UID Binding

- The `userId` is obtained strictly from the active Firebase session (`currentUser.uid`).
- If the user is unauthenticated, the scan result renders locally without attempting a database write.

---

## 5. Non-Blocking Persistence & Error Handling

1. **FastAPI Offline**: Displays `⚠️ Unable to connect to LinkSentry backend.`
2. **Firestore Outage / Failure**: The `ScanResultCard` remains visible, and a non-blocking alert is displayed:
   `⚠️ Message scan completed, but the result could not be saved to history.`
3. **Empty / Invalid Input**: Client-side validation stops the submission before making network calls.

---

## 6. Duplicate-Save Prevention

- `saveScan()` is triggered only from the explicit form submit event handler.
- It is decoupled from `useEffect` and React render cycles.
- Multiple submissions of the same message create distinct event records (with unique timestamps and Firestore document IDs), which represents standard audit history.

---

## 7. History & Dashboard Compatibility

- **History (`src/pages/HistoryPage.jsx`)**: Filterable by `MESSAGE`. Displays the original message snippet, risk meter, verdict badge, and `linksentry-message-heuristic-v1` tag.
- **Dashboard (`src/pages/DashboardPage.jsx`)**: Increments `Total Scans`, updates verdict distributions, and includes `risk_score >= 70` message threats in **High-Risk Security Alerts**.

---

## 8. Security Boundaries

- **Static Heuristics Only**: Embedded links are parsed via regex and analyzed statically without making outbound HTTP requests, following redirects, or fetching remote HTML.
- **No Outbound Actions**: The engine never sends SMS responses, places phone calls, or communicates with external threat intelligence APIs.
