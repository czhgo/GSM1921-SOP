// server/scripts/verify-smtp.mjs —— 邮件通道演练（真实 SMTP 协议会话，非 mock）
// 批次 607 外部门 `SMTP`：起本地 sink → 调真实 `services/mailer.js` 三个样本：
//   ① 正常投递（AUTH LOGIN 通过，sink 收到 1 封）
//   ② 认证失败（错口令，535）
//   ③ 连接超时（不可达地址 ＋ 短超时）
// 失败样本通过 `MAIL_RETRY_DELAYS_MS=0,0,0` 跳过 1/5/30 分钟退避；缺省行为不变。
// 输出：控制台读数 ＋ `.ctx/evidence/YYYY-MM-DD/smtp.md`。
import { startSink } from './smtp-sink.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { today as todayLocal } from '../services/reporting.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const today = todayLocal();
const OUT = path.join(REPO, '.ctx', 'evidence', today, 'smtp.md');

const sink = await startSink({ user: 'ci', pass: 'ci-pass' });

function setEnv(extra) {
  process.env.MAIL_ENABLED = 'true';
  process.env.SMTP_FROM = '支部系统 <noreply@test.local>';
  process.env.MAIL_RETRY_DELAYS_MS = '0,0,0';
  process.env.SMTP_CONNECTION_TIMEOUT_MS = '1200';
  Object.assign(process.env, extra);
}

const results = [];

// ① 正常投递
setEnv({ SMTP_HOST: '127.0.0.1', SMTP_PORT: String(sink.port), SMTP_TLS: 'false', SMTP_USER: 'ci', SMTP_PASS: 'ci-pass' });
const okMailer = await import(`../services/mailer.js?case=ok&t=${Date.now()}`);
const okResult = await okMailer.sendMail({ to: 'secretary@test.local', subject: '演练：正常投递', text: 'smtp drill ok' });
results.push({
  name: '① 正常投递', ok: okResult.ok === true && sink.messages.length === 1,
  detail: `ok=${okResult.ok} · 收到 ${sink.messages.length} 封 · rcpt=${sink.messages[0]?.to?.join(',') || '-'}`,
});

// ② 认证失败
setEnv({ SMTP_HOST: '127.0.0.1', SMTP_PORT: String(sink.port), SMTP_TLS: 'false', SMTP_USER: 'ci', SMTP_PASS: 'wrong-pass' });
const badMailer = await import(`../services/mailer.js?case=auth&t=${Date.now()}`);
const badResult = await badMailer.sendMail({ to: 'secretary@test.local', subject: '演练：认证失败', text: 'should fail' });
results.push({
  name: '② 认证失败', ok: badResult.ok === false && /535|auth/i.test(String(badResult.error)),
  detail: `ok=${badResult.ok} · error=${badResult.error || '-'}`,
});

// ③ 连接超时
setEnv({ SMTP_HOST: '10.255.255.1', SMTP_PORT: '2525', SMTP_TLS: 'false', SMTP_USER: 'ci', SMTP_PASS: 'ci-pass' });
const timeoutMailer = await import(`../services/mailer.js?case=timeout&t=${Date.now()}`);
const started = Date.now();
const timeoutResult = await timeoutMailer.sendMail({ to: 'secretary@test.local', subject: '演练：超时', text: 'should timeout' });
results.push({
  name: '③ 连接超时', ok: timeoutResult.ok === false && Boolean(timeoutResult.error),
  detail: `ok=${timeoutResult.ok} · error=${timeoutResult.error || '-'} · ${Date.now() - started}ms`,
});

await sink.close();

const pass = results.every((row) => row.ok);
const lines = [
  '---',
  `title: "SMTP 演练读数（${today}）"`,
  'type: evidence',
  'role: "[工程师]+[AI]"',
  `last_updated: ${today}`,
  'status: active',
  '---',
  '',
  `# SMTP 演练（批次 607 · 外部门 \`SMTP\`）`,
  '',
  `- 命令：\`cd server; node scripts/verify-smtp.mjs\``,
  `- 口径：真实 SMTP 协议会话（本地 sink，AUTH LOGIN），**非第三方邮件服务商实投**；失败样本以 \`MAIL_RETRY_DELAYS_MS=0,0,0\` 跳过退避。`,
  `- 结果：**${pass ? '通过' : '未通过'}**（${results.filter((r) => r.ok).length}/${results.length}）`,
  '',
  '| 样本 | 判定 | 读数 |',
  '|---|---|---|',
  ...results.map((row) => `| ${row.name} | ${row.ok ? '✅' : '❌'} | ${row.detail} |`),
  '',
  `- 服务商实投复跑：\`MFTP=...\`（提供 \`SMTP_HOST/PORT/USER/PASS/TLS\` 后重跑同一脚本，结果追加本表）。`,
  '',
];
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n'));
for (const row of results) console.log(`${row.ok ? '✔' : '✖'} ${row.name} · ${row.detail}`);
console.log(`[verify-smtp] ${pass ? '通过' : '未通过'} · 证据 ${path.relative(REPO, OUT)}`);
process.exit(pass ? 0 : 1);
