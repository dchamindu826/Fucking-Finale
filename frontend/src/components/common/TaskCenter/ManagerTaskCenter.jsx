import React, { useState, useEffect } from 'react';
import { 
    CheckSquare, Clock, AlertTriangle, Filter, CheckCircle2, 
    X, Plus, Trash2, Settings, Eye, Play, Video, FileText, Calendar, RefreshCcw, ExternalLink, Edit
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api/axios';

export default function ManagerTaskCenter({ loggedInUser }) {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [tasks, setTasks] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); 

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showOverviewModal, setShowOverviewModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    useEffect(() => { fetchInitialData(); }, []);
    useEffect(() => { if (selectedBiz) fetchTasks(); }, [selectedBiz, activeTab]);

    const fetchInitialData = async () => {
        try {
            const bizRes = await api.get('/admin/businesses');
            setBusinesses(bizRes.data?.businesses || bizRes.data || []);
            const staffRes = await api.get('/admin/staff');
            setStaffList((staffRes.data || []).filter(s => s.role.toUpperCase() === 'STAFF' || s.role.toUpperCase() === 'COORDINATOR'));
        } catch (e) { toast.error("Failed to load initial data"); } finally { setLoading(false); }
    };

    const fetchTasks = async () => {
        if (!selectedBiz) return;
        setLoading(true);
        try {
            let url = `/admin/tasks?businessId=${selectedBiz}&`;
            if (activeTab === 'pending') url += `status=PENDING&`;
            else if (activeTab === 'in_progress') url += `status=IN_PROGRESS&`;
            else if (activeTab === 'requests') url += `status=REQ_UNLOCK&`;
            else if (activeTab === 'completed') url += `status=COMPLETED&`;
            
            if (activeTab !== 'settings') {
                const res = await api.get(url);
                setTasks(res.data || []);
            }
        } catch (e) { toast.error("Failed to load tasks"); } finally { setLoading(false); }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/tasks/assign', { taskId: selectedTask.id, assignedTo: new FormData(e.target).get('staffId') });
            toast.success("Task assigned successfully!");
            setShowAssignModal(false); fetchTasks();
        } catch (e) { toast.error("Failed to assign task"); }
    };

    const handleApproveUnlock = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/tasks/approve-unlock', { taskId: selectedTask.id, additionalHours: new FormData(e.target).get('hours'), managerId: loggedInUser.id });
            toast.success("Task unlocked!");
            setShowUnlockModal(false); fetchTasks();
        } catch (e) { toast.error("Failed to approve unlock"); }
    };

    const handleRejectTask = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/tasks/reject', { taskId: selectedTask.id, reason: new FormData(e.target).get('reason') });
            toast.success("Task Rejected & Negative KPI logged.");
            setShowOverviewModal(false); fetchTasks();
        } catch (e) { toast.error("Failed to reject task"); }
    };

    const filteredTasks = tasks.filter(task => {
        if (dateFilter === 'all' || task.taskType === 'CUSTOM' || !task.timetable?.date) return true;
        
        const taskDate = new Date(task.timetable.date).setHours(0,0,0,0);
        const today = new Date().setHours(0,0,0,0);
        const tomorrow = today + 86400000;
        const next2Days = today + (86400000 * 2);

        if (dateFilter === 'today') return taskDate === today;
        if (dateFilter === 'tomorrow') return taskDate === tomorrow;
        if (dateFilter === 'next2days') return taskDate === tomorrow || taskDate === next2Days;
        return true;
    });

    const getTaskDetails = (task) => {
        if (task.taskType === 'CUSTOM') return { icon: CheckSquare, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-500/20', label: task.customTitle || 'Custom Task' };
        switch(task.taskType) {
            case 'LIVE_LINK': return { icon: Play, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-500/20', label: 'Upload Live Link' };
            case 'RECORDING': return { icon: Video, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-500/20', label: 'Upload Recording' };
            case 'NOTES': return { icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20', label: 'Upload PDF Notes' };
            case 'MCQ': return { icon: FileText, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-500/20', label: 'Upload MCQ Paper' };
            case 'STRUCTURED_PAPER': return { icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-500/20', label: 'Upload Structured Paper' };
            default: return { icon: CheckSquare, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-500/20', label: task.taskType.replace('_', ' ') };
        }
    };

    const formatDeadline = (dateString) => {
        if (!dateString) return 'No Deadline';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <div className="w-full text-slate-200 font-sans pb-4">
            {/* Header & Tabs */}
            <div className="mb-6 bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-700/50 w-full md:w-1/3 hover:border-blue-500/50 transition-colors">
                        <Filter size={18} className="text-blue-400 shrink-0 ml-2" />
                        <select value={selectedBiz} onChange={(e) => setSelectedBiz(e.target.value)} className="w-full bg-transparent text-white font-medium outline-none appearance-none cursor-pointer text-sm">
                            <option value="" className="bg-slate-800">-- Select Business --</option>
                            {businesses.map(b => <option key={b.id} value={b.id} className="bg-slate-800">{b.name}</option>)}
                        </select>
                    </div>

                    {activeTab !== 'settings' && selectedBiz && (
                        <div className="flex bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50 overflow-x-auto gap-1">
                            {['all', 'today', 'tomorrow', 'next2days'].map(filter => (
                                <button key={filter} onClick={() => setDateFilter(filter)} 
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${dateFilter === filter ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                                    {filter === 'all' ? 'All' : filter === 'today' ? 'Ada' : filter === 'tomorrow' ? 'Heta' : 'Anidda'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-1">
                    <button onClick={() => setActiveTab('pending')} className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border ${activeTab === 'pending' ? 'bg-blue-600/10 text-blue-400 border-blue-500/30' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800'}`}>Unassigned</button>
                    <button onClick={() => setActiveTab('in_progress')} className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border ${activeTab === 'in_progress' ? 'bg-purple-600/10 text-purple-400 border-purple-500/30' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800'}`}>In Progress</button>
                    <button onClick={() => setActiveTab('requests')} className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border flex items-center gap-2 ${activeTab === 'requests' ? 'bg-red-600/10 text-red-400 border-red-500/30' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800'}`}><AlertTriangle size={16}/> Unlock Requests</button>
                    <button onClick={() => setActiveTab('completed')} className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border ${activeTab === 'completed' ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800'}`}>Completed</button>
                    <button onClick={() => setActiveTab('settings')} className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 border flex items-center gap-2 ml-auto ${activeTab === 'settings' ? 'bg-slate-700/50 text-white border-slate-500/30' : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800'}`}><Settings size={16}/> Settings</button>
                </div>
            </div>

            {activeTab === 'settings' ? <ManagerTaskSettings businesses={businesses} staffList={staffList} /> : 
                selectedBiz && (
                    <div className="space-y-4">
                        {loading ? <div className="text-center py-12 text-slate-400 animate-pulse font-medium">Loading tasks...</div> : filteredTasks.length === 0 ? (
                            <div className="bg-slate-800/30 border border-slate-700/50 p-12 rounded-2xl text-center flex flex-col items-center justify-center">
                                <div className="bg-slate-800 p-4 rounded-full mb-4"><CheckCircle2 size={36} className="text-slate-500" /></div>
                                <h3 className="text-lg font-semibold text-slate-300 mb-1">No tasks found</h3>
                                <p className="text-slate-500 text-sm">You're all caught up for this selection.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredTasks.map(task => {
                                    const details = getTaskDetails(task);
                                    const TaskIcon = details.icon;
                                    const isMainTaskWithSubs = task.subTasks && task.subTasks.length > 0;

                                    return (
                                        <div key={task.id} className={`relative bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${task.isOverdue && task.status !== 'COMPLETED' ? 'hover:shadow-red-900/20 hover:border-red-500/50' : 'hover:shadow-blue-900/20 hover:border-blue-500/50'}`}>
                                            {task.isOverdue && task.status !== 'COMPLETED' && <div className="absolute -top-[1px] -left-[1px] -right-[1px] h-[3px] bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0 rounded-t-2xl opacity-70"></div>}
                                            <div className="flex justify-between items-start mb-5">
                                                <div className={`p-2.5 rounded-xl ${details.bg} border ${details.border} shadow-inner flex items-center justify-center`}>
                                                    <TaskIcon className={details.color} size={20} />
                                                </div>
                                                {!isMainTaskWithSubs && task.deadline && (
                                                    <div className="flex flex-col items-end">
                                                        <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm ${task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : task.isOverdue ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' : 'bg-slate-900/80 text-orange-400 border border-slate-700/50'}`}>
                                                            <Clock size={12}/>
                                                            {task.status === 'COMPLETED' ? 'COMPLETED' : formatDeadline(task.deadline)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <h4 className="text-lg font-bold text-white mb-1.5 leading-tight">{details.label}</h4>
                                            {task.taskType !== 'CUSTOM' ? (
                                                <p className="text-sm text-blue-400 mb-5 font-medium truncate">{task.timetable?.subjectName} - {task.timetable?.title}</p>
                                            ) : (
                                                <p className="text-sm text-slate-400 mb-5 line-clamp-2">{task.customDesc}</p>
                                            )}
                                            
                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 text-sm text-slate-300 space-y-2.5 mb-5 flex-1 shadow-inner">
                                                {task.taskType !== 'CUSTOM' && task.timetable ? (
                                                    <>
                                                        <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Class Date</span> <span className="font-semibold">{task.timetable.date.split('T')[0]}</span></div>
                                                        <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Time</span> <span className="font-semibold text-slate-200">{task.timetable.startTime} - {task.timetable.endTime}</span></div>
                                                    </>
                                                ) : null}
                                                <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Batch</span> <span className="truncate max-w-[140px] font-semibold bg-slate-800 px-2 py-0.5 rounded text-xs">{task.batch?.name || 'N/A'}</span></div>
                                                
                                                {task.assignedUser && (
                                                    <div className="pt-3 border-t border-slate-700/50 mt-3 flex justify-between items-center">
                                                        <span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Assigned</span> 
                                                        <span className="text-blue-400 font-bold flex items-center gap-1.5">
                                                            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-300">{task.assignedUser.firstName.charAt(0)}</div>
                                                            {task.assignedUser.firstName}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {isMainTaskWithSubs && (
                                                <div className="mb-5 space-y-2">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest pl-1">Checklist Items</p>
                                                    <div className="bg-slate-900/50 rounded-xl p-2.5 border border-slate-700/50 space-y-1">
                                                        {task.subTasks.map(sub => (
                                                            <div key={sub.id} className="flex justify-between items-center p-2 rounded-lg text-sm bg-slate-800/30">
                                                                <span className={sub.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}>{sub.customTitle}</span>
                                                                {sub.status === 'COMPLETED' ? <CheckCircle2 size={16} className="text-emerald-400"/> : <div className="w-4 h-4 rounded-full border-2 border-slate-600"></div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="mt-auto pt-2">
                                                {activeTab === 'pending' && <button onClick={() => { setSelectedTask(task); setShowAssignModal(true); }} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 font-semibold rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]">Assign Staff</button>}
                                                {activeTab === 'requests' && <button onClick={() => { setSelectedTask(task); setShowUnlockModal(true); }} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 font-semibold rounded-xl transition-all shadow-md active:scale-[0.98]">Review Request</button>}
                                                {activeTab === 'completed' && (
                                                    <button onClick={() => { setSelectedTask(task); setShowOverviewModal(true); }} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white py-3 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"><Eye size={18} /> View Overview</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )
            }

            {/* Modals... (Same as previous) */}
            {showAssignModal && selectedTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-1">Assign Task</h3>
                        <p className="text-sm text-blue-400 font-medium mb-6">{selectedTask.timetable?.subjectName || selectedTask.customTitle}</p>
                        <form onSubmit={handleAssign}>
                            <select name="staffId" required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500 mb-6 text-sm shadow-inner transition-colors">
                                <option value="">Select Coordinator...</option>
                                {staffList.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                            </select>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-blue-600/20">Assign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showOverviewModal && selectedTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Eye className="text-blue-400"/> Task Overview</h3>
                            <button onClick={() => setShowOverviewModal(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 mb-6 pr-2">
                            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 text-sm text-slate-300">
                                <p className="mb-2 flex items-center gap-2"><span className="text-slate-500 font-medium">Executed By:</span> <span className="font-semibold text-white bg-slate-800 px-2 py-1 rounded">{selectedTask.assignedUser?.firstName} {selectedTask.assignedUser?.lastName}</span></p>
                                <p className="flex items-center gap-2"><span className="text-slate-500 font-medium">Completed On:</span> <span className="text-emerald-400 font-medium">{new Date(selectedTask.completedAt).toLocaleString()}</span></p>
                            </div>

                            {selectedTask.taskType !== 'CUSTOM' && selectedTask.content && (
                                <div className="bg-blue-900/10 p-5 rounded-xl border border-blue-500/20 space-y-3 text-sm">
                                    <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2"><CheckCircle2 size={16}/> Published Content</h4>
                                    <p><span className="text-slate-500 font-medium">Title:</span> <span className="font-semibold text-slate-200">{selectedTask.content.title}</span></p>
                                    {selectedTask.content.link && (
                                        <p className="flex items-center gap-2 pt-2"><span className="text-slate-500 font-medium">Link:</span> <a href={selectedTask.content.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors">{selectedTask.content.link} <ExternalLink size={14}/></a></p>
                                    )}
                                    {selectedTask.content.fileName && (
                                        <p className="flex items-center gap-2 pt-2"><span className="text-slate-500 font-medium">File:</span> <a href={`${api.defaults.baseURL.replace('/api','')}/storage/documents/${selectedTask.content.fileName}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors">View Uploaded Document <ExternalLink size={14}/></a></p>
                                    )}
                                </div>
                            )}

                            {selectedTask.taskType === 'CUSTOM' && selectedTask.proofUrl && (
                                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 h-72 flex items-center justify-center">
                                    {selectedTask.proofType === 'pdf' ? (
                                        <a href={`${api.defaults.baseURL.replace('/api', '')}/storage/documents/${selectedTask.proofUrl}`} target="_blank" rel="noreferrer" className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2"><FileText size={18}/> Open PDF Proof</a>
                                    ) : (
                                        <img src={`${api.defaults.baseURL.replace('/api', '')}/storage/documents/${selectedTask.proofUrl}`} alt="Proof" className="max-h-full max-w-full object-contain rounded-lg shadow-lg" />
                                    )}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleRejectTask} className="mt-auto border-t border-slate-700/60 pt-5 bg-slate-900">
                            <label className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 block flex items-center gap-1.5"><AlertTriangle size={14}/> Reject Task & Re-assign</label>
                            <div className="flex gap-3">
                                <input type="text" name="reason" required placeholder="Reason for rejection (Logs negative KPI)..." className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none focus:border-red-500 transition-colors" />
                                <button type="submit" className="bg-red-600/90 hover:bg-red-500 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors flex items-center gap-2 shadow-lg shadow-red-900/20"><RefreshCcw size={16}/> Reject</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// MANAGER TASK SETTINGS COMPONENT
// ---------------------------------------------------------------------------
const ManagerTaskSettings = ({ businesses, staffList }) => {
    const [biz, setBiz] = useState('');
    
    // System Timers State
    const [templates, setTemplates] = useState([
        { taskType: 'LIVE_LINK', isRequired: true, deadlineHours: 1 },
        { taskType: 'RECORDING', isRequired: true, deadlineHours: 24 },
        { taskType: 'NOTES', isRequired: true, deadlineHours: 24 },
        { taskType: 'MCQ', isRequired: true, deadlineHours: 48 },
        { taskType: 'STRUCTURED_PAPER', isRequired: true, deadlineHours: 48 }
    ]);
    
    // Custom Task Templates State
    const [customTemplates, setCustomTemplates] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [ctForm, setCtForm] = useState({
        title: '', description: '', startTime: '', endTime: '', dayOfMonth: '', allocationType: 'MANUAL', autoAssignTo: ''
    });
    
    const [hasSubTasks, setHasSubTasks] = useState(false);
    const [subTasks, setSubTasks] = useState([]);

    useEffect(() => {
        if(biz) {
            // Fetch System Timers
            api.get(`/admin/tasks/templates/${biz}`).then(res => {
                if(res.data && res.data.length > 0) {
                    const merged = templates.map(t => res.data.find(dbT => dbT.taskType === t.taskType) || t);
                    setTemplates(merged);
                }
            });

            // Fetch Custom Templates
            fetchCustomTemplates();
        }
    }, [biz]);

    const fetchCustomTemplates = () => {
        api.get(`/admin/tasks/custom-templates/${biz}`).then(res => {
            setCustomTemplates(res.data || []);
        }).catch(e => console.log("Failed to load templates"));
    };

    const saveSystemTimers = async () => {
        if(!biz) return toast.error("Select a business first");
        try {
            await api.post('/admin/tasks/templates', { businessId: biz, templates });
            toast.success("Timers Saved!");
        } catch(e) { toast.error("Failed to save"); }
    };

    const handleCtFormChange = (e) => {
        setCtForm({ ...ctForm, [e.target.name]: e.target.value });
    };

    const saveCustomTaskTemplate = async (e) => {
        e.preventDefault();
        if(!biz) return toast.error("Select a business first");
        
        try {
            const payload = { ...ctForm, businessId: biz, subTasks: hasSubTasks ? subTasks : [] };
            if (editingId) payload.id = editingId;

            await api.post('/admin/tasks/custom-templates', payload);
            toast.success(editingId ? "Template Updated!" : "Template Created!");
            
            fetchCustomTemplates();
            resetCustomForm();
        } catch(e) { toast.error("Failed to save custom template"); }
    };

    const editTemplate = (t) => {
        setEditingId(t.id);
        setCtForm({
            title: t.title, description: t.description || '', startTime: t.startTime, endTime: t.endTime,
            dayOfMonth: t.dayOfMonth || '', allocationType: t.allocationType || 'MANUAL', autoAssignTo: t.autoAssignTo || ''
        });
        const st = typeof t.subTasks === 'string' ? JSON.parse(t.subTasks) : (t.subTasks || []);
        if (st && st.length > 0) {
            setHasSubTasks(true); setSubTasks(st);
        } else {
            setHasSubTasks(false); setSubTasks([]);
        }
    };

    const deleteTemplate = async (id) => {
        if(!window.confirm("Are you sure you want to delete this template?")) return;
        try {
            await api.delete(`/admin/tasks/custom-templates/${id}`);
            setCustomTemplates(customTemplates.filter(t => t.id !== id));
            toast.success("Template Deleted");
        } catch(e) { toast.error("Failed to delete template"); }
    };

    const resetCustomForm = () => {
        setEditingId(null);
        setCtForm({ title: '', description: '', startTime: '', endTime: '', dayOfMonth: '', allocationType: 'MANUAL', autoAssignTo: '' });
        setHasSubTasks(false); setSubTasks([]);
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* SYSTEM TIMERS */}
            <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-lg h-fit">
                <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2"><Clock className="text-blue-400"/> System Automation Timers</h3>
                <select value={biz} onChange={e=>setBiz(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm font-medium mb-6 outline-none focus:border-blue-500 shadow-inner">
                    <option value="">Select Business to Configure...</option>
                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                <div className="space-y-3">
                    {templates.map((t, idx) => (
                        <div key={t.taskType} className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                            <div>
                                <p className="font-bold text-slate-200 text-sm tracking-wide">{t.taskType.replace('_', ' ')}</p>
                                <p className={`text-[10px] font-bold uppercase mt-1 ${t.taskType === 'RECORDING' ? 'text-purple-400' : 'text-blue-400'}`}>
                                    {t.taskType === 'RECORDING' ? 'Hrs AFTER class' : 'Hrs BEFORE class'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="number" value={t.deadlineHours} onChange={e => {const newT = [...templates]; newT[idx].deadlineHours = e.target.value; setTemplates(newT);}} className="w-16 bg-slate-800 border border-slate-600 rounded-lg p-2 font-bold text-white text-center text-sm outline-none focus:border-blue-500" />
                                <span className="text-xs text-slate-500 font-medium">Hrs</span>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={saveSystemTimers} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl mt-6 transition-colors text-sm shadow-lg shadow-blue-600/20 active:scale-[0.98]">Save Automation Timers</button>
            </div>

            {/* CUSTOM TASK TEMPLATES */}
            <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2"><Calendar className="text-pink-400"/> Custom Tasks Manager</h3>
                
                {/* Form */}
                <form onSubmit={saveCustomTaskTemplate} className="space-y-4 bg-slate-900/50 p-5 rounded-xl border border-slate-700/50">
                    <h4 className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-700/50 pb-2">{editingId ? 'Edit Template' : 'Create New Template'}</h4>
                    
                    <input type="text" name="title" value={ctForm.title} onChange={handleCtFormChange} required placeholder="Task Title (e.g. Monthly Report)" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500 shadow-inner" />
                    <textarea name="description" value={ctForm.description} onChange={handleCtFormChange} rows="2" placeholder="Task Description & Guidelines..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500 resize-none shadow-inner"></textarea>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Start Time (Must)</label>
                            <input type="time" name="startTime" value={ctForm.startTime} onChange={handleCtFormChange} required className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500 [color-scheme:dark]" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">End Time (Must)</label>
                            <input type="time" name="endTime" value={ctForm.endTime} onChange={handleCtFormChange} required className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500 [color-scheme:dark]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Day of Month (Optional)</label>
                            <input type="number" name="dayOfMonth" min="1" max="31" value={ctForm.dayOfMonth} onChange={handleCtFormChange} placeholder="e.g. 5" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Auto Assign To (Optional)</label>
                            <select name="autoAssignTo" value={ctForm.autoAssignTo} onChange={handleCtFormChange} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500">
                                <option value="">Select Staff...</option>
                                {staffList.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Allocation Rule</label>
                        <select name="allocationType" value={ctForm.allocationType} onChange={handleCtFormChange} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500">
                            <option value="MANUAL">Manual / Specific Day Only</option>
                            <option value="DAILY">Daily (Everyday Auto-Allocate)</option>
                            <option value="CLASS_LINKED">Linked to Timetable Classes</option>
                        </select>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors mt-2">
                        <input type="checkbox" checked={hasSubTasks} onChange={e=>setHasSubTasks(e.target.checked)} className="w-5 h-5 accent-pink-500 rounded" />
                        <span className="text-sm font-semibold text-slate-200">Contains multiple Checklist Items?</span>
                    </label>

                    {hasSubTasks && (
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-inner space-y-3">
                            {subTasks.map((st, i) => (
                                <div key={i} className="flex gap-2 items-center bg-slate-800 p-2 rounded-lg border border-slate-700/50">
                                    <input type="text" value={st.title} onChange={e=>{const ns=[...subTasks]; ns[i].title=e.target.value; setSubTasks(ns)}} className="flex-1 bg-transparent p-2 text-sm text-white outline-none" placeholder="Sub-task title..."/>
                                    <input type="time" title="Start Time" value={st.startTime || ''} onChange={e=>{const ns=[...subTasks]; ns[i].startTime=e.target.value; setSubTasks(ns)}} className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none [color-scheme:dark]" />
                                    <input type="time" title="End Time" value={st.endTime || ''} onChange={e=>{const ns=[...subTasks]; ns[i].endTime=e.target.value; setSubTasks(ns)}} className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none [color-scheme:dark]" />
                                    <button type="button" onClick={() => setSubTasks(subTasks.filter((_,idx)=>idx!==i))} className="p-2 text-slate-500 hover:text-red-400 bg-slate-900 rounded-lg transition-colors"><Trash2 size={14}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={()=>setSubTasks([...subTasks, {title:'', startTime:'', endTime:''}])} className="text-pink-400 font-bold text-xs flex items-center gap-1.5 hover:text-pink-300 transition-colors bg-pink-500/10 px-3 py-1.5 rounded-lg w-fit"><Plus size={14}/> Add Sub-Task</button>
                        </div>
                    )}
                    
                    <div className="flex gap-3 pt-2">
                        {editingId && <button type="button" onClick={resetCustomForm} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">Cancel Edit</button>}
                        <button type="submit" className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl transition-colors text-sm active:scale-[0.98]">{editingId ? 'Update Template' : 'Create Template'}</button>
                    </div>
                </form>

                {/* Templates List */}
                {customTemplates.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 border-b border-slate-700 pb-2">Saved Custom Templates</h4>
                        {customTemplates.map(t => (
                            <div key={t.id} className="bg-slate-900/50 p-4 border border-slate-700/50 rounded-xl flex justify-between items-center hover:border-slate-600 transition-colors">
                                <div>
                                    <h5 className="font-bold text-slate-200 text-sm">{t.title}</h5>
                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                                        <span className="bg-slate-800 px-2 py-0.5 rounded">{t.startTime} - {t.endTime}</span>
                                        <span className={`px-2 py-0.5 rounded font-bold ${t.allocationType === 'CLASS_LINKED' ? 'text-blue-400 bg-blue-500/10' : t.allocationType === 'DAILY' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800'}`}>{t.allocationType.replace('_', ' ')}</span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => editTemplate(t)} className="p-2 bg-slate-800 rounded-lg text-blue-400 hover:bg-slate-700 transition-colors"><Edit size={16}/></button>
                                    <button onClick={() => deleteTemplate(t.id)} className="p-2 bg-slate-800 rounded-lg text-red-400 hover:bg-slate-700 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};