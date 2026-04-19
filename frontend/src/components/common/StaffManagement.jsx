import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit3, Trash2, Shield, UserPlus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function StaffManagement({ loggedInUser }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const isAdmin = loggedInUser?.role?.toUpperCase() === 'SYSTEM_ADMIN' || loggedInUser?.role?.toUpperCase() === 'DIRECTOR';
  // Manager නම් එයාට Create කරන්න පුළුවන් Coordinator සහ Staff විතරයි
  const availableRoles = isAdmin ? ['Director', 'System Admin', 'Manager', 'Ass Manager', 'Coordinator', 'Staff'] : ['Coordinator', 'Staff'];

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phone: '', nic: '', password: '', role: availableRoles[0], department: loggedInUser?.department || 'Class Coordination'
  });

  const departments = ['Class Coordination', 'Finance', 'Call Center', 'Delivery', 'Technical'];
  const isDepartmentDisabled = formData.role === 'Director' || formData.role === 'System Admin' || !isAdmin; // Manager කෙනෙක් නම් එයාගේ ඩිපාර්ට්මන්ට් එක වෙනස් කරන්න බෑ

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/admin/staff'); // Backend එකෙන් මේ user ට අදාල අයව විතරක් එවන්න ඕනේ
      setStaffList(res.data);
    } catch (error) {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
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
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.error || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
      if(!window.confirm("Are you sure you want to delete this staff member?")) return;
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
          firstName: staff.firstName, lastName: staff.lastName, phone: staff.phone, nic: staff.nic, password: '', role: staff.role, department: staff.department
      });
      setShowModal(true);
  };

  const resetForm = () => {
      setEditMode(false);
      setEditId(null);
      setFormData({ firstName: '', lastName: '', phone: '', nic: '', password: '', role: availableRoles[0], department: loggedInUser?.department || 'Class Coordination' });
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={50} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 flex flex-col font-sans pb-10">
      <div className="mb-8 bg-slate-800/30 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 shadow-lg">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3"><Users className="text-blue-500" size={32}/> Staff Management</h2>
          <p className="text-slate-400 mt-2 font-medium">Manage {isAdmin ? 'all system staff' : 'your department coordinators'}.</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20">
          <UserPlus size={20}/> Add New Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {staffList.map((staff) => (
          <div key={staff.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl shadow-lg hover:bg-white/10 transition-colors group relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${staff.role === 'Director' || staff.role === 'System Admin' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
            
            <div className="flex justify-between items-start mb-4 pl-3">
              <div>
                <h3 className="text-xl font-bold text-white">{staff.firstName} {staff.lastName}</h3>
                <p className="text-sm text-slate-400 mt-1">{staff.phone} • {staff.nic}</p>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl text-slate-300">
                {staff.role === 'Director' || staff.role === 'System Admin' ? <Shield size={24} className="text-purple-400"/> : <Users size={24} className="text-blue-400"/>}
              </div>
            </div>

            <div className="pl-3 mt-4 flex flex-wrap gap-2 mb-6">
              <span className="text-[10px] font-bold bg-white/10 text-white px-2.5 py-1 rounded border border-white/5 uppercase tracking-wide">{staff.role}</span>
              {staff.department && <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded border border-blue-500/20 uppercase tracking-wide">{staff.department}</span>}
            </div>

            <div className="pl-3 flex gap-2 border-t border-white/10 pt-4">
                <button onClick={() => openEditModal(staff)} className="flex-1 bg-white/5 hover:bg-blue-600 hover:text-white text-blue-400 border border-white/5 py-2 rounded-xl flex justify-center items-center gap-2 transition-colors text-sm font-bold"><Edit3 size={16}/> Edit</button>
                <button onClick={() => handleDelete(staff.id)} className="flex-1 bg-white/5 hover:bg-red-600 hover:text-white text-red-400 border border-white/5 py-2 rounded-xl flex justify-center items-center gap-2 transition-colors text-sm font-bold"><Trash2 size={16}/> Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="bg-slate-800/90 border border-white/10 rounded-[2rem] p-8 w-full max-w-2xl shadow-2xl backdrop-blur-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3"><UserPlus className="text-blue-400"/> {editMode ? 'Edit Staff Account' : 'Create Staff Account'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-red-500"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block uppercase tracking-wider">First Name</label>
                  <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block uppercase tracking-wider">Last Name</label>
                  <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block uppercase tracking-wider">Phone</label>
                  <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block uppercase tracking-wider">NIC</label>
                  <input type="text" required value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block uppercase tracking-wider">Role</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-blue-500 cursor-pointer">
                    {availableRoles.map(r => <option key={r} value={r} className="bg-slate-800">{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block uppercase tracking-wider">Department</label>
                  <select disabled={isDepartmentDisabled} value={isDepartmentDisabled ? loggedInUser?.department : formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50">
                    {isAdmin ? departments.map(d => <option key={d} value={d} className="bg-slate-800">{d}</option>) : <option value={loggedInUser?.department}>{loggedInUser?.department}</option>}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block uppercase tracking-wider">Password {editMode && <span className="text-blue-400 normal-case tracking-normal">(Leave blank to keep current)</span>}</label>
                  <input type="password" required={!editMode} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-blue-500" />
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 text-sm rounded-2xl shadow-lg mt-4 flex items-center justify-center uppercase tracking-widest disabled:opacity-70">
                {saving ? <Loader2 className="animate-spin" size={20}/> : (editMode ? 'Update Account' : 'Create Account')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}