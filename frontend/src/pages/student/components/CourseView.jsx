import React, { useState, useEffect, useRef } from 'react';
import axios from '../../../api/axios';
import { Loader2, Video, MonitorPlay, FileText, FileSignature, CheckCircle, ArrowLeft, X, Lock, CalendarDays, FolderOpen, ChevronDown, Maximize, Minimize, Play, SkipForward } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CourseView({ courseId, onBack }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('recordings');
    const [openFolders, setOpenFolders] = useState({});
    
    // Video Playing State
    const [playingVideo, setPlayingVideo] = useState(null);
    const [nextVideo, setNextVideo] = useState(null);
    
    // Fullscreen State & Ref
    const [isFullscreen, setIsFullscreen] = useState(false);
    const modalRef = useRef(null);

    // API Base URL for images
    const getBaseUrl = () => {
        let url = axios.defaults.baseURL || 'https://imacampus.online/api';
        return url.endsWith('/') ? url.slice(0, -1) : url;
    };

    useEffect(() => {
        axios.get(`/student/module/${courseId}`).then(res => {
            setData(res.data);
            if (res.data?.lessonGroups) {
                const initialOpen = {};
                res.data.lessonGroups.forEach(f => initialOpen[f.id] = true);
                setOpenFolders(initialOpen);
            }
        }).catch(err => {
            console.error(err);
            toast.error("Failed to load course contents.");
        }).finally(() => setLoading(false));
    }, [courseId]);

    // Fullscreen Change Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFolder = (folderId) => setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));

    const getEmbedUrl = (url) => {
        if (!url) return '';
        try {
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/;
                const match = url.match(ytRegex);
                if (match && match[1]) {
                    return `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1&autoplay=1`;
                }
            }
            if (url.includes('drive.google.com') && url.includes('/view')) {
                return url.replace('/view', '/preview?rm=minimal');
            }
            return url; 
        } catch(e) { return url; }
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            modalRef.current?.requestFullscreen().catch(err => console.log(err));
        } else {
            document.exitFullscreen();
        }
    };

    // 🔥 Find Next Video Logic 🔥
    const findNextVideo = (currentItem) => {
        if (!data) return null;
        const currentData = data[activeTab] || [];
        
        const folderId = currentItem.content_group_id ?? currentItem.contentGroupId ?? currentItem.folder_id;
        let sameFolderItems = currentData.filter(item => String(item.content_group_id ?? item.contentGroupId ?? item.folder_id) === String(folderId));
        sameFolderItems.sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1));
        
        const currentIndex = sameFolderItems.findIndex(i => i.id === currentItem.id);
        if (currentIndex !== -1 && currentIndex < sameFolderItems.length - 1) {
            return sameFolderItems[currentIndex + 1];
        }
        return null;
    };

    const handlePlayVideo = (item) => {
        const url = item.link || item.url || '';
        
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            window.open(url, '_blank');
        } else {
            setPlayingVideo({ ...item, secure_link: getEmbedUrl(url) });
            setNextVideo(findNextVideo(item));
        }
    };

    const handleCloseVideo = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(()=>{});
        }
        setPlayingVideo(null);
        setNextVideo(null);
    };

    if (loading) return <div className="flex justify-center items-center py-40"><Loader2 className="animate-spin text-red-500" size={50} /></div>;

    const tabs = [
        { id: 'recordings', name: 'Recordings', icon: MonitorPlay, data: data?.recordings || [] },
        { id: 'live', name: 'Live Classes', icon: Video, data: data?.liveClasses || [] },
        { id: 'documents', name: 'Documents', icon: FileText, data: data?.documents || [] },
        { id: 'sPapers', name: 'Structured Papers', icon: FileSignature, data: data?.sPapers || [] },
        { id: 'papers', name: 'MCQ Exams', icon: CheckCircle, data: data?.papers || [] },
    ];

    const currentTabInfo = tabs.find(t => t.id === activeTab);
    const currentData = currentTabInfo?.data || [];
    const getTypeInt = (id) => ({ live: 1, recordings: 2, documents: 3, sPapers: 4, papers: 5 }[id] || 1);
    const getFolderId = (item) => String(item.content_group_id ?? item.contentGroupId ?? item.folder_id);

    // 🔥 Updated UI Layout: Enlarged Thumbnails & Removed Numbers 🔥
    const renderRow = (item, index) => (
        <div key={item.id} className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 p-4 rounded-2xl transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div className="flex items-center md:items-start gap-4 md:gap-6 flex-1 w-full min-w-0">
                
                {/* 🔥 Enlarged Thumbnail (Numbers removed) 🔥 */}
                <div className="w-36 h-24 md:w-48 md:h-32 shrink-0 rounded-xl bg-black/40 border border-white/10 overflow-hidden relative flex items-center justify-center">
                    {item.thumbnail ? (
                        <img src={`${getBaseUrl()}/storage/documents/${item.thumbnail}`} alt="thumb" className="w-full h-full object-cover" />
                    ) : (
                        <img src="/logo.png" alt="default-thumb" className="w-16 md:w-24 h-auto opacity-30 object-contain drop-shadow-lg" />
                    )}
                </div>

                <div className="flex-1 min-w-0 pt-2 md:pt-4">
                    <h4 className="text-white font-bold text-sm md:text-lg break-words leading-tight mb-2">{item.title}</h4>
                    <p className="text-[10px] md:text-sm text-white/50 font-medium flex items-center gap-1.5 mt-2">
                        <CalendarDays size={16} className="text-red-400 shrink-0"/> {item.date ? new Date(item.date).toDateString() : 'No Date'}
                    </p>
                </div>
            </div>
            
            <div className="w-full md:w-auto flex shrink-0 pt-3 md:pt-0 border-t border-white/5 md:border-0">
                {activeTab === 'live' && <a href={item.link} target="_blank" rel="noreferrer" className="w-full md:w-max bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 transition-all"><Video size={16}/> Join Live</a>}
                {activeTab === 'recordings' && <button onClick={() => handlePlayVideo(item)} className="w-full md:w-max bg-white/10 hover:bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 border border-white/10 transition-all"><MonitorPlay size={16} className='text-red-400'/> Play Video</button>}
                {activeTab === 'documents' && <a href={`${getBaseUrl()}/storage/documents/${item.fileName}`} target="_blank" rel="noreferrer" download className="w-full md:w-max bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2.5 rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 border border-white/10"><FileText size={16} className="text-yellow-400"/> Download</a>}
                {activeTab === 'sPapers' && <a href={`${getBaseUrl()}/storage/documents/${item.fileName}`} target="_blank" rel="noreferrer" download className="w-full md:w-max bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2.5 rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 border border-white/10"><FileSignature size={16} className="text-yellow-400"/> Download</a>}
                {activeTab === 'papers' && <a href={`${getBaseUrl()}/storage/documents/${item.fileName}`} target="_blank" rel="noreferrer" download className="w-full md:w-max bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2.5 rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 border border-white/10"><CheckCircle size={16} className="text-yellow-400"/> Download</a>}
            </div>
        </div>
    );

    const renderContentRows = () => {
        if (currentData.length === 0) return <div className="text-white/40 text-center py-20 font-medium">No content uploaded yet.</div>;
        
        const folders = (data?.lessonGroups || [])
            .filter(f => parseInt(f.type) === getTypeInt(activeTab))
            .sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1));

        const groupedItems = folders.map(folder => ({ 
            folder, 
            items: currentData
                .filter(item => getFolderId(item) === String(folder.id))
                .sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1))
        }));
        
        const uncategorizedItems = currentData
            .filter(item => !folders.find(f => String(f.id) === getFolderId(item)))
            .sort((a, b) => (a.itemOrder || 1) - (b.itemOrder || 1));

        return (
            <div className="flex flex-col gap-6">
                {groupedItems.map(({folder, items}) => (
                    <div key={folder.id} className="bg-black/20 border border-white/10 rounded-2xl overflow-hidden">
                        <div onClick={() => toggleFolder(folder.id)} className="flex justify-between items-center bg-white/5 p-4 md:p-6 cursor-pointer hover:bg-white/10">
                            <h4 className="text-base md:text-lg font-bold text-white flex items-center gap-3"><FolderOpen size={20} className="text-red-500 shrink-0"/> {folder.title}</h4>
                            <ChevronDown className={`text-white/50 transition-transform shrink-0 ${openFolders[folder.id] ? 'rotate-180' : ''}`} />
                        </div>
                        {openFolders[folder.id] && (
                            <div className="p-3 md:p-6 flex flex-col gap-3 border-t border-white/5">
                                {items.length === 0 ? <p className="text-sm text-white/40 text-center py-4">Empty folder</p> : items.map((item, index) => renderRow(item, index))}
                            </div>
                        )}
                    </div>
                ))}
                {uncategorizedItems.map((item, index) => renderRow(item, index))}
            </div>
        );
    };

    return (
        <div className="w-full h-full relative animate-fade-in custom-scrollbar">
            {playingVideo ? (
                /* 🔥 VIDEO PLAYER INLINE MODE (Redesigned & Fixed) 🔥 */
                <div className="flex flex-col items-center justify-start w-full h-full min-h-[calc(100vh-120px)] animate-fade-in max-w-[95%] mx-auto px-2 md:px-4">
                    
                    {/* Top Controls (Back Button Only) */}
                    <div className="w-full flex justify-between items-center mb-4 mt-2">
                        <button onClick={handleCloseVideo} className="text-white/80 hover:text-red-400 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl font-bold flex items-center border border-white/10 transition-colors text-sm shadow-md">
                            <ArrowLeft size={18} className="mr-2" /> Back to Course
                        </button>
                    </div>

                    {/* Video Player Container (Larger Size) */}
                    <div className="relative bg-black flex flex-col mx-auto w-full h-[80vh] md:h-[85vh] rounded-[1.5rem] md:rounded-[2rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden">

                        {/* 🔥 FIXED IFRAME: allowFullScreen added, sandbox WITHOUT allow-downloads 🔥 */}
                        <iframe 
                            src={playingVideo.secure_link || getEmbedUrl(playingVideo.link)} 
                            className="w-full h-full border-none pointer-events-auto bg-white" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                            allowFullScreen={true}
                            webkitallowfullscreen="true"
                            mozallowfullscreen="true"
                            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                            title="Video Player"
                        ></iframe>
                    </div>

                    {/* 🔥 UP NEXT UI 🔥 */}
                    {nextVideo && (
                        <div className="w-full mt-6 bg-white/5 border border-white/10 p-5 md:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md shadow-lg">
                            <div className="flex-1 min-w-0 text-center md:text-left">
                                <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center justify-center md:justify-start gap-2"><SkipForward size={16} className="text-red-400"/> Up Next</h3>
                                <h2 className="text-white text-lg md:text-xl font-bold truncate">{nextVideo.title}</h2>
                            </div>
                            <button onClick={() => handlePlayVideo(nextVideo)} className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shrink-0 shadow-lg shadow-red-600/20 hover:scale-[1.02]">
                                <Play size={18} fill="currentColor" /> Play Next
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                /* 🔥 COURSE CONTENT LIST 🔥 */
                <div className="animate-fade-in w-full h-full">
                    <button onClick={onBack} className="mb-6 text-white/70 hover:text-red-400 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl font-bold flex items-center border border-white/10 w-max transition-colors text-sm">
                        <ArrowLeft size={16} className="mr-2" /> Back
                    </button>

                    <div className="glass-card p-6 rounded-[1.5rem] md:rounded-[2rem] mb-6 border border-white/10">
                        <h2 className="text-xl md:text-2xl font-extrabold text-white break-words">{data?.course?.name || 'Subject Content'}</h2>
                    </div>

                    <div className="flex overflow-x-auto gap-2 mb-6 pb-2 custom-scrollbar scroll-smooth no-scrollbar">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all border ${activeTab === tab.id ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'}`}>
                                <tab.icon size={16} className={activeTab === tab.id ? 'text-white' : 'text-white/40'}/> {tab.name} 
                            </button>
                        ))}
                    </div>

                    <div className="glass-card p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] min-h-[400px] border border-white/10">
                        {String(data?.paidStatus) !== '1' ? (
                            <div className="text-center py-20 px-4">
                                <Lock size={40} className="text-red-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Access Locked</h3>
                                <p className="text-white/60 text-xs md:text-sm">Please settle your payment to view content.</p>
                            </div>
                        ) : renderContentRows()}
                    </div>
                </div>
            )}
        </div>
    );
}