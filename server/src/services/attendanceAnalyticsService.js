const analyticsRepo = require('../repositories/attendanceAnalyticsRepository');
const { checkNonWorkingDay, getCambodiaNow } = require('../utils/khmerCalendar');

// Helper to convert 'HH:MM:SS' string to fractional minutes (for duration math)
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 60 + m + (s ? s / 60 : 0);
}

// Converts 'HH:MM:SS' to whole minutes from midnight (ignores seconds so 06:45:59 is still 06:45; late starts at 06:46)
function toWholeMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function calcLateMins(scanTimeStr, shiftStartStr) {
  return Math.max(0, toWholeMinutes(scanTimeStr) - toWholeMinutes(shiftStartStr));
}

function calcEarlyMins(scanTimeStr, shiftEndStr) {
  return Math.max(0, toWholeMinutes(shiftEndStr) - toWholeMinutes(scanTimeStr));
}

function isShiftEnded(shiftEndStr, dateType, nowMinutes) {
  if (dateType === 'PAST') return true;
  if (dateType === 'FUTURE') return false;
  return nowMinutes >= toWholeMinutes(shiftEndStr);
}

// Helper to format minutes to 'Xh Ym'
function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

/**
 * Evaluates all scheduled shift blocks and scans for a single employee on a date.
 * Shared by getDailyTimesheet and getMonthlyGrid so rules stay consistent.
 */
