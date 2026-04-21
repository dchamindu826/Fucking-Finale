import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { FaPhoneAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

export default function RightSidePanel({ selectedLead, activeMode }) {
  const [studentDetails, setStudentDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedLead?.phone) {
      fetchStudentData();
    }
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

  return (
    <div className="w-[300px] xl:w-[320px] bg-[#23303f] rounded-2xl flex flex-col shrink-0 overflow-hidden text-slate-400 border border-white/5 shadow-lg">
      
      {/* Top Profile Banner (Match Image 3) */}
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
        
        {/* Status Box (Match Image 3) */}
        <div className="bg-[#1a2430] p-4 rounded-xl border border-white/5 mb-4 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Lead Status</h3>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-slate-400">Phase</span>
            <span className="text-xs font-bold text-emerald-500">
              Phase {selectedLead.phase}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-400">Call Status</span>
            <span className="text-sm font-semibold capitalize text-slate-300">{selectedLead.callStatus}</span>
          </div>
        </div>

        {/* System Records (Match Image 3) */}
        <div className="bg-[#1a2430] p-4 rounded-xl border border-white/5 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">System Records</h3>
          
          {loading ? (
            <div className="animate-pulse flex flex-col gap-2">
              <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            </div>
          ) : studentDetails?.isEnrolled ? (
            <div className="flex items-center gap-2 text-emerald-500 font-semibold bg-emerald-900/10 p-3 rounded-lg border border-emerald-900/30 text-sm">
              <FaCheckCircle /> Registered in main system
            </div>
          ) : (
            <div className="flex items-start gap-3 text-amber-500 font-medium bg-[#3a2512]/30 p-3 rounded-lg border border-[#3a2512] text-xs leading-relaxed shadow-inner">
              <FaTimesCircle className="shrink-0 text-base mt-0.5" /> 
              Not registered in the main system yet.
            </div>
          )}
        </div>

        {/* Call Campaign Elements */}
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
    </div>
  );
}