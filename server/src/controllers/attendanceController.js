const pool = require('../config/db');

// Log attendance from ESP32
exports.logAttendance = async (req, res) => {
  const { identifier, method, timestamp } = req.body;

  try {
    // Look up the employee by identifier
    const employeeResult = await pool.query(
      'SELECT id, name FROM employees WHERE identifier = $1',
      [identifier]
    );

    let employeeId = null;
    let employeeName = 'Unknown User';

    if (employeeResult.rows.length > 0) {
      employeeId = employeeResult.rows[0].id;
      employeeName = employeeResult.rows[0].name;
    } else {
      console.log(`Unknown identifier scanned: ${identifier} via ${method}`);
    }

    if (timestamp) {
      await pool.query(
        'INSERT INTO attendance_logs (employee_id, scanned_method, scanned_identifier, timestamp) VALUES ($1, $2, $3, $4)',
        [employeeId, method, identifier, timestamp] 
      );
    } else {
      await pool.query(
        'INSERT INTO attendance_logs (employee_id, scanned_method, scanned_identifier) VALUES ($1, $2, $3)',
        [employeeId, method, identifier] 
      );
    }

    // Fetch the newly inserted log with the employee name to emit to the frontend
    const newLogQuery = await pool.query(`
      SELECT al.id, al.timestamp, al.scanned_method, al.scanned_identifier, e.name, e.method, e.identifier 
      FROM attendance_logs al 
      LEFT JOIN employees e ON al.employee_id = e.id 
      WHERE al.id = (SELECT MAX(id) FROM attendance_logs)
    `);

    // Emit event to all connected clients
    req.io.emit('new_scan', newLogQuery.rows[0]);

    console.log(`Logged: ${employeeName} via ${method}`);
    res.json({ success: true, name: employeeName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// View all attendance logs (for the React frontend)
exports.getLogs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        al.id, 
        al.timestamp,
        al.scanned_method,
        al.scanned_identifier,
        e.name, 
        e.method, 
        e.identifier
      FROM attendance_logs al
      LEFT JOIN employees e ON al.employee_id = e.id
      ORDER BY al.timestamp DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
