
import { Radiation } from "../models/Radiation.mjs";
import { ArduinoReading } from "../models/arduino-reading.mjs";

const getConfig = async (req, res) => {
  try {
    const config = await Radiation.findOne().sort({ timestamp: -1 }).lean();
    if (!config) {
      return res.json({ Vbas: 0, Vhaut: 0 });
    }
    const { Vbas = 0, Vhaut = 0 } = config;
    res.json({ Vbas, Vhaut });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving config", error });
  }
};

const parseNumericField = (value) => {
  if (value === undefined || value === null) {
    return { valid: false };
  }

  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;

  return Number.isFinite(parsed)
    ? { valid: true, value: parsed }
    : { valid: false };
};

const coerceToDate = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 1e12 ? value : value * 1000;
    const parsed = new Date(milliseconds);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      return coerceToDate(asNumber);
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const postComptage = async (req, res) => {
  try {
    const { comptage, pic, time, timestamp } = req.body;

    const comptageResult = parseNumericField(comptage);
    if (!comptageResult.valid) {
      return res.status(400).json({ message: "comptage is required and must be a number" });
    }

    const picResult = parseNumericField(pic);
    if (!picResult.valid) {
      return res.status(400).json({ message: "pic is required and must be a number" });
    }

    const readingData = {
      comptage: comptageResult.value,
      pic: picResult.value,
    };

    const providedTime = time ?? timestamp;
    const parsedTime = coerceToDate(providedTime);
    if (providedTime !== undefined && providedTime !== null && !parsedTime) {
      return res.status(400).json({ message: "time must be a valid date" });
    }

    if (parsedTime) {
      readingData.time = parsedTime;
    }

    const reading = new ArduinoReading(readingData);
    await reading.save();
    res.status(201).json(reading);
  } catch (error) {
    res.status(500).json({ message: "Error saving data", error });
  }
};


const asDate = (value) => coerceToDate(value);

const getComptage = async (req, res) => {
  try {
    const readings = await ArduinoReading.find().sort({ time: 1, _id: 1 }).lean();

    const normalized = readings
      .map((entry) => {
        const normalizedEntry = { ...entry };

        const derivedTime =
          asDate(entry.time) ??
          asDate(entry.timestamp) ??
          (entry._id && typeof entry._id.getTimestamp === "function"
            ? asDate(entry._id.getTimestamp())
            : null);

        if (derivedTime) {
          const isoTime = derivedTime.toISOString();
          normalizedEntry.time = isoTime;
          if (!asDate(entry.timestamp)) {
            normalizedEntry.timestamp = isoTime;
          }
        }

        return normalizedEntry;
      })
      .sort((a, b) => {
        const first = asDate(a.time) ?? new Date(0);
        const second = asDate(b.time) ?? new Date(0);
        return first.getTime() - second.getTime();
      });

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving data", error });
  }
};


export { getConfig, postComptage, getComptage };
