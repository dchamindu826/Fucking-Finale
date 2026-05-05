import React, { useState, useEffect } from 'react';
import { Truck, Package, MapPin, CheckCircle, AlertTriangle, XCircle, Clock, Image as ImageIcon, Loader2 } from 'lucide-react';
import axios from "../../../api/axios";
import toast from 'react-hot-toast';

export default function DeliveryHub() {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const fetchDeliveries = async () => {
        try {
            // Student ගේ deliveries ටික ගන්නවා
            const res = await axios.get('/student/deliveries');
            setDeliveries(res.data || []);
        } catch (error) {
            toast.error("Failed to load delivery details.");
        } finally {
            setLoading(false);
        }
    };

    // ළමයා Received හෝ Not Received click කරාම
    const handleStatusConfirm = async (deliveryId, status) => {
        try {
            await axios.post('/student/deliveries/confirm', { deliveryId, status });
            toast.success(`Marked as ${status}`);
            fetchDeliveries(); // Refresh list
        } catch (error) {
            toast.error("Failed to update status.");
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto animate-fade-in pb-20 font-sans">
            {/* Header Section */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
                    <Truck size={30} className="text-orange-500"/>
                </div>
                <div>
                    <h2 className="text-2xl md:text-4xl font-black text-white tracking-wide uppercase">Delivery Hub</h2>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Track your study materials and tutes in real-time.</p>
                </div>
            </div>

            {/* Empty State */}
            {deliveries.length === 0 ? (
                <div className="glass-card rounded-[2.5rem] p-10 md:p-20 border border-white/10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Package size={40} className="text-slate-500"/>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">No Active Deliveries</h3>
                    <p className="text-slate-400">When you make a payment, your tute dispatch details will appear here.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {deliveries.map(delivery => (
                        <DeliveryCard 
                            key={delivery.id} 
                            delivery={delivery} 
                            onConfirm={handleStatusConfirm} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------- Delivery Card Component ----------------
function DeliveryCard({ delivery, onConfirm }) {
    // Timeline steps calculation
    const isHold = delivery.status === 'Hold';
    const isNotReceived = delivery.status === 'Not Received';
    const isDelivered = delivery.status === 'Received';
    const isOnTheWay = delivery.status === 'On the way' || isDelivered || isNotReceived;
    const isPacked = delivery.status === 'Packed' || isOnTheWay || isHold; // Even if hold, it might have been processing

    return (
        <div className="bg-[#1e2336]/80 border border-white/5 rounded-3xl p-6 shadow-xl overflow-hidden relative">
            {/* Hold Banner */}
            {isHold && (
                <div className="bg-orange-500/10 border-b border-orange-500/20 p-4 -mt-6 -mx-6 mb-6 flex items-start gap-3">
                    <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={18}/>
                    <div>
                        <h4 className="text-orange-400 font-bold text-sm uppercase tracking-widest">Delivery on Hold</h4>
                        <p className="text-slate-300 text-xs mt-1">Reason: <span className="font-bold">{delivery.holdReason}</span></p>
                        {delivery.holdRemark && <p className="text-slate-400 text-xs italic mt-1">"{delivery.holdRemark}"</p>}
                    </div>
                </div>
            )}

            {/* Error Banner */}
            {isNotReceived && (
                <div className="bg-red-500/10 border-b border-red-500/20 p-4 -mt-6 -mx-6 mb-6 flex items-center gap-3">
                    <XCircle className="text-red-400 shrink-0" size={18}/>
                    <p className="text-red-400 font-bold text-sm">You reported this as Not Received. Our team will contact you shortly.</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                
                {/* Left Side: Order Info & Items */}
                <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] bg-white/10 text-white px-3 py-1 rounded font-bold uppercase tracking-widest border border-white/5">ORD-{delivery.id}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12}/> {new Date(delivery.createdAt).toLocaleDateString()}</span>
                    </div>

                    {delivery.trackingNumber && (
                        <p className="text-sm font-bold text-slate-300 mb-4 bg-black/40 inline-block px-3 py-1.5 rounded-lg border border-white/5">
                            Tracking Number: <span className="text-blue-400 tracking-wider ml-1">{delivery.trackingNumber}</span>
                        </p>
                    )}

                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Included Study Materials</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                        {delivery.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-black/30 p-2.5 rounded-xl border border-white/5">
                                {item.tuteImage ? (
                                    <img src={`https://imacampus.online/storage/tutes/${item.tuteImage}`} className="w-10 h-10 rounded-lg object-cover border border-white/10" alt="tute" />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-500"><ImageIcon size={16}/></div>
                                )}
                                <div className="flex-1 pr-2 truncate">
                                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide truncate">{item.tuteName}</p>
                                    <p className="text-[10px] text-slate-500">Qty: {item.quantity}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Timeline & Actions */}
                <div className="w-full md:w-64 shrink-0 bg-black/20 p-5 rounded-2xl border border-white/5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Delivery Status</h4>
                    
                    {/* Vertical Timeline */}
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                        
                        {/* Step 1: Processing */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 bg-[#1e2336] z-10 ${true ? 'border-emerald-500 text-emerald-500' : 'border-slate-600 text-slate-600'}`}>
                                <CheckCircle size={12} className={true ? 'block' : 'hidden'}/>
                            </div>
                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:text-right">
                                <p className={`text-sm font-bold ${true ? 'text-white' : 'text-slate-500'}`}>Processing</p>
                            </div>
                        </div>

                        {/* Step 2: Packed */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 bg-[#1e2336] z-10 ${isPacked && !isHold ? 'border-blue-500 text-blue-500' : 'border-slate-600 text-slate-600'}`}>
                                {(isPacked && !isHold) && <CheckCircle size={12}/>}
                            </div>
                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:text-right">
                                <p className={`text-sm font-bold ${isPacked && !isHold ? 'text-blue-400' : 'text-slate-500'}`}>Packed</p>
                                {isPacked && !isHold && <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Ready for pickup</p>}
                            </div>
                        </div>

                        {/* Step 3: On The Way */}
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 bg-[#1e2336] z-10 ${isOnTheWay && !isHold ? 'border-purple-500 text-purple-500' : 'border-slate-600 text-slate-600'}`}>
                                {(isOnTheWay && !isHold) && <Truck size={10}/>}
                            </div>
                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:text-right">
                                <p className={`text-sm font-bold ${isOnTheWay && !isHold ? 'text-purple-400' : 'text-slate-500'}`}>On the Way</p>
                                {isOnTheWay && !isDelivered && !isNotReceived && <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Expect in 2-3 Days</p>}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons (Only visible when On The Way) */}
                    {delivery.status === 'On the way' && (
                        <div className="mt-6 pt-5 border-t border-white/10">
                            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mb-3">Did you receive it?</p>
                            <div className="flex gap-2">
                                <button onClick={() => onConfirm(delivery.id, 'Received')} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex justify-center items-center gap-1">
                                    <CheckCircle size={14}/> Yes
                                </button>
                                <button onClick={() => onConfirm(delivery.id, 'Not Received')} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-red-500/20 flex justify-center items-center gap-1">
                                    <XCircle size={14}/> No
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Final Status Display */}
                    {isDelivered && (
                        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-2 text-emerald-400">
                            <CheckCircle size={16}/> <span className="text-sm font-bold uppercase tracking-widest">Delivered</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}