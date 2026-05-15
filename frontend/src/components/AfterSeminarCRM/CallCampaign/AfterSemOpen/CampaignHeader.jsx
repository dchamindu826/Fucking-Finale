import React, { useState } from 'react';
import { FaUserGraduate, FaSearch, FaKeyboard, FaCheckCircle, FaClock, FaChevronUp, FaChevronDown, FaChartPie, FaExclamationTriangle } from 'react-icons/fa';

export default function CampaignHeader({ stats, activeTab, setActiveTab, activePhase, setActivePhase, statusFilter, setStatusFilter, searchQuery, setSearchQuery, typingMode, setTypingMode, showOnlyDelayed, setShowOnlyDelayed, currentRoundDelayedCount }) {
    const [isStatsExpanded, setIsStatsExpanded] = useState(true);

    return (
        <div className="flex flex-col gap-4 shrink-0">
            
            <div className="flex justify-between items-center bg-white/5 backdrop-blur-md px-5 py-3 rounded-xl border border-white/10 shadow-sm">
                <div className="flex items-center gap-3">
                    <FaChartPie className="text-amber-500 text-xl" />
                    <h2 className="text-lg font-bold text-slate-200 uppercase tracking-wide">Campaign Matrix</h2>
                </div>
                <button onClick={() => setIsStatsExpanded(!isStatsExpanded)} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-black/30 px-4 py-2 rounded-lg transition-colors border border-white/10">
                    {isStatsExpanded ? <><FaChevronUp /> Hide Stats</> : <><FaChevronDown /> Show Stats</>}
                </button>
            </div>

            {isStatsExpanded && (
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6 shadow-xl animate-fade-in-up">
                    <div className="flex items-center gap-8 border-r border-white/10 pr-8">
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5">Total</p>
                            <p className="text-4xl font-black text-white leading-none">{stats.totalAssigned}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5">Covered</p>
                            <p className="text-4xl font-black text-amber-400 leading-none">{stats.totalCovered}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5">Pending</p>
                            <p className="text-4xl font-black text-slate-300 leading-none">{stats.totalPending}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FaUserGraduate size={14}/> Enrolled</p>
                            <p className="text-4xl font-black text-emerald-400 leading-none">{stats.enrolled} <span className="text-base text-emerald-500/70 ml-1 font-bold tracking-tight">({stats.enrolledPercentage}%)</span></p>
                        </div>
                    </div>

                    <div className="flex flex-1 items-center justify-around gap-4">
                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2.5">Round 1 (Non-Paid)</p>
                            <div className="flex items-center gap-5 text-xl font-black justify-center">
                                <span className="text-emerald-400 flex items-center gap-2" title="Covered"><FaCheckCircle size={16}/> {stats.r1Covered}</span>
                                <span className="text-amber-400 flex items-center gap-2" title="Pending"><FaClock size={16}/> {stats.r1Pending}</span>
                            </div>
                        </div>
                        <div className="w-px h-12 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2.5">Round 2 (Non-Paid)</p>
                            <div className="flex items-center gap-5 text-xl font-black justify-center">
                                <span className="text-emerald-400 flex items-center gap-2" title="Covered"><FaCheckCircle size={16}/> {stats.r2Covered}</span>
                                <span className="text-amber-400 flex items-center gap-2" title="Pending"><FaClock size={16}/> {stats.r2Pending}</span>
                            </div>
                        </div>
                        <div className="w-px h-12 bg-white/10"></div>
                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2.5">Round 3 (Non-Paid)</p>
                            <div className="flex items-center gap-5 text-xl font-black justify-center">
                                <span className="text-emerald-400 flex items-center gap-2" title="Covered"><FaCheckCircle size={16}/> {stats.r3Covered}</span>
                                <span className="text-amber-400 flex items-center gap-2" title="Pending"><FaClock size={16}/> {stats.r3Pending}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row justify-between items-center gap-3">
                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto custom-scrollbar pb-1 lg:pb-0 items-center">
                    <button onClick={() => setActiveTab('ROUND_1')} className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 outline-none ${activeTab === 'ROUND_1' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}>
                        Round 1 <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === 'ROUND_1' ? 'bg-black/30 text-white' : 'bg-black/40 text-slate-300'}`}>{stats.r1Total}</span>
                    </button>
                    <button onClick={() => setActiveTab('ROUND_2')} className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 outline-none ${activeTab === 'ROUND_2' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}>
                        Round 2 <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === 'ROUND_2' ? 'bg-black/30 text-white' : 'bg-black/40 text-slate-300'}`}>{stats.r2Total}</span>
                    </button>
                    <button onClick={() => setActiveTab('ROUND_3')} className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 outline-none ${activeTab === 'ROUND_3' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}>
                        Round 3 <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === 'ROUND_3' ? 'bg-black/30 text-white' : 'bg-black/40 text-slate-300'}`}>{stats.r3Total}</span>
                    </button>
                    
                    <div className="h-6 w-px bg-white/20 mx-1"></div>

                    <button onClick={() => setActiveTab('ENROLLED')} className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 outline-none ${activeTab === 'ENROLLED' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white/5 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'}`}>
                        <FaUserGraduate size={14}/> Paid <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-black/40 text-emerald-300">{stats.enrolled}</span>
                    </button>
                </div>

                <div className="flex gap-2 w-full lg:w-auto shrink-0">
                    {activeTab !== 'ENROLLED' && (
                        <>
                            {/* 🔥 අලුත් Delay Filter Button එක 🔥 */}
                            <button 
                                onClick={() => setShowOnlyDelayed(!showOnlyDelayed)}
                                className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${showOnlyDelayed ? 'bg-red-600 text-white border-red-500 shadow-md' : 'bg-black/40 text-red-400 border-red-500/30 hover:bg-red-500/10'}`}
                            >
                                <FaExclamationTriangle size={12}/> {showOnlyDelayed ? 'Show All' : 'Delayed Only'}
                                <span className={`px-1.5 py-0.5 rounded-md ${showOnlyDelayed ? 'bg-black/30 text-white' : 'bg-red-500/20 text-red-400'}`}>
                                    {currentRoundDelayedCount || 0}
                                </span>
                            </button>
                            
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)} 
                                className="w-32 shrink-0 bg-black/40 border border-white/10 rounded-lg py-2 px-2 text-[11px] font-bold uppercase tracking-wide text-slate-300 outline-none cursor-pointer focus:border-indigo-500 appearance-none"
                            >
                                <option value="ALL">All Status</option>
                                <option value="pending">⏳ Pending</option>
                                <option value="answered">✅ Answered</option>
                                <option value="no_answer">📵 No Answer</option>
                                <option value="reject">❌ Rejected</option>
                            </select>
                        </>
                    )}

                    <div className="relative flex-1 min-w-[130px] lg:w-48">
                        <FaSearch className="absolute left-3 top-2.5 text-slate-500 text-xs" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-8 pr-3 text-xs font-semibold text-slate-200 outline-none focus:border-indigo-500 placeholder-slate-600" 
                        />
                    </div>
                    
                    <div className="relative w-20 shrink-0">
                        <FaKeyboard className="absolute left-2.5 top-2.5 text-slate-500 text-xs" />
                        <select 
                            value={typingMode} 
                            onChange={(e) => setTypingMode(e.target.value)} 
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-7 pr-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 outline-none cursor-pointer focus:border-indigo-500 appearance-none"
                        >
                            <option value="en">ENG</option>
                            <option value="si-phonetic">SIN</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}