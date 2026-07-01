require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'postgres', // Checking default db
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkDB() {
  try {
    const res = await pool.query('SELECT * FROM employees');
    console.log("Employees in postgres DB:");
    console.table(res.rows);
  } catch (err) {
    console.error(err.message);
  } finally {
    process.exit();
  }
}

checkDB();
