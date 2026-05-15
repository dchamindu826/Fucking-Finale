import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Truck, CheckCircle, ArrowLeft, Loader2, Package, Eye, X, BookOpen, MapPin, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';

export default function DispatchDelivered({ searchQuery }) {
    const [loading, setLoading] = useState(true);
    const [businesses, setBusinesses] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState(null);
    
    const [allDeliveries, setAllDeliveries] = useState([]); 
    const [deliveries, setDeliveries] = useState([]);
    
    const [viewType, setViewType] = useState('Dispatch'); 
    const [selectedOrder, setSelectedOrder] = useState(null); 

    // Pagination & Date Filter States
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const getBizLogoUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') ? '/logo.png' : `${axios.defaults.baseURL.replace('/api', '')}/storage/icons/${imageName}`;
    const getTuteImgUrl = (imageName) => (!imageName || imageName === 'default-tute.png' || imageName === 'null') ? '/default-tute.png' : `${axios.defaults.baseURL.replace('/api', '')}/storage/documents/${imageName}`;

    useEffect(() => {
        fetchAllInitialData();
    }, []);

    useEffect(() => {
        if (selectedBiz) fetchDeliveriesForBiz(selectedBiz);
    }, [viewType, allDeliveries]);

    const fetchAllInitialData = async () => {
        setLoading(true);
        try {
            const [bizRes, allDelRes] = await Promise.all([
                axios.get('/admin/businesses'),
                axios.get('/admin/delivery/dispatch') 
            ]);
            setBusinesses(bizRes.data?.data || bizRes.data || []);
            setAllDeliveries(allDelRes.data || []);
        } catch (error) {
            toast.error("Failed to load dispatch data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchDeliveriesForBiz = (bizId) => {
        setSelectedBiz(bizId);
        
        const bizDeliveries = allDeliveries.filter(d => {
            if (d.businessId !== bizId) return false;
            if (viewType === 'Dispatch') {
                return d.status === 'Packed' || d.status === 'On the way';
            }
            return d.status === 'Received'; // Delivered view
        });
        
        setDeliveries(bizDeliveries);
        setCurrentPage(1);
    };

    // Filter Logic
    const filteredDeliveries = deliveries.filter(order => {
        const matchesSearch = order.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              order.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              order.id?.toString().includes(searchQuery.toLowerCase());
                              
        let matchesDate = true;
        if (dateRange.start && dateRange.end) {
            const orderDate = new Date(order.updatedAt).setHours(0,0,0,0);
            const sDate = new Date(dateRange.start).setHours(0,0,0,0);
            const eDate = new Date(dateRange.end).setHours(23,59,59,999);
            matchesDate = orderDate >= sDate && orderDate <= eDate;
        }

        return matchesSearch && matchesDate;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
    const paginatedDeliveries = filteredDeliveries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading && !selectedBiz) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-accent" size={40}/></div>;

    return (
        <div className="animate-fade-in font-sans">
            
            {!selectedBiz && (
                <div className="flex gap-4 mb-8 bg-gray-50 dark:bg-brand-darkCard p-2 rounded-2xl border border-gray-200 dark:border-brand-darkBorder w-max shadow-sm transition-colors">
                    <button onClick={() => { setViewType('Dispatch'); setSelectedBiz(null); }} className={`px-8 py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all flex items-center gap-2 ${viewType === 'Dispatch' ? 'bg-brand-accent text-white shadow-md scale-105' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-brand-darkHover/60'}`}>
                        <Truck size={18}/> Dispatched
                    </button>
                    <button onClick={() => { setViewType('Delivered'); setSelectedBiz(null); }} className={`px-8 py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all flex items-center gap-2 ${viewType === 'Delivered' ? 'bg-emerald-600 text-white shadow-md scale-105' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-brand-darkHover/60'}`}>
                        <CheckCircle size={18}/> Delivered
                    </button>
                </div>
            )}

            {!selectedBiz ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {businesses.map(biz => {
                        const bizStatusCount = allDeliveries.filter(d => {
                            if (d.businessId !== biz.id) return false;
                            if (viewType === 'Dispatch') {
                                return d.status === 'Packed' || d.status === 'On the way';
                            }
                            return d.status === 'Received';
                        }).length;

                        return (
                            <div key={biz.id} onClick={() => fetchDeliveriesForBiz(biz.id)} className={`relative bg-white dark:bg-brand-darkCard border p-8 rounded-3xl cursor-pointer transition-all shadow-sm flex flex-col items-center justify-center text-center group ${viewType === 'Delivered' ? 'border-gray-200 dark:border-emerald-500/20 hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:shadow-md' : 'border-gray-200 dark:border-brand-darkBorder hover:border-brand-accent/50 dark:hover:border-brand-accent/50 hover:shadow-md'}`}>
                                <div className="w-28 h-28 bg-gray-50 dark:bg-brand-darkBg rounded-2xl p-3 border border-gray-100 dark:border-brand-darkBorder group-hover:scale-105 transition-transform mb-4 shadow-sm">
                                    <img src={getBizLogoUrl(biz.logo)} alt={biz.name} onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} className="w-full h-full object-contain drop-shadow-sm dark:drop-shadow-lg" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white transition-colors">{biz.name}</h3>
                                <p className={`text-sm font-bold mt-3 px-4 py-1.5 rounded-full border transition-colors ${viewType === 'Delivered' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-gray-100 dark:bg-brand-darkHover text-gray-600 dark:text-gray-400 border-gray-200 dark:border-brand-darkBorder'}`}>
                                    {bizStatusCount} {viewType} Orders
                                </p>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div>
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                        <button onClick={() => {setSelectedBiz(null); setDeliveries([]);}} className="text-base font-bold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder px-5 py-2.5 rounded-xl transition-colors shadow-sm">
                            <ArrowLeft size={18}/> Back to Businesses
                        </button>

                        {/* Date Filter */}
                        <div className="flex items-center bg-white dark:bg-brand-darkCard rounded-xl border border-gray-200 dark:border-brand-darkBorder p-1 shadow-sm transition-colors">
                            <Calendar className="text-gray-400 dark:text-slate-400 ml-3" size={18}/>
                            <input type="date" value={dateRange.start} onChange={e => {setDateRange({...dateRange, start: e.target.value}); setCurrentPage(1);}} className="bg-transparent text-sm text-gray-700 dark:text-slate-200 outline-none px-3 py-2 [color-scheme:light] dark:[color-scheme:dark] font-medium"/>
                            <span className="text-gray-400 dark:text-slate-600 font-bold">-</span>
                            <input type="date" value={dateRange.end} onChange={e => {setDateRange({...dateRange, end: e.target.value}); setCurrentPage(1);}} className="bg-transparent text-sm text-gray-700 dark:text-slate-200 outline-none px-3 py-2 [color-scheme:light] dark:[color-scheme:dark] font-medium"/>
                            {(dateRange.start || dateRange.end) && (
                                <button onClick={() => {setDateRange({start:'', end:''}); setCurrentPage(1);}} className="mr-2 text-gray-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400"><X size={16}/></button>
                            )}
                        </div>
                    </div>

                    {paginatedDeliveries.length === 0 ? (
                        <div className="text-center py-24 bg-gray-50 dark:bg-brand-darkCard rounded-3xl border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors">
                            <p className="text-gray-500 dark:text-slate-400 font-bold text-xl">No {viewType.toLowerCase()} records found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {paginatedDeliveries.map((order, idx) => (
                                <div key={idx} className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-brand-accent/30 dark:hover:border-brand-accent/30 transition-colors">
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${viewType === 'Delivered' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-500 dark:text-emerald-400' : 'bg-brand-accentLight border-brand-accent/30 text-brand-accent'}`}>
                                            <Package size={24}/>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-lg text-gray-900 dark:text-white mb-1 flex items-center gap-2 transition-colors">
                                                {order.studentName}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border transition-colors ${viewType === 'Delivered' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30' : 'bg-brand-accentLight dark:bg-brand-accent/20 text-brand-accent dark:text-brand-accent border-brand-accent/30 dark:border-brand-accent/30'}`}>
                                                    {viewType}
                                                </span>
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium tracking-wide transition-colors">REF: <span className="text-gray-900 dark:text-white">ORD-{order.id}</span> • Tracking: <span className="text-brand-accent font-bold">{order.trackingNumber || 'N/A'}</span></p>
                                        </div>
                                    </div>
                                    
                                    <button onClick={() => setSelectedOrder(order)} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white font-bold py-3 px-5 rounded-xl transition-all text-xs uppercase tracking-widest border border-gray-200 dark:border-white/10 flex items-center gap-2 w-full sm:w-auto justify-center shadow-sm">
                                        <Eye size={16}/> View Details
                                    </button>
                                </div>
                            ))}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-8 bg-gray-50 dark:bg-brand-darkCard p-4 rounded-2xl border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors">
                                    <span className="text-sm text-gray-500 dark:text-slate-400 font-bold">Showing Page <strong className="text-gray-900 dark:text-white">{currentPage}</strong> of <strong className="text-gray-900 dark:text-white">{totalPages}</strong></span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 disabled:opacity-50 text-gray-700 dark:text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors shadow-sm"><ChevronLeft size={16}/> Prev</button>
                                        <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 disabled:opacity-50 text-gray-700 dark:text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors shadow-sm">Next <ChevronRight size={16}/></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* View Details Modal */}
            {selectedOrder && createPortal(
                <div className="fixed inset-0 z-[9999] bg-gray-900/60 dark:bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in transition-colors">
                    <div className="bg-white dark:bg-[#15192b] border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col transition-colors">
                        
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-white/10 shrink-0 transition-colors">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 transition-colors">
                                <Package size={22} className="text-brand-accent"/> Order Details
                            </h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 bg-gray-100 dark:bg-white/5 p-2 rounded-xl transition-colors">
                                <X size={20}/>
                            </button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 space-y-6">
                            <div className="bg-gray-50 dark:bg-black/30 p-4 rounded-2xl border border-gray-100 dark:border-white/5 transition-colors">
                                <div className="flex gap-3 mb-2">
                                    <MapPin size={18} className="text-brand-accent mt-1"/>
                                    <div>
                                        <p className="text-gray-900 dark:text-white font-bold text-lg transition-colors">{selectedOrder.studentName}</p>
                                        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 transition-colors">{selectedOrder.address}</p>
                                        <p className="text-brand-accent font-bold text-sm mt-1">{selectedOrder.phone}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <span className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-slate-300 text-xs px-3 py-1 rounded font-bold uppercase tracking-wider transition-colors">{selectedOrder.paymentType} Payment</span>
                                    <span className="bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-slate-300 text-xs px-3 py-1 rounded font-bold uppercase tracking-wider transition-colors">REF: ORD-{selectedOrder.id}</span>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-3 transition-colors">Included Tutes</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selectedOrder.items?.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 p-3 rounded-xl transition-colors">
                                            <img src={getTuteImgUrl(item.tuteCover)} onError={(e) => { e.target.onerror = null; e.target.src = '/default-tute.png'; }} className="w-10 h-14 object-cover rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 shrink-0" alt="Tute" />
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate transition-colors">{item.tuteName} <span className="text-emerald-600 dark:text-emerald-400">x{item.quantity}</span></p>
                                                <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-widest truncate mt-0.5 transition-colors">{item.courseName}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10 shrink-0 transition-colors">
                            <button onClick={() => setSelectedOrder(null)} className="w-full bg-gray-800 dark:bg-slate-700 hover:bg-gray-900 dark:hover:bg-slate-600 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest shadow-md">
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}