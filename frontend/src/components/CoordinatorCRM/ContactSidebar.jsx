import React, { useState, useEffect } from 'react';
// import { useAuth } from "../../context/AuthContext"; <--- මේ පේළිය සම්පූර්ණයෙන්ම මකලා දාන්න

const ContactSidebar = ({ crmMode, selectedLead, onSelectLead }) => {
  
  // 🚧 UI එක බලාගන්න දැනට අපි Dummy User කෙනෙක් දාමු 
  // (පස්සේ ඔයාගේ ඇත්තම Auth සිස්ටම් එකට මේක ලින්ක් කරමු)
  const user = { role: 'MANAGER' }; 
  
  const isManager = user?.role === 'SYSTEM_ADMIN' || user?.role === 'MANAGER' || user?.role === 'DIRECTOR';
  
  // Tabs: All, Assigned, Imported, New
  const [activeTab, setActiveTab] = useState('NEW');

  // Filters for 'Assigned' tab
  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header & Tabs */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4 tracking-wide">Contacts</h2>
        
        {/* Tab Navigation (Glassmorphism Pills) */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['NEW', 'ASSIGNED', 'IMPORTED', 'ALL'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'bg-white/50 text-gray-600 hover:bg-white/80 border border-white/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons (Manager Only) - Assign, Import, etc. */}
      {isManager && (
        <div className="flex gap-2 mb-4">
           {/* මේ Button වලට අදාල Modals පස්සේ ලින්ක් කරමු */}
           <button className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all">
             + Import
           </button>
           <button className="flex-1 bg-white/70 border border-blue-200 text-blue-700 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-white transition-all">
             Bulk Assign
           </button>
           <button className="flex-1 bg-white/70 border border-blue-200 text-blue-700 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-white transition-all">
             Auto Assign
           </button>
        </div>
      )}

      {/* Phase & Status Filters (Assigned Tab එකේදී විතරයි පෙන්නන්නේ) */}
      {activeTab === 'ASSIGNED' && (
        <div className="flex gap-2 mb-3">
          <select 
            className="flex-1 bg-white/50 border border-white/60 text-gray-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-400"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
          >
            <option value="ALL">All Phases</option>
            <option value="1">Phase 1</option>
            <option value="2">Phase 2</option>
            <option value="3">Phase 3</option>
          </select>

          <select 
            className="flex-1 bg-white/50 border border-white/60 text-gray-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-400"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="pending">Pending</option>
            <option value="no_answer">No Answer</option>
            <option value="reject">Reject</option>
            <option value="answered">Answered</option>
          </select>
        </div>
      )}

      {/* Contact List (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {/* මෙතනට Backend එකෙන් එන Leads Data Map කරමු. දැනට Dummy Item එකක් දාලා තියෙන්නේ බලන්න. */}
        
        <div 
          onClick={() => onSelectLead({ id: 1, name: 'Chamindu', phone: '0712345678', unread: 2 })}
          className={`p-3 rounded-2xl cursor-pointer transition-all border ${
            selectedLead?.id === 1 
              ? 'bg-white/80 border-blue-400 shadow-md' 
              : 'bg-white/40 border-white/50 hover:bg-white/60'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-gray-800">Chamindu</h3>
            <span className="text-xs text-gray-500">10:30 AM</span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 truncate">Sir mama free seminar awah...</p>
            {/* Unread Count Badge */}
            <div className="bg-green-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
              2
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ContactSidebar;