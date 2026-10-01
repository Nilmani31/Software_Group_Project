import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import ChatAssistant from '../Components/ChatAssistant';
import ConfirmDialog from '../Components/ConfirmDialog';
import ModernDropdown from '../Components/ModernDropdown';
import { useForm, useFieldArray } from 'react-hook-form';
import * as grnService from '../services/grnService';
import * as poService from '../services/poService';
import {
  FaTimes,
  FaPlus,
  FaTrash,
  FaBoxOpen,
  FaTruck,
  FaFileInvoice,
  FaExclamationTriangle
} from 'react-icons/fa';

export default function GoodReceived() {
  const [list, setList] = useState([]);
  const [poList, setPoList] = useState([]);
  const [currentPOType, setCurrentPOType] = useState('Supplier');
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [grnToDelete, setGrnToDelete] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [editableGrn, setEditableGrn] = useState(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterBranch, setFilterBranch] = useState([]);
  const [branches, setBranches] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingCreate, setPendingCreate] = useState(null);
  const [page, setPage] = useState(1);
  const [inventoryItems, setInventoryItems] = useState([]);

  // Role check
  const roleId = localStorage.getItem('roleId') || '';
  const userRole = roleId.replace('ROLE_', '');
  let userPerms = [];
  try {
    userPerms = JSON.parse(localStorage.getItem('permissions') || '[]');
  } catch (e) {}
  const canEdit = userPerms.includes('ALL') || userPerms.includes('GOODS_RECEIVED');

  const { register, handleSubmit, control, reset, watch, setValue } = useForm({
    defaultValues: {
      items: [{ itemId: '', itemName: '', unit: '', unitPrice: '', quantityOrdered: '', quantityReceived: '' }]
    }
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" });

  // Fetch GRNs from API
  useEffect(() => {
    const fetchGRNs = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await grnService.getAllGRNs(page);
        if (response.success) {
          setList(response.data);
        }
      } catch (err) {
        setError('Failed to fetch GRNs: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGRNs();
  }, [page]);

  // Fetch Inventory Items
  useEffect(() => {
    const fetchInventoryItems = async () => {
      try {
        const response = await fetch('http://localhost:5005/api/items');
        const data = await response.json();
        setInventoryItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching inventory items:', err);
      }
    };
    fetchInventoryItems();
  }, []);

  // Fetch Branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('http://localhost:5005/api/branches');
        const data = await response.json();
        const branchList = Array.isArray(data) ? data : (data.data || []);
        setBranches(branchList);
      } catch (err) {
        console.error('Error fetching branches:', err);
      }
    };
    fetchBranches();
  }, []);

  // Fetch POs from API when create modal opens
  useEffect(() => {
    const fetchPOs = async () => {
      try {
        const response = await poService.getAllPOs();
        if (response.success) {
          setPoList(response.data);
        } else if (Array.isArray(response)) {
          setPoList(response);
        }
      } catch (err) {
        console.error('Error fetching POs:', err);
      }
    };

    fetchPOs();
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      const url = URL.createObjectURL(f);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const handlePOSelect = (poNumber) => {
    const selectedPO = poList.find(po => (po.poNumber || po.id) === poNumber);
    if (selectedPO) {
      // Fill form fields with PO data
      setValue('po', poNumber);

      // Determine if order is by Supplier or Branch
      const orderType = selectedPO.orderType || selectedPO.orderBy || 'Supplier';
      setCurrentPOType(orderType);

      let supplierNameValue = '';

      if (orderType === 'Branch') {
        // Fill with branch name for branch-type orders
        supplierNameValue = selectedPO.branch || selectedPO.branchName || '';
      } else {
        // Fill with supplier name for supplier-type orders
        supplierNameValue = selectedPO.supplier || selectedPO.supplierName || '';
      }

      setValue('supplierName', supplierNameValue);
      setValue('date', new Date().toISOString().substring(0, 10));
      setValue('receivedBy', localStorage.getItem('username') || '');

      // Populate items table from PO items
      let poItems = [];

      if (selectedPO.items && Array.isArray(selectedPO.items)) {
        // Handle array of items with individual properties
        poItems = selectedPO.items.map(item => {
          // If item is a string like "Item Name - unit x Quantity", parse it
          if (typeof item === 'string') {
            const parts = item.split(' x ');
            const fullName = parts[0] || '';
            // Extract pure name and unit if they are separated by ' - '
            const nameParts = fullName.split(' - ');
            const pureName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' - ') : fullName;
            const pureUnit = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

            return {
              itemId: '',
              itemName: pureName.trim(),
              unit: pureUnit.trim(),
              unitPrice: '',
              quantityOrdered: parts[1] ? parseInt(parts[1]) : '',
              quantityReceived: ''
            };
          }
          // If item is an object
          return {
            itemId: item._id || item.id || '',
            itemName: item.itemName || item.name || '',
            unit: item.unit || item.unitType || '',
            unitPrice: item.unitPrice || item.price || '',
            quantityOrdered: item.quantityOrdered || item.quantity || '',
            quantityReceived: ''
          };
        });
      }

      // If no items found, start with one empty item
      if (poItems.length === 0) {
        poItems = [{ itemId: '', itemName: '', unit: '', unitPrice: '', quantityOrdered: '', quantityReceived: '' }];
      }

      replace(poItems);

      console.log('Selected PO:', selectedPO, 'Order Type:', orderType, 'Items:', poItems);
    }
  };

  const onCreate = async (data) => {
    try {
      setLoading(true);
      setError('');

      // Validate items
      if (!data.items || data.items.length === 0) {
        setError('Please add at least one item to the GRN');
        setLoading(false);
        return;
      }

      // Check for empty item names
      const emptyItems = data.items.filter(item => !item.itemName || item.itemName.trim() === '');
      if (emptyItems.length > 0) {
        setError('All items must have a name');
        setLoading(false);
        return;
      }

      const selectedPO = poList.find(p => p.poNumber === data.po);
      const branchName = selectedPO?.createdByBranch || selectedPO?.branch || localStorage.getItem('branchName') || 'Colombo Main Branch';

      const grnData = {
        purchaseOrderId: data.purchaseOrderId || (selectedPO ? selectedPO._id : null),
        branch: branchName,
        items: data.items.map(item => ({
          itemId: item.itemId || '',
          itemName: item.itemName,
          quantityOrdered: parseInt(item.quantityOrdered) || 0,
          quantityReceived: parseInt(item.quantityReceived) || 0,
          unitPrice: parseInt(item.unitPrice) || 0,
          unit: item.unit || ''
        })),
        receivedDate: data.date || new Date().toISOString(),
        receivedBy: data.receivedBy || localStorage.getItem('username') || null,
        poNumber: data.po,
        supplierName: data.supplierName
      };

      console.log('Sending GRN data to backend:', grnData);
      const response = await grnService.createGRN(grnData);

      if (response.success) {
        // Add new GRN to the list
        setList(prevList => [response.data, ...prevList]);
        reset();
        setImagePreview(null);
        setOpenCreate(false);
        setCurrentPOType('Supplier');
        setError('');
      } else {
        setError(response.message || response.error || 'Failed to create GRN');
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to create GRN';
      setError('Error creating GRN: ' + errorMessage);
      console.error('GRN creation error details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGrn = (grn) => {
    setGrnToDelete(grn);
    setOpenDelete(true);
  };

  const requestCreate = (data) => {
    setPendingCreate(data);
  };

  const confirmDelete = async () => {
    if (grnToDelete && grnToDelete._id) {
      try {
        setLoading(true);
        setError('');
        const response = await grnService.deleteGRN(grnToDelete._id);

        if (response.success) {
          setList(prevList => prevList.filter(grn => grn._id !== grnToDelete._id));
          setOpenDelete(false);
          setGrnToDelete(null);
          setOpenView(false);
          setError('');
        } else {
          setError(response.message || 'Failed to delete GRN');
        }
      } catch (err) {
        setError('Error deleting GRN: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...editableItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditableItems(newItems);
  };

  const handleGrnChange = (field, value) => {
    setEditableGrn(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (selected && selected._id && editableGrn) {
      try {
        setLoading(true);
        setError('');

        const updateData = {
          items: editableItems.map(item => ({
            itemId: item.itemId,
            itemName: item.itemName,
            quantityOrdered: parseInt(item.quantityOrdered) || 0,
            quantityReceived: parseInt(item.quantityReceived) || 0,
            unitPrice: parseInt(item.unitPrice) || 0
          })),
          receivedDate: editableGrn.receivedDate,
          receivedBy: editableGrn.receivedBy
        };

        const response = await grnService.updateGRN(selected._id, updateData);

        if (response.success) {
          // Update the list
          setList(prevList =>
            prevList.map(grn =>
              grn._id === selected._id ? response.data : grn
            )
          );
          setOpenView(false);
          setError('');
        } else {
          setError(response.message || 'Failed to update GRN');
        }
      } catch (err) {
        setError('Error updating GRN: ' + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Unique branch names from branches API and existing GRN records
  const branchOptions = useMemo(() => {
    const set = new Set();
    branches.forEach(b => {
      const name = b.name || b.branchName;
      if (name) set.add(name);
    });
    list.forEach(g => {
      if (g.branch) set.add(g.branch);
    });
    return Array.from(set);
  }, [branches, list]);

  // Unique status list
  const uniqueStatuses = useMemo(() => {
    const defaultStatuses = ['Complete', 'Incomplete', 'Not Received'];
    const set = new Set(defaultStatuses);
    list.forEach(g => {
      if (g.status) set.add(g.status);
    });
    return Array.from(set);
  }, [list]);

  // Search & Filter functionality
  const filteredGrns = useMemo(() => {
    return list.filter(g => {
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || (
        (g.grnNumber && g.grnNumber.toLowerCase().includes(q)) ||
        (g.poNumber && g.poNumber.toLowerCase().includes(q)) ||
        (g.branch && g.branch.toLowerCase().includes(q)) ||
        (g.supplierName && g.supplierName.toLowerCase().includes(q)) ||
        (g.status && g.status.toLowerCase().includes(q))
      );

      const matchesStatus = 
        !filterStatus || 
        filterStatus.length === 0 || 
        (Array.isArray(filterStatus) ? filterStatus.includes(g.status) : g.status === filterStatus);

      const matchesBranch = 
        !filterBranch || 
        filterBranch.length === 0 || 
        (Array.isArray(filterBranch) ? filterBranch.includes(g.branch) : g.branch === filterBranch);

      return matchesQuery && matchesStatus && matchesBranch;
    });
  }, [list, query, filterStatus, filterBranch]);

  const getItemStatusClass = (status) => {
    if (status === 'Incomplete') return 'badge-blue-light';
    if (status === 'Complete') return 'badge-blue-dark';
    return 'badge-blue-outline';
  };

  const statusOptions = [
    { value: 'Not Received', label: 'Not Received' },
    { value: 'Incomplete', label: 'Incomplete' },
    { value: 'Complete', label: 'Complete' }
  ];

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
                      <div className="search-field">
                        <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.49 21.49 20 15.5 14zM4 9.5C4 6.46 6.46 4 9.5 4S15 6.46 15 9.5 12.54 15 9.5 15 4 12.54 4 9.5z" />
                        </svg>
                        <input
                          type="search"
                          placeholder="Search by GRN, PO number, or supplier..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Filter & Action Section (Right Aligned, matching PO page) */}
                    <div className="po-filters" style={{ marginLeft: 'auto' }}>
                      <div className="filter-group">
                        <label className="filter-label">Order Status:</label>
                        <ModernDropdown
                          options={uniqueStatuses.map(s => ({ value: s, label: s }))}
                          value={filterStatus}
                          onChange={(val) => setFilterStatus(val)}
                          placeholder="All Statuses"
                          multiple={true}
                          minWidth="130px"
                        />
                      </div>

                      <div className="filter-group">
                        <label className="filter-label">Branch:</label>
                        <ModernDropdown
                          options={branchOptions.map(b => ({ value: b, label: b }))}
                          value={filterBranch}
                          onChange={(val) => setFilterBranch(val)}
                          placeholder="All Branches"
                          multiple={true}
                          minWidth="135px"
                        />
                      </div>

                      <button
                        type="button"
                        className="btn-clear-filters"
                        onClick={() => {
                          setFilterStatus([]);
                          setFilterBranch([]);
                          setQuery('');
                        }}
                        disabled={!query && filterStatus.length === 0 && filterBranch.length === 0}
                      >
                        Clear Filters
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          className="btn-add"
                          onClick={() => {
                            reset({ items: [{ itemId: '', itemName: '', unit: '', unitPrice: '', quantityOrdered: '', quantityReceived: '' }] });
                            setImagePreview(null);
                            setOpenCreate(true);
                          }}
                          disabled={loading}
                        >
                          + New GRN
                        </button>
                      )}
                    </div>
                  </div>
                </header>

                {error && (
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#fee',
                    color: '#c00',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}>
                    {error}
                  </div>
                )}

                <div className="inventory-main" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}
                  {!loading && filteredGrns.length === 0 ? (
                    <div className="no-results">No GRNs found.</div>
                  ) : (
                    !loading && (
                      <div className="list-wrap" style={{ flex: 1, overflow: 'auto' }}>
                        <table className="inventory-table">
                          <thead>
                            <tr>
                              <th scope="col">GRN Number</th>
                              <th scope="col">PO Number</th>
                              <th scope="col">Branch</th>
                              <th scope="col">Total Items</th>
                              <th scope="col">Received Date</th>
                              <th scope="col">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredGrns.map(g => (
                              <tr
                                key={g._id}
                                className="inventory-row"
                                onClick={() => {
                                  setSelected(g);
                                  let resolvedItems = (g.items && g.items.length > 0) ? g.items : [];
                                  if (resolvedItems.length === 0 && g.poNumber && poList && poList.length > 0) {
                                    const matchedPo = poList.find(p => (p.poNumber || p.id) === g.poNumber);
                                    if (matchedPo && Array.isArray(matchedPo.items) && matchedPo.items.length > 0) {
                                      resolvedItems = matchedPo.items.map(it => {
                                        if (typeof it === 'string') {
                                          const parts = it.split(' x ');
                                          const nameParts = parts[0] ? parts[0].split(' - ') : ['Item'];
                                          return {
                                            itemName: nameParts[0].trim(),
                                            unit: nameParts[1] ? nameParts[1].trim() : 'units',
                                            quantityOrdered: parts[1] ? parseInt(parts[1]) : 0,
                                            quantityReceived: parts[1] ? parseInt(parts[1]) : 0,
                                            unitPrice: 0
                                          };
                                        }
                                        return {
                                          itemName: it.itemName || it.name || 'Item',
                                          unit: it.unit || 'units',
                                          quantityOrdered: it.quantityOrdered || it.quantity || 0,
                                          quantityReceived: it.quantityReceived || it.quantity || 0,
                                          unitPrice: it.unitPrice || it.price || 0
                                        };
                                      });
                                    }
                                  }
                                  setEditableItems(resolvedItems);
                                  setEditableGrn(g);
                                  setIsEditMode(false);
                                  setOpenView(true);
                                }}
                                title="Click to view details"
                                style={{ cursor: 'pointer' }}
                              >
                                <td>{g.grnNumber}</td>
                                <td>{g.poNumber}</td>
                                <td>
                                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>
                                    {g.branch || 'Colombo Main Branch'}
                                  </span>
                                </td>
                                <td>{g.items ? g.items.length : 0}</td>
                                <td>{new Date(g.receivedDate).toLocaleDateString()}</td>
                                <td>
                                  <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '9999px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    backgroundColor: (g.status === 'Complete' || g.status === 'Received' || g.status === 'Verified') ? '#ecfdf5' : (g.status === 'Incomplete' || g.status === 'Pending') ? '#fffbeb' : '#fef2f2',
                                    color: (g.status === 'Complete' || g.status === 'Received' || g.status === 'Verified') ? '#065f46' : (g.status === 'Incomplete' || g.status === 'Pending') ? '#92400e' : '#991b1b',
                                    border: `1px solid ${(g.status === 'Complete' || g.status === 'Received' || g.status === 'Verified') ? '#a7f3d0' : (g.status === 'Incomplete' || g.status === 'Pending') ? '#fde68a' : '#fecaca'}`
                                  }}>
                                    {g.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              </main>
            </div>
          </div>
        </main>
      </div>

      {/* Create GRN Modal - Professional Design */}
      {openCreate && (
        <div className="modal-overlay-inventory" onClick={() => { setOpenCreate(false); setCurrentPOType('Supplier'); }}>
          <div className="modal-content-inventory add-item-modal create-grn-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Create Goods Received Note</h2>
                <p className="modal-subtitle-inventory">Record verified physical inventory intake against Purchase Orders</p>
              </div>
              <button
                type="button"
                className="modal-close-btn-inventory"
                onClick={() => { setOpenCreate(false); setCurrentPOType('Supplier'); }}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-body-inventory">
              <form id="create-grn-form" onSubmit={handleSubmit(requestCreate)} className="modal-form-inventory">
                {error && (
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    borderRadius: '8px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid #fecaca'
                  }}>
                    <FaExclamationTriangle />
                    <span>{error}</span>
                  </div>
                )}

                {/* Top Reference Card (matching SKU card from Add Item modal) */}
                <div className="sku-info-card">
                  <div className="sku-info-header">
                    <span className="sku-info-label">
                      <FaFileInvoice /> Document Type & Intake Source
                    </span>
                    <span className="sku-info-tag">
                      {currentPOType === 'Branch' ? 'Internal Branch Transfer' : 'Supplier Procurement'}
                    </span>
                  </div>
                  <div className="sku-info-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span>{watch('po') ? `Linked to ${watch('po')}` : 'Manual / Direct GRN Intake'}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      Source: <strong style={{ color: 'var(--text-primary)' }}>{currentPOType === 'Branch' ? 'Internal Branch Delivery' : 'External Supplier Delivery'}</strong>
                    </span>
                  </div>
                </div>

                {/* Section 1: Order & Goods Intake Details */}
                <div className="form-section-group">
                  <div className="form-section-title">
                    <FaTruck /> Order & Goods Intake Details
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Purchase Order *</label>
                      <ModernDropdown
                        value={watch('po') || ''}
                        onChange={(val) => {
                          setValue('po', val);
                          handlePOSelect(val);
                        }}
                        placeholder="Select Purchase Order"
                        searchable={true}
                        options={[
                          { value: '', label: '-- Select Purchase Order --' },
                          ...(poList && poList.length > 0 ? poList
                            .filter(po => po.status === 'Pending')
                            .map(po => {
                              const orderType = po.orderType || po.orderBy || 'Supplier';
                              const displayName = orderType === 'Branch'
                                ? (po.branch || po.branchName || 'N/A')
                                : (po.supplier || po.supplierName || 'N/A');
                              const status = po.status || 'Pending';
                              return {
                                value: po.poNumber || po.id,
                                label: `${po.poNumber || po.id} - ${displayName}`,
                                subtitle: `${orderType} · ${status}`
                              };
                            }) : [])
                        ]}
                      />
                    </div>

                    <div className="form-group-inventory">
                      <label className="form-label-inventory">
                        {currentPOType === 'Branch' ? 'Fulfilling Branch' : 'Supplier Name'}
                      </label>
                      <input
                        {...register('supplierName')}
                        placeholder={currentPOType === 'Branch' ? 'Auto-filled from PO Branch' : 'Auto-filled from PO Supplier'}
                        className="form-input-inventory"
                        style={{ backgroundColor: watch('po') ? '#f8fafc' : 'white' }}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Received Date *</label>
                      <input
                        {...register('date')}
                        type="date"
                        defaultValue={new Date().toISOString().substring(0, 10)}
                        className="form-input-inventory"
                        required
                      />
                    </div>
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Received By (Employee ID / Name)</label>
                      <input
                        {...register('receivedBy')}
                        placeholder="e.g. EMP-104 or Username"
                        className="form-input-inventory"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Items Received */}
                <div className="form-section-group">
                  <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaBoxOpen /> Verified Items Received
                    </span>
                    <span className="sku-info-tag">
                      {fields.length} {fields.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Clean Items Table Wrap */}
                  <div className="po-detail-table-wrap" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <table className="po-detail-table" style={{ margin: 0, minWidth: '650px' }}>
                      <thead>
                        <tr>
                          <th>Item Name</th>
                          <th style={{ width: '90px' }}>Unit</th>
                          <th style={{ width: '110px' }}>Unit Price (Rs)</th>
                          <th style={{ width: '100px', textAlign: 'center' }}>Qty Ordered</th>
                          <th style={{ width: '110px', textAlign: 'center' }}>Qty Received</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => (
                          <tr key={field.id}>
                            <td>
                              <select
                                {...register(`items.${index}.itemName`)}
                                className="form-input-inventory"
                                style={{
                                  fontSize: '13px',
                                  height: '34px',
                                  backgroundColor: watch('po') ? '#f8fafc' : 'white',
                                  pointerEvents: watch('po') ? 'none' : 'auto'
                                }}
                                readOnly={!!watch('po')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setValue(`items.${index}.itemName`, val);
                                  const selectedItem = inventoryItems.find(i => i.name === val);
                                  if (selectedItem) {
                                    setValue(`items.${index}.itemId`, selectedItem.originalId || selectedItem._id);
                                    setValue(`items.${index}.unit`, selectedItem.unit || 'kg');
                                    setValue(`items.${index}.unitPrice`, selectedItem.unitPrice || 0);
                                  }
                                }}
                              >
                                <option value="">Select Item</option>
                                {inventoryItems.map((invItem) => (
                                  <option key={invItem.uniqueId || invItem._id} value={invItem.name}>
                                    {invItem.name} ({invItem.unit})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                {...register(`items.${index}.unit`)}
                                placeholder="Unit"
                                className="form-input-inventory"
                                style={{
                                  fontSize: '13px',
                                  height: '34px',
                                  backgroundColor: watch('po') ? '#f8fafc' : 'white',
                                  pointerEvents: watch('po') ? 'none' : 'auto'
                                }}
                                readOnly={!!watch('po')}
                              />
                            </td>
                            <td>
                              <input
                                {...register(`items.${index}.unitPrice`)}
                                placeholder="0.00"
                                type="number"
                                step="0.01"
                                className="form-input-inventory"
                                style={{ fontSize: '13px', height: '34px' }}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                {...register(`items.${index}.quantityOrdered`)}
                                placeholder="0"
                                type="number"
                                className="form-input-inventory"
                                style={{
                                  fontSize: '13px',
                                  height: '34px',
                                  textAlign: 'center',
                                  backgroundColor: watch('po') ? '#f8fafc' : 'white',
                                  pointerEvents: watch('po') ? 'none' : 'auto'
                                }}
                                readOnly={!!watch('po')}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                {...register(`items.${index}.quantityReceived`)}
                                placeholder="0"
                                type="number"
                                className="form-input-inventory"
                                style={{ fontSize: '13px', height: '34px', textAlign: 'center', borderColor: '#2563eb', fontWeight: 600 }}
                                required
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {!watch('po') ? (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="modal-btn-inventory delete"
                                  style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
                                  title="Remove item"
                                >
                                  <FaTrash />
                                </button>
                              ) : (
                                <span className="sku-info-tag" style={{ fontSize: '10px' }}>PO Linked</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!watch('po') && (
                    <button
                      type="button"
                      onClick={() => append({ itemId: '', itemName: '', unit: '', unitPrice: '', quantityOrdered: '', quantityReceived: '' })}
                      className="modal-btn-inventory save"
                      style={{ marginTop: '10px', alignSelf: 'flex-start' }}
                    >
                      <FaPlus /> Add Line Item
                    </button>
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
                  setOpenCreate(false);
                  setCurrentPOType('Supplier');
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-grn-form"
                className="modal-btn-inventory save"
                disabled={loading}
              >
                <FaPlus /> {loading ? 'Creating...' : 'Create Goods Received Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View / Edit Goods Received Note Modal */}
      {openView && selected && (
        <div className="modal-overlay-inventory" onClick={() => { setOpenView(false); setIsEditMode(false); }}>
          <div className="modal-content-inventory" style={{ maxWidth: '820px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">
                  {isEditMode ? 'Edit Goods Received Note' : 'Goods Received Note Details'}
                </h2>
                <p className="modal-subtitle-inventory">
                  {isEditMode ? 'Update receipt information, quantities, or received items' : 'Official record of verified received items and stock intake'}
                </p>
              </div>
              <button type="button" className="modal-close-btn-inventory" onClick={() => { setOpenView(false); setIsEditMode(false); }} title="Close"><FaTimes /></button>
            </div>

            <div className="modal-body-inventory">
              {error && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '16px',
                  border: '1px solid #fecaca'
                }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Number and Status Badge Header Row */}
              <div className="po-detail-number-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600, display: 'block' }}>GRN Identifier</span>
                  <span className="po-detail-number" style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{selected.grnNumber}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {selected.poNumber && (
                    <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                      PO: {selected.poNumber}
                    </span>
                  )}
                  {isEditMode ? (
                    <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
                      ✏️ EDITING MODE
                    </span>
                  ) : (
                    <span className="po-detail-badge received">
                      {selected.status || 'RECEIVED'}
                    </span>
                  )}
                </div>
              </div>

              {!isEditMode ? (
                /* ================= VIEW MODE ================= */
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Receipt Overview
                  </h4>
                  <div className="po-detail-info-grid" style={{ marginBottom: '24px' }}>
                    <div>
                      <span className="po-detail-label">PURCHASE ORDER</span>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{selected.poNumber || '-'}</div>
                    </div>
                    <div>
                      <span className="po-detail-label">SUPPLIER / SOURCE</span>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{selected.supplierName || 'Main Store / Supplier'}</div>
                    </div>
                    <div>
                      <span className="po-detail-label">RECEIVING BRANCH</span>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{selected.branch || 'Colombo Main Branch'}</div>
                    </div>
                    <div>
                      <span className="po-detail-label">RECEIVED DATE</span>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {selected.receivedDate ? new Date(selected.receivedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                      </div>
                    </div>
                    <div>
                      <span className="po-detail-label">RECEIVED BY</span>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{selected.receivedBy || 'admin'}</div>
                    </div>
                    <div>
                      <span className="po-detail-label">STOCK STATUS</span>
                      <div style={{ fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                        Verified & Stocked
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 12px 0' }}>
                    <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Received Items Breakdown
                    </h4>
                    <span style={{ fontSize: '12px', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '12px' }}>
                      {editableItems.length} {editableItems.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {editableItems.length > 0 ? (
                    <div className="po-detail-table-wrap">
                      <table className="po-detail-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                            <th>Item Name</th>
                            <th style={{ width: '90px', textAlign: 'center' }}>Unit</th>
                            <th style={{ width: '110px', textAlign: 'right' }}>Unit Price</th>
                            <th style={{ width: '110px', textAlign: 'center' }}>Qty Ordered</th>
                            <th style={{ width: '110px', textAlign: 'center' }}>Qty Received</th>
                            <th style={{ width: '130px', textAlign: 'right' }}>Total Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editableItems.map((item, idx) => {
                            const unitPrice = Number(item.unitPrice) || 0;
                            const qtyOrdered = Number(item.quantityOrdered) || 0;
                            const qtyReceived = Number(item.quantityReceived) || 0;
                            const totalVal = qtyReceived * unitPrice;
                            return (
                              <tr key={idx}>
                                <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                <td style={{ fontWeight: 600, color: '#1e293b' }}>{item.itemName || 'Item'}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '11px', color: '#475569', fontWeight: 500 }}>
                                    {item.unit || 'units'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', color: '#475569' }}>
                                  {unitPrice > 0 ? `LKR ${unitPrice.toLocaleString()}` : '-'}
                                </td>
                                <td style={{ textAlign: 'center', color: '#64748b' }}>
                                  {qtyOrdered}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                    color: '#065f46',
                                    backgroundColor: '#d1fae5'
                                  }}>
                                    {qtyReceived}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                                  {totalVal > 0 ? `LKR ${totalVal.toLocaleString()}` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, color: '#334155' }}>Total Intake:</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                              {editableItems.reduce((acc, cur) => acc + (Number(cur.quantityOrdered) || 0), 0)}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                              {editableItems.reduce((acc, cur) => acc + (Number(cur.quantityReceived) || 0), 0)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                              {(() => {
                                const total = editableItems.reduce((acc, cur) => acc + ((Number(cur.quantityReceived) || 0) * (Number(cur.unitPrice) || 0)), 0);
                                return total > 0 ? `LKR ${total.toLocaleString()}` : '-';
                              })()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '36px 20px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px dashed #cbd5e1',
                      color: '#64748b'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: '14px', color: '#334155' }}>No Itemised Records Found</p>
                      <p style={{ margin: 0, fontSize: '12px' }}>This GRN was recorded under general purchase order intake without line-item breakdown.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* ================= EDIT MODE ================= */
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Edit Receipt Header
                  </h4>
                  <div className="form-layout-inventory" style={{ marginBottom: '20px' }}>
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">GRN Number</label>
                      <input
                        value={editableGrn.grnNumber}
                        className="form-input-inventory"
                        disabled
                        style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                      />
                    </div>
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">PO Number</label>
                      <input
                        value={editableGrn.poNumber || ''}
                        onChange={e => handleGrnChange('poNumber', e.target.value)}
                        className="form-input-inventory"
                        placeholder="e.g. PO-2026-004"
                      />
                    </div>
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Received Date</label>
                      <input
                        type="date"
                        value={editableGrn.receivedDate ? editableGrn.receivedDate.substring(0, 10) : ''}
                        onChange={e => handleGrnChange('receivedDate', e.target.value)}
                        className="form-input-inventory"
                      />
                    </div>
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Received By</label>
                      <input
                        value={editableGrn.receivedBy || ''}
                        onChange={e => handleGrnChange('receivedBy', e.target.value)}
                        className="form-input-inventory"
                        placeholder="e.g. admin"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 12px 0' }}>
                    <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Edit Received Items
                    </h4>
                    <button
                      type="button"
                      className="modal-btn-inventory cancel"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => setEditableItems(prev => [...prev, { itemId: '', itemName: '', unit: 'units', unitPrice: 0, quantityOrdered: 1, quantityReceived: 1 }])}
                    >
                      + Add Item
                    </button>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    {editableItems.map((item, index) => (
                      <div key={index} style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px',
                        gap: '8px',
                        alignItems: 'center',
                        marginBottom: '8px',
                        padding: '10px 12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}>
                        <ModernDropdown
                          value={item.itemName || ''}
                          onChange={val => {
                            const selectedItem = inventoryItems.find(i => i.name === val);
                            handleItemChange(index, 'itemName', val);
                            if (selectedItem) {
                              handleItemChange(index, 'itemId', selectedItem.originalId || selectedItem._id);
                              handleItemChange(index, 'unit', selectedItem.unit || 'units');
                              handleItemChange(index, 'unitPrice', selectedItem.unitPrice || 0);
                            }
                          }}
                          placeholder="Select Item"
                          searchable={true}
                          fullWidth={true}
                          options={[
                            { value: '', label: 'Select Item' },
                            ...inventoryItems.map((invItem) => ({
                              value: invItem.name,
                              label: `${invItem.name} (${invItem.unit})`
                            }))
                          ]}
                        />
                        <input
                          type="text"
                          placeholder="Unit"
                          value={item.unit || ''}
                          onChange={e => handleItemChange(index, 'unit', e.target.value)}
                          className="form-input-inventory"
                          style={{ fontSize: '13px', width: '100%', minWidth: 0 }}
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          value={item.unitPrice || ''}
                          onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="form-input-inventory"
                          style={{ fontSize: '13px', width: '100%', minWidth: 0 }}
                        />
                        <input
                          type="number"
                          placeholder="Ordered"
                          value={item.quantityOrdered || ''}
                          onChange={e => handleItemChange(index, 'quantityOrdered', e.target.value)}
                          className="form-input-inventory"
                          style={{ fontSize: '13px', width: '100%', minWidth: 0 }}
                        />
                        <input
                          type="number"
                          placeholder="Received"
                          value={item.quantityReceived || ''}
                          onChange={e => handleItemChange(index, 'quantityReceived', e.target.value)}
                          className="form-input-inventory"
                          style={{ fontSize: '13px', width: '100%', minWidth: 0 }}
                        />
                        <button
                          type="button"
                          onClick={() => setEditableItems(prev => prev.filter((_, i) => i !== index))}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                          title="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer-inventory" style={{ justifyContent: 'space-between' }}>
              <div>
                {!isEditMode && canEdit && (
                  <button
                    className="modal-btn-inventory delete"
                    onClick={() => handleDeleteGrn(selected)}
                    disabled={loading}
                  >
                    Delete GRN
                  </button>
                )}
                {isEditMode && (
                  <button
                    className="modal-btn-inventory cancel"
                    onClick={() => setIsEditMode(false)}
                    disabled={loading}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!isEditMode ? (
                  <>
                    {canEdit && (
                      <button
                        className="modal-btn-inventory edit"
                        onClick={() => setIsEditMode(true)}
                      >
                        Edit GRN
                      </button>
                    )}
                    <button
                      className="modal-btn-inventory cancel"
                      onClick={() => { setOpenView(false); setIsEditMode(false); }}
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <button
                    className="modal-btn-inventory save"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={openDelete || Boolean(pendingCreate)}
        title={pendingCreate ? 'Add goods received note?' : 'Delete goods received note?'}
        message={pendingCreate
          ? 'Are you sure you want to add this goods received note?'
          : `Are you sure you want to delete ${grnToDelete?.grnNumber || 'this goods received note'}?`}
        confirmLabel={pendingCreate ? 'Add' : 'Delete'}
        tone={pendingCreate ? 'success' : 'danger'}
        onCancel={() => {
          setPendingCreate(null);
          setOpenDelete(false);
        }}
        onConfirm={async () => {
          if (pendingCreate) {
            const data = pendingCreate;
            setPendingCreate(null);
            await onCreate(data);
          } else {
            await confirmDelete();
          }
        }}
      />

      <ChatAssistant />
    </div>
  );
}