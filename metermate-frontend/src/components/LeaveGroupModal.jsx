import React, { useState } from 'react';
import styles from './LeaveGroupModal.module.css';

export default function LeaveGroupModal({ isOpen, groupName, onConfirm, onCancel, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Leave Group</h2>
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
          <div className={styles.warningIcon}>⚠️</div>
          <p className={styles.modalText}>
            Are you sure you want to leave <strong>{groupName}</strong>?
          </p>
          <p className={styles.modalSubtext}>
            You'll lose access to this group's appliances and payment history. This action cannot be undone.
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
          >
            {isLoading ? '⏳ Leaving...' : '🚪 Leave Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
