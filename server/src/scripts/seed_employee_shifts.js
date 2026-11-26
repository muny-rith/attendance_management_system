const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('../config/db');

async function seedEmployeeShifts() {
  const client = await pool.connect();
  try {
    console.log('=== Updating Employee Shift Assignments ===\n');
    await client.query('BEGIN');

    // 1. Fetch current shift IDs by shift_code
    const shiftsRes = await client.query('SELECT id, shift_code, title FROM shifts');
    const shiftMap = {};
    for (const row of shiftsRes.rows) {
      if (row.shift_code) {
        shiftMap[row.shift_code] = row.id;
      }
    }
    console.log('Available Shift Map:', shiftMap);

    const MORNING = shiftMap['morning'];
    const AFTERNOON = shiftMap['afternoon'];
    const EVENING_1 = shiftMap['evening_p1'];
    const EVENING_2 = shiftMap['evening_p2'];
    const FULL_DAY = shiftMap['full_day'];

    // 2. Define verified assignment mapping
    const assignments = [
      // Cleaner / Full-Day
      { id: 16, name: 'ពូង រេម', role: 'cleaner', shifts: [FULL_DAY] },

      // Full-Time Teachers (Morning + Afternoon)
      { id: 6, name: 'គង់ ស្រីតូច', role: 'teacher', shifts: [MORNING, AFTERNOON] },
      { id: 7, name: 'ណែម ស៊ីណៃ', role: 'teacher', shifts: [MORNING, AFTERNOON] },
      { id: 1, name: 'ជា ស្រីពៅ', role: 'teacher', shifts: [MORNING, AFTERNOON] },
      { id: 18, name: 'យូ រ៉ានី', role: 'teacher', shifts: [MORNING, AFTERNOON] },
      { id: 8, name: 'ម៉ា ចាន់ណា', role: 'teacher', shifts: [MORNING, AFTERNOON] },

      // Morning Only Teachers
      { id: 2, name: 'ហ៊ួរ រក្សា', role: 'teacher', shifts: [MORNING] },
      { id: 5, name: 'ស៊ីវ រត្ថនា', role: 'teacher', shifts: [MORNING] },
      { id: 19, name: 'ទិត ពិសី', role: 'teacher', shifts: [MORNING] },

      // Evening Part-Time (P1 + P2)
      { id: 11, name: 'ឃុត រ៉ែន', role: 'teacher', shifts: [EVENING_1, EVENING_2] },
      { id: 13, name: 'ផល រចនា', role: 'teacher', shifts: [EVENING_1, EVENING_2] },
      { id: 14, name: 'គង់ មីនា', role: 'teacher', shifts: [EVENING_1, EVENING_2] },
      { id: 17, name: 'មិន ស្រីមុំ', role: 'teacher', shifts: [EVENING_1, EVENING_2] },
      { id: 15, name: 'ហង្ស សុវណ្ណមនីរជ្ជនី', role: 'teacher', shifts: [EVENING_1, EVENING_2] },

      // Evening 2 Only
      { id: 10, name: 'សឺន សី', role: 'teacher', shifts: [EVENING_2] },

      // All-Round / Multi-Shift Teachers
      { id: 12, name: 'គីន កក្កដា', role: 'teacher', shifts: [MORNING, AFTERNOON, EVENING_1, EVENING_2] },
      { id: 3, name: 'ស៊ន់ សុវណ្ណ', role: 'teacher', shifts: [MORNING, AFTERNOON, EVENING_2] },
      { id: 9, name: 'ហាំ ហេង', role: 'teacher', shifts: [MORNING, EVENING_2] },
    ];

    for (const item of assignments) {
      // Update role
      await client.query('UPDATE employees SET role = $1 WHERE id = $2', [item.role, item.id]);

      // Clear existing assignments for this employee
      await client.query('DELETE FROM employee_shifts WHERE employee_id = $1', [item.id]);

      // Insert verified shift assignments
      for (const shiftId of item.shifts) {
        if (shiftId) {
          await client.query(
            'INSERT INTO employee_shifts (employee_id, shift_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [item.id, shiftId]
          );
        }
      }
      console.log(`Updated: ${item.name} (${item.role}) -> ${item.shifts.length} shifts assigned.`);
    }

    await client.query('COMMIT');
    console.log('\n--- All assignments committed successfully! ---\n');

    // 3. Query back to verify
    const verifyRes = await client.query(`
      SELECT 
        e.id,
        e.name,
        e.role,
        STRING_AGG(s.title, ', ' ORDER BY s.start_time) as assigned_shifts
      FROM employees e
      LEFT JOIN employee_shifts es ON e.id = es.employee_id
      LEFT JOIN shifts s ON es.shift_id = s.id
      GROUP BY e.id, e.name, e.role
      ORDER BY e.id
    `);

    console.log('Verified Employee Shifts in Database:');
    console.table(verifyRes.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding employee shifts:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedEmployeeShifts();
