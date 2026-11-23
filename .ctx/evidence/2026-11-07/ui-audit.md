# UI 全局审查证据（2026-11-07 批次 535）

> 范围：工作台 tab / 独立页的空间排布、字号、脏乱繁；只修 P1 明确违规，口味项不改。
> 覆盖：待办、设置、名册、考勤、纪检、个人档案、今天、通知、专班。
> 未覆盖：About 冻结件、help 文档页阅读版式、登录页大留白（见 C-4 / V-11）。

## 一、空间 / 版式

| # | 现象 | 证据 | 处置 |
|---|---|---|---|
| S1 | 卡头按钮组在宽度足够时整组掉行 | `styles.css` `.card-head` / `__aside` 原为 `flex-wrap:wrap`，标题无 `min-width:0` | **本批修**：SD-60 ＋ `.card-head` 基准 nowrap、标题伸缩、aside 不拆组；新增 `action-row-wrap-guard` |
| S2 | 待办第 4 张摘要卡多第三行算式 | `todo-tab-shell.js` 摘要卡 `.stat-card__note` | **本批修**：算式移入 `title`，卡内只留数值 / 标签两行 |
| S3 | 名册「在册状态」竖排、列宽随内容 | `roster-tab.js` 6 列无列宽模板 | **本批修**：`colgroup` ＋ `data-table--fixed` |
| S4 | 设置左栏导航文字居中 | `.btn-tab` 族 `justify-content:center` 后置覆盖 `.settings-group-item` | **本批修**：`.btn-tab.settings-group-item` 恢复标签居左 |
| S5 | 卡片 p-5 与 p-4 混用 | DS_03 §4.2：标准 20px / 紧凑 16px；DS_02 §3.2.2：页面主卡 p-5、内嵌面板 p-4 | **按角色判**：本批只改 P1 内嵌面板（`my-tasks-section.js` p-5→p-4）；全量重基数列入 C-4 |
| S6 | `TAB_BLOCK_BASELINE` 含页头 | `style-baseline.mjs` 注释 | **本批只校正注释口径**（`blocks-1 ≤ 4`）；全表重基数列入 C-4 |

## 二、字体 / 字号

| # | 现象 | 证据 | 处置 |
|---|---|---|---|
| T1 | 弹窗标题 12px，比正文 15px 小 | `styles.css` `.modal-title` 用 `--text-sm`（12px） | **本批修**：改 `--text-base`（14px） |
| T2 | 设置页导语 13px（档位表外） | `settings-entry.js` 14 处 `text-[13px] leading-relaxed` | **本批修**：改 `text-xs`（12px，说明句档） |
| T3 | 设置页列表标签 13px | 同上 2 处 `<span>` | **本批修**：改 `text-sm`（14px，列表项标题档） |
| T4 | 正文段仍 12px | `todo-tab.js`、`notification-tab.js`、`activity-entry.js`、`taskforce-tab.js` | **本批修**：改 `.text-body-sm`（13px） |
| T5 | 专班 h4 13px（档位表外） | `taskforce-tab.js` 8 处 | **本批修**：改 `text-sm`（14px） |
| T6 | 4 处 10px（禁止档） | `person-picker.css`、`styles.css` 角标、`header.js`、`notice-view.js` | **本批修**：改 11px（Overline 档） |
| T7 | `body 15px` | DS_02 §3.2.3 已在档位表内 | **不改**（不是差距） |
| T8 | `.btn-action` 12px | DS_03 §4.1.1 未规定该档字号 | **不改**（不是差距） |

## 三、脏 / 乱 / 繁

| # | 现象 | 证据 | 处置 |
|---|---|---|---|
| D1 | 零值 「确认 0 项」 | `member-change-panel.js` 批量按钮 | **本批修**：未选择时显示「未选择」 |
| D2 | 「共 0 篇」＋「暂无思想汇报」同屏 | `person-profile-sections.js` | **本批修**：计数为 0 时不显示计数 |
| D3 | 实现术语「写口 / 聚合口径」 | `member-change-panel.js`、`my-tasks-section.js` | **本批修**：改用户语言 |
| D4 | 个人档案两处「组织字段由…维护」 | `person-entry.js` 组织事实 / 在册状态 | **本批修**：只留一次 |
| D5 | 「自述缺 X 项」与「已填 X/Y」重复 | `person-entry.js` / `person-profile-sections.js` | **本批修**：只留「已填 X/Y」 |
| D6 | 党小组台账「党员 / 成员」两处 | `group-progress-tab.js` 列表卡 + 详情头 | **本批修**：只留列表卡 |
| D7 | 手写空态绕过 `emptyStateHtml` | `todo-tab.js`、`inspection-tab.js`、`attendance-tab.js` | **本批修**：统一走 `emptyStateHtml` |
| D8 | 名册行 3 个动作等权 | `roster-tab.js` | **本批修**：编辑 / 档案改中性描边，移出保留危险色；是否收进「更多」列入 C-4 |

## 四、守卫空白（本批补）

1. `action-row-wrap-guard`：卡头 nowrap / 标题伸缩 / aside 不拆组 / 按钮族 nowrap / `.lf-bar` 仍可折行。
2. `ctx-hygiene-guard`：热温冷层边界、温层 3–60 行、乙部 ≤18 行且无历史叙述、触发表指针存在。
3. `notice-audience-failclosed`：无受众系统通知不可读、匿名恒不可见、到人 / legacyUnscoped / 模板受众 / 策略三档。
