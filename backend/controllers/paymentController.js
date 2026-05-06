const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const safeJson = (data) => JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));

// ==========================================
// 🏦 PAYMENT CONTROLLER LOGIC (ADMIN)
// ==========================================

// 1. Get All Payments
exports.getPayments = async (req, res) => {
    try {
        const rawPayments = await prisma.payment.findMany({
            include: { student: true, business: true, batch: true },
            orderBy: { created_at: 'desc' }
        });

        const allCourses = await prisma.course.findMany({ select: { id: true, name: true, price: true, code: true } });
        const courseMap = {};
        allCourses.forEach(c => courseMap[c.id] = c);

        const allInstallments = await prisma.installment.findMany();
        const today = new Date();

        const formattedPayments = await Promise.all(rawPayments.map(async (p) => {
            let currentStatus = 'Pending';
            
            if (p.status === 5) currentStatus = 'Trash'; 
            else if (p.payment_type === 1 && p.status === 1 && p.valid_until && new Date(p.valid_until) < today) {
                currentStatus = 'Non Paid';
                await prisma.payment.update({ where: { id: p.id }, data: { status: 3 } });
            } 
            // 🔥 FIX: Post Pay 7 Days Expire Check (Auto revert to Pending)
            else if (p.status === 4 && p.valid_until && new Date(p.valid_until) < today) {
                currentStatus = 'Pending';
                await prisma.payment.update({ where: { id: p.id }, data: { status: 0, valid_until: null, post_pay_days: 0 } });
            }
            else if (p.status === 0 && p.method === 'Upcoming') currentStatus = 'Upcoming';
            else if (p.status === 0) currentStatus = 'Pending';
            else if (p.status === 1) {
                if (p.amount === 0 && p.remark && p.remark.includes('Free Card')) currentStatus = 'Free Card';
                else if (p.remark && p.remark.includes('Custom Breakdown')) currentStatus = 'Discount';
                else currentStatus = 'Approved';
            }
            else if (p.status === 2) currentStatus = 'Rejected';
            else if (p.status === 3) currentStatus = 'Non Paid';
            else if (p.status === 4) currentStatus = 'Post Pay';

            let systemTotal = 0; let parsedSubjects = []; let totalPhases = 1;

            if (p.subjects) {
                try {
                    const subIds = JSON.parse(p.subjects);
                    parsedSubjects = subIds.map(id => {
                        const course = courseMap[parseInt(id)];
                        if (course) systemTotal += parseFloat(course.price || 0);
                        return course || { id, name: 'Unknown Course', price: 0, code: 'N/A' };
                    });

                    if (p.payment_type === 2) {
                        const plan = allInstallments.find(i => i.batchId === p.batchId && i.subjectCount <= subIds.length);
                        if (plan && plan.details) {
                            try { totalPhases = JSON.parse(plan.details).length; } catch(e) {}
                        }
                    }
                } catch(e) {}
            }

            return {
                id: p.id,
                studentId: p.studentId,
                studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Unknown',
                studentNo: p.student?.id ? `STU-${p.student.id}` : 'STU-000',
                businessId: p.businessId, batchId: p.batchId, groupId: p.groupId,
                business: p.business?.name || 'N/A', batch: p.batch?.name || 'N/A',
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
                slips: p.slip_image ? p.slip_image.split(',') : [],
                remark: p.remark || '',
                daysLeft: p.post_pay_days || 0,
                validUntil: p.valid_until,
                excessAmount: p.excessAmount || 0,
                arrearsAmount: p.arrearsAmount || 0
            };
        }));

        res.status(200).json(safeJson(formattedPayments));
    } catch (error) { 
        res.status(500).json([]); 
    }
};

