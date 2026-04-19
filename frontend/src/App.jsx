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

// Department Dashboards (Mangers & Staff)
// * මේ ෆයිල්ස් ඔයා තාම හදලා නැත්නම්, ඒවා පස්සේ හදලා import කරන්න. දැනට ManagerDashboard පාවිච්චි කරමු.
import ManagerDashboard from './pages/class_coordinator/manager/ManagerDashboard';
// import FinanceDashboard from './pages/finance/manager/FinanceDashboard';
// import CallCenterDashboard from './pages/call_center/manager/CallCenterDashboard';
// import DeliveryDashboard from './pages/delivery/manager/DeliveryDashboard';
// import TechDashboard from './pages/technical/manager/TechDashboard';

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

  // 🔥 Role සහ Department එක මත පදනම් වෙලා හරියටම යන්න ඕනේ ලින්ක් එක හොයනවා 🔥
  const getDashboardLink = (user) => {
    if (!user) return '/login';
    
    const role = user?.role?.toUpperCase();
    const dept = user?.department;

    // Student / User
    if (role === 'STUDENT' || role === 'USER') return '/student/dashboard';
    
    // Managers & Assistant Managers
    if (role === 'MANAGER' || role === 'ASS MANAGER') {
        if (dept === 'Finance') return '/finance/dashboard';
        if (dept === 'Class Coordination') return '/coordinator/dashboard';
        if (dept === 'Call Center') return '/call-center/dashboard';
        if (dept === 'Technical') return '/technical/dashboard';
        if (dept === 'Delivery') return '/delivery/dashboard';
        
        // Department එකක් හරියටම නැත්නම් Default Manager Dashboard එකට යවනවා
        return '/manager/dashboard';
    }

    // System Admins / Directors
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

        {/* ✅ ADMIN & STAFF ROUTES (These use the MainLayout) ✅ */}
        <Route element={loggedInUser && loggedInUser.role.toUpperCase() !== 'STUDENT' && loggedInUser.role.toUpperCase() !== 'USER' ? <MainLayout loggedInUser={loggedInUser} handleLogout={handleLogout} /> : <Navigate to="/login" />}>
            
            {/* Core Admin Routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            
            {/* Manager Routes (Department wise) */}
            <Route path="/manager/dashboard" element={<ManagerDashboard />} /> {/* Default / Fallback */}
            <Route path="/coordinator/dashboard" element={<ManagerDashboard />} /> {/* අනාගතයේදී CoordinatorManagerDashboard එකට මාරු කරන්න */}
            <Route path="/finance/dashboard" element={<ManagerDashboard />} /> {/* අනාගතයේදී FinanceDashboard එකට මාරු කරන්න */}
            <Route path="/call-center/dashboard" element={<ManagerDashboard />} />
            <Route path="/technical/dashboard" element={<ManagerDashboard />} />
            <Route path="/delivery/dashboard" element={<ManagerDashboard />} />

            {/* Common Panels */}
            <Route path="/admin/content-hub" element={<ContentHub loggedInUser={loggedInUser} />} />
            <Route path="/admin/staff" element={<StaffManagement loggedInUser={loggedInUser} />} />
            <Route path="/admin/payments" element={<PaymentManagement loggedInUser={loggedInUser} />} />
        </Route>

        {/* ✅ STUDENT ROUTES (Standalone - NO MainLayout) ✅ */}
        <Route 
          path="/student/dashboard" 
          element={loggedInUser && (loggedInUser.role.toUpperCase() === 'STUDENT' || loggedInUser.role.toUpperCase() === 'USER') ? <StudentDashboard /> : <Navigate to="/login" />} 
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}