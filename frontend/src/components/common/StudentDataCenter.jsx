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
            toast.success("Ghost Login Active!", { id: "ghost" });
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
        <div className="w-full text-slate-200 animate-in fade-in duration-300 font-sans pb-10">
            
            {/* Header Section */}
            <div className="mb-6 bg-[#1e293b] border border-slate-700 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20 shrink-0">
                        <Database size={24}/>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Student Data Center</h2>
                        <p className="text-slate-400 font-medium text-sm mt-0.5">Search, manage and overview all student records</p>
                    </div>
                </div>
                <div className="bg-[#0f172a] border border-slate-700 px-5 py-2.5 rounded-xl flex items-center gap-4">
                    <span className="text-sm font-semibold text-slate-400">Total Students</span>
                    <span className="text-xl font-bold text-white">{filteredStudents.length}</span>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="mb-6 bg-[#1e293b] p-5 rounded-2xl border border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                    <input 
                        type="text" 
                        placeholder="Search by Name, Phone, NIC or ID (e.g. STU-1)..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="w-full bg-[#0f172a] border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-blue-500 transition-colors text-sm" 
                    />
                </div>
                
                {isAdmin && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <select 
                            value={filterBusinessId} 
                            onChange={e => {setFilterBusinessId(e.target.value); setFilterBatch('All');}} 
                            className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-blue-500 cursor-pointer min-w-[180px] appearance-none"
                        >
                            <option value="All">All Businesses</option>
                            {businesses.map(biz => <option key={biz.id} value={biz.id}>{biz.name}</option>)}
                        </select>
                        <select 
                            value={filterBatch} 
                            onChange={e => setFilterBatch(e.target.value)} 
                            className="bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-blue-500 cursor-pointer min-w-[180px] appearance-none"
                        >
                            <option value="All">All Batches</option>
                            {availableBatches.map(batchName => <option key={batchName} value={batchName}>{batchName}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Student List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20"><Loader2 className="animate-spin text-blue-500 mx-auto" size={32}/></div>
                ) : paginatedStudents.length === 0 ? (
                    <div className="text-center py-20 bg-[#1e293b] rounded-2xl border border-slate-700">
                        <p className="text-slate-400 font-medium text-lg">No students found.</p>
                    </div>
                ) : (
                    paginatedStudents.map(student => (
                        <div key={student.id} className="bg-[#1e293b] border border-slate-700 hover:border-slate-500 p-5 rounded-2xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 transition-colors shadow-sm">
                            
                            <div className="flex items-start gap-5 flex-1 min-w-0 w-full">
                                <img 
                                    src={student.image && student.image !== 'default.png' ? `http://72.62.249.211:5000/images/${student.image}` : '/logo.png'} 
                                    alt="Profile" 
                                    className="w-14 h-14 rounded-xl object-cover bg-black/50 border border-slate-600 shrink-0 mt-1"
                                    onError={(e) => e.target.src = '/logo.png'}
                                />
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-lg text-white flex items-center gap-3 truncate">
                                        {student.firstName} {student.lastName}
                                        <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 shrink-0">STU-{student.id}</span>
                                    </h4>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1 text-sm text-slate-400">
                                        <span className="flex items-center gap-1.5"><span className="text-slate-500">Phone:</span> {student.phone || 'N/A'}</span>
                                        <span className="flex items-center gap-1.5"><span className="text-slate-500">NIC:</span> {student.nic || 'N/A'}</span>
                                        <span className="flex items-center gap-1.5 truncate"><span className="text-slate-500">City:</span> {student.city || 'N/A'}</span>
                                    </div>
                                    
                                    <div className="mt-4 flex flex-col sm:flex-row gap-4 w-full">
                                        {(student.enrolledBusinesses || []).length > 0 && (
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <span className="text-xs font-semibold text-slate-500 mr-1">Businesses:</span>
                                                {(student.enrolledBusinesses || []).map((biz, i) => (
                                                    <span key={i} className="text-[11px] font-bold bg-[#0f172a] text-blue-300 px-2.5 py-1 rounded border border-slate-700">{biz}</span>
                                                ))}
                                            </div>
                                        )}
                                        {(student.enrolledBatches || []).length > 0 && (
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <span className="text-xs font-semibold text-slate-500 mr-1">Batches:</span>
                                                {(student.enrolledBatches || []).map((batch, i) => (
                                                    <span key={i} className="text-[11px] font-bold bg-[#0f172a] text-emerald-400 px-2.5 py-1 rounded border border-slate-700">{batch}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-end gap-2 w-full xl:w-auto pt-4 xl:pt-0 border-t border-slate-700 xl:border-t-0 shrink-0">
                                <button className="p-2.5 rounded-lg bg-[#0f172a] text-indigo-400 hover:bg-indigo-500 hover:text-white border border-slate-700 transition-colors" title="Open CRM Chat">
                                    <MessageSquare size={18} />
                                </button>
                                
                                <button onClick={() => setEditModal(student)} className="flex items-center gap-2 bg-[#0f172a] hover:bg-slate-700 text-slate-300 hover:text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm border border-slate-700">
                                    <Edit3 size={16}/> Edit
                                </button>

                                <button onClick={() => setPasswordModal({ id: student.id, newPassword: '' })} className="flex items-center gap-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm border border-orange-500/20">
                                    <KeyRound size={16}/> Reset Pass
                                </button>

                                <button onClick={() => handleGhostLogin(student)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm">
                                    <LogIn size={16}/> Ghost Login
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 bg-[#1e293b] p-3.5 rounded-xl border border-slate-700 shadow-sm">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16}/> Prev</button>
                    <span className="text-sm font-medium text-slate-300">Page <span className="text-white font-bold">{currentPage}</span> of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next <ChevronRight size={16}/></button>
                </div>
            )}

            {/* Edit Modal */}
            {editModal && createPortal(
                <div className="fixed inset-0 z-[100] bg-slate-900/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 shrink-0">
                            <h3 className="text-xl font-bold text-white">Edit Student Details</h3>
                            <button onClick={() => setEditModal(null)} className="text-slate-400 hover:text-white bg-[#0f172a] p-2 rounded-lg transition-colors border border-slate-700"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold mb-1 block">First Name</label>
                                    <input type="text" value={editModal.firstName || ''} onChange={e => setEditModal({...editModal, firstName: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" required />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Last Name</label>
                                    <input type="text" value={editModal.lastName || ''} onChange={e => setEditModal({...editModal, lastName: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" required />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Primary Phone</label>
                                    <input type="text" value={editModal.phone || ''} onChange={e => setEditModal({...editModal, phone: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" required />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold mb-1 block">WhatsApp</label>
                                    <input type="text" value={editModal.whatsapp || ''} onChange={e => setEditModal({...editModal, whatsapp: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Optional Phone</label>
                                    <input type="text" value={editModal.optionalPhone || ''} onChange={e => setEditModal({...editModal, optionalPhone: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 font-semibold mb-1 block">NIC Number</label>
                                <input type="text" value={editModal.nic || ''} onChange={e => setEditModal({...editModal, nic: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold mb-1 block">House No / Name</label>
                                    <input type="text" value={editModal.addressHouseNo || ''} onChange={e => setEditModal({...editModal, addressHouseNo: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold mb-1 block">Street</label>
                                    <input type="text" value={editModal.addressStreet || ''} onChange={e => setEditModal({...editModal, addressStreet: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold mb-1 block">City</label>
                                    <input type="text" value={editModal.city || ''} onChange={e => setEditModal({...editModal, city: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold mb-1 block">District</label>
                                    <input type="text" value={editModal.district || ''} onChange={e => setEditModal({...editModal, district: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            
                            <div className="pt-4 shrink-0 border-t border-slate-700 mt-2">
                                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2">
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
                <div className="fixed inset-0 z-[100] bg-slate-900/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 md:p-8 w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-white">Reset Password</h3>
                            <button onClick={() => setPasswordModal(null)} className="text-slate-400 hover:text-white bg-[#0f172a] p-2 rounded-lg transition-colors border border-slate-700"><X size={18} /></button>
                        </div>

                        <form onSubmit={handlePasswordReset}>
                            <div className="mb-5">
                                <label className="text-xs text-slate-400 font-semibold mb-2 block">New Password</label>
                                <input type="text" placeholder="Type new password..." value={passwordModal.newPassword} onChange={e => setPasswordModal({...passwordModal, newPassword: e.target.value})} className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-orange-500" required minLength="6" />
                            </div>

                            <button type="submit" disabled={isSubmitting} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2">
                                {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <KeyRound size={16}/>} Reset Password
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Ghost Login Iframe */}
            {ghostIframe && createPortal(
                <div className="fixed inset-0 z-[99999] bg-[#0f172a] flex flex-col animate-in fade-in duration-300">
                    <div className="w-full bg-[#1e293b] border-b border-slate-700 px-6 py-3 flex justify-between items-center shadow-md shrink-0">
                        <div className="flex items-center gap-3">
                            <MonitorPlay className="text-emerald-500" size={20} />
                            <div>
                                <h3 className="text-white font-bold text-sm">Ghost Login Active</h3>
                                <p className="text-emerald-400 text-xs font-medium">Viewing as Student</p>
                            </div>
                        </div>
                        <button onClick={closeGhostLogin} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 px-4 py-2 rounded-lg font-medium transition-colors text-sm">
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