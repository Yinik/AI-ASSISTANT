/* ==========================================================================
   walkthrough.js —— 原型自动走查脚本（真实点击，非只读浏览）
   与《docs/04-走查记录.md》的四条走查路径一一对应。

   前置：
     1) 原型已在 http://localhost:8080 运行（docker compose up --build 或静态服务）
     2) 安装依赖：cd tools && npm install
   运行：
     node walkthrough.js
     BASE_URL=http://localhost:8081 node walkthrough.js      # 换端口
     CHROME_PATH=/path/to/chrome node walkthrough.js         # 指定浏览器

   说明：走查靠"真实点击按钮 + 读回页面文字"做断言，不用截图比对，
   所以在任何有 Chrome 的机器上都能复现；退出码非 0 表示有断言失败。
   ========================================================================== */

const puppeteer = require('puppeteer');

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) {
    passed += 1;
    console.log('  \u2713 ' + name);
  } else {
    failed += 1;
    failures.push(name);
    console.log('  \u2717 ' + name + (detail ? '   -> ' + String(detail).slice(0, 110) : ''));
  }
}
function section(title) {
  console.log('\n' + title);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') jsErrors.push('console: ' + m.text()); });

  /* ---------------------------------------------------------- 页面读取工具 */
  const cap = () => page.$eval('#caption', (el) => el.innerText.trim());

  /* 只取手机画面正文，排除底部演示标注（.footer-note），避免"文档里的话"被当成页面内容 */
  const body = () => page.evaluate(() => {
    const a = document.querySelector('#app').cloneNode(true);
    a.querySelectorAll('.footer-note').forEach((e) => e.remove());
    return a.innerText.replace(/\s+/g, ' ').trim();
  });

  /* 按 onclick 片段点击（最精确，不受文案改动影响） */
  const clickOn = async (sub) => {
    const ok = await page.evaluate((s) => {
      const b = [...document.querySelectorAll('#app button')]
        .find((x) => (x.getAttribute('onclick') || '').includes(s));
      if (b) { b.click(); return true; }
      return false;
    }, sub);
    await sleep(240);
    return ok;
  };

  /* 按可见文字点击：先精确匹配，再宽松包含；只在手机画面内找 */
  const clickTxt = async (t) => {
    const ok = await page.evaluate((t) => {
      const bs = [...document.querySelectorAll('#app button')];
      let b = bs.find((x) => x.innerText.trim() === t);
      if (!b) b = bs.find((x) => x.innerText.replace(/\s+/g, '').includes(t.replace(/\s+/g, '')));
      if (b) { b.click(); return true; }
      return false;
    }, t);
    await sleep(240);
    return ok;
  };

  /* 点顶部演示控制条：切角色 / 直达状态（无刷新，保留演示状态） */
  const demo = async (t) => {
    const ok = await page.evaluate((t) => {
      const b = [...document.querySelectorAll('#demobar button')]
        .find((x) => x.innerText.replace(/\s+/g, '').includes(t.replace(/\s+/g, '')));
      if (b) { b.click(); return true; }
      return false;
    }, t);
    await sleep(340);
    return ok;
  };

  /* 整页加载（重置内存态）。注意：仅改 hash 不会触发重载，
     所以附加唯一 query 强制整页加载，保证每个流程从干净状态起跑。 */
  let nav = 0;
  const goto = async (hash) => {
    await page.goto(BASE + '/?walkthrough=' + (++nav) + '#' + hash.replace(/^#/, ''),
      { waitUntil: 'networkidle0' });
    await sleep(220);
  };

  /* 建立协作：E1 → E2 → E3 */
  const boot = async () => {
    await goto('#/elder/first');
    await clickTxt('让女儿帮我安排');
    await clickTxt('同意连上');
  };
  /* 从首页走到 E5 确认页 */
  const toE5 = async () => {
    await clickOn('#/elder/task/med-evening');
    await clickOn('#/elder/confirm/med-evening');
  };

  console.log('原型自动走查\n目标地址: ' + BASE);

  /* ============================================================ 路径 1 */
  section('【路径 1】主流程（正常完成）');
  await boot();
  check('E1「让女儿帮我安排」→ E2 关系确认与授权 → E3 首页', (await cap()).includes('E3'), await cap());
  const home1 = await body();
  check('E3 显示「一共 4 件，做好了 1 件」', /一共 4 件/.test(home1) && /做好了 1 件/.test(home1));
  check('点晚间药卡片进入 E4 提醒详情', await clickOn('#/elder/task/med-evening'));
  check('E4 是「吃降压药（晚上）」', /晚上/.test(await body()), await cap());
  check('点「我做完了」进入 E5 确认页', await clickOn('#/elder/confirm/med-evening'));
  const e5 = await body();
  check('E5 三个出路齐全（做完 / 语音 / 叫女儿）',
    /我做完了/.test(e5) && /用语音说/.test(e5) && /叫女儿帮忙/.test(e5));
  check('点「👍 我做完了」', await clickTxt('👍 我做完了'));
  const home2 = await body();
  check('回 E3 并给出「记上了」结果反馈', (await cap()).includes('E3') && /记上了/.test(home2));
  check('完成数由 1 变 2', /做好了 2 件/.test(home2), home2.slice(0, 50));
  await demo('张莉');
  const fam = await body();
  check('家属端显示「完成 2 件」', /完成 2 件/.test(fam), fam.slice(0, 60));
  check('家属端不出现异常横幅（正常完成不打扰）', !/妈妈找你帮忙/.test(fam) && /都正常/.test(fam));

  /* ============================================================ 路径 2a */
  section('【路径 2a】语音识别有误 → 用户纠正');
  await boot();
  await toE5();
  check('E5 点「🎤 用语音说」', await clickOn('#/elder/voice/med-evening'));
  check('E6 语音页就绪（按住说话）', /按住这里/.test(await body()), await cap());
  await clickTxt('按住这里');
  if (!(await page.$('#app .mic'))) { /* 兜底：直接把麦克风按钮点掉 */ }
  await page.evaluate(() => { const m = document.querySelector('#app .mic'); if (m) m.click(); });
  await sleep(1600); /* 等"正在听"自动推进到识别结果 */
  const v1 = await body();
  check('先复述、不直接写状态：把"晚上"听成"早上"', /早上/.test(v1) && /对不对/.test(v1), v1.slice(0, 100));
  check('点「❌ 不对」进入 E7 纠错编辑页', await clickTxt('不对') && (await cap()).includes('E7'), await cap());
  check('E7 有候选改法「是晚上的药，不是早上」', /不是早上/.test(await body()));
  check('点候选后复述被更正为晚上', await clickTxt('是晚上的药，不是早上') && /晚上八点/.test(await body()));
  check('更正后仍需老人点头（对不对？）', /对不对/.test(await body()));
  check('点「✅ 对」正常完成并回 E3', await clickTxt('✅ 对') && (await cap()).includes('E3'), await cap());

  /* ============================================================ 路径 2b */
  section('【路径 2b】取消求助 → 家属端状态一致');
  await goto('#/elder/waiting/med-evening');
  check('E11 等待家属回应', (await cap()).includes('E11'), await cap());
  check('点「不用她管了，取消求助」', await clickTxt('取消求助'));
  check('回 E3 并反馈「已经跟女儿说了」',
    (await cap()).includes('E3') && /已经跟女儿说/.test(await body()), await cap());
  await goto('#/family/withdrawn/med-evening');
  const wd = await body();
  check('F8 显示「已被妈妈撤回 / 不需要再回应」', /撤回/.test(wd) && /不需要再回应/.test(wd));
  check('F8 不出现「已发送成功」（两端状态一致）', !/已发送成功/.test(wd));

  /* ============================================================ 路径 2c */
  section('【路径 2c】家属改期 → 必须老人点头才生效');
  await goto('#/family/reply/med-evening');
  check('F5 确认 / 拒绝 / 改期', (await cap()).includes('F5'), await cap());
  check('点「🕗 帮她改提醒时间」', await clickTxt('帮她改提醒时间'));
  check('改期页写明「妈妈同意后才生效」', /同意后才生效/.test(await body()));
  check('选 19:30 提交', await clickTxt('19:30'));
  await demo('⑥ 确认改时间');
  const ap = await body();
  check('E14 写明「你同意之前，它还是 20:00，不会自己变」',
    /20:00/.test(ap) && /同意之前/.test(ap), ap.slice(0, 120));
  check('点「同意改成 19:30」', await clickTxt('同意改成 19:30') || await clickTxt('同意'));
  await demo('② 首页');
  check('首页晚间提醒时间真的变成 19:30', /19:30/.test(await body()), (await body()).slice(0, 120));

  /* ============================================================ 路径 3 */
  section('【路径 3】失败 / 无法继续');
  await goto('#/elder/voice/med-evening?fail=2');
  const f = await body();
  check('连续听不清 → 明确告知「我暂时没有理解清楚」', /没有理解清楚/.test(f));
  check('保留「你说的原话」区块', /原话/.test(f));
  check('自动给出「直接按按钮」的退路', /直接按按钮/.test(f));
  await goto('#/elder/noreply/med-evening');
  const nr = await body();
  check('家属未回应 → 告知「女儿还没看到」', /还没看到/.test(nr));
  check('给出替代出路：直接给女儿打电话', /打电话/.test(nr));
  check('给出替代出路：找社区医生', /社区医生/.test(nr));
  await goto('#/elder/error/med-evening');
  const er = await body();
  check('网络失败 → 明确告知且「不用重新说一遍」', /不用重新说一遍/.test(er));
  check('点「再试一次」后恢复（离开 E15）', await clickTxt('再试一次') && !(await cap()).includes('E15'), await cap());

  /* ============================================================ 路径 4 */
  section('【路径 4】角色间协作（老人 ↔ 家属）');
  await boot();
  await toE5();
  check('E5 点「🙋 叫女儿帮忙」', await clickOn('#/elder/ask/med-evening'));
  check('先弹 E10 求助确认页', (await cap()).includes('E10'), await cap());
  const e10 = await body();
  check('E10 写清「我要告诉女儿」什么', /我要告诉女儿/.test(e10));
  check('E10 写明权限边界「看不到你在哪儿」', /看不到你在哪儿/.test(e10));
  check('点「告诉她」进入 E11', await clickTxt('告诉她') && (await cap()).includes('E11'), await cap());
  const e11 = await body();
  check('E11 显示「已经告诉女儿了」并有计时', /已经告诉女儿/.test(e11) && /已等/.test(e11));
  await demo('张莉');
  check('F1 出现红色异常横幅「妈妈找你帮忙」', /妈妈找你帮忙/.test(await body()));
  check('点开异常进入 F4 收到求助', await clickOn('#/family/request/med-evening') && (await cap()).includes('F4'), await cap());
  check('F4 写明是「妈妈自己点『叫女儿帮忙』」', /妈妈自己点/.test(await body()));
  check('点「我来回应」进入 F5', await clickTxt('我来回应') && (await cap()).includes('F5'), await cap());
  check('点「🎤 录一句语音留言给她」', await clickTxt('录一句语音留言'));
  await demo('张阿姨');
  check('老人端首页出现「女儿已经回话了」回执横幅', /女儿已经回话了/.test(await body()), (await body()).slice(0, 90));
  check('点回执横幅可进 E12 看到留言', await clickOn('#/elder/reply/med-evening') && (await cap()).includes('E12'), await cap());
  check('E12 能看到女儿留言内容', /电视柜|留言|回话/.test(await body()));
  check('点「我知道了」回 E3', await clickTxt('我知道了') && (await cap()).includes('E3'), await cap());

  /* ============================================================ 其他 */
  section('【其他】');
  await goto('#/elder/voice/med-evening?fail=2');
  check('恢复初始状态：点控制条「↺ 恢复初始状态」回到 E1', await demo('恢复初始状态') && (await cap()).includes('E1'), await cap());

  /* 全路由可达性：编号清单里的每一项都应有画面 */
  const routes = [
    '#/elder/first', '#/elder/link', '#/elder/home', '#/elder/task/parcel',
    '#/elder/confirm/med-evening', '#/elder/voice/med-evening', '#/elder/fix/med-evening',
    '#/elder/add', '#/elder/canceltask/med-evening', '#/elder/ask/med-evening',
    '#/elder/waiting/med-evening', '#/elder/reply/med-evening', '#/elder/noreply/med-evening',
    '#/elder/approve', '#/elder/error/med-evening', '#/elder/history', '#/elder/history?empty=1',
    '#/elder/settings', '#/family/home', '#/family/add', '#/family/review',
    '#/family/request/med-evening', '#/family/reply/med-evening', '#/family/fix',
    '#/family/log', '#/family/log?empty=1', '#/family/withdrawn/med-evening', '#/family/sharing',
  ];
  let routeBad = 0;
  for (const r of routes) {
    await goto(r);
    const txt = await body();
    if (txt.length < 30) { routeBad += 1; console.log('     空画面: ' + r); }
  }
  check('27 个页面 / 状态路由全部有画面（含 ?empty=1 等变体）', routeBad === 0, routeBad + ' 条异常');

  check('全程无 JavaScript 报错', jsErrors.length === 0, jsErrors.slice(0, 2).join(' | '));

  /* ============================================================ 汇总 */
  console.log('\n' + '='.repeat(60));
  console.log('断言合计 ' + (passed + failed) + ' 项，通过 ' + passed + ' 项，失败 ' + failed + ' 项');
  if (failed) {
    console.log('失败项：');
    failures.forEach((n) => console.log('  - ' + n));
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('走查脚本异常终止：' + e.message);
  process.exit(2);
});
