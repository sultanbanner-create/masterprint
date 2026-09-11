
// =========================================================================
// CASHIER PAYMENT CONFIRMATION WORKFLOW
// =========================================================================
function openConfirmPaymentModal(orderId) {
  const modal = document.getElementById('confirmPaymentModal');
  if (!modal) return;

  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) return;

  const remaining = Math.max(0, (Number(order.totalAmount) || 0) - (Number(order.paidAmount) || 0));

  document.getElementById('confirmPayOrderId').value = order.id;
  document.getElementById('confirmPayOrderTitle').textContent = `Заказ #${order.orderNumber}`;
  document.getElementById('confirmPayClientName').textContent = order.clientName + (order.clientPhone ? ` (${order.clientPhone})` : '');
  document.getElementById('confirmPayItemName').textContent = order.title;
  document.getElementById('confirmPayDueAmount').textContent = formatMoney(remaining > 0 ? remaining : order.totalAmount);

  const cashierDisplay = document.getElementById('confirmPayCashierName');
  if (cashierDisplay) {
    cashierDisplay.textContent = state.currentUser ? state.currentUser.name : 'Наргиза (Кассир)';
  }

  modal.classList.remove('hidden');
}

function closeConfirmPaymentModal() {
  const modal = document.getElementById('confirmPaymentModal');
  if (modal) modal.classList.add('hidden');
}

async function submitConfirmPayment(event) {
  event.preventDefault();

  const orderId = document.getElementById('confirmPayOrderId')?.value;
  if (!orderId) return;

  const order = (state.orders || []).find(o => o.id === orderId);
  if (!order) return;

  const remaining = Math.max(0, (Number(order.totalAmount) || 0) - (Number(order.paidAmount) || 0));
  const amountToPay = remaining > 0 ? remaining : order.totalAmount;

  const methodRadios = document.getElementsByName('confirmPayMethodRadio');
  let selectedMethod = 'cash';
  for (const r of methodRadios) {
    if (r.checked) {
      selectedMethod = r.value;
      break;
    }
  }

  const cashierName = state.currentUser ? state.currentUser.name : 'Наргиза (Кассир)';
  const cashierId = state.currentUser ? state.currentUser.id : 'cashier';

  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paidAmount: amountToPay,
        paymentMethod: selectedMethod,
        cashierId,
        cashierName
      })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast('Ошибка', data.error || 'Не удалось подтвердить оплату', true);
      return;
    }

    closeConfirmPaymentModal();
    showToast('Оплата подтверждена!', `Чек №${data.order?.orderNumber} оформлен кассиром ${cashierName}`);

    // Open receipt
    if (data.order) {
      openReceiptModal(data.order);
    }

    await loadOrders();
    loadFinanceSummary();
    loadClients();
  } catch (err) {
    console.error('Error confirming payment:', err);
    showToast('Ошибка', 'Сбой при подтверждении оплаты', true);
  }
}

