const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', (req, res) => {
  res.json(store.db.warehouse);
});

router.post('/adjust', (req, res) => {
  const { id, delta } = req.body;
  const mat = store.db.warehouse.find(m => m.id === id);
  if (!mat) return res.status(404).json({ error: 'Материал не найден' });

  const d = Number(delta) || 0;
  mat.inStock = Math.max(0, Math.round((mat.inStock + d) * 100) / 100);

  if (!store.db.stockLogs) store.db.stockLogs = [];
  store.db.stockLogs.unshift({
    id: 'log_' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    type: d >= 0 ? 'incoming' : 'deduction',
    materialId: mat.id,
    materialName: mat.name,
    delta: d,
    unit: mat.unit,
    remainingStock: mat.inStock,
    reason: 'Ручная корректировка остатков'
  });

  store.save();
  res.json({ success: true, material: mat });
});

router.post('/incoming', (req, res) => {
  const { materialId, qty, unitPrice, createExpense } = req.body;
  try {
    const mat = store.addIncomingStock(materialId, qty, unitPrice, createExpense !== false);
    res.json({ success: true, material: mat });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/logs', (req, res) => {
  res.json(store.db.stockLogs || []);
});

module.exports = router;
