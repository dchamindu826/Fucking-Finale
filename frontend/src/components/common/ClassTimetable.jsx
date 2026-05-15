import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, BookOpen, User, X, Trash2, Filter, Building2, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function ClassTimetable() {
    const [loading, setLoading] = useState(false);
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = storedUser.role ? storedUser.role.toUpperCase() : 'STAFF';

    // Role Permissions
    const canEdit = userRole === 'SYSTEM_ADMIN' || userRole === 'MANAGER' || userRole === 'ASS_MANAGER';

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [schedule, setSchedule] = useState([]);
    
    // Selection State
    const [businesses, setBusinesses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [selectedBiz, setSelectedBiz] = useState('');
    const [selectedBatch, setSelectedBatch] = useState(null);

    // Content Hub Data
    const [subjects, setSubjects] = useState([]);
    const [lecturers, setLecturers] = useState([]);

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedBatch) {
            fetchSchedule();
            extractBatchData(selectedBatch);
        }
    }, [selectedBatch, currentDate]);

    const fetchInitialData = async () => {
        try {
            const bizRes = await api.get('/admin/businesses'); 
            setBusinesses(bizRes.data?.businesses || bizRes.data || []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleBusinessChange = async (e) => {
        const bizId = e.target.value;
        setSelectedBiz(bizId);
        setSelectedBatch(null);
        setSchedule([]);
        if (bizId) {
            try {
                const batchRes = await api.get(`/admin/batches/${bizId}`);
                setBatches(batchRes.data?.batches || batchRes.data || []);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const extractBatchData = (batch) => {
        let subs = [];
        batch?.groups?.forEach(g => {
            g.courses?.forEach(c => {
                if (!subs.find(s => s.name === c.name)) subs.push(c);
            });
        });
        setSubjects(subs);

        try {
            if (batch.lecturers) {
                setLecturers(JSON.parse(batch.lecturers));
            } else {
                setLecturers([]);
            }
        } catch (e) { setLecturers([]); }
    };

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const res = await api.get(`/admin/timetable?batchId=${selectedBatch.id}&year=${year}&month=${month}`);
            setSchedule(res.data || []);
        } catch (e) {
            toast.error("Failed to load schedule");
        } finally {
            setLoading(false);
        }
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const blanks = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getLocalDateStr = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = {
            businessId: selectedBiz,
            batchId: selectedBatch.id,
            date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`,
            subjectName: formData.get('subjectName'),
            title: formData.get('title'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            lecturerName: formData.get('lecturerName') || null,
            optionalMCQ: formData.get('optionalMCQ') === 'on',
            optionalPaper: formData.get('optionalPaper') === 'on'
        };

        try {
            await api.post('/admin/timetable', payload);
            toast.success("Class Scheduled!");
            setShowAddModal(false);
            fetchSchedule();
        } catch (error) {
            toast.error("Failed to schedule class");
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm("Are you sure you want to delete this class?")) return;
        try {
            await api.delete(`/admin/timetable/${id}`);
            toast.success("Class deleted");
            setShowViewModal(false);
            fetchSchedule();
        } catch (e) {
            toast.error("Failed to delete class");
        }
    };

    const getLecturerImage = (lecName) => {
        if (!lecName) return null;
        const foundSub = subjects.find(s => s.lecturerName === lecName);
        if (foundSub && foundSub.groupPrices) {
            try {
                const parsed = typeof foundSub.groupPrices === 'string' ? JSON.parse(foundSub.groupPrices) : foundSub.groupPrices;
                if (parsed?.[0]?.lecturerImage) {
                    const baseUrl = api.defaults.baseURL.replace('/api', '');
                    return `${baseUrl}/storage/icons/${parsed[0].lecturerImage}`;
                }
            } catch(e) {}
        }
        return null;
    };

    const getBusinessName = () => businesses.find(b => b.id.toString() === selectedBiz?.toString())?.name || '';

    return (
        <div className="w-full text-gray-900 dark:text-slate-200 font-sans pb-10 animate-in fade-in duration-300 transition-colors">
            
            {/* HEADER & FILTERS */}
            <div className="mb-6 bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder p-6 rounded-3xl shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-accentLight rounded-2xl border border-brand-accent/20 text-brand-accent transition-colors">
                        <Calendar size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-wide transition-colors">Class Timetable</h2>
                        <p className="text-gray-500 dark:text-brand-darkTextMuted text-sm font-medium mt-1 transition-colors">Schedule and manage upcoming classes & events</p>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto bg-gray-50 dark:bg-brand-darkBg p-2 rounded-2xl border border-gray-200 dark:border-brand-darkBorder transition-colors shadow-sm">
                    <div className="relative flex-1 sm:w-64">
                        <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 transition-colors" />
                        <select value={selectedBiz} onChange={handleBusinessChange} className="w-full bg-transparent border-none text-sm font-bold text-gray-700 dark:text-white outline-none focus:ring-0 appearance-none pl-11 pr-4 py-3 cursor-pointer transition-colors">
                            <option value="" className="bg-white dark:bg-brand-darkCard text-gray-700 dark:text-white">-- Select Business --</option>
                            {businesses.map(b => <option key={b.id} value={b.id} className="bg-white dark:bg-brand-darkCard text-gray-700 dark:text-white">{b.name}</option>)}
                        </select>
                    </div>
                    <div className="hidden sm:block w-px bg-gray-200 dark:bg-brand-darkBorder my-2 transition-colors"></div>
                    <div className="relative flex-1 sm:w-64">
                        <Layers size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 transition-colors" />
                        <select 
                            value={selectedBatch?.id || ''} 
                            onChange={(e) => {
                                const batch = batches.find(b => b.id.toString() === e.target.value);
                                setSelectedBatch(batch);
                            }} 
                            disabled={!selectedBiz}
                            className="w-full bg-transparent border-none text-sm font-bold text-gray-700 dark:text-white outline-none focus:ring-0 appearance-none pl-11 pr-4 py-3 disabled:opacity-50 cursor-pointer transition-colors"
                        >
                            <option value="" className="bg-white dark:bg-brand-darkCard text-gray-700 dark:text-white">-- Select Batch --</option>
                            {batches.map(b => <option key={b.id} value={b.id} className="bg-white dark:bg-brand-darkCard text-gray-700 dark:text-white">{b.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* DYNAMIC BATCH HEADER */}
            {selectedBiz && selectedBatch && (
                <div className="mb-6 bg-brand-accentLight border border-brand-accent/20 p-5 md:p-6 rounded-3xl flex items-center justify-between shadow-sm transition-colors">
                   <div>
                       <h3 className="text-brand-accent font-bold text-xs uppercase tracking-widest mb-1 transition-colors">{getBusinessName()}</h3>
                       <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white transition-colors">{selectedBatch.name}</h2>
                   </div>
                   <div className="hidden md:flex items-center gap-3">
                      <div className="bg-white dark:bg-brand-darkCard px-4 py-2 rounded-xl border border-brand-accent/20 shadow-sm transition-colors">
                        <span className="text-brand-accent text-xs font-bold uppercase block text-center transition-colors">Total Classes</span>
                        <span className="text-gray-900 dark:text-white text-lg font-black block text-center transition-colors">{schedule.length}</span>
                      </div>
                   </div>
                </div>
            )}

            {/* CALENDAR SECTION */}
            {selectedBatch ? (
                <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder p-4 md:p-8 rounded-3xl shadow-sm transition-colors">
                    
                    {/* Calendar Header */}
                    <div className="flex justify-between items-center mb-8 bg-gray-50 dark:bg-brand-darkBg p-3 pl-6 rounded-2xl border border-gray-200 dark:border-brand-darkBorder transition-colors shadow-sm">
                        <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider transition-colors">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} className="p-3 bg-white dark:bg-brand-darkCard hover:bg-gray-100 dark:hover:bg-brand-darkHover text-gray-600 dark:text-slate-300 rounded-xl transition-colors border border-gray-200 dark:border-brand-darkBorder shadow-sm outline-none">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={nextMonth} className="p-3 bg-white dark:bg-brand-darkCard hover:bg-gray-100 dark:hover:bg-brand-darkHover text-gray-600 dark:text-slate-300 rounded-xl transition-colors border border-gray-200 dark:border-brand-darkBorder shadow-sm outline-none">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Days of Week */}
                    <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4">
                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, idx) => (
                            <div key={day} className={`text-center font-black text-[10px] md:text-xs tracking-widest pb-3 border-b-2 transition-colors ${idx === 0 || idx === 6 ? 'text-brand-accent border-brand-accent/30' : 'text-gray-500 dark:text-slate-500 border-gray-200 dark:border-brand-darkBorder'}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2 md:gap-4">
                        {/* Blank Cells */}
                        {blanks.map((_, i) => (
                            <div key={`blank-${i}`} className="min-h-[100px] md:min-h-[140px] rounded-2xl bg-gray-50 dark:bg-brand-darkBg border border-gray-100 dark:border-brand-darkBorder opacity-50 transition-colors"></div>
                        ))}
                        
                        {/* Actual Days */}
                        {days.map(day => {
                            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dayEvents = schedule.filter(e => getLocalDateStr(e.date) === dateStr);
                            const isToday = getLocalDateStr(new Date().toISOString()) === dateStr;

                            return (
                                <div 
                                    key={day} 
                                    onClick={() => { if(canEdit) { setSelectedDay(day); setShowAddModal(true); } }}
                                    className={`min-h-[110px] md:min-h-[140px] p-2 md:p-3 rounded-2xl border transition-all relative flex flex-col group overflow-hidden ${
                                        canEdit ? 'cursor-pointer hover:border-brand-accent/50 dark:hover:border-brand-accent/50 hover:bg-gray-50 dark:hover:bg-brand-darkHover/40 hover:shadow-md' : ''
                                    } ${isToday ? 'bg-brand-accentLight/50 dark:bg-brand-accentLight border-brand-accent/40 shadow-[inset_0_0_20px_var(--theme-light)]' : 'bg-white dark:bg-brand-darkBg border-gray-200 dark:border-brand-darkBorder shadow-sm'}`}
                                >
                                    {/* Day Number */}
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`flex items-center justify-center text-sm md:text-base font-black w-7 h-7 md:w-8 md:h-8 rounded-full z-10 transition-colors ${
                                            isToday ? 'bg-brand-accent text-white shadow-md' : 'text-gray-500 dark:text-slate-400 group-hover:text-brand-accent dark:group-hover:text-brand-accent'
                                        }`}>
                                            {day}
                                        </span>
                                        {canEdit && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-accent bg-brand-accentLight p-1.5 rounded-lg">
                                                <Plus size={14}/>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Events Container */}
                                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar relative z-10">
                                        {dayEvents.map(event => {
                                            const lecImg = getLecturerImage(event.lecturerName);
                                            return (
                                            <div 
                                                key={event.id} 
                                                onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setShowViewModal(true); }}
                                                className="bg-gray-50 dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder hover:border-brand-accent/50 dark:hover:border-brand-accent/50 hover:bg-brand-accentLight dark:hover:bg-brand-accentLight p-2 md:p-2.5 rounded-xl cursor-pointer transition-all shadow-sm"
                                            >
                                                <h4 className="font-bold text-gray-900 dark:text-white text-[10px] md:text-xs truncate leading-tight transition-colors" title={event.subjectName}>{event.subjectName}</h4>
                                                <div className="flex items-center justify-between mt-1.5 gap-2">
                                                    <span className="text-[9px] md:text-[10px] text-gray-600 dark:text-slate-300 font-semibold flex items-center gap-1 bg-white dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder px-1.5 py-0.5 rounded-md truncate transition-colors">
                                                        <Clock size={10} className="text-brand-accent"/> {event.startTime}
                                                    </span>
                                                    {lecImg ? (
                                                        <img src={lecImg} alt={event.lecturerName} className="w-4 h-4 md:w-5 md:h-5 rounded-full object-cover shrink-0 border border-gray-200 dark:border-brand-darkBorder shadow-sm" />
                                                    ) : (
                                                        <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gray-100 dark:bg-brand-darkBg flex items-center justify-center shrink-0 border border-gray-200 dark:border-brand-darkBorder transition-colors">
                                                            <User size={10} className="text-gray-400 dark:text-slate-500" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-80 bg-white dark:bg-brand-darkCard rounded-3xl border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-brand-darkBg rounded-full flex items-center justify-center mb-4 border border-gray-200 dark:border-brand-darkBorder shadow-sm transition-colors">
                        <Calendar size={40} className="text-gray-400 dark:text-slate-500 transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">No Timetable Selected</h3>
                    <p className="text-gray-500 dark:text-slate-400 font-medium text-sm text-center px-4 max-w-md transition-colors">Please select a Business and a Batch from the filters above to view or manage the class schedule.</p>
                </div>
            )}

            {/* ----------------- MODALS ----------------- */}

            {/* SCHEDULE ADD MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 dark:bg-[#0a0f1c]/95 p-4 backdrop-blur-sm animate-in fade-in duration-200 transition-colors">
                    <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-3xl p-8 w-full max-w-md shadow-2xl relative transition-colors">
                        <div className="flex justify-between items-start mb-8 transition-colors">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 transition-colors">Schedule Class</h3>
                                <span className="bg-brand-accentLight text-brand-accent px-3 py-1.5 rounded-lg text-xs font-bold border border-brand-accent/20 uppercase tracking-widest transition-colors">
                                    Date: {currentDate.getFullYear()}-{String(currentDate.getMonth() + 1).padStart(2, '0')}-{String(selectedDay).padStart(2, '0')}
                                </span>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="bg-gray-100 dark:bg-brand-darkBg p-2.5 rounded-xl border border-gray-200 dark:border-brand-darkBorder text-gray-500 dark:text-slate-400 hover:text-white hover:bg-red-500 dark:hover:text-white dark:hover:bg-red-500 transition-colors outline-none"><X size={18}/></button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2 block transition-colors">Subject *</label>
                                <select name="subjectName" required className="w-full bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl p-3.5 text-sm text-gray-900 dark:text-white font-bold outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-colors cursor-pointer shadow-sm">
                                    <option value="" className="text-gray-500 dark:text-slate-500">-- Select Subject --</option>
                                    {subjects.map((sub, i) => <option key={i} value={sub.name} className="text-gray-900 dark:text-white">{sub.name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2 block transition-colors">Title/Topic *</label>
                                <input type="text" name="title" required placeholder="e.g. Mechanics Part 1" className="w-full bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl p-3.5 text-sm text-gray-900 dark:text-white font-medium outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-colors shadow-sm placeholder-gray-400 dark:placeholder-slate-500" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-1 transition-colors"><Clock size={12}/> Start Time</label>
                                    <input type="time" name="startTime" required className="w-full bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl p-3.5 text-sm text-gray-900 dark:text-white font-bold outline-none focus:border-brand-accent dark:focus:border-brand-accent [color-scheme:light] dark:[color-scheme:dark] transition-colors shadow-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-1 transition-colors"><Clock size={12}/> End Time</label>
                                    <input type="time" name="endTime" required className="w-full bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl p-3.5 text-sm text-gray-900 dark:text-white font-bold outline-none focus:border-brand-accent dark:focus:border-brand-accent [color-scheme:light] dark:[color-scheme:dark] transition-colors shadow-sm" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 p-4 bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl shadow-sm transition-colors">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" name="optionalMCQ" className="w-5 h-5 accent-brand-accent shrink-0" />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Require <span className="text-brand-accent">MCQ Paper</span> Task</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" name="optionalPaper" className="w-5 h-5 accent-brand-accent shrink-0" />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Require <span className="text-brand-accent">Structured Paper</span> Task</span>
                                </label>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-2 block transition-colors">Lecturer (Optional)</label>
                                <select name="lecturerName" className="w-full bg-gray-50 dark:bg-brand-darkBg border border-gray-200 dark:border-brand-darkBorder rounded-xl p-3.5 text-sm text-gray-900 dark:text-white font-bold outline-none focus:border-brand-accent dark:focus:border-brand-accent transition-colors cursor-pointer shadow-sm">
                                    <option value="" className="text-gray-500 dark:text-slate-500">Not Assigned</option>
                                    {lecturers.map((lec, i) => <option key={i} value={lec.name} className="text-gray-900 dark:text-white">{lec.name}</option>)}
                                </select>
                            </div>

                            <button type="submit" className="w-full bg-brand-accent hover:bg-brand-accentHover text-white font-black py-4 rounded-xl mt-4 transition-transform hover:scale-[1.02] text-sm uppercase tracking-widest shadow-md outline-none">
                                Save to Schedule
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW / CANCEL MODAL */}
            {showViewModal && selectedEvent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 dark:bg-[#0a0f1c]/95 p-4 backdrop-blur-sm animate-in fade-in duration-200 transition-colors">
                    <div className="bg-white dark:bg-brand-darkCard border border-gray-200 dark:border-brand-darkBorder rounded-3xl p-8 w-full max-w-sm shadow-2xl relative transition-colors">
                        <div className="flex justify-between items-start mb-6 border-b border-gray-200 dark:border-brand-darkBorder pb-6 transition-colors">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 leading-tight transition-colors">{selectedEvent.subjectName}</h3>
                                <span className="bg-brand-accentLight text-brand-accent px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-widest border border-brand-accent/20 transition-colors">
                                    {selectedEvent.date.split('T')[0]}
                                </span>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="bg-gray-100 dark:bg-brand-darkBg p-2.5 rounded-xl border border-gray-200 dark:border-brand-darkBorder text-gray-500 dark:text-slate-400 hover:text-gray-900 hover:bg-gray-200 dark:hover:text-white dark:hover:bg-brand-darkHover transition-colors shrink-0 outline-none"><X size={18}/></button>
                        </div>

                        <div className="space-y-4 bg-gray-50 dark:bg-brand-darkBg p-5 rounded-2xl border border-gray-200 dark:border-brand-darkBorder mb-6 shadow-sm transition-colors">
                            <div className="flex items-start gap-4 transition-colors">
                                <div className="bg-brand-accentLight p-2.5 rounded-xl text-brand-accent border border-brand-accent/20 transition-colors"><BookOpen size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-0.5 transition-colors">Topic / Details</p>
                                    <p className="text-base text-gray-900 dark:text-white font-bold transition-colors">{selectedEvent.title}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 transition-colors">
                                <div className="bg-orange-50 dark:bg-orange-500/10 p-2.5 rounded-xl text-orange-500 border border-orange-200 dark:border-orange-500/20 transition-colors"><Clock size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-0.5 transition-colors">Time Allocation</p>
                                    <p className="text-base text-gray-900 dark:text-white font-bold transition-colors">{selectedEvent.startTime} — {selectedEvent.endTime}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 transition-colors">
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 transition-colors"><User size={20} /></div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-0.5 transition-colors">Lecturer</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        {getLecturerImage(selectedEvent.lecturerName) ? (
                                            <img src={getLecturerImage(selectedEvent.lecturerName)} className="w-8 h-8 rounded-full border border-gray-200 dark:border-brand-darkBorder object-cover shadow-sm transition-colors" alt="Lec"/>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-brand-darkHover flex items-center justify-center border border-gray-200 dark:border-brand-darkBorder transition-colors shadow-sm"><User size={14} className="text-gray-400 dark:text-slate-400"/></div>
                                        )}
                                        <p className="text-base text-gray-900 dark:text-white font-bold transition-colors">{selectedEvent.lecturerName || 'TBA'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {canEdit && (
                            <button 
                                onClick={() => handleDeleteEvent(selectedEvent.id)} 
                                className="w-full bg-red-50 dark:bg-red-500/10 hover:bg-red-500 dark:hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white border border-red-200 dark:border-red-500/30 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-sm outline-none"
                            >
                                <Trash2 size={18}/> Cancel Class
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}