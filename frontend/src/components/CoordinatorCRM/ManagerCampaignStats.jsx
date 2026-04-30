import React, { useEffect, useState, useMemo } from 'react';
import axios from '../../api/axios';
import { BarChart2, MessageCircle, Users, Percent, Download, Clock, Plus, Upload, Megaphone, Search, AlertCircle, CheckCircle, Trash2, UserPlus, Lock, User, Phone } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

export default function ManagerCampaignStats({ filters }) {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const rawRole = user.role || '';
    const userRole = rawRole.toUpperCase().replace(/ /g, '_');
    
    const isSystemAdmin = ['SYSTEM_ADMIN', 'DIRECTOR', 'SUPER'].includes(userRole);
    const isManager = ['MANAGER', 'ASS_MANAGER'].includes(userRole);

    const [data, setData] = useState({ summary: {}, report: [], msgReport: [] });
    const [allLeads, setAllLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [activeTab, setActiveTab] = useState('CALLS');
    const [phase, setPhase] = useState('All');
    const [timeFilter, setTimeFilter] = useState('today');
    
    const today9AM = new Date(); today9AM.setHours(9, 0, 0, 0);
    const todayMidnight = new Date(); todayMidnight.setHours(23, 59, 59, 999);
    const [startDate, setStartDate] = useState(today9AM.toISOString().slice(0, 16));
    const [endDate, setEndDate] = useState(todayMidnight.toISOString().slice(0, 16));

    const [templates, setTemplates] = useState([]);
    const [tplForm, setTplForm] = useState({ name: '', category: 'MARKETING', headerType: 'NONE', headerText: '', bodyText: '', footerText: '' });
    const [tplFile, setTplFile] = useState(null);
    const [tplButtons, setTplButtons] = useState([]); 

    const [searchQuery, setSearchQuery] = useState('');
    const [bcastType, setBcastType] = useState('24H'); 
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [bcastMessage, setBcastMessage] = useState('');
    const [bcastTemplate, setBcastTemplate] = useState('');
    const [bcastFile, setBcastFile] = useState(null);
    const [bcastResults, setBcastResults] = useState(null);
    const [sendingBcast, setSendingBcast] = useState(false);

    const [teamMembers, setTeamMembers] = useState([]);
    const [teamForm, setTeamForm] = useState({ firstName: '', lastName: '', phone: '', password: '' });
    const [teamLoading, setTeamLoading] = useState(false);

    useEffect(() => { 
        fetchStats(); 
        fetchAllLeads();
        if (activeTab === 'TEMPLATES') fetchTemplates();
        if (activeTab === 'TEAM') fetchTeam();
    }, [filters?.selectedBusiness, filters?.selectedBatch, phase, timeFilter, startDate, endDate, activeTab]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            let start = timeFilter === 'today' ? today9AM.toISOString() : new Date(startDate).toISOString();
            let end = timeFilter === 'today' ? todayMidnight.toISOString() : new Date(endDate).toISOString();

            const targetBusinessId = filters?.selectedBusiness || user.businessId;
            const targetBatchId = filters?.selectedBatch || user.batchId;

            const token = localStorage.getItem('token');
            const res = await axios.get('/coordinator-crm/campaign-stats', {
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: targetBusinessId, batchId: targetBatchId, phase, startDate: start, endDate: end }
            });
            setData(res.data);
        } catch (error) { console.error(error); }
        setLoading(false);
    };

    const fetchAllLeads = async () => {
        try { 
            const targetBusinessId = filters?.selectedBusiness || user.businessId;
            const targetBatchId = filters?.selectedBatch || user.batchId;
            const token = localStorage.getItem('token');
            const res = await axios.get('/coordinator-crm/all-leads', { 
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: targetBusinessId, batchId: targetBatchId }
            }); 
            setAllLeads(res.data); 
        } catch(e) {}
    };

    const fetchTemplates = async () => {
        try { 
            const targetBusinessId = filters?.selectedBusiness || user.businessId;
            const token = localStorage.getItem('token');
            const res = await axios.get('/coordinator-crm/meta-templates', { 
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: targetBusinessId }
            }); 
            setTemplates(res.data || []); 
        } catch(e) {}
    };

    const fetchTeam = async () => {
        try { 
            const token = localStorage.getItem('token');
            const [staffRes, bizRes] = await Promise.all([
                axios.get('/admin/staff', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/admin/businesses', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            let coords = staffRes.data.filter(s => s.role && ['COORDINATOR', 'CALLER', 'MANAGER'].includes(s.role.toUpperCase()));
            
            if (filters?.selectedBusiness && bizRes.data) {
                const selectedBizObj = bizRes.data.find(b => String(b.id) === String(filters.selectedBusiness));
                const bizName = selectedBizObj ? selectedBizObj.name : '';

                coords = coords.filter(c => {
                    const cBiz = String(c.businessType || '').toLowerCase().trim();
                    const selBizName = String(bizName).toLowerCase().trim();
                    const selBizId = String(filters.selectedBusiness).toLowerCase().trim();
                    
                    if (!cBiz) return false;

                    return cBiz === selBizName || cBiz === selBizId || String(c.businessId) === String(filters.selectedBusiness);
                });
            }
            setTeamMembers(coords); 
        } catch(e) { console.error("Failed to load team", e); }
    };

    const exportAllLeads = () => {
        let csvContent = "Name,Phone,Status,Phase,AssignedTo\n";
        allLeads.forEach(l => { csvContent += `"${l.name || 'Unknown'}","${l.phone}","${l.callStatus || 'NEW'}","${l.phase}","${l.assignedTo || 'Unassigned'}"\n`; });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); 
        link.setAttribute("href", url);
        link.setAttribute("download", `All_CRM_Leads.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const submitTemplate = async (e) => {
        e.preventDefault();
        const loadToast = toast.loading("Submitting to Meta...");
        try {
            const formData = new FormData();
            formData.append('name', tplForm.name);
            formData.append('category', tplForm.category);
            formData.append('headerType', tplForm.headerType);
            formData.append('headerText', tplForm.headerText);
            formData.append('bodyText', tplForm.bodyText);
            formData.append('footerText', tplForm.footerText);
            formData.append('buttons', JSON.stringify(tplButtons));
            if (tplFile) formData.append('media', tplFile);

            const token = localStorage.getItem('token');
            await axios.post('/coordinator-crm/meta-templates', formData, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Template Created successfully!", { id: loadToast });
            setTplForm({ name: '', category: 'MARKETING', headerType: 'NONE', headerText: '', bodyText: '', footerText: '' });
            setTplButtons([]); setTplFile(null); fetchTemplates();
        } catch (err) { toast.error(err.response?.data?.error || "Failed", { id: loadToast }); }
    };

    const deleteTemplate = async (name) => {
        if(!window.confirm(`Delete template ${name}?`)) return;
        try { 
            const token = localStorage.getItem('token');
            await axios.delete(`/coordinator-crm/meta-templates/${name}`, { headers: { Authorization: `Bearer ${token}` } }); 
            toast.success("Deleted"); 
            fetchTemplates(); 
        } catch(e) { toast.error("Delete failed"); }
    };

    const toggleLeadSelection = (id) => {
        setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const is24hActive = (dateString) => (new Date() - new Date(dateString)) < (24 * 60 * 60 * 1000);
    const filteredBroadcastLeads = allLeads.filter(l => l.phone.includes(searchQuery) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase())));

    const handleSelectAllValid = () => {
        const validIds = filteredBroadcastLeads.filter(l => bcastType === 'TEMPLATE' || is24hActive(l.updatedAt)).map(l => l.id);
        if (selectedLeads.length > 0 && selectedLeads.length === validIds.length) { setSelectedLeads([]); } else { setSelectedLeads(validIds); }
    };

    const handleBroadcast = async () => {
        if (selectedLeads.length === 0) return toast.error("Select leads first!");
        setSendingBcast(true);
        const loadToast = toast.loading("Firing Broadcast...");
        try {
            const formData = new FormData();
            formData.append('leadIds', JSON.stringify(selectedLeads));
            formData.append('type', bcastType);
            formData.append('message', bcastMessage);
            formData.append('templateName', bcastTemplate);
            if (bcastFile) formData.append('media', bcastFile);

            const token = localStorage.getItem('token');
            const res = await axios.post('/coordinator-crm/broadcast', formData, { headers: { Authorization: `Bearer ${token}` } });
            setBcastResults(res.data);
            toast.success("Broadcast completed", { id: loadToast });
        } catch (e) { toast.error("Broadcast Failed", { id: loadToast }); }
        setSendingBcast(false);
    };

    const handleAddTeamMember = async (e) => {
        e.preventDefault();
        setTeamLoading(true);
        try {
            const token = localStorage.getItem('token');
            const bizRes = await axios.get('/admin/businesses', { headers: { Authorization: `Bearer ${token}` } });
            const selectedBizObj = bizRes.data.find(b => String(b.id) === String(filters?.selectedBusiness));
            const bizNameToSave = selectedBizObj ? selectedBizObj.name : String(filters?.selectedBusiness);

            const payload = {
                ...teamForm,
                businessType: bizNameToSave,
                department: 'Class Coordination',
                role: 'CALLER'
            };

            await axios.post('/admin/staff', payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Caller Added Successfully!");
            setTeamForm({ firstName: '', lastName: '', phone: '', password: '' });
            fetchTeam();
        } catch (error) { toast.error(error.response?.data?.error || "Failed to add caller"); }
        setTeamLoading(false);
    };

    const deleteTeamMember = async (id) => {
        if (!window.confirm("Remove this caller?")) return;
        try { 
            const token = localStorage.getItem('token');
            await axios.delete(`/admin/staff/${id}`, { headers: { Authorization: `Bearer ${token}` } }); 
            toast.success("Caller Removed!"); 
            fetchTeam(); 
        } catch (error) { toast.error("Failed to remove"); }
    };

    // 🔥 FIX: Calculate Covered, Pending and Assigned for the top cards 🔥
    const statsCalculations = useMemo(() => {
        if (!data.report) return { covered: 0, pending: 0, assigned: 0 };
        const covered = data.report.reduce((acc, curr) => acc + curr.answered + curr.noAnswer + curr.reject, 0);
        const pending = data.report.reduce((acc, curr) => acc + curr.pending, 0);
        const assigned = data.report.reduce((acc, curr) => acc + curr.assigned, 0);
        return { covered, pending, assigned };
    }, [data.report]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col xl:flex-row justify-between gap-4 bg-[#1e293b] p-4 rounded-2xl border border-white/5 shadow-md">
                <div className="flex gap-2 bg-[#0f172a] p-1 rounded-xl overflow-x-auto custom-scrollbar">
                    <button onClick={() => setActiveTab('CALLS')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'CALLS' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Call Progress</button>
                    <button onClick={() => setActiveTab('WHATSAPP')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'WHATSAPP' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>WhatsApp Metrics</button>
                    <button onClick={() => setActiveTab('TEMPLATES')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'TEMPLATES' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>Meta Templates</button>
                    <button onClick={() => setActiveTab('BROADCAST')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'BROADCAST' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}>Broadcast</button>
                    {(isSystemAdmin || isManager) && <button onClick={() => setActiveTab('TEAM')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'TEAM' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>My Team</button>}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {(activeTab === 'CALLS' || activeTab === 'WHATSAPP') && (
                        <>
                            <select value={phase} onChange={e=>setPhase(e.target.value)} className="bg-[#0f172a] text-slate-300 text-sm p-2 rounded-lg border border-slate-700 outline-none">
                                <option value="All">All Phases</option>
                                <option value="1">Phase 1</option>
                                <option value="2">Phase 2</option>
                                <option value="3">Phase 3</option>
                            </select>
                            <select value={timeFilter} onChange={e=>setTimeFilter(e.target.value)} className="bg-[#0f172a] text-slate-300 text-sm p-2 rounded-lg border border-slate-700 outline-none">
                                <option value="today">Today</option>
                                <option value="custom">Custom Date</option>
                            </select>
                            {timeFilter === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input type="datetime-local" value={startDate} onChange={e=>setStartDate(e.target.value)} className="bg-[#0f172a] text-slate-300 text-xs p-2 rounded-lg border border-slate-700 outline-none" style={{colorScheme: 'dark'}}/>
                                    <span className="text-slate-500 font-bold">TO</span>
                                    <input type="datetime-local" value={endDate} onChange={e=>setEndDate(e.target.value)} className="bg-[#0f172a] text-slate-300 text-xs p-2 rounded-lg border border-slate-700 outline-none" style={{colorScheme: 'dark'}}/>
                                </div>
                            )}
                        </>
                    )}
                    <button onClick={exportAllLeads} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm shadow-lg whitespace-nowrap"><Download size={16}/> Export Full CRM</button>
                </div>
            </div>

            {loading && (activeTab === 'CALLS' || activeTab === 'WHATSAPP') ? <div className="text-center py-10 text-slate-500">Loading metrics...</div> : (
                <>
                    {/* 🔥 FIX: Separated Top Cards for CALLS and WHATSAPP 🔥 */}
                    {activeTab === 'CALLS' && (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Leads</p>
                                <h3 className="text-2xl font-bold text-white">{data.summary.totalLeads}</h3>
                                <div className="absolute bottom-0 right-0 bg-red-500/20 text-red-400 px-4 py-1.5 rounded-tl-xl text-xs font-black border-t border-l border-red-500/30">{data.summary.unassignedLeads} UNASSIGNED</div>
                            </div>
                            <div className="bg-slate-800 p-5 rounded-2xl border border-white/5 shadow-lg">
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">Total Assigned</p>
                                <h3 className="text-2xl font-bold text-indigo-400">{statsCalculations.assigned} <span className="text-[10px] text-slate-500 font-normal">Agents</span></h3>
                            </div>
                            <div className="bg-slate-800 p-5 rounded-2xl border border-white/5 shadow-lg">
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">Covered Leads</p>
                                <h3 className="text-2xl font-bold text-emerald-400">{statsCalculations.covered} <span className="text-[10px] text-slate-500 font-normal">Contacted</span></h3>
                            </div>
                            <div className="bg-slate-800 p-5 rounded-2xl border border-white/5 shadow-lg">
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">Pending Leads</p>
                                <h3 className="text-2xl font-bold text-blue-400">{statsCalculations.pending} <span className="text-[10px] text-slate-500 font-normal">Remaining</span></h3>
                            </div>
                            <div className="bg-slate-800 p-5 rounded-2xl border border-white/5 shadow-lg">
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">Response Rate</p>
                                <h3 className="text-2xl font-bold text-amber-400">{data.summary.rate}%</h3>
                            </div>
                        </div>
                    )}

                    {activeTab === 'WHATSAPP' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-800 p-5 rounded-2xl border border-white/5 shadow-lg">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Unique Numbers Contacted (Sent)</p>
                                <h3 className="text-2xl font-bold text-blue-400">{data.summary.totalSent} <span className="text-[10px] text-slate-500 font-normal">Numbers</span></h3>
                            </div>
                            <div className="bg-slate-800 p-5 rounded-2xl border border-white/5 shadow-lg">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Unique Numbers Replied (Received)</p>
                                <h3 className="text-2xl font-bold text-emerald-400">{data.summary.totalReceived} <span className="text-[10px] text-slate-500 font-normal">Numbers</span></h3>
                            </div>
                        </div>
                    )}

                    {activeTab === 'CALLS' && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="bg-[#1e293b]/60 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl max-h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-black/40 text-slate-400 text-xs uppercase tracking-wider sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4">Agent Name</th>
                                            <th className="p-4 text-center">Assigned</th>
                                            <th className="p-4 text-center text-blue-400">Pending</th>
                                            <th className="p-4 text-center text-emerald-400">Answered</th>
                                            <th className="p-4 text-center text-amber-400">No Answer</th>
                                            <th className="p-4 text-center text-red-400">Reject</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.report.map((r, i) => (
                                            <tr key={i} className="hover:bg-white/5">
                                                <td className="p-4 font-bold text-white">{r.agentName}</td>
                                                <td className="p-4 text-center">{r.assigned}</td>
                                                <td className="p-4 text-center font-bold text-blue-400">{r.pending}</td>
                                                <td className="p-4 text-center font-bold text-emerald-400">{r.answered}</td>
                                                <td className="p-4 text-center font-bold text-amber-400">{r.noAnswer}</td>
                                                <td className="p-4 text-center font-bold text-red-400">{r.reject}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-[#1e293b]/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
                                <h3 className="text-sm font-bold text-white mb-4">Calls Performance</h3>
                                <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.report} barSize={12}> 
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                            <XAxis dataKey="agentName" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '8px'}} />
                                            <Bar dataKey="answered" name="Answered" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="noAnswer" name="No Answer" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="reject" name="Reject" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'WHATSAPP' && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <div className="bg-[#1e293b]/60 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl max-h-[400px] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-black/40 text-slate-400 text-xs uppercase tracking-wider sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4">Agent Name</th>
                                            <th className="p-4 text-center text-blue-400">Leads Contacted</th>
                                            <th className="p-4 text-center text-emerald-400">Leads Replied</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.msgReport.map((r, i) => (
                                            <tr key={i} className="hover:bg-white/5">
                                                <td className="p-4 font-bold text-white">{r.agentName}</td>
                                                <td className="p-4 text-center font-bold text-blue-400">{r.uniqueSent} <span className="text-[10px] text-slate-500 font-normal">Users</span></td>
                                                <td className="p-4 text-center font-bold text-emerald-400">{r.uniqueReceived} <span className="text-[10px] text-slate-500 font-normal">Users</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-[#1e293b]/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
                                <h3 className="text-sm font-bold text-white mb-4">Unique User Interaction Trends</h3>
                                <div style={{ width: '100%', height: '100%', minHeight: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.msgReport}> 
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                            <XAxis dataKey="agentName" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}} />
                                            <Line type="monotone" dataKey="uniqueSent" name="Leads Contacted" stroke="#3b82f6" strokeWidth={3} dot={{r:4}} />
                                            <Line type="monotone" dataKey="uniqueReceived" name="Leads Replied" stroke="#10b981" strokeWidth={3} dot={{r:4}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'TEMPLATES' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-[#1e293b]/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Plus className="text-purple-500"/> Create Meta Template</h3>
                                <form onSubmit={submitTemplate} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs font-bold text-slate-400">Name</label><input type="text" required value={tplForm.name} onChange={e=>setTplForm({...tplForm, name: e.target.value.toLowerCase().replace(/ /g, '_')})} className="w-full bg-[#0f172a] text-white p-2.5 rounded-lg border border-slate-700 mt-1" /></div>
                                        <div><label className="text-xs font-bold text-slate-400">Category</label><select value={tplForm.category} onChange={e=>setTplForm({...tplForm, category: e.target.value})} className="w-full bg-[#0f172a] text-white p-2.5 rounded-lg border border-slate-700 mt-1"><option value="MARKETING">Marketing</option><option value="UTILITY">Utility</option></select></div>
                                    </div>
                                    <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                        <label className="text-xs font-bold text-slate-400 mb-2 block">Header Media</label>
                                        <div className="flex gap-4 mb-3">
                                            {['NONE', 'TEXT', 'IMAGE', 'DOCUMENT'].map(type => (
                                                <label key={type} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="radio" checked={tplForm.headerType === type} onChange={() => setTplForm({...tplForm, headerType: type})} className="accent-purple-500"/> {type}</label>
                                            ))}
                                        </div>
                                        {tplForm.headerType === 'TEXT' && <input type="text" value={tplForm.headerText} onChange={e=>setTplForm({...tplForm, headerText: e.target.value})} className="w-full bg-[#0f172a] text-white p-2 rounded-lg border border-slate-700" placeholder="Header Title" />}
                                        {['IMAGE', 'DOCUMENT'].includes(tplForm.headerType) && <input type="file" onChange={e=>setTplFile(e.target.files[0])} className="w-full text-slate-400 text-sm" />}
                                    </div>
                                    <div><label className="text-xs font-bold text-slate-400">Body Text (Use {'{{1}}'} for variables)</label><textarea required rows="3" value={tplForm.bodyText} onChange={e=>setTplForm({...tplForm, bodyText: e.target.value})} className="w-full bg-[#0f172a] text-white p-2.5 rounded-lg border border-slate-700 mt-1 custom-scrollbar"></textarea></div>
                                    
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 flex justify-between items-center">Buttons (Max 3) <button type="button" onClick={() => tplButtons.length < 3 && setTplButtons([...tplButtons, {text: ''}])} className="text-purple-400">+ Add</button></label>
                                        {tplButtons.map((btn, i) => (
                                            <div key={i} className="flex gap-2 mt-2">
                                                <input type="text" value={btn.text} onChange={e=>{let n=[...tplButtons]; n[i].text=e.target.value; setTplButtons(n);}} placeholder="Button Text" className="flex-1 bg-[#0f172a] text-white p-2 rounded-lg border border-slate-700" />
                                                <button type="button" onClick={()=>{let n=[...tplButtons]; n.splice(i,1); setTplButtons(n)}} className="text-red-400 p-2"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl shadow-lg">Submit to Meta</button>
                                </form>
                            </div>

                            <div className="bg-[#1e293b]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-xl shadow-xl max-h-[600px] overflow-y-auto custom-scrollbar">
                                <h3 className="text-lg font-bold text-white mb-4">Existing Templates</h3>
                                <div className="space-y-3">
                                    {templates.length === 0 ? <p className="text-slate-500 text-sm">No templates found.</p> : templates.map(t => (
                                        <div key={t.id} className="bg-black/30 p-4 rounded-xl border border-white/5 flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-white font-bold">{t.name}</h4>
                                                    <span className={`px-2 py-0.5 text-[10px] font-black rounded ${t.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : t.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{t.status}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 uppercase">{t.language} | {t.category}</p>
                                            </div>
                                            <button onClick={() => deleteTemplate(t.name)} className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 rounded-lg"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'BROADCAST' && (
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1 bg-[#1e293b]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex flex-col max-h-[600px]">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Users size={18}/> Audience ({selectedLeads.length} Selected)</h3>
                                    <button onClick={handleSelectAllValid} className="text-xs font-bold text-blue-400 hover:underline">
                                        {selectedLeads.length > 0 && selectedLeads.length === filteredBroadcastLeads.filter(l => bcastType === 'TEMPLATE' || is24hActive(l.updatedAt)).length ? "Unselect All" : "Select All Valid"}
                                    </button>
                                </div>
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-2.5 text-slate-500" size={16}/>
                                    <input type="text" placeholder="Search numbers..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-amber-500" />
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                    {filteredBroadcastLeads.map(lead => {
                                        const isActive = is24hActive(lead.updatedAt);
                                        const disabled = bcastType === '24H' && !isActive;
                                        return (
                                            <label key={lead.id} className={`flex items-center justify-between p-3 rounded-xl border ${disabled ? 'bg-slate-800/50 border-transparent opacity-50' : 'bg-black/30 border-white/5 cursor-pointer hover:border-white/20'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" disabled={disabled} checked={selectedLeads.includes(lead.id)} onChange={() => toggleLeadSelection(lead.id)} className="accent-amber-500 w-4 h-4"/>
                                                    <div>
                                                        <p className="text-white font-bold text-sm">{lead.phone}</p>
                                                        <p className="text-slate-500 text-xs">{lead.name || 'No Name'}</p>
                                                    </div>
                                                </div>
                                                {isActive ? <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-md">24H ACTIVE</span> : <span className="px-2 py-1 bg-slate-700 text-slate-400 text-[10px] font-black rounded-md">INACTIVE</span>}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="w-full lg:w-[400px] flex flex-col gap-6">
                                <div className="bg-[#1e293b]/60 border border-white/5 rounded-2xl p-5 backdrop-blur-xl shadow-xl">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Megaphone size={18}/> Send Broadcast</h3>
                                    
                                    <div className="flex gap-2 p-1 bg-[#0f172a] rounded-xl mb-4">
                                        <button onClick={() => {setBcastType('24H'); setSelectedLeads([]);}} className={`flex-1 py-2 text-xs font-bold rounded-lg ${bcastType === '24H' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}>24H Message</button>
                                        <button onClick={() => {setBcastType('TEMPLATE'); setSelectedLeads([]);}} className={`flex-1 py-2 text-xs font-bold rounded-lg ${bcastType === 'TEMPLATE' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}>Template</button>
                                    </div>

                                    {bcastType === '24H' ? (
                                        <>
                                            <p className="text-[10px] text-amber-400 mb-2 leading-tight">Only users who interacted within the last 24 hours can receive free-form messages.</p>
                                            <textarea rows="3" value={bcastMessage} onChange={e=>setBcastMessage(e.target.value)} placeholder="Custom message..." className="w-full bg-[#0f172a] text-white p-3 rounded-xl border border-slate-700 custom-scrollbar resize-none mb-3"></textarea>
                                            <input type="file" onChange={e=>setBcastFile(e.target.files[0])} className="w-full text-slate-400 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-300" />
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-[10px] text-blue-400 mb-2 leading-tight">Templates can be sent to anyone. If your template has variables or a Header Media, add them below.</p>
                                            <select value={bcastTemplate} onChange={e=>setBcastTemplate(e.target.value)} className="w-full bg-[#0f172a] text-white p-3 rounded-xl border border-slate-700 mb-3">
                                                <option value="">Select Approved Template...</option>
                                                {templates.filter(t => t.status === 'APPROVED').map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                            </select>
                                            
                                            <textarea rows="2" value={bcastMessage} onChange={e=>setBcastMessage(e.target.value)} placeholder="Variable Text (e.g. Hi there!)" className="w-full bg-[#0f172a] text-white p-3 rounded-xl border border-slate-700 custom-scrollbar resize-none mb-3"></textarea>
                                            <input type="file" onChange={e=>setBcastFile(e.target.files[0])} className="w-full text-slate-400 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-300" />
                                        </>
                                    )}

                                    <button onClick={handleBroadcast} disabled={sendingBcast} className="w-full mt-5 bg-amber-500 hover:bg-amber-400 text-black font-black py-3 rounded-xl shadow-lg transition-colors disabled:opacity-50">
                                        {sendingBcast ? 'Sending...' : `Fire Broadcast to ${selectedLeads.length}`}
                                    </button>
                                </div>

                                {bcastResults && (
                                    <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 shadow-inner">
                                        <h4 className="text-white font-bold mb-3">Broadcast Results</h4>
                                        <div className="flex gap-4 mb-4">
                                            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-center">
                                                <p className="text-emerald-400 text-2xl font-black">{bcastResults.success}</p>
                                                <p className="text-[10px] text-emerald-500/70 font-bold uppercase">Success</p>
                                            </div>
                                            <div className="flex-1 bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-center">
                                                <p className="text-red-400 text-2xl font-black">{bcastResults.failed}</p>
                                                <p className="text-[10px] text-red-500/70 font-bold uppercase">Failed</p>
                                            </div>
                                        </div>
                                        {bcastResults.reasons.length > 0 && (
                                            <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-2">
                                                {bcastResults.reasons.map((r, i) => (
                                                    <div key={i} className="flex items-start gap-2 text-xs bg-red-500/5 p-2 rounded border border-red-500/10">
                                                        <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5"/>
                                                        <div><span className="font-bold text-slate-300">{r.phone}:</span> <span className="text-slate-500">{r.error}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'TEAM' && (isSystemAdmin || isManager) && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-[#1e293b]/60 p-6 rounded-3xl border border-white/5 shadow-xl h-fit">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><UserPlus size={20} className="text-blue-500"/> Add Call Agent</h3>
                                <form onSubmit={handleAddTeamMember} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 mb-1 block uppercase">First Name</label>
                                            <div className="relative">
                                                <User size={16} className="absolute left-3 top-3 text-slate-500"/>
                                                <input type="text" required value={teamForm.firstName} onChange={e=>setTeamForm({...teamForm, firstName: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm outline-none focus:border-blue-500" placeholder="John" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 mb-1 block uppercase">Last Name</label>
                                            <input type="text" required value={teamForm.lastName} onChange={e=>setTeamForm({...teamForm, lastName: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm outline-none focus:border-blue-500" placeholder="Doe" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 mb-1 block uppercase">Phone Number</label>
                                        <div className="relative">
                                            <Phone size={16} className="absolute left-3 top-3 text-slate-500"/>
                                            <input type="text" required value={teamForm.phone} onChange={e=>setTeamForm({...teamForm, phone: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm outline-none focus:border-blue-500" placeholder="07XXXXXXXX" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 mb-1 block uppercase">Login Password</label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3 top-3 text-slate-500"/>
                                            <input type="text" required value={teamForm.password} onChange={e=>setTeamForm({...teamForm, password: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm outline-none focus:border-blue-500" placeholder="Set a secure password" />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={teamLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg mt-2 disabled:opacity-50 transition-colors">
                                        {teamLoading ? "Adding..." : "Create Team Member"}
                                    </button>
                                </form>
                            </div>
                            <div className="lg:col-span-2 bg-[#1e293b]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl shadow-xl max-h-[600px] overflow-y-auto custom-scrollbar">
                                <h3 className="text-lg font-bold text-white mb-6">Active Call Center Team</h3>
                                {teamMembers.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 bg-black/20 rounded-2xl border border-white/5">No external callers added yet.</div>
                                ) : (
                                    <div className="space-y-6">
                                        
                                        <div>
                                            <h4 className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-3 border-b border-slate-700 pb-2">External Callers</h4>
                                            <div className="space-y-3">
                                                {teamMembers.filter(m => m.role === 'CALLER').map(caller => (
                                                    <div key={caller.id} className="bg-black/30 p-4 rounded-2xl border border-white/5 flex justify-between items-center hover:border-white/20 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-500/20">
                                                                {caller.firstName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-white font-bold">{caller.firstName} {caller.lastName}</h4>
                                                                <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={12}/> {caller.phone}</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => deleteTeamMember(caller.id)} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors border border-transparent hover:border-red-500/30">
                                                            <Trash2 size={18}/>
                                                        </button>
                                                    </div>
                                                ))}
                                                {teamMembers.filter(m => m.role === 'CALLER').length === 0 && <p className="text-xs text-slate-500 italic">No external callers found.</p>}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-3 border-b border-slate-700 pb-2">Staff Coordinators</h4>
                                            <div className="space-y-3">
                                                {teamMembers.filter(m => m.role !== 'CALLER').map(caller => (
                                                    <div key={caller.id} className="bg-black/30 p-4 rounded-2xl border border-white/5 flex justify-between items-center hover:border-white/20 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/20">
                                                                {caller.firstName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-white font-bold">{caller.firstName} {caller.lastName}</h4>
                                                                <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={12}/> {caller.phone}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {teamMembers.filter(m => m.role !== 'CALLER').length === 0 && <p className="text-xs text-slate-500 italic">No staff coordinators found.</p>}
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}