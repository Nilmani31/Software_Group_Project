import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import Report from './Pages/Report';
import MainLayout from './Components/MainLayout';
import LowStock from './Pages/LowStock';
import IssueNote from './Pages/IssueNote';
import Inventory from './Pages/Inventory';
import PurchaseOrder from './Pages/PurchaseOrder';
import Branches from './Pages/Branches';
import Users from './Pages/Users';
import Categories from './Pages/Categories';
import GoodReceived from './Pages/GoodReceived';



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/reports" element={<MainLayout><Report /></MainLayout>} />
        <Route path="/lowstock" element={<LowStock />} />
        <Route path="/issue-note" element={<IssueNote />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/purchase-order" element={<PurchaseOrder/>} />
        <Route path="/branches" element={<Branches />} />
        <Route path="/users" element={<Users />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/good-received" element={<GoodReceived />} />
      </Routes>
    </Router>
  );
}

export default App;
