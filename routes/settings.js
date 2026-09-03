const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', (req, res) => {
  res.json(store.db.settings);
});

router.put('/', (req, res) => {
  store.db.settings = { ...store.db.settings, ...req.body };
  store.save();
  res.json({ success: true, settings: store.db.settings });
});

module.exports = router;
