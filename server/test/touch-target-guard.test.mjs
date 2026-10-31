// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  touch-target-guard.test.mjs — 390 触控命中区 / 表单错误态 / 确认弹窗 Esc 守卫（P9 · 2026-10-31）
//
//  为什么在 daily 层：本文件不 import playwright（`test-tier-guard::T3` 要求 daily 纯 node）。
//  真机遍历由 `server/scripts/touch-target-audit.mjs`（Playwright）完成并写入
//  `.ctx/evidence/2026-10-31/touch-forms.json`；本守卫对该读数做**棘轮 + 结构 + 反例**断言：
//    T1 判定器非空转：40×40 假元素必须判红；44×44 不判红。
//    T2 六类控件的命中区扩展规则必须存在于 styles.css（视觉尺寸不变：只写伪元素 width/height）。
//    T3 证据读数：视觉尺寸改动前后一致；命中区达到各类最小值；不足 44 的必须有「相邻间距不足」说明。
//    T4 相邻热区不重叠：证据里 maxOverlap.pairs === 0。
//    T5 表单错误态：登录三态 + 设置向导三态都产出 aria-invalid + aria-describedby，错误贴字段。
//    T6 确认弹窗：Esc 可关、焦点回触发元素、Tab 焦点困在面板内、resolve(false)。
//    T7 <44×44 数量按棘轮基线只减不增，且六类控件不得回到 offender 名单。
//  运行：cd server; node --test test/touch-target-guard.test.mjs
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const STYLES = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8');
const EVIDENCE_FILE = join(ROOT, '.ctx', 'evidence', '2026-10-31', 'touch-forms.json');

/** 全站 390 可点元素命中区 <44×44 的棘轮基线（只降不升；下调时同批改本常量并在注释写新读数）
 *  2026-10-31 P9 首版实测：见 evidence.offenderCount。 */
const OFFENDER_BASELINE = 269;

/** 六类控件的命中区下限（不足 44 的必须带 constraint 说明，且不得低于该下限） */
const EXPECTED = {
  workbenchTab: { w: 44, h: 44 },
  // 空行日期格视觉 40 高 + 行距 2 ⇒ 相邻节距 42：按「不重叠」收窄到 42（有内容的 43.4 高格达 44）
  calendarDay: { w: 44, h: 42, constrained: true },
  calendarView: { w: 37, h: 44, constrained: true },
  todoMore: { w: 44, h: 44 },
  settingsAction: { w: 36, h: 42, constrained: true },
  helpToc: { w: 44, h: 44 },
};

/** 可达性判定：命中区是否达到 44×44（纯函数，供正 / 反例共用） */
export const isSmallHit = ({ hitW, hitH }) => !(hitW >= 44 && hitH >= 44);

/** 取 CSS 规则体（首个匹配） */
function ruleBody(css, selector) {
  const i = css.indexOf(selector);
  if (i === -1) return '';
  const open = css.indexOf('{', i);
  const close = css.indexOf('}', open);
  return open === -1 || close === -1 ? '' : css.slice(open + 1, close);
}

const EVIDENCE = existsSync(EVIDENCE_FILE) ? JSON.parse(readFileSync(EVIDENCE_FILE, 'utf8')) : null;

test('T1 判定器非空转：40×40 假元素必须判红，44×44 不得误伤', () => {
  // 反例：40×40 的假元素放进统计必须判红
  assert.equal(isSmallHit({ hitW: 40, hitH: 40 }), true, '反例未判红：40×40 必须算命中区不足');
  assert.equal(isSmallHit({ hitW: 43.9, hitH: 100 }), true, '单边不足 44 也必须判红');
  // 负例：达标不得误伤
  assert.equal(isSmallHit({ hitW: 44, hitH: 44 }), false, '44×44 不应被判红');
  assert.equal(isSmallHit({ hitW: 58, hitH: 44 }), false, '单边超出不应被判红');
});

