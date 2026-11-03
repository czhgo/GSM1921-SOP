---
title: "设计系统 · 第六编 布局与密度"
type: design
role: "[工程师]+[AI]"
last_updated: 2026-11-02
status: active
related_files: [DS_01_COLOR_AND_THEME.md, DS_02_TYPE_AND_SIZE.md, DS_03_COMPONENTS.md, DS_04_INTERACTION_AND_RESPONSIVE.md, DS_05_MAP_AND_REFERENCE.md, DESIGN_SYSTEM.md, ../PRODUCT_IA.md, ../../../docs/src/styles.css, ../../05_ai_coding/TAB_AUDIT_PLAYBOOK.md]
---

# 第六编 布局与密度

> **回答什么问题**：一个页面应该分成几块、筛选条最多几行、输入框里该不该出现系统自带的建议箭头；以及判断「这块能不能减」的审查方法。
> **不回答什么**：颜色怎么选 → [DS_01_COLOR_AND_THEME.md](DS_01_COLOR_AND_THEME.md)；字号与容器宽度 → [DS_02_TYPE_AND_SIZE.md](DS_02_TYPE_AND_SIZE.md)；组件外观与交互态 → [DS_03_COMPONENTS.md](DS_03_COMPONENTS.md)、[DS_04_INTERACTION_AND_RESPONSIVE.md](DS_04_INTERACTION_AND_RESPONSIVE.md)；判例 → [CASES.md](CASES.md)。
> **谁什么时候读**：[工程师]+[AI]；新增页签、合并区块、改筛选条、加自动补全之前读本篇；审查页面「块太多 / 太散」时按 §三 的流程走。

## 一、设计原则

> 本批十条是产品语言，不是排版口诀。每条先写「为什么」，判据见 §二 的三条规范。

1. **一页只回答一个主问。** 用户点开一个页签，是为了解决一个具体问题（今天要做什么、这批材料归档了没有）。如果一个页面同时回答三个问题，用户就得先替系统做一次分类——这次分类不该由用户承担。
2. **首屏 ≤4 块。** 首屏是用户唯一会完整看一眼的地方。超过四块，视线要来回跳，主对象与下一步被挤到折叠线以下；四块是「一眼能数清」的上限，不是美观偏好。
3. **同一批数据只出现一次。** 同一组数字、同一张表在两个块里各画一遍，用户会先怀疑哪一个是真的，再花时间对账。重复展示不会增加信息，只会增加校验成本。
4. **选择器不单独成块。** 「先选一个党小组 / 先选一个专班」是进入对象的前置动作，不是页面的内容。它应贴在对象列表旁或对象详情里；独立成卡会把一次选择放大成一块内容。
5. **筛选条 ≤2 行。** 筛选是通往结果的工具，不是结果本身。行数超过两行，筛选条就会在首屏占据与主对象同等的体积；两行的容量已经足够容纳「范围 / 时间 ＋ 搜索」与「分面 ＋ 清除」。
6. **折叠只给低频。** 折叠是「需要时再打开」，不是「重要内容先藏起来」。高频动作、主对象、待办与异常不进折叠；低频查阅（历史、模板、说明）才折叠，且折叠头要写清里面是什么。
7. **原生控件要检查系统装饰。** 原生控件会带入浏览器自己的装饰（如下拉三角、日期图标、浏览器的建议箭头）。这些装饰不受设计系统控制，往往与页面语言冲突；用之前先看它多画了什么，多出来的要么收编，要么换自建承载。
8. **合并先问三句。** 看到两块内容，先问：能否并入现有块、别处是否已有单一入口、删掉会丢哪个动作。三句问完仍无法合并，才是真的需要两块；不问就合并会丢写口，不问就保留会积块。
9. **移动端是降级不是复制。** 390 不是把 1440 的四块压窄，而是保留主对象与主操作、把次级内容转成可展开的次要走法。复制布局会把桌面的密度问题原样带到窄屏。
10. **每加一块先写它替代了哪一块。** 新增区块必须能说出「它替掉了原来的哪一块、或合并了哪两块」。说不出来，就是净增一块；页面块数只应因合并而下降，不因「再加一个卡更清楚」而上升。

## 二、规范

### SD-57 页签密度

| 项 | 内容 |
|---|---|
| 对象 | 全部注册页签（7 台 × 45 页签） |
| 判据 | 单页顶层区块 ≤ **4**（页头不计）；同类同源的内容必须合并进同一块；空态与列表二选一，不得同时作为两块常驻 |
| 守卫 | `ui-first-screen-order::F6–F9`（基线 `style-baseline.mjs::TAB_BLOCK_BASELINE`，上限 `TAB_BLOCK_LIMIT = 4`） |
| 登记 | 块数 > 4 的页签必须在 `TAB_BLOCK_BASELINE` 的 `reason` 写明「为什么不能合并」；未登记即红 |

