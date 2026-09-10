import React, { useEffect, useState } from "react";
import Navbar from "../Components/Navbar";
import Sidebar from "../Components/Sidebar";
import ChatAssistant from "../Components/ChatAssistant";
import ConfirmDialog from "../Components/ConfirmDialog";
import "./Inventory.css";
import "./Branches.css";
import { FaTimes, FaEdit, FaTrash } from "react-icons/fa";

export default function Branches() {
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5005";
    const [branches, setBranches] = useState([]);
    const [query, setQuery] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", location: "", contact_person: "", phone: "" });
    const [errors, setErrors] = useState({});
    const [pendingAction, setPendingAction] = useState(null);

    useEffect(() => {
        async function fetchBranches() {
            try {
                const res = await fetch(`${API_BASE_URL}/api/branches`);
                const body = await res.json();

                if (!res.ok || body.success === false) {
                    throw new Error(body.message || "Failed to load branches");
                }

                const mapped = Array.isArray(body.data)
                    ? body.data.map(item => ({
                        id: item.branch_id || item._id,
                        name: item.branch_name || item.branchName || item.name || "",
                        location: item.location || "",
                        contact_person: item.contact_person || item.manager || "",
                        phone: item.phone || item.phoneNumber || "",
                        createdAt: item.created_at || item.createdAt,
                    }))
                    : [];

                setBranches(mapped);
            } catch (error) {
                console.error("Branches fetch error", error);
            }
        }

        fetchBranches();
    }, [API_BASE_URL]);

    function openAdd() {
        setForm({ name: "", location: "", contact_person: "", phone: "" });
        setEditing(null);
        setShowAdd(true);
        setErrors({});
    }

    function openEdit(b) {
        setForm({ name: b.name, location: b.location, contact_person: b.contact_person, phone: b.phone });
        setEditing(b);
        setShowAdd(true);
        setErrors({});
    }

    async function save() {
        const newErrors = {};

        if (!form.name?.trim()) {
            newErrors.name = "Branch name is required";
        }
        if (!form.location?.trim()) {
            newErrors.location = "Location is required";
        }
        if (!form.contact_person?.trim()) {
            newErrors.contact_person = "Manager/Contact person is required";
        }
        if (!form.phone?.trim()) {
            newErrors.phone = "Phone number is required";
        } else {
            const digits = form.phone.replace(/\D/g, '');
            if (!/^\d{10,15}$/.test(digits)) {
                newErrors.phone = "Phone number must contain 10-15 digits";
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        const payload = {
            branch_name: form.name.trim(),
            location: form.location.trim(),
            contact_person: form.contact_person.trim(),
            phone: form.phone.trim(),
        };

        const requestUrl = editing
            ? `${API_BASE_URL}/api/branches/${editing.id}`
            : `${API_BASE_URL}/api/branches`;
        const method = editing ? "PUT" : "POST";

        try {
            const res = await fetch(requestUrl, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const body = await res.json().catch(() => ({}));

            if (!res.ok || body.success === false) {
                setErrors({ submit: body.message || "Unable to save branch" });
                return;
            }

            const saved = body.data || {};
            const normalized = {
                id: saved.branch_id,
                name: saved.branch_name,
                location: saved.location || payload.location,
                contact_person: saved.contact_person || payload.contact_person,
                phone: saved.phone || payload.phone,
                createdAt: saved.created_at,
            };

            setBranches(bs => {
                if (editing) {
                    return bs.map(b => (b.id === editing.id ? normalized : b));
                }
                return [...bs, normalized];
            });

            setShowAdd(false);
        } catch (error) {
            console.error("Branch save error", error);
            setErrors({ submit: error.message || "Unable to save branch" });
        }
    }

    function requestSave() {
        if (editing) {
            save();
            return;
        }
        setPendingAction({ type: "add" });
    }

    async function remove(id) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/branches/${id}`, {
                method: "DELETE",
            });
            const body = await res.json().catch(() => ({}));

            if (!res.ok || body.success === false) {
                throw new Error(body.message || "Unable to delete branch");
            }

            setBranches(bs => bs.filter(b => b.id !== id));
        } catch (error) {
            console.error("Branch delete error", error);
            alert(error.message || "Unable to delete branch");
        }
    }

    const filtered = branches.filter(b =>
        (b.name || "").toLowerCase().includes(query.toLowerCase())
    );

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
                                        <>
                                        <div className="list-wrap branches-table-wrap">
                                            <table className="inventory-table branches-table-ui" role="table" aria-label="Branches list">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: "16%" }}>Branch ID</th>
                                                        <th style={{ width: "20%" }}>Branch Name</th>
                                                        <th style={{ width: "22%" }}>Location</th>
                                                        <th style={{ width: "20%" }}>Contact Person</th>
                                                        <th style={{ width: "12%", textAlign: "center" }}>Phone</th>
                                                        <th style={{ width: "10%", textAlign: "center" }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filtered.map(b => (
                                                        <tr key={b.id} className="inventory-row">
                                                            <td title={b.id}>{b.id}</td>
                                                            <td>{b.name}</td>
                                                            <td>{b.location || "-"}</td>
                                                            <td>{b.contact_person || "-"}</td>
                                                            <td style={{ textAlign: "center" }}>{b.phone || "-"}</td>
                                                            <td style={{ textAlign: "center" }}>
                                                                <button className="icon-btn" onClick={() => openEdit(b)} title="Edit branch" type="button">
                                                                    <FaEdit />
                                                                </button>
                                                                <button className="icon-btn danger" onClick={() => setPendingAction({ type: "delete", id: b.id, name: b.name })} title="Delete branch" type="button">
                                                                    <FaTrash />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="branches-grid" aria-hidden="true">
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
                                                                onClick={() => setPendingAction({ type: "delete", id: b.id, name: b.name })}
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
                                                            <span className="branch-value">{b.contact_person}</span>
                                                        </div>
                                                        <div className="branch-card-row">
                                                            <span className="branch-label">📞 Phone</span>
                                                            <span className="branch-value">{b.phone}</span>
                                                        </div>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                        </>
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
                            {errors.submit && (
                                <div style={{
                                    color: '#dc2626',
                                    padding: '12px',
                                    backgroundColor: '#fee2e2',
                                    borderRadius: '6px',
                                    marginBottom: '16px',
                                    fontSize: '14px'
                                }}>
                                    {errors.submit}
                                </div>
                            )}

                            <div className="branch-form-group">
                                <label className="branch-form-label">Branch Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className={`branch-form-input ${errors.name ? 'error' : ''}`}
                                    placeholder="Enter branch name"
                                />
                                {errors.name && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.name}</span>}
                            </div>

                            <div className="branch-form-group">
                                <label className="branch-form-label">Location</label>
                                <input
                                    type="text"
                                    value={form.location}
                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                    className={`branch-form-input ${errors.location ? 'error' : ''}`}
                                    placeholder="Enter location"
                                />
                                {errors.location && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.location}</span>}
                            </div>

                            <div className="branch-form-group">
                                <label className="branch-form-label">Manager/Contact Person</label>
                                <input
                                    type="text"
                                    value={form.contact_person}
                                    onChange={e => setForm({ ...form, contact_person: e.target.value })}
                                    className={`branch-form-input ${errors.contact_person ? 'error' : ''}`}
                                    placeholder="Enter manager or contact person name"
                                />
                                {errors.contact_person && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.contact_person}</span>}
                            </div>

                            <div className="branch-form-group">
                                <label className="branch-form-label">Phone Number</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className={`branch-form-input ${errors.phone ? 'error' : ''}`}
                                    placeholder="Enter phone number (10-15 digits)"
                                />
                                {errors.phone && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.phone}</span>}
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
                                onClick={requestSave}
                            >
                                {editing ? "Update Branch" : "Add Branch"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={Boolean(pendingAction)}
                title={pendingAction?.type === "add" ? "Add branch?" : "Delete branch?"}
                message={pendingAction?.type === "add"
                    ? "Are you sure you want to add this branch?"
                    : `Are you sure you want to delete ${pendingAction?.name || "this branch"}?`}
                confirmLabel={pendingAction?.type === "add" ? "Add" : "Delete"}
                tone={pendingAction?.type === "add" ? "success" : "danger"}
                onCancel={() => setPendingAction(null)}
                onConfirm={async () => {
                    const action = pendingAction;
                    setPendingAction(null);
                    if (action?.type === "add") await save();
                    if (action?.type === "delete") await remove(action.id);
                }}
            />

            {/* Chat Assistant */}
            <ChatAssistant />
        </div>
    );
}
