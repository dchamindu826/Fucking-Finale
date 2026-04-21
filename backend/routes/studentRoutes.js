const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const multer = require('multer');
const jwt = require('jsonwebtoken'); // 🔥 FIX: JWT import karanna

const uploadImage = multer({ dest: 'storage/images/' });
const uploadDocument = multer({ dest: 'storage/documents/' });

// 🔥 FIX: Token eka kiyawana Auth Middleware eka 🔥
const verifyToken = (req, res, next) => {
    // Frontend eken evana Authorization header eken token eka gannawa
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: "Access Denied. No token provided." });
    }

    try {
        // Token eka hari da balala eke thiyena data (userId) req.user ekata danawa
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; 
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or Expired Token." });
    }
};

// 🔥 FIX: Dan hama route ekakatama 'verifyToken' eka mada danna ona 🔥
router.get('/dashboard', verifyToken, studentController.getStudentDashboard);
router.get('/available-enrollments', verifyToken, studentController.getAvailableEnrollments);
router.post('/payhere-hash', verifyToken, studentController.generatePayHereHash);
router.post('/enroll-with-slip', verifyToken, uploadDocument.single('slipImage'), studentController.enrollStudent);

router.get('/classroom', verifyToken, studentController.getStudentClassroom);
router.get('/module/:id', verifyToken, studentController.getCourseModules);
router.get('/my-payments', verifyToken, studentController.getMyPayments);

// Profile routes walatath token eka aniwaren ona!
router.post('/profile/update', verifyToken, uploadImage.single('image'), studentController.updateProfile);
router.post('/profile/password', verifyToken, studentController.updatePassword);

module.exports = router;