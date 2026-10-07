/* ==========================================================================
   store.js —— 演示状态与业务动作
   全部为前端内存状态：刷新页面或点「恢复初始状态」即回到初始演示状态。
   没有任何后端 / 数据库 / 真实 AI / 真实消息通道。
   ========================================================================== */

const TODAY_LABEL = '10 月 7 日 周三';

/* ------------------------------------------------------------ 初始演示状态 */
function initialState() {
  return {
    role: 'elder',          // 'elder' | 'family'
    fontSize: 'normal',     // 'normal' | 'xlarge'（设置页可切换）
    voiceOn: true,          // 语音播报开关
    linked: false,          // 是否已建立家庭协作（E1/E2）
    share: {                // 老人端授予女儿的权限（E17 可改）
      status: true,         // 看今天做没做
      history: true,        // 看一周记录
      editTime: 'confirm'   // 帮她改时间：'confirm' 需老人点头 / 'off' 不允许
    },
    tasks: [
      {
        id: 'med-morning', sortKey: 800, timeLabel: '08:00',
        title: '吃降压药（早上）', type: 'daily',
        status: 'done', doneAt: '08:04', doneVia: 'button',
        note: '一片，温水送服', deadline: null,
        detail: '每天早上八点吃一片降压药，吃完再吃早饭。'
      },
      {
        id: 'parcel', sortKey: 1000, timeLabel: '今天',
        title: '去驿站取快递', type: 'deadline', urgent: true,
        status: 'todo', doneAt: null, doneVia: null,
        note: '菜鸟驿站 3 号柜，取件码 8842', deadline: '今天 21:00 前',
        detail: '快递到驿站三天了，今天是最后一天，再不取就要退回。'
      },
      {
        id: 'med-evening', sortKey: 2000, timeLabel: '20:00',
        title: '吃降压药（晚上）', type: 'daily',
        status: 'todo', doneAt: null, doneVia: null,
        note: '一片，温水送服', deadline: null,
        detail: '每天晚上八点吃一片降压药。'
      },
      {
        id: 'water', sortKey: 3000, timeLabel: '10/15 前',
        title: '缴水费', type: 'deadline', urgent: false, daysLeft: 8,
        status: 'todo', doneAt: null, doneVia: null,
        note: '上月账单 42 元', deadline: '10 月 15 日前',
        detail: '每月 15 号前交水费。这个月还有 8 天，手机上也能交，也可以去银行。'
      }
    ],
    requests: {},           // taskId -> 求助请求
    pendingEditTime: null,  // 家属提交的改期，待老人确认
    events: [],             // 家属端「记录」里可见的事件
    marketAdded: false,     // 女儿是否已录入「每周二买菜」
    nextEditTo: null,
    voice: {                // 老人端语音演示用的当前结果，随路由参数重置
      stage: 'idle',
      heard: '',
      failCount: 0
    }
  };
}

