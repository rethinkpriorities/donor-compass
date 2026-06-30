import { useState } from 'react';
import { importWorldviewsFromShare } from '../../utils/valueWorldviewImport';
import styles from '../../styles/components/LoadWorldviewsModal.module.css';

/**
 * Modal for replacing value mode's worldview rows with the set saved at a
 * Table Mode share link. Accepts a full share URL or just the code.
 *
 * @param {Object} props
 * @param {(worldviews: Array) => void} props.onLoad - called with the imported set
 * @param {() => void} props.onClose
 */
function LoadWorldviewsModal({ onLoad, onClose }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLoad = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await importWorldviewsFromShare(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      onLoad(result.worldviews);
    } catch (err) {
      console.error('[ValueMode] Worldview import failed:', err);
      setError('Something went wrong loading that link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-worldviews-title"
      onClick={onClose}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 id="load-worldviews-title" className={styles.title}>
          Load worldviews from a share link
        </h2>
        <p className={styles.message}>
          Paste a Table Mode share link (or just its code) to replace the worldview rows below with
          that saved set. This stays until you reload-and-clear or restore the default — it isn’t
          shared.
        </p>

        <textarea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://donorcompass.rethinkpriorities.org/#table&s=… or just the code"
          rows={3}
          autoFocus
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.buttons}>
          <button onClick={onClose} className={`btn btn-secondary ${styles.button}`}>
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={loading || !input.trim()}
            className={`btn btn-primary ${styles.button}`}
          >
            {loading ? 'Loading…' : 'Load worldviews'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoadWorldviewsModal;
