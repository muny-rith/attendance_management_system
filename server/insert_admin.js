require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function insertAdmin() {
  try {
    // Insert Fob
    await pool.query(
      'INSERT INTO employees (name, identifier, method) VALUES ($1, $2, $3)',
      ['admin', 'FOB_ID_HERE', 'rfid']
    );
    // Insert Card
    await pool.query(
      'INSERT INTO employees (name, identifier, method) VALUES ($1, $2, $3)',
      ['admin', 'CARD_ID_HERE', 'rfid']
    );
    console.log("Successfully inserted 2 admin rows directly to the table!");
  } catch (err) {
    console.error(err.message);
  } finally {
    process.exit();
  }
}

insertAdmin();
