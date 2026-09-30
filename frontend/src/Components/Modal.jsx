import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, subtitle, children, open, onClose, maxWidth = '720px' }) {
  if (!open) return null;
  return (
    <div className="modal-overlay-inventory" onClick={onClose}>
      <div 
        className="modal-content-inventory add-item-modal" 
        onClick={(e) => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true"
        style={{ maxWidth, width: `min(94vw, ${maxWidth})` }}
      >
        <div className="modal-header-inventory">
          <div className="modal-title-section-inventory">
            <h2 className="modal-title-inventory">{title}</h2>
            <p className="modal-subtitle-inventory">{subtitle || 'Manage inventory & system records'}</p>
          </div>
          <button className="modal-close-btn-inventory" onClick={onClose} aria-label="Close modal" type="button" title="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body-inventory">
          {children}
        </div>
      </div>
    </div>
  );
}