test('T2 六类控件的命中区扩展规则存在，且只写伪元素尺寸（不改视觉）', () => {
  const cases = [
    ['.tab-btn::after', 44, 44],
    ['.cal-view-btn::after', 37, 44],
    ['.myws-row .btn-action::after', 36, 42],
  ];
  for (const [selector, w, h] of cases) {
    const body = ruleBody(STYLES, selector);
    assert.ok(body, `styles.css 缺少命中区规则 ${selector}`);
    assert.match(body, new RegExp(`width:\\s*max\\(100%,\\s*${w}px\\)`), `${selector} 命中宽应为 ${w}px`);
    assert.match(body, new RegExp(`height:\\s*max\\(100%,\\s*${h}px\\)`), `${selector} 命中高应为 ${h}px`);
    assert.match(body, /transform:\s*translate\(-50%,\s*-50%\)/, `${selector} 应居中扩展`);
    assert.doesNotMatch(body, /(?:^|[;\s])(?:width|height):\s*\d+px\s*;/, `${selector} 不得把视觉尺寸写死`);
  }
  // 日期格：宽 44；高按「不重叠」收窄（min(max(100%,44px), 100% + 2px)）
  const day = ruleBody(STYLES, '.cal-cell-mobile[data-date]::after');
  assert.match(day, /width:\s*max\(100%,\s*44px\)/, '日期格命中宽应为 44px');
  assert.match(day, /height:\s*min\(max\(100%,\s*44px\),\s*calc\(100%\s*\+\s*4px\)\)/,
    '日期格命中高应为 min(max(100%,44px), 100%+4px)（按相邻行距收窄，不重叠）');
  assert.match(day, /transform:\s*translate\(-50%,\s*-50%\)/, '日期格命中区应居中扩展');
  // 帮助目录：只在 ≤640 横排形态扩高（桌面纵向列表会与相邻项重叠）
  const media = STYLES.slice(STYLES.indexOf('@media (max-width: 640px) {'));
  assert.match(media, /\.help-toc-item::after\s*\{[\s\S]*?height:\s*max\(100%,\s*44px\)/,
    '≤640 下帮助目录项应扩到 44 高');
  // 待办「更多」由既有规则提供 44×44（本次只核验，不新增第二套）
  const more = ruleBody(STYLES, '.list-row__trailing .btn-sm::after');
  assert.match(more, /width:\s*max\(100%,\s*44px\)/, '待办「更多」命中宽应 ≥44（既有规则）');
  assert.match(more, /height:\s*max\(100%,\s*44px\)/, '待办「更多」命中高应 ≥44（既有规则）');
});

test('T3 证据读数：视觉尺寸前后一致、命中区达标；不足 44 必须有相邻间距说明', () => {
  assert.ok(EVIDENCE, `缺少真机证据文件：${EVIDENCE_FILE}（先跑 server/scripts/touch-target-audit.mjs）`);
  assert.equal(EVIDENCE.viewport.width, 390, '证据必须是 390 宽视口');
  assert.equal(EVIDENCE.date, '2026-10-31', '证据日期应为 2026-10-31');

  for (const [key, expected] of Object.entries(EXPECTED)) {
    const c = EVIDENCE.controls[key];
    assert.ok(c, `证据缺少控件类别 ${key}`);
    assert.ok(c.visualBefore && c.visualAfter, `${key} 缺少改动前后视觉尺寸`);
    assert.ok(Math.abs(c.visualBefore.w - c.visualAfter.w) <= 0.5,
      `${key} 视觉宽度变化 ${c.visualBefore.w} → ${c.visualAfter.w}（要求不变）`);
    assert.ok(Math.abs(c.visualBefore.h - c.visualAfter.h) <= 0.5,
      `${key} 视觉高度变化 ${c.visualBefore.h} → ${c.visualAfter.h}（要求不变）`);
    assert.ok(c.hit && c.hit.w >= expected.w && c.hit.h >= expected.h,
      `${key} 命中区 ${c.hit?.w}×${c.hit?.h} 未达下限 ${expected.w}×${expected.h}`);
    if (expected.constrained) {
      assert.ok(c.constraint && String(c.constraint).trim().length >= 8,
        `${key} 命中区不足 44，必须在证据里写明相邻间距不足的原因`);
      assert.ok(Number.isFinite(c.adjacentGap), `${key} 必须记录实测相邻间距`);
    }
  }
});

test('T4 相邻热区不重叠：各类别 2D 交集对数为 0', () => {
  assert.ok(EVIDENCE, '缺少真机证据文件');
  for (const key of Object.keys(EXPECTED)) {
    const c = EVIDENCE.controls[key];
    assert.ok(c?.maxOverlap, `${key} 缺少相邻重叠读数`);
    assert.equal(c.maxOverlap.pairs, 0,
      `${key} 相邻热区重叠 ${c.maxOverlap.pairs} 对（最大 ${c.maxOverlap.w}×${c.maxOverlap.h}）`);
  }
});

test('T5 表单错误态：登录三态 + 设置向导三态均产出 aria-invalid 与 aria-describedby', () => {
  assert.ok(EVIDENCE, '缺少真机证据文件');
  const forms = EVIDENCE.forms || {};
  for (const key of ['loginEmpty', 'loginWrong', 'loginNetwork']) {
    const f = forms[key];
    assert.ok(f && f.visible && f.message, `${key} 应显示就地错误文本`);
    assert.equal(f.errorNearFields, true, `${key} 错误文本应贴在字段附近`);
    assert.equal(f.studentId?.invalid, 'true', `${key} 学号应标 aria-invalid`);
    assert.equal(f.studentId?.describedby, 'login-error', `${key} 学号应指向 #login-error`);
    assert.equal(f.password?.invalid, 'true', `${key} 密码应标 aria-invalid`);
    assert.equal(f.password?.describedby, 'login-error', `${key} 密码应指向 #login-error`);
  }
  // 提交失败不丢已填内容
  assert.equal(forms.loginWrong?.studentId?.value, '2300010001', '口令错误后学号应保留');
  assert.equal(forms.loginWrong?.password?.value, 'wrong-pass', '口令错误后密码输入应保留');

  const empty = forms.settingsHeaderEmpty;
  assert.ok(empty && empty.visible && empty.message, '设置向导页眉为空应就地报错');
  assert.equal(empty.errorNearField, true, '设置向导错误应贴在页眉字段下方');
  assert.equal(empty.invalid, 'true', '设置向导页眉应标 aria-invalid');
  assert.equal(empty.describedby, 'wz-org-header-err', '设置向导页眉应指向就地错误文本');

  const ws = forms.settingsHeaderWhitespace;
  assert.ok(ws && ws.visible, '纯空格也应就地报错');
  assert.equal(ws.invalid, 'true', '纯空格态 aria-invalid 应为 true');
  assert.equal(ws.describedby, 'wz-org-header-err', '纯空格态 aria-describedby 应指向错误文本');

  const cleared = forms.settingsHeaderCleared;
  assert.equal(cleared?.invalid, null, '修正后应清除 aria-invalid');
  assert.equal(cleared?.describedby, null, '修正后应清除 aria-describedby');
  assert.equal(cleared?.value, '光华党支部', '修正后已填内容应保留');

  // 新建支部两处错误态（dev 模式党委组织员；真实 UI 点击触发，不写入）
  const missing = forms.settingsAppointMissing;
  assert.ok(missing && missing.visible && missing.message, '未选首任支书应就地报错');
  assert.equal(missing.invalid, 'true', '未选首任支书应标 aria-invalid');
  assert.equal(missing.describedby, 'wz-create-appoint-secretary-err', '错误应指向首任支书字段的错误文本');
  const conflict = forms.settingsAppointConflict;
  assert.ok(conflict && conflict.visible, '首任支书 = 组织委员应显示同人冲突错误');
  for (const side of ['sec', 'org']) {
    assert.equal(conflict[`${side}Invalid`], 'true', `同人冲突：${side} 应标 aria-invalid`);
    assert.equal(conflict[`${side}Describedby`], 'wz-create-appoint-conflict', `同人冲突：${side} 应指向冲突文本`);
  }
});

test('T6 确认弹窗：Esc 可关 + 焦点回触发元素 + Tab 焦点困在面板内 + resolve(false)', () => {
  assert.ok(EVIDENCE, '缺少真机证据文件');
  const m = EVIDENCE.modal || {};
  assert.equal(m.overlay, true, '确认弹窗应能打开');
  assert.equal(m.focusInPanel, true, '打开后焦点应在面板内');
  assert.equal(m.hasCloseBtn, false, '确认类弹窗不应渲染右上角 ×（只保留 Esc / 按钮）');
  assert.equal(m.tabTrapped, true, 'Tab 焦点应困在弹窗内');
  assert.equal(m.closedByEsc, true, 'Esc 应可关闭确认弹窗');
  assert.equal(m.focusReturned, true, '关闭后焦点应回到触发元素');
  assert.equal(m.resolveValue, false, 'Esc 取消应 resolve(false)，不得执行原动作');
});

test('T7 <44×44 数量只减不增，且六类控件不得回到 offender 名单', () => {
  assert.ok(EVIDENCE, '缺少真机证据文件');
  assert.ok(Number.isInteger(EVIDENCE.offenderCount), '证据缺少 offenderCount');
  assert.ok(EVIDENCE.offenderCount <= OFFENDER_BASELINE,
    `390 可点元素命中区 <44×44 由 ${OFFENDER_BASELINE} 升到 ${EVIDENCE.offenderCount}：新增控件必须带命中区扩展，棘轮只降不升`);
  assert.ok(EVIDENCE.offenderCount > 0, 'offender 统计为 0：遍历口径可能失效（非空转）');

  // 无相邻约束的三类：不得再回到 offender 名单
  for (const [re, label] of [
    [/tab-btn/, '工作台页签'],
    [/todo-more__btn/, '待办行更多'],
    [/help-toc-item/, '帮助目录'],
  ]) {
    const hit = EVIDENCE.offenders.filter((o) => re.test(o.selector) && (o.hitW < 44 || o.hitH < 44));
    assert.deepEqual(hit.map((o) => `${o.page} → ${o.selector} ${o.hitW}×${o.hitH}`), [],
      `${label} 不得回到 <44×44 offender 名单`);
  }

  // 受相邻间距约束的三类：允许仍在 offender 名单（<44），但不得低于证据里记录的下限
  const constrained = [
    [/cal-cell-mobile/, '日历日期格', 44, 42],
    [/cal-view-btn/, '日历视图切换', 37, 44],
    [/myws-row[\s\S]*btn-action|btn-action[\s\S]*myws-row/, '设置页行内动作', 36, 42],
  ];
  for (const [re, label, minW, minH] of constrained) {
    const bad = EVIDENCE.offenders.filter((o) => re.test(o.selector) && (o.hitW < minW || o.hitH < minH));
    assert.deepEqual(bad.map((o) => `${o.page} → ${o.selector} ${o.hitW}×${o.hitH}`), [],
      `${label} 的命中区不得低于已记录的相邻约束下限 ${minW}×${minH}`);
  }
});
