import { useState } from 'react';

/**
 * 3 Concise Real-World Phishing Trap Scenarios
 */
const SCENARIOS = [
  {
    id: 'typosquatting',
    title: 'Trick 1: Lookalike Domains (Typosquatting)',
    concept: 'Typosquatting & Character Substitution',
    prompt: 'Which link is a dangerous phishing trap?',
    options: [
      {
        id: 'a',
        url: 'https://www.paypal.com/signin',
        isTrap: false,
        domain: 'paypal.com',
      },
      {
        id: 'b',
        url: 'https://paypa1-security.xyz/login',
        isTrap: true,
        domain: 'paypa1-security.xyz',
      },
    ],
    explanation:
      'The trap substitutes the letter "l" with the digit "1" (paypa1) and uses a suspicious disposable .xyz TLD to imitate PayPal.',
    linkSentrySignal:
      'LinkSentry V3.4 Typosquatting Engine runs fuzzy Levenshtein comparison against protected brands and flags character swaps instantly.',
  },
  {
    id: 'subdomain',
    title: 'Trick 2: Deceptive Subdomain Masking',
    concept: 'Subdomain Brand Illusion',
    prompt: 'Which link is a deceptive trap trying to impersonate Microsoft?',
    options: [
      {
        id: 'a',
        url: 'https://login.microsoft.com/auth',
        isTrap: false,
        domain: 'microsoft.com',
      },
      {
        id: 'b',
        url: 'https://microsoft.com.security-verify.top/auth',
        isTrap: true,
        domain: 'security-verify.top',
      },
    ],
    explanation:
      'Attackers place "microsoft.com" at the beginning as a subdomain, but the real registered domain receiving your credentials is "security-verify.top".',
    linkSentrySignal:
      'LinkSentry isolates the true registrable domain and checks if a protected brand name appears fraudulently inside an unauthorized host prefix.',
  },
  {
    id: 'https-myth',
    title: 'Trick 3: The "Padlock Myth" (HTTPS Scams)',
    concept: 'SSL Encryption vs. Domain Authenticity',
    prompt: 'Both links use HTTPS. Which one is a fraudulent credential harvester?',
    options: [
      {
        id: 'a',
        url: 'https://www.paypal.com/signin',
        isTrap: false,
        domain: 'paypal.com',
      },
      {
        id: 'b',
        url: 'https://paypa1-security-check.xyz/login',
        isTrap: true,
        domain: 'paypa1-security-check.xyz',
      },
    ],
    explanation:
      'HTTPS only means your connection is encrypted—it does NOT mean the website is honest. Modern phishers easily acquire free SSL certificates for fake domains.',
    linkSentrySignal:
      'LinkSentry evaluates transport encryption independently from domain reputation and brand similarity, never assuming HTTPS equals trust.',
  },
];

export default function SpotTheTrap({ onTestUrlInScanner }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const scenario = SCENARIOS[currentIndex];

  const handleSelectOption = (optionId) => {
    setSelectedOptionId(optionId);
    setShowExplanation(true);
  };

  const handleNext = () => {
    setSelectedOptionId(null);
    setShowExplanation(false);
    setCurrentIndex((prev) => (prev + 1) % SCENARIOS.length);
  };

  const handleReset = () => {
    setSelectedOptionId(null);
    setShowExplanation(false);
    setCurrentIndex(0);
  };

  const selectedOption = scenario.options.find((o) => o.id === selectedOptionId);
  const isCorrect = selectedOption?.isTrap === true;

  return (
    <div className="spot-the-trap-container cyber-card">
      <div className="trap-header">
        <div className="trap-title-group">
          <span className="trap-badge-pill font-mono">
            SECURITY PRACTICE • {currentIndex + 1} OF {SCENARIOS.length}
          </span>
          <h4 className="trap-heading">{scenario.title}</h4>
          <p className="trap-subtext">{scenario.prompt}</p>
        </div>

        <div className="trap-dots-indicator" aria-hidden="true">
          {SCENARIOS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`trap-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => {
                setCurrentIndex(idx);
                setSelectedOptionId(null);
                setShowExplanation(false);
              }}
              title={`Jump to scenario ${idx + 1}`}
              aria-label={`Jump to scenario ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* OPTIONS LIST */}
      <div className="trap-options-grid" role="group" aria-label="Phishing trap choices">
        {scenario.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          let stateClass = '';

          if (showExplanation) {
            if (option.isTrap) {
              stateClass = 'option-trap-highlight';
            } else {
              stateClass = 'option-safe-highlight';
            }
          }

          return (
            <button
              key={option.id}
              type="button"
              className={`trap-option-card ${isSelected ? 'selected' : ''} ${stateClass}`}
              onClick={() => handleSelectOption(option.id)}
              disabled={showExplanation}
              aria-pressed={isSelected}
            >
              <div className="option-top-row">
                <span className="option-letter font-mono">{option.id.toUpperCase()}</span>
                {showExplanation && (
                  <span className={`option-result-pill ${option.isTrap ? 'pill-trap' : 'pill-safe'}`}>
                    {option.isTrap ? '⚠ PHISHING TRAP' : '✓ LEGITIMATE LINK'}
                  </span>
                )}
              </div>
              <div className="option-url-box font-mono">{option.url}</div>
            </button>
          );
        })}
      </div>

      {/* RESULT & EXPLANATION PANEL */}
      {showExplanation && (
        <div className={`trap-explanation-box ${isCorrect ? 'result-success' : 'result-retry'} animate-fade-in`}>
          <div className="explanation-header">
            <span className="explanation-status-icon">{isCorrect ? '🎯' : '💡'}</span>
            <div>
              <strong className="explanation-title">
                {isCorrect ? 'Well spotted! You caught the trap.' : 'Deceptive trick! Look closely at the domain.'}
              </strong>
              <p className="explanation-summary">{scenario.explanation}</p>
            </div>
          </div>

          <div className="linksentry-check-box">
            <span className="signal-label font-mono text-cyan">HOW LINKSENTRY DETECTS THIS:</span>
            <p className="signal-body">{scenario.linkSentrySignal}</p>
          </div>

          <div className="trap-actions-bar">
            {onTestUrlInScanner && selectedOption && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onTestUrlInScanner(scenario.options.find((o) => o.isTrap).url)}
              >
                🔍 Analyze Trap URL in Scanner
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleNext}
            >
              {currentIndex < SCENARIOS.length - 1 ? 'Next Trick →' : '🔄 Restart Practice'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
