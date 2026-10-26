import React, { useState, useMemo, useEffect } from 'react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import ChatAssistant from '../Components/ChatAssistant';
import FindItemByImageModal from '../Components/FindItemByImageModal';
import ConfirmDialog from '../Components/ConfirmDialog';
import ModernDropdown from '../Components/ModernDropdown';

import { FaTimes, FaEdit, FaTrash, FaImage, FaUpload, FaCloudUploadAlt, FaBarcode, FaBoxOpen, FaLayerGroup } from 'react-icons/fa';
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

const formatPrice = (value) => `Rs ${(Number(value) || 0).toFixed(2)}`;

const formatUnitSize = (unit, unitValue) => {
  if (!unit) return '';
  const str = String(unit).trim();
  if (/^\d+/.test(str)) {
    return str;
  }
  const val = (unitValue !== undefined && unitValue !== null && unitValue !== '') ? unitValue : 1;
  return `${val}${str}`;
};

const cleanUnit = (unit) => {
  if (!unit) return '';
  const str = String(unit).trim();
  return str;
};

const stripPriceSuffix = (name = '') => name.replace(/\s*\(Rs\s?\d+(\.\d+)?\)\s*$/i, '');

const mergeBranchStocks = (branchStocks = []) => {
  const branchMap = new Map();

  branchStocks.forEach(stock => {
    const key = String(stock.branchObjectId || stock.branchId || stock.branchName || 'unknown');
    const existing = branchMap.get(key);

    if (existing) {
      existing.quantity += Number(stock.quantity) || 0;
    } else {
      branchMap.set(key, {
        ...stock,
        quantity: Number(stock.quantity) || 0
      });
    }
  });

  return Array.from(branchMap.values());
};

