import React, { useState } from 'react';
import { FaLock, FaUnlock, FaSave, FaCommentDots, FaChevronDown, FaChevronUp, FaUserGraduate, FaWallet, FaPhoneAlt, FaStopwatch, FaExclamationTriangle, FaArrowRight } from 'react-icons/fa';

export default function LeadCard({ 
    lead, timeData, isLate, drafts, activeTab, isManager, typingMode, 
    handleUpdateLocalLead, handleLocalCallStatusChange, handleRemarkTyping, 
    handleSaveCallData, handleTempUnlock, setChatModalLead, handlePushToNextRound, invalidPending, isDelayed 
}) {
    const [isExpanded, setIsExpanded] = useState(lead.callStatus === 'pending' || !lead.callStatus);
    const currentRemark = drafts[lead.id] !== undefined ? drafts[lead.id] : (lead.feedback || '');
    const isLocked = lead.isLocked || false;

    // 🔥 TIMER COLORS LOGIC 🔥
    let timerColor = 'text-emerald-400';
    if (timeData?.state === 'CALL_PENDING' && timeData?.isLate) timerColor = 'text-rose-400';
    else if (timeData?.state === 'CALL_PENDING') timerColor = 'text-amber-400';
    else if (timeData?.state === 'WAITING') timerColor = 'text-slate-400';
    else if (timeData?.state === 'READY') timerColor = 'text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded';

    return (
        <div className={`bg-[#111827] rounded-xl transition-all duration-200 overflow-hidden border ${isDelayed ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.05)]' : 'border-slate-800 hover:border-slate-700'}`}>
            
            {/* CARD HEADER */}
            <div onClick={() => setIsExpanded(!isExpanded)} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors gap-4 relative">
                
                {isDelayed && (
                    <div className="absolute -top-2.5 -right-2.5 bg-red-600 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1 animate-pulse z-10 border border-[#111827]">
                        <FaExclamationTriangle size={10} /> Delayed
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-inner ${isDelayed ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-300'}`}>
                        {lead.realIndex}
                    </div>

                    <div className="flex flex-col gap-1 min-w-[140px]">
                        <h4 className={`font-bold text-base flex items-center gap-2 tracking-wide ${isDelayed ? 'text-red-400' : 'text-slate-100'}`}>
                            {lead.phone}
                            {isLocked && <FaLock size={10} className="text-rose-500" title="Locked by system" />}
                        </h4>
                        {timeData && (
                            <span className={`text-[10px] font-bold tracking-wider uppercase ${timerColor}`}>
                                {timeData.state === 'CALL_PENDING' && timeData.isLate ? <FaExclamationTriangle className="inline pb-0.5" size={10}/> : '⏳'} {timeData.text}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1 flex-1 md:pl-4 md:border-l border-slate-800">
                        <p className="text-sm font-semibold text-slate-300 truncate max-w-[250px]">{lead.name || 'No Name Provided'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="bg-slate-900 border border-slate-700 text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Round {lead.coordinationRound || 1}</span>
                            <span className="bg-slate-900 border border-slate-700 text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Phase {lead.phase || 1}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 mt-2 md:mt-0">
                    <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-lg border ${lead.callStatus === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : lead.callStatus === 'no_answer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : lead.callStatus === 'reject' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {lead.callStatus ? lead.callStatus.replace('_', ' ') : 'PENDING'}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                    </div>
                </div>
            </div>

            {/* EXPANDED WORKSPACE */}
            {isExpanded && (
                <div className="p-5 bg-[#0b111a] border-t border-slate-800 flex flex-col xl:flex-row gap-6">
                    
                    {/* Column 1: Configs */}
                    <div className="w-full xl:w-[220px] flex flex-col gap-3 shrink-0">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><FaUserGraduate size={10}/> Enrollment</label>
                            <select disabled={isLocked} value={lead.enrollmentStatus || 'NON_ENROLLED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'enrollmentStatus', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500 disabled:opacity-50">
                                <option value="NON_ENROLLED">Non-Enrolled</option>
                                <option value="ENROLLED">🔥 Enrolled (Paid)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><FaWallet size={10}/> Payment Plan</label>
                            <select disabled={isLocked} value={lead.paymentIntention || 'NOT_DECIDED'} onChange={(e) => handleUpdateLocalLead(lead.id, 'paymentIntention', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500 disabled:opacity-50">
                                <option value="NOT_DECIDED">Not Decided</option>
                                <option value="FULL">Full Payment</option>
                                <option value="MONTHLY">Monthly Plan</option>
                                <option value="INSTALLMENT">Installment Plan</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><FaPhoneAlt size={10}/> Method</label>
                                <select disabled={isLocked} value={lead.callMethod || 'direct'} onChange={(e) => handleUpdateLocalLead(lead.id, 'callMethod', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500 disabled:opacity-50">
                                    <option value="direct">Direct Call</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="3cx">3CX</option>
                                </select>
                            </div>
                            <div className="w-14 shrink-0">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><FaStopwatch size={10}/> Att.</label>
                                <select disabled={isLocked} value={lead.callAttempt || 1} onChange={(e) => handleUpdateLocalLead(lead.id, 'callAttempt', parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-1.5 py-2 outline-none focus:border-indigo-500 text-center disabled:opacity-50">
                                    {[1,2,3,4,5,6,7,8,9,10].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Feedback */}
                    <div className="flex-1 flex flex-col">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5"><FaCommentDots size={10}/> Call Remarks (Rounds history included)</span>
                            {typingMode === 'si-phonetic' && <span className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-[9px]">SINHALA ON</span>}
                        </label>
                        <textarea 
                            disabled={isLocked}
                            value={currentRemark} 
                            onChange={(e) => handleRemarkTyping(lead.id, e.target.value)} 
                            placeholder="Type comprehensive feedback..." 
                            className={`w-full h-24 bg-slate-900 border rounded-lg p-2.5 text-sm text-slate-200 outline-none resize-none custom-scrollbar disabled:opacity-50 ${invalidPending ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700 focus:border-indigo-500'}`} 
                        />
                    </div>

                    {/* Column 3: Actions */}
                    <div className="w-full xl:w-[220px] flex flex-col justify-between shrink-0">
                        <div className="mb-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Call Status</label>
                            <select 
                                onChange={(e) => handleLocalCallStatusChange(lead, e.target.value)} 
                                value={lead.callStatus || 'pending'} 
                                className={`w-full text-xs font-bold uppercase tracking-wide rounded-lg px-3 py-2.5 outline-none border disabled:opacity-50 ${invalidPending ? 'bg-red-500 text-white animate-pulse border-red-500' : lead.callStatus === 'answered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : lead.callStatus === 'no_answer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : lead.callStatus === 'reject' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-900 text-slate-300 border-slate-700'}`}
                            >
                                <option className="bg-slate-900 text-slate-300" value="pending">⏳ PENDING</option>
                                <option className="bg-slate-900 text-emerald-400" value="answered">✅ ANSWERED</option>
                                <option className="bg-slate-900 text-amber-400" value="no_answer">📵 NO ANSWER</option>
                                <option className="bg-slate-900 text-rose-400" value="reject">❌ REJECTED</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-2 mt-auto">
                            {isLocked && isManager && handleTempUnlock && (
                                <button onClick={() => handleTempUnlock(lead.id)} className="w-full bg-slate-800 text-blue-400 hover:bg-blue-600 hover:text-white py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex justify-center items-center gap-1.5"><FaUnlock size={10}/> Unlock Record</button>
                            )}
                            <div className="flex gap-2 w-full">
                                <button disabled={invalidPending} onClick={() => handleSaveCallData(lead)} title={invalidPending ? "Change status before saving!" : "Save"} className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase ${invalidPending ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                                    <FaSave size={12}/> SAVE
                                </button>
                                <button onClick={(e) => { e.preventDefault(); if(typeof setChatModalLead === 'function') setChatModalLead(lead); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition-all relative flex justify-center items-center border border-slate-700">
                                    <FaCommentDots size={14}/>
                                    {lead.unreadCount > 0 && <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border border-[#0f151c]"></span>}
                                </button>
                            </div>

                            {/* 🔥 ALUTH BUTTON LOGIC EKA 🔥 */}
                            {activeTab !== 'ENROLLED' && timeData?.ready && (
                                <button 
                                    onClick={() => handlePushToNextRound(lead.id, lead.coordinationRound || 1, lead.callStatus)} 
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase border border-emerald-500 mt-2 shadow-md animate-fade-in"
                                >
                                    Push To Round {(lead.coordinationRound || 1) + 1} <FaArrowRight size={10} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}