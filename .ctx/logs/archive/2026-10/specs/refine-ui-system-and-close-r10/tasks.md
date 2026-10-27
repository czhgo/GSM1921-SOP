# Tasks

> 实施顺序：先审查（只读）→ 组件层（控件/按钮/页签/今天页/披露）→ 反馈组件 → R10/拆表/文档 → 三次验证与提交。
> 除 Task 1 外，所有任务都必须先读 Task 1 的报告并按 P0/P1 清单施工。

- [x] Task 1: 前端「脏 / 乱 / 繁」审查（只读，产出报告）
  - [x] SubTask 1.1 用全部前端设计 skill 审查：`frontend-design`、`better-typography`、`better-colors`、`better-layout`、`better-ui`、`better-interface`、`better-accessibility`、`better-writing`、`design-with-taste`、`uicraft`、`web-design-guidelines`；逐项检查字体、字号、颜色、间距、圆角、控件、按钮、空态、密度、文案。
  - [x] SubTask 1.2 产出 `.ctx/logs/2026-10-AUDIT_UI_R11.md`：P0/P1/P2 分级，每条含 `file:line`、现象、为什么不合格、建议改法；附「繁」判定表（删什么 / 删后仍能完成什么）。
  - [x] SubTask 1.3 抽样复核 5 处（今天页指标带、待办行、页签条、通知发布表单、一个手写弹窗），把支书本轮 9 条反馈逐条对到具体代码位置。
  - [x] SubTask 1.4 把 spec 的 SD-1…SD-11 落成可断言清单（供 Task 12 守卫使用），并标注无法自动断言、只能真机抽检的条目。

- [x] Task 2: 控件层单源（CSS + 全量替换）
  - [x] SubTask 2.1 `docs/src/styles.css`：`.input-flat` 定为标准字段（38px/13px/8px/中性描边/金边 focus）；`.input-flat-sm` 补齐完整定义（32px/背景/描边/焦点/placeholder）；日期控件高度规则改为匹配所有 `.input-flat` 日期框。
  - [x] SubTask 2.2 全仓替换 ad-hoc 覆盖：删除控件上的 `text-sm`（5 处）、`rounded`（2 处）、无颜色 `border`；`person-picker-search` / `help-search-input` / `cs-search-input` 并入同一描边、8px 圆角与焦点环。
  - [x] SubTask 2.3 处理 `docs/*.html` 中 7 处例外（login/search/archive/branch-config/index/help）：能并入 `.input-flat` 的并入，不能的登记理由。
  - [x] SubTask 2.4 真机抽检：今天页、待办、通知发布、名册新增、一个手写弹窗；控件高度/描边/圆角/焦点一致，无黑边、无缺描边。

- [x] Task 3: 按钮「外围—内围」层级与尺寸
  - [x] SubTask 3.1 `styles.css`：按钮尺寸改为 36/32/28px（标准/紧凑/小号），与 38px 输入框同排的主行动允许 38px；补齐每个层级的 hover/focus/disabled（含 `.btn-accent-soft` 的 disabled）。
  - [x] SubTask 3.2 视觉层级：最外围＝`.btn-accent` 实底白字；内围＝`.btn-accent-soft` 浅主题底 + 深主题字 + 同色描边（背景不得为白/近白）；工具位＝`.btn-outline`（白底 + 中性描边 + 深灰字）；行内辅助＝`.btn-ghost` 无框文字。删除「主题色文字 + 白底」形态。
  - [x] SubTask 3.3 行内动作：列表行/卡片内的「去归档」「上传材料」等改为 28/32px，水平内边距 ≥10px、图标与文字间距 ≥6px；同一行最多一个浅底按钮，其余用描边或无框。
  - [x] SubTask 3.4 清理死代码：删除按钮上被 `!important` 覆盖的 `text-xs px-*/py-*`（至少覆盖本批触碰的组件）；保留 `!important` 归一作为兜底或改为无 `!important` 的单源规则（二选一并在报告中说明）。

- [x] Task 4: 页签分区标识
  - [x] SubTask 4.1 `components/shell/tab-bar.js`：为每个分组渲染可见组名（含首组），`groupLabel` 不再是空 span；分隔符与组名分开（组名可读，分隔线 `aria-hidden`）。
  - [x] SubTask 4.2 `styles.css`：组名使用 12px/中性 500、与页签同基线；组间 1px 分隔；≤1280px 隐藏组名、保留分隔；页签条不换行、不求横向溢出。
  - [x] SubTask 4.3 七个工作台逐一真机检查（secretary/org/prop/disc/leader/visitor/party-committee），确认首组也显示、末页签不被挤出；党委台单组场景有可见组名。

