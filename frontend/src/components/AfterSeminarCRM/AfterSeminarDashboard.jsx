import React, { useState, useEffect } from 'react';
import { FaWhatsapp, FaHeadset, FaFilter, FaChartBar, FaRobot, FaPowerOff } from 'react-icons/fa';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

import AfterSeminarContactSidebar from './AfterSeminarContactSidebar';
import AfterSeminarChatArea from './AfterSeminarChatArea';
import AfterSeminarRightPanel from './AfterSeminarRightPanel';
import AfterSeminarStaffExecution from './AfterSeminarStaffExecution';
import AfterSeminarManagerCampaignStats from './AfterSeminarManagerCampaignStats'; 

export default function AfterSeminarDashboard() {
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
    let parsedUser = { role: 'SYSTEM_ADMIN' };

    if (storedUser) {
      try { parsedUser = JSON.parse(storedUser); setUser(parsedUser); } catch(e) {}
    } else setUser(parsedUser); 

    const userRole = (parsedUser.role || '').toUpperCase().replace(/ /g, '_');
    const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(userRole);

    if (!isAdmin && parsedUser.businessId) {
        setSelectedBusiness(String(parsedUser.businessId));
    }
    fetchBusinessesAndBatches();
  }, []);

  useEffect(() => {
    if(selectedBusiness) fetchFollowUpStatus(selectedBusiness);
    else setIsFollowUpOn(false);
  }, [selectedBusiness]);

  const fetchBusinessesAndBatches = async () => {
    try {
      const res = await axios.get('/admin/manager/batches-full');
      const allBatches = res.data || [];
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
    } catch (err) { console.error("Error fetching batches:", err); }
  };

  const fetchFollowUpStatus = async (bizId) => {
    try {
      const res = await axios.get(`/after-seminar-crm/followup-status?businessId=${bizId}`);
      setIsFollowUpOn(res.data.isOn);
    } catch (error) { console.error("Failed to load status"); }
  };

  const handleToggleFollowUp = async () => {
    if(!selectedBusiness) return toast.error("Please select a business first.");
    const newStatus = !isFollowUpOn;
    setIsFollowUpOn(newStatus);
    try {
      await axios.post('/after-seminar-crm/toggle-followup', { businessId: selectedBusiness, isOn: newStatus });
      if (newStatus) toast.success("Auto Follow-Up STARTED!", { icon: '🚀' });
      else toast.error("Auto Follow-Up STOPPED!", { icon: '🛑' });
    } catch (error) {
      setIsFollowUpOn(!newStatus); 
      toast.error("Failed to update");
    }
  };

  const rawRole = user?.role || JSON.parse(localStorage.getItem('user'))?.role || '';
  const userRole = rawRole.toUpperCase().replace(/ /g, '_'); 
  const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(userRole);
  const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);

  // 🔥 BATCH FILTER DEBUGGING 🔥
  console.log("=== BATCH FILTER DEBUG ===");
  console.log("User Data:", user);
  console.log("Is Admin?:", isAdmin);
  console.log("Selected Business State:", selectedBusiness);
  console.log("Total Batches from DB:", batches.length);
  
