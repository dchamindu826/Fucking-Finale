import React, { useState, useMemo } from 'react';
import { Search, User, DownloadCloud, UserPlus, Filter, MessageSquare } from 'lucide-react';

const ContactSidebar = ({ 
    contacts, 
    selectedContact, 
    setSelectedContact, 
    staffList, 
    onImportClick, 
    onAssignClick,
    userRole
}) => {
    const [activeTab, setActiveTab] = useState('New');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filters for 'Assigned' tab
    const [filterStaff, setFilterStaff] = useState('All');
    const [filterPhase, setFilterPhase] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    // Unread Count Calculation
    const getUnreadChatCount = (list) => list.filter(c => c.unreadCount > 0).length;

    // Filter Logic
    const filteredContacts = useMemo(() => {
        let list = contacts || [];

        // 1. Search Filter
        if (searchTerm) {
            list = list.filter(c => 
                (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                (c.phone && c.phone.includes(searchTerm))
            );
        }

        // 2. Tab Filter
        if (activeTab === 'New') list = list.filter(c => c.status === 'NEW' || !c.assignedTo);
        else if (activeTab === 'Assigned') list = list.filter(c => c.assignedTo);
        else if (activeTab === 'Import') list = list.filter(c => c.source === 'import');

        // 3. Advanced Filters (Assigned Tab Only)
        if (activeTab === 'Assigned') {
            if (filterStaff !== 'All') list = list.filter(c => c.assignedTo === parseInt(filterStaff));
            if (filterPhase !== 'All') list = list.filter(c => c.phase === filterPhase);
            if (filterStatus !== 'All') list = list.filter(c => c.status === filterStatus);
        }

        // Sort: Unread first, then latest message
        return list.sort((a, b) => {
            if (a.unreadCount > 0 && !(b.unreadCount > 0)) return -1;
            if (!(a.unreadCount > 0) && b.unreadCount > 0) return 1;
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    }, [contacts, activeTab, searchTerm, filterStaff, filterPhase, filterStatus]);

    const unreadCounts = {
        New: getUnreadChatCount(contacts.filter(c => c.status === 'NEW' || !c.assignedTo)),
        Assigned: getUnreadChatCount(contacts.filter(c => c.assignedTo)),
        Import: getUnreadChatCount(contacts.filter(c => c.source === 'import')),
        All: getUnreadChatCount(contacts)
    };

    return (
        <div className="w-full md:w-[350px] lg:w-[380px] h-full flex flex-col bg-[#0B141A]/60 backdrop-blur-xl border-r border-white/10 z-20">
            
            {/* Top Action Buttons */}
            {userRole === 'MANAGER' && (
                <div className="p-3 flex gap-2 border-b border-white/5 bg-white/5">
                    <button onClick={onImportClick} className="flex-1 flex items-center justify-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 py-2.5 rounded-xl text-sm font-semibold transition border border-indigo-500/30">
                        <DownloadCloud size={16}/> Import
                    </button>
                    <button onClick={onAssignClick} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 py-2.5 rounded-xl text-sm font-semibold transition border border-emerald-500/30">
                        <UserPlus size={16}/> Assign
                    </button>
                </div>
            )}

            {/* Search Box */}
            <div className="px-4 py-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                        type="text" 
                        placeholder="Search leads..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#202C33]/80 border border-white/10 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-emerald-500/50 transition-colors"
                    />
                </div>
            </div>

            {/* Tabs with Green Badges */}
            <div className="flex px-2 border-b border-white/5 overflow-x-auto hide-scrollbar">
                {['New', 'Assigned', 'Import', 'All'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-4 py-3 text-[13px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {tab}
                        {unreadCounts[tab] > 0 && (
                            <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                {unreadCounts[tab]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Advanced Filters (Only for Assigned Tab) */}
            {activeTab === 'Assigned' && (
                <div className="p-3 bg-black/20 flex gap-2 overflow-x-auto hide-scrollbar border-b border-white/5">
                    <div className="flex items-center text-slate-400 pl-1 pr-2"><Filter size={14}/></div>
                    <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="bg-[#202C33] text-[11px] text-slate-200 border border-white/10 rounded-lg p-1.5 outline-none font-medium min-w-[90px]">
                        <option value="All">All Staff</option>
                        {staffList?.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                    </select>
                    <select value={filterPhase} onChange={(e) => setFilterPhase(e.target.value)} className="bg-[#202C33] text-[11px] text-slate-200 border border-white/10 rounded-lg p-1.5 outline-none font-medium min-w-[90px]">
                        <option value="All">All Phases</option>
                        <option value="Phase 1">Phase 1</option>
                        <option value="Phase 2">Phase 2</option>
                        <option value="Phase 3">Phase 3</option>
                    </select>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#202C33] text-[11px] text-slate-200 border border-white/10 rounded-lg p-1.5 outline-none font-medium min-w-[90px]">
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="No Answers">No Answers</option>
                        <option value="Reject">Reject</option>
                    </select>
                </div>
            )}

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                        <MessageSquare size={30} className="mb-2 opacity-20"/>
                        <p className="text-sm">No chats found</p>
                    </div>
                ) : (
                    filteredContacts.map(contact => {
                        const isSelected = selectedContact?.id === contact.id;
                        const isUnread = contact.unreadCount > 0;

                        // Display Name Logic (Number mostly, Name for imports)
                        let displayName = contact.phone;
                        if (contact.source === 'import' && contact.name) displayName = contact.name;

                        return (
                            <div 
                                key={contact.id} 
                                onClick={() => setSelectedContact(contact)}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 mb-1 border ${isSelected ? 'bg-[#202C33] border-white/10 shadow-lg' : 'border-transparent hover:bg-white/5'}`}
                            >
                                {/* DP Area */}
                                <div className="relative shrink-0">
                                    {contact.profilePic ? (
                                        <img src={contact.profilePic} alt="DP" className="w-12 h-12 rounded-full object-cover" />
                                    ) : (
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#6A7175]/30 text-slate-400'}`}>
                                            <User size={24} />
                                        </div>
                                    )}
                                </div>

                                {/* Chat Info */}
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className={`font-semibold text-[14px] truncate ${isUnread ? 'text-white' : 'text-[#E9EDEF]'}`}>
                                            {displayName}
                                        </h4>
                                        <span className={`text-[10px] whitespace-nowrap ml-2 ${isUnread ? 'text-emerald-500 font-bold' : 'text-[#8696A0]'}`}>
                                            {contact.updatedAt ? new Date(contact.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-[13px] truncate max-w-[85%] ${isUnread ? 'text-slate-300 font-medium' : 'text-[#8696A0]'}`}>
                                            {contact.lastMessage || 'No messages yet'}
                                        </p>
                                        {isUnread && (
                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ContactSidebar;