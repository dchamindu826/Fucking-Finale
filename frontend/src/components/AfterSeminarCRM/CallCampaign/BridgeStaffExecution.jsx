import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { Loader2, PhoneCall, CheckCircle2, AlertCircle, Award, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { FaSave, FaCommentDots, FaSearch } from 'react-icons/fa';

export default function BridgeStaffExecution({ filters, setChatModalLead, externalSearch }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState({});
    
    // UI States
    const [searchQuery, setSearchQuery] = useState('');
    const [activePhase, setActivePhase] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [sessionEnrolled, setSessionEnrolled] = useState({ total: 0, full: 0, monthly: 0, installment: 0 });

    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
    const rawRole = JSON.parse(localStorage.getItem('user'))?.role || '';
    const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER'].includes(rawRole.toUpperCase().replace(/ /g, '_'));

    useEffect(() => {
        if (externalSearch) {
            setSearchQuery(externalSearch);
        }
    }, [externalSearch]);

    // 🔥 FIX: Component එක load වෙද්දි සහ Business/Batch මාරු වෙද්දි Data Fetch කරන්න මේක දාන්න
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
                    // 🔥 FIX: Corrected variable names here 🔥
                    loggedUserId: currentUserId,
                    loggedUserRole: rawRole,
                    businessId: filters?.selectedBusiness || '', 
                    batchId: filters?.selectedBatch || ''        
                }
            });
            
            // Bridge එකෙන් ආපු, තාම Enroll නොවුණ අය විතරක් පෙන්නනවා
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
            console.error(error); // Console එකේ error එක හරියටම බලාගන්න මේක දාන්න
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

    // 🔥 DATE SORTING LOGIC 🔥 - අලුත්ම ඒවා උඩට එන විදිහට Sort කිරීම
    const sortedFilteredLeads = phaseFilteredLeads.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    const totalPages = Math.ceil(sortedFilteredLeads.length / itemsPerPage);
    const paginatedLeads = sortedFilteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalAssigned = leads.length + sessionEnrolled.total;
    const covered = leads.filter(l => l.callStatus !== 'pending').length + sessionEnrolled.total;
    const pending = leads.filter(l => l.callStatus === 'pending' || !l.callStatus).length;
    const responseRate = totalAssigned > 0 ? Math.round((covered / totalAssigned) * 100) : 0;

    if (loading) return <div className="flex flex-col justify-center items-center h-full text-slate-400 font-sans"><Loader2 className="animate-spin mb-4" size={32} /> Loading Execution Workspace...</div>;

    return (
        <div className="flex flex-col h-full space-y-4 font-sans text-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1"><PhoneCall size={12}/> Assigned</p>
                    <h3 className="text-2xl font-black text-white">{totalAssigned}</h3>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1"><CheckCircle2 size={12}/> Covered</p>
                    <h3 className="text-2xl font-black text-blue-400">{covered}</h3>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-[10px] text-rose-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1"><AlertCircle size={12}/> Pending</p>
                    <h3 className="text-2xl font-black text-rose-400">{pending}</h3>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-12 h-12 bg-emerald-500/20 rounded-full blur-xl"></div>
                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-wider mb-1 flex items-center gap-1"><Award size={12}/> Enrolled</p>
                    <h3 className="text-2xl font-black text-emerald-400">{sessionEnrolled.total}</h3>
                </div>
                <div className="col-span-2 bg-[#0f172a] border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-2 flex items-center gap-1"><CreditCard size={12}/> Enrollment Breakdown (Session)</p>
                    <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-emerald-400">Full: {sessionEnrolled.full}</span>
                        <span className="text-blue-400">Monthly: {sessionEnrolled.monthly}</span>
                        <span className="text-amber-400">Install: {sessionEnrolled.installment}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 shadow-sm">
                <div className="flex bg-black/30 p-1 rounded-xl gap-1 w-full md:w-auto">
                    {[1, 2, 3].map(p => (
                        <button key={p} onClick={() => {setActivePhase(p); setCurrentPage(1);}} 
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${activePhase === p ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            PHASE {p}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 mr-2">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Rate: {responseRate}%</span>
                        <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <div style={{width: `${responseRate}%`}} className="bg-amber-500 h-full transition-all"></div>
                        </div>
                    </div>
                    <div className="relative w-full md:w-64">
                        <FaSearch className="absolute left-4 top-3 text-slate-500 text-sm" />
                        <input type="text" placeholder="Search numbers..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} 
                            className="w-full bg-[#0b0e14] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-amber-500 transition-all" />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-4">
                {paginatedLeads.length === 0 ? (
                    <div className="flex flex-col justify-center items-center py-20 text-slate-500 bg-white/5 rounded-3xl border border-white/5">
                        <CheckCircle2 size={48} className="mb-4 opacity-20" />
                        <h3 className="text-lg font-bold text-slate-400">No leads found in Phase {activePhase}</h3>
                    </div>
                ) : (
                    paginatedLeads.map((lead, index) => {
                        const realIndex = (currentPage - 1) * itemsPerPage + index + 1;
                        const currentRemark = drafts[lead.id] !== undefined ? drafts[lead.id] : (lead.feedback || '');
                        const isPending = lead.callStatus === 'pending' || !lead.callStatus;
                        
                        // 🔥 Date Header Logic 🔥
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
                                        <div className="h-px flex-1 bg-white/10"></div>
                                        <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest bg-black/40 px-4 py-1.5 rounded-full border border-amber-500/20 shadow-sm">
                                            {getDateHeader(currentLeadDate)}
                                        </span>
                                        <div className="h-px flex-1 bg-white/10"></div>
                                    </div>
                                )}

                                <div className={`bg-[#1e293b]/80 backdrop-blur-md p-4 rounded-2xl border transition-all ${isPending ? 'border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.05)]' : 'border-white/5 hover:border-white/10'}`}>
                                    <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center">
                                        <div className="flex items-center gap-4 w-full xl:w-64 shrink-0">
                                            <div className={`w-10 h-10 rounded-full flex justify-center items-center font-black text-sm shadow-inner ${isPending ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'}`}>
                                                {realIndex}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-black text-base">{lead.phone}</h4>
                                                <p className="text-xs text-slate-400 font-medium truncate w-40" title={lead.name}>{lead.name || 'Unknown Student'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-wrap xl:flex-nowrap w-full xl:w-auto shrink-0">
                                            <select value={lead.attemptCount || 1} onChange={(e) => handleUpdateLocalLead(lead.id, 'attemptCount', parseInt(e.target.value))} className="bg-[#0f172a] text-xs font-bold text-slate-300 border border-white/10 rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-amber-500">
                                                {[1,2,3,4,5].map(r => <option key={r} value={r}>Attempt {r}</option>)}
                                            </select>
                                            <select value={lead.callMethod || 'direct'} onChange={(e) => handleUpdateLocalLead(lead.id, 'callMethod', e.target.value)} className="bg-[#0f172a] text-xs font-bold text-slate-300 border border-white/10 rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-amber-500">
                                                <option value="direct">Direct Call</option><option value="whatsapp">WhatsApp</option><option value="3cx">3CX Call</option>
                                            </select>
                                            <select onChange={(e) => handleUpdateLocalLead(lead.id, 'callStatus', e.target.value)} value={lead.callStatus || 'pending'} className={`text-xs font-black rounded-xl px-3 py-2.5 outline-none cursor-pointer ${isPending ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : lead.callStatus === 'answered' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : lead.callStatus === 'no_answer' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-white/10'}`}>
                                                <option value="pending">Pending</option><option value="answered">Answered</option><option value="no_answer">No Answer</option><option value="reject">Reject</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 w-full xl:w-auto shrink-0">
                                            <select value={lead.paymentIntention || 'NOT_DECIDED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'paymentIntention', e.target.value)} className="bg-[#0f172a] text-xs font-bold text-slate-300 border border-white/10 rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-blue-500">
                                                <option value="NOT_DECIDED">Plan: Not Decided</option><option value="FULL">Plan: Full Payment</option><option value="MONTHLY">Plan: Monthly</option><option value="INSTALLMENT">Plan: Installment</option>
                                            </select>
                                            <select value={lead.enrollmentStatus || 'NON_ENROLLED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'enrollmentStatus', e.target.value)} className="bg-[#0f172a] text-xs font-black text-slate-300 border border-white/10 rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-emerald-500">
                                                <option value="NON_ENROLLED">Non-Enrolled</option><option value="ENROLLED" className="text-emerald-400">🔥 ENROLLED</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2 w-full">
                                            <input type="text" value={currentRemark} onChange={(e) => { setDrafts(prev => ({ ...prev, [lead.id]: e.target.value })); localStorage.setItem(`draft_bridge_${lead.id}`, e.target.value); }} 
                                                placeholder="Type your feedback..." className="flex-1 bg-[#0f172a] text-xs font-medium text-white px-4 py-2.5 rounded-xl border border-white/10 outline-none focus:border-amber-500 transition-all" />
                                            <button onClick={() => setChatModalLead(lead)} title="Open Workspace" className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-transform hover:scale-105 relative shrink-0">
                                                <FaCommentDots size={14}/>
                                                {lead.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-[#1e293b]"></span>}
                                            </button>
                                            <button onClick={() => handleSaveCallData(lead.id)} title="Save Updates" className="p-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-md transition-transform hover:scale-105 shrink-0 flex items-center gap-2 font-bold text-xs">
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
                <div className="flex justify-center items-center gap-2 bg-white/5 p-3 rounded-2xl border border-white/10 mt-auto shrink-0">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-[#0f172a] text-slate-400 hover:text-white disabled:opacity-50"><ChevronLeft size={16}/></button>
                    <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-slate-500 hover:bg-white/10'}`}>{i + 1}</button>
                        ))}
                    </div>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg bg-[#0f172a] text-slate-400 hover:text-white disabled:opacity-50"><ChevronRight size={16}/></button>
                </div>
            )}
        </div>
    );
}