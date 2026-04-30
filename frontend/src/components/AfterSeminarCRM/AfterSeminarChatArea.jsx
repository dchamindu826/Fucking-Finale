import React, { useState, useEffect, useRef } from 'react';
import axios from '../../api/axios';
import { FaPaperPlane, FaPaperclip, FaSun, FaMoon, FaMicrophone, FaReply, FaTimes, FaImage, FaFilePdf, FaBolt, FaMagic, FaVideo, FaMusic, FaSmile, FaStop } from 'react-icons/fa';
import toast from 'react-hot-toast';

const BACKEND_URL = axios.defaults.baseURL ? axios.defaults.baseURL.replace('/api', '') : 'https://imacampus.online'; 

const formatDateLabel = (dateString) => {
    const msgDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) return 'Today';
    if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return msgDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function AfterSeminarChatArea({ selectedLead }) {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatTheme, setChatTheme] = useState('dark'); 
  const scrollRef = useRef(null);

  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  
  const [localReactions, setLocalReactions] = useState({});

  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState(() => JSON.parse(localStorage.getItem(`qr_${user.id}`)) || []);
  const [suggestedQRs, setSuggestedQRs] = useState([]);
  const [newQRName, setNewQRName] = useState('');
  const [newQRMsg, setNewQRMsg] = useState('');
  const [qrAttachmentBase64, setQrAttachmentBase64] = useState(null); 

  const [showMetaTemplates, setShowMetaTemplates] = useState(false);
  const [metaTemplates, setMetaTemplates] = useState([]);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef(null);
  const audioChunks = useRef([]);

  useEffect(() => { 
      if (selectedLead) {
          fetchMessages(); 
          fetchMetaTemplates();
          const interval = setInterval(() => { fetchMessages(false); }, 10000);
          return () => clearInterval(interval);
      }
  }, [selectedLead]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, localReactions]);

  const fetchMessages = async (showLoading = true) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/after-seminar-crm/messages/${selectedLead.id}`, {
          headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) { console.error(error); }
  };

  const fetchMetaTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/coordinator-crm/meta-templates', {
          headers: { Authorization: `Bearer ${token}` }
      });
      setMetaTemplates(res.data || []);
    } catch(e) {}
  };

  const handleQRFile = (e) => {
      const file = e.target.files[0];
      if(!file) return;
      if(file.size > 2 * 1024 * 1024) return toast.error("File too large for Quick Reply (Max 2MB)"); 
      const reader = new FileReader();
      reader.onloadend = () => { setQrAttachmentBase64(reader.result); };
      reader.readAsDataURL(file);
  };

  const handleReaction = async (msg, emoji) => {
      if (!msg.metaMessageId) return toast.error("Cannot react: This is an older message.");
      try {
          const token = localStorage.getItem('token');
          setLocalReactions(prev => ({ ...prev, [msg.id]: emoji }));
          await axios.post('/after-seminar-crm/messages/react', {
              leadId: selectedLead.id,
              metaMessageId: msg.metaMessageId,
              emoji: emoji
          }, {
              headers: { Authorization: `Bearer ${token}` }
          });
      } catch (error) {
          toast.error("Reaction failed!");
      }
  };

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          audioChunks.current = [];

          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) audioChunks.current.push(e.data);
          };

          recorder.onstop = () => {
              const audioBlob = new Blob(audioChunks.current, { type: 'audio/ogg; codecs=opus' });
              const audioFile = new File([audioBlob], `Voice_Note_${Date.now()}.ogg`, { type: 'audio/ogg' });
              setSelectedFile(audioFile); 
          };

          recorder.start();
          setMediaRecorder(recorder);
          setIsRecording(true);
          setRecordingDuration(0);

          timerRef.current = setInterval(() => {
              setRecordingDuration(prev => prev + 1);
          }, 1000);

      } catch (err) {
          toast.error("Microphone access denied or not available.");
      }
  };

  const stopRecording = () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
      clearInterval(timerRef.current);
      setIsRecording(false);
  };

  const handleSend = async (e, forcedText = null, forcedFileBase64 = null) => {
    if (e) e.preventDefault();
    const textToSend = forcedText || newMessage;
    if (!textToSend.trim() && !selectedFile && !forcedFileBase64) return;

    setIsSending(true);
    const targetLeadId = selectedLead.id; 

    try {
      const formData = new FormData();
      formData.append('leadId', targetLeadId);
      formData.append('senderName', user.firstName || 'Staff');
      
      const cleanMessage = textToSend.replace(/^\[Replying to: ".*?"\]\n\n/, '');
      formData.append('message', cleanMessage); 
      
      if (replyingTo) {
          if (replyingTo.metaMessageId) {
              formData.append('replyToMetaId', replyingTo.metaMessageId);
          }
          const quotedText = replyingTo.message ? replyingTo.message.replace(/\n/g, ' ').substring(0, 30) : 'Media Message';
          const uiMessage = `[Replying to: "${quotedText}..."]\n\n${cleanMessage}`;
          formData.append('localUIMessage', uiMessage); 
      } else {
          formData.append('localUIMessage', cleanMessage); 
      }

      if (selectedFile) {
          formData.append('media', selectedFile);
      } else if (forcedFileBase64) {
          const res = await fetch(forcedFileBase64);
          const blob = await res.blob();
          
          let mimeType = "image/jpeg";
          let ext = "jpeg";
          if (forcedFileBase64.startsWith("data:")) {
              mimeType = forcedFileBase64.split(";")[0].split(":")[1];
              ext = mimeType.split("/")[1] || "jpeg";
              if(ext === 'mpeg') ext = 'mp3';
              if(ext.includes('ogg')) ext = 'ogg';
          }
          
          const file = new File([blob], `qr_attach.${ext}`, { type: mimeType });
          formData.append('media', file);
      }

      const token = localStorage.getItem('token');
      const res = await axios.post('/after-seminar-crm/messages', formData, { 
          headers: { 
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${token}` 
          } 
      });
      
      if (selectedLead.id === targetLeadId) {
          setMessages([...messages, res.data]);
      }
      
      setNewMessage(''); setReplyingTo(null); setSelectedFile(null); setSuggestedQRs([]); setRecordingDuration(0);
    } catch (error) { toast.error("Failed to send message."); }
    setIsSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);
    if (val.startsWith('/')) {
        const keyword = val.substring(1).toLowerCase();
        setSuggestedQRs(quickReplies.filter(qr => qr.name.toLowerCase().includes(keyword)));
    } else setSuggestedQRs([]);
  };

  const applyQuickReply = (qr) => {
    if (qr.attachment) handleSend(null, qr.message, qr.attachment);
    else setNewMessage(qr.message);
    setSuggestedQRs([]);
  };

  const saveQuickReply = (e) => {
      e.preventDefault();
      if(!newQRName || (!newQRMsg && !qrAttachmentBase64)) return;
      const updated = [...quickReplies, { name: newQRName.replace('/',''), message: newQRMsg, attachment: qrAttachmentBase64 }];
      
      try {
          localStorage.setItem(`qr_${user.id}`, JSON.stringify(updated));
          setQuickReplies(updated); 
          setNewQRName(''); setNewQRMsg(''); setQrAttachmentBase64(null); 
          toast.success("Quick Reply Saved!");
      } catch (err) {
          toast.error("Storage full! Try a smaller audio/image file.");
      }
  };

  const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
  };

  const renderMedia = (msg) => {
      if (!msg.mediaUrl) return null;
      const url = msg.mediaUrl.startsWith('http') ? msg.mediaUrl : `${BACKEND_URL}${msg.mediaUrl}`; 
      
      if (msg.mediaType?.includes('webp') || msg.mediaUrl.endsWith('.webp')) {
          return <img src={url} alt="sticker" className="max-w-[130px] w-full bg-transparent drop-shadow-md mb-1" />;
      }
      if (msg.mediaType?.includes('image')) return <img src={url} alt="img" className="max-w-[300px] w-full rounded-lg mb-2 object-cover border border-black/10" />;
      if (msg.mediaType?.includes('video')) return <video src={url} controls className="max-w-[300px] w-full rounded-lg mb-2" />;
      
      if (msg.mediaType?.includes('audio') || msg.mediaUrl.endsWith('.mp3') || msg.mediaUrl.endsWith('.ogg')) {
          return (
             <div className="bg-black/20 p-2 rounded-xl mb-2 flex items-center shadow-inner min-w-[250px]">
                 <audio src={url} controls className="w-full h-10 custom-audio-player outline-none" />
             </div>
          );
      }
      
      if (msg.mediaType?.includes('pdf') || msg.mediaUrl.endsWith('.pdf')) 
          return <iframe src={url} className="w-[300px] h-[350px] rounded-lg mb-2 bg-white shadow-inner" title="PDF"></iframe>;
      
      return <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-black/10 rounded-lg mb-2 text-xs font-bold hover:underline"><FaFilePdf className="text-red-500 text-lg"/> View Document</a>;
  };
  
  // 🔥 FIX: Render message text properly without empty bubbles 🔥
  const renderMessageText = (msg) => {
      const text = msg?.message;
      if (!text) return null;

      // Hide auto-generated media labels ONLY IF the media URL actually exists
      if (msg.mediaUrl && ["IMAGE Message", "AUDIO Message", "VIDEO Message", "DOCUMENT Message"].includes(text)) {
          return null; 
      }

      let quotedText = null;
      let actualMessage = text;

      if (text.startsWith('[Replying to: "')) {
          const closingQuoteIdx = text.indexOf('"]\n\n');
          if (closingQuoteIdx !== -1) {
              quotedText = text.substring(15, closingQuoteIdx);
              actualMessage = text.substring(closingQuoteIdx + 4).trim();
          }
      }

      if (quotedText) {
          return (
              <div className="flex flex-col w-full min-w-[200px]">
                  <div className="bg-black/10 dark:bg-black/30 border-l-4 border-emerald-500 rounded p-2.5 mb-1.5 shadow-sm w-full relative overflow-hidden">
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block mb-0.5">Replying to</span>
                      <span className="text-[13px] text-slate-700 dark:text-slate-300 line-clamp-2 italic">{quotedText}</span>
                  </div>
                  <span className="whitespace-pre-wrap">{actualMessage}</span>
              </div>
          );
      }

      return <span className="whitespace-pre-wrap">{text}</span>;
  };

  const groupedMessages = messages.reduce((acc, msg) => {
      const dateLabel = formatDateLabel(msg.createdAt);
      if (!acc[dateLabel]) acc[dateLabel] = [];
      acc[dateLabel].push(msg);
      return acc;
  }, {});

  const isDark = chatTheme === 'dark';
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  return (
    <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden shrink-0 border border-white/5 shadow-lg ${isDark ? 'bg-[#0f172a]' : 'bg-[#e5ddd5]'}`}>
      
      {/* Header */}
      <div className={`p-4 flex justify-between items-center border-b z-20 ${isDark ? 'bg-[#1e293b] border-slate-700' : 'bg-[#f0f2f5] border-slate-300'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm">
            {selectedLead.name ? selectedLead.name.charAt(0).toUpperCase() : '#'}
          </div>
          <div>
            <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{selectedLead.name || selectedLead.phone}</h3>
            <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedLead.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => setShowMetaTemplates(true)} className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md ${isDark ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}><FaBolt/> Approved Templates</button>
            <button onClick={() => setChatTheme(isDark ? 'light' : 'dark')} className={`p-2.5 rounded-full transition-colors shadow-inner ${isDark ? 'bg-[#0f172a] text-yellow-500' : 'bg-white text-slate-600'}`}>
               {isDark ? <FaSun size={14}/> : <FaMoon size={14}/>}
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar relative ${isDark ? "bg-[#0b141a]" : "bg-[#efeae2]"}`} ref={scrollRef}>
        <div className="relative z-10 flex flex-col">
          {Object.keys(groupedMessages).map(dateLabel => (
             <React.Fragment key={dateLabel}>
                <div className="flex justify-center my-6">
                    <span className={`text-[10px] font-bold px-4 py-1.5 rounded-xl uppercase tracking-widest shadow-sm ${isDark ? 'bg-[#1e293b] text-slate-400 border border-slate-700' : 'bg-white text-slate-500 border border-slate-200'}`}>
                        {dateLabel}
                    </span>
                </div>

                {groupedMessages[dateLabel].map((msg, idx) => {
                    const isOutbound = msg.direction === 'outbound';
                    const isSticker = (msg.mediaUrl && msg.mediaUrl.endsWith('.webp')) || msg.mediaType?.includes('webp');
                    const currentReaction = localReactions[msg.id]; 

                    if (msg.message && msg.message.startsWith('[Reaction:') && msg.message.endsWith(']')) return null;

                    return (
                        <div key={idx} className={`flex flex-col mb-4 group w-full`}>
                            <div className={`flex items-center gap-2 ${isOutbound ? 'ml-auto justify-end' : 'mr-auto justify-start'} max-w-[95%]`}>
                                
                                {!isOutbound && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all items-center relative">
                                        <button onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)} className="p-1.5 text-slate-400 hover:text-yellow-500 bg-white/10 rounded-full transition-colors">
                                            <FaSmile size={12}/>
                                        </button>
                                        
                                        {activeReactionMsgId === msg.id && (
                                            <div className="absolute bottom-full left-0 mb-2 z-50 bg-[#1e293b] px-3 py-2 rounded-full shadow-2xl flex gap-2 border border-slate-600 animate-fade-in">
                                                {reactionEmojis.map(e => (
                                                    <button key={e} onClick={() => { handleReaction(msg, e); setActiveReactionMsgId(null); }} className="hover:scale-125 transition-transform text-base">
                                                        {e}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <button onClick={()=>setReplyingTo(msg)} className="p-1.5 text-slate-400 hover:text-blue-500 bg-white/10 rounded-full"><FaReply size={12}/></button>
                                    </div>
                                )}
                                
                                <div className="relative">
                                    <div onDoubleClick={() => setReplyingTo(msg)} className={`px-4 py-3 text-[15px] cursor-pointer ${
                                        isSticker ? 'bg-transparent shadow-none p-0' : 
                                        isOutbound 
                                            ? (isDark ? 'bg-[#005c4b] text-white rounded-2xl rounded-tr-none shadow-md' : 'bg-[#d9fdd3] text-slate-800 rounded-2xl rounded-tr-none shadow-md border border-[#d9fdd3]')
                                            : (isDark ? 'bg-[#1e293b] text-slate-200 rounded-2xl rounded-tl-none shadow-md border border-slate-700' : 'bg-white text-slate-800 rounded-2xl rounded-tl-none shadow-md border border-slate-200')
                                    }`}>
                                        
                                        {isOutbound && !isSticker && (
                                            <div className={`text-[10px] font-black mb-1.5 flex items-center justify-end gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                {msg.senderType === 'AI_BOT' ? '🤖 AI Bot' : msg.senderType === 'SYSTEM' ? '⚙️ Auto-Reply' : `👤 ${msg.senderName}`}
                                            </div>
                                        )}

                                        {renderMedia(msg)}
                                        
                                        {/* 🔥 FIX: Passed the full msg object instead of msg.message 🔥 */}
                                        {!isSticker && renderMessageText(msg)}

                                        {!isSticker && (
                                            <span className={`text-[10px] float-right mt-2 ml-6 font-medium ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {currentReaction && (
                                        <div className={`absolute -bottom-2 ${isOutbound ? 'left-2' : 'right-2'} bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-600 rounded-full px-1.5 shadow-md text-sm z-10`}>
                                            {currentReaction}
                                        </div>
                                    )}
                                </div>

                                {isOutbound && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all items-center">
                                        <button onClick={()=>setReplyingTo(msg)} className="p-1.5 text-slate-400 hover:text-blue-500 bg-white/10 rounded-full"><FaReply size={12}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
             </React.Fragment>
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className={`flex flex-col border-t z-20 ${isDark ? 'bg-[#1e293b] border-slate-700' : 'bg-[#f0f2f5] border-slate-300'}`}>
          {suggestedQRs.length > 0 && (
              <div className="bg-[#0f172a] border-t border-slate-700 p-3 flex gap-2 overflow-x-auto custom-scrollbar shadow-lg">
                  {suggestedQRs.map((qr, i) => (
                      <button key={i} onClick={() => applyQuickReply(qr)} className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                          /{qr.name} {qr.attachment && <FaPaperclip className="inline ml-1"/>}
                      </button>
                  ))}
              </div>
          )}

          {replyingTo && (
              <div className={`px-5 py-3 border-l-4 border-blue-500 flex justify-between items-center shadow-inner ${isDark ? 'bg-[#0f172a]' : 'bg-slate-200'}`}>
                  <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Replying to {replyingTo.direction === 'outbound' ? 'Yourself' : selectedLead.name}</p>
                      <p className={`text-[13px] truncate mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{replyingTo.message || 'Media Attachment'}</p>
                  </div>
                  <button onClick={()=>setReplyingTo(null)} className="text-slate-400 hover:text-red-500 p-2 bg-black/10 rounded-lg"><FaTimes size={14}/></button>
              </div>
          )}

          {selectedFile && (
              <div className={`px-5 py-4 flex items-center gap-4 border-b ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 shadow-md">
                      {selectedFile.type.includes('image') ? <FaImage size={24}/> : selectedFile.type.includes('video') ? <FaVideo size={24}/> : selectedFile.type.includes('audio') ? <FaMusic size={24}/> : <FaFilePdf size={24}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-emerald-500 truncate">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Add a caption below to send</p>
                  </div>
                  <button onClick={()=>setSelectedFile(null)} className="text-slate-400 hover:text-red-500 p-2.5 bg-red-500/10 rounded-xl transition-colors"><FaTimes size={16}/></button>
              </div>
          )}

          <div className="p-3.5 flex items-end gap-3">
            <button onClick={()=>setShowQuickReplies(true)} title="Manage Quick Replies" className={`p-3.5 rounded-xl transition-colors ${isDark ? 'text-blue-400 hover:bg-white/10' : 'text-blue-600 hover:bg-slate-200'}`}><FaMagic size={18}/></button>
            <label className={`cursor-pointer p-3.5 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-200'}`}>
                <FaPaperclip size={18}/>
                <input type="file" className="hidden" onChange={(e)=>setSelectedFile(e.target.files[0])}/>
            </label>
            
            {isRecording ? (
                <div className={`flex-1 flex items-center gap-4 px-5 py-3.5 rounded-2xl border border-red-500/50 bg-red-500/10`}>
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-400 font-bold text-sm flex-1">{formatTime(recordingDuration)}</span>
                    <button onClick={stopRecording} className="p-2 text-red-400 hover:text-white hover:bg-red-500 rounded-full transition-colors"><FaStop/></button>
                </div>
            ) : (
                <textarea value={newMessage} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Type a message or / for quick replies..." rows={Math.min(4, newMessage.split('\n').length)} className={`flex-1 px-5 py-3.5 rounded-2xl border focus:outline-none resize-none overflow-y-auto custom-scrollbar text-[15px] shadow-inner ${isDark ? 'bg-[#0f172a] text-white border-slate-700 focus:border-emerald-600 placeholder-slate-500' : 'bg-white text-slate-800 border-slate-300 focus:border-emerald-500 placeholder-slate-400'}`} />
            )}

            {!newMessage.trim() && !selectedFile ? (
                <button type="button" onClick={startRecording} className="p-4 bg-emerald-600/20 text-emerald-500 rounded-full hover:bg-emerald-600 hover:text-white transition-colors shadow-md"><FaMicrophone size={18}/></button>
            ) : (
                <button onClick={(e) => handleSend(e)} disabled={isSending} className="p-4 bg-emerald-600 text-white rounded-full hover:bg-emerald-500 transition-colors shadow-xl disabled:opacity-50"><FaPaperPlane size={18} className={isSending ? 'animate-pulse' : ''}/></button>
            )}
          </div>
      </div>

      {/* QUICK REPLIES MODAL */}
      {showQuickReplies && (
         <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaMagic className="text-blue-500"/> Manage Quick Replies</h3>
                     <button onClick={()=>setShowQuickReplies(false)} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-lg"><FaTimes/></button>
                 </div>
                 
                 <form onSubmit={saveQuickReply} className="bg-[#0f172a] p-4 rounded-2xl border border-slate-700 mb-6">
                    <input type="text" value={newQRName} onChange={e=>setNewQRName(e.target.value)} placeholder="Shortcut Title (e.g. hello)" required className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-xl p-3 mb-3 text-sm outline-none focus:border-blue-500" />
                    <textarea value={newQRMsg} onChange={e=>setNewQRMsg(e.target.value)} placeholder="Message Content / Caption..." rows="2" className="w-full bg-[#1e293b] border border-slate-700 text-white rounded-xl p-3 mb-3 text-sm outline-none focus:border-blue-500 custom-scrollbar"></textarea>
                    
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-400 mb-2">Attachment (Image/Audio/Doc - Max 2MB)</label>
                        <input type="file" accept="image/*,audio/*,video/*,application/pdf" onChange={handleQRFile} className="w-full text-slate-400 text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-900 file:text-blue-400" />
                        {qrAttachmentBase64 && <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1"><FaPaperclip/> File Attached</div>}
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg">Save Quick Reply</button>
                 </form>

                 <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                     {quickReplies.map((qr, i) => (
                         <div key={i} className="bg-[#0f172a] p-4 rounded-2xl border border-slate-700 flex justify-between items-start gap-4">
                             <div className="flex-1 min-w-0">
                                <span className="inline-block bg-blue-500/20 text-blue-400 font-black text-[10px] px-2 py-1 rounded-lg mb-2">/{qr.name}</span>
                                {qr.attachment && <div className="text-emerald-400 text-[10px] font-bold mb-1 flex items-center gap-1"><FaPaperclip/> Has Attachment</div>}
                                <p className="text-slate-300 text-sm whitespace-pre-wrap">{qr.message}</p>
                             </div>
                             <button onClick={()=>{
                                 const updated = quickReplies.filter((_, idx)=> idx !== i);
                                 setQuickReplies(updated); localStorage.setItem(`qr_${user.id}`, JSON.stringify(updated));
                             }} className="text-red-400 hover:text-red-300 text-xs font-bold bg-red-500/10 px-3 py-1.5 rounded-lg">Delete</button>
                         </div>
                     ))}
                 </div>
             </div>
         </div>
      )}

      {/* META TEMPLATES MODAL */}
      {showMetaTemplates && (
         <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-6 w-full max-w-lg shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaBolt className="text-yellow-500"/> Meta Approved Templates</h3>
                     <button onClick={()=>setShowMetaTemplates(false)} className="text-slate-500 hover:text-white bg-white/5 p-2 rounded-lg"><FaTimes/></button>
                 </div>
                 <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                     {metaTemplates.length === 0 ? (
                         <div className="text-center py-10 text-slate-500 text-sm">No templates configured in Meta API yet.</div>
                     ) : (
                        metaTemplates.map((tpl, i) => (
                            <div key={i} className="bg-[#0f172a] p-4 rounded-2xl border border-slate-700">
                                <h4 className="text-emerald-400 font-bold text-sm mb-2">{tpl.name}</h4>
                                <p className="text-slate-300 text-sm mb-4">{tpl.text}</p>
                                <button onClick={() => { handleSend(null, tpl.text); setShowMetaTemplates(false); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2">
                                    <FaPaperPlane/> Send Template
                                </button>
                            </div>
                        ))
                     )}
                 </div>
             </div>
         </div>
      )}

    </div>
  );
}