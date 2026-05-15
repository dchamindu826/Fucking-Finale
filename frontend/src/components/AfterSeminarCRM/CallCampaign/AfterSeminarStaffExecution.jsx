import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

// 🔥 Coordinator ගේ Modules 4 Import කරගන්නවා 🔥
import AfterSeminarOpenSem from './AfterSemOpen/AfterSeminarOpenSem';
import AfterSeminarNewInq from './AfterSemNew/AfterSeminarNewInq';
import AfterSeminarPaidCampaign from './AfterSeminarPaidCampaign';
import BridgeStaffExecution from "./BridgeStaffExecution";

export default function AfterSeminarStaffExecution({ filters, allBatches, setSelectedLead, externalTab, campaignSearchPhone }) {
    const [activeTab, setActiveTab] = useState('OPEN_SEM'); // OPEN_SEM, NEW_INQ, BRIDGE, PAID
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [drafts, setDrafts] = useState({});

    const currentUser = JSON.parse(localStorage.getItem('user'));
    const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER', 'ADMIN'].includes(currentUser?.role?.toUpperCase().replace(/ /g, '_'));

    // 🔥 Dashboard එකෙන් එන Tab එකට මාරු වෙන්න 🔥
    useEffect(() => {
        if (externalTab) {
            setActiveTab(externalTab);
        }
    }, [externalTab]);

    useEffect(() => {
        if (activeTab === 'OPEN_SEM' || activeTab === 'NEW_INQ') {
            fetchRegularLeads();
        }
    }, [filters, activeTab]);

    const fetchRegularLeads = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/leads', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
    tab: 'ASSIGNED',
    loggedUserId: currentUser?.id,
    loggedUserRole: currentUser?.role,
    businessId: filters?.selectedBusiness || '', // 🔥 isManager condition එක අයින් කළා
    batchId: filters?.selectedBatch || ''        // 🔥 isManager condition එක අයින් කළා
}
            });
            
            const regularLeads = (res.data.leads || []).filter(l => l.source !== 'bridge_transfer');
            setLeads(regularLeads);

            const loadedDrafts = {};
            regularLeads.forEach(l => {
                const savedDraft = localStorage.getItem(`draft_remark_as_${l.id}`);
                if (savedDraft) loadedDrafts[l.id] = savedDraft;
            });
            setDrafts(loadedDrafts);
        } catch (error) {
            toast.error("Failed to load assigned leads");
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
            localStorage.removeItem(`draft_remark_as_${leadId}`);
            
        } catch (error) { toast.error("Failed to save data."); }
    };

    const handleTempUnlock = async (leadId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/leads/unlock', { leadId }, { headers: { Authorization: `Bearer ${token}` }});
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, isLocked: false } : l));
            toast.success("Lead Temporarily Unlocked!");
        } catch (e) { toast.error("Failed to unlock lead."); }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden font-sans antialiased text-slate-200 bg-[#0f151c]">
            
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl shrink-0 flex items-center justify-between">
                <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5 shadow-inner overflow-x-auto">
                    {[
                        { id: 'OPEN_SEM', label: 'Open Seminar Tasks' },
                        { id: 'NEW_INQ', label: 'Direct Inquiries' },
                        { id: 'BRIDGE', label: 'Bridge Execution' },
                        { id: 'PAID', label: 'Paid / Follow-ups' }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-300 tracking-wide whitespace-nowrap ${activeTab === tab.id ? 'bg-[#f59e0b] text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                
                {loading && (activeTab === 'OPEN_SEM' || activeTab === 'NEW_INQ') ? (
                    <div className="flex justify-center items-center h-full text-slate-400">
                        <Loader2 className="animate-spin mr-2" size={20}/> Loading Assigned Leads...
                    </div>
                ) : (
                    <>
                        {activeTab === 'OPEN_SEM' && (
                            <div className="animate-fade-in-up h-full">
                                <AfterSeminarOpenSem 
                                    leads={leads} drafts={drafts} setDrafts={setDrafts} 
                                    handleUpdateLocalLead={handleUpdateLocalLead} handleSaveCallData={handleSaveCallData} 
                                    handleTempUnlock={handleTempUnlock} setChatModalLead={setSelectedLead} 
                                    isManager={isManager} allBatches={allBatches} filters={filters}
                                    externalSearch={campaignSearchPhone} // 🔥 අලුත් PROP එක 
                                />
                            </div>
                        )}

                        {activeTab === 'NEW_INQ' && (
                            <div className="animate-fade-in-up h-full">
                                <AfterSeminarNewInq 
                                    leads={leads} drafts={drafts} setDrafts={setDrafts} 
                                    handleUpdateLocalLead={handleUpdateLocalLead} handleSaveCallData={handleSaveCallData} 
                                    handleTempUnlock={handleTempUnlock} setChatModalLead={setSelectedLead} 
                                    isManager={isManager} 
                                    externalSearch={campaignSearchPhone} // 🔥 අලුත් PROP එක 
                                />
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'BRIDGE' && (
                    <div className="animate-fade-in-up h-full">
                        <BridgeStaffExecution 
                           filters={filters} 
                           setChatModalLead={setSelectedLead} 
                           externalSearch={campaignSearchPhone} // 🔥 අලුත් PROP එක 
                        />
                    </div>
                )}

                {activeTab === 'PAID' && (
                    <div className="animate-fade-in-up h-full">
                        <AfterSeminarPaidCampaign 
                           filters={filters} 
                           setChatModalLead={setSelectedLead} 
                           externalSearch={campaignSearchPhone} // 🔥 අලුත් PROP එක 
                        />
                    </div>
                )}

            </div>
        </div>
    );
}