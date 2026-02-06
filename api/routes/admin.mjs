import { fetchControl, updateControl } from "../controllers/control-controller.mjs";
import { register } from "../controllers/user-controller.mjs";
import { getThreshold, updateThreshold } from "../controllers/value-controller.mjs";
import { verifyToken, isAdmin, authorization } from "../middlewares/authorization.mjs";
import express from "express";


const adminRouter = express.Router();

adminRouter.post("/register",/*verifyToken,authorization, isAdmin,*/register);
adminRouter.put("/control", verifyToken, authorization, isAdmin, updateControl);
adminRouter.get("/threshold", /*verifyToken, authorization, isAdmin,*/ getThreshold);
adminRouter.post("/threshold", /*verifyToken, authorization, isAdmin,*/ updateThreshold);
adminRouter.get("/controlData", /*verifyToken, authorization, isAdmin,*/ fetchControl);

export default adminRouter;