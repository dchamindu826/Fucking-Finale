import React, { useState, useMemo, useEffect } from 'react';
import axios from '../../../../api/axios';
import toast from 'react-hot-toast';
import { FaFilter, FaSearch, FaTimes, FaCheckCircle, FaPlus } from 'react-icons/fa';

import CampaignHeader from './CampaignHeader';
import LeadCard from './LeadCard';

const singlishToSinhala = (text) => {
    if (!text) return text;
    let s = text;
    const multiConsonants = { 'nnd': 'ඬ', 'nng': 'ඟ', 'mbb': 'ඹ', 'th': 'ත', 'Th': 'ථ', 'dh': 'ධ', 'Dh': 'ඪ', 'ch': 'ච', 'Ch': 'ඡ', 'ph': 'ඵ', 'bh': 'භ', 'sh': 'ශ', 'Sh': 'ෂ', 'gn': 'ඥ', 'kn': 'ඞ', 'ndh': 'න්ධ' };
    const singleConsonants = { 'k': 'ක', 'g': 'ග', 't': 'ට', 'd': 'ඩ', 'p': 'ප', 'b': 'බ', 'm': 'ම', 'n': 'න', 's': 'ස', 'h': 'හ', 'l': 'ල', 'r': 'ර', 'w': 'ව', 'v': 'ව', 'y': 'ය', 'j': 'ජ', 'c': 'ක', 'f': 'ෆ', 'x': 'ක්ෂ', 'z': 'ස', 'T': 'ඨ', 'D': 'ඪ', 'N': 'ණ', 'L': 'ළ', 'G': 'ඝ', 'R': 'ඍ', 'K': 'ඛ', 'P': 'ඵ', 'B': 'භ', 'M': 'ඹ', 'Y': 'ය', 'W': 'ව' };
    const vowels = { 'aa': { s: 'ා', iso: 'ආ' }, 'ae': { s: 'ැ', iso: 'ඇ' }, 'aee': { s: 'ෑ', iso: 'ඈ' }, 'a': { s: '', iso: 'අ' }, 'ii': { s: 'ී', iso: 'ඊ' }, 'i': { s: 'ි', iso: 'ඉ' }, 'uu': { s: 'ූ', iso: 'ඌ' }, 'u': { s: 'ු', iso: 'උ' }, 'oo': { s: 'ෝ', iso: 'ඕ' }, 'o': { s: 'ො', iso: 'ඔ' }, 'ou': { s: 'ෞ', iso: 'ඖ' }, 'ei': { s: 'ෛ', iso: 'ඓ' }, 'ee': { s: 'ේ', iso: 'ඒ' }, 'ea': { s: 'ේ', iso: 'ඒ' }, 'e': { s: 'ෙ', iso: 'එ' }, 'I': { s: 'ෛ', iso: 'ඓ' }, 'O': { s: 'ෞ', iso: 'ඖ' } };
    for (let v in vowels) s = s.replace(new RegExp(`(^|\\s)${v}`, 'g'), `$1${vowels[v].iso}`);
    for (let c in multiConsonants) { for (let v in vowels) s = s.replace(new RegExp(c + v, 'g'), multiConsonants[c] + vowels[v].s); s = s.replace(new RegExp(c, 'g'), multiConsonants[c] + '්'); }
    for (let c in singleConsonants) { for (let v in vowels) s = s.replace(new RegExp(c + v, 'g'), singleConsonants[c] + vowels[v].s); s = s.replace(new RegExp(c, 'g'), singleConsonants[c] + '්'); }
    s = s.replace(/ර්‍ර/g, '්‍ර'); s = s.replace(/්්/g, '්'); 
    return s;
};

const getCustomDateObject = (dateString) => {
    if (!dateString) return new Date();
    const d = new Date(dateString);
    const customDate = new Date(d);
    if (d.getHours() < 8) {
        customDate.setDate(customDate.getDate() - 1);
    }
    customDate.setHours(0, 0, 0, 0);
    return customDate;
};