function renderPosPendingQueue() {
  const banner = document.getElementById('posCashierQueueBanner');
  const countEl = document.getElementById('posPendingQueueCount');
  const cardsContainer = document.getElementById('posPendingQueueCards');
  if (!banner || !cardsContainer) return;

  const pendingList = (state.orders || []).filter(o => {
    const isUnpaid = (Number(o.totalAmount) || 0) > (Number(o.paidAmount) || 0);
    return isUnpaid && o.category !== 'quick_pos';
  });

  if (countEl) countEl.textContent = `${pendingList.length} заказов`;

  if (pendingList.length === 0) {
    banner.classList.add('hidden');
    return;
  }

  banner.classList.remove('hidden');

  cardsContainer.innerHTML = pendingList.slice(0, 6).map(o => {
    const remaining = Math.max(0, (Number(o.totalAmount) || 0) - (Number(o.paidAmount) || 0));

    return `
      <div class="bg-white border border-amber-200/90 rounded-xl p-3 shadow-xs flex flex-col justify-between hover:border-amber-400 transition">
        <div>
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-extrabold text-on-surface font-data-sm">#${o.orderNumber}</span>
            <span class="text-[10px] text-amber-800 bg-amber-100 font-bold px-1.5 py-0.5 rounded">${o.designerId || o.createdBy || 'Дизайнер'}</span>
          </div>
          <div class="font-bold text-xs text-on-surface truncate" title="${o.title}">${o.title}</div>
          <div class="text-[11px] text-on-surface-variant truncate">${o.clientName}</div>
        </div>

        <div class="pt-2 mt-2 border-t border-dashed border-outline-variant flex items-center justify-between">
          <span class="font-black text-xs text-emerald-700 font-data-md">${formatMoney(remaining)}</span>
          <button onclick="openConfirmPaymentModal('${o.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1 cursor-pointer">
            <span class="material-symbols-outlined text-[13px]">payments</span>
            <span>Принять</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}


// =========================================================================
// UNIFIED SERVICES & VARIANT POPUP ENGINE
// =========================================================================
function handleServiceClick(serviceId) {
  const service = (state.quickServices || []).find(s => s.id === serviceId);
  if (!service) return;

  if (service.isGroup && Array.isArray(service.variants) && service.variants.length > 0) {
    openVariantModal(service);
  } else {
    addDirectServiceToCart(service);
  }
}

function openVariantModal(service) {
  const modal = document.getElementById('serviceVariantModal');
  const title = document.getElementById('variantModalTitle');
  const icon = document.getElementById('variantModalIcon');
  const container = document.getElementById('variantModalOptionsList');
  if (!modal || !container) return;

  if (title) title.textContent = service.title;
  if (icon) icon.textContent = sanitizeMaterialIcon(service.icon);

  container.innerHTML = service.variants.map(v => {
    // Check if item is already in cart
    const cartItem = state.cart.find(c => c.id === v.id);
    const inCart = cartItem ? cartItem.qty : 0;

    return `
      <button onclick="addVariantToCart('${service.id}', '${v.id}')" class="p-3.5 rounded-2xl border border-outline-variant hover:border-primary/60 bg-surface-container-low hover:bg-primary-container/5 transition-all text-left flex items-center justify-between group active:scale-[0.98] cursor-pointer shadow-xs">
        <div class="pr-2">
          <div class="font-bold text-xs text-on-surface group-hover:text-primary transition-colors flex items-center gap-1.5">
            <span>${v.title}</span>
            ${inCart > 0 ? `<span class="px-1.5 py-0.5 rounded bg-primary-container text-white text-[9px] font-bold">В чеке: ${inCart}</span>` : ''}
          </div>
          <div class="text-[10px] text-on-surface-variant mt-0.5">${v.unit}</div>
        </div>
        <div class="text-right">
          <div class="font-black text-sm font-data-md text-secondary">${formatMoney(v.price)}</div>
          <div class="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">+ Добавить</div>
        </div>
      </button>
    `;
  }).join('');

  modal.classList.remove('hidden');
}

function closeVariantModal() {
  const modal = document.getElementById('serviceVariantModal');
  if (modal) modal.classList.add('hidden');
}

function addVariantToCart(groupId, variantId) {
  const group = (state.quickServices || []).find(s => s.id === groupId);
  if (!group) return;
  const variant = (group.variants || []).find(v => v.id === variantId);
  if (!variant) return;

  const existing = state.cart.find(item => item.id === variant.id);
  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({
      id: variant.id,
      title: variant.title,
      price: variant.price,
      unit: variant.unit,
      qty: 1,
      icon: group.icon,
      recipe: variant.recipe || []
    });
  }

  showToast('Добавлено в заказ', `${variant.title} (+1)`);
  renderPosServices();
  renderCartUI();
  // Re-render modal in case user wants to add more variants
  openVariantModal(group);
}

function addDirectServiceToCart(service) {
  const existing = state.cart.find(item => item.id === service.id);
  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({
      id: service.id,
      title: service.title,
      price: service.price,
      unit: service.unit,
      qty: 1,
      icon: service.icon,
      recipe: service.recipe || []
    });
  }

  showToast('Добавлено в заказ', `${service.title} (+1)`);
  renderPosServices();
  renderCartUI();
}


// Safe Icon Mapping Dictionary (translates Lucide/FA/hyphenated icons to valid Material Symbols)
function sanitizeMaterialIcon(icon) {
  if (!icon) return 'content_copy';
  const map = {
    'printer': 'print',
    'file-text': 'description',
    'file_text': 'description',
    'file': 'description',
    'book-open': 'auto_stories',
    'book_open': 'auto_stories',
    'book': 'menu_book',
    'camera': 'photo_camera',
    'scan': 'document_scanner',
    'tag': 'badge',
    'square': 'crop_portrait',
    'hash': 'numbers'
  };
  return map[icon] || icon;
}

// =========================================================================
// MASTER PRINT — Enterprise POS, Orders CRM & Multi-Ingredient Engine
// =========================================================================

const API_BASE = '/api';

const state = {
  currentUser: null,
  currentPin: '',
  selectedLoginUserId: 'islam',
  activePosMaster: 'islam',
  users: [],
  quickServices: [], // dynamically loaded from /api/services
  cart: [],
  activePosPaymentMethod: 'cash',
  posIsDebt: false,
  selectedClientId: null,
  currentPosCategory: 'all',
  posSearchTerm: '',
  orders: [],
  currentOrderStatusFilter: 'all',
  ordersSearchTerm: '',
  expenses: [],
  staffBalances: [],
  clients: [],
  warehouse: [],
  monthlyReport: null,
  activeChatChannel: 'general',
  chatChannels: [],
  chatMessages: [],
  settings: {}
};

document.addEventListener('DOMContentLoaded', async () => {
  startLiveClock();

  const now = new Date();
  const expDate = document.getElementById('expDate');
  if (expDate) expDate.value = now.toISOString().split('T')[0];

  await loadUsers();
  await loadWarehouse();
  await loadServices();

  const savedUser = localStorage.getItem('printerp_user');
  if (savedUser) {
    try {
      state.currentUser = JSON.parse(savedUser);
      hideLoginModal();
      initDashboard();
    } catch (e) {
      showLoginModal();
    }
  } else {
    showLoginModal();
  }
});

function startLiveClock() {
  function updateTime() {
    const clock = document.getElementById('liveClockDisplay');
    if (clock) {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      clock.textContent = `${h}:${m}:${s}`;
    }
  }
  updateTime();
  setInterval(updateTime, 1000);
}

function formatMoney(amount) {
  const num = Number(amount) || 0;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум';
}

function showToast(title, desc, isError = false) {
  const toast = document.getElementById('toastNotification');
  const tTitle = document.getElementById('toastTitle');
  const tDesc = document.getElementById('toastDesc');
  const tIcon = document.getElementById('toastIconBg');
  if (!toast) return;

  if (tTitle) tTitle.textContent = title;
  if (tDesc) tDesc.textContent = desc;
  if (tIcon) {
    if (isError) {
      tIcon.className = 'w-8 h-8 rounded-xl bg-error-container text-error flex items-center justify-center font-bold text-base shrink-0';
      tIcon.innerHTML = '<span class="material-symbols-outlined text-lg">error</span>';
    } else {
      tIcon.className = 'w-8 h-8 rounded-xl bg-secondary-container/30 text-secondary flex items-center justify-center font-bold text-base shrink-0';
      tIcon.innerHTML = '<span class="material-symbols-outlined text-lg">check_circle</span>';
    }
  }

  toast.classList.remove('translate-y-[-100px]', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-[-100px]', 'opacity-0');
  }, 2800);
}

function initDashboard() {
  updateUserUI();
  switchTab('pos');
  loadServices();
  loadOrders();
  loadFinanceSummary();
  loadStaffBalances();
  loadClients();
  loadWarehouse();
  loadMonthlyReport();
  loadRecentSales();
  loadChatChannels();
  loadLeaderboard();
  loadSettings();
}

// =========================================================================
// SERVICES & MULTI-INGREDIENT RECIPES API
// =========================================================================
async function loadServices() {
  try {
    const res = await fetch(`${API_BASE}/services`);
    if (res.ok) {
      state.quickServices = await res.json();
    }
    renderPosServices();
    renderServicesSettingsTable();
  } catch (err) {
    console.error('Error loading services:', err);
  }
}

function renderServicesSettingsTable() {
  const container = document.getElementById('servicesSettingsTableBody');
  if (!container) return;

  const services = state.quickServices || [];
  if (services.length === 0) {
    container.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-on-surface-variant">Услуги не найдены</td></tr>';
    return;
  }

  const categoryNames = {
    xerox: 'Печать и копия',
    photo: 'Фото и документы',
    binding: 'Постпресс',
    design: 'Дизайн'
  };

  const rows = [];

  services.forEach(s => {
    if (s.isGroup && Array.isArray(s.variants) && s.variants.length > 0) {
      // Group Header Row
      rows.push(`
        <tr class="bg-surface-container-low/70 font-bold border-b border-outline-variant">
          <td colspan="6" class="p-3 pl-5">
            <div class="flex items-center gap-2 text-primary-container">
              <span class="material-symbols-outlined text-lg">${sanitizeMaterialIcon(s.icon)}</span>
              <span class="text-xs uppercase tracking-wider">${s.title}</span>
              <span class="px-2 py-0.5 rounded-full bg-primary-container/10 text-[10px] font-bold">${s.variants.length} вариантов</span>
            </div>
          </td>
        </tr>
      `);

      // Variant sub-rows
      s.variants.forEach(v => {
        let recipeHtml = '<span class="text-on-surface-variant text-[11px]">— Без сырья со склада</span>';
        if (v.recipe && Array.isArray(v.recipe) && v.recipe.length > 0) {
          recipeHtml = v.recipe.map(r => {
            const mat = (state.warehouse || []).find(w => w.id === r.materialId);
            const matName = mat ? mat.name : r.materialId;
            const matUnit = mat ? mat.unit : 'ед.';
            return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-lowest border border-outline-variant text-[11px] font-medium text-on-surface mr-1 mb-1">
              <span class="material-symbols-outlined text-[13px] text-primary-container">inventory_2</span>
              <span>${matName}: <b>${r.qty} ${matUnit}</b></span>
            </span>`;
          }).join('');
        }

        rows.push(`
          <tr class="hover:bg-surface-container-low/50 transition">
            <td class="p-3 pl-8">
              <div class="flex items-center gap-2">
                <span class="text-on-surface-variant text-xs font-semibold">↳</span>
                <span class="font-bold text-xs text-on-surface">${v.title}</span>
              </div>
            </td>
            <td class="p-3 text-on-surface-variant text-xs">${categoryNames[s.category] || s.category}</td>
            <td class="p-3 text-right font-data-md font-bold text-secondary text-sm">${formatMoney(v.price)}</td>
            <td class="p-3 text-center text-xs text-on-surface-variant font-medium">${v.unit || 'шт.'}</td>
            <td class="p-3 max-w-xs"><div class="flex flex-wrap items-center">${recipeHtml}</div></td>
            <td class="p-3 pr-5 text-center">
              <button onclick="editVariantPrice('${s.id}', '${v.id}', ${v.price})" class="px-2.5 py-1 bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold text-on-surface transition cursor-pointer" title="Изменить цену">
                ✏️ Изменить цену
              </button>
            </td>
          </tr>
        `);
      });
    } else {
      // Standalone service row
      let recipeHtml = '<span class="text-on-surface-variant text-[11px]">— Без сырья со склада</span>';
      if (s.recipe && Array.isArray(s.recipe) && s.recipe.length > 0) {
        recipeHtml = s.recipe.map(r => {
          const mat = (state.warehouse || []).find(w => w.id === r.materialId);
          const matName = mat ? mat.name : r.materialId;
          const matUnit = mat ? mat.unit : 'ед.';
          return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-low border border-outline-variant text-[11px] font-medium text-on-surface mr-1 mb-1">
            <span class="material-symbols-outlined text-[13px] text-primary-container">inventory_2</span>
            <span>${matName}: <b>${r.qty} ${matUnit}</b></span>
          </span>`;
        }).join('');
      }

      rows.push(`
        <tr class="hover:bg-surface-container-low/50 transition">
          <td class="p-3.5 pl-5">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-center text-primary-container shadow-xs">
                <span class="material-symbols-outlined text-base">${sanitizeMaterialIcon(s.icon)}</span>
              </div>
              <div class="font-bold text-xs text-on-surface">${s.title}</div>
            </div>
          </td>
          <td class="p-3.5 text-on-surface-variant text-xs">${categoryNames[s.category] || s.category}</td>
          <td class="p-3.5 text-right font-data-md font-bold text-secondary text-sm">${formatMoney(s.price)}</td>
          <td class="p-3.5 text-center text-xs text-on-surface-variant font-medium">${s.unit || 'шт.'}</td>
          <td class="p-3.5 max-w-xs"><div class="flex flex-wrap items-center">${recipeHtml}</div></td>
          <td class="p-3.5 pr-5 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="openServiceModal('${s.id}')" class="px-2.5 py-1 bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-lg text-xs font-semibold text-on-surface transition cursor-pointer flex items-center gap-1">
                <span class="material-symbols-outlined text-sm text-primary">edit</span>
                <span>Изменить</span>
              </button>
              <button onclick="deleteService('${s.id}')" class="p-1 text-on-surface-variant hover:text-error transition rounded-lg hover:bg-surface-container-low cursor-pointer">
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `);
    }
  });

  container.innerHTML = rows.join('');
}

async function editVariantPrice(groupId, variantId, currentPrice) {
  const newPriceStr = prompt('Введите новую цену в сумах:', currentPrice);
  if (newPriceStr === null) return;
  const newPrice = Number(newPriceStr);
  if (isNaN(newPrice) || newPrice < 0) {
    alert('Некорректная цена');
    return;
  }

  const group = (state.quickServices || []).find(s => s.id === groupId);
  if (!group) return;
  const variant = (group.variants || []).find(v => v.id === variantId);
  if (!variant) return;

  variant.price = newPrice;
  // Update basePrice if lowest
  group.basePrice = Math.min(...group.variants.map(v => v.price));

  try {
    const res = await fetch(`${API_BASE}/services/${groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variants: group.variants, basePrice: group.basePrice })
    });
    if (res.ok) {
      showToast('Цена обновлена!', `${variant.title}: ${formatMoney(newPrice)}`);
      renderPosServices();
      renderServicesSettingsTable();
    }
  } catch (err) {
    console.error('Error updating variant price:', err);
  }
}



function openServiceModal(serviceId = null) {
  const modal = document.getElementById('serviceModal');
  const modalTitle = document.getElementById('serviceModalTitle');
  if (!modal) return;

  // Populate warehouse materials in ingredient dropdowns
  const matSelects = ['srvIng1Material', 'srvIng2Material', 'srvIng3Material'];
  matSelects.forEach(selId => {
    const el = document.getElementById(selId);
    if (el) {
      el.innerHTML = '<option value="">(Нет / Не требуется)</option>' +
        (state.warehouse || []).map(w => `<option value="${w.id}">${w.name} (${w.unit})</option>`).join('');
    }
  });

  if (serviceId) {
    const s = (state.quickServices || []).find(srv => srv.id === serviceId);
    if (!s) return;

    if (modalTitle) modalTitle.innerHTML = '<span class="material-symbols-outlined text-primary-container">edit</span><span>Редактировать услугу и цену</span>';
    document.getElementById('srvId').value = s.id;
    document.getElementById('srvTitle').value = s.title;
    document.getElementById('srvCategory').value = s.category || 'xerox';
    document.getElementById('srvPrice').value = s.price || s.basePrice || 0;
    document.getElementById('srvUnit').value = s.unit || 'шт.';
    document.getElementById('srvIcon').value = sanitizeMaterialIcon(s.icon) || 'content_copy';

    // Populate existing ingredients if any
    const r = s.recipe || [];
    document.getElementById('srvIng1Material').value = r[0]?.materialId || '';
    document.getElementById('srvIng1Qty').value = r[0]?.qty || 1;

    document.getElementById('srvIng2Material').value = r[1]?.materialId || '';
    document.getElementById('srvIng2Qty').value = r[1]?.qty || 1;

    document.getElementById('srvIng3Material').value = r[2]?.materialId || '';
    document.getElementById('srvIng3Qty').value = r[2]?.qty || 0;
  } else {
    if (modalTitle) modalTitle.innerHTML = '<span class="material-symbols-outlined text-primary-container">add_circle</span><span>Добавить новую услугу</span>';
    document.getElementById('srvId').value = '';
    document.getElementById('srvTitle').value = '';
    document.getElementById('srvCategory').value = 'photo';
    document.getElementById('srvPrice').value = '35000';
    document.getElementById('srvUnit').value = 'шт.';
    document.getElementById('srvIcon').value = 'portrait';

    document.getElementById('srvIng1Material').value = 'wh_frame_a4';
    document.getElementById('srvIng1Qty').value = 1;

    document.getElementById('srvIng2Material').value = 'wh_paper_250_a4';
    document.getElementById('srvIng2Qty').value = 1;

    document.getElementById('srvIng3Material').value = '';
    document.getElementById('srvIng3Qty').value = 0;
  }

  modal.classList.remove('hidden');
}

