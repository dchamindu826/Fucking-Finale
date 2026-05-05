import React, { useState, useEffect } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';

export default function DeliveredReturned({ searchQuery }) {
    const [historyItems, setHistoryItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get('/admin/delivery/history');
                setHistoryItems(res.data || []);
            } catch (error) {
                toast.error("Failed to load delivery history.");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const filtered = historyItems.filter(order => 
        order.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        order.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;

    return (
        <div className="space-y-4 animate-fade-in">
            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-[#1e2336]/40 rounded-2xl border border-white/5">
                    <p className="text-slate-500 font-bold text-lg">No delivery records found.</p>
                </div>
            ) : (
                filtered.map((order, idx) => (
                    <div key={idx} className="bg-[#1e2336]/80 border border-white/5 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                        <div>
                            <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                                {order.studentName}
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${order.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : order.status === 'On The Way' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                    {order.status}
                                </span>
                            </h4>
                            <p className="text-xs text-slate-400 font-medium">Order: <span className="text-white">{order.id}</span> • Tracking: <span className="text-blue-400">{order.trackingNumber}</span></p>
                            {order.status === 'Not Delivered' && (
                                <p className="mt-2 text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 inline-block">Issue reported by student</p>
                            )}
                        </div>
                        <button className="bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs uppercase tracking-widest border border-white/10 flex items-center gap-2">
                            <Eye size={14}/> View Details
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}