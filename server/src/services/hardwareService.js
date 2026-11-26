/**
 * Hardware Service
 * Manages ESP32 scanner state, heartbeat tracking, and mode transitions.
 * NOTE: Keeps exact state and mode definitions to preserve hardware compatibility.
 */

const VALID_MODES = ['attendance', 'enroll_fingerprint', 'enroll_rfid', 'sync'];

const hardwareState = {
  mode: 'attendance',
  lastSeen: 0,
};

exports.triggerSync = () => {
  hardwareState.mode = 'sync';
};

exports.getStatus = () => {
  hardwareState.lastSeen = Date.now();
  return { mode: hardwareState.mode };
};

exports.setMode = (mode) => {
  if (VALID_MODES.includes(mode)) {
    hardwareState.mode = mode;
    return { success: true, mode: hardwareState.mode };
  }
  const error = new Error('Invalid mode');
  error.statusCode = 400;
  throw error;
};

exports.checkOnline = () => {
  // 10-second threshold for ESP32 heartbeat ping
  const isOnline = (Date.now() - hardwareState.lastSeen) < 10000;
  return { isOnline };
};

exports.enrollResult = (io, identifier) => {
  // ESP32 successfully enrolled a fingerprint or RFID tag.
  // Switch mode back to attendance.
  hardwareState.mode = 'attendance';

  // Broadcast event to frontend via WebSocket
  if (io) {
    io.emit('enroll_success', { identifier });
  }

  return { success: true };
};
