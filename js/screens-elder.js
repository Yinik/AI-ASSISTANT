/* ==========================================================================
   screens-elder.js —— 老人端 E1–E17（大字适老：无键盘、无复杂表单）
   ========================================================================== */

const ELDER_SHARE_ITEMS = [
  { k: 'status', t: '今天做没做', d: '女儿能看到你今天几件事做了、几件还没做', on: true },
  { k: 'history', t: '一周的记录', d: '女儿能看到你这一周的完成情况', on: true },
  { k: 'editTime', t: '帮你改提醒时间', d: '她改完要你点头才算数', on: true }
];

/* ------------------------------------------------------------------ E1 */
function E1_first() {
  return phonePage({
    role: 'elder', title: '你好，我是安安', lined: true,
    body: `
      <div class="stack">
        <div class="hero">
          <div class="card__title" style="font-size:30px">我可以每天提醒你该做的事</div>
          <div class="card__meta" style="margin-top:12px">吃药、取快递、交水费，到点我会喊你，你说话告诉我就行。</div>
        </div>
        <div class="note note--info">第一次用，可以让女儿先帮你在外地安排好，你这边只要听提醒、说话回我就行。</div>
        ${btn('让女儿帮我安排', 'go', '#/elder/link', 'btn--primary')}
        ${btn('我自己来，先看看', 'go', '#/elder/home', 'btn--ghost')}
      </div>
      ${demoTag('S1 首次建立协作 · 空状态（还没有任何待办、还没连女儿）')}`
  });
}

/* ------------------------------------------------------------------ E2 */
function E2_link() {
  return phonePage({
    role: 'elder', title: '让女儿连上你这边', sub: '她会看到下面这些，不会看到别的', back: '#/elder/first', lined: true,
    body: `
      <div class="stack">
        ${ELDER_SHARE_ITEMS.map((it, i) => `
          <div class="card">
            <div class="card__title">👀 ${it.t}</div>
            <div class="card__meta">${it.d}</div>
          </div>`).join('')}
        <div class="note note--warn">
          <b>女儿看不到：</b>你在哪儿、你的电话和短信、你手机里别的软件。
        </div>
        ${btn('同意连上', 'linkFamily', null, 'btn--primary')}
        ${btn('先不连', 'go', '#/elder/home', 'btn--ghost')}
      </div>
      ${demoTag('S1 关系确认与授权 · 明确写出女儿能看到什么、看不到什么')}`
  });
}

/* ------------------------------------------------------------------ E3 */
function E3_home(params) {
  const tasks = Store.sortedTasks();
  const total = tasks.length;
  const done = Store.doneCount();
  const doneId = params.done ? Store.task(params.done) : null;
  const cancelledId = params.cancelled ? Store.task(params.cancelled) : null;

  let banner = '';
  if (doneId) {
    banner = `<div class="note note--ok"><b>记上了。</b>「${esc(doneId.title)}」算做完了，女儿那边看得到。</div>`;
  } else if (cancelledId) {
    banner = `<div class="note note--warn"><b>已经跟女儿说了。</b>「${esc(cancelledId.title)}」的求助撤回来了，她那边会显示已撤回。</div>`;
  } else if (Store.state.pendingEditTime) {
    const p = Store.state.pendingEditTime;
    banner = `<button type="button" class="card card--info" style="text-align:left" onclick="A('go','#/elder/approve')">
      <div class="card__title">女儿想改一件事的时间</div>
      <div class="card__meta">「${esc(Store.task(p.taskId).title)}」${esc(p.from)} → ${esc(p.to)}，要你点头 ›</div>
    </button>`;
  } else if (!Store.state.linked) {
    banner = `<div class="note note--warn">还没连上女儿。连上以后，你一个人搞不定的时候才能叫她。</div>`;
  }

  return phonePage({
    role: 'elder', title: '今天要做的', sub: `${esc(TODAY_LABEL)} · 一共 ${total} 件，做好了 ${done} 件`, lined: true,
    tabs: ELDER_TABS, active: 'home',
    body: `
      <div class="stack">
        ${banner}
        ${tasks.map(elderTaskCard).join('')}
        ${btn('➕ 我想加一件事', 'go', '#/elder/add', 'btn--ghost')}
      </div>
      ${demoTag('S2 正常有数据 · 早上那顿已完成，其余待办；截止型事务单独标「今天到期」')}`
  });
}

