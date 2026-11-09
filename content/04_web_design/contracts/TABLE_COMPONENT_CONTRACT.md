---
title: "表格组件契约（data-table）"
type: contract
role: "[工程师]+[AI]"
created: 2026-11-10
last_updated: 2026-11-10
status: active
version: "1.0.0"
owner: "支书（契约裁决）；[工程师]+[AI]（维护）"
acceptance: "server/test/table-contract-guard.test.mjs 绿（T1–T7：契约字段 / 组件参数 / 宽表 colgroup / 手写表棘轮 / td 内 text-xs=0 / 390 无溢出 / 反例自证）"
related_files: [../design-system/DS_03_COMPONENTS.md, ../../../docs/src/components/ui/data-table.js, ../../../docs/src/styles.css]
---

# 表格组件契约（data-table）

> **本文负责**：`docs/src/components/ui/data-table.js::renderDataTable` 的**必须遵守项**——载体判据、列宽三档、行高与展开详情、横滚与首列吸附、列宽拖动、灰字分层，以及每一条的机检方式。
> **本文不负责**：① 载体选择四问与四类载体的完整条文 → [DS_03_COMPONENTS.md](../design-system/DS_03_COMPONENTS.md) §4.20；② 为什么这样定与反例 → `design-system/CASES.md`；③ 视觉档（字号 / 字重 / 行线 / 悬停）→ `docs/src/styles.css` 的 `.data-table` 段与 `DS_03` §4.23。

## 一、载体判据（先判载体，再判参数）

| 判定 | 布尔判据 | 采用载体 |
|---|---|---|
| 逐行对比 | **同列同语义 ≥ 3 行**（同一组字段、一行一个对象） | 数据表（本契约） |
| 少量异构 | 字段异构（每项字段不同、以整体阅读为主）且 **≤ 12 项** | 列表 / 卡片列表 |
| 两维交叉 | 单元格表达「这个人在这个实例上的状态」 | 关系矩阵（`relation-matrix.js`，不属本契约） |

- 行数 < 3 且字段同构：用一句话或 `<dl>`，不得为 2 行数据起一张表。
- 字段异构 > 12 项：先按 §4.20.1 四问重判，不得把异构对象硬塞进表格凑列。

## 二、列宽三档（只取一档）

| 档 | 声明方式 | 适用 | 必须 |
|---|---|---|---|
| ① 内容 auto | 不传 `columns` / 不传 `colgroup` | 列少、内容短（≤4 列且无长文本） | 不加 `table-layout: fixed` |
| ② 固定 colgroup | `columns: [{width}]`：数字＝百分比点数、`'92px'`＝像素、`'1fr'`＝余量列（每表最多一列） | 宽表 / 需要「余量不被末列吃掉」 | 必须产出 `<colgroup>`（余量列输出不带 width 的 `<col>`）且表格挂 `data-table--fixed` |
| ③ 最小 min-width | `scroll: { minWidth }` | 列宽按内容定宽、宽度不足时横滚 | 必须同时声明 `scroll` 与 `responsive` |

- **定宽列按实测内容宽给**：徽标 / 计数列必须容得下「内容宽 ＋ 左右内边距 24px」；用百分比会在 641–768px 把定宽列一起压窄，导致裁剪。
- **全表只许一列截断**：`columns[].truncate` 最多一列为 `true`；第二列声明即由组件抛错（不做静默让步）。该列必须同时是 `1fr` 余量列，截断样式为 `max-width:0 + text-overflow:ellipsis`（`.is-truncate`）。
- 列宽合计必须为 100%：组件对「全百分比」输入按合计归一，禁止把余量塞给末列；`1fr` 只用一列，两列即抛错。

## 三、行高与展开详情

- 数据行高 **40px**（`--row-table`），表头与数据行同式；紧凑档 `density: 'compact'` = 32px，只用于多行台账。
- **展开详情必须 `height: auto` ＋ `colspan` 插行**：`<tr class="dt-detail"><td colspan="N">…</td></tr>`。
- 详情不得塞进数据格内：单元格只放值、状态与动作（DS_03 §4.20.3-4）。
- 展开开关必须是原生可聚焦控件（`<button aria-expanded aria-controls>` 或 `<details><summary>`），不得用 `div` 模拟。

