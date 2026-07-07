/**
 * Migration v2: Multi-Identifier + Shifts System
 * 
 * This migration:
 * 1. Creates employee_identifiers table
 * 2. Migrates existing identifier/method data from employees → employee_identifiers
 * 3. Creates shifts table with 3 default shifts
 * 4. Creates employee_shifts junction table
 * 5. Drops identifier and method columns from employees
 * 
 * Run: node migration_v2.js
 */

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
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Create employee_identifiers table
    console.log('1. Creating employee_identifiers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_identifiers (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        identifier VARCHAR(50) UNIQUE NOT NULL,
        method VARCHAR(20) NOT NULL,
        label VARCHAR(50)
      )
    `);

    // 2. Migrate existing data from employees.identifier → employee_identifiers
    console.log('2. Migrating existing identifiers...');
    const existingEmployees = await client.query(
      'SELECT id, identifier, method FROM employees WHERE identifier IS NOT NULL'
    );
    
    for (const emp of existingEmployees.rows) {
      await client.query(
        'INSERT INTO employee_identifiers (employee_id, identifier, method, label) VALUES ($1, $2, $3, $4) ON CONFLICT (identifier) DO NOTHING',
        [emp.id, emp.identifier, emp.method, 'Primary']
      );
    }
    console.log(`   Migrated ${existingEmployees.rows.length} identifiers.`);

    // 3. Create shifts table with defaults
    console.log('3. Creating shifts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(50) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL
      )
    `);

    // Insert default shifts if table is empty
    const shiftCount = await client.query('SELECT COUNT(*) FROM shifts');
    if (parseInt(shiftCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO shifts (title, start_time, end_time) VALUES
          ('Morning', '06:00', '12:00'),
          ('Afternoon', '12:00', '18:00'),
          ('Evening', '18:00', '23:59')
      `);
      console.log('   Inserted default shifts (Morning, Afternoon, Evening).');
    }

    // 4. Create employee_shifts junction table
    console.log('4. Creating employee_shifts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_shifts (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        UNIQUE(employee_id, shift_id)
      )
    `);

    // 5. Drop old columns from employees
    console.log('5. Dropping old columns from employees...');
    try {
      await client.query('ALTER TABLE employees DROP COLUMN IF EXISTS identifier');
      await client.query('ALTER TABLE employees DROP COLUMN IF EXISTS method');
      console.log('   Dropped identifier and method columns.');
    } catch (err) {
      console.log('   Columns may already be dropped:', err.message);
    }

    // 6. Add scanned_method and scanned_identifier to attendance_logs if not exist
    console.log('6. Ensuring scanned columns exist in attendance_logs...');
    try {
      await client.query('ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS scanned_method VARCHAR(20)');
      await client.query('ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS scanned_identifier VARCHAR(50)');
    } catch (err) {
      console.log('   Scanned columns may already exist:', err.message);
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration v2 completed successfully!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed, rolled back:', err.message);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
