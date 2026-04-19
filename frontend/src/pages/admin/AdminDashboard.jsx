import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';

import StaffManagement from '../../components/common/StaffManagement';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/admin/overview'); 
        setStats(response.data);
      } catch (error) {
        // Backend එක හැදෙනකම් මේ Dummy Data පෙන්නනවා (404 Error ආවත් මේක වැඩ)
        setStats({
          grossRevenue: 1250000, pendingSync: 45, verifiedSales: 850, failed: 12,
          pieData: [{ name: 'Verified', value: 850 }, { name: 'Pending', value: 45 }, { name: 'Failed', value: 12 }], 
          barData: [
            { name: 'A/L Science', revenue: 450000 },
            { name: 'A/L Maths', revenue: 380000 },
            { name: 'O/L Fast', revenue: 220000 },
            { name: 'Media', revenue: 200000 }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const COLORS = ['#3B82F6', '#10B981', '#EF4444'];

  if (loading) return <div className="w-full h-full flex items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full text-white animate-in fade-in duration-500 pb-10">
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
        <h2 className="text-3xl font-black tracking-wide text-white drop-shadow-md">System Overview</h2>
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 md:flex-none">
            <Search size={16} className="absolute left-4 top-3 text-gray-400" />
            <input type="text" placeholder="Search..." className="w-full md:w-64 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 focus:border-blue-400 outline-none transition-all" />
          </div>
          <button className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-all backdrop-blur-md">
            <Filter size={16} /> All Batches
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="GROSS REVENUE" value={`Rs. ${stats?.grossRevenue?.toLocaleString()}`} color="text-white" />
        <StatCard title="PENDING AI SYNC" value={stats?.pendingSync} color="text-yellow-400" />
        <StatCard title="VERIFIED SALES" value={stats?.verifiedSales} color="text-emerald-400" />
        <StatCard title="FAILED / MISMATCH" value={stats?.failed} color="text-rose-400" />
      </div>

      <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md p-6 rounded-2xl mb-8 shadow-lg">
        <div className="flex justify-between text-xs font-bold text-gray-400 tracking-wider mb-3">
          <span>REVENUE TARGET (LKR 5M)</span>
          <span className="text-white text-lg">24.8%</span>
        </div>
        <div className="w-full bg-black/40 rounded-full h-2.5 border border-white/5">
          <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2.5 rounded-full" style={{ width: '24.8%' }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* PIE CHART */}
        <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-lg flex flex-col items-center">
          <h3 className="text-xs font-bold text-gray-400 tracking-wider mb-6 w-full">VERIFICATION STATUS</h3>
          <div className="w-full relative">
            {/* 🔥 මෙතන height එක කෙලින්ම දුන්නා Error එක නැති වෙන්න */}
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats?.pieData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                  {(stats?.pieData || []).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff1a', borderRadius: '10px' }} itemStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BAR CHART */}
        <div className="xl:col-span-2 bg-slate-800/40 border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-lg flex flex-col">
          <h3 className="text-xs font-bold text-gray-400 tracking-wider mb-6">REVENUE BY COURSE</h3>
          <div className="w-full relative">
            {/* 🔥 මෙතනත් height එක කෙලින්ම දුන්නා Error එක නැති වෙන්න */}
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats?.barData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff1a', borderRadius: '10px' }} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-lg hover:bg-slate-800/60 transition-colors">
      <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3">{title}</p>
      <h4 className={`text-3xl md:text-4xl font-black drop-shadow-md ${color} truncate`}>{value}</h4>
    </div>
  );
}