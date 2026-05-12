import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X as CloseIcon, Clock, ShieldCheck, Wallet, CalendarDays, AlertCircle, Loader2, User, Tag, Gift, FileImage, MessageSquare, Trash2, ChevronLeft, ChevronRight, CreditCard, FileText, CheckCircle2, Truck, Unlock } from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import PaymentFilters from './PaymentFilters';
import StaffPerformanceModal from './StaffPerformanceModal';
import ExportReportModal from './ExportReportModal'; // 🔥 ALUTHIN ADD KALA: Export Modal Import eka

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
    const [approvedFilter, setApprovedFilter] = useState('All');

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
    const [institutePaymentModal, setInstitutePaymentModal] = useState(null);
    
    // 🔥 ALUTHIN ADD KALA: Export Modal State eka
    const [showExportModal, setShowExportModal] = useState(false);

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
            const uniqueBatches = Array.from(new Set(payments.map(p => JSON.stringify({ id: p.batchId || p.batch_id, name: p.batch || p.batchName }))))
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
                    if (c.id) extractedSubjects.set(c.id, { id: c.id, name: c.name, code: c.code || '' });
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

    useEffect(() => {
        setCurrentPage(1);
        setApprovedFilter('All');
    }, [activeTab, filters]);

    const filteredPayments = payments.filter(p => {
        let matchesTab = false;
        if (activeTab === 'Trash') matchesTab = p.status === 'Trash';
        else if (activeTab === 'Approved') matchesTab = p.status === 'Approved';
        else matchesTab = p.status === activeTab && p.status !== 'Trash';

        const searchVal = filters.search.toLowerCase();
        const matchesSearch = 
    p.studentName?.toLowerCase().includes(searchVal) || 
    p.studentNo?.toLowerCase().includes(searchVal) || 
    p.phone?.toLowerCase().includes(searchVal);

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
            acc[pay.studentId] = { studentId: pay.studentId, studentName: pay.studentName, studentNo: pay.studentNo, phone: pay.phone, allPayments: [] };
        }
        acc[pay.studentId].allPayments.push(pay);
        return acc;
    }, {});

    const visibleStudents = Object.values(groupedAllByStudent).sort((a, b) => {
        if (activeTab === 'Post Pay') {
            const aPay = a.allPayments.find(p => p.status === 'Post Pay');
            const bPay = b.allPayments.find(p => p.status === 'Post Pay');
            const aTime = aPay && aPay.validUntil ? new Date(aPay.validUntil).getTime() : 9999999999999;
            const bTime = bPay && bPay.validUntil ? new Date(bPay.validUntil).getTime() : 9999999999999;
            return aTime - bTime;
        }
        return 0;
    });

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
            refreshAfterAction(payment.studentId);
        } catch (error) {
            toast.error(`Failed to process payment.`);
        } finally {
            setActioningPaymentId(null);
        }
    };

    const handleQuickApprove = async (payment, isSelfPicked = false) => {
        if (!window.confirm(`Directly approve this payment for exactly LKR ${parseFloat(payment.amount).toLocaleString()}?`)) return;

        try {
            setActioningPaymentId(payment.id);
            if (payment.type === 'Installment') {
                await axios.post('/admin/payments/action/installment', {
                    paymentId: payment.id,
                    nextDueDate: getDefaultNextDueDate(),
                    action: 'Approve',
                    actualAmountPaid: parseFloat(payment.amount),
                    remark: '',
                    isSelfPicked: isSelfPicked
                });
            } else {
                await axios.post('/admin/payments/action', {
                    paymentId: payment.id,
                    action: 'Approve',
                    isSelfPicked: isSelfPicked,
                    actualAmountPaid: parseFloat(payment.amount),
                    remark: ''
                });
            }
            toast.success(`Payment Quick Approved${isSelfPicked ? ' (Self-Picked)' : ''}!`);
            refreshAfterAction(payment.studentId);
        } catch (error) {
            toast.error(`Failed to approve payment.`);
        } finally {
            setActioningPaymentId(null);
        }
    };

    const handleInstituteApprove = async (isSelfPicked) => {
        const payment = institutePaymentModal;
        try {
            setActioningPaymentId(payment.id);
            if (payment.type === 'Installment') {
                await axios.post('/admin/payments/action/installment', {
                    paymentId: payment.id,
                    nextDueDate: getDefaultNextDueDate(),
                    action: 'Approve',
                    actualAmountPaid: parseFloat(payment.amount),
                    remark: '[Institute Payment]',
                    isSelfPicked: isSelfPicked
                });
            } else {
                await axios.post('/admin/payments/action', {
                    paymentId: payment.id,
                    action: 'Approve',
                    isSelfPicked: isSelfPicked,
                    actualAmountPaid: parseFloat(payment.amount),
                    remark: '[Institute Payment]'
                });
            }
            toast.success(`Institute Payment Approved! ${isSelfPicked ? '(No Delivery)' : '(Sent to Delivery)'}`);
            refreshAfterAction(payment.studentId);
        } catch (error) {
            toast.error(`Failed to approve payment.`);
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
            refreshAfterAction(payment.studentId);
        } catch (error) { toast.error("Failed to process installment."); }
    };

    const handleAction = async (payment, action, isSelfPicked = false) => {
        let confirmMessage = `Are you sure you want to ${action} this payment?`;
        if (isSelfPicked) confirmMessage = `Approve and mark as SELF-PICKED (Tute Delivered)?`;
        if (action === 'SendToDelivery') confirmMessage = `Send this record to Delivery Hub?`;

        if (!window.confirm(confirmMessage)) return;

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

        if (type !== 'PostPay' && actionRemark.trim() === '') {
            return toast.error("A remark is mandatory for Discounts and Free Cards.");
        }

        try {
            setActioningPaymentId(payment.id);

            if (type === 'PostPay') {
                await axios.post('/admin/payments/post-pay', { paymentId: payment.id });
                toast.success(`Post Pay granted for 7 days!`);
            } else {
                let finalAmount = 0; let detailedRemark = actionRemark;

                if (type === 'FreeCard') {
                    detailedRemark = `[Free Card Granted]\nReason: ${actionRemark}`;
                } else if (type === 'Discount') {
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

            refreshAfterAction(payment.studentId);
        } catch (error) {
            toast.error("Failed to process action.");
        } finally {
            setActioningPaymentId(null);
        }
    };

    // 🔥 FIX: Modal ඔක්කොම වහලා Pending Tab එකට යනවා
    const refreshAfterAction = async (studentId) => {
        const payRes = await axios.get('/admin/payments');
        setPayments(payRes.data || []);

        setStudentActionModal(null);
        setAdvancedActionModal(null);
        setApproveModal(null);
        setInstitutePaymentModal(null);
        setInstallmentModal(null);

        setActiveTab('Pending');
    };

    const openAdvancedModal = (type, payment) => {
        setAdvancedActionModal({ type, payment });
        setActionRemark('');
        if (type === 'Discount') {
            const initialPrices = {};
            const subsList = payment.subjectsList || payment.subjects || payment.courses || [];
            subsList.forEach(s => initialPrices[s.id || s.course_id] = s.price || 0);
            setCustomPrices(initialPrices);
        }
    };

    const handleCustomPriceChange = (id, val) => setCustomPrices(prev => ({ ...prev, [id]: val }));

    const openSlipsInNewTab = (slips, studentName, studentNo, studentPhone) => {
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
                    <a href="${fileUrl}" target="_blank" class="download-btn">View Full Image</a>
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
                .student-badge { margin-top: 15px; display: inline-block; background: rgba(0,0,0,0.3); padding: 12px 24px; border-radius: 12px; border: 1px solid #334155; }
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
                <div class="student-badge">
                    <span style="color: #94a3b8; font-size: 1.1rem;">Name: <strong style="color: white;">${studentName || 'Student'}</strong></span>
                    <span style="color: #334155; margin: 0 15px;">|</span>
                    <span style="color: #94a3b8; font-size: 1.1rem;">ID: <strong style="color: #10b981;">${studentNo || 'N/A'}</strong></span>
                    <span style="color: #334155; margin: 0 15px;">|</span>
                    <span style="color: #94a3b8; font-size: 1.1rem;">Phone: <strong style="color: #3b82f6;">${studentPhone || 'N/A'}</strong></span>
                </div>
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
        const base = "px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap border backdrop-blur-md";
        if (activeTab !== tabName) return `${base} bg-slate-800/40 border-white/5 text-slate-400 hover:bg-slate-700/50 hover:text-white hover:border-white/10`;
        switch (tabName) {
            case 'Pending': return `${base} bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]`;
            case 'Approved': return `${base} bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]`;
            case 'Free Card': return `${base} bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.2)]`;
            case 'Discount': return `${base} bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]`;
            case 'Rejected': return `${base} bg-red-500/20 text-red-300 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]`;
            case 'Upcoming': return `${base} bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]`;
            case 'Non Paid': return `${base} bg-red-500/20 text-red-300 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]`;
            case 'Post Pay': return `${base} bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.2)]`;
            case 'Trash': return `${base} bg-slate-700/50 text-slate-200 border-slate-600 shadow-lg`;
            default: return `${base} bg-white/10 text-white border-white/20`;
        }
    };

    const getCountdown = (expiryDate) => {
        if (!expiryDate) return "ACTIVE";
        const diff = new Date(expiryDate).getTime() - new Date().getTime();
        if (diff <= 0) return "EXPIRED";

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        return `${days}d ${hours}h ${minutes}m left`;
    };

    const renderPaymentCard = (pay) => (
        <div key={pay.id} className="bg-slate-800/40 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-3xl p-6 relative overflow-hidden mb-5 shadow-xl transition-all duration-300 group">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${pay.method === 'PayHere' || pay.method === 'Online' ? 'bg-gradient-to-b from-indigo-400 to-indigo-600' : 'bg-gradient-to-b from-blue-400 to-blue-600'}`}></div>

            <div className="absolute top-4 right-4 flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                {pay.status === 'Post Pay' && (
                    <div className="bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 animate-pulse backdrop-blur-md">
                        <Unlock size={14} /> {getCountdown(pay.validUntil)}
                    </div>
                )}
                {pay.status !== 'Trash' && (
                    <button onClick={() => handleAction(pay, 'Trash')} className="bg-slate-900/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 p-2.5 rounded-xl transition-all backdrop-blur-md" title="Move to Trash">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pr-12">
                <div>
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest mb-1.5">{pay.date}</p>
                    <h5 className="text-xl font-bold text-white tracking-tight">{pay.business} <span className="text-slate-500 text-sm font-medium ml-2">{pay.batch}</span></h5>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="bg-white/5 text-slate-300 text-[10px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-widest border border-white/10">{pay.type}</span>
                        {pay.type === 'Installment' && (
                            <span className="bg-purple-500/10 text-purple-300 text-[10px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-widest border border-purple-500/20">
                                Phase {pay.installmentNo} of {Math.max(pay.installmentNo, pay.totalPhases || 1)}
                            </span>
                        )}
                    </div>
                </div>
                <div className={`${pay.method === 'PayHere' || pay.method === 'Online' ? 'bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20' : 'bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20'} p-4 rounded-2xl border min-w-[150px] text-right md:text-left backdrop-blur-md shadow-inner`}>
                    <p className={`text-[10px] ${pay.method === 'PayHere' || pay.method === 'Online' ? 'text-indigo-400' : 'text-blue-400'} font-semibold uppercase tracking-widest mb-1`}>Via {pay.method}</p>
                    <p className="text-3xl font-extrabold text-white tracking-tight"><span className="text-sm font-medium text-slate-400 mr-1">LKR</span>{parseFloat(pay.amount).toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-5 mb-6 shadow-inner">
                <div className="flex justify-between items-center mb-4">
                    <h6 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-500" /> System Tally</h6>

                    {(pay.excessAmount > 0 || pay.arrearsAmount > 0) && (
                        <div className="flex gap-2">
                            {pay.excessAmount > 0 && <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">Excess: +LKR {pay.excessAmount}</span>}
                            {pay.arrearsAmount > 0 && <span className="text-[11px] text-red-400 font-bold bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">Short: -LKR {pay.arrearsAmount}</span>}
                        </div>
                    )}
                </div>

                {pay.subjectsList && pay.subjectsList.length > 0 ? (
                    <div className="space-y-3 mb-4">
                        {pay.subjectsList.map((sub, i) => (
                            <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                <span className="text-slate-300 font-medium">{sub.name} <span className="text-xs text-slate-500 ml-1">({sub.code})</span></span>
                                <span className="text-emerald-400 font-semibold">LKR {parseFloat(sub.price).toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center text-sm pt-2">
                            <span className="text-slate-300 font-bold">System Expected:</span>
                            <span className="text-white font-black text-lg">LKR {parseFloat(pay.systemTotal).toLocaleString()}</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 mb-4 font-medium italic">No specific subjects recognized.</p>
                )}

                {pay.type === 'Installment' ? (
                    <div className="p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border bg-purple-500/10 text-purple-300 border-purple-500/20 backdrop-blur-md">
                        <span>Slip Amount: LKR {parseFloat(pay.amount).toLocaleString()}</span>
                        <span className="bg-purple-500/20 px-2 py-1 rounded-md">Partial Installment</span>
                    </div>
                ) : (
                    <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border backdrop-blur-md ${parseFloat(pay.systemTotal) === parseFloat(pay.amount) ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'}`}>
                        <span>Slip Amount: LKR {parseFloat(pay.amount).toLocaleString()}</span>
                        {parseFloat(pay.systemTotal) !== parseFloat(pay.amount) ? <span className="bg-red-500/20 px-2 py-1 rounded-md text-red-200">Mismatch Detected</span> : <span className="bg-emerald-500/20 px-2 py-1 rounded-md text-emerald-200">Perfect Match</span>}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileImage size={16} /> Slips & Docs</p>
                        {pay.slips && pay.slips.length > 0 && (
                            <button
                                onClick={() => openSlipsInNewTab(pay.slips, studentActionModal?.studentName || pay.studentName, studentActionModal?.studentNo || pay.studentNo, studentActionModal?.phone || pay.phone)}
                                className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all border border-blue-500/30 shadow-sm"
                            >
                                Open Gallery
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                        {pay.slips && pay.slips.length > 0 ? pay.slips.map((imgStr, i) => {
                            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                            const backendBaseUrl = isLocalhost ? 'http://localhost:5000' : 'https://imacampus.online';
                            const fileUrl = `${backendBaseUrl}/api/storage/documents/${imgStr}`;
                            const isPdf = imgStr.toLowerCase().endsWith('.pdf');

                            return (
                                <div key={i} onClick={() => openSlipsInNewTab(pay.slips, studentActionModal?.studentName || pay.studentName, studentActionModal?.studentNo || pay.studentNo, studentActionModal?.phone || pay.phone)} className="relative shrink-0 w-24 h-24 border border-white/10 rounded-xl overflow-hidden hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer bg-slate-900/50 flex items-center justify-center group" title="Click to view">
                                    {isPdf ? (
                                        <div className="flex flex-col items-center text-white/40 text-[10px] font-medium uppercase group-hover:text-white/80 transition-colors"><FileText size={28} className="text-red-400/80 mb-1.5 group-hover:text-red-400 transition-colors" /> PDF</div>
                                    ) : (
                                        <img src={fileUrl} alt="slip" className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-500" onError={(e) => { e.target.src = '/logo.png'; }} />
                                    )}
                                </div>
                            )
                        }) : <span className="text-xs text-slate-500 font-medium italic bg-slate-900/30 px-3 py-2 rounded-lg border border-white/5 inline-block">No documents attached</span>}
                    </div>
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><MessageSquare size={16} /> Remarks</p>
                    <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 text-sm text-slate-300 italic min-h-[96px] whitespace-pre-wrap font-medium shadow-inner">
                        {pay.remark ? pay.remark : "No system remarks available for this transaction."}
                    </div>
                </div>
            </div>

            {/* PROCESS PAYMENT ACTIONS */}
            {['Pending', 'Non Paid', 'Upcoming', 'Rejected', 'Post Pay'].includes(activeTab) && pay.status !== 'Approved' && (
                <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-5 mt-4 shadow-inner backdrop-blur-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                        <ShieldCheck size={14} /> Action Panel
                    </p>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <button disabled={actioningPaymentId === pay.id} onClick={() => handleQuickApprove(pay, false)} className="bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white py-3 px-2 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 text-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
                            {actioningPaymentId === pay.id ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />} Quick Approve
                        </button>

                        <button disabled={actioningPaymentId === pay.id} onClick={() => openApproveModal(pay, false)} className="bg-slate-800 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-500 py-3 px-2 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 text-center shadow-lg">
                            <Wallet size={18} /> Adjust Amount
                        </button>

                        <button disabled={actioningPaymentId === pay.id} onClick={() => setInstitutePaymentModal(pay)} className="bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 hover:border-indigo-500 py-3 px-2 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 text-center shadow-lg">
                            {actioningPaymentId === pay.id ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Institute
                        </button>

                        {activeTab !== 'Post Pay' && (
                            <button disabled={actioningPaymentId === pay.id} onClick={() => openAdvancedModal('PostPay', pay)} className="bg-slate-800 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 hover:border-orange-500 py-3 px-2 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 text-center shadow-lg">
                                <Unlock size={18} /> Post Pay
                            </button>
                        )}

                        <button disabled={actioningPaymentId === pay.id} onClick={() => openAdvancedModal('FreeCard', pay)} className="bg-slate-800 hover:bg-yellow-600 text-yellow-400 hover:text-white border border-yellow-500/30 hover:border-yellow-500 py-3 px-2 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 text-center shadow-lg">
                            <Gift size={18} /> Free Card
                        </button>

                        <button disabled={actioningPaymentId === pay.id} onClick={() => openAdvancedModal('Discount', pay)} className="bg-slate-800 hover:bg-cyan-600 text-cyan-400 hover:text-white border border-cyan-500/30 hover:border-cyan-500 py-3 px-2 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 text-center shadow-lg">
                            <Tag size={18} /> Discount
                        </button>

                        <button disabled={actioningPaymentId === pay.id} onClick={() => handleAction(pay, 'Reject')} className="bg-slate-800 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 py-3 px-2 rounded-xl transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1.5 text-center shadow-lg lg:col-span-1 col-span-2">
                            <CloseIcon size={18} /> Reject
                        </button>
                    </div>
                </div>
            )}

            {/* Delivery Hub Button */}
            {['Free Card', 'Discount', 'Approved'].includes(pay.status) && (
                <div className="mt-4">
                    <button
                        disabled={actioningPaymentId === pay.id || !!pay.hasDelivery}
                        onClick={() => handleAction(pay, 'SendToDelivery')}
                        className={`w-full py-4 rounded-xl transition-all text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg backdrop-blur-md ${pay.hasDelivery
                                ? 'bg-slate-800/50 text-slate-500 border border-white/5 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-purple-600/20 to-purple-500/20 hover:from-purple-600 hover:to-purple-500 text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                            }`}
                    >
                        <Truck size={18} /> {pay.hasDelivery ? 'Dispatched to Delivery' : 'Send to Delivery Hub'}
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full animate-fade-in text-slate-200 pb-10 font-sans relative">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 bg-gradient-to-r from-slate-900/80 to-slate-800/80 p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-center gap-5 relative z-10">
                    <div className="p-4 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-2xl border border-emerald-400/30 text-emerald-400 shadow-inner">
                        <Wallet size={32} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">Payment Hub</h2>
                        <p className="text-slate-400 font-medium text-sm mt-1">Review, approve, and manage transactions seamlessly.</p>
                    </div>
                </div>
            </div>

            {/* 🔥 ALUTHIN ADD KALA: onOpenExport prop eka */}
            <PaymentFilters
                isAdmin={isAdmin} filters={filters} setFilters={setFilters}
                businesses={businesses} batches={batches} groups={groups}
                subjects={subjects} stats={stats} onOpenStaffStats={() => setShowStaffModal(true)}
                onOpenExport={() => setShowExportModal(true)}
            />

            <div className="flex gap-3 mb-8 pb-3 overflow-x-auto custom-scrollbar p-1">
                <button onClick={() => setActiveTab('Pending')} className={getTabClass('Pending')}><Clock size={16} /> Pending</button>
                <button onClick={() => setActiveTab('Approved')} className={getTabClass('Approved')}><Check size={16} /> Approved</button>
                <button onClick={() => setActiveTab('Free Card')} className={getTabClass('Free Card')}><Gift size={16} /> Free Card</button>
                <button onClick={() => setActiveTab('Discount')} className={getTabClass('Discount')}><Tag size={16} /> Discount</button>
                <button onClick={() => setActiveTab('Rejected')} className={getTabClass('Rejected')}><CloseIcon size={16} /> Rejected</button>
                <button onClick={() => setActiveTab('Non Paid')} className={getTabClass('Non Paid')}><AlertCircle size={16} /> Non Paid</button>
                <button onClick={() => setActiveTab('Post Pay')} className={getTabClass('Post Pay')}><Unlock size={16} /> Post Pay</button>
                <button onClick={() => setActiveTab('Upcoming')} className={getTabClass('Upcoming')}><CalendarDays size={16} /> Upcoming Dues</button>
                <button onClick={() => setActiveTab('Trash')} className={getTabClass('Trash')}><Trash2 size={16} /> Trash</button>
            </div>

            {/* APPROVED TAB MAIN VIEW SPLIT */}
            {activeTab === 'Approved' ? (
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 p-2 rounded-2xl w-max border border-white/5 backdrop-blur-md shadow-inner">
                        <button onClick={() => setApprovedFilter('All')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${approvedFilter === 'All' ? 'bg-white/10 text-white border border-white/10 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>All Approved</button>
                        <button onClick={() => setApprovedFilter('Slips')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${approvedFilter === 'Slips' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-md' : 'text-slate-400 hover:text-white hover:bg-emerald-500/10'}`}>Slip Payments</button>
                        <button onClick={() => setApprovedFilter('Online')} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${approvedFilter === 'Online' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-md' : 'text-slate-400 hover:text-white hover:bg-indigo-500/10'}`}>Online (PayHere)</button>
                    </div>

                    {loading ? (
                        <div className="text-center py-20"><Loader2 className="animate-spin text-emerald-500 mx-auto" size={40} /></div>
                    ) : (
                        <>
                            {/* SLIP PAYMENTS SECTION */}
                            {(approvedFilter === 'All' || approvedFilter === 'Slips') && (
                                <div className="bg-slate-800/30 backdrop-blur-xl p-6 rounded-[2rem] border border-emerald-500/20 shadow-xl">
                                    <h3 className="text-emerald-400 font-bold text-lg mb-6 flex items-center gap-2"><FileImage size={20} /> Slip Payments</h3>
                                    <div className="space-y-4">
                                        {paginatedStudents.map(student => {
                                            const slipPays = student.allPayments.filter(p => p.method !== 'PayHere' && p.method !== 'Online');
                                            if (slipPays.length === 0) return null;
                                            return (
                                                <div key={`slip-${student.studentId}`} className="bg-slate-900/60 border border-white/5 hover:border-white/10 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-md transition-colors">
                                                    <div className="flex items-center gap-4 w-full">
                                                        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><User size={20} /></div>
                                                        <div>
                                                            <h4 className="font-bold text-white text-md flex items-center flex-wrap gap-2">
                                                                {student.studentName}
                                                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 tracking-widest uppercase">{student.studentNo}</span>
                                                                {student.phone && student.phone !== 'N/A' && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 tracking-widest uppercase">{student.phone}</span>}
                                                            </h4>
                                                            <p className="text-xs text-slate-400 mt-1">{slipPays.length} Slip Payment(s)</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setStudentActionModal({ ...student, allPayments: slipPays })} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 py-2 px-6 rounded-xl transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap">View Records</button>
                                                </div>
                                            );
                                        })}
                                        {paginatedStudents.every(s => s.allPayments.filter(p => p.method !== 'PayHere' && p.method !== 'Online').length === 0) && (
                                            <p className="text-slate-500 text-sm italic">No approved slip payments found.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ONLINE PAYMENTS SECTION */}
                            {(approvedFilter === 'All' || approvedFilter === 'Online') && (
                                <div className="bg-slate-800/30 backdrop-blur-xl p-6 rounded-[2rem] border border-indigo-500/20 shadow-xl mt-6">
                                    <h3 className="text-indigo-400 font-bold text-lg mb-6 flex items-center gap-2"><CreditCard size={20} /> Online (PayHere) Payments</h3>
                                    <div className="space-y-4">
                                        {paginatedStudents.map(student => {
                                            const onlinePays = student.allPayments.filter(p => p.method === 'PayHere' || p.method === 'Online');
                                            if (onlinePays.length === 0) return null;
                                            return (
                                                <div key={`online-${student.studentId}`} className="bg-slate-900/60 border border-white/5 hover:border-white/10 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-md transition-colors">
                                                    <div className="flex items-center gap-4 w-full">
                                                        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-indigo-500/20 bg-indigo-500/10 text-indigo-400"><User size={20} /></div>
                                                        <div>
                                                            <h4 className="font-bold text-white text-md flex items-center flex-wrap gap-2">
                                                                {student.studentName}
                                                                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 tracking-widest uppercase">{student.studentNo}</span>
                                                                {student.phone && student.phone !== 'N/A' && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 tracking-widest uppercase">{student.phone}</span>}
                                                            </h4>
                                                            <p className="text-xs text-slate-400 mt-1">{onlinePays.length} Online Payment(s)</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setStudentActionModal({ ...student, allPayments: onlinePays })} className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 py-2 px-6 rounded-xl transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap">View Records</button>
                                                </div>
                                            );
                                        })}
                                        {paginatedStudents.every(s => s.allPayments.filter(p => p.method === 'PayHere' || p.method === 'Online').length === 0) && (
                                            <p className="text-slate-500 text-sm italic">No approved online payments found.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-6 bg-slate-800/40 backdrop-blur-md p-4 rounded-xl border border-white/5 shadow-inner">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 transition-colors"><ChevronLeft size={16} /> Prev</button>
                                    <span className="text-sm font-medium text-white bg-black/40 px-4 py-1.5 rounded-lg border border-white/5">Page {currentPage} of {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 transition-colors">Next <ChevronRight size={16} /></button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-20"><Loader2 className="animate-spin text-emerald-500 mx-auto" size={40} /></div>
                    ) : paginatedStudents.length === 0 ? (
                        <div className="text-center py-20 bg-slate-800/30 backdrop-blur-xl rounded-[2rem] border border-white/5"><p className="text-slate-500 font-medium text-lg">No records found for the selected filters.</p></div>
                    ) : (
                        <>
                            {paginatedStudents.map(student => {
                                const latestPayment = student.allPayments[0];
                                return (
                                    <div key={student.studentId} className="bg-slate-800/30 backdrop-blur-md border border-white/5 hover:border-white/10 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row items-start justify-between gap-6 transition-colors shadow-xl group">
                                        <div className="flex items-start gap-4 flex-1 w-full">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 mt-1">
                                                <User size={26} strokeWidth={1.5} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-lg text-white flex items-center flex-wrap gap-3">
                                                    {student.studentName}
                                                    <span className="text-[10px] font-normal text-white/50 bg-black/40 px-2.5 py-1 rounded-md border border-white/5 tracking-widest uppercase">{student.studentNo}</span>
                                                    {student.phone && student.phone !== 'N/A' && <span className="text-[10px] font-normal text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20 tracking-widest uppercase">{student.phone}</span>}
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
                                )
                            })}

                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-6 bg-slate-800/40 backdrop-blur-md p-4 rounded-xl border border-white/5 shadow-inner">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 transition-colors"><ChevronLeft size={16} /> Prev</button>
                                    <span className="text-sm font-medium text-white bg-black/40 px-4 py-1.5 rounded-lg border border-white/5">Page {currentPage} of {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 transition-colors">Next <ChevronRight size={16} /></button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* 🔥 STUDENT ACTION MODAL (REVIEW PAYMENTS) - LOKU RECTANGLE SHAPE 🔥 */}
            {studentActionModal && createPortal(
                <div className="fixed inset-0 z-[9990] bg-slate-900/80 backdrop-blur-xl p-4 md:p-8 flex items-center justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="bg-slate-900/90 border border-white/10 rounded-[2.5rem] w-full max-w-[95vw] min-h-[90vh] max-h-[95vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden backdrop-blur-3xl">

                        <div className="bg-slate-800/50 border-b border-white/5 p-6 md:px-10 rounded-t-[2.5rem] flex justify-between items-center shadow-sm shrink-0">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex justify-center items-center border border-emerald-500/20"><User size={28} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-wide">{studentActionModal.studentName}</h3>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <p className="text-xs text-emerald-400 font-bold tracking-widest uppercase bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 w-max">{studentActionModal.studentNo}</p>
                                        {studentActionModal.phone && studentActionModal.phone !== 'N/A' && <p className="text-xs text-blue-400 font-bold tracking-widest uppercase bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20 w-max">{studentActionModal.phone}</p>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setStudentActionModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-3 rounded-2xl transition-all border border-transparent hover:border-red-500/30"><CloseIcon size={24} strokeWidth={3} /></button>
                        </div>

                        <div className="p-6 md:p-10 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                            <div className="space-y-6 h-full">
                                <h4 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2 mb-6 border-b border-white/10 pb-4"><AlertCircle className="text-emerald-500" size={20} /> Payment to Action</h4>

                                {(() => {
                                    const allStudentPays = studentActionModal.allPayments || [];
                                    let leftSidePayment = allStudentPays.find(p => {
                                        if (activeTab === 'Trash') return p.status === 'Trash';
                                        if (activeTab === 'Approved') return p.status === 'Approved';
                                        return p.status === activeTab && p.status !== 'Trash';
                                    });

                                    if (!leftSidePayment && allStudentPays.length > 0) {
                                        leftSidePayment = allStudentPays[0];
                                    }

                                    if (!leftSidePayment) {
                                        return <div className="bg-white/5 border border-white/5 rounded-3xl p-10 text-center text-slate-400 text-lg font-bold">No payments found.</div>;
                                    }

                                    return renderPaymentCard(leftSidePayment);
                                })()}
                            </div>

                            <div className="bg-slate-900/50 rounded-[2rem] border border-white/5 p-8 h-full shadow-inner flex flex-col backdrop-blur-md">
                                <h4 className="font-black text-white uppercase tracking-widest text-sm flex items-center gap-2 mb-6 border-b border-white/10 pb-4"><Clock className="text-blue-500" size={20} /> Other Payments History</h4>

                                <div className="space-y-4 flex-1 overflow-y-auto pr-2 pb-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    {(() => {
                                        const allStudentPays = studentActionModal.allPayments || [];
                                        let leftSidePayment = allStudentPays.find(p => {
                                            if (activeTab === 'Trash') return p.status === 'Trash';
                                            if (activeTab === 'Approved') return p.status === 'Approved';
                                            return p.status === activeTab && p.status !== 'Trash';
                                        });
                                        if (!leftSidePayment && allStudentPays.length > 0) leftSidePayment = allStudentPays[0];

                                        const rightSidePayments = allStudentPays.filter(p => p.id !== leftSidePayment?.id);

                                        if (rightSidePayments.length === 0) {
                                            return (
                                                <div className="h-full flex items-center justify-center pb-20">
                                                    <p className="text-sm text-slate-500 italic font-medium bg-white/5 px-6 py-3 rounded-xl border border-white/5">No other payments available.</p>
                                                </div>
                                            );
                                        }

                                        return rightSidePayments.map(hist => (
                                            <div key={hist.id} className={`bg-white/5 rounded-[1.5rem] p-5 md:p-6 border hover:bg-white/10 transition-all shadow-md ${hist.status === 'Trash' ? 'border-red-500/30 opacity-60' : 'border-white/5'}`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${['Approved', 'Free Card', 'Discount'].includes(hist.status) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : hist.status === 'Trash' ? 'bg-red-500/20 text-red-400 border-red-500/40' : hist.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{hist.status}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">{hist.date}</span>
                                                </div>
                                                <p className="text-lg font-black text-white leading-tight mb-1">{hist.business}</p>
                                                <p className="text-sm text-slate-400 mb-5 font-medium">{hist.batch}</p>
                                                <div className="flex justify-between items-center text-sm border-t border-white/5 pt-4">
                                                    <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px] bg-white/5 px-3 py-1 rounded-lg">{hist.type}</span>
                                                    <div className="flex items-center gap-4">
                                                        {hist.slips && hist.slips.length > 0 && (
                                                            <button onClick={() => openSlipsInNewTab(hist.slips, studentActionModal.studentName, studentActionModal.studentNo, studentActionModal.phone)} className="text-[11px] font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer bg-blue-500/10 px-4 py-1.5 rounded-xl border border-blue-500/20 flex items-center gap-1.5 transition-colors shadow-sm">
                                                                <FileImage size={14} /> View Slips
                                                            </button>
                                                        )}
                                                        <span className="font-black text-white text-xl">LKR {parseFloat(hist.amount).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 🔥 VERIFY AMOUNT MODAL (OVER/UNDER PAY OPTION) 🔥 */}
            {approveModal && createPortal(
                <div className="fixed inset-0 z-[99999] bg-slate-900/80 flex items-center justify-center p-4 backdrop-blur-xl">
                    <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><CheckCircle2 className="text-emerald-500" /> Verify Payment</h3>
                            <button onClick={() => setApproveModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"><CloseIcon size={20} /></button>
                        </div>

                        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Expected Amount</p>
                            <p className="text-3xl font-black text-white">LKR {parseFloat(approveModal.payment.amount || 0).toLocaleString()}</p>
                        </div>

                        {/* 🔥 Actual Amount Paid Field 🔥 */}
                        <div className="mb-4">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block">Actual Amount Paid (LKR)</label>
                            <input
                                type="number"
                                value={actualAmount}
                                onChange={e => setActualAmount(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-emerald-500 text-lg text-center shadow-inner"
                                placeholder="Enter actual slip amount"
                            />
                            <p className="text-[10px] text-orange-400/80 mt-2 text-center bg-orange-500/10 p-1.5 rounded-lg border border-orange-500/20">
                                ⚠️ If you enter a different amount, the system will automatically adjust the student's Wallet (Due/Excess).
                            </p>
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
                            {actioningPaymentId !== null ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                            Confirm Approve {approveModal.isSelfPicked && '(Self-Picked)'}
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {advancedActionModal && createPortal(
                <div className="fixed inset-0 z-[99999] bg-slate-900/80 flex items-center justify-center p-4 backdrop-blur-xl">
                    <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {advancedActionModal.type === 'Discount' && <><Tag className="text-cyan-400" /> Set Custom Prices</>}
                                {advancedActionModal.type === 'FreeCard' && <><Gift className="text-yellow-400" /> Grant Free Card</>}
                                {advancedActionModal.type === 'PostPay' && <><Unlock className="text-orange-400" /> Grant Post Pay</>}
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
                            {actioningPaymentId !== null ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                            Confirm {advancedActionModal.type === 'Discount' ? 'Custom Approval' : advancedActionModal.type === 'FreeCard' ? 'Free Card' : '7 Days Temp Unlock'}
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* 🔥 INSTITUTE PAYMENT OPTION MODAL 🔥 */}
            {institutePaymentModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 overflow-hidden">
                    <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><CheckCircle2 className="text-indigo-500" /> Institute Payment</h3>
                            <button onClick={() => setInstitutePaymentModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"><CloseIcon size={20} /></button>
                        </div>

                        <p className="text-sm text-slate-300 mb-6 text-center">How should the tutes be handled for this student?</p>

                        <div className="flex flex-col gap-3">
                            <button disabled={actioningPaymentId !== null} onClick={() => handleInstituteApprove(true)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex justify-center items-center gap-2">
                                {actioningPaymentId !== null ? <Loader2 className="animate-spin" size={16} /> : <User size={18} />} Self Picked (No Delivery)
                            </button>

                            <button disabled={actioningPaymentId !== null} onClick={() => handleInstituteApprove(false)} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex justify-center items-center gap-2">
                                {actioningPaymentId !== null ? <Loader2 className="animate-spin" size={16} /> : <Truck size={18} />} Send to Delivery Hub
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 🔥 Installment Verify Modal with Actual Amount 🔥 */}
            {installmentModal && createPortal(
                <div className="fixed inset-0 z-[99999] bg-slate-900/80 flex items-center justify-center p-4 backdrop-blur-xl">
                    <form onSubmit={handleInstallmentApprove} className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 backdrop-blur-3xl">
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2"><CheckCircle2 className="text-emerald-500" /> Verify Installment</h3>
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
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold outline-none focus:border-emerald-500 text-center text-lg shadow-inner"
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
                            <Check size={16} /> Confirm Installment
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

            {/* 🔥 ALUTHIN ADD KALA: EXPORT REPORT MODAL RENDER EKA 🔥 */}
            {showExportModal && (
                <ExportReportModal 
                    onClose={() => setShowExportModal(false)}
                    payments={payments}
                    filters={filters}
                    businesses={businesses}
                    batches={batches}
                    subjects={subjects}
                />
            )}
        </div>
    );
}