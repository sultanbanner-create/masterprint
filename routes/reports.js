const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { generateExcelReport } = require('../services/excelExport');

router.get('/monthly', (req, res) => {
  const month = req.query.month || '2026-05';
  const orders = store.db.orders;
  const expenses = store.db.expenses;

  const daysInMonth = 31;
  const matrix = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const fullDate = `${month}-${dayStr}`;

    const dayOrders = orders.filter(o => (o.createdAt || '').startsWith(fullDate));
    const dayExpenses = expenses.filter(e => e.date === fullDate);

    const staffIncome = { islam: 0, beksultan: 0, aziz: 0, makhmud: 0, azhiniyaz: 0 };
    let dayDebt = 0;
    let dayClick = 0;

    dayOrders.forEach(o => {
      const creator = (o.createdBy || '').toLowerCase();
      if (staffIncome[creator] !== undefined) {
        staffIncome[creator] += (o.paidAmount || 0);
      }
      const debt = (o.totalAmount || 0) - (o.paidAmount || 0);
      if (debt > 0) dayDebt += debt;
      if (o.paymentMethod === 'click') dayClick += (o.paidAmount || 0);
    });

    const totalIncome = Object.values(staffIncome).reduce((a, b) => a + b, 0);
    const totalExpense = dayExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const balance = totalIncome - totalExpense;

    matrix.push({
      day,
      date: fullDate,
      staff: staffIncome,
      debt: dayDebt,
      totalIncome,
      totalExpense,
      balance,
      click: dayClick,
      expensesList: dayExpenses
    });
  }

  const summary = {
    totalIncome: matrix.reduce((s, r) => s + r.totalIncome, 0),
    totalExpense: matrix.reduce((s, r) => s + r.totalExpense, 0),
    netProfit: matrix.reduce((s, r) => s + r.balance, 0),
    totalClick: matrix.reduce((s, r) => s + r.click, 0),
    totalDebt: matrix.reduce((s, r) => s + r.debt, 0)
  };

  res.json({ month, matrix, summary });
});

router.get('/export-excel', async (req, res) => {
  try {
    const month = req.query.month || '2026-05';
    const buffer = await generateExcelReport(month);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=MASTER_PRINT_${month}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error('Excel Export Error:', err);
    res.status(500).json({ error: 'Ошибка формирования Excel' });
  }
});

module.exports = router;
