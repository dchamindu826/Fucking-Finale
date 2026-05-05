import React, { useState, useMemo, useEffect } from 'react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { FaSearch, FaKeyboard, FaSave, FaCommentDots, FaPlus, FaTimes, FaLock, FaCheckCircle, FaChartPie, FaTasks, FaPhoneVolume, FaPlay, FaPause, FaExclamationTriangle } from 'react-icons/fa';

// ... (singlishToSinhala function remains the same) ...
const singlishToSinhala = (text) => {
    if (!text) return text;
    let s = text;
    const multiConsonants = { 'nnd': 'ඬ', 'nng': 'ඟ', 'mbb': 'ඹ', 'th': 'ත', 'Th': 'ථ', 'dh': 'ධ', 'Dh': 'ඪ', 'ch': 'ච', 'Ch': 'ඡ', 'ph': 'ඵ', 'bh': 'භ', 'sh': 'ශ', 'Sh': 'ෂ', 'gn': 'ඥ', 'kn': 'ඞ', 'ndh': 'න්ධ' };
    const singleConsonants = { 'k': 'ක', 'g': 'ග', 't': 'ට', 'd': 'ඩ', 'p': 'ප', 'b': 'බ', 'm': 'ම', 'n': 'න', 's': 'ස', 'h': 'හ', 'l': 'ල', 'r': 'ර', 'w': 'ව', 'v': 'ව', 'y': 'ය', 'j': 'ජ', 'c': 'ක', 'f': 'ෆ', 'x': 'ක්ෂ', 'z': 'ස', 'T': 'ඨ', 'D': 'ඪ', 'N': 'ණ', 'L': 'ළ', 'G': 'ඝ', 'R': 'ඍ', 'K': 'ඛ', 'P': 'ඵ', 'B': 'භ', 'M': 'ඹ', 'Y': 'ය', 'W': 'ව' };
    const vowels = { 'aa': { s: 'ා', iso: 'ආ' }, 'ae': { s: 'ැ', iso: 'ඇ' }, 'aee': { s: 'ෑ', iso: 'ඈ' }, 'a': { s: '', iso: 'අ' }, 'ii': { s: 'ී', iso: 'ඊ' }, 'i': { s: 'ි', iso: 'ඉ' }, 'uu': { s: 'ූ', iso: 'ඌ' }, 'u': { s: 'ු', iso: 'උ' }, 'oo': { s: 'ෝ', iso: 'ඕ' }, 'o': { s: 'ො', iso: 'ඔ' }, 'ou': { s: 'ෞ', iso: 'ඖ' }, 'ei': { s: 'ෛ', iso: 'ඓ' }, 'ee': { s: 'ේ', iso: 'ඒ' }, 'ea': { s: 'ේ', iso: 'ඒ' }, 'e': { s: 'ෙ', iso: 'එ' }, 'I': { s: 'ෛ', iso: 'ඓ' }, 'O': { s: 'ෞ', iso: 'ඖ' } };
    for (let v in vowels) s = s.replace(new RegExp(`(^|\\s)${v}`, 'g'), `$1${vowels[v].iso}`);
    for (let c in multiConsonants) { for (let v in vowels) { s = s.replace(new RegExp(c + v, 'g'), multiConsonants[c] + vowels[v].s); } s = s.replace(new RegExp(c, 'g'), multiConsonants[c] + '්'); }
    for (let c in singleConsonants) { for (let v in vowels) { s = s.replace(new RegExp(c + v, 'g'), singleConsonants[c] + vowels[v].s); } s = s.replace(new RegExp(c, 'g'), singleConsonants[c] + '්'); }
    s = s.replace(/ර්ර/g, '්ර'); s = s.replace(/්්/g, '්'); 
    return s;
};

