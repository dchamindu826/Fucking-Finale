import React, { useState, useEffect } from 'react';
import { 
    CheckSquare, Clock, Play, Lock, CheckCircle2, 
    FileText, Video, X, BookOpen, AlertTriangle, Plus, Check, Building2, ChevronRight,
    MonitorPlay, Loader2, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

export default function StaffTaskCenter({ loggedInUser }) {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('in_progress');
    const [tasks, setTasks] = useState([]);
    
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showContentModal, setShowContentModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

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
        if (task.taskType === 'CUSTOM') return { icon: CheckSquare, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-500/10', border: 'border-pink-200 dark:border-pink-500/20', label: task.customTitle || 'Custom Task' };
        switch(task.taskType) {
            case 'LIVE_LINK': return { icon: Play, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20', label: 'Upload Live Link' };
            case 'RECORDING': return { icon: Video, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20', label: 'Upload Recording' };
            case 'NOTES': return { icon: FileText, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', label: 'Upload Document' };
            case 'MCQ': return { icon: FileText, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20', label: 'Upload MCQ Paper' };
            case 'STRUCTURED_PAPER': return { icon: FileText, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-200 dark:border-yellow-500/20', label: 'Upload Structured Paper' };
            default: return { icon: CheckSquare, color: 'text-gray-600 dark:text-slate-400', bg: 'bg-gray-100 dark:bg-brand-darkHover', border: 'border-gray-200 dark:border-brand-darkBorder', label: task.taskType.replace('_', ' ') };
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

    const getCountdownText = (deadlineStr) => {
        if (!deadlineStr) return '';
        const diff = new Date(deadlineStr) - now;
        if (diff <= 0) return 'Overdue';
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (d > 0) return `${d}d ${h}h left`;
        if (h > 0) return `${h}h ${m}m left`;
        return `${m}m left`;
    };

    return (
        <div className="w-full min-h-screen text-gray-900 dark:text-slate-300 font-sans pb-10 bg-gray-50 dark:bg-brand-darkBg animate-in fade-in duration-500 relative transition-colors">
            
            {/* Header */}
            <div className="mb-8 bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-colors">
                
                <div className="flex items-center gap-5 z-10">
                    <div className="p-3.5 bg-brand-accentLight rounded-2xl border border-brand-accent/20 text-brand-accent shadow-sm transition-colors">
                        <Clock size={26} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-wide transition-colors">My Work Space</h2>
                        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 font-medium transition-colors">Manage and execute your daily tasks</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto bg-gray-50 dark:bg-brand-darkBg p-1.5 rounded-2xl border border-gray-200 dark:border-brand-darkBorder shadow-sm overflow-x-auto z-10 transition-colors">
                    <button onClick={() => setActiveTab('in_progress')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 outline-none ${activeTab === 'in_progress' ? 'bg-brand-accent text-white shadow-md' : 'bg-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-brand-darkHover'}`}>
                        In Progress
                    </button>
                    <button onClick={() => setActiveTab('my_tasks')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 outline-none ${activeTab === 'my_tasks' ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-md' : 'bg-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-brand-darkHover'}`}>
                        Action Required
                    </button>
                    <button onClick={() => setActiveTab('completed')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 outline-none ${activeTab === 'completed' ? 'bg-emerald-600 dark:bg-emerald-600 text-white shadow-md' : 'bg-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-brand-darkHover'}`}>
                        Completed
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto">
                {loading ? (
                    <div className="text-center py-24 text-brand-accent font-bold text-sm flex flex-col items-center transition-colors">
                        <div className="w-12 h-12 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin mb-4 transition-colors"></div>
                        Syncing Timeline...
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder p-16 rounded-[2.5rem] text-center flex flex-col items-center justify-center mt-8 shadow-sm transition-colors">
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-6 rounded-full mb-6 border border-emerald-200 dark:border-emerald-500/20 transition-colors"><CheckCircle2 size={48} className="text-emerald-600 dark:text-emerald-400" /></div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight transition-colors">Timeline Clear!</h3>
                        <p className="text-gray-500 dark:text-slate-400 font-medium text-sm max-w-sm transition-colors">Awesome job! You have no tasks pending in this category at the moment.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-gray-200 dark:border-brand-darkBorder ml-4 md:ml-12 space-y-10 pb-12 pt-6 transition-colors">
                        {tasks.map((task) => {
                            const details = getTaskDetails(task);
                            const TaskIcon = details.icon;
                            const isMainTaskWithSubs = task.subTasks && task.subTasks.length > 0;

                            return (
                                <div key={task.id} className="relative pl-8 md:pl-12 group">
                                    
                                    {/* TIMELINE GLOW DOT */}
                                    <div className={`absolute -left-[11px] top-6 w-5 h-5 rounded-full border-4 border-gray-50 dark:border-brand-darkBg z-10 transition-colors shadow-sm ${task.status === 'COMPLETED' ? 'bg-emerald-500' : task.isOverdue ? 'bg-red-500 animate-pulse' : 'bg-brand-accent'}`}></div>

                                    {/* TIME BADGE & COUNTDOWN */}
                                    <div className="mb-3 pl-1 flex items-center flex-wrap gap-3 transition-colors">
                                        <span className={`text-xl font-black tracking-tight transition-colors ${task.isOverdue && task.status !== 'COMPLETED' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{formatTimeOnly(task.deadline)}</span>
                                        <span className="bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase tracking-widest border border-gray-200 dark:border-white/5 transition-colors">{formatDateOnly(task.deadline)}</span>
                                        
                                        {task.status !== 'COMPLETED' && task.deadline && new Date(task.deadline) > now && (
                                            <span className="bg-brand-accentLight text-brand-accent border border-brand-accent/30 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm transition-colors">
                                                <Clock size={12} className="animate-pulse" /> {getCountdownText(task.deadline)}
                                            </span>
                                        )}
                                        {task.status !== 'COMPLETED' && task.deadline && new Date(task.deadline) <= now && (
                                            <span className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm transition-colors">
                                                <AlertTriangle size={12} /> LATE
                                            </span>
                                        )}
                                    </div>

                                    {/* TASK CARD */}
                                    <div className={`bg-white dark:bg-brand-darkCard border p-6 md:p-8 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-8 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 ${task.isOverdue && task.status !== 'COMPLETED' ? 'border-red-300 dark:border-red-500/30 hover:border-red-400 dark:hover:border-red-500/50' : 'border-gray-200 dark:border-brand-darkBorder hover:border-brand-accent/30 dark:hover:border-brand-accent/30'}`}>
                                        
                                        <div className="flex items-start gap-5 flex-1 min-w-0 w-full transition-colors">
                                            <div className={`p-3.5 rounded-2xl ${details.bg} border ${details.border} shrink-0 shadow-sm transition-colors`}>
                                                <TaskIcon className={details.color} size={24} strokeWidth={2.5} />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 pt-1 transition-colors">
                                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 leading-tight transition-colors">{details.label}</h4>
                                                {task.taskType !== 'CUSTOM' ? (
                                                    <p className="text-sm text-brand-accent font-bold truncate mb-3 transition-colors">{task.timetable?.subjectName} <span className="text-gray-400 dark:text-slate-500 font-normal mx-1">|</span> <span className="text-gray-700 dark:text-slate-300 font-medium transition-colors">{task.timetable?.title}</span></p>
                                                ) : (
                                                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed transition-colors">{task.customDesc}</p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase tracking-widest transition-colors">
                                                    <span className="bg-gray-50 dark:bg-brand-darkBg px-3 py-1.5 rounded-lg border border-gray-200 dark:border-brand-darkBorder flex items-center gap-1.5 shadow-sm transition-colors"><Building2 size={12} className="text-gray-400 dark:text-slate-500"/> {task.business?.name}</span>
                                                    <span className="bg-gray-50 dark:bg-brand-darkBg px-3 py-1.5 rounded-lg border border-gray-200 dark:border-brand-darkBorder flex items-center gap-1.5 shadow-sm transition-colors"><BookOpen size={12} className="text-gray-400 dark:text-slate-500"/> {task.batch?.name}</span>
                                                </div>

                                                {isMainTaskWithSubs && (
                                                    <div className="mt-5 bg-gray-50 dark:bg-brand-darkBg rounded-2xl p-4 border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors">
                                                        <p className="text-[10px] text-gray-500 dark:text-slate-500 uppercase font-black tracking-widest mb-3 pl-1 transition-colors">Checklist Items</p>
                                                        <div className="space-y-2">
                                                            {task.subTasks.map(sub => (
                                                                <div key={sub.id} className="flex justify-between items-center bg-white dark:bg-brand-darkCard p-3 rounded-xl text-xs border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors">
                                                                    <span className={sub.status === 'COMPLETED' ? 'line-through text-gray-400 dark:text-slate-500 font-medium transition-colors' : 'text-gray-800 dark:text-slate-200 font-bold transition-colors'}>{sub.customTitle}</span>
                                                                    {sub.status === 'COMPLETED' ? <CheckCircle2 size={16} className="text-emerald-500 transition-colors"/> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-black/40 transition-colors"></div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-full md:w-auto shrink-0 flex flex-col gap-3 transition-colors">
                                            {(activeTab === 'my_tasks' || activeTab === 'in_progress') && (
                                                task.status === 'LOCKED' || task.isOverdue ? (
                                                    <button onClick={() => { setSelectedTask(task); setShowUnlockModal(true); }} className="w-full md:w-44 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white border border-red-200 dark:border-red-500/20 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-sm outline-none">
                                                        <Lock size={16} /> Req Unlock
                                                    </button>
                                                ) : (
                                                    <button onClick={() => { setSelectedTask(task); setShowContentModal(true); }} className="w-full md:w-44 bg-brand-accent hover:bg-brand-accentHover text-white py-3.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] outline-none">
                                                        <Play size={16} fill="currentColor" /> Execute Task
                                                    </button>
                                                )
                                            )}
                                            {task.status === 'COMPLETED' && (
                                                <div className="w-full md:w-44 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-500/20 text-xs uppercase tracking-widest shadow-sm transition-colors">
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 dark:bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 transition-colors">
                    <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-3xl p-8 w-full max-w-sm shadow-2xl relative transition-colors">
                        <div className="flex justify-between items-center mb-6 transition-colors">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 transition-colors"><Lock className="text-red-500 dark:text-red-400" size={20}/> Task Locked</h3>
                            <button onClick={() => setShowUnlockModal(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-brand-darkBg p-2 rounded-xl transition-colors border border-gray-200 dark:border-transparent outline-none"><X size={18}/></button>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-slate-300 mb-6 leading-relaxed bg-gray-50 dark:bg-black/40 p-4 rounded-xl border border-gray-200 dark:border-brand-darkBorder shadow-sm font-medium transition-colors">
                            This task is overdue and locked. You must submit a request to your manager to unlock it.
                        </p>
                        <form onSubmit={handleRequestUnlock}>
                            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2 block transition-colors">Reason for Delay *</label>
                            <textarea name="reason" required rows="3" placeholder="Explain why the task was delayed..." className="w-full bg-white dark:bg-brand-darkBg border border-gray-300 dark:border-brand-darkBorder rounded-2xl p-4 text-sm text-gray-900 dark:text-white outline-none focus:border-red-500 dark:focus:border-red-500 mb-6 transition-colors resize-none shadow-sm placeholder-gray-400 dark:placeholder-slate-500"></textarea>
                            <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-transform hover:scale-[1.02] text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md outline-none">
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
// CONTENT HUB EXECUTION MODAL (Landscape + Preview + Thumbnail Fix)
// ---------------------------------------------------------------------------
const TaskExecutionModal = ({ task, onClose, onComplete }) => {
    const [submitting, setSubmitting] = useState(false);
    const isCustom = task.taskType === 'CUSTOM';
    
    const [batches, setBatches] = useState([]);
    const [lessonGroups, setLessonGroups] = useState([]);
    const [existingContents, setExistingContents] = useState([]); 
    const [massAssignSubjects, setMassAssignSubjects] = useState([]);
    const [selectedBatchesForContent, setSelectedBatchesForContent] = useState([]);
    const [activeCourseCode, setActiveCourseCode] = useState(null); 

    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFolder, setSelectedFolder] = useState('');

    const [isVerification, setIsVerification] = useState(false); 
    const [selectedExistingContent, setSelectedExistingContent] = useState(null);

    const typeMap = { 'LIVE_LINK': 'live', 'RECORDING': 'recording', 'NOTES': 'document', 'MCQ': 'paper', 'STRUCTURED_PAPER': 'sPaper' };
    const contentType = isCustom ? '' : typeMap[task.taskType];

    const getTypeInt = (typeStr) => {
        switch (typeStr) {
            case 'live': return 1; case 'recording': return 2; case 'document': return 3; case 'sPaper': return 4; case 'paper': return 5;
            default: return 1;
        }
    };

    useEffect(() => { if (!isCustom) fetchHubData(); }, [task]);

    const fetchHubData = async () => {
        try {
            const res = await api.get(`/admin/batches/${task.businessId}`);
            const fetchedBatches = res.data.batches || res.data || [];
            setBatches(fetchedBatches);
            if (task.batchId) setSelectedBatchesForContent([task.batchId]);

            let foundCourseId = 0;
            let foundCode = null;

            if (task.timetable?.subjectName && task.batchId) {
                const batchData = fetchedBatches.find(b => b.id === task.batchId);
                if (batchData) {
                    batchData.groups?.forEach(g => {
                        g.courses?.forEach(c => {
                            if (c.name === task.timetable.subjectName) {
                                setMassAssignSubjects(prev => !prev.includes(c.id) ? [...prev, c.id] : prev);
                                foundCode = c.code || `SUB_${c.id}`;
                                foundCourseId = c.id; 
                            }
                        });
                    });
                    if (foundCode) setActiveCourseCode(foundCode); 
                }
            }

            if (task.batchId) {
                const lgRes = await api.get(`/admin/manager/get-contents?batchId=${task.batchId}&courseCode=${foundCode || 'null'}&courseId=${foundCourseId}`);
                const targetTypeInt = getTypeInt(contentType);
                const allFolders = lgRes.data?.lessonGroups || [];
                setLessonGroups(allFolders.filter(f => parseInt(f.type) === targetTypeInt));
                setExistingContents(lgRes.data?.contents || []);
            }
        } catch (e) { console.error("Error loading hub data", e); }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const payload = { title: newFolderName, type: getTypeInt(contentType), order: 1, batch_id: task.batchId, course_code: activeCourseCode };
            const res = await api.post('/admin/manager/content-group/add', payload);
            toast.success("Folder Created!");
            if(res.data?.data) { setLessonGroups([...lessonGroups, res.data.data]); setSelectedFolder(res.data.data.id); }
            setIsCreatingFolder(false); setNewFolderName('');
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
            } else if (isVerification) {
                if (!selectedExistingContent) { toast.error("Please select a content to verify!"); setSubmitting(false); return; }
                await api.post('/admin/tasks/complete', { taskId: task.id, contentId: selectedExistingContent });
            } else {
                if (massAssignSubjects.length === 0) { toast.error("Please select at least one subject!"); setSubmitting(false); return; }
                
                formData.set('type', contentType);
                formData.set('batch_id', task.batchId);
                formData.set('contentGroupId', selectedFolder); 
                formData.set('selectedCourses', JSON.stringify(massAssignSubjects));
                formData.set('isFree', '0'); 
                
                const contentRes = await api.post('/admin/manager/contents/mass-assign', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
                await api.post('/admin/tasks/complete', { taskId: task.id, contentId: contentRes.data?.data?.id });
            }
            toast.success("Task Executed Successfully!");
            onComplete();
        } catch (error) { toast.error("Failed to execute task."); } finally { setSubmitting(false); }
    };

    if (isCustom) {
        return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 transition-colors">
                <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-3xl w-full max-w-md shadow-2xl p-8 transition-colors">
                    <div className="flex justify-between items-center mb-6 transition-colors">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 transition-colors"><CheckCircle2 className="text-emerald-500"/> Custom Task</h3>
                        <button onClick={onClose} className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-brand-darkBg p-2 rounded-xl border border-gray-200 dark:border-transparent outline-none transition-colors"><X size={18}/></button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-slate-300 mb-6 bg-gray-50 dark:bg-black/40 p-4 rounded-xl border border-gray-200 dark:border-brand-darkBorder shadow-sm font-medium transition-colors">{task.customDesc}</p>
                    <form onSubmit={handleSubmit}>
                        <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 block tracking-widest transition-colors">Upload Proof</label>
                        <input type="file" name="proof" className="w-full bg-gray-50 dark:bg-brand-darkBg border border-gray-300 dark:border-brand-darkBorder rounded-xl p-3 text-sm text-gray-600 dark:text-slate-300 mb-8 cursor-pointer shadow-sm file:bg-brand-accent file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 file:font-bold transition-colors" />
                        <button type="submit" disabled={submitting} className="w-full bg-brand-accent hover:bg-brand-accentHover text-white font-black py-4 rounded-2xl transition-transform hover:scale-[1.02] shadow-md outline-none">{submitting ? 'Executing...' : 'Complete Task'}</button>
                    </form>
                </div>
            </div>
        );
    }

    const filteredExistingContents = existingContents.filter(c => String(c.contentType) === String(getTypeInt(contentType)) || c.contentType === contentType);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 transition-colors">
            {/* LANDSCAPE MODAL */}
            <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
                <div className="p-6 md:px-8 border-b border-gray-200 dark:border-brand-darkBorder flex justify-between items-center bg-gray-50 dark:bg-brand-darkBg shrink-0 transition-colors">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 transition-colors"><Play size={20} className="text-brand-accent"/> {task.taskType.replace('_', ' ')} Manager</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-bold transition-colors">{task.timetable?.subjectName} - {task.timetable?.title}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-transparent p-2.5 rounded-xl transition-colors outline-none shadow-sm"><X size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar transition-colors">
                    
                    <div className="flex gap-2 bg-gray-50 dark:bg-brand-darkBg p-1.5 rounded-xl border border-gray-200 dark:border-brand-darkBorder shadow-sm mb-8 w-max transition-colors">
                        <button type="button" onClick={() => setIsVerification(false)} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all outline-none ${!isVerification ? 'bg-brand-accent text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>Create New</button>
                        <button type="button" onClick={() => setIsVerification(true)} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all outline-none ${isVerification ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>Verify Existing</button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col transition-colors">
                        {isVerification ? (
                            /* VERIFICATION LIST WITH PREVIEW BUTTONS */
                            <div className="bg-gray-50 dark:bg-brand-darkBg p-8 rounded-[2rem] border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 transition-colors">Verify Previously Uploaded Content</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-3 transition-colors">
                                    {filteredExistingContents.length === 0 ? (
                                        <p className="text-sm text-gray-500 dark:text-slate-500 italic p-10 text-center border border-gray-200 dark:border-brand-darkBorder rounded-2xl bg-white dark:bg-brand-darkCard col-span-2 shadow-sm transition-colors">No {task.taskType.replace('_', ' ')} found in the Hub for this subject.</p>
                                    ) : (
                                        filteredExistingContents.map(c => (
                                            <div key={c.id} className={`p-5 rounded-2xl border flex flex-col justify-between transition-all shadow-sm ${selectedExistingContent === c.id ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/50 dark:border-emerald-500/50 shadow-md' : 'bg-white dark:bg-brand-darkCard border-gray-200 dark:border-brand-darkBorder hover:border-gray-300 dark:hover:border-slate-600'}`}>
                                                <div className="flex justify-between items-start cursor-pointer mb-5 outline-none" onClick={() => setSelectedExistingContent(c.id)}>
                                                    <div className="pr-4 min-w-0 transition-colors">
                                                        <p className={`font-bold text-base truncate mb-1 transition-colors ${selectedExistingContent === c.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>{c.title}</p>
                                                        <p className="text-[10px] text-gray-500 dark:text-slate-500 font-bold uppercase tracking-widest transition-colors">{new Date(c.createdAt).toDateString()}</p>
                                                    </div>
                                                    {selectedExistingContent === c.id ? <CheckCircle2 className="text-emerald-600 dark:text-emerald-500 shrink-0 transition-colors" size={24}/> : <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-brand-darkBg shrink-0 transition-colors"></div>}
                                                </div>
                                                <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-brand-darkBorder transition-colors">
                                                    {c.link && <button type="button" onClick={(e) => { e.stopPropagation(); window.open(c.link, '_blank'); }} className="bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm outline-none"><Play size={14}/> {task.taskType === 'RECORDING' ? 'Play' : 'Open'}</button>}
                                                    {c.fileName && <button type="button" onClick={(e) => { e.stopPropagation(); window.open(`${api.defaults.baseURL.replace('/api','')}/storage/documents/${c.fileName}`, '_blank'); }} className="bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 dark:hover:text-white text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-sm outline-none"><FileText size={14}/> View</button>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* LANDSCAPE TWO-COLUMN FORM */
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 transition-colors">
                                <div className="space-y-6 bg-gray-50 dark:bg-brand-darkBg p-8 rounded-[2rem] border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors">
                                    <h4 className="text-[10px] font-black text-gray-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 border-b border-gray-200 dark:border-brand-darkBorder pb-3 transition-colors">Primary Content Data</h4>
                                    <div className="flex gap-4 transition-colors">
                                        <div className="flex-[3]"><label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase mb-2 block ml-1 transition-colors">Title *</label><input type="text" name="title" defaultValue={task.timetable?.title} required className="w-full bg-white dark:bg-brand-darkCard border border-gray-300 dark:border-brand-darkBorder rounded-xl p-3.5 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" /></div>
                                        <div className="flex-1"><label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase mb-2 block ml-1 transition-colors">Order</label><input type="number" name="itemOrder" defaultValue={1} required className="w-full bg-white dark:bg-brand-darkCard border border-gray-300 dark:border-brand-darkBorder rounded-xl p-3.5 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm text-center shadow-sm transition-colors" /></div>
                                    </div>
                                    {(contentType === 'live' || contentType === 'recording') && (<div><label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase mb-2 block ml-1 transition-colors">URL Link *</label><input type="url" name="link" required className="w-full bg-white dark:bg-brand-darkCard border border-gray-300 dark:border-brand-darkBorder rounded-xl p-3.5 text-blue-600 dark:text-blue-400 font-medium outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" /></div>)}
                                    {(contentType === 'document' || contentType === 'sPaper' || contentType === 'paper') && (<div><label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase mb-2 block ml-1 transition-colors">Main File *</label><input type="file" name="file" required className="w-full bg-white dark:bg-brand-darkCard border border-gray-300 dark:border-brand-darkBorder rounded-xl p-3 text-gray-600 dark:text-slate-400 file:bg-brand-accent file:text-white file:font-bold file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 text-sm cursor-pointer shadow-sm transition-colors" /></div>)}
                                    
                                    {/* THUMBNAIL UPLOAD FIELD */}
                                    <div><label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase mb-2 block ml-1 transition-colors">Custom Thumbnail (Optional)</label><input type="file" name="thumbnail" accept="image/*" className="w-full bg-white dark:bg-brand-darkCard border border-gray-300 dark:border-brand-darkBorder rounded-xl p-3 text-gray-600 dark:text-slate-400 file:bg-gray-200 dark:file:bg-brand-darkHover file:text-gray-700 dark:file:text-white file:font-bold file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 text-sm cursor-pointer shadow-sm transition-colors" /></div>

                                    <div className="border-t border-gray-200 dark:border-brand-darkBorder pt-5 flex gap-4 transition-colors">
                                        <div className="flex-1"><label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase mb-2 block ml-1 transition-colors">Date</label><input type="date" name="date" defaultValue={task.timetable?.date?.split('T')[0]} required className="w-full bg-white dark:bg-brand-darkCard border border-gray-300 dark:border-brand-darkBorder rounded-xl p-3.5 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm [color-scheme:light] dark:[color-scheme:dark] shadow-sm transition-colors" /></div>
                                        {contentType === 'live' && (
                                            <>
                                                <div className="flex-1"><label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase mb-2 block ml-1 transition-colors">Start</label><input type="time" name="startTime" defaultValue={task.timetable?.startTime} className="w-full bg-white dark:bg-brand-darkCard border border-gray-300 dark:border-brand-darkBorder rounded-xl p-3.5 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" /></div>
                                                <div className="flex-1"><label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase mb-2 block ml-1 transition-colors">End</label><input type="time" name="endTime" defaultValue={task.timetable?.endTime} className="w-full bg-white dark:bg-brand-darkCard border border-gray-300 dark:border-brand-darkBorder rounded-xl p-3.5 text-gray-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" /></div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-8 flex flex-col h-full transition-colors">
                                    <div className="bg-gray-50 dark:bg-brand-darkBg p-8 rounded-[2rem] border border-gray-200 dark:border-brand-darkBorder shadow-sm flex-1 flex flex-col transition-colors">
                                        <h4 className="text-[10px] font-black text-gray-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-5 border-b border-gray-200 dark:border-brand-darkBorder pb-3 transition-colors">Destination Details</h4>
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase mb-2 block ml-1 transition-colors">Folder Path</label>
                                        <div className="flex gap-2 transition-colors">
                                            {isCreatingFolder ? (
                                                <div className="flex w-full gap-2 transition-colors"><input type="text" value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} placeholder="Folder Name..." className="flex-1 bg-white dark:bg-brand-darkCard border border-gray-300 dark:border-brand-darkBorder rounded-xl p-3.5 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm shadow-sm transition-colors" /><button type="button" onClick={handleCreateFolder} className="bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 px-4 rounded-xl hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all shadow-sm outline-none"><Check size={18}/></button><button type="button" onClick={()=>setIsCreatingFolder(false)} className="bg-white dark:bg-white/5 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-white/10 px-4 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm outline-none"><X size={18}/></button></div>
                                            ) : (
                                                <><select value={selectedFolder} onChange={e=>setSelectedFolder(e.target.value)} className="flex-1 bg-white dark:bg-brand-darkCard border border-gray-300 dark:border-brand-darkBorder rounded-xl p-3.5 text-gray-900 dark:text-white outline-none focus:border-brand-accent dark:focus:border-brand-accent text-sm cursor-pointer shadow-sm transition-colors"><option value="" className="bg-white dark:bg-brand-darkCard">Uncategorized</option>{lessonGroups.map(f => <option key={f.id} value={f.id} className="bg-white dark:bg-brand-darkCard">{f.title || f.name}</option>)}</select><button type="button" onClick={()=>setIsCreatingFolder(true)} className="bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 shadow-sm flex items-center gap-1.5 outline-none"><Plus size={14}/> New Folder</button></>
                                            )}
                                        </div>
                                        <div className="bg-white dark:bg-brand-darkCard p-8 rounded-[2rem] border border-gray-200 dark:border-brand-darkBorder shadow-sm flex-1 flex flex-col mt-6 transition-colors">
                                            <h4 className="text-[10px] font-black text-gray-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-5 border-b border-gray-200 dark:border-brand-darkBorder pb-3 transition-colors">Student Access (Subjects)</h4>
                                            <div className="overflow-y-auto custom-scrollbar pr-3 flex-1 max-h-[180px] transition-colors">
                                                {batches.filter(b => selectedBatchesForContent.includes(b.id)).map(selectedBatch => (
                                                    <div key={selectedBatch.id}>
                                                        {selectedBatch.groups?.map((group, gIdx) => (
                                                            <div key={gIdx} className="mb-6 last:mb-0 transition-colors"><p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-3 transition-colors">{group.name}</p><div className="flex flex-wrap gap-2.5 transition-colors">{group.courses?.map((course, cIdx) => (<label key={cIdx} className={`flex items-center gap-2.5 cursor-pointer px-4 py-2.5 rounded-xl border text-[11px] font-bold transition-all shadow-sm ${massAssignSubjects.includes(course.id) ? 'bg-brand-accentLight/50 dark:bg-brand-accent/20 border-brand-accent/50 text-brand-accent dark:text-brand-accent' : 'bg-gray-50 dark:bg-brand-darkBg border-gray-200 dark:border-brand-darkBorder text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-white/20'}`}><input type="checkbox" checked={massAssignSubjects.includes(course.id)} onChange={() => toggleMassAssignSubject(course.id)} className="w-4 h-4 accent-brand-accent rounded border-gray-300 dark:border-white/10" />{course.name}</label>))}</div></div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-8 shrink-0 transition-colors">
                                        <button type="submit" disabled={submitting} className={`w-full text-white font-black py-5 rounded-[1.5rem] transition-all disabled:opacity-70 text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-md outline-none hover:scale-[1.01] ${isVerification ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30' : 'bg-brand-accent hover:bg-brand-accentHover shadow-brand-accent/30'}`}>
                                            {submitting ? <Loader2 className="animate-spin" size={20}/> : isVerification ? <CheckCircle size={20}/> : <MonitorPlay size={20}/>}
                                            {submitting ? 'PROCESSING...' : isVerification ? 'VERIFY & FINISH TASK' : 'PUBLISH & COMPLETE TASK'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};