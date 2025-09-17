import mongoose from "mongoose";

const configSchema = new mongoose.Schema(
  {
    Vbas: { type: Number, required: true },
    Vhaut: { type: Number, required: true },
    delta: { type: Number, required: true }
  },
  { collection: 'radiations', timestamps: true }
);

const ArduinoConfig = mongoose.model('radiation', configSchema);

export { ArduinoConfig };
