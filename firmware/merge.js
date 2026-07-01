const fs = require('fs');
let ino = fs.readFileSync('attendance_system.ino', 'utf8');
const icons = fs.readFileSync('icons.h', 'utf8');
ino = ino.replace('#include "icons.h"', icons);
fs.writeFileSync('attendance_system.ino', ino);
console.log('Merged successfully');
