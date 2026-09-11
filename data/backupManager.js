const fs = require('fs');
const path = require('path');

const BACKUPS_DIR = path.join(__dirname, 'backups');
const DB_PATH = path.join(__dirname, 'db.json');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

class BackupManager {
  constructor() {
    this.backupsDir = BACKUPS_DIR;
    this.dbPath = DB_PATH;
  }

  createBackup(label = 'manual') {
    try {
      if (!fs.existsSync(this.dbPath)) return null;

      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-');
      const filename = `db_backup_${dateStr}_${label}.json`;
      const targetPath = path.join(this.backupsDir, filename);

      fs.copyFileSync(this.dbPath, targetPath);
      const stat = fs.statSync(targetPath);

      this.rotateBackups(30);

      return {
        filename,
        path: targetPath,
        size: stat.size,
        sizeFormatted: (stat.size / 1024).toFixed(1) + ' KB',
        createdAt: now.toISOString(),
        label
      };
    } catch (err) {
      console.error('Error creating backup:', err);
      return null;
    }
  }

  listBackups() {
    try {
      if (!fs.existsSync(this.backupsDir)) return [];

      const files = fs.readdirSync(this.backupsDir)
        .filter(f => f.startsWith('db_backup_') && f.endsWith('.json'));

      return files.map(filename => {
        const filePath = path.join(this.backupsDir, filename);
        const stat = fs.statSync(filePath);
        return {
          filename,
          size: stat.size,
          sizeFormatted: (stat.size / 1024).toFixed(1) + ' KB',
          createdAt: stat.mtime.toISOString(),
          label: filename.includes('shift') ? 'Закрытие смены' : (filename.includes('auto') ? 'Автоматический' : (filename.includes('pre_restore') ? 'Перед откатом' : 'Вручную'))
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.error('Error listing backups:', err);
      return [];
    }
  }

  restoreBackup(filename) {
    try {
      const backupPath = path.join(this.backupsDir, filename);
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'Файл бэкапа не найден' };
      }

      const content = fs.readFileSync(backupPath, 'utf8');
      const parsed = JSON.parse(content);
      if (!parsed.users || !parsed.orders) {
        return { success: false, error: 'Файл повреждён или имеет неверную структуру' };
      }

      // Safety snapshot before restore
      this.createBackup('pre_restore');

      const tmpPath = this.dbPath + '.tmp';
      fs.writeFileSync(tmpPath, content, 'utf8');
      fs.renameSync(tmpPath, this.dbPath);

      return { success: true, filename };
    } catch (err) {
      console.error('Error restoring backup:', err);
      return { success: false, error: err.message };
    }
  }

  rotateBackups(keepCount = 30) {
    try {
      const backups = this.listBackups();
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        toDelete.forEach(b => {
          const filePath = path.join(this.backupsDir, b.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
      }
    } catch (err) {
      console.error('Error rotating backups:', err);
    }
  }
}

module.exports = new BackupManager();
