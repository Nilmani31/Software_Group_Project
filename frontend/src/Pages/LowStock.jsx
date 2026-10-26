import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../Components/Sidebar";
import Navbar from "../Components/Navbar";
import ChatAssistant from "../Components/ChatAssistant";
import ModernDropdown from "../Components/ModernDropdown";
import { getAuthHeaders } from "../utils/authHeaders";
import { 
  Package, AlertTriangle, ClipboardList, X, Truck, 
  Building2, ShoppingCart, Search, RotateCcw, CheckCircle
} from "lucide-react";

const LowStock = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Direct supplier details for order (no DB table storage needed)
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierPerson, setSupplierPerson] = useState("");
  const [supplierQuantity, setSupplierQuantity] = useState("");

  // Filter and search states
  const [allBranches, setAllBranches] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState([]);
  const [targetBranch, setTargetBranch] = useState(null);

  // Role check
  const roleId = localStorage.getItem('roleId') || '';
  const userRole = roleId.replace('ROLE_', '');
  const canEdit = ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER'].includes(userRole);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [orderType, setOrderType] = useState("Branches");
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [orderQuantities, setOrderQuantities] = useState({});
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
    setOrderError("");
    setSupplierName("");
    setSupplierPhone("");
    setSupplierPerson("");
    setSupplierQuantity(item.shortage || 1);
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
    setOrderQuantities({});
  };

  const handleBranchToggle = (branchId) => {
    setSelectedBranches(prev => {
      const exists = prev.includes(branchId);
      if (exists) {
        return prev.filter(id => id !== branchId);
      } else {
        setOrderQuantities(q => ({
          ...q,
          [branchId]: q[branchId] || selectedItem?.shortage || 1
        }));
        return [...prev, branchId];
      }
    });
  };

  const handleQuantityChange = (id, quantity) => {
    setOrderQuantities(prev => ({
      ...prev,
      [id]: quantity
    }));
  };

  const handleOrderSubmit = async () => {
    setOrderError("");
    if (!selectedItem) return;

    if (orderType === "Branches" && selectedBranches.length === 0) {
      setOrderError("Please select at least one branch to request a stock transfer.");
      return;
    }

    setIsSubmittingOrder(true);

    const destinationBranch = targetBranch && targetBranch !== 'All Branches / Central'
      ? targetBranch
      : (localStorage.getItem('branchName') || 'Colombo Main Branch');
    const username = localStorage.getItem('username') || 'Admin User';

    try {
      const ordersToCreate = [];

      if (orderType === "Supplier") {
        const supName = supplierName.trim();
        if (!supName) {
          setOrderError("Please enter the supplier name.");
          setIsSubmittingOrder(false);
          return;
        }
        const qty = parseInt(supplierQuantity || selectedItem.shortage || 1, 10);
        if (isNaN(qty) || qty <= 0) {
          setOrderError("Please enter a valid reorder quantity.");
          setIsSubmittingOrder(false);
          return;
        }

        const totalStr = selectedItem.unitPrice ? `Rs ${(selectedItem.unitPrice * qty).toLocaleString()}` : '';

        ordersToCreate.push({
          orderType: 'Supplier',
          supplier: supName,
          branch: '',
          orderDate: new Date().toISOString(),
          expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          total: totalStr,
          createdBy: username,
          createdByBranch: destinationBranch,
          items: [`${selectedItem.name} x ${qty} ${selectedItem.unit || ''}`.trim()],
          orderDetails: {
            supplierName: supName,
            phone: supplierPhone.trim(),
            contactPerson: supplierPerson.trim(),
            branch: destinationBranch
          }
        });
      } else {
        for (const brId of selectedBranches) {
          const br = branches.find(b => b.id === brId);
          const qty = parseInt(orderQuantities[brId] || selectedItem.shortage || 1, 10);

          ordersToCreate.push({
            orderType: 'Branch',
            supplier: '',
            branch: br?.name || '',
            orderDate: new Date().toISOString(),
            expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            total: '',
            createdBy: username,
            createdByBranch: destinationBranch,
            items: [`${selectedItem.name} x ${qty} ${selectedItem.unit || ''}`.trim()],
            orderDetails: {
              branch: br?.name || ''
            }
          });
        }
      }

      const responses = await Promise.all(
        ordersToCreate.map(poPayload =>
          fetch('http://localhost:5005/api/purchase-orders', {
            method: 'POST',
            headers: {
              ...getAuthHeaders(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(poPayload)
          }).then(async r => {
            const data = await r.json();
            if (!r.ok || !data.success) {
              throw new Error(data.message || 'Failed to create PO');
            }
            return data;
          })
        )
      );

      const poNumbers = responses.map(r => r.data?.poNumber).filter(Boolean);
      const poMsg = poNumbers.length > 0 ? ` (${poNumbers.join(', ')})` : '';

      setToast({
        type: 'success',
        text: `Successfully created ${ordersToCreate.length} Purchase Order(s)${poMsg} for ${selectedItem.name}!`
      });

      setIsModalOpen(false);
      setSelectedItem(null);
      setSelectedBranches([]);
      setOrderQuantities({});
      setTargetBranch(null);
      setSupplierName("");
      setSupplierPhone("");
      setSupplierPerson("");
      setSupplierQuantity("");
    } catch (err) {
      console.error("Order Restock Error:", err);
      setOrderError(err.message || "Failed to submit restock order. Please try again.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setTargetBranch(null);
    setOrderError("");
    setSupplierName("");
    setSupplierPhone("");
    setSupplierPerson("");
    setSupplierQuantity("");
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="body-layout">
        <Sidebar />
        <div className="main-content">
          <div className="content-wrapper">
            <div className="low-stock-container">

              {/* In-app Toast Banner */}
              {toast && (
                <div style={{
                  padding: '12px 18px',
                  marginBottom: '16px',
                  borderRadius: '8px',
                  background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: toast.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                  color: toast.type === 'success' ? '#065f46' : '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  animation: 'fadeIn 0.2s ease-in'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {toast.type === 'success' ? <CheckCircle size={18} color="#059669" /> : <AlertTriangle size={18} color="#dc2626" />}
                    <span>{toast.text}</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setToast(null)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

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
                {orderError && (
                  <div style={{
                    background: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertTriangle size={16} />
                    <span>{orderError}</span>
                  </div>
                )}

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
                      <><Truck size={14} style={{ marginRight: 6 }} /> Supplier Order Details</>
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

                  {/* Supplier Form - Direct details input (no DB table storage needed) */}
                  {orderType === "Supplier" && (
                    <div style={{
                      background: 'var(--bg-subtle, #f8fafc)',
                      border: '1px solid var(--border-default, #e2e8f0)',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '2 1 200px' }}>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                            Supplier / Vendor Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Monin Lanka / Ceylon Coffee Roasters / Dilmah"
                            className="form-input-inventory"
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            style={{ width: '100%', height: '38px', fontSize: '13px' }}
                            autoFocus
                          />
                        </div>
                        <div style={{ flex: '1 1 120px' }}>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
                            Reorder Qty ({selectedItem.unit}) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder={selectedItem.shortage || "1"}
                            className="form-input-inventory"
                            value={supplierQuantity}
                            onChange={(e) => setSupplierQuantity(e.target.value)}
                            style={{ width: '100%', height: '38px', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 150px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            Contact Person (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Mr. Kasun / Sales Rep"
                            className="form-input-inventory"
                            value={supplierPerson}
                            onChange={(e) => setSupplierPerson(e.target.value)}
                            style={{ width: '100%', height: '34px', fontSize: '12.5px' }}
                          />
                        </div>
                        <div style={{ flex: '1 1 150px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            Contact Phone / Email (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 077 123 4567"
                            className="form-input-inventory"
                            value={supplierPhone}
                            onChange={(e) => setSupplierPhone(e.target.value)}
                            style={{ width: '100%', height: '34px', fontSize: '12.5px' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer-inventory">
              <button 
                type="button" 
                className="modal-btn-inventory cancel" 
                onClick={handleCloseModal}
                disabled={isSubmittingOrder}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="modal-btn-inventory save" 
                onClick={handleOrderSubmit}
                disabled={isSubmittingOrder}
                style={{ opacity: isSubmittingOrder ? 0.7 : 1, cursor: isSubmittingOrder ? 'not-allowed' : 'pointer' }}
              >
                <ShoppingCart size={14} style={{ marginRight: 4 }} />
                {isSubmittingOrder ? 'Submitting Order...' : 'Submit Restock Order'}
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
