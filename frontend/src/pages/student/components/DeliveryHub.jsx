import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Truck, Package, MapPin, CheckCircle, AlertTriangle, XCircle, Clock, Image as ImageIcon, Loader2, Copy, Globe, X, ChevronRight } from 'lucide-react';
import axios from "../../../api/axios";
import toast from 'react-hot-toast';

export default function DeliveryHub() {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tracking Modal State
    const [trackingModalOpen, setTrackingModalOpen] = useState(false);
    const COURIER_URL = "https://www.fdedomestic.com/"; // ඔයාගේ Courier සයිට් එක

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const fetchDeliveries = async () => {
        try {
            const res = await axios.get('/student/deliveries');
            setDeliveries(res.data || []);
        } catch (error) {
            toast.error("Failed to load delivery details.");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusConfirm = async (deliveryId, status) => {
        try {
            await axios.post('/student/deliveries/confirm', { deliveryId, status });
            toast.success(`Marked as ${status}`);
            fetchDeliveries();
        } catch (error) {
            toast.error("Failed to update status.");
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto animate-fade-in pb-20 font-sans">
            {/* Header Section */}
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                    <Truck size={30} className="text-blue-500"/>
                </div>
                <div>
                    <h2 className="text-2xl md:text-4xl font-black text-white tracking-wide uppercase">Delivery Hub</h2>
                    <p className="text-slate-400 mt-1 text-sm font-medium">Track your study materials and tutes in real-time.</p>
                </div>
            </div>

            {/* Empty State */}
            {deliveries.length === 0 ? (
                <div className="bg-[#1e2336]/60 rounded-[2.5rem] p-10 md:p-20 border border-white/5 flex flex-col items-center text-center shadow-inner">
                    <div className="w-24 h-24 bg-black/40 rounded-full flex items-center justify-center mb-6 border border-white/5">
                        <Package size={40} className="text-slate-500"/>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">No Active Deliveries</h3>
                    <p className="text-slate-400">When you make a payment, your tute dispatch details will appear here.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {deliveries.map(delivery => (
                        <DeliveryCard 
                            key={delivery.id} 
                            delivery={delivery} 
                            onConfirm={handleStatusConfirm} 
                            onOpenTracking={() => setTrackingModalOpen(true)}
                        />
                    ))}
                </div>
            )}

            {/* 🔥 Tracking Iframe Modal 🔥 */}
            {trackingModalOpen && createPortal(
                <div className="fixed inset-0 z-[99999] bg-[#0a0f1c]/95 flex items-center justify-center p-2 sm:p-6 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#15192b] border border-blue-500/30 rounded-3xl w-full max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="bg-black/40 p-4 sm:p-5 border-b border-white/10 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-white font-black text-lg sm:text-xl flex items-center gap-2">
                                    <Globe className="text-blue-400" size={24}/> Courier Tracking Portal
                                </h3>
                                <p className="text-[10px] sm:text-xs text-slate-400 mt-1 uppercase tracking-widest">Paste your copied tracking number below</p>
                            </div>
                            <button onClick={() => setTrackingModalOpen(false)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors">
                                <X size={24}/>
                            </button>
                        </div>
                        
                        {/* Iframe */}
                        <div className="flex-1 w-full bg-white relative">
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-0 flex-col gap-3">
                                <Loader2 size={30} className="animate-spin text-blue-500"/>
                                <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">Loading Portal...</span>
                            </div>
                            <iframe 
                                src={COURIER_URL} 
                                className="w-full h-full relative z-10 border-0" 
                                title="Courier Tracking"
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// ---------------- Delivery Card Component ----------------
function DeliveryCard({ delivery, onConfirm, onOpenTracking }) {
    // Status Logic
    const isHold = delivery.status === 'Hold';
    const isNotReceived = delivery.status === 'Not Received';
    const isDelivered = delivery.status === 'Received';
    const isOnTheWay = delivery.status === 'On the way' || isDelivered || isNotReceived;
    const isPacked = delivery.status === 'Packed' || isOnTheWay || isHold;
    const getTuteImgUrl = (imageName) => (!imageName || imageName === 'default-tute.png' || imageName === 'null') ? '/default-tute.png' : `${axios.defaults.baseURL.replace('/api', '')}/storage/icons/${imageName}`;

    // HTTP/HTTPS Supported Copy Function
    const copyToClipboard = (text) => {
        if (!text) return;
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => toast.success(`Copied: ${text}`, { style: { background: '#1e293b', color: '#fff' }}));
        } else {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.opacity = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                if (successful) toast.success(`Copied: ${text}`, { style: { background: '#1e293b', color: '#fff' }});
                document.body.removeChild(textArea);
            } catch (err) {
                toast.error("Copy failed");
            }
        }
    };

    return (
        <div className="bg-[#1e2336]/80 border border-white/5 rounded-3xl p-5 md:p-8 shadow-xl relative overflow-hidden">
            
            {/* Top Banners for Hold/Error */}
            {isHold && (
                <div className="bg-orange-500/10 border-b border-orange-500/20 p-4 -mt-5 md:-mt-8 -mx-5 md:-mx-8 mb-6 flex items-start gap-3">
                    <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={20}/>
                    <div>
                        <h4 className="text-orange-400 font-bold text-sm uppercase tracking-widest">Delivery on Hold</h4>
                        <p className="text-slate-300 text-sm mt-1">Reason: <span className="font-bold">{delivery.holdReason}</span></p>
                        {delivery.holdRemark && <p className="text-slate-400 text-xs italic mt-1 border-l-2 border-orange-500/30 pl-2">"{delivery.holdRemark}"</p>}
                    </div>
                </div>
            )}

            {isNotReceived && (
                <div className="bg-red-500/10 border-b border-red-500/20 p-4 -mt-5 md:-mt-8 -mx-5 md:-mx-8 mb-6 flex items-center gap-3">
                    <XCircle className="text-red-400 shrink-0" size={20}/>
                    <p className="text-red-400 font-bold text-sm">You reported this as Not Received. Our team will contact you shortly.</p>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* Left Side: Order Info */}
                <div className="flex-[1.5] w-full">
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-md font-black text-sm uppercase tracking-widest shadow-md">ORD-{delivery.id}</span>
                        <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5"><Clock size={14}/> {new Date(delivery.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* 🔥 NEW: Beautiful Tracking Section 🔥 */}
                    {delivery.trackingNumber && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 mb-8 shadow-inner">
                            <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Truck size={16}/> Live Tracking details
                            </h4>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Copy Box */}
                                <div className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-xl border border-white/5 flex-1">
                                    <span className="text-white font-black text-lg tracking-widest">{delivery.trackingNumber}</span>
                                    <button onClick={() => copyToClipboard(delivery.trackingNumber)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors flex items-center gap-2" title="Copy tracking number">
                                        <Copy size={16}/> <span className="text-xs font-bold sm:hidden">COPY</span>
                                    </button>
                                </div>
                                {/* Web Button */}
                                <button onClick={onOpenTracking} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all shrink-0">
                                    <Globe size={18}/> Track Package
                                </button>
                            </div>
                            <p className="text-xs text-blue-300/70 font-medium mt-3 flex items-start gap-1.5">
                                <span className="text-blue-400">💡</span> Note: Click the copy icon above, then click 'Track Package' and paste it into the courier portal to check your package location.
                            </p>
                        </div>
                    )}

                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Included Study Materials</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {delivery.items?.map((item, idx) => {
                            // 🔥 tuteImage හරි tuteCover හරි දෙකෙන් තියෙන එකක් ගන්නවා
                            const finalTuteImg = item.tuteImage || item.tuteCover; 
                            
                            return (
                                <div key={idx} className="flex items-center gap-4 bg-black/30 p-3 rounded-2xl border border-white/5 shadow-inner">
                                    {finalTuteImg ? (
                                        <img src={getTuteImgUrl(finalTuteImg)} className="w-12 h-14 rounded-lg object-cover border border-white/10 bg-slate-800" alt="tute" />
                                    ) : (
                                        <div className="w-12 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-500"><ImageIcon size={18}/></div>
                                    )}
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="text-sm font-black text-white truncate mb-1">{item.tuteName}</p>
                                        <p className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block uppercase tracking-widest">Qty: {item.quantity}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Side: Clean Vertical Timeline */}
                <div className="flex-1 w-full lg:max-w-xs bg-black/20 p-6 rounded-3xl border border-white/5 shrink-0">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Status Timeline</h4>
                    
                    <div className="relative border-l-2 border-white/10 ml-3 md:ml-4 space-y-8 pb-4">
                        
                        {/* Step 1: Processing */}
                        <div className="relative pl-6">
                            <div className="absolute -left-[11px] top-0.5 w-5 h-5 rounded-full bg-[#1e2336] border-2 border-blue-500 flex items-center justify-center z-10">
                                <CheckCircle size={10} className="text-blue-500"/>
                            </div>
                            <h5 className="text-sm font-black text-white">Order Processing</h5>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Payment Verified</p>
                        </div>

                        {/* Step 2: Packed */}
                        <div className="relative pl-6">
                            <div className={`absolute -left-[11px] top-0.5 w-5 h-5 rounded-full bg-[#1e2336] border-2 z-10 flex items-center justify-center ${isPacked && !isHold ? 'border-blue-500' : 'border-slate-700'}`}>
                                {(isPacked && !isHold) && <CheckCircle size={10} className="text-blue-500"/>}
                            </div>
                            <h5 className={`text-sm font-black ${isPacked && !isHold ? 'text-white' : 'text-slate-500'}`}>Packed</h5>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ready for Courier</p>
                        </div>

                        {/* Step 3: On The Way */}
                        <div className="relative pl-6">
                            <div className={`absolute -left-[11px] top-0.5 w-5 h-5 rounded-full bg-[#1e2336] border-2 z-10 flex items-center justify-center ${isOnTheWay && !isHold ? 'border-blue-500' : 'border-slate-700'}`}>
                                {(isOnTheWay && !isHold) && <CheckCircle size={10} className="text-blue-500"/>}
                            </div>
                            <h5 className={`text-sm font-black ${isOnTheWay && !isHold ? 'text-white' : 'text-slate-500'}`}>Dispatched</h5>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Handed over to courier</p>
                        </div>
                    </div>

                    {/* Actions if On The Way */}
                    {delivery.status === 'On the way' && (
                        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                            <p className="text-xs text-center text-blue-300 font-bold mb-3">Did you receive the package?</p>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => onConfirm(delivery.id, 'Received')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex justify-center items-center gap-2">
                                    <CheckCircle size={16}/> Yes, Received
                                </button>
                                <button onClick={() => onConfirm(delivery.id, 'Not Received')} className="w-full bg-white/5 hover:bg-white/10 text-slate-300 py-3 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-2">
                                    Not Yet
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Final Status */}
                    {isDelivered && (
                        <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-2 text-emerald-400 shadow-inner">
                            <CheckCircle size={18}/> <span className="text-sm font-black uppercase tracking-widest">Delivered Successfully</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}