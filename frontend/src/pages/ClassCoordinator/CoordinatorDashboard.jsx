import React, { useState, useEffect } from 'react';
import ContactSidebar from '../../components/CoordinatorCRM/ContactSidebar';
import ChatArea from '../../components/CoordinatorCRM/ChatArea';
import RightSidePanel from '../../components/CoordinatorCRM/RightSidePanel';
import CallCampaignModule from '../../components/CoordinatorCRM/CallCampaignModule';
import { FaWhatsapp, FaHeadset, FaFilter, FaChartBar } from 'react-icons/fa';
import axios from '../../api/axios';

export default function CoordinatorDashboard() {
  const [user, setUser] = useState(null);
  const [activeMode, setActiveMode] = useState('CRM'); 
  const [selectedLead, setSelectedLead] = useState(null);
  
  const [businesses, setBusinesses] = useState([]);
  const [batches, setBatches] = useState([]);
  
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch(e) {}
    } else {
      setUser({ role: 'SYSTEM_ADMIN' }); 
    }
    fetchBusinessesAndBatches();
  }, []);

  const fetchBusinessesAndBatches = async () => {
    try {
      const res = await axios.get('/admin/manager/batches-full');
      const allBatches = res.data;
      setBatches(allBatches);
      
      const uniqueBiz = [];
      const bizMap = new Map();
      allBatches.forEach(b => {
        if (b.business && !bizMap.has(b.business.id)) {
          bizMap.set(b.business.id, true);
          uniqueBiz.push(b.business);
        }
      });
      setBusinesses(uniqueBiz);
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
    }
  };

  // 🔥 FIX: Corrected variables to prevent crashes 🔥
  const rawRole = user?.role || JSON.parse(localStorage.getItem('user'))?.role || '';
  const userRole = rawRole.toUpperCase().replace(/ /g, '_'); // / /g use කලේ space කීපයක් තිබ්බත් අයින් වෙන්න
  const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(userRole);
  const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);

  const displayBatches = selectedBusiness 
    ? batches.filter(b => b.businessId === parseInt(selectedBusiness))
    : batches;

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in-up text-slate-300">
      
      {/* Top Header Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#23303f] p-3 rounded-2xl shadow-md border border-white/5">
        
        <div className="flex gap-2 p-1 bg-[#1a2430] rounded-full border border-white/5">
          <button
            onClick={() => setActiveMode('CRM')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
              activeMode === 'CRM' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <FaWhatsapp /> Free Seminar CRM
          </button>
          
          {/* 🔥 DYNAMIC BUTTON TEXT BASED ON ROLE 🔥 */}
          <button
            onClick={() => setActiveMode('CALL_CAMPAIGN')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
              activeMode === 'CALL_CAMPAIGN' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            {(isAdmin || isManager) ? (
              <><FaChartBar /> Campaign Progress</>
            ) : (
              <><FaHeadset /> Call Campaign</>
            )}
          </button>
        </div>

        {/* 🔥 FIX: Dynamic DB Filters - DAN MODE DEKEDIMA PENAWA 🔥 */}
        {(isAdmin || isManager) && (
          <div className="flex items-center gap-3">
            <FaFilter className="text-slate-500" />
            {isAdmin && (
              <select 
                value={selectedBusiness}
                onChange={(e) => {
                  setSelectedBusiness(e.target.value);
                  setSelectedBatch('');
                }}
                className="bg-[#1a2430] border border-white/10 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-600"
              >
                <option value="">All Businesses</option>
                {businesses.map(biz => (
                  <option key={biz.id} value={biz.id}>{biz.name}</option>
                ))}
              </select>
            )}
            <select 
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-[#1a2430] border border-white/10 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-600"
            >
              <option value="">Select Batch</option>
              {displayBatches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeMode === 'CRM' ? (
        <div className="flex-1 flex gap-4 h-[calc(100%-6rem)] overflow-hidden">
          <ContactSidebar 
            activeMode={activeMode} 
            selectedLead={selectedLead} 
            setSelectedLead={setSelectedLead}
            filters={{ selectedBusiness, selectedBatch }}
          />

          {selectedLead ? (
            <>
              <ChatArea selectedLead={selectedLead} />
              <RightSidePanel selectedLead={selectedLead} activeMode={activeMode} />
            </>
          ) : (
            <div className="flex-1 bg-[#23303f] rounded-2xl flex flex-col items-center justify-center text-slate-500 shadow-xl border border-white/5">
              <FaWhatsapp className="text-6xl text-slate-600 mb-4 opacity-50" />
              <h2 className="text-xl font-semibold text-slate-300">Select a lead to start</h2>
              <p className="text-sm mt-1">Choose a contact from the left panel</p>
            </div>
          )}
        </div>
      ) : (
        // 🔥 LOAD CAMPAIGN MODULE FOR 'CALL_CAMPAIGN' MODE WITH FILTERS 🔥
        <div className="flex-1 bg-[#1a2430] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <CallCampaignModule 
                loggedInUser={user} 
                filters={{ selectedBusiness, selectedBatch }} 
                setActiveMode={setActiveMode}
                setSelectedLead={setSelectedLead}
            />
        </div>
      )}
    </div>
  );
}