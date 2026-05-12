import React, { useState, useEffect } from 'react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';
import { Users, Loader2, ArrowRight } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaUserTie, FaSearch, FaFileExcel, FaCalendarAlt } from 'react-icons/fa';

export default function BridgeTransfersTab({ filters }) {
    const [pendingLeads, setPendingLeads] = useState([]);
    const [selectedLeads, setSelectedLeads] = useState([]);
    const [pushing, setPushing] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [bulkAmount, setBulkAmount] = useState(''); // Bulk Assign Amount

    const [coordinators, setCoordinators] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState('');

    const [loadingStats, setLoadingStats] = useState(true);
    
    // 🔥 NEW: Date Range States 🔥
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [bridgeStats, setBridgeStats] = useState({
        totalTransferred: 0, totalContacted: 0, totalPending: 0, totalEnrolled: 0, staffBreakdown: []
    });

    useEffect(() => {
        if (filters?.selectedBusiness) {
            fetchBridgeData();
            fetchCoordinators();
        } else {
            setPendingLeads([]);
            setBridgeStats({ totalTransferred: 0, totalContacted: 0, totalPending: 0, totalEnrolled: 0, staffBreakdown: [] });
            setLoadingStats(false);
        }
    }, [filters?.selectedBusiness, filters?.selectedBatch, startDate, endDate]);

    const fetchCoordinators = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/admin/staff', { headers: { Authorization: `Bearer ${token}` } });
            setCoordinators(res.data.filter(s => s.role === 'Coordinator' || s.role === 'CALLER' || s.role === 'MANAGER'));
        } catch (e) { console.error("Failed to load staff"); }
    };

    const fetchBridgeData = async () => {
        if (!filters?.selectedBusiness) return;

        setLoadingStats(true);
        const token = localStorage.getItem('token');
        try {
            const params = { 
                businessId: filters.selectedBusiness, 
                batchId: filters.selectedBatch || 'ALL',
                startDate: startDate || undefined,
                endDate: endDate || undefined
            };

            const pendingRes = await axios.get('/after-seminar-crm/bridge/pending', {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setPendingLeads(pendingRes.data.leads || []);
            setSelectedLeads([]);

            const statsRes = await axios.get('/after-seminar-crm/stats/bridge', {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            if (statsRes.data) setBridgeStats(statsRes.data);
        } catch (error) { 
            toast.error("Error loading Bridge Analytics"); 
            setBridgeStats({ totalTransferred: 0, totalContacted: 0, totalPending: 0, totalEnrolled: 0, staffBreakdown: [] });
        }
        setLoadingStats(false);
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

    // Filter by Search Query
    const filteredLeads = pendingLeads.filter(l => 
        l.phone.includes(searchQuery) || (l.name && l.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // BULK SELECTION LOGIC
    const handleBulkSelect = () => {
        const amount = parseInt(bulkAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid number");
            return;
        }
        if (amount > filteredLeads.length) {
            toast.error(`Only ${filteredLeads.length} leads available to select.`);
            setSelectedLeads(filteredLeads.map(l => l.id));
        } else {
            const leadsToSelect = filteredLeads.slice(0, amount).map(l => l.id);
            setSelectedLeads(leadsToSelect);
            toast.success(`Selected top ${amount} leads!`);
        }
    };

    const toggleSelectAll = () => {
        if (selectedLeads.length === filteredLeads.length) setSelectedLeads([]);
        else setSelectedLeads(filteredLeads.map(l => l.id));
    };

    const toggleLead = (id) => {
        if (selectedLeads.includes(id)) setSelectedLeads(selectedLeads.filter(l => l !== id));
        else setSelectedLeads([...selectedLeads, id]);
    };

    const handlePushToCampaign = async () => {
        if (selectedLeads.length === 0) return toast.error("Select leads to transfer.");
        setPushing(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/after-seminar-crm/bridge/push', {
                leadIds: selectedLeads,
                businessId: filters.selectedBusiness,
                batchId: filters.selectedBatch,
                staffId: selectedStaff || null
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            toast.success(`Successfully pushed & assigned ${selectedLeads.length} leads!`);
            setBulkAmount('');
            fetchBridgeData(); 
        } catch (error) { toast.error("Failed to transfer leads"); }
        setPushing(false);
    };

    const handleExportSelected = () => {
        if (selectedLeads.length === 0) return toast.error("No leads selected to export.");

        const leadsToExport = filteredLeads.filter(l => selectedLeads.includes(l.id));
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Student Name,Phone Number,Status\n"; // Header row

        leadsToExport.forEach(row => {
            const name = row.name ? row.name.replace(/,/g, '') : 'Unknown';
            const phone = row.phone || '';
            const status = row.status || 'NEW';
            csvContent += `${name},${phone},${status}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Bridge_Leads_BIZ_${filters.selectedBusiness}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Successfully exported selected leads!");
    };

    if (!filters?.selectedBusiness) {
        return <div className="flex justify-center items-center h-[400px] text-slate-500 font-sans tracking-wide">Please select a Campaign/Business to view Bridge Analytics.</div>;
    }

    const conversionRate = bridgeStats.totalTransferred > 0 ? Math.round((bridgeStats.totalEnrolled / bridgeStats.totalTransferred) * 100) : 0;
    const unassignedCount = bridgeStats.totalTransferred - bridgeStats.staffBreakdown.reduce((sum, s) => sum + s.assigned, 0);

    return (
        <div className="space-y-6 font-sans text-slate-200">
            
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

                    {/* DATE RANGE PICKER */}
                    <div className="flex items-center gap-2 bg-[#0b0e14] border border-slate-700 p-1.5 rounded-lg">
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
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* MANAGER OVERALL STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pending in Free</p>
                    <h2 className="text-3xl font-black text-white mt-1">{pendingLeads.length}</h2>
                </div>
                <div className="bg-blue-900/20 p-5 rounded-2xl border border-blue-500/20">
                    <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Total Transferred</p>
                    <h2 className="text-3xl font-black text-blue-400 mt-1">{bridgeStats.totalTransferred}</h2>
                </div>
                <div className="bg-indigo-900/20 p-5 rounded-2xl border border-indigo-500/20">
                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Un-Assigned</p>
                    <h2 className="text-3xl font-black text-indigo-400 mt-1">{unassignedCount}</h2>
                </div>
                <div className="bg-rose-900/20 p-5 rounded-2xl border border-rose-500/20">
                    <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest">Pending Calls</p>
                    <h2 className="text-3xl font-black text-rose-400 mt-1">{bridgeStats.totalPending}</h2>
                </div>
                <div className="bg-emerald-900/20 p-5 rounded-2xl border border-emerald-500/20">
                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Total Enrolled</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h2 className="text-3xl font-black text-emerald-400 leading-none">{bridgeStats.totalEnrolled}</h2>
                        <span className="text-xs font-bold text-emerald-500">({conversionRate}% Rate)</span>
                    </div>
                </div>
            </div>

            {/* STAFF PERFORMANCE TABLE */}
            <div className="bg-[#1e293b]/50 backdrop-blur-lg p-5 rounded-2xl border border-white/5 shadow-xl flex flex-col">
                <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest flex items-center gap-2"><FaUserTie className="text-blue-400"/> Coordinator Success on Bridge Leads</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-slate-400 text-[10px] uppercase font-black tracking-wider border-b border-white/10">
                            <tr>
                                <th className="py-3 px-2">Coordinator Name</th>
                                <th className="py-3 px-2 text-center">Assigned</th>
                                <th className="py-3 px-2 text-center text-blue-400">Covered</th>
                                <th className="py-3 px-2 text-center text-rose-400">Pending</th>
                                <th className="py-3 px-2 text-center text-emerald-400">Enrolled</th>
                                <th className="py-3 px-2 text-right">Success Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {bridgeStats.staffBreakdown.length === 0 ? (
                                <tr><td colSpan="6" className="py-8 text-center text-slate-500">No leads assigned to any coordinator yet.</td></tr>
                            ) : (
                                bridgeStats.staffBreakdown.map((staff, idx) => {
                                    const rate = staff.assigned > 0 ? Math.round((staff.enrolled / staff.assigned) * 100) : 0;
                                    return (
                                        <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                                            <td className="py-3 px-2 font-bold text-slate-200">{staff.name}</td>
                                            <td className="py-3 px-2 text-center font-mono text-slate-300">{staff.assigned}</td>
                                            <td className="py-3 px-2 text-center font-mono font-bold text-blue-400">{staff.contacted}</td>
                                            <td className="py-3 px-2 text-center font-mono font-bold text-rose-400">{staff.pending}</td>
                                            <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400 bg-emerald-500/10 rounded-lg">{staff.enrolled}</td>
                                            <td className="py-3 px-2 text-right font-black">
                                                <span className={`px-2 py-1 rounded-md text-[11px] ${rate > 50 ? 'bg-emerald-500/20 text-emerald-400' : rate > 20 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                    {rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TRANSFER AND ASSIGN SECTION */}
            <div className="bg-[#1e293b]/50 backdrop-blur-lg rounded-2xl border border-white/5 shadow-xl overflow-hidden flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-black/20 p-5 border-b border-white/5 gap-4">
                    <div>
                        <h3 className="text-white font-black flex items-center gap-2">
                            <Users className="text-blue-400" size={18} /> Push & Assign Free Seminar Leads
                        </h3>
                        <p className="text-slate-400 text-xs mt-1 font-medium">Select pending leads, choose a coordinator, and transfer them.</p>
                    </div>

                    {/* SEARCH & BULK SELECT */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative w-full sm:w-48">
                            <FaSearch className="absolute left-3 top-3 text-slate-400 text-sm" />
                            <input type="text" placeholder="Search numbers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-blue-500 shadow-inner" />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input type="number" placeholder="Count" value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} className="w-20 bg-[#0f172a] border border-slate-600 rounded-xl py-2 px-3 text-xs text-center text-white outline-none focus:border-blue-500" min="1" max={filteredLeads.length} />
                            <button onClick={handleBulkSelect} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all">Select</button>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-slate-300">
                            {selectedLeads.length} Leads Selected
                        </span>
                        {selectedLeads.length > 0 && (
                            <button 
                                onClick={handleExportSelected} 
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold text-xs rounded-lg transition-all"
                            >
                                <FaFileExcel size={14} /> Export CSV
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}
                            className="bg-[#0f172a] text-xs font-bold text-slate-300 border border-slate-600 rounded-xl px-4 py-3 outline-none focus:border-blue-500 flex-1 sm:w-48 shadow-inner"
                        >
                            <option value="">-- Leave Unassigned --</option>
                            {coordinators.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                        </select>
                        <button onClick={handlePushToCampaign} disabled={selectedLeads.length === 0 || pushing}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            {pushing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                            Transfer
                        </button>
                    </div>
                </div>

                {loadingStats ? (
                    <div className="p-10 flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="animate-spin mb-2" size={24}/> Loading transfer pool...
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="p-10 flex flex-col items-center justify-center text-emerald-500 font-medium bg-emerald-500/5">
                        <FaCheckCircle size={24} className="mb-2 opacity-50" />
                        No Pending Leads Found!
                    </div>
                ) : (
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-[#0f172a] text-slate-400 text-[10px] uppercase font-black tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 w-10 rounded-l-lg"><input type="checkbox" checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0} onChange={toggleSelectAll} className="accent-blue-500 w-4 h-4 rounded cursor-pointer" /></th>
                                    <th className="p-3">Student Name</th>
                                    <th className="p-3">Phone Number</th>
                                    <th className="p-3 rounded-r-lg">Previous Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredLeads.map((l) => (
                                    <tr key={l.id} className="hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => toggleLead(l.id)}>
                                        <td className="p-3"><input type="checkbox" checked={selectedLeads.includes(l.id)} onChange={() => {}} className="accent-blue-500 w-4 h-4 rounded cursor-pointer pointer-events-none" /></td>
                                        <td className="p-3 font-bold text-white">{l.name}</td>
                                        <td className="p-3 font-mono text-slate-400">{l.phone}</td>
                                        <td className="p-3"><span className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] font-black rounded-md uppercase tracking-wider">{l.status || 'NEW'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}