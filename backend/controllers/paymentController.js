const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Get all payments from Real Database
exports.getPayments = async (req, res) => {
    try {
        // Database එකෙන් Payments ගන්නවා
        const rawPayments = await prisma.payment.findMany({
            include: {
                student: true, 
                business: true, 
                batch: true     
            },
            orderBy: { created_at: 'desc' }
        });

        const formattedPayments = rawPayments.map(p => {
            let currentStatus = 'Pending';
            if (p.status === 1) currentStatus = 'Approved';
            else if (p.status === 2) currentStatus = 'Rejected';
            else if (p.status === 3) currentStatus = 'Non Paid';
            else if (p.status === 4) currentStatus = 'Post Pay';

            return {
                id: p.id,
                studentName: p.student ? `${p.student.fName} ${p.student.lName}` : 'Unknown',
                studentNo: p.student?.student_id || 'STU-000',
                business: p.business?.name || 'N/A',
                batch: p.batch?.name || 'N/A',
                amount: p.amount,
                type: p.payment_type === 1 ? 'Monthly' : (p.payment_type === 2 ? 'Installment' : 'Full'),
                method: p.method || 'Slip',
                status: currentStatus,
                date: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '-',
                slipUrl: p.slip_image || null,
                daysLeft: p.post_pay_days || 0
            };
        });

        // 🔥 BigInt Error එක එන එක නවත්තන්න Safe JSON එකක් හදනවා 🔥
        const safeData = JSON.parse(JSON.stringify(formattedPayments, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.status(200).json(safeData);
    } catch (error) {
        console.error("Payment Fetch Error:", error);
        // Error එකක් ආවොත් Crash නොවී හිස් Array එකක් යවනවා
        res.status(200).json([]); 
    }
};

// 2. Approve / Reject Payments
exports.paymentAction = async (req, res) => {
    try {
        const { paymentId, action } = req.body;
        const newStatus = action === 'Approve' ? 1 : 2; // 1=Approve, 2=Reject

        await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: { status: newStatus }
        });

        res.status(200).json({ message: `Payment ${action}d successfully` });
    } catch (error) {
        console.error("Action Error:", error);
        res.status(500).json({ error: "Action failed" });
    }
};

// 3. Grant Temporary Access (Post Pay)
exports.grantPostPay = async (req, res) => {
    try {
        const { paymentId, days } = req.body;
        
        // Status එක 4 (Post Pay) කරලා, දවස් ගාණ save කරනවා
        await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: { 
                status: 4, 
                post_pay_days: parseInt(days) 
            }
        });

        res.status(200).json({ message: `Access granted for ${days} days` });
    } catch (error) {
        console.error("Post Pay Error:", error);
        res.status(500).json({ error: "Failed to grant access" });
    }
};