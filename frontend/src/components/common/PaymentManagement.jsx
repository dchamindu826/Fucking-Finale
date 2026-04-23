import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check, X as CloseIcon, Clock, ShieldCheck, Wallet, CalendarDays, AlertCircle, Unlock, Loader2, User, Tag, Gift, FileImage, MessageSquare, Trash2, ChevronLeft, ChevronRight, CreditCard, FileText } from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

export default function PaymentManagement({ loggedInUser }) {
    const isAdmin = loggedInUser?.role?.toUpperCase() === 'SYSTEM_ADMIN' || loggedInUser?.role?.toUpperCase() === 'DIRECTOR';
    
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);
    const [businesses, setBusinesses] = useState([]); 
    const [allBatches, setAllBatches] = useState([]); 
    const [activeTab, setActiveTab] = useState('Pending'); 

    const [searchQuery, setSearchQuery] = useState('');
    const [filterBusinessId, setFilterBusinessId] = useState('All');
    const [availableBatches, setAvailableBatches] = useState([]); 
    const [filterBatch, setFilterBatch] = useState('All');
    const [filterPaymentType, setFilterPaymentType] = useState('All'); 

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [studentActionModal, setStudentActionModal] = useState(null); 
    const [actioningPaymentId, setActioningPaymentId] = useState(null);

    const [installmentModal, setInstallmentModal] = useState(null);
    const [nextDueDate, setNextDueDate] = useState('');
    const [isTestApprove, setIsTestApprove] = useState(false);

    const [advancedActionModal, setAdvancedActionModal] = useState(null); 
    const [customPrices, setCustomPrices] = useState({}); 
    const [actionRemark, setActionRemark] = useState('');
    const [postPayDays, setPostPayDays] = useState(3);

    // 🔥 NEW: Slip View Modal State
    const [viewSlipUrl, setViewSlipUrl] = useState(null);

    const getDefaultNextDueDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const payRes = await axios.get('/admin/payments');
            setPayments(payRes.data || []);
            if (isAdmin) {
                const bizRes = await axios.get('/admin/businesses');
                setBusinesses(bizRes.data || []);
            }
            try {
                const batchRes = await axios.get('/admin/manager/batches-full');
                setAllBatches(batchRes.data || []);
            } catch(e) {}
        } catch (error) {
            toast.error("Failed to load data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [isAdmin]);

    useEffect(() => {
        if (filterBusinessId === 'All') {
            const uniqueBatches = [...new Set(payments.map(p => p.batch).filter(Boolean))];
            setAvailableBatches(uniqueBatches);
        } else {
            axios.get(`/admin/batches/${filterBusinessId}`)
                .then(res => {
                    const bData = res.data.batches || res.data || [];
                    setAvailableBatches(bData.map(b => b.name));
                }).catch(err => console.error(err));
        }
    }, [filterBusinessId, payments]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, filterBusinessId, filterBatch, filterPaymentType]);

    const filteredPayments = payments.filter(p => {
        let matchesTab = false;
        
        if (activeTab === 'PayHere') {
            matchesTab = p.method === 'PayHere' && p.status !== 'Trash';
        } else if (activeTab === 'Trash') {
            matchesTab = p.status === 'Trash';
        } else {
            matchesTab = p.status === activeTab && p.method !== 'PayHere' && p.status !== 'Trash';
        }

        const matchesSearch = p.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || p.studentNo?.toLowerCase().includes(searchQuery.toLowerCase());
        
        let matchesBiz = true;
        if (filterBusinessId !== 'All') {
            const selectedBiz = businesses.find(b => b.id.toString() === filterBusinessId);
            matchesBiz = p.business === selectedBiz?.name;
        }

        const matchesBatch = filterBatch === 'All' || p.batch === filterBatch;
        const matchesType = filterPaymentType === 'All' || p.type === filterPaymentType;
        
        return matchesTab && matchesSearch && matchesBiz && matchesBatch && matchesType;
    });

    const groupedAllByStudent = payments.reduce((acc, pay) => {
        if (!acc[pay.studentId]) {
            acc[pay.studentId] = { studentId: pay.studentId, studentName: pay.studentName, studentNo: pay.studentNo, allPayments: [] };
        }
        acc[pay.studentId].allPayments.push(pay);
        return acc;
    }, {});

    const visibleStudentIds = [...new Set(filteredPayments.map(p => p.studentId))];
    const visibleStudents = visibleStudentIds.map(id => groupedAllByStudent[id]);

    const totalPages = Math.ceil(visibleStudents.length / itemsPerPage) || 1;
    const paginatedStudents = visibleStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleAction = async (payment, action) => {
        if ((action === 'Approve' || action === 'Test Approve') && payment.type === 'Installment' && payment.status !== 'Approved') {
            setInstallmentModal(payment);
            setNextDueDate(getDefaultNextDueDate());
            setIsTestApprove(action === 'Test Approve');
            return;
        }

        if(!window.confirm(`Are you sure you want to ${action} this payment?`)) return;
        
        try {
            setActioningPaymentId(payment.id);
            await axios.post('/admin/payments/action', { paymentId: payment.id, action: action });
            toast.success(`Payment processed as ${action}!`);
            refreshAfterAction(payment.studentId);
        } catch (error) {
            toast.error(`Failed to process payment.`);
        } finally {
            setActioningPaymentId(null);
        }
    };

    const handleInstallmentApprove = async (e) => {
        e.preventDefault();
        try {
            const actionType = isTestApprove ? 'Test Approve' : 'Approve';
            await axios.post('/admin/payments/action/installment', { 
                paymentId: installmentModal.id, 
                nextDueDate: nextDueDate,
                action: actionType 
            });
            toast.success(`Installment ${actionType}d & Next Scheduled!`);
            const targetStudentId = installmentModal.studentId;
            setInstallmentModal(null);
            refreshAfterAction(targetStudentId);
        } catch (error) {
            toast.error("Failed to process installment.");
        }
    };

    const submitAdvancedAction = async () => {
        const { type, payment } = advancedActionModal;

        if ((type === 'Discount' || type === 'FreeCard') && actionRemark.trim() === '') {
            return toast.error("A remark is mandatory for Discounts and Free Cards.");
        }

        try {
            setActioningPaymentId(payment.id);

            if (type === 'PostPay') {
                await axios.post('/admin/payments/post-pay', { paymentId: payment.id, days: postPayDays });
                toast.success(`Post Pay granted for ${postPayDays} days!`);
            } else {
                let finalAmount = 0;
                let detailedRemark = actionRemark;

                if (type === 'Discount') {
                    finalAmount = payment.subjectsList.reduce((sum, sub) => sum + (parseFloat(customPrices[sub.id]) || 0), 0);
                    const breakdownStr = payment.subjectsList.map(sub => `${sub.code}: LKR ${customPrices[sub.id] || 0}`).join(' | ');
                    detailedRemark = `Custom Breakdown: [${breakdownStr}]\nReason: ${actionRemark}`;
                }

                await axios.post('/admin/payments/action', {
                    paymentId: payment.id,
                    action: type === 'FreeCard' ? 'Free Card' : 'Discount',
                    customAmount: finalAmount,
                    remark: detailedRemark
                });
                toast.success(`Payment processed as ${type === 'FreeCard' ? 'Free Card' : 'Discount'}!`);
            }

            setAdvancedActionModal(null);
            setActionRemark('');
            refreshAfterAction(payment.studentId);
        } catch (error) {
            toast.error("Failed to process action.");
        } finally {
            setActioningPaymentId(null);
        }
    };

    const refreshAfterAction = async (studentId) => {
        const payRes = await axios.get('/admin/payments');
        setPayments(payRes.data || []);
        if(studentActionModal) {
            const updatedStudentPayments = payRes.data.filter(p => p.studentId === studentId);
            if (updatedStudentPayments.length === 0) setStudentActionModal(null);
            else setStudentActionModal({ ...studentActionModal, allPayments: updatedStudentPayments });
        }
    };

    const openAdvancedModal = (type, payment) => {
        setAdvancedActionModal({ type, payment });
        setActionRemark('');
        if (type === 'Discount') {
            const initialPrices = {};
            payment.subjectsList.forEach(s => initialPrices[s.id] = s.price || 0);
            setCustomPrices(initialPrices);
        }
    };

    const handleCustomPriceChange = (id, val) => {
        setCustomPrices(prev => ({ ...prev, [id]: val }));
    };

    const getTabClass = (tabName) => {
        const base = "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap border";
        if (activeTab !== tabName) return `${base} bg-white/5 border-white/5 text-slate-400 hover:bg-white/10`;
        switch(tabName) {
            case 'Pending': return `${base} bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20`;
            case 'Approved': return `${base} bg-blue-500/20 text-blue-400 border-blue-500/30`;
            case 'PayHere': return `${base} bg-indigo-500/20 text-indigo-400 border-indigo-500/30`;
            case 'Free Card': return `${base} bg-yellow-500/20 text-yellow-400 border-yellow-500/30`;
            case 'Discount': return `${base} bg-cyan-500/20 text-cyan-400 border-cyan-500/30`;
            case 'Rejected': return `${base} bg-red-500/20 text-red-400 border-red-500/30`;
            case 'Upcoming': return `${base} bg-purple-500/20 text-purple-400 border-purple-500/30`;
            case 'Non Paid': return `${base} bg-red-500/20 text-red-400 border-red-500/30`;
            case 'Post Pay': return `${base} bg-orange-500/20 text-orange-400 border-orange-500/30`;
            case 'Trash': return `${base} bg-slate-700 text-white border-slate-600 shadow-lg`;
            default: return `${base} bg-white/10 text-white border-white/20`;
        }
    };

    return (
        <div className="w-full animate-fade-in text-slate-200 pb-10 font-sans relative">
            <div className="flex items-center gap-4 mb-8 bg-[#1e2336]/60 p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-xl backdrop-blur-xl">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 shrink-0">
                    <Wallet size={28}/>
                </div>
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide">Payment Hub</h2>
                    <p className="text-slate-400 font-medium text-sm mt-1">Manage student payments, slips, and tally with system prices.</p>
                </div>
            </div>

            <div className="bg-[#1e2336]/60 p-5 rounded-2xl border border-white/5 mb-6 shadow-lg backdrop-blur-xl">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                        <input type="text" placeholder="Search by Student Name or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-white outline-none focus:border-emerald-500/50 transition-colors text-sm" />
                    </div>
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        {isAdmin && (
                            <select value={filterBusinessId} onChange={e => {setFilterBusinessId(e.target.value); setFilterBatch('All');}} className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50 cursor-pointer min-w-[150px] appearance-none">
                                <option value="All">All Businesses</option>
                                {businesses.map(biz => <option key={biz.id} value={biz.id}>{biz.name}</option>)}
                            </select>
                        )}
                        <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50 cursor-pointer min-w-[140px] appearance-none">
                            <option value="All">All Batches</option>
                            {availableBatches.map(batchName => <option key={batchName} value={batchName}>{batchName}</option>)}
                        </select>
                        <select value={filterPaymentType} onChange={e => setFilterPaymentType(e.target.value)} className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500/50 cursor-pointer min-w-[120px] appearance-none">
                            <option value="All">All Types</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Installment">Installments</option>
                            <option value="Full">Full</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 mb-8 pb-2 overflow-x-auto custom-scrollbar">
                <button onClick={() => setActiveTab('Pending')} className={getTabClass('Pending')}><Clock size={16}/> Pending</button>
                <button onClick={() => setActiveTab('Approved')} className={getTabClass('Approved')}><Check size={16}/> Approved</button>
                <button onClick={() => setActiveTab('PayHere')} className={getTabClass('PayHere')}><CreditCard size={16}/> PayHere</button>
                <button onClick={() => setActiveTab('Free Card')} className={getTabClass('Free Card')}><Gift size={16}/> Free Card</button>
                <button onClick={() => setActiveTab('Discount')} className={getTabClass('Discount')}><Tag size={16}/> Discount</button>
                <button onClick={() => setActiveTab('Rejected')} className={getTabClass('Rejected')}><CloseIcon size={16}/> Rejected</button>
                <button onClick={() => setActiveTab('Non Paid')} className={getTabClass('Non Paid')}><AlertCircle size={16}/> Non Paid</button>
                <button onClick={() => setActiveTab('Post Pay')} className={getTabClass('Post Pay')}><Unlock size={16}/> Post Pay</button>
                <button onClick={() => setActiveTab('Upcoming')} className={getTabClass('Upcoming')}><CalendarDays size={16}/> Upcoming Dues</button>
                <button onClick={() => setActiveTab('Trash')} className={getTabClass('Trash')}><Trash2 size={16}/> Trash</button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin text-emerald-500 mx-auto" size={40}/></div>
                ) : paginatedStudents.length === 0 ? (
                    <div className="text-center py-20 bg-[#1e2336]/40 rounded-[2rem] border border-white/5"><p className="text-slate-500 font-bold text-lg">No records found for this section.</p></div>
                ) : (
                    <>
                        {paginatedStudents.map(student => {
                            const matchingPayments = student.allPayments.filter(p => {
                                if (activeTab === 'PayHere') return p.method === 'PayHere' && p.status !== 'Trash';
                                if (activeTab === 'Trash') return p.status === 'Trash';
                                return p.status === activeTab && p.method !== 'PayHere' && p.status !== 'Trash';
                            });
                            
                            const latestPayment = matchingPayments[0];

                            return (
                            <div key={student.studentId} className="bg-[#1e2336]/80 border border-white/5 hover:border-white/10 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row items-start justify-between gap-6 transition-colors shadow-lg">
                                <div className="flex items-start gap-4 flex-1 w-full">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 mt-1">
                                        <User size={26} strokeWidth={1.5}/>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg text-white flex items-center gap-3">
                                            {student.studentName} 
                                            <span className="text-[10px] font-bold text-white/50 bg-black/40 px-2.5 py-1 rounded-md border border-white/5 tracking-widest uppercase">{student.studentNo}</span>
                                        </h4>
                                        {latestPayment && (
                                            <>
                                                <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
                                                    <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded">{latestPayment.date}</span>
                                                    <span>• {latestPayment.business}</span>
                                                    <span>• {latestPayment.batch}</span>
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-3 items-center">
                                                    <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-3 py-1 rounded-md border border-blue-500/20 uppercase tracking-widest">Type: {latestPayment.type}</span>
                                                    <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-3 py-1 rounded-md border border-purple-500/20 uppercase tracking-widest">Method: {latestPayment.method}</span>
                                                    {matchingPayments.length > 1 && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">+{matchingPayments.length - 1} more in queue</span>}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t border-white/5 md:border-t-0 pt-4 md:pt-0 shrink-0">
                                    <button onClick={() => setStudentActionModal(student)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg whitespace-nowrap">
                                        Review & Action
                                    </button>
                                </div>
                            </div>
                        )})}

                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-6 bg-[#1e2336]/40 p-4 rounded-xl border border-white/5">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16}/> Prev</button>
                                <span className="text-sm font-bold text-white bg-black/40 px-4 py-1.5 rounded-lg border border-white/5">Page {currentPage} of {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next <ChevronRight size={16}/></button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {studentActionModal && createPortal(
                <div className="fixed inset-0 z-[9990] bg-[#0a0f1c]/95 backdrop-blur-sm overflow-y-auto custom-scrollbar p-2 md:p-6 flex items-start justify-center">
                    <div className="bg-[#15192b] border border-white/10 rounded-[2rem] w-full max-w-6xl shadow-2xl relative animate-in zoom-in-95 duration-200 mt-4 md:mt-10 mb-10 flex flex-col">
                        
                        <div className="sticky top-0 z-50 bg-[#15192b] border-b border-white/5 p-6 rounded-t-[2rem] flex justify-between items-center shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex justify-center items-center"><User size={24}/></div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-wide">{studentActionModal.studentName}</h3>
                                    <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase">{studentActionModal.studentNo}</p>
                                </div>
                            </div>
                            <button onClick={() => setStudentActionModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2.5 rounded-xl transition-all"><CloseIcon size={20} strokeWidth={3} /></button>
                        </div>

                        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            <div className="lg:col-span-2 space-y-6">
                                <h4 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2"><AlertCircle className="text-red-500" size={16}/> Target Records ({activeTab})</h4>
                                
                                {studentActionModal.allPayments.filter(p => {
                                    if (activeTab === 'PayHere') return p.method === 'PayHere' && p.status !== 'Trash';
                                    if (activeTab === 'Trash') return p.status === 'Trash';
                                    return p.status === activeTab && p.method !== 'PayHere' && p.status !== 'Trash';
                                }).length === 0 && (
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center text-slate-400 text-sm font-bold">No payments mapped to this tab currently.</div>
                                )}

                                {studentActionModal.allPayments.filter(p => {
                                    if (activeTab === 'PayHere') return p.method === 'PayHere' && p.status !== 'Trash';
                                    if (activeTab === 'Trash') return p.status === 'Trash';
                                    return p.status === activeTab && p.method !== 'PayHere' && p.status !== 'Trash';
                                }).map(pay => (
                                    <div key={pay.id} className="bg-black/30 border border-white/10 rounded-2xl p-5 md:p-6 relative overflow-hidden mb-4">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                        
                                        <div className="absolute top-4 right-4">
                                            {pay.status !== 'Trash' && (
                                                <button onClick={() => handleAction(pay, 'Trash')} className="bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/30 p-2 rounded-lg transition-all" title="Move to Trash">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-col justify-between items-start gap-4 mb-6 pr-10">
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">{pay.date}</p>
                                                <h5 className="text-lg font-black text-white">{pay.business} <span className="text-slate-400 text-sm font-medium">| {pay.batch}</span></h5>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="bg-white/10 text-white text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest">{pay.type}</span>
                                                    {/* 🔥 FIX: Math.max to prevent "Phase 3 of 2" logic bugs */}
                                                    {pay.type === 'Installment' && (
                                                        <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest border border-purple-500/30">
                                                            Phase {pay.installmentNo} of {Math.max(pay.installmentNo, pay.totalPhases || 1)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 min-w-[140px]">
                                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Paid via {pay.method}</p>
                                                <p className="text-2xl font-black text-white">LKR {parseFloat(pay.amount).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-6">
                                            <h6 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldCheck size={14}/> System Tally</h6>
                                            
                                            {pay.subjectsList && pay.subjectsList.length > 0 ? (
                                                <div className="space-y-2 mb-4">
                                                    {pay.subjectsList.map((sub, i) => (
                                                        <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                                            <span className="text-white font-medium">{sub.name} <span className="text-xs text-slate-500">({sub.code})</span></span>
                                                            <span className="text-emerald-400 font-bold">LKR {parseFloat(sub.price).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between items-center text-sm pt-2">
                                                        <span className="text-white font-black">System Expected Total:</span>
                                                        <span className="text-red-400 font-black text-lg">LKR {parseFloat(pay.systemTotal).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500 mb-4">No specific subjects selected or recognized.</p>
                                            )}

                                            {pay.type === 'Installment' ? (
                                                <div className="p-3 rounded-lg text-xs font-bold flex items-center justify-between border bg-purple-500/10 text-purple-400 border-purple-500/20">
                                                    <span>Amount on Slip: LKR {parseFloat(pay.amount).toLocaleString()}</span>
                                                    <span>Partial Installment Expected</span>
                                                </div>
                                            ) : (
                                                <div className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between border ${parseFloat(pay.systemTotal) === parseFloat(pay.amount) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    <span>Amount on Slip: LKR {parseFloat(pay.amount).toLocaleString()}</span>
                                                    {parseFloat(pay.systemTotal) !== parseFloat(pay.amount) && <span>Mismatch Detected!</span>}
                                                    {parseFloat(pay.systemTotal) === parseFloat(pay.amount) && <span>Perfect Match!</span>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><FileImage size={14}/> Attached Slips</p>
                                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                    {/* 🔥 FIX: Handling PDFs and clickable Iframe Views */}
                                                    {pay.slips.length > 0 ? pay.slips.map((imgStr, i) => {
                                                        const fileUrl = `http://72.62.249.211:5000/documents/${imgStr}`;
                                                        const isPdf = imgStr.toLowerCase().endsWith('.pdf');
                                                        return (
                                                            <div key={i} onClick={() => setViewSlipUrl(fileUrl)} className="shrink-0 w-20 h-20 border border-white/10 rounded-lg overflow-hidden hover:border-emerald-500 transition-colors cursor-pointer bg-black/40 flex items-center justify-center">
                                                                {isPdf ? (
                                                                    <div className="flex flex-col items-center text-white/50 text-[10px] font-bold uppercase"><FileText size={24} className="text-red-400 mb-1"/> PDF</div>
                                                                ) : (
                                                                    <img src={fileUrl} alt="slip" className="h-full w-full object-cover" onError={(e)=>{e.target.src='/logo.png'}}/>
                                                                )}
                                                            </div>
                                                        )
                                                    }) : <span className="text-xs text-slate-500">No slips uploaded.</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><MessageSquare size={14}/> System Remark</p>
                                                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-slate-300 italic min-h-[80px] whitespace-pre-wrap">
                                                    {pay.remark ? pay.remark : "No remark."}
                                                </div>
                                            </div>
                                        </div>

                                        {['Pending', 'Non Paid', 'Upcoming', 'Rejected'].includes(activeTab) && pay.status !== 'Approved' && (
                                            <div className="bg-[#1e2336] rounded-xl border border-white/10 p-4">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Process Payment</p>
                                                
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <button disabled={actioningPaymentId === pay.id} onClick={() => handleAction(pay, 'Approve')} className="flex-1 min-w-[120px] bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex justify-center items-center gap-2">
                                                        {actioningPaymentId === pay.id ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>} Normal Approve
                                                    </button>
                                                    
                                                    {pay.type === 'Installment' && (
                                                        <button disabled={actioningPaymentId === pay.id} onClick={() => openAdvancedModal('PostPay', pay)} className="flex-1 min-w-[120px] bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-widest flex justify-center items-center gap-2">
                                                            <Unlock size={16}/> Temp Unlock
                                                        </button>
                                                    )}

                                                    <button disabled={actioningPaymentId === pay.id} onClick={() => handleAction(pay, 'Reject')} className="flex-1 min-w-[120px] bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-widest flex justify-center items-center gap-2">
                                                        <CloseIcon size={16}/> Reject
                                                    </button>
                                                </div>

                                                <div className="flex flex-col md:flex-row gap-2 border-t border-white/5 pt-3">
                                                    <button disabled={actioningPaymentId === pay.id} onClick={() => openAdvancedModal('FreeCard', pay)} className="flex-1 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 font-bold py-2.5 rounded-xl transition-all text-xs uppercase tracking-widest flex justify-center items-center gap-2">
                                                        <Gift size={14}/> Free Card (LKR 0)
                                                    </button>
                                                    <button disabled={actioningPaymentId === pay.id} onClick={() => openAdvancedModal('Discount', pay)} className="flex-1 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 font-bold py-2.5 rounded-xl transition-all text-xs uppercase tracking-widest flex justify-center items-center gap-2">
                                                        <Tag size={14}/> Custom Approval
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="bg-black/20 rounded-[1.5rem] border border-white/5 p-5 h-max sticky top-24">
                                <h4 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2 mb-4"><Clock className="text-blue-500" size={16}/> Payment History</h4>
                                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                    {studentActionModal.allPayments.filter(p => {
                                        const isActiveTabMatch = activeTab === 'PayHere' ? p.method === 'PayHere' && p.status !== 'Trash' : (activeTab === 'Trash' ? p.status === 'Trash' : p.status === activeTab && p.method !== 'PayHere' && p.status !== 'Trash');
                                        return !isActiveTabMatch; 
                                    }).length === 0 && (
                                        <p className="text-xs text-slate-500 italic">No past payment history.</p>
                                    )}
                                    
                                    {studentActionModal.allPayments.filter(p => {
                                        const isActiveTabMatch = activeTab === 'PayHere' ? p.method === 'PayHere' && p.status !== 'Trash' : (activeTab === 'Trash' ? p.status === 'Trash' : p.status === activeTab && p.method !== 'PayHere' && p.status !== 'Trash');
                                        return !isActiveTabMatch; 
                                    }).map(hist => (
                                        <div key={hist.id} className={`bg-white/5 rounded-xl p-3 border ${hist.status === 'Trash' ? 'border-red-500/30 opacity-60' : 'border-white/5'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${hist.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : hist.status === 'Trash' ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{hist.status}</span>
                                                <span className="text-[10px] text-slate-500">{hist.date}</span>
                                            </div>
                                            <p className="text-sm font-bold text-white leading-tight">{hist.business}</p>
                                            <p className="text-xs text-slate-400 mb-2">{hist.batch}</p>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500">{hist.type}</span>
                                                <span className="font-black text-white">LKR {parseFloat(hist.amount).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {advancedActionModal && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-[#15192b] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <h3 className="text-xl font-black text-white">
                                {advancedActionModal.type === 'Discount' && 'Set Custom Prices'}
                                {advancedActionModal.type === 'FreeCard' && 'Grant Free Card'}
                                {advancedActionModal.type === 'PostPay' && 'Temp Unlock (Post Pay)'}
                            </h3>
                            <button onClick={() => setAdvancedActionModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"><CloseIcon size={20} /></button>
                        </div>

                        {advancedActionModal.type === 'Discount' && (
                            <div className="space-y-4 mb-6">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Subject Breakdown</p>
                                {advancedActionModal.payment.subjectsList.map(sub => (
                                    <div key={sub.id} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                                        <div className="flex-1 pr-4 truncate">
                                            <p className="text-sm font-bold text-white truncate">{sub.name}</p>
                                            <p className="text-[10px] text-slate-500">System: LKR {parseFloat(sub.price).toLocaleString()}</p>
                                        </div>
                                        <div className="w-1/3 relative shrink-0">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">LKR</span>
                                            <input type="number" value={customPrices[sub.id] || ''} onChange={e => handleCustomPriceChange(sub.id, e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white font-bold outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-2 px-2">
                                    <span className="text-slate-400 text-sm font-bold">Calculated Total:</span>
                                    <span className="text-blue-400 text-xl font-black">
                                        LKR {Object.values(customPrices).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}

                        {advancedActionModal.type === 'PostPay' && (
                            <div className="mb-6">
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2 block">Grant Access For (Days)</label>
                                <input type="number" min="1" value={postPayDays} onChange={e => setPostPayDays(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-orange-500 text-lg" />
                            </div>
                        )}

                        {(advancedActionModal.type === 'Discount' || advancedActionModal.type === 'FreeCard') && (
                            <div className="mb-6">
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2 block flex items-center gap-1">Admin Remark <span className="text-red-500">*</span></label>
                                <textarea value={actionRemark} onChange={e => setActionRemark(e.target.value)} placeholder="Why are you giving this discount/free card?" rows="3" className="w-full bg-black/40 border border-red-500/20 rounded-xl p-3 text-sm text-white outline-none focus:border-red-500 transition-colors resize-none"></textarea>
                            </div>
                        )}

                        <button disabled={actioningPaymentId !== null} onClick={submitAdvancedAction} className={`w-full font-black py-4 rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg ${advancedActionModal.type === 'Discount' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20' : advancedActionModal.type === 'FreeCard' ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20'}`}>
                            {actioningPaymentId !== null ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>} Confirm {advancedActionModal.type === 'Discount' ? 'Custom Approval' : advancedActionModal.type === 'FreeCard' ? 'Free Card' : 'Temp Unlock'}
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {installmentModal && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md">
                    <form onSubmit={handleInstallmentApprove} className="bg-[#15192b] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-white font-black mb-4 text-lg">Set Next Phase Due Date</h3>
                        <p className="text-xs text-slate-400 mb-4">When should the student pay the next phase?</p>
                        <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white mb-6 font-bold outline-none focus:border-emerald-500" />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setInstallmentModal(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 font-bold transition-all">Cancel</button>
                            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-black transition-all shadow-lg shadow-emerald-600/20">Confirm</button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* 🔥 NEW: Iframe / Large Image Viewer Portal (WITH DEBUG) 🔥 */}
            {viewSlipUrl && createPortal(
                <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="relative w-full max-w-4xl h-[85vh] bg-[#15192b] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex justify-between items-center p-4 border-b border-white/5 bg-black/40">
                            <h3 className="text-white font-bold text-sm flex items-center gap-2"><FileImage size={16}/> Document Viewer</h3>
                            <button onClick={() => setViewSlipUrl(null)} className="text-white/50 hover:text-red-400 bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                                <CloseIcon size={18}/>
                            </button>
                        </div>
                        <div className="flex-1 w-full h-full bg-black/80 flex items-center justify-center p-2 relative">
                            {viewSlipUrl.toLowerCase().endsWith('.pdf') ? (
                                <div className="w-full h-full flex flex-col bg-white rounded-xl overflow-hidden">
                                    {/* 🔥 DEBUG URL BAR: මේ ලින්ක් එක ක්ලික් කරලා බලන්න PDF එක කෙලින්ම load වෙනවද කියලා 🔥 */}
                                    <div className="bg-yellow-100 text-black p-3 text-xs font-bold break-all flex justify-between items-center">
                                        <span>DEBUG URL: <a href={viewSlipUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline ml-2">{viewSlipUrl}</a></span>
                                        <span className="text-red-500">Iframe එකේ පේන්නේ නැත්නම් ලින්ක් එක ක්ලික් කරලා බලන්න.</span>
                                    </div>
                                    <iframe 
                                        src={viewSlipUrl} 
                                        className="w-full flex-1" 
                                        title="PDF Viewer"
                                        onError={(e) => console.error("Iframe PDF Error:", e)}
                                    ></iframe>
                                </div>
                            ) : (
                                <img src={viewSlipUrl} alt="Enlarged Slip" className="max-w-full max-h-full object-contain rounded-xl" />
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}