import React from 'react';
import { Truck, Sparkles } from 'lucide-react';

export default function DeliveryHub() {
    return (
        <div className="w-full max-w-6xl mx-auto animate-fade-in pb-20">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                    <Truck size={30} className="text-orange-500"/>
                </div>
                <div>
                    <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-wider uppercase">Delivery Hub</h2>
                    <p className="text-white/60 mt-1 text-xs md:text-sm font-medium">Track your tutes and study materials.</p>
                </div>
            </div>

            <div className="glass-card rounded-[2.5rem] p-10 md:p-20 border border-white/10 flex flex-col items-center text-center relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-600/10 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="w-24 h-24 bg-gradient-to-tr from-orange-500/20 to-red-600/20 rounded-3xl flex items-center justify-center border border-orange-500/30 mb-8 shadow-[0_0_30px_rgba(249,115,22,0.15)] relative z-10">
                    <Truck size={48} className="text-orange-400 drop-shadow-lg animate-pulse" />
                </div>

                <h3 className="text-3xl md:text-4xl font-black text-white mb-4 flex items-center gap-3 relative z-10">
                    <Sparkles size={28} className="text-yellow-400"/> Coming Soon
                </h3>
                
                <p className="text-slate-400 text-base md:text-lg font-medium max-w-lg leading-relaxed relative z-10 mb-8">
                    We are currently upgrading our delivery tracking system to provide you with real-time updates on your study materials. Stay tuned!
                </p>

                <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-sm font-bold text-orange-400 uppercase tracking-widest relative z-10 shadow-inner">
                    Preparing to Dispatch
                </div>
            </div>
        </div>
    );
}