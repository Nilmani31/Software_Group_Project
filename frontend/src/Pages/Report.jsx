import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { getAuthHeaders } from "../utils/authHeaders";
import {
  Boxes,
  AlertTriangle,
  ShoppingCart,
  Truck,
  ArrowRightLeft,
  FileSpreadsheet,
  Download,
  Search,
  BarChart3,
  Calendar,
  Building2,
  Layers,
  Activity,
} from "lucide-react";
import ModernDropdown from "../Components/ModernDropdown";

export default function Report() {
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'stock', 'low', 'branches', 'po', 'grn', 'transfers', 'analytics'
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState([]);
  const [dateFilter, setDateFilter] = useState("all"); // 'all', '30d', '90d', 'custom'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceived, setGoodsReceived] = useState([]);
  const [issueNotes, setIssueNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);
        setError("");
        const headers = getAuthHeaders();
        const requests = [
          ["items", "http://localhost:5005/api/items"],
          ["branches", "http://localhost:5005/api/branches"],
          ["purchase orders", "http://localhost:5005/api/purchase-orders"],
          ["goods received", "http://localhost:5005/api/goods-received?limit=1000"],
          ["issue notes", "http://localhost:5005/api/issue-notes"]
        ];

        const results = await Promise.allSettled(
          requests.map(async ([name, url]) => {
            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error(`${name} failed`);
            return [name, await response.json()];
          })
        );

        results.forEach(result => {
          if (result.status === "fulfilled") {
            const [name, data] = result.value;
            if (name === "items") setItems(Array.isArray(data) ? data : []);
            if (name === "branches") setBranches(data.success && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
            if (name === "purchase orders") setPurchaseOrders(data.success && Array.isArray(data.data) ? data.data : []);
            if (name === "goods received") setGoodsReceived(data.success && Array.isArray(data.data) ? data.data : []);
            if (name === "issue notes") setIssueNotes(Array.isArray(data) ? data : []);
          }
        });
      } catch (err) {
        setError("Unable to load report data. Please check connection.");
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, []);

  // Unique Categories and Branches for filters
  const categoriesList = useMemo(() => {
    const set = new Set(items.map(i => i.categoryName || i.category?.name || i.category).filter(Boolean));
    return Array.from(set);
  }, [items]);

  const branchNamesList = useMemo(() => {
    const set = new Set(branches.map(b => b.branchName || b.branch_name || b.name || b.branchId).filter(Boolean));
    return Array.from(set);
  }, [branches]);

  // Date Range Checker
  const checkDateMatch = useCallback((dateStr) => {
    if (!dateStr || dateFilter === "all") return true;
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;

    const now = new Date();
    if (dateFilter === "30d") {
      const past30 = new Date(now.setDate(now.getDate() - 30));
      return itemDate >= past30;
    }
    if (dateFilter === "90d") {
      const past90 = new Date(now.setDate(now.getDate() - 90));
      return itemDate >= past90;
    }
    if (dateFilter === "custom") {
      const start = customStartDate ? new Date(customStartDate) : null;
      const end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : null;
      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      return true;
    }
    return true;
  }, [dateFilter, customStartDate, customEndDate]);

  // 1. Filtered Stock
  const filteredStock = useMemo(() => {
    return items.filter(item => {
      const name = (item.name || "").toLowerCase();
      const sku = (item.sku || "").toLowerCase();
      const cat = (item.categoryName || item.category?.name || item.category || "").toLowerCase();
      const matchesSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || sku.includes(searchTerm.toLowerCase());
      const matchesCat = 
        !selectedCategory ||
        selectedCategory.length === 0 ||
        (Array.isArray(selectedCategory)
          ? (selectedCategory.includes("all") || selectedCategory.some(c => c.toLowerCase() === cat.toLowerCase()))
          : (selectedCategory === "all" || cat.toLowerCase() === selectedCategory.toLowerCase()));

      return matchesSearch && matchesCat;
    }).map(item => {
      let qty = Number(item.quantity || 0);
      const isBranchFiltered = Array.isArray(selectedBranch) ? selectedBranch.length > 0 && !selectedBranch.includes("all") : selectedBranch !== "all";
      if (isBranchFiltered && Array.isArray(item.branchStocks)) {
        const allowedBranches = Array.isArray(selectedBranch) ? selectedBranch : [selectedBranch];
        qty = item.branchStocks
          .filter(s => allowedBranches.some(b => (s.branchName || s.branch_name || "").toLowerCase() === b.toLowerCase()))
          .reduce((sum, s) => sum + Number(s.quantity || 0), 0);
      }
      const unitPrice = Number(item.unitPrice || 0);
      const minStock = Number(item.minStock || 0);
      return {
        sku: item.sku || "N/A",
        name: item.name,
        category: item.categoryName || item.category?.name || item.category || "General",
        unit: item.unit || "pcs",
        unitPrice,
        quantity: qty,
        minStock,
        totalValue: qty * unitPrice,
        status: qty <= 0 ? "Out" : qty <= minStock ? "Low" : "Normal"
      };
    });
  }, [items, searchTerm, selectedCategory, selectedBranch]);

  // 2. Filtered Low Stock
  const filteredLowStock = useMemo(() => {
    return filteredStock.filter(i => i.status === "Low" || i.status === "Out");
  }, [filteredStock]);

  // 3. Filtered POs
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const num = (po.poNumber || "").toLowerCase();
      const sup = (po.supplier || po.orderDetails?.supplierName || "").toLowerCase();
      const br = (po.branch || po.createdByBranch || "").toLowerCase();
      const matchesSearch = !searchTerm || num.includes(searchTerm.toLowerCase()) || sup.includes(searchTerm.toLowerCase());
      const matchesBranch = 
        !selectedBranch || 
        selectedBranch.length === 0 || 
        (Array.isArray(selectedBranch) 
          ? (selectedBranch.includes("all") || selectedBranch.some(b => br.includes(b.toLowerCase()))) 
          : (selectedBranch === "all" || br.includes(selectedBranch.toLowerCase())));
      const matchesDate = checkDateMatch(po.orderDate);
      return matchesSearch && matchesBranch && matchesDate;
    });
  }, [purchaseOrders, searchTerm, selectedBranch, checkDateMatch]);

  // 4. Filtered GRNs
  const filteredGRNs = useMemo(() => {
    return goodsReceived.filter(grn => {
      const num = (grn.grnNumber || "").toLowerCase();
      const sup = (grn.supplierName || "").toLowerCase();
      const br = (grn.branch || grn.branchName || "").toLowerCase();
      const matchesSearch = !searchTerm || num.includes(searchTerm.toLowerCase()) || sup.includes(searchTerm.toLowerCase());
      const matchesBranch = 
        !selectedBranch || 
        selectedBranch.length === 0 || 
        (Array.isArray(selectedBranch) 
          ? (selectedBranch.includes("all") || selectedBranch.some(b => br.includes(b.toLowerCase()))) 
          : (selectedBranch === "all" || br.includes(selectedBranch.toLowerCase())));
      const matchesDate = checkDateMatch(grn.receivedDate);
      return matchesSearch && matchesBranch && matchesDate;
    });
  }, [goodsReceived, searchTerm, selectedBranch, checkDateMatch]);

  // 5. Filtered Transfers (Issue Notes)
  const filteredTransfers = useMemo(() => {
    return issueNotes.filter(note => {
      const num = (note.issueNoteNumber || "").toLowerCase();
      const from = (note.fromBranchId?.branchName || "").toLowerCase();
      const to = (note.toBranchId?.branchName || "").toLowerCase();
      const purpose = (note.purpose || "").toLowerCase();
      const matchesSearch = !searchTerm || num.includes(searchTerm.toLowerCase()) || purpose.includes(searchTerm.toLowerCase());
      const matchesBranch = 
        !selectedBranch || 
        selectedBranch.length === 0 || 
        (Array.isArray(selectedBranch) 
          ? (selectedBranch.includes("all") || selectedBranch.some(b => from.includes(b.toLowerCase()) || to.includes(b.toLowerCase()))) 
          : (selectedBranch === "all" || from.includes(selectedBranch.toLowerCase()) || to.includes(selectedBranch.toLowerCase())));
      const matchesDate = checkDateMatch(note.issueDate);
      return matchesSearch && matchesBranch && matchesDate;
    });
  }, [issueNotes, searchTerm, selectedBranch, checkDateMatch]);

  // 6. Overall Metrics
  const totalStockUnits = useMemo(() => filteredStock.reduce((sum, i) => sum + i.quantity, 0), [filteredStock]);
  const totalStockValue = useMemo(() => filteredStock.reduce((sum, i) => sum + i.totalValue, 0), [filteredStock]);

  // 7. Clean Chart: Category Volume Distribution (Max 7 clean slices with distinct colors)
  const categoryChartData = useMemo(() => {
    const catMap = {};
    filteredStock.forEach(item => {
      catMap[item.category] = (catMap[item.category] || 0) + item.quantity;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [filteredStock]);

  // 8. Clean Chart: Monthly Issuances
  const monthlyChartData = useMemo(() => {
    const months = {};
    filteredTransfers.forEach(note => {
      if (note.issueDate) {
        const m = new Date(note.issueDate).toLocaleString("en-US", { month: "short" });
        months[m] = (months[m] || 0) + Number(note.totalAmount || 0);
      }
    });
    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  }, [filteredTransfers]);

  const CHART_COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#ea580c"];

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Stock Sheet
    const stockSheetData = filteredStock.map(i => ({
      "SKU": i.sku,
      "Item Name": i.name,
      "Category": i.category,
      "Unit": i.unit,
      "Unit Price (LKR)": i.unitPrice,
      "Quantity": i.quantity,
      "Total Value (LKR)": i.totalValue,
      "Status": i.status
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stockSheetData), "Stock Balance");

    // 2. Low Stock Sheet
    const lowSheetData = filteredLowStock.map(i => ({
      "Item Name": i.name,
      "Category": i.category,
      "Available Quantity": i.quantity,
      "Reorder Level": i.minStock,
      "Deficit": Math.max(0, i.minStock - i.quantity),
      "Status": i.status
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lowSheetData), "Low Stock Alerts");

    // 3. Purchase Orders
    const poSheetData = filteredPOs.map(po => ({
      "PO Number": po.poNumber,
      "Supplier": po.supplier || po.orderDetails?.supplierName || "N/A",
      "Branch": po.branch || po.createdByBranch || "Main",
      "Date": po.orderDate ? new Date(po.orderDate).toLocaleDateString() : "N/A",
      "Total (LKR)": Number(po.total || 0),
      "Status": po.status || "Pending"
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(poSheetData), "Purchase Orders");

    // 4. Goods Received
    const grnSheetData = filteredGRNs.map(grn => ({
      "GRN Number": grn.grnNumber,
      "PO Reference": grn.poNumber,
      "Supplier": grn.supplierName,
      "Branch": grn.branch,
      "Date": grn.receivedDate ? new Date(grn.receivedDate).toLocaleDateString() : "N/A",
      "Status": grn.status || "RECEIVED"
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grnSheetData), "Goods Received");

    // 5. Stock Transfers
    const transfersSheetData = filteredTransfers.map(note => ({
      "Issue Note #": note.issueNoteNumber,
      "From Branch": note.fromBranchId?.branchName || "Main",
      "To Branch": note.toBranchId?.branchName || "Branch",
      "Date": note.issueDate ? new Date(note.issueDate).toLocaleDateString() : "N/A",
      "Purpose": note.purpose || "Stock Issue",
      "Total Value (LKR)": Number(note.totalAmount || 0),
      "Status": note.status
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transfersSheetData), "Stock Transfers");

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `CBBS_Inventory_Report_${dateStr}.xlsx`);
    alert("Excel report downloaded successfully!");
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      const container = document.getElementById("report-printable-area");
      if (!container) return;

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CBBS_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      alert("PDF downloaded successfully!");
    } catch (err) {
      alert("Error generating PDF: " + err.message);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: "1600px", margin: "0 auto", boxSizing: "border-box", minWidth: 0, fontFamily: "var(--font-sans)" }}>
      {/* 1. Header Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px",
        marginBottom: "20px",
        background: "var(--bg-surface)",
        padding: "16px 20px",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-xs)",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box"
      }}>
        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
            Reports & Operational Records
          </h2>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "13px" }}>
            Select any report view below, search records, or download instant PDF and Excel copies.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={handleExportPDF}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            <Download size={15} /> Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "#059669",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            <FileSpreadsheet size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Strip */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "14px",
        marginBottom: "20px",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box"
      }}>
        <div style={{ background: "var(--bg-surface)", padding: "14px 18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div style={{ background: "#eff6ff", color: "#2563eb", width: "42px", height: "42px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Boxes size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Units</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>{totalStockUnits.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ background: "var(--bg-surface)", padding: "14px 18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div style={{ background: "#f0fdf4", color: "#059669", width: "42px", height: "42px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BarChart3 size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Valuation</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>Rs {totalStockValue.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ background: "var(--bg-surface)", padding: "14px 18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div style={{ background: "#fffbeb", color: "#d97706", width: "42px", height: "42px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Needs Reorder</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#d97706" }}>{filteredLowStock.length} items</div>
          </div>
        </div>

        <div style={{ background: "var(--bg-surface)", padding: "14px 18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div style={{ background: "#f5f3ff", color: "#7c3aed", width: "42px", height: "42px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Activity size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Total Activity</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>
              {filteredPOs.length + filteredGRNs.length + filteredTransfers.length} records
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs (Clean, Single Click) */}
      <div style={{
        display: "flex",
        gap: "6px",
        overflowX: "auto",
        marginBottom: "16px",
        paddingBottom: "6px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        WebkitOverflowScrolling: "touch"
      }}>
        {[
          { id: "all", label: "📋 Full Company Overview" },
          { id: "stock", label: "📦 Stock Balance" },
          { id: "low", label: `⚠️ Low Stock Alerts (${filteredLowStock.length})` },
          { id: "branches", label: "🏢 Branch Comparison" },
          { id: "po", label: `🛒 Purchase Orders (${filteredPOs.length})` },
          { id: "grn", label: `🚚 Goods Received (${filteredGRNs.length})` },
          { id: "transfers", label: `🔄 Stock Transfers (${filteredTransfers.length})` },
          { id: "analytics", label: "📊 Charts & Analytics" },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "7px 14px",
                borderRadius: "var(--radius-full)",
                border: isActive ? "1px solid #0f172a" : "1px solid var(--border-default)",
                background: isActive ? "#0f172a" : "var(--bg-surface)",
                color: isActive ? "#fff" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 500,
                fontSize: "12.5px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 0.15s ease"
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Simple Filter Bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        alignItems: "center",
        background: "var(--bg-surface)",
        padding: "12px 16px",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        marginBottom: "20px",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box"
      }}>
        {/* Search Input */}
        <div style={{ position: "relative", minWidth: "160px", flex: "1 1 200px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search items, SKU, suppliers, or references..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "7px 12px 7px 36px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              fontSize: "13px",
              background: "var(--bg-app)"
            }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <Layers size={15} style={{ color: "var(--text-muted)" }} />
          <ModernDropdown
            value={selectedCategory}
            onChange={setSelectedCategory}
            placeholder="All Categories"
            multiple={true}
            searchable={true}
            options={categoriesList.map(c => ({ value: c, label: c }))}
          />
        </div>

        {/* Branch Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <Building2 size={15} style={{ color: "var(--text-muted)" }} />
          <ModernDropdown
            value={selectedBranch}
            onChange={setSelectedBranch}
            placeholder="All Branches"
            multiple={true}
            searchable={true}
            options={branchNamesList.map(b => ({ value: b, label: b }))}
          />
        </div>

        {/* Date Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <Calendar size={15} style={{ color: "var(--text-muted)" }} />
          <ModernDropdown
            value={dateFilter}
            onChange={setDateFilter}
            placeholder="All Time"
            options={[
              { value: "all", label: "All Time" },
              { value: "30d", label: "Last 30 Days" },
              { value: "90d", label: "Last 90 Days" },
              { value: "custom", label: "Custom Date Range" }
            ]}
          />
        </div>

        {dateFilter === "custom" && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="form-input-inventory"
              style={{ width: "150px" }}
            />
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="form-input-inventory"
              style={{ width: "150px" }}
            />
          </div>
        )}

        {(searchTerm || selectedCategory.length > 0 || selectedBranch.length > 0 || dateFilter !== "all") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory([]);
              setSelectedBranch([]);
              setDateFilter("all");
              setCustomStartDate("");
              setCustomEndDate("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "#dc2626",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
              marginLeft: "auto",
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {loading && <div style={{ background: "#fff", padding: "30px", textAlign: "center", borderRadius: "var(--radius-lg)", width: "100%", boxSizing: "border-box" }}>Loading reports...</div>}
      {error && <div style={{ background: "#fef2f2", color: "#dc2626", padding: "14px", borderRadius: "var(--radius-lg)", marginBottom: "20px", width: "100%", boxSizing: "border-box" }}>{error}</div>}

      {/* 5. Report Content Area (Printable) */}
      <div id="report-printable-area" style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box" }}>
        {/* A. CHARTS & ANALYTICS (Clean, No Clutter!) */}
        {(activeTab === "all" || activeTab === "analytics") && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box"
          }}>
            {/* 1. Category Volume Donut Chart */}
            <div style={{ background: "var(--bg-surface)", padding: "20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)", width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                📊 Stock Share by Category
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
                Clean breakdown of physical stock across major categories
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} units`, "Stock Quantity"]} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 2. Monthly Issuance Bar Chart */}
            <div style={{ background: "var(--bg-surface)", padding: "20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)", width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                📈 Monthly Stock Dispatches (LKR)
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
                Value of stock issued to branches per month
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `Rs ${v / 1000}k`} />
                  <Tooltip formatter={(v) => [`Rs ${Number(v).toLocaleString()}`, "Dispatched Value"]} />
                  <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* B. CURRENT STOCK BALANCE */}
        {(activeTab === "all" || activeTab === "stock") && (
          <div style={{ background: "var(--bg-surface)", padding: "20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)", width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  📦 Inventory Stock Master ({filteredStock.length} items)
                </h3>
                <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                  Real-time stock balance, unit pricing, and inventory valuation
                </p>
              </div>
              <div style={{ fontSize: "13px" }}>
                <span style={{ color: "var(--text-muted)" }}>Total Value: </span>
                <strong style={{ color: "var(--text-primary)" }}>Rs {totalStockValue.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ overflowX: "auto", width: "100%", maxWidth: "100%", minWidth: 0 }}>
              <table style={{ width: "100%", minWidth: "650px", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)" }}>SKU</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)" }}>Item Name</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)" }}>Category</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)" }}>Unit</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)", textAlign: "right" }}>Unit Price</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)", textAlign: "right" }}>Stock Qty</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)", textAlign: "right" }}>Total Value</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text-secondary)", textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{item.sku}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{item.category}</td>
                      <td style={{ padding: "10px 12px" }}>{item.unit}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>Rs {item.unitPrice.toLocaleString()}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>{item.quantity}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>Rs {item.totalValue.toLocaleString()}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: item.status === "Normal" ? "#ecfdf5" : item.status === "Low" ? "#fffbeb" : "#fef2f2",
                          color: item.status === "Normal" ? "#065f46" : item.status === "Low" ? "#92400e" : "#991b1b"
                        }}>
                          {item.status === "Normal" ? "In Stock" : item.status === "Low" ? "Low Stock" : "Out of Stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!filteredStock.length && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>No inventory records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* C. LOW STOCK ALERTS */}
        {(activeTab === "all" || activeTab === "low") && (
          <div style={{ background: "var(--bg-surface)", padding: "20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)", width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <AlertTriangle size={18} style={{ color: "#d97706" }} />
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                ⚠️ Low & Out-of-Stock Alerts ({filteredLowStock.length} items needing reorder)
              </h3>
            </div>

            <div style={{ overflowX: "auto", width: "100%", maxWidth: "100%", minWidth: 0 }}>
              <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Item</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Category</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Current Stock</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Min Threshold</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Shortage Deficit</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "center" }}>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLowStock.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: "10px 12px" }}>{item.category}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: item.status === "Out" ? "#dc2626" : "#d97706" }}>
                        {item.quantity} {item.unit}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>{item.minStock} {item.unit}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                        {Math.max(0, item.minStock - item.quantity)} {item.unit}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: item.status === "Out" ? "#fef2f2" : "#fffbeb",
                          color: item.status === "Out" ? "#991b1b" : "#92400e"
                        }}>
                          {item.status === "Out" ? "CRITICAL (0 STOCK)" : "LOW (REORDER)"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!filteredLowStock.length && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "#059669" }}>
                        ✓ Excellent! All inventory items are currently well above reorder levels.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* D. BRANCH COMPARISON */}
        {(activeTab === "all" || activeTab === "branches") && (
          <div style={{ background: "var(--bg-surface)", padding: "20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)", width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
              🏢 Cross-Branch Stock Availability Matrix
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginBottom: "14px" }}>
              Comparing item distribution across all 5 branches
            </p>

            <div style={{ overflowX: "auto", width: "100%", maxWidth: "100%", minWidth: 0 }}>
              <table style={{ width: "100%", minWidth: "650px", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Item Name</th>
                    {branchNamesList.map(b => (
                      <th key={b} style={{ padding: "10px 12px", fontWeight: 600, textAlign: "center" }}>{b}</th>
                    ))}
                    <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Total Units</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(item => !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item, idx) => {
                    const branchStocks = Array.isArray(item.branchStocks) ? item.branchStocks : [];
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{item.name}</td>
                        {branchNamesList.map(bName => {
                          const stock = branchStocks.find(s => (s.branchName || s.branch_name) === bName);
                          const qty = stock ? Number(stock.quantity || 0) : 0;
                          return (
                            <td key={bName} style={{ padding: "10px 12px", textAlign: "center", color: qty === 0 ? "#dc2626" : "inherit" }}>
                              {qty}
                            </td>
                          );
                        })}
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>
                          {item.quantity || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* E. PURCHASE ORDERS */}
        {(activeTab === "all" || activeTab === "po") && (
          <div style={{ background: "var(--bg-surface)", padding: "20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)", width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <ShoppingCart size={18} style={{ color: "#2563eb" }} />
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                🛒 Purchase Orders Log ({filteredPOs.length} orders)
              </h3>
            </div>

            <div style={{ overflowX: "auto", width: "100%", maxWidth: "100%", minWidth: 0 }}>
              <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>PO Number</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Supplier</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Branch</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Order Date</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Total Amount</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPOs.map((po, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{po.poNumber}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{po.supplier || po.orderDetails?.supplierName || "N/A"}</td>
                      <td style={{ padding: "10px 12px" }}>{po.branch || po.createdByBranch || "Main"}</td>
                      <td style={{ padding: "10px 12px" }}>{po.orderDate ? new Date(po.orderDate).toLocaleDateString() : "N/A"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>Rs {Number(po.total || 0).toLocaleString()}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: po.status === "Received" ? "#ecfdf5" : "#fffbeb",
                          color: po.status === "Received" ? "#065f46" : "#92400e"
                        }}>
                          {po.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!filteredPOs.length && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>No purchase orders recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* F. GOODS RECEIVED NOTES (GRN) */}
        {(activeTab === "all" || activeTab === "grn") && (
          <div style={{ background: "var(--bg-surface)", padding: "20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)", width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Truck size={18} style={{ color: "#059669" }} />
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                🚚 Goods Received Notes (GRN) Deliveries ({filteredGRNs.length} deliveries)
              </h3>
            </div>

            <div style={{ overflowX: "auto", width: "100%", maxWidth: "100%", minWidth: 0 }}>
              <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>GRN Number</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>PO Reference</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Supplier</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Delivery Date</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Items Delivered</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGRNs.map((grn, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{grn.grnNumber}</td>
                      <td style={{ padding: "10px 12px" }}>{grn.poNumber || "N/A"}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{grn.supplierName}</td>
                      <td style={{ padding: "10px 12px" }}>{grn.receivedDate ? new Date(grn.receivedDate).toLocaleDateString() : "N/A"}</td>
                      <td style={{ padding: "10px 12px", maxWidth: "300px" }}>
                        {grn.items?.map(i => `${i.itemName} (${i.quantityReceived} ${i.unit || ""})`).join(", ") || "N/A"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: "#ecfdf5", color: "#065f46" }}>
                          RECEIVED
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!filteredGRNs.length && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>No goods received notes found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* G. STOCK TRANSFERS (ISSUE NOTES) */}
        {(activeTab === "all" || activeTab === "transfers") && (
          <div style={{ background: "var(--bg-surface)", padding: "20px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)", width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <ArrowRightLeft size={18} style={{ color: "#7c3aed" }} />
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                🔄 Internal Stock Transfers & Issue Notes ({filteredTransfers.length} dispatches)
              </h3>
            </div>

            <div style={{ overflowX: "auto", width: "100%", maxWidth: "100%", minWidth: 0 }}>
              <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Issue Note #</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Origin Branch</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Destination Branch</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Date</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600 }}>Purpose / Remarks</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Value</th>
                    <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map((note, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "10px 12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{note.issueNoteNumber}</td>
                      <td style={{ padding: "10px 12px" }}>{note.fromBranchId?.branchName || "Main - Colombo"}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{note.toBranchId?.branchName || "Regional Store"}</td>
                      <td style={{ padding: "10px 12px" }}>{note.issueDate ? new Date(note.issueDate).toLocaleDateString() : "N/A"}</td>
                      <td style={{ padding: "10px 12px" }}>{note.purpose || "Stock Transfer"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>Rs {Number(note.totalAmount || 0).toLocaleString()}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: "#ecfdf5", color: "#065f46" }}>
                          {note.status || "Approved"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!filteredTransfers.length && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>No transfer records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
