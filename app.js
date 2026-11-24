'use strict';
/* elhassan home — كتالوج الجملة التفاعلي */

const WA_NUMBER = '201125384436';
const LS_CART = 'elhassan_catalog_cart_v1';
const FINISHES = ['سادة', 'تشبيح ورق دهب', 'منقرش', 'لون خاص حسب الطلب'];

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const fmt = n => (Math.round(n * 100) / 100).toLocaleString('en-EG') + ' ج';

let products = [];
let cart = loadCart();
let activeFilter = 'الكل';
let searchTerm = '';

function loadCart() {
  try { const c = JSON.parse(localStorage.getItem(LS_CART)); if (Array.isArray(c)) return c; } catch (e) {}
  return [];
}
function saveCart() { localStorage.setItem(LS_CART, JSON.stringify(cart)); }

/* ===== تحميل الأصناف: Google Sheets CSV (اختياري) ثم products.json ===== */
async function loadProducts() {
  const csvUrl = (typeof CATALOG_CONFIG !== 'undefined' && CATALOG_CONFIG.sheetsCsvUrl || '').trim();
  if (csvUrl) {
    try {
      const r = await fetch(csvUrl, { cache: 'no-store' });
      if (r.ok) {
        const list = parseCsv(await r.text());
        if (list.length) return list;
      }
    } catch (e) { /* نسقط على products.json */ }
  }
  const r = await fetch('products.json', { cache: 'no-store' });
  return r.json();
}
function parseCsv(text) {
  const rows = [];
  let cur = [''], inQ = false, row = [];
  row = cur;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur[cur.length - 1] += '"'; i++; } else inQ = false; }
      else cur[cur.length - 1] += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') cur.push('');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      rows.push(cur); cur = [''];
    } else cur[cur.length - 1] += ch;
  }
  if (cur.length > 1 || cur[0] !== '') rows.push(cur);
  return rows
    .filter(r => r.length >= 5 && r[0].trim() && r[0].trim().toLowerCase() !== 'code')
    .map(r => ({
      code: r[0].trim(),
      name: (r[1] || '').trim(),
      pieces: parseInt(r[2], 10) > 0 ? parseInt(r[2], 10) : null,
      price: parseFloat(r[3]) || 0,
      category: (r[4] || '').trim() || 'أخرى',
      image: (r[5] || '').trim(),
      note: (r[6] || '').trim()
    }))
    .filter(p => p.code && p.name);
}

/* ===== صورة المنتج / الصورة الافتراضية ===== */
function productImageHtml(p) {
  if (p.image) return `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.outerHTML=placeholderHtml('${esc(p.code)}')">`;
  return placeholderHtml(p.code);
}
function placeholderHtml(code) {
  return `<div class="pcard-ph"><div class="ph-mono">EH</div><div class="ph-code">${esc(code)}</div></div>`;
}

/* ===== عرض المنتجات ===== */
function categories() {
  const cats = [...new Set(products.map(p => p.category))];
  return ['الكل', ...cats];
}
function renderFilters() {
  $('filters').innerHTML = categories().map(c =>
    `<button data-cat="${esc(c)}" class="${c === activeFilter ? 'active' : ''}">${esc(c)}</button>`).join('');
}
function filteredProducts() {
  const t = searchTerm.trim();
  return products.filter(p =>
    (activeFilter === 'الكل' || p.category === activeFilter) &&
    (!t || p.name.includes(t) || p.code.toLowerCase().includes(t.toLowerCase())));
}
function renderProducts() {
  const list = filteredProducts();
  $('emptyMsg').classList.toggle('hidden', list.length > 0);
  $('productsGrid').innerHTML = list.map(p => `
    <article class="pcard" data-code="${esc(p.code)}">
      <div class="pcard-img" data-zoom="${esc(p.code)}">${productImageHtml(p)}</div>
      <div class="pcard-body">
        <span class="pcard-code">${esc(p.code)}</span>
        <span class="pcard-name">${esc(p.name)}</span>
        <span class="pcard-meta">${p.pieces ? p.pieces + ' قطع في الطقم' : 'عدد القطع غير محدد في الكتالوج'} — ${esc(p.category)}</span>
        <span class="pcard-price" id="price-${esc(p.code)}">${fmt(p.price)} <small>سعر الجملة للطقم</small></span>
        ${p.variants ? `<select data-variant="${esc(p.code)}">${p.variants.map((v, i) => `<option value="${i}">${esc(v.label)} — ${fmt(v.price)}</option>`).join('')}</select>` : ''}
        ${p.addon ? `<label class="addon-row"><input type="checkbox" data-addon="${esc(p.code)}"> ${esc(p.addon.label)} (+${fmt(p.addon.price)} للطقم)</label><input type="text" class="color-note hidden" data-addon-name="${esc(p.code)}" placeholder="الاسم المطلوب كتابته">` : ''}
        ${p.note ? `<span class="pcard-note">${esc(p.note)}</span>` : '' }
        <select data-finish="${esc(p.code)}">
          ${FINISHES.map(f => `<option value="${esc(f)}">${esc(f)}</option>`).join('')}
        </select>
        <input type="text" class="color-note hidden" data-color="${esc(p.code)}" placeholder="اكتب درجة اللون المطلوبة">
        <div class="qty-row">
          <button class="qty-btn" data-qty-minus="${esc(p.code)}">−</button>
          <span class="qty-val" id="qty-${esc(p.code)}">1</span>
          <button class="qty-btn" data-qty-plus="${esc(p.code)}">+</button>
        </div>
        <button class="add-btn" data-add="${esc(p.code)}">أضف لطلب الجملة</button>
      </div>
    </article>`).join('');
}

