import React, { useState, useMemo, useEffect } from 'react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import ChatAssistant from '../Components/ChatAssistant';
import FindItemByImageModal from '../Components/FindItemByImageModal';
import './Inventory.css';
import { FaTimes, FaEdit, FaTrash, FaImage } from 'react-icons/fa';
import { getAuthHeaders } from '../utils/authHeaders';

// Helper function to generate SKU with first 3 letters of category name
const generateSKU = (categoryName, existingSkus = []) => {
  if (!categoryName) {
    return ''; // Empty if no category
  }

  // Get first 3 letters of category name
  const initials = categoryName
    .substring(0, 3)
    .toUpperCase();

  // Find the highest number for this category prefix
  const prefix = `SKU-${initials}-`;
  const categorySkus = existingSkus.filter(sku => sku.startsWith(prefix));

  let maxNumber = 0;
  categorySkus.forEach(sku => {
    const numberStr = sku.replace(prefix, '');
    const number = parseInt(numberStr, 10);
    if (!isNaN(number) && number > maxNumber) {
      maxNumber = number;
    }
  });

  // Generate next number with padding (001, 002, etc.)
  const nextNumber = String(maxNumber + 1).padStart(3, '0');
  return `${prefix}${nextNumber}`;
};

// Helper function to get status class
const getStatusClass = (status) => {
  switch (status) {
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
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]); // Store full category objects
  const [categoryMap, setCategoryMap] = useState({}); // Map category name to ID
  const [branches, setBranches] = useState([]);
  const [branchMap, setBranchMap] = useState({}); // Map branch name to ID
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [branchFilter, setBranchFilter] = useState('All Branch');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showModal, setShowModal] = useState(false);
  const [showFindByImageModal, setShowFindByImageModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'kg',
    minStock: '',
    maxStock: '',
    //branch: 'Colombo',
    sku: '',
    image: null
  });
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    unit: 'kg',
    minStock: '',
    maxStock: '',
    image: null
  });
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editableStockData, setEditableStockData] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [stockData, setStockData] = useState([]);

  // Role check
  const roleId = localStorage.getItem('roleId') || '';
  const userRole = roleId.replace('ROLE_', '');
  const canEdit = ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER'].includes(userRole);

  // Fetch items and related data from server
  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchBranches();
  }, []);

  // Fetch items from database
  const fetchItems = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/items', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching items:', err);
      setLoading(false);
    }
  };

  // Fetch categories from database
  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/categories', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategories(data); // Store full objects
        // Create map of category name to ID
        const map = {};
        data.forEach(c => {
          map[c.name] = c._id;
        });
        setCategoryMap(map);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Fetch branches from database
  const fetchBranches = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/branches', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      // Handle both array and { success, data } response formats
      const branchesArray = Array.isArray(data) ? data : (data.data ? data.data : []);
      if (Array.isArray(branchesArray)) {
        const branchNames = branchesArray
          .map(b => b.branchName || b.branch_name || b.name || '')
          .filter(name => name); // Filter out empty strings
        setBranches(branchNames);
        // Create map of branch name to ID
        const map = {};
        branchesArray.forEach(b => {
          const name = b.branchName || b.branch_name || b.name;
          if (name) {
            map[name] = b._id;
          }
        });
        setBranchMap(map);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  // Fetch stock data for a specific item
  const fetchStockData = async (item) => {
    try {
      let url = `http://localhost:5005/api/items/stock/${item._id || item.id}`;
      if (item.itemUnitId) {
        url += `?itemUnitId=${item.itemUnitId}`;
      }
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Stock data fetched:', data);
        if (data && data.branchInventory) {
          // Map totalQuantity to quantity for the UI components
          setStockData(data.branchInventory.map(b => ({ ...b, quantity: b.totalQuantity })));
        } else if (data && data.branchStocks) {
          setStockData(data.branchStocks);
        } else {
          setStockData(Array.isArray(data) ? data : []);
        }
      } else {
        // If no stock data endpoint, set empty
        console.log('No stock data found for item:', item._id || item.id);
        setStockData([]);
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setStockData([]);
    }
  };

  const getCategoryName = (item) => {
    if (item.category && typeof item.category === 'object') {
      return item.category.name || item.category.categoryName || '';
    }
    return item.categoryName || item.category || '';
  };

  const getItemBranchNames = (item) => {
    if (Array.isArray(item.branchStocks) && item.branchStocks.length > 0) {
      return item.branchStocks
        .map(stock => stock.branchName || stock.branch || '')
        .filter(Boolean);
    }
    return item.branch ? [item.branch] : [];
  };

  const getStatusLabel = (status) => {
    if (status === 'low') return 'Low Stock';
    if (status === 'out') return 'Out of Stock';
    return 'Normal';
  };

  const getDisplayQuantity = (item) => {
    if (branchFilter !== 'All Branch' && Array.isArray(item.branchStocks)) {
      const selectedBranchStock = item.branchStocks.find(stock => stock.branchName === branchFilter);
      return selectedBranchStock ? selectedBranchStock.quantity || 0 : 0;
    }

    return item.quantity || item.qty || 0;
  };

  const getDisplayTotalValue = (item) => {
    const quantity = Number(getDisplayQuantity(item)) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return quantity * unitPrice;
  };

  const handleClearFilters = () => {
    setQuery('');
    setCategoryFilter('All Categories');
    setBranchFilter('All Branch');
    setStatusFilter('All Status');
  };

  // Filter items based on DB-backed search, category, branch, and stock status.
  const filtered = useMemo(() => {
    return items.filter(item => {
      const q = query.trim().toLowerCase();
      const categoryName = getCategoryName(item);
      const branchNames = getItemBranchNames(item);
      const status = item.status || 'normal';
      const searchText = [
        item.name,
        item.sku,
        item.itemId,
        categoryName,
        item.unit,
        status,
        getStatusLabel(status),
        ...branchNames
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesQuery = !q ||
        searchText.includes(q);

      const matchesCategory = categoryFilter === 'All Categories' || categoryName === categoryFilter;
      const matchesBranch = branchFilter === 'All Branch' || branchNames.includes(branchFilter);
      const matchesStatus = statusFilter === 'All Status' || status === statusFilter;

      return matchesQuery && matchesCategory && matchesBranch && matchesStatus;
    });
  }, [items, query, categoryFilter, branchFilter, statusFilter]);

  const filteredTotalValue = filtered.reduce((total, item) => total + getDisplayTotalValue(item), 0);

  const handleOpenModal = () => {
    setFormData(prev => ({
      ...prev,
      sku: '' // SKU will be generated when category is selected
    }));
    setShowModal(true);
  };

  const handleFindByImage = () => {
    setShowFindByImageModal(true);
  };

  const handleCloseFindByImageModal = () => {
    setShowFindByImageModal(false);
  };

  const handleAddAsNewItemFromImage = (imageData) => {
    // Set the image preview and open the Add New Item modal
    setImagePreview(imageData);
    setShowFindByImageModal(false);
    // Clear form and reset SKU
    setFormData(prev => ({
      ...prev,
      name: '',
      category: '',
      unit: 'kg',
      minStock: '',
      maxStock: '',
      sku: ''
    }));
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setImagePreview(null);
    setFormData({
      name: '',
      category: '',
      unit: 'kg',
      minStock: '',
      maxStock: '',
      sku: '', // SKU will be generated when category is selected
      image: null
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };

    // When category changes, regenerate SKU
    if (name === 'category' && value) {
      // Extract all existing SKUs from items
      const existingSKUs = items
        .map(item => item.sku)
        .filter(sku => sku && typeof sku === 'string');

      updatedData.sku = generateSKU(value, existingSKUs);
    }

    setFormData(updatedData);
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


  const handleSpinner = (field, direction) => {
    setFormData(prev => ({
      ...prev,
      [field]: String(Math.max(0, parseInt(prev[field] || 0) + (direction === 'up' ? 1 : -1)))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.unit) {
      alert('Please fill required fields');
      return;
    }

    // Get category ObjectId from map
    const categoryId = categoryMap[formData.category];
    if (!categoryId) {
      alert('Invalid category selected');
      return;
    }

    setSubmitLoading(true);
    try {
      const response = await fetch('http://localhost:5005/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: formData.sku,
          name: formData.name,
          category: categoryId,
          unit: formData.unit,
          minStock: parseInt(formData.minStock) || 0,
          maxStock: parseInt(formData.maxStock) || 1000,
          image: formData.image
        })
      });

      const result = await response.json();
      if (result._id || result.id) {
        alert('Item added successfully!');
        fetchItems();
        handleCloseModal();
      } else {
        alert('Error: ' + (result.error || 'Failed to add item'));
      }
    } catch (err) {
      alert('Error adding item: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowItemDetailModal(true);
    fetchStockData(item);
  };

  const handleCloseItemDetailModal = () => {
    setShowItemDetailModal(false);
    setSelectedItem(null);
  };

  const handleEditItem = () => {
    if (selectedItem) {
      // Safely extract category name if it's an object
      let categoryValue = selectedItem.category;
      if (typeof categoryValue === 'object' && categoryValue !== null) {
        categoryValue = categoryValue.name || categoryValue.categoryName || '';
      }

      setEditFormData({
        _id: selectedItem._id || selectedItem.id,
        name: selectedItem.name || '',
        category: typeof selectedItem.category === 'object' ? selectedItem.category._id : selectedItem.category,
        unit: selectedItem.unit || 'kg',
        unitValue: selectedItem.unitValue || 1,
        sku: selectedItem.sku || selectedItem.itemId || '',
        quantity: selectedItem.quantity || 0,
        minStock: selectedItem.minStock || 0,
        maxStock: selectedItem.maxStock || 1000,
        image: selectedItem.image || null
      });
      // Use current stockData if available, otherwise it will be populated
      setEditableStockData(stockData.length > 0 ? [...stockData] : []);
      setEditImagePreview(null);
      setShowItemDetailModal(false);
      setShowEditItemModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditItemModal(false);
    setEditImagePreview(null);
    setEditableStockData([]);
    setEditFormData({
      name: '',
      category: '',
      unit: 'kg',
      unitValue: 1,
      minStock: '',
      maxStock: '',
      sku: '',
      image: null
    });
  };

  const handleDeleteItem = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedItem.name}?`)) {
      try {
        const response = await fetch(`http://localhost:5005/api/items/${selectedItem._id}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        if (result.message || response.ok) {
          alert('Item deleted successfully');
          fetchItems();
          setShowItemDetailModal(false);
        } else {
          alert('Error deleting item');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    const updatedData = { ...editFormData, [name]: value };

    // When category changes during edit, regenerate SKU
    if (name === 'category' && value) {
      // Extract all existing SKUs from items
      const existingSKUs = items
        .map(item => item.sku)
        .filter(sku => sku && typeof sku === 'string');

      updatedData.sku = generateSKU(value, existingSKUs);
    }

    setEditFormData(updatedData);
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

  const handleEditStockQuantityChange = (index, value) => {
    setEditableStockData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: Math.max(0, parseInt(value) || 0) };
      return updated;
    });
  };

  const handleEditTotalQuantityChange = (value) => {
    const totalValue = Math.max(0, parseInt(value) || 0);
    setEditFormData(prev => ({
      ...prev,
      maxStock: String(totalValue)
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.category || !editFormData.unit) {
      alert('Please fill required fields');
      return;
    }

    // Get category ObjectId from map
    const categoryId = categoryMap[editFormData.category];
    if (!categoryId) {
      alert('Invalid category selected');
      return;
    }

    setSubmitLoading(true);
    try {
      // First, update the item
      const response = await fetch(`http://localhost:5005/api/items/${selectedItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          category: editFormData.category,
          unit: editFormData.unit,
          unitValue: parseFloat(editFormData.unitValue) || 1,
          quantity: parseInt(editFormData.quantity) || 0,
          minStock: parseInt(editFormData.minStock) || 0,
          maxStock: parseInt(editFormData.maxStock) || 1000,
          image: editFormData.image
        })
      });

      const result = await response.json();
      if (result._id || result.id) {
        // Now save the stock quantities for each branch
        if (editableStockData && editableStockData.length > 0) {
          for (const stock of editableStockData) {
            await fetch(`http://localhost:5005/api/stock/${stock._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                quantity: parseInt(stock.quantity) || 0
              })
            });
          }
        }

        alert('Item and stock updated successfully!');
        fetchItems();
        handleCloseEditModal();
        handleCloseItemDetailModal();
      } else {
        alert('Error: ' + (result.error || 'Failed to update item'));
      }
    } catch (err) {
      alert('Error updating item: ' + err.message);
    } finally {
      setSubmitLoading(false);
    }
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
                          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.49 21.49 20 15.5 14zM4 9.5C4 6.46 6.46 4 9.5 4S15 6.46 15 9.5 12.54 15 9.5 15 4 12.54 4 9.5z" />
                        </svg>
                        <input
                          id="inventory-search-input"
                          type="search"
                          placeholder="Search item, SKU, category, branch, status..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="filter">
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="filter-select"
                      >
                        <option value="All Categories">All Categories</option>
                        {categories.map(c => (
                          <option key={c._id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter">
                      <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="filter-select"
                      >
                        <option value="All Branch">All Branch</option>
                        {branches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="filter-select"
                      >
                        <option value="All Status">All Status</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low Stock</option>
                        <option value="out">Out of Stock</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="filter-clear-btn"
                      onClick={handleClearFilters}
                      disabled={!query && categoryFilter === 'All Categories' && branchFilter === 'All Branch' && statusFilter === 'All Status'}
                    >
                      Clear
                    </button>

                    <div className="inventory-actions">
                      {canEdit && (
                        <>
                          <button className="btn btn-find" onClick={handleFindByImage}>
                            <FaImage /> Find by Image
                          </button>
                          <button className="btn btn-add" onClick={handleOpenModal}>+ Add new Item</button>
                        </>
                      )}
                    </div>
                  </div>
                </header>

                <div className="inventory-main">
                  <div className="inventory-value-summary">
                    <span>Total Inventory Value</span>
                    <strong>Rs {filteredTotalValue.toFixed(2)}</strong>
                  </div>
                  {filtered.length === 0 ? (
                    <div className="no-results">No items found.</div>
                  ) : (
                    <div className="list-wrap" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                      <table className="inventory-table" role="table" aria-label="Inventory list" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                          <tr>
                            <th style={{ width: '12%', left: 0, background: 'inherit' }}>Item ID</th>
                            <th style={{ width: '18%' }}>Name</th>
                            <th style={{ width: '15%' }}>Category</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>Quantity</th>
                            <th style={{ width: '9%', textAlign: 'center' }}>Unit</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>Unit Price</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>Total Value</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(item => {
                            let categoryDisplay = item.category;
                            if (typeof item.category === 'object' && item.category !== null) {
                              categoryDisplay = item.category.name || item.category.categoryName || 'N/A';
                            }
                            return (
                              <tr
                                key={item.uniqueId || item._id || item.id}
                                className="inventory-row"
                                onClick={() => handleRowClick(item)}
                                style={{ cursor: 'pointer' }}
                              >
                                <td style={{ width: '12%', paddingLeft: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.sku || item.itemId}>{item.sku || item.itemId || item._id}</td>
                                <td style={{ width: '18%' }}>{item.name}</td>
                                <td style={{ width: '15%' }}>{categoryDisplay}</td>
                                <td style={{ width: '10%', textAlign: 'center' }}>{getDisplayQuantity(item)}</td>
                                <td style={{ width: '9%', textAlign: 'center' }}>{item.unit || '-'}</td>
                                <td style={{ width: '12%', textAlign: 'center' }}>Rs {item.unitPrice ? parseFloat(item.unitPrice).toFixed(2) : '0.00'}</td>
                                <td style={{ width: '12%', textAlign: 'center' }}>Rs {getDisplayTotalValue(item).toFixed(2)}</td>
                                <td style={{ width: '12%', textAlign: 'center' }}>
                                  <span className={`badge ${getStatusClass(item.status)}`}>
                                    {item.status === 'normal' ? '✅ Normal' : item.status === 'low' ? '⚠️ Low' : '❌ Out'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
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
                        name="name"
                        placeholder="Enter item name"
                        value={formData.name}
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
                        {categories.map(c => (
                          <option key={c._id} value={c.name}>{c.name}</option>
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
              <button type="submit" className="modal-btn-inventory submit" onClick={handleSubmit} disabled={submitLoading}>
                {submitLoading ? 'Adding...' : 'Add Item'}
              </button>
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
                {selectedItem.image ? (
                  <img src={selectedItem.image} alt={selectedItem.name} className="item-detail-image" />
                ) : (
                  <div className="item-detail-image-placeholder">
                    <span>No Image</span>
                  </div>
                )}
              </div>

              {/* Right Content */}
              <div className="item-detail-right-content">
                {/* Actions Section */}
                {canEdit && (
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
                )}

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
                <span className="item-info-value">
                  {stockData && stockData.length > 0
                    ? stockData.reduce((total, stock) => total + (stock.quantity || 0), 0)
                    : (selectedItem.qty || selectedItem.quantity || 0)
                  }
                </span>
              </div>
              <div className="item-info-row">
                <span className="item-info-label">Category :</span>
                <span className="item-info-value">
                  {typeof selectedItem.category === 'object'
                    ? (selectedItem.category.name || selectedItem.category.categoryName || 'N/A')
                    : (selectedItem.category || 'N/A')
                  }
                </span>
              </div>
              <div className="item-info-row">
                <span className="item-info-label">Unit :</span>
                <span className="item-info-value">{selectedItem.unit || '-'}</span>
              </div>
              <div className="item-info-row">
                <span className="item-info-label">Unit Price :</span>
                <span className="item-info-value">Rs {selectedItem.unitPrice ? parseFloat(selectedItem.unitPrice).toFixed(2) : '0.00'}</span>
              </div>
              <div className="item-info-row">
                <span className="item-info-label">Total Price :</span>
                <span className="item-info-value" style={{ fontWeight: 'bold', color: '#667eea' }}>
                  Rs {
                    (
                      (stockData && stockData.length > 0
                        ? stockData.reduce((total, stock) => total + (stock.quantity || 0), 0)
                        : (selectedItem.qty || selectedItem.quantity || 0))
                      * (parseFloat(selectedItem.unitPrice) || 0)
                    ).toFixed(2)
                  }
                </span>
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
                  {stockData && stockData.length > 0 ? (
                    stockData.map((stock, index) => {
                      // Get branch name from the stock data or branchMap
                      let branchName = 'Unknown Branch';
                      if (stock.branchName) {
                        branchName = stock.branchName;
                      } else if (stock.branch && typeof stock.branch === 'object') {
                        branchName = stock.branch.branchName || stock.branch.branch_name || stock.branch.name || 'Unknown Branch';
                      }

                      return (
                        <tr key={stock._id || index}>
                          <td>{branchName}</td>
                          <td>{stock.quantity || 0}</td>
                        </tr>
                      );
                    })
                  ) : (
                    branches.map(branchName => (
                      <tr key={branchName}>
                        <td>{branchName}</td>
                        <td>0</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditItemModal && (
        <div className="edit-item-overlay" onClick={handleCloseEditModal}>
          <div className="edit-item-modal" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', height: '90vh', maxHeight: '90vh' }}>
            {/* Modal Header */}
            <div className="edit-item-header" style={{ flexShrink: 0, borderBottom: '1px solid #e5e7eb' }}>
              <div className="edit-item-header-content">
                <h2 className="edit-item-title">Edit Item</h2>
                <p className="edit-item-subtitle">Update inventory item details</p>
              </div>
              <button className="edit-item-close" onClick={handleCloseEditModal}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Body - Full Scrollable Content */}
            <div className="edit-item-body" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              <form className="edit-item-form" onSubmit={handleEditSubmit} style={{ paddingRight: '12px' }}>
                {/* Form Layout */}
                <div className="edit-form-layout">
                  {/* Left Column */}
                  <div className="edit-form-left">
                    {/* Item Name */}
                    <div className="edit-form-group">
                      <label className="edit-form-label">Item Name</label>
                      <input
                        type="text"
                        name="name"
                        placeholder="Name"
                        value={editFormData.name}
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
                        value={typeof editFormData.category === 'object'
                          ? (editFormData.category?.name || editFormData.category?.categoryName || '')
                          : (editFormData.category || '')
                        }
                        onChange={handleEditInputChange}
                        className="edit-form-input"
                        required
                      >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
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
                        <option value="">Select Unit</option>
                        <option value="kg">kg</option>
                        <option value="ltr">ltr</option>
                        <option value="pcs">pcs</option>
                      </select>
                    </div>

                    {/* Unit Value */}
                    <div className="edit-form-group">
                      <label className="edit-form-label">Unit Amount</label>
                      <input
                        type="number"
                        name="unitValue"
                        placeholder="e.g. 5, 10, 20"
                        value={editFormData.unitValue || ''}
                        onChange={handleEditInputChange}
                        className="edit-form-input"
                        min="1"
                        required
                      />
                    </div>


                    {/* SKU */}
                    <div className="edit-form-group">
                      <label className="edit-form-label">SKU</label>
                      <input
                        type="text"
                        value={editFormData.sku || 'Auto-generated'}
                        className="edit-form-input-readonly"
                        readOnly
                      />
                    </div>

                    {/* Total Quantity */}
                    <div className="edit-form-group">
                      <label className="edit-form-label">Total Quantity</label>
                      <input
                        type="number"
                        name="quantity"
                        placeholder="0"
                        value={editFormData.quantity || 0}
                        onChange={handleEditInputChange}
                        className="edit-form-input"
                        min="0"
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

                {/* Editable Stock Section - Inside Form */}
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                  <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '700', color: '#12203a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Branch Stock Quantities</h3>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #d8bfd8',
                    borderRadius: '6px',
                    overflow: 'hidden'
                  }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <th style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontWeight: '700',
                          fontSize: '13px',
                          color: 'white',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                          width: '40%'
                        }}>Branch Name</th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontWeight: '700',
                          fontSize: '13px',
                          color: 'white',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                          width: '30%'
                        }}>Current Qty</th>
                        <th style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontWeight: '700',
                          fontSize: '13px',
                          color: 'white',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          borderRight: 'none',
                          width: '30%'
                        }}>New Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableStockData && editableStockData.length > 0 ? (
                        <>
                          {editableStockData.map((stock, index) => {
                            let branchName = 'Unknown Branch';
                            if (stock.branchName) {
                              branchName = stock.branchName;
                            } else if (stock.branch && typeof stock.branch === 'object') {
                              branchName = stock.branch.branchName || stock.branch.branch_name || stock.branch.name || 'Unknown Branch';
                            }

                            return (
                              <tr key={stock._id || index} style={{
                                transition: 'all 0.3s ease',
                                backgroundColor: 'white',
                                borderBottom: index === editableStockData.length - 1 ? 'none' : '1px solid #d8bfd8'
                              }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                              >
                                <td style={{
                                  padding: '12px',
                                  color: '#1a3a52',
                                  fontWeight: '600',
                                  fontSize: '13px',
                                  borderRight: '1px solid #d8bfd8'
                                }}>{branchName}</td>
                                <td style={{
                                  padding: '12px',
                                  textAlign: 'center',
                                  borderRight: '1px solid #d8bfd8',
                                  color: '#1a3a52',
                                  fontWeight: '600',
                                  fontSize: '13px',
                                  backgroundColor: '#f9fafb'
                                }}>
                                  {stock.quantity || 0}
                                </td>
                                <td style={{
                                  padding: '12px',
                                  textAlign: 'center',
                                  borderRight: 'none'
                                }}>
                                  <input
                                    type="number"
                                    min="0"
                                    value={stock.quantity || 0}
                                    onChange={(e) => handleEditStockQuantityChange(index, e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '8px 10px',
                                      border: '1.5px solid #667eea',
                                      borderRadius: '4px',
                                      textAlign: 'center',
                                      fontSize: '13px',
                                      fontWeight: '600',
                                      color: '#1a3a52',
                                      outline: 'none',
                                      transition: 'all 0.2s ease',
                                      backgroundColor: '#ffffff'
                                    }}
                                    onFocus={(e) => {
                                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                                      e.target.style.borderColor = '#764ba2';
                                    }}
                                    onBlur={(e) => {
                                      e.target.style.boxShadow = 'none';
                                      e.target.style.borderColor = '#667eea';
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                          {/* Total Row */}
                          <tr style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            fontWeight: '700'
                          }}>
                            <td style={{
                              padding: '12px',
                              color: 'white',
                              fontWeight: '700',
                              fontSize: '13px',
                              borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px',
                              width: '40%'
                            }}>Total Stock</td>
                            <td style={{
                              padding: '12px',
                              textAlign: 'center',
                              borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                              color: 'white',
                              fontSize: '13px',
                              fontWeight: '700',
                              width: '30%'
                            }}>
                              {editableStockData.reduce((total, stock) => total + (stock.quantity || 0), 0)}
                            </td>
                            <td style={{
                              padding: '12px',
                              textAlign: 'center',
                              borderRight: 'none',
                              width: '30%'
                            }}>
                              <input
                                type="number"
                                min="0"
                                value={editableStockData.reduce((total, stock) => total + (stock.quantity || 0), 0)}
                                onChange={(e) => handleEditTotalQuantityChange(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  textAlign: 'center',
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  color: '#667eea',
                                  outline: 'none',
                                  transition: 'all 0.2s ease',
                                  backgroundColor: '#ffffff',
                                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                }}
                                onFocus={(e) => {
                                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                }}
                                onBlur={(e) => {
                                  e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                                }}
                              />
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td colSpan="2" style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#9ca3af',
                            fontStyle: 'italic',
                            borderBottom: 'none'
                          }}>No stock data available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="edit-item-footer" style={{ flexShrink: 0, borderTop: '1px solid #e5e7eb', marginTop: 'auto' }}>
              <button type="button" className="edit-btn-cancel" onClick={handleCloseEditModal}>
                Cancel
              </button>
              <button type="submit" className="edit-btn-submit" onClick={handleEditSubmit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Find Item by Image Modal */}
      <FindItemByImageModal
        isOpen={showFindByImageModal}
        onClose={handleCloseFindByImageModal}
        onAddAsNew={handleAddAsNewItemFromImage}
      />

      <ChatAssistant />
    </div>
  );
};

export default Inventory;
