import React, { useState, useEffect } from 'react'
import Navbar from '../Components/Navbar'
import Sidebar from '../Components/Sidebar'
import ChatAssistant from '../Components/ChatAssistant'
import ConfirmDialog from '../Components/ConfirmDialog'
import ModernDropdown from '../Components/ModernDropdown'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  FaTimes,
  FaPlus,
  FaEdit,
  FaTrash,
  FaBoxOpen,
  FaShoppingCart,
  FaBuilding,
  FaFileInvoice,
  FaTruck
} from 'react-icons/fa'
// Modal component replaced for Create PO to match Inventory design
import { getAuthHeaders } from '../utils/authHeaders'

// Format date to readable format (YYYY/MM/DD only, no time)
const formatDate = (dateString) => {
  if (!dateString) return '-'
  try {
    // Remove time portion if present (handle ISO format like "2026-02-26T00:00:00.000Z")
    const dateOnly = dateString.split('T')[0]

    // If it's YYYY-MM-DD format, convert to YYYY/MM/DD
    if (dateOnly.includes('-')) {
      return dateOnly.replace(/-/g, '/')
    }

    // If it's already YYYY/MM/DD format, return as-is
    if (dateOnly.includes('/')) {
      return dateOnly
    }

    // Fallback: parse as date object
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  } catch (e) {
    return dateString
  }
}

