/* ==========================================================================
   app.js —— 路由、动作分发、演示控制条、计时
   ========================================================================== */

/* 路由 → 编号/名称（用于页面下方说明与截图命名） */
const ROUTE_META = {
  '/elder/first': ['E1', '首次建立家庭协作'],
  '/elder/link': ['E2', '关系确认与授权'],
  '/elder/home': ['E3', '首页 · 今日待办'],
  '/elder/task': ['E4', '提醒详情'],
  '/elder/confirm': ['E5', '确认完成'],
  '/elder/voice': ['E6', '语音反馈'],
  '/elder/fix': ['E7', '纠错编辑页'],
  '/elder/add': ['E8', '老人端添加事务'],
  '/elder/canceltask': ['E9', '取消任务'],
  '/elder/ask': ['E10', '求助确认页'],
  '/elder/waiting': ['E11', '等待家属回应'],
  '/elder/reply': ['E12', '家属回复成功'],
  '/elder/noreply': ['E13', '家属未回应'],
  '/elder/approve': ['E14', '确认女儿改的时间'],
  '/elder/error': ['E15', '网络失败'],
  '/elder/history': ['E16', '历史 · 本周记录'],
  '/elder/settings': ['E17', '设置 / 帮助'],
  '/family/home': ['F1', '家庭协作首页'],
  '/family/add': ['F2', '语音录入待办'],
  '/family/review': ['F3', '待确认事项'],
  '/family/request': ['F4', '收到求助'],
  '/family/reply': ['F5', '确认 / 拒绝 / 改期'],
  '/family/fix': ['F6', '纠正 AI 识别'],
  '/family/log': ['F7', '记录与建议'],
  '/family/withdrawn': ['F8', '请求已被撤回'],
  '/family/sharing': ['F9', '共享与权限']
};

let tickHandle = null;   // 「已等 N 分钟」的秒表
let navHandle = null;    // 语音"正在听"的自动推进
let toastHandle = null;  // 顶部提示条

/* ------------------------------------------------------------------ 路由 */
function parseHash() {
  let h = location.hash.replace(/^#/, '');
  if (!h) h = '/elder/first';
  const qi = h.indexOf('?');
  const path = qi >= 0 ? h.slice(0, qi) : h;
  const params = {};
  if (qi >= 0) {
    h.slice(qi + 1).split('&').filter(Boolean).forEach(pair => {
      const [k, v] = pair.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v == null ? '' : v);
    });
  }
  const seg = path.split('/').filter(Boolean);   // ['elder','task','med-evening']
  /* key 只取 /角色/页面 两段；第三段是可选的 :id 参数，不参与路由匹配 */
  return { role: seg[0] || 'elder', name: seg[1] || 'first', id: seg[2] || null, key: '/' + seg.slice(0, 2).join('/'), params };
}

/* 直达某路由时，自动补齐它需要的演示数据，保证每个画面都能单独打开 */
function seedFor(r) {
  const S = Store.state;
  const id = r.id || 'med-evening';

  /* E1 / E2 展示"尚未建立协作"的空状态；其余页面默认已建立协作 */
  if (r.key !== '/elder/first' && r.key !== '/elder/link') S.linked = true;
  if (r.key === '/elder/first' || r.key === '/elder/link') return;

  /* 家属端首页可以直接看"有异常"的样子： #/family/home?alert=med-evening */
  if (r.key === '/family/home' && r.params.alert && !Store.requestOf(r.params.alert)) {
    Store.askHelp(r.params.alert, r.params.alert === 'med-evening' ? 'system' : 'elder');
  }
  if (r.key === '/elder/waiting' || r.key === '/elder/reply' || r.key === '/elder/noreply' ||
      r.key === '/family/request' || r.key === '/family/reply' || r.key === '/family/withdrawn') {
    if (!Store.requestOf(id)) Store.askHelp(id, r.key === '/elder/noreply' ? 'system' : 'elder');
    if (r.key === '/elder/reply' && Store.requestOf(id).status !== 'replied') {
      Store.familyReply(id, 'voice', '妈，药在电视柜第二层，白色的那板。你吃了跟我说一声。');
    }
    if (r.key === '/family/withdrawn') Store.withdrawHelp(id);
  }
  if (r.key === '/elder/approve' && !S.pendingEditTime) {
    Store.submitEditTime('med-evening', '19:30');
  }
}

