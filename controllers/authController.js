const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    //Check that name, email, and password are strings
    if (
      typeof name != "string" ||
      typeof email != "string" ||
      typeof password != "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter inputs in strings",
      });
    }

    //Clean and normalize inputs
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid details",
      });
    }

    //Validate the email formate using regex
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email formate",
      });
    }

    //Password validation
    if (password.length < 6 || !password.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters long and connot be empty",
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const createUser = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
    });
    if (createUser) {
      return res.status(201).json({
        success: true,
        message: "User create successfully",
        data: {
          id: createUser.id,
          name: createUser.name,
          email: createUser.email,
          role: createUser.role,
        },
      });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }
    next(error);
  }
};

//login User
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and Password must be string",
      });
    }

    //Check neither value is empty of whitespace-only
    if (!email.trim() || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email and password cannot be empty",
      });
    }

    const normalizeEmail = email.trim().toLowerCase();

    //Find user
    const activeUser = await User.findOne({ email: normalizeEmail });

    if (!activeUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, activeUser.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const payload = {
      id: activeUser._id,
      role: activeUser.role,
    };

    const secret = process.env.JWT_SECRET;
    const options = {
      expiresIn: "1d",
    };

    const token = jwt.sign(payload, secret, options);
    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      data: {
        id: activeUser._id,
        name: activeUser.name,
        email: activeUser.email,
        role: activeUser.role,
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
};