// 2. Action for Standard Payments (Approve/Reject/Trash/SendToDelivery)
exports.paymentAction = async (req, res) => {
    try {
        const { paymentId, action, customAmount, remark, isSelfPicked, actualAmountPaid } = req.body;
        let updateData = {};
        
        const payRecord = await prisma.payment.findUnique({ where: { id: parseInt(paymentId) }});
        if (!payRecord) return res.status(404).json({ error: "Payment not found" });

        // 🔥 FIX: Send to Delivery Hub manually for Free Cards / Discounts
        if (action === 'SendToDelivery') {
            const existingDelivery = await prisma.delivery.findUnique({ where: { paymentId: parseInt(paymentId) } });
            if (!existingDelivery && payRecord.subjects) {
                try {
                    const subIds = JSON.parse(payRecord.subjects).map(id => parseInt(id));
                    const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
                    if (courses.length > 0) {
                        const paymentTypeStr = payRecord.payment_type === 1 ? 'Monthly' : (payRecord.payment_type === 2 ? 'Installment' : 'Full');
                        await prisma.delivery.create({
                            data: {
                                paymentId: payRecord.id, studentId: payRecord.studentId.toString(), businessId: payRecord.businessId,
                                paymentType: paymentTypeStr, status: 'Pending',
                                items: { create: courses.map(c => ({ courseId: c.id, tuteName: c.name || "Tute", quantity: 1 })) }
                            }
                        });
                        return res.status(200).json({ message: `Sent to Delivery Hub successfully` });
                    }
                } catch(e) { return res.status(500).json({ error: "Failed to create delivery" }); }
            }
            return res.status(200).json({ message: `Already in Delivery Hub` });
        }

        if (action === 'Trash') {
            updateData.status = 5; 
        } else if (action === 'Reject') {
            updateData.status = 2;
        } else if (action === 'Approve') {
            updateData.status = 1;
            
            // 🔥 WALLET LOGIC INTEGRATION
            const expectedAmount = parseFloat(payRecord.amount);
            const actualPaid = actualAmountPaid ? parseFloat(actualAmountPaid) : expectedAmount;
            const difference = actualPaid - expectedAmount; 

            if (difference !== 0) {
                await prisma.user.update({
                    where: { id: payRecord.studentId },
                    data: { walletBalance: { increment: difference } }
                });
                updateData.excessAmount = difference > 0 ? difference : 0;
                updateData.arrearsAmount = difference < 0 ? Math.abs(difference) : 0;
                
                updateData.remark = payRecord.remark 
                    ? `${payRecord.remark}\n\n[SYSTEM]: Wallet adjusted by LKR ${difference.toLocaleString()}` 
                    : `[SYSTEM]: Wallet adjusted by LKR ${difference.toLocaleString()}`;
            }
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
            if (payRecord.payment_type === 1) { 
                let validDate = new Date();
                validDate.setDate(validDate.getDate() + 30);
                updateData.valid_until = validDate;
            }
        }

        if (remark && action !== 'Trash') {
            updateData.remark = updateData.remark 
                ? `${updateData.remark}\n\n[ADMIN]: ${remark}` 
                : (payRecord.remark ? `${payRecord.remark}\n\n[ADMIN]: ${remark}` : `[ADMIN]: ${remark}`);
        }

        const updatedPayment = await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: updateData
        });

        // 🔥 FIX: Auto Delivery ONLY for normal Approve (Not Free Card/Discount)
        if (action === 'Approve') {
            const existingDelivery = await prisma.delivery.findUnique({ where: { paymentId: parseInt(paymentId) } });
            if (!existingDelivery && updatedPayment.subjects) {
                try {
                    const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
                    const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
                    if (courses.length > 0) {
                        const paymentTypeStr = updatedPayment.payment_type === 1 ? 'Monthly' : (updatedPayment.payment_type === 2 ? 'Installment' : 'Full');
                        await prisma.delivery.create({
                            data: {
                                paymentId: updatedPayment.id, studentId: updatedPayment.studentId.toString(), businessId: updatedPayment.businessId,
                                paymentType: paymentTypeStr, status: isSelfPicked ? 'Delivered' : 'Pending',
                                items: { create: courses.map(c => ({ courseId: c.id, tuteName: c.name || "Tute", quantity: 1 })) }
                            }
                        });
                    }
                } catch(e) {}
            }
        }

        res.status(200).json({ message: `Payment processed as ${action}` });
    } catch (error) { 
        res.status(500).json({ error: "Action failed" }); 
    }
};