/* ------------------------------------------------------------------ E4 */
function E4_task(id) {
  const t = Store.task(id);
  const req = Store.requestOf(id);
  const done = t.status === 'done';
  return phonePage({
    role: 'elder', title: t.title, back: '#/elder/home', lined: true,
    body: `
      <div class="stack">
        <div class="${done ? 'card card--done' : (t.type === 'deadline' ? 'card card--need' : 'card')}">
          <div class="card__row" style="align-items:flex-start">
            <div class="card__main">
              <div class="card__title">${esc(t.timeLabel)}</div>
              <div class="card__meta">${esc(t.detail)}</div>
            </div>
            ${taskBadge(t)}
          </div>
        </div>
        <div class="card">
          ${kv('什么事', esc(t.title))}
          ${kv('什么时候', esc(t.timeLabel))}
          ${t.deadline ? kv('最晚', esc(t.deadline)) : ''}
          ${kv('怎么弄', esc(t.note))}
          ${done ? kv('结果', '已经做好了 · ' + esc(t.doneAt)) : ''}
        </div>
        ${req && req.status === 'waiting'
          ? `<div class="note note--info">已经告诉女儿了，正在等她回话。</div>` + btn('看看女儿回了没有', 'go', '#/elder/waiting/' + id, 'btn--ghost')
          : ''}
        ${done ? '' : `
          ${btn('我做完了', 'go', '#/elder/confirm/' + id, 'btn--primary')}
          ${btn('这件事今天做不了', 'go', '#/elder/canceltask/' + id, 'btn--ghost')}`}
      </div>
      ${demoTag('S3 提醒详情 · 截止型事务会把「最晚什么时候」写清楚')}`
  });
}

/* ------------------------------------------------------------------ E5 */
function E5_confirm(id) {
  const t = Store.task(id);
  return phonePage({
    role: 'elder', title: '这件事做完了吗？', sub: esc(t.timeLabel) + ' · ' + esc(t.title), back: '#/elder/task/' + id, lined: true,
    body: `
      <div class="stack">
        <div class="hero" style="text-align:center">
          <div style="font-size:34px;font-weight:700;line-height:1.3">${esc(t.title)}</div>
          <div class="card__meta" style="margin-top:10px">${esc(t.note)}</div>
        </div>
        ${btn('👍 我做完了', 'complete', id, 'btn--ok')}
        ${btn('🎤 用语音说', 'go', '#/elder/voice/' + id, 'btn--primary')}
        ${btn('🙋 叫女儿帮忙', 'go', '#/elder/ask/' + id, 'btn--ghost')}
      </div>
      ${demoTag('两个大按钮 + 一个语音入口；语音是"说出来"，不需要打字')}`
  });
}

/* ------------------------------------------------------------------ E6 */
const VOICE_SCRIPTS = {
  'med-evening': {
    raw: '那个晚上的药我吃过了',
    bad: { text: '今天<b>早上</b>的降压药，已经吃好了', wrongAt: '时间听错了：说的是晚上，我听成了早上' },
    good: { text: '今天晚上八点的降压药，已经吃好了' },
    fixed: { text: '今天晚上八点的降压药，已经吃好了' },
    fixedNo: { text: '今天晚上八点的降压药，<b>还没吃</b>' }
  },
  'med-morning': {
    raw: '早上那个药我吃了',
    bad: { text: '今天早上的降压药，已经吃好了', wrongAt: '剂次对上了' },
    good: { text: '今天早上的降压药，已经吃好了' },
    fixed: { text: '今天早上的降压药，已经吃好了' },
    fixedNo: { text: '今天早上的降压药，还没吃' }
  }
};
function voiceScript(id) {
  const s = VOICE_SCRIPTS[id] || VOICE_SCRIPTS['med-evening'];
  /* 统一归一化：raw / good / fixed / fixedNo 是字符串，bad 是 {text, wrongAt} */
  return {
    raw: s.raw,
    bad: { text: s.bad.text, wrongAt: s.bad.wrongAt },
    good: s.good.text,
    fixed: s.fixed.text,
    fixedNo: s.fixedNo.text
  };
}

