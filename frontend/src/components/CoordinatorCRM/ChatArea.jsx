import React, { useRef, useEffect, useState } from 'react';
import { Paperclip, Zap, Send, Mic, X, StopCircle, Trash2, MessageSquare, Loader, FileText, Play, Download, ClipboardList, CheckCheck, Reply, PlusCircle, LayoutTemplate, Image as ImageIcon, User } from 'lucide-react';
import toast from 'react-hot-toast';

const FONT_SIZES = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];
const getToken = () => localStorage.getItem('token') || localStorage.getItem('userToken');
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://imacampus.online';

const formatChatDateHeader = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// 🔥 Authentic WhatsApp Themes
const WA_THEMES = {
    light: { 
        bg: 'bg-[#EFEAE2]', // WhatsApp Web Light bg
        pattern: 'opacity-40',
        header: 'bg-[#F0F2F5]', 
        text: 'text-[#111B21]', 
        bubbleMe: 'bg-[#D9FDD3] text-[#111B21]', 
        bubbleThem: 'bg-white text-[#111B21]', 
        inputBg: 'bg-[#F0F2F5]', 
        icon: 'text-[#54656F]',
        border: 'border-[#D1D7DB]'
    },
    dark: { 
        bg: 'bg-[#0B141A]', // WhatsApp Web Dark bg
        pattern: 'opacity-10',
        header: 'bg-[#202C33]', 
        text: 'text-[#E9EDEF]', 
        bubbleMe: 'bg-[#005C4B] text-[#E9EDEF]', 
        bubbleThem: 'bg-[#202C33] text-[#E9EDEF]', 
        inputBg: 'bg-[#202C33]', 
        icon: 'text-[#8696A0]',
        border: 'border-[#222E35]'
    }
};