function closeServiceModal() {
  const modal = document.getElementById('serviceModal');
  if (modal) modal.classList.add('hidden');
}

async function saveServiceForm(event) {
  event.preventDefault();

  const id = document.getElementById('srvId')?.value;
  const title = document.getElementById('srvTitle')?.value;
  const category = document.getElementById('srvCategory')?.value;
  const price = Number(document.getElementById('srvPrice')?.value || 0);
  const unit = document.getElementById('srvUnit')?.value;
  const icon = document.getElementById('srvIcon')?.value;

  const recipe = [];
  const ing1 = document.getElementById('srvIng1Material')?.value;
  const qty1 = Number(document.getElementById('srvIng1Qty')?.value || 0);
  if (ing1 && qty1 > 0) recipe.push({ materialId: ing1, qty: qty1 });

  const ing2 = document.getElementById('srvIng2Material')?.value;
  const qty2 = Number(document.getElementById('srvIng2Qty')?.value || 0);
  if (ing2 && qty2 > 0) recipe.push({ materialId: ing2, qty: qty2 });

  const ing3 = document.getElementById('srvIng3Material')?.value;
  const qty3 = Number(document.getElementById('srvIng3Qty')?.value || 0);
  if (ing3 && qty3 > 0) recipe.push({ materialId: ing3, qty: qty3 });

  const payload = { title, category, price, unit, icon, recipe };

  try {
    let res;
    if (id) {
      res = await fetch(`${API_BASE}/services/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      showToast('Успешно!', id ? 'Услуга и цена обновлены' : 'Новая услуга создана');
      closeServiceModal();
      await loadServices();
    } else {
      const err = await res.json();
      showToast('Ошибка', err.error || 'Не удалось сохранить услугу', true);
    }
  } catch (err) {
    console.error('Error saving service:', err);
    showToast('Ошибка', 'Сбой сохранения услуги', true);
  }
}


async function deleteService(serviceId) {
  if (!confirm('Удалить эту услугу из прейскуранта?')) return;
  try {
    const res = await fetch(`${API_BASE}/services/${serviceId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Удалено', 'Услуга удалена из прейскуранта');
      await loadServices();
    }
  } catch (err) {
    console.error('Error deleting service:', err);
  }
}

// =========================================================================
// AUTH & LOGIN
// =========================================================================
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/users`);
    state.users = await res.json();
    renderUserSelector();
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

function onPosMasterChange() {
  const select = document.getElementById('posActiveMasterSelect');
  if (select) state.activePosMaster = select.value;
}

function renderUserSelector() {
  const container = document.getElementById('userSelectList');
  if (!container) return;
  container.innerHTML = state.users.map(u => `
    <button onclick="selectLoginUser('${u.id}')" id="userBtn-${u.id}" class="p-2 rounded-xl border text-center transition ${state.selectedLoginUserId === u.id ? 'border-primary bg-primary-container/10 text-primary font-bold shadow-xs' : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'}">
      <div class="w-6 h-6 rounded-lg mx-auto mb-1 flex items-center justify-center text-xs font-bold text-white shadow-xs" style="background-color: ${u.color || '#dc2626'}">
        ${u.name.substring(0, 1)}
      </div>
      <div class="text-[11px] truncate font-medium">${u.name}</div>
    </button>
  `).join('');
}

function selectLoginUser(userId) {
  state.selectedLoginUserId = userId;
  renderUserSelector();
  clearPin();
}

function enterPinDigit(digit) {
  if (state.currentPin.length < 5) {
    state.currentPin += digit;
    updatePinDots();
    if (state.currentPin.length === 5) {
      setTimeout(tryLogin, 120);
    }
  }
}

function clearPin() {
  state.currentPin = '';
  updatePinDots();
  const err = document.getElementById('loginError');
  if (err) err.classList.add('hidden');
}

function backspacePin() {
  if (state.currentPin.length > 0) {
    state.currentPin = state.currentPin.slice(0, -1);
    updatePinDots();
  }
}

function updatePinDots() {
  for (let i = 0; i < 5; i++) {
    const dot = document.querySelector(`.dot-${i}`);
    if (dot) {
      if (i < state.currentPin.length) {
        dot.classList.add('bg-primary-container', 'border-primary-container', 'scale-110');
      } else {
        dot.classList.remove('bg-primary-container', 'border-primary-container', 'scale-110');
      }
    }
  }
}

async function tryLogin() {
  const errEl = document.getElementById('loginError');
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: state.selectedLoginUserId,
        pin: state.currentPin
      })
    });

    const data = await res.json();
    if (!res.ok) {
      if (errEl) {
        errEl.textContent = data.error || 'Неверный пароль (12345)';
        errEl.classList.remove('hidden');
      }
      clearPin();
      return;
    }

    state.currentUser = data.user;
    localStorage.setItem('printerp_user', JSON.stringify(data.user));
    hideLoginModal();
    initDashboard();
  } catch (err) {
    console.error('Login error:', err);
    if (errEl) {
      errEl.textContent = 'Ошибка связи с сервером';
      errEl.classList.remove('hidden');
    }
  }
}

function showLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.remove('hidden');
  clearPin();
}

function hideLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.classList.add('hidden');
}

function lockScreen() {
  localStorage.removeItem('printerp_user');
  state.currentUser = null;
  showLoginModal();
}

function updateUserUI() {
  if (!state.currentUser) return;
  const avatar = document.getElementById('currentUserAvatar');
  const name = document.getElementById('currentUserName');
  const role = document.getElementById('currentUserRole');
  const subname = document.getElementById('sidebarUserSubname');

  if (avatar) avatar.textContent = state.currentUser.name.substring(0, 1);
  if (name) name.textContent = state.currentUser.name;
  if (subname) subname.textContent = state.currentUser.role === 'admin' ? 'SUPER ADMIN' : state.currentUser.name.toUpperCase();
  if (role) {
    const rolesMap = { admin: 'Директор (Администратор)', cashier: 'Кассир (Главная касса)', designer: 'Дизайнер / Менеджер', master: 'Мастер цеха', worker: 'Сотрудник' };
    role.textContent = rolesMap[state.currentUser.role] || state.currentUser.role;
  }
}

// =========================================================================
// TAB NAVIGATION
// =========================================================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('nav button').forEach(el => {
    el.className = 'w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-r-lg group';
  });

  const targetTab = document.getElementById(`tab-${tabId}`);
  const targetNav = document.getElementById(`nav-${tabId}`);

  if (targetTab) targetTab.classList.remove('hidden');
  if (targetNav) {
    targetNav.className = 'w-full flex items-center gap-3 px-4 py-3 text-primary border-l-4 border-primary font-bold bg-on-primary-container/5 rounded-r-lg group scale-[0.99] transition-transform duration-150';
  }

  const titles = {
    pos: 'Быстрая Касса',
    orders: 'Список заказов (CRM)',
    finance: 'Финансы & Касса',
    warehouse: 'Склад & Остатки',
    clients: 'Клиенты & Долги',
    reports: 'Месячные отчёты (МАЙ.xlsx)',
    staff: 'Кадры & Зарплата',
    chat: 'Корпоративный чат',
    leaderboard: 'Рейтинг & KPI',
    portal: 'Кабинет клиента',
    settings: 'Настройки & Прейскурант'
  };

  const pageTitle = document.querySelector('#pageTitle span');
  if (pageTitle && titles[tabId]) {
    pageTitle.textContent = titles[tabId];
  }

  if (tabId === 'pos') renderPosServices();
  if (tabId === 'orders') loadOrders();
  if (tabId === 'finance') loadFinanceSummary();
  if (tabId === 'staff') loadStaffBalances();
  if (tabId === 'clients') loadClients();
  if (tabId === 'warehouse') loadWarehouse();
  if (tabId === 'reports') loadMonthlyReport();
  if (tabId === 'chat') { loadChatChannels(); loadChatMessages(); }
  if (tabId === 'leaderboard') loadLeaderboard();
  if (tabId === 'settings') { loadSettings(); renderServicesSettingsTable(); }
}

// =========================================================================
// TAB 1: POS КАССА
// =========================================================================
function filterPosCategory(category) {
  state.currentPosCategory = category;
  document.querySelectorAll('#tab-pos button[id^="poscat-"]').forEach(el => {
    el.className = 'px-4 py-2 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary text-xs whitespace-nowrap transition-colors cursor-pointer';
  });
  const btn = document.getElementById(`poscat-${category}`);
  if (btn) {
    btn.className = 'px-4 py-2 rounded-full bg-primary-container text-white text-xs font-bold whitespace-nowrap shadow-sm transition-transform active:scale-95 cursor-pointer';
  }
  renderPosServices();
}

function searchPosServices() {
  const searchInput = document.getElementById('posSearchInput');
  state.posSearchTerm = searchInput?.value?.toLowerCase()?.trim() || '';
  renderPosServices();
}

function renderPosServices() {
  const container = document.getElementById('quickServicesGrid');
  if (!container) return;

  let items = state.quickServices || [];
  if (state.currentPosCategory !== 'all') {
    items = items.filter(i => i.category === state.currentPosCategory);
  }
  if (state.posSearchTerm) {
    items = items.filter(i => {
      const matchTitle = i.title.toLowerCase().includes(state.posSearchTerm);
      const matchVariant = i.variants && i.variants.some(v => v.title.toLowerCase().includes(state.posSearchTerm));
      return matchTitle || matchVariant;
    });
  }

  if (items.length === 0) {
    container.innerHTML = '<div class="col-span-full py-8 text-center text-on-surface-variant text-xs">Услуги не найдены</div>';
    return;
  }

  container.innerHTML = items.map(s => {
    // Count items in cart
    let inCartCount = 0;
    if (s.isGroup && Array.isArray(s.variants)) {
      s.variants.forEach(v => {
        const c = state.cart.find(item => item.id === v.id);
        if (c) inCartCount += c.qty;
      });
    } else {
      const c = state.cart.find(item => item.id === s.id);
      if (c) inCartCount += c.qty;
    }

    const isSpecial = s.isSpecial || inCartCount > 0 || (s.recipe && s.recipe.length > 1);
    const displayPrice = s.isGroup ? `от ${formatMoney(s.basePrice)}` : formatMoney(s.price);
    const variantCountText = s.isGroup && s.variants ? `${s.variants.length} вар.` : s.unit;

    return `
      <div onclick="handleServiceClick('${s.id}')" class="bg-surface-container-lowest border ${isSpecial ? 'border-primary-container/40 bg-primary-container/5' : 'border-outline-variant'} rounded-2xl p-4 cursor-pointer hover:border-primary/60 hover:shadow-md transition-all group flex flex-col justify-between h-36 relative overflow-hidden select-none active:scale-[0.98]">
        
        <div class="absolute -right-4 -top-4 w-16 h-16 bg-surface-container rounded-full opacity-40 group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>

        <div class="flex justify-between items-start relative z-10">
          <div class="w-10 h-10 rounded-xl bg-surface-container-low border border-outline-variant/60 flex items-center justify-center text-primary-container group-hover:bg-primary-container group-hover:text-white transition-colors shadow-xs">
            <span class="material-symbols-outlined text-2xl">${sanitizeMaterialIcon(s.icon)}</span>
          </div>

          <div class="flex flex-col items-end">
            <span class="text-data-md font-data-md font-bold ${isSpecial ? 'text-primary-container' : 'text-on-surface-variant'}">${displayPrice}</span>
            <div class="flex items-center gap-1 mt-1">
              ${inCartCount > 0 ? `
                <span class="px-1.5 py-0.5 rounded-full bg-primary-container text-white text-[9px] font-bold">В чеке: ${inCartCount}</span>
              ` : ''}
              ${s.isGroup ? `
                <span class="px-1.5 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant text-[10px] font-semibold flex items-center gap-0.5">
                  ${variantCountText}
                  <span class="material-symbols-outlined text-[12px]">expand_more</span>
                </span>
              ` : (s.recipe && s.recipe.length > 1 ? '<span class="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-bold">2 сырья</span>' : '')}
            </div>
          </div>
        </div>

        <div class="relative z-10">
          <h3 class="text-body-md font-headline-sm font-extrabold ${isSpecial ? 'text-primary-container' : 'text-on-surface'} truncate" title="${s.title}">${s.title}</h3>
          ${s.isGroup ? `
            <div class="text-[10px] text-on-surface-variant truncate mt-0.5 font-medium">
              ${s.variants.map(v => v.title.split(' ')[0]).slice(0, 3).join(', ')}...
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// MULTI-ITEM CART
function addServiceToCart(serviceId) {
  const service = (state.quickServices || []).find(s => s.id === serviceId);
  if (!service) return;

  const existing = state.cart.find(item => item.id === serviceId);
  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({
      id: service.id,
      title: service.title,
      price: service.price,
      unit: service.unit,
      qty: 1,
      icon: service.icon
    });
  }

  renderPosServices();
  renderCartUI();
}

function updateCartItemQty(index, newQty) {
  const qty = Number(newQty) || 1;
  if (qty <= 0) {
    state.cart.splice(index, 1);
  } else {
    state.cart[index].qty = qty;
  }
  renderPosServices();
  renderCartUI();
}

function removeCartItem(index) {
  state.cart.splice(index, 1);
  renderPosServices();
  renderCartUI();
}

function clearPosCart() {
  state.cart = [];
  renderPosServices();
  renderCartUI();
}

function renderCartUI() {
  const container = document.getElementById('posCartItemsList');
  const countBadge = document.getElementById('cartItemsCountBadge');
  const totalEl = document.getElementById('posTotalSum');
  const checkoutBtn = document.getElementById('btnPosCheckoutAction');

  const totalQty = state.cart.reduce((sum, i) => sum + i.qty, 0);
  const totalAmount = state.cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  if (countBadge) countBadge.textContent = totalQty;
  if (totalEl) totalEl.textContent = formatMoney(totalAmount);

  if (checkoutBtn) {
    checkoutBtn.disabled = state.cart.length === 0;
  }

  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="py-12 flex flex-col items-center justify-center text-center text-on-surface-variant">
        <span class="material-symbols-outlined text-3xl mb-1 opacity-40">shopping_bag</span>
        <div class="text-xs font-semibold">Добавьте услуги в заказ</div>
        <div class="text-[11px] opacity-70 mt-0.5">Кликните по услуге слева</div>
      </div>
    `;
    return;
  }

  container.innerHTML = state.cart.map((item, idx) => `
    <div class="bg-surface rounded-lg p-3 border border-outline-variant relative group">
      <button onclick="removeCartItem(${idx})" class="absolute -right-2 -top-2 w-6 h-6 bg-surface-container-lowest border border-outline-variant rounded-full text-on-surface-variant flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-error hover:border-error cursor-pointer shadow-xs" title="Удалить">
        <span class="material-symbols-outlined text-[14px]">close</span>
      </button>

      <div class="flex justify-between items-start mb-2">
        <span class="text-body-sm font-headline-sm font-semibold text-on-surface w-3/4 truncate">${item.title}</span>
        <span class="text-data-md font-data-md font-bold text-on-surface">${formatMoney(item.price * item.qty)}</span>
      </div>

      <div class="flex justify-between items-center">
        <span class="text-data-sm font-data-sm text-on-surface-variant">${formatMoney(item.price)} / ${item.unit}</span>
        
        <div class="flex items-center bg-surface-container-low rounded-md border border-outline-variant overflow-hidden">
          <button onclick="updateCartItemQty(${idx}, ${item.qty - 1})" class="w-7 h-7 flex items-center justify-center hover:bg-surface-variant transition-colors text-on-surface font-bold text-xs cursor-pointer">-</button>
          <input onchange="updateCartItemQty(${idx}, this.value)" class="w-9 h-7 text-center bg-transparent border-none p-0 text-data-sm font-data-sm font-bold focus:ring-0 text-on-surface" type="text" value="${item.qty}">
          <button onclick="updateCartItemQty(${idx}, ${item.qty + 1})" class="w-7 h-7 flex items-center justify-center hover:bg-surface-variant transition-colors text-on-surface font-bold text-xs cursor-pointer">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

function onPosDebtToggle() {
  const cb = document.getElementById('posIsDebtCheckbox');
  state.posIsDebt = cb ? cb.checked : false;
}

function onPosClientSelectChange() {
  const sel = document.getElementById('posClientSelect');
  state.selectedClientId = sel ? sel.value : null;
}

function selectPosPaymentMethod(method) {
  state.activePosPaymentMethod = method;
  const radioCash = document.getElementById('radioPayCash');
  const radioClick = document.getElementById('radioPayClick');
  if (method === 'cash' && radioCash) radioCash.checked = true;
  if (method === 'click' && radioClick) radioClick.checked = true;
}

async function submitPosPayment() {
  if (state.cart.length === 0) {
    showToast('Внимание', 'Сначала добавьте услуги в заказ', true);
    return;
  }

  const activeMasterSelect = document.getElementById('posActiveMasterSelect');
  const activeMaster = activeMasterSelect ? activeMasterSelect.value : (state.currentUser?.id || 'islam');

  const clientSelect = document.getElementById('posClientSelect');
  const clientName = clientSelect?.options[clientSelect.selectedIndex]?.text || 'Розничный клиент';

  try {
    const res = await fetch(`${API_BASE}/pos/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: state.cart,
        paymentMethod: state.activePosPaymentMethod,
        isDebt: state.posIsDebt,
        clientId: state.selectedClientId || null,
        clientName: clientName,
        discount: 0,
        createdBy: activeMaster
      })
    });

    const data = await res.json();
    if (!res.ok) {
      showToast('Ошибка', data.error || 'Ошибка оформления чека', true);
      return;
    }

    if (data.deductedMaterials && data.deductedMaterials.length > 0) {
      showToast('Оплата проведена!', `Списано со склада: ${data.deductedMaterials.join(', ')}`);
    } else {
      showToast('Оплата проведена!', 'Продажа успешно зафиксирована');
    }

    if (data.order) {
      openReceiptModal(data.order);
    }

    clearPosCart();
    loadRecentSales();
    loadFinanceSummary();
    loadWarehouse();
    loadClients();
    loadMonthlyReport();
  } catch (err) {
    console.error('POS Payment error:', err);
    showToast('Ошибка', 'Не удалось провести оплату', true);
  }
}

