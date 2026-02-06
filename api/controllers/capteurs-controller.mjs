import { readingModel } from "../models/sample.mjs";

/**
 * Retrieves sensor data from the database based on an optional date range (startDate, endDate).
 * If no date range is provided, all data is returned.
 * Validates the date format and handles any errors that occur during the database query.
 * 
 * @param {Object} req - Express request object, expects query parameters 'startDate' and 'endDate'.
 * @param {Object} res - Express response object, used to send back the sensor data or error messages.
 */
const getDataa = async (req, res) => {
  const { startDate, endDate } = req.query;

  // Check if both startDate and endDate are provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date objects
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).send("Invalid date format.");
    }

    try {
      // Fetch data within the specified date range
      const capteurs = await readingModel.find({
        timestamp: {
          $gte: start,
          $lte: end
        }
      });
      res.json(capteurs);
    } catch (err) {
      console.error("Error fetching data:", err);
      res.status(500).send("Error fetching data");
    }
  } else {
    // If no startDate and endDate are provided, return all data
    try {
      const capteurs = await readingModel.find();
      res.json(capteurs);
    } catch (err) {
      console.error("Error fetching data:", err);
      res.status(500).send("Error fetching data");
    }
  }
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
    console.log("Fetched Latest Data:", latestData); 
    return latestData;
  } catch (err) {
    console.error("Error fetching latest data:", err);
    throw new Error("Error fetching latest data");
  }
};

export { getDataa, getLatestData, fetchLatestData };
