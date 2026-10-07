/* ==========================================================================
   ui.js —— 排版外壳与基础组件
   ========================================================================== */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* -------------------------------------------------------------- 状态徽章 */
function taskBadge(t) {
  if (t.status === 'done') return '<span class="badge badge--done">✓ 做完了</span>';
  if (t.status === 'skipped') return '<span class="badge badge--todo">今天不做</span>';
  const req = Store.requestOf(t.id);
  if (req && req.status === 'waiting') return '<span class="badge badge--info">等女儿</span>';
  if (t.type === 'deadline') {
    return '<span class="badge badge--alert">' + esc(t.urgent ? '今天到期' : ('还剩 ' + t.daysLeft + ' 天')) + '</span>';
  }
  return '<span class="badge badge--need">该做了</span>';
}

function taskCardClass(t) {
  if (t.status === 'done') return 'card card--done';
  const req = Store.requestOf(t.id);
  if (req && req.status === 'waiting') return 'card card--info';
  if (t.type === 'deadline' && t.urgent) return 'card card--need';
  return 'card';
}

/* ------------------------------------------------------------------ 页头 */
function appbar(o) {
  const back = o.back
    ? `<button class="appbar__back" type="button" onclick="A('go','${esc(o.back)}')" aria-label="返回">‹</button>`
    : '';
  const sub = o.sub ? `<div class="appbar__sub">${o.sub}</div>` : '';
  return `<div class="appbar${o.lined ? ' is-lined' : ''}">
    ${back}
    <div class="appbar__titles">
      <div class="appbar__title">${o.title}</div>
      ${sub}
    </div>
  </div>`;
}

/* ---------------------------------------------------------------- 底部导航 */
const ELDER_TABS = [
  { key: 'home', icon: '🏠', label: '今天', route: '#/elder/home' },
  { key: 'history', icon: '📅', label: '记录', route: '#/elder/history' },
  { key: 'settings', icon: '⚙️', label: '设置', route: '#/elder/settings' }
];
const FAMILY_TABS = [
  { key: 'home', icon: '🏠', label: '妈妈今天', route: '#/family/home' },
  { key: 'log', icon: '📈', label: '记录', route: '#/family/log' },
  { key: 'sharing', icon: '🔗', label: '共享', route: '#/family/sharing' }
];
const FAMILY_TABS_EXTRA = { review: 'home', fix: 'review', add: 'home', request: 'home', reply: 'home', withdrawn: 'home' };

function tabbar(tabs, active) {
  return `<nav class="tabbar">${tabs.map(t => `
    <button type="button" class="${t.key === active ? 'is-on' : ''}" onclick="A('go','${t.route}')">
      <span class="ti">${t.icon}</span><span>${t.label}</span>
    </button>`).join('')}</nav>`;
}

/* --------------------------------------------------------------- 整屏外壳 */
function phonePage(o) {
  /* o: {role, title, sub, back, body, tabs, active, lined} */
  const theme = o.role === 'family' ? 'family' : 'elder';
  const tabs = o.tabs ? tabbar(o.tabs, o.active) : '';
  return `<div class="${theme}">
    <div class="statusbar">
      <span>9:41</span>
      <span class="statusbar__dots">📶 🔋</span>
    </div>
    ${appbar(o)}
    <div class="screen">${o.body}</div>
    ${tabs}
  </div>`;
}

/* ------------------------------------------------------------------- 按钮 */
function btn(label, action, arg, cls, extra) {
  const a = arg === undefined || arg === null ? '' : `,'${esc(arg)}'`;
  return `<button type="button" class="btn ${cls || 'btn--primary'}${extra || ''}"
    onclick="A('${action}'${a})">${label}</button>`;
}

/* ----------------------------------------------------------- 事务卡片（老人） */
function elderTaskCard(t) {
  return `<button type="button" class="${taskCardClass(t)}" onclick="A('go','#/elder/task/${t.id}')">
    <div class="card__row">
      <div class="card__time">${esc(t.timeLabel)}</div>
      <div class="card__main">
        <div class="card__title">${esc(t.title)}</div>
        <div class="card__meta">${esc(t.status === 'done' ? '已经做好了' : (t.deadline ? t.deadline + ' · ' + t.note : t.note))}</div>
      </div>
      <div class="card__chev">${t.status === 'done' ? '✓' : '›'}</div>
    </div>
    <div style="margin-top:12px">${taskBadge(t)}</div>
  </button>`;
}

/* ----------------------------------------------------------- 事务行（家属） */
function familyTaskRow(t) {
  const cls = t.status === 'done' ? 'card card--done' : (t.type === 'deadline' && t.urgent ? 'card card--need' : 'card');
  return `<div class="${cls}" style="padding:14px">
    <div class="card__row">
      <div class="card__time">${esc(t.timeLabel)}</div>
      <div class="card__main">
        <div class="card__title">${esc(t.title)}</div>
        <div class="card__meta">${esc(t.status === 'done' ? ('已完成 · ' + (t.doneVia === 'voice' ? '说话确认' : '按按钮确认')) : (t.deadline || t.note))}</div>
      </div>
      ${taskBadge(t)}
    </div>
  </div>`;
}

function kv(k, v) {
  return `<div class="kv"><span class="kv__k">${k}</span><span class="kv__v">${v}</span></div>`;
}

function centerMsg(icon, title, desc, buttons) {
  return `<div class="center-msg">
    <div class="center-msg__icon">${icon}</div>
    <div class="center-msg__t">${title}</div>
    <div class="center-msg__d">${desc || ''}</div>
    ${buttons ? `<div class="stack" style="width:100%;max-width:320px;margin-top:8px">${buttons}</div>` : ''}
  </div>`;
}

function demoTag(text) {
  return `<div class="footer-note">${text}</div>`;
}
