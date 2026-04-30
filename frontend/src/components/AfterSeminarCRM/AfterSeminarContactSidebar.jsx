import React, { useState, useEffect } from 'react';
import axios from '../../api/axios'; 
import { FaSearch, FaUserCircle, FaUserPlus, FaFileImport, FaTimes, FaCheckSquare, FaEnvelopeOpenText, FaEnvelope, FaUserMinus, FaLock, FaBullhorn, FaCommentDots } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function AfterSeminarContactSidebar({ activeMode, selectedLead, setSelectedLead, filters }) {
  const rawRole = JSON.parse(localStorage.getItem('user'))?.role || '';
  const userRole = rawRole.toUpperCase().replace(' ', '_');
  const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);
  const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;

  // 🔥 NEW tab eka default. Eka athule sub-tabs 2i
  const [activeTab, setActiveTab] = useState(isManager ? 'NEW_INQ' : 'ASSIGNED');
  const [newSubTab, setNewSubTab] = useState('OPEN_SEMINAR'); 
  
  const [leads, setLeads] = useState([]);
  const [tabCounts, setTabCounts] = useState({ NEW: 0, NEW_INQ: 0, ASSIGNED: 0, ALL: 0, OPEN_SEMINAR: 0 });
  const [unreadCounts, setUnreadCounts] = useState({ NEW: 0, NEW_INQ: 0, ASSIGNED: 0, ALL: 0, OPEN_SEMINAR: 0 });
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false); 
  const [coordinators, setCoordinators] = useState([]);
  
  const [checkedLeads, setCheckedLeads] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  const [staffFilter, setStaffFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 🔥 Aluth state eka sub-tabs wala hariyama counts hadaganna 🔥
  const [subTabStats, setSubTabStats] = useState({
      OPEN_SEMINAR: { total: 0, unread: 0 },
      NEW_INQ: { total: 0, unread: 0 }
  });

  const fetchLeads = async (showLoading = true) => {
    if (isManager && (!filters || !filters.selectedBusiness)) {
        setLeads([]);
        setTabCounts({ NEW: 0, NEW_INQ: 0, ASSIGNED: 0, ALL: 0, OPEN_SEMINAR: 0 });
        setUnreadCounts({ NEW: 0, NEW_INQ: 0, ASSIGNED: 0, ALL: 0, OPEN_SEMINAR: 0 });
        setSubTabStats({ OPEN_SEMINAR: { total: 0, unread: 0 }, NEW_INQ: { total: 0, unread: 0 } });
        setLoading(false);
        return;
    }

    if (showLoading) setLoading(true);
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/after-seminar-crm/leads`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { 
                tab: activeTab === 'IMPORTED' ? 'NEW' : activeTab, 
                paymentGroup: groupFilter,
                status: statusFilter, 
                staffId: staffFilter,
                loggedUserId: currentUserId, 
                loggedUserRole: rawRole,
                businessId: isManager ? (filters?.selectedBusiness || '') : '', 
                batchId: isManager ? (filters?.selectedBatch || '') : ''        
            }
        });

      let fetchedLeads = response.data.leads || [];
      
      // 🔥 EXACT FILTERING & DYNAMIC COUNTS 🔥
      if (activeTab === 'NEW' || activeTab === 'NEW_INQ') { 
          // Note: kalin eke activeTab === 'NEW' kiyala thibbe, mama meka safe side ekata adjust kara
          const osLeads = fetchedLeads.filter(l => l.inquiryType === 'OPEN_SEMINAR' && l.assignedTo === null);
          const niLeads = fetchedLeads.filter(l => l.inquiryType === 'NEW_INQ' && l.assignedTo === null);

          // Sub tabs walata exact counts denawa
          setSubTabStats({
              OPEN_SEMINAR: { total: osLeads.length, unread: osLeads.filter(l => l.unreadCount > 0).length },
              NEW_INQ: { total: niLeads.length, unread: niLeads.filter(l => l.unreadCount > 0).length }
          });

          // Dan display karanna ona eka filter karanawa
          fetchedLeads = fetchedLeads.filter(l => l.inquiryType === newSubTab && l.assignedTo === null);
      } else if (activeTab === 'IMPORTED') {
          if (!isManager) {
              fetchedLeads = fetchedLeads.filter(l => l.assignedTo === parseInt(currentUserId));
          } else {
              fetchedLeads = fetchedLeads.filter(l => l.assignedTo === null && l.inquiryType === 'NORMAL');
          }
      } else if (activeTab === 'ASSIGNED') {
          fetchedLeads = fetchedLeads.filter(l => l.assignedTo !== null);
      }
      
      setLeads(fetchedLeads);
      setTabCounts(response.data.counts || {});
      setUnreadCounts(response.data.unreadCounts || { NEW: 0, NEW_INQ: 0, ASSIGNED: 0, ALL: 0, OPEN_SEMINAR: 0 });
      setTotalUnread(response.data.totalUnread || 0);
    } catch (error) {
        if(showLoading) toast.error("Failed to load leads"); 
    }
    if (showLoading) setLoading(false);
  };

  const fetchCoordinatorsAndQuotas = async () => {
    if (isManager && (!filters || !filters.selectedBusiness)) {
        setCoordinators([]);
        return;
    }
    try {
      const token = localStorage.getItem('token');
      const [staffRes, bizRes] = await Promise.all([ 
          axios.get('/admin/staff', { headers: { Authorization: `Bearer ${token}` } }), 
          axios.get('/admin/businesses', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      let coords = staffRes.data.filter(s => s.role && ['COORDINATOR', 'CALLER', 'STAFF', 'MANAGER'].includes(s.role.toUpperCase()));
      if (filters?.selectedBusiness) {
          const selectedBizObj = bizRes.data.find(b => String(b.id) === String(filters.selectedBusiness));
          const bizName = selectedBizObj ? selectedBizObj.name : '';
          coords = coords.filter(c => {
              const cBiz = String(c.businessType || '').toLowerCase().trim();
              if (!cBiz) return false;
              return cBiz === String(filters.selectedBusiness).toLowerCase().trim() || cBiz === String(bizName).toLowerCase().trim() || String(c.businessId) === String(filters.selectedBusiness);
          });
      }
      setCoordinators(coords);
    } catch (error) { console.error("Data load error", error); }
  };

  useEffect(() => { fetchCoordinatorsAndQuotas(); }, [filters?.selectedBusiness, filters?.selectedBatch]);

  useEffect(() => { 
      fetchLeads(true); 
      setCheckedLeads([]); 
      const interval = setInterval(() => { fetchLeads(false); }, 10000);
      return () => clearInterval(interval);
  }, [activeTab, newSubTab, staffFilter, groupFilter, statusFilter, filters?.selectedBusiness, filters?.selectedBatch]);

  const handleSelectAll = () => { if (checkedLeads.length === leads.length) setCheckedLeads([]); else setCheckedLeads(leads.map(l => l.id)); };

  const handleBulkAction = async (action, assignStaffId = null) => {
    if (checkedLeads.length === 0) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/after-seminar-crm/leads/bulk-action', { action, leadIds: checkedLeads, staffId: assignStaffId }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Action applied successfully!");
      setCheckedLeads([]); fetchLeads(true);
    } catch (e) { toast.error("Action failed"); }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/after-seminar-crm/leads/assign', { 
          type: 'bulk', 
          count: e.target.count.value, 
          sort: e.target.sort.value, 
          staffId: e.target.staffId.value,
          batchId: filters?.selectedBatch,
          businessId: filters?.selectedBusiness,
          assignType: e.target.assignType.value
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Leads Assigned!");
      setShowAssignModal(false); fetchLeads(true);
    } catch (error) { toast.error("Assignment Failed"); }
  };

  const handleLeadClick = async (lead) => {
      setSelectedLead(lead);
      if (lead.unreadCount > 0) {
          setLeads(prevLeads => prevLeads.map(l => l.id === lead.id ? { ...l, unreadCount: 0 } : l));
          try {
              const token = localStorage.getItem('token');
              await axios.post('/after-seminar-crm/leads/bulk-action', { action: 'MARK_READ', leadIds: [lead.id] }, { headers: { Authorization: `Bearer ${token}` } });
          } catch (e) {}
      }
  };

  const filteredLeads = leads.filter(lead => {
      const searchLower = searchQuery.toLowerCase();
      return lead.phone.includes(searchLower) || (lead.name && lead.name.toLowerCase().includes(searchLower));
  });

  const getAssignedStats = () => {
      if (activeTab === 'ASSIGNED' && staffFilter) {
          return {
              total: leads.length,
              unread: leads.filter(l => l.unreadCount > 0).length
          };
      }
      return { total: tabCounts.ASSIGNED, unread: unreadCounts.ASSIGNED };
  };

  const assignedStats = getAssignedStats();
  
  // 🔥 NEW tab eke main count eka exact sub-tabs dekema sum eka widihata set wenawa 🔥
  const totalNewCount = subTabStats.OPEN_SEMINAR.total + subTabStats.NEW_INQ.total;
  const totalNewUnread = subTabStats.OPEN_SEMINAR.unread + subTabStats.NEW_INQ.unread;

  const tabs = [
    { id: 'NEW_INQ', label: 'New', total: totalNewCount, unread: totalNewUnread }, // Meke ID eka NEW_INQ thibbe, man meka ehemma thibba
    { id: 'IMPORTED', label: 'Imported', total: tabCounts.NEW, unread: unreadCounts.NEW },
    { id: 'ASSIGNED', label: 'Assigned', total: assignedStats.total, unread: assignedStats.unread },
    { id: 'ALL', label: 'All', total: tabCounts.ALL, unread: unreadCounts.ALL }
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
            <h3 className="text-lg font-black text-slate-200 tracking-wider uppercase flex items-center gap-2">Contacts</h3>
            <div className="flex gap-2">
              {isManager && (
                  <>
                    <button onClick={() => toast("Import logic is ready in admin panel!")} className="p-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-500/30 transition-all"><FaFileImport size={16}/></button>
                    <button onClick={() => setShowAssignModal(true)} className="p-2.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-500/30 transition-all"><FaUserPlus size={16}/></button>
                  </>
              )}
            </div>
          </div>
          
          <div className="relative mb-4">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by number or name..." className="w-full bg-[#0f172a] border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-base text-slate-200 focus:outline-none focus:border-emerald-600 shadow-inner" />
          </div>
          
          <div className="flex justify-between items-center bg-[#0f172a] p-1 rounded-xl border border-slate-800 gap-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                <span className="text-[10px] font-bold tracking-widest uppercase">{tab.label}</span>
                <span className="text-[9px] font-medium opacity-60 mt-0.5">Total: {tab.total || 0}</span>
                {tab.unread > 0 && <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-md">{tab.unread}</span>}
              </button>
            ))}
          </div>

          {/* 🔥 SUB-TABS WITH COUNTS 🔥 */}
          {(activeTab === 'NEW' || activeTab === 'NEW_INQ') && (
             <div className="flex gap-2 mt-3 bg-[#0f172a] p-1.5 rounded-xl border border-slate-800">
                <button 
                  onClick={() => setNewSubTab('OPEN_SEMINAR')} 
                  className={`relative flex-1 flex justify-center items-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${newSubTab === 'OPEN_SEMINAR' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  <FaBullhorn size={12}/> Open Sem ({subTabStats.OPEN_SEMINAR.total})
                  {subTabStats.OPEN_SEMINAR.unread > 0 && (
                      <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-md">{subTabStats.OPEN_SEMINAR.unread}</span>
                  )}
                </button>
                <button 
                  onClick={() => setNewSubTab('NEW_INQ')} 
                  className={`relative flex-1 flex justify-center items-center gap-2 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${newSubTab === 'NEW_INQ' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                >
                  <FaCommentDots size={12}/> New Inq ({subTabStats.NEW_INQ.total})
                  {subTabStats.NEW_INQ.unread > 0 && (
                      <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-md">{subTabStats.NEW_INQ.unread}</span>
                  )}
                </button>
             </div>
          )}

          {activeTab === 'ASSIGNED' && (
            <div className="flex gap-2 mt-4">
              <select onChange={e=>setStaffFilter(e.target.value)} className="w-1/3 bg-[#0f172a] text-slate-300 text-[10px] font-bold uppercase rounded-lg px-2 py-2 border border-slate-700 outline-none">
                <option value="">All Staff</option>
                {coordinators.map(c => <option key={c.id} value={c.id}>{c.firstName}</option>)}
              </select>
              <select onChange={e=>setGroupFilter(e.target.value)} className="flex-1 bg-[#0f172a] text-slate-300 text-[10px] font-bold uppercase rounded-lg px-2 py-2 border border-slate-700 outline-none">
                <option value="">Group</option>
                <option value="FULL">Full Payment</option>
                <option value="MONTHLY">Monthly</option>
                <option value="INSTALLMENT">Installment</option>
                <option value="NOT_DECIDED">Not Decided</option>
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

              <div className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer" onClick={() => handleLeadClick(lead)}>
                <FaUserCircle className="text-3xl text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-bold text-[16px] text-slate-200">{lead.phone}</h4>
                    <div className="text-right">
                       <span className="text-[10px] text-emerald-500 font-bold block">{new Date(lead.updatedAt).toLocaleDateString('en-GB')}</span>
                       <span className="text-[9px] text-slate-500 block">{new Date(lead.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                  
                  {lead.inquiryType === 'NEW_INQ' && lead.isLocked && (
                     <div className="text-[9px] text-red-400 font-black mb-1 flex items-center gap-1 bg-red-500/10 w-max px-2 py-0.5 rounded"><FaLock/> 24H LOCKED</div>
                  )}

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
               
               <form onSubmit={handleAssignSubmit} className="bg-[#121a24] p-4 rounded-xl border border-slate-800 mb-4">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                     <select name="assignType" required className="bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 text-xs outline-none col-span-2">
                        <option value="OPEN_SEMINAR">Open Seminar Inquiries</option>
                        <option value="NEW_INQ">Normal Inbox Inquiries</option>
                        <option value="NORMAL">Imported Leads (Open Seminar)</option>
                     </select>
                     <select name="sort" required className="bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 text-xs outline-none">
                        <option value="oldest">Oldest First</option>
                        <option value="newest">Newest First</option>
                     </select>
                     <input name="count" type="number" placeholder="Lead Count" required className="bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 text-xs outline-none" />
                  </div>
                  <select name="staffId" required className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-3 text-xs outline-none">
                     <option value="">Select Coordinator / Team...</option>
                     {coordinators.map(c => <option key={c.id} value={c.id}>{c.firstName} ({c.role === 'CALLER' ? 'Team' : 'Staff'})</option>)}
                  </select>
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-widest transition-colors">Assign Selected Leads</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}