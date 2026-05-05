const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const verifyToken = async (req, res, next) => {
    // 1. Request Header එකෙන් Token එක ගන්නවා
    const token = req.headers.authorization?.split(' ')[1];
    
    // Token එකක් නැත්නම් කෙලින්ම එළියට දානවා
    if (!token) {
        return res.status(401).json({ error: "Access Denied. No token provided." });
    }

    try {
        // 2. Token එක Verify කරනවා (ඔයාගේ .env එකේ තියෙන රහස් පදය පාවිච්චි කරලා)
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Token එකේ තියෙන User ID එකෙන් DB එකෙන් ළමයාව හොයනවා
        // (ඔයා login එකේදී userId කියලා තමයි token එකට දාලා තියෙන්නේ)
        const user = await prisma.user.findUnique({ 
            where: { id: verified.userId } 
        });
        
        // 🔥 4. මේක තමයි Session Check කරන තැන!
        // DB එකේ තියෙන session_id එකයි, Token එකේ තියෙන sessionId එකයි අසමාන නම් 401 දෙනවා.
        if (user && user.session_id && user.session_id !== verified.sessionId) {
            return res.status(401).json({ error: "Logged in from another device. Please log in again." });
        }

        // 5. ඔක්කොම හරි නම්, Request එකට User Data ටික දාලා ඊළඟ function එකට යවනවා (next)
        req.user = verified; 
        next();
        
    } catch (error) {
        // Token එක Expire වෙලා හෝ වැරදි නම් මේක වැඩ කරනවා
        return res.status(401).json({ error: "Invalid or Expired Token." });
    }
};

module.exports = verifyToken;