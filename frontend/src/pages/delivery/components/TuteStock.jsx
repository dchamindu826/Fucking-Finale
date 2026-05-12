import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box, Plus, X, Loader2, ArrowLeft, Building2, Layers, BookOpen, FileText, ChevronRight, AlertTriangle, Edit3, Trash2, BarChart3, Download, Filter } from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';

// 🔥 SMART IMAGE COMPONENT: Group ID එකෙන් හරියටම පින්තූරේ හොයාගන්නවා 🔥
const LiveTuteImage = ({ stock }) => {
    const [imgSrc, setImgSrc] = useState(null);
    const [errorStage, setErrorStage] = useState(0);

    useEffect(() => {
        let coverName = stock.tuteImage; 
        
        // Course data ඇතුලෙන් හරියටම අදාල Group ID එකට අදාල Tute Cover එක ගන්නවා
        if (stock.course?.groupPrices && stock.course?.groupId) {
            try {
                const gp = JSON.parse(stock.course.groupPrices);
                // 🔥 FIX: TuteName එකෙන් නෙවෙයි, GroupID එකෙන්ම හොයනවා.
                const match = gp.find(g => parseInt(g.groupId) === parseInt(stock.course.groupId));
                
                if (match && match.tuteCover && match.tuteCover !== 'default-tute.png' && match.tuteCover !== 'null') {
                    coverName = match.tuteCover;
                }
            } catch(e) {}
        }
        
        if (!coverName || coverName === 'default-tute.png' || coverName === 'null') {
            setImgSrc(null);
        } else {
            const baseUrl = axios.defaults.baseURL.replace('/api', '');
            setImgSrc(`${baseUrl}/storage/documents/${coverName}`);
        }
    }, [stock]);

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
        return <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap text-center px-1">No Cover</span>;
    }

    return (
        <img 
            src={imgSrc} 
            onError={handleError}
            alt="Cover" 
            className="w-full h-full object-cover" 
        />
    );
};

