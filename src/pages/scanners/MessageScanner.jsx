import { useState } from 'react';
import ScanResultCard from '../../components/ScanResultCard';
import { PRESET_SAMPLES } from '../../data/mockData';

/**
 * Message Scanner Component
 * Handles SMS / Email / Chat message analysis for smishing and social engineering attacks
 * 
 * TODO: Connect to backend NLP model (BERT/Transformer-based phishing intent classifier) in Stage 3
 * TODO: Connect to Firebase Functions for real-time scoring in Stage 2
 */
export default function MessageScanner() {
  const [messageText, setMessageText] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const validateMessage = (text) => {
    if (!text || text.trim().length < 5) {
      return 'Please enter or paste at least 5 characters of message content to analyze.';
    }
    return '';
  };

  const handleScan = (e) => {
    e?.preventDefault();
    const error = validateMessage(messageText);
    if (error) {
      setValidationError(error);
      setScanResult(null);
      return;
    }

    setValidationError('');
    setIsScanning(true);
    setScanResult(null);

    // Simulated NLP inference delay
    // TODO: Replace with fetch('/api/v1/scan/message', { method: 'POST', body: JSON.stringify({ message: messageText }) })
    setTimeout(() => {
      const lower = messageText.toLowerCase();
      let verdict = 'Safe';
      let riskScore = 5;
      let details = {
        urgencyScore: 'Low (0.05 / 1.00)',
        deceptiveKeywords: [],
        extractedUrls: [],
        socialEngineeringTactic: 'None / Informational Routine Content',
        nlpModelVerdict: 'Safe Consumer Message',
        confidence: '99.4%'
      };

      // Heuristic detection on message content
      const foundKeywords = [];
      if (lower.includes('urgent') || lower.includes('immediately')) foundKeywords.push('Urgency Pressure ("URGENT/immediately")');
      if (lower.includes('unauthorized') || lower.includes('wire transfer') || lower.includes('bank')) foundKeywords.push('Financial Panic Lure');
      if (lower.includes('lock') || lower.includes('dispute') || lower.includes('verify')) foundKeywords.push('Account Verification Bait');
      if (lower.includes('card ending in')) foundKeywords.push('Fake Transaction Confirmation');

      // Extract URLs if any
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = messageText.match(urlRegex) || [];

      if (foundKeywords.length >= 2 || lower.includes('chase-security') || lower.includes('unauthorized wire')) {
        verdict = 'Phishing';
        riskScore = 95;
        details = {
          urgencyScore: 'Critical (0.96 / 1.00 - High Panic Coercion)',
          deceptiveKeywords: foundKeywords,
          extractedUrls: urls.length > 0 ? urls : ['Embedded unshortened link: http://chase-security-auth-alert.xyz/dispute'],
          socialEngineeringTactic: 'Banking Impersonation & Panic-Induced Click Lure (Smishing)',
          nlpModelVerdict: 'High-Risk Malicious Smishing Campaign',
          confidence: '98.7%'
        };
      } else if (foundKeywords.length === 1 || urls.length > 0 || lower.includes('subscription') || lower.includes('renewal')) {
        verdict = 'Suspicious';
        riskScore = 68;
        details = {
          urgencyScore: 'Moderate (0.64 / 1.00)',
          deceptiveKeywords: foundKeywords.length > 0 ? foundKeywords : ['Unsolicited Billing Action'],
          extractedUrls: urls.length > 0 ? urls : ['http://cloud-storage-renewal-fix.net/pay'],
          socialEngineeringTactic: 'Unverified Subscription Renewal Demand',
          nlpModelVerdict: 'Elevated Risk / Suspicious Sender Pattern',
          confidence: '83.5%'
        };
      }

      setScanResult({
        target: `Message Snippet: "${messageText.slice(0, 75)}${messageText.length > 75 ? '...' : ''}"`,
        verdict,
        riskScore,
        confidence: details.confidence,
        details,
        timestamp: new Date().toLocaleTimeString()
      });
      setIsScanning(false);
    }, 1300);
  };

  const handlePresetSelect = (preset) => {
    setMessageText(preset.text);
    setValidationError('');
    setScanResult(null);
  };

  const handleClear = () => {
    setMessageText('');
    setValidationError('');
    setScanResult(null);
  };

  return (
    <div className="scanner-tab-content">
      {/* Scanner Control Box */}
      <div className="cyber-card scanner-box">
        <div className="scanner-header-row">
          <div className="scanner-title-group">
            <h2 className="scanner-title">
              <span className="scanner-icon">💬</span> SMS & Message Phishing (Smishing) Scanner
            </h2>
            <p className="scanner-description">
              Paste suspicious SMS text messages, emails, or chat alerts to evaluate social engineering tactics, urgency levels, and deceptive links.
            </p>
          </div>
          <span className="font-mono scanner-mode-pill">STAGE 1: HEURISTIC MOCK</span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleScan} className="scan-form">
          <div className="form-group">
            <div className="message-label-row">
              <label htmlFor="message-input" className="form-label">
                Paste Message Body
              </label>
              <span className="character-counter font-mono">
                {messageText.length} characters
              </span>
            </div>
            <textarea
              id="message-input"
              className={`form-textarea font-mono ${validationError ? 'input-error' : ''}`}
              placeholder="Paste SMS content, WhatsApp alert, or email body here..."
              rows={5}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                if (validationError) setValidationError('');
              }}
              disabled={isScanning}
            />
            {validationError && (
              <div className="validation-error-message animate-fade-in">
                ⚠️ {validationError}
              </div>
            )}
          </div>

          <div className="scanner-actions-bar">
            <div className="action-buttons-group">
              <button
                type="submit"
                className="btn btn-primary btn-lg scan-submit-btn"
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <span className="spinner-border" />
                    <span>Running NLP Threat Classifier...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Analyze Message Intent</span>
                  </>
                )}
              </button>

              {messageText && !isScanning && (
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={handleClear}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Test Presets */}
            <div className="preset-quick-group">
              <span className="preset-label">Sample Phishing Messages:</span>
              <div className="preset-chips">
                {PRESET_SAMPLES.messages.map((preset, idx) => (
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
        </form>
      </div>

      {/* Results Display */}
      {scanResult && !isScanning && (
        <ScanResultCard
          resultData={scanResult}
          scanType="Message / SMS"
          onReset={handleClear}
        />
      )}

      {/* Smishing Education Guide */}
      {!scanResult && !isScanning && (
        <div className="cyber-card scanner-guide-card">
          <h3 className="guide-title">How LinkSentry Detects Social Engineering & Smishing</h3>
          <div className="guide-grid">
            <div className="guide-item">
              <div className="guide-step-num font-mono">01</div>
              <h4>Artificial Urgency & Fear Triggers</h4>
              <p>Flags aggressive deadlines ("Account locked in 1 hour", "Unauthorized wire transfer") designed to induce panic clicking.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono">02</div>
              <h4>Brand Impersonation Signatures</h4>
              <p>Compares sender claims against established bank, courier (FedEx/UPS), and government communication styles.</p>
            </div>
            <div className="guide-item">
              <div className="guide-step-num font-mono">03</div>
              <h4>Embedded Threat Link Extraction</h4>
              <p>Isolates shortened and obfuscated domains inside the message body for deep URL detonation and DNS evaluation.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
