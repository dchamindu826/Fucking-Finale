import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box, Plus, X, Loader2 } from 'lucide-react';
import axios from '../../../api/axios';
import toast from 'react-hot-toast';

export default function TuteStock({ searchQuery }) {
    const [tuteStock, setTuteStock] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Add Stock Modal States
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedTute, setSelectedTute] = useState(null);
    const [addQuantity, setAddQuantity] = useState('');

    const fetchStock = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/admin/delivery/stock');
            setTuteStock(res.data || []);
        } catch (error) {
            toast.error("Failed to fetch tute stock.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStock(); }, []);

    const filtered = tuteStock.filter(item => 
        item.tuteName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.course?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUpdateStock = async () => {
        if(!addQuantity || isNaN(addQuantity) || parseInt(addQuantity) <= 0) return toast.error("Enter a valid quantity.");
        try {
            await axios.post('/admin/delivery/stock/add', { stockId: selectedTute.id, quantity: parseInt(addQuantity) });
            toast.success("Stock updated successfully!");
            setIsUpdating(false);
            setAddQuantity('');
            fetchStock();
        } catch (error) {
            toast.error("Failed to update stock.");
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;

    return (
        <div className="animate-fade-in relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((item, idx) => {
                    const isLowStock = item.availableQuantity <= item.lowStockThreshold;
                    return (
                        <div key={idx} className={`bg-[#1e2336]/80 border p-5 rounded-2xl shadow-lg flex justify-between items-center ${isLowStock ? 'border-red-500/30' : 'border-white/5'}`}>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-black/40 px-2 py-1 rounded border border-white/5 mb-2 inline-block">{item.course?.name}</span>
                                <h4 className="font-bold text-white">{item.tuteName}</h4>
                                <p className={`text-sm mt-2 font-black flex items-center gap-2 ${isLowStock ? 'text-red-400' : 'text-emerald-400'}`}>
                                    <Box size={16}/> {item.availableQuantity} in stock
                                </p>
                            </div>
                            <button 
                                onClick={() => { setSelectedTute(item); setIsUpdating(true); }}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 shrink-0"
                            >
                                <Plus size={14}/> Add
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* Add Stock Modal */}
            {isUpdating && selectedTute && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-[#15192b] border border-blue-500/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-black text-white flex items-center gap-2"><Box size={20} className="text-blue-400"/> Add Stock</h3>
                            <button onClick={() => setIsUpdating(false)} className="text-slate-400 hover:text-red-400 bg-white/5 p-2 rounded-xl"><X size={16}/></button>
                        </div>
                        <p className="text-sm text-slate-300 mb-1">{selectedTute.tuteName}</p>
                        <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-6">Current Stock: {selectedTute.availableQuantity}</p>
                        
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Printed Quantity</label>
                        <input 
                            type="number" 
                            min="1"
                            value={addQuantity} 
                            onChange={(e) => setAddQuantity(e.target.value)} 
                            placeholder="e.g. 50"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-black text-lg mb-6 outline-none focus:border-blue-500" 
                        />

                        <button onClick={handleUpdateStock} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3.5 font-black transition-all shadow-lg shadow-blue-600/20 text-sm uppercase tracking-widest">
                            Update Database
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}