import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import axios from '../../api/axios';
import { FaPhoneAlt, FaCheckCircle, FaTimesCircle, FaUserSecret, FaKey, FaMapMarkerAlt, FaGraduationCap, FaCreditCard, FaTimes, FaMonitor } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function RightSidePanel({ selectedLead, activeMode }) {
  const [studentDetails, setStudentDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  
  const [ghostIframe, setGhostIframe] = useState(null);
  const [originalAdminSession, setOriginalAdminSession] = useState(null);

  useEffect(() => {
    if (selectedLead?.phone) fetchStudentData();
  }, [selectedLead]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/coordinator-crm/lead-details/${selectedLead.phone}`);
      setStudentDetails(res.data);
    } catch (error) {
      console.error("Error fetching student details", error);
    }
    setLoading(false);
  };

  // 🔥 Ghost Login - Uses /admin/ghost-login route and opens in an Iframe
  const handleGhostLogin = async () => {
      if(!window.confirm(`Are you sure you want to log in as ${studentDetails.student.firstName}?`)) return;
      try {
          toast.loading("Initiating Ghost Login...", { id: "ghost" });
          
          // Ensure this matches your exact backend route!
          const res = await axios.post('/admin/ghost-login', { studentId: studentDetails.student.id });
          
          if (res.data.token) {
              const currentToken = localStorage.getItem('token');
              const currentUser = localStorage.getItem('user');
              setOriginalAdminSession({ token: currentToken, user: currentUser });

              localStorage.setItem('token', res.data.token);
              localStorage.setItem('user', JSON.stringify(res.data.user));
              
              // Set the frontend URL to open in the iframe
              setGhostIframe('/student/dashboard');
              toast.success("Ghost Login Active!", { id: "ghost" });
          }
      } catch (error) {
          toast.error("Ghost login failed. Check backend route path.", { id: "ghost" });
      }
  };

  const closeGhostLogin = () => {
      if (originalAdminSession) {
          localStorage.setItem('token', originalAdminSession.token);
          localStorage.setItem('user', originalAdminSession.user);
      }
      setGhostIframe(null);
      toast.success("Restored Admin Session.");
  };

  const handleResetPassword = async (e) => {
      e.preventDefault();
      try {
          await axios.post('/coordinator-crm/reset-password', { studentId: studentDetails.student.id, newPassword });
          toast.success("Password successfully reset!");
          setShowResetModal(false);
          setNewPassword('');
      } catch (error) {
          toast.error("Password reset failed.");
      }
  };

  const getPaymentOption = (payment) => {
      if (!payment) return "N/A";
      let typeStr = payment.payment_type === 1 ? "Monthly" : payment.payment_type === 2 ? "Installment" : "Full Payment";
      return `${typeStr} via ${payment.method || 'Slip'}`;
  };

  return (
    <div className="w-[300px] xl:w-[320px] bg-[#23303f] rounded-2xl flex flex-col shrink-0 overflow-hidden text-slate-400 border border-white/5 shadow-lg relative">
      
      <div className="bg-[#1a2430] p-6 flex flex-col items-center justify-center border-b border-white/5">
        <div className="w-20 h-20 bg-[#2a3942] rounded-full border border-slate-600 flex items-center justify-center text-3xl font-bold mb-3 shadow-md text-slate-300">
          {selectedLead.name ? selectedLead.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <h2 className="text-lg font-bold text-center text-slate-200">{selectedLead.name || 'Unknown Lead'}</h2>
        <div className="flex items-center gap-2 mt-2 text-xs bg-[#0b141a] px-3 py-1.5 rounded-full border border-slate-700 text-emerald-400">
          <FaPhoneAlt size={10} /> {selectedLead.phone}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#23303f]">
        <div className="bg-[#1a2430] p-4 rounded-xl border border-white/5 mb-4 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Lead Status</h3>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-slate-400">Phase</span>
            <span className="text-xs font-bold text-emerald-500">Phase {selectedLead.phase}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-400">Call Status</span>
            <span className="text-sm font-semibold capitalize text-slate-300">{selectedLead.callStatus}</span>
          </div>
        </div>

        <div className="bg-[#1a2430] p-4 rounded-xl border border-white/5 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">System Records</h3>
          
          {loading ? (
            <div className="animate-pulse flex flex-col gap-2">
              <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
          ) : studentDetails?.isEnrolled ? (
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-500 font-bold bg-emerald-900/20 p-2.5 rounded-lg border border-emerald-900/50 text-xs">
                    <FaCheckCircle size={14}/> Registered Student
                </div>

                <div className="space-y-2.5">
                    <div className="text-xs">
                        <span className="text-slate-500 block mb-0.5">Full Name & ID</span>
                        <span className="text-slate-200 font-semibold">{studentDetails.student.firstName} {studentDetails.student.lastName} (ID: {studentDetails.student.id})</span>
                    </div>
                    <div className="text-xs">
                        <span className="text-slate-500 block mb-0.5"><FaMapMarkerAlt className="inline mr-1"/> Address</span>
                        <span className="text-slate-300">{studentDetails.student.addressHouseNo}, {studentDetails.student.addressStreet}, {studentDetails.student.city}</span>
                    </div>
                    
                    {studentDetails.student.payments?.[0] && (
                        <>
                            <div className="text-xs mt-3 pt-3 border-t border-slate-700">
                                <span className="text-slate-500 block mb-0.5"><FaGraduationCap className="inline mr-1"/> Enrollment</span>
                                <span className="text-blue-300 font-bold block">{studentDetails.student.payments[0].business?.name}</span>
                                <span className="text-slate-400 block">{studentDetails.student.payments[0].batch?.name}</span>
                            </div>
                            <div className="text-xs mt-2">
                                <span className="text-slate-500 block mb-0.5">Enrolled Subjects</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {studentDetails.enrolledCourses?.map(c => (
                                        <span key={c.id} className="bg-slate-800 px-2 py-1 rounded text-[10px] text-slate-300 border border-slate-700">{c.name}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="text-xs mt-3">
                                <span className="text-slate-500 block mb-0.5"><FaCreditCard className="inline mr-1"/> Payment Option</span>
                                <span className="text-emerald-400 font-semibold">{getPaymentOption(studentDetails.student.payments[0])}</span>
                            </div>
                        </>
                    )}
                </div>

                <div className="pt-4 mt-2 border-t border-slate-700 space-y-2">
                    <button onClick={handleGhostLogin} className="w-full bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all">
                        <FaUserSecret size={14}/> Ghost Login
                    </button>
                    <button onClick={() => setShowResetModal(true)} className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all">
                        <FaKey size={12}/> Reset Password
                    </button>
                </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 text-amber-500 font-medium bg-[#3a2512]/30 p-3 rounded-lg border border-[#3a2512] text-xs leading-relaxed shadow-inner">
              <FaTimesCircle className="shrink-0 text-base mt-0.5" /> 
              Not registered in the main system yet.
            </div>
          )}
        </div>

        {activeMode === 'CALL_CAMPAIGN' && (
          <div className="mt-4 bg-[#1e3a8a]/10 p-4 rounded-xl border border-blue-900/30 shadow-sm">
             <h3 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4">Call Actions</h3>
             <select className="w-full mb-3 p-2 text-sm bg-[#0f172a] border border-slate-700 text-slate-300 rounded-lg outline-none focus:border-blue-700">
               <option>Select Call Method...</option>
               <option value="direct">Direct Call</option>
               <option value="whatsapp">WhatsApp Audio</option>
               <option value="3cx">3CX</option>
             </select>
             <textarea 
                className="w-full p-2 text-sm bg-[#0f172a] border border-slate-700 text-slate-300 rounded-lg outline-none focus:border-blue-700 mb-3 placeholder-slate-600" 
                rows="3" 
                placeholder="Enter feedback/remarks here..."
             ></textarea>
             <button className="w-full bg-blue-700 hover:bg-blue-600 text-slate-100 font-semibold py-2 rounded-lg transition-colors shadow-md text-sm">
               Update Status
             </button>
          </div>
        )}
      </div>

      {showResetModal && (
         <div className="absolute inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5 w-full shadow-2xl">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2"><FaKey/> Reset Password</h3>
                     <button onClick={()=>setShowResetModal(false)} className="text-slate-500 hover:text-white"><FaTimes/></button>
                 </div>
                 <form onSubmit={handleResetPassword}>
                     <input type="text" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Enter new password" required className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg p-3 mb-4 text-sm outline-none focus:border-amber-500" />
                     <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-lg text-sm shadow-lg">Confirm Reset</button>
                 </form>
             </div>
         </div>
      )}

      {/* 🔥 Ghost Login Full Iframe Modal 🔥 */}
      {ghostIframe && createPortal(
          <div className="fixed inset-0 z-[99999] bg-[#0f172a]/95 flex flex-col backdrop-blur-lg animate-in fade-in duration-300">
              <div className="w-full bg-[#1e293b] border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-xl z-10 shrink-0">
                  <div className="flex items-center gap-4">
                      <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                          <FaMonitor size={20} />
                      </div>
                      <div>
                          <h3 className="text-white font-bold text-lg">Ghost Login Active</h3>
                          <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Viewing student dashboard</p>
                      </div>
                  </div>
                  <button onClick={closeGhostLogin} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-widest shadow-lg shadow-red-500/20">
                      <FaTimes size={16} /> End Session & Close
                  </button>
              </div>
              <div className="flex-1 w-full relative bg-white flex justify-center overflow-hidden">
                  <div className="w-full max-w-[450px] h-full bg-white shadow-2xl border-x border-slate-200">
                      <iframe src={ghostIframe} className="w-full h-full border-none" title="Ghost Login View"></iframe>
                  </div>
              </div>
          </div>,
          document.body
      )}

    </div>
  );
}