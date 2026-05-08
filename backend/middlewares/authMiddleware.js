const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: "Access Denied. No token provided." });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // 🔥 වෙනස: select: { session_id: true } දාලා session_id එක විතරක් ගන්නවා.
        const user = await prisma.user.findUnique({ 
            where: { id: verified.userId || verified.id }, // userId හරි id හරි දෙකෙන් එකක්
            select: { session_id: true } 
        });
        
        // 🔥 මේක තමයි Session Check කරන තැන!
        if (user && user.session_id && user.session_id !== verified.sessionId) {
            return res.status(401).json({ error: "Logged in from another device. Please log in again." });
        }

        req.user = verified; 
        next();
        
    } catch (error) {
        return res.status(401).json({ error: "Invalid or Expired Token." });
    }
};

module.exports = verifyToken;