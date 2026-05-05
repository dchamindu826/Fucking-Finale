import React, { useState, useEffect } from 'react';
import { 
    CheckSquare, Clock, Play, Lock, CheckCircle2, 
    FileText, Video, X, BookOpen, AlertTriangle, Plus, Check
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
            setTasks(res.data || []);
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
        if (task.taskType === 'CUSTOM') return { icon: CheckSquare, color: 'text-pink-400', bg: 'bg-slate-800', label: task.customTitle || 'Custom Task' };
        switch(task.taskType) {
            case 'LIVE_LINK': return { icon: Play, color: 'text-blue-400', bg: 'bg-slate-800', label: 'Upload Live Link' };
            case 'RECORDING': return { icon: Video, color: 'text-purple-400', bg: 'bg-slate-800', label: 'Upload Recording' };
            case 'NOTES': return { icon: FileText, color: 'text-blue-400', bg: 'bg-slate-800', label: 'Upload PDF Notes' };
            case 'MCQ': return { icon: FileText, color: 'text-orange-400', bg: 'bg-slate-800', label: 'Upload MCQ Paper' };
            case 'STRUCTURED_PAPER': return { icon: FileText, color: 'text-yellow-400', bg: 'bg-slate-800', label: 'Upload Structured Paper' };
            default: return { icon: CheckSquare, color: 'text-slate-400', bg: 'bg-slate-800', label: task.taskType.replace('_', ' ') };
        }
    };

    return (
        <div className="w-full text-slate-200 font-sans pb-4">
            <div className="mb-6 bg-[#1e293b] border border-slate-800 p-5 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><CheckSquare className="text-blue-500" /> My Tasks</h2>
                <div className="flex gap-2 overflow-x-auto custom-scrollbar">
                    <button onClick={() => setActiveTab('my_tasks')} className={`px-5 py-2 rounded-lg text-sm transition-colors border ${activeTab === 'my_tasks' ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800'}`}>Action Required</button>
                    <button onClick={() => setActiveTab('in_progress')} className={`px-5 py-2 rounded-lg text-sm transition-colors border ${activeTab === 'in_progress' ? 'bg-slate-700 text-white border-slate-600' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800'}`}>In Progress</button>
                    <button onClick={() => setActiveTab('completed')} className={`px-5 py-2 rounded-lg text-sm transition-colors border ${activeTab === 'completed' ? 'bg-green-600 text-white border-green-600' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800'}`}>Completed</button>
                </div>
            </div>

            <div className="space-y-4">
                {loading ? <div className="text-center py-10 text-slate-400">Fetching tasks...</div> : tasks.length === 0 ? (
                    <div className="bg-[#1e293b] border border-slate-800 p-10 rounded-xl text-center">
                        <CheckCircle2 size={32} className="mx-auto text-slate-600 mb-2" />
                        <p className="text-slate-400 text-sm">You're all caught up!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {tasks.map(task => {
                            const details = getTaskDetails(task);
                            const TaskIcon = details.icon;
                            const isMainTaskWithSubs = task.subTasks && task.subTasks.length > 0;

                            return (
                                <div key={task.id} className="bg-[#1e293b] border border-slate-800 p-5 rounded-xl flex flex-col hover:border-slate-700 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-lg ${details.bg} border border-slate-700`}><TaskIcon className={details.color} size={18} /></div>
                                        {!isMainTaskWithSubs && task.deadline && (
                                            <div className="text-right flex flex-col items-end">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Deadline</p>
                                                <div className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 ${task.isOverdue && task.status !== 'COMPLETED' ? 'bg-red-500/10 text-red-500' : 'bg-[#0f172a] text-orange-400 border border-slate-800'}`}>
                                                    <Clock size={10}/>
                                                    <span>{task.deadline ? new Date(task.deadline).toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h4 className="text-base font-bold text-white mb-1">{details.label}</h4>
                                    {task.taskType !== 'CUSTOM' ? (
                                        <p className="text-xs text-blue-400 mb-4 truncate">{task.timetable?.subjectName} - {task.timetable?.title}</p>
                                    ) : (
                                        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{task.customDesc}</p>
                                    )}
                                    
                                    <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2 mb-4 flex-1">
                                        {task.taskType !== 'CUSTOM' ? (
                                            <>
                                                <p className="flex justify-between"><span className="text-slate-500">Class Date:</span> <span>{task.timetable?.date?.split('T')[0]}</span></p>
                                                <p className="flex justify-between"><span className="text-slate-500">Time:</span> <span>{task.timetable?.startTime} - {task.timetable?.endTime}</span></p>
                                            </>
                                        ) : null}
                                        <p className="flex justify-between"><span className="text-slate-500">Batch:</span> <span className="truncate max-w-[120px]">{task.batch?.name}</span></p>
                                    </div>

                                    {isMainTaskWithSubs && (
                                        <div className="mb-4 space-y-1">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest pl-1">Checklist</p>
                                            <div className="bg-[#0f172a] rounded-lg p-2 border border-slate-800 space-y-1">
                                                {task.subTasks.map(sub => (
                                                    <div key={sub.id} className="flex justify-between items-center p-1.5 rounded text-xs">
                                                        <span className={sub.status === 'COMPLETED' ? 'line-through text-slate-600' : 'text-slate-300'}>{sub.customTitle}</span>
                                                        {sub.status === 'COMPLETED' && <CheckCircle2 size={12} className="text-green-500"/>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="mt-auto">
                                        {(activeTab === 'my_tasks' || activeTab === 'in_progress') && (
                                            task.status === 'LOCKED' || task.isOverdue ? (
                                                <button onClick={() => { setSelectedTask(task); setShowUnlockModal(true); }} className="w-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"><Lock size={16} /> Request Unlock</button>
                                            ) : (
                                                <button onClick={() => { setSelectedTask(task); setShowContentModal(true); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"><Play size={16} /> Execute & Publish</button>
                                            )
                                        )}
                                        {task.status === 'COMPLETED' && <div className="w-full bg-green-500/10 text-green-400 py-2.5 text-sm rounded-lg flex items-center justify-center gap-2 border border-green-500/30"><CheckCircle2 size={16} /> Completed</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Content Hub Clone Modal */}
            {showContentModal && selectedTask && (
                 <TaskExecutionModal task={selectedTask} onClose={() => setShowContentModal(false)} onComplete={() => { setShowContentModal(false); fetchTasks(); }} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// CONTENT HUB EXECUTION MODAL (With Folder Create)
// ---------------------------------------------------------------------------
const TaskExecutionModal = ({ task, onClose, onComplete }) => {
    const [submitting, setSubmitting] = useState(false);
    const isCustom = task.taskType === 'CUSTOM';
    
    const [batches, setBatches] = useState([]);
    const [lessonGroups, setLessonGroups] = useState([]);
    const [massAssignSubjects, setMassAssignSubjects] = useState([]);
    const [selectedBatchesForContent, setSelectedBatchesForContent] = useState([]);

    // Inline Folder Creation State
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
                    batchData.groups?.forEach(g => {
                        g.courses?.forEach(c => {
                            if (c.name === task.timetable.subjectName) {
                                setMassAssignSubjects(prev => [...new Set([...prev, c.id])]);
                            }
                        });
                    });
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

    // Folder Creation from inside the modal
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const payload = { 
                title: newFolderName, 
                type: getTypeInt(contentType), 
                order: 1, 
                batch_id: task.batchId, 
                course_code: null
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
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/90 p-4">
                <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-md shadow-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Execute Task</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
                    </div>
                    <p className="text-sm text-slate-300 mb-5 bg-[#0f172a] p-3 rounded-lg border border-slate-700">{task.customDesc}</p>
                    <form onSubmit={handleSubmit}>
                        <label className="text-xs text-slate-400 mb-2 block">Upload Proof (Optional Image/PDF)</label>
                        <input type="file" name="proof" className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-sm text-slate-400 file:bg-slate-700 file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:mr-3 mb-5" />
                        <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm transition-colors">{submitting ? 'Executing...' : 'Complete Task'}</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/95 p-4 animate-in fade-in">
            <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
                <div className="p-5 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><Plus size={20}/> Execute & Add Content</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-slate-400 mb-1 block">Content Type *</label>
                                <div className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-slate-300 text-sm">
                                    {task.taskType.replace('_', ' ')}
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-slate-400 mb-1 block">Target Folder</label>
                                <div className="flex gap-2">
                                    {isCreatingFolder ? (
                                        <div className="flex w-full gap-2">
                                            <input type="text" value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} placeholder="Folder Name..." className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500 text-sm" />
                                            <button type="button" onClick={handleCreateFolder} className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-500 transition-colors"><Check size={16}/></button>
                                            <button type="button" onClick={()=>setIsCreatingFolder(false)} className="bg-slate-700 text-white p-2 rounded-lg hover:bg-slate-600 transition-colors"><X size={16}/></button>
                                        </div>
                                    ) : (
                                        <>
                                            <select value={selectedFolder} onChange={e=>setSelectedFolder(e.target.value)} className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 text-sm">
                                                <option value="">Uncategorized</option>
                                                {lessonGroups.map(f => <option key={f.id} value={f.id}>{f.title || f.name}</option>)}
                                            </select>
                                            <button type="button" onClick={()=>setIsCreatingFolder(true)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg text-xs transition-colors flex items-center gap-1 shrink-0"><Plus size={14}/> Folder</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#0f172a] p-4 rounded-xl border border-slate-700">
                            <div className="md:col-span-3">
                                <label className="text-xs text-slate-400 mb-1 block">Title *</label>
                                <input type="text" name="title" defaultValue={task.timetable?.title} required className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 text-sm" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="text-xs text-slate-400 mb-1 block">Order</label>
                                <input type="number" name="itemOrder" defaultValue={1} required className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 text-sm" />
                            </div>

                            {(contentType === 'live' || contentType === 'recording') && (
                                <div className="md:col-span-4">
                                    <label className="text-xs text-slate-400 mb-1 block">URL Link *</label>
                                    <input type="url" name="link" required className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2.5 text-blue-400 outline-none focus:border-blue-500 text-sm" />
                                </div>
                            )}

                            {(contentType === 'document' || contentType === 'sPaper' || contentType === 'paper') && (
                                <div className="md:col-span-4">
                                    <label className="text-xs text-slate-400 mb-1 block">File Upload *</label>
                                    <input type="file" name="file" required className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-slate-400 file:bg-slate-700 file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:mr-3 text-sm cursor-pointer" />
                                </div>
                            )}

                            <div className="md:col-span-4">
                                <label className="text-xs text-slate-400 mb-1 block">Date</label>
                                <input type="date" name="date" defaultValue={task.timetable?.date?.split('T')[0]} required className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 text-sm [color-scheme:dark]" />
                            </div>

                            {contentType === 'live' && (
                                <>
                                    <div className="md:col-span-2"><label className="text-xs text-slate-400 mb-1 block">Start Time</label><input type="time" name="startTime" defaultValue={task.timetable?.startTime} className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2.5 text-white [color-scheme:dark] outline-none text-sm" /></div>
                                    <div className="md:col-span-2"><label className="text-xs text-slate-400 mb-1 block">End Time</label><input type="time" name="endTime" defaultValue={task.timetable?.endTime} className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2.5 text-white [color-scheme:dark] outline-none text-sm" /></div>
                                </>
                            )}
                            
                            {contentType === 'paper' && (
                                <>
                                    <div className="md:col-span-2"><label className="text-xs text-slate-400 mb-1 block">Time (Min) *</label><input type="number" name="paperTime" required className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                                    <div className="md:col-span-2"><label className="text-xs text-slate-400 mb-1 block">Questions *</label><input type="number" name="questionCount" required className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2.5 text-white outline-none text-sm" /></div>
                                </>
                            )}
                        </div>

                        <div className="pt-2">
                            <h4 className="text-sm font-semibold text-white mb-3">Assign Subjects</h4>
                            <div className="bg-[#0f172a] rounded-xl p-4 border border-slate-700">
                                {batches.filter(b => selectedBatchesForContent.includes(b.id)).map(selectedBatch => (
                                    <div key={selectedBatch.id}>
                                        <h5 className="text-blue-400 text-sm font-bold mb-3">{selectedBatch.name}</h5>
                                        {selectedBatch.groups?.map((group, gIdx) => (
                                            <div key={gIdx} className="mb-3">
                                                <p className="text-xs text-slate-400 mb-2">{group.name}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {group.courses?.map((course, cIdx) => (
                                                        <label key={cIdx} className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border text-xs ${massAssignSubjects.includes(course.id) ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-[#1e293b] border-slate-700 text-slate-400'}`}>
                                                            <input type="checkbox" checked={massAssignSubjects.includes(course.id)} onChange={() => toggleMassAssignSubject(course.id)} className="w-3.5 h-3.5 accent-blue-500" />
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

                        <div className="pt-4 border-t border-slate-700">
                            <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-70 text-sm">
                                {submitting ? 'Publishing...' : 'Publish Content & Mark Complete'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};