function E6_voice(id, params) {
  const t = Store.task(id);
  const s = voiceScript(id);
  /* 直接访问 ?fail=2（不带 step）时，进入"连续听不清"状态，便于评审与截图直达 */
  const step = params.step || (parseInt(params.fail || '0', 10) >= 2 ? 'fail' : 'idle');
  const fail = parseInt(params.fail || '0', 10);

  let body;
  if (step === 'listening') {
    body = `
      <div class="mic-wrap">
        <button class="mic is-live" type="button" aria-label="正在听">🎤</button>
        <div class="wave">${Array.from({ length: 9 }).map((_, i) => `<i style="animation-delay:${i * 0.08}s"></i>`).join('')}</div>
        <div class="mic__hint">我在听，你慢慢说…</div>
      </div>
      ${demoTag('正在听（约 1.2 秒后给出识别结果）')}`;
    return phonePage({ role: 'elder', title: '用语音说', sub: esc(t.title), back: '#/elder/confirm/' + id, lined: true, body });
  }

  if (step === 'fail') {
    body = `
      <div class="stack">
        <div class="note note--warn" style="font-size:26px">
          <b>我暂时没有理解清楚。</b>你别急，我说的这句话我还留着。
        </div>
        <div class="card card--ghost">
          <div class="quote"><span class="quote__who">你说的原话（已经留着，可以给女儿听）</span>「${esc(s.raw)}」</div>
        </div>
        ${btn('🎤 再说一遍', 'voiceStart', id, 'btn--primary')}
        ${btn('👆 我不想说了，直接按按钮', 'go', '#/elder/confirm/' + id, 'btn--ok')}
      </div>
      ${demoTag('S7 失败及重试 · 连续 2 次听不清 → 自动给出「改成按按钮」，不让老人卡死；原话保留')}`;
    return phonePage({ role: 'elder', title: '我没听清', sub: esc(t.title), back: '#/elder/confirm/' + id, lined: true, body });
  }

  if (step === 'result') {
    const ok = params.ok === '1';
    const fixedNo = params.fixed === 'no';
    const said = fixedNo ? s.fixedNo : (ok ? s.good : s.bad.text);
    body = `
      <div class="stack">
        <div class="card card--ghost">
          <div class="quote"><span class="quote__who">你说的原话</span>「${esc(s.raw)}」</div>
        </div>
        <div class="restate">
          我听到的是——<br />${said}。<br />对不对？
        </div>
        ${!ok && !fixedNo ? `<div class="note note--warn">${esc(s.bad.wrongAt)}</div>` : ''}
        ${btn('✅ 对', 'voiceConfirm', id + '|' + (fixedNo ? 'no' : 'yes'), 'btn--ok')}
        ${btn('❌ 不对', 'go', '#/elder/fix/' + id, 'btn--primary')}
      </div>
      ${demoTag('S6 识别结果必须先<b>复述</b>再确认，识别结果不直接写状态；错了点「不对」去改')}`;
    return phonePage({ role: 'elder', title: '我听到的是', sub: esc(t.title), back: '#/elder/confirm/' + id, lined: true, body });
  }

  /* idle：按住说话 */
  body = `
    <div class="stack">
      ${fail >= 2 ? `<div class="note note--warn">上次没听清。这次可以慢慢说，说完我再跟你对一遍。</div>` : ''}
      <div class="mic-wrap">
        <button class="mic" type="button" onclick="A('voiceStart','${id}')" aria-label="按住说话">🎤</button>
        <div class="mic__hint">按住这里，说完松手</div>
        <div class="note">比如：「晚上那个药我吃过了」</div>
      </div>
      ${btn('👆 我不想说，直接按按钮', 'go', '#/elder/confirm/' + id, 'btn--ghost')}
    </div>
    ${demoTag('语音只是"说出来"，不用打字；同时始终保留按钮出路')}`;
  return phonePage({ role: 'elder', title: '用语音说', sub: esc(t.title), back: '#/elder/confirm/' + id, lined: true, body });
}

