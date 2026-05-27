import { ExternalLink } from 'lucide-react';
import styles from '../../styles/components/SessionConflictModal.module.css';

/**
 * Modal shown when user has existing quiz progress and opens a share link.
 * Offers three options: keep existing progress, load shared data, or open in new tab.
 */
function SessionConflictModal({ onKeepMine, onLoadShared, onOpenNewTab }) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-conflict-title"
    >
      <div className={styles.modal}>
        <h2 id="session-conflict-title" className={styles.title}>
          You have unsaved progress
        </h2>
        <p className={styles.message}>
          Loading this shared link will replace your current quiz answers. What would you like to
          do?
        </p>

        <div className={styles.buttons}>
          <button onClick={onKeepMine} className={`btn btn-secondary ${styles.button}`}>
            Keep my progress
          </button>
          <button onClick={onLoadShared} className={`btn btn-primary ${styles.button}`}>
            Load shared results
          </button>
          <button onClick={onOpenNewTab} className={`btn btn-secondary ${styles.button}`}>
            <ExternalLink size={16} />
            Open in new tab
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionConflictModal;
