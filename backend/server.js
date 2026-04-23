const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();

// ================= MIDDLEWARES =================
app.use(cors()); 
app.use(express.json()); 

const coordinatorCrmRoutes = require('./routes/coordinatorCrmRoutes');

// Static Folders
app.use('/documents', express.static(path.join(__dirname, 'storage/documents')));
app.use('/storage/icons', express.static(path.join(__dirname, 'storage/icons'))); 
app.use('/storage/posts', express.static(path.join(__dirname, 'storage/posts'))); 
app.use('/storage/images', express.static(path.join(__dirname, 'storage/images')));
app.use('/images', express.static(path.join(__dirname, 'storage/images')));
app.use('/storage/documents', express.static(path.join(__dirname, 'storage/documents')));

// ================= MODULAR ROUTES =================
// අපි හදපු Routes ටික මෙතනින් ලින්ක් කරනවා. Frontend එකේ URLs පොඩ්ඩක්වත් වෙනස් වෙන්නේ නෑ.

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api', require('./routes/contentRoutes')); // Content hub එකේ routes
app.use('/api/admin/staff', require('./routes/staffRoutes'));
app.use('/api', require('./routes/businessRoutes')); // Business routes (admin & course-setup)
app.use('/api/public', require('./routes/publicRoutes')); // Landing page data
app.use('/api/admin', require('./routes/adminRoutes')); // Overviews
app.use('/api/admin/payments', require('./routes/paymentRoutes'));
app.use('/api/admin/crm', require('./routes/crmRoutes'));

app.use('/api/coordinator-crm', coordinatorCrmRoutes);

// ================= SERVER START =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend Server is running cleanly on port ${PORT}`);
});