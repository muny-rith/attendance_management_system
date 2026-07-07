const pool = require('../config/db');

// Get all shifts
exports.getShifts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shifts ORDER BY start_time');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create a new shift
exports.addShift = async (req, res) => {
  const { title, start_time, end_time } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO shifts (title, start_time, end_time) VALUES ($1, $2, $3) RETURNING *',
      [title, start_time, end_time]
    );
    res.json({ success: true, shift: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update a shift
exports.updateShift = async (req, res) => {
  const { id } = req.params;
  const { title, start_time, end_time } = req.body;
  try {
    const result = await pool.query(
      'UPDATE shifts SET title = $1, start_time = $2, end_time = $3 WHERE id = $4 RETURNING *',
      [title, start_time, end_time, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    res.json({ success: true, shift: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a shift
exports.deleteShift = async (req, res) => {
  const { id } = req.params;
  try {
    // ON DELETE CASCADE handles employee_shifts
    await pool.query('DELETE FROM shifts WHERE id = $1', [id]);
    res.json({ success: true, message: 'Shift deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Assign an employee to a shift
exports.assignShift = async (req, res) => {
  const { employee_id, shift_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO employee_shifts (employee_id, shift_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [employee_id, shift_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Unassign an employee from a shift
exports.unassignShift = async (req, res) => {
  const { employee_id, shift_id } = req.body;
  try {
    await pool.query(
      'DELETE FROM employee_shifts WHERE employee_id = $1 AND shift_id = $2',
      [employee_id, shift_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
