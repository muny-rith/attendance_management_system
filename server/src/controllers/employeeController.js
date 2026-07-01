const pool = require('../config/db');
const hardwareController = require('./hardwareController');

// Get all employees
exports.getEmployees = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Add a new employee
exports.addEmployee = async (req, res) => {
  const { name, identifier, method } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO employees (name, identifier, method) VALUES ($1, $2, $3) RETURNING *',
      [name, identifier, method]
    );
    
    const newEmployee = result.rows[0];

    // Retroactively update past unknown logs with this identifier
    await pool.query(
      'UPDATE attendance_logs SET employee_id = $1 WHERE scanned_identifier = $2',
      [newEmployee.id, identifier]
    );

    res.json({ success: true, employee: newEmployee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update an existing employee
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { name, identifier, method } = req.body;
  try {
    const result = await pool.query(
      'UPDATE employees SET name = $1, identifier = $2, method = $3 WHERE id = $4 RETURNING *',
      [name, identifier, method, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    hardwareController.triggerSync(); // Real-time sync to wipe any orphaned fingerprint

    res.json({ success: true, employee: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete an employee
exports.deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    // Prevent foreign key violation: Nullify the reference in attendance_logs first
    await pool.query('UPDATE attendance_logs SET employee_id = NULL WHERE employee_id = $1', [id]);
    
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    
    hardwareController.triggerSync(); // Real-time sync to wipe deleted fingerprint
    
    res.json({ success: true, message: 'Employee deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get valid fingerprint IDs for hardware sync
exports.getSyncIds = async (req, res) => {
  try {
    const result = await pool.query("SELECT identifier FROM employees WHERE method = 'fingerprint'");
    // Return a flat array of identifiers
    const ids = result.rows.map(row => parseInt(row.identifier, 10)).filter(id => !isNaN(id));
    res.json(ids);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
