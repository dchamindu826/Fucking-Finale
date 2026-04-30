import React, { useState, useMemo, useEffect } from 'react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { FaSearch, FaKeyboard, FaPhoneVolume, FaSave, FaCommentDots, FaPlus, FaTimes, FaExclamationTriangle, FaLock, FaUnlock } from 'react-icons/fa';

const singlishToSinhala = (text) => {
    if (!text) return text;
    let s = text;
    const multiConsonants = { 'nnd': 'ඬ', 'nng': 'ඟ', 'mbb': 'ඹ', 'th': 'ත', 'Th': 'ථ', 'dh': 'ධ', 'Dh': 'ඪ', 'ch': 'ච', 'Ch': 'ඡ', 'ph': 'ඵ', 'bh': 'භ', 'sh': 'ශ', 'Sh': 'ෂ', 'gn': 'ඥ', 'kn': 'ඞ', 'ndh': 'න්ධ' };
    const singleConsonants = { 'k': 'ක', 'g': 'ග', 't': 'ට', 'd': 'ඩ', 'p': 'ප', 'b': 'බ', 'm': 'ම', 'n': 'න', 's': 'ස', 'h': 'හ', 'l': 'ල', 'r': 'ර', 'w': 'ව', 'v': 'ව', 'y': 'ය', 'j': 'ජ', 'c': 'ක', 'f': 'ෆ', 'x': 'ක්ෂ', 'z': 'ස', 'T': 'ඨ', 'D': 'ඪ', 'N': 'ණ', 'L': 'ළ', 'G': 'ඝ', 'R': 'ඍ', 'K': 'ඛ', 'P': 'ඵ', 'B': 'භ', 'M': 'ඹ', 'Y': 'ය', 'W': 'ව' };
    const vowels = { 'aa': { s: 'ා', iso: 'ආ' }, 'ae': { s: 'ැ', iso: 'ඇ' }, 'aee': { s: 'ෑ', iso: 'ඈ' }, 'a': { s: '', iso: 'අ' }, 'ii': { s: 'ී', iso: 'ඊ' }, 'i': { s: 'ි', iso: 'ඉ' }, 'uu': { s: 'ූ', iso: 'ඌ' }, 'u': { s: 'ු', iso: 'උ' }, 'oo': { s: 'ෝ', iso: 'ඕ' }, 'o': { s: 'ො', iso: 'ඔ' }, 'ou': { s: 'ෞ', iso: 'ඖ' }, 'ei': { s: 'ෛ', iso: 'ඓ' }, 'ee': { s: 'ේ', iso: 'ඒ' }, 'ea': { s: 'ේ', iso: 'ඒ' }, 'e': { s: 'ෙ', iso: 'එ' }, 'I': { s: 'ෛ', iso: 'ඓ' }, 'O': { s: 'ෞ', iso: 'ඖ' } };
    for (let v in vowels) s = s.replace(new RegExp(`(^|\\s)${v}`, 'g'), `$1${vowels[v].iso}`);
    for (let c in multiConsonants) { for (let v in vowels) { s = s.replace(new RegExp(c + v, 'g'), multiConsonants[c] + vowels[v].s); } s = s.replace(new RegExp(c, 'g'), multiConsonants[c] + '්'); }
    for (let c in singleConsonants) { for (let v in vowels) { s = s.replace(new RegExp(c + v, 'g'), singleConsonants[c] + vowels[v].s); } s = s.replace(new RegExp(c, 'g'), singleConsonants[c] + '්'); }
    s = s.replace(/ර්‍ර/g, '්‍ර'); s = s.replace(/්්/g, '්'); 
    return s;
};

