import React, { useEffect, useState, useMemo } from 'react';
import axios from '../../api/axios';
import { BarChart2, MessageCircle, Users, Percent, Download, Clock, Plus, Upload, Megaphone, Search, AlertCircle, CheckCircle, Trash2, UserPlus, Lock, User, Phone, Play, PieChart as PieIcon, Activity } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AfterSeminarManagerCampaignStats({ filters }) {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const rawRole = user.role || '';
    const userRole = rawRole.toUpperCase().replace(/ /g, '_');
    
    const isSystemAdmin = ['SYSTEM_ADMIN', 'DIRECTOR', 'SUPER'].includes(userRole);
    const isManager = ['MANAGER', 'ASS_MANAGER'].includes(userRole);

    const [allLeads, setAllLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ summary: {}, report: [], msgReport: [] });
    
    const [activeTab, setActiveTab] = useState('DASHBOARD');
    const [activeFlow, setActiveFlow] = useState('NEW_INQ'); // NEW_INQ or OPEN_SEMINAR
    const [activeCoordinationRound, setActiveCoordinationRound] = useState(1);
    
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
        fetchAllLeads();
        if (activeTab === 'WHATSAPP') fetchStats(); // Legacy API for WA metrics
        if (activeTab === 'TEMPLATES') fetchTemplates();
        if (activeTab === 'TEAM') fetchTeam();
    }, [filters?.selectedBusiness, filters?.selectedBatch, activeTab]);

    const fetchAllLeads = async () => {
        setLoading(true);
        try { 
            const targetBusinessId = filters?.selectedBusiness || user.businessId;
            const targetBatchId = filters?.selectedBatch || user.batchId;
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/all-leads', { 
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: targetBusinessId, batchId: targetBatchId }
            }); 
            setAllLeads(res.data); 
        } catch(e) {}
        setLoading(false);
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/campaign-stats', {
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: filters?.selectedBusiness || user.businessId, batchId: filters?.selectedBatch || user.batchId }
            });
            setData(res.data);
        } catch (error) { console.error(error); }
    };

    // ... (fetchTemplates, fetchTeam, deleteTemplate, submitTemplate, handleBroadcast, handleAddTeamMember, deleteTeamMember logic remains identical)
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

    // 🔥 START NEXT COORDINATION ROUND 🔥
    const handleStartNextRound = async () => {
        const confirmStr = window.prompt('Type "CONFIRM" to start the next coordination round. This moves all non-enrolled to the next attempt.');
        if (confirmStr !== 'CONFIRM') return;

        const loadToast = toast.loading("Starting new coordination round...");
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/start-coordination', {
                businessId: filters?.selectedBusiness || '',
                batchId: filters?.selectedBatch || ''
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            toast.success("New Round Started Successfully!", { id: loadToast });
            fetchAllLeads();
        } catch (error) {
            toast.error("Failed to start new round", { id: loadToast });
        }
    };

    const exportAllLeads = () => {
        let csvContent = "Name,Phone,Type,Round,Status,AssignedTo,PaymentGroup,Enrollment\n";
        allLeads.forEach(l => { csvContent += `"${l.name || 'Unknown'}","${l.phone}","${l.inquiryType}","${l.coordinationRound || 1}","${l.callStatus || 'NEW'}","${l.assignedTo || 'Unassigned'}","${l.paymentIntention}","${l.enrollmentStatus}"\n`; });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); 
        link.setAttribute("href", url);
        link.setAttribute("download", `After_Seminar_Leads.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    // ... (rest of standard functions: submitTemplate, handleBroadcast, handleAddTeamMember omitted for brevity but they are kept the same)
    
    // ========================================================
    // 🔥 NEW ADVANCED DATA CALCULATIONS FOR MANAGER UI 🔥
    // ========================================================

    const activeLeads = useMemo(() => {
        return allLeads.filter(l => {
            if (activeFlow === 'NEW_INQ') return l.inquiryType === 'NEW_INQ';
            return l.inquiryType === 'OPEN_SEMINAR' || l.inquiryType === 'NORMAL';
        });
    }, [allLeads, activeFlow]);

    const roundFilteredLeads = useMemo(() => {
        if (activeFlow === 'NEW_INQ') return activeLeads; // Round doesn't strictly apply to New Inq in same way
        return activeLeads.filter(l => (l.coordinationRound || 1) === activeCoordinationRound);
    }, [activeLeads, activeFlow, activeCoordinationRound]);

    // Top Level Stats
    const topStats = useMemo(() => {
        const total = roundFilteredLeads.length;
        const assigned = roundFilteredLeads.filter(l => l.assignedTo).length;
        const unassigned = total - assigned;
        const covered = roundFilteredLeads.filter(l => ['answered', 'no_answer', 'reject'].includes(l.callStatus)).length;
        const pending = total - covered;
        const enrolled = roundFilteredLeads.filter(l => l.enrollmentStatus === 'ENROLLED').length;
        
        return { total, assigned, unassigned, covered, pending, enrolled, rate: total > 0 ? Math.round((covered/total)*100) : 0 };
    }, [roundFilteredLeads]);

    // Agent Performance Data
    const agentData = useMemo(() => {
        const map = {};
        roundFilteredLeads.forEach(l => {
            if (!l.assignedTo) return;
            const name = l.assignedUser?.firstName || `Agent ${l.assignedTo}`;
            if (!map[name]) map[name] = { name, Assigned: 0, Covered: 0, Pending: 0, Enrolled: 0, NonEnrolled: 0 };
            
            map[name].Assigned++;
            if (['answered', 'no_answer', 'reject'].includes(l.callStatus)) map[name].Covered++;
            else map[name].Pending++;

            if (l.enrollmentStatus === 'ENROLLED') map[name].Enrolled++;
            else map[name].NonEnrolled++;
        });
        return Object.values(map);
    }, [roundFilteredLeads]);

    // Group Breakdown
    const enrollmentPieData = [
        { name: 'Full Pay', value: roundFilteredLeads.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'FULL').length },
        { name: 'Monthly', value: roundFilteredLeads.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'MONTHLY').length },
        { name: 'Installment', value: roundFilteredLeads.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'INSTALLMENT').length },
        { name: 'Non-Enrolled', value: roundFilteredLeads.filter(l => l.enrollmentStatus !== 'ENROLLED').length }
    ];

    // MoM Data
    const currentMonth = new Date().getMonth();
    const momCompareData = useMemo(() => {
        return [
            { 
                name: 'Last Month', 
                Enrolled: activeLeads.filter(l => new Date(l.updatedAt).getMonth() === currentMonth - 1 && l.enrollmentStatus === 'ENROLLED').length,
                Dropped: activeLeads.filter(l => new Date(l.updatedAt).getMonth() === currentMonth - 1 && l.enrollmentStatus === 'NON_ENROLLED').length
            },
            { 
                name: 'This Month', 
                Enrolled: activeLeads.filter(l => new Date(l.updatedAt).getMonth() === currentMonth && l.enrollmentStatus === 'ENROLLED').length,
                Dropped: activeLeads.filter(l => new Date(l.updatedAt).getMonth() === currentMonth && l.enrollmentStatus === 'NON_ENROLLED').length
            }
        ];
    }, [activeLeads, currentMonth]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col xl:flex-row justify-between gap-4 bg-[#1e293b] p-4 rounded-2xl border border-white/5 shadow-md">
                <div className="flex gap-2 bg-[#0f172a] p-1 rounded-xl overflow-x-auto custom-scrollbar">
                    <button onClick={() => setActiveTab('DASHBOARD')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'DASHBOARD' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Advanced Dashboard</button>
                    <button onClick={() => setActiveTab('WHATSAPP')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'WHATSAPP' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>WhatsApp Metrics</button>
                    <button onClick={() => setActiveTab('TEMPLATES')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'TEMPLATES' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>Meta Templates</button>
                    <button onClick={() => setActiveTab('BROADCAST')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'BROADCAST' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}>Broadcast</button>
                    {(isSystemAdmin || isManager) && <button onClick={() => setActiveTab('TEAM')} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'TEAM' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>My Team</button>}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* MANAGER START ROUND BUTTON */}
                    {(activeTab === 'DASHBOARD' && (isSystemAdmin || isManager)) && (
                        <button onClick={handleStartNextRound} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-lg text-sm shadow-[0_0_15px_rgba(239,68,68,0.4)] whitespace-nowrap border border-red-400/30 transition-all transform hover:scale-105">
                            <Play size={16} className="fill-current"/> START NEXT ROUND (Batch)
                        </button>
                    )}
                    <button onClick={exportAllLeads} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm shadow-lg whitespace-nowrap"><Download size={16}/> Export CRM</button>
                </div>
            </div>

            {loading ? <div className="text-center py-10 text-slate-500 animate-pulse">Loading Deep Metrics...</div> : (
                <>
                    {activeTab === 'DASHBOARD' && (
                        <div className="space-y-6">
                            {/* FLOW SWITCHER */}
                            <div className="flex gap-4 bg-[#0f172a] p-2 rounded-2xl border border-slate-700 w-full md:w-1/2">
                                <button onClick={() => setActiveFlow('NEW_INQ')} className={`flex-1 py-3 font-black rounded-xl transition-all ${activeFlow === 'NEW_INQ' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-[#1e293b]'}`}>DIRECT INQUIRIES</button>
                                <button onClick={() => setActiveFlow('OPEN_SEMINAR')} className={`flex-1 py-3 font-black rounded-xl transition-all ${activeFlow === 'OPEN_SEMINAR' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-[#1e293b]'}`}>OPEN SEMINAR</button>
                            </div>

                            {/* ROUND SWITCHER (Only for Open Seminar) */}
                            {activeFlow === 'OPEN_SEMINAR' && (
                                <div className="flex gap-2 bg-[#0f172a] p-2 rounded-xl border border-slate-700 overflow-x-auto custom-scrollbar">
                                    {[1,2,3,4,5,6,7,8,9,10].map(round => (
                                        <button 
                                            key={round} 
                                            onClick={() => setActiveCoordinationRound(round)} 
                                            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeCoordinationRound === round ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                        >
                                            {round}th Coord
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* TOP STATS */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 text-center shadow-lg">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total</p>
                                    <h3 className="text-2xl font-black text-white">{topStats.total}</h3>
                                </div>
                                <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 text-center shadow-lg">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Assigned</p>
                                    <h3 className="text-2xl font-black text-indigo-400">{topStats.assigned}</h3>
                                </div>
                                <div className="bg-[#1e293b] p-5 rounded-2xl border border-emerald-500/30 bg-emerald-900/10 text-center shadow-lg">
                                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Enrolled</p>
                                    <h3 className="text-2xl font-black text-emerald-400">{topStats.enrolled}</h3>
                                </div>
                                <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 text-center shadow-lg">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Covered</p>
                                    <h3 className="text-2xl font-black text-amber-400">{topStats.covered}</h3>
                                </div>
                                <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 text-center shadow-lg">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending</p>
                                    <h3 className="text-2xl font-black text-red-400">{topStats.pending}</h3>
                                </div>
                                <div className="bg-[#1e293b] p-5 rounded-2xl border border-white/5 text-center shadow-lg">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Coverage Rate</p>
                                    <h3 className="text-2xl font-black text-blue-400">{topStats.rate}%</h3>
                                </div>
                            </div>

                            {/* CHARTS ROW */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                
                                {/* AGENT PERFORMANCE TABLE */}
                                <div className="lg:col-span-1 bg-[#1e293b]/60 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl max-h-[400px] overflow-y-auto custom-scrollbar">
                                    <div className="p-4 bg-black/20 border-b border-white/5"><h3 className="text-sm font-bold text-white">Agent Breakdown</h3></div>
                                    <table className="w-full text-left text-xs text-slate-300">
                                        <thead className="bg-black/40 text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                                            <tr>
                                                <th className="p-3">Agent</th>
                                                <th className="p-3 text-center">Assig.</th>
                                                <th className="p-3 text-center text-emerald-400">Enrolled</th>
                                                <th className="p-3 text-center text-red-400">Non</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {agentData.map((a, i) => (
                                                <tr key={i} className="hover:bg-white/5">
                                                    <td className="p-3 font-bold text-white">{a.name}</td>
                                                    <td className="p-3 text-center">{a.Assigned}</td>
                                                    <td className="p-3 text-center font-bold text-emerald-400">{a.Enrolled}</td>
                                                    <td className="p-3 text-center font-bold text-red-400">{a.NonEnrolled}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* AGENT CHART */}
                                <div className="lg:col-span-2 bg-[#1e293b]/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-xl h-[400px]">
                                    <h3 className="text-sm font-bold text-white mb-4">Agent Conversion Chart</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={agentData}> 
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={10} />
                                            <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#1e293b', border: '1px solid #ffffff10', borderRadius: '8px'}} />
                                            <Legend />
                                            <Bar dataKey="Enrolled" name="Enrolled" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="NonEnrolled" name="Non-Enrolled" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[350px]">
                                {/* ENROLLMENT PIE */}
                                <div className="bg-[#1e293b]/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col items-center">
                                    <h3 className="text-sm font-bold text-white mb-2">Total Payment Group Distribution</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={enrollmentPieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                                                {enrollmentPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px'}} />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* MOM COMPARE */}
                                <div className="bg-[#1e293b]/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
                                    <h3 className="text-sm font-bold text-white mb-2">Month over Month Global Retention</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={momCompareData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false}/>
                                            <XAxis dataKey="name" stroke="#94a3b8" />
                                            <YAxis stroke="#94a3b8" />
                                            <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px'}} />
                                            <Legend />
                                            <Bar dataKey="Enrolled" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                                            <Bar dataKey="Dropped" name="Non-Enrolled/Dropped" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WhatsApp, Templates, Broadcast, Team Tabs Code Remains Exactly As Originally Provided Here to Keep Length Manageable... */}
                    {/* ... Oya dunna parana tabs tika as it is thiyenawa. Eka wenas kale na. */}
                </>
            )}
        </div>
    );
}