import React, { useState, useMemo } from 'react';
import { FaChartPie, FaUsers, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#ef4444'];

export default function AfterSeminarProgress({ leads, allBatches }) {
    const [progressBatchFilter, setProgressBatchFilter] = useState('ALL');

    const progressLeads = useMemo(() => {
        return leads.filter(l => progressBatchFilter === 'ALL' || String(l.batchId) === String(progressBatchFilter));
    }, [leads, progressBatchFilter]);

    const newInqProgress = progressLeads.filter(l => l.inquiryType === 'NEW_INQ');
    const openSemProgress = progressLeads.filter(l => l.inquiryType === 'OPEN_SEMINAR' || l.inquiryType === 'NORMAL');

    const progressEnrollmentData = [
        { name: 'New Inq Enrolled', value: newInqProgress.filter(l => l.enrollmentStatus === 'ENROLLED').length },
        { name: 'Open Sem Enrolled', value: openSemProgress.filter(l => l.enrollmentStatus === 'ENROLLED').length },
        { name: 'Pending / Dropped', value: progressLeads.filter(l => l.enrollmentStatus !== 'ENROLLED').length }
    ];

    const groupBarData = [
        { name: 'Full Pay', 
          'New Inq': newInqProgress.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'FULL').length, 
          'Open Sem': openSemProgress.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'FULL').length 
        },
        { name: 'Monthly', 
          'New Inq': newInqProgress.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'MONTHLY').length, 
          'Open Sem': openSemProgress.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'MONTHLY').length 
        },
        { name: 'Installment', 
          'New Inq': newInqProgress.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'INSTALLMENT').length, 
          'Open Sem': openSemProgress.filter(l => l.enrollmentStatus === 'ENROLLED' && l.paymentIntention === 'INSTALLMENT').length 
        },
    ];

    const currentMonth = new Date().getMonth();
    const momCompareData = [
        { 
            name: 'Last Month', 
            Enrolled: progressLeads.filter(l => new Date(l.updatedAt).getMonth() === currentMonth - 1 && l.enrollmentStatus === 'ENROLLED').length,
            Dropped: progressLeads.filter(l => new Date(l.updatedAt).getMonth() === currentMonth - 1 && l.enrollmentStatus === 'NON_ENROLLED').length
        },
        { 
            name: 'This Month', 
            Enrolled: progressLeads.filter(l => new Date(l.updatedAt).getMonth() === currentMonth && l.enrollmentStatus === 'ENROLLED').length,
            Dropped: progressLeads.filter(l => new Date(l.updatedAt).getMonth() === currentMonth && l.enrollmentStatus === 'NON_ENROLLED').length
        }
    ];

    const totalEnrolled = progressEnrollmentData[0].value + progressEnrollmentData[1].value;
    const successRate = progressLeads.length > 0 ? Math.round((totalEnrolled / progressLeads.length) * 100) : 0;

    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar space-y-5 animate-fade-in">
            {/* Header & Filter */}
            <div className="bg-[#141a23] p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3"><FaChartPie className="text-pink-500"/> Comprehensive Progress</h2>
                    <p className="text-xs text-slate-400 mt-1">Unified statistics for all your allocated leads</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Filter Stats:</span>
                    <select 
                        value={progressBatchFilter} 
                        onChange={(e) => setProgressBatchFilter(e.target.value)}
                        className="bg-[#0b0e14] border border-slate-800 text-slate-300 text-xs font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer"
                    >
                        <option value="ALL">All Associated Batches</option>
                        {allBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Unified Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#141a23] p-5 rounded-2xl border border-slate-800 text-center shadow-sm">
                    <FaUsers className="text-slate-600 text-xl mx-auto mb-2 opacity-50"/>
                    <p className="text-slate-400 font-semibold uppercase tracking-widest text-[10px] mb-1">Total workspace Leads</p>
                    <h1 className="text-3xl font-bold text-white">{progressLeads.length}</h1>
                </div>
                <div className="bg-[#141a23] p-5 rounded-2xl border border-emerald-900/30 text-center shadow-sm relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl"></div>
                    <FaCheckCircle className="text-emerald-500/50 text-xl mx-auto mb-2"/>
                    <p className="text-emerald-400 font-semibold uppercase tracking-widest text-[10px] mb-1">Total Enrolled</p>
                    <h1 className="text-3xl font-bold text-emerald-400">{totalEnrolled}</h1>
                </div>
                <div className="bg-[#141a23] p-5 rounded-2xl border border-red-900/30 text-center shadow-sm">
                    <FaExclamationCircle className="text-red-500/50 text-xl mx-auto mb-2"/>
                    <p className="text-red-400 font-semibold uppercase tracking-widest text-[10px] mb-1">Pending / Dropped</p>
                    <h1 className="text-3xl font-bold text-red-400">{progressEnrollmentData[2].value}</h1>
                </div>
                <div className="bg-gradient-to-br from-[#141a23] to-[#1c1423] p-5 rounded-2xl border border-pink-900/30 text-center shadow-sm">
                    <FaChartPie className="text-pink-500/50 text-xl mx-auto mb-2"/>
                    <p className="text-pink-400 font-semibold uppercase tracking-widest text-[10px] mb-1">Global Success Rate</p>
                    <h1 className="text-3xl font-bold text-white">{successRate}%</h1>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-[320px]">
                <div className="bg-[#141a23] p-5 rounded-2xl border border-slate-800 flex flex-col shadow-sm">
                    <h3 className="text-white text-sm font-semibold mb-2">Enrollment Source Conversion</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={progressEnrollmentData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                                {progressEnrollmentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{backgroundColor: '#0f151c', borderColor: '#1e293b', borderRadius: '10px'}} itemStyle={{fontSize: '12px'}} />
                            <Legend verticalAlign="bottom" height={20} wrapperStyle={{fontSize: '11px'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-[#141a23] p-5 rounded-2xl border border-slate-800 flex flex-col shadow-sm">
                    <h3 className="text-white text-sm font-semibold mb-2">Enrollment Types by Source</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={groupBarData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false}/>
                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false}/>
                            <RechartsTooltip contentStyle={{backgroundColor: '#0f151c', borderColor: '#1e293b', borderRadius: '10px'}} itemStyle={{fontSize: '12px'}} cursor={{fill: '#1e293b'}} />
                            <Legend wrapperStyle={{fontSize: '11px'}}/>
                            <Bar dataKey="New Inq" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="Open Sem" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="bg-[#141a23] p-5 rounded-2xl border border-slate-800 h-[300px] flex flex-col shadow-sm">
                <h3 className="text-white text-sm font-semibold mb-2">Month over Month Retention (All Leads)</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={momCompareData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false}/>
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false}/>
                        <RechartsTooltip contentStyle={{backgroundColor: '#0f151c', borderColor: '#1e293b', borderRadius: '10px'}} itemStyle={{fontSize: '12px'}} cursor={{fill: '#1e293b'}} />
                        <Legend wrapperStyle={{fontSize: '11px'}}/>
                        <Bar dataKey="Enrolled" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30}/>
                        <Bar dataKey="Dropped" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30}/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}