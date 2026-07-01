-- Table to store registered employees and their RFID/Fingerprint IDs
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    identifier VARCHAR(50) UNIQUE NOT NULL, -- e.g., "D3 00 60 06" or "1"
    method VARCHAR(20) NOT NULL -- 'rfid' or 'fingerprint'
);

-- Table to store the attendance events
CREATE TABLE IF NOT EXISTS attendance_logs (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
