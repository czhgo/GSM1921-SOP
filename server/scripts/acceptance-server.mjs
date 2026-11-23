// server/scripts/acceptance-server.mjs —— 上线验收台（M-01 手机三任务 ＋ 真人签收）
// 批次 607 外部门：`M-01` 与「真人签收」按定义不能由 AI 冒充；本服务把支书要做的动作压缩成
//   「手机点 3 下 ＋ 签收页勾选」，读数（视口 / 字号 / 命中区 / UA / 时间）由页面自动采集。
// 边界：独立本地服务（默认 0.0.0.0:3100），不挂进产品路由、不改写权限矩阵；只写 `.ctx/evidence/`。
// 用法：cd server; node scripts/acceptance-server.mjs
//   手机与电脑同网 → 打开终端打印的 `http://<LAN-IP>:3100/mobile`
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { today } from '../services/reporting.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const PORT = Number(process.env.ACCEPTANCE_PORT || 3100);
const APP_PORT = Number(process.env.APP_PORT || 3000);
const outDir = () => path.join(REPO, '.ctx', 'evidence', today());

const TASKS = [
  { key: 'notice-receipt', label: '看通知并回执', path: '/notice.html' },
  { key: 'vote', label: '表决投票', path: '/activity.html' },
  { key: 'attendance', label: '查看考勤', path: '/workspace/leader.html' },
];

const SIGNOFF_PAGES = [
  '/login.html 登录', '/index.html 首页', '/workspace/secretary.html 支书台', '/notice.html 通知与回执',
  '/activity.html 活动详情与表决', '/workspace/org.html 组织台名册', '/archive.html 归档库',
  '/workspace/party-committee.html 党委台', '/help.html 帮助',
];

