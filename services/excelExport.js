const ExcelJS = require('exceljs');
const store = require('../data/store');

async function generateMonthlyExcelReport(monthStr = '2026-05') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PrintERP System';
  workbook.lastModifiedBy = 'PrintERP';
  workbook.created = new Date();
  workbook.modified = new Date();

  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const orders = store.get('orders') || [];
  const expenses = store.get('expenses') || [];
  const users = store.get('users') || [];

  const employeeKeys = ['islam', 'beksultan', 'aziz', 'makhmud', 'azhiniyaz'];
  const employeeNames = {
    islam: 'Ислам',
    beksultan: 'Бексултан',
    aziz: 'Азиз',
    makhmud: 'Махмуд',
    azhiniyaz: 'Ажинияз'
  };

  // ==========================================
  // 1. SHEET 1: Приход (Income Matrix)
  // ==========================================
  const s1 = workbook.addWorksheet('Приход 1-15');

  // Headers
  s1.mergeCells('A1:L1');
  s1.getCell('A1').value = 'Отчёт Приход (' + monthStr + ')';
  s1.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
  s1.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  s1.mergeCells('R1:W1');
  s1.getCell('R1').value = 'Дизайн / Сдельщина';
  s1.getCell('R1').font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
  s1.getCell('R1').alignment = { horizontal: 'center', vertical: 'middle' };

  const headersRow2 = [
    'Число',
    'Ислам',
    'Бексултан',
    'Азиз',
    'Махмуд',
    'Махмуд (2)',
    'Ажинияз',
    'Карыз клиенттен',
    'Итого',
    'Расход',
    'Остаток',
    'Клик',
    '', '', '', '', '',
    'Ислам',
    'Бексултан',
    'Азиз',
    'Махмуд',
    'Махмуд (2)',
    'Ажинияз'
  ];
  s1.getRow(2).values = headersRow2;
  s1.getRow(2).font = { bold: true };
  s1.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };

  // Calculate daily data
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const fullDate = `${monthStr}-${dayStr}`;
    const rowIndex = d + 2;

    const dayOrders = orders.filter(o => o.date === fullDate);
    const dayExpenses = expenses.filter(e => e.date === fullDate);

    // Sum revenue per staff
    const staffRevenue = {};
    employeeKeys.forEach(k => staffRevenue[k] = 0);
    let dayDebt = 0;
    let dayClick = 0;

    dayOrders.forEach(o => {
      const creator = o.createdBy || o.designerId || 'islam';
      const paid = Number(o.paidAmount) || 0;
      const total = Number(o.totalAmount) || 0;
      const debt = total - paid;

      if (staffRevenue[creator] !== undefined) {
        staffRevenue[creator] += paid;
      }
      if (debt > 0) {
        dayDebt += debt;
      }
      if (o.paymentMethod === 'click') {
        dayClick += paid;
      }
    });

    const dayExpenseTotal = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Design fees per staff
    const staffDesign = {};
    employeeKeys.forEach(k => staffDesign[k] = 0);
    dayOrders.forEach(o => {
      if (o.designerId && o.designerFee) {
        if (staffDesign[o.designerId] !== undefined) {
          staffDesign[o.designerId] += Number(o.designerFee);
        }
      }
    });

    const row = s1.getRow(rowIndex);
    row.getCell(1).value = d;
    row.getCell(2).value = staffRevenue.islam || null;
    row.getCell(3).value = staffRevenue.beksultan || null;
    row.getCell(4).value = staffRevenue.aziz || null;
    row.getCell(5).value = staffRevenue.makhmud || null;
    row.getCell(6).value = null;
    row.getCell(7).value = staffRevenue.azhiniyaz || null;
    row.getCell(8).value = dayDebt || null;

    // Formulas
    row.getCell(9).value = { formula: `SUM(B${rowIndex}:H${rowIndex})` };
    row.getCell(10).value = dayExpenseTotal;
    row.getCell(11).value = { formula: `I${rowIndex}-J${rowIndex}` };
    row.getCell(12).value = dayClick || null;

    // Design columns
    row.getCell(18).value = staffDesign.islam || null;
    row.getCell(19).value = staffDesign.beksultan || null;
    row.getCell(20).value = staffDesign.aziz || null;
    row.getCell(21).value = staffDesign.makhmud || null;
    row.getCell(22).value = null;
    row.getCell(23).value = staffDesign.azhiniyaz || null;

    row.alignment = { horizontal: 'right' };
    row.getCell(1).alignment = { horizontal: 'center' };
  }

  // Summary Row
  const totalRowIndex = daysInMonth + 3;
  const totalRow = s1.getRow(totalRowIndex);
  totalRow.getCell(1).value = 'Итого:';
  totalRow.font = { bold: true };
  
  for (let c = 2; c <= 8; c++) {
    const colLetter = s1.getColumn(c).letter;
    totalRow.getCell(c).value = { formula: `SUM(${colLetter}3:${colLetter}${totalRowIndex - 1})` };
  }
  totalRow.getCell(9).value = { formula: `SUM(I3:I${totalRowIndex - 1})` };
  totalRow.getCell(10).value = { formula: `SUM(J3:J${totalRowIndex - 1})` };
  totalRow.getCell(11).value = { formula: `SUM(K3:K${totalRowIndex - 1})` };
  totalRow.getCell(12).value = { formula: `SUM(L3:L${totalRowIndex - 1})` };

  // ==========================================
  // 2. SHEET 2: Расход (Detailed Expense Blocks)
  // ==========================================
  const s2 = workbook.addWorksheet('Расход 1-15');
  let currentS2Row = 1;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const fullDate = `${monthStr}-${dayStr}`;
    const dayExpenses = expenses.filter(e => e.date === fullDate);

    // Header block
    s2.getRow(currentS2Row).values = ['Число', fullDate, ''];
    s2.getRow(currentS2Row).font = { bold: true };
    currentS2Row++;

    s2.getRow(currentS2Row).values = ['№', 'Наименование товара / услуги', 'Цена (сум)'];
    s2.getRow(currentS2Row).font = { bold: true };
    currentS2Row++;

    const startDataRow = currentS2Row;
    const maxItems = Math.max(dayExpenses.length, 5); // At least 5 slots per day

    for (let i = 0; i < maxItems; i++) {
      const exp = dayExpenses[i];
      if (exp) {
        s2.getRow(currentS2Row).values = [i + 1, exp.title, Number(exp.amount) || 0];
      } else {
        s2.getRow(currentS2Row).values = [i + 1, '', null];
      }
      currentS2Row++;
    }

    const endDataRow = currentS2Row - 1;
    const totalExpRow = s2.getRow(currentS2Row);
    totalExpRow.values = ['Итого:', '', { formula: `SUM(C${startDataRow}:C${endDataRow})` }];
    totalExpRow.font = { bold: true };
    currentS2Row += 2; // Blank row separator
  }

  // Adjust column widths
  [s1, s2].forEach(sheet => {
    sheet.columns.forEach(col => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: false }, cell => {
        const len = (cell.value ? cell.value.toString().length : 0);
        if (len > maxLen) maxLen = Math.min(len + 3, 30);
      });
      col.width = maxLen;
    });
  });

  return workbook;
}

module.exports = { generateMonthlyExcelReport };
