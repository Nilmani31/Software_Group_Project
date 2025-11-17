import React, { useState, useMemo } from 'react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import ChatAssistant from '../Components/ChatAssistant';
import './Inventory.css';
import { FaTimes, FaEdit, FaTrash } from 'react-icons/fa';

const sampleItems = [
  { id: 1, name: 'Flour', qty: 20, status: 'normal', category: 'Raw Materials', unit: 'kg', minStock: 5, maxStock: 50 },
  { id: 2, name: 'Sugar', qty: 5, status: 'low', category: 'Raw Materials', unit: 'kg', minStock: 10, maxStock: 100 },
  { id: 3, name: 'Vanilla', qty: 0, status: 'out', category: 'Raw Materials', unit: 'ltr', minStock: 2, maxStock: 20 },
];

// Helper function to generate SKU
const generateSKU = () => {
  return 'SKU-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Helper function to get status class
const getStatusClass = (status) => {
  switch(status) {
    case 'normal':
      return 'badge-normal';
    case 'low':
      return 'badge-low';
    case 'out':
      return 'badge-out';
    default:
      return 'badge-normal';
  }
};

const Inventory = () => {
  const [items, setItems] = useState(sampleItems);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [branchFilter, setBranchFilter] = useState('All Branch');
  const [showModal, setShowModal] = useState(false);
  const [showFindModal, setShowFindModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [findImagePreview, setFindImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    unit: '',
    sku: '',
    minStock: '',
    maxStock: '',
    image: null
  });
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    itemName: '',
    category: '',
    unit: '',
    sku: 'Auto create',
    minStock: '',
    maxStock: '',
    image: null
  });
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [showChatAssistant, setShowChatAssistant] = useState(false);

  const categories = useMemo(() => ['All Categories', ...Array.from(new Set(items.map(i => i.category)))], [items]);
  const branches = ['All Branch', 'Colombo', 'Kandy'];

  const filtered = items.filter(item => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'All Categories' || item.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  const handleOpenModal = () => {
    setShowModal(true);
    setFormData(prev => ({
      ...prev,
      sku: generateSKU()
    }));
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setImagePreview(null);
    setFormData({
      itemName: '',
      category: '',
      unit: '',
      sku: '',
      minStock: '',
      maxStock: '',
      image: null
    });
  };

  const handleOpenFindModal = () => {
    setShowFindModal(true);
  };

  const handleCloseFindModal = () => {
    setShowFindModal(false);
    setFindImagePreview(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      setFormData(prev => ({ ...prev, image: file }));
    }
  };

  const handleFindImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setFindImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSpinner = (field, direction) => {
    setFormData(prev => ({
      ...prev,
      [field]: String(Math.max(0, parseInt(prev[field] || 0) + (direction === 'up' ? 1 : -1)))
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.itemName || !formData.category || !formData.unit) {
      alert('Please fill required fields');
      return;
    }
    console.log('Form submitted:', formData);
    handleCloseModal();
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowItemDetailModal(true);
  };

  const handleCloseItemDetailModal = () => {
    setShowItemDetailModal(false);
    setSelectedItem(null);
  };

  const handleEditItem = () => {
    if (selectedItem) {
      setEditFormData({
        itemName: selectedItem.name,
        category: selectedItem.category,
        unit: selectedItem.unit,
        sku: 'Auto create',
        minStock: selectedItem.minStock || '',
        maxStock: selectedItem.maxStock || '',
        image: null
      });
      setEditImagePreview(null);
      setShowItemDetailModal(false);
      setShowEditItemModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditItemModal(false);
    setEditImagePreview(null);
    setEditFormData({
      itemName: '',
      category: '',
      unit: '',
      sku: 'Auto create',
      minStock: '',
      maxStock: '',
      image: null
    });
  };

  const handleDeleteItem = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedItem.name}?`)) {
      console.log('Delete item:', selectedItem);
      handleCloseItemDetailModal();
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setEditImagePreview(reader.result);
      reader.readAsDataURL(file);
      setEditFormData(prev => ({ ...prev, image: file }));
    }
  };

  const handleEditSpinner = (field, direction) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: String(Math.max(0, parseInt(prev[field] || 0) + (direction === 'up' ? 1 : -1)))
    }));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    console.log('Edit form submitted:', editFormData);
    alert('Item updated successfully!');
    handleCloseEditModal();
  };

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="inventory-container">
            <div className="inventory-layout">
              <main className="inventory-content">
                <header className="inventory-header">
                  <div className="inventory-top-row">
                    <div className="inventory-search">
                      <label htmlFor="inventory-search-input" className="sr-only">Search inventory</label>
                      <div className="search-field">
                        <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.49 21.49 20 15.5 14zM4 9.5C4 6.46 6.46 4 9.5 4S15 6.46 15 9.5 12.54 15 9.5 15 4 12.54 4 9.5z"/>
                        </svg>
                        <input
                          id="inventory-search-input"
                          type="search"
                          placeholder="Search by name or category...."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="inventory-actions">
                      <button className="btn btn-find" onClick={handleOpenFindModal}>Find item by image</button>
                      <button className="btn btn-add" onClick={handleOpenModal}>+ Add new Item</button>
                    </div>
                  </div>

                  <div className="inventory-filters-row">
                    <div className="filter">
                      <label>Categories</label>
                      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="filter">
                      <label>Branch</label>
                      <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                        {branches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                </header>

                <div className="inventory-main">
                  {filtered.length === 0 ? (
                    <div className="no-results">No items found.</div>
                  ) : (
                    <div className="list-wrap">
                      <table className="inventory-table" role="table" aria-label="Inventory list">
                        <thead>
                          <tr>
                            <th scope="col" style={{ width: '25%' }}>Name</th>
                            <th scope="col" style={{ width: '20%' }}>Category</th>
                            <th scope="col" style={{ width: '15%', textAlign: 'center' }}>Quantity</th>
                            <th scope="col" style={{ width: '15%', textAlign: 'center' }}>Unit</th>
                            <th scope="col" style={{ width: '25%', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(item => (
                            <tr 
                              key={item.id} 
                              className="inventory-row"
                              onClick={() => handleRowClick(item)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td style={{ width: '25%', paddingLeft: '16px' }}>{item.name}</td>
                              <td style={{ width: '20%' }}>{item.category}</td>
                              <td style={{ width: '15%', textAlign: 'center' }}>{item.qty}</td>
                              <td style={{ width: '15%', textAlign: 'center' }}>{item.unit || '-'}</td>
                              <td style={{ width: '25%', textAlign: 'center' }}>
                                <span className={`badge ${getStatusClass(item.status)}`}>
                                  {item.status === 'normal' ? '✅ Normal' : item.status === 'low' ? '⚠️ Low' : '❌ Out'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </main>
      </div>

      {/* Add Item Modal */}
      {showModal && (
        <div className="modal-overlay-inventory" onClick={handleCloseModal}>
          <div className="modal-content-inventory" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Add New Item</h2>
                <p className="modal-subtitle-inventory">Add a new item to your inventory</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body-inventory">
              <form className="modal-form-inventory" onSubmit={handleSubmit}>
                {/* Form Layout */}
                <div className="form-layout-inventory">
                  {/* Left Column */}
                  <div className="form-left-inventory">
                    {/* Item Name */}
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Item Name</label>
                      <input
                        type="text"
                        name="itemName"
                        placeholder="Enter item name"
                        value={formData.itemName}
                        onChange={handleInputChange}
                        className="form-input-inventory"
                        required
                      />
                    </div>

                    {/* Category */}
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Category</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="form-input-inventory"
                        required
                      >
                        <option value="">Select category</option>
                        {categories.filter(c => c !== 'All Categories').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Unit */}
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Unit</label>
                      <select
                        name="unit"
                        value={formData.unit}
                        onChange={handleInputChange}
                        className="form-input-inventory"
                        required
                      >
                        <option value="">Select unit</option>
                        <option value="kg">kg</option>
                        <option value="ltr">ltr</option>
                        <option value="pcs">pcs</option>
                      </select>
                    </div>

                    {/* SKU - Read Only */}
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">SKU</label>
                      <div className="form-input-read-only-inventory">
                        {formData.sku}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="form-right-inventory">
                    {/* Image Upload */}
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Add image</label>
                      <div className="image-upload-box-inventory">
                        {imagePreview ? (
                          <div className="image-preview-content-inventory">
                            <img src={imagePreview} alt="Item preview" />
                          </div>
                        ) : (
                          <div className="upload-placeholder-inventory">
                            <span className="upload-icon-inventory">+</span>
                            <span className="upload-text-inventory">Upload image</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                          id="image-input"
                        />
                        <label htmlFor="image-input" className="upload-label-inventory"></label>
                      </div>
                    </div>

                    {/* Minimum Stock */}
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Minimum Stock</label>
                      <div className="input-with-spinner-inventory">
                        <input
                          type="number"
                          name="minStock"
                          placeholder="0"
                          value={formData.minStock}
                          onChange={handleInputChange}
                          className="form-input-inventory"
                          min="0"
                        />
                        <div className="spinner-controls-inventory">
                          <button type="button" className="spinner-btn-inventory up" onClick={() => handleSpinner('minStock', 'up')}>▲</button>
                          <button type="button" className="spinner-btn-inventory down" onClick={() => handleSpinner('minStock', 'down')}>▼</button>
                        </div>
                      </div>
                    </div>

                    {/* Maximum Stock */}
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Maximum stock</label>
                      <div className="input-with-spinner-inventory">
                        <input
                          type="number"
                          name="maxStock"
                          placeholder="0"
                          value={formData.maxStock}
                          onChange={handleInputChange}
                          className="form-input-inventory"
                          min="0"
                        />
                        <div className="spinner-controls-inventory">
                          <button type="button" className="spinner-btn-inventory up" onClick={() => handleSpinner('maxStock', 'up')}>▲</button>
                          <button type="button" className="spinner-btn-inventory down" onClick={() => handleSpinner('maxStock', 'down')}>▼</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer-inventory">
              <button type="button" className="modal-btn-inventory cancel" onClick={handleCloseModal}>
                Cancel
              </button>
              <button type="submit" className="modal-btn-inventory submit" onClick={handleSubmit}>
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Find Item by Image Modal */}
      {showFindModal && (
        <div className="find-item-overlay" onClick={handleCloseFindModal}>
          <div className="find-item-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="find-item-header">
              <h2 className="find-item-title">Find Item Name</h2>
              <button className="find-item-close" onClick={handleCloseFindModal}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="find-item-body">
              {/* Item Details */}
              <div className="find-item-details">
                <p><strong>Category :</strong> Row Material</p>
              </div>

              {/* Image Upload */}
              <div className="find-item-image-box">
                {findImagePreview ? (
                  <img src={findImagePreview} alt="Search preview" className="find-item-image-preview" />
                ) : (
                  <div className="find-item-upload-placeholder">
                    <span>+ Upload image</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFindImageUpload}
                  style={{ display: 'none' }}
                  id="find-image-input"
                />
                <label htmlFor="find-image-input" className="find-item-upload-label"></label>
              </div>

              {/* Item Info */}
              <div className="find-item-info">
                <p><strong>Quantity :</strong> 20</p>
                <p><strong>Unit :</strong> kg</p>
              </div>

              {/* Stock Table */}
              <div className="find-item-stock-section">
                <h3 className="stock-title">Stock</h3>
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>Branch Name</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Galle</td>
                      <td>10</td>
                    </tr>
                    <tr>
                      <td>Kandy</td>
                      <td>5</td>
                    </tr>
                    <tr>
                      <td>Colombo</td>
                      <td>5</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {showItemDetailModal && selectedItem && (
        <div className="item-detail-overlay" onClick={handleCloseItemDetailModal}>
          <div className="item-detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="item-detail-header">
              <h2 className="item-detail-title">{selectedItem.name}</h2>
              <button className="item-detail-close" onClick={handleCloseItemDetailModal}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="item-detail-body">
              {/* Item Image */}
              <div className="item-detail-image-container">
                <div className="item-detail-image-placeholder">
                  <span>Image</span>
                </div>
              </div>

              {/* Right Content */}
              <div className="item-detail-right-content">
                {/* Actions Section */}
                <div className="item-detail-section">
                  <h3 className="item-detail-section-title">Actions</h3>
                  <div className="item-detail-actions">
                    <button 
                      className="item-detail-action-btn edit-btn"
                      onClick={handleEditItem}
                      title="Edit item"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="item-detail-action-btn delete-btn"
                      onClick={handleDeleteItem}
                      title="Delete item"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                {/* State Section */}
                <div className="item-detail-section">
                  <h3 className="item-detail-section-title">State</h3>
                  <span className={`item-detail-state-badge ${selectedItem.status}`}>
                    {selectedItem.status === 'normal' 
                      ? 'Normal' 
                      : selectedItem.status === 'low' 
                      ? 'Low Stock' 
                      : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </div>

            {/* Item Info Section */}
            <div className="item-detail-info-section">
              <div className="item-info-row">
                <span className="item-info-label">Quantity :</span>
                <span className="item-info-value">{selectedItem.qty}</span>
              </div>
              <div className="item-info-row">
                <span className="item-info-label">Category :</span>
                <span className="item-info-value">{selectedItem.category}</span>
              </div>
              <div className="item-info-row">
                <span className="item-info-label">Unit :</span>
                <span className="item-info-value">{selectedItem.unit || '-'}</span>
              </div>
            </div>

            {/* Stock Section */}
            <div className="item-detail-stock-section">
              <h3 className="item-detail-section-title">Stock</h3>
              <table className="item-detail-stock-table">
                <thead>
                  <tr>
                    <th>Branch Name</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Galle</td>
                    <td>10</td>
                  </tr>
                  <tr>
                    <td>Kandy</td>
                    <td>5</td>
                  </tr>
                  <tr>
                    <td>Colombo</td>
                    <td>5</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditItemModal && (
        <div className="edit-item-overlay" onClick={handleCloseEditModal}>
          <div className="edit-item-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="edit-item-header">
              <div className="edit-item-header-content">
                <h2 className="edit-item-title">Edit Item</h2>
                <p className="edit-item-subtitle">Update inventory item details</p>
              </div>
              <button className="edit-item-close" onClick={handleCloseEditModal}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="edit-item-body">
              <form className="edit-item-form" onSubmit={handleEditSubmit}>
                {/* Form Layout */}
                <div className="edit-form-layout">
                  {/* Left Column */}
                  <div className="edit-form-left">
                    {/* Item Name */}
                    <div className="edit-form-group">
                      <label className="edit-form-label">Item Name</label>
                      <input
                        type="text"
                        name="itemName"
                        placeholder="Name"
                        value={editFormData.itemName}
                        onChange={handleEditInputChange}
                        className="edit-form-input"
                        required
                      />
                    </div>

                    {/* Category */}
                    <div className="edit-form-group">
                      <label className="edit-form-label">Category</label>
                      <select
                        name="category"
                        value={editFormData.category}
                        onChange={handleEditInputChange}
                        className="edit-form-input"
                        required
                      >
                        <option value="">Category</option>
                        <option value="Raw Materials">Raw Materials</option>
                        <option value="Tools & Equipment">Tools & Equipment</option>
                        <option value="Packaging">Packaging</option>
                      </select>
                    </div>

                    {/* Unit */}
                    <div className="edit-form-group">
                      <label className="edit-form-label">Unit</label>
                      <select
                        name="unit"
                        value={editFormData.unit}
                        onChange={handleEditInputChange}
                        className="edit-form-input"
                        required
                      >
                        <option value="">Kg</option>
                        <option value="kg">kg</option>
                        <option value="ltr">ltr</option>
                        <option value="pcs">pcs</option>
                      </select>
                    </div>

                    {/* SKU */}
                    <div className="edit-form-group">
                      <label className="edit-form-label">SKU</label>
                      <input
                        type="text"
                        value="Auto create"
                        className="edit-form-input-readonly"
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="edit-form-right">
                    {/* Image Upload */}
                    <div className="edit-form-group">
                      <label className="edit-form-label">Image</label>
                      <div className="edit-image-upload-box">
                        {editImagePreview ? (
                          <img src={editImagePreview} alt="Item preview" className="edit-image-preview" />
                        ) : (
                          <div className="edit-upload-placeholder">
                            <span>+ Upload image</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditImageUpload}
                          style={{ display: 'none' }}
                          id="edit-image-input"
                        />
                        <label htmlFor="edit-image-input" className="edit-upload-label"></label>
                      </div>
                    </div>

                    {/* Minimum Stock */}
                    <div className="edit-form-group">
                      <label className="edit-form-label">Minimum Stock</label>
                      <div className="edit-input-with-spinner">
                        <input
                          type="number"
                          name="minStock"
                          placeholder="10"
                          value={editFormData.minStock}
                          onChange={handleEditInputChange}
                          className="edit-form-input-spinner"
                          min="0"
                        />
                        <div className="edit-spinner-controls">
                          <button type="button" className="edit-spinner-btn up" onClick={() => handleEditSpinner('minStock', 'up')}>▲</button>
                          <button type="button" className="edit-spinner-btn down" onClick={() => handleEditSpinner('minStock', 'down')}>▼</button>
                        </div>
                      </div>
                    </div>

                    {/* Maximum Stock */}
                    <div className="edit-form-group">
                      <label className="edit-form-label">Maximum stock</label>
                      <div className="edit-input-with-spinner">
                        <input
                          type="number"
                          name="maxStock"
                          placeholder="1000"
                          value={editFormData.maxStock}
                          onChange={handleEditInputChange}
                          className="edit-form-input-spinner"
                          min="0"
                        />
                        <div className="edit-spinner-controls">
                          <button type="button" className="edit-spinner-btn up" onClick={() => handleEditSpinner('maxStock', 'up')}>▲</button>
                          <button type="button" className="edit-spinner-btn down" onClick={() => handleEditSpinner('maxStock', 'down')}>▼</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="edit-item-footer">
              <button type="button" className="edit-btn-cancel" onClick={handleCloseEditModal}>
                Cancel
              </button>
              <button type="submit" className="edit-btn-submit" onClick={handleEditSubmit}>
                Edit Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Assistant */}
      <ChatAssistant />
    </div>
  );
};

export default Inventory;