async function loadRecentSales() {
  try {
    const res = await fetch(`${API_BASE}/orders?category=quick_pos`);
    const orders = await res.json();
    renderRecentSales(orders);
  } catch (err) {
    console.error('Error loading recent sales:', err);
  }
}

function renderRecentSales(orders) {
  const container = document.getElementById('recentSalesTableBody');
  const countEl = document.getElementById('todaySalesCount');
  if (!container) return;

  if (countEl) countEl.textContent = `${orders ? orders.length : 0} чеков`;

  if (!orders || orders.length === 0) {
    container.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-on-surface-variant">Сегодня продаж пока нет</td></tr>';
    return;
  }

  container.innerHTML = orders.slice(0, 8).map(o => `
    <tr class="hover:bg-surface-container-low/50 transition-colors">
      <td class="p-3 pl-4 text-on-surface font-semibold max-w-xs truncate" title="${o.title}">${o.title}</td>
      <td class="p-3 text-on-surface-variant truncate">${o.clientName}</td>
      <td class="p-3 text-on-surface capitalize">${o.createdBy}</td>
      <td class="p-3 text-right text-data-md font-data-md font-bold text-secondary">${formatMoney(o.totalAmount)}</td>
      <td class="p-3 text-center">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${o.paymentMethod === 'click' ? 'bg-tertiary-fixed text-tertiary' : 'bg-secondary-container/30 text-secondary'}">
          ${o.paymentMethod === 'click' ? 'Click' : (o.paymentMethod === 'debt' ? 'Карыз' : 'Наличные')}
        </span>
      </td>
      <td class="p-3 text-center">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${o.status === 'Долг (Карыз)' ? 'bg-error-container text-error' : 'bg-secondary-container/30 text-secondary'}">
          ${o.status}
        </span>
      </td>
      <td class="p-3 pr-4 text-right">
        <button onclick='openReceiptModal(${JSON.stringify(o)})' class="p-1 text-on-surface-variant hover:text-primary transition rounded hover:bg-surface-container-low cursor-pointer" title="Печать чека">
          <span class="material-symbols-outlined text-base">print</span>
        </button>
      </td>
    </tr>
  `).join('');
}

