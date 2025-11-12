import React from "react";
import "./Dashboard.css";

const Dashboard = () => {
  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <div className="dashboard-cards">
          <div className="card">
            <div className="card-icon total-items">📦</div>
            <div className="card-content">
              <h3>Total Items</h3>
              <p>263</p>
            </div>
          </div>
          <div className="card">
            <div className="card-icon low-stock">⚠️</div>
            <div className="card-content">
              <h3>Low Stock</h3>
              <p>10</p>
            </div>
          </div>
          <div className="card">
            <div className="card-icon out-of-stock">📋</div>
            <div className="card-content">
              <h3>Out of Stock</h3>
              <p>6</p>
            </div>
          </div>
          <div className="card">
            <div className="card-icon purchase-order">🛒</div>
            <div className="card-content">
              <h3>Purchase Order</h3>
              <p>3</p>
            </div>
          </div>
          <div className="card">
            <div className="card-icon request-orders">📨</div>
            <div className="card-content">
              <h3>Request Orders</h3>
              <p>3</p>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="chart-section">
            <h3>Inventory Values</h3>
            <div className="chart-container">
              <div className="chart-wrapper">
                <svg className="pie-chart" viewBox="0 0 200 200">
                  {/* Background circle */}
                  <circle cx="100" cy="100" r="70" fill="none" stroke="#E5E7EB" strokeWidth="25" />
                  
                  {/* First segment - 60% */}
                  <circle
                    cx="100"
                    cy="100"
                    r="70"
                    fill="none"
                    stroke="#1E3A8A"
                    strokeWidth="25"
                    strokeDasharray="263 440"
                    strokeDashoffset="0"
                    transform="rotate(-90 100 100)"
                    strokeLinecap="round"
                  />
                  
                  {/* Second segment - 40% */}
                  <circle
                    cx="100"
                    cy="100"
                    r="70"
                    fill="none"
                    stroke="#8B9DC3"
                    strokeWidth="25"
                    strokeDasharray="176 440"
                    strokeDashoffset="-263"
                    transform="rotate(-90 100 100)"
                    strokeLinecap="round"
                  />
                  
                  {/* Center text */}
                  <text x="100" y="95" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#1E3A8A">
                    100%
                  </text>
                  <text x="100" y="115" textAnchor="middle" fontSize="12" fill="#666">
                    Total Value
                  </text>
                </svg>
              </div>
              
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color dark-blue"></span>
                  <div className="legend-text">
                    <span className="legend-title">In Stock</span>
                    <span className="legend-value">60% ($45,000)</span>
                  </div>
                </div>
                <div className="legend-item">
                  <span className="legend-color light-blue"></span>
                  <div className="legend-text">
                    <span className="legend-title">Low Stock</span>
                    <span className="legend-value">40% ($30,000)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="list-section">
            <div className="list-header">
              <h3>Top 10 Product Issue</h3>
              <button className="chat-icon">💬</button>
            </div>
            <ul className="product-list">
              {Array.from({ length: 10 }).map((_, i) => (
                <li key={i}>
                  <span>Name of product</span>
                  <div className="product-bar"></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
