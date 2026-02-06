import { expressjwt as jwt } from "express-jwt";
import dotenv from "dotenv";

dotenv.config();


const verifyToken = jwt({
  secret: process.env.JWT_SECRET_KEY,
  algorithms: ["HS256"],
  userProperty: "auth",
});


const authorization = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Invalid or missing token' });
  }
  next(err);
  if (req.params.id === req.auth._id || req.auth.isAdmin) {
    next();
  } else {
    return res.status(403).json({
      message: "You are not allowed, change only your own information",
    }); // forbidden
  }
};

const isAdmin = (req, res, next) => {
  if (req.auth.isAdmin) {
    next();
  } else {
    return res
      .status(403)
      .json({ message: "You are not allowed, only Admin allowed" });
  }
};

export { verifyToken, authorization, isAdmin };
