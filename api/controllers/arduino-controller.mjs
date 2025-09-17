
import { Radiation } from "../models/Radiation.mjs";
import { ArduinoReading } from "../models/arduino-reading.mjs";

const getConfig = async (req, res) => {
  try {
    const config = await Radiation.findOne().sort({ createdAt: -1 }).lean();
    if (!config) {
      return res.json({ Vbas: 0, Vhaut: 0, delta: 0 });
    }
    res.json({ Vbas: config.Vbas, Vhaut: config.Vhaut, delta: config.delta });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving config", error });
  }
};

const postComptage = async (req, res) => {
  try {
    const { comptage } = req.body;
    if (comptage === undefined) {
      return res.status(400).json({ message: "comptage is required" });
    }
    const reading = new ArduinoReading({ comptage });
    await reading.save();
    res.status(201).json(reading);
  } catch (error) {
    res.status(500).json({ message: "Error saving data", error });
  }
};


const getComptage = async (req, res) => {
  try {
    const readings = await ArduinoReading.find().sort({ timestamp: 1 });
    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving data", error });
  }
};


export { getConfig, postComptage, getComptage };