// 🔥 BATCH FILTER LOGIC (100% FIXED & BULLETPROOF) 🔥
// 🔥 BATCH FILTER LOGIC (100% FIXED FOR COORDINATORS) 🔥
  const displayBatches = batches.filter(b => {
      if (isAdmin && !selectedBusiness) return true; 
      if (isAdmin && selectedBusiness) return String(b.businessId) === String(selectedBusiness);
      
      const uBizId = String(user?.businessId || selectedBusiness || '').trim();
      const uBizName = String(user?.businessType || '').toLowerCase().trim();
      
      const batchBizId = String(b.businessId).trim();
      const batchBizName = String(b.business?.name || '').toLowerCase().trim();
      
      // Strict Match
      if (uBizId !== '' && batchBizId === uBizId) return true;
      if (uBizName !== '' && batchBizName === uBizName) return true;
      
      // Fuzzy Match (Nam deke kotasak hari thiyenawada balanawa. Eg: "art" matches "art class")
      if (uBizName !== '' && batchBizName.includes(uBizName)) return true;
      if (uBizName !== '' && uBizName.includes(batchBizName)) return true;

      return false;
  });

  console.log("Final Batches that will be shown in Dropdown:", displayBatches.length);
  console.log("==========================");

  const activeBusinessId = isAdmin ? selectedBusiness : (user?.businessId || selectedBusiness);
  const needsToSelectBusiness = isAdmin && !selectedBusiness;

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in-up text-slate-300">
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-[#23303f] p-3 rounded-2xl shadow-md border border-white/5">
        <div className="flex gap-2 p-1 bg-[#1a2430] rounded-full border border-white/5 w-full xl:w-auto overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveMode('CRM')} className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all duration-300 whitespace-nowrap ${activeMode === 'CRM' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5'}`}><FaWhatsapp /> After Seminar CRM</button>
          <button onClick={() => setActiveMode('CALL_CAMPAIGN')} className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all duration-300 whitespace-nowrap ${activeMode === 'CALL_CAMPAIGN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5'}`}>
            {(isAdmin || isManager) ? <><FaChartBar /> Campaign Progress</> : <><FaHeadset /> Call Campaign</>}
          </button>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto">
          {(isAdmin || isManager) && (
            <button onClick={handleToggleFollowUp} disabled={needsToSelectBusiness} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-md border whitespace-nowrap ${isFollowUpOn ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'} ${needsToSelectBusiness ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isFollowUpOn ? <FaRobot className="animate-pulse" /> : <FaPowerOff />}
              {isFollowUpOn ? 'FOLLOW-UP: ON' : 'FOLLOW-UP: OFF'}
            </button>
          )}

          <div className="w-px h-6 bg-slate-600 mx-1 hidden xl:block"></div>

          <div className="flex items-center gap-3">
            <FaFilter className="text-slate-500 shrink-0" />
            {isAdmin && (
              <select value={selectedBusiness} onChange={(e) => { setSelectedBusiness(e.target.value); setSelectedBatch(''); }} className="bg-[#1a2430] border border-white/10 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-600">
                <option value="">Select Business</option>
                {businesses.map(biz => <option key={biz.id} value={biz.id}>{biz.name}</option>)}
              </select>
            )}

            <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} className="bg-[#1a2430] border border-white/10 text-slate-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-600">
              <option value="">Select Batch (All)</option>
              {displayBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {needsToSelectBusiness ? (
        <div className="flex-1 bg-[#1a2430] rounded-2xl flex flex-col items-center justify-center text-slate-500 shadow-xl border border-white/5 animate-fade-in-up">
          <FaFilter className="text-6xl text-slate-600 mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-slate-300">Select a Business to Start</h2>
        </div>
      ) : activeMode === 'CRM' ? (
        <div className="flex-1 flex gap-4 h-[calc(100%-6rem)] overflow-hidden">
          <AfterSeminarContactSidebar activeMode={activeMode} selectedLead={selectedLead} setSelectedLead={setSelectedLead} filters={{ selectedBusiness: activeBusinessId, selectedBatch }} />
          {selectedLead ? (
            <><AfterSeminarChatArea selectedLead={selectedLead} /><AfterSeminarRightPanel selectedLead={selectedLead} activeMode={activeMode} /></>
          ) : (
            <div className="flex-1 bg-[#23303f] rounded-2xl flex flex-col items-center justify-center text-slate-500 shadow-xl border border-white/5">
              <FaWhatsapp className="text-6xl text-slate-600 mb-4 opacity-50" />
              <h2 className="text-xl font-semibold text-slate-300">Select a lead to start</h2>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 bg-[#1a2430] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            {isManager ? (
                <AfterSeminarManagerCampaignStats filters={{ selectedBusiness: activeBusinessId, selectedBatch }} allBatches={displayBatches} />
            ) : (
                <AfterSeminarStaffExecution filters={{ selectedBusiness: activeBusinessId, selectedBatch }} allBatches={displayBatches} setSelectedLead={setSelectedLead} />
            )}
        </div>
      )}
    </div>
  );
}