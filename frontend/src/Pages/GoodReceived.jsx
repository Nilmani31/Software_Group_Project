import React, { useState, useEffect } from 'react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import ChatAssistant from '../Components/ChatAssistant';
import { useForm, useFieldArray } from 'react-hook-form';
import * as grnService from '../services/grnService';
import * as poService from '../services/poService';
import './GoodReceived.css';
import './Inventory.css';

export default function GoodReceived() {
  const [list, setList] = useState([]);
  const [poList, setPoList] = useState([]);
  const [currentPOType, setCurrentPOType] = useState('Supplier');
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [grnToDelete, setGrnToDelete] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [editableGrn, setEditableGrn] = useState(null);
  const [query, setQuery] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

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

  // Fetch POs from API when create modal opens
  useEffect(() => {
    if (!openCreate) return;

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
  }, [openCreate]);

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
          // If item is a string like "Item Name x Quantity", parse it
          if (typeof item === 'string') {
            const parts = item.split(' x ');
            return {
              itemId: '',
              itemName: parts[0] || '',
              unit: '',
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

      const grnData = {
        purchaseOrderId: data.purchaseOrderId || null,
        items: data.items.map(item => ({
          itemId: item.itemId || '',
          itemName: item.itemName,
          quantityOrdered: parseInt(item.quantityOrdered) || 0,
          quantityReceived: parseInt(item.quantityReceived) || 0,
          unitPrice: parseInt(item.unitPrice) || 0,
          unit: item.unit || ''
        })),
        receivedDate: data.date || new Date().toISOString(),
        receivedBy: data.receivedBy || null,
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

  // Search functionality
  const filteredGrns = list.filter(g => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (g.grnNumber && g.grnNumber.toLowerCase().includes(q)) ||
      (g.poNumber && g.poNumber.toLowerCase().includes(q))
    );
  });

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
                          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.49 21.49 20 15.5 14zM4 9.5C4 6.46 6.46 4 9.5 4S15 6.46 15 9.5 12.54 15 9.5 15 4 12.54 4 9.5z"/>
                        </svg>
                        <input
                          type="search"
                          placeholder="Search by GRN or PO number..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="inventory-actions">
                      <button className="btn btn-add" onClick={() => {
                        reset({ items: [{ itemId: '', itemName: '', unit: '', unitPrice: '', quantityOrdered: '', quantityReceived: '' }] });
                        setImagePreview(null);
                        setOpenCreate(true);
                      }} disabled={loading}>
                        + New GRN
                      </button>
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
                              <th scope="col">Total Items</th>
                              <th scope="col">Received Date</th>
                              <th scope="col">Status</th>
                              <th scope="col" style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredGrns.map(g => (
                              <tr key={g._id} className="inventory-row">
                                <td>{g.grnNumber}</td>
                                <td>{g.poNumber}</td>
                                <td>{g.items ? g.items.length : 0}</td>
                                <td>{new Date(g.receivedDate).toLocaleDateString()}</td>
                                <td>
                                  <span style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#e0f2fe',
                                    color: '#0369a1',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}>
                                    {g.status}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    className="btn-view-details"
                                    onClick={() => {
                                      setSelected(g);
                                      setEditableItems(g.items || []);
                                      setEditableGrn(g);
                                      setOpenView(true);
                                    }}
                                    disabled={loading}
                                  >
                                    View Details
                                  </button>
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
          <div className="modal-content-inventory" onClick={e => e.stopPropagation()}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Create Goods Received Note</h2>
                <p className="modal-subtitle-inventory">Add a new goods received note (GRN) from supplier</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={() => { setOpenCreate(false); setCurrentPOType('Supplier'); }} aria-label="Close">×</button>
            </div>
            <div className="modal-body-inventory">
              <form onSubmit={handleSubmit(onCreate)} className="modal-form-inventory">
                {error && (
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#fee',
                    color: '#c00',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '16px',
                    border: '1px solid #fcc'
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#667eea' }}>Goods Details</h4>
                <div className="form-layout-inventory">
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Purchase Order Number</label>
                    <select 
                      {...register('po')} 
                      onChange={(e) => handlePOSelect(e.target.value)}
                      className="form-input-inventory"
                    >
                      <option value="">-- Select Purchase Order --</option>
                      {poList && poList.length > 0 ? (
                        poList
                          .filter(po => po.status === 'Pending')
                          .map((po, idx) => {
                            const orderType = po.orderType || po.orderBy || 'Supplier';
                            const displayName = orderType === 'Branch' 
                              ? (po.branch || po.branchName || 'N/A')
                              : (po.supplier || po.supplierName || 'N/A');
                            const status = po.status || 'Pending';
                            return (
                              <option key={idx} value={po.poNumber || po.id}>
                                {po.poNumber || po.id} - {displayName} ({orderType}) - {status}
                              </option>
                            );
                          })
                      ) : (
                        <option disabled>No pending purchase orders available</option>
                      )}
                    </select>
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">{currentPOType === 'Branch' ? 'Branch Name' : 'Supplier Name'}</label>
                    <input {...register('supplierName')} placeholder={currentPOType === 'Branch' ? 'Auto-filled from PO Branch' : 'Auto-filled from PO Supplier'} className="form-input-inventory" />
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Received Date</label>
                    <input {...register('date')} type="date" defaultValue={new Date().toISOString().substring(0, 10)} className="form-input-inventory" />
                  </div>
                  <div className="form-group-inventory">
                    <label className="form-label-inventory">Received By</label>
                    <input {...register('receivedBy')} placeholder="Employee ID" className="form-input-inventory" />
                  </div>
                </div>

                <h4 style={{ margin: '24px 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#667eea' }}>Items Received</h4>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 0.8fr', 
                    gap: '8px', 
                    marginBottom: '12px', 
                    fontWeight: '600', 
                    fontSize: '12px', 
                    color: '#667eea',
                    padding: '8px 12px',
                    backgroundColor: '#f0f4ff',
                    borderRadius: '6px',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <div style={{ minWidth: 0 }}>Item Name</div>
                    <div style={{ minWidth: 0 }}>Unit</div>
                    <div style={{ minWidth: 0 }}>Unit Price</div>
                    <div style={{ minWidth: 0 }}>Qty Ordered</div>
                    <div style={{ minWidth: 0 }}>Qty Received</div>
                    <div style={{ textAlign: 'center', minWidth: 0 }}>Action</div>
                  </div>

                  {fields.map((field, index) => (
                    <div key={field.id} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 0.8fr', 
                      gap: '8px', 
                      alignItems: 'center', 
                      marginBottom: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      transition: 'all 0.2s',
                      width: '100%'
                    }}>
                      <input {...register(`items.${index}.itemName`)} placeholder="Item Name" className="form-input-inventory" style={{ fontSize: '13px', width: '100%', minWidth: 0 }} />
                      <input {...register(`items.${index}.unit`)} placeholder="kg/units" className="form-input-inventory" style={{ fontSize: '13px', width: '100%', minWidth: 0 }} />
                      <input {...register(`items.${index}.unitPrice`)} placeholder="Price" type="number" className="form-input-inventory" style={{ fontSize: '13px', width: '100%', minWidth: 0 }} />
                      <input {...register(`items.${index}.quantityOrdered`)} placeholder="0" type="number" className="form-input-inventory" style={{ fontSize: '13px', width: '100%', minWidth: 0 }} />
                      <input {...register(`items.${index}.quantityReceived`)} placeholder="0" type="number" className="form-input-inventory" style={{ fontSize: '13px', width: '100%', minWidth: 0 }} />
                      <button 
                        type="button" 
                        onClick={() => remove(index)} 
                        className="modal-btn-inventory cancel"
                        style={{ padding: '6px 8px', fontSize: '11px', width: '100%', minWidth: 0 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <button 
                    type="button" 
                    onClick={() => append({ itemId: '', itemName: '', unit: '', unitPrice: '', quantityOrdered: '', quantityReceived: '' })} 
                    className="modal-btn-inventory cancel"
                    style={{ marginTop: '8px', padding: '10px 16px' }}
                  >
                    + Add Item
                  </button>
                </div>

                <div className="modal-footer-inventory" style={{ justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    className="modal-btn-inventory submit"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create GRN'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View/Edit GRN Modal - Professional Design */}
      {openView && selected && editableGrn && (
        <div className="modal-overlay-inventory" onClick={() => setOpenView(false)}>
          <div className="modal-content-inventory" onClick={e => e.stopPropagation()}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">GRN Details</h2>
                <p className="modal-subtitle-inventory">View and manage goods received note information</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={() => setOpenView(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-body-inventory">
              {error && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#fee',
                  color: '#c00',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginBottom: '16px',
                  border: '1px solid #fcc'
                }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666', fontWeight: 600 }}>GRN Number</p>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>{selected.grnNumber}</h3>
                </div>
                <div>
                  <span style={{
                    padding: '6px 12px',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {editableGrn.status}
                  </span>
                </div>
              </div>

              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#667eea' }}>Receipt Information</h4>
              <div className="form-layout-inventory">
                <div className="form-group-inventory">
                  <label className="form-label-inventory">GRN Number</label>
                  <input 
                    value={editableGrn.grnNumber} 
                    className="form-input-inventory" 
                    readOnly
                    style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                  />
                </div>
                <div className="form-group-inventory">
                  <label className="form-label-inventory">PO Number</label>
                  <input 
                    value={editableGrn.poNumber || ''} 
                    onChange={e => handleGrnChange('poNumber', e.target.value)} 
                    className="form-input-inventory" 
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
                  <label className="form-label-inventory">Status</label>
                  <input 
                    value={editableGrn.status || ''} 
                    className="form-input-inventory" 
                    readOnly
                    style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              <h4 style={{ margin: '24px 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#667eea' }}>Items Received</h4>
              <div style={{ marginBottom: '16px', overflowX: 'auto' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', 
                  gap: '8px', 
                  marginBottom: '12px', 
                  fontWeight: '600', 
                  fontSize: '12px', 
                  color: '#667eea',
                  padding: '8px 12px',
                  backgroundColor: '#f0f4ff',
                  borderRadius: '6px',
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <div style={{ minWidth: 0 }}>Item Name</div>
                  <div style={{ minWidth: 0 }}>Unit</div>
                  <div style={{ minWidth: 0 }}>Unit Price</div>
                  <div style={{ minWidth: 0 }}>Qty Ordered</div>
                  <div style={{ minWidth: 0 }}>Qty Received</div>
                </div>

                {editableItems.map((item, index) => (
                  <div key={index} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', 
                    gap: '8px', 
                    alignItems: 'center', 
                    marginBottom: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}>
                    <input
                      type="text"
                      value={item.itemName || ''}
                      onChange={e => handleItemChange(index, 'itemName', e.target.value)}
                      className="form-input-inventory"
                      style={{ fontSize: '13px', width: '100%', minWidth: 0 }}
                    />
                    <input
                      type="text"
                      value={item.unit || ''}
                      onChange={e => handleItemChange(index, 'unit', e.target.value)}
                      className="form-input-inventory"
                      style={{ fontSize: '13px', width: '100%', minWidth: 0 }}
                    />
                    <input
                      type="number"
                      value={item.unitPrice || ''}
                      onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                      className="form-input-inventory"
                      style={{ fontSize: '13px', width: '100%', minWidth: 0 }}
                    />
                    <input
                      type="number"
                      value={item.quantityOrdered || ''}
                      onChange={e => handleItemChange(index, 'quantityOrdered', e.target.value)}
                      className="form-input-inventory"
                      style={{ fontSize: '13px', width: '100%', minWidth: 0 }}
                    />
                    <input
                      type="number"
                      value={item.quantityReceived || ''}
                      onChange={e => handleItemChange(index, 'quantityReceived', e.target.value)}
                      className="form-input-inventory"
                      style={{ fontSize: '13px', width: '100%', minWidth: 0 }}
                    />
                  </div>
                ))}
              </div>

              <div className="modal-footer-inventory" style={{ justifyContent: 'space-between' }}>
                <button 
                  className="modal-btn-inventory cancel" 
                  onClick={() => handleDeleteGrn(selected)}
                  disabled={loading}
                  style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                >
                  Delete GRN
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="modal-btn-inventory cancel" 
                    onClick={() => setOpenView(false)} 
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    className="modal-btn-inventory submit" 
                    onClick={handleSave} 
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {openDelete && (
        <div className="modal-overlay-inventory" onClick={() => setOpenDelete(false)}>
          <div className="modal-content-inventory" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Delete GRN</h2>
                <p className="modal-subtitle-inventory">Confirm permanent deletion</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={() => setOpenDelete(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-body-inventory">
              <div style={{ padding: '16px 0' }}>
                <p style={{ marginBottom: '12px', fontSize: '14px', color: '#1f2937' }}>
                  Are you sure you want to delete GRN <strong>"{grnToDelete?.grnNumber}"</strong>?
                </p>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fee2e2',
                  borderRadius: '6px',
                  color: '#7f1d1d',
                  fontSize: '13px'
                }}>
                  ⚠️ This action cannot be undone. All associated data will be permanently removed.
                </div>
              </div>

              <div className="modal-footer-inventory" style={{ justifyContent: 'flex-end' }}>
                <button 
                  className="modal-btn-inventory cancel" 
                  onClick={() => setOpenDelete(false)} 
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn-inventory submit"
                  onClick={confirmDelete} 
                  disabled={loading}
                  style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ChatAssistant />
    </div>
  );
}
