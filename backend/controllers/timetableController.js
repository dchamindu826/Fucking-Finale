const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getSchedule = async (req, res) => {
    try {
        const { batchId, year, month } = req.query;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

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
        
        const newClass = await prisma.timetable.create({
            data: {
                businessId: parseInt(businessId),
                batchId: parseInt(batchId),
                date: new Date(`${date}T00:00:00+05:30`), // Forced SLT
                subjectName,
                title,
                startTime,
                endTime,
                lecturerName
            }
        });

        // 🔥 1. Default System Timers Generation 🔥
        const templates = await prisma.taskTemplate.findMany({ where: { businessId: parseInt(businessId) } });
        const tasksToCreate = [];
        const classStartDateTime = new Date(`${date}T${startTime}:00+05:30`);
        const classEndDateTime = new Date(`${date}T${endTime}:00+05:30`);

        const defaultTemplates = [
            { taskType: 'LIVE_LINK', isRequired: true, deadlineHours: 1 }, 
            { taskType: 'RECORDING', isRequired: true, deadlineHours: 24 }, 
            { taskType: 'NOTES', isRequired: true, deadlineHours: 24 }      
        ];

        const finalTemplates = defaultTemplates.map(def => {
            const dbTpl = templates.find(t => t.taskType === def.taskType);
            return dbTpl || def; 
        });

        if (optionalMCQ) finalTemplates.push(templates.find(t => t.taskType === 'MCQ') || { taskType: 'MCQ', isRequired: true, deadlineHours: 48 });
        if (optionalPaper) finalTemplates.push(templates.find(t => t.taskType === 'STRUCTURED_PAPER') || { taskType: 'STRUCTURED_PAPER', isRequired: true, deadlineHours: 48 });

        for (const template of finalTemplates) {
            if (template.isRequired) {
                let deadline = template.taskType === 'RECORDING' 
                    ? new Date(classEndDateTime.getTime() + (template.deadlineHours * 60 * 60 * 1000))
                    : new Date(classStartDateTime.getTime() - (template.deadlineHours * 60 * 60 * 1000));

                tasksToCreate.push({ businessId: parseInt(businessId), batchId: parseInt(batchId), timetableId: newClass.id, taskType: template.taskType, deadline: deadline });
            }
        }
        if (tasksToCreate.length > 0) await prisma.task.createMany({ data: tasksToCreate });

        // 🔥 2. AUTO-ALLOCATE CUSTOM TASKS (Linked to Timetable) 🔥
        try {
            const customLinkedTemplates = await prisma.customTaskTemplate.findMany({
                where: { businessId: parseInt(businessId), allocationType: 'CLASS_LINKED' }
            });

            for (const ct of customLinkedTemplates) {
                const customDeadline = new Date(`${date}T${ct.endTime}:00+05:30`);
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
                            deadline: new Date(`${date}T${sub.endTime}:00+05:30`), status: "PENDING"
                        }));
                        await prisma.task.createMany({ data: subsData });
                    }
                }
            }
        } catch (err) { console.error("Failed to generate custom class linked tasks", err); }

        res.status(201).json(newClass);
    } catch (error) { res.status(500).json({ error: "Failed to schedule class" }); }
};

exports.deleteSchedule = async (req, res) => {
    try {
        await prisma.timetable.delete({ where: { id: parseInt(req.params.id) } });
        res.status(200).json({ message: "Class removed from schedule" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete schedule" });
    }
};