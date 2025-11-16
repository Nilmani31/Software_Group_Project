import React, { useState } from "react";
import Sidebar from "../Components/Sidebar";
import Navbar from "../Components/Navbar";
import ChatAssistant from "../Components/ChatAssistant";
import "./LowStock.css";

const LowStock = () => {
  const [lowStockItems] = useState([
    {
      id: 1,
      sku: "RAW-SYR-001",
      name: "Sugar Syrup",
      currentStock: 0,
      minimumStock: 15,
      shortage: 15,
      category: "Raw Materials",
      status: "Critical"
    },
    {
      id: 2,
      sku: "GLAS-WIN-001",
      name: "Wine Glasses",
      currentStock: 12,
      minimumStock: 24,
      shortage: 12,
      category: "Glassware",
      status: "Low"
    }
  ]);

  const [branches] = useState([
    { id: 1, name: "Galle", quantity: 10 },
    { id: 2, name: "Kandy", quantity: 5 },
    { id: 3, name: "Colombo", quantity: 5 }
  ]);

  const [suppliers] = useState([
    { id: 1, name: "ABC Supplies", contact: "0712345678" },
    { id: 2, name: "XYZ Traders", contact: "0787654321" }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [orderType, setOrderType] = useState("Branches");
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [orderQuantities, setOrderQuantities] = useState({});

  const handleOrderClick = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
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
                  <div className="stat-icon">📦</div>
                  <div className="stat-content">
                    <h3>Low Stock Items</h3>
                    <p className="stat-number">6</p>
                    <span className="stat-label">Below minimum</span>
                  </div>
                </div>
                <div className="stat-card critical">
                  <div className="stat-icon">⚠️</div>
                  <div className="stat-content">
                    <h3>Critical Items</h3>
                    <p className="stat-number">1</p>
                    <span className="stat-label">Urgent attention</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📋</div>
                  <div className="stat-content">
                    <h3>Total Shortage</h3>
                    <p className="stat-number">36</p>
                    <span className="stat-label">Units needed</span>
                  </div>
                </div>
              </div>

              <div className="items-table">
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Current Stock</th>
                      <th>Minimum Stock</th>
                      <th>Shortage</th>
                      <th>Category</th>
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
                        <td>{item.currentStock} liters</td>
                        <td>{item.minimumStock} liters</td>
                        <td>{item.shortage} liters</td>
                        <td>{item.category}</td>
                        <td>
                          <button 
                            className="restock-btn"
                            onClick={() => handleOrderClick(item)}
                          >
                            Order Restock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Restock Modal */}
      {isModalOpen && selectedItem && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Order Stock</h2>
                <p className="modal-subtitle">Stock Available Branches or Supplier Details</p>
              </div>
              <button className="modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            <div className="modal-body">
              {/* Item Details */}
              <div className="item-details">
                <div className="detail-row">
                  <span className="detail-label">SKU:</span>
                  <span className="detail-value">{selectedItem.sku}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Item:</span>
                  <span className="detail-value">{selectedItem.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Current Stock:</span>
                  <span className="detail-value">{selectedItem.currentStock} liters</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Shortage:</span>
                  <span className="detail-value shortage">{selectedItem.shortage} liters</span>
                </div>
              </div>

              <div className="form-divider"></div>

              {/* Order Type */}
              <div className="form-group">
                <label className="form-label">Order Type</label>
                <select 
                  className="form-select"
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                >
                  <option value="Branches">From Branches</option>
                  <option value="Supplier">From Supplier</option>
                </select>
              </div>

              {/* Branch Selection */}
              {orderType === "Branches" && (
                <div className="form-group">
                  <label className="form-label">Select Branch</label>
                  <div className="selection-list">
                    {branches.map((branch) => (
                      <div key={branch.id} className="selection-item">
                        <div className="selection-checkbox">
                          <input
                            type="checkbox"
                            id={`branch-${branch.id}`}
                            checked={selectedBranches.includes(branch.id)}
                            onChange={() => handleBranchToggle(branch.id)}
                            className="checkbox-input"
                          />
                        </div>
                        <div className="selection-info">
                          <label htmlFor={`branch-${branch.id}`} className="selection-name">
                            {branch.name}
                          </label>
                          <span className="selection-details">Available: {branch.quantity} units</span>
                        </div>
                        {selectedBranches.includes(branch.id) && (
                          <div className="quantity-input-group">
                            <input
                              type="number"
                              min="0"
                              max={branch.quantity}
                              placeholder="Qty"
                              className="quantity-input"
                              value={orderQuantities[branch.id] || ''}
                              onChange={(e) => handleQuantityChange(branch.id, e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplier Selection */}
              {orderType === "Supplier" && (
                <div className="form-group">
                  <label className="form-label">Select Supplier</label>
                  <div className="selection-list">
                    {suppliers.map((supplier) => (
                      <div key={supplier.id} className="selection-item">
                        <div className="selection-checkbox">
                          <input
                            type="checkbox"
                            id={`supplier-${supplier.id}`}
                            checked={selectedSuppliers.includes(supplier.id)}
                            onChange={() => handleSupplierToggle(supplier.id)}
                            className="checkbox-input"
                          />
                        </div>
                        <div className="selection-info">
                          <label htmlFor={`supplier-${supplier.id}`} className="selection-name">
                            {supplier.name}
                          </label>
                          <span className="selection-details">Contact: {supplier.contact}</span>
                        </div>
                        {selectedSuppliers.includes(supplier.id) && (
                          <div className="quantity-input-group">
                            <input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              className="quantity-input"
                              value={orderQuantities[supplier.id] || ''}
                              onChange={(e) => handleQuantityChange(supplier.id, e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseModal}>
                Cancel
              </button>
              <button className="btn-order" onClick={handleOrderSubmit}>
                Order
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