const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcrypt'); // Puluwannam bcryptjs use karanna

// NIC Validation Logic
const isValidNIC = (nic) => {
  if (!nic) return true; 
  const numbersOnly = nic.replace(/[vVxX]/g, '');
  const isAllSame = numbersOnly.split('').every(char => char === numbersOnly[0]);
  if (isAllSame) return false;
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

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match!" });
    }

    if (nic && !isValidNIC(nic)) {
      return res.status(400).json({ error: "Invalid NIC format. Please enter a valid ID number." });
    }

    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ error: "Phone number is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        firstName, lastName, phone, whatsapp, optionalPhone,
        nic, addressHouseNo, addressStreet, city, district,
        password: hashedPassword,
        role: "STUDENT" 
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

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ error: "User not found!" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: "Invalid credentials!" });

    // 🔥 Generate Session ID and update DB
    const sessionId = crypto.randomBytes(16).toString('hex');
    await prisma.user.update({
        where: { id: user.id },
        data: { session_id: sessionId }
    });

    // 🔥 Include Session ID in the token
    const token = jwt.sign(
      { 
          userId: user.id, 
          role: user.role, 
          department: user.department, 
          businessType: user.businessType,
          sessionId: sessionId 
      },
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName, 
        phone: user.phone,
        nic: user.nic,
        addressHouseNo: user.addressHouseNo,
        addressStreet: user.addressStreet,
        city: user.city,
        district: user.district,
        image: user.image,
        role: user.role,
        department: user.department,
        // 🔥 මේ පේළිය අලුතින් add කරන්න 🔥
        businessType: user.businessType
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during login." });
  }
};

// authController.js
exports.ghostLogin = async (req, res) => {
  try {
    console.log("=== GHOST LOGIN INITIATED ===");
    console.log("Raw ID from params:", req.params.id);

    // අනිවාර්යයෙන්ම parseInt කරන්න ඕනේ
    const staffId = parseInt(req.params.id, 10);
    console.log("Parsed ID:", staffId);

    // ID එක ඉලක්කමක් නෙවෙයි නම් (NaN) එතනින්ම නවත්තනවා
    if (isNaN(staffId)) {
        console.log("Error: Invalid ID format");
        return res.status(400).json({ error: "Invalid ID format" });
    }

    const user = await prisma.user.findUnique({ where: { id: staffId } });
    console.log("Found User in DB:", user ? user.firstName : "User Not Found!");

    if (!user) return res.status(404).json({ error: "User not found!" });

    const sessionId = crypto.randomBytes(16).toString('hex');
    await prisma.user.update({
        where: { id: user.id },
        data: { session_id: sessionId }
    });

    console.log("Session updated successfully, generating token...");

    const token = jwt.sign(
      { 
          userId: user.id, 
          role: user.role, 
          department: user.department, 
          businessType: user.businessType,
          sessionId: sessionId 
      },
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    console.log("Ghost login completely successful, sending response to frontend.");

    res.status(200).json({
      message: "Ghost login successful",
      token,
      user
    });

  } catch (error) {
    console.error("=== GHOST LOGIN ERROR ===");
    console.error(error);
    res.status(500).json({ error: "Server error during ghost login." });
  }
};