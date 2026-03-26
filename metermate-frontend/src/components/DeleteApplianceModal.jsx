import React from 'react';
import styles from './LeaveGroupModal.module.css';

export default function DeleteApplianceModal({ isOpen, applianceName, onConfirm, onCancel, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Delete Device</h2>
          <button
            onClick={onCancel}
            className={styles.closeButton}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          <div className={styles.warningIcon}>⚡</div>
          <p className={styles.modalText}>
            Delete <strong>{applianceName}</strong>?
          </p>
          <p className={styles.modalSubtext}>
            This will remove the device from your consumption records.
            <strong> This cannot be undone.</strong>
          </p>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={styles.confirmButton}
            disabled={isLoading}
            style={{ background: isLoading ? '#dc2626' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}
          >
            {isLoading ? '⏳ Deleting...' : '🗑️ Delete Device'}
          </button>
        </div>
      </div>
    </div>
  );
}
