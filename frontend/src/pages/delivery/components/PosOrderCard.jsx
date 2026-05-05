import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Printer, Eye, ScanBarcode, Check, Loader2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import axios from '../../api/axios';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

export default function PosOrderCard({ order, onRefresh }) {
    const [barcode, setBarcode] = useState('');
    const [isHolding, setIsHolding] = useState(false);
    const [holdReason, setHoldReason] = useState('Tute Out of Stock');
    const [holdRemark, setHoldRemark] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const barcodeInputRef = useRef(null);

    // Focus on barcode input automatically when component mounts (POS Style)
    useEffect(() => {
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
    }, []);

    // ඔයාගේ Print Format එක එහෙම්මම තියෙනවා
    const FONT_SIZE = "9pt";   
    const TOP_MARGIN = "10mm";  
    const LEFT_MARGIN = "05mm"; 

    const handlePrintSticker = (isPrint = true) => {
        const baseUrl = window.location.origin; 
        const bgImageUrl = `${baseUrl}/sticker-bg.png`; 
        const windowPrint = window.open('', '', 'width=850,height=500');
        
        windowPrint.document.write(`
            <html>
                <head>
                    <title>${isPrint ? 'Print' : 'Preview'} Label - ${order.id}</title>
                    <style>
                        @page { size: 4in 2in; margin: 0; }
                        body { 
                            font-family: 'Arial', sans-serif; 
                            margin: 0; padding: 0;
                            width: 4in; height: 2in; 
                            -webkit-print-color-adjust: exact !important; 
                        }
                        .label-container {
                            width: 100%; height: 100%;
                            background-image: url('${bgImageUrl}');
                            background-size: 100% 100%;
                            background-repeat: no-repeat;
                            position: relative;
                        }
                        .details-block {
                            position: absolute;
                            top: ${TOP_MARGIN};
                            left: ${LEFT_MARGIN};
                            width: 80mm;
                            display: flex;
                            flex-direction: column;
                            gap: 2px;
                        }
                        .text-item { 
                            font-size: ${FONT_SIZE}; 
                            font-weight: 900; 
                            text-transform: uppercase; 
                            line-height: 1.2;
                            color: black;
                        }
                        .ref-id {
                            position: absolute;
                            bottom: 3mm;
                            right: 5mm;
                            font-size: 8pt;
                            font-weight: 900;
                            color: black;
                        }
                    </style>
                </head>
                <body>
                    <div class="label-container">
                        <div class="details-block">
                            <div class="text-item">${order.payment?.studentName}</div>
                            <div class="text-item">${order.payment?.address}</div>
                            <div class="text-item">${order.payment?.phone}</div>
                        </div>
                        <div class="ref-id">REF: ORD-${order.id}</div>
                    </div>
                </body>
            </html>
        `);
        windowPrint.document.close();
        windowPrint.focus();
        
        if (isPrint) {
            setTimeout(() => { 
                windowPrint.print(); 
                windowPrint.close(); 
                // Print කරාට පස්සේ ආපහු Barcode එකට focus කරනවා
                if(barcodeInputRef.current) barcodeInputRef.current.focus();
            }, 500);
        }
    };

    // Scanner එකෙන් අල්ලනකොට Enter එක වැදුනම Auto Pack වෙනවා
    const handleBarcodeScan = async (e) => {
        if (e.key === 'Enter') {
            if (!barcode.trim()) return toast.error("Please scan a valid tracking barcode!");
            
            setIsProcessing(true);
            try {
                await axios.post('/admin/delivery/pack', { deliveryId: order.id, trackingNumber: barcode });
                toast.success("Order Packed & Stock Updated!");
                onRefresh(); // Refresh the list
            } catch (error) {
                toast.error("Failed to pack the order.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const submitHold = async () => {
        setIsProcessing(true);
        try {
            await axios.post('/admin/delivery/hold', { deliveryId: order.id, reason: holdReason, remark: holdRemark });
            toast.success("Order placed on HOLD.");
            setIsHolding(false);
            onRefresh();
        } catch (error) {
            toast.error("Failed to hold the order.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-[#1e2336]/80 border border-white/5 p-5 rounded-2xl flex flex-col xl:flex-row items-start justify-between gap-6 transition-all shadow-lg hover:border-white/10">
            
            {/* Left: Student & Tute Details */}
            <div className="flex-1 w-full flex gap-4 items-start">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/20 bg-blue-500/10 text-blue-400 mt-1">
                    <MapPin size={22} strokeWidth={1.5}/>
                </div>
                <div>
                    <h4 className="font-bold text-lg text-white flex items-center gap-3">
                        {order.payment?.studentName} 
                        <span className="text-[10px] font-bold text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/10 tracking-widest uppercase">{order.paymentType} Payment</span>
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">{order.payment?.address} • {order.payment?.phone}</p>
                    
                    {/* Tutes to be sent */}
                    <div className="mt-4 flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tutes to Pack:</p>
                        <div className="flex flex-wrap gap-3">
                            {order.items?.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5 pr-4">
                                    {item.tuteImage ? (
                                        <img src={`https://imacampus.online/storage/tutes/${item.tuteImage}`} className="w-8 h-8 rounded object-cover border border-white/10" alt="tute" />
                                    ) : (
                                        <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-slate-500"><ImageIcon size={14}/></div>
                                    )}
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">{item.tuteName} <span className="text-white ml-1">x{item.quantity}</span></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Right: POS Action Area */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto bg-black/20 p-3 rounded-xl border border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePrintSticker(false)} className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3 px-4 rounded-xl transition-all text-xs border border-white/10" title="Preview Sticker">
                        <Eye size={16}/>
                    </button>
                    <button onClick={() => handlePrintSticker(true)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 border border-slate-500">
                        <Printer size={16}/> Print
                    </button>
                </div>

                <div className="h-full w-px bg-white/10 hidden sm:block mx-2"></div>

                <div className="flex items-center gap-2 w-full">
                    <div className="relative flex-1">
                        <ScanBarcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                        <input 
                            ref={barcodeInputRef}
                            type="text" 
                            placeholder="Scan Barcode & Enter..." 
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                            onKeyDown={handleBarcodeScan}
                            className="w-full bg-black/40 border border-blue-500/30 rounded-xl pl-9 pr-3 py-3 text-sm text-blue-400 font-bold outline-none focus:border-blue-500 placeholder:text-slate-600 uppercase tracking-widest"
                        />
                    </div>
                </div>

                <button onClick={() => setIsHolding(true)} className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold py-3 px-4 rounded-xl transition-all text-xs uppercase tracking-widest border border-orange-500/20 shadow-lg shrink-0">
                    Hold
                </button>
            </div>

            {/* Hold Modal */}
            {isHolding && createPortal(
                <div className="fixed inset-0 z-[9999] bg-[#0a0f1c]/95 flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-[#15192b] border border-orange-500/20 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-black text-orange-400 flex items-center gap-2 mb-4"><AlertTriangle size={20}/> Hold Delivery</h3>
                        <p className="text-sm text-slate-400 mb-6">Student will see this hold status on their dashboard.</p>
                        
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Reason</label>
                        <select value={holdReason} onChange={(e) => setHoldReason(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white mb-4 outline-none focus:border-orange-500 text-sm font-bold cursor-pointer">
                            <option value="Tute Out of Stock">Tute Out of Stock</option>
                            <option value="Address Issue">Address Issue (Invalid/Missing)</option>
                            <option value="Pending Payment Verification">Payment Verification Issue</option>
                            <option value="Other">Other Reason</option>
                        </select>

                        {holdReason === 'Other' && (
                            <textarea 
                                value={holdRemark} 
                                onChange={(e) => setHoldRemark(e.target.value)} 
                                placeholder="Type the reason here..." 
                                rows="3" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-orange-500 mb-4 resize-none"
                            ></textarea>
                        )}

                        <div className="flex gap-3 mt-2">
                            <button onClick={() => setIsHolding(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 font-bold transition-all text-sm">Cancel</button>
                            <button disabled={isProcessing} onClick={submitHold} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-xl py-3 font-black transition-all shadow-lg shadow-orange-600/20 text-sm flex justify-center items-center gap-2">
                                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : "Confirm Hold"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}