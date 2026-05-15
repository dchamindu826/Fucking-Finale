import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Music, X } from 'lucide-react';

export default function MainLayout({ loggedInUser, handleLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [bgImage, setBgImage] = useState(() => {
    return localStorage.getItem('adminTheme') || 'color1';
  });
  
  const [isSpotifyOpen, setIsSpotifyOpen] = useState(false);
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('adminTheme', bgImage);
    document.documentElement.classList.add('dark');
  }, [bgImage]);

  const getBackgroundStyle = () => {
    let liveSkyStyle = {};
    if (bgImage === 'anim1') {
        if (currentHour >= 6 && currentHour < 8) {
            liveSkyStyle = { background: 'linear-gradient(to bottom, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)' };
        } else if (currentHour >= 8 && currentHour < 17) {
            liveSkyStyle = { background: 'linear-gradient(to bottom, #4facfe 0%, #00f2fe 100%)' };
        } else if (currentHour >= 17 && currentHour < 19) {
            liveSkyStyle = { background: 'linear-gradient(to bottom, #fa709a 0%, #fee140 100%)' };
        } else {
            liveSkyStyle = { background: 'linear-gradient(to bottom, #0B101E, #1A1A2E, #16213E)' };
        }
    }

    const themes = {
      color1: { background: '#60A5FA' }, 
      color2: { background: '#A78BFA' }, 
      color3: { background: '#D946EF' }, 
      
      grad1: { background: 'linear-gradient(135deg, #1E40AF 0%, #B91C1C 100%)' }, 
      grad2: { background: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)' }, 
      grad3: { background: 'linear-gradient(135deg, #374151 0%, #EF4444 100%)' }, 
      
      anim1: liveSkyStyle,
      anim2: {}, 
      anim3: { background: '#0F172A' }, 

      wall1: { backgroundImage: "url('/bg1.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' },
      wall2: { backgroundImage: "url('/bg2.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' },
      wall3: { backgroundImage: "url('/bg3.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' },
      wall4: { backgroundImage: "url('/bg4.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' },
      wall5: { backgroundImage: "url('/bg5.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' },
    };
    return themes[bgImage] || themes['color1'];
  };

  const getBackgroundClass = () => {
    if (bgImage === 'anim2') return 'bg-anim-color-shift'; 
    return '';
  };

  return (
    <div className={`font-sans flex items-center justify-center w-full overflow-hidden antialiased text-gray-100 transition-all duration-1000 fixed inset-0 m-0 p-0 ${getBackgroundClass()}`} style={getBackgroundStyle()}>
      
      {/* ⛅ LIVE SKY ANIMATION */}
      {bgImage === 'anim1' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {currentHour >= 6 && currentHour <= 18 ? (
            <div className="absolute rounded-full bg-gradient-to-br from-yellow-100 to-orange-400 w-32 h-32 blur-[2px]"
                 style={{
                   top: `${10 + Math.abs(currentHour - 12) * 6}%`, 
                   left: `${((currentHour - 6) / 12) * 90}%`,
                   boxShadow: '0 0 120px 40px rgba(255, 165, 0, 0.6)',
                   transition: 'all 2s ease-in-out'
                 }}
            />
          ) : (
            <div className="absolute rounded-full bg-white w-24 h-24 blur-[1px] shadow-[0_0_80px_20px_rgba(255,255,255,0.4)] top-[20%] right-[15%] animate-[pulse_4s_ease-in-out_infinite]" />
          )}
        </div>
      )}

      {/* 🎾 NEW: FLOATING BALLS ANIMATION (Anim 3) */}
      {bgImage === 'anim3' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-[80px] animate-float-ball-1"></div>
            <div className="absolute w-[350px] h-[350px] rounded-full bg-purple-500/20 blur-[80px] animate-float-ball-2"></div>
            <div className="absolute w-[450px] h-[450px] rounded-full bg-emerald-500/20 blur-[80px] animate-float-ball-3"></div>
        </div>
      )}

      <div className="flex w-full h-full sm:w-[98%] sm:h-[96vh] bg-black/20 backdrop-blur-2xl border border-white/10 sm:rounded-[20px] shadow-[0_8px_32px_0_rgba(0,0,0,0.7)] overflow-hidden relative z-10 transition-colors duration-500">
        <Sidebar 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen}
          userRole={loggedInUser?.role} 
          loggedInUser={loggedInUser} 
          handleLogout={handleLogout}
          currentBg={bgImage}
          setBgImage={setBgImage}
          isSpotifyOpen={isSpotifyOpen}
          setIsSpotifyOpen={setIsSpotifyOpen}
        />
        <main className="flex-1 flex flex-col overflow-hidden relative bg-transparent z-10">
          <div className="flex-1 overflow-auto p-4 lg:p-6 relative custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* SPOTIFY PLAYER */}
      <div className={`fixed bottom-6 ${isSidebarOpen ? 'left-[17rem]' : 'left-24'} z-50 flex flex-col gap-3 transition-all duration-300`}>
        <div className={`${isSpotifyOpen ? 'opacity-100 scale-100 block' : 'opacity-0 scale-95 hidden'} transition-all duration-300 transform origin-bottom-left shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden border border-white/10 bg-[#090E17]/80 backdrop-blur-2xl w-80`}>
            <div className="bg-white/5 p-3 flex justify-between items-center border-b border-white/10">
                <span className="text-xs font-bold text-gray-200 flex items-center gap-2">
                    <Music className="w-4 h-4 text-brand-accent" /> Work Vibes
                </span>
                <button onClick={() => setIsSpotifyOpen(false)} className="text-gray-400 hover:text-brand-accent transition-colors outline-none"><X className="w-4 h-4" /></button>
            </div>
            <iframe style={{ borderRadius: '0px' }} src="https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0" width="100%" height="152" frameBorder="0" allowFullScreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        </div>
      </div>
    </div>
  );
}