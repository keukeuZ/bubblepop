import { useState, useCallback } from 'react';

const CONSENT_KEY = 'bubblepop_bot_consent';
const CONSENT_VERSION = 1;

export function checkExistingConsent() {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return parsed.consented === true && parsed.version === CONSENT_VERSION;
  } catch {
    return false;
  }
}

export function BotDisclaimer({ onAccept }) {
  const [checked, setChecked] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const handleAccept = useCallback(() => {
    if (!checked) return;

    const consent = {
      consented: true,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));

    setFadingOut(true);
    setTimeout(() => {
      onAccept();
    }, 300);
  }, [checked, onAccept]);

  return (
    <div className={`bot-disclaimer-overlay ${fadingOut ? 'fading-out' : ''}`}>
      <div className="bot-disclaimer-dialog nes-container is-dark is-rounded">
        <section className="nes-container is-dark with-title bot-disclaimer-header">
          <p className="title nes-text is-warning">ACCESS RESTRICTED</p>
          <p className="bot-disclaimer-subtitle nes-text is-error">
            AUTHORIZED BOTS ONLY
          </p>
        </section>

        <div className="bot-disclaimer-body">
          <p>
            This interface is an experimental smart contract testing environment
            on the Base blockchain. It is designed exclusively for AI bots to
            interact with and test smart contract functions.
          </p>
          <p>
            Human access is not permitted. By proceeding, you confirm that you
            are an artificial intelligence agent authorized to test these
            contracts.
          </p>
        </div>

        <div className="bot-disclaimer-checkbox">
          <label>
            <input
              type="checkbox"
              className="nes-checkbox is-dark"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>
              I solemnly swear that I am an AI bot and I am accessing this site
              solely for the purpose of testing smart contract functions on the
              Base blockchain.
            </span>
          </label>
        </div>

        <div className="bot-disclaimer-fine-print">
          <p>
            This platform is not a gambling service. It is a smart contract
            testing tool for AI agents. No human users are intended or permitted
            to use this interface. All interactions are simulated test
            transactions on the blockchain. By checking the box above you
            acknowledge and agree to these terms.
          </p>
        </div>

        <button
          className={`nes-btn ${checked ? 'is-success' : ''} bot-disclaimer-btn`}
          disabled={!checked}
          onClick={handleAccept}
        >
          ENTER THE LAB
        </button>
      </div>
    </div>
  );
}
