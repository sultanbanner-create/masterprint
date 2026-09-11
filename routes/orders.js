const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', (req, res) => {
  let orders = [...store.db.orders];
  const { status, category, search, clientId } = req.query;

  if (status && status !== 'all') {
    orders = orders.filter(o => o.status === status);
  }
  if (category && category !== 'all') {
    orders = orders.filter(o => o.category === category);
  }
  if (clientId) {
    orders = orders.filter(o => o.clientId === clientId);
  }
  if (search) {
    const s = search.toLowerCase();
    orders = orders.filter(o =>
      (o.title && o.title.toLowerCase().includes(s)) ||
      (o.clientName && o.clientName.toLowerCase().includes(s)) ||
      String(o.orderNumber).includes(s)
    );
  }
  res.json(orders);
});

router.get('/:id', (req, res) => {
  const order = store.db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  res.json(order);
});

router.post('/', (req, res) => {
  const {
    clientName, clientPhone, category, title, details,
    designerId, designerFee, masterId, masterFee,
    totalAmount, paidAmount, paymentMethod, notes, createdBy
  } = req.body;

  store.db.orderCounter = (store.db.orderCounter || 1000) + 1;
  const orderNumber = store.db.orderCounter;
  const now = new Date();

  const total = Number(totalAmount) || 0;
  const paid = Number(paidAmount) || 0;
  const debt = Math.max(0, total - paid);

    const isPaid = paid >= total && total > 0;
  const paymentStatus = isPaid ? 'paid' : (paid > 0 ? 'partial' : 'pending');

  const newOrder = {
    id: 'ord_' + Date.now(),
    orderNumber,
    category: category || 'wide_format',
    title: title || 'Заказ #' + orderNumber,
    clientName: clientName || 'Клиент',
    clientPhone: clientPhone || '',
    details: details || {},
    designerId: designerId || null,
    designerFee: Number(designerFee) || 0,
    masterId: masterId || null,
    masterFee: Number(masterFee) || 0,
    totalAmount: total,
    paidAmount: paid,
    paymentMethod: paymentMethod || 'cash',
    paymentStatus,
    paymentConfirmedBy: isPaid ? (createdBy || 'Кассир') : null,
    paymentConfirmedAt: isPaid ? now.toISOString() : null,
    status: 'new',
    notes: notes || '',
    createdBy: createdBy || 'admin',
    createdAt: now.toISOString(),
    history: [{ status: 'new', time: now.toISOString(), user: createdBy || 'admin' }]
  };

  store.db.orders.unshift(newOrder);

  // Update or create client
  if (clientName) {
    let client = store.db.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    if (!client) {
      client = {
        id: 'cl_' + Date.now(),
        name: clientName,
        phone: clientPhone || '',
        currentDebt: debt,
        totalSpent: total,
        notes: ''
      };
      store.db.clients.push(client);
    } else {
      client.totalSpent = (client.totalSpent || 0) + total;
      client.currentDebt = (client.currentDebt || 0) + debt;
    }
  }

  // Deduct materials
  const deducted = store.deductMaterialsForOrder(newOrder);
  store.save();

  res.json({ success: true, order: newOrder, deductedMaterials: deducted });
});

router.patch('/:id/status', (req, res) => {
  const order = store.db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });

  order.status = req.body.status;
  if (!order.history) order.history = [];
  order.history.push({ status: req.body.status, time: new Date().toISOString(), user: req.body.userId || 'system' });

  if (req.body.status === 'delivered') {
    order.completedAt = new Date().toISOString();
  }

  store.save();
  res.json({ success: true, order });
});


router.delete('/:id', (req, res) => {
  const index = store.db.orders.findIndex(o => o.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Заказ не найден' });
  const deleted = store.db.orders.splice(index, 1)[0];
  store.save();
  res.json({ success: true, deleted });
});


// Confirm order payment by Cashier
router.post('/:id/confirm-payment', (req, res) => {
  try {
    const { paidAmount, paymentMethod, cashierId, cashierName, notes } = req.body;
    const order = store.db.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });

    const remaining = Math.max(0, (Number(order.totalAmount) || 0) - (Number(order.paidAmount) || 0));
    const numPaid = Number(paidAmount) > 0 ? Number(paidAmount) : remaining;

    order.paidAmount = (Number(order.paidAmount) || 0) + numPaid;
    order.paymentMethod = paymentMethod || order.paymentMethod || 'cash';
    order.paymentConfirmedBy = cashierName || cashierId || 'Наргиза (Кассир)';
    order.paymentConfirmedAt = new Date().toISOString();
    order.paymentStatus = (order.paidAmount >= order.totalAmount) ? 'paid' : 'partial';

    if (!order.history) order.history = [];
    order.history.push({
      status: `Оплата подтверждена: +${numPaid} сум (${order.paymentMethod}) кассиром ${order.paymentConfirmedBy}`,
      time: new Date().toISOString(),
      user: order.paymentConfirmedBy
    });

    // Update live open shift
    const openShift = (store.db.shifts || []).find(s => s.status === 'open');
    if (openShift) {
      if (order.paymentMethod === 'cash') {
        openShift.cashSales = (Number(openShift.cashSales) || 0) + numPaid;
      } else if (order.paymentMethod === 'click') {
        openShift.clickSales = (Number(openShift.clickSales) || 0) + numPaid;
      }
      openShift.expectedCash = Math.max(0, (Number(openShift.initialCash) || 0) + (Number(openShift.cashSales) || 0) - (Number(openShift.expensesCash) || 0));
    }

    // Update client debt balance
    if (order.clientId) {
      const client = (store.db.clients || []).find(c => c.id === order.clientId);
      if (client) {
        client.currentDebt = Math.max(0, (Number(client.currentDebt) || 0) - numPaid);
      }
    }

    store.save();
    res.json({ success: true, order, receipt: order });
  } catch (err) {
    console.error('Error confirming payment:', err);
    res.status(500).json({ error: 'Ошибка подтверждения оплаты: ' + err.message });
  }
});

module.exports = router;
