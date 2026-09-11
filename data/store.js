const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');
const TMP_PATH = path.join(__dirname, 'db.json.tmp');

const INITIAL_WAREHOUSE = [
  { id: 'wh_paper_a4_80', name: 'Бумага А4 80г (Снегурочка/DoubleA)', category: 'polygraphy', inStock: 2500, unit: 'лист', minStock: 500, price: 100 },
  { id: 'wh_paper_a3_80', name: 'Бумага А3 80г', category: 'polygraphy', inStock: 900, unit: 'лист', minStock: 200, price: 200 },
  { id: 'wh_paper_250_a3', name: 'Бумага плотная 250г А3', category: 'polygraphy', inStock: 450, unit: 'лист', minStock: 100, price: 1500 },
  { id: 'wh_paper_300_a3', name: 'Бумага мелованная 300г А3', category: 'polygraphy', inStock: 320, unit: 'лист', minStock: 100, price: 1800 },
  { id: 'wh_lam_a4_100', name: 'Пленка для ламинации А4 100мкм', category: 'polygraphy', inStock: 800, unit: 'лист', minStock: 150, price: 800 },
  { id: 'wh_lam_a3_100', name: 'Пленка для ламинации А3 100мкм', category: 'polygraphy', inStock: 350, unit: 'лист', minStock: 80, price: 1600 },
  { id: 'wh_lam_card', name: 'Пленка для ламинации 65х95мм', category: 'polygraphy', inStock: 1200, unit: 'шт', minStock: 200, price: 300 },
  { id: 'wh_photo_paper', name: 'Фотобумага 10х15 / А4 глянцевая', category: 'photo', inStock: 600, unit: 'лист', minStock: 100, price: 1200 },
  { id: 'wh_coil_plastic', name: 'Пружина пластиковая для переплета', category: 'binding', inStock: 180, unit: 'шт', minStock: 40, price: 1500 },
  { id: 'wh_bind_cover', name: 'Обложка для переплета (прозрачная/картон)', category: 'binding', inStock: 360, unit: 'шт', minStock: 60, price: 800 },
  { id: 'wh_bind_hard', name: 'Твердая обложка (Дипломная синяя/красная)', category: 'binding', inStock: 45, unit: 'шт', minStock: 10, price: 15000 },
  { id: 'wh_frame_a4', name: 'Рамка деревянная А4 со стеклом + илгек', category: 'accessories', inStock: 42, unit: 'шт', minStock: 15, price: 16000 },
  { id: 'wh_paper_250_a4', name: 'Фотобумага А4 250г (глянцевая)', category: 'photo', inStock: 500, unit: 'лист', minStock: 100, price: 1500 },
  { id: 'wh_banner_440', name: 'Баннерная ткань 440г Европа (рулон)', category: 'wide_format', inStock: 150, unit: 'м²', minStock: 30, price: 18000 },
  { id: 'wh_banner_330', name: 'Баннерная ткань 330г Эконом', category: 'wide_format', inStock: 95, unit: 'м²', minStock: 25, price: 14000 },
  { id: 'wh_oracal_641', name: 'Пленка самоклеящаяся Oracal 641', category: 'wide_format', inStock: 85, unit: 'м²', minStock: 20, price: 22000 },
  { id: 'wh_canvas', name: 'Холст натуральный 380г', category: 'wide_format', inStock: 35, unit: 'м²', minStock: 10, price: 45000 },
  { id: 'wh_backlit', name: 'Пленка Backlit световая', category: 'wide_format', inStock: 40, unit: 'м²', minStock: 10, price: 35000 },
  { id: 'wh_grommets_10', name: 'Люверсы металлические 10мм', category: 'accessories', inStock: 2500, unit: 'шт', minStock: 500, price: 100 },
  { id: 'wh_acrylic_3mm', name: 'Акрил прозрачный 3мм (1.2х2.4м)', category: 'outdoor', inStock: 6, unit: 'лист', minStock: 2, price: 420000 }
];

const SERVICE_RECIPES = {
  'qs_xerox_a4': [{ materialId: 'wh_paper_a4_80', qty: 1 }],
  'qs_xerox_duplex': [{ materialId: 'wh_paper_a4_80', qty: 1 }],
  'qs_print_bw': [{ materialId: 'wh_paper_a4_80', qty: 1 }],
  'qs_print_color': [{ materialId: 'wh_paper_a4_80', qty: 1 }],
  'qs_photo_3x4': [{ materialId: 'wh_photo_paper', qty: 1 }],
  'qs_photo_4x6': [{ materialId: 'wh_photo_paper', qty: 1 }],
  'qs_lam_a4': [{ materialId: 'wh_lam_a4_100', qty: 1 }],
  'qs_lam_a3': [{ materialId: 'wh_lam_a3_100', qty: 1 }],
  'qs_bind_coil': [
    { materialId: 'wh_coil_plastic', qty: 1 },
    { materialId: 'wh_bind_cover', qty: 2 }
  ],
  'qs_bind_hard': [{ materialId: 'wh_bind_hard', qty: 1 }],
  'qs_frame_a4': [{ materialId: 'wh_frame_a4', qty: 1 }]
};

