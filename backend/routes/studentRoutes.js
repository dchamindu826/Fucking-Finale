const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const path = require('path');
const { PrismaClient } = require('@prisma/client'); // 🔥 NEW
const prisma = new PrismaClient(); // 🔥 NEW

const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'storage/images/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '_' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)); }
});
const uploadImage = multer({ storage: imageStorage });

const documentStorage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'storage/documents/'); },
    filename: (req, file, cb) => { cb(null, Date.now() + '_' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)); }
});
const uploadDocument = multer({ storage: documentStorage });

// 🔥 FIX: Verify Token Ekata Multiple Device Block eka damma
const verifyToken = async (req, res, next) => { // async kara
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access Denied. No token provided." });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if the session ID in the token matches the one in the DB
        const user = await prisma.user.findUnique({ where: { id: verified.userId || verified.id } });
        
        if (user && user.session_id && user.session_id !== verified.sessionId) {
            return res.status(401).json({ error: "Logged in from another device. Please log in again." });
        }

        req.user = verified; 
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or Expired Token." });
    }
};

router.get('/dashboard', verifyToken, studentController.getStudentDashboard);
router.get('/available-enrollments', verifyToken, studentController.getAvailableEnrollments);
router.get('/my-enrolled-subjects', verifyToken, studentController.getMyEnrolledSubjects); // 🔥 අලුත් Route එක

router.post('/payhere-hash', verifyToken, studentController.generatePayHereHash);

// 🔥 FIX: Slips 4ක් වෙනකම් Upload කරන්න පුළුවන් වෙන්න array(4) දැම්මා
router.post('/enroll-with-slip', verifyToken, uploadDocument.array('slipImages', 4), studentController.enrollStudent);
router.post('/upload-due-slip', verifyToken, uploadDocument.array('slipImages', 4), studentController.uploadDueSlip);

router.get('/classroom', verifyToken, studentController.getStudentClassroom);
router.get('/module/:id', verifyToken, studentController.getCourseModules);
router.get('/my-payments', verifyToken, studentController.getMyPayments);

router.post('/profile/update', verifyToken, uploadImage.single('image'), studentController.updateProfile);
router.post('/profile/password', verifyToken, studentController.updatePassword);

//payhere
router.post('/payhere-notify', studentController.payhereNotify);

module.exports = router;