function openReceiptModal(order) {
  const modal = document.getElementById('receiptModal');
  const container = document.getElementById('printableReceipt');
  if (!modal || !container) return;

  const dateObj = new Date(order.createdAt);
  const formattedDate = dateObj.toLocaleDateString('ru-RU') + ' ' + dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  container.innerHTML = `
    <div class="text-center pb-2.5 border-b border-dashed border-outline-variant">
      <div class="font-extrabold text-sm uppercase tracking-wider text-on-surface">MASTER PRINT</div>
      <div class="text-[10px] text-on-surface-variant mt-0.5">Чек №${order.orderNumber} • ${formattedDate}</div>
      <div class="text-[10px] text-emerald-800 font-bold mt-0.5">Кассир (Оплата принята): ${order.paymentConfirmedBy || order.createdBy || 'Наргиза (Кассир)'}</div>
      <div class="text-[10px] text-on-surface-variant">Клиент: ${order.clientName}</div>
    </div>
    <div class="py-2.5 space-y-1.5 border-b border-dashed border-outline-variant font-data-sm">
      ${(order.items || []).map(i => `
        <div class="flex justify-between items-center text-xs">
          <span>${i.title} x${i.qty}</span>
          <span class="font-bold">${formatMoney(i.price * i.qty)}</span>
        </div>
      `).join('')}
    </div>
    <div class="pt-2 flex justify-between font-black text-sm">
      <span>ИТОГО:</span>
      <span class="text-secondary font-data-lg">${formatMoney(order.totalAmount)}</span>
    </div>
  `;

  modal.classList.remove('hidden');
}

function closeReceiptModal() {
  const modal = document.getElementById('receiptModal');
  if (modal) modal.classList.add('hidden');
}

// =========================================================================
// TAB 2: CRM & СПИСОК ЗАКАЗОВ (ORDERS TABLE LIST)
// =========================================================================
function setOrdersFilter(status) {
  state.currentOrderStatusFilter = status;
  const filterBtns = ['all', 'pending', 'new', 'in_progress', 'ready', 'delivered', 'debt'];
  filterBtns.forEach(f => {
    const btn = document.getElementById(`ordFilter-${f}`);
    if (btn) {
      if (f === status) {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-container text-white shadow-xs cursor-pointer';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition cursor-pointer';
      }
    }
  });
  renderOrdersTable();
}

function filterOrdersList() {
  const input = document.getElementById('ordersSearchInput');
  state.ordersSearchTerm = input?.value?.toLowerCase()?.trim() || '';
  renderOrdersTable();
}

async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`);
    state.orders = await res.json();
    renderOrdersTable();
  } catch (err) {
    console.error('Error loading orders:', err);
  }
}

function renderOrdersTable() {
  const container = document.getElementById('ordersTableBody');
  const pendingBadge = document.getElementById('pendingOrdersFilterCount');
  if (!container) return;

  let list = state.orders || [];

  // Count pending orders for badge
  const pendingCount = list.filter(o => {
    return (Number(o.totalAmount) || 0) > (Number(o.paidAmount) || 0);
  }).length;
  if (pendingBadge) pendingBadge.textContent = pendingCount;

  // Also update POS pending queue
  renderPosPendingQueue();

  // Filter by status tab
  if (state.currentOrderStatusFilter === 'pending') {
    list = list.filter(o => (Number(o.totalAmount) || 0) > (Number(o.paidAmount) || 0));
  } else if (state.currentOrderStatusFilter === 'debt') {
    list = list.filter(o => o.status === 'Долг (Карыз)' || (Number(o.totalAmount) - Number(o.paidAmount) > 0));
  } else if (state.currentOrderStatusFilter !== 'all') {
    list = list.filter(o => o.status === state.currentOrderStatusFilter);
  }

  // Filter by search query
  if (state.ordersSearchTerm) {
    list = list.filter(o => 
      String(o.orderNumber).includes(state.ordersSearchTerm) ||
      (o.clientName && o.clientName.toLowerCase().includes(state.ordersSearchTerm)) ||
      (o.title && o.title.toLowerCase().includes(state.ordersSearchTerm)) ||
      (o.clientPhone && o.clientPhone.includes(state.ordersSearchTerm))
    );
  }

  if (list.length === 0) {
    container.innerHTML = '<tr><td colspan="8" class="py-12 text-center text-on-surface-variant font-medium">Заказы не найдены</td></tr>';
    return;
  }

  const categoryLabels = {
    wide_format: 'Широкоформатная печать',
    outdoor: 'Наружная реклама',
    polygraphy: 'Полиграфия',
    quick_pos: 'Экспресс-касса'
  };

  container.innerHTML = list.map(o => {
    const dateObj = new Date(o.createdAt);
    const dateStr = dateObj.toLocaleDateString('ru-RU') + ' ' + dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const debt = Math.max(0, (Number(o.totalAmount) || 0) - (Number(o.paidAmount) || 0));
    const isPaid = debt === 0 && (Number(o.totalAmount) || 0) > 0;

    return `
      <tr class="hover:bg-surface-container-low/50 transition">
        <!-- № & Time -->
        <td class="p-3 pl-4 whitespace-nowrap">
          <div class="font-data-md font-bold text-on-surface text-sm">#${o.orderNumber}</div>
          <div class="text-[10px] text-on-surface-variant font-data-sm">${dateStr}</div>
        </td>

        <!-- Client & Phone -->
        <td class="p-3 max-w-[170px] truncate">
          <div class="font-bold text-xs text-on-surface truncate">${o.clientName}</div>
          ${o.clientPhone ? `<div class="text-[11px] text-on-surface-variant font-data-sm">${o.clientPhone}</div>` : '<div class="text-[10px] text-on-surface-variant">—</div>'}
        </td>

        <!-- Title & Details -->
        <td class="p-3 max-w-xs">
          <div class="font-bold text-xs text-on-surface truncate" title="${o.title}">${o.title}</div>
          ${o.details && o.details.area ? `
            <div class="text-[10px] text-on-surface-variant font-data-sm">
              ${o.details.width}x${o.details.height}м (${o.details.area} м²) • ${o.details.material || ''}
            </div>
          ` : ''}
        </td>

        <!-- Category -->
        <td class="p-3 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-container-low border border-outline-variant text-on-surface">
            ${categoryLabels[o.category] || o.category}
          </span>
        </td>

        <!-- Staff -->
        <td class="p-3 capitalize text-xs text-on-surface font-medium whitespace-nowrap">
          ${o.designerId || o.createdBy || 'Ислам'}
        </td>

        <!-- Total & Paid & Cashier Confirmation Button -->
        <td class="p-3 text-right whitespace-nowrap">
          <div class="font-data-md font-bold text-on-surface text-xs">${formatMoney(o.totalAmount)}</div>
          
          ${isPaid ? `
            <div class="mt-0.5 flex flex-col items-end">
              <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                <span class="material-symbols-outlined text-[12px]">verified</span>
                <span>Оплачено 100%</span>
              </span>
              ${o.paymentConfirmedBy ? `<span class="text-[9px] text-on-surface-variant font-medium mt-0.5">Кассир: ${o.paymentConfirmedBy}</span>` : ''}
            </div>
          ` : `
            <div class="mt-1 flex flex-col items-end gap-1">
              <div class="text-[10px] font-bold text-error font-data-sm">К оплате: ${formatMoney(debt)}</div>
              <button onclick="openConfirmPaymentModal('${o.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer">
                <span class="material-symbols-outlined text-[13px]">payments</span>
                <span>Подтвердить оплату</span>
              </button>
            </div>
          `}
        </td>

        <!-- Status selector -->
        <td class="p-3 text-center whitespace-nowrap">
          <select onchange="changeOrderStatus('${o.id}', this.value)" class="bg-surface-container-low border border-outline-variant rounded-lg px-2 py-1 text-[11px] font-bold text-on-surface outline-none cursor-pointer">
            <option value="new" ${o.status === 'new' ? 'selected' : ''}>🟡 Новый</option>
            <option value="in_progress" ${o.status === 'in_progress' ? 'selected' : ''}>🔵 В работе</option>
            <option value="ready" ${o.status === 'ready' ? 'selected' : ''}>🟢 Готов</option>
            <option value="delivered" ${o.status === 'delivered' || o.status === 'Выдан' ? 'selected' : ''}>🏁 Выдан</option>
            <option value="Долг (Карыз)" ${o.status === 'Долг (Карыз)' ? 'selected' : ''}>⚠️ Долг (Карыз)</option>
          </select>
        </td>

        <!-- Actions -->
        <td class="p-3 pr-4 text-center whitespace-nowrap">
          <div class="flex items-center justify-center gap-1">
            <button onclick='openReceiptModal(${JSON.stringify(o)})' class="p-1 text-on-surface-variant hover:text-primary transition rounded hover:bg-surface-container-low cursor-pointer" title="Печать чека">
              <span class="material-symbols-outlined text-base">print</span>
            </button>
            <button onclick="deleteOrder('${o.id}')" class="p-1 text-on-surface-variant hover:text-error transition rounded hover:bg-surface-container-low cursor-pointer" title="Удалить заказ">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function changeOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, userId: state.currentUser?.id || 'islam' })
    });
    if (res.ok) {
      showToast('Статус обновлён', `Заказ переведён в статус: ${newStatus}`);
      const ord = (state.orders || []).find(o => o.id === orderId);
      if (ord) ord.status = newStatus;
    }
  } catch (err) {
    console.error('Error changing order status:', err);
    showToast('Ошибка', 'Не удалось обновить статус', true);
  }
}

