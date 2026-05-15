import React, { useState } from 'react';
import { FaLock, FaUnlock, FaSave, FaCommentDots, FaArrowRight, FaChevronDown, FaChevronUp, FaUserGraduate, FaWallet, FaPhoneAlt, FaStopwatch, FaExclamationTriangle } from 'react-icons/fa';

export default function LeadCard({ lead, timer, drafts, activeTab, isManager, typingMode, handleUpdateLocalLead, handleLocalCallStatusChange, handleRemarkTyping, handleSaveCallData, handlePushToNextRound, handleTempUnlock, setChatModalLead }) {
    const [isExpanded, setIsExpanded] = useState(lead.callStatus === 'pending' || !lead.callStatus);

    const currentRemark = drafts[lead.id] !== undefined ? drafts[lead.id] : (lead.feedback || '');
    const isLate = timer.type === 'danger' && activeTab !== 'ENROLLED';
    const isLocked = lead.isLocked || false; 
    
    // Save බටන් එක Enable/Disable කරන Logic එක
    const invalidPending = lead.isLocked && lead.callStatus === 'pending';

    return (
        <div className={`bg-white/5 backdrop-blur-md rounded-xl transition-all duration-200 overflow-hidden border ${isLate ? 'border-rose-500/50 shadow-[0_0_10px_rgba(225,29,72,0.1)]' : 'border-white/10 hover:border-white/20'}`}>
            
            {/* CARD HEADER (Collapsed State) */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer hover:bg-white/5 transition-colors gap-4 relative"
            >
                {isLate && (
                    <div className="absolute -top-2.5 -right-2.5 bg-red-600 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1 animate-pulse z-10 border border-[#111827]">
                        <FaExclamationTriangle size={10} /> Delayed
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-inner ${isLate ? 'bg-red-500/20 text-red-400' : 'bg-black/40 text-slate-300'}`}>
                        {lead.realIndex}
                    </div>
                    
                    {/* Phone & Timer */}
                    <div className="flex flex-col gap-1 min-w-[140px]">
                        <h4 className={`font-bold text-base flex items-center gap-2 tracking-wide ${isLate ? 'text-red-400' : 'text-slate-100'}`}>
                            {lead.phone}
                            {isLocked && <FaLock size={10} className="text-rose-500" title="Locked by system" />}
                        </h4>
                        {activeTab !== 'ENROLLED' && (
                            <span className={`text-[10px] font-bold tracking-wider uppercase ${isLate ? 'text-rose-400' : timer.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {isLate ? <FaExclamationTriangle className="inline pb-0.5" size={10}/> : '⏳'} {timer.text}
                            </span>
                        )}
                    </div>

                    {/* Name & Badges */}
                    <div className="flex flex-col gap-1.5 flex-1 md:pl-4 md:border-l border-white/10">
                        <p className="text-sm font-semibold text-slate-300 truncate max-w-[250px]">{lead.name || 'No Name Provided'}</p>
                        <div className="flex items-center gap-2">
                            <span className="bg-black/40 border border-white/10 text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Round {lead.coordinationRound || 1}</span>
                            <span className="bg-black/40 border border-white/10 text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Phase {lead.phase || 1}</span>
                        </div>
                    </div>
                </div>

                {/* Status Badge & Toggle */}
                <div className="flex items-center gap-4 shrink-0 mt-2 md:mt-0">
                    <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg border ${lead.callStatus === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : lead.callStatus === 'no_answer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : lead.callStatus === 'reject' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-black/40 text-slate-400 border-white/10'}`}>
                        {lead.callStatus ? lead.callStatus.replace('_', ' ') : 'PENDING'}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-slate-400">
                        {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                    </div>
                </div>
            </div>

            {/* EXPANDED WORKSPACE */}
            {isExpanded && (
                <div className="p-5 bg-black/20 border-t border-white/5 flex flex-col xl:flex-row gap-6">
                    
                    {/* Column 1: Configs */}
                    <div className="w-full xl:w-[220px] flex flex-col gap-3 shrink-0">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><FaUserGraduate size={10}/> Enrollment</label>
                            <select disabled={isLocked} value={lead.enrollmentStatus || 'NON_ENROLLED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'enrollmentStatus', e.target.value)} className="w-full bg-black/40 border border-white/10 text-slate-300 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500 disabled:opacity-50">
                                <option value="NON_ENROLLED" className="bg-slate-900">Non-Enrolled</option>
                                <option value="ENROLLED" className="bg-slate-900 text-emerald-400">🔥 Enrolled (Paid)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><FaWallet size={10}/> Payment Plan</label>
                            <select disabled={isLocked} value={lead.paymentIntention || 'NOT_DECIDED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'paymentIntention', e.target.value)} className="w-full bg-black/40 border border-white/10 text-slate-300 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500 disabled:opacity-50">
                                <option value="NOT_DECIDED" className="bg-slate-900">Not Decided</option>
                                <option value="FULL" className="bg-slate-900 text-emerald-400">Full Payment</option>
                                <option value="MONTHLY" className="bg-slate-900 text-blue-400">Monthly Plan</option>
                                <option value="INSTALLMENT" className="bg-slate-900 text-amber-400">Installment Plan</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><FaPhoneAlt size={10}/> Method</label>
                                <select disabled={isLocked} value={lead.callMethod || 'direct'} onChange={(e) => handleUpdateLocalLead(lead.id, 'callMethod', e.target.value)} className="w-full bg-black/40 border border-white/10 text-slate-300 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500 disabled:opacity-50">
                                    <option value="direct" className="bg-slate-900">Direct Call</option>
                                    <option value="whatsapp" className="bg-slate-900">WhatsApp</option>
                                    <option value="3cx" className="bg-slate-900">3CX</option>
                                </select>
                            </div>
                            <div className="w-14 shrink-0">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><FaStopwatch size={10}/> Att.</label>
                                <select disabled={isLocked} value={lead.callAttempt || 1} onChange={(e) => handleUpdateLocalLead(lead.id, 'callAttempt', parseInt(e.target.value))} className="w-full bg-black/40 border border-white/10 text-slate-300 text-xs rounded-lg px-1.5 py-2 outline-none focus:border-indigo-500 text-center disabled:opacity-50">
                                    {[1,2,3,4,5,6,7,8,9,10].map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Feedback */}
                    <div className="flex-1 flex flex-col">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5"><FaCommentDots size={10}/> Call Remarks (Rounds history included)</span>
                            {typingMode === 'si-phonetic' && <span className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[9px]">SINHALA ON</span>}
                        </label>
                        <textarea 
                            disabled={isLocked}
                            value={currentRemark} 
                            onChange={(e) => handleRemarkTyping(lead.id, e.target.value)} 
                            placeholder="Type comprehensive feedback..." 
                            className={`w-full h-24 bg-black/40 border rounded-lg p-2.5 text-sm text-slate-200 outline-none resize-none custom-scrollbar disabled:opacity-50 ${invalidPending ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-indigo-500'}`} 
                        />
                    </div>

                    {/* Column 3: Actions */}
                    <div className="w-full xl:w-[220px] flex flex-col justify-between shrink-0">
                        <div className="mb-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Call Status</label>
                            <select 
                                onChange={(e) => handleLocalCallStatusChange(lead, e.target.value)} 
                                value={lead.callStatus || 'pending'} 
                                className={`w-full text-xs font-bold uppercase tracking-wide rounded-lg px-3 py-2.5 outline-none border disabled:opacity-50 ${invalidPending ? 'bg-red-500 text-white animate-pulse border-red-500' : lead.callStatus === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : lead.callStatus === 'no_answer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : lead.callStatus === 'reject' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-black/40 text-slate-300 border-white/10 focus:border-indigo-500'}`}
                            >
                                <option className="bg-slate-900 text-slate-300" value="pending">⏳ PENDING</option>
                                <option className="bg-slate-900 text-emerald-400" value="answered">✅ ANSWERED</option>
                                <option className="bg-slate-900 text-amber-400" value="no_answer">📵 NO ANSWER</option>
                                <option className="bg-slate-900 text-rose-400" value="reject">❌ REJECTED</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2 mt-auto">
                            {isLocked && isManager && handleTempUnlock && (
                                <button onClick={() => handleTempUnlock(lead.id)} className="w-full bg-black/40 text-blue-400 hover:bg-blue-600 hover:text-white border border-white/5 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex justify-center items-center gap-1.5"><FaUnlock size={10}/> Unlock Record</button>
                            )}
                            <div className="flex gap-2 w-full">
                                {/* 🔥 Fix Applied: Pass only lead.id to handleSaveCallData 🔥 */}
                                <button disabled={invalidPending} onClick={() => handleSaveCallData(lead.id)} title={invalidPending ? "Change status before saving!" : "Save"} className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase ${invalidPending ? 'bg-black/40 text-slate-500 border border-white/5 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md'}`}>
                                    <FaSave size={12}/> SAVE
                                </button>
                                <button onClick={(e) => { e.preventDefault(); if(typeof setChatModalLead === 'function') setChatModalLead(lead); }} className="bg-black/40 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-lg transition-all relative flex justify-center items-center border border-white/10 shadow-sm">
                                    <FaCommentDots size={14}/>
                                    {lead.unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>}
                                </button>
                            </div>

                            {/* Push To Round Button Logic */}
                            {activeTab !== 'ENROLLED' && (lead.needs5DayCall || lead.needs10DayCall) && (
                                <button 
                                    onClick={() => handlePushToNextRound(lead.id, lead.coordinationRound || 1, lead.callStatus)} 
                                    className="w-full bg-black/40 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 text-[9px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase border border-white/10 mt-1 shadow-sm"
                                >
                                    Push To Round {(lead.coordinationRound || 1) + 1} <FaArrowRight size={8} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}