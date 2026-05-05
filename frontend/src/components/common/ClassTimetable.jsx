import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, BookOpen, User, X, Trash2, Filter } from 'lucide-react';
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

  // 🔥 FIX: Exact Local Date Converter to prevent "Today falls to Yesterday" Bug 🔥
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

  return (
    <div className="w-full text-slate-200 font-sans pb-4">
      {/* HEADER & FILTERS */}
      <div className="mb-6 bg-[#1e293b] border border-slate-800 p-5 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-5">
          <Calendar className="text-blue-500" size={24} /> Class Timetable
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4 items-center bg-[#0f172a] p-3 rounded-lg border border-slate-700">
          <Filter size={18} className="text-slate-400 shrink-0 ml-2" />
          <select value={selectedBiz} onChange={handleBusinessChange} className="w-full md:w-1/3 bg-transparent text-sm text-white outline-none focus:border-blue-500 border-none cursor-pointer">
            <option value="" className="bg-slate-800">-- Select Business --</option>
            {businesses.map(b => <option key={b.id} value={b.id} className="bg-slate-800">{b.name}</option>)}
          </select>

          <select 
            value={selectedBatch?.id || ''} 
            onChange={(e) => {
              const batch = batches.find(b => b.id.toString() === e.target.value);
              setSelectedBatch(batch);
            }} 
            disabled={!selectedBiz}
            className="w-full md:w-1/3 bg-transparent text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50 border-none cursor-pointer"
          >
            <option value="" className="bg-slate-800">-- Select Batch to View Calendar --</option>
            {batches.map(b => <option key={b.id} value={b.id} className="bg-slate-800">{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* CALENDAR SECTION */}
      {selectedBatch ? (
        <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-widest">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 bg-[#0f172a] hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700">
                <ChevronLeft size={18} />
              </button>
              <button onClick={nextMonth} className="p-2 bg-[#0f172a] hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3 mb-2">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="text-center font-bold text-slate-500 text-xs tracking-widest pb-2 border-b border-slate-700/50">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {blanks.map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[100px] rounded-xl bg-transparent"></div>
            ))}
            
            {days.map(day => {
              const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              // 🔥 FIX: Match events based on converted Local Date 🔥
              const dayEvents = schedule.filter(e => getLocalDateStr(e.date) === dateStr);
              
              const isToday = getLocalDateStr(new Date().toISOString()) === dateStr;

              return (
                <div 
                  key={day} 
                  onClick={() => { if(canEdit) { setSelectedDay(day); setShowAddModal(true); } }}
                  className={`min-h-[100px] p-2.5 rounded-xl border transition-colors relative group ${
                    canEdit ? 'cursor-pointer hover:border-slate-500' : ''
                  } ${isToday ? 'bg-[#0f172a] border-blue-500' : 'bg-[#0f172a] border-slate-800'}`}
                >
                  <span className={`text-sm font-bold block mb-1.5 ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>
                    {day}
                  </span>
                  
                  <div className="flex flex-col gap-1.5 relative z-10">
                    {dayEvents.map(event => {
                      const lecImg = getLecturerImage(event.lecturerName);
                      return (
                      <div 
                        key={event.id} 
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setShowViewModal(true); }}
                        className="bg-[#1e3a8a]/40 border border-blue-900/50 hover:bg-[#1e3a8a]/60 p-1.5 rounded-md cursor-pointer transition-colors flex items-center justify-between gap-1"
                      >
                        <div className="overflow-hidden">
                            <p className="text-[10px] font-bold text-blue-200 truncate">{event.subjectName}</p>
                            <p className="text-[9px] text-blue-300 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                              <Clock size={8}/> {event.startTime} - {event.endTime}
                            </p>
                        </div>
                        {lecImg ? (
                            <img src={lecImg} alt={event.lecturerName} className="w-5 h-5 rounded-full object-cover shrink-0" />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                                <User size={10} className="text-blue-400" />
                            </div>
                        )}
                      </div>
                    )})}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 bg-[#1e293b] rounded-xl border border-slate-800">
          <Calendar size={40} className="text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium text-sm">Please select a Business and Batch to view the timetable.</p>
        </div>
      )}

      {/* SCHEDULE ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-xl relative">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Schedule Class</h3>
                <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded text-xs font-bold border border-indigo-500/20">
                  {currentDate.getFullYear()}-{String(currentDate.getMonth() + 1).padStart(2, '0')}-{String(selectedDay).padStart(2, '0')}
                </span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="bg-[#0f172a] p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors"><X size={16}/></button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Subject *</label>
                <select name="subjectName" required className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500">
                  <option value="">Select Subject</option>
                  {subjects.map((sub, i) => <option key={i} value={sub.name}>{sub.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Title/Topic *</label>
                <input type="text" name="title" required placeholder="e.g. Mechanics Part 1" className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Start Time *</label>
                  <input type="time" name="startTime" required className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">End Time *</label>
                  <input type="time" name="endTime" required className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]" />
                </div>
              </div>

              <div className="flex flex-col gap-3 p-3 bg-[#0f172a] border border-slate-700 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="optionalMCQ" className="w-4 h-4 accent-blue-500" />
                      <span className="text-xs font-medium text-slate-300">Require MCQ Paper Task</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="optionalPaper" className="w-4 h-4 accent-blue-500" />
                      <span className="text-xs font-medium text-slate-300">Require Structured Paper Task</span>
                  </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Lecturer (Optional)</label>
                <select name="lecturerName" className="w-full bg-[#0f172a] border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500">
                  <option value="">Not Assigned</option>
                  {lecturers.map((lec, i) => <option key={i} value={lec.name}>{lec.name}</option>)}
                </select>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg mt-2 transition-colors text-sm">
                Save to Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW / EDIT MODAL */}
      {showViewModal && selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-xl relative">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{selectedEvent.subjectName}</h3>
                <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded text-xs font-bold border border-indigo-500/20">
                  {selectedEvent.date.split('T')[0]}
                </span>
              </div>
              <button onClick={() => setShowViewModal(false)} className="bg-[#0f172a] p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors"><X size={16}/></button>
            </div>

            <div className="space-y-4 bg-[#0f172a] p-4 rounded-lg border border-slate-700 mb-5">
              <div className="flex items-start gap-3">
                <BookOpen className="text-slate-400 mt-0.5" size={16} />
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Topic</p>
                  <p className="text-sm text-white font-medium">{selectedEvent.title}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="text-slate-400 mt-0.5" size={16} />
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time</p>
                  <p className="text-sm text-white font-medium">{selectedEvent.startTime} - {selectedEvent.endTime}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="text-slate-400 mt-0.5" size={16} />
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lecturer</p>
                  <p className="text-sm text-white font-medium">{selectedEvent.lecturerName || 'TBA'}</p>
                </div>
              </div>
            </div>

            {canEdit && (
              <button 
                onClick={() => handleDeleteEvent(selectedEvent.id)} 
                className="w-full bg-[#0f172a] hover:bg-red-500/10 text-red-400 border border-slate-700 hover:border-red-500/30 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Trash2 size={16}/> Cancel Class
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}