import mongoose from "mongoose";

const readingSchema = new mongoose.Schema(
  {
    comptage: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { collection: 'arduino_readings' }
);

const ArduinoReading = mongoose.model('arduino_reading', readingSchema);

export { ArduinoReading };