- [x] Task 5: 今天页与待办视觉基线
  - [x] SubTask 5.1 `styles.css`：`.metric-band` 改白底 + 中性描边 + 12px 圆角；item 与卡片同源圆角/间距；数值 24px/600、标签 12px/neutral-500；仅「逾期 > 0」用警示色。
  - [x] SubTask 5.2 `entries/tabs/today/today-tab.js`：字号收敛到 12/13/14/16；删除 `text-[11px]`（7 处）；组标题 14px、计数 13px、行标题 13px、meta 12px；空态与正常态共用同一标题行。
  - [x] SubTask 5.3 `components/record/todo-tab-shell.js` / `todo-list.js` / `list-row`：卡片标题 16px、段标题 14px、行标题 14px、meta 12px；待办行与今天页同间距。
  - [x] SubTask 5.4 真机对比：今天页有数据/空态两态、待办三组，截图核对字号/圆角/颜色一致，无 11px 文本。

- [x] Task 6: 披露控件（summary）统一
  - [x] SubTask 6.1 `styles.css`：全局 `summary { list-style:none }` + `::-webkit-details-marker{display:none}`；统一 chevron（可用 CSS 伪元素或既有图标），展开态旋转。
  - [x] SubTask 6.2 删除逐点 `list-none` / 去三角例外（`workgroup-member-editor.js:52` 等），确认 33 处全部落到统一规则。
  - [x] SubTask 6.3 真机抽检 8 处（通知、专班、档案、名册、人员档案、帮助、设置、弹窗字段组）：仅一个 chevron，键盘 Enter/Space 正常。

- [x] Task 7: 操作结果反馈可信（toast）
  - [x] SubTask 7.1 `core/session/pending-writes.js`：支持「按动作作用域」登记/等待（动作 id 或句柄），保留全局兜底但不再作为成功判据；失败记录按作用域保存，不得被别的动作取走。
  - [x] SubTask 7.2 `core/base/utils.js`：`showToast('success', …)` 改为接收本次动作的写结果；失败文案走 `describeWriteError`（401/403/408/409/5xx 分级）；error 用 `role="alert"`；toast 可关闭、悬停/聚焦暂停、同文案去重、最多 3 条；过渡态「保存中」被最终结果替换而非叠加。
  - [x] SubTask 7.3 修复已知反例：`entries/pages/activity-entry.js:657-660`（catch 后仍报成功）、`entries/pages/activity-materials-entry.js:281-282`、`services/governance/issues.js:513-523`、`entries/tabs/disc/review-tab.js:460-470`、`components/governance/person-edit-modal.js:422-426`、`entries/tabs/org/roster-tab.js:442-443`。
  - [x] SubTask 7.4 新增 `feedback-integrity.test.mjs`：A 失败/B 成功并发、catch 后成功、批量部分失败、成功后立即 reload 四类；断言只出现与动作对应的提示。

- [x] Task 8: 弹窗交互闭环
  - [x] SubTask 8.1 `components/ui/modal.js`：打开时锁 body 滚动、关闭恢复；焦点陷阱（Tab/Shift+Tab 循环）；提交中禁止 Esc/遮罩/×/取消并设 `aria-busy`；有未保存改动时关闭二次确认。
  - [x] SubTask 8.2 错误与契约：错误区 `role="alert"`；字段错误行 `role="alert"` + `aria-describedby`；用户修正后清 `aria-invalid`；`onSubmit` 返回 `undefined` 视为失败（或显式契约）；未知字段类型开发期报错；异常文案走 `describeWriteError`。
  - [x] SubTask 8.3 手写弹窗收口：`person-edit-modal.js`、`void-record.js`、`organizer-transfer.js`、`workgroup-member-editor.js`、`taskforce-tab.js` 统一提交中禁用与关闭策略；去除原生 `prompt()/confirm()`（`issue-detail.js:285`、`feedback-tab.js:659`、`disc/review-tab.js:481`）。
  - [x] SubTask 8.4 真机抽检：名册新增、通知发布、专班发起、人员编辑、删除确认五个弹窗；提交中关闭失败、焦点不逃逸、错误被播报。

- [x] Task 9: R10 P3 收口（文案与一致性）
  - [x] SubTask 9.1 逐条处理 R6 P3 21 条（依据 `.ctx/logs/2026-10-AUDIT_R6_FRONTEND.md` 与 Task 1 报告重钉行号）：指路句、title 括号解释、写作指导型 placeholder、低信息注释长尾、版本叙事注释。
  - [x] SubTask 9.2 逐条处理 R7 P3 仍存在 18 条：空值词表统一（`—` / 未填写 / 不适用）、快照语义 title、空列隐藏、角色集合单一源、演示数据一致性（专班 manager 等）。
  - [x] SubTask 9.3 `entries/pages/party-committee-meeting-entry.js` 9 处帮助注释迁到 `.help-note` 或帮助页（`159,185,215,216,259,338,383,452,510`）。
  - [x] SubTask 9.4 产出对账表：每条「编号 / 改前 file:line / 改法 / 改后 file:line / 是否改」；只改文案，不改行为。

