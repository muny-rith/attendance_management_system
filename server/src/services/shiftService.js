const shiftRepository = require('../repositories/shiftRepository');

exports.getShifts = async () => {
  return await shiftRepository.findAll();
};

exports.addShift = async (shiftData) => {
  const shift = await shiftRepository.create(shiftData);
  return { success: true, shift };
};

exports.updateShift = async (id, shiftData) => {
  const shift = await shiftRepository.update(id, shiftData);
  if (!shift) {
    const error = new Error('Shift not found');
    error.statusCode = 404;
    throw error;
  }
  return { success: true, shift };
};

exports.deleteShift = async (id) => {
  await shiftRepository.delete(id);
  return { success: true, message: 'Shift deleted' };
};

exports.assignShift = async ({ employee_id, shift_id }) => {
  await shiftRepository.assignShift(null, employee_id, shift_id);
  return { success: true, message: 'Shift assigned successfully' };
};

exports.unassignShift = async ({ employee_id, shift_id }) => {
  await shiftRepository.unassignShift(employee_id, shift_id);
  return { success: true, message: 'Shift unassigned successfully' };
};
