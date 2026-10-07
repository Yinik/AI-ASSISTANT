/* ==========================================================================
   screens-family.js —— 家属端 F1–F8（女儿张莉，外地；复杂操作都在这一侧）
   ========================================================================== */

function familyHeaderNote() {
  return `<div class="note note--info" style="margin-bottom:4px">
    <span class="rolechip">👩 张莉 · 女儿</span>
    <span style="margin-left:8px">你看到的是妈妈今天做没做，正常完成不会打扰你。</span>
  </div>`;
}

/* ------------------------------------------------------------------ F1 */
function F1_home(params) {
  const tasks = Store.sortedTasks();
  const pending = Store.pendingRequest();
  const done = Store.doneCount();
  const openReq = Object.keys(Store.state.requests)
    .map(k => Store.state.requests[k])
    .filter(r => r.status === 'waiting')[0];

  let banner = '';
  if (openReq) {
    const t = Store.task(openReq.taskId);
    banner = `<button type="button" class="card card--alert" style="text-align:left" onclick="A('go','#/family/request/${openReq.taskId}')">
      <div class="card__title">🔔 妈妈找你帮忙</div>
      <div class="card__meta">「${esc(t.title)}」${openReq.from === 'system' ? '超时没确认，系统通知了你' : '妈妈说需要帮忙'} · 点开看怎么回应 ›</div>
    </button>`;
  } else if (Store.state.lastWithdrawn) {
    const t = Store.task(Store.state.lastWithdrawn);
    banner = `<div class="note note--warn">妈妈撤回了「${esc(t.title)}」的求助，不用你回应了。</div>`;
  } else if (pending && pending.status === 'replied') {
    banner = `<div class="note note--ok">你已经回应过「${esc(Store.task(pending.taskId).title)}」，妈妈那边收到了回执。</div>`;
  } else {
    banner = `<div class="note note--ok">今天到目前为止都正常，不用你操心。</div>`;
  }

  return phonePage({
    role: 'family', title: '妈妈今天', sub: `${esc(TODAY_LABEL)} · ${tasks.length} 件事，完成 ${done} 件`, lined: true,
    tabs: FAMILY_TABS, active: 'home',
    body: `
      <div class="stack">
        ${familyHeaderNote()}
        ${banner}
        ${btn('➕ 帮妈妈记一件事（说一句就行）', 'go', '#/family/add', 'btn--primary')}
        <div class="section-label">妈妈今天的事</div>
        ${tasks.map(familyTaskRow).join('')}
      </div>
      ${demoTag('S14 家属端正常日 · 正常完成只进列表，不推送；只有异常才出现红色横幅')}`
  });
}

/* ------------------------------------------------------------------ F2 */
function F2_add(params) {
  const step = params.step || 'idle';
  if (step === 'listening') {
    return phonePage({
      role: 'family', title: '说一句要记的事', back: '#/family/home', lined: true,
      body: `<div style="text-align:center;padding:50px 0">
        <div style="font-size:56px">🎤</div>
        <div class="wave" style="justify-content:center;margin:18px 0">${Array.from({ length: 9 }).map((_, i) => `<i style="animation-delay:${i * 0.08}s"></i>`).join('')}</div>
        <div style="font-weight:700;font-size:17px">在听…</div>
      </div>
      ${demoTag('正在听')}`
    });
  }
  return phonePage({
    role: 'family', title: '帮妈妈记一件事', sub: '说一句就行，我来整理', back: '#/family/home', lined: true,
    body: `
      <div class="stack">
        ${familyHeaderNote()}
        <div class="card card--ghost">
          <div class="quote"><span class="quote__who">你可以这样说</span>「每周二上午九点半去菜市场买菜」</div>
        </div>
        <div style="text-align:center;padding:10px 0">
          <button type="button" class="btn btn--primary" style="max-width:260px;margin:0 auto" onclick="A('go','#/family/add?step=listening')">🎤 按住说一句</button>
        </div>
        ${btn('⌨️ 我不想说，手动填写', 'go', '#/family/review?manual=1', 'btn--ghost')}
      </div>
      ${demoTag('S15 家属端语音录入 · 复杂操作放在家属端，老人端不用碰表单')}`
  });
}