> **口径**：「顶层区块」＝用户能看见的独立内容块（页头之外），条件块按结构计、在 `reason` 里注明。页头（页签名 / 范围 / 主操作）不计入四块。合并优先于新增：两块同源数据先合成一块的两种视图，而不是并排两块。

### SD-58 筛选条两行

| 项 | 内容 |
|---|---|
| 对象 | `.lf-bar` 及其全部使用页 |
| 判据 | `.lf-bar` 不得为 `flex-direction: column`；第 1 行放「范围 / 时间 ＋ 搜索」，第 2 行放「分面 ＋ 清除」；清除不得 `flex-basis: 100%` 独占一行；视图切换（月 / 周 / 日 / 列表等）归页头，不进筛选条 |
| 守卫 | `filter-row::S14`（结构：非 column、行内承载、清除不整行，含反例）＋ `filter-row::S15`（四页真机 1440 读数 ≤2 行 / ≤96px，读 `.ctx/evidence/2026-11-01/batch525-filter.json`） |

> **口径**：两行是上限，不是必须凑满两行；一页只有一个筛选条，多个筛选条先合并再谈行数。390 下允许控件换行，但整条仍以两行结构组织，不得每控件一行。

### SD-59 建议输入无系统图标

| 项 | 内容 |
|---|---|
| 对象 | 搜索框与关键词自动补全（`suggestInput` 及全部调用点） |
| 判据 | 建议由自建下拉承载，输入框内不得出现浏览器原生三角 / picker；`docs/src/**` 中 `list="` 与 `<datalist` 计数为 **0**；建议输入必须带 `role="combobox"` ＋ `aria-expanded` / `aria-controls` / `aria-activedescendant`，候选列表为 `listbox` |
| 守卫 | `field-shell-guard::R4`（原生 `list` / `<datalist>` 清零，含反例与 `data-*-list` 负例）＋ `field-shell-guard::R5`（`suggestInput` 产物 ARIA 齐备、无 `list` 属性，含无 ARIA 反例） |

> **口径**：原生 `<datalist>` 与 `list` 属性会引入浏览器自己的建议箭头，且样式不可控；改用 `components/ui/form-field.js::suggestInput`。自建下拉只承载建议，不改变输入框的焦点、边框与字号口径（见 DS_03 §12.1 / DS_04 §5.8）。

## 三、判定流程（怎么审）

1. **先列块清单。** 打开页面，只列用户能看见的独立顶层区块（页头之外），一块一行，不写实现细节。清单与 `TAB_BLOCK_BASELINE` 的 `blocks` 对齐。
2. **逐块问三句。** ① 能否并入现有块（同一对象 / 同一批数据 / 同一动作）？② 别处是否已有单一入口（合并后会不会出现第二个入口）？③ 删掉会丢哪个动作（写口 / 深链 / 只读查看）？
3. **做 ≤4 判定。** 三问后仍有 >4 块，先合并同类同源，再登记例外理由；不得为了「更清楚」再加一块。空态与列表同时常驻的，按「二选一」处理。
4. **例外登记。** 确实不能合并的（共享骨架、跨角色同构区、条件块），必须在 `TAB_BLOCK_BASELINE` 的 `reason` 写明结构与不可合并原因；理由为空即视为未登记。
5. **顺带核筛选条与建议输入。** 筛选条数段数与行数（>2 行判为问题）；输入框是否引入系统装饰（`list` / `<datalist>` / 原生 picker）。这两项按 SD-58 / SD-59 的守卫读数为准。

## 四、边界

- **不重排 41 个未超限页签。** 本编只约束「超过四块」与「新增块」，不要求把 ≤4 块的页面再改一遍；已有合并结果不因本编回退。
- **不改业务规则。** 块怎么合并、筛选条怎么排，不改变角色权限、写口、深链与数据口径；业务判据仍以 `content/02_institution`、`content/04_web_design/data/DATA_MODEL.md` 与代码为准。
- **不接管组件外观。** 颜色、字号、控件外观、交互态仍归 DS_01–DS_04；本编只回答「几块、几行、有没有系统装饰」。
- **判例不进本编。** 具体页面为什么这样合并，写入 `CASES.md` 并回链本编 SD 编号；本编只保留可判定的规范句。

## 五、审计映射表

