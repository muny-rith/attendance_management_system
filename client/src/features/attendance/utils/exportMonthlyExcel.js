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

const FONT_FAMILY = 'Battambang';

const CELL_BORDER = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

const HEADER_BORDER = {
  top: { style: 'thin', color: { argb: 'FF334155' } },
  left: { style: 'thin', color: { argb: 'FF334155' } },
  bottom: { style: 'thin', color: { argb: 'FF334155' } },
  right: { style: 'thin', color: { argb: 'FF334155' } },
};

const SUBHEADER_BORDER = {
  top: { style: 'thin', color: { argb: 'FF475569' } },
  left: { style: 'thin', color: { argb: 'FF475569' } },
  bottom: { style: 'thin', color: { argb: 'FF475569' } },
  right: { style: 'thin', color: { argb: 'FF475569' } },
};

async function loadExcelWorkbook() {
  const mod = await import('exceljs');
  const ExcelJS = mod?.default?.Workbook
    ? mod.default
    : mod?.Workbook
      ? mod
      : globalThis.ExcelJS;

  if (!ExcelJS?.Workbook) {
    throw new Error('ExcelJS Workbook constructor is unavailable.');
  }
  return ExcelJS.Workbook;
}

function getColumnLetter(colNum) {
  let num = colNum;
  let letter = '';
  while (num > 0) {
    const rem = (num - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    num = Math.floor((num - 1) / 26);
  }
  return letter;
}

function styleBannerMetricRow(sheet, rowNum, labelStartLetter, labelEndLetter, valueColLetter, label, valueText, valueColor, verticalAlign = 'middle') {
  sheet.mergeCells(`${labelStartLetter}${rowNum}:${labelEndLetter}${rowNum}`);

  const labelCell = sheet.getCell(`${labelStartLetter}${rowNum}`);
  labelCell.value = label;
  labelCell.font = { name: FONT_FAMILY, size: 9.5, color: { argb: 'FF64748B' } };
  labelCell.alignment = { vertical: verticalAlign, horizontal: 'right' };

  const valueCell = sheet.getCell(`${valueColLetter}${rowNum}`);
  valueCell.value = valueText;
  valueCell.font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: valueColor } };
  valueCell.alignment = { vertical: verticalAlign, horizontal: 'right' };
}

/**
 * Export the Monthly Register Grid directly to an Executive Template 1 .xlsx workbook.
 */
