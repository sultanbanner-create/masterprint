const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.post('/checkout', (req, res) => {
  try {
    const { items, paymentMethod, isDebt, clientId, clientName, discount = 0, createdBy = 'islam' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста. Добавьте хотя бы одну услугу.' });
    }

    let subtotal = 0;
    const titleParts = [];

    items.forEach(item => {
      const lineTotal = (Number(item.price) || 0) * (Number(item.qty) || 1);
      subtotal += lineTotal;
      titleParts.push(`${item.title} x${item.qty}`);
    });

    const discountAmount = Math.round((subtotal * (Number(discount) || 0)) / 100);
    const finalAmount = Math.max(0, subtotal - discountAmount);
    const paidAmount = isDebt ? 0 : finalAmount;

    const orderNumber = 1000 + (store.db.orders ? store.db.orders.length : 0) + 1;
    const finalClientName = clientName || 'Розничный клиент';

    const newOrder = {
      id: 'ord_' + Date.now(),
      orderNumber,
      clientName: finalClientName,
      clientId: clientId || null,
      category: 'quick_pos',
      title: titleParts.join(', '),
      items,
      subtotal,
      discount: discountAmount,
      totalAmount: finalAmount,
      paidAmount,
      paymentMethod: isDebt ? 'debt' : (paymentMethod || 'cash'),
      status: isDebt ? 'Долг (Карыз)' : 'Выдан',
      createdBy,
      createdAt: new Date().toISOString()
    };

    if (!store.db.orders) store.db.orders = [];
    store.db.orders.unshift(newOrder);

    // If registered client and debt, update client debt balance
    if (clientId) {
      const client = (store.db.clients || []).find(c => c.id === clientId);
      if (client) {
        client.totalSpent = (Number(client.totalSpent) || 0) + finalAmount;
        if (isDebt) {
          client.currentDebt = (Number(client.currentDebt) || 0) + finalAmount;
        }
      }
    }

    // Auto-deduct all materials according to multi-ingredient recipes!
    const deductedMaterials = store.deductStockForOrder(newOrder);

    store.save();

    res.json({
      success: true,
      order: newOrder,
      deductedMaterials
    });
  } catch (err) {
    console.error('POS Checkout Error:', err);
    res.status(500).json({ error: 'Ошибка проведения кассовой операции: ' + err.message });
  }
});

module.exports = router;
