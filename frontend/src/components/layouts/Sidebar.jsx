import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    LayoutDashboard, Users, MonitorPlay, 
    LogOut, HeadphonesIcon, Wallet, MessageCircle
} from 'lucide-react'; 

export default function Sidebar({ userRole, loggedInUser, handleLogout, currentBg, setBgImage }) {
  
  const displayName = loggedInUser?.firstName || 'User';
  const roleName = loggedInUser?.role || 'Staff';

  const themes = [
    { id: 1, file: '/adminglass.jpg', color: 'bg-blue-500' },
    { id: 2, file: '/bg1.jpg', color: 'bg-emerald-500' },
    { id: 3, file: '/bg2.jpg', color: 'bg-purple-500' },
    { id: 4, file: '/bg3.jpg', color: 'bg-orange-500' },
    { id: 5, file: '/bg4.jpg', color: 'bg-red-500' },
  ];

  const getNavLinkClass = ({ isActive }) => 
    isActive 
      ? "flex items-center gap-4 px-4 py-3.5 bg-white/10 text-white border border-white/20 rounded-2xl font-bold transition-all shadow-xl backdrop-blur-md text-sm"
      : "flex items-center gap-4 px-4 py-3.5 hover:bg-white/5 rounded-2xl font-medium text-white/60 hover:text-white transition-all border border-transparent text-sm";

  const isSystemAdmin = roleName === 'SYSTEM_ADMIN' || roleName === 'System Admin' || roleName === 'Director';
  const isManager = roleName === 'MANAGER' || roleName === 'Manager' || roleName === 'ASS MANAGER';
  const isStaff = !isSystemAdmin && !isManager && roleName !== 'STUDENT' && roleName !== 'user';
  const isStudent = roleName === 'STUDENT' || roleName === 'user';

  return (
    <div className="w-[280px] bg-white/5 border-r border-white/10 flex flex-col justify-between relative z-20 backdrop-blur-xl transition-all shrink-0 h-full">
      <div className="flex items-center justify-center pt-8 pb-6 w-full shrink-0">
        <img src="/logo.png" alt="Logo" className="w-40 h-auto object-contain drop-shadow-2xl" />
      </div>

      <div className="mx-4 mb-4 bg-black/40 border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center shrink-0 shadow-2xl">
        <h3 className="text-white font-bold text-base truncate w-full text-center">Hello, {displayName}</h3>
        <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1">{roleName}</p>
        
        <div className="flex items-center gap-2 mt-4 bg-black/40 p-1.5 rounded-full border border-white/5">
          {themes.map((theme) => (
            <button key={theme.id} onClick={() => setBgImage(theme.file)} className={`w-4 h-4 rounded-full transition-all ${theme.color} ${currentBg === theme.file ? 'ring-2 ring-white scale-125' : 'opacity-40 hover:opacity-100'}`} />
          ))}
        </div>
      </div>
        
      <nav className="flex-1 flex flex-col gap-1.5 px-4 overflow-y-auto custom-scrollbar pb-4 mt-2">
        {isSystemAdmin && (
          <>
            <div className="text-[10px] uppercase font-black text-slate-500 mb-1 mt-2 pl-2 tracking-widest">Administration</div>
            <NavLink to="/admin/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} /> Overview</NavLink>
            <NavLink to="/admin/staff" className={getNavLinkClass}><Users size={18} /> Staff Management</NavLink>
            <NavLink to="/admin/content-hub" className={getNavLinkClass}><MonitorPlay size={18} /> Content Hub</NavLink>
            <NavLink to="/admin/payments" className={getNavLinkClass}><Wallet size={18} /> Manage Payments</NavLink>
            <NavLink to="/admin/crm-setup" className={getNavLinkClass}><HeadphonesIcon size={18} /> CRM Setup </NavLink>
          </>
        )}

        {isManager && (
          <>
            <div className="text-[10px] uppercase font-black text-slate-500 mb-1 mt-2 pl-2 tracking-widest">Management</div>
            <NavLink to="/manager/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} /> Branch Overview</NavLink>
            <NavLink to="/admin/content-hub" className={getNavLinkClass}><MonitorPlay size={18} /> Content Hub</NavLink>
            <NavLink to="/admin/staff" className={getNavLinkClass}><Users size={18} /> Staff Management</NavLink>
            <NavLink to="/admin/payments" className={getNavLinkClass}><Wallet size={18} /> Manage Payments</NavLink>
          </>
        )}

        {/* 🔥 NEW: Active CRM Workspace (Visible to Admin, Manager, and Staff) 🔥 */}
        {(isSystemAdmin || isManager || isStaff) && (
          <>
            <div className="text-[10px] uppercase font-black text-slate-500 mb-1 mt-4 pl-2 tracking-widest">Workspace</div>
            <NavLink to="/workspace/crm" className={getNavLinkClass}>
              <MessageCircle size={18} /> Coordinator CRM
            </NavLink>
          </>
        )}

        {isStudent && (
          <>
            <div className="text-[10px] uppercase font-black text-slate-500 mt-3 mb-1 pl-2 tracking-widest">Student Portal</div>
            <NavLink to="/student/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} /> My Dashboard</NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-white/10 shrink-0">
        <button onClick={handleLogout} className="w-full py-3.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
          <LogOut size={18} /> Secure Logout
        </button>
      </div>
    </div>
  );
}