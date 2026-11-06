// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  notice-deeplink-guard.test.mjs — 通知与深链 navTarget 守卫
//  IA 修复 Task 3（F01–F07 / F12 · 2026-10-20）
//
//  根因：工作台壳（components/shell/workspace-shell.js）在首个渲染前把 `?tab=` / `?highlight=`
//  读进 `_navTarget` 并**清掉 URL 参数**，再经 `ctx.navTarget` 下发给 tab。tab 内再读
//  `location.search` 永远为空 ⇒ 通知深链失效（F01/F02/F03/F07 同一根因）。
//
//  本件锁死：
//    · F01 党委 review 深链必须读 `ctx.navTarget.hl`，定位失败页内可见提示；
//    · F02 思想汇报改落独立详情页 `thought-report.html?id=`（不再有 tab=thought-review 深链）；
//    · F03 成员变更通知的 highlight 有 DOM 锚点（data-mc-request-id）且待办壳消费 navTarget；
//    · F04 成员变更通知只发支书/副支书（audience + actionRoles）；
//    · F05 作废裁决按接收人角色生成本位工作台落点；
//    · F06 `targetType+targetId` 优先、`targetUrl` 仅兜底（模板头注与消费端同源）；
//    · F07 只有 `workspace/*.html` 拼 `tab=todo`，`index.html` 不带 tab；待办页消费 highlight；
//    · F12 跨台落点按接收人角色生成，不得保留其他角色台的写死落点。
//
//  运行：node --test test/notice-deeplink-guard.test.mjs（server 目录）
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { buildSystemNotice, SYSTEM_NOTICE_KIND_NAMES } from '../../docs/src/core/domain/system-notice-templates.js?v=20261102b';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');

const TEMPLATES = read('docs/src/core/domain/system-notice-templates.js');
const REVIEW_TAB = read('docs/src/entries/tabs/party-committee/review-tab.js');
const TODO_SHELL = read('docs/src/components/record/todo-tab-shell.js');
const NOTICE_SVC = read('docs/src/services/governance/notice.js');
const NOTICE_VIEW = read('docs/src/components/governance/notice-view.js');
const NOTICE_ENTRY = read('docs/src/entries/pages/notice-entry.js');
const HEADER = read('docs/src/components/shell/header.js');
const ARCHIVE_ENTRY = read('docs/src/entries/pages/archive-entry.js');
const TODO_JUMP = read('docs/src/components/record/todo-jump.js');
const TODAY_TAB = read('docs/src/entries/tabs/today/today-tab.js');
const MEMBER_PANEL = read('docs/src/components/governance/member-change-panel.js');
const AUTH = read('docs/src/services/core/auth.js');

/** 去掉整行注释后的模板源码（F12 的角色页清单只看真实落点，不看注释里的历史值） */
const TEMPLATE_CODE = TEMPLATES.split('\n')
  .filter((line) => !line.trim().startsWith('//'))
  .join('\n');

/** 页面 → 能力注册文件名（targetUrl 的 tab 必须在该页能力注册内） */
const CAP_BY_PAGE = {
  'secretary.html': 'secretary-workspace.js',
  'org.html': 'org-workspace.js',
  'prop.html': 'prop-workspace.js',
  'disc.html': 'disc-workspace.js',
  'leader.html': 'leader-workspace.js',
  'visitor.html': 'visitor-workspace.js',
  'party-committee.html': 'party-committee-workspace.js',
};

