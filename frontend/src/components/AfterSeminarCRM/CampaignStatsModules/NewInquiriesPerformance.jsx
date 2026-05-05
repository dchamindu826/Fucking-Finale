import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import { FaCommentDots, FaUserTie, FaPhoneVolume, FaCheckCircle, FaExclamationCircle, FaChartBar } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function NewInquiriesPerformance({ filters }) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalNewInq: 0,
        totalContacted: 0,
        totalPending: 0,
        totalEnrolled: 0,
        staffBreakdown: []
    });

    useEffect(() => {
        fetchNewInqStats();
    }, [filters?.selectedBusiness, filters?.selectedBatch]);

    const fetchNewInqStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/stats/new-inquiries', {
                headers: { Authorization: `Bearer ${token}` },
                params: { 
                    businessId: filters?.selectedBusiness || '', 
                    batchId: filters?.selectedBatch || '' 
                }
            });
            if (res.data) setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch New Inq Stats", error);
            // ⚠️ MOCK DATA FOR UI TESTING (Backend එක හදනකන් පේන්න)
            setStats({
                totalNewInq: 450, totalContacted: 320, totalPending: 130, totalEnrolled: 85,
                staffBreakdown: [
                    { name: 'Chamindu', assigned: 150, contacted: 120, pending: 30, enrolled: 45 },
                    { name: 'Kasun', assigned: 150, contacted: 100, pending: 50, enrolled: 20 },
                    { name: 'Nimal', assigned: 150, contacted: 100, pending: 50, enrolled: 20 }
                ]
            });
        }
        setLoading(false);
    };

    if (loading) return <div className="flex justify-center items-center h-[400px] text-slate-500 animate-pulse font-sans tracking-wide">Loading Direct Inquiries Analytics...</div>;

    const conversionRate = stats.totalContacted > 0 ? Math.round((stats.totalEnrolled / stats.totalContacted) * 100) : 0;

    return (
        <div className="flex flex-col gap-6 font-sans text-slate-200">
            
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
                
                {/* STAFF PERFORMANCE CHART */}
                <div className="bg-white/[0.02] backdrop-blur-lg p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col">
                    <h3 className="text-xs font-semibold text-slate-300 mb-6 uppercase tracking-widest flex items-center gap-2"><FaChartBar className="text-pink-400"/> Staff Conversion Chart</h3>
                    <div className="flex-1 min-h-[250px]">
                        {stats.staffBreakdown.length === 0 ? <div className="flex h-full items-center justify-center text-slate-500 text-sm">No data available.</div> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.staffBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize:'12px'}} />
                                    <Legend verticalAlign="bottom" wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
                                    <Bar dataKey="contacted" name="Handled Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="enrolled" name="Enrolled" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
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