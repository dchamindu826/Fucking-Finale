import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Edit3, KeyRound, LogIn, MessageSquare, Loader2, X, CheckCircle, Database, ChevronLeft, ChevronRight, MonitorPlay, Palette, Trash2 } from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

export default function StudentDataCenter({ loggedInUser }) {
    const isAdmin = loggedInUser?.role?.toUpperCase() === 'SYSTEM_ADMIN' || loggedInUser?.role?.toUpperCase() === 'DIRECTOR';
    
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [availableBatches, setAvailableBatches] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterBusinessId, setFilterBusinessId] = useState('All');
    const [filterBatch, setFilterBatch] = useState('All');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [editModal, setEditModal] = useState(null);
    const [passwordModal, setPasswordModal] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastResetPassword, setLastResetPassword] = useState(null); 

    const [ghostIframe, setGhostIframe] = useState(null);
    const [originalAdminSession, setOriginalAdminSession] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/admin/students-data-center');
            setStudents(res.data || []);
            if (isAdmin) {
                const bizRes = await axios.get('/admin/businesses');
                setBusinesses(bizRes.data?.businesses || bizRes.data || []);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load students data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [isAdmin]);

    useEffect(() => {
        if (filterBusinessId === 'All') {
            const uniqueBatches = new Set();
            students.forEach(s => {
                (s.enrolledBatches || []).forEach(b => uniqueBatches.add(b));
            });
            setAvailableBatches([...uniqueBatches]);
        } else {
            axios.get(`/admin/batches/${filterBusinessId}`)
                .then(res => {
                    const bData = res.data.batches || res.data || [];
                    setAvailableBatches(bData.map(b => b.name));
                }).catch(err => console.error(err));
        }
    }, [filterBusinessId, students]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery, filterBusinessId, filterBatch]);

    const filteredStudents = students.filter(student => {
        const matchesSearch = 
            (student.firstName + ' ' + student.lastName).toLowerCase().includes(searchQuery.toLowerCase()) || 
            (student.phone && student.phone.includes(searchQuery)) ||
            (student.nic && student.nic.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (student.id && `STU-${student.id}`.includes(searchQuery.toUpperCase()));

        let matchesBiz = true;
        if (isAdmin && filterBusinessId !== 'All') {
            const selectedBiz = businesses.find(b => b.id.toString() === filterBusinessId);
            if (selectedBiz) matchesBiz = (student.enrolledBusinesses || []).includes(selectedBiz.name);
        }

        let matchesBatch = true;
        if (isAdmin && filterBatch !== 'All') matchesBatch = (student.enrolledBatches || []).includes(filterBatch);

        return matchesSearch && matchesBiz && matchesBatch;
    });

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
    const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // 🔥 Edit Details & Phone Numbers 🔥
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put('/admin/students/update', editModal);
            toast.success("Student details updated successfully");
            setEditModal(null);
            fetchData();
        } catch (error) { toast.error("Failed to update student"); } finally { setIsSubmitting(false); }
    };

    // 🔥 Reset Password 🔥
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post('/admin/students/reset-password', {
                studentId: passwordModal.id,
                newPassword: passwordModal.newPassword
            });
            toast.success("Password reset successfully");
            setLastResetPassword(passwordModal.newPassword);
        } catch (error) { toast.error("Failed to reset password"); } finally { setIsSubmitting(false); }
    };

    // 🔥 Copy to Clipboard 🔥
    const copyToClipboard = () => {
        navigator.clipboard.writeText(lastResetPassword);
        toast.success("Password Copied!");
        setTimeout(() => { setPasswordModal(null); setLastResetPassword(null); }, 1000); 
    };

    // 🔥 Edit Details & Phone Numbers 🔥 (මේක උඩින් තියෙනවා)