/* ===== السلة ===== */
const pendingQty = {};
function cartTotals() {
  const sets = cart.reduce((s, it) => s + it.qty, 0);
  const pieces = cart.reduce((s, it) => s + (it.pieces ? it.qty * it.pieces : 0), 0);
  const unknownSets = cart.reduce((s, it) => s + (it.pieces ? 0 : it.qty), 0);
  const total = cart.reduce((s, it) => s + it.qty * it.price, 0);
  return { sets, pieces, unknownSets, total };
}
function updateCartUi() {
  const t = cartTotals();
  $('cartCount').textContent = t.sets;
  $('bottomBar').classList.toggle('hidden', cart.length === 0);
  $('bbSets').textContent = t.sets;
  $('bbTotal').textContent = fmt(t.total);
  renderDrawer();
}
function renderDrawer() {
  if (!cart.length) {
    $('drawerItems').innerHTML = '<p class="empty">السلة فاضية — أضف أصنافاً من الكتالوج.</p>';
    $('drawerTotals').innerHTML = '';
    return;
  }
  $('drawerItems').innerHTML = cart.map((it, i) => `
    <div class="ditem">
      <div class="ditem-top">
        <div>
          <div class="ditem-name">${esc(it.name)} <span class="ditem-sub">(${esc(it.code)})</span></div>
          <div class="ditem-sub">${esc((it.variant ? it.variant + ' — ' : '') + (it.addonName ? 'إضافة اسم: ' + it.addonName + ' — ' : ''))}${esc(it.finish)}${it.colorNote ? ' — ' + esc(it.colorNote) : ''} — ${fmt(it.price)} للطقم</div>
        </div>
        <button class="ditem-del" data-del="${i}">حذف</button>
      </div>
      <div class="ditem-row">
        <div class="qty-row">
          <button class="qty-btn" data-cart-minus="${i}">−</button>
          <span class="qty-val">${it.qty}</span>
          <button class="qty-btn" data-cart-plus="${i}">+</button>
        </div>
        <span class="ditem-price">${fmt(it.qty * it.price)}</span>
      </div>
    </div>`).join('');
  const t = cartTotals();
  $('drawerTotals').innerHTML = `
    <div>إجمالي الأطقم: <b>${t.sets}</b>${piecesText(t)}</div>
    <div class="grand">الإجمالي المبدئي: ${fmt(t.total)}</div>`;
}

function piecesText(t) {
  if (!t.unknownSets) return ' — إجمالي القطع: <b>' + t.pieces + '</b>';
  return t.pieces ? ' — قطع معروفة العدد: <b>' + t.pieces + '</b> (بدون ' + t.unknownSets + ' طقم عدد قطعها غير محدد)' : '';
}
function itemLabel(it) {
  return (it.variant ? ' | ' + it.variant : '') + (it.addonName ? ' | إضافة اسم: ' + it.addonName : '');
}
/* ===== رسالة الواتساب ===== */
function orderMessage() {
  const t = cartTotals();
  const name = $('traderName').value.trim() || '—';
  const store = $('traderStore').value.trim() || '—';
  const type = $('traderType').value;
  const gov = $('traderGov').value.trim() || '—';
  const notes = $('traderNotes').value.trim();
  const lines = cart.map(it =>
    `• ${it.code} | ${it.name}${itemLabel(it)} | ${it.finish}${it.colorNote ? ' (' + it.colorNote + ')' : ''} | ${it.qty} طقم × ${fmt(it.price)} = ${fmt(it.qty * it.price)}`);
  return `طلب جملة جديد — elhassan home
الاسم: ${name}
المعرض/الصفحة: ${store}
نوع النشاط: ${type}
المحافظة: ${gov}${notes ? '\nملاحظات: ' + notes : ''}
──────────
${lines.join('\n')}
──────────
إجمالي الأطقم: ${t.sets}${piecesText(t).replace(/<\/?b>/g, '')}
الإجمالي المبدئي: ${fmt(t.total)}
نظام الدفع: عربون قبل التنفيذ وباقي الحساب عند الجاهزية وقبل الشحن`;
}

