# LinkSentry V3.4 Android Cross-Platform Audit

## 1. Executive Summary

A comprehensive architectural and functional audit of the **LinkSentry Android Application** (`com.linksentry.app`) was performed against the **LinkSentry V3.4 Web Baseline** and the unified FastAPI backend (`/api/scan/url`, `/api/scan/message`, `/api/health`).

### Key Findings:
1. **Core Threat Detection Pipeline**: Android successfully communicates with the live backend over Retrofit/OkHttp, benefiting from the V3.4 server-side LinearSVC classification, rule-fusion engine, typosquatting checks, SSRF filtering, and domain verification.
2. **API Data Consumption Gap**: Android currently maps only the legacy V3.3 subset of the API response (`verdict`, `risk_score`, `confidence`, `indicators`, `domain`, `engine`, `modelVersion`). The rich **V3.4 Domain Verification payload** (`domain_verification`: DNS state, HTTP reachability, status code, latency, TLS, redirect count), **Technical Decision Margins** (`decision_scores`), and **Threat Attribution** (`impersonated_domain`, `brand_similarity`) are parsed partially or dropped before reaching the UI state.
3. **UI / Presentation Parity**: The Android URL scanner displays a high-level verdict badge and a 0–100 animated threat meter, but lacks the structured multi-stage scanning pipeline feedback, collapsible technical model decision margins, live DNS/reachability cards, and interactive URL Anatomy breakdown.
4. **Educational Subsystem**: Android currently lacks the "Understand the Link" educational module, Interactive URL Anatomy, "Spot the Trap" mini-scenarios, and Security Knowledge cards.
5. **Android-Specific Security Strengths**: Android features native hardware integration including real-time CameraX QR/Barcode scanning with ML Kit, gallery QR decoding, system text-share targeting (`ACTION_SEND` and `ACTION_PROCESS_TEXT`), automatic clipboard threat detection, and dual local/cloud Firestore scan persistence.
6. **History Invariants**: Android strictly conforms to the system security invariant: **raw LinearSVC decision margins and temporary telemetry are NOT persisted** into Cloud Firestore or local cache.

---

## 2. Current Android Architecture

