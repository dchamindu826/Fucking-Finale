import React, { useState, useEffect } from 'react';
import { Users, Edit3, Trash2, Shield, UserPlus, X, Loader2, Search, Briefcase, Layers, Ghost } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function StaffManagement({ loggedInUser }) {
  const [staffList, setStaffList] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const userRole = loggedInUser?.role || '';
  const isAdmin = userRole === 'System Admin' || userRole === 'Director' || userRole === 'SYSTEM_ADMIN';

  const allDepts = ['Class Coordination', 'Finance', 'Technical', 'Call Center', 'Delivery'];
  const staffDepts = ['Finance', 'Technical', 'Call Center', 'Delivery']; 
  
  const allRoles = ['System Admin', 'Director', 'Manager', 'Ass Manager', 'Coordinator', 'Staff'];
  
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phone: '', nic: '', password: '', 
    role: isAdmin ? 'Manager' : 'Coordinator', 
    department: isAdmin ? 'Class Coordination' : loggedInUser?.department,
    businessType: ''
  });

  useEffect(() => {
    fetchStaff();
    if (isAdmin) fetchBusinesses();
  }, [loggedInUser]);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/admin/staff', {
        params: { role: userRole, department: loggedInUser?.department, businessType: loggedInUser?.businessType }
      });
      setStaffList(res.data);
    } catch (error) {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const res = await api.get('/admin/staff/businesses');
      setBusinesses(res.data);
      if (res.data.length > 0 && !formData.businessType) {
        setFormData(prev => ({...prev, businessType: res.data[0].name}));
      }
    } catch (err) {
      console.error("Error fetching businesses", err);
    }
  };

  const handleGhostLogin = async (staffId) => {
    try {
        const toastId = toast.loading("Switching to Ghost Mode...");
        const res = await api.post(`/auth/ghost-login/${staffId}`); 
        
        if (res.data.token && res.data.user) {
            localStorage.setItem('admin_token', localStorage.getItem('token'));
            localStorage.setItem('admin_user', localStorage.getItem('user'));
            
            const { password, ...safeUser } = res.data.user;
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(safeUser));
            
            toast.success("Switched successfully!", { id: toastId });
            window.location.href = '/login';
        }
    } catch (error) {
        toast.error("Ghost login failed.");
    }
  };

  const handleRoleChange = (newRole) => {
    let newDept = formData.department;
    if (newRole === 'System Admin' || newRole === 'Director') {
        newDept = ''; 
    } else if (newRole === 'Coordinator') {
        newDept = 'Class Coordination';
    } else if (newRole === 'Staff') {
        newDept = staffDepts.includes(newDept) ? newDept : staffDepts[0];
    } else if ((newRole === 'Manager' || newRole === 'Ass Manager') && !newDept) {
        newDept = allDepts[0];
    }
    setFormData({ ...formData, role: newRole, department: newDept });
  };

  const handleDeptChange = (newDept) => {
    let newRole = formData.role;
    if (newDept === 'Class Coordination' && newRole === 'Staff') {
        newRole = 'Coordinator';
    } else if (newDept !== 'Class Coordination' && newRole === 'Coordinator') {
        newRole = 'Staff';
    }
    setFormData({ ...formData, department: newDept, role: newRole });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if(editMode) {
          await api.put(`/admin/staff/${editId}`, formData);
          toast.success("Staff updated successfully!");
      } else {
          await api.post('/admin/staff', formData);
          toast.success("Staff created successfully!");
      }
      setShowModal(false);
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.error || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
      if(!window.confirm("Are you sure you want to delete this member?")) return;
      try {
          await api.delete(`/admin/staff/${id}`);
          toast.success("Staff deleted!");
          fetchStaff();
      } catch (error) {
          toast.error("Failed to delete.");
      }
  };

  const openEditModal = (staff) => {
      setEditMode(true);
      setEditId(staff.id);
      setFormData({
          firstName: staff.firstName, lastName: staff.lastName, phone: staff.phone, 
          nic: staff.nic, password: '', role: staff.role, 
          department: staff.department || '', businessType: staff.businessType || ''
      });
      setShowModal(true);
  };

  const resetForm = () => {
      setEditMode(false);
      setEditId(null);
      setFormData({ 
        firstName: '', lastName: '', phone: '', nic: '', password: '', 
        role: isAdmin ? 'Manager' : (loggedInUser?.department === 'Class Coordination' ? 'Coordinator' : 'Staff'), 
        department: isAdmin ? 'Class Coordination' : loggedInUser?.department,
        businessType: isAdmin ? (businesses[0]?.name || '') : loggedInUser?.businessType
      });
  };

  const filteredStaff = staffList.filter(s => 
    (s.firstName + " " + s.lastName).toLowerCase().includes(searchQuery.toLowerCase()) || s.phone.includes(searchQuery)
  );

  const topLevelStaff = filteredStaff.filter(s => s.role === 'System Admin' || s.role === 'Director');
  
  const classCoordStaff = filteredStaff.filter(s => s.department === 'Class Coordination');
  const groupedByBusiness = classCoordStaff.reduce((acc, staff) => {
      const biz = staff.businessType || 'Unassigned';
      if(!acc[biz]) acc[biz] = [];
      acc[biz].push(staff);
      return acc;
  }, {});

  const otherDeptsStaff = filteredStaff.filter(s => s.department && s.department !== 'Class Coordination');
  const groupedByDept = otherDeptsStaff.reduce((acc, staff) => {
      const dept = staff.department;
      if(!acc[dept]) acc[dept] = [];
      acc[dept].push(staff);
      return acc;
  }, {});

  if (loading) return <div className="flex h-full items-center justify-center min-h-[60vh]"><Loader2 size={40} className="animate-spin text-brand-accent" /></div>;

  return (
    <div className="w-full animate-fade-in pb-12">
      
      {/* Clean Glass Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3 drop-shadow-md">
            <Users className="text-brand-accent" size={32}/> 
            {isAdmin ? 'Staff Directory' : 'My Team'}
          </h1>
          <p className="text-gray-300 text-sm font-medium mt-1">
            {isAdmin ? 'Manage system roles, departments, and user access levels.' : `Manage members for ${loggedInUser?.department}.`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-lg py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-brand-accent focus:bg-white/10 transition-all shadow-sm placeholder:text-gray-400"
            />
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="w-full sm:w-auto bg-brand-accent/90 hover:bg-brand-accent backdrop-blur-md text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_4px_15px_rgba(225,29,72,0.4)] outline-none border border-transparent">
            <UserPlus size={16}/> Add Staff
          </button>
        </div>
      </div>

      <div className="space-y-10">
        
        {/* System Administration */}
        {isAdmin && topLevelStaff.length > 0 && (
          <section>
            <h2 className="text-sm font-extrabold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2 uppercase tracking-wider drop-shadow-sm">
              <Shield className="text-purple-400" size={18}/> Administration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {topLevelStaff.map(staff => <MinimalStaffCard key={staff.id} staff={staff} openEditModal={openEditModal} handleDelete={handleDelete} handleGhostLogin={handleGhostLogin} color="purple" canEdit={true} />)}
            </div>
          </section>
        )}

        {/* Class Coordination Department */}
        {Object.keys(groupedByBusiness).length > 0 && (
           <section>
              <h2 className="text-sm font-extrabold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2 uppercase tracking-wider drop-shadow-sm">
                <Layers className="text-blue-400" size={18}/> Class Coordination
              </h2>
              <div className="space-y-8 mt-4">
                 {Object.keys(groupedByBusiness).map(biz => (
                    <div key={biz}>
                       <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">Business: {biz}</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                          {groupedByBusiness[biz].map(staff => <MinimalStaffCard key={staff.id} staff={staff} openEditModal={openEditModal} handleDelete={handleDelete} handleGhostLogin={handleGhostLogin} color="blue" canEdit={true} />)}
                       </div>
                    </div>
                 ))}
              </div>
           </section>
        )}

        {/* Other Departments */}
        {Object.keys(groupedByDept).length > 0 && (
           <section>
              <h2 className="text-sm font-extrabold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2 uppercase tracking-wider drop-shadow-sm">
                <Briefcase className="text-emerald-400" size={18}/> Other Departments
              </h2>
              <div className="space-y-8 mt-4">
                 {Object.keys(groupedByDept).map(dept => (
                    <div key={dept}>
                       <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">Dept: {dept}</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                          {groupedByDept[dept].map(staff => <MinimalStaffCard key={staff.id} staff={staff} openEditModal={openEditModal} handleDelete={handleDelete} handleGhostLogin={handleGhostLogin} color="emerald" canEdit={true} />)}
                       </div>
                    </div>
                 ))}
              </div>
           </section>
        )}

        {filteredStaff.length === 0 && (
          <div className="text-center py-20 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)]">
            <Users size={40} className="mx-auto mb-4 text-gray-500" />
            <p className="text-sm font-medium text-gray-400">No staff members found.</p>
          </div>
        )}
      </div>

      {/* Edit/Add Modal - Pure Glassmorphism */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#090E17]/80 backdrop-blur-3xl border border-white/20 rounded-2xl p-6 w-full max-w-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] overflow-y-auto max-h-[90vh] custom-scrollbar">
            
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h3 className="text-lg font-extrabold text-white">
                 {editMode ? 'Edit Staff Profile' : 'Add New Staff'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors outline-none"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">First Name</label>
                  <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/50 transition-all shadow-inner placeholder-gray-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Last Name</label>
                  <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/50 transition-all shadow-inner placeholder-gray-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Phone</label>
                  <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/50 transition-all shadow-inner placeholder-gray-500" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">NIC</label>
                  <input type="text" required value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/50 transition-all shadow-inner placeholder-gray-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-5 mt-2">
                <div className={(formData.role === 'System Admin' || formData.role === 'Director') ? 'col-span-2' : 'col-span-1'}>
                  <label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Role</label>
                  <select disabled={!isAdmin} value={formData.role} onChange={e => handleRoleChange(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-brand-accent disabled:opacity-60 shadow-inner cursor-pointer appearance-none">
                    {isAdmin ? allRoles.map(r => <option key={r} value={r} className="bg-slate-800 text-white">{r}</option>) : <option value={formData.role} className="bg-slate-800 text-white">{formData.role}</option>}
                  </select>
                </div>

                {formData.role !== 'System Admin' && formData.role !== 'Director' && (
                  <div className="col-span-1">
                    <label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Department</label>
                    <select disabled={!isAdmin || formData.role === 'Coordinator'} value={formData.department} onChange={e => handleDeptChange(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-brand-accent disabled:opacity-60 shadow-inner cursor-pointer appearance-none">
                      {isAdmin 
                          ? (formData.role === 'Staff' 
                              ? staffDepts.map(d => <option key={d} value={d} className="bg-slate-800 text-white">{d}</option>) 
                              : allDepts.map(d => <option key={d} value={d} className="bg-slate-800 text-white">{d}</option>)) 
                          : <option value={formData.department} className="bg-slate-800 text-white">{formData.department}</option>
                      }
                    </select>
                  </div>
                )}

                {formData.department === 'Class Coordination' && formData.role !== 'System Admin' && formData.role !== 'Director' && (
                  <div className="col-span-2">
                    <label className="text-[11px] font-bold text-gray-400 mb-1.5 block uppercase tracking-wider">Business Assignment</label>
                    <select disabled={!isAdmin} required value={formData.businessType} onChange={e => setFormData({...formData, businessType: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-brand-accent disabled:opacity-60 shadow-inner cursor-pointer appearance-none">
                      {isAdmin 
                          ? (businesses.length > 0 ? businesses.map(b => <option key={b.id} value={b.name} className="bg-slate-800 text-white">{b.name}</option>) : <option value="" className="bg-slate-800 text-white">No businesses available</option>)
                          : <option value={formData.businessType} className="bg-slate-800 text-white">{formData.businessType}</option>
                      }
                    </select>
                  </div>
                )}
              </div>
              
              <div className="border-t border-white/5 pt-5 mt-2">
                <label className="text-[11px] font-bold text-gray-400 mb-1.5 flex justify-between uppercase tracking-wider">
                  <span>Password</span>
                  {editMode && <span className="text-brand-accent lowercase font-medium tracking-normal">Optional: Leave blank</span>}
                </label>
                <input type="password" required={!editMode} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white outline-none focus:border-brand-accent focus:bg-black/50 transition-all shadow-inner" />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all outline-none border border-transparent">Cancel</button>
                <button type="submit" disabled={saving} className="bg-brand-accent/90 hover:bg-brand-accent text-white font-bold py-2.5 px-6 rounded-lg flex items-center justify-center disabled:opacity-70 transition-all shadow-[0_4px_15px_rgba(225,29,72,0.4)] border border-transparent outline-none">
                  {saving ? <Loader2 className="animate-spin" size={18}/> : (editMode ? 'Save Changes' : 'Create Staff')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}

// Glassmorphism Staff Card Component
function MinimalStaffCard({ staff, openEditModal, handleDelete, handleGhostLogin, color, canEdit }) {
  // Pure Glassmorphism Badges
  const roleBadgeColors = {
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    blue: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-brand-accent/50 transition-all duration-300 flex flex-col h-full group relative overflow-hidden backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.1)]">
      
      {/* Ghost Background Accent - Subtle glow */}
      <div className={`absolute top-0 right-0 w-24 h-24 blur-[50px] opacity-20 pointer-events-none rounded-full ${color === 'purple' ? 'bg-purple-500' : color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-sm font-extrabold text-white tracking-wide truncate pr-2 drop-shadow-sm" title={`${staff.firstName} ${staff.lastName}`}>
             {staff.firstName} {staff.lastName}
          </h3>
          <p className="text-[11px] text-gray-400 font-mono mt-1 font-medium">{staff.phone}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider whitespace-nowrap border ${roleBadgeColors[color]}`}>
          {staff.role}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 mb-6 relative z-10">
         {staff.department && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
               <Briefcase size={12} className="opacity-80 text-brand-accent"/> {staff.department}
            </div>
         )}
         {staff.businessType && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
               <Layers size={12} className="opacity-80 text-brand-accent"/> {staff.businessType}
            </div>
         )}
      </div>

      {canEdit && (
        <div className="mt-auto grid grid-cols-3 gap-2 opacity-100 sm:opacity-0 sm:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 relative z-10">
            <button 
                onClick={() => handleGhostLogin(staff.id)} 
                title="Impersonate User"
                className="bg-white/5 border border-white/10 hover:border-purple-400 hover:bg-purple-500/20 text-gray-400 hover:text-purple-300 py-1.5 rounded-lg flex justify-center items-center transition-all text-sm outline-none shadow-sm">
                <Ghost size={14}/>
            </button>
            <button 
                onClick={() => openEditModal(staff)} 
                title="Edit Details"
                className="bg-white/5 border border-white/10 hover:border-blue-400 hover:bg-blue-500/20 text-gray-400 hover:text-blue-300 py-1.5 rounded-lg flex justify-center items-center transition-all text-sm outline-none shadow-sm">
                <Edit3 size={14}/>
            </button>
            <button 
                onClick={() => handleDelete(staff.id)} 
                title="Delete User"
                className="bg-white/5 border border-white/10 hover:border-rose-400 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 py-1.5 rounded-lg flex justify-center items-center transition-all text-sm outline-none shadow-sm">
                <Trash2 size={14}/>
            </button>
        </div>
      )}
    </div>
  );
}