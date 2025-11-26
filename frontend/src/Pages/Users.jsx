import React, { useState } from 'react';
import Navbar from '../Components/Navbar';
import Sidebar from '../Components/Sidebar';
import { users } from '../data/sample';
import { Edit2, Trash2 } from 'lucide-react';
import Modal from '../Components/Modal';
import ChatAssistant from '../Components/ChatAssistant';
import './Users.css';
import './Inventory.css';

export default function Users() {
  const [list, setList] = useState(users);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');

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
                  {filteredUsers.length === 0 ? (
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
                                <button onClick={() => { setEditing(u); setOpenEdit(true) }} className="icon-btn" aria-label="Edit user">
                                  <Edit2 size={16} />
                                </button>
                                <button onClick={() => { if (window.confirm('Delete this user?')) setList(prev => prev.filter(x => x.id !== u.id)) }} className="icon-btn danger" aria-label="Delete user">
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
        <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><label className="text-sm">Full Name</label><input className="input" placeholder="e.g. Chamsha Nilmani" /></div>
          <div><label className="text-sm">Email</label><input className="input" placeholder="e.g. Example@gamil.com" /></div>
          <div><label className="text-sm">Phone Number</label><input className="input" placeholder="e.g. +94714556527" /></div>
          <div><label className="text-sm">Password</label><input className="input" placeholder="e.g.DEXXXXX" /></div>
          <div><label className="text-sm">Role</label><select className="input"><option>Director</option></select></div>
          <div><label className="text-sm">Branch</label><input className="input" placeholder="e.g. Galle" /></div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }} className="modal-actions">
            <button className="btn-white" onClick={() => setOpenAdd(false)} type="button">Cancel</button>
            <button className="btn-black">Add user</button>
          </div>
        </form>
      </Modal>

      <Modal title="Edit User" open={openEdit} onClose={() => setOpenEdit(false)}>
        {editing && (
          <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label className="text-sm">Full Name</label><input className="input" defaultValue={editing.name} /></div>
            <div><label className="text-sm">Email</label><input className="input" defaultValue={editing.email} /></div>
            <div><label className="text-sm">Phone Number</label><input className="input" defaultValue="+94714556527" /></div>
            <div><label className="text-sm">Role</label><select className="input"><option>Staff</option></select></div>
            <div><label className="text-sm">Branch</label><input className="input" defaultValue={editing.branch} /></div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }} className="modal-actions">
              <button className="btn-white" onClick={() => setOpenEdit(false)} type="button">Cancel</button>
              <button className="btn-black">Update User</button>
            </div>
          </form>
        )}
      </Modal>
      <ChatAssistant />
    </div>
  );
}