/* ------------------------------------------------------------------ E7 */
function E7_fix(id) {
  const s = voiceScript(id);
  return phonePage({
    role: 'elder', title: '哪里不对？', sub: '点一下就行，不用打字', back: '#/elder/voice/' + id + '?step=result', lined: true,
    body: `
      <div class="stack">
        <div class="note note--info">我听到的是「${s.bad.text.replace(/<\/?b>/g, '')}」。下面哪个说得对？</div>
        ${btn('是晚上的药，不是早上', 'fixChoose', id + '|time', 'btn--primary')}
        ${btn('是还没吃，不是吃了', 'fixChoose', id + '|no', 'btn--primary')}
        ${btn('🎤 我换一句再说一遍', 'voiceStart', id, 'btn--ghost')}
        ${btn('👆 我不说了，直接按按钮', 'go', '#/elder/confirm/' + id, 'btn--ok')}
      </div>
      ${demoTag('S6 纠错编辑页 · 全部点选，零键盘输入；同时保留"改用按钮"的退路')}`
  });
}

/* ------------------------------------------------------------------ E8 */
function E8_add(params) {
  const step = params.step || 'idle';
  if (step === 'result') {
    return phonePage({
      role: 'elder', title: '我听到的是', back: '#/elder/add', lined: true,
      body: `
        <div class="stack">
          <div class="card card--ghost"><div class="quote"><span class="quote__who">你说的原话</span>「每个礼拜四上午去社区医院量血压」</div></div>
          <div class="restate">我听到的是——<br />每周四上午，去社区医院量血压。<br />对不对？</div>
          <div class="note note--info">你点头以后，我会告诉女儿，她确认一下就会开始提醒你。</div>
          ${btn('✅ 对，就是这个', 'addAskFamily', null, 'btn--ok')}
          ${btn('❌ 不对，我重新说', 'go', '#/elder/add', 'btn--ghost')}
        </div>
        ${demoTag('S16 老人端添加事务 · AI 复述后交给女儿录入，老人不需要打字填表')}`
    });
  }
  return phonePage({
    role: 'elder', title: '你想加什么事？', sub: '按着说就行', back: '#/elder/home', lined: true,
    body: `
      <div class="stack">
        <div class="mic-wrap">
          <button class="mic" type="button" onclick="A('go','#/elder/add?step=result')" aria-label="按住说话">🎤</button>
          <div class="mic__hint">按住这里，说完松手</div>
        </div>
        ${btn('👆 算了，我还是找女儿说', 'go', '#/elder/confirm/med-evening', 'btn--ghost')}
      </div>
      ${demoTag('S16 · 老人不会填表，只用一句话表达；复杂录入交给女儿端')}`
  });
}

/* ------------------------------------------------------------------ E9 */
function E9_canceltask(id) {
  const t = Store.task(id);
  return phonePage({
    role: 'elder', title: '这件事今天不做了？', sub: esc(t.title), back: '#/elder/home', lined: true,
    body: `
      <div class="stack">
        <div class="note note--warn">不做也可以。我会告诉女儿，她那边会看到「今天不做」，不会一直问你。</div>
        ${btn('今天先不做', 'cancelTask', id + '|skip', 'btn--warn')}
        ${btn('改天再做', 'cancelTask', id + '|postpone', 'btn--warn')}
        ${btn('算了，我还是做吧', 'go', '#/elder/task/' + id, 'btn--ghost')}
      </div>
      ${demoTag('S9 取消操作 · 取消后家属端显示"今天不做"，不再追问，也不显示成功')}`
  });
}

