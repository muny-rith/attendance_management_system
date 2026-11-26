const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Migration: School Shifts & Windows ---');

    await client.query('BEGIN');

    // 1. Alter shifts table to support windows and shift codes
    await client.query(`
      ALTER TABLE shifts 
      ADD COLUMN IF NOT EXISTS shift_code VARCHAR(30),
      ADD COLUMN IF NOT EXISTS checkin_start TIME,
      ADD COLUMN IF NOT EXISTS checkin_end TIME,
      ADD COLUMN IF NOT EXISTS checkout_start TIME,
      ADD COLUMN IF NOT EXISTS checkout_end TIME,
      ADD COLUMN IF NOT EXISTS is_evening_period BOOLEAN DEFAULT false;
    `);
    console.log('Added window columns to shifts table.');

    // 2. Alter employees table for role and lunch bridge flag
    await client.query(`
      ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'teacher',
      ADD COLUMN IF NOT EXISTS allow_lunch_bridge BOOLEAN DEFAULT true;
    `);
    console.log('Added role & allow_lunch_bridge columns to employees table.');

    // 3. Ensure employee_shifts junction table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_shifts (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        UNIQUE(employee_id, shift_id)
      );
    `);
    console.log('Verified employee_shifts table.');

    // 4. Seed / Update the 5 standard school shifts
    const schoolShifts = [
      {
        title: 'Morning',
        shift_code: 'morning',
        start_time: '06:45',
        end_time: '11:00',
        checkin_start: '06:15',
        checkin_end: '07:30',
        checkout_start: '10:45',
        checkout_end: '12:00',
        is_evening_period: false,
      },
      {
        title: 'Afternoon',
        shift_code: 'afternoon',
        start_time: '12:45',
        end_time: '17:00',
        checkin_start: '12:15',
        checkin_end: '13:30',
        checkout_start: '16:45',
        checkout_end: '17:45',
        is_evening_period: false,
      },
      {
        title: 'Evening 1',
        shift_code: 'evening_p1',
        start_time: '17:30',
        end_time: '18:30',
        checkin_start: '17:00',
        checkin_end: '17:45',
        checkout_start: '18:25',
        checkout_end: '18:45',
        is_evening_period: true,
      },
      {
        title: 'Evening 2',
        shift_code: 'evening_p2',
        start_time: '18:30',
        end_time: '19:30',
        checkin_start: '18:15',
        checkin_end: '18:45',
        checkout_start: '19:25',
        checkout_end: '20:15',
        is_evening_period: true,
      },
      {
        title: 'Full-Day',
        shift_code: 'full_day',
        start_time: '06:45',
        end_time: '17:00',
        checkin_start: '06:15',
        checkin_end: '07:30',
        checkout_start: '16:45',
        checkout_end: '17:45',
        is_evening_period: false,
      },
    ];

    for (const s of schoolShifts) {
      // Check if shift with same shift_code or title exists
      const existing = await client.query(
        'SELECT id FROM shifts WHERE shift_code = $1 OR title ILIKE $2',
        [s.shift_code, s.title]
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE shifts 
           SET title = $1, shift_code = $2, start_time = $3, end_time = $4,
               checkin_start = $5, checkin_end = $6, checkout_start = $7, checkout_end = $8,
               is_evening_period = $9
           WHERE id = $10`,
          [
            s.title,
            s.shift_code,
            s.start_time,
            s.end_time,
            s.checkin_start,
            s.checkin_end,
            s.checkout_start,
            s.checkout_end,
            s.is_evening_period,
            existing.rows[0].id,
          ]
        );
        console.log(`Updated shift: ${s.title} (${s.start_time} - ${s.end_time})`);
      } else {
        await client.query(
          `INSERT INTO shifts (title, shift_code, start_time, end_time, checkin_start, checkin_end, checkout_start, checkout_end, is_evening_period)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            s.title,
            s.shift_code,
            s.start_time,
            s.end_time,
            s.checkin_start,
            s.checkin_end,
            s.checkout_start,
            s.checkout_end,
            s.is_evening_period,
          ]
        );
        console.log(`Inserted shift: ${s.title} (${s.start_time} - ${s.end_time})`);
      }
    }

    await client.query('COMMIT');
    console.log('--- Migration completed successfully! ---');

    // Query current shifts to confirm
    const allShifts = await client.query('SELECT id, title, shift_code, start_time, end_time FROM shifts ORDER BY start_time');
    console.log('Current Shifts in Database:');
    console.table(allShifts.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
