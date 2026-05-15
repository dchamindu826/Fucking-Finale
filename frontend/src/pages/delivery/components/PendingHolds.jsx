import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Printer, Eye, ScanBarcode, AlertTriangle, ArrowLeft, Loader2, Check, Edit2, Save, X, BookOpen, Clock } from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';

// SMART IMAGE COMPONENT FOR PENDING ITEMS
const DeliveryItemImage = ({ coverName }) => {
    const [imgSrc, setImgSrc] = useState(null);
    const [errorStage, setErrorStage] = useState(0);

    useEffect(() => {
        if (!coverName || coverName === 'default-tute.png' || coverName === 'null') {
            setImgSrc(null);
        } else {
            const baseUrl = axios.defaults.baseURL.replace('/api', '');
            setImgSrc(`${baseUrl}/storage/documents/${coverName}`);
        }
    }, [coverName]);

    const handleError = () => {
        if (errorStage === 0 && imgSrc) {
            setImgSrc(imgSrc.replace('/storage/documents/', '/storage/images/'));
            setErrorStage(1);
        } else if (errorStage === 1 && imgSrc) {
            setImgSrc(imgSrc.replace('/storage/images/', '/storage/icons/'));
            setErrorStage(2);
        } else {
            setImgSrc(null);
        }
    };

    if (!imgSrc) {
        return <span className="text-[10px] text-gray-500 dark:text-slate-500 font-medium whitespace-nowrap text-center px-1">No Cover</span>;
    }

    return <img src={imgSrc} onError={handleError} alt="Cover" className="w-full h-full object-cover" />;
};

