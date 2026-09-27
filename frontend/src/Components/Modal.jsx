import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, children, open, onClose }) {
  if (!open) return null;
  return (
    <div className="app-modal-overlay" onClick={onClose}>
      <div className="app-modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="app-modal-header">
          <div className="app-modal-title-section">
            <h2>{title}</h2>
            <p>Manage inventory & system records</p>
          </div>
          <button className="app-modal-close" onClick={onClose} aria-label="Close modal" type="button">
            <X size={18} />
          </button>
        </div>
        <div className="app-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
