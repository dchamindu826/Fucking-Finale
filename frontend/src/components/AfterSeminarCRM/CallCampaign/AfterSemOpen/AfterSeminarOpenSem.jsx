import React, { useState, useMemo, useEffect } from 'react';
import { FaFilter } from 'react-icons/fa';
import axios from '../../../../api/axios';
import toast from 'react-hot-toast';

import CampaignHeader from './CampaignHeader';
import LeadCard from './LeadCard';

const getShiftInfo = (dateString) => {
    if (!dateString) return { dateStr: 'Unknown', label: 'Unknown Date' };
    const d = new Date(dateString);
    const shiftDate = new Date(d);
    
    if (d.getHours() < 8) {
        shiftDate.setDate(shiftDate.getDate() - 1);
    }
    const shiftDateStr = shiftDate.toLocaleDateString('en-CA');
    
    const now = new Date();
    const todayShift = new Date(now);
    if (now.getHours() < 8) todayShift.setDate(todayShift.getDate() - 1);
    const todayShiftStr = todayShift.toLocaleDateString('en-CA');
    
    const yesterdayShift = new Date(todayShift);
    yesterdayShift.setDate(yesterdayShift.getDate() - 1);
    const yesterdayShiftStr = yesterdayShift.toLocaleDateString('en-CA');
    
    if (shiftDateStr === todayShiftStr) return { dateStr: shiftDateStr, label: 'Today (8AM Shift)', isToday: true };
    if (shiftDateStr === yesterdayShiftStr) return { dateStr: shiftDateStr, label: 'Yesterday (8AM Shift)', isToday: false };
    
    return { dateStr: shiftDateStr, label: `${shiftDateStr} (8AM Shift)`, isToday: false };
};