export default function PendingHolds({ searchQuery }) {
    const [loading, setLoading] = useState(true);
    const [businesses, setBusinesses] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState(null);
    
    const [allDeliveries, setAllDeliveries] = useState([]); 
    const [deliveries, setDeliveries] = useState([]);
    const [activePayTab, setActivePayTab] = useState('All');
    
    const [viewType, setViewType] = useState('Pending'); 

    const getBizLogoUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') ? '/logo.png' : `${axios.defaults.baseURL.replace('/api', '')}/storage/icons/${imageName}`;

    useEffect(() => {
        fetchAllInitialData();
    }, []);

    useEffect(() => {
        if (selectedBiz) {
            fetchDeliveriesForBiz(selectedBiz);
        }
    }, [viewType, allDeliveries]);

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
        const bizDeliveries = allDeliveries.filter(d => d.businessId === bizId && d.status === viewType);
        setDeliveries(bizDeliveries);
        setActivePayTab('All'); 
    };

    const processedDeliveries = useMemo(() => {
        const counts = {};
        deliveries.forEach(d => {
            const key = d.phone ? d.phone.trim() : d.studentName?.trim();
            if(key) counts[key] = (counts[key] || 0) + 1;
        });

        const sorted = [...deliveries].sort((a, b) => {
            const nameA = a.studentName || '';
            const nameB = b.studentName || '';
            return nameA.localeCompare(nameB);
        });

        return sorted.map(d => {
            const key = d.phone ? d.phone.trim() : d.studentName?.trim();
            return {
                ...d,
                isMix: counts[key] > 1 
            };
        });
    }, [deliveries]);

    const filteredDeliveries = processedDeliveries.filter(order => {
        let matchesTab = false;
        
        if (activePayTab === 'All') {
            matchesTab = true;
        } else if (order.isMix) {
            matchesTab = false; 
        } else {
            matchesTab = order.paymentType === activePayTab;
        }

        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = order.studentName?.toLowerCase().includes(searchLower) || 
                              order.id?.toString().includes(searchLower) ||
                              order.phone?.includes(searchQuery);
        return matchesTab && matchesSearch;
    });

    const tabCounts = {
        All: processedDeliveries.length,
        Monthly: processedDeliveries.filter(d => !d.isMix && d.paymentType === 'Monthly').length,
        Full: processedDeliveries.filter(d => !d.isMix && d.paymentType === 'Full').length,
        Installment: processedDeliveries.filter(d => !d.isMix && d.paymentType === 'Installment').length,
    };

    if (loading && !selectedBiz) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-accent" size={40}/></div>;

    return (
        <div className="animate-fade-in font-sans">
            
            {!selectedBiz && (
                <div className="flex gap-4 mb-8 bg-gray-50 dark:bg-brand-darkCard p-2 rounded-2xl border border-gray-200 dark:border-brand-darkBorder w-max shadow-sm transition-colors">
                    <button
                        onClick={() => { setViewType('Pending'); setSelectedBiz(null); }}
                        className={`px-8 py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all flex items-center gap-2 ${viewType === 'Pending' ? 'bg-brand-accent text-white shadow-md scale-105' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-brand-darkHover/60'}`}
                    >
                        <Clock size={18}/> Pending Orders
                    </button>
                    <button
                        onClick={() => { setViewType('Hold'); setSelectedBiz(null); }}
                        className={`px-8 py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all flex items-center gap-2 ${viewType === 'Hold' ? 'bg-orange-500 text-white shadow-md scale-105' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-brand-darkHover/60'}`}
                    >
                        <AlertTriangle size={18}/> On Hold Orders
                    </button>
                </div>
            )}

            {!selectedBiz ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {businesses.map(biz => {
                        const bizStatusCount = allDeliveries.filter(d => d.businessId === biz.id && d.status === viewType).length;

                        return (
                            <div 
                                key={biz.id} 
                                onClick={() => fetchDeliveriesForBiz(biz.id)}
                                className={`relative bg-white dark:bg-brand-darkCard border p-8 rounded-3xl cursor-pointer transition-all shadow-sm flex flex-col items-center justify-center text-center group ${viewType === 'Hold' ? 'border-gray-200 dark:border-orange-500/20 hover:border-orange-500 dark:hover:border-orange-500/50 hover:shadow-md' : 'border-gray-200 dark:border-brand-darkBorder hover:border-brand-accent/50 dark:hover:border-brand-accent/50 hover:shadow-md'}`}
                            >
                                {bizStatusCount > 0 && (
                                    <span className={`absolute -top-3 -right-3 animate-pulse border-4 border-white dark:border-brand-darkCard text-white text-base font-black w-10 h-10 flex items-center justify-center rounded-full shadow-lg z-10 ${viewType === 'Hold' ? 'bg-orange-500' : 'bg-brand-accent'}`}>
                                        {bizStatusCount}
                                    </span>
                                )}

                                <div className="w-28 h-28 bg-gray-50 dark:bg-brand-darkBg rounded-2xl p-3 border border-gray-100 dark:border-brand-darkBorder group-hover:scale-105 transition-transform mb-4 shadow-sm">
                                    <img 
                                        src={getBizLogoUrl(biz.logo)} 
                                        alt={biz.name} 
                                        onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} 
                                        className="w-full h-full object-contain drop-shadow-sm dark:drop-shadow-lg" 
                                    />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white transition-colors">{biz.name}</h3>
                                <p className={`text-sm font-bold mt-3 px-4 py-1.5 rounded-full border transition-colors ${viewType === 'Hold' ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20' : 'bg-gray-100 dark:bg-brand-darkHover text-gray-600 dark:text-gray-400 border-gray-200 dark:border-brand-darkBorder'}`}>
                                    Click to view {bizStatusCount} {viewType.toLowerCase()}
                                </p>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                        <button onClick={() => {setSelectedBiz(null); setDeliveries([]); fetchAllInitialData();}} className="text-base font-bold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder px-5 py-2.5 rounded-xl transition-colors shrink-0 self-start md:self-auto shadow-sm">
                            <ArrowLeft size={18}/> Back to Businesses
                        </button>

                        <div className="flex flex-wrap gap-3 bg-white dark:bg-brand-darkCard p-2 rounded-2xl border border-gray-200 dark:border-brand-darkBorder w-full md:w-auto shadow-sm transition-colors">
                            {['All', 'Monthly', 'Full', 'Installment'].map(tab => (
                                <button 
                                    key={tab} 
                                    onClick={() => setActivePayTab(tab)}
                                    className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activePayTab === tab ? 'bg-brand-accent text-white shadow-md scale-105' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-brand-darkHover/60'}`}
                                >
                                    {tab} 
                                    <span className={`px-2.5 py-1 rounded-lg text-sm font-black transition-colors ${activePayTab === tab ? 'bg-white/20 text-white shadow-inner' : 'bg-gray-200 dark:bg-brand-darkBg text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-brand-darkBorder'}`}>
                                        {tabCounts[tab]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredDeliveries.length === 0 ? (
                        <div className="text-center py-24 bg-gray-50 dark:bg-brand-darkCard rounded-3xl border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors">
                            <p className="text-gray-500 dark:text-slate-400 font-bold text-xl">No {viewType.toLowerCase()} deliveries for this category.</p>
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
                        @page { size: 2in 4in; margin: 0; }
                        body { 
                            font-family: 'Arial', sans-serif; 
                            margin: 0; padding: 0;
                            width: 2in; height: 4in; 
                            -webkit-print-color-adjust: exact !important; 
                        }
                        .label-container {
                            width: 2in; 
                            height: 4in;
                            background-image: url('${bgImageUrl}');
                            background-size: 100% 100%;
                            background-repeat: no-repeat;
                            position: relative;
                            overflow: hidden;
                        }
                        .content-wrapper {
                            position: absolute;
                            width: 4in;
                            height: 2in;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%) rotate(-90deg);
                        }
                        .details-block {
                            position: absolute;
                            top: 5mm; 
                            left: 8mm; 
                            width: 80mm;
                            display: flex;
                            flex-direction: column;
                            gap: 4px; 
                        }
                        .text-item { 
                            font-size: 9pt; 
                            font-weight: bold; 
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
                        <div class="content-wrapper">
                            <div class="details-block">
                                <div class="text-item">${tempName}</div>
                                <div class="text-item">${tempAddress}</div>
                                <div class="text-item">${tempPhone}</div>
                            </div>
                            <div class="ref-id">REF: ${order.id}</div>
                        </div>
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

    // DYNAMIC CARD & BADGE STYLING SUPPORTING LIGHT/DARK MODE
    let cardStyle = 'bg-white dark:bg-brand-darkCard border-gray-200 dark:border-brand-darkBorder hover:border-brand-accent/30 dark:hover:border-brand-accent/30'; 
    let typeBadgeStyle = 'bg-gray-100 dark:bg-black/50 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-white/10';

    if (order.status === 'Hold') {
        cardStyle = 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-500/40 hover:border-orange-300 dark:hover:border-orange-500/60';
        typeBadgeStyle = 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 border-orange-200 dark:border-orange-500/30';
    } else if (order.isMix) {
        cardStyle = 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/40 hover:border-rose-300 dark:hover:border-rose-500/60 shadow-[inset_0_0_20px_rgba(225,29,72,0.02)] dark:shadow-[inset_0_0_20px_rgba(225,29,72,0.05)]';
        typeBadgeStyle = 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-500/40 shadow-[0_0_10px_rgba(225,29,72,0.1)] dark:shadow-[0_0_10px_rgba(225,29,72,0.2)]';
    } else if (order.paymentType === 'Monthly') {
        cardStyle = 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-500/30 hover:border-blue-300 dark:hover:border-blue-500/50';
        typeBadgeStyle = 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';
    } else if (order.paymentType === 'Full') {
        cardStyle = 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-300 dark:hover:border-emerald-500/50';
        typeBadgeStyle = 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
    } else if (order.paymentType === 'Installment') {
        cardStyle = 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-500/30 hover:border-purple-300 dark:hover:border-purple-500/50';
        typeBadgeStyle = 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-500/30';
    }

    return (
        <div className={`border p-6 rounded-3xl flex flex-col xl:flex-row items-start justify-between gap-6 transition-all shadow-sm dark:shadow-md ${cardStyle}`}>
            <div className="flex-1 w-full">
                
                {/* 1. Student Info Section */}
                <div className="flex gap-5 items-start border-b border-gray-200 dark:border-white/10 pb-5 mb-5 transition-colors">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 mt-1 shadow-inner ${order.status === 'Hold' ? 'border-orange-300 dark:border-orange-500/30 bg-orange-100 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400' : 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'}`}>
                        {order.status === 'Hold' ? <AlertTriangle size={28} strokeWidth={2}/> : <MapPin size={28} strokeWidth={2}/>}
                    </div>
                    <div className="flex-1 w-full">
                        {!isEditingInfo ? (
                            <div className="relative group w-full">
                               <h4 className="font-black text-2xl text-gray-900 dark:text-white flex flex-wrap items-center gap-3 transition-colors">
                                    {tempName} 
                                    <span className={`text-xs font-black px-3 py-1 rounded-md border tracking-widest uppercase shadow-sm flex items-center gap-1.5 transition-colors ${typeBadgeStyle}`}>
                                        {order.isMix ? `MIXED ORDER • ${order.paymentType}` : order.paymentType}
                                    </span>
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 px-3 py-1 rounded-md border border-blue-200 dark:border-blue-500/30 uppercase tracking-widest shadow-sm transition-colors">BATCH: {order.batchName}</span>
                                </h4>
                                <p className="text-base text-gray-600 dark:text-slate-300 mt-2 leading-relaxed w-11/12 font-medium bg-gray-50 dark:bg-black/20 p-2 rounded-lg border border-gray-200 dark:border-white/5 inline-block transition-colors">{tempAddress} • <span className="text-emerald-600 dark:text-emerald-400 font-bold">{tempPhone}</span></p>
                                
                                {order.status === 'Hold' && (
                                    <div className="mt-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-3.5 rounded-xl shadow-inner inline-block w-full transition-colors">
                                        <h5 className="text-orange-600 dark:text-orange-400 font-bold text-sm flex items-center gap-2"><AlertTriangle size={18}/> Delivery On Hold</h5>
                                        <div className="mt-2 ml-6 text-xs text-orange-700 dark:text-orange-200 font-medium">
                                            <p><span className="text-orange-600 dark:text-orange-400/80 font-bold">Reason:</span> {order.holdReason}</p>
                                            {order.holdRemark && <p className="mt-1"><span className="text-orange-600 dark:text-orange-400/80 font-bold">Remark:</span> {order.holdRemark}</p>}
                                        </div>
                                    </div>
                                )}

                                <button onClick={() => setIsEditingInfo(true)} title="Edit Details for Sticker" className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-brand-accent text-white p-2.5 rounded-xl hover:bg-brand-accentHover transition-all shadow-md">
                                    <Edit2 size={18}/>
                                </button>
                            </div>
                        ) : (
                            <div className="bg-gray-50 dark:bg-black/40 p-4 rounded-2xl border border-brand-accent/50 shadow-inner transition-colors">
                                <h4 className="text-xs text-brand-accent font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Edit2 size={14}/> Edit Details for Sticker</h4>
                                <div className="space-y-3">
                                    <input type="text" value={tempName} onChange={(e)=>setTempName(e.target.value)} className="w-full bg-white dark:bg-[#0f172a] text-sm text-gray-900 dark:text-white p-3 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:border-brand-accent dark:focus:border-brand-accent font-bold transition-colors" placeholder="Student Name"/>
                                    <input type="text" value={tempPhone} onChange={(e)=>setTempPhone(e.target.value)} className="w-full bg-white dark:bg-[#0f172a] text-sm text-gray-900 dark:text-white p-3 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:border-brand-accent dark:focus:border-brand-accent font-bold transition-colors" placeholder="Phone Number"/>
                                    <textarea value={tempAddress} onChange={(e)=>setTempAddress(e.target.value)} className="w-full bg-white dark:bg-[#0f172a] text-sm text-gray-900 dark:text-white p-3 border border-gray-300 dark:border-slate-600 rounded-xl outline-none focus:border-brand-accent dark:focus:border-brand-accent resize-none h-20 font-medium transition-colors" placeholder="Address"></textarea>
                                </div>
                                <div className="flex gap-3 mt-3">
                                    <button onClick={() => setIsEditingInfo(false)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black py-3 rounded-xl flex justify-center items-center gap-2 shadow-md transition-colors"><Save size={16}/> Save Edit</button>
                                    <button onClick={cancelEdit} className="px-5 bg-gray-500 dark:bg-slate-700 hover:bg-gray-600 dark:hover:bg-slate-600 text-white rounded-xl flex justify-center items-center font-bold transition-colors"><X size={18}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Enrolled Subjects Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {order.items?.map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder p-3.5 rounded-2xl shadow-sm transition-colors">
                            <div className="flex items-center gap-4 min-w-0">
                                
                                {/* IMAGE ZOOM HOVER EFFECT */}
                                <div className="shrink-0 w-12 h-16 bg-gray-100 dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-lg flex items-center justify-center overflow-hidden shadow-sm relative z-10 hover:z-50 transition-all duration-300 hover:scale-[2.5] hover:translate-x-4 hover:-translate-y-2 origin-left cursor-zoom-in">
                                    <DeliveryItemImage coverName={item.tuteCover} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h5 className="text-[14px] font-black text-gray-900 dark:text-white truncate tracking-wide flex items-center gap-2 mb-1 transition-colors">
                                        <BookOpen size={14} className="text-brand-accent shrink-0"/>{item.tuteName}
                                    </h5>
                                    <p className="text-[11px] font-bold text-gray-600 dark:text-slate-400 truncate bg-gray-200 dark:bg-white/5 inline-block px-2 py-0.5 rounded transition-colors">{item.courseName}</p>
                                    <p className="text-[10px] font-black text-brand-accent dark:text-brand-accent uppercase tracking-widest truncate mt-1.5 transition-colors">{item.lecturerName}</p>
                                </div>
                            </div>

                            <div className="shrink-0 pl-3 border-l border-gray-200 dark:border-brand-darkBorder ml-3 transition-colors">
                                <img 
                                    src={getLecImgUrl(item.lecturerImage)} 
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/default.png'; }} 
                                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-brand-darkBorder bg-gray-100 dark:bg-brand-darkBg shadow-sm transition-colors" 
                                    alt="Lecturer"
                                    title={item.lecturerName}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* 3. Action Section (Print, Barcode, Hold) */}
            <div className="flex flex-col items-stretch w-full xl:w-[350px] shrink-0 bg-gray-50 dark:bg-brand-darkBg p-5 rounded-3xl border border-gray-200 dark:border-brand-darkBorder gap-5 shadow-sm transition-colors">
                
                {/* Print Buttons */}
                <div className="flex gap-3">
                    <button onClick={() => handleLabelAction(false)} className="flex-1 bg-white dark:bg-brand-darkHover hover:bg-gray-100 dark:hover:bg-brand-darkBorder text-gray-700 dark:text-slate-200 font-black py-4 px-4 rounded-2xl transition-all text-sm border border-gray-200 dark:border-brand-darkBorder shadow-sm flex items-center justify-center gap-2" title="Preview Sticker">
                        <Eye size={18}/> View
                    </button>
                    <button onClick={() => handleLabelAction(true)} className="flex-[2] bg-gray-800 dark:bg-slate-700 hover:bg-gray-900 dark:hover:bg-slate-600 text-white font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-widest shadow-md flex items-center justify-center gap-2 border border-gray-700 dark:border-slate-500">
                        <Printer size={18}/> Print
                    </button>
                </div>

                {/* Pack / Barcode Section */}
                <div className="relative">
                    <ScanBarcode size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"/>
                    <input 
                        ref={barcodeInputRef}
                        type="text" 
                        placeholder="Scan Barcode here..." 
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        onKeyDown={handlePack}
                        className="w-full bg-white dark:bg-black/60 border-2 border-emerald-400 dark:border-emerald-500/40 rounded-2xl pl-12 pr-4 py-4 text-base text-emerald-600 dark:text-emerald-400 font-black outline-none focus:border-emerald-500 placeholder-gray-400 dark:placeholder-slate-600 uppercase tracking-widest text-center shadow-sm dark:shadow-inner transition-colors"
                    />
                </div>
                <button disabled={isProcessing} onClick={() => handlePack()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-widest shadow-md flex justify-center items-center gap-2 border border-emerald-500/50">
                    {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <Check size={20}/>} Mark as Packed
                </button>

                {/* Hold Button */}
                {order.status !== 'Hold' && (
                    <button onClick={() => setIsHolding(true)} className="w-full bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-orange-500 dark:text-orange-400 font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-widest border-2 border-orange-200 dark:border-orange-500/30 shadow-sm flex justify-center items-center gap-2">
                        <AlertTriangle size={18}/> Hold Order
                    </button>
                )}
            </div>

            {/* Hold Modal */}
            {isHolding && createPortal(
                <div className="fixed inset-0 z-[9999] bg-gray-900/60 dark:bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md transition-colors">
                    <div className="bg-white dark:bg-[#15192b] border border-gray-200 dark:border-orange-500/30 rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 transition-colors">
                        <h3 className="text-2xl font-black text-orange-600 dark:text-orange-400 flex items-center gap-3 mb-4"><AlertTriangle size={28}/> Hold Delivery</h3>
                        <p className="text-base font-medium text-gray-600 dark:text-slate-400 mb-6 bg-orange-50 dark:bg-orange-500/10 p-3 rounded-xl border border-orange-200 dark:border-orange-500/20 transition-colors">Holding this will immediately notify the student on their dashboard.</p>
                        
                        <label className="text-sm font-black text-gray-500 dark:text-slate-300 uppercase tracking-widest mb-2 block transition-colors">Select Reason</label>
                        <select value={holdReason} onChange={(e) => setHoldReason(e.target.value)} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-2xl p-4 text-gray-900 dark:text-white mb-5 outline-none focus:border-orange-500 dark:focus:border-orange-500 text-base font-bold shadow-sm dark:shadow-inner transition-colors">
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
                                className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-2xl p-4 text-base text-gray-900 dark:text-white outline-none focus:border-orange-500 dark:focus:border-orange-500 mb-5 resize-none placeholder-gray-400 dark:placeholder-slate-600 font-medium shadow-sm dark:shadow-inner transition-colors"
                            ></textarea>
                        )}

                        <div className="flex gap-4 mt-4">
                            <button onClick={() => setIsHolding(false)} className="flex-1 py-4 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-2xl text-gray-600 dark:text-slate-300 font-black transition-all text-base border border-gray-200 dark:border-white/10">Cancel</button>
                            <button disabled={isProcessing} onClick={submitHold} className="flex-[1.5] bg-orange-600 hover:bg-orange-500 text-white rounded-2xl py-4 font-black transition-all shadow-lg shadow-orange-600/20 text-base flex justify-center items-center gap-2 border border-orange-500">
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