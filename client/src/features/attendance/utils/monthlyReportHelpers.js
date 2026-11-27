export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const DAY_SHORT_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const STATUS_STYLE_MAP = {
  PRESENT: {
    label: 'P',
    fontColor: 'FF15803D',
    hexColor: '#15803D',
    bold: true,
  },
  LATE: {
    label: 'L',
    fontColor: 'FFB45309',
    hexColor: '#B45309',
    bold: true,
  },
  ABSENT: {
    label: 'A',
    fontColor: 'FFB91C1C',
    hexColor: '#B91C1C',
    bold: true,
  },
  HOLIDAY: {
    label: 'H',
    fontColor: 'FF4F46E5',
    hexColor: '#4F46E5',
    bold: true,
  },
  WEEKEND: {
    label: '·',
    fontColor: 'FF94A3B8',
    hexColor: '#94A3B8',
    bold: false,
  },
  OFF: {
    label: '—',
    fontColor: 'FF94A3B8',
    hexColor: '#94A3B8',
    bold: false,
  },
};

const LOGO_ASSET_URL = new URL('../../../assets/logo-SIS.png', import.meta.url).href;

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Load the school crest as a base64 PNG data URI without relying solely on HTTP fetch.
 */
export async function loadSchoolLogoBase64() {
  try {
    const inlineMod = await import('../../../assets/logo-SIS.png?inline');
    const inlineUrl = inlineMod?.default;
    if (typeof inlineUrl === 'string' && inlineUrl.startsWith('data:image/')) {
      return inlineUrl;
    }
  } catch {
    // Fallback below for runtimes where Vite ?inline asset imports are unavailable
  }

  try {
    if (LOGO_ASSET_URL.startsWith('data:image/')) {
      return LOGO_ASSET_URL;
    }
    if (typeof fetch !== 'function') {
      return null;
    }
    const response = await fetch(LOGO_ASSET_URL);
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType && !contentType.startsWith('image/')) {
      return null;
    }
    const buffer = await response.arrayBuffer();
    return `data:image/png;base64,${arrayBufferToBase64(buffer)}`;
  } catch (err) {
    console.warn('Could not embed school logo in monthly report:', err);
    return null;
  }
}

/**
 * Group consecutive days that share the same holiday name (e.g., Nov 23-25).
 */
export function groupConsecutiveHolidays(holidays, monthShort) {
  const entries = Object.entries(holidays || {})
    .map(([day, info]) => ({
      day: Number(day),
      name: info?.name || 'Holiday',
      localName: info?.localName || '',
    }))
    .filter((entry) => Number.isFinite(entry.day))
    .sort((a, b) => a.day - b.day);

  const groups = [];
  for (const item of entries) {
    const prev = groups[groups.length - 1];
    if (
      prev &&
      prev.endDay + 1 === item.day &&
      prev.name === item.name &&
      prev.localName === item.localName
    ) {
      prev.endDay = item.day;
    } else {
      groups.push({
        startDay: item.day,
        endDay: item.day,
        name: item.name,
        localName: item.localName,
      });
    }
  }

  return groups.map((g) => ({
    dateLabel:
      g.startDay === g.endDay
        ? `${monthShort} ${g.startDay}`
        : `${monthShort} ${g.startDay}–${g.endDay}`,
    title: g.localName ? `${g.name} (${g.localName})` : g.name,
  }));
}

/**
 * Count working days, public holidays (taking precedence over weekends), and weekend days.
 */
export function getCalendarDayCounts(year, month, daysInMonth, holidays) {
  let workingDays = 0;
  let publicHolidays = 0;
  let weekendDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (holidays && holidays[d]) {
      publicHolidays++;
    } else if (isWeekend) {
      weekendDays++;
    } else {
      workingDays++;
    }
  }

  return { workingDays, publicHolidays, weekendDays };
}

/**
 * Resolve normalized per-employee summary totals for absent count edge cases.
 */
export function getEmployeeSummaryCounts(emp) {
  const lateDays = Number(emp?.lateDays) || 0;
  const absentDays =
    emp?.absentDays !== undefined
      ? Number(emp.absentDays) || 0
      : Object.values(emp?.daysData || {}).filter((d) => d.status === 'ABSENT').length;
  const presentDays = Number(emp?.presentDays) || 0;
  return { lateDays, absentDays, presentDays };
}
