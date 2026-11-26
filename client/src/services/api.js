/**
 * Backward compatibility barrel re-export.
 * Each feature now owns its own API service in features/<feature>/services/
 */
export * from '../features/attendance/services/attendanceApi';
export * from '../features/employees/services/employeeApi';
export * from '../features/shifts/services/shiftApi';
