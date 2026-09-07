import React from 'react'
import { X } from 'lucide-react'
import '../Pages/Modal.css'

export default function Modal({title, children, open, onClose}){
  if(!open) return null
  return (
    <div className="app-modal-overlay" onClick={onClose}>
      <div className="app-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="app-modal-header">
          <div className="app-modal-title-section">
            <h2>{title}</h2>
            <p>Manage system records</p>
          </div>
          <button className="app-modal-close" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="app-modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
