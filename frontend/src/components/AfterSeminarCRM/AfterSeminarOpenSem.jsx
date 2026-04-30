import React, { useState, useMemo } from 'react';
import { FaSearch, FaKeyboard, FaPhoneVolume, FaLock, FaUnlock, FaSave, FaCommentDots } from 'react-icons/fa';

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

export default function AfterSeminarOpenSem({ leads, allBatches, filters, drafts, setDrafts, handleUpdateLocalLead, handleSaveCallData, handleTempUnlock, setChatModalLead, isManager }) {
    const [activePhaseFilter, setActivePhaseFilter] = useState(1); 
    const [activeCoordinationRound, setActiveCoordinationRound] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [typingMode, setTypingMode] = useState('en'); 
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const openSemLeads = leads.filter(l => l.inquiryType === 'OPEN_SEMINAR' || l.inquiryType === 'NORMAL');

    const maxActiveCoordinationRound = useMemo(() => {
        if (openSemLeads.length === 0) return 1;
        return Math.max(1, ...openSemLeads.map(l => l.coordinationRound || 1));
    }, [openSemLeads]);

    const paymentStats = useMemo(() => {
        let stats = { FULL: { enrolled: 0, nonEnrolled: 0 }, MONTHLY: { enrolled: 0, nonEnrolled: 0 }, INSTALLMENT: { enrolled: 0, nonEnrolled: 0 }, NOT_DECIDED: { nonEnrolled: 0 } };
        openSemLeads.forEach(l => {
            const group = l.paymentIntention || 'NOT_DECIDED';
            if (stats[group]) {
                if (l.enrollmentStatus === 'ENROLLED') stats[group].enrolled++;
                else stats[group].nonEnrolled++;
            }
        });
        return stats;
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

    return (
        <div className="flex flex-col h-full space-y-4 animate-fade-in">
            {/* STATUS & ROUNDS */}
            <div className="bg-[#141a23] p-4 rounded-2xl border border-slate-800 shadow-md">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Active Campaign Status</p>
                <h2 className="text-lg font-bold text-white flex items-center gap-3 mt-1 mb-4">
                    {filters?.selectedBatch ? allBatches.find(b => String(b.id) === String(filters.selectedBatch))?.name || 'Selected Batch' : 'All Batches'}
                </h2>
                <div className="flex gap-2 bg-[#0b0e14] p-1.5 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(round => {
                        const isLocked = round > maxActiveCoordinationRound;
                        return (
                            <button key={round} disabled={isLocked} onClick={() => {setActiveCoordinationRound(round); setCurrentPage(1);}}
                                className={`flex-1 min-w-[100px] px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all 
                                    ${activeCoordinationRound === round ? 'bg-blue-600 text-white shadow-md' : 
                                    isLocked ? 'bg-transparent text-slate-600 cursor-not-allowed opacity-40' : 
                                    'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                {round === 1 ? '1st' : round === 2 ? '2nd' : round === 3 ? '3rd' : `${round}th`} Round
                                {isLocked && <FaLock className="inline ml-1.5 text-slate-600" size={10}/>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { title: "Full Payment", key: "FULL", color: "text-indigo-400" },
                    { title: "Monthly", key: "MONTHLY", color: "text-purple-400" },
                    { title: "Installment", key: "INSTALLMENT", color: "text-pink-400" },
                    { title: "Not Decided", key: "NOT_DECIDED", color: "text-orange-400" }
                ].map(stat => (
                    <div key={stat.key} className="bg-[#141a23] p-4 rounded-xl border border-slate-800 shadow-sm">
                        <h3 className={`${stat.color} font-semibold text-xs uppercase tracking-widest mb-3`}>{stat.title}</h3>
                        <div className="flex justify-between items-end">
                            {stat.key !== 'NOT_DECIDED' ? (
                                <>
                                    <div><p className="text-lg font-bold text-white leading-none">{paymentStats[stat.key].enrolled}</p><p className="text-[9px] text-slate-400 font-semibold uppercase mt-1">Enrolled</p></div>
                                    <div className="text-right"><p className="text-base font-medium text-slate-300 leading-none">{paymentStats[stat.key].nonEnrolled}</p><p className="text-[9px] text-slate-400 font-semibold uppercase mt-1">Non-Enrolled</p></div>
                                </>
                            ) : (
                                <div><p className="text-lg font-bold text-white leading-none">{paymentStats.NOT_DECIDED.nonEnrolled}</p><p className="text-[9px] text-slate-400 font-semibold uppercase mt-1">Still Pending</p></div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* FILTERS */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#141a23] p-2 rounded-xl border border-slate-800">
                <div className="flex bg-[#0b0e14] p-1 rounded-lg w-full md:w-auto">
                    {[1, 2, 3, 'ALL'].map(ph => (
                        <button key={ph} onClick={() => {setActivePhaseFilter(ph); setCurrentPage(1);}} className={`px-5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${activePhaseFilter === ph ? (ph === 3 ? 'bg-red-500 text-white' : 'bg-slate-700 text-white') : 'text-slate-400 hover:text-white'}`}>
                            {ph === 'ALL' ? 'ALL' : `Phase ${ph}`}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <FaSearch className="absolute left-3 top-2.5 text-slate-500 text-sm" />
                        <input type="text" placeholder="Search numbers..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-slate-600" />
                    </div>
                    <div className="relative w-28">
                        <FaKeyboard className="absolute left-3 top-2.5 text-slate-500 text-sm" />
                        <select value={typingMode} onChange={(e) => setTypingMode(e.target.value)} className="w-full bg-[#0b0e14] border border-slate-800 rounded-lg py-2 pl-9 pr-2 text-[11px] font-semibold text-slate-300 outline-none appearance-none cursor-pointer">
                            <option value="en">English</option>
                            <option value="si-phonetic">Sinhala</option>
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
                            
                            return (
                                <div key={lead.id} className="bg-[#0f151c] border border-slate-700/50 p-3.5 rounded-xl flex flex-col xl:flex-row items-center gap-4 hover:border-slate-600 transition-colors">
                                    <div className="flex items-center gap-3 w-full xl:w-48 shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-semibold">{realIndex}</div>
                                        <div>
                                            <h4 className="text-white font-semibold text-sm">{lead.phone}</h4>
                                            <p className="text-[10px] text-slate-400 truncate w-32" title={lead.name}>{lead.name || 'No Name Provided'}</p>
                                            <div className="mt-0.5"><span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-semibold">P{lead.phase} | R{lead.coordinationRound || 1}</span></div>
                                        </div>
                                    </div>

                                    <div className="flex-1 w-full flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-[#1a2332] rounded-lg border border-slate-700/50 flex items-center px-2.5">
                                                <span className="text-[10px] text-slate-400 mr-2 font-medium">Group:</span>
                                                <select value={lead.paymentIntention || 'NOT_DECIDED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'paymentIntention', e.target.value)} className="bg-transparent text-xs font-medium text-white outline-none w-full py-1.5 cursor-pointer">
                                                    <option value="NOT_DECIDED">Not Decided</option>
                                                    <option value="FULL">Full Payment</option>
                                                    <option value="MONTHLY">Monthly</option>
                                                    <option value="INSTALLMENT">Installment</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 bg-[#1a2332] rounded-lg border border-slate-700/50 flex items-center px-2.5">
                                                <span className="text-[10px] text-slate-400 mr-2 font-medium">Status:</span>
                                                <select value={lead.enrollmentStatus || 'NON_ENROLLED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'enrollmentStatus', e.target.value)} className="bg-transparent text-xs font-medium text-white outline-none w-full py-1.5 cursor-pointer">
                                                    <option value="NON_ENROLLED">Non-Enrolled</option>
                                                    <option value="ENROLLED">Enrolled</option>
                                                </select>
                                            </div>
                                        </div>
                                        <textarea value={currentRemark} onChange={(e) => handleRemarkChangeLocal(lead.id, e.target.value)} placeholder="Type your remark here..." rows="1" className="w-full bg-[#1a2332] rounded-lg border border-slate-700/50 text-xs text-slate-300 p-2.5 outline-none resize-none focus:border-slate-500 transition-colors custom-scrollbar" />
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <select value={lead.callMethod || 'direct'} onChange={(e) => handleUpdateLocalLead(lead.id, 'callMethod', e.target.value)} className="bg-[#1a2332] text-[11px] font-medium text-slate-300 border border-slate-700/50 rounded-lg px-2 py-2 outline-none cursor-pointer">
                                            <option value="direct">Direct Call</option>
                                            <option value="whatsapp">WhatsApp</option>
                                            <option value="3cx">3CX Call</option>
                                        </select>

                                        <select value={lead.coordinationRound || 1} onChange={(e) => handleUpdateLocalLead(lead.id, 'coordinationRound', parseInt(e.target.value))} className="bg-[#1a2332] text-[11px] font-medium text-slate-300 border border-slate-700/50 rounded-lg px-2 py-2 outline-none cursor-pointer">
                                            {[1,2,3,4,5,6,7,8,9,10].map(r => <option key={r} value={r}>Attempt {r}</option>)}
                                        </select>

                                        <select onChange={(e) => handleUpdateLocalLead(lead.id, 'callStatus', e.target.value)} value={lead.callStatus || 'pending'} className={`text-[11px] font-semibold rounded-lg px-2 py-2 outline-none cursor-pointer ${lead.callStatus === 'answered' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' : lead.callStatus === 'no_answer' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' : lead.callStatus === 'reject' ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-[#1a2332] text-slate-300 border border-slate-700/50'}`}>
                                            <option value="pending">Pending</option>
                                            <option value="answered">Answered</option>
                                            <option value="no_answer">No Answer</option>
                                            <option value="reject">Reject</option>
                                        </select>

                                        <button onClick={() => handleSaveCallData(lead.id)} title="Save" className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors"><FaSave size={14}/></button>
                                        <button onClick={() => setChatModalLead(lead)} title="Chat" className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors relative">
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
        </div>
    );
}