export async function exportMonthlyMatrixToExcel({ year, month, gridData }) {
  const matrix = gridData?.matrix || [];
  if (matrix.length === 0) {
    throw new Error('No monthly attendance data to export.');
  }

  const daysInMonth = gridData?.daysInMonth || 30;
  const holidays = gridData?.holidays || {};
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = MONTH_NAMES[month - 1] || `Month ${month}`;
  const monthShort = MONTH_SHORT_NAMES[month - 1] || `M${month}`;
  const totalCols = 2 + daysInMonth + 3; // No., Name, Days..., Late, Absence, Present
  const lastColLetter = getColumnLetter(totalCols);

  const { workingDays, publicHolidays, weekendDays } = getCalendarDayCounts(
    year,
    month,
    daysInMonth,
    holidays
  );

  const Workbook = await loadExcelWorkbook();
  const workbook = new Workbook();
  workbook.creator = 'Moon Attendance';
  workbook.created = new Date();

  const sheetTitle = `${monthName} ${year}`.slice(0, 31);
  const sheet = workbook.addWorksheet(sheetTitle, {
    views: [{ showGridLines: false }],
    headerFooter: {
      oddFooter: '&RPowered by Moon Attendance',
    },
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
      horizontalCentered: true,
      horizontalDpi: 600,
      verticalDpi: 600,
      scale: undefined,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.4,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Rows 1-3: Executive Header Banner (Left: Logo + School Title | Right: Day Counts)
  // ---------------------------------------------------------------------------
  const whiteFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
  const bannerBottomBorder = { bottom: { style: 'medium', color: { argb: 'FF2563EB' } } };

  sheet.getRow(1).height = 24;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 24;

  for (let r = 1; r <= 3; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= totalCols; c++) {
      row.getCell(c).fill = whiteFill;
    }
  }

  const rightMetaStartCol = Math.max(4, totalCols - 6);
  const leftMetaEndLetter = getColumnLetter(rightMetaStartCol - 1);
  const rightMetaStartLetter = getColumnLetter(rightMetaStartCol);
  const rightLabelEndLetter = getColumnLetter(totalCols - 1);

  sheet.mergeCells(`B1:${leftMetaEndLetter}3`);

  const titleBannerCell = sheet.getCell('B1');
  titleBannerCell.value = {
    richText: [
      {
        text: 'SMILING INTERNATIONAL SCHOOL\n',
        font: { name: FONT_FAMILY, size: 15, bold: true, color: { argb: 'FF0F172A' } },
      },
      {
        text: `Monthly Attendance — ${monthName} ${year}`,
        font: { name: FONT_FAMILY, size: 10.5, bold: true, color: { argb: 'FF2563EB' } },
      },
    ],
  };
  titleBannerCell.alignment = {
    vertical: 'middle',
    horizontal: 'left',
    indent: 1,
    wrapText: true,
  };

  styleBannerMetricRow(
    sheet,
    1,
    rightMetaStartLetter,
    rightLabelEndLetter,
    lastColLetter,
    'Working Days',
    `${workingDays}d`,
    'FF0F172A',
    'middle'
  );
  styleBannerMetricRow(
    sheet,
    2,
    rightMetaStartLetter,
    rightLabelEndLetter,
    lastColLetter,
    'Public Holidays',
    `${publicHolidays}d`,
    'FF0F172A',
    'middle'
  );
  styleBannerMetricRow(
    sheet,
    3,
    rightMetaStartLetter,
    rightLabelEndLetter,
    lastColLetter,
    'Weekend Days',
    `${weekendDays}d`,
    'FF0F172A',
    'top'
  );

  for (let c = 1; c <= totalCols; c++) {
    sheet.getRow(3).getCell(c).border = bannerBottomBorder;
  }

  const logoBase64 = await loadSchoolLogoBase64();
  if (logoBase64) {
    const logoId = workbook.addImage({
      base64: logoBase64,
      extension: 'png',
    });
    sheet.addImage(logoId, {
      tl: { col: 0.08, row: 0.54 },
      ext: { width: 72, height: 58 },
      editAs: 'oneCell',
    });
  }

  // Row 4: Spacer
  sheet.getRow(4).height = 10;

  // ---------------------------------------------------------------------------
  // Rows 5-6: Executive Slate-Navy Two-Tier Table Header
  // ---------------------------------------------------------------------------
  const headerTopRow = sheet.getRow(5);
  const headerBottomRow = sheet.getRow(6);
  headerTopRow.height = 22;
  headerBottomRow.height = 18;

  const fixedHeaders = [
    { col: 1, title: 'No.' },
    { col: 2, title: 'Staff Name' },
  ];

  fixedHeaders.forEach(({ col, title }) => {
    const colLetter = getColumnLetter(col);
    sheet.mergeCells(`${colLetter}5:${colLetter}6`);
    const cell = sheet.getCell(`${colLetter}5`);
    cell.value = title;
    cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'left' : 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    sheet.getCell(`${colLetter}5`).border = HEADER_BORDER;
    sheet.getCell(`${colLetter}6`).border = SUBHEADER_BORDER;
  });

  daysArray.forEach((dayNum, idx) => {
    const colIdx = 3 + idx;
    const dayOfWeek = new Date(year, month - 1, dayNum).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const holiday = holidays[dayNum];

    const topCell = headerTopRow.getCell(colIdx);
    const bottomCell = headerBottomRow.getCell(colIdx);

    topCell.value = dayNum;
    bottomCell.value = DAY_SHORT_NAMES[dayOfWeek];

    let topFill = 'FF1E293B';
    let bottomFill = 'FF334155';
    let bottomColor = 'FFCBD5E1';

    if (holiday) {
      topFill = 'FF3730A3';
      bottomFill = 'FF4338CA';
      bottomColor = 'FFE0E7FF';
      topCell.note = holiday.localName ? `${holiday.name} (${holiday.localName})` : holiday.name;
    } else if (isWeekend) {
      topFill = 'FF334155';
      bottomFill = 'FF475569';
      bottomColor = 'FFE2E8F0';
    }

    topCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    topCell.alignment = { vertical: 'middle', horizontal: 'center' };
    topCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: topFill } };
    topCell.border = HEADER_BORDER;

    bottomCell.font = {
      name: FONT_FAMILY,
      size: 8.5,
      bold: Boolean(holiday),
      color: { argb: bottomColor },
    };
    bottomCell.alignment = { vertical: 'middle', horizontal: 'center' };
    bottomCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bottomFill } };
    bottomCell.border = SUBHEADER_BORDER;
  });

  const summaryStartCol = 3 + daysInMonth;
  const summaryHeaders = [
    { offset: 0, title: 'Late', headerFill: 'FF92400E', totalColor: 'FFB45309' },
    { offset: 1, title: 'Absence', headerFill: 'FF991B1B', totalColor: 'FFB91C1C' },
    { offset: 2, title: 'Present', headerFill: 'FF065F46', totalColor: 'FF047857' },
  ];

  summaryHeaders.forEach(({ offset, title, headerFill }) => {
    const colLetter = getColumnLetter(summaryStartCol + offset);
    sheet.mergeCells(`${colLetter}5:${colLetter}6`);
    const cell = sheet.getCell(`${colLetter}5`);
    cell.value = title;
    cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFill } };
    sheet.getCell(`${colLetter}5`).border = HEADER_BORDER;
    sheet.getCell(`${colLetter}6`).border = SUBHEADER_BORDER;
  });

  // ---------------------------------------------------------------------------
  // Rows 7+: Staff Attendance Rows
  // ---------------------------------------------------------------------------
  const dataStartRow = 7;
  let maxNameLen = 18;

  const lateColLetter = getColumnLetter(summaryStartCol);
  const absenceColLetter = getColumnLetter(summaryStartCol + 1);
  const presentColLetter = getColumnLetter(summaryStartCol + 2);

  matrix.forEach((emp, rowIdx) => {
    const rowNum = dataStartRow + rowIdx;
    const row = sheet.getRow(rowNum);
    row.height = 22;

    const rowFill = 'FFFFFFFF';
    const empName = emp.employeeName || '';
    maxNameLen = Math.max(maxNameLen, empName.length);

    const noCell = row.getCell(1);
    noCell.value = rowIdx + 1;
    noCell.font = { name: FONT_FAMILY, size: 9.5, color: { argb: 'FF64748B' } };
    noCell.alignment = { vertical: 'middle', horizontal: 'center' };
    noCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
    noCell.border = CELL_BORDER;

    const nameCell = row.getCell(2);
    nameCell.value = empName;
    nameCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FF0F172A' } };
    nameCell.alignment = { vertical: 'middle', horizontal: 'left' };
    nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
    nameCell.border = CELL_BORDER;

    daysArray.forEach((dayNum, dIdx) => {
      const colIdx = 3 + dIdx;
      const dayOfWeek = new Date(year, month - 1, dayNum).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = Boolean(holidays[dayNum]);
      const dayInfo = emp.daysData?.[dayNum];
      const status = dayInfo?.status || 'OFF';
      const style = STATUS_STYLE_MAP[status] || STATUS_STYLE_MAP.OFF;

      const cell = row.getCell(colIdx);
      cell.value = style.label;
      cell.font = {
        name: FONT_FAMILY,
        size: 9.5,
        bold: style.bold,
        color: { argb: style.fontColor },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      const cellFill =
        isHoliday || status === 'HOLIDAY'
          ? 'FFEEF2FF'
          : isWeekend || status === 'WEEKEND'
            ? 'FFF1F5F9'
            : rowFill;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellFill } };
      cell.border = CELL_BORDER;

      if (dayInfo?.times) {
        cell.note = `Scans: ${dayInfo.times}`;
      }
    });

    const { lateDays, absentDays, presentDays } = getEmployeeSummaryCounts(emp);

    const countColumns = [
      { offset: 0, value: lateDays, color: 'FFD97706' },
      { offset: 1, value: absentDays, color: 'FFDC2626' },
      { offset: 2, value: presentDays, color: 'FF059669' },
    ];

    countColumns.forEach(({ offset, value, color }) => {
      const cell = row.getCell(summaryStartCol + offset);
      cell.value = value;
      cell.numFmt = '0"d"';
      cell.font = {
        name: FONT_FAMILY,
        size: 10,
        bold: value > 0,
        color: { argb: value > 0 ? color : 'FF64748B' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
      cell.border = CELL_BORDER;
    });
  });

  // ---------------------------------------------------------------------------
  // Totals Row
  // ---------------------------------------------------------------------------
  const dataEndRow = dataStartRow + matrix.length - 1;
  const totalRowNum = dataEndRow + 1;
  const totalRow = sheet.getRow(totalRowNum);
  totalRow.height = 24;

  const totalBorder = {
    ...CELL_BORDER,
    top: { style: 'medium', color: { argb: 'FF1E293B' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };
  const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  sheet.mergeCells(`A${totalRowNum}:B${totalRowNum}`);
  const totalLabelCell = sheet.getCell(`A${totalRowNum}`);
  totalLabelCell.value = 'Monthly Totals';
  totalLabelCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FF0F172A' } };
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

  for (let col = 1; col < summaryStartCol; col++) {
    const cell = totalRow.getCell(col);
    cell.fill = totalFill;
    cell.border = totalBorder;
  }

  [
    { colLetter: lateColLetter, color: 'FFB45309' },
    { colLetter: absenceColLetter, color: 'FFB91C1C' },
    { colLetter: presentColLetter, color: 'FF047857' },
  ].forEach(({ colLetter, color }) => {
    const cell = sheet.getCell(`${colLetter}${totalRowNum}`);
    cell.value = { formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})` };
    cell.numFmt = '0"d"';
    cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: color } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = totalFill;
    cell.border = totalBorder;
  });

  // ---------------------------------------------------------------------------
  // Footer: Plain Holidays Summary
  // ---------------------------------------------------------------------------
  const footerStartRow = totalRowNum + 2;

  const groupedHolidays = groupConsecutiveHolidays(holidays, monthShort);
  if (groupedHolidays.length > 0) {
    const holidayEndCol = Math.min(totalCols, 24);
    const holidayEndLetter = getColumnLetter(Math.max(4, holidayEndCol));

    sheet.mergeCells(`A${footerStartRow}:${holidayEndLetter}${footerStartRow}`);
    const hTitleRow = sheet.getRow(footerStartRow);
    hTitleRow.height = 22;
    const hTitleCell = sheet.getCell(`A${footerStartRow}`);
    hTitleCell.value = `Holidays in ${monthName} ${year}`;
    hTitleCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FF3730A3' } };
    hTitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

    groupedHolidays.forEach((h, idx) => {
      const rNum = footerStartRow + 1 + idx;
      const r = sheet.getRow(rNum);
      r.height = 20;

      sheet.mergeCells(`A${rNum}:${holidayEndLetter}${rNum}`);
      const lineCell = sheet.getCell(`A${rNum}`);
      lineCell.value = {
        richText: [
          {
            text: `${h.dateLabel}: `,
            font: { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: 'FF4F46E5' } },
          },
          {
            text: h.title,
            font: { name: FONT_FAMILY, size: 9.5, color: { argb: 'FF1E293B' } },
          },
        ],
      };
      lineCell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  }

  // ---------------------------------------------------------------------------
  // Column Widths
  // ---------------------------------------------------------------------------
  sheet.getColumn(1).width = 10;
  sheet.getColumn(2).width = Math.min(Math.max(maxNameLen + 3, 20), 34);
  daysArray.forEach((_, idx) => {
    sheet.getColumn(3 + idx).width = 3.6;
  });
  sheet.getColumn(summaryStartCol).width = 7.5;
  sheet.getColumn(summaryStartCol + 1).width = 8.5;
  sheet.getColumn(summaryStartCol + 2).width = 8;

  const lastContentRow =
    groupedHolidays.length > 0 ? footerStartRow + groupedHolidays.length : totalRowNum;
  sheet.pageSetup.printArea = `A$1:${lastColLetter}$${lastContentRow}`;

  // ---------------------------------------------------------------------------
  // Download .xlsx
  // ---------------------------------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = `monthly_attendance_${year}_${String(month).padStart(2, '0')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
