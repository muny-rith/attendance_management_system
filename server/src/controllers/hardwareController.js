let hardwareState = {
  mode: 'attendance', // 'attendance', 'enroll_fingerprint', 'enroll_rfid', 'sync'
  lastSeen: 0
};

exports.triggerSync = () => {
  hardwareState.mode = 'sync';
};

exports.getStatus = (req, res) => {
  hardwareState.lastSeen = Date.now();
  res.json({ mode: hardwareState.mode });
};

exports.setMode = (req, res) => {
  const { mode } = req.body;
  if (['attendance', 'enroll_fingerprint', 'enroll_rfid', 'sync'].includes(mode)) {
    hardwareState.mode = mode;
    res.json({ success: true, mode: hardwareState.mode });
  } else {
    res.status(400).json({ success: false, message: 'Invalid mode' });
  }
};

exports.checkOnline = (req, res) => {
  const isOnline = (Date.now() - hardwareState.lastSeen) < 10000; // 10 seconds threshold
  res.json({ isOnline });
};

exports.enrollResult = (req, res) => {
  const { identifier } = req.body;
  
  // ESP32 successfully enrolled a fingerprint or RFID.
  // Switch mode back to attendance
  hardwareState.mode = 'attendance';
  
  // Notify frontend via websocket
  if (req.io) {
    req.io.emit('enroll_success', { identifier });
  }
  
  res.json({ success: true });
};
