const pool = require('../config/db');

// Log attendance from ESP32
exports.logAttendance = async (req, res) => {
  const { identifier, method, timestamp } = req.body;

  try {
    // Look up the employee by identifier via employee_identifiers table
    const identifierResult = await pool.query(
      'SELECT ei.employee_id, e.name FROM employee_identifiers ei JOIN employees e ON ei.employee_id = e.id WHERE ei.identifier = $1',
      [identifier]
    );

    let employeeId = null;
    let employeeName = 'Unknown User';

    if (identifierResult.rows.length > 0) {
      employeeId = identifierResult.rows[0].employee_id;
      employeeName = identifierResult.rows[0].name;
    } else {
      console.log(`Unknown identifier scanned: ${identifier} via ${method}`);
    }

    let insertedLogId;
    if (timestamp) {
      const insertResult = await pool.query(
        'INSERT INTO attendance_logs (employee_id, scanned_method, scanned_identifier, timestamp) VALUES ($1, $2, $3, $4) RETURNING id',
        [employeeId, method, identifier, timestamp] 
      );
      insertedLogId = insertResult.rows[0].id;
    } else {
      const insertResult = await pool.query(
        'INSERT INTO attendance_logs (employee_id, scanned_method, scanned_identifier) VALUES ($1, $2, $3) RETURNING id',
        [employeeId, method, identifier] 
      );
      insertedLogId = insertResult.rows[0].id;
    }

    // Fetch the newly inserted log with employee name and shift info
    const newLogQuery = await pool.query(`
      SELECT 
        al.id, 
        TO_CHAR(al.timestamp, 'YYYY-MM-DD"T"HH24:MI:SS') as timestamp, 
        al.scanned_method, 
        al.scanned_identifier, 
        e.name,
        s.title AS shift_title
      FROM attendance_logs al 
      LEFT JOIN employees e ON al.employee_id = e.id 
      LEFT JOIN shifts s ON al.timestamp::time BETWEEN s.start_time AND s.end_time
      WHERE al.id = $1
    `, [insertedLogId]);

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
        TO_CHAR(al.timestamp, 'YYYY-MM-DD"T"HH24:MI:SS') as timestamp,
        al.scanned_method,
        al.scanned_identifier,
        e.name,
        s.title AS shift_title
      FROM attendance_logs al
      LEFT JOIN employees e ON al.employee_id = e.id
      LEFT JOIN shifts s ON al.timestamp::time BETWEEN s.start_time AND s.end_time
      ORDER BY al.timestamp DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
