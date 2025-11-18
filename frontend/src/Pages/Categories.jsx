import React, { useState } from 'react'
import { categories, roles } from '../data/sample'
import { Edit2, Trash2, Archive } from 'lucide-react'
import Card from '../Components/Card'
import Modal from '../Components/Modal'
import './Categories.css'

export default function Categories(){
  const [tab, setTab] = useState('inventory')
  const [list, setList] = useState(categories)
  const [roleList, setRoleList] = useState(roles)
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 style={{fontSize:20, fontWeight:700}}>Organize inventory into Categories</h2>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <input placeholder="Search by category..." className="input" value={query} onChange={e=>setQuery(e.target.value)} />
          <button className="btn-primary" onClick={()=>setOpenAdd(true)}>+ Add Category</button>
        </div>
      </div>

      <div className="tab-container">
        <div style={{marginBottom:12}} className="tab-row">
            <button className={tab==='inventory'?'active':''} onClick={()=>setTab('inventory')}>Inventory</button>
            <button className={tab==='user'?'active':''} onClick={()=>setTab('user')}>User</button>
        </div>

        <div className="grid-3" style={{marginTop:12}}>
            {tab==='inventory' ? list
            .filter(c => { if(!query) return true; return c.name.toLowerCase().includes(query.toLowerCase()) })
            .map(c=>(
            <Card key={c.id}>
                <div className="category-card-top">
                    <Archive size={20} className="category-icon" />
                    <div className="category-card-actions">
                        <button aria-label="Edit category" onClick={()=>{ setEditing(c); setOpenEdit(true) }}><Edit2 size={16} /></button>
                        <button aria-label="Delete category" onClick={()=>{ if(window.confirm('Delete this category?')) setList(prev => prev.filter(x => x.id !== c.id)) }}><Trash2 size={16} /></button>
                    </div>
                </div>
                <div className="category-card-body">
                    <div className="category-name">{c.name}</div>
                    <div className="category-desc">{c.desc}</div>
                </div>
                <hr className="category-separator" />
                <div className="category-item-count">{c.items} Items</div>
            </Card>
            )) : roleList.map(r=>(
            <Card key={r.id}>
                <div className="category-card-top">
                    <Archive size={20} className="category-icon" />
                    <div className="category-card-actions">
                        <button aria-label="Edit role" onClick={()=>{ setEditing(r); setOpenEdit(true) }}><Edit2 size={16} /></button>
                        <button aria-label="Delete role" onClick={()=>{ if(window.confirm('Delete this role?')) setRoleList(prev => prev.filter(x => x.id !== r.id)) }}><Trash2 size={16} /></button>
                    </div>
                </div>
                <div className="category-card-body">
                    <div className="category-name">{r.name}</div>
                    <div className="category-desc">{r.desc}</div>
                </div>
                <hr className="category-separator" />
                <div className="category-item-count">1 Member</div>
            </Card>
            ))}
        </div>
      </div>

      <Modal title="Add Category" open={openAdd} onClose={()=>setOpenAdd(false)}>
        <form style={{display:'flex', flexDirection:'column', gap:10}}>
          <div>
            <label className="text-sm">Category Name</label>
            <input className="input" placeholder="Category name" />
          </div>
          <div>
            <label className="text-sm">Description</label>
            <textarea className="input" style={{height:80}} />
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', gap:8}} className="modal-actions">
            <button className="btn-white" onClick={()=>setOpenAdd(false)} type="button">Cancel</button>
            <button className="btn-black">Create Category</button>
          </div>
        </form>
      </Modal>

      <Modal title="Edit Category" open={openEdit} onClose={()=>setOpenEdit(false)}>
        {editing && (
            <form style={{display:'flex', flexDirection:'column', gap:10}}>
            <div>
                <label className="text-sm">Category Name</label>
                <input className="input" defaultValue={editing.name} />
            </div>
            <div>
                <label className="text-sm">Description</label>
                <textarea className="input" defaultValue={editing.desc} style={{height:80}} />
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', gap:8}} className="modal-actions">
                <button className="btn-white" onClick={()=>setOpenEdit(false)} type="button">Cancel</button>
                <button className="btn-black">Update Category</button>
            </div>
            </form>
        )}
      </Modal>
    </div>
  )
}