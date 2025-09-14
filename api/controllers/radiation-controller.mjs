import asyncHandler from "express-async-handler";
import { Radiation } from "../models/Radiation.mjs";

/**
 * Stores radiation values in the database.
 * @param {Object} req - Express request object expecting Vbas, Vhaut and Delta in body.
 * @param {Object} res - Express response object.
 */
const addRadiationData = asyncHandler(async (req, res) => {
  const { Vbas, Vhaut, Delta } = req.body;
  const radiation = new Radiation({ Vbas, Vhaut, Delta });
  await radiation.save();
  res.status(201).json(radiation);
});

/**
 * Retrieves all radiation data sorted by timestamp.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const getRadiationData = asyncHandler(async (req, res) => {
  const data = await Radiation.find().sort({ timestamp: 1 });
  res.status(200).json(data);
});

export { addRadiationData, getRadiationData };
