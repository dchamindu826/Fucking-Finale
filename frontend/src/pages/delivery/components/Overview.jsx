import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, Box, Loader2, Truck, RotateCcw, TrendingUp, Activity, BarChart3, Clock } from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Overview() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        summary: { pending: 0, onHold: 0, dispatched: 0, deliveredToday: 0, lowStock: 0, returned: 0 },
        weeklyTrend: [],
        statusDistribution: [],
        topBusinesses: [],
        recentActivity: []
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('/admin/delivery/stats');
                const data = res.data;
                
                // 🔥 සම්පූර්ණයෙන්ම Backend එකෙන් එන Data වලට විතරක් Set කළා
                setStats({
                    summary: {
                        pending: data.pending || 0,
                        onHold: data.onHold || 0,
                        dispatched: data.dispatched || 0,
                        deliveredToday: data.deliveredToday || 0,
                        lowStock: data.lowStock || 0,
                        returned: data.returned || 0,
                    },
                    weeklyTrend: data.weeklyTrend || [],
                    statusDistribution: data.statusDistribution || [],
                    topBusinesses: data.topBusinesses || [],
                    recentActivity: data.recentActivity || []
                });
            } catch (error) {
                toast.error("Failed to load delivery stats.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;

    const StatCard = ({ title, value, icon: Icon, colorClass, borderClass, bgClass }) => (
        <div className={`bg-[#1e2336]/80 p-6 rounded-3xl border ${borderClass} shadow-xl flex items-center justify-between group hover:scale-[1.02] transition-transform`}>
            <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">{title}</p>
                <p className={`text-4xl font-black ${colorClass}`}>{value}</p>
            </div>
            <div className={`w-14 h-14 ${bgClass} ${colorClass} rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform`}>
                <Icon size={28} strokeWidth={2}/>
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in font-sans space-y-6">
            
            {/* Top Row: Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard title="To Dispatch" value={stats.summary.pending} icon={Package} colorClass="text-blue-400" borderClass="border-blue-500/20" bgClass="bg-blue-500/10" />
                <StatCard title="Dispatched" value={stats.summary.dispatched} icon={Truck} colorClass="text-purple-400" borderClass="border-purple-500/20" bgClass="bg-purple-500/10" />
                <StatCard title="Delivered Today" value={stats.summary.deliveredToday} icon={CheckCircle} colorClass="text-emerald-400" borderClass="border-emerald-500/20" bgClass="bg-emerald-500/10" />
                <StatCard title="On Hold" value={stats.summary.onHold} icon={AlertTriangle} colorClass="text-orange-400" borderClass="border-orange-500/20" bgClass="bg-orange-500/10" />
                <StatCard title="Low Stock" value={stats.summary.lowStock} icon={Box} colorClass="text-red-400" borderClass="border-red-500/20" bgClass="bg-red-500/10" />
                <StatCard title="Returns" value={stats.summary.returned} icon={RotateCcw} colorClass="text-slate-300" borderClass="border-white/10" bgClass="bg-white/5" />
            </div>

            {/* Middle Row: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Trend Chart */}
                <div className="lg:col-span-2 bg-[#1e2336]/80 p-6 rounded-3xl border border-white/5 shadow-xl flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-white flex items-center gap-2"><TrendingUp className="text-blue-400" size={20}/> Last 7 Days Trend</h3>
                    </div>
                    <div className="h-[300px] w-full flex-1">
                        {stats.weeklyTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPacked" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }}/>
                                    <Area type="monotone" dataKey="Packed" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPacked)" />
                                    <Area type="monotone" dataKey="Delivered" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDelivered)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-slate-500 font-bold">No trend data available</div>
                        )}
                    </div>
                </div>

                {/* Status Distribution Doughnut Chart */}
                <div className="bg-[#1e2336]/80 p-6 rounded-3xl border border-white/5 shadow-xl flex flex-col">
                    <h3 className="text-lg font-black text-white flex items-center gap-2 mb-2"><BarChart3 className="text-emerald-400" size={20}/> Status Overview</h3>
                    <div className="flex-1 min-h-[200px]">
                        {stats.statusDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.statusDistribution} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                        {stats.statusDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} itemStyle={{ fontWeight: 'bold', color: '#fff' }}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-slate-500 font-bold">No status data</div>
                        )}
                    </div>
                    {/* Custom Legend */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        {stats.statusDistribution.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-xs font-bold text-slate-300">{item.name}</span>
                                </div>
                                <span className="text-sm font-black text-white">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Bottom Row: Top Businesses & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top Businesses List */}
                <div className="bg-[#1e2336]/80 p-6 rounded-3xl border border-white/5 shadow-xl">
                    <h3 className="text-lg font-black text-white flex items-center gap-2 mb-5"><Activity className="text-purple-400" size={20}/> Top Businesses by Volume</h3>
                    <div className="space-y-5">
                        {stats.topBusinesses.length > 0 ? stats.topBusinesses.map((biz, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-bold text-slate-200">{biz.name}</span>
                                    <span className="text-sm font-black text-blue-400">{biz.orders} Orders</span>
                                </div>
                                <div className="w-full bg-black/40 rounded-full h-3 border border-white/5 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-600 to-purple-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${biz.progress}%` }}></div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-slate-500 text-sm font-bold text-center py-4">No business data available</p>
                        )}
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="bg-[#1e2336]/80 p-6 rounded-3xl border border-white/5 shadow-xl">
                    <h3 className="text-lg font-black text-white flex items-center gap-2 mb-5"><Clock className="text-orange-400" size={20}/> Recent System Activity</h3>
                    <div className="space-y-4">
                        {stats.recentActivity.length > 0 ? stats.recentActivity.map((activity) => {
                            return (
                                <div key={activity.id} className="flex items-start gap-4 bg-black/20 p-3.5 rounded-2xl border border-white/5">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${activity.type === 'success' ? 'bg-emerald-500' : activity.type === 'warning' ? 'bg-orange-500' : activity.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-300">{activity.text}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">{activity.time}</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-slate-500 text-sm font-bold text-center py-4">No recent activity</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}