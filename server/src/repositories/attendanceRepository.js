const pool = require('../config/db');

/**
 * Finds employee details by physical scan identifier.
 */
exports.findEmployeeByIdentifier = async (identifier) => {
  const result = await pool.query(
    `SELECT ei.employee_id, e.name 
     FROM employee_identifiers ei 
     JOIN employees e ON ei.employee_id = e.id 
     WHERE ei.identifier = $1`,
    [identifier]
  );
  return result.rows[0] || null;
};

/**
 * Inserts a new attendance log record into the database.
 */
exports.createLog = async ({ employeeId, method, identifier, timestamp }) => {
  if (timestamp) {
    const result = await pool.query(
      `INSERT INTO attendance_logs (employee_id, scanned_method, scanned_identifier, timestamp) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [employeeId, method, identifier, timestamp]
    );
    return result.rows[0].id;
  }

  const result = await pool.query(
    `INSERT INTO attendance_logs (employee_id, scanned_method, scanned_identifier) 
     VALUES ($1, $2, $3) RETURNING id`,
    [employeeId, method, identifier]
  );
  return result.rows[0].id;
};

/**
 * Fetches an attendance log by ID with employee and active shift details.
 */
exports.getLogWithDetailsById = async (logId) => {
  const result = await pool.query(
    `SELECT 
       al.id, 
       TO_CHAR(al.timestamp, 'YYYY-MM-DD"T"HH24:MI:SS') AS timestamp, 
       al.scanned_method, 
       al.scanned_identifier, 
       e.name,
       COALESCE(assigned_shift.title, fallback_shift.title) AS shift_title
     FROM attendance_logs al 
     LEFT JOIN employees e ON al.employee_id = e.id 
     LEFT JOIN LATERAL (
       SELECT s.id, s.title, s.shift_code
       FROM employee_shifts es
       JOIN shifts s ON es.shift_id = s.id
       WHERE es.employee_id = al.employee_id
         AND (
           (s.checkin_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkin_start AND s.checkin_end)
           OR (s.checkout_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkout_start AND s.checkout_end)
           OR (al.timestamp::time BETWEEN s.start_time AND s.end_time)
         )
       ORDER BY 
         CASE 
           WHEN s.checkin_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkin_start AND s.checkin_end THEN 1
           WHEN s.checkout_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkout_start AND s.checkout_end THEN 2
           ELSE 3
         END ASC
       LIMIT 1
     ) assigned_shift ON true
     LEFT JOIN LATERAL (
       SELECT s.id, s.title, s.shift_code
       FROM shifts s
       WHERE assigned_shift.id IS NULL
         AND (
           (s.checkin_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkin_start AND s.checkin_end)
           OR (s.checkout_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkout_start AND s.checkout_end)
           OR (al.timestamp::time BETWEEN s.start_time AND s.end_time)
         )
       ORDER BY 
         CASE 
           WHEN s.checkin_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkin_start AND s.checkin_end THEN 1
           WHEN s.checkout_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkout_start AND s.checkout_end THEN 2
           ELSE 3
         END ASC,
         CASE WHEN s.shift_code = 'full_day' THEN 2 ELSE 1 END ASC
       LIMIT 1
     ) fallback_shift ON true
     WHERE al.id = $1`,
    [logId]
  );
  return result.rows[0] || null;
};

/**
 * Paginated and filtered query for attendance logs.
 * Supports date ranges, search (name or ID), and pagination.
 */
exports.getLogsPaginated = async ({ page = 1, limit = 25, startDate, endDate, search, exportAll = false }) => {
  const conditions = [];
  const values = [];
  let paramIdx = 1;

  if (startDate) {
    conditions.push(`al.timestamp >= $${paramIdx++}`);
    values.push(startDate);
  }

  if (endDate) {
    conditions.push(`al.timestamp <= $${paramIdx++}`);
    values.push(endDate);
  }

  if (search && search.trim() !== '') {
    conditions.push(`(e.name ILIKE $${paramIdx} OR al.scanned_identifier ILIKE $${paramIdx})`);
    values.push(`%${search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 1. Total Count Query
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM attendance_logs al
    LEFT JOIN employees e ON al.employee_id = e.id
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, values);
  const totalCount = parseInt(countResult.rows[0].total, 10);

  // 2. Data Query with Intelligent Shift Window Resolution
  let dataQuery = `
    SELECT 
       al.id, 
       TO_CHAR(al.timestamp, 'YYYY-MM-DD"T"HH24:MI:SS') AS timestamp,
       al.scanned_method,
       al.scanned_identifier,
       e.name,
       COALESCE(assigned_shift.title, fallback_shift.title) AS shift_title
    FROM attendance_logs al
    LEFT JOIN employees e ON al.employee_id = e.id
    LEFT JOIN LATERAL (
      SELECT s.id, s.title, s.shift_code
      FROM employee_shifts es
      JOIN shifts s ON es.shift_id = s.id
      WHERE es.employee_id = al.employee_id
        AND (
          (s.checkin_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkin_start AND s.checkin_end)
          OR (s.checkout_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkout_start AND s.checkout_end)
          OR (al.timestamp::time BETWEEN s.start_time AND s.end_time)
        )
      ORDER BY 
        CASE 
          WHEN s.checkin_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkin_start AND s.checkin_end THEN 1
          WHEN s.checkout_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkout_start AND s.checkout_end THEN 2
          ELSE 3
        END ASC
      LIMIT 1
    ) assigned_shift ON true
    LEFT JOIN LATERAL (
      SELECT s.id, s.title, s.shift_code
      FROM shifts s
      WHERE assigned_shift.id IS NULL
        AND (
          (s.checkin_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkin_start AND s.checkin_end)
          OR (s.checkout_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkout_start AND s.checkout_end)
          OR (al.timestamp::time BETWEEN s.start_time AND s.end_time)
        )
      ORDER BY 
        CASE 
          WHEN s.checkin_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkin_start AND s.checkin_end THEN 1
          WHEN s.checkout_start IS NOT NULL AND al.timestamp::time BETWEEN s.checkout_start AND s.checkout_end THEN 2
          ELSE 3
        END ASC,
        CASE WHEN s.shift_code = 'full_day' THEN 2 ELSE 1 END ASC
      LIMIT 1
    ) fallback_shift ON true
    ${whereClause}
    ORDER BY al.id DESC
  `;

  if (!exportAll) {
    const offset = (Math.max(1, page) - 1) * limit;
    dataQuery += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    values.push(limit, offset);
  }

  const dataResult = await pool.query(dataQuery, values);

  return {
    rows: dataResult.rows,
    totalCount,
  };
};

/**
 * Legacy full fetch (kept for backward compatibility).
 */
exports.getAllLogsWithDetails = async () => {
  const result = await pool.query(
    `SELECT 
       al.id, 
       TO_CHAR(al.timestamp, 'YYYY-MM-DD"T"HH24:MI:SS') AS timestamp,
       al.scanned_method,
       al.scanned_identifier,
       e.name,
       s.title AS shift_title
     FROM attendance_logs al
     LEFT JOIN employees e ON al.employee_id = e.id
     LEFT JOIN shifts s ON al.timestamp::time BETWEEN s.start_time AND s.end_time
     ORDER BY al.timestamp DESC`
  );
  return result.rows;
};