const getPriceRangeText = (prices = []) => {
  const validPrices = prices
    .map(price => Number(price) || 0)
    .sort((a, b) => a - b);

  if (validPrices.length === 0) return formatPrice(0);

  const minPrice = validPrices[0];
  const maxPrice = validPrices[validPrices.length - 1];

  if (minPrice === maxPrice) return formatPrice(minPrice);
  return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
};

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]); // Store full category objects
  const [categoryMap, setCategoryMap] = useState({}); // Map category name to ID
  const [branches, setBranches] = useState([]);
  const [branchMap, setBranchMap] = useState({}); // Map branch name to ID
  const [stockLoading, setStockLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [branchFilter, setBranchFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showFindByImageModal, setShowFindByImageModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'kg',
    unitValue: '1',
    unitPrice: '',
    minStock: '',
    maxStock: '',
    sku: '',
    image: null
  });
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    _id: '',
    itemUnitId: '',
    name: '',
    category: '',
    unit: 'kg',
    unitValue: '1',
    unitPrice: '',
    quantity: '',
    minStock: '',
    maxStock: '',
    sku: '',
    image: null
  });
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editableStockData, setEditableStockData] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [stockData, setStockData] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [isEditingPriceTiers, setIsEditingPriceTiers] = useState(false);
  const [editablePriceTiers, setEditablePriceTiers] = useState([]);
  const [savingPriceTiers, setSavingPriceTiers] = useState(false);

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
    } catch (err) {
      console.error('Error fetching items:', err);
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
      setStockLoading(true);
      const url = `http://localhost:5005/api/items/stock/${item._id || item.id}`;
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Stock data fetched:', data);
        if (data && data.branchInventory) {
          setStockData(data.branchInventory.map(b => ({
            ...b,
            _id: b._id || b.stockId,
            stockId: b.stockId || b._id,
            branchId: b.branchId,
            quantity: b.totalQuantity,
            totalValue: b.totalValue || 0,
            units: b.units || []
          })));
        } else if (data && data.branchStocks) {
          setStockData(data.branchStocks);
        } else {
          setStockData(Array.isArray(data) ? data : []);
        }
      } else {
        setStockData([]);
      }
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setStockData([]);
    } finally {
      setStockLoading(false);
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
    const isBranchFiltered = Array.isArray(branchFilter) ? branchFilter.length > 0 && !branchFilter.includes('All Branch') : branchFilter !== 'All Branch';
    if (isBranchFiltered && Array.isArray(item.branchStocks)) {
      const allowed = Array.isArray(branchFilter) ? branchFilter : [branchFilter];
      return item.branchStocks
        .filter(stock => allowed.includes(stock.branchName))
        .reduce((sum, stock) => sum + Number(stock.quantity || 0), 0);
    }

    return item.quantity || item.qty || 0;
  };

  const getDisplayTotalValue = (item) => {
    if (Array.isArray(item.variations) && item.variations.length > 0) {
      return item.variations.reduce((sum, variation) => {
        const quantity = Number(getDisplayQuantity(variation)) || 0;
        const unitPrice = Number(variation.unitPrice) || 0;
        return sum + (quantity * unitPrice);
      }, 0);
    }

    const quantity = Number(getDisplayQuantity(item)) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return quantity * unitPrice;
  };

  const handleClearFilters = () => {
    setQuery('');
    setCategoryFilter([]);
    setBranchFilter([]);
    setStatusFilter([]);
  };

  const groupedItems = useMemo(() => {
    const groups = new Map();

    items.forEach(item => {
      const key = String(item._id || item.id || item.uniqueId);
      const existing = groups.get(key);
      const quantity = Number(item.quantity || item.qty) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const branchStocks = Array.isArray(item.branchStocks) ? item.branchStocks : [];
      const rawUnit = (item.baseUnit || item.unit || 'kg').replace(/^\d+/, '');
      const formattedUnitSize = item.unitSize || formatUnitSize(item.unit, item.unitValue);

      if (!existing) {
        groups.set(key, {
          ...item,
          name: stripPriceSuffix(item.name),
          quantity,
          unitPrices: [unitPrice],
          baseUnits: rawUnit ? [rawUnit] : [],
          unitSizes: formattedUnitSize ? [formattedUnitSize] : [],
          branchStocks: mergeBranchStocks(branchStocks),
          variations: [item],
          totalValue: quantity * unitPrice,
          isGrouped: false
        });
        return;
      }

      existing.quantity += quantity;
      existing.totalValue += quantity * unitPrice;
      existing.unitPrices.push(unitPrice);
      if (rawUnit && !existing.baseUnits.includes(rawUnit)) {
        existing.baseUnits.push(rawUnit);
      }
      if (formattedUnitSize && !existing.unitSizes.includes(formattedUnitSize)) {
        existing.unitSizes.push(formattedUnitSize);
      }
      existing.branchStocks = mergeBranchStocks([
        ...(existing.branchStocks || []),
        ...branchStocks
      ]);
      existing.variations.push(item);
      existing.isGrouped = true;
    });

    return Array.from(groups.values()).map(item => {
      const uniquePrices = Array.from(new Set(item.unitPrices));
      const uniqueBaseUnits = Array.from(new Set(item.baseUnits.filter(Boolean)));
      const uniqueUnitSizes = Array.from(new Set(item.unitSizes.filter(Boolean)));
      const minStock = Number(item.minStock) || 0;
      let status = 'normal';

      if (item.quantity === 0) {
        status = 'out';
      } else if (item.quantity < minStock) {
        status = 'low';
      }

      const baseUnitDisplay = uniqueBaseUnits.length > 0 ? uniqueBaseUnits.join(', ') : (item.unit || '-');
      const unitSizeDisplay = uniqueUnitSizes.length > 0 ? uniqueUnitSizes.join(', ') : (formatUnitSize(item.unit, item.unitValue) || '-');

      return {
        ...item,
        uniqueId: item._id || item.id || item.uniqueId,
        itemUnitId: item.isGrouped ? undefined : item.itemUnitId,
        unitPrice: uniquePrices.length === 1 ? uniquePrices[0] : undefined,
        priceRange: getPriceRangeText(uniquePrices),
        baseUnit: baseUnitDisplay,
        unit: baseUnitDisplay,
        unitSize: unitSizeDisplay,
        status
      };
    });
  }, [items]);

  // Filter grouped inventory rows based on DB-backed search, category, branch, and stock status.
  const filtered = useMemo(() => {
    return groupedItems.filter(item => {
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
        item.baseUnit,
        item.unitSize,
        item.priceRange,
        status,
        getStatusLabel(status),
        ...branchNames
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesQuery = !q ||
        searchText.includes(q);

      const matchesCategory = 
        !categoryFilter || 
        categoryFilter.length === 0 || 
        (Array.isArray(categoryFilter) ? (categoryFilter.includes('All Categories') || categoryFilter.includes(categoryName)) : (categoryFilter === 'All Categories' || categoryName === categoryFilter));

      const matchesBranch = 
        !branchFilter || 
        branchFilter.length === 0 || 
        (Array.isArray(branchFilter) ? (branchFilter.includes('All Branch') || branchFilter.some(bf => branchNames.includes(bf))) : (branchFilter === 'All Branch' || branchNames.includes(branchFilter)));

      const matchesStatus = 
        !statusFilter || 
        statusFilter.length === 0 || 
        (Array.isArray(statusFilter) ? (statusFilter.includes('All Status') || statusFilter.includes(status)) : (statusFilter === 'All Status' || status === statusFilter));

      return matchesQuery && matchesCategory && matchesBranch && matchesStatus;
    });
  }, [groupedItems, query, categoryFilter, branchFilter, statusFilter]);

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
      unitValue: '1',
      unitPrice: '',
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
      reader.onload = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
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
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          sku: formData.sku,
          name: formData.name,
          category: categoryId,
          unit: formData.unit,
          unitValue: parseFloat(formData.unitValue) || 1,
          unitAmount: parseFloat(formData.unitValue) || 1,
          unitPrice: parseFloat(formData.unitPrice) || 0,
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

  const requestAddItem = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.unit) {
      alert('Please fill required fields');
      return;
    }
    setPendingAction({ type: 'add' });
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowItemDetailModal(true);
    fetchStockData(item);
  };

  const handleCloseItemDetailModal = () => {
    setShowItemDetailModal(false);
    setSelectedItem(null);
    setIsEditingPriceTiers(false);
    setEditablePriceTiers([]);
  };

  const handleStartEditPriceTiers = () => {
    const cloned = (stockData || []).map(b => ({
      ...b,
      units: (b.units || []).map(u => ({ ...u }))
    }));
    setEditablePriceTiers(cloned);
    setIsEditingPriceTiers(true);
  };

  const handlePriceTierQtyChange = (bIdx, uIdx, val) => {
    setEditablePriceTiers(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const parsed = Math.max(0, parseInt(val) || 0);
      if (copy[bIdx] && copy[bIdx].units && copy[bIdx].units[uIdx]) {
        copy[bIdx].units[uIdx].quantity = parsed;
        const uPrice = Number(copy[bIdx].units[uIdx].unitPrice) || 0;
        copy[bIdx].units[uIdx].totalValue = parsed * uPrice;

        copy[bIdx].totalQuantity = copy[bIdx].units.reduce((sum, u) => sum + (Number(u.quantity) || 0), 0);
        copy[bIdx].totalValue = copy[bIdx].units.reduce((sum, u) => sum + (Number(u.totalValue) || 0), 0);
      }
      return copy;
    });
  };

  const handleSavePriceTiers = async () => {
    if (!selectedItem) return;
    setSavingPriceTiers(true);
    try {
      const targetId = selectedItem._id || selectedItem.id;
      const updates = [];
      editablePriceTiers.forEach(b => {
        (b.units || []).forEach(u => {
          updates.push({
            stockId: u.stockId || u._id,
            branchId: b.branchId,
            itemUnitId: u.unitId,
            quantity: parseInt(u.quantity) || 0
          });
        });
      });

      const response = await fetch('http://localhost:5005/api/stock/batch/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          itemId: targetId,
          updates
        })
      });

      const res = await response.json();
      if (res.success || response.ok) {
        alert('Stock quantities updated successfully across price tiers!');
        setIsEditingPriceTiers(false);
        await fetchStockData(selectedItem);
        await fetchItems();
      } else {
        alert('Error: ' + (res.error || 'Failed to update stock quantities'));
      }
    } catch (err) {
      alert('Error saving price tier quantities: ' + err.message);
    } finally {
      setSavingPriceTiers(false);
    }
  };

  const handleEditItem = () => {
    if (selectedItem) {
      // Safely extract category name so ModernDropdown matches the option
      let categoryValue = '';
      if (typeof selectedItem.category === 'object' && selectedItem.category !== null) {
        categoryValue = selectedItem.category.name || selectedItem.category.categoryName || '';
      } else if (selectedItem.categoryName) {
        categoryValue = selectedItem.categoryName;
      } else if (selectedItem.category) {
        const matchEntry = Object.entries(categoryMap).find(([name, id]) => id === selectedItem.category || name === selectedItem.category);
        categoryValue = matchEntry ? matchEntry[0] : selectedItem.category;
      }

      // Extract existing unit price
      let existingPrice = '';
      if (selectedItem.unitPrice !== undefined && selectedItem.unitPrice !== null && selectedItem.unitPrice !== '') {
        existingPrice = selectedItem.unitPrice;
      } else if (Array.isArray(selectedItem.unitPrices) && selectedItem.unitPrices.length > 0) {
        existingPrice = selectedItem.unitPrices[0];
      }

      // Extract existing quantity
      const existingQty = selectedItem.quantity !== undefined && selectedItem.quantity !== null
        ? selectedItem.quantity
        : (selectedItem.qty !== undefined ? selectedItem.qty : 0);

      // Extract itemUnitId if available
      let itemUnitId = selectedItem.itemUnitId || '';
      if (!itemUnitId && selectedItem.uniqueId && selectedItem.uniqueId.includes('_')) {
        itemUnitId = selectedItem.uniqueId.split('_')[1];
      }

      setEditFormData({
        _id: selectedItem._id || selectedItem.id,
        itemUnitId,
        name: selectedItem.name || '',
        category: categoryValue,
        unit: cleanUnit(selectedItem.baseUnit || selectedItem.unit) || 'kg',
        unitValue: selectedItem.unitValue || 1,
        unitPrice: existingPrice !== '' ? String(existingPrice) : '',
        sku: selectedItem.sku || selectedItem.itemId || '',
        quantity: existingQty,
        minStock: selectedItem.minStock !== undefined ? selectedItem.minStock : 0,
        maxStock: selectedItem.maxStock !== undefined ? selectedItem.maxStock : 1000,
        image: selectedItem.image || null
      });

      // Populate editableStockData from stockData, preserving price tier units
      let initialStocks = [];
      if (stockData && stockData.length > 0) {
        initialStocks = stockData.map(s => {
          const rawUnits = Array.isArray(s.units) && s.units.length > 0
            ? s.units.map(u => ({
                ...u,
                stockId: u.stockId || u._id,
                unitId: u.unitId,
                unitPrice: Number(u.unitPrice) || 0,
                unit: u.unit || cleanUnit(selectedItem.baseUnit || selectedItem.unit) || 'kg',
                quantity: Number(u.quantity) || 0,
                originalQty: Number(u.quantity) || 0,
                totalValue: (Number(u.quantity) || 0) * (Number(u.unitPrice) || 0)
              }))
            : [{
                unitPrice: Number(existingPrice) || 0,
                unit: cleanUnit(selectedItem.baseUnit || selectedItem.unit) || 'kg',
                quantity: Number(s.totalQuantity !== undefined ? s.totalQuantity : s.quantity) || 0,
                originalQty: Number(s.totalQuantity !== undefined ? s.totalQuantity : s.quantity) || 0,
                totalValue: (Number(s.totalQuantity !== undefined ? s.totalQuantity : s.quantity) || 0) * (Number(existingPrice) || 0)
              }];

          const bTotalQty = rawUnits.reduce((sum, u) => sum + (Number(u.quantity) || 0), 0);
          const bTotalVal = rawUnits.reduce((sum, u) => sum + (Number(u.totalValue) || 0), 0);

          return {
            ...s,
            branchName: s.branchName || (s.branch && (s.branch.branchName || s.branch.name)) || 'Unknown Branch',
            branchId: s.branchId || s.branchObjectId || s._id,
            totalQuantity: bTotalQty,
            quantity: bTotalQty,
            originalQty: bTotalQty,
            totalValue: bTotalVal,
            units: rawUnits
          };
        });
      } else if (Array.isArray(selectedItem.branchStocks) && selectedItem.branchStocks.length > 0) {
        initialStocks = selectedItem.branchStocks.map(s => ({
          branchName: s.branchName || s.branch || 'Unknown Branch',
          branchId: s.branchObjectId || s.branchId || branchMap[s.branchName || s.branch],
          quantity: Number(s.quantity) || 0,
          originalQty: Number(s.quantity) || 0,
          totalQuantity: Number(s.quantity) || 0,
          units: [{
            unitPrice: Number(existingPrice) || 0,
            unit: cleanUnit(selectedItem.baseUnit || selectedItem.unit) || 'kg',
            quantity: Number(s.quantity) || 0,
            originalQty: Number(s.quantity) || 0,
            totalValue: (Number(s.quantity) || 0) * (Number(existingPrice) || 0)
          }]
        }));
      } else if (branches && branches.length > 0) {
        initialStocks = branches.map(bName => ({
          branchName: bName,
          branchId: branchMap[bName],
          quantity: branches.length === 1 ? existingQty : 0,
          originalQty: branches.length === 1 ? existingQty : 0,
          totalQuantity: branches.length === 1 ? existingQty : 0,
          units: [{
            unitPrice: Number(existingPrice) || 0,
            unit: cleanUnit(selectedItem.baseUnit || selectedItem.unit) || 'kg',
            quantity: branches.length === 1 ? existingQty : 0,
            originalQty: branches.length === 1 ? existingQty : 0,
            totalValue: (branches.length === 1 ? existingQty : 0) * (Number(existingPrice) || 0)
          }]
        }));
      }

      setEditableStockData(initialStocks);
      setEditImagePreview(selectedItem.image || null);
      setShowItemDetailModal(false);
      setShowEditItemModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditItemModal(false);
    setEditImagePreview(null);
    setEditableStockData([]);
    setEditFormData({
      _id: '',
      itemUnitId: '',
      name: '',
      category: '',
      unit: 'kg',
      unitValue: 1,
      unitPrice: '',
      quantity: '',
      minStock: '',
      maxStock: '',
      sku: '',
      image: null
    });
  };

  const handleDeleteItem = async () => {
    if (selectedItem) {
      try {
        const response = await fetch(`http://localhost:5005/api/items/${selectedItem._id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
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

  const requestDeleteItem = () => {
    if (selectedItem) setPendingAction({ type: 'delete', item: selectedItem });
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
      reader.onload = () => {
        setEditImagePreview(reader.result);
        setEditFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditSpinner = (field, direction) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: String(Math.max(0, parseInt(prev[field] || 0) + (direction === 'up' ? 1 : -1)))
    }));
  };

  const handleEditTierQuantityChange = (branchIdx, unitIdx, val) => {
    setEditableStockData(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const parsed = Math.max(0, parseInt(val) || 0);
      if (copy[branchIdx] && copy[branchIdx].units && copy[branchIdx].units[unitIdx]) {
        copy[branchIdx].units[unitIdx].quantity = parsed;
        const uPrice = Number(copy[branchIdx].units[unitIdx].unitPrice) || 0;
        copy[branchIdx].units[unitIdx].totalValue = parsed * uPrice;

        copy[branchIdx].totalQuantity = copy[branchIdx].units.reduce((sum, u) => sum + (Number(u.quantity) || 0), 0);
        copy[branchIdx].quantity = copy[branchIdx].totalQuantity;
        copy[branchIdx].totalValue = copy[branchIdx].units.reduce((sum, u) => sum + (Number(u.totalValue) || 0), 0);
      }
      const newTotal = copy.reduce((sum, b) => sum + (Number(b.totalQuantity || b.quantity) || 0), 0);
      setEditFormData(f => ({ ...f, quantity: newTotal }));
      return copy;
    });
  };

  const handleEditQuantityChange = (newVal) => {
    const parsed = Math.max(0, parseInt(newVal) || 0);
    setEditFormData(prev => ({ ...prev, quantity: parsed }));

    setEditableStockData(prev => {
      if (prev.length === 1) {
        const copy = JSON.parse(JSON.stringify(prev));
        copy[0].quantity = parsed;
        copy[0].totalQuantity = parsed;
        if (copy[0].units && copy[0].units.length === 1) {
          copy[0].units[0].quantity = parsed;
        }
        return copy;
      }
      return prev;
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.category || !editFormData.unit) {
      alert('Please fill required fields');
      return;
    }

    // Get category ObjectId from map or existing category value
    let categoryId = categoryMap[editFormData.category] || editFormData.category;
    if (typeof categoryId === 'object' && categoryId !== null) {
      categoryId = categoryId._id;
    }

    setSubmitLoading(true);
    try {
      const calculatedTotalQty = editableStockData && editableStockData.length > 0
        ? editableStockData.reduce((total, stock) => total + (parseInt(stock.totalQuantity !== undefined ? stock.totalQuantity : stock.quantity) || 0), 0)
        : (parseInt(editFormData.quantity) || 0);

      // First, update the item with branch stocks
      const targetId = selectedItem._id || selectedItem.id;
      const response = await fetch(`http://localhost:5005/api/items/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          name: editFormData.name,
          category: categoryId,
          unit: cleanUnit(editFormData.unit),
          unitValue: parseFloat(editFormData.unitValue) || 1,
          unitAmount: parseFloat(editFormData.unitValue) || 1,
          unitPrice: parseFloat(editFormData.unitPrice) || 0,
          quantity: calculatedTotalQty,
          minStock: parseInt(editFormData.minStock) || 0,
          maxStock: parseInt(editFormData.maxStock) || 1000,
          image: editFormData.image,
          itemUnitId: editFormData.itemUnitId || undefined,
          branchStocks: editableStockData.map(s => ({
            branchId: s.branchId || s.branchObjectId || s._id,
            quantity: parseInt(s.quantity || s.totalQuantity) || 0,
            units: Array.isArray(s.units) ? s.units.map(u => ({
              stockId: u.stockId || u._id,
              unitId: u.unitId,
              quantity: parseInt(u.quantity) || 0
            })) : undefined
          }))
        })
      });

      const result = await response.json();
      if (result._id || result.id) {
        alert('Item and stock updated successfully!');
        await fetchItems();
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

                    {/* Filter & Action Section (Right Aligned, matching PO page) */}
                    <div className="po-filters" style={{ marginLeft: 'auto' }}>
                      <div className="filter-group">
                        <ModernDropdown
                          options={categories.map(c => ({ value: c.name, label: c.name }))}
                          value={categoryFilter}
                          onChange={(val) => setCategoryFilter(val)}
                          placeholder="All Categories"
                          multiple={true}
                          searchable={true}
                          minWidth="130px"
                        />
                      </div>

                      <div className="filter-group">
                        <ModernDropdown
                          options={branches.map(b => ({ value: b, label: b }))}
                          value={branchFilter}
                          onChange={(val) => setBranchFilter(val)}
                          placeholder="All Branches"
                          multiple={true}
                          searchable={true}
                          minWidth="130px"
                        />
                      </div>

                      <div className="filter-group">
                        <ModernDropdown
                          options={[
                            { value: 'normal', label: 'Normal' },
                            { value: 'low', label: 'Low Stock' },
                            { value: 'out', label: 'Out of Stock' }
                          ]}
                          value={statusFilter}
                          onChange={(val) => setStatusFilter(val)}
                          placeholder="All Statuses"
                          multiple={true}
                          minWidth="125px"
                        />
                      </div>

                      <button
                        type="button"
                        className="btn-clear-filters"
                        onClick={handleClearFilters}
                        disabled={!query && categoryFilter.length === 0 && branchFilter.length === 0 && statusFilter.length === 0}
                      >
                        Clear Filters
                      </button>

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
{/* Value summary hidden from main table view per request */}
                  {filtered.length === 0 ? (
                    <div className="no-results">No items found.</div>
                  ) : (
                    <div className="list-wrap" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                      <table className="inventory-table" role="table" aria-label="Inventory list" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                          <tr>
                            <th style={{ width: '16%', left: 0, background: 'inherit' }}>Item ID</th>
                            <th style={{ width: '26%' }}>Name</th>
                            <th style={{ width: '20%' }}>Category</th>
                            <th style={{ width: '14%', textAlign: 'center' }}>Quantity</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>Unit</th>
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
                                <td style={{ width: '16%', paddingLeft: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.sku || item.itemId}>
                                  {item.sku || item.itemId || item._id}
                                </td>
                                <td style={{ width: '26%', fontWeight: '600' }}>{item.name}</td>
                                <td style={{ width: '20%' }}>{categoryDisplay}</td>
                                <td style={{ width: '14%', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>
                                  {getDisplayQuantity(item)}
                                </td>
                                <td style={{ width: '12%', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>
                                  {item.baseUnit || item.unit || '-'}
                                </td>
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
          <div className="modal-content-inventory add-item-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Add New Item</h2>
                <p className="modal-subtitle-inventory">Register a new product with barcode, pricing, and stock limits</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={handleCloseModal} title="Close">
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body-inventory">
              <form id="add-item-form" className="modal-form-inventory" onSubmit={requestAddItem}>
                <div className="add-item-layout-grid">
                  {/* Left Column: Product Photo & Barcode/SKU Card */}
                  <div className="add-item-media-col">
                    <div className="form-group-inventory" style={{ margin: 0 }}>
                      <label className="form-label-inventory">Item Photo</label>
                      {imagePreview ? (
                        <div>
                          <div className="image-preview-wrapper">
                            <img src={imagePreview} alt="Item preview" />
                          </div>
                          <div className="image-preview-actions">
                            <label htmlFor="add-item-image-input" className="image-action-btn">
                              <FaUpload /> Change
                            </label>
                            <button
                              type="button"
                              className="image-action-btn danger"
                              onClick={() => {
                                setImagePreview(null);
                                setFormData(prev => ({ ...prev, image: null }));
                              }}
                            >
                              <FaTrash /> Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="add-item-image-input"
                          className="image-dropzone-box"
                        >
                          <div className="image-dropzone-icon">
                            <FaCloudUploadAlt />
                          </div>
                          <div className="image-dropzone-title">Upload Product Image</div>
                          <div className="image-dropzone-sub">Click to browse or drop file here</div>
                          <div style={{ marginTop: '8px', fontSize: '10.5px', color: '#94a3b8' }}>PNG, JPG or WebP</div>
                        </label>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        id="add-item-image-input"
                      />
                    </div>

                    {/* Barcode & SKU Card */}
                    <div className="sku-info-card">
                      <div className="sku-info-header">
                        <span className="sku-info-label">
                          <FaBarcode /> SKU / Barcode
                        </span>
                        <span className="sku-info-tag">Auto-Generated</span>
                      </div>
                      <div className={`sku-info-value ${!formData.sku ? 'empty' : ''}`}>
                        {formData.sku || 'Select a category to generate SKU'}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Organized Form Fields */}
                  <div className="add-item-fields-col">
                    {/* Section 1: General Info */}
                    <div className="form-section-group">
                      <div className="form-section-title">
                        <FaBoxOpen /> General Information
                      </div>

                      {/* Item Name */}
                      <div className="form-group-inventory" style={{ margin: 0 }}>
                        <label className="form-label-inventory">Item Name *</label>
                        <input
                          type="text"
                          name="name"
                          placeholder="e.g. Premium White Rice"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="form-input-inventory"
                          required
                        />
                      </div>

                      {/* Category */}
                      <div className="form-group-inventory" style={{ margin: 0 }}>
                        <label className="form-label-inventory">Category *</label>
                        <ModernDropdown
                          value={formData.category}
                          onChange={(val) => handleInputChange({ target: { name: 'category', value: val } })}
                          placeholder="Select product category"
                          searchable={true}
                          options={[
                            { value: "", label: "Select product category" },
                            ...categories.map(c => ({ value: c.name, label: c.name }))
                          ]}
                        />
                      </div>
                    </div>

                    {/* Section 2: Unit & Pricing */}
                    <div className="form-section-group">
                      <div className="form-section-title">
                        <FaLayerGroup /> Units & Pricing
                      </div>

                      <div className="form-grid-3">
                        {/* Unit */}
                        <div className="form-group-inventory" style={{ margin: 0 }}>
                          <label className="form-label-inventory">Unit *</label>
                          <ModernDropdown
                            value={formData.unit}
                            onChange={(val) => handleInputChange({ target: { name: 'unit', value: val } })}
                            placeholder="Select Unit"
                            options={[
                              { value: "kg", label: "kg (Kilogram)" },
                              { value: "ltr", label: "ltr (Liter)" },
                              { value: "pcs", label: "pcs (Pieces)" }
                            ]}
                          />
                        </div>

                        {/* Unit Size */}
                        <div className="form-group-inventory" style={{ margin: 0 }}>
                          <label className="form-label-inventory">Unit Size / Amount *</label>
                          <input
                            type="number"
                            name="unitValue"
                            placeholder="e.g. 1"
                            value={formData.unitValue || '1'}
                            onChange={handleInputChange}
                            className="form-input-inventory"
                            min="1"
                            required
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="form-group-inventory" style={{ margin: 0 }}>
                          <label className="form-label-inventory">Price (Rs)</label>
                          <input
                            type="number"
                            name="unitPrice"
                            placeholder="0.00"
                            value={formData.unitPrice || ''}
                            onChange={handleInputChange}
                            className="form-input-inventory"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Stock Thresholds */}
                    <div className="form-section-group">
                      <div className="form-section-title">
                        Stock Thresholds
                      </div>

                      <div className="form-grid-2">
                        {/* Minimum Stock */}
                        <div className="form-group-inventory" style={{ margin: 0 }}>
                          <label className="form-label-inventory">Minimum Stock Alert</label>
                          <div className="stepper-input-wrapper">
                            <input
                              type="number"
                              name="minStock"
                              placeholder="0"
                              value={formData.minStock}
                              onChange={handleInputChange}
                              className="form-input-inventory"
                              min="0"
                            />
                            <div className="stepper-btns">
                              <button type="button" className="stepper-btn" onClick={() => handleSpinner('minStock', 'up')}>▲</button>
                              <button type="button" className="stepper-btn" onClick={() => handleSpinner('minStock', 'down')}>▼</button>
                            </div>
                          </div>
                        </div>

                        {/* Maximum Stock */}
                        <div className="form-group-inventory" style={{ margin: 0 }}>
                          <label className="form-label-inventory">Maximum Stock Capacity</label>
                          <div className="stepper-input-wrapper">
                            <input
                              type="number"
                              name="maxStock"
                              placeholder="1000"
                              value={formData.maxStock}
                              onChange={handleInputChange}
                              className="form-input-inventory"
                              min="0"
                            />
                            <div className="stepper-btns">
                              <button type="button" className="stepper-btn" onClick={() => handleSpinner('maxStock', 'up')}>▲</button>
                              <button type="button" className="stepper-btn" onClick={() => handleSpinner('maxStock', 'down')}>▼</button>
                            </div>
                          </div>
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
              <button
                type="submit"
                form="add-item-form"
                className="modal-btn-inventory save"
                disabled={submitLoading}
              >
                {submitLoading ? 'Adding...' : '+ Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {showItemDetailModal && selectedItem && (
        <div className="modal-overlay-inventory" onClick={handleCloseItemDetailModal}>
          <div className="modal-content-inventory" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: 'min(92vw, 820px)', maxHeight: '88vh' }}>
            {/* Modal Header - Standard Project Purple Gradient */}
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">{selectedItem.name}</h2>
                <p className="modal-subtitle-inventory">
                  SKU / Item ID: <strong>{selectedItem.sku || selectedItem.itemId || selectedItem._id}</strong>
                </p>
              </div>
              <button className="modal-close-btn-inventory" onClick={handleCloseItemDetailModal}>
                <FaTimes />
              </button>
            </div>

            {/* Modal Body - Scrollable content */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '22px', overflowY: 'auto' }}>
              {/* Top Section: Item Image & Key Details Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '24px', alignItems: 'start' }}>
                {/* Item Image */}
                <div style={{ width: '160px', height: '160px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedItem.image ? (
                    <img src={selectedItem.image} alt={selectedItem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: '#94a3b8', fontWeight: '600', fontSize: '14px', textAlign: 'center' }}>
                      No Image
                    </div>
                  )}
                </div>

                {/* Primary Item Details Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 22px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 24px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Category</span>
                      <strong style={{ fontSize: '15px', color: '#1e293b' }}>
                        {typeof selectedItem.category === 'object'
                          ? (selectedItem.category.name || selectedItem.category.categoryName || 'N/A')
                          : (selectedItem.category || 'N/A')}
                      </strong>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Unit</span>
                      <strong style={{ fontSize: '15px', color: '#1e293b' }}>{cleanUnit(selectedItem.unit) || '-'}</strong>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Total In Stock</span>
                      <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                        {stockData && stockData.length > 0
                          ? stockData.reduce((total, stock) => total + (Number(stock.totalQuantity) || Number(stock.quantity) || 0), 0)
                          : (selectedItem.qty || selectedItem.quantity || 0)} {cleanUnit(selectedItem.unit)}
                      </strong>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Status</span>
                      <span className={`badge ${getStatusClass(selectedItem.status)}`} style={{ display: 'inline-block', marginTop: '3px' }}>
                        {selectedItem.status === 'normal' ? '✅ Normal' : selectedItem.status === 'low' ? '⚠️ Low Stock' : '❌ Out of Stock'}
                      </span>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Price Range</span>
                      <strong style={{ fontSize: '15px', color: '#4338ca' }}>
                        {(() => {
                          if (stockData && stockData.length > 0) {
                            const allPrices = Array.from(new Set(
                              stockData.flatMap(b => (b.units || []).map(u => Number(u.unitPrice) || 0))
                            )).filter(p => p > 0);
                            if (allPrices.length > 0) return getPriceRangeText(allPrices);
                          }
                          return selectedItem.priceRange || formatPrice(selectedItem.unitPrice);
                        })()}
                      </strong>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Total Stock Value</span>
                      <strong style={{ fontSize: '16px', color: '#059669' }}>
                        {stockData && stockData.length > 0
                          ? formatPrice(stockData.reduce((sum, b) => sum + (Number(b.totalValue) || 0), 0))
                          : formatPrice(getDisplayTotalValue(selectedItem))}
                      </strong>
                    </div>
                  </div>

                  {canEdit && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={handleEditItem}
                        className="modal-btn-inventory edit"
                      >
                        <FaEdit /> Edit Item
                      </button>
                      <button
                        type="button"
                        onClick={requestDeleteItem}
                        className="modal-btn-inventory delete"
                      >
                        <FaTrash /> Delete Item
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Stock by Branch & Price Tier Section */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
                      Stock by Branch & Price Tier
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Tracking multiple purchase prices per branch
                    </span>
                  </div>
                  {canEdit && (
                    <div>
                      {!isEditingPriceTiers ? (
                        <button
                          type="button"
                          onClick={handleStartEditPriceTiers}
                          className="modal-btn-inventory edit"
                          style={{ height: '32px', padding: '0 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <FaEdit /> Edit Quantities
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setIsEditingPriceTiers(false)}
                            className="modal-btn-inventory cancel"
                            style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSavePriceTiers}
                            disabled={savingPriceTiers}
                            className="modal-btn-inventory save"
                            style={{ height: '32px', padding: '0 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            {savingPriceTiers ? 'Saving...' : '💾 Save Changes'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isEditingPriceTiers && (
                  <div style={{
                    padding: '8px 14px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    fontSize: '12.5px',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>✏️</span>
                    <span><strong>Edit Mode:</strong> Change the quantity for any price tier below and click <strong>Save Changes</strong> to update stock.</span>
                  </div>
                )}

                <table className="item-detail-stock-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Branch Name</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Unit Price (LKR)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Quantity</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Stock Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockLoading ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                          <span style={{ display: 'inline-block', marginRight: '8px' }}>⏳</span> Loading stock and prices across branches...
                        </td>
                      </tr>
                    ) : (isEditingPriceTiers ? editablePriceTiers : stockData) && (isEditingPriceTiers ? editablePriceTiers : stockData).length > 0 ? (
                      (isEditingPriceTiers ? editablePriceTiers : stockData).map((stock, bIdx) => {
                        let branchName = stock.branchName || (stock.branch && (stock.branch.branchName || stock.branch.name)) || 'Unknown Branch';
                        const units = Array.isArray(stock.units) && stock.units.length > 0
                          ? stock.units
                          : [{ unitPrice: selectedItem.unitPrice || 0, quantity: stock.quantity || stock.totalQuantity || 0 }];

                        return (
                          <React.Fragment key={stock._id || stock.branchId || bIdx}>
                            {units.map((u, uIdx) => {
                              const tierPrice = Number(u.unitPrice) || 0;
                              const tierQty = Number(u.quantity) || 0;
                              const tierValue = tierQty * tierPrice;
                              const isLastUnit = uIdx === units.length - 1;

                              return (
                                <tr
                                  key={`${stock._id || stock.branchId || bIdx}_${uIdx}`}
                                  style={{
                                    borderBottom: isLastUnit ? '1px solid #e2e8f0' : '1px dashed #f1f5f9',
                                    backgroundColor: bIdx % 2 === 0 ? '#ffffff' : '#fafafa'
                                  }}
                                >
                                  {uIdx === 0 && (
                                    <td
                                      rowSpan={units.length}
                                      style={{
                                        padding: '12px 16px',
                                        fontWeight: '700',
                                        color: '#1e293b',
                                        verticalAlign: 'middle',
                                        borderRight: '1px solid #e2e8f0',
                                        backgroundColor: bIdx % 2 === 0 ? '#ffffff' : '#fafafa'
                                      }}
                                    >
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '14px', color: '#0f172a' }}>{branchName}</span>
                                        {units.length > 1 && (
                                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                                            Total: {stock.totalQuantity !== undefined ? stock.totalQuantity : (stock.quantity || 0)} {cleanUnit(selectedItem.unit)}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                  <td style={{ padding: '10px 16px' }}>
                                    <span style={{
                                      background: uIdx === 0 ? '#eff6ff' : '#f5f3ff',
                                      color: uIdx === 0 ? '#1d4ed8' : '#6d28d9',
                                      border: uIdx === 0 ? '1px solid #bfdbfe' : '1px solid #ddd6fe',
                                      padding: '3px 10px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      display: 'inline-block'
                                    }}>
                                      Rs. {tierPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {cleanUnit(selectedItem.unit)}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '600', color: '#1e293b' }}>
                                    {isEditingPriceTiers ? (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <input
                                          type="number"
                                          min="0"
                                          value={u.quantity !== undefined ? u.quantity : 0}
                                          onChange={(e) => handlePriceTierQtyChange(bIdx, uIdx, e.target.value)}
                                          style={{
                                            width: '80px',
                                            height: '32px',
                                            textAlign: 'center',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            border: '2px solid #2563eb',
                                            borderRadius: '6px',
                                            backgroundColor: '#eff6ff',
                                            color: '#1e293b'
                                          }}
                                        />
                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                                          {cleanUnit(selectedItem.unit)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span>{tierQty} {cleanUnit(selectedItem.unit)}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '700', color: '#059669' }}>
                                    Rs. {tierValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      branches.map(branchName => (
                        <tr key={branchName} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '600' }}>{branchName}</td>
                          <td style={{ padding: '12px 16px' }}>-</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>0 {cleanUnit(selectedItem?.unit)}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>Rs. 0.00</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {((isEditingPriceTiers ? editablePriceTiers : stockData) && (isEditingPriceTiers ? editablePriceTiers : stockData).length > 0) && (
                    <tfoot>
                      <tr style={{ background: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #e2e8f0' }}>
                        <td colSpan="2" style={{ padding: '14px 16px', color: '#334155' }}>Total Across All Branches</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: '#334155', fontSize: '15px' }}>
                          {(isEditingPriceTiers ? editablePriceTiers : stockData).reduce((sum, b) => {
                            if (Array.isArray(b.units) && b.units.length > 0) {
                              return sum + b.units.reduce((uSum, u) => uSum + (Number(u.quantity) || 0), 0);
                            }
                            return sum + (Number(b.totalQuantity) || Number(b.quantity) || 0);
                          }, 0)} {cleanUnit(selectedItem.unit)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#16a34a', fontSize: '15px' }}>
                          Rs {(isEditingPriceTiers ? editablePriceTiers : stockData).reduce((sum, b) => {
                            if (Array.isArray(b.units) && b.units.length > 0) {
                              return sum + b.units.reduce((uSum, u) => uSum + ((Number(u.quantity) || 0) * (Number(u.unitPrice) || 0)), 0);
                            }
                            return sum + ((Number(b.totalQuantity) || Number(b.quantity) || 0) * (Number(selectedItem.unitPrice) || 0));
                          }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditItemModal && (
        <div className="modal-overlay-inventory" onClick={handleCloseEditModal}>
          <div className="modal-content-inventory edit-item-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Edit Item - {editFormData.name || selectedItem?.name}</h2>
                <p className="modal-subtitle-inventory">Update item details, packaging, thresholds, and branch stock quantities</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={handleCloseEditModal} title="Close">
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body-inventory">
              <form id="edit-item-form" className="modal-form-inventory" onSubmit={handleEditSubmit}>
                <div className="add-item-layout-grid">
                  {/* Left Column: Product Photo & Barcode/SKU Card */}
                  <div className="add-item-media-col">
                    <div className="form-group-inventory" style={{ margin: 0 }}>
                      <label className="form-label-inventory">Item Photo</label>
                      {editImagePreview ? (
                        <div>
                          <div className="image-preview-wrapper">
                            <img src={editImagePreview} alt="Item preview" />
                          </div>
                          <div className="image-preview-actions">
                            <label htmlFor="edit-item-image-input" className="image-action-btn">
                              <FaUpload /> Change
                            </label>
                            <button
                              type="button"
                              className="image-action-btn danger"
                              onClick={() => {
                                setEditImagePreview(null);
                                setEditFormData(prev => ({ ...prev, image: null }));
                              }}
                            >
                              <FaTrash /> Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="edit-item-image-input"
                          className="image-dropzone-box"
                        >
                          <div className="image-dropzone-icon">
                            <FaCloudUploadAlt />
                          </div>
                          <div className="image-dropzone-title">Upload Product Image</div>
                          <div className="image-dropzone-sub">Click to browse or drop file here</div>
                          <div style={{ marginTop: '8px', fontSize: '10.5px', color: '#94a3b8' }}>PNG, JPG or WebP</div>
                        </label>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageUpload}
                        style={{ display: 'none' }}
                        id="edit-item-image-input"
                      />
                    </div>

                    {/* Barcode & SKU Card */}
                    <div className="sku-info-card">
                      <div className="sku-info-header">
                        <span className="sku-info-label">
                          <FaBarcode /> SKU / Barcode
                        </span>
                        <span className="sku-info-tag">Product Code</span>
                      </div>
                      <div className="sku-info-value">
                        {editFormData.sku || selectedItem?.sku || selectedItem?.itemId || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Organized Form Fields */}
                  <div className="add-item-fields-col">
                    {/* Section 1: General Info */}
                    <div className="form-section-group">
                      <div className="form-section-title">
                        <FaBoxOpen /> General Information
                      </div>

                      {/* Item Name */}
                      <div className="form-group-inventory" style={{ margin: 0 }}>
                        <label className="form-label-inventory">Item Name *</label>
                        <input
                          type="text"
                          name="name"
                          placeholder="e.g. Premium White Rice"
                          value={editFormData.name}
                          onChange={handleEditInputChange}
                          className="form-input-inventory"
                          required
                        />
                      </div>

                      {/* Category */}
                      <div className="form-group-inventory" style={{ margin: 0 }}>
                        <label className="form-label-inventory">Category *</label>
                        <ModernDropdown
                          value={typeof editFormData.category === 'object'
                            ? (editFormData.category?.name || editFormData.category?.categoryName || '')
                            : (editFormData.category || '')
                          }
                          onChange={(val) => handleEditInputChange({ target: { name: 'category', value: val } })}
                          placeholder="Select Category"
                          searchable={true}
                          options={[
                            { value: "", label: "Select Category" },
                            ...categories.map((cat) => ({
                              value: cat.name,
                              label: cat.name
                            }))
                          ]}
                        />
                      </div>
                    </div>

                    {/* Section 2: Unit & Pricing */}
                    <div className="form-section-group">
                      <div className="form-section-title">
                        <FaLayerGroup /> Units & Pricing
                      </div>

                      <div className="form-grid-3">
                        {/* Unit */}
                        <div className="form-group-inventory" style={{ margin: 0 }}>
                          <label className="form-label-inventory">Unit *</label>
                          <ModernDropdown
                            value={editFormData.unit}
                            onChange={(val) => handleEditInputChange({ target: { name: 'unit', value: val } })}
                            placeholder="Select Unit"
                            options={[
                              { value: "kg", label: "kg (Kilogram)" },
                              { value: "ltr", label: "ltr (Liter)" },
                              { value: "pcs", label: "pcs (Pieces)" }
                            ]}
                          />
                        </div>

                        {/* Unit Size */}
                        <div className="form-group-inventory" style={{ margin: 0 }}>
                          <label className="form-label-inventory">Unit Size / Amount *</label>
                          <input
                            type="number"
                            name="unitValue"
                            placeholder="e.g. 1"
                            value={editFormData.unitValue || '1'}
                            onChange={handleEditInputChange}
                            className="form-input-inventory"
                            min="1"
                            required
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="form-group-inventory" style={{ margin: 0 }}>
                          <label className="form-label-inventory">Price (Rs)</label>
                          <input
                            type="number"
                            name="unitPrice"
                            placeholder="0.00"
                            value={editFormData.unitPrice !== undefined ? editFormData.unitPrice : ''}
                            onChange={handleEditInputChange}
                            className="form-input-inventory"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Stock Quantities & Thresholds */}
                    <div className="form-section-group">
                      <div className="form-section-title">
                        Stock Quantities & Thresholds
                      </div>

                      <div className="form-grid-3">
                        {/* Total Quantity */}
                        <div className="form-group-inventory" style={{ margin: 0 }}>
                          <label className="form-label-inventory">Total Quantity ({cleanUnit(editFormData.unit)})</label>
                          <div className="stepper-input-wrapper">
                            <input
                              type="number"
                              name="quantity"
                              placeholder="0"
                              value={editFormData.quantity !== undefined ? editFormData.quantity : ''}
                              onChange={(e) => handleEditQuantityChange(e.target.value)}
                              className="form-input-inventory"
                              min="0"
                            />
                            <div className="stepper-btns">
                              <button type="button" className="stepper-btn" onClick={() => handleEditQuantityChange(Number(editFormData.quantity || 0) + 1)}>▲</button>
                              <button type="button" className="stepper-btn" onClick={() => handleEditQuantityChange(Math.max(0, Number(editFormData.quantity || 0) - 1))}>▼</button>
                            </div>
                          </div>
                        </div>

                        {/* Minimum Stock */}
                        <div className="form-group-inventory" style={{ margin: 0 }}>
                          <label className="form-label-inventory">Minimum Stock Alert</label>
                          <div className="stepper-input-wrapper">
                            <input
                              type="number"
                              name="minStock"
                              placeholder="0"
                              value={editFormData.minStock}
                              onChange={handleEditInputChange}
                              className="form-input-inventory"
                              min="0"
                            />
                            <div className="stepper-btns">
                              <button type="button" className="stepper-btn" onClick={() => handleEditSpinner('minStock', 'up')}>▲</button>
                              <button type="button" className="stepper-btn" onClick={() => handleEditSpinner('minStock', 'down')}>▼</button>
                            </div>
                          </div>
                        </div>

                        {/* Maximum Stock */}
                        <div className="form-group-inventory" style={{ margin: 0 }}>
                          <label className="form-label-inventory">Maximum Stock Capacity</label>
                          <div className="stepper-input-wrapper">
                            <input
                              type="number"
                              name="maxStock"
                              placeholder="1000"
                              value={editFormData.maxStock}
                              onChange={handleEditInputChange}
                              className="form-input-inventory"
                              min="0"
                            />
                            <div className="stepper-btns">
                              <button type="button" className="stepper-btn" onClick={() => handleEditSpinner('maxStock', 'up')}>▲</button>
                              <button type="button" className="stepper-btn" onClick={() => handleEditSpinner('maxStock', 'down')}>▼</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Branch Stock Distribution */}
                {editableStockData && editableStockData.length > 0 && (
                  <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                          Stock by Branch & Price Tier
                        </h3>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                          Adjust inventory quantities stored at each branch per purchase price tier
                        </p>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px' }}>
                        {editableStockData.length} Branches
                      </span>
                    </div>

                    <table className="edit-branch-stock-table">
                      <thead>
                        <tr>
                          <th style={{ width: '32%' }}>Branch Name</th>
                          <th style={{ width: '22%' }}>Unit Price (LKR)</th>
                          <th style={{ width: '16%', textAlign: 'center' }}>Current Stock</th>
                          <th style={{ width: '15%', textAlign: 'center' }}>Quantity ({cleanUnit(editFormData.unit)})</th>
                          <th style={{ width: '15%', textAlign: 'right' }}>Stock Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editableStockData.map((stock, bIdx) => {
                          let branchName = stock.branchName || (stock.branch && (stock.branch.branchName || stock.branch.name)) || 'Unknown Branch';
                          const units = Array.isArray(stock.units) && stock.units.length > 0
                            ? stock.units
                            : [{
                                unitPrice: Number(editFormData.unitPrice) || 0,
                                quantity: Number(stock.quantity) || 0,
                                originalQty: Number(stock.originalQty !== undefined ? stock.originalQty : stock.quantity) || 0
                              }];

                          return (
                            <React.Fragment key={stock._id || stock.branchId || bIdx}>
                              {units.map((u, uIdx) => {
                                const tierPrice = Number(u.unitPrice) || 0;
                                const originalTierQty = u.originalQty !== undefined ? u.originalQty : (u.quantity || 0);
                                const currentQty = u.quantity !== undefined ? u.quantity : 0;
                                const tierValue = currentQty * tierPrice;
                                const isLastUnit = uIdx === units.length - 1;

                                return (
                                  <tr
                                    key={`${stock._id || stock.branchId || bIdx}_${uIdx}`}
                                    style={{
                                      borderBottom: isLastUnit ? '1px solid #e2e8f0' : '1px dashed #f1f5f9',
                                      backgroundColor: bIdx % 2 === 0 ? '#ffffff' : '#fafafa'
                                    }}
                                  >
                                    {uIdx === 0 && (
                                      <td
                                        rowSpan={units.length}
                                        style={{
                                          padding: '12px 14px',
                                          fontWeight: '600',
                                          color: '#1e293b',
                                          verticalAlign: 'middle',
                                          borderRight: '1px solid #e2e8f0',
                                          backgroundColor: bIdx % 2 === 0 ? '#ffffff' : '#fafafa'
                                        }}
                                      >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '15px' }}>🏢</span>
                                            <span style={{ fontWeight: '700', fontSize: '13.5px', color: '#0f172a' }}>{branchName}</span>
                                          </div>
                                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
                                            Total: {stock.totalQuantity !== undefined ? stock.totalQuantity : (stock.quantity || 0)} {cleanUnit(editFormData.unit)}
                                          </span>
                                        </div>
                                      </td>
                                    )}
                                    <td style={{ padding: '10px 14px' }}>
                                      <span style={{
                                        background: uIdx === 0 ? '#eff6ff' : '#f5f3ff',
                                        color: uIdx === 0 ? '#1d4ed8' : '#6d28d9',
                                        border: uIdx === 0 ? '1px solid #bfdbfe' : '1px solid #ddd6fe',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11.5px',
                                        fontWeight: '700',
                                        display: 'inline-block'
                                      }}>
                                        Rs. {tierPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {cleanUnit(editFormData.unit)}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#64748b', padding: '10px 14px' }}>
                                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                                        {originalTierQty} {cleanUnit(editFormData.unit)}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                        <input
                                          type="number"
                                          min="0"
                                          value={currentQty}
                                          onChange={(e) => handleEditTierQuantityChange(bIdx, uIdx, e.target.value)}
                                          className="edit-stock-input"
                                          style={{ width: '75px', textAlign: 'center', fontWeight: '700' }}
                                        />
                                        <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>
                                          {cleanUnit(editFormData.unit)}
                                        </span>
                                      </div>
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: '#059669', fontSize: '13px' }}>
                                      Rs. {tierValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', fontWeight: '700', borderTop: '2px solid #e2e8f0' }}>
                          <td colSpan={2} style={{ padding: '12px 14px', color: '#334155', fontSize: '13px' }}>Total Across Branches</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                            {editableStockData.reduce((sum, b) => {
                              const bOriginal = (b.units && b.units.length > 0)
                                ? b.units.reduce((uSum, u) => uSum + (Number(u.originalQty !== undefined ? u.originalQty : u.quantity) || 0), 0)
                                : (Number(b.originalQty !== undefined ? b.originalQty : b.quantity) || 0);
                              return sum + bOriginal;
                            }, 0)} {cleanUnit(editFormData.unit)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#2563eb', fontSize: '14px', fontWeight: '800' }}>
                            {editableStockData.reduce((sum, b) => {
                              const bQty = (b.units && b.units.length > 0)
                                ? b.units.reduce((uSum, u) => uSum + (Number(u.quantity) || 0), 0)
                                : (Number(b.quantity || b.totalQuantity) || 0);
                              return sum + bQty;
                            }, 0)} {cleanUnit(editFormData.unit)}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: '#059669', fontSize: '14px', fontWeight: '800' }}>
                            Rs. {editableStockData.reduce((sum, b) => {
                              const bVal = (b.units && b.units.length > 0)
                                ? b.units.reduce((uSum, u) => uSum + ((Number(u.quantity) || 0) * (Number(u.unitPrice) || 0)), 0)
                                : ((Number(b.quantity || b.totalQuantity) || 0) * (Number(editFormData.unitPrice) || 0));
                              return sum + bVal;
                            }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer-inventory">
              <button type="button" className="modal-btn-inventory cancel" onClick={handleCloseEditModal}>
                Cancel
              </button>
              <button
                type="submit"
                form="edit-item-form"
                className="modal-btn-inventory save"
                disabled={submitLoading}
              >
                {submitLoading ? 'Saving...' : '💾 Save Changes'}
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
        onUseExistingItem={(matchedItem) => {
          const existing = items.find(i => 
            (matchedItem.productId && (i._id === matchedItem.productId || i.id === matchedItem.productId)) ||
            (matchedItem.sku && (i.sku === matchedItem.sku || i.itemId === matchedItem.sku)) ||
            (matchedItem.name && i.name.toLowerCase() === matchedItem.name.toLowerCase())
          );
          if (existing) {
            handleRowClick(existing);
          } else {
            setSelectedItem(matchedItem);
            setShowItemDetailModal(true);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.type === 'add' ? 'Add item?' : 'Delete item?'}
        message={pendingAction?.type === 'add'
          ? 'Are you sure you want to add this item?'
          : `Are you sure you want to delete ${pendingAction?.item?.name || 'this item'}?`}
        confirmLabel={pendingAction?.type === 'add' ? 'Add' : 'Delete'}
        tone={pendingAction?.type === 'add' ? 'success' : 'danger'}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          const action = pendingAction;
          setPendingAction(null);
          if (action?.type === 'add') await handleSubmit({ preventDefault: () => {} });
          if (action?.type === 'delete') await handleDeleteItem();
        }}
      />

      <ChatAssistant />
    </div>
  );
};

export default Inventory;
