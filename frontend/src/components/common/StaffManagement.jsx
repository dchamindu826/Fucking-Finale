import React, { useState, useEffect } from 'react';
import { Users, Edit3, Trash2, Shield, UserPlus, X, Loader2, Search, Briefcase, Layers } from 'lucide-react';
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
  const staffDepts = ['Finance', 'Technical', 'Call Center', 'Delivery']; // Staff cannot be Class Coord
  
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

  // Matrix Logic Handling
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

  // Lists Categorization
  const filteredStaff = staffList.filter(s => 
    (s.firstName + " " + s.lastName).toLowerCase().includes(searchQuery.toLowerCase()) || s.phone.includes(searchQuery)
  );

  const topLevelStaff = filteredStaff.filter(s => s.role === 'System Admin' || s.role === 'Director');
  
  const classCoordStaff = filteredStaff.filter(s => s.department === 'Class Coordination');
  const groupedByBusiness = classCoordStaff.reduce((acc, staff) => {
      const biz = staff.businessType || 'Unassigned Business';
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

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={50} className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="w-full text-slate-300 animate-in fade-in duration-500 flex flex-col font-sans pb-10">
      
      {/* Header */}
      <div className="mb-8 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-6 rounded-3xl shadow-lg flex flex-col xl:flex-row justify-between gap-6 xl:items-center">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Users className="text-emerald-500" size={28}/> 
            {isAdmin ? 'System Staff & Hierarchy' : 'My Department Team'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {isAdmin ? 'Manage entire organization structure, departments, and businesses.' : `Manage members for ${loggedInUser?.department} ${loggedInUser?.businessType ? `(${loggedInUser?.businessType})` : ''}.`}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-base text-slate-100 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20 whitespace-nowrap">
            <UserPlus size={20}/> Create Account
          </button>
        </div>
      </div>

      {/* Categorized Staff Display */}
      <div className="space-y-10">
        
        {/* System Administration */}
        {isAdmin && topLevelStaff.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
               <Shield className="text-purple-500" size={20}/> System Administration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {topLevelStaff.map(staff => <StaffCard key={staff.id} staff={staff} openEditModal={openEditModal} handleDelete={handleDelete} color="purple" canEdit={true} />)}
            </div>
          </div>
        )}

        {/* Class Coordination Department */}
        {Object.keys(groupedByBusiness).length > 0 && (
           <div className="bg-blue-900/10 border border-blue-900/30 p-6 rounded-3xl">
              <h3 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2 border-b border-blue-900/50 pb-3">
                 <Layers className="text-blue-500" size={24}/> Class Coordination Department
              </h3>
              <div className="space-y-8">
                 {Object.keys(groupedByBusiness).map(biz => (
                    <div key={biz} className="pl-4 border-l-2 border-blue-500/30">
                       <h4 className="text-sm font-bold text-white mb-4 bg-slate-900 inline-block px-4 py-1.5 rounded-lg border border-slate-700/50 shadow-sm">
                          Business: <span className="text-blue-300 ml-1">{biz}</span>
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                          {groupedByBusiness[biz].map(staff => <StaffCard key={staff.id} staff={staff} openEditModal={openEditModal} handleDelete={handleDelete} color="blue" canEdit={true} />)}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* Other Departments */}
        {Object.keys(groupedByDept).length > 0 && (
           <div className="bg-emerald-900/5 border border-emerald-900/20 p-6 rounded-3xl">
              <h3 className="text-xl font-bold text-emerald-500 mb-6 flex items-center gap-2 border-b border-emerald-900/30 pb-3">
                 <Briefcase className="text-emerald-500" size={24}/> Other Departments
              </h3>
              <div className="space-y-8">
                 {Object.keys(groupedByDept).map(dept => (
                    <div key={dept} className="pl-4 border-l-2 border-emerald-500/30">
                       <h4 className="text-sm font-bold text-white mb-4 bg-slate-900 inline-block px-4 py-1.5 rounded-lg border border-slate-700/50 shadow-sm">
                          Department: <span className="text-emerald-400 ml-1">{dept}</span>
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                          {groupedByDept[dept].map(staff => <StaffCard key={staff.id} staff={staff} openEditModal={openEditModal} handleDelete={handleDelete} color="emerald" canEdit={true} />)}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {filteredStaff.length === 0 && (
          <div className="text-center py-20 text-slate-500 bg-slate-900/20 rounded-3xl border border-slate-800/50">
            <Users size={56} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg">No staff members found matching your search.</p>
          </div>
        )}
      </div>

      {/* Creation / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#1e293b] border border-slate-700 rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            
            <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                 <UserPlus className="text-emerald-400" size={28}/> 
                 {editMode ? 'Edit Account Details' : 'Create New Account'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2.5 rounded-xl border border-slate-600 hover:bg-red-500 hover:border-red-500 transition-colors"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">First Name</label>
                  <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl p-3.5 text-base text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Last Name</label>
                  <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl p-3.5 text-base text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Phone Number</label>
                  <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl p-3.5 text-base text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">NIC Number</label>
                  <input type="text" required value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl p-3.5 text-base text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
                </div>
              </div>

              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/80">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* ROLE */}
                  <div className={(formData.role === 'System Admin' || formData.role === 'Director') ? 'col-span-2' : 'col-span-1'}>
                    <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Assign Role</label>
                    <select disabled={!isAdmin} value={formData.role} onChange={e => handleRoleChange(e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl p-3.5 text-base text-white outline-none focus:border-emerald-500 disabled:opacity-50">
                      {isAdmin ? allRoles.map(r => <option key={r} value={r}>{r}</option>) : <option value={formData.role}>{formData.role}</option>}
                    </select>
                  </div>

                  {/* DEPARTMENT */}
                  {formData.role !== 'System Admin' && formData.role !== 'Director' && (
                    <div className="col-span-1">
                      <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Department</label>
                      <select disabled={!isAdmin || formData.role === 'Coordinator'} value={formData.department} onChange={e => handleDeptChange(e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl p-3.5 text-base text-white outline-none focus:border-emerald-500 disabled:opacity-50">
                        {isAdmin 
                           ? (formData.role === 'Staff' 
                               ? staffDepts.map(d => <option key={d} value={d}>{d}</option>) 
                               : allDepts.map(d => <option key={d} value={d}>{d}</option>)) 
                           : <option value={formData.department}>{formData.department}</option>
                        }
                      </select>
                    </div>
                  )}

                  {/* BUSINESS */}
                  {formData.department === 'Class Coordination' && formData.role !== 'System Admin' && formData.role !== 'Director' && (
                    <div className="col-span-2 mt-2">
                      <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Allocate Business</label>
                      <select disabled={!isAdmin} required value={formData.businessType} onChange={e => setFormData({...formData, businessType: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl p-3.5 text-base text-white outline-none focus:border-emerald-500 disabled:opacity-50">
                        {isAdmin 
                           ? (businesses.length > 0 ? businesses.map(b => <option key={b.id} value={b.name}>{b.name}</option>) : <option value="">No businesses created</option>)
                           : <option value={formData.businessType}>{formData.businessType}</option>
                        }
                      </select>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">
                  Password {editMode && <span className="text-emerald-400 normal-case tracking-normal ml-2">(Leave blank to keep current)</span>}
                </label>
                <input type="password" required={!editMode} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl p-3.5 text-base text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
              </div>
              
              <button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 text-base rounded-xl shadow-lg shadow-emerald-600/20 mt-4 flex items-center justify-center uppercase tracking-widest disabled:opacity-70 transition-colors">
                {saving ? <Loader2 className="animate-spin" size={24}/> : (editMode ? 'Save Changes' : 'Create Member')}
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}

// Staff Card Component
function StaffCard({ staff, openEditModal, handleDelete, color, canEdit }) {
  const colorMap = {
    purple: 'bg-purple-600/20 border-purple-500/40 text-purple-400',
    blue: 'bg-blue-600/20 border-blue-500/40 text-blue-400',
    emerald: 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400',
  };

  return (
    <div className="bg-[#1e293b] border border-slate-700/80 p-5 rounded-2xl shadow-md hover:bg-[#0f172a] transition-all relative overflow-hidden flex flex-col justify-between">
      
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">{staff.firstName} {staff.lastName}</h3>
            <p className="text-sm text-slate-400 font-mono">{staff.phone} • {staff.nic}</p>
          </div>
          <div className={`p-2.5 rounded-xl border ${colorMap[color]}`}>
            {color === 'purple' ? <Shield size={22}/> : color === 'emerald' ? <Briefcase size={22}/> : <Users size={22}/>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`text-[11px] font-bold px-3 py-1 rounded-md uppercase tracking-wider ${colorMap[color]}`}>{staff.role}</span>
          {staff.department && <span className="text-[11px] font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-md border border-slate-700 uppercase tracking-wider">{staff.department}</span>}
          {staff.businessType && <span className="text-[11px] font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-md border border-slate-700 uppercase tracking-wider">{staff.businessType}</span>}
        </div>
      </div>

      {canEdit && (
        <div className="flex gap-3 border-t border-slate-700/50 pt-4 mt-auto">
            <button onClick={() => openEditModal(staff)} className="flex-1 bg-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-blue-400 border border-slate-700 py-2 rounded-xl flex justify-center items-center gap-2 transition-all text-sm font-bold"><Edit3 size={16}/> Edit</button>
            <button onClick={() => handleDelete(staff.id)} className="flex-1 bg-slate-800 hover:bg-red-600 hover:text-white hover:border-red-600 text-red-400 border border-slate-700 py-2 rounded-xl flex justify-center items-center gap-2 transition-all text-sm font-bold"><Trash2 size={16}/> Delete</button>
        </div>
      )}
    </div>
  );
}