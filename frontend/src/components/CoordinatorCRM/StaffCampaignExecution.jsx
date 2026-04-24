import React, { useEffect, useState } from 'react';
import axios from '../../api/axios';
import { PhoneCall, CheckCircle, Clock, MessageCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StaffCampaignExecution({ setActiveMode, setSelectedLead }) {
    const user = JSON.parse(localStorage.getItem('user'));
    const [leads, setLeads] = useState([]);
    const [activePhase, setActivePhase] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form states keyed by lead ID
    const [updates, setUpdates] = useState({});

    useEffect(() => { fetchMyLeads(); }, []);

    const fetchMyLeads = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/coordinator-crm/leads?tab=ASSIGNED&staffId=${user.id}&campaignType=FREE_SEMINAR`);
            setLeads(res.data.leads || []);
        } catch (error) { console.error(error); }
        setLoading(false);
    };

    const handleUpdateChange = (leadId, field, value) => {
        setUpdates(prev => ({
            ...prev,
            [leadId]: { ...prev[leadId], [field]: value }
        }));
    };

    const saveCallUpdate = async (leadId) => {
        const updateData = updates[leadId];
        if (!updateData || !updateData.status) return toast.error("Please select a status first");

        try {
            await axios.put('/coordinator-crm/leads/call-campaign', {
                leadId: leadId,
                method: updateData.method || 'direct',
                status: updateData.status,
                feedback: updateData.feedback || ''
            });
            toast.success("Campaign updated successfully!");
            setUpdates(prev => { const newObj = {...prev}; delete newObj[leadId]; return newObj; });
            fetchMyLeads(); // Refresh list to move to next phase if needed
        } catch (error) {
            toast.error("Failed to update");
        }
    };

    const phaseLeads = leads.filter(l => l.phase === activePhase);
    const coveredCount = leads.filter(l => l.callStatus !== 'pending' && l.callStatus !== null).length;
    const pendingCount = leads.filter(l => l.callStatus === 'pending' || !l.callStatus).length;

    return (
        <div className="space-y-6">
            {/* Staff Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Assigned</p>
                        <h3 className="text-2xl font-bold text-white">{leads.length}</h3>
                    </div>
                    <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl"><PhoneCall/></div>
                </div>
                <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Covered</p>
                        <h3 className="text-2xl font-bold text-emerald-400">{coveredCount}</h3>
                    </div>
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl"><CheckCircle/></div>
                </div>
                <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">To Cover (Pending)</p>
                        <h3 className="text-2xl font-bold text-amber-400">{pendingCount}</h3>
                    </div>
                    <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl"><Clock/></div>
                </div>
            </div>

            {/* Phase Tabs */}
            <div className="flex bg-[#0f172a] p-1.5 rounded-xl border border-white/10 w-max">
                {[1, 2, 3].map(phase => (
                    <button 
                        key={phase} 
                        onClick={() => setActivePhase(phase)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activePhase === phase ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-white/5'}`}
                    >
                        Phase {phase}
                    </button>
                ))}
            </div>

            {/* Leads List */}
            <div className="bg-[#1e293b]/60 border border-white/5 rounded-2xl p-4 backdrop-blur-xl shadow-xl">
                {loading ? <div className="text-center text-slate-400 py-10">Loading...</div> : phaseLeads.length === 0 ? <div className="text-center text-slate-400 py-10">No leads in Phase {activePhase}</div> : (
                    <div className="space-y-4">
                        {phaseLeads.map(lead => (
                            <div key={lead.id} className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col xl:flex-row gap-4 items-start xl:items-center">
                                {/* Details */}
                                <div className="w-full xl:w-1/4">
                                    <h4 className="text-white font-bold text-base">{lead.name || 'Unknown'}</h4>
                                    <p className="text-emerald-400 font-bold text-sm tracking-widest">{lead.phone}</p>
                                    <div className="mt-2 text-xs text-slate-500">
                                        Last Status: <span className="uppercase text-slate-300">{lead.callStatus || 'PENDING'}</span>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="flex-1 flex flex-col md:flex-row gap-3 w-full">
                                    <select 
                                        value={updates[lead.id]?.method || lead.callMethod || ''} 
                                        onChange={e => handleUpdateChange(lead.id, 'method', e.target.value)}
                                        className="bg-[#0f172a] border border-slate-700 text-slate-300 text-sm rounded-lg p-2.5 outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Call Method...</option>
                                        <option value="direct">Direct Call</option>
                                        <option value="whatsapp">WhatsApp Audio</option>
                                        <option value="3cx">3CX</option>
                                    </select>

                                    <select 
                                        value={updates[lead.id]?.status || lead.callStatus || 'pending'} 
                                        onChange={e => handleUpdateChange(lead.id, 'status', e.target.value)}
                                        className="bg-[#0f172a] border border-slate-700 text-slate-300 text-sm rounded-lg p-2.5 outline-none focus:border-indigo-500"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="answered">Answered</option>
                                        <option value="no_answer">No Answer</option>
                                        <option value="reject">Reject</option>
                                    </select>

                                    <textarea 
                                        placeholder="Add remark (Sinhala/English supported)..."
                                        value={updates[lead.id]?.feedback !== undefined ? updates[lead.id].feedback : (lead.feedback || '')}
                                        onChange={e => handleUpdateChange(lead.id, 'feedback', e.target.value)}
                                        rows="1"
                                        className="flex-1 bg-[#0f172a] border border-slate-700 text-slate-300 text-sm rounded-lg p-2.5 outline-none focus:border-indigo-500 custom-scrollbar resize-none"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 w-full xl:w-auto shrink-0 justify-end">
                                    {/* 🔥 REDIRECT TO CRM CHAT LOGIC 🔥 */}
                                    <button 
                                        onClick={() => {
                                            setSelectedLead(lead); // CRM eke lead eka select karanawa
                                            setActiveMode('CRM');  // CRM view switch karanawa
                                        }}
                                        className="p-2.5 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition-colors border border-blue-500/30" title="Open Chat"
                                    >
                                        <MessageCircle size={18}/>
                                    </button>
                                    <button 
                                        onClick={() => saveCallUpdate(lead.id)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors shadow-lg"
                                    >
                                        <Save size={16}/> Save
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}