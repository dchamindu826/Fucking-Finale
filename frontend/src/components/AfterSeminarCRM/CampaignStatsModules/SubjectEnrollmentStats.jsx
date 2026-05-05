import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FaBookOpen, FaUserGraduate, FaMoneyBillWave, FaFilter } from 'react-icons/fa';

export default function SubjectEnrollmentStats({ rawSubjects = [], mixerData = [] }) {
    
    // Aggregate subject totals (same as before)
    const aggregatedSubjects = useMemo(() => {
        if (!rawSubjects) return [];
        const map = {};
        
        rawSubjects.forEach(sub => {
            let cleanName = (sub.subject || sub.name || '').trim().toUpperCase();
            if (!map[cleanName]) {
                map[cleanName] = { name: cleanName, full: 0, monthly: 0, installment: 0, total: 0 };
            }
            map[cleanName].full += (sub.full || 0);
            map[cleanName].monthly += (sub.monthly || 0);
            map[cleanName].installment += (sub.installment || 0);
            map[cleanName].total += (sub.total || 0);
        });

        return Object.values(map).sort((a, b) => b.total - a.total);
    }, [rawSubjects]);

    const [selectedSubjects, setSelectedSubjects] = useState([]);

    // Select all subjects initially
    useEffect(() => {
        setSelectedSubjects([]); 
    }, [aggregatedSubjects]);

    // EXACT "AND" (INTERSECTION) FILTERING
    const totals = useMemo(() => {
        let full = 0, monthly = 0, installment = 0;

        if (mixerData && mixerData.length > 0 && selectedSubjects.length > 0) {
            mixerData.forEach(student => {
                // Check if the student has ALL the selected subjects
                const studentSubNames = student.subjects.map(s => s.toUpperCase());
                const hasAllSelected = selectedSubjects.every(selectedSub => 
                    studentSubNames.includes(selectedSub.toUpperCase())
                );

                if (hasAllSelected) {
                    if (student.paymentIntention === 'FULL') full++;
                    else if (student.paymentIntention === 'MONTHLY') monthly++;
                    else if (student.paymentIntention === 'INSTALLMENT') installment++;
                }
            });
        }
        
        return { full, monthly, installment, grandTotal: full + monthly + installment };
    }, [selectedSubjects, mixerData]);

    const toggleSubject = (name) => {
        if (selectedSubjects.includes(name)) {
            setSelectedSubjects(selectedSubjects.filter(s => s !== name));
        } else {
            setSelectedSubjects([...selectedSubjects, name]);
        }
    };

    const selectAll = () => setSelectedSubjects(aggregatedSubjects.map(s => s.name));
    const clearAll = () => setSelectedSubjects([]);

    // Data for the Pie Chart based on Mixer results
    const pieData = [
        { name: 'Full Payment', value: totals.full, color: '#8b5cf6' }, // Purple
        { name: 'Monthly', value: totals.monthly, color: '#3b82f6' }, // Blue
        { name: 'Installment', value: totals.installment, color: '#f59e0b' } // Amber
    ].filter(d => d.value > 0); // Hide zero values in chart

    if (aggregatedSubjects.length === 0) {
        return (
            <div className="bg-white/[0.02] backdrop-blur-lg p-5 rounded-2xl border border-white/5 shadow-xl flex items-center justify-center h-[300px]">
                <p className="text-slate-500 text-sm">No subject enrollment data found.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/[0.02] backdrop-blur-lg p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col relative overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-xl">
                        <FaBookOpen className="text-emerald-400" size={16}/>
                    </div>
                    Subject Mixer Analytics
                </h2>
                <span className="text-[10px] text-slate-400 font-medium px-3 py-1 bg-black/30 rounded-full border border-white/5">
                    AND Logic (Intersection)
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT COLUMN: FILTER CONTROLS (Takes 4 cols out of 12) */}
                <div className="lg:col-span-4 flex flex-col bg-black/20 rounded-2xl p-5 border border-white/5">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <FaFilter className="text-slate-500"/> Select Subjects
                        </span>
                        <div className="flex gap-2">
                            <button onClick={selectAll} className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 px-2 py-1 rounded transition-colors">ALL</button>
                            <button onClick={clearAll} className="text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-400/10 px-2 py-1 rounded transition-colors">CLEAR</button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {aggregatedSubjects.map(sub => {
                            const isSelected = selectedSubjects.includes(sub.name);
                            return (
                                <button
                                    key={sub.name}
                                    onClick={() => toggleSubject(sub.name)}
                                    className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex-1 min-w-[100px] text-left border ${
                                        isSelected 
                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300'
                                    }`}
                                >
                                    <div className="flex justify-between items-center w-full gap-2">
                                        <span className="truncate">{sub.name}</span>
                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT COLUMN: RESULTS & CHARTS (Takes 8 cols out of 12) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    
                    {/* STAT CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Grand Total Match */}
                        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 text-emerald-500/20"><FaUserGraduate size={60}/></div>
                            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-1 relative z-10">Total Matches</span>
                            <span className="text-3xl font-black text-white relative z-10">{totals.grandTotal}</span>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Full Pay</span>
                            <span className="text-2xl font-black text-purple-400">{totals.full}</span>
                        </div>
                        
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Monthly</span>
                            <span className="text-2xl font-black text-blue-400">{totals.monthly}</span>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Installment</span>
                            <span className="text-2xl font-black text-amber-400">{totals.installment}</span>
                        </div>
                    </div>

                    {/* CHART AREA */}
                    <div className="flex-1 bg-black/20 rounded-2xl border border-white/5 p-4 min-h-[220px] flex items-center justify-center">
                        {totals.grandTotal === 0 ? (
                            <div className="flex flex-col items-center justify-center text-slate-500">
                                <FaBookOpen size={40} className="mb-3 opacity-20" />
                                <p className="text-xs uppercase tracking-widest font-medium">No students match this exact combination</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff'}}
                                        itemStyle={{fontWeight: 'bold'}}
                                    />
                                    <Legend 
                                        verticalAlign="middle" 
                                        align="right"
                                        layout="vertical"
                                        wrapperStyle={{fontSize: '11px', color: '#94a3b8', fontWeight: '500'}} 
                                        iconType="circle"
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}