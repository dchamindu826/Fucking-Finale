const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const multer = require('multer');

const uploadImage = multer({ dest: 'storage/images/' });
const uploadDocument = multer({ dest: 'storage/documents/' });

router.get('/dashboard', studentController.getStudentDashboard);
router.get('/available-enrollments', studentController.getAvailableEnrollments);
router.post('/payhere-hash', studentController.generatePayHereHash);
router.post('/enroll-with-slip', uploadDocument.single('slipImage'), studentController.enrollStudent);

// 🔥 අලුතින් දාපු Routes ටික (404 Errors නැතිවෙන්න)
router.get('/classroom', studentController.getStudentClassroom);
router.get('/my-payments', studentController.getMyPayments);
router.post('/profile/update', uploadImage.single('image'), studentController.updateProfile);
router.post('/profile/password', studentController.updatePassword);

module.exports = router;