const page = (title, body) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
:root{color-scheme:light dark}
body{margin:0;padding:20px;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;max-width:720px}
h1{font-size:20px;margin:0 0 12px}
p{font-size:14px;color:#444;margin:6px 0 16px}
.card{border:1px solid #d8d8d8;border-radius:12px;padding:16px;margin:0 0 14px}
a.task{display:block;min-height:44px;line-height:44px;font-size:16px;font-weight:600;text-decoration:none;color:#0b57d0}
button{min-height:48px;min-width:120px;font-size:16px;border-radius:12px;border:1px solid #0b57d0;background:#0b57d0;color:#fff;padding:0 18px}
button.ghost{background:#fff;color:#0b57d0}
.ok{color:#0a7d32;font-weight:600}
label{display:flex;gap:10px;align-items:center;min-height:44px;font-size:15px}
input[type=text],textarea{width:100%;font-size:16px;min-height:44px;border:1px solid #c8c8c8;border-radius:10px;padding:8px 10px;box-sizing:border-box}
.muted{color:#666;font-size:13px}
</style></head><body>${body}
<script>
window.__metrics = () => ({
  ua: navigator.userAgent,
  viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
  screen: { w: screen.width, h: screen.height },
  noHScroll: document.documentElement.scrollWidth <= window.innerWidth + 1,
  at: new Date().toISOString(),
});
</script></body></html>`;

function mobilePage(taskState = {}) {
  const cards = TASKS.map((task) => `<div class="card" data-task="${task.key}">
  <a class="task" href="#" data-open="${task.path}">${task.label} · 打开 ${task.path}</a>
  <p class="muted">在该页完成操作后回到本页，点「完成」。</p>
  <button data-done="${task.key}">完成：${task.label}</button>
  <span class="ok" hidden>已记录</span>
</div>`).join('');
  return page('移动端三任务验收', `<h1>移动端三任务验收（M-01）</h1>
<p>请在手机上依次完成三个任务；点「完成」会记录本机读数（视口 / UA / 时间）。已记录：${Object.keys(taskState).length}/3。</p>
${cards}
<p class="muted">读数自动写入 <code>.ctx/evidence/&lt;日期&gt;/mobile-acceptance.md</code>；同时并把自动化 375 / 390 读数作为对照栏。</p>
<script>
const base = location.protocol + '//' + location.hostname + ':${APP_PORT}';
document.querySelectorAll('[data-open]').forEach((a) => { a.href = base + a.dataset.open; a.target = '_blank'; });
document.querySelectorAll('[data-done]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const payload = { task: btn.dataset.done, ...window.__metrics() };
    const res = await fetch('/api/mobile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { btn.nextElementSibling.hidden = false; btn.disabled = true; }
  });
});
</script>`);
}

function signoffPage() {
  const rows = SIGNOFF_PAGES.map((item, index) => `<label><input type="checkbox" data-page="${index}"> ${item}</label>`).join('');
  return page('上线签收', `<h1>上线路径签收</h1>
<p>逐页走一遍，勾选后提交；提交会记录账号、日期与本机读数。</p>
<div class="card">
  <label>账号<input type="text" id="account" placeholder="例如：9000000001（党委组织员）"></label>
  <label>日期<input type="text" id="date" placeholder="YYYY-MM-DD"></label>
</div>
<div class="card">${rows}</div>
<div class="card"><label>异常 / 备注<textarea id="note" rows="3"></textarea></label></div>
<button id="submit">提交签收</button>
<p class="muted">证据写入 <code>.ctx/evidence/&lt;日期&gt;/signoff.md</code>。</p>
<script>
document.getElementById('submit').addEventListener('click', async () => {
  const pages = [...document.querySelectorAll('[data-page]')].map((el, i) => ({ page: ${JSON.stringify(SIGNOFF_PAGES)}[i], walked: el.checked }));
  const payload = { account: document.getElementById('account').value, date: document.getElementById('date').value,
    note: document.getElementById('note').value, pages, ...window.__metrics() };
  const res = await fetch('/api/signoff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  document.getElementById('submit').textContent = res.ok ? '已提交' : '提交失败，请重试';
  document.getElementById('submit').disabled = res.ok;
});
</script>`);
}

function append(file, text) {
  fs.mkdirSync(outDir(), { recursive: true });
  fs.appendFileSync(path.join(outDir(), file), text);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
  });
}

const server = http.createServer(async (req, res) => {
  const send = (code, type, body) => { res.writeHead(code, { 'Content-Type': type }); res.end(body); };
  if (req.method === 'GET' && req.url.startsWith('/mobile')) return send(200, 'text/html; charset=utf-8', mobilePage());
  if (req.method === 'GET' && req.url.startsWith('/signoff')) return send(200, 'text/html; charset=utf-8', signoffPage());
  if (req.method === 'POST' && req.url === '/api/mobile') {
    const body = await readBody(req);
    const task = TASKS.find((item) => item.key === body.task);
    if (!task) return send(400, 'application/json', JSON.stringify({ error: 'unknown task' }));
    append('mobile-acceptance.md', [
      `| ${new Date().toISOString()} | ${task.label} | 人类完成动作：是 | 视口 ${body.viewport?.w}×${body.viewport?.h} @${body.viewport?.dpr}x`
        + ` · 屏幕 ${body.screen?.w}×${body.screen?.h} · 本页无横滚=${body.noHScroll} | ${String(body.ua || '').slice(0, 90)} |`,
      '',
    ].join('\n'));
    return send(200, 'application/json', JSON.stringify({ ok: true }));
  }
  if (req.method === 'POST' && req.url === '/api/signoff') {
    const body = await readBody(req);
    const walked = (body.pages || []).filter((row) => row.walked).map((row) => row.page);
    append('signoff.md', [
      `## 签收 ${body.date || today()} · 账号 ${body.account || '-'}`,
      '',
      `- 人类完成动作：是（真人在手机上点选）`,
      `- 已走页面（${walked.length}/${SIGNOFF_PAGES.length}）：${walked.join('；') || '无'}`,
      `- 异常 / 备注：${body.note || '无'}`,
      `- 设备读数：视口 ${body.viewport?.w}×${body.viewport?.h} @${body.viewport?.dpr}x · 屏幕 ${body.screen?.w}×${body.screen?.h}`,
      `- UA：${String(body.ua || '').slice(0, 160)}`,
      `- 提交时间：${new Date().toISOString()}`,
      '',
    ].join('\n'));
    return send(200, 'application/json', JSON.stringify({ ok: true, walked: walked.length }));
  }
  return send(404, 'text/plain; charset=utf-8', 'not found');
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((item) => item && item.family === 'IPv4' && !item.internal).map((item) => item.address);
  console.log(`[acceptance] 手机验收：http://${ips[0] || '127.0.0.1'}:${PORT}/mobile`);
  console.log(`[acceptance] 上线签收：http://${ips[0] || '127.0.0.1'}:${PORT}/signoff`);
  console.log(`[acceptance] 应用地址（手机同网）：http://${ips[0] || '127.0.0.1'}:${APP_PORT}/login.html`);
  console.log(`[acceptance] 证据目录：${path.relative(REPO, outDir())}`);
});
