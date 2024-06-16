// middleware/logIP.js
const logIP = (req, res, next) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  console.log(`Incoming request from IP: ${ip}`);
  next();
};

module.exports = logIP;
