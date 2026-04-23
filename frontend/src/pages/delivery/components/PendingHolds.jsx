import React from 'react';
import { Truck, MapPin, Printer, Eye } from 'lucide-react';

export default function PendingHolds({ searchQuery }) {
    // Test order data
    const pendingDeliveries = [
        { id: 'ORD-1021', studentName: 'Chamindu Dilshan', phone: '0701000122', address: '869/1A, Thalangama North, Malabe', items: ['2024 Bio Tute 1'], status: 'Pending' },
    ];

    const filtered = pendingDeliveries.filter(order => 
        order.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        order.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4 animate-fade-in">
            {filtered.map((order, idx) => (
                <OrderCard key={idx} order={order} />
            ))}
        </div>
    );
}

function OrderCard({ order }) {
    // 🔥 CONFIG: Methana font size eka saha positions wenas karala balanna 🔥
    const FONT_SIZE = "9pt";   // All text size (pt or px)
    const TOP_MARGIN = "10mm";  // Sticker eke uda idan dura
    const LEFT_MARGIN = "05mm"; // Sticker eke wame idan dura

    const handleLabelAction = (isPrint = true) => {
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
                        /* 🔥 Only Receiver Details with adjustable shared size */
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
                            <div class="text-item">${order.studentName}</div>
                            <div class="text-item">${order.address}</div>
                            <div class="text-item">${order.phone}</div>
                        </div>
                        <div class="ref-id">REF: ${order.id}</div>
                    </div>
                </body>
            </html>
        `);
        windowPrint.document.close();
        windowPrint.focus();
        
        if (isPrint) {
            setTimeout(() => { windowPrint.print(); windowPrint.close(); }, 500);
        }
    };

    return (
        <div className="bg-[#1e2336]/80 border border-white/5 p-5 rounded-2xl flex flex-col xl:flex-row items-center justify-between gap-6 transition-all shadow-lg">
            <div className="flex-1 w-full">
                <h4 className="font-bold text-lg text-white flex items-center gap-3">
                    {order.studentName} 
                    <span className="text-[10px] font-bold text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/10 tracking-widest uppercase">{order.id}</span>
                </h4>
                <p className="text-sm text-slate-400 mt-1 flex items-center gap-2"><MapPin size={14}/> {order.address}</p>
            </div>
            
            <div className="flex items-center gap-2">
                <button onClick={() => handleLabelAction(false)} className="bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs uppercase tracking-widest border border-white/10 flex items-center gap-2">
                    <Eye size={14}/> Preview
                </button>
                <button onClick={() => handleLabelAction(true)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex items-center gap-2">
                    <Printer size={14}/> Print Sticker
                </button>
            </div>
        </div>
    );
}