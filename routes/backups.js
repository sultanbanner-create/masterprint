const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const backupManager = require('../data/backupManager');
const store = require('../data/store');

// GET /api/backups - List backups
router.get('/', (req, res) => {
  const backups = backupManager.listBackups();
  res.json({ success: true, backups });
});

// POST /api/backups - Create manual backup
router.post('/', (req, res) => {
  const label = req.body.label || 'manual';
  const backup = backupManager.createBackup(label);
  if (!backup) return res.status(500).json({ error: 'Не удалось создать резервную копию' });
  res.json({ success: true, backup });
});

// GET /api/backups/download - Download current database
router.get('/download', (req, res) => {
  const dbPath = path.join(__dirname, '../data/db.json');
  if (!fs.existsSync(dbPath)) return res.status(404).json({ error: 'База не найдена' });
  res.download(dbPath, `masterprint_db_${new Date().toISOString().slice(0, 10)}.json`);
});

// POST /api/backups/restore/:filename - Restore backup
router.post('/restore/:filename', (req, res) => {
  const result = backupManager.restoreBackup(req.params.filename);
  if (!result.success) return res.status(400).json(result);

  // Reload store in memory
  store.load();
  res.json({ success: true, message: 'База данных успешно восстановлена!', filename: req.params.filename });
});

module.exports = router;
