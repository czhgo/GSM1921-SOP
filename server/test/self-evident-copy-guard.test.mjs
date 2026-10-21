/**
 * 「此地无银三百两」守卫（2026-09-29 批次 294 立 · 支书评议裁定）
 *
 * 来源（支书逐字）：
 *   「此地无银三百两。你的显示、功能已经是最好的说明了。干嘛多此一举？
 *     你要全仓库检查 if the UI can tell itself, you needn't use the tedious expressions.」
 *
 * 判据：下表「自明句 / 机器话」在 `docs/src/**` **零命中**（棘轮：只许减不许增）。
 *   每条注明**为什么**——它们都在**替 UI 说话**（把界面本可自明的事再讲一遍）。
 *
 * ⚠ 入表门槛（防误伤）：只收**明确**的 tic（几乎只出现在用户可见文案里的成句）；
 *   泛词（如「注意」「说明」）**不入表**——它们大量出现在代码注释里，入表即误报。
 *   守卫只扫 `docs/src/**` 的源码文本（含注释），故入表词必须「注释里也不该出现」。
 *
 * ⚠ 非空转：本守卫自带反例自检（`_scan` 对植入样本必须命中）——防「正则写坏恒绿」。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', '..', 'docs', 'src');

/** 自明句 / 机器话黑名单（零容忍，只可增补理由，不可删） */
const BANNED = [
  { p: '你只会看到', why: '替界面解释可见性——界面本身就只显示该显示的' },
  { p: '无需调试器', why: '机器话；把给人看的页面说成调试工具' },
  { p: '此地无银', why: '自明还要强调自明' },
  { p: '一目了然', why: '替读者下结论' },
  { p: '显而易见', why: '替读者下结论' },
  { p: '顾名思义', why: '名字已自明，不必再解' },
  { p: '如你所见', why: '指着屏幕说话' },
  // 2026-10-21 R3 批次（逐条对应 UI_AUDIT_R3 的「此地无银」与冗余说明；完整口径在 help）
  { p: '随机令牌比对', why: 'R3-08：100 字令牌机制说明移 help，界面只需一句可执行提示' },
  { p: '开放中指派，可评论或提交处置结果', why: 'R3-08：段标题与按钮已表达，不需要再解释一遍' },
  { p: '等待支书确认', why: 'R3-17：同一摘要里「待支书确认：」已在前，尾部重复' },
  { p: '推荐填写', why: 'R3-18：星号与字段本身已表达，不用含糊的「推荐填写」' },
  { p: '仅「滞留」时填写', why: 'R3-18：用占位符教人何时填，属规则说明' },
  { p: '取消「只看我参与的」可查看支部全部专班', why: 'R3-15：筛选器就在同一行，空态不要教用户操作' },
  { p: '本人暂无参与或受权的专班', why: 'R3-15：「受权」非用户词，空态应直说真实状态' },
  { p: '发布专班后立即通知全体成员', why: 'R3-27：勾选框已表达，不需要再解释一次' },
  { p: '此提醒只给你本人看', why: 'R3-21：提交页无需解释可见性（阅读页已有本人标记）' },
  { p: '列＝最近 6 个专班', why: 'R3-14：hint 只留「最近 6 个」，不解释实现细节' },
  { p: '已报送支书确认，生效前保持现值', why: 'R3-17：40 字 pill title 讲路由，徽章已写状态' },
  { p: '提交即入库归档至个人档案；本页只收本人提交', why: 'R3-21：同页三次说归档，删到只剩必要提示' },
  { p: '完整记录在成员个人档案', why: 'R3-12：聚合页不冒充个人档案入口，改用真实落点' },
];

function walkJs(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkJs(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

/** 扫一段文本，返回命中项（供测试与反例自检共用） */
function _scan(text) {
  const hits = [];
  for (const { p, why } of BANNED) {
    if (text.includes(p)) hits.push(`${p}（${why}）`);
  }
  return hits;
}

test('Z1「此地无银」自明句零命中：docs/src 不得出现替 UI 说话的多余说明', () => {
  const problems = [];
  let scanned = 0;
  for (const f of walkJs(SRC)) {
    scanned++;
    const hits = _scan(readFileSync(f, 'utf8'));
    if (hits.length) problems.push(`${relative(join(__dirname, '..', '..'), f)} → ${hits.join(' / ')}`);
  }
  assert.ok(scanned >= 100, `只扫到 ${scanned} 个 js 文件（基线 100）：扫描面被改坏了`);
  assert.deepEqual(problems, [], `发现「此地无银」自明句（界面已自明 ⇒ 删掉该说明，勿替 UI 说话）：\n  ${problems.join('\n  ')}`);
});

test('Z2 非空转：黑名单匹配器对植入样本必须命中', () => {
  const planted = `const x = '这里你只会看到与本区相关的内容，无需调试器即可自查';`;
  const hits = _scan(planted);
  assert.ok(hits.length >= 2, `匹配器坏了（植入样本只命中 ${hits.length} 条）`);
});
