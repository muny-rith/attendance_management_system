const fs = require('fs');

function rgb565(r, g, b) {
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}

function generateIcon(name, colorBg, drawFunc) {
    const size = 64;
    let code = `const uint16_t ${name}[${size * size}] PROGMEM = {\n  `;
    const pixels = [];
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const cx = x - size / 2;
            const cy = y - size / 2;
            const dist = Math.sqrt(cx * cx + cy * cy);
            
            if (dist < 30) {
                if (drawFunc(x, y)) {
                    pixels.push(rgb565(255, 255, 255));
                } else {
                    pixels.push(rgb565(colorBg[0], colorBg[1], colorBg[2]));
                }
            } else {
                pixels.push(rgb565(0, 0, 0)); // Black
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

function drawCheck(x, y) {
    if (x >= 20 && x <= 30 && y >= 35 && y <= 45) {
        return Math.abs((x - 20) - (45 - y)) < 3;
    }
    if (x >= 30 && x <= 45 && y >= 20 && y <= 45) {
        return Math.abs((x - 30) - (y - 45) * -0.6) < 3;
    }
    return false;
}

function drawCross(x, y) {
    const cx = x - 32;
    const cy = y - 32;
    if (Math.abs(cx - cy) < 4 && Math.abs(cx) < 15) return true;
    if (Math.abs(cx + cy) < 4 && Math.abs(cx) < 15) return true;
    return false;
}

function drawScan(x, y) {
    const cx = x - 32;
    const cy = y - 32;
    if (Math.abs(cy) < 2 && Math.abs(cx) < 20) return true;
    if (Math.abs(cy - 10) < 2 && Math.abs(cx) < 15) return true;
    if (Math.abs(cy + 10) < 2 && Math.abs(cx) < 15) return true;
    return false;
}

function main() {
    let out = "#ifndef ICONS_H\n#define ICONS_H\n\n#include <pgmspace.h>\n\n";
    out += generateIcon("icon_success", [30, 200, 30], drawCheck);
    out += generateIcon("icon_error", [220, 30, 30], drawCross);
    out += generateIcon("icon_scan", [30, 100, 220], drawScan);
    out += "#endif\n";
    
    fs.writeFileSync('icons.h', out);
    console.log("Generated icons.h successfully");
}

main();
