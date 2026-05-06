import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { Loader2, Save, Users, TrendingDown, TrendingUp, CalendarDays } from 'lucide-react';
import { FaCommentDots } from 'react-icons/fa';

export default function AfterSeminarPaidCampaign({ filters, setChatModalLead, externalSearch }) {
    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState({});

    // 🔥 BACKEND EKEN ENA REAL STATS STORE KARANNA 🔥
    const [retentionStats, setRetentionStats] = useState({
        prevMonthEnrolled: 0,
        thisMonthRenewed: 0,
        thisMonthDropped: 0
    });

    // FILTERS & NAVIGATION
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1 to 12
    const [activeMainTab, setActiveMainTab] = useState('MONTHLY'); // FULL, MONTHLY, INSTALLMENT
    const [activeSubTab, setActiveSubTab] = useState('NON_ENROLLED'); // ENROLLED, NON_ENROLLED
    
    const [activeRound, setActiveRound] = useState(1); 
    const [activePhase, setActivePhase] = useState(1);

    // 🔥 PAGINATION STATES 🔥
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Reset pagination when any filter or tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeMainTab, activeSubTab, activeRound, activePhase, selectedMonth, filters]);

    useEffect(() => {
        if (activeMainTab === 'FULL' || activeSubTab === 'ENROLLED') {
            setActiveRound(1); 
        }
    }, [activeMainTab, activeSubTab]);

    useEffect(() => {
        if (filters.selectedBusiness && filters.selectedBatch) {
            fetchPaidCampaignData();
        } else {
            setLeads([]);
            setLoading(false);
        }
    }, [filters, selectedMonth]);

    // 🔥 API EKEN REAL DATA GANNAWA (LEADS + STATS) 🔥
    const fetchPaidCampaignData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/retention/campaign-data', {
                headers: { Authorization: `Bearer ${token}` },
                params: { 
                    businessId: filters.selectedBusiness, 
                    batchId: filters.selectedBatch,
                    month: selectedMonth
                }
            });
            
            // Filter leads for the logged-in coordinator
            const myLeads = (res.data.leads || []).filter(l => l.assignedTo === currentUserId);
            setLeads(myLeads);

            // Set real stats from backend
            if (res.data.stats) {
                setRetentionStats({
                    prevMonthEnrolled: res.data.stats.prevMonthEnrolled || 0,
                    thisMonthRenewed: res.data.stats.thisMonthRenewed || 0,
                    thisMonthDropped: res.data.stats.thisMonthDropped || 0
                });
            }

            const loadedDrafts = {};
            myLeads.forEach(l => {
                const savedDraft = localStorage.getItem(`draft_paid_remark_${l.id}`);
                if (savedDraft) loadedDrafts[l.id] = savedDraft;
            });
            setDrafts(loadedDrafts);
        } catch (error) {
            toast.error("Failed to load campaign data");
        }
        setLoading(false);
    };

    const handleUpdateLocalLead = (id, field, value) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const handleDraftRemark = (id, text) => {
        setDrafts(prev => ({ ...prev, [id]: text }));
        localStorage.setItem(`draft_paid_remark_${id}`, text);
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
                coordinationRound: activeRound,
                phase: lead.callStatus === 'no_answer' ? Math.min(3, activePhase + 1) : activePhase,
                paymentIntention: lead.paymentIntention,
                enrollmentStatus: lead.enrollmentStatus,
                targetMonth: selectedMonth
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            toast.success("Call updates saved!");
            
            if (lead.callStatus === 'no_answer' && activePhase < 3) {
                setLeads(prev => prev.filter(l => l.id !== leadId));
            } else {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, phase: activePhase, feedback } : l));
            }

            const newDrafts = { ...drafts };
            delete newDrafts[leadId];
            setDrafts(newDrafts);
            localStorage.removeItem(`draft_paid_remark_${leadId}`);
            
        } catch (error) { 
            toast.error("Failed to save data."); 
        }
    };

    const displayLeads = useMemo(() => {
        return leads.filter(l => {
            const matchIntention = l.paymentIntention === activeMainTab;
            const matchStatus = activeMainTab === 'FULL' ? true : l.enrollmentStatus === activeSubTab;
            const matchRound = (l.coordinationRound || 1) === activeRound;
            const matchPhase = (l.phase || 1) === activePhase;
            return matchIntention && matchStatus && matchRound && matchPhase;
        });
    }, [leads, activeMainTab, activeSubTab, activeRound, activePhase]);

    // 🔥 PAGINATION LOGIC 🔥
    const totalPages = Math.ceil(displayLeads.length / itemsPerPage);
    const paginatedLeads = displayLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (!filters.selectedBatch) {
        return <div className="text-center py-20 text-slate-500 bg-[#0f172a] rounded-2xl h-full flex items-center justify-center font-medium">Please select a Batch to start the campaign.</div>;
    }

    return (
        <div className="w-full h-full flex flex-col bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden font-sans text-slate-200">
            
            {/* 🔥 TOP RETENTION OVERVIEW & MONTH SELECTOR 🔥 */}
            <div className="bg-[#1e293b] p-5 border-b border-slate-700 shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-5">
                    <div>
                        <h2 className="text-white font-semibold text-lg flex items-center gap-2"><CalendarDays className="text-indigo-400 w-5 h-5"/> Retention & Billing Management</h2>
                        <p className="text-xs text-slate-400 mt-1">Manage monthly renewals and follow-ups professionally.</p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-[#0f172a] px-3 py-2 rounded-lg border border-slate-700 shadow-sm">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Target Month:</span>
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-transparent text-indigo-400 font-semibold text-sm outline-none cursor-pointer"
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i+1} value={i+1} className="bg-[#1e293b]">Month {i+1}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><Users className="w-5 h-5"/></div>
                        <div><p className="text-xs text-slate-400 font-medium">M-{selectedMonth - 1} Enrolled</p><h3 className="text-xl font-semibold text-white mt-0.5">{retentionStats.prevMonthEnrolled}</h3></div>
                    </div>
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><TrendingUp className="w-5 h-5"/></div>
                        <div><p className="text-xs text-slate-400 font-medium">M-{selectedMonth} Renewed</p><h3 className="text-xl font-semibold text-emerald-400 mt-0.5">{retentionStats.thisMonthRenewed}</h3></div>
                    </div>
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700 flex items-center gap-4 shadow-sm">
                        <div className="p-3 bg-red-500/10 text-red-400 rounded-lg"><TrendingDown className="w-5 h-5"/></div>
                        <div><p className="text-xs text-slate-400 font-medium">M-{selectedMonth} Dropped</p><h3 className="text-xl font-semibold text-red-400 mt-0.5">{retentionStats.thisMonthDropped}</h3></div>
                    </div>
                </div>
            </div>

            {/* 🔥 TABS NAVIGATION 🔥 */}
            <div className="px-5 py-4 bg-[#1e293b] border-b border-slate-700 shrink-0 flex flex-col gap-4 shadow-sm z-10">
                <div className="flex gap-2">
                    {['FULL', 'MONTHLY', 'INSTALLMENT'].map(tab => (
                        <button key={tab} onClick={() => setActiveMainTab(tab)} className={`px-6 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${activeMainTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'bg-[#0f172a] text-slate-400 border border-slate-700 hover:text-white'}`}>
                            {tab === 'FULL' ? 'Full Payment' : tab === 'MONTHLY' ? 'Monthly Pay' : 'Installment'}
                        </button>
                    ))}
                </div>

                {activeMainTab !== 'FULL' && (
                    <div className="flex gap-2 bg-[#0f172a] p-1 rounded-lg border border-slate-700 w-full md:w-max">
                        <button onClick={() => setActiveSubTab('ENROLLED')} className={`flex-1 md:flex-none px-6 py-1.5 rounded-md text-xs font-medium transition-all ${activeSubTab === 'ENROLLED' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>Enrolled</button>
                        <button onClick={() => setActiveSubTab('NON_ENROLLED')} className={`flex-1 md:flex-none px-6 py-1.5 rounded-md text-xs font-medium transition-all ${activeSubTab === 'NON_ENROLLED' ? 'bg-red-500/20 text-red-400' : 'text-slate-500 hover:text-slate-300'}`}>Non-Enrolled</button>
                    </div>
                )}

                <div className="flex justify-between items-center bg-[#0f172a] p-2 rounded-lg border border-slate-700">
                    <div className="flex gap-2">
                        <button onClick={() => setActiveRound(1)} className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${activeRound === 1 ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Round 1</button>
                        {(activeMainTab !== 'FULL' && activeSubTab === 'NON_ENROLLED') && (
                            <button onClick={() => setActiveRound(2)} className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${activeRound === 2 ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Round 2</button>
                        )}
                    </div>
                    
                    <div className="flex gap-2 border-l border-slate-600 pl-3">
                        {[1, 2, 3].map(p => (
                            <button key={p} onClick={() => setActivePhase(p)} className={`w-8 h-7 rounded text-xs font-semibold transition-all ${activePhase === p ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>P{p}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 🔥 LEADS LIST AREA 🔥 */}
            <div className="flex-1 bg-[#0b1120] flex flex-col relative overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 flex justify-center items-center bg-[#0b1120]/80 backdrop-blur-sm z-10">
                        <Loader2 className="animate-spin text-indigo-500 w-8 h-8"/>
                    </div>
                )}

                {displayLeads.length === 0 && !loading ? (
                    <div className="flex-1 flex flex-col justify-center items-center text-slate-500">
                        <Users className="w-12 h-12 mb-3 text-slate-700"/>
                        <p className="text-sm font-medium">No leads in Phase {activePhase} for this section.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-y-auto custom-scrollbar flex-1 p-5 space-y-4">
                            {paginatedLeads.map((l, index) => {
                                // Calculate continuous numbering across pages
                                const realIndex = (currentPage - 1) * itemsPerPage + index + 1;
                                
                                return (
                                    <div key={l.id} className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 flex flex-col xl:flex-row gap-5 items-start xl:items-center shadow-sm hover:border-slate-500 transition-colors">
                                        
                                        <div className="flex items-center gap-4 w-full xl:w-64 shrink-0">
                                            <div className="w-9 h-9 bg-slate-800 border border-slate-600 text-slate-300 rounded-full flex justify-center items-center text-sm font-medium shrink-0">{realIndex}</div>
                                            <div>
                                                <h4 className="text-slate-100 font-semibold text-sm tracking-wide">{l.phone}</h4>
                                                <p className="text-xs text-slate-400 truncate w-40 mt-0.5">{l.name || 'Unknown Student'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-wrap shrink-0">
                                            <select value={l.attemptCount || 1} onChange={(e) => handleUpdateLocalLead(l.id, 'attemptCount', parseInt(e.target.value))} className="bg-[#0f172a] text-slate-300 font-medium text-xs px-3 py-2 rounded-lg border border-slate-600 outline-none focus:border-indigo-500 cursor-pointer">
                                                {[1,2,3,4,5].map(r => <option key={r} value={r}>Attempt {r}</option>)}
                                            </select>
                                            <select value={l.callMethod || 'direct'} onChange={(e) => handleUpdateLocalLead(l.id, 'callMethod', e.target.value)} className="bg-[#0f172a] text-slate-300 font-medium text-xs px-3 py-2 rounded-lg border border-slate-600 outline-none focus:border-indigo-500 cursor-pointer">
                                                <option value="direct">Direct Call</option>
                                                <option value="whatsapp">WhatsApp</option>
                                                <option value="3cx">3CX Call</option>
                                            </select>
                                            <select value={l.callStatus || 'pending'} onChange={(e) => handleUpdateLocalLead(l.id, 'callStatus', e.target.value)} className={`text-xs font-medium px-3 py-2 rounded-lg border outline-none cursor-pointer ${l.callStatus === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : l.callStatus === 'no_answer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-[#0f172a] text-slate-300 border-slate-600 focus:border-indigo-500'}`}>
                                                <option value="pending">Pending</option>
                                                <option value="answered">Answered</option>
                                                <option value="no_answer">No Answer</option>
                                                <option value="reject">Reject</option>
                                            </select>
                                        </div>

                                        <div className="flex-1 w-full xl:w-auto flex gap-3">
                                            <input 
                                                type="text" 
                                                placeholder="Add conversation remarks..." 
                                                value={drafts[l.id] || l.feedback || ''}
                                                onChange={(e) => handleDraftRemark(l.id, e.target.value)}
                                                className="flex-1 bg-[#0f172a] text-slate-200 text-xs px-4 py-2 rounded-lg border border-slate-600 outline-none focus:border-indigo-500 transition-colors"
                                            />
                                            <button onClick={() => setChatModalLead(l)} title="Open Workspace" className="bg-slate-700 hover:bg-indigo-600 text-white p-2.5 rounded-lg transition-colors flex items-center justify-center relative shadow-sm">
                                                <FaCommentDots className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleSaveCallData(l.id)} title="Save Data" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-2">
                                                <Save className="w-4 h-4" /> <span className="hidden md:inline">Save</span>
                                            </button>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>

                        {/* 🔥 PAGINATION CONTROLS 🔥 */}
                        {totalPages > 1 && (
                            <div className="bg-[#1e293b] p-3 flex justify-center gap-1.5 border-t border-slate-700 shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button 
                                        key={page} 
                                        onClick={() => setCurrentPage(page)} 
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                            currentPage === page 
                                                ? 'bg-indigo-600 text-white shadow-md' 
                                                : 'bg-[#0f172a] text-slate-400 border border-slate-600 hover:text-white hover:border-indigo-500'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}