function render() {
  const r = parseHash();
  seedFor(r);
  const S = Store.state;
  const params = r.params;

  /* 语音「正在听」自动推进到识别结果 */
  clearTimeout(navHandle);
  if (r.key === '/elder/voice' && params.step === 'listening') {
    navHandle = setTimeout(() => { location.hash = '#/elder/voice/' + r.id + '?step=result'; }, 1200);
  }
  if (r.key === '/family/add' && params.step === 'listening') {
    navHandle = setTimeout(() => { location.hash = '#/family/review'; }, 1200);
  }

  let html;
  switch (r.key) {
    case '/elder/first': html = E1_first(); break;
    case '/elder/link': html = E2_link(); break;
    case '/elder/home': html = E3_home(params); break;
    case '/elder/task': html = E4_task(r.id || 'med-evening'); break;
    case '/elder/confirm': html = E5_confirm(r.id || 'med-evening'); break;
    case '/elder/voice': html = E6_voice(r.id || 'med-evening', params); break;
    case '/elder/fix': html = E7_fix(r.id || 'med-evening'); break;
    case '/elder/add': html = E8_add(params); break;
    case '/elder/canceltask': html = E9_canceltask(r.id || 'med-evening'); break;
    case '/elder/ask': html = E10_ask(r.id || 'med-evening'); break;
    case '/elder/waiting': html = E11_waiting(r.id || 'med-evening', params); break;
    case '/elder/reply': html = E12_reply(r.id || 'med-evening'); break;
    case '/elder/noreply': html = E13_noreply(r.id || 'med-evening'); break;
    case '/elder/approve': html = E14_approve(); break;
    case '/elder/error': html = E15_error(r.id || 'med-evening'); break;
    case '/elder/history': html = E16_history(params); break;
    case '/elder/settings': html = E17_settings(); break;
    case '/family/home': html = F1_home(params); break;
    case '/family/add': html = F2_add(params); break;
    case '/family/review': html = F3_review(params); break;
    case '/family/request': html = F4_request(r.id || 'med-evening'); break;
    case '/family/reply': html = F5_reply(r.id || 'med-evening'); break;
    case '/family/fix': html = F6_fix(params); break;
    case '/family/log': html = F7_log(params); break;
    case '/family/withdrawn': html = F8_withdrawn(r.id || 'med-evening'); break;
    case '/family/sharing': html = F_sharing(); break;
    default: html = E3_home({});
  }

  document.getElementById('app').innerHTML = html;
  document.getElementById('phone').classList.toggle('is-xlarge', S.fontSize === 'xlarge');

  /* 底部说明：编号 / 名称 / 角色 / 路由 */
  const meta = ROUTE_META[r.key] || ['—', '—'];
  const roleName = r.role === 'family' ? '家属端（女儿）' : '老人端（张阿姨）';
  document.getElementById('caption').innerHTML =
    `<b>${meta[0]}</b> ${meta[1]} ｜ ${roleName} ｜ 路由 <code>${esc(location.hash || '#/elder/first')}</code>`;

  /* 演示控制条高亮当前角色 */
  document.querySelectorAll('[data-demo^="role:"]').forEach(b => {
    b.classList.toggle('is-on', b.getAttribute('data-demo') === 'role:' + r.role);
  });

  /* 等待计时（只改文本节点，避免整屏重绘） */
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
  const tickEl = document.querySelector('[data-tick="wait"]');
  if (tickEl) {
    let n = 3;
    tickHandle = setInterval(() => {
      n += 1;
      tickEl.textContent = String(n);
    }, 1000);
  }

  document.querySelector('.screen') && (document.querySelector('.screen').scrollTop = 0);
  showToast(Store.state.toast);
  Store.state.toast = null;
}

function toast(msg) {
  if (!msg) return;
  const el = document.querySelector('.screen');
  if (!el) return;
  const t = document.createElement('div');
  t.className = 'note note--ok';
  t.setAttribute('data-toast', '1');
  t.style.cssText = 'position:absolute;left:16px;right:16px;bottom:22px;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,.16)';
  t.textContent = msg;
  document.getElementById('phone').appendChild(t);
  clearTimeout(toastHandle);
  toastHandle = setTimeout(() => t.remove(), 2600);
}
function showToast(msg) { toast(msg); }

