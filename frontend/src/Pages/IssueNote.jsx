import React, { useState } from "react";
import Sidebar from "../Components/Sidebar";
import Navbar from "../Components/Navbar";
import ChatAssistant from "../Components/ChatAssistant";
import "./IssueNote.css";
import { FaEye, FaCheckCircle, FaTimesCircle, FaClock, FaEllipsisV, FaTimes, FaEdit, FaSave, FaPrint, FaCheck, FaBan } from "react-icons/fa";

const IssueNote = () => {
  const [issueNotes, setIssueNotes] = useState([
    {
      id: 1,
      issueNumber: "ISS-2025-001",
      issueType: "Branch Transfer",
      issuedTo: "CBBS Kandy Branch",
      issueDate: "2025-10-12",
      issuedBy: "Admin User",
      status: "Completed",
      itemCount: 2,
      quantity: 45,
      items: [
        { id: 1, name: "Arabica Coffee Beans", qty: "12", availableQty: 100, unit: "kg" },
        { id: 2, name: "Highball Glasses", qty: "15", availableQty: 200, unit: "sets" }
      ]
    },
    {
      id: 2,
      issueNumber: "ISS-2025-002",
      issueType: "Training Transfer",
      issuedTo: "Barista Level 1 - Batch Oct 2025",
      issueDate: "2025-10-11",
      issuedBy: "Staff User",
      status: "Pending",
      itemCount: 2,
      quantity: 32,
      items: [
        { id: 3, name: "Arabica Coffee Beans", qty: "2", availableQty: 100, unit: "kg" },
        { id: 4, name: "Training Manual - Barista Level 1", qty: "20", availableQty: 150, unit: "copies" }
      ]
    },
    {
      id: 3,
      issueNumber: "ISS-2025-003",
      issueType: "Stock Transfer",
      issuedTo: "CBBS Colombo Branch",
      issueDate: "2025-10-10",
      issuedBy: "Manager User",
      status: "Processing",
      itemCount: 3,
      quantity: 58,
      items: [
        { id: 5, name: "Coffee Filters", qty: "10", availableQty: 500, unit: "boxes" },
        { id: 6, name: "Sugar Syrup", qty: "5", availableQty: 50, unit: "liters" },
        { id: 7, name: "Espresso Cups", qty: "20", availableQty: 300, unit: "sets" }
      ]
    },
    {
      id: 4,
      issueNumber: "ISS-2025-004",
      issueType: "Branch Transfer",
      issuedTo: "CBBS Galle Branch",
      issueDate: "2025-10-09",
      issuedBy: "Admin User",
      status: "Completed",
      itemCount: 4,
      quantity: 72,
      items: [
        { id: 8, name: "Espresso Machine Parts", qty: "3", availableQty: 50, unit: "sets" },
        { id: 9, name: "Grinding Beans", qty: "15", availableQty: 200, unit: "kg" },
        { id: 10, name: "Milk Frother", qty: "2", availableQty: 30, unit: "units" },
        { id: 11, name: "Coffee Tamper", qty: "6", availableQty: 100, unit: "units" }
      ]
    }
  ]);

  const [branchRequests] = useState([
    {
      id: 101,
      requestNumber: "BR-2025-001",
      requestType: "Stock Request",
      requestFrom: "CBBS Matara Branch",
      requestDate: "2025-10-15",
      requestedBy: "Branch Manager",
      status: "Pending",
      itemCount: 3,
      quantity: 40,
      items: [
        { id: 12, name: "Espresso Beans", qty: "10", availableQty: 150, unit: "kg" },
        { id: 13, name: "Milk", qty: "20", availableQty: 100, unit: "liters" },
        { id: 14, name: "Sugar", qty: "10", availableQty: 200, unit: "kg" }
      ]
    },
    {
      id: 102,
      requestNumber: "BR-2025-002",
      requestType: "Equipment Request",
      requestFrom: "CBBS Negombo Branch",
      requestDate: "2025-10-14",
      requestedBy: "Asst Manager",
      status: "Approved",
      itemCount: 2,
      quantity: 25,
      items: [
        { id: 15, name: "Coffee Machine", qty: "1", availableQty: 10, unit: "unit" },
        { id: 16, name: "Grinder Machine", qty: "1", availableQty: 8, unit: "unit" }
      ]
    },
    {
      id: 103,
      requestNumber: "BR-2025-003",
      requestType: "Stock Request",
      requestFrom: "CBBS Jaffna Branch",
      requestDate: "2025-10-13",
      requestedBy: "Branch Staff",
      status: "Processing",
      itemCount: 4,
      quantity: 55,
      items: [
        { id: 17, name: "Arabica Beans", qty: "15", availableQty: 300, unit: "kg" },
        { id: 18, name: "Cups", qty: "100", availableQty: 500, unit: "pieces" },
        { id: 19, name: "Napkins", qty: "500", availableQty: 2000, unit: "pieces" },
        { id: 20, name: "Straws", qty: "1000", availableQty: 5000, unit: "pieces" }
      ]
    }
  ]);

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

  // Category data with items
  const [categories] = useState([
    {
      id: "coffee-supplies",
      name: "☕ Coffee Supplies",
      items: [
        { id: 1, name: "Arabica Coffee Beans", unit: "kg", availableQty: 100 },
        { id: 2, name: "Robusta Coffee Beans", unit: "kg", availableQty: 80 },
        { id: 3, name: "Coffee Filters", unit: "boxes", availableQty: 500 },
        { id: 4, name: "Ground Coffee", unit: "kg", availableQty: 60 },
      ]
    },
    {
      id: "glassware",
      name: "🥤 Glassware & Cups",
      items: [
        { id: 2, name: "Highball Glasses", unit: "sets", availableQty: 200 },
        { id: 6, name: "Espresso Cups", unit: "sets", availableQty: 300 },
        { id: 21, name: "Coffee Mugs", unit: "sets", availableQty: 250 },
        { id: 22, name: "Glass Jars", unit: "pieces", availableQty: 150 },
      ]
    },
    {
      id: "training-materials",
      name: "📚 Training Materials",
      items: [
        { id: 3, name: "Training Manual - Barista Level 1", unit: "copies", availableQty: 150 },
        { id: 23, name: "Training Manual - Barista Level 2", unit: "copies", availableQty: 120 },
        { id: 24, name: "Certification Certificates", unit: "pieces", availableQty: 200 },
        { id: 25, name: "Training Videos USB", unit: "pieces", availableQty: 50 },
      ]
    },
    {
      id: "equipment",
      name: "⚙️ Equipment & Machines",
      items: [
        { id: 8, name: "Espresso Machine Parts", unit: "sets", availableQty: 50 },
        { id: 26, name: "Coffee Machine", unit: "units", availableQty: 10 },
        { id: 27, name: "Grinder Machine", unit: "units", availableQty: 8 },
        { id: 10, name: "Milk Frother", unit: "units", availableQty: 30 },
      ]
    },
    {
      id: "syrups-sauces",
      name: "🍯 Syrups & Sauces",
      items: [
        { id: 5, name: "Sugar Syrup", unit: "liters", availableQty: 50 },
        { id: 28, name: "Vanilla Syrup", unit: "liters", availableQty: 40 },
        { id: 29, name: "Caramel Syrup", unit: "liters", availableQty: 45 },
        { id: 30, name: "Chocolate Sauce", unit: "liters", availableQty: 35 },
      ]
    },
    {
      id: "other-supplies",
      name: "📦 Other Supplies",
      items: [
        { id: 9, name: "Grinding Beans", unit: "kg", availableQty: 200 },
        { id: 11, name: "Coffee Tamper", unit: "units", availableQty: 100 },
        { id: 31, name: "Napkins", unit: "boxes", availableQty: 500 },
        { id: 32, name: "Straws", unit: "boxes", availableQty: 1000 },
      ]
    }
  ]);

  // Get available items based on selected category
  const getAvailableItems = () => {
    const selectedCategory = categories.find(c => c.id === formData.category);
    return selectedCategory ? selectedCategory.items : [];
  };

  const currentData = activeTab === "issueNotes" ? issueNotes : branchRequests;

  const getStatusIcon = (status) => {
    switch(status) {
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
    switch(status) {
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
    switch(type) {
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

  const handleApprove = () => {
    if (activeTab === "issueNotes") {
      setIssueNotes(issueNotes.map(item => 
        item.id === selectedItem.id ? { ...item, status: "Processing" } : item
      ));
    }
    alert("Order approved! Status changed to Processing.");
    closeModal();
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

  const handleReject = () => {
    if (activeTab === "issueNotes") {
      setIssueNotes(issueNotes.map(item => 
        item.id === selectedItem.id ? { ...item, status: "Rejected" } : item
      ));
    }
    alert("Order rejected!");
    closeModal();
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

    const availableItems = getAvailableItems();
    const item = availableItems.find(i => i.id === parseInt(selectedItemForAdd));
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

  const handleCreateIssueNote = () => {
    if (!formData.trainingSession || formData.items.length === 0) {
      alert("Please fill all required fields and add at least one item");
      return;
    }

    const newIssue = {
      id: issueNotes.length + 1,
      issueNumber: `ISS-2025-00${issueNotes.length + 1}`,
      issueType: formData.issueType,
      issuedTo: formData.trainingSession,
      issueDate: formData.issueDate,
      issuedBy: "Current User",
      status: "Pending",
      itemCount: formData.items.length,
      quantity: formData.items.reduce((sum, item) => sum + item.qty, 0),
      items: formData.items
    };

    setIssueNotes([...issueNotes, newIssue]);
    alert("Issue Note created successfully!");
    closeCreateModal();
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
                <button className="btn-create-issue" onClick={openCreateModal}>
                  + Create New
                </button>
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
                        <span className="stat-label">Total Requests</span>
                        <span className="stat-value">{branchRequests.length}</span>
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
                <input 
                  type="text" 
                  value={formData.trainingSession}
                  onChange={(e) => handleFormChange('trainingSession', e.target.value)}
                  className="form-input"
                  placeholder={formData.issueType === "Training Sessions" ? "e.g. Barista Level 1" : "e.g. CBBS Kandy Branch"}
                />
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
                <label>Issue Items from {categories.find(c => c.id === formData.category)?.name}</label>
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
                        {getAvailableItems().map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
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
                  {selectedItem.status === "Pending" || selectedItem.status === "Processing" ? (
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
                  {selectedItem.status === "Pending" && (
                    <>
                      <button className="modal-btn reject" onClick={handleReject}>
                        <FaBan /> Reject
                      </button>
                      <button className="modal-btn approve" onClick={handleApprove}>
                        <FaCheck /> Approve
                      </button>
                    </>
                  )}
                  
                  {selectedItem.status === "Processing" && (
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