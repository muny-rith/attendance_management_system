const pool = require('../config/db');
const hardwareController = require('./hardwareController');

// Get all employees with their identifiers and assigned shifts
exports.getEmployees = async (req, res) => {
  try {
    // Get all employees
    const employeeResult = await pool.query('SELECT * FROM employees ORDER BY id DESC');
    const employees = employeeResult.rows;

    // Get all identifiers grouped by employee
    const identifierResult = await pool.query(
      'SELECT * FROM employee_identifiers ORDER BY id'
    );

    // Get all shift assignments with shift details
    const shiftResult = await pool.query(`
      SELECT es.employee_id, es.shift_id, s.title, s.start_time, s.end_time
      FROM employee_shifts es
      JOIN shifts s ON es.shift_id = s.id
      ORDER BY s.start_time
    `);

    // Attach identifiers and shifts to each employee
    const enriched = employees.map(emp => ({
      ...emp,
      identifiers: identifierResult.rows.filter(i => i.employee_id === emp.id),
      shifts: shiftResult.rows.filter(s => s.employee_id === emp.id),
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Add a new employee with identifiers and shift assignments
exports.addEmployee = async (req, res) => {
  const { name, identifiers, shift_ids } = req.body;
  // identifiers: [{ identifier: "D3 00 60 06", method: "rfid", label: "Main Card" }, ...]
  // shift_ids: [1, 2] (morning + afternoon)

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert employee
    const empResult = await client.query(
      'INSERT INTO employees (name) VALUES ($1) RETURNING *',
      [name]
    );
    const newEmployee = empResult.rows[0];

    // Insert identifiers
    const insertedIdentifiers = [];
    if (identifiers && identifiers.length > 0) {
      for (const ident of identifiers) {
        const identResult = await client.query(
          'INSERT INTO employee_identifiers (employee_id, identifier, method, label) VALUES ($1, $2, $3, $4) RETURNING *',
          [newEmployee.id, ident.identifier, ident.method, ident.label || null]
        );
        insertedIdentifiers.push(identResult.rows[0]);
      }
    }

    // Assign shifts
    const assignedShifts = [];
    if (shift_ids && shift_ids.length > 0) {
      for (const shiftId of shift_ids) {
        await client.query(
          'INSERT INTO employee_shifts (employee_id, shift_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [newEmployee.id, shiftId]
        );
      }
      const shiftResult = await client.query(`
        SELECT es.shift_id, s.title, s.start_time, s.end_time
        FROM employee_shifts es JOIN shifts s ON es.shift_id = s.id
        WHERE es.employee_id = $1
      `, [newEmployee.id]);
      assignedShifts.push(...shiftResult.rows);
    }

    // Retroactively update past unknown logs for each identifier
    for (const ident of insertedIdentifiers) {
      await client.query(
        'UPDATE attendance_logs SET employee_id = $1 WHERE scanned_identifier = $2 AND employee_id IS NULL',
        [newEmployee.id, ident.identifier]
      );
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      employee: { ...newEmployee, identifiers: insertedIdentifiers, shifts: assignedShifts }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Update an existing employee
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { name, identifiers, shift_ids } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update name
    const empResult = await client.query(
      'UPDATE employees SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Replace identifiers: delete old ones and insert new ones
    if (identifiers) {
      await client.query('DELETE FROM employee_identifiers WHERE employee_id = $1', [id]);
      for (const ident of identifiers) {
        await client.query(
          'INSERT INTO employee_identifiers (employee_id, identifier, method, label) VALUES ($1, $2, $3, $4)',
          [id, ident.identifier, ident.method, ident.label || null]
        );
      }
    }

    // Replace shift assignments
    if (shift_ids) {
      await client.query('DELETE FROM employee_shifts WHERE employee_id = $1', [id]);
      for (const shiftId of shift_ids) {
        await client.query(
          'INSERT INTO employee_shifts (employee_id, shift_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, shiftId]
        );
      }
    }

    await client.query('COMMIT');

    hardwareController.triggerSync();

    // Fetch updated employee with identifiers and shifts
    const updatedIdentifiers = await pool.query(
      'SELECT * FROM employee_identifiers WHERE employee_id = $1', [id]
    );
    const updatedShifts = await pool.query(`
      SELECT es.shift_id, s.title, s.start_time, s.end_time
      FROM employee_shifts es JOIN shifts s ON es.shift_id = s.id
      WHERE es.employee_id = $1
    `, [id]);

    res.json({
      success: true,
      employee: {
        ...empResult.rows[0],
        identifiers: updatedIdentifiers.rows,
        shifts: updatedShifts.rows
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Delete an employee
exports.deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    // Nullify reference in attendance_logs
    await pool.query('UPDATE attendance_logs SET employee_id = NULL WHERE employee_id = $1', [id]);
    
    // ON DELETE CASCADE handles employee_identifiers and employee_shifts
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    
    hardwareController.triggerSync();
    
    res.json({ success: true, message: 'Employee deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get valid fingerprint IDs for hardware sync
exports.getSyncIds = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT identifier FROM employee_identifiers WHERE method = 'fingerprint'"
    );
    const ids = result.rows.map(row => parseInt(row.identifier, 10)).filter(id => !isNaN(id));
    res.json(ids);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Add a single identifier to an existing employee
exports.addIdentifier = async (req, res) => {
  const { id } = req.params; // employee id
  const { identifier, method, label } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO employee_identifiers (employee_id, identifier, method, label) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, identifier, method, label || null]
    );

    // Retroactively link unknown logs
    await pool.query(
      'UPDATE attendance_logs SET employee_id = $1 WHERE scanned_identifier = $2 AND employee_id IS NULL',
      [id, identifier]
    );

    res.json({ success: true, identifier: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Remove a specific identifier
exports.removeIdentifier = async (req, res) => {
  const { identifierId } = req.params;
  try {
    await pool.query('DELETE FROM employee_identifiers WHERE id = $1', [identifierId]);
    hardwareController.triggerSync();
    res.json({ success: true, message: 'Identifier removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
