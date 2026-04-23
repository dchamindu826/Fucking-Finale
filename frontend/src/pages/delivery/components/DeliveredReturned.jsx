import React from 'react';
import { Eye } from 'lucide-react';

export default function DeliveredReturned({ searchQuery }) {
    const deliveredItems = [
        { id: 'ORD-1001', studentName: 'Ruwan Kumara', trackingId: 'TRK-998877', status: 'Delivered', date: '2024-10-22' },
        { id: 'ORD-1005', studentName: 'Amal Perera', trackingId: 'TRK-998822', status: 'Returned', date: '2024-10-21', returnReason: 'Student Not Available' },
    ];

    const filtered = deliveredItems.filter(order => 
        order.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        order.trackingId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4 animate-fade-in">
            {filtered.map((order, idx) => (
                <div key={idx} className="bg-[#1e2336]/80 border border-white/5 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                    <div>
                        <h4 className="font-bold text-white mb-1 flex items-center gap-2">
                            {order.studentName}
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${order.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {order.status}
                            </span>
                        </h4>
                        <p className="text-xs text-slate-400 font-medium">Order: <span className="text-white">{order.id}</span> • Tracking: <span className="text-blue-400">{order.trackingId}</span></p>
                        {order.status === 'Returned' && (
                            <p className="mt-2 text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 inline-block">Reason: {order.returnReason}</p>
                        )}
                    </div>
                    <button className="bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs uppercase tracking-widest border border-white/10 flex items-center gap-2">
                        <Eye size={14}/> View Details
                    </button>
                </div>
            ))}
        </div>
    );
}