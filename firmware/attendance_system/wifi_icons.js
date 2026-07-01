const fs = require('fs');

function rgb565(r, g, b) {
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}

function generateWifi(name, isConnected) {
    const size = 32;
    let code = `const uint16_t ${name}[${size * size}] PROGMEM = {\n  `;
    const pixels = [];
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const cx = x - size / 2;
            const cy = y - (size - 4); // Arc center near bottom
            const dist = Math.sqrt(cx * cx + cy * cy);
            
            let isForeground = false;
            
            // Draw 3 wifi arcs and a dot
            if (cy < 0 && Math.abs(cx) <= Math.abs(cy)) {
                if (dist > 6 && dist < 9) isForeground = true;
                if (dist > 14 && dist < 17) isForeground = true;
                if (dist > 22 && dist < 25) isForeground = true;
            }
            if (dist < 3) isForeground = true;
            
            // If disconnected, draw a slash
            if (!isConnected) {
                if (Math.abs(x - y) < 2) isForeground = false;
                if (Math.abs(x - y) === 2) isForeground = true; // border of slash
            }
            
            if (isForeground) {
                if (!isConnected && Math.abs(x - y) === 2) {
                    pixels.push(rgb565(200, 50, 50)); // Slash border color
                } else if (!isConnected) {
                    pixels.push(rgb565(150, 150, 150)); // Gray when disconnected
                } else {
                    pixels.push(rgb565(50, 200, 50)); // Green when connected
                }
            } else {
                if (!isConnected && Math.abs(x - y) < 2) {
                    pixels.push(rgb565(255, 50, 50)); // Red slash
                } else {
                    pixels.push(rgb565(0, 0, 0)); // Black background
                }
            }
        }
    }
    
    const hexPixels = pixels.map(p => '0x' + p.toString(16).padStart(4, '0').toUpperCase());
    const lines = [];
    for (let i = 0; i < hexPixels.length; i += 16) {
        lines.push(hexPixels.slice(i, i + 16).join(', '));
    }
    
    code += lines.join(',\n  ');
    code += '\n};\n\n';
    return code;
}

function main() {
    let out = generateWifi("icon_wifi_on", true);
    out += generateWifi("icon_wifi_off", false);
    
    // Inject into attendance_system.ino
    let ino = fs.readFileSync('attendance_system.ino', 'utf8');
    ino = ino.replace('// UPDATE UI STUFF HERE', out); 
    // Wait, let's just write to wifi_icons.txt and I will merge it via replace_file_content
    fs.writeFileSync('wifi_icons.txt', out);
    console.log("Generated wifi_icons.txt successfully");
}

main();