export default function PurchaseOrder() {
  // ===== MAIN STATE =====
  const roleId = localStorage.getItem('roleId') || '';
  const userRole = roleId.replace('ROLE_', '');
  let userPerms = [];
  try {
    userPerms = JSON.parse(localStorage.getItem('permissions') || '[]');
  } catch (e) {}
  const canEdit = userPerms.includes('ALL') || userPerms.includes('PURCHASE_ORDERS');

  const [pos, setPos] = useState([])
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState([])
  const [filterOrderBy, setFilterOrderBy] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterBranch, setFilterBranch] = useState([])
  const [filterReceiverBranch, setFilterReceiverBranch] = useState([])
  const [branches, setBranches] = useState([])
  const [userBranchName, setUserBranchName] = useState('')
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
  // eslint-disable-next-line no-unused-vars
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
    deletedDate: '',
    branchName: '',
    reason: ''
  })
  const [cancelErrors, setCancelErrors] = useState({})
  const [pendingCreate, setPendingCreate] = useState(false)
  const updateCancelForm = (key, val) => setCancelForm(prev => ({ ...prev, [key]: val }))

  const filtered = pos.filter(po => {
    const poNum = po.poNumber || po.id
    const matchesQuery = poNum.toLowerCase().includes(query.toLowerCase()) ||
      (po.supplier && po.supplier.toLowerCase().includes(query.toLowerCase()))

    const matchesStatus = !filterStatus || (Array.isArray(filterStatus)
      ? (filterStatus.length === 0 || filterStatus.includes(po.status))
      : (!filterStatus || po.status === filterStatus))

    const matchesOrderBy = !filterOrderBy || po.orderType === filterOrderBy
    const matchesSupplier = !filterSupplier || (po.supplier && po.supplier.toLowerCase().includes(filterSupplier.toLowerCase()))

    const matchesBranch = !filterBranch || (Array.isArray(filterBranch)
      ? (filterBranch.length === 0 || filterBranch.includes(po.branchName) || filterBranch.includes(po.branch))
      : (!filterBranch || po.branchName === filterBranch || po.branch === filterBranch))

    const matchesReceiverBranch = !filterReceiverBranch || (Array.isArray(filterReceiverBranch)
      ? (filterReceiverBranch.length === 0 || filterReceiverBranch.includes(po.createdByBranch) || filterReceiverBranch.includes(po.branch))
      : (!filterReceiverBranch || po.createdByBranch === filterReceiverBranch || po.branch === filterReceiverBranch))

    return matchesQuery && matchesStatus && matchesOrderBy && matchesSupplier && matchesBranch && matchesReceiverBranch
  })

  // ===== FETCH BRANCHES, CATEGORIES, AND ITEMS =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch branches
        const branchRes = await fetch('http://localhost:5005/api/branches', {
          headers: getAuthHeaders()
        });
        const branchResult = await branchRes.json();
        let branchData = [];
        if (branchResult.success && Array.isArray(branchResult.data)) {
          branchData = branchResult.data;
        } else if (Array.isArray(branchResult)) {
          branchData = branchResult;
        }
        setBranches(branchData);

        // Get user's branch name from localStorage branchId
        const userBranchId = localStorage.getItem('branchId');
        if (userBranchId && branchData.length > 0) {
          // Find the branch matching the user's branchId
          const userBranch = branchData.find(b => {
            // Try different possible ID field names
            return b._id === userBranchId ||
              String(b._id) === String(userBranchId) ||
              b.branchId === userBranchId ||
              String(b.branchId) === String(userBranchId) ||
              b.id === userBranchId ||
              String(b.id) === String(userBranchId);
          });

          if (userBranch) {
            const branchName = userBranch.name || userBranch.branchName || userBranch.branch_name || '';
            setUserBranchName(branchName);
          }
        }

        // Fetch categories
        const catRes = await fetch('http://localhost:5005/api/categories', {
          headers: getAuthHeaders()
        });
        const catData = await catRes.json();
        if (Array.isArray(catData)) {
          setCategories(catData);
        }

        // Fetch items with stock
        const itemRes = await fetch('http://localhost:5005/api/items', {
          headers: getAuthHeaders()
        });
        const itemData = await itemRes.json();
        if (Array.isArray(itemData)) {
          setItemsWithStock(itemData);
        }

        // Fetch purchase orders from backend
        const poRes = await fetch('http://localhost:5005/api/purchase-orders', {
          headers: getAuthHeaders()
        });
        const poData = await poRes.json();
        if (poData.success && Array.isArray(poData.data)) {
          setPos(poData.data);
        } else if (Array.isArray(poData)) {
          setPos(poData);
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
    const existingIds = new Set(pos.map(p => p.poNumber || p.id))
    const pattern = new RegExp(`^PO-${year}-\\d{3}$`)

    const takenNumbers = pos
      .map(p => {
        // Support both old 'id' and new 'poNumber' field names
        const poNum = p.poNumber || p.id
        const m = poNum.match(new RegExp(`^PO-${year}-(\\d{3})$`))
        return m ? parseInt(m[1], 10) : null
      })
      .filter(n => n !== null)

    let seq = takenNumbers.length ? Math.max(...takenNumbers) + 1 : 1
    while (existingIds.has(`PO-${year}-${String(seq).padStart(3, '0')}`)) seq++

    return `PO-${year}-${String(seq).padStart(3, '0')}`
  }

  const handleNewPO = () => {
    const autoNumber = generatePONumber()
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
      const selected = itemsWithStock.find(item => `${item.name} - ${item.unit}` === val)
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
      const selected = itemsWithStock.find(item => `${item.name} - ${item.unit}` === val)
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

  const submitPO = async (e) => {
    e.preventDefault()

    // Validate form is filled
    if (!poForm.orderBy) {
      alert('Please select Order By (Supplier or Branch)')
      return
    }
    if (!poForm.orderDate) {
      alert('Please select Order Date')
      return
    }
    if (cart.length === 0) {
      alert('Please add items to the cart')
      return
    }

    // Use the auto-generated PO number from form
    const poNumber = poForm.poNumber || generatePONumber()

    // Store items as simple format
    const items = cart.map(ci => `${ci.item} x ${ci.qty}`)
    let total = ''

    // Get logged-in user info
    const username = localStorage.getItem('username') || 'Admin User'
    const branchName = localStorage.getItem('branchName') || 'Colombo Main Branch'

    // Validate required fields
    if (!username) {
      alert('Error: User not logged in properly')
      return
    }
    if (!branchName) {
      alert('Error: User branch not found')
      return
    }

    const newPO = {
      poNumber,
      status: 'Pending',
      supplier: poForm.orderBy === 'Supplier' ? (poForm.supplierName || '') : '',
      branch: poForm.orderBy === 'Branch' ? (poForm.branch || '') : '',
      orderDate: poForm.orderDate || '',
      expectedDate: poForm.expectedDate || '',
      total,
      createdBy: username,
      createdByBranch: branchName,
      items,
      orderType: poForm.orderBy,
      orderDetails: {
        supplierName: poForm.supplierName,
        phone: poForm.phone,
        branch: poForm.branch
      }
    }

    console.log('Sending PO:', newPO)

    try {
      // Send PO to backend API
      const response = await fetch('http://localhost:5005/api/purchase-orders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newPO)
      })

      const result = await response.json()

      if (result.success) {
        setPos(prev => [newPO, ...prev])
        // Reset form and cart
        setSelectedBranchRow(null)
        setPoForm({ poNumber: '', orderBy: 'Supplier', supplierName: '', phone: '', branch: '', orderDate: '', expectedDate: '', createdByBranch: '' })
        setCart([])
        setCartVisible(false)
        setLine({ category: '', item: '', qty: '', branch: '' })
        setOpenCreate(false)
      } else {
        alert('Error creating purchase order: ' + (result.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating purchase order: ' + error.message)
    }
  }

  const requestSubmitPO = (e) => {
    e.preventDefault()
    if (!poForm.orderBy) {
      alert('Please select Order By (Supplier or Branch)')
      return
    }
    if (!poForm.orderDate) {
      alert('Please select Order Date')
      return
    }
    if (cart.length === 0) {
      alert('Please add items to the cart')
      return
    }
    setPendingCreate(true)
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

                    {/* Filter Section */}
                    <div className="po-filters">
                      <div className="filter-group">
                        <label className="filter-label">Order Status:</label>
                        <ModernDropdown
                          options={[
                            { value: 'Pending', label: 'Pending' },
                            { value: 'Received', label: 'Received' },
                            { value: 'Cancelled', label: 'Cancelled' }
                          ]}
                          value={filterStatus}
                          onChange={val => setFilterStatus(val)}
                          placeholder="All Statuses"
                          multiple={true}
                          minWidth="135px"
                        />
                      </div>

                      <div className="filter-group">
                        <label className="filter-label">Order By:</label>
                        <ModernDropdown
                          options={[
                            { value: 'Supplier', label: 'External Supplier' },
                            { value: 'Branch', label: 'Internal Branch Transfer' }
                          ]}
                          value={filterOrderBy}
                          onChange={val => {
                            setFilterOrderBy(val);
                            setFilterSupplier('');
                            setFilterBranch([]);
                          }}
                          placeholder="All Sources"
                          minWidth="145px"
                        />
                      </div>

                      {filterOrderBy === 'Supplier' && (
                        <div className="filter-group">
                          <label className="filter-label">Supplier:</label>
                          <input
                            type="text"
                            placeholder="Filter by supplier..."
                            value={filterSupplier}
                            onChange={e => setFilterSupplier(e.target.value)}
                            className="filter-input"
                          />
                        </div>
                      )}

                      {filterOrderBy === 'Branch' && (
                        <div className="filter-group">
                          <label className="filter-label">Branch:</label>
                          <ModernDropdown
                            options={branches.map(b => ({
                              value: b.name || b.branchName,
                              label: b.name || b.branchName,
                              subtitle: b.branchCode ? `Code: ${b.branchCode}` : undefined
                            }))}
                            value={filterBranch}
                            onChange={val => setFilterBranch(val)}
                            placeholder="All Branches"
                            multiple={true}
                            minWidth="145px"
                          />
                        </div>
                      )}

                      {filterOrderBy === 'Branch' && (
                        <div className="filter-group">
                          <label className="filter-label">Branch Received:</label>
                          <ModernDropdown
                            options={branches.map(b => ({
                              value: b.name || b.branchName,
                              label: b.name || b.branchName,
                              subtitle: b.branchCode ? `Code: ${b.branchCode}` : undefined
                            }))}
                            value={filterReceiverBranch}
                            onChange={val => setFilterReceiverBranch(val)}
                            placeholder="All Branches"
                            multiple={true}
                            minWidth="145px"
                          />
                        </div>
                      )}

                      <button
                        className="btn-clear-filters"
                        onClick={() => {
                          setFilterStatus([])
                          setFilterOrderBy('')
                          setFilterSupplier('')
                          setFilterBranch([])
                          setFilterReceiverBranch([])
                          setQuery('')
                        }}
                      >
                        Clear Filters
                      </button>

                      {canEdit && (
                        <button className="btn-new-po" onClick={handleNewPO}>
                          + New Purchase Order
                        </button>
                      )}
                    </div>
                  </div>
                </header>

                {/* PO Table */}
                <section className="po-main">
                  {filtered.length === 0 ? (
                    <div className="no-results">
                      <p>No purchase orders found matching "{query}"</p>
                    </div>
                  ) : (
                    <div className="list-wrap po-table-wrap">
                      <table className="inventory-table po-table" role="table" aria-label="Purchase orders list">
                        <thead>
                          <tr>
                            <th scope="col" style={{ width: '12%' }}>PO Number</th>
                            <th scope="col" style={{ width: '9%' }}>Order Type</th>
                            <th scope="col" style={{ width: '16%' }}>Supplier / Branch</th>
                            <th scope="col" style={{ width: '13%' }}>Created Branch</th>
                            <th scope="col" style={{ width: '10%' }}>Order Date</th>
                            <th scope="col" style={{ width: '10%' }}>Expected Date</th>
                            <th scope="col" style={{ width: '9%' }}>Created By</th>
                            <th scope="col" style={{ width: '6%', textAlign: 'center' }}>Items</th>
                            <th scope="col" style={{ width: '8%', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((po) => {
                            const orderType = po.orderType || 'Supplier';
                            const targetEntity = orderType === 'Supplier'
                              ? (po.supplier || po.orderDetails?.supplierName || 'N/A')
                              : (po.branch || po.orderDetails?.branch || 'N/A');
                            const phone = po.orderDetails?.phone;
                            const itemCount = Array.isArray(po.items)
                              ? po.items.length
                              : (po.items && typeof po.items === 'object' ? Object.keys(po.items).length : 0);

                            return (
                              <tr
                                key={po.poNumber || po.id}
                                className="inventory-row"
                                onClick={() => { setSelected(po); setOpenView(true); }}
                                title="Click to view details"
                                style={{ cursor: 'pointer' }}
                              >
                                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {po.poNumber || po.id}
                                </td>
                                <td>
                                  <span className={`role-pill ${orderType === 'Supplier' ? 'role-manager' : 'role-branch-manager'}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
                                    {orderType}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{targetEntity}</span>
                                    {phone && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📞 {phone}</span>}
                                  </div>
                                </td>
                                <td>{po.createdByBranch || po.branch || '-'}</td>
                                <td>{formatDate(po.orderDate)}</td>
                                <td>{formatDate(po.expectedDate)}</td>
                                <td>{po.createdBy || '-'}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '24px',
                                    height: '22px',
                                    padding: '0 6px',
                                    borderRadius: '9999px',
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border-default)',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)'
                                  }}>
                                    {itemCount}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`po-detail-badge ${po.status === 'Pending' ? 'pending' : (po.status === 'Cancelled' ? 'cancelled' : 'received')}`} style={{ fontSize: '11px', padding: '3px 10px' }}>
                                    {po.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
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
          <div className="modal-content-inventory add-item-modal create-po-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Create Purchase Order</h2>
                <p className="modal-subtitle-inventory">Configure procurement details, order source, and items</p>
              </div>
              <button
                type="button"
                className="modal-close-btn-inventory"
                onClick={() => {
                  setSelectedBranchRow(null)
                  setOpenCreate(false)
                }}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-body-inventory">
              <form id="create-po-form" onSubmit={requestSubmitPO} className="modal-form-inventory">
                {/* PO Number Reference Card */}
                <div className="sku-info-card">
                  <div className="sku-info-header">
                    <span className="sku-info-label">
                      <FaFileInvoice /> PO Reference Number
                    </span>
                    <span className="sku-info-tag">Auto-Generated</span>
                  </div>
                  <div className="sku-info-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span>{poForm.poNumber || 'Will be generated upon creation'}</span>
                    {userBranchName && (
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
                        Origin Branch: <strong style={{ color: 'var(--text-primary)' }}>{userBranchName}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Section 1: Order Information & Routing */}
                <div className="form-section-group">
                  <div className="form-section-title">
                    <FaTruck /> Order Information & Source
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Order Source / Type *</label>
                      <ModernDropdown
                        options={[
                          { value: 'Supplier', label: 'External Supplier' },
                          { value: 'Branch', label: 'Internal Branch Transfer' }
                        ]}
                        value={poForm.orderBy}
                        onChange={val => updateForm('orderBy', val)}
                        fullWidth
                        clearable={false}
                      />
                    </div>

                    <div className="form-group-inventory">
                      <label className="form-label-inventory">PO Number Override (Optional)</label>
                      <input
                        type="text"
                        value={poForm.poNumber}
                        onChange={e => updateForm('poNumber', e.target.value)}
                        placeholder="PO-2025-XXX"
                        className="form-input-inventory"
                      />
                    </div>
                  </div>

                  {poForm.orderBy === 'Supplier' ? (
                    <div className="form-grid-2">
                      <div className="form-group-inventory">
                        <label className="form-label-inventory">Supplier Name *</label>
                        <input
                          type="text"
                          value={poForm.supplierName}
                          onChange={e => updateForm('supplierName', e.target.value)}
                          placeholder="Enter supplier name"
                          className="form-input-inventory"
                          required={poForm.orderBy === 'Supplier'}
                        />
                      </div>
                      <div className="form-group-inventory">
                        <label className="form-label-inventory">Contact Phone</label>
                        <input
                          type="tel"
                          value={poForm.phone}
                          onChange={e => updateForm('phone', e.target.value)}
                          placeholder="e.g. 077 123 4567"
                          className="form-input-inventory"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Target Fulfilling Branch *</label>
                      <ModernDropdown
                        options={branches.map(b => ({
                          value: b.name || b.branchName,
                          label: b.name || b.branchName,
                          subtitle: b.branchCode ? `Branch Code: ${b.branchCode}` : undefined
                        }))}
                        value={poForm.branch}
                        onChange={val => updateForm('branch', val)}
                        placeholder="Choose Fulfilling Branch..."
                        fullWidth
                      />
                    </div>
                  )}

                  <div className="form-grid-2">
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Order Date *</label>
                      <DatePicker
                        selected={poForm.orderDate ? new Date(poForm.orderDate) : null}
                        onChange={(date) => {
                          const dateString = date ? date.toISOString().split('T')[0] : ''
                          updateForm('orderDate', dateString)
                        }}
                        minDate={new Date()}
                        dateFormat="yyyy/MM/dd"
                        className="form-input-inventory"
                        placeholderText="Select Order Date"
                        wrapperClassName="datepicker-wrapper"
                        required
                      />
                    </div>
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Expected Delivery Date</label>
                      <DatePicker
                        selected={poForm.expectedDate ? new Date(poForm.expectedDate) : null}
                        onChange={(date) => {
                          const dateString = date ? date.toISOString().split('T')[0] : ''
                          updateForm('expectedDate', dateString)
                        }}
                        minDate={poForm.orderDate ? new Date(poForm.orderDate) : new Date()}
                        dateFormat="yyyy/MM/dd"
                        className="form-input-inventory"
                        placeholderText="Select Expected Delivery Date"
                        wrapperClassName="datepicker-wrapper"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Add Items to Order */}
                <div className="form-section-group">
                  <div className="form-section-title">
                    <FaBoxOpen /> Add Items to Order
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Category</label>
                      <ModernDropdown
                        options={categories.map(cat => ({
                          value: cat.name || cat._id,
                          label: cat.name
                        }))}
                        value={line.category}
                        onChange={val => updateLine('category', val)}
                        placeholder="-- Select Category --"
                        fullWidth
                      />
                    </div>

                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Item</label>
                      <ModernDropdown
                        options={line.category ? itemsWithStock
                          .filter(item => {
                            const itemCategory = item.category?.name || item.categoryName || item.category;
                            return itemCategory === line.category;
                          })
                          .map(item => ({
                            value: `${item.name} - ${item.unit}`,
                            label: item.name,
                            subtitle: `Unit: ${item.unit}`
                          })) : []}
                        value={line.item}
                        onChange={val => updateLine('item', val)}
                        placeholder={line.category ? "-- Choose Item to Add --" : "First select a category above"}
                        disabled={!line.category}
                        fullWidth
                      />
                    </div>

                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Quantity</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          value={line.qty}
                          onChange={e => updateLine('qty', e.target.value)}
                          placeholder="Qty"
                          type="number"
                          min="1"
                          step="1"
                          className="form-input-inventory"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="modal-btn-inventory save"
                          onClick={addToCart}
                          disabled={!line.item || !line.qty}
                          style={{ whiteSpace: 'nowrap', padding: '0 14px' }}
                        >
                          <FaPlus /> Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Branch availability sub-table if ordering by Branch and an item is selected */}
                  {poForm.orderBy === 'Branch' && selectedItemForCreate && (
                    <div style={{
                      marginTop: '8px',
                      padding: '12px 14px',
                      background: 'var(--bg-subtle, #f8fafc)',
                      border: '1px solid var(--border-default, #e2e8f0)',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary, #475569)' }}>
                          Available Stock by Branch for: <strong style={{ color: '#2563eb' }}>{line.item}</strong>
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Click branch to route order</span>
                      </div>
                      <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}>
                        <table className="po-detail-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th>Branch Name</th>
                              <th style={{ width: '100px', textAlign: 'right' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {branches && branches.map((branch, idx) => {
                              const branchName = branch.name || branch.branchName;
                              const isSelected = selectedBranchRow === branchName || poForm.branch === branchName;
                              return (
                                <tr
                                  key={idx}
                                  onClick={() => handleBranchSelect(branchName, branch)}
                                  style={{
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                    color: isSelected ? '#1d4ed8' : 'inherit',
                                    fontWeight: isSelected ? 600 : 400
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                                  }}
                                >
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <FaBuilding style={{ fontSize: '12px', color: isSelected ? '#2563eb' : '#94a3b8' }} />
                                      <span>{branchName}</span>
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    {isSelected ? (
                                      <span className="badge-normal" style={{ background: '#dbeafe', color: '#1e40af' }}>Selected</span>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: '#64748b' }}>Choose</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Order Items Summary / Cart */}
                <div className="form-section-group">
                  <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaShoppingCart /> Order Items Summary
                    </span>
                    {cart.length > 0 && (
                      <span className="sku-info-tag">{cart.length} {cart.length === 1 ? 'item' : 'items'} added</span>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      background: 'var(--bg-subtle, #f8fafc)',
                      borderRadius: '8px',
                      border: '1.5px dashed var(--border-default, #cbd5e1)',
                      color: '#64748b'
                    }}>
                      <FaShoppingCart style={{ fontSize: '24px', marginBottom: '8px', color: '#94a3b8' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>No items in purchase order yet</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Select category, item and quantity above, then click "+ Add"</div>
                    </div>
                  ) : (
                    <div className="po-detail-table-wrap" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      <table className="po-detail-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            {poForm.orderBy === 'Branch' && <th>Source Branch</th>}
                            <th>Item Name</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Quantity</th>
                            <th style={{ width: '150px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((ci, i) => (
                            <tr key={i}>
                              {poForm.orderBy === 'Branch' && (
                                <td>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <FaBuilding style={{ fontSize: '11px', color: '#64748b' }} />
                                    {ci.branch || poForm.branch || '-'}
                                  </span>
                                </td>
                              )}
                              <td style={{ fontWeight: 500, color: 'var(--text-primary, #0f172a)' }}>{ci.item}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge-normal" style={{ fontSize: '12px', padding: '3px 10px' }}>
                                  {ci.qty}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="modal-btn-inventory edit"
                                    style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                                    onClick={() => editExistingCreateItem(i)}
                                    title="Edit quantity"
                                  >
                                    <FaEdit /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="modal-btn-inventory delete"
                                    style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                                    onClick={() => removeCreateItem(i)}
                                    title="Remove item"
                                  >
                                    <FaTrash /> Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer-inventory">
              <button
                type="button"
                className="modal-btn-inventory cancel"
                onClick={() => {
                  setSelectedBranchRow(null)
                  setOpenCreate(false)
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-po-form"
                className="modal-btn-inventory save"
                disabled={cart.length === 0}
              >
                <FaPlus /> Create Purchase Order
              </button>
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
              <button className="modal-close-btn-inventory" onClick={() => setOpenView(false)} title="Close"><FaTimes /></button>
            </div>
            <div className="modal-body-inventory">
              <div className="po-detail-number-row">
                <span className="po-detail-number">{selected.poNumber || selected.id}</span>
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
                  <div>{formatDate(selected.orderDate)}</div>
                </div>
                <div>
                  <span className="po-detail-label expected-date">EXPECTED DATE</span>
                  <div>{formatDate(selected.expectedDate)}</div>
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
                    {(Array.isArray(selected.items) ? selected.items : Object.values(selected.items || {})).map((it, i) => {
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
              <div className="modal-footer-inventory" style={{ justifyContent: 'space-between' }}>
                <div>
                  {selected.status === 'Pending' && canEdit && (
                    <button type="button" className="modal-btn-inventory delete" onClick={() => {
                      if (!selected) return
                      const today = new Date().toISOString().split('T')[0]
                      const username = localStorage.getItem('username') || ''
                      const branchName = userBranchName || localStorage.getItem('branchName') || 'Main Branch'
                      setCancelForm({
                        deletedBy: username,
                        deletedDate: today,
                        branchName: branchName,
                        reason: ''
                      })
                      setOpenView(false)
                      setOpenCancel(true)
                    }}>Cancel Order</button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selected.status === 'Pending' && canEdit && (
                    <button type="button" className="modal-btn-inventory edit" onClick={() => {
                      // Prepare edit form from selected and open edit modal
                      if (!selected) return
                      setEditForm({
                        poNumber: selected.poNumber || selected.id,
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
                  )}
                  <button type="button" className="modal-btn-inventory cancel" onClick={() => setOpenView(false)}>Close</button>
                </div>
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
              <button className="modal-close-btn-inventory" onClick={() => setOpenEdit(false)} title="Close"><FaTimes /></button>
            </div>
            <div className="modal-body-inventory">
              <div className="po-detail-number-row">
                <span className="po-detail-number">{editForm.poNumber || selected.id}</span>
                <span className={`po-detail-badge ${selected.status === 'Pending' ? 'pending' : (selected.status === 'Cancelled' ? 'cancelled' : 'received')}`}>{selected.status}</span>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
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
                setPos(prev => prev.map(p => (p.poNumber || p.id) === (selected.poNumber || selected.id) ? updated : p))
                setSelected(updated)
                setOpenEdit(false)
                setOpenView(true)
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Order Details</h4>
                <div className="form-layout-inventory">
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Order By</label>
                    <ModernDropdown
                      options={[
                        { value: 'Supplier', label: 'External Supplier' },
                        { value: 'Branch', label: 'Internal Branch Transfer' }
                      ]}
                      value={editForm.orderBy}
                      onChange={val => {
                        setEditForm(prev => {
                          if (val === 'Supplier') {
                            return { ...prev, orderBy: val, branch: '' }
                          } else {
                            return { ...prev, orderBy: val, supplierName: '', phone: '' }
                          }
                        })
                      }}
                      fullWidth
                      clearable={false}
                    />
                  </div>
                  {editForm.orderBy === 'Supplier' ? (
                    <>
                      <div className="form-group-inventory">
                        <label className="form-label-inventory">Supplier Name</label>
                        <input type="text" value={editForm.supplierName} onChange={e => setEditForm(prev => ({ ...prev, supplierName: e.target.value }))} placeholder="Enter Supplier" className="form-input-inventory" />
                      </div>
                      <div className="form-group-inventory">
                        <label className="form-label-inventory">Phone Number</label>
                        <input type="tel" value={editForm.phone} onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="07x xxx xxxx" className="form-input-inventory" />
                      </div>
                    </>
                  ) : (
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Branch</label>
                      <ModernDropdown
                        options={branches.map(b => ({
                          value: b.name || b.branchName,
                          label: b.name || b.branchName,
                          subtitle: b.branchCode ? `Branch Code: ${b.branchCode}` : undefined
                        }))}
                        value={editForm.branch}
                        onChange={val => setEditForm(prev => ({ ...prev, branch: val }))}
                        placeholder="-- Choose Branch --"
                        fullWidth
                      />
                    </div>
                  )}
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Order Date</label>
                    <DatePicker
                      selected={editForm.orderDate ? new Date(editForm.orderDate) : null}
                      onChange={(date) => {
                        const dateString = date ? date.toISOString().split('T')[0] : ''
                        setEditForm(prev => ({ ...prev, orderDate: dateString }))
                      }}
                      minDate={new Date()}
                      dateFormat="yyyy/MM/dd"
                      className="form-input-inventory"
                      placeholderText="Select Order Date"
                      wrapperClassName="datepicker-wrapper"
                    />
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Expected Delivery Date</label>
                    <DatePicker
                      selected={editForm.expectedDate ? new Date(editForm.expectedDate) : null}
                      onChange={(date) => {
                        const dateString = date ? date.toISOString().split('T')[0] : ''
                        setEditForm(prev => ({ ...prev, expectedDate: dateString }))
                      }}
                      minDate={editForm.orderDate ? new Date(editForm.orderDate) : new Date()}
                      dateFormat="yyyy/MM/dd"
                      className="form-input-inventory"
                      placeholderText="Select Expected Delivery Date"
                      wrapperClassName="datepicker-wrapper"
                    />
                  </div>
                </div>

                <h4 style={{ margin: '24px 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Edit Items</h4>
                <div className="form-layout-inventory">
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Category</label>
                    <ModernDropdown
                      value={editLine.category}
                      onChange={val => updateEditLine('category', val)}
                      placeholder="Select Category"
                      searchable={true}
                      options={[
                        { value: '', label: 'Select Category' },
                        ...categories.map(cat => ({
                          value: cat.name || cat._id,
                          label: cat.name
                        }))
                      ]}
                    />
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Item</label>
                    <ModernDropdown
                      value={editLine.item}
                      onChange={val => updateEditLine('item', val)}
                      placeholder={editLine.category ? 'Choose Item' : 'Select category first'}
                      searchable={true}
                      disabled={!editLine.category}
                      options={[
                        { value: '', label: editLine.category ? 'Choose Item' : 'Select category first' },
                        ...(editLine.category ? itemsWithStock
                          .filter(item => {
                            const itemCategory = item.category?.name || item.categoryName || item.category;
                            return itemCategory === editLine.category;
                          })
                          .map(item => ({
                            value: `${item.name} - ${item.unit}`,
                            label: `${item.name} (${item.unit})`
                          })) : [])
                      ]}
                    />
                  </div>

                  {selectedItemForCreate && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '12px' }}>
                      <label className="form-label-inventory">Availability by Branch (Click to Select)</label>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                        <table className="po-detail-table" style={{ marginBottom: 0 }}>
                          <thead>
                            <tr>
                              <th>Branch Name</th>
                            </tr>
                          </thead>
                          <tbody>
                            {branches && branches.map((branch, idx) => {
                              const branchName = branch.name || branch.branchName;
                              return (
                                <tr
                                  key={idx}
                                  onClick={() => handleBranchSelect(branchName, branch)}
                                  style={{
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    backgroundColor: selectedBranchRow === branchName ? '#2563eb' : 'transparent',
                                    color: selectedBranchRow === branchName ? 'white' : 'inherit'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (selectedBranchRow !== branchName) {
                                      e.currentTarget.style.backgroundColor = '#f1f5f9'
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
                          <tr><th>Item Name</th><th>Quantity</th><th style={{ width: '120px' }}>Actions</th></tr>
                        ) : (
                          <tr><th>Branch Name</th><th>Item Name</th><th>Quantity</th><th style={{ width: '120px' }}>Actions</th></tr>
                        )}
                      </thead>
                      <tbody>
                        {editCart.length === 0 ? (
                          editForm.orderBy === 'Supplier' ? (
                            <tr><td colSpan={3} style={{ color: '#6b7280' }}>No items added yet</td></tr>
                          ) : (
                            <tr><td colSpan={4} style={{ color: '#6b7280' }}>No items added yet</td></tr>
                          )
                        ) : (
                          editCart.map((ci, i) => (
                            editForm.orderBy === 'Supplier' ? (
                              <tr key={i}><td>{ci.item}</td><td>{ci.qty}</td><td style={{ display: 'flex', gap: 6 }}>
                                <button type="button" className="modal-btn-inventory cancel" style={{ padding: '6px 10px' }} onClick={() => editExistingEditItem(i)}>Edit</button>
                                <button type="button" className="modal-btn-inventory cancel" style={{ padding: '6px 10px' }} onClick={() => removeEditItem(i)}>Remove</button>
                              </td></tr>
                            ) : (
                              <tr key={i}><td>{ci.branch || editForm.branch}</td><td>{ci.item}</td><td>{ci.qty}</td><td style={{ display: 'flex', gap: 6 }}>
                                <button type="button" className="modal-btn-inventory cancel" style={{ padding: '6px 10px' }} onClick={() => editExistingEditItem(i)}>Edit</button>
                                <button type="button" className="modal-btn-inventory cancel" style={{ padding: '6px 10px' }} onClick={() => removeEditItem(i)}>Remove</button>
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
                    <button type="submit" className="modal-btn-inventory save">Save Changes</button>
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
                <p className="modal-subtitle-inventory">Confirm purchase order deletion</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={() => setOpenCancel(false)} title="Close"><FaTimes /></button>
            </div>
            <div className="modal-body-inventory">
              <div className="modal-id-section-inventory">
                <span className="modal-item-id-inventory">{selected.poNumber || selected.id}</span>
                <span className={`po-detail-badge ${selected.status === 'Pending' ? 'pending' : (selected.status === 'Cancelled' ? 'cancelled' : 'received')}`}>{selected.status}</span>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault()

                // Update the PO status to Cancelled and store deletion details
                const updated = {
                  ...selected,
                  status: 'Cancelled',
                  deleted: {
                    by: cancelForm.deletedBy,
                    branchName: cancelForm.branchName,
                    date: cancelForm.deletedDate,
                    reason: cancelForm.reason
                  }
                }
              
              try {
                // Send cancel request to backend API
                const response= await fetch(`http://localhost:5005/api/purchase-orders/${selected.poNumber}/cancel`, {
                method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
                  },
              body: JSON.stringify(updated.deleted)
                })

              const result = await response.json()

              if (result.success) {
                // Update the PO list
                setPos(prev => prev.map(p => (p.poNumber === selected.poNumber || p.id === selected.id) ? updated : p))
                  
                  // Update selected reference
                  setSelected(updated)

              alert('Purchase Order cancelled successfully')

              // Close the cancel modal
              setOpenCancel(false)
                } else {
                  alert('Error cancelling purchase order: ' + (result.message || 'Unknown error'))
                }
              } catch (error) {
                console.error('Error:', error)
                alert('Error cancelling purchase order: ' + error.message)
              }
            }} className="modal-form-inventory">
              <div className="form-layout-inventory">
                <div className="form-group-inventory">
                  <label className="form-label-inventory">Deleted By</label>
                  <input className="form-input-inventory" value={cancelForm.deletedBy} onChange={e => updateCancelForm('deletedBy', e.target.value)} placeholder="Type name here" aria-invalid={!!cancelErrors.deletedBy} />
                  {cancelErrors.deletedBy && <div className="field-error">{cancelErrors.deletedBy}</div>}
                </div>
                <div className="form-group-inventory">
                  <label className="form-label-inventory">Branch Name</label>
                  <input className="form-input-inventory" type="text" value={cancelForm.branchName} readOnly placeholder="Auto-filled" aria-invalid={!!cancelErrors.branchName} />
                  {cancelErrors.branchName && <div className="field-error">{cancelErrors.branchName}</div>}
                </div>
                <div className="form-group-inventory">
                  <label className="form-label-inventory">Deleted Date</label>
                  <input className="form-input-inventory" type="date" value={cancelForm.deletedDate} onChange={e => updateCancelForm('deletedDate', e.target.value)} aria-invalid={!!cancelErrors.deletedDate} />
                  {cancelErrors.deletedDate && <div className="field-error">{cancelErrors.deletedDate}</div>}
                </div>
              </div>
              <div className="form-group-inventory">
                <label className="form-label-inventory">Reason</label>
                <textarea className="form-input-inventory" rows="5" value={cancelForm.reason} onChange={e => updateCancelForm('reason', e.target.value)} placeholder="" aria-invalid={!!cancelErrors.reason} />
                {cancelErrors.reason && <div className="field-error">{cancelErrors.reason}</div>}
              </div>
              <div className="modal-footer-inventory">
                <button type="submit" className="modal-btn-inventory delete">Confirm Delete</button>
                <button type="button" className="modal-btn-inventory cancel" onClick={() => { setOpenCancel(false); setOpenView(true) }}>View Details</button>
                <button type="button" className="modal-btn-inventory cancel" onClick={() => setOpenCancel(false)}>Close</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}

      {/* Chat Assistant */}
      <ConfirmDialog
        open={pendingCreate}
        title="Create purchase order?"
        message="Are you sure you want to create this purchase order?"
        confirmLabel="Create"
        tone="success"
        onCancel={() => setPendingCreate(false)}
        onConfirm={async () => {
          setPendingCreate(false)
          await submitPO({ preventDefault: () => {} })
        }}
      />
      <ChatAssistant />
    </div>
  )
}
