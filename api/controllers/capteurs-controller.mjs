import { pagination } from "../lib/pagination.mjs";
import { readingModel } from "../models/sample.mjs";

/**
 * Retrieves sensor data from the database based on an optional date range (startDate, endDate).
 * If no date range is provided, all data is returned.
 * Validates the date format and handles any errors that occur during the database query.
 * 
 * @param {Object} req - Express request object, expects query parameters 'startDate' and 'endDate'.
 * @param {Object} res - Express response object, used to send back the sensor data or error messages.
 */
const getDataa = async (req, res, next) => {
  try {
    const { limit, skip } = pagination(req.query);
    const { startDate, endDate } = req.query;
    const filter = {};
    if (startDate !== undefined || endDate !== undefined) {
      const start = new Date(startDate), end = new Date(endDate);
      if (typeof startDate !== "string" || typeof endDate !== "string" || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end || end - start > 31 * 86400000) {
        return res.status(400).json({ message: "Provide an ordered date range of at most 31 days" });
      }
      filter.timestamp = { $gte: start, $lte: end };
    }
    res.json(await readingModel.find(filter).sort({ timestamp: -1, _id: -1 }).skip(skip).limit(limit).lean());
  } catch (err) { next(err); }
};

/**
 * Retrieves the latest sensor data entry from the database.
 * Handles any errors that occur during the database query.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object, used to send back the latest sensor data or error messages.
 */
const getLatestData = async (req, res) => {
  try {
    // Fetch the latest data entry by sorting in descending order of the timestamp
    const latestData = await readingModel.findOne().sort({ timestamp: -1 }).exec();
    res.json(latestData);
  } catch (err) {
    console.error("Error fetching latest data:", err);
    res.status(500).send("Error fetching latest data");
  }
};

/**
 * Fetches the latest sensor data entry from the database for use in other parts of the application.
 * Handles any errors that occur during the database query.
 * 
 * @returns {Object} latestData - The most recent sensor data entry from the database.
 * @throws Will throw an error if the data fetching fails.
 */
const fetchLatestData = async () => {
  try {
    // Fetch the latest data entry by sorting in descending order of the timestamp
    const latestData = await readingModel.findOne().sort({ timestamp: -1 }).exec();

    return latestData;
  } catch (err) {
    console.error("Error fetching latest data:", err);
    throw new Error("Error fetching latest data");
  }
};

export { getDataa, getLatestData, fetchLatestData };
