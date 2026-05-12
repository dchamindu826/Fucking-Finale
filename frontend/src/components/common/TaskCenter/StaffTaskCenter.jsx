import React, { useState, useEffect } from 'react';
import { 
    CheckSquare, Clock, Play, Lock, CheckCircle2, 
    FileText, Video, X, BookOpen, AlertTriangle, Plus, Check, Search, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

export default function StaffTaskCenter({ loggedInUser }) {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('my_tasks');
    const [tasks, setTasks] = useState([]);
    
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showContentModal, setShowContentModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    useEffect(() => { fetchTasks(); }, [activeTab]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            let url = `/admin/tasks?assignedTo=${loggedInUser.id}&role=COORDINATOR&`;
            if (activeTab === 'my_tasks') url += `status=PENDING&`;
            else if (activeTab === 'in_progress') url += `status=IN_PROGRESS&`;
            else if (activeTab === 'completed') url += `status=COMPLETED&`;

            const res = await api.get(url);
            const sorted = (res.data || []).sort((a,b) => {
                if(!a.deadline) return 1; if(!b.deadline) return -1;
                return new Date(a.deadline) - new Date(b.deadline);
            });
            setTasks(sorted);
        } catch (e) { toast.error("Failed to load tasks"); } finally { setLoading(false); }
    };

    const handleRequestUnlock = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/tasks/request-unlock', { taskId: selectedTask.id, reason: new FormData(e.target).get('reason') });
            toast.success("Unlock request sent to manager!");
            setSelectedTask(null); setShowUnlockModal(false); fetchTasks();
        } catch (e) { toast.error("Failed to request unlock"); }
    };

    const getTaskDetails = (task) => {
        if (task.taskType === 'CUSTOM') return { icon: CheckSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: task.customTitle || 'Custom Task' };
        switch(task.taskType) {
            case 'LIVE_LINK': return { icon: Play, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Upload Live Link' };
            case 'RECORDING': return { icon: Video, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Upload Recording' };
            case 'NOTES': return { icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Upload PDF Notes' };
            case 'MCQ': return { icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', label: 'Upload MCQ Paper' };
            case 'STRUCTURED_PAPER': return { icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Upload Structured Paper' };
            default: return { icon: CheckSquare, color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700', label: task.taskType.replace('_', ' ') };
        }
    };

    const formatTimeOnly = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const formatDateOnly = (dateString) => {
        if (!dateString) return 'No Deadline';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="w-full min-h-screen text-slate-300 font-sans pb-10 bg-[#0a0f1c] animate-in fade-in duration-300">
            
            {/* Header */}
            <div className="mb-8 bg-[#131b2c] border border-slate-800 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                        <CheckSquare size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-wide">My Work Space</h2>
                        <p className="text-slate-400 text-sm mt-1">Execute your assigned tasks efficiently</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto bg-[#0a0f1c] p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
                    <button onClick={() => setActiveTab('in_progress')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${activeTab === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800'}`}>In Progress</button>
                    <button onClick={() => setActiveTab('my_tasks')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${activeTab === 'my_tasks' ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800'}`}>Action Required</button>
                    <button onClick={() => setActiveTab('completed')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${activeTab === 'completed' ? 'bg-emerald-600 text-white' : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800'}`}>Completed</button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {loading ? (
                    <div className="text-center py-20 text-slate-500 font-medium text-sm flex flex-col items-center">
                        <Clock size={24} className="animate-pulse mb-2 text-indigo-400"/> Loading Timeline...
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="bg-[#131b2c] border border-slate-800 p-12 rounded-2xl text-center flex flex-col items-center justify-center mt-6">
                        <div className="bg-slate-800/50 p-5 rounded-full mb-5 text-emerald-500"><CheckCircle2 size={40} /></div>
                        <h3 className="text-lg font-semibold text-white mb-1">Timeline Clear!</h3>
                        <p className="text-slate-400 text-sm">You have no tasks pending in this status.</p>
                    </div>
                ) : (
                    <div className="relative border-l border-slate-700/60 ml-4 md:ml-10 space-y-8 pb-10 pt-4">
                        {tasks.map((task) => {
                            const details = getTaskDetails(task);
                            const TaskIcon = details.icon;
                            const isMainTaskWithSubs = task.subTasks && task.subTasks.length > 0;

                            return (
                                <div key={task.id} className="relative pl-8 md:pl-10 group">
                                    
                                    {/* TIMELINE DOT */}
                                    <div className={`absolute -left-[7px] top-6 w-3.5 h-3.5 rounded-full border-2 border-[#0a0f1c] z-10 transition-colors ${task.status === 'COMPLETED' ? 'bg-emerald-500' : task.isOverdue ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>

                                    {/* TIME BADGE */}
                                    <div className="mb-2.5 pl-1 flex items-center gap-3">
                                        <span className={`text-lg font-bold ${task.isOverdue && task.status !== 'COMPLETED' ? 'text-red-400' : 'text-slate-200'}`}>{formatTimeOnly(task.deadline)}</span>
                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{formatDateOnly(task.deadline)}</span>
                                    </div>

                                    {/* TASK CARD */}
                                    <div className={`bg-[#131b2c] border p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 hover:shadow-md ${task.isOverdue && task.status !== 'COMPLETED' ? 'border-red-500/40 hover:border-red-500/60' : 'border-slate-800 hover:border-slate-700'}`}>
                                        
                                        <div className="flex items-start gap-4 flex-1 min-w-0 w-full">
                                            <div className={`p-3 rounded-xl ${details.bg} border ${details.border} shrink-0`}>
                                                <TaskIcon className={details.color} size={22} />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 pt-1">
                                                <h4 className="text-base font-semibold text-slate-100 mb-1 leading-tight">{details.label}</h4>
                                                {task.taskType !== 'CUSTOM' ? (
                                                    <p className="text-sm text-indigo-400 font-medium truncate mb-2">{task.timetable?.subjectName} - {task.timetable?.title}</p>
                                                ) : (
                                                    <p className="text-sm text-slate-400 mb-2 line-clamp-2">{task.customDesc}</p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-500">
                                                    <span className="bg-[#0a0f1c] px-2 py-1 rounded border border-slate-800 flex items-center gap-1.5"><Building2 size={12} className="text-slate-400"/> {task.business?.name}</span>
                                                    <span className="bg-[#0a0f1c] px-2 py-1 rounded border border-slate-800 flex items-center gap-1.5"><BookOpen size={12} className="text-slate-400"/> {task.batch?.name}</span>
                                                </div>

                                                {isMainTaskWithSubs && (
                                                    <div className="mt-4 bg-[#0a0f1c] rounded-xl p-3 border border-slate-800 space-y-1.5">
                                                        <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Checklist</p>
                                                        {task.subTasks.map(sub => (
                                                            <div key={sub.id} className="flex justify-between items-center bg-[#131b2c] p-2 rounded-lg text-xs border border-slate-800/50">
                                                                <span className={sub.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-300'}>{sub.customTitle}</span>
                                                                {sub.status === 'COMPLETED' ? <CheckCircle2 size={14} className="text-emerald-500"/> : <div className="w-3 h-3 rounded-full border border-slate-600"></div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-full md:w-auto shrink-0 flex flex-col gap-2">
                                            {(activeTab === 'my_tasks' || activeTab === 'in_progress') && (
                                                task.status === 'LOCKED' || task.isOverdue ? (
                                                    <button onClick={() => { setSelectedTask(task); setShowUnlockModal(true); }} className="w-full md:w-40 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm">
                                                        <Lock size={16} /> Request Unlock
                                                    </button>
                                                ) : (
                                                    <button onClick={() => { setSelectedTask(task); setShowContentModal(true); }} className="w-full md:w-40 bg-blue-600 hover:bg-blue-500 text-white py-2.5 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                                                        <Play size={16} /> Execute Task
                                                    </button>
                                                )
                                            )}
                                            {task.status === 'COMPLETED' && (
                                                <div className="w-full md:w-40 bg-emerald-500/10 text-emerald-400 py-2.5 font-medium rounded-xl flex items-center justify-center gap-2 border border-emerald-500/20 text-sm">
                                                    <CheckCircle2 size={16} /> Completed
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Request Unlock Modal */}
            {showUnlockModal && selectedTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#131b2c] border border-slate-800 rounded-2xl p-6 md:p-8 w-full max-w-sm shadow-xl relative">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2"><Lock className="text-red-400" size={18}/> Task Locked</h3>
                            <button onClick={() => setShowUnlockModal(false)} className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-lg transition-colors"><X size={18}/></button>
                        </div>
                        <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                            This task is overdue and locked. You must submit a request to your manager to unlock it.
                        </p>
                        <form onSubmit={handleRequestUnlock}>
                            <label className="text-xs font-semibold text-slate-400 mb-2 block">Reason for Delay *</label>
                            <textarea name="reason" required rows="3" placeholder="Explain why the task was delayed..." className="w-full bg-[#0a0f1c] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-red-500 mb-5 transition-colors resize-none"></textarea>
                            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                                <AlertTriangle size={16}/> Send Request
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Execution Modal */}
            {showContentModal && selectedTask && (
                <TaskExecutionModal task={selectedTask} onClose={() => setShowContentModal(false)} onComplete={() => { setShowContentModal(false); fetchTasks(); }} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// CONTENT HUB EXECUTION MODAL 
// ---------------------------------------------------------------------------
const TaskExecutionModal = ({ task, onClose, onComplete }) => {
    const [submitting, setSubmitting] = useState(false);
    const isCustom = task.taskType === 'CUSTOM';
    
    const [batches, setBatches] = useState([]);
    const [lessonGroups, setLessonGroups] = useState([]);
    const [massAssignSubjects, setMassAssignSubjects] = useState([]);
    const [selectedBatchesForContent, setSelectedBatchesForContent] = useState([]);
    const [activeCourseCode, setActiveCourseCode] = useState(null); 

    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFolder, setSelectedFolder] = useState('');

    const typeMap = { 'LIVE_LINK': 'live', 'RECORDING': 'recording', 'NOTES': 'document', 'MCQ': 'paper', 'STRUCTURED_PAPER': 'sPaper' };
    const contentType = isCustom ? '' : typeMap[task.taskType];

    useEffect(() => { if (!isCustom) fetchHubData(); }, [task]);

    const fetchHubData = async () => {
        try {
            const res = await api.get(`/admin/batches/${task.businessId}`);
            const fetchedBatches = res.data.batches || res.data || [];
            setBatches(fetchedBatches);
            if (task.batchId) setSelectedBatchesForContent([task.batchId]);

            if (task.batchId) {
                const lgRes = await api.get(`/admin/manager/get-contents?batchId=${task.batchId}&courseCode=null&courseId=0`);
                setLessonGroups(lgRes.data?.lessonGroups || []);
            }

            if (task.timetable?.subjectName && task.batchId) {
                const batchData = fetchedBatches.find(b => b.id === task.batchId);
                if (batchData) {
                    let foundCode = null;
                    batchData.groups?.forEach(g => {
                        g.courses?.forEach(c => {
                            if (c.name === task.timetable.subjectName) {
                                setMassAssignSubjects(prev => [...new Set([...prev, c.id])]);
                                foundCode = c.code || `SUB_${c.id}`;
                            }
                        });
                    });
                    if (foundCode) setActiveCourseCode(foundCode); 
                }
            }
        } catch (e) { console.error("Error loading hub data", e); }
    };

    const getTypeInt = (typeStr) => {
        switch (typeStr) {
            case 'live': return 1; case 'recording': return 2; case 'document': return 3; case 'sPaper': return 4; case 'paper': return 5;
            default: return 1;
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const payload = { 
                title: newFolderName, 
                type: getTypeInt(contentType), 
                order: 1, 
                batch_id: task.batchId, 
                course_code: activeCourseCode 
            };
            const res = await api.post('/admin/manager/content-group/add', payload);
            toast.success("Folder Created!");
            
            const newFolder = res.data?.data;
            if(newFolder) {
                setLessonGroups([...lessonGroups, newFolder]);
                setSelectedFolder(newFolder.id);
            }
            setIsCreatingFolder(false);
            setNewFolderName('');
        } catch (e) { toast.error("Failed to create folder"); }
    };

    const toggleMassAssignSubject = (subId) => setMassAssignSubjects(prev => prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.target);
        
        try {
            if (isCustom) {
                formData.append('taskId', task.id);
                await api.post('/admin/tasks/complete-custom', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
            } else {
                if (massAssignSubjects.length === 0) {
                    toast.error("Please select at least one subject to assign this content!");
                    setSubmitting(false); return;
                }
                
                formData.set('type', contentType);
                formData.set('batch_id', task.batchId);
                formData.set('contentGroupId', selectedFolder); 
                formData.set('selectedCourses', JSON.stringify(massAssignSubjects));
                
                const contentRes = await api.post('/admin/manager/contents/mass-assign', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
                await api.post('/admin/tasks/complete', { taskId: task.id, contentId: contentRes.data?.data?.id });
            }
            toast.success("Task Executed & Completed!");
            onComplete();
        } catch (error) { toast.error("Failed to execute task."); } finally { setSubmitting(false); }
    };

    if (isCustom) {
        return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-[#131b2c] border border-slate-800 rounded-2xl w-full max-w-md shadow-xl p-6 md:p-8 relative">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-xl font-semibold text-white">Execute Task</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-lg transition-colors"><X size={18}/></button>
                    </div>
                    <p className="text-sm text-slate-300 mb-6 bg-[#0a0f1c] p-4 rounded-xl border border-slate-800">{task.customDesc}</p>
                    <form onSubmit={handleSubmit}>
                        <label className="text-xs font-semibold text-slate-400 mb-2 block">Upload Proof (Optional Image/PDF)</label>
                        <input type="file" name="proof" className="w-full bg-[#0a0f1c] border border-slate-800 rounded-xl p-2.5 text-sm text-slate-400 file:bg-slate-700 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-1.5 file:mr-3 file:cursor-pointer mb-6 cursor-pointer" />
                        <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors">{submitting ? 'Executing...' : 'Complete Task'}</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#131b2c] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Plus size={18} className="text-indigo-400"/> Execute & Add Content</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-lg transition-colors"><X size={18}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="flex flex-col md:flex-row gap-5">
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Content Type *</label>
                                <div className="w-full bg-[#0a0f1c] border border-slate-800 rounded-xl p-3 text-slate-300 text-sm">
                                    {task.taskType.replace('_', ' ')}
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Target Folder</label>
                                <div className="flex gap-2">
                                    {isCreatingFolder ? (
                                        <div className="flex w-full gap-2">
                                            <input type="text" value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} placeholder="Folder Name..." className="flex-1 bg-[#0a0f1c] border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-indigo-500 text-sm" />
                                            <button type="button" onClick={handleCreateFolder} className="bg-emerald-600 text-white px-3 rounded-xl hover:bg-emerald-500 transition-colors"><Check size={16}/></button>
                                            <button type="button" onClick={()=>setIsCreatingFolder(false)} className="bg-slate-700 text-white px-3 rounded-xl hover:bg-slate-600 transition-colors"><X size={16}/></button>
                                        </div>
                                    ) : (
                                        <>
                                            <select value={selectedFolder} onChange={e=>setSelectedFolder(e.target.value)} className="flex-1 bg-[#0a0f1c] border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-indigo-500 text-sm cursor-pointer">
                                                <option value="">Uncategorized</option>
                                                {lessonGroups.map(f => <option key={f.id} value={f.id}>{f.title || f.name}</option>)}
                                            </select>
                                            <button type="button" onClick={()=>setIsCreatingFolder(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 shrink-0"><Plus size={14}/> Folder</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#0a0f1c] p-5 rounded-xl border border-slate-800">
                            <div className="md:col-span-3">
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Title *</label>
                                <input type="text" name="title" defaultValue={task.timetable?.title} required className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 text-sm" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Order</label>
                                <input type="number" name="itemOrder" defaultValue={1} required className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 text-sm" />
                            </div>

                            {(contentType === 'live' || contentType === 'recording') && (
                                <div className="md:col-span-4">
                                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">URL Link *</label>
                                    <input type="url" name="link" required className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-blue-400 outline-none focus:border-indigo-500 text-sm" />
                                </div>
                            )}

                            {(contentType === 'document' || contentType === 'sPaper' || contentType === 'paper') && (
                                <div className="md:col-span-4">
                                    <label className="text-xs font-semibold text-slate-400 mb-1.5 block">File Upload *</label>
                                    <input type="file" name="file" required className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-2.5 text-slate-400 file:bg-slate-700 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-1.5 file:mr-4 text-sm cursor-pointer" />
                                </div>
                            )}

                            <div className="md:col-span-4">
                                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Date</label>
                                <input type="date" name="date" defaultValue={task.timetable?.date?.split('T')[0]} required className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 text-sm [color-scheme:dark]" />
                            </div>

                            {contentType === 'live' && (
                                <>
                                    <div className="md:col-span-2"><label className="text-xs font-semibold text-slate-400 mb-1.5 block">Start Time</label><input type="time" name="startTime" defaultValue={task.timetable?.startTime} className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-white [color-scheme:dark] outline-none text-sm" /></div>
                                    <div className="md:col-span-2"><label className="text-xs font-semibold text-slate-400 mb-1.5 block">End Time</label><input type="time" name="endTime" defaultValue={task.timetable?.endTime} className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-white [color-scheme:dark] outline-none text-sm" /></div>
                                </>
                            )}
                            
                            {contentType === 'paper' && (
                                <>
                                    <div className="md:col-span-2"><label className="text-xs font-semibold text-slate-400 mb-1.5 block">Time (Min) *</label><input type="number" name="paperTime" required className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 text-sm" /></div>
                                    <div className="md:col-span-2"><label className="text-xs font-semibold text-slate-400 mb-1.5 block">Questions *</label><input type="number" name="questionCount" required className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 text-sm" /></div>
                                </>
                            )}
                        </div>

                        <div className="pt-2">
                            <h4 className="text-sm font-semibold text-white mb-3">Assign Subjects</h4>
                            <div className="bg-[#0a0f1c] rounded-xl p-4 border border-slate-800">
                                {batches.filter(b => selectedBatchesForContent.includes(b.id)).map(selectedBatch => (
                                    <div key={selectedBatch.id}>
                                        <h5 className="text-blue-400 text-sm font-semibold mb-3">{selectedBatch.name}</h5>
                                        {selectedBatch.groups?.map((group, gIdx) => (
                                            <div key={gIdx} className="mb-4 last:mb-0">
                                                <p className="text-xs text-slate-500 mb-2">{group.name}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {group.courses?.map((course, cIdx) => (
                                                        <label key={cIdx} className={`flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border text-xs font-medium transition-colors ${massAssignSubjects.includes(course.id) ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300' : 'bg-[#131b2c] border-slate-800 text-slate-400 hover:border-slate-600'}`}>
                                                            <input type="checkbox" checked={massAssignSubjects.includes(course.id)} onChange={() => toggleMassAssignSubject(course.id)} className="w-3.5 h-3.5 accent-indigo-500" />
                                                            {course.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 mt-2 shrink-0">
                            <button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 rounded-xl transition-colors disabled:opacity-70 text-sm">
                                {submitting ? 'Publishing...' : 'Publish Content & Mark Complete'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};