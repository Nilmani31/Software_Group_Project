import React, { useEffect, useState } from "react";
import Navbar from "../Components/Navbar";
import Sidebar from "../Components/Sidebar";
import ChatAssistant from "../Components/ChatAssistant";
import ConfirmDialog from "../Components/ConfirmDialog";


import { FaTimes, FaPlus, FaBuilding, FaPhoneAlt, FaMapMarkerAlt } from "react-icons/fa";

export default function Branches() {
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5005";
    const [branches, setBranches] = useState([]);
    const [query, setQuery] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
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
        setSelectedBranch(null);
        setIsEditMode(false);
        setShowAdd(true);
        setErrors({});
    }

    function handleRowClick(b) {
        setSelectedBranch(b);
        setEditing(b);
        setIsEditMode(false);
        setForm({ name: b.name, location: b.location, contact_person: b.contact_person, phone: b.phone });
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
                id: saved.branch_id || saved.id || saved._id || (editing ? editing.id : undefined),
                name: saved.branch_name || saved.branchName || saved.name || payload.branch_name,
                location: saved.location || payload.location,
                contact_person: saved.contact_person || payload.contact_person,
                phone: saved.phone || payload.phone,
                createdAt: saved.created_at || (editing ? editing.createdAt : new Date().toISOString()),
            };

            setBranches(bs => {
                if (editing) {
                    return bs.map(b => (b.id === editing.id ? normalized : b));
                }
                return [...bs, normalized];
            });

            if (selectedBranch && editing) {
                setSelectedBranch(normalized);
                setIsEditMode(false);
            }
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
            if (selectedBranch && selectedBranch.id === id) {
                setSelectedBranch(null);
                setIsEditMode(false);
            }
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
                                                        <th style={{ width: "26%" }}>Branch Name</th>
                                                        <th style={{ width: "24%" }}>Location</th>
                                                        <th style={{ width: "20%" }}>Contact Person</th>
                                                        <th style={{ width: "14%", textAlign: "center" }}>Phone</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filtered.map(b => (
                                                        <tr
                                                            key={b.id}
                                                            className="inventory-row"
                                                            onClick={() => handleRowClick(b)}
                                                            title="Click to view branch details"
                                                            style={{ cursor: "pointer" }}
                                                        >
                                                            <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>{b.id}</td>
                                                            <td style={{ fontWeight: 600 }}>{b.name}</td>
                                                            <td>{b.location || "-"}</td>
                                                            <td>{b.contact_person || "-"}</td>
                                                            <td style={{ textAlign: "center" }}>{b.phone || "-"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        </>
                                    )}
                                </section>
                            </main>
                        </div>
                    </div>
                </main>
            </div>

            {/* View / Edit Branch Details Modal */}
            {selectedBranch && (
                <div className="modal-overlay-inventory" onClick={() => { setSelectedBranch(null); setIsEditMode(false); }}>
                    <div className="modal-content-inventory add-item-modal" style={{ maxWidth: '680px', width: 'min(94vw, 680px)' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header-inventory">
                            <div className="modal-title-section-inventory">
                                <h2 className="modal-title-inventory">
                                    {isEditMode ? "Edit Branch" : "Branch Details"}
                                </h2>
                                <p className="modal-subtitle-inventory">
                                    {isEditMode ? "Update branch location and contact details" : "View and manage branch location and operational contact"}
                                </p>
                            </div>
                            <button
                                className="modal-close-btn-inventory"
                                onClick={() => { setSelectedBranch(null); setIsEditMode(false); }}
                                aria-label="Close"
                                title="Close"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="modal-body-inventory">
                            {errors.submit && (
                                <div style={{
                                    color: '#b91c1c',
                                    padding: '12px 16px',
                                    backgroundColor: '#fee2e2',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    fontSize: '13px',
                                    border: '1px solid #fecaca'
                                }}>
                                    ⚠️ {errors.submit}
                                </div>
                            )}

                            {/* ID and Status Badge Header Row */}
                            <div className="po-detail-number-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                                <div>
                                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600, display: 'block' }}>Branch ID</span>
                                    <span className="po-detail-number" style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{selectedBranch.id}</span>
                                </div>
                                <div>
                                    {isEditMode ? (
                                        <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
                                            ✏️ EDITING MODE
                                        </span>
                                    ) : (
                                        <span className="po-detail-badge received" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                                            Operational
                                        </span>
                                    )}
                                </div>
                            </div>

                            {!isEditMode ? (
                                /* ================= VIEW MODE ================= */
                                <div>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Branch Overview
                                    </h4>
                                    <div className="po-detail-info-grid" style={{ marginBottom: '16px' }}>
                                        <div>
                                            <span className="po-detail-label">BRANCH NAME</span>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>{selectedBranch.name}</div>
                                        </div>
                                        <div>
                                            <span className="po-detail-label">LOCATION</span>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedBranch.location || '-'}</div>
                                        </div>
                                        <div>
                                            <span className="po-detail-label">CONTACT PERSON</span>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedBranch.contact_person || '-'}</div>
                                        </div>
                                        <div>
                                            <span className="po-detail-label">PHONE NUMBER</span>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedBranch.phone || '-'}</div>
                                        </div>
                                        <div>
                                            <span className="po-detail-label">CREATED DATE</span>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                                {selectedBranch.createdAt ? new Date(selectedBranch.createdAt).toLocaleDateString() : '-'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="po-detail-label">SYSTEM STATUS</span>
                                            <div style={{ fontWeight: 600, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                Active Branch
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* ================= EDIT MODE ================= */
                                <div>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Edit Branch Details
                                    </h4>
                                    <div className="form-layout-inventory" style={{ marginBottom: '16px' }}>
                                        <div className="form-group-inventory">
                                            <label className="form-label-inventory">Branch Name</label>
                                            <input
                                                type="text"
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                className={`form-input-inventory ${errors.name ? 'error' : ''}`}
                                                placeholder="Enter branch name"
                                            />
                                            {errors.name && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.name}</span>}
                                        </div>
                                        <div className="form-group-inventory">
                                            <label className="form-label-inventory">Location</label>
                                            <input
                                                type="text"
                                                value={form.location}
                                                onChange={e => setForm({ ...form, location: e.target.value })}
                                                className={`form-input-inventory ${errors.location ? 'error' : ''}`}
                                                placeholder="Enter location"
                                            />
                                            {errors.location && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.location}</span>}
                                        </div>
                                        <div className="form-group-inventory">
                                            <label className="form-label-inventory">Manager/Contact Person</label>
                                            <input
                                                type="text"
                                                value={form.contact_person}
                                                onChange={e => setForm({ ...form, contact_person: e.target.value })}
                                                className={`form-input-inventory ${errors.contact_person ? 'error' : ''}`}
                                                placeholder="Enter manager or contact person name"
                                            />
                                            {errors.contact_person && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.contact_person}</span>}
                                        </div>
                                        <div className="form-group-inventory">
                                            <label className="form-label-inventory">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={form.phone}
                                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                                className={`form-input-inventory ${errors.phone ? 'error' : ''}`}
                                                placeholder="Enter phone number (10-15 digits)"
                                            />
                                            {errors.phone && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.phone}</span>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="modal-footer-inventory" style={{ justifyContent: 'space-between' }}>
                            <div>
                                {!isEditMode ? (
                                    <button
                                        type="button"
                                        className="modal-btn-inventory delete"
                                        onClick={() => {
                                            setPendingAction({ type: "delete", id: selectedBranch.id, name: selectedBranch.name });
                                            setSelectedBranch(null);
                                        }}
                                    >
                                        Delete Branch
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="modal-btn-inventory cancel"
                                        onClick={() => setIsEditMode(false)}
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {!isEditMode ? (
                                    <>
                                        <button
                                            type="button"
                                            className="modal-btn-inventory edit"
                                            onClick={() => {
                                                setForm({
                                                    name: selectedBranch.name,
                                                    location: selectedBranch.location,
                                                    contact_person: selectedBranch.contact_person,
                                                    phone: selectedBranch.phone
                                                });
                                                setEditing(selectedBranch);
                                                setIsEditMode(true);
                                                setErrors({});
                                            }}
                                        >
                                            Edit Branch
                                        </button>
                                        <button
                                            type="button"
                                            className="modal-btn-inventory cancel"
                                            onClick={() => { setSelectedBranch(null); setIsEditMode(false); }}
                                        >
                                            Close
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        className="modal-btn-inventory save"
                                        onClick={save}
                                    >
                                        Save Changes
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add New Branch Modal */}
            {showAdd && (
                <div className="modal-overlay-inventory" onClick={() => setShowAdd(false)}>
                    <div className="modal-content-inventory add-item-modal" style={{ maxWidth: '680px', width: 'min(94vw, 680px)' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header-inventory">
                            <div className="modal-title-section-inventory">
                                <h2 className="modal-title-inventory">Add New Branch</h2>
                                <p className="modal-subtitle-inventory">Register a new branch location into the system</p>
                            </div>
                            <button
                                type="button"
                                className="modal-close-btn-inventory"
                                onClick={() => setShowAdd(false)}
                                aria-label="Close"
                                title="Close"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="modal-body-inventory">
                            {errors.submit && (
                                <div style={{
                                    color: '#b91c1c',
                                    padding: '12px 16px',
                                    backgroundColor: '#fee2e2',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    fontSize: '13px',
                                    border: '1px solid #fecaca'
                                }}>
                                    ⚠️ {errors.submit}
                                </div>
                            )}

                            {/* Reference Card */}
                            <div className="sku-info-card">
                                <div className="sku-info-header">
                                    <span className="sku-info-label">
                                        <FaBuilding style={{ marginRight: 6 }} /> Branch Network Entity
                                    </span>
                                    <span className="sku-info-tag">Physical Branch</span>
                                </div>
                                <div className="sku-info-value" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <span>{form.name?.trim() ? form.name : 'New Branch Location'}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
                                        Location: <strong style={{ color: 'var(--text-primary)' }}>{form.location?.trim() ? form.location : 'Pending'}</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Section 1: Location Profile */}
                            <div className="form-section-group">
                                <div className="form-section-title">
                                    <FaMapMarkerAlt style={{ marginRight: 6 }} /> Branch Profile & Location
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group-inventory">
                                        <label className="form-label-inventory">Branch Name *</label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            className={`form-input-inventory ${errors.name ? 'error' : ''}`}
                                            placeholder="e.g. Kandy Central Hub"
                                        />
                                        {errors.name && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.name}</span>}
                                    </div>

                                    <div className="form-group-inventory">
                                        <label className="form-label-inventory">Location / City *</label>
                                        <input
                                            type="text"
                                            value={form.location}
                                            onChange={e => setForm({ ...form, location: e.target.value })}
                                            className={`form-input-inventory ${errors.location ? 'error' : ''}`}
                                            placeholder="e.g. Kandy, Sri Lanka"
                                        />
                                        {errors.location && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.location}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Contact Information */}
                            <div className="form-section-group" style={{ marginTop: '14px' }}>
                                <div className="form-section-title">
                                    <FaPhoneAlt style={{ marginRight: 6 }} /> Contact & Operational Management
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group-inventory">
                                        <label className="form-label-inventory">Manager / Contact Person</label>
                                        <input
                                            type="text"
                                            value={form.contact_person}
                                            onChange={e => setForm({ ...form, contact_person: e.target.value })}
                                            className={`form-input-inventory ${errors.contact_person ? 'error' : ''}`}
                                            placeholder="e.g. Mr. Samantha Perera"
                                        />
                                        {errors.contact_person && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.contact_person}</span>}
                                    </div>

                                    <div className="form-group-inventory">
                                        <label className="form-label-inventory">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={e => setForm({ ...form, phone: e.target.value })}
                                            className={`form-input-inventory ${errors.phone ? 'error' : ''}`}
                                            placeholder="e.g. 0812345678"
                                        />
                                        {errors.phone && <span style={{ color: '#dc2626', fontSize: '12px' }}>{errors.phone}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer-inventory">
                            <button
                                type="button"
                                className="modal-btn-inventory cancel"
                                onClick={() => setShowAdd(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="modal-btn-inventory save"
                                onClick={requestSave}
                            >
                                <FaPlus style={{ marginRight: 4 }} /> Add Branch
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