const ChatArea = (props) => {
    const {
        selectedContact, messages, isDarkMode, staff,
        newMessage, setNewMessage, handleSendMessage, sending,
        mediaPreview, setMediaPreview, uploading, setUploading,
        isRecording, setIsRecording, recordingTime, setRecordingTime,
        showTemplates, setShowTemplates, templates, setTemplates, 
        isCreatingTemplate, setIsCreatingTemplate, newTemplateTitle, setNewTemplateTitle, newTemplateMsg, setNewTemplateMsg,
        replyingTo, setReplyingTo, scrollRef, fontIndex = 1, // Default to text-sm
        theme, setTheme, showLeadDetails, setShowLeadDetails,
        fetchApprovedTemplates, setShowSendTemplateModal, userId
    } = props;

    // Default to dark if not 'light'
    const isLight = theme === 'light';
    const currentTheme = isLight ? WA_THEMES.light : WA_THEMES.dark;

    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const timerRef = useRef(null);

    const [personalReplies, setPersonalReplies] = useState([]);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrForm, setQrForm] = useState({ id: null, name: '', body: '', mediaUrl: '', mediaType: '', mediaName: '' });
    const [qrUploading, setQrUploading] = useState(false);
    const [suggestedReplies, setSuggestedReplies] = useState([]);

    useEffect(() => {
        if (theme !== 'light' && theme !== 'dark' && setTheme) setTheme('dark'); // Force WA themes
        const currentUserId = userId || localStorage.getItem('id') || 'default';
        const saved = localStorage.getItem(`quick_replies_${currentUserId}`);
        if (saved) setPersonalReplies(JSON.parse(saved));
    }, [userId, setTheme, theme]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages, selectedContact]);

    // ... (Keep ALL your existing Cloudinary, Audio Recording, and Quick Reply functions exactly as they were here)
    const uploadToCloudinary = async (file, type, isForQR = false) => { /* Your logic */ };
    const handleFileUpload = (e, isForQR = false) => { /* Your logic */ };
    const startRecording = async () => { /* Your logic */ };
    const stopRecording = () => { /* Your logic */ };
    const cancelRecording = () => { /* Your logic */ };
    const formatTime = (time) => `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;
    const fetchQuickReplies = async () => { /* Your logic */ };
    const savePersonalReply = () => { /* Your logic */ };
    const deletePersonalReply = (e, id) => { /* Your logic */ };
    const useQuickReply = (reply) => { /* Your logic */ };
    const handleTyping = (e) => { /* Your logic */ };

    if (!selectedContact) {
        return (
            <div className={`flex-1 flex flex-col items-center justify-center transition-colors z-10 ${currentTheme.header} border-l ${currentTheme.border}`}>
                <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-xl ${isLight ? 'bg-white' : 'bg-[#111B21]'}`}>
                    <MessageSquare size={50} className={isLight ? 'text-emerald-500' : 'text-emerald-400'}/>
                </div>
                <h1 className={`text-2xl font-light mb-2 ${currentTheme.text}`}>WhatsApp Web for IMA</h1>
                <p className={currentTheme.icon}>Select a chat to start messaging</p>
            </div>
        );
    }
    
    return (
        <div className={`flex-1 flex flex-col h-full overflow-hidden relative transition-colors duration-300 border-x ${currentTheme.bg} ${currentTheme.border}`}>
            
            {/* WhatsApp Chat Background Pattern (Simulated) */}
            <div className={`absolute inset-0 z-0 pointer-events-none ${currentTheme.pattern}`} style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/508/871/HD-wallpaper-whatsapp-background-doodles-pattern-texture.jpg")', backgroundSize: '400px', opacity: isLight ? 0.06 : 0.03 }}></div>

            {/* Header */}
            <div className={`${currentTheme.header} py-2 px-4 flex justify-between items-center z-20 shadow-sm transition-colors h-[60px]`}>
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowLeadDetails(!showLeadDetails)}>
                    {selectedContact.profilePic ? (
                        <img src={selectedContact.profilePic} alt="DP" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isLight ? 'bg-gray-300' : 'bg-[#6A7175]'}`}>
                            <User size={24} className="text-white" />
                        </div>
                    )}
                    <div>
                        <h3 className={`font-medium text-[16px] ${currentTheme.text}`}>
                            {selectedContact.source === 'import' && selectedContact.name ? selectedContact.name : (selectedContact.phoneNumber || selectedContact.phone || selectedContact.name)}
                        </h3>
                        {selectedContact.source === 'import' && <p className={`text-[12px] ${currentTheme.icon}`}>{selectedContact.phoneNumber || selectedContact.phone}</p>}
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Theme Toggle */}
                    <button onClick={() => setTheme(isLight ? 'dark' : 'light')} className={`p-2 rounded-full transition-colors hover:bg-black/10 ${currentTheme.icon}`}>
                        {isLight ? <div className="w-4 h-4 rounded-full bg-[#111B21]"></div> : <div className="w-4 h-4 rounded-full bg-[#EFEAE2]"></div>}
                    </button>
                    {/* Student Info Toggle */}
                    <button onClick={() => setShowLeadDetails(!showLeadDetails)} className={`p-2 rounded-full transition-colors hover:bg-black/10 ${showLeadDetails ? 'bg-black/10 text-emerald-500' : currentTheme.icon}`}>
                        <ClipboardList size={20}/>
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:px-12 flex flex-col gap-1 z-10 relative custom-scrollbar">
                {(() => {
                    let lastDateHeader = '';
                    
                    return messages?.map((msg, index) => {
                        // Safe extraction of message text
                        let rawText = msg.message || msg.text || msg.content || msg.body || "";
                        let msgText = rawText;
                        let mediaUrl = msg.mediaUrl || msg.media_url || null;

                        if (!mediaUrl && typeof rawText === 'string' && rawText.includes("http")) {
                            const urlMatch = rawText.match(/(https?:\/\/[^\s]+)/);
                            if (urlMatch) {
                                mediaUrl = urlMatch[0];
                                msgText = rawText.replace(mediaUrl, "").trim(); 
                            }
                        }

                        if (typeof msgText !== 'string') { try { msgText = JSON.stringify(msgText); } catch(e) { msgText = ""; } }
                        
                        const isMe = msg.direction === 'outbound' || msg.sender === 'me' || msg.sender_type === 'STAFF' || msg.sender_type === 'AI_BOT' || msg.sender_type === 'SYSTEM';
                        
                        // Check if previous message was from the same sender to group bubbles
                        const prevMsg = index > 0 ? messages[index - 1] : null;
                        const isPrevSameSender = prevMsg && (
                            (isMe && (prevMsg.direction === 'outbound' || prevMsg.sender === 'me' || prevMsg.sender_type === 'STAFF' || prevMsg.sender_type === 'AI_BOT' || prevMsg.sender_type === 'SYSTEM')) ||
                            (!isMe && (prevMsg.direction === 'inbound' || prevMsg.sender === 'user' || prevMsg.sender_type === 'USER'))
                        );

                        let senderLabel = '';
                        if (isMe && !isPrevSameSender) {
                            if (msg.sender_type === 'AI_BOT') senderLabel = '🤖 AI Bot';
                            else if (msg.sender_type === 'SYSTEM' || msg.sender_type === 'AUTO_REPLY') senderLabel = '⚙️ System Auto Reply';
                            else {
                                const agentName = msg.agentName || msg.agent_name || msg.senderName || 'Staff';
                                senderLabel = `${agentName}`;
                            }
                        }

                        const msgDate = new Date(msg.created_at || msg.createdAt || Date.now());
                        const currentDateHeader = formatChatDateHeader(msgDate);
                        const showDateHeader = currentDateHeader !== lastDateHeader;
                        if (showDateHeader) lastDateHeader = currentDateHeader;

                        // Bubble styling logic for rounded corners
                        let roundedClass = 'rounded-lg';
                        if (isMe) roundedClass = isPrevSameSender ? 'rounded-lg' : 'rounded-lg rounded-tr-none';
                        else roundedClass = isPrevSameSender ? 'rounded-lg' : 'rounded-lg rounded-tl-none';

                        return (
                            <React.Fragment key={msg._id || msg.id || index}>
                                {showDateHeader && (
                                    <div className="flex justify-center my-3 w-full">
                                        <span className={`px-3 py-1 rounded-lg text-[12px] font-medium shadow-sm uppercase tracking-wide ${isLight ? 'bg-white text-gray-500' : 'bg-[#111B21] text-[#8696A0]'}`}>
                                            {currentDateHeader}
                                        </span>
                                    </div>
                                )}

                                <div className={`flex flex-col max-w-[85%] md:max-w-[65%] ${isMe ? 'self-end items-end' : 'self-start items-start'} ${isPrevSameSender ? 'mt-[2px]' : 'mt-2'}`}>
                                    
                                    <div className={`relative group px-2 py-1 shadow-sm ${roundedClass} ${isMe ? currentTheme.bubbleMe : currentTheme.bubbleThem}`}>
                                        
                                        {/* Reply Button Hover */}
                                        <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 ${isMe ? '-left-8' : '-right-8'}`}>
                                            <button onClick={() => setReplyingTo(msg)} className={`p-1.5 rounded-full shadow-md ${isLight ? 'bg-white text-gray-600 hover:bg-gray-100' : 'bg-[#202C33] text-gray-300 hover:text-white'}`}><Reply size={14} /></button>
                                        </div>

                                        {isMe && senderLabel && (
                                            <div className="text-[11px] font-bold text-emerald-500 mb-0.5 ml-1">{senderLabel}</div>
                                        )}

                                        {msg.replyContext && (
                                            <div className={`mb-1 mx-0.5 mt-0.5 p-2 rounded-md border-l-4 opacity-90 text-[12px] flex flex-col ${isLight ? 'bg-black/5 text-gray-700 border-emerald-500' : 'bg-black/20 text-gray-300 border-emerald-500'}`}>
                                                <span className={`line-clamp-2 break-words`}>{msg.replyContext}</span>
                                            </div>
                                        )}

                                        {mediaUrl ? (
                                            <div className="rounded-md overflow-hidden w-full relative bg-transparent mt-1">
                                                {mediaUrl.match(/\.(jpeg|jpg|gif|png)$/i) || mediaUrl.includes('image/upload') ? 
                                                    <img src={mediaUrl} className="w-full h-auto max-h-[300px] object-cover cursor-pointer rounded-md" onClick={() => window.open(mediaUrl, '_blank')} alt=""/> :
                                                 mediaUrl.match(/\.(mp4|webm|ogg)$/i) || mediaUrl.includes('video/upload') ? 
                                                    <video controls src={mediaUrl} className="w-full max-h-[300px] bg-black rounded-md" /> :
                                                 mediaUrl.match(/\.(pdf|doc|docx)$/i) ? 
                                                    <a href={mediaUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-2 p-3 transition rounded-md ${isLight ? 'bg-black/5' : 'bg-black/20'}`}><FileText size={24}/><span className="text-sm font-bold truncate">Document</span><Download size={16}/></a> :
                                                    <div className={`flex items-center gap-2 p-2 rounded-md ${isLight ? 'bg-black/5' : 'bg-black/20'}`}><Play size={18}/><audio controls src={mediaUrl} className="w-full h-8" /></div>
                                                }
                                                {msgText && (
                                                    <div className="px-1 pt-2 pb-0.5">
                                                        <span className={`whitespace-pre-wrap leading-relaxed text-[14.5px]`} style={{ wordBreak: 'break-word' }}>{msgText}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            msgText && <div className="px-1 py-0.5">
                                                <span className={`whitespace-pre-wrap leading-relaxed text-[14.5px]`} style={{ wordBreak: 'break-word' }}>{msgText}</span>
                                            </div>
                                        )}
                                        
                                        {/* Time and Ticks */}
                                        <div className={`text-[10px] float-right mt-1 ml-3 flex gap-1 items-center ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            {isMe && <CheckCheck size={14} className={msg.status === 'read' ? 'text-blue-500' : ''}/>}
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    });
                })()}
                <div ref={scrollRef} style={{ float:"left", clear: "both" }} />
            </div>

            {/* Input Area */}
            <div className={`${currentTheme.header} py-2 px-4 z-20 flex items-center gap-3 transition-colors h-[62px]`}>
                {/* ... (Keep your Quick Reply, Templates, and File Upload logic exactly as it is, just update the styling to match currentTheme.icon and currentTheme.inputBg) */}
                <button onClick={() => setShowQRModal(true)} className={`p-2 transition hover:bg-black/5 rounded-full ${currentTheme.icon}`}><Zap size={22}/></button>
                <label className={`p-2 cursor-pointer transition hover:bg-black/5 rounded-full ${currentTheme.icon}`}>
                    <Paperclip size={22}/><input type="file" className="hidden" onChange={(e) => handleFileUpload(e, false)}/>
                </label>
                
                <div className={`flex-1 flex items-center px-4 py-2 rounded-lg ${currentTheme.inputBg}`}>
                    <input 
                        type="text"
                        placeholder="Type a message..." 
                        className={`w-full bg-transparent outline-none text-[15px] ${currentTheme.text}`} 
                        value={newMessage} 
                        onChange={handleTyping} 
                        onKeyDown={(e) => { if(e.key === 'Enter') handleSendMessage(e); }} 
                        disabled={uploading || sending}
                    />
                </div>

                {newMessage.trim() || mediaPreview ? (
                    <button onClick={handleSendMessage} disabled={sending || uploading} className="p-2.5 bg-emerald-500 rounded-full text-white shadow-sm hover:bg-emerald-600 transition">
                        {sending ? <Loader className="animate-spin" size={20}/> : <Send size={20}/>}
                    </button>
                ) : (
                    <button onClick={startRecording} className={`p-2 transition hover:bg-black/5 rounded-full ${currentTheme.icon}`}>
                        <Mic size={22} />
                    </button>
                )}
            </div>
            
            {/* ... (Keep your Modals for Quick Reply and Media Preview here) ... */}
        </div>
    );
};

export default ChatArea;