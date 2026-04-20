import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check, X as CloseIcon, Clock, ShieldCheck, Wallet, CalendarDays, AlertCircle, Unlock, Loader2, Beaker, FileText } from 'lucide-react';
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

    useEffect(() => {
        fetchData();
    }, [isAdmin]);

    useEffect(() => {
        if (filterBusinessId === 'All') {
            const uniqueBatches = [...new Set(payments.map(p => p.batch).filter(Boolean))];
            setAvailableBatches(uniqueBatches);
        } else {
            axios.get(`/admin/batches/${filterBusinessId}`)
                .then(res => {
                    const bData = res.data.batches || res.data || [];
                    setAvailableBatches(bData.map(b => b.name));
                })
                .catch(err => console.error(err));
        }
    }, [filterBusinessId, payments]);

    const [slipModal, setSlipModal] = useState(null);
    const [postPayModal, setPostPayModal] = useState(null);
    const [postPayDays, setPostPayDays] = useState(3);
    const [installmentModal, setInstallmentModal] = useState(null);
    const [nextDueDate, setNextDueDate] = useState('');
    const [isTestApprove, setIsTestApprove] = useState(false);

    const handleAction = async (pay, action) => {
        if ((action === 'Approve' || action === 'Test Approve') && pay.type === 'Installment') {
            setInstallmentModal(pay);
            setNextDueDate(getDefaultNextDueDate());
            setIsTestApprove(action === 'Test Approve');
            setSlipModal(null);
            return;
        }

        if(!window.confirm(`Are you sure you want to ${action} this payment?`)) return;
        try {
            await axios.post('/admin/payments/action', { paymentId: pay.id, action: action });
            toast.success(`Payment ${action}d successfully!`);
            fetchData();
            setSlipModal(null);
        } catch (error) {
            toast.error(`Failed to ${action} payment.`);
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
            setInstallmentModal(null);
            fetchData(); 
        } catch (error) {
            toast.error("Failed to process installment.");
        }
    };

    const filteredPayments = payments.filter(p => {
        const matchesTab = p.status === activeTab;
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

    const getTabClass = (tabName) => {
        const base = "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap border";
        if (activeTab !== tabName) return `${base} bg-white/5 border-white/5 text-slate-400 hover:bg-white/10`;
        
        switch(tabName) {
            case 'Pending': return `${base} bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20`;
            case 'Approved': return `${base} bg-blue-500/20 text-blue-400 border-blue-500/30`;
            case 'Rejected': return `${base} bg-red-500/20 text-red-400 border-red-500/30`;
            case 'Upcoming': return `${base} bg-purple-500/20 text-purple-400 border-purple-500/30`;
            case 'Non Paid': return `${base} bg-red-500/20 text-red-400 border-red-500/30`;
            case 'Post Pay': return `${base} bg-orange-500/20 text-orange-400 border-orange-500/30`;
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
                    <p className="text-slate-400 font-medium text-sm mt-1">Manage student payments, temporary access (Post Pay), and bank slips.</p>
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
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 mb-8 pb-2 overflow-x-auto custom-scrollbar">
                <button onClick={() => setActiveTab('Pending')} className={getTabClass('Pending')}><Clock size={16}/> Pending</button>
                <button onClick={() => setActiveTab('Approved')} className={getTabClass('Approved')}><Check size={16}/> Approved</button>
                <button onClick={() => setActiveTab('Rejected')} className={getTabClass('Rejected')}><CloseIcon size={16}/> Rejected</button>
                <button onClick={() => setActiveTab('Non Paid')} className={getTabClass('Non Paid')}><AlertCircle size={16}/> Non Paid</button>
                <button onClick={() => setActiveTab('Post Pay')} className={getTabClass('Post Pay')}><Unlock size={16}/> Post Pay</button>
                <button onClick={() => setActiveTab('Upcoming')} className={getTabClass('Upcoming')}><CalendarDays size={16}/> Upcoming Dues</button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin text-emerald-500 mx-auto" size={40}/></div>
                ) : filteredPayments.length === 0 ? (
                    <div className="text-center py-20 bg-[#1e2336]/40 rounded-[2rem] border border-white/5"><p className="text-slate-500 font-bold text-lg">No records found for this section.</p></div>
                ) : (
                    filteredPayments.map(pay => (
                        <div key={pay.id} className="bg-[#1e2336]/80 border border-white/5 hover:border-white/10 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors shadow-lg">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                    <CalendarDays size={26} strokeWidth={1.5}/>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-white flex items-center gap-3">
                                        {pay.studentName} 
                                        <span className="text-[10px] font-bold text-white/50 bg-black/40 px-2.5 py-1 rounded-md border border-white/5 tracking-widest uppercase">{pay.studentNo}</span>
                                    </h4>
                                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                                        <span className="text-[11px] font-semibold bg-white/5 text-slate-300 px-3 py-1 rounded-md border border-white/5">{pay.business} - {pay.batch}</span>
                                        <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-md border border-emerald-500/20">
                                            {pay.type} {pay.type === 'Installment' && pay.installmentNo && `(Phase ${pay.installmentNo})`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between md:justify-end gap-8 w-full md:w-auto border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                                <div className="text-left md:text-right">
                                    <p className="text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-widest">Amount Payable</p>
                                    <p className="text-xl font-black text-white">LKR {parseFloat(pay.amount).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {pay.method === 'Slip' && (activeTab === 'Pending' || activeTab === 'Rejected' || activeTab === 'Approved') && (
                                        <button onClick={() => setSlipModal(pay)} className="w-10 h-10 rounded-full bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white flex items-center justify-center transition-all border border-blue-500/20" title="View Slip">
                                            <FileText size={18}/>
                                        </button>
                                    )}
                                    {activeTab === 'Pending' && (
                                        <>
                                            <button onClick={() => handleAction(pay, 'Approve')} className="w-10 h-10 rounded-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white flex items-center justify-center transition-all border border-emerald-500/20" title="Approve"><Check size={20} strokeWidth={3}/></button>
                                            <button onClick={() => handleAction(pay, 'Reject')} className="w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-all border border-red-500/20" title="Reject"><CloseIcon size={20} strokeWidth={3}/></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 🔥 PERFECT SLIP VIEW MODAL FIX WITH PORTAL 🔥 */}
            {slipModal && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 backdrop-blur-md overflow-y-auto custom-scrollbar">
                    <div className="flex min-h-full items-start justify-center p-4 sm:p-6 py-12">
                        
                        <div className="bg-[#15192b] border border-white/10 rounded-[2rem] w-full max-w-3xl shadow-2xl relative animate-in zoom-in-95 duration-200 my-auto">
                            
                            <div className="sticky top-0 z-50 bg-[#15192b]/95 backdrop-blur-md border-b border-white/5 p-6 rounded-t-[2rem] flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-wide flex items-center gap-3">
                                        <ShieldCheck className="text-blue-400" size={24}/> Payment Verification
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Verify student details and check the receipt below.</p>
                                </div>
                                <button onClick={() => setSlipModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2.5 rounded-xl transition-all border border-transparent hover:border-red-500/30">
                                    <CloseIcon size={20} strokeWidth={3} />
                                </button>
                            </div>

                            <div className="p-6 md:p-8">
                                <div className="bg-[#1a1f33] rounded-2xl p-6 border border-white/5 mb-8 flex flex-col md:flex-row justify-between gap-6 shadow-inner">
                                    <div className="space-y-5 flex-1">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Student Info</p>
                                            <p className="text-lg font-bold text-white leading-tight">{slipModal.studentName}</p>
                                            <p className="text-sm text-slate-500 font-medium">{slipModal.studentNo}</p>
                                        </div>
                                        <div className="h-px w-full bg-white/5"></div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Enrollment Details</p>
                                            <p className="text-sm font-bold text-white leading-tight">{slipModal.business}</p>
                                            <p className="text-sm text-slate-400">{slipModal.batch}</p>
                                        </div>
                                    </div>

                                    <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 flex flex-col justify-center items-start md:items-end min-w-[200px]">
                                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Paid Amount</p>
                                        <p className="text-3xl font-black text-emerald-400 tracking-tight">LKR {parseFloat(slipModal.amount).toLocaleString()}</p>
                                        <span className="bg-white/5 text-slate-300 text-[10px] px-3 py-1 rounded-md mt-3 font-bold uppercase tracking-widest border border-white/10">
                                            {slipModal.type} {slipModal.installmentNo ? `(PHASE ${slipModal.installmentNo})` : ''}
                                        </span>
                                    </div>
                                </div>

                                {slipModal.status === 'Pending' ? (
                                    <div className="flex flex-col sm:flex-row gap-3 mb-8 pb-8 border-b border-white/5">
                                        <button onClick={() => handleAction(slipModal, 'Reject')} className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 font-bold py-4 rounded-xl transition-all text-xs uppercase tracking-widest">Reject</button>
                                        <button onClick={() => handleAction(slipModal, 'Test Approve')} className="flex-1 bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-bold py-4 rounded-xl transition-all text-xs uppercase tracking-widest">Test Approve</button>
                                        <button onClick={() => handleAction(slipModal, 'Approve')} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:scale-[1.02]">
                                            <Check size={20} strokeWidth={3}/> Approve & Enroll
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`mb-8 pb-8 border-b border-white/5`}>
                                        <div className={`py-4 rounded-xl text-center font-black text-sm uppercase tracking-widest border ${slipModal.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                            Current Status: {slipModal.status}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 ml-2">Attached Bank Receipt</p>
                                    <div className="bg-black/40 rounded-2xl border border-white/5 p-4 flex justify-center items-center">
                                        <img 
                                            src={slipModal.slipUrl ? `http://72.62.249.211:5000/documents/${slipModal.slipUrl}` : '/logo.png'} 
                                            onError={(e) => { e.target.src = '/logo.png'; }}
                                            alt="Bank Slip" 
                                            className="max-w-full h-auto object-contain rounded-xl drop-shadow-2xl" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}