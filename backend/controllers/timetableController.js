const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔥 Robust SLT Time Parser (Server Timezone අවුල් සදහටම විසඳන කෑල්ල) 🔥
const parseSLTDate = (dateStr, timeStr = "00:00") => {
    // උදා: dateStr = "2026-05-12", timeStr = "20:00"
    const [year, month, day] = dateStr.split('-').map(Number);
    const timeParts = timeStr.split(':');
    const hours = Number(timeParts[0] || 0);
    const minutes = Number(timeParts[1] || 0);
    
    // ලංකාවේ වෙලාව (SLT) කියන්නේ UTC + 05:30
    // ඒ නිසා අපි පැය 5කුයි විනාඩි 30කුයි අඩු කරලා කෙලින්ම UTC වෙලාව හදලා DB එකට දෙනවා
    return new Date(Date.UTC(year, month - 1, day, hours - 5, minutes - 30, 0));
};

exports.getSchedule = async (req, res) => {
    try {
        const { batchId, year, month } = req.query;
        // මාසෙ මුල සහ අග ලංකාවේ වෙලාවටම ගන්නවා
        const startDate = parseSLTDate(`${year}-${String(month).padStart(2, '0')}-01`);
        const nextMonth = new Date(Date.UTC(year, month, 0)); 
        const endDate = parseSLTDate(`${year}-${String(month).padStart(2, '0')}-${nextMonth.getUTCDate()}`, "23:59");

        const schedule = await prisma.timetable.findMany({
            where: {
                batchId: parseInt(batchId),
                date: {
                    gte: startDate,
                    lte: endDate,
                }
            },
            orderBy: { startTime: 'asc' }
        });
        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ error: "Failed to load schedule" });
    }
};

exports.createSchedule = async (req, res) => {
    try {
        const { businessId, batchId, date, subjectName, title, startTime, endTime, lecturerName, optionalMCQ, optionalPaper } = req.body;
        
        // 100% ක් නිවැරදි ලංකාවේ වෙලාවන් (SLT Timestamps)
        const classDateSLT = parseSLTDate(date, "00:00");
        const classStartDateTime = parseSLTDate(date, startTime);
        const classEndDateTime = parseSLTDate(date, endTime);

        const newClass = await prisma.timetable.create({
            data: {
                businessId: parseInt(businessId),
                batchId: parseInt(batchId),
                date: classDateSLT,
                subjectName,
                title,
                startTime,
                endTime,
                lecturerName
            }
        });

        // 🔥 1. Default System Timers Generation (හරිම ගණනය කිරීම) 🔥
        const templates = await prisma.taskTemplate.findMany({ where: { businessId: parseInt(businessId) } });
        const tasksToCreate = [];
        
        const defaultTemplates = [
            { taskType: 'LIVE_LINK', isRequired: true, deadlineHours: 1 }, 
            { taskType: 'RECORDING', isRequired: true, deadlineHours: 24 }, 
            { taskType: 'NOTES', isRequired: true, deadlineHours: 24 }      
        ];

        const finalTemplates = defaultTemplates.map(def => {
            const dbTpl = templates.find(t => t.taskType === def.taskType);
            return dbTpl || def; 
        });

        const isMCQ = optionalMCQ === true || optionalMCQ === 'true' || optionalMCQ === '1';
        const isPaper = optionalPaper === true || optionalPaper === 'true' || optionalPaper === '1';

        if (isMCQ) finalTemplates.push(templates.find(t => t.taskType === 'MCQ') || { taskType: 'MCQ', isRequired: true, deadlineHours: 48 });
        if (isPaper) finalTemplates.push(templates.find(t => t.taskType === 'STRUCTURED_PAPER') || { taskType: 'STRUCTURED_PAPER', isRequired: true, deadlineHours: 48 });

        for (const template of finalTemplates) {
            if (template.isRequired) {
                let deadline;
                const hoursInMs = parseFloat(template.deadlineHours || 0) * 60 * 60 * 1000;

                // 🔥 RULES FOR DEADLINES (පන්තියට කලින්ද? පස්සෙද? කියලා බලලා හදනවා) 🔥
                if (['RECORDING', 'MCQ', 'STRUCTURED_PAPER'].includes(template.taskType)) {
                    // පන්තිය ඉවර වුණාට පස්සේ (AFTER End Time)
                    // උදා: පන්තිය 10:00 ට ඉවරයි. පැය 24ක් දුන්නොත් පහුවදා 10:00 වෙනවා.
                    deadline = new Date(classEndDateTime.getTime() + hoursInMs);
                } else {
                    // පන්තිය පටන් ගන්න කලින් (BEFORE Start Time) - Live Links & Notes
                    // උදා: පන්තිය රෑ 8:00 යි. පැය 4ක් දුන්නොත් හවස 4:00 වෙනවා.
                    deadline = new Date(classStartDateTime.getTime() - hoursInMs);
                }

                tasksToCreate.push({ 
                    businessId: parseInt(businessId), 
                    batchId: parseInt(batchId), 
                    timetableId: newClass.id, 
                    taskType: template.taskType, 
                    deadline: deadline 
                });
            }
        }
        
        if (tasksToCreate.length > 0) await prisma.task.createMany({ data: tasksToCreate });

        // 🔥 2. AUTO-ALLOCATE CUSTOM TASKS (Linked to Timetable) 🔥
        try {
            const customLinkedTemplates = await prisma.customTaskTemplate.findMany({
                where: { businessId: parseInt(businessId), allocationType: 'CLASS_LINKED' }
            });

            for (const ct of customLinkedTemplates) {
                // Custom Task වල වෙලාවත් SLT වලින්ම හදනවා
                const customDeadline = parseSLTDate(date, ct.endTime);

                const mainCtTask = await prisma.task.create({
                    data: {
                        businessId: parseInt(businessId), batchId: parseInt(batchId), timetableId: newClass.id,
                        taskType: "CUSTOM", customTitle: ct.title, customDesc: ct.description,
                        assignedTo: ct.autoAssignTo || null, status: ct.autoAssignTo ? "IN_PROGRESS" : "PENDING",
                        deadline: customDeadline
                    }
                });

                if (ct.subTasks) {
                    const subTasksArray = typeof ct.subTasks === 'string' ? JSON.parse(ct.subTasks) : ct.subTasks;
                    if (Array.isArray(subTasksArray) && subTasksArray.length > 0) {
                        const subsData = subTasksArray.map(sub => ({
                            businessId: parseInt(businessId), batchId: parseInt(batchId), timetableId: newClass.id,
                            taskType: "CUSTOM", customTitle: sub.title, parentId: mainCtTask.id,
                            deadline: parseSLTDate(date, sub.endTime), status: "PENDING"
                        }));
                        await prisma.task.createMany({ data: subsData });
                    }
                }
            }
        } catch (err) { console.error("Failed to generate custom class linked tasks", err); }

        res.status(201).json(newClass);
    } catch (error) { 
        console.error("Timetable Creation Error:", error);
        res.status(500).json({ error: "Failed to schedule class" }); 
    }
};

exports.deleteSchedule = async (req, res) => {
    try {
        await prisma.timetable.delete({ where: { id: parseInt(req.params.id) } });
        res.status(200).json({ message: "Class removed from schedule" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete schedule" });
    }
};