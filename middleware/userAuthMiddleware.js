const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_ADMIN_SECRET_KEY;

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  console.log(token);

  const extractedToken = token?.split(" ")[1];
  console.log("Welcome to auth Middleware", extractedToken);

  if (!token) {
    console.log("no token");
    return res.status(401).json({ msg: "Unauthorized - Missing token" });
  }

  try {
    const decoded = jwt.verify(extractedToken, SECRET_KEY);
    console.log("Decoded token==>", decoded);
    req.decoded = decoded;
    const { userToken, role } = req.decoded;
    // console.log("userToken, role ", userToken, role);
    if (role === "user" || role === "PG" || role === "Render") {
      next();
    } else {
      return res.status(401).json({ msg: "Unauthorized - Missing token" });
    }
  } catch (err) {
    // console.log("Error==>", err);
    // res.send("Unothorozed");
    return res.status(401).json({ msg: "Unauthorized - Invalid token" });
  }
};

module.exports = authMiddleware;
