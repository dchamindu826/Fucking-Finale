import React, { useState, useEffect } from 'react';
import axios from "../../../api/axios";
import { Loader2, Bell, AlertTriangle, CheckCircle, Calendar, Clock, User, X, Smartphone, Download, AlertCircle, Apple } from 'lucide-react';
import AIChatWidget from './AIChatWidget';
import toast from 'react-hot-toast';

export default function StudentOverview() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedImage, setSelectedImage] = useState(null); 
    
    // 🔥 Popup එක පෙන්නන්න State එක (True කියන්නේ මුලින්ම පෙන්නනවා)
    const [showAppPopup, setShowAppPopup] = useState(true); 

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const backendBaseUrl = axios.defaults.baseURL ? axios.defaults.baseURL.replace('/api', '') : 'https://imacampus.online';

    const profilePic = user.image && user.image !== 'default.png' && user.image !== 'null'
        ? `${backendBaseUrl}/storage/images/${user.image}` 
        : null;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        axios.get('/student/dashboard')
            .then(res => {
                setData(res.data);
                if (res.data?.alerts) {
                    res.data.alerts.forEach(alert => {
                        if(alert.type === 'locked') toast.error(alert.msg, { duration: 8000 });
                        else toast(alert.msg, { icon: '⚠️', duration: 5000 });
                    });
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
        return () => clearInterval(timer);
    }, []);

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-500" size={40} /></div>;

    return (
        <div className="w-full max-w-6xl mx-auto pb-20 relative px-2 sm:px-0 custom-scrollbar">
            
            {/* 🔥 APP DOWNLOAD POPUP MODAL 🔥 */}
            {showAppPopup && (
                <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0f172a] border border-blue-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl shadow-blue-900/20 relative animate-in zoom-in-95 duration-300">
                        
                        {/* Close Button */}
                        <button 
                            onClick={() => setShowAppPopup(false)}
                            className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-all"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="bg-blue-600/20 p-4 rounded-2xl mb-4 border border-blue-500/30 text-blue-400">
                                <Smartphone size={40} />
                            </div>
                            
                            <h2 className="text-2xl font-black text-white mb-2">Get the IMA Campus App!</h2>
                            <p className="text-white/70 text-sm mb-6">
                                Experience seamless learning directly from your mobile device. Download the app now for the best experience.
                            </p>

                            {/* Android Section (APK) */}
                            <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 mb-4">
                                <h3 className="text-white font-bold mb-3 text-sm flex items-center justify-center gap-2">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" alt="Android" className="w-5 h-5" /> 
                                    For Android Users
                                </h3>
                                
                                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-4 text-left flex gap-3 items-start">
                                    <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                                    <p className="text-[11px] text-orange-200/90 leading-relaxed">
                                        Our new update is waiting for Play Store approval. Until then, please download the APK directly. 
                                        If you see a security warning, please tap <strong className="text-white">"More details"</strong> and select <strong className="text-white">"Install anyway"</strong> (Don't worry, it's 100% safe!).
                                    </p>
                                </div>

                                <a 
                                    href={`${backendBaseUrl}/app-release.apk`} // 🔥 ඔයාගේ APK එකේ Path එක
                                    download
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                                >
                                    <Download size={18} /> Download APK Directly
                                </a>
                            </div>

                            {/* iOS Section */}
                            <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-4">
                                <h3 className="text-white font-bold mb-3 text-sm flex items-center justify-center gap-2">
                                    <Apple size={20} className="text-white" /> 
                                    For iOS Users
                                </h3>
                                <a 
                                    href="https://apps.apple.com/lk/app/ima-campus/id6759137655" // 🔥 මෙතන ඔයාගේ App Store Link එක දාන්න
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10"
                                >
                                    View on App Store
                                </a>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            {/* 🔥 END POPUP MODAL 🔥 */}

            {/* 🔥 APP DOWNLOAD BANNER (IN-PAGE) 🔥 */}
            <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
                        <Smartphone size={24} />
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-sm md:text-base">Download IMA Campus App</h4>
                        <p className="text-white/60 text-[10px] md:text-xs">Experience seamless learning on your mobile device.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowAppPopup(true)} // Banner එක එබුවත් Popup එක එන්න හැදුවා
                        className="flex items-center gap-2 bg-black/40 hover:bg-black border border-white/10 px-4 py-2 rounded-xl transition-all text-white font-bold text-sm"
                    >
                        <Download size={16} /> Get App
                    </button>
                </div>
            </div>

            {/* --- TOP GREETING CARD --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-5 glass-card p-6 md:p-8 rounded-[2rem]">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
                        {getGreeting()}, <span className="text-red-500">{user.fName}</span>
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 text-white/70 text-xs sm:text-sm font-medium">
                        <span className="bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2"><Calendar size={14} className="text-yellow-400"/> {currentTime.toLocaleDateString()}</span>
                        <span className="bg-white/5 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2"><Clock size={14} className="text-red-400"/> {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
                
                <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-4 w-full lg:w-auto">
                    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-red-600 to-orange-500 animate-pulse"></div>
                        <div className="absolute inset-0.5 bg-[#0a0f1c] rounded-full z-10"></div>
                        {profilePic ? <img src={profilePic} alt="Profile" className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full object-cover z-20" /> : <User size={20} className="text-white/50 relative z-20" />}
                    </div>
                    <div>
                        <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Enrolled</p>
                        <p className="text-2xl font-black text-white leading-none">{data?.enrolledCount || 0} <span className="text-sm font-bold text-white/60">Subjects</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    {data?.upcomingLive && (
                        <div className="glass-card bg-gradient-to-br from-red-600/10 to-red-900/10 border-red-500/30 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
                            <div className="relative z-10 w-full text-center sm:text-left">
                                <div className="inline-flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1 rounded-full mb-3 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    <span className="text-white font-bold uppercase tracking-widest text-[10px]">Upcoming Stream</span>
                                </div>
                                <h2 className="text-xl md:text-2xl font-black text-white mb-1 leading-tight break-words">{data.upcomingLive.title}</h2>
                                <p className="text-white/70 text-xs md:text-sm font-medium">{data.upcomingLive.courseName}</p>
                            </div>
                            <a href={data.upcomingLive.link} target="_blank" rel="noreferrer" className="shrink-0 w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-black py-3 px-8 rounded-xl transition-all shadow-xl flex items-center justify-center gap-2 text-sm uppercase">
                                <Play size={16} className="fill-white"/> Join Now
                            </a>
                        </div>
                    )}

                    <div className="glass-card rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <Bell className="text-yellow-400 w-5 h-5"/> Latest Updates
                        </h3>
                        <div className="space-y-6">
                            {data?.posts?.length === 0 ? (
                                <div className="text-center text-white/40 py-10 text-sm">No updates yet.</div>
                            ) : data?.posts?.map((post) => {
                                const postImage = post.image && post.image !== 'default.png' && post.image !== 'null' ? `${backendBaseUrl}/storage/posts/${post.image}` : null;
                                return (
                                    <div key={post.id} className="bg-black/20 border border-white/5 rounded-2xl p-4 hover:bg-black/30 transition-all flex flex-col sm:flex-row gap-5">
                                        {postImage && (
                                            <img src={postImage} onClick={() => setSelectedImage(postImage)} alt="" className="w-full sm:w-40 h-32 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-all shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold mb-2 break-words">{post.title}</h4>
                                            <p className="text-white/60 text-xs leading-relaxed line-clamp-3 mb-3 break-words">{post.caption || post.description}</p>
                                            <div className="flex items-center gap-3 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(post.created_at).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><Clock size={12}/> {new Date(post.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <AlertTriangle className="text-red-500 w-5 h-5"/> Due Payments
                        </h3>
                        <div className="space-y-4">
                            {data?.duePayments?.length === 0 ? (
                                <div className="text-center py-6">
                                    <CheckCircle className="text-green-500 mx-auto mb-2" size={30}/>
                                    <p className="text-white/60 text-xs">All clear!</p>
                                </div>
                            ) : data?.duePayments?.map((p, idx) => (
                                <div key={idx} className={`p-4 rounded-2xl bg-black/40 border ${p.diffDays < 0 ? 'border-red-500/30' : 'border-white/5'}`}>
                                    <h4 className="text-white font-bold text-xs mb-2 break-words">{p.courseName}</h4>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] text-white/40 uppercase font-bold">Amount</p>
                                            <p className="text-sm font-black text-white">LKR {parseFloat(p.amount).toFixed(2)}</p>
                                        </div>
                                        <p className={`text-[10px] font-bold px-2 py-1 rounded-lg ${p.diffDays < 0 ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                            {p.diffDays < 0 ? 'Overdue' : 'Upcoming'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <AIChatWidget />

            {selectedImage && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                    <button className="absolute top-6 right-6 text-white/50 hover:text-white"><X size={30}/></button>
                    <img src={selectedImage} alt="" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300" />
                </div>
            )}
        </div>
    );
}