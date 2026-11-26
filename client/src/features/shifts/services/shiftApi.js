import apiClient from '../../../shared/services/apiClient';

export const fetchShifts = async () => {
  try {
    const response = await apiClient.get('/shifts');
    return response.data;
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return [];
  }
};

export const addShift = async (shiftData) => {
  try {
    const response = await apiClient.post('/shifts', shiftData);
    return response.data;
  } catch (error) {
    console.error('Error adding shift:', error);
    return { success: false };
  }
};

export const updateShift = async (id, shiftData) => {
  try {
    const response = await apiClient.put(`/shifts/${id}`, shiftData);
    return response.data;
  } catch (error) {
    console.error('Error updating shift:', error);
    return { success: false };
  }
};

export const deleteShift = async (id) => {
  try {
    const response = await apiClient.delete(`/shifts/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting shift:', error);
    return { success: false };
  }
};

export const assignShift = async (payload) => {
  try {
    const response = await apiClient.post('/shifts/assign', payload);
    return response.data;
  } catch (error) {
    console.error('Error assigning shift:', error);
    return { success: false };
  }
};

export const unassignShift = async (payload) => {
  try {
    const response = await apiClient.post('/shifts/unassign', payload);
    return response.data;
  } catch (error) {
    console.error('Error unassigning shift:', error);
    return { success: false };
  }
};