// ── F01 / F02 / F03：壳清参后必须消费 ctx.navTarget.hl ─────────────
test('F01–F03 深链消费：review / todo 均读 ctx.navTarget.hl，失败可见', () => {
  // F01：党委 review tab —— URL 读取保留为兜底，但主通道必须是 navTarget
  assert.match(REVIEW_TAB, /navTarget\?\.hl/, 'review-tab 必须消费 ctx.navTarget.hl（壳已清 URL）');
  assert.match(REVIEW_TAB, /未找到该上报（可能已处理）/, 'review-tab 定位失败须页内可见提示');

  // F03/F07：待办壳 —— 同一根因，按 groupKey / 条目 id 定位，失败可见
  assert.match(TODO_SHELL, /navTarget\?\.hl/, 'todo-tab-shell 必须消费 ctx.navTarget.hl');
  assert.match(TODO_SHELL, /data-mc-request-id/, '待办壳须按成员变更申请 id 定位');
  assert.match(TODO_SHELL, /未找到该待办（可能已处理）/, '待办壳定位失败须页内可见提示');
  assert.match(MEMBER_PANEL, /data-mc-request-id="\$\{esc\(r\.id\)\}"/, '成员变更批量行须带 data-mc-request-id 锚点');

  // F02：思想汇报不再有 tab 内深链（单一承载面 = 详情页）
  assert.doesNotMatch(TEMPLATE_CODE, /tab=thought-review&highlight/, 'F02：思想汇报不得再落 tab=thought-review&highlight');

  // 模板里保留的 tab+highlight 深链，必须有对应消费断言（否则就是新的死链）
  if (/tab=review&highlight/.test(TEMPLATE_CODE)) {
    assert.match(REVIEW_TAB, /navTarget\?\.hl/, 'tab=review&highlight 必须由 review-tab 消费');
  }
  if (/tab=todo&highlight/.test(TEMPLATE_CODE)) {
    assert.match(TODO_SHELL, /navTarget\?\.hl/, 'tab=todo&highlight 必须由 todo-tab-shell 消费');
  }
});

