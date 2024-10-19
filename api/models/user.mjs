import mongoose, { Schema } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import Joi from "joi";
import passwordComplexity from "joi-password-complexity";
import fs from 'fs';


const userSchema = new Schema({
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
      password : passwordComplexity().required(),
      
  });
  return schema.validate(obj);
}
const validateLoginUser = (obj) =>{
  const schema = Joi.object({
      email : Joi.string().trim().required().min(5).max(100).email(),
      password : passwordComplexity().required(),
  });
  return schema.validate(obj);
}

userSchema.plugin(uniqueValidator);

const User = mongoose.model("User", userSchema);

export { User, validateRegisterUser, validateLoginUser };