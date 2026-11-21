// role: [工程师]+[AI]
// form-field-guard.test.mjs — 表单字段「必填 / 报错 / 字段级可访问名」三件单一源（2026-11-21 批次 591 · SD-66 / SD-67）
//
// 判据来源：
//   · DS_03 §4.3「必填语义与字段级可访问名」（SD-66 必填语义 / SD-67 筛选行控件必有字段级可访问名）
//   · 判例 CASE-DESIGN-038 / 039（CASES.md）
//
// 检查面（4 条）：
//   T1 必填语义：required:true ⇒ 控件出 required ＋ aria-required="true"；标签星号 aria-hidden（三种字段同源）
//   T2 报错语义：错误行 role="alert" ＋ id="{id}-err"；控件 aria-invalid ＋ aria-describedby 关联
//   T3 字段级可访问名：布局中立控件经 ariaLabel 出 aria-label；考勤筛选行活动下拉必须带名字（不得只靠首项文本）
//   T4 反例自证：剥掉 a11y 属性后同一判据必须判假（守卫不是空转）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'docs', 'src');

const V = '?v=20261120a';
const { textField, textareaField, selectField, textInput, selectInput, labelHtml, errorHtml } =
  await import(`../../docs/src/components/ui/form-field.js${V}`);

/** 必填语义谓词（守卫判据本体；T1 / T4 共用，避免两套口径） */
function hasRequiredSemantics(html) {
  return /\srequired\b/.test(html) && /aria-required="true"/.test(html);
}

test('T1 必填语义：三种字段同源产出 required ＋ aria-required ＋ 星号 aria-hidden', () => {
  const opts = { id: 'f1', label: '姓名', options: [{ value: 'a', label: 'A' }] };
  const cases = {
    textField: textField({ ...opts, required: true }),
    textareaField: textareaField({ ...opts, required: true }),
    selectField: selectField({ ...opts, required: true }),
  };
  for (const [name, html] of Object.entries(cases)) {
    assert.ok(hasRequiredSemantics(html), `${name} 必填未输出 required / aria-required`);
    assert.match(html, /aria-hidden="true">\*</, `${name} 星号未标 aria-hidden`);
  }
  // 非必填不得误加
  assert.ok(!hasRequiredSemantics(textField({ id: 'f2', label: '可空' })), '非必填字段被加上必填语义');
  // 标签星号只在 required 时出现
  assert.ok(!/\*</.test(labelHtml({ id: 'f2', text: '可空' })), '非必填标签出现星号');
});

test('T2 报错语义：错误行 role=alert ＋ 控件 aria-invalid / aria-describedby 关联', () => {
  const err = errorHtml('f3', '请填写姓名');
  assert.match(err, /id="f3-err"/, '错误行缺 id');
  assert.match(err, /role="alert"/, '错误行缺 role=alert');
  for (const html of [
    textField({ id: 'f3', label: '姓名', error: '请填写姓名' }),
    textareaField({ id: 'f3', label: '说明', error: '请填写说明' }),
    selectField({ id: 'f3', label: '类型', error: '请选择类型', options: [] }),
  ]) {
    assert.match(html, /aria-invalid="true"/, '控件缺 aria-invalid');
    assert.match(html, /aria-describedby="f3-err"/, '控件未关联错误行');
    assert.match(html, /border-\[var\(--status-error\)\]/, '错误边未走状态令牌');
  }
});

test('T3 字段级可访问名：布局中立体经 ariaLabel 出 aria-label；考勤筛选行活动下拉带名字', () => {
  assert.match(textInput({ id: 'i1', ariaLabel: '活动筛选' }), /aria-label="活动筛选"/, 'textInput 未出 aria-label');
  assert.match(
    selectInput({ id: 's1', ariaLabel: '活动筛选', options: [{ value: '', label: '活动：全部' }] }),
    /aria-label="活动筛选"/,
    'selectInput 未出 aria-label',
  );
  const attendance = readFileSync(path.join(SRC, 'entries/tabs/disc/attendance-tab.js'), 'utf8');
  const block = attendance.slice(attendance.indexOf("id: 'att-activity-select'"), attendance.indexOf("id: 'att-activity-select'") + 260);
  assert.match(block, /ariaLabel:\s*'活动筛选'/, '考勤筛选行活动下拉缺字段级可访问名');
});

test('T4 反例自证：剥掉 a11y 属性后必填判据必须判假', () => {
  const good = textField({ id: 'f4', label: '姓名', required: true });
  assert.equal(hasRequiredSemantics(good), true);
  const stripped = good.replace(/\srequired\b/g, '').replace(/\saria-required="true"/g, '');
  assert.equal(hasRequiredSemantics(stripped), false, '剥掉 a11y 属性后判据仍为真 ⇒ 守卫空转');
  const badErr = errorHtml('f5', '错误').replace('role="alert"', '');
  assert.ok(!/role="alert"/.test(badErr), '错误行反例未被识别');
});
