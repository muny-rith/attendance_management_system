const pool = require('../config/db');

const SHIFT_SORT_PRIORITY = {
  morning: 1,
  full_day: 2,
  afternoon: 3,
  evening_p1: 4,
  evening_p2: 5,
};

function getEmployeeShiftRank(emp) {
  if (!emp.shifts || emp.shifts.length === 0) return 99;
  return Math.min(...emp.shifts.map(s => SHIFT_SORT_PRIORITY[s.shift_code] || 90));
}

/**
 * Fetches all employees with their assigned shifts and role,
 * sorted by primary shift (morning -> full_day -> afternoon -> evening1 -> evening2), then by name.
 */
exports.getEmployeesWithShifts = async () => {
  const result = await pool.query(`
    SELECT 
      e.id, 
      e.name, 
      e.role, 
      e.allow_lunch_bridge,
      s.id AS shift_id,
      s.title AS shift_title,
      s.shift_code,
      TO_CHAR(s.start_time, 'HH24:MI:SS') AS start_time,
      TO_CHAR(s.end_time, 'HH24:MI:SS') AS end_time,
      TO_CHAR(s.checkin_start, 'HH24:MI:SS') AS checkin_start,
      TO_CHAR(s.checkin_end, 'HH24:MI:SS') AS checkin_end,
      TO_CHAR(s.checkout_start, 'HH24:MI:SS') AS checkout_start,
      TO_CHAR(s.checkout_end, 'HH24:MI:SS') AS checkout_end,
      s.is_evening_period
    FROM employees e
    LEFT JOIN employee_shifts es ON e.id = es.employee_id
    LEFT JOIN shifts s ON es.shift_id = s.id
    ORDER BY e.id, s.start_time
  `);

  // Group by employee
  const map = new Map();
  for (const row of result.rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        name: row.name,
        role: row.role || 'teacher',
        allow_lunch_bridge: row.allow_lunch_bridge !== false,
        shifts: []
      });
    }
    if (row.shift_id) {
      map.get(row.id).shifts.push({
        id: row.shift_id,
        title: row.shift_title,
        shift_code: row.shift_code,
        start_time: row.start_time,
        end_time: row.end_time,
        checkin_start: row.checkin_start,
        checkin_end: row.checkin_end,
        checkout_start: row.checkout_start,
        checkout_end: row.checkout_end,
        is_evening_period: row.is_evening_period
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const rankDiff = getEmployeeShiftRank(a) - getEmployeeShiftRank(b);
    if (rankDiff !== 0) return rankDiff;
    const nameDiff = (a.name || '').localeCompare(b.name || '', 'km');
    if (nameDiff !== 0) return nameDiff;
    return a.id - b.id;
  });
};

/**
 * Fetches all scans for a specific date (YYYY-MM-DD).
 */
exports.getScansForDate = async (targetDate) => {
  const result = await pool.query(`
    SELECT 
      al.id,
      al.employee_id,
      al.scanned_method,
      al.scanned_identifier,
      TO_CHAR(al.timestamp, 'HH24:MI:SS') AS scan_time,
      TO_CHAR(al.timestamp, 'YYYY-MM-DD"T"HH24:MI:SS') AS full_timestamp
    FROM attendance_logs al
    WHERE DATE(al.timestamp) = $1
    ORDER BY al.timestamp ASC
  `, [targetDate]);

  return result.rows;
};

/**
 * Fetches unknown scans (scanned with unregistered cards or fingers) for a date.
 */
exports.getUnknownScansForDate = async (targetDate) => {
  const result = await pool.query(`
    SELECT 
      al.id,
      al.scanned_method,
      al.scanned_identifier,
      TO_CHAR(al.timestamp, 'HH24:MI:SS') AS scan_time
    FROM attendance_logs al
    WHERE DATE(al.timestamp) = $1 AND al.employee_id IS NULL
    ORDER BY al.timestamp DESC
  `, [targetDate]);

  return result.rows;
};

/**
 * Fetches all scans in a month (year, month).
 */
exports.getScansForMonth = async (year, month) => {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const result = await pool.query(`
    SELECT 
      al.id,
      al.employee_id,
      TO_CHAR(al.timestamp, 'YYYY-MM-DD') AS scan_date,
      TO_CHAR(al.timestamp, 'HH24:MI:SS') AS scan_time,
      al.scanned_method
    FROM attendance_logs al
    WHERE al.timestamp >= $1::date AND al.timestamp < ($1::date + INTERVAL '1 month')
    ORDER BY al.timestamp ASC
  `, [startDate]);

  return result.rows;
};

/**
 * Fetches school holidays from database for a specific date or date range.
 */
exports.getSchoolHolidays = async (startDate, endDate) => {
  try {
    let query = `
      SELECT TO_CHAR(holiday_date, 'YYYY-MM-DD') AS holiday_date, name_en, name_km, holiday_type
      FROM school_holidays
    `;
    const params = [];
    if (startDate && endDate) {
      query += ` WHERE holiday_date >= $1::date AND holiday_date <= $2::date`;
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ` WHERE holiday_date = $1::date`;
      params.push(startDate);
    }
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    return [];
  }
};
