const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getTypeInt = (typeStr) => {
    switch (typeStr) {
        case 'live': return 1; case 'recording': return 2; case 'document': return 3; case 'sPaper': return 4; case 'paper': return 5;
        default: return parseInt(typeStr) || 1;
    }
};

// ================= BUSINESS =================
exports.createBusiness = async (req, res) => {
    try {
        const { name, category, medium, description, streams, isDiscountEnabledForInstallments } = req.body;
        const logo = req.file ? req.file.filename : 'default.png';
        const newBiz = await prisma.business.create({
            data: { name, category, medium, description, streams, logo, isDiscountEnabledForInstallments: parseInt(isDiscountEnabledForInstallments || 0) }
        });
        res.status(201).json(newBiz);
    } catch (error) { res.status(500).json({ error: "Failed to create business" }); }
};

exports.updateBusiness = async (req, res) => {
    try {
        const { businessId, name, category, medium, description, streams, isDiscountEnabledForInstallments } = req.body;
        let updateData = { name, category, medium, description, streams, isDiscountEnabledForInstallments: parseInt(isDiscountEnabledForInstallments || 0) };
        if (req.file) updateData.logo = req.file.filename;
        const updatedBiz = await prisma.business.update({ where: { id: parseInt(businessId) }, data: updateData });
        res.status(200).json(updatedBiz);
    } catch (error) { res.status(500).json({ error: "Failed to update business" }); }
};