// 🔥 Delete Student Account (With Debug) 🔥
const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to permanently DELETE the account of ${studentName}? This action cannot be undone and will remove all their access.`)) return;
    
    const loadToast = toast.loading("Deleting student account...");
    console.log("🚀 [FRONTEND] Sending Delete Request for Student ID:", studentId);
    
    try {
        // අනිවාර්යයෙන්ම URL එක '/admin/admin-delete' විය යුතුයි
        const res = await axios.post('/admin/admin-delete', { studentId }); 
        
        console.log("✅ [FRONTEND] Delete Response Success:", res.data);
        toast.success("Student deleted successfully", { id: loadToast });
        fetchData(); 
    } catch (error) {
        console.error("❌ [FRONTEND] Delete failed Details:", error.response || error);
        toast.error(error.response?.data?.error || "Failed to delete student.", { id: loadToast });
    }
};
    const handleGhostLogin = async (student) => {
        if(!window.confirm(`Ghost Login as ${student.firstName}?`)) return;
        try {
            toast.loading("Initiating Ghost Login...", { id: "ghost" });
            const res = await axios.post('/admin/ghost-login', { studentId: student.id });
            const currentToken = localStorage.getItem('token');
            const currentUser = localStorage.getItem('user');
            setOriginalAdminSession({ token: currentToken, user: currentUser });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setGhostIframe('/student/dashboard');
            toast.success("Ghost Login Active!", { id: "ghost" });
        } catch (error) { toast.error("Ghost login failed.", { id: "ghost" }); }
    };

    const closeGhostLogin = () => {
        if (originalAdminSession) {
            localStorage.setItem('token', originalAdminSession.token);
            localStorage.setItem('user', originalAdminSession.user);
        }
        setGhostIframe(null);
        toast.success("Restored Admin Session.");
    };

    return (
        <div className="w-full text-gray-100 animate-in fade-in duration-300 font-sans pb-10">
            
            {/* Header Section */}
            <div className="mb-6 bg-black/20 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-xl text-white border border-white/10 shrink-0 shadow-inner">
                        <Database size={24}/>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Student Data Center</h2>
                        <p className="text-gray-300 font-medium text-sm mt-0.5">Manage and overview all student records</p>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl flex items-center gap-4 shadow-inner">
                    <span className="text-sm font-semibold text-gray-400">Total Students</span>
                    <span className="text-xl font-bold text-white">{filteredStudents.length}</span>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="mb-6 bg-black/20 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input 
                        type="text" 
                        placeholder="Search Name, Phone, NIC or STU-ID..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-white/30 transition-all text-sm placeholder-gray-500 shadow-inner" 
                    />
                </div>
                
                {isAdmin && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <select 
                            value={filterBusinessId} 
                            onChange={e => {setFilterBusinessId(e.target.value); setFilterBatch('All');}} 
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-white/30 cursor-pointer min-w-[180px] transition-all shadow-md appearance-none"
                        >
                            <option value="All" className="bg-[#1e1e1e]">All Businesses</option>
                            {businesses.map(biz => <option key={biz.id} value={biz.id} className="bg-[#1e1e1e]">{biz.name}</option>)}
                        </select>
                        <select 
                            value={filterBatch} 
                            onChange={e => setFilterBatch(e.target.value)} 
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-white/30 cursor-pointer min-w-[180px] transition-all shadow-md appearance-none"
                        >
                            <option value="All" className="bg-[#1e1e1e]">All Batches</option>
                            {availableBatches.map(batchName => <option key={batchName} value={batchName} className="bg-[#1e1e1e]">{batchName}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Student List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin text-white mx-auto" size={32}/></div>
                ) : paginatedStudents.length === 0 ? (
                    <div className="text-center py-20 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg">
                        <p className="text-gray-400 font-medium text-lg transition-colors">No students found.</p>
                    </div>
                ) : (
                    paginatedStudents.map(student => (
                        <div key={student.id} className="bg-black/20 backdrop-blur-xl border border-white/10 hover:border-white/30 p-5 rounded-2xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 transition-all shadow-md hover:shadow-xl hover:bg-black/30 group">
                            
                            <div className="flex items-start gap-5 flex-1 min-w-0 w-full">
                                <img 
                                    src={student.image && student.image !== 'default.png' ? `http://72.62.249.211:5000/images/${student.image}` : '/logo.png'} 
                                    alt="Profile" 
                                    className="w-14 h-14 rounded-xl object-cover bg-black/50 border border-white/10 shrink-0 mt-1 transition-all group-hover:scale-105"
                                    onError={(e) => e.target.src = '/logo.png'}
                                />
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-lg text-white flex items-center gap-3 truncate">
                                        {student.firstName} {student.lastName}
                                        <span className="text-[10px] font-black bg-white/10 text-white px-2 py-0.5 rounded border border-white/20 uppercase tracking-tighter">STU-{student.id}</span>
                                    </h4>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1 text-sm text-gray-300">
                                        <span className="flex items-center gap-1.5"><span className="text-gray-500 font-bold uppercase text-[10px]">Phone:</span> {student.phone || 'N/A'}</span>
                                        <span className="flex items-center gap-1.5"><span className="text-gray-500 font-bold uppercase text-[10px]">NIC:</span> {student.nic || 'N/A'}</span>
                                        <span className="flex items-center gap-1.5 truncate"><span className="text-gray-500 font-bold uppercase text-[10px]">City:</span> {student.city || 'N/A'}</span>
                                    </div>
                                    
                                    <div className="mt-4 flex flex-col sm:flex-row gap-4 w-full">
                                        {(student.enrolledBusinesses || []).length > 0 && (
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mr-1">Businesses:</span>
                                                {(student.enrolledBusinesses || []).map((biz, i) => (
                                                    <span key={i} className="text-[10px] font-black bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">{biz}</span>
                                                ))}
                                            </div>
                                        )}
                                        {(student.enrolledBatches || []).length > 0 && (
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mr-1">Batches:</span>
                                                {(student.enrolledBatches || []).map((batch, i) => (
                                                    <span key={i} className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">{batch}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-end gap-2 w-full xl:w-auto pt-4 xl:pt-0 border-t border-white/5 xl:border-t-0 shrink-0">
                                <button className="p-2.5 rounded-xl bg-white/5 text-white hover:bg-white/20 border border-white/10 transition-all shadow-sm outline-none" title="CRM Chat">
                                    <MessageSquare size={18} />
                                </button>
                                
                                <button onClick={() => setEditModal(student)} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs border border-white/10 shadow-sm outline-none">
                                    <Edit3 size={16}/> EDIT
                                </button>

                                <button onClick={() => setPasswordModal({ id: student.id, newPassword: '' })} className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs border border-orange-500/20 shadow-sm outline-none">
                                    <KeyRound size={16}/> RESET PASS
                                </button>

                                <button onClick={() => handleGhostLogin(student)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-lg outline-none border border-emerald-400/50">
                                    <LogIn size={16}/> GHOST
                                </button>

                                {/* 🔥 DELETE BUTTON ADDED HERE 🔥 */}
                                {isAdmin && (
                                    <button onClick={() => handleDeleteStudent(student.id, student.firstName)} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs border border-red-500/20 shadow-sm outline-none">
                                        <Trash2 size={16}/> DELETE
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 bg-black/20 backdrop-blur-xl p-3.5 rounded-xl border border-white/10 shadow-lg">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-white disabled:opacity-20 transition-all px-3 py-1"><ChevronLeft size={16}/> PREV</button>
                    <span className="text-sm font-medium text-gray-300">Page <span className="text-white font-black">{currentPage}</span> of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-white disabled:opacity-20 transition-all px-3 py-1">NEXT <ChevronRight size={16}/></button>
                </div>
            )}

            {/* Edit Modal (Number Changing works here) */}
            {editModal && createPortal(
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#1e1e1e]/90 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4 shrink-0">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Edit Student Details</h3>
                            <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-xl transition-all border border-white/10 outline-none"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">First Name</label>
                                    <input type="text" value={editModal.firstName || ''} onChange={e => setEditModal({...editModal, firstName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 shadow-inner" required />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Last Name</label>
                                    <input type="text" value={editModal.lastName || ''} onChange={e => setEditModal({...editModal, lastName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 shadow-inner" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Primary Phone</label>
                                    <input type="text" value={editModal.phone || ''} onChange={e => setEditModal({...editModal, phone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 shadow-inner" required />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">WhatsApp</label>
                                    <input type="text" value={editModal.whatsapp || ''} onChange={e => setEditModal({...editModal, whatsapp: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 shadow-inner" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Optional Phone</label>
                                    <input type="text" value={editModal.optionalPhone || ''} onChange={e => setEditModal({...editModal, optionalPhone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 shadow-inner" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">NIC Number</label>
                                <input type="text" value={editModal.nic || ''} onChange={e => setEditModal({...editModal, nic: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 shadow-inner" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">House No / Name</label>
                                    <input type="text" value={editModal.addressHouseNo || ''} onChange={e => setEditModal({...editModal, addressHouseNo: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 shadow-inner" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">Street</label>
                                    <input type="text" value={editModal.addressStreet || ''} onChange={e => setEditModal({...editModal, addressStreet: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 shadow-inner" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">City</label>
                                    <input type="text" value={editModal.city || ''} onChange={e => setEditModal({...editModal, city: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 shadow-inner" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase mb-1 block">District</label>
                                    <input type="text" value={editModal.district || ''} onChange={e => setEditModal({...editModal, district: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 shadow-inner" />
                                </div>
                            </div>
                            <div className="pt-4 shrink-0 border-t border-white/10 mt-2">
                                <button type="submit" disabled={isSubmitting} className="w-full bg-white text-black font-black py-3 rounded-xl transition-all hover:scale-[1.01] flex justify-center items-center gap-2 shadow-xl uppercase text-xs outline-none">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16}/>} Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Password Modal */}
            {passwordModal && createPortal(
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#1e1e1e]/90 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Reset Password</h3>
                            <button onClick={() => { setPasswordModal(null); setLastResetPassword(null); }} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-xl transition-all border border-white/10 outline-none"><X size={18} /></button>
                        </div>
                        {lastResetPassword ? (
                            <div className="animate-in zoom-in duration-300">
                                <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl text-center mb-5 shadow-inner">
                                    <CheckCircle className="text-emerald-400 mx-auto mb-2" size={36} />
                                    <p className="text-emerald-400 font-black text-xs uppercase mb-1">Password Changed!</p>
                                    <p className="text-white text-xl font-mono tracking-widest bg-black/40 py-3 rounded-xl border border-white/5 mt-3 shadow-inner select-all">{lastResetPassword}</p>
                                </div>
                                <button onClick={copyToClipboard} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg uppercase text-xs outline-none">
                                    Copy Password & Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handlePasswordReset}>
                                <div className="mb-6">
                                    <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block">New Password</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter new password..." 
                                        value={passwordModal.newPassword} 
                                        onChange={e => setPasswordModal({...passwordModal, newPassword: e.target.value})} 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500 font-mono tracking-wide shadow-inner" 
                                        required 
                                        minLength="6" 
                                    />
                                    <p className="text-[10px] text-gray-500 mt-2 font-medium">Please copy password before closing.</p>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg uppercase text-xs outline-none">
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <KeyRound size={18}/>} Reset Password
                                </button>
                            </form>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Ghost Login Iframe */}
            {ghostIframe && createPortal(
                <div className="fixed inset-0 z-[99999] bg-[#0f172a] flex flex-col animate-in fade-in duration-300">
                    <div className="w-full bg-black/40 backdrop-blur-2xl border-b border-white/10 px-6 py-3 flex justify-between items-center shadow-lg shrink-0">
                        <div className="flex items-center gap-3">
                            <MonitorPlay className="text-emerald-500 animate-pulse" size={20} />
                            <div>
                                <h3 className="text-white font-black text-sm uppercase tracking-tight">Ghost Login Active</h3>
                                <p className="text-emerald-400 text-[10px] font-black uppercase">Viewing as Student</p>
                            </div>
                        </div>
                        <button onClick={closeGhostLogin} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white border border-red-400/50 px-4 py-2 rounded-xl font-black transition-all text-xs shadow-lg uppercase outline-none">
                            <X size={16} /> End Session
                        </button>
                    </div>
                    <div className="flex-1 w-full relative bg-black/50">
                        <iframe src={ghostIframe} className="w-full h-full border-none" title="Ghost Login Student View"></iframe>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}