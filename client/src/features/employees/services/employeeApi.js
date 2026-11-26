import apiClient from '../../../shared/services/apiClient';

export const fetchEmployees = async () => {
  try {
    const response = await apiClient.get('/employees');
    return response.data;
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
};

export const addEmployee = async (employeeData) => {
  try {
    const response = await apiClient.post('/employees', employeeData);
    return response.data;
  } catch (error) {
    console.error('Error adding employee:', error);
    return { success: false };
  }
};

export const editEmployee = async (id, employeeData) => {
  try {
    const response = await apiClient.put(`/employees/${id}`, employeeData);
    return response.data;
  } catch (error) {
    console.error('Error editing employee:', error);
    return { success: false };
  }
};

export const deleteEmployee = async (id) => {
  try {
    const response = await apiClient.delete(`/employees/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { success: false };
  }
};

export const addIdentifier = async (employeeId, identifierData) => {
  try {
    const response = await apiClient.post(`/employees/${employeeId}/identifiers`, identifierData);
    return response.data;
  } catch (error) {
    console.error('Error adding identifier:', error);
    return { success: false };
  }
};

export const removeIdentifier = async (identifierId) => {
  try {
    const response = await apiClient.delete(`/employees/identifiers/${identifierId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing identifier:', error);
    return { success: false };
  }
};

// --- Hardware Scanner State Controls ---
export const checkHardwareOnline = async () => {
  try {
    const response = await apiClient.get('/hardware/check_online');
    return response.data;
  } catch (error) {
    console.error('Error checking hardware status:', error);
    return { isOnline: false };
  }
};

export const setHardwareMode = async (mode) => {
  try {
    const response = await apiClient.post('/hardware/set_mode', { mode });
    return response.data;
  } catch (error) {
    console.error('Error setting hardware mode:', error);
    return { success: false };
  }
};
