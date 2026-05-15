import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Truck, Search } from 'lucide-react';

import Overview from './components/Overview';
import PendingHolds from './components/PendingHolds';
import DispatchDelivered from './components/DispatchDelivered'; 
import TuteStock from './components/TuteStock';
import DeliveryHistory from './components/DeliveryHistory';

export default function DeliveryDashboard() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const activeTab = queryParams.get('tab') || 'overview'; 

    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="w-full animate-fade-in text-gray-900 dark:text-gray-100 pb-10 font-sans relative transition-colors duration-500">
            
            {/* Header Section */}
            <div className="flex items-center gap-4 mb-8 bg-white dark:bg-brand-darkCard p-6 md:p-8 rounded-[2rem] border border-gray-200 dark:border-brand-darkBorder shadow-sm dark:shadow-md transition-colors">
                <div className="p-3 bg-brand-accentLight rounded-xl border border-brand-accent/20 text-brand-accent shrink-0 transition-colors">
                    <Truck size={28}/>
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-wide capitalize transition-colors">
                        {activeTab === 'overview' && 'Overview'}
                        {activeTab === 'pending' && 'Pending & Holds'}
                        {activeTab === 'delivered' && 'Dispatch & Delivered'} 
                        {activeTab === 'stock' && 'Tute Stock'}
                        {activeTab === 'history' && 'Delivery History'}
                    </h2>
                    <p className="text-gray-500 dark:text-brand-darkTextMuted font-medium text-sm mt-1 transition-colors">Manage student deliveries, tracking, and tute inventory.</p>
                </div>
            </div>

            {/* Search Bar (Hidden in Overview & Stock) */}
            {(activeTab === 'pending' || activeTab === 'delivered') && (
                <div className="bg-white dark:bg-brand-darkCard p-5 rounded-2xl border border-gray-200 dark:border-brand-darkBorder mb-6 shadow-sm transition-colors">
                    <div className="relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18}/>
                        <input 
                            type="text" 
                            placeholder="Search orders, students, batches or tracking IDs..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            className="w-full bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl pl-11 pr-4 py-3.5 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-colors text-sm font-medium placeholder-gray-400 dark:placeholder-gray-500" 
                        />
                    </div>
                </div>
            )}

            {/* Render the active module based on URL parameter */}
            <div className="mt-4">
                {activeTab === 'overview' && <Overview />}
                {activeTab === 'pending' && <PendingHolds searchQuery={searchQuery} />}
                {activeTab === 'history' && <DeliveryHistory />}
                {activeTab === 'delivered' && <DispatchDelivered searchQuery={searchQuery} />} 
                {activeTab === 'stock' && <TuteStock searchQuery={searchQuery} />}
            </div>

        </div>
    );
}