- [x] Task 10: 拆表闸门（不切权威源）
  - [x] SubTask 10.1 服务端为 C2 埋点：记录「同一行 7 天内乐观锁 409」计数（表或持久化文件），提供只读查询；不得改变 409 语义。
  - [x] SubTask 10.2 影子稳定性历史：每日（或每次启动）记录 `compareShadowTables` 的 mismatch 与四写路径覆盖，保留 ≥7 天；C4 读历史而非只看当下。
  - [x] SubTask 10.3 `server/scripts/schema-split-readiness.mjs` 读取真实 C2/C4；输出 C1–C5 读数与近 7 天证据；`READY` 仍只在全真时出现；C5 仍读 `B-500-4`。
  - [x] SubTask 10.4 硬闸门：新增守卫断言「`NOT_READY` 时读路径必须走 JSON」；任何把 `agenda_items` / `taskforce_contributions` 提升为权威读的行为直接红。**本轮不切换权威源。**

- [x] Task 11: 治理文档卫生（CLAUDE 退出已完成项）
  - [x] SubTask 11.1 删除 8 条已完成条目：`B-500-3`、`B-500-10`、`B-502-7`、`B-503-1`、`B-503-3`、`B-503-4`、`B-503-7`、`B-504-2`。
  - [x] SubTask 11.2 `B-504-1`：先把判据正文归位到 `schema-split-readiness.mjs` 与 `DATA_MODEL.md:281`，再把 5 处外部引用（`server/db.js:728`、脚本头、`DATA_MODEL`、`.ctx/SNAPSHOT.md:93`、`README-server.md:1182`）改指脚本/模型文档，最后删行；`B-504-3` 的「待 `B-504-1`」改为「待脚本 READY」。
  - [x] SubTask 11.3 `B-503-2` 残项（多支部形态裁定 + P13 余项）迁到 `ENGINEERING_ASSESSMENT.md` 的 P13/专项台账后再删行。
  - [x] SubTask 11.4 不得删除：`B-500-4`（脚本锚点）、T-903（`WORKBENCH_67_TAB_AUDIT_DRAFT.md` 指针）、「评议待办 · 执行型」空表头（守卫锚点）。
  - [x] SubTask 11.5 同步 `TIMESTAMPS`、`CLAUDE.md` frontmatter；`doc-consistency` / `ctx-hygiene-guard` / `timestamps-note-guard` 全绿。

- [x] Task 12: 守卫、三次验证与交付
  - [x] SubTask 12.1 新增 `ui-control-system-guard.test.mjs`：SD-1/2/3/4/6/9/10 的静态断言（控件类白名单、无 `currentColor` 边框、圆角档、summary 全局规则、无「白底主题字」按钮、首组组名、无 10/11px）；登记 `test-tier-registry` 与 `test:daily`。
  - [x] SubTask 12.2 第 1 次（定向）：`ui-control-system-guard`、`feedback-integrity`、`form-loop-sweep`（限定相关 tab）、`page-sweep`（secretary/org/prop/visitor）、`data-lifecycle-guard`、`schema-split-shadow`、`doc-line-ref`、`doc-consistency`、`ctx-hygiene-guard`。
  - [x] SubTask 12.3 第 2 次：`npm run test:daily` 全绿。
  - [x] SubTask 12.4 第 3 次：`SWEEP_SHARD=all` 三通道 0 失败（红项只单跑失败文件诊断）。
  - [x] SubTask 12.5 版本戳 bump ＋ `version-stamp`；中文提交（不 push），提交信息含 Why / What / Verification / Boundaries。
  - [x] SubTask 12.6 更新执行日志（Why/What/Verification/Boundaries/sample-diff）与 `TIMESTAMPS`；把本轮 SD 规则写入 `DESIGN_SYSTEM.md` 的「组件层」一节。

# Task Dependencies

- Task 1 先行（只读）；Task 2–6 依赖 Task 1 的 P0/P1 清单。
- Task 3 依赖 Task 2（控件尺寸基准 38/32）；Task 5 依赖 Task 2/3（字号与控件同屏）。
- Task 6 与 Task 2–5 可并行（只动 summary/CSS）。
- Task 7 与 Task 8 可并行（不同模块），但都依赖 Task 2 的字段样式。
- Task 9 与 UI 任务可并行（只改文案）；Task 10 与 UI 任务可并行（服务端/脚本）。
- Task 11 依赖 Task 10（判据归位后删 `B-504-1`）与 Task 9（引用面收敛）。
- Task 12 最后，且**套件级运行只允许 3 次**；红项只单跑失败文件诊断。
