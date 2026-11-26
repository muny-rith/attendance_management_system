const pool = require('../config/db');

exports.findAll = async () => {
  const result = await pool.query('SELECT * FROM employee_identifiers ORDER BY id');
  return result.rows;
};

exports.findByEmployeeId = async (employeeId) => {
  const result = await pool.query(
    'SELECT * FROM employee_identifiers WHERE employee_id = $1 ORDER BY id',
    [employeeId]
  );
  return result.rows;
};

exports.create = async (executor, { employeeId, identifier, method, label }) => {
  const db = executor || pool;
  const result = await db.query(
    'INSERT INTO employee_identifiers (employee_id, identifier, method, label) VALUES ($1, $2, $3, $4) RETURNING *',
    [employeeId, identifier, method, label || null]
  );
  return result.rows[0];
};

exports.deleteById = async (executor, identifierId) => {
  const db = executor || pool;
  const result = await db.query('DELETE FROM employee_identifiers WHERE id = $1', [identifierId]);
  return result.rowCount > 0;
};

exports.deleteByEmployeeId = async (executor, employeeId) => {
  const db = executor || pool;
  await db.query('DELETE FROM employee_identifiers WHERE employee_id = $1', [employeeId]);
};

exports.getFingerprintIdentifiers = async () => {
  const result = await pool.query(
    "SELECT identifier FROM employee_identifiers WHERE method = 'fingerprint'"
  );
  return result.rows;
};
