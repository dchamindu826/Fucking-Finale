import React, { useState, useEffect, useMemo } from 'react';
import axios from "../../../api/axios";
import { FaUserTie, FaPhoneVolume, FaChartBar, FaMoneyCheckAlt, FaExclamationCircle, FaSearch, FaCalendarAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

export default function PaidCampaignPerformance({ filters }) {
    const [loading, setLoading] = useState(true);
    const [rawLeads, setRawLeads] = useState([]);
    const [monthStats, setMonthStats] = useState({ prevMonthEnrolled: 0, thisMonthRenewed: 0, thisMonthDropped: 0 });
    
    // UI Filters
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [searchQuery, setSearchQuery] = useState('');

    // 🔥 NEW: Date Range States 🔥
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchRetentionData();
    }, [filters?.selectedBusiness, filters?.selectedBatch, selectedMonth, startDate, endDate]);

    const fetchRetentionData = async () => {
        // 🔥 FIX: Prevent blank loading screen if no business is selected
        if (!filters?.selectedBusiness) {
            setLoading(false);
            setRawLeads([]);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/after-seminar-crm/retention/campaign-data', {
                headers: { Authorization: `Bearer ${token}` },
                params: { 
                    businessId: filters.selectedBusiness, 
                    batchId: filters.selectedBatch || 'ALL',
                    month: selectedMonth,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined
                }
            });
            if (res.data) {
                setRawLeads(res.data.leads || []);
                setMonthStats({
                    prevMonthEnrolled: res.data.stats?.prevMonthEnrolled || 0,
                    thisMonthRenewed: res.data.stats?.thisMonthRenewed || 0,
                    thisMonthDropped: res.data.stats?.thisMonthDropped || 0
                });
            }
        } catch (error) {
            console.error("Failed to fetch Retention Campaign Stats");
        }
        setLoading(false);
    };

    // 🔥 DATE FILTER HANDLERS 🔥
    const handleDailyClick = () => {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
    };

    const handleClearDates = () => {
        setStartDate('');
        setEndDate('');
    };

    // 🔥 CALCULATE ALL AGGREGATES BASED ON FILTERS 🔥
    const metrics = useMemo(() => {
        const filtered = rawLeads.filter(l => 
            l.phone.includes(searchQuery) || 
            (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        let enrolledFull = 0, enrolledMonthly = 0, enrolledInstall = 0;
        let nonEnrolledMonthly = 0, nonEnrolledInstall = 0;
        let totalContacted = 0, totalPending = 0;
        
        let staffMap = {};

        filtered.forEach(l => {
            const isEnrolled = l.enrollmentStatus === 'ENROLLED';
            const intention = l.paymentIntention || 'NOT_DECIDED';
            const isPending = l.callStatus === 'pending' || !l.callStatus;

            // Enrollment Breakdowns
            if (isEnrolled) {
                if (intention === 'FULL') enrolledFull++;
                else if (intention === 'MONTHLY') enrolledMonthly++;
                else if (intention === 'INSTALLMENT') enrolledInstall++;
            } else {
                if (intention === 'MONTHLY') nonEnrolledMonthly++;
                else if (intention === 'INSTALLMENT') nonEnrolledInstall++;
            }

            // Call Stats
            if (isPending) totalPending++; else totalContacted++;

            // Staff Stats
            if (l.assignedTo) {
                const sName = l.assignedUser ? `${l.assignedUser.firstName}` : 'Unknown';
                if (!staffMap[sName]) staffMap[sName] = { name: sName, assigned: 0, contacted: 0, pending: 0, enrolled: 0 };
                
                staffMap[sName].assigned++;
                if (isPending) staffMap[sName].pending++; else staffMap[sName].contacted++;
                if (isEnrolled) staffMap[sName].enrolled++;
            }
        });

        const totalEnrolled = enrolledFull + enrolledMonthly + enrolledInstall;
        const totalNonEnrolled = nonEnrolledMonthly + nonEnrolledInstall;

        return {
            totalEnrolled, enrolledFull, enrolledMonthly, enrolledInstall,
            totalNonEnrolled, nonEnrolledMonthly, nonEnrolledInstall,
            totalContacted, totalPending, totalAssigned: filtered.length,
            staffBreakdown: Object.values(staffMap)
        };
    }, [rawLeads, searchQuery]);

    if (!filters?.selectedBusiness) {
        return <div className="flex justify-center items-center h-[200px] text-slate-500 font-medium">Please select a Campaign/Business to view Paid Campaign metrics.</div>;
    }

    if (loading && rawLeads.length === 0) return <div className="flex justify-center items-center h-[400px] text-indigo-400 animate-pulse font-sans font-bold tracking-wide">Calculating Retention Analytics...</div>;

    const PIE_COLORS = ['#10b981', '#ef4444'];
    const pieData = [
        { name: 'Enrolled', value: metrics.totalEnrolled },
        { name: 'Dropped (Non-Enrolled)', value: metrics.totalNonEnrolled }
    ];

    return (
        <div className="flex flex-col gap-6 font-sans text-slate-200 animate-fade-in-up pb-6">
            
            {/* 🔥 TOP FILTERS & SEARCH 🔥 */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-md gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-lg"><FaCalendarAlt size={18}/></div>
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

                    {/* DATE RANGE PICKER */}
                    <div className="flex items-center gap-2 bg-[#0f172a] border border-slate-600 p-1.5 rounded-lg">
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            className="bg-transparent text-slate-300 text-xs font-semibold outline-none px-2 cursor-pointer"
                            style={{colorScheme: 'dark'}}
                        />
                        <span className="text-slate-500 text-xs">to</span>
                        <input 
                            type="date" 
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
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* 🔥 MONTH SELECTION & SEARCH 🔥 */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-[#1e293b] p-4 rounded-2xl border border-slate-700 shadow-md gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-lg"><FaCalendarAlt size={18}/></div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Target Month Filter</h3>
                        <div className="mt-1">
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-[#0f172a] text-indigo-400 font-bold text-xs px-3 py-1.5 rounded-lg border border-indigo-500/30 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                {[...Array(12)].map((_, i) => (
                                    <option key={i+1} value={i+1}>Billing Month {i+1}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div className="relative w-full md:w-80">
                    <FaSearch className="absolute left-4 top-3.5 text-slate-500 text-sm" />
                    <input 
                        type="text" 
                        placeholder="Search student number or name..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="w-full bg-[#0f172a] border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-white outline-none focus:border-indigo-500 transition-all shadow-inner" 
                    />
                </div>
            </div>

            {/* 🔥 MONTH COMPARISON CARDS (M-1 vs M) 🔥 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Previous Month (M-{selectedMonth - 1})</p>
                    <h2 className="text-3xl font-black text-white">{monthStats.prevMonthEnrolled} <span className="text-sm font-semibold text-slate-500">Students</span></h2>
                </div>
                <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl"></div>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1 relative z-10">Target Month (M-{selectedMonth}) Renewed</p>
                    <h2 className="text-3xl font-black text-emerald-400 relative z-10">{monthStats.thisMonthRenewed} <span className="text-sm font-semibold text-emerald-500/70">Students</span></h2>
                </div>
                <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1 relative z-10">Target Month (M-{selectedMonth}) Dropped</p>
                    <h2 className="text-3xl font-black text-red-500 relative z-10">{monthStats.thisMonthDropped} <span className="text-sm font-semibold text-red-500/70">Students</span></h2>
                </div>
            </div>

            {/* 🔥 DEEP BREAKDOWN CARDS (ENROLLED VS NON-ENROLLED) 🔥 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* ENROLLED BREAKDOWN */}
                <div className="bg-[#1e293b] p-5 rounded-2xl border border-emerald-500/30 shadow-lg">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
                        <div className="flex items-center gap-2">
                            <FaCheckCircle className="text-emerald-500 text-xl"/>
                            <h3 className="text-emerald-400 font-black text-lg uppercase tracking-wider">Enrolled</h3>
                        </div>
                        <h2 className="text-3xl font-black text-emerald-400">{metrics.totalEnrolled}</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700 text-center">
                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">Full Pay</p>
                            <h4 className="text-xl font-bold text-white">{metrics.enrolledFull}</h4>
                        </div>
                        <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700 text-center">
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Monthly</p>
                            <h4 className="text-xl font-bold text-white">{metrics.enrolledMonthly}</h4>
                        </div>
                        <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700 text-center">
                            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-1">Installment</p>
                            <h4 className="text-xl font-bold text-white">{metrics.enrolledInstall}</h4>
                        </div>
                    </div>
                </div>

                {/* NON-ENROLLED BREAKDOWN */}
                <div className="bg-[#1e293b] p-5 rounded-2xl border border-red-500/30 shadow-lg">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
                        <div className="flex items-center gap-2">
                            <FaTimesCircle className="text-red-500 text-xl"/>
                            <h3 className="text-red-400 font-black text-lg uppercase tracking-wider">Non-Enrolled</h3>
                        </div>
                        <h2 className="text-3xl font-black text-red-500">{metrics.totalNonEnrolled}</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700 text-center">
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Dropped Monthly</p>
                            <h4 className="text-xl font-bold text-white">{metrics.nonEnrolledMonthly}</h4>
                        </div>
                        <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-700 text-center">
                            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-1">Dropped Installment</p>
                            <h4 className="text-xl font-bold text-white">{metrics.nonEnrolledInstall}</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔥 CHARTS ROW 🔥 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-xl">
                    <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-widest flex items-center gap-2"><FaChartBar className="text-indigo-400"/> Conversion Ratio</h3>
                    <div className="w-full h-[250px] min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize:'12px'}} />
                                <Legend verticalAlign="bottom" wrapperStyle={{fontSize: '11px', paddingTop: '20px', color: '#94a3b8'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-xl lg:col-span-2">
                    <h3 className="text-xs font-semibold text-slate-300 mb-6 uppercase tracking-widest flex items-center gap-2"><FaUserTie className="text-emerald-400"/> Staff Follow-up Progress</h3>
                    <div className="w-full h-[250px] min-h-[250px]">
                        {metrics.staffBreakdown.length === 0 ? <div className="flex h-full items-center justify-center text-slate-500 text-sm">No data available.</div> : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.staffBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize:'12px'}} />
                                    <Legend verticalAlign="bottom" wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
                                    <Bar dataKey="contacted" name="Contacted" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="pending" name="Pending Calls" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="enrolled" name="Enrolled (Won)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* 🔥 INDIVIDUAL STAFF BREAKDOWN TABLE 🔥 */}
            <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-xl flex flex-col">
                <h3 className="text-xs font-semibold text-slate-300 mb-4 uppercase tracking-widest flex items-center gap-2"><FaMoneyCheckAlt className="text-blue-400"/> Coordinator Conversion (Month {selectedMonth})</h3>
                
                <div className="flex-1 overflow-x-auto custom-scrollbar">
                    {metrics.staffBreakdown.length === 0 ? <div className="text-center py-10 text-slate-500 text-sm">No coordinator data available for this month.</div> : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#0f172a] text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-600">
                                <tr>
                                    <th className="py-4 px-4 font-semibold rounded-tl-lg">Coordinator Name</th>
                                    <th className="py-4 px-4 text-center font-semibold">Total Assigned</th>
                                    <th className="py-4 px-4 text-center font-semibold text-blue-400">Contacted</th>
                                    <th className="py-4 px-4 text-center font-semibold text-red-400">Pending</th>
                                    <th className="py-4 px-4 text-center font-bold text-emerald-400 bg-emerald-500/10">Enrolled (Won)</th>
                                    <th className="py-4 px-4 text-right font-semibold rounded-tr-lg">Conversion %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {metrics.staffBreakdown.map((staff, idx) => {
                                    const contactRate = staff.assigned > 0 ? Math.round((staff.contacted / staff.assigned) * 100) : 0;
                                    const wonRate = staff.contacted > 0 ? Math.round((staff.enrolled / staff.contacted) * 100) : 0;
                                    return (
                                        <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                                            <td className="py-4 px-4 font-bold text-slate-200">{staff.name}</td>
                                            <td className="py-4 px-4 text-center text-slate-300 font-medium">{staff.assigned}</td>
                                            <td className="py-4 px-4 text-center font-semibold text-blue-400">{staff.contacted}</td>
                                            <td className="py-4 px-4 text-center font-semibold text-red-400">{staff.pending}</td>
                                            <td className="py-4 px-4 text-center font-black text-emerald-400 bg-emerald-500/5 border-l border-r border-emerald-500/20">{staff.enrolled}</td>
                                            <td className="py-4 px-4 text-right font-bold text-slate-300">
                                                <span className={`px-2.5 py-1.5 rounded-lg text-[10px] ${wonRate > 75 ? 'bg-emerald-500/20 text-emerald-400' : wonRate > 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {wonRate}%
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
    );
}