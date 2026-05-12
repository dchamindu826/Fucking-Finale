import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../../api/axios'; 
import { FaSearch, FaUserCircle, FaUserPlus, FaFileImport, FaTimes, FaCheckSquare, FaEnvelopeOpenText, FaEnvelope, FaUserMinus, FaLock, FaBullhorn, FaCommentDots, FaPaperPlane, FaUserCheck, FaHeadset, FaClock } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function AfterSeminarContactSidebar({ activeMode, selectedLead, setSelectedLead, filters, onRedirectToCampaign }) {
  const rawRole = JSON.parse(localStorage.getItem('user'))?.role || '';
  const userRole = rawRole.toUpperCase().replace(' ', '_');
  const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(userRole);
  const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;

  const [activeTab, setActiveTab] = useState(isManager ? 'NEW_INQ' : 'ASSIGNED');
  const [newSubTab, setNewSubTab] = useState('OPEN_SEMINAR'); 
  
  const [leads, setLeads] = useState([]);
  const [tabCounts, setTabCounts] = useState({ NEW: 0, NEW_INQ: 0, ASSIGNED: 0, ALL: 0, OPEN_SEMINAR: 0, IMPORTED: 0 });
  const [unreadCounts, setUnreadCounts] = useState({ NEW: 0, NEW_INQ: 0, ASSIGNED: 0, ALL: 0, OPEN_SEMINAR: 0, IMPORTED: 0 });
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(false); 
  const [coordinators, setCoordinators] = useState([]);
  
  const [checkedLeads, setCheckedLeads] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false); 
  const [csvFile, setCsvFile] = useState(null); 
  
  const [staffFilter, setStaffFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 🔥 LOAD MORE STATE 🔥
  const [visibleCount, setVisibleCount] = useState(50);

  const [subTabStats, setSubTabStats] = useState({
      OPEN_SEMINAR: { total: 0, unread: 0 },
      NEW_INQ: { total: 0, unread: 0 }
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 60000); 
      return () => clearInterval(timer);
  }, []);

  // 🔥 Reset visible count when tab or search changes 🔥
  useEffect(() => {
      setVisibleCount(50);
  }, [activeTab, newSubTab, searchQuery]);

  const fetchLeads = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`/after-seminar-crm/leads`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { 
                tab: (activeTab === 'IMPORTED' || activeTab === 'NEW_INQ') ? 'NEW' : activeTab, 
                paymentGroup: groupFilter,
                status: statusFilter, 
                staffId: staffFilter,
                loggedUserId: currentUserId, 
                loggedUserRole: rawRole,
                businessId: filters?.selectedBusiness || '', 
                batchId: filters?.selectedBatch || ''
            }
        });

      let fetchedLeads = response.data.leads || [];
      
      if (activeTab === 'NEW' || activeTab === 'NEW_INQ') { 
          const osLeads = fetchedLeads.filter(l => l.inquiryType === 'OPEN_SEMINAR' && l.assignedTo === null);
          const niLeads = fetchedLeads.filter(l => l.inquiryType === 'NEW_INQ' && l.assignedTo === null);

          setSubTabStats({
              OPEN_SEMINAR: { total: osLeads.length, unread: osLeads.filter(l => l.unreadCount > 0).length },
              NEW_INQ: { total: niLeads.length, unread: niLeads.filter(l => l.unreadCount > 0).length }
          });

          fetchedLeads = fetchedLeads.filter(l => l.inquiryType === newSubTab && l.assignedTo === null);
      } else if (activeTab === 'IMPORTED') {
          if (!isManager) {
              fetchedLeads = fetchedLeads.filter(l => l.assignedTo === parseInt(currentUserId) && ['import', 'bulk_import'].includes(l.source));
          } else {
              fetchedLeads = fetchedLeads.filter(l => l.assignedTo === null && ['import', 'bulk_import'].includes(l.source));
          }
      } else if (activeTab === 'ASSIGNED') {
          fetchedLeads = fetchedLeads.filter(l => l.assignedTo !== null);
      }
      
      setLeads(fetchedLeads);
      setTabCounts(response.data.counts || {});
      setUnreadCounts(response.data.unreadCounts || { NEW: 0, NEW_INQ: 0, ASSIGNED: 0, ALL: 0, OPEN_SEMINAR: 0, IMPORTED: 0 });
      setTotalUnread(response.data.totalUnread || 0);
    } catch (error) {
        if(showLoading) toast.error("Failed to load leads"); 
    }
    if (showLoading) setLoading(false);
  };

  const fetchCoordinatorsAndQuotas = async () => {
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

  const handleBulkAction = async (action, assignStaffId = null, specificLeads = null) => {
    const leadsToProcess = specificLeads || checkedLeads;
    if (leadsToProcess.length === 0) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/after-seminar-crm/leads/bulk-action', { action, leadIds: leadsToProcess, staffId: assignStaffId }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Action applied successfully!");
      if (!specificLeads) setCheckedLeads([]); 
      fetchLeads(true);
    } catch (e) { toast.error("Action failed"); }
  };

  const handleSendTestFollowUp = async () => {
    if (checkedLeads.length !== 1) return toast.error("Please select exactly ONE lead to test.");
    const loadToast = toast.loading("Sending test follow-up...");
    try {
        const token = localStorage.getItem('token');
        await axios.post('/after-seminar-crm/leads/test-followup', { leadId: checkedLeads[0] }, { headers: { Authorization: `Bearer ${token}` }});
        toast.success("Test message sent successfully!", { id: loadToast });
        setCheckedLeads([]);
    } catch(err) {
        toast.error("Failed to send test message.", { id: loadToast });
    }
  };

  const handleAssignSubmit = async (e, type) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (type === 'bulk') {
        await axios.post('/after-seminar-crm/leads/assign', { 
            type: 'bulk', 
            count: e.target.count.value, 
            sort: e.target.sort.value, 
            staffId: e.target.staffId.value,
            batchId: filters?.selectedBatch,
            businessId: filters?.selectedBusiness,
            assignType: e.target.assignType ? e.target.assignType.value : 'OPEN_SEMINAR' 
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      toast.success("Leads Assigned Successfully!");
      setShowAssignModal(false); fetchLeads(true);
    } catch (error) { 
        toast.error(error.response?.data?.error || "Assignment Failed"); 
    }
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

  // 🔥 OPTIMIZATION: useMemo එකක් දැම්මා search එක fast වෙන්න 🔥
  const filteredLeads = useMemo(() => {
      if (!searchQuery) return leads;
      const q = String(searchQuery).toLowerCase().trim();
      return leads.filter(lead => {
          const phoneMatch = lead.phone ? String(lead.phone).toLowerCase().includes(q) : false;
          const nameMatch = lead.name ? String(lead.name).toLowerCase().includes(q) : false;
          return phoneMatch || nameMatch;
      });
  }, [leads, searchQuery]);

  const getAssignedStats = () => {
      if (activeTab === 'ASSIGNED' && staffFilter) {
          return { total: leads.length, unread: leads.filter(l => l.unreadCount > 0).length };
      }
      return { total: tabCounts.ASSIGNED, unread: unreadCounts.ASSIGNED };
  };

  const assignedStats = getAssignedStats();
  const totalNewCount = subTabStats.OPEN_SEMINAR.total + subTabStats.NEW_INQ.total;
  const totalNewUnread = subTabStats.OPEN_SEMINAR.unread + subTabStats.NEW_INQ.unread;

  const tabs = [
    { id: 'NEW_INQ', label: 'New', total: totalNewCount, unread: totalNewUnread }, 
    { id: 'IMPORTED', label: 'Imported', total: tabCounts.IMPORTED || 0, unread: unreadCounts.IMPORTED || 0 }, 
    { id: 'ASSIGNED', label: 'Assigned', total: assignedStats.total, unread: assignedStats.unread },
    { id: 'ALL', label: 'All', total: tabCounts.ALL, unread: unreadCounts.ALL }
  ];

  // 🔥 LOAD MORE LOGIC 🔥
  const displayedLeads = filteredLeads.slice(0, visibleCount);

  return (
    <div className="w-[350px] xl:w-[400px] bg-[#1a2430] rounded-2xl flex flex-col overflow-hidden shrink-0 border border-white/10 shadow-xl relative">
      {checkedLeads.length > 0 ? (
        <div className="p-4 bg-emerald-900/90 border-b border-emerald-500/50 flex flex-col gap-3">
          <div className="flex justify-between items-center text-white">
            <span className="font-bold">{checkedLeads.length} Selected</span>
            <button onClick={() => setCheckedLeads([])} className="text-white/60 hover:text-white"><FaTimes/></button>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={handleSelectAll} title="Select All" className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"><FaCheckSquare/></button>
             <button onClick={() => handleBulkAction('MARK_READ')} title="Mark Read" className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"><FaEnvelopeOpenText/></button>
             <button onClick={() => handleBulkAction('MARK_UNREAD')} title="Mark Unread" className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"><FaEnvelope/></button>
             <button onClick={() => handleBulkAction('ASSIGN', currentUserId)} title="Assign To Me" className="p-2 bg-emerald-500/30 hover:bg-emerald-500 rounded-lg text-emerald-200 hover:text-white transition-all"><FaUserCheck/></button>
             {checkedLeads.length === 1 && (
                 <button onClick={handleSendTestFollowUp} title="Send Test Follow-Up Message" className="p-2 bg-blue-600/50 hover:bg-blue-600 rounded-lg text-blue-200 hover:text-white transition-all"><FaPaperPlane/></button>
             )}
             {isManager && <button onClick={() => handleBulkAction('UNASSIGN')} title="Unassign Leads" className="p-2 bg-red-500/20 hover:bg-red-500 rounded-lg text-red-300 hover:text-white transition-all"><FaUserMinus/></button>}
             {isManager && (
                <select onChange={(e) => { if (e.target.value) handleBulkAction('ASSIGN', e.target.value) }} className="flex-1 bg-white/10 border-none text-white text-xs font-bold rounded-lg p-2 outline-none">
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
                <button onClick={() => setShowImportModal(true)} className="p-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-500/30 transition-all"><FaFileImport size={16}/></button>
              
              {isManager && (
                 <button onClick={() => setShowAssignModal(true)} className="p-2.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-500/30 transition-all"><FaUserPlus size={16}/></button>
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
          <>
            {displayedLeads.map(lead => {
                
              const leadTime = new Date(lead.updatedAt || lead.createdAt);
              const hoursPassed = (currentTime.getTime() - leadTime.getTime()) / (1000 * 60 * 60);

              let overlayClass = ''; 
              let timeIcon = null;

              if (hoursPassed >= 24) {
                  overlayClass = 'bg-red-900/20 border-red-500/30 hover:border-red-500/50'; 
                  timeIcon = <span className="text-[9px] text-red-400 font-bold flex items-center gap-1"><FaClock/> Expired</span>;
              } else if (hoursPassed >= 20) {
                  overlayClass = 'bg-yellow-900/20 border-yellow-500/30 hover:border-yellow-500/50'; 
                  timeIcon = <span className="text-[9px] text-yellow-400 font-bold flex items-center gap-1"><FaClock/> Expiring Soon</span>;
              } else {
                  overlayClass = 'bg-emerald-900/20 border-emerald-500/30 hover:border-emerald-500/50'; 
                  timeIcon = <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1"><FaCheckSquare/> Active Window</span>;
              }

              if (selectedLead?.id === lead.id) {
                  overlayClass = 'bg-[#0f172a] border-blue-500 shadow-md shadow-blue-500/20';
              }

              return (
              <div key={lead.id} className={`p-3 rounded-2xl mb-2 transition-all flex gap-3 items-center border ${overlayClass}`}>
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                   <input type="checkbox" checked={checkedLeads.includes(lead.id)} onChange={(e) => { if (e.target.checked) setCheckedLeads([...checkedLeads, lead.id]); else setCheckedLeads(checkedLeads.filter(id => id !== lead.id)); }} className="w-4 h-4 accent-emerald-600 rounded cursor-pointer" />
                </div>

                <div className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer" onClick={() => handleLeadClick(lead)}>
                  <FaUserCircle className="text-3xl text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      
                      <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                              <h4 className="font-bold text-[15px] text-slate-200 leading-none">{lead.phone}</h4>
                              {lead.unreadCount > 0 && (
                                  <span className="flex items-center justify-center bg-red-500 text-white text-[10px] font-black h-[18px] min-w-[18px] px-1 rounded-full shadow-md shadow-red-500/40">
                                      {lead.unreadCount}
                                  </span>
                              )}
                          </div>
                          
                          {lead.assignedUser ? (
                              <span className="text-[10px] text-blue-400 font-semibold mt-0.5">👤 {lead.assignedUser.firstName} {lead.assignedUser.lastName}</span>
                          ) : (
                              (!lead.assignedTo && (
                                  <button onClick={(e) => { e.stopPropagation(); handleBulkAction('ASSIGN', currentUserId, [lead.id]); }} className="text-[9px] w-max bg-emerald-600/80 hover:bg-emerald-500 text-white px-2 py-1 rounded shadow-md flex items-center gap-1 transition-all mt-1">
                                     <FaUserCheck size={10}/> Assign to me
                                  </button>
                              ))
                          )}
                      </div>
                      
                      <div className="flex flex-col items-end shrink-0 ml-2 gap-1.5">
                          <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{new Date(lead.updatedAt).toLocaleDateString('en-GB')}</span>
                              <span className="text-[9px] text-slate-500 block">{new Date(lead.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          
                          {(String(lead.assignedTo) === String(currentUserId) || isManager) && (
                              <button 
                                  onClick={(e) => { 
                                      e.stopPropagation(); 
                                      if (onRedirectToCampaign) onRedirectToCampaign(lead);
                                      else toast.error("Campaign router is missing!");
                                  }} 
                                  title="Open in Call Campaign"
                                  className="w-7 h-7 rounded-full bg-indigo-600/20 hover:bg-indigo-500 text-indigo-400 hover:text-white flex items-center justify-center transition-all shadow-md border border-indigo-500/30"
                              >
                                  <FaHeadset size={12} />
                              </button>
                          )}
                      </div>
                    </div>
                    
                    {lead.inquiryType === 'NEW_INQ' && lead.isLocked && (
                       <div className="text-[9px] text-red-400 font-black mt-1 mb-1 flex items-center gap-1 bg-red-500/10 w-max px-2 py-0.5 rounded"><FaLock/> 24H LOCKED</div>
                    )}

                    <div className="flex justify-between items-end mt-1">
                      <p className="text-[11px] font-medium text-slate-500 truncate w-[60%]">{lead.lastMessage || 'No messages'}</p>
                      <div className="flex flex-col items-end gap-1">
                          {timeIcon}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )})}

            {/* 🔥 LOAD MORE BUTTON 🔥 */}
            {filteredLeads.length > visibleCount && (
                <div className="flex justify-center mt-4 mb-2">
                    <button 
                        onClick={() => setVisibleCount(prev => prev + 50)} 
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold py-2 px-6 rounded-full transition-colors shadow-lg"
                    >
                        Load More Leads
                    </button>
                </div>
            )}
          </>
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

      {/* IMPORT MODAL */}
      {showImportModal && (
         <div className="absolute inset-0 z-50 bg-[#0f172a]/90 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-[#1a2430] border border-slate-700 rounded-2xl p-5 w-full shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaFileImport className="text-blue-500"/> Import Leads</h3>
                  <button onClick={()=>setShowImportModal(false)} className="text-slate-500 hover:text-white"><FaTimes/></button>
               </div>

               <div className="bg-[#121a24] p-3 rounded-xl border border-slate-800 mb-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Import To:</label>
                  <select id="importTargetTab" className="w-full bg-[#1a2430] border border-slate-700 text-emerald-400 font-bold rounded-lg p-2 text-xs outline-none focus:border-emerald-500">
                      <option value="OPEN_SEMINAR">Open Seminar Tab</option>
                      <option value="NEW_INQ">New Inquiry Tab (Inbox)</option>
                  </select>
               </div>
               
               <div className="bg-[#121a24] p-4 rounded-xl border border-slate-800 mb-3">
                  <h4 className="text-sm font-bold text-blue-400 mb-1">Bulk Import (CSV)</h4>
                  <p className="text-[10px] text-slate-500 mb-3">Upload a CSV file. Format: Column 1 = Phone, Column 2 = Name (Optional).</p>
                  <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files[0])} className="w-full text-slate-400 text-xs mb-3 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-900 file:text-blue-400" />
                  <button onClick={() => {
                      if (!csvFile) return toast.error("Please select a CSV file first!");
                      const targetTab = document.getElementById('importTargetTab').value;
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
                              const token = localStorage.getItem('token');
                              await axios.post('/after-seminar-crm/leads/import', { 
                                  isBulk: true, 
                                  leadsList,
                                  batchId: filters?.selectedBatch,
                                  businessId: filters?.selectedBusiness,
                                  inquiryType: targetTab
                              }, { headers: { Authorization: `Bearer ${token}` } });
                              toast.success(`${leadsList.length} Leads Imported to ${targetTab}!`);
                              setShowImportModal(false); setCsvFile(null); fetchLeads(true);
                          } catch (error) { toast.error("Bulk import failed!"); }
                      };
                      reader.readAsText(csvFile);
                  }} className="w-full bg-blue-600 hover:bg-blue-500 transition-colors text-white font-bold py-2 rounded-lg text-sm">Upload & Import</button>
               </div>

               <div className="bg-[#121a24] p-4 rounded-xl border border-slate-800">
                  <h4 className="text-sm font-bold text-emerald-400 mb-3">Single Import</h4>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const targetTab = document.getElementById('importTargetTab').value;
                    const token = localStorage.getItem('token');
                    try {
                        await axios.post('/after-seminar-crm/leads/import', { 
                            number: e.target.phone.value, 
                            name: e.target.name.value, 
                            isBulk: false,
                            batchId: filters?.selectedBatch,
                            businessId: filters?.selectedBusiness,
                            inquiryType: targetTab
                        }, { headers: { Authorization: `Bearer ${token}` } });
                        toast.success(`Imported successfully to ${targetTab}`);
                        setShowImportModal(false);
                        fetchLeads(true);
                    } catch(err) {
                        toast.error("Import failed");
                    }
                  }}>
                    <input name="phone" type="text" placeholder="Phone Number" required className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-2 text-sm outline-none" />
                    <input name="name" type="text" placeholder="Name (Optional)" className="w-full bg-[#1a2430] border border-slate-700 text-slate-300 rounded-lg p-2 mb-3 text-sm outline-none" />
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 transition-colors text-white font-bold py-2 rounded-lg text-sm">Import Single</button>
                  </form>
               </div>
             </div>
         </div>
      )}

    </div>
  );
}