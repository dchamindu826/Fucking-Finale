import React, { useState, useEffect } from 'react';
import axios from '../../api/axios'; 
import { FaSearch, FaUserCircle, FaUserPlus, FaFileImport, FaExchangeAlt, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function ContactSidebar({ activeMode, selectedLead, setSelectedLead, filters }) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coordinators, setCoordinators] = useState([]);

  // Modals State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);

  // Filters specifically for "ASSIGNED" tab
  const [staffFilter, setStaffFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const tabs = [
    { id: 'ALL', label: 'All' },
    { id: 'NEW', label: 'New' },
    { id: 'IMPORTED', label: 'Import' },
    { id: 'ASSIGNED', label: 'Assigned' }
  ];

  // Fetch Leads
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/coordinator-crm/leads`, {
        params: { 
          tab: activeTab, 
          campaignType: 'FREE_SEMINAR',
          businessId: filters?.selectedBusiness || undefined,
          batchId: filters?.selectedBatch || undefined,
          staffPhase: phaseFilter || undefined,
          status: statusFilter || undefined,
          staffId: staffFilter || undefined // Send selected staff ID
        }
      });
      setLeads(response.data);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
    setLoading(false);
  };

  // Fetch Coordinators for Filters & Modals
  const fetchCoordinators = async () => {
    try {
      const res = await axios.get('/admin/staff');
      // Filter only coordinators (You can add business filter here if needed)
      const coords = res.data.filter(s => s.role === 'Coordinator');
      setCoordinators(coords);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  useEffect(() => {
    fetchCoordinators();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [activeTab, activeMode, filters, staffFilter, phaseFilter, statusFilter]);

  return (
    <div className="w-[350px] xl:w-[400px] bg-[#1a2430] rounded-2xl flex flex-col overflow-hidden shrink-0 border border-white/10 shadow-xl relative">
      
      {/* Top Header & Icons */}
      <div className="p-5 bg-[#121a24] border-b border-white/5">
        
        <div className="flex justify-between items-center mb-5">
           <h3 className="text-lg font-black text-slate-200 tracking-wider uppercase">CRM Contacts</h3>
           
           {/* Action Buttons (Icons Only) */}
           <div className="flex gap-2">
              <button 
                 title="Import Leads"
                 onClick={() => setShowImportModal(true)} 
                 className="p-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-500/30 transition-all shadow-sm"
              >
                 <FaFileImport size={16}/>
              </button>
              <button 
                 title="Assign Leads"
                 onClick={() => setShowAssignModal(true)} 
                 className="p-2.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-500/30 transition-all shadow-sm"
              >
                 <FaUserPlus size={16}/>
              </button>
              <button 
                 title="Re-assign Leads"
                 onClick={() => setShowReassignModal(true)} 
                 className="p-2.5 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-lg border border-amber-500/30 transition-all shadow-sm"
              >
                 <FaExchangeAlt size={16}/>
              </button>
           </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by number..." 
            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-base text-slate-200 focus:outline-none focus:border-emerald-600 placeholder-slate-600 shadow-inner"
          />
        </div>

        {/* TABS */}
        <div className="flex justify-between items-center bg-[#0f172a] p-1 rounded-xl border border-slate-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all ${
                activeTab === tab.id 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DYNAMIC ASSIGNED FILTERS */}
        {activeTab === 'ASSIGNED' && (
           <div className="flex gap-2 mt-4">
              <select onChange={e=>setStaffFilter(e.target.value)} className="w-1/3 bg-[#0f172a] text-slate-300 text-[11px] font-bold tracking-wider uppercase rounded-lg px-2 py-2 border border-slate-700 outline-none focus:border-emerald-500">
                 <option value="">All Staff</option>
                 {coordinators.map(c => <option key={c.id} value={c.id}>{c.firstName}</option>)}
              </select>
              <select onChange={e=>setPhaseFilter(e.target.value)} className="w-1/3 bg-[#0f172a] text-slate-300 text-[11px] font-bold tracking-wider uppercase rounded-lg px-2 py-2 border border-slate-700 outline-none focus:border-emerald-500">
                 <option value="">Phases</option>
                 <option value="1">Phase 1</option>
                 <option value="2">Phase 2</option>
                 <option value="3">Phase 3</option>
              </select>
              <select onChange={e=>setStatusFilter(e.target.value)} className="w-1/3 bg-[#0f172a] text-slate-300 text-[11px] font-bold tracking-wider uppercase rounded-lg px-2 py-2 border border-slate-700 outline-none focus:border-emerald-500">
                 <option value="">Status</option>
                 <option value="pending">Pending</option>
                 <option value="answered">Answered</option>
                 <option value="no_answer">No Answer</option>
                 <option value="reject">Reject</option>
              </select>
           </div>
        )}
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-[#1a2430]">
        {loading ? (
          <div className="flex justify-center mt-10"><div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div></div>
        ) : leads.length === 0 ? (
           <div className="text-center text-slate-600 text-sm mt-10 font-medium">No contacts found in this section.</div>
        ) : (
          leads.map(lead => (
            <div 
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className={`p-3.5 rounded-2xl mb-2 cursor-pointer transition-all flex gap-4 items-center border ${
                selectedLead?.id === lead.id 
                  ? 'bg-emerald-900/20 border-emerald-600/50 shadow-md' 
                  : 'bg-[#0f172a]/50 border-transparent hover:bg-[#0f172a]'
              }`}
            >
              <FaUserCircle className="text-[40px] text-slate-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  {/* DISPLAY NUMBER ONLY (Large & Clear) */}
                  <h4 className="font-bold text-[17px] text-slate-200 tracking-widest">{lead.phone}</h4>
                  
                  {/* DATE AND TIME */}
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-semibold text-emerald-500 block">
                      {new Date(lead.updatedAt).toLocaleDateString('en-GB')}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(lead.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-1.5">
                  <p className="text-xs font-medium text-slate-500 truncate w-3/4">
                    {lead.lastMessage || 'No recent messages'}
                  </p>
                  {lead.unreadCount > 0 && (
                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-sm border border-emerald-400">
                      {lead.unreadCount} New
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ======================= MODALS ======================= */}

      {/* 1. ASSIGN MODAL */}
      {showAssignModal && (
         <div className="absolute inset-0 z-50 bg-[#0f172a]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1a2430] border border-slate-700 rounded-2xl p-5 w-full shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaUserPlus className="text-emerald-500"/> Assign Leads</h3>
                  <button onClick={()=>setShowAssignModal(false)} className="text-slate-500 hover:text-white"><FaTimes/></button>
               </div>
               
               <div className="space-y-4">
                  <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                     <h4 className="text-sm font-bold text-emerald-400 mb-3">Bulk Assign</h4>
                     <select className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-2 text-sm outline-none">
                        <option value="">Select Coordinator</option>
                        {coordinators.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                     </select>
                     <input type="number" placeholder="Lead Count (e.g. 50)" className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-2 text-sm outline-none" />
                     <button className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm mt-1">Assign Now</button>
                  </div>

                  <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                     <h4 className="text-sm font-bold text-blue-400 mb-3">Auto Assign</h4>
                     <select className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-2 text-sm outline-none">
                        <option value="">Select Coordinator</option>
                        {coordinators.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                     </select>
                     <input type="number" placeholder="Daily Quota" className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-2 text-sm outline-none" />
                     <button className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm mt-1">Save Configuration</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* 2. IMPORT MODAL */}
      {showImportModal && (
         <div className="absolute inset-0 z-50 bg-[#0f172a]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1a2430] border border-slate-700 rounded-2xl p-5 w-full shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaFileImport className="text-blue-500"/> Import Leads</h3>
                  <button onClick={()=>setShowImportModal(false)} className="text-slate-500 hover:text-white"><FaTimes/></button>
               </div>
               
               <div className="space-y-4">
                  <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                     <h4 className="text-sm font-bold text-blue-400 mb-3">Bulk Import (Excel)</h4>
                     <input type="file" accept=".csv, .xlsx" className="w-full text-slate-400 text-sm mb-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-900 file:text-blue-400 hover:file:bg-blue-800" />
                     <button className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm">Upload & Import</button>
                  </div>

                  <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                     <h4 className="text-sm font-bold text-emerald-400 mb-3">Single Import</h4>
                     <input type="text" placeholder="Phone Number" className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-2 text-sm outline-none" />
                     <input type="text" placeholder="Name (Optional)" className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-3 text-sm outline-none" />
                     <button className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm">Import Single</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* 3. RE-ASSIGN MODAL */}
      {showReassignModal && (
         <div className="absolute inset-0 z-50 bg-[#0f172a]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1a2430] border border-slate-700 rounded-2xl p-5 w-full shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaExchangeAlt className="text-amber-500"/> Re-assign Leads</h3>
                  <button onClick={()=>setShowReassignModal(false)} className="text-slate-500 hover:text-white"><FaTimes/></button>
               </div>
               
               <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                  <h4 className="text-sm font-bold text-amber-400 mb-3">Filter & Move</h4>
                  <select className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-2 text-sm outline-none">
                     <option value="">From Coordinator (Source)</option>
                     {coordinators.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                  <select className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-2 text-sm outline-none">
                     <option value="">Select Phase (Optional)</option>
                     <option value="1">Phase 1 Pending</option>
                     <option value="2">Phase 2 Pending</option>
                  </select>
                  <div className="flex justify-center my-2 text-slate-600"><FaExchangeAlt className="rotate-90" /></div>
                  <select className="w-full bg-[#1a2430] border border-emerald-700/50 text-slate-300 rounded-lg p-2 mb-4 text-sm outline-none focus:border-emerald-500">
                     <option value="">To Coordinator (Destination)</option>
                     {coordinators.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                  </select>
                  <button className="w-full bg-amber-600 text-white font-bold py-2 rounded-lg text-sm">Execute Transfer</button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}