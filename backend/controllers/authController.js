const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// NIC Validation Logic
const isValidNIC = (nic) => {
  if (!nic) return true; // NIC optional nisa nathnam pass karanawa (required nam false karanna)
  
  // Boru numbers check kirima (e.g., 111111111V, 222222222222)
  const numbersOnly = nic.replace(/[vVxX]/g, '');
  const isAllSame = numbersOnly.split('').every(char => char === numbersOnly[0]);
  if (isAllSame) return false;

  // Pattern check (9 digits + V/X  OR  12 digits)
  const oldNicPattern = /^[0-9]{9}[vVxX]$/;
  const newNicPattern = /^[0-9]{12}$/;

  return oldNicPattern.test(nic) || newNicPattern.test(nic);
};

// ================= REGISTER LOGIC =================
exports.registerStudent = async (req, res) => {
  try {
    const { 
      firstName, lastName, phone, whatsapp, optionalPhone, 
      nic, addressHouseNo, addressStreet, city, district, 
      password, confirmPassword 
    } = req.body;

    // 1. Passwords match wenawada check kirima
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match!" });
    }

    // 2. NIC Validation eka
    if (nic && !isValidNIC(nic)) {
      return res.status(400).json({ error: "Invalid NIC format. Please enter a valid ID number." });
    }

    // 3. Phone number eka kalin use karalada check kirima
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ error: "Phone number is already registered." });
    }

    // 4. Password eka Hash kirima
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Database eke save kirima
    const newUser = await prisma.user.create({
      data: {
        firstName, lastName, phone, whatsapp, optionalPhone,
        nic, addressHouseNo, addressStreet, city, district,
        password: hashedPassword,
        role: "STUDENT" // Default register wenne student kenek widihata
      }
    });

    res.status(201).json({ message: "Student registered successfully!", userId: newUser.id });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during registration." });
  }
};

// ================= LOGIN LOGIC =================
exports.loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // 1. User wa phone number eken hoyanawa
    const user = await prisma.user.findUnique({ where: { phone } });
    
    if (!user) {
      return res.status(404).json({ error: "User not found!" });
    }

    // 2. Password eka check karanawa
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials!" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, department: user.department, businessType: user.businessType },
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName, // 🔥 FIX: Miss wecha tika damma
        phone: user.phone,
        nic: user.nic,
        addressHouseNo: user.addressHouseNo,
        addressStreet: user.addressStreet,
        city: user.city,
        district: user.district,
        image: user.image,
        role: user.role,
        department: user.department
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during login." });
  }
};