const express = require('express');
const router = express.Router();
const store = require('../data/store');

if (!store.db.shifts || store.db.shifts.length === 0) {
  store.db.shifts = [
    {
      id: 'shift_1',
      shiftNumber: 1,
      openedAt: new Date().toISOString(),
      closedAt: null,
      openedBy: 'islam',
      initialCash: 500000,
      status: 'open',
      cashSales: 0,
      clickSales: 0,
      expensesCash: 0,
      expectedCash: 500000,
      actualCash: null,
      discrepancy: 0
    }
  ];
  store.save();
}

// Get current open shift with live calculated numbers
router.get('/current', (req, res) => {
  try {
    let openShift = store.db.shifts.find(s => s.status === 'open');
    if (!openShift) {
      return res.json({ status: 'closed', shift: null });
    }

    const openTime = new Date(openShift.openedAt).getTime();

    // Filter orders during this specific shift
    const shiftOrders = (store.db.orders || []).filter(o => {
      const ordTime = new Date(o.createdAt).getTime();
      return ordTime >= openTime;
    });

    const cashSales = shiftOrders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    const clickSales = shiftOrders.filter(o => o.paymentMethod === 'click').reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);

    // Filter expenses during this specific shift
    const shiftExpenses = (store.db.expenses || []).filter(e => {
      if (!e.createdAt) return false;
      const expTime = new Date(e.createdAt).getTime();
      return expTime >= openTime;
    });
    const expensesCash = shiftExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    openShift.cashSales = cashSales;
    openShift.clickSales = clickSales;
    openShift.expensesCash = expensesCash;
    openShift.expectedCash = Math.max(0, (Number(openShift.initialCash) || 0) + cashSales - expensesCash);

    res.json({ status: 'open', shift: openShift });
  } catch (err) {
    console.error('Error in /api/shifts/current:', err);
    res.status(500).json({ error: 'Server error retrieving shift' });
  }
});

// Open new shift
router.post('/open', (req, res) => {
  try {
    const { initialCash, openedBy } = req.body;
    const currentOpen = store.db.shifts.find(s => s.status === 'open');
    if (currentOpen) {
      return res.status(400).json({ error: 'Смена уже открыта!' });
    }

    const numInitial = Math.max(0, Number(initialCash) || 0);

    const newShift = {
      id: 'shift_' + Date.now(),
      shiftNumber: (store.db.shifts.length || 0) + 1,
      openedAt: new Date().toISOString(),
      closedAt: null,
      openedBy: openedBy || 'islam',
      initialCash: numInitial,
      status: 'open',
      cashSales: 0,
      clickSales: 0,
      expensesCash: 0,
      expectedCash: numInitial,
      actualCash: null,
      discrepancy: 0
    };

    store.db.shifts.push(newShift);
    store.save();
    res.json({ success: true, shift: newShift });
  } catch (err) {
    console.error('Error in /api/shifts/open:', err);
    res.status(500).json({ error: 'Server error opening shift' });
  }
});

// Close shift (Z-Report)
router.post('/close', (req, res) => {
  try {
    const { actualCash, closedBy } = req.body;
    const openShift = store.db.shifts.find(s => s.status === 'open');
    if (!openShift) {
      return res.status(400).json({ error: 'Нет открытой смены' });
    }

    const openTime = new Date(openShift.openedAt).getTime();

    const shiftOrders = (store.db.orders || []).filter(o => new Date(o.createdAt).getTime() >= openTime);
    const cashSales = shiftOrders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    const clickSales = shiftOrders.filter(o => o.paymentMethod === 'click').reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);

    const shiftExpenses = (store.db.expenses || []).filter(e => e.createdAt && new Date(e.createdAt).getTime() >= openTime);
    const expensesCash = shiftExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    openShift.closedAt = new Date().toISOString();
    openShift.closedBy = closedBy || 'islam';
    openShift.cashSales = cashSales;
    openShift.clickSales = clickSales;
    openShift.expensesCash = expensesCash;
    openShift.expectedCash = Math.max(0, (Number(openShift.initialCash) || 0) + cashSales - expensesCash);
    openShift.actualCash = Number(actualCash) !== undefined && !isNaN(Number(actualCash)) ? Number(actualCash) : openShift.expectedCash;
    openShift.discrepancy = openShift.actualCash - openShift.expectedCash;
    openShift.status = 'closed';

    store.save();
    res.json({ success: true, zReport: openShift });
  } catch (err) {
    console.error('Error in /api/shifts/close:', err);
    res.status(500).json({ error: 'Server error closing shift' });
  }
});

module.exports = router;
