require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function migrate() {
  try {
    await pool.query('ALTER TABLE attendance_logs ADD COLUMN scanned_method VARCHAR(20)');
    await pool.query('ALTER TABLE attendance_logs ADD COLUMN scanned_identifier VARCHAR(50)');
    console.log('Migration successful: Added scanned columns');
  } catch (err) {
    console.log('Migration error (or already exists):', err.message);
  } finally {
    process.exit();
  }
}

migrate();
