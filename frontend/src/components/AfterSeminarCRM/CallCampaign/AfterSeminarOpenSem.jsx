import React, { useState, useMemo, useEffect } from 'react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { FaSearch, FaKeyboard, FaSave, FaCommentDots, FaPlus, FaTimes, FaLock, FaCheckCircle, FaChartPie, FaChevronUp, FaChevronDown, FaPhoneVolume, FaExclamationTriangle, FaUnlock, FaFileExport, FaWallet } from 'react-icons/fa';

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

export default function AfterSeminarOpenSem({ leads, allBatches, filters, drafts, setDrafts, handleUpdateLocalLead, handleSaveCallData, handleTempUnlock, setChatModalLead, isManager, externalSearch }) {
    const [activePhaseFilter, setActivePhaseFilter] = useState(1); 
    const [activeCoordinationRound, setActiveCoordinationRound] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [typingMode, setTypingMode] = useState('en'); 
    const [currentPage, setCurrentPage] = useState(1);
    const [showStats, setShowStats] = useState(true); // 🔥 Stats Hide/Show State
    const itemsPerPage = 50;

    const [showAddNumbersModal, setShowAddNumbersModal] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [addFilterStatus, setAddFilterStatus] = useState('ALL');
    const [selectedToAdd, setSelectedToAdd] = useState([]);

    const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = loggedUser?.id || 'default';
    const storageKey = `openSem_custom_rounds_${currentUserId}`;

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
      if (externalSearch && externalSearch !== lastSearched && leads.length > 0) {
          // Object එකක් ආවත් String එකක් ආවත් Phone Number එක ගන්නවා
          const query = typeof externalSearch === 'object' ? externalSearch.phone : externalSearch;
          setSearchQuery(query); 
          
          // 🔥 MAGIC: ළමයා ඉන්න Round එකටයි Phase එකටයි Auto මාරු වෙනවා 🔥
          const targetLead = leads.find(l => l.phone === query || String(l.id) === String(query));
          if (targetLead) {
              if (targetLead.coordinationRound) setActiveCoordinationRound(targetLead.coordinationRound);
              if (targetLead.phase) setActivePhaseFilter(targetLead.phase);
              setCurrentPage(1); // Page 1 එකට ගන්නවා
              setLastSearched(externalSearch); // එක පාරක් කරාම නවතිනවා
          }
      } 
  }, [externalSearch, leads, lastSearched]);

    const openSemLeads = leads.filter(l => l.inquiryType === 'OPEN_SEMINAR' || l.inquiryType === 'NORMAL');

    // EXPORT TO EXCEL / CSV FUNCTION
    const exportToExcel = () => {
        const headers = ['Name', 'Phone', 'Round', 'Phase', 'Enrollment Status', 'Payment Plan', 'Call Status', 'Feedback'];
        const rows = openSemLeads.map(l => [
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
        link.setAttribute("download", `Open_Seminar_Leads_Batch_${filters?.selectedBatch || 'All'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Excel File Downloaded Successfully!");
    };

    // OVERALL PAYMENT STATS
    const paymentStats = useMemo(() => {
        let stats = { FULL: 0, MONTHLY: 0, INSTALLMENT: 0, NON_ENROLLED: 0 };
        openSemLeads.forEach(l => {
            if (l.enrollmentStatus === 'ENROLLED') {
                if (l.paymentIntention === 'FULL') stats.FULL++;
                else if (l.paymentIntention === 'MONTHLY') stats.MONTHLY++;
                else if (l.paymentIntention === 'INSTALLMENT') stats.INSTALLMENT++;
            } else {
                stats.NON_ENROLLED++;
            }
        });
        return stats;
    }, [openSemLeads]);

    // 🔥 REAL-TIME ROUND STATS (Based on Active Round)
    const roundStats = useMemo(() => {
        const leadsInActiveRound = openSemLeads.filter(l => {
            if (activeCoordinationRound === 2 && l.needs5DayCall && (l.coordinationRound || 1) < 2) return true;
            if (activeCoordinationRound === 3 && l.needs10DayCall && (l.coordinationRound || 1) < 3) return true;
            return (l.coordinationRound || 1) === activeCoordinationRound;
        });

        let assigned = leadsInActiveRound.length;
        let pending = 0;
        let answered = 0;

        leadsInActiveRound.forEach(l => {
            if (!l.callStatus || l.callStatus === 'pending') pending++;
            if (l.callStatus === 'answered') answered++;
        });

        let covered = assigned - pending;
        let responseRate = assigned > 0 ? Math.round((answered / assigned) * 100) : 0;

        return { assigned, covered, pending, answered, responseRate };
    }, [openSemLeads, activeCoordinationRound]);

    // DATE LOGIC: 8 AM TO 8 AM
    const getCustomDateObject = (dateString) => {
        const d = new Date(dateString);
        const customDate = new Date(d);
        if (d.getHours() < 8) {
            customDate.setDate(customDate.getDate() - 1);
        }
        customDate.setHours(0, 0, 0, 0);
        return customDate;
    };

    const calculateTimeRemaining = (lead, round) => {
        const startTime = round === 1 ? lead.newInqTimestamp : lead.updatedAt;
        if (!startTime) return null;
        const diffMs = new Date() - new Date(startTime);
        let maxHours = round === 2 ? 120 : round === 3 ? 240 : 24; 
        if (round > 3) return null;
        const msRemaining = (maxHours * 60 * 60 * 1000) - diffMs;

        if (msRemaining < 0) {
            const lateMs = Math.abs(msRemaining);
            const hrs = Math.floor(lateMs / (1000 * 60 * 60));
            const mins = Math.floor((lateMs % (1000 * 60 * 60)) / (1000 * 60));
            return { text: `-${hrs}h ${mins}m LATE`, isLate: true };
        } else {
            const days = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
            const hrs = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
            if (days > 0) return { text: `${days}d ${hrs}h left`, isLate: false };
            return { text: `${hrs}h ${mins}m left`, isLate: false };
        }
    };

    let filteredLeads = openSemLeads.filter(l => {
        const matchesPhase = activePhaseFilter === 'ALL' || l.phase === activePhaseFilter;
        let matchesRound = false;
        if (activeCoordinationRound === 2 && l.needs5DayCall && (l.coordinationRound || 1) < 2) matchesRound = true;
        else if (activeCoordinationRound === 3 && l.needs10DayCall && (l.coordinationRound || 1) < 3) matchesRound = true;
        else matchesRound = (l.coordinationRound || 1) === activeCoordinationRound;

        const matchesSearch = l.phone.includes(searchQuery) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesPhase && matchesRound && matchesSearch;
    });

    filteredLeads.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
    const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

    const addCustomRound = async () => {
        const name = window.prompt("Enter new custom campaign name:");
        if (name && name.trim()) {
            const nextRoundNum = Math.max(3, ...customRounds.map(r => r.roundNum), 3) + 1; 
            const moveLeads = window.confirm(`Do you want to move all currently NON-ENROLLED leads to this new '${name}' campaign?`);
            
            if (moveLeads) {
                const loadToast = toast.loading("Assigning non-enrolled leads...");
                try {
                    const token = localStorage.getItem('token');
                    await axios.post('/after-seminar-crm/leads/move-round', { targetRound: nextRoundNum, inquiryType: 'OPEN_SEMINAR' }, { headers: { Authorization: `Bearer ${token}` }});
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
                await axios.post('/after-seminar-crm/leads/revert-round', { roundToDelete: roundNum, targetRound: 1, inquiryType: 'OPEN_SEMINAR' }, { headers: { Authorization: `Bearer ${token}` }});
                updateCustomRounds(customRounds.filter(r => r.roundNum !== roundNum));
                if (activeCoordinationRound === roundNum) setActiveCoordinationRound(1);
                toast.success("Campaign deleted & leads reverted!", { id: loadToast });
                setTimeout(() => window.location.reload(), 800);
            } catch(err) { toast.error("Failed to revert leads.", { id: loadToast }); }
        }
    };

    // Filter Logic For Custom Rounds Modal
    const availableLeadsToAdd = openSemLeads.filter(l => {
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

            toast.success("Numbers added successfully to Phase 1!", { id: loadToast });
            setShowAddNumbersModal(false);
            setSelectedToAdd([]);
        } catch(e) {
            toast.error("Locally Added! (Backend bulk update may be needed)", { id: loadToast });
            selectedToAdd.forEach(id => {
                handleUpdateLocalLead(id, 'coordinationRound', activeCoordinationRound);
                handleUpdateLocalLead(id, 'phase', 1);
                handleUpdateLocalLead(id, 'callStatus', 'pending');
            });
            setShowAddNumbersModal(false);
            setSelectedToAdd([]);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4 animate-fade-in relative">
            
            {/* HEADER & EXPORT & TOGGLE */}
            <div className="flex justify-between items-center bg-[#141a23] p-4 rounded-2xl border border-slate-800 shadow-md">
                <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Campaign Workspace</p>
                    <h2 className="text-xl font-bold text-white mt-1">
                        {filters?.selectedBatch ? allBatches.find(b => String(b.id) === String(filters.selectedBatch))?.name || 'Selected Batch' : 'All Batches'}
                    </h2>
                </div>
                <div className="flex gap-2">
                    {/* 🔥 Toggle Stats Button 🔥 */}
                    <button onClick={() => setShowStats(!showStats)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all">
                        {showStats ? <><FaChevronUp size={12}/> Hide Stats</> : <><FaChevronDown size={12}/> Show Stats</>}
                    </button>
                    <button onClick={exportToExcel} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-transform hover:scale-105">
                        <FaFileExport size={14}/> Export Leads
                    </button>
                </div>
            </div>

            {/* 🔥 NEW STATS DASHBOARD (Collapsible) */}
            {showStats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 transition-all duration-300 origin-top">
                    
                    {/* 1. Round Execution Stats */}
                    <div className="bg-[#141a23] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <h3 className="text-slate-300 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                            <FaChartPie className="text-indigo-400 text-lg"/> 
                            Round {activeCoordinationRound > 3 ? customRounds.find(r=>r.roundNum === activeCoordinationRound)?.name || activeCoordinationRound : activeCoordinationRound} Execution
                        </h3>
                        
                        <div className="grid grid-cols-4 gap-3 relative z-10">
                            <div className="bg-[#0b0e14] p-3 rounded-xl border border-slate-700/50 text-center flex flex-col justify-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Assigned</span>
                                <span className="text-2xl font-black text-white">{roundStats.assigned}</span>
                            </div>
                            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center flex flex-col justify-center">
                                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-1">Covered</span>
                                <span className="text-2xl font-black text-emerald-400">{roundStats.covered}</span>
                            </div>
                            <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-center flex flex-col justify-center">
                                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mb-1">Pending</span>
                                <span className="text-2xl font-black text-rose-400">{roundStats.pending}</span>
                            </div>
                            <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-center flex flex-col justify-center">
                                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Conv. Rate</span>
                                <span className="text-2xl font-black text-blue-400">{roundStats.responseRate}%</span>
                            </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-[#0b0e14] rounded-full h-1.5 mt-4 border border-slate-800 overflow-hidden relative z-10">
                            <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${roundStats.assigned > 0 ? (roundStats.covered / roundStats.assigned) * 100 : 0}%` }}></div>
                        </div>
                    </div>

                    {/* 2. Overall Payment Stats */}
                    <div className="bg-[#141a23] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mb-10"></div>
                        <h3 className="text-slate-300 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                            <FaWallet className="text-emerald-400 text-lg"/> Overall Payment Breakdown
                        </h3>
                        <div className="grid grid-cols-4 gap-3 relative z-10">
                            <div className="bg-[#0b0e14] p-3 rounded-xl border border-slate-700/50 text-center flex flex-col justify-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Full Pay</span>
                                <span className="text-xl font-black text-emerald-400">{paymentStats.FULL}</span>
                            </div>
                            <div className="bg-[#0b0e14] p-3 rounded-xl border border-slate-700/50 text-center flex flex-col justify-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Monthly</span>
                                <span className="text-xl font-black text-blue-400">{paymentStats.MONTHLY}</span>
                            </div>
                            <div className="bg-[#0b0e14] p-3 rounded-xl border border-slate-700/50 text-center flex flex-col justify-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Install</span>
                                <span className="text-xl font-black text-amber-400">{paymentStats.INSTALLMENT}</span>
                            </div>
                            <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/20 text-center flex flex-col justify-center">
                                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mb-1">Pending</span>
                                <span className="text-xl font-black text-rose-400">{paymentStats.NON_ENROLLED}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ROUND SELECTION TABS */}
            <div className="flex gap-2 bg-[#141a23] p-2 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar shadow-sm">
                <button onClick={() => {setActiveCoordinationRound(1); setCurrentPage(1);}} className={`flex-shrink-0 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeCoordinationRound === 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-slate-400 hover:bg-[#0b0e14] hover:text-white'}`}>
                    1st Round (24H)
                </button>
                <button onClick={() => {setActiveCoordinationRound(2); setCurrentPage(1);}} className={`flex-shrink-0 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeCoordinationRound === 2 ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-slate-400 hover:bg-[#0b0e14] hover:text-white'}`}>
                    2nd Round (5 Days)
                </button>
                <button onClick={() => {setActiveCoordinationRound(3); setCurrentPage(1);}} className={`flex-shrink-0 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeCoordinationRound === 3 ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-slate-400 hover:bg-[#0b0e14] hover:text-white'}`}>
                    3rd Round (10 Days)
                </button>

                {customRounds.map(r => (
                    <div key={r.roundNum} className="flex items-center group bg-[#0b0e14] rounded-lg border border-slate-800/50">
                        <button onClick={() => {setActiveCoordinationRound(r.roundNum); setCurrentPage(1);}} className={`flex-shrink-0 px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-l-lg ${activeCoordinationRound === r.roundNum ? 'bg-amber-600 text-white shadow-md' : 'bg-transparent text-amber-500 hover:text-white'}`}>
                            {r.name}
                        </button>
                        <button onClick={(e) => removeCustomRound(r.roundNum, e)} className="px-3 py-2.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-r-lg transition-all"><FaTimes size={12}/></button>
                    </div>
                ))}
                
                <button onClick={addCustomRound} className="flex-shrink-0 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2 ml-auto"><FaPlus size={10}/> Add Custom Round</button>
            </div>

            {/* FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#141a23] p-2 rounded-xl border border-slate-800">
                 <div className="flex bg-[#0b0e14] p-1 rounded-lg w-full md:w-auto">
                    {[1, 2, 3, 'ALL'].map(ph => (
                        <button key={ph} onClick={() => {setActivePhaseFilter(ph); setCurrentPage(1);}} className={`px-6 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${activePhaseFilter === ph ? (ph === 3 ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-700 text-white shadow-md') : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                            {ph === 'ALL' ? 'ALL' : `Phase ${ph}`}
                        </button>
                    ))}
                </div>

                {activeCoordinationRound > 3 && (
                    <button onClick={() => setShowAddNumbersModal(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center gap-2">
                        <FaPlus size={12}/> Add Numbers
                    </button>
                )}

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <FaSearch className="absolute left-3 top-2.5 text-slate-500 text-sm" />
                        <input type="text" placeholder="Search numbers or name..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div className="relative w-28">
                        <FaKeyboard className="absolute left-3 top-2.5 text-slate-500 text-sm" />
                        <select value={typingMode} onChange={(e) => setTypingMode(e.target.value)} className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg py-2 pl-9 pr-2 text-[11px] font-semibold text-slate-300 outline-none appearance-none cursor-pointer focus:border-indigo-500 transition-colors">
                            <option className="bg-slate-900 text-white" value="en">English</option>
                            <option className="bg-slate-900 text-white" value="si-phonetic">Sinhala</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* LIST */}
            <div className="flex-1 bg-[#141a23] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
                <div className="overflow-y-auto custom-scrollbar p-3 space-y-3 flex-1">
                    {paginatedLeads.length === 0 ? <div className="text-center py-16 text-slate-500 text-sm font-medium bg-[#0b0e14] rounded-xl border border-slate-800/50 m-2">No Leads found for this round/phase.</div> : (
                        paginatedLeads.map((lead, index) => {
                            const realIndex = (currentPage - 1) * itemsPerPage + index + 1;
                            const currentRemark = drafts[lead.id] !== undefined ? drafts[lead.id] : (lead.feedback || '');
                            const timeData = calculateTimeRemaining(lead, activeCoordinationRound);
                            const isLate = timeData?.isLate;
                            
                            const isLocked = lead.isLocked || false; 
                            const isDelayed = lead.isLocked || lead.needs5DayCall || lead.needs10DayCall; 
                            const invalidPending = lead.isLocked && lead.callStatus === 'pending';

                            // 🔥 8 AM to 8 AM Custom Date Logic (Text update) 🔥
                            const currentLeadCustomDate = getCustomDateObject(lead.updatedAt || lead.createdAt).toLocaleDateString('en-CA');
                            const prevLeadCustomDate = index > 0 ? getCustomDateObject(paginatedLeads[index - 1].updatedAt || paginatedLeads[index - 1].createdAt).toLocaleDateString('en-CA') : null;
                            const showDateHeader = currentLeadCustomDate !== prevLeadCustomDate;

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

                            return (
                                <React.Fragment key={lead.id}>
                                    {showDateHeader && (
                                        <div className="flex items-center gap-3 my-6 first:mt-2">
                                            <div className="h-px flex-1 bg-slate-700/50"></div>
                                            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest bg-[#0b0e14] px-5 py-2 rounded-full border border-indigo-500/20 shadow-md">
                                                {getDateHeader(currentLeadCustomDate)}
                                            </span>
                                            <div className="h-px flex-1 bg-slate-700/50"></div>
                                        </div>
                                    )}

                                    <div className={`bg-[#0f151c] border p-3.5 rounded-xl flex flex-col xl:flex-row items-center gap-4 transition-colors relative
                                        ${isDelayed ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-slate-700/50 hover:border-slate-600'}
                                    `}>
                                        
                                        {isDelayed && (
                                            <div className="absolute -top-2.5 -right-2.5 bg-red-600 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1 animate-pulse z-10 border border-[#0f151c]">
                                                <FaExclamationTriangle size={10} /> Delayed Call
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 w-full xl:w-60 shrink-0">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-inner ${isDelayed ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'}`}>
                                                {realIndex}
                                            </div>
                                            <div>
                                                <h4 className={`font-black text-sm ${isDelayed ? 'text-red-400' : 'text-white'}`}>{lead.phone}</h4>
                                                <p className="text-[10px] text-slate-400 truncate w-40 mt-0.5" title={lead.name}>{lead.name || 'No Name Provided'}</p>
                                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                    <span className={`${isDelayed ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-300'} px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors shadow-sm`}>P{lead.phase} | R{lead.coordinationRound || 1}</span>
                                                    {timeData && (
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 shadow-sm ${isLate ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                            {isLate ? <FaExclamationTriangle size={8}/> : '⏳'} {timeData.text}
                                                        </span>
                                                    )}
                                                    {lead.needs5DayCall && activeCoordinationRound === 1 && <span className="bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1"><FaPhoneVolume size={8}/> 5-DAY PEND</span>}
                                                    {lead.needs10DayCall && activeCoordinationRound < 3 && <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1"><FaPhoneVolume size={8}/> 10-DAY PEND</span>}
                                                    {isLocked && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1"><FaLock size={8}/> LOCKED</span>}
                                                    {isLocked && isManager && <button onClick={() => handleTempUnlock(lead.id)} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white px-1.5 py-0.5 rounded text-[9px] font-bold transition-all"><FaUnlock size={8}/></button>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 w-full flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-[#1a2332] rounded-lg border border-slate-700/50 flex items-center px-3 py-1 shadow-inner focus-within:border-indigo-500 transition-colors">
                                                    <span className="text-[10px] text-slate-400 mr-2 font-bold uppercase tracking-wider shrink-0">Group:</span>
                                                    <select disabled={isLocked} value={lead.paymentIntention || 'NOT_DECIDED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'paymentIntention', e.target.value)} className="bg-transparent text-xs font-bold text-white outline-none w-full py-1.5 cursor-pointer disabled:opacity-50">
                                                        <option className="bg-[#1a2332] text-slate-300" value="NOT_DECIDED">Not Decided</option>
                                                        <option className="bg-[#1a2332] text-emerald-400" value="FULL">Full Payment</option>
                                                        <option className="bg-[#1a2332] text-blue-400" value="MONTHLY">Monthly</option>
                                                        <option className="bg-[#1a2332] text-amber-400" value="INSTALLMENT">Installment</option>
                                                    </select>
                                                </div>
                                                <div className="flex-1 bg-[#1a2332] rounded-lg border border-slate-700/50 flex items-center px-3 py-1 shadow-inner focus-within:border-emerald-500 transition-colors">
                                                    <span className="text-[10px] text-slate-400 mr-2 font-bold uppercase tracking-wider shrink-0">Status:</span>
                                                    <select disabled={isLocked} value={lead.enrollmentStatus || 'NON_ENROLLED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'enrollmentStatus', e.target.value)} className="bg-transparent text-xs font-bold text-white outline-none w-full py-1.5 cursor-pointer disabled:opacity-50">
                                                        <option className="bg-[#1a2332] text-rose-400" value="NON_ENROLLED">Non-Enrolled</option>
                                                        <option className="bg-[#1a2332] text-emerald-400" value="ENROLLED">🔥 Enrolled</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <textarea disabled={isLocked} value={currentRemark} onChange={(e) => handleRemarkChangeLocal(lead.id, e.target.value)} placeholder="Type your remark here..." rows="1" className={`w-full bg-[#1a2332] rounded-lg border shadow-inner ${invalidPending ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700/50 focus:border-indigo-500'} text-xs text-slate-200 p-3 outline-none resize-none transition-colors custom-scrollbar disabled:opacity-50`} />
                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <select disabled={isLocked} value={lead.callMethod || 'direct'} onChange={(e) => handleUpdateLocalLead(lead.id, 'callMethod', e.target.value)} className="bg-[#1a2332] text-[11px] font-bold text-slate-300 border border-slate-700/50 rounded-lg px-2.5 py-3 outline-none cursor-pointer disabled:opacity-50 shadow-inner focus:border-indigo-500">
                                                <option className="bg-[#1a2332]" value="direct">Direct Call</option>
                                                <option className="bg-[#1a2332]" value="whatsapp">WhatsApp</option>
                                                <option className="bg-[#1a2332]" value="3cx">3CX Call</option>
                                            </select>

                                            <select disabled={isLocked} value={lead.callAttempt || 1} onChange={(e) => handleUpdateLocalLead(lead.id, 'callAttempt', parseInt(e.target.value))} className="bg-[#1a2332] text-[11px] font-bold text-slate-300 border border-slate-700/50 rounded-lg px-2.5 py-3 outline-none cursor-pointer disabled:opacity-50 shadow-inner focus:border-indigo-500">
                                                {[1,2,3,4,5,6,7,8,9,10].map(r => <option className="bg-[#1a2332]" key={r} value={r}>Attempt {r}</option>)}
                                            </select>

                                            <select onChange={(e) => handleUpdateLocalLead(lead.id, 'callStatus', e.target.value)} value={lead.callStatus || 'pending'} className={`text-[11px] font-black rounded-lg px-3 py-3 outline-none cursor-pointer shadow-inner disabled:opacity-50 ${invalidPending ? 'bg-red-500 text-white animate-pulse' : lead.callStatus === 'answered' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' : lead.callStatus === 'no_answer' ? 'bg-amber-900/30 text-amber-400 border border-amber-500/30' : lead.callStatus === 'reject' ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-[#1a2332] text-slate-300 border border-slate-700/50 focus:border-indigo-500'}`}>
                                                <option className="bg-[#1a2332] text-slate-300" value="pending">Pending</option>
                                                <option className="bg-[#1a2332] text-emerald-400" value="answered">Answered</option>
                                                <option className="bg-[#1a2332] text-amber-400" value="no_answer">No Answer</option>
                                                <option className="bg-[#1a2332] text-red-400" value="reject">Reject</option>
                                            </select>

                                            <button disabled={invalidPending} onClick={() => handleSaveCallData(lead.id)} title={invalidPending ? "Change status before saving!" : "Save"} className={`p-3 rounded-lg transition-colors shadow-md ${invalidPending ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white transform hover:scale-105'}`}><FaSave size={15}/></button>
                                            
                                            <button onClick={(e) => { e.preventDefault(); if(typeof setChatModalLead === 'function') { setChatModalLead(lead); } else { toast.error("Parent connection missing!"); } }} title="Chat" className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg transition-colors relative shadow-md transform hover:scale-105">
                                                <FaCommentDots size={15}/>
                                                {lead.unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-[#0f151c]"></span>}
                                            </button>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })
                    )}
                </div>
                {totalPages > 1 && (
                    <div className="bg-[#0b0e14] p-3 flex justify-center gap-1.5 border-t border-slate-800">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-md text-[11px] font-bold transition-all shadow-sm ${currentPage === page ? 'bg-indigo-600 text-white' : 'bg-[#1a2332] text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/50'}`}>{page}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* ADD NUMBERS MODAL */}
            {showAddNumbersModal && (
                <div className="absolute inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-[#1a2430] border border-slate-700 rounded-3xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        
                        <div className="flex justify-between items-center mb-5 border-b border-slate-700 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaPlus className="text-emerald-500"/> Add Numbers to {customRounds.find(r => r.roundNum === activeCoordinationRound)?.name || 'Campaign'}</h3>
                                <p className="text-xs text-slate-400 mt-1">Select leads to push to Phase 1 of this round.</p>
                            </div>
                            <button onClick={() => setShowAddNumbersModal(false)} className="text-slate-500 hover:text-white bg-slate-800 p-2 rounded-xl"><FaTimes/></button>
                        </div>

                        <div className="flex gap-3 mb-4 shrink-0">
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-3 top-3 text-slate-500" />
                                <input type="text" placeholder="Search unassigned numbers or name..." value={addSearch} onChange={(e) => setAddSearch(e.target.value)} className="w-full bg-[#0b0e14] border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-indigo-500 shadow-inner" />
                            </div>
                            <select value={addFilterStatus} onChange={(e) => setAddFilterStatus(e.target.value)} className="bg-[#0b0e14] border border-slate-700 rounded-xl px-3 text-sm font-semibold text-slate-300 outline-none cursor-pointer focus:border-indigo-500">
                                <option value="ALL">All Leads</option>
                                <option value="ENROLLED">Enrolled Only</option>
                                <option value="NON_ENROLLED">Non-Enrolled Only</option>
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-700/50 rounded-xl p-2 bg-[#0b0e14]">
                            {availableLeadsToAdd.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 text-sm">No leads found matching your search and filter.</div>
                            ) : (
                                availableLeadsToAdd.map(lead => (
                                    <div key={lead.id} onClick={() => toggleAddSelect(lead.id)} className={`flex items-center justify-between p-3 rounded-lg mb-1.5 cursor-pointer transition-colors border ${selectedToAdd.includes(lead.id) ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-[#1a2430] border-transparent hover:border-slate-700'}`}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className={`text-sm font-bold ${selectedToAdd.includes(lead.id) ? 'text-emerald-400' : 'text-slate-200'}`}>{lead.phone}</h4>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${lead.enrollmentStatus === 'ENROLLED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {lead.enrollmentStatus === 'ENROLLED' ? 'ENROLLED' : 'NON-ENROLLED'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{lead.name || 'Unknown'}</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedToAdd.includes(lead.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                                            {selectedToAdd.includes(lead.id) && <FaCheckCircle className="text-white" size={12}/>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-5 shrink-0 flex justify-between items-center gap-4">
                            <span className="text-xs font-bold text-slate-400">{selectedToAdd.length} leads selected</span>
                            <button disabled={selectedToAdd.length === 0} onClick={handleAddNumbersSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                                Add Selected Leads
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}