import React, { useState, useEffect, useRef } from 'react';
import ContactSidebar from '../../components/CoordinatorCRM/ContactSidebar';
import ChatArea from '../../components/CoordinatorCRM/ChatArea'; 
import RightSidePanel from '../../components/CoordinatorCRM/RightSidePanel'; 
import StaffProgress from '../../components/CoordinatorCRM/StaffProgress';
import { MessageSquare, Globe, Activity } from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

export default function CoordinatorDashboard({ loggedInUser }) {
    
    const userRoleString = loggedInUser?.role?.toUpperCase() || '';
    const isManager = ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'ASS MANAGER'].includes(userRoleString);
    const userRole = isManager ? 'MANAGER' : 'STAFF';
    
    const [activeCampaign, setActiveCampaign] = useState('FREE_SEMINAR'); 
    const [activeContact, setActiveContact] = useState(null);
    const [chatTheme, setChatTheme] = useState('dark');
    const [rightPanelView, setRightPanelView] = useState('NONE'); 

    const [leads, setLeads] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [messages, setMessages] = useState([]); 

    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);

    const fetchLeads = async () => {
        try {
            const res = await axios.get(`/coordinator-crm/leads?campaignType=${activeCampaign}`);
            setLeads(res.data);
        } catch (error) { toast.error("Failed to fetch leads"); }
    };

    useEffect(() => {
        fetchLeads();
        if (isManager) {
            axios.get('/admin/staff').then(res => setStaffList(res.data || [])).catch(e => console.log(e));
        }
    }, [activeCampaign, isManager]);

    // 🔥 මැසේජ් ටික Database එකෙන් ගන්නවා 🔥
    const handleSelectContact = async (contact) => {
        setActiveContact(contact);
        setRightPanelView('LEAD_DETAILS');
        try {
            const res = await axios.get(`/coordinator-crm/messages/${contact.id}`);
            setMessages(res.data);
            fetchLeads(); // Unread එක 0 වුණාම වම් පැත්ත අප්ඩේට් කරන්න
        } catch(e) {
            toast.error("Error loading chat");
        }
    };

    // 🔥 මැසේජ් එකක් යවනවා 🔥
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeContact) return;
        setSending(true);
        try {
            const res = await axios.post('/coordinator-crm/messages', {
                leadId: activeContact.id,
                message: newMessage
            });
            setMessages(prev => [...prev, res.data]); // Chat එකට අලුත් මැසේජ් එක දානවා
            setNewMessage("");
            fetchLeads(); // වම් පැත්තේ Last Message එක අප්ඩේට් කරන්න
            setTimeout(() => { if(scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' }); }, 100);
        } catch(e) {
            toast.error("Failed to send");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[92vh] bg-[#0B141A] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative">
            <div className="bg-[#202C33] p-3 flex justify-between items-center border-b border-white/10 shrink-0 z-30">
                <div className="flex gap-2">
                    <button onClick={() => {setActiveCampaign('FREE_SEMINAR'); setActiveContact(null); setRightPanelView('NONE');}} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeCampaign === 'FREE_SEMINAR' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-[#8696A0] hover:bg-white/10 hover:text-white'}`}>
                        <MessageSquare size={16}/> Free Seminar CRM
                    </button>
                </div>
                {isManager && (
                    <button onClick={() => setRightPanelView(rightPanelView === 'STAFF_PROGRESS' ? 'NONE' : 'STAFF_PROGRESS')} className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border ${rightPanelView === 'STAFF_PROGRESS' ? 'bg-indigo-600 text-white border-transparent' : 'bg-transparent text-indigo-400 border-indigo-500/30'}`}>
                        <Activity size={16}/> View Agent Stats
                    </button>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                <ContactSidebar 
                    contacts={leads} selectedContact={activeContact} setSelectedContact={handleSelectContact}
                    staffList={staffList} userRole={userRole} onImportClick={() => {}} onAssignClick={() => {}}
                />

                <ChatArea 
                    theme={chatTheme} setTheme={setChatTheme}
                    selectedContact={activeContact} messages={messages} 
                    newMessage={newMessage} setNewMessage={setNewMessage} handleSendMessage={handleSendMessage} sending={sending}
                    scrollRef={scrollRef}
                />

                {rightPanelView === 'LEAD_DETAILS' && activeContact && (
                    <div className="w-[300px] md:w-[350px] shrink-0 border-l border-white/10 bg-[#0B141A]/90 backdrop-blur-md z-20">
                        <RightSidePanel activeContact={activeContact} />
                    </div>
                )}
            </div>
        </div>
    );
}