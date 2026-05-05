const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// SLT time conversion helper
const getSLTDate = (timeString) => {
    if (!timeString) return null;
    const today = new Date();
    const [hours, minutes] = timeString.split(':');
    today.setHours(parseInt(hours) + 5, parseInt(minutes) + 30, 0, 0); // Adjusted for SLT
    return today;
};

exports.getTasks = async (req, res) => {
    try {
        const { businessId, batchId, status, assignedTo, role } = req.query;
        let whereClause = { parentId: null }; 

        if (businessId) whereClause.businessId = parseInt(businessId);
        if (batchId) whereClause.batchId = parseInt(batchId);
        if (status) whereClause.status = status;
        
        if (role && role.toUpperCase() === 'COORDINATOR' && assignedTo) {
             whereClause.assignedTo = parseInt(assignedTo);
        } else if (assignedTo) {
             whereClause.assignedTo = parseInt(assignedTo);
        }

        const tasks = await prisma.task.findMany({
            where: whereClause,
            include: {
                timetable: true,
                subTasks: { orderBy: { id: 'asc' } },
                assignedUser: { select: { id: true, firstName: true, lastName: true } },
                business: { select: { id: true, name: true } },
                batch: { select: { id: true, name: true } },
                content: true // Include created content for Manager Overview
            },
            orderBy: { createdAt: 'desc' }
        });

        const now = new Date();
        const tasksWithTime = tasks.map(task => {
            let isOverdue = false;
            let timeDiff = null;
            let finalStatus = task.status;

            if (task.deadline) {
                const deadline = new Date(task.deadline);
                timeDiff = deadline.getTime() - now.getTime();
                isOverdue = timeDiff < 0 && task.status !== 'COMPLETED';
                
                if (isOverdue && (task.status === 'PENDING' || task.status === 'IN_PROGRESS')) {
                    finalStatus = 'LOCKED';
                }
            }

            const processedSubTasks = task.subTasks.map(sub => {
                let subOverdue = false;
                if(sub.deadline){
                     subOverdue = new Date(sub.deadline).getTime() - now.getTime() < 0 && sub.status !== 'COMPLETED';
                }
                return { ...sub, status: sub.status, isOverdue: subOverdue };
            });

            return {
                ...task,
                subTasks: processedSubTasks,
                status: finalStatus,
                isOverdue,
                timeRemainingMs: timeDiff
            };
        });

        res.status(200).json(tasksWithTime);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
};

exports.assignTask = async (req, res) => {
    try {
        const { taskId, assignedTo } = req.body;
        const updatedTask = await prisma.task.update({
            where: { id: parseInt(taskId) },
            data: { assignedTo: parseInt(assignedTo), status: "IN_PROGRESS" }
        });
        await prisma.task.updateMany({
            where: { parentId: parseInt(taskId) },
            data: { assignedTo: parseInt(assignedTo), status: "IN_PROGRESS" }
        });
        res.status(200).json({ message: "Task Assigned", task: updatedTask });
    } catch (error) { res.status(500).json({ error: "Failed to assign task" }); }
};

exports.requestUnlock = async (req, res) => {
    try {
        const { taskId, reason } = req.body;
        const updatedTask = await prisma.task.update({
            where: { id: parseInt(taskId) },
            data: { status: "REQ_UNLOCK", unlockReason: reason }
        });
        res.status(200).json({ message: "Unlock request sent", task: updatedTask });
    } catch (error) { res.status(500).json({ error: "Failed to request unlock" }); }
};

exports.approveUnlock = async (req, res) => {
    try {
        const { taskId, additionalHours, managerId } = req.body;
        const newDeadline = new Date(Date.now() + parseInt(additionalHours) * 60 * 60 * 1000);
        const updatedTask = await prisma.task.update({
            where: { id: parseInt(taskId) },
            data: { 
                status: "IN_PROGRESS", isUnlocked: true, unlockedBy: parseInt(managerId),
                deadline: newDeadline, unlockReason: null 
            }
        });
        res.status(200).json({ message: "Task Unlocked", task: updatedTask });
    } catch (error) { res.status(500).json({ error: "Failed to unlock task" }); }
};

exports.getTaskTemplates = async (req, res) => {
    try {
        const templates = await prisma.taskTemplate.findMany({ where: { businessId: parseInt(req.params.businessId) } });
        res.status(200).json(templates);
    } catch (error) { res.status(500).json({ error: "Failed to fetch templates" }); }
};

exports.saveTaskTemplates = async (req, res) => {
    try {
         const { businessId, templates } = req.body;
         const upsertPromises = templates.map(t => 
             prisma.taskTemplate.upsert({
                 where: { businessId_taskType: { businessId: parseInt(businessId), taskType: t.taskType } },
                 update: { deadlineHours: parseInt(t.deadlineHours), isRequired: t.isRequired },
                 create: { businessId: parseInt(businessId), taskType: t.taskType, deadlineHours: parseInt(t.deadlineHours), isRequired: t.isRequired }
             })
         );
         await Promise.all(upsertPromises);
         res.status(200).json({ message: "Templates saved" });
    } catch (error) { res.status(500).json({ error: "Failed to save templates" }); }
};

exports.completeTask = async (req, res) => {
    try {
        const { taskId, contentId } = req.body;
        const updatedTask = await prisma.task.update({
            where: { id: parseInt(taskId) },
            data: { status: "COMPLETED", completedAt: new Date(), contentId: parseInt(contentId) }
        });
        res.status(200).json({ message: "Task completed", task: updatedTask });
    } catch (error) { res.status(500).json({ error: "Failed to complete task" }); }
};

exports.rejectTask = async (req, res) => {
    try {
        const { taskId, reason } = req.body;
        const task = await prisma.task.findUnique({ where: { id: parseInt(taskId) } });
        if (!task) return res.status(404).json({ error: "Task not found" });

        if (task.contentId) {
            await prisma.content.delete({ where: { id: task.contentId } }).catch(()=>console.log("Content already deleted"));
        }

        if (task.assignedTo) {
            try {
                await prisma.staffKpi.create({
                    data: {
                        staffId: task.assignedTo, taskId: task.id, mark: -1, reason: `Task Rejected: ${reason}`
                    }
                });
            } catch(kpiErr) { console.log("KPI Log creation skipped/failed"); }
        }

        await prisma.task.update({
            where: { id: parseInt(taskId) },
            data: { status: "PENDING", completedAt: null, contentId: null, proofUrl: null }
        });

        res.status(200).json({ message: "Task rejected & negative KPI logged." });
    } catch (error) { 
        res.status(500).json({ error: "Failed to reject task" }); 
    }
};

exports.createCustomTask = async (req, res) => {
    try {
        const { businessId, customTitle, customDesc, subTasks } = req.body;

        const mainTask = await prisma.task.create({
            data: { businessId: parseInt(businessId), taskType: "CUSTOM", customTitle, customDesc }
        });

        if (subTasks && subTasks.length > 0) {
            const subTaskData = subTasks.map(sub => ({
                businessId: parseInt(businessId), taskType: "CUSTOM", customTitle: sub.title,
                parentId: mainTask.id, deadline: getSLTDate(sub.endTime)
            }));
            await prisma.task.createMany({ data: subTaskData });
        }

        res.status(201).json({ message: "Custom Task Created" });
    } catch (error) { res.status(500).json({ error: "Failed to create custom task" }); }
};

exports.completeCustomTask = async (req, res) => {
    try {
        const { taskId } = req.body;
        let proofUrl = null;
        let proofType = null;

        if (req.file) {
            proofUrl = req.file.filename;
            proofType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';
        }

        await prisma.task.update({
            where: { id: parseInt(taskId) },
            data: { status: "COMPLETED", completedAt: new Date(), proofUrl, proofType }
        });

        const task = await prisma.task.findUnique({ where: { id: parseInt(taskId) }});
        if (task.parentId) {
            const pendingSiblings = await prisma.task.count({
                where: { parentId: task.parentId, status: { not: "COMPLETED" } }
            });
            if (pendingSiblings === 0) {
                await prisma.task.update({
                    where: { id: task.parentId },
                    data: { status: "COMPLETED", completedAt: new Date() }
                });
            }
        }

        res.status(200).json({ message: "Custom Task Completed" });
    } catch (error) { res.status(500).json({ error: "Failed to complete custom task" }); }
};

// ================= CUSTOM TASK TEMPLATE CONTROLLERS =================

exports.getCustomTaskTemplates = async (req, res) => {
    try {
        const templates = await prisma.customTaskTemplate.findMany({
            where: { businessId: parseInt(req.params.businessId) }
        });
        res.status(200).json(templates);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch custom templates" });
    }
};

exports.saveCustomTaskTemplate = async (req, res) => {
    try {
        const { id, businessId, title, description, dayOfMonth, startTime, endTime, allocationType, autoAssignTo, subTasks } = req.body;
        
        const data = {
            businessId: parseInt(businessId),
            title,
            description,
            dayOfMonth: dayOfMonth ? parseInt(dayOfMonth) : null,
            startTime,
            endTime,
            allocationType: allocationType || 'MANUAL',
            autoAssignTo: autoAssignTo ? parseInt(autoAssignTo) : null,
            subTasks: subTasks && subTasks.length > 0 ? subTasks : null
        };

        let template;
        if (id) {
            template = await prisma.customTaskTemplate.update({ where: { id: parseInt(id) }, data });
        } else {
            template = await prisma.customTaskTemplate.create({ data });
        }

        res.status(200).json({ message: "Template saved successfully", template });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to save template" });
    }
};

exports.deleteCustomTaskTemplate = async (req, res) => {
    try {
        await prisma.customTaskTemplate.delete({ where: { id: parseInt(req.params.id) } });
        res.status(200).json({ message: "Template deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete template" });
    }
};