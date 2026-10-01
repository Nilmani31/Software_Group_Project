import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../Components/Sidebar";
import Navbar from "../Components/Navbar";
import ChatAssistant from "../Components/ChatAssistant";
import ModernDropdown from "../Components/ModernDropdown";
import { getAuthHeaders } from "../utils/authHeaders";
import { 
  Package, AlertTriangle, ClipboardList, X, Truck, 
  Building2, ShoppingCart, Search, RotateCcw 
} from "lucide-react";

const LowStock = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Filter and search states
  const [allBranches, setAllBranches] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState([]);
  const [targetBranch, setTargetBranch] = useState(null);

  // Role & permission check
  const roleId = localStorage.getItem('roleId') || '';
  const userRole = roleId.replace('ROLE_', '');
  let userPerms = [];
  try {
    userPerms = JSON.parse(localStorage.getItem('permissions') || '[]');
  } catch (e) {}
  const canEdit = userPerms.includes('ALL') || userPerms.includes('LOW_STOCK') || userPerms.includes('INVENTORY');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [orderType, setOrderType] = useState("Branches");
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [orderQuantities, setOrderQuantities] = useState({});

  // Fetch low stock items from backend
  useEffect(() => {
    fetch('http://localhost:5005/api/items/low-stock', {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const transformedItems = data.map(item => ({
            id: item._id,
            sku: item.sku || item.itemId || item.barcode || 'N/A',
            name: item.name,
            currentStock: item.currentStock ?? item.quantity ?? 0,
            minimumStock: item.minStock || 0,
            shortage: item.shortage ?? Math.max(0, (item.minStock || 0) - (item.quantity || 0)),
            category: item.categoryName || item.category || 'N/A',
            unit: item.unit || 'units',
            unitPrice: item.unitPrice || 0,
            branchStocks: item.branchStocks || [],
            availableBranches: item.availableBranches || [],
            status: item.status === 'out' ? 'Critical' : 'Low'
          }));
          setLowStockItems(transformedItems);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching low stock items:', err);
        setLoading(false);
      });
  }, []);

  // Fetch branches list for filter
  useEffect(() => {
    fetch('http://localhost:5005/api/branches', {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data || []);
        setAllBranches(list);
      })
      .catch(err => console.error('Error fetching branches for filter:', err));
  }, []);

  // Fetch categories list for filter
  useEffect(() => {
    fetch('http://localhost:5005/api/categories', {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data || []);
        setAllCategories(list);
      })
      .catch(err => console.error('Error fetching categories for filter:', err));
  }, []);

  // Fetch supplier list from backend
  useEffect(() => {
    fetch('http://localhost:5005/api/suppliers')
      .then(res => res.json())
      .then(result => {
        if (result && result.success && Array.isArray(result.data)) {
          setSuppliers(result.data.map(supplier => ({
            id: supplier._id,
            name: supplier.name,
            contactPerson: supplier.contactPerson || '',
            phone: supplier.phone || '',
            email: supplier.email || ''
          })));
        } else if (Array.isArray(result)) {
          setSuppliers(result);
        }
        setLoadingSuppliers(false);
      })
      .catch(err => {
        console.error('Error fetching suppliers:', err);
        setLoadingSuppliers(false);
      });
  }, []);

  // Flatten items into low stock branch entries
  const lowStockRows = useMemo(() => {
    const rows = [];
    lowStockItems.forEach(item => {
      // Find branches where quantity is below minimum value
      const lowBranches = (item.branchStocks || []).filter(b => {
        const minVal = (b.minStock !== undefined && b.minStock !== null && b.minStock > 0) 
          ? b.minStock 
          : (item.minimumStock || 0);
        return (b.quantity || 0) < minVal || b.status === 'low' || b.status === 'out';
      });

      if (lowBranches.length > 0) {
        lowBranches.forEach(b => {
          const minStock = (b.minStock !== undefined && b.minStock !== null && b.minStock > 0)
            ? b.minStock
            : (item.minimumStock || 0);
          const currentStock = b.quantity ?? 0;
          const shortage = Math.max(0, minStock - currentStock);
          rows.push({
            id: `${item.id}_${b.branchId || b.branchObjectId || b.branchName}`,
            itemId: item.id,
            originalItem: item,
            name: item.name,
            sku: item.sku,
            category: item.category,
            branchName: b.branchName || 'Unknown Branch',
            branchId: b.branchId || b.branchObjectId,
            currentStock,
            minimumStock: minStock,
            shortage,
            unit: item.unit,
            unitPrice: item.unitPrice,
            status: currentStock === 0 ? 'Critical' : 'Low',
            branchStocks: item.branchStocks,
            availableBranches: item.availableBranches
          });
        });
      } else {
        // Fallback: item overall is low or out, but individual branches were not detailed
        rows.push({
          id: item.id,
          itemId: item.id,
          originalItem: item,
          name: item.name,
          sku: item.sku,
          category: item.category,
          branchName: 'All Branches / Central',
          branchId: 'all',
          currentStock: item.currentStock ?? 0,
          minimumStock: item.minimumStock || 0,
          shortage: item.shortage ?? Math.max(0, (item.minimumStock || 0) - (item.currentStock ?? 0)),
          unit: item.unit,
          unitPrice: item.unitPrice,
          status: item.status,
          branchStocks: item.branchStocks || [],
          availableBranches: item.availableBranches || []
        });
      }
    });
    return rows;
  }, [lowStockItems]);

  // Apply search, branch, and category filters
  const filteredRows = useMemo(() => {
    return lowStockRows.filter(row => {
      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = (row.name || '').toLowerCase().includes(term);
        const matchSku = (row.sku || '').toLowerCase().includes(term);
        const matchCategory = (row.category || '').toLowerCase().includes(term);
        const matchBranch = (row.branchName || '').toLowerCase().includes(term);
        if (!matchName && !matchSku && !matchCategory && !matchBranch) {
          return false;
        }
      }

      // Branch filter
      if (selectedBranchFilter.length > 0) {
        const matchesBranch = selectedBranchFilter.some(b => 
          (row.branchName || '').toLowerCase() === b.toLowerCase() ||
          row.branchName === 'All Branches / Central'
        );
        if (!matchesBranch) return false;
      }

      // Category filter
      if (selectedCategoryFilter.length > 0) {
        const matchesCat = selectedCategoryFilter.some(c =>
          (row.category || '').toLowerCase() === c.toLowerCase()
        );
        if (!matchesCat) return false;
      }

      return true;
    });
  }, [lowStockRows, searchTerm, selectedBranchFilter, selectedCategoryFilter]);

  const handleOrderClick = (item, destinationBranch = null) => {
    setSelectedItem(item);
    setTargetBranch(destinationBranch);
    setIsModalOpen(true);
    setLoadingBranches(false);
    setBranches((item.availableBranches || item.branchStocks || [])
      .filter(branch => !destinationBranch || branch.branchName !== destinationBranch)
      .map(branch => ({
        id: branch.branchObjectId || branch.branchId,
        name: branch.branchName,
        code: branch.branchCode,
        location: branch.location,
        quantity: branch.quantity || 0,
        status: branch.status
      }))
    );
    setSelectedBranches([]);
    setSelectedSuppliers([]);
    setOrderQuantities({});
  };

  const handleBranchToggle = (branchId) => {
    setSelectedBranches(prev =>
      prev.includes(branchId)
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleSupplierToggle = (supplierId) => {
    setSelectedSuppliers(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleQuantityChange = (id, quantity) => {
    setOrderQuantities(prev => ({
      ...prev,
      [id]: quantity
    }));
  };

  const handleOrderSubmit = () => {
    const orderData = {
      item: selectedItem,
      destinationBranch: targetBranch,
      orderType,
      selectedBranches: orderType === "Branches" ? selectedBranches : [],
      selectedSuppliers: orderType === "Supplier" ? selectedSuppliers : [],
      quantities: orderQuantities
    };
    console.log("Order submitted:", orderData);
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setTargetBranch(null);
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="body-layout">
        <Sidebar />
        <div className="main-content">
          <div className="content-wrapper">
            <div className="low-stock-container">

              {/* Stats Cards */}
              <div className="stats-cards">
                <div className="stat-card">
                  <div className="stat-icon"><Package size={20} /></div>
                  <div className="stat-content">
                    <h3>Low Stock Alerts</h3>
                    <p className="stat-number">{filteredRows.length}</p>
                    <span className="stat-label">Below branch minimum</span>
                  </div>
                </div>
                <div className="stat-card critical">
                  <div className="stat-icon"><AlertTriangle size={20} /></div>
                  <div className="stat-content">
                    <h3>Critical Items</h3>
                    <p className="stat-number">{filteredRows.filter(item => item.status === 'Critical').length}</p>
                    <span className="stat-label">Out of stock in branch</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><ClipboardList size={20} /></div>
                  <div className="stat-content">
                    <h3>Total Shortage</h3>
                    <p className="stat-number">{filteredRows.reduce((sum, item) => sum + item.shortage, 0)}</p>
                    <span className="stat-label">Units needed</span>
                  </div>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div style={{
                background: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-default, #e2e8f0)',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                {/* Search Bar on the Left */}
                <div style={{
                  position: 'relative',
                  flex: '1 1 240px',
                  maxWidth: '420px'
                }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8'
                    }}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by item, SKU, branch, category..."
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      fontSize: '13px',
                      borderRadius: '9px',
                      border: '1px solid var(--border-default, #cbd5e1)',
                      background: 'var(--bg-surface, #ffffff)',
                      color: 'var(--text-primary, #0f172a)',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filters Aligned to the Right */}
                <div style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}>
                  {/* Branch Filter Dropdown */}
                  <ModernDropdown
                    value={selectedBranchFilter}
                    onChange={setSelectedBranchFilter}
                    placeholder="All Branches"
                    multiple={true}
                    searchable={true}
                    options={allBranches.map(b => ({
                      value: b.branchName || b.name,
                      label: b.branchName || b.name
                    }))}
                  />

                  {/* Category Filter Dropdown */}
                  <ModernDropdown
                    value={selectedCategoryFilter}
                    onChange={setSelectedCategoryFilter}
                    placeholder="All Categories"
                    multiple={true}
                    searchable={true}
                    options={allCategories.map(c => ({
                      value: c.name || c,
                      label: c.name || c
                    }))}
                  />

                  {(searchTerm || selectedBranchFilter.length > 0 || selectedCategoryFilter.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedBranchFilter([]);
                        setSelectedCategoryFilter([]);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#64748b',
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <RotateCcw size={13} />
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Items Table View */}
              <div className="items-table">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>Loading low stock items...</div>
                ) : filteredRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted, #64748b)' }}>
                    No low stock items found matching your filters.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Item / SKU</th>
                        <th>Branch Name</th>
                        <th>Current Stock</th>
                        <th>Minimum Stock</th>
                        <th>Shortage</th>
                        <th>Category</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr key={row.id} className={`status-${row.status.toLowerCase()}`}>
                          <td>
                            <span className="name">{row.name}</span>
                            <span className="sku">{row.sku}</span>
                            <span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span>
                          </td>
                          <td>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: 600,
                              color: 'var(--text-primary, #0f172a)'
                            }}>
                              <Building2 size={15} style={{ color: '#2563eb', flexShrink: 0 }} />
                              <span>{row.branchName}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ 
                              fontWeight: 700, 
                              color: row.currentStock === 0 ? '#dc2626' : '#d97706' 
                            }}>
                              {row.currentStock} {row.unit}
                            </span>
                          </td>
                          <td>{row.minimumStock} {row.unit}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#dc2626' }}>
                              {row.shortage} {row.unit}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg-subtle, #f1f5f9)',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: 'var(--text-secondary, #475569)',
                              border: '1px solid var(--border-default, #e2e8f0)'
                            }}>
                              {row.category}
                            </span>
                          </td>
                          <td>
                            {canEdit && (
                              <button
                                className="restock-btn"
                                onClick={() => handleOrderClick(row.originalItem, row.branchName)}
                              >
                                <ShoppingCart size={13} style={{ marginRight: 4 }} /> Order Restock
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Restock Modal */}
      {isModalOpen && selectedItem && (
        <div className="modal-overlay-inventory" onClick={handleCloseModal}>
          <div className="modal-content-inventory add-item-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '740px', width: 'min(94vw, 740px)' }}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Order Stock Requisition</h2>
                <p className="modal-subtitle-inventory">Reorder depleted inventory from branch surplus or approved suppliers</p>
              </div>
              <button 
                type="button" 
                className="modal-close-btn-inventory" 
                onClick={handleCloseModal} 
                aria-label="Close modal"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-inventory">
              <div className="modal-form-inventory">
                {/* Item Details SKU Reference Card */}
                <div className="sku-info-card">
                  <div className="sku-info-header">
                    <span className="sku-info-label">
                      <Package size={14} style={{ marginRight: 6 }} /> Depleted Inventory SKU
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {targetBranch && targetBranch !== 'All Branches / Central' && (
                        <span className="sku-info-tag" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 size={12} /> {targetBranch}
                        </span>
                      )}
                      <span className="sku-info-tag" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                        {selectedItem.shortage} {selectedItem.unit} Shortage
                      </span>
                    </div>
                  </div>
                  <div className="sku-info-value" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span>{selectedItem.name} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>({selectedItem.sku})</span></span>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Current Stock: <strong style={{ color: '#dc2626' }}>{selectedItem.currentStock} {selectedItem.unit}</strong>
                    </span>
                  </div>
                </div>

                {/* Section 1: Order Routing Type */}
                <div className="form-section-group" style={{ marginTop: '12px' }}>
                  <div className="form-section-title">
                    <Truck size={14} style={{ marginRight: 6 }} /> Fulfillment Routing Source
                  </div>

                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Order Sourcing Strategy *</label>
                    <ModernDropdown
                      value={orderType}
                      onChange={(val) => setOrderType(val)}
                      placeholder="Select Strategy"
                      options={[
                        { value: "Branches", label: "Transfer from Internal Branch Surplus" },
                        { value: "Supplier", label: "Procure from External Supplier" }
                      ]}
                    />
                  </div>
                </div>

                {/* Section 2: Source Selection & Quantities */}
                <div className="form-section-group" style={{ marginTop: '14px' }}>
                  <div className="form-section-title">
                    {orderType === "Branches" ? (
                      <><Building2 size={14} style={{ marginRight: 6 }} /> Available Branch Inventory</>
                    ) : (
                      <><Truck size={14} style={{ marginRight: 6 }} /> Registered Suppliers</>
                    )}
                  </div>

                  {/* Branch Selection */}
                  {orderType === "Branches" && (
                    <div>
                      {loadingBranches ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading branch stocks...</div>
                      ) : branches.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-default)', borderRadius: '8px' }}>
                          No branch surplus stock available for this item.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                          {branches.filter(branch => branch.quantity > 0).map((branch) => (
                            <div 
                              key={branch.id} 
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: selectedBranches.includes(branch.id) ? '1.5px solid #3b82f6' : '1px solid var(--border-default)',
                                background: selectedBranches.includes(branch.id) ? '#eff6ff' : 'var(--bg-subtle, #ffffff)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                  type="checkbox"
                                  id={`branch-${branch.id}`}
                                  checked={selectedBranches.includes(branch.id)}
                                  onChange={() => handleBranchToggle(branch.id)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <div>
                                  <label htmlFor={`branch-${branch.id}`} style={{ fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    {branch.name}
                                  </label>
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                    Available: <strong style={{ color: '#059669' }}>{branch.quantity} {selectedItem.unit}</strong>
                                    {branch.location ? ` • ${branch.location}` : ''}
                                  </div>
                                </div>
                              </div>
                              {selectedBranches.includes(branch.id) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Qty:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={branch.quantity}
                                    placeholder="Qty"
                                    className="form-input-inventory"
                                    style={{ width: '80px', height: '32px', textAlign: 'center', fontWeight: 600 }}
                                    value={orderQuantities[branch.id] || ''}
                                    onChange={(e) => handleQuantityChange(branch.id, e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Supplier Selection */}
                  {orderType === "Supplier" && (
                    <div>
                      {loadingSuppliers ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading suppliers...</div>
                      ) : suppliers.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-default)', borderRadius: '8px' }}>
                          No active suppliers found in system.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                          {suppliers.map((supplier) => (
                            <div 
                              key={supplier.id} 
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                border: selectedSuppliers.includes(supplier.id) ? '1.5px solid #3b82f6' : '1px solid var(--border-default)',
                                background: selectedSuppliers.includes(supplier.id) ? '#eff6ff' : 'var(--bg-subtle, #ffffff)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                  type="checkbox"
                                  id={`supplier-${supplier.id}`}
                                  checked={selectedSuppliers.includes(supplier.id)}
                                  onChange={() => handleSupplierToggle(supplier.id)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <div>
                                  <label htmlFor={`supplier-${supplier.id}`} style={{ fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    {supplier.name}
                                  </label>
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                    {supplier.contactPerson ? `${supplier.contactPerson} • ` : ''}
                                    {supplier.phone || supplier.email || 'No contact details'}
                                  </div>
                                </div>
                              </div>
                              {selectedSuppliers.includes(supplier.id) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Qty:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="Qty"
                                    className="form-input-inventory"
                                    style={{ width: '80px', height: '32px', textAlign: 'center', fontWeight: 600 }}
                                    value={orderQuantities[supplier.id] || ''}
                                    onChange={(e) => handleQuantityChange(supplier.id, e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer-inventory">
              <button type="button" className="modal-btn-inventory cancel" onClick={handleCloseModal}>
                Cancel
              </button>
              <button type="button" className="modal-btn-inventory save" onClick={handleOrderSubmit}>
                <ShoppingCart size={14} style={{ marginRight: 4 }} /> Submit Restock Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Assistant Component */}
      <ChatAssistant />
    </div>
  );
};

export default LowStock;
