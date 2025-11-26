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
  const [selected, setSelected] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [editableGrn, setEditableGrn] = useState(null);
  const [query, setQuery] = useState('');
  const [imagePreview, setImagePreview] = useState(null);

  const { register, handleSubmit, control, reset, watch, setValue } = useForm({
    defaultValues: {
      items: [{ id: '', name: '', unit: '', unitPrice: '', ordered: '' }]
    }
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    const processedGrns = grns.map(grn => {
      const isAnyIncomplete = grn.items.some(item => (item.received || 0) < (item.ordered || 0));
      const totalReceived = grn.items.reduce((acc, item) => acc + (item.received || 0), 0);

      let status;
      if (totalReceived === 0) {
        status = 'Pending';
      } else if (isAnyIncomplete) {
        status = 'Received, Incomplete';
      } else {
        status = 'Received';
      }
      
      return { ...grn, status };
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
      items: data.items.map(item => ({
        ...item,
        ordered: parseInt(item.ordered, 10) || 0,
        unitPrice: parseInt(item.unitPrice, 10) || 0,
        received: 0,
      })),
      status: 'Pending',
      bill: imagePreview
    };
    setList(prevList => [newGrn, ...prevList]);
    reset();
    setImagePreview(null);
    setOpenCreate(false);
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
          received: parseInt(item.received, 10) || 0
        }));

        const updatedGrn = { ...editableGrn, items: updatedItems };

        const isAnyIncomplete = updatedItems.some(item => item.received < item.ordered);
        const totalReceived = updatedItems.reduce((acc, item) => acc + item.received, 0);

        if (totalReceived === 0) updatedGrn.status = 'Pending';
        else if (isAnyIncomplete) updatedGrn.status = 'Received, Incomplete';
        else updatedGrn.status = 'Received';

        return updatedGrn;
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

  const getStatusClass = (status) => {
    if (status.startsWith('Received, Incomplete')) return 'badge-low';
    if (status === 'Received') return 'badge-normal';
    return 'badge-out';
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
                        reset({ items: [{ id: '', name: '', unit: '', unitPrice: '', ordered: '' }] });
                        setOpenCreate(true);
                      }}>+ New GRN</button>
                    </div>
                  </div>
                </header>

                <div className="inventory-main">
                  {filteredGrns.length === 0 ? (
                    <div className="no-results">No GRNs found.</div>
                  ) : (
                    <div className="list-wrap">
                      <table className="inventory-table">
                        <thead>
                          <tr>
                            <th scope="col">GRN</th>
                            <th scope="col">PO</th>
                            <th scope="col">Received Date</th>
                            <th scope="col">Received By</th>
                            <th scope="col" style={{ textAlign: 'center' }}>Status</th>
                            <th scope="col" style={{ textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredGrns.map(g => (
                            <tr key={g.id} className="inventory-row">
                              <td style={{ paddingLeft: '16px' }}>{g.grn}</td>
                              <td>{g.po}</td>
                              <td>{g.date}</td>
                              <td>{g.by}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`badge ${getStatusClass(g.status)}`}>
                                  {g.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  className="btn-view-details"
                                  onClick={() => {
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

      <Modal title="Create GRN" open={openCreate} onClose={() => setOpenCreate(false)}>
        <form onSubmit={handleSubmit(onCreate)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="text-sm">GRN Number</label>
              <input {...register('grn')} placeholder="GRN-2025-XXX" className="input" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-sm">Purchase Order</label>
              <select {...register('po')} className="select">
                <option>Select PO...</option>
                <option>PO-2025-001</option>
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

            {fields.map((field, index) => (
              <div key={field.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input {...register(`items.${index}.id`)} placeholder="Item ID" className="input" style={{ flex: 1 }} />
                <input {...register(`items.${index}.name`)} placeholder="Item Name" className="input" style={{ flex: 2 }} />
                <input {...register(`items.${index}.unit`)} placeholder="Unit" className="input" style={{ flex: 1 }} />
                <input {...register(`items.${index}.unitPrice`)} placeholder="Unit Price" type="number" className="input" style={{ flex: 1 }} />
                <input {...register(`items.${index}.ordered`)} placeholder="Ordered Qty" type="number" className="input" style={{ flex: 1 }} />

                <button type="button" className="btn-danger" onClick={() => remove(index)}>
                  &times;
                </button>
              </div>
            ))}

            <button type="button" className="btn-white" onClick={() => append({ id: '', name: '', unit: '', unitPrice: '', ordered: '' })}>
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

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
          <div>
            <div style={{ marginBottom: 8 }}>
              <strong>{selected.grn}</strong>
            </div>

            <div className="grn-details">
              <div>
                PO Number:
                <input value={editableGrn.po} onChange={e => handleGrnChange('po', e.target.value)} className="input" />
              </div>

              <div>
                Status:
                {editableGrn.status ? (
                  editableGrn.status.startsWith('Received, Incomplete') ? (
                    <span className="badge-pending">{editableGrn.status}</span>
                  ) : editableGrn.status === 'Received' ? (
                    <span className="badge-success">{editableGrn.status}</span>
                  ) : (
                    <span className="badge-pending">{editableGrn.status}</span>
                  )
                ) : (
                  editableGrn.supplier
                )}
              </div>

              <div>
                Supplier ID:
                <input value={editableGrn.supplierId || ''} onChange={e => handleGrnChange('supplierId', e.target.value)} className="input" />
              </div>

              <div>
                Supplier Name:
                <input value={editableGrn.supplierName || ''} onChange={e => handleGrnChange('supplierName', e.target.value)} className="input" />
              </div>

              <div>
                Bill Number:
                <input value={editableGrn.billNumber || ''} onChange={e => handleGrnChange('billNumber', e.target.value)} className="input" />
              </div>

              <div>
                Received Date:
                <input type="date" value={editableGrn.date} onChange={e => handleGrnChange('date', e.target.value)} className="date" />
              </div>

              <div>
                Employee ID:
                <input value={editableGrn.employeeId} onChange={e => handleGrnChange('employeeId', e.target.value)} className="input" />
              </div>

              <div>
                Received By:
                <input value={editableGrn.by} className="input" readOnly style={{ backgroundColor: '#f3f4f6' }} />
              </div>
            </div>

            {editableGrn.bill && (
              <div style={{ marginTop: 12 }}>
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
                  {editableItems.map((item, index) => {
                    let statusText;
                    let statusClass;
                    const received = parseInt(item.received, 10) || 0;
                    const ordered = parseInt(item.ordered, 10) || 0;

                    if (received === 0) {
                      statusText = 'Pending';
                      statusClass = 'badge-pending';
                    } else if (received < ordered) {
                      statusText = 'Received, Incomplete';
                      statusClass = 'badge-pending';
                    } else {
                      statusText = 'Received, Complete';
                      statusClass = 'badge-success';
                    }

                    return (
                      <tr key={item.id || index}>
                        <td>{item.id}</td>
                        <td>{item.name}</td>
                        <td>{item.unit}</td>
                        <td>{item.unitPrice}</td>

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
                          <span className={statusClass}>{statusText}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn-white" onClick={() => setOpenView(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        )}
      </Modal>
      <ChatAssistant />
    </div>
  );
}