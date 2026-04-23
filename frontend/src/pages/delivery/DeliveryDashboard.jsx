import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Truck, Search } from 'lucide-react';

import Overview from './components/Overview';
import PendingHolds from './components/PendingHolds';
import DeliveredReturned from './components/DeliveredReturned';
import TuteStock from './components/TuteStock';

export default function DeliveryDashboard() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const activeTab = queryParams.get('tab') || 'overview'; // URL එකෙන් tab එක ගන්නවා

    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="w-full animate-fade-in text-slate-200 pb-10 font-sans relative">
            
            {/* Header Section */}
            <div className="flex items-center gap-4 mb-8 bg-[#1e2336]/60 p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-xl backdrop-blur-xl">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400 shrink-0">
                    <Truck size={28}/>
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-wide capitalize">
                        {activeTab === 'overview' && 'Overview'}
                        {activeTab === 'pending' && 'Pending & Holds'}
                        {activeTab === 'delivered' && 'Delivered & Returned'}
                        {activeTab === 'stock' && 'Tute Stock'}
                    </h2>
                    <p className="text-slate-400 font-medium text-sm mt-1">Manage student deliveries, tracking, and tute inventory.</p>
                </div>
            </div>

            {/* Search Bar (Hidden in Overview) */}
            {activeTab !== 'overview' && (
                <div className="bg-[#1e2336]/60 p-5 rounded-2xl border border-white/5 mb-6 shadow-lg backdrop-blur-xl">
                    <div className="relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
                        <input 
                            type="text" 
                            placeholder="Search orders, students, batches or tracking IDs..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            className="w-full bg-black/40 border border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-white outline-none focus:border-blue-500/50 transition-colors text-sm font-medium" 
                        />
                    </div>
                </div>
            )}

            {/* Render the active module based on URL parameter */}
            <div className="mt-4">
                {activeTab === 'overview' && <Overview />}
                {activeTab === 'pending' && <PendingHolds searchQuery={searchQuery} />}
                {activeTab === 'delivered' && <DeliveredReturned searchQuery={searchQuery} />}
                {activeTab === 'stock' && <TuteStock searchQuery={searchQuery} />}
            </div>

        </div>
    );
}