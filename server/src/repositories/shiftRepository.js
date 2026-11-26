const pool = require('../config/db');

exports.findAll = async () => {
  const result = await pool.query('SELECT * FROM shifts ORDER BY start_time');
  return result.rows;
};

exports.findById = async (id) => {
  const result = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
  return result.rows[0] || null;
};

exports.create = async ({ title, start_time, end_time, checkin_start, checkin_end, checkout_start, checkout_end, shift_code, is_evening_period }) => {
  const result = await pool.query(
    `INSERT INTO shifts (title, start_time, end_time, checkin_start, checkin_end, checkout_start, checkout_end, shift_code, is_evening_period) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
    [
      title,
      start_time,
      end_time,
      checkin_start || null,
      checkin_end || null,
      checkout_start || null,
      checkout_end || null,
      shift_code || null,
      is_evening_period || false
    ]
  );
  return result.rows[0];
};

exports.update = async (id, { title, start_time, end_time, checkin_start, checkin_end, checkout_start, checkout_end, shift_code, is_evening_period }) => {
  const result = await pool.query(
    `UPDATE shifts 
     SET title = $1, 
         start_time = $2, 
         end_time = $3,
         checkin_start = COALESCE($4, checkin_start),
         checkin_end = COALESCE($5, checkin_end),
         checkout_start = COALESCE($6, checkout_start),
         checkout_end = COALESCE($7, checkout_end),
         shift_code = COALESCE($8, shift_code),
         is_evening_period = COALESCE($9, is_evening_period)
     WHERE id = $10 
     RETURNING *`,
    [title, start_time, end_time, checkin_start, checkin_end, checkout_start, checkout_end, shift_code, is_evening_period, id]
  );
  return result.rows[0] || null;
};

exports.delete = async (id) => {
  const result = await pool.query('DELETE FROM shifts WHERE id = $1', [id]);
  return result.rowCount > 0;
};

exports.findAllEmployeeShifts = async () => {
  const result = await pool.query(`
    SELECT es.employee_id, es.shift_id, s.title, s.start_time, s.end_time
    FROM employee_shifts es
    JOIN shifts s ON es.shift_id = s.id
    ORDER BY s.start_time
  `);
  return result.rows;
};

exports.findShiftsByEmployeeId = async (executor, employeeId) => {
  const db = executor || pool;
  const result = await db.query(`
    SELECT es.shift_id, s.title, s.start_time, s.end_time
    FROM employee_shifts es 
    JOIN shifts s ON es.shift_id = s.id
    WHERE es.employee_id = $1
    ORDER BY s.start_time
  `, [employeeId]);
  return result.rows;
};

exports.assignShift = async (executor, employeeId, shiftId) => {
  const db = executor || pool;
  await db.query(
    'INSERT INTO employee_shifts (employee_id, shift_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [employeeId, shiftId]
  );
};

exports.unassignShift = async (employeeId, shiftId) => {
  const result = await pool.query(
    'DELETE FROM employee_shifts WHERE employee_id = $1 AND shift_id = $2',
    [employeeId, shiftId]
  );
  return result.rowCount > 0;
};

exports.unassignAllByEmployeeId = async (executor, employeeId) => {
  const db = executor || pool;
  await db.query('DELETE FROM employee_shifts WHERE employee_id = $1', [employeeId]);
};
