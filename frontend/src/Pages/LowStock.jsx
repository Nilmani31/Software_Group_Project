import React, { useState, useEffect } from "react";
import Sidebar from "../Components/Sidebar";
import Navbar from "../Components/Navbar";
import ChatAssistant from "../Components/ChatAssistant";
import ModernDropdown from "../Components/ModernDropdown";
import { getAuthHeaders } from "../utils/authHeaders";
import { Package, AlertTriangle, AlertOctagon, ClipboardList, X, Truck, Building2, ShoppingCart, Plus } from "lucide-react";

const LowStock = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  // Role check
  const roleId = localStorage.getItem('roleId') || '';
  const userRole = roleId.replace('ROLE_', '');
  const canEdit = ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER'].includes(userRole);

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
            category: item.category || 'N/A',
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

  const handleOrderClick = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
    setLoadingBranches(false);
    setBranches((item.availableBranches || item.branchStocks || []).map(branch => ({
      id: branch.branchObjectId || branch.branchId,
      name: branch.branchName,
      code: branch.branchCode,
      location: branch.location,
      quantity: branch.quantity || 0,
      status: branch.status
    })));
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
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="body-layout">
        <Sidebar />
        <div className="main-content">
          <div className="content-wrapper">
            <div className="low-stock-container">

              <div className="stats-cards">
                <div className="stat-card">
                  <div className="stat-icon"><Package size={20} /></div>
                  <div className="stat-content">
                    <h3>Low Stock Items</h3>
                    <p className="stat-number">{lowStockItems.length}</p>
                    <span className="stat-label">Below minimum</span>
                  </div>
                </div>
                <div className="stat-card critical">
                  <div className="stat-icon"><AlertTriangle size={20} /></div>
                  <div className="stat-content">
                    <h3>Critical Items</h3>
                    <p className="stat-number">{lowStockItems.filter(item => item.status === 'Critical').length}</p>
                    <span className="stat-label">Urgent attention</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon"><ClipboardList size={20} /></div>
                  <div className="stat-content">
                    <h3>Total Shortage</h3>
                    <p className="stat-number">{lowStockItems.reduce((sum, item) => sum + item.shortage, 0)}</p>
                    <span className="stat-label">Units needed</span>
                  </div>
                </div>
              </div>

              <div className="items-table">
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>Loading low stock items...</div>
                ) : lowStockItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>No low stock items found.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Current Stock</th>
                        <th>Minimum Stock</th>
                        <th>Shortage</th>
                        <th>Category</th>
                        <th>Branch Details</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((item) => (
                        <tr key={item.id} className={`status-${item.status.toLowerCase()}`}>
                          <td>
                            <span className="name">{item.name}</span>
                            <span className="sku">{item.sku}</span>
                            <span className={`badge ${item.status.toLowerCase()}`}>{item.status}</span>
                          </td>
                          <td>{item.currentStock} {item.unit}</td>
                          <td>{item.minimumStock} {item.unit}</td>
                          <td>{item.shortage} {item.unit}</td>
                          <td>{item.category}</td>
                          <td>
                            <div className="branch-stock-summary">
                              {(item.branchStocks || []).map(branch => (
                                <span key={branch.stockId || branch.branchId} className={`branch-stock-chip ${branch.status}`}>
                                  {branch.branchName}: {branch.quantity} {item.unit}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            {canEdit && (
                              <button
                                className="restock-btn"
                                onClick={() => handleOrderClick(item)}
                              >
                                Order Restock
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
                    <span className="sku-info-tag" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                      {selectedItem.shortage} {selectedItem.unit} Shortage
                    </span>
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