async function deleteOrder(orderId) {
  if (!confirm('Вы уверены, что хотите удалить этот заказ?')) return;
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Удалено', 'Заказ успешно удален');
      loadOrders();
    }
  } catch (err) {
    console.error('Error deleting order:', err);
  }
}

function openNewOrderModal() {
  const modal = document.getElementById('newOrderModal');
  if (modal) modal.classList.remove('hidden');
  recalcOrderPrice();
}

function closeNewOrderModal() {
  const modal = document.getElementById('newOrderModal');
  if (modal) modal.classList.add('hidden');
}

function recalcOrderPrice() {
  const width = Number(document.getElementById('ordWidth')?.value || 0);
  const height = Number(document.getElementById('ordHeight')?.value || 0);
  const area = width * height;
  const areaInput = document.getElementById('ordArea');
  if (areaInput) areaInput.value = area.toFixed(2);

  const matSelect = document.getElementById('ordMaterial');
  const selectedOpt = matSelect?.options[matSelect.selectedIndex];
  const matPrice = Number(selectedOpt?.getAttribute('data-price') || 0);

  const hasGrommets = document.getElementById('ordGrommets')?.checked;
  const grommetCost = hasGrommets ? 10000 : 0;

  let total = Math.round(area * matPrice + grommetCost);
  if (total <= 0) total = 280000;

  const totalInput = document.getElementById('ordTotalAmount');
  const paidInput = document.getElementById('ordPaidAmount');
  if (totalInput) totalInput.value = total;
  if (paidInput) paidInput.value = total;
}

async function submitOrderForm(event) {
  event.preventDefault();

  const width = Number(document.getElementById('ordWidth')?.value || 0);
  const height = Number(document.getElementById('ordHeight')?.value || 0);
  const area = width * height;
  const matSelect = document.getElementById('ordMaterial');
  const matText = matSelect?.options[matSelect.selectedIndex]?.text || '';

  const orderData = {
    clientName: document.getElementById('ordClientName')?.value,
    clientPhone: document.getElementById('ordClientPhone')?.value,
    category: document.getElementById('ordCategory')?.value,
    title: document.getElementById('ordTitle')?.value,
    details: {
      width, height, area,
      material: matText,
      grommets: document.getElementById('ordGrommets')?.checked,
      gluing: document.getElementById('ordGluing')?.checked
    },
    designerId: document.getElementById('ordDesigner')?.value,
    designerFee: Number(document.getElementById('ordDesignerFee')?.value || 0),
    masterId: 'makhmud',
    masterFee: 30000,
    totalAmount: Number(document.getElementById('ordTotalAmount')?.value || 0),
    paidAmount: Number(document.getElementById('ordPaidAmount')?.value || 0),
    paymentMethod: document.getElementById('ordPaymentMethod')?.value,
    createdBy: state.currentUser?.id || 'islam'
  };

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Заказ принят!', 'Сохранен в CRM заказов');
      closeNewOrderModal();
      loadOrders();
      loadFinanceSummary();
      loadStaffBalances();
      loadClients();
      loadWarehouse();
    }
  } catch (err) {
    console.error('Error creating order:', err);
    showToast('Ошибка', 'Не удалось сохранить заказ', true);
  }
}

// =========================================================================
// TAB 3: КАССА И РАСХОДЫ
// =========================================================================
async function loadFinanceSummary() {
  try {
    const res = await fetch(`${API_BASE}/reports/monthly?month=2026-05`);
    const data = await res.json();

    const sum = data.summary || {};
    const finIncome = document.getElementById('finMonthIncome');
    const finExpense = document.getElementById('finMonthExpense');
    const finProfit = document.getElementById('finMonthProfit');
    const finClick = document.getElementById('finMonthClick');

    if (finIncome) finIncome.textContent = formatMoney(sum.totalIncome);
    if (finExpense) finExpense.textContent = formatMoney(sum.totalExpense);
    if (finProfit) finProfit.textContent = formatMoney(sum.netProfit);
    if (finClick) finClick.textContent = formatMoney(sum.totalClick);

    await loadExpenses();
  } catch (err) {
    console.error('Error loading finance summary:', err);
  }
}

async function loadExpenses() {
  try {
    const res = await fetch(`${API_BASE}/finance/expenses`);
    state.expenses = await res.json();
    renderExpensesTable();
  } catch (err) {
    console.error('Error loading expenses:', err);
  }
}

function renderExpensesTable() {
  const container = document.getElementById('expensesTableBody');
  if (!container) return;

  container.innerHTML = state.expenses.map(e => `
    <tr class="hover:bg-surface-container-low/50 transition">
      <td class="p-3 font-data-sm text-on-surface-variant">${e.date}</td>
      <td class="p-3 font-semibold text-on-surface">${e.category}</td>
      <td class="p-3 font-bold text-on-surface">${e.title}</td>
      <td class="p-3 text-on-surface-variant">${e.employeeId || '—'}</td>
      <td class="p-3 font-data-sm uppercase font-bold">${e.paymentMethod === 'click' ? 'Click' : 'Наличные'}</td>
      <td class="p-3 text-right font-data-sm font-bold text-error">${formatMoney(e.amount)}</td>
      <td class="p-3 text-center">
        <button onclick="deleteExpense('${e.id}')" class="text-on-surface-variant hover:text-error transition cursor-pointer">✕</button>
      </td>
    </tr>
  `).join('');
}

function openAddExpenseModal() {
  const modal = document.getElementById('addExpenseModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAddExpenseModal() {
  const modal = document.getElementById('addExpenseModal');
  if (modal) modal.classList.add('hidden');
}

async function submitExpenseForm(event) {
  event.preventDefault();

  const data = {
    date: document.getElementById('expDate')?.value,
    category: document.getElementById('expCategory')?.value,
    title: document.getElementById('expTitle')?.value,
    amount: Number(document.getElementById('expAmount')?.value || 0),
    paymentMethod: 'cash'
  };

  try {
    const res = await fetch(`${API_BASE}/finance/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      closeAddExpenseModal();
      loadExpenses();
      loadFinanceSummary();
      loadStaffBalances();
    }
  } catch (err) {
    console.error('Error adding expense:', err);
  }
}

async function deleteExpense(id) {
  if (!confirm('Удалить этот расход?')) return;
  try {
    const res = await fetch(`${API_BASE}/finance/expenses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadExpenses();
      loadFinanceSummary();
      loadStaffBalances();
    }
  } catch (err) {
    console.error('Error deleting expense:', err);
  }
}

// =========================================================================
// TAB 4: СКЛАД И ОСТАТКИ
// =========================================================================
async function loadWarehouse() {
  try {
    const res = await fetch(`${API_BASE}/warehouse`);
    state.warehouse = await res.json();
    renderWarehouse();
    populateIncomingMaterialSelect();
  } catch (err) {
    console.error('Error loading warehouse:', err);
  }
}

function renderWarehouse() {
  const container = document.getElementById('warehouseGrid');
  if (!container) return;

  container.innerHTML = state.warehouse.map(item => `
    <div class="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xs flex flex-col justify-between hover:shadow-md transition">
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[10px] uppercase text-on-surface-variant font-bold">${item.category}</span>
          <span class="text-[10px] bg-secondary-container/30 text-secondary font-bold px-2 py-0.5 rounded-md">В наличии</span>
        </div>
        <h4 class="font-bold text-xs text-on-surface leading-snug mb-1">${item.name}</h4>
      </div>
      <div class="pt-2.5 border-t border-outline-variant mt-2 flex items-center justify-between">
        <span class="text-xs text-on-surface-variant">Остаток:</span>
        <span class="font-data-md text-base font-black text-secondary">${item.inStock} ${item.unit}</span>
      </div>
    </div>
  `).join('');
}

function populateIncomingMaterialSelect() {
  const select = document.getElementById('incMaterialSelect');
  if (!select) return;
  select.innerHTML = state.warehouse.map(m => `
    <option value="${m.id}">${m.name} (Остаток: ${m.inStock} ${m.unit})</option>
  `).join('');
}

function openIncomingStockModal() {
  const modal = document.getElementById('incomingStockModal');
  if (!modal) return;
  populateIncomingMaterialSelect();
  modal.classList.remove('hidden');
}

function closeIncomingStockModal() {
  const modal = document.getElementById('incomingStockModal');
  if (modal) modal.classList.add('hidden');
}

async function submitIncomingStock(event) {
  event.preventDefault();

  const materialId = document.getElementById('incMaterialSelect')?.value;
  const qty = Number(document.getElementById('incQty')?.value || 0);

  try {
    const res = await fetch(`${API_BASE}/warehouse/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId, qty, unitPrice: 0, createExpense: true })
    });
    if (res.ok) {
      closeIncomingStockModal();
      showToast('Приход оформлен!', `+${qty} поступило на склад`);
      loadWarehouse();
      loadFinanceSummary();
    }
  } catch (err) {
    console.error('Error adding incoming stock:', err);
  }
}

// =========================================================================
// TAB 5: КЛИЕНТЫ И ДОЛГИ
// =========================================================================
async function loadClients() {
  try {
    const res = await fetch(`${API_BASE}/clients`);
    state.clients = await res.json();
    renderClientsTable();
    populatePosClientDropdown();
  } catch (err) {
    console.error('Error loading clients:', err);
  }
}

function populatePosClientDropdown() {
  const select = document.getElementById('posClientSelect');
  if (!select) return;

  select.innerHTML = `
    <option value="">Розничный клиент (Без привязки)</option>
    ${state.clients.map(c => `
      <option value="${c.id}">${c.name} (${c.phone || 'без тел'}) ${c.currentDebt > 0 ? '— Долг: ' + formatMoney(c.currentDebt) : ''}</option>
    `).join('')}
  `;
}

function renderClientsTable() {
  const container = document.getElementById('clientsTableBody');
  const totalDebtEl = document.getElementById('totalDebtSumDisplay');
  if (!container) return;

  const totalDebt = state.clients.reduce((sum, c) => sum + (Number(c.currentDebt) || 0), 0);
  if (totalDebtEl) totalDebtEl.textContent = formatMoney(totalDebt);

  container.innerHTML = state.clients.map(c => `
    <tr class="hover:bg-surface-container-low/50 transition">
      <td class="p-3 font-bold text-on-surface">${c.name}</td>
      <td class="p-3 font-data-sm text-on-surface-variant">${c.phone || '—'}</td>
      <td class="p-3 font-data-sm">${formatMoney(c.totalSpent || 0)}</td>
      <td class="p-3 font-data-sm font-bold text-sm ${c.currentDebt > 0 ? 'text-error' : 'text-secondary'}">
        ${formatMoney(c.currentDebt || 0)}
      </td>
      <td class="p-3 text-center">
        ${c.currentDebt > 0 ? `
          <button onclick="openRepayDebtModal('${c.id}', '${c.name}', ${c.currentDebt})" class="px-3 py-1 bg-secondary hover:bg-secondary/90 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer">
            Погасить
          </button>
        ` : '<span class="text-on-surface-variant">Нет долга</span>'}
      </td>
    </tr>
  `).join('');
}

function openRepayDebtModal(clientId, clientName, currentDebt) {
  const modal = document.getElementById('repayDebtModal');
  if (!modal) return;

  document.getElementById('repayClientId').value = clientId;
  document.getElementById('repayClientName').textContent = clientName;
  document.getElementById('repayAmount').value = currentDebt;

  modal.classList.remove('hidden');
}

function closeRepayDebtModal() {
  const modal = document.getElementById('repayDebtModal');
  if (modal) modal.classList.add('hidden');
}

async function submitRepayDebt(event) {
  event.preventDefault();

  const clientId = document.getElementById('repayClientId')?.value;
  const amount = Number(document.getElementById('repayAmount')?.value || 0);

  try {
    const res = await fetch(`${API_BASE}/clients/repay-debt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, amount, paymentMethod: 'cash' })
    });
    if (res.ok) {
      closeRepayDebtModal();
      loadClients();
      loadFinanceSummary();
      loadOrders();
    }
  } catch (err) {
    console.error('Error repaying debt:', err);
  }
}