const Store = {
  state: initialState(),

  reset() {
    this.state = initialState();
  },

  /* -------------------------------------------------------------- 查询 */
  task(id) {
    return this.state.tasks.find(t => t.id === id) || this.state.tasks[0];
  },
  sortedTasks() {
    return this.state.tasks.slice().sort((a, b) => a.sortKey - b.sortKey);
  },
  doneCount() {
    return this.state.tasks.filter(t => t.status === 'done').length;
  },
  pendingRequest() {
    const s = this.state;
    for (const k in s.requests) {
      const r = s.requests[k];
      if (r.status === 'waiting' || r.status === 'replied' || r.status === 'withdrawn') return r;
    }
    return null;
  },
  requestOf(taskId) {
    return this.state.requests[taskId] || null;
  },
  familyLogin() {
    return this.state.linked;
  },
  log(entry) {
    this.state.events.unshift(Object.assign({ at: '刚刚' }, entry));
  },

  /* -------------------------------------------------------------- 动作 */
  setRole(role) {
    this.state.role = role;
  },

  linkFamily() {
    this.state.linked = true;
    this.log({ icon: '🔗', text: '张阿姨同意让女儿连上，可以看到「今天做没做」和「一周记录」' });
  },

  completeTask(id, via) {
    const t = this.task(id);
    if (t.status === 'done') return;
    t.status = 'done';
    t.doneVia = via || 'button';
    t.doneAt = via === 'voice' ? '刚才（说话确认）' : '刚才（按按钮确认）';
    this.log({
      icon: '✅',
      text: `张阿姨完成了「${t.title}」${via === 'voice' ? '（说话确认）' : '（按按钮确认）'}`,
      kind: 'ok'
    });
  },

  cancelTask(id, reason) {
    const t = this.task(id);
    t.status = 'skipped';
    t.skipReason = reason;
    this.log({ icon: '⏭️', text: `张阿姨把「${t.title}」改成${reason === 'postpone' ? '改天再做' : '今天先不做'}`, kind: 'warn' });
  },

  askHelp(id, from) {
    this.state.requests[id] = {
      id,
      taskId: id,
      from: from || 'elder',       // 'elder' 老人主动 / 'system' 超时自动升级
      status: 'waiting',
      createdAt: '刚刚',
      unread: true,
      reply: null
    };
    const t = this.task(id);
    this.log({
      icon: '🙋',
      text: from === 'system'
        ? `「${t.title}」超时没确认，系统已通知女儿`
        : `张阿姨请女儿帮忙：「${t.title}」`,
      kind: 'info'
    });
  },

  withdrawHelp(id) {
    const r = this.state.requests[id];
    if (!r) return;
    r.status = 'withdrawn';
    r.withdrawnAt = '刚刚';
    this.log({ icon: '↩️', text: `张阿姨撤回了「${this.task(id).title}」的求助`, kind: 'warn' });
  },

  familyReply(id, kind, text) {
    const r = this.state.requests[id];
    if (!r) return;
    r.unread = false;
    r.status = 'replied';
    r.reply = { kind, text, at: '刚刚' };
    this.log({ icon: '💬', text: `女儿回应了「${this.task(id).title}」：${text}`, kind: 'ok' });
  },

  familyMarkSeen(id) {
    const r = this.state.requests[id];
    if (r) r.unread = false;
  },

  /* 家属发起改期 → 挂起等老人确认 */
  submitEditTime(id, newTime) {
    this.state.pendingEditTime = { taskId: id, from: this.task(id).timeLabel, to: newTime, at: '刚刚' };
    this.log({ icon: '🕗', text: `女儿想把「${this.task(id).title}」的提醒从 ${this.task(id).timeLabel} 改到 ${newTime}，等张阿姨确认`, kind: 'info' });
  },

  approveEditTime(accept) {
    const p = this.state.pendingEditTime;
    if (!p) return;
    const t = this.task(p.taskId);
    if (accept) {
      t.timeLabel = p.to;
      t.sortKey = p.to === '19:30' ? 1930 : t.sortKey;
      this.log({ icon: '🕗', text: `张阿姨同意把「${t.title}」的提醒改成 ${p.to}`, kind: 'ok' });
    } else {
      this.log({ icon: '🕗', text: `张阿姨没有同意改「${t.title}」的提醒时间，仍是 ${p.from}`, kind: 'warn' });
    }
    this.state.pendingEditTime = null;
  },

  addMarketTask() {
    if (this.state.marketAdded) return;
    this.state.marketAdded = true;
    this.state.tasks.push({
      id: 'market', sortKey: 930, timeLabel: '周二 09:30',
      title: '去菜市场买菜', type: 'weekly',
      status: 'todo', doneAt: null, doneVia: null,
      note: '女儿帮记的：每周二上午', deadline: null,
      detail: '每周二上午九点半去买菜。菜市场离家 400 米，走着去。'
    });
    this.log({ icon: '➕', text: '女儿录入新事务「每周二上午 09:30 去菜市场买菜」，张阿姨那边已经能看到' , kind: 'info' });
  },

  /* 演示：让一条事务超时未确认 */
  escalate(id) {
    this.askHelp(id, 'system');
  }
};
