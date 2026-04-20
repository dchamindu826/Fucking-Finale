const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Get all payments
exports.getPayments = async (req, res) => {
    try {
        const rawPayments = await prisma.payment.findMany({
            include: { student: true, business: true, batch: true },
            orderBy: { created_at: 'desc' }
        });

        const today = new Date();

        const formattedPayments = await Promise.all(rawPayments.map(async (p) => {
            let currentStatus = 'Pending';
            
            // Monthly Non-Paid Logic
            if (p.payment_type === 1 && p.status === 1 && p.valid_until && new Date(p.valid_until) < today) {
                currentStatus = 'Non Paid';
                await prisma.payment.update({ where: { id: p.id }, data: { status: 3 } });
            } 
            else if (p.status === 0 && p.method === 'Upcoming') {
                currentStatus = 'Upcoming'; // 🔥 FIX: Upcoming ඒවා වෙනම ටැබ් එකකට යවන්න
            }
            else if (p.status === 0) currentStatus = 'Pending';
            else if (p.status === 1) currentStatus = 'Approved';
            else if (p.status === 2) currentStatus = 'Rejected';
            else if (p.status === 3) currentStatus = 'Non Paid';
            else if (p.status === 4) currentStatus = 'Post Pay';

            return {
                id: p.id,
                studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Unknown',
                studentNo: p.student?.id ? `STU-${p.student.id}` : 'STU-000',
                business: p.business?.name || 'N/A',
                batch: p.batch?.name || 'N/A',
                amount: p.amount || 0,
                type: p.payment_type === 1 ? 'Monthly' : (p.payment_type === 2 ? 'Installment' : 'Full'),
                method: p.method || 'Slip',
                status: currentStatus,
                date: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '-',
                dueDate: p.due_date ? new Date(p.due_date).toISOString().split('T')[0] : null,
                installmentNo: p.installment_no || 1,
                slipUrl: p.slip_image || null,
                daysLeft: p.post_pay_days || 0
            };
        }));

        const safeData = JSON.parse(JSON.stringify(formattedPayments, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        res.status(200).json(safeData);
    } catch (error) {
        console.error("Payment Fetch Error:", error);
        res.status(200).json([]); 
    }
};

// 2. Standard Approve/Reject
exports.paymentAction = async (req, res) => {
    try {
        const { paymentId, action } = req.body;
        const newStatus = action === 'Approve' ? 1 : 2; 

        let updateData = { status: newStatus };

        if (action === 'Approve') {
            const payRecord = await prisma.payment.findUnique({ where: { id: parseInt(paymentId) }});
            if (payRecord && payRecord.payment_type === 1) { 
                let validDate = new Date();
                validDate.setDate(validDate.getDate() + 30);
                updateData.valid_until = validDate;
            }
        }

        await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: updateData
        });

        res.status(200).json({ message: `Payment ${action}d successfully` });
    } catch (error) {
        res.status(500).json({ error: "Action failed" });
    }
};

// 3. 🔥 FIX: Approve Installment & Prevent Duplicates 🔥
exports.approveInstallment = async (req, res) => {
    try {
        const { paymentId, nextDueDate, action } = req.body;
        
        const currentPay = await prisma.payment.findUnique({ where: { id: parseInt(paymentId) } });
        if (!currentPay) return res.status(404).json({ error: "Payment not found" });

        // Approve current installment
        await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: { status: 1 } 
        });

        // ඊළඟ වාරිකය ගණනය කිරීම
        let nextAmount = currentPay.amount; 
        let hasNextStep = true;
        let subjectCount = 1;

        if (currentPay.subjects) {
            try { subjectCount = JSON.parse(currentPay.subjects).length; } catch (e) {}
        }

        const installmentPlan = await prisma.installment.findFirst({
            where: { batchId: currentPay.batchId, subjectCount: { lte: subjectCount } },
            orderBy: { subjectCount: 'desc' }
        });

        const nextStepNum = (currentPay.installment_no || 1) + 1;

        if (installmentPlan && installmentPlan.details) {
            try {
                const details = JSON.parse(installmentPlan.details);
                const nextStepObj = details.find(d => parseInt(d.step) === nextStepNum);
                
                if (nextStepObj) nextAmount = parseFloat(nextStepObj.amount);
                else hasNextStep = false;
            } catch(e) {}
        }

        // 🔥 FIX: මේ ළමයාට මේ Batch එකේ මේ Installment එක කලින් හැදිලද බලනවා (Duplicate අවුල විසඳීමට)
        const existingUpcoming = await prisma.payment.findFirst({
            where: {
                studentId: currentPay.studentId,
                batchId: currentPay.batchId,
                payment_type: 2,
                installment_no: nextStepNum
            }
        });

        // කලින් හැදිලා නැත්නම් විතරක් අලුත් එක හදනවා
        if (nextDueDate && hasNextStep && !existingUpcoming) {
            await prisma.payment.create({
                data: {
                    studentId: currentPay.studentId,
                    businessId: currentPay.businessId,
                    batchId: currentPay.batchId,
                    groupId: currentPay.groupId,   
                    subjects: currentPay.subjects, 
                    amount: nextAmount,             
                    payment_type: 2, 
                    method: 'Upcoming', // මේක Upcoming තියෙනකම් Pending වලට එන්නේ නෑ
                    status: 0, 
                    due_date: new Date(nextDueDate),
                    installment_no: nextStepNum
                }
            });
        }

        res.status(200).json({ message: "Installment Approved & Next Scheduled!" });
    } catch (error) {
        console.error("Installment Action Error:", error);
        res.status(500).json({ error: "Action failed" });
    }
};

// 4. Grant Temporary Access
exports.grantPostPay = async (req, res) => {
    try {
        const { paymentId, days } = req.body;
        await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: { status: 4, post_pay_days: parseInt(days) }
        });
        res.status(200).json({ message: `Access granted for ${days} days` });
    } catch (error) {
        res.status(500).json({ error: "Failed to grant access" });
    }
};