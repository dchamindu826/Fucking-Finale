import React, { useState, useEffect, useRef } from 'react';
import axios from '../../api/axios';
import { FaPaperPlane, FaPaperclip, FaSun, FaMoon } from 'react-icons/fa';

export default function ChatArea({ selectedLead }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatTheme, setChatTheme] = useState('dark'); // 'dark' or 'light'
  const scrollRef = useRef(null);

  useEffect(() => {
    if (selectedLead) fetchMessages();
  }, [selectedLead]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/coordinator-crm/messages/${selectedLead.id}`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages", error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const res = await axios.post('/coordinator-crm/messages', {
        leadId: selectedLead.id,
        message: newMessage
      });
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message", error);
    }
  };

  const isDark = chatTheme === 'dark';

  return (
    <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-lg ${isDark ? 'bg-[#1a2430]' : 'bg-[#f0f2f5]'}`}>
      
      {/* Header */}
      <div className={`p-4 flex justify-between items-center border-b ${isDark ? 'bg-[#202c33] border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-white font-bold text-xl border border-slate-500">
            {selectedLead.name ? selectedLead.name.charAt(0).toUpperCase() : '#'}
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
               {selectedLead.name || selectedLead.phone}
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedLead.phone}</p>
          </div>
        </div>
        <button 
           onClick={() => setChatTheme(isDark ? 'light' : 'dark')}
           className={`p-2 rounded-full transition-colors ${isDark ? 'bg-[#2a3942] text-yellow-500' : 'bg-slate-200 text-slate-600'}`}
        >
          {isDark ? <FaSun size={14}/> : <FaMoon size={14}/>}
        </button>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar relative ${isDark ? "bg-[#0b141a]" : "bg-[#efeae2]"}`} ref={scrollRef}>
        <div className="relative z-10 flex flex-col">
          {messages.map((msg, idx) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div key={idx} className={`flex flex-col mb-4 ${isOutbound ? 'items-end' : 'items-start'}`}>
                
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl relative shadow-sm text-sm border ${
                  isOutbound 
                    ? (isDark ? 'bg-[#005c4b] text-slate-200 rounded-tr-none border-[#005c4b]' : 'bg-[#d9fdd3] text-slate-800 rounded-tr-none border-[#d9fdd3]')
                    : (isDark ? 'bg-[#202c33] text-slate-300 rounded-tl-none border-slate-700' : 'bg-white text-slate-800 rounded-tl-none border-slate-200')
                }`}>
                  
                  {/* Sender Name ONLY for outbound CRM messages */}
                  {isOutbound && (
                    <div className={`text-[10px] font-bold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {msg.senderType === 'AI_BOT' ? 'AI Bot' : msg.senderType === 'SYSTEM' ? 'System' : msg.senderName || 'Staff'}
                    </div>
                  )}

                  <p>{msg.message}</p>

                  <span className={`text-[9px] float-right mt-2 ml-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Input Box */}
      <div className={`p-3 border-t ${isDark ? 'bg-[#202c33] border-white/5' : 'bg-[#f0f2f5] border-slate-200'}`}>
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button type="button" className={`p-3 rounded-full transition ${isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-200'}`}>
            <FaPaperclip />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message"
            className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none ${
               isDark ? 'bg-[#2a3942] text-white border-transparent focus:border-emerald-600 placeholder-slate-500' 
                      : 'bg-white text-slate-800 border-slate-300 focus:border-emerald-500 placeholder-slate-400'
            }`}
          />
          <button type="submit" className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg">
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </div>
  );
}