/**
 * Dynamic Khmer Calendar & School Non-Working Day Engine
 * 
 * Powered by:
 * 1. Traditional Khmer Chhankitek lunisolar calculations (khmer-chhankitek-calendar)
 *    - Dynamically computes variable lunar holidays (Pchum Ben, Khmer New Year,
 *      Water Festival, Visak Bochea, Meak Bochea, etc.) for ANY year automatically.
 * 2. School Weekends: Both Saturday & Sunday.
 * 3. Database school_holidays table support for custom school vacations & overrides.
 */

let chhankitek;
try {
  chhankitek = require('khmer-chhankitek-calendar');
} catch (e) {
  chhankitek = null;
}

/**
 * Returns current date string (YYYY-MM-DD) and minutes from midnight in Cambodia (UTC+7).
 */
function getCambodiaNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const hour = Number(map.hour === '24' ? '0' : map.hour);
  const minute = Number(map.minute);

  return {
    dateStr: `${map.year}-${map.month}-${map.day}`,
    minutesFromMidnight: hour * 60 + minute,
    timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

/**
 * Normalizes input date to YYYY-MM-DD
 */
function toDateString(input) {
  if (!input) return '';
  if (typeof input === 'string') {
    return input.slice(0, 10);
  }
  if (input instanceof Date && !isNaN(input.getTime())) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const d = String(input.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

/**
 * Checks if a date falls on a School Weekend (Saturday or Sunday)
 * @param {string|Date} date
 * @returns {boolean}
 */
function isWeekend(date) {
  const dStr = toDateString(date);
  if (!dStr) return false;
  const d = new Date(`${dStr}T12:00:00`);
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Dynamically resolves Khmer Public / Religious Holidays for ANY date/year
 * @param {string|Date} date
 * @returns {object|null}
 */
function getKhmerHoliday(date) {
  const dStr = toDateString(date);
  if (!dStr) return null;

  if (chhankitek && typeof chhankitek.toKhmerLunarDate === 'function') {
    try {
      const lunar = chhankitek.toKhmerLunarDate(dStr);
      if (lunar && lunar.holidays && lunar.holidays.length > 0) {
        // Match official Cambodian public holidays (e.g. KNY, Pchum Ben, Water Festival)
        const holiday = lunar.holidays.find(h => h.type === 'public');
        if (!holiday) return null;
        return {
          name: holiday.nameEn,
          localName: holiday.nameKm,
          date: dStr,
          isHoliday: true,
          type: holiday.type || 'PUBLIC_HOLIDAY',
          lunarText: lunar.fullText || lunar.lunarDateText
        };
      }
    } catch (err) {
      console.error('Error calculating Khmer lunar date:', err.message);
    }
  }

  return null;
}

/**
 * Comprehensive check for School Non-Working Day (Weekend or Khmer Holiday)
 * @param {string|Date} date
 * @param {object} [dbHolidayMap] - Optional map of database school holidays { 'YYYY-MM-DD': { name_en, name_km } }
 * @returns {object}
 */
function checkNonWorkingDay(date, dbHolidayMap = null) {
  const dStr = toDateString(date);
  const weekend = isWeekend(dStr);

  // 1. Check custom school holidays from database if provided
  if (dbHolidayMap && dbHolidayMap[dStr]) {
    const dbH = dbHolidayMap[dStr];
    return {
      isNonWorking: true,
      reason: 'HOLIDAY',
      title: dbH.name_en || dbH.title || 'School Holiday',
      localTitle: dbH.name_km || dbH.localTitle || 'ថ្ងៃឈប់សម្រាកសាលា',
      isWeekend: weekend
    };
  }

  // 2. Check dynamic Khmer lunisolar national holidays
  const holiday = getKhmerHoliday(dStr);
  if (holiday) {
    return {
      isNonWorking: true,
      reason: 'HOLIDAY',
      title: holiday.name,
      localTitle: holiday.localName,
      isWeekend: weekend,
      lunarText: holiday.lunarText
    };
  }

  // 3. Check School Weekend (Sat / Sun)
  if (weekend) {
    return {
      isNonWorking: true,
      reason: 'WEEKEND',
      title: 'School Weekend',
      localTitle: 'ថ្ងៃចុងសប្តាហ៍',
      isWeekend: true
    };
  }

  return {
    isNonWorking: false,
    reason: null,
    isWeekend: false
  };
}

module.exports = {
  isWeekend,
  getKhmerHoliday,
  checkNonWorkingDay,
  toDateString,
  getCambodiaNow
};
