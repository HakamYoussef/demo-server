import mongoose from "mongoose";

const configSchema = new mongoose.Schema(
  {
    Vbas: { type: Number, required: true },
    Vhaut: { type: Number, required: true },
    delta: { type: Number, required: true }
  },
  { collection: 'arduino_configs', timestamps: true }
);

const ArduinoConfig = mongoose.model('arduino_config', configSchema);

export { ArduinoConfig };