/* ------------------------------------------------------------------ F3 */
function F3_review(params) {
  const manual = params.manual === '1';
  const manual2 = params.manual === '2';
  /* 识别结果（演示用的固定结果 + 家属改过之后的版本） */
  const cur = manual2
    ? { title: '去菜市场买菜', time: '每周二 09:30', repeat: '每周二重复' }
    : { title: '去菜市场买菜', time: '每周二 09:00', repeat: '每周二重复' };

  return phonePage({
    role: 'family', title: manual ? '手动填写' : '我整理出来的是这样', sub: '确认无误才会发给妈妈', back: '#/family/add', lined: true,
    body: `
      <div class="stack">
        ${manual ? '' : `<div class="card card--ghost">
          <div class="quote"><span class="quote__who">你说的原话（留着，可以回放）</span>「每周二上午九点半去菜市场买菜」</div>
        </div>`}
        <div class="restate" style="border-color:var(--info);background:var(--info-weak)">
          <div style="font-weight:700;margin-bottom:8px">识别结果</div>
          <div>事项：<b>${esc(cur.title)}</b></div>
          <div>时间：<b>${esc(cur.time)}</b></div>
          <div>重复：<b>${esc(cur.repeat)}</b></div>
        </div>
        ${manual ? '' : `<div class="note note--warn">我可能听错。特别看一下时间对不对，不对就点下面改。</div>`}
        <div class="btn-row">
          ${btn('✏️ 修改时间', 'go', '#/family/fix?f=time', 'btn--ghost')}
          ${btn('📝 修改事项', 'go', '#/family/fix?f=title', 'btn--ghost')}
        </div>
        ${btn('🗑️ 删掉这个识别', 'go', '#/family/home', 'btn--ghost')}
        ${btn('✅ 确认无误，发给妈妈', 'confirmAdd', null, 'btn--primary')}
      </div>
      ${demoTag('S15 待确认事项 · 识别结果必须家属确认才生效，绝不直接写进老人端')}`
  });
}

/* ------------------------------------------------------------------ F4 */
function F4_request(id) {
  const t = Store.task(id);
  const r = Store.requestOf(id) || { from: 'elder', status: 'waiting' };
  if (r.status === 'withdrawn') {
    return phonePage({
      role: 'family', title: '妈妈已经撤回', back: '#/family/home', lined: true,
      body: `<div class="stack">
        <div class="note note--warn">「${esc(t.title)}」的求助被妈妈撤回了，你不需要再回应。</div>
        ${btn('知道了', 'go', '#/family/home', 'btn--primary')}
      </div>
      ${demoTag('S9 取消 · 撤回后不能回应，避免"取消的事务仍显示已发送成功"')}`
    });
  }
  return phonePage({
    role: 'family', title: '妈妈找你帮忙', back: '#/family/home', lined: true,
    body: `
      <div class="stack">
        <div class="card card--alert">
          <div class="card__title">${esc(t.title)}</div>
          <div class="card__meta" style="margin-top:8px">
            计划时间 ${esc(t.timeLabel)}${t.deadline ? ' · ' + esc(t.deadline) : ''}<br />
            ${r.from === 'system' ? '超过 1 小时没有确认，系统自动通知了你' : '妈妈自己点「叫女儿帮忙」'}
          </div>
        </div>
        <div class="card">
          <div class="kv"><span class="kv__k">妈妈留下的话</span><span class="kv__v">「${esc(t.title)}我还没弄好，你帮我看看。」</span></div>
          <div class="kv"><span class="kv__k">语音（模拟）</span><span class="kv__v">▶ 点这里听</span></div>
          <div class="kv"><span class="kv__k">当前状态</span><span class="kv__v">${r.unread ? '你还没看到' : '你已查看'}</span></div>
        </div>
        ${btn('我来回应', 'go', '#/family/reply/' + id, 'btn--primary')}
        ${btn('先放着，晚点再说', 'markSeen', id, 'btn--ghost')}
      </div>
      ${demoTag('S4 处理中 · 家属端能看到"是谁发起的"（妈妈主动 vs 系统升级），两者责任不同')}`
  });
}

