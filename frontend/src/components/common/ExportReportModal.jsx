import React, { useRef, useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileSpreadsheet, Image as ImageIcon, Users, Wallet, Filter, Check, Copy, AlertCircle, Tag } from 'lucide-react';
import { toPng } from 'html-to-image'; 
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import axios from '../../api/axios';

export default function ExportReportModal({ onClose, payments, filters: initialFilters, businesses, batches: initialBatches }) {
    const reportRef = useRef(null);

    const [localFilters, setLocalFilters] = useState({
        businessId: initialFilters.businessId,
        batchId: initialFilters.batchId,
        type: 'All', 
        method: 'All', 
        subjectNames: [], 
        dateFrom: initialFilters.dateFrom,
        dateTo: initialFilters.dateTo
    });

    const [generatedImage, setGeneratedImage] = useState(null);
    const [fetchedBatches, setFetchedBatches] = useState(initialBatches || []);

    useEffect(() => {
        if (localFilters.businessId !== 'All') {
            axios.get(`/admin/batches/${localFilters.businessId}`)
                .then(res => setFetchedBatches(res.data.batches || res.data || []))
                .catch(err => console.error("Error fetching batches:", err));
        } else {
            setFetchedBatches(initialBatches || []);
        }
    }, [localFilters.businessId, initialBatches]);

    const localSubjects = useMemo(() => {
        let validPays = payments;
        if (localFilters.businessId !== 'All') validPays = validPays.filter(p => (p.businessId || p.business_id)?.toString() === localFilters.businessId.toString());
        if (localFilters.batchId !== 'All') validPays = validPays.filter(p => (p.batchId || p.batch_id)?.toString() === localFilters.batchId.toString());

        const extracted = new Map();
        validPays.forEach(p => {
            const subs = p.subjectsList || p.subjects || p.courses || [];
            subs.forEach(s => {
                const sName = s.name || s.courseName;
                if (sName) {
                    const cleanName = sName.replace(/\s*-\s*(Full|Monthly|Installment)/i, '').trim();
                    if (!extracted.has(cleanName)) {
                        extracted.set(cleanName, { name: cleanName });
                    }
                }
            });
        });
        return Array.from(extracted.values());
    }, [payments, localFilters.businessId, localFilters.batchId]);

    const handleLocalChange = (field, value) => {
        setLocalFilters(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'businessId') {
                updated.batchId = 'All'; updated.subjectNames = [];
            }
            if (field === 'batchId') {
                updated.subjectNames = [];
            }
            return updated;
        });
    };

    const exportDataList = useMemo(() => {
        return payments.filter(p => {
            // 🔥 FIX: Free Cards අයින් කරලා, Approved සහ Discount අයව විතරක් ඇතුළත් කරනවා
            if (p.status !== 'Approved' && p.status !== 'Discount') return false;

            const matchesBiz = localFilters.businessId === 'All' || (p.businessId || p.business_id)?.toString() === localFilters.businessId.toString();
            const matchesBatch = localFilters.batchId === 'All' || (p.batchId || p.batch_id)?.toString() === localFilters.batchId.toString();
            const matchesType = localFilters.type === 'All' || p.type === localFilters.type;
            const matchesMethod = localFilters.method === 'All' || (localFilters.method === 'Online' ? (p.method === 'PayHere' || p.method === 'Online') : p.method === 'Slip');

            let matchesSubject = false;
            if (localFilters.subjectNames.length === 0 || localFilters.subjectNames.length === localSubjects.length) {
                matchesSubject = true;
            } else {
                const subs = p.subjectsList || p.subjects || p.courses || [];
                matchesSubject = subs.some(s => {
                    const cleanName = (s.name || s.courseName || '').replace(/\s*-\s*(Full|Monthly|Installment)/i, '').trim();
                    return localFilters.subjectNames.includes(cleanName);
                });
            }

            let matchesDate = true;
            if (localFilters.dateFrom || localFilters.dateTo) {
                const payDate = new Date(p.date);
                if (localFilters.dateFrom && payDate < new Date(localFilters.dateFrom)) matchesDate = false;
                if (localFilters.dateTo && payDate > new Date(localFilters.dateTo)) matchesDate = false;
            }

            return matchesBiz && matchesBatch && matchesType && matchesMethod && matchesSubject && matchesDate;
        });
    }, [payments, localFilters, localSubjects]);

    const stats = useMemo(() => {
        let totalRev = 0;
        let discountRev = 0;
        let fullRev = 0, monthlyRev = 0, installRev = 0;
        
        const uniqueStudents = new Set();
        const discountStudents = new Set();
        const dateMap = {};

        // 🔥 ALUTH: Subject & Student Tracking 🔥
        const studentSubjectsCount = {}; // ළමයෙක්ට විෂයයන් කීයක් තියෙනවද කියලා බලන්න
        const subjectStats = {}; // විෂය අනුව සල්ලි සහ ළමයි ගාණ එකතු කරන්න

        exportDataList.forEach(p => {
            const amt = parseFloat(p.amount || 0);
            totalRev += amt;
            uniqueStudents.add(p.studentId);

            if (p.status === 'Discount') {
                discountRev += amt;
                discountStudents.add(p.studentId);
            }

            const type = p.type?.toLowerCase() || '';
            if (type.includes('full')) fullRev += amt;
            else if (type.includes('month')) monthlyRev += amt;
            else if (type.includes('install')) installRev += amt;
            else monthlyRev += amt; 

            const d = p.date;
            if (!dateMap[d]) dateMap[d] = 0;
            dateMap[d] += amt;

            // 🔥 Subject Tracking Logic 🔥
            const subs = p.subjectsList || p.subjects || p.courses || [];
            
            if (!studentSubjectsCount[p.studentId]) {
                studentSubjectsCount[p.studentId] = new Set();
            }

            subs.forEach(s => {
                const sName = (s.name || s.courseName || '').replace(/\s*-\s*(Full|Monthly|Installment)/i, '').trim();
                if (sName) {
                    // ළමයාගේ subject එක set එකට දානවා (duplicate වෙන්නේ නෑ)
                    studentSubjectsCount[p.studentId].add(sName);

                    // Subject Stats හදනවා
                    if (!subjectStats[sName]) {
                        subjectStats[sName] = { name: sName, enrolled: new Set(), revenue: 0 };
                    }
                    subjectStats[sName].enrolled.add(p.studentId);
                    
                    // Note: System Price එකෙන් revenue ගණනය කරන්නේ නැතුව, මුළු Slip Amount එකෙන් estimate එකක් විතරයි මෙතන ගන්නේ 
                    // (හේතුව ළමයා subject කිහිපයකට එක Slip එකක් දාන්න පුළුවන් නිසා)
                    if(s.price) subjectStats[sName].revenue += parseFloat(s.price); 
                }
            });
        });

        // 🔥 Average Count (Dynamic for O/L and A/L) 🔥
        let averageCount = 0;
        let averageRevenue = 0;

        Object.keys(studentSubjectsCount).forEach(stuId => {
            const subjectsSet = studentSubjectsCount[stuId];
            
            // ළමයාගේ Payments ටික ගන්නවා
            const stuPayments = exportDataList.filter(p => p.studentId === parseInt(stuId) || p.studentId === stuId);
            if (stuPayments.length === 0) return;

            // ළමයා ඉන්න Business එක හොයාගන්නවා
            const stuBizId = stuPayments[0].businessId || stuPayments[0].business_id;
            const stuBiz = businesses.find(b => b.id?.toString() === stuBizId?.toString());
            
            // Business එකේ නමේ 'o/l' හරි 'ordinary' හරි තියෙනවද බලනවා (Category අවුල් නිසා නමෙන් අල්ලනවා)
            const isOL = stuBiz ? (stuBiz.name.toLowerCase().includes('o/l') || stuBiz.name.toLowerCase().includes('ordinary')) : false;

            if (isOL) {
                // 🔹 O/L LOGIC: විෂයයන් 9ක් තියෙන්න ඕනේ
                if (subjectsSet.size >= 9) {
                    averageCount++;
                    averageRevenue += stuPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                }
            } else {
                // 🔹 A/L LOGIC: English, General Test, GIT අයින් කරලා ප්‍රධාන විෂයයන් 3ක් තියෙන්න ඕනේ
                let mainSubjectCount = 0;
                subjectsSet.forEach(subName => {
                    const nameLower = subName.toLowerCase();
                    // මේ නම් වලට සමාන ඒවා Main Subjects විදියට ගණන් ගන්නේ නෑ
                    if (!nameLower.includes('english') && !nameLower.includes('general') && !nameLower.includes('git')) {
                        mainSubjectCount++;
                    }
                });

                if (mainSubjectCount >= 3) {
                    averageCount++;
                    averageRevenue += stuPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                }
            }
        });

        // Format subject stats to array (මේක කලින් තිබ්බ එකමයි)
        const formattedSubjectStats = Object.values(subjectStats).map(sub => ({
            name: sub.name,
            enrolledCount: sub.enrolled.size,
            revenue: sub.revenue
        })).sort((a, b) => b.enrolledCount - a.enrolledCount);

        const barData = Object.keys(dateMap).sort().map(k => ({ date: k, revenue: dateMap[k] }));

        return {
            totalRevenue: totalRev,
            enrolled: uniqueStudents.size,
            discountRevenue: discountRev,
            discountEnrolled: discountStudents.size,
            pieData: [
                { name: 'Full Pay', value: fullRev, color: '#10b981' },
                { name: 'Monthly', value: monthlyRev, color: '#3b82f6' },
                { name: 'Installments', value: installRev, color: '#f59e0b' }
            ].filter(d => d.value > 0),
            barData,
            // 🔥 ALUTH DATA 🔥
            averageCount,
            averageRevenue,
            subjectStats: formattedSubjectStats
        };
    }, [exportDataList]);

    const bizName = localFilters.businessId === 'All' ? 'All Businesses' : businesses.find(b => b.id?.toString() === localFilters.businessId.toString())?.name || 'Unknown Business';
    const batchName = localFilters.batchId === 'All' ? 'All Batches' : fetchedBatches.find(b => b.id?.toString() === localFilters.batchId.toString())?.name || 'Unknown Batch';
    const dateRange = (localFilters.dateFrom || localFilters.dateTo) ? `${localFilters.dateFrom || 'Any'} to ${localFilters.dateTo || 'Any'}` : 'All Time';

    const handleExportImage = () => {
        if (!reportRef.current) return toast.error("Report area not ready!");
        const toastId = toast.loading("Processing report image...");
        
        toPng(reportRef.current, { cacheBust: true, backgroundColor: '#0f172a', pixelRatio: 2 })
            .then((dataUrl) => {
                setGeneratedImage(dataUrl);
                toast.success("Image generated successfully!", { id: toastId });
            })
            .catch((err) => {
                console.error("Image Export Error:", err);
                toast.error("Failed to generate image. Please check console.", { id: toastId });
            });
    };

    const handleCopyImage = async () => {
        try {
            const response = await fetch(generatedImage);
            const blob = await response.blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast.success("Image copied to clipboard! You can paste it anywhere.");
        } catch (err) {
            toast.error("Failed to copy. Right-Click the image and select 'Copy Image'.");
        }
    };

    const handleDownloadImage = () => {
        const link = document.createElement('a');
        link.download = `IMA_Report_${bizName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.png`;
        link.href = generatedImage;
        link.click();
        toast.success("Download started!");
    };

    const handleExportExcel = () => {
        const sheetData = exportDataList.map(p => ({
            "Date": p.date,
            "Student Name": p.studentName,
            "Student No": p.studentNo,
            "Business": p.business,
            "Batch": p.batch,
            "Type": p.type,
            "Method": p.method,
            "Status": p.status, // Included status to easily identify discounts in Excel
            "Amount (LKR)": parseFloat(p.amount || 0)
        }));
        const ws = XLSX.utils.json_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Revenue");
        XLSX.writeFile(wb, `IMA_Revenue_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-2 md:p-6 backdrop-blur-md overflow-hidden">
            
            {generatedImage && (
                <div className="fixed inset-0 z-[999999] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 md:p-10 animate-in fade-in zoom-in duration-300">
                    <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
                        <button onClick={handleCopyImage} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"><Copy size={18}/> Copy to Clipboard</button>
                        <button onClick={handleDownloadImage} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"><Download size={18}/> Download Image</button>
                        <button onClick={() => setGeneratedImage(null)} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all border border-white/10"><X size={18}/> Close Preview</button>
                    </div>
                    <div className="relative max-w-full max-h-[75vh] overflow-hidden rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
                        <img src={generatedImage} alt="Report Preview" className="max-w-full max-h-[75vh] object-contain" />
                    </div>
                    <p className="text-slate-400 text-sm mt-5 bg-black/40 px-6 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                        <AlertCircle size={16} className="text-yellow-500" />
                        Tip: You can also Right-Click on the image above and select "Copy image".
                    </p>
                </div>
            )}

            <div className="bg-[#1e293b] border border-white/10 rounded-[2.5rem] w-full max-w-[98vw] h-full max-h-[96vh] shadow-2xl flex flex-col relative overflow-hidden transition-all">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-white/10 gap-4 bg-slate-800/50 shrink-0">
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <FileSpreadsheet className="text-emerald-500" size={28} /> Export Financial Report
                        </h3>
                        <p className="text-slate-400 text-xs mt-1">Review stats and download high-resolution reports.</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button onClick={handleExportExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20"><Download size={18}/> Excel</button>
                        <button onClick={handleExportImage} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"><ImageIcon size={18}/> Image Report</button>
                        <button onClick={onClose} className="bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white p-3 rounded-2xl transition-all"><X size={24} /></button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                    
                    <div className="w-full lg:w-80 bg-slate-900/40 border-r border-white/5 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5 shrink-0">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Filter size={14}/> Refining Filters</h4>
                        
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Business Unit</label>
                                <select value={localFilters.businessId} onChange={e => handleLocalChange('businessId', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white font-medium outline-none focus:border-emerald-500">
                                    <option value="All">All Businesses</option>
                                    {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Academic Batch</label>
                                <select value={localFilters.batchId} onChange={e => handleLocalChange('batchId', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white font-medium outline-none focus:border-emerald-500">
                                    <option value="All">All Batches</option>
                                    {fetchedBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Payment Type</label>
                                    <select value={localFilters.type} onChange={e => handleLocalChange('type', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white font-medium outline-none">
                                        <option value="All">All Types</option>
                                        <option value="Full">Full</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Installment">Installment</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Method</label>
                                    <select value={localFilters.method} onChange={e => handleLocalChange('method', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white font-medium outline-none">
                                        <option value="All">All Methods</option>
                                        <option value="Slip">Slip</option>
                                        <option value="Online">Online</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Subjects (Multi-Select)</label>
                                <div className="bg-black/40 border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                                    {localSubjects.map((s, idx) => {
                                        const isChecked = localFilters.subjectNames.length === 0 || localFilters.subjectNames.includes(s.name);
                                        return (
                                            <label key={idx} className="flex items-start gap-3 cursor-pointer group">
                                                <input 
                                                    type="checkbox" className="hidden" checked={isChecked}
                                                    onChange={(e) => {
                                                        if (localFilters.subjectNames.length === 0) {
                                                            const allNames = localSubjects.map(sub => sub.name);
                                                            handleLocalChange('subjectNames', allNames.filter(name => name !== s.name));
                                                        } else if (e.target.checked) {
                                                            handleLocalChange('subjectNames', [...localFilters.subjectNames, s.name]);
                                                        } else {
                                                            handleLocalChange('subjectNames', localFilters.subjectNames.filter(name => name !== s.name));
                                                        }
                                                    }}
                                                />
                                                <div className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border transition-all ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'bg-black/50 border-white/20 group-hover:border-emerald-500/50'}`}>
                                                    {isChecked && <Check size={12} className="text-white stroke-[3]" />}
                                                </div>
                                                <span className={`text-xs transition-colors ${isChecked ? 'text-emerald-400 font-bold' : 'text-slate-300 group-hover:text-white'}`}>{s.name}</span>
                                            </label>
                                        );
                                    })}
                                    {localSubjects.length === 0 && <span className="text-xs text-slate-500 italic">No subjects available</span>}
                                </div>
                                {localSubjects.length > 0 && (
                                    <div className="flex gap-4 px-1 mt-1">
                                        <button onClick={() => handleLocalChange('subjectNames', [])} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider transition-colors">Select All</button>
                                        <button onClick={() => handleLocalChange('subjectNames', ['NONE'])} className="text-[10px] text-slate-400 hover:text-red-400 font-bold uppercase tracking-wider transition-colors">Clear All</button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">From</label>
                                    <input type="date" value={localFilters.dateFrom} onChange={e => handleLocalChange('dateFrom', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">To</label>
                                    <input type="date" value={localFilters.dateTo} onChange={e => handleLocalChange('dateTo', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl shrink-0">
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Records Found</p>
                            <p className="text-2xl font-black text-white">{exportDataList.length}</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#0f172a] custom-scrollbar flex justify-center items-start">
                        <div ref={reportRef} className="bg-[#0f172a] text-white p-10 w-full max-w-6xl rounded-[2rem] border border-white/5">
                            
                            <div className="flex justify-between items-start border-b border-white/10 pb-8 mb-8">
                                <div>
                                    <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">IMA CAMPUS</h1>
                                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">Financial Performance Summary</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Generation Date</p>
                                    <p className="text-sm font-bold text-slate-300">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Business Unit</p>
                                    <p className="text-xs font-bold text-emerald-400 truncate">{bizName}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Batch</p>
                                    <p className="text-xs font-bold text-blue-400 truncate">{batchName}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Timeline</p>
                                    <p className="text-xs font-bold text-orange-400 truncate">{dateRange}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Status</p>
                                    <p className="text-xs font-bold text-slate-300">Verified & Discount Only</p>
                                </div>
                            </div>

                            {/* 🔥 TOTAL REVENUE SECTION 🔥 */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                                    <Wallet className="absolute -right-4 -bottom-4 text-white/10 w-32 h-32 rotate-12" />
                                    <p className="text-emerald-100/70 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Total Revenue (Approved + Discount)</p>
                                    <h2 className="text-5xl font-black text-white relative z-10"><span className="text-2xl font-light mr-2">LKR</span>{stats.totalRevenue.toLocaleString()}</h2>
                                </div>
                                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                                    <Users className="absolute -right-4 -bottom-4 text-white/10 w-32 h-32 rotate-12" />
                                    <p className="text-blue-100/70 text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Total Verified Enrollments</p>
                                    <h2 className="text-5xl font-black text-white relative z-10">{stats.enrolled}<span className="text-2xl font-light ml-2">Students</span></h2>
                                </div>
                            </div>

                            {/* 🔥 SPECIAL DISCOUNT SECTION 🔥 */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                                <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 p-6 md:p-8 rounded-[2rem] shadow-xl relative overflow-hidden group border border-cyan-500/30">
                                    <Tag className="absolute -right-4 -bottom-4 text-white/10 w-28 h-28 rotate-12" />
                                    <p className="text-cyan-100/80 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Special Discount Revenue</p>
                                    <h2 className="text-3xl md:text-4xl font-black text-white relative z-10"><span className="text-lg md:text-xl font-light mr-2">LKR</span>{stats.discountRevenue.toLocaleString()}</h2>
                                </div>
                                <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 md:p-8 rounded-[2rem] shadow-xl relative overflow-hidden group border border-purple-500/30">
                                    <Users className="absolute -right-4 -bottom-4 text-white/10 w-28 h-28 rotate-12" />
                                    <p className="text-purple-100/80 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2 relative z-10">Discount Enrollments</p>
                                    <h2 className="text-3xl md:text-4xl font-black text-white relative z-10">{stats.discountEnrolled}<span className="text-lg md:text-xl font-light ml-2">Students</span></h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                                <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5 flex flex-col items-center">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 w-full text-center">Revenue Mix</h3>
                                    <div className="w-full min-h-[12rem] h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie isAnimationActive={false} data={stats.pieData} innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value" stroke="none">
                                                    {stats.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 mt-4 w-full">
                                        {stats.pieData.map((d, i) => (
                                            <div key={i} className="flex justify-between items-center text-[10px] font-bold text-slate-400 bg-black/20 p-2 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                                                    {d.name}
                                                </div>
                                                <span className="text-white">LKR {d.value.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="lg:col-span-2 bg-white/5 p-8 rounded-[2rem] border border-white/5">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Daily Collections Trend</h3>
                                    <div className="w-full min-h-[12rem] h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.barData}>
                                                <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                                                <Bar isAnimationActive={false} dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* 🔥 ALUTH: SUBJECT WISE & AVERAGE ANALYSIS 🔥 */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10 border-t border-white/10 pt-8">
                                
                                {/* Average Student Details */}
                                <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-6 rounded-3xl border border-indigo-500/20 shadow-xl flex flex-col justify-center">
                                    <h3 className="text-indigo-400 font-bold text-sm tracking-widest uppercase mb-4">Core Average Metrics</h3>
                                    <p className="text-xs text-slate-400 mb-6">Students enrolled in 3 main subjects (A/L) or 9 subjects (O/L).</p>
                                    
                                    <div className="bg-black/30 p-4 rounded-2xl mb-4 border border-white/5">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Total Average Students</p>
                                        <p className="text-3xl font-black text-white">{stats.averageCount} <span className="text-sm font-medium text-slate-400">Students</span></p>
                                    </div>

                                    <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Est. Revenue from Average</p>
                                        <p className="text-2xl font-black text-emerald-400"><span className="text-sm font-light text-slate-400 mr-1">LKR</span>{stats.averageRevenue.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Subject Wise Breakdown Table */}
                                <div className="lg:col-span-2 bg-slate-900/40 p-6 rounded-3xl border border-white/5 shadow-xl flex flex-col">
                                    <h3 className="text-slate-300 font-bold text-sm tracking-widest uppercase mb-4 flex justify-between items-center">
                                        Subject Performance
                                        <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px]">{stats.subjectStats.length} Subjects Active</span>
                                    </h3>
                                    
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr>
                                                    <th className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-3 border-b border-white/5">Subject Name</th>
                                                    <th className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-3 border-b border-white/5 text-center">Enrolled</th>
                                                    <th className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-3 border-b border-white/5 text-right">Est. Revenue (LKR)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.subjectStats.map((sub, i) => (
                                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                                        <td className="py-3 text-xs font-semibold text-slate-200 border-b border-white/5">{sub.name}</td>
                                                        <td className="py-3 text-sm font-black text-blue-400 text-center border-b border-white/5">{sub.enrolledCount}</td>
                                                        <td className="py-3 text-xs font-bold text-emerald-400 text-right border-b border-white/5">{sub.revenue.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                {stats.subjectStats.length === 0 && (
                                                    <tr>
                                                        <td colSpan="3" className="text-center py-10 text-slate-500 text-xs italic">No subject data found for selected filters.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>

                            <div className="text-center border-t border-white/5 pt-8">
                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.5em]">Authorized Digital Report • IMA Campus CRM v2.0</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}