// =========================================================================
// TAB 6: МЕСЯЧНАЯ ВЫРУЧКА (МАЙ.xlsx)
// =========================================================================
async function loadMonthlyReport() {
  const monthStr = document.getElementById('reportMonthSelect')?.value || '2026-05';
  try {
    const res = await fetch(`${API_BASE}/reports/monthly?month=${monthStr}`);
    state.monthlyReport = await res.json();
    renderReportIncomeMatrix();
  } catch (err) {
    console.error('Error loading monthly report:', err);
  }
}

function renderReportIncomeMatrix() {
  const container = document.getElementById('reportIncomeMatrixBody');
  const footer = document.getElementById('reportIncomeMatrixFooter');
  if (!container || !state.monthlyReport) return;

  const matrix = state.monthlyReport.matrix || [];
  const sum = state.monthlyReport.summary || {};

  container.innerHTML = matrix.map(row => `
    <tr class="hover:bg-surface-container-low/50 transition">
      <td class="p-2 text-center font-bold">${row.day}</td>
      <td class="p-2 text-right">${row.staff.islam ? formatMoney(row.staff.islam) : '—'}</td>
      <td class="p-2 text-right">${row.staff.beksultan ? formatMoney(row.staff.beksultan) : '—'}</td>
      <td class="p-2 text-right">${row.staff.aziz ? formatMoney(row.staff.aziz) : '—'}</td>
      <td class="p-2 text-right">${row.staff.makhmud ? formatMoney(row.staff.makhmud) : '—'}</td>
      <td class="p-2 text-right">${row.staff.azhiniyaz ? formatMoney(row.staff.azhiniyaz) : '—'}</td>
      <td class="p-2 text-right text-on-secondary-container">${row.debt ? formatMoney(row.debt) : '—'}</td>
      <td class="p-2 text-right font-bold text-on-surface bg-surface-container-low">${row.totalIncome ? formatMoney(row.totalIncome) : '0'}</td>
      <td class="p-2 text-right text-error">${row.totalExpense ? formatMoney(row.totalExpense) : '0'}</td>
      <td class="p-2 text-right font-bold text-secondary bg-surface-container-low">${formatMoney(row.balance)}</td>
      <td class="p-2 text-right text-tertiary">${row.click ? formatMoney(row.click) : '—'}</td>
    </tr>
  `).join('');

  if (footer) {
    footer.innerHTML = `
      <tr>
        <td class="p-2 text-center">ИТОГО:</td>
        <td class="p-2 text-right">—</td>
        <td class="p-2 text-right">—</td>
        <td class="p-2 text-right">—</td>
        <td class="p-2 text-right">—</td>
        <td class="p-2 text-right">—</td>
        <td class="p-2 text-right text-on-secondary-container">${formatMoney(sum.totalDebt)}</td>
        <td class="p-2 text-right text-on-surface">${formatMoney(sum.totalIncome)}</td>
        <td class="p-2 text-right text-error">${formatMoney(sum.totalExpense)}</td>
        <td class="p-2 text-right text-secondary">${formatMoney(sum.netProfit)}</td>
        <td class="p-2 text-right text-tertiary">${formatMoney(sum.totalClick)}</td>
      </tr>
    `;
  }
}

function downloadExcel() {
  const monthStr = document.getElementById('reportMonthSelect')?.value || '2026-05';
  window.location.href = `${API_BASE}/reports/export-excel?month=${monthStr}`;
}

// =========================================================================
// TAB 7: КАДРЫ И ЗАРПЛАТА
// =========================================================================
async function loadStaffBalances() {
  try {
    const res = await fetch(`${API_BASE}/staff/balances`);
    state.staffBalances = await res.json();
    renderStaffBalances();
  } catch (err) {
    console.error('Error loading staff balances:', err);
  }
}

function renderStaffBalances() {
  const container = document.getElementById('staffBalancesGrid');
  if (!container) return;

  container.innerHTML = state.staffBalances.map(b => `
    <div class="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xs flex flex-col justify-between hover:shadow-md transition">
      <div>
        <div class="flex items-center gap-2.5 mb-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-xs" style="background-color: ${b.user.color || '#dc2626'}">
            ${b.user.name.substring(0, 1)}
          </div>
          <div>
            <h4 class="font-bold text-xs text-on-surface">${b.user.name}</h4>
            <div class="text-[10px] text-on-surface-variant uppercase">${b.user.role}</div>
          </div>
        </div>
      </div>
      <div class="pt-2 border-t border-outline-variant flex items-center justify-between">
        <div>
          <div class="text-[10px] text-on-surface-variant font-bold uppercase">Остаток:</div>
          <div class="text-sm font-black font-data-md ${b.balanceDue >= 0 ? 'text-secondary' : 'text-error'}">
            ${formatMoney(b.balanceDue)}
          </div>
        </div>
        <button onclick="quickStaffPayout('${b.user.id}')" class="px-3 py-1.5 bg-primary-container hover:bg-primary text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer">
          Выдать аванс
        </button>
      </div>
    </div>
  `).join('');
}

function openStaffPayoutModal() {
  const modal = document.getElementById('staffPayoutModal');
  if (modal) modal.classList.remove('hidden');
}

function closeStaffPayoutModal() {
  const modal = document.getElementById('staffPayoutModal');
  if (modal) modal.classList.add('hidden');
}

function quickStaffPayout(employeeId) {
  const empSelect = document.getElementById('payoutEmployee');
  if (empSelect) empSelect.value = employeeId;
  openStaffPayoutModal();
}

