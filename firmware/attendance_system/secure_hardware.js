const fs = require('fs');
let code = fs.readFileSync('attendance_system.ino', 'utf8');

// 1. Add API_KEY to config block
code = code.replace(
  '// (Managed dynamically via WiFiManager Captive Portal)',
  '// (Managed dynamically via WiFiManager Captive Portal)\nconst char* API_KEY = "moon_attendance_secret_2026";'
);

// 2. Add admin password to captive portal
code = code.replace(
  'bool res = wm.autoConnect("Moon_Setup");',
  'bool res = wm.autoConnect("Moon_Setup", "admin123");'
);

// 3. Add header to networkTaskCode (POST /attendance)
code = code.replace(
  'http.begin(serverUrl);\n        http.addHeader("Content-Type", "application/json");',
  'http.begin(serverUrl);\n        http.addHeader("x-api-key", API_KEY);\n        http.addHeader("Content-Type", "application/json");'
);

// 4. Add header to networkTaskCode (GET /hardware/status)
code = code.replace(
  'http.begin(statusUrl);\n        int httpCode = http.GET();',
  'http.begin(statusUrl);\n        http.addHeader("x-api-key", API_KEY);\n        int httpCode = http.GET();'
);

// 5. Add header to loop (POST /hardware/reset)
code = code.replace(
  'http.begin(String(hardwareUrl) + "/reset");\n    http.POST("");',
  'http.begin(String(hardwareUrl) + "/reset");\n    http.addHeader("x-api-key", API_KEY);\n    http.POST("");'
);

// 6. Add header to postEnrollResult (POST /hardware/enroll_result)
code = code.replace(
  'http.begin(url);\n  http.addHeader("Content-Type", "application/json");',
  'http.begin(url);\n  http.addHeader("x-api-key", API_KEY);\n  http.addHeader("Content-Type", "application/json");'
);

// 7. Add header to syncFingerprints (GET /employees/sync)
code = code.replace(
  'http.begin(syncUrl);\n  \n  int httpCode = http.GET();',
  'http.begin(syncUrl);\n  http.addHeader("x-api-key", API_KEY);\n  \n  int httpCode = http.GET();'
);

fs.writeFileSync('attendance_system.ino', code);
console.log('Hardware secured successfully!');
