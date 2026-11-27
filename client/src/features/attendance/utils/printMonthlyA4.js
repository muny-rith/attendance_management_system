import {
  DAY_SHORT_NAMES,
  MONTH_NAMES,
  MONTH_SHORT_NAMES,
  STATUS_STYLE_MAP,
  getCalendarDayCounts,
  getEmployeeSummaryCounts,
  groupConsecutiveHolidays,
  loadSchoolLogoBase64,
} from './monthlyReportHelpers.js';

const PRINT_FRAME_ID = 'moon-a4-print-frame';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMonthlyA4Html({ year, month, gridData, logoDataUrl }) {
  const matrix = gridData?.matrix || [];
  const daysInMonth = gridData?.daysInMonth || 30;
  const holidays = gridData?.holidays || {};
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = MONTH_NAMES[month - 1] || `Month ${month}`;
  const monthShort = MONTH_SHORT_NAMES[month - 1] || `M${month}`;

  const { workingDays, publicHolidays, weekendDays } = getCalendarDayCounts(
    year,
    month,
    daysInMonth,
    holidays
  );
  const groupedHolidays = groupConsecutiveHolidays(holidays, monthShort);

  let totalLate = 0;
  let totalAbsence = 0;
  let totalPresent = 0;

  const dayColumnsMeta = daysArray.map((dayNum) => {
    const dayOfWeek = new Date(year, month - 1, dayNum).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = Boolean(holidays[dayNum]);
    return {
      dayNum,
      dayLabel: DAY_SHORT_NAMES[dayOfWeek],
      isWeekend,
      isHoliday,
    };
  });

  const dayColsCount = dayColumnsMeta.length;

  const bodyRowsHtml = matrix
    .map((emp, idx) => {
      const { lateDays, absentDays, presentDays } = getEmployeeSummaryCounts(emp);
      totalLate += lateDays;
      totalAbsence += absentDays;
      totalPresent += presentDays;

      const dayCellsHtml = dayColumnsMeta
        .map(({ dayNum, isWeekend, isHoliday }) => {
          const dayInfo = emp.daysData?.[dayNum];
          const status = dayInfo?.status || 'OFF';
          const style = STATUS_STYLE_MAP[status] || STATUS_STYLE_MAP.OFF;

          const cellClass =
            isHoliday || status === 'HOLIDAY'
              ? 'cell-holiday'
              : isWeekend || status === 'WEEKEND'
                ? 'cell-weekend'
                : 'cell-work';

          return `<td class="day-cell ${cellClass}" style="color:${style.hexColor};font-weight:${
            style.bold ? 700 : 400
          }">${escapeHtml(style.label)}</td>`;
        })
        .join('');

      return `
        <tr>
          <td class="col-no">${idx + 1}</td>
          <td class="col-name">${escapeHtml(emp.employeeName || '')}</td>
          ${dayCellsHtml}
          <td class="col-sum" style="color:${lateDays > 0 ? '#D97706' : '#64748B'};font-weight:${
            lateDays > 0 ? 700 : 400
          }">${lateDays}d</td>
          <td class="col-sum" style="color:${absentDays > 0 ? '#DC2626' : '#64748B'};font-weight:${
            absentDays > 0 ? 700 : 400
          }">${absentDays}d</td>
          <td class="col-sum" style="color:${presentDays > 0 ? '#059669' : '#64748B'};font-weight:${
            presentDays > 0 ? 700 : 400
          }">${presentDays}d</td>
        </tr>
      `;
    })
    .join('');

  const topDayHeadersHtml = dayColumnsMeta
    .map(({ dayNum, isWeekend, isHoliday }) => {
      const cls = isHoliday ? 'th-holiday-top' : isWeekend ? 'th-weekend-top' : 'th-work-top';
      return `<th class="day-th ${cls}">${dayNum}</th>`;
    })
    .join('');

  const subDayHeadersHtml = dayColumnsMeta
    .map(({ dayLabel, isWeekend, isHoliday }) => {
      const cls = isHoliday ? 'th-holiday-sub' : isWeekend ? 'th-weekend-sub' : 'th-work-sub';
      return `<th class="day-sub-th ${cls}">${dayLabel}</th>`;
    })
    .join('');

  const totalEmptyCellsHtml = dayColumnsMeta
    .map(() => `<td class="total-empty"></td>`)
    .join('');

  const holidaysHtml =
    groupedHolidays.length > 0
      ? `
        <div class="holidays-block">
          <div class="holidays-title">Holidays in ${escapeHtml(monthName)} ${escapeHtml(year)}</div>
          ${groupedHolidays
            .map(
              (h) => `
                <div class="holiday-line">
                  <span class="holiday-date">${escapeHtml(h.dateLabel)}:</span>
                  <span class="holiday-name">${escapeHtml(h.title)}</span>
                </div>
              `
            )
            .join('')}
        </div>
      `
      : '';

  const logoHtml = logoDataUrl
    ? `<img class="school-logo" src="${logoDataUrl}" alt="Smiling International School" />`
    : '';

  // Compact row padding slightly when there are more employees so 18-24 rows stay on page 1 cleanly
  const isDense = matrix.length > 20;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Monthly Attendance — ${escapeHtml(monthName)} ${escapeHtml(year)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&display=swap" />
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100%;
      background: #FFFFFF;
      color: #0F172A;
      font-family: 'Battambang', system-ui, -apple-system, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .sheet-page {
      width: 100%;
      min-height: 208mm;
      padding: 9mm 10mm 9mm 10mm;
      display: flex;
      flex-direction: column;
    }

    .banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 8px;
      margin-bottom: 8px;
      border-bottom: 2px solid #2563EB;
    }

    .banner-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .school-logo {
      width: 66px;
      height: 54px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .school-title {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.25;
      letter-spacing: 0.01em;
    }

    .report-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #2563EB;
      line-height: 1.3;
      margin-top: 2px;
    }

    .banner-stats {
      border-collapse: collapse;
      flex-shrink: 0;
      font-size: 9.5px;
      line-height: 1.45;
    }

    .banner-stats td {
      padding: 0.5px 0;
    }

    .stat-label {
      color: #64748B;
      text-align: right;
      padding-right: 12px !important;
      white-space: nowrap;
    }

    .stat-value {
      color: #0F172A;
      font-weight: 700;
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .attendance-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-variant-numeric: tabular-nums;
    }

    .attendance-table thead {
      display: table-header-group;
    }

    .attendance-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .attendance-table th,
    .attendance-table td {
      border: 1px solid #CBD5E1;
      text-align: center;
      vertical-align: middle;
      overflow: hidden;
    }

    .fixed-th {
      background: #1E293B;
      color: #FFFFFF;
      font-size: 9.5px;
      font-weight: 700;
      border-color: #334155 !important;
      padding: 4px 2px;
    }

    .fixed-th-name {
      text-align: left !important;
      padding-left: 7px !important;
    }

    .sum-th {
      color: #FFFFFF;
      font-size: 9.5px;
      font-weight: 700;
      border-color: #334155 !important;
      padding: 4px 2px;
    }

    .sum-late { background: #92400E; }
    .sum-absence { background: #991B1B; }
    .sum-present { background: #065F46; }

    .day-th {
      font-size: 9.5px;
      font-weight: 700;
      color: #FFFFFF;
      padding: 3px 1px;
      border-color: #334155 !important;
    }

    .day-sub-th {
      font-size: 8px;
      font-weight: 400;
      padding: 2px 1px;
      border-color: #475569 !important;
    }

    .th-work-top { background: #1E293B; }
    .th-work-sub { background: #334155; color: #CBD5E1; }

    .th-weekend-top { background: #334155; }
    .th-weekend-sub { background: #475569; color: #E2E8F0; }

    .th-holiday-top { background: #3730A3; }
    .th-holiday-sub { background: #4338CA; color: #E0E7FF; font-weight: 700; }

    .attendance-table tbody td {
      border-color: #E2E8F0;
      height: ${isDense ? '18px' : '21px'};
      font-size: ${isDense ? '8.5px' : '9px'};
      line-height: 1.2;
    }

    .col-no {
      color: #64748B;
      background: #FFFFFF;
    }

    .col-name {
      text-align: left !important;
      padding: 0 6px;
      font-weight: 700;
      color: #0F172A;
      background: #FFFFFF;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .day-cell {
      font-size: 9px;
      padding: 0 1px;
    }

    .cell-work { background: #FFFFFF; }
    .cell-weekend { background: #F1F5F9; }
    .cell-holiday { background: #EEF2FF; }

    .col-sum {
      background: #FFFFFF;
      font-size: 9.5px;
    }

    .totals-row td {
      background: #F1F5F9;
      border-top: 1.5px solid #1E293B !important;
      border-bottom: 1px solid #CBD5E1 !important;
      border-left-color: #E2E8F0;
      border-right-color: #E2E8F0;
      height: 22px;
      font-size: 9.5px;
      font-weight: 700;
    }

    .totals-label {
      text-align: right !important;
      padding-right: 8px;
      color: #0F172A;
    }

    .holidays-block {
      margin-top: 10px;
      text-align: left;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .holidays-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #3730A3;
      margin-bottom: 2px;
    }

    .holiday-line {
      font-size: 9px;
      line-height: 1.45;
    }

    .holiday-date {
      font-weight: 700;
      color: #4F46E5;
      margin-right: 4px;
    }

    .holiday-name {
      color: #1E293B;
    }

    .print-footer {
      margin-top: auto;
      padding-top: 8px;
      text-align: right;
      font-size: 8.5px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="sheet-page">
    <header class="banner">
      <div class="banner-left">
        ${logoHtml}
        <div>
          <div class="school-title">SMILING INTERNATIONAL SCHOOL</div>
          <div class="report-subtitle">Monthly Attendance — ${escapeHtml(monthName)} ${escapeHtml(year)}</div>
        </div>
      </div>

      <table class="banner-stats" aria-label="Calendar day summary">
        <tbody>
          <tr>
            <td class="stat-label">Working Days</td>
            <td class="stat-value">${workingDays}d</td>
          </tr>
          <tr>
            <td class="stat-label">Public Holidays</td>
            <td class="stat-value">${publicHolidays}d</td>
          </tr>
          <tr>
            <td class="stat-label">Weekend Days</td>
            <td class="stat-value">${weekendDays}d</td>
          </tr>
        </tbody>
      </table>
    </header>

    <table class="attendance-table">
      <colgroup>
        <col style="width: 26px;" />
        <col style="width: 148px;" />
        ${dayColumnsMeta.map(() => `<col style="width: calc((100% - 312px) / ${dayColsCount});" />`).join('')}
        <col style="width: 44px;" />
        <col style="width: 48px;" />
        <col style="width: 46px;" />
      </colgroup>
      <thead>
        <tr>
          <th class="fixed-th" rowspan="2">No.</th>
          <th class="fixed-th fixed-th-name" rowspan="2">Staff Name</th>
          ${topDayHeadersHtml}
          <th class="sum-th sum-late" rowspan="2">Late</th>
          <th class="sum-th sum-absence" rowspan="2">Absence</th>
          <th class="sum-th sum-present" rowspan="2">Present</th>
        </tr>
        <tr>
          ${subDayHeadersHtml}
        </tr>
      </thead>
      <tbody>
        ${bodyRowsHtml}
        <tr class="totals-row">
          <td class="totals-label" colspan="2">Monthly Totals</td>
          ${totalEmptyCellsHtml}
          <td style="color:#B45309">${totalLate}d</td>
          <td style="color:#B91C1C">${totalAbsence}d</td>
          <td style="color:#047857">${totalPresent}d</td>
        </tr>
      </tbody>
    </table>

    ${holidaysHtml}

    <footer class="print-footer">Powered by Moon Attendance</footer>
  </div>
</body>
</html>`;
}

async function waitForFrameAssets(frameWindow, doc) {
  const fontPromise = doc.fonts?.ready
    ? Promise.race([doc.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1500))])
    : Promise.resolve();

  const imgs = Array.from(doc.images || []);
  const imgPromises = imgs.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 1500);
    });
  });

  await Promise.all([fontPromise, ...imgPromises]);

  // Yield one paint frame so layout metrics settle cleanly before opening Print Preview
  await new Promise((resolve) => {
    if (typeof frameWindow.requestAnimationFrame === 'function') {
      frameWindow.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 50);
    }
  });
}

/**
 * Print or save the Monthly Register Grid directly in native A4 Landscape (297mm x 210mm).
 */
export async function printMonthlyMatrixA4({ year, month, gridData }) {
  const matrix = gridData?.matrix || [];
  if (matrix.length === 0) {
    throw new Error('No monthly attendance data to print.');
  }

  const logoDataUrl = await loadSchoolLogoBase64();
  const html = buildMonthlyA4Html({ year, month, gridData, logoDataUrl });

  const existingFrame = document.getElementById(PRINT_FRAME_ID);
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = PRINT_FRAME_ID;
  iframe.title = 'A4 Monthly Attendance Print Frame';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    iframe.remove();
    throw new Error('Unable to initialize A4 print preview.');
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  await waitForFrameAssets(frameWindow, frameDoc);

  frameWindow.focus();
  frameWindow.print();
}