/* --------------------------------------------------------- 动作分发中心 */
function A(action, a, b) {
  const S = Store.state;
  const go = (h) => { location.hash = h; };

  switch (action) {
    /* 导航 */
    case 'go': go(a); break;

    /* 建立协作 */
    case 'linkFamily': Store.linkFamily(); go('#/elder/home'); break;

    /* 完成事务 */
    case 'complete':
      Store.completeTask(a, 'button');
      go('#/elder/home?done=' + a);
      break;

    /* 语音 */
    case 'voiceStart':
      go('#/elder/voice/' + a + '?step=listening');
      break;
    case 'voiceConfirm': {
      const [id, kind] = a.split('|');
      if (kind === 'yes') {
        Store.completeTask(id, 'voice');
        go('#/elder/home?done=' + id);
      } else {
        Store.log({ icon: '🕐', text: '张阿姨说「还没吃」，这件事先记成"还没做"', kind: 'warn' });
        S.toast = '好，我记成「还没做」，一会儿再提醒你一次。';
        go('#/elder/ask/' + id);
      }
      break;
    }
    case 'fixChoose': {
      const [id, kind] = a.split('|');
      Store.log({ icon: '✏️', text: kind === 'time' ? '张阿姨纠正：是晚上的药，不是早上的' : '张阿姨纠正：是还没吃，不是吃了', kind: 'info' });
      go('#/elder/voice/' + id + '?step=result' + (kind === 'time' ? '&ok=1' : '&fixed=no'));
      break;
    }

    /* 取消 */
    case 'cancelTask': {
      const [id, kind] = a.split('|');
      Store.cancelTask(id, kind);
      go('#/elder/home');
      break;
    }

    /* 求助 */
    case 'withdrawHelpAndHome':
      Store.withdrawHelp(a);
      S.lastWithdrawn = null;
      go('#/elder/home?cancelled=' + a);
      break;
    case 'callFamily':
      S.toast = '正在拨打女儿的电话…（原型模拟，不真的打电话）';
      Store.log({ icon: '📞', text: '张阿姨直接给女儿打了电话', kind: 'info' });
      render();
      break;
    case 'callClinic':
      S.toast = '正在联系社区医生…（原型模拟）';
      render();
      break;

    /* 网络失败重试 */
    case 'retryNet':
      Store.completeTask(a, 'button');
      go('#/elder/home?done=' + a);
      break;

    /* 确认女儿改的时间 */
    case 'approveEdit':
      Store.approveEditTime(a === 'yes');
      go('#/elder/home');
      break;

    /* 老人端添加事务 */
    case 'addAskFamily':
      Store.log({ icon: '➕', text: '张阿姨说想加「每周四上午去社区医院量血压」，已转给女儿录入', kind: 'info' });
      S.toast = '已经告诉女儿了，她确认一下就会开始提醒你。';
      go('#/elder/home');
      break;

    /* 设置 */
    case 'toggleFont':
      S.fontSize = S.fontSize === 'xlarge' ? 'normal' : 'xlarge';
      render();
      break;
    case 'toggleVoice':
      S.voiceOn = !S.voiceOn;
      render();
      break;
    case 'toggleShare': {
      const cur = S.share[a];
      if (cur === 'confirm') S.share[a] = 'off';
      else if (cur === 'off') S.share[a] = 'confirm';
      else S.share[a] = !cur;
      render();
      break;
    }
    case 'helpDoc':
      S.toast = '打开看图说明（原型模拟）';
      render();
      break;

    /* 家属端 */
    case 'markSeen':
      Store.familyMarkSeen(a);
      S.toast = '已标记为"你已查看"，妈妈那边不会以为你没看到。';
      go('#/family/home');
      break;
    case 'familyVoice':
      Store.familyReply(a, 'voice', '妈，药在电视柜第二层，白色的那板。你吃了跟我说一声。');
      S.toast = '留言已发出，妈妈那边会收到回执。';
      go('#/family/home');
      break;
    case 'familyDrop':
      Store.familyReply(a, 'drop', '今天不用做了，别累着。');
      S.toast = '已告诉妈妈今天不用做了。';
      go('#/family/home');
      break;
    case 'familySeen':
      Store.familyMarkSeen(a);
      Store.log({ icon: '☎️', text: '女儿标记：已联系过妈妈', kind: 'info' });
      S.toast = '已标记"联系过"，这件事不再催你。';
      go('#/family/home');
      break;
    case 'submitEditTime': {
      const [id, t] = a.split('|');
      Store.submitEditTime(id, t);
      S.toast = '已提交给妈妈，她同意后才会生效。';
      go('#/family/home');
      break;
    }
    case 'pickOption':
      go('#/family/review?manual=2');
      break;
    case 'confirmAdd':
      Store.addMarketTask();
      S.toast = '已发给妈妈，她那边现在能看到这条了。';
      go('#/family/home');
      break;
    case 'suggestApply':
      S.toast = '已发起改时间，等妈妈点头。';
      Store.submitEditTime('med-evening', '19:30');
      go('#/family/home');
      break;
    case 'suggestSkip':
      S.toast = '已记下：这条建议先不采纳。';
      render();
      break;
    case 'feedback':
      Store.log({ icon: '📝', text: `女儿反馈建议${a}`, kind: 'info' });
      S.toast = a === '有用' ? '谢谢，我会多给这类建议。' : '收到，这类建议我会少给。';
      render();
      break;
    case 'addPhrase':
      S.toast = '已加进「妈妈的话」。';
      render();
      break;

    default:
      console.warn('未处理的动作：', action, a, b);
  }
}

/* ------------------------------------------------------ 演示控制条绑定 */
document.getElementById('demobar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-demo]');
  if (!b) return;
  const v = b.getAttribute('data-demo');
  if (v === 'reset') {
    Store.reset();
    location.hash = '#/elder/first';
    render();
    toast('已恢复初始演示状态。');
    return;
  }
  if (v.startsWith('role:')) {
    Store.setRole(v.slice(5));
    location.hash = v.slice(5) === 'family' ? '#/family/home' : '#/elder/home';
    return;
  }
  if (v.startsWith('go:')) location.hash = v.slice(3);
});

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  if (!location.hash) location.hash = '#/elder/first';
  render();
});
if (document.readyState !== 'loading') {
  if (!location.hash) location.hash = '#/elder/first';
  render();
}
