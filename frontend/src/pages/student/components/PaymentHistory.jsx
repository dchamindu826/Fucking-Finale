import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 🔥 Meka aluthin add kara
import axios from '../../../api/axios';
import { Loader2, CheckCircle, Clock, Wallet, CalendarDays, RefreshCw, AlertTriangle, UploadCloud, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentHistory() {
    const [payments, setPayments] = useState({ upcoming: [], completed: [] });
    const [loading, setLoading] = useState(true);

    const [payModal, setPayModal] = useState(null);
    const [slipFile, setSlipFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            let res;
            try { res = await axios.get('/student/my-payments'); } 
            catch (err) { res = await axios.get('/payments/my-payments'); }

            const all = res?.data?.oldPayments || res?.data || [];
            const upcomingList = [];
            const historyList = [];

            all.forEach(p => {
                if (p.status === 1 || p.status === 2 || p.status === 4) historyList.push(p);
                else upcomingList.push(p);
            });

            setPayments({ upcoming: upcomingList, completed: historyList });
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchPayments(); }, []);

    const formatDate = (ds) => ds ? new Date(ds).toISOString().split('T')[0] : 'N/A';

    const handlePayDue = async (e) => {
        e.preventDefault();
        if (!slipFile) return toast.error("Please select a slip image.");
        
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('paymentId', payModal.id); 
        formData.append('slipImage', slipFile);

        try {
            await axios.post('/student/upload-due-slip', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
            toast.success("Slip uploaded successfully! Awaiting verification.");
            setPayModal(null);
            setSlipFile(null);
            fetchPayments();
        } catch (error) {
            toast.error("Failed to upload slip. Try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-500" size={40}/></div>;

    return (
        <div className="w-full max-w-6xl mx-auto animate-fade-in pb-20">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                    <Wallet size={30} className="text-red-500"/>
                </div>
                <div>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-wider uppercase">My Payments</h2>
                    <p className="text-white/60 mt-1 text-xs md:text-sm font-medium">Track your upcoming dues and payment history.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                <div className="glass-card rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><Clock className="text-orange-400"/> Upcoming / Pending</h3>
                    <div className="space-y-4">
                        {payments.upcoming.length === 0 ? (
                            <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10">
                                <CheckCircle size={40} className="mx-auto text-emerald-500/50 mb-3"/>
                                <p className="text-white/50 font-bold">No pending payments.</p>
                            </div>
                        ) : payments.upcoming.map((p, idx) => {
                            let isLate = p.dueDate ? new Date(p.dueDate) < new Date() : false;
                            if (p.status === 3) isLate = true;

                            return (
                                <div key={idx} className={`bg-black/30 border p-5 md:p-6 rounded-2xl flex flex-col relative overflow-hidden transition-all ${isLate ? 'border-red-500/50' : 'border-white/10'}`}>
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${p.status === -1 ? 'bg-yellow-400' : 'bg-red-500'}`}></div>
                                    <div className="pl-3">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                            <h4 className="text-base md:text-lg font-bold text-white">{p.courseName}</h4>
                                            {p.isInstallment && p.installmentNo && (
                                                <span className="text-[10px] uppercase font-bold bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-lg border border-orange-500/30 w-max shrink-0">
                                                    Phase {p.installmentNo}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <p className={`text-xs mt-2 flex items-center gap-1.5 font-bold ${isLate ? 'text-red-400' : 'text-white/50'}`}>
                                            <CalendarDays size={14}/> 
                                            {p.dueDate ? `Due: ${formatDate(p.dueDate)}` : `Generated: ${formatDate(p.createdDate)}`}
                                            {isLate && <AlertTriangle size={14} className="ml-1"/>}
                                        </p>
                                        
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mt-4 pt-4 border-t border-white/10 gap-4">
                                            <div>
                                                <span className="text-xs font-bold text-white/40 block mb-1 uppercase tracking-widest">Amount Payable</span>
                                                <span className="text-xl md:text-3xl font-black text-white">LKR {parseFloat(p.amount).toFixed(2)}</span>
                                            </div>
                                            <div>
                                                {p.status === -1 ? (
                                                    <span className="text-yellow-400 text-xs font-bold flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 px-4 py-2.5 rounded-xl">
                                                        <RefreshCw size={14} className="animate-spin"/> Verifying Slip
                                                    </span>
                                                ) : (
                                                    <button onClick={() => setPayModal(p)} className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-red-500/20 transition-transform hover:scale-105">
                                                        Pay Due Amount
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="glass-card rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-2xl h-max">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><CheckCircle className="text-emerald-400"/> Payment History</h3>
                    <div className="space-y-4">
                        {payments.completed.length === 0 ? (
                            <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10">
                                <p className="text-white/50 font-bold">No history found.</p>
                            </div>
                        ) : payments.completed.map((p, idx) => (
                            <div key={idx} className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 p-5 rounded-2xl group">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-white mb-1 group-hover:text-red-400 transition-colors">{p.courseName}</h4>
                                        {p.isInstallment && p.installmentNo && (
                                            <span className="text-[9px] uppercase font-bold text-white/50 bg-black/40 px-2 py-0.5 rounded border border-white/10 mb-2 inline-block">
                                                Phase {p.installmentNo}
                                            </span>
                                        )}
                                        <p className="text-[10px] text-white/40 font-medium flex items-center gap-1 mt-1"><CalendarDays size={10}/> {formatDate(p.createdDate)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-white/90 block mb-1">LKR {parseFloat(p.amount).toFixed(2)}</span>
                                        {p.status === 1 ? <span className="text-emerald-400 text-[10px] font-bold border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider inline-block">Approved</span> : <span className="text-red-400 text-[10px] font-bold border border-red-400/30 bg-red-500/10 px-2 py-0.5 rounded uppercase tracking-wider inline-block">Rejected</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 🔥 PAY DUE MODAL FIX WITH PORTAL 🔥 */}
            {payModal && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 backdrop-blur-md overflow-y-auto">
                    {/* items-start saha my-auto add kala kalin wage cut wena eka nawattanna */}
                    <div className="flex min-h-full items-start justify-center p-4 py-12">
                        <div className="bg-[#15192b] border border-white/10 rounded-[2rem] w-full max-w-md p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
                            <button onClick={() => {setPayModal(null); setSlipFile(null);}} className="absolute top-5 right-5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-xl transition-all border border-transparent hover:border-red-500/30">
                                <X size={20} strokeWidth={3} />
                            </button>
                            
                            <div className="mb-6 border-b border-white/5 pb-6 text-center">
                                <h3 className="text-2xl font-black text-white">Upload Receipt</h3>
                                <p className="text-sm text-slate-400 mt-2 font-medium">Please upload the bank slip to pay the due amount.</p>
                            </div>
                            
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 text-center mb-6">
                                <p className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest mb-1">Amount Due</p>
                                <p className="text-3xl font-black text-red-500">LKR {parseFloat(payModal.amount).toLocaleString()}</p>
                                <p className="text-xs font-bold text-white mt-2">{payModal.courseName}</p>
                            </div>

                            <form onSubmit={handlePayDue}>
                                <div className="border-2 border-dashed border-white/20 bg-black/40 rounded-2xl p-6 text-center hover:border-emerald-500/50 transition-colors cursor-pointer mb-6 group">
                                    <input type="file" id="slip-upload-due" className="hidden" accept="image/*,.pdf" onChange={(e) => setSlipFile(e.target.files[0])} />
                                    <label htmlFor="slip-upload-due" className="cursor-pointer flex flex-col items-center w-full">
                                        <UploadCloud size={32} className="text-white/30 group-hover:text-emerald-500 mb-3 transition-colors" />
                                        <span className="text-white font-bold text-sm mb-1">{slipFile ? slipFile.name : 'Click to Upload Slip'}</span>
                                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Max: 10MB (PNG, JPG)</span>
                                    </label>
                                </div>
                                
                                <button type="submit" disabled={isSubmitting || !slipFile} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:scale-[1.02]">
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin"/> : <CheckCircle size={20}/>} 
                                    Submit Payment
                                </button>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}