import React, { useState, useEffect } from 'react';
import { X as CloseIcon, Calendar, CheckCircle, XCircle, User } from 'lucide-react';
import axios from '../../api/axios';

export default function StaffPerformanceModal({ onClose }) {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchStaffStats = async () => {
        setLoading(true);
        try {
            // Backend එකෙන් staff stats ගන්න API call එක (මේක backend එකේ හදන්න ඕනේ)
            const res = await axios.get('/admin/payments/staff-stats', {
                params: { dateFrom, dateTo }
            });
            setStats(res.data || []);
        } catch (error) {
            console.error("Failed to fetch stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaffStats();
    }, [dateFrom, dateTo]);

    return (
        <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#15192b] border border-white/10 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">Staff Performance Stats</h2>
                        <p className="text-sm text-slate-400 font-medium">Review payment approvals and rejections by staff members.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-red-400">
                        <CloseIcon size={24} />
                    </button>
                </div>

                <div className="p-6 border-b border-white/5 bg-[#1e2336]/50 flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">From Date</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">To Date</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                    <button onClick={fetchStaffStats} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center gap-2">
                        <Calendar size={18} /> Filter
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#15192b]">
                    {loading ? (
                        <div className="text-center py-10 text-emerald-500 font-bold">Loading Stats...</div>
                    ) : stats.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 font-bold">No records found for the selected date range.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stats.map((staff, idx) => (
                                <div key={idx} className="bg-black/30 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
                                        <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center"><User size={20}/></div>
                                        <div>
                                            <h3 className="text-white font-bold">{staff.name}</h3>
                                            <p className="text-xs text-slate-500 uppercase tracking-widest">{staff.role}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 mb-2">
                                        <span className="text-emerald-400 font-bold text-sm flex items-center gap-2"><CheckCircle size={16}/> Approved</span>
                                        <span className="text-emerald-400 font-black text-lg">{staff.approvedCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                        <span className="text-red-400 font-bold text-sm flex items-center gap-2"><XCircle size={16}/> Rejected</span>
                                        <span className="text-red-400 font-black text-lg">{staff.rejectedCount}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}