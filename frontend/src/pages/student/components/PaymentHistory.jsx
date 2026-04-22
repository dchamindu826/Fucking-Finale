import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '../../../api/axios';
import { Loader2, CheckCircle, Clock, Wallet, CalendarDays, RefreshCw, AlertTriangle, UploadCloud, X, Camera, MonitorPlay, Paperclip, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import correctCdmImg from '../../../assets/correct-cdm.jpg';
import wrongCdmImg from '../../../assets/wrong-cdm.jpg';
import correctReceiptImg from '../../../assets/correct-receipt.jpg';
import wrongReceiptImg from '../../../assets/wrong-receipt.jpg';

export default function PaymentHistory() {
    const [payments, setPayments] = useState({ upcoming: [], completed: [] });
    const [loading, setLoading] = useState(true);

    const [payModal, setPayModal] = useState(null);
    const [slipFiles, setSlipFiles] = useState([]);
    const [remark, setRemark] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSlipInstructions, setShowSlipInstructions] = useState(false);

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
                // 🔥 FIX: Check if payment is already paid but waiting for admin approval
                const isVerifying = p.status === -1 || (p.status === 0 && p.method === 'Slip');
                
                if (p.status === 1 || p.status === 2 || p.status === 4 || isVerifying) {
                    // Attach a clean display status for the UI
                    p.displayStatus = (p.status === 1 || p.status === 4) ? 'Approved' 
                                    : p.status === 2 ? 'Rejected' 
                                    : 'Verifying';
                    historyList.push(p);
                } else {
                    upcomingList.push(p);
                }
            });

            setPayments({ upcoming: upcomingList, completed: historyList });
        } catch (error) { 
            console.error(error); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchPayments(); }, []);

    const formatDate = (ds) => ds ? new Date(ds).toISOString().split('T')[0] : 'N/A';

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        const totalFiles = [...slipFiles, ...newFiles];
        
        if (totalFiles.length > 4) {
            toast.error("You can only upload up to 4 slips.");
            setSlipFiles(totalFiles.slice(0, 4));
        } else {
            setSlipFiles(totalFiles);
        }
    };

    const removeFile = (indexToRemove) => {
        setSlipFiles(slipFiles.filter((_, index) => index !== indexToRemove));
    };

    const openSlipInstructions = () => setShowSlipInstructions(true);

    // 🔥 FIX: Instantly close modal and open file picker synchronously
    const confirmSlipInstructions = () => {
        const fileInput = document.getElementById('slip-upload-due');
        if (fileInput) fileInput.click();
        setShowSlipInstructions(false); 
    };

    const handlePayDue = async (e) => {
        e.preventDefault();
        if (slipFiles.length === 0) return toast.error("Please upload your bank slip(s).");
        
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('paymentId', payModal.id); 
        if (remark) formData.append('remark', remark);

        slipFiles.forEach(file => {
            formData.append('slipImages', file);
        });

        try {
            await axios.post('/student/upload-due-slip', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
            toast.success("Slip uploaded successfully! Awaiting verification.");
            setPayModal(null);
            setSlipFiles([]);
            setRemark('');
            await fetchPayments(); // Refresh list instantly
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
                
                {/* UPCOMING / PENDING SECTION */}
                <div className="glass-card rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-2xl h-max">
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
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
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
                                            <div className="w-full sm:w-auto">
                                                <button onClick={() => setPayModal(p)} className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-red-500/20 transition-transform hover:scale-105 uppercase tracking-widest">
                                                    Pay Now
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* PAYMENT HISTORY SECTION */}
                <div className="glass-card rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-2xl h-max">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><CheckCircle className="text-emerald-400"/> Payment History</h3>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
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
                                    <div className="text-right shrink-0">
                                        <span className="text-lg font-black text-white/90 block mb-1">LKR {parseFloat(p.amount).toFixed(2)}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider inline-block border ${
                                            p.displayStatus === 'Approved' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' :
                                            p.displayStatus === 'Rejected' ? 'text-red-400 border-red-400/30 bg-red-500/10' :
                                            'text-yellow-400 border-yellow-400/30 bg-yellow-500/10'
                                        }`}>
                                            {p.displayStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 🔥 PAY DUE MODAL WITH ADVANCED UPLOAD 🔥 */}
            {payModal && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 backdrop-blur-md overflow-y-auto custom-scrollbar">
                    <div className="flex min-h-full items-start justify-center p-4 py-12">
                        <div className="bg-[#15192b] border border-white/10 rounded-[2rem] w-full max-w-md p-6 md:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
                            <button onClick={() => {setPayModal(null); setSlipFiles([]); setRemark('');}} className="absolute top-5 right-5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-xl transition-all border border-transparent hover:border-red-500/30">
                                <X size={20} strokeWidth={3} />
                            </button>
                            
                            <div className="mb-6 border-b border-white/5 pb-6">
                                <h3 className="text-xl md:text-2xl font-black text-white">Submit Payment</h3>
                                <p className="text-xs text-slate-400 mt-2 font-medium">Upload your receipt for verification.</p>
                            </div>
                            
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-5 text-center mb-6 shadow-inner">
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Amount Due</p>
                                <p className="text-3xl font-black text-red-500">LKR {parseFloat(payModal.amount).toLocaleString()}</p>
                                <p className="text-xs font-bold text-white mt-2">{payModal.courseName}</p>
                            </div>

                            <form onSubmit={handlePayDue}>
                                <div className="border-2 border-dashed border-white/20 bg-white/5 rounded-[1.5rem] p-6 text-center hover:border-red-500/50 hover:bg-red-500/5 transition-colors cursor-pointer mb-4 group relative" onClick={openSlipInstructions}>
                                    <div className="absolute top-3 right-3 bg-blue-500 text-white p-1.5 rounded-full"><Info size={14}/></div>
                                    <input type="file" id="slip-upload-due" className="hidden" multiple accept="image/*,application/pdf" capture="environment" onChange={handleFileChange} />
                                    <div className="flex flex-col items-center w-full">
                                        <div className="flex gap-3 mb-3 text-white/30 group-hover:text-red-500 transition-colors">
                                            <UploadCloud size={32} />
                                            <Camera size={32} />
                                        </div>
                                        <span className="text-white font-bold text-sm mb-1">
                                            {slipFiles.length > 0 ? `${slipFiles.length} File(s) Selected` : 'Click to Upload Slip'}
                                        </span>
                                        <span className="text-[10px] text-white/50 font-medium">Max 4 slips. PNG, JPG, PDF</span>
                                    </div>
                                </div>
                                
                                {slipFiles.length > 0 && (
                                    <div className="mb-4 bg-black/30 p-3 rounded-xl border border-white/5 space-y-1.5">
                                        {slipFiles.map((file, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2 truncate pr-3">
                                                    <Paperclip size={12} className="text-white/40 shrink-0"/>
                                                    <span className="text-white truncate">{file.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-white/40">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                                                    <button type="button" onClick={() => removeFile(i)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mb-6">
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 block">Remark (Optional)</label>
                                    <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Type any message..." rows="2" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-red-500 transition-colors resize-none"></textarea>
                                </div>
                                
                                <button type="submit" disabled={isSubmitting || slipFiles.length === 0} className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:opacity-50 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest border border-red-500/50 shadow-lg">
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18}/>} 
                                    Submit Payment
                                </button>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 🔥 SLIP INSTRUCTIONS POPUP 🔥 */}
            {showSlipInstructions && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 p-5 md:p-8 rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar">
                        <h3 className="text-lg md:text-2xl font-extrabold text-white mb-4 md:mb-6 border-b border-white/10 pb-3 md:pb-4">ස්ලිප් පත් උඩුගත කිරීමේ උපදෙස් (Slip Upload Instructions)</h3>
                        
                        <div className="space-y-4 md:space-y-6">
                            <div className="bg-black/50 p-4 md:p-5 rounded-2xl border border-white/5">
                                <h4 className="text-red-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base"><Camera size={16}/> බැංකු ස්ලිප් (CDM / Bank Deposit)</h4>
                                <ul className="text-xs md:text-sm text-slate-300 list-disc pl-4 md:pl-5 space-y-1 md:space-y-2 leading-relaxed mb-4">
                                    <li>ස්ලිප් පතෙහි <strong className="text-white">මුලු 4ම (4 corners)</strong> පැහැදිලිව පෙනෙන සේ ඡායාරූපය ගන්න.</li>
                                    <li>ඡායාරූපය <strong className="text-white">බොඳ නොවී ඉතා පැහැදිලිව</strong> තිබිය යුතුය.</li>
                                    <li><strong className="text-white">Reference Number, දිනය සහ වේලාව</strong> හොඳින් කියවිය හැකි විය යුතුය.</li>
                                </ul>
                                <div className="flex gap-2 md:gap-4">
                                    <div className="flex-1 bg-white/5 border border-green-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                        <img src={correctCdmImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2" alt="Correct"/>
                                        <span className="text-green-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><CheckCircle size={10}/> නිවැරදියි (Correct)</span>
                                    </div>
                                    <div className="flex-1 bg-white/5 border border-red-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                        <img src={wrongCdmImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 opacity-50" alt="Wrong"/>
                                        <span className="text-red-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><X size={10}/> වැරදියි (Incorrect)</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-black/50 p-4 md:p-5 rounded-2xl border border-white/5">
                                <h4 className="text-blue-400 font-bold mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base"><MonitorPlay size={16}/> Online Transfers / e-Receipts</h4>
                                <ul className="text-xs md:text-sm text-slate-300 list-disc pl-4 md:pl-5 space-y-1 md:space-y-2 leading-relaxed mb-4">
                                    <li><strong className="text-white">Reference Number, දිනය සහ වේලාව</strong> අනිවාර්යයෙන්ම දිස්විය යුතුය.</li>
                                    <li>ස්ක්‍රීන්ෂොට් එක (Screenshot) කපා-කොටා (crop) නොමැතිව <strong className="text-white">සම්පූර්ණයෙන්ම</strong> උඩුගත කරන්න.</li>
                                </ul>
                                 <div className="flex gap-2 md:gap-4">
                                    <div className="flex-1 bg-white/5 border border-green-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                        <img src={correctReceiptImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 border border-white/20" alt="Correct"/>
                                        <span className="text-green-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><CheckCircle size={10}/> නිවැරදියි (Correct)</span>
                                    </div>
                                    <div className="flex-1 bg-white/5 border border-red-500/50 rounded-xl p-2 md:p-3 text-center flex flex-col justify-between">
                                        <img src={wrongReceiptImg} className="w-full h-20 md:h-28 object-contain rounded-lg mb-2 opacity-50 border border-white/10" alt="Wrong"/>
                                        <span className="text-red-400 text-[9px] md:text-xs font-bold uppercase flex justify-center items-center gap-1"><X size={10}/> වැරදියි (Incorrect)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 md:mt-8 flex justify-end gap-3 md:gap-4">
                            <button onClick={() => setShowSlipInstructions(false)} className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-white/5 text-white/70 text-xs md:text-sm font-bold hover:bg-white/10 hover:text-white transition-colors">අවලංගු කරන්න (Cancel)</button>
                            <button onClick={confirmSlipInstructions} className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-red-600 text-white text-xs md:text-sm font-bold hover:bg-red-500 shadow-lg shadow-red-500/20 transition-colors">මම තේරුම් ගත්තා (Upload)</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}