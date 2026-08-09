import { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import ScanResultCard from '../../components/ScanResultCard';
import { PRESET_SAMPLES } from '../../data/mockData';

const API_BASE_URL = 'http://127.0.0.1:8000';

/**
 * QR Code Scanner Component
 * Handles QR image decoding (upload and live camera stream) using jsQR,
 * classifies the payload type, and sends URL payloads to the FastAPI URL threat detection engine.
 */
export default function QrScanner() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [activeScanMode, setActiveScanMode] = useState('upload'); // 'upload' | 'camera'
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [scanResult, setScanResult] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanFrameIdRef = useRef(null);

  // Stop active camera stream and animation frame
  const stopCamera = useCallback(() => {
    if (scanFrameIdRef.current) {
      cancelAnimationFrame(scanFrameIdRef.current);
      scanFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  /**
   * Processes and analyzes a decoded QR payload.
   * If the payload is an HTTP/HTTPS URL, it queries the FastAPI detection endpoint.
   * If the payload is non-URL (text, email, tel, wifi), it displays a structured safe assessment.
   */
  const classifyAndAnalyzePayload = useCallback(async (rawPayload) => {
    if (!rawPayload || typeof rawPayload !== 'string' || !rawPayload.trim()) {
      setValidationError('Decoded QR payload is empty or invalid.');
      return;
    }

    const payload = rawPayload.trim();
    setValidationError('');
    setScanResult(null);

    // 1. Check if payload is an HTTP or HTTPS URL
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
          detectionEngine: data.engine || 'linksentry-heuristic-v1',
          threatIndicators: Array.isArray(data.indicators) && data.indicators.length > 0
            ? data.indicators
            : ['No threat indicators detected'],
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
          timestamp: new Date().toLocaleTimeString(),
        });
      } catch (err) {
        console.error('QR URL scan backend error:', err);
        setValidationError('Unable to connect to LinkSentry backend.');
        setScanResult(null);
      } finally {
        setIsScanning(false);
      }
      return;
    }

    // 2. Handle Non-URL Payload: Email (mailto:)
    if (/^mailto:/i.test(payload)) {
      const emailAddress = payload.replace(/^mailto:/i, '').split('?')[0];
      setScanResult({
        target: payload,
        verdict: 'Safe',
        riskScore: 0,
        confidence: '100%',
        details: {
          qrPayloadCategory: 'Email Destination (mailto:)',
          extractedRecipient: emailAddress || payload,
          threatClassification: 'Non-URL Payload (Email Link)',
          securityGuidance: 'QR code contains an email destination. LinkSentry threat engine analyzes HTTP/HTTPS web links.',
          engine: 'linksentry-payload-classifier',
        },
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    // 3. Handle Non-URL Payload: Telephone (tel:)
    if (/^tel:/i.test(payload)) {
      const phoneNumber = payload.replace(/^tel:/i, '');
      setScanResult({
        target: payload,
        verdict: 'Safe',
        riskScore: 0,
        confidence: '100%',
        details: {
          qrPayloadCategory: 'Telephone Dial String (tel:)',
          dialNumber: phoneNumber || payload,
          threatClassification: 'Non-URL Payload (Telephone)',
          securityGuidance: 'QR code contains a phone dialer shortcut. No HTTP/HTTPS web links present.',
          engine: 'linksentry-payload-classifier',
        },
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    // 4. Handle Non-URL Payload: Wi-Fi Config (WIFI:)
    if (/^wifi:/i.test(payload)) {
      setScanResult({
        target: 'Wi-Fi Network Configuration Matrix',
        verdict: 'Safe',
        riskScore: 0,
        confidence: '100%',
        details: {
          qrPayloadCategory: 'Wi-Fi Access Point Configuration',
          threatClassification: 'Non-URL Payload (Local Device Setup)',
          securityGuidance: 'QR code contains local Wi-Fi connection parameters. Network passwords are not transmitted or analyzed.',
          engine: 'linksentry-payload-classifier',
        },
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    // 5. Handle Non-URL Payload: SMS (sms:)
    if (/^sms:/i.test(payload)) {
      setScanResult({
        target: payload,
        verdict: 'Safe',
        riskScore: 0,
        confidence: '100%',
        details: {
          qrPayloadCategory: 'SMS Text Dispatcher (sms:)',
          threatClassification: 'Non-URL Payload (Direct SMS)',
          securityGuidance: 'QR code opens an SMS messaging prompt. No HTTP/HTTPS URL destination to scan.',
          engine: 'linksentry-payload-classifier',
        },
        timestamp: new Date().toLocaleTimeString(),
      });
      return;
    }

    // 6. Handle Non-URL Payload: Plain Text / Other String
    setScanResult({
      target: payload.length > 80 ? `${payload.slice(0, 80)}...` : payload,
      verdict: 'Safe',
      riskScore: 0,
      confidence: '100%',
      details: {
        qrPayloadCategory: 'Plain Text Message',
        decodedContent: payload,
        threatClassification: 'Non-URL Plain Text',
        securityGuidance: 'QR code decoded successfully, but the payload is not an HTTP/HTTPS URL.',
        engine: 'linksentry-payload-classifier',
      },
      timestamp: new Date().toLocaleTimeString(),
    });
  }, []);

  /**
   * Decodes a QR code from an image data URL using jsQR
   */
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
            reject(new Error('No readable QR code matrix was detected in this image.'));
          }
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for QR matrix analysis.'));
      };
      img.src = imageSrc;
    });
  }, []);

  // Handle file selection from local device
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setValidationError('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setValidationError('');
    setSelectedFile(file);
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setFilePreview(dataUrl);

      // Automatically decode and analyze uploaded QR image
      try {
        setIsScanning(true);
        const decoded = await decodeQrFromImageData(dataUrl);
        await classifyAndAnalyzePayload(decoded);
      } catch (decodeErr) {
        console.warn('QR decode warning:', decodeErr);
        setValidationError('No readable QR code detected in this image. Please ensure the QR code is clear and unobstructed.');
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
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
        console.warn('QR drop decode warning:', decodeErr);
        setValidationError('No readable QR code detected in this image. Please ensure the QR code is clear and unobstructed.');
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Preset sample selection handler
  const handlePresetSelect = (preset) => {
    setSelectedFile({ name: preset.name, size: 'Preset Sample' });
    setFilePreview('preset');
    setValidationError('');
    setScanResult(null);

    // Analyze preset decoded URL payload directly with real FastAPI engine
    classifyAndAnalyzePayload(preset.decoded);
  };

  // Start/restart analysis for currently selected image
  const handleStartScan = async () => {
    if (!filePreview || filePreview === 'preset') {
      if (!selectedFile) {
        setValidationError('Please upload a QR code image or choose a sample preset.');
        return;
      }
    }

    if (filePreview && filePreview !== 'preset') {
      try {
        setIsScanning(true);
        setValidationError('');
        const decoded = await decodeQrFromImageData(filePreview);
        await classifyAndAnalyzePayload(decoded);
      } catch {
        setValidationError('No readable QR code detected in this image.');
        setIsScanning(false);
      }
    }
  };

  // Start live webcam scanning loop
  const startCameraMode = async () => {
    setActiveScanMode('camera');
    setValidationError('');
    setCameraError('');
    setScanResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);

      // Frame inspection loop
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const scanFrame = () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });
            if (code && code.data) {
              stopCamera();
              setActiveScanMode('upload');
              setSelectedFile({ name: 'Live Camera Capture' });
              classifyAndAnalyzePayload(code.data);
              return;
            }
          }
        }
        scanFrameIdRef.current = requestAnimationFrame(scanFrame);
      };

      scanFrameIdRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      console.error('Camera access error:', err);
      setIsCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access permission was denied. Please allow camera access in browser settings or use Image Upload mode.');
      } else {
        setCameraError('Camera sensor is unavailable or not supported on this device.');
      }
    }
  };

  const handleReset = () => {
    stopCamera();
    setSelectedFile(null);
    setFilePreview(null);
    setScanResult(null);
    setValidationError('');
    setCameraError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="scanner-tab-content">
      {/* Scanner Control Box */}
      <div className="cyber-card scanner-box">
        <div className="scanner-header-row">
          <div className="scanner-title-group">
            <h2 className="scanner-title">
              <span className="scanner-icon">📷</span> QR Code Phishing (Quishing) Scanner
            </h2>
            <p className="scanner-description">
              Detect deceptive QR codes, rogue payment stickers, shortened redirect cloaks, and malicious file drops.
            </p>
          </div>
          <span className="font-mono scanner-mode-pill">STAGE 5A: FASTAPI DECODING CONNECTED</span>
        </div>

        {/* Scan Mode Toggle: File Upload vs Camera Feed */}
        <div className="qr-mode-switch-row">
          <button
            type="button"
            className={`btn btn-sm ${activeScanMode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              stopCamera();
              setActiveScanMode('upload');
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

        {/* Upload Dropzone Area */}
        {activeScanMode === 'upload' && (
          <div
            className={`qr-dropzone ${filePreview ? 'has-file' : ''} ${validationError ? 'dropzone-error' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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

        {/* Camera Feed Viewfinder */}
        {activeScanMode === 'camera' && (
          <div className="qr-camera-placeholder">
            <div className="camera-viewfinder">
              {isCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                />
              ) : null}
              <div className="viewfinder-corner top-left" />
              <div className="viewfinder-corner top-right" />
              <div className="viewfinder-corner bottom-left" />
              <div className="viewfinder-corner bottom-right" />
              <div className="camera-laser-scan" />
              <div className="camera-status-overlay font-mono">
                {isCameraActive ? '[LIVE OPTICAL SCANNER ACTIVE]' : '[CAMERA SENSOR STANDBY]'}
              </div>
            </div>
            {cameraError ? (
              <p className="camera-instruction text-red font-mono">⚠️ {cameraError}</p>
            ) : (
              <p className="camera-instruction">
                Position the target QR code inside the viewfinder brackets to automatically decode the payload.
              </p>
            )}
          </div>
        )}

        {validationError && (
          <div className="validation-error-message animate-fade-in">
            ⚠️ {validationError}
          </div>
        )}

        <div className="scanner-actions-bar">
          <button
            type="button"
            className="btn btn-primary btn-lg scan-submit-btn"
            onClick={handleStartScan}
            disabled={isScanning || (!filePreview && !selectedFile)}
          >
            {isScanning ? (
              <>
                <span className="spinner-border" />
                <span>Decoding Matrix & Querying Threat Engine...</span>
              </>
            ) : (
              <>
                <span>⚡ Scan & Analyze QR Code</span>
              </>
            )}
          </button>

          {/* Quick Test Presets */}
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
              Querying FastAPI detection engine • Evaluating URL lexical rules • Analyzing heuristics & threat indicators...
            </p>
          </div>
        </div>
      )}

      {/* Scan Results Display */}
      {scanResult && !isScanning && (
        <ScanResultCard
          resultData={scanResult}
          scanType="QR Code"
          onReset={handleReset}
        />
      )}

      {/* Quishing Security Info */}
      {!scanResult && !isScanning && (
        <div className="cyber-card scanner-guide-card">
          <h3 className="guide-title">Understanding "Quishing" (QR Phishing) Threats</h3>
          <div className="guide-grid">
            <div className="guide-item">
              <div className="guide-step-num font-mono">01</div>
              <h4>Physical Sticker Tampering</h4>
              <p>Attackers paste fake QR code stickers over legitimate municipal parking meters, restaurant menus, or transit hubs.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono">02</div>
              <h4>Multi-Hop Redirects</h4>
              <p>The decoded URL often redirects through multiple shortened hops to evade basic URL reputation filters.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono">03</div>
              <h4>Direct Mobile Exploitation</h4>
              <p>Quishing attempts to force mobile devices to open malicious credential prompts or rogue configuration profiles.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