function evaluateEmployeeDay({ emp, empScans, dateType, nowMinutes, nonWorking }) {
  const assignedShifts = emp.shifts || [];
  const isScheduled = assignedShifts.length > 0;

  let morningData = null;
  let afternoonData = null;
  let eveningData = null;
  let fullDayData = null;

  let hasAnyLate = false;
  let hasAnyPresent = false;
  let hasMissingCheckout = false;
  let totalWorkedMinutes = 0;

  const exceptions = [];
  const shiftBlocks = [];

  const fullDayShift = assignedShifts.find(s => s.shift_code === 'full_day');
  const morningShift = assignedShifts.find(s => s.shift_code === 'morning');
  const afternoonShift = assignedShifts.find(s => s.shift_code === 'afternoon');
  const eveningShifts = assignedShifts.filter(s => s.is_evening_period);

  // 1. Cleaner / Full-Day Evaluation (06:45 - 16:45)
  if (fullDayShift) {
    const startStr = fullDayShift.start_time || '06:45:00';
    const endStr = fullDayShift.end_time || '16:45:00';
    const inScan = empScans.find(s => timeToMinutes(s.scan_time) >= 360 && timeToMinutes(s.scan_time) <= 540); // 06:00 - 09:00
    const outScan = [...empScans].reverse().find(s => timeToMinutes(s.scan_time) >= 990 && timeToMinutes(s.scan_time) <= 1140); // 16:30 - 19:00

    if (inScan) {
      hasAnyPresent = true;
      const inMins = timeToMinutes(inScan.scan_time);
      const lateMins = calcLateMins(inScan.scan_time, startStr);

      if (lateMins > 0) {
        hasAnyLate = true;
        exceptions.push({
          type: 'LATE',
          employeeId: emp.id,
          employeeName: emp.name,
          shiftTitle: 'Full-Day',
          mins: lateMins,
          message: `${emp.name} arrived ${lateMins}m late (scanned at ${inScan.scan_time.slice(0, 5)})`
        });
      }

      let outTime = outScan ? outScan.scan_time.slice(0, 5) : null;
      let earlyMins = 0;
      if (outScan) {
        const outMins = timeToMinutes(outScan.scan_time);
        earlyMins = calcEarlyMins(outScan.scan_time, endStr);
        totalWorkedMinutes += Math.max(0, outMins - inMins);
      } else {
        hasMissingCheckout = true;
      }

      fullDayData = {
        in: inScan.scan_time.slice(0, 5),
        out: outTime,
        isLate: lateMins > 0,
        lateMins,
        isEarly: earlyMins > 0,
        earlyMins,
        method: inScan.scanned_method
      };
    }

    shiftBlocks.push({ endTime: endStr, attended: Boolean(fullDayData) });
  }

  // 2. Morning Shift Evaluation (06:45 - 10:45)
  if (morningShift) {
    const startStr = morningShift.start_time || '06:45:00';
    const endStr = morningShift.end_time || '10:45:00';
    const inScan = empScans.find(s => timeToMinutes(s.scan_time) >= 360 && timeToMinutes(s.scan_time) <= 570); // 06:00 - 09:30
    const outScan = [...empScans].reverse().find(s => timeToMinutes(s.scan_time) >= 630 && timeToMinutes(s.scan_time) <= 720); // 10:30 - 12:00

    // Smart Lunch Bridge (Stay-Over): Morning In exists, Afternoon Out exists, but no noon scans
    const afternoonOutScan = afternoonShift && [...empScans].reverse().find(s => timeToMinutes(s.scan_time) >= 990 && timeToMinutes(s.scan_time) <= 1080);
    const isStayOver = Boolean(emp.allow_lunch_bridge && inScan && !outScan && afternoonOutScan);

    if (inScan) {
      hasAnyPresent = true;
      const inMins = timeToMinutes(inScan.scan_time);
      const lateMins = calcLateMins(inScan.scan_time, startStr);

      if (lateMins > 0) {
        hasAnyLate = true;
        exceptions.push({
          type: 'LATE',
          employeeId: emp.id,
          employeeName: emp.name,
          shiftTitle: 'Morning',
          mins: lateMins,
          message: `${emp.name} arrived ${lateMins}m late for Morning shift (at ${inScan.scan_time.slice(0, 5)})`
        });
      }

      let outTime = outScan ? outScan.scan_time.slice(0, 5) : (isStayOver ? '10:45 (Stayed)' : null);
      let earlyMins = 0;
      if (outScan) {
        const outMins = timeToMinutes(outScan.scan_time);
        earlyMins = calcEarlyMins(outScan.scan_time, endStr);
        totalWorkedMinutes += Math.max(0, outMins - inMins);
      } else if (isStayOver) {
        totalWorkedMinutes += 240; // 4 hours
      } else {
        hasMissingCheckout = true;
      }

      morningData = {
        in: inScan.scan_time.slice(0, 5),
        out: outTime,
        isLate: lateMins > 0,
        lateMins,
        isEarly: earlyMins > 0,
        earlyMins,
        isStayOver,
        method: inScan.scanned_method
      };
    }

    shiftBlocks.push({ endTime: endStr, attended: Boolean(morningData) });
  }

  // 3. Afternoon Shift Evaluation (12:45 - 16:45)
  if (afternoonShift) {
    const startStr = afternoonShift.start_time || '12:45:00';
    const endStr = afternoonShift.end_time || '16:45:00';
    const inScan = empScans.find(s => timeToMinutes(s.scan_time) >= 720 && timeToMinutes(s.scan_time) <= 840); // 12:00 - 14:00
    const outScan = [...empScans].reverse().find(s => timeToMinutes(s.scan_time) >= 990 && timeToMinutes(s.scan_time) <= 1080); // 16:30 - 18:00

    const morningInScan = morningShift && empScans.find(s => timeToMinutes(s.scan_time) >= 360 && timeToMinutes(s.scan_time) <= 570);
    const isStayOver = Boolean(emp.allow_lunch_bridge && morningInScan && !inScan && outScan);

    if (inScan || isStayOver) {
      hasAnyPresent = true;
      let inTime = inScan ? inScan.scan_time.slice(0, 5) : '12:45 (Stayed)';
      let lateMins = 0;

      if (inScan) {
        lateMins = calcLateMins(inScan.scan_time, startStr);

        if (lateMins > 0) {
          hasAnyLate = true;
          exceptions.push({
            type: 'LATE',
            employeeId: emp.id,
            employeeName: emp.name,
            shiftTitle: 'Afternoon',
            mins: lateMins,
            message: `${emp.name} arrived ${lateMins}m late for Afternoon shift (at ${inScan.scan_time.slice(0, 5)})`
          });
        }
      }

      let outTime = outScan ? outScan.scan_time.slice(0, 5) : null;
      let earlyMins = 0;
      if (outScan) {
        const outMins = timeToMinutes(outScan.scan_time);
        earlyMins = calcEarlyMins(outScan.scan_time, endStr);
        if (inScan) {
          totalWorkedMinutes += Math.max(0, outMins - timeToMinutes(inScan.scan_time));
        } else {
          totalWorkedMinutes += 240; // 4 hours
        }
      } else {
        hasMissingCheckout = true;
      }

      afternoonData = {
        in: inTime,
        out: outTime,
        isLate: lateMins > 0,
        lateMins,
        isEarly: earlyMins > 0,
        earlyMins,
        isStayOver,
        method: inScan ? inScan.scanned_method : (outScan ? outScan.scanned_method : 'system')
      };
    }

    shiftBlocks.push({ endTime: endStr, attended: Boolean(afternoonData) });
  }

  // 4. Evening Shifts Evaluation (17:30 - 18:30 / 19:30)
  if (eveningShifts.length > 0) {
    const isTwoPeriods = eveningShifts.length >= 2;
    const startStr = isTwoPeriods ? '17:30:00' : eveningShifts[0].start_time;
    const latestEndTime = eveningShifts.reduce((maxStr, s) => (
      toWholeMinutes(s.end_time) > toWholeMinutes(maxStr) ? s.end_time : maxStr
    ), isTwoPeriods ? '19:30:00' : eveningShifts[0].end_time);

    const inScan = empScans.find(s => timeToMinutes(s.scan_time) >= 1020 && timeToMinutes(s.scan_time) <= 1120); // 17:00 - 18:40
    const outScan = [...empScans].reverse().find(s => timeToMinutes(s.scan_time) >= 1100 && timeToMinutes(s.scan_time) <= 1230); // 18:20 - 20:30

    if (inScan) {
      hasAnyPresent = true;
      const inMins = timeToMinutes(inScan.scan_time);
      const lateMins = calcLateMins(inScan.scan_time, startStr);

      if (lateMins > 0) {
        hasAnyLate = true;
        exceptions.push({
          type: 'LATE',
          employeeId: emp.id,
          employeeName: emp.name,
          shiftTitle: 'Evening',
          mins: lateMins,
          message: `${emp.name} arrived ${lateMins}m late for Evening shift (at ${inScan.scan_time.slice(0, 5)})`
        });
      }

      let outTime = outScan ? outScan.scan_time.slice(0, 5) : null;
      let earlyMins = 0;
      if (outScan) {
        const outMins = timeToMinutes(outScan.scan_time);
        earlyMins = calcEarlyMins(outScan.scan_time, latestEndTime);
        totalWorkedMinutes += Math.max(0, outMins - inMins);
      } else {
        hasMissingCheckout = true;
      }

      eveningData = {
        in: inScan.scan_time.slice(0, 5),
        out: outTime,
        isLate: lateMins > 0,
        lateMins,
        isEarly: earlyMins > 0,
        earlyMins,
        periodsCount: eveningShifts.length,
        method: inScan.scanned_method
      };
    }

    shiftBlocks.push({ endTime: latestEndTime, attended: Boolean(eveningData) });
  }

  // Tally attended vs ended-and-missed vs upcoming shift blocks
  let attendedShiftsCount = 0;
  let missedShiftsCount = 0;
  let upcomingShiftsCount = 0;

  for (const b of shiftBlocks) {
    if (b.attended) {
      attendedShiftsCount++;
    } else if (isShiftEnded(b.endTime, dateType, nowMinutes)) {
      missedShiftsCount++;
    } else {
      upcomingShiftsCount++;
    }
  }

  // Time-aware Overall Daily Status (Option B: Partial when missed >= 1 finished shift & has another)
  let dailyStatus = 'OFF';
  if (isScheduled) {
    if (nonWorking.isNonWorking && attendedShiftsCount === 0) {
      dailyStatus = nonWorking.reason; // 'WEEKEND' or 'HOLIDAY'
    } else if (missedShiftsCount > 0 && (attendedShiftsCount > 0 || upcomingShiftsCount > 0)) {
      dailyStatus = 'PARTIAL';
    } else if (missedShiftsCount === shiftBlocks.length) {
      dailyStatus = 'ABSENT';
    } else if (attendedShiftsCount > 0) {
      dailyStatus = hasAnyLate ? 'LATE' : 'PRESENT';
    } else {
      dailyStatus = 'UPCOMING';
    }
  } else if (hasAnyPresent || empScans.length > 0) {
    dailyStatus = 'PRESENT';
  } else if (nonWorking.isNonWorking) {
    dailyStatus = nonWorking.reason;
  }

  return {
    morningData,
    afternoonData,
    eveningData,
    fullDayData,
    dailyStatus,
    hasAnyLate,
    hasAnyPresent,
    hasMissingCheckout,
    totalWorkedMinutes,
    exceptions,
    upcomingShiftsCount,
    missedShiftsCount,
    attendedShiftsCount
  };
}

