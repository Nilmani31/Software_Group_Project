import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { getAuthHeaders } from '../utils/authHeaders';
import { Activity, AlertTriangle, BarChart3, Boxes, CalendarDays, Check, ChevronDown, Download, FileSpreadsheet, GitCompare, Search, X } from 'lucide-react';

export default function Report() {
  const [selectedSections, setSelectedSections] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [goodsReceived, setGoodsReceived] = useState([]);
  const [issueNotes, setIssueNotes] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('All categories');
  const [openSelector, setOpenSelector] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);
        setError('');
        const headers = getAuthHeaders();
        const requests = [
          ['items', 'http://localhost:5005/api/items'],
          ['branches', 'http://localhost:5005/api/branches'],
          ['purchase orders', 'http://localhost:5005/api/purchase-orders'],
          ['goods received', 'http://localhost:5005/api/goods-received?limit=1000'],
          ['issue notes', 'http://localhost:5005/api/issue-notes']
        ];
        const results = await Promise.allSettled(
          requests.map(async ([name, url]) => {
            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error(`${name} request failed (${response.status})`);
            return [name, await response.json()];
          })
        );
        const failedRequests = [];

        results.forEach(result => {
          if (result.status === 'rejected') {
            failedRequests.push(result.reason.message);
            return;
          }

          const [name, data] = result.value;
          if (name === 'items') setItems(Array.isArray(data) ? data : []);
          if (name === 'branches') setBranches(data.success && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
          if (name === 'purchase orders') setPurchaseOrders(data.success && Array.isArray(data.data) ? data.data : []);
          if (name === 'goods received') setGoodsReceived(data.success && Array.isArray(data.data) ? data.data : []);
          if (name === 'issue notes') setIssueNotes(Array.isArray(data) ? data : []);
        });

        if (failedRequests.length > 0) {
          setError(`Some report data could not be loaded: ${failedRequests.join(', ')}`);
        }
      } catch (loadError) {
        console.error('Error loading report data:', loadError);
        setError(loadError.message || 'Unable to load report data.');
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, []);

  const options = [
    "Pie Chart",
    "Line Chart",
    "Current Stock Balance",
    "Low Stock Report",
    "Transaction History",
  ];
  const allReset = () => {
    setSelectedSections([]);
    setSelectedItems([]);
    setSelectedBranches([]);
    setItemSearch('');
    setBranchSearch('');
    setItemCategory('All categories');
    setOpenSelector(null);
    setDateRange({
      startDate: '',
      endDate: ''
    });
  };


  const availableItems = [...new Set(items.map(item => item.name).filter(Boolean))];
  const getBranchName = (branch) => branch.branchName || branch.branch_name || branch.name || branch.branchId || 'Unknown Branch';
  const availableBranches = [...new Set(branches.map(getBranchName).filter(Boolean))];
  const itemCategories = ['All categories', ...new Set(items.map(item => item.categoryName || item.category?.name || item.category).filter(Boolean))];
  const itemCategoryMap = new Map(items.map(item => [item.name, item.categoryName || item.category?.name || item.category || 'Uncategorized']));
  const visibleItems = availableItems.filter(item => {
    const matchesSearch = item.toLowerCase().includes(itemSearch.toLowerCase());
    const matchesCategory = itemCategory === 'All categories' || itemCategoryMap.get(item) === itemCategory;
    return matchesSearch && matchesCategory;
  });
  const visibleBranches = availableBranches.filter(branch => branch.toLowerCase().includes(branchSearch.toLowerCase()));

  const toggleSection = (option) => {
    setSelectedSections((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  const toggleItem = (item) => {
    setSelectedItems((prev) =>
      prev.includes(item)
        ? prev.filter((i) => i !== item)
        : [...prev, item]
    );
  };

  const toggleBranch = (branch) => {
    setSelectedBranches((prev) =>
      prev.includes(branch)
        ? prev.filter((b) => b !== branch)
        : [...prev, branch]
    );
  };

  const toggleVisibleItems = () => {
    const allVisibleSelected = visibleItems.every(item => selectedItems.includes(item));
    setSelectedItems(prev => allVisibleSelected
      ? prev.filter(item => !visibleItems.includes(item))
      : [...new Set([...prev, ...visibleItems])]
    );
  };

  const toggleVisibleBranches = () => {
    const allVisibleSelected = visibleBranches.every(branch => selectedBranches.includes(branch));
    setSelectedBranches(prev => allVisibleSelected
      ? prev.filter(branch => !visibleBranches.includes(branch))
      : [...new Set([...prev, ...visibleBranches])]
    );
  };

  const applyPreset = (preset) => {
    if (preset === 'low-stock') {
      setSelectedSections(['Low Stock Report', 'Current Stock Balance']);
    }
    if (preset === 'branch-compare') {
      setSelectedSections(['Current Stock Balance', 'Pie Chart']);
      setOpenSelector('branches');
    }
    if (preset === 'monthly-usage') {
      setSelectedSections(['Line Chart', 'Transaction History']);
    }
  };

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const selectedItemSet = new Set(selectedItems);
  const selectedBranchSet = new Set(selectedBranches);
  const isInDateRange = (date) => {
    if (!date) return false;
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return false;
    const startsAfter = !dateRange.startDate || value >= new Date(`${dateRange.startDate}T00:00:00`);
    const endsBefore = !dateRange.endDate || value <= new Date(`${dateRange.endDate}T23:59:59`);
    return startsAfter && endsBefore;
  };
  const matchesItemFilter = (name) => selectedItemSet.size === 0 || selectedItemSet.has(name);
  const matchesBranchFilter = (name) => selectedBranchSet.size === 0 || selectedBranchSet.has(name);
  const getStockBranchName = (stock) => stock.branchName || stock.branch_name || stock.branch?.branchName || stock.branch?.name;
  const getTransactionBranchName = (transaction) => (
    transaction.branchName || transaction.branch || transaction.createdByBranch ||
    transaction.fromBranchId?.branchName || transaction.fromBranchId?.branch_name ||
    transaction.toBranchId?.branchName || transaction.toBranchId?.branch_name
  );

  const stockData = items
    .filter(item => matchesItemFilter(item.name))
    .map(item => {
      const branchStocks = Array.isArray(item.branchStocks) ? item.branchStocks.filter(stock => matchesBranchFilter(getStockBranchName(stock))) : [];
      const quantity = selectedBranches.length > 0
        ? branchStocks.reduce((sum, stock) => sum + Number(stock.quantity || 0), 0)
        : Number(item.quantity || 0);
      const minimum = Number(item.minStock || 0);
      return {
        itemName: item.name,
        category: item.categoryName || item.category?.name || item.category || 'Uncategorized',
        quantity,
        status: quantity <= 0 ? 'Out' : quantity <= minimum ? 'Low' : 'Normal'
      };
    });

  const comparisonData = items
    .filter(item => matchesItemFilter(item.name))
    .map(item => {
      const branchStocks = Array.isArray(item.branchStocks) ? item.branchStocks : [];
      const quantities = selectedBranches.reduce((result, branchName) => {
        const branchStock = branchStocks.find(stock => getStockBranchName(stock) === branchName);
        result[branchName] = Number(branchStock?.quantity || 0);
        return result;
      }, {});
      return {
        itemName: item.name,
        category: item.categoryName || item.category?.name || item.category || 'Uncategorized',
        quantities,
        total: Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0),
        minimum: Number(item.minStock || 0)
      };
    });

  const lowStockData = stockData
    .filter(item => item.status === 'Low' || item.status === 'Out')
    .map(item => ({ item: item.itemName, available: item.quantity, reorderLevel: items.find(source => source.name === item.itemName)?.minStock || 0, supplier: 'Not specified' }));

  const transactionData = [
    ...purchaseOrders.map(order => ({ invoiceNo: order.poNumber, supplier: order.supplier || order.orderDetails?.supplierName || 'N/A', branchName: order.branchName || order.branch || order.createdByBranch, date: order.orderDate, status: order.status, total: order.total || '0', items: order.items || order.orderDetails?.items || [] })),
    ...goodsReceived.map(grn => ({ invoiceNo: grn.grnNumber, supplier: grn.supplierName || 'N/A', branchName: grn.branchName || grn.branch, date: grn.receivedDate, status: grn.status || 'RECEIVED', total: grn.items?.reduce((sum, item) => sum + Number(item.quantityReceived || 0) * Number(item.unitPrice || 0), 0) || 0, items: grn.items || [] })),
    ...issueNotes.map(note => ({ invoiceNo: note.issueNoteNumber, supplier: note.toBranchId?.branchName || note.purpose || 'Issue Note', branchName: getTransactionBranchName(note), date: note.issueDate, status: note.status, total: note.totalAmount || 0, items: note.items }))
  ].filter(transaction => isInDateRange(transaction.date) && matchesBranchFilter(getTransactionBranchName(transaction)) && (selectedItemSet.size === 0 || (transaction.items || []).some(item => matchesItemFilter(item.itemName || item.name || item.itemId?.name))));

  const pieData = stockData.filter(item => item.quantity > 0).map(item => ({ name: item.itemName, value: item.quantity }));
  const monthlyUsage = issueNotes
    .filter(note => isInDateRange(note.issueDate) && matchesBranchFilter(getTransactionBranchName(note)))
    .reduce((months, note) => {
      const month = new Date(note.issueDate).toLocaleString('en-US', { month: 'short' });
      const quantity = (note.items || [])
        .filter(item => matchesItemFilter(item.itemName || item.name || item.itemId?.name))
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      months[month] = (months[month] || 0) + quantity;
      return months;
    }, {});
  const lineData = Object.entries(monthlyUsage).map(([month, usage]) => ({ month, usage }));
  const COLORS = ["#667eea", "#764ba2", "#8b9dc3", "#5a67d8", "#22a06b", "#e07a24"];
  const totalStock = stockData.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = lowStockData.length;
  const reportScopeLabel = selectedSections.length ? `${selectedSections.length} views selected` : 'Build your report';

  // Export to PDF function
  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const cards = Array.from(document.querySelectorAll('.report-content > .report-card'));
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const imageWidth = pdfWidth - margin * 2;
      let hasContent = false;

      for (const [cardIndex, card] of cards.entries()) {
        const canvas = await html2canvas(card, {
          scale: 3,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          windowWidth: Math.max(card.scrollWidth, 1200),
          logging: false,
          onclone: clonedDocument => {
            const clonedCards = clonedDocument.querySelectorAll('.report-content > .report-card');
            const clonedCard = clonedCards[cardIndex];
            if (clonedCard) {
              clonedCard.style.width = '1200px';
              clonedCard.style.maxWidth = '1200px';
            }
          }
        });
        const imageData = canvas.toDataURL('image/png');
        const imageHeight = (canvas.height * imageWidth) / canvas.width;
        const firstPageTop = cardIndex === 0 ? 45 : 20;
        const usableHeight = pdfHeight - firstPageTop - margin;
        let remainingHeight = imageHeight;
        let imageTop = firstPageTop;

        if (hasContent) pdf.addPage();
        pdf.setFontSize(cardIndex === 0 ? 18 : 13);
        pdf.text(cardIndex === 0 ? 'CBBS Inventory Report' : 'CBBS Inventory Report - continued', margin, 15);
        pdf.setFontSize(9);
        pdf.text(`Date range: ${dateRange.startDate || 'All time'} to ${dateRange.endDate || 'Today'}`, margin, 27);
        hasContent = true;

        while (remainingHeight > 0) {
          const pageHeight = Math.min(remainingHeight, usableHeight);
          pdf.addImage(imageData, 'PNG', margin, imageTop, imageWidth, imageHeight);
          remainingHeight -= pageHeight;

          if (remainingHeight > 0) {
            pdf.addPage();
            pdf.setFontSize(13);
            pdf.text('CBBS Inventory Report - continued', margin, 15);
            imageTop = 20 - (imageHeight - remainingHeight);
          }
        }
      }

      if (!hasContent) {
        pdf.setFontSize(18);
        pdf.text('CBBS Inventory Report', margin, 25);
        pdf.setFontSize(11);
        pdf.text('Select at least one report section before exporting.', margin, 38);
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      pdf.save(`CBBS_Inventory_Report_${timestamp}.pdf`);
      
      alert('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error exporting PDF. Please try again.');
    }
  };

  // Export to CSV function
  const exportToCSV = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Create summary sheet
      const summaryData = [
        ['CBBS Inventory Report Summary'],
        ['Generated Date:', new Date().toLocaleDateString()],
        ['Date Range:', `${dateRange.startDate} to ${dateRange.endDate}`],
        ['Report Sections:', selectedSections.join(', ')],
        ['Selected Items:', selectedItems.join(', ')],
        ['Selected Branches:', selectedBranches.join(', ')],
        [''],
      ];
      
      if (selectedSections.includes("Current Stock Balance")) {
        summaryData.push(['Current Stock Balance']);
        summaryData.push(['Item Name', 'Category', 'Quantity', 'Status']);
        stockData.forEach(row => {
          summaryData.push([row.itemName, row.category, row.quantity, row.status]);
        });
        summaryData.push(['']);
      }
      
      if (selectedSections.includes("Low Stock Report")) {
        summaryData.push(['Low Stock Report']);
        summaryData.push(['Item', 'Available', 'Reorder Level', 'Supplier']);
        lowStockData.forEach(row => {
          summaryData.push([row.item, row.available, row.reorderLevel, row.supplier]);
        });
        summaryData.push(['']);
      }
      
      if (selectedSections.includes("Transaction History")) {
        summaryData.push(['Transaction History']);
        summaryData.push(['Invoice No', 'Supplier', 'Date', 'Status', 'Total (LKR)']);
        transactionData.forEach(row => {
          summaryData.push([row.invoiceNo, row.supplier, row.date, row.status, row.total]);
        });
        summaryData.push(['']);
      }
      
      if (selectedSections.includes("Pie Chart")) {
        summaryData.push(['Equipment Distribution Data']);
        summaryData.push(['Equipment', 'Quantity']);
        pieData.forEach(row => {
          summaryData.push([row.name, row.value]);
        });
        summaryData.push(['']);
      }
      
      if (selectedSections.includes("Line Chart")) {
        summaryData.push(['Monthly Usage Trend Data']);
        summaryData.push(['Month', 'Usage']);
        lineData.forEach(row => {
          summaryData.push([row.month, row.usage]);
        });
      }
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Report Summary');
      
      // Create separate detailed sheets if data exists
      if (selectedSections.includes("Current Stock Balance")) {
        const stockSheet = XLSX.utils.json_to_sheet(stockData);
        XLSX.utils.book_append_sheet(workbook, stockSheet, 'Current Stock');
      }
      
      if (selectedSections.includes("Low Stock Report")) {
        const lowStockSheet = XLSX.utils.json_to_sheet(lowStockData);
        XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Low Stock');
      }
      
      if (selectedSections.includes("Transaction History")) {
        const transactionSheet = XLSX.utils.json_to_sheet(transactionData);
        XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');
      }
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `CBBS_Inventory_Report_${timestamp}.xlsx`);
      
      alert('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV. Please try again.');
    }
  };

  return (
    <div className="report-page">
      <div className="report-hero">
        <div className="report-hero-copy">
          <div className="report-kicker"><BarChart3 size={15} /> Operations intelligence</div>
          <h2>Inventory, with a clearer point of view.</h2>
          <p>Assemble a focused snapshot of stock, movement, and risk across your branches.</p>
        </div>
        <div className="report-hero-actions">
          <span className="report-status"><span className="status-dot" /> Live data</span>
          <button className="btn export" onClick={exportToPDF}><Download size={16} /> PDF</button>
          <button className="btn export" onClick={exportToCSV}><FileSpreadsheet size={16} /> Excel</button>
          <button className="btn reset" onClick={allReset}>Reset</button>
        </div>
      </div>

      <div className="report-overview">
        <div className="overview-intro"><span className="overview-eyebrow">Report studio</span><strong>{reportScopeLabel}</strong><span>Choose the evidence your team needs today.</span></div>
        <div className="overview-stat"><Boxes size={18} /><span>Tracked stock</span><strong>{totalStock.toLocaleString()}</strong></div>
        <div className="overview-stat overview-alert"><AlertTriangle size={18} /><span>Needs attention</span><strong>{lowStockCount}</strong></div>
        <div className="overview-stat"><Activity size={18} /><span>Transactions</span><strong>{transactionData.length}</strong></div>
      </div>

      <div className="report-header">
        <div><span className="section-eyebrow">01 / Compose</span><h3>Choose your report lens</h3></div>
        <span className="report-date-note"><CalendarDays size={15} /> {dateRange.startDate || dateRange.endDate ? `${dateRange.startDate || 'Any time'} - ${dateRange.endDate || 'Today'}` : 'All available dates'}</span>
      </div>

      {loading && <div className="report-card">Loading report data...</div>}
      {error && <div className="report-card" role="alert">{error}</div>}

      {/* Filter Section */}
      <div className="report-filter-card">
        <h4>🧩 Select Sections to Include in Report</h4>
        <div className="filter-options">
          {options.map((option) => (
            <label key={option} className="filter-item">
              <input
                type="checkbox"
                checked={selectedSections.includes(option)}
                onChange={() => toggleSection(option)}
              />
              {option}
            </label>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="advanced-filters">
        {/* Date Range Filter */}
        <div className="filter-section">
          <h4>📅 Date Range</h4>
          <div className="date-filters">
            <div className="date-input-group">
              <label>From Date:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="date-input"
              />
            </div>
            <div className="date-input-group">
              <label>To Date:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="date-input"
              />
            </div>
          </div>
        </div>

        <div className="filter-section report-builder-section">
          <div className="section-heading-row">
            <div>
              <h4>📦 Report scope</h4>
              <p className="section-hint">Choose only what you need. Search stays fast even with a large catalogue.</p>
            </div>
            <span className="scope-badge">{selectedItems.length + selectedBranches.length} selected</span>
          </div>
          <div className="quick-report-row">
            <span className="quick-report-label">Quick reports</span>
            <button type="button" className="quick-report-btn" onClick={() => applyPreset('low-stock')}>Low stock</button>
            <button type="button" className="quick-report-btn" onClick={() => applyPreset('branch-compare')}><GitCompare size={14} /> Compare branches</button>
            <button type="button" className="quick-report-btn" onClick={() => applyPreset('monthly-usage')}>Monthly usage</button>
          </div>
          <div className="selector-grid">
            <div className="smart-selector">
              <div className="selector-label-row"><span>Items</span><span>{selectedItems.length}/{availableItems.length}</span></div>
              <button type="button" className="selector-trigger" onClick={() => setOpenSelector(openSelector === 'items' ? null : 'items')}>
                <Search size={16} /><span>{selectedItems.length ? `${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'} selected` : 'All items'}</span><ChevronDown size={16} />
              </button>
              {openSelector === 'items' && (
                <div className="selector-menu">
                  <div className="selector-search"><Search size={15} /><input autoFocus value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search items..." /></div>
                  <select className="category-select" value={itemCategory} onChange={e => setItemCategory(e.target.value)} aria-label="Filter items by category">
                    {itemCategories.map(category => <option key={category}>{category}</option>)}
                  </select>
                  <button type="button" className="select-visible-btn" onClick={toggleVisibleItems}>{visibleItems.every(item => selectedItems.includes(item)) ? 'Clear visible items' : `Select visible (${visibleItems.length})`}</button>
                  <div className="selector-options">
                    {visibleItems.map(item => <button type="button" className={`selector-option ${selectedItems.includes(item) ? 'is-selected' : ''}`} key={item} onClick={() => toggleItem(item)}><span>{item}</span>{selectedItems.includes(item) && <Check size={15} />}</button>)}
                    {!visibleItems.length && <span className="empty-selector">No matching items</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="smart-selector">
              <div className="selector-label-row"><span>Branches</span><span>{selectedBranches.length}/{availableBranches.length}</span></div>
              <button type="button" className="selector-trigger" onClick={() => setOpenSelector(openSelector === 'branches' ? null : 'branches')}>
                <Search size={16} /><span>{selectedBranches.length ? `${selectedBranches.length} branch${selectedBranches.length === 1 ? '' : 'es'} selected` : 'All branches'}</span><ChevronDown size={16} />
              </button>
              {openSelector === 'branches' && (
                <div className="selector-menu">
                  <div className="selector-search"><Search size={15} /><input autoFocus value={branchSearch} onChange={e => setBranchSearch(e.target.value)} placeholder="Search branches..." /></div>
                  <button type="button" className="select-visible-btn" onClick={toggleVisibleBranches}>{visibleBranches.every(branch => selectedBranches.includes(branch)) ? 'Clear visible branches' : `Select visible (${visibleBranches.length})`}</button>
                  <div className="selector-options">
                    {visibleBranches.map(branch => <button type="button" className={`selector-option ${selectedBranches.includes(branch) ? 'is-selected' : ''}`} key={branch} onClick={() => toggleBranch(branch)}><span>{branch}</span>{selectedBranches.includes(branch) && <Check size={15} />}</button>)}
                    {!visibleBranches.length && <span className="empty-selector">No matching branches</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
          {(selectedItems.length > 0 || selectedBranches.length > 0) && (
            <div className="selection-chips">
              {[...selectedBranches.map(branch => ({ label: branch, type: 'branch' })), ...selectedItems.map(item => ({ label: item, type: 'item' }))].map(selection => (
                <button type="button" className="selection-chip" key={`${selection.type}-${selection.label}`} onClick={() => selection.type === 'branch' ? toggleBranch(selection.label) : toggleItem(selection.label)}>
                  <span>{selection.label}</span><X size={13} />
                </button>
              ))}
              <button type="button" className="clear-selection-btn" onClick={() => { setSelectedItems([]); setSelectedBranches([]); }}>Clear scope</button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Summary */}
      {(selectedItems.length > 0 || selectedBranches.length > 0 || selectedSections.length > 0) && (
        <div className="filter-summary">
          <h4>📋 Current Filter Summary</h4>
          <div className="summary-content">
            <div className="summary-item">
              <strong>Date Range:</strong> {dateRange.startDate} to {dateRange.endDate}
            </div>
            {selectedSections.length > 0 && (
              <div className="summary-item">
                <strong>Report Sections:</strong> {selectedSections.join(', ')}
              </div>
            )}
            {selectedItems.length > 0 && (
              <div className="summary-item">
                <strong>Items ({selectedItems.length}):</strong> {selectedItems.join(', ')}
              </div>
            )}
            {selectedBranches.length > 0 && (
              <div className="summary-item">
                <strong>Branches ({selectedBranches.length}):</strong> {selectedBranches.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="report-content">
        {selectedSections.includes("Pie Chart") && (
          <div className="report-card">
            <h3>Equipment Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedSections.includes("Line Chart") && (
          <div className="report-card">
            <h3>Monthly Usage Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={lineData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="usage"
                  stroke="#667eea"
                  strokeWidth={3}
                  dot={{ fill: "#764ba2", r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedSections.includes("Current Stock Balance") && selectedBranches.length >= 2 && (
          <div className="report-card branch-comparison-card">
            <div className="comparison-title-row">
              <div>
                <h3>Branch Stock Comparison</h3>
                <p className="section-hint">Selected items compared across {selectedBranches.length} branches</p>
              </div>
              <span className="scope-badge">{comparisonData.length} items</span>
            </div>
            <div className="report-table-scroll">
              <table className="report-table comparison-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    {selectedBranches.map(branch => <th key={branch}>{branch}</th>)}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map(item => (
                    <tr key={item.itemName}>
                      <td><strong>{item.itemName}</strong><small>{item.category}</small></td>
                      {selectedBranches.map(branch => <td key={branch} className={item.quantities[branch] <= item.minimum ? 'comparison-low' : ''}>{item.quantities[branch]}</td>)}
                      <td><strong>{item.total}</strong></td>
                    </tr>
                  ))}
                  {!comparisonData.length && <tr><td colSpan={selectedBranches.length + 2} className="empty-table-cell">No items match the current scope.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedSections.includes("Current Stock Balance") && selectedBranches.length < 2 && (
          <div className="report-card comparison-callout">
            <GitCompare size={20} />
            <div><strong>Select at least two branches to compare stock.</strong><span>Open the Branches selector above, then choose the branches you want to see side by side.</span></div>
          </div>
        )}

        {selectedSections.includes("Current Stock Balance") && selectedBranches.length < 2 && (
          <div className="report-card">
            <h3>Current Stock Balance</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stockData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.itemName}</td>
                    <td>{item.category}</td>
                    <td>{item.quantity}</td>
                    <td className={`status-${item.status.toLowerCase()}`}>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedSections.includes("Low Stock Report") && (
          <div className="report-card">
            <h3>Low Stock Report</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Available</th>
                  <th>Reorder Level</th>
                  <th>Supplier</th>
                </tr>
              </thead>
              <tbody>
                {lowStockData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.item}</td>
                    <td>{item.available}</td>
                    <td>{item.reorderLevel}</td>
                    <td>{item.supplier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedSections.includes("Transaction History") && (
          <div className="report-card">
            <h3>Transaction History</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Supplier</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Total (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {transactionData.map((transaction, index) => (
                  <tr key={index}>
                    <td>{transaction.invoiceNo}</td>
                    <td>{transaction.supplier}</td>
                    <td>{transaction.date}</td>
                    <td className={`status-${transaction.status.toLowerCase()}`}>{transaction.status}</td>
                    <td>{transaction.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
