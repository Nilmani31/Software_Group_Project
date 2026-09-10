import React, { useState, useEffect } from 'react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import { categories } from '../data/sample';
import { Edit2, Trash2 } from 'lucide-react';
import Modal from '../Components/Modal';
import ConfirmDialog from '../Components/ConfirmDialog';
import ChatAssistant from '../Components/ChatAssistant';
import './Categories.css';
import './Inventory.css';

export default function Categories() {
  const [tab, setTab] = useState('inventory');
  const [list, setList] = useState(categories);
  const [roleList, setRoleList] = useState([]);
  const [, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');

  // Add role form
  const [addForm, setAddForm] = useState({ name: '', desc: '' });
  const [editForm, setEditForm] = useState({ name: '', desc: '' });

  // Add category form
  const [catAddForm, setCatAddForm] = useState({ name: '', desc: '' });
  const [catEditForm, setCatEditForm] = useState({ name: '', desc: '' });

  const [formLoading, setFormLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    fetchRoles();
    fetchCategories();
  }, []);

  // Fetch categories from database
  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/categories');
      const data = await response.json(); // Backend returns array directly or { success: true, data: [] }? 
      // Based on my backend code: res.status(200).json(categories); -> It returns an array directly.
      if (Array.isArray(data)) {
        const formattedData = data.map(item => ({
          id: item._id, // Mongo ID
          name: item.name,
          desc: item.description,
          items: item.itemCount ?? item.items ?? item.totalItems ?? 0
        }));
        setList(formattedData);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Handle Add Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catAddForm.name) {
      alert('Please enter category name');
      return;
    }
    setFormLoading(true);
    try {
      const response = await fetch('http://localhost:5005/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catAddForm.name,
          description: catAddForm.desc
        })
      });
      const data = await response.json();

      if (response.ok) {
        setCatAddForm({ name: '', desc: '' });
        setOpenAdd(false);
        fetchCategories(); // Refresh list
        alert('Category added successfully!');
      } else {
        alert('Error: ' + (data.error || 'Failed to add category'));
      }
    } catch (err) {
      alert('Error adding category: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const requestAddCategory = (e) => {
    e.preventDefault();
    if (!catAddForm.name) {
      alert('Please enter category name');
      return;
    }
    setPendingAction({ type: 'add-category' });
  };

  // Handle Update Category
  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!catEditForm.name) {
      alert('Please enter category name');
      return;
    }
    setFormLoading(true);
    try {
      const response = await fetch(`http://localhost:5005/api/categories/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catEditForm.name,
          description: catEditForm.desc
        })
      });
      const data = await response.json();

      if (response.ok) {
        setOpenEdit(false);
        setEditing(null);
        fetchCategories();
        alert('Category updated successfully!');
      } else {
        alert('Error: ' + (data.error || 'Failed to update category'));
      }
    } catch (err) {
      alert('Error updating category: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Delete Category
  const handleDeleteCategory = async (id) => {
    try {
      const response = await fetch(`http://localhost:5005/api/categories/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchCategories();
        alert('Category deleted successfully!');
      } else {
        const data = await response.json();
        alert('Error: ' + (data.error || 'Failed to delete category'));
      }
    } catch (err) {
      alert('Error deleting category: ' + err.message);
    }
  };

// Fetch roles from database
const fetchRoles = async () => {
  try {
    const response = await fetch('http://localhost:5005/api/roles');
    const data = await response.json();
    if (data.success && data.data) {
      const formattedRoles = data.data.map(role => ({
        id: role._id,
        name: role.roleId,
        desc: role.description || `${role.roleId} role`
      }));
      setRoleList(formattedRoles);
    }
  } catch (err) {
    console.error('Error fetching roles:', err);
  } finally {
    setLoading(false);
  }
};

