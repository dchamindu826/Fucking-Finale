import React from 'react';
import ManagerCampaignStats from './ManagerCampaignStats';
import StaffCampaignExecution from './StaffCampaignExecution';

export default function CallCampaignModule({ loggedInUser, filters, setActiveMode, setSelectedLead }) {
    
    // 1. Role eka ganna logic eka (poddak thawath strong kara)
    let rawRole = '';
    if (loggedInUser && loggedInUser.role) {
        rawRole = loggedInUser.role;
    } else {
        try {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            rawRole = storedUser?.role || '';
        } catch (e) {
            console.error("Local storage error", e);
        }
    }

    // 2. Normalize role (Space -> Underscore)
    const userRole = rawRole.toUpperCase().replace(/ /g, '_');
    
    // 3. Manager/Admin check eka
    const managerRoles = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'SUPER', 'ASS_MANAGER'];
    const isManager = managerRoles.includes(userRole);

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar p-2 relative">
            
            {/* 🔴 VISUAL DEBUG BANNER (Screen eke uda penewi) 🔴 */}
            <div className="bg-red-950/80 border-2 border-red-500 text-red-200 p-4 mb-4 rounded-xl font-mono text-sm shadow-lg backdrop-blur-md">
                <p className="font-bold text-xl text-white mb-2 border-b border-red-500/50 pb-2">🚨 ROLE DEBUG INFO 🚨</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <p><b>1. Raw Role (DB Eken ena):</b> <span className="text-white bg-black/40 px-2 py-0.5 rounded">"{rawRole}"</span></p>
                    <p><b>2. Normalized Role:</b> <span className="text-white bg-black/40 px-2 py-0.5 rounded">"{userRole}"</span></p>
                    <p><b>3. Is Manager?:</b> <span className={isManager ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{isManager ? "TRUE ✅" : "FALSE ❌"}</span></p>
                    <p><b>4. Has loggedInUser Props?:</b> <span className="text-white">{loggedInUser ? "YES" : "NO"}</span></p>
                </div>
            </div>

            {isManager ? (
                <ManagerCampaignStats filters={filters} />
            ) : (
                <StaffCampaignExecution 
                    setActiveMode={setActiveMode} 
                    setSelectedLead={setSelectedLead} 
                />
            )}
        </div>
    );
}