class DataStore {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_PATH)) {
      this.db = this.getInitialSchema();
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        this.db = JSON.parse(raw);
        this.ensureSchemaIntegrity();
      } catch (e) {
        console.error('Error reading db.json:', e);
        this.db = this.getInitialSchema();
        this.save();
      }
    }
  }

  ensureSchemaIntegrity() {
    const defaults = this.getInitialSchema();
    let updated = false;
    for (const key of Object.keys(defaults)) {
      if (this.db[key] === undefined) {
        this.db[key] = defaults[key];
        updated = true;
      }
    }
    if (updated) this.save();
  }

  getInitialSchema() {
    return {
      users: [
        { id: 'admin', name: 'Директор', role: 'admin', pin: '12345', phone: '+998901234500', color: '#dc2626' },
        { id: 'cashier', name: 'Наргиза (Кассир)', role: 'cashier', pin: '12345', phone: '+998901234509', color: '#059669' },
        { id: 'islam', name: 'Ислам', role: 'designer', pin: '12345', phone: '+998901234501', color: '#3b82f6' },
        { id: 'beksultan', name: 'Бексултан', role: 'designer', pin: '12345', phone: '+998901234502', color: '#10b981' },
        { id: 'aziz', name: 'Азиз', role: 'designer', pin: '12345', phone: '+998901234503', color: '#f59e0b' },
        { id: 'makhmud', name: 'Махмуд', role: 'master', pin: '12345', phone: '+998901234504', color: '#8b5cf6' },
        { id: 'azhiniyaz', name: 'Ажинияз', role: 'master', pin: '12345', phone: '+998901234505', color: '#ec4899' },
        { id: 'timur', name: 'Тимур', role: 'worker', pin: '12345', phone: '+998901234506', color: '#6366f1' },
        { id: 'abzal', name: 'Абзал', role: 'worker', pin: '12345', phone: '+998901234507', color: '#14b8a6' },
        { id: 'marcel', name: 'Марсель', role: 'worker', pin: '12345', phone: '+998901234508', color: '#f97316' }
      ],
      warehouse: INITIAL_WAREHOUSE,
      orders: [],
      expenses: [],
      shifts: [],
      clients: [
        { id: 'c_1', name: 'ООО "Grand Stroy"', phone: '+998901112233', currentDebt: 0, totalSpent: 4500000 },
        { id: 'c_2', name: 'ИП "Asia Trade"', phone: '+998912223344', currentDebt: 0, totalSpent: 2800000 },
        { id: 'c_3', name: 'Кафе "Milliy Taomlar"', phone: '+998933334455', currentDebt: 0, totalSpent: 1250000 },
        { id: 'c_4', name: 'Учебный центр "Smart"', phone: '+998944445566', currentDebt: 0, totalSpent: 3100000 },
        { id: 'c_5', name: 'Автосалон "Premium Motors"', phone: '+998955556677', currentDebt: 0, totalSpent: 6200000 },
        { id: 'c_6', name: 'Розничный клиент', phone: '—', currentDebt: 0, totalSpent: 850000 }
      ],
      stockLogs: [],
      chatChannels: [
        { id: 'general', name: 'Общий цех', icon: '🏭' },
        { id: 'designers', name: 'Дизайнеры', icon: '🎨' },
        { id: 'orders', name: 'Срочные заказы', icon: '⚡' },
        { id: 'materials', name: 'Закупка сырья', icon: '📦' }
      ],
      chatMessages: [],
      settings: {
        companyName: 'MASTER PRINT',
        companyPhone: '+998 90 123 45 67',
        currency: 'сум',
        defaultPin: '12345'
      }
    };
  }

  save() {
    try {
      const data = JSON.stringify(this.db, null, 2);
      fs.writeFileSync(TMP_PATH, data, 'utf8');
      fs.renameSync(TMP_PATH, DB_PATH);
    } catch (e) {
      console.error('Error in atomic save:', e);
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2), 'utf8');
      } catch (err) {
        console.error('Critical fallback save error:', err);
      }
    }
  }

    deductStockForOrder(order) {
    if (!this.db || !this.db.warehouse) return [];
    const deductions = [];
    const logs = [];
    const nowStr = new Date().toISOString().split('T')[0];

    // Deduct POS items based on their defined recipe (can contain multiple ingredients!)
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const itemQty = Number(item.qty) || 1;
                // Find service directly or within unified group variants
        let srv = (this.db.quickServices || []).find(s => s.id === item.id);
        if (!srv) {
          for (const g of (this.db.quickServices || [])) {
            if (g.variants) {
              const foundV = g.variants.find(v => v.id === item.id);
              if (foundV) { srv = foundV; break; }
            }
          }
        }
        const recipe = (srv && Array.isArray(srv.recipe) && srv.recipe.length > 0) 
          ? srv.recipe 
          : (item.recipe && item.recipe.length > 0 ? item.recipe : (SERVICE_RECIPES[item.id] || []));

        if (recipe && recipe.length > 0) {
          for (const ing of recipe) {
            const mat = this.db.warehouse.find(m => m.id === ing.materialId);
            if (mat) {
              const qtyToDeduct = (Number(ing.qty) || 1) * itemQty;
              mat.inStock = Math.max(0, Math.round((mat.inStock - qtyToDeduct) * 100) / 100);
              deductions.push(`${mat.name}: -${qtyToDeduct} ${mat.unit}`);
              logs.push({
                id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                date: nowStr,
                timestamp: new Date().toISOString(),
                type: 'deduction',
                materialId: mat.id,
                materialName: mat.name,
                delta: -qtyToDeduct,
                unit: mat.unit,
                remainingStock: mat.inStock,
                reason: `Чек №${order.orderNumber} (${item.title} x${itemQty} -> расход: ${mat.name} x${qtyToDeduct})`,
                orderId: order.id,
                userId: order.createdBy
              });
            }
          }
        }
      }
    }

    // Deduct Wide Format Banner / Oracal
    if (order.details && order.details.area) {
      const area = Number(order.details.area) || 0;
      let matId = 'wh_banner_440';
      if (order.details.material && order.details.material.includes('330')) matId = 'wh_banner_330';
      if (order.details.material && order.details.material.includes('Оракал')) matId = 'wh_oracal_641';

      const mat = this.db.warehouse.find(m => m.id === matId);
      if (mat && area > 0) {
        mat.inStock = Math.max(0, Math.round((mat.inStock - area) * 100) / 100);
        deductions.push(`${mat.name}: -${area} ${mat.unit}`);
        logs.push({
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          date: nowStr,
          timestamp: new Date().toISOString(),
          type: 'deduction',
          materialId: mat.id,
          materialName: mat.name,
          delta: -area,
          unit: mat.unit,
          remainingStock: mat.inStock,
          reason: `Заказ №${order.orderNumber} (${order.title} - ${area} м²)`,
          orderId: order.id,
          userId: order.createdBy
        });
      }

      if (order.details.grommets && order.details.width && order.details.height) {
        const perimeter = 2 * (Number(order.details.width) + Number(order.details.height));
        const grommetCount = Math.ceil(perimeter / 0.35);
        const grommetMat = this.db.warehouse.find(m => m.id === 'wh_grommets_10');
        if (grommetMat && grommetCount > 0) {
          grommetMat.inStock = Math.max(0, grommetMat.inStock - grommetCount);
          deductions.push(`Люверсы металлические 10мм: -${grommetCount} шт`);
          logs.push({
            id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: nowStr,
            timestamp: new Date().toISOString(),
            type: 'deduction',
            materialId: grommetMat.id,
            materialName: grommetMat.name,
            delta: -grommetCount,
            unit: grommetMat.unit,
            remainingStock: grommetMat.inStock,
            reason: `Люверсы для заказа №${order.orderNumber} (${grommetCount} шт)`,
            orderId: order.id,
            userId: order.createdBy
          });
        }
      }
    }

    if (logs.length > 0) {
      if (!this.db.stockLogs) this.db.stockLogs = [];
      this.db.stockLogs.unshift(...logs);
      this.save();
    }

    return deductions;
  }

  deductMaterialsForOrder(order) {
    return this.deductStockForOrder(order);
  }

  addIncomingStock(materialId, qty, unitPrice = 0, createExpense = true, userId = 'admin') {
    const mat = this.db.warehouse.find(m => m.id === materialId);
    if (!mat) throw new Error('Material not found');

    const numQty = Number(qty) || 0;
    mat.inStock = Math.round((mat.inStock + numQty) * 100) / 100;
    const nowStr = new Date().toISOString().split('T')[0];

    if (!this.db.stockLogs) this.db.stockLogs = [];
    this.db.stockLogs.unshift({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: nowStr,
      timestamp: new Date().toISOString(),
      type: 'incoming',
      materialId: mat.id,
      materialName: mat.name,
      delta: numQty,
      unit: mat.unit,
      remainingStock: mat.inStock,
      reason: `Поступление сырья: ${mat.name} (+${numQty} ${mat.unit})`,
      userId
    });

    if (createExpense && unitPrice > 0) {
      const totalCost = Math.round(numQty * unitPrice);
      this.db.expenses.unshift({
        id: 'exp_' + Date.now(),
        date: nowStr,
        category: 'materials',
        title: `Закупка: ${mat.name} x${numQty} ${mat.unit}`,
        amount: totalCost,
        paymentMethod: 'cash',
        employeeId: null,
        createdAt: new Date().toISOString()
      });
    }

    this.save();
    return mat;
  }
}

const store = new DataStore();
module.exports = store;
