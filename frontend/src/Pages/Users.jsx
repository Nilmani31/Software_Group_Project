import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import { 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  Building, 
  Globe, 
  Key, 
  UserCheck, 
  AlertCircle,
  Users as UsersIcon,
  Search,
  Plus
} from 'lucide-react';
import Modal from '../Components/Modal';
import ChatAssistant from '../Components/ChatAssistant';
import ConfirmDialog from '../Components/ConfirmDialog';
import { getAuthHeaders } from '../utils/authHeaders';

const DEFAULT_PASSWORD_LENGTH = 12;

// Standard system permission definitions
const AVAILABLE_PERMISSIONS = [
  { id: 'USERS', label: 'User Management (Add & Edit Users)', description: 'Can view, create, edit and delete system users and assign roles', badge: 'Admin Access' },
  { id: 'INVENTORY', label: 'Inventory & Stock Management', description: 'Can view catalog, stock levels, batches and adjustments', badge: 'Core' },
  { id: 'PURCHASE_ORDERS', label: 'Purchase Orders', description: 'Can view, draft, issue and track purchase orders', badge: 'Core' },
  { id: 'GOODS_RECEIVED', label: 'Goods Received Notes (GRN)', description: 'Can inspect and receive goods from suppliers into stock', badge: 'Core' },
  { id: 'ISSUE_NOTES', label: 'Issue Notes & Branch Requests', description: 'Can create and approve inter-branch stock transfers and issues', badge: 'Core' },
  { id: 'REPORTS', label: 'Analytics & Reports Studio', description: 'Can generate stock valuation, movements and audit reports', badge: 'Reports' },
  { id: 'BRANCHES', label: 'Branch Management', description: 'Can manage company branch locations and contact info', badge: 'Admin' },
  { id: 'CATEGORIES', label: 'Categories & Units', description: 'Can manage inventory categories and unit measurements', badge: 'Admin' }
];

