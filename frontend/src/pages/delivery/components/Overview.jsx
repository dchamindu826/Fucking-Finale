import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, Box, Loader2 } from 'lucide-react';
import axios from '../../../api/axios'; // Adjust path based on your folder structure
import toast from 'react-hot-toast';

export default function Overview() {
    const [stats, setStats] = useState({ pending: 0, onHold: 0, deliveredToday: 0, lowStock: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // We will create this backend endpoint next
                const res = await axios.get('/admin/delivery/stats');
                setStats(res.data);
            } catch (error) {
                toast.error("Failed to load delivery stats.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={32}/></div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            <div className="bg-[#1e2336]/80 p-6 rounded-2xl border border-white/5 shadow-lg flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">To Dispatch</p>
                    <p className="text-3xl font-black text-white">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center"><Package size={24}/></div>
            </div>
            <div className="bg-[#1e2336]/80 p-6 rounded-2xl border border-orange-500/20 shadow-lg flex items-center justify-between">
                <div>
                    <p className="text-xs text-orange-400 font-bold uppercase tracking-widest mb-1">On Hold</p>
                    <p className="text-3xl font-black text-orange-400">{stats.onHold}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/10 text-orange-400 rounded-xl flex items-center justify-center"><AlertTriangle size={24}/></div>
            </div>
            <div className="bg-[#1e2336]/80 p-6 rounded-2xl border border-emerald-500/20 shadow-lg flex items-center justify-between">
                <div>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">Delivered Today</p>
                    <p className="text-3xl font-black text-emerald-400">{stats.deliveredToday}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center"><CheckCircle size={24}/></div>
            </div>
            <div className="bg-[#1e2336]/80 p-6 rounded-2xl border border-red-500/20 shadow-lg flex items-center justify-between">
                <div>
                    <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-1">Low Stock Alerts</p>
                    <p className="text-3xl font-black text-red-400">{stats.lowStock}</p>
                </div>
                <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center"><Box size={24}/></div>
            </div>
        </div>
    );
}