export default function TuteStock() {
    const [viewLevel, setViewLevel] = useState('businesses');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [businesses, setBusinesses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [batchStock, setBatchStock] = useState([]);
    const [globalStock, setGlobalStock] = useState([]);

    const [selectedBiz, setSelectedBiz] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('');
    const [stockInputs, setStockInputs] = useState({}); 

    const [viewPaymentFilter, setViewPaymentFilter] = useState('ALL');

    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({ id: null, qty: '', reason: '' });

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportFilters, setReportFilters] = useState({ dateType: 'this_month', startDate: '', endDate: '', businessId: '', batchId: '', paymentType: '' });
    const [reportData, setReportData] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);

    useEffect(() => {
        fetchInitialData();
        setMonthDates('this_month');
    }, []);

    useEffect(() => {
        if (selectedBiz) fetchBatches(selectedBiz);
        else { setBatches([]); setSelectedBatch(''); setBatchStock([]); }
    }, [selectedBiz]);

    useEffect(() => {
        if (selectedBatch) fetchBatchStock(selectedBatch);
        else setBatchStock([]);
    }, [selectedBatch]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const bizRes = await axios.get('/admin/businesses');
            setBusinesses(bizRes.data?.data || bizRes.data || []);
            const stockRes = await axios.get('/admin/delivery/stock/global');
            setGlobalStock(stockRes.data || []);
        } catch (error) { toast.error("Failed to load dashboard data"); } 
        finally { setLoading(false); }
    };

    const fetchBatches = async (bizId) => {
        if (!bizId) return; 
        try {
            const res = await axios.get(`/admin/batches/${bizId}`);
            setBatches(res.data?.batches || res.data || []);
            setSelectedBatch('');
            setViewLevel('batches');
        } catch (error) { toast.error("Failed to load batches"); }
    };

    const fetchBatchStock = async (batchId) => {
        if (!batchId) return;
        setLoading(true);
        try {
            const res = await axios.get(`/admin/delivery/stock/batch/${batchId}`);
            setBatchStock(res.data || []);
            setViewLevel('stock');
        } catch (error) { toast.error("Failed to load stock data"); } 
        finally { setLoading(false); }
    };

    const getImageUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') ? '/logo.png' : `${axios.defaults.baseURL.replace('/api', '')}/storage/icons/${imageName}`;

    // ================== STOCK ACTIONS ==================
    const handleAddStock = async (stockId) => {
        const qty = parseInt(stockInputs[stockId]);
        if (!qty || isNaN(qty) || qty <= 0) return toast.error("Enter a valid quantity!");

        setActionLoading(true);
        try {
            await axios.post('/admin/delivery/stock/add', { stockId, quantity: qty, reason: "New printed stock added" });
            toast.success("Stock Added Successfully!");
            setStockInputs(prev => ({ ...prev, [stockId]: '' }));
            fetchBatchStock(selectedBatch);
            fetchInitialData(); 
        } catch (error) { toast.error("Failed to update stock"); } 
        finally { setActionLoading(false); }
    };

    const handleEditStockSubmit = async (e) => {
        e.preventDefault();
        if (!editData.reason) return toast.error("A reason is required!");
        setActionLoading(true);
        try {
            await axios.put('/admin/delivery/stock/edit', { stockId: editData.id, newQuantity: editData.qty, reason: editData.reason });
            toast.success("Stock Adjusted!");
            setShowEditModal(false);
            fetchBatchStock(selectedBatch);
            fetchInitialData();
        } catch (error) { toast.error("Failed to adjust stock"); } 
        finally { setActionLoading(false); }
    };

    const handleDeleteStock = async (stockId) => {
        const reason = window.prompt("Why are you deleting this item? (Required)");
        if (!reason) return toast.error("Deletion cancelled.");
        try {
            await axios.delete(`/admin/delivery/stock/delete/${stockId}?reason=${encodeURIComponent(reason)}`);
            toast.success("Stock Item Deleted!");
            fetchBatchStock(selectedBatch);
            fetchInitialData();
        } catch (error) { toast.error("Failed to delete item"); }
    };

    // ================== REPORT LOGIC ==================
    const setMonthDates = (type) => {
        const today = new Date();
        let start, end;
        if (type === 'this_month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else if (type === 'last_month') {
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
        } else {
            return;
        }
        setReportFilters(prev => ({ ...prev, dateType: type, startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] }));
    };

    const generateReport = async () => {
        setReportLoading(true);
        try {
            const params = newSearchParams({
                startDate: reportFilters.startDate, endDate: reportFilters.endDate,
                businessId: reportFilters.businessId, batchId: reportFilters.batchId, paymentType: reportFilters.paymentType
            });
            const res = await axios.get(`/admin/delivery/stock/report?${params.toString()}`);
            setReportData(res.data || []);
            if(res.data.length === 0) toast("No deliveries found for this criteria.", { icon: 'ℹ️' });
        } catch (error) { toast.error("Failed to generate report"); } 
        finally { setReportLoading(false); }
    };

    const exportReportCSV = () => {
        if(reportData.length === 0) return toast.error("No data to export");
        const headers = ["Business", "Batch", "Payment Group", "Subject Name", "Tute Name", "Total Delivered/Packed", "Remaining Stock"];
        const rows = reportData.map(r => `"${r.businessName}","${r.batchName}","${r.paymentType}","${r.courseName}","${r.tuteName}","${r.deliveredQty}","${r.currentStock}"`);
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Delivery_Report_${reportFilters.startDate}_to_${reportFilters.endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const globalLowStock = globalStock.filter(s => s.availableQuantity <= 10 && s.availableQuantity > 0);
    const globalOutStock = globalStock.filter(s => s.availableQuantity === 0);

    const filteredBatchStock = batchStock.filter(stock => {
        if (viewPaymentFilter === 'ALL') return true;
        const groupType = stock.course?.group?.type;
        if (viewPaymentFilter === 'Monthly') return groupType === 1;
        if (viewPaymentFilter === 'Full') return groupType === 2;
        return true;
    });

    return (
        <div className="w-full text-slate-200 animate-in fade-in duration-300 font-sans h-[85vh] flex flex-col">
            
            <div className="mb-6 bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shadow-sm shrink-0">
                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                    <div className="flex-1 relative">
                        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Select Business</label>
                        <select value={selectedBiz} onChange={e => setSelectedBiz(e.target.value)} className="w-full sm:w-56 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                            <option value="">-- Choose Business --</option>
                            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 relative">
                        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Select Batch</label>
                        <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} disabled={!selectedBiz} className="w-full sm:w-56 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-all disabled:opacity-50 appearance-none cursor-pointer">
                            <option value="">-- Choose Batch --</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    {selectedBatch && (
                        <div className="flex-1 relative animate-in fade-in slide-in-from-left-4">
                            <label className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1"><Filter size={12}/> Filter by Payment</label>
                            <select value={viewPaymentFilter} onChange={e => setViewPaymentFilter(e.target.value)} className="w-full sm:w-56 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                                <option value="ALL">All Payments (Monthly + Full)</option>
                                <option value="Monthly">Monthly Payments Only</option>
                                <option value="Full">Full Payments Only</option>
                            </select>
                        </div>
                    )}
                </div>

                <button onClick={() => setShowReportModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-colors font-medium text-sm flex items-center gap-2 w-full xl:w-auto justify-center mt-2 xl:mt-0 shrink-0">
                    <BarChart3 size={18}/> Delivery & Stock Report
                </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 relative">
                {!selectedBatch ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-900/30 border border-slate-800 rounded-2xl">
                        <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-5"><Box className="text-blue-400" size={32}/></div>
                        <h2 className="text-xl font-semibold text-slate-100 mb-2">Inventory Management</h2>
                        <p className="text-slate-400 text-sm max-w-md mx-auto mb-8 font-normal">Select a Business and a Batch from the top menu to easily add and manage tute stocks for subjects.</p>
                        
                        <div className="flex flex-wrap justify-center gap-4">
                            <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex flex-col items-center min-w-[140px]">
                                <span className="text-2xl font-semibold text-slate-100 mb-1">{globalStock.length}</span>
                                <span className="text-xs text-slate-400 font-medium">Total Subjects</span>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex flex-col items-center min-w-[140px]">
                                <span className="text-2xl font-semibold text-orange-400 mb-1">{globalLowStock.length}</span>
                                <span className="text-xs text-orange-500/80 font-medium">Low Stock Items</span>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col items-center min-w-[140px]">
                                <span className="text-2xl font-semibold text-red-400 mb-1">{globalOutStock.length}</span>
                                <span className="text-xs text-red-500/80 font-medium">Out of Stock</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                        <div className="mb-6 flex items-center justify-between pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <BookOpen size={20} className="text-blue-400"/>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-100">Update Batch Inventory</h3>
                                    <p className="text-xs text-slate-400 mt-0.5 font-normal">Quickly adjust current stock quantities for the selected batch.</p>
                                </div>
                            </div>
                            <div className="bg-slate-800/80 px-4 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300">
                                Showing <span className="text-white font-bold">{filteredBatchStock.length}</span> Subjects
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32}/></div>
                        ) : filteredBatchStock.length === 0 ? (
                            <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800">
                                <FileText size={32} className="text-slate-600 mx-auto mb-3"/>
                                <p className="text-slate-400 text-sm">No inventory items found for this selection.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {filteredBatchStock.map(stock => {
                                    const isLow = stock.availableQuantity <= 10;
                                    const paymentGroup = stock.course?.group?.type === 1 ? 'Monthly' : stock.course?.group?.type === 2 ? 'Full Payment' : 'Unknown';
                                    const paymentColor = stock.course?.group?.type === 1 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                                    
                                    return (
                                        <div key={stock.id} className="bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all group">
                                            
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className="w-14 h-20 bg-slate-900 rounded-lg border border-slate-700/50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
                                                    <LiveTuteImage stock={stock} />
                                                </div>
                                                
                                                <div className="flex flex-col justify-center min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold text-slate-100 text-sm truncate" title={stock.course?.name}>{stock.course?.name || "Extra Material"}</h4>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider whitespace-nowrap border ${paymentColor}`}>
                                                            {paymentGroup}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{stock.tuteName}</p>
                                                    <div className="mt-2.5 flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${isLow ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                            Stock: {stock.availableQuantity}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 shrink-0 bg-slate-900/50 p-1.5 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
                                                <div className="flex items-center rounded-lg px-1 flex-1 sm:flex-none">
                                                    <input 
                                                        type="number" min="1" placeholder="Qty"
                                                        value={stockInputs[stock.id] || ''}
                                                        onChange={(e) => setStockInputs({...stockInputs, [stock.id]: e.target.value})}
                                                        className="w-16 h-9 bg-slate-800 border border-slate-700 rounded-md text-slate-200 text-center text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-500" 
                                                    />
                                                </div>
                                                
                                                <button onClick={() => handleAddStock(stock.id)} disabled={actionLoading} className="h-9 bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-md font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50">
                                                    <Plus size={16}/> Add
                                                </button>
                                                
                                                <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block"></div>
                                                
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => { setEditData({ id: stock.id, qty: stock.availableQuantity, reason: '' }); setShowEditModal(true); }} className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-md transition-colors" title="Adjust Balance">
                                                        <Edit3 size={16}/>
                                                    </button>
                                                    <button onClick={() => handleDeleteStock(stock.id)} className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors" title="Delete Material">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Delivery & Stock Report Modal (z-index is z-[99] to not hide toasts) */}
            {showReportModal && createPortal(
                <div className="fixed inset-0 z-[99] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                        
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800 shrink-0">
                            <h3 className="text-xl font-semibold text-slate-100 flex items-center gap-3">
                                <BarChart3 size={24} className="text-blue-500"/> Advanced Delivery & Stock Report
                            </h3>
                            <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-xl transition-colors"><X size={20}/></button>
                        </div>

                        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 mb-6 shrink-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Time Period</label>
                                <div className="flex gap-2 mb-2">
                                    <button onClick={() => setMonthDates('this_month')} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${reportFilters.dateType === 'this_month' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>This Month</button>
                                    <button onClick={() => setMonthDates('last_month')} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${reportFilters.dateType === 'last_month' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>Last Month</button>
                                    <button onClick={() => setReportFilters({...reportFilters, dateType: 'custom'})} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${reportFilters.dateType === 'custom' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>Custom</button>
                                </div>
                                {reportFilters.dateType === 'custom' && (
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={reportFilters.startDate} onChange={e => setReportFilters({...reportFilters, startDate: e.target.value})} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 [color-scheme:dark]"/>
                                        <span className="text-slate-500">-</span>
                                        <input type="date" value={reportFilters.endDate} onChange={e => setReportFilters({...reportFilters, endDate: e.target.value})} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 [color-scheme:dark]"/>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Business</label>
                                <select value={reportFilters.businessId} onChange={e => {setReportFilters({...reportFilters, businessId: e.target.value, batchId: ''}); fetchBatches(e.target.value);}} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500">
                                    <option value="">All Businesses</option>
                                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Payment Type</label>
                                <select value={reportFilters.paymentType} onChange={e => setReportFilters({...reportFilters, paymentType: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500">
                                    <option value="">All Types</option>
                                    <option value="Full">Full Payment</option>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Installment">Installment</option>
                                </select>
                            </div>

                            <div className="md:col-span-4 flex justify-end gap-3 mt-2 border-t border-slate-800 pt-4">
                                <button onClick={exportReportCSV} disabled={reportData.length === 0} className="bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 px-6 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                                    <Download size={16}/> Export CSV
                                </button>
                                <button onClick={generateReport} disabled={reportLoading} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2">
                                    {reportLoading ? <Loader2 size={16} className="animate-spin"/> : <BarChart3 size={16}/>} Generate Report
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/50 rounded-2xl border border-slate-800 relative">
                            {reportLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-blue-500"/></div>
                            ) : reportData.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                                    <FileText size={40} className="mb-3 opacity-30"/>
                                    <p className="text-sm font-medium">Select filters and generate report.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-800 sticky top-0 border-b border-slate-700 z-10">
                                        <tr className="text-xs uppercase text-slate-400">
                                            <th className="p-4 font-medium">Business / Batch</th>
                                            <th className="p-4 font-medium">Subject & Payment Grp</th>
                                            <th className="p-4 font-medium">Material Name</th>
                                            <th className="p-4 font-medium text-center">Total Delivered</th>
                                            <th className="p-4 font-medium text-center">Remaining Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {reportData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-semibold text-slate-200 text-sm">{row.businessName}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{row.batchName}</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-medium text-slate-300 text-sm">{row.courseName}</p>
                                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${row.paymentType === 'Monthly' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>{row.paymentType}</span>
                                                </td>
                                                <td className="p-4 text-sm text-slate-400">{row.tuteName}</td>
                                                <td className="p-4 text-center border-l border-r border-slate-800/50">
                                                    <span className="text-base font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">{row.deliveredQty}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-base font-semibold px-3 py-1 rounded-md border ${row.currentStock <= 10 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-slate-200 bg-slate-800 border-slate-700'}`}>
                                                        {row.currentStock}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* Edit Stock Modal */}
            {showEditModal && createPortal(
                <div className="fixed inset-0 z-[99] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2"><Edit3 size={20} className="text-blue-500"/> Adjust Stock</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-xl transition-colors"><X size={18}/></button>
                        </div>
                        <form onSubmit={handleEditStockSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-400 mb-1.5 block">New Total Quantity *</label>
                                <input type="number" required min="0" value={editData.qty} onChange={e => setEditData({...editData, qty: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 text-lg font-semibold text-center outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-400 mb-1.5 block">Reason for change *</label>
                                <input type="text" required placeholder="e.g. Recounted, Damaged" value={editData.reason} onChange={e => setEditData({...editData, reason: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors" />
                            </div>
                            <button type="submit" disabled={actionLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 font-medium transition-colors mt-2 disabled:opacity-50 text-sm">Update Balance</button>
                        </form>
                    </div>
                </div>, document.body
            )}
        </div>
    );
}