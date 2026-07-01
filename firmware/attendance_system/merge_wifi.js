const fs = require('fs');
let ino = fs.readFileSync('attendance_system.ino', 'utf8');
const wifi = fs.readFileSync('wifi_icons.txt', 'utf8');
ino = ino.replace('const char* ssid = "MCU";', wifi + '\nconst char* ssid = "MCU";');
fs.writeFileSync('attendance_system.ino', ino);
console.log('Merged wifi_icons.txt successfully');
