import express from "express";
import { addRadiationData, getRadiationData } from "../controllers/radiation-controller.mjs";
import { verifyToken, authorization, isAdmin } from "../middlewares/authorization.mjs";

const radiationRouter = express.Router();

radiationRouter.post("/", verifyToken, authorization, isAdmin, addRadiationData);
radiationRouter.get("/", verifyToken, authorization, isAdmin, getRadiationData);

export default radiationRouter;
