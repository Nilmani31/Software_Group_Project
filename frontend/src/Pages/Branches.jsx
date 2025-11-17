import React, { useState } from "react";
import Navbar from "../Components/Navbar";
import Sidebar from "../Components/Sidebar";
import ChatAssistant from "../Components/ChatAssistant";
import "./Branches.css";
import { FaTimes, FaEdit, FaTrash } from "react-icons/fa";

export default function Branches() {
    const [branches, setBranches] = useState([
        { id: 1, name: "CBBS Main Branch", location: "Colombo 07", contact: "Nethmi Perera", phone: "+94 77 123 4567" },
        { id: 2, name: "CBBS West", location: "Colombo 05", contact: "Saman Silva", phone: "+94 71 987 6543" },
        { id: 3, name: "CBBS North", location: "Kandy 10", contact: "Kumari Perera", phone: "+94 76 111 2222" },
    ]);
    const [query, setQuery] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", location: "", contact: "", phone: "" });

    function openAdd() {
        setForm({ name: "", location: "", contact: "", phone: "" });
        setEditing(null);
        setShowAdd(true);
    }

    function openEdit(b) {
        setForm({ name: b.name, location: b.location, contact: b.contact, phone: b.phone });
        setEditing(b);
        setShowAdd(true);
    }

    function save() {
        if (!form.name || !form.location || !form.contact || !form.phone) {
            alert("Please fill in all fields");
            return;
        }
        if (editing) {
            setBranches(bs => bs.map(b => (b.id === editing.id ? { ...b, ...form } : b)));
        } else {
            setBranches(bs => [...bs, { id: Date.now(), ...form }]);
        }
        setShowAdd(false);
    }

    function remove(id) {
        if (!window.confirm("Are you sure you want to delete this branch?")) return;
        setBranches(bs => bs.filter(b => b.id !== id));
    }

    const filtered = branches.filter(b => b.name.toLowerCase().includes(query.toLowerCase()));

    return (
        <div className="app-wrapper">
            <Navbar />
            <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                    <div className="branches-container">
                        <div className="branches-layout">
                            <main className="branches-content">
                                {/* Header */}
                                <header className="branches-header">
                                    <div className="branches-header-top">
                                        <div className="branches-search">
                                            <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 21.49 21.49 20 15.5 14zM4 9.5C4 6.46 6.46 4 9.5 4S15 6.46 15 9.5 12.54 15 9.5 15 4 12.54 4 9.5z" />
                                            </svg>
                                            <input
                                                placeholder="Search by branch name..."
                                                value={query}
                                                onChange={e => setQuery(e.target.value)}
                                                className="branches-search-input"
                                            />
                                        </div>
                                        <button className="btn-add-branch" onClick={openAdd}>
                                            + Add Branch
                                        </button>
                                    </div>
                                </header>

                                {/* Branches Grid */}
                                <section className="branches-main">
                                    {filtered.length === 0 ? (
                                        <div className="no-results">
                                            <p>No branches found matching "{query}"</p>
                                        </div>
                                    ) : (
                                        <div className="branches-grid">
                                            {filtered.map(b => (
                                                <article className="branch-card" key={b.id}>
                                                    <div className="branch-card-header">
                                                        <h3 className="branch-name">{b.name}</h3>
                                                        <div className="branch-card-actions">
                                                            <button 
                                                                className="branch-icon-btn edit" 
                                                                onClick={() => openEdit(b)}
                                                                title="Edit branch"
                                                            >
                                                                <FaEdit />
                                                            </button>
                                                            <button 
                                                                className="branch-icon-btn delete" 
                                                                onClick={() => remove(b.id)}
                                                                title="Delete branch"
                                                            >
                                                                <FaTrash />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="branch-card-content">
                                                        <div className="branch-card-row">
                                                            <span className="branch-label">📍 Location</span>
                                                            <span className="branch-value">{b.location}</span>
                                                        </div>
                                                        <div className="branch-card-row">
                                                            <span className="branch-label">👤 Contact Person</span>
                                                            <span className="branch-value">{b.contact}</span>
                                                        </div>
                                                        <div className="branch-card-row">
                                                            <span className="branch-label">📞 Phone</span>
                                                            <span className="branch-value">{b.phone}</span>
                                                        </div>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </main>
                        </div>
                    </div>
                </main>
            </div>

            {/* Add/Edit Branch Modal */}
            {showAdd && (
                <div className="branch-modal-overlay" onClick={() => setShowAdd(false)}>
                    <div className="branch-modal" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="branch-modal-header">
                            <h3 className="branch-modal-title">
                                {editing ? "Edit Branch" : "Add New Branch"}
                            </h3>
                            <button 
                                className="branch-modal-close" 
                                onClick={() => setShowAdd(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="branch-modal-body">
                            <div className="branch-form-group">
                                <label className="branch-form-label">Branch Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="branch-form-input"
                                    placeholder="Enter branch name"
                                />
                            </div>

                            <div className="branch-form-group">
                                <label className="branch-form-label">Location</label>
                                <input
                                    type="text"
                                    value={form.location}
                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                    className="branch-form-input"
                                    placeholder="Enter location"
                                />
                            </div>

                            <div className="branch-form-group">
                                <label className="branch-form-label">Contact Person</label>
                                <input
                                    type="text"
                                    value={form.contact}
                                    onChange={e => setForm({ ...form, contact: e.target.value })}
                                    className="branch-form-input"
                                    placeholder="Enter contact person name"
                                />
                            </div>

                            <div className="branch-form-group">
                                <label className="branch-form-label">Phone</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="branch-form-input"
                                    placeholder="Enter phone number"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="branch-modal-footer">
                            <button 
                                className="branch-btn-cancel" 
                                onClick={() => setShowAdd(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="branch-btn-submit" 
                                onClick={save}
                            >
                                {editing ? "Update Branch" : "Add Branch"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Assistant */}
            <ChatAssistant />
        </div>
    );
}