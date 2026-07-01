require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkLogs() {
  try {
    const res = await pool.query('SELECT * FROM attendance_logs ORDER BY timestamp DESC LIMIT 5');
    console.log("Recent attendance logs:");
    console.table(res.rows);
  } catch (err) {
    console.error(err.message);
  } finally {
    process.exit();
  }
}

checkLogs();
