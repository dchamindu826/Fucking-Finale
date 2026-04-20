import React, { useState } from 'react';
import ContactSidebar from '../../components/CoordinatorCRM/ContactSidebar';
import ChatArea from '../../components/CoordinatorCRM/ChatArea';
import RightSidePanel from '../../components/CoordinatorCRM/RightSidePanel';

const CoordinatorDashboard = () => {
  // 'FREE_SEMINAR' සහ 'AFTER_SEMINAR' අතර මාරු වෙන්න State එක
  const [crmMode, setCrmMode] = useState('FREE_SEMINAR'); 
  const [selectedLead, setSelectedLead] = useState(null);

  return (
    // ලස්සන Light Gradient Background එකක්
    <div className="h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 flex flex-col font-sans">
      
      {/* Top Toggle Buttons (Shift වෙන්න පුළුවන් ලොකු Button දෙක) */}
      <div className="flex justify-center gap-6 mb-4">
        <button 
          onClick={() => setCrmMode('FREE_SEMINAR')}
          className={`px-10 py-3 rounded-2xl font-bold text-lg transition-all duration-300 ease-in-out flex items-center gap-2 ${
            crmMode === 'FREE_SEMINAR' 
              ? 'bg-white/60 backdrop-blur-md border-2 border-blue-400 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-blue-800 scale-105' 
              : 'bg-white/30 backdrop-blur-sm border border-white/50 text-gray-500 hover:bg-white/50'
          }`}
        >
          <span className="text-2xl">🎓</span> Free Seminar CRM
        </button>
        
        <button 
          onClick={() => setCrmMode('AFTER_SEMINAR')}
          className={`px-10 py-3 rounded-2xl font-bold text-lg transition-all duration-300 ease-in-out flex items-center gap-2 ${
            crmMode === 'AFTER_SEMINAR' 
              ? 'bg-white/60 backdrop-blur-md border-2 border-purple-400 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-purple-800 scale-105' 
              : 'bg-white/30 backdrop-blur-sm border border-white/50 text-gray-500 hover:bg-white/50'
          }`}
        >
          <span className="text-2xl">🚀</span> After Seminar CRM
        </button>
      </div>

      {/* Main CRM Workspace - Glassmorphism Container */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        
        {/* 1. Contact Sidebar (Left Panel - 25% width) */}
        <div className="w-1/4 h-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] flex flex-col overflow-hidden">
             <ContactSidebar crmMode={crmMode} selectedLead={selectedLead} onSelectLead={setSelectedLead} />
        </div>

        {/* 2. Chat Area (Middle Panel - 50% width) */}
        <div className="w-2/4 h-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] flex flex-col overflow-hidden">
            <ChatArea selectedLead={selectedLead} />
        </div>

        {/* 3. Call Campaign / Right Panel (Right Panel - 25% width) */}
        <div className="w-1/4 h-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] flex flex-col overflow-hidden">
            <RightSidePanel selectedLead={selectedLead} crmMode={crmMode} />
        </div>

      </div>
    </div>
  );
};

export default CoordinatorDashboard;