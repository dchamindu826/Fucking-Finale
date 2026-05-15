import React from 'react';
import { Search, Users, Activity, CheckCircle, Clock, XCircle, Gift, Tag, Download } from 'lucide-react';

export default function PaymentFilters({ 
    isAdmin, filters, setFilters, businesses, batches, groups, subjects, stats, onOpenStaffStats, onOpenExport 
}) {
    const handleChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="mb-8 font-sans transition-colors duration-300">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:shadow-md hover:scale-[1.02] transition-all">
                    <p className="text-gray-500 dark:text-brand-darkTextMuted text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2 transition-colors"><Clock size={14} className="text-yellow-500 dark:text-yellow-500"/> Pending</p>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white transition-colors">{stats.pending}</h3>
                </div>
                <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:shadow-md hover:scale-[1.02] transition-all">
                    <p className="text-gray-500 dark:text-brand-darkTextMuted text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2 transition-colors"><CheckCircle size={14} className="text-emerald-500 dark:text-emerald-500"/> Approved</p>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white transition-colors">{stats.approved}</h3>
                </div>
                <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:shadow-md hover:scale-[1.02] transition-all">
                    <p className="text-gray-500 dark:text-brand-darkTextMuted text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2 transition-colors"><Gift size={14} className="text-yellow-400 dark:text-yellow-400"/> Free Cards</p>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white transition-colors">{stats.freeCards}</h3>
                </div>
                <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col justify-center shadow-sm hover:shadow-md hover:scale-[1.02] transition-all">
                    <p className="text-gray-500 dark:text-brand-darkTextMuted text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2 transition-colors"><Tag size={14} className="text-blue-500 dark:text-blue-400"/> Discounts</p>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white transition-colors">{stats.discounts}</h3>
                </div>
                <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder p-4 rounded-2xl flex flex-col justify-center shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-brand-darkHover transition-all hover:scale-[1.02]" onClick={onOpenStaffStats}>
                    <p className="text-gray-500 dark:text-brand-darkTextMuted text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2 transition-colors"><Users size={14} className="text-purple-500 dark:text-purple-400"/> Staff Stats</p>
                    <h3 className="text-sm font-black text-purple-600 dark:text-purple-400 mt-1 transition-colors">Click to View</h3>
                </div>
                
                {/* Export Button (Dynamic Themed) */}
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 rounded-2xl flex flex-col justify-center shadow-sm dark:shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all hover:scale-[1.02] group" onClick={onOpenExport}>
                    <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                        <Download size={14} className="text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors"/> Export
                    </p>
                    <h3 className="text-sm font-black text-emerald-800 dark:text-white mt-1 group-hover:text-emerald-900 dark:group-hover:text-emerald-100 transition-colors">Generate Report</h3>
                </div>
            </div>

            {/* Main Filters Bar */}
            <div className="bg-white dark:bg-brand-darkCard p-5 rounded-2xl border border-gray-200 dark:border-brand-darkBorder shadow-sm space-y-4 transition-colors">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 transition-colors" size={18}/>
                        <input 
                            type="text" 
                            placeholder="Search by Student Name or No..." 
                            value={filters.search} 
                            onChange={e => handleChange('search', e.target.value)} 
                            className="w-full bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl pl-11 pr-4 py-3 text-gray-900 dark:text-white font-medium outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-colors text-sm placeholder-gray-400 dark:placeholder-gray-500" 
                        />
                    </div>
                    
                    {isAdmin && (
                        <select 
                            value={filters.businessId} 
                            onChange={e => handleChange('businessId', e.target.value)} 
                            className="bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent cursor-pointer min-w-[150px] transition-colors"
                        >
                            <option value="All">All Businesses</option>
                            {businesses.map(biz => <option key={biz.id} value={biz.id}>{biz.name}</option>)}
                        </select>
                    )}
                    
                    <select 
                        value={filters.batchId} 
                        onChange={e => handleChange('batchId', e.target.value)} 
                        className="bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent cursor-pointer min-w-[140px] transition-colors"
                    >
                        <option value="All">All Batches</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <select 
                        value={filters.groupId} 
                        onChange={e => handleChange('groupId', e.target.value)} 
                        className="flex-1 bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent cursor-pointer transition-colors"
                    >
                        <option value="All">All Groups</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>

                    <select 
                        value={filters.subjectId} 
                        onChange={e => handleChange('subjectId', e.target.value)} 
                        className="flex-1 bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent cursor-pointer transition-colors"
                    >
                        <option value="All">All Subjects</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </select>

                    <select 
                        value={filters.method} 
                        onChange={e => handleChange('method', e.target.value)} 
                        className="flex-1 bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent cursor-pointer transition-colors"
                    >
                        <option value="All">All Methods (Slip & Online)</option>
                        <option value="Slip">Slip Payments</option>
                        <option value="Online">Online Payments</option>
                    </select>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center bg-gray-50 dark:bg-brand-darkBg p-3 rounded-xl border border-gray-200 dark:border-brand-darkBorder transition-colors">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2 transition-colors"><Activity size={14}/> Date Range:</span>
                    
                    <input 
                        type="date" 
                        value={filters.dateFrom} 
                        onChange={e => handleChange('dateFrom', e.target.value)} 
                        className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-xl px-4 py-2 text-sm font-bold text-gray-700 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-colors [color-scheme:light] dark:[color-scheme:dark]" 
                    />
                    
                    <span className="text-gray-500 dark:text-slate-500 font-bold transition-colors">To</span>
                    
                    <input 
                        type="date" 
                        value={filters.dateTo} 
                        onChange={e => handleChange('dateTo', e.target.value)} 
                        className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-xl px-4 py-2 text-sm font-bold text-gray-700 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-colors [color-scheme:light] dark:[color-scheme:dark]" 
                    />
                    
                    <button 
                        onClick={() => {handleChange('dateFrom', ''); handleChange('dateTo', '');}} 
                        className="text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors ml-auto"
                    >
                        Clear Dates
                    </button>
                </div>
            </div>
        </div>
    );
}