import mongoose from "mongoose";
const { Schema } = mongoose;

const ValuedSchema = new mongoose.Schema({
    temperatureThreshold: {
      type: Number,
      required: true,
    },
  }, { collection: 'values' });

  const Value = mongoose.model("value", ValuedSchema);

export { Value };
