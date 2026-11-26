const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('../config/db');

async function migrateHolidays() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Migration: School Holidays ---');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS school_holidays (
        id SERIAL PRIMARY KEY,
        holiday_date DATE NOT NULL UNIQUE,
        name_en VARCHAR(255) NOT NULL,
        name_km VARCHAR(255),
        holiday_type VARCHAR(50) DEFAULT 'school_holiday', -- 'public', 'school_vacation', 'exam_off', 'custom'
        is_recurring BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_school_holidays_date ON school_holidays(holiday_date);
    `);
    console.log('Created school_holidays table.');

    await client.query('COMMIT');
    console.log('--- Migration completed successfully ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrateHolidays();