/**
 * Calculates Daily Timesheet and Status for all employees on a given date.
 */
exports.getDailyTimesheet = async (dateStr) => {
  const { dateStr: todayStr, minutesFromMidnight: nowMinutes } = getCambodiaNow();
  const targetDate = dateStr || todayStr;

  const dateType = targetDate < todayStr ? 'PAST' : (targetDate > todayStr ? 'FUTURE' : 'TODAY');

  const [employees, scans, unknownScans, dbHolidays] = await Promise.all([
    analyticsRepo.getEmployeesWithShifts(),
    analyticsRepo.getScansForDate(targetDate),
    analyticsRepo.getUnknownScansForDate(targetDate),
    analyticsRepo.getSchoolHolidays(targetDate),
  ]);

  const dbHolidayMap = {};
  if (dbHolidays && dbHolidays.length > 0) {
    for (const h of dbHolidays) {
      dbHolidayMap[h.holiday_date] = h;
    }
  }

  const nonWorking = checkNonWorkingDay(targetDate, dbHolidayMap);

  // Group scans by employee_id
  const scansByEmp = new Map();
  for (const scan of scans) {
    if (scan.employee_id) {
      if (!scansByEmp.has(scan.employee_id)) {
        scansByEmp.set(scan.employee_id, []);
      }
      scansByEmp.get(scan.employee_id).push(scan);
    }
  }

  const timesheetRows = [];
  const exceptions = [];

  let totalScheduled = 0;
  let presentCount = 0;
  let lateCount = 0;
  let partialCount = 0;
  let upcomingCount = 0;
  let absentCount = 0;
  let onTimeCount = 0;

  for (const emp of employees) {
    const empScans = scansByEmp.get(emp.id) || [];
    const assignedShifts = emp.shifts || [];
    if (assignedShifts.length > 0) totalScheduled++;

    const evalRes = evaluateEmployeeDay({
      emp,
      empScans,
      dateType,
      nowMinutes,
      nonWorking
    });

    exceptions.push(...evalRes.exceptions);

    if (evalRes.dailyStatus === 'PRESENT') {
      presentCount++;
      onTimeCount++;
    } else if (evalRes.dailyStatus === 'LATE') {
      presentCount++;
      lateCount++;
    } else if (evalRes.dailyStatus === 'PARTIAL') {
      partialCount++;
    } else if (evalRes.dailyStatus === 'UPCOMING') {
      upcomingCount++;
    } else if (evalRes.dailyStatus === 'ABSENT') {
      absentCount++;
      exceptions.push({
        type: 'ABSENT',
        employeeId: emp.id,
        employeeName: emp.name,
        message: `${emp.name} was scheduled but did not scan attendance`
      });
    }

    timesheetRows.push({
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      assignedShifts: assignedShifts.map(s => s.title),
      morning: evalRes.morningData,
      afternoon: evalRes.afternoonData,
      evening: evalRes.eveningData,
      fullDay: evalRes.fullDayData,
      dailyStatus: evalRes.dailyStatus,
      totalDuration: formatDuration(evalRes.totalWorkedMinutes),
      totalMinutes: evalRes.totalWorkedMinutes,
      hasMissingCheckout: evalRes.hasMissingCheckout
    });
  }

  // Include any unknown scans in exceptions
  for (const u of unknownScans) {
    exceptions.push({
      type: 'UNKNOWN_SCAN',
      identifier: u.scanned_identifier,
      method: u.scanned_method,
      time: u.scan_time.slice(0, 5),
      message: `Unregistered ${u.scanned_method} scanned at ${u.scan_time.slice(0, 5)} (ID: ${u.scanned_identifier})`
    });
  }

  const decidedScheduled = totalScheduled - upcomingCount;
  const attendanceRate = (nonWorking.isNonWorking || decidedScheduled <= 0)
    ? 100
    : Math.round(((presentCount + partialCount) / decidedScheduled) * 100);

  return {
    date: targetDate,
    calendarInfo: {
      isNonWorking: nonWorking.isNonWorking,
      reason: nonWorking.reason,
      title: nonWorking.title,
      localTitle: nonWorking.localTitle
    },
    kpi: {
      totalEmployees: employees.length,
      totalScheduled,
      presentCount,
      onTimeCount,
      lateCount,
      partialCount,
      upcomingCount,
      absentCount,
      attendanceRate
    },
    exceptions,
    data: timesheetRows
  };
};

