import React, { useState } from 'react'
import { users } from '../data/sample'
import { Edit2, Trash2 } from 'lucide-react'
import Card from '../Components/Card'
import Modal from '../Components/Modal'
import './Users.css'

export default function Users(){
  const [list, setList] = useState(users)
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState(null)

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <h2 style={{fontSize:20, fontWeight:700}}>Manage system users and roles</h2>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button className="btn-primary" onClick={()=>setOpenAdd(true)}>+ Add new User</button>
        </div>
      </div>

      <div className="users-grid">
        {list.map(u=>(
          <Card key={u.id} className="user-card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{display:'flex', alignItems:'center'}}>
                <div style={{width:48, height:48, borderRadius:8, background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center'}}>U</div>
                <div className="meta">
                  <div style={{fontWeight:700}}>{u.name}</div>
                  <div style={{fontSize:13, color:'#6b7280'}}>{u.email}</div>
                  <div style={{fontSize:13, color:'#6b7280'}}>{u.branch}</div>
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'row', gap:8, alignItems:'center'}}>
                <button onClick={()=>{ setEditing(u); setOpenEdit(true) }} aria-label="Edit user" style={{background:'none', border:'none', color:'#3B4DB8', cursor:'pointer'}}>
                  <Edit2 size={16} />
                </button>
                <button onClick={()=>{ if(window.confirm('Delete this user?')) setList(prev => prev.filter(x => x.id !== u.id)) }} aria-label="Delete user" style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div style={{marginTop:10}}><span className="role-pill">{u.role}</span></div>
          </Card>
        ))}
      </div>

      <Modal title="Add New User" open={openAdd} onClose={()=>setOpenAdd(false)}>
        <form style={{display:'flex', flexDirection:'column', gap:10}}>
          <div><label className="text-sm">Full Name</label><input className="input" placeholder="e.g. Chamsha Nilmani" /></div>
          <div><label className="text-sm">Email</label><input className="input" placeholder="e.g. Example@gamil.com" /></div>
          <div><label className="text-sm">Phone Number</label><input className="input" placeholder="e.g. +94714556527" /></div>
          <div><label className="text-sm">Password</label><input className="input" placeholder="e.g.DEXXXXX" /></div>
          <div><label className="text-sm">Role</label><select className="input"><option>Director</option></select></div>
          <div><label className="text-sm">Branch</label><input className="input" placeholder="e.g. Galle" /></div>

          <div style={{display:'flex', justifyContent:'flex-end', gap:8}} className="modal-actions">
            <button className="btn-white" onClick={()=>setOpenAdd(false)} type="button">Cancel</button>
            <button className="btn-black">Add user</button>
          </div>
        </form>
      </Modal>

      <Modal title="Edit User" open={openEdit} onClose={()=>setOpenEdit(false)}>
        {editing && (
          <form style={{display:'flex', flexDirection:'column', gap:10}}>
            <div><label className="text-sm">Full Name</label><input className="input" defaultValue={editing.name} /></div>
            <div><label className="text-sm">Email</label><input className="input" defaultValue={editing.email} /></div>
            <div><label className="text-sm">Phone Number</label><input className="input" defaultValue="+94714556527" /></div>
            <div><label className="text-sm">Role</label><select className="input"><option>Staff</option></select></div>
            <div><label className="text-sm">Branch</label><input className="input" defaultValue={editing.branch} /></div>

            <div style={{display:'flex', justifyContent:'flex-end', gap:8}} className="modal-actions">
              <button className="btn-white" onClick={()=>setOpenEdit(false)} type="button">Cancel</button>
              <button className="btn-black">Update User</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}