/* ------------------------------------------------------------------ E10 */
function E10_ask(id) {
  const t = Store.task(id);
  return phonePage({
    role: 'elder', title: '要告诉女儿什么？', back: '#/elder/confirm/' + id, lined: true,
    body: `
      <div class="stack">
        <div class="card card--info">
          <div class="card__title">我要告诉女儿：</div>
          <div class="card__meta" style="margin-top:10px">「${esc(t.title)}（${esc(t.timeLabel)}）我还没弄好，你帮我看看。」</div>
        </div>
        <div class="note">女儿只会看到这件事和这句话，看不到你在哪儿、也看不到你手机里别的。</div>
        ${btn('告诉她', 'go', '#/elder/waiting/' + id, 'btn--primary')}
        ${btn('先不告诉她了', 'go', '#/elder/confirm/' + id, 'btn--ghost')}
      </div>
      ${demoTag('S11 求助确认页 · 发出去之前先让老人看清"要告诉女儿什么"')}`
  });
}

/* ------------------------------------------------------------------ E11 */
function E11_waiting(id, params) {
  const t = Store.task(id);
  const r = Store.requestOf(id) || { from: 'elder', status: 'waiting' };
  const escalated = params.from === 'system' || r.from === 'system';

  if (r.status === 'replied') {
    return phonePage({
      role: 'elder', title: '女儿回话了', back: '#/elder/home', lined: true,
      body: `<div class="stack">
        <div class="note note--ok">「${esc(t.title)}」女儿已经回应。</div>
        ${btn('看看她说了什么', 'go', '#/elder/reply/' + id, 'btn--primary')}
      </div>`
    });
  }
  if (r.status === 'withdrawn') {
    return phonePage({
      role: 'elder', title: '已经撤回来了', back: '#/elder/home', lined: true,
      body: `<div class="stack">
        <div class="note note--warn">「${esc(t.title)}」的求助已经撤回，女儿那边不会再收到。</div>
        ${btn('回到今天', 'go', '#/elder/home', 'btn--primary')}
      </div>`
    });
  }

  return phonePage({
    role: 'elder', title: '已经告诉女儿了', sub: esc(t.title), back: '#/elder/home', lined: true,
    body: `
      <div class="stack">
        <div class="card card--info" style="text-align:center;padding:26px">
          <div style="font-size:30px;font-weight:700">在等女儿回话</div>
          <div class="timer" style="margin-top:12px">已等 <span data-tick="wait">3</span> 分钟</div>
          <div class="card__meta" style="margin-top:10px">${escalated ? '因为超过一小时没确认，系统也告诉了女儿。' : '是你自己请她帮忙的，我在信息里写清楚了。'}</div>
        </div>
        ${btn('看看女儿回了没有', 'go', '#/elder/reply/' + id, 'btn--ghost')}
        ${btn('不用她管了，取消求助', 'withdrawHelpAndHome', id, 'btn--ghost')}
      </div>
      ${demoTag('S4 处理中 · 不偷偷通知：老人端明确显示"已告诉女儿"；30 分钟后仍未回应 → E13')}`
  });
}

/* ------------------------------------------------------------------ E12 */
function E12_reply(id) {
  const t = Store.task(id);
  const r = Store.requestOf(id);
  const reply = (r && r.reply) || { kind: 'message', text: '妈，药在电视柜第二层，白色的那板，你吃了跟我说一声。' };
  return phonePage({
    role: 'elder', title: '女儿回话了', sub: esc(t.title), back: '#/elder/home', lined: true,
    body: `
      <div class="stack">
        <div class="card card--done">
          <div class="card__title">👩 张莉（女儿）</div>
          <div class="quote" style="margin-top:12px">${esc(reply.text)}</div>
        </div>
        <div class="note note--ok">她已经知道这件事了。你做完以后我不会再催这件事。</div>
        ${btn('我知道了', 'go', '#/elder/home', 'btn--primary')}
      </div>
      ${demoTag('S5 成功 · 老人收到回执，知道"女儿已经知道、并且回了话"')}`
  });
}

