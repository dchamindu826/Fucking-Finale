import React, { useState, useEffect } from 'react';
import ContactSidebar from '../../components/CoordinatorCRM/ContactSidebar';
import ChatArea from '../../components/CoordinatorCRM/ChatArea';
import RightSidePanel from '../../components/CoordinatorCRM/RightSidePanel';
import CallCampaignModule from '../../components/CoordinatorCRM/CallCampaignModule';
import { FaWhatsapp, FaHeadset, FaFilter, FaChartBar, FaRobot, FaPowerOff } from 'react-icons/fa';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

export default function CoordinatorDashboard() {
  const [user, setUser] = useState(null);
  const [activeMode, setActiveMode] = useState('CRM'); 
  const [selectedLead, setSelectedLead] = useState(null);
  
  const [businesses, setBusinesses] = useState([]);
  const [batches, setBatches] = useState([]);
  
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');

  const [isFollowUpOn, setIsFollowUpOn] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch(e) {}
    } else {
      setUser({ role: 'SYSTEM_ADMIN' }); 
    }
    fetchBusinessesAndBatches();
    fetchFollowUpStatus();
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
      
      // 🔥 FIX: Auto-select eka ain kala. Dan user ma business eka select karanna ona 🔥

    } catch (err) { console.error("Error fetching dropdown data:", err); }
  };

  const fetchFollowUpStatus = async () => {
    try {
      const res = await axios.get('/coordinator-crm/followup-status');
      setIsFollowUpOn(res.data.isOn);
    } catch (error) { console.error("Failed to load follow-up status"); }
  };

  const handleToggleFollowUp = async () => {
    const newStatus = !isFollowUpOn;
    setIsFollowUpOn(newStatus);
    try {
      await axios.post('/coordinator-crm/toggle-followup', { isOn: newStatus });
      if (newStatus) toast.success("Auto Follow-Up Engine STARTED!", { icon: '🚀' });
      else toast.error("Auto Follow-Up Engine STOPPED!", { icon: '🛑' });
    } catch (error) {
      setIsFollowUpOn(!newStatus); 
      toast.error("Failed to update status");
    }
  };

  const rawRole = user?.role || JSON.parse(localStorage.getItem('user'))?.role || '';
  const userRole = rawRole.toUpperCase().replace(/ /g, '_'); 
  const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(userRole);
  const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);

  const displayBatches = selectedBusiness 
    ? batches.filter(b => b.businessId === parseInt(selectedBusiness))
    : batches;

  // 🔥 FIX: Business eka select nokara data penna bari wenna constraint ekak damma 🔥
  const needsToSelectBusiness = (isAdmin || isManager) && !selectedBusiness;

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in-up text-slate-300">
      
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-[#23303f] p-3 rounded-2xl shadow-md border border-white/5">
        
        <div className="flex gap-2 p-1 bg-[#1a2430] rounded-full border border-white/5 w-full xl:w-auto overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveMode('CRM')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all duration-300 whitespace-nowrap ${
              activeMode === 'CRM' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            <FaWhatsapp /> Free Seminar CRM
          </button>
          
          <button
            onClick={() => setActiveMode('CALL_CAMPAIGN')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all duration-300 whitespace-nowrap ${
              activeMode === 'CALL_CAMPAIGN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            {(isAdmin || isManager) ? <><FaChartBar /> Campaign Progress</> : <><FaHeadset /> Call Campaign</>}
          </button>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto">
          
          {(isAdmin || isManager) && (
            <button 
              onClick={handleToggleFollowUp}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-md border whitespace-nowrap ${
                isFollowUpOn 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30' 
                  : 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'
              }`}
            >
              {isFollowUpOn ? <FaRobot className="animate-pulse" /> : <FaPowerOff />}
              {isFollowUpOn ? 'FOLLOW-UP: ON' : 'FOLLOW-UP: OFF'}
            </button>
          )}

          <div className="w-px h-6 bg-slate-600 mx-1 hidden xl:block"></div>

          {(isAdmin || isManager) && (
            <div className="flex items-center gap-3">
              <FaFilter className="text-slate-500 shrink-0" />
              {isAdmin && (
                <select 
                  value={selectedBusiness}
                  onChange={(e) => { setSelectedBusiness(e.target.value); setSelectedBatch(''); }}
                  className="bg-[#1a2430] border border-white/10 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-600"
                >
                  <option value="">Select Business</option>
                  {businesses.map(biz => <option key={biz.id} value={biz.id}>{biz.name}</option>)}
                </select>
              )}
              <select 
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="bg-[#1a2430] border border-white/10 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-600"
              >
                <option value="">Select Batch</option>
                {displayBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {needsToSelectBusiness ? (
        <div className="flex-1 bg-[#1a2430] rounded-2xl flex flex-col items-center justify-center text-slate-500 shadow-xl border border-white/5 animate-fade-in-up">
          <FaFilter className="text-6xl text-slate-600 mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-slate-300">Select a Business to Start</h2>
          <p className="text-sm mt-1">Please select a business from the top dropdown filter to load the data.</p>
        </div>
      ) : activeMode === 'CRM' ? (
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