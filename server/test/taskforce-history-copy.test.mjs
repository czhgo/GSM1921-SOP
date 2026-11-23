import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('旧工作量展示明确标为历史分工并与结构化任务产出分开', () => {
  const source = readFileSync(new URL('../../docs/src/entries/tabs/org/taskforce-tab.js', import.meta.url), 'utf8');
  assert.match(source, /历史分工记录/);
  assert.match(source, /不自动迁移/);
  assert.match(source, /工作产出/);
});

test('专班成员的新产出进入结构化产出接口，历史贡献字段只读保留', () => {
  const source = readFileSync(new URL('../../docs/src/components/record/taskforce-view.js', import.meta.url), 'utf8');
  assert.match(source, /历史分工记录/);
  assert.match(source, /createWorkgroupOutput/);
  assert.doesNotMatch(source, /TaskForceRecordStore\.addContributions/);
});

test('专班详情五块折叠区（成员与授权 / 任务与产出 / 贡献核验 / 报名与记录 / 收尾与复盘），右侧抽屉浮出并标 aria-current', () => {
  const source = readFileSync(new URL('../../docs/src/entries/tabs/org/taskforce-tab.js', import.meta.url), 'utf8');
  // 六段内容收敛为五块折叠区（2026-11-01 Task 6 页签密度收敛；历史分工 + 核验与代录合并为「贡献核验」）
  for (const label of ['成员与授权', '任务与产出', '贡献核验', '报名与记录', '收尾与复盘']) {
    assert.match(source, new RegExp(`label: '${label}'`), `缺少分区：${label}`);
  }
  // 五块折叠区各带可访问名称（标题 h3 与 summary 均用 aria-labelledby 关联同一 id）
  for (const id of ['tf-section-roles', 'tf-section-tasks', 'tf-section-contrib', 'tf-section-records', 'tf-section-close']) {
    assert.match(source, new RegExp(`id: '${id}'`), `缺少折叠区 ${id}`);
  }
  assert.match(source, /aria-labelledby="\$\{id\}"/, '标题与 summary 须用 aria-labelledby 关联折叠区标题');
  // 贡献核验仅运行中显示（历史分工 / 逐条核验 / 代录三容器不撤，_refreshTfBlock 仍按 id 刷新）
  assert.match(source, /id: 'tf-section-contrib'[\s\S]{0,80}when: tf\.status === 'active'/);
  assert.match(source, /sectionHead = \(id, label\) => `<h3[^>]*text-base/, '分区标题须为 16px h3');
  // 默认只展开「成员与授权」「任务与产出」两段
  assert.equal((source.match(/open: true/g) || []).length, 2, '默认应只展开前两段');
  // 触点即落点：被点卡片 aria-current；详情改为右侧抽屉（不再是列表末尾的常驻卡）
  assert.match(source, /setAttribute\('aria-current', 'true'\)/);
  assert.match(source, /<aside id="tf-detail-panel" hidden role="dialog"/, '详情须为默认隐藏的右侧抽屉');
  assert.match(source, /id="tf-detail-close"/, '抽屉须有关闭入口');
  assert.match(source, /_closeTfDetail/, '抽屉须有关闭实现（关闭按钮 / 遮罩 / Esc）');
  // 九个分块刷新容器逐一保留（不得因分区合并而丢 id；id 由 blocks 数组传入折叠区模板）
  for (const id of ['roles', 'tasks', 'work', 'verify', 'contrib', 'signup', 'subs', 'progress', 'review']) {
    assert.ok(source.includes(`'tf-sec-${id}'`) && source.includes('id="${blockId}"'), `缺少分块容器 tf-sec-${id}`);
  }
});

test('顶层区块收敛到 4：清单卡（一卡两视图 + 卡头筛选）→ 详情抽屉 → 赋权折叠', () => {
  const source = readFileSync(new URL('../../docs/src/entries/tabs/org/taskforce-tab.js', import.meta.url), 'utf8');
  // 看板与报名总表同处一张「专班清单」卡（两视图互斥显隐，不再各占一块）
  const listCard = source.indexOf('id="org-tf-list-card"');
  const kanban = source.indexOf('id="org-tf-kanban"');
  const matrix = source.indexOf('id="org-tf-matrix-area"');
  assert.ok(listCard >= 0 && kanban > listCard && matrix > kanban, '看板与报名总表须同处「专班清单」卡');
  // 筛选条挂卡头（位于清单卡之内、看板之前），不再平级占一块
  const searchBar = source.indexOf('id="org-tf-search-bar"');
  assert.ok(searchBar > listCard && searchBar < kanban, '筛选条须挂在清单卡头（卡内、看板之前）');
  // 详情默认隐藏、点卡片后浮出；赋权记录改为折叠置后
  assert.match(source, /<aside id="tf-detail-panel" hidden/, '详情面板须默认隐藏（不得常驻一块）');
  assert.match(source, /<details id="tf-auth-block"[^>]*>[\s\S]*?id="tf-auth-host"/, '赋权记录须折叠为 details 并保留宿主');
  // 转置开关仍在报名总表视图内
  assert.match(source, /id="org-tf-mode-btns"/);
  assert.match(source, /data-mode-toggle/);
});
