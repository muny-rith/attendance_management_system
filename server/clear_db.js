require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function clearDB() {
  try {
    await pool.query('TRUNCATE TABLE employees RESTART IDENTITY CASCADE;');
    await pool.query('TRUNCATE TABLE attendance_logs RESTART IDENTITY CASCADE;');
    console.log("Successfully cleared employees and attendance_logs tables!");
    console.log("ID counter reset to 1.");
  } catch (err) {
    console.error("Error clearing DB:", err.message);
  } finally {
    process.exit();
  }
}

clearDB();
