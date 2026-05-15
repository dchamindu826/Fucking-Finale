import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import { FaUsers, FaUserTie, FaPhoneVolume, FaCheckCircle, FaExclamationCircle, FaChartBar, FaExclamationTriangle, FaCalendarAlt, FaChevronDown, FaChevronUp, FaFileExport, FaTimes, FaCheckSquare, FaRegSquare } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

export default function NewInquiriesPerformance({ filters }) {
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expandedRows, setExpandedRows] = useState({});

    // 🔥 Advanced Export Modal States 🔥
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportMode, setExportMode] = useState('ALL'); // ALL, SINGLE, MULTIPLE
    const [selectedSingleStaff, setSelectedSingleStaff] = useState('');
    const [selectedMultipleStaff, setSelectedMultipleStaff] = useState([]);

    const [stats, setStats] = useState({
        totalAssigned: 0, totalContacted: 0, totalPending: 0, totalDelayed: 0, totalEnrolled: 0,
        staffBreakdown: [],
        rawLeads: [] 
    });

    useEffect(() => {
        fetchNewInqStats();
    }, [filters?.selectedBusiness, filters?.selectedBatch, startDate, endDate]);

    const fetchNewInqStats = async () => {
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
            toast.error("Failed to fetch Direct Inquiries Stats");
            setStats({ totalAssigned: 0, totalContacted: 0, totalPending: 0, totalDelayed: 0, totalEnrolled: 0, staffBreakdown: [], rawLeads: [] });
        } finally {
            setLoading(false); 
        }
    };

    const handleDailyClick = () => {
        const todayDate = new Date();
        const localDateStr = new Date(todayDate.getTime() - (todayDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        setStartDate(`${localDateStr}T08:00`);
        setEndDate(`${localDateStr}T20:00`);
    };

    const handleClearDates = () => {
        setStartDate('');
        setEndDate('');
    };

    const toggleRow = (staffName) => {
        setExpandedRows(prev => ({ ...prev, [staffName]: !prev[staffName] }));
    };

    const handleMultiSelectToggle = (staffName) => {
        if (selectedMultipleStaff.includes(staffName)) {
            setSelectedMultipleStaff(selectedMultipleStaff.filter(name => name !== staffName));
        } else {
            setSelectedMultipleStaff([...selectedMultipleStaff, staffName]);
        }
    };

    // 🔥 MAIN EXCEL EXPORT FUNCTION 🔥
    const generateExcel = (dataToExport, filename) => {
        if (!dataToExport || dataToExport.length === 0) {
            return toast.error("No leads found to export!");
        }

        const headers = ['Phone', 'Name', 'Assigned Coordinator', 'Round', 'Phase', 'Call Status', 'Enrollment Status', 'Payment Plan', 'Remark'];
        const rows = dataToExport.map(l => [
            l.phone,
            (l.name || 'Unknown').replace(/,/g, ' '),
            l.assignedToName || 'Unassigned',
            l.round,
            l.phase,
            (l.callStatus || 'PENDING').replace('_', ' ').toUpperCase(),
            l.enrollmentStatus,
            l.paymentPlan || 'NOT_DECIDED',
            (l.remark || 'No Remark').replace(/,/g, ' ').replace(/\n/g, ' ')
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${dataToExport.length} leads successfully!`);
        setShowExportModal(false);
    };

    const handleExecuteExport = () => {
        if (!stats.rawLeads || stats.rawLeads.length === 0) {
            return toast.error("No data available to export.");
        }

        let dataToExport = [];
        let filename = "Direct_Inquiries_Export";

        if (exportMode === 'ALL') {
            dataToExport = stats.rawLeads;
            filename = "All_Direct_Inquiries_Leads";
        } 
        else if (exportMode === 'SINGLE') {
            if (!selectedSingleStaff) return toast.error("Please select a Coordinator!");
            dataToExport = stats.rawLeads.filter(l => l.assignedToName === selectedSingleStaff);
            filename = `${selectedSingleStaff.replace(/ /g, '_')}_Leads`;
        } 
        else if (exportMode === 'MULTIPLE') {
            if (selectedMultipleStaff.length === 0) return toast.error("Please select at least one Coordinator!");
            dataToExport = stats.rawLeads.filter(l => selectedMultipleStaff.includes(l.assignedToName));
            filename = `Multiple_Staff_Leads`;
        }

        generateExcel(dataToExport, filename);
    };

    const exportStaffRoundData = (staffName, roundName, leadsArray) => {
        generateExcel(leadsArray.map(l => ({
            ...l, assignedToName: staffName, round: roundName, callStatus: l.status || 'PENDING', paymentPlan: 'N/A', enrollmentStatus: l.enrolled || 'NON_ENROLLED'
        })), `${staffName}_${roundName}_Leads`);
    };

    if (!filters?.selectedBusiness) {
        return <div className="flex justify-center items-center h-[400px] text-slate-500 font-sans tracking-wide">Please select a Campaign/Business to view analytics.</div>;
    }

    if (loading && !stats.totalAssigned && !stats.totalNewInq) return <div className="flex justify-center items-center h-[400px] text-slate-500 animate-pulse font-sans tracking-wide">Loading Direct Inquiries Analytics...</div>;

    const totalTarget = stats.totalAssigned || stats.totalNewInq || 0;
    const conversionRate = totalTarget > 0 ? Math.round((stats.totalEnrolled / totalTarget) * 100) : 0;
    
    // Safety check for chart data in case backend structure is still old
    const chartData = stats.staffBreakdown.map(staff => ({ 
        name: staff.name, 
        contacted: staff.overall?.contacted || staff.contacted || 0, 
        delayed: staff.overall?.delayed || 0, 
        enrolled: staff.overall?.enrolled || staff.enrolled || 0 
    }));
    const allStaffNames = stats.staffBreakdown.map(s => s.name);

    return (
        <div className="flex flex-col gap-6 font-sans text-slate-200 animate-fade-in p-2 rounded-lg bg-transparent relative">
            
            {/* 🔥 DATE FILTERS ROW & MAIN EXPORT BUTTON 🔥 */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg"><FaCalendarAlt size={18}/></div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Campaign Stats</h3>
                        <p className="text-[10px] text-slate-400">Filter by specific dates or view today's performance</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={handleDailyClick} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all">Today (Daily)</button>
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 p-1.5 rounded-lg">
                        <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-slate-300 text-xs font-semibold outline-none px-2 cursor-pointer" style={{colorScheme: 'dark'}}/>
                        <span className="text-slate-500 text-xs">to</span>
                        <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-slate-300 text-xs font-semibold outline-none px-2 cursor-pointer" style={{colorScheme: 'dark'}}/>
                    </div>
                    {(startDate || endDate) && <button onClick={handleClearDates} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-all">Clear</button>}
                    
                    <div className="w-px h-6 bg-white/10 mx-2 hidden md:block"></div>
                    
                    {/* MASTER EXPORT BUTTON */}
                    <button onClick={() => setShowExportModal(true)} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-2">
                        <FaFileExport size={12}/> Advanced Export
                    </button>
                </div>
            </div>

            {/* TOP SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-center transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><FaUsers size={16}/></div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Total Assigned</p>
                    </div>
                    <h2 className="text-2xl font-semibold text-white">{totalTarget}</h2>
                </div>
                
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-center transition-all">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><FaPhoneVolume size={16}/></div>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Covered</p>
                    </div>
                    <h2 className="text-2xl font-semibold text-amber-400">{stats.totalContacted}</h2>
                </div>

                <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col justify-center transition-all">
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

            {/* DETAILS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CHART */}
                <div className="bg-white/5 backdrop-blur-lg p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col">
                    <h3 className="text-xs font-semibold text-slate-300 mb-6 uppercase tracking-widest flex items-center gap-2"><FaChartBar className="text-indigo-400"/> Staff Conversion Chart</h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-[350px] max-h-[500px]">
                        {chartData.length === 0 ? <div className="flex h-full items-center justify-center text-slate-500 text-sm">No data available.</div> : (
                            <div style={{ height: `${Math.max(chartData.length * 60, 300)}px` }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={true} vertical={false} />
                                        <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={110} />
                                        <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize:'12px', color: '#fff'}} />
                                        <Legend verticalAlign="top" wrapperStyle={{fontSize: '11px', paddingBottom: '10px'}} />
                                        <Bar dataKey="contacted" name="Covered" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={10} />
                                        <Bar dataKey="delayed" name="Delayed (KPI)" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={10} />
                                        <Bar dataKey="enrolled" name="Enrolled" fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* ADVANCED STAFF BREAKDOWN TABLE */}
                <div className="bg-white/5 backdrop-blur-lg p-5 rounded-2xl border border-white/10 shadow-xl lg:col-span-2 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <FaUserTie className="text-indigo-400"/> Coordinator Advanced Performance
                        </h3>
                    </div>
                    
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                        {stats.staffBreakdown.length === 0 ? <div className="text-center py-10 text-slate-500 text-sm">No coordinator data available.</div> : (
                            <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                                <thead className="text-slate-400 text-[10px] uppercase tracking-wider bg-black/40">
                                    <tr>
                                        <th className="py-4 px-3 font-semibold rounded-tl-lg">Coordinator</th>
                                        <th className="py-4 px-2 text-center font-semibold">Assigned</th>
                                        <th className="py-4 px-2 text-center font-semibold text-amber-400">Covered</th>
                                        <th className="py-4 px-2 text-center font-semibold text-slate-400">Pending</th>
                                        <th className="py-4 px-2 text-center font-bold text-red-500">Delayed (KPI)</th>
                                        <th className="py-4 px-2 text-center font-semibold text-emerald-400">Enrolled</th>
                                        <th className="py-4 px-3 text-right font-semibold rounded-tr-lg">Conversion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.staffBreakdown.map((staff, idx) => {
                                        const isExpanded = expandedRows[staff.name];
                                        // Handle backward compatibility gracefully
                                        const overallAssigned = staff.overall?.assigned || staff.assigned || 0;
                                        const overallContacted = staff.overall?.contacted || staff.contacted || 0;
                                        const overallPending = staff.overall?.pending || staff.pending || 0;
                                        const overallDelayed = staff.overall?.delayed || 0;
                                        const overallEnrolled = staff.overall?.enrolled || staff.enrolled || 0;
                                        
                                        const rate = overallAssigned > 0 ? Math.round((overallEnrolled / overallAssigned) * 100) : 0;
                                        const isHighDelay = overallDelayed > 10;

                                        return (
                                            <React.Fragment key={idx}>
                                                <tr onClick={() => toggleRow(staff.name)} className={`cursor-pointer transition-colors border-b border-white/5 ${isExpanded ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                                    <td className="py-3 px-3 font-medium text-slate-200 flex items-center gap-2">
                                                        {isExpanded ? <FaChevronUp size={10} className="text-indigo-400"/> : <FaChevronDown size={10} className="text-slate-500"/>}
                                                        {staff.name}
                                                    </td>
                                                    <td className="py-3 px-2 text-center text-slate-300">{overallAssigned}</td>
                                                    <td className="py-3 px-2 text-center font-semibold text-amber-400">{overallContacted}</td>
                                                    <td className="py-3 px-2 text-center font-semibold text-slate-400">{overallPending}</td>
                                                    <td className={`py-3 px-2 text-center font-bold ${isHighDelay ? 'text-red-400 bg-red-500/10' : 'text-red-400'}`}>
                                                        {isHighDelay && <FaExclamationTriangle className="inline mr-1 animate-pulse" size={10}/>}
                                                        {overallDelayed}
                                                    </td>
                                                    <td className="py-3 px-2 text-center font-semibold text-emerald-400">{overallEnrolled}</td>
                                                    <td className="py-3 px-3 text-right font-bold text-slate-300">
                                                        <span className={`px-2 py-1 rounded-md text-[10px] ${rate > 50 ? 'bg-emerald-500/20 text-emerald-400' : rate > 20 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{rate}%</span>
                                                    </td>
                                                </tr>

                                                {isExpanded && staff.rounds && (
                                                    <tr className="bg-black/20 border-b border-white/10">
                                                        <td colSpan="7" className="p-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                                {['1', '2', '3', 'PAID'].map(round => {
                                                                    const roundData = staff.rounds[round];
                                                                    if (!roundData || roundData.assigned === 0) return null;

                                                                    return (
                                                                        <div key={round} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                                                                            <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-1">
                                                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{round === 'PAID' ? 'Paid Section' : `Round ${round}`}</span>
                                                                                <button onClick={(e) => { e.stopPropagation(); exportStaffRoundData(staff.name, round, roundData.leads); }} className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-md transition-colors" title={`Export ${round} Leads`}><FaFileExport size={10} /></button>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-[10px]"><span className="text-slate-400">Assigned:</span><span className="text-white font-bold">{roundData.assigned}</span></div>
                                                                            <div className="flex justify-between items-center text-[10px]"><span className="text-slate-400">Covered:</span><span className="text-amber-400 font-bold">{roundData.contacted}</span></div>
                                                                            <div className="flex justify-between items-center text-[10px]"><span className="text-slate-400">Pending:</span><span className="text-slate-300 font-bold">{roundData.pending}</span></div>
                                                                            {round !== 'PAID' && <div className="flex justify-between items-center text-[10px]"><span className="text-red-400/80">Delayed:</span><span className="text-red-400 font-bold">{roundData.delayed}</span></div>}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>

            {/* 🔥 ADVANCED EXPORT MODAL 🔥 */}
            {showExportModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0b111a] border border-white/10 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
                        
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2"><FaFileExport className="text-emerald-500"/> Advanced Export Leads</h2>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Export Direct Inquiries Data to Excel (CSV)</p>
                            </div>
                            <button onClick={() => setShowExportModal(false)} className="text-slate-500 hover:text-white bg-black/40 p-2 rounded-lg transition-colors border border-transparent hover:border-white/10"><FaTimes size={14}/></button>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex flex-col gap-5">
                            {/* Mode Selection */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Export Scope</label>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => setExportMode('ALL')} className={`p-3 rounded-xl border text-left transition-all ${exportMode === 'ALL' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-inner' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                                        <h4 className="font-bold text-sm text-white mb-0.5">All Data (Overall)</h4>
                                        <p className="text-xs opacity-70">Export all Direct Inquiries leads across all staff members.</p>
                                    </button>
                                    <button onClick={() => setExportMode('SINGLE')} className={`p-3 rounded-xl border text-left transition-all ${exportMode === 'SINGLE' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-inner' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                                        <h4 className="font-bold text-sm text-white mb-0.5">Single Coordinator</h4>
                                        <p className="text-xs opacity-70">Select one specific coordinator and export their leads.</p>
                                    </button>
                                    <button onClick={() => setExportMode('MULTIPLE')} className={`p-3 rounded-xl border text-left transition-all ${exportMode === 'MULTIPLE' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-inner' : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                                        <h4 className="font-bold text-sm text-white mb-0.5">Multiple Coordinators</h4>
                                        <p className="text-xs opacity-70">Select multiple staff members to export their combined leads.</p>
                                    </button>
                                </div>
                            </div>

                            {/* Dynamic Options based on selection */}
                            <div className="min-h-[120px]">
                                {exportMode === 'ALL' && (
                                    <div className="flex h-full items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <p className="text-sm font-bold text-emerald-400 text-center">Ready to export {stats.rawLeads?.length || 0} total leads.</p>
                                    </div>
                                )}
                                
                                {exportMode === 'SINGLE' && (
                                    <div className="flex flex-col gap-2 animate-fade-in">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Coordinator</label>
                                        <select value={selectedSingleStaff} onChange={(e) => setSelectedSingleStaff(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm font-semibold text-white outline-none focus:border-indigo-500 cursor-pointer">
                                            <option value="">-- Choose Staff --</option>
                                            {allStaffNames.map(name => <option key={name} value={name}>{name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {exportMode === 'MULTIPLE' && (
                                    <div className="flex flex-col gap-2 animate-fade-in">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Coordinators (Tick)</label>
                                        <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto custom-scrollbar pr-2 p-2 bg-black/20 border border-white/5 rounded-xl">
                                            {allStaffNames.map(name => {
                                                const isSelected = selectedMultipleStaff.includes(name);
                                                return (
                                                    <div key={name} onClick={() => handleMultiSelectToggle(name)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${isSelected ? 'bg-indigo-600/20 border-indigo-500/30' : 'hover:bg-white/5 border-transparent'}`}>
                                                        {isSelected ? <FaCheckSquare className="text-indigo-400" size={16}/> : <FaRegSquare className="text-slate-600" size={16}/>}
                                                        <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-400'}`}>{name}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <p className="text-xs text-indigo-400 font-bold mt-1 text-right">{selectedMultipleStaff.length} selected</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex gap-3">
                            <button onClick={() => setShowExportModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-white/10">Cancel</button>
                            <button onClick={handleExecuteExport} className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2">
                                <FaFileExport size={14}/> Generate Excel
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}