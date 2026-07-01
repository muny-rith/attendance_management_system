import axios from 'axios';

// When running locally, point to the Express server on port 3000
const API_URL = 'http://localhost:3000';

export const fetchAttendanceLogs = async () => {
  try {
    const response = await axios.get(`${API_URL}/attendance`);
    return response.data;
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
};

export const fetchEmployees = async () => {
  try {
    const response = await axios.get(`${API_URL}/employees`);
    return response.data;
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
};

export const addEmployee = async (employeeData) => {
  try {
    const response = await axios.post(`${API_URL}/employees`, employeeData);
    return response.data;
  } catch (error) {
    console.error("Error adding employee:", error);
    return { success: false };
  }
};

export const deleteEmployee = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/employees/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting employee:", error);
    return { success: false };
  }
};

export const editEmployee = async (id, employeeData) => {
  try {
    const response = await axios.put(`${API_URL}/employees/${id}`, employeeData);
    return response.data;
  } catch (error) {
    console.error("Error editing employee:", error);
    return { success: false };
  }
};

export const checkHardwareOnline = async () => {
  try {
    const response = await axios.get(`${API_URL}/hardware/check_online`);
    return response.data;
  } catch (error) {
    console.error("Error checking hardware status:", error);
    return { isOnline: false };
  }
};

export const setHardwareMode = async (mode) => {
  try {
    const response = await axios.post(`${API_URL}/hardware/set_mode`, { mode });
    return response.data;
  } catch (error) {
    console.error("Error setting hardware mode:", error);
    return { success: false };
  }
};
