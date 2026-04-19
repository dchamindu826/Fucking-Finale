const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const controller = require('../controllers/contentController'); 

// Upload Configs
const iconStorage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'storage/icons/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '_' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)); }
});
const uploadIcon = multer({ storage: iconStorage });

const docStorage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'storage/documents/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '_' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)); }
});
const uploadDoc = multer({ storage: docStorage });

const postStorage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'storage/posts/'); },
    filename: (req, file, cb) => { cb(null, 'post_' + Date.now() + '_' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)); }
});
const uploadPost = multer({ storage: postStorage });

// ================= ROUTES =================

// Content Hub
router.post('/admin/manager/content-group/add', controller.addContentGroup);
router.delete('/admin/content-group/delete', controller.deleteContentGroup); // 🔥 ADDED FOLDER DELETE ROUTE
router.post('/admin/manager/contents/mass-assign', uploadDoc.single('file'), controller.addContentMassAssign);
router.put('/admin/manager/contents/update', uploadDoc.single('file'), controller.updateContentMassAssign);
router.delete('/admin/content/delete', controller.deleteContent);
router.get('/admin/manager/get-contents', controller.getContents); 

// Groups
router.post('/course-setup/group', controller.createGroup);
router.put('/course-setup/group/update', controller.updateGroup);

// Posts 
router.post('/admin/manager/post/create', uploadPost.single('image'), controller.createAdminPost);
router.get('/admin/manager/posts', controller.getPosts);
router.delete('/admin/manager/post/delete', controller.deletePost);

// Batches Data Load
router.get('/admin/manager/batches-full', controller.getBatchesFull);

// Get Batches by Business ID
router.get('/admin/batches/:bizId', async (req, res) => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const batches = await prisma.batch.findMany({
            where: { businessId: parseInt(req.params.bizId) },
            include: { groups: { include: { courses: true } } }
        });
        const safeData = JSON.parse(JSON.stringify(batches, (k, v) => typeof v === 'bigint' ? v.toString() : v));
        res.status(200).json({ batches: safeData });
    } catch (error) { res.status(500).json({ error: "Failed to fetch batches" }); }
});

// Businesses Setup
router.post('/course-setup/business', uploadIcon.single('logo'), controller.createBusiness);
router.put('/admin/business/update', uploadIcon.single('logo'), controller.updateBusiness);

// Batches Setup
router.post('/course-setup/batch', uploadIcon.single('logo'), controller.createBatch);
router.put('/admin/batch/update', uploadIcon.single('logo'), controller.updateBatch);

// Subjects Setup
router.post('/course-setup/subject', controller.createSubject);
router.put('/admin/course/update', controller.updateSubject);

// Installments Setup
router.post('/course-setup/installment', controller.createInstallment);
router.get('/course-setup/installment/:batchId', controller.getInstallments);
router.delete('/course-setup/installment', controller.deleteInstallment);

module.exports = router;