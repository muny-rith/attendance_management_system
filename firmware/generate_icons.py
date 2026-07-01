import math

def rgb565(r, g, b):
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)

def generate_icon(name, color_bg, draw_func):
    size = 64
    code = f"const uint16_t {name}[{size * size}] PROGMEM = {{\n  "
    pixels = []
    
    for y in range(size):
        for x in range(size):
            cx = x - size / 2
            cy = y - size / 2
            dist = math.sqrt(cx*cx + cy*cy)
            
            # Anti-aliased circle background
            if dist < 30:
                is_fg = draw_func(x, y, size)
                if is_fg:
                    pixels.append(rgb565(255, 255, 255))
                else:
                    pixels.append(rgb565(color_bg[0], color_bg[1], color_bg[2]))
            else:
                pixels.append(rgb565(0, 0, 0)) # Black background
                
    # Convert to hex strings
    hex_pixels = [f"0x{p:04X}" for p in pixels]
    
    # Format into lines
    lines = []
    for i in range(0, len(hex_pixels), 16):
        lines.append(", ".join(hex_pixels[i:i+16]))
        
    code += ",\n  ".join(lines)
    code += "\n};\n\n"
    return code

def draw_check(x, y, size):
    # A simple checkmark
    # center is 32, 32
    if 20 <= x <= 30 and 35 <= y <= 45:
        return abs((x - 20) - (45 - y)) < 3
    if 30 <= x <= 45 and 20 <= y <= 45:
        return abs((x - 30) - (y - 45)*-0.6) < 3
    return False

def draw_cross(x, y, size):
    cx = x - 32
    cy = y - 32
    if abs(cx - cy) < 4 and abs(cx) < 15: return True
    if abs(cx + cy) < 4 and abs(cx) < 15: return True
    return False

def draw_scan(x, y, size):
    cx = x - 32
    cy = y - 32
    if abs(cy) < 2 and abs(cx) < 20: return True
    if abs(cy - 10) < 2 and abs(cx) < 15: return True
    if abs(cy + 10) < 2 and abs(cx) < 15: return True
    return False

def main():
    out = "#ifndef ICONS_H\n#define ICONS_H\n\n#include <pgmspace.h>\n\n"
    
    # Success: Green circle, white check
    out += generate_icon("icon_success", (30, 200, 30), draw_check)
    
    # Error: Red circle, white cross
    out += generate_icon("icon_error", (220, 30, 30), draw_cross)
    
    # Scan: Blue circle, white waves
    out += generate_icon("icon_scan", (30, 100, 220), draw_scan)
    
    out += "#endif\n"
    
    with open("icons.h", "w") as f:
        f.write(out)
        
    print("Generated icons.h successfully.")

if __name__ == "__main__":
    main()