export default function AfterSeminarOpenSem({ leads, allBatches, filters, drafts, setDrafts, handleUpdateLocalLead, handleSaveCallData, handleTempUnlock, setChatModalLead, isManager }) {
    // ... (State initialization remains the same) ...
    const [activePhaseFilter, setActivePhaseFilter] = useState(1); 
    const [activeCoordinationRound, setActiveCoordinationRound] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [typingMode, setTypingMode] = useState('en'); 
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const [showAddNumbersModal, setShowAddNumbersModal] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [selectedToAdd, setSelectedToAdd] = useState([]);
    const [showMyProgress, setShowMyProgress] = useState(false);

    const [roundStatuses, setRoundStatuses] = useState({ 1: 'active', 2: 'paused', 3: 'paused' });

    const [customRounds, setCustomRounds] = useState(() => {
        const saved = localStorage.getItem('openSem_custom_rounds');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('openSem_custom_rounds', JSON.stringify(customRounds));
    }, [customRounds]);

    const openSemLeads = leads.filter(l => l.inquiryType === 'OPEN_SEMINAR' || l.inquiryType === 'NORMAL');

    const maxActiveCoordinationRound = useMemo(() => {
        if (openSemLeads.length === 0) return 1;
        return Math.max(1, ...openSemLeads.map(l => l.coordinationRound || 1));
    }, [openSemLeads]);

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

    const myStats = useMemo(() => {
        let assigned = openSemLeads.length;
        let pending = 0;
        let answered = 0;

        openSemLeads.forEach(l => {
            if (!l.callStatus || l.callStatus === 'pending') pending++;
            if (l.callStatus === 'answered') answered++;
        });

        let covered = assigned - pending;
        let responseRate = assigned > 0 ? Math.round((answered / assigned) * 100) : 0;

        return { assigned, covered, pending, answered, responseRate };
    }, [openSemLeads]);

    const filteredLeads = openSemLeads.filter(l => {
        const matchesPhase = activePhaseFilter === 'ALL' || l.phase === activePhaseFilter;
        const matchesRound = (l.coordinationRound || 1) === activeCoordinationRound;
        const matchesSearch = l.phone.includes(searchQuery) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesPhase && matchesRound && matchesSearch;
    });

    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
    const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleRemarkChangeLocal = (leadId, value) => {
        let finalValue = value;
        if (typingMode === 'si-phonetic') {
            const words = value.split(' ');
            const lastWord = words.pop();
            if (!/\d/.test(lastWord) && lastWord.length > 0) {
                finalValue = [...words, singlishToSinhala(lastWord)].join(' ');
            }
        }
        setDrafts(prev => ({ ...prev, [leadId]: finalValue }));
        localStorage.setItem(`draft_remark_as_${leadId}`, finalValue);
    };

    const handleToggleRoundStatus = (roundNum, e) => {
        e.stopPropagation();
        const current = roundStatuses[roundNum];
        const nextStatus = current === 'active' ? 'paused' : 'active';
        setRoundStatuses(prev => ({ ...prev, [roundNum]: nextStatus }));
        toast.success(`Round ${roundNum} is now ${nextStatus.toUpperCase()}`);
    };

    // ... (addCustomRound, removeCustomRound, toggleAddSelect, handleAddNumbersSubmit remain the same) ...
     const addCustomRound = async () => {
        const name = window.prompt("Enter new custom campaign name:");
        if (name && name.trim()) {
            const nextRoundNum = Math.max(3, ...customRounds.map(r => r.roundNum), 3) + 1; 
            const moveLeads = window.confirm(`Do you want to move all currently NON-ENROLLED leads to this new '${name}' campaign?`);
            
            if (moveLeads) {
                const loadToast = toast.loading("Assigning non-enrolled leads...");
                try {
                    const token = localStorage.getItem('token');
                    await axios.post('/after-seminar-crm/leads/move-round', {
                        targetRound: nextRoundNum,
                        inquiryType: 'OPEN_SEMINAR'
                    }, { headers: { Authorization: `Bearer ${token}` }});
                    toast.success("Leads moved successfully!", { id: loadToast });
                    setTimeout(() => window.location.reload(), 800);
                } catch(e) {
                    toast.error("Failed to move leads.", { id: loadToast });
                }
            }
            setCustomRounds([...customRounds, { roundNum: nextRoundNum, name: name.trim() }]);
        }
    };

    const removeCustomRound = async (roundNum, e) => {
        e.stopPropagation();
        if (window.confirm("Delete this custom campaign? All leads inside this will be moved back to the Confirmation Call round.")) {
            const loadToast = toast.loading("Reverting leads back to Confirmation Call...");
            try {
                const token = localStorage.getItem('token');
                await axios.post('/after-seminar-crm/leads/revert-round', {
                    roundToDelete: roundNum,
                    targetRound: 1, 
                    inquiryType: 'OPEN_SEMINAR'
                }, { headers: { Authorization: `Bearer ${token}` }});

                setCustomRounds(customRounds.filter(r => r.roundNum !== roundNum));
                if (activeCoordinationRound === roundNum) setActiveCoordinationRound(1);
                
                toast.success("Campaign deleted & leads reverted!", { id: loadToast });
                setTimeout(() => window.location.reload(), 800);
            } catch(err) {
                toast.error("Failed to revert leads.", { id: loadToast });
            }
        }
    };

    const availableLeadsToAdd = openSemLeads.filter(l => 
        l.enrollmentStatus !== 'ENROLLED' && 
        (l.coordinationRound || 1) !== activeCoordinationRound &&
        (l.phone.includes(addSearch) || (l.name && l.name.toLowerCase().includes(addSearch.toLowerCase())))
    );

    const toggleAddSelect = (id) => {
        if(selectedToAdd.includes(id)) setSelectedToAdd(selectedToAdd.filter(x => x !== id));
        else setSelectedToAdd([...selectedToAdd, id]);
    };

    const handleAddNumbersSubmit = async () => {
        if(selectedToAdd.length === 0) return toast.error("Select at least one lead");
        const loadToast = toast.loading("Adding numbers to campaign...");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/bulk-action', {
                action: 'CHANGE_ROUND',
                leadIds: selectedToAdd,
                targetRound: activeCoordinationRound
            }, { headers: { Authorization: `Bearer ${token}` }});
            
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
            
            {/* STATUS & ROUNDS */}
            <div className="bg-[#141a23] p-4 rounded-2xl border border-slate-800 shadow-md">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Active Campaign Status</p>
                <div className="flex justify-between items-center mt-1 mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-3">
                        {filters?.selectedBatch ? allBatches.find(b => String(b.id) === String(filters.selectedBatch))?.name || 'Selected Batch' : 'All Batches'}
                    </h2>
                    
                    <button onClick={() => setShowMyProgress(true)} className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all">
                        <FaChartPie size={14}/> My Progress
                    </button>
                </div>
                
                <div className="flex gap-2 bg-[#0b0e14] p-1.5 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar">
                    {/* Base Rounds with Manager Controls */}
                    {[
                        { num: 1, label: 'Confirmation Call' },
                        { num: 2, label: '1st Round' },
                        { num: 3, label: '2nd Round' }
                    ].map(round => {
                        const isLocked = round.num > maxActiveCoordinationRound;
                        return (
                            <div key={round.num} className="flex items-center group bg-[#0b0e14] rounded-lg border border-slate-800/50">
                                <button disabled={isLocked} onClick={() => {setActiveCoordinationRound(round.num); setCurrentPage(1);}}
                                    className={`flex-shrink-0 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all 
                                        ${activeCoordinationRound === round.num ? 'bg-blue-600 text-white shadow-md' : 
                                        isLocked ? 'bg-transparent text-slate-600 cursor-not-allowed opacity-40' : 
                                        'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}
                                        ${isManager ? 'rounded-l-lg' : 'rounded-lg'}
                                    `}
                                >
                                    {round.label}
                                    {isLocked && <FaLock className="inline ml-1.5 text-slate-600" size={10}/>}
                                </button>
                                
                                {isManager && (
                                    <button 
                                        onClick={(e) => handleToggleRoundStatus(round.num, e)} 
                                        title={roundStatuses[round.num] === 'active' ? "Pause Round" : "Start Round"} 
                                        className="px-3 py-2.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-r-lg transition-all border-l border-slate-800/50"
                                    >
                                        {roundStatuses[round.num] === 'active' ? <FaPause size={10} className="text-amber-500" /> : <FaPlay size={10} className="text-emerald-500" />}
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Custom Rounds */}
                    {customRounds.map(r => (
                        <div key={r.roundNum} className="flex items-center group bg-[#0b0e14] rounded-lg border border-slate-800/50">
                            <button onClick={() => {setActiveCoordinationRound(r.roundNum); setCurrentPage(1);}} className={`flex-shrink-0 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all rounded-l-lg ${activeCoordinationRound === r.roundNum ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-indigo-400 hover:text-white'}`}>
                                {r.name}
                            </button>
                            <button onClick={(e) => removeCustomRound(r.roundNum, e)} className="px-3 py-2.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-r-lg transition-all"><FaTimes size={12}/></button>
                        </div>
                    ))}
                    
                    <button onClick={addCustomRound} className="flex-shrink-0 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2 border border-slate-700"><FaPlus size={10}/> Add Campaign</button>
                </div>
            </div>

            {/* TOP STATS BOXES */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* ... (Stats boxes remain unchanged) ... */}
                <div className="bg-[#141a23] p-4 rounded-xl border border-slate-800 shadow-sm">
                    <h3 className="text-indigo-400 font-semibold text-xs uppercase tracking-widest mb-3">Full Payment</h3>
                    <div className="flex justify-between items-end">
                        <div><p className="text-lg font-bold text-white leading-none">{paymentStats.FULL}</p><p className="text-[9px] text-slate-400 font-semibold uppercase mt-1">Enrolled</p></div>
                    </div>
                </div>
                <div className="bg-[#141a23] p-4 rounded-xl border border-slate-800 shadow-sm">
                    <h3 className="text-purple-400 font-semibold text-xs uppercase tracking-widest mb-3">Monthly</h3>
                    <div className="flex justify-between items-end">
                        <div><p className="text-lg font-bold text-white leading-none">{paymentStats.MONTHLY}</p><p className="text-[9px] text-slate-400 font-semibold uppercase mt-1">Enrolled</p></div>
                    </div>
                </div>
                <div className="bg-[#141a23] p-4 rounded-xl border border-slate-800 shadow-sm">
                    <h3 className="text-pink-400 font-semibold text-xs uppercase tracking-widest mb-3">Installment</h3>
                    <div className="flex justify-between items-end">
                        <div><p className="text-lg font-bold text-white leading-none">{paymentStats.INSTALLMENT}</p><p className="text-[9px] text-slate-400 font-semibold uppercase mt-1">Enrolled</p></div>
                    </div>
                </div>
                <div className="bg-[#141a23] p-4 rounded-xl border border-slate-800 shadow-sm">
                    <h3 className="text-red-400 font-semibold text-xs uppercase tracking-widest mb-3">Non-Enrolled</h3>
                    <div className="flex justify-between items-end">
                        <div><p className="text-lg font-bold text-white leading-none">{paymentStats.NON_ENROLLED}</p><p className="text-[9px] text-slate-400 font-semibold uppercase mt-1">Total Pending</p></div>
                    </div>
                </div>
            </div>

            {/* FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#141a23] p-2 rounded-xl border border-slate-800">
                {/* ... (Filters remain unchanged) ... */}
                 <div className="flex bg-[#0b0e14] p-1 rounded-lg w-full md:w-auto">
                    {[1, 2, 3, 'ALL'].map(ph => (
                        <button key={ph} onClick={() => {setActivePhaseFilter(ph); setCurrentPage(1);}} className={`px-5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${activePhaseFilter === ph ? (ph === 3 ? 'bg-red-500 text-white' : 'bg-slate-700 text-white') : 'text-slate-400 hover:text-white'}`}>
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
                        <input type="text" placeholder="Search numbers..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-slate-600" />
                    </div>
                    <div className="relative w-28">
                        <FaKeyboard className="absolute left-3 top-2.5 text-slate-500 text-sm" />
                        <select value={typingMode} onChange={(e) => setTypingMode(e.target.value)} className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg py-2 pl-9 pr-2 text-[11px] font-semibold text-slate-300 outline-none appearance-none cursor-pointer">
                            <option className="bg-slate-900 text-white" value="en">English</option>
                            <option className="bg-slate-900 text-white" value="si-phonetic">Sinhala</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* LIST */}
            <div className="flex-1 bg-[#141a23] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
                <div className="overflow-y-auto custom-scrollbar p-3 space-y-3 flex-1">
                    {paginatedLeads.length === 0 ? <div className="text-center py-10 text-slate-500 text-sm font-medium">No Open Seminar Leads found.</div> : (
                        paginatedLeads.map((lead, index) => {
                            const realIndex = (currentPage - 1) * itemsPerPage + index + 1;
                            const currentRemark = drafts[lead.id] !== undefined ? drafts[lead.id] : (lead.feedback || '');
                            
                            // 🔥 DELAY INDICATOR LOGIC 🔥
                            const isDelayed = lead.isLocked || lead.needs5DayCall; 

                            return (
                                <div key={lead.id} className={`bg-[#0f151c] border p-3.5 rounded-xl flex flex-col xl:flex-row items-center gap-4 transition-colors relative
                                    ${isDelayed ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-slate-700/50 hover:border-slate-600'}
                                `}>
                                    
                                    {/* 🔥 RED MARKER BADGE 🔥 */}
                                    {isDelayed && (
                                        <div className="absolute -top-2.5 -right-2.5 bg-red-600 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1 animate-pulse z-10 border border-[#0f151c]">
                                            <FaExclamationTriangle size={10} /> Delayed Call
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 w-full xl:w-48 shrink-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${isDelayed ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'}`}>
                                            {realIndex}
                                        </div>
                                        <div>
                                            <h4 className={`font-semibold text-sm ${isDelayed ? 'text-red-400' : 'text-white'}`}>{lead.phone}</h4>
                                            <p className="text-[10px] text-slate-400 truncate w-32" title={lead.name}>{lead.name || 'No Name Provided'}</p>
                                            <div className="mt-0.5"><span className={`${isDelayed ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-300'} px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors`}>P{lead.phase} | R{lead.coordinationRound || 1}</span></div>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-[#1a2332] rounded-lg border border-slate-700/50 flex items-center px-2.5">
                                                <span className="text-[10px] text-slate-400 mr-2 font-medium">Group:</span>
                                                <select value={lead.paymentIntention || 'NOT_DECIDED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'paymentIntention', e.target.value)} className="bg-transparent text-xs font-medium text-white outline-none w-full py-1.5 cursor-pointer">
                                                    <option className="bg-[#1a2332] text-white" value="NOT_DECIDED">Not Decided</option>
                                                    <option className="bg-[#1a2332] text-white" value="FULL">Full Payment</option>
                                                    <option className="bg-[#1a2332] text-white" value="MONTHLY">Monthly</option>
                                                    <option className="bg-[#1a2332] text-white" value="INSTALLMENT">Installment</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 bg-[#1a2332] rounded-lg border border-slate-700/50 flex items-center px-2.5">
                                                <span className="text-[10px] text-slate-400 mr-2 font-medium">Status:</span>
                                                <select value={lead.enrollmentStatus || 'NON_ENROLLED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'enrollmentStatus', e.target.value)} className="bg-transparent text-xs font-medium text-white outline-none w-full py-1.5 cursor-pointer">
                                                    <option className="bg-[#1a2332] text-white" value="NON_ENROLLED">Non-Enrolled</option>
                                                    <option className="bg-[#1a2332] text-white" value="ENROLLED">Enrolled</option>
                                                </select>
                                            </div>
                                        </div>
                                        <textarea value={currentRemark} onChange={(e) => handleRemarkChangeLocal(lead.id, e.target.value)} placeholder="Type your remark here..." rows="1" className="w-full bg-[#1a2332] rounded-lg border border-slate-700/50 text-xs text-slate-300 p-2.5 outline-none resize-none focus:border-slate-500 transition-colors custom-scrollbar" />
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <select value={lead.callMethod || 'direct'} onChange={(e) => handleUpdateLocalLead(lead.id, 'callMethod', e.target.value)} className="bg-[#1a2332] text-[11px] font-medium text-slate-300 border border-slate-700/50 rounded-lg px-2 py-2 outline-none cursor-pointer">
                                            <option className="bg-[#1a2332] text-white" value="direct">Direct Call</option>
                                            <option className="bg-[#1a2332] text-white" value="whatsapp">WhatsApp</option>
                                            <option className="bg-[#1a2332] text-white" value="3cx">3CX Call</option>
                                        </select>

                                        <select value={lead.callAttempt || 1} onChange={(e) => handleUpdateLocalLead(lead.id, 'callAttempt', parseInt(e.target.value))} className="bg-[#1a2332] text-[11px] font-medium text-slate-300 border border-slate-700/50 rounded-lg px-2 py-2 outline-none cursor-pointer">
                                            {[1,2,3,4,5,6,7,8,9,10].map(r => <option className="bg-[#1a2332] text-white" key={r} value={r}>Attempt {r}</option>)}
                                        </select>

                                        <select onChange={(e) => handleUpdateLocalLead(lead.id, 'callStatus', e.target.value)} value={lead.callStatus || 'pending'} className={`text-[11px] font-semibold rounded-lg px-2 py-2 outline-none cursor-pointer ${lead.callStatus === 'answered' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' : lead.callStatus === 'no_answer' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' : lead.callStatus === 'reject' ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-[#1a2332] text-slate-300 border border-slate-700/50'}`}>
                                            <option className="bg-[#1a2332] text-white" value="pending">Pending</option>
                                            <option className="bg-[#1a2332] text-white" value="answered">Answered</option>
                                            <option className="bg-[#1a2332] text-white" value="no_answer">No Answer</option>
                                            <option className="bg-[#1a2332] text-white" value="reject">Reject</option>
                                        </select>

                                        <button onClick={() => handleSaveCallData(lead.id)} title="Save" className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors"><FaSave size={14}/></button>
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if(typeof setChatModalLead === 'function') {
                                                    setChatModalLead(lead);
                                                } else {
                                                    toast.error("Parent component connection missing! Check setChatModalLead.");
                                                }
                                            }} 
                                            title="Chat" 
                                            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors relative"
                                        >
                                            <FaCommentDots size={14}/>
                                            {lead.unreadCount > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#0f151c]"></span>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                {totalPages > 1 && (
                    <div className="bg-[#0b0e14] p-2 flex justify-center gap-1.5 border-t border-slate-800">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button key={page} onClick={() => setCurrentPage(page)} className={`w-7 h-7 rounded-md text-[11px] font-semibold transition-all ${currentPage === page ? 'bg-slate-700 text-white' : 'bg-transparent text-slate-500 hover:bg-slate-800'}`}>{page}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* MY PROGRESS MODAL */}
            {/* ... (My Progress Modal remains the same) ... */}
             {showMyProgress && (
                <div className="absolute inset-0 z-[60] bg-[#0f172a]/95 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-[#1a2430] border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col">
                        
                        <div className="flex justify-between items-center mb-5 border-b border-slate-700 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaChartPie className="text-indigo-400"/> My Progress</h3>
                                <p className="text-xs text-slate-400 mt-1">Your calling progress for the current campaign.</p>
                            </div>
                            <button onClick={() => setShowMyProgress(false)} className="text-slate-500 hover:text-white bg-slate-800 p-2 rounded-xl"><FaTimes/></button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-[#0b0e14] p-4 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
                                <FaTasks className="text-slate-500 text-2xl mb-2" />
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Assigned</span>
                                <span className="text-2xl font-black text-white">{myStats.assigned}</span>
                            </div>
                            <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 flex flex-col items-center justify-center text-center">
                                <FaCheckCircle className="text-emerald-500 text-2xl mb-2" />
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Total Covered</span>
                                <span className="text-2xl font-black text-emerald-400">{myStats.covered}</span>
                            </div>
                            <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex flex-col items-center justify-center text-center">
                                <FaPhoneVolume className="text-red-500 text-2xl mb-2" />
                                <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Pending Calls</span>
                                <span className="text-2xl font-black text-red-400">{myStats.pending}</span>
                            </div>
                            <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex flex-col items-center justify-center text-center relative overflow-hidden">
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest relative z-10 mt-2">Response Rate</span>
                                <span className="text-3xl font-black text-blue-400 relative z-10 mt-1">{myStats.responseRate}%</span>
                            </div>
                        </div>

                        <div className="w-full bg-[#0b0e14] rounded-full h-3 mb-2 border border-slate-700 overflow-hidden shadow-inner">
                            <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-3 rounded-full transition-all duration-1000" style={{ width: `${myStats.assigned > 0 ? (myStats.covered / myStats.assigned) * 100 : 0}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest">
                            {myStats.covered} of {myStats.assigned} Leads Covered
                        </p>

                    </div>
                </div>
            )}

            {/* ADD NUMBERS MODAL */}
            {/* ... (Add Numbers Modal remains the same) ... */}
            {showAddNumbersModal && (
                <div className="absolute inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-[#1a2430] border border-slate-700 rounded-3xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        
                        <div className="flex justify-between items-center mb-5 border-b border-slate-700 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaPlus className="text-emerald-500"/> Add Numbers to {customRounds.find(r => r.roundNum === activeCoordinationRound)?.name || 'Campaign'}</h3>
                                <p className="text-xs text-slate-400 mt-1">Select non-enrolled leads to push to Phase 1 of this round.</p>
                            </div>
                            <button onClick={() => setShowAddNumbersModal(false)} className="text-slate-500 hover:text-white bg-slate-800 p-2 rounded-xl"><FaTimes/></button>
                        </div>

                        <div className="relative mb-4 shrink-0">
                            <FaSearch className="absolute left-3 top-3 text-slate-500" />
                            <input type="text" placeholder="Search unassigned numbers or type new number..." value={addSearch} onChange={(e) => setAddSearch(e.target.value)} className="w-full bg-[#0b0e14] border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-emerald-500 shadow-inner" />
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-700/50 rounded-xl p-2 bg-[#0b0e14]">
                            {availableLeadsToAdd.length === 0 ? (
                                <div className="text-center py-10 text-slate-500 text-sm">No non-enrolled leads found matching your search.</div>
                            ) : (
                                availableLeadsToAdd.map(lead => (
                                    <div key={lead.id} onClick={() => toggleAddSelect(lead.id)} className={`flex items-center justify-between p-3 rounded-lg mb-1.5 cursor-pointer transition-colors border ${selectedToAdd.includes(lead.id) ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-[#1a2430] border-transparent hover:border-slate-700'}`}>
                                        <div>
                                            <h4 className={`text-sm font-bold ${selectedToAdd.includes(lead.id) ? 'text-emerald-400' : 'text-slate-200'}`}>{lead.phone}</h4>
                                            <p className="text-[10px] text-slate-500">{lead.name || 'Unknown'}</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedToAdd.includes(lead.id) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                                            {selectedToAdd.includes(lead.id) && <FaCheckCircle className="text-white" size={12}/>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-5 shrink-0">
                            <button disabled={selectedToAdd.length === 0} onClick={handleAddNumbersSubmit} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                                Add {selectedToAdd.length} Selected Leads
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}