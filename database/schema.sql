-- Table to store registered employees
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
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
    start_time TIME NOT NULL,
    end_time TIME NOT NULL
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

-- Insert default shifts
INSERT INTO shifts (title, start_time, end_time) VALUES
    ('Morning', '06:00', '12:00'),
    ('Afternoon', '12:00', '18:00'),
    ('Evening', '18:00', '23:59')
ON CONFLICT DO NOTHING;
