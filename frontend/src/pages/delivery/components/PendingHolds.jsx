import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Printer, Eye, ScanBarcode, AlertTriangle, ArrowLeft, Loader2, Check, Edit2, Save, X, BookOpen } from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';

export default function PendingHolds({ searchQuery }) {
    const [loading, setLoading] = useState(true);
    const [businesses, setBusinesses] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState(null);
    
    const [allDeliveries, setAllDeliveries] = useState([]); 
    const [deliveries, setDeliveries] = useState([]);
    const [activePayTab, setActivePayTab] = useState('All');

    // Business Logo 
    const getBizLogoUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') ? '/logo.png' : `${axios.defaults.baseURL.replace('/api', '')}/storage/icons/${imageName}`;

    useEffect(() => {
        fetchAllInitialData();
    }, []);

    const fetchAllInitialData = async () => {
        setLoading(true);
        try {
            const [bizRes, allDelRes] = await Promise.all([
                axios.get('/admin/businesses'),
                axios.get('/admin/delivery/pending') 
            ]);
            setBusinesses(bizRes.data?.data || bizRes.data || []);
            setAllDeliveries(allDelRes.data || []);
        } catch (error) {
            toast.error("Failed to load initial data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchDeliveriesForBiz = (bizId) => {
        setSelectedBiz(bizId);
        const bizDeliveries = allDeliveries.filter(d => d.businessId === bizId && d.status !== 'Delivered');
        setDeliveries(bizDeliveries);
        setActivePayTab('All'); 
    };

    const filteredDeliveries = deliveries.filter(order => {
        const matchesTab = activePayTab === 'All' || order.paymentType === activePayTab;
        const matchesSearch = order.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              order.id?.toString().includes(searchQuery.toLowerCase()) ||
                              order.phone?.includes(searchQuery);
        return matchesTab && matchesSearch;
    });

    const tabCounts = {
        All: deliveries.length,
        Full: deliveries.filter(d => d.paymentType === 'Full').length,
        Monthly: deliveries.filter(d => d.paymentType === 'Monthly').length,
        Installment: deliveries.filter(d => d.paymentType === 'Installment').length,
    };

    if (loading && !selectedBiz) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;

    return (
        <div className="animate-fade-in font-sans">
            {!selectedBiz ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {businesses.map(biz => {
                        const bizPendingCount = allDeliveries.filter(d => d.businessId === biz.id && d.status === 'Pending').length;

                        return (
                            <div 
                                key={biz.id} 
                                onClick={() => fetchDeliveriesForBiz(biz.id)}
                                className="relative bg-[#1e2336]/80 border border-white/10 hover:border-blue-500/50 p-8 rounded-3xl cursor-pointer transition-all shadow-xl flex flex-col items-center justify-center text-center group"
                            >
                                {bizPendingCount > 0 && (
                                    <span className="absolute -top-3 -right-3 animate-pulse bg-red-600 border-4 border-[#1e2336] text-white text-base font-black w-10 h-10 flex items-center justify-center rounded-full shadow-lg z-10">
                                        {bizPendingCount}
                                    </span>
                                )}

                                <div className="w-28 h-28 bg-white/5 rounded-2xl p-3 border border-white/10 group-hover:scale-105 transition-transform mb-4">
                                    <img 
                                        src={getBizLogoUrl(biz.logo)} 
                                        alt={biz.name} 
                                        onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} 
                                        className="w-full h-full object-contain drop-shadow-lg" 
                                    />
                                </div>
                                <h3 className="text-xl font-black text-white">{biz.name}</h3>
                                <p className="text-sm font-bold text-slate-400 mt-3 bg-black/40 px-4 py-1.5 rounded-full border border-white/5">Click to view {bizPendingCount} pending</p>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                        <button onClick={() => {setSelectedBiz(null); setDeliveries([]); fetchAllInitialData();}} className="text-base font-bold text-slate-400 hover:text-white flex items-center gap-2 bg-black/40 px-5 py-2.5 rounded-xl transition-colors shrink-0 self-start md:self-auto shadow-md">
                            <ArrowLeft size={18}/> Back to Businesses
                        </button>

                        <div className="flex flex-wrap gap-3 bg-black/40 p-2 rounded-2xl border border-white/5 w-full md:w-auto shadow-inner">
                            {['All', 'Full', 'Monthly', 'Installment'].map(tab => (
                                <button 
                                    key={tab} 
                                    onClick={() => setActivePayTab(tab)}
                                    className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activePayTab === tab ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    {tab} 
                                    <span className={`px-2.5 py-1 rounded-lg text-sm font-black ${activePayTab === tab ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-800 text-slate-300 border border-white/5'}`}>
                                        {tabCounts[tab]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredDeliveries.length === 0 ? (
                        <div className="text-center py-24 bg-[#1e2336]/40 rounded-3xl border border-white/5 shadow-inner">
                            <p className="text-slate-400 font-bold text-xl">No pending deliveries for this category.</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {filteredDeliveries.map(order => (
                                <OrderCard 
                                    key={order.id} 
                                    order={order} 
                                    onRefresh={() => fetchAllInitialData().then(() => fetchDeliveriesForBiz(selectedBiz))} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------- Order Card Component ----------------
function OrderCard({ order, onRefresh }) {
    const [barcode, setBarcode] = useState('');
    const [isHolding, setIsHolding] = useState(false);
    const [holdReason, setHoldReason] = useState('Out of Stock');
    const [isProcessing, setIsProcessing] = useState(false);
    const barcodeInputRef = useRef(null);

    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [tempName, setTempName] = useState(order.studentName);
    const [tempAddress, setTempAddress] = useState(order.address);
    const [tempPhone, setTempPhone] = useState(order.phone);

    const [holdRemark, setHoldRemark] = useState(() => {
        return localStorage.getItem(`draft_hold_remark_${order.id}`) || '';
    });

    // 🔥 URL Fixes: Tute covers in /courses, Lecturers in /icons 🔥
    const getTuteImgUrl = (imageName) => (!imageName || imageName === 'default-tute.png' || imageName === 'null') ? '/default-tute.png' : `${axios.defaults.baseURL.replace('/api', '')}/storage/courses/${imageName}`;
    const getLecImgUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') ? '/default.png' : `${axios.defaults.baseURL.replace('/api', '')}/storage/icons/${imageName}`;

    const handleRemarkChange = (e) => {
        const val = e.target.value;
        setHoldRemark(val);
        localStorage.setItem(`draft_hold_remark_${order.id}`, val);
    };

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
                            top: 9mm; /* Align Center */
                            left: 8mm; /* Align Left Margin */
                            width: 80mm;
                            display: flex;
                            flex-direction: column;
                            gap: 4px; /* Proper Spacing */
                        }
                        .text-item { 
                            font-size: 9pt; /* Normal Size */
                            font-weight: 750; /* Normal Bold (Not 900) */
                            text-transform: uppercase; 
                            line-height: 1.4;
                            color: black;
                        }
                        .ref-id {
                            position: absolute;
                            bottom: 3mm;
                            right: 5mm;
                            font-size: 8pt;
                            font-weight: bold;
                            color: black;
                        }
                    </style>
                </head>
                <body>
                    <div class="label-container">
                        <div class="details-block">
                            <div class="text-item">${tempName}</div>
                            <div class="text-item">${tempAddress}</div>
                            <div class="text-item">${tempPhone}</div>
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
                if(barcodeInputRef.current) barcodeInputRef.current.focus();
            }, 500);
        }
    };

    const handlePack = async (e) => {
        if (e && e.key !== 'Enter') return;
        if (!barcode.trim()) return toast.error("Please scan or enter tracking number.");
        
        setIsProcessing(true);
        try {
            await axios.post('/admin/delivery/pack', { deliveryId: order.id, trackingNumber: barcode });
            toast.success("Packed & Stock Deducted!");
            onRefresh(); 
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
            localStorage.removeItem(`draft_hold_remark_${order.id}`); 
            setIsHolding(false);
            onRefresh();
        } catch (error) {
            toast.error("Failed to hold order.");
        } finally {
            setIsProcessing(false);
        }
    };

    const cancelEdit = () => {
        setTempName(order.studentName);
        setTempAddress(order.address);
        setTempPhone(order.phone);
        setIsEditingInfo(false);
    };

    return (
        <div className="bg-[#1e2336]/90 border border-white/10 p-6 rounded-3xl flex flex-col xl:flex-row items-start justify-between gap-6 transition-all shadow-xl hover:border-blue-500/30">
            <div className="flex-1 w-full">
                
                {/* 1. Student Info Section */}
                <div className="flex gap-5 items-start border-b border-white/10 pb-5 mb-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mt-1 shadow-inner">
                        <MapPin size={28} strokeWidth={2}/>
                    </div>
                    <div className="flex-1">
                        {!isEditingInfo ? (
                            <div className="relative group">
                                <h4 className="font-black text-2xl text-white flex flex-wrap items-center gap-3">
                                    {tempName} 
                                    <span className="text-xs font-black text-slate-300 bg-black/50 px-3 py-1 rounded-md border border-white/10 tracking-widest uppercase shadow-sm">{order.paymentType}</span>
                                    <span className="text-xs font-black text-blue-300 bg-blue-500/20 px-3 py-1 rounded-md border border-blue-500/30 uppercase tracking-widest shadow-sm">BATCH: {order.batchName}</span>
                                    
                                    {order.status === 'Delivered' && (
                                         <span className="text-xs font-black bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-md border border-indigo-500/30 uppercase shadow-sm">Self-Picked</span>
                                    )}
                                </h4>
                                <p className="text-base text-slate-300 mt-2 leading-relaxed w-11/12 font-medium bg-black/20 p-2 rounded-lg border border-white/5 inline-block">{tempAddress} • <span className="text-emerald-400 font-bold">{tempPhone}</span></p>
                                
                                <button onClick={() => setIsEditingInfo(true)} title="Edit Details for Sticker" className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-500 transition-all shadow-lg">
                                    <Edit2 size={18}/>
                                </button>
                            </div>
                        ) : (
                            <div className="bg-black/40 p-4 rounded-2xl border border-blue-500/50 shadow-inner">
                                <h4 className="text-xs text-blue-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Edit2 size={14}/> Edit Details for Sticker</h4>
                                <div className="space-y-3">
                                    <input type="text" value={tempName} onChange={(e)=>setTempName(e.target.value)} className="w-full bg-[#0f172a] text-sm text-white p-3 border border-slate-600 rounded-xl outline-none focus:border-blue-500 font-bold" placeholder="Student Name"/>
                                    <input type="text" value={tempPhone} onChange={(e)=>setTempPhone(e.target.value)} className="w-full bg-[#0f172a] text-sm text-white p-3 border border-slate-600 rounded-xl outline-none focus:border-blue-500 font-bold" placeholder="Phone Number"/>
                                    <textarea value={tempAddress} onChange={(e)=>setTempAddress(e.target.value)} className="w-full bg-[#0f172a] text-sm text-white p-3 border border-slate-600 rounded-xl outline-none focus:border-blue-500 resize-none h-20 font-medium" placeholder="Address"></textarea>
                                </div>
                                <div className="flex gap-3 mt-3">
                                    <button onClick={() => setIsEditingInfo(false)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg"><Save size={16}/> Save Edit</button>
                                    <button onClick={cancelEdit} className="px-5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl flex justify-center items-center font-bold"><X size={18}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Enrolled Subjects / Tutes Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {order.items?.map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-black/40 border border-white/5 p-3.5 rounded-2xl shadow-inner">
                            <div className="flex items-center gap-4 min-w-0">
                                {/* 🔥 Tute Image with correct fallback 🔥 */}
                                <img 
                                    src={getTuteImgUrl(item.tuteCover)} 
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/default-tute.png'; }} 
                                    className="w-12 h-16 object-cover rounded-lg border border-slate-700 shrink-0 shadow-md bg-slate-800" 
                                    alt="Tute"
                                />
                                <div className="flex-1 min-w-0">
                                    <h5 className="text-[14px] font-black text-white truncate tracking-wide flex items-center gap-2 mb-1">
                                        <BookOpen size={14} className="text-blue-400 shrink-0"/>{item.tuteName}
                                    </h5>
                                    <p className="text-[11px] font-bold text-slate-400 truncate bg-white/5 inline-block px-2 py-0.5 rounded">{item.courseName}</p>
                                    <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest truncate mt-1.5">{item.lecturerName}</p>
                                </div>
                            </div>

                            {/* 🔥 Lecturer Image Moved to Right side & made bigger 🔥 */}
                            <div className="shrink-0 pl-3 border-l border-white/10 ml-3">
                                <img 
                                    src={getLecImgUrl(item.lecturerImage)} 
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/default.png'; }} 
                                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-600 bg-white/5 shadow-md" 
                                    alt="Lecturer"
                                    title={item.lecturerName}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* 3. Action Section (Print, Barcode, Hold) */}
            <div className="flex flex-col items-stretch w-full xl:w-[350px] shrink-0 bg-black/30 p-5 rounded-3xl border border-white/5 gap-5 shadow-inner">
                
                {/* Print Buttons */}
                <div className="flex gap-3">
                    <button onClick={() => handleLabelAction(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-slate-200 font-black py-4 px-4 rounded-2xl transition-all text-sm border border-white/10 shadow-md flex items-center justify-center gap-2" title="Preview Sticker">
                        <Eye size={18}/> View
                    </button>
                    <button onClick={() => handleLabelAction(true)} className="flex-[2] bg-slate-700 hover:bg-slate-600 text-white font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 border border-slate-500">
                        <Printer size={18}/> Print
                    </button>
                </div>

                {/* Pack / Barcode Section */}
                <div className="relative">
                    <ScanBarcode size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input 
                        ref={barcodeInputRef}
                        type="text" 
                        placeholder="Scan Barcode here..." 
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyDown={handlePack}
                        className="w-full bg-black/60 border-2 border-emerald-500/40 rounded-2xl pl-12 pr-4 py-4 text-base text-emerald-400 font-black outline-none focus:border-emerald-500 placeholder:text-slate-600 uppercase tracking-widest text-center shadow-inner"
                    />
                </div>
                <button disabled={isProcessing} onClick={() => handlePack()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-widest shadow-xl flex justify-center items-center gap-2 border border-emerald-500/50">
                    {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <Check size={20}/>} Mark as Packed
                </button>

                {/* Hold Button */}
                <button onClick={() => setIsHolding(true)} className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-widest border-2 border-orange-500/30 shadow-md flex justify-center items-center gap-2">
                    <AlertTriangle size={18}/> Hold Order
                </button>
            </div>

            {/* Hold Modal */}
            {isHolding && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-[#15192b] border border-orange-500/30 rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-orange-400 flex items-center gap-3 mb-4"><AlertTriangle size={28}/> Hold Delivery</h3>
                        <p className="text-base font-medium text-slate-400 mb-6 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">Holding this will immediately notify the student on their dashboard.</p>
                        
                        <label className="text-sm font-black text-slate-300 uppercase tracking-widest mb-2 block">Select Reason</label>
                        <select value={holdReason} onChange={(e) => setHoldReason(e.target.value)} className="w-full bg-black/50 border-2 border-white/10 rounded-2xl p-4 text-white mb-5 outline-none focus:border-orange-500 text-base font-bold shadow-inner">
                            <option value="Out of Stock">Tute Out of Stock</option>
                            <option value="Address Issue">Address Missing / Issue</option>
                            <option value="Payment Verification">Payment Verification Failed</option>
                            <option value="Other">Other</option>
                        </select>

                        {holdReason === 'Other' && (
                            <textarea 
                                value={holdRemark} 
                                onChange={handleRemarkChange} 
                                placeholder="Type reason here... (Draft saves automatically)" 
                                rows="3" 
                                className="w-full bg-black/50 border-2 border-white/10 rounded-2xl p-4 text-base text-white outline-none focus:border-orange-500 mb-5 resize-none placeholder:text-slate-600 font-medium shadow-inner"
                            ></textarea>
                        )}

                        <div className="flex gap-4 mt-4">
                            <button onClick={() => setIsHolding(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-300 font-black transition-all text-base border border-white/10">Cancel</button>
                            <button disabled={isProcessing} onClick={submitHold} className="flex-[1.5] bg-orange-600 hover:bg-orange-500 text-white rounded-2xl py-4 font-black transition-all shadow-xl shadow-orange-600/20 text-base flex justify-center items-center gap-2 border border-orange-500">
                                {isProcessing ? <Loader2 size={20} className="animate-spin"/> : "Confirm Hold"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}