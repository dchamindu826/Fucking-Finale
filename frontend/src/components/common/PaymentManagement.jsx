import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X as CloseIcon, Clock, ShieldCheck, Wallet, CalendarDays, AlertCircle, Unlock, Loader2, User, Tag, Gift, FileImage, MessageSquare, Trash2, ChevronLeft, ChevronRight, CreditCard, FileText, CheckCircle2, Truck } from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import PaymentFilters from './PaymentFilters';
import StaffPerformanceModal from './StaffPerformanceModal';

export default function PaymentManagement({ loggedInUser }) {
    const isSystemAdmin = loggedInUser?.role?.toUpperCase() === 'SYSTEM_ADMIN' || loggedInUser?.role?.toUpperCase() === 'DIRECTOR';
    const isFinance = loggedInUser?.department === 'Finance';
    const isAdmin = isSystemAdmin || isFinance;
    
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);
    const [businesses, setBusinesses] = useState([]); 
    const [batches, setBatches] = useState([]); 
    const [groups, setGroups] = useState([]); 
    const [subjects, setSubjects] = useState([]); 

    const [activeTab, setActiveTab] = useState('Pending'); 
    const [filters, setFilters] = useState({
        search: '', businessId: 'All', batchId: 'All', groupId: 'All', subjectId: 'All', dateFrom: '', dateTo: '', method: 'All'
    });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [studentActionModal, setStudentActionModal] = useState(null); 
    const [actioningPaymentId, setActioningPaymentId] = useState(null);
    const [installmentModal, setInstallmentModal] = useState(null);
    const [nextDueDate, setNextDueDate] = useState('');
    const [isTestApprove, setIsTestApprove] = useState(false);
    const [advancedActionModal, setAdvancedActionModal] = useState(null); 
    const [customPrices, setCustomPrices] = useState({}); 
    const [actionRemark, setActionRemark] = useState('');
    const [showStaffModal, setShowStaffModal] = useState(false);

    const [approveModal, setApproveModal] = useState(null);
    const [actualAmount, setActualAmount] = useState('');

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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
        } catch (error) {
            toast.error("Failed to load data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [isAdmin]);

    useEffect(() => {
        if (filters.businessId !== 'All') {
             axios.get(`/admin/batches/${filters.businessId}`).then(res => setBatches(res.data.batches || res.data || []));
        } else {
             const uniqueBatches = Array.from(new Set(payments.map(p => JSON.stringify({id: p.batchId || p.batch_id, name: p.batch || p.batchName}))))
                 .map(str => JSON.parse(str)).filter(b => b.name && b.name !== 'N/A' && b.id);
             setBatches(uniqueBatches);
        }
    }, [filters.businessId, payments]);

    useEffect(() => {
        let extractedGroups = [];
        let extractedSubjects = new Map();

        const selectedBatch = batches.find(b => (b.id?.toString() === filters.batchId || b.batch_id?.toString() === filters.batchId));
        
        if (selectedBatch && selectedBatch.groups && selectedBatch.groups.length > 0) {
            extractedGroups = selectedBatch.groups;
            selectedBatch.groups.forEach(g => {
                const coursesList = g.courses || g.subjects || [];
                coursesList.forEach(c => {
                    if(c.id) extractedSubjects.set(c.id, { id: c.id, name: c.name, code: c.code || '' });
                });
            });
        } else {
            const validPayments = payments.filter(p => 
                filters.batchId === 'All' || 
                p.batchId?.toString() === filters.batchId || 
                p.batch_id?.toString() === filters.batchId
            );

            const uniqueGroups = Array.from(new Set(validPayments.map(p => {
                const gId = p.groupId || p.group_id;
                const gName = p.groupName || p.group || (gId ? `Group ${gId}` : 'Unknown');
                return JSON.stringify({ id: gId, name: gName });
            }))).map(str => JSON.parse(str)).filter(g => g.id);
            
            extractedGroups = uniqueGroups;

            validPayments.forEach(p => {
                const subs = p.subjectsList || p.subjects || p.courses || [];
                subs.forEach(s => {
                    const sId = s.id || s.course_id || s.subject_id;
                    const sName = s.name || s.courseName || s.subjectName;
                    const sCode = s.code || s.courseCode || s.subjectCode || '';
                    if (sId) extractedSubjects.set(sId, { id: sId, name: sName, code: sCode });
                });
            });
        }

        setGroups(extractedGroups);
        setSubjects(Array.from(extractedSubjects.values()));
    }, [filters.batchId, batches, payments]);

    useEffect(() => { setCurrentPage(1); }, [activeTab, filters]);

    const filteredPayments = payments.filter(p => {
        let matchesTab = false;
        if (activeTab === 'Trash') matchesTab = p.status === 'Trash';
        else if (activeTab === 'Approved') matchesTab = p.status === 'Approved';
        else matchesTab = p.status === activeTab && p.status !== 'Trash';

        const searchVal = filters.search.toLowerCase();
        const matchesSearch = p.studentName?.toLowerCase().includes(searchVal) || p.studentNo?.toLowerCase().includes(searchVal);

        const pBizId = p.businessId || p.business_id;
        const pBatchId = p.batchId || p.batch_id;
        const pGroupId = p.groupId || p.group_id;

        let matchesBiz = isAdmin ? (filters.businessId === 'All' || pBizId?.toString() === filters.businessId) : true;
        const matchesBatch = filters.batchId === 'All' || pBatchId?.toString() === filters.batchId;
        const matchesGroup = filters.groupId === 'All' || pGroupId?.toString() === filters.groupId;
        const matchesMethod = filters.method === 'All' || p.method === filters.method;

        let matchesSubject = filters.subjectId === 'All';
        if (!matchesSubject) {
            const subs = p.subjectsList || p.subjects || p.courses || [];
            matchesSubject = subs.some(s => {
                const sId = s.id || s.course_id || s.subject_id;
                return sId?.toString() === filters.subjectId;
            });
        }

        let matchesDate = true;
        if (filters.dateFrom || filters.dateTo) {
            const payDate = new Date(p.date);
            if (filters.dateFrom && payDate < new Date(filters.dateFrom)) matchesDate = false;
            if (filters.dateTo && payDate > new Date(filters.dateTo)) matchesDate = false;
        }

        return matchesTab && matchesSearch && matchesBiz && matchesBatch && matchesGroup && matchesSubject && matchesDate && matchesMethod;
    });

    const stats = {
        pending: payments.filter(p => p.status === 'Pending').length,
        approved: payments.filter(p => p.status === 'Approved').length,
        freeCards: payments.filter(p => p.status === 'Free Card').length,
        discounts: payments.filter(p => p.status === 'Discount').length,
    };

    const groupedAllByStudent = filteredPayments.reduce((acc, pay) => {
        if (!acc[pay.studentId]) {
            acc[pay.studentId] = { studentId: pay.studentId, studentName: pay.studentName, studentNo: pay.studentNo, allPayments: [] };
        }
        acc[pay.studentId].allPayments.push(pay);
        return acc;
    }, {});

    const visibleStudents = Object.values(groupedAllByStudent);
    const totalPages = Math.ceil(visibleStudents.length / itemsPerPage) || 1;
    const paginatedStudents = visibleStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const openApproveModal = (payment, isSelfPicked = false) => {
        if (payment.type === 'Installment' && payment.status !== 'Approved') {
            setInstallmentModal({ payment, isSelfPicked });
            setNextDueDate(getDefaultNextDueDate());
            setActualAmount(payment.amount || '');
            setActionRemark('');
            setIsTestApprove(false);
        } else {
            setApproveModal({ payment, isSelfPicked });
            setActualAmount(payment.amount || '');
            setActionRemark('');
        }
    };

    const submitApprove = async () => {
        const { payment, isSelfPicked } = approveModal;
        try {
            setActioningPaymentId(payment.id);
            await axios.post('/admin/payments/action', { 
                paymentId: payment.id, 
                action: 'Approve',
                isSelfPicked: isSelfPicked,
                actualAmountPaid: parseFloat(actualAmount || 0),
                remark: actionRemark
            });
            toast.success(`Payment Approved${isSelfPicked ? ' (Self-Picked)' : ''}!`);
            setApproveModal(null);
            refreshAfterAction(payment.studentId);
        } catch (error) { 
            toast.error(`Failed to process payment.`); 
        } finally { 
            setActioningPaymentId(null); 
        }
    };

    const handleInstallmentApprove = async (e) => {
        e.preventDefault();
        const { payment, isSelfPicked } = installmentModal;
        try {
            const actionType = isTestApprove ? 'Test Approve' : 'Approve';
            await axios.post('/admin/payments/action/installment', { 
                paymentId: payment.id, 
                nextDueDate: nextDueDate, 
                action: actionType,
                actualAmountPaid: parseFloat(actualAmount || 0),
                remark: actionRemark,
                isSelfPicked: isSelfPicked
            });
            toast.success(`Installment ${actionType}d & Next Scheduled!`);
            const targetStudentId = payment.studentId;
            setInstallmentModal(null);
            refreshAfterAction(targetStudentId);
        } catch (error) { toast.error("Failed to process installment."); }
    };

    const handleAction = async (payment, action, isSelfPicked = false) => {
        let confirmMessage = `Are you sure you want to ${action} this payment?`;
        if (isSelfPicked) confirmMessage = `Approve and mark as SELF-PICKED (Tute Delivered)?`;
        if (action === 'SendToDelivery') confirmMessage = `Send this record to Delivery Hub?`;

        if(!window.confirm(confirmMessage)) return;
        
        try {
            setActioningPaymentId(payment.id);
            await axios.post('/admin/payments/action', { 
                paymentId: payment.id, 
                action: action,
                isSelfPicked: isSelfPicked 
            });
            toast.success(`Action ${action} successful!`);
            refreshAfterAction(payment.studentId);
        } catch (error) { 
            toast.error(`Failed to process payment.`); 
        } finally { 
            setActioningPaymentId(null); 
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
                await axios.post('/admin/payments/post-pay', { paymentId: payment.id }); // Backend handles 7 days
                toast.success(`Post Pay granted for 7 days!`);
            } else {
                let finalAmount = 0; let detailedRemark = actionRemark;
                if (type === 'Discount') {
                    finalAmount = payment.subjectsList.reduce((sum, sub) => sum + (parseFloat(customPrices[sub.id]) || 0), 0);
                    const breakdownStr = payment.subjectsList.map(sub => `${sub.code}: LKR ${customPrices[sub.id] || 0}`).join(' | ');
                    detailedRemark = `Custom Breakdown: [${breakdownStr}]\nReason: ${actionRemark}`;
                }
                await axios.post('/admin/payments/action', {
                    paymentId: payment.id, action: type === 'FreeCard' ? 'Free Card' : 'Discount',
                    customAmount: finalAmount, remark: detailedRemark
                });
                toast.success(`Payment processed as ${type}!`);
            }
            setAdvancedActionModal(null); setActionRemark(''); refreshAfterAction(payment.studentId);
        } catch (error) { toast.error("Failed to process action."); } finally { setActioningPaymentId(null); }
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
        setAdvancedActionModal({ type, payment }); setActionRemark('');
        if (type === 'Discount') {
            const initialPrices = {};
            const subsList = payment.subjectsList || payment.subjects || payment.courses || [];
            subsList.forEach(s => initialPrices[s.id || s.course_id] = s.price || 0);
            setCustomPrices(initialPrices);
        }
    };
    
    const handleCustomPriceChange = (id, val) => setCustomPrices(prev => ({ ...prev, [id]: val }));

    // 🔥 FIX: HTML Slip Viewer Window with All Slips visible by scrolling
    const openSlipsInNewTab = (slips, studentName) => {
        if (!slips || slips.length === 0) return toast.error("No slips to view.");

        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const backendBaseUrl = isLocalhost ? 'http://localhost:5000' : 'https://imacampus.online';

        const slipsHtml = slips.map((imgStr, index) => {
            const fileUrl = `${backendBaseUrl}/api/storage/documents/${imgStr}`;
            const isPdf = imgStr.toLowerCase().endsWith('.pdf');
            if (isPdf) {
                return `
                <div class="slip-card">
                    <div class="title">Document ${index + 1} (PDF)</div>
                    <embed src="${fileUrl}" type="application/pdf" width="100%" height="600px" />
                    <a href="${fileUrl}" target="_blank" class="download-btn">Open PDF in New Tab</a>
                </div>`;
            } else {
                return `
                <div class="slip-card">
                    <div class="title">Image ${index + 1}</div>
                    <img src="${fileUrl}" alt="Slip ${index + 1}"/>
                </div>`;
            }
        }).join('');

        const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Attached Slips - ${studentName || 'Student'}</title>
            <style>
                body { background-color: #0f172a; color: white; font-family: system-ui, -apple-system, sans-serif; padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 2rem; margin: 0; }
                .header { text-align: center; margin-bottom: 1rem; }
                .header h2 { color: #10b981; margin: 0; font-size: 2rem; }
                .header p { color: #94a3b8; font-size: 1rem; margin-top: 0.5rem; }
                .slip-card { background: #1e293b; border: 1px solid #334155; border-radius: 1rem; padding: 1.5rem; width: 100%; max-width: 800px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); }
                img { max-width: 100%; height: auto; border-radius: 0.5rem; border: 1px solid #334155; }
                embed { border-radius: 0.5rem; border: 1px solid #334155; background-color: white; }
                .title { width: 100%; text-align: left; margin-bottom: 1rem; font-size: 1rem; font-weight: bold; color: #cbd5e1; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
                .download-btn { margin-top: 1rem; padding: 0.5rem 1rem; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: bold; }
                .download-btn:hover { background-color: #2563eb; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Attached Documents & Slips</h2>
                <p>Student: ${studentName || 'Student'}</p>
            </div>
            ${slipsHtml}
        </body>
        </html>
        `;

        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write(htmlContent);
            newWindow.document.close();
        } else {
            toast.error("Popup blocked! Please allow popups for this site.");
        }
    };

    const getTabClass = (tabName) => {
        const base = "px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap border";
        if (activeTab !== tabName) return `${base} bg-white/5 border-white/5 text-slate-400 hover:bg-white/10`;
        switch(tabName) {
            case 'Pending': return `${base} bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20`;
            case 'Approved': return `${base} bg-blue-500/20 text-blue-400 border-blue-500/30`;
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

    const getCountdown = (expiryDate) => {
        if (!expiryDate) return "Active";
        const diff = new Date(expiryDate) - currentTime;
        if (diff <= 0) return "Expired";
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        return `${days}d ${hours}h left`;
    };

    const renderPaymentCard = (pay) => (
        <div key={pay.id} className="bg-black/30 border border-white/10 rounded-2xl p-5 md:p-6 relative overflow-hidden mb-4">
            <div className={`absolute top-0 left-0 w-1 h-full ${pay.method === 'PayHere' || pay.method === 'Online' ? 'bg-indigo-500' : 'bg-blue-500'}`}></div>
            
            <div className="absolute top-4 right-4 flex gap-2">
                {activeTab === 'Post Pay' && (
                    <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 animate-pulse">
                        <Unlock size={12}/> Time Left: {getCountdown(pay.validUntil)}
                    </div>
                )}
                {pay.status !== 'Trash' && (
                    <button onClick={() => handleAction(pay, 'Trash')} className="bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/30 p-2 rounded-lg transition-all" title="Move to Trash">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div className="flex flex-col justify-between items-start gap-4 mb-6 pr-10">
                <div>
                    <p className="text-xs text-slate-400 font-normal uppercase tracking-widest mb-1">{pay.date}</p>
                    <h5 className="text-lg font-bold text-white">{pay.business} <span className="text-slate-400 text-sm font-normal">| {pay.batch}</span></h5>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="bg-white/10 text-white text-[10px] px-2 py-1 rounded font-normal uppercase tracking-widest">{pay.type}</span>
                        {pay.type === 'Installment' && (
                            <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-1 rounded font-normal uppercase tracking-widest border border-purple-500/30">
                                Phase {pay.installmentNo} of {Math.max(pay.installmentNo, pay.totalPhases || 1)}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`${pay.method === 'PayHere' || pay.method === 'Online' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-blue-500/10 border-blue-500/20'} p-3 rounded-xl border min-w-[140px]`}>
                    <p className={`text-[10px] ${pay.method === 'PayHere' || pay.method === 'Online' ? 'text-indigo-400' : 'text-blue-400'} font-normal uppercase tracking-widest mb-1`}>Paid via {pay.method}</p>
                    <p className="text-2xl font-bold text-white">LKR {parseFloat(pay.amount).toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-6">
                <div className="flex justify-between items-start">
                    <h6 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldCheck size={14}/> System Tally</h6>
                    
                    {(pay.excessAmount > 0 || pay.arrearsAmount > 0) && (
                        <div className="flex gap-2">
                            {pay.excessAmount > 0 && <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Excess: +LKR {pay.excessAmount}</span>}
                            {pay.arrearsAmount > 0 && <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Short: -LKR {pay.arrearsAmount}</span>}
                        </div>
                    )}
                </div>
                
                {pay.subjectsList && pay.subjectsList.length > 0 ? (
                    <div className="space-y-2 mb-4">
                        {pay.subjectsList.map((sub, i) => (
                            <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                <span className="text-white font-medium">{sub.name} <span className="text-xs text-slate-500">({sub.code})</span></span>
                                <span className="text-emerald-400 font-medium">LKR {parseFloat(sub.price).toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center text-sm pt-2">
                            <span className="text-white font-bold">System Expected Total:</span>
                            <span className="text-red-400 font-bold text-lg">LKR {parseFloat(pay.systemTotal).toLocaleString()}</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 mb-4 font-normal">No specific subjects selected or recognized.</p>
                )}

                {pay.type === 'Installment' ? (
                    <div className="p-3 rounded-lg text-xs font-medium flex items-center justify-between border bg-purple-500/10 text-purple-400 border-purple-500/20">
                        <span>Amount on Slip: LKR {parseFloat(pay.amount).toLocaleString()}</span>
                        <span>Partial Installment Expected</span>
                    </div>
                ) : (
                    <div className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between border ${parseFloat(pay.systemTotal) === parseFloat(pay.amount) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        <span>Amount on Slip: LKR {parseFloat(pay.amount).toLocaleString()}</span>
                        {parseFloat(pay.systemTotal) !== parseFloat(pay.amount) && <span>Mismatch Detected!</span>}
                        {parseFloat(pay.systemTotal) === parseFloat(pay.amount) && <span>Perfect Match!</span>}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileImage size={14}/> Attached Slips</p>
                        {pay.slips && pay.slips.length > 0 && (
                            <button 
                                onClick={() => openSlipsInNewTab(pay.slips, studentActionModal?.studentName || pay.studentName)}
                                className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all border border-blue-500/30 shadow-lg shadow-blue-500/10"
                            >
                                Open Slips View
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {pay.slips && pay.slips.length > 0 ? pay.slips.map((imgStr, i) => {
                            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                            const backendBaseUrl = isLocalhost ? 'http://localhost:5000' : 'https://imacampus.online';
                            const fileUrl = `${backendBaseUrl}/api/storage/documents/${imgStr}`; 
                            const isPdf = imgStr.toLowerCase().endsWith('.pdf');
                            
                            return (
                                <div key={i} onClick={() => openSlipsInNewTab(pay.slips, studentActionModal?.studentName || pay.studentName)} className="relative shrink-0 w-20 h-20 border border-white/10 rounded-lg overflow-hidden hover:border-emerald-500 transition-colors cursor-pointer bg-black/40 flex items-center justify-center group" title="Click to view slip">
                                    {isPdf ? (
                                        <div className="flex flex-col items-center text-white/50 text-[10px] font-normal uppercase"><FileText size={24} className="text-red-400 mb-1"/> PDF</div>
                                    ) : (
                                        <img src={fileUrl} alt="slip" className="h-full w-full object-cover" onError={(e) => { e.target.src='/logo.png'; }} />
                                    )}
                                </div>
                            )
                        }) : <span className="text-xs text-slate-500 font-normal">No slips uploaded.</span>}
                    </div>
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><MessageSquare size={14}/> System Remark</p>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-slate-300 italic min-h-[80px] whitespace-pre-wrap font-normal">
                        {pay.remark ? pay.remark : "No remark."}
                    </div>
                </div>
            </div>

            {/* PROCESS PAYMENT ACTIONS */}
            {['Pending', 'Non Paid', 'Upcoming', 'Rejected'].includes(activeTab) && pay.status !== 'Approved' && (
                <div className="bg-[#1e2336] rounded-xl border border-white/10 p-4">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-3 text-center">Process Payment</p>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <button disabled={actioningPaymentId === pay.id} onClick={() => openApproveModal(pay, false)} className="flex-1 min-w-[120px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex justify-center items-center gap-2">
                            {actioningPaymentId === pay.id ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>} Approve & Verify Amount
                        </button>
                        
                        <button disabled={actioningPaymentId === pay.id} onClick={() => openApproveModal(pay, true)} className="flex-1 min-w-[120px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex justify-center items-center gap-2">
                            {actioningPaymentId === pay.id ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} Approve & Self-Picked
                        </button>
                        
                        {/* 🔥 FIX: Post Pay (Temp Unlock) for Monthly and Installment */}
                        {(pay.type === 'Installment' || pay.type === 'Monthly') && (
                            <button disabled={actioningPaymentId === pay.id} onClick={() => openAdvancedModal('PostPay', pay)} className="flex-1 min-w-[120px] bg-orange-500/20 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/30 font-medium py-3 rounded-xl transition-all text-xs uppercase tracking-widest flex justify-center items-center gap-2">
                                <Unlock size={16}/> Grant Post Pay (7 Days)
                            </button>
                        )}

                        <button disabled={actioningPaymentId === pay.id} onClick={() => handleAction(pay, 'Reject')} className="flex-1 min-w-[120px] bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-medium py-3 rounded-xl transition-all text-xs uppercase tracking-widest flex justify-center items-center gap-2">
                            <CloseIcon size={16}/> Reject
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 border-t border-white/5 pt-3">
                        <button disabled={actioningPaymentId === pay.id} onClick={() => openAdvancedModal('FreeCard', pay)} className="flex-1 bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-white border border-yellow-500/30 font-medium py-2.5 rounded-xl transition-all text-xs uppercase tracking-widest flex justify-center items-center gap-2">
                            <Gift size={14}/> Free Card (LKR 0)
                        </button>
                        <button disabled={actioningPaymentId === pay.id} onClick={() => openAdvancedModal('Discount', pay)} className="flex-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 font-medium py-2.5 rounded-xl transition-all text-xs uppercase tracking-widest flex justify-center items-center gap-2">
                            <Tag size={14}/> Custom Approval
                        </button>
                    </div>
                </div>
            )}

            {/* 🔥 Delivery Hub Button manually for Free Card and Discount */}
            {['Free Card', 'Discount'].includes(pay.status) && (
                <div className="flex flex-col md:flex-row gap-2 border-t border-white/5 pt-3 mt-3">
                    <button disabled={actioningPaymentId === pay.id} onClick={() => handleAction(pay, 'SendToDelivery')} className="flex-1 bg-purple-500/20 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500/30 font-medium py-2.5 rounded-xl transition-all text-xs uppercase tracking-widest flex justify-center items-center gap-2">
                        <Truck size={14}/> Send to Delivery Hub
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full animate-fade-in text-slate-200 pb-10 font-sans relative">
            <div className="flex items-center gap-4 mb-8 bg-[#1e2336]/60 p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-xl backdrop-blur-xl">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 shrink-0">
                    <Wallet size={28}/>
                </div>
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-wide">Manage Payments</h2>
                    <p className="text-slate-400 font-normal text-sm mt-1">Manage student payments, review slips, and filter effortlessly.</p>
                </div>
            </div>

            <PaymentFilters 
                isAdmin={isAdmin} filters={filters} setFilters={setFilters} 
                businesses={businesses} batches={batches} groups={groups} 
                subjects={subjects} stats={stats} onOpenStaffStats={() => setShowStaffModal(true)}
            />

            <div className="flex gap-3 mb-8 pb-2 overflow-x-auto custom-scrollbar">
                <button onClick={() => setActiveTab('Pending')} className={getTabClass('Pending')}><Clock size={16}/> Pending</button>
                <button onClick={() => setActiveTab('Approved')} className={getTabClass('Approved')}><Check size={16}/> Approved</button>
                <button onClick={() => setActiveTab('Free Card')} className={getTabClass('Free Card')}><Gift size={16}/> Free Card</button>
                <button onClick={() => setActiveTab('Discount')} className={getTabClass('Discount')}><Tag size={16}/> Discount</button>
                <button onClick={() => setActiveTab('Rejected')} className={getTabClass('Rejected')}><CloseIcon size={16}/> Rejected</button>
                <button onClick={() => setActiveTab('Non Paid')} className={getTabClass('Non Paid')}><AlertCircle size={16}/> Non Paid</button>
                <button onClick={() => setActiveTab('Post Pay')} className={getTabClass('Post Pay')}><Unlock size={16}/> Post Pay</button>
                <button onClick={() => setActiveTab('Upcoming')} className={getTabClass('Upcoming')}><CalendarDays size={16}/> Upcoming Dues</button>
                <button onClick={() => setActiveTab('Trash')} className={getTabClass('Trash')}><Trash2 size={16}/> Trash</button>
            </div>

            {/* 🔥 APPROVED TAB MAIN VIEW SPLIT 🔥 */}
            {activeTab === 'Approved' ? (
                <div className="space-y-8">
                    {loading ? (
                        <div className="text-center py-20"><Loader2 className="animate-spin text-emerald-500 mx-auto" size={40}/></div>
                    ) : (
                        <>
                            {/* SLIP PAYMENTS SECTION */}
                            <div className="bg-[#1e2336]/40 p-6 rounded-[2rem] border border-emerald-500/20 shadow-lg">
                                <h3 className="text-emerald-400 font-bold text-lg mb-6 flex items-center gap-2"><FileImage size={20}/> Slip Payments</h3>
                                <div className="space-y-4">
                                    {paginatedStudents.map(student => {
                                        const slipPays = student.allPayments.filter(p => p.method !== 'PayHere' && p.method !== 'Online');
                                        if (slipPays.length === 0) return null;
                                        return (
                                            <div key={`slip-${student.studentId}`} className="bg-[#15192b] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
                                                <div className="flex items-center gap-4 w-full">
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><User size={20}/></div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-md">{student.studentName} <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 ml-2">{student.studentNo}</span></h4>
                                                        <p className="text-xs text-slate-400 mt-1">{slipPays.length} Slip Payment(s)</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setStudentActionModal({ ...student, allPayments: slipPays })} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 py-2 px-6 rounded-xl transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap">View Records</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ONLINE PAYMENTS SECTION */}
                            <div className="bg-[#1e2336]/40 p-6 rounded-[2rem] border border-indigo-500/20 shadow-lg">
                                <h3 className="text-indigo-400 font-bold text-lg mb-6 flex items-center gap-2"><CreditCard size={20}/> Online (PayHere) Payments</h3>
                                <div className="space-y-4">
                                    {paginatedStudents.map(student => {
                                        const onlinePays = student.allPayments.filter(p => p.method === 'PayHere' || p.method === 'Online');
                                        if (onlinePays.length === 0) return null;
                                        return (
                                            <div key={`online-${student.studentId}`} className="bg-[#15192b] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
                                                <div className="flex items-center gap-4 w-full">
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-indigo-500/20 bg-indigo-500/10 text-indigo-400"><User size={20}/></div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-md">{student.studentName} <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 ml-2">{student.studentNo}</span></h4>
                                                        <p className="text-xs text-slate-400 mt-1">{onlinePays.length} Online Payment(s)</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setStudentActionModal({ ...student, allPayments: onlinePays })} className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 py-2 px-6 rounded-xl transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap">View Records</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-6 bg-[#1e2336]/40 p-4 rounded-xl border border-white/5">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 transition-colors"><ChevronLeft size={16}/> Prev</button>
                                    <span className="text-sm font-medium text-white bg-black/40 px-4 py-1.5 rounded-lg border border-white/5">Page {currentPage} of {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 transition-colors">Next <ChevronRight size={16}/></button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-20"><Loader2 className="animate-spin text-emerald-500 mx-auto" size={40}/></div>
                    ) : paginatedStudents.length === 0 ? (
                        <div className="text-center py-20 bg-[#1e2336]/40 rounded-[2rem] border border-white/5"><p className="text-slate-500 font-normal text-lg">No records found for the selected filters.</p></div>
                    ) : (
                        <>
                            {paginatedStudents.map(student => {
                                const latestPayment = student.allPayments[0];
                                return (
                                <div key={student.studentId} className="bg-[#1e2336]/80 border border-white/5 hover:border-white/10 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row items-start justify-between gap-6 transition-colors shadow-lg">
                                    <div className="flex items-start gap-4 flex-1 w-full">
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 mt-1">
                                            <User size={26} strokeWidth={1.5}/>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-lg text-white flex items-center gap-3">
                                                {student.studentName} 
                                                <span className="text-[10px] font-normal text-white/50 bg-black/40 px-2.5 py-1 rounded-md border border-white/5 tracking-widest uppercase">{student.studentNo}</span>
                                            </h4>
                                            {latestPayment && (
                                                <>
                                                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
                                                        <span className="text-white font-medium bg-white/10 px-2 py-0.5 rounded">{latestPayment.date}</span>
                                                        <span>• {latestPayment.business}</span>
                                                        <span>• {latestPayment.batch}</span>
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 mt-3 items-center">
                                                        <span className="text-[10px] font-normal bg-blue-500/10 text-blue-400 px-3 py-1 rounded-md border border-blue-500/20 uppercase tracking-widest">Type: {latestPayment.type}</span>
                                                        <span className="text-[10px] font-normal bg-purple-500/10 text-purple-400 px-3 py-1 rounded-md border border-purple-500/20 uppercase tracking-widest">Method: {latestPayment.method}</span>
                                                        {student.allPayments.length > 1 && <span className="text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded uppercase tracking-widest">+{student.allPayments.length - 1} Payments</span>}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t border-white/5 md:border-t-0 pt-4 md:pt-0 shrink-0">
                                        <button onClick={() => setStudentActionModal(student)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-8 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg whitespace-nowrap">
                                            Review Payments
                                        </button>
                                    </div>
                                </div>
                            )})}

                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-6 bg-[#1e2336]/40 p-4 rounded-xl border border-white/5">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 transition-colors"><ChevronLeft size={16}/> Prev</button>
                                    <span className="text-sm font-medium text-white bg-black/40 px-4 py-1.5 rounded-lg border border-white/5">Page {currentPage} of {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 transition-colors">Next <ChevronRight size={16}/></button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {studentActionModal && createPortal(
                <div className="fixed inset-0 z-[9990] bg-[#0a0f1c]/95 backdrop-blur-sm overflow-y-auto custom-scrollbar p-2 md:p-6 flex items-start justify-center">
                    <div className="bg-[#15192b] border border-white/10 rounded-[2rem] w-full max-w-6xl shadow-2xl relative animate-in zoom-in-95 duration-200 mt-4 md:mt-10 mb-10 flex flex-col">
                        
                        <div className="sticky top-0 z-50 bg-[#15192b] border-b border-white/5 p-6 rounded-t-[2rem] flex justify-between items-center shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex justify-center items-center"><User size={24}/></div>
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-wide">{studentActionModal.studentName}</h3>
                                    <p className="text-xs text-emerald-400 font-normal tracking-widest uppercase">{studentActionModal.studentNo}</p>
                                </div>
                            </div>
                            <button onClick={() => setStudentActionModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2.5 rounded-xl transition-all"><CloseIcon size={20} strokeWidth={3} /></button>
                        </div>

                        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            <div className="lg:col-span-2 space-y-6">
                                <h4 className="font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2"><AlertCircle className="text-red-500" size={16}/> Target Records ({activeTab})</h4>
                                
                                {(() => {
                                    const targetPayments = (studentActionModal.allPayments || []).filter(p => {
                                        if (activeTab === 'Trash') return p.status === 'Trash';
                                        if (activeTab === 'Approved') return p.status === 'Approved';
                                        return p.status === activeTab && p.status !== 'Trash';
                                    });

                                    if (targetPayments.length === 0) {
                                        return <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center text-slate-400 text-sm font-normal">No payments mapped to this tab currently.</div>;
                                    }

                                    // Split Approved Modal View
                                    if (activeTab === 'Approved') {
                                        const slipApproved = targetPayments.filter(p => p.method !== 'PayHere' && p.method !== 'Online');
                                        const onlineApproved = targetPayments.filter(p => p.method === 'PayHere' || p.method === 'Online');

                                        return (
                                            <>
                                                {slipApproved.length > 0 && (
                                                    <div className="mb-8">
                                                        <h5 className="text-emerald-400 text-sm font-bold mb-4 border-b border-emerald-500/20 pb-2 uppercase tracking-widest">Slip Payments</h5>
                                                        {slipApproved.map(pay => renderPaymentCard(pay))}
                                                    </div>
                                                )}
                                                {onlineApproved.length > 0 && (
                                                    <div className="mb-6">
                                                        <h5 className="text-indigo-400 text-sm font-bold mb-4 border-b border-indigo-500/20 pb-2 uppercase tracking-widest">Online (PayHere) Payments</h5>
                                                        {onlineApproved.map(pay => renderPaymentCard(pay))}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    }

                                    return targetPayments.map(pay => renderPaymentCard(pay));
                                })()}
                            </div>

                            <div className="bg-black/20 rounded-[1.5rem] border border-white/5 p-5 h-max sticky top-24">
                                <h4 className="font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2 mb-4"><Clock className="text-blue-500" size={16}/> Payment History</h4>
                                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                    {(studentActionModal.allPayments || []).filter(p => {
                                        const isActiveTabMatch = activeTab === 'Approved' ? p.status === 'Approved' : (activeTab === 'Trash' ? p.status === 'Trash' : p.status === activeTab && p.status !== 'Trash');
                                        return !isActiveTabMatch; 
                                    }).length === 0 && (
                                        <p className="text-xs text-slate-500 italic font-normal">No past payment history.</p>
                                    )}
                                    
                                    {(studentActionModal.allPayments || []).filter(p => {
                                        const isActiveTabMatch = activeTab === 'Approved' ? p.status === 'Approved' : (activeTab === 'Trash' ? p.status === 'Trash' : p.status === activeTab && p.status !== 'Trash');
                                        return !isActiveTabMatch; 
                                    }).map(hist => (
                                        <div key={hist.id} className={`bg-white/5 rounded-xl p-3 border ${hist.status === 'Trash' ? 'border-red-500/30 opacity-60' : 'border-white/5'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[9px] font-normal uppercase tracking-widest px-2 py-0.5 rounded border ${hist.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : hist.status === 'Trash' ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{hist.status}</span>
                                                <span className="text-[10px] text-slate-500 font-normal">{hist.date}</span>
                                            </div>
                                            <p className="text-sm font-medium text-white leading-tight">{hist.business}</p>
                                            <p className="text-xs text-slate-400 mb-2 font-normal">{hist.batch}</p>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-normal">{hist.type}</span>
                                                <div className="flex items-center gap-3">
                                                    {hist.slips && hist.slips.length > 0 && (
                                                        <button onClick={() => openSlipsInNewTab(hist.slips, studentActionModal.studentName)} className="text-[10px] text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0">
                                                            View Slips
                                                        </button>
                                                    )}
                                                    <span className="font-bold text-white">LKR {parseFloat(hist.amount).toLocaleString()}</span>
                                                </div>
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

            {/* 🔥 NEW APPROVAL MODAL (WITH ACTUAL AMOUNT) 🔥 */}
            {approveModal && createPortal(
                <div className="fixed inset-0 z-[99999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-[#15192b] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><CheckCircle2 className="text-emerald-500"/> Verify Payment</h3>
                            <button onClick={() => setApproveModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"><CloseIcon size={20} /></button>
                        </div>
                        
                        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Expected Amount</p>
                            <p className="text-3xl font-black text-white">LKR {parseFloat(approveModal.payment.amount || 0).toLocaleString()}</p>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block">Actual Amount Paid (LKR)</label>
                            <input 
                                type="number" 
                                value={actualAmount} 
                                onChange={e => setActualAmount(e.target.value)} 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-emerald-500 text-lg text-center" 
                            />
                            <p className="text-[10px] text-slate-500 mt-2 text-center">Wallet will auto-adjust if this differs.</p>
                        </div>

                        <div className="mb-6">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block flex items-center gap-1">Admin Remark (Optional)</label>
                            <textarea 
                                value={actionRemark} 
                                onChange={e => setActionRemark(e.target.value)} 
                                placeholder="Any internal notes?" rows="2" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white font-normal outline-none focus:border-emerald-500 transition-colors resize-none"
                            ></textarea>
                        </div>

                        <button disabled={actioningPaymentId !== null} onClick={submitApprove} className="w-full font-bold py-4 rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20">
                            {actioningPaymentId !== null ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>} 
                            Confirm Approve {approveModal.isSelfPicked && '(Self-Picked)'}
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {advancedActionModal && createPortal(
                <div className="fixed inset-0 z-[99999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-[#15192b] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {advancedActionModal.type === 'Discount' && <><Tag className="text-cyan-400"/> Set Custom Prices</>}
                                {advancedActionModal.type === 'FreeCard' && <><Gift className="text-yellow-400"/> Grant Free Card</>}
                                {advancedActionModal.type === 'PostPay' && <><Unlock className="text-orange-400"/> Grant Post Pay</>}
                            </h3>
                            <button onClick={() => setAdvancedActionModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"><CloseIcon size={20} /></button>
                        </div>

                        {advancedActionModal.type === 'Discount' && (
                            <div className="space-y-4 mb-6">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Subject Breakdown</p>
                                {advancedActionModal.payment.subjectsList.map(sub => (
                                    <div key={sub.id} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                                        <div className="flex-1 pr-4 truncate">
                                            <p className="text-sm font-medium text-white truncate">{sub.name}</p>
                                            <p className="text-[10px] text-slate-500 font-normal">System: LKR {parseFloat(sub.price).toLocaleString()}</p>
                                        </div>
                                        <div className="w-1/3 relative shrink-0">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-medium">LKR</span>
                                            <input type="number" value={customPrices[sub.id] || ''} onChange={e => handleCustomPriceChange(sub.id, e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white font-medium outline-none focus:border-cyan-500" />
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center pt-2 px-2">
                                    <span className="text-slate-400 text-sm font-medium">Calculated Total:</span>
                                    <span className="text-cyan-400 text-xl font-bold">
                                        LKR {Object.values(customPrices).reduce((sum, val) => sum + (parseFloat(val) || 0), 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}

                        {advancedActionModal.type === 'PostPay' && (
                            <div className="mb-6 bg-orange-500/10 border border-orange-500/20 p-5 rounded-xl text-center">
                                <AlertCircle size={30} className="text-orange-400 mx-auto mb-3" />
                                <p className="text-sm text-white font-medium">This will grant the student 7 days of temporary access.</p>
                                <p className="text-xs text-slate-400 mt-2">After 7 days, if the slip is not approved, access will be automatically revoked.</p>
                            </div>
                        )}

                        {(advancedActionModal.type === 'Discount' || advancedActionModal.type === 'FreeCard') && (
                            <div className="mb-6">
                                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block flex items-center gap-1">Admin Remark <span className="text-red-500">*</span></label>
                                <textarea value={actionRemark} onChange={e => setActionRemark(e.target.value)} placeholder="Why are you giving this discount/free card?" rows="3" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white font-normal outline-none focus:border-blue-500 transition-colors resize-none"></textarea>
                            </div>
                        )}

                        <button disabled={actioningPaymentId !== null} onClick={submitAdvancedAction} className={`w-full font-bold py-4 rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg ${advancedActionModal.type === 'Discount' ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20' : advancedActionModal.type === 'FreeCard' ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-500/20' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/20'}`}>
                            {actioningPaymentId !== null ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>} 
                            Confirm {advancedActionModal.type === 'Discount' ? 'Custom Approval' : advancedActionModal.type === 'FreeCard' ? 'Free Card' : '7 Days Temp Unlock'}
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* 🔥 Installment Verify Modal with Actual Amount 🔥 */}
            {installmentModal && createPortal(
                <div className="fixed inset-0 z-[99999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md">
                    <form onSubmit={handleInstallmentApprove} className="bg-[#15192b] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2"><CheckCircle2 className="text-emerald-500"/> Verify Installment</h3>
                            <button type="button" onClick={() => setInstallmentModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"><CloseIcon size={16} /></button>
                        </div>

                        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Expected Installment</p>
                            <p className="text-2xl font-black text-white">LKR {parseFloat(installmentModal.payment.amount || 0).toLocaleString()}</p>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block">Actual Amount Paid (LKR)</label>
                            <input 
                                type="number" 
                                value={actualAmount} 
                                onChange={e => setActualAmount(e.target.value)} 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-emerald-500 text-center text-lg" 
                            />
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block">Next Phase Due Date</label>
                            <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-normal outline-none focus:border-emerald-500" />
                        </div>

                        <div className="mb-6">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block flex items-center gap-1">Admin Remark (Optional)</label>
                            <textarea 
                                value={actionRemark} 
                                onChange={e => setActionRemark(e.target.value)} 
                                placeholder="Any notes?" rows="2" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white font-normal outline-none focus:border-emerald-500 transition-colors resize-none"
                            ></textarea>
                        </div>

                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-4 text-xs tracking-widest uppercase font-bold transition-all shadow-lg shadow-emerald-600/20 flex justify-center items-center gap-2">
                            <Check size={16}/> Confirm Installment
                        </button>
                    </form>
                </div>,
                document.body
            )}

            {showStaffModal && (
                <StaffPerformanceModal 
                    onClose={() => setShowStaffModal(false)} 
                />
            )}
        </div>
    );
}