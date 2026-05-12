import React, { useState, useEffect } from 'react';
import { 
    CheckSquare, Clock, AlertTriangle, Filter, CheckCircle2, 
    X, Plus, Trash2, Settings, Eye, Play, Video, FileText, Calendar, RefreshCcw, ExternalLink, Edit, Users, Check, Globe, LayoutDashboard
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

    const [selectedTaskIds, setSelectedTaskIds] = useState([]); 

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [showOverviewModal, setShowOverviewModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    useEffect(() => { fetchInitialData(); }, []);
    useEffect(() => { 
        if (selectedBiz) fetchTasks(); 
        setSelectedTaskIds([]); 
    }, [selectedBiz, activeTab, dateFilter]);

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
        const staffId = new FormData(e.target).get('staffId');
        try {
            if (selectedTaskIds.length > 0) {
                await Promise.all(selectedTaskIds.map(taskId => api.post('/admin/tasks/assign', { taskId, assignedTo: staffId })));
                toast.success(`${selectedTaskIds.length} Tasks assigned successfully!`);
            } else {
                await api.post('/admin/tasks/assign', { taskId: selectedTask.id, assignedTo: staffId });
                toast.success("Task assigned successfully!");
            }
            setShowAssignModal(false); 
            setSelectedTaskIds([]); 
            fetchTasks();
        } catch (e) { toast.error("Failed to assign task(s)"); }
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

    const toggleTaskSelection = (id) => {
        setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
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

    const selectAllTasks = () => {
        if (selectedTaskIds.length === filteredTasks.length) setSelectedTaskIds([]);
        else setSelectedTaskIds(filteredTasks.map(t => t.id));
    };

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

    const navTabs = [
        { id: 'pending', label: 'Unassigned', icon: Clock, count: activeTab === 'pending' ? tasks.length : null },
        { id: 'in_progress', label: 'In Progress', icon: RefreshCcw },
        { id: 'requests', label: 'Unlock Requests', icon: AlertTriangle },
        { id: 'completed', label: 'Completed', icon: CheckCircle2 },
        { id: 'settings', label: 'Automation', icon: Settings, isRight: true }
    ];

    return (
        <div className="w-full min-h-screen text-slate-300 font-sans pb-24 bg-[#0a0f1c]">
            
            {/* FLOATING BULK ACTION BAR */}
            {selectedTaskIds.length > 0 && activeTab === 'pending' && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1e293b] border border-slate-700 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-10">
                    <span className="text-white font-semibold text-sm">{selectedTaskIds.length} Tasks Selected</span>
                    <div className="w-px h-5 bg-slate-700"></div>
                    <button onClick={() => { setSelectedTask(null); setShowAssignModal(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full font-medium text-sm transition-colors flex items-center gap-2">
                        <Users size={16}/> Bulk Assign
                    </button>
                    <button onClick={() => setSelectedTaskIds([])} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"><X size={16}/></button>
                </div>
            )}

            {/* Header & Tabs */}
            <div className="mb-6 bg-[#131b2c] border border-slate-800 p-5 rounded-2xl shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3 bg-[#0a0f1c] px-4 py-2.5 rounded-xl border border-slate-800 w-full md:w-1/3 focus-within:border-indigo-500/50 transition-colors">
                        <Filter size={16} className="text-slate-400 shrink-0" />
                        <select value={selectedBiz} onChange={(e) => setSelectedBiz(e.target.value)} className="w-full bg-transparent text-slate-200 font-medium outline-none text-sm cursor-pointer">
                            <option value="" className="bg-slate-900">-- Select Business --</option>
                            {businesses.map(b => <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>)}
                        </select>
                    </div>

                    {activeTab !== 'settings' && selectedBiz && (
                        <div className="flex bg-[#0a0f1c] p-1 rounded-xl border border-slate-800 overflow-x-auto gap-1">
                            {['all', 'today', 'tomorrow', 'next2days'].map(filter => (
                                <button key={filter} onClick={() => setDateFilter(filter)} 
                                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${dateFilter === filter ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                                    {filter === 'all' ? 'All Days' : filter === 'today' ? 'Today' : filter === 'tomorrow' ? 'Tomorrow' : 'Next 2 Days'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-2 overflow-x-auto custom-scrollbar pt-1 border-t border-slate-800">
                    {navTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id)} 
                                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${tab.isRight ? 'ml-auto' : ''} ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                            >
                                <Icon size={16} className={isActive ? 'text-white' : 'text-slate-500'}/> 
                                {tab.label} 
                                {tab.count > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-md text-white text-xs ml-1">{tab.count}</span>}
                            </button>
                        )
                    })}
                </div>
            </div>

            {activeTab === 'settings' ? <ManagerTaskSettings businesses={businesses} staffList={staffList} /> : 
                selectedBiz && (
                    <div className="space-y-4">
                        {activeTab === 'pending' && filteredTasks.length > 0 && (
                            <div className="flex justify-end mb-4 px-2">
                                <label className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                                    <input type="checkbox" checked={selectedTaskIds.length === filteredTasks.length} onChange={selectAllTasks} className="w-4 h-4 accent-indigo-500 rounded border-slate-600"/>
                                    <span className="text-sm font-medium text-slate-300">Select All Tasks</span>
                                </label>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <RefreshCcw size={24} className="animate-spin mb-3 text-indigo-500"/>
                                <span className="font-medium text-sm">Fetching Tasks...</span>
                            </div>
                        ) : filteredTasks.length === 0 ? (
                            <div className="bg-[#131b2c] border border-slate-800 py-20 px-6 rounded-2xl text-center flex flex-col items-center justify-center mt-4">
                                <div className="bg-slate-800/50 p-4 rounded-full mb-4 text-emerald-500"><CheckCircle2 size={40} /></div>
                                <h3 className="text-xl font-semibold text-white mb-1">No tasks found</h3>
                                <p className="text-slate-400 text-sm">You're all caught up for this view.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {filteredTasks.map(task => {
                                    const details = getTaskDetails(task);
                                    const TaskIcon = details.icon;
                                    const isMainTaskWithSubs = task.subTasks && task.subTasks.length > 0;
                                    const isSelected = selectedTaskIds.includes(task.id);

                                    return (
                                        <div key={task.id} onClick={() => { if(activeTab === 'pending') toggleTaskSelection(task.id) }} className={`relative bg-[#131b2c] border p-5 rounded-2xl flex flex-col transition-all shadow-sm ${isSelected ? 'border-indigo-500 bg-indigo-500/5' : task.isOverdue && task.status !== 'COMPLETED' ? 'border-red-500/50' : 'border-slate-800 hover:border-slate-700'} ${activeTab === 'pending' ? 'cursor-pointer' : ''}`}>
                                            
                                            {activeTab === 'pending' && (
                                                <div className="absolute top-5 right-5 z-10">
                                                    <input type="checkbox" checked={isSelected} onChange={() => toggleTaskSelection(task.id)} onClick={e=>e.stopPropagation()} className="w-5 h-5 accent-indigo-500 rounded cursor-pointer border-slate-600"/>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-3 mb-4 pr-8">
                                                <div className={`p-2.5 rounded-xl ${details.bg} border ${details.border} flex items-center justify-center shrink-0`}>
                                                    <TaskIcon className={details.color} size={20} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-base font-semibold text-slate-100 truncate">{details.label}</h4>
                                                    {task.isOverdue && task.status !== 'COMPLETED' && <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-medium mt-1 inline-block border border-red-500/20">Overdue</span>}
                                                </div>
                                            </div>
                                            
                                            {task.taskType !== 'CUSTOM' ? (
                                                <p className="text-sm text-slate-300 mb-4 font-medium truncate">{task.timetable?.subjectName} - {task.timetable?.title}</p>
                                            ) : (
                                                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{task.customDesc}</p>
                                            )}
                                            
                                            <div className="bg-[#0a0f1c] p-3.5 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2 mb-5 flex-1">
                                                {task.taskType !== 'CUSTOM' && task.timetable ? (
                                                    <>
                                                        <div className="flex justify-between items-center"><span>Class Date</span> <span className="font-medium text-slate-300">{task.timetable.date.split('T')[0]}</span></div>
                                                        <div className="flex justify-between items-center"><span>Time</span> <span className="font-medium text-slate-300">{task.timetable.startTime} - {task.timetable.endTime}</span></div>
                                                    </>
                                                ) : null}
                                                <div className="flex justify-between items-center"><span>Batch</span> <span className="truncate max-w-[140px] font-medium text-slate-300">{task.batch?.name || 'N/A'}</span></div>
                                                
                                                {task.assignedUser && (
                                                    <div className="pt-2 border-t border-slate-800 mt-2 flex justify-between items-center">
                                                        <span>Assigned To</span> 
                                                        <span className="text-slate-300 font-medium flex items-center gap-1.5">
                                                            <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px]">{task.assignedUser.firstName.charAt(0)}</div>
                                                            {task.assignedUser.firstName}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {isMainTaskWithSubs && (
                                                <div className="mb-5 border border-slate-800 rounded-xl p-3 bg-[#0a0f1c]">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Checklist Items</p>
                                                    <div className="space-y-1.5">
                                                        {task.subTasks.map(sub => (
                                                            <div key={sub.id} className="flex justify-between items-center p-2 rounded-lg text-xs bg-[#131b2c] border border-slate-800">
                                                                <span className={sub.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-300'}>{sub.customTitle}</span>
                                                                {sub.status === 'COMPLETED' ? <CheckCircle2 size={14} className="text-emerald-500"/> : <div className="w-3 h-3 rounded-full border-2 border-slate-600"></div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="mt-auto flex items-center gap-3">
                                                {!isMainTaskWithSubs && task.deadline && (
                                                    <div className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border ${task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : task.isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-[#0a0f1c] text-slate-400 border-slate-800'}`}>
                                                        <Clock size={14}/>
                                                        {task.status === 'COMPLETED' ? 'Completed' : formatDeadline(task.deadline)}
                                                    </div>
                                                )}

                                                {activeTab === 'pending' && selectedTaskIds.length === 0 && (
                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setShowAssignModal(true); }} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 font-medium rounded-xl transition-colors text-sm">Assign Staff</button>
                                                )}

                                                {activeTab === 'requests' && <button onClick={() => { setSelectedTask(task); setShowUnlockModal(true); }} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-2 font-medium text-sm rounded-xl transition-colors">Review Request</button>}
                                                
                                                {activeTab === 'completed' && (
                                                    <button onClick={() => { setSelectedTask(task); setShowOverviewModal(true); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"><Eye size={16} /> Overview</button>
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

            {/* ASSIGN MODAL */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#131b2c] border border-slate-800 rounded-2xl p-6 md:p-8 w-full max-w-sm shadow-xl relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2"><Users className="text-indigo-500" size={20}/> Assign Task</h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-lg transition-colors"><X size={18}/></button>
                        </div>
                        
                        {selectedTaskIds.length > 0 ? (
                            <p className="text-sm text-indigo-300 bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20 text-center mb-6">Assigning {selectedTaskIds.length} tasks in bulk.</p>
                        ) : (
                            <p className="text-sm text-slate-300 bg-[#0a0f1c] p-3 rounded-lg border border-slate-800 text-center mb-6 truncate">{selectedTask?.timetable?.subjectName || selectedTask?.customTitle}</p>
                        )}

                        <form onSubmit={handleAssign}>
                            <label className="text-xs font-semibold text-slate-400 mb-2 block">Select Coordinator/Staff</label>
                            <select name="staffId" required className="w-full bg-[#0a0f1c] border border-slate-800 rounded-xl p-3 text-white text-sm font-medium outline-none focus:border-indigo-500 mb-6 cursor-pointer">
                                <option value="" className="text-slate-500">Select a person...</option>
                                {staffList.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                            </select>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                                <Check size={18}/> Confirm Assignment
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* OVERVIEW MODAL */}
            {showOverviewModal && selectedTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#131b2c] border border-slate-800 rounded-2xl p-6 md:p-8 w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4 shrink-0">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2"><LayoutDashboard className="text-indigo-500" size={20}/> Task Overview</h3>
                            <button onClick={() => setShowOverviewModal(false)} className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-lg transition-colors"><X size={18}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 mb-6 pr-2">
                            <div className="bg-[#0a0f1c] p-5 rounded-xl border border-slate-800 text-sm text-slate-300 flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Executed By</p>
                                    <p className="font-medium text-white">{selectedTask.assignedUser?.firstName} {selectedTask.assignedUser?.lastName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Completed On</p>
                                    <p className="text-emerald-400 font-medium">{new Date(selectedTask.completedAt).toLocaleString()}</p>
                                </div>
                            </div>

                            {selectedTask.taskType !== 'CUSTOM' && selectedTask.content && (
                                <div className="bg-indigo-500/5 p-5 rounded-xl border border-indigo-500/20 space-y-4 text-sm">
                                    <h4 className="text-indigo-400 font-semibold mb-2 flex items-center gap-2"><Globe size={16}/> Content Details</h4>
                                    <div>
                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Title</p>
                                        <p className="font-medium text-slate-200">{selectedTask.content.title}</p>
                                    </div>
                                    {selectedTask.content.link && (
                                        <div className="pt-2">
                                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">URL Link</p>
                                            <a href={selectedTask.content.link} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1.5 w-max">
                                                {selectedTask.content.link} <ExternalLink size={14}/>
                                            </a>
                                        </div>
                                    )}
                                    {selectedTask.content.fileName && (
                                        <div className="pt-2">
                                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Attached File</p>
                                            <a href={`${api.defaults.baseURL.replace('/api','')}/storage/documents/${selectedTask.content.fileName}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1.5 w-max">
                                                View Document <ExternalLink size={14}/>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedTask.taskType === 'CUSTOM' && selectedTask.proofUrl && (
                                <div className="bg-[#0a0f1c] rounded-xl p-4 border border-slate-800 h-64 flex items-center justify-center">
                                    {selectedTask.proofType === 'pdf' ? (
                                        <a href={`${api.defaults.baseURL.replace('/api', '')}/storage/documents/${selectedTask.proofUrl}`} target="_blank" rel="noreferrer" className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center gap-2"><FileText size={18}/> Open PDF Proof</a>
                                    ) : (
                                        <img src={`${api.defaults.baseURL.replace('/api', '')}/storage/documents/${selectedTask.proofUrl}`} alt="Proof" className="max-h-full max-w-full object-contain rounded-lg border border-slate-700" />
                                    )}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleRejectTask} className="border-t border-slate-800 pt-5 shrink-0">
                            <label className="text-xs font-semibold text-slate-400 mb-2 block flex items-center gap-1.5"><AlertTriangle size={14} className="text-red-400"/> Reject & Re-assign</label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input type="text" name="reason" required placeholder="Reason for rejection (Logs negative KPI)..." className="flex-1 bg-[#0a0f1c] border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-red-500 transition-colors" />
                                <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-medium px-6 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"><RefreshCcw size={16}/> Reject</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* UNLOCK MODAL (Manager views staff request) */}
            {showUnlockModal && selectedTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#131b2c] border border-slate-800 rounded-2xl p-6 md:p-8 w-full max-w-sm shadow-xl relative">
                        <div className="flex justify-between items-center mb-5 border-b border-slate-800 pb-4">
                            <h3 className="text-xl font-semibold text-white flex items-center gap-2"><AlertTriangle className="text-orange-400" size={20}/> Unlock Request</h3>
                            <button onClick={() => setShowUnlockModal(false)} className="text-slate-400 hover:text-white bg-slate-800/50 p-2 rounded-lg transition-colors"><X size={18}/></button>
                        </div>
                        
                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl mb-6">
                            <p className="text-[10px] font-semibold text-orange-400/70 uppercase tracking-wide mb-1">Staff Reason</p>
                            <p className="text-sm text-orange-200">{selectedTask.unlockReason}</p>
                        </div>

                        <form onSubmit={handleApproveUnlock}>
                            <label className="text-xs font-semibold text-slate-400 mb-2 block">Grant Extra Hours</label>
                            <input type="number" name="hours" min="1" max="72" required defaultValue="12" className="w-full bg-[#0a0f1c] border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-orange-500 mb-6" />
                            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                                <Check size={18}/> Approve Unlock
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// ------------------------------------------------------------------------------------
// MANAGER SETTINGS TAB (Automation Timers & Custom Tasks)
// ------------------------------------------------------------------------------------
const ManagerTaskSettings = ({ businesses, staffList }) => {
    const [biz, setBiz] = useState('');
    const [templates, setTemplates] = useState([
        { taskType: 'LIVE_LINK', isRequired: true, deadlineHours: 1 },
        { taskType: 'RECORDING', isRequired: true, deadlineHours: 24 },
        { taskType: 'NOTES', isRequired: true, deadlineHours: 24 },
        { taskType: 'MCQ', isRequired: true, deadlineHours: 48 },
        { taskType: 'STRUCTURED_PAPER', isRequired: true, deadlineHours: 48 }
    ]);
    const [customTemplates, setCustomTemplates] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [ctForm, setCtForm] = useState({
        title: '', description: '', startTime: '', endTime: '', dayOfMonth: '', allocationType: 'MANUAL', autoAssignTo: ''
    });
    const [hasSubTasks, setHasSubTasks] = useState(false);
    const [subTasks, setSubTasks] = useState([]);

    useEffect(() => {
        if(biz) {
            api.get(`/admin/tasks/templates/${biz}`).then(res => {
                if(res.data && res.data.length > 0) {
                    const merged = templates.map(t => res.data.find(dbT => dbT.taskType === t.taskType) || t);
                    setTemplates(merged);
                }
            });
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

    const handleCtFormChange = (e) => setCtForm({ ...ctForm, [e.target.name]: e.target.value });

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
        if (st && st.length > 0) { setHasSubTasks(true); setSubTasks(st); } 
        else { setHasSubTasks(false); setSubTasks([]); }
    };

    const deleteTemplate = async (id) => {
        if(!window.confirm("Delete this template?")) return;
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in duration-300">
            <div className="bg-[#131b2c] p-6 md:p-8 rounded-2xl border border-slate-800 shadow-sm h-fit">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2"><Clock className="text-indigo-400" size={20}/> System Automation Timers</h3>
                <select value={biz} onChange={e=>setBiz(e.target.value)} className="w-full bg-[#0a0f1c] border border-slate-800 rounded-xl p-3 text-white text-sm font-medium mb-6 outline-none focus:border-indigo-500 cursor-pointer">
                    <option value="" className="text-slate-500">Select Business to Configure...</option>
                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                <div className="space-y-3">
                    {templates.map((t, idx) => (
                        <div key={t.taskType} className="flex items-center justify-between bg-[#0a0f1c] p-4 rounded-xl border border-slate-800">
                            <div>
                                <p className="font-semibold text-slate-200 text-sm">{t.taskType.replace('_', ' ')}</p>
                                <p className={`text-[10px] font-medium uppercase mt-1 ${t.taskType === 'RECORDING' ? 'text-purple-400' : 'text-slate-400'}`}>
                                    {t.taskType === 'RECORDING' ? 'Hours AFTER class' : 'Hours BEFORE class'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-[#131b2c] border border-slate-700 p-1.5 rounded-lg focus-within:border-indigo-500 transition-colors">
                                <input type="number" value={t.deadlineHours} onChange={e => {const newT = [...templates]; newT[idx].deadlineHours = e.target.value; setTemplates(newT);}} className="w-12 bg-transparent font-semibold text-white text-center text-sm outline-none" />
                                <span className="text-xs text-slate-500 pr-2">Hrs</span>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={saveSystemTimers} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl mt-6 transition-colors text-sm">Save Automation Timers</button>
            </div>

            <div className="bg-[#131b2c] p-6 md:p-8 rounded-2xl border border-slate-800 shadow-sm">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2"><Calendar className="text-emerald-400" size={20}/> Custom Tasks Manager</h3>
                
                <form onSubmit={saveCustomTaskTemplate} className="space-y-4 bg-[#0a0f1c] p-5 rounded-xl border border-slate-800 mb-8">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-800 pb-2">{editingId ? 'Edit Template' : 'Create New Template'}</h4>
                    
                    <input type="text" name="title" value={ctForm.title} onChange={handleCtFormChange} required placeholder="Task Title (e.g. Monthly Report)" className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500" />
                    <textarea name="description" value={ctForm.description} onChange={handleCtFormChange} rows="2" placeholder="Task Description & Guidelines..." className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 resize-none"></textarea>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-semibold text-slate-500 ml-1 mb-1 block">Start Time</label>
                            <input type="time" name="startTime" value={ctForm.startTime} onChange={handleCtFormChange} required className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-slate-200 text-sm outline-none focus:border-indigo-500 [color-scheme:dark]" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-semibold text-slate-500 ml-1 mb-1 block">End Time</label>
                            <input type="time" name="endTime" value={ctForm.endTime} onChange={handleCtFormChange} required className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-slate-200 text-sm outline-none focus:border-indigo-500 [color-scheme:dark]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-semibold text-slate-500 ml-1 mb-1 block">Day of Month</label>
                            <input type="number" name="dayOfMonth" min="1" max="31" value={ctForm.dayOfMonth} onChange={handleCtFormChange} placeholder="e.g. 5" className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-slate-200 text-sm outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-semibold text-slate-500 ml-1 mb-1 block">Auto Assign To</label>
                            <select name="autoAssignTo" value={ctForm.autoAssignTo} onChange={handleCtFormChange} className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-slate-200 text-sm outline-none focus:border-indigo-500">
                                <option value="">Select Staff...</option>
                                {staffList.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] uppercase font-semibold text-slate-500 ml-1 mb-1 block">Allocation Rule</label>
                        <select name="allocationType" value={ctForm.allocationType} onChange={handleCtFormChange} className="w-full bg-[#131b2c] border border-slate-700 rounded-xl p-3 text-slate-200 text-sm outline-none focus:border-indigo-500">
                            <option value="MANUAL">Manual / Specific Day Only</option>
                            <option value="DAILY">Daily (Everyday Auto-Allocate)</option>
                            <option value="CLASS_LINKED">Linked to Timetable Classes</option>
                        </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                        <input type="checkbox" checked={hasSubTasks} onChange={e=>setHasSubTasks(e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded bg-slate-800 border-slate-700" />
                        <span className="text-sm font-medium text-slate-300">Contains multiple Checklist Items?</span>
                    </label>

                    {hasSubTasks && (
                        <div className="bg-[#131b2c] p-4 rounded-xl border border-slate-800 space-y-2 mt-2">
                            {subTasks.map((st, i) => (
                                <div key={i} className="flex gap-2 items-center bg-[#0a0f1c] p-2 rounded-lg border border-slate-800">
                                    <input type="text" value={st.title} onChange={e=>{const ns=[...subTasks]; ns[i].title=e.target.value; setSubTasks(ns)}} className="flex-1 bg-transparent px-2 text-xs text-white outline-none" placeholder="Sub-task title..."/>
                                    <input type="time" title="Start" value={st.startTime || ''} onChange={e=>{const ns=[...subTasks]; ns[i].startTime=e.target.value; setSubTasks(ns)}} className="w-20 bg-[#1e293b] border border-slate-700 rounded p-1.5 text-xs text-white outline-none [color-scheme:dark]" />
                                    <input type="time" title="End" value={st.endTime || ''} onChange={e=>{const ns=[...subTasks]; ns[i].endTime=e.target.value; setSubTasks(ns)}} className="w-20 bg-[#1e293b] border border-slate-700 rounded p-1.5 text-xs text-white outline-none [color-scheme:dark]" />
                                    <button type="button" onClick={() => setSubTasks(subTasks.filter((_,idx)=>idx!==i))} className="p-1.5 text-slate-500 hover:text-red-400 bg-slate-800 rounded transition-colors"><Trash2 size={14}/></button>
                                </div>
                            ))}
                            <button type="button" onClick={()=>setSubTasks([...subTasks, {title:'', startTime:'', endTime:''}])} className="text-emerald-400 text-xs font-medium flex items-center gap-1 hover:text-emerald-300 mt-2 px-2"><Plus size={12}/> Add Sub-Task</button>
                        </div>
                    )}
                    
                    <div className="flex gap-3 pt-3">
                        {editingId && <button type="button" onClick={resetCustomForm} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors text-sm">Cancel</button>}
                        <button type="submit" className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-colors text-sm">{editingId ? 'Update Template' : 'Create Template'}</button>
                    </div>
                </form>

                {/* Templates List */}
                {customTemplates.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pl-1 mb-2">Saved Custom Templates</h4>
                        {customTemplates.map(t => (
                            <div key={t.id} className="bg-[#0a0f1c] p-4 border border-slate-800 rounded-xl flex justify-between items-center hover:border-slate-700 transition-colors">
                                <div>
                                    <h5 className="font-semibold text-slate-200 text-sm mb-1">{t.title}</h5>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 text-[10px] font-medium">{t.startTime} - {t.endTime}</span>
                                        <span className="text-slate-400 text-[10px] px-1.5 bg-slate-800 rounded">{t.allocationType.replace('_', ' ')}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => editTemplate(t)} className="p-2 bg-[#131b2c] rounded-lg text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"><Edit size={14}/></button>
                                    <button onClick={() => deleteTemplate(t.id)} className="p-2 bg-[#131b2c] rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};