/* ------------------------------------------------------------------ E13 */
function E13_noreply(id) {
  const t = Store.task(id);
  return phonePage({
    role: 'elder', title: '女儿还没看到', back: '#/elder/waiting/' + id, lined: true,
    body: `
      <div class="stack">
        <div class="note note--warn">
          「${esc(t.title)}」告诉女儿 <b>30 分钟</b>了，她可能正忙着，还没看到。
        </div>
        <div class="stack">
          ${btn('📞 直接给女儿打电话', 'callFamily', id, 'btn--primary')}
          ${btn('🏥 找社区医生问问', 'callClinic', id, 'btn--ghost')}
          ${btn('⏳ 再等一会儿', 'go', '#/elder/waiting/' + id, 'btn--ghost')}
        </div>
      </div>
      ${demoTag('S10 家属未回应 · 不静默、不无限等待，明确给出两条替代出路')}`
  });
}

/* ------------------------------------------------------------------ E14 */
function E14_approve() {
  const p = Store.state.pendingEditTime;
  if (!p) {
    return phonePage({
      role: 'elder', title: '没有要确认的事', back: '#/elder/home', lined: true,
      body: centerMsg('👍', '现在没有要你点头的事', '女儿改了时间会先问你，你同意了才会生效。',
        btn('回到今天', 'go', '#/elder/home', 'btn--primary'))
    });
  }
  const t = Store.task(p.taskId);
  return phonePage({
    role: 'elder', title: '女儿想改一件事', sub: esc(t.title), back: '#/elder/home', lined: true,
    body: `
      <div class="stack">
        <div class="restate">
          女儿想把「${esc(t.title)}」的提醒<br />
          从 <b>${esc(p.from)}</b> 改成 <b>${esc(p.to)}</b>。<br />
          你同意吗？
        </div>
        <div class="note">你同意之前，它还是 ${esc(p.from)}，不会自己变。</div>
        ${btn('同意改成 ' + esc(p.to), 'approveEdit', 'yes', 'btn--ok')}
        ${btn('先不改', 'approveEdit', 'no', 'btn--ghost')}
      </div>
      ${demoTag('S8 修改 · 家属的任何改动都必须老人点头，避免"静默修改"')}`
  });
}

/* ------------------------------------------------------------------ E15 */
function E15_error(id) {
  const t = Store.task(id);
  return phonePage({
    role: 'elder', title: '没连上网', back: '#/elder/confirm/' + id, lined: true,
    body: `
      <div class="stack">
        <div class="note note--alert" style="font-size:26px">
          <b>刚才没连上网，你按的那一下没送出去。</b><br />
          你按的内容我还留着，连上以后我再送，不用重新说一遍。
        </div>
        <div class="card" style="opacity:.6">
          <div class="card__title">${esc(t.title)}</div>
          <div class="card__meta">状态：还没记上（等联网）</div>
        </div>
        ${btn('再试一次', 'retryNet', id, 'btn--primary')}
        ${btn('🙋 叫女儿帮忙', 'go', '#/elder/ask/' + id, 'btn--ghost')}
      </div>
      ${demoTag('S12 网络失败 · 按钮置灰、数据不丢、明确告诉老人"不用重新说一遍"')}`
  });
}

