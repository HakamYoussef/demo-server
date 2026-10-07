import { fetchControl, updateControl } from "../controllers/control-controller.mjs";
import { register } from "../controllers/user-controller.mjs";
import { getThreshold, updateThreshold } from "../controllers/value-controller.mjs";
import { verifyToken, isAdmin } from "../middlewares/authorization.mjs";
import express from "express";


const adminRouter = express.Router();

adminRouter.post("/register",verifyToken, isAdmin, register);
adminRouter.put("/control", verifyToken, isAdmin, updateControl);
adminRouter.get("/threshold", verifyToken, getThreshold);
adminRouter.post("/threshold", verifyToken, isAdmin, updateThreshold);
adminRouter.get("/controlData", verifyToken, fetchControl);

export default adminRouter;