import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import { Edit2, Trash2, Plus, Tag, ShieldCheck, Layers, Scale, Search } from 'lucide-react';
import Modal from '../Components/Modal';
import ConfirmDialog from '../Components/ConfirmDialog';
import ChatAssistant from '../Components/ChatAssistant';
import ModernDropdown from '../Components/ModernDropdown';

const UNIT_TYPES = [
  { value: 'Count', label: 'Count / Pieces (pcs, dozen)' },
  { value: 'Weight', label: 'Weight / Mass (kg, g)' },
  { value: 'Volume', label: 'Liquid Volume (ltr, ml)' },
  { value: 'Packaging', label: 'Packaging (box, pack, bottle, can)' },
  { value: 'Length', label: 'Length / Dimensions (meter)' },
  { value: 'Other', label: 'Other Classification' }
];

const getUnitTypeBadge = (type) => {
  switch (type) {
    case 'Weight':
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'Volume':
      return { bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc' };
    case 'Packaging':
      return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
    case 'Length':
      return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
    case 'Count':
    default:
      return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' };
  }
};

export default function Categories({ defaultTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = defaultTab || searchParams.get('tab') || 'inventory';
  const [tab, setTab] = useState(initialTab);

  const [list, setList] = useState([]);
  const [unitList, setUnitList] = useState([]);
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

  // Add unit form
  const [unitAddForm, setUnitAddForm] = useState({
    name: '',
    symbol: '',
    type: 'Count',
    desc: '',
    baseUnit: '',
    conversionFactor: 1
  });
  const [unitEditForm, setUnitEditForm] = useState({
    name: '',
    symbol: '',
    type: 'Count',
    desc: '',
    baseUnit: '',
    conversionFactor: 1
  });

  const [formLoading, setFormLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    fetchRoles();
    fetchCategories();
    fetchUnits();
  }, []);

  // Sync tab with URL if prop changes or on tab click
  const handleTabChange = (newTab) => {
    setTab(newTab);
    setQuery('');
    setSearchParams({ tab: newTab });
  };

  // Fetch categories from database
  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/categories');
      const data = await response.json();
      if (Array.isArray(data)) {
        const formattedData = data.map(item => ({
          id: item._id,
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

  // Fetch units from database
  const fetchUnits = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/units');
      const data = await response.json();
      const rawList = data.data || (Array.isArray(data) ? data : []);
      const formatted = rawList.map(u => ({
        id: u._id || u.unitId,
        unitId: u.unitId,
        name: u.name,
        symbol: u.symbol,
        type: u.type || 'Count',
        desc: u.description || '',
        baseUnit: u.baseUnit || '',
        conversionFactor: u.conversionFactor || 1,
        status: u.status || 'ACTIVE'
      }));
      setUnitList(formatted);
    } catch (err) {
      console.error('Error fetching units:', err);
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

  // Handle Add Category
  const handleAddCategory = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
        fetchCategories();
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

  // Handle Add Unit
  const handleAddUnit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!unitAddForm.name || !unitAddForm.symbol) {
      alert('Please enter unit name and symbol');
      return;
    }
    setFormLoading(true);
    try {
      const response = await fetch('http://localhost:5005/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: unitAddForm.name,
          symbol: unitAddForm.symbol,
          type: unitAddForm.type,
          description: unitAddForm.desc,
          baseUnit: unitAddForm.baseUnit,
          conversionFactor: unitAddForm.conversionFactor
        })
      });
      const data = await response.json();
      if (data.success || response.ok) {
        setUnitAddForm({ name: '', symbol: '', type: 'Count', desc: '', baseUnit: '', conversionFactor: 1 });
        setOpenAdd(false);
        fetchUnits();
        alert('Unit added successfully!');
      } else {
        alert('Error: ' + (data.error || 'Failed to add unit'));
      }
    } catch (err) {
      alert('Error adding unit: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const requestAddUnit = (e) => {
    e.preventDefault();
    if (!unitAddForm.name || !unitAddForm.symbol) {
      alert('Please enter unit name and symbol');
      return;
    }
    setPendingAction({ type: 'add-unit' });
  };

  // Handle Update Unit
  const handleUpdateUnit = async (e) => {
    e.preventDefault();
    if (!unitEditForm.name || !unitEditForm.symbol) {
      alert('Please enter unit name and symbol');
      return;
    }
    setFormLoading(true);
    try {
      const response = await fetch(`http://localhost:5005/api/units/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: unitEditForm.name,
          symbol: unitEditForm.symbol,
          type: unitEditForm.type,
          description: unitEditForm.desc,
          baseUnit: unitEditForm.baseUnit,
          conversionFactor: unitEditForm.conversionFactor
        })
      });
      const data = await response.json();
      if (data.success || response.ok) {
        setOpenEdit(false);
        setEditing(null);
        fetchUnits();
        alert('Unit updated successfully!');
      } else {
        alert('Error: ' + (data.error || 'Failed to update unit'));
      }
    } catch (err) {
      alert('Error updating unit: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Delete Unit
  const handleDeleteUnit = async (id) => {
    try {
      const response = await fetch(`http://localhost:5005/api/units/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success || response.ok) {
        fetchUnits();
        alert('Unit deleted successfully!');
      } else {
        alert('Error: ' + (data.error || data.message || 'Failed to delete unit'));
      }
    } catch (err) {
      alert('Error deleting unit: ' + err.message);
    }
  };

  // Handle Add Role
  const handleAddRole = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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

  const filteredCategories = list.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.desc && c.desc.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredUnits = unitList.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.symbol.toLowerCase().includes(query.toLowerCase()) ||
    (u.type && u.type.toLowerCase().includes(query.toLowerCase())) ||
    (u.desc && u.desc.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredRoles = roleList.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    (r.desc && r.desc.toLowerCase().includes(query.toLowerCase()))
  );

  const currentItems = tab === 'inventory'
    ? filteredCategories
    : tab === 'units'
    ? filteredUnits
    : filteredRoles;

  return (
    <div className="app-wrapper">
      <Navbar />
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="inventory-container">
            <div className="inventory-layout">
              <main className="inventory-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* TOP HEADER ROW: Segmented Pill Tabs & Action Button (Matching Issue Note Design) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  {/* Segmented Tab Navigation */}
                  <div style={{
                    display: 'inline-flex',
                    background: 'var(--bg-subtle, #f1f5f9)',
                    padding: '4px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-default, #e2e8f0)',
                    width: 'fit-content',
                    gap: '4px'
                  }}>
                    <button
                      type="button"
                      onClick={() => handleTabChange("inventory")}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: tab === "inventory" ? 'var(--bg-surface, #ffffff)' : 'transparent',
                        color: tab === "inventory" ? 'var(--primary-color, #2563eb)' : 'var(--text-secondary, #64748b)',
                        boxShadow: tab === "inventory" ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none'
                      }}
                    >
                      <Layers size={16} />
                      <span>Inventory Categories</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: tab === "inventory" ? '#eff6ff' : 'rgba(0,0,0,0.06)',
                        color: tab === "inventory" ? '#2563eb' : '#64748b'
                      }}>
                        {list.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange("units")}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: tab === "units" ? 'var(--bg-surface, #ffffff)' : 'transparent',
                        color: tab === "units" ? 'var(--primary-color, #2563eb)' : 'var(--text-secondary, #64748b)',
                        boxShadow: tab === "units" ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none'
                      }}
                    >
                      <Scale size={16} />
                      <span>Measurement Units</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: tab === "units" ? '#eff6ff' : 'rgba(0,0,0,0.06)',
                        color: tab === "units" ? '#2563eb' : '#64748b'
                      }}>
                        {unitList.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange("user")}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: tab === "user" ? 'var(--bg-surface, #ffffff)' : 'transparent',
                        color: tab === "user" ? 'var(--primary-color, #2563eb)' : 'var(--text-secondary, #64748b)',
                        boxShadow: tab === "user" ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none'
                      }}
                    >
                      <ShieldCheck size={16} />
                      <span>User Roles</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: tab === "user" ? '#eff6ff' : 'rgba(0,0,0,0.06)',
                        color: tab === "user" ? '#2563eb' : '#64748b'
                      }}>
                        {roleList.length}
                      </span>
                    </button>
                  </div>

                  {/* Primary Action Button (Matching Issue Note Gradient Pill Style) */}
                  <button
                    className="btn-add"
                    onClick={() => {
                      if (tab === 'user') {
                        setAddForm({ name: '', desc: '' });
                      } else if (tab === 'units') {
                        setUnitAddForm({ name: '', symbol: '', type: 'Count', desc: '', baseUnit: '', conversionFactor: 1 });
                      } else {
                        setCatAddForm({ name: '', desc: '' });
                      }
                      setOpenAdd(true);
                    }}
                  >
                    <Plus size={18} />
                    <span>
                      {tab === 'inventory' ? '+ Add Category' : tab === 'units' ? '+ Add Unit' : '+ Add Role'}
                    </span>
                  </button>
                </div>

                {/* SEARCH & FILTER TOOLBAR (Matching Issue Note Toolbar Design) */}
                <div style={{
                  background: 'var(--bg-surface, #ffffff)',
                  border: '1px solid var(--border-default, #e2e8f0)',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                }}>
                  <div style={{
                    position: 'relative',
                    flex: '1 1 320px',
                    maxWidth: '460px'
                  }}>
                    <Search size={16} style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted, #94a3b8)',
                      pointerEvents: 'none'
                    }} />
                    <input
                      type="search"
                      placeholder={
                        tab === 'inventory'
                          ? "Search categories by name or description..."
                          : tab === 'units'
                          ? "Search units by name, symbol, or type..."
                          : "Search user roles by name or description..."
                      }
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 14px 9px 38px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-default, #cbd5e1)',
                        fontSize: '13px',
                        outline: 'none',
                        background: 'var(--bg-surface, #ffffff)',
                        color: 'var(--text-primary, #0f172a)',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary-color, #2563eb)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-default, #cbd5e1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-secondary, #64748b)',
                      background: 'var(--bg-subtle, #f8fafc)',
                      border: '1px solid var(--border-default, #e2e8f0)',
                      padding: '6px 12px',
                      borderRadius: '8px'
                    }}>
                      Showing {currentItems.length} {tab === 'inventory' ? 'Categories' : tab === 'units' ? 'Units' : 'Roles'}
                    </span>
                  </div>
                </div>

                {/* MAIN CONTENT / TABLE AREA */}
                <div className="inventory-main">
                  {currentItems.length === 0 ? (
                    <div className="no-results" style={{
                      padding: '48px 24px',
                      textAlign: 'center',
                      background: 'var(--bg-surface, #ffffff)',
                      border: '1px solid var(--border-default, #e2e8f0)',
                      borderRadius: '14px',
                      color: 'var(--text-secondary, #64748b)'
                    }}>
                      No {tab === 'inventory' ? 'categories' : tab === 'units' ? 'measurement units' : 'roles'} found.
                    </div>
                  ) : tab === 'inventory' ? (
                    /* CATEGORIES TABLE */
                    <div className="list-wrap categories-table-wrap">
                      <table className="inventory-table categories-table-ui" role="table" aria-label="Category list">
                        <thead>
                          <tr>
                            <th style={{ width: '30%' }}>Name</th>
                            <th style={{ width: '44%' }}>Description</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>Items</th>
                            <th style={{ width: '14%', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCategories.map(item => (
                            <tr key={item.id} className="inventory-row">
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '8px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <Tag size={14} />
                                  </div>
                                  <span>{item.name}</span>
                                </div>
                              </td>
                              <td style={{ color: 'var(--text-secondary, #64748b)' }}>{item.desc || '-'}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  background: '#f1f5f9',
                                  borderRadius: '9999px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#334155'
                                }}>
                                  {item.items}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  onClick={() => {
                                    setCatEditForm({ name: item.name, desc: item.desc });
                                    setEditing(item);
                                    setOpenEdit(true);
                                  }}
                                  className="icon-btn"
                                  aria-label="Edit"
                                  type="button"
                                  title="Edit category"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => setPendingAction({ type: 'delete-category', id: item.id, name: item.name })}
                                  className="icon-btn danger"
                                  aria-label="Delete"
                                  type="button"
                                  title="Delete category"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : tab === 'units' ? (
                    /* MEASUREMENT UNITS TABLE */
                    <div className="list-wrap categories-table-wrap">
                      <table className="inventory-table categories-table-ui" role="table" aria-label="Units list">
                        <thead>
                          <tr>
                            <th style={{ width: '26%' }}>Unit Name</th>
                            <th style={{ width: '16%' }}>Symbol / Code</th>
                            <th style={{ width: '20%' }}>Classification</th>
                            <th style={{ width: '26%' }}>Description</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUnits.map(unit => {
                            const typeBadge = getUnitTypeBadge(unit.type);
                            return (
                              <tr key={unit.id} className="inventory-row">
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    <div style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '8px',
                                      background: '#f0fdf4',
                                      color: '#16a34a',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <Scale size={14} />
                                    </div>
                                    <span>{unit.name}</span>
                                  </div>
                                </td>
                                <td>
                                  <span style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    padding: '3px 8px',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    color: '#0f172a'
                                  }}>
                                    {unit.symbol}
                                  </span>
                                </td>
                                <td>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '3px 10px',
                                    borderRadius: '9999px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: typeBadge.bg,
                                    color: typeBadge.color,
                                    border: `1px solid ${typeBadge.border}`
                                  }}>
                                    {unit.type}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--text-secondary, #64748b)', fontSize: '13px' }}>
                                  {unit.desc || '-'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    onClick={() => {
                                      setUnitEditForm({
                                        name: unit.name,
                                        symbol: unit.symbol,
                                        type: unit.type,
                                        desc: unit.desc,
                                        baseUnit: unit.baseUnit,
                                        conversionFactor: unit.conversionFactor
                                      });
                                      setEditing(unit);
                                      setOpenEdit(true);
                                    }}
                                    className="icon-btn"
                                    aria-label="Edit"
                                    type="button"
                                    title="Edit unit"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => setPendingAction({
                                      type: 'delete-unit',
                                      id: unit.id,
                                      name: `${unit.name} (${unit.symbol})`
                                    })}
                                    className="icon-btn danger"
                                    aria-label="Delete"
                                    type="button"
                                    title="Delete unit"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* USER ROLES TABLE */
                    <div className="list-wrap categories-table-wrap">
                      <table className="inventory-table categories-table-ui" role="table" aria-label="Role list">
                        <thead>
                          <tr>
                            <th style={{ width: '30%' }}>Name</th>
                            <th style={{ width: '44%' }}>Description</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>Scope</th>
                            <th style={{ width: '14%', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRoles.map(item => (
                            <tr key={item.id} className="inventory-row">
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '8px',
                                    background: '#fdf2f8',
                                    color: '#db2777',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    <ShieldCheck size={14} />
                                  </div>
                                  <span>{item.name}</span>
                                </div>
                              </td>
                              <td style={{ color: 'var(--text-secondary, #64748b)' }}>{item.desc || '-'}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  background: '#f1f5f9',
                                  borderRadius: '9999px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#334155'
                                }}>
                                  Active
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  onClick={() => {
                                    setEditForm({ name: item.name, desc: item.desc });
                                    setEditing(item);
                                    setOpenEdit(true);
                                  }}
                                  className="icon-btn"
                                  aria-label="Edit"
                                  type="button"
                                  title="Edit role"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => setPendingAction({ type: 'delete-role', id: item.id, name: item.name })}
                                  className="icon-btn danger"
                                  aria-label="Delete"
                                  type="button"
                                  title="Delete role"
                                >
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

      {/* ADD MODAL */}
      <Modal 
        title={`Add New ${tab === 'inventory' ? 'Category' : tab === 'units' ? 'Measurement Unit' : 'Role'}`} 
        subtitle={
          tab === 'inventory'
            ? 'Create a product classification group for catalog items'
            : tab === 'units'
            ? 'Define standard units of measure for inventory and orders'
            : 'Define an authorization profile and security role'
        }
        open={openAdd} 
        onClose={() => setOpenAdd(false)}
        maxWidth="600px"
      >
        {tab === 'inventory' ? (
          <form className="modal-form-inventory" onSubmit={requestAddCategory}>
            <div className="sku-info-card">
              <div className="sku-info-header">
                <span className="sku-info-label">
                  <Tag size={13} style={{ marginRight: 6 }} /> Inventory Classification
                </span>
                <span className="sku-info-tag">Product Catalog</span>
              </div>
              <div className="sku-info-value" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Categories organize catalog items, streamline purchase ordering, and simplify stock reporting.
              </div>
            </div>

            <div className="form-section-group" style={{ marginTop: '12px' }}>
              <div className="form-section-title">
                <Layers size={14} style={{ marginRight: 6 }} /> Category Information
              </div>

              <div className="form-group-inventory">
                <label className="form-label-inventory">Category Name *</label>
                <input 
                  className="form-input-inventory" 
                  placeholder="e.g. Coffee Beans, Dairy, Paper Cups" 
                  value={catAddForm.name} 
                  onChange={(e) => setCatAddForm({ ...catAddForm, name: e.target.value })} 
                  required 
                />
              </div>

              <div className="form-group-inventory" style={{ marginTop: '12px' }}>
                <label className="form-label-inventory">Description (Optional)</label>
                <textarea 
                  className="form-input-inventory" 
                  style={{ height: 80, resize: 'vertical' }} 
                  placeholder="Describe product types included in this category..." 
                  value={catAddForm.desc} 
                  onChange={(e) => setCatAddForm({ ...catAddForm, desc: e.target.value })} 
                />
              </div>
            </div>

            <div className="modal-footer-inventory" style={{ margin: '18px -18px -18px -18px', padding: '14px 18px' }}>
              <button className="modal-btn-inventory cancel" onClick={() => setOpenAdd(false)} type="button">
                Cancel
              </button>
              <button className="modal-btn-inventory save" type="submit" disabled={formLoading}>
                <Plus size={14} style={{ marginRight: 4 }} />
                {formLoading ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
        ) : tab === 'units' ? (
          <form className="modal-form-inventory" onSubmit={requestAddUnit}>
            <div className="sku-info-card">
              <div className="sku-info-header">
                <span className="sku-info-label">
                  <Scale size={13} style={{ marginRight: 6 }} /> Unit of Measurement
                </span>
                <span className="sku-info-tag">Inventory Standard</span>
              </div>
              <div className="sku-info-value" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Units standardize quantities across inventory records, purchase orders, and issue receipts.
              </div>
            </div>

            <div className="form-section-group" style={{ marginTop: '12px' }}>
              <div className="form-section-title">
                <Scale size={14} style={{ marginRight: 6 }} /> Unit Details
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group-inventory" style={{ margin: 0 }}>
                  <label className="form-label-inventory">Unit Name *</label>
                  <input 
                    className="form-input-inventory" 
                    placeholder="e.g. Kilogram, Liter, Pieces" 
                    value={unitAddForm.name} 
                    onChange={(e) => setUnitAddForm({ ...unitAddForm, name: e.target.value })} 
                    required 
                  />
                </div>

                <div className="form-group-inventory" style={{ margin: 0 }}>
                  <label className="form-label-inventory">Symbol / Abbreviation *</label>
                  <input 
                    className="form-input-inventory" 
                    placeholder="e.g. kg, ltr, pcs, box" 
                    value={unitAddForm.symbol} 
                    onChange={(e) => setUnitAddForm({ ...unitAddForm, symbol: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group-inventory" style={{ marginTop: '12px' }}>
                <label className="form-label-inventory">Unit Classification / Type</label>
                <ModernDropdown
                  value={unitAddForm.type}
                  onChange={(val) => setUnitAddForm({ ...unitAddForm, type: val })}
                  placeholder="Select Unit Type"
                  options={UNIT_TYPES}
                />
              </div>

              <div className="form-group-inventory" style={{ marginTop: '12px' }}>
                <label className="form-label-inventory">Description (Optional)</label>
                <textarea 
                  className="form-input-inventory" 
                  style={{ height: 80, resize: 'vertical' }} 
                  placeholder="Usage purpose, inventory context, packaging notes..." 
                  value={unitAddForm.desc} 
                  onChange={(e) => setUnitAddForm({ ...unitAddForm, desc: e.target.value })} 
                />
              </div>
            </div>

            <div className="modal-footer-inventory" style={{ margin: '18px -18px -18px -18px', padding: '14px 18px' }}>
              <button className="modal-btn-inventory cancel" onClick={() => setOpenAdd(false)} type="button">
                Cancel
              </button>
              <button className="modal-btn-inventory save" type="submit" disabled={formLoading}>
                <Plus size={14} style={{ marginRight: 4 }} />
                {formLoading ? 'Creating...' : 'Create Unit'}
              </button>
            </div>
          </form>
        ) : (
          <form className="modal-form-inventory" onSubmit={requestAddRole}>
            <div className="sku-info-card">
              <div className="sku-info-header">
                <span className="sku-info-label">
                  <ShieldCheck size={13} style={{ marginRight: 6 }} /> System Access Level
                </span>
                <span className="sku-info-tag">Security Profile</span>
              </div>
              <div className="sku-info-value" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Roles define operational scopes and permissions for staff accounts in the inventory system.
              </div>
            </div>

            <div className="form-section-group" style={{ marginTop: '12px' }}>
              <div className="form-section-title">
                <ShieldCheck size={14} style={{ marginRight: 6 }} /> Role Profile
              </div>

              <div className="form-group-inventory">
                <label className="form-label-inventory">Role Name *</label>
                <input 
                  className="form-input-inventory" 
                  placeholder="e.g. ROLE_AUDITOR, ROLE_STOREKEEPER" 
                  value={addForm.name} 
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} 
                  required 
                />
              </div>

              <div className="form-group-inventory" style={{ marginTop: '12px' }}>
                <label className="form-label-inventory">Description (Optional)</label>
                <textarea 
                  className="form-input-inventory" 
                  style={{ height: 80, resize: 'vertical' }} 
                  placeholder="Operational scope, system privileges and responsibilities..." 
                  value={addForm.desc} 
                  onChange={(e) => setAddForm({ ...addForm, desc: e.target.value })} 
                />
              </div>
            </div>

            <div className="modal-footer-inventory" style={{ margin: '18px -18px -18px -18px', padding: '14px 18px' }}>
              <button className="modal-btn-inventory cancel" onClick={() => setOpenAdd(false)} type="button">
                Cancel
              </button>
              <button className="modal-btn-inventory save" type="submit" disabled={formLoading}>
                <Plus size={14} style={{ marginRight: 4 }} />
                {formLoading ? 'Adding...' : 'Add Role'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* EDIT MODAL */}
      <Modal 
        title={`Edit ${tab === 'inventory' ? 'Category' : tab === 'units' ? 'Measurement Unit' : 'Role'}`} 
        subtitle={
          tab === 'inventory'
            ? 'Update category classification details'
            : tab === 'units'
            ? 'Update unit name, symbol, or classification'
            : 'Update security role profile and permissions'
        }
        open={openEdit} 
        onClose={() => setOpenEdit(false)}
        maxWidth="600px"
      >
        {editing && (
          tab === 'inventory' ? (
            <form className="modal-form-inventory" onSubmit={handleUpdateCategory}>
              <div className="sku-info-card">
                <div className="sku-info-header">
                  <span className="sku-info-label">
                    <Tag size={13} style={{ marginRight: 6 }} /> Editing Category
                  </span>
                  <span className="sku-info-tag">{editing.name}</span>
                </div>
                <div className="sku-info-value" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>ID: {editing.id}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Items: {editing.items || 0}</span>
                </div>
              </div>

              <div className="form-section-group" style={{ marginTop: '12px' }}>
                <div className="form-section-title">
                  <Layers size={14} style={{ marginRight: 6 }} /> Category Details
                </div>

                <div className="form-group-inventory">
                  <label className="form-label-inventory">Category Name *</label>
                  <input 
                    className="form-input-inventory" 
                    value={catEditForm.name} 
                    onChange={(e) => setCatEditForm({ ...catEditForm, name: e.target.value })} 
                    required 
                  />
                </div>

                <div className="form-group-inventory" style={{ marginTop: '12px' }}>
                  <label className="form-label-inventory">Description (Optional)</label>
                  <textarea 
                    className="form-input-inventory" 
                    value={catEditForm.desc} 
                    onChange={(e) => setCatEditForm({ ...catEditForm, desc: e.target.value })} 
                    style={{ height: 80, resize: 'vertical' }} 
                  />
                </div>
              </div>

              <div className="modal-footer-inventory" style={{ margin: '18px -18px -18px -18px', padding: '14px 18px' }}>
                <button className="modal-btn-inventory cancel" onClick={() => setOpenEdit(false)} type="button">
                  Cancel
                </button>
                <button className="modal-btn-inventory save" type="submit" disabled={formLoading}>
                  {formLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : tab === 'units' ? (
            <form className="modal-form-inventory" onSubmit={handleUpdateUnit}>
              <div className="sku-info-card">
                <div className="sku-info-header">
                  <span className="sku-info-label">
                    <Scale size={13} style={{ marginRight: 6 }} /> Editing Unit
                  </span>
                  <span className="sku-info-tag">{editing.symbol}</span>
                </div>
                <div className="sku-info-value" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Unit: {editing.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Type: {editing.type}</span>
                </div>
              </div>

              <div className="form-section-group" style={{ marginTop: '12px' }}>
                <div className="form-section-title">
                  <Scale size={14} style={{ marginRight: 6 }} /> Unit Details
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group-inventory" style={{ margin: 0 }}>
                    <label className="form-label-inventory">Unit Name *</label>
                    <input 
                      className="form-input-inventory" 
                      value={unitEditForm.name} 
                      onChange={(e) => setUnitEditForm({ ...unitEditForm, name: e.target.value })} 
                      required 
                    />
                  </div>

                  <div className="form-group-inventory" style={{ margin: 0 }}>
                    <label className="form-label-inventory">Symbol / Abbreviation *</label>
                    <input 
                      className="form-input-inventory" 
                      value={unitEditForm.symbol} 
                      onChange={(e) => setUnitEditForm({ ...unitEditForm, symbol: e.target.value })} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group-inventory" style={{ marginTop: '12px' }}>
                  <label className="form-label-inventory">Unit Classification / Type</label>
                  <ModernDropdown
                    value={unitEditForm.type}
                    onChange={(val) => setUnitEditForm({ ...unitEditForm, type: val })}
                    placeholder="Select Unit Type"
                    options={UNIT_TYPES}
                  />
                </div>

                <div className="form-group-inventory" style={{ marginTop: '12px' }}>
                  <label className="form-label-inventory">Description (Optional)</label>
                  <textarea 
                    className="form-input-inventory" 
                    value={unitEditForm.desc} 
                    onChange={(e) => setUnitEditForm({ ...unitEditForm, desc: e.target.value })} 
                    style={{ height: 80, resize: 'vertical' }} 
                  />
                </div>
              </div>

              <div className="modal-footer-inventory" style={{ margin: '18px -18px -18px -18px', padding: '14px 18px' }}>
                <button className="modal-btn-inventory cancel" onClick={() => setOpenEdit(false)} type="button">
                  Cancel
                </button>
                <button className="modal-btn-inventory save" type="submit" disabled={formLoading}>
                  {formLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <form className="modal-form-inventory" onSubmit={handleUpdateRole}>
              <div className="sku-info-card">
                <div className="sku-info-header">
                  <span className="sku-info-label">
                    <ShieldCheck size={13} style={{ marginRight: 6 }} /> Editing Role
                  </span>
                  <span className="sku-info-tag">{editing.name}</span>
                </div>
                <div className="sku-info-value" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Updating role permissions and description for system users.
                </div>
              </div>

              <div className="form-section-group" style={{ marginTop: '12px' }}>
                <div className="form-section-title">
                  <ShieldCheck size={14} style={{ marginRight: 6 }} /> Role Details
                </div>

                <div className="form-group-inventory">
                  <label className="form-label-inventory">Role Name *</label>
                  <input 
                    className="form-input-inventory" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                    required 
                  />
                </div>

                <div className="form-group-inventory" style={{ marginTop: '12px' }}>
                  <label className="form-label-inventory">Description (Optional)</label>
                  <textarea 
                    className="form-input-inventory" 
                    style={{ height: 80, resize: 'vertical' }} 
                    value={editForm.desc} 
                    onChange={(e) => setEditForm({ ...editForm, desc: e.target.value })} 
                  />
                </div>
              </div>

              <div className="modal-footer-inventory" style={{ margin: '18px -18px -18px -18px', padding: '14px 18px' }}>
                <button className="modal-btn-inventory cancel" onClick={() => setOpenEdit(false)} type="button">
                  Cancel
                </button>
                <button className="modal-btn-inventory save" type="submit" disabled={formLoading}>
                  {formLoading ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </form>
          )
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.type?.startsWith('add') ? 'Confirm addition' : 'Confirm deletion'}
        message={pendingAction?.type?.startsWith('add')
          ? `Are you sure you want to add this ${pendingAction.type === 'add-category' ? 'category' : pendingAction.type === 'add-unit' ? 'unit' : 'role'}?`
          : `Are you sure you want to delete ${pendingAction?.name || 'this item'}?`}
        confirmLabel={pendingAction?.type?.startsWith('add') ? 'Add' : 'Delete'}
        tone={pendingAction?.type?.startsWith('add') ? 'success' : 'danger'}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          const action = pendingAction;
          setPendingAction(null);
          if (action?.type === 'add-category') await handleAddCategory({ preventDefault: () => {} });
          if (action?.type === 'add-unit') await handleAddUnit({ preventDefault: () => {} });
          if (action?.type === 'add-role') await handleAddRole({ preventDefault: () => {} });
          if (action?.type === 'delete-category') await handleDeleteCategory(action.id);
          if (action?.type === 'delete-unit') await handleDeleteUnit(action.id);
          if (action?.type === 'delete-role') await handleDeleteRole(action.id);
        }}
      />
      <ChatAssistant />
    </div>
  );
}
