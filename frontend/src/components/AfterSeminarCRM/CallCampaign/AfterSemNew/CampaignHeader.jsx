import React, { useState } from 'react';
import { FaUserGraduate, FaSearch, FaKeyboard, FaCheckCircle, FaClock, FaChevronUp, FaChevronDown, FaChartPie, FaPlus, FaTimes, FaFileExport, FaExclamationTriangle } from 'react-icons/fa';

export default function CampaignHeader({ 
    stats, activeCoordinationRound, setActiveCoordinationRound, 
    customRounds, removeCustomRound, addCustomRound, 
    statusFilter, setStatusFilter, searchQuery, setSearchQuery, typingMode, setTypingMode, exportToExcel,
    showOnlyDelayed, setShowOnlyDelayed, currentRoundDelayedCount
}) {
    const [isStatsExpanded, setIsStatsExpanded] = useState(true);

    return (
        <div className="flex flex-col gap-4 shrink-0">
            
            {/* Header Title & Minimize Toggle */}
            <div className="flex justify-between items-center bg-[#111827] px-5 py-3 rounded-xl border border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <FaChartPie className="text-amber-500 text-xl" />
                    <h2 className="text-lg font-bold text-slate-200 uppercase tracking-wide">Direct Inquiries Matrix</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportToExcel} title="Export" className="flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg transition-colors shadow-sm text-xs font-bold gap-2">
                        <FaFileExport size={12} /> Export
                    </button>
                    <button 
                        onClick={() => setIsStatsExpanded(!isStatsExpanded)}
                        className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-700"
                    >
                        {isStatsExpanded ? <><FaChevronUp /> Hide Stats</> : <><FaChevronDown /> Show Stats</>}
                    </button>
                </div>
            </div>

            {/* OVERALL STATS BAR - EXPANDABLE & LARGE */}
            {isStatsExpanded && (
                <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6 shadow-md animate-fade-in-up">
                    
                    <div className="flex items-center gap-8 border-r border-slate-700/50 pr-8">
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1.5">Total</p>
                            <p className="text-4xl font-black text-white leading-none">{stats.totalAssigned}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1.5">Covered</p>
                            <p className="text-4xl font-black text-amber-400 leading-none">{stats.totalCovered}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1.5">Pending</p>
                            <p className="text-4xl font-black text-slate-300 leading-none">{stats.totalPending}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FaUserGraduate size={14}/> Enrolled</p>
                            <p className="text-4xl font-black text-emerald-400 leading-none">{stats.enrolled} <span className="text-base text-emerald-500/70 ml-1 font-bold tracking-tight">({stats.enrolledPercentage}%)</span></p>
                        </div>
                    </div>

                    <div className="flex flex-1 items-center justify-around gap-4">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2.5">Round 1 Progress</p>
                            <div className="flex items-center gap-5 text-xl font-black justify-center">
                                <span className="text-emerald-400 flex items-center gap-2" title="Covered"><FaCheckCircle size={16}/> {stats.r1Covered}</span>
                                <span className="text-amber-400 flex items-center gap-2" title="Pending"><FaClock size={16}/> {stats.r1Pending}</span>
                            </div>
                            <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase">Total: {stats.r1Total}</p>
                        </div>
                        <div className="w-px h-12 bg-slate-700/50"></div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2.5">Round 2 Progress</p>
                            <div className="flex items-center gap-5 text-xl font-black justify-center">
                                <span className="text-emerald-400 flex items-center gap-2" title="Covered"><FaCheckCircle size={16}/> {stats.r2Covered}</span>
                                <span className="text-amber-400 flex items-center gap-2" title="Pending"><FaClock size={16}/> {stats.r2Pending}</span>
                            </div>
                            <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase">Total: {stats.r2Total}</p>
                        </div>
                        <div className="w-px h-12 bg-slate-700/50"></div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2.5">Round 3 Progress</p>
                            <div className="flex items-center gap-5 text-xl font-black justify-center">
                                <span className="text-emerald-400 flex items-center gap-2" title="Covered"><FaCheckCircle size={16}/> {stats.r3Covered}</span>
                                <span className="text-amber-400 flex items-center gap-2" title="Pending"><FaClock size={16}/> {stats.r3Pending}</span>
                            </div>
                            <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase">Total: {stats.r3Total}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TABS & SEARCH BAR */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-3">
                
                {/* Round Tabs & Custom Rounds */}
                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto custom-scrollbar pb-1 lg:pb-0 items-center">
                    <button onClick={() => setActiveCoordinationRound(1)} className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 outline-none ${activeCoordinationRound === 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-[#111827] border border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                        Round 1 <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeCoordinationRound === 1 ? 'bg-black/30' : 'bg-slate-800'}`}>{stats.r1Total}</span>
                    </button>
                    <button onClick={() => setActiveCoordinationRound(2)} className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 outline-none ${activeCoordinationRound === 2 ? 'bg-indigo-600 text-white shadow-md' : 'bg-[#111827] border border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                        Round 2 <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeCoordinationRound === 2 ? 'bg-black/30' : 'bg-slate-800'}`}>{stats.r2Total}</span>
                    </button>
                    <button onClick={() => setActiveCoordinationRound(3)} className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 outline-none ${activeCoordinationRound === 3 ? 'bg-indigo-600 text-white shadow-md' : 'bg-[#111827] border border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                        Round 3 <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeCoordinationRound === 3 ? 'bg-black/30' : 'bg-slate-800'}`}>{stats.r3Total}</span>
                    </button>

                    {customRounds && customRounds.map(r => (
                        <div key={r.roundNum} className="flex items-center group bg-[#111827] rounded-lg border border-slate-800 shrink-0 h-[36px]">
                            <button onClick={() => setActiveCoordinationRound(r.roundNum)} className={`px-4 h-full text-xs font-bold uppercase tracking-wider transition-all rounded-l-lg ${activeCoordinationRound === r.roundNum ? 'bg-amber-600 text-white shadow-md' : 'bg-transparent text-amber-500 hover:bg-slate-800'}`}>
                                {r.name}
                            </button>
                            <button onClick={(e) => removeCustomRound(r.roundNum, e)} className="px-3 h-full text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-r-lg transition-all"><FaTimes size={12}/></button>
                        </div>
                    ))}
                    
                    <div className="h-6 w-px bg-slate-700 mx-1 self-center shrink-0"></div>

                    <button onClick={addCustomRound} className="flex-shrink-0 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#111827] text-slate-400 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 border border-slate-800"><FaPlus size={10}/> Add</button>
                    <button onClick={() => setActiveCoordinationRound('ENROLLED')} className={`flex-shrink-0 px-5 py-2.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 outline-none ${activeCoordinationRound === 'ENROLLED' ? 'bg-emerald-600 text-white shadow-md' : 'bg-[#111827] border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'}`}>
                        <FaUserGraduate size={12}/> Paid <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-black/20 text-white">{stats.enrolled}</span>
                    </button>
                </div>

                {/* Filters & Search */}
                <div className="flex gap-2 w-full lg:w-auto shrink-0">
                    {/* 🔥 DELAY FILTER BUTTON 🔥 */}
                    {activeCoordinationRound !== 'ENROLLED' && (
                        <>
                            <button 
                                onClick={() => setShowOnlyDelayed(!showOnlyDelayed)}
                                className={`px-3 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${showOnlyDelayed ? 'bg-red-600 text-white border-red-500 shadow-md' : 'bg-[#111827] text-red-400 border-red-500/30 hover:bg-red-500/10'}`}
                            >
                                <FaExclamationTriangle size={12}/> {showOnlyDelayed ? 'Show All' : 'Delayed Only'}
                                <span className={`px-1.5 py-0.5 rounded-md ${showOnlyDelayed ? 'bg-black/30 text-white' : 'bg-red-500/20 text-red-400'}`}>
                                    {currentRoundDelayedCount || 0}
                                </span>
                            </button>
                            
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)} 
                                className="w-36 shrink-0 bg-[#111827] border border-slate-800 rounded-lg py-2.5 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-300 outline-none cursor-pointer focus:border-indigo-500 appearance-none"
                            >
                                <option value="ALL">All Status</option>
                                <option value="pending">⏳ Pending</option>
                                <option value="answered">✅ Answered</option>
                                <option value="no_answer">📵 No Answer</option>
                                <option value="reject">❌ Rejected</option>
                            </select>
                        </>
                    )}
                    <div className="relative flex-1 min-w-[160px] lg:w-60">
                        <FaSearch className="absolute left-3.5 top-3 text-slate-500 text-xs" />
                        <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#111827] border border-slate-800 rounded-lg py-2.5 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-indigo-500 placeholder-slate-600" />
                    </div>
                    <div className="relative w-28 shrink-0">
                        <FaKeyboard className="absolute left-3 top-3 text-slate-500 text-xs" />
                        <select value={typingMode} onChange={(e) => setTypingMode(e.target.value)} className="w-full bg-[#111827] border border-slate-800 rounded-lg py-2.5 pl-8 pr-2 text-[10px] font-bold uppercase text-slate-300 outline-none cursor-pointer focus:border-indigo-500 appearance-none">
                            <option value="en">ENG</option>
                            <option value="si-phonetic">SIN</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}