import React, { useState } from 'react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import { categories, roles } from '../data/sample';
import { Edit2, Trash2, Archive } from 'lucide-react';
import Modal from '../Components/Modal';
import ChatAssistant from '../Components/ChatAssistant';
import './Categories.css';
import './Inventory.css';

export default function Categories() {
  const [tab, setTab] = useState('inventory');
  const [list, setList] = useState(categories);
  const [roleList, setRoleList] = useState(roles);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');

  const filteredCategories = list.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  const filteredRoles = roleList.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));

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
                          placeholder="Search by category or role name..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="inventory-actions">
                      <button className="btn btn-add" onClick={() => setOpenAdd(true)}>+ Add New</button>
                    </div>
                  </div>
                  <div className="category-tabs">
                    <button className={`tab-btn ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>Inventory Categories</button>
                    <button className={`tab-btn ${tab === 'user' ? 'active' : ''}`} onClick={() => setTab('user')}>User Roles</button>
                  </div>
                </header>

                <div className="inventory-main">
                  <div className="category-grid">
                    {(tab === 'inventory' ? filteredCategories : filteredRoles).map(item => (
                      <div key={item.id} className="category-card">
                        <div className="category-card-header">
                          <Archive size={20} className="category-icon" />
                          <div className="category-actions">
                            <button onClick={() => { setEditing(item); setOpenEdit(true); }} className="icon-btn" aria-label="Edit">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => { if (window.confirm('Are you sure?')) { tab === 'inventory' ? setList(l => l.filter(i => i.id !== item.id)) : setRoleList(l => l.filter(i => i.id !== item.id)) } }} className="icon-btn danger" aria-label="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="category-card-body">
                          <div className="category-name">{item.name}</div>
                          <p className="category-description">{item.desc}</p>
                        </div>
                        <div className="category-card-footer">
                          <span>{tab === 'inventory' ? `${item.items} Items` : '1 Member'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {(tab === 'inventory' && filteredCategories.length === 0) || (tab === 'user' && filteredRoles.length === 0) && (
                    <div className="no-results">No {tab === 'inventory' ? 'categories' : 'roles'} found.</div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </main>
      </div>

      <Modal title={`Add New ${tab === 'inventory' ? 'Category' : 'Role'}`} open={openAdd} onClose={() => setOpenAdd(false)}>
        <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label className="text-sm">Name</label>
            <input className="input" placeholder="Enter name" />
          </div>
          <div>
            <label className="text-sm">Description</label>
            <textarea className="input" style={{ height: 80 }} placeholder="Enter description" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }} className="modal-actions">
            <button className="btn-white" onClick={() => setOpenAdd(false)} type="button">Cancel</button>
            <button className="btn-black">Create</button>
          </div>
        </form>
      </Modal>

      <Modal title={`Edit ${tab === 'inventory' ? 'Category' : 'Role'}`} open={openEdit} onClose={() => setOpenEdit(false)}>
        {editing && (
          <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="text-sm">Name</label>
              <input className="input" defaultValue={editing.name} />
            </div>
            <div>
              <label className="text-sm">Description</label>
              <textarea className="input" defaultValue={editing.desc} style={{ height: 80 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }} className="modal-actions">
              <button className="btn-white" onClick={() => setOpenEdit(false)} type="button">Cancel</button>
              <button className="btn-black">Update</button>
            </div>
          </form>
        )}
      </Modal>
      <ChatAssistant />
    </div>
  );
}