const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const admin = require("firebase-admin"); // 🔥 Firebase Admin Import

dotenv.config();
const app = express();

// ================= FIREBASE INITIALIZATION =================
// Firebase Console eken gaththa Service Account JSON file eka
// backend folder eke 'serviceAccountKey.json' kiyala save karala thiyenna ona.
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// ================= MIDDLEWARES =================
app.use(cors()); 
app.use(express.json()); 

const coordinatorCrmRoutes = require('./routes/coordinatorCrmRoutes');
const afterSeminarCrmRoutes = require('./routes/afterSeminarCrmRoutes');
const teamRoutes = require('./routes/teamRoutes');

// ================= STATIC FOLDERS =================
// Kalin thibuna routes (meka mehema thiyenna arinna wena ewata one wenna puluwan)
app.use('/documents', express.static(path.join(__dirname, 'storage/documents')));
app.use('/storage/icons', express.static(path.join(__dirname, 'storage/icons'))); 
app.use('/storage/posts', express.static(path.join(__dirname, 'storage/posts'))); 
app.use('/storage/images', express.static(path.join(__dirname, 'storage/images')));
app.use('/images', express.static(path.join(__dirname, 'storage/images')));
app.use('/storage/documents', express.static(path.join(__dirname, 'storage/documents')));

// 🔥 FIX: Mobile app & Web preview ekata /api/ url eken document ganna me routes tika add kala 🔥
app.use('/api/storage/documents', express.static(path.join(__dirname, 'storage/documents')));
app.use('/api/storage/icons', express.static(path.join(__dirname, 'storage/icons')));
app.use('/api/storage/posts', express.static(path.join(__dirname, 'storage/posts')));
app.use('/api/storage/images', express.static(path.join(__dirname, 'storage/images')));


// ================= MODULAR ROUTES =================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api', require('./routes/contentRoutes')); 
app.use('/api/admin/staff', require('./routes/staffRoutes'));
app.use('/api', require('./routes/businessRoutes')); 
app.use('/api/public', require('./routes/publicRoutes')); 
app.use('/api/admin', require('./routes/adminRoutes')); 
app.use('/api/admin/payments', require('./routes/paymentRoutes'));
app.use('/api/admin/crm', require('./routes/crmRoutes'));

app.use('/api/coordinator-crm', coordinatorCrmRoutes);
app.use('/api/after-seminar-crm', afterSeminarCrmRoutes);
app.use('/api/team', teamRoutes);

// 🔥🔥🔥 MOBILE APP ROUTES 🔥🔥🔥
app.use('/api/mobile', require('./routes/mobile/mobileRoutes')); 


// ================= SERVER START =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend Server is running cleanly on port ${PORT}`);
});