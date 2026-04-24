const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// 🔥 Role Format Fixer Helper 🔥
const checkIsTopLevel = (role) => {
    if (!role) return false;
    const normalized = role.toUpperCase().replace(' ', '_');
    return normalized === 'SYSTEM_ADMIN' || normalized === 'DIRECTOR';
};

// 1. Get All Businesses
exports.getBusinesses = async (req, res) => {
    try {
        const businesses = await prisma.business.findMany({ select: { id: true, name: true } });
        res.status(200).json(businesses);
    } catch (error) { res.status(500).json({ error: "Failed to fetch businesses" }); }
};

// 2. Get all staff 
exports.getStaff = async (req, res) => {
    try {
        const { role, department, businessType } = req.query; 
        
        let whereClause = {
            role: { notIn: ['STUDENT', 'USER', 'Student', 'student', 'user'] }
        };

        const isTopLevel = checkIsTopLevel(role);

        if (!isTopLevel && role) {
            if (department === 'Class Coordination') {
                whereClause.department = 'Class Coordination';
                if (businessType) whereClause.businessType = businessType; 
            } else if (department) {
                whereClause.department = department; 
            }
        }

        const staff = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, firstName: true, lastName: true, phone: true, nic: true, role: true, department: true, businessType: true }
        });
        res.status(200).json(staff);
    } catch (error) { res.status(500).json({ error: "Failed to fetch staff" }); }
};

// 3. Create new staff
exports.createStaff = async (req, res) => {
    try {
        const { firstName, lastName, phone, nic, password, role, department, businessType } = req.body;
        
        const existingUser = await prisma.user.findUnique({ where: { phone } });
        if (existingUser) return res.status(400).json({ error: "Phone number already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const isTopLevel = checkIsTopLevel(role);
        const isClassCoord = department === 'Class Coordination' || role === 'Coordinator';

        const finalDepartment = isTopLevel ? null : (role === 'Coordinator' ? 'Class Coordination' : department);
        const finalBusiness = (!isTopLevel && isClassCoord) ? businessType : null;

        const newStaff = await prisma.user.create({
            data: { firstName, lastName, phone, nic, password: hashedPassword, role, department: finalDepartment, businessType: finalBusiness }
        });

        res.status(201).json({ message: "Staff created successfully", staff: newStaff });
    } catch (error) { res.status(500).json({ error: "Failed to create staff" }); }
};

// 4. Update staff
exports.updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, phone, nic, password, role, department, businessType } = req.body;
        
        const isTopLevel = checkIsTopLevel(role);
        const isClassCoord = department === 'Class Coordination' || role === 'Coordinator';

        let updateData = { 
            firstName, lastName, phone, nic, role, 
            department: isTopLevel ? null : (role === 'Coordinator' ? 'Class Coordination' : department), 
            businessType: (!isTopLevel && isClassCoord) ? businessType : null 
        };
        
        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedStaff = await prisma.user.update({
            where: { id: parseInt(id) }, data: updateData
        });

        res.status(200).json({ message: "Staff updated", staff: updatedStaff });
    } catch (error) { res.status(500).json({ error: "Failed to update staff" }); }
};

// 5. Delete staff
exports.deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.status(200).json({ message: "Staff deleted successfully" });
    } catch (error) { res.status(500).json({ error: "Failed to delete staff" }); }
};