const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Get all payments
exports.getPayments = async (req, res) => {
    try {
        const rawPayments = await prisma.payment.findMany({
            include: { student: true, business: true, batch: true },
            orderBy: { created_at: 'desc' }
        });

        const allCourses = await prisma.course.findMany({
            select: { id: true, name: true, price: true, code: true }
        });
        const courseMap = {};
        allCourses.forEach(c => courseMap[c.id] = c);

        const allInstallments = await prisma.installment.findMany();
        const today = new Date();

        const formattedPayments = await Promise.all(rawPayments.map(async (p) => {
            let currentStatus = 'Pending';
            
            // 🔥 Status Identification Logic
            if (p.status === 5) {
                currentStatus = 'Trash'; // 5 = Deleted/Trash
            }
            else if (p.payment_type === 1 && p.status === 1 && p.valid_until && new Date(p.valid_until) < today) {
                currentStatus = 'Non Paid';
                await prisma.payment.update({ where: { id: p.id }, data: { status: 3 } });
            } 
            else if (p.status === 0 && p.method === 'Upcoming') {
                currentStatus = 'Upcoming';
            }
            else if (p.status === 0) {
                currentStatus = 'Pending';
            }
            else if (p.status === 1) {
                // Free Card & Discount Identification
                if (p.amount === 0 && p.remark && p.remark.includes('Free Card')) {
                    currentStatus = 'Free Card';
                } else if (p.remark && p.remark.includes('Custom Breakdown')) {
                    currentStatus = 'Discount';
                } else {
                    currentStatus = 'Approved';
                }
            }
            else if (p.status === 2) currentStatus = 'Rejected';
            else if (p.status === 3) currentStatus = 'Non Paid';
            else if (p.status === 4) currentStatus = 'Post Pay';

            let systemTotal = 0;
            let parsedSubjects = [];
            let totalPhases = 1;

            if (p.subjects) {
                try {
                    const subIds = JSON.parse(p.subjects);
                    parsedSubjects = subIds.map(id => {
                        const course = courseMap[parseInt(id)];
                        if (course) systemTotal += parseFloat(course.price || 0);
                        return course || { id, name: 'Unknown Course', price: 0 };
                    });

                    if (p.payment_type === 2) {
                        const plan = allInstallments.find(i => i.batchId === p.batchId && i.subjectCount <= subIds.length);
                        if (plan && plan.details) {
                            try {
                                const parsedDetails = JSON.parse(plan.details);
                                totalPhases = parsedDetails.length;
                            } catch(e) {}
                        }
                    }
                } catch(e) {}
            }

            const slips = p.slip_image ? p.slip_image.split(',') : [];

            return {
                id: p.id,
                studentId: p.studentId,
                studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Unknown',
                studentNo: p.student?.id ? `STU-${p.student.id}` : 'STU-000',
                business: p.business?.name || 'N/A',
                batch: p.batch?.name || 'N/A',
                amount: p.amount || 0,
                systemTotal: systemTotal, 
                subjectsList: parsedSubjects, 
                type: p.payment_type === 1 ? 'Monthly' : (p.payment_type === 2 ? 'Installment' : 'Full'),
                method: p.method || 'Slip',
                status: currentStatus,
                date: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '-',
                dueDate: p.due_date ? new Date(p.due_date).toISOString().split('T')[0] : null,
                installmentNo: p.installment_no || 1,
                totalPhases: totalPhases,
                slips: slips,
                remark: p.remark || '',
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

// 2. Action (Approve, Reject, Free Card, Discount, Trash)
exports.paymentAction = async (req, res) => {
    try {
        const { paymentId, action, customAmount, remark } = req.body;
        let updateData = {};

        // 🔥 Trash Logic
        if (action === 'Trash') {
            updateData.status = 5; 
        } else if (action === 'Reject') {
            updateData.status = 2;
        } else if (action === 'Approve') {
            updateData.status = 1;
        } else if (action === 'Free Card') {
            updateData.status = 1;
            updateData.amount = 0;
            if (!remark) return res.status(400).json({ error: "Remark is required for Free Card" });
        } else if (action === 'Discount') {
            updateData.status = 1;
            updateData.amount = parseFloat(customAmount || 0);
            if (!remark) return res.status(400).json({ error: "Remark is required for Discount" });
        }

        if (['Approve', 'Free Card', 'Discount'].includes(action)) {
            const payRecord = await prisma.payment.findUnique({ where: { id: parseInt(paymentId) }});
            if (payRecord && payRecord.payment_type === 1) { 
                let validDate = new Date();
                validDate.setDate(validDate.getDate() + 30);
                updateData.valid_until = validDate;
            }
            
            if (remark) {
                updateData.remark = payRecord.remark ? `${payRecord.remark}\n\n[ADMIN]: ${remark}` : `[ADMIN]: ${remark}`;
            }
        } else if (remark && action !== 'Trash') {
             const payRecord = await prisma.payment.findUnique({ where: { id: parseInt(paymentId) }});
             updateData.remark = payRecord.remark ? `${payRecord.remark}\n\n[ADMIN]: ${remark}` : `[ADMIN]: ${remark}`;
        }

        await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: updateData
        });

        res.status(200).json({ message: `Payment processed as ${action}` });
    } catch (error) {
        res.status(500).json({ error: "Action failed" });
    }
};

// ... Pahalin thibba `approveInstallment`, `grantPostPay` tika ehemama thiyaganna ...

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