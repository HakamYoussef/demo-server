import mongoose, { Schema } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import Joi from "joi";
import passwordComplexity from "joi-password-complexity";



const userSchema = new Schema({
  sessionVersion: { type: Number, default: 0 },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  isAdmin : {
    type : Boolean,
    default : false
  },
});

const validateRegisterUser = (obj) => {
  const schema = Joi.object({
      email : Joi.string().trim().required().min(5).max(100).email(),
      password : passwordComplexity().max(72).custom((value, helpers) => Buffer.byteLength(value) <= 72 ? value : helpers.error("string.max", { limit: 72 })).required(),
      
  }).required();
  return schema.validate(obj);
}
const validateLoginUser = (obj) =>{
  const schema = Joi.object({
      email : Joi.string().trim().required().min(5).max(100).email(),
      password : Joi.string().min(1).max(72).custom((value, helpers) => Buffer.byteLength(value) <= 72 ? value : helpers.error("string.max", { limit: 72 })).required(),
  }).required();
  return schema.validate(obj);
}

userSchema.set("toJSON", { transform(_doc, result) { delete result.password; delete result.sessionVersion; return result; } });
userSchema.plugin(uniqueValidator);

const User = mongoose.model("User", userSchema);

export { User, validateRegisterUser, validateLoginUser };