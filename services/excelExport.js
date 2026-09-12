const ExcelJS = require('exceljs');
const store = require('../data/store');

async function generateMonthlyExcelReport(monthStr = '2026-09') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MASTER PRINT ERP Enterprise';
  workbook.lastModifiedBy = 'MASTER PRINT';
  workbook.created = new Date();
  workbook.modified = new Date();

  const [yearStr, monthNumStr] = (monthStr || '2026-09').split('-');
  const year = parseInt(yearStr) || 2026;
  const month = parseInt(monthNumStr) || 9;
  const daysInMonth = new Date(year, month, 0).getDate();

  const monthNamesRu = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const monthTitle = `${monthNamesRu[month - 1] || 'Сентябрь'} ${year}`;

  const orders = store.db.orders || [];
  const expenses = store.db.expenses || [];

  const employeeNames = {
    islam: 'Ислам',
    beksultan: 'Бексултан',
    aziz: 'Азиз',
    makhmud: 'Махмуд',
    azhiniyaz: 'Ажинияз'
  };

  // =========================================================================
  // 1. SHEET 1: Выручка полиграфии & Приход (1-31)
  // =========================================================================
  const s1 = workbook.addWorksheet('Выручка 1-31');
  s1.views = [{ showGridLines: true }];

  // Title Banner
  s1.mergeCells('A1:K1');
  const titleCell = s1.getCell('A1');
  titleCell.value = `MASTER PRINT — МЕСЯЧНЫЙ ОТЧЁТ ВЫРУЧКИ (${monthTitle.toUpperCase()})`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1C30' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  s1.getRow(1).height = 36;

  // Subheader
  s1.mergeCells('A2:K2');
  const subCell = s1.getCell('A2');
  subCell.value = `Сформировано: ${new Date().toLocaleString('ru-RU')} • Система автоматизации MASTER PRINT ERP`;
  subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  s1.getRow(2).height = 20;

  // Table Headers (Row 3)
  const headers = [
    'Число',
    'Ислам',
    'Бексултан',
    'Азиз',
    'Махмуд',
    'Ажинияз',
    'Карыз (Долг)',
    'ИТОГО ПРИХОД',
    'РАСХОДЫ',
    'ОСТАТОК',
    'CLICK'
  ];

  const headerRow = s1.getRow(3);
  headerRow.values = headers;
  headerRow.height = 28;
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNumber === 8 ? 'FF059669' : (colNumber === 9 ? 'FFDC2626' : (colNumber === 10 ? 'FF2563EB' : 'FF1E293B')) }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0B1C30' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } }
    };
  });

  // Populate Days 1 to daysInMonth
  let grandIncome = 0;
  let grandExpense = 0;
  let grandClick = 0;
  let grandDebt = 0;
  let grandCash = 0;
  const staffTotals = { islam: 0, beksultan: 0, aziz: 0, makhmud: 0, azhiniyaz: 0 };

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const fullDate = `${monthStr}-${dayStr}`;
    const rowIndex = day + 3;

    // Filter day orders & expenses
    const dayOrders = orders.filter(o => {
      const oDate = o.createdAt ? o.createdAt.slice(0, 10) : (o.date || '');
      return oDate === fullDate;
    });

    const dayExpenses = expenses.filter(e => {
      const eDate = e.date ? e.date.slice(0, 10) : '';
      return eDate === fullDate;
    });

    const staffRev = { islam: 0, beksultan: 0, aziz: 0, makhmud: 0, azhiniyaz: 0 };
    let dayDebt = 0;
    let dayClick = 0;
    let dayCash = 0;

    dayOrders.forEach(o => {
      const creator = (o.designerId || o.createdBy || 'islam').toLowerCase();
      const paid = Number(o.paidAmount) || 0;
      const total = Number(o.totalAmount) || 0;
      const debt = Math.max(0, total - paid);

      if (staffRev[creator] !== undefined) {
        staffRev[creator] += paid;
      } else {
        staffRev.islam += paid;
      }

      dayDebt += debt;
      if (o.paymentMethod === 'click') {
        dayClick += paid;
      } else {
        dayCash += paid;
      }
    });

    Object.keys(staffRev).forEach(k => {
      staffTotals[k] = (staffTotals[k] || 0) + staffRev[k];
    });

    const totalIncome = Object.values(staffRev).reduce((a, b) => a + b, 0);
    const totalExpense = dayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const balance = totalIncome - totalExpense;

    grandIncome += totalIncome;
    grandExpense += totalExpense;
    grandClick += dayClick;
    grandDebt += dayDebt;
    grandCash += dayCash;

    const row = s1.getRow(rowIndex);
    row.values = [
      day,
      staffRev.islam || null,
      staffRev.beksultan || null,
      staffRev.aziz || null,
      staffRev.makhmud || null,
      staffRev.azhiniyaz || null,
      dayDebt || null,
      totalIncome || 0,
      totalExpense || 0,
      balance || 0,
      dayClick || null
    ];
    row.height = 20;

    const isEven = day % 2 === 0;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Arial', size: 9, bold: true };
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      }

      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }

      if (colNumber === 8 && totalIncome > 0) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF059669' } };
      }
      if (colNumber === 9 && totalExpense > 0) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFDC2626' } };
      }
      if (colNumber === 10) {
        cell.font = {
          name: 'Arial',
          size: 9,
          bold: true,
          color: { argb: balance >= 0 ? 'FF0F172A' : 'FFDC2626' }
        };
      }
    });
  }

  // Grand Total Row
  const totalRowIndex = daysInMonth + 4;
  const totalRow = s1.getRow(totalRowIndex);
  totalRow.height = 26;
  totalRow.values = [
    'ИТОГО:',
    { formula: `SUM(B4:B${totalRowIndex - 1})` },
    { formula: `SUM(C4:C${totalRowIndex - 1})` },
    { formula: `SUM(D4:D${totalRowIndex - 1})` },
    { formula: `SUM(E4:E${totalRowIndex - 1})` },
    { formula: `SUM(F4:F${totalRowIndex - 1})` },
    { formula: `SUM(G4:G${totalRowIndex - 1})` },
    { formula: `SUM(H4:H${totalRowIndex - 1})` },
    { formula: `SUM(I4:I${totalRowIndex - 1})` },
    { formula: `SUM(J4:J${totalRowIndex - 1})` },
    { formula: `SUM(K4:K${totalRowIndex - 1})` }
  ];

  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = colNumber === 1 ? { horizontal: 'center', vertical: 'middle' } : { horizontal: 'right', vertical: 'middle' };
    cell.numFmt = '#,##0';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1C30' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF059669' } },
      bottom: { style: 'double', color: { argb: 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  // Column widths
  s1.getColumn(1).width = 8;
  s1.getColumn(2).width = 14;
  s1.getColumn(3).width = 14;
  s1.getColumn(4).width = 14;
  s1.getColumn(5).width = 14;
  s1.getColumn(6).width = 14;
  s1.getColumn(7).width = 15;
  s1.getColumn(8).width = 18;
  s1.getColumn(9).width = 16;
  s1.getColumn(10).width = 18;
  s1.getColumn(11).width = 16;

  // =========================================================================
  // 2. SHEET 2: Журнал расходов (Expenses Log)
  // =========================================================================
  const s2 = workbook.addWorksheet('Расходы цеха');
  s2.views = [{ showGridLines: true }];

  s2.mergeCells('A1:E1');
  s2.getCell('A1').value = `ЖУРНАЛ РАСХОДОВ ЦЕХА ЗА ${monthTitle.toUpperCase()}`;
  s2.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  s2.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
  s2.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  s2.getRow(1).height = 30;

  const expHeaders = ['№', 'Дата', 'Категория', 'Статья расхода / Описание', 'Сумма (сум)'];
  const expHeaderRow = s2.getRow(2);
  expHeaderRow.values = expHeaders;
  expHeaderRow.height = 24;
  expHeaderRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const monthExpenses = expenses.filter(e => (e.date || '').startsWith(monthStr));
  monthExpenses.forEach((e, idx) => {
    const row = s2.getRow(idx + 3);
    row.values = [
      idx + 1,
      e.date || '',
      e.category || 'Цех',
      e.title || 'Расход',
      Number(e.amount) || 0
    ];
    row.height = 20;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'right' };
    row.getCell(5).numFmt = '#,##0';
    const isEven = idx % 2 === 1;
    if (isEven) {
      row.eachCell({ includeEmpty: true }, c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  const expTotalRowIndex = monthExpenses.length + 3;
  const expTotalRow = s2.getRow(expTotalRowIndex);
  expTotalRow.values = ['ИТОГО РАСХОДОВ:', '', '', '', { formula: `SUM(E3:E${expTotalRowIndex - 1})` }];
  expTotalRow.font = { bold: true };
  expTotalRow.getCell(5).numFmt = '#,##0';
  expTotalRow.getCell(5).font = { bold: true, color: { argb: 'FFDC2626' } };

  s2.getColumn(1).width = 6;
  s2.getColumn(2).width = 13;
  s2.getColumn(3).width = 18;
  s2.getColumn(4).width = 38;
  s2.getColumn(5).width = 18;

  // =========================================================================
  // 3. SHEET 3: Сводный отчёт & KPI
  // =========================================================================
  const s3 = workbook.addWorksheet('Сводка & KPI');
  s3.views = [{ showGridLines: true }];

  s3.mergeCells('A1:D1');
  s3.getCell('A1').value = `СВОДНЫЙ ФИНАНСОВЫЙ ОТЧЁТ И KPI — ${monthTitle.toUpperCase()}`;
  s3.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  s3.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1C30' } };
  s3.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  s3.getRow(1).height = 32;

  const kpiData = [
    ['Показатель', 'Значение (сум)', 'Пояснение', 'Статус'],
    ['Общий приход (Выручка)', grandIncome, 'Всего заказов полиграфии', 'Норма'],
    ['Общие расходы цеха', grandExpense, 'Материалы, аренда, ЗП и др.', 'Факт'],
    ['Чистая прибыль (Остаток)', grandIncome - grandExpense, 'Приход минус Расходы', (grandIncome - grandExpense >= 0 ? 'Прибыль' : 'Убыток')],
    ['Безналичная оплата (Click)', grandClick, 'Платежи картой/QR', 'Поступило'],
    ['Наличные в кассе', grandCash, 'Оплата наличными', 'В кассе'],
    ['Долги за месяц (Карыз)', grandDebt, 'Клиенты не оплатили вовремя', 'К взысканию']
  ];

  kpiData.forEach((rowVals, i) => {
    const row = s3.getRow(i + 3);
    row.values = rowVals;
    row.height = 22;
    if (i === 0) {
      row.eachCell(c => {
        c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    } else {
      row.getCell(1).font = { bold: true };
      row.getCell(2).numFmt = '#,##0';
      row.getCell(2).alignment = { horizontal: 'right' };
      if (i === 3) {
        row.getCell(2).font = { bold: true, color: { argb: (grandIncome - grandExpense >= 0) ? 'FF059669' : 'FFDC2626' } };
      }
    }
  });

  // Staff summary block in Sheet 3
  const staffStartRow = 12;
  s3.mergeCells(`A${staffStartRow}:D${staffStartRow}`);
  s3.getCell(`A${staffStartRow}`).value = 'ВЫРУЧКА ПО СОТРУДНИКАМ / МАСТЕРАМ';
  s3.getCell(`A${staffStartRow}`).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  s3.getCell(`A${staffStartRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  s3.getCell(`A${staffStartRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  s3.getRow(staffStartRow).height = 26;

  const staffHeaders = ['Сотрудник', 'Выручка (сум)', 'Доля от прихода', 'Статус'];
  const staffHeaderRow = s3.getRow(staffStartRow + 1);
  staffHeaderRow.values = staffHeaders;
  staffHeaderRow.height = 22;
  staffHeaderRow.eachCell(c => {
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  let curRow = staffStartRow + 2;
  Object.keys(staffTotals).forEach(empKey => {
    const val = staffTotals[empKey] || 0;
    const share = grandIncome > 0 ? ((val / grandIncome) * 100).toFixed(1) + '%' : '0%';
    const row = s3.getRow(curRow);
    row.values = [
      employeeNames[empKey] || empKey,
      val,
      share,
      val > 0 ? 'Активен' : '—'
    ];
    row.height = 20;
    row.getCell(2).numFmt = '#,##0';
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    curRow++;
  });

  s3.getColumn(1).width = 28;
  s3.getColumn(2).width = 20;
  s3.getColumn(3).width = 30;
  s3.getColumn(4).width = 16;

  // Return binary buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  generateMonthlyExcelReport,
  generateExcelReport: generateMonthlyExcelReport
};
