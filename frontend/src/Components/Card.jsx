import React from 'react'
import '../Pages/Card.css'

export default function Card({children, className=''}){
  return <div className={`card ${className}`}>{children}</div>
}