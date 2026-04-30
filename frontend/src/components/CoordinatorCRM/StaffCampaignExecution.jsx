import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axios';
import { FaSearch, FaCommentDots, FaSave, FaTimes, FaKeyboard, FaCheckCircle, FaClock, FaTimesCircle, FaFilter } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import ChatArea from './ChatArea'; 
import RightSidePanel from './RightSidePanel';

// PHONETIC ENGINE
const singlishToSinhala = (text) => {
    if (!text) return text;
    let s = text;

    const multiConsonants = {
        'nnd': 'ඬ', 'nng': 'ඟ', 'mbb': 'ඹ',
        'th': 'ත', 'Th': 'ථ', 'dh': 'ධ', 'Dh': 'ඪ',
        'ch': 'ච', 'Ch': 'ඡ', 'ph': 'ඵ', 'bh': 'භ',
        'sh': 'ශ', 'Sh': 'ෂ', 'gn': 'ඥ', 'kn': 'ඞ', 'ndh': 'න්ධ'
    };

    const singleConsonants = {
        'k': 'ක', 'g': 'ග', 't': 'ට', 'd': 'ඩ', 'p': 'ප', 'b': 'බ',
        'm': 'ම', 'n': 'න', 's': 'ස', 'h': 'හ', 'l': 'ල', 'r': 'ර',
        'w': 'ව', 'v': 'ව', 'y': 'ය', 'j': 'ජ', 'c': 'ක', 'f': 'ෆ',
        'x': 'ක්ෂ', 'z': 'ස', 'T': 'ඨ', 'D': 'ඪ', 'N': 'ණ', 'L': 'ළ',
        'G': 'ඝ', 'R': 'ඍ', 'K': 'ඛ', 'P': 'ඵ', 'B': 'භ', 'M': 'ඹ',
        'Y': 'ය', 'W': 'ව'
    };

    const vowels = {
        'aa': { s: 'ා', iso: 'ආ' }, 'ae': { s: 'ැ', iso: 'ඇ' }, 'aee': { s: 'ෑ', iso: 'ඈ' }, 'a': { s: '', iso: 'අ' },
        'ii': { s: 'ී', iso: 'ඊ' }, 'i': { s: 'ි', iso: 'ඉ' }, 
        'uu': { s: 'ූ', iso: 'ඌ' }, 'u': { s: 'ු', iso: 'උ' }, 
        'oo': { s: 'ෝ', iso: 'ඕ' }, 'o': { s: 'ො', iso: 'ඔ' }, 
        'ou': { s: 'ෞ', iso: 'ඖ' }, 'ei': { s: 'ෛ', iso: 'ඓ' },
        'ee': { s: 'ේ', iso: 'ඒ' }, 'ea': { s: 'ේ', iso: 'ඒ' }, 'e': { s: 'ෙ', iso: 'එ' }, 
        'I': { s: 'ෛ', iso: 'ඓ' }, 'O': { s: 'ෞ', iso: 'ඖ' }
    };

    for (let v in vowels) {
        s = s.replace(new RegExp(`(^|\\s)${v}`, 'g'), `$1${vowels[v].iso}`);
    }

    for (let c in multiConsonants) {
        for (let v in vowels) {
            s = s.replace(new RegExp(c + v, 'g'), multiConsonants[c] + vowels[v].s);
        }
        s = s.replace(new RegExp(c, 'g'), multiConsonants[c] + '්');
    }

    for (let c in singleConsonants) {
        for (let v in vowels) {
            s = s.replace(new RegExp(c + v, 'g'), singleConsonants[c] + vowels[v].s);
        }
        s = s.replace(new RegExp(c, 'g'), singleConsonants[c] + '්');
    }

    s = s.replace(/ර්‍ර/g, '්‍ර'); 
    s = s.replace(/්්/g, '්'); 

    return s;
};