// Handle Add Role
const handleAddRole = async (e) => {
  e.preventDefault();
  if (!addForm.name) {
    alert('Please enter role name');
    return;
  }
  setFormLoading(true);
  try {
    const response = await fetch('http://localhost:5005/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roleId: addForm.name.toUpperCase(),
        roleName: addForm.name,
        description: addForm.desc
      })
    });
    const data = await response.json();
    if (data.success) {
      setAddForm({ name: '', desc: '' });
      setOpenAdd(false);
      fetchRoles();
      alert('Role added successfully!');
    } else {
      alert('Error: ' + (data.message || 'Failed to add role'));
    }
  } catch (err) {
    alert('Error adding role: ' + err.message);
  } finally {
    setFormLoading(false);
  }
};

const requestAddRole = (e) => {
  e.preventDefault();
  if (!addForm.name) {
    alert('Please enter role name');
    return;
  }
  setPendingAction({ type: 'add-role' });
};

// Handle Update Role
const handleUpdateRole = async (e) => {
  e.preventDefault();
  if (!editForm.name) {
    alert('Please enter role name');
    return;
  }
  setFormLoading(true);
  try {
    const response = await fetch(`http://localhost:5005/api/roles/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roleName: editForm.name,
        description: editForm.desc
      })
    });
    const data = await response.json();
    if (data.success) {
      setOpenEdit(false);
      setEditing(null);
      fetchRoles();
      alert('Role updated successfully!');
    } else {
      alert('Error: ' + (data.message || 'Failed to update role'));
    }
  } catch (err) {
    alert('Error updating role: ' + err.message);
  } finally {
    setFormLoading(false);
  }
};

// Handle Delete Role
const handleDeleteRole = async (id) => {
    try {
      const response = await fetch(`http://localhost:5005/api/roles/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        fetchRoles();
        alert('Role deleted successfully!');
      } else {
        alert('Error: ' + (data.message || 'Failed to delete role'));
      }
    } catch (err) {
      alert('Error deleting role: ' + err.message);
    }
};

