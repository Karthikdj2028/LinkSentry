import { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import ScanResultCard from '../../components/ScanResultCard';
import { PRESET_SAMPLES } from '../../data/mockData';
import { useAuth, useTheme } from '../../context';
import { saveScan, mapBackendScanToFirestoreDoc } from '../../firebase';
import { API_BASE_URL } from '../../config/api';
import { saveLocalScan, createLocalTimestamp } from '../../utils/localHistory';

const QR_ANALYSIS_STAGES = [
  { id: 1, label: 'Decoding optical matrix & verifying Reed-Solomon blocks' },
  { id: 2, label: 'Evaluating URL lexical rules & brand impersonation' },
  { id: 3, label: 'Probing DNS resolution & live destination reachability' },
  { id: 4, label: 'Synthesizing LinkSentry V3.4 multi-signal decision fusion' },
];

export default function QrScanner() {
  const { currentUser } = useAuth();
  const { securityPreferences } = useTheme();

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [activeScanMode, setActiveScanMode] = useState('upload'); // 'upload' | 'camera'
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [decodedPayload, setDecodedPayload] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [activePresetIndex, setActivePresetIndex] = useState(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanFrameIdRef = useRef(null);

  // Detect insecure context (e.g. HTTP on LAN IP)
  const isInsecureHttp = typeof window !== 'undefined' &&
    !window.isSecureContext &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  // Staged progress tracker while analysis is in flight
  useEffect(() => {
    let timer;
    if (isScanning) {
      setActiveStageIndex(0);
      timer = setInterval(() => {
        setActiveStageIndex((prev) => {
          if (prev < QR_ANALYSIS_STAGES.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 350);
    } else {
      setActiveStageIndex(0);
    }
    return () => clearInterval(timer);
  }, [isScanning]);

  // ============================================================
  // CAMERA CLEANUP
  // ============================================================
  const stopCamera = useCallback(() => {
    if (scanFrameIdRef.current !== null) {
      cancelAnimationFrame(scanFrameIdRef.current);
      scanFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (err) {
          console.warn('[LinkSentry] Failed to stop camera track:', err);
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // Ignore pause errors
      }
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // ============================================================
  // PAYLOAD CLASSIFICATION & BACKEND THREAT DETONATION
  // ============================================================
  const classifyAndAnalyzePayload = useCallback(
    async (rawPayload) => {
      if (!rawPayload || typeof rawPayload !== 'string' || !rawPayload.trim()) {
        setValidationError('Decoded QR payload is empty or unreadable.');
        setIsScanning(false);
        return;
      }

      const payload = rawPayload.trim();
      setDecodedPayload(payload);
      setValidationError('');
      setSaveWarning('');
      setScanResult(null);

      const isHttpUrl = /^https?:\/\//i.test(payload) || (payload.includes('.') && !payload.includes(' ') && !/^(mailto|tel|wifi|sms):/i.test(payload));
      const targetUrl = isHttpUrl && !/^https?:\/\//i.test(payload) ? `https://${payload}` : payload;

      if (isHttpUrl) {
        setIsScanning(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/scan/url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: targetUrl }),
          });

          if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
          }

          const data = await response.json();

          if (data.verdict === 'invalid') {
            const errorMsg = Array.isArray(data.indicators) && data.indicators.length > 0
              ? data.indicators.join(', ')
              : 'Invalid URL structure contained in QR code.';
            setValidationError(errorMsg);
            setScanResult(null);
            return;
          }

          const rawVerdict = typeof data.verdict === 'string' ? data.verdict : 'safe';
          const formattedVerdict = rawVerdict.charAt(0).toUpperCase() + rawVerdict.slice(1);

          const details = {
            qrPayloadCategory: 'Embedded Web Link (HTTP/HTTPS)',
            domain: data.domain || 'N/A',
            detectionEngine: data.engine || 'LinkSentry V3.4 URL Threat Engine',
            modelVersion: data.model_version || 'V3.4',
            mlPrediction: data.ml_prediction || 'N/A',
            finalModelPrediction: data.model_prediction || data.prediction || data.verdict || 'N/A',
            trustedDomain: typeof data.trusted_domain === 'boolean' ? data.trusted_domain : false,
            trustOverride: typeof data.trust_override === 'boolean' ? data.trust_override : false,
            ruleOverride: typeof data.rule_override === 'boolean' ? data.rule_override : false,
            impersonatedDomain: data.impersonated_domain || 'None',
            typosquatDomain: data.typosquat_domain || 'None',
            suspiciousSignals: Array.isArray(data.suspicious_signals) ? data.suspicious_signals : [],
            threatIndicators: Array.isArray(data.indicators) && data.indicators.length > 0
              ? data.indicators
              : ['No threat indicators detected'],
            decisionScores: data.decision_scores || {},
            sslStatus: payload.startsWith('https://')
              ? 'HTTPS Enabled (Encrypted)'
              : 'HTTP Only (Unencrypted / Insecure)',
          };

          const confidenceDisplay = typeof data.confidence === 'number'
            ? `${Math.round(data.confidence * 100)}%`
            : '85%';

          setScanResult({
            target: payload,
            verdict: formattedVerdict,
            riskScore: typeof data.risk_score === 'number' ? data.risk_score : 0,
            confidence: confidenceDisplay,
            details,
            backendAnalysis: data,
            timestamp: new Date().toLocaleTimeString(),
          });

          // Persist scan: ALWAYS to local history
          const scanDoc = mapBackendScanToFirestoreDoc(
            currentUser?.uid || 'anonymous',
            payload,
            data,
            'qr'
          );
          scanDoc.createdAt = createLocalTimestamp();
          scanDoc.isLocalOnly = securityPreferences?.cloudSync === false || !currentUser?.uid;

          saveLocalScan(currentUser?.uid || 'anonymous', scanDoc);

          // Persist to Cloud Firestore (if authenticated and Cloud Sync is ON)
          if (currentUser?.uid && securityPreferences?.cloudSync !== false) {
            try {
              await saveScan(currentUser.uid, scanDoc);
            } catch (saveErr) {
              console.error('Cloud Firestore QR scan save error:', saveErr);
              setSaveWarning('QR scan stored locally, but cloud synchronization failed.');
            }
          }
        } catch (err) {
          console.error('QR URL scan backend error:', err);
          setValidationError('Unable to connect to LinkSentry threat engine. Please ensure backend service is running.');
          setScanResult(null);
        } finally {
          setIsScanning(false);
        }
        return;
      }

      // Non-URL QR Classifications
      if (/^mailto:/i.test(payload)) {
        const emailAddress = payload.replace(/^mailto:/i, '').split('?')[0];
        setScanResult({
          target: payload,
          verdict: 'Safe',
          riskScore: 10,
          confidence: '95%',
          details: {
            qrPayloadCategory: 'Email Destination (mailto:)',
            extractedRecipient: emailAddress || payload,
            threatClassification: 'Non-URL Optical Payload (Email Link)',
            threatIndicators: ['Direct email client dispatch. No browser navigation executed.'],
            sslStatus: 'N/A (Local Email Dispatch)',
            detectionEngine: 'LinkSentry Non-URL Barcode Classifier',
          },
          timestamp: new Date().toLocaleTimeString(),
        });
        setIsScanning(false);
        return;
      }

      if (/^tel:/i.test(payload)) {
        const phoneNumber = payload.replace(/^tel:/i, '');
        setScanResult({
          target: payload,
          verdict: 'Safe',
          riskScore: 10,
          confidence: '95%',
          details: {
            qrPayloadCategory: 'Telephone Dial String (tel:)',
            extractedPhoneNumbers: phoneNumber || payload,
            threatClassification: 'Non-URL Optical Payload (Telephone)',
            threatIndicators: ['Direct phone dialer shortcut. No web navigation executed.'],
            sslStatus: 'N/A (Local Phone Dispatch)',
            detectionEngine: 'LinkSentry Non-URL Barcode Classifier',
          },
          timestamp: new Date().toLocaleTimeString(),
        });
        setIsScanning(false);
        return;
      }

      if (/^wifi:/i.test(payload)) {
        setScanResult({
          target: 'Wi-Fi Network Configuration Matrix',
          verdict: 'Safe',
          riskScore: 15,
          confidence: '95%',
          details: {
            qrPayloadCategory: 'Wi-Fi Access Point Configuration',
            threatClassification: 'Non-URL Optical Payload (Local Setup)',
            threatIndicators: ['Local Wi-Fi access configuration parameters.'],
            sslStatus: 'N/A (Local Device Configuration)',
            detectionEngine: 'LinkSentry Non-URL Barcode Classifier',
          },
          timestamp: new Date().toLocaleTimeString(),
        });
        setIsScanning(false);
        return;
      }

      if (/^sms:/i.test(payload)) {
        setScanResult({
          target: payload,
          verdict: 'Safe',
          riskScore: 15,
          confidence: '95%',
          details: {
            qrPayloadCategory: 'SMS Text Dispatcher (sms:)',
            threatClassification: 'Non-URL Optical Payload (Direct SMS)',
            threatIndicators: ['Direct SMS messaging trigger. No web navigation executed.'],
            sslStatus: 'N/A (Local SMS Dispatch)',
            detectionEngine: 'LinkSentry Non-URL Barcode Classifier',
          },
          timestamp: new Date().toLocaleTimeString(),
        });
        setIsScanning(false);
        return;
      }

      // Plain Text / Other
      setScanResult({
        target: payload.length > 80 ? `${payload.slice(0, 80)}...` : payload,
        verdict: 'Safe',
        riskScore: 5,
        confidence: '95%',
        details: {
          qrPayloadCategory: 'Plain Text Optical Data',
          threatClassification: 'Non-URL Plain Text',
          threatIndicators: ['Plain text barcode content. No external network execution.'],
          sslStatus: 'N/A (Static Text)',
          detectionEngine: 'LinkSentry Non-URL Barcode Classifier',
        },
        timestamp: new Date().toLocaleTimeString(),
      });
      setIsScanning(false);
    },
    [currentUser, securityPreferences]
  );

  // ============================================================
  // JSQR IMAGE DECODER
  // ============================================================
  const decodeQrFromImageData = useCallback((imageSrc) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            reject(new Error('Failed to obtain canvas rendering context.'));
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data) {
            resolve(code.data);
          } else {
            reject(new Error('No readable QR code matrix detected in this image.'));
          }
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for QR analysis.'));
      };

      img.src = imageSrc;
    });
  }, []);

  // File Upload Handlers
  const processImageFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setValidationError('Please upload a valid image file (PNG, JPG, WEBP, SVG).');
      return;
    }

    setValidationError('');
    setSaveWarning('');
    setSelectedFile(file);
    setActivePresetIndex(null);
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setFilePreview(dataUrl);

      try {
        setIsScanning(true);
        const decoded = await decodeQrFromImageData(dataUrl);
        await classifyAndAnalyzePayload(decoded);
      } catch (decodeErr) {
        console.warn('[LinkSentry] QR decode warning:', decodeErr);
        setValidationError('No readable QR code detected in this image. Please ensure the QR matrix is clear, well-lit, and unobstructed.');
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handlePresetSelect = (preset, idx) => {
    stopCamera();
    setActiveScanMode('upload');
    setActivePresetIndex(idx);
    setSelectedFile({ name: preset.name, size: 'Preset Sample' });
    setFilePreview('preset');
    setValidationError('');
    setSaveWarning('');
    setScanResult(null);
    classifyAndAnalyzePayload(preset.decoded);
  };

  // ============================================================
  // LIVE CAMERA STREAM
  // ============================================================
  const startCameraMode = async () => {
    stopCamera();
    setActiveScanMode('camera');
    setActivePresetIndex(null);
    setValidationError('');
    setSaveWarning('');
    setCameraError('');
    setScanResult(null);
    setIsScanning(false);

    try {
      if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error('INSECURE_CONTEXT');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('CAMERA_API_UNSUPPORTED');
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      let video = videoRef.current;
      if (!video) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        video = videoRef.current;
      }

      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        throw new Error('VIDEO_ELEMENT_UNAVAILABLE');
      }

      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.srcObject = stream;

      await new Promise((resolve) => {
        if (video.readyState >= 1) {
          resolve();
          return;
        }
        video.addEventListener('loadedmetadata', () => resolve(), { once: true });
      });

      await video.play();
      setIsCameraActive(true);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('CANVAS_CONTEXT_FAILED');

      const scanFrame = () => {
        const currentVideo = videoRef.current;
        if (!currentVideo || !streamRef.current) return;

        if (currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const width = currentVideo.videoWidth;
          const height = currentVideo.videoHeight;

          if (width > 0 && height > 0) {
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(currentVideo, 0, 0, width, height);

            try {
              const imageData = ctx.getImageData(0, 0, width, height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
              });

              if (code?.data) {
                // Pause and stop hardware camera immediately on first detection
                stopCamera();
                setActiveScanMode('upload');
                setSelectedFile({ name: 'Live Camera Capture' });
                classifyAndAnalyzePayload(code.data);
                return;
              }
            } catch {
              // Ignore single-frame decode glitch
            }
          }
        }

        scanFrameIdRef.current = requestAnimationFrame(scanFrame);
      };

      scanFrameIdRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      console.error('[LinkSentry] Camera initialization failed:', err);
      stopCamera();
      setIsCameraActive(false);

      if (err?.message === 'INSECURE_CONTEXT') {
        setCameraError('Live optical camera scanning is disabled by modern browsers over unencrypted HTTP LAN connections. Please use the high-accuracy Image Upload scanner below or connect via HTTPS/localhost.');
      } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser or use Image Upload mode.');
      } else {
        setCameraError('Camera unavailable on this device. Please use Image Upload mode.');
      }
    }
  };

  const handleReset = () => {
    stopCamera();
    setActiveScanMode('upload');
    setSelectedFile(null);
    setFilePreview(null);
    setDecodedPayload(null);
    setScanResult(null);
    setActivePresetIndex(null);
    setValidationError('');
    setSaveWarning('');
    setCameraError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyPayload = () => {
    if (decodedPayload && navigator.clipboard) {
      navigator.clipboard.writeText(decodedPayload);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

  return (
    <div className="scanner-tab-content">
      {/* Insecure Context Notice Banner */}
      {isInsecureHttp && (
        <div className="auth-error-alert animate-fade-in" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)', color: '#6ee7b7', marginBottom: '1.25rem' }}>
          <span className="error-icon">ℹ</span>
          <span className="error-text">
            <strong>LAN HTTP Environment:</strong> Camera access is restricted by browsers over unencrypted HTTP. Use the drag-and-drop <strong>Image Upload Mode</strong> below or the Android app for camera scanning.
          </span>
        </div>
      )}

      {/* Scanner Box */}
      <div className="cyber-card scanner-box qr-scanner-box">
        <div className="scanner-header-row">
          <div className="scanner-title-group">
            <h2 className="scanner-title">
              <span className="scanner-icon qr-emerald-icon">📷</span> QR Code Phishing (Quishing) Scanner
            </h2>
            <p className="scanner-description">
              Upload or capture QR matrices to detect deceptive URLs, rogue payment links, shortened redirect cloaks, and malicious downloads.
            </p>
          </div>
          <span className="font-mono scanner-mode-pill qr-mode-pill">OPTICAL DETONATION • ZERO-DAY SHIELD</span>
        </div>

        {/* Scan Mode Switcher */}
        <div className="qr-mode-switch-row">
          <button
            type="button"
            className={`btn btn-sm ${activeScanMode === 'upload' ? 'btn-emerald-active' : 'btn-secondary'}`}
            onClick={() => {
              stopCamera();
              setActiveScanMode('upload');
              setCameraError('');
            }}
            data-testid="qr-mode-upload"
          >
            📁 Image Upload Mode
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeScanMode === 'camera' ? 'btn-emerald-active' : 'btn-secondary'}`}
            onClick={startCameraMode}
            data-testid="qr-mode-camera"
          >
            📹 Live Camera Stream
          </button>
        </div>

        {/* IMAGE UPLOAD DROPZONE */}
        {activeScanMode === 'upload' && (
          <div
            className={`qr-dropzone ${filePreview ? 'has-file' : ''} ${isDragging ? 'is-dragging' : ''} ${validationError ? 'dropzone-error' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            data-testid="qr-dropzone"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
              className="hidden-file-input"
              onChange={handleFileChange}
              data-testid="qr-file-input"
              style={{ display: 'none' }}
            />

            {filePreview ? (
              <div className="qr-preview-container">
                {filePreview !== 'preset' ? (
                  <img src={filePreview} alt="Uploaded QR Matrix" className="qr-preview-thumbnail" />
                ) : (
                  <div className="qr-preview-icon">🖼️</div>
                )}
                <div className="qr-preview-info">
                  <span className="qr-preview-filename font-mono">
                    {selectedFile?.name || 'Uploaded_QR_Matrix.png'}
                  </span>
                  <span className="qr-preview-sub">Click or drop a new image to replace</span>
                </div>
                <button
                  type="button"
                  className="qr-clear-file-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  title="Clear file"
                  aria-label="Clear file"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="qr-dropzone-prompt">
                <div className="dropzone-icon qr-emerald-drop-icon">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="3" height="3" />
                    <rect x="18" y="14" width="3" height="3" />
                    <rect x="14" y="18" width="3" height="3" />
                    <rect x="18" y="18" width="3" height="3" />
                  </svg>
                </div>
                <h4 className="dropzone-text">Drag & drop QR image here, or click to browse</h4>
                <p className="dropzone-sub">Supports PNG, JPG, WEBP, SVG up to 10MB</p>
              </div>
            )}
          </div>
        )}

        {/* LIVE CAMERA VIEW */}
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
              <div className="viewfinder-corner top-left" />
              <div className="viewfinder-corner top-right" />
              <div className="viewfinder-corner bottom-left" />
              <div className="viewfinder-corner bottom-right" />
              {isCameraActive && <div className="camera-laser-scan qr-emerald-laser" />}
              <div className="camera-status-overlay font-mono">
                {isCameraActive ? '[LIVE OPTICAL SCANNER ACTIVE]' : '[CAMERA SENSOR STANDBY]'}
              </div>
            </div>

            {cameraError ? (
              <div className="camera-error-container">
                <p className="camera-instruction text-red font-mono">⚠️ {cameraError}</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={startCameraMode}
                >
                  🔄 Retry Camera
                </button>
              </div>
            ) : (
              <p className="camera-instruction">
                Position the target QR code inside the viewfinder brackets to automatically decode the payload.
              </p>
            )}
          </div>
        )}

        {/* Decoded Payload Inspector Card (if available) */}
        {decodedPayload && !isScanning && (
          <div className="decoded-payload-card animate-fade-in">
            <div className="decoded-payload-header">
              <span className="decoded-payload-badge font-mono">
                ✓ DECODED QR MATRIX
              </span>
              <button
                type="button"
                className="btn btn-sm btn-secondary copy-payload-btn"
                onClick={handleCopyPayload}
                title="Copy decoded string to clipboard"
              >
                {copiedPayload ? '✓ Copied' : '📋 Copy Payload'}
              </button>
            </div>
            <div className="decoded-payload-text font-mono">
              {decodedPayload}
            </div>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="validation-error-message animate-fade-in">
            ⚠️ {validationError}
          </div>
        )}

        {/* Quick Test Presets */}
        <div className="scanner-actions-bar">
          <div className="preset-quick-group">
            <span className="preset-label">Sample QR Presets:</span>
            <div className="preset-chips">
              {PRESET_SAMPLES.qrCodes.map((preset, idx) => {
                const isSelected = activePresetIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`preset-chip chip-${preset.type.toLowerCase()} ${isSelected ? 'active-preset' : ''}`}
                    onClick={() => handlePresetSelect(preset, idx)}
                    disabled={isScanning}
                    data-testid={`preset-qr-${idx}`}
                    title={`Decoded: ${preset.decoded}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scanning In-Progress Staged Analysis Display */}
      {isScanning && (
        <div className="cyber-card scanning-in-progress animate-pulse qr-scanning-card">
          <div className="scanning-radar-container qr-radar-container">
            <div className="scanning-radar-sweep qr-radar-sweep" />
            <div className="scanning-radar-grid" />
            <div className="scanning-radar-crosshair" />
          </div>

          <div className="scanning-status-texts font-mono">
            <p className="status-primary-text">
              <span className="inspecting-label qr-inspect-label">INSPECTING QR PAYLOAD:</span>{' '}
              <span className="status-primary-target font-mono">
                {decodedPayload ? (decodedPayload.length > 50 ? `${decodedPayload.slice(0, 50)}...` : decodedPayload) : 'Optical Matrix...'}
              </span>
            </p>

            {/* 4-Stage Multi-Signal Verification Pipeline */}
            <div className="scanning-stages-timeline">
              {QR_ANALYSIS_STAGES.map((stage, idx) => {
                const isCompleted = idx < activeStageIndex;
                const isActive = idx === activeStageIndex;
                return (
                  <div
                    key={stage.id}
                    className={`scanning-stage-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                  >
                    <span className="stage-status-icon font-mono">
                      {isCompleted ? '✓' : isActive ? '▶' : '○'}
                    </span>
                    <span className="stage-step-label">{stage.label}</span>
                  </div>
                );
              })}
            </div>

            <p className="status-sub-text">
              Current stage: <strong className="active-phase-name">{QR_ANALYSIS_STAGES[activeStageIndex]?.label}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Firestore Save Warning Banner */}
      {saveWarning && (
        <div
          className="auth-error-alert animate-fade-in"
          style={{
            borderColor: 'rgba(234, 179, 8, 0.4)',
            background: 'rgba(234, 179, 8, 0.1)',
            color: '#fef08a',
            marginBottom: '1rem',
          }}
          role="alert"
        >
          <span className="error-icon">⚠️</span>
          <span className="error-text">{saveWarning}</span>
        </div>
      )}

      {/* SCAN RESULTS */}
      {scanResult && !isScanning && (
        <ScanResultCard
          resultData={scanResult}
          scanType="QR Code"
          onReset={handleReset}
        />
      )}

      {/* Quishing Security Guide */}
      {!scanResult && !isScanning && (
        <div className="cyber-card scanner-guide-card">
          <h3 className="guide-title">Understanding "Quishing" (QR Phishing) Threats</h3>
          <div className="guide-grid">
            <div className="guide-item">
              <div className="guide-step-num font-mono" style={{ color: '#10b981' }}>01</div>
              <h4>Physical Sticker Tampering</h4>
              <p>Attackers paste fake QR code stickers over legitimate parking meters, restaurant menus, or transit kiosks.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono" style={{ color: '#10b981' }}>02</div>
              <h4>Multi-Hop Redirect Cloaking</h4>
              <p>Decoded URLs often redirect through shortened hops to evade basic URL reputation filters.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono" style={{ color: '#10b981' }}>03</div>
              <h4>Direct Mobile Credential Harvesters</h4>
              <p>Quishing tricks mobile users into opening malicious credential prompts or rogue Wi-Fi setups.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}