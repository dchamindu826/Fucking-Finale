import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { MessageSquare, Bot, Key, UploadCloud, Trash2, PlusCircle, Server, Save, FileText, Archive, Users, Power, Loader2, Globe } from 'lucide-react';

export default function CrmManagement() {
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [activeTab, setActiveTab] = useState('FREE_SEMINAR'); // FREE_SEMINAR or AFTER_SEMINAR
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // API Setup & Bot State
    const [metaKey, setMetaKey] = useState('');
    const [waId, setWaId] = useState('');
    const [waNumId, setWaNumId] = useState('');
    const [geminiKeys, setGeminiKeys] = useState(['', '', '', '', '']);
    const [botMode, setBotMode] = useState('OFF'); // OFF, AI_ONLY, AUTO_REPLY_ONLY, BOTH
    const [allocatedBatch, setAllocatedBatch] = useState('');

    // Auto Reply State
    const [replies, setReplies] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [stepOrder, setStepOrder] = useState(1);
    const [attachment, setAttachment] = useState(null);

    // Knowledge Base State
    const [pdfFile, setPdfFile] = useState(null);

    useEffect(() => {
        fetchBusinesses();
    }, []);

    useEffect(() => {
        if (selectedBusiness) {
            fetchBatches();
            fetchSettings();
            fetchReplies();
        }
    }, [selectedBusiness, activeTab]);

    const fetchBusinesses = async () => {
        try {
            const res = await axios.get('/admin/businesses');
            setBusinesses(res.data);
            if(res.data.length > 0) setSelectedBusiness(res.data[0].id.toString());
        } catch (error) { toast.error("Failed to load businesses"); }
    };

    const fetchBatches = async () => {
        try {
            const res = await axios.get(`/admin/batches/${selectedBusiness}`);
            setBatches(res.data.batches || res.data || []);
        } catch (error) { console.error("Batches load error"); }
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/admin/crm/settings/${selectedBusiness}/${activeTab}`);
            if (res.data && res.data.id) {
                setMetaKey(res.data.metaApiKey || '');
                setWaId(res.data.waId || '');
                setWaNumId(res.data.waNumId || '');
                setGeminiKeys(res.data.geminiKeys || ['', '', '', '', '']);
                setBotMode(res.data.botMode || 'OFF');
                setAllocatedBatch(res.data.batchId || '');
            } else {
                resetSettingsState();
            }
        } catch (error) { 
            console.error("Settings load error", error); 
            resetSettingsState();
        } finally {
            setLoading(false);
        }
    };

    const resetSettingsState = () => {
        setMetaKey(''); setWaId(''); setWaNumId(''); 
        setGeminiKeys(['', '', '', '', '']); setBotMode('OFF'); setAllocatedBatch('');
    };

    const saveSettings = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.post('/admin/crm/settings', {
                businessId: selectedBusiness,
                campaignType: activeTab,
                metaApiKey: metaKey, 
                waId, 
                waNumId, 
                geminiKeys, 
                botMode, 
                batchId: activeTab === 'FREE_SEMINAR' ? allocatedBatch : null // After Seminar එකේදි Batch එක Null කරනවා
            });
            toast.success(`${activeTab.replace('_', ' ')} Settings Saved Successfully!`);
            fetchSettings(); // Refresh to confirm save
        } catch (error) { 
            toast.error("Failed to save. Did you push Prisma DB?"); 
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const fetchReplies = async () => {
        try {
            const res = await axios.get(`/admin/crm/auto-reply?businessId=${selectedBusiness}&campaignType=${activeTab}`);
            setReplies(res.data);
            setStepOrder(res.data.length + 1); 
        } catch (error) { console.error("Failed to load replies"); }
    };

    const handleAddReply = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        // 🔥 FIX: Ensure businessId is correctly passed
        formData.append('businessId', selectedBusiness);
        formData.append('campaignType', activeTab);
        formData.append('stepOrder', stepOrder);
        formData.append('message', newMessage);
        if (attachment) formData.append('attachment', attachment);

        try {
            // 🔥 URL eke API endpoint eka harida kiyala aniwaren balanna
            await axios.post('/admin/crm/auto-reply', formData);
            toast.success("Auto Reply Step Added!");
            setNewMessage(''); setAttachment(null);
            fetchReplies();
        } catch (error) { toast.error("Failed to add reply"); }
    };

    const deleteReply = async (id) => {
        if(!window.confirm("Delete this auto reply?")) return;
        try {
            await axios.delete(`/admin/crm/auto-reply/${id}`);
            toast.success("Deleted!");
            fetchReplies();
        } catch (error) { toast.error("Failed to delete"); }
    };

    const handleUploadPDF = async (e) => {
        e.preventDefault();
        if(!pdfFile) return toast.error("Select a PDF file");
        const fd = new FormData();
        fd.append('businessId', selectedBusiness);
        fd.append('pdfFile', pdfFile);
        try {
            await axios.post('/admin/crm/knowledge-base', fd);
            toast.success("Knowledge Base Updated! AI is trained.");
            setPdfFile(null);
        } catch (error) { toast.error("Failed to upload PDF"); }
    };

    const handleArchive = async () => {
        if(!window.confirm(`Are you sure you want to ARCHIVE the ${activeTab.replace('_', ' ')} campaign for the current batch?`)) return;
        try {
            await axios.post('/admin/crm/archive', { businessId: selectedBusiness, campaignType: activeTab, batchId: allocatedBatch });
            toast.success("Campaign Archived Successfully!");
            fetchSettings();
        } catch (error) { toast.error("Archive Failed"); }
    };

    return (
        <div className="w-full animate-fade-in text-slate-200 pb-10">
            <div className="flex items-center gap-4 mb-8 bg-slate-800/40 p-6 rounded-3xl border border-white/10 shadow-lg backdrop-blur-xl">
                <Server className="text-emerald-500" size={32}/>
                <div>
                    <h2 className="text-3xl font-bold text-white">CRM & AI Campaigns</h2>
                    <p className="text-slate-400 text-sm">Manage WhatsApp APIs, Auto Replies, and AI Knowledge Base per campaign.</p>
                </div>
            </div>

            {/* Business Selector */}
            <div className="mb-6 bg-black/20 p-5 rounded-2xl border border-white/5 flex items-center gap-4">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest shrink-0">Select Business:</label>
                <select value={selectedBusiness} onChange={e => setSelectedBusiness(e.target.value)} className="flex-1 max-w-sm bg-slate-900 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500 font-bold">
                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>

            {/* Campaign Tabs */}
            <div className="flex gap-3 mb-6 border-b border-white/10 pb-4">
                <button onClick={() => setActiveTab('FREE_SEMINAR')} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'FREE_SEMINAR' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                    <MessageSquare size={18}/> Free Seminar Setup
                </button>
                <button onClick={() => setActiveTab('AFTER_SEMINAR')} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'AFTER_SEMINAR' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                    <Globe size={18}/> After Seminar (Global Help)
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-500" size={40}/></div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    
                    {/* LEFT COLUMN: Settings & AI Config */}
                    <div className="space-y-6">
                        
                        {/* 🔥 Conditional Batch Allocation 🔥 */}
                        {activeTab === 'FREE_SEMINAR' ? (
                            <div className="bg-slate-800/40 p-6 rounded-3xl border border-emerald-500/20">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Users className="text-emerald-400"/> Allocate Batch</h3>
                                    {allocatedBatch && (
                                        <button onClick={handleArchive} className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 border border-red-500/30">
                                            <Archive size={14}/> Archive Campaign
                                        </button>
                                    )}
                                </div>
                                <select value={allocatedBatch} onChange={e => setAllocatedBatch(e.target.value)} className="w-full bg-black/30 border border-emerald-500/30 rounded-xl p-3 text-white outline-none focus:border-emerald-500">
                                    <option value="">-- Unassigned (Select a Batch) --</option>
                                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                                <p className="text-xs text-slate-500 mt-2">Select which specific batch this Free Seminar is targeted at.</p>
                            </div>
                        ) : (
                            <div className="bg-blue-900/10 p-6 rounded-3xl border border-blue-500/20">
                                <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2"><Globe size={20}/> Global Help Center</h3>
                                <p className="text-sm text-blue-300/80 mt-2">This channel handles general inquiries for the entire business. No specific batch allocation is required.</p>
                            </div>
                        )}

                        {/* API Keys */}
                        <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/10">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Key className="text-emerald-400"/> WhatsApp API Config</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Meta API Key</label>
                                    <input type="text" value={metaKey} onChange={e=>setMetaKey(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">WhatsApp ID</label>
                                        <input type="text" value={waId} onChange={e=>setWaId(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Phone Num ID</label>
                                        <input type="text" value={waNumId} onChange={e=>setWaNumId(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bot Mode & AI Keys */}
                        <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/10">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Bot className="text-purple-400"/> AI & Bot Mode</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                {['OFF', 'AI_ONLY', 'AUTO_REPLY_ONLY', 'BOTH'].map(mode => (
                                    <button key={mode} onClick={(e) => { e.preventDefault(); setBotMode(mode); }} className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${botMode === mode ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/30'}`}>
                                        <Power size={18} className={botMode === mode ? 'text-purple-400' : 'text-slate-500'}/>
                                        {mode.replace('_ONLY', '').replace('_', ' ')}
                                    </button>
                                ))}
                            </div>

                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Gemini API Keys (Load Balancer)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                {geminiKeys.map((key, idx) => (
                                    <input key={idx} type="text" value={key} onChange={e => {
                                        const newKeys = [...geminiKeys]; newKeys[idx] = e.target.value; setGeminiKeys(newKeys);
                                    }} className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-white text-sm" placeholder={`Key ${idx + 1}`} />
                                ))}
                            </div>

                            <button onClick={saveSettings} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-70">
                                {saving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                                Save {activeTab.replace('_', ' ')} Configs
                            </button>
                        </div>

                        {/* AI PDF Upload */}
                        <div className="bg-purple-900/10 border border-purple-500/20 p-6 rounded-3xl">
                            <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2"><FileText size={20}/> Train AI Agent (PDF)</h3>
                            <p className="text-xs text-purple-300/60 mb-4">Upload Course outlines, time tables, or FAQs to make the AI smarter.</p>
                            <form onSubmit={handleUploadPDF} className="flex gap-3">
                                <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0])} required className="flex-1 bg-black/40 border border-purple-500/30 rounded-xl p-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-300" />
                                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg"><UploadCloud size={18}/></button>
                            </form>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Auto Reply Flow */}
                    <div className="space-y-6">
                        <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/10">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><PlusCircle className="text-emerald-400"/> Build Auto-Reply Sequence</h3>
                            <form onSubmit={handleAddReply} className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="w-24 shrink-0">
                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Step #</label>
                                        <input type="number" min="1" value={stepOrder} onChange={e=>setStepOrder(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-center font-bold" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Attachment</label>
                                        <input type="file" onChange={e => setAttachment(e.target.files[0])} className="w-full bg-black/30 border border-white/10 rounded-xl p-2 text-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-500/20 file:text-emerald-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Message Text</label>
                                    <textarea rows="4" value={newMessage} onChange={e=>setNewMessage(e.target.value)} required className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-emerald-500 custom-scrollbar" placeholder="Type message..."></textarea>
                                </div>
                                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                                    <PlusCircle size={18}/> Add Step
                                </button>
                            </form>
                        </div>

                        {/* Sequence Preview */}
                        <div className="bg-black/20 p-6 rounded-3xl border border-white/5">
                            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Active Sequence</h3>
                            <div className="space-y-4 relative">
                                {replies.length === 0 ? (
                                    <p className="text-slate-500 text-sm italic text-center py-10">No replies configured.</p>
                                ) : replies.map((reply, idx) => (
                                    <div key={reply.id} className="relative bg-white/5 border border-white/10 p-5 rounded-2xl flex items-start gap-4 group hover:border-white/20 transition-all z-10">
                                        <div className="w-10 h-10 shrink-0 bg-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-xl font-black text-lg border border-emerald-500/20">
                                            {reply.stepOrder}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-200 whitespace-pre-wrap text-sm mb-2">{reply.message}</p>
                                            {reply.attachment && (
                                                <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg border border-blue-500/20 inline-flex items-center gap-1.5">
                                                    <FileText size={12}/> {reply.attachmentType} Attached
                                                </span>
                                            )}
                                        </div>
                                        <button onClick={() => deleteReply(reply.id)} className="text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white p-2.5 rounded-xl transition-colors">
                                            <Trash2 size={18}/>
                                        </button>
                                        
                                        {/* Connector Line */}
                                        {idx !== replies.length - 1 && (
                                            <div className="absolute left-[39px] top-14 bottom-[-20px] w-0.5 bg-white/10 -z-10"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}