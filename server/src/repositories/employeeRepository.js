const pool = require('../config/db');

exports.findAll = async () => {
  const result = await pool.query('SELECT * FROM employees ORDER BY id DESC');
  return result.rows;
};

exports.findById = async (id) => {
  const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
  return result.rows[0] || null;
};

exports.create = async (executor, { name }) => {
  const db = executor || pool;
  const result = await db.query(
    'INSERT INTO employees (name) VALUES ($1) RETURNING *',
    [name]
  );
  return result.rows[0];
};

exports.update = async (executor, id, { name }) => {
  const db = executor || pool;
  const result = await db.query(
    'UPDATE employees SET name = $1 WHERE id = $2 RETURNING *',
    [name, id]
  );
  return result.rows[0] || null;
};

exports.delete = async (executor, id) => {
  const db = executor || pool;
  const result = await db.query('DELETE FROM employees WHERE id = $1', [id]);
  return result.rowCount > 0;
};

exports.nullifyAttendanceLogs = async (executor, employeeId) => {
  const db = executor || pool;
  await db.query(
    'UPDATE attendance_logs SET employee_id = NULL WHERE employee_id = $1',
    [employeeId]
  );
};

exports.retroactiveUpdateLogs = async (executor, employeeId, identifier) => {
  const db = executor || pool;
  await db.query(
    'UPDATE attendance_logs SET employee_id = $1 WHERE scanned_identifier = $2 AND employee_id IS NULL',
    [employeeId, identifier]
  );
};
