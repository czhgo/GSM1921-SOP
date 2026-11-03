---
title: "设计系统目录索引（04/design-system/）"
type: index
role: "[工程师]+[AI]"
last_updated: 2026-11-01
status: active
---

# 设计系统目录索引（04/design-system/）

> 目录定位见 [DOC_MAP.md §五 目录作用表](../../03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立)。

## 作用

本目录回答**「界面长什么样、颜色与排版怎么定、组件与点击落点怎么用」**，是前端视觉与组件规范的权威入口。

## 不负责什么

- 不写数据模型与字段结构——归 [DATA_MODEL.md](../data/DATA_MODEL.md)。
- 不写页面模块的设计论证档案——归 `../module/`、`../evolution/`。
- 不写实现代码与令牌值来源——`docs/src/styles.css` 与组件是子本。
- 不写部署、认证与业务制度。

## 文件清单

| 文件 | 一句话作用 | 权威源？（是/指针） |
|------|-----------|-------------------|
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | 《设计系统》父索引：§零 阅读指南、§一 设计哲学、编目索引入口 | 是——哲学与编目的入口 |
| [DS_01_COLOR_AND_THEME.md](DS_01_COLOR_AND_THEME.md) | 第一编 色彩与主题：§二 色彩系统 ＋ §七 深色模式 | **是**——颜色的唯一权威 |
| [DS_02_TYPE_AND_SIZE.md](DS_02_TYPE_AND_SIZE.md) | 第二编 排版与尺寸：§三 排版系统 ＋ §3.4 栅格与容器档（P4） | **是**——字号与容器宽度的唯一权威 |
| [DS_03_COMPONENTS.md](DS_03_COMPONENTS.md) | 第三编 组件：§四 组件规范 ＋ §4.29 / §4.30 ＋ §十二 组件层执行口径（SD 编号） | **是**——组件与 SD 判据的唯一权威 |
| [DS_04_INTERACTION_AND_RESPONSIVE.md](DS_04_INTERACTION_AND_RESPONSIVE.md) | 第四编 交互与响应式：§五 交互反馈（含 §5.8 焦点总则）＋ §六 响应式 | **是**——交互态、焦点与窄屏的唯一权威 |
| [DS_05_MAP_AND_REFERENCE.md](DS_05_MAP_AND_REFERENCE.md) | 第五编 地图与速查：§八 资产清单 ＋ §九 快速参考 ＋ §十 点击落点 ＋ §十一 边界 | **是**——点击落点与速查的唯一权威 |
| [DS_06_LAYOUT_AND_DENSITY.md](DS_06_LAYOUT_AND_DENSITY.md) | 第六编 布局与密度：§一 设计原则 ＋ §二 SD-57 页签密度 / SD-58 筛选条两行 / SD-59 建议输入无系统图标 ＋ §三 判定流程 ＋ §四 边界 | **是**——页签块数、筛选条行数与建议输入承载的唯一权威 |
| [CASES.md](CASES.md) | 设计域判例：每条记场景、结论、边界、对应 `SD-` 规范编号与证据指针；文末含三份迁移登记 | 否——判例档案，不产生规范效力 |
| `README.md` | 本目录索引（边界、与 DESIGN_SYSTEM 的权威关系、维护规则） | 指针 → `DESIGN_SYSTEM.md` |

## 权威源与派生

- **权威源**：`DESIGN_SYSTEM.md` 是编目入口（哲学 ＋ 找什么去哪一编），六编 `DS_01`…`DS_06` 分别是各自主题的唯一权威。规范条目带 `SD-` 编号，供判例与守卫双向引用。
- **档案**：`CASES.md` 只记「为什么这样定、什么条件下不适用」，编号 `CASE-DESIGN-*`；判例结论若被写成普遍规则，须迁入对应编并取编号。
- **与其他目录的关系**：`../module/` 与 `../evolution/` 中已落地（landed）的设计稿均为**论证档案**，视觉口径一律回本目录；`../data/` 管数据、本目录管呈现，二者互不覆盖；代码 `styles.css` 只消费令牌，不得反向定义规范。

## 知识流向

设计评审与真机检查 → 在 `DESIGN_SYSTEM.md` 定稿为可判定条目（`SD-` 编号）→ 落为实现令牌与组件 → 守卫（如 `theme-palette-guard` / `field-shell-guard` / `motion-guard`）常驻核对 → 真实边界案例写入 `CASES.md` 并回链规范编号。

## 是否保留原始材料

不保留。对比截图、量测读数在 `.ctx/evidence/`；逐批判例与过程在 `.ctx/logs/`；本目录只存规范与判例结论。

## 维护触发器

- 新增、删除或重命名本目录文件；
- 色彩、排版、组件、动效或点击落点规范变更（权威源变更）；
- 新增 `CASE-DESIGN-*` 判例，或判例对应的 `SD-` 编号调整；
- 代码侧令牌或组件实现与规范不一致并确认以规范为准。