export default function AfterSeminarOpenSem({ leads, allBatches, filters, drafts, setDrafts, handleUpdateLocalLead, handleSaveCallData, setChatModalLead, isManager, handleTempUnlock, externalSearch }) {
    const [activeTab, setActiveTab] = useState('ROUND_1'); 
    const [activePhase, setActivePhase] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    // 🔥 අලුත් Delay Filter State එක 🔥
    const [showOnlyDelayed, setShowOnlyDelayed] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [typingMode, setTypingMode] = useState('en');
    
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 30;

    const [lastSearched, setLastSearched] = useState(null);

    const openSemLeads = Array.isArray(leads) ? leads.filter(l => l.inquiryType === 'OPEN_SEMINAR' || l.inquiryType === 'NORMAL') : [];

    useEffect(() => { 
        if (externalSearch && externalSearch !== lastSearched && openSemLeads.length > 0) {
            const query = typeof externalSearch === 'object' ? externalSearch.phone : externalSearch;
            setSearchQuery(query); 
            const targetLead = openSemLeads.find(l => l.phone === query || String(l.id) === String(query));
            if (targetLead) {
                if (targetLead.enrollmentStatus === 'ENROLLED') setActiveTab('ENROLLED');
                else if (targetLead.coordinationRound === 2) setActiveTab('ROUND_2');
                else if (targetLead.coordinationRound >= 3) setActiveTab('ROUND_3');
                else setActiveTab('ROUND_1');

                if (targetLead.phase) setActivePhase(targetLead.phase);
                setCurrentPage(1);
                setLastSearched(externalSearch);
            }
        } 
    }, [externalSearch, openSemLeads, lastSearched]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, activePhase, statusFilter, searchQuery, showOnlyDelayed]);

    const stats = useMemo(() => {
        let st = { 
            totalAssigned: openSemLeads.length, 
            totalCovered: 0, 
            totalPending: 0, 
            enrolled: 0, 
            enrolledPercentage: 0,
            r1Total: 0, r1Pending: 0, r1Covered: 0, 
            r2Total: 0, r2Pending: 0, r2Covered: 0, 
            r3Total: 0, r3Pending: 0, r3Covered: 0 
        };

        openSemLeads.forEach(l => {
            const isPending = !l.callStatus || l.callStatus === 'pending';
            
            if (isPending) st.totalPending++; else st.totalCovered++;

            if (l.enrollmentStatus === 'ENROLLED') {
                st.enrolled++;
            } else {
                const round = l.coordinationRound || 1;
                
                if (round === 1) {
                    st.r1Total++;
                    if (isPending) st.r1Pending++; else st.r1Covered++;
                } else if (round === 2) {
                    st.r2Total++;
                    if (isPending) st.r2Pending++; else st.r2Covered++;
                } else if (round >= 3) {
                    st.r3Total++;
                    if (isPending) st.r3Pending++; else st.r3Covered++;
                }
            }
        });

        st.enrolledPercentage = st.totalAssigned > 0 ? ((st.enrolled / st.totalAssigned) * 100).toFixed(1) : 0;
        return st;
    }, [openSemLeads]);

    // 🔥 FIX: Timer Logic Changed to 5 Days for ALL Rounds 🔥
    const getTimerData = (lead) => {
        const round = lead.coordinationRound || 1;
        // Start Time (Original Assign Date for R1, Push Date for R2/R3)
        const startTime = round === 1 ? (lead.newInqTimestamp || lead.createdAt) : lead.updatedAt;
        if (!startTime) return null;

        const now = new Date();
        const diffMs = now.getTime() - new Date(startTime).getTime();
        
        // 5 Days = 120 Hours for Every Round
        const maxHours = 120; 
        const maxMs = maxHours * 60 * 60 * 1000;
        const msRemaining = maxMs - diffMs;

        const isPending = !lead.callStatus || lead.callStatus === 'pending';

        if (isPending) {
            if (msRemaining < 0) {
                const lateMs = Math.abs(msRemaining);
                const hrs = Math.floor(lateMs / (1000 * 60 * 60));
                const mins = Math.floor((lateMs % (1000 * 60 * 60)) / 60000);
                return { text: `-${hrs}h ${mins}m LATE`, type: "danger", isLate: true };
            } else {
                const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
                const hrs = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                return { text: days > 0 ? `${days}d ${hrs}h LEFT` : `${hrs}h LEFT`, type: "warning", isLate: false };
            }
        } else {
            return { text: `COVERED`, type: "success", isLate: false };
        }
    };

    const filteredLeads = useMemo(() => {
        let filtered = openSemLeads;
        if (activeTab === 'ENROLLED') {
            filtered = filtered.filter(l => l.enrollmentStatus === 'ENROLLED');
        } else {
            filtered = filtered.filter(l => l.enrollmentStatus !== 'ENROLLED');
            if (activeTab === 'ROUND_1') filtered = filtered.filter(l => (l.coordinationRound || 1) === 1);
            if (activeTab === 'ROUND_2') filtered = filtered.filter(l => l.coordinationRound === 2);
            if (activeTab === 'ROUND_3') filtered = filtered.filter(l => l.coordinationRound >= 3);
        }
        
        if (activePhase !== 'ALL') filtered = filtered.filter(l => l.phase === activePhase);

        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(l => {
                if (statusFilter === 'pending') return !l.callStatus || l.callStatus === 'pending';
                return l.callStatus === statusFilter;
            });
        }

        // 🔥 අලුත් Delay Filter එක 🔥
        if (showOnlyDelayed) {
            filtered = filtered.filter(l => {
                const tData = getTimerData(l);
                return tData && tData.isLate;
            });
        }

        if (searchQuery) {
            const sq = searchQuery.toLowerCase();
            filtered = filtered.filter(l => l.phone.includes(sq) || (l.name && l.name.toLowerCase().includes(sq)));
        }

        return filtered.sort((a, b) => {
            const aPending = !a.callStatus || a.callStatus === 'pending';
            const bPending = !b.callStatus || b.callStatus === 'pending';
            if (aPending && !bPending) return -1;
            if (!aPending && bPending) return 1;
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    }, [openSemLeads, activeTab, activePhase, statusFilter, searchQuery, showOnlyDelayed]);

    const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);

    const paginatedLeads = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredLeads, currentPage]);

    const paginatedLeadsWithIndex = paginatedLeads.map((lead, index) => ({
        ...lead,
        realIndex: (currentPage - 1) * ITEMS_PER_PAGE + index + 1
    }));

    const groupedLeads = useMemo(() => {
        const groups = {};
        paginatedLeadsWithIndex.forEach(lead => {
            const shiftInfo = getShiftInfo(lead.newInqTimestamp || lead.createdAt);
            if (!groups[shiftInfo.label]) groups[shiftInfo.label] = [];
            groups[shiftInfo.label].push(lead);
        });

        const sortedLabels = Object.keys(groups).sort((a, b) => {
            if (a.includes('Today')) return -1;
            if (b.includes('Today')) return 1;
            if (a.includes('Yesterday')) return -1;
            if (b.includes('Yesterday')) return 1;
            return b.localeCompare(a); 
        });

        return sortedLabels.map(label => ({
            label,
            leads: groups[label]
        }));
    }, [paginatedLeadsWithIndex]);

    // 🔥 FIX: Strict Validation for Pushing to Next Round
    const handlePushToNextRound = async (leadId, currentRound, callStatus) => {
        if (callStatus === 'pending' || !callStatus) {
            return toast.error("Please change the Call Status before pushing to next round!");
        }
        if (callStatus === 'no_answer') {
            return toast.error("Cannot push to next round. Student must be Answered or Rejected.");
        }

        const confirmPush = window.confirm(`Move this lead to Round ${currentRound + 1}?`);
        if (!confirmPush) return;
        
        const loadToast = toast.loading("Moving lead to next round...");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/bulk-action', { 
                action: 'CHANGE_ROUND', leadIds: [leadId], targetRound: currentRound + 1 
            }, { headers: { Authorization: `Bearer ${token}` }});
            
            toast.success("Lead moved to next round successfully!", { id: loadToast });
            setTimeout(() => window.location.reload(), 800);
        } catch(e) {
            toast.error("Failed to move round.", { id: loadToast });
        }
    };

    const handleLocalCallStatusChange = (lead, newStatus) => {
    // Methana callStatus eka witharak local state eke update karanna.
    handleUpdateLocalLead(lead.id, 'callStatus', newStatus);
    
    // Phase eka maru karana eka methanin ain kala. 
    // Mokada eka Save button eka obuwata passe Backend eken auto wenas karanawa.
};

    const handleRemarkTyping = (leadId, value) => {
        setDrafts(prev => ({ ...prev, [leadId]: value }));
    };

    // 🔥 අලුත් Calculation එක: දැනට ඉන්න Round එකේ Delayed ගාන හොයනවා 🔥
    const currentRoundDelayedCount = useMemo(() => {
        if (activeTab === 'ENROLLED') return 0;
        
        let roundLeads = openSemLeads.filter(l => l.enrollmentStatus !== 'ENROLLED');
        if (activeTab === 'ROUND_1') roundLeads = roundLeads.filter(l => (l.coordinationRound || 1) === 1);
        else if (activeTab === 'ROUND_2') roundLeads = roundLeads.filter(l => l.coordinationRound === 2);
        else if (activeTab === 'ROUND_3') roundLeads = roundLeads.filter(l => l.coordinationRound >= 3);
        
        return roundLeads.filter(l => {
            const tData = getTimerData(l);
            return tData && tData.isLate;
        }).length;
    }, [openSemLeads, activeTab]);

    return (
        <div className="flex flex-col h-full space-y-4 w-full text-slate-200 bg-transparent shadow-none">
            
            <CampaignHeader 
                stats={stats} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                activePhase={activePhase}
                setActivePhase={setActivePhase}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchQuery={searchQuery} 
                setSearchQuery={setSearchQuery} 
                typingMode={typingMode} 
                setTypingMode={setTypingMode} 
                showOnlyDelayed={showOnlyDelayed}
                setShowOnlyDelayed={setShowOnlyDelayed}
                currentRoundDelayedCount={currentRoundDelayedCount} // 🔥 අලුත් Prop එක යවනවා
            />

            {activeTab !== 'ENROLLED' && (
                <div className="flex gap-2 mb-1">
                    {['ALL', 1, 2, 3].map(ph => (
                        <button key={ph} onClick={() => setActivePhase(ph === 'ALL' ? 'ALL' : ph)} className={`px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${activePhase === (ph === 'ALL' ? 'ALL' : ph) ? (ph === 3 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400') : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:text-slate-300 shadow-sm'}`}>
                            {ph === 'ALL' ? 'All Phases' : `Phase ${ph}`}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 bg-transparent overflow-hidden flex flex-col shadow-none border-none">
                {groupedLeads.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
                        <FaFilter size={40} className="mb-4 opacity-20" />
                        <h3 className="text-xl font-bold mb-1 text-slate-400">No Leads Found</h3>
                        <p className="text-sm">List is empty for the selected filters.</p>
                    </div>
                ) : (
                    <div className="overflow-y-auto custom-scrollbar pr-2 space-y-6 flex-1 flex flex-col">
                        <div className="space-y-6 flex-1">
                            {groupedLeads.map((group, groupIdx) => (
                                <div key={groupIdx} className="space-y-3">
                                    <div className="sticky top-0 z-10 bg-black/60 backdrop-blur-md py-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded bg-white/10 border border-white/10 text-slate-300 flex items-center gap-2`}>
                                                {group.label}
                                                <span className="bg-black/50 text-slate-400 px-1.5 py-0.5 rounded text-[9px]">{group.leads.length}</span>
                                            </h3>
                                            <div className="h-px flex-1 bg-white/10"></div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {group.leads.map(lead => (
                                            <LeadCard 
                                                key={lead.id}
                                                lead={lead}
                                                timer={getTimerData(lead)}
                                                drafts={drafts}
                                                activeTab={activeTab}
                                                isManager={isManager}
                                                typingMode={typingMode}
                                                handleUpdateLocalLead={handleUpdateLocalLead}
                                                handleLocalCallStatusChange={handleLocalCallStatusChange}
                                                handleRemarkTyping={handleRemarkTyping}
                                                handleSaveCallData={handleSaveCallData} // 🔥 Fix Applied Here
                                                handlePushToNextRound={handlePushToNextRound}
                                                handleTempUnlock={handleTempUnlock}
                                                setChatModalLead={setChatModalLead}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 py-6 mt-4 border-t border-white/10 shrink-0">
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors">Previous</button>
                                <span className="text-xs font-bold text-slate-400 bg-white/5 border border-white/10 px-4 py-2 rounded-lg">Page <span className="text-white">{currentPage}</span> of {totalPages}</span>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors shadow-md">Next Page</button>
                            </div>
                        )}
                        <div className="h-4 shrink-0"></div>
                    </div>
                )}
            </div>
        </div>
    );
}