// ================= BATCHES =================
exports.getBatchesByBusiness = async (req, res) => {
    try {
        const batches = await prisma.batch.findMany({
            where: { businessId: parseInt(req.params.bizId) },
            include: { groups: { include: { courses: true } } }
        });
        const safeData = JSON.parse(JSON.stringify(batches, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        res.status(200).json({ batches: safeData });
    } catch (error) { res.status(500).json({ error: "Failed to fetch batches" }); }
};

exports.createBatch = async (req, res) => {
    try {
        const { business_id, name, type, itemOrder, description } = req.body;
        const logo = req.file ? req.file.filename : null;
        await prisma.batch.create({
            data: { businessId: parseInt(business_id), name, type: parseInt(type), itemOrder: parseInt(itemOrder || 1), description, logo }
        });
        res.status(201).json({ message: "Created" });
    } catch (e) { res.status(500).json({ error: "Failed to create batch" }); }
};

exports.updateBatch = async (req, res) => {
    try {
        const { batch_id, name, type, itemOrder, description } = req.body;
        const data = { name, type: parseInt(type), itemOrder: parseInt(itemOrder || 1), description };
        if (req.file) data.logo = req.file.filename;
        await prisma.batch.update({ where: { id: parseInt(batch_id) }, data });
        res.status(200).json({ message: "Updated" });
    } catch (e) { res.status(500).json({ error: "Failed to update batch" }); }
};

// ================= GROUPS =================
exports.createGroup = async (req, res) => {
    try {
        const { batch_id, name, paymentType, itemOrder, discountRules } = req.body;
        const newGroup = await prisma.group.create({
            data: { batchId: parseInt(batch_id), name, type: paymentType === 'Monthly' ? 1 : 2, itemOrder: parseInt(itemOrder || 1), discount_rules: JSON.stringify(discountRules || []) }
        });
        res.status(201).json(newGroup);
    } catch (e) { res.status(500).json({ error: "Failed to create group" }); }
};

exports.updateGroup = async (req, res) => {
    try {
        const { group_id, name, paymentType, itemOrder, discountRules } = req.body;
        const updated = await prisma.group.update({
            where: { id: parseInt(group_id) }, data: { name, type: paymentType === 'Monthly' ? 1 : 2, itemOrder: parseInt(itemOrder || 1), discount_rules: JSON.stringify(discountRules || []) }
        });
        res.status(200).json(updated);
    } catch (e) { res.status(500).json({ error: "Failed to update group" }); }
};

// 🔥 FIX: Group eka delete karana function eka 🔥
exports.deleteGroup = async (req, res) => {
    try {
        const { group_id } = req.body;
        await prisma.group.delete({ 
            where: { id: parseInt(group_id) } 
        });
        res.status(200).json({ message: "Payment Group Deleted" });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to delete group. Please remove subjects assigned to this group first." }); 
    }
};

// ================= SUBJECTS =================

exports.createSubject = async (req, res) => {
    try {
        const { name, code, stream, streams, description, itemOrder, groupPrices, isDiscountExcluded, lecturerName } = req.body;
        const parsedPrices = JSON.parse(groupPrices || '[]');
        const excludeDiscount = isDiscountExcluded === 'true' || isDiscountExcluded === true || isDiscountExcluded === '1';
        
        if (parsedPrices.length === 0) return res.status(400).json({ error: "Please select at least one group" });

        // 🔥 FIX: Tute Cover images tika JSON ekata attach karanawa 🔥
        if (req.files && req.files.length > 0) {
            parsedPrices.forEach(gp => {
                const file = req.files.find(f => f.fieldname === `tuteCover_${gp.groupId}`);
                if (file) gp.tuteCover = file.filename;
            });
        }

        const coursePromises = parsedPrices.map(gp => {
            return prisma.course.create({
                data: { 
                    name, code, stream, streams: JSON.stringify(streams), description, lecturerName,
                    itemOrder: parseInt(itemOrder || 1), price: parseFloat(gp.price || 0), 
                    groupPrices: JSON.stringify(parsedPrices), groupId: parseInt(gp.groupId),
                    isDiscountExcluded: excludeDiscount
                }
            });
        });

        await Promise.all(coursePromises);
        res.status(201).json({ message: "Created in all selected groups" });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to create subject" }); 
    }
};

exports.updateSubject = async (req, res) => {
    try {
        const { course_id, name, code, stream, streams, description, itemOrder, groupPrices, isDiscountExcluded, lecturerName } = req.body;
        const parsedPrices = JSON.parse(groupPrices || '[]');
        const excludeDiscount = isDiscountExcluded === 'true' || isDiscountExcluded === true || isDiscountExcluded === '1';

        const originalCourse = await prisma.course.findUnique({ where: { id: parseInt(course_id) } });
        if (!originalCourse) return res.status(404).json({ error: "Course not found" });

        // 🔥 FIX: Tute Cover images tika JSON ekata attach karanawa 🔥
        if (req.files && req.files.length > 0) {
            parsedPrices.forEach(gp => {
                const file = req.files.find(f => f.fieldname === `tuteCover_${gp.groupId}`);
                if (file) gp.tuteCover = file.filename;
            });
        }

        const updatePromises = parsedPrices.map(async (gp) => {
            const existingCourse = await prisma.course.findFirst({
                where: { name: originalCourse.name, groupId: parseInt(gp.groupId) }
            });

            if (existingCourse) {
                // Parana image eka thiyagannawa aluth ekak nathnam
                const existingGpData = JSON.parse(existingCourse.groupPrices || '[]').find(p => parseInt(p.groupId) === parseInt(gp.groupId));
                if (!gp.tuteCover && existingGpData && existingGpData.tuteCover) {
                    gp.tuteCover = existingGpData.tuteCover;
                }

                return prisma.course.update({
                    where: { id: existingCourse.id },
                    data: { name, code, stream, streams: JSON.stringify(streams), description, lecturerName, itemOrder: parseInt(itemOrder || 1), price: parseFloat(gp.price || 0), groupPrices: JSON.stringify(parsedPrices), isDiscountExcluded: excludeDiscount }
                });
            } else {
                return prisma.course.create({
                    data: { name, code, stream, streams: JSON.stringify(streams), description, lecturerName, itemOrder: parseInt(itemOrder || 1), price: parseFloat(gp.price || 0), groupPrices: JSON.stringify(parsedPrices), groupId: parseInt(gp.groupId), isDiscountExcluded: excludeDiscount }
                });
            }
        });

        await Promise.all(updatePromises);
        res.status(200).json({ message: "Updated across groups" });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to update subject" }); 
    }
};

// 🔥 NEW: Assign Lecturer Route 🔥
exports.assignLecturer = async (req, res) => {
    try {
        const { subjectName, lecturerName } = req.body;
        // Update all courses with this name in the batch
        await prisma.course.updateMany({
            where: { name: subjectName },
            data: { lecturerName }
        });
        res.status(200).json({ message: "Lecturer Assigned Successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to assign lecturer" });
    }
};


// ================= DELETE FUNCTIONS (NEW) =================
exports.deleteBusiness = async (req, res) => {
    try {
        await prisma.business.delete({ where: { id: parseInt(req.body.business_id) } });
        res.status(200).json({ message: "Business Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete business. Please delete its batches first." }); }
};

exports.deleteBatch = async (req, res) => {
    try {
        await prisma.batch.delete({ where: { id: parseInt(req.body.batch_id) } });
        res.status(200).json({ message: "Batch Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete batch. Please delete its groups first." }); }
};

exports.deleteSubject = async (req, res) => {
    try {
        await prisma.course.delete({ where: { id: parseInt(req.body.course_id) } });
        res.status(200).json({ message: "Subject Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete subject." }); }
};


// ================= INSTALLMENTS =================
exports.getInstallments = async (req, res) => {
    try {
        const plans = await prisma.installment.findMany({ where: { batchId: parseInt(req.params.batchId) } });
        res.status(200).json(plans);
    } catch (e) { res.status(500).json({ error: "Failed to get installments" }); }
};

exports.deleteInstallment = async (req, res) => {
    try {
        await prisma.installment.delete({ where: { id: parseInt(req.body.plan_id) } });
        res.status(200).json({ message: "Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete installment" }); }
};

exports.createInstallment = async (req, res) => {
    try {
        const { batch_id, subjectCount, installmentsData } = req.body;
        await prisma.installment.create({ data: { batchId: parseInt(batch_id), subjectCount: parseInt(subjectCount), details: JSON.stringify(installmentsData) } });
        res.status(201).json({ message: "Created" });
    } catch (e) { res.status(500).json({ error: "Failed to create installment" }); }
};

// ================= FOLDERS (CONTENT GROUPS) =================
exports.addContentGroup = async (req, res) => {
    try {
        const { title, type, order, batch_id, course_code } = req.body;
        const newFolder = await prisma.contentGroup.create({
            data: { title, type: parseInt(type), itemOrder: parseInt(order) || 1, batchId: parseInt(batch_id), courseCode: course_code === 'NULL' ? null : course_code }
        });
        res.status(201).json({ message: "Folder Created", data: newFolder });
    } catch (e) { res.status(500).json({ error: "Failed to create folder" }); }
};

exports.deleteContentGroup = async (req, res) => {
    try {
        await prisma.contentGroup.delete({ where: { id: parseInt(req.body.contentGroupId) } });
        res.status(200).json({ message: "Folder Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete folder. Delete contents first." }); }
};

// ================= CONTENT & MASS ASSIGN =================
exports.addContentMassAssign = async (req, res) => {
    try {
        const { type, contentGroupId, title, link, zoomMeetingId, date, startTime, endTime, paperTime, questionCount, isFree, selectedCourses, batch_id } = req.body;
        const newContent = await prisma.content.create({
            data: {
                title, contentType: type, contentGroupId: contentGroupId ? parseInt(contentGroupId) : null,
                link, meetingId: zoomMeetingId, fileName: req.file ? req.file.filename : null,
                date: date ? new Date(date) : null, startTime, endTime,
                paperTime: paperTime ? parseInt(paperTime) : null, questionCount: questionCount ? parseInt(questionCount) : null,
                isFree: isFree === '1', batchId: parseInt(batch_id), courseId: 0
            }
        });

        if (selectedCourses) {
            const coursesArray = JSON.parse(selectedCourses);
            const contentCourseData = coursesArray.map(cId => ({ content_id: newContent.id, course_id: BigInt(cId), type: getTypeInt(type) }));
            if (contentCourseData.length > 0) await prisma.contentCourse.createMany({ data: contentCourseData });
        }
        res.status(201).json({ message: "Assigned Successfully", data: newContent });
    } catch (e) { console.error(e); res.status(500).json({ error: "Failed to add content" }); }
};

exports.updateContentMassAssign = async (req, res) => {
    try {
        const { content_id, type, contentGroupId, title, link, zoomMeetingId, date, startTime, endTime, paperTime, questionCount, isFree } = req.body;
        let updateData = { title, contentType: type, contentGroupId: contentGroupId ? parseInt(contentGroupId) : null, link, meetingId: zoomMeetingId, date: date ? new Date(date) : null, startTime, endTime, paperTime: paperTime ? parseInt(paperTime) : null, questionCount: questionCount ? parseInt(questionCount) : null, isFree: isFree === '1' };
        if (req.file) updateData.fileName = req.file.filename;
        const updated = await prisma.content.update({ where: { id: parseInt(content_id) }, data: updateData });
        res.status(200).json(updated);
    } catch (e) { res.status(500).json({ error: "Failed to update content" }); }
};

exports.deleteContent = async (req, res) => {
    try {
        const { content_id } = req.body;
        await prisma.content.delete({ where: { id: parseInt(content_id) } });
        await prisma.contentCourse.deleteMany({ where: { content_id: parseInt(content_id) } });
        res.status(200).json({ message: "Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete" }); }
};

// 🔥 අලුතින් හැදුව GET CONTENTS (Course එකට අදාල Content ගන්නවා) 🔥
exports.getContents = async (req, res) => {
    try {
        const { batchId, courseCode, courseId } = req.query;
        
        const lessonGroups = await prisma.contentGroup.findMany({
            where: { batchId: parseInt(batchId), courseCode: courseCode === 'null' ? null : courseCode },
            orderBy: { itemOrder: 'asc' }
        });

        const linkedCourses = await prisma.contentCourse.findMany({ where: { course_id: BigInt(courseId) } });
        const contentIds = linkedCourses.map(lc => lc.content_id);

        const contents = await prisma.content.findMany({
            where: { id: { in: contentIds } },
            orderBy: { createdAt: 'desc' }
        });

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json({ lessonGroups, contents: safeJson(contents) });
    } catch (e) { console.error(e); res.status(500).json({ error: "Failed to fetch contents" }); }
};

// ================= BATCHES FULL DATA =================
exports.getBatchesFull = async (req, res) => {
    try {
        // මෙතනදී Manager කෙනෙක් login වෙලා ඉන්නවනම් එයාගේ ID එක ගන්න ඕනේ (උදා: req.user.id)
        // දැනට මම ඔක්කොම යවන විදිහට තියන්නම්, ඔයා authentication හැදුවම මෙතන filter කරන්න.
        
        const batches = await prisma.batch.findMany({ 
            include: { 
                business: true, 
                groups: { 
                    include: { courses: true } 
                } 
            } 
        });

        const safeData = JSON.parse(JSON.stringify(batches, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        res.status(200).json(safeData);
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: "Server Error" }); 
    }
};

// ================= POSTS =================
exports.createAdminPost = async (req, res) => {
    try {
        const { title, description, businessId, batchId } = req.body;
        
        // Handle "all" strings correctly to null for BigInt DB fields
        const finalBizId = (businessId === 'all' || !businessId) ? null : BigInt(businessId);
        const finalBatchId = (batchId === 'all' || !batchId) ? null : BigInt(batchId);

        await prisma.post.create({ 
            data: { 
                title, 
                caption: description, 
                image: req.file ? req.file.filename : 'default.png', 
                business_id: finalBizId, 
                batch_id: finalBatchId 
            }
        });
        res.status(201).json({ message: "Post Created" });
    } catch (e) { console.error("Post Creation Error:", e); res.status(500).json({ error: "Failed to create post" }); }
};

exports.getPosts = async (req, res) => {
    try {
        const posts = await prisma.post.findMany({ orderBy: { created_at: 'desc' } });
        const safeData = JSON.parse(JSON.stringify(posts, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        res.status(200).json(safeData);
    } catch (e) { res.status(500).json({ error: "Failed to get posts" }); }
};

exports.deletePost = async (req, res) => {
    try {
        await prisma.post.delete({ where: { id: parseInt(req.body.post_id) } });
        res.status(200).json({ message: "Post Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete post" }); }
};