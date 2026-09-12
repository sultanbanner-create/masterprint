const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { generateMonthlyExcelReport } = require('../services/excelExport');

const DAYS_OF_WEEK_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

router.get('/monthly', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const orders = store.db.orders || [];
  const expenses = store.db.expenses || [];

  const [yearStr, monthNumStr] = month.split('-');
  const year = parseInt(yearStr) || 2026;
  const monthNum = parseInt(monthNumStr) || 9;
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const matrix = [];
  const staffTotals = { islam: 0, beksultan: 0, aziz: 0, makhmud: 0, azhiniyaz: 0 };
  let monthOrdersCount = 0;
  let monthCash = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const fullDate = `${month}-${dayStr}`;
    const dateObj = new Date(year, monthNum - 1, day);
    const dayOfWeek = DAYS_OF_WEEK_RU[dateObj.getDay()];

    const dayOrders = orders.filter(o => {
      const oDate = o.createdAt ? o.createdAt.slice(0, 10) : (o.date || '');
      return oDate === fullDate;
    });

    const dayExpenses = expenses.filter(e => {
      const eDate = e.date ? e.date.slice(0, 10) : '';
      return eDate === fullDate;
    });

    const staffIncome = { islam: 0, beksultan: 0, aziz: 0, makhmud: 0, azhiniyaz: 0 };
    let dayDebt = 0;
    let dayClick = 0;
    let dayCash = 0;

    dayOrders.forEach(o => {
      monthOrdersCount++;
      const creator = (o.designerId || o.createdBy || 'islam').toLowerCase();
      const paid = Number(o.paidAmount) || 0;
      const total = Number(o.totalAmount) || 0;
      const debt = Math.max(0, total - paid);

      if (staffIncome[creator] !== undefined) {
        staffIncome[creator] += paid;
      } else {
        staffIncome.islam += paid;
      }

      dayDebt += debt;
      if (o.paymentMethod === 'click') {
        dayClick += paid;
      } else {
        dayCash += paid;
      }
    });

    Object.keys(staffIncome).forEach(k => {
      staffTotals[k] = (staffTotals[k] || 0) + staffIncome[k];
    });
    monthCash += dayCash;

    const totalIncome = Object.values(staffIncome).reduce((a, b) => a + b, 0);
    const totalExpense = dayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const balance = totalIncome - totalExpense;

    matrix.push({
      day,
      date: fullDate,
      dayOfWeek,
      staff: staffIncome,
      debt: dayDebt,
      totalIncome,
      totalExpense,
      balance,
      click: dayClick,
      cash: dayCash,
      ordersCount: dayOrders.length,
      hasActivity: dayOrders.length > 0 || dayExpenses.length > 0,
      expensesList: dayExpenses
    });
  }

  // All expenses for this month
  const monthExpensesList = expenses
    .filter(e => (e.date ? e.date.slice(0, 10) : '').startsWith(month))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Calculate available months across orders and expenses
  const orderMonths = orders.map(o => (o.createdAt || o.date || '').slice(0, 7)).filter(m => m && m.length === 7);
  const expenseMonths = expenses.map(e => (e.date || '').slice(0, 7)).filter(m => m && m.length === 7);
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const availableMonths = [...new Set([...orderMonths, ...expenseMonths, currentMonthStr, '2026-05', '2026-09'])].sort().reverse();

  const totalIncome = matrix.reduce((s, r) => s + r.totalIncome, 0);
  const totalExpense = matrix.reduce((s, r) => s + r.totalExpense, 0);
  const netProfit = totalIncome - totalExpense;
  const margin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  const summary = {
    totalIncome,
    totalExpense,
    netProfit,
    totalClick: matrix.reduce((s, r) => s + r.click, 0),
    totalCash: monthCash,
    totalDebt: matrix.reduce((s, r) => s + r.debt, 0),
    ordersCount: monthOrdersCount,
    expensesCount: monthExpensesList.length,
    margin,
    staffTotals
  };

  res.json({
    month,
    matrix,
    summary,
    expenses: monthExpensesList,
    availableMonths
  });
});

router.get('/export-excel', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const buffer = await generateMonthlyExcelReport(month);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="MASTER_PRINT_Otchet_${month}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(Buffer.from(buffer));
  } catch (err) {
    console.error('Excel Export Error:', err);
    res.status(500).json({ error: 'Ошибка формирования Excel: ' + err.message });
  }
});

module.exports = router;
