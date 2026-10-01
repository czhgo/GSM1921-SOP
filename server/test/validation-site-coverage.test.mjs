// server/test/validation-site-coverage.test.mjs — `R-73` 第 ③ 缺的守卫：**「漏登记」增量检测**（2026-10-01 批次 323）
//
// 病灶（`CLAUDE.md R-73` 三缺之③；同族 `H-7`）：
//   `form-loop-registry.mjs` 自述「S0 只防规模缩水、S2 只防 `machine:true` 漏覆盖，**都防不了『漏登记』**」
//   ——即：新写一处「字段级必填校验点」而**没人把它登进台账**时，`form-loop-sweep` 的 S0–S4
//   **全绿**（规模没缩、僵尸没有、真机覆盖对得上），台账从此**静默不是全量**。
//
// 取数原则（与 `timestamps-note-guard` 同款：**只降不升的存量清单**）：
//   · **候选**＝按 `form-loop-registry.mjs` 开篇登记的**同一套「登记判据」**扫 `docs/src/**`（排除测试文件），
//     即 ① `showToast('error'|'warn'|'warning', '…关键词语…')` ② `showStatus('error', '…')`
//     ③ `return { ok:false, error|message: '…' }`，且文案**点名了字段/选择项**（含 请填写/请输入/请选择/必须/不能为空/请先）。
//   · **已登记**＝候选的 `(file, 文案)` 能在 `VALIDATION_SITES` 里同一 `file` 下找到同文案（或互为子串）的条目。
//   · **未登记**＝候选里找不到登记的 ⇒ 落进 `UNREGISTERED_BASELINE`（**只降不升**）。
//
// ⚠ 边界（不假装覆盖；`H-7` 的「只报不判，避免误红」在此落成「**有界量的只降不升**」）：
//   本判据只认**字面量文案**形态；经变量拼接的报文（`'请填写' + field`）**扫不出来**——那一半仍只能靠人读。
//   故它的作用是「**新增加一处漏登记会立刻看得见**」，不是「全站校验点已被穷举」。
// ─────────────────────────────────────────────────────────────────────────────
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { VALIDATION_SITES, SRC } from './form-loop-registry.mjs';

const ROOT = join(import.meta.dirname, '..', '..');

/** 存量基线：当前**未登记**的候选，**只降不升**。
 *  本批（323）实测＝ **4 处**，**全部是「状态守卫」**（不点名具体字段 / 选择项 ⇒ 按台账开篇判据**本就不该登记**），
 *  我的「字段关键词」粗筛（`请先` 一类）会把它们捞进来；留在基线里＝**承认它们是正当的非登记项**，不是缺口。 */
export const UNREGISTERED_BASELINE = [
  'docs/src/components/governance/person-edit-modal.js :: 在册备注需随在册状态变更一并报确认，请先调整状态或联系支书',
  'docs/src/entries/pages/notice-entry.js :: 请先登录后再申报线上参会',
  'docs/src/entries/tabs/disc/attendance-tab.js :: 请先勾选要确认的考勤',
  'docs/src/entries/tabs/disc/inspection-tab.js :: 暂无可提交的已确认考察，请先确认（或抽查）后再提交',
];

const FIELD_KEYWORD = /请填写|请输入|请选择|必须|不能为空|请先/;

/** 从一行源码里抽候选文案（与台账开篇判据同源：三种形态） */
function candidatesInLine(line) {
  const out = [];
  let m;
  // ① showToast('error'|'warn'|'warning', '文案') ／ ② showStatus('error', '文案')
  const reCall = /(?:showToast|showStatus)\s*\(\s*['"](?:error|warn|warning)['"]\s*,\s*(['"])((?:\\.|(?!\1).)*)\1/g;
  while ((m = reCall.exec(line))) out.push(m[2]);
  // ③ return { ok: false, error|message: '文案' }
  const reRet = /ok\s*:\s*false\s*,[\s\S]*?(?:error|message)\s*:\s*(['"])((?:\\.|(?!\1).)*)\1/g;
  while ((m = reRet.exec(line))) out.push(m[2]);
  return out.filter((s) => s && FIELD_KEYWORD.test(s));
}

/** 递归收集 `docs/src/**` 下的源码文件（排除测试件与 vendor） */
function collectSourceFiles(dir, acc = []) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === 'vendor' || n === '.tmp') continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) collectSourceFiles(f, acc);
    else if (/\.js$/.test(n) && !/\.test\.js$/.test(n)) acc.push(f);
  }
  return acc;
}

/** 候选 (file, msg) 是否已在台账登记（同 file 下同文案或互为子串） */
function isRegistered(file, msg) {
  for (const s of VALIDATION_SITES) {
    if (s.file !== file) continue;
    if (s.msg === msg || s.msg.includes(msg) || msg.includes(s.msg)) return true;
  }
  return false;
}

test('V1 漏登记增量检测：候选校验点不得新增未登记（`R-73` 第 ③ 缺 · 只降不升）', () => {
  const files = collectSourceFiles(join(ROOT, SRC));
  assert.ok(files.length >= 150, `只扫到 ${files.length} 个源文件（下限 150）：扫描面异常，断言可能恒真`);

  const unregistered = [];
  let total = 0;
  for (const abs of files) {
    const rel = relative(ROOT, abs).replace(/\\/g, '/');
    const lines = readFileSync(abs, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      for (const msg of candidatesInLine(line)) {
        total++;
        if (!isRegistered(rel, msg)) unregistered.push(`${rel} :: ${msg}`);
      }
    }
  }

  // 非空转：判据必须真扫到东西（否则「全登记」是假的）
  assert.ok(total >= 100, `候选点只扫到 ${total} 处（下限 100）：判据正则失效，断言退化`);

  const base = new Set(UNREGISTERED_BASELINE);
  const newOnes = unregistered.filter((u) => !base.has(u));
  assert.deepEqual(
    newOnes,
    [],
    `以下「字段级必填校验点」未登记进 form-loop-registry.mjs（新写校验点必须同批登记）：\n  ${newOnes.join('\n  ')}`,
  );

  // 防僵尸：已登记但基线未下调 ⇒ 红灯（强制清单随修随减）
  const cur = new Set(unregistered);
  const stale = [...base].filter((b) => !cur.has(b));
  assert.deepEqual(
    stale,
    [],
    `以下候选已登记进台账、但 UNREGISTERED_BASELINE 未下调——请下调基线：\n  ${stale.join('\n  ')}`,
  );

  console.log(`[漏登记检测] 候选 ${total} 处 · 未登记 ${unregistered.length} 处（基线 ${base.size}）`);
});
