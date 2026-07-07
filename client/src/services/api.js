import axios from 'axios';

// Configure in client/.env:
//   VITE_API_URL=http://localhost:3000
//   VITE_API_KEY=moon_attendance_secret_2026
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Axios instance with API key header pre-configured
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'x-api-key': API_KEY,
  },
});

// --- Attendance ---
export const fetchAttendanceLogs = async () => {
  try {
    const response = await api.get('/attendance');
    return response.data;
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
};

// --- Employees ---
export const fetchEmployees = async () => {
  try {
    const response = await api.get('/employees');
    return response.data;
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
};

export const addEmployee = async (employeeData) => {
  // employeeData: { name, identifiers: [{ identifier, method, label }], shift_ids: [1,2] }
  try {
    const response = await api.post('/employees', employeeData);
    return response.data;
  } catch (error) {
    console.error("Error adding employee:", error);
    return { success: false };
  }
};

export const deleteEmployee = async (id) => {
  try {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting employee:", error);
    return { success: false };
  }
};

export const editEmployee = async (id, employeeData) => {
  try {
    const response = await api.put(`/employees/${id}`, employeeData);
    return response.data;
  } catch (error) {
    console.error("Error editing employee:", error);
    return { success: false };
  }
};

// --- Identifiers ---
export const addIdentifier = async (employeeId, identifierData) => {
  try {
    const response = await api.post(`/employees/${employeeId}/identifiers`, identifierData);
    return response.data;
  } catch (error) {
    console.error("Error adding identifier:", error);
    return { success: false };
  }
};

export const removeIdentifier = async (identifierId) => {
  try {
    const response = await api.delete(`/employees/identifiers/${identifierId}`);
    return response.data;
  } catch (error) {
    console.error("Error removing identifier:", error);
    return { success: false };
  }
};

// --- Shifts ---
export const fetchShifts = async () => {
  try {
    const response = await api.get('/shifts');
    return response.data;
  } catch (error) {
    console.error("Error fetching shifts:", error);
    return [];
  }
};

export const addShift = async (shiftData) => {
  try {
    const response = await api.post('/shifts', shiftData);
    return response.data;
  } catch (error) {
    console.error("Error adding shift:", error);
    return { success: false };
  }
};

export const updateShift = async (id, shiftData) => {
  try {
    const response = await api.put(`/shifts/${id}`, shiftData);
    return response.data;
  } catch (error) {
    console.error("Error updating shift:", error);
    return { success: false };
  }
};

export const deleteShift = async (id) => {
  try {
    const response = await api.delete(`/shifts/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting shift:", error);
    return { success: false };
  }
};

export const assignShift = async (employee_id, shift_id) => {
  try {
    const response = await api.post('/shifts/assign', { employee_id, shift_id });
    return response.data;
  } catch (error) {
    console.error("Error assigning shift:", error);
    return { success: false };
  }
};

export const unassignShift = async (employee_id, shift_id) => {
  try {
    const response = await api.post('/shifts/unassign', { employee_id, shift_id });
    return response.data;
  } catch (error) {
    console.error("Error unassigning shift:", error);
    return { success: false };
  }
};

// --- Hardware ---
export const checkHardwareOnline = async () => {
  try {
    const response = await api.get('/hardware/check_online');
    return response.data;
  } catch (error) {
    console.error("Error checking hardware status:", error);
    return { isOnline: false };
  }
};

export const setHardwareMode = async (mode) => {
  try {
    const response = await api.post('/hardware/set_mode', { mode });
    return response.data;
  } catch (error) {
    console.error("Error setting hardware mode:", error);
    return { success: false };
  }
};


