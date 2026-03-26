import React from 'react';
import styles from './LeaveGroupModal.module.css';

export default function DeleteGroupModal({ isOpen, groupName, onConfirm, onCancel, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Delete Group</h2>
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
          <div className={styles.warningIcon}>🗑️</div>
          <p className={styles.modalText}>
            Delete <strong>{groupName}</strong>?
          </p>
          <p className={styles.modalSubtext}>
            This will permanently delete the group and ALL appliance records, transaction history, and payment data.
            <strong> This action CANNOT be undone.</strong>
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
            {isLoading ? '⏳ Deleting...' : '🗑️ Delete Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
