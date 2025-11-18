import React, { useState } from "react";
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
import "./Report.css";

export default function Report() {
  const [selectedSections, setSelectedSections] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);

  const options = [
    "Pie Chart",
    "Line Chart",
    "Current Stock Balance",
    "Low Stock Report",
    "Transaction History",
  ];

  const availableItems = [
    "Espresso machine",
    "Coffee grinder", 
    "Tamper",
    "Portafilters",
    "Coffee beans",
    "Milk frother",
    "Coffee cups",
    "Cleaning supplies"
  ];

  const availableBranches = [
    "Main Campus - Colombo",
    "Branch 1 - Kandy",
    "Branch 2 - Galle",
    "Branch 3 - Negombo",
    "Branch 4 - Kurunegala"
  ];

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

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ✅ Sample data used by both charts
  const pieData = [
    { name: "Espresso machine", value: 400 },
    { name: "Coffee grinder", value: 300 },
    { name: "Tamper", value: 300 },
    { name: "Portafilters", value: 200 },
  ];

  const lineData = [
    { month: "Jan", usage: 20 },
    { month: "Feb", usage: 30 },
    { month: "Mar", usage: 25 },
    { month: "Apr", usage: 40 },
    { month: "May", usage: 32 },
  ];

  const COLORS = ["#667eea", "#764ba2", "#8b9dc3", "#5a67d8"];

  // Sample data for tables
  const stockData = [
    { itemName: "Coffee Beans (Arabica)", category: "Ingredients", quantity: 25, status: "Normal" },
    { itemName: "Milk Powder", category: "Ingredients", quantity: 15, status: "Low" },
    { itemName: "Espresso Machine", category: "Equipment", quantity: 3, status: "Normal" },
    { itemName: "Coffee Cups", category: "Supplies", quantity: 150, status: "High" },
    { itemName: "Cleaning Supplies", category: "Maintenance", quantity: 8, status: "Low" }
  ];

  const lowStockData = [
    { item: "Coffee Beans (Arabica)", available: 15, reorderLevel: 50, supplier: "CoffeeLanka" },
    { item: "Milk Powder", available: 10, reorderLevel: 30, supplier: "Maliban" },
    { item: "Cleaning Supplies", available: 8, reorderLevel: 20, supplier: "CleanCo" }
  ];

  const transactionData = [
    { invoiceNo: "INV001", supplier: "CoffeeLanka", date: "2025-10-01", status: "Completed", total: "24,000" },
    { invoiceNo: "INV002", supplier: "CoffeeLanka", date: "2025-10-03", status: "Pending", total: "12,000" },
    { invoiceNo: "INV003", supplier: "Maliban", date: "2025-10-05", status: "Completed", total: "8,500" },
    { invoiceNo: "INV004", supplier: "CleanCo", date: "2025-10-07", status: "Processing", total: "3,200" }
  ];

  // Export to PDF function
  const exportToPDF = async () => {
    try {
      const element = document.querySelector('.report-content');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add title
      pdf.setFontSize(20);
      pdf.text('CBBS Inventory Report', 20, 20);
      
      // Add date range
      pdf.setFontSize(12);
      pdf.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, 20, 35);
      
      // Add selected filters info
      if (selectedSections.length > 0) {
        pdf.text(`Report Sections: ${selectedSections.join(', ')}`, 20, 45);
      }
      
      // Calculate image dimensions to fit page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 40; // 20mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 55; // Start below the title
      
      // Add image to PDF (handle multiple pages if needed)
      pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - position);
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
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
      {/* Header */}
      <div className="report-header">
        <h2>Comprehensive Inventory Reports and Insights</h2>
        <div className="export-buttons">
          <button className="btn export" onClick={exportToPDF}>
            📄 Export PDF
          </button>
          <button className="btn export" onClick={exportToCSV}>
            📊 Export Excel
          </button>
        </div>
      </div>

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

        {/* Items Filter */}
        <div className="filter-section">
          <h4>📦 Select Items</h4>
          <div className="items-filter">
            <div className="filter-header">
              <button 
                className="select-all-btn"
                onClick={() => setSelectedItems(selectedItems.length === availableItems.length ? [] : availableItems)}
              >
                {selectedItems.length === availableItems.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="selected-count">
                {selectedItems.length} of {availableItems.length} selected
              </span>
            </div>
            <div className="filter-options items-grid">
              {availableItems.map((item) => (
                <label key={item} className="filter-item">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item)}
                    onChange={() => toggleItem(item)}
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Branches Filter */}
        <div className="filter-section">
          <h4>🏢 Select Branches</h4>
          <div className="branches-filter">
            <div className="filter-header">
              <button 
                className="select-all-btn"
                onClick={() => setSelectedBranches(selectedBranches.length === availableBranches.length ? [] : availableBranches)}
              >
                {selectedBranches.length === availableBranches.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="selected-count">
                {selectedBranches.length} of {availableBranches.length} selected
              </span>
            </div>
            <div className="filter-options">
              {availableBranches.map((branch) => (
                <label key={branch} className="filter-item branch-item">
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(branch)}
                    onChange={() => toggleBranch(branch)}
                  />
                  {branch}
                </label>
              ))}
            </div>
          </div>
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

        {selectedSections.includes("Current Stock Balance") && (
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
