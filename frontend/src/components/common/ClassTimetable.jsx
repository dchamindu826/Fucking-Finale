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

  // Exact Local Date Converter to prevent "Today falls to Yesterday" Bug
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
    <div className="w-full text-slate-200 font-sans pb-10 animate-in fade-in duration-300">
      
      {/* HEADER & FILTERS */}
      <div className="mb-6 bg-slate-800/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
            <Calendar size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-wide">Class Timetable</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">Schedule and manage upcoming classes & events</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto bg-black/30 p-2 rounded-2xl border border-white/5">
          <div className="relative flex-1 sm:w-64">
            <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={selectedBiz} onChange={handleBusinessChange} className="w-full bg-transparent border-none text-sm font-bold text-white outline-none focus:ring-0 appearance-none pl-11 pr-4 py-3 cursor-pointer">
              <option value="" className="bg-slate-800">-- Select Business --</option>
              {businesses.map(b => <option key={b.id} value={b.id} className="bg-slate-800">{b.name}</option>)}
            </select>
          </div>
          <div className="hidden sm:block w-px bg-white/10 my-2"></div>
          <div className="relative flex-1 sm:w-64">
            <Layers size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={selectedBatch?.id || ''} 
              onChange={(e) => {
                const batch = batches.find(b => b.id.toString() === e.target.value);
                setSelectedBatch(batch);
              }} 
              disabled={!selectedBiz}
              className="w-full bg-transparent border-none text-sm font-bold text-white outline-none focus:ring-0 appearance-none pl-11 pr-4 py-3 disabled:opacity-50 cursor-pointer"
            >
              <option value="" className="bg-slate-800">-- Select Batch --</option>
              {batches.map(b => <option key={b.id} value={b.id} className="bg-slate-800">{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* DYNAMIC BATCH HEADER */}
      {selectedBiz && selectedBatch && (
        <div className="mb-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 p-5 md:p-6 rounded-3xl flex items-center justify-between shadow-lg">
           <div>
               <h3 className="text-blue-300 font-bold text-xs uppercase tracking-widest mb-1">{getBusinessName()}</h3>
               <h2 className="text-xl md:text-2xl font-black text-white">{selectedBatch.name}</h2>
           </div>
           <div className="hidden md:flex items-center gap-3">
              <div className="bg-black/40 px-4 py-2 rounded-xl border border-white/10">
                <span className="text-slate-400 text-xs font-bold uppercase block text-center">Total Classes</span>
                <span className="text-white text-lg font-black block text-center">{schedule.length}</span>
              </div>
           </div>
        </div>
      )}

      {/* CALENDAR SECTION */}
      {selectedBatch ? (
        <div className="bg-slate-800/40 backdrop-blur-xl border border-white/10 p-4 md:p-8 rounded-3xl shadow-xl">
          
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-8 bg-black/20 p-3 pl-6 rounded-2xl border border-white/5">
            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/10 shadow-sm">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextMonth} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/10 shadow-sm">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, idx) => (
              <div key={day} className={`text-center font-black text-[10px] md:text-xs tracking-widest pb-3 border-b-2 ${idx === 0 || idx === 6 ? 'text-blue-400 border-blue-500/30' : 'text-slate-500 border-white/5'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {/* Blank Cells */}
            {blanks.map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[100px] md:min-h-[140px] rounded-2xl bg-white/5 border border-white/5 opacity-40"></div>
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
                    canEdit ? 'cursor-pointer hover:border-blue-500/50 hover:bg-white/10' : ''
                  } ${isToday ? 'bg-blue-600/10 border-blue-500/40 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' : 'bg-black/30 border-white/5'}`}
                >
                  {/* Day Number */}
                  <div className="flex justify-between items-start mb-2">
                    <span className={`flex items-center justify-center text-sm md:text-base font-black w-7 h-7 md:w-8 md:h-8 rounded-full z-10 ${
                      isToday ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40' : 'text-slate-400 group-hover:text-white'
                    }`}>
                      {day}
                    </span>
                    {canEdit && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 bg-blue-500/10 p-1.5 rounded-lg">
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
                        className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/30 hover:border-blue-400 hover:from-blue-500/30 p-2 md:p-2.5 rounded-xl cursor-pointer transition-all shadow-sm"
                      >
                        <h4 className="font-bold text-white text-[10px] md:text-xs truncate leading-tight" title={event.subjectName}>{event.subjectName}</h4>
                        <div className="flex items-center justify-between mt-1.5 gap-2">
                            <span className="text-[9px] md:text-[10px] text-blue-300 font-semibold flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded-md truncate">
                                <Clock size={10}/> {event.startTime}
                            </span>
                            {lecImg ? (
                                <img src={lecImg} alt={event.lecturerName} className="w-4 h-4 md:w-5 md:h-5 rounded-full object-cover shrink-0 border border-blue-500/50" />
                            ) : (
                                <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                                    <User size={10} className="text-blue-300" />
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
        <div className="flex flex-col items-center justify-center h-80 bg-slate-800/40 rounded-3xl border border-white/5 backdrop-blur-xl shadow-lg">
          <div className="w-20 h-20 bg-black/40 rounded-full flex items-center justify-center mb-4 border border-white/10 shadow-inner">
            <Calendar size={40} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Timetable Selected</h3>
          <p className="text-slate-400 font-medium text-sm text-center px-4 max-w-md">Please select a Business and a Batch from the filters above to view or manage the class schedule.</p>
        </div>
      )}

      {/* ----------------- MODALS ----------------- */}

      {/* SCHEDULE ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800/95 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative backdrop-blur-2xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-2xl font-black text-white mb-2">Schedule Class</h3>
                <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-500/20 uppercase tracking-widest">
                  Date: {currentDate.getFullYear()}-{String(currentDate.getMonth() + 1).padStart(2, '0')}-{String(selectedDay).padStart(2, '0')}
                </span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="bg-black/20 p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-red-500 transition-colors"><X size={18}/></button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Subject *</label>
                <select name="subjectName" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white font-bold outline-none focus:border-blue-500 transition-colors cursor-pointer">
                  <option value="" className="bg-slate-800">-- Select Subject --</option>
                  {subjects.map((sub, i) => <option key={i} value={sub.name} className="bg-slate-800">{sub.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Title/Topic *</label>
                <input type="text" name="title" required placeholder="e.g. Mechanics Part 1" className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white font-medium outline-none focus:border-blue-500 transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-1"><Clock size={12}/> Start Time</label>
                  <input type="time" name="startTime" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white font-bold outline-none focus:border-blue-500 [color-scheme:dark] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-1"><Clock size={12}/> End Time</label>
                  <input type="time" name="endTime" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white font-bold outline-none focus:border-blue-500 [color-scheme:dark] transition-colors" />
                </div>
              </div>

              <div className="flex flex-col gap-3 p-4 bg-black/30 border border-white/5 rounded-xl shadow-inner">
                  <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" name="optionalMCQ" className="w-5 h-5 accent-blue-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Require <span className="text-blue-400">MCQ Paper</span> Task</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" name="optionalPaper" className="w-5 h-5 accent-blue-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Require <span className="text-blue-400">Structured Paper</span> Task</span>
                  </label>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Lecturer (Optional)</label>
                <select name="lecturerName" className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-sm text-white font-bold outline-none focus:border-blue-500 transition-colors cursor-pointer">
                  <option value="" className="bg-slate-800">Not Assigned</option>
                  {lecturers.map((lec, i) => <option key={i} value={lec.name} className="bg-slate-800">{lec.name}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl mt-4 transition-transform hover:scale-[1.02] text-sm uppercase tracking-widest shadow-lg shadow-blue-500/20">
                Save to Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW / CANCEL MODAL */}
      {showViewModal && selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-800/95 border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative backdrop-blur-2xl">
            <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-6">
              <div>
                <h3 className="text-2xl font-black text-white mb-2 leading-tight">{selectedEvent.subjectName}</h3>
                <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-widest border border-indigo-500/20">
                  {selectedEvent.date.split('T')[0]}
                </span>
              </div>
              <button onClick={() => setShowViewModal(false)} className="bg-black/20 p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"><X size={18}/></button>
            </div>

            <div className="space-y-4 bg-black/30 p-5 rounded-2xl border border-white/5 mb-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-400 border border-blue-500/20"><BookOpen size={20} /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Topic / Details</p>
                  <p className="text-base text-white font-bold">{selectedEvent.title}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-orange-500/10 p-2.5 rounded-xl text-orange-400 border border-orange-500/20"><Clock size={20} /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Time Allocation</p>
                  <p className="text-base text-white font-bold">{selectedEvent.startTime} — {selectedEvent.endTime}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/20"><User size={20} /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Lecturer</p>
                  <div className="flex items-center gap-3 mt-1">
                      {getLecturerImage(selectedEvent.lecturerName) ? (
                          <img src={getLecturerImage(selectedEvent.lecturerName)} className="w-8 h-8 rounded-full border border-white/20 object-cover" alt="Lec"/>
                      ) : (
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10"><User size={14} className="text-slate-400"/></div>
                      )}
                      <p className="text-base text-white font-bold">{selectedEvent.lecturerName || 'TBA'}</p>
                  </div>
                </div>
              </div>
            </div>

            {canEdit && (
              <button 
                onClick={() => handleDeleteEvent(selectedEvent.id)} 
                className="w-full bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-lg"
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