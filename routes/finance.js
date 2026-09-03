const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/summary', (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = store.db.orders.filter(o => (o.createdAt || '').startsWith(todayStr));
  const todayExpenses = store.db.expenses.filter(e => e.date === todayStr);

  const todayIncomeCash = todayOrders.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + (o.paidAmount || 0), 0);
  const todayIncomeClick = todayOrders.filter(o => o.paymentMethod === 'click').reduce((s, o) => s + (o.paidAmount || 0), 0);
  const todayExpense = todayExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  res.json({
    todayStr,
    todayIncomeCash,
    todayIncomeClick,
    todayTotalIncome: todayIncomeCash + todayIncomeClick,
    todayExpense,
    todayBalance: (todayIncomeCash + todayIncomeClick) - todayExpense,
    ordersCount: todayOrders.length
  });
});

router.get('/expenses', (req, res) => {
  res.json(store.db.expenses);
});

router.post('/expenses', (req, res) => {
  const { date, category, title, amount, paymentMethod, employeeId } = req.body;
  if (!title || !amount) return res.status(400).json({ error: 'Заполните название и сумму' });

  const newExp = {
    id: 'exp_' + Date.now(),
    date: date || new Date().toISOString().split('T')[0],
    category: category || 'operating',
    title,
    amount: Number(amount),
    paymentMethod: paymentMethod || 'cash',
    employeeId: employeeId || null,
    createdAt: new Date().toISOString()
  };

  store.db.expenses.unshift(newExp);
  store.save();
  res.json({ success: true, expense: newExp });
});

router.delete('/expenses/:id', (req, res) => {
  store.db.expenses = store.db.expenses.filter(e => e.id !== req.params.id);
  store.save();
  res.json({ success: true });
});

module.exports = router;
