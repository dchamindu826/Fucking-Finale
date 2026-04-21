import React from 'react';
import Navbar from '../components/Navbar';
import { Phone, Mail, Globe } from 'lucide-react';

export default function ContactUs() {
    return (
        <div className="bg-[#0a0f1c] min-h-screen text-white pt-32 pb-20 px-6">
            <Navbar />
            <div className="max-w-4xl mx-auto glass-card rounded-[2rem] p-10 border border-white/10">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 mb-8">Contact Us</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <p className="text-slate-400 text-lg mb-8">We are always here to help you. Reach out to us via phone, email, or visit our campus directly.</p>
                        <div className="flex items-center gap-4 text-lg font-bold"><Phone className="text-red-500"/> (+94) 112 345 678</div>
                        <div className="flex items-center gap-4 text-lg font-bold"><Mail className="text-red-500"/> info@imacampus.lk</div>
                        <div className="flex items-center gap-4 text-lg font-bold"><Globe className="text-red-500"/> 123 Education Mawatha, Colombo 03</div>
                    </div>
                    <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                        <h3 className="font-bold text-white mb-4 uppercase tracking-widest text-sm">Send a message</h3>
                        <input type="text" placeholder="Your Name" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mb-4 outline-none focus:border-red-500"/>
                        <input type="email" placeholder="Your Email" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mb-4 outline-none focus:border-red-500"/>
                        <textarea placeholder="Message" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mb-4 outline-none focus:border-red-500 h-24"></textarea>
                        <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all">Send Message</button>
                    </div>
                </div>
            </div>
        </div>
    );
}