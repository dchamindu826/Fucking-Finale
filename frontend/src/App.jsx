import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout & Pages
import Home from './pages/web/pages/Home'; 
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import MainLayout from "./components/layouts/MainLayout";

// Dashboards & Modules
import AdminDashboard from './pages/admin/AdminDashboard';
import ContentHub from './components/common/ContentHub';
import StaffManagement from './components/common/StaffManagement'; 
import PaymentManagement from './components/common/PaymentManagement';

// System Admin CRM Setup
import CrmManagement from './components/admin/CrmManagement';

// 🔥 NEW: Coordinator CRM Dashboard (For Manager & Staff)
import CoordinatorDashboard from './pages/ClassCoordinator/CoordinatorDashboard';

// Department Dashboards (Mangers & Staff)
import ManagerDashboard from './pages/class_coordinator/manager/ManagerDashboard';

// Student
import StudentDashboard from './pages/student/StudentDashboard';

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setLoggedInUser(JSON.parse(storedUser));
    }
    setAuthChecked(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoggedInUser(null);
    window.location.href = '/login';
  };

  const getDashboardLink = (user) => {
    if (!user) return '/login';
    
    const role = user?.role?.toUpperCase();
    const dept = user?.department;

    if (role === 'STUDENT' || role === 'USER') return '/student/dashboard';
    
    if (role === 'MANAGER' || role === 'ASS MANAGER' || role === 'STAFF') {
        if (dept === 'Finance') return '/finance/dashboard';
        if (dept === 'Class Coordination') return '/coordinator/dashboard';
        if (dept === 'Call Center') return '/call-center/dashboard';
        if (dept === 'Technical') return '/technical/dashboard';
        if (dept === 'Delivery') return '/delivery/dashboard';
        
        return '/manager/dashboard';
    }

    return '/admin/dashboard'; 
  };

  if (!authChecked) return <div className="min-h-screen bg-[#0a0f1c]"></div>;

  return (
    <BrowserRouter>
      <Toaster position="top-right" /> 

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home loggedInUser={loggedInUser} />} />
        <Route path="/register" element={<Register />} />
        
        <Route 
          path="/login" 
          element={loggedInUser ? <Navigate to={getDashboardLink(loggedInUser)} /> : <Login setLoggedInUser={setLoggedInUser} />} 
        />

        {/* ✅ ADMIN & STAFF ROUTES ✅ */}
        <Route element={loggedInUser && loggedInUser.role.toUpperCase() !== 'STUDENT' && loggedInUser.role.toUpperCase() !== 'USER' ? <MainLayout loggedInUser={loggedInUser} handleLogout={handleLogout} /> : <Navigate to="/login" />}>
            
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            
            <Route path="/manager/dashboard" element={<ManagerDashboard />} /> 
            <Route path="/coordinator/dashboard" element={<ManagerDashboard />} /> 
            <Route path="/finance/dashboard" element={<ManagerDashboard />} /> 
            <Route path="/call-center/dashboard" element={<ManagerDashboard />} />
            <Route path="/technical/dashboard" element={<ManagerDashboard />} />
            <Route path="/delivery/dashboard" element={<ManagerDashboard />} />

            {/* Common Panels */}
            <Route path="/admin/content-hub" element={<ContentHub loggedInUser={loggedInUser} />} />
            <Route path="/admin/staff" element={<StaffManagement loggedInUser={loggedInUser} />} />
            <Route path="/admin/payments" element={<PaymentManagement loggedInUser={loggedInUser} />} />
            
            {/* System Admin CRM Configuration */}
            <Route path="/admin/crm-setup" element={<CrmManagement loggedInUser={loggedInUser} />} />

            {/* 🔥 NEW: Active CRM Interface for Staff & Managers 🔥 */}
            <Route path="/workspace/crm" element={<CoordinatorDashboard loggedInUser={loggedInUser} />} />

        </Route>

        {/* ✅ STUDENT ROUTES ✅ */}
        <Route 
          path="/student/dashboard" 
          element={loggedInUser && (loggedInUser.role.toUpperCase() === 'STUDENT' || loggedInUser.role.toUpperCase() === 'USER') ? <StudentDashboard /> : <Navigate to="/login" />} 
        />

        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}