> 本表把页签审计（`server/scripts/audit-tabs.mjs`）的检查项回链到规范编号与既有守卫。规范条文在 §二 与相关编；工具怎么跑见 `content/05_ai_coding/TAB_AUDIT_PLAYBOOK.md`。

| 检查项 | 判据要点 | SD 编号 | 守卫 / 脚本 |
|---|---|---|---|
| F1 顶层块数 | >4 必须登记理由；理由为空即红 | SD-57 | `ui-first-screen-order::F6–F9`、`TAB_BLOCK_BASELINE`、`audit-tabs::F1` |
| F2 筛选条 | 控件行数 ≤2；非 `column`；`reset` 不占整行 | SD-58 | `filter-row::S14–S15`、`audit-tabs::F2` |
| F3 输入装饰 | `list` / `<datalist>` 为 0；建议输入有 combobox ARIA | SD-59 | `field-shell-guard::R4–R5`、`audit-tabs::F3` |
| F4 标题层级 | 唯一 H2；H3 / H4 不跳级 | 非 SD：标题层级（`page-title-guard`） | `page-title-guard::P4–P6`、`a11y-tree`、`audit-tabs::F4` |
| F5 `section` 语义 | 有可访问名称；同页不嵌套 | SD-55 / SD-41 | `a11y-tree::A10`、`audit-tabs::F5` |
| F6 空态 | 空态文本应来自 `.empty-state` | 非 SD：空态（Q-12） | `copy-guard::E1–E2`、`audit-tabs::F6` |
| F7 窄屏与分页 | 390 无横向溢出；长列表有分页 | 非 SD：响应式（DS_04 / `page-sweep`） | `page-sweep`、`audit-tabs::F7` |
| F8 稳定性 | pageerror / 4xx 为 P0；仅 console.error 为 P1 | 非 SD：稳定性 | `module-load::E4`、`page-sweep`、`audit-tabs::F8` |
| D1 读口 | 2xx / JSON 可解析 / ≤500KB | 非 SD：数据 | `records-endpoints`、`audit-tabs::D1` |
| D2 计数对账 | UI 计数与接口数组长度一致 | 非 SD：数据 | `audit-tabs::D2` |
| D3 首屏 4xx | 首屏 `/api/v1/` 4xx 为 0 | 非 SD：数据 | `module-load::E4`、`audit-tabs::D3` |
| D4 绝对上限 | 单接口 p95 >100ms 或响应 >500KB 记 P2 | 非 SD：性能 | `audit/perf-baseline.mjs`、`audit-tabs::D4` |
| C1 读写权限 | 越权角色对写口 401 / 403 | 非 SD：权限 / CRUD | `permission-gate`、`r3-data-permission-regression`、`audit-tabs::C1` |
| C2 写往返 | 内存库 create → 回读 → PATCH → DELETE | 非 SD：CRUD | `form-loop-registry`、`audit-tabs::C2` |
| C3 死入口 | 页面写动作能映射到目录写口 | 非 SD：CRUD | `dead-selector-guard`、`audit-tabs::C3` |
| C4 写门 | 每个写口有 gate 且可静态定位 | 非 SD：CRUD / 权限 | `permission-gate`、`audit-tabs::C4` |
| E1 性能预算 | p95 / bytes 超预算比例记 P2 | 非 SD：性能 | `perf-guard`、`audit/perf-baseline.mjs`、`audit-tabs::E1` |
| M1 超限理由 | >4 块登记理由是否仍成立 | SD-57 | `TAB_BLOCK_BASELINE`、`audit-tabs::M1` |
| M2 重复卡头 | 同页相同 H3 ≥2 即红 | SD-57 | `page-title-guard`、`audit-tabs::M2` |
| M3 多条筛选条 | 同页 `.lf-bar` >1 即红 | SD-58 | `filter-row`、`audit-tabs::M3` |

> **口径**：F1 以 `TAB_BLOCK_BASELINE` 登记为准；DOM measured 仅复核，不因 measured ≠ baseline 判红（同构列表卡会因条件块显隐而变数）。审计目录自身的完整性（45 键 ≡ capabilities ≡ baseline）由 `workbench-audit-coverage::W1–W5` 守。
>
> **运行手册见 `content/05_ai_coding/TAB_AUDIT_PLAYBOOK.md`**（怎么跑、怎么判、怎么加检查与加页签）。
>
> **审计口径以 `content/05_ai_coding/AUDIT_CANON.md` 为准**（F2 / F4 / F7-D2 / C1 / F1 的唯一判据与 daily / precommit / audit 分工）。
