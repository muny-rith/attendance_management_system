import apiClient from '../../../shared/services/apiClient';

/**
 * Fetch paginated & filtered attendance logs.
 * @param {Object} params - { page, limit, startDate, endDate, search, exportAll }
 */
export const fetchAttendanceLogs = async (params = {}) => {
  try {
    const response = await apiClient.get('/attendance', { params });
    // Normalize response: if response is array (legacy fallback) or envelope
    if (Array.isArray(response.data)) {
      return {
        data: response.data,
        pagination: {
          totalRecords: response.data.length,
          totalPages: 1,
          currentPage: 1,
          limit: response.data.length,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching logs:', error);
    return {
      data: [],
      pagination: {
        totalRecords: 0,
        totalPages: 1,
        currentPage: 1,
        limit: 25,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }
};

/**
 * Fetch aggregated Daily Timesheet and KPI stats for a given date.
 * @param {string} date - 'YYYY-MM-DD'
 */
export const fetchDailyTimesheet = async (date) => {
  try {
    const response = await apiClient.get('/attendance/daily', { params: { date } });
    return response.data;
  } catch (error) {
    console.error('Error fetching daily timesheet:', error);
    return {
      date: date || new Date().toISOString().slice(0, 10),
      kpi: {
        totalEmployees: 0,
        totalScheduled: 0,
        presentCount: 0,
        onTimeCount: 0,
        lateCount: 0,
        absentCount: 0,
        attendanceRate: 0,
      },
      exceptions: [],
      data: [],
    };
  }
};

/**
 * Fetch real-time campus presence of employees.
 */
export const fetchLivePresence = async () => {
  try {
    const response = await apiClient.get('/attendance/presence');
    return response.data;
  } catch (error) {
    console.error('Error fetching live presence:', error);
    return {
      currentTime: '--:--',
      onCampusCount: 0,
      totalEmployees: 0,
      presenceList: [],
    };
  }
};

/**
 * Fetch monthly register matrix.
 * @param {number|string} year
 * @param {number|string} month
 */
export const fetchMonthlyGrid = async (year, month) => {
  try {
    const response = await apiClient.get('/attendance/monthly', { params: { year, month } });
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly grid:', error);
    return {
      year,
      month,
      daysInMonth: 30,
      matrix: [],
    };
  }
};