async function submitStaffPayout(event) {
  event.preventDefault();

  const data = {
    employeeId: document.getElementById('payoutEmployee')?.value,
    type: 'advance',
    amount: Number(document.getElementById('payoutAmount')?.value || 0)
  };

  try {
    const res = await fetch(`${API_BASE}/staff/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      closeStaffPayoutModal();
      loadStaffBalances();
      loadExpenses();
      loadFinanceSummary();
    }
  } catch (err) {
    console.error('Error processing payout:', err);
  }
}

// =========================================================================
// TAB 8: ЧАТ КОМАНДЫ
// =========================================================================
async function loadChatChannels() {
  try {
    const res = await fetch(`${API_BASE}/chat/channels`);
    state.chatChannels = await res.json();
    renderChatChannels();
  } catch (err) {
    console.error('Error loading channels:', err);
  }
}

function renderChatChannels() {
  const container = document.getElementById('chatChannelsList');
  if (!container) return;

  container.innerHTML = state.chatChannels.map(c => `
    <button onclick="switchChatChannel('${c.id}')" class="w-full text-left p-2.5 rounded-lg transition flex items-center gap-2.5 ${state.activeChatChannel === c.id ? 'bg-primary-container/10 text-primary font-bold border border-outline-variant' : 'hover:bg-surface-container-low text-on-surface'} cursor-pointer">
      <span class="text-sm">${c.icon || '💬'}</span>
      <span class="text-xs truncate">${c.name}</span>
    </button>
  `).join('');
}

function switchChatChannel(channelId) {
  state.activeChatChannel = channelId;
  renderChatChannels();
  loadChatMessages();
}

async function loadChatMessages() {
  try {
    const res = await fetch(`${API_BASE}/chat/messages?channelId=${state.activeChatChannel}`);
    state.chatMessages = await res.json();
    renderChatMessages();
  } catch (err) {
    console.error('Error loading chat messages:', err);
  }
}

function renderChatMessages() {
  const container = document.getElementById('chatMessagesList');
  if (!container) return;

  container.innerHTML = state.chatMessages.map(m => {
    const isMe = state.currentUser && state.currentUser.id === m.userId;
    const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
        <div class="text-[10px] text-on-surface-variant mb-0.5 px-1 font-data-sm">${m.userName} • ${timeStr}</div>
        <div class="max-w-sm p-3 rounded-2xl text-xs ${isMe ? 'bg-on-surface text-white rounded-br-none shadow-xs' : 'bg-surface-container-low border border-outline-variant text-on-surface rounded-bl-none'}">
          ${m.text}
        </div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(event) {
  event.preventDefault();
  const input = document.getElementById('chatInputText');
  const text = input?.value?.trim();
  if (!text) return;

  try {
    const res = await fetch(`${API_BASE}/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: state.activeChatChannel,
        userId: state.currentUser?.id || 'islam',
        text
      })
    });
    if (res.ok) {
      if (input) input.value = '';
      loadChatMessages();
    }
  } catch (err) {
    console.error('Error sending chat msg:', err);
  }
}

// =========================================================================
// TAB 9: РЕЙТИНГ & KPI (ФЕЕРИЧНЫЙ ДИЗАЙН & ПОДИУМ)
// =========================================================================
let currentLeaderboardPeriod = 'month';

function setLeaderboardPeriod(period) {
  currentLeaderboardPeriod = period;
  ['Month', 'Quarter', 'Year'].forEach(p => {
    const btn = document.getElementById(`lbPeriod${p}`);
    if (btn) {
      if (p.toLowerCase() === period) {
        btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary-container text-white shadow-xs transition';
      } else {
        btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition';
      }
    }
  });
  loadLeaderboard();
}

async function loadLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/leaderboard`);
    const data = await res.json();
    renderLeaderboard(data.leaderboard || []);
  } catch (err) {
    console.error('Error loading leaderboard:', err);
  }
}

function renderLeaderboard(list) {
  const tableContainer = document.getElementById('leaderboardTableBody');
  const podiumContainer = document.getElementById('leaderboardPodiumContainer');
  const totalRevEl = document.getElementById('lbTotalRevenue');
  const totalOrdEl = document.getElementById('lbTotalOrdersCount');
  const topPerfNameEl = document.getElementById('lbTopPerformerName');
  const topPerfScoreEl = document.getElementById('lbTopPerformerScore');

  const totalRev = list.reduce((sum, item) => sum + (Number(item.revenueGenerated) || 0), 0);
  const totalOrd = list.reduce((sum, item) => sum + (Number(item.ordersCount) || 0), 0);

  if (totalRevEl) totalRevEl.textContent = formatMoney(totalRev);
  if (totalOrdEl) totalOrdEl.textContent = `${totalOrd} шт`;

  if (list.length > 0) {
    const top1 = list[0];
    if (topPerfNameEl) topPerfNameEl.textContent = `${top1.name}`;
    if (topPerfScoreEl) topPerfScoreEl.textContent = `Выручка: ${formatMoney(top1.revenueGenerated)} • KPI: ${top1.score} баллов`;
  }

  // 1. Render Spectacular Podium Cards for Top 3
  if (podiumContainer) {
    const podiumBadges = [
      { rank: 1, title: '🥇 1 МЕСТО (ЗОЛОТО)', bg: 'bg-gradient-to-b from-amber-50 to-white border-amber-300 ring-2 ring-amber-400/30', badgeColor: 'bg-amber-500 text-white', icon: 'military_tech' },
      { rank: 2, title: '🥈 2 МЕСТО (СЕРЕБРО)', bg: 'bg-gradient-to-b from-slate-50 to-white border-slate-300', badgeColor: 'bg-slate-400 text-white', icon: 'workspace_premium' },
      { rank: 3, title: '🥉 3 МЕСТО (БРОНЗА)', bg: 'bg-gradient-to-b from-orange-50/50 to-white border-orange-200', badgeColor: 'bg-amber-700 text-white', icon: 'workspace_premium' }
    ];

    podiumContainer.innerHTML = list.slice(0, 3).map((item, idx) => {
      const p = podiumBadges[idx];
      return `
        <div class="border rounded-2xl p-5 shadow-xs ${p.bg} flex flex-col justify-between relative overflow-hidden">
          <div class="flex items-center justify-between mb-3">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${p.badgeColor} shadow-xs">
              ${p.title}
            </span>
            <span class="material-symbols-outlined text-amber-500 text-xl fill">${p.icon}</span>
          </div>

          <div class="flex items-center gap-3 mb-3">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-md" style="background-color: ${item.color || '#dc2626'}">
              ${item.name.substring(0, 1)}
            </div>
            <div>
              <h4 class="font-extrabold text-sm text-on-surface flex items-center gap-1">
                ${item.name}
                ${idx === 0 ? '<span class="material-symbols-outlined text-amber-500 text-base fill">star</span>' : ''}
              </h4>
              <div class="text-[11px] text-on-surface-variant font-medium">${item.role || 'Мастер / Дизайнер'}</div>
            </div>
          </div>

          <div class="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-xs">
            <div>
              <span class="text-[10px] text-on-surface-variant font-medium block">Выручка:</span>
              <span class="font-bold text-secondary font-data-md">${formatMoney(item.revenueGenerated)}</span>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-on-surface-variant font-medium block">KPI:</span>
              <span class="font-black text-primary-container font-data-md">${item.score}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 2. Render Full Performance Table
  if (!tableContainer) return;

  tableContainer.innerHTML = list.map((item, idx) => {
    const rankIcons = ['🥇', '🥈', '🥉'];
    const rankDisplay = idx < 3 ? rankIcons[idx] : `#${idx + 1}`;

    return `
      <tr class="hover:bg-surface-container-low/50 transition-colors ${idx === 0 ? 'bg-amber-50/20' : ''}">
        <td class="p-3.5 pl-5 font-black text-sm text-on-surface">
          ${rankDisplay}
        </td>

        <td class="p-3.5">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs shrink-0" style="background-color: ${item.color || '#dc2626'}">
              ${item.name.substring(0, 1)}
            </div>
            <div>
              <div class="font-bold text-xs text-on-surface flex items-center gap-1">
                ${item.name}
                ${idx === 0 ? '<span class="material-symbols-outlined text-amber-500 text-sm fill">star</span>' : ''}
              </div>
            </div>
          </div>
        </td>

        <td class="p-3.5 text-on-surface-variant text-xs font-medium">${item.role || 'Полиграфия & Дизайн'}</td>

        <td class="p-3.5 text-center font-data-sm font-bold text-on-surface">${item.ordersCount} шт</td>

        <td class="p-3.5 text-right font-data-md font-bold text-secondary">${formatMoney(item.revenueGenerated)}</td>

        <td class="p-3.5 text-center">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container/30 text-secondary font-data-sm font-bold text-[11px]">
            ${98 + (idx === 0 ? 1.8 : -idx * 0.8)}%
          </span>
        </td>

        <td class="p-3.5 pr-5 text-right font-data-md font-black text-primary-container text-sm">
          ${item.score}
        </td>
      </tr>
    `;
  }).join('');
}

// =========================================================================
// TAB 10: ЛИЧНЫЙ КАБИНЕТ КЛИЕНТА
// =========================================================================
async function searchClientPortal() {
  const phone = document.getElementById('portalSearchPhone')?.value?.trim();
  if (!phone) return alert('Введите номер телефона клиента');

  try {
    const ordRes = await fetch(`${API_BASE}/orders`);
    const allOrders = await ordRes.json();
    const cleanSearch = phone.replace(/\D/g, '');
    const clientOrders = allOrders.filter(o => o.clientPhone && o.clientPhone.replace(/\D/g, '').includes(cleanSearch));

    const tableBody = document.getElementById('portalOrdersTableBody');
    if (!tableBody) return;

    if (clientOrders.length === 0) {
      tableBody.innerHTML = '<tr><td class="py-6 text-center text-on-surface-variant">У клиента пока нет заказов</td></tr>';
      return;
    }

    tableBody.innerHTML = clientOrders.map(o => `
      <tr class="hover:bg-surface-container-low/50 transition">
        <td class="p-3 font-data-sm font-bold text-on-surface-variant">#${o.orderNumber}</td>
        <td class="p-3 font-bold text-on-surface">${o.title}</td>
        <td class="p-3 font-data-sm font-bold">${formatMoney(o.totalAmount)}</td>
        <td class="p-3 font-data-sm text-secondary font-bold">${formatMoney(o.paidAmount)}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error in client portal search:', err);
  }
}

// =========================================================================
// TAB 11: НАСТРОЙКИ
// =========================================================================
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    state.settings = await res.json();
    const nameInput = document.getElementById('setCompanyName');
    const phoneInput = document.getElementById('setCompanyPhone');

    if (nameInput) nameInput.value = state.settings.companyName || 'MASTER PRINT';
    if (phoneInput) phoneInput.value = state.settings.companyPhone || '+998 90 123 45 67';
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

async function saveSettingsForm(event) {
  event.preventDefault();
  const data = {
    companyName: document.getElementById('setCompanyName')?.value,
    companyPhone: document.getElementById('setCompanyPhone')?.value
  };
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      showToast('Настройки сохранены!', 'Данные обновлены');
    }
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}
