import mongoose from "mongoose";
const { Schema } = mongoose;

const radiationSchema = new Schema({
  Vbas: { type: Number, required: true },
  Vhaut: { type: Number, required: true },
  Delta: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
}, { collection: 'radiations' });

const Radiation = mongoose.model("radiation", radiationSchema);

export { Radiation };
