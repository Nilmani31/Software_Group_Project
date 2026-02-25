import React, { useState, useEffect } from 'react'
import Navbar from '../Components/Navbar'
import Sidebar from '../Components/Sidebar'
import ChatAssistant from '../Components/ChatAssistant'
// Modal component replaced for Create PO to match Inventory design
import './PurchaseOrder.css'

const samplePOs = []

export default function PurchaseOrder () {
  // ===== MAIN STATE =====
  const [pos, setPos] = useState(samplePOs)
  const [query, setQuery] = useState('')
  const [branches, setBranches] = useState([])
  const [categories, setCategories] = useState([])
  const [itemsWithStock, setItemsWithStock] = useState([])
  const [selectedItemForCreate, setSelectedItemForCreate] = useState(null)
  const [selectedBranchRow, setSelectedBranchRow] = useState(null)
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
    expectedDate: '',
    createdByBranch: ''
  })

  const [cart, setCart] = useState([])
  const [cartVisible, setCartVisible] = useState(false)
  const [line, setLine] = useState({ category: '', item: '', qty: '', branch: '' })
  // Edit modal state
  const [editForm, setEditForm] = useState({
    poNumber: '',
    orderBy: 'Supplier',
    supplierName: '',
    phone: '',
    branch: '',
    orderDate: '',
    expectedDate: '',
    createdByBranch: ''
  })
  const [editCart, setEditCart] = useState([])
  const [editCartVisible, setEditCartVisible] = useState(false)
  const [editLine, setEditLine] = useState({ category: '', item: '', qty: '', branch: '' })
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

  // ===== FETCH BRANCHES, CATEGORIES, AND ITEMS =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch branches
        const branchRes = await fetch('http://localhost:5000/api/branches');
        const branchResult = await branchRes.json();
        let branchData = [];
        if (branchResult.success && Array.isArray(branchResult.data)) {
          branchData = branchResult.data;
        } else if (Array.isArray(branchResult)) {
          branchData = branchResult;
        }
        setBranches(branchData);

        // Fetch categories
        const catRes = await fetch('http://localhost:5000/api/categories');
        const catData = await catRes.json();
        if (Array.isArray(catData)) {
          setCategories(catData);
        }

        // Fetch items with stock
        const itemRes = await fetch('http://localhost:5000/api/items');
        const itemData = await itemRes.json();
        if (Array.isArray(itemData)) {
          setItemsWithStock(itemData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, [])

  // ===== HANDLE NEW PO =====
  const generatePONumber = () => {
    const year = new Date().getFullYear()
    const existingIds = new Set(pos.map(p => p.id))
    const pattern = new RegExp(`^PO-${year}-\\d{3}$`)
    
    const takenNumbers = pos
      .map(p => {
        const m = p.id.match(new RegExp(`^PO-${year}-(\\d{3})$`))
        return m ? parseInt(m[1], 10) : null
      })
      .filter(n => n !== null)
    
    let seq = takenNumbers.length ? Math.max(...takenNumbers) + 1 : 1
    while (existingIds.has(`PO-${year}-${String(seq).padStart(3,'0')}`)) seq++
    
    return `PO-${year}-${String(seq).padStart(3,'0')}`
  }

  const handleNewPO = () => {
    const autoNumber = generatePONumber()
    // Get user's branch from localStorage
    const userBranchId = localStorage.getItem('branchId')
    let userBranchName = ''
    
    console.log('User Branch ID from localStorage:', userBranchId)
    console.log('Available branches:', branches)
    
    // Find the branch name from the branches list
    if (userBranchId && branches.length > 0) {
      const userBranch = branches.find(b => {
        const bId = String(b._id || b.id)
        const uId = String(userBranchId)
        console.log('Comparing:', { bId, uId, match: bId === uId })
        return bId === uId
      })
      console.log('Found user branch:', userBranch)
      userBranchName = userBranch ? (userBranch.name || userBranch.branchName || '') : ''
    }
    
    console.log('Final user branch name:', userBranchName)
    setPoForm(prev => ({ ...prev, poNumber: autoNumber, createdByBranch: userBranchName }))
    setSelectedBranchRow(null)
    setOpenCreate(true)
  }

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
  const updateLine = (key, val) => {
    setLine(prev => ({ ...prev, [key]: val }))
    if (key === 'item' && val) {
      const selected = itemsWithStock.find(item => item.name === val)
      setSelectedItemForCreate(selected || null)
    } else if (key === 'category') {
      setSelectedItemForCreate(null)
    }
  }

  // Handle branch row click - auto-fill branch and switch to Branch ordering
  const handleBranchSelect = (branchName, branchData) => {
    setSelectedBranchRow(branchName)
    setPoForm(prev => ({
      ...prev,
      orderBy: 'Branch',
      branch: branchName,
      supplierName: '',
      phone: ''
    }))
    setLine(prev => ({
      ...prev,
      branch: branchName
    }))
  }

  const addToCart = () => {
    setCartVisible(true)
    if (!line.item || !line.qty) return
    // Normalize numbers
    const qty = Number(line.qty)
    setCart(prev => [...prev, { 
      ...line, 
      qty,
      branch: poForm.orderBy === 'Branch' ? (line.branch || poForm.branch) : undefined
    }])
    setLine({ category: '', item: '', qty: '', branch: '' })
  }

  const editExistingCreateItem = (index) => {
    setCartVisible(true)
    const target = cart[index]
    if (!target) return
    // If there's a pending line edit not yet added, put it back into the cart first
    if (line.item && line.qty) {
      const pendingQty = Number(line.qty)
      setCart(prev => {
        const base = prev.filter((_, i) => i !== index)
        return [...base, { ...line, qty: pendingQty, branch: poForm.orderBy === 'Branch' ? (line.branch || poForm.branch) : undefined }]
      })
    } else {
      setCart(prev => prev.filter((_, i) => i !== index))
    }
    // Load selected target into inputs for editing
    setLine({ category: target.category || '', item: target.item, qty: target.qty, branch: target.branch || '' })
  }
  const removeCreateItem = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const updateEditLine = (key, val) => {
    setEditLine(prev => ({ ...prev, [key]: val }))
    if (key === 'item' && val) {
      const selected = itemsWithStock.find(item => item.name === val)
      setSelectedItemForCreate(selected || null)
    } else if (key === 'category') {
      setSelectedItemForCreate(null)
    }
  }

  const addToEditCart = () => {
    setEditCartVisible(true)
    if (!editLine.item || !editLine.qty) return
    const qty = Number(editLine.qty)
    setEditCart(prev => [...prev, { 
      ...editLine, 
      qty,
      branch: editForm.orderBy === 'Branch' ? (editLine.branch || editForm.branch) : undefined
    }])
    setEditLine({ category: '', item: '', qty: '', branch: '' })
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
    setEditLine({ category: target.category || '', item: target.item, qty: target.qty, branch: target.branch || '' })
  }
  const removeEditItem = (index) => {
    setEditCart(prev => prev.filter((_, i) => i !== index))
  }

  const submitPO = (e) => {
    e.preventDefault()
    // Use the auto-generated PO number from form
    const id = poForm.poNumber || generatePONumber()
    
    // Store items as simple format
    const items = cart.map(ci => `${ci.item} x ${ci.qty}`)
    let total = ''
    
    // Get logged-in user info
    const username = localStorage.getItem('username') || 'Admin User'
    
    const newPO = {
      id,
      status: 'Pending',
      supplier: poForm.orderBy === 'Supplier' ? (poForm.supplierName || '') : '',
      branch: poForm.orderBy === 'Branch' ? (poForm.branch || '') : '',
      orderDate: poForm.orderDate || '',
      expectedDate: poForm.expectedDate || '',
      total,
      createdBy: username,
      createdByBranch: poForm.createdByBranch || '',
      items,
      orderType: poForm.orderBy,
      orderDetails: {
        supplierName: poForm.supplierName,
        phone: poForm.phone,
        branch: poForm.branch
      }
    }
    setPos(prev => [newPO, ...prev])
    // Reset form and cart
    setSelectedBranchRow(null)
    setPoForm({ poNumber: '', orderBy: 'Supplier', supplierName: '', phone: '', branch: '', orderDate: '', expectedDate: '', createdByBranch: '' })
    setCart([])
    setCartVisible(false)
    setLine({ category: '', item: '', qty: '', branch: '' })
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
                              <div className="info-label">Created Branch</div>
                              <div className="info-val">{po.createdByBranch || po.branch}</div>
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
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#667eea' }}>Select Item</h4>
                <div className="form-layout-inventory">
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Category</label>
                    <select value={line.category} onChange={e => updateLine('category', e.target.value)} className="form-input-inventory">
                      <option value="">-- Select Category --</option>
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat.name || cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Item</label>
                    <select value={line.item} onChange={e => updateLine('item', e.target.value)} className="form-input-inventory">
                      <option value="">-- Select Item --</option>
                      {line.category && itemsWithStock
                        .filter(item => {
                          const itemCategory = item.category?.name || item.categoryName || item.category;
                          return itemCategory === line.category;
                        })
                        .map((item, idx) => (
                          <option key={idx} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {selectedItemForCreate && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '12px' }}>
                      <label className="form-label-inventory">Availability by Branch (Click to Select)</label>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                        <table className="po-detail-table" style={{ marginBottom: 0 }}>
                          <thead>
                            <tr>
                              <th>Branch Name</th>
                              <th>Available Quantity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {branches && branches.map((branch, idx) => {
                              const branchId = branch._id?.toString() || String(branch._id);
                              const branchStock = selectedItemForCreate.branchStocks?.find(s => {
                                const stockBranchId = s.branchId?.toString() || String(s.branchId);
                                return stockBranchId === branchId;
                              });
                              const branchName = branch.name || branch.branchName;
                              const quantity = branchStock ? branchStock.quantity : 0;
                              return (
                                <tr 
                                  key={idx} 
                                  onClick={() => handleBranchSelect(branchName, branch)}
                                  style={{ 
                                    cursor: 'pointer', 
                                    transition: 'background-color 0.2s',
                                    backgroundColor: selectedBranchRow === branchName ? '#667eea' : 'transparent',
                                    color: selectedBranchRow === branchName ? 'white' : 'inherit'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (selectedBranchRow !== branchName) {
                                      e.currentTarget.style.backgroundColor = '#f0f4ff'
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (selectedBranchRow !== branchName) {
                                      e.currentTarget.style.backgroundColor = 'transparent'
                                    }
                                  }}
                                  title={`Click to order from ${branchName}`}
                                >
                                  <td>{branchName}</td>
                                  <td>{quantity}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Quantity</label>
                    <input value={line.qty} onChange={e => updateLine('qty', e.target.value)} placeholder="Qty" type="number" min="1" step="1" className="form-input-inventory" />
                  </div>
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
                          <tr><th>Branch Name</th><th>Item Name</th><th>Quantity</th><th style={{width:'120px'}}>Actions</th></tr>
                        )}
                      </thead>
                      <tbody>
                        {cart.length === 0 ? (
                          poForm.orderBy === 'Supplier' ? (
                            <tr><td colSpan={3} style={{ color:'#6b7280' }}>No items added yet</td></tr>
                          ) : (
                            <tr><td colSpan={4} style={{ color:'#6b7280' }}>No items added yet</td></tr>
                          )
                        ) : (
                          cart.map((ci, i) => (
                            poForm.orderBy === 'Supplier' ? (
                              <tr key={i}><td>{ci.item}</td><td>{ci.qty}</td><td style={{display:'flex',gap:6}}>
                                <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => editExistingCreateItem(i)}>Edit</button>
                                <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => removeCreateItem(i)}>Remove</button>
                              </td></tr>
                            ) : (
                              <tr key={i}><td>{ci.item}</td><td>{ci.qty}</td><td style={{display:'flex',gap:6}}>
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

                <h4 style={{ margin: '24px 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#667eea' }}>Order Details</h4>
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
                  ) : null}
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Order Date</label>
                    <input type="date" value={poForm.orderDate} onChange={e => updateForm('orderDate', e.target.value)} className="form-input-inventory" />
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Expected Delivery Date</label>
                    <input type="date" value={poForm.expectedDate} onChange={e => updateForm('expectedDate', e.target.value)} className="form-input-inventory" />
                  </div>
                </div>
                <div className="modal-footer-inventory" style={{ justifyContent:'flex-end' }}>
                  <button type="button" className="modal-btn-inventory cancel" onClick={() => {
                    setSelectedBranchRow(null)
                    setOpenCreate(false)
                  }}>Cancel</button>
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
                {selected.orderType !== 'Branch' && selected.supplier && (
                  <div>
                    <span className="po-detail-label supplier">SUPPLIER</span>
                    <div>{selected.supplier}</div>
                  </div>
                )}
                <div>
                  <span className="po-detail-label order-date">ORDER DATE</span>
                  <div>{selected.orderDate}</div>
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
                  <span className="po-detail-label branch">CREATED BRANCH</span>
                  <div>{selected.createdByBranch}</div>
                </div>
                
              </div>
              <div className="po-detail-table-wrap">
                <table className="po-detail-table">
                  <thead>
                    <tr>
                      {selected.orderType === 'Branch' && <th>Selected Branch</th>}
                      <th>Item Name</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((it, i) => {
                      const parts = it.split(' x ')
                      return (
                        <tr key={i}>
                          {selected.orderType === 'Branch' && <td>{selected.branch}</td>}
                          <td>{parts[0]}</td>
                          <td>{parts[1] || ''}</td>
                        </tr>
                      )
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
                        orderBy: selected.orderType || 'Supplier',
                        supplierName: selected.supplier || '',
                        phone: selected.orderDetails?.phone || '',
                        branch: selected.branch || '',
                        orderDate: selected.orderDate || '',
                        expectedDate: selected.expectedDate || '',
                        createdByBranch: selected.createdByBranch || ''
                      })
                      const parsed = (selected.items || []).map(it => {
                        const parts = it.split(' x ')
                        return { item: parts[0] || it, qty: parts[1] ? Number(parts[1]) : '', branch: '' }
                      })
                      setEditCart(parsed)
                      // Ensure inline add/edit inputs start empty when opening Edit Order
                      setEditLine({ category: '', item: '', qty: '', branch: '' })
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
                  createdByBranch: editForm.createdByBranch || selected.createdByBranch,
                  items: updatedItems,
                  orderType: editForm.orderBy,
                  orderDetails: {
                    supplierName: editForm.supplierName,
                    phone: editForm.phone,
                    branch: editForm.branch
                  }
                }
                setPos(prev => prev.map(p => p.id === selected.id ? updated : p))
                setSelected(updated)
                setOpenEdit(false)
                setOpenView(true)
              }}>
                <div className="form-layout-inventory">
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Category</label>
                    <select value={editLine.category} onChange={e => updateEditLine('category', e.target.value)} className="form-input-inventory">
                      <option value="">-- Select Category --</option>
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat.name || cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Item</label>
                    <select value={editLine.item} onChange={e => updateEditLine('item', e.target.value)} className="form-input-inventory">
                      <option value="">-- Select Item --</option>
                      {editLine.category && itemsWithStock
                        .filter(item => {
                          const itemCategory = item.category?.name || item.categoryName || item.category;
                          return itemCategory === editLine.category;
                        })
                        .map((item, idx) => (
                          <option key={idx} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {selectedItemForCreate && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '12px' }}>
                      <label className="form-label-inventory">Availability by Branch (Click to Select)</label>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                        <table className="po-detail-table" style={{ marginBottom: 0 }}>
                          <thead>
                            <tr>
                              <th>Branch Name</th>
                              <th>Available Quantity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {branches && branches.map((branch, idx) => {
                              const branchId = branch._id?.toString() || String(branch._id);
                              const branchStock = selectedItemForCreate.branchStocks?.find(s => {
                                const stockBranchId = s.branchId?.toString() || String(s.branchId);
                                return stockBranchId === branchId;
                              });
                              const branchName = branch.name || branch.branchName;
                              const quantity = branchStock ? branchStock.quantity : 0;
                              return (
                                <tr 
                                  key={idx} 
                                  onClick={() => handleBranchSelect(branchName, branch)}
                                  style={{ 
                                    cursor: 'pointer', 
                                    transition: 'background-color 0.2s',
                                    backgroundColor: selectedBranchRow === branchName ? '#667eea' : 'transparent',
                                    color: selectedBranchRow === branchName ? 'white' : 'inherit'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (selectedBranchRow !== branchName) {
                                      e.currentTarget.style.backgroundColor = '#f0f4ff'
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (selectedBranchRow !== branchName) {
                                      e.currentTarget.style.backgroundColor = 'transparent'
                                    }
                                  }}
                                  title={`Click to order from ${branchName}`}
                                >
                                  <td>{branchName}</td>
                                  <td>{quantity}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

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
                        {editForm.orderBy === 'Supplier' ? (
                          <tr><th>Item Name</th><th>Quantity</th><th style={{width:'120px'}}>Actions</th></tr>
                        ) : (
                          <tr><th>Branch Name</th><th>Item Name</th><th>Quantity</th><th style={{width:'120px'}}>Actions</th></tr>
                        )}
                      </thead>
                      <tbody>
                        {editCart.length === 0 ? (
                          editForm.orderBy === 'Supplier' ? (
                            <tr><td colSpan={3} style={{ color:'#6b7280' }}>No items added yet</td></tr>
                          ) : (
                            <tr><td colSpan={4} style={{ color:'#6b7280' }}>No items added yet</td></tr>
                          )
                        ) : (
                          editCart.map((ci, i) => (
                            editForm.orderBy === 'Supplier' ? (
                              <tr key={i}><td>{ci.item}</td><td>{ci.qty}</td><td style={{display:'flex',gap:6}}>
                                <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => editExistingEditItem(i)}>Edit</button>
                                <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => removeEditItem(i)}>Remove</button>
                              </td></tr>
                            ) : (
                              <tr key={i}><td>{ci.branch || editForm.branch}</td><td>{ci.item}</td><td>{ci.qty}</td><td style={{display:'flex',gap:6}}>
                                <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => editExistingEditItem(i)}>Edit</button>
                                <button type="button" className="modal-btn-inventory cancel" style={{padding:'6px 10px'}} onClick={() => removeEditItem(i)}>Remove</button>
                              </td></tr>
                            )
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
              
              // Update the PO status to Cancelled and store deletion details
              const updated = { 
                ...selected, 
                status: 'Cancelled',
                deleted: {
                  by: cancelForm.deletedBy,
                  contact: cancelForm.contactNumber,
                  date: cancelForm.deletedDate,
                  branchName: cancelForm.branchName,
                  reason: cancelForm.reason
                }
              }
              
              // Update the PO list
              setPos(prev => prev.map(p => p.id === selected.id ? updated : p))
              
              // Update selected reference
              setSelected(updated)
              
              // Close the cancel modal
              setOpenCancel(false)
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