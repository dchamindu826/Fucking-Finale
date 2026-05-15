import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { Loader2, PhoneCall, CheckCircle2, AlertCircle, Award, CreditCard, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { FaSave, FaCommentDots, FaSearch } from 'react-icons/fa';

export default function BridgeStaffExecution({ filters, setChatModalLead, externalSearch }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState({});
    
    // UI States
    const [searchQuery, setSearchQuery] = useState('');
    const [activePhase, setActivePhase] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50; 

    const [sessionEnrolled, setSessionEnrolled] = useState({ total: 0, full: 0, monthly: 0, installment: 0 });
    
    // 🔥 New State: Collapse Stats to save screen space 🔥
    const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
    const rawRole = JSON.parse(localStorage.getItem('user'))?.role || '';
    const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER'].includes(rawRole.toUpperCase().replace(/ /g, '_'));

    useEffect(() => {
        if (externalSearch) {
            setSearchQuery(externalSearch);
        }
    }, [externalSearch]);

    useEffect(() => {
        fetchBridgeCampaignLeads();
    }, [filters?.selectedBusiness, filters?.selectedBatch]);

    const fetchBridgeCampaignLeads = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/leads', {
                headers: { Authorization: `Bearer ${token}` }, 
                params: {
                    tab: 'ASSIGNED',
                    loggedUserId: currentUserId,
                    loggedUserRole: rawRole,
                    businessId: filters?.selectedBusiness || '', 
                    batchId: filters?.selectedBatch || ''        
                }
            });
            
            const activeLeads = (res.data.leads || []).filter(l => l.source === 'bridge_transfer' && l.enrollmentStatus !== 'ENROLLED');
            setLeads(activeLeads);
            
            const loadedDrafts = {};
            activeLeads.forEach(l => {
                const savedDraft = localStorage.getItem(`draft_bridge_${l.id}`);
                if (savedDraft) loadedDrafts[l.id] = savedDraft;
            });
            setDrafts(loadedDrafts);
            setSessionEnrolled({ total: 0, full: 0, monthly: 0, installment: 0 });
        } catch (error) { 
            console.error(error); 
            toast.error("Failed to load bridge campaign leads"); 
        }
        setLoading(false);
    };

    const handleUpdateLocalLead = (id, field, value) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const handleSaveCallData = async (leadId) => {
        const lead = leads.find(l => l.id === leadId);
        const feedback = drafts[leadId] || '';
        
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/update-call', {
                leadId, 
                method: lead.callMethod || 'direct', 
                status: lead.callStatus || 'pending', 
                feedback,
                coordinationRound: lead.coordinationRound || 1,
                paymentIntention: lead.paymentIntention || 'NOT_DECIDED',
                enrollmentStatus: lead.enrollmentStatus || 'NON_ENROLLED'
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            toast.success("Saved successfully!");
            
            if (lead.enrollmentStatus === 'ENROLLED') {
                setSessionEnrolled(prev => ({
                    total: prev.total + 1,
                    full: lead.paymentIntention === 'FULL' ? prev.full + 1 : prev.full,
                    monthly: lead.paymentIntention === 'MONTHLY' ? prev.monthly + 1 : prev.monthly,
                    installment: lead.paymentIntention === 'INSTALLMENT' ? prev.installment + 1 : prev.installment
                }));
                setLeads(prev => prev.filter(l => l.id !== leadId));
            } else {
                setLeads(prev => prev.map(l => {
                    if (l.id === leadId) {
                        let newPhase = l.phase;
                        if (lead.callStatus === 'no_answer') {
                            if (l.phase === 1) newPhase = 2;
                            else if (l.phase === 2) newPhase = 3;
                        }
                        return { ...l, callStatus: lead.callStatus, feedback: feedback, phase: newPhase };
                    }
                    return l;
                }));
            }
            
            const newDrafts = { ...drafts };
            delete newDrafts[leadId];
            setDrafts(newDrafts);
            localStorage.removeItem(`draft_bridge_${leadId}`);
        } catch (error) { toast.error("Failed to save data."); }
    };

    const phaseFilteredLeads = leads.filter(l => (l.phase || 1) === activePhase && (
        l.phone.includes(searchQuery) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ));

    const sortedFilteredLeads = phaseFilteredLeads.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    const totalPages = Math.ceil(sortedFilteredLeads.length / itemsPerPage);
    const paginatedLeads = sortedFilteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalAssigned = leads.length + sessionEnrolled.total;
    const covered = leads.filter(l => l.callStatus !== 'pending').length + sessionEnrolled.total;
    const pending = leads.filter(l => l.callStatus === 'pending' || !l.callStatus).length;
    const responseRate = totalAssigned > 0 ? Math.round((covered / totalAssigned) * 100) : 0;

    if (loading) return <div className="flex flex-col justify-center items-center h-full text-brand-accent font-sans"><Loader2 className="animate-spin mb-4" size={32} /> Loading Execution Workspace...</div>;

    return (
        <div className="flex flex-col h-full space-y-4 font-sans text-gray-900 dark:text-slate-200 transition-colors duration-300">
            
            {/* 🔥 Collapsible Stats Section 🔥 */}
            <div className="bg-white dark:bg-brand-darkCard rounded-3xl border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors overflow-hidden shrink-0">
                <div 
                    className="flex justify-between items-center p-4 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-brand-darkHover/40 transition-colors"
                    onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-widest ml-1 transition-colors">Execution Statistics</span>
                        {isStatsCollapsed && (
                            <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20 shadow-sm transition-colors">
                                {sessionEnrolled.total} Enrolled
                            </span>
                        )}
                    </div>
                    <button className="text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white p-1.5 bg-gray-100 dark:bg-brand-darkBg rounded-lg transition-colors border border-gray-200 dark:border-transparent outline-none shadow-sm">
                        {isStatsCollapsed ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
                    </button>
                </div>
                
                {!isStatsCollapsed && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 pt-1 border-t border-gray-100 dark:border-brand-darkBorder mt-1 transition-colors">
                        <div className="bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col justify-center transition-colors shadow-sm">
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 transition-colors"><PhoneCall size={12} className="text-blue-500"/> Assigned</p>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white transition-colors">{totalAssigned}</h3>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 p-4 rounded-2xl flex flex-col justify-center transition-colors shadow-sm">
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 transition-colors"><CheckCircle2 size={12}/> Covered</p>
                            <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 transition-colors">{covered}</h3>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/20 p-4 rounded-2xl flex flex-col justify-center transition-colors shadow-sm">
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 transition-colors"><AlertCircle size={12}/> Pending</p>
                            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 transition-colors">{pending}</h3>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 p-4 rounded-2xl flex flex-col justify-center transition-colors shadow-sm">
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 transition-colors"><Award size={12}/> Enrolled</p>
                            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 transition-colors">{sessionEnrolled.total}</h3>
                        </div>
                        <div className="col-span-2 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col justify-center transition-colors shadow-sm">
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-black uppercase tracking-wider mb-2 flex items-center gap-1.5 transition-colors"><CreditCard size={12}/> Enrollment Breakdown (Session)</p>
                            <div className="flex justify-between items-center text-sm font-bold transition-colors">
                                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-500/10 px-2 py-0.5 rounded">Full: {sessionEnrolled.full}</span>
                                <span className="text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-500/10 px-2 py-0.5 rounded">Monthly: {sessionEnrolled.monthly}</span>
                                <span className="text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-500/10 px-2 py-0.5 rounded">Install: {sessionEnrolled.installment}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-brand-darkCard p-4 rounded-3xl border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors shrink-0">
                <div className="flex bg-gray-50 dark:bg-brand-darkBg p-1.5 rounded-xl gap-1 w-full md:w-auto border border-gray-200 dark:border-transparent transition-colors shadow-sm">
                    {[1, 2, 3].map(p => (
                        <button key={p} onClick={() => {setActivePhase(p); setCurrentPage(1);}} 
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase transition-all outline-none ${activePhase === p ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-brand-darkHover'}`}>
                            PHASE {p}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2.5 mr-2">
                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest transition-colors">Rate: {responseRate}%</span>
                        <div className="w-24 h-1.5 bg-gray-200 dark:bg-brand-darkBg rounded-full overflow-hidden shadow-inner transition-colors">
                            <div style={{width: `${responseRate}%`}} className="bg-amber-500 h-full transition-all"></div>
                        </div>
                    </div>
                    <div className="relative w-full md:w-64">
                        <FaSearch className="absolute left-4 top-3 text-gray-400 dark:text-slate-500 text-sm transition-colors" />
                        <input type="text" placeholder="Search numbers..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} 
                            className="w-full bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl py-2 pl-10 pr-4 text-sm text-gray-900 dark:text-white outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-colors shadow-sm placeholder-gray-400 dark:placeholder-slate-500" />
                    </div>
                </div>
            </div>

            {/* Leads List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-4 pr-1">
                {paginatedLeads.length === 0 ? (
                    <div className="flex flex-col justify-center items-center py-20 text-gray-400 dark:text-slate-500 bg-white dark:bg-brand-darkCard rounded-3xl border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors">
                        <CheckCircle2 size={48} className="mb-4 opacity-30 text-emerald-500" />
                        <h3 className="text-lg font-bold text-gray-500 dark:text-slate-400 transition-colors">No leads found in Phase {activePhase}</h3>
                    </div>
                ) : (
                    paginatedLeads.map((lead, index) => {
                        const realIndex = (currentPage - 1) * itemsPerPage + index + 1;
                        const currentRemark = drafts[lead.id] !== undefined ? drafts[lead.id] : (lead.feedback || '');
                        const isPending = lead.callStatus === 'pending' || !lead.callStatus;
                        
                        const currentLeadDate = new Date(lead.updatedAt || lead.createdAt).toLocaleDateString('en-CA');
                        const prevLeadDate = index > 0 ? new Date(paginatedLeads[index - 1].updatedAt || paginatedLeads[index - 1].createdAt).toLocaleDateString('en-CA') : null;
                        const showDateHeader = currentLeadDate !== prevLeadDate;

                        const getDateHeader = (dateStr) => {
                            const date = new Date(dateStr);
                            const today = new Date();
                            const yesterday = new Date(today);
                            yesterday.setDate(yesterday.getDate() - 1);
                            if (date.toDateString() === today.toDateString()) return "📅 Today";
                            if (date.toDateString() === yesterday.toDateString()) return "📅 Yesterday";
                            return `📅 ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
                        };
                        
                        return (
                            <React.Fragment key={lead.id}>
                                {showDateHeader && (
                                    <div className="flex items-center gap-3 my-5 first:mt-1">
                                        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10 transition-colors"></div>
                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest bg-amber-50 dark:bg-black/40 px-4 py-1.5 rounded-full border border-amber-200 dark:border-amber-500/20 shadow-sm transition-colors">
                                            {getDateHeader(currentLeadDate)}
                                        </span>
                                        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10 transition-colors"></div>
                                    </div>
                                )}

                                <div className={`bg-white dark:bg-brand-darkCard p-4 rounded-[1.5rem] border transition-all shadow-sm hover:shadow-md ${isPending ? 'border-rose-200 dark:border-rose-500/30' : 'border-gray-200 dark:border-brand-darkBorder hover:border-gray-300 dark:hover:border-slate-700'}`}>
                                    <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center">
                                        <div className="flex items-center gap-4 w-full xl:w-64 shrink-0 transition-colors">
                                            <div className={`w-10 h-10 rounded-full flex justify-center items-center font-black text-sm shadow-sm transition-colors ${isPending ? 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-gray-100 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder text-gray-600 dark:text-slate-400'}`}>
                                                {realIndex}
                                            </div>
                                            <div>
                                                <h4 className="text-gray-900 dark:text-white font-black text-base transition-colors">{lead.phone}</h4>
                                                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium truncate w-40 transition-colors" title={lead.name}>{lead.name || 'Unknown Student'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-wrap xl:flex-nowrap w-full xl:w-auto shrink-0 transition-colors">
                                            <select value={lead.attemptCount || 1} onChange={(e) => handleUpdateLocalLead(lead.id, 'attemptCount', parseInt(e.target.value))} className="bg-gray-50 dark:bg-brand-darkBg text-xs font-bold text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-brand-darkBorder rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-amber-500 dark:focus:border-amber-500 transition-colors shadow-sm">
                                                {[1,2,3,4,5].map(r => <option key={r} value={r}>Attempt {r}</option>)}
                                            </select>
                                            <select value={lead.callMethod || 'direct'} onChange={(e) => handleUpdateLocalLead(lead.id, 'callMethod', e.target.value)} className="bg-gray-50 dark:bg-brand-darkBg text-xs font-bold text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-brand-darkBorder rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-amber-500 dark:focus:border-amber-500 transition-colors shadow-sm">
                                                <option value="direct">Direct Call</option><option value="whatsapp">WhatsApp</option><option value="3cx">3CX Call</option>
                                            </select>
                                            <select onChange={(e) => handleUpdateLocalLead(lead.id, 'callStatus', e.target.value)} value={lead.callStatus || 'pending'} className={`text-xs font-black rounded-xl px-3 py-2.5 outline-none cursor-pointer shadow-sm transition-colors ${isPending ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30' : lead.callStatus === 'answered' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' : lead.callStatus === 'no_answer' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30' : 'bg-gray-100 dark:bg-brand-darkBg text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-brand-darkBorder'}`}>
                                                <option value="pending">Pending</option><option value="answered">Answered</option><option value="no_answer">No Answer</option><option value="reject">Reject</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 w-full xl:w-auto shrink-0 transition-colors">
                                            <select value={lead.paymentIntention || 'NOT_DECIDED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'paymentIntention', e.target.value)} className="bg-gray-50 dark:bg-brand-darkBg text-xs font-bold text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-brand-darkBorder rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-blue-500 dark:focus:border-blue-500 transition-colors shadow-sm">
                                                <option value="NOT_DECIDED">Plan: Not Decided</option><option value="FULL">Plan: Full Payment</option><option value="MONTHLY">Plan: Monthly</option><option value="INSTALLMENT">Plan: Installment</option>
                                            </select>
                                            <select value={lead.enrollmentStatus || 'NON_ENROLLED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'enrollmentStatus', e.target.value)} className="bg-gray-50 dark:bg-brand-darkBg text-xs font-black text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-brand-darkBorder rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors shadow-sm">
                                                <option value="NON_ENROLLED">Non-Enrolled</option><option value="ENROLLED" className="text-emerald-600 dark:text-emerald-400 font-black">🔥 ENROLLED</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 w-full transition-colors">
                                            <input type="text" value={currentRemark} onChange={(e) => { setDrafts(prev => ({ ...prev, [lead.id]: e.target.value })); localStorage.setItem(`draft_bridge_${lead.id}`, e.target.value); }} 
                                                placeholder="Type your feedback..." className="flex-1 bg-gray-50 dark:bg-brand-darkBg text-xs font-medium text-gray-900 dark:text-white px-4 py-2.5 rounded-xl border border-gray-200 dark:border-brand-darkBorder outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-all shadow-inner placeholder-gray-400 dark:placeholder-slate-500" />
                                            <button onClick={() => setChatModalLead(lead)} title="Open Workspace" className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-transform hover:scale-105 relative shrink-0 outline-none">
                                                <FaCommentDots size={14}/>
                                                {lead.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-[#1e293b]"></span>}
                                            </button>
                                            <button onClick={() => handleSaveCallData(lead.id)} title="Save Updates" className="p-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-md transition-transform hover:scale-105 shrink-0 flex items-center gap-2 font-bold text-xs outline-none">
                                                <FaSave size={14}/> <span className="hidden md:inline">SAVE</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 bg-white dark:bg-brand-darkCard p-3 rounded-2xl border border-gray-200 dark:border-brand-darkBorder mt-auto shrink-0 shadow-sm transition-colors">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-gray-100 dark:bg-brand-darkBg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 transition-colors border border-gray-200 dark:border-transparent outline-none"><ChevronLeft size={16}/></button>
                    <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-black transition-all outline-none ${currentPage === i + 1 ? 'bg-brand-accent text-white shadow-md' : 'bg-transparent text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-brand-darkHover'}`}>{i + 1}</button>
                        ))}
                    </div>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg bg-gray-100 dark:bg-brand-darkBg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 transition-colors border border-gray-200 dark:border-transparent outline-none"><ChevronRight size={16}/></button>
                </div>
            )}
        </div>
    );
}