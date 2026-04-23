import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout & Pages
import Home from './pages/web/pages/Home'; 
import AboutUs from './pages/web/pages/AboutUs'; 
import ContactUs from './pages/web/pages/ContactUs'; 
import PrivacyPolicy from './pages/web/pages/PrivacyPolicy'; 
import Terms from './pages/web/pages/Terms'; 
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import MainLayout from "./components/layouts/MainLayout";

// Dashboards & Modules
import AdminDashboard from './pages/admin/AdminDashboard';
import ContentHub from './components/common/contenthub/ContentHub';
import StaffManagement from './components/common/StaffManagement'; 
import PaymentManagement from './components/common/PaymentManagement';
import StudentDataCenter from './components/common/StudentDataCenter';

// System Admin CRM Setup
import CrmManagement from './components/admin/CrmManagement';

// Coordinator CRM Dashboard (For Manager & Staff)
import CoordinatorDashboard from './pages/ClassCoordinator/CoordinatorDashboard';

// Department Dashboards (Mangers & Staff)
import ManagerDashboard from './pages/class_coordinator/manager/ManagerDashboard';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard'; // 🔥 NEW 🔥

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
        
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />

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
            
            {/* 🔥 Delivery Dashboard Route 🔥 */}
            <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />

            {/* Common Panels */}
            <Route path="/admin/content-hub" element={<ContentHub loggedInUser={loggedInUser} />} />
            <Route path="/admin/staff" element={<StaffManagement loggedInUser={loggedInUser} />} />
            <Route path="/admin/payments" element={<PaymentManagement loggedInUser={loggedInUser} />} />
            <Route path="/admin/student-center" element={<StudentDataCenter loggedInUser={loggedInUser} />} />

            {/* System Admin CRM Configuration */}
            <Route path="/admin/crm-setup" element={<CrmManagement loggedInUser={loggedInUser} />} />

            {/* Active CRM Interface for Staff & Managers */}
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