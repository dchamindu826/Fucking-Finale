const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client'); // 🔥 Database eka ona session check karanna
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // 🔥 අලුතෙන් එකතු කළා ෆෝල්ඩර් එක චෙක් කරන්න

const mobileStudentController = require('../../controllers/mobile/mobileStudentController');

// 🔥 FIX: Multer Configuration for Profile Images
// දැන් හරියටම backend/storage/images ෆෝල්ඩර් එකට යයි
const uploadDir = path.join(__dirname, '../../storage/images');

// ෆෝල්ඩර් එක නැත්නම් Auto හදන්න (Error එන එක නවත්වන්න)
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir) 
    },
    filename: function (req, file, cb) {
        cb(null, 'profile_' + Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });


// 🔥 FIX: Token Verification Middleware with Session Check
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: "Access Denied. No token provided." });
    }

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

// 🔓 Public Routes
router.get('/businesses', mobileStudentController.getMobileBusinesses);
router.get('/installments/:batchId', mobileStudentController.getMobileInstallments);

// 🔒 Protected Routes (Requires Token)
router.get('/my-payments', verifyToken, mobileStudentController.getMobilePayments);
router.get('/classroom', verifyToken, mobileStudentController.getMobileClassroom);
router.get('/module/:id', verifyToken, mobileStudentController.getCourseModules);
router.get('/classroom/lives', verifyToken, mobileStudentController.getMobileUpcomingLives);
router.post('/profile/password', verifyToken, mobileStudentController.updateMobilePassword);

// 🔥 NEW: Profile Update Route (Image Upload එකත් එක්ක)
router.post('/profile/update', verifyToken, upload.single('image'), mobileStudentController.updateMobileProfile);

router.get('/yt-redirect', mobileStudentController.ytRedirect);

module.exports = router;