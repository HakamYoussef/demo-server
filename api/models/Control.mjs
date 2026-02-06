
import mongoose, { Schema } from "mongoose";

const controlSchema = new Schema({
    Elv1: { type: Boolean, unique: true },
    Elv2: { type: Boolean, unique: true },
    Elv3: { type: Boolean, unique: true },
    Elv4: { type: Boolean, unique: true },
    Elv5: { type: Boolean, unique: true },
    Elv6: { type: Boolean, unique: true },
    F1: { type: Boolean, unique: true },
    F2: { type: Boolean, unique: true },
    F3: { type: Boolean, unique: true },
    F4: { type: Boolean, unique: true },
    F5: { type: Boolean, unique: true },
    F6: { type: Boolean, unique: true },
  });
  const Control = mongoose.model("control", controlSchema);

export { Control };