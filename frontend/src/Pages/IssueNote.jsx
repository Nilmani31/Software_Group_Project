import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../Components/Sidebar";
import Navbar from "../Components/Navbar";
import ChatAssistant from "../Components/ChatAssistant";
import ConfirmDialog from "../Components/ConfirmDialog";
import ModernDropdown from "../Components/ModernDropdown";
import { getAuthHeaders } from "../utils/authHeaders";
import {
  FileText, CheckCircle2, Clock, XCircle, Plus, Search, Building2, Calendar,
  Printer, Edit3, Trash2, Layers, Boxes, ArrowRight, Send, AlertCircle,
  X, Check, Ban, Eye, RotateCcw, PackageCheck, Truck, ArrowRightLeft, User, DollarSign, Filter
} from "lucide-react";
import { FaPrint, FaSave, FaTimes, FaPlus, FaTrash, FaBoxOpen, FaTruck, FaFileInvoice, FaCheckCircle, FaClock, FaTimesCircle } from "react-icons/fa";

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
  const defaultBranchId = localStorage.getItem('branchId') || '';
  const userRole = roleId.replace('ROLE_', '');
  let userPerms = [];
  try {
    userPerms = JSON.parse(localStorage.getItem('permissions') || '[]');
  } catch (e) {}
  const canEdit = userPerms.includes('ALL') || userPerms.includes('ISSUE_NOTES');
  const [viewType, setViewType] = useState("list");
  const [activeTab, setActiveTab] = useState("issueNotes");
  const [expandedId, setExpandedId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState("issueNote");
  const [formData, setFormData] = useState({
    issueNumber: "ISS-2025-XXX",
    issueDate: new Date().toISOString().split('T')[0],
    issueType: "",
    trainingSession: "",
    category: "",
    items: []
  });
  const [selectedItemForAdd, setSelectedItemForAdd] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(0);
  const [editingItemId, setEditingItemId] = useState(null); // New state for editing
  const [pendingCreate, setPendingCreate] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState([]);

  // Fetch data from API on component mount
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchIssueNotes(),
        fetchBranches(),
        fetchItems(),
        fetchUsers(),
        fetchCategories()
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
      setError('');
      const response = await fetch('http://localhost:5005/api/issue-notes', { headers: getAuthHeaders() });
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
        else if (note.status === 'issued') displayStatus = 'issued';
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
            itemUnitId: item.itemUnitId?._id || item.itemUnitId,
            qty: item.quantity,
            unit: item.itemUnitId?.unit || item.itemId?.unit || 'unit',
            unitPrice: item.unitPrice || item.itemUnitId?.unitPrice || 0,
            totalPrice: item.totalPrice || 0,
            availableQty: item.availableQty || 0
          })),
          _original: note // Keep original data for API calls
        };
      }) : [];

      console.log('Transformed issue notes:', transformedData);
      setIssueNotes(transformedData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching issue notes:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Fetch branches from API
  const fetchBranches = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/branches');
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
      const response = await fetch('http://localhost:5005/api/items', { headers: getAuthHeaders() });
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
      const response = await fetch('http://localhost:5005/api/users', { headers: getAuthHeaders() });
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

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5005/api/categories', { headers: getAuthHeaders() });
      const data = await response.json();
      const categoriesArray = Array.isArray(data) ? data : [];
      // Map backend fields ({ _id, name, categoryId, ... }) to the shape
      // expected by the dropdown ({ id, name })
      const mapped = categoriesArray.map(cat => ({
        id: cat._id,
        name: cat.name || cat.categoryId || 'Unknown',
      }));
      console.log('Fetched categories:', mapped.length, mapped);
      setCategories(mapped);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
    }
  };

  // Get available items based on selected category (defaults to all items if no category selected)
  const getAvailableItems = () => {
    if (!formData.category) return items;
    const selectedCategory = categories.find(c => String(c.id) === String(formData.category));
    if (!selectedCategory) return items;
    const catName = (selectedCategory.name || '').toLowerCase();
    const catId = String(selectedCategory.id || selectedCategory._id);
    return items.filter(item => {
      const itemCat = (item.categoryName || item.category?.name || item.category || '').toLowerCase();
      const itemCatId = String(item.category?._id || item.categoryId || '');
      return itemCat === catName || itemCat.includes(catName) || itemCatId === catId;
    });
  };

  const getItemOptionId = (item) => item.uniqueId || `${item._id || item.id}_${item.itemUnitId || 'default'}`;

  const getSourceBranch = () => {
    if (formData && formData.fromBranch) {
      const found = branches.find(b => String(b._id || b.id) === String(formData.fromBranch));
      if (found) return found;
    }
    // If current user is assigned to a specific branch, use their branch
    const userBranchId = localStorage.getItem('branchId');
    if (userBranchId && userBranchId !== 'MAIN_BRANCH') {
      const userBranch = branches.find(b => String(b._id || b.id) === String(userBranchId) || b.branchId === userBranchId);
      if (userBranch) return userBranch;
    }
    return branches.find(branch =>
      /main|colombo/i.test(branch.branchName || branch.branch_name || branch.name || '')
    ) || branches[0];
  };

  const getBranchQuantity = (item, branchId) => {
    if (!Array.isArray(item.branchStocks) || item.branchStocks.length === 0) {
      return item.quantity || 0;
    }

    if (!branchId) {
      return item.branchStocks.reduce((sum, stock) => sum + (stock.quantity || 0), 0);
    }

    const branchStock = item.branchStocks.find(stock =>
      String(stock.branchObjectId || stock.branchId) === String(branchId)
    );
    return branchStock ? branchStock.quantity || 0 : 0;
  };

  const getIssueItemLabel = (item) => {
    const sourceBranch = getSourceBranch();
    const fromBranchId = sourceBranch?._id || sourceBranch?.id;
    const availableQty = getBranchQuantity(item, fromBranchId);
    const price = Number(item.unitPrice) || 0;
    const cleanName = item.cleanName || item.baseItemName || item.name.replace(/\s*\(Rs\s?\d+(\.\d+)?\)\s*$/i, '');
    return `${cleanName} | Rs ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | In Stock: ${availableQty} ${item.unit || 'unit'}`;
  };

  const isBranchRequest = (note) => {
    const original = note._original || note;
    return original.creationMode === 'branchRequest';
  };

  const getRequestStatus = (note) =>
    String(note._original?.status || note.status || '').toLowerCase();

  const branchRequestData = issueNotes
    .filter(isBranchRequest)
    .map(note => ({
      ...note,
      requestNumber: note.issueNumber,
      requestFrom: note.issuedTo,
      requestedFrom: note.issuedTo,
      requestedBy: note.issuedBy,
      requestDate: note.issueDate,
      requestType: note.issueType
    }));

  const branchRequestsList = branchRequestData;

  const issueNotesList = useMemo(() => {
    return issueNotes.filter(note => !isBranchRequest(note));
  }, [issueNotes]);

  const activeRawList = activeTab === "branchRequests" ? branchRequestsList : issueNotesList;

  // Real-time dynamic filtering
  const currentData = useMemo(() => {
    return activeRawList.filter(item => {
      const num = (item.issueNumber || item.requestNumber || '').toLowerCase();
      const branch = (item.issuedTo || item.requestFrom || item.requestedFrom || '').toLowerCase();
      const by = (item.issuedBy || item.requestedBy || '').toLowerCase();
      const purpose = (item.issueType || item.requestType || '').toLowerCase();
      const itemNames = (item.items || []).map(i => (i.name || '').toLowerCase()).join(' ');

      const matchesSearch = !searchTerm ||
        num.includes(searchTerm.toLowerCase()) ||
        branch.includes(searchTerm.toLowerCase()) ||
        by.includes(searchTerm.toLowerCase()) ||
        purpose.includes(searchTerm.toLowerCase()) ||
        itemNames.includes(searchTerm.toLowerCase());

      const matchesBranch = !selectedBranchFilter ||
        selectedBranchFilter.length === 0 ||
        selectedBranchFilter === "all" ||
        (Array.isArray(selectedBranchFilter)
          ? selectedBranchFilter.includes("all") || selectedBranchFilter.some(b => branch.includes(String(b).toLowerCase()))
          : branch.includes(String(selectedBranchFilter).toLowerCase()));

      const matchesStatus = !selectedStatusFilter ||
        selectedStatusFilter.length === 0 ||
        selectedStatusFilter === "all" ||
        (Array.isArray(selectedStatusFilter)
          ? selectedStatusFilter.includes("all") || selectedStatusFilter.some(s => String(item.status || '').toLowerCase() === String(s).toLowerCase())
          : String(item.status || '').toLowerCase() === String(selectedStatusFilter).toLowerCase());

      return matchesSearch && matchesBranch && matchesStatus;
    });
  }, [activeRawList, searchTerm, selectedBranchFilter, selectedStatusFilter]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "issued":
      case "Approved":
        return <CheckCircle2 size={13} />;
      case "Processing":
        return <Clock size={13} />;
      case "Pending":
        return <AlertCircle size={13} />;
      case "Rejected":
      case "Cancelled":
        return <XCircle size={13} />;
      default:
        return <Clock size={13} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "issued":
      case "Approved":
        return "issued";
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
    if (selectedItem?._original) {
      try {
        const response = await fetch(`http://localhost:5005/api/issue-notes/${selectedItem._original._id}/approve`, {
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

  const handleIssueItems = async () => {
    if (selectedItem?._original) {
      try {
        const response = await fetch(`http://localhost:5005/api/issue-notes/${selectedItem._original._id}/issued`, {
          method: 'PUT',
          headers: getAuthHeaders()
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to issue items');
        }

        await fetchIssueNotes();
        closeModal();
        alert("Items issued successfully!");
      } catch (error) {
        console.error('Error issuing items:', error);
        alert('Error issuing items: ' + error.message);
      }
      return;
    }

    console.log("Issuing items:", editedItems);
    alert("Items issued successfully!");
    handlePrintInvoice();
  };

  const handleReject = async () => {
    if (selectedItem?._original) {
      try {
        const response = await fetch(`http://localhost:5005/api/issue-notes/${selectedItem._original._id}/reject`, {
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
    if (selectedItem?._original) {
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
    if (!printWindow) {
      alert("Please allow popups for this site to print the invoice.");
      return;
    }
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
          
          .status-badge-print.issued {
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

    try {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (err) {
      console.error('Print error:', err);
      alert('Unable to print. Please check your popup blocker settings.');
    }
  };

  const openCreateModal = () => {
    setCreateMode("issueNote");
    setShowCreateModal(true);
    setFormData({
      issueNumber: "ISS-2025-XXX",
      issueDate: new Date().toISOString().split('T')[0],
      issueType: "",
      trainingSession: "",
      fromBranch: "",
      category: "",
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
      issueType: "",
      trainingSession: "",
      fromBranch: "",
      category: "",
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
      item = items.find(i => getItemOptionId(i) === selectedItemForAdd);
      if (item) {
        // Check if item already exists to avoid duplicates
        const optionId = getItemOptionId(item);
        const itemExists = formData.items.some(i => i.optionId === optionId);
        if (itemExists) {
          alert("This item is already added. Edit it instead.");
          return;
        }

        const sourceBranch = getSourceBranch();
        const fromBranchId = sourceBranch?._id || sourceBranch?.id;
        const availableQty = getBranchQuantity(item, fromBranchId);
        if (itemQuantity > availableQty) {
          alert(`Only ${availableQty} ${item.unit || 'units'} available in source branch for this price range.`);
          return;
        }

        const cleanName = item.cleanName || item.baseItemName || item.name.replace(/\s*\(Rs\s?\d+(\.\d+)?\)\s*$/i, '');
        const unitPrice = Number(item.unitPrice) || 0;

        const newItem = {
          id: item._id,
          optionId,
          itemUnitId: item.itemUnitId,
          name: cleanName,
          qty: itemQuantity,
          availableQty,
          unit: item.unit || 'unit',
          unitPrice: unitPrice,
          totalPrice: itemQuantity * unitPrice,
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

    const issueType = formData.issueType;

    if (!issueType) {
      alert("Please select an issue type");
      return;
    }
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
    if (issueType === "Branch Transfer" || issueType === "Stock Transfer") {
      // formData.trainingSession now contains the branch ID directly
      toBranchId = formData.trainingSession;

      if (!toBranchId) {
        alert("Please select a branch.");
        return;
      }

      console.log("Selected branch ID:", toBranchId);
    }

    // Stock is issued from the main branch when available.
    const sourceBranch = getSourceBranch();
    let fromBranchId = sourceBranch?._id || sourceBranch?.id;

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
      itemUnitId: item.itemUnitId,
      quantity: parseInt(item.qty) || 0,
      unitPrice: Number(item.unitPrice) || 0,
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
      creationMode: createMode,
      purpose: issueType,
      remarks: '',
      items: apiItems
    };

    console.log("Sending to API:", JSON.stringify(issueNoteData, null, 2));

    try {
      const response = await fetch('http://localhost:5005/api/issue-notes', {
        method: 'POST',
        headers: getAuthHeaders(),
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
        issueType: "",
        trainingSession: "",
        category: "",
        items: []
      });
      setSelectedItemForAdd(null);
      setItemQuantity(0);

      alert(createMode === "branchRequest" ? "Branch request created successfully!" : "Issue note created successfully!");
      setActiveTab(createMode === "branchRequest" ? "branchRequests" : "issueNotes");
      closeCreateModal();
      await Promise.all([
        fetchIssueNotes(),
        fetchItems()
      ]); // Refresh notes and live stock quantities
    } catch (error) {
      console.error('Error creating issue note:', error);
      alert('Error creating issue note: ' + error.message);
    }
  };

  const requestCreateIssueNote = () => {
    if (!formData.issueType) {
      alert("Please select an issue type");
      return;
    }
    if (!formData.trainingSession || formData.items.length === 0) {
      alert("Please fill all required fields and add at least one item");
      return;
    }
    setPendingCreate(true);
  };

  return (
    <div className="app-container">
      <Navbar />
      <div className="body-layout">
        <Sidebar />
        <div className="main-content">
          <div className="content-wrapper" style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
            <div className="issuenote-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Top Navigation & Action Row */}
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
                    onClick={() => handleTabChange("issueNotes")}
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
                      background: activeTab === "issueNotes" ? 'var(--bg-surface, #ffffff)' : 'transparent',
                      color: activeTab === "issueNotes" ? 'var(--primary-color, #2563eb)' : 'var(--text-secondary, #64748b)',
                      boxShadow: activeTab === "issueNotes" ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none'
                    }}
                  >
                    <FileText size={16} />
                    <span>Issue Notes</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: activeTab === "issueNotes" ? '#eff6ff' : 'rgba(0,0,0,0.06)',
                      color: activeTab === "issueNotes" ? '#2563eb' : '#64748b'
                    }}>
                      {issueNotesList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange("branchRequests")}
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
                      background: activeTab === "branchRequests" ? 'var(--bg-surface, #ffffff)' : 'transparent',
                      color: activeTab === "branchRequests" ? 'var(--primary-color, #2563eb)' : 'var(--text-secondary, #64748b)',
                      boxShadow: activeTab === "branchRequests" ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none'
                    }}
                  >
                    <Building2 size={16} />
                    <span>Branch Requests</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: activeTab === "branchRequests" ? '#eff6ff' : 'rgba(0,0,0,0.06)',
                      color: activeTab === "branchRequests" ? '#2563eb' : '#64748b'
                    }}>
                      {branchRequestsList.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Alert / Notice Messages */}
              {error && (
                <div style={{
                  padding: '14px 18px',
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  borderRadius: '10px',
                  border: '1px solid #fecaca',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertCircle size={18} />
                  <span><strong>Error:</strong> {error}</span>
                </div>
              )}

              {/* Search & Filter Toolbar */}
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
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                {/* Search Box on the Left */}
                <div style={{
                  position: 'relative',
                  flex: '1 1 240px',
                  maxWidth: '420px'
                }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8'
                    }}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search by reference, branch, requester, items...`}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      fontSize: '13px',
                      borderRadius: '9px',
                      border: '1px solid var(--border-default, #cbd5e1)',
                      background: 'var(--bg-surface, #ffffff)',
                      color: 'var(--text-primary, #0f172a)',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filters & Actions Aligned to the Right */}
                <div style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap'
                }}>
                  {/* Branch Filter Dropdown (Multi-select) */}
                  <ModernDropdown
                    value={selectedBranchFilter}
                    onChange={setSelectedBranchFilter}
                    placeholder="All Branches"
                    multiple={true}
                    searchable={true}
                    options={branches.map(b => ({
                      value: b.branchName || b.name,
                      label: b.branchName || b.name
                    }))}
                  />

                  {/* Status Filter Dropdown (Multi-select) */}
                  <ModernDropdown
                    value={selectedStatusFilter}
                    onChange={setSelectedStatusFilter}
                    placeholder="All Statuses"
                    multiple={true}
                    options={[
                      { value: "Pending", label: "Pending" },
                      { value: "Processing", label: "Processing" },
                      { value: "issued", label: "Approved / Issued" },
                      { value: "Rejected", label: "Rejected" }
                    ]}
                  />

                  {(searchTerm || selectedBranchFilter.length > 0 || selectedStatusFilter.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedBranchFilter([]);
                        setSelectedStatusFilter([]);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#64748b',
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <RotateCcw size={13} />
                      Reset
                    </button>
                  )}

                  {canEdit && activeTab === "issueNotes" && (
                    <button
                      onClick={() => openCreateModal()}
                      className="btn-create-issue"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 18px',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 14px rgba(37, 99, 235, 0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(37, 99, 235, 0.25)';
                      }}
                    >
                      <Plus size={18} />
                      <span>Create Issue Note</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Records Table View */}
              {loading ? (
                <div style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: 'var(--bg-surface, #ffffff)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-default, #e2e8f0)'
                }}>
                  <div style={{ color: '#2563eb', marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>Loading records...</div>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Fetching latest inventory requisitions and issue notes</p>
                </div>
              ) : currentData.length === 0 ? (
                <div style={{
                  padding: '56px 24px',
                  textAlign: 'center',
                  background: 'var(--bg-surface, #ffffff)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-default, #e2e8f0)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8'
                  }}>
                    <FileText size={28} />
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', margin: 0 }}>
                    No {activeTab === "branchRequests" ? "Branch Requests" : "Issue Notes"} Found
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', maxWidth: '420px', margin: 0 }}>
                    {searchTerm || selectedBranchFilter.length > 0 || selectedStatusFilter.length > 0
                      ? "No records matched your search filters. Try clearing or relaxing the filters."
                      : activeTab === "branchRequests"
                        ? "There are currently no branch requests. Branch requests are generated automatically through Purchase Orders ordered from branches."
                        : "There are currently no stock issue notes recorded in the system."}
                  </p>
                  {canEdit && activeTab === "issueNotes" && (
                    <button
                      type="button"
                      onClick={() => openCreateModal()}
                      style={{
                        marginTop: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 16px',
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '9px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={16} />
                      <span>Create Issue Note</span>
                    </button>
                  )}
                </div>
              ) : (
                <div style={{
                  background: 'var(--bg-surface, #ffffff)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-default, #e2e8f0)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  overflow: 'hidden'
                }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                      textAlign: 'left'
                    }}>
                      <thead>
                        <tr style={{
                          background: 'var(--bg-subtle, #f8fafc)',
                          borderBottom: '1px solid var(--border-default, #e2e8f0)',
                          color: 'var(--text-secondary, #64748b)',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          <th style={{ padding: '12px 18px', fontWeight: 700 }}>
                            {activeTab === "issueNotes" ? "Issue Number" : "Request Number"}
                          </th>
                          <th style={{ padding: '12px 18px', fontWeight: 700 }}>
                            {activeTab === "issueNotes" ? "Issued To (Branch)" : "Request From (Branch)"}
                          </th>
                          <th style={{ padding: '12px 18px', fontWeight: 700 }}>Type</th>
                          <th style={{ padding: '12px 18px', fontWeight: 700 }}>Date</th>
                          <th style={{ padding: '12px 18px', fontWeight: 700 }}>
                            {activeTab === "issueNotes" ? "Issued By" : "Requested By"}
                          </th>
                          <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'center' }}>Items</th>
                          <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentData.map((item, idx) => {
                          const refNumber = activeTab === "issueNotes" ? item.issueNumber : item.requestNumber;
                          const branchName = activeTab === "issueNotes" ? item.issuedTo : item.requestFrom;
                          const reqType = item.issueType || item.requestType || 'Branch Transfer';
                          const reqDate = item.issueDate || item.requestDate;
                          const handler = item.issuedBy || item.requestedBy || 'Admin';
                          const count = item.itemCount || (item.items ? item.items.length : 0);
                          const st = item.status || 'Pending';

                          // Status badge styling
                          let statusBg = '#fff1f2';
                          let statusColor = '#e11d48';
                          let statusBorder = '#fecdd3';

                          if (st === 'issued' || st === 'Approved') {
                            statusBg = '#ecfdf5';
                            statusColor = '#059669';
                            statusBorder = '#a7f3d0';
                          } else if (st === 'Processing') {
                            statusBg = '#fef3c7';
                            statusColor = '#d97706';
                            statusBorder = '#fde68a';
                          }

                          return (
                            <tr
                              key={item.id || item._id || idx}
                              onClick={() => openModal(item)}
                              title="Click to view details"
                              style={{
                                borderBottom: '1px solid var(--border-default, #f1f5f9)',
                                transition: 'all 0.15s ease',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-subtle, #f8fafc)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {/* Reference Number */}
                              <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                                <span style={{
                                  fontFamily: 'ui-monospace, monospace',
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: '#f1f5f9',
                                  color: '#1e293b',
                                  border: '1px solid #e2e8f0'
                                }}>
                                  {refNumber}
                                </span>
                              </td>

                              {/* Branch Name */}
                              <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Building2 size={15} style={{ color: '#64748b' }} />
                                  <span>{branchName || 'Central Hub'}</span>
                                </div>
                              </td>

                              {/* Type Badge */}
                              <td style={{ padding: '14px 18px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '3px 9px',
                                  borderRadius: '9999px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  border: '1px solid #e2e8f0'
                                }}>
                                  {reqType}
                                </span>
                              </td>

                              {/* Date */}
                              <td style={{ padding: '14px 18px', color: 'var(--text-secondary, #64748b)', fontSize: '12px' }}>
                                {reqDate}
                              </td>

                              {/* Requested / Issued By */}
                              <td style={{ padding: '14px 18px', color: 'var(--text-primary, #1e293b)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <User size={13} style={{ color: '#94a3b8' }} />
                                  <span>{handler}</span>
                                </div>
                              </td>

                              {/* Items Count */}
                              <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: '26px',
                                  height: '24px',
                                  padding: '0 8px',
                                  borderRadius: '12px',
                                  background: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#334155'
                                }}>
                                  {count}
                                </span>
                              </td>

                              {/* Status Badge */}
                              <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 10px',
                                  borderRadius: '9999px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: statusBg,
                                  color: statusColor,
                                  border: `1px solid ${statusBorder}`
                                }}>
                                  {getStatusIcon(st)}
                                  <span>{st}</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* CREATE MODAL POPUP */}
      {/* CREATE MODAL POPUP - MATCHING GRN CREATE MODAL STYLE */}
      {showCreateModal && (
        <div className="modal-overlay-inventory" onClick={closeCreateModal}>
          <div className="modal-content-inventory add-item-modal create-grn-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: 'min(94vw, 820px)' }}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">Create Issue Note</h2>
                <p className="modal-subtitle-inventory">Issue stock items to branches or training sessions</p>
              </div>
              <button
                type="button"
                className="modal-close-btn-inventory"
                onClick={closeCreateModal}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-body-inventory">
              <div className="modal-form-inventory">

                {/* Top Reference Card (matching SKU card from Add Item / Create GRN modal) */}
                <div className="sku-info-card">
                  <div className="sku-info-header">
                    <span className="sku-info-label">
                      <FaFileInvoice /> Document Reference & Requisition Details
                    </span>
                    <span className="sku-info-tag">
                      {formData.issueType || 'Branch Transfer'}
                    </span>
                  </div>
                  <div className="sku-info-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span>{formData.issueNumber || 'ISS-2026-XXX'}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
                      Issue Date: <strong style={{ color: 'var(--text-primary)' }}>{formData.issueDate}</strong>
                    </span>
                  </div>
                </div>

                {/* Section 1: Transfer & Requisition Details */}
                <div className="form-section-group">
                  <div className="form-section-title">
                    <FaTruck /> Requisition & Transfer Details
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Source Branch (Issuing From) *</label>
                      <ModernDropdown
                        value={formData.fromBranch || ""}
                        onChange={(val) => {
                          handleFormChange('fromBranch', val);
                          setSelectedItemForAdd(null);
                          setItemQuantity(0);
                        }}
                        placeholder="Choose Source Branch"
                        searchable={true}
                        options={[
                          { value: "", label: "-- Choose Source Branch --" },
                          ...branches.map(branch => {
                            const branchName = branch.branchName || branch.branch_name || branch.name || 'Unknown';
                            const branchCode = branch.branchCode || branch.branch_code || '';
                            const branchId = branch._id || branch.id;
                            return {
                              value: branchId,
                              label: `${branchName}${branchCode ? ` (${branchCode})` : ''}`
                            };
                          })
                        ]}
                      />
                    </div>

                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Issue Classification / Type *</label>
                      <ModernDropdown
                        value={formData.issueType}
                        onChange={(val) => handleFormChange('issueType', val)}
                        placeholder="Select Issue Type"
                        options={[
                          { value: "", label: "-- Select Issue Type --" },
                          { value: "Branch Transfer", label: "Inter-Branch Transfer" },
                          { value: "Training Sessions", label: "Training & Workshop Session" },
                          { value: "Stock Transfer", label: "Stock Transfer" }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group-inventory">
                      <label className="form-label-inventory">
                        {formData.issueType === "Training Sessions"
                          ? "Training Session / Program Name *"
                          : "Destination Branch (Issued To) *"}
                      </label>
                      {formData.issueType === "Training Sessions" ? (
                        <input
                          type="text"
                          value={formData.trainingSession}
                          onChange={(e) => handleFormChange('trainingSession', e.target.value)}
                          placeholder="e.g. Barista Workshop Cohort 4"
                          className="form-input-inventory"
                        />
                      ) : (
                        <ModernDropdown
                          value={formData.trainingSession}
                          onChange={(val) => handleFormChange('trainingSession', val)}
                          placeholder="Choose Destination Branch"
                          searchable={true}
                          options={[
                            { value: "", label: "-- Choose Destination Branch --" },
                            ...branches
                              .filter(branch => String(branch._id || branch.id) !== String(formData.fromBranch))
                              .map(branch => {
                                const branchName = branch.branchName || branch.branch_name || 'Unknown';
                                const branchCode = branch.branchCode || branch.branch_code || '';
                                const branchId = branch._id || branch.id;
                                return {
                                  value: branchId,
                                  label: `${branchName}${branchCode ? ` (${branchCode})` : ''}`
                                };
                              })
                          ]}
                        />
                      )}
                    </div>

                    <div className="form-group-inventory">
                      <label className="form-label-inventory">Issue Date *</label>
                      <input
                        type="date"
                        value={formData.issueDate}
                        onChange={(e) => handleFormChange('issueDate', e.target.value)}
                        className="form-input-inventory"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Items Requisitioned */}
                <div className="form-section-group">
                  <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaBoxOpen /> Requisition Items ({formData.items.length})
                    </span>
                    <span className="sku-info-tag">
                      Total: Rs {formData.items.reduce((s, i) => s + ((Number(i.qty) || 0) * (Number(i.unitPrice) || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Staging Select Bar (Clean, modern Add Item bar matching GRN style) */}
                  <div style={{
                    background: 'var(--bg-subtle)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(140px, 1fr) minmax(220px, 2fr) 90px auto',
                    gap: '10px',
                    alignItems: 'end'
                  }}>
                    <div>
                      <label className="form-label-inventory" style={{ fontSize: '11px' }}>Category</label>
                      <ModernDropdown
                        value={formData.category}
                        onChange={(val) => handleFormChange('category', val)}
                        placeholder="All Categories"
                        searchable={true}
                        options={[
                          { value: "", label: "All Categories" },
                          ...categories.map(cat => ({
                            value: cat.id,
                            label: cat.name
                          }))
                        ]}
                      />
                    </div>

                    <div>
                      <label className="form-label-inventory" style={{ fontSize: '11px' }}>Select Item</label>
                      <ModernDropdown
                        value={selectedItemForAdd || ""}
                        onChange={(val) => setSelectedItemForAdd(val)}
                        placeholder="Choose Item to Requisition"
                        searchable={true}
                        options={[
                          { value: "", label: "-- Choose Item to Requisition --" },
                          ...getAvailableItems().map(item => ({
                            value: getItemOptionId(item),
                            label: getIssueItemLabel(item)
                          }))
                        ]}
                      />
                    </div>

                    <div>
                      <label className="form-label-inventory" style={{ fontSize: '11px' }}>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={itemQuantity || ""}
                        onChange={(e) => setItemQuantity(parseInt(e.target.value) || 0)}
                        placeholder="Qty"
                        className="form-input-inventory"
                        style={{ fontSize: '12.5px', height: '36px', textAlign: 'center', borderColor: '#2563eb', fontWeight: 600 }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItemToForm}
                      disabled={!selectedItemForAdd || itemQuantity <= 0}
                      className="modal-btn-inventory save"
                      style={{
                        height: '36px',
                        padding: '0 16px',
                        fontSize: '12.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: (!selectedItemForAdd || itemQuantity <= 0) ? 0.5 : 1,
                        cursor: (!selectedItemForAdd || itemQuantity <= 0) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <FaPlus size={11} /> Add Item
                    </button>
                  </div>

                  {/* Items Table */}
                  {formData.items.length > 0 ? (
                    <div className="po-detail-table-wrap" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      <table className="po-detail-table" style={{ margin: 0, minWidth: '650px' }}>
                        <thead>
                          <tr>
                            <th>Item Name</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Unit</th>
                            <th style={{ width: '120px', textAlign: 'right' }}>Unit Price (Rs)</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Quantity</th>
                            <th style={{ width: '120px', textAlign: 'right' }}>Total (Rs)</th>
                            <th style={{ width: '90px', textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.items.map((item) => (
                            <tr key={item.tempId}>
                              <td style={{ fontWeight: 600 }}>{item.name}</td>
                              <td style={{ textAlign: 'center', color: '#64748b' }}>{item.unit}</td>
                              <td style={{ textAlign: 'right', color: '#64748b' }}>
                                {(Number(item.unitPrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {editingItemId === item.tempId ? (
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={(e) => handleUpdateItemQty(item.tempId, e.target.value)}
                                    className="form-input-inventory"
                                    style={{ width: '70px', height: '30px', padding: '2px 6px', fontSize: '12px', textAlign: 'center', borderColor: '#3b82f6', margin: '0 auto' }}
                                  />
                                ) : (
                                  <span style={{ fontWeight: 600 }}>{item.qty}</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                                {((Number(item.qty) || 0) * (Number(item.unitPrice) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {editingItemId === item.tempId ? (
                                    <button
                                      type="button"
                                      onClick={handleSaveItemEdit}
                                      style={{ border: 'none', background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                      title="Save quantity"
                                    >
                                      ✓
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleEditItem(item.tempId)}
                                      style={{ border: 'none', background: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                      title="Edit quantity"
                                    >
                                      ✎
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItemFromForm(item.tempId)}
                                    className="modal-btn-inventory delete"
                                    style={{ height: '26px', padding: '0 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center' }}
                                    title="Remove item"
                                  >
                                    <FaTrash size={11} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ padding: '10px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>Total Lines: {formData.items.length}</span>
                        <strong style={{ color: '#2563eb' }}>
                          Grand Total: Rs {formData.items.reduce((s, i) => s + ((Number(i.qty) || 0) * (Number(i.unitPrice) || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '12.5px',
                      border: '1px dashed #cbd5e1',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-hover)'
                    }}>
                      No items added yet. Select an item and quantity above, then click <strong>+ Add Item</strong>.
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="modal-footer-inventory">
              <button
                type="button"
                className="modal-btn-inventory cancel"
                onClick={closeCreateModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn-inventory save"
                onClick={requestCreateIssueNote}
                disabled={formData.items.length === 0 || !formData.fromBranch}
              >
                <FaPlus /> Create Issue Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW & MANAGE DETAILS MODAL POPUP */}
      {showModal && selectedItem && (
        <div className="modal-overlay-inventory" onClick={closeModal}>
          <div className="modal-content-inventory" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px', width: 'min(94vw, 820px)' }}>
            <div className="modal-header-inventory">
              <div className="modal-title-section-inventory">
                <h2 className="modal-title-inventory">
                  {activeTab === "issueNotes" ? "Issue Note Details" : "Branch Requisition Details"}
                </h2>
                <p className="modal-subtitle-inventory">View complete order information, items, and workflow actions</p>
              </div>
              <button className="modal-close-btn-inventory" onClick={closeModal} aria-label="Close">×</button>
            </div>

            <div className="modal-body-inventory">
              {/* Header number row */}
              <div className="po-detail-number-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="po-detail-number">
                    {activeTab === "issueNotes" ? selectedItem.issueNumber : selectedItem.requestNumber}
                  </span>
                  <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                    {selectedItem.issueType || selectedItem.requestType}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`po-detail-badge ${selectedItem.status === 'issued' || selectedItem.status === 'Approved' ? 'received' : selectedItem.status === 'Processing' ? 'pending' : (selectedItem.status === 'Rejected' || selectedItem.status === 'Cancelled') ? 'cancelled' : 'pending'}`}>
                    {selectedItem.status}
                  </span>
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="btn-white"
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                    title="Print Note"
                  >
                    <Printer size={13} />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* 4-Item Metadata Summary Grid */}
              <div className="po-detail-info-grid">
                <div>
                  <span className="po-detail-label">{activeTab === "issueNotes" ? "Issued To" : "Requested From"}</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {activeTab === "issueNotes" ? selectedItem.issuedTo : selectedItem.requestedFrom}
                  </div>
                </div>
                <div>
                  <span className="po-detail-label">Date</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedItem.issueDate || selectedItem.requestDate}
                  </div>
                </div>
                <div>
                  <span className="po-detail-label">{activeTab === "issueNotes" ? "Issued By" : "Requested By"}</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedItem.issuedBy || selectedItem.requestedBy || 'Admin'}
                  </div>
                </div>
                <div>
                  <span className="po-detail-label">Type</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedItem.issueType || selectedItem.requestType}
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="po-detail-table-wrap">
                <div style={{ padding: '10px 14px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {activeTab === "issueNotes" ? "Issued Items" : "Requested Items"} ({editedItems.length})
                  </span>
                  {(selectedItem.status === "Pending" || selectedItem.status === "Processing") && canEdit && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="btn-white"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                    >
                      <Edit3 size={12} />
                      <span>{isEditing ? 'Cancel Edit' : 'Edit Quantities'}</span>
                    </button>
                  )}
                </div>

                <table className="po-detail-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th style={{ textAlign: 'center' }}>Available</th>
                      <th style={{ textAlign: 'center' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedItems.map((itemData, idx) => {
                      const qty = Number(itemData.qty) || 0;
                      const price = Number(itemData.unitPrice) || 0;
                      const subtotal = qty * price;

                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{itemData.name}</td>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>
                            {itemData.availableQty || 0} {itemData.unit}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                max={itemData.availableQty}
                                value={itemData.qty}
                                onChange={(e) => handleQuantityChange(itemData.id, e.target.value)}
                                style={{ width: '60px', padding: '3px 6px', textAlign: 'center', borderRadius: '4px', border: '1px solid #2563eb' }}
                              />
                            ) : (
                              <span style={{ fontWeight: 700 }}>{qty} {itemData.unit}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', color: '#64748b' }}>
                            Rs {price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                            Rs {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Items Total Summary Bar */}
                <div style={{ padding: '10px 14px', background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>
                    Total Quantity: <strong>{editedItems.reduce((s, i) => s + (Number(i.qty) || 0), 0)}</strong>
                  </span>
                  <div>
                    <span style={{ color: '#64748b', marginRight: '6px' }}>Total Amount:</span>
                    <strong style={{ color: '#2563eb', fontSize: '14px' }}>
                      Rs {editedItems.reduce((s, i) => s + ((Number(i.qty) || 0) * (Number(i.unitPrice) || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer-inventory">
              <button type="button" className="btn-cancel" onClick={closeModal}>Close</button>

              {isEditing ? (
                <>
                  <button type="button" className="btn-white" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="button" className="btn-add" onClick={handleSaveChanges}>
                    <FaSave /> Save Changes
                  </button>
                </>
              ) : (
                <>
                  {selectedItem.status === "Pending" && canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={handleReject}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #fecaca',
                          background: '#fee2e2',
                          color: '#991b1b',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={handleApprove}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          background: '#059669',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Approve Request
                      </button>
                    </>
                  )}

                  {selectedItem.status === "Processing" && canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelOrder}
                        className="btn-white"
                        style={{ color: '#991b1b' }}
                      >
                        Cancel Order
                      </button>
                      <button
                        type="button"
                        onClick={handleIssueItems}
                        className="btn-add"
                        style={{ background: '#2563eb' }}
                      >
                        Dispatch & Issue Items
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={pendingCreate}
        title="Add issue note?"
        message="Are you sure you want to create this issue note?"
        confirmLabel="Confirm"
        tone="success"
        onCancel={() => setPendingCreate(false)}
        onConfirm={async () => {
          setPendingCreate(false);
          await handleCreateIssueNote();
        }}
      />
      <ChatAssistant />
    </div>
  );
};

export default IssueNote;