// 3. Action for Installments
exports.approveInstallment = async (req, res) => {
    try {
        const { paymentId, actualAmountPaid, remark, isSelfPicked } = req.body;
        
        const payRecord = await prisma.payment.findUnique({ where: { id: parseInt(paymentId) }});
        if (!payRecord) return res.status(404).json({ error: "Payment not found" });

        let updateData = { status: 1 }; 

        // 🔥 WALLET LOGIC INTEGRATION 
        const expectedAmount = parseFloat(payRecord.amount);
        const actualPaid = actualAmountPaid ? parseFloat(actualAmountPaid) : expectedAmount;
        const difference = actualPaid - expectedAmount;

        if (difference !== 0) {
            await prisma.user.update({
                where: { id: payRecord.studentId },
                data: { walletBalance: { increment: difference } }
            });
            updateData.excessAmount = difference > 0 ? difference : 0;
            updateData.arrearsAmount = difference < 0 ? Math.abs(difference) : 0;
            
            updateData.remark = payRecord.remark 
                ? `${payRecord.remark}\n\n[SYSTEM]: Wallet adjusted by LKR ${difference.toLocaleString()}` 
                : `[SYSTEM]: Wallet adjusted by LKR ${difference.toLocaleString()}`;
        }

        if (remark) {
            updateData.remark = updateData.remark 
                ? `${updateData.remark}\n\n[ADMIN]: ${remark}` 
                : (payRecord.remark ? `${payRecord.remark}\n\n[ADMIN]: ${remark}` : `[ADMIN]: ${remark}`);
        }

        const updatedPayment = await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: updateData
        });

        const existingDelivery = await prisma.delivery.findUnique({ where: { paymentId: parseInt(paymentId) } });
        if (!existingDelivery && updatedPayment.subjects) {
            try {
                const subIds = JSON.parse(updatedPayment.subjects).map(id => parseInt(id));
                const courses = await prisma.course.findMany({ where: { id: { in: subIds } } });
                if (courses.length > 0) {
                    await prisma.delivery.create({
                        data: {
                            paymentId: updatedPayment.id, studentId: updatedPayment.studentId.toString(), businessId: updatedPayment.businessId,
                            paymentType: 'Installment', status: isSelfPicked ? 'Delivered' : 'Pending',
                            items: { create: courses.map(c => ({ courseId: c.id, tuteName: c.name || "Tute", quantity: 1 })) }
                        }
                    });
                }
            } catch(e) {}
        }

        if (payRecord.subjects) {
            try {
                const subIds = JSON.parse(payRecord.subjects);
                const plan = await prisma.installment.findFirst({
                    where: { batchId: payRecord.batchId, subjectCount: subIds.length }
                });

                if (plan && plan.details) {
                    const phases = JSON.parse(plan.details);
                    const currentPhaseIndex = payRecord.installment_no - 1;

                    if (currentPhaseIndex + 1 < phases.length) {
                        const nextPhase = phases[currentPhaseIndex + 1];
                        let nextDueDate = new Date();
                        nextDueDate.setDate(nextDueDate.getDate() + 30); 

                        await prisma.payment.create({
                            data: {
                                studentId: payRecord.studentId,
                                businessId: payRecord.businessId,
                                batchId: payRecord.batchId,
                                groupId: payRecord.groupId,
                                subjects: payRecord.subjects,
                                payment_type: 2, 
                                method: 'Upcoming', 
                                status: 0,
                                amount: parseFloat(nextPhase.price),
                                installment_no: currentPhaseIndex + 2,
                                due_date: nextDueDate
                            }
                        });
                    }
                }
            } catch (e) {}
        }

        res.status(200).json({ message: "Installment approved successfully" });
    } catch (error) { 
        res.status(500).json({ error: "Failed to approve installment" }); 
    }
};

// 4. Grant Post Pay (Temporary Access) - Auto generates 7 days
exports.grantPostPay = async (req, res) => {
    try {
        const { paymentId } = req.body;
        
        let validDate = new Date();
        validDate.setDate(validDate.getDate() + 7); // Exactly 7 days

        await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: { status: 4, post_pay_days: 7, valid_until: validDate } 
        });
        
        res.status(200).json({ message: `Access granted for 7 days` });
    } catch (error) {
        res.status(500).json({ error: "Failed to grant access" });
    }
};