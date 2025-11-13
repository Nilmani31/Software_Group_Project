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

  return (
    <div className="report-page">
      {/* Header */}
      <div className="report-header">
        <h2>Comprehensive Inventory Reports and Insights</h2>
        <div className="export-buttons">
          <button className="btn export">Export PDF</button>
          <button className="btn export">Export CSV</button>
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
                <tr>
                  <td>Coffee Beans (Arabica)</td>
                  <td>Ingredients</td>
                  <td>25</td>
                  <td className="status-normal">Normal</td>
                </tr>
                <tr>
                  <td>Milk Powder</td>
                  <td>Ingredients</td>
                  <td>15</td>
                  <td className="status-low">Low</td>
                </tr>
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
                <tr>
                  <td>Coffee Beans (Arabica)</td>
                  <td>15</td>
                  <td>50</td>
                  <td>CoffeeLanka</td>
                </tr>
                <tr>
                  <td>Milk Powder</td>
                  <td>10</td>
                  <td>30</td>
                  <td>Malibon</td>
                </tr>
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
                <tr>
                  <td>INV001</td>
                  <td>CoffeeLanka</td>
                  <td>2025-10-01</td>
                  <td className="status-normal">Completed</td>
                  <td>24,000</td>
                </tr>
                <tr>
                  <td>INV002</td>
                  <td>CoffeeLanka</td>
                  <td>2025-10-03</td>
                  <td className="status-pending">Pending</td>
                  <td>12,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