export default function StaffCampaignExecution({ filters }) {
    const rawRole = JSON.parse(localStorage.getItem('user'))?.role || '';
    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const [activePhaseFilter, setActivePhaseFilter] = useState('ALL'); 

    const [chatModalLead, setChatModalLead] = useState(null);
    const [drafts, setDrafts] = useState({});
    const [typingMode, setTypingMode] = useState('en'); 

    useEffect(() => {
        fetchAssignedLeads();
    }, [filters?.selectedBusiness, filters?.selectedBatch]);

    const fetchAssignedLeads = async () => {
        try {
            const token = localStorage.getItem('token');
            const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(rawRole.toUpperCase().replace(/ /g, '_'));

            const res = await axios.get('/coordinator-crm/leads', {
                headers: { Authorization: `Bearer ${token}` }, 
                params: {
                    tab: 'ASSIGNED',
                    loggedUserId: currentUserId, 
                    loggedUserRole: rawRole,
                    businessId: isManager ? (filters?.selectedBusiness || '') : '',
                    batchId: isManager ? (filters?.selectedBatch || '') : ''
                }
            });
            
            const sortedLeads = (res.data.leads || []).sort((a, b) => a.id - b.id);
            setLeads(sortedLeads);

            const loadedDrafts = {};
            sortedLeads.forEach(l => {
                const savedDraft = localStorage.getItem(`draft_remark_${l.id}`);
                if (savedDraft) loadedDrafts[l.id] = savedDraft;
            });
            setDrafts(loadedDrafts);
            setLoading(false);
        } catch (error) {
            toast.error("Failed to load campaign leads");
            setLoading(false);
        }
    };

    const handleRemarkChange = (leadId, value) => {
        let finalValue = value;
        if (typingMode === 'si-phonetic') {
            const words = value.split(' ');
            const lastWord = words.pop();
            if (!/\d/.test(lastWord) && lastWord.length > 0) {
                const translated = singlishToSinhala(lastWord);
                finalValue = [...words, translated].join(' ');
            }
        }
        setDrafts(prev => ({ ...prev, [leadId]: finalValue }));
        localStorage.setItem(`draft_remark_${leadId}`, finalValue);
    };

    // 🔥 FIX: Update Local Lead Function for new Method and Attempt options
    const handleUpdateLocalLead = (id, field, value) => {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    // 🔥 FIX: Passed the new Method and Attempts to backend
    const handleSaveCallData = async (leadId) => {
        const lead = leads.find(l => l.id === leadId);
        const feedback = drafts[leadId] || '';
        try {
            const token = localStorage.getItem('token');
            await axios.post('/coordinator-crm/leads/update-call', {
                leadId, 
                method: lead.callMethod || 'direct', 
                status: lead.callStatus || 'pending', 
                feedback,
                coordinationRound: lead.coordinationRound || 1
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success("Saved successfully!");
            
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
            
            const newDrafts = { ...drafts };
            delete newDrafts[leadId];
            setDrafts(newDrafts);
            localStorage.removeItem(`draft_remark_${leadId}`);
            
        } catch (error) {
            toast.error("Failed to save data. Check backend route.");
        }
    };

    const stats = useMemo(() => {
        let totalAssigned = leads.length;
        let answered = 0, noAnswer = 0, rejected = 0, pending = 0;

        leads.forEach(l => {
            if (l.callStatus === 'answered') answered++;
            else if (l.callStatus === 'no_answer') noAnswer++;
            else if (l.callStatus === 'reject') rejected++;
            else pending++;
        });

        let covered = answered + noAnswer + rejected;
        let responseRate = totalAssigned > 0 ? ((answered / totalAssigned) * 100).toFixed(1) : 0;

        return { totalAssigned, covered, pending, rejected, answered, noAnswer, responseRate };
    }, [leads]);

    const pieData = [
        { name: 'Answered', value: stats.answered, color: '#10b981' },
        { name: 'No Answer', value: stats.noAnswer, color: '#f59e0b' },
        { name: 'Reject', value: stats.rejected, color: '#ef4444' },
        { name: 'Pending', value: stats.pending, color: '#334155' }
    ];

    const filteredLeads = leads.filter(l => 
        (activePhaseFilter === 'ALL' || l.phase === activePhaseFilter) &&
        (l.phone.includes(searchQuery) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
    const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) return <div className="text-center py-20 text-white animate-pulse">Loading Campaign Data...</div>;

    return (
        <div className="w-full h-full flex flex-col p-2 md:p-4 bg-[#0a0f1c] overflow-y-auto custom-scrollbar font-sans">
            
            {/* PREMIUM HEADER */}
            <div className="flex flex-col xl:flex-row justify-between gap-5 mb-4 bg-gradient-to-r from-[#1e293b] to-[#0f172a] p-4 rounded-2xl border border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                
                <div className="flex items-center gap-4 bg-black/40 p-2.5 rounded-xl border border-white/5 w-full xl:w-max">
                    <div className="w-[70px] h-[70px] shrink-0">
                        <PieChart width={70} height={70}>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={22} outerRadius={32} paddingAngle={4} dataKey="value">
                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '8px' }} />
                        </PieChart>
                    </div>
                    <div className="text-[11px] font-bold text-slate-300 space-y-1.5 pr-2">
                        <div className="flex items-center gap-2"><FaCheckCircle className="text-emerald-500"/> Ans: <span className="text-white">{stats.answered}</span></div>
                        <div className="flex items-center gap-2"><FaClock className="text-yellow-500"/> NoAns: <span className="text-white">{stats.noAnswer}</span></div>
                        <div className="flex items-center gap-2"><FaTimesCircle className="text-red-500"/> Rej: <span className="text-white">{stats.rejected}</span></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                    <div className="bg-slate-800/50 px-4 py-2.5 rounded-xl border border-slate-700 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Assigned</span>
                        <span className="text-xl font-black text-white">{stats.totalAssigned}</span>
                    </div>
                    <div className="bg-emerald-900/20 px-4 py-2.5 rounded-xl border border-emerald-500/20 flex flex-col justify-center">
                        <span className="text-[10px] text-emerald-500/70 uppercase font-bold tracking-widest mb-1">Covered</span>
                        <span className="text-xl font-black text-emerald-400">{stats.covered}</span>
                    </div>
                    <div className="bg-blue-900/20 px-4 py-2.5 rounded-xl border border-blue-500/20 flex flex-col justify-center">
                        <span className="text-[10px] text-blue-400/70 uppercase font-bold tracking-widest mb-1">Pending</span>
                        <span className="text-xl font-black text-blue-400">{stats.pending}</span>
                    </div>
                    <div className="bg-purple-900/20 px-4 py-2.5 rounded-xl border border-purple-500/20 flex flex-col justify-center">
                        <span className="text-[10px] text-purple-400/70 uppercase font-bold tracking-widest mb-1">Response</span>
                        <span className="text-xl font-black text-purple-400">{stats.responseRate}%</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row xl:flex-col justify-center gap-3 shrink-0">
                    <div className="relative w-full xl:w-56">
                        <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-sm" />
                        <input type="text" placeholder="Search leads..." value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner" />
                    </div>
                    <div className="relative w-full xl:w-56">
                        <FaKeyboard className="absolute left-3.5 top-3 text-slate-400 text-sm" />
                        <select value={typingMode} onChange={(e) => setTypingMode(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 rounded-xl py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer transition-all shadow-inner">
                            <option value="en">English (Default)</option>
                            <option value="si-phonetic">සිංහල Phonetic</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* PHASE FILTER TABS */}
            <div className="flex gap-2 bg-[#1e293b] p-2 rounded-2xl mb-4 border border-slate-700 w-full sm:w-max overflow-x-auto custom-scrollbar shadow-lg">
                <button onClick={() => {setActivePhaseFilter(1); setCurrentPage(1);}} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activePhaseFilter === 1 ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <FaFilter className="inline mr-2 opacity-50"/> Phase 1
                </button>
                <button onClick={() => {setActivePhaseFilter(2); setCurrentPage(1);}} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activePhaseFilter === 2 ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <FaFilter className="inline mr-2 opacity-50"/> Phase 2
                </button>
                <button onClick={() => {setActivePhaseFilter(3); setCurrentPage(1);}} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activePhaseFilter === 3 ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <FaFilter className="inline mr-2 opacity-50"/> Phase 3
                </button>
                <button onClick={() => {setActivePhaseFilter('ALL'); setCurrentPage(1);}} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activePhaseFilter === 'ALL' ? 'bg-slate-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    All Leads
                </button>
            </div>

            {/* PREMIUM CAMPAIGN LIST */}
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex-1 flex flex-col">
                <div className="overflow-y-auto custom-scrollbar flex-1 p-3 md:p-4 space-y-3">
                    {paginatedLeads.length === 0 ? <div className="text-center py-20 text-slate-500 text-base font-medium">No leads match your search.</div> : (
                        paginatedLeads.map((lead, index) => {
                            const realIndex = (currentPage - 1) * itemsPerPage + index + 1;
                            const currentRemark = drafts[lead.id] !== undefined ? drafts[lead.id] : (lead.feedback || '');
                            const isDraft = drafts[lead.id] !== undefined && drafts[lead.id] !== lead.feedback;
                            
                            return (
                                <div key={lead.id} className="bg-[#0f172a] border border-slate-700 p-3 md:p-4 rounded-2xl flex flex-col xl:flex-row items-start xl:items-center gap-4 hover:border-blue-500/50 transition-all shadow-sm">
                                    
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300 font-black flex items-center justify-center shrink-0 border border-slate-600 shadow-inner text-sm">
                                        {realIndex}
                                    </div>
                                    
                                    <div className="w-full xl:w-48 shrink-0">
                                        <div className="flex items-center gap-2.5 mb-1">
                                            <h4 className="text-white font-extrabold text-base tracking-wide">{lead.phone}</h4>
                                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md border ${lead.phase === 1 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : lead.phase === 2 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>P{lead.phase}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 truncate font-medium" title={lead.name}>{lead.name || 'No Name Provided'}</p>
                                    </div>

                                    <div className="flex-1 w-full relative">
                                        <textarea 
                                            value={currentRemark} 
                                            onChange={(e) => handleRemarkChange(lead.id, e.target.value)}
                                            placeholder="Type your remark here..." 
                                            rows="1"
                                            className={`w-full bg-[#1e293b] border text-slate-200 rounded-xl p-3 text-sm md:text-[15px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none custom-scrollbar transition-all shadow-inner ${isDraft ? 'border-yellow-500/50' : 'border-slate-600'}`}
                                        />
                                        {isDraft && <span className="absolute -top-2.5 right-3 bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded shadow-lg border border-yellow-400">DRAFT</span>}
                                    </div>

                                    <div className="flex shrink-0 gap-3 w-full xl:w-auto items-center flex-wrap">
                                        
                                        {/* 🔥 FIX: Added Method and Attempts dropdowns next to the Call Status dropdown */}
                                        <select 
                                            value={lead.callMethod || 'direct'}
                                            onChange={(e) => handleUpdateLocalLead(lead.id, 'callMethod', e.target.value)}
                                            className="text-xs px-2 py-2.5 rounded-xl border border-slate-700 bg-[#1e293b] text-slate-300 outline-none focus:border-blue-500"
                                        >
                                            <option value="direct">Direct Call</option>
                                            <option value="whatsapp">WhatsApp</option>
                                            <option value="3cx">3CX Call</option>
                                        </select>

                                        <select 
                                            value={lead.coordinationRound || 1}
                                            onChange={(e) => handleUpdateLocalLead(lead.id, 'coordinationRound', parseInt(e.target.value))}
                                            className="text-xs px-2 py-2.5 rounded-xl border border-slate-700 bg-[#1e293b] text-slate-300 outline-none focus:border-blue-500"
                                        >
                                            <option value={1}>Attempt 1</option>
                                            <option value={2}>Attempt 2</option>
                                            <option value={3}>Attempt 3</option>
                                            <option value={4}>Attempt 4</option>
                                            <option value={5}>Attempt 5</option>
                                        </select>

                                        <select 
                                            onChange={(e) => handleUpdateLocalLead(lead.id, 'callStatus', e.target.value)}
                                            value={lead.callStatus || 'pending'}
                                            className={`text-xs px-3 py-2.5 rounded-xl font-bold outline-none cursor-pointer border transition-colors shadow-sm ${
                                                lead.callStatus === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 focus:border-emerald-500' :
                                                lead.callStatus === 'no_answer' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 focus:border-yellow-500' :
                                                lead.callStatus === 'reject' ? 'bg-red-500/10 text-red-400 border-red-500/30 focus:border-red-500' :
                                                'bg-slate-800 text-slate-300 border-slate-600 focus:border-blue-500'
                                            }`}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="answered">Answered</option>
                                            <option value="no_answer">No Answer</option>
                                            <option value="reject">Reject</option>
                                        </select>

                                        <button onClick={() => handleSaveCallData(lead.id)} title="Save Changes" className="bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white p-3 rounded-xl transition-all shadow-md active:scale-95 border border-emerald-500/50">
                                            <FaSave size={16}/>
                                        </button>
                                        
                                        <button onClick={() => setChatModalLead(lead)} className="bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white p-3 rounded-xl transition-all relative shadow-md active:scale-95 border border-blue-500/50">
                                            <FaCommentDots size={16}/>
                                            {lead.unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full animate-ping"></span>}
                                            {lead.unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#0f172a]"></span>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {totalPages > 1 && (
                    <div className="bg-[#1e293b] p-3 flex justify-center flex-wrap gap-2 border-t border-slate-700 shadow-[0_-4px_10px_rgba(0,0,0,0.2)] z-10">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button 
                                key={page} 
                                onClick={() => setCurrentPage(page)} 
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'}`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* POPUP CHAT MODAL */}
            {chatModalLead && (
                <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex justify-center items-center p-2 md:p-6 animate-fade-in">
                    <div className="w-full max-w-7xl h-[95vh] md:h-[90vh] bg-[#0f172a] rounded-3xl flex flex-col border border-slate-700 shadow-2xl overflow-hidden relative">
                        
                        <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] p-4 flex justify-between items-center border-b border-slate-700 shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                                <h3 className="text-white font-black text-sm md:text-base tracking-wide flex items-center gap-2">
                                    Live CRM Chat <span className="text-blue-400 border-l border-slate-600 pl-2 ml-1">{chatModalLead.phone}</span>
                                </h3>
                            </div>
                            <button onClick={() => {
                                setChatModalLead(null);
                                fetchAssignedLeads(); 
                            }} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest border border-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                                <FaTimes /> Close Workspace
                            </button>
                        </div>

                        <div className="flex flex-1 overflow-hidden relative">
                            <ChatArea selectedLead={chatModalLead} />
                            <div className="hidden lg:block h-full shrink-0 border-l border-slate-800">
                                <RightSidePanel selectedLead={chatModalLead} activeMode="CALL_CAMPAIGN" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}