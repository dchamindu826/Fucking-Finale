import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box, Plus, X, Loader2, ArrowLeft, Building2, Layers, BookOpen, FileText, ChevronRight, AlertTriangle, Edit3, Trash2, History, AlertCircle, Calendar, ChevronLeft } from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';

export default function TuteStock() {
    const [viewLevel, setViewLevel] = useState('businesses');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [businesses, setBusinesses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [batchStock, setBatchStock] = useState([]);
    
    const [globalStock, setGlobalStock] = useState([]);

    const [selectedBiz, setSelectedBiz] = useState(null);
    const [selectedBatch, setSelectedBatch] = useState(null);

    const [subjectFilter, setSubjectFilter] = useState('ALL'); 
    const [stockInputs, setStockInputs] = useState({}); 

    const [showEditModal, setShowEditModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    
    const [editData, setEditData] = useState({ id: null, qty: '', reason: '' });

    const [stockHistory, setStockHistory] = useState([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    const [historyStartDate, setHistoryStartDate] = useState('');
    const [historyEndDate, setHistoryEndDate] = useState('');
    const [isGlobalHistory, setIsGlobalHistory] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

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

    const getImageUrl = (imageName) => (!imageName || imageName === 'default.png' || imageName === 'null') ? '/logo.png' : `${axios.defaults.baseURL.replace('/api', '')}/storage/icons/${imageName}`;
    const getTuteImageUrl = (imageName) => (!imageName || imageName === 'default-tute.png') ? null : `${axios.defaults.baseURL.replace('/api', '')}/storage/documents/${imageName}`;

    const handleSelectBusiness = async (biz) => {
        setSelectedBiz(biz);
        setViewLevel('batches');
        setLoading(true);
        try {
            const res = await axios.get(`/admin/batches/${biz.id}`);
            setBatches(res.data?.batches || res.data || []);
        } catch (error) { toast.error("Failed to load batches"); } 
        finally { setLoading(false); }
    };

    const handleSelectBatch = async (batch) => {
        setSelectedBatch(batch);
        setViewLevel('stock');
        fetchBatchStock(batch.id);
    };

    const fetchBatchStock = async (batchId) => {
        setLoading(true);
        try {
            const res = await axios.get(`/admin/delivery/stock/batch/${batchId}`);
            setBatchStock(res.data || []);
        } catch (error) { toast.error("Failed to load stock data"); } 
        finally { setLoading(false); }
    };

    const loadHistory = async (page = 1, isGlobal = isGlobalHistory) => {
        try {
            let url = isGlobal ? '/admin/delivery/stock/history/global' : `/admin/delivery/stock/history/${Array.from(new Set(batchStock.map(s => s.courseId))).join(',')}`;
            
            const params = new URLSearchParams({ page, limit: 10 });
            if (historyStartDate && historyEndDate) {
                params.append('startDate', historyStartDate);
                params.append('endDate', historyEndDate);
            }

            const res = await axios.get(`${url}?${params.toString()}`);
            setStockHistory(res.data.data);
            setHistoryPage(res.data.page);
            setHistoryTotalPages(res.data.totalPages);
            setIsGlobalHistory(isGlobal);
            setShowHistoryModal(true);
        } catch (e) { toast.error("Failed to load history"); }
    };

    const handleAddStock = async (stockId) => {
        const qty = parseInt(stockInputs[stockId]);
        if (!qty || isNaN(qty) || qty <= 0) return toast.error("Enter a valid quantity!");

        setActionLoading(true);
        try {
            await axios.post('/admin/delivery/stock/add', { stockId, quantity: qty, reason: "New printed stock added" });
            toast.success("Stock Added Successfully!");
            setStockInputs(prev => ({ ...prev, [stockId]: '' }));
            await fetchBatchStock(selectedBatch.id);
            fetchInitialData(); 
        } catch (error) { toast.error("Failed to update stock"); } 
        finally { setActionLoading(false); }
    };

    const handleEditStockSubmit = async (e) => {
        e.preventDefault();
        if (!editData.reason) return toast.error("A reason is required for adjustments!");
        
        setActionLoading(true);
        try {
            await axios.put('/admin/delivery/stock/edit', { stockId: editData.id, newQuantity: editData.qty, reason: editData.reason });
            toast.success("Stock Adjusted!");
            setShowEditModal(false);
            if (viewLevel === 'stock') await fetchBatchStock(selectedBatch.id);
            fetchInitialData();
        } catch (error) { toast.error("Failed to adjust stock"); } 
        finally { setActionLoading(false); }
    };

    const handleDeleteStock = async (stockId) => {
        const reason = window.prompt("Why are you deleting this stock item? (Required)");
        if (!reason) return toast.error("Deletion cancelled. Reason is required.");

        try {
            await axios.delete(`/admin/delivery/stock/delete/${stockId}?reason=${encodeURIComponent(reason)}`);
            toast.success("Stock Item Deleted!");
            if (viewLevel === 'stock') await fetchBatchStock(selectedBatch.id);
            fetchInitialData();
        } catch (error) { toast.error("Failed to delete item"); }
    };

    const globalLowStock = globalStock.filter(s => s.availableQuantity <= 10 && s.availableQuantity > 0);
    const globalOutStock = globalStock.filter(s => s.availableQuantity === 0);

    const uniqueCoursesMap = new Map();
    batchStock.forEach(stock => {
        if (stock.course && !uniqueCoursesMap.has(stock.course.id)) {
            uniqueCoursesMap.set(stock.course.id, {
                ...stock.course,
                stockId: stock.id, 
                tuteName: stock.tuteName 
            });
        }
    });

    const primarySubjects = Array.from(uniqueCoursesMap.values()).filter(course => {
        if (subjectFilter === 'ALL') return true;
        return course.group?.type === parseInt(subjectFilter);
    });

    const filteredBatchStock = batchStock;

    if (loading && viewLevel === 'businesses') return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;

    return (
        <div className="w-full text-slate-200 animate-in fade-in duration-500 font-sans h-[85vh] flex flex-col">
            
            <div className="mb-6 bg-slate-800/40 p-5 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg shrink-0">
                <div className="flex items-center gap-3 text-lg font-bold">
                    {viewLevel !== 'businesses' && (
                        <button onClick={() => { setViewLevel(viewLevel === 'stock' ? 'batches' : 'businesses'); setSubjectFilter('ALL'); }} className="bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-xl transition-colors">
                            <ArrowLeft size={20}/>
                        </button>
                    )}
                    <button onClick={() => { setViewLevel('businesses'); }} className={`${viewLevel === 'businesses' ? 'text-white' : 'text-slate-400 hover:text-white'} flex items-center gap-2`}><Building2 size={20}/> Businesses</button>
                    {selectedBiz && viewLevel !== 'businesses' && (
                        <><ChevronRight className="text-slate-600" size={16}/><span className={`${viewLevel === 'batches' ? 'text-white' : 'text-slate-400'} flex items-center gap-2`}><Layers size={18}/> {selectedBiz.name}</span></>
                    )}
                    {selectedBatch && viewLevel === 'stock' && (
                        <><ChevronRight className="text-slate-600" size={16}/><span className="text-blue-400 flex items-center gap-2"><Box size={18}/> {selectedBatch.name} Stock</span></>
                    )}
                </div>

                {viewLevel === 'businesses' && (
                    <button onClick={() => loadHistory(1, true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-colors font-bold text-sm flex items-center gap-2 shadow-lg"><History size={18}/> Global History</button>
                )}
            </div>

            {viewLevel === 'businesses' && (
                <div className="flex flex-col gap-6 overflow-y-auto pb-10 custom-scrollbar min-h-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                        <div className="bg-slate-800/50 border border-blue-500/20 p-5 rounded-2xl flex items-center justify-between">
                            <div><p className="text-slate-400 text-sm font-bold">Total Unique Tutes</p><h4 className="text-3xl font-black text-white">{globalStock.length}</h4></div>
                            <div className="bg-blue-500/20 p-4 rounded-2xl"><Box className="text-blue-400" size={28}/></div>
                        </div>
                        
                        <div className="bg-orange-500/10 border border-orange-500/30 p-5 rounded-2xl flex items-center justify-between relative group cursor-pointer">
                            <div><p className="text-orange-400/80 text-sm font-bold">Low Stock Alert (≤ 10)</p><h4 className="text-3xl font-black text-orange-400">{globalLowStock.length}</h4></div>
                            <div className={`${globalLowStock.length > 0 ? 'animate-pulse' : ''} bg-orange-500/20 p-4 rounded-2xl`}><AlertTriangle className="text-orange-400" size={28}/></div>
                            
                            {globalLowStock.length > 0 && (
                                <div className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-orange-500/30 rounded-2xl shadow-2xl p-4 hidden group-hover:block z-50">
                                    <h5 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Low Stock Items</h5>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                        {globalLowStock.map(ls => (
                                            <div key={`ls-${ls.id}`} className="flex justify-between items-center bg-black/30 p-2.5 rounded-xl border border-white/5">
                                                <div className="overflow-hidden pr-2"><p className="text-sm font-bold text-white truncate">{ls.course?.name}</p><p className="text-[10px] text-slate-400 truncate">{ls.course?.group?.batch?.business?.name || 'Unknown'}</p></div>
                                                <span className="text-red-400 font-black text-base bg-red-500/10 px-2 py-1 rounded-lg shrink-0">{ls.availableQuantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl flex items-center justify-between">
                            <div><p className="text-red-400/80 text-sm font-bold">Out of Stock</p><h4 className="text-3xl font-black text-red-400">{globalOutStock.length}</h4></div>
                            <div className="bg-red-500/20 p-4 rounded-2xl"><X className="text-red-400" size={28}/></div>
                        </div>

                        <div className="bg-slate-800/50 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
                            <div><p className="text-slate-400 text-sm font-bold">Total Businesses</p><h4 className="text-3xl font-black text-white">{businesses.length}</h4></div>
                            <div className="bg-white/5 p-4 rounded-2xl"><Building2 className="text-slate-400" size={28}/></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {businesses.map(biz => (
                            <div key={biz.id} onClick={() => handleSelectBusiness(biz)} className="bg-slate-800/40 hover:bg-blue-600/10 border border-white/10 hover:border-blue-500/50 p-6 rounded-3xl cursor-pointer transition-all flex flex-col items-center text-center gap-4 group shadow-lg">
                                <div className="w-24 h-24 bg-white/5 rounded-2xl p-3 border border-white/10 group-hover:scale-105 transition-transform"><img src={getImageUrl(biz.logo)} alt={biz.name} className="w-full h-full object-contain drop-shadow-lg" /></div>
                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400">{biz.name}</h3>
                                <span className="text-xs font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg text-slate-400">{biz.category}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewLevel === 'batches' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10 custom-scrollbar">
                    {loading ? <div className="col-span-full flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={40}/></div> : 
                    batches.length === 0 ? <p className="col-span-full text-center text-slate-500 py-10">No batches found for this business.</p> :
                    batches.map(batch => (
                        <div key={batch.id} onClick={() => handleSelectBatch(batch)} className="bg-slate-800/40 hover:bg-emerald-600/10 border border-white/10 hover:border-emerald-500/50 p-6 rounded-3xl cursor-pointer transition-all flex items-center gap-5 group shadow-lg">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform"><Layers className="text-emerald-400" size={28}/></div>
                            <div>
                                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400">{batch.name}</h3>
                                <p className="text-sm text-slate-400 mt-1">{batch.groups?.length || 0} Groups</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewLevel === 'stock' && (
                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                    
                    <div className="flex-1 bg-slate-800/30 border border-white/10 rounded-3xl p-6 flex flex-col min-h-0 shadow-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><BookOpen className="text-blue-400"/> Primary Subjects</h3>
                        </div>

                        <div className="flex gap-2 mb-6 shrink-0 p-1.5 bg-black/30 rounded-xl w-max border border-white/5">
                            {[{ id: 'ALL', label: 'All Subjects' }, { id: 1, label: 'Monthly' }, { id: 2, label: 'Full Payment' }].map(tab => (
                                <button key={tab.id} onClick={() => setSubjectFilter(tab.id)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${subjectFilter === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={30}/></div> :
                            primarySubjects.length === 0 ? <p className="text-center text-slate-500 py-10">No subjects found for this filter.</p> :
                            primarySubjects.map(course => {
                                const lecImg = getImageUrl(course.groupPrices ? JSON.parse(course.groupPrices)[0]?.lecturerImage : null);
                                const availableStockCount = batchStock.find(s => s.id === course.stockId)?.availableQuantity || 0;
                                
                                return (
                                    <div key={`prim-${course.id}`} className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <img src={lecImg} alt="Lecturer" className="w-12 h-12 rounded-full object-cover border-2 border-white/10 bg-slate-800 shrink-0" />
                                            <div className="overflow-hidden">
                                                <h4 className="font-bold text-white text-base truncate">{course.name}</h4>
                                                <p className="text-xs text-blue-400 font-bold mt-0.5 flex items-center gap-1">
                                                    📦 Stock: <span className="text-white bg-blue-500/20 px-2 py-0.5 rounded shadow-sm">{availableStockCount} Available</span>
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded shadow-sm ${course.group?.type === 1 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>{course.group?.type === 1 ? 'Monthly' : 'Full Payment'}</span>
                                                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold bg-white/5 px-2 py-1 rounded inline-block truncate max-w-full border border-white/10">{course.lecturerName || 'No Lecturer'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-3 md:mt-0">
                                            <input 
                                                type="number" min="1" placeholder="Qty" 
                                                value={stockInputs[course.stockId] || ''}
                                                onChange={(e) => setStockInputs({...stockInputs, [course.stockId]: e.target.value})}
                                                className="w-20 bg-slate-900 border border-white/10 rounded-xl p-2.5 text-white text-center outline-none focus:border-emerald-500 font-bold shadow-inner"
                                            />
                                            <button onClick={() => handleAddStock(course.stockId)} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-colors disabled:opacity-50">
                                                <Plus size={16}/> Add
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="w-full lg:w-[400px] xl:w-[450px] bg-slate-800/50 border border-emerald-500/20 rounded-3xl p-6 flex flex-col shrink-0 min-h-0 relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>
                        
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2"><Box size={22}/> Full Inventory</h3>
                            <button onClick={() => loadHistory(1, false)} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-xl transition-colors font-bold text-xs uppercase tracking-widest flex items-center gap-2"><History size={16}/> History</button>
                        </div>

                        <div className="flex gap-3 mb-5 shrink-0">
                            <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Subjects</span>
                                <span className="text-2xl font-black text-white">{filteredBatchStock.length}</span>
                            </div>
                            <div className="flex-1 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                                <span className="text-[10px] text-orange-400/80 font-black uppercase tracking-widest mb-1">Low Stock</span>
                                <span className="text-2xl font-black text-orange-400">{filteredBatchStock.filter(s => s.availableQuantity <= 10).length}</span>
                            </div>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar pr-2 space-y-3 flex-1">
                            {filteredBatchStock.map(stock => {
                                const tuteImg = getTuteImageUrl(stock.tuteImage);
                                const isLow = stock.availableQuantity <= 10;
                                return (
                                    <div key={`inv-${stock.id}`} className={`p-4 rounded-2xl flex items-center justify-between gap-4 border transition-colors group bg-black/40 ${isLow ? 'border-red-500/30' : 'border-white/5 hover:border-white/10'}`}>
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            {tuteImg ? <img src={tuteImg} alt="Cover" className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0 shadow-sm" /> : <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0"><FileText size={18} className="text-slate-400"/></div>}
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold text-white truncate" title={stock.course?.name}>{stock.course?.name || "Extra Custom Item"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {isLow && <AlertCircle size={14} className="text-red-400 animate-pulse"/>}
                                            <div className={`text-xl font-black ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>{stock.availableQuantity}</div>
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditData({ id: stock.id, qty: stock.availableQuantity, reason: '' }); setShowEditModal(true); }} className="text-blue-400 hover:text-blue-300 bg-blue-500/10 p-1.5 rounded-md"><Edit3 size={14}/></button>
                                                <button onClick={() => handleDeleteStock(stock.id)} className="text-red-400 hover:text-red-300 bg-red-500/10 p-1.5 rounded-md"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredBatchStock.length === 0 && !loading && <p className="text-center text-slate-500 py-10 text-sm">No inventory items found.</p>}
                        </div>
                    </div>

                </div>
            )}

            {showEditModal && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#15192b] border border-blue-500/20 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-white flex items-center gap-2"><Edit3 size={22} className="text-blue-400"/> Adjust Stock</h3><button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-red-400 bg-white/5 p-2 rounded-xl"><X size={18}/></button></div>
                        <form onSubmit={handleEditStockSubmit} className="space-y-5">
                            <div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">New Total Quantity *</label><input type="number" required min="0" value={editData.qty} onChange={e => setEditData({...editData, qty: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-2xl font-black text-center outline-none focus:border-blue-500 shadow-inner" /></div>
                            <div><label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Reason for change *</label><input type="text" required placeholder="e.g. Recounted, Damaged, Error" value={editData.reason} onChange={e => setEditData({...editData, reason: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 shadow-inner" /></div>
                            <button type="submit" disabled={actionLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 font-black transition-all shadow-lg mt-4 disabled:opacity-50">Update Balance</button>
                        </form>
                    </div>
                </div>, document.body
            )}

            {showHistoryModal && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <div className="bg-[#15192b] border border-white/10 rounded-3xl p-8 w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 gap-4 border-b border-white/10 pb-6">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3"><History size={26} className="text-blue-400"/> {isGlobalHistory ? 'Global Stock History' : 'Batch Stock History'}</h3>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center bg-black/40 rounded-xl border border-white/10 p-1">
                                    <Calendar className="text-slate-400 ml-2" size={16}/>
                                    <input type="date" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} className="bg-transparent text-sm text-slate-300 outline-none px-2 py-1.5 [color-scheme:dark]"/>
                                    <span className="text-slate-600">-</span>
                                    <input type="date" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} className="bg-transparent text-sm text-slate-300 outline-none px-2 py-1.5 [color-scheme:dark]"/>
                                </div>
                                <button onClick={() => loadHistory(1)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-md">Filter</button>
                                <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-red-400 bg-white/5 p-2 rounded-xl ml-2"><X size={20}/></button>
                            </div>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-3">
                            {stockHistory.length === 0 ? <p className="text-center text-slate-500 py-20 text-lg">No history records found for this period.</p> :
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-400">
                                        <th className="pb-3 font-bold">Date & Time</th>
                                        <th className="pb-3 font-bold">Subject / Tute Name</th>
                                        <th className="pb-3 font-bold">Action</th>
                                        <th className="pb-3 font-bold text-center">Qty Change</th>
                                        <th className="pb-3 font-bold">Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockHistory.map(h => (
                                        <tr key={h.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-4 text-sm text-slate-300 whitespace-nowrap">{new Date(h.createdAt).toLocaleString()}</td>
                                            <td className="py-4">
                                                <p className="text-sm font-bold text-white">{h.course?.name || "Unknown Course"}</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{h.tuteName}</p>
                                            </td>
                                            <td className="py-4">
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${h.action === 'ADDED' ? 'bg-emerald-500/20 text-emerald-400' : h.action === 'REDUCED' ? 'bg-orange-500/20 text-orange-400' : h.action === 'DELETED' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{h.action}</span>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center justify-center gap-3">
                                                    <span className="text-xs text-slate-500 line-through">{h.oldQuantity}</span>
                                                    <ArrowLeft size={12} className="text-slate-600 rotate-180"/>
                                                    <span className="text-base font-black text-white">{h.newQuantity}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-sm text-slate-300 max-w-xs truncate" title={h.reason}>{h.reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>}
                        </div>

                        {historyTotalPages > 1 && (
                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10 shrink-0">
                                <span className="text-sm text-slate-400">Page <strong className="text-white">{historyPage}</strong> of <strong className="text-white">{historyTotalPages}</strong></span>
                                <div className="flex gap-2">
                                    <button onClick={() => loadHistory(historyPage - 1)} disabled={historyPage === 1} className="bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors"><ChevronLeft size={16}/> Prev</button>
                                    <button onClick={() => loadHistory(historyPage + 1)} disabled={historyPage === historyTotalPages} className="bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors">Next <ChevronRight size={16}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>, document.body
            )}

        </div>
    );
}