export default function AfterSeminarNewInq({ leads, drafts, setDrafts, handleUpdateLocalLead, handleSaveCallData, handleTempUnlock, setChatModalLead, isManager }) {
    const [activePhaseFilter, setActivePhaseFilter] = useState(1); 
    const [activeCoordinationRound, setActiveCoordinationRound] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [typingMode, setTypingMode] = useState('en'); 
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const [customRounds, setCustomRounds] = useState(() => {
        const saved = localStorage.getItem('newInq_custom_rounds');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('newInq_custom_rounds', JSON.stringify(customRounds));
    }, [customRounds]);

    const newInqLeads = leads.filter(l => l.inquiryType === 'NEW_INQ');

    const stats = useMemo(() => {
        let targetLeads = newInqLeads;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            targetLeads = targetLeads.filter(l => {
                const leadDate = new Date(l.createdAt);
                return leadDate >= start && leadDate <= end;
            });
        }
        const assigned = targetLeads.length;
        const enrolled = targetLeads.filter(l => l.enrollmentStatus === 'ENROLLED').length;
        const nonEnrolled = targetLeads.filter(l => l.enrollmentStatus !== 'ENROLLED').length;
        const full = targetLeads.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'FULL').length;
        const monthly = targetLeads.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'MONTHLY').length;
        const installment = targetLeads.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'INSTALLMENT').length;
        return { assigned, enrolled, nonEnrolled, full, monthly, installment };
    }, [newInqLeads, startDate, endDate]);

    const calculateTimeRemaining = (lead, round) => {
        const startTime = round === 1 ? lead.newInqTimestamp : lead.updatedAt;
        if (!startTime) return null;
        const diffMs = new Date() - new Date(startTime);
        let maxHours = round === 2 ? 120 : 24; 
        if (round > 2) return null;
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

    let filteredLeads = newInqLeads.filter(l => {
        const matchesPhase = activePhaseFilter === 'ALL' || l.phase === activePhaseFilter;
        const matchesRound = (l.coordinationRound || 1) === activeCoordinationRound;
        const matchesSearch = l.phone.includes(searchQuery) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesPhase && matchesRound && matchesSearch;
    });

    filteredLeads.sort((a, b) => {
        const aTime = calculateTimeRemaining(a, activeCoordinationRound);
        const bTime = calculateTimeRemaining(b, activeCoordinationRound);
        if (aTime?.isLate && !bTime?.isLate) return -1;
        if (!aTime?.isLate && bTime?.isLate) return 1;
        return 0;
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

    const handleSaveNewInq = (lead) => {
        if (lead.enrollmentStatus === 'ENROLLED') {
            handleUpdateLocalLead(lead.id, 'inquiryType', 'OPEN_SEMINAR');
        }
        handleSaveCallData(lead.id);
    };

    const addCustomRound = async () => {
        const name = window.prompt("Enter new custom campaign name:");
        if (name && name.trim()) {
            const nextRoundNum = Math.max(2, ...customRounds.map(r => r.roundNum), 2) + 1; 
            const moveLeads = window.confirm(`Do you want to move all currently NON-ENROLLED leads to this new '${name}' campaign?`);
            
            if (moveLeads) {
                const loadToast = toast.loading("Assigning non-enrolled leads...");
                try {
                    const token = localStorage.getItem('token');
                    await axios.post('/after-seminar-crm/leads/move-round', {
                        targetRound: nextRoundNum,
                        inquiryType: 'NEW_INQ'
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

    // 🔥 FIX: DELETE CUSTOM CAMPAIGN -> MOVE BACK TO ROUND 1 🔥
    const removeCustomRound = async (roundNum, e) => {
        e.stopPropagation();
        if (window.confirm("Delete this custom campaign? All leads inside this will be moved back to the 1st Round.")) {
            const loadToast = toast.loading("Reverting leads back to 1st Round...");
            try {
                const token = localStorage.getItem('token');
                await axios.post('/after-seminar-crm/leads/revert-round', {
                    roundToDelete: roundNum,
                    targetRound: 1, // Moves leads back to round 1
                    inquiryType: 'NEW_INQ'
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

    return (
        <div className="flex flex-col h-full space-y-3 animate-fade-in">
            {/* 🔥 COMPACT STATS WIDGET (Saves huge vertical space) 🔥 */}
            <div className="bg-[#141a23] p-3 rounded-2xl border border-slate-800 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-base font-bold text-white leading-tight">Direct Inquiries Stats</h2>
                    </div>
                    <div className="flex gap-2">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#0b0e14] border border-slate-800 rounded p-1.5 text-xs text-white outline-none" style={{colorScheme: 'dark'}}/>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#0b0e14] border border-slate-800 rounded p-1.5 text-xs text-white outline-none" style={{colorScheme: 'dark'}}/>
                    </div>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <div className="bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 text-center">
                        <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">Assigned</p><p className="text-lg font-black text-white leading-none">{stats.assigned}</p>
                    </div>
                    <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-center">
                        <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5">Enrolled</p><p className="text-lg font-black text-emerald-400 leading-none">{stats.enrolled}</p>
                    </div>
                    <div className="bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 text-center">
                        <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider mb-0.5">Non-Enrol</p><p className="text-lg font-black text-red-400 leading-none">{stats.nonEnrolled}</p>
                    </div>
                    <div className="bg-[#0b0e14] px-3 py-1.5 rounded-lg border border-slate-800/50 text-center">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Enr: Full</p><p className="text-base font-bold text-slate-300 leading-none">{stats.full}</p>
                    </div>
                    <div className="bg-[#0b0e14] px-3 py-1.5 rounded-lg border border-slate-800/50 text-center">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Enr: Month</p><p className="text-base font-bold text-slate-300 leading-none">{stats.monthly}</p>
                    </div>
                    <div className="bg-[#0b0e14] px-3 py-1.5 rounded-lg border border-slate-800/50 text-center">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Enr: Instal</p><p className="text-base font-bold text-slate-300 leading-none">{stats.installment}</p>
                    </div>
                </div>
            </div>

            {/* CUSTOM ROUNDS CONTROLLER */}
            <div className="flex gap-2 bg-[#141a23] p-2 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar shadow-sm">
                <button onClick={() => {setActiveCoordinationRound(1); setCurrentPage(1);}} className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeCoordinationRound === 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-slate-400 hover:bg-[#0b0e14] hover:text-white'}`}>
                    1st Round (24H)
                </button>
                <button onClick={() => {setActiveCoordinationRound(2); setCurrentPage(1);}} className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeCoordinationRound === 2 ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-slate-400 hover:bg-[#0b0e14] hover:text-white'}`}>
                    2nd Round (5 Days)
                </button>

                {customRounds.map(r => (
                    <div key={r.roundNum} className="flex items-center group bg-[#0b0e14] rounded-lg border border-slate-800/50">
                        <button onClick={() => {setActiveCoordinationRound(r.roundNum); setCurrentPage(1);}} className={`flex-shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-l-lg ${activeCoordinationRound === r.roundNum ? 'bg-indigo-600 text-white shadow-md' : 'bg-transparent text-indigo-400 hover:text-white'}`}>
                            {r.name}
                        </button>
                        <button onClick={(e) => removeCustomRound(r.roundNum, e)} className="px-3 py-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-r-lg transition-all"><FaTimes size={12}/></button>
                    </div>
                ))}
                <button onClick={addCustomRound} className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2 border border-slate-700"><FaPlus size={10}/> Add Campaign</button>
            </div>

            {/* FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 bg-[#141a23] p-2 rounded-xl border border-slate-800 shadow-sm">
                <div className="flex bg-[#0b0e14] p-1 rounded-md w-full md:w-auto gap-1">
                    {[1, 2, 3, 'ALL'].map(ph => (
                        <button key={ph} onClick={() => {setActivePhaseFilter(ph); setCurrentPage(1);}} className={`px-5 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${activePhaseFilter === ph ? (ph === 3 ? 'bg-red-500 text-white' : 'bg-slate-700 text-white') : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                            {ph === 'ALL' ? 'ALL' : `Phase ${ph}`}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <FaSearch className="absolute left-3 top-2 text-slate-500 text-sm" />
                        <input type="text" placeholder="Search numbers..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full bg-[#0b0e14] border border-slate-800 rounded py-1.5 pl-8 pr-3 text-xs text-white outline-none focus:border-slate-600" />
                    </div>
                    <div className="relative w-28">
                        <FaKeyboard className="absolute left-3 top-2 text-slate-500 text-sm" />
                        <select value={typingMode} onChange={(e) => setTypingMode(e.target.value)} className="w-full bg-[#0b0e14] border border-slate-800 rounded py-1.5 pl-8 pr-2 text-xs font-semibold text-slate-300 outline-none appearance-none cursor-pointer">
                            <option value="en">English</option>
                            <option value="si-phonetic">Sinhala</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* LIST */}
            <div className="flex-1 bg-[#141a23] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
                <div className="overflow-y-auto custom-scrollbar p-3 space-y-3 flex-1">
                    {paginatedLeads.length === 0 ? <div className="text-center py-10 text-slate-500 text-sm font-medium">No Direct Inquiries found for this campaign.</div> : (
                        paginatedLeads.map((lead, index) => {
                            const realIndex = (currentPage - 1) * itemsPerPage + index + 1;
                            const currentRemark = drafts[lead.id] !== undefined ? drafts[lead.id] : (lead.feedback || '');
                            const timeData = calculateTimeRemaining(lead, activeCoordinationRound);
                            const isLate = timeData?.isLate;
                            const isLocked = lead.isLocked;
                            const invalidPending = isLate && lead.callStatus === 'pending';
                            
                            return (
                                <div key={lead.id} className={`bg-[#0f151c] border p-3.5 rounded-xl flex flex-col xl:flex-row items-center gap-4 transition-colors ${isLate ? 'border-red-900/50 bg-red-900/5' : 'border-slate-700/50 hover:border-slate-600'}`}>
                                    
                                    <div className="flex items-center gap-3 w-full xl:w-56 shrink-0">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-inner ${isLate ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'}`}>{realIndex}</div>
                                        <div>
                                            <h4 className="text-white font-bold text-sm tracking-wide">{lead.phone}</h4>
                                            <p className="text-[10px] text-slate-400 truncate w-40 mt-0.5" title={lead.name}>{lead.name || 'No Name Provided'}</p>
                                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-semibold shadow-sm">P{lead.phase}</span>
                                                {timeData && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 shadow-sm ${isLate ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                        {isLate ? <FaExclamationTriangle size={8}/> : '⏳'} {timeData.text}
                                                    </span>
                                                )}
                                                {lead.needs5DayCall && activeCoordinationRound === 1 && <span className="bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1"><FaPhoneVolume size={8}/> 5-DAY PENDING</span>}
                                                {isLocked && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1"><FaLock size={8}/> LOCKED</span>}
                                                {isLocked && isManager && <button onClick={() => handleTempUnlock(lead.id)} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white px-1.5 py-0.5 rounded text-[9px] font-bold transition-all"><FaUnlock size={8}/></button>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-[#1a2332] rounded-lg border border-slate-700/50 flex items-center px-2.5 shadow-inner">
                                                <span className="text-xs text-slate-400 mr-2 font-medium">Group:</span>
                                                <select disabled={isLocked} value={lead.paymentIntention || 'NOT_DECIDED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'paymentIntention', e.target.value)} className="bg-transparent text-xs font-semibold text-white outline-none w-full py-1.5 cursor-pointer disabled:opacity-50">
                                                    <option value="NOT_DECIDED">Not Decided</option>
                                                    <option value="FULL">Full Payment</option>
                                                    <option value="MONTHLY">Monthly</option>
                                                    <option value="INSTALLMENT">Installment</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 bg-[#1a2332] rounded-lg border border-slate-700/50 flex items-center px-2.5 shadow-inner">
                                                <span className="text-xs text-slate-400 mr-2 font-medium">Status:</span>
                                                <select disabled={isLocked} value={lead.enrollmentStatus || 'NON_ENROLLED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'enrollmentStatus', e.target.value)} className="bg-transparent text-xs font-semibold text-white outline-none w-full py-1.5 cursor-pointer disabled:opacity-50">
                                                    <option value="NON_ENROLLED">Non-Enrolled</option>
                                                    <option value="ENROLLED">Enrolled</option>
                                                </select>
                                            </div>
                                        </div>
                                        <textarea disabled={isLocked} value={currentRemark} onChange={(e) => handleRemarkChangeLocal(lead.id, e.target.value)} placeholder="Type your remark here..." rows="1" className={`w-full bg-[#1a2332] rounded-lg shadow-inner border ${invalidPending ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700/50 focus:border-slate-500'} text-xs text-slate-200 p-2.5 outline-none resize-none transition-colors custom-scrollbar disabled:opacity-50`} />
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <select disabled={isLocked} value={lead.callMethod || 'direct'} onChange={(e) => handleUpdateLocalLead(lead.id, 'callMethod', e.target.value)} className="bg-[#1a2332] text-[11px] font-semibold text-slate-300 border border-slate-700/50 rounded-lg px-2 py-2 outline-none cursor-pointer disabled:opacity-50 shadow-inner">
                                            <option value="direct">Direct Call</option>
                                            <option value="whatsapp">WhatsApp</option>
                                            <option value="3cx">3CX Call</option>
                                        </select>

                                        <select disabled={isLocked} value={lead.attemptCount || 1} onChange={(e) => handleUpdateLocalLead(lead.id, 'attemptCount', parseInt(e.target.value))} className="bg-[#1a2332] text-[11px] font-semibold text-slate-300 border border-slate-700/50 rounded-lg px-2 py-2 outline-none cursor-pointer disabled:opacity-50 shadow-inner">
                                            {[1,2,3,4,5].map(r => <option key={r} value={r}>Attempt {r}</option>)}
                                        </select>

                                        <select onChange={(e) => handleUpdateLocalLead(lead.id, 'callStatus', e.target.value)} value={lead.callStatus || 'pending'} className={`text-[11px] font-bold rounded-lg px-2.5 py-2 outline-none cursor-pointer shadow-inner disabled:opacity-50 ${invalidPending ? 'bg-red-500 text-white animate-pulse' : lead.callStatus === 'answered' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' : lead.callStatus === 'no_answer' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' : lead.callStatus === 'reject' ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-[#1a2332] text-slate-300 border border-slate-700/50'}`}>
                                            <option value="pending">Pending</option>
                                            <option value="answered">Answered</option>
                                            <option value="no_answer">No Answer</option>
                                            <option value="reject">Reject</option>
                                        </select>

                                        <button disabled={invalidPending} onClick={() => handleSaveNewInq(lead)} title={invalidPending ? "Change status from pending before saving!" : "Save"} className={`p-2.5 rounded-lg transition-all shadow-md ${invalidPending ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white transform hover:scale-105'}`}><FaSave size={14}/></button>
                                        <button onClick={() => setChatModalLead(lead)} title="Chat" className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-lg transition-all shadow-md relative transform hover:scale-105">
                                            <FaCommentDots size={14}/>
                                            {lead.unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0f151c]"></span>}
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
                            <button key={page} onClick={() => setCurrentPage(page)} className={`w-7 h-7 rounded-md text-xs font-bold transition-all shadow-sm ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-[#1a2332] text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/50'}`}>{page}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}