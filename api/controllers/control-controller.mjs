import asyncHandler from "express-async-handler";
import { Control } from "../models/Control.mjs";

/**
 * Updates a specific control field in the database.
 * Validates that the field is one of the predefined valid fields and that the value is a boolean.
 * If the field is valid, it updates the control document with the new value.
 * Handles errors related to invalid input, control not found, or database issues.
 *
 * @param {Object} req - Express request object, expects 'field' and 'value' in the request body.
 * @param {Object} res - Express response object, used to send back the status of the update operation.
 */
const updateControl = asyncHandler(async (req, res) => {
    const { field, value } = req.body;

    // List of valid fields that can be updated
    const validFields = [
        "Elv1", "Elv2", "Elv3", "Elv4", "Elv5", "Elv6",
        "F1", "F2", "F3", "F4", "F5", "F6"
    ];

    // Validate the field name
    if (!validFields.includes(field)) {
        return res.status(400).json({ message: "Invalid field name" });
    }

    // Validate that the value is a boolean
    if (typeof value !== "boolean") {
        return res.status(400).json({ message: "Invalid value; must be a boolean" });
    }

    try {
        // Find and update the control document with the new field value
        const control = await Control.findOneAndUpdate(
            {},
            { [field]: value },
            { new: true, upsert: true }  // `upsert: true` creates a new document if none exists
        );

        if (!control) {
            return res.status(404).json({ message: "Control not found" });
        }

        res.status(200).json({ message: `${field} updated successfully`, control });
    } catch (error) {
        res.status(500).json({ message: "Error updating control", error });
    }
});

/**
 * Fetches the control data from the database.
 * If control data is found, it is returned in the response; otherwise, an error is returned.
 * Handles errors related to database queries.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object, used to send back the control data or error messages.
 */
const fetchControl = asyncHandler(async (req, res) => {
    try {
        // Fetch all control data
        const controlData = await Control.find();

        if (!controlData) {
            return res.status(404).json({ message: 'No control data found' });
        }

        return res.status(200).json(controlData);
    } catch (error) {
        console.error("Error fetching control data:", error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export { updateControl, fetchControl };
