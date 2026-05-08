import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Calendar, ChevronLeft, ChevronRight, CheckCircle, X, Globe, Copy, Loader2 } from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';

export default function DeliveryHistory() {
    const [loading, setLoading] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [batches, setBatches] = useState([]);
    
    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        search: '', businessId: '', batchId: '', paymentType: '', status: '', startDate: '', endDate: ''
    });

    // Iframe State & Confirm States
    const [isIframeOpen, setIsIframeOpen] = useState(false);
    const [confirmingId, setConfirmingId] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null); // 🔥 "Are you sure?" Modal State

    // Courier Tracking Base URL
    const COURIER_URL = "https://www.fdedomestic.com/client/signIn.php#you_must_login_first"; 

    // Initial Loads
    useEffect(() => {
        fetchBusinesses();
    }, []);

    useEffect(() => {
        if (filters.businessId) fetchBatches(filters.businessId);
        else setBatches([]);
    }, [filters.businessId]);

    useEffect(() => {
        const delay = setTimeout(() => { fetchHistory(); }, 500);
        return () => clearTimeout(delay);
    }, [page, filters]);

    // 🔥 Enter Key Press Listener for Quick Confirm
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && confirmModal) {
                e.preventDefault();
                handleManualConfirm(confirmModal);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmModal]);

    // Data Fetching Functions
    const fetchBusinesses = async () => {
        try {
            const res = await axios.get('/admin/businesses');
            setBusinesses(res.data?.data || res.data || []);
        } catch (error) { console.error(error); }
    };

    const fetchBatches = async (bizId) => {
        try {
            const res = await axios.get(`/admin/batches/${bizId}`);
            setBatches(res.data?.batches || res.data || []);
        } catch (error) { console.error(error); }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 15, ...filters });
            const res = await axios.get(`/admin/delivery/history-advanced?${params.toString()}`);
            setHistoryData(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
        } catch (error) { toast.error("Failed to load history data"); } 
        finally { setLoading(false); }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); 
    };

    // Copy to Clipboard
    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`Copied: ${text}`, { style: { background: '#1e293b', color: '#fff' }});
    };

    // API Call to Confirm Delivery
    const handleManualConfirm = async (deliveryId) => {
        setConfirmingId(deliveryId);
        try {
            await axios.put(`/admin/delivery/manual-confirm/${deliveryId}`);
            toast.success("Order marked as Delivered!");
            setConfirmModal(null); // Modal එක වහනවා
            fetchHistory(); // Table එක Refresh කරනවා
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setConfirmingId(null);
        }
    };

    return (
        <div className="animate-fade-in font-sans h-[85vh] flex flex-col gap-4">
            
            {/* Filters Section */}
            <div className="bg-[#1e2336]/80 p-5 rounded-2xl border border-white/5 shadow-lg flex flex-col xl:flex-row gap-4 shrink-0">
                
                {/* Search */}
                <div className="relative flex-[1.5]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                    <input 
                        type="text" placeholder="Search ID, Student, Tracking..." 
                        value={filters.search} onChange={e => handleFilterChange('search', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />
                </div>

                {/* Dropdowns */}
                <div className="flex flex-wrap md:flex-nowrap gap-3 flex-[2.5]">
                    <select value={filters.businessId} onChange={e => handleFilterChange('businessId', e.target.value)} className="flex-1 min-w-[120px] bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm text-slate-300 outline-none focus:border-blue-500">
                        <option value="">All Businesses</option>
                        {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    <select value={filters.batchId} onChange={e => handleFilterChange('batchId', e.target.value)} disabled={!filters.businessId} className="flex-1 min-w-[120px] bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm text-slate-300 outline-none focus:border-blue-500 disabled:opacity-50">
                        <option value="">All Batches</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)} className="flex-1 min-w-[120px] bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm text-slate-300 outline-none focus:border-blue-500">
                        <option value="">All Statuses</option>
                        <option value="Dispatched">Dispatched (On the way)</option>
                        <option value="Delivered">Delivered (Received)</option>
                    </select>
                </div>

                {/* Dates & Web Button */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-black/40 rounded-xl border border-white/10 p-1">
                        <Calendar className="text-slate-400 ml-2" size={16}/>
                        <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className="bg-transparent text-sm text-slate-300 outline-none px-2 py-1.5 [color-scheme:dark]"/>
                        <span className="text-slate-600">-</span>
                        <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className="bg-transparent text-sm text-slate-300 outline-none px-2 py-1.5 [color-scheme:dark]"/>
                        {(filters.startDate || filters.endDate) && (
                            <button onClick={() => {handleFilterChange('startDate', ''); handleFilterChange('endDate', '');}} className="mr-2 text-slate-400 hover:text-red-400"><X size={16}/></button>
                        )}
                    </div>

                    <button 
                        onClick={() => setIsIframeOpen(!isIframeOpen)}
                        className={`px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg border flex items-center gap-2 ${isIframeOpen ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/10 text-slate-300 hover:bg-white/20 border-white/20'}`}
                    >
                        <Globe size={18}/> Web
                    </button>
                </div>
            </div>

            {/* Split Content Area (Table + Iframe) */}
            <div className="flex flex-1 gap-5 min-h-0">
                
                {/* Left: Table Pane */}
                <div className={`flex flex-col bg-[#1e2336]/60 border border-white/5 rounded-2xl shadow-xl overflow-hidden transition-all duration-500 ${isIframeOpen ? 'w-[55%] xl:w-[60%]' : 'w-full'}`}>
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-black/40 sticky top-0 z-10 backdrop-blur-md">
                                <tr className="text-xs uppercase tracking-widest text-slate-400 border-b border-white/5">
                                    <th className="p-4 font-bold">Order ID</th>
                                    <th className="p-4 font-bold">Student</th>
                                    {!isIframeOpen && <th className="p-4 font-bold">Batch & Status</th>}
                                    <th className="p-4 font-bold">Tracking</th>
                                    <th className="p-4 font-bold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-10 text-center"><Loader2 className="animate-spin text-blue-500 mx-auto" size={30}/></td></tr>
                                ) : historyData.length === 0 ? (
                                    <tr><td colSpan="5" className="p-10 text-center text-slate-500 font-bold">No history data found.</td></tr>
                                ) : (
                                    historyData.map((row) => (
                                        <tr key={row.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-black text-white text-sm">ORD-{row.id}</td>
                                            <td className="p-4">
                                                <p className="text-sm font-bold text-slate-200 truncate max-w-[150px]">{row.studentName}</p>
                                                <p className="text-[10px] text-slate-500">{row.phone}</p>
                                            </td>
                                            
                                            {!isIframeOpen && (
                                                <td className="p-4">
                                                    <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-1">{row.businessName}</p>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${row.status === 'Received' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                        {row.status === 'Received' ? 'Delivered' : 'Dispatched'}
                                                    </span>
                                                </td>
                                            )}

                                            <td className="p-4">
                                                {row.trackingNumber ? (
                                                    <div className="flex items-center gap-3 bg-black/40 w-max px-3 py-1.5 rounded-lg border border-white/5">
                                                        <span className="text-emerald-400 font-bold text-sm tracking-widest">{row.trackingNumber}</span>
                                                        <button onClick={() => copyToClipboard(row.trackingNumber)} className="text-slate-400 hover:text-white transition-colors p-1 bg-white/5 rounded-md" title="Copy">
                                                            <Copy size={14}/>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 font-bold text-xs bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">N/A</span>
                                                )}
                                            </td>

                                            <td className="p-4 text-center">
                                                {row.status !== 'Received' ? (
                                                    <button 
                                                        onClick={() => setConfirmModal(row.id)} // 🔥 කෙලින්ම Confirm කරන්නේ නැතුව Modal එක අරිනවා
                                                        className="mx-auto bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border border-emerald-500/30 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle size={14}/>
                                                        Confirm
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Done</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-black/30 p-4 border-t border-white/5 flex justify-between items-center shrink-0">
                            <span className="text-sm text-slate-400">Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong></span>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors"><ChevronLeft size={16}/> Prev</button>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors">Next <ChevronRight size={16}/></button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Iframe Pane */}
                {isIframeOpen && (
                    <div className="w-[45%] xl:w-[40%] flex flex-col bg-[#15192b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-right-8 duration-500">
                        <div className="bg-black/60 p-3 border-b border-white/10 flex justify-between items-center shrink-0">
                            <span className="text-blue-400 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                <Globe size={16}/> Courier Portal
                            </span>
                            <button onClick={() => setIsIframeOpen(false)} className="text-slate-400 hover:text-red-400 bg-white/5 p-1.5 rounded-lg transition-colors">
                                <X size={18}/>
                            </button>
                        </div>
                        <div className="flex-1 w-full bg-white relative">
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-0">
                                <Loader2 size={30} className="animate-spin text-slate-400"/>
                            </div>
                            <iframe 
                                src={COURIER_URL} 
                                className="w-full h-full relative z-10 border-0" 
                                title="Courier Tracking"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 🔥 NEW: "Are you sure?" Confirmation Modal 🔥 */}
            {confirmModal && createPortal(
                <div className="fixed inset-0 z-[99999] bg-[#0a0f1c]/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#15192b] border border-emerald-500/30 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col items-center text-center">
                        
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/30 text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <CheckCircle size={32} />
                        </div>
                        
                        <h3 className="text-2xl font-black text-white mb-2">Are you sure?</h3>
                        <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed">
                            You are about to manually mark Order <strong className="text-white">ORD-{confirmModal}</strong> as Delivered.
                            <br/><br/>
                            <span className="bg-white/5 px-3 py-1 rounded-md text-xs">Press <strong>Enter</strong> to confirm</span>
                        </p>

                        <div className="flex gap-3 w-full">
                            <button 
                                onClick={() => setConfirmModal(null)} 
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleManualConfirm(confirmModal)} 
                                disabled={confirmingId === confirmModal}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-3.5 rounded-xl transition-all shadow-lg text-sm flex justify-center items-center gap-2"
                            >
                                {confirmingId === confirmModal ? <Loader2 size={16} className="animate-spin"/> : "Yes, Confirm"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}