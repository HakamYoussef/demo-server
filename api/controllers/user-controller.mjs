import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
const secretKey = process.env.JWT_SECRET_KEY;
import { User, validateLoginUser, validateRegisterUser } from "../models/user.mjs";
import bcrypt from "bcryptjs";
import fs from 'fs';

// Controller function to handle user registration
const register = asyncHandler(async (req, res) => {
  // Validate registration data
  const { error } = validateRegisterUser(req.body);
  if (error) {
    return res.status(400).json(error.details[0].message);
  }

  // Check if the user already exists
  let user = await User.findOne({ email: req.body.email });
  if (user) {
    return res.status(400).json({ message: "this user already registered" });
  }

  // Hash the user's password
  const salt = await bcrypt.genSalt(10); 
  req.body.password = await bcrypt.hash(req.body.password, salt);

  // Create a new user
  user = new User({
    email: req.body.email,
    password: req.body.password,
  });
  const result = await user.save();
  res.status(200).json(result);
  // Optionally, generate and send a token here
  // const token = user.generateToken();
  // const { password, ...other } = result._doc;
  // res.status(201).json({ ...other, token });
});

// Controller function to handle user login
const login = asyncHandler(async (req, res) => {
  // Find the user by email
  const user = await User.findOne({ email: req.body.email });
  if (!req.body.email) {
    return res.status(400).json({ message: "Email should not be empty" });
  }
  if (!user) {
    return res.status(400).json({ message: "invalid Email" });
  }
  if (!req.body.password) {
    return res.status(400).json({ message: "Password should not be empty" });
  }

  // Check if the provided password matches the stored hashed password
  const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);
  if (!isPasswordMatch) {
    return res.status(400).json({ message: "invalid Password" });
  }

  // Generate a JWT token
  const token = jwt.sign({ _id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET_KEY);
  res.cookie("token", token, { expire: new Date(Date.now() + 100000000) });

  // Exclude the password from the user object and send the response
  const { password, ...other } = user._doc;
  return res.json({
    token: token,
    user: { ...other },
  });
});

// Controller function to retrieve a list of all users (excluding passwords)
const getUsers = asyncHandler(async (req, res) => {
  // Fetch all users and exclude the password field
  const users = await User.find().select("-password");
  res.status(200).json(users);
});

export { login, register };
