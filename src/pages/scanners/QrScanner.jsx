import { useState, useRef } from 'react';
import ScanResultCard from '../../components/ScanResultCard';
import { PRESET_SAMPLES } from '../../data/mockData';

/**
 * QR Code Scanner Component
 * Handles QR image upload, camera feed placeholder simulation, decoded preview, and threat analysis
 * 
 * TODO: Connect to jsQR / BarcodeDetector client API in Stage 2
 * TODO: Connect decoded link to backend ML verification pipeline in Stage 3
 */
export default function QrScanner() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [activeScanMode, setActiveScanMode] = useState('upload'); // 'upload' | 'camera'
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const fileInputRef = useRef(null);

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
    reader.onload = () => {
      setFilePreview(reader.result);
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
    setSelectedFile(file);
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePresetSelect = (preset) => {
    setSelectedFile({ name: preset.name, size: '48 KB' });
    setFilePreview('preset');
    setValidationError('');
    setScanResult(null);

    // Run simulated scan for preset
    simulateQrScan(preset.decoded, preset.type, preset.score);
  };

  const simulateQrScan = (decodedUrl, type = 'Phishing', score = 93) => {
    setIsScanning(true);
    setScanResult(null);

    // TODO: In Stage 2/3, replace timeout with actual QR deobfuscation and API analysis
    setTimeout(() => {
      const verdict = type;
      const riskScore = score;
      const details = {
        payloadType: 'Decoded Web Link',
        embeddedUrl: decodedUrl,
        quishingRisk: verdict === 'Phishing' ? 'High - Disguised Payment Portal' : (verdict === 'Suspicious' ? 'Medium - Dynamic Redirect' : 'Low - Trusted Destination'),
        imageEntropy: 'High (Standard Error Correction Level H)',
        qrObfuscation: verdict === 'Phishing' ? 'Pixel-level contrast cloaking detected' : 'Standard standard encoding',
        confidence: '96.8%'
      };

      setScanResult({
        target: `QR Payload: ${decodedUrl}`,
        verdict,
        riskScore,
        confidence: details.confidence,
        details,
        timestamp: new Date().toLocaleTimeString()
      });
      setIsScanning(false);
    }, 1400);
  };

  const handleStartScan = () => {
    if (!selectedFile && !filePreview && !isCameraActive) {
      setValidationError('Please upload a QR code image or activate camera mode first.');
      return;
    }
    setValidationError('');
    simulateQrScan(
      'http://park-city-fastpay-meter-login.top/cc-entry.php',
      'Phishing',
      93
    );
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setScanResult(null);
    setValidationError('');
    setIsCameraActive(false);
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
          <span className="font-mono scanner-mode-pill">STAGE 1: HEURISTIC MOCK</span>
        </div>

        {/* Scan Mode Toggle: File Upload vs Camera Feed */}
        <div className="qr-mode-switch-row">
          <button
            type="button"
            className={`btn btn-sm ${activeScanMode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveScanMode('upload');
              setIsCameraActive(false);
            }}
          >
            📁 Image Upload Mode
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeScanMode === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveScanMode('camera');
              setIsCameraActive(true);
            }}
          >
            📹 Live Camera Stream (Mock)
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
                    {selectedFile?.name || 'Sample_QR_Matrix.png'}
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

        {/* Camera Feed Placeholder */}
        {activeScanMode === 'camera' && (
          <div className="qr-camera-placeholder">
            <div className="camera-viewfinder">
              <div className="viewfinder-corner top-left" />
              <div className="viewfinder-corner top-right" />
              <div className="viewfinder-corner bottom-left" />
              <div className="viewfinder-corner bottom-right" />
              <div className="camera-laser-scan" />
              <div className="camera-status-overlay font-mono">
                [CAMERA SENSOR STANDBY • STAGE 1 MOCK STREAM]
              </div>
            </div>
            <p className="camera-instruction">
              Position the target QR code inside the viewfinder brackets to decode the payload.
            </p>
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
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <span className="spinner-border" />
                <span>Decoding Matrix & Verifying Payload...</span>
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
