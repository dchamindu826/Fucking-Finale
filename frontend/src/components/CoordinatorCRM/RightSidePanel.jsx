import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { User, MapPin, BookOpen, CreditCard, Key, AlertTriangle, Loader2, Save, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RightSidePanel({ activeContact }) {
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState(null);

    // Password Reset States
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        if (activeContact) {
            fetchLeadDetails();
            setShowPasswordReset(false);
            setNewPassword('');
        }
    }, [activeContact]);

    const fetchLeadDetails = async () => {
        const phone = activeContact.phone || activeContact.number || activeContact.phoneNumber;
        if (!phone) return;

        setLoading(true);
        try {
            const res = await axios.get(`/coordinator-crm/lead-details/${phone}`);
            setDetails(res.data);
        } catch (error) {
            console.error("Failed to fetch lead details");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 4) return toast.error("Password too short!");

        setSavingPassword(true);
        try {
            await axios.post('/coordinator-crm/reset-password', {
                studentId: details.student.id,
                newPassword: newPassword
            });
            toast.success("Password updated successfully!");
            setShowPasswordReset(false);
            setNewPassword('');
        } catch (error) {
            toast.error("Failed to reset password.");
        } finally {
            setSavingPassword(false);
        }
    };

    // 🔥 NEW: Ghost Login Logic 🔥
    const handleGhostLogin = () => {
        if (!details || !details.student) return;
        if (!window.confirm(`Are you sure you want to login as ${details.student.firstName}?`)) return;

        // 1. දැනට ඉන්න Staff එකේ කෙනාගේ token එක backup එකක් විදිහට තියාගන්නවා (ආයේ එන්න ඕනේ නම්)
        const currentStaffUser = localStorage.getItem('user');
        if (currentStaffUser) localStorage.setItem('staff_backup_user', currentStaffUser);

        // 2. ළමයාගේ විස්තර Local Storage එකට දානවා (ළමයා විදිහට ලොග් වෙන්න)
        localStorage.setItem('user', JSON.stringify(details.student));
        
        toast.success(`Logged in as ${details.student.firstName}`);
        
        // 3. කෙලින්ම Student Dashboard එකට යවනවා
        setTimeout(() => {
            window.location.href = '/student/dashboard';
        }, 1000);
    };

    if (!activeContact) {
        return <div className="w-80 bg-slate-900/50 border-l border-white/10 hidden xl:flex flex-col justify-center items-center text-slate-500 font-bold p-6 text-center">Select a chat to view details</div>;
    }

    return (
        <div className="w-80 bg-[#0a101f] border-l border-white/10 flex flex-col h-full overflow-hidden shadow-2xl relative z-20">
            
            <div className="p-5 border-b border-white/10 bg-slate-900/50 flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl"><User size={20}/></div>
                <div>
                    <h2 className="text-lg font-black text-white">Student Info</h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Database Records</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" size={30}/></div>
                ) : !details?.isEnrolled ? (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-5 rounded-2xl text-center">
                        <AlertTriangle className="text-orange-400 mx-auto mb-3" size={30}/>
                        <p className="text-orange-400 font-bold text-sm">Not Enrolled</p>
                        <p className="text-xs text-orange-400/60 mt-2">This number is not registered as a student in the system. It is only a CRM Lead.</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        
                        {/* Profile Info */}
                        <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5 space-y-3">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Full Name</p>
                                <p className="text-sm font-bold text-white">{details.student.firstName} {details.student.lastName}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Student ID</p>
                                    <p className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">STU-{details.student.id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">District</p>
                                    <p className="text-xs font-bold text-white flex items-center justify-end gap-1"><MapPin size={12} className="text-slate-400"/> {details.student.district || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* 🔥 GHOST LOGIN BUTTON 🔥 */}
                        <button onClick={handleGhostLogin} className="w-full bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 text-xs uppercase tracking-widest">
                            <LogIn size={16}/> Login as Student
                        </button>

                        {/* Enrolled Courses */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2"><BookOpen size={14} className="text-emerald-400"/> Enrolled Subjects</h4>
                            {details.enrolledCourses.length === 0 ? (
                                <p className="text-xs text-slate-500 font-medium">No subjects found.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {details.enrolledCourses.map(c => (
                                        <span key={c.id} className="text-[10px] font-bold bg-white/5 border border-white/10 text-slate-300 px-2.5 py-1 rounded-lg">{c.name}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Payment History Summary */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-white/10 pb-2"><CreditCard size={14} className="text-blue-400"/> Recent Payments</h4>
                            {details.student.payments.length === 0 ? (
                                <p className="text-xs text-slate-500 font-medium">No payment records.</p>
                            ) : (
                                <div className="space-y-2">
                                    {details.student.payments.slice(0, 3).map((p, idx) => (
                                        <div key={idx} className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-bold text-white">{p.business?.name || 'Course'}</p>
                                                <p className="text-[9px] text-slate-400">{p.payment_type === 1 ? 'Monthly' : p.payment_type === 2 ? `Installment (Ph ${p.installment_no})` : 'Full'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] font-black text-white">LKR {p.amount}</p>
                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${p.status === 1 ? 'bg-emerald-500/20 text-emerald-400' : p.status === 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {p.status === 1 ? 'Approved' : p.status === 0 ? 'Pending' : 'Other'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Password Reset Section */}
                        <div className="pt-4 border-t border-white/10">
                            {!showPasswordReset ? (
                                <button onClick={() => setShowPasswordReset(true)} className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/5">
                                    <Key size={14}/> Reset Student Password
                                </button>
                            ) : (
                                <form onSubmit={handlePasswordReset} className="bg-black/40 p-4 rounded-xl border border-indigo-500/30">
                                    <label className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-2 block">New Password</label>
                                    <input type="text" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none focus:border-indigo-500 mb-3" placeholder="Enter new temp password" />
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setShowPasswordReset(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition-colors">Cancel</button>
                                        <button type="submit" disabled={savingPassword} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-1">
                                            {savingPassword ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Save
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}