// ── F02 / F12：每个静态 targetUrl 的页面与 tab 必须真实存在 ─────────
test('F02/F12 targetUrl 守卫：page 存在于 docs/，tab 存在于该角色能力注册', () => {
  const urls = [...TEMPLATES.matchAll(/targetUrl:\s*(`|')([^`']+)\1/g)].map((m) => m[2]);
  assert.ok(urls.length > 0, '至少应能解析出静态 targetUrl');
  for (const raw of urls) {
    const page = raw.split('?')[0];
    if (page.includes('${')) continue; // 页面本身动态生成（如 workspacePageOf 产物）
    assert.ok(existsSync(join(ROOT, 'docs', page)), `targetUrl 页面不存在：${page}`);
    const tab = (raw.match(/[?&]tab=([a-z-]+)/) || [])[1];
    if (!tab) continue;
    const capFile = CAP_BY_PAGE[page.split('/').pop()];
    assert.ok(capFile, `未登记 ${page} 的能力注册`);
    const cap = read('docs/src/capabilities', capFile);
    assert.match(cap, new RegExp(`id:\\s*'${tab}'`), `${page} 的能力注册没有 tab=${tab}`);
  }
});

// ── F06：targetType+targetId 优先，targetUrl 仅兜底；入口统一先落全貌页 ─────
test('F06 优先级与入口收口：非公告必须有坐标；所有通知入口先落 notice.html?id=', () => {
  assert.match(TEMPLATES, /targetType\+targetId 优先/, '模板文件头须声明优先契约');
  assert.match(TEMPLATES, /targetUrl.*兜底/, '模板文件头须声明 targetUrl 仅兜底');

  // Task 3（2026-10-25）：非公告（系统通知）必须有 targetType + targetId。
  // 期望更新：原 F06 只断言「有 targetUrl 时优先 targetType」，未要求每类系统通知都带坐标；
  //   现按消息对象模型逐 kind 构建，断言 kind='system' 且坐标齐全（缺坐标者写入侧会降级为公告）。
  const vars = {
    sourceId: 'obj-1', targetType: 'activity', targetId: 'obj-1', title: 't', content: 'c',
    personId: 'p-1', personName: '张三', activityTitle: '活动', activity: '活动',
    branchLabel: '支部', subject: '事项', submitterName: '李四', decision: 'confirmed',
    receiverRole: 'secretary', targetPage: 'workspace/visitor.html',
    removedPersonId: 'p-1', projectName: '项目', fromName: '甲', toName: '乙',
    actorRole: 'secretary', todoTitle: '待办', label: '记录', resource: 'activities',
  };
  for (const kind of SYSTEM_NOTICE_KIND_NAMES) {
    const n = buildSystemNotice(kind, vars);
    assert.equal(n.kind, 'system', `${kind} 的系统通知 kind 必须为 system`);
    assert.ok(n.targetType && n.targetId, `${kind} 的系统通知缺 targetType/targetId（非公告必须有坐标）`);
  }

  // Task 6（2026-10-25 批次 510）：`resolveNoticeUrl` 的页面级兜底与 direct 直跳已退役，且全仓无消费者
  //   ⇒ 导出本身就是死码（Q-14）。坐标优先契约改由「模板声明 + 详情页对象卡」承担。
  assert.doesNotMatch(NOTICE_SVC, /export function resolveNoticeUrl/,
    'Q-14：resolveNoticeUrl 已无消费者，不得再保留导出（页面级兜底随统一消息中心退役）');
  assert.match(NOTICE_ENTRY, /const type = n\.targetType;/, '消息详情页必须消费 targetType');
  assert.match(NOTICE_ENTRY, /const id = n\.targetId;/, '消息详情页必须消费 targetId');

  // Task 3：所有通知入口统一先落全貌页；direct 直跳与页面级兜底已退役。
  for (const [name, src] of [['header.js', HEADER], ['notice-view.js', NOTICE_VIEW]]) {
    assert.doesNotMatch(src, /resolveNoticeUrl\s*\(/, `${name} 不得再走通知 direct 直跳`);
    assert.doesNotMatch(src, /dest\.direct/, `${name} 不得再判 direct 分支`);
    assert.match(src, /notice\.html\?id=/, `${name} 的通知行必须以 notice.html?id= 为落点`);
  }
  // 铃铛 = 未读全量可滚动，不再按 DASHBOARD_LIMITS 裁剪（容器自行滚动）。
  assert.doesNotMatch(HEADER, /DASHBOARD_LIMITS\.notices/, 'header 不得再把铃铛列表裁到固定条数');
  assert.match(HEADER, /messages\.html\?filter=unread/, '铃铛底部「查看全部」应进消息中心未读');
  assert.doesNotMatch(ARCHIVE_ENTRY, /renderNoticeArchive/, '归档库不得再保留通知列表（第二入口）');
  assert.doesNotMatch(ARCHIVE_ENTRY, /resolveNoticeUrl/, '归档库不得再解析通知落点');
  assert.match(TODO_JUMP, /resolveDocumentUrl\('notice\.html'/, '通知类待办必须回消息详情');
  assert.match(TODAY_TAB, /resolveDocumentUrl\('notice\.html'/, '今天页未读通知必须回消息详情');
  assert.doesNotMatch(TODAY_TAB, /resolveNoticeUrl\s*\(/, '今天页不得再走通知 direct 直跳');
  assert.doesNotMatch(TODAY_TAB, /NoticeStore\.markRead\(noticeId\)/, '今天页不得在导航前预写已读');

  // 不得再出现「写了 targetUrl 却永不生效」的死链
  assert.doesNotMatch(TEMPLATE_CODE, /targetUrl:\s*'workspace\/leader\.html'/, 'F06：targetType 在前的模板不得再写死 leader 台');
  assert.doesNotMatch(TEMPLATE_CODE, /targetUrl:\s*'workspace\/secretary\.html\?tab=work-map'/, 'F06：activity 类型的 targetUrl 永不生效');
  assert.doesNotMatch(TEMPLATE_CODE, /targetUrl:\s*'workspace\/visitor\.html'/, 'F06：activity/taskforce 类型的固定 visitor 台死链');
});

// ── F04：成员变更通知只发支书/副支书 ────────────────────────────────
test('F04 成员变更通知：audience + actionRoles 均锁定支书/副支书，不广播', () => {
  const n = buildSystemNotice('member-change-approved', {
    sourceId: 'mcr-1', personName: '张三', fromStage: '积极分子', toStage: '发展对象', activityTitle: '支委会',
  });
  assert.deepEqual(n.audience, ['secretary', 'deputy-secretary'], '受众只能是支书/副支书');
  assert.deepEqual(n.actionRoles, ['secretary', 'deputy-secretary'], '行动角色只能是支书/副支书');
  assert.equal(n.actionable, undefined, '不设 actionable（确认动作在待办组，不重复派生阅读待办）');
  assert.match(TEMPLATES, /'member-change-approved':[\s\S]*?audience: SECRETARY_AND_DEPUTY_ROLES/);
  assert.match(TEMPLATES, /'member-change-approved':[\s\S]*?actionRoles: SECRETARY_AND_DEPUTY_ROLES/);
});

// ── F05：作废裁决按接收人角色落本位工作台 ───────────────────────────
test('F05 作废裁决落点：按接收人角色生成本位工作台（不再固定支书台）', () => {
  const cases = [
    ['secretary', 'workspace/secretary.html?tab=todo'],
    ['deputy-secretary', 'workspace/secretary.html?tab=todo'],
    ['org-commissioner', 'workspace/org.html?tab=todo'],
    ['prop-commissioner', 'workspace/prop.html?tab=todo'],
    ['disc-commissioner', 'workspace/disc.html?tab=todo'],
    ['leader', 'workspace/leader.html?tab=todo'],
    ['visitor', 'workspace/visitor.html?tab=todo'],
  ];
  for (const [role, url] of cases) {
    const n = buildSystemNotice('todo-void-decided', {
      sourceId: 'todo-1', todoTitle: '待办', decision: 'confirmed', reason: '重复派生', role,
    });
    assert.equal(n.targetUrl, url, `${role} 的裁决知会应落本位工作台`);
  }
  // 无角色信息时兜底支书台（不产生非法 URL）
  const fallback = buildSystemNotice('todo-void-decided', {
    sourceId: 'todo-2', todoTitle: '待办', decision: 'rejected', reason: '',
  });
  assert.equal(fallback.targetUrl, 'workspace/secretary.html?tab=todo', '无角色信息时兜底支书台');
});

// ── F07：只有 workspace/*.html 拼 tab=todo；待办壳消费 highlight ─────
test('F07 待办深链：workspace/* 才拼 tab=todo，index.html 不带 tab；highlight 有消费', () => {
  assert.match(TODO_SHELL, /page\.startsWith\('workspace\/'\)/, '催办落点须按 workspace 前缀分流');
  assert.doesNotMatch(TODO_SHELL, /\$\{page\}\?tab=todo&highlight=/, '不得对所有页面统一拼 tab=todo（index.html 会成假深链）');
  assert.match(TODO_SHELL, /_resolveNavHighlightId/, '待办壳须有 highlight 读取实现');
  assert.match(TODO_SHELL, /navTarget\?\.hl/, '读取必须优先 ctx.navTarget.hl');
});

// ── F12：跨台落点按接收人角色生成 ──────────────────────────────────
test('F12 跨台落点：不得保留其他角色台的写死 URL；动态落点按接收人角色派生', () => {
  const rolePages = [...TEMPLATE_CODE.matchAll(/workspace\/([a-z-]+)\.html/g)].map((m) => m[1]);
  // 允许保留的只有「受众/动作角色本身就是该页角色」或「无角色信息时的支书台兜底」
  const allowed = new Set(['secretary', 'visitor', 'party-committee']);
  for (const page of rolePages) {
    assert.ok(allowed.has(page), `未按角色收口的跨台落点：workspace/${page}.html`);
  }
  // 外部外发：按 receiverRole 生成；作废裁决：按 targetRole 生成
  assert.match(TEMPLATES, /workspacePageOf\(receiverRole\)/, '外发通知落点须按接收人角色生成');
  assert.match(TEMPLATES, /workspacePageOf\(targetRole\)/, '作废裁决落点须按接收人角色生成');
  // 赋权通知：接收人本位页由 ROLE_PAGE_MAP 派生（不再「非组长一律 visitor」）
  assert.match(AUTH, /ROLE_PAGE_MAP\.workspace\[person\?\.role\]/, '赋权通知落点须按接收人角色派生');
  // 补课提醒：当事人角色本位（成员台仍落「考勤概况」，其他角色不弹回）
  const makeupMember = buildSystemNotice('makeup-remind', {
    sourceId: 'mk-1', personId: '2400012347', activityName: '活动', deadline: '2026-10-30', role: 'participant',
  });
  assert.equal(makeupMember.targetUrl, 'workspace/visitor.html?tab=attendance', '成员补课落考勤概况');
  const makeupSecretary = buildSystemNotice('makeup-remind', {
    sourceId: 'mk-2', personId: '2300010001', activityName: '活动', deadline: '2026-10-30', role: 'secretary',
  });
  assert.equal(makeupSecretary.targetUrl, 'workspace/secretary.html', '其他角色落本台，不弹回成员台');
});
