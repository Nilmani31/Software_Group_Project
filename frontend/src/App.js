import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from './Pages/Login';
import Dashboard from './Pages/Dashboard';
import Report from './Pages/Report';
import MainLayout from './Components/MainLayout';
import LowStock from './Pages/LowStock';
import IssueNote from './Pages/IssueNote';
import Users from './Pages/Users';
import Categories from './Pages/Categories';
import GoodReceived from './Pages/GoodReceived';
import ScrollToTop from './Components/ScrollToTop';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/reports" element={<MainLayout><Report /></MainLayout>} />
        <Route path="/lowstock" element={<LowStock />} />
        <Route path="/issue-note" element={<IssueNote />} />
        <Route path="/users" element={<MainLayout><Users /></MainLayout>} />
        <Route path="/categories" element={<MainLayout><Categories /></MainLayout>} />
        <Route path="/good-received" element={<MainLayout><GoodReceived /></MainLayout>} />
      </Routes>
    </Router>
  );
}

export default App;
