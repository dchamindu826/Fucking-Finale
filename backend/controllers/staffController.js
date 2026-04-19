const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// Get all staff
exports.getStaff = async (req, res) => {
    try {
        const staff = await prisma.user.findMany({
            where: {
                role: { notIn: ['STUDENT', 'USER'] } // Student ලා නෙවෙයි
            },
            select: { id: true, firstName: true, lastName: true, phone: true, nic: true, role: true, department: true }
        });
        res.status(200).json(staff);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch staff" });
    }
};

// Create new staff
exports.createStaff = async (req, res) => {
    try {
        const { firstName, lastName, phone, nic, password, role, department } = req.body;
        
        // Check if exists
        const existingUser = await prisma.user.findUnique({ where: { phone } });
        if (existingUser) return res.status(400).json({ error: "Phone number already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Admin / Director ට Department එක NULL කරනවා
        const finalDepartment = (role === 'System Admin' || role === 'Director') ? null : department;

        const newStaff = await prisma.user.create({
            data: { firstName, lastName, phone, nic, password: hashedPassword, role, department: finalDepartment }
        });

        res.status(201).json({ message: "Staff created successfully", staff: newStaff });
    } catch (error) {
        res.status(500).json({ error: "Failed to create staff" });
    }
};