/**
 * Live Presence calculation based on today's scans vs current Cambodia server time.
 */
exports.getLivePresence = async () => {
  const { dateStr, minutesFromMidnight: currentTimeMins, timeStr: currentTime } = getCambodiaNow();

  const dailyTimesheet = await exports.getDailyTimesheet(dateStr);

  const presenceList = dailyTimesheet.data.map(row => {
    let presenceStatus = 'NOT_SCHEDULED';
    let presenceLabel = 'No Shift Today';
    let currentActivity = null;

    if (row.dailyStatus === 'WEEKEND') {
      presenceStatus = 'NOT_SCHEDULED';
      presenceLabel = 'School Weekend';
    } else if (row.dailyStatus === 'HOLIDAY') {
      presenceStatus = 'NOT_SCHEDULED';
      presenceLabel = 'Holiday';
    } else if (row.assignedShifts.length > 0) {
      if (row.dailyStatus === 'ABSENT') {
        presenceStatus = 'ABSENT';
        presenceLabel = 'Absent Today';
      } else {
        // Active check-in through shift end windows
        const isMorningTime = currentTimeMins >= 360 && currentTimeMins <= 645;     // 06:00 - 10:45
        const isAfternoonTime = currentTimeMins >= 720 && currentTimeMins <= 1005;  // 12:00 - 16:45
        const isEveningTime = currentTimeMins >= 1020 && currentTimeMins <= 1170;   // 17:00 - 19:30

        if (row.morning && row.morning.in && !row.morning.out && isMorningTime) {
          presenceStatus = 'ON_CAMPUS';
          presenceLabel = `In Campus since ${row.morning.in}`;
          currentActivity = 'Morning Shift';
        } else if (row.afternoon && row.afternoon.in && !row.afternoon.out && isAfternoonTime) {
          presenceStatus = 'ON_CAMPUS';
          presenceLabel = `In Campus since ${row.afternoon.in}`;
          currentActivity = 'Afternoon Shift';
        } else if (row.evening && row.evening.in && !row.evening.out && isEveningTime) {
          presenceStatus = 'ON_CAMPUS';
          presenceLabel = `In Campus since ${row.evening.in}`;
          currentActivity = 'Evening Shift';
        } else if (row.fullDay && row.fullDay.in && !row.fullDay.out && currentTimeMins >= 360 && currentTimeMins <= 1005) {
          presenceStatus = 'ON_CAMPUS';
          presenceLabel = `In Campus since ${row.fullDay.in}`;
          currentActivity = 'Full-Day Shift';
        } else if (row.dailyStatus === 'PRESENT' || row.dailyStatus === 'LATE') {
          presenceStatus = 'CHECKED_OUT';
          presenceLabel = 'Checked Out';
        } else if (row.dailyStatus === 'PARTIAL') {
          presenceStatus = row.morning || row.afternoon || row.evening || row.fullDay ? 'CHECKED_OUT' : 'UPCOMING';
          presenceLabel = 'Partial Shift';
        } else {
          presenceStatus = 'UPCOMING';
          presenceLabel = 'Upcoming Shift';
        }
      }
    }

    return {
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      role: row.role,
      assignedShifts: row.assignedShifts,
      presenceStatus,
      presenceLabel,
      currentActivity,
      dailyStatus: row.dailyStatus
    };
  });

  const onCampusCount = presenceList.filter(p => p.presenceStatus === 'ON_CAMPUS').length;

  return {
    currentTime,
    onCampusCount,
    totalEmployees: presenceList.length,
    presenceList
  };
};