const filteredCategories = list.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
const filteredRoles = roleList.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));
const currentItems = tab === 'inventory' ? filteredCategories : filteredRoles;

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
                        placeholder="Search by category or role name..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="inventory-actions">
                    <button className="btn btn-add" onClick={() => {
                      if (tab === 'user') {
                        setAddForm({ name: '', desc: '' });
                      } else {
                        setCatAddForm({ name: '', desc: '' });
                      }
                      setOpenAdd(true);
                    }}>+ Add New</button>
                  </div>
                </div>
                <div className="category-tabs">
                  <button className={`tab-btn ${tab === 'inventory' ? 'active' : ''}`} onClick={() => setTab('inventory')}>Inventory Categories</button>
                  <button className={`tab-btn ${tab === 'user' ? 'active' : ''}`} onClick={() => setTab('user')}>User Roles</button>
                </div>
              </header>

              <div className="inventory-main">
                {currentItems.length === 0 ? (
                  <div className="no-results">No {tab === 'inventory' ? 'categories' : 'roles'} found.</div>
                ) : (
                  <div className="list-wrap categories-table-wrap">
                    <table className="inventory-table categories-table-ui" role="table" aria-label={`${tab === 'inventory' ? 'Category' : 'Role'} list`}>
                      <thead>
                        <tr>
                          <th style={{ width: '30%' }}>Name</th>
                          <th style={{ width: '44%' }}>Description</th>
                          <th style={{ width: '12%', textAlign: 'center' }}>{tab === 'inventory' ? 'Items' : 'Members'}</th>
                          <th style={{ width: '14%', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.map(item => (
                          <tr key={item.id} className="inventory-row">
                            <td>{item.name}</td>
                            <td>{item.desc || '-'}</td>
                            <td style={{ textAlign: 'center' }}>{tab === 'inventory' ? item.items : 1}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button onClick={() => {
                                if (tab === 'user') {
                                  setEditForm({ name: item.name, desc: item.desc });
                                } else {
                                  setCatEditForm({ name: item.name, desc: item.desc });
                                }
                                setEditing(item);
                                setOpenEdit(true);
                              }} className="icon-btn" aria-label="Edit" type="button">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => setPendingAction({ type: tab === 'inventory' ? 'delete-category' : 'delete-role', id: item.id, name: item.name })} className="icon-btn danger" aria-label="Delete" type="button">
                                <Trash2 size={16} />
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

    <Modal title={`Add New ${tab === 'inventory' ? 'Category' : 'Role'}`} open={openAdd} onClose={() => setOpenAdd(false)}>
      {tab === 'inventory' ? (
        <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={requestAddCategory}>
          <div>
            <label className="text-sm">Name</label>
            <input className="input" placeholder="Enter name" value={catAddForm.name} onChange={(e) => setCatAddForm({ ...catAddForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm">Description</label>
            <textarea className="input" style={{ height: 80 }} placeholder="Enter description" value={catAddForm.desc} onChange={(e) => setCatAddForm({ ...catAddForm, desc: e.target.value })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }} className="modal-actions">
            <button className="btn-white" onClick={() => setOpenAdd(false)} type="button">Cancel</button>
            <button className="btn-black" type="submit" disabled={formLoading}>{formLoading ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      ) : (
        <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={requestAddRole}>
          <div>
            <label className="text-sm">Role Name</label>
            <input className="input" placeholder="e.g. ADMIN, MANAGER" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm">Description</label>
            <textarea className="input" style={{ height: 80 }} placeholder="Enter role description" value={addForm.desc} onChange={(e) => setAddForm({ ...addForm, desc: e.target.value })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }} className="modal-actions">
            <button className="btn-white" onClick={() => setOpenAdd(false)} type="button">Cancel</button>
            <button className="btn-black" type="submit" disabled={formLoading}>{formLoading ? 'Adding...' : 'Add Role'}</button>
          </div>
        </form>
      )}
    </Modal>

    <Modal title={`Edit ${tab === 'inventory' ? 'Category' : 'Role'}`} open={openEdit} onClose={() => setOpenEdit(false)}>
      {editing && (
        tab === 'inventory' ? (
          <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={handleUpdateCategory}>
            <div>
              <label className="text-sm">Name</label>
              <input className="input" value={catEditForm.name} onChange={(e) => setCatEditForm({ ...catEditForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm">Description</label>
              <textarea className="input" value={catEditForm.desc} onChange={(e) => setCatEditForm({ ...catEditForm, desc: e.target.value })} style={{ height: 80 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }} className="modal-actions">
              <button className="btn-white" onClick={() => setOpenEdit(false)} type="button">Cancel</button>
              <button className="btn-black" type="submit" disabled={formLoading}>{formLoading ? 'Updating...' : 'Update'}</button>
            </div>
          </form>
        ) : (
          <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={handleUpdateRole}>
            <div>
              <label className="text-sm">Role Name</label>
              <input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm">Description</label>
              <textarea className="input" style={{ height: 80 }} value={editForm.desc} onChange={(e) => setEditForm({ ...editForm, desc: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }} className="modal-actions">
              <button className="btn-white" onClick={() => setOpenEdit(false)} type="button">Cancel</button>
              <button className="btn-black" type="submit" disabled={formLoading}>{formLoading ? 'Updating...' : 'Update Role'}</button>
            </div>
          </form>
        )
      )}
    </Modal>
    <ConfirmDialog
      open={Boolean(pendingAction)}
      title={pendingAction?.type?.startsWith('add') ? 'Confirm addition' : 'Confirm deletion'}
      message={pendingAction?.type?.startsWith('add')
        ? `Are you sure you want to add this ${pendingAction.type === 'add-category' ? 'category' : 'role'}?`
        : `Are you sure you want to delete ${pendingAction?.name || 'this item'}?`}
      confirmLabel={pendingAction?.type?.startsWith('add') ? 'Add' : 'Delete'}
      tone={pendingAction?.type?.startsWith('add') ? 'success' : 'danger'}
      onCancel={() => setPendingAction(null)}
      onConfirm={async () => {
        const action = pendingAction;
        setPendingAction(null);
        if (action?.type === 'add-category') await handleAddCategory({ preventDefault: () => {} });
        if (action?.type === 'add-role') await handleAddRole({ preventDefault: () => {} });
        if (action?.type === 'delete-category') await handleDeleteCategory(action.id);
        if (action?.type === 'delete-role') await handleDeleteRole(action.id);
      }}
    />
    <ChatAssistant />
  </div>
);
}

