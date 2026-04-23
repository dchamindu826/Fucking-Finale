import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Edit3, KeyRound, LogIn, MessageSquare, Loader2, X, CheckCircle, Database, ChevronLeft, ChevronRight, MonitorPlay } from 'lucide-react';
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

    const [ghostIframe, setGhostIframe] = useState(null);
    const [originalAdminSession, setOriginalAdminSession] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/admin/students-data-center');
            setStudents(res.data || []);
            
            if (isAdmin) {
                const bizRes = await axios.get('/admin/businesses');
                setBusinesses(bizRes.data || []);
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
            if (selectedBiz) {
                matchesBiz = (student.enrolledBusinesses || []).includes(selectedBiz.name);
            }
        }

        let matchesBatch = true;
        if (isAdmin && filterBatch !== 'All') {
            matchesBatch = (student.enrolledBatches || []).includes(filterBatch);
        }

        return matchesSearch && matchesBiz && matchesBatch;
    });

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
    const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put('/admin/students/update', editModal);
            toast.success("Student updated successfully");
            setEditModal(null);
            fetchData();
        } catch (error) {
            toast.error("Failed to update student");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post('/admin/students/reset-password', {
                studentId: passwordModal.id,
                newPassword: passwordModal.newPassword
            });
            toast.success("Password reset successfully");
            setPasswordModal(null);
        } catch (error) {
            toast.error("Failed to reset password");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGhostLogin = async (student) => {
        if(!window.confirm(`Are you sure you want to Ghost Login as ${student.firstName}?`)) return;
        
        try {
            toast.loading("Initiating Ghost Login...", { id: "ghost" });
            const res = await axios.post('/admin/ghost-login', { studentId: student.id });
            
            const currentToken = localStorage.getItem('token');
            const currentUser = localStorage.getItem('user');
            setOriginalAdminSession({ token: currentToken, user: currentUser });

            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            setGhostIframe('/student/dashboard');
            toast.success("Ghost Login Active! You are now viewing the student's dashboard.", { id: "ghost" });
        } catch (error) {
            toast.error("Ghost login failed.", { id: "ghost" });
        }
    };

    const closeGhostLogin = () => {
        if (originalAdminSession) {
            localStorage.setItem('token', originalAdminSession.token);
            localStorage.setItem('user', originalAdminSession.user);
        }
        setGhostIframe(null);
        toast.success("Ghost session closed. Restored Admin Session.");
    };

    return (
        <div className="w-full animate-fade-in text-slate-200 pb-10 font-sans relative">
            
            <div className="flex items-center gap-4 mb-8 bg-[#1e2336]/60 p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-xl backdrop-blur-xl">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400 shrink-0">
                    <Database size={28}/>
                </div>
                <div className="flex-1 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide">Student Data Center</h2>
                        <p className="text-slate-400 font-medium text-sm mt-1">Search, manage and overview all student records.</p>
                    </div>
                    <div className="text-right bg-black/40 border border-white/5 px-6 py-3 rounded-2xl hidden md:block">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Students</p>
                        <p className="text-3xl font-black text-white">{filteredStudents.length}</p>
                    </div>
                </div>
            </div>

            <div className="bg-[#1e2336]/60 p-5 rounded-2xl border border-white/5 mb-8 shadow-lg backdrop-blur-xl">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                        <input type="text" placeholder="Search by Name, Phone, NIC or ID (e.g. STU-1)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-white outline-none focus:border-blue-500/50 transition-colors text-sm font-medium" />
                    </div>
                    
                    {isAdmin && (
                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                            <select value={filterBusinessId} onChange={e => {setFilterBusinessId(e.target.value); setFilterBatch('All');}} className="bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-blue-500/50 cursor-pointer min-w-[160px] appearance-none">
                                <option value="All">All Enrolled Businesses</option>
                                {businesses.map(biz => <option key={biz.id} value={biz.id}>{biz.name}</option>)}
                            </select>
                            <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} className="bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-blue-500/50 cursor-pointer min-w-[160px] appearance-none">
                                <option value="All">All Enrolled Batches</option>
                                {availableBatches.map(batchName => <option key={batchName} value={batchName}>{batchName}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin text-blue-500 mx-auto" size={40}/></div>
                ) : paginatedStudents.length === 0 ? (
                    <div className="text-center py-20 bg-[#1e2336]/40 rounded-[2rem] border border-white/5"><p className="text-slate-500 font-bold text-lg">No students found.</p></div>
                ) : (
                    paginatedStudents.map(student => (
                        <div key={student.id} className="bg-[#1e2336]/80 border border-white/5 hover:border-white/10 p-5 md:p-6 rounded-2xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 transition-all shadow-lg">
                            
                            <div className="flex items-start gap-5 flex-1 min-w-0 w-full">
                                <img 
                                    src={student.image && student.image !== 'default.png' ? `http://72.62.249.211:5000/images/${student.image}` : '/logo.png'} 
                                    alt="Profile" 
                                    className="w-16 h-16 rounded-2xl object-cover bg-black/50 border border-white/10 shrink-0 mt-1"
                                    onError={(e) => e.target.src = '/logo.png'}
                                />
                                <div className="min-w-0 pr-4 flex-1">
                                    <h4 className="font-bold text-lg text-white flex items-center gap-3 truncate">
                                        {student.firstName} {student.lastName}
                                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 tracking-widest uppercase shrink-0">STU-{student.id}</span>
                                    </h4>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm font-medium text-slate-400">
                                        <span className="flex items-center gap-1.5"><strong className="text-white">Phone:</strong> {student.phone || 'N/A'}</span>
                                        <span className="flex items-center gap-1.5 truncate"><strong className="text-white">City:</strong> {student.city || 'N/A'}</span>
                                    </div>
                                    
                                    {/* 🔥 FIX: Bigger, clearer fonts for Enrollments 🔥 */}
                                    <div className="mt-4 bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col gap-3 w-full">
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mr-2">Enrolled Businesses:</span>
                                            {(student.enrolledBusinesses || []).length > 0 ? (student.enrolledBusinesses || []).map((biz, i) => (
                                                <span key={i} className="text-xs font-bold bg-blue-500/20 text-blue-300 px-3 py-1 rounded border border-blue-500/30">{biz}</span>
                                            )) : <span className="text-xs text-red-400/80 font-bold bg-red-500/10 px-3 py-1 rounded border border-red-500/20">No Enrollments Found</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mr-2">Enrolled Batches:</span>
                                            {(student.enrolledBatches || []).length > 0 ? (student.enrolledBatches || []).map((batch, i) => (
                                                <span key={i} className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded border border-emerald-500/30">{batch}</span>
                                            )) : <span className="text-xs text-red-400/80 font-bold bg-red-500/10 px-3 py-1 rounded border border-red-500/20">No Enrollments Found</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-end gap-3 w-full xl:w-auto pt-4 xl:pt-0 border-t border-white/5 xl:border-t-0 shrink-0">
                                <button className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-colors border border-indigo-500/20" title="Open CRM Chat">
                                    <MessageSquare size={18} />
                                </button>
                                
                                <button onClick={() => setEditModal(student)} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-4 rounded-xl transition-colors text-xs border border-white/10">
                                    <Edit3 size={16}/> Edit Profile
                                </button>

                                <button onClick={() => setPasswordModal({ id: student.id, newPassword: '' })} className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white font-bold py-3 px-4 rounded-xl transition-colors text-xs border border-orange-500/20">
                                    <KeyRound size={16}/> Reset Pass
                                </button>

                                <button onClick={() => handleGhostLogin(student)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-5 rounded-xl transition-colors text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                    <LogIn size={16}/> Ghost Login
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 bg-[#1e2336]/40 p-4 rounded-xl border border-white/5">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16}/> Prev</button>
                    <span className="text-sm font-bold text-white bg-black/40 px-4 py-1.5 rounded-lg border border-white/5">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next <ChevronRight size={16}/></button>
                </div>
            )}

            {editModal && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-[#15192b] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 relative max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4 shrink-0">
                            <h3 className="text-xl font-black text-white">Edit Student Details</h3>
                            <button onClick={() => setEditModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">First Name</label>
                                    <input type="text" value={editModal.firstName || ''} onChange={e => setEditModal({...editModal, firstName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" required />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">Last Name</label>
                                    <input type="text" value={editModal.lastName || ''} onChange={e => setEditModal({...editModal, lastName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" required />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">Primary Phone</label>
                                    <input type="text" value={editModal.phone || ''} onChange={e => setEditModal({...editModal, phone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" required />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">WhatsApp</label>
                                    <input type="text" value={editModal.whatsapp || ''} onChange={e => setEditModal({...editModal, whatsapp: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">Optional Phone</label>
                                    <input type="text" value={editModal.optionalPhone || ''} onChange={e => setEditModal({...editModal, optionalPhone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">NIC Number</label>
                                <input type="text" value={editModal.nic || ''} onChange={e => setEditModal({...editModal, nic: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">House No / Name</label>
                                    <input type="text" value={editModal.addressHouseNo || ''} onChange={e => setEditModal({...editModal, addressHouseNo: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">Street</label>
                                    <input type="text" value={editModal.addressStreet || ''} onChange={e => setEditModal({...editModal, addressStreet: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">City</label>
                                    <input type="text" value={editModal.city || ''} onChange={e => setEditModal({...editModal, city: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 block">District</label>
                                    <input type="text" value={editModal.district || ''} onChange={e => setEditModal({...editModal, district: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            
                            <div className="pt-4 shrink-0">
                                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <CheckCircle size={16}/>} Save All Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {passwordModal && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-[#15192b] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <h3 className="text-xl font-black text-white">Reset Password</h3>
                            <button onClick={() => setPasswordModal(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handlePasswordReset}>
                            <div className="mb-6">
                                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block">New Password</label>
                                <input type="text" placeholder="Type new password..." value={passwordModal.newPassword} onChange={e => setPasswordModal({...passwordModal, newPassword: e.target.value})} className="w-full bg-black/40 border border-orange-500/30 rounded-xl px-4 py-3.5 text-sm text-white font-bold outline-none focus:border-orange-500" required minLength="6" />
                            </div>

                            <button type="submit" disabled={isSubmitting} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-xl transition-all text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20">
                                {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <KeyRound size={16}/>} Reset Now
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {ghostIframe && createPortal(
                <div className="fixed inset-0 z-[99999] bg-black/95 flex flex-col backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full bg-[#15192b] border-b border-white/10 px-6 py-4 flex justify-between items-center shadow-xl z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <MonitorPlay className="text-emerald-500" size={24} />
                            <div>
                                <h3 className="text-white font-bold text-lg">Ghost Login Active</h3>
                                <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">You are viewing the student's dashboard</p>
                            </div>
                        </div>
                        <button onClick={closeGhostLogin} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 px-5 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-widest shadow-lg">
                            <X size={16} /> End Session & Close
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