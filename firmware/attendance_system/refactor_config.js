const fs = require('fs');
let code = fs.readFileSync('attendance_system.ino', 'utf8');

// 1. Remove old declarations
code = code.replace('const char* ssid = "MCU";\n', '');
code = code.replace('const char* password = "Roth2001";\n', '');
code = code.replace('// Update this with your computer\'s local IP address (run \'ipconfig\' in command prompt to find it)\n', '');
code = code.replace('const char* serverUrl = "http://192.168.100.16:3000/attendance";\n', '');
code = code.replace('const char* hardwareUrl = "http://192.168.100.16:3000/hardware";\n', '');
code = code.replace('const char* ntpServer = "pool.ntp.org";\n', '');
code = code.replace('const long  gmtOffset_sec = 7 * 3600; // GMT+7 for Cambodia/Thailand\n', '');
code = code.replace('const int   daylightOffset_sec = 0;\n', '');

// Remove syncUrl inside the function
code = code.replace('  String syncUrl = "http://192.168.100.16:3000/employees/sync";\n', '');

// 2. Create the Configuration Block
const configBlock = `// ==========================================
// ====== SYSTEM CONFIGURATION BLOCK ======
// ==========================================
// 1. Wi-Fi Configuration
const char* ssid     = "MCU";
const char* password = "Roth2001";

// 2. Server URLs (Update these with your real server IP or domain)
const char* serverUrl   = "http://192.168.100.16:3000/attendance";
const char* hardwareUrl = "http://192.168.100.16:3000/hardware";
const char* syncUrl     = "http://192.168.100.16:3000/employees/sync";

// 3. Time & Timezone Configuration
const char* ntpServer          = "pool.ntp.org";
const long  gmtOffset_sec      = 7 * 3600; // GMT+7
const int   daylightOffset_sec = 0;
// ==========================================

`;

// 3. Insert right after the #include lines, before #ifndef ICONS_H
code = code.replace('#ifndef ICONS_H', configBlock + '#ifndef ICONS_H');

fs.writeFileSync('attendance_system.ino', code);
console.log('Configuration extracted to the top successfully!');
