const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/balances', (req, res) => {
  const users = store.db.users;
  const orders = store.db.orders;
  const expenses = store.db.expenses;

  const result = users.map(u => {
    let designEarned = 0;
    let masterEarned = 0;

    orders.forEach(o => {
      if (o.designerId === u.id) designEarned += (Number(o.designerFee) || 0);
      if (o.masterId === u.id) masterEarned += (Number(o.masterFee) || 0);
    });

    const totalPayouts = expenses
      .filter(e => e.category === 'staff_payout' && e.employeeId === u.id)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalEarned = designEarned + masterEarned;
    const balanceDue = totalEarned - totalPayouts;

    return {
      user: { id: u.id, name: u.name, role: u.role, color: u.color, phone: u.phone },
      designEarned,
      masterEarned,
      totalEarned,
      totalPayouts,
      balanceDue
    };
  });

  res.json(result);
});

router.post('/payout', (req, res) => {
  const { employeeId, amount, type } = req.body;
  const emp = store.db.users.find(u => u.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'Сотрудник не найден' });

  const numAmount = Number(amount) || 0;
  const nowStr = new Date().toISOString().split('T')[0];

  const newExpense = {
    id: 'exp_' + Date.now(),
    date: nowStr,
    category: 'staff_payout',
    title: `${type === 'salary' ? 'Зарплата' : 'Аванс'}: ${emp.name}`,
    amount: numAmount,
    paymentMethod: 'cash',
    employeeId: emp.id,
    createdAt: new Date().toISOString()
  };

  store.db.expenses.unshift(newExpense);
  store.save();
  res.json({ success: true, expense: newExpense });
});

module.exports = router;
