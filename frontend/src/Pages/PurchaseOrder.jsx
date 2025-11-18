import React, { useState } from 'react'
import Navbar from '../Components/Navbar'
import Sidebar from '../Components/Sidebar'
import ChatAssistant from '../Components/ChatAssistant'
import './PurchaseOrder.css'

const samplePOs = [
  {
    id: 'PO-2025-001',
    status: 'Pending',
    supplier: 'Noritake Lanka',
    branch: 'CBBS Colombo',
    orderDate: '2025-10-05',
    expectedDate: '2025-10-20',
    total: 'Rs. 23,900',
    createdBy: 'Admin User',
    items: ['Highball Glasses x 50', 'Wine Glasses x 30']
  },
  {
    id: 'PO-2025-002',
    status: 'Pending',
    supplier: 'Ceylon Coffee Company',
    branch: 'CBBS Colombo',
    orderDate: '2025-10-10',
    expectedDate: '2025-10-25',
    total: 'Rs. 44,000',
    createdBy: 'Kasun Silva',
    items: ['Sugar Syrup x 20', 'Cocktail Shaker Set x 10']
  },
  {
    id: 'PO-2025-003',
    status: 'Received',
    supplier: 'Ceylon Coffee Company',
    branch: 'CBBS Colombo',
    orderDate: '2025-10-01',
    expectedDate: '2025-10-15',
    total: 'Rs. 75,000',
    createdBy: 'Admin User',
    items: ['Arabica Coffee Beans x 30']
  }
]

export default function PurchaseOrder () {
  // ===== MAIN STATE =====
  const [pos, setPos] = useState(samplePOs)
  const [query, setQuery] = useState('')

  const filtered = pos.filter(po => 
    po.id.toLowerCase().includes(query.toLowerCase()) || 
    po.supplier.toLowerCase().includes(query.toLowerCase())
  )

  // ===== HANDLE NEW PO =====
  const handleNewPO = () => {
    alert('New Purchase Order form will open here!')
    // Add your logic to open form or navigate to new PO page
  }

  // ===== RENDER =====

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="po-container">
            <div className="po-layout">
              <main className="po-content">
                {/* Header */}
                <header className="po-header">
                  <div className="po-header-top">
                    <div className="po-search">
                      <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.49 21.49 20 15.5 14zM4 9.5C4 6.46 6.46 4 9.5 4S15 6.46 15 9.5 12.54 15 9.5 15 4 12.54 4 9.5z" />
                      </svg>
                      <input
                        placeholder="Search by PO number or Supplier..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="po-search-input"
                      />
                    </div>
                    <button className="btn-new-po" onClick={handleNewPO}>
                      + New Purchase Order
                    </button>
                  </div>
                </header>

                {/* PO List */}
                <section className="po-main">
                  {filtered.length === 0 ? (
                    <div className="no-results">
                      <p>No purchase orders found matching "{query}"</p>
                    </div>
                  ) : (
                    <div className="po-list">
                      {filtered.map((po, idx) => (
                        <div className={`po-card ${idx === 0 ? 'selected' : ''}`} key={po.id}>
                          <div className="po-row top">
                            <div className="po-id">{po.id}</div>
                            <div className={`po-badge ${po.status === 'Pending' ? 'pending' : (po.status === 'Cancelled' ? 'cancelled' : 'received')}`}>
                              {po.status}
                            </div>
                          </div>

                          <div className="po-row info">
                            <div className="info-col">
                              <div className="info-label">Supplier</div>
                              <div className="info-val">{po.supplier}</div>
                            </div>
                            <div className="info-col">
                              <div className="info-label">Branch</div>
                              <div className="info-val">{po.branch}</div>
                            </div>
                            <div className="info-col">
                              <div className="info-label">Order Date</div>
                              <div className="info-val">{po.orderDate}</div>
                            </div>
                            <div className="info-col">
                              <div className="info-label">Expected Date</div>
                              <div className="info-val">{po.expectedDate}</div>
                            </div>
                            <div className="info-col">
                              <div className="info-label">Created By</div>
                              <div className="info-val">{po.createdBy}</div>
                            </div>
                          </div>

                          <div className="po-items">
                            {po.items.map((it, i) => (
                              <span className="pill" key={i}>{it}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </main>
            </div>
          </div>
        </main>
      </div>

      {/* Chat Assistant */}
      <ChatAssistant />
    </div>
  )
}