/* ===== تنبيه ===== */
let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ===== الأحداث ===== */
$('searchInput').addEventListener('input', e => { searchTerm = e.target.value; renderProducts(); });
$('filters').addEventListener('click', e => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  activeFilter = b.dataset.cat;
  renderFilters(); renderProducts();
});
$('productsGrid').addEventListener('click', e => {
  const zoom = e.target.closest('[data-zoom]');
  if (zoom) { openLightbox(zoom.dataset.zoom); return; }
  const minus = e.target.closest('[data-qty-minus]');
  const plus = e.target.closest('[data-qty-plus]');
  const add = e.target.closest('[data-add]');
  if (minus) {
    const c = minus.dataset.qtyMinus;
    pendingQty[c] = Math.max(1, (pendingQty[c] || 1) - 1);
    $('qty-' + CSS.escape(c)).textContent = pendingQty[c];
  }
  if (plus) {
    const c = plus.dataset.qtyPlus;
    pendingQty[c] = (pendingQty[c] || 1) + 1;
    $('qty-' + CSS.escape(c)).textContent = pendingQty[c];
  }
  if (add) {
    const c = add.dataset.add;
    const p = products.find(x => x.code === c);
    if (!p) return;
    const finish = document.querySelector(`select[data-finish="${CSS.escape(c)}"]`).value;
    const colorNote = finish === 'لون خاص حسب الطلب'
      ? (document.querySelector(`input[data-color="${CSS.escape(c)}"]`).value.trim() || '')
      : '';
    const qty = pendingQty[c] || 1;
    let price = p.price, variant = '', addonName = '';
    if (p.variants) {
      const v = p.variants[+document.querySelector(`select[data-variant="${CSS.escape(c)}"]`).value] || p.variants[0];
      price = v.price; variant = v.label;
    }
    if (p.addon && document.querySelector(`input[data-addon="${CSS.escape(c)}"]`).checked) {
      addonName = document.querySelector(`input[data-addon-name="${CSS.escape(c)}"]`).value.trim();
      if (!addonName) { toast('اكتب الاسم المطلوب أو ألغِ إضافة الاسم'); return; }
      price += p.addon.price;
    }
    const existing = cart.find(it => it.code === c && it.finish === finish && it.colorNote === colorNote && (it.variant || '') === variant && (it.addonName || '') === addonName);
    if (existing) existing.qty += qty;
    else cart.push({ code: p.code, name: p.name, pieces: p.pieces, price, variant, addonName, note: p.note || '', finish, colorNote, qty });
    saveCart(); updateCartUi();
    toast('اتضاف ' + qty + ' طقم للسلة');
  }
});
document.addEventListener('change', e => {
  const vs = e.target.closest('select[data-variant]');
  if (vs) {
    const p = products.find(x => x.code === vs.dataset.variant);
    const v = p && p.variants[+vs.value];
    const el = document.getElementById('price-' + vs.dataset.variant);
    if (v && el) el.innerHTML = fmt(v.price) + ' <small>سعر الجملة للطقم</small>';
  }
  const ad = e.target.closest('input[data-addon]');
  if (ad) {
    const n = document.querySelector(`input[data-addon-name="${CSS.escape(ad.dataset.addon)}"]`);
    if (n) n.classList.toggle('hidden', !ad.checked);
  }
  const sel = e.target.closest('select[data-finish]');
  if (!sel) return;
  const note = document.querySelector(`input[data-color="${CSS.escape(sel.dataset.finish)}"]`);
  if (note) note.classList.toggle('hidden', sel.value !== 'لون خاص حسب الطلب');
});
function openDrawer() { $('cartDrawer').classList.remove('hidden'); $('drawerOverlay').classList.remove('hidden'); }
function closeDrawer() { $('cartDrawer').classList.add('hidden'); $('drawerOverlay').classList.add('hidden'); }
$('cartBtn').addEventListener('click', openDrawer);
$('reviewBtn').addEventListener('click', openDrawer);
$('drawerClose').addEventListener('click', closeDrawer);
$('drawerOverlay').addEventListener('click', closeDrawer);
$('drawerItems').addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  const minus = e.target.closest('[data-cart-minus]');
  const plus = e.target.closest('[data-cart-plus]');
  if (del) cart.splice(+del.dataset.del, 1);
  if (minus) { const it = cart[+minus.dataset.cartMinus]; it.qty = Math.max(1, it.qty - 1); }
  if (plus) { const it = cart[+plus.dataset.cartPlus]; it.qty++; }
  if (del || minus || plus) { saveCart(); updateCartUi(); }
});
$('sendWhatsAppBtn').addEventListener('click', () => {
  if (!cart.length) { toast('السلة فاضية'); return; }
  window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(orderMessage()), '_blank');
});

/* ===== عرض الصورة كبير ===== */
function openLightbox(code) {
  const p = products.find(x => x.code === code);
  if (!p) return;
  $('lightboxBody').innerHTML = productImageHtml(p);
  $('lightbox').classList.remove('hidden');
}
$('lightboxClose').addEventListener('click', () => $('lightbox').classList.add('hidden'));
$('lightbox').addEventListener('click', e => { if (e.target === $('lightbox')) $('lightbox').classList.add('hidden'); });

/* ===== تهيئة ===== */
(async function init() {
  try { products = await loadProducts(); }
  catch (e) {
    $('emptyMsg').textContent = 'تعذّر تحميل الأصناف — راجع اتصال النت أو ملف products.json';
    $('emptyMsg').classList.remove('hidden');
    return;
  }
  renderFilters();
  renderProducts();
  updateCartUi();
})();
