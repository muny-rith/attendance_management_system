require('dotenv').config();
const API_KEY = process.env.API_KEY || "moon_attendance_secret_2026";

const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
};

module.exports = authMiddleware;
