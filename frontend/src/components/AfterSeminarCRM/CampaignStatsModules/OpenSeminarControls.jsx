import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import { FaUsers, FaUserTie, FaPhoneVolume, FaCheckCircle, FaExclamationCircle, FaChartBar, FaExclamationTriangle, FaCalendarAlt } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

export default function OpenSeminarControls({ filters }) {
    const [loading, setLoading] = useState(true);
    
    // 🔥 Date Range States 🔥
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [stats, setStats] = useState({
        totalOpenSem: 0,
        totalContacted: 0,
        totalPending: 0,
        totalDelayed: 0,
        totalEnrolled: 0,
        staffBreakdown: []
    });

    useEffect(() => {
        fetchOpenSemStats();
    }, [filters?.selectedBusiness, filters?.selectedBatch, startDate, endDate]);

    const fetchOpenSemStats = async () => {
        if (!filters?.selectedBusiness) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/stats/open-seminar', {
                headers: { Authorization: `Bearer ${token}` },
                params: { 
                    businessId: filters.selectedBusiness, 
                    batchId: filters.selectedBatch || 'ALL', 
                    startDate: startDate || undefined,
                    endDate: endDate || undefined
                }
            });
            if (res.data) setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch Open Sem Stats", error);
            setStats({
                totalOpenSem: 0, totalContacted: 0, totalPending: 0, totalDelayed: 0, totalEnrolled: 0,
                staffBreakdown: []
            });
        } finally {
            setLoading(false);
        }
    };

    // 🔥 DATE FILTER HANDLERS (උදේ 8 ඉඳන් රෑ 8 වෙනකන්) 🔥
    const handleDailyClick = () => {
        const todayDate = new Date();
        // Get local date string format YYYY-MM-DD
        const localDateStr = new Date(todayDate.getTime() - (todayDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        // හරියටම උදේ 8 සහ රෑ 8 (20:00) සෙට් කිරීම
        setStartDate(`${localDateStr}T08:00`);
        setEndDate(`${localDateStr}T20:00`);
    };

    const handleClearDates = () => {
        setStartDate('');
        setEndDate('');
    };

    if (!filters?.selectedBusiness) {
        return <div className="flex justify-center items-center h-[400px] text-slate-500 font-sans tracking-wide">Please select a Campaign/Business to view analytics.</div>;
    }

    if (loading && !stats.totalOpenSem) return <div className="flex justify-center items-center h-[400px] text-slate-500 animate-pulse font-sans tracking-wide">Loading Open Seminar Analytics...</div>;

    const conversionRate = stats.totalContacted > 0 ? Math.round((stats.totalEnrolled / stats.totalContacted) * 100) : 0;

    return (
        <div className="flex flex-col gap-6 font-sans text-slate-200 animate-fade-in p-2 rounded-lg" style={{ background: '#0f151c' }}>
            
            {/* 🔥 DATE FILTERS ROW 🔥 */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-[#141a23] p-4 rounded-2xl border border-slate-800 shadow-md gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
                        <FaCalendarAlt size={18}/>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Campaign Stats Filter</h3>
                        <p className="text-[10px] text-slate-400">Filter by specific dates or view today's performance</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* DAILY BUTTON */}
                    <button 
                        onClick={handleDailyClick}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all"
                    >
                        Today (Daily)
                    </button>

                    {/* DATE RANGE PICKER (Changed to datetime-local) */}
                    <div className="flex items-center gap-2 bg-[#0b0e14] border border-slate-700 p-1.5 rounded-lg">
                        <input 
                            type="datetime-local" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            className="bg-transparent text-slate-300 text-xs font-semibold outline-none px-2 cursor-pointer"
                            style={{colorScheme: 'dark'}}
                        />
                        <span className="text-slate-500 text-xs">to</span>
                        <input 
                            type="datetime-local" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            className="bg-transparent text-slate-300 text-xs font-semibold outline-none px-2 cursor-pointer"
                            style={{colorScheme: 'dark'}}
                        />
                    </div>

                    {/* CLEAR FILTER */}
                    {(startDate || endDate) && (
                        <button 
                            onClick={handleClearDates}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* TOP SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white/[0.02] backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-center hover:bg-white/[0.05] transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><FaUsers size={16}/></div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Total Leads</p>
                    </div>
                    <h2 className="text-2xl font-semibold text-white">{stats.totalOpenSem}</h2>
                </div>
                
                <div className="bg-white/[0.02] backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-center hover:bg-white/[0.05] transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><FaPhoneVolume size={16}/></div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Contacted</p>
                    </div>
                    <h2 className="text-2xl font-semibold text-amber-400">{stats.totalContacted}</h2>
                </div>

                <div className="bg-white/[0.02] backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col justify-center hover:bg-white/[0.05] transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-500/10 text-slate-400 rounded-lg"><FaExclamationCircle size={16}/></div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Pending</p>
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-300">{stats.totalPending}</h2>
                </div>

                <div className="bg-red-500/5 backdrop-blur-md p-5 rounded-2xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-500/10 rounded-full blur-xl animate-pulse"></div>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div className="p-2 bg-red-500/20 text-red-400 rounded-lg animate-pulse"><FaExclamationTriangle size={16}/></div>
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Delayed Calls</p>
                    </div>
                    <h2 className="text-2xl font-black text-red-500 relative z-10">{stats.totalDelayed}</h2>
                </div>

                <div className="bg-emerald-500/5 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/20 shadow-lg flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><FaCheckCircle size={16}/></div>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Enrolled</p>
                    </div>
                    <div className="flex items-end gap-2 relative z-10">
                        <h2 className="text-2xl font-semibold text-emerald-400 leading-none">{stats.totalEnrolled}</h2>
                        <span className="text-[10px] text-emerald-500 font-bold mb-0.5">({conversionRate}%)</span>
                    </div>
                </div>
            </div>

            {/* CHARTS & DETAILS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* STAFF PERFORMANCE CHART (Vertical Layout) */}
                <div className="bg-white/[0.02] backdrop-blur-lg p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col">
                    <h3 className="text-xs font-semibold text-slate-300 mb-6 uppercase tracking-widest flex items-center gap-2"><FaChartBar className="text-indigo-400"/> Staff Conversion Chart</h3>
                    
                    {/* 🔥 Vertical Chart Container 🔥 */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[350px] max-h-[500px]">
                        {stats.staffBreakdown.length === 0 ? <div className="flex h-full items-center justify-center text-slate-500 text-sm">No data available.</div> : (
                            <div style={{ height: `${Math.max(stats.staffBreakdown.length * 60, 300)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* Layout changed to vertical */}
                                    <BarChart data={stats.staffBreakdown} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                                        <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={110} />
                                        <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize:'12px', color: '#fff'}} />
                                        <Legend verticalAlign="top" wrapperStyle={{fontSize: '11px', paddingBottom: '10px'}} />
                                        <Bar dataKey="contacted" name="Contacted" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={10} />
                                        <Bar dataKey="delayed" name="Delayed (KPI)" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={10} />
                                        <Bar dataKey="enrolled" name="Enrolled" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* INDIVIDUAL STAFF BREAKDOWN TABLE */}
                <div className="bg-white/[0.02] backdrop-blur-lg p-5 rounded-2xl border border-white/5 shadow-xl lg:col-span-2 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <FaUserTie className="text-indigo-400"/> Coordinator Performance
                        </h3>
                        <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-1 rounded font-bold border border-red-500/20 flex items-center gap-1">
                            <FaExclamationTriangle/> KPI Alert active for Delays
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        {stats.staffBreakdown.length === 0 ? <div className="text-center py-10 text-slate-500 text-sm">No coordinator data available.</div> : (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="text-slate-400 text-[10px] uppercase tracking-wider border-b border-white/10 bg-[#0b0e14]/50">
                                    <tr>
                                        <th className="py-3 px-2 font-semibold rounded-tl-lg">Coordinator</th>
                                        <th className="py-3 text-center font-semibold">Assigned</th>
                                        <th className="py-3 text-center font-semibold text-amber-400">Contacted</th>
                                        <th className="py-3 text-center font-semibold text-slate-400">Pending</th>
                                        <th className="py-3 text-center font-bold text-red-500 bg-red-500/10">Delayed (KPI)</th>
                                        <th className="py-3 text-center font-semibold text-emerald-400">Enrolled</th>
                                        <th className="py-3 px-2 text-right font-semibold rounded-tr-lg">Conversion</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {stats.staffBreakdown.map((staff, idx) => {
                                        const rate = staff.contacted > 0 ? Math.round((staff.enrolled / staff.contacted) * 100) : 0;
                                        const isHighDelay = staff.delayed > 10;
                                        return (
                                            <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                                                <td className="py-3 px-2 font-medium text-slate-200">{staff.name}</td>
                                                <td className="py-3 text-center text-slate-300">{staff.assigned}</td>
                                                <td className="py-3 text-center font-semibold text-amber-400">{staff.contacted}</td>
                                                <td className="py-3 text-center font-semibold text-slate-400">{staff.pending}</td>
                                                
                                                <td className={`py-3 text-center font-bold ${isHighDelay ? 'text-white bg-red-600 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' : 'text-red-400 bg-red-500/5'} border-l border-r border-red-500/20`}>
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {isHighDelay && <FaExclamationTriangle className="animate-pulse"/>}
                                                        {staff.delayed}
                                                    </div>
                                                </td>

                                                <td className="py-3 text-center font-semibold text-emerald-400 bg-emerald-500/5">{staff.enrolled}</td>
                                                <td className="py-3 px-2 text-right font-bold text-slate-300">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] ${rate > 50 ? 'bg-emerald-500/20 text-emerald-400' : rate > 20 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {rate}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}