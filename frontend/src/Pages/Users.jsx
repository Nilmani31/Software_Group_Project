import React, { useState, useEffect } from 'react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import { Edit2, Trash2 } from 'lucide-react';
import Modal from '../Components/Modal';
import ChatAssistant from '../Components/ChatAssistant';
import './Users.css';
import './Inventory.css';

// Default password length
const DEFAULT_PASSWORD_LENGTH = 12;

export default function Users() {
  const [list, setList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  
  // Add user form state
  const [addForm, setAddForm] = useState({ username: '', email: '', phoneNumber: '', password: '', roleId: 'STAFF', branchId: 'MAIN_BRANCH' });
  const [addLoading, setAddLoading] = useState(false);

  // Edit user form state
  const [editForm, setEditForm] = useState({ username: '', email: '', phoneNumber: '', roleId: '', branchId: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Fetch users and roles from backend
  useEffect(() => {
    fetchRoles();
    fetchBranches();
    fetchUsers();
  }, []);

  // Fetch roles from database
  const fetchRoles = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/roles');
      const data = await response.json();
      if (data.success && data.data) {
        setRoles(data.data);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  // Fetch branches from database
  const fetchBranches = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/branches');
      const data = await response.json();
      const branchesArray = Array.isArray(data) ? data : (data.data ? data.data : []);
      if (Array.isArray(branchesArray)) {
        setBranches(branchesArray);
        // Set first branch as default
        if (branchesArray.length > 0) {
          setAddForm(prev => ({ ...prev, branchId: branchesArray[0]._id }));
        }
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  // Generate random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < DEFAULT_PASSWORD_LENGTH; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAddForm({ ...addForm, password });
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/users');
      const data = await response.json();
      if (data.success && data.data) {
        // Transform database users to match display format
        const formattedUsers = data.data.map(user => ({
          id: user._id,
          name: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          branch: user.branchId,
          role: user.roleId
        }));
        setList(formattedUsers);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Add User
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const requestBody = {
        username: addForm.username,
        email: addForm.email,
        phoneNumber: addForm.phoneNumber,
        password: addForm.password,
        roleId: addForm.roleId,
        branchId: addForm.branchId,
        createdBy: localStorage.getItem('username') || 'System'
      };
      
      console.log('=== SENDING ADD USER REQUEST ===');
      console.log('Request body:', { ...requestBody, password: requestBody.password ? '***' : 'EMPTY' });
      console.log('Password value:', requestBody.password);
      console.log('Password type:', typeof requestBody.password);
      console.log('Password length:', requestBody.password ? requestBody.password.length : 0);
      
      const response = await fetch('http://localhost:5005/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      
      console.log('Response status:', response.status);
      console.log('Response data:', data);
      
      if (data.message) {
        alert('User created successfully! Password: ' + data.password);
        setAddForm({ username: '', email: '', phoneNumber: '', password: '', roleId: 'STAFF', branchId: 'MAIN_BRANCH' });
        setOpenAdd(false);
        fetchUsers(); // Refresh list
      } else {
        const errorMsg = data.error || 'Failed to create user';
        console.error('Backend error:', errorMsg);
        alert('Error: ' + errorMsg);
      }
    } catch (err) {
      alert('Error creating user: ' + err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      const response = await fetch(`http://localhost:5005/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success || data.message) {
        alert('User deleted successfully');
        fetchUsers(); // Refresh list
      } else {
        alert('Error: ' + (data.error || 'Failed to delete user'));
      }
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  // Handle Edit User - Open Modal and set form
  const handleOpenEdit = (user) => {
    setEditForm({
      username: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || '0000000000',
      roleId: user.role,
      branchId: user.branch
    });
    setEditing(user);
    setOpenEdit(true);
  };

  // Handle Update User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const response = await fetch(`http://localhost:5005/api/users/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editForm.username,
          email: editForm.email,
          phoneNumber: editForm.phoneNumber,
          roleId: editForm.roleId,
          branchId: editForm.branchId
        })
      });
      const data = await response.json();
      if (data.success || data.message) {
        alert('User updated successfully');
        setOpenEdit(false);
        fetchUsers(); // Refresh list
      } else {
        alert('Error: ' + (data.error || 'Failed to update user'));
      }
    } catch (err) {
      alert('Error updating user: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const filteredUsers = list.filter(user =>
    user.name.toLowerCase().includes(query.toLowerCase()) ||
    user.email.toLowerCase().includes(query.toLowerCase()) ||
    user.branch.toLowerCase().includes(query.toLowerCase())
  );

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
                          placeholder="Search by name, email, or branch..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="inventory-actions">
                      <button className="btn btn-add" onClick={() => setOpenAdd(true)}>+ Add new User</button>
                    </div>
                  </div>
                </header>

                <div className="inventory-main">
                  {loading ? (
                    <div className="no-results">Loading users...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="no-results">No users found.</div>
                  ) : (
                    <div className="list-wrap">
                      <table className="inventory-table">
                        <thead>
                          <tr>
                            <th scope="col" style={{ width: '30%' }}>Name</th>
                            <th scope="col" style={{ width: '25%' }}>Email</th>
                            <th scope="col" style={{ width: '15%' }}>Branch</th>
                            <th scope="col" style={{ width: '15%' }}>Role</th>
                            <th scope="col" style={{ width: '15%', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map(u => (
                            <tr key={u.id} className="inventory-row">
                              <td style={{ paddingLeft: '16px' }}>
                                <div className="user-info">
                                  <div className="user-avatar">U</div>
                                  <div className="user-meta">
                                    <div className="user-name">{u.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td>{u.email}</td>
                              <td>{u.branch}</td>
                              <td><span className="role-pill">{u.role}</span></td>
                              <td style={{ textAlign: 'center' }}>
                                <button onClick={() => handleOpenEdit(u)} className="icon-btn" aria-label="Edit user">
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteUser(u.id)} className="icon-btn danger" aria-label="Delete user">
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

      <Modal title="Add New User" open={openAdd} onClose={() => setOpenAdd(false)}>
        <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={handleAddUser}>
          <div><label className="text-sm">Username</label><input className="input" placeholder="e.g. john_doe" value={addForm.username} onChange={(e) => setAddForm({...addForm, username: e.target.value})} required /></div>
          <div><label className="text-sm">Email</label><input className="input" type="email" placeholder="e.g. john@company.com" value={addForm.email} onChange={(e) => setAddForm({...addForm, email: e.target.value})} required /></div>
          <div><label className="text-sm">Phone Number</label><input className="input" placeholder="e.g. 0712345678" value={addForm.phoneNumber} onChange={(e) => setAddForm({...addForm, phoneNumber: e.target.value})} required /></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}><label className="text-sm">Password</label><input className="input" type="password" placeholder="Leave empty to auto-generate" value={addForm.password} onChange={(e) => setAddForm({...addForm, password: e.target.value})} /></div>
            <button type="button" className="btn-white" onClick={generatePassword} style={{ padding: '8px 16px' }}>Generate</button>
          </div>
          <div><label className="text-sm">Role</label><select className="input" value={addForm.roleId} onChange={(e) => setAddForm({...addForm, roleId: e.target.value})} required><option value="">Select Role</option>{roles.map(r => <option key={r._id} value={r.roleId}>{r.roleName}</option>)}</select></div>
          <div><label className="text-sm">Branch</label><select className="input" value={addForm.branchId} onChange={(e) => setAddForm({...addForm, branchId: e.target.value})} required><option value="">Select Branch</option>{branches.map(b => <option key={b._id} value={b._id}>{b.branchName || b.name}</option>)}</select></div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }} className="modal-actions">
            <button className="btn-white" onClick={() => setOpenAdd(false)} type="button">Cancel</button>
            <button className="btn-black" type="submit" disabled={addLoading}>{addLoading ? 'Adding...' : 'Add user'}</button>
          </div>
        </form>
      </Modal>

      <Modal title="Edit User" open={openEdit} onClose={() => setOpenEdit(false)}>
        {editing && (
          <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={handleUpdateUser}>
            <div><label className="text-sm">Username</label><input className="input" value={editForm.username} onChange={(e) => setEditForm({...editForm, username: e.target.value})} required /></div>
            <div><label className="text-sm">Email</label><input className="input" type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} required /></div>
            <div><label className="text-sm">Phone Number</label><input className="input" value={editForm.phoneNumber} onChange={(e) => setEditForm({...editForm, phoneNumber: e.target.value})} /></div>
            <div><label className="text-sm">Password (Optional)</label><input className="input" type="password" placeholder="Leave empty to keep current password" value={editForm.password || ''} onChange={(e) => setEditForm({...editForm, password: e.target.value})} /></div>
            <div><label className="text-sm">Role</label><select className="input" value={editForm.roleId} onChange={(e) => setEditForm({...editForm, roleId: e.target.value})} required><option value="">Select Role</option>{roles.map(r => <option key={r._id} value={r.roleId}>{r.roleName}</option>)}</select></div>
            <div><label className="text-sm">Branch</label><select className="input" value={editForm.branchId} onChange={(e) => setEditForm({...editForm, branchId: e.target.value})} required><option value="">Select Branch</option>{branches.map(b => <option key={b._id} value={b._id}>{b.branchName || b.name}</option>)}</select></div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }} className="modal-actions">
              <button className="btn-white" onClick={() => setOpenEdit(false)} type="button">Cancel</button>
              <button className="btn-black" type="submit" disabled={editLoading}>{editLoading ? 'Updating...' : 'Update User'}</button>
            </div>
          </form>
        )}
      </Modal>
      <ChatAssistant />
    </div>
  );
}
