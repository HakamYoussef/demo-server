import mongoose from "mongoose";

const readingSchema = new mongoose.Schema(
  {
    comptage: { type: Number, required: true },
    pic: { type: Number, required: true },
    time: { type: Date, default: Date.now }
  },
  { collection: 'arduino_readings' }
);

readingSchema.index({ time: -1, _id: -1 });

const ArduinoReading = mongoose.model('arduino_reading', readingSchema);

export { ArduinoReading };
