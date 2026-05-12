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
            // 1. Admin ගේ විස්තර හංගනවා
            localStorage.setItem('admin_token', localStorage.getItem('token'));
            localStorage.setItem('admin_user', localStorage.getItem('user'));
            
            // 2. Ghost User ගේ විස්තර localStorage එකට දානවා
            const { password, ...safeUser } = res.data.user;
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(safeUser));
            
            toast.success("Switched successfully!", { id: toastId });
            
            // 🔥 පට්ටම වැදගත්: '/' වෙනුවට '/login' වලට Redirect කරන්න.
            // එතකොට App.jsx එකේ තියෙන logic එකෙන් ඔයාව auto dashboard එකටම අරන් යනවා.
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

  if (loading) return <div className="flex h-full items-center justify-center min-h-[500px]"><Loader2 size={40} className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 flex flex-col font-sans pb-12 p-4 md:p-6 lg:p-8">
      
      {/* Clean Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Users className="text-emerald-500" size={32}/> 
            {isAdmin ? 'Staff Directory' : 'My Team'}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {isAdmin ? 'Manage system roles, departments, and user access levels.' : `Manage members for ${loggedInUser?.department}.`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search staff..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500"
            />
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors">
            <UserPlus size={16}/> Add Staff
          </button>
        </div>
      </div>

      <div className="space-y-12">
        
        {/* System Administration */}
        {isAdmin && topLevelStaff.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-white mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
              <Shield className="text-purple-400" size={18}/> Administration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {topLevelStaff.map(staff => <MinimalStaffCard key={staff.id} staff={staff} openEditModal={openEditModal} handleDelete={handleDelete} handleGhostLogin={handleGhostLogin} color="purple" canEdit={true} />)}
            </div>
          </section>
        )}

        {/* Class Coordination Department */}
        {Object.keys(groupedByBusiness).length > 0 && (
           <section>
              <h2 className="text-base font-semibold text-white mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                <Layers className="text-blue-400" size={18}/> Class Coordination
              </h2>
              <div className="space-y-8">
                 {Object.keys(groupedByBusiness).map(biz => (
                    <div key={biz}>
                       <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Business: {biz}</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              <h2 className="text-base font-semibold text-white mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                <Briefcase className="text-emerald-400" size={18}/> Other Departments
              </h2>
              <div className="space-y-8">
                 {Object.keys(groupedByDept).map(dept => (
                    <div key={dept}>
                       <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dept: {dept}</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {groupedByDept[dept].map(staff => <MinimalStaffCard key={staff.id} staff={staff} openEditModal={openEditModal} handleDelete={handleDelete} handleGhostLogin={handleGhostLogin} color="emerald" canEdit={true} />)}
                       </div>
                    </div>
                 ))}
              </div>
           </section>
        )}

        {filteredStaff.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <Users size={40} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">No staff members found.</p>
          </div>
        )}
      </div>

      {/* Clean Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">
                 {editMode ? 'Edit Staff Profile' : 'Add New Staff'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">First Name</label>
                  <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Last Name</label>
                  <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Phone</label>
                  <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">NIC</label>
                  <input type="text" required value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-5 mt-2">
                <div className={(formData.role === 'System Admin' || formData.role === 'Director') ? 'col-span-2' : 'col-span-1'}>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Role</label>
                  <select disabled={!isAdmin} value={formData.role} onChange={e => handleRoleChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white outline-none focus:border-emerald-500 disabled:opacity-60">
                    {isAdmin ? allRoles.map(r => <option key={r} value={r}>{r}</option>) : <option value={formData.role}>{formData.role}</option>}
                  </select>
                </div>

                {formData.role !== 'System Admin' && formData.role !== 'Director' && (
                  <div className="col-span-1">
                    <label className="text-xs font-medium text-slate-400 mb-1.5 block">Department</label>
                    <select disabled={!isAdmin || formData.role === 'Coordinator'} value={formData.department} onChange={e => handleDeptChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white outline-none focus:border-emerald-500 disabled:opacity-60">
                      {isAdmin 
                          ? (formData.role === 'Staff' 
                              ? staffDepts.map(d => <option key={d} value={d}>{d}</option>) 
                              : allDepts.map(d => <option key={d} value={d}>{d}</option>)) 
                          : <option value={formData.department}>{formData.department}</option>
                      }
                    </select>
                  </div>
                )}

                {formData.department === 'Class Coordination' && formData.role !== 'System Admin' && formData.role !== 'Director' && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-400 mb-1.5 block">Business Assignment</label>
                    <select disabled={!isAdmin} required value={formData.businessType} onChange={e => setFormData({...formData, businessType: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white outline-none focus:border-emerald-500 disabled:opacity-60">
                      {isAdmin 
                          ? (businesses.length > 0 ? businesses.map(b => <option key={b.id} value={b.name}>{b.name}</option>) : <option value="">No businesses available</option>)
                          : <option value={formData.businessType}>{formData.businessType}</option>
                      }
                    </select>
                  </div>
                )}
              </div>
              
              <div className="border-t border-slate-800 pt-5 mt-2">
                <label className="text-xs font-medium text-slate-400 mb-1.5 block flex justify-between">
                  <span>Password</span>
                  {editMode && <span className="text-emerald-500">Optional: Leave blank to keep current</span>}
                </label>
                <input type="password" required={!editMode} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all" />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-6 rounded-lg flex items-center justify-center disabled:opacity-70 transition-colors">
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

// Minimal & Clean Staff Card Component
function MinimalStaffCard({ staff, openEditModal, handleDelete, handleGhostLogin, color, canEdit }) {
  const roleBadgeColors = {
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800/80 transition-all duration-300 flex flex-col h-full group relative overflow-hidden">
      
      {/* Ghost Background Accent */}
      <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20 pointer-events-none rounded-full ${color === 'purple' ? 'bg-purple-500' : color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide truncate pr-2" title={`${staff.firstName} ${staff.lastName}`}>
             {staff.firstName} {staff.lastName}
          </h3>
          <p className="text-[11px] text-slate-400 font-mono mt-1">{staff.phone}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${roleBadgeColors[color]}`}>
          {staff.role}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 mb-6 relative z-10">
         {staff.department && (
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
               <Briefcase size={12} className="opacity-70"/> {staff.department}
            </div>
         )}
         {staff.businessType && (
            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
               <Layers size={12} className="opacity-70"/> {staff.businessType}
            </div>
         )}
      </div>

      {canEdit && (
        <div className="mt-auto grid grid-cols-3 gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 relative z-10">
            <button 
                onClick={() => handleGhostLogin(staff.id)} 
                title="Impersonate User"
                className="bg-slate-900 border border-slate-700 hover:border-purple-500 hover:bg-purple-500/10 text-slate-400 hover:text-purple-400 py-1.5 rounded-lg flex justify-center items-center transition-colors text-sm">
                <Ghost size={14}/>
            </button>
            <button 
                onClick={() => openEditModal(staff)} 
                title="Edit Details"
                className="bg-slate-900 border border-slate-700 hover:border-blue-500 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 py-1.5 rounded-lg flex justify-center items-center transition-colors text-sm">
                <Edit3 size={14}/>
            </button>
            <button 
                onClick={() => handleDelete(staff.id)} 
                title="Delete User"
                className="bg-slate-900 border border-slate-700 hover:border-red-500 hover:bg-red-500/10 text-slate-400 hover:text-red-400 py-1.5 rounded-lg flex justify-center items-center transition-colors text-sm">
                <Trash2 size={14}/>
            </button>
        </div>
      )}
    </div>
  );
}