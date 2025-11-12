import React, { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./Report.css";

export default function Report() {
  const [selectedSections, setSelectedSections] = useState([]);

  const options = [
    "Pie Chart",
    "Line Chart",
    "Current Stock Balance",
    "Low Stock Report",
    "Transaction History",
  ];

  const toggleSection = (option) => {
    setSelectedSections((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  // Sample data for charts
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

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042"];

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

      {/* Report Content */}
      <div className="report-content">
       

        {selectedSections.includes("Pie Chart") && (
          <div className="report-card">
            <h3>Book Count by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedSections.includes("Line Chart") && (
          <div className="report-card">
            <h3>Monthly Usage Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={lineData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="usage" stroke="#8884d8" />
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
                  <td>A4 Paper</td>
                  <td>Stationery</td>
                  <td>120</td>
                  <td className="status-normal">Normal</td>
                </tr>
                <tr>
                  <td>Markers</td>
                  <td>Stationery</td>
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
                  <td>Markers</td>
                  <td>15</td>
                  <td>50</td>
                  <td>ABC Stationers</td>
                </tr>
                <tr>
                  <td>Erasers</td>
                  <td>10</td>
                  <td>30</td>
                  <td>OfficeMart</td>
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
                  <td>OfficeMart</td>
                  <td>2025-10-01</td>
                  <td className="status-normal">Completed</td>
                  <td>24,000</td>
                </tr>
                <tr>
                  <td>INV002</td>
                  <td>ABC Stationers</td>
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
