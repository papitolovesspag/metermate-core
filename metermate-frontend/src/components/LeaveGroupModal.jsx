import styles from './LeaveGroupModal.module.css';

export default function LeaveGroupModal({ isOpen, groupName, onConfirm, onCancel, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Leave Group</h2>
          <button onClick={onCancel} className={styles.closeButton} disabled={isLoading}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.warningIcon}>⚠️</div>
          <p className={styles.modalText}>
            Are you sure you want to leave <strong>{groupName}</strong>?
          </p>
          <p className={styles.modalSubtext}>
            You will lose access to this group&apos;s devices and payment history.
            <strong> This action cannot be undone.</strong>
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onCancel} className={styles.cancelButton} disabled={isLoading}>
            Cancel
          </button>
          <button onClick={onConfirm} className={styles.confirmButton} disabled={isLoading}>
            {isLoading ? 'Leaving...' : 'Leave Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
