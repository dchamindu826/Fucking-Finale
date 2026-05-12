import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import { FaCommentDots, FaUserTie, FaPhoneVolume, FaCheckCircle, FaExclamationCircle, FaChartBar, FaCalendarAlt } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function NewInquiriesPerformance({ filters }) {
    const [loading, setLoading] = useState(true);
    
    // 🔥 NEW: Date Range States 🔥
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [stats, setStats] = useState({
        totalNewInq: 0,
        totalContacted: 0,
        totalPending: 0,
        totalEnrolled: 0,
        staffBreakdown: []
    });

    useEffect(() => {
        fetchNewInqStats();
    }, [filters?.selectedBusiness, filters?.selectedBatch, startDate, endDate]);

    const fetchNewInqStats = async () => {
        // 🔥 FIX: Business ekak nattan witharak return wenna. Batch eka 'ALL' wunata kamak na.
        if (!filters?.selectedBusiness) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/stats/new-inquiries', {
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
            console.error("Failed to fetch New Inq Stats", error);
            setStats({
                totalNewInq: 0, totalContacted: 0, totalPending: 0, totalEnrolled: 0,
                staffBreakdown: []
            });
        } finally {
            setLoading(false); 
        }
    };

    // 🔥 DATE FILTER HANDLERS (උදේ 8 ඉඳන් රෑ 8 වෙනකන්) 🔥
    const handleDailyClick = () => {
        const todayDate = new Date();
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

    if (loading) return <div className="flex justify-center items-center h-[400px] text-slate-500 animate-pulse font-sans tracking-wide">Loading Direct Inquiries Analytics...</div>;

    const conversionRate = stats.totalContacted > 0 ? Math.round((stats.totalEnrolled / stats.totalContacted) * 100) : 0;

    return (
        <div className="flex flex-col gap-6 font-sans text-slate-200">
            
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/[0.02] backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-lg flex items-center gap-4 hover:bg-white/[0.05] transition-all">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl"><FaCommentDots size={20}/></div>
                    <div><p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Total Inquiries</p><h2 className="text-2xl font-semibold text-white mt-1">{stats.totalNewInq}</h2></div>
                </div>
                <div className="bg-white/[0.02] backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-lg flex items-center gap-4 hover:bg-white/[0.05] transition-all">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl"><FaPhoneVolume size={20}/></div>
                    <div><p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Contacted</p><h2 className="text-2xl font-semibold text-amber-400 mt-1">{stats.totalContacted}</h2></div>
                </div>
                <div className="bg-white/[0.02] backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-lg flex items-center gap-4 hover:bg-white/[0.05] transition-all relative overflow-hidden">
                    {stats.totalPending > 0 && <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-500/10 rounded-full blur-xl animate-pulse"></div>}
                    <div className="p-3 bg-red-500/10 text-red-400 rounded-xl"><FaExclamationCircle size={20}/></div>
                    <div><p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Pending</p><h2 className="text-2xl font-semibold text-red-400 mt-1">{stats.totalPending}</h2></div>
                </div>
                <div className="bg-white/[0.02] backdrop-blur-md p-5 rounded-2xl border border-emerald-500/20 shadow-lg flex items-center gap-4 hover:bg-white/[0.05] transition-all relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl"><FaCheckCircle size={20}/></div>
                    <div>
                        <p className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-widest">Enrolled / Success</p>
                        <div className="flex items-end gap-2 mt-1">
                            <h2 className="text-2xl font-semibold text-emerald-400 leading-none">{stats.totalEnrolled}</h2>
                            <span className="text-[10px] text-emerald-500 font-bold mb-0.5">({conversionRate}%)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHARTS & DETAILS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* STAFF PERFORMANCE CHART (Vertical Layout) */}
                <div className="bg-white/[0.02] backdrop-blur-lg p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col">
                    <h3 className="text-xs font-semibold text-slate-300 mb-6 uppercase tracking-widest flex items-center gap-2"><FaChartBar className="text-pink-400"/> Staff Conversion Chart</h3>
                    
                    {/* 🔥 Vertical Chart Container 🔥 */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[350px] max-h-[500px]">
                        {stats.staffBreakdown.length === 0 ? <div className="flex h-full items-center justify-center text-slate-500 text-sm">No data available.</div> : (
                            <div style={{ height: `${Math.max(stats.staffBreakdown.length * 50, 300)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    {/* Layout changed to vertical */}
                                    <BarChart data={stats.staffBreakdown} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                                        <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={110} />
                                        <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize:'12px', color: '#fff'}} />
                                        <Legend verticalAlign="top" wrapperStyle={{fontSize: '11px', paddingBottom: '10px'}} />
                                        <Bar dataKey="contacted" name="Contacted" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                                        <Bar dataKey="enrolled" name="Enrolled" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* INDIVIDUAL STAFF BREAKDOWN TABLE */}
                <div className="bg-white/[0.02] backdrop-blur-lg p-5 rounded-2xl border border-white/5 shadow-xl lg:col-span-2 flex flex-col">
                    <h3 className="text-xs font-semibold text-slate-300 mb-4 uppercase tracking-widest flex items-center gap-2"><FaUserTie className="text-blue-400"/> Coordinator Performance (One-by-One)</h3>
                    
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        {stats.staffBreakdown.length === 0 ? <div className="text-center py-10 text-slate-500 text-sm">No coordinator data available.</div> : (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="text-slate-400 text-[10px] uppercase tracking-wider border-b border-white/10">
                                    <tr>
                                        <th className="py-3 font-semibold">Coordinator Name</th>
                                        <th className="py-3 text-center font-semibold">Assigned</th>
                                        <th className="py-3 text-center font-semibold text-amber-400">Contacted</th>
                                        <th className="py-3 text-center font-semibold text-red-400">Pending</th>
                                        <th className="py-3 text-center font-semibold text-emerald-400">Enrolled</th>
                                        <th className="py-3 text-right font-semibold">Conversion</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {stats.staffBreakdown.map((staff, idx) => {
                                        const rate = staff.contacted > 0 ? Math.round((staff.enrolled / staff.contacted) * 100) : 0;
                                        return (
                                            <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                                                <td className="py-3 font-medium text-slate-200">{staff.name}</td>
                                                <td className="py-3 text-center text-slate-300">{staff.assigned}</td>
                                                <td className="py-3 text-center font-semibold text-amber-400">{staff.contacted}</td>
                                                <td className="py-3 text-center font-semibold text-red-400">{staff.pending}</td>
                                                <td className="py-3 text-center font-semibold text-emerald-400 bg-emerald-500/5 rounded-lg">{staff.enrolled}</td>
                                                <td className="py-3 text-right font-bold text-slate-300">
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