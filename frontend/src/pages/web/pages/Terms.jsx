import React from 'react';
import Navbar from '../components/Navbar';

export default function Terms() {
    return (
        <div className="bg-[#0a0f1c] min-h-screen text-white pt-32 pb-20 px-6">
            <Navbar />
            <div className="max-w-4xl mx-auto glass-card rounded-[2rem] p-10 border border-white/10">
                <h1 className="text-4xl font-black text-white mb-6">Terms & Conditions</h1>
                <div className="space-y-6 text-slate-400 text-base leading-relaxed">
                    <p>By using the IMA Campus platform, you agree to comply with our academic and operational guidelines.</p>
                    <h3 className="text-xl font-bold text-white mt-4">1. Account Security</h3>
                    <p>Students are responsible for maintaining the confidentiality of their login credentials. Sharing accounts is strictly prohibited.</p>
                    <h3 className="text-xl font-bold text-white mt-4">2. Payments</h3>
                    <p>All fees paid towards courses and installments are non-refundable unless specified otherwise under special circumstances.</p>
                    <h3 className="text-xl font-bold text-white mt-4">3. Conduct</h3>
                    <p>We expect all students to maintain proper decorum during physical and virtual classes. Any violation may lead to suspension.</p>
                </div>
            </div>
        </div>
    );
}