/* ------------------------------------------------------------------ F5 */
function F5_reply(id) {
  const t = Store.task(id);
  return phonePage({
    role: 'family', title: '回应妈妈', sub: esc(t.title), back: '#/family/request/' + id, lined: true,
    body: `
      <div class="stack">
        <div class="section-label">你可以做这些</div>
        ${btn('🎤 录一句语音留言给她', 'familyVoice', id, 'btn--primary')}
        ${btn('📞 直接打电话给她', 'callFamily', id, 'btn--ghost')}
        ${btn('🕗 帮她改提醒时间', 'go', '#/family/fix?f=time&task=' + id, 'btn--ghost')}
        <div class="section-label">如果这件事本来就不该做</div>
        ${btn('告诉妈妈"今天不用做了"', 'familyDrop', id, 'btn--warn')}
        ${btn('标记"我已经联系过她了"', 'familySeen', id, 'btn--ghost')}
      </div>
      ${demoTag('F5 确认 / 拒绝 / 改期 · 三条出路都给出结果反馈；改时间不能自己生效，要妈妈点头')}`
  });
}

/* ------------------------------------------------------------------ F6 */
function F6_fix(params) {
  const f = params.f === 'time' ? 'time' : 'title';
  const tasks = Store.sortedTasks();
  const target = params.task ? tasks.find(t => t.id === params.task) : null;
  const isTime = f === 'time';
  const opts = isTime
    ? (target ? ['19:30', '20:30', '不重复'] : ['每周二 09:30', '每周二 08:30', '每周二 10:00'])
    : ['去菜市场买菜', '去社区医院量血压', '去银行交水费'];

  return phonePage({
    role: 'family', title: isTime ? '改时间' : '改事项', sub: '点一下就行', back: '#/family/review', lined: true,
    body: `
      <div class="stack">
        <div class="note note--info">
          ${target
            ? `改「${esc(target.title)}」的提醒时间。改完<b>不会立刻生效</b>，妈妈同意后才生效。`
            : '我识别出来的可能不准，选一个对的。'}
        </div>
        ${opts.map(o => btn(o, isTime && target ? 'submitEditTime' : 'pickOption', isTime && target ? (target.id + '|' + o) : (f + '|' + o), 'btn--ghost')).join('')}
      </div>
      ${demoTag('S15 纠正 AI 识别 · 全部点选；改时间走"妈妈确认"链路，避免静默修改')}`
  });
}