| Architectural Layer | Implementation Details | Location |
| :--- | :--- | :--- |
| **Language & Toolchain** | Kotlin 2.0.21, Java 21, Gradle 8.10.2, Android SDK 35 (Min SDK 26) | [`android/app/build.gradle.kts`](file:///d:/LinkSentry/android/app/build.gradle.kts) |
| **UI Framework** | 100% Jetpack Compose (BOM 2024.10.01), Material 3 | [`android/app/src/main/java/com/linksentry/app/ui/`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/) |
| **Navigation** | Jetpack Navigation Compose (`NavHost`) with single-activity architecture | [`MainActivity.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/MainActivity.kt) |
| **State Management** | Unidirectional Data Flow via Kotlin Coroutines & `StateFlow` in ViewModels | [`ScannerViewModel.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/screens/scanner/ScannerViewModel.kt) |
| **Network & Serialization** | Retrofit 2.11.0, OkHttp Logging Interceptor 4.12.0, Gson 2.11.0 | [`ApiClient.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/data/api/ApiClient.kt), [`LinkSentryApiService.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/data/api/LinkSentryApiService.kt) |
| **Hardware & ML Kit** | CameraX 1.4.0 (Lifecycle, Camera2, View), Google ML Kit Barcode Scanning 17.3.0 | [`ScannerScreen.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/screens/scanner/ScannerScreen.kt) |
| **Cloud & Storage** | Firebase Auth 23.1.0, Firebase Firestore 25.1.1, SharedPreferences (Offline Cache) | [`ScanRepository.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/data/repository/ScanRepository.kt), [`LocalScanManager.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/data/preferences/LocalScanManager.kt) |

---

## 3. V3.4 API Parity Audit

The following table evaluates Android's data model (`ApiModels.kt`) and network consumption against the backend V3.4 API contract:

| Backend Field | Classification | Android Model Presence | Android UI Consumption | Notes / Remediation |
| :--- | :---: | :---: | :---: | :--- |
| `verdict` | **IMPLEMENTED** | `UrlScanResponse.verdict` | Displayed via `CyberBadge` | Fully functional |
| `risk_score` | **IMPLEMENTED** | `UrlScanResponse.riskScore` | Displayed via `ThreatMeter` | Fully functional |
| `confidence` | **IMPLEMENTED** | `UrlScanResponse.confidence` | Displayed in Bottom Sheet | Fully functional |
| `indicators` | **IMPLEMENTED** | `UrlScanResponse.indicators` | Rendered with warning icons | Fully functional |
| `ml_prediction` | **PARTIALLY IMPLEMENTED**| `UrlScanResponse.mlPrediction` | Not rendered in UI | Stored in response object, ignored by UI |
| `trusted_domain` | **PARTIALLY IMPLEMENTED**| `UrlScanResponse.trustedDomain`| Not rendered in UI | Present in model, not rendered |
| `impersonated_domain`| **PARTIALLY IMPLEMENTED**| `UrlScanResponse.impersonatedDomain`| Not rendered in UI | Present in model, not rendered |
| `model_version` | **IMPLEMENTED** | `UrlScanResponse.modelVersion` | Rendered in Bottom Sheet | Displays `"V3.4"` when returned from backend |
| `detection_engine` | **IMPLEMENTED** | `UrlScanResponse.engine` | Rendered in Bottom Sheet | Maps backend engine string |
| `decision_scores` | **PARTIALLY IMPLEMENTED**| `UrlScanResponse.decisionScores` | Not rendered in UI | Parsed into `Map<String, Double>`, dropped in `ScannerResultUi` |
| `threat_analysis` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Nested V3.4 threat breakdown object missing |
| `domain_verification`| **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Nested V3.4 domain verification object missing |
| `dns_resolved` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Sub-field of `domain_verification` |
| `dns_status` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Sub-field of `domain_verification` (`NOERROR`, `NXDOMAIN`) |
| `resolved_ips` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Sub-field of `domain_verification` |
| `http_reachable` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Sub-field of `domain_verification` |
| `https_reachable` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Sub-field of `domain_verification` |
| `http_status` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Sub-field of `domain_verification` |
| `final_url` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Sub-field of `domain_verification` |
| `redirect_count` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Sub-field of `domain_verification` |
| `response_time_ms` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Sub-field of `domain_verification` |
| `tls_valid` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Sub-field of `domain_verification` |
| `error` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Reachability error reason |
| `typosquat_domain` | **PARTIALLY IMPLEMENTED**| `UrlScanResponse.typosquatDomain` | Not rendered in UI | Present in model, not rendered |
| `brand_similarity` | **NOT IMPLEMENTED** | Missing from `ApiModels.kt` | Not available | Brand similarity confidence score |

---

## 4. Android URL Scanner Audit

Evaluation of the 20 target features in [`ScannerScreen.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/screens/scanner/ScannerScreen.kt):

| # | Feature | Status | Responsible Android File / Class | Notes |
| :---: | :--- | :---: | :--- | :--- |
| 1 | **URL Input** | **IMPLEMENTED** | `ScannerScreen.kt` (`OutlinedTextField`) | Clean URI keyboard, clear button, and placeholder |
| 2 | **Scan Action** | **IMPLEMENTED** | `ScannerScreen.kt` (`Button`) | Action button with loading indicator |
| 3 | **Loading State** | **IMPLEMENTED** | `ScannerScreen.kt` (`CircularProgressIndicator`) | Disables button and displays spinner |
| 4 | **V3.4 Scanning Pipeline** | **NOT IMPLEMENTED**| None | Missing 4-stage pipeline animation (`01`–`04`) |
| 5 | **Verdict** | **IMPLEMENTED** | `CyberComponents.kt` (`CyberBadge`) | High-contrast status badge |
| 6 | **Risk Score** | **IMPLEMENTED** | `CyberComponents.kt` (`ThreatMeter`) | Animated 0–100 horizontal bar gauge |
| 7 | **Confidence** | **PARTIALLY IMPLEMENTED**| `ScanDetailBottomSheet.kt` | Visible in detail bottom sheet, not on main card |
| 8 | **Threat Evidence** | **IMPLEMENTED** | `ScannerScreen.kt` (lines 877–891) | Lists suspicious indicators with warning icons |
| 9 | **Domain Verification** | **NOT IMPLEMENTED**| None | No DNS / Reachability status card |
| 10 | **DNS Resolution** | **NOT IMPLEMENTED**| None | Missing `Resolved` / `NXDOMAIN` status |
| 11 | **Reachability** | **NOT IMPLEMENTED**| None | Missing `Reachable` / `Unreachable` status |
| 12 | **HTTP Status** | **NOT IMPLEMENTED**| None | Missing status code badge (`200 OK`, `404`, etc.) |
| 13 | **TLS** | **NOT IMPLEMENTED**| None | Missing TLS validation badge |
| 14 | **Redirect Count** | **NOT IMPLEMENTED**| None | Missing redirect count indicator |
| 15 | **Response Latency** | **NOT IMPLEMENTED**| None | Missing response time indicator (`X ms`) |
| 16 | **Typosquatting** | **PARTIALLY IMPLEMENTED**| Backend indicator text | Rendered as plain text string if present in `indicators` |
| 17 | **Brand Impersonation** | **PARTIALLY IMPLEMENTED**| Backend indicator text | Rendered as plain text string if present in `indicators` |
| 18 | **Security Recommendation** | **NOT IMPLEMENTED**| None | Missing verdict-tailored guidance card |
| 19 | **Technical Model Info** | **PARTIALLY IMPLEMENTED**| `ScanDetailBottomSheet.kt` | Shows engine name & model version in bottom sheet |
| 20 | **Decision Scores/Margins** | **NOT IMPLEMENTED**| None | Raw LinearSVC hyperplane margins dropped |

---

## 5. Educational Parity Audit

Evaluation of educational features across Web and Android:

| Feature | Category | Parity Status | Current Android Equivalent | Recommendation |
| :--- | :--- | :---: | :--- | :--- |
| **Interactive URL Anatomy** | Scheme, Subdomain, Domain, TLD, Path, Query, Fragment | **ANDROID MISSING** | None | Adapt native Compose segmented chip row with contextual explanations |
| **Security Attribution** | Live badge on anatomy segments matching scan findings | **ANDROID MISSING** | None | Highlight suspect segments based on `indicators` |
| **Spot the Trap Mini-Game** | Typosquatting, Deceptive Subdomain, Padlock Myth | **ANDROID MISSING** | None | Optional educational card in Profile or Scanner |
| **Knowledge: Padlock Myth** | "HTTPS means encrypted, not safe" | **ANDROID MISSING** | None | Collapsible educational expandable card |
| **Knowledge: Subdomain Masking** | `paypal.com.attacker.xyz` trick | **ANDROID MISSING** | None | Educational tip card |
| **Knowledge: Unreachable ≠ Malicious** | Distinguishing dead links from malware | **ANDROID MISSING** | None | Educational tip card |
| **Knowledge: Lookalike Domains** | Homoglyphs and visual confusion | **ANDROID MISSING** | None | Educational tip card |

---

## 6. Android-Specific Security Features

Android has several native security capabilities that are intentionally unique to mobile:

| Mobile Security Capability | Implementation Status | Native Components | Alignment with V3.4 Backend |
| :--- | :---: | :--- | :--- |
| **Clipboard Threat Sniffing** | **IMPLEMENTED** | `LocalClipboardManager`, `LaunchedEffect`, `AppPreferences.clipboardDetectionFlow` | Fully aligned (routes detected URLs/messages through `/api/scan/url` and `/api/scan/message`) |
| **Real-time CameraX QR Detonation** | **IMPLEMENTED** | CameraX `ImageAnalysis`, `PreviewView`, Google ML Kit `BarcodeScanning` | Fully aligned (optical URLs auto-detonated against V3.4 URL scanner) |
| **Gallery QR Image Ingestion** | **IMPLEMENTED** | `ActivityResultContracts.GetContent()`, ML Kit `InputImage.fromFilePath` | Fully aligned (extracts raw barcode and runs full scan) |
| **System Share Target (`ACTION_SEND`)** | **IMPLEMENTED** | `AndroidManifest.xml` intent-filter for `text/plain`, `MainActivity.handleIncomingIntent` | Aligned (routes shared browser links directly to scanner) |
| **Text Selection Menu (`PROCESS_TEXT`)** | **IMPLEMENTED** | `AndroidManifest.xml` intent-filter for `ACTION_PROCESS_TEXT`, `MainActivity` | Aligned (system context menu "Scan with LinkSentry") |
| **Offline-First Resilience** | **IMPLEMENTED** | `LocalScanManager` (SharedPreferences JSON cache) + `ScanRepository` offline fallback | Aligned with Firestore schema |
| **Cloud Sync Control** | **IMPLEMENTED** | Toggle in `AppPreferences` and `ProfileScreen` disabling remote Firestore writes on demand | Adheres to privacy standards |
| **Live Network Health Probing** | **IMPLEMENTED** | `ApiClient.probeHealth()` checking `/api/health` status | Aligned with backend health endpoint |

---

## 7. Theme & UI Parity

Audit of Compose theming in [`Color.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/theme/Color.kt) and [`Theme.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/theme/Theme.kt):

| Design Attribute | Android Compose Status | Comparison with Web V3.4 Baseline |
| :--- | :---: | :--- |
| **Dark Theme** | **EXCELLENT** | Clean SOC dark surfaces (`#090D16`, `#0F172A`, `#1E293B`) matching Web |
| **Light Theme** | **EXCELLENT** | High-contrast light surfaces (`#F8FAFC`, `#FFFFFF`, `#CBD5E1`) matching Web |
| **System Auto-Switching** | **IMPLEMENTED** | Supports `"system"`, `"light"`, and `"dark"` via `AppPreferences` |
| **Semantic Status Colors** | **PARTIALLY ALIGNED** | `Safe` (Emerald), `Suspicious` (Amber), `Phishing` (Red) implemented; `Malware` and `Defacement` explicit tokens not yet separated in Compose |
| **Long URL Text Wrapping** | **IMPLEMENTED** | Uses `maxLines = 1`, `TextOverflow.Ellipsis`, and monospace font for technical strings |
| **Small-Screen Adaptability** | **IMPLEMENTED** | Responsive `BoxWithConstraints` checking `maxWidth < 360.dp` across all screens |
| **Edge-to-Edge Support** | **IMPLEMENTED** | `enableEdgeToEdge()`, `statusBarsPadding()`, `navigationBarsPadding()` cleanly applied |
| **Motion & Animation** | **RESTRICTED** | Subtle 600ms risk score easing and laser QR scanning; calm and restrained |

---

## 8. History & Persistence Audit

Inspection of Cloud Firestore and local persistence in [`ScanRecord.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/data/model/ScanRecord.kt) and [`LocalScanManager.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/data/preferences/LocalScanManager.kt):

### Stored Fields:
- `id` (Document ID / Local UUID)
- `userId` (Firebase Auth UID)
- `type` (`"url" | "qr" | "message"`)
- `input` (Raw scanned text)
- `url` (Normalized target URL)
- `domain` (Target domain)
- `verdict` (`"safe" | "suspicious" | "phishing"`)
- `riskScore` (Integer 0–100)
- `confidence` (Double 0.0–1.0)
- `indicators` (List of threat indicator strings)
- `engine` (`"LinkSentry V3.4 URL ML Engine"`)
- `modelVersion` (`"V3.4"`)
- `source` (`"android"`)
- `createdAt` (Firestore ServerTimestamp / Device Date)

### Security Invariant Check:
- **Decision Scores / Hyperplane Margins**: **NOT STORED** (Invariant respected: clean historical records).
- **Temporary Telemetry**: **NOT STORED** (Invariant respected).
- **Stale V3.3 Default Values**: Default values in `ScanRecord.kt` lines 45 & 48 still read `"LinkSentry V3.3 URL ML Engine"` and `"V3.3"` as fallback strings when the backend response does not provide them.

---

## 9. Cross-Platform Feature Matrix

| Capability | Web Baseline | Android Native | Shared Backend API | Status | Recommended Action |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **URL Scanning** | Full V3.4 UI | Basic V3.3 UI | `/api/scan/url` | **PARTIAL** | Upgrade Android UI to consume domain verification & V3.4 fields |
| **QR Scanning** | File upload | Live CameraX + Gallery | `/api/scan/url` | **SUPERIOR** | Keep native Android CameraX + ML Kit advantage |
| **Message / SMS Scanning** | Textarea | Textarea + Share Target | `/api/scan/message` | **PARITY** | Fully functional |
| **Clipboard Threat Sniffing** | Browser Paste | Background Monitor Banner| N/A | **SUPERIOR** | Maintain Android clipboard monitoring |
| **Share-Sheet Ingestion** | N/A | `ACTION_SEND` / `PROCESS_TEXT`| N/A | **SUPERIOR** | Maintain native intent filters |
| **DNS Verification State** | Full Card | Not Displayed | Shared in V3.4 API | **MISSING** | Add Domain Verification card in Android |
| **HTTP Reachability & TLS** | Full Card | Not Displayed | Shared in V3.4 API | **MISSING** | Add Reachability status in Android |
| **Typosquatting Evidence** | Highlight Card | Indicator text only | Shared in V3.4 API | **PARTIAL** | Surface brand comparison when present |
| **Decision Margins (SVC)** | Horizontal meters | Not Displayed | Shared in V3.4 API | **MISSING** | Add collapsible technical margin meters |
| **Interactive URL Anatomy** | Interactive visualizer| Not Implemented | Client utility | **MISSING** | Implement native Compose URL breakdown |
| **Spot the Trap Challenges** | 3 mini-games | Not Implemented | Client-side | **MISSING** | Add educational practice module |
| **Security Knowledge Cards**| 4 visual cards | Not Implemented | Client-side | **MISSING** | Add knowledge cards accordion |
| **Multi-Stage Scan Progress**| 4-stage pipeline | Simple spinner | N/A (UI state) | **MISSING** | Add pipeline status progression |
| **Dark & Light Theming** | SOC CSS Tokens | Compose `LinkSentryTheme`| N/A | **PARITY** | Add explicit Malware & Defacement tokens |
| **Firestore Cloud Sync** | Firestore Web SDK | Firestore Android SDK | Firebase Cloud | **PARITY** | Fully synchronized |
| **Offline Scan Caching** | LocalStorage | SharedPreferences JSON | N/A | **PARITY** | Fully functional |

---

## 10. Missing Features Categorized by Priority

### P0 — Must Fix (Security / API Correctness)
1. **V3.4 API Response Deserialization**:
   - Update `ApiModels.kt` to define `DomainVerificationResponse` and add `domain_verification` and `threat_analysis` fields to `UrlScanResponse`.
2. **Remove Stale V3.3 Fallback Strings**:
   - Update fallback defaults in `ScanRecord.kt` and `ScannerViewModel.kt` from `V3.3` to `V3.4`.

### P1 — Should Fix (Cross-Platform Feature Parity)
1. **Domain Verification UI Component**:
   - Render a clean Native Compose card in `ScannerScreen.kt` and `ScanDetailBottomSheet.kt` showing DNS status (`Resolved`/`NXDOMAIN`), Reachability (`Reachable`/`Unreachable`), HTTP status code, and TLS validity.
2. **Interactive URL Anatomy in Android**:
   - Build a lightweight native Kotlin URL parser and Compose segmented view to visually separate Scheme, Subdomain, Domain, TLD, Path, and Query.
3. **Collapsible Technical Model Margins**:
   - Display raw LinearSVC decision scores (`Benign`, `Malware`, `Phishing`, `Defacement`) in a collapsible section with the appropriate explanatory disclaimer.

### P2 — UX Polish (Design Consistency)
1. **Multi-Stage Scanner Feedback**:
   - Provide visual progression through the 4 scanning stages (*"Parsing URL"*, *"Evaluating domain"*, *"Verifying DNS & reachability"*, *"Synthesizing decision"*).
2. **Semantic Color Expansion**:
   - Add explicit `malware` (`#DC2626`) and `defacement` (`#8B5CF6`) color tokens to `LinkSentryColors`.
3. **Educational Knowledge Cards**:
   - Add expandable educational tips (*The Padlock Myth*, *Subdomain Masking*, *Unreachable ≠ Malicious*).

### P3 — Optional (Nice-to-Have / Post-Submission)
1. **Interactive "Spot the Trap" Mini-Game in Android**:
   - Native port of the 3-scenario phishing practice challenge.
2. **Biometric App Lock**:
   - Native BiometricPrompt for app launch protection.

---

## 11. Recommended Minimal Implementation Scope

To achieve full V3.4 cross-platform parity before project submission without risk of regression:

```
┌────────────────────────────────────────────────────────┐
│               Minimal V3.4 Android Scope               │
├────────────────────────────────────────────────────────┤
│ 1. API Layer:                                          │
│    - Update ApiModels.kt with DomainVerification data  │
│    - Update ScannerResultUi with V3.4 fields           │
│                                                        │
│ 2. Scanner Screen:                                     │
│    - Add Domain Verification Card (DNS + HTTP + TLS)   │
│    - Add Collapsible Technical Decision Margins        │
│    - Add Compact Native URL Anatomy Visualizer         │
│                                                        │
│ 3. Polish & Alignment:                                 │
│    - Update V3.3 default strings to V3.4               │
│    - Add educational knowledge tip accordion           │
└────────────────────────────────────────────────────────┘
```

---

## 12. Files That Would Need Modification

*(Audit listing only — no source files have been modified)*

1. [`android/app/src/main/java/com/linksentry/app/data/model/ApiModels.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/data/model/ApiModels.kt)
   - Add `DomainVerificationResponse` data class.
   - Add `domainVerification` and `threatAnalysis` fields to `UrlScanResponse`.
2. [`android/app/src/main/java/com/linksentry/app/data/model/ScanRecord.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/data/model/ScanRecord.kt)
   - Update default engine/modelVersion fallbacks from `V3.3` to `V3.4`.
3. [`android/app/src/main/java/com/linksentry/app/ui/screens/scanner/ScannerScreen.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/screens/scanner/ScannerScreen.kt)
   - Expand `ScannerResultUi` to hold `domainVerification` and `decisionScores`.
   - Add Domain Verification status card and Collapsible Decision Margins to the result presentation.
4. [`android/app/src/main/java/com/linksentry/app/ui/components/CyberComponents.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/components/CyberComponents.kt)
   - Add `DomainVerificationCard` and `UrlAnatomyView` composables.
5. [`android/app/src/main/java/com/linksentry/app/ui/theme/Color.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/theme/Color.kt) & [`Theme.kt`](file:///d:/LinkSentry/android/app/src/main/java/com/linksentry/app/ui/theme/Theme.kt)
   - Add `malware` and `defacement` semantic color tokens.
6. [`android/app/src/test/java/com/linksentry/app/model/ApiModelsTest.kt`](file:///d:/LinkSentry/android/app/src/test/java/com/linksentry/app/model/ApiModelsTest.kt)
   - Update model tests to assert `domain_verification` JSON deserialization and `V3.4` defaults.

---

## 13. Existing Test Coverage

### Automated Test Infrastructure:
1. **JVM Unit Tests (`./gradlew testDebugUnitTest`)**:
   - **Total Tests**: **12 / 12 passing** (100% green in 1.135s).
   - **Classes Tested**:
     - `ApiClientTest` (2 tests): Base URL configuration and sanitization.
     - `HistoryFilterLogicTest` (4 tests): History search and multi-vector filtering.
     - `ApiModelsTest` (4 tests): JSON serialization/deserialization for health, URL, and message requests.
     - `ScanRecordTest` (2 tests): `ScanRecord` default and custom properties.
2. **Appium 2.x E2E Automation (`qa/appium/tests/appium-suite-runner.js`)**:
   - **Total Scenarios**: **300 automated device scenarios**.
   - **Suites**:
     - Authentication Suite: 30 tests
     - Navigation Suite: 35 tests
     - URL Scanner Suite: 75 tests
     - QR Scanner Suite: 70 tests
     - Message Scanner Suite: 65 tests
     - History Suite: 25 tests

### Key Untested Functionality:
- `DomainVerificationResponse` JSON deserialization.
- DNS `NXDOMAIN` / HTTP `UNREACHABLE` UI badge rendering.
- URL Anatomy Compose parsing with multi-part TLDs.

---

## 14. Risks & Potential Regressions

1. **JSON Deserialization Backward Compatibility**:
   - The backend might omit `domain_verification` on legacy or cached responses. All new fields in Kotlin models must be nullable (`val domainVerification: DomainVerificationResponse? = null`) with safe defaults.
2. **Screen Real Estate on Small Viewports (<=360dp)**:
   - Adding Domain Verification and URL Anatomy must not cause vertical clipping or overflow. All added sections must use lazy scrolling and compact layout tokens.
3. **Firestore Schema Integrity**:
   - Under no circumstance should `domain_verification` or `decision_scores` be injected into `ScanRecord` Firestore documents. History schema must remain strictly aligned between Web and Android.

---

## 15. Final Android V3.4 Readiness Score

| Evaluation Dimension | Score | Assessment Summary |
| :--- | :---: | :--- |
| **Core Security & Backend Integration** | **95 / 100** | Successfully executes live detection against the V3.4 FastAPI backend with SSRF protection and LinearSVC inference. |
| **API Parity** | **65 / 100** | Consumes basic verdict, score, and indicators; drops rich V3.4 domain verification and decision margin fields. |
| **Feature Parity** | **60 / 100** | Missing Domain Verification card, URL Anatomy visualizer, and Technical Margins section. |
| **UX & Theming Parity** | **90 / 100** | High-quality dark/light themes, smooth Material 3 Compose components, and responsive mobile layout. |
| **Android-Specific Security** | **98 / 100** | Excellent CameraX live QR scanning, gallery decoding, clipboard sniffing, and share-sheet targeting. |
| **Test Readiness** | **88 / 100** | 12/12 passing JVM unit tests and 300 automated Appium 2.x scenarios configured. |
| **OVERALL V3.4 READINESS** | **82.7 / 100** | **Ready for focused V3.4 feature alignment upgrade.** |
