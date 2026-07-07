/**
 * ============================================================
 *  backup_from_supabase.js
 *  One-time migration: OLD Supabase DB → NEW Local PostgreSQL
 * ============================================================
 *
 *  OLD schema (Supabase):
 *    employees        → id, name, identifier, method
 *    attendance_logs  → id, employee_id, scanned_method, scanned_identifier, timestamp
 *
 *  NEW schema (local):
 *    employees            → id, name
 *    employee_identifiers → id, employee_id, identifier, method, label
 *    attendance_logs      → id, employee_id, scanned_method, scanned_identifier, timestamp
 *
 *  HOW TO RUN:
 *    1. Fill in your Supabase credentials below (OLD_DB_*)
 *    2. Make sure your local DB is running and has the new schema applied
 *    3. Run: node backup_from_supabase.js
 * ============================================================
 */

require('dotenv').config();
const { Pool } = require('pg');

// ─── OLD DB: Your Supabase Connection ────────────────────────
// Fill these in before running!
const OLD_DB_HOST = 'aws-1-ap-southeast-1.pooler.supabase.com';  // <- your Supabase DB host
const OLD_DB_USER = 'postgres.xzpfywefkzabvjzzkrui';
const OLD_DB_PASSWORD = 'DVEPZ.KBykT$2Yg';    // <- your Supabase DB password
const OLD_DB_NAME = 'postgres';                      // Supabase default DB name
const OLD_DB_PORT = 5432;
// ─────────────────────────────────────────────────────────────

// ─── NEW DB: Your Local PostgreSQL ───────────────────────────
// Reads from your .env file automatically
const NEW_DB_HOST = process.env.DB_HOST;
const NEW_DB_USER = process.env.DB_USER;
const NEW_DB_PASSWORD = process.env.DB_PASSWORD;
const NEW_DB_NAME = process.env.DB_DATABASE;
const NEW_DB_PORT = process.env.DB_PORT;
// ─────────────────────────────────────────────────────────────

const oldPool = new Pool({
  host: OLD_DB_HOST,
  user: OLD_DB_USER,
  password: OLD_DB_PASSWORD,
  database: OLD_DB_NAME,
  port: OLD_DB_PORT,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
});

const newPool = new Pool({
  host: NEW_DB_HOST,
  user: NEW_DB_USER,
  password: NEW_DB_PASSWORD,
  database: NEW_DB_NAME,
  port: NEW_DB_PORT,
});

async function migrate() {
  const newClient = await newPool.connect();

  try {
    console.log('Connecting to old Supabase DB...');
    await oldPool.query('SELECT 1');
    console.log('   OK: Supabase connected.\n');

    console.log('Connecting to new local DB...');
    await newClient.query('SELECT 1');
    console.log('   OK: Local DB connected.\n');

    // ─── Read old data ────────────────────────────────────────
    console.log('Reading data from Supabase...');

    const oldEmployees = await oldPool.query(
      'SELECT id, name, identifier, method FROM employees ORDER BY id'
    );
    const oldLogs = await oldPool.query(
      'SELECT id, employee_id, scanned_method, scanned_identifier, timestamp FROM attendance_logs ORDER BY id'
    );

    console.log('   Found ' + oldEmployees.rows.length + ' employees');
    console.log('   Found ' + oldLogs.rows.length + ' attendance logs\n');

    // ─── Begin transaction on new DB ─────────────────────────
    await newClient.query('BEGIN');

    // ─── 1. Migrate Employees ─────────────────────────────────
    console.log('Migrating employees...');
    const empIdMap = {}; // old_id -> new_id

    for (const emp of oldEmployees.rows) {
      // Insert employee (name only in new schema)
      const result = await newClient.query(
        `INSERT INTO employees (name)
         VALUES ($1)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [emp.name]
      );

      let newId;
      if (result.rows.length > 0) {
        newId = result.rows[0].id;
      } else {
        // Already exists — look up by name
        const existing = await newClient.query(
          'SELECT id FROM employees WHERE name = $1 LIMIT 1',
          [emp.name]
        );
        newId = existing.rows[0]?.id;
      }

      empIdMap[emp.id] = newId;

      // Insert identifier into employee_identifiers
      if (emp.identifier && emp.method) {
        await newClient.query(
          `INSERT INTO employee_identifiers (employee_id, identifier, method, label)
           VALUES ($1, $2, $3, 'Primary')
           ON CONFLICT (identifier) DO NOTHING`,
          [newId, emp.identifier, emp.method]
        );
      }

      console.log('   OK: "' + emp.name + '" (old id:' + emp.id + ' -> new id:' + newId + ')');
    }

    // ─── 2. Migrate Attendance Logs ───────────────────────────
    console.log('\nMigrating attendance logs...');
    let logCount = 0;

    for (const log of oldLogs.rows) {
      const newEmployeeId = log.employee_id ? empIdMap[log.employee_id] : null;

      await newClient.query(
        `INSERT INTO attendance_logs
           (employee_id, scanned_method, scanned_identifier, timestamp)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [newEmployeeId, log.scanned_method, log.scanned_identifier, log.timestamp]
      );
      logCount++;
    }

    console.log('   OK: Migrated ' + logCount + ' logs\n');

    // ─── Commit ───────────────────────────────────────────────
    await newClient.query('COMMIT');

    console.log('==================================================');
    console.log('Migration complete!');
    console.log('   Employees migrated : ' + oldEmployees.rows.length);
    console.log('   Attendance logs    : ' + logCount);
    console.log('==================================================');

  } catch (err) {
    await newClient.query('ROLLBACK');
    console.error('\nMigration FAILED - rolled back all changes.');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    newClient.release();
    await oldPool.end();
    await newPool.end();
    process.exit(0);
  }
}

migrate();
