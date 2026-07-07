/**
 * ============================================================
 *  backup_to_supabase.js
 *  One-time sync: LOCAL PostgreSQL → Supabase (new schema)
 * ============================================================
 *
 *  Copies all tables from local DB to Supabase:
 *    employees, employee_identifiers, shifts,
 *    employee_shifts, attendance_logs
 *
 *  Run: node backup_to_supabase.js
 * ============================================================
 */

require('dotenv').config();
const { Pool } = require('pg');

// ─── SOURCE: Local PostgreSQL (reads from .env) ───────────────
const localPool = new Pool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port:     process.env.DB_PORT,
});

// ─── DESTINATION: Supabase ────────────────────────────────────
const supaPool = new Pool({
  host:     'aws-1-ap-southeast-1.pooler.supabase.com',
  user:     'postgres.xzpfywefkzabvjzzkrui',
  password: 'DVEPZ.KBykT$2Yg',
  database: 'postgres',
  port:     5432,
  ssl:      { rejectUnauthorized: false },
});
// ─────────────────────────────────────────────────────────────

async function backup() {
  const supaClient = await supaPool.connect();

  try {
    // Test both connections
    console.log('Connecting to local DB...');
    await localPool.query('SELECT 1');
    console.log('   OK: Local DB connected.\n');

    console.log('Connecting to Supabase...');
    await supaClient.query('SELECT 1');
    console.log('   OK: Supabase connected.\n');

    // ─── Read all local data ──────────────────────────────────
    console.log('Reading local data...');
    const employees    = (await localPool.query('SELECT * FROM employees ORDER BY id')).rows;
    const identifiers  = (await localPool.query('SELECT * FROM employee_identifiers ORDER BY id')).rows;
    const shifts       = (await localPool.query('SELECT * FROM shifts ORDER BY id')).rows;
    const empShifts    = (await localPool.query('SELECT * FROM employee_shifts ORDER BY id')).rows;
    const logs         = (await localPool.query('SELECT * FROM attendance_logs ORDER BY id')).rows;

    console.log('   employees            : ' + employees.length);
    console.log('   employee_identifiers : ' + identifiers.length);
    console.log('   shifts               : ' + shifts.length);
    console.log('   employee_shifts      : ' + empShifts.length);
    console.log('   attendance_logs      : ' + logs.length + '\n');

    // ─── Begin transaction on Supabase ───────────────────────
    await supaClient.query('BEGIN');

    // ─── 1. Employees ─────────────────────────────────────────
    console.log('Syncing employees...');
    for (const emp of employees) {
      await supaClient.query(
        `INSERT INTO employees (id, name)
         VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [emp.id, emp.name]
      );
    }
    // Keep the sequence in sync
    if (employees.length > 0) {
      const maxId = Math.max(...employees.map(e => e.id));
      await supaClient.query(`SELECT setval('employees_id_seq', $1, true)`, [maxId]);
    }
    console.log('   OK: ' + employees.length + ' employees synced.');

    // ─── 2. Employee Identifiers ──────────────────────────────
    console.log('Syncing employee_identifiers...');
    for (const ident of identifiers) {
      await supaClient.query(
        `INSERT INTO employee_identifiers (id, employee_id, identifier, method, label)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           employee_id = EXCLUDED.employee_id,
           identifier  = EXCLUDED.identifier,
           method      = EXCLUDED.method,
           label       = EXCLUDED.label`,
        [ident.id, ident.employee_id, ident.identifier, ident.method, ident.label]
      );
    }
    if (identifiers.length > 0) {
      const maxId = Math.max(...identifiers.map(i => i.id));
      await supaClient.query(`SELECT setval('employee_identifiers_id_seq', $1, true)`, [maxId]);
    }
    console.log('   OK: ' + identifiers.length + ' identifiers synced.');

    // ─── 3. Shifts ────────────────────────────────────────────
    console.log('Syncing shifts...');
    for (const shift of shifts) {
      await supaClient.query(
        `INSERT INTO shifts (id, title, start_time, end_time)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           title      = EXCLUDED.title,
           start_time = EXCLUDED.start_time,
           end_time   = EXCLUDED.end_time`,
        [shift.id, shift.title, shift.start_time, shift.end_time]
      );
    }
    if (shifts.length > 0) {
      const maxId = Math.max(...shifts.map(s => s.id));
      await supaClient.query(`SELECT setval('shifts_id_seq', $1, true)`, [maxId]);
    }
    console.log('   OK: ' + shifts.length + ' shifts synced.');

    // ─── 4. Employee Shifts ───────────────────────────────────
    console.log('Syncing employee_shifts...');
    for (const es of empShifts) {
      await supaClient.query(
        `INSERT INTO employee_shifts (id, employee_id, shift_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (employee_id, shift_id) DO NOTHING`,
        [es.id, es.employee_id, es.shift_id]
      );
    }
    if (empShifts.length > 0) {
      const maxId = Math.max(...empShifts.map(e => e.id));
      await supaClient.query(`SELECT setval('employee_shifts_id_seq', $1, true)`, [maxId]);
    }
    console.log('   OK: ' + empShifts.length + ' shift assignments synced.');

    // ─── 5. Attendance Logs ───────────────────────────────────
    console.log('Syncing attendance_logs...');
    for (const log of logs) {
      await supaClient.query(
        `INSERT INTO attendance_logs (id, employee_id, scanned_method, scanned_identifier, timestamp)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           employee_id        = EXCLUDED.employee_id,
           scanned_method     = EXCLUDED.scanned_method,
           scanned_identifier = EXCLUDED.scanned_identifier,
           timestamp          = EXCLUDED.timestamp`,
        [log.id, log.employee_id, log.scanned_method, log.scanned_identifier, log.timestamp]
      );
    }
    if (logs.length > 0) {
      const maxId = Math.max(...logs.map(l => l.id));
      await supaClient.query(`SELECT setval('attendance_logs_id_seq', $1, true)`, [maxId]);
    }
    console.log('   OK: ' + logs.length + ' attendance logs synced.\n');

    // ─── Commit ───────────────────────────────────────────────
    await supaClient.query('COMMIT');

    console.log('==================================================');
    console.log('Backup to Supabase complete!');
    console.log('   employees            : ' + employees.length);
    console.log('   employee_identifiers : ' + identifiers.length);
    console.log('   shifts               : ' + shifts.length);
    console.log('   employee_shifts      : ' + empShifts.length);
    console.log('   attendance_logs      : ' + logs.length);
    console.log('==================================================');

  } catch (err) {
    await supaClient.query('ROLLBACK');
    console.error('\nBackup FAILED - rolled back all Supabase changes.');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    supaClient.release();
    await localPool.end();
    await supaPool.end();
    process.exit(0);
  }
}

backup();
