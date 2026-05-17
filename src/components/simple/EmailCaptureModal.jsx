import { useState } from 'react';
import { isValidEmail, submitEmailSignup } from '../../utils/emailSignup';
import { renderMarkdownLink } from '../../utils/renderMarkdownLink';
import copy from '../../../config/copy.json';
import styles from '../../styles/components/EmailCaptureModal.module.css';

function EmailCaptureModal({ quizState, onClose }) {
  const c = copy.emailCapture || {};
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agreed) return;
    setError(null);

    if (!isValidEmail(email)) {
      setError(c.errorEmail || 'Please enter a valid email address.');
      return;
    }

    // Fire-and-forget: don't block the user on Lambda cold-start latency.
    // Failures are logged but not surfaced — the user has already moved on.
    submitEmailSignup({ email, quizState }).catch((err) => {
      console.error('Email signup failed:', err);
    });
    onClose();
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <h2 className={styles.title}>{c.title || 'Stay in the loop'}</h2>
        <p className={styles.body}>{c.body || ''}</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            type="email"
            className={styles.input}
            placeholder={c.placeholder || 'you@example.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          {c.consentLabel && (
            <label className={styles.consent}>
              <input
                type="checkbox"
                className={styles.consentCheckbox}
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className={styles.consentText}>{renderMarkdownLink(c.consentLabel)}</span>
            </label>
          )}
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={`btn btn-sm ${styles.skipButton}`} onClick={onClose}>
              {c.skipLabel || 'No thanks'}
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!agreed}>
              {c.submitLabel || 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmailCaptureModal;
