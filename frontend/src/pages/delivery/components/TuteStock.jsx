import React from 'react';
import { Box } from 'lucide-react';

export default function TuteStock({ searchQuery }) {
    const tuteStock = [
        { id: 1, name: '2024 AL Biology Full Pack', batch: '2024 AL Bio', inStock: 450, reorderLevel: 50 },
        { id: 2, name: '2024 AL Chemistry Unit 4', batch: '2024 AL Chem', inStock: 20, reorderLevel: 100 },
    ];

    const filtered = tuteStock.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.batch.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {filtered.map((item, idx) => {
                const isLowStock = item.inStock <= item.reorderLevel;
                return (
                    <div key={idx} className={`bg-[#1e2336]/80 border p-5 rounded-2xl shadow-lg flex justify-between items-center ${isLowStock ? 'border-red-500/30' : 'border-white/5'}`}>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-black/40 px-2 py-1 rounded border border-white/5 mb-2 inline-block">{item.batch}</span>
                            <h4 className="font-bold text-white">{item.name}</h4>
                            <p className={`text-sm mt-2 font-black flex items-center gap-2 ${isLowStock ? 'text-red-400' : 'text-emerald-400'}`}>
                                <Box size={16}/> {item.inStock} in stock
                            </p>
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-all text-[10px] uppercase tracking-widest shadow-lg">
                            Update
                        </button>
                    </div>
                )
            })}
        </div>
    );
}