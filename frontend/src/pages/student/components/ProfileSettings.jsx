import React, { useState } from 'react';
import axios from '../../../api/axios';
import { User, Lock, Save, Loader2, Camera, Settings, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfileSettings() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [loading, setLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false);

    const districts = ["Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"];

    // User Details Form State
    const [details, setDetails] = useState({
        addressHouseNo: user.addressHouseNo || '',
        addressStreet: user.addressStreet || '',
        city: user.city || '',
        district: user.district || ''
    });

    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    const [dpFile, setDpFile] = useState(null);
    // 🔥 FIX: Check local storage image exactly
    const [previewUrl, setPreviewUrl] = useState(user.image && user.image !== 'default.png' && user.image !== 'null' ? `http://72.62.249.211:5000/images/${user.image}` : null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setDpFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleDetailsChange = (e) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    // 🔥 Update Profile Picture & Address Details 🔥
    const handleSaveDetails = async (e) => {
        e.preventDefault();
        
        setLoading(true);
        try {
            const formData = new FormData();
            if (dpFile) formData.append('image', dpFile);
            formData.append('addressHouseNo', details.addressHouseNo);
            formData.append('addressStreet', details.addressStreet);
            formData.append('city', details.city);
            formData.append('district', details.district);

            const res = await axios.post('/student/profile/update', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update LocalStorage carefully
            const updatedUser = { ...user, ...details };
            // 🔥 FIX: Capture new image name from backend
            if (res.data.image) updatedUser.image = res.data.image; 
            
            localStorage.setItem('user', JSON.stringify(updatedUser));
            toast.success("Profile updated successfully!");
            
            // Reload window to update the sidebar image instantly
            setTimeout(() => window.location.reload(), 1000);
            
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    // 🔥 Update Password 🔥
    const handleSavePassword = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            return toast.error("New passwords do not match!");
        }

        setPassLoading(true);
        try {
            await axios.post('/student/profile/password', {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });

            toast.success("Password changed successfully!");
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to change password.");
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto animate-fade-in pb-20">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                    <Settings size={30} className="text-red-500"/>
                </div>
                <div>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-wider uppercase">Profile Settings</h2>
                    <p className="text-white/60 mt-1 text-xs md:text-sm font-medium">Manage your account details and security.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Profile Details Form */}
                <div className="lg:col-span-2 glass-card rounded-[2rem] p-6 md:p-10 border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3"><User className="text-orange-400"/> Personal Information</h3>
                    
                    <form onSubmit={handleSaveDetails} className="space-y-6">
                        <div className="flex flex-col items-center sm:flex-row gap-6 mb-8 bg-black/20 p-6 rounded-3xl border border-white/5">
                            <div className="relative group cursor-pointer w-28 h-28 shrink-0">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-red-600 to-orange-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                                <img src={previewUrl || '/logo.png'} alt="Profile" className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full object-cover z-10 bg-[#0a0f1c]" />
                                
                                <label className="absolute inset-1 rounded-full bg-black/60 z-20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera size={20} className="text-white mb-1"/>
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Change</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </label>
                            </div>
                            <div className="text-center sm:text-left">
                                <h4 className="text-lg font-bold text-white">Profile Picture</h4>
                                <p className="text-xs text-white/50 mt-1 mb-3 font-medium">Upload a square image (JPG, PNG). Max 2MB.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 block">First Name</label>
                                <input type="text" value={user.fName || user.firstName || ''} disabled className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white/50 outline-none text-sm cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 block">Last Name</label>
                                <input type="text" value={user.lName || user.lastName || ''} disabled className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white/50 outline-none text-sm cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 block">Phone Number</label>
                                <input type="text" value={user.phone || ''} disabled className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white/50 outline-none text-sm cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 block">NIC</label>
                                <input type="text" value={user.nic || ''} disabled className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white/50 outline-none text-sm cursor-not-allowed" />
                            </div>
                        </div>

                        <div className="pt-6 mt-6 border-t border-white/10">
                            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><MapPin size={16} className="text-emerald-400"/> Delivery Address</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2 block">House Number</label>
                                    <input type="text" name="addressHouseNo" value={details.addressHouseNo} onChange={handleDetailsChange} placeholder="e.g. 123/A" className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-500 transition-all text-sm shadow-inner" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2 block">Street Name</label>
                                    <input type="text" name="addressStreet" value={details.addressStreet} onChange={handleDetailsChange} placeholder="Main Street" className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-500 transition-all text-sm shadow-inner" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2 block">City / Town</label>
                                    <input type="text" name="city" value={details.city} onChange={handleDetailsChange} placeholder="Your City" className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-500 transition-all text-sm shadow-inner" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-2 block">District</label>
                                    <select name="district" value={details.district} onChange={handleDetailsChange} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-500 transition-all text-sm shadow-inner cursor-pointer appearance-none">
                                        <option value="" disabled className="bg-slate-900">Select District</option>
                                        {districts.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button type="submit" disabled={loading} className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-70 flex items-center justify-center gap-2 text-sm uppercase tracking-widest w-full sm:w-auto">
                                {loading ? <Loader2 size={18} className="animate-spin"/> : <><Save size={18}/> Update Profile</>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* 2. Change Password Form */}
                <div className="glass-card rounded-[2rem] p-6 md:p-8 border border-white/10 h-max">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3"><Lock className="text-red-500"/> Security</h3>
                    <form onSubmit={handleSavePassword} className="space-y-5">
                        <div>
                            <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 block">Current Password</label>
                            <input type="password" required value={passwords.currentPassword} onChange={e => setPasswords({...passwords, currentPassword: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-500 transition-all text-sm shadow-inner" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 block">New Password</label>
                            <input type="password" required value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-500 transition-all text-sm shadow-inner" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 block">Confirm New Password</label>
                            <input type="password" required value={passwords.confirmPassword} onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-red-500 transition-all text-sm shadow-inner" />
                        </div>
                        
                        <div className="pt-2">
                            <button type="submit" disabled={passLoading} className="w-full bg-black/40 hover:bg-black/60 border border-red-500/50 hover:border-red-500 text-red-400 hover:text-red-300 font-bold py-3.5 rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-inner">
                                {passLoading ? <Loader2 size={18} className="animate-spin"/> : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}