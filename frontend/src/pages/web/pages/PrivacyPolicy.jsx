import React from 'react';
import Navbar from '../components/Navbar';

export default function PrivacyPolicy() {
    return (
        <div className="bg-[#0a0f1c] min-h-screen text-white pt-32 pb-20 px-6">
            <Navbar />
            <div className="max-w-4xl mx-auto glass-card rounded-[2rem] p-10 border border-white/10">
                <h1 className="text-4xl font-black text-white mb-6">Privacy Policy</h1>
                <div className="space-y-6 text-slate-400 text-base leading-relaxed">
                    <p>At IMA Campus, we prioritize the protection of your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data.</p>
                    <h3 className="text-xl font-bold text-white mt-4">1. Data Collection</h3>
                    <p>We collect essential information required for student registration, payment processing, and academic tracking.</p>
                    <h3 className="text-xl font-bold text-white mt-4">2. Data Usage</h3>
                    <p>Your data is strictly used to provide you with educational services, send important notifications, and improve our system operations.</p>
                    <h3 className="text-xl font-bold text-white mt-4">3. Data Security</h3>
                    <p>We implement industry-standard security measures to prevent unauthorized access to your personal and academic records.</p>
                </div>
            </div>
        </div>
    );
}