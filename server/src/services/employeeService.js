const pool = require('../config/db');
const employeeRepository = require('../repositories/employeeRepository');
const identifierRepository = require('../repositories/identifierRepository');
const shiftRepository = require('../repositories/shiftRepository');
const hardwareService = require('./hardwareService');

/**
 * Returns all employees enriched with their identifiers and assigned shifts.
 */
exports.getEmployees = async () => {
  const [employees, identifiers, shifts] = await Promise.all([
    employeeRepository.findAll(),
    identifierRepository.findAll(),
    shiftRepository.findAllEmployeeShifts(),
  ]);

  return employees.map((emp) => ({
    ...emp,
    identifiers: identifiers.filter((i) => i.employee_id === emp.id),
    shifts: shifts.filter((s) => s.employee_id === emp.id),
  }));
};

/**
 * Adds a new employee with identifiers and shift assignments in an ACID transaction.
 */
exports.addEmployee = async ({ name, identifiers, shift_ids }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert employee
    const newEmployee = await employeeRepository.create(client, { name });

    // 2. Insert identifiers
    const insertedIdentifiers = [];
    if (identifiers && identifiers.length > 0) {
      for (const ident of identifiers) {
        const row = await identifierRepository.create(client, {
          employeeId: newEmployee.id,
          identifier: ident.identifier,
          method: ident.method,
          label: ident.label || null,
        });
        insertedIdentifiers.push(row);
      }
    }

    // 3. Assign shifts
    const assignedShifts = [];
    if (shift_ids && shift_ids.length > 0) {
      for (const shiftId of shift_ids) {
        await shiftRepository.assignShift(client, newEmployee.id, shiftId);
      }
      const shiftRows = await shiftRepository.findShiftsByEmployeeId(client, newEmployee.id);
      assignedShifts.push(...shiftRows);
    }

    // 4. Retroactively claim past unknown logs for each newly added identifier
    for (const ident of insertedIdentifiers) {
      await employeeRepository.retroactiveUpdateLogs(client, newEmployee.id, ident.identifier);
    }

    await client.query('COMMIT');
    return {
      success: true,
      employee: {
        ...newEmployee,
        identifiers: insertedIdentifiers,
        shifts: assignedShifts,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Updates an employee's name, identifiers, and shifts in a transaction.
 */
exports.updateEmployee = async (id, { name, identifiers, shift_ids }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update employee name
    const updatedEmployee = await employeeRepository.update(client, id, { name });
    if (!updatedEmployee) {
      const error = new Error('Employee not found');
      error.statusCode = 404;
      throw error;
    }

    // 2. Replace identifiers if provided
    if (identifiers !== undefined) {
      await identifierRepository.deleteByEmployeeId(client, id);
      if (identifiers.length > 0) {
        for (const ident of identifiers) {
          await identifierRepository.create(client, {
            employeeId: id,
            identifier: ident.identifier,
            method: ident.method,
            label: ident.label || null,
          });
        }
      }
    }

    // 3. Replace shifts if provided
    if (shift_ids !== undefined) {
      await shiftRepository.unassignAllByEmployeeId(client, id);
      if (shift_ids.length > 0) {
        for (const shiftId of shift_ids) {
          await shiftRepository.assignShift(client, id, shiftId);
        }
      }
    }

    await client.query('COMMIT');

    // Trigger ESP32 sync in case identifiers changed
    hardwareService.triggerSync();

    const [updatedIdentifiers, updatedShifts] = await Promise.all([
      identifierRepository.findByEmployeeId(id),
      shiftRepository.findShiftsByEmployeeId(null, id),
    ]);

    return {
      success: true,
      employee: {
        ...updatedEmployee,
        identifiers: updatedIdentifiers,
        shifts: updatedShifts,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Deletes an employee, nullifies historical attendance logs, and triggers ESP32 sync.
 */
exports.deleteEmployee = async (id) => {
  // Nullify attendance_logs references
  await employeeRepository.nullifyAttendanceLogs(null, id);

  // Delete employee (cascades to employee_identifiers & employee_shifts)
  const deleted = await employeeRepository.delete(null, id);
  if (!deleted) {
    const error = new Error('Employee not found');
    error.statusCode = 404;
    throw error;
  }

  // Notify hardware to purge local biometric template
  hardwareService.triggerSync();

  return { success: true, message: 'Employee deleted' };
};

/**
 * Returns numeric fingerprint IDs for ESP32 optical sensor flash sync.
 * Guarantees frozen hardware contract: returns integer array e.g. [1, 2, 5]
 */
exports.getSyncFingerprintIds = async () => {
  const rows = await identifierRepository.getFingerprintIdentifiers();
  return rows
    .map((row) => parseInt(row.identifier, 10))
    .filter((id) => !isNaN(id));
};

/**
 * Adds an identifier to an existing employee and claims past unknown logs.
 */
exports.addIdentifier = async (employeeId, { identifier, method, label }) => {
  const newIdentifier = await identifierRepository.create(null, {
    employeeId,
    identifier,
    method,
    label,
  });

  // Retroactively claim past scans
  await employeeRepository.retroactiveUpdateLogs(null, employeeId, identifier);

  return { success: true, identifier: newIdentifier };
};

/**
 * Removes an identifier by ID.
 */
exports.removeIdentifier = async (identifierId) => {
  await identifierRepository.deleteById(null, identifierId);
  return { success: true };
};
