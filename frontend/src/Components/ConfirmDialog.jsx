import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmDialog.css';

export default function ConfirmDialog({ open, title = 'Confirm action', message, confirmLabel = 'Delete', tone = 'danger', onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <section className={`confirm-dialog confirm-dialog-${tone}`} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onClick={event => event.stopPropagation()}>
        <button className="confirm-dialog-close" type="button" onClick={onCancel} aria-label="Close confirmation">
          <X size={18} />
        </button>
        <div className={`confirm-dialog-icon confirm-dialog-icon-${tone}`}><AlertTriangle size={24} /></div>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className={`confirm-dialog-confirm confirm-dialog-confirm-${tone}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}