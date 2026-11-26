-- Table to store registered employees
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'teacher',
    allow_lunch_bridge BOOLEAN DEFAULT true
);

-- Table to store multiple identifiers per employee (RFID cards, fingerprints)
CREATE TABLE IF NOT EXISTS employee_identifiers (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    identifier VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "D3 00 60 06" or "1"
    method VARCHAR(20) NOT NULL,             -- 'rfid' or 'fingerprint'
    label VARCHAR(50)                        -- optional: "Left Thumb", "Backup Card"
);

-- Table to define work shifts
CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(50) NOT NULL,
    shift_code VARCHAR(30),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    checkin_start TIME,
    checkin_end TIME,
    checkout_start TIME,
    checkout_end TIME,
    is_evening_period BOOLEAN DEFAULT false
);

-- Junction table: assign employees to shifts (many-to-many)
CREATE TABLE IF NOT EXISTS employee_shifts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
    UNIQUE(employee_id, shift_id)
);

-- Table to store the attendance scan events
CREATE TABLE IF NOT EXISTS attendance_logs (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    scanned_method VARCHAR(20),
    scanned_identifier VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard school shifts
INSERT INTO shifts (title, shift_code, start_time, end_time, checkin_start, checkin_end, checkout_start, checkout_end, is_evening_period) VALUES
    ('Morning', 'morning', '06:45', '10:45', '06:15', '07:30', '10:30', '11:45', false),
    ('Afternoon', 'afternoon', '12:45', '16:45', '12:15', '13:30', '16:30', '17:45', false),
    ('Evening 1', 'evening_p1', '17:30', '18:30', '17:00', '17:45', '18:25', '18:45', true),
    ('Evening 2', 'evening_p2', '18:30', '19:30', '18:15', '18:45', '19:25', '20:15', true),
    ('Full-Day', 'full_day', '06:45', '16:45', '06:15', '07:30', '16:30', '17:45', false)
ON CONFLICT DO NOTHING;
