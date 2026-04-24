import React, { useState, useEffect } from 'react';
import axios from '../../api/axios'; 
import { FaSearch, FaUserCircle, FaUserPlus, FaFileImport, FaTimes, FaCheckSquare, FaEnvelopeOpenText, FaEnvelope, FaUserMinus } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function ContactSidebar({ activeMode, selectedLead, setSelectedLead, filters }) {
  // 🔥 ROBUST ROLE CHECKER 🔥
  const rawRole = JSON.parse(localStorage.getItem('user'))?.role || '';
  const userRole = rawRole.toUpperCase().replace(' ', '_');
  const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);

  const [activeTab, setActiveTab] = useState('NEW'); 
  const [leads, setLeads] = useState([]);
  const [tabCounts, setTabCounts] = useState({ NEW: 0, IMPORTED: 0, ASSIGNED: 0, ALL: 0 });
  const [loading, setLoading] = useState(false);
  const [coordinators, setCoordinators] = useState([]);
  
  const [checkedLeads, setCheckedLeads] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const [staffFilter, setStaffFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [autoAssignData, setAutoAssignData] = useState([]);
  const [masterToggle, setMasterToggle] = useState(true);
  const [csvFile, setCsvFile] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeads = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/coordinator-crm/leads`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
          tab: activeTab, 
          campaignType: 'FREE_SEMINAR', 
          staffPhase: phaseFilter, 
          status: statusFilter, 
          staffId: staffFilter
        }
      });
      setLeads(response.data.leads || []);
      setTabCounts(response.data.counts || {});
    } catch (error) { 
        if(showLoading) toast.error("Failed to load leads"); 
    }
    if (showLoading) setLoading(false);
  };

  const fetchCoordinatorsAndQuotas = async () => {
    try {
      const [staffRes, quotaRes] = await Promise.all([ axios.get('/admin/staff'), axios.get('/coordinator-crm/leads/auto-assign-quotas') ]);
      
      const coords = staffRes.data.filter(s => s.role === 'Coordinator' || s.role === 'CALLER');
      setCoordinators(coords);

      const merged = coords.map(c => {
        const q = quotaRes.data.find(x => x.staffId === c.id);
        return { staffId: c.id, name: `${c.firstName} (${c.role})`, quotaAmount: q ? q.quotaAmount : 0, isActive: q ? q.isActive : false };
      });
      setAutoAssignData(merged);
    } catch (error) { console.error("Data load error", error); }
  };

  useEffect(() => { fetchCoordinatorsAndQuotas(); }, []);

  useEffect(() => { 
      fetchLeads(true); 
      setCheckedLeads([]); 
      const interval = setInterval(() => { fetchLeads(false); }, 10000);
      return () => clearInterval(interval);
  }, [activeTab, staffFilter, phaseFilter, statusFilter]);

  const handleSelectAll = () => {
    if (checkedLeads.length === leads.length) setCheckedLeads([]); else setCheckedLeads(leads.map(l => l.id));
  };

  const handleBulkAction = async (action, assignStaffId = null) => {
    if (checkedLeads.length === 0) return;
    try {
      await axios.post('/coordinator-crm/leads/bulk-action', { action, leadIds: checkedLeads, staffId: assignStaffId });
      toast.success("Action applied successfully!");
      setCheckedLeads([]); fetchLeads(true);
    } catch (e) { toast.error("Action failed"); }
  };

  const handleAssignSubmit = async (e, type) => {
    e.preventDefault();
    try {
      if (type === 'bulk') {
        await axios.post('/coordinator-crm/leads/assign', { type: 'bulk', count: e.target.count.value, sort: e.target.sort.value, staffId: e.target.staffId.value });
      } else {
        await axios.post('/coordinator-crm/leads/assign', { type: 'auto', autoAssignConfig: autoAssignData });
      }
      toast.success("Assignment rules saved!");
      setShowAssignModal(false); fetchLeads(true);
    } catch (error) { toast.error(error.response?.data?.error || "Assignment Failed"); }
  };

  const handleBulkImport = () => {
    if (!csvFile) return toast.error("Please select a CSV file first!");
    const reader = new FileReader();
    reader.onload = async (evt) => {
        const text = evt.target.result;
        const rows = text.split('\n');
        let leadsList = [];
        rows.forEach(row => {
            const cols = row.split(',');
            if (cols[0] && cols[0].trim() !== '') leadsList.push({ number: cols[0].trim(), name: cols[1] ? cols[1].trim() : '' });
        });
        if (leadsList.length === 0) return toast.error("No valid data found in CSV");
        try {
            await axios.post('/coordinator-crm/leads/import', { isBulk: true, leadsList });
            toast.success(`${leadsList.length} Leads Imported!`);
            setShowImportModal(false); setCsvFile(null); fetchLeads(true);
        } catch (error) { toast.error("Bulk import failed!"); }
    };
    reader.readAsText(csvFile);
  };

  const filteredLeads = leads.filter(lead => {
      const searchLower = searchQuery.toLowerCase();
      return lead.phone.includes(searchLower) || (lead.name && lead.name.toLowerCase().includes(searchLower));
  });

  const tabs = [
    { id: 'NEW', label: 'New', count: tabCounts.NEW },
    { id: 'IMPORTED', label: 'Import', count: tabCounts.IMPORTED },
    { id: 'ASSIGNED', label: 'Assigned', count: tabCounts.ASSIGNED },
    { id: 'ALL', label: 'All', count: tabCounts.ALL }
  ];

  return (
    <div className="w-[350px] xl:w-[400px] bg-[#1a2430] rounded-2xl flex flex-col overflow-hidden shrink-0 border border-white/10 shadow-xl relative">
      {checkedLeads.length > 0 ? (
        <div className="p-4 bg-emerald-900/90 border-b border-emerald-500/50 flex flex-col gap-3">
          <div className="flex justify-between items-center text-white">
            <span className="font-bold">{checkedLeads.length} Selected</span>
            <button onClick={() => setCheckedLeads([])} className="text-white/60 hover:text-white"><FaTimes/></button>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={handleSelectAll} title="Select All" className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"><FaCheckSquare/></button>
             <button onClick={() => handleBulkAction('MARK_READ')} title="Mark Read" className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"><FaEnvelopeOpenText/></button>
             <button onClick={() => handleBulkAction('MARK_UNREAD')} title="Mark Unread" className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"><FaEnvelope/></button>
             {isManager && <button onClick={() => handleBulkAction('UNASSIGN')} title="Unassign Leads" className="p-2 bg-red-500/20 hover:bg-red-500 rounded-lg text-red-300 hover:text-white"><FaUserMinus/></button>}
             {isManager && (
                <select onChange={(e) => handleBulkAction('ASSIGN', e.target.value)} className="flex-1 bg-white/10 border-none text-white text-xs font-bold rounded-lg p-2 outline-none">
                  <option value="">Assign To...</option>
                  {coordinators.map(c => <option key={c.id} value={c.id} className="text-black">{c.firstName} ({c.role === 'CALLER' ? 'Team' : 'Staff'})</option>)}
                </select>
             )}
          </div>
        </div>
      ) : (
        <div className="p-5 bg-[#121a24] border-b border-white/5">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-black text-slate-200 tracking-wider uppercase">Contacts</h3>
            <div className="flex gap-2">
              <button onClick={() => setShowImportModal(true)} className="p-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-500/30 transition-all"><FaFileImport size={16}/></button>
              {isManager && <button onClick={() => setShowAssignModal(true)} className="p-2.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-500/30 transition-all"><FaUserPlus size={16}/></button>}
            </div>
          </div>
          
          <div className="relative mb-4">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by number or name..." 
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-base text-slate-200 focus:outline-none focus:border-emerald-600 placeholder-slate-600 shadow-inner" 
            />
          </div>
          
          <div className="flex justify-between items-center bg-[#0f172a] p-1 rounded-xl border border-slate-800">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex-1 py-2 text-[11px] font-bold tracking-widest uppercase rounded-lg transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                {tab.label} {tab.count > 0 && <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{tab.count}</span>}
              </button>
            ))}
          </div>

          {activeTab === 'ASSIGNED' && (
            <div className="flex gap-2 mt-4">
              <select onChange={e=>setStaffFilter(e.target.value)} className="w-1/3 bg-[#0f172a] text-slate-300 text-[10px] font-bold uppercase rounded-lg px-2 py-2 border border-slate-700 outline-none">
                <option value="">All Staff</option>
                {coordinators.map(c => <option key={c.id} value={c.id}>{c.firstName}</option>)}
              </select>
              
              <select onChange={e=>setPhaseFilter(e.target.value)} className="flex-1 bg-[#0f172a] text-slate-300 text-[10px] font-bold uppercase rounded-lg px-2 py-2 border border-slate-700 outline-none">
                <option value="">Phases</option>
                <option value="1">Phase 1</option>
                <option value="2">Phase 2</option>
                <option value="3">Phase 3</option>
              </select>
              <select onChange={e=>setStatusFilter(e.target.value)} className="flex-1 bg-[#0f172a] text-slate-300 text-[10px] font-bold uppercase rounded-lg px-2 py-2 border border-slate-700 outline-none">
                <option value="">Status</option>
                <option value="pending">Pending</option>
                <option value="answered">Answered</option>
                <option value="no_answer">No Answer</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* LEAD LIST */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-[#1a2430]">
        {loading && leads.length === 0 ? ( <div className="flex justify-center mt-10"><div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div></div> ) 
        : filteredLeads.length === 0 ? ( <div className="text-center text-slate-600 text-sm mt-10 font-medium">No contacts found.</div> ) : (
          filteredLeads.map(lead => (
            <div key={lead.id} className={`p-3 rounded-2xl mb-2 transition-all flex gap-3 items-center border ${selectedLead?.id === lead.id ? 'bg-[#0f172a] border-emerald-600/50 shadow-md' : 'bg-[#121a24] border-transparent hover:border-white/10'}`}>
              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                 <input type="checkbox" checked={checkedLeads.includes(lead.id)} onChange={(e) => { if (e.target.checked) setCheckedLeads([...checkedLeads, lead.id]); else setCheckedLeads(checkedLeads.filter(id => id !== lead.id)); }} className="w-4 h-4 accent-emerald-600 rounded cursor-pointer" />
              </div>

              <div className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                <FaUserCircle className="text-3xl text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-bold text-[16px] text-slate-200">{lead.phone}</h4>
                    <div className="text-right">
                       <span className="text-[10px] text-emerald-500 font-bold block">{new Date(lead.updatedAt).toLocaleDateString('en-GB')}</span>
                       <span className="text-[9px] text-slate-500 block">{new Date(lead.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  
                  {lead.assignedUser && (
                     <div className="text-[10px] text-blue-400 font-semibold mb-1">👤 {lead.assignedUser.firstName} {lead.assignedUser.lastName}</div>
                  )}

                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[11px] font-medium text-slate-500 truncate w-[70%]">{lead.lastMessage || 'No messages'}</p>
                    {lead.unreadCount > 0 && <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 shadow-lg">{lead.unreadCount} NEW</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ASSIGN MODAL */}
      {showAssignModal && isManager && (
         <div className="absolute inset-0 z-50 bg-[#0f172a]/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1a2430] border border-slate-700 rounded-3xl p-5 w-[90%] shadow-2xl max-h-[90%] overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaUserPlus className="text-emerald-500"/> Assign Leads</h3>
                  <button onClick={()=>setShowAssignModal(false)} className="text-slate-500 hover:text-white"><FaTimes/></button>
               </div>
               
               <form onSubmit={(e) => handleAssignSubmit(e, 'bulk')} className="bg-[#121a24] p-4 rounded-xl border border-slate-800 mb-4">
                  <h4 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-widest">Manual Assign</h4>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                     <select name="sort" required className="bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 text-xs outline-none">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                     </select>
                     <input name="count" type="number" placeholder="Lead Count" required className="bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 text-xs outline-none" />
                  </div>
                  <select name="staffId" required className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-3 text-xs outline-none">
                     <option value="">Select Coordinator / Team...</option>
                     {coordinators.map(c => <option key={c.id} value={c.id}>{c.firstName} ({c.role === 'CALLER' ? 'Team' : 'Staff'})</option>)}
                  </select>
                  <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-widest">Assign Selected Leads</button>
               </form>

               <form onSubmit={(e) => handleAssignSubmit(e, 'auto')} className="bg-[#121a24] p-4 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest">Auto Assign</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={masterToggle} onChange={()=>setMasterToggle(!masterToggle)} />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="space-y-2 mb-4 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                     {autoAssignData.map((staff, idx) => (
                        <div key={staff.staffId} className="flex items-center justify-between bg-[#1a2430] p-2 rounded-lg border border-slate-700">
                           <div className="flex items-center gap-2">
                              <input type="checkbox" checked={staff.isActive} onChange={(e) => {
                                    let newData = [...autoAssignData]; newData[idx].isActive = e.target.checked; setAutoAssignData(newData);
                              }} className="accent-blue-600"/>
                              <span className="text-xs font-bold text-slate-300 truncate w-32">{staff.name}</span>
                           </div>
                           <input type="number" value={staff.quotaAmount} onChange={(e) => {
                                 let newData = [...autoAssignData]; newData[idx].quotaAmount = parseInt(e.target.value) || 0; setAutoAssignData(newData);
                           }} className="w-16 bg-[#0f172a] border border-slate-600 text-center text-white rounded p-1 text-xs outline-none" placeholder="Quota"/>
                        </div>
                     ))}
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-widest">Save Settings</button>
               </form>
            </div>
         </div>
      )}

      {/* IMPORT MODAL WITH CSV UPLOAD */}
      {showImportModal && (
         <div className="absolute inset-0 z-50 bg-[#0f172a]/90 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-[#1a2430] border border-slate-700 rounded-2xl p-5 w-full shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaFileImport className="text-blue-500"/> Import Leads</h3>
                  <button onClick={()=>setShowImportModal(false)} className="text-slate-500 hover:text-white"><FaTimes/></button>
               </div>
               
               <div className="bg-[#121a24] p-4 rounded-xl border border-slate-800 mb-3">
                  <h4 className="text-sm font-bold text-blue-400 mb-1">Bulk Import (CSV)</h4>
                  <p className="text-[10px] text-slate-500 mb-3">Upload a CSV file. Format: Column 1 = Phone, Column 2 = Name (Optional).</p>
                  <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} className="w-full text-slate-400 text-xs mb-3 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-900 file:text-blue-400" />
                  <button onClick={handleBulkImport} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm">Upload & Import</button>
               </div>

               <div className="bg-[#121a24] p-4 rounded-xl border border-slate-800">
                  <h4 className="text-sm font-bold text-emerald-400 mb-3">Single Import</h4>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    await axios.post('/coordinator-crm/leads/import', { number: e.target.phone.value, name: e.target.name.value, isBulk: false });
                    toast.success("Imported successfully");
                    setShowImportModal(false);
                    fetchLeads(true);
                  }}>
                    <input name="phone" type="text" placeholder="Phone Number" required className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-2 text-sm outline-none" />
                    <input name="name" type="text" placeholder="Name (Optional)" className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-3 text-sm outline-none" />
                    <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm">Import Single</button>
                  </form>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}