const DEFAULT_ROLE_PERMS = {
  ROLE_ADMIN: ['ALL', 'USERS', 'INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'REPORTS', 'BRANCHES', 'CATEGORIES'],
  ROLE_DIRECTOR: ['USERS', 'INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'REPORTS', 'BRANCHES', 'CATEGORIES'],
  ROLE_MANAGER: ['INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES', 'REPORTS'],
  ROLE_BRANCH_MANAGER: ['INVENTORY', 'PURCHASE_ORDERS', 'GOODS_RECEIVED', 'ISSUE_NOTES'],
  ROLE_STAFF: ['INVENTORY', 'GOODS_RECEIVED']
};

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
  const [addForm, setAddForm] = useState({ 
    username: '', 
    email: '', 
    phoneNumber: '', 
    password: '', 
    roleId: 'ROLE_STAFF', 
    branchId: '', 
    allowedBranches: [],
    permissions: ['INVENTORY', 'GOODS_RECEIVED']
  });
  const [addLoading, setAddLoading] = useState(false);

  // Edit user form state
  const [editForm, setEditForm] = useState({ 
    username: '', 
    email: '', 
    phoneNumber: '', 
    password: '',
    roleId: '', 
    branchId: '', 
    allowedBranches: [],
    permissions: []
  });
  const [editLoading, setEditLoading] = useState(false);
  const [userPendingDelete, setUserPendingDelete] = useState(null);
  const [userPendingAdd, setUserPendingAdd] = useState(false);

  // Current session permissions
  const currentUserRoleId = localStorage.getItem('roleId') || '';
  const currentUserRole = currentUserRoleId.replace('ROLE_', '');
  let currentUserPerms = [];
  try {
    currentUserPerms = JSON.parse(localStorage.getItem('permissions') || '[]');
  } catch (e) {}

  const canManageUsers = 
    currentUserRole === 'ADMIN' || 
    currentUserRole === 'DIRECTOR' || 
    currentUserPerms.includes('USERS') || 
    currentUserPerms.includes('ALL');

  // Fetch initial data
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
        let filteredRoles = data.data;

        // Apply role hierarchy filtering if needed
        if (currentUserRole === 'DIRECTOR') {
          filteredRoles = data.data.filter(r => !r.roleId.includes('ADMIN'));
        } else if (currentUserRole === 'MANAGER') {
          filteredRoles = data.data.filter(r => r.roleId.includes('BRANCH_MANAGER') || r.roleId.includes('STAFF'));
        } else if (currentUserRole === 'BRANCH_MANAGER') {
          filteredRoles = data.data.filter(r => r.roleId.includes('STAFF'));
        }

        setRoles(filteredRoles);
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
        if (branchesArray.length > 0) {
          setAddForm(prev => ({ 
            ...prev, 
            branchId: prev.branchId || branchesArray[0]._id 
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5005/api/users', {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success && data.data) {
        const formattedUsers = data.data.map(user => ({
          id: user._id,
          userId: user.userId,
          name: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          branch: user.branchId,
          branchName: user.branchName,
          role: user.roleId,
          roleName: user.role,
          allowedBranches: user.allowedBranches || [],
          permissions: user.permissions || [],
          status: user.status || 'ACTIVE'
        }));
        setList(formattedUsers);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate random password
  const generatePassword = (formType) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < DEFAULT_PASSWORD_LENGTH; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (formType === 'add') {
      setAddForm(prev => ({ ...prev, password }));
    } else {
      setEditForm(prev => ({ ...prev, password }));
    }
  };

  // When Add Role changes, auto-set default permissions and branch
  const handleAddRoleChange = (roleId) => {
    const defaultPerms = DEFAULT_ROLE_PERMS[roleId] || ['INVENTORY'];
    setAddForm(prev => ({
      ...prev,
      roleId,
      permissions: defaultPerms,
      branchId: (roleId === 'ROLE_ADMIN' || roleId === 'ROLE_DIRECTOR') ? 'MAIN_BRANCH' : (prev.branchId || (branches[0] ? branches[0]._id : ''))
    }));
  };

  // When Edit Role changes, auto-set default permissions
  const handleEditRoleChange = (roleId) => {
    const defaultPerms = DEFAULT_ROLE_PERMS[roleId] || ['INVENTORY'];
    setEditForm(prev => ({
      ...prev,
      roleId,
      permissions: defaultPerms,
      branchId: (roleId === 'ROLE_ADMIN' || roleId === 'ROLE_DIRECTOR') ? 'MAIN_BRANCH' : (prev.branchId || (branches[0] ? branches[0]._id : ''))
    }));
  };

  // Toggle permission in Add or Edit form
  const togglePermission = (formType, permId) => {
    if (formType === 'add') {
      const current = addForm.permissions || [];
      const updated = current.includes(permId)
        ? current.filter(p => p !== permId)
        : [...current, permId];
      setAddForm(prev => ({ ...prev, permissions: updated }));
    } else {
      const current = editForm.permissions || [];
      const updated = current.includes(permId)
        ? current.filter(p => p !== permId)
        : [...current, permId];
      setEditForm(prev => ({ ...prev, permissions: updated }));
    }
  };

  // Toggle allowed branch in Add or Edit form
  const toggleAllowedBranch = (formType, branchId) => {
    if (formType === 'add') {
      const isSelected = addForm.allowedBranches.includes(branchId);
      const newBranches = isSelected
        ? addForm.allowedBranches.filter(id => id !== branchId)
        : [...addForm.allowedBranches, branchId];
      setAddForm(prev => ({ ...prev, allowedBranches: newBranches }));
    } else {
      const isSelected = editForm.allowedBranches.includes(branchId);
      const newBranches = isSelected
        ? editForm.allowedBranches.filter(id => id !== branchId)
        : [...editForm.allowedBranches, branchId];
      setEditForm(prev => ({ ...prev, allowedBranches: newBranches }));
    }
  };

  // Select/Deselect all allowed branches
  const toggleAllAllowedBranches = (formType) => {
    const allBranchIds = branches.map(b => b._id);
    if (formType === 'add') {
      const allSelected = allBranchIds.every(id => addForm.allowedBranches.includes(id));
      setAddForm(prev => ({ ...prev, allowedBranches: allSelected ? [] : allBranchIds }));
    } else {
      const allSelected = allBranchIds.every(id => editForm.allowedBranches.includes(id));
      setEditForm(prev => ({ ...prev, allowedBranches: allSelected ? [] : allBranchIds }));
    }
  };

  // Handle Add User submission
  const handleAddUser = async () => {
    setAddLoading(true);
    try {
      const isGlobalRole = addForm.roleId === 'ROLE_ADMIN' || addForm.roleId === 'ROLE_DIRECTOR';
      const isManager = addForm.roleId === 'ROLE_MANAGER';

      const requestBody = {
        username: addForm.username.trim(),
        email: addForm.email.trim(),
        phoneNumber: addForm.phoneNumber.trim(),
        password: addForm.password,
        roleId: addForm.roleId,
        branchId: isGlobalRole ? 'MAIN_BRANCH' : (addForm.branchId || (branches[0] ? branches[0]._id : 'MAIN_BRANCH')),
        allowedBranches: isManager ? addForm.allowedBranches : (isGlobalRole ? branches.map(b => b._id) : []),
        permissions: isGlobalRole ? ['ALL', ...addForm.permissions] : addForm.permissions,
        createdBy: localStorage.getItem('username') || 'System'
      };

      const response = await fetch('http://localhost:5005/api/users/create', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();

      if (data.message && (data.success !== false)) {
        const deliveryMessage = data.messageSent
          ? `Login credentials were sent to ${addForm.email}.`
          : `Note: ${data.messageStatus || 'Email service not configured'}.`;
        alert(`User created successfully!\n${deliveryMessage}\nAssigned password: ${data.password}`);
        
        setAddForm({
          username: '',
          email: '',
          phoneNumber: '',
          password: '',
          roleId: 'ROLE_STAFF',
          branchId: branches[0] ? branches[0]._id : '',
          allowedBranches: [],
          permissions: ['INVENTORY', 'GOODS_RECEIVED']
        });
        setOpenAdd(false);
        fetchUsers();
      } else {
        alert('Error: ' + (data.error || data.message || 'Failed to create user'));
      }
    } catch (err) {
      alert('Error creating user: ' + err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const requestAddUser = (e) => {
    e.preventDefault();
    setUserPendingAdd(true);
  };

  const confirmAddUser = async () => {
    setUserPendingAdd(false);
    await handleAddUser();
  };

  // Handle Edit User modal open
  const handleOpenEdit = (user) => {
    setEditForm({
      username: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      password: '',
      roleId: user.role,
      branchId: user.branch || (branches[0] ? branches[0]._id : ''),
      allowedBranches: user.allowedBranches || [],
      permissions: user.permissions || (DEFAULT_ROLE_PERMS[user.role] || ['INVENTORY'])
    });
    setEditing(user);
    setOpenEdit(true);
  };

  // Handle Update User submission
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const isGlobalRole = editForm.roleId === 'ROLE_ADMIN' || editForm.roleId === 'ROLE_DIRECTOR';
      const isManager = editForm.roleId === 'ROLE_MANAGER';

      const updatePayload = {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        roleId: editForm.roleId,
        branchId: isGlobalRole ? 'MAIN_BRANCH' : editForm.branchId,
        allowedBranches: isManager ? editForm.allowedBranches : (isGlobalRole ? branches.map(b => b._id) : []),
        permissions: isGlobalRole ? ['ALL', ...editForm.permissions] : editForm.permissions
      };

      if (editForm.password && editForm.password.trim() !== '') {
        updatePayload.password = editForm.password.trim();
      }

      const response = await fetch(`http://localhost:5005/api/users/${editing.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatePayload)
      });
      const data = await response.json();

      if (data.success || data.message) {
        alert('User updated successfully');
        setOpenEdit(false);
        fetchUsers();
      } else {
        alert('Error: ' + (data.error || 'Failed to update user'));
      }
    } catch (err) {
      alert('Error updating user: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5005/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success || data.message) {
        alert('User deleted successfully');
        fetchUsers();
      } else {
        alert('Error: ' + (data.error || 'Failed to delete user'));
      }
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  const requestDeleteUser = (userId) => setUserPendingDelete(userId);

  const confirmDeleteUser = async () => {
    const userId = userPendingDelete;
    setUserPendingDelete(null);
    if (userId) await handleDeleteUser(userId);
  };

  // Helper to resolve branch display name
  const getBranchDisplayName = (user) => {
    if (user.role === 'ROLE_ADMIN' || user.role === 'ROLE_DIRECTOR') {
      return 'All Branches';
    }
    if (user.branchName) return user.branchName;
    const branch = branches.find(b => b._id === user.branch || b.branchId === user.branch || b.id === user.branch);
    return branch ? (branch.branchName || branch.name) : user.branch;
  };

  // Helper to format role name for display
  const getRoleDisplayName = (roleId) => {
    const found = roles.find(r => r.roleId === roleId);
    if (found) return found.roleName;
    return roleId.replace('ROLE_', '').replace(/_/g, ' ');
  };

  // Filtered users list for search
  const filteredUsers = useMemo(() => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(user => {
      const branchStr = getBranchDisplayName(user).toLowerCase();
      const roleStr = getRoleDisplayName(user.role).toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.phoneNumber && user.phoneNumber.includes(q)) ||
        branchStr.includes(q) ||
        roleStr.includes(q)
      );
    });
  }, [list, query, branches, roles]);

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="inventory-container">
            <div className="inventory-layout">
              <main className="inventory-content">
                
                {/* Header Section */}
                <header className="inventory-header">
                  <div className="inventory-top-row">
                    <div className="inventory-search">
                      <div className="search-field">
                        <Search className="search-icon" size={16} />
                        <input
                          type="search"
                          placeholder="Search users by name, role, branch, or email..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="inventory-actions">
                      {canManageUsers ? (
                        <button 
                          className="btn btn-add" 
                          onClick={() => setOpenAdd(true)}
                          id="btn-add-user"
                        >
                          <Plus size={16} style={{ marginRight: 6 }} />
                          Add new User
                        </button>
                      ) : (
                        <div className="text-xs text-slate-500 py-1 px-3 bg-slate-100 rounded-lg">
                          Read-Only View
                        </div>
                      )}
                    </div>
                  </div>
                </header>

                {/* Table Content */}
                <div className="inventory-main">
                  {loading ? (
                    <div className="no-results">
                      <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-blue-600 mb-2"></div>
                      <div>Loading users and branch authorizations...</div>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="no-results">
                      <AlertCircle size={28} className="text-slate-400 mb-2" />
                      <div>No users found matching your search.</div>
                    </div>
                  ) : (
                    <div className="list-wrap">
                      <table className="inventory-table">
                        <thead>
                          <tr>
                            <th scope="col" style={{ width: '26%' }}>User Profile</th>
                            <th scope="col" style={{ width: '16%' }}>Role & Access</th>
                            <th scope="col" style={{ width: '20%' }}>Branch Authorization</th>
                            <th scope="col" style={{ width: '22%' }}>Permissions</th>
                            <th scope="col" style={{ width: '16%', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map(u => {
                            const isGlobal = u.role === 'ROLE_ADMIN' || u.role === 'ROLE_DIRECTOR';
                            const hasUserAddingAccess = u.permissions.includes('USERS') || isGlobal;
                            const isManager = u.role === 'ROLE_MANAGER';
                            const allowedCount = u.allowedBranches ? u.allowedBranches.length : 0;

                            return (
                              <tr key={u.id} className="inventory-row">
                                <td style={{ paddingLeft: '16px' }}>
                                  <div className="user-info">
                                    <div className="user-avatar" style={{ 
                                      backgroundColor: isGlobal ? '#4f46e5' : isManager ? '#0891b2' : '#059669',
                                      color: '#ffffff'
                                    }}>
                                      {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <div className="user-meta">
                                      <div className="user-name" style={{ fontWeight: 600 }}>{u.name}</div>
                                      <div style={{ fontSize: '12px', color: '#64748b' }}>{u.email}</div>
                                      {u.phoneNumber && (
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>📞 {u.phoneNumber}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                    <span className="role-pill" style={{
                                      backgroundColor: isGlobal ? '#ede9fe' : isManager ? '#e0f2fe' : '#ecfdf5',
                                      color: isGlobal ? '#6d28d9' : isManager ? '#0369a1' : '#047857',
                                      fontWeight: 600,
                                      border: `1px solid ${isGlobal ? '#ddd6fe' : isManager ? '#bae6fd' : '#a7f3d0'}`
                                    }}>
                                      {getRoleDisplayName(u.role)}
                                    </span>
                                    {hasUserAddingAccess && (
                                      <span style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: 3, 
                                        fontSize: '11px', 
                                        color: '#2563eb', 
                                        fontWeight: 500 
                                      }}>
                                        <UserCheck size={12} /> User Adding Access
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td>
                                  {isGlobal ? (
                                    <div style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: 6, 
                                      padding: '4px 10px', 
                                      borderRadius: '6px', 
                                      backgroundColor: '#f0fdf4', 
                                      border: '1px solid #bbf7d0',
                                      color: '#166534',
                                      fontSize: '12px',
                                      fontWeight: 600
                                    }}>
                                      <Globe size={14} className="text-emerald-600" />
                                      <span>All Branches</span>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '13px', fontWeight: 500, color: '#334155' }}>
                                        <Building size={14} className="text-slate-400" />
                                        <span>{getBranchDisplayName(u)}</span>
                                      </div>
                                      {isManager && allowedCount > 0 && (
                                        <div style={{ fontSize: '11px', color: '#0284c7', paddingLeft: '19px' }}>
                                          +{allowedCount} additional branch{allowedCount > 1 ? 'es' : ''} permitted
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>

                                <td>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: '280px' }}>
                                    {u.permissions.includes('ALL') || isGlobal ? (
                                      <span style={{ 
                                        fontSize: '11px', 
                                        backgroundColor: '#f1f5f9', 
                                        color: '#475569', 
                                        padding: '2px 8px', 
                                        borderRadius: '4px',
                                        fontWeight: 500 
                                      }}>
                                        Full Access (All Modules)
                                      </span>
                                    ) : (
                                      u.permissions.slice(0, 3).map(p => (
                                        <span key={p} style={{ 
                                          fontSize: '11px', 
                                          backgroundColor: '#f8fafc', 
                                          color: '#475569', 
                                          padding: '2px 6px', 
                                          borderRadius: '4px',
                                          border: '1px solid #e2e8f0' 
                                        }}>
                                          {p.replace(/_/g, ' ')}
                                        </span>
                                      ))
                                    )}
                                    {(!u.permissions.includes('ALL') && !isGlobal && u.permissions.length > 3) && (
                                      <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>
                                        +{u.permissions.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    {canManageUsers ? (
                                      <>
                                        <button 
                                          onClick={() => handleOpenEdit(u)} 
                                          className="icon-btn" 
                                          aria-label="Edit user"
                                          title="Edit user details & permissions"
                                        >
                                          <Edit2 size={15} />
                                        </button>
                                        <button 
                                          onClick={() => requestDeleteUser(u.id)} 
                                          className="icon-btn danger" 
                                          aria-label="Delete user"
                                          title="Delete user"
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </>
                                    ) : (
                                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Protected</span>
                                    )}
                                  </div>
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

      {/* ADD USER MODAL */}
      <Modal title="Create New System User" open={openAdd} onClose={() => setOpenAdd(false)}>
        <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={requestAddUser}>
          
          {/* Section: Basic Information */}
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 10 }}>
              1. Account Credentials
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>Username *</label>
                <input 
                  className="input" 
                  placeholder="e.g. j_smith" 
                  value={addForm.username} 
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })} 
                  required 
                />
              </div>

              <div>
                <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>Email Address *</label>
                <input 
                  className="input" 
                  type="email" 
                  placeholder="e.g. john@company.com" 
                  value={addForm.email} 
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} 
                  required 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
              <div>
                <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>Phone Number *</label>
                <input 
                  className="input" 
                  placeholder="e.g. 0712345678" 
                  value={addForm.phoneNumber} 
                  onChange={(e) => setAddForm({ ...addForm, phoneNumber: e.target.value })} 
                  required 
                />
              </div>

              <div>
                <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>Password</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input 
                    className="input" 
                    type="password" 
                    placeholder="Leave empty to auto-generate" 
                    value={addForm.password} 
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} 
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="btn-white" 
                    onClick={() => generatePassword('add')} 
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    title="Generate secure password"
                  >
                    <Key size={13} style={{ marginRight: 4 }} /> Gen
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Role and Branch Configuration */}
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 10 }}>
              2. Role & Branch Assignment
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>System Role *</label>
                <select 
                  className="input" 
                  value={addForm.roleId} 
                  onChange={(e) => handleAddRoleChange(e.target.value)} 
                  required
                >
                  {roles.map(r => (
                    <option key={r._id} value={r.roleId}>
                      {r.roleName} ({r.roleId.replace('ROLE_', '')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Selection based on Role */}
              {(addForm.roleId === 'ROLE_ADMIN' || addForm.roleId === 'ROLE_DIRECTOR') ? (
                <div>
                  <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>Branch Scope</label>
                  <div style={{ 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    backgroundColor: '#f0fdf4', 
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <Globe size={16} />
                    <span>Global Access (All Branches)</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>
                    {addForm.roleId === 'ROLE_MANAGER' ? 'Primary Branch *' : 'Assigned Branch *'}
                  </label>
                  <select 
                    className="input" 
                    value={addForm.branchId} 
                    onChange={(e) => setAddForm({ ...addForm, branchId: e.target.value })} 
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b._id} value={b._id}>
                        {b.branchName || b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Allowed Branches for Managers */}
            {addForm.roleId === 'ROLE_MANAGER' && (
              <div style={{ marginTop: 12, backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="text-xs font-semibold text-slate-700">
                    Additional Permitted Branches (Multi-select)
                  </label>
                  <button 
                    type="button" 
                    onClick={() => toggleAllAllowedBranches('add')} 
                    style={{ fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Toggle All
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
                  {branches.map(b => (
                    <label key={b._id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '12px', color: '#334155' }}>
                      <input 
                        type="checkbox" 
                        checked={addForm.allowedBranches.includes(b._id)} 
                        onChange={() => toggleAllowedBranch('add', b._id)} 
                      />
                      <span>{b.branchName || b.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Feature Permissions and User Adding Access */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                3. Feature Permissions & User Adding Access
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Role defaults pre-selected
              </span>
            </div>

            {/* Highlighted User Management & Adding Access Checkbox */}
            <div style={{ 
              backgroundColor: addForm.permissions.includes('USERS') ? '#eff6ff' : '#f8fafc',
              border: `1.5px solid ${addForm.permissions.includes('USERS') ? '#93c5fd' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: 10,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onClick={() => togglePermission('add', 'USERS')}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={addForm.permissions.includes('USERS')} 
                  onChange={() => {}} // handled by parent onClick
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <UsersIcon size={14} className="text-blue-600" />
                    <span>User Management & User Adding Access</span>
                    <span style={{ fontSize: '10px', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px' }}>
                      Key Permission
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: 2 }}>
                    Grants access to the User Management directory. Users with this access can add, view, and assign roles to other staff members.
                  </div>
                </div>
              </label>
            </div>

            {/* Other System Permissions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
              {AVAILABLE_PERMISSIONS.filter(p => p.id !== 'USERS').map(p => {
                const isChecked = addForm.permissions.includes(p.id) || addForm.permissions.includes('ALL');
                return (
                  <label 
                    key={p.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: 8, 
                      padding: '8px 10px', 
                      borderRadius: '6px',
                      border: '1px solid #f1f5f9',
                      backgroundColor: isChecked ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => togglePermission('add', p.id)} 
                      style={{ marginTop: 2 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{p.label}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{p.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }} className="modal-actions">
            <button className="btn-white" onClick={() => setOpenAdd(false)} type="button">Cancel</button>
            <button className="btn-black" type="submit" disabled={addLoading}>
              {addLoading ? 'Creating User...' : 'Create User Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal title={`Edit User: ${editing?.name || ''}`} open={openEdit} onClose={() => setOpenEdit(false)}>
        {editing && (
          <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={handleUpdateUser}>
            
            {/* Section: Basic Information */}
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 10 }}>
                1. Account Details
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>Username *</label>
                  <input 
                    className="input" 
                    value={editForm.username} 
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} 
                    required 
                  />
                </div>

                <div>
                  <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>Email Address *</label>
                  <input 
                    className="input" 
                    type="email" 
                    value={editForm.email} 
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
                <div>
                  <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>Phone Number</label>
                  <input 
                    className="input" 
                    value={editForm.phoneNumber} 
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>New Password (Optional)</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input 
                      className="input" 
                      type="password" 
                      placeholder="Leave blank to keep current" 
                      value={editForm.password || ''} 
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} 
                      style={{ flex: 1 }}
                    />
                    <button 
                      type="button" 
                      className="btn-white" 
                      onClick={() => generatePassword('edit')} 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      title="Generate new password"
                    >
                      <Key size={13} style={{ marginRight: 4 }} /> Gen
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Role and Branch */}
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 10 }}>
                2. Role & Branch Assignment
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>System Role *</label>
                  <select 
                    className="input" 
                    value={editForm.roleId} 
                    onChange={(e) => handleEditRoleChange(e.target.value)} 
                    required
                  >
                    {roles.map(r => (
                      <option key={r._id} value={r.roleId}>
                        {r.roleName} ({r.roleId.replace('ROLE_', '')})
                      </option>
                    ))}
                  </select>
                </div>

                {(editForm.roleId === 'ROLE_ADMIN' || editForm.roleId === 'ROLE_DIRECTOR') ? (
                  <div>
                    <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>Branch Scope</label>
                    <div style={{ 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      backgroundColor: '#f0fdf4', 
                      border: '1px solid #bbf7d0',
                      color: '#15803d',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <Globe size={16} />
                      <span>Global Access (All Branches)</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium" style={{ display: 'block', marginBottom: 4 }}>
                      {editForm.roleId === 'ROLE_MANAGER' ? 'Primary Branch *' : 'Assigned Branch *'}
                    </label>
                    <select 
                      className="input" 
                      value={editForm.branchId} 
                      onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })} 
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map(b => (
                        <option key={b._id} value={b._id}>
                          {b.branchName || b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {editForm.roleId === 'ROLE_MANAGER' && (
                <div style={{ marginTop: 12, backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="text-xs font-semibold text-slate-700">
                      Additional Permitted Branches
                    </label>
                    <button 
                      type="button" 
                      onClick={() => toggleAllAllowedBranches('edit')} 
                      style={{ fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Toggle All
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
                    {branches.map(b => (
                      <label key={b._id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '12px', color: '#334155' }}>
                        <input 
                          type="checkbox" 
                          checked={editForm.allowedBranches.includes(b._id)} 
                          onChange={() => toggleAllowedBranch('edit', b._id)} 
                        />
                        <span>{b.branchName || b.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section: Permissions & User Adding Access */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                  3. Feature Permissions & User Adding Access
                </div>
              </div>

              {/* Highlighted User Management & Adding Access Checkbox */}
              <div style={{ 
                backgroundColor: editForm.permissions.includes('USERS') ? '#eff6ff' : '#f8fafc',
                border: `1.5px solid ${editForm.permissions.includes('USERS') ? '#93c5fd' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: 10,
                cursor: 'pointer'
              }}
              onClick={() => togglePermission('edit', 'USERS')}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={editForm.permissions.includes('USERS')} 
                    onChange={() => {}} 
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UsersIcon size={14} className="text-blue-600" />
                      <span>User Management & User Adding Access</span>
                      <span style={{ fontSize: '10px', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px' }}>
                        Key Permission
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: 2 }}>
                      Grants access to the User Management directory. Users with this access can add, view, and assign roles to other staff members.
                    </div>
                  </div>
                </label>
              </div>

              {/* Other System Permissions Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 180, overflowY: 'auto', paddingRight: 4 }}>
                {AVAILABLE_PERMISSIONS.filter(p => p.id !== 'USERS').map(p => {
                  const isChecked = editForm.permissions.includes(p.id) || editForm.permissions.includes('ALL');
                  return (
                    <label 
                      key={p.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: 8, 
                        padding: '8px 10px', 
                        borderRadius: '6px',
                        border: '1px solid #f1f5f9',
                        backgroundColor: isChecked ? '#f8fafc' : '#ffffff',
                        cursor: 'pointer'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => togglePermission('edit', p.id)} 
                        style={{ marginTop: 2 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{p.label}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{p.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }} className="modal-actions">
              <button className="btn-white" onClick={() => setOpenEdit(false)} type="button">Cancel</button>
              <button className="btn-black" type="submit" disabled={editLoading}>
                {editLoading ? 'Updating User...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={userPendingAdd}
        title="Create User Account?"
        message={`Are you sure you want to create an account for ${addForm.username || 'this user'} with the assigned role, branch access, and permissions?`}
        confirmLabel="Create User"
        tone="success"
        onCancel={() => setUserPendingAdd(false)}
        onConfirm={confirmAddUser}
      />
      <ConfirmDialog
        open={Boolean(userPendingDelete)}
        title="Delete User Account?"
        message="This user will be permanently removed from the system and will lose all access immediately."
        confirmLabel="Delete User"
        tone="danger"
        onCancel={() => setUserPendingDelete(null)}
        onConfirm={confirmDeleteUser}
      />
      
      <ChatAssistant />
    </div>
  );
}
