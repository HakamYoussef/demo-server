import mongoose from "mongoose";
import { Schema } from "mongoose";

const sensorSchema = new mongoose.Schema({
  name: String,
  etat: String,
});

const Sensor = mongoose.model("actionneurs", sensorSchema);

export { Sensor };
