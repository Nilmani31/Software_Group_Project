import React, { useState, useEffect } from "react";
import Sidebar from "../Components/Sidebar";
import Navbar from "../Components/Navbar";
import ChatAssistant from "../Components/ChatAssistant";
import "./IssueNote.css";
import { FaEye, FaCheckCircle, FaTimesCircle, FaClock, FaEllipsisV, FaTimes, FaEdit, FaSave, FaPrint, FaCheck, FaBan } from "react-icons/fa";

const IssueNote = () => {
  const [issueNotes, setIssueNotes] = useState([]); // Initialize as empty array
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');

  // Role check
  const roleId = localStorage.getItem('roleId') || '';
  const userRole = roleId.replace('ROLE_', '');
  const canEdit = ['ADMIN', 'DIRECTOR', 'MANAGER', 'BRANCH_MANAGER'].includes(userRole);

  // Fetch issue notes from backend
  useEffect(() => {
    const fetchIssueNotes = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('http://localhost:5000/api/issue-notes');
        if (!response.ok) {
          throw new Error('Failed to fetch issue notes');
        }
        const data = await response.json();

        // Transform backend data to match UI expectations - PRESERVE ALL FIELDS
        const transformedData = Array.isArray(data) ? data.map(note => ({
          // Keep all original backend fields
          ...note,
          // Add/override with frontend-friendly field names
          _original: note, // Save original for API calls
          issueNumber: note.issueNoteNumber,
          issueType: note.purpose || 'Stock Transfer',
          issuedTo: note.toBranchId?.branchName || 'Unknown',
          issueDate: note.issueDate,
          issuedBy: note.issuedBy?.name || 'System',
          status: note.status === 'approved' ? 'Completed' :
            note.status === 'pending' ? 'Pending' :
              note.status === 'rejected' ? 'Rejected' :
                note.status || 'Pending',
          itemCount: note.items?.length || 0,
          quantity: note.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
          items: note.items || [],
          totalAmount: note.totalAmount,
          remarks: note.remarks || '',
          id: note._id // Add id for compatibility
        })) : [];

        setIssueNotes(transformedData);
        console.log('✅ Issue notes loaded:', transformedData);
      } catch (err) {
        console.error('❌ Error fetching issue notes:', err);
        setError(err.message);
        setIssueNotes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIssueNotes();
  }, []);

  const [viewType, setViewType] = useState("list");
  const [activeTab, setActiveTab] = useState("issueNotes");
  const [expandedId, setExpandedId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    issueNumber: "ISS-2025-XXX",
    issueDate: new Date().toISOString().split('T')[0],
    issueType: "Training Sessions",
    trainingSession: "",
    category: "coffee-supplies", // New field
    items: []
  });
  const [selectedItemForAdd, setSelectedItemForAdd] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(0);
  const [editingItemId, setEditingItemId] = useState(null); // New state for editing

  // Fetch data from API on component mount
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchIssueNotes(),
        fetchBranches(),
        fetchItems(),
        fetchUsers()
      ]);

      // Get current user from localStorage (stored as individual fields in Login.jsx)
      const user = {
        _id: localStorage.getItem('userId') || 'temp-user-id',
        name: localStorage.getItem('username') || 'Current User'
      };
      setCurrentUser(user);

      setLoading(false);
    };

    loadData();
  }, []);

  // Fetch issue notes from API
  const fetchIssueNotes = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/issue-notes');
      const data = await response.json();
      console.log('Fetched issue notes from API:', data);

      // Transform API data to match component format
      const transformedData = Array.isArray(data) ? data.map(note => {
        // Handle both populated and non-populated references
        const toBranchName = note.toBranchId?.branchName || note.toBranchId?.branch_name || 'External';
        const issuedByName = note.issuedBy?.name || note.issuedBy?.username || 'System User';

        // Map status correctly
        let displayStatus = 'Pending';
        if (note.status === 'approved') displayStatus = 'Processing';
        else if (note.status === 'completed') displayStatus = 'Completed';
        else if (note.status === 'rejected') displayStatus = 'Rejected';
        else if (note.status === 'cancelled') displayStatus = 'Cancelled';
        else if (note.status === 'pending') displayStatus = 'Pending';

        // Calculate total quantity
        const totalQty = (note.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

        return {
          id: note._id,
          issueNumber: note.issueNoteNumber,
          issueType: note.purpose || 'Branch Transfer',
          issuedTo: toBranchName,
          issueDate: new Date(note.issueDate).toISOString().split('T')[0],
          issuedBy: issuedByName,
          status: displayStatus,
          itemCount: note.items?.length || 0,
          quantity: totalQty,
          items: (note.items || []).map(item => ({
            id: item.itemId?._id || item.itemId,
            name: item.itemId?.name || 'Unknown Item',
            qty: item.quantity,
            unit: item.itemId?.unit || item.itemUnitId?.unitName || 'unit',
            availableQty: 0
          })),
          _original: note // Keep original data for API calls
        };
      }) : [];

      console.log('Transformed issue notes:', transformedData);
      setIssueNotes(transformedData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching issue notes:', err);
      setLoading(false);
    }
  };

  // Fetch branches from API
  const fetchBranches = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/branches');
      const data = await response.json();

      console.log('Branches API response:', data);

      // Handle both response formats: { success: true, data: [...] } or direct array
      const branchesArray = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);

      console.log('Fetched branches:', branchesArray.length, branchesArray);
      setBranches(branchesArray);
    } catch (err) {
      console.error('Error fetching branches:', err);
      setBranches([]);
    }
  };

  // Fetch items from API
  const fetchItems = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/items');
      const data = await response.json();
      const itemsArray = Array.isArray(data) ? data : [];
      console.log('Fetched items:', itemsArray.length);
      setItems(itemsArray);
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users');
      const data = await response.json();
      const usersArray = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
      console.log('Fetched users:', usersArray.length, usersArray);
      setUsers(usersArray);

      if (usersArray.length === 0) {
        console.warn('⚠️ No users found! Please add users in the Users page.');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Category data with items
  const [categories, setCategories] = useState([]);

  // Fetch categories from backend if needed
  useEffect(() => {
    // Categories will be empty for now - can be populated from backend later
    setCategories([]);
  }, []);

  // Get available items based on selected category
  const getAvailableItems = () => {
    const selectedCategory = categories.find(c => c.id === formData.category);
    return selectedCategory ? selectedCategory.items : [];
  };

  const currentData = issueNotes;

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completed":
      case "Approved":
        return <FaCheckCircle className="status-icon completed" />;
      case "Processing":
        return <FaClock className="status-icon processing" />;
      case "Pending":
        return <FaTimesCircle className="status-icon pending" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
      case "Approved":
        return "completed";
      case "Processing":
        return "processing";
      case "Pending":
        return "pending";
      default:
        return "pending";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "Branch Transfer":
      case "Stock Request":
        return "branch";
      case "Training Transfer":
      case "Equipment Request":
        return "training";
      case "Stock Transfer":
        return "stock";
      default:
        return "branch";
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setExpandedId(null);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openModal = (item) => {
    setSelectedItem(item);
    setEditedItems(item.items.map(i => ({ ...i, qty: parseInt(i.qty) })));
    setIsEditing(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setIsEditing(false);
    setEditedItems([]);
  };

  const handleQuantityChange = (itemId, newQty) => {
    const updatedItems = editedItems.map(item =>
      item.id === itemId ? { ...item, qty: parseInt(newQty) || 0 } : item
    );
    setEditedItems(updatedItems);
  };

  const handleSaveChanges = () => {
    console.log("Saving changes:", editedItems);
    alert("Changes saved successfully!");
    setIsEditing(false);
  };

  const handleApprove = async () => {
    if (activeTab === "issueNotes" && selectedItem._original) {
      try {
        const response = await fetch(`http://localhost:5000/api/issue-notes/${selectedItem._original._id}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            approvedBy: currentUser?._id || users[0]?._id
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to approve issue note');
        }

        alert("Order approved! Stock has been updated.");
        closeModal();
        fetchIssueNotes(); // Refresh the list
      } catch (error) {
        console.error('Error approving issue note:', error);
        alert('Error approving issue note: ' + error.message);
      }
    } else {
      // Fallback for old data
      if (activeTab === "issueNotes") {
        setIssueNotes(issueNotes.map(item =>
          item.id === selectedItem.id ? { ...item, status: "Processing" } : item
        ));
      }
      alert("Order approved! Status changed to Processing.");
      closeModal();
    }
  };

  const handleIssueItems = () => {
    if (activeTab === "issueNotes") {
      setIssueNotes(issueNotes.map(item =>
        item.id === selectedItem.id ? { ...item, status: "Completed" } : item
      ));
    }
    console.log("Issuing items:", editedItems);
    alert("Items issued successfully!");
    handlePrintInvoice();
  };

  const handleReject = async () => {
    if (activeTab === "issueNotes" && selectedItem._original) {
      try {
        const response = await fetch(`http://localhost:5000/api/issue-notes/${selectedItem._original._id}/reject`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            approvedBy: currentUser?._id || users[0]?._id,
            remarks: 'Rejected by user'
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to reject issue note');
        }

        alert("Order rejected!");
        closeModal();
        fetchIssueNotes(); // Refresh the list
      } catch (error) {
        console.error('Error rejecting issue note:', error);
        alert('Error rejecting issue note: ' + error.message);
      }
    } else {
      // Fallback for old data
      if (activeTab === "issueNotes") {
        setIssueNotes(issueNotes.map(item =>
          item.id === selectedItem.id ? { ...item, status: "Rejected" } : item
        ));
      }
      alert("Order rejected!");
      closeModal();
    }
  };

  const handleCancelOrder = () => {
    if (activeTab === "issueNotes") {
      setIssueNotes(issueNotes.map(item =>
        item.id === selectedItem.id ? { ...item, status: "Cancelled" } : item
      ));
    }
    alert("Order cancelled!");
    closeModal();
  };

  const handlePrintInvoice = () => {
    if (!selectedItem || editedItems.length === 0) {
      alert("No items to print");
      return;
    }

    const printWindow = window.open("", "", "width=900,height=1200");
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    let invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Issue Invoice - ${activeTab === "issueNotes" ? selectedItem.issueNumber : selectedItem.requestNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            background-color: #fff;
            padding: 20px;
          }
          
          .print-container {
            max-width: 900px;
            margin: 0 auto;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
          }
          
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #1e3a8a;
            margin-bottom: 5px;
          }
          
          .invoice-title {
            font-size: 22px;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 10px;
          }
          
          .status-badge-print {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
            margin-top: 10px;
            text-transform: uppercase;
          }
          
          .status-badge-print.completed {
            background-color: #dcfce7;
            color: #166534;
          }
          
          .status-badge-print.processing {
            background-color: #fef3c7;
            color: #92400e;
          }
          
          .status-badge-print.pending {
            background-color: #fee2e2;
            color: #991b1b;
          }
          
          .header-info {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
          
          .info-block {
            text-align: left;
          }
          
          .info-label {
            font-weight: bold;
            color: #1e3a8a;
            margin-top: 8px;
          }
          
          .info-value {
            color: #333;
            margin-top: 3px;
          }
          
          .details-section {
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          
          .detail-box {
            background-color: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
          }
          
          .detail-box h3 {
            color: #1e3a8a;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 10px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 5px;
          }
          
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
          }
          
          .detail-row span:first-child {
            color: #666;
            font-weight: 600;
          }
          
          .detail-row span:last-child {
            color: #1e3a8a;
            font-weight: 500;
          }
          
          .items-section {
            margin: 30px 0;
          }
          
          .items-section h2 {
            font-size: 16px;
            color: #1e3a8a;
            margin-bottom: 15px;
            text-transform: uppercase;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
          }
          
          .item-invoice {
            background: white;
            border: 2px solid #dbeafe;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          
          .item-invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
          }
          
          .item-name {
            font-size: 16px;
            font-weight: bold;
            color: #1e3a8a;
          }
          
          .item-number {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: bold;
          }
          
          .item-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 15px;
          }
          
          .item-detail {
            background-color: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
          }
          
          .item-detail-label {
            color: #666;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          
          .item-detail-value {
            color: #1e3a8a;
            font-size: 14px;
            font-weight: 600;
          }
          
          .item-qty-box {
            background: linear-gradient(135deg, #f0f4ff 0%, #e8eef7 100%);
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #dbeafe;
            text-align: center;
            margin-top: 15px;
          }
          
          .item-qty-label {
            color: #666;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          
          .item-qty-value {
            color: #667eea;
            font-size: 24px;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            border-top: 2px solid #e5e7eb;
            padding-top: 20px;
            font-size: 12px;
            color: #999;
          }
          
          .signature-section {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 40px;
            margin-top: 40px;
            padding-top: 20px;
          }
          
          .signature-box {
            text-align: center;
            border-top: 2px solid #333;
            padding-top: 10px;
          }
          
          .signature-label {
            font-size: 11px;
            font-weight: bold;
            color: #1e3a8a;
            text-transform: uppercase;
            margin-top: 30px;
          }
          
          @media print {
            body {
              padding: 0;
            }
            .print-container {
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="header">
            <div class="company-name">☕ CBBS GROUP</div>
            <div class="invoice-title">${activeTab === "issueNotes" ? "ISSUE NOTE" : "REQUEST INVOICE"}</div>
            <div class="status-badge-print ${getStatusColor(selectedItem.status)}">
              ${selectedItem.status}
            </div>
            <div class="header-info">
              <div class="info-block">
                <div class="info-label">Invoice Date:</div>
                <div class="info-value">${formattedDate}</div>
              </div>
              <div class="info-block">
                <div class="info-label">Invoice Number:</div>
                <div class="info-value">${activeTab === "issueNotes" ? selectedItem.issueNumber : selectedItem.requestNumber}</div>
              </div>
              <div class="info-block">
                <div class="info-label">Status:</div>
                <div class="info-value">${selectedItem.status}</div>
              </div>
            </div>
          </div>
          
          <div class="details-section">
            <div class="detail-box">
              <h3>${activeTab === "issueNotes" ? "Issued To" : "Requested From"}</h3>
              <div class="detail-row">
                <span>Branch/Location:</span>
                <span>${activeTab === "issueNotes" ? selectedItem.issuedTo : selectedItem.requestFrom}</span>
              </div>
              <div class="detail-row">
                <span>${activeTab === "issueNotes" ? "Issue Date:" : "Request Date:"}</span>
                <span>${selectedItem.issueDate || selectedItem.requestDate}</span>
              </div>
              <div class="detail-row">
                <span>Type:</span>
                <span>${selectedItem.issueType || selectedItem.requestType}</span>
              </div>
            </div>
            
            <div class="detail-box">
              <h3>Transaction Details</h3>
              <div class="detail-row">
                <span>${activeTab === "issueNotes" ? "Issued By:" : "Requested By:"}</span>
                <span>${selectedItem.issuedBy || selectedItem.requestedBy}</span>
              </div>
              <div class="detail-row">
                <span>Total Items:</span>
                <span>${editedItems.length}</span>
              </div>
              <div class="detail-row">
                <span>Total Quantity:</span>
                <span>${editedItems.reduce((sum, item) => sum + item.qty, 0)}</span>
              </div>
            </div>
          </div>
          
          <div class="items-section">
            <h2>📦 Items List</h2>
    `;

    // Add each item separately
    editedItems.forEach((item, index) => {
      invoiceHTML += `
        <div class="item-invoice">
          <div class="item-invoice-header">
            <span class="item-name">${item.name}</span>
            <span class="item-number">Item ${index + 1} of ${editedItems.length}</span>
          </div>
          
          <div class="item-details">
            <div class="item-detail">
              <div class="item-detail-label">Item ID</div>
              <div class="item-detail-value">#${item.id}</div>
            </div>
            <div class="item-detail">
              <div class="item-detail-label">Unit Type</div>
              <div class="item-detail-value">${item.unit}</div>
            </div>
            <div class="item-detail">
              <div class="item-detail-label">Available Qty</div>
              <div class="item-detail-value">${item.availableQty} ${item.unit}</div>
            </div>
            <div class="item-detail">
              <div class="item-detail-label">Status</div>
              <div class="item-detail-value">Ready to Issue</div>
            </div>
          </div>
          
          <div class="item-qty-box">
            <div class="item-qty-label">Quantity to Issue</div>
            <div class="item-qty-value">${item.qty} ${item.unit}</div>
          </div>
        </div>
      `;
    });

    invoiceHTML += `
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-label">Authorized By</div>
            </div>
            <div class="signature-box">
              <div class="signature-label">Received By</div>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an auto-generated document. Print date: ${formattedDate}</p>
            <p>© 2025 CBBS Group. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setFormData({
      issueNumber: "ISS-2025-XXX",
      issueDate: new Date().toISOString().split('T')[0],
      issueType: "Training Sessions",
      trainingSession: "",
      category: "coffee-supplies",
      items: []
    });
    setItemQuantity(0);
    setSelectedItemForAdd(null);
    setEditingItemId(null);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingItemId(null);
    // Reset form when closing
    setFormData({
      issueNumber: "ISS-2025-XXX",
      issueDate: new Date().toISOString().split('T')[0],
      issueType: "Training Sessions",
      trainingSession: "",
      category: "coffee-supplies",
      items: []
    });
    setSelectedItemForAdd(null);
    setItemQuantity(0);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Only reset item selection when category changes, NOT the items already added
    if (field === 'category') {
      setSelectedItemForAdd(null);
      setItemQuantity(0);
      // Don't clear the items array - keep previously added items
    }
  };

  const handleAddItemToForm = () => {
    if (!selectedItemForAdd || itemQuantity <= 0) {
      alert("Please select an item and enter quantity");
      return;
    }

    // Try to find from API items first
    let item = null;
    if (items.length > 0) {
      item = items.find(i => i._id === selectedItemForAdd);
      if (item) {
        // Check if item already exists to avoid duplicates
        const itemExists = formData.items.some(i => i.id === item._id);
        if (itemExists) {
          alert("This item is already added. Edit it instead.");
          return;
        }

        const newItem = {
          id: item._id,
          name: item.name,
          qty: itemQuantity,
          availableQty: item.quantity || 0,
          unit: item.unit || 'unit',
          tempId: Date.now()
        };

        setFormData(prev => ({
          ...prev,
          items: [...prev.items, newItem]
        }));

        setSelectedItemForAdd(null);
        setItemQuantity(0);
        return;
      }
    }

    // Fallback to hardcoded items
    const availableItems = getAvailableItems();
    item = availableItems.find(i => i.id === parseInt(selectedItemForAdd));
    if (!item) return;

    // Check if item already exists to avoid duplicates
    const itemExists = formData.items.some(i => i.id === item.id);
    if (itemExists) {
      alert("This item is already added. Edit it instead.");
      return;
    }

    const newItem = {
      id: item.id,
      name: item.name,
      qty: itemQuantity,
      availableQty: item.availableQty,
      unit: item.unit,
      tempId: Date.now()
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setSelectedItemForAdd(null);
    setItemQuantity(0);
  };

  const handleRemoveItemFromForm = (tempId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.tempId !== tempId)
    }));
    setEditingItemId(null);
  };

  const handleEditItem = (tempId) => {
    setEditingItemId(tempId);
  };

  const handleUpdateItemQty = (tempId, newQty) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.tempId === tempId ? { ...i, qty: parseInt(newQty) || 0 } : i
      )
    }));
  };

  const handleSaveItemEdit = () => {
    setEditingItemId(null);
  };

  const handleCreateIssueNote = async () => {
    console.log("=== CREATE ISSUE NOTE START ===");
    console.log("Branches state:", branches);
    console.log("FormData:", formData);

    if (!formData.trainingSession || formData.items.length === 0) {
      alert("Please fill all required fields and add at least one item");
      return;
    }

    console.log("=== CREATE ISSUE NOTE DEBUG ===");
    console.log("Branches available:", branches.length, branches);
    console.log("Users available:", users.length, users);
    console.log("Items in form:", formData.items.length, formData.items);
    console.log("Selected training session:", formData.trainingSession);
    console.log("Issue type:", formData.issueType);

    // Find the branch ID if it's a branch transfer
    let toBranchId = null;
    if (formData.issueType === "Branch Transfer" || formData.issueType === "Stock Transfer") {
      // formData.trainingSession now contains the branch ID directly
      toBranchId = formData.trainingSession;

      if (!toBranchId) {
        alert("Please select a branch.");
        return;
      }

      console.log("Selected branch ID:", toBranchId);
    }

    // Get the first branch as source
    let fromBranchId = branches[0]?._id || branches[0]?.id;

    if (!fromBranchId) {
      console.error("No branches found in state. Branches:", branches);
      alert("No branches configured. Please go to the Branches page and add at least one branch first.");
      return;
    }

    // Get user ID - try multiple sources with automatic fallback
    let issuedBy = currentUser?._id || currentUser?.id;

    if (!issuedBy && users.length > 0) {
      issuedBy = users[0]._id || users[0].id;
    }

    // If still no user, use a placeholder - backend will create a default system user
    if (!issuedBy) {
      console.warn("No user found. Backend will auto-create a system user.");
      issuedBy = '000000000000000000000000'; // Placeholder - backend will handle it
    }

    // Prepare items for API
    const apiItems = formData.items.map(item => ({
      itemId: item.id,
      quantity: parseInt(item.qty) || 0,
      unitPrice: 0,
      remarks: ''
    }));

    if (apiItems.length === 0) {
      alert("No items to issue. Please add items first.");
      return;
    }

    // Prepare issue note data for API
    const issueNoteData = {
      fromBranchId: fromBranchId,
      toBranchId: toBranchId,
      issuedBy: issuedBy,
      purpose: formData.issueType + ' - ' + formData.trainingSession,
      remarks: '',
      items: apiItems
    };

    console.log("Sending to API:", JSON.stringify(issueNoteData, null, 2));

    try {
      const response = await fetch('http://localhost:5000/api/issue-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(issueNoteData)
      });

      const responseText = await response.text();
      console.log("API Response:", responseText);

      if (!responseText) {
        throw new Error("Empty response from server");
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response:", e);
        throw new Error("Invalid response from server");
      }

      if (!response.ok) {
        console.error("API Error:", data);
        throw new Error(data.error || 'Failed to create issue note');
      }

      console.log('Issue note created:', data);

      // Reset form
      setFormData({
        issueNumber: "ISS-2025-XXX",
        issueDate: new Date().toISOString().split('T')[0],
        issueType: "Training Sessions",
        trainingSession: "",
        category: "coffee-supplies",
        items: []
      });
      setSelectedItemForAdd(null);
      setItemQuantity(0);

      alert("Issue Note created successfully!");
      closeCreateModal();
      fetchIssueNotes(); // Refresh the list
    } catch (error) {
      console.error('Error creating issue note:', error);
      alert('Error creating issue note: ' + error.message);
    }
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="body-layout">
        <Sidebar />
        <div className="main-content">
          <div className="content-wrapper">
            <div className="issuenote-container">
              {/* Header Section */}
              <div className="header-section">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="🔍 Search by issue number, branch name..."
                    className="search-input"
                  />
                </div>
                {canEdit && (
                  <button className="btn-create-issue" onClick={openCreateModal}>
                    + Create New
                  </button>
                )}
              </div>

              {/* Toggle Tab Buttons */}
              <div className="tab-toggle-section">
                <button
                  className={`tab-toggle-btn ${activeTab === "issueNotes" ? "active" : ""}`}
                  onClick={() => handleTabChange("issueNotes")}
                >
                  📋 Issue Notes
                </button>
                <button
                  className={`tab-toggle-btn ${activeTab === "branchRequests" ? "active" : ""}`}
                  onClick={() => handleTabChange("branchRequests")}
                >
                  📮 Branch Requests
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#fee',
                  color: '#c00',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid #fcc',
                  fontSize: '14px'
                }}>
                  ❌ Error: {error}
                </div>
              )}

              {/* Loading Message */}
              {loading && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  ⏳ Loading issue notes...
                </div>
              )}

              {/* Stats Cards */}
              <div className="stats-row">
                {activeTab === "issueNotes" ? (
                  <>
                    <div className="stat-card">
                      <div className="stat-icon completed">
                        <FaCheckCircle />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Completed</span>
                        <span className="stat-value">{issueNotes.filter(i => i.status === "Completed").length}</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon processing">
                        <FaClock />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Processing</span>
                        <span className="stat-value">{issueNotes.filter(i => i.status === "Processing").length}</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon pending">
                        <FaTimesCircle />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Pending</span>
                        <span className="stat-value">{issueNotes.filter(i => i.status === "Pending").length}</span>
                      </div>
                    </div>
                    <div className="stat-card total">
                      <div className="stat-icon">📊</div>
                      <div className="stat-info">
                        <span className="stat-label">Total Issues</span>
                        <span className="stat-value">{issueNotes.length}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stat-card">
                      <div className="stat-icon completed">
                        <FaCheckCircle />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Approved</span>
                        <span className="stat-value">1</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon processing">
                        <FaClock />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Processing</span>
                        <span className="stat-value">1</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon pending">
                        <FaTimesCircle />
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Pending</span>
                        <span className="stat-value">1</span>
                      </div>
                    </div>
                    <div className="stat-card total">
                      <div className="stat-icon">📮</div>
                      <div className="stat-info">
                        <span className="stat-label">Total Notes</span>
                        <span className="stat-value">{issueNotes.length}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>



              {/* List View - Creative Expandable */}
              {viewType === 'list' && (
                <div className="issues-list-creative">
                  {currentData.map((item) => (
                    <div
                      key={item.id}
                      className="list-item-creative"
                    >
                      {/* Main Row */}
                      <div className="list-row-main">
                        <div className="row-left">
                          <div className="issue-number-badge">
                            {activeTab === "issueNotes" ? item.issueNumber : item.requestNumber}
                          </div>
                          <div className="row-info">
                            <h4 className="branch-name">
                              {activeTab === "issueNotes" ? item.issuedTo : item.requestFrom}
                            </h4>
                            <div className="row-details">
                              <span className="detail-item">
                                <span className="detail-icon">📅</span>
                                {item.issueDate || item.requestDate}
                              </span>
                              <span className="detail-item">
                                <span className="detail-icon">👤</span>
                                {item.issuedBy || item.requestedBy}
                              </span>
                              <span className="detail-item">
                                <span className="detail-icon">📦</span>
                                {item.itemCount} items
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="row-right">
                          <span className={`type-badge ${getTypeColor(item.issueType || item.requestType)}`}>
                            {item.issueType || item.requestType}
                          </span>
                          <div className={`status-badge ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span>{item.status}</span>
                          </div>
                          <button
                            className="view-details-btn"
                            onClick={() => openModal(item)}
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Issue Note Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal-content create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="create-modal-header">
              <h2>Create Issue Note</h2>
              <p>Issue stock to branches or training sessions</p>
              <button className="modal-close-btn" onClick={closeCreateModal}>
                <FaTimes />
              </button>
            </div>

            <div className="create-modal-body">
              {/* Issue Number and Date Row */}
              <div className="form-row">
                <div className="form-group">
                  <label>Issue Number</label>
                  <input
                    type="text"
                    value={formData.issueNumber}
                    disabled
                    className="form-input disabled"
                    placeholder="ISS-2025-XXX"
                  />
                </div>
                <div className="form-group">
                  <label>Issue Date</label>
                  <div className="date-input-wrapper">
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => handleFormChange('issueDate', e.target.value)}
                      className="form-input"
                    />
                    <span className="calendar-icon">📅</span>
                  </div>
                </div>
              </div>

              {/* Issue Type */}
              <div className="form-group full-width">
                <label>Issue Type</label>
                <select
                  value={formData.issueType}
                  onChange={(e) => handleFormChange('issueType', e.target.value)}
                  className="form-select"
                >
                  <option value="Training Sessions">Training Sessions</option>
                  <option value="Branch Transfer">Branch Transfer</option>
                  <option value="Stock Transfer">Stock Transfer</option>
                </select>
              </div>

              {/* Training Session / Branch Name */}
              <div className="form-group full-width">
                <label>{formData.issueType === "Training Sessions" ? "Training Sessions" : "Branch Name"}</label>
                {formData.issueType === "Training Sessions" ? (
                  <input
                    type="text"
                    value={formData.trainingSession}
                    onChange={(e) => handleFormChange('trainingSession', e.target.value)}
                    className="form-input"
                    placeholder="e.g. Barista Level 1"
                  />
                ) : (
                  <select
                    value={formData.trainingSession}
                    onChange={(e) => handleFormChange('trainingSession', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select a branch...</option>
                    {branches.map(branch => {
                      const branchName = branch.branchName || branch.branch_name || 'Unknown';
                      const branchCode = branch.branchCode || branch.branch_code || '';
                      const branchId = branch._id || branch.id;
                      return (
                        <option key={branchId} value={branchId}>
                          {branchName} {branchCode ? `(${branchCode})` : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Category Selection - Dropdown */}
              <div className="form-group full-width">
                <label>Select Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleFormChange('category', e.target.value)}
                  className="form-select category-select"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Issue Items Section */}
              <div className="form-group full-width">
                <label>Issue Items from {categories.find(c => c.id === formData.category)?.name || 'All Items'}</label>
                <div className="items-input-section">
                  <div className="item-select-row">
                    <div className="item-select-group">
                      <label>Select Item</label>
                      <select
                        value={selectedItemForAdd || ""}
                        onChange={(e) => setSelectedItemForAdd(e.target.value)}
                        className="form-select"
                      >
                        <option value="">Select an item......</option>
                        {/* Show items from database if available, otherwise use hardcoded categories */}
                        {items.length > 0 ? (
                          items.map(item => (
                            <option key={item._id} value={item._id}>
                              {item.name} (Available: {item.quantity || 0} {item.unit})
                            </option>
                          ))
                        ) : (
                          getAvailableItems().map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="item-qty-row">
                      <label>Quantity</label>
                      <div className="qty-input-group">
                        <input
                          type="number"
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(parseInt(e.target.value) || 0)}
                          className="form-input qty-input-small"
                          placeholder="0"
                          min="0"
                        />
                        <button
                          className="btn-add-item"
                          onClick={handleAddItemToForm}
                          title="Add Item"
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Added Items List with Edit Feature */}
                  {formData.items.length > 0 && (
                    <div className="added-items-list">
                      {formData.items.map((item) => (
                        <div key={item.tempId} className="added-item">
                          {editingItemId === item.tempId ? (
                            // Edit Mode
                            <div className="added-item-edit">
                              <div className="item-edit-content">
                                <span className="item-name-edit">{item.name}</span>
                                <div className="qty-edit-group">
                                  <label>Edit Qty:</label>
                                  <input
                                    type="number"
                                    value={item.qty}
                                    onChange={(e) => handleUpdateItemQty(item.tempId, e.target.value)}
                                    className="qty-edit-input"
                                    min="0"
                                  />
                                  <span className="unit-edit">{item.unit}</span>
                                </div>
                              </div>
                              <div className="edit-actions">
                                <button
                                  className="btn-save-edit"
                                  onClick={handleSaveItemEdit}
                                  type="button"
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  className="btn-cancel-edit"
                                  onClick={() => setEditingItemId(null)}
                                  type="button"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <>
                              <span className="item-info">
                                <strong>{item.name}</strong>
                                <span className="item-detail"> • {item.qty} {item.unit}</span>
                              </span>
                              <div className="item-actions">
                                <button
                                  className="btn-edit-item"
                                  onClick={() => handleEditItem(item.tempId)}
                                  title="Edit Quantity"
                                  type="button"
                                >
                                  ✎
                                </button>
                                <button
                                  className="btn-remove-item"
                                  onClick={() => handleRemoveItemFromForm(item.tempId)}
                                  title="Remove Item"
                                  type="button"
                                >
                                  ✕
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="create-modal-footer">
              <button className="btn-cancel" onClick={closeCreateModal} type="button">
                Cancel
              </button>
              <button className="btn-submit" onClick={handleCreateIssueNote} type="button">
                Add Issue Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Modal Popup */}
      {showModal && selectedItem && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2 className="modal-title">
                  {activeTab === "issueNotes" ? "Issue Note Details" : "Branch Request Details"}
                </h2>
                <p className="modal-subtitle">Manage item quantities and issue items</p>
              </div>
              <div className="modal-header-buttons">
                <button className="modal-print-btn" onClick={handlePrintInvoice} title="Print Invoice">
                  <FaPrint /> Print
                </button>
                <button className="modal-close-btn" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* Issue Number and Type */}
              <div className="modal-id-section">
                <span className="modal-issue-id">
                  {activeTab === "issueNotes" ? selectedItem.issueNumber : selectedItem.requestNumber}
                </span>
                <span className={`modal-type-badge ${getTypeColor(selectedItem.issueType || selectedItem.requestType)}`}>
                  {selectedItem.issueType || selectedItem.requestType}
                </span>
                <span className={`modal-status-badge ${getStatusColor(selectedItem.status)}`}>
                  {selectedItem.status}
                </span>
              </div>

              {/* Details Box */}
              <div className="modal-info-box">
                <div className="info-grid">
                  <div className="info-item">
                    <label>{activeTab === "issueNotes" ? "Issued To" : "Requested From"}</label>
                    <span className="info-value">
                      {activeTab === "issueNotes" ? selectedItem.issuedTo : selectedItem.requestedFrom}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>{activeTab === "issueNotes" ? "Issue Date" : "Request Date"}</label>
                    <span className="info-value">
                      {selectedItem.issueDate || selectedItem.requestDate}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>{activeTab === "issueNotes" ? "Issued By" : "Requested By"}</label>
                    <span className="info-value">
                      {selectedItem.issuedBy || selectedItem.requestedBy}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Type</label>
                    <span className="info-value">
                      {selectedItem.issueType || selectedItem.requestType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Section with Edit Mode */}
              <div className="modal-items-section">
                <div className="items-section-header">
                  <h3 className="modal-section-title">
                    {activeTab === "issueNotes" ? "Issued Items" : "Requested Items"}
                  </h3>
                  {(selectedItem.status === "Pending" || selectedItem.status === "Processing") && canEdit ? (
                    <button
                      className={`edit-toggle-btn ${isEditing ? 'active' : ''}`}
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <FaEdit /> {isEditing ? 'Cancel' : 'Edit Items'}
                    </button>
                  ) : null}
                </div>

                <div className="modal-items-table">
                  <div className="table-header">
                    <span className="col-name">Item Name</span>
                    <span className="col-available">Available</span>
                    <span className="col-qty">Quantity to Issue</span>
                  </div>
                  <div className="table-body">
                    {editedItems.map((itemData, idx) => (
                      <div key={idx} className="table-row">
                        <span className="col-name">{itemData.name}</span>
                        <span className="col-available">
                          {itemData.availableQty} {itemData.unit}
                        </span>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            max={itemData.availableQty}
                            value={itemData.qty}
                            onChange={(e) => handleQuantityChange(itemData.id, e.target.value)}
                            className="qty-input"
                          />
                        ) : (
                          <span className="col-qty">
                            {itemData.qty} {itemData.unit}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="items-summary">
                  <div className="summary-item">
                    <span className="summary-label">Total Items:</span>
                    <span className="summary-value">{editedItems.length}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Quantity:</span>
                    <span className="summary-value">
                      {editedItems.reduce((sum, item) => sum + item.qty, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {isEditing ? (
                <>
                  <button className="modal-btn cancel" onClick={() => setIsEditing(false)}>
                    ← Cancel Edit
                  </button>
                  <button className="modal-btn save" onClick={handleSaveChanges}>
                    <FaSave /> Save Changes
                  </button>
                </>
              ) : (
                <>
                  {selectedItem.status === "Pending" && canEdit && (
                    <>
                      <button className="modal-btn reject" onClick={handleReject}>
                        <FaBan /> Reject
                      </button>
                      <button className="modal-btn approve" onClick={handleApprove}>
                        <FaCheck /> Approve
                      </button>
                    </>
                  )}

                  {selectedItem.status === "Processing" && canEdit && (
                    <>
                      <button className="modal-btn cancel-order" onClick={handleCancelOrder}>
                        <FaBan /> Cancel Order
                      </button>
                      <button className="modal-btn issue" onClick={handleIssueItems}>
                        ✓ Issue Items
                      </button>
                    </>
                  )}

                  {selectedItem.status === "Completed" && (
                    <button className="modal-btn cancel" onClick={closeModal}>
                      ← Close
                    </button>
                  )}

                  {selectedItem.status === "Rejected" || selectedItem.status === "Cancelled" ? (
                    <button className="modal-btn cancel" onClick={closeModal}>
                      ← Close
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Assistant */}
      <ChatAssistant />
    </div>
  );
};

export default IssueNote;
