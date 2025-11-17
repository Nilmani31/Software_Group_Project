import React from 'react'
import { X } from 'lucide-react'
import '../Pages/Modal.css'

export default function Modal({title, children, open, onClose}){
  if(!open) return null
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h3>{title}</h3>
          <button onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}