## 四、横向滚动、断点与首列吸附

- 宽表横滚单一出口：`scroll` ⇒ wrapper 挂 `.dt-scroll`（`overflow-x: auto`），页面主体不得横向溢出。
- **断点按容器**：`.dt-scroll` 声明 `container-type: inline-size`；同为 ≤640px 时 `min-width` 清零。
- `responsive: true` ⇒ `data-responsive="cards"`：≤640px 表体转「标签：值」卡片行，每个数据 `td` 必须带 `data-label`；打印时恢复表格形态。
- **≥ 5 列必须 `stickyFirstCol: true`**：横滚时首列常驻；card 形态下首列吸附与最小宽一并清零。
- 数字列必须 `numeric: true` ⇒ `.is-numeric`（右对齐 + `tabular-nums`），表头与单元格同标记。

## 五、列宽拖动

| 项 | 必须 |
|---|---|
| 生效视口 | **仅 ≥ 1024px**；390 不生效（不写 DOM、不读存储） |
| 拖动位 | 只允许**首列右分界**与**末列左分界**；中间列分界不得为拖动位 |
| 持久化 | `localStorage['table:cols:<key>']`，值为百分比数组（合计 100） |
| key | `colsKey`，缺省取 `stateKey`；二者皆无则不开拖动 |
| 结构前提 | 必须有 `columns`（即 `<colgroup>`）；无 colgroup 的表格不得开拖动 |
| 再分配 | 被拖列按位移增减，其余列按比例吃差额（合计恒定，表格不撑破容器） |

## 六、灰字分层（单元格内）

| 层 | 字号 | 字重 | 颜色 | 用途 |
|---|---|---|---|---|
| 主值 | 13px | 500 | `neutral-800` | 有值的单元格（日期、名称、计数） |
| 次值 | 12px | 400 | `neutral-500` | 第二层（时间、备注、来源） |
| 空值 | 12px | 400 | `neutral-400` | **只用于「—」** |
| 说明 | — | — | — | 只进卡头 `meta` 或提示条，不得进单元格 |

- 有值不得降为次值档（12px / 400 / `neutral-500`），空值不得升为主值档。
- 说明文字（排序规则、口径解释）只允许出现在卡头 `meta` 或表格外提示条；同一屏同一计数只出现一次。

## 七、验收（机检映射）

| 条款 | 检查 | 方式 |
|---|---|---|
| §一 载体判据、§二–§六 参数口径 | 契约字段 `type / status / version / owner / acceptance` 齐全，且正文含判据句 | `table-contract-guard::T1` |
| §二 / §四 / §五 | 组件导出并消费 `columns / density / stickyFirstCol / scroll / resizable`；产出 colgroup、`.is-numeric`、`table:cols:`、`min-width: 1024px` | `table-contract-guard::T2` |
| §二 固定 colgroup% | 列数 ≥5 的组件调用点必须声明 `columns` 或 `colgroupHtml` | `table-contract-guard::T3` |
| §一 表格单一出口 | 手写 `<table class="data-table">` 逐文件计数 **只减不增** | `table-contract-guard::T4` |
| §六 灰字分层 | `docs/src/**` 内 `<td>` 自身 class 含 `text-xs` 的数量为 **0** | `table-contract-guard::T5` |
| §四 390 无溢出 | `.dt-scroll` 有 `overflow-x:auto`；≤640px 复位 min-width 与 sticky；`scroll` 调用点必须同时 `responsive` | `table-contract-guard::T6` |
| 守卫自身不空转 | 合成反例（缺字段 / 6 列无 colgroup / td 带 text-xs / 手写表超基线）逐个判红 | `table-contract-guard::T7` |

> 实现落点：组件 `docs/src/components/ui/data-table.js`；结构样式 `docs/src/styles.css` 的「数据表结构档」段；首个采用页 `docs/src/entries/tabs/secretary/group-progress-tab.js`（活动台账）。
