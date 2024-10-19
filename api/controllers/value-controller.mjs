import { Value } from "../models/Value.mjs";

/**
 * Retrieves the current threshold value from the database.
 * If the threshold value is not found, it returns a 404 error.
 * Handles any server errors during the database query.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object, used to send back the threshold value or error messages.
 */
const getThreshold = async (req, res) => {
    try {
      // Fetch the threshold value from the database
      const threshold = await Value.findOne(); 
      if (!threshold) {
        return res.status(404).json({ message: "Threshold not found" });
      }
      res.status(200).json(threshold);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
};

/**
 * Updates the temperature threshold value in the database.
 * If the threshold value exists, it updates it; otherwise, it creates a new threshold value.
 * Handles any server errors during the database query or save operation.
 *
 * @param {Object} req - Express request object, expects 'temperatureThreshold' in the request body.
 * @param {Object} res - Express response object, used to send back the updated or newly created threshold value or error messages.
 */
const updateThreshold = async (req, res) => {
    const { temperatureThreshold } = req.body;
  
    try {
      // Find the existing threshold value
      let threshold = await Value.findOne();
      if (threshold) {
        // Update the existing threshold value
        threshold.temperatureThreshold = temperatureThreshold;
      } else {
        // Create a new threshold value if it doesn't exist
        threshold = new Value({ temperatureThreshold });
      }
  
      // Save the updated or new threshold value
      await threshold.save();
      res.status(200).json(threshold);
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
};

export { getThreshold, updateThreshold };
