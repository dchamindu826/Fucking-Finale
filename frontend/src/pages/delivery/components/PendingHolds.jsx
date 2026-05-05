import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Truck, MapPin, Printer, Eye, ScanBarcode, AlertTriangle, ArrowLeft, Loader2, Check } from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';

export default function PendingHolds({ searchQuery }) {
    const [loading, setLoading] = useState(true);
    const [businesses, setBusinesses] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState(null);
    const [deliveries, setDeliveries] = useState([]);
    
    // Payment Type Tab (Full, Monthly, Installment)
    const [activePayTab, setActivePayTab] = useState('Full');

    // Fetch initial data (Businesses that have pending deliveries)
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch businesses (You might already have this endpoint)
                const bizRes = await axios.get('/admin/businesses');
                setBusinesses(bizRes.data || []);
            } catch (error) {
                toast.error("Failed to load businesses.");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const fetchDeliveriesForBiz = async (bizId) => {
        setLoading(true);
        try {
            const res = await axios.get(`/admin/delivery/pending?businessId=${bizId}`);
            setDeliveries(res.data || []);
            setSelectedBiz(bizId);
        } catch (error) {
            toast.error("Failed to load deliveries.");
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredDeliveries = deliveries.filter(order => {
        // Tab Match (Assuming your backend sends a paymentType field)
        const matchesTab = order.paymentType === activePayTab || activePayTab === 'All';
        // Search Match
        const matchesSearch = order.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              order.id?.toString().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    if (loading && !selectedBiz) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;

    return (
        <div className="animate-fade-in">
            {/* Step 1: Select Business (Business Cards) */}
            {!selectedBiz ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {businesses.map(biz => (
                        <div 
                            key={biz.id} 
                            onClick={() => fetchDeliveriesForBiz(biz.id)}
                            className="bg-[#1e2336]/80 border border-white/10 hover:border-blue-500/50 p-6 rounded-2xl cursor-pointer transition-all shadow-lg flex flex-col items-center justify-center text-center group"
                        >
                            <img src={`https://imacampus.online/storage/business/${biz.logo}`} alt={biz.name} onError={(e)=>e.target.src='/logo.png'} className="w-20 h-20 object-contain mb-4 group-hover:scale-110 transition-transform" />
                            <h3 className="text-lg font-black text-white">{biz.name}</h3>
                            <p className="text-xs text-slate-400 mt-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">Click to view pending</p>
                        </div>
                    ))}
                </div>
            ) : (
                /* Step 2: Active Dispatch Dashboard */
                <div>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <button onClick={() => {setSelectedBiz(null); setDeliveries([]);}} className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl transition-colors">
                            <ArrowLeft size={16}/> Back to Businesses
                        </button>

                        <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                            {['Full', 'Monthly', 'Installment', 'All'].map(tab => (
                                <button 
                                    key={tab} 
                                    onClick={() => setActivePayTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activePayTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>
                    ) : filteredDeliveries.length === 0 ? (
                        <div className="text-center py-20 bg-[#1e2336]/40 rounded-2xl border border-white/5">
                            <p className="text-slate-500 font-bold text-lg">No pending deliveries for this category.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredDeliveries.map(order => (
                                <OrderCard 
                                    key={order.id} 
                                    order={order} 
                                    onRefresh={() => fetchDeliveriesForBiz(selectedBiz)} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------- Order Card (POS Functionality) ----------------
function OrderCard({ order, onRefresh }) {
    const [barcode, setBarcode] = useState('');
    const [isHolding, setIsHolding] = useState(false);
    const [holdReason, setHoldReason] = useState('Out of Stock');
    const [holdRemark, setHoldRemark] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const barcodeInputRef = useRef(null);

    // 🔥 FORMAT PRESERVED EXACTLY AS YOU DESIGNED IT 🔥
    const FONT_SIZE = "9pt";   
    const TOP_MARGIN = "10mm";  
    const LEFT_MARGIN = "05mm"; 

    const handleLabelAction = (isPrint = true) => {
        const baseUrl = window.location.origin; 
        const bgImageUrl = `${baseUrl}/sticker-bg.png`; 
        const windowPrint = window.open('', '', 'width=850,height=500');
        
        windowPrint.document.write(`
            <html>
                <head>
                    <title>${isPrint ? 'Print' : 'Preview'} Label - ${order.id}</title>
                    <style>
                        @page { size: 4in 2in; margin: 0; }
                        body { 
                            font-family: 'Arial', sans-serif; 
                            margin: 0; padding: 0;
                            width: 4in; height: 2in; 
                            -webkit-print-color-adjust: exact !important; 
                        }
                        .label-container {
                            width: 100%; height: 100%;
                            background-image: url('${bgImageUrl}');
                            background-size: 100% 100%;
                            background-repeat: no-repeat;
                            position: relative;
                        }
                        .details-block {
                            position: absolute;
                            top: ${TOP_MARGIN};
                            left: ${LEFT_MARGIN};
                            width: 80mm;
                            display: flex;
                            flex-direction: column;
                            gap: 2px;
                        }
                        .text-item { 
                            font-size: ${FONT_SIZE}; 
                            font-weight: 900; 
                            text-transform: uppercase; 
                            line-height: 1.2;
                            color: black;
                        }
                        .ref-id {
                            position: absolute;
                            bottom: 3mm;
                            right: 5mm;
                            font-size: 8pt;
                            font-weight: 900;
                            color: black;
                        }
                    </style>
                </head>
                <body>
                    <div class="label-container">
                        <div class="details-block">
                            <div class="text-item">${order.studentName}</div>
                            <div class="text-item">${order.address}</div>
                            <div class="text-item">${order.phone}</div>
                        </div>
                        <div class="ref-id">REF: ${order.id}</div>
                    </div>
                </body>
            </html>
        `);
        windowPrint.document.close();
        windowPrint.focus();
        
        if (isPrint) {
            setTimeout(() => { 
                windowPrint.print(); 
                windowPrint.close(); 
                // Auto focus barcode input after print dialog closes
                if(barcodeInputRef.current) barcodeInputRef.current.focus();
            }, 500);
        }
    };

    // POS Style Pack Submission
    const handlePack = async (e) => {
        // If triggered via 'Enter' key on Barcode scanner
        if (e && e.key !== 'Enter') return;
        if (!barcode.trim()) return toast.error("Please scan or enter tracking number.");
        
        setIsProcessing(true);
        try {
            await axios.post('/admin/delivery/pack', { deliveryId: order.id, trackingNumber: barcode });
            toast.success("Packed & Stock Deducted!");
            onRefresh(); // Refresh list to remove it
        } catch (error) {
            toast.error("Failed to update status.");
        } finally {
            setIsProcessing(false);
        }
    };

    const submitHold = async () => {
        setIsProcessing(true);
        try {
            await axios.post('/admin/delivery/hold', { 
                deliveryId: order.id, 
                reason: holdReason, 
                remark: holdRemark 
            });
            toast.success("Order Placed on Hold.");
            setIsHolding(false);
            onRefresh();
        } catch (error) {
            toast.error("Failed to hold order.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-[#1e2336]/80 border border-white/5 p-5 rounded-2xl flex flex-col xl:flex-row items-start justify-between gap-6 transition-all shadow-lg hover:border-white/10">
            
            {/* Student & Tute Details */}
            <div className="flex-1 w-full flex gap-4 items-start">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 mt-1">
                    <MapPin size={22} strokeWidth={1.5}/>
                </div>
                <div>
                    <h4 className="font-bold text-lg text-white flex items-center gap-3">
                        {order.studentName} 
                        <span className="text-[10px] font-bold text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/10 tracking-widest uppercase">{order.paymentType}</span>
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">{order.address} • {order.phone}</p>
                    
                    {/* Tutes to pack */}
                    <div className="mt-3 flex flex-wrap gap-2">
                        {order.items?.map((item, i) => (
                            <span key={i} className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-3 py-1 rounded border border-blue-500/20 uppercase tracking-widest">
                                {item.tuteName}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* POS Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                    <button onClick={() => handleLabelAction(false)} className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3 px-4 rounded-xl transition-all text-xs border border-white/10" title="Preview Sticker">
                        <Eye size={16}/>
                    </button>
                    <button onClick={() => handleLabelAction(true)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 border border-slate-500">
                        <Printer size={16}/> Print
                    </button>
                </div>

                <div className="h-full w-px bg-white/10 hidden sm:block mx-2"></div>

                <div className="flex items-center gap-2 w-full">
                    <div className="relative flex-1">
                        <ScanBarcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                        <input 
                            ref={barcodeInputRef}
                            type="text" 
                            placeholder="Scan Barcode..." 
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                            onKeyDown={handlePack}
                            className="w-full bg-black/40 border border-emerald-500/30 rounded-xl pl-9 pr-3 py-3 text-sm text-emerald-400 font-bold outline-none focus:border-emerald-500 placeholder:text-slate-600 uppercase tracking-widest"
                        />
                    </div>
                    <button disabled={isProcessing} onClick={() => handlePack()} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-6 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex items-center gap-2">
                        {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>} Pack
                    </button>
                </div>

                <button onClick={() => setIsHolding(true)} className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold py-3 px-4 rounded-xl transition-all text-xs uppercase tracking-widest border border-orange-500/20 shadow-lg shrink-0">
                    Hold
                </button>
            </div>

            {/* Hold Modal */}
            {isHolding && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-[#15192b] border border-orange-500/20 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-black text-orange-400 flex items-center gap-2 mb-4"><AlertTriangle size={20}/> Hold Delivery</h3>
                        <p className="text-sm text-slate-400 mb-6">Holding this will notify the student on their dashboard.</p>
                        
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Reason</label>
                        <select value={holdReason} onChange={(e) => setHoldReason(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white mb-4 outline-none focus:border-orange-500 text-sm font-bold">
                            <option value="Out of Stock">Tute Out of Stock</option>
                            <option value="Address Issue">Address Missing / Issue</option>
                            <option value="Payment Verification">Payment Verification Failed</option>
                            <option value="Other">Other</option>
                        </select>

                        {holdReason === 'Other' && (
                            <textarea 
                                value={holdRemark} 
                                onChange={(e) => setHoldRemark(e.target.value)} 
                                placeholder="Type reason here..." 
                                rows="3" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500 mb-4 resize-none"
                            ></textarea>
                        )}

                        <div className="flex gap-3 mt-2">
                            <button onClick={() => setIsHolding(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 font-bold transition-all text-sm">Cancel</button>
                            <button disabled={isProcessing} onClick={submitHold} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-xl py-3 font-black transition-all shadow-lg shadow-orange-600/20 text-sm flex justify-center items-center gap-2">
                                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : "Confirm Hold"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}