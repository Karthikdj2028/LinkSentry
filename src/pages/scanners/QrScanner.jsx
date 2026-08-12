import { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import ScanResultCard from '../../components/ScanResultCard';
import { PRESET_SAMPLES } from '../../data/mockData';
import { useAuth } from '../../context';
import { saveScan, mapBackendScanToFirestoreDoc } from '../../firebase';
import { API_BASE_URL } from '../../config/api';

/**
 * QR Code Scanner Component
 *
 * Handles:
 * - QR image decoding
 * - Live camera QR scanning
 * - HTTP/HTTPS URL threat analysis through FastAPI
 * - Non-URL QR payload classification
 * - Firestore persistence for URL scans
 *
 * Camera compatibility:
 * - Windows Chrome
 * - Windows Edge
 * - macOS Chrome
 * - macOS Safari
 * - Android Chrome
 * - iOS Safari
 * - iOS Chrome
 *
 * Camera failures never break the scanner.
 * Image Upload Mode remains available as a fallback.
 */
export default function QrScanner() {
  const { currentUser } = useAuth();

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [activeScanMode, setActiveScanMode] = useState('upload');
  // 'upload' | 'camera'

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [scanResult, setScanResult] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanFrameIdRef = useRef(null);

  // ============================================================
  // CAMERA CLEANUP
  // ============================================================

  /**
   * Stop the active camera stream and animation frame.
   *
   * This is intentionally centralized so every camera exit path
   * properly releases the hardware camera.
   */
  const stopCamera = useCallback(() => {
    // Stop QR scanning animation frame
    if (scanFrameIdRef.current !== null) {
      cancelAnimationFrame(scanFrameIdRef.current);
      scanFrameIdRef.current = null;
    }

    // Stop every active media track
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          console.warn(
            '[LinkSentry] Failed to stop camera track:',
            err
          );
        }
      });

      streamRef.current = null;
    }

    // Detach stream from video element
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // Ignore pause errors during cleanup
      }

      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  }, []);

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ============================================================
  // PAYLOAD CLASSIFICATION
  // ============================================================

  /**
   * Processes and analyzes a decoded QR payload.
   *
   * HTTP/HTTPS:
   *   -> FastAPI URL scanner
   *   -> V3.3 ML + rule fusion
   *   -> Firestore
   *
   * Non-URL:
   *   -> Local payload classification
   */
  const classifyAndAnalyzePayload = useCallback(
    async (rawPayload) => {
      if (
        !rawPayload ||
        typeof rawPayload !== 'string' ||
        !rawPayload.trim()
      ) {
        setValidationError(
          'Decoded QR payload is empty or invalid.'
        );
        setIsScanning(false);
        return;
      }

      const payload = rawPayload.trim();

      setValidationError('');
      setSaveWarning('');
      setScanResult(null);

      // ============================================================
      // HTTP / HTTPS URL
      // ============================================================

      const isHttpUrl = /^https?:\/\//i.test(payload);

      if (isHttpUrl) {
        setIsScanning(true);

        try {
          console.log(
            '[LinkSentry] Sending QR URL to backend:',
            `${API_BASE_URL}/api/scan/url`
          );

          const response = await fetch(
            `${API_BASE_URL}/api/scan/url`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: payload,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(
              `Server returned HTTP ${response.status}`
            );
          }

          const data = await response.json();

          console.log(
            '[LinkSentry] QR backend response:',
            data
          );

          if (data.verdict === 'invalid') {
            const errorMsg =
              Array.isArray(data.indicators) &&
                data.indicators.length > 0
                ? data.indicators.join(', ')
                : 'Invalid URL structure contained in QR code.';

            setValidationError(errorMsg);
            setScanResult(null);
            return;
          }

          const rawVerdict =
            typeof data.verdict === 'string'
              ? data.verdict
              : 'safe';

          const formattedVerdict =
            rawVerdict.charAt(0).toUpperCase() +
            rawVerdict.slice(1);

          // ========================================================
          // BUILD DETAILED RESULT
          // ========================================================

          const details = {
            qrPayloadCategory:
              'Embedded Web Link (HTTP/HTTPS)',

            domain: data.domain || 'N/A',

            detectionEngine:
              data.engine ||
              'linksentry-url-engine',

            modelVersion:
              data.model_version || 'N/A',

            mlPrediction:
              data.ml_prediction || 'N/A',

            finalModelPrediction:
              data.model_prediction ||
              data.prediction ||
              data.verdict ||
              'N/A',

            trustedDomain:
              typeof data.trusted_domain === 'boolean'
                ? data.trusted_domain
                : false,

            trustOverride:
              typeof data.trust_override === 'boolean'
                ? data.trust_override
                : false,

            ruleOverride:
              typeof data.rule_override === 'boolean'
                ? data.rule_override
                : false,

            impersonatedDomain:
              data.impersonated_domain || 'None',

            typosquatDomain:
              data.typosquat_domain || 'None',

            suspiciousSignals:
              Array.isArray(data.suspicious_signals) &&
                data.suspicious_signals.length > 0
                ? data.suspicious_signals
                : [],

            threatIndicators:
              Array.isArray(data.indicators) &&
                data.indicators.length > 0
                ? data.indicators
                : ['No threat indicators detected'],

            decisionScores:
              data.decision_scores || {},

            sslStatus: payload.startsWith('https://')
              ? 'HTTPS Enabled (Encrypted)'
              : 'HTTP Only (Unencrypted / Insecure)',
          };

          const confidenceDisplay =
            typeof data.confidence === 'number'
              ? `${Math.round(data.confidence * 100)}%`
              : '85%';

          // ========================================================
          // DISPLAY RESULT
          // ========================================================

          setScanResult({
            target: payload,

            verdict: formattedVerdict,

            riskScore:
              typeof data.risk_score === 'number'
                ? data.risk_score
                : 0,

            confidence: confidenceDisplay,

            details,

            timestamp:
              new Date().toLocaleTimeString(),
          });

          // ========================================================
          // FIRESTORE
          // ========================================================

          if (currentUser?.uid) {
            try {
              const firestorePayload =
                mapBackendScanToFirestoreDoc(
                  currentUser.uid,
                  payload,
                  data,
                  'qr'
                );

              await saveScan(
                currentUser.uid,
                firestorePayload
              );

              console.log(
                '[LinkSentry] QR scan saved to Firestore.'
              );
            } catch (saveErr) {
              console.error(
                '[LinkSentry] Cloud Firestore QR scan save error:',
                saveErr
              );

              setSaveWarning(
                'QR scan completed, but the result could not be saved to history.'
              );
            }
          }
        } catch (err) {
          console.error(
            '[LinkSentry] QR URL scan backend error:',
            err
          );

          setValidationError(
            'Unable to connect to LinkSentry backend.'
          );

          setScanResult(null);
        } finally {
          setIsScanning(false);
        }

        return;
      }

      // ============================================================
      // MAILTO
      // ============================================================

      if (/^mailto:/i.test(payload)) {
        const emailAddress = payload
          .replace(/^mailto:/i, '')
          .split('?')[0];

        setScanResult({
          target: payload,

          verdict: 'Unverified',

          riskScore: 20,

          confidence: '85%',

          details: {
            qrPayloadCategory:
              'Email Destination (mailto:)',

            extractedRecipient:
              emailAddress || payload,

            threatClassification:
              'Non-URL Payload (Email Link)',

            securityGuidance:
              'QR code contains an email destination. LinkSentry URL threat engine analyzes HTTP/HTTPS web links. Verify the recipient before sending information.',

            engine:
              'linksentry-payload-classifier',
          },

          timestamp:
            new Date().toLocaleTimeString(),
        });

        setIsScanning(false);
        return;
      }

      // ============================================================
      // TEL
      // ============================================================

      if (/^tel:/i.test(payload)) {
        const phoneNumber = payload.replace(
          /^tel:/i,
          ''
        );

        setScanResult({
          target: payload,

          verdict: 'Unverified',

          riskScore: 20,

          confidence: '85%',

          details: {
            qrPayloadCategory:
              'Telephone Dial String (tel:)',

            dialNumber:
              phoneNumber || payload,

            threatClassification:
              'Non-URL Payload (Telephone)',

            securityGuidance:
              'QR code contains a phone dialer shortcut. Verify the number before placing the call.',

            engine:
              'linksentry-payload-classifier',
          },

          timestamp:
            new Date().toLocaleTimeString(),
        });

        setIsScanning(false);
        return;
      }

      // ============================================================
      // WIFI
      // ============================================================

      if (/^wifi:/i.test(payload)) {
        setScanResult({
          target:
            'Wi-Fi Network Configuration Matrix',

          verdict: 'Unverified',

          riskScore: 20,

          confidence: '85%',

          details: {
            qrPayloadCategory:
              'Wi-Fi Access Point Configuration',

            threatClassification:
              'Non-URL Payload (Local Device Setup)',

            securityGuidance:
              'QR code contains local Wi-Fi connection parameters. Verify the network identity before connecting.',

            engine:
              'linksentry-payload-classifier',
          },

          timestamp:
            new Date().toLocaleTimeString(),
        });

        setIsScanning(false);
        return;
      }

      // ============================================================
      // SMS
      // ============================================================

      if (/^sms:/i.test(payload)) {
        setScanResult({
          target: payload,

          verdict: 'Unverified',

          riskScore: 20,

          confidence: '85%',

          details: {
            qrPayloadCategory:
              'SMS Text Dispatcher (sms:)',

            threatClassification:
              'Non-URL Payload (Direct SMS)',

            securityGuidance:
              'QR code opens an SMS messaging prompt. Verify the destination number and message before sending.',

            engine:
              'linksentry-payload-classifier',
          },

          timestamp:
            new Date().toLocaleTimeString(),
        });

        setIsScanning(false);
        return;
      }

      // ============================================================
      // PLAIN TEXT / OTHER
      // ============================================================

      setScanResult({
        target:
          payload.length > 80
            ? `${payload.slice(0, 80)}...`
            : payload,

        verdict: 'Unverified',

        riskScore: 10,

        confidence: '85%',

        details: {
          qrPayloadCategory:
            'Plain Text Message',

          decodedContent: payload,

          threatClassification:
            'Non-URL Plain Text',

          securityGuidance:
            'QR code decoded successfully, but the payload is not an HTTP/HTTPS URL. LinkSentry cannot apply its URL threat model to this content.',

          engine:
            'linksentry-payload-classifier',
        },

        timestamp:
          new Date().toLocaleTimeString(),
      });

      setIsScanning(false);
    },
    [currentUser]
  );

  // ============================================================
  // IMAGE QR DECODER
  // ============================================================

  /**
   * Decodes a QR code from an image data URL using jsQR.
   */
  const decodeQrFromImageData = useCallback(
    (imageSrc) => {
      return new Promise((resolve, reject) => {
        const img = new Image();

        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas =
              document.createElement('canvas');

            canvas.width =
              img.naturalWidth || img.width;

            canvas.height =
              img.naturalHeight || img.height;

            const ctx = canvas.getContext('2d', {
              willReadFrequently: true,
            });

            if (!ctx) {
              reject(
                new Error(
                  'Failed to obtain canvas rendering context.'
                )
              );
              return;
            }

            ctx.drawImage(
              img,
              0,
              0,
              canvas.width,
              canvas.height
            );

            const imageData =
              ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
              );

            const code = jsQR(
              imageData.data,
              imageData.width,
              imageData.height,
              {
                inversionAttempts: 'attemptBoth',
              }
            );

            if (code && code.data) {
              resolve(code.data);
            } else {
              reject(
                new Error(
                  'No readable QR code matrix was detected in this image.'
                )
              );
            }
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          reject(
            new Error(
              'Failed to load image for QR matrix analysis.'
            )
          );
        };

        img.src = imageSrc;
      });
    },
    []
  );

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setValidationError(
        'Please upload a valid image file (PNG, JPG, WEBP).'
      );
      return;
    }

    setValidationError('');
    setSaveWarning('');
    setSelectedFile(file);
    setScanResult(null);

    const reader = new FileReader();

    reader.onload = async () => {
      const dataUrl = reader.result;

      setFilePreview(dataUrl);

      try {
        setIsScanning(true);

        const decoded =
          await decodeQrFromImageData(dataUrl);

        await classifyAndAnalyzePayload(decoded);
      } catch (decodeErr) {
        console.warn(
          '[LinkSentry] QR decode warning:',
          decodeErr
        );

        setValidationError(
          'No readable QR code detected in this image. Please ensure the QR code is clear and unobstructed.'
        );

        setIsScanning(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // ============================================================
  // DRAG AND DROP
  // ============================================================

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setValidationError(
        'Please upload a valid image file (PNG, JPG, WEBP).'
      );
      return;
    }

    setValidationError('');
    setSaveWarning('');
    setSelectedFile(file);
    setScanResult(null);

    const reader = new FileReader();

    reader.onload = async () => {
      const dataUrl = reader.result;

      setFilePreview(dataUrl);

      try {
        setIsScanning(true);

        const decoded =
          await decodeQrFromImageData(dataUrl);

        await classifyAndAnalyzePayload(decoded);
      } catch (decodeErr) {
        console.warn(
          '[LinkSentry] QR drop decode warning:',
          decodeErr
        );

        setValidationError(
          'No readable QR code detected in this image. Please ensure the QR code is clear and unobstructed.'
        );

        setIsScanning(false);
      }
    };

    reader.readAsDataURL(file);
  };

  // ============================================================
  // PRESET SAMPLE
  // ============================================================

  const handlePresetSelect = (preset) => {
    stopCamera();

    setActiveScanMode('upload');

    setSelectedFile({
      name: preset.name,
      size: 'Preset Sample',
    });

    setFilePreview('preset');

    setValidationError('');
    setSaveWarning('');
    setScanResult(null);

    classifyAndAnalyzePayload(preset.decoded);
  };

  // ============================================================
  // MANUAL UPLOAD SCAN
  // ============================================================

  const handleStartScan = async () => {
    if (!filePreview || !selectedFile) {
      setValidationError(
        'Please upload a QR code image or choose a sample preset.'
      );
      return;
    }

    if (filePreview === 'preset') {
      return;
    }

    try {
      setIsScanning(true);
      setValidationError('');
      setSaveWarning('');

      const decoded =
        await decodeQrFromImageData(filePreview);

      await classifyAndAnalyzePayload(decoded);
    } catch (decodeErr) {
      console.warn(
        '[LinkSentry] Manual QR decode warning:',
        decodeErr
      );

      setValidationError(
        'No readable QR code detected in this image.'
      );

      setIsScanning(false);
    }
  };

  // ============================================================
  // LIVE CAMERA QR SCANNER
  // ============================================================

  const startCameraMode = async () => {
    // Always stop an existing camera before starting another one.
    stopCamera();

    setActiveScanMode('camera');
    setValidationError('');
    setSaveWarning('');
    setCameraError('');
    setScanResult(null);
    setIsScanning(false);

    try {
      // ==========================================================
      // CAMERA API CHECK
      // ==========================================================

      // Camera requires HTTPS or localhost.
      if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error('INSECURE_CONTEXT');
      }

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        throw new Error('CAMERA_API_UNSUPPORTED');
      }

      let stream;

      // ==========================================================
      // PRIMARY CAMERA REQUEST
      // ==========================================================

      try {
        /*
         * Prefer the rear/environment camera on mobile.
         *
         * `ideal` is used instead of `exact` because some
         * Safari/Android browsers reject exact constraints.
         */
        stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {
                ideal: 'environment',
              },
              width: {
                ideal: 1280,
              },
              height: {
                ideal: 720,
              },
            },
            audio: false,
          });
      } catch (primaryError) {
        console.warn(
          '[LinkSentry] Environment camera request failed:',
          primaryError
        );

        // ========================================================
        // GENERIC CAMERA FALLBACK
        // ========================================================

        /*
         * Request any available camera.
         *
         * This helps:
         * - desktop webcams
         * - older Android browsers
         * - Safari devices with unusual camera constraints
         */
        stream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
      }

      streamRef.current = stream;

      // React renders the <video> element after activeScanMode changes.
      // Wait one frame so the ref is available before attaching the stream.
      let video = videoRef.current;

      if (!video) {
        await new Promise((resolve) =>
          requestAnimationFrame(resolve)
        );

        video = videoRef.current;
      }

      if (!video) {
        stream
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;

        throw new Error(
          'VIDEO_ELEMENT_UNAVAILABLE'
        );
      }

      // ==========================================================
      // MOBILE SAFARI / CHROME VIDEO CONFIGURATION
      // ==========================================================

      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;

      video.setAttribute(
        'playsinline',
        ''
      );

      video.setAttribute(
        'webkit-playsinline',
        ''
      );

      video.srcObject = stream;

      // ==========================================================
      // WAIT FOR VIDEO METADATA
      // ==========================================================

      await new Promise((resolve) => {
        if (video.readyState >= 1) {
          resolve();
          return;
        }

        const handleLoadedMetadata = () => {
          video.removeEventListener(
            'loadedmetadata',
            handleLoadedMetadata
          );

          resolve();
        };

        video.addEventListener(
          'loadedmetadata',
          handleLoadedMetadata,
          {
            once: true,
          }
        );
      });

      // ==========================================================
      // START VIDEO
      // ==========================================================

      try {
        await video.play();
      } catch (playError) {
        console.warn(
          '[LinkSentry] Video play failed:',
          playError
        );

        /*
         * Safari/mobile browsers can occasionally reject the
         * first play attempt. Retry once with muted playback.
         */
        try {
          video.muted = true;
          await video.play();
        } catch {
          throw new Error(
            'VIDEO_PLAY_FAILED'
          );
        }
      }

      setIsCameraActive(true);

      console.log(
        '[LinkSentry] Camera started successfully.'
      );

      // ==========================================================
      // QR FRAME SCANNING
      // ==========================================================

      const canvas =
        document.createElement('canvas');

      const ctx = canvas.getContext(
        '2d',
        {
          willReadFrequently: true,
        }
      );

      if (!ctx) {
        throw new Error(
          'CANVAS_CONTEXT_FAILED'
        );
      }

      const scanFrame = () => {
        const currentVideo =
          videoRef.current;

        if (
          !currentVideo ||
          !streamRef.current
        ) {
          return;
        }

        if (
          currentVideo.readyState >=
          HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          const width =
            currentVideo.videoWidth;

          const height =
            currentVideo.videoHeight;

          if (
            width > 0 &&
            height > 0
          ) {
            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(
              currentVideo,
              0,
              0,
              width,
              height
            );

            try {
              const imageData =
                ctx.getImageData(
                  0,
                  0,
                  width,
                  height
                );

              const code = jsQR(
                imageData.data,
                imageData.width,
                imageData.height,
                {
                  /*
                   * Attempt both normal and inverted QR codes.
                   * This improves compatibility with unusual
                   * QR backgrounds.
                   */
                  inversionAttempts:
                    'attemptBoth',
                }
              );

              if (code?.data) {
                console.log(
                  '[LinkSentry] QR detected from live camera:',
                  code.data
                );

                // Stop hardware camera immediately.
                stopCamera();

                setActiveScanMode(
                  'upload'
                );

                setSelectedFile({
                  name:
                    'Live Camera Capture',
                });

                classifyAndAnalyzePayload(
                  code.data
                );

                return;
              }
            } catch (decodeError) {
              /*
               * Do not terminate camera scanning because of
               * one invalid or unreadable frame.
               */
              console.debug(
                '[LinkSentry] QR frame decode skipped:',
                decodeError
              );
            }
          }
        }

        scanFrameIdRef.current =
          requestAnimationFrame(
            scanFrame
          );
      };

      scanFrameIdRef.current =
        requestAnimationFrame(
          scanFrame
        );
    } catch (err) {
      console.error(
        '[LinkSentry] Camera initialization failed:',
        err
      );

      stopCamera();

      setIsCameraActive(false);

      // ==========================================================
      // CAMERA ERROR HANDLING
      // ==========================================================

      switch (err?.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          setCameraError(
            'Camera permission was denied. Allow camera access in your browser settings and try again, or use Image Upload mode.'
          );
          break;

        case 'NotFoundError':
        case 'DevicesNotFoundError':
          setCameraError(
            'No camera was detected on this device. Please use Image Upload mode.'
          );
          break;

        case 'NotReadableError':
        case 'TrackStartError':
          setCameraError(
            'The camera is currently unavailable or being used by another application. Close other camera applications and try again.'
          );
          break;

        case 'OverconstrainedError':
          setCameraError(
            'The requested camera configuration is not supported. Try again or use Image Upload mode.'
          );
          break;

        case 'SecurityError':
          setCameraError(
            'Camera access was blocked by the browser security policy. Please check browser permissions.'
          );
          break;

        default:
          if (
            err?.message ===
            'INSECURE_CONTEXT'
          ) {
            setCameraError(
              'Live camera scanning requires HTTPS or localhost. Open the deployed LinkSentry site over HTTPS.'
            );
          } else if (
            err?.message ===
            'CAMERA_API_UNSUPPORTED'
          ) {
            setCameraError(
              'This browser does not support live camera scanning. Please use Image Upload mode.'
            );
          } else if (
            err?.message ===
            'VIDEO_ELEMENT_UNAVAILABLE'
          ) {
            setCameraError(
              'Camera view could not be initialized. Please switch modes and try again.'
            );
          } else if (
            err?.message ===
            'VIDEO_PLAY_FAILED'
          ) {
            setCameraError(
              'The camera stream was opened but could not be displayed. Tap Live Camera Stream again or use Image Upload mode.'
            );
          } else {
            setCameraError(
              'Unable to start the camera. Please check browser camera permissions or use Image Upload mode.'
            );
          }
      }
    }
  };

  // ============================================================
  // RESET
  // ============================================================

  const handleReset = () => {
    stopCamera();

    setActiveScanMode('upload');

    setSelectedFile(null);
    setFilePreview(null);
    setScanResult(null);

    setValidationError('');
    setSaveWarning('');
    setCameraError('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="scanner-tab-content">

      {/* ========================================================
          SCANNER CONTROL BOX
      ======================================================== */}

      <div className="cyber-card scanner-box">

        {/* Header */}
        <div className="scanner-header-row">

          <div className="scanner-title-group">

            <h2 className="scanner-title">
              <span className="scanner-icon">
                📷
              </span>

              QR Code Phishing (Quishing) Scanner
            </h2>

            <p className="scanner-description">
              Detect deceptive QR codes, rogue payment
              stickers, shortened redirect cloaks, and
              malicious file drops.
            </p>

          </div>

          <span className="font-mono scanner-mode-pill">
            OPTICAL DETONATION • ZERO-DAY SHIELD
          </span>

        </div>

        {/* ======================================================
            SCAN MODE TOGGLE
        ====================================================== */}

        <div className="qr-mode-switch-row">

          <button
            type="button"
            className={`btn btn-sm ${activeScanMode === 'upload'
              ? 'btn-primary'
              : 'btn-secondary'
              }`}
            onClick={() => {
              stopCamera();

              setActiveScanMode(
                'upload'
              );

              setCameraError('');
            }}
          >
            📁 Image Upload Mode
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeScanMode === 'camera'
              ? 'btn-primary'
              : 'btn-secondary'
              }`}
            onClick={
              startCameraMode
            }
          >
            📹 Live Camera Stream
          </button>

        </div>

        {/* ======================================================
            IMAGE UPLOAD MODE
        ====================================================== */}

        {activeScanMode === 'upload' && (
          <div
            className={`qr-dropzone ${filePreview
              ? 'has-file'
              : ''
              } ${validationError
                ? 'dropzone-error'
                : ''
              }`}
            onDragOver={
              handleDragOver
            }
            onDrop={
              handleDrop
            }
            onClick={() =>
              fileInputRef.current?.click()
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' ||
                e.key === ' '
              ) {
                e.preventDefault();

                fileInputRef.current?.click();
              }
            }}
          >

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/*"
              className="hidden-file-input"
              onChange={
                handleFileChange
              }
              style={{
                display: 'none',
              }}
            />

            {filePreview ? (
              <div className="qr-preview-container">

                <div className="qr-preview-icon">
                  🖼️
                </div>

                <div className="qr-preview-info">

                  <span className="qr-preview-filename font-mono">
                    {selectedFile?.name ||
                      'Uploaded_QR_Matrix.png'}
                  </span>

                  <span className="qr-preview-sub">
                    Click or drag a new image
                    to replace
                  </span>

                </div>

              </div>
            ) : (
              <div className="qr-dropzone-prompt">

                <div className="dropzone-icon">

                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="7"
                      height="7"
                      rx="1"
                    />

                    <rect
                      x="14"
                      y="3"
                      width="7"
                      height="7"
                      rx="1"
                    />

                    <rect
                      x="3"
                      y="14"
                      width="7"
                      height="7"
                      rx="1"
                    />

                    <rect
                      x="14"
                      y="14"
                      width="3"
                      height="3"
                    />

                    <rect
                      x="18"
                      y="14"
                      width="3"
                      height="3"
                    />

                    <rect
                      x="14"
                      y="18"
                      width="3"
                      height="3"
                    />

                    <rect
                      x="18"
                      y="18"
                      width="3"
                      height="3"
                    />
                  </svg>

                </div>

                <h4 className="dropzone-text">
                  Drag & drop QR image here,
                  or browse files
                </h4>

                <p className="dropzone-sub">
                  Supports PNG, JPG, WEBP up to
                  10MB
                </p>

              </div>
            )}

          </div>
        )}

        {/* ======================================================
            LIVE CAMERA VIEW
        ====================================================== */}

        {activeScanMode === 'camera' && (
          <div className="qr-camera-placeholder">

            <div className="camera-viewfinder">

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                className="linksentry-camera-video"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  inset: 0,
                  zIndex: 1,
                }}
              />

              {/* Viewfinder corners */}

              <div className="viewfinder-corner top-left" />

              <div className="viewfinder-corner top-right" />

              <div className="viewfinder-corner bottom-left" />

              <div className="viewfinder-corner bottom-right" />

              {/* Scanning laser */}

              {isCameraActive && (
                <div className="camera-laser-scan" />
              )}

              {/* Status */}

              <div className="camera-status-overlay font-mono">

                {isCameraActive
                  ? '[LIVE OPTICAL SCANNER ACTIVE]'
                  : '[CAMERA SENSOR STANDBY]'}

              </div>

            </div>

            {/* Camera error */}

            {cameraError ? (
              <div className="camera-error-container">

                <p className="camera-instruction text-red font-mono">
                  ⚠️ {cameraError}
                </p>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={
                    startCameraMode
                  }
                >
                  🔄 Retry Camera
                </button>

              </div>
            ) : (
              <p className="camera-instruction">
                Position the target QR code inside
                the viewfinder brackets to
                automatically decode the payload.
              </p>
            )}

          </div>
        )}

        {/* ======================================================
            VALIDATION ERROR
        ====================================================== */}

        {validationError && (
          <div className="validation-error-message animate-fade-in">
            ⚠️ {validationError}
          </div>
        )}

        {/* ======================================================
            SCANNER ACTIONS
        ====================================================== */}

        <div className="scanner-actions-bar">

          <button
            type="button"
            className="btn btn-primary btn-lg scan-submit-btn"
            onClick={
              handleStartScan
            }
            disabled={
              isScanning ||
              activeScanMode === 'camera' ||
              (!filePreview &&
                !selectedFile)
            }
          >

            {isScanning ? (
              <>
                <span className="spinner-border" />

                <span>
                  Decoding Matrix & Querying
                  Threat Engine...
                </span>
              </>
            ) : (
              <>
                <span>
                  ⚡ Scan & Analyze QR Code
                </span>
              </>
            )}

          </button>

          {/* ====================================================
              QUICK TEST PRESETS
          ==================================================== */}

          <div className="preset-quick-group">

            <span className="preset-label">
              Sample QR Presets:
            </span>

            <div className="preset-chips">

              {PRESET_SAMPLES.qrCodes.map(
                (preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`preset-chip chip-${preset.type.toLowerCase()}`}
                    onClick={() =>
                      handlePresetSelect(
                        preset
                      )
                    }
                    disabled={isScanning}
                  >
                    {preset.label}
                  </button>
                )
              )}

            </div>

          </div>

        </div>

      </div>

      {/* ========================================================
          SCANNING IN-PROGRESS ANIMATION
      ======================================================== */}

      {isScanning && (
        <div className="cyber-card scanning-in-progress animate-pulse">

          <div className="scanning-radar-container">

            <div className="scanning-radar-sweep" />

            <div className="scanning-radar-grid" />

            <div className="scanning-radar-crosshair" />

          </div>

          <div className="scanning-status-texts font-mono">

            <p className="status-primary-text">
              INSPECTING DECODED QR PAYLOAD...
            </p>

            <p className="status-sub-text">
              Querying FastAPI detection engine •
              Evaluating URL lexical rules •
              Analyzing heuristics & threat
              indicators...
            </p>

          </div>

        </div>
      )}

      {/* ========================================================
          FIRESTORE SAVE WARNING
      ======================================================== */}

      {saveWarning && (
        <div
          className="auth-error-alert animate-fade-in"
          style={{
            borderColor:
              'rgba(234, 179, 8, 0.4)',

            background:
              'rgba(234, 179, 8, 0.1)',

            color: '#fef08a',

            marginBottom: '1rem',
          }}
          role="alert"
        >

          <span className="error-icon">
            ⚠️
          </span>

          <span className="error-text">
            {saveWarning}
          </span>

        </div>
      )}

      {/* ========================================================
          SCAN RESULTS
      ======================================================== */}

      {scanResult && !isScanning && (
        <ScanResultCard
          resultData={scanResult}
          scanType="QR Code"
          onReset={handleReset}
        />
      )}

      {/* ========================================================
          QR SECURITY GUIDE
      ======================================================== */}

      {!scanResult && !isScanning && (
        <div className="cyber-card scanner-guide-card">

          <h3 className="guide-title">
            Understanding "Quishing" (QR Phishing)
            Threats
          </h3>

          <div className="guide-grid">

            <div className="guide-item">

              <div className="guide-step-num font-mono">
                01
              </div>

              <h4>
                Physical Sticker Tampering
              </h4>

              <p>
                Attackers paste fake QR code
                stickers over legitimate municipal
                parking meters, restaurant menus,
                or transit hubs.
              </p>

            </div>

            <div className="guide-item">

              <div className="guide-step-num font-mono">
                02
              </div>

              <h4>
                Multi-Hop Redirects
              </h4>

              <p>
                The decoded URL often redirects
                through multiple shortened hops to
                evade basic URL reputation filters.
              </p>

            </div>

            <div className="guide-item">

              <div className="guide-step-num font-mono">
                03
              </div>

              <h4>
                Direct Mobile Exploitation
              </h4>

              <p>
                Quishing attempts to force mobile
                devices to open malicious credential
                prompts or rogue configuration
                profiles.
              </p>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}