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
 * - QR image upload & drag-and-drop decoding (via jsQR)
 * - Live camera stream with single-frame pause on detection
 * - HTTP/HTTPS URL threat detonation through LinkSentry FastAPI V3.3
 * - Non-URL QR payload format classification (Wi-Fi, vCard, SMS, text)
 * - Insecure LAN HTTP context detection with graceful guidance
 * - Real-time Cloud Firestore synchronization
 */
export default function QrScanner() {
  const { currentUser } = useAuth();

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [activeScanMode, setActiveScanMode] = useState('upload'); // 'upload' | 'camera'
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

  // Detect insecure context (e.g. HTTP on LAN IP)
  const isInsecureHttp = typeof window !== 'undefined' &&
    !window.isSecureContext &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

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
        setValidationError('Decoded QR payload is empty or invalid.');
        setIsScanning(false);
        return;
      }

      const payload = rawPayload.trim();
      setValidationError('');
      setSaveWarning('');
      setScanResult(null);

      const isHttpUrl = /^https?:\/\//i.test(payload);

      if (isHttpUrl) {
        setIsScanning(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/scan/url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: payload }),
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
            detectionEngine: data.engine || 'LinkSentry V3.3 URL Threat Engine',
            modelVersion: data.model_version || 'V3.3',
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

          // Persist to Cloud Firestore
          if (currentUser?.uid) {
            try {
              const firestorePayload = mapBackendScanToFirestoreDoc(
                currentUser.uid,
                payload,
                data,
                'qr'
              );
              await saveScan(currentUser.uid, firestorePayload);
            } catch (saveErr) {
              console.error('Cloud Firestore QR scan save error:', saveErr);
              setSaveWarning('QR scan completed, but the result could not be saved to history.');
            }
          }
        } catch (err) {
          console.error('QR URL scan backend error:', err);
          setValidationError('Unable to connect to LinkSentry backend.');
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
            threatIndicators: ['Non-URL email trigger. No network execution.'],
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
            threatIndicators: ['Direct phone dialer shortcut.'],
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
            threatIndicators: ['Direct SMS messaging trigger.'],
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
    [currentUser]
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
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setValidationError('Please upload a valid image file (PNG, JPG, WEBP).');
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
        const decoded = await decodeQrFromImageData(dataUrl);
        await classifyAndAnalyzePayload(decoded);
      } catch (decodeErr) {
        console.warn('[LinkSentry] QR decode warning:', decodeErr);
        setValidationError('No readable QR code detected in this image. Please ensure the QR matrix is clear and unobstructed.');
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setValidationError('Please upload a valid image file (PNG, JPG, WEBP).');
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
        const decoded = await decodeQrFromImageData(dataUrl);
        await classifyAndAnalyzePayload(decoded);
      } catch (decodeErr) {
        console.warn('[LinkSentry] QR drop decode warning:', decodeErr);
        setValidationError('No readable QR code detected in this image.');
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePresetSelect = (preset) => {
    stopCamera();
    setActiveScanMode('upload');
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
    setScanResult(null);
    setValidationError('');
    setSaveWarning('');
    setCameraError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="scanner-tab-content">
      {/* Insecure Context Notice Banner */}
      {isInsecureHttp && (
        <div className="auth-error-alert animate-fade-in" style={{ borderColor: 'rgba(0, 242, 254, 0.4)', background: 'rgba(0, 242, 254, 0.08)', color: '#67e8f9', marginBottom: '1.25rem' }}>
          <span className="error-icon">ℹ</span>
          <span className="error-text">
            <strong>LAN HTTP Environment:</strong> Camera access is restricted by browsers over unencrypted HTTP. Use the drag-and-drop <strong>Image Upload Mode</strong> below or the Android app for camera scanning.
          </span>
        </div>
      )}

      {/* Scanner Box */}
      <div className="cyber-card scanner-box">
        <div className="scanner-header-row">
          <div className="scanner-title-group">
            <h2 className="scanner-title">
              <span className="scanner-icon">📷</span> QR Code Phishing (Quishing) Scanner
            </h2>
            <p className="scanner-description">
              Upload or capture QR matrices to detect deceptive URLs, rogue payment links, shortened redirect cloaks, and malicious downloads.
            </p>
          </div>
          <span className="font-mono scanner-mode-pill">OPTICAL DETONATION • ZERO-DAY SHIELD</span>
        </div>

        {/* Scan Mode Switcher */}
        <div className="qr-mode-switch-row">
          <button
            type="button"
            className={`btn btn-sm ${activeScanMode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              stopCamera();
              setActiveScanMode('upload');
              setCameraError('');
            }}
          >
            📁 Image Upload Mode
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeScanMode === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={startCameraMode}
          >
            📹 Live Camera Stream
          </button>
        </div>

        {/* IMAGE UPLOAD DROPZONE */}
        {activeScanMode === 'upload' && (
          <div
            className={`qr-dropzone ${filePreview ? 'has-file' : ''} ${validationError ? 'dropzone-error' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
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
              accept="image/png,image/jpeg,image/webp,image/*"
              className="hidden-file-input"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {filePreview ? (
              <div className="qr-preview-container">
                <div className="qr-preview-icon">🖼️</div>
                <div className="qr-preview-info">
                  <span className="qr-preview-filename font-mono">
                    {selectedFile?.name || 'Uploaded_QR_Matrix.png'}
                  </span>
                  <span className="qr-preview-sub">Click or drag a new image to replace</span>
                </div>
              </div>
            ) : (
              <div className="qr-dropzone-prompt">
                <div className="dropzone-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="3" height="3" />
                    <rect x="18" y="14" width="3" height="3" />
                    <rect x="14" y="18" width="3" height="3" />
                    <rect x="18" y="18" width="3" height="3" />
                  </svg>
                </div>
                <h4 className="dropzone-text">Drag & drop QR image here, or browse files</h4>
                <p className="dropzone-sub">Supports PNG, JPG, WEBP up to 10MB</p>
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
              {isCameraActive && <div className="camera-laser-scan" />}
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
              {PRESET_SAMPLES.qrCodes.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`preset-chip chip-${preset.type.toLowerCase()}`}
                  onClick={() => handlePresetSelect(preset)}
                  disabled={isScanning}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scanning In-Progress Animation */}
      {isScanning && (
        <div className="cyber-card scanning-in-progress animate-pulse">
          <div className="scanning-radar-container">
            <div className="scanning-radar-sweep" />
            <div className="scanning-radar-grid" />
            <div className="scanning-radar-crosshair" />
          </div>
          <div className="scanning-status-texts font-mono">
            <p className="status-primary-text">INSPECTING DECODED QR PAYLOAD...</p>
            <p className="status-sub-text">
              Querying FastAPI V3.3 detection engine • Evaluating URL lexical rules • Analyzing heuristics...
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
              <div className="guide-step-num font-mono">01</div>
              <h4>Physical Sticker Tampering</h4>
              <p>Attackers paste fake QR code stickers over legitimate parking meters, restaurant menus, or transit kiosks.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono">02</div>
              <h4>Multi-Hop Redirect Cloaking</h4>
              <p>Decoded URLs often redirect through shortened hops to evade basic URL reputation filters.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono">03</div>
              <h4>Direct Mobile Credential Harvesters</h4>
              <p>Quishing tricks mobile users into opening malicious credential prompts or rogue Wi-Fi setups.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}