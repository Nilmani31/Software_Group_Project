import React, { useState, useEffect } from 'react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import { grns, users } from '../data/sample';
import Modal from '../Components/Modal';
import ChatAssistant from '../Components/ChatAssistant';
import { useForm, useFieldArray } from 'react-hook-form';
import './GoodReceived.css';
import './Inventory.css';

export default function GoodReceived() {
  const [list, setList] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [grnToDelete, setGrnToDelete] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [editableGrn, setEditableGrn] = useState(null);
  const [query, setQuery] = useState('');
  const [imagePreview, setImagePreview] = useState(null);

  const { register, handleSubmit, control, reset, watch, setValue } = useForm({
    defaultValues: {
      items: [{ id: '', name: '', unit: '', unitPrice: '', ordered: '', received: '', status: 'Not Received' }]
    }
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" });

  // Function to generate the next GRN number
  const generateNextGRN = () => {
    const currentYear = new Date().getFullYear();
    
    // Find the highest GRN number for the current year
    const currentYearGRNs = list.filter(grn => {
      const grnYear = grn.grn ? parseInt(grn.grn.split('-')[1]) : null;
      return grnYear === currentYear;
    });

    let nextNumber = 1;
    
    if (currentYearGRNs.length > 0) {
      // Extract numbers and find the maximum
      const numbers = currentYearGRNs.map(grn => {
        const parts = grn.grn.split('-');
        return parts.length === 3 ? parseInt(parts[2]) : 0;
      }).filter(num => !isNaN(num));
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }

    // Format the number with leading zeros (001, 002, etc.)
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    return `GRN-${currentYear}-${formattedNumber}`;
  };

  useEffect(() => {
    const processedGrns = grns.map(grn => {
      const itemsWithStatus = grn.items.map(item => {
        const received = parseInt(item.received, 10) || 0;
        const ordered = parseInt(item.ordered, 10) || 0;
        let status;
        if (received === 0) {
          status = 'Not Received';
        } else if (received < ordered) {
          status = 'Incomplete';
        } else {
          status = 'Complete';
        }
        return { ...item, status };
      });
      return { ...grn, items: itemsWithStatus };
    });
    setList(processedGrns);
  }, []);

  const employeeId_create = watch('employeeId');
  useEffect(() => {
    if (employeeId_create) {
      const user = users.find(u => u.id === parseInt(employeeId_create, 10));
      setValue('by', user ? user.name : '');
    } else {
      setValue('by', '');
    }
  }, [employeeId_create, setValue]);

  const poNumber_create = watch('po');
  useEffect(() => {
    if (poNumber_create && poNumber_create !== 'Select PO...') {
      // Find the GRN with matching PO number to get items
      const matchingGrn = grns.find(g => g.po === poNumber_create);
      if (matchingGrn && matchingGrn.items) {
        // Populate items from the matching PO
        const itemsFromPo = matchingGrn.items.map(item => ({
          id: item.id || '',
          name: item.name || '',
          unit: item.unit || '',
          unitPrice: item.unitPrice || '',
          ordered: item.ordered || '',
          received: item.received || '',
          status: item.status || 'Not Received'
        }));
        replace(itemsFromPo);
      }
    }
  }, [poNumber_create, replace]);

  // Auto-generate GRN when modal opens
  useEffect(() => {
    if (openCreate) {
      const nextGRN = generateNextGRN();
      setValue('grn', nextGRN);
    }
  }, [openCreate, setValue, list]); // Added list as dependency to ensure latest data

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      const url = URL.createObjectURL(f);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const onCreate = (data) => {
    const newGrn = {
      ...data,
      id: list.length + 1,
      grn: data.grn,
      po: data.po,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      billNumber: data.billNumber,
      date: data.date,
      employeeId: data.employeeId,
      by: data.by,
      items: data.items.map(item => ({
        ...item,
        id: item.id,
        name: item.name,
        unit: item.unit,
        ordered: parseInt(item.ordered, 10) || 0,
        unitPrice: parseInt(item.unitPrice, 10) || 0,
        received: parseInt(item.received, 10) || 0,
        status: item.status || 'Not Received'
      })),
      bill: imagePreview
    };
    setList(prevList => [newGrn, ...prevList]);
    reset();
    setImagePreview(null);
    setOpenCreate(false);
  };

  const handleDeleteGrn = (grn) => {
    setGrnToDelete(grn);
    setOpenDelete(true);
  };

  const confirmDelete = () => {
    if (grnToDelete) {
      setList(prevList => prevList.filter(grn => grn.id !== grnToDelete.id));
      setOpenDelete(false);
      setGrnToDelete(null);
      setOpenView(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...editableItems];
    newItems[index][field] = value;
    setEditableItems(newItems);
  };

  const handleGrnChange = (field, value) => {
    const newGrn = { ...editableGrn, [field]: value };
    if (field === 'employeeId') {
      const user = users.find(u => u.id === parseInt(value, 10));
      newGrn.by = user ? user.name : '';
    }
    setEditableGrn(newGrn);
  };

  const handleSave = () => {
    const newList = list.map(grn => {
      if (selected && grn.id === selected.id) {
        const updatedItems = editableItems.map(item => ({
          ...item,
          ordered: parseInt(item.ordered, 10) || 0,
          received: parseInt(item.received, 10) || 0,
          unitPrice: parseInt(item.unitPrice, 10) || 0
        }));

        return { ...editableGrn, items: updatedItems };
      }
      return grn;
    });

    setList(newList);
    setOpenView(false);
  };

  const filteredGrns = list.filter(g => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (g.grn && g.grn.toLowerCase().includes(q)) || (g.po && g.po.toLowerCase().includes(q));
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
                        reset({ items: [{ id: '', name: '', unit: '', unitPrice: '', ordered: '', received: '', status: 'Not Received' }] });
                        setImagePreview(null);
                        setOpenCreate(true);
                      }}>+ New GRN</button>
                    </div>
                  </div>
                </header>

                <div className="inventory-main" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {filteredGrns.length === 0 ? (
                    <div className="no-results">No GRNs found.</div>
                  ) : (
                    <div className="list-wrap" style={{ flex: 1, overflow: 'auto' }}>
                      <table className="inventory-table">
                        <thead>
                          <tr>
                            <th scope="col">GRN</th>
                            <th scope="col">PO</th>
                            <th scope="col">Item ID</th>
                            <th scope="col">Item Name</th>
                            <th scope="col">Ordered</th>
                            <th scope="col">Received</th>
                            <th scope="col">Status</th>
                            <th scope="col" style={{ textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredGrns.map(g => (
                            g.items.map((item, itemIndex) => (
                              <tr key={`${g.id}-${item.id}-${itemIndex}`} className="inventory-row">
                                {itemIndex === 0 && (
                                  <>
                                    <td rowSpan={g.items.length} style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>{g.grn}</td>
                                    <td rowSpan={g.items.length} style={{ verticalAlign: 'middle' }}>{g.po}</td>
                                  </>
                                )}
                                <td>{item.id}</td>
                                <td>{item.name}</td>
                                <td>{item.ordered}</td>
                                <td>{item.received}</td>
                                <td>
                                  <span className={`badge ${getItemStatusClass(item.status)}`}>
                                    {item.status}
                                  </span>
                                </td>
                                {itemIndex === 0 && (
                                  <td rowSpan={g.items.length} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    <button
                                      className="btn-view-details"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const user = users.find(u => u.name === g.by);
                                        setSelected(g);
                                        setEditableItems(g.items.map(item => ({ ...item })));
                                        setEditableGrn({ ...g, employeeId: user ? user.id : '' });
                                        setOpenView(true);
                                      }}
                                    >
                                      View Details
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
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

      <Modal title="Create GRN" open={openCreate} onClose={() => setOpenCreate(false)}>
        <form onSubmit={handleSubmit(onCreate)} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflow: 'auto' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="text-sm">GRN Number</label>
              <input 
                {...register('grn')} 
                placeholder="GRN-2025-XXX" 
                className="input" 
                readOnly 
                style={{ backgroundColor: '#f3f4f6', color: '#666' }}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>Auto-generated</small>
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-sm">Purchase Order</label>
              <select {...register('po')} className="select">
                <option>Select PO...</option>
                {[...new Set(grns.map(g => g.po))].map(po => (
                  <option key={po} value={po}>{po}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="text-sm">Supplier ID</label>
              <input {...register('supplierId')} placeholder="Enter Supplier ID" className="input" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-sm">Supplier Name</label>
              <input {...register('supplierName')} placeholder="Enter Supplier Name" className="input" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="text-sm">Bill Number</label>
              <input {...register('billNumber')} placeholder="Enter Bill Number" className="input" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-sm">Received Date</label>
              <input {...register('date')} type="date" defaultValue={new Date().toISOString().substring(0, 10)} className="date" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="text-sm">Employee ID</label>
              <input {...register('employeeId')} placeholder="Enter ID" className="input" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-sm">Received By</label>
              <input {...register('by')} className="input" readOnly style={{ backgroundColor: '#f3f4f6' }} />
            </div>
          </div>

          <div>
            <label className="text-sm">Items</label>
            
            {/* Table headers for items */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontWeight: 'bold', fontSize: '14px' }}>
              <div style={{ flex: 1 }}>Item ID</div>
              <div style={{ flex: 2 }}>Item Name</div>
              <div style={{ flex: 1 }}>Unit</div>
              <div style={{ flex: 1 }}>Unit Price</div>
              <div style={{ flex: 1 }}>Ordered Qty</div>
              <div style={{ flex: 1 }}>Received Qty</div>
              <div style={{ flex: 1.5 }}>Status</div>
              <div style={{ flex: 0.5 }}>Action</div>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input {...register(`items.${index}.id`)} placeholder="Item ID" className="input" style={{ flex: 1 }} />
                <input {...register(`items.${index}.name`)} placeholder="Item Name" className="input" style={{ flex: 2 }} />
                <input {...register(`items.${index}.unit`)} placeholder="Unit" className="input" style={{ flex: 1 }} />
                <input {...register(`items.${index}.unitPrice`)} placeholder="Unit Price" type="number" className="input" style={{ flex: 1 }} />
                <input {...register(`items.${index}.ordered`)} placeholder="Ordered Qty" type="number" className="input" style={{ flex: 1 }} />
                <input {...register(`items.${index}.received`)} placeholder="Received Qty" type="number" className="input" style={{ flex: 1 }} />
                
                <select {...register(`items.${index}.status`)} className="select" style={{ flex: 1.5 }}>
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button type="button" className="btn-danger" onClick={() => remove(index)} style={{ flex: 0.5 }}>
                  &times;
                </button>
              </div>
            ))}

            <button type="button" className="btn-white" onClick={() => append({ id: '', name: '', unit: '', unitPrice: '', ordered: '', received: '', status: 'Not Received' })}>
              + Add Item
            </button>
          </div>

          <div>
            <label className="text-sm">Add Bill</label>
            <input id="billInput" {...register('bill')} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

            <label htmlFor="billInput" className="file-drop" style={{ cursor: 'pointer', display: 'inline-block' }}>
              {imagePreview ? (
                <img src={imagePreview} alt="bill preview" style={{ maxWidth: 160, maxHeight: 120, objectFit: 'cover', borderRadius: 6 }} />
              ) : (
                'Drop Image Here or click to select'
              )}
            </label>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 'auto', paddingTop: 16 }}>
            <button type="button" className="btn-white" onClick={() => setOpenCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-black">
              Create GRN
            </button>
          </div>
        </form>
      </Modal>

      <Modal title="GRN Details" open={openView} onClose={() => setOpenView(false)}>
        {selected && editableGrn && (
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <div style={{ marginBottom: 16 }}>
              <strong style={{ fontSize: '18px' }}>{selected.grn}</strong>
            </div>

            <div className="grn-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="text-sm">GRN Number</label>
                <input 
                  value={editableGrn.grn} 
                  onChange={e => handleGrnChange('grn', e.target.value)} 
                  className="input" 
                  readOnly
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="text-sm">PO Number</label>
                <input value={editableGrn.po} onChange={e => handleGrnChange('po', e.target.value)} className="input" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="text-sm">Supplier ID</label>
                <input value={editableGrn.supplierId || ''} onChange={e => handleGrnChange('supplierId', e.target.value)} className="input" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="text-sm">Supplier Name</label>
                <input value={editableGrn.supplierName || ''} onChange={e => handleGrnChange('supplierName', e.target.value)} className="input" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="text-sm">Bill Number</label>
                <input value={editableGrn.billNumber || ''} onChange={e => handleGrnChange('billNumber', e.target.value)} className="input" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="text-sm">Received Date</label>
                <input type="date" value={editableGrn.date} onChange={e => handleGrnChange('date', e.target.value)} className="date" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="text-sm">Employee ID</label>
                <input value={editableGrn.employeeId} onChange={e => handleGrnChange('employeeId', e.target.value)} className="input" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="text-sm">Received By</label>
                <input value={editableGrn.by} className="input" readOnly style={{ backgroundColor: '#f3f4f6' }} />
              </div>
            </div>

            {editableGrn.bill && (
              <div style={{ marginTop: 12, marginBottom: 16 }}>
                <label className="text-sm">Bill Image</label>
                <img src={editableGrn.bill} alt="bill" style={{ maxWidth: '100%', borderRadius: 6, marginTop: 4 }} />
              </div>
            )}

            <div>
              <table className="grn-details-table">
                <thead>
                  <tr>
                    <th>Item ID</th>
                    <th>Item</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th>Ordered</th>
                    <th>Received</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {editableItems.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>
                        <input
                          type="text"
                          value={item.id}
                          onChange={e => handleItemChange(index, 'id', e.target.value)}
                          className="input"
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => handleItemChange(index, 'name', e.target.value)}
                          className="input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => handleItemChange(index, 'unit', e.target.value)}
                          className="input"
                          style={{ width: 60 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="input"
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.ordered}
                          onChange={e => handleItemChange(index, 'ordered', e.target.value)}
                          className="input"
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={item.received}
                          onChange={e => handleItemChange(index, 'received', e.target.value)}
                          className="input"
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <select
                          value={item.status}
                          onChange={e => handleItemChange(index, 'status', e.target.value)}
                          className="select"
                          style={{ width: 120 }}
                        >
                          {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
              <button 
                className="btn-danger" 
                onClick={() => handleDeleteGrn(selected)}
              >
                Delete GRN
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-white" onClick={() => setOpenView(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleSave}>Save</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal title="Delete GRN" open={openDelete} onClose={() => setOpenDelete(false)}>
        <div style={{ padding: '16px 0' }}>
          <p>Are you sure you want to delete GRN <strong>"{grnToDelete?.grn}"</strong>?</p>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
            This action cannot be undone and all associated data will be permanently removed.
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn-white" onClick={() => setOpenDelete(false)}>
            Cancel
          </button>
          <button className="btn-danger" onClick={confirmDelete}>
            Delete
          </button>
        </div>
      </Modal>

      <ChatAssistant />
    </div>
  );
}
