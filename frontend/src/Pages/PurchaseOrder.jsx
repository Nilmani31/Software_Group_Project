import React, { useState } from 'react'
import Navbar from '../Components/Navbar'
import Sidebar from '../Components/Sidebar'
import ChatAssistant from '../Components/ChatAssistant'
// Modal component replaced for Create PO to match Inventory design
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
  // Suggestions for combobox-style inputs (editable + dropdown)
  const categoryOptions = ['Glassware', 'Coffee']
  const itemOptions = ['Arabica Coffee Beans', 'Highball Glass']
  const [openCreate, setOpenCreate] = useState(false)
  const [openView, setOpenView] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openCancel, setOpenCancel] = useState(false)
  const [selected, setSelected] = useState(null)

  // Simple Create-PO form state
  const [poForm, setPoForm] = useState({
    poNumber: '',
    orderBy: 'Supplier',
    supplierName: '',
    phone: '',
    branch: '',
    orderDate: '',
    expectedDate: ''
  })

  const [cart, setCart] = useState([])
  const [cartVisible, setCartVisible] = useState(false)
  const [line, setLine] = useState({ category: '', item: '', qty: '' })
  // Edit modal state
  const [editForm, setEditForm] = useState({
    poNumber: '',
    orderBy: 'Supplier',
    supplierName: '',
    phone: '',
    branch: '',
    orderDate: '',
    expectedDate: ''
  })
  const [editCart, setEditCart] = useState([])
  const [editCartVisible, setEditCartVisible] = useState(false)
  const [editLine, setEditLine] = useState({ category: '', item: '', qty: '' })
  // Cancel/Delete modal state
  const [cancelForm, setCancelForm] = useState({
    deletedBy: '',
    contactNumber: '',
    deletedDate: '',
    branchName: '',
    reason: ''
  })
  const [cancelErrors, setCancelErrors] = useState({})
  const updateCancelForm = (key, val) => setCancelForm(prev => ({ ...prev, [key]: val }))

  const filtered = pos.filter(po => 
    po.id.toLowerCase().includes(query.toLowerCase()) || 
    po.supplier.toLowerCase().includes(query.toLowerCase())
  )

  // ===== HANDLE NEW PO =====
  const handleNewPO = () => setOpenCreate(true)

  const updateForm = (key, val) => setPoForm(prev => {
    if (key === 'orderBy') {
      if (val === 'Supplier') {
        return { ...prev, orderBy: val, branch: '' }
      } else {
        return { ...prev, orderBy: val, supplierName: '', phone: '' }
      }
    }
    return ({ ...prev, [key]: val })
  })
  const updateLine = (key, val) => setLine(prev => ({ ...prev, [key]: val }))

  const addToCart = () => {
    setCartVisible(true)
    if (!line.item || !line.qty) return
    // Normalize numbers
    const qty = Number(line.qty)
    const unitPrice = line.unitPrice ? Number(line.unitPrice) : undefined
    setCart(prev => [...prev, { ...line, qty, unitPrice }])
    setLine({ category: '', item: '', qty: '' })
  }

  const editExistingCreateItem = (index) => {
    setCartVisible(true)
    const target = cart[index]
    if (!target) return
    // If there's a pending line edit not yet added, put it back into the cart first
    if (line.item && line.qty) {
      const pendingQty = Number(line.qty)
      const pendingUnit = line.unitPrice ? Number(line.unitPrice) : undefined
      setCart(prev => {
        const base = prev.filter((_, i) => i !== index)
        return [...base, { ...line, qty: pendingQty, unitPrice: pendingUnit }]
      })
    } else {
      setCart(prev => prev.filter((_, i) => i !== index))
    }
    // Load selected target into inputs for editing
    setLine({ category: target.category || '', item: target.item, qty: target.qty, unitPrice: target.unitPrice })
  }
  const removeCreateItem = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const updateEditLine = (key, val) => setEditLine(prev => ({ ...prev, [key]: val }))

  const addToEditCart = () => {
    setEditCartVisible(true)
    if (!editLine.item || !editLine.qty) return
    const qty = Number(editLine.qty)
    const unitPrice = editLine.unitPrice ? Number(editLine.unitPrice) : undefined
    setEditCart(prev => [...prev, { ...editLine, qty, unitPrice }])
    setEditLine({ category: '', item: '', qty: '' })
  }

  const editExistingEditItem = (index) => {
    setEditCartVisible(true)
    const target = editCart[index]
    if (!target) return
    // If user has a pending edit in inputs, reinsert it back into the cart before switching
    if (editLine.item && editLine.qty) {
      setEditCart(prev => {
        const base = prev.filter((_, i) => i !== index)
        return [...base, { ...editLine }]
      })
    } else {
      setEditCart(prev => prev.filter((_, i) => i !== index))
    }
    setEditLine({ category: target.category || '', item: target.item, qty: target.qty })
  }
  const removeEditItem = (index) => {
    setEditCart(prev => prev.filter((_, i) => i !== index))
  }

  const submitPO = (e) => {
    e.preventDefault()
    const year = new Date().getFullYear()
    const raw = (poForm.poNumber || '').trim()
    const existingIds = new Set(pos.map(p => p.id))
    const pattern = new RegExp(`^PO-${year}-\\d{3}$`)
    let id = raw
    if (!id || existingIds.has(id)) {
      const takenNumbers = pos
        .map(p => {
          const m = p.id.match(new RegExp(`^PO-${year}-(\\d{3})$`))
          return m ? parseInt(m[1], 10) : null
        })
        .filter(n => n !== null)
      let seq = takenNumbers.length ? Math.max(...takenNumbers) + 1 : 1
      while (existingIds.has(`PO-${year}-${String(seq).padStart(3,'0')}`)) seq++
      id = `PO-${year}-${String(seq).padStart(3,'0')}`
    } else if (!pattern.test(id)) {
      // If user entered a custom format that collides later, append a unique suffix
      if (existingIds.has(id)) {
        let suffix = 1
        while (existingIds.has(`${id}-${suffix}`)) suffix++
        id = `${id}-${suffix}`
      }
    }
    const items = cart.map(ci => `${ci.item} x ${ci.qty}`)
    let total = ''
    if (poForm.orderBy === 'Branch') {
      const sum = cart.reduce((acc, ci) => acc + ((Number(ci.qty) || 0) * (Number(ci.unitPrice) || 0)), 0)
      if (sum > 0) total = `Rs. ${sum.toLocaleString('en-LK')}`
    }
    const newPO = {
      id,
      status: 'Pending',
      supplier: poForm.orderBy === 'Supplier' ? (poForm.supplierName || '') : '',
      branch: poForm.orderBy === 'Branch' ? (poForm.branch || '') : '',
      orderDate: poForm.orderDate || '',
      expectedDate: poForm.expectedDate || '',
      total,
      createdBy: 'Admin User',
      items
    }
    setPos(prev => [newPO, ...prev])
    // Reset form and cart
    setPoForm({ poNumber: '', orderBy: 'Supplier', supplierName: '', phone: '', branch: '', orderDate: '', expectedDate: '' })
    setCart([])
    setCartVisible(false)
    setLine({ category: '', item: '', qty: '' })
    setOpenCreate(false)
  }

  // ===== RENDER =====

  return (
    <div className="app-wrapper purchase-order-page">
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
                            <button className="btn-view-details" onClick={() => { setSelected(po); setOpenView(true); }}>View Details</button>
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

      {/* Create Purchase Order Modal (Inventory style) */}
      {openCreate && (
        <div className="modal-overlay-inventory" onClick={() => setOpenCreate(false)}>
          <div className="modal-content-inventory" onClick={e => e.stopPropagation()}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Create Purchase Order</h2>
                <p className="modal-subtitle-inventory">Add a new purchase order</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={() => setOpenCreate(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-body-inventory">
              <form onSubmit={submitPO} className="modal-form-inventory">
                <div className="form-layout-inventory">
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">PO Number</label>
                    <input type="text" value={poForm.poNumber} onChange={e => updateForm('poNumber', e.target.value)} placeholder="PO-2025-XXX" className="form-input-inventory" />
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Order By</label>
                    <select value={poForm.orderBy} onChange={e => updateForm('orderBy', e.target.value)} className="form-input-inventory">
                      <option>Supplier</option>
                      <option>Branch</option>
                    </select>
                  </div>
                  {poForm.orderBy === 'Supplier' ? (
                    <>
                      <div className="form-group-inventory">
                        <label className="form-label-inventory">Supplier Name</label>
                        <input type="text" value={poForm.supplierName} onChange={e => updateForm('supplierName', e.target.value)} placeholder="Enter Supplier" className="form-input-inventory" />
                      </div>
                      <div className="form-group-inventory">
                        <label className="form-label-inventory">Phone Number</label>
                        <input type="tel" value={poForm.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="07x xxx xxxx" className="form-input-inventory" />
                      </div>
                    </>
                  ) : (
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Branch Name</label>
                      <input type="text" value={poForm.branch} onChange={e => updateForm('branch', e.target.value)} placeholder="CBBS Colombo" className="form-input-inventory" />
                    </div>
                  )}
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Order Date</label>
                    <input type="date" value={poForm.orderDate} onChange={e => updateForm('orderDate', e.target.value)} className="form-input-inventory" />
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Expected Delivery Date</label>
                    <input type="date" value={poForm.expectedDate} onChange={e => updateForm('expectedDate', e.target.value)} className="form-input-inventory" />
                  </div>
                </div>
                <h4 style={{ margin: '8px 0 0 0', fontSize: '14px', fontWeight: 700, color: '#667eea' }}>Order Item</h4>
                <div className="form-layout-inventory">
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Category</label>
                    <input type="text" list="category-list-create" value={line.category} onChange={e => updateLine('category', e.target.value)} placeholder="Select or type category" className="form-input-inventory" />
                    <datalist id="category-list-create">
                      {categoryOptions.map((c,i) => (<option value={c} key={i} />))}
                    </datalist>
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Item</label>
                    <input type="text" list="item-list-create" value={line.item} onChange={e => updateLine('item', e.target.value)} placeholder="Select or type item" className="form-input-inventory" />
                    <datalist id="item-list-create">
                      {itemOptions.map((c,i) => (<option value={c} key={i} />))}
                    </datalist>
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Quantity</label>
                    <input value={line.qty} onChange={e => updateLine('qty', e.target.value)} placeholder="Qty" type="number" min="1" step="1" className="form-input-inventory" />
                  </div>
                  {poForm.orderBy === 'Branch' && (
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Unit Price</label>
                      <input value={line.unitPrice || ''} onChange={e => updateLine('unitPrice', e.target.value)} placeholder="Unit Price" type="number" className="form-input-inventory" />
                    </div>
                  )}
                  <div className="form-group-inventory" style={{ alignSelf:'end' }}>
                    <button type="button" className="modal-btn-inventory cancel" onClick={addToCart}>Add to cart</button>
                  </div>
                </div>
                {cartVisible && (
                  <div className="po-detail-table-wrap">
                    <table className="po-detail-table">
                      <thead>
                        {poForm.orderBy === 'Supplier' ? (
                          <tr><th>Item Name</th><th>Quantity</th><th style={{width:'120px'}}>Actions</th></tr>
                        ) : (
                          <tr><th>Item Name</th><th>Quantity</th><th>Unit Price</th><th>Total</th><th style={{width:'120px'}}>Actions</th></tr>
                        )}
                      </thead>
                      <tbody>
                        {cart.length === 0 ? (
                          poForm.orderBy === 'Supplier' ? (
                            <tr><td colSpan={3} style={{ color:'#6b7280' }}>No items added yet</td></tr>
                          ) : (
                            <tr><td colSpan={5} style={{ color:'#6b7280' }}>No items added yet</td></tr>
                          )
                        ) : (
                          cart.map((ci, i) => (
                            poForm.orderBy === 'Supplier' ? (
                              <tr key={i}><td>{ci.item}</td><td>{ci.qty}</td><td style={{display:'flex',gap:6}}>
                                <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => editExistingCreateItem(i)}>Edit</button>
                                <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => removeCreateItem(i)}>Remove</button>
                              </td></tr>
                            ) : (
                              <tr key={i}><td>{ci.item}</td><td>{ci.qty}</td><td>{ci.unitPrice}</td><td>{(Number(ci.qty)||0) * (Number(ci.unitPrice)||0)}</td><td style={{display:'flex',gap:6}}>
                                <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => editExistingCreateItem(i)}>Edit</button>
                                <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => removeCreateItem(i)}>Remove</button>
                              </td></tr>
                            )
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="modal-footer-inventory" style={{ justifyContent:'flex-end' }}>
                  <button type="button" className="modal-btn-inventory cancel" onClick={() => setOpenCreate(false)}>Cancel</button>
                  <button type="submit" className="modal-btn-inventory submit">Purchase Order</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Purchase Order Details Modal */}
      {openView && selected && (
        <div className="modal-overlay-inventory" onClick={() => setOpenView(false)}>
          <div className="modal-content-inventory" onClick={e => e.stopPropagation()}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Purchase Order Details</h2>
                <p className="modal-subtitle-inventory">View complete purchase order information and items</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={() => setOpenView(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-body-inventory">
              <div className="po-detail-number-row">
                <span className="po-detail-number">{selected.id}</span>
                <span className={`po-detail-badge ${selected.status === 'Pending' ? 'pending' : (selected.status === 'Cancelled' ? 'cancelled' : 'received')}`}>{selected.status}</span>
              </div>
              <div className="po-detail-info-grid">
                <div>
                  <span className="po-detail-label supplier">SUPPLIER</span>
                  <div>{selected.supplier}</div>
                </div>
                <div>
                  <span className="po-detail-label order-date">ORDER DATE</span>
                  <div>{selected.orderDate}</div>
                </div>
                <div>
                  <span className="po-detail-label branch">BRANCH</span>
                  <div>{selected.branch}</div>
                </div>
                <div>
                  <span className="po-detail-label expected-date">EXPECTED DATE</span>
                  <div>{selected.expectedDate}</div>
                </div>
                <div>
                  <span className="po-detail-label created-by">CREATED BY</span>
                  <div>{selected.createdBy}</div>
                </div>
                <div>
                  <span className="po-detail-label total">TOTAL AMOUNT</span>
                  <div>{selected.total}</div>
                </div>
              </div>
              <div className="po-detail-table-wrap">
                <table className="po-detail-table">
                  <thead>
                    <tr><th>Item Name</th><th>Quantity</th></tr>
                  </thead>
                  <tbody>
                    {selected.items.map((it, i) => {
                      const parts = it.split(' x ')
                      return <tr key={i}><td>{parts[0]}</td><td>{parts[1] || ''}</td></tr>
                    })}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer-inventory">
                {selected.status === 'Pending' && (
                  <>
                    <button type="button" className="modal-btn-inventory cancel" onClick={() => {
                      if (!selected) return
                      const today = new Date().toISOString().split('T')[0]
                      setCancelForm({
                        deletedBy: '',
                        contactNumber: '',
                        deletedDate: today,
                        branchName: selected.branch || '',
                        reason: ''
                      })
                      setOpenView(false)
                      setOpenCancel(true)
                    }}>Cancel Order</button>
                    <button type="button" className="modal-btn-inventory submit" onClick={() => {
                      // Prepare edit form from selected and open edit modal
                      if (!selected) return
                      setEditForm({
                        poNumber: selected.id,
                        orderBy: 'Supplier',
                        supplierName: selected.supplier || '',
                        phone: '',
                        branch: selected.branch || '',
                        orderDate: selected.orderDate || '',
                        expectedDate: selected.expectedDate || ''
                      })
                      const parsed = (selected.items || []).map(it => {
                        const parts = it.split(' x ')
                        return { item: parts[0] || it, qty: parts[1] ? Number(parts[1]) : '' }
                      })
                      setEditCart(parsed)
                      // Ensure inline add/edit inputs start empty when opening Edit Order
                      setEditLine({ category: '', item: '', qty: '' })
                      setOpenView(false)
                      setOpenEdit(true)
                      setEditCartVisible(true)
                    }}>Edit Order</button>
                  </>
                )}
                <button type="button" className="modal-btn-inventory cancel" onClick={() => setOpenView(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Purchase Order Modal */}
      {openEdit && selected && (
        <div className="modal-overlay-inventory" onClick={() => setOpenEdit(false)}>
          <div className="modal-content-inventory" onClick={e => e.stopPropagation()}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Edit Order Details</h2>
                <p className="modal-subtitle-inventory">Edit and save purchase order information</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={() => setOpenEdit(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-body-inventory">
              <div className="po-detail-number-row">
                <span className="po-detail-number">{editForm.poNumber || selected.id}</span>
                <span className={`po-detail-badge ${selected.status === 'Pending' ? 'pending' : (selected.status === 'Cancelled' ? 'cancelled' : 'received')}`}>{selected.status}</span>
              </div>

              <form onSubmit={(e) => { e.preventDefault();
                const pending = (editLine.item && editLine.qty) ? [{ ...editLine }] : []
                const workingCart = [...editCart, ...pending]
                const updatedItems = workingCart.map(ci => `${ci.item} x ${ci.qty}`)
                const updated = {
                  ...selected,
                  supplier: editForm.supplierName,
                  branch: editForm.branch,
                  orderDate: editForm.orderDate,
                  expectedDate: editForm.expectedDate,
                  items: updatedItems
                }
                setPos(prev => prev.map(p => p.id === selected.id ? updated : p))
                setSelected(updated)
                setOpenEdit(false)
                setOpenView(true)
              }}>
                <div className="form-layout-inventory">
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Category</label>
                    <input type="text" list="category-list-edit" value={editLine.category} onChange={e => updateEditLine('category', e.target.value)} placeholder="Select or type category" className="form-input-inventory" />
                    <datalist id="category-list-edit">
                      {categoryOptions.map((c,i) => (<option value={c} key={i} />))}
                    </datalist>
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Item</label>
                    <input type="text" list="item-list-edit" value={editLine.item} onChange={e => updateEditLine('item', e.target.value)} placeholder="Select or type item" className="form-input-inventory" />
                    <datalist id="item-list-edit">
                      {itemOptions.map((c,i) => (<option value={c} key={i} />))}
                    </datalist>
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Quantity</label>
                    <input value={editLine.qty} onChange={e => updateEditLine('qty', e.target.value)} placeholder="Qty" type="number" min="1" step="1" className="form-input-inventory" />
                  </div>
                  <div className="form-group-inventory" style={{ alignSelf: 'end' }}>
                    <button type="button" className="modal-btn-inventory cancel" onClick={addToEditCart}>Add</button>
                  </div>
                </div>

                {editCartVisible && (
                  <div className="po-detail-table-wrap">
                    <table className="po-detail-table">
                      <thead>
                        <tr><th>Item Name</th><th>Quantity</th><th style={{width:'120px'}}>Actions</th></tr>
                      </thead>
                      <tbody>
                        {editCart.length === 0 ? (
                          <tr><td colSpan={3} style={{ color:'#6b7280' }}>No items added yet</td></tr>
                        ) : (
                          editCart.map((ci, i) => (
                            <tr key={i}><td>{ci.item}</td><td>{ci.qty}</td><td style={{display:'flex',gap:6}}>
                              <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => editExistingEditItem(i)}>Edit</button>
                              <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => removeEditItem(i)}>Remove</button>
                            </td></tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="modal-footer-inventory" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="modal-btn-inventory submit">Save</button>
                    <button type="button" className="modal-btn-inventory cancel" onClick={() => { setOpenEdit(false); setOpenView(true); }}>View Details</button>
                  </div>
                  <div>
                    <button type="button" className="modal-btn-inventory cancel" onClick={() => setOpenEdit(false)}>Close</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Cancel/Delete Purchase Order Modal */}
      {openCancel && selected && (
        <div className="modal-overlay-inventory" onClick={() => setOpenCancel(false)}>
          <div className="modal-content-inventory" onClick={e => e.stopPropagation()}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Delete Order</h2>
                <p className="modal-subtitle-inventory">Confirm deletion and notify stakeholders</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={() => setOpenCancel(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-body-inventory">
            <div className="modal-id-section-inventory">
              <span className="modal-item-id-inventory">{selected.id}</span>
              <span className={`po-detail-badge ${selected.status === 'Pending' ? 'pending' : (selected.status === 'Cancelled' ? 'cancelled' : 'received')}`}>{selected.status}</span>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault()
              console.log('=== CANCEL FORM SUBMITTED ===')
              console.log('Form data:', cancelForm)
              console.log('Selected PO:', selected)
              
              // TEMPORARILY SKIP ALL VALIDATION FOR TESTING
              console.log('Skipping validation, directly updating status...')
              
              const updated = { ...selected, status: 'Cancelled' }
              console.log('Updated PO object:', updated)
              
              // Update list and selected reference
              setPos(prev => {
                const newList = prev.map(p => {
                  console.log(`Checking PO ${p.id} against selected ${selected.id}`)
                  return p.id === selected.id ? updated : p
                })
                console.log('New PO list:', newList)
                return newList
              })
              
              setSelected(updated)
              console.log('Selected updated to:', updated)
              
              // Close modal
              setOpenCancel(false)
              console.log('Modal closed')
              
              // Show success in console
              alert('PO status changed to Cancelled - check the list!')
            }} className="modal-form-inventory">
              <div className="form-layout-inventory">
                <div className="form-group-inventory">
                  <label className="form-label-inventory">Deleted By</label>
                  <input className="form-input-inventory" value={cancelForm.deletedBy} onChange={e => updateCancelForm('deletedBy', e.target.value)} placeholder="Type name here" aria-invalid={!!cancelErrors.deletedBy} />
                  {cancelErrors.deletedBy && <div className="field-error">{cancelErrors.deletedBy}</div>}
                </div>
                <div className="form-group-inventory">
                  <label className="form-label-inventory">Contact Number</label>
                  <input className="form-input-inventory" value={cancelForm.contactNumber} onChange={e => updateCancelForm('contactNumber', e.target.value)} placeholder="" aria-invalid={!!cancelErrors.contactNumber} />
                  {cancelErrors.contactNumber && <div className="field-error">{cancelErrors.contactNumber}</div>}
                </div>
                <div className="form-group-inventory">
                  <label className="form-label-inventory">Deleted Date</label>
                  <input className="form-input-inventory" type="date" value={cancelForm.deletedDate} onChange={e => updateCancelForm('deletedDate', e.target.value)} aria-invalid={!!cancelErrors.deletedDate} />
                  {cancelErrors.deletedDate && <div className="field-error">{cancelErrors.deletedDate}</div>}
                </div>
                <div className="form-group-inventory">
                  <label className="form-label-inventory">Branch Name</label>
                  <select className="form-input-inventory" value={cancelForm.branchName} onChange={e => updateCancelForm('branchName', e.target.value)} aria-invalid={!!cancelErrors.branchName}>
                    <option value="">Select Branch</option>
                    <option value="Colombo">Colombo</option>
                    <option value="Kandy">Kandy</option>
                  </select>
                  {cancelErrors.branchName && <div className="field-error">{cancelErrors.branchName}</div>}
                </div>
              </div>
              <div className="form-group-inventory">
                <label className="form-label-inventory">Reason</label>
                <textarea className="form-input-inventory" rows="5" value={cancelForm.reason} onChange={e => updateCancelForm('reason', e.target.value)} placeholder="" aria-invalid={!!cancelErrors.reason} />
                {cancelErrors.reason && <div className="field-error">{cancelErrors.reason}</div>}
              </div>
              <div className="modal-footer-inventory">
                <button type="submit" className="modal-btn-inventory submit danger">Confirm and Inform</button>
                <button type="button" className="modal-btn-inventory cancel" onClick={() => { setOpenCancel(false); setOpenView(true) }}>View Details</button>
                <button type="button" className="modal-btn-inventory cancel" onClick={() => setOpenCancel(false)}>Close</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Chat Assistant */}
      <ChatAssistant />
    </div>
  )
}