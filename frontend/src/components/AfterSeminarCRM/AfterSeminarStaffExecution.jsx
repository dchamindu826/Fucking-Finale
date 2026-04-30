import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { FaCommentDots, FaUsers, FaChartPie, FaTimes } from 'react-icons/fa';

import AfterSeminarNewInq from './AfterSeminarNewInq';
import AfterSeminarOpenSem from './AfterSeminarOpenSem';
import AfterSeminarProgress from './AfterSeminarProgress';
import AfterSeminarChatArea from './AfterSeminarChatArea';
import RightSidePanel from './AfterSeminarRightPanel';

export default function AfterSeminarStaffExecution({ filters, allBatches = [], setSelectedLead }) {
    const rawRole = JSON.parse(localStorage.getItem('user'))?.role || '';
    const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;
    const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'].includes(rawRole.toUpperCase().replace(/ /g, '_'));

    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFlow, setActiveFlow] = useState('OPEN_SEMINAR'); // Default to Open Seminar based on your SS
    const [drafts, setDrafts] = useState({});
    const [chatModalLead, setChatModalLead] = useState(null);

    useEffect(() => {
        fetchAssignedLeads();
    }, [filters?.selectedBusiness, filters?.selectedBatch]);

    const fetchAssignedLeads = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/leads', {
                headers: { Authorization: `Bearer ${token}` }, 
                params: {
                    tab: 'ASSIGNED',
                    loggedUserId: currentUserId, 
                    loggedUserRole: rawRole,
                    businessId: isManager ? (filters?.selectedBusiness || '') : '',
                    batchId: isManager ? (filters?.selectedBatch || '') : ''
                }
            });
            
            setLeads(res.data.leads || []);
            const loadedDrafts = {};
            (res.data.leads || []).forEach(l => {
                const savedDraft = localStorage.getItem(`draft_remark_as_${l.id}`);
                if (savedDraft) loadedDrafts[l.id] = savedDraft;
            });
            setDrafts(loadedDrafts);
            setLoading(false);
        } catch (error) {
            toast.error("Failed to load campaign leads");
            setLoading(false);
        }
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
            localStorage.removeItem(`draft_remark_as_${leadId}`);
            
        } catch (error) { toast.error("Failed to save data."); }
    };

    const handleTempUnlock = async (leadId) => {
        if (!isManager) return toast.error("Only managers can unlock leads.");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/temp-unlock', { leadId }, { headers: { Authorization: `Bearer ${token}` }});
            toast.success("Lead temporary unlocked for 24 hours!");
            fetchAssignedLeads(); 
        } catch (error) {
            toast.error("Failed to unlock lead.");
        }
    };

    return (
        <div className="w-full h-full flex flex-col p-2 md:p-4 bg-[#0b0e14] overflow-y-auto custom-scrollbar font-sans relative">
            
            {/* MASTER FLOW CONTROLLER */}
            <div className="flex flex-col md:flex-row gap-4 mb-5 bg-[#141a23] p-2 rounded-2xl border border-slate-800 shadow-xl">
                <div className="flex flex-1 gap-2">
                    <button 
                        onClick={() => setActiveFlow('NEW_INQ')} 
                        className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-all ${activeFlow === 'NEW_INQ' ? 'bg-blue-600 text-white font-semibold shadow-lg' : 'bg-[#1a2332] text-slate-400 hover:text-white font-medium border border-slate-700/50'}`}
                    >
                        <div className="flex items-center gap-2 text-[15px]"><FaCommentDots /> DIRECT INQUIRIES</div>
                    </button>
                    <button 
                        onClick={() => setActiveFlow('OPEN_SEMINAR')} 
                        className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-all ${activeFlow === 'OPEN_SEMINAR' ? 'bg-blue-600 text-white font-semibold shadow-lg' : 'bg-[#1a2332] text-slate-400 hover:text-white font-medium border border-slate-700/50'}`}
                    >
                        <div className="flex items-center gap-2 text-[15px]"><FaUsers /> OPEN SEMINAR</div>
                    </button>
                </div>
                <button 
                    onClick={() => setActiveFlow('PROGRESS')}
                    className={`md:w-56 rounded-xl shadow-lg flex items-center justify-center gap-2 py-3 transition-all ${activeFlow === 'PROGRESS' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold shadow-pink-500/30' : 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 text-pink-500 hover:from-pink-500 hover:to-purple-600 hover:text-white font-medium border border-pink-500/30'}`}
                >
                    <FaChartPie size={18}/> My Progress
                </button>
            </div>

            {loading ? <div className="text-center py-20 text-white animate-pulse">Loading Workspace...</div> : (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {activeFlow === 'NEW_INQ' && <AfterSeminarNewInq leads={leads} drafts={drafts} setDrafts={setDrafts} handleUpdateLocalLead={handleUpdateLocalLead} handleSaveCallData={handleSaveCallData} handleTempUnlock={handleTempUnlock} setChatModalLead={setChatModalLead} isManager={isManager} />}
                    {activeFlow === 'OPEN_SEMINAR' && <AfterSeminarOpenSem leads={leads} allBatches={allBatches} filters={filters} drafts={drafts} setDrafts={setDrafts} handleUpdateLocalLead={handleUpdateLocalLead} handleSaveCallData={handleSaveCallData} handleTempUnlock={handleTempUnlock} setChatModalLead={setChatModalLead} isManager={isManager} />}
                    {activeFlow === 'PROGRESS' && <AfterSeminarProgress leads={leads} allBatches={allBatches} />}
                </div>
            )}

            {/* CHAT MODAL */}
            {chatModalLead && (
                <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex justify-center items-center p-2 md:p-6 animate-fade-in">
                    <div className="w-full max-w-7xl h-[95vh] md:h-[90vh] bg-[#0f172a] rounded-3xl flex flex-col border border-slate-700 shadow-2xl overflow-hidden relative">
                        <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] p-4 flex justify-between items-center border-b border-slate-700 shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                                <h3 className="text-white font-bold text-sm md:text-base flex items-center gap-2">Live CRM Chat <span className="text-blue-400 border-l border-slate-600 pl-2 ml-1">{chatModalLead.phone}</span></h3>
                            </div>
                            <button onClick={() => { setChatModalLead(null); fetchAssignedLeads(); }} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold uppercase border border-red-500/20 hover:bg-red-500 hover:text-white"><FaTimes /> Close Workspace</button>
                        </div>
                        <div className="flex flex-1 overflow-hidden relative">
                            <AfterSeminarChatArea selectedLead={chatModalLead} />
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