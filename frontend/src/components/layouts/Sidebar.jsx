import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, MonitorPlay, LogOut, HeadphonesIcon, Wallet, MessageCircle, Database, Truck, Package, Clock, CheckCircle, Archive, HardDrive, CalendarDays, CheckSquare, History, Music, Palette, ChevronLeft, ChevronRight, Megaphone, X } from 'lucide-react';

export default function Sidebar({ userRole, loggedInUser, handleLogout, isSidebarOpen, setIsSidebarOpen, currentBg, setBgImage, isSpotifyOpen, setIsSpotifyOpen }) {
  const location = useLocation();
  const displayName = loggedInUser?.firstName || 'User';
  const roleName = loggedInUser?.role || 'Staff';
  
  // 🔥 New State for Theme Popup
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  const getNavLinkClass = ({ isActive }) => 
    isActive 
      ? "w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/20 border border-white/20 backdrop-blur-md text-white font-medium transition-all shadow-[0_4px_15px_rgba(0,0,0,0.1)]"
      : "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10 transition-all font-medium border border-transparent";

  const getTabLinkClass = (tabName) => {
    const queryParams = new URLSearchParams(location.search);
    const activeTab = queryParams.get('tab') || 'overview';
    return activeTab === tabName && location.pathname.includes('/delivery/dashboard')
      ? "w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/20 border border-white/20 backdrop-blur-md text-white font-medium transition-all shadow-[0_4px_15px_rgba(0,0,0,0.1)]"
      : "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/10 transition-all font-medium border border-transparent";
  };

  const isSystemAdmin = roleName === 'SYSTEM_ADMIN' || roleName === 'System Admin' || roleName === 'Director';
  const isDeliveryDept = loggedInUser?.department === 'Delivery';
  const isFinanceDept = loggedInUser?.department === 'Finance';
  const isManager = (roleName === 'MANAGER' || roleName === 'Manager' || roleName === 'ASS MANAGER') && !isDeliveryDept && !isFinanceDept;
  const isCaller = roleName === 'CALLER' || roleName === 'Caller';
  const isStaff = !isSystemAdmin && !isManager && !isDeliveryDept && !isFinanceDept && !isCaller && roleName !== 'STUDENT' && roleName !== 'user';
  const isStudent = roleName === 'STUDENT' || roleName === 'user';

  return (
    <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} flex-shrink-0 bg-black/10 border-r border-white/20 transition-all duration-300 flex flex-col z-20 h-full relative`}>
      
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute -right-3 top-6 bg-white/10 border border-white/20 backdrop-blur-md text-white p-1 rounded-full z-50 hover:bg-white/20 transition-colors"
      >
        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <div className="h-14 flex items-center px-4 space-x-2 w-full absolute top-0 left-0 z-30">
        <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-sm cursor-pointer hover:opacity-80"></div>
        <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-sm cursor-pointer hover:opacity-80"></div>
        <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-sm cursor-pointer hover:opacity-80"></div>
      </div>

      <div className={`h-16 mt-10 mb-4 flex items-center justify-center w-full relative z-10 transition-all`}>
        {isSidebarOpen ? (
          <img src="/logo.png" alt="Company Logo" className="w-35 h-auto object-contain drop-shadow-lg" />
        ) : (
          <img src="/favicon.svg" alt="Icon" className="w-8 h-8 object-contain drop-shadow-md" />
        )}
      </div>
        
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {isSystemAdmin && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Administration</p>}
            <NavLink to="/admin/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} /> {isSidebarOpen && <span className="truncate text-sm">Overview</span>}</NavLink>
            <NavLink to="/admin/staff" className={getNavLinkClass}><Users size={18} /> {isSidebarOpen && <span className="truncate text-sm">Staff Management</span>}</NavLink>
            <NavLink to="/admin/announcements" className={getNavLinkClass}><Megaphone size={18} /> {isSidebarOpen && <span className="truncate text-sm">Announcements & Events</span>}</NavLink>
            <NavLink to="/admin/content-hub" className={getNavLinkClass}><MonitorPlay size={18} /> {isSidebarOpen && <span className="truncate text-sm">Content Hub</span>}</NavLink>
            <NavLink to="/admin/payments" className={getNavLinkClass}><Wallet size={18} /> {isSidebarOpen && <span className="truncate text-sm">Manage Payments</span>}</NavLink>
            <NavLink to="/admin/student-center" className={getNavLinkClass}><Database size={18} /> {isSidebarOpen && <span className="truncate text-sm">Student Data Center</span>}</NavLink>
            <NavLink to="/admin/crm-setup" className={getNavLinkClass}><HeadphonesIcon size={18} /> {isSidebarOpen && <span className="truncate text-sm">CRM Setup</span>}</NavLink>
            <NavLink to="/admin/database" className={getNavLinkClass}><HardDrive size={18} /> {isSidebarOpen && <span className="truncate text-sm">Database Manager</span>}</NavLink>
            
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Logistics</p>}
            <NavLink to="/delivery/dashboard?tab=overview" className={getNavLinkClass}><Truck size={18} /> {isSidebarOpen && <span className="truncate text-sm">Delivery Hub</span>}</NavLink>
          </>
        )}

        {isFinanceDept && !isSystemAdmin && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Finance Department</p>}
            <NavLink to="/finance/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} /> {isSidebarOpen && <span className="truncate text-sm">Finance Overview</span>}</NavLink>
            <NavLink to="/admin/payments" className={getNavLinkClass}><Wallet size={18} /> {isSidebarOpen && <span className="truncate text-sm">Manage Payments</span>}</NavLink>
          </>
        )}

        {isDeliveryDept && !isSystemAdmin && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Delivery</p>}
            <NavLink to="/delivery/dashboard?tab=overview" className={() => getTabLinkClass('overview')}><Package size={18} /> {isSidebarOpen && <span className="truncate text-sm">Overview</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=pending" className={() => getTabLinkClass('pending')}><Clock size={18} /> {isSidebarOpen && <span className="truncate text-sm">Pending & Holds</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=delivered" className={() => getTabLinkClass('delivered')}><CheckCircle size={18} /> {isSidebarOpen && <span className="truncate text-sm">Delivered</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=history" className={() => getTabLinkClass('history')}><History size={18} /> {isSidebarOpen && <span className="truncate text-sm">History</span>}</NavLink>
            <NavLink to="/delivery/dashboard?tab=stock" className={() => getTabLinkClass('stock')}><Archive size={18} /> {isSidebarOpen && <span className="truncate text-sm">Tute Stock</span>}</NavLink>
          </>
        )}

        {isManager && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Management</p>}
            <NavLink to="/manager/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} /> {isSidebarOpen && <span className="truncate text-sm">Branch Overview</span>}</NavLink>
            <NavLink to="/admin/announcements" className={getNavLinkClass}><Megaphone size={18} /> {isSidebarOpen && <span className="truncate text-sm">Announcements</span>}</NavLink>
            <NavLink to="/admin/content-hub" className={getNavLinkClass}><MonitorPlay size={18} /> {isSidebarOpen && <span className="truncate text-sm">Content Hub</span>}</NavLink>
            <NavLink to="/admin/staff" className={getNavLinkClass}><Users size={18} /> {isSidebarOpen && <span className="truncate text-sm">Staff Management</span>}</NavLink>
            <NavLink to="/admin/payments" className={getNavLinkClass}><Wallet size={18} /> {isSidebarOpen && <span className="truncate text-sm">Manage Payments</span>}</NavLink>
            <NavLink to="/admin/student-center" className={getNavLinkClass}><Database size={18} /> {isSidebarOpen && <span className="truncate text-sm">Student Data Center</span>}</NavLink>
          </>
        )}

        {(isSystemAdmin || isManager || isStaff || isCaller) && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Workspace</p>}
            <NavLink to="/workspace/timetable" className={getNavLinkClass}><CalendarDays size={18} /> {isSidebarOpen && <span className="truncate text-sm">Class Timetable</span>}</NavLink>
            <NavLink to="/workspace/tasks" className={getNavLinkClass}><CheckSquare size={18} /> {isSidebarOpen && <span className="truncate text-sm">Task Center</span>}</NavLink>
            <NavLink to="/workspace/crm" className={getNavLinkClass}><MessageCircle size={18} /> {isSidebarOpen && <span className="truncate text-sm">Free Seminar CRM</span>}</NavLink>
            <NavLink to="/workspace/after-seminar-crm" className={getNavLinkClass}><HeadphonesIcon size={18} /> {isSidebarOpen && <span className="truncate text-sm">After Seminar CRM</span>}</NavLink>
            
            {!isSystemAdmin && !isManager && !isCaller && (
                <NavLink to="/admin/student-center" className={getNavLinkClass}><Database size={18} /> {isSidebarOpen && <span className="truncate text-sm">Student Data Center</span>}</NavLink>
            )}
          </>
        )}

        {isStudent && (
          <>
            {isSidebarOpen && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Student Portal</p>}
            <NavLink to="/student/dashboard" className={getNavLinkClass}><LayoutDashboard size={18} /> {isSidebarOpen && <span className="truncate text-sm">My Dashboard</span>}</NavLink>
            <NavLink to="/student/delivery" className={getNavLinkClass}><Truck size={18} /> {isSidebarOpen && <span className="truncate text-sm">My Deliveries</span>}</NavLink>
          </>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-white/20 flex flex-col gap-2 shrink-0 bg-transparent relative">
        
        {/* 🔥 NEW: Theme Popup Button 🔥 */}
        <button onClick={() => setIsThemeOpen(!isThemeOpen)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all font-medium outline-none border ${isThemeOpen ? 'bg-white/20 text-white border-white/30 shadow-[0_4px_15px_rgba(0,0,0,0.2)]' : 'text-gray-300 border-transparent hover:bg-white/10'}`}>
          <Palette size={18} className={isThemeOpen ? 'text-brand-accent' : ''} />
          {isSidebarOpen && <span className="truncate text-sm">Themes</span>}
        </button>

        {/* 🔥 NEW: Theme Popup Overlay 🔥 */}
        {isThemeOpen && (
            <div className={`absolute bottom-full left-0 mb-3 bg-[#0B1120]/95 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl z-50 transition-all ${isSidebarOpen ? 'w-[260px]' : 'w-[220px] left-16 mb-0 bottom-12'}`}>
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                    <p className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                        <Palette size={14}/> Backgrounds
                    </p>
                    <button onClick={() => setIsThemeOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X size={16}/></button>
                </div>
                
                <p className="text-[10px] text-gray-400 mb-2">Solid & Gradients</p>
<div className="flex gap-2 flex-wrap mb-4">
    {/* Solid Colors */}
    <button onClick={() => setBgImage('color1')} title="Light Blue" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'color1' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-[#60A5FA] transition-all`}></button>
    <button onClick={() => setBgImage('color2')} title="Purple" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'color2' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-[#A78BFA] transition-all`}></button>
    <button onClick={() => setBgImage('color3')} title="Plum Mix" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'color3' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-[#D946EF] transition-all`}></button>
    
    {/* Gradients */}
    <button onClick={() => setBgImage('grad1')} title="Blue-Red Mix" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'grad1' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-gradient-to-br from-[#1E40AF] to-[#B91C1C] transition-all`}></button>
    <button onClick={() => setBgImage('grad2')} title="Green Gradient" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'grad2' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-gradient-to-br from-[#065F46] to-[#10B981] transition-all`}></button>
    <button onClick={() => setBgImage('grad3')} title="Ash-Red Mix" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'grad3' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-gradient-to-br from-[#374151] to-[#EF4444] transition-all`}></button>
</div>

<p className="text-[10px] text-gray-400 mb-2">Live Animations</p>
<div className="flex gap-2 flex-wrap mb-4">
    <button onClick={() => setBgImage('anim1')} title="Live Sky" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'anim1' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-gradient-to-b from-blue-400 to-orange-300 transition-all flex items-center justify-center overflow-hidden`}><span className="text-[10px]">⛅</span></button>
    <button onClick={() => setBgImage('anim2')} title="Slow Color Shift" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'anim2' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-gradient-to-r from-blue-500 via-red-500 to-yellow-400 transition-all flex items-center justify-center`}><span className="text-[10px]">🌈</span></button>
    <button onClick={() => setBgImage('anim3')} title="Floating Balls" className={`w-6 h-6 rounded-full border-2 ${currentBg === 'anim3' ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent'} bg-blue-900 transition-all flex items-center justify-center`}><span className="text-[10px]">🎾</span></button>
</div>

                <p className="text-[10px] text-gray-400 mb-2">Wallpapers</p>
                <div className="flex gap-2 flex-wrap">
                    {['wall1', 'wall2', 'wall3', 'wall4', 'wall5'].map((theme, i) => (
                        <button
                            key={i}
                            onClick={() => setBgImage(theme)} 
                            className={`w-7 h-7 rounded-full border bg-cover bg-center transition-all flex items-center justify-center outline-none ${currentBg === theme ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-white/20 hover:border-white/50'}`}
                            style={{ backgroundImage: `url('/bg${i+1}.jpg')` }}
                            title={`Wallpaper ${i+1}`}
                        />
                    ))}
                </div>
            </div>
        )}

        <button onClick={() => setIsSpotifyOpen(!isSpotifyOpen)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all font-medium outline-none border ${isSpotifyOpen ? 'bg-white/20 text-white border-white/30 shadow-[0_4px_15px_rgba(0,0,0,0.2)]' : 'text-gray-300 border-transparent hover:bg-white/10'}`}>
          <Music size={18} className={isSpotifyOpen ? 'animate-pulse text-[#1DB954]' : ''} />
          {isSidebarOpen && <span className="truncate text-sm">Music Player</span>}
        </button>

        <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-transparent transition-all font-medium">
          <LogOut size={18} />
          {isSidebarOpen && <span className="truncate text-sm">Logout</span>}
        </button>
      </div>
      
      {/* Profile Section */}
      <div className="p-3 border-t border-white/20 shrink-0 bg-transparent">
        <div className={`flex items-center ${isSidebarOpen ? 'space-x-3 p-2' : 'justify-center p-1'} rounded-lg hover:bg-white/10 transition-colors cursor-pointer border border-transparent`}>
          <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 transition-colors flex items-center justify-center text-white font-bold shadow-sm text-sm shrink-0 backdrop-blur-md">
            {displayName.charAt(0).toUpperCase()}
          </div>
          {isSidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-gray-300 uppercase tracking-wide truncate">{roleName}</p>
            </div>
          )}
        </div>
      </div>

    </aside>
  );
}