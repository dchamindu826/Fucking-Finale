const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const admin = require("firebase-admin");
const axios = require('axios');

// 🔥 පරණ Hardcoded Keys අයින් කළා. දැන් කෙලින්ම ගන්නේ .env ෆයිල් එකෙන් 🔥

const getZoomDirectMp4Link = async (meetingId) => {
    console.log(`\n================ ZOOM DEBUG START ================`);
    console.log(`[1] Requested Meeting ID: "${meetingId}"`);

    try {
        // 🔥 .env එකෙන් Keys ටික ගන්නවා 🔥
        const accountId = process.env.ZOOM_ACCOUNT_ID;
        const clientId = process.env.ZOOM_CLIENT_ID;
        const clientSecret = process.env.ZOOM_CLIENT_SECRET;

        if (!accountId || !clientId || !clientSecret) {
            console.error(`[!] ERROR: Zoom Credentials missing in .env file!`);
            return null;
        }

        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        console.log(`[2] Requesting Access Token...`);

        // 🔥 Token Request එක යවනවා 🔥
        const tokenRes = await axios.post(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, null, {
            headers: { 'Authorization': `Basic ${authHeader}` }
        });

        const accessToken = tokenRes.data.access_token;
        console.log(`[3] Access Token Received (First 10 chars): ${accessToken.substring(0, 10)}...`);
        console.log(`[4] Fetching recordings for Meeting ID: ${meetingId}...`);

        // 🔥 Meeting ID එකෙන් Recording Details ඉල්ලනවා 🔥
        const recRes = await axios.get(`https://api.zoom.us/v2/meetings/${meetingId}/recordings`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        console.log(`[5] Zoom API Response Status: ${recRes.status}`);
        console.log(`[6] Available Files Count: ${recRes.data?.recording_files?.length || 0}`);

        if (recRes.data && recRes.data.recording_files) {
            // 🔥 MP4 ෆයිල් එකක් තියෙනවද කියලා හොයනවා 🔥
            const mp4File = recRes.data.recording_files.find(file => file.file_type === 'MP4');
            
            if (mp4File) {
                console.log(`[7] MP4 File Found! Size: ${(mp4File.file_size / (1024*1024)).toFixed(2)} MB`);
                console.log(`================ ZOOM DEBUG END ================\n`);
                
                // 🔥 Download URL එකට Token එක අමුණලා යවනවා (එතකොට කෙලින්ම බාගන්න පුළුවන්) 🔥
                return `${mp4File.download_url}?access_token=${accessToken}`;
            } else {
                console.log(`[!] Error: No MP4 format found in this recording.`);
                console.log(`[!] Available types:`, recRes.data.recording_files.map(f => f.file_type));
            }
        } else {
            console.log(`[!] Error: No recording_files array in response.`);
            console.log(`[!] Raw Data:`, JSON.stringify(recRes.data, null, 2));
        }

        console.log(`================ ZOOM DEBUG END ================\n`);
        return null;

    } catch (error) {
        console.log(`\n[!!!] ZOOM API CRASHED [!!!]`);
        console.log(`[!] Request URL:`, error.config?.url);
        console.log(`[!] Status Code:`, error.response?.status);
        console.log(`[!] Zoom Error Code:`, error.response?.data?.code);
        console.log(`[!] Zoom Error Message:`, error.response?.data?.message);
        console.log(`[!] Full Raw Error Data:`, JSON.stringify(error.response?.data, null, 2));
        console.log(`================ ZOOM DEBUG END ================\n`);
        return null;
    }
};

const getTypeInt = (typeStr) => {
    switch (typeStr) {
        case 'live': return 1; case 'recording': return 2; case 'document': return 3; case 'sPaper': return 4; case 'paper': return 5;
        default: return parseInt(typeStr) || 1;
    }
};

const safeStr = (val) => Array.isArray(val) ? val[0] : (val || '');

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

exports.deleteBusiness = async (req, res) => {
    try {
        await prisma.business.delete({ where: { id: parseInt(req.body.business_id) } });
        res.status(200).json({ message: "Business Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete business. Please delete its batches first." }); }
};

exports.toggleBusinessStatus = async (req, res) => {
    try {
        const { business_id, status } = req.body;
        const updatedBiz = await prisma.business.update({
            where: { id: parseInt(business_id) },
            data: { status: parseInt(status) }
        });
        res.status(200).json(updatedBiz);
    } catch (error) { 
        res.status(500).json({ error: "Failed to update business visibility" }); 
    }
};

// ================= BATCHES & LECTURERS =================
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

exports.deleteBatch = async (req, res) => {
    try {
        await prisma.batch.delete({ where: { id: parseInt(req.body.batch_id) } });
        res.status(200).json({ message: "Batch Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete batch. Please delete its groups first." }); }
};

exports.updateBatchLecturers = async (req, res) => {
    try {
        const { batch_id, lecturers } = req.body;
        const updated = await prisma.batch.update({
            where: { id: parseInt(batch_id) },
            data: { lecturers: JSON.stringify(lecturers || []) }
        });
        res.status(200).json(updated);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to update lecturers" }); 
    }
};

exports.toggleBatchStatus = async (req, res) => {
    try {
        const { batch_id, status } = req.body;
        const updatedBatch = await prisma.batch.update({
            where: { id: parseInt(batch_id) },
            data: { status: parseInt(status) }
        });
        res.status(200).json(updatedBatch);
    } catch (error) { 
        res.status(500).json({ error: "Failed to update batch visibility" }); 
    }
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
        const name = safeStr(req.body.name);
        const code = safeStr(req.body.code);
        const stream = safeStr(req.body.stream);
        const description = safeStr(req.body.description);
        const lecturerName = safeStr(req.body.lecturerName);
        const itemOrder = safeStr(req.body.itemOrder);
        const groupPrices = safeStr(req.body.groupPrices);
        const isDiscountExcluded = safeStr(req.body.isDiscountExcluded);
        let streamsStr = safeStr(req.body.streams);

        let lecturerImage = null;
        if (req.files && req.files.length > 0) {
             const lecImageFile = req.files.find(f => f.fieldname === 'lecturerImage');
             if (lecImageFile) lecturerImage = lecImageFile.filename;
        }

        try {
            if (typeof streamsStr === 'string' && !streamsStr.startsWith('[')) streamsStr = JSON.stringify([streamsStr]);
        } catch(e) {}

        const parsedPrices = JSON.parse(groupPrices || '[]');
        const excludeDiscount = isDiscountExcluded === 'true' || isDiscountExcluded === '1';
        
        if (parsedPrices.length === 0) return res.status(400).json({ error: "Please select at least one group" });

        if (req.files && req.files.length > 0) {
            parsedPrices.forEach(gp => {
                const file = req.files.find(f => f.fieldname === `tuteCover_${gp.groupId}`);
                if (file) gp.tuteCover = file.filename;
            });
        }

        // 🔥 NEW FIX: Tute Cover එකයි Name එකයි අනිත් Groups වලටත් Share කරනවා (Monthly/Full දෙකටම)
        const commonCover = parsedPrices.find(gp => gp.tuteCover)?.tuteCover;
        const commonTuteName = parsedPrices.find(gp => gp.tuteName)?.tuteName;

        parsedPrices.forEach(gp => {
            if (!gp.tuteCover && commonCover) gp.tuteCover = commonCover;
            if (!gp.tuteName && commonTuteName) gp.tuteName = commonTuteName;
        });

        const coursePromises = parsedPrices.map(gp => {
            if (lecturerImage) gp.lecturerImage = lecturerImage;
            gp.deliverTute = gp.deliverTute === true || gp.deliverTute === 'true';

            return prisma.course.create({
                data: { 
                    name, code, stream, streams: streamsStr, description, lecturerName,
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
        const course_id = safeStr(req.body.course_id);
        const name = safeStr(req.body.name);
        const code = safeStr(req.body.code);
        const stream = safeStr(req.body.stream);
        const description = safeStr(req.body.description);
        const lecturerName = safeStr(req.body.lecturerName);
        const itemOrder = safeStr(req.body.itemOrder);
        const groupPrices = safeStr(req.body.groupPrices);
        const isDiscountExcluded = safeStr(req.body.isDiscountExcluded);
        const batch_id = safeStr(req.body.batch_id); 
        let streamsStr = safeStr(req.body.streams);

        let lecturerImage = null;
        if (req.files && req.files.length > 0) {
             const lecImageFile = req.files.find(f => f.fieldname === 'lecturerImage');
             if (lecImageFile) lecturerImage = lecImageFile.filename;
        }

        try {
            if (typeof streamsStr === 'string' && !streamsStr.startsWith('[')) streamsStr = JSON.stringify([streamsStr]);
        } catch(e) {}

        const parsedPrices = JSON.parse(groupPrices || '[]');
        const excludeDiscount = isDiscountExcluded === 'true' || isDiscountExcluded === '1';

        const originalCourse = await prisma.course.findUnique({ where: { id: parseInt(course_id) } });
        if (!originalCourse) return res.status(404).json({ error: "Course not found" });

        // Map uploaded tute covers
        if (req.files && req.files.length > 0) {
            parsedPrices.forEach(gp => {
                const file = req.files.find(f => f.fieldname === `tuteCover_${gp.groupId}`);
                if (file) gp.tuteCover = file.filename;
            });
        }

        for (let i = 0; i < parsedPrices.length; i++) {
            let gp = parsedPrices[i];
            const existingCourse = await prisma.course.findFirst({
                where: { name: originalCourse.name, groupId: parseInt(gp.groupId) }
            });
            
            const existingGpData = existingCourse ? JSON.parse(existingCourse.groupPrices || '[]').find(p => parseInt(p.groupId) === parseInt(gp.groupId)) : null;
            
            if (existingGpData) {
                if (!lecturerImage && existingGpData.lecturerImage) gp.lecturerImage = existingGpData.lecturerImage;
                if (!gp.tuteCover && existingGpData.tuteCover) gp.tuteCover = existingGpData.tuteCover;
                if (!gp.tuteName && existingGpData.tuteName) gp.tuteName = existingGpData.tuteName;
            }
            if (lecturerImage) gp.lecturerImage = lecturerImage;
            
            gp.deliverTute = gp.deliverTute === true || gp.deliverTute === 'true';
            gp._existingCourse = existingCourse;
        }

        // 🔥 NEW FIX: Update කරද්දීත් Tute Cover එකයි Name එකයි Share කරනවා
        const commonCover = parsedPrices.find(gp => gp.tuteCover)?.tuteCover;
        const commonTuteName = parsedPrices.find(gp => gp.tuteName)?.tuteName;

        parsedPrices.forEach(gp => {
            if (!gp.tuteCover && commonCover) gp.tuteCover = commonCover;
            if (!gp.tuteName && commonTuteName) gp.tuteName = commonTuteName;
        });

        const finalGroupPricesStr = JSON.stringify(parsedPrices.map(gp => {
            const { _existingCourse, ...cleanGp } = gp;
            return cleanGp;
        }));

        const updatePromises = parsedPrices.map(gp => {
            const existingCourse = gp._existingCourse;
            if (existingCourse) {
                return prisma.course.update({
                    where: { id: existingCourse.id },
                    data: { name, code, stream, streams: streamsStr, description, lecturerName, itemOrder: parseInt(itemOrder || 1), price: parseFloat(gp.price || 0), groupPrices: finalGroupPricesStr, isDiscountExcluded: excludeDiscount }
                });
            } else {
                return prisma.course.create({
                    data: { name, code, stream, streams: streamsStr, description, lecturerName, itemOrder: parseInt(itemOrder || 1), price: parseFloat(gp.price || 0), groupPrices: finalGroupPricesStr, groupId: parseInt(gp.groupId), isDiscountExcluded: excludeDiscount }
                });
            }
        });

        await Promise.all(updatePromises);

        if (batch_id) {
            const batchGroups = await prisma.group.findMany({ where: { batchId: parseInt(batch_id) }, select: { id: true } });
            const batchGroupIds = batchGroups.map(g => g.id);
            const allExistingCourses = await prisma.course.findMany({ where: { name: originalCourse.name, groupId: { in: batchGroupIds } } });
            
            const incomingGroupIds = parsedPrices.map(gp => parseInt(gp.groupId));
            const coursesToDelete = allExistingCourses.filter(c => !incomingGroupIds.includes(c.groupId));
            for (const c of coursesToDelete) await prisma.course.delete({ where: { id: c.id } });
        }

        res.status(200).json({ message: "Updated across groups" });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to update subject" }); 
    }
};

exports.deleteSubject = async (req, res) => {
    try {
        await prisma.course.delete({ where: { id: parseInt(req.body.course_id) } });
        res.status(200).json({ message: "Subject Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete subject." }); }
};

exports.assignLecturer = async (req, res) => {
    try {
        const { subjectName, lecturerName } = req.body;
        await prisma.course.updateMany({
            where: { name: subjectName },
            data: { lecturerName }
        });
        res.status(200).json({ message: "Lecturer Assigned Successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to assign lecturer" });
    }
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
        const { type, contentGroupId, title, link, zoomMeetingId, date, startTime, endTime, paperTime, questionCount, isFree, selectedCourses, batch_id, itemOrder } = req.body;
        
        let fileName = null;
        let thumbnail = null;

        if (req.files && !Array.isArray(req.files)) {
            if (req.files['file'] && req.files['file'].length > 0) fileName = req.files['file'][0].filename;
            if (req.files['thumbnail'] && req.files['thumbnail'].length > 0) thumbnail = req.files['thumbnail'][0].filename;
        } else if (req.file) {
            fileName = req.file.filename;
        }

        const sanitizedMeetingId = zoomMeetingId ? zoomMeetingId.replace(/\s+/g, '') : null;

        // 🔥 ZOOM DIRECT LINK (Create කරද්දී) 🔥
        let finalVideoLink = link;
        if (sanitizedMeetingId) {
            const directMp4 = await getZoomDirectMp4Link(sanitizedMeetingId);
            if (directMp4) {
                finalVideoLink = directMp4; 
            }
        }

        const data = {
            title, 
            contentType: type, 
            link: finalVideoLink, // Update කරපු ලින්ක් එක සේව් වෙනවා
            meetingId: sanitizedMeetingId, 
            fileName, 
            thumbnail, 
            date: date ? new Date(date) : null, 
            startTime, 
            endTime,
            paperTime: paperTime ? parseInt(paperTime) : null, 
            questionCount: questionCount ? parseInt(questionCount) : null,
            isFree: isFree === '1', 
            batchId: parseInt(batch_id), 
            courseId: 0,
            itemOrder: parseInt(itemOrder || 1)
        };

        if (contentGroupId && contentGroupId !== 'null' && contentGroupId !== 'undefined') {
            data.contentGroupId = parseInt(contentGroupId);
        }

        const newContent = await prisma.content.create({ data });

        if (selectedCourses) {
            const coursesArray = JSON.parse(selectedCourses);
            const contentCourseData = coursesArray.map(cId => ({ content_id: newContent.id, course_id: BigInt(cId), type: getTypeInt(type) }));
            if (contentCourseData.length > 0) await prisma.contentCourse.createMany({ data: contentCourseData });
        }
        res.status(201).json({ message: "Assigned Successfully", data: newContent });
    } catch (e) { 
        console.error(e); 
        res.status(500).json({ error: "Failed to add content" }); 
    }
};

exports.updateContentMassAssign = async (req, res) => {
    try {
        // 🔥 මේ DEBUG ටික අනිවාර්යයෙන්ම දාන්න 🔥
        console.log(`\n================ UPDATE CONTENT TRIGGERED ================`);
        console.log(`Frontend එකෙන් ආපු ඔක්කොම Data:`, req.body);

        const { content_id, type, contentGroupId, title, link, zoomMeetingId, date, startTime, endTime, paperTime, questionCount, isFree, itemOrder, selectedCourses } = req.body;
        
        const sanitizedMeetingId = zoomMeetingId ? zoomMeetingId.replace(/\s+/g, '') : null;
        console.log(`[DEBUG] Meeting ID එක: "${sanitizedMeetingId}"`);

        // 🔥 ZOOM DIRECT LINK 🔥
        let finalVideoLink = link;
        if (sanitizedMeetingId && sanitizedMeetingId !== 'undefined' && sanitizedMeetingId !== 'null' && sanitizedMeetingId !== '') {
            console.log(`[DEBUG] Meeting ID එකක් තියෙනවා! දැන් Zoom API එකට කතා කරනවා...`);
            const directMp4 = await getZoomDirectMp4Link(sanitizedMeetingId);
            if (directMp4) {
                finalVideoLink = directMp4; 
            }
        } else {
            console.log(`[DEBUG] Meeting ID එක හිස්! ඒක නිසා Zoom API එකට කතා කරන්නේ නෑ.`);
        }

        let updateData = { 
            title, 
            contentType: type, 
            link: finalVideoLink, 
            meetingId: sanitizedMeetingId,
            date: date ? new Date(date) : null, 
            startTime, 
            endTime, 
            paperTime: paperTime ? parseInt(paperTime) : null, 
            questionCount: questionCount ? parseInt(questionCount) : null, 
            isFree: isFree === '1',
            itemOrder: parseInt(itemOrder || 1)
        };

        if (contentGroupId && contentGroupId !== 'null' && contentGroupId !== 'undefined') {
            updateData.contentGroupId = parseInt(contentGroupId);
        } else {
            updateData.contentGroupId = null;
        }

        if (req.files && !Array.isArray(req.files)) {
            if (req.files['file'] && req.files['file'].length > 0) updateData.fileName = req.files['file'][0].filename;
            if (req.files['thumbnail'] && req.files['thumbnail'].length > 0) updateData.thumbnail = req.files['thumbnail'][0].filename;
        } else if (req.file) {
            updateData.fileName = req.file.filename;
        }

        const updated = await prisma.content.update({ where: { id: parseInt(content_id) }, data: updateData });

        if (selectedCourses) {
            const coursesArray = JSON.parse(selectedCourses);
            await prisma.contentCourse.deleteMany({ where: { content_id: parseInt(content_id) } });
            
            if (coursesArray.length > 0) {
                const contentCourseData = coursesArray.map(cId => ({ 
                    content_id: parseInt(content_id), 
                    course_id: BigInt(cId), 
                    type: getTypeInt(type) 
                }));
                await prisma.contentCourse.createMany({ data: contentCourseData });
            }
        }

        res.status(200).json(updated);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to update content" }); 
    }
};

exports.updateContentMassAssign = async (req, res) => {
    try {
        const { content_id, type, contentGroupId, title, link, zoomMeetingId, date, startTime, endTime, paperTime, questionCount, isFree, itemOrder, selectedCourses } = req.body;
        
        // 🔥 FIX: Meeting ID එකේ මැද තියෙන හිස්තැන් ඔක්කොම අයින් කිරීම 🔥
        const sanitizedMeetingId = zoomMeetingId ? zoomMeetingId.replace(/\s+/g, '') : null;

        let updateData = { 
            title, 
            contentType: type, 
            link, 
            meetingId: sanitizedMeetingId, // හිස්තැන් අයින් කරපු ID එක
            date: date ? new Date(date) : null, 
            startTime, 
            endTime, 
            paperTime: paperTime ? parseInt(paperTime) : null, 
            questionCount: questionCount ? parseInt(questionCount) : null, 
            isFree: isFree === '1',
            itemOrder: parseInt(itemOrder || 1)
        };

        if (contentGroupId && contentGroupId !== 'null' && contentGroupId !== 'undefined') {
            updateData.contentGroupId = parseInt(contentGroupId);
        } else {
            updateData.contentGroupId = null;
        }

        if (req.files && !Array.isArray(req.files)) {
            if (req.files['file'] && req.files['file'].length > 0) updateData.fileName = req.files['file'][0].filename;
            if (req.files['thumbnail'] && req.files['thumbnail'].length > 0) updateData.thumbnail = req.files['thumbnail'][0].filename;
        } else if (req.file) {
            updateData.fileName = req.file.filename;
        }

        const updated = await prisma.content.update({ where: { id: parseInt(content_id) }, data: updateData });

        if (selectedCourses) {
            const coursesArray = JSON.parse(selectedCourses);
            await prisma.contentCourse.deleteMany({ where: { content_id: parseInt(content_id) } });
            
            if (coursesArray.length > 0) {
                const contentCourseData = coursesArray.map(cId => ({ 
                    content_id: parseInt(content_id), 
                    course_id: BigInt(cId), 
                    type: getTypeInt(type) 
                }));
                await prisma.contentCourse.createMany({ data: contentCourseData });
            }
        }

        res.status(200).json(updated);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to update content" }); 
    }
};

exports.updateContentMassAssign = async (req, res) => {
    try {
        const { content_id, type, contentGroupId, title, link, zoomMeetingId, date, startTime, endTime, paperTime, questionCount, isFree, itemOrder, selectedCourses } = req.body;
        
        let updateData = { 
            title, 
            contentType: type, 
            contentGroupId: contentGroupId ? parseInt(contentGroupId) : null, 
            link, 
            meetingId: zoomMeetingId, 
            date: date ? new Date(date) : null, 
            startTime, 
            endTime, 
            paperTime: paperTime ? parseInt(paperTime) : null, 
            questionCount: questionCount ? parseInt(questionCount) : null, 
            isFree: isFree === '1',
            itemOrder: parseInt(itemOrder || 1)
        };

        // 🔥 අප්ඩේට් කරද්දී අලුත් files ඇවිත්ද බලන විදිහ
        if (req.files && !Array.isArray(req.files)) {
            if (req.files['file'] && req.files['file'].length > 0) updateData.fileName = req.files['file'][0].filename;
            if (req.files['thumbnail'] && req.files['thumbnail'].length > 0) updateData.thumbnail = req.files['thumbnail'][0].filename;
        } else if (req.file) {
            updateData.fileName = req.file.filename;
        }

        const updated = await prisma.content.update({ where: { id: parseInt(content_id) }, data: updateData });

        if (selectedCourses) {
            const coursesArray = JSON.parse(selectedCourses);
            await prisma.contentCourse.deleteMany({ where: { content_id: parseInt(content_id) } });
            
            if (coursesArray.length > 0) {
                const contentCourseData = coursesArray.map(cId => ({ 
                    content_id: parseInt(content_id), 
                    course_id: BigInt(cId), 
                    type: getTypeInt(type) 
                }));
                await prisma.contentCourse.createMany({ data: contentCourseData });
            }
        }

        res.status(200).json(updated);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to update content" }); 
    }
};

exports.deleteContent = async (req, res) => {
    try {
        const { content_id } = req.body;
        await prisma.content.delete({ where: { id: parseInt(content_id) } });
        await prisma.contentCourse.deleteMany({ where: { content_id: parseInt(content_id) } });
        res.status(200).json({ message: "Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete" }); }
};

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

        // 🔥 FIX: Content walata assign wela thiyena courses serama pre-populate wenna yawana eka
        const allContentCourses = await prisma.contentCourse.findMany({
            where: { content_id: { in: contentIds } }
        });

        const contentsWithCourses = contents.map(c => ({
            ...c,
            assignedCourses: allContentCourses.filter(cc => cc.content_id === c.id).map(cc => Number(cc.course_id))
        }));

        const safeJson = (data) => JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json({ lessonGroups, contents: safeJson(contentsWithCourses) });
    } catch (e) { console.error(e); res.status(500).json({ error: "Failed to fetch contents" }); }
};

// ================= BATCHES FULL DATA =================
exports.getBatchesFull = async (req, res) => {
    try {
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

        const finalBizId = (businessId === 'all' || !businessId || businessId === 'null') ? null : BigInt(businessId);
        const finalBatchId = (batchId === 'all' || !batchId || batchId === 'null') ? null : BigInt(batchId);
        
        const fileName = req.file ? req.file.filename : 'default.png';

        // 1. Database එකට Save කරනවා
        const newPost = await prisma.post.create({ 
            data: { 
                title, 
                caption: description, 
                image: fileName, 
                business_id: finalBizId, 
                batch_id: finalBatchId 
            }
        });

        // 2. 🔥 Firebase Cloud Messaging (Push Notification) යවන කොටස 🔥
        try {
            // Default topic එක (හැමෝටම)
            let targetTopic = 'ima_updates';

            // Batch එකක් select කරලා නම් (හිස් string ආවොත් block කරන්න '')
            if (batchId && batchId !== 'all' && batchId !== 'null' && batchId !== 'undefined' && batchId !== '') {
                targetTopic = `batch_${batchId}`; 
            } 
            // Batch එක All වෙලා, Business එකක් select කරලා නම්
            else if (businessId && businessId !== 'all' && businessId !== 'null' && businessId !== 'undefined' && businessId !== '') {
                targetTopic = `business_${businessId}`;
            }

            // Image URL එක හදාගන්නවා
            const imageUrl = fileName !== 'default.png' ? `https://imacampus.online/storage/posts/${fileName}` : null;

            const message = {
                notification: {
                    title: title,
                    body: description
                },
                data: {
                    image_url: imageUrl || '', // මේක App එක ඇතුලෙදි පාවිච්චි කරන්න
                },
                topic: targetTopic 
            };

            // 🔥 FIX: ෆෝන් එකේ උඩින් පේන Notification එකට Image එක දාන කොටස
            if (imageUrl) {
                message.notification.imageUrl = imageUrl; // General
                
                // Android වල ලොකුවට ෆොටෝ එක පේන්න
                message.android = {
                    notification: {
                        imageUrl: imageUrl
                    }
                };
                
                // iOS (Apple) වල ෆොටෝ එක පේන්න
                message.apns = {
                    payload: {
                        aps: {
                            'mutable-content': 1
                        }
                    },
                    fcm_options: {
                        image: imageUrl
                    }
                };
            }

            // 👉 දැන් ඇත්තටම ළමයින්ගේ ෆෝන් වලට Notification එක යවනවා
            await admin.messaging().send(message);
            console.log(`🚀 Push notification sent successfully to topic: ${targetTopic}`);

        } catch (fcmError) {
            console.error("Push notification send error:", fcmError);
        }

        res.status(201).json({ message: "Post Created & Notification Sent Successfully" });
    } catch (e) { 
        console.error("Post Creation Error:", e); 
        res.status(500).json({ error: "Failed to create post" }); 
    }
};

exports.getPosts = async (req, res) => {
    try {
        // ෆ්‍රන්ට්එන්ඩ් එකෙන් එවන businessId එක ගන්නවා
        const { businessId } = req.query;
        
        let whereClause = {};
        
        // Business ID එකක් එවලා තියෙනවා නම්, ඒකට අදාල පෝස්ට් විතරක් ගන්නවා
        if (businessId && businessId !== 'all' && businessId !== 'null') {
            whereClause = {
                OR: [
                    { business_id: BigInt(businessId) }, // ඒ අදාල Business එකේ පෝස්ට්
                    { business_id: null } // 'All' කියලා දාපු පොදු පෝස්ට්
                ]
            };
        }

        const posts = await prisma.post.findMany({ 
            where: whereClause,
            orderBy: { created_at: 'desc' } 
        });
        
        const safeData = JSON.parse(JSON.stringify(posts, (key, value) => typeof value === 'bigint' ? value.toString() : value));
        res.status(200).json(safeData);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Failed to get posts" }); 
    }
};

exports.deletePost = async (req, res) => {
    try {
        await prisma.post.delete({ where: { id: parseInt(req.body.post_id) } });
        res.status(200).json({ message: "Post Deleted" });
    } catch (e) { res.status(500).json({ error: "Failed to delete post" }); }
};

// ================= ZOOM DYNAMIC DOWNLOAD =================
exports.getZoomDownloadRedirect = async (req, res) => {
    try {
        const { meetingId } = req.params;
        if (!meetingId) return res.status(400).send("Meeting ID is required");

        console.log(`[DOWNLOAD] Fetching fresh Zoom link for Meeting ID: ${meetingId}`);
        
        // ඔයා කලින් හදලා තියෙන Function එක කෝල් කරනවා
        const directMp4 = await getZoomDirectMp4Link(meetingId);
        
        if (directMp4) {
            // මේක තමයි මැජික් එක! App එක අලුත් ලින්ක් එකට Redirect කරනවා.
            return res.redirect(directMp4); 
        } else {
            return res.status(404).send("Zoom recording not found or expired.");
        }
    } catch (error) {
        console.error("Zoom Redirect Error:", error);
        res.status(500).send("Server Error");
    }
};