/* ------------------------------------------------------------------ F7 */
function F7_log(params) {
  if (params.empty === '1') {
    return phonePage({
      role: 'family', title: '记录', back: '#/family/home', lined: true, tabs: FAMILY_TABS, active: 'log',
      body: centerMsg('📈', '还看不出规律', '妈妈才用了不到 3 天，等数据够了再给你建议，现在乱猜没意义。',
        btn('回到首页', 'go', '#/family/home', 'btn--primary'))
        + demoTag('S13 数据不足不出建议 · 避免瞎猜')
    });
  }
  const late3 = ['10/4 20:41', '10/5 20:38', '10/6 20:44'];
  return phonePage({
    role: 'family', title: '记录', sub: '最近 7 天', lined: true, tabs: FAMILY_TABS, active: 'log',
    body: `
      <div class="stack">
        <div class="section-label">妈妈这一周</div>
        <div class="card" style="padding:12px">
          <table class="hist">
            <thead><tr><th>日期</th><th>早药</th><th>晚药</th><th>其他</th></tr></thead>
            <tbody>
              ${HIST_ROWS.map(r => `<tr>
                <td>${r.d}</td>
                <td><i class="${dotCls(r.a)}"></i></td>
                <td><i class="${dotCls(r.b)}"></i></td>
                <td><i class="${dotCls(r.c)}"></i></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="note">早药基本按时；晚药这几天都晚了 40 分钟左右。</div>

        <div class="section-label">给你的建议</div>
        <div class="suggest">
          <span class="suggest__tag">AI 建议 · 不是结论</span>
          <div style="font-weight:700">把晚上那次提醒提前到 19:30 试试</div>
          <div class="suggest__why">
            依据：这 3 天的晚药分别是 ${late3.join('、')} 才确认，都在计划时间 20:00 之后。
            提前 30 分钟可能更贴近妈妈的实际作息。
          </div>
          <div class="btn-row">
            ${btn('改成 19:30', 'suggestApply', null, 'btn--primary')}
            ${btn('先不改', 'suggestSkip', null, 'btn--ghost')}
          </div>
          <div class="note" style="margin-top:10px;font-size:12.5px">
            改完还要妈妈点头才生效。你觉得这条建议有用吗？
            <button class="btn btn--quiet" style="min-height:26px;font-size:12.5px;width:auto;display:inline-flex;padding:0 6px" onclick="A('feedback','有用')">有用</button>
            <button class="btn btn--quiet" style="min-height:26px;font-size:12.5px;width:auto;display:inline-flex;padding:0 6px" onclick="A('feedback','没用')">没用</button>
          </div>
        </div>

        <div class="section-label">妈妈的话（帮 AI 听懂她）</div>
        <div class="card">
          <div class="kv"><span class="kv__k">「吃了」</span><span class="kv__v">= 已完成</span></div>
          <div class="kv"><span class="kv__k">「弄好了」</span><span class="kv__v">= 已完成</span></div>
          <div class="kv"><span class="kv__k">「还没顾上」</span><span class="kv__v">= 未完成</span></div>
          ${btn('➕ 加一句妈妈常说的话', 'addPhrase', null, 'btn--ghost')}
        </div>

        <div class="section-label">AI 识别需要你确认的记录</div>
        <div class="card">
          <div class="kv"><span class="kv__k">10/6 20:12</span><span class="kv__v">听成「早上的药」→ 妈妈改成「晚上的药」</span></div>
          <div class="kv"><span class="kv__k">10/5 08:03</span><span class="kv__v">一次听清，无需纠正</span></div>
        </div>
      </div>
      ${demoTag('S 记录页 · 建议卡写明依据 + 有用/没用反馈闭环；识别纠错记录对家属透明')}`
  });
}

/* ------------------------------------------------------------------ F8 */
function F8_withdrawn(id) {
  const t = Store.task(id);
  return phonePage({
    role: 'family', title: '妈妈撤回了求助', back: '#/family/home', lined: true,
    body: `<div class="stack">
      <div class="note note--warn">「${esc(t.title)}」的求助已被妈妈撤回。你不需要再回应，也不会再收到提醒。</div>
      ${btn('知道了', 'go', '#/family/home', 'btn--primary')}
    </div>
    ${demoTag('F8 · 撤回后状态一致：不会既显示"已撤回"又显示"已发送成功"')}`
  });
}

/* ------------------------------------------------------------------ F9 分享权限 */
function F_sharing() {
  const s = Store.state.share;
  const can = (v) => v ? '<span class="badge badge--done">可以</span>' : '<span class="badge badge--todo">已关闭</span>';
  return phonePage({
    role: 'family', title: '共享与权限', sub: '由妈妈决定给你看什么', lined: true, tabs: FAMILY_TABS, active: 'sharing',
    body: `
      <div class="stack">
        <div class="card">
          <div class="kv"><span class="kv__k">看妈妈今天做没做</span><span class="kv__v">${can(s.status)}</span></div>
          <div class="kv"><span class="kv__k">看一周记录</span><span class="kv__v">${can(s.history)}</span></div>
          <div class="kv"><span class="kv__k">帮妈妈改提醒时间</span><span class="kv__v">${s.editTime === 'confirm' ? '<span class="badge badge--need">需要她同意</span>' : '<span class="badge badge--todo">已关闭</span>'}</span></div>
          <div class="kv"><span class="kv__k">看妈妈的位置</span><span class="kv__v"><span class="badge badge--todo">不提供</span></span></div>
          <div class="kv"><span class="kv__k">看妈妈的电话和短信</span><span class="kv__v"><span class="badge badge--todo">不提供</span></span></div>
        </div>
        <div class="note note--info">你只能看到上面这些。位置、通话、其他 App 都不在共享范围内，这是妈妈自己设的。</div>
        <div class="note">想改任何一项，都要去跟妈妈说，由她在自己手机上开关。</div>
      </div>
      ${demoTag('F5 共享与权限 · 权限清单对家属透明，且明确"由老人控制"')}`
  });
}
