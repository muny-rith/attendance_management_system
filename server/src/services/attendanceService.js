const attendanceRepository = require('../repositories/attendanceRepository');

/**
 * Logs attendance from ESP32 scan or manual entry.
 * Guarantees frozen hardware contract: { success: true, name: string }
 */
exports.logAttendance = async (io, { identifier, method, timestamp }) => {
  // 1. Look up employee by identifier
  const employeeMatch = await attendanceRepository.findEmployeeByIdentifier(identifier);

  let employeeId = null;
  let employeeName = 'Unknown User';

  if (employeeMatch) {
    employeeId = employeeMatch.employee_id;
    employeeName = employeeMatch.name;
  } else {
    console.log(`Unknown identifier scanned: ${identifier} via ${method}`);
  }

  // 2. Insert the scan log
  const insertedLogId = await attendanceRepository.createLog({
    employeeId,
    method,
    identifier,
    timestamp,
  });

  // 3. Fetch newly inserted log with shift and employee metadata
  const newLog = await attendanceRepository.getLogWithDetailsById(insertedLogId);

  // 4. Emit real-time event to all connected dashboard clients
  if (io && newLog) {
    io.emit('new_scan', newLog);
  }

  console.log(`Logged: ${employeeName} via ${method}`);
  return { success: true, name: employeeName };
};

/**
 * Returns paginated, filtered attendance logs for the dashboard.
 */
exports.getLogs = async (queryParams = {}) => {
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 25;
  const startDate = queryParams.startDate || null;
  const endDate = queryParams.endDate || null;
  const search = queryParams.search || null;
  const exportAll = queryParams.exportAll === 'true' || queryParams.all === 'true';

  const { rows, totalCount } = await attendanceRepository.getLogsPaginated({
    page,
    limit,
    startDate,
    endDate,
    search,
    exportAll,
  });

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return {
    data: rows,
    pagination: {
      totalRecords: totalCount,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};