const getDateHeader = (dateStr) => {
    const targetDate = new Date(dateStr);
    const now = new Date();
    const todayCustom = getCustomDateObject(now);
    
    const yesterdayCustom = new Date(todayCustom);
    yesterdayCustom.setDate(yesterdayCustom.getDate() - 1);

    if (targetDate.toDateString() === todayCustom.toDateString()) return "📅 Today";
    if (targetDate.toDateString() === yesterdayCustom.toDateString()) return "📅 Yesterday";
    return `📅 ${targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
};

export default function AfterSeminarNewInq({ leads, allBatches, filters, drafts, setDrafts, handleUpdateLocalLead, handleSaveCallData, handleTempUnlock, setChatModalLead, isManager, externalSearch }) {
    
    const safeLeads = Array.isArray(leads) ? leads : [];
    const newInqLeads = safeLeads.filter(l => l.inquiryType === 'NEW_INQ');

    const [activePhaseFilter, setActivePhaseFilter] = useState('ALL'); 
    const [activeCoordinationRound, setActiveCoordinationRound] = useState(1);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [typingMode, setTypingMode] = useState('en'); 
    
    // 🔥 DELAY FILTER STATE EKA 🔥
    const [showOnlyDelayed, setShowOnlyDelayed] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 30;

    const [showAddNumbersModal, setShowAddNumbersModal] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [addFilterStatus, setAddFilterStatus] = useState('ALL');
    const [selectedToAdd, setSelectedToAdd] = useState([]);

    const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = loggedUser?.id || 'default';
    const storageKey = `newInq_custom_rounds_${currentUserId}`;

    const [customRounds, setCustomRounds] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [];
    });

    const updateCustomRounds = (newRounds) => {
        setCustomRounds(newRounds);
        localStorage.setItem(storageKey, JSON.stringify(newRounds));
    };

    const [lastSearched, setLastSearched] = useState(null);

    useEffect(() => { 
        if (externalSearch && externalSearch !== lastSearched && newInqLeads.length > 0) {
            const query = typeof externalSearch === 'object' ? externalSearch.phone : externalSearch;
            setSearchQuery(query); 
            const targetLead = newInqLeads.find(l => l.phone === query || String(l.id) === String(query));
            if (targetLead) {
                if (targetLead.enrollmentStatus === 'ENROLLED') {
                    setActiveCoordinationRound('ENROLLED');
                } else if (targetLead.coordinationRound) {
                    setActiveCoordinationRound(targetLead.coordinationRound);
                }
                if (targetLead.phase) setActivePhaseFilter(targetLead.phase);
                setCurrentPage(1);
                setLastSearched(externalSearch);
            }
        } 
    }, [externalSearch, newInqLeads, lastSearched]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeCoordinationRound, activePhaseFilter, statusFilter, searchQuery, showOnlyDelayed]); // Add showOnlyDelayed to reset page

    const exportToExcel = () => {
        const headers = ['Name', 'Phone', 'Round', 'Phase', 'Enrollment Status', 'Payment Plan', 'Call Status', 'Feedback'];
        const rows = newInqLeads.map(l => [
            (l.name || 'Unknown').replace(/,/g, ' '),
            l.phone || '',
            l.coordinationRound || 1,
            l.phase || 1,
            l.enrollmentStatus || 'NON_ENROLLED',
            l.paymentIntention || 'NOT_DECIDED',
            l.callStatus || 'pending',
            (l.feedback || '').replace(/,/g, ' ').replace(/\n/g, ' ')
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Direct_Inquiries_Batch_${filters?.selectedBatch || 'All'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Excel File Downloaded Successfully!");
    };

    const stats = useMemo(() => {
        let st = { 
            totalAssigned: newInqLeads.length, 
            totalCovered: 0,
            totalPending: 0,
            enrolled: 0, 
            enrolledPercentage: 0,
            r1Total: 0, r1Pending: 0, r1Covered: 0, 
            r2Total: 0, r2Pending: 0, r2Covered: 0, 
            r3Total: 0, r3Pending: 0, r3Covered: 0 
        };

        newInqLeads.forEach(l => {
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
    }, [newInqLeads]);

    const calculateTimeRemaining = (lead, round) => {
        let startTime = lead.updatedAt;
        if (round === 1 && (!lead.callStatus || lead.callStatus === 'pending')) {
            startTime = lead.newInqTimestamp || lead.createdAt || lead.updatedAt;
        }

        if (!startTime) return null;
        
        const diffMs = new Date() - new Date(startTime);
        
        if (!lead.callStatus || lead.callStatus === 'pending' || lead.callStatus === 'no_answer') {
            const maxMs = 24 * 60 * 60 * 1000; 
            const msRemaining = maxMs - diffMs;

            if (msRemaining < 0) {
                const lateMs = Math.abs(msRemaining);
                const hrs = Math.floor(lateMs / (1000 * 60 * 60));
                const mins = Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60));
                return { text: `-${hrs}h ${mins}m LATE`, isLate: true, state: 'CALL_PENDING' };
            } else {
                const hrs = Math.floor(msRemaining / (1000 * 60 * 60));
                const mins = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
                return { text: `${hrs}h ${mins}m LEFT`, isLate: false, state: 'CALL_PENDING' };
            }
        } 
        else {
            const maxMs = 5 * 24 * 60 * 60 * 1000;
            const msRemaining = maxMs - diffMs;

            if (msRemaining <= 0) {
                return { text: `READY FOR R${round + 1}`, isLate: false, state: 'READY', ready: true };
            } else {
                const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
                const hrs = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                return { text: `NEXT IN ${days}d ${hrs}h`, isLate: false, state: 'WAITING' };
            }
        }
    };

    // 🔥 CURRENT ROUND DELAY COUNT 🔥
    const currentRoundDelayedCount = useMemo(() => {
        if (activeCoordinationRound === 'ENROLLED') return 0;
        
        let roundLeads = newInqLeads.filter(l => l.enrollmentStatus !== 'ENROLLED');
        roundLeads = roundLeads.filter(l => (l.coordinationRound || 1) === activeCoordinationRound);
        
        return roundLeads.filter(l => {
            const tData = calculateTimeRemaining(l, activeCoordinationRound);
            return tData && tData.isLate;
        }).length;
    }, [newInqLeads, activeCoordinationRound]);

    const filteredLeads = useMemo(() => {
        let filtered = newInqLeads;

        if (activeCoordinationRound === 'ENROLLED') {
            filtered = filtered.filter(l => l.enrollmentStatus === 'ENROLLED');
        } else {
            filtered = filtered.filter(l => l.enrollmentStatus !== 'ENROLLED');
            filtered = filtered.filter(l => {
                return (l.coordinationRound || 1) === activeCoordinationRound;
            });
        }

        if (activePhaseFilter !== 'ALL') {
            filtered = filtered.filter(l => l.phase === activePhaseFilter);
        }

        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(l => {
                if (statusFilter === 'pending') return !l.callStatus || l.callStatus === 'pending';
                return l.callStatus === statusFilter;
            });
        }

        // 🔥 APPLY DELAY FILTER 🔥
        if (showOnlyDelayed && activeCoordinationRound !== 'ENROLLED') {
            filtered = filtered.filter(l => {
                const tData = calculateTimeRemaining(l, activeCoordinationRound);
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
    }, [newInqLeads, activePhaseFilter, activeCoordinationRound, statusFilter, searchQuery, showOnlyDelayed]);

    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
    const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const paginatedLeadsWithIndex = paginatedLeads.map((lead, index) => ({
        ...lead,
        realIndex: (currentPage - 1) * itemsPerPage + index + 1
    }));

    const groupedLeads = useMemo(() => {
        const groups = {};
        paginatedLeadsWithIndex.forEach(lead => {
            const customDate = getCustomDateObject(lead.newInqTimestamp || lead.createdAt).toLocaleDateString('en-CA');
            if (!groups[customDate]) groups[customDate] = [];
            groups[customDate].push(lead);
        });

        const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));
        return sortedDates.map(dateStr => ({
            dateStr,
            headerLabel: getDateHeader(dateStr),
            leads: groups[dateStr]
        }));
    }, [paginatedLeadsWithIndex]);

    const handleRemarkChangeLocal = (leadId, value) => {
        let finalValue = value;
        if (typingMode === 'si-phonetic') {
            const words = value.split(' ');
            const lastWord = words.pop();
            if (!/\d/.test(lastWord) && lastWord.length > 0) finalValue = [...words, singlishToSinhala(lastWord)].join(' ');
        }
        setDrafts(prev => ({ ...prev, [leadId]: finalValue }));
        localStorage.setItem(`draft_remark_as_${leadId}`, finalValue);
    };

    const handleLocalCallStatusChange = (lead, newStatus) => {
        handleUpdateLocalLead(lead.id, 'callStatus', newStatus);
    };

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

    const addCustomRound = async () => {
        const name = window.prompt("Enter new custom campaign name:");
        if (name && name.trim()) {
            const nextRoundNum = Math.max(3, ...customRounds.map(r => r.roundNum), 3) + 1; 
            const moveLeads = window.confirm(`Do you want to move all currently NON-ENROLLED leads to this new '${name}' campaign?`);
            
            if (moveLeads) {
                const loadToast = toast.loading("Assigning non-enrolled leads...");
                try {
                    const token = localStorage.getItem('token');
                    await axios.post('/after-seminar-crm/leads/bulk-action', { action: 'CHANGE_ROUND', leadIds: newInqLeads.filter(l=>l.enrollmentStatus!=='ENROLLED').map(l=>l.id), targetRound: nextRoundNum }, { headers: { Authorization: `Bearer ${token}` }});
                    toast.success("Leads moved successfully!", { id: loadToast });
                    setTimeout(() => window.location.reload(), 800);
                } catch(e) { toast.error("Failed to move leads.", { id: loadToast }); }
            }
            updateCustomRounds([...customRounds, { roundNum: nextRoundNum, name: name.trim() }]);
        }
    };

    const removeCustomRound = async (roundNum, e) => {
        e.stopPropagation();
        if (window.confirm("Delete this custom campaign? All leads inside this will be moved back to the 1st Round.")) {
            const loadToast = toast.loading("Reverting leads back to 1st Round...");
            try {
                const token = localStorage.getItem('token');
                await axios.post('/after-seminar-crm/leads/revert-round', { roundToDelete: roundNum, targetRound: 1, inquiryType: 'NEW_INQ' }, { headers: { Authorization: `Bearer ${token}` }});
                updateCustomRounds(customRounds.filter(r => r.roundNum !== roundNum));
                if (activeCoordinationRound === roundNum) setActiveCoordinationRound(1);
                toast.success("Campaign deleted & leads reverted!", { id: loadToast });
                setTimeout(() => window.location.reload(), 800);
            } catch(err) { toast.error("Failed to revert leads.", { id: loadToast }); }
        }
    };

    const availableLeadsToAdd = newInqLeads.filter(l => {
        const notInCurrentRound = (l.coordinationRound || 1) !== activeCoordinationRound;
        const matchesSearchTxt = l.phone.includes(addSearch) || (l.name && l.name.toLowerCase().includes(addSearch.toLowerCase()));
        let matchesStatus = true;
        if (addFilterStatus === 'ENROLLED') matchesStatus = l.enrollmentStatus === 'ENROLLED';
        if (addFilterStatus === 'NON_ENROLLED') matchesStatus = l.enrollmentStatus !== 'ENROLLED';
        return notInCurrentRound && matchesSearchTxt && matchesStatus;
    });

    const toggleAddSelect = (id) => {
        if(selectedToAdd.includes(id)) setSelectedToAdd(selectedToAdd.filter(x => x !== id));
        else setSelectedToAdd([...selectedToAdd, id]);
    };

    const handleAddNumbersSubmit = async () => {
        if(selectedToAdd.length === 0) return toast.error("Select at least one lead");
        const loadToast = toast.loading("Adding numbers to campaign...");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/bulk-action', { action: 'CHANGE_ROUND', leadIds: selectedToAdd, targetRound: activeCoordinationRound }, { headers: { Authorization: `Bearer ${token}` }});
            
            selectedToAdd.forEach(id => {
                handleUpdateLocalLead(id, 'coordinationRound', activeCoordinationRound);
                handleUpdateLocalLead(id, 'phase', 1);
                handleUpdateLocalLead(id, 'callStatus', 'pending');
            });
            toast.success("Numbers added successfully!", { id: loadToast });
            setShowAddNumbersModal(false);
            setSelectedToAdd([]);
        } catch(e) {
            toast.error("Locally Added! (Backend bulk update may be needed)", { id: loadToast });
            setShowAddNumbersModal(false);
            setSelectedToAdd([]);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4 w-full text-slate-200">
            <CampaignHeader 
                stats={stats} 
                activeCoordinationRound={activeCoordinationRound}
                setActiveCoordinationRound={setActiveCoordinationRound}
                customRounds={customRounds}
                removeCustomRound={removeCustomRound}
                addCustomRound={addCustomRound}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchQuery={searchQuery} 
                setSearchQuery={setSearchQuery} 
                typingMode={typingMode} 
                setTypingMode={setTypingMode}
                exportToExcel={exportToExcel}
                showOnlyDelayed={showOnlyDelayed}
                setShowOnlyDelayed={setShowOnlyDelayed}
                currentRoundDelayedCount={currentRoundDelayedCount}
            />

            {/* PHASE SUB-NAVIGATION */}
            {activeCoordinationRound !== 'ENROLLED' && (
                <div className="flex gap-2 mb-2">
                    {['ALL', 1, 2, 3].map(ph => (
                        <button key={ph} onClick={() => {setActivePhaseFilter(ph); setCurrentPage(1);}} className={`px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${activePhaseFilter === (ph === 'ALL' ? 'ALL' : ph) ? (ph === 3 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400') : 'bg-[#111827] border-slate-800 text-slate-500 hover:bg-slate-800 hover:text-slate-300 shadow-sm'}`}>
                            {ph === 'ALL' ? 'All Phases' : `Phase ${ph}`}
                        </button>
                    ))}
                    {activeCoordinationRound > 3 && (
                        <button onClick={() => setShowAddNumbersModal(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 ml-auto">
                            <FaPlus size={10}/> Add Numbers
                        </button>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col">
                {groupedLeads.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500 bg-[#111827] rounded-2xl border border-slate-800">
                        <FaFilter size={40} className="mb-4 opacity-20" />
                        <h3 className="text-xl font-bold mb-1 text-slate-400">No Leads Found</h3>
                        <p className="text-sm">List is empty for the selected filters.</p>
                    </div>
                ) : (
                    <div className="overflow-y-auto custom-scrollbar pr-2 space-y-6 flex-1 flex flex-col">
                        <div className="space-y-6 flex-1">
                            {groupedLeads.map((group, groupIdx) => (
                                <div key={groupIdx} className="space-y-3">
                                    <div className="sticky top-0 z-10 bg-[#0f151c]/95 backdrop-blur-sm py-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded bg-[#111827] border border-slate-800 text-slate-300 flex items-center gap-2`}>
                                                {group.headerLabel}
                                                <span className="bg-black/50 text-slate-400 px-1.5 py-0.5 rounded text-[9px]">{group.leads.length}</span>
                                            </h3>
                                            <div className="h-px flex-1 bg-slate-800"></div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {group.leads.map(lead => {
                                            const timeData = calculateTimeRemaining(lead, activeCoordinationRound);
                                            const invalidPending = lead.isLocked && lead.callStatus === 'pending';
                                            const isDelayed = lead.isLocked || (timeData?.state === 'CALL_PENDING' && timeData?.isLate);

                                            return (
                                                <LeadCard 
                                                    key={lead.id}
                                                    lead={lead}
                                                    timeData={timeData}
                                                    isLate={timeData?.isLate}
                                                    drafts={drafts}
                                                    activeTab={activeCoordinationRound}
                                                    isManager={isManager}
                                                    typingMode={typingMode}
                                                    handleUpdateLocalLead={handleUpdateLocalLead}
                                                    handleLocalCallStatusChange={handleLocalCallStatusChange}
                                                    handleRemarkTyping={handleRemarkChangeLocal}
                                                    handleSaveCallData={() => handleSaveCallData(lead.id)}
                                                    handleTempUnlock={handleTempUnlock}
                                                    setChatModalLead={setChatModalLead}
                                                    handlePushToNextRound={handlePushToNextRound}
                                                    invalidPending={invalidPending}
                                                    isDelayed={isDelayed}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 py-6 mt-4 border-t border-slate-800 shrink-0">
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-5 py-2.5 rounded-lg bg-[#111827] border border-slate-800 text-slate-300 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors">Previous</button>
                                <span className="text-xs font-bold text-slate-400 bg-[#111827] px-4 py-2 rounded-lg border border-slate-800">Page <span className="text-white">{currentPage}</span> of {totalPages}</span>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors shadow-md">Next Page</button>
                            </div>
                        )}
                        <div className="h-4 shrink-0"></div>
                    </div>
                )}
            </div>

            {/* ADD NUMBERS MODAL */}
            {showAddNumbersModal && (
                <div className="absolute inset-0 z-50 bg-[#0f151c]/95 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
                    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FaPlus className="text-emerald-500"/> Add Numbers to Round {activeCoordinationRound > 3 ? customRounds.find(r => r.roundNum === activeCoordinationRound)?.name : activeCoordinationRound}</h3>
                            </div>
                            <button onClick={() => setShowAddNumbersModal(false)} className="text-slate-500 hover:text-white bg-slate-800 hover:bg-red-500/20 hover:text-red-400 p-2 rounded-lg transition-colors"><FaTimes/></button>
                        </div>

                        <div className="flex gap-3 mb-4 shrink-0">
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-3 top-2.5 text-slate-500 text-sm" />
                                <input type="text" placeholder="Search unassigned numbers..." value={addSearch} onChange={(e) => setAddSearch(e.target.value)} className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-indigo-500" />
                            </div>
                            <select value={addFilterStatus} onChange={(e) => setAddFilterStatus(e.target.value)} className="bg-[#0b0e14] border border-slate-800 rounded-lg px-3 text-xs font-semibold text-slate-300 outline-none cursor-pointer focus:border-indigo-500 appearance-none">
                                <option value="ALL">All Leads</option>
                                <option value="ENROLLED">Enrolled Only</option>
                                <option value="NON_ENROLLED">Non-Enrolled Only</option>
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-800 rounded-xl p-2 bg-[#0b0e14]">
                            {availableLeadsToAdd.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 text-xs font-bold uppercase tracking-widest">No leads found matching your search.</div>
                            ) : (
                                availableLeadsToAdd.map(lead => (
                                    <div key={lead.id} onClick={() => toggleAddSelect(lead.id)} className={`flex items-center justify-between p-3 rounded-lg mb-1.5 cursor-pointer transition-colors border ${selectedToAdd.includes(lead.id) ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#111827] border-slate-800 hover:border-slate-700'}`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className={`text-sm font-bold tracking-wide ${selectedToAdd.includes(lead.id) ? 'text-emerald-400' : 'text-slate-200'}`}>{lead.phone}</h4>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${lead.enrollmentStatus === 'ENROLLED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {lead.enrollmentStatus === 'ENROLLED' ? 'ENROLLED' : 'NON-ENROLLED'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{lead.name || 'Unknown'}</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedToAdd.includes(lead.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'}`}>
                                            {selectedToAdd.includes(lead.id) && <FaCheckCircle className="text-white" size={12}/>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-5 shrink-0 flex justify-between items-center gap-4 border-t border-slate-800 pt-4">
                            <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg">{selectedToAdd.length} leads selected</span>
                            <button disabled={selectedToAdd.length === 0} onClick={handleAddNumbersSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md">
                                Add Selected Leads
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}