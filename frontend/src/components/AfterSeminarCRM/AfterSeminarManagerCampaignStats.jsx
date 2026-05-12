import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axios';
import { FaUsers, FaUserCheck, FaUserClock, FaBookOpen, FaChartBar, FaListAlt, FaSearch, FaTimes, FaFilter, FaMoneyBillWave, FaCheckCircle } from 'react-icons/fa';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

import OpenSeminarControls from "./CampaignStatsModules/OpenSeminarControls";
import NewInquiriesPerformance from "./CampaignStatsModules/NewInquiriesPerformance";
import PaidCampaignPerformance from "./CampaignStatsModules/PaidCampaignPerformance";
import BridgeTransfersTab from "./CampaignStatsModules/BridgeTransfersTab";
import SubjectEnrollmentStats from "./CampaignStatsModules/SubjectEnrollmentStats"; 

export default function AfterSeminarManagerCampaignStats({ filters, allBatches }) {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('OVERALL'); 
    
    const [stats, setStats] = useState({
        totalLeads: 0, assignedLeads: 0, unassignedLeads: 0,
        openSemLeads: 0, newInqLeads: 0, staffAllocation: [], 
        subjectEnrollments: [], mixerData: [] 
    });

    // 🔥 MASTER LEAD DIRECTORY MODAL STATES 🔥
    const [showMasterModal, setShowMasterModal] = useState(false);
    const [masterLoading, setMasterLoading] = useState(false);
    const [masterLeads, setMasterLeads] = useState([]);
    const [masterSearch, setMasterSearch] = useState('');
    const [masterBatchFilter, setMasterBatchFilter] = useState('ALL');

    useEffect(() => {
        if (filters.selectedBusiness || filters.selectedBatch) {
            fetchDashboardStats();
        } else {
            setLoading(false);
        }
    }, [filters.selectedBusiness, filters.selectedBatch]);

    const fetchDashboardStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/manager-dashboard-stats', {
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: filters.selectedBusiness, batchId: filters.selectedBatch || 'ALL' }
            });
            if (res.data) {
                setStats({
                    ...res.data,
                    staffAllocation: res.data.staffAllocation || [],
                    subjectEnrollments: res.data.subjectEnrollments || [],
                    mixerData: res.data.mixerData || [] 
                });
            }
        } catch (error) { 
            console.error("Failed to load manager stats", error); 
        } finally {
            setLoading(false);
        }
    };

    // 🔥 FETCH MASTER LEADS FOR MODAL 🔥
    const fetchMasterDirectory = async () => {
        setMasterLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/leads/master-directory', {
                headers: { Authorization: `Bearer ${token}` },
                params: { businessId: filters.selectedBusiness }
            });
            setMasterLeads(res.data.leads || []);
        } catch (err) {
            console.error("Master Directory Fetch Error:", err);
            toast.error("Failed to load Master Directory. Check Backend API.");
            setMasterLeads([]); 
        } finally {
            setMasterLoading(false);
        }
    };

    useEffect(() => {
        if (showMasterModal) {
            fetchMasterDirectory();
        }
    }, [showMasterModal]);

    // 🔥 FIX: Added (masterLeads || []) to prevent undefined .filter errors 🔥
    const filteredMaster = useMemo(() => {
        return (masterLeads || []).filter(l => {
            const matchSearch = l.phone.includes(masterSearch) || (l.name || '').toLowerCase().includes(masterSearch.toLowerCase());
            const matchBatch = masterBatchFilter === 'ALL' || String(l.batchId) === String(masterBatchFilter);
            return matchSearch && matchBatch;
        });
    }, [masterLeads, masterSearch, masterBatchFilter]);

    // 🔥 FIX: Added (filteredMaster || []) to prevent undefined .filter errors 🔥
    const mStats = useMemo(() => {
        const safeFiltered = filteredMaster || [];
        return {
            total: safeFiltered.length,
            enrolled: safeFiltered.filter(l => l.enrollmentStatus === 'ENROLLED').length,
            nonEnrolled: safeFiltered.filter(l => l.enrollmentStatus !== 'ENROLLED').length,
            full: safeFiltered.filter(l => l.paymentIntention === 'FULL').length,
            monthly: safeFiltered.filter(l => l.paymentIntention === 'MONTHLY').length,
            installment: safeFiltered.filter(l => l.paymentIntention === 'INSTALLMENT').length,
            notDecided: safeFiltered.filter(l => !l.paymentIntention || l.paymentIntention === 'NOT_DECIDED').length,
        };
    }, [filteredMaster]);

    if (loading) return <div className="flex justify-center items-center h-full text-slate-400 font-sans tracking-wide animate-pulse">Loading Workspace...</div>;

    if (!filters.selectedBusiness && !filters.selectedBatch) {
        return <div className="flex justify-center items-center h-full text-slate-400 font-sans bg-black/20 rounded-2xl m-4 border border-white/5 backdrop-blur-md">Please select a Business or Batch to view Analytics.</div>;
    }

    const LEAD_COLORS = ['#ec4899', '#3b82f6'];
    const leadTypeData = [ 
        { name: 'Open Seminar', value: stats.openSemLeads || 0 }, 
        { name: 'New Inquiries', value: stats.newInqLeads || 0 } 
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden font-sans antialiased text-slate-200 bg-[#0f151c] relative">
            
            {/* TOP NAVIGATION */}
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl shrink-0 flex items-center justify-between">
                <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5 shadow-inner flex-wrap">
                    {[
                        { id: 'OVERALL', label: 'Overall Progress' },
                        { id: 'OPEN_SEM', label: 'Open Seminar' },
                        { id: 'NEW_INQ', label: 'New Inquiries' },
                        { id: 'BRIDGE', label: 'Bridge Data' },
                        { id: 'PAID', label: 'Paid Campaign' }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-300 tracking-wide ${activeTab === tab.id ? 'bg-[#2563eb] text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                
                {/* 1. OVERALL TAB */}
                {activeTab === 'OVERALL' && (
                    <div className="space-y-6 animate-fade-in-up">
                        
                        {/* 🔥 MASTER DIRECTORY BUTTON 🔥 */}
                        <div className="flex justify-between items-center bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex-col sm:flex-row gap-4">
                            <div>
                                <h3 className="text-indigo-400 font-bold text-sm tracking-wide">Complete Lead Directory</h3>
                                <p className="text-slate-400 text-xs mt-1">View, search, and analyze all leads across Open Seminar, New Inquiries, etc.</p>
                            </div>
                            <button 
                                onClick={() => setShowMasterModal(true)} 
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
                            >
                                <FaListAlt size={14}/> View Full Directory
                            </button>
                        </div>

                        {/* STATS CARDS */}
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                            <div className="bg-white/[0.03] backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-lg flex items-center gap-4 hover:bg-white/[0.05] transition-all">
                                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl"><FaUsers size={20}/></div>
                                <div><p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Total Leads</p><h2 className="text-2xl font-semibold text-white mt-1">{stats.totalLeads || 0}</h2></div>
                            </div>
                            <div className="bg-white/[0.03] backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-lg flex items-center gap-4 hover:bg-white/[0.05] transition-all relative overflow-hidden">
                                <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
                                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl"><FaUserCheck size={20}/></div>
                                <div><p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Assigned</p><h2 className="text-2xl font-semibold text-emerald-400 mt-1">{stats.assignedLeads || 0}</h2></div>
                            </div>
                            <div className="bg-white/[0.03] backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-lg flex items-center gap-4 hover:bg-white/[0.05] transition-all">
                                <div className="p-3 bg-red-500/10 text-red-400 rounded-xl"><FaUserClock size={20}/></div>
                                <div><p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Unassigned</p><h2 className="text-2xl font-semibold text-red-400 mt-1">{stats.unassignedLeads || 0}</h2></div>
                            </div>
                            <div className="bg-white/[0.03] backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-center hover:bg-white/[0.05] transition-all">
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-3">Assigned Breakdown</p>
                                <div className="flex justify-between items-center text-xs font-semibold mb-2">
                                    <span className="text-blue-400">Open Sem: {stats.openSemLeads || 0}</span>
                                    <span className="text-pink-400">New Inq: {stats.newInqLeads || 0}</span>
                                </div>
                                <div className="w-full h-1.5 bg-black/40 rounded-full flex overflow-hidden shadow-inner border border-white/5">
                                    <div style={{width: `${((stats.openSemLeads || 0) / (stats.assignedLeads || 1)) * 100}%`}} className="bg-blue-500 h-full"></div>
                                    <div style={{width: `${((stats.newInqLeads || 0) / (stats.assignedLeads || 1)) * 100}%`}} className="bg-pink-500 h-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* CHARTS ROW */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white/[0.02] backdrop-blur-lg p-5 rounded-2xl border border-white/5 shadow-xl lg:col-span-2">
                                <h3 className="text-xs font-semibold text-slate-300 mb-6 uppercase tracking-widest flex items-center gap-2"><FaChartBar className="text-blue-400"/> Staff Workload</h3>
                                <div className="h-[250px]">
                                    {(!stats.staffAllocation || stats.staffAllocation.length === 0) ? <div className="flex h-full items-center justify-center text-slate-500 text-sm">No data available.</div> : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.staffAllocation} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                                <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize:'12px'}} />
                                                <Bar dataKey="assigned" name="Allocated Leads" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white/[0.02] backdrop-blur-lg p-5 rounded-2xl border border-white/5 shadow-xl">
                                <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-widest flex items-center gap-2"><FaBookOpen className="text-indigo-400"/> Lead Sources</h3>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={leadTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                                                {leadTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={LEAD_COLORS[index % LEAD_COLORS.length]} />)}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize:'12px'}} />
                                            <Legend verticalAlign="bottom" wrapperStyle={{fontSize: '11px', paddingTop: '20px', color: '#94a3b8'}} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <SubjectEnrollmentStats rawSubjects={stats.subjectEnrollments || []} mixerData={stats.mixerData || []} />
                    </div>
                )}

                {/* OTHER TABS */}
                {activeTab === 'OPEN_SEM' && <div className="animate-fade-in-up h-full"><OpenSeminarControls filters={filters} allBatches={allBatches} isManager={true} /></div>}
                {activeTab === 'NEW_INQ' && <div className="animate-fade-in-up h-full"><NewInquiriesPerformance filters={filters} allBatches={allBatches} isManager={true} /></div>}
                {activeTab === 'BRIDGE' && <div className="animate-fade-in-up h-full bg-white/[0.02] border border-white/5 rounded-2xl"><BridgeTransfersTab filters={filters} /></div>}
                {activeTab === 'PAID' && <div className="animate-fade-in-up h-full"><PaidCampaignPerformance filters={filters} /></div>}
            </div>

            {/* 🔥 FULL SCREEN MODAL: MASTER LEAD DIRECTORY 🔥 */}
            {showMasterModal && (
                <div className="fixed inset-0 z-[200] bg-[#020617]/95 backdrop-blur-md flex items-center justify-center p-4 pl-[260px] lg:pl-[280px] xl:pl-[300px] w-full h-full animate-fade-in">
                    
                    <div className="bg-[#1a2430] w-full h-full rounded-3xl flex flex-col overflow-hidden border border-slate-700 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
                        
                        {/* Modal Header */}
                        <div className="bg-[#0f172a] px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><FaListAlt size={20}/></div>
                                <div>
                                    <h3 className="text-white font-bold text-xl">Campaign Master Directory</h3>
                                    <p className="text-slate-400 text-xs mt-0.5">Comprehensive view of all inquiries and statuses</p>
                                </div>
                            </div>
                            <button onClick={() => setShowMasterModal(false)} className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white p-3 rounded-xl transition-all shadow-sm">
                                <FaTimes size={16} />
                            </button>
                        </div>

                        {masterLoading ? (
                            <div className="flex-1 flex justify-center items-center text-indigo-400 animate-pulse font-bold text-lg">Fetching Global Directory...</div>
                        ) : (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#0b141a]">
                                
                                {/* Top Stats & Charts inside Modal */}
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                                    <div className="grid grid-cols-2 gap-4 xl:col-span-1">
                                        <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 flex flex-col justify-center shadow-lg">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Filtered</p>
                                            <h2 className="text-3xl font-black text-white mt-1">{mStats.total || 0}</h2>
                                        </div>
                                        <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 flex flex-col justify-center shadow-lg">
                                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Enrolled</p>
                                            <h2 className="text-3xl font-black text-emerald-400 mt-1">{mStats.enrolled || 0}</h2>
                                        </div>
                                        <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20 flex flex-col justify-center shadow-lg">
                                            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Non-Enrolled</p>
                                            <h2 className="text-3xl font-black text-red-400 mt-1">{mStats.nonEnrolled || 0}</h2>
                                        </div>
                                        <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 flex flex-col justify-center shadow-lg">
                                            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Conversion</p>
                                            <h2 className="text-3xl font-black text-amber-400 mt-1">
                                                {mStats.total > 0 ? Math.round((mStats.enrolled / mStats.total) * 100) : 0}%
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-lg xl:col-span-2">
                                        <h3 className="text-xs font-semibold text-slate-300 mb-4 uppercase tracking-widest flex items-center gap-2"><FaMoneyBillWave className="text-emerald-400"/> Intention vs Enrollment</h3>
                                        
                                        <div className="w-full h-[150px] min-h-[150px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={[
                                                    { name: 'Full Pay', count: mStats.full || 0 },
                                                    { name: 'Monthly', count: mStats.monthly || 0 },
                                                    { name: 'Installment', count: mStats.installment || 0 },
                                                    { name: 'Not Decided', count: mStats.notDecided || 0 }
                                                ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                                    <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize:'12px'}} />
                                                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Filters for Modal */}
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1e293b] p-4 rounded-2xl border border-slate-700 mb-6">
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <FaFilter className="text-slate-500" />
                                        <select 
                                            value={masterBatchFilter} 
                                            onChange={(e) => setMasterBatchFilter(e.target.value)} 
                                            className="bg-[#0f172a] border border-slate-600 text-slate-200 text-xs font-bold rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500"
                                        >
                                            <option value="ALL">All Batches</option>
                                            {(allBatches || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="relative w-full md:w-96">
                                        <FaSearch className="absolute left-4 top-3 text-slate-500 text-sm" />
                                        <input 
                                            type="text" 
                                            placeholder="Search by Name or Phone..." 
                                            value={masterSearch} 
                                            onChange={(e) => setMasterSearch(e.target.value)} 
                                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg py-2.5 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all" 
                                        />
                                    </div>
                                </div>

                                {/* Data Table */}
                                <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                                    <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-[#0f172a] text-slate-400 text-[10px] uppercase tracking-wider sticky top-0 z-10 shadow-md">
                                                <tr>
                                                    <th className="py-4 px-5 font-bold">Student Details</th>
                                                    <th className="py-4 px-5 font-bold text-center">Inquiry Source</th>
                                                    <th className="py-4 px-5 font-bold text-center text-blue-400">Marked Intention</th>
                                                    <th className="py-4 px-5 font-bold text-center text-emerald-400">Actual Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/50">
                                                {(!filteredMaster || filteredMaster.length === 0) ? (
                                                    <tr><td colSpan="4" className="text-center py-10 text-slate-500 font-medium">No leads match your search criteria.</td></tr>
                                                ) : (
                                                    filteredMaster.map((l, i) => (
                                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                                            <td className="py-3 px-5">
                                                                <h4 className="text-slate-200 font-bold">{l.phone}</h4>
                                                                <p className="text-[11px] text-slate-500 mt-0.5">{l.name || 'Unknown'}</p>
                                                            </td>
                                                            <td className="py-3 px-5 text-center">
                                                                <span className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider">
                                                                    {l.inquiryType?.replace('_', ' ') || 'UNKNOWN'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-5 text-center">
                                                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${l.paymentIntention === 'FULL' ? 'bg-indigo-500/20 text-indigo-400' : l.paymentIntention === 'MONTHLY' ? 'bg-blue-500/20 text-blue-400' : l.paymentIntention === 'INSTALLMENT' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                                                                    {l.paymentIntention || 'NOT DECIDED'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-5 text-center">
                                                                {l.enrollmentStatus === 'ENROLLED' ? (
                                                                    <span className="text-emerald-400 font-black text-xs flex items-center justify-center gap-1.5"><FaCheckCircle/> ENROLLED</span>
                                                                ) : (
                                                                    <span className="text-red-400 font-bold text-[11px] uppercase tracking-widest">Non-Enrolled</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}