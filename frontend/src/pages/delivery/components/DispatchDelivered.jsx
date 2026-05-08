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
        
        // 🔥 UPDATE: 'Packed' සහ 'On the way' දෙකම Dispatch View එකට අදිනවා
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

    if (loading && !selectedBiz) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;

    return (
        <div className="animate-fade-in font-sans">
            
            {!selectedBiz && (
                <div className="flex gap-4 mb-8 bg-[#1e2336]/60 p-2 rounded-2xl border border-white/5 w-max shadow-inner">
                    <button onClick={() => { setViewType('Dispatch'); setSelectedBiz(null); }} className={`px-8 py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all flex items-center gap-2 ${viewType === 'Dispatch' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <Truck size={18}/> Dispatched
                    </button>
                    <button onClick={() => { setViewType('Delivered'); setSelectedBiz(null); }} className={`px-8 py-3 rounded-xl font-black text-sm tracking-widest uppercase transition-all flex items-center gap-2 ${viewType === 'Delivered' ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        <CheckCircle size={18}/> Delivered
                    </button>
                </div>
            )}

            {!selectedBiz ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {businesses.map(biz => {
                        // 🔥 UPDATE: Card එකේ ගාණ පෙන්නන තැනටත් Status දෙකම දානවා
                        const bizStatusCount = allDeliveries.filter(d => {
                            if (d.businessId !== biz.id) return false;
                            if (viewType === 'Dispatch') {
                                return d.status === 'Packed' || d.status === 'On the way';
                            }
                            return d.status === 'Received';
                        }).length;

                        return (
                            <div key={biz.id} onClick={() => fetchDeliveriesForBiz(biz.id)} className={`relative bg-[#1e2336]/80 border p-8 rounded-3xl cursor-pointer transition-all shadow-xl flex flex-col items-center justify-center text-center group ${viewType === 'Delivered' ? 'border-emerald-500/20 hover:border-emerald-500/50' : 'border-white/10 hover:border-blue-500/50'}`}>
                                <div className="w-28 h-28 bg-white/5 rounded-2xl p-3 border border-white/10 group-hover:scale-105 transition-transform mb-4">
                                    <img src={getBizLogoUrl(biz.logo)} alt={biz.name} className="w-full h-full object-contain drop-shadow-lg" />
                                </div>
                                <h3 className="text-xl font-black text-white">{biz.name}</h3>
                                <p className={`text-sm font-bold mt-3 px-4 py-1.5 rounded-full border shadow-inner ${viewType === 'Delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-black/40 text-slate-400 border-white/5'}`}>
                                    {bizStatusCount} {viewType} Orders
                                </p>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div>
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                        <button onClick={() => {setSelectedBiz(null); setDeliveries([]);}} className="text-base font-bold text-slate-400 hover:text-white flex items-center gap-2 bg-black/40 px-5 py-2.5 rounded-xl transition-colors shadow-md">
                            <ArrowLeft size={18}/> Back to Businesses
                        </button>

                        {/* Date Filter */}
                        <div className="flex items-center bg-black/40 rounded-xl border border-white/10 p-1 shadow-inner">
                            <Calendar className="text-slate-400 ml-3" size={18}/>
                            <input type="date" value={dateRange.start} onChange={e => {setDateRange({...dateRange, start: e.target.value}); setCurrentPage(1);}} className="bg-transparent text-sm text-slate-200 outline-none px-3 py-2 [color-scheme:dark] font-medium"/>
                            <span className="text-slate-600 font-bold">-</span>
                            <input type="date" value={dateRange.end} onChange={e => {setDateRange({...dateRange, end: e.target.value}); setCurrentPage(1);}} className="bg-transparent text-sm text-slate-200 outline-none px-3 py-2 [color-scheme:dark] font-medium"/>
                            {(dateRange.start || dateRange.end) && (
                                <button onClick={() => {setDateRange({start:'', end:''}); setCurrentPage(1);}} className="mr-2 text-slate-400 hover:text-red-400"><X size={16}/></button>
                            )}
                        </div>
                    </div>

                    {paginatedDeliveries.length === 0 ? (
                        <div className="text-center py-24 bg-[#1e2336]/40 rounded-3xl border border-white/5 shadow-inner">
                            <p className="text-slate-400 font-bold text-xl">No {viewType.toLowerCase()} records found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {paginatedDeliveries.map((order, idx) => (
                                <div key={idx} className="bg-[#1e2336]/80 border border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg hover:border-blue-500/30 transition-colors">
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${viewType === 'Delivered' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                                            <Package size={24}/>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-lg text-white mb-1 flex items-center gap-2">
                                                {order.studentName}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${viewType === 'Delivered' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                                                    {viewType}
                                                </span>
                                            </h4>
                                            <p className="text-xs text-slate-400 font-medium tracking-wide">REF: <span className="text-white">ORD-{order.id}</span> • Tracking: <span className="text-blue-400 font-bold">{order.trackingNumber || 'N/A'}</span></p>
                                        </div>
                                    </div>
                                    
                                    <button onClick={() => setSelectedOrder(order)} className="bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-5 rounded-xl transition-all text-xs uppercase tracking-widest border border-white/10 flex items-center gap-2 w-full sm:w-auto justify-center">
                                        <Eye size={16}/> View Details
                                    </button>
                                </div>
                            ))}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-8 bg-black/30 p-4 rounded-2xl border border-white/5">
                                    <span className="text-sm text-slate-400 font-bold">Showing Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong></span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors"><ChevronLeft size={16}/> Prev</button>
                                        <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors">Next <ChevronRight size={16}/></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* View Details Modal */}
            {selectedOrder && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#15192b] border border-white/10 rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                        
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 shrink-0">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <Package size={22} className="text-blue-400"/> Order Details
                            </h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-red-400 bg-white/5 p-2 rounded-xl">
                                <X size={20}/>
                            </button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar pr-2 flex-1 space-y-6">
                            <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                <div className="flex gap-3 mb-2">
                                    <MapPin size={18} className="text-emerald-400 mt-1"/>
                                    <div>
                                        <p className="text-white font-bold text-lg">{selectedOrder.studentName}</p>
                                        <p className="text-slate-400 text-sm mt-1">{selectedOrder.address}</p>
                                        <p className="text-blue-400 font-bold text-sm mt-1">{selectedOrder.phone}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <span className="bg-white/10 text-slate-300 text-xs px-3 py-1 rounded font-bold uppercase tracking-wider">{selectedOrder.paymentType} Payment</span>
                                    <span className="bg-white/10 text-slate-300 text-xs px-3 py-1 rounded font-bold uppercase tracking-wider">REF: ORD-{selectedOrder.id}</span>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Included Tutes</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {selectedOrder.items?.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-black/40 border border-white/5 p-3 rounded-xl">
                                            <img src={getTuteImgUrl(item.tuteCover)} onError={(e) => { e.target.onerror = null; e.target.src = '/default-tute.png'; }} className="w-10 h-14 object-cover rounded-lg border border-slate-700 bg-slate-800 shrink-0" alt="Tute" />
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold text-white truncate">{item.tuteName} <span className="text-emerald-400">x{item.quantity}</span></p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest truncate mt-0.5">{item.courseName}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10 shrink-0">
                            <button onClick={() => setSelectedOrder(null)} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest">
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