/* ------------------------------------------------------------------ E16 */
const HIST_ROWS = [
  { d: '10/1 周四', a: 'done', b: 'done', c: '—', e: '—' },
  { d: '10/2 周五', a: 'done', b: 'late', c: 'done', e: '—' },
  { d: '10/3 周六', a: 'done', b: 'done', c: '—', e: '—' },
  { d: '10/4 周日', a: 'done', b: 'miss', c: '—', e: '—' },
  { d: '10/5 周一', a: 'late', b: 'done', c: '—', e: '—' },
  { d: '10/6 周二', a: 'done', b: 'done', c: 'done', e: '—' },
  { d: '10/7 周三', a: 'done', b: 'todo', c: 'todo', e: 'todo' }
];
function dotCls(v) {
  if (v === 'done') return 'dot dot--done';
  if (v === 'late') return 'dot dot--late';
  if (v === 'miss') return 'dot dot--miss';
  if (v === 'todo') return 'dot';
  return 'dot';
}
function E16_history(params) {
  if (params.empty === '1') {
    return phonePage({
      role: 'elder', title: '记录', back: '#/elder/home', lined: true, tabs: ELDER_TABS, active: 'history',
      body: centerMsg('📅', '还没有记录', '从今天开始，做完的事我都会记在这里，一周一页，看得很清楚。',
        btn('回到今天', 'go', '#/elder/home', 'btn--primary'))
        + demoTag('S13 空状态 · 无历史')
    });
  }
  const legend = `<div class="note" style="display:flex;gap:18px;flex-wrap:wrap">
      <span><i class="${dotCls('done')}"></i> 按时</span>
      <span><i class="${dotCls('late')}"></i> 晚了</span>
      <span><i class="${dotCls('miss')}"></i> 没做</span>
      <span><i class="${dotCls('todo')}"></i> 还没到</span>
    </div>`;
  return phonePage({
    role: 'elder', title: '这一周', sub: '打勾的就是做了', back: '#/elder/home', lined: true, tabs: ELDER_TABS, active: 'history',
    body: `
      <div class="stack">
        <div class="card" style="padding:12px">
          <table class="hist">
            <thead><tr><th>日子</th><th>早药</th><th>晚药</th><th>快递</th><th>水费</th></tr></thead>
            <tbody>
              ${HIST_ROWS.map(r => `<tr>
                <td>${r.d}</td>
                <td><i class="${dotCls(r.a)}"></i></td>
                <td><i class="${dotCls(r.b)}"></i></td>
                <td><i class="${dotCls(r.c)}"></i></td>
                <td><i class="${dotCls(r.e)}"></i></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${legend}
      </div>
      ${demoTag('老人端历史 · 只给"做了/晚了/没做"，不做评分、不做排行榜')}`
  });
}

/* ------------------------------------------------------------------ E17 */
function E17_settings() {
  const s = Store.state;
  const sw = (on, action, arg) => `<button type="button" class="sw ${on ? 'is-on' : ''}" onclick="A('${action}'${arg ? ",'" + arg + "'" : ''})" aria-label="开关"></button>`;
  return phonePage({
    role: 'elder', title: '设置', lined: true, tabs: ELDER_TABS, active: 'settings',
    body: `
      <div class="stack">
        <div class="section-label">看着方便</div>
        <div class="card">
          <div class="switchrow">
            <div class="switchrow__txt">
              <div class="switchrow__t" style="font-size:28px">字再大一点</div>
              <div class="switchrow__d">看不清就把字调更大</div>
            </div>
            ${sw(s.fontSize === 'xlarge', 'toggleFont', null)}
          </div>
          <div class="switchrow">
            <div class="switchrow__txt">
              <div class="switchrow__t" style="font-size:28px">到点念出来</div>
              <div class="switchrow__d">提醒的时候我会说话，不只是响一下</div>
            </div>
            ${sw(s.voiceOn, 'toggleVoice', null)}
          </div>
        </div>

        <div class="section-label">女儿能看到什么</div>
        <div class="card">
          ${ELDER_SHARE_ITEMS.map(it => `
            <div class="switchrow">
              <div class="switchrow__txt">
                <div class="switchrow__t" style="font-size:28px">${esc(it.t)}</div>
                <div class="switchrow__d">${esc(it.d)}</div>
              </div>
              ${sw(s.share[it.k], 'toggleShare', it.k)}
            </div>`).join('')}
        </div>
        <div class="note">不想让她看就关掉，关掉马上生效。你想让她看再打开。</div>

        <div class="section-label">需要帮忙</div>
        ${btn('🙋 找女儿帮忙', 'go', '#/elder/ask/med-evening', 'btn--ghost')}
        ${btn('📖 怎么用（看图说明）', 'helpDoc', null, 'btn--ghost')}
      </div>
      ${demoTag('共享权限由老人自己控制，逐项可关；关掉即时生效')}`
  });
}
