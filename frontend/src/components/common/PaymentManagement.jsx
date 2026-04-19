import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Clock, Eye, ShieldCheck, Wallet, CalendarDays, AlertCircle, Unlock, Loader2 } from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

export default function PaymentManagement({ loggedInUser }) {
    const isAdmin = loggedInUser?.role?.toUpperCase() === 'SYSTEM_ADMIN' || loggedInUser?.role?.toUpperCase() === 'DIRECTOR';
    
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);
    const [businesses, setBusinesses] = useState([]); // 🔥 Real Businesses ගබඩා කරන්න
    const [activeTab, setActiveTab] = useState('Pending'); 

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBusiness, setFilterBusiness] = useState('All');
    const [filterPaymentType, setFilterPaymentType] = useState('All'); 

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Payments ටික ගන්නවා
                const payRes = await axios.get('/admin/payments');
                setPayments(payRes.data || []);

                // Content Hub එකේ හදපු Real Businesses ටික ගන්නවා (Admin ට විතරක් පේන්න)
                if (isAdmin) {
                    const bizRes = await axios.get('/admin/businesses');
                    setBusinesses(bizRes.data || []);
                }
            } catch (error) {
                toast.error("Failed to load data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAdmin]);

    const [slipModal, setSlipModal] = useState(null);
    const [postPayModal, setPostPayModal] = useState(null);
    const [postPayDays, setPostPayDays] = useState(3);

    const handleAction = async (id, action) => {
        if(!window.confirm(`Are you sure you want to ${action} this payment?`)) return;
        try {
            await axios.post('/admin/payments/action', { paymentId: id, action: action });
            toast.success(`Payment ${action}d successfully!`);
            // Update local state without full reload
            setPayments(prev => prev.map(p => p.id === id ? {...p, status: action === 'Approve' ? 'Approved' : 'Rejected'} : p));
            setSlipModal(null);
        } catch (error) {
            toast.error(`Failed to ${action} payment.`);
        }
    };

    const handleGrantPostPay = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/admin/payments/post-pay', { paymentId: postPayModal.id, days: postPayDays });
            toast.success(`Temporary access granted for ${postPayDays} days!`);
            setPayments(prev => prev.map(p => p.id === postPayModal.id ? {...p, status: 'Post Pay', daysLeft: postPayDays} : p));
            setPostPayModal(null);
        } catch (error) {
            toast.error("Failed to grant temporary access.");
        }
    };

    const filteredPayments = payments.filter(p => {
        const matchesTab = p.status === activeTab;
        const matchesSearch = p.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || p.studentNo?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBiz = filterBusiness === 'All' || p.business === filterBusiness;
        const matchesType = filterPaymentType === 'All' || p.type === filterPaymentType;
        return matchesTab && matchesSearch && matchesBiz && matchesType;
    });

    return (
        <div className="w-full animate-fade-in text-slate-200 pb-10 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 bg-slate-800/40 p-6 md:p-8 rounded-3xl border border-white/10 shadow-lg backdrop-blur-xl">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3 mb-2"><Wallet className="text-emerald-500" size={30}/> Payment Hub</h2>
                    <p className="text-slate-400 font-medium text-sm md:text-base">Manage student payments, temporary access (Post Pay), and bank slips.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/10 mb-8 space-y-5">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                        <input type="text" placeholder="Search by Student Name or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors" />
                    </div>
                    {/* 🔥 REAL BUSINESSES LOADED HERE 🔥 */}
                    {isAdmin && (
                        <select value={filterBusiness} onChange={e => setFilterBusiness(e.target.value)} className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 cursor-pointer min-w-[180px]">
                            <option value="All">All Businesses</option>
                            {businesses.map(biz => (
                                <option key={biz.id} value={biz.name}>{biz.name}</option>
                            ))}
                        </select>
                    )}
                    <select value={filterPaymentType} onChange={e => setFilterPaymentType(e.target.value)} className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 cursor-pointer min-w-[150px]">
                        <option value="All">All Types</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Installment">Installments</option>
                    </select>
                </div>
            </div>

            {/* Enhanced Tabs */}
            <div className="flex gap-3 mb-6 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar">
                {['Pending', 'Approved', 'Rejected', 'Non Paid', 'Post Pay'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/5'}`}>
                        {tab === 'Pending' && <Clock size={16}/>}
                        {tab === 'Approved' && <CheckCircle size={16}/>}
                        {tab === 'Rejected' && <XCircle size={16}/>}
                        {tab === 'Non Paid' && <AlertCircle size={16} className="text-red-400"/>}
                        {tab === 'Post Pay' && <Unlock size={16} className="text-orange-400"/>}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Payment List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin text-emerald-500 mx-auto" size={40}/></div>
                ) : filteredPayments.length === 0 ? (
                    <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-white/10"><p className="text-slate-400 font-medium text-lg">No records found for this section.</p></div>
                ) : (
                    filteredPayments.map(pay => (
                        <div key={pay.id} className="bg-slate-800/40 border border-white/10 hover:border-emerald-500/30 p-5 md:p-6 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-colors shadow-sm">
                            
                            <div className="flex items-center gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${pay.method === 'PayHere' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                                    {pay.method === 'PayHere' ? <ShieldCheck size={24}/> : <CalendarDays size={24}/>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-white">{pay.studentName} <span className="text-xs font-semibold text-slate-400 ml-2 bg-black/40 px-2 py-1 rounded-lg border border-white/5">{pay.studentNo}</span></h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="text-xs font-semibold bg-white/10 text-slate-300 px-3 py-1 rounded-lg border border-white/5">{pay.business} - {pay.batch}</span>
                                        <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-lg border border-emerald-500/20">{pay.type}</span>
                                        {activeTab === 'Post Pay' && <span className="text-xs font-semibold bg-orange-500/20 text-orange-300 px-3 py-1 rounded-lg border border-orange-500/20 flex items-center gap-1"><Unlock size={12}/> {pay.daysLeft} Days Left</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto border-t border-white/10 lg:border-t-0 pt-4 lg:pt-0">
                                <div className="text-left lg:text-right">
                                    <p className="text-xs font-semibold text-slate-400 mb-0.5">Amount Payable</p>
                                    <p className="text-xl font-bold text-white">LKR {parseFloat(pay.amount).toLocaleString()}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {pay.method === 'Slip' && (activeTab === 'Pending' || activeTab === 'Rejected' || activeTab === 'Approved') && (
                                        <button onClick={() => setSlipModal(pay)} className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-colors border border-white/10" title="View Slip">
                                            <Eye size={20}/>
                                        </button>
                                    )}
                                    {activeTab === 'Pending' && (
                                        <>
                                            <button onClick={() => handleAction(pay.id, 'Approve')} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition-colors border border-emerald-500/30" title="Approve"><CheckCircle size={20}/></button>
                                            <button onClick={() => handleAction(pay.id, 'Reject')} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-2.5 rounded-xl transition-colors border border-red-500/30" title="Reject"><XCircle size={20}/></button>
                                        </>
                                    )}
                                    {activeTab === 'Non Paid' && (
                                        <button onClick={() => setPostPayModal(pay)} className="bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white px-4 py-2.5 rounded-xl transition-colors border border-orange-500/30 font-bold text-sm flex items-center gap-2">
                                            <Unlock size={16}/> Grant Temp Access
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* POST PAY MODAL */}
            {postPayModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl p-6">
                        <h3 className="text-xl font-bold text-white mb-2">Grant Temporary Access</h3>
                        <p className="text-sm text-slate-400 mb-6">Student: <span className="text-white font-semibold">{postPayModal.studentName}</span></p>
                        
                        <form onSubmit={handleGrantPostPay}>
                            <label className="text-sm font-semibold text-slate-300 mb-2 block">How many days of access?</label>
                            <input type="number" min="1" max="14" value={postPayDays} onChange={e => setPostPayDays(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-orange-500 mb-6" />
                            
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setPostPayModal(null)} className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-colors">Grant Access</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SLIP VIEW MODAL */}
            {slipModal && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">Verify Bank Slip</h3>
                                <p className="text-sm text-white/50">{slipModal.studentName} ({slipModal.studentNo})</p>
                            </div>
                            <button onClick={() => setSlipModal(null)} className="text-white/50 hover:text-white bg-white/10 p-2.5 rounded-xl"><XCircle size={20}/></button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto bg-black/40 flex justify-center">
                            <img src={slipModal.slipUrl ? `http://72.62.249.211:5000/storage/documents/${slipModal.slipUrl}` : '/logo.png'} alt="Bank Slip" className="max-w-full h-auto object-contain rounded-xl border border-white/10" />
                        </div>
                        {slipModal.status === 'Pending' && (
                            <div className="p-6 border-t border-white/10 flex gap-4 bg-slate-900">
                                <button onClick={() => handleAction(slipModal.id, 'Reject')} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-colors">Reject Slip</button>
                                <button onClick={() => handleAction(slipModal.id, 'Approve')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-colors">Approve & Enroll</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}