/**
 * Monthly Register Matrix for year & month.
 */
exports.getMonthlyGrid = async (year, month) => {
  const { dateStr: todayStr, minutesFromMidnight: nowMinutes } = getCambodiaNow();
  const [nowY, nowM] = todayStr.split('-').map(Number);

  const currentYear = parseInt(year, 10) || nowY;
  const currentMonth = parseInt(month, 10) || nowM;

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const [employees, allScans, dbHolidays] = await Promise.all([
    analyticsRepo.getEmployeesWithShifts(),
    analyticsRepo.getScansForMonth(currentYear, currentMonth),
    analyticsRepo.getSchoolHolidays(startDate, endDate)
  ]);

  const dbHolidayMap = {};
  if (dbHolidays && dbHolidays.length > 0) {
    for (const h of dbHolidays) {
      dbHolidayMap[h.holiday_date] = h;
    }
  }

  // Pre-calculate Khmer and school holidays for the month
  const holidays = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const nonWorking = checkNonWorkingDay(dStr, dbHolidayMap);
    if (nonWorking.isNonWorking && nonWorking.reason === 'HOLIDAY') {
      holidays[d] = {
        name: nonWorking.title,
        localName: nonWorking.localTitle
      };
    }
  }

  // Index scans by: `${employee_id}_${YYYY-MM-DD}`
  const scansIndex = new Map();
  for (const s of allScans) {
    if (s.employee_id) {
      const dStr = String(s.scan_date).slice(0, 10);
      const key = `${s.employee_id}_${dStr}`;
      if (!scansIndex.has(key)) {
        scansIndex.set(key, []);
      }
      scansIndex.get(key).push(s);
    }
  }

  const matrix = employees.map(emp => {
    const daysData = {};
    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayNonWorking = checkNonWorkingDay(dStr, dbHolidayMap);
      const dateType = dStr < todayStr ? 'PAST' : (dStr > todayStr ? 'FUTURE' : 'TODAY');

      const key = `${emp.id}_${dStr}`;
      const dayScans = scansIndex.get(key) || [];

      if (dayScans.length > 0) {
        const evalRes = evaluateEmployeeDay({
          emp,
          empScans: dayScans,
          dateType,
          nowMinutes,
          nonWorking: dayNonWorking
        });

        presentDays++;
        const isLate = evalRes.hasAnyLate;
        if (isLate) lateDays++;

        daysData[day] = {
          status: isLate ? 'LATE' : 'PRESENT',
          scansCount: dayScans.length,
          times: dayScans.map(s => s.scan_time.slice(0, 5)).join(', ')
        };
      } else if (dayNonWorking.isNonWorking) {
        daysData[day] = {
          status: dayNonWorking.reason, // 'WEEKEND' or 'HOLIDAY'
          title: dayNonWorking.title,
          localTitle: dayNonWorking.localTitle,
          scansCount: 0
        };
      } else if (dateType === 'FUTURE') {
        daysData[day] = { status: 'OFF', scansCount: 0 };
      } else if (dateType === 'TODAY') {
        const evalRes = evaluateEmployeeDay({
          emp,
          empScans: [],
          dateType: 'TODAY',
          nowMinutes,
          nonWorking: dayNonWorking
        });

        if (evalRes.dailyStatus === 'ABSENT') {
          absentDays++;
          daysData[day] = { status: 'ABSENT', scansCount: 0 };
        } else {
          daysData[day] = { status: 'OFF', scansCount: 0 };
        }
      } else {
        const isAbsent = emp.shifts.length > 0;
        if (isAbsent) absentDays++;
        daysData[day] = { status: isAbsent ? 'ABSENT' : 'OFF', scansCount: 0 };
      }
    }

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      role: emp.role,
      assignedShifts: emp.shifts.map(s => s.title),
      daysData,
      presentDays,
      lateDays,
      absentDays,
      totalHours: presentDays * (emp.role === 'cleaner' ? 10 : (emp.shifts.length * 4))
    };
  });

  return {
    year: currentYear,
    month: currentMonth,
    daysInMonth,
    holidays,
    matrix
  };
};
