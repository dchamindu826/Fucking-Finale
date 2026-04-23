import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, Users, MonitorPlay, 
    LogOut, HeadphonesIcon, Wallet, MessageCircle, Database, Truck, Image as ImageIcon,
    Package, Clock, CheckCircle, Archive
} from 'lucide-react'; 

export default function Sidebar({ userRole, loggedInUser, handleLogout, currentBg, setBgImage }) {
  const location = useLocation();
  const displayName = loggedInUser?.firstName || 'User';
  const roleName = loggedInUser?.role || 'Staff';

  const themes = ['/adminglass.jpg', '/bg1.jpg', '/bg2.jpg', '/bg3.jpg', '/bg4.jpg'];

  const getNavLinkClass = ({ isActive }) => 
    isActive 
      ? "flex items-center gap-4 px-4 py-3.5 bg-white/10 text-white border border-white/20 rounded-2xl font-bold transition-all shadow-xl backdrop-blur-md text-sm"
      : "flex items-center gap-4 px-4 py-3.5 hover:bg-white/5 rounded-2xl font-medium text-white/60 hover:text-white transition-all border border-transparent text-sm";

  // URL query parameters check කරන්න (Tabs සඳහා)
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'overview';

  // Active Tab එකට අදාල Class එක
  const getTabLinkClass = (tabName) => 
    activeTab === tabName && location.pathname.includes('/delivery/dashboard')
      ? "flex items-center gap-4 px-4 py-3.5 bg-white/10 text-white border border-white/20 rounded-2xl font-bold transition-all shadow-xl backdrop-blur-md text-sm"
      : "flex items-center gap-4 px-4 py-3.5 hover:bg-white/5 rounded-2xl font-medium text-white/60 hover:text-white transition-all border border-transparent text-sm";


  const isSystemAdmin = roleName === 'SYSTEM_ADMIN' || roleName === 'System Admin' || roleName === 'Director';
  const isDeliveryDept = loggedInUser?.department === 'Delivery';
  // 🔥 FIX: Delivery Department නෙවෙයි නම් විතරක් General Manager දේවල් පෙන්වන්න
  const isManager = (roleName === 'MANAGER' || roleName === 'Manager' || roleName === 'ASS MANAGER') && !isDeliveryDept;
  const isStaff = !isSystemAdmin && !isManager && !isDeliveryDept && roleName !== 'STUDENT' && roleName !== 'user';
  const isStudent = roleName === 'STUDENT' || roleName === 'user';

  return (
    <div className="w-[280px] bg-white/5 border-r border-white/10 flex flex-col justify-between relative z-20 backdrop-blur-xl transition-all shrink-0 h-full">
      <div className="flex items-center justify-center pt-8 pb-6 w-full shrink-0">
        <img src="/logo.png" alt="Logo" className="w-40 h-auto object-contain drop-shadow-2xl" />
      </div>

      <div className="mx-4 mb-4 bg-black/40 border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center shrink-0 shadow-2xl">
        <h3 className="text-white font-bold text-base truncate w-full text-center">Hello, {displayName}</h3>
        <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1">{roleName}</p>
      </div>
        
      <nav className="flex-1 flex flex-col gap-1.5 px-4 overflow-y-auto custom-scrollbar pb-4 mt-2">
        {isSystemAdmin && (
          <>
            <div className="text-[10px] uppercase font-black text-slate-500 mb-1 mt-2 pl-2 tracking-widest">Administration</div>
            <NavLink to="/admin/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} /> Overview</NavLink>
            <NavLink to="/admin/staff" className={getNavLinkClass}><Users size={18} /> Staff Management</NavLink>
            <NavLink to="/admin/content-hub" className={getNavLinkClass}><MonitorPlay size={18} /> Content Hub</NavLink>
            <NavLink to="/admin/payments" className={getNavLinkClass}><Wallet size={18} /> Manage Payments</NavLink>
            <NavLink to="/admin/student-center" className={getNavLinkClass}><Database size={18} /> Student Data Center</NavLink>
            <NavLink to="/admin/crm-setup" className={getNavLinkClass}><HeadphonesIcon size={18} /> CRM Setup </NavLink>
            
            {/* Admin ට Delivery එකට යන්න Link එකක් */}
            <div className="text-[10px] uppercase font-black text-slate-500 mb-1 mt-4 pl-2 tracking-widest">Logistics & Delivery</div>
            <NavLink to="/delivery/dashboard?tab=overview" className={getNavLinkClass}><Truck size={18} /> Delivery Hub</NavLink>
          </>
        )}

        {/* 🔥 FIX: Delivery Department අයට පේන සුවිශේෂී මෙනු එක 🔥 */}
        {isDeliveryDept && !isSystemAdmin && (
          <>
           <div className="text-[10px] uppercase font-black text-slate-500 mb-1 mt-2 pl-2 tracking-widest">Delivery Dashboard</div>
           <NavLink to="/delivery/dashboard?tab=overview" className={() => getTabLinkClass('overview')}><Package size={18} /> Overview</NavLink>
           <NavLink to="/delivery/dashboard?tab=pending" className={() => getTabLinkClass('pending')}><Clock size={18} /> Pending & Holds</NavLink>
           <NavLink to="/delivery/dashboard?tab=delivered" className={() => getTabLinkClass('delivered')}><CheckCircle size={18} /> Delivered</NavLink>
           <NavLink to="/delivery/dashboard?tab=stock" className={() => getTabLinkClass('stock')}><Archive size={18} /> Tute Stock</NavLink>
          </>
        )}

        {isManager && (
          <>
            <div className="text-[10px] uppercase font-black text-slate-500 mb-1 mt-2 pl-2 tracking-widest">Management</div>
            <NavLink to="/manager/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} /> Branch Overview</NavLink>
            <NavLink to="/admin/content-hub" className={getNavLinkClass}><MonitorPlay size={18} /> Content Hub</NavLink>
            <NavLink to="/admin/staff" className={getNavLinkClass}><Users size={18} /> Staff Management</NavLink>
            <NavLink to="/admin/payments" className={getNavLinkClass}><Wallet size={18} /> Manage Payments</NavLink>
            <NavLink to="/admin/student-center" className={getNavLinkClass}><Database size={18} /> Student Data Center</NavLink>
          </>
        )}

        {(isSystemAdmin || isManager || isStaff) && (
          <>
            <div className="text-[10px] uppercase font-black text-slate-500 mb-1 mt-4 pl-2 tracking-widest">Workspace</div>
            <NavLink to="/workspace/crm" className={getNavLinkClass}>
              <MessageCircle size={18} /> Free Seminar CRM
            </NavLink>
            {!isSystemAdmin && !isManager && (
                <NavLink to="/admin/student-center" className={getNavLinkClass}><Database size={18} /> Student Data Center</NavLink>
            )}
          </>
        )}

        {isStudent && (
          <>
            <div className="text-[10px] uppercase font-black text-slate-500 mt-3 mb-1 pl-2 tracking-widest">Student Portal</div>
            <NavLink to="/student/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} /> My Dashboard</NavLink>
          </>
        )}
      </nav>

      {/* Footer Section */}
      <div className="p-6 border-t border-white/10 shrink-0">
          <div className="mb-4">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
                  <ImageIcon size={12}/> Wallpaper
              </p>
              <div className="flex justify-center gap-2">
                  {themes.map((theme, i) => (
                      <button
                          key={i}
                          onClick={() => setBgImage(theme)} 
                          className={`w-6 h-6 rounded-full border-2 bg-cover bg-center transition-all ${currentBg === theme ? 'border-blue-500 scale-110 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-white/20 hover:border-white/50'}`}
                          style={{ backgroundImage: `url(${theme})` }}
                      ></button>
                  ))}
              </div>
          </div>

          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl font-bold text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/30">
              <LogOut size={18} strokeWidth={2.5} /> Secure Logout
          </button>
      </div>
    </div>
  );
}