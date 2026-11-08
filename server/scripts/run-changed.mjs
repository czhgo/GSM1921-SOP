// role: [工程师]+[AI]
// server/scripts/run-changed.mjs — 按改动面选跑（2026-11-08 批次 537）
//
//  改 `server/**`        → daily（结果门禁）
//  改 `docs/src/**` 等   → UI / 样式 / 文案守卫
//  改 `content/**`       → 文档 / 台账守卫
//  没有命中规则但有改动 → 回落 daily（宁可多跑结果门禁，不漏）
//
//  映射刻意保持简单：它不是完整依赖图，只回答「这次改动大概率碰坏了哪一类判据」。
//  用法：cd server && npm run test:changed
import { execFileSync } from 'node:child_process';
import { dailyFiles, guardsFiles } from '../test-tier-registry.mjs';
import { runTier } from './tier-runner.mjs';

const git = (args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', cwd: import.meta.dirname }).split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
};

const changed = [...new Set([...git(['diff', '--name-only', 'HEAD']), ...git(['ls-files', '--others', '--exclude-standard'])])];
if (!changed.length) {
  console.log('[changed] 无未提交改动；跑 daily 兜底');
  process.exit(await runTier('daily', dailyFiles));
}

const has = (prefix) => changed.some((f) => f.replace(/\\/g, '/').startsWith(prefix));

const UI_GUARD = /^(ui-|hex-|theme-|motion-|type-scale-|spacing-|density-|copy-|filter-row|page-title|link-|hover-state|touch-target|status-color|container-width|lf-bar|card-summary|nested-interaction|row-markup|responsive-cards|activity-tone|field-shell|loading-experience|no-underline|no-about|ux-guard|committee-.*density|person-picker-density|party-workbench-layout|work-overview-layers)/;
const DOC_GUARD = /^(doc-consistency|docs-governance|ctx-hygiene|claude-parallel-audit|about-freeze|data-lifecycle|demo-window|date-canon)/;

const picked = new Set();
if (has('server/')) dailyFiles.forEach((f) => picked.add(f));
if (has('docs/')) guardsFiles.filter((f) => UI_GUARD.test(f)).forEach((f) => picked.add(f));
if (has('content/')) guardsFiles.filter((f) => DOC_GUARD.test(f)).forEach((f) => picked.add(f));
if (!picked.size) dailyFiles.forEach((f) => picked.add(f));

const files = [...picked].filter((f) => dailyFiles.includes(f) || guardsFiles.includes(f));
console.log(`[changed] 改动 ${changed.length} 个文件 → 选中 ${files.length} 个测试`);
process.exit(await runTier('changed', files));
