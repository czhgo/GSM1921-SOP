---
title: "2026年11月决策日志"
type: decision_log
role: "[工程师]+[AI]"
last_updated: 2026-11-22
status: active
related_files: [CLAUDE.md, .ctx/logs/2026-11-DECISION_LOG.md, .ctx/logs/2026-10-DECISION_LOG.md, content/04_web_design/design-system/DS_01_COLOR_AND_THEME.md, content/04_web_design/design-system/DS_03_COMPONENTS.md, content/04_web_design/design-system/DS_04_INTERACTION_AND_RESPONSIVE.md]
---

# 2026年11月决策日志

> 本文件记录 2026 年 11 月所有非显而易见的决策。每条决策包含背景/选项/决定/理由/影响范围/一改具改检查。
> **来源（2026-11-01 批次 524 换月）**：自 2026-10 文件续编，`D-827` 起记于本文件；每条只写「评议 → 裁定 → 落点文件」一句，过程见 `.ctx/logs/2026-10-EXECUTION_LOG.md` 与 `git`。

> **条目编号起止**：本文件当前 **`D-827` … `D-911`，共 85 条**；下一条自 **`D-912`**。

## 本月目录（2026-11）

> **说明**：本表**只索引、不重复内容**（`主题` / `条目` / `日期` / `状态`）。条目正文见下方各 `## D-xxx` 节。

| 主题 | 条目 | 日期 | 状态 |
|---|---|---|---|
| 数据表表头去灰：两条 `th` 规则统一白底 ＋ 1px 下边框 | `D-827` | 2026-11-01 | 已落（批次 524） |
| 可点行状态：灰底不作 hover，改主题 10% 淡底 ＋ `::before` 左条 | `D-828` | 2026-11-01 | 已落（批次 524） |
| 嵌入视图去嵌套卡：`embedded` 形态不再渲染自身 `card` 与卡头 | `D-829` | 2026-11-01 | 已落（批次 524） |
| 语义标签：`section` 必有可访问名称且不得嵌套 | `D-830` | 2026-11-01 | 已落（批次 524） |
| 只读文案由 `view-capability.js` 派生，未登记 kind 恒只读 | `D-831` | 2026-11-01 | 已落（批次 524） |
| 功能色分工：指标 / 状态用功能色，动作 / 导航 / 选中态用主题色 | `D-832` | 2026-11-01 | 已落（批次 524） |
| 输入控件单一源：只经 `forms.js`，裸输入存量只减不增 | `D-833` | 2026-11-01 | 已落（批次 524） |
| 搜索框收窄：`.lf-kw` 独占一行 ≤320px，≤640px 满宽 | `D-834` | 2026-11-01 | 已落（批次 524） |
| 关键词自动补全只用原生 `<datalist>`，不引第三方库 | `D-835` | 2026-11-01 | 已落（批次 524） |
| 待办跳转单一源：`todo-actions.js` ＋ `workspace-nav.js` | `D-836` | 2026-11-01 | 已落（批次 524） |
| 页签覆盖口径：旧 67 台账退役，改用 45 catalog（W1–W5） | `D-837` | 2026-11-02 | 已落（批次 526） |
| F1 口径：以 `TAB_BLOCK_BASELINE` 登记为准，DOM measured 只复核 | `D-838` | 2026-11-02 | 已落（批次 526） |
| 破坏性 CRUD 不在共享库真删，只做软回滚 / 静态门 | `D-839` | 2026-11-02 | 已落（批次 526） |
| `requireAuth` 通用写口按已知系统性风险记 exception | `D-840` | 2026-11-02 | 已落（批次 526） |
| 六维重评：测试与发布质量 78→80，其余维持 | `D-841` | 2026-11-02 | 已落（批次 526） |
| 审计简并：audit 只做报告层；四口径唯一表（F2 行数 / F4 H2 恰 1 / F7 hasPager / C1 requireAuth 例外） | `D-842` | 2026-11-02 | 已落（批次 527） |
| M1–M3 落地；4 个双列表页签登记「独立对象池」例外 | `D-843` | 2026-11-02 | 已落（批次 527） |
| 数据契约：47 表单一源 + fixtures；parity 值对照 26 表、结构 41 表 | `D-844` | 2026-11-02 | 已落（批次 527） |
| 换轨：export/import/preflight + 迁移前备份 + 拒绝降级；副本演练 48 表 542 行一致 | `D-845` | 2026-11-02 | 已落（批次 527） |
| 六维重评：运行部署 62→68（换轨闭环证据），其余维持 | `D-846` | 2026-11-02 | 已落（批次 527） |
| 写权限单一源：权限矩阵 141 行，C1 改矩阵判定 + 高风险抽样 | `D-847` | 2026-11-03 | 已落（上线专项） |
| 会话 3 小时过期；review / production 两档固化，review 独立库 | `D-848` | 2026-11-03 | 已落（上线专项） |
| 多支部同实例设计：Phase 1–2 完成前不得打开 ALLOW_MULTI_BRANCH | `D-849` | 2026-11-03 | 设计已出（未实现） |
| 上线残项单一台账 L-01…L-21；launch-blocker 6 条已关 / 1 条降级 | `D-850` | 2026-11-03 | 已落（上线专项） |
| 六维重评：安全 52→66 · 测试 80→83 · 架构 74→76 · 部署 68→73 · 数据 78→79；三成本维持 68 | `D-851` | 2026-11-03 | 已落（上线专项） |
| `.ctx` 三层：active 投影 + reference + provenance；规则进 content，ACTIVE_RULINGS 只留索引 | `D-852` | 2026-11-03 | 已落（批次 529） |
| CLAUDE 宪法化：规则写正文、历史进 logs、细则进 content；乙部只留 ≤12 行真任务 | `D-853` | 2026-11-03 | 已落（批次 530） |
| 丙部四项：旧 token 失效 / 成功色档已存在 / SD 留 CASES / 低密度卡先收拢 | `D-854` | 2026-11-03 | 已落（批次 531） |
| 乙部余项合并批：最小 Plan B + 全量对账 + 9 条 e2e + 长期棘轮 | `D-855` | 2026-11-04 | 已落（批次 533） |
| 界面信号统一：删左条 / 焦点单环不回潮 / 颜色单一权威 / 7 类待办服务端化 | `D-856` | 2026-11-04 | 已落（批次 534） |
| CLAUDE 三层恢复 / 通知受众 fail-closed / SD-60 行动行 | `D-857` | 2026-11-07 | 已落（批次 535） |
| V-11 裁定：党委内容域 + 公共门厅 + 支部幂等采用 | `D-858` | 2026-11-08 | 已落（批次 536） |
| 测试瘦身：结果优先、守卫按需（四层 daily / guards / precommit / weekly） | `D-859` | 2026-11-08 | 已落（批次 537） |
| 测试瘦身二阶段 + 安全 / 体验 / 部署梯度：六维 80/78/74/85/77/74 | `D-860` | 2026-11-08 | 已落（批次 538） |
| 六维批判性修正：业务 80→79 · 安全 78→77 · 体验 74→72 · 测试 85→83（架构 77 / 部署 74 维持） | `D-861` | 2026-11-09 | 已落（批次 539） |
| 批次 539 终评：待办计算化 + 分工页美学 + R2/IA + 部署 6/6；六维 80/77/77/83/77/76 | `D-862` | 2026-11-09 | 已落（批次 539） |
| 批次 540 前端交互契约与议程 / 表格 / 详情重设计；六维 81/77/78/84/78/76 | `D-863` | 2026-11-10 | 已落（批次 540） |
| 批次 541 全仓漏网之鱼审计与 P2 统一清理；P2 台账 31 条五类分拣 · 六维 82/79/79/84/79/76 | `D-864` | 2026-11-10 | 已落（批次 541） |
| 六维评分保守回调：81/78/78/83/78/76（三层关系与对象模型口径未统一、CI 未跑、P2 漂移） | `D-865` | 2026-11-11 | 已落（只改台账） |
| 产品对象模型/组长权限/上会广播/URL 形态：党小组→活动/专班→工作组（无指导支委）· 组长组内全权+支部提案 · 统一上会事项+回执 · 去后缀+兼容 | `D-866` | 2026-11-11 | 已裁（待实现） |
| 三项子裁定（支部级专班存在 / 决议受众含受影响人 / 组长提案全体支委可见）＋ URL B 实施（pageHref 单源＋运行时归一） | `D-867` | 2026-11-11 | 已落（URL）；子裁定待实现 |
| 对象模型落地：活动/专班并列、工作组执行载体、专班补承办方、专班不产生考勤 | `D-868` | 2026-11-11 | 已落（批次 545） |
| 支委提案：统一上会事项、状态机、回执、议程接入 | `D-869` | 2026-11-11 | 已落（批次 546） |
| 三台专项探查 P0 收口：提案↔议程单一事实 / 支委会写门 / 报表读口 / 宣传台只读 / 组长读门 / harness 补漏 | `D-870` | 2026-11-12 | 已落（批次 547） |
| 547 边界闭环：专班折叠区真机流 / 消息页 import / issue-unread 清角标 | `D-871` | 2026-11-13 | 已落（批次 548） |
| L-16 表决名单采「建会冻结快照」 | `D-872` | 2026-11-13 | 已落（批次 550） |
| L-22 / B-541-1 三处 IA 块数按 DOM 实测重基线 | `D-873` | 2026-11-13 | 已复核（D-874：探针误报，基线不改） |
| D-873 复核：三处块数 10/14/9 为探针误报，改探针计块口径、基线不改 | `D-874` | 2026-11-14 | 已落（批次 550） |
| 提交 / 分支 / 台账三项纪律：单批 1–3 commit、日志不落 hash；达标后合并回 main；乙部 ≥80 门槛 | `D-875` | 2026-11-14 | 已落（批次 551） |
| 删活动保留报名 / 表决留痕行 + 活动快照 | `D-876` | 2026-11-15 | 已落（批次 552） |
| 六维按行业基线严格重评：76 / 68 / 72 / 70 / 72 / 65，均 <80 ⇒ 不合并 | `D-877` | 2026-11-15 | 已落（批次 553） |
| 六维补齐后重评：78 / 78 / 78 / 74 / 76 / 74，仍 <80 ⇒ 继续不合并；四条硬缺口列出 | `D-878` | 2026-11-15 | 已落（批次 559） |
| 壳层全局 44px＋13px；八条数字口径；三处越权；列表 2000＋水合不截断；六维 79/79/80/75/77/74 仍不合并 | `D-879` | 2026-11-16 | 已落（批次 561） |
| 字段错配五项＋契约以实现为准＋XSS/上报校验＋写路径 updatedAt＋全资源 If-Match＋help 全量对齐；六维 81/80/81/76/78/74 仍不合并 | `D-880` | 2026-11-17 | 已落（批次 562–564） |
| 审计 P0 清零（驱动补 If-Match＋守卫）＋ B-552 四项（含 v18 报名唯一索引）＋ 全栈专项修复；六维 82/80/82/76/79/74 仍不合并 | `D-881` | 2026-11-18 | 已落（批次 565–567） |
| 丙部四项裁定落盘：多支部转架构隔离审计（四条 P0 框架缺口）、生产与换轨只走个人密码、例外归甲、性能取乙 | `D-882` | 2026-11-19 | 已落（批次 568） |
| 六维保守重校 80/78/79/73/76/71（六维均 <80）＋ 历史值隔离 `H26.5` ＋ active / reference 台账清理 | `D-883` | 2026-11-19 | 已落（批次 568） |
| 一次清仓：硬冲突 4＋软冲突 9 清零、G1/G2 守卫、spec 噪声 525→0、历史提交基线、`H10.8` / 先裁后清 / CASE-AI-010 | `D-884` | 2026-11-19 | 已落（批次 572） |
| 待裁清零：12 条口径裁定（收敛门 / 提交基线 / B-14/17/18/25/27/31/33/44 / F-4 / F-5⑥ / B-541-8 / H-16） | `D-885` | 2026-11-19 | 已落（批次 573） |
| 制度草案按主体派生待办 ＋ 改派换人；组织者分配的工作进「我的任务」；组长台承载面复核为已落地；种子补 `executor` | `D-886` | 2026-11-19 | 已落（批次 574） |
| 发展对象服务端硬门（无决议 422）＋ 一年考察期可配置；E4 扩到独立页；名册写口前置校验；issues 补 `domain`；L-13 两条复核关闭 | `D-887` | 2026-11-19 | 已落（批次 575） |
| 多支部键级隔离：schema v19（集合版本复合主键 / `sessions.branch_id` / `attachments.branch_id`）＋ 会话固化支部 ＋ 版本按支部读写 | `D-888` | 2026-11-19 | 已落（批次 576） |
| 公共门厅支部维度（`?branchId=` 可选，缺省不变）＋ v19 列说明；`B-568-1` 四条 P0 全清并出表 | `D-889` | 2026-11-19 | 已落（批次 577） |
| sample-diff 8.1–8.5 收口：六条样本支书全取保留 ＋ 四条可布尔化口径入判例；本批无代码、六维不加分 | `D-890` | 2026-11-19 | 已落（批次 578） |
| 副支书操作权三档参数（full/standard/custom × 四类动作）；主责仍在支书，参数只决定能否代操作 | `D-891` | 2026-11-20 | 已落（批次 579） |
| 全仓历史目标对账：作废 12 项、重规划 6 项、单项证据门；跨平台脚本包装 | `D-892` | 2026-11-20 | 已落（批次 580） |
| 前端美学 P0+P1+P2 一次收口：卡厚度 16/12、卡头 600、状态色令牌、越档与灰底卡 | `D-893` | 2026-11-20 | 已落（批次 581） |
| 评分即资产（H80 第 6 条）＋ 合并门槛两段（本机门 / 外部门）＋ EA 评价资产索引 | `D-894` | 2026-11-20 | 已落（批次 584） |
| 六维复核维持 80/78/79/73/76/71；审计 P2 归零、guards 121/873 | `D-895` | 2026-11-20 | 已落（批次 585） |
| 卡头单源收口：70 处迁移 `renderCardHeader` ＋ `variant:'panel'`；手写卡头 H3 归零 | `D-896` | 2026-11-20 | 已落（批次 586） |
| 前端存量清零：调色板状态色 / 假徽章 / 越档 h-8；三道守卫（调色板 / 徽章单源 / h-8） | `D-897` | 2026-11-21 | 已落（批次 587） |
| B-522-1：数字卡按内容收窄；日历网格登记特例；今天/归档空态补最近动态与下一步 | `D-898` | 2026-11-21 | 已落（批次 588） |
| B-500-7b-2：兜底 instrument ＋ 7 类对账守卫；commit body 强制「资产命中」机检 | `D-899` | 2026-11-21 | 已落（批次 589） |
| 前端一致性收口：两条表单 SD（SD-66/67）＋ 错误态可操作化 ＋ 行高压准 | `D-900` | 2026-11-21 | 已落（批次 590） |
| 清账门 H50.3 ＋ `open-items-guard`；外部门单列 EA §四；旧计划归档；service:ensure | `D-901` | 2026-11-21 | 已落（批次 591） |
| 前端 lens 清账：16 条按规则修、1 条冻结、3 条不成立；表态单一写口（服务端待裁） | `D-902` | 2026-11-21 | 已落（批次 592） |
| 工作树复原（4 文件回 HEAD）＋ BOM 唯一性守卫；存量 10 文件 BOM 归一 | `D-903` | 2026-11-21 | 已落（批次 593） |
| `.trae` 宣称对账：24 计划 ＋ 18 spec 逐条判定；归档件未勾项须逐行 `concluded` | `D-904` | 2026-11-21 | 已落（批次 594） |
| evidence 准入（H26.3a）：只留被引用读数；99.1MB→114KB；外部门补 M-01 | `D-905` | 2026-11-21 | 已落（批次 595） |
| 表态上服务端：按人存、只本人可撤、匿名单向隐藏；矩阵 163 | `D-906` | 2026-11-22 | 已落（批次 596） |
| `.ctx` 瘦身：同一事实只出现一次；ACTIVE_CONTEXT §2 收到 12 条、EA 91→44KB、TIMESTAMPS 备注迁日志 | `D-907` | 2026-11-22 | 已落（批次 597） |
| `.trae` 收尾：归档件逐行结论；分享包删除；过程件清零；终验 P0/P1/P2=0 | `D-908` | 2026-11-22 | 已落（批次 598） |
| `.trae` 清零：documents 25 ＋ specs 18 删除；守卫改「若存在则查」 | `D-909` | 2026-11-22 | 已落（批次 599） |
| 守卫三层收敛：probe:stage ＋ 52 源件并 5 件；预算软告警 | `D-910` | 2026-11-22 | 已落（批次 600） |
| help 内联资源外抽（315→288KB）；content 去重经核查后不做删改 | `D-911` | 2026-11-22 | 已落（批次 601） |

## D-827 2026-11-01 — 数据表表头去灰

> **评议 → 裁定 → 落点**：支书批「同一页 `<thead>` 表头显灰、`tbody` 的 `<th scope="row">` 显白，莫名的灰显脏」→ `.data-table th` 与 `.data-table thead th` 均不再声明 `background`，统一白底透出 ＋ 1px 下边框，两条规则本体保留 → `content/04_web_design/design-system/DS_03_COMPONENTS.md §4.3`（表格样式单一源）；守卫 `ui-control-system-guard::V9`。

## D-828 2026-11-01 — 可点行状态柔和化

> **评议 → 裁定 → 落点**：可点行用 `--surface-hover`（neutral-200）灰底，灰显得脏且与静态行难分 → 行取 `--radius-sm`（8px）；hover 底改 `--app-accent-tint`（主题 10%），灰底只承担静态分隔；3px 主题左条改 `::before` ＋ `opacity` 过渡（`--transition-fast`）；`:active` 用 `--app-accent-active-bg`；焦点环 `outline-offset:-2px` 压在行内随圆角走；删除死类 `list-row--selected` → `DS_04 §5.2` ＋ `DS_03 §12.15 SD-43`；守卫 `hover-state-guard::H11`（`H2` 放行装饰伪元素 opacity）。

## D-829 2026-11-01 — 嵌入视图不再套卡

> **评议 → 裁定 → 落点**：知情查看里出现「卡套卡」与双卡头 → `workgroup-view.js` / `taskforce-view.js` 新增 `embedded` 形态，嵌入时不渲染自身 `div.card` 与卡头；`insight-view.js` 对其他党小组区去掉 `card` 外层并向两者传 `embedded: true`；真机 `#secretary-insight-card .card = 0`、卡头只剩 1 个 → `docs/src/components/record/{workgroup-view,taskforce-view,insight-view}.js`；守卫 `card-summary-hero-guard::G4`。

## D-830 2026-11-01 — `section` 语义两条硬判据

> **评议 → 裁定 → 落点**：全站 `section` 既有无名也有嵌套，读屏 `region` 与视觉分区不一致 → `section` 必须有可访问名称（`aria-label` 或指向存在 id 的 `aria-labelledby`）、同页不得嵌套；`div` 管布局、`article` 管独立记录、`aside` 管次要信息；本轮只收两条硬判据、不重排既有 59 处分区 → `DS_03 §12.15 SD-55`；守卫 `a11y-tree::A10`。

## D-831 2026-11-01 — 只读由权限派生

> **评议 → 裁定 → 落点**：4 处卡头写死「· 只读」，换角色不跟随 → 新增 `core/domain/view-capability.js`（`RESOURCE_WRITE_ROLES` / `canWriteResource` / `readonlyMeta`），4 处文案改为派生；未登记的 kind（如知情查看）恒只读；角色键只取 `constants.js::ROLE_KEYS` → `docs/src/core/domain/view-capability.js` ＋ 四个 record 组件；守卫 `frontend-foundations-guard::F12`。

## D-832 2026-11-01 — 指标 / 状态与动作 / 导航分色

> **评议 → 裁定 → 落点**：全局概览几乎全是主题色，功能色没起注意力引导作用 → 指标与状态（待答复 / 待赋权 / 待归档 / 待补课 / 待汇报 / 组员汇报 / 逾期）改用功能色文字档，纯计数用 `--neutral-800`；动作 / 导航 / 选中态仍用主题色 → `DS_01 §2.10`（`work-overview.js::METRIC_TONE` ＋ `overview-dispatch-bar.js` 待答复条）；守卫 `ui-color-semantics::C6–C8`。

## D-833 2026-11-01 — 输入控件单一源

> **评议 → 裁定 → 落点**：裸 `<input class="input-flat">` 散落各页、绕开组件 → `form-field.js` 新增布局中立 `textInput` / `selectInput` 并经 `forms.js` 对外；新代码不得直接写裸控件，存量按 `style-baseline.mjs::RAW_INPUT_BASELINE` 逐文件只减不增（首批迁 5 文件，全站 251→192 处 / 58→57 文件）→ `DS_03 §12.15 SD-56`；守卫 `field-shell-guard::R1–R3`。

## D-834 2026-11-01 — 搜索框收窄

> **评议 → 裁定 → 落点**：独占一行的搜索框被 `flex: 1 1 160px` 拉满整卡 → `.lf-kw` 改 `flex: 0 1 var(--lf-kw-max, 320px)`（≤320px，可逐处覆盖），≤640px 满宽 → `docs/src/styles.css` 的 `.lf-kw` 段；守卫 `field-shell-guard::R1–R3`（输入单一源同批）。

## D-835 2026-11-01 — 关键词自动补全用原生 `datalist`

> **评议 → 裁定 → 落点**：筛选关键词没有补全、反复手输 → `list-filter.js` 支持 `keyword.suggestions`（数组或 `(rows) => string[]`），生成原生 `<datalist>`（去重、截断 50 条），工作组 / 专班已接入；不引第三方库 → `docs/src/components/ui/list-filter.js`；判据并入 `DS_03 §12.15 SD-56`。

## D-836 2026-11-01 — 待办跳转只经动作表与统一导航

> **评议 → 裁定 → 落点**：6 个 `todo-tab.js` 各自维护 tabMap、直点 DOM 页签按钮或写死 `workspace/*.html?tab=` → 新增 `core/domain/todo-actions.js`（`TODO_ACTIONS` ＋ `resolveTodoAction`，actionKey 优先、actionType 兜底、roleOverrides / scopeOverrides）与 `core/session/workspace-nav.js::goToWorkspaceTab`（只认 `data-ws-tab-btn`，可写 `PendingTarget`）；按钮文案由动作表派生 → `docs/src/core/domain/todo-actions.js` ＋ `docs/src/core/session/workspace-nav.js`；守卫 `tab-nav::G1–G4`。

## D-837 2026-11-02 — 页签覆盖口径改用 45 catalog

> **评议 → 裁定 → 落点**：`workbench-audit-coverage` 仍钉 2026-10 的 67 页签旧台账，而现行注册表是 45 页签 → 支书裁定「直接改用新口径」：旧 67 台账只作归档存在（W5），现行覆盖改由 `catalog.mjs`（45 键 ≡ capabilities ≡ `TAB_BLOCK_BASELINE`）＋ `endpoint-map.mjs` 承担（W1–W4）→ `server/test/workbench-audit-coverage.test.mjs`；审计资产 `server/scripts/audit-tabs.mjs` ＋ `audit/*`。

## D-838 2026-11-02 — F1 以基线登记为准

> **评议 → 裁定 → 落点**：F1 若直接用 DOM measured 判红，会因条件块显隐与同构列表变化误报 → F1 只认 `TAB_BLOCK_BASELINE` 的非空 `reason`：>4 且已登记记 `exception`，`reason` 为空才判 P1；DOM measured 仅作复核线索，不参与红绿 → `content/05_ai_coding/TAB_AUDIT_PLAYBOOK.md` §2.3 / §5、`DS_06 §五`。

## D-839 2026-11-02 — 破坏性 CRUD 不在共享库真删

> **评议 → 裁定 → 落点**：解散 / 归档 / 删除活动若在演示库真删会污染数据 → C2 默认在 `:memory:` 临时库做 create → 回读 → PATCH → 校验 → DELETE；破坏性流程只做软回滚或静态写门证明，报告记 `exception` ＋ `reason`；`--base` 连共享服务时 C2 自动 `skip`（原因 `shared-db`）→ `server/scripts/audit/checks-crud.mjs`、`endpoint-map.mjs`、`TAB_AUDIT_PLAYBOOK.md` §2.3 / §八。

## D-840 2026-11-02 — `requireAuth` 系统性风险记 exception

> **评议 → 裁定 → 落点**：C1 探针在 `disc.attendance` / `leader.attendance` / `org.taskforce` 三处命中 `PATCH /api/v1/signups/:id` 仅 `requireAuth`，visitor 可写 → 这是跨页签的系统性风险，按页签重复计 P0 只会放大噪声；统一记 `exception` 并回链 `ENGINEERING_ASSESSMENT` 阻断风险 2，修复仍按服务端写权限专项排 → `server/scripts/audit/severity.mjs`、`TAB_AUDIT_PLAYBOOK.md` §2.3、`GUARD_INVENTORY §十五`。

## D-841 2026-11-02 — 六维重评（批次 526）

> **评议 → 裁定 → 落点**：支书 2026-11-02 裁定本轮重打六维，证据为本轮 45 页签审计 + 既有测试 / 权限 / 部署证据；**不因「做了工具」自动加分**。
> - **测试与发布质量 78 → 80（+2）**：catalog 守卫（45 键 ≡ capabilities ≡ baseline）＋ 内存库 CRUD 往返 ＋ 最终 P0/P1=0 补上了「页签 → 读 / 写口 → 权限门」的常驻覆盖空白；审计脚本不进 `test:daily`，故只加 2 分。
> - **业务与数据正确性 78 → 78**：D1/D2 对账（roster 50）与 C2 往返证明现有主流程正确，未发现新的业务缺陷；不加分。
> - **安全与权限 52 → 52**：C1 只再次证实 3 个 `requireAuth` 例外，未放宽任何门、未补写权限；不加分。
> - **最小三成本体验（含前端与交互） 68 → 68**：F1–F8 全绿与局部 aria / section / 死入口修复不足以证明三成本实质下降；41 页签未重构；不加分。
> - **架构与可维护性 74 → 74**：审计分层与单一源是正面证据，但与 `page-sweep` / `module-load` / `a11y-tree` 部分重叠，未降低跨层变更成本；不加分。
> - **运行、部署与跨组织复用 62 → 62**：本轮无部署 / 多支部新证据（**证据不足**），维持原分。
> - 阻断风险逐条复核：5 条全部保留，无闭环、无新增（证据见 `.ctx/ENGINEERING_ASSESSMENT.md` §一）。
> - 落点：`.ctx/ENGINEERING_ASSESSMENT.md` §一 / §二 / §5.2。

## D-842 2026-11-02 — 审计简并：audit 只做报告层

> **评议 → 裁定 → 落点**：`page-sweep` / `module-load` / `a11y-tree` / `audit-tabs` 四处都能判「分页 / H2 / 权限」，改一处口径要改四个脚本 → 支书裁定「audit 只做报告层、不替代 daily 门禁」，把四类漂移口径收进唯一表：F2 只判控件行数 ≤2、F4 只认 H2 恰 1、F7 统一 `hasPager()`、C1 `requireAuth` 写口记 exception；daily 的既有断言保留、不删 → `content/05_ai_coding/AUDIT_CANON.md` ＋ `server/scripts/audit/{checks-front,dom-probe,checks-data}.mjs`。

## D-843 2026-11-02 — M1–M3 与「独立对象池」例外

> **评议 → 裁定 → 落点**：信息经济只有 F1–F8 的版面判据，重复卡头与多条筛选条无人管 → 新增 M1（顶层块 >4 须有 `TAB_BLOCK_BASELINE` 理由）、M2（同页 H3 文本重复 ≥2）、M3（同页 `.lf-bar` >1）；4 个双列表页签（`org.talent` / `disc.review` / `disc.inspection` / `leader.members`）两个列表各自独立、不可合并，登记为「独立对象池」例外而不删规则 → `server/scripts/audit/checks-economy.mjs` ＋ `economy-exceptions.mjs`。

## D-844 2026-11-02 — 数据契约 47 表单一源

> **评议 → 裁定 → 落点**：换轨前无法机器判定「库结构 ≡ 功能实际」，mock 与 API 两种形态的字段漂移只能靠人记 → 建 `server/data/domain-contract.mjs`（47 表：34 资源 + 7 语义 + 6 工作组；`required` / `enums` / `seedCount` / `aliases` / `deprecated`）＋ fixtures ＋ `data-contract.test.mjs`；人为读版落 `content/04_web_design/data/DATA_CONTRACT.md`；parity 口径为值对照 26 表、结构 41 表。保留 JSON 宽表、不做列规范化 → `server/data/domain-contract.mjs`、`server/test/data-contract.test.mjs`、`content/04_web_design/data/DATA_CONTRACT.md`。

## D-845 2026-11-02 — 换轨管线与拒绝降级

> **评议 → 裁定 → 落点**：部署在即，数据换轨没有可演练、可回滚的单一入口 → `export-all`（48 表 ＋ `manifest.json`：schemaVersion / 行数 / sha256）、`import-all`（默认 dry-run、`--apply` 单事务、版本与 id 冲突校验、契约 required / enums）、`preflight-cutover`（版本 / 空库 / 基线账号 / 演示残留 / 孤儿外键 / 附件一致性）；`db.js` 迁移前自动备份、`user_version > SCHEMA_VERSION` 拒绝启动；副本演练 48 表 / 542 行逐表行数与 sha256 一致，preflight exit 0 → `server/scripts/{export-all,import-all,preflight-cutover}.mjs`、`server/db.js`、`deploy/CUTOVER_RUNBOOK.md`。

## D-846 2026-11-02 — 六维重评（批次 527）

> **评议 → 裁定 → 落点**：支书 2026-11-02 裁定按本批证据重打六维，证据为审计简并、数据契约与换轨演练；**不因「写了脚本」自动加分**。
> - **运行、部署与跨组织复用 62 → 68（+6）**：换轨从「有文档」变成「可演练、可回滚、可拒绝降级」——48 表 / 542 行 export → dry-run → apply 一致，preflight exit 0，迁移前备份与降级拒绝均实测；单实例多支部硬边界不变，故只加 6 分。
> - **最小三成本体验 68 → 68**：P2 4→3、exception 47，M1–M3 补了信息经济判据，但 41 页签仍未重构、无用户实测；不加分。
> - **测试与发布质量 80 → 80**：`data-contract` 6 条进 daily、audit 仍不进 daily；覆盖形态有增、发布时长未降；不加分。
> - **业务与数据正确性 78 → 78**、**安全与权限 52 → 52**、**架构与可维护性 74 → 74**：契约与分层是正面证据，但 JSON 宽表、通用写口、跨层同批维护三项残项未变；不加分。
> - 阻断风险逐条复核：5 条全部保留，无闭环、无新增（离轨相关的新增边界记入 §一 残项，不升级为阻断项）。
> - 落点：`.ctx/ENGINEERING_ASSESSMENT.md` §一 / §二 / §5.2。

## D-847 2026-11-03 — 写权限单一源：权限矩阵

> **评议 → 裁定 → 落点**：审计按「中间件是不是 `requireAuth`」判越权，误伤 `signups` 这类 handler 级 guard → 建 `server/security/write-policy-matrix.mjs`（141 行：135 enforced / 4 self-service / 2 public / 0 known-risk），守卫断言 Express 运行期写路由 ≡ 矩阵；C1 改为矩阵判定 + 高风险抽样，`--probe-writes` 才逐口重探 → `server/security/write-policy-matrix.mjs`、`server/test/write-policy-matrix.test.mjs`、`server/scripts/audit/checks-crud.mjs`、`AUDIT_CANON.md`。

## D-848 2026-11-03 — 会话 3 小时过期与两档运行形态

> **评议 → 裁定 → 落点**：支书 2026-11-03 裁定「改成 3 个小时过期」→ `SESSION_TTL_HOURS` 缺省 3（旧 `SESSION_TTL_DAYS` 兼容换算），过期 token 在 `/auth/me` 与受保护写口 401 并删除会话行；production 档缺口令 / 多支部拒绝启动；新增 `npm run start:review` 缺省使用 `server/data.review.db`，视觉检验不写生产库 → `server/routes/auth.js`、`server/run-mode.js`、`server/scripts/start-review.mjs`、`deploy/env.production.example`。

## D-849 2026-11-03 — 多支部同实例设计稿

> **评议 → 裁定 → 落点**：支书要求「服务端要考虑多支部情况，需要有所设计」→ 设计四阶段（读口统一过滤 / 快照按支部 / 党委跨支部显式范围 / 索引），上线仍坚持一实例一支部，Phase 1–2 完成前不得打开 `ALLOW_MULTI_BRANCH` → `content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §十`；`server/run-mode.js` 拒绝文案回链该节。

## D-850 2026-11-03 — 上线残项单一台账

> **评议 → 裁定 → 落点**：审计 / 换轨 / 部署 / 前端残项分散在多处 → 归总为 `L-01`…`L-21`（launch-blocker / post-launch / backlog 三档）；本批关闭 L-01/L-03/L-04/L-05/L-06/L-07，L-02 降级为 post-launch（Linux 真机未验）→ `.ctx/ENGINEERING_ASSESSMENT.md §四「上线残项」`。

## D-851 2026-11-03 — 六维重评（上线专项）

> **评议 → 裁定 → 落点**：按本批证据逐维重打，不因「写了工具」自动加分。
> - **业务与数据 78 → 79（+1）**：契约漂移修正 + 48 表 / 577 行往返一致。
> - **安全与权限 52 → 66（+14）**：矩阵 141 行 / 0 known-risk + 6 条缺口修复 + 3 小时会话 + 快照 P0；多支部读过滤仍未实现，故不到 70。
> - **最小三成本 68 → 68**：P2 3→2、exception 47→44，但无实质 UI 重构与用户实测。
> - **测试与发布 80 → 83（+3）**：矩阵 / 红队 / 缺口 / 会话 / 运行档五组测试进 daily。
> - **架构与可维护 74 → 76（+2）**：权限判据单源化，但新增同批维护点。
> - **运行部署 68 → 73（+5）**：严格 preflight exit 0 + 两档运行 + review 隔离；install/update 未真机验证。
> - 阻断风险：第 2 条部分闭环、第 4 条会话过期闭环、其余保留。
> - 落点：`.ctx/ENGINEERING_ASSESSMENT.md §一 / §二 / §5.2`。

## D-852 2026-11-03 — `.ctx` 三层与 Active Context 预算

> **评议 → 裁定 → 落点**：支书批「`.ctx` 内容多、权责边界不清、更新频率不一致，容易污染上下文；但也有很多可复用资产」→ 裁定 **`.ctx` 是仓库、不是 active context**：新增 `.ctx/ACTIVE_CONTEXT.md` 作为唯一热投影（≤300 行 / 30KB）；规则 / 判例 / 方法正文先进 `content/01–05`，`.ctx/ACTIVE_RULINGS.md` 只留跨域摘要 + 16 领域索引；`SNAPSHOT` 删除批次小结、改由 `EXECUTION_LOG_INDEX` 承接；`ENGINEERING_ASSESSMENT` / `REVIEW_QUEUE` 标 `reference`；`ACTIVE_RULINGS` / `SNAPSHOT` 路径不移动（分别约 44 / 93 处引用）→ `.ctx/ACTIVE_CONTEXT.md`、`.ctx/README.md`、`.ctx/AGENTS.md`、`CLAUDE.md H26.4`、`content/05_ai_coding/{CONTEXT_MANAGEMENT,DOCUMENT_GOVERNANCE}.md`；守卫 `ctx-hygiene-guard::⑤–⑦`、`docs-governance-guard::G6`、`doc-consistency::S14/S15`。

## D-853 2026-11-03 — CLAUDE 宪法化与乙部清账

> **评议 → 裁定 → 落点**：支书批「乙部膨胀；甲部引用框太多、大多是沿革；CLAUDE 形成于 AI 不强的时期，应按最前沿 prompt / context engineering 重做」→ 裁定 **CLAUDE＝宪法 + 路由**：规则写正文祈使句；历史进 logs；细则进 content/05；甲部引用框 ≤15（只留「原话即规则」与守卫锚点）；乙部只留 ≤12 行真任务（假任务 / 冻结件 / 已完成删除，真任务排 530–532）；丙部只留 4 条真待裁；目标 ≤600 行 / 85KB（实际 197 行 / 17.5KB，10 个引用框）。不删除 H 编号与守卫锚点（H21/H21.3/H40.2/H20.2/H20.3/评议待办节头/批次 521 五编句）→ `CLAUDE.md`、`content/05_ai_coding/{CONTEXT_MANAGEMENT,DOCUMENT_GOVERNANCE,PARALLEL_SKILL_AUDIT,REVIEW_AND_EXPRESSION}.md`；守卫 `ctx-hygiene-guard::⑧–⑨`、`doc-consistency` R 表、`claude-parallel-audit`、`ia-critical-guard`、`ui-preflight-context`。

## D-854 2026-11-03 — 丙部四项裁定

> **评议 → 裁定 → 落点**（支书 grill-me 后裁定）：
> - **B-502-5 旧 token / 旧链接**：不做兼容跳转；账号改名同一事务内**删除旧会话**，旧 token 一律 401；旧书签带旧学号时按 404 处理并提示重新登录。落 `server/routes/member.js`（`DELETE FROM sessions` + `sessionsInvalidated:true`）、`server/test/account-rename.test.mjs`。
> - **B-519-3 成功色文字档**：`--status-success-text` 已存在（DS_01 §2.4），不新增；关闭。
> - **B-521-1 SD 判据表**：维持 `CASES` 迁移登记，不回迁 `DS_03 §12`；`DS_03 §12.6` 已是指针，避免双源。
> - **B-522-1 低密度卡**：先收拢「今天 / 归档」重复卡与空白区，不先补内容；用 `density-audit.json` 复测；排入批次 532。

## D-855 2026-11-04 — 乙部余项合并批与长期项收口

> **评议 → 裁定 → 落点**（支书 grill-me 四问后裁定，本批合并为批次 533）：
> - **B-500-7 待办派生服务端化**：先做**最小 Plan B**（服务端只读派生端点 + 客户端切读 + 兼容降级）；**完整 Plan B 的阶段门槛必须登记在乙部**（`B-500-7b`：七类 unsupported 组服务端化 → 纯函数抽零依赖叶子件 → 客户端本地派生摘除 → 读面前置解耦 → 缓存/性能）。落 `server/routes/todo-groups.js`、`docs/src/data/api-adapter.js`、`docs/src/components/record/todo-tab-shell.js`、`CLAUDE.md 乙部`。
> - **B-500-1 第五轮 P2/P3**：**全量对账**——逐条对现行代码机检，仍命中的修掉，已消失的留证据；本批关账。
> - **B-515-6 真缺陷与 e2e**：**9 条 precommit e2e 必须全部跑通**，不得留到发布前；4 条真缺陷中 2 条经探针证伪（写链已改资源 API / 权限判据已含 `deputy-leader`），向导校验与待批复种子补齐。
> - **B-515-5 / B-522-2 长期棘轮**：各迁一批（`text-xs` 23 处 · help.html 532 → 167 处），同批建 / 收紧守卫棘轮（`TEXT_XS_BASELINE`、help.html 从 `allowNew` 改 `false`），两条转持续任务 `C-5` 并移出乙部。
> - 判据 / 落点：`CLAUDE.md 乙部`、`server/test/style-ratchet-guard.test.mjs::Q6`、`server/test/color-ratchet-guard.test.mjs::H7`、`content/04_web_design/design-system/DS_02_TYPE_AND_SIZE.md §3.2.2`。

## D-856 2026-11-04 — 界面信号统一、颜色单一权威与完整 Plan B 一期

> **评议 → 裁定 → 落点**（支书四轮 grill 后裁定，批次 536）：
> - **左条**：删除所有状态型 / 装饰型左侧强调条（hover、选中、当前、状态、提示、装饰）；身份与品牌改圆点 / 徽章，引述改全框 / 底色；只留 1px 结构边。落 `DS_03` SD-25 / §12.11 / §4.2、`DS_04 §5.2`、`UI_REVIEW_CHECKLIST ③-3`、`CASES` CASE-DESIGN-033；守卫 `hover-state-guard::H11`、`ui-control-system-guard::V7`、`ui-contrast-guard::K6` 改判「不得再有状态左条」。
> - **焦点**：沿用 SD-27 / DS_04 §5.7 单环（2px 实线、仅键盘触发、`box-shadow:none`），**不加宽、不收窄、不新增双层环 / 光晕 / 边框叠加**；输入族保持「只变边框」现状。回潮由 `FOCUS-1…5` / `ui-focus-ring::F1–F6` 守住。
> - **颜色**：`styles.css` 为唯一权威；`constants.js` / `tailwind-config.js` 做受守卫镜像（T12/T13 逐值相等）；`about.css` 从 `allowNew` 改 `false`（内容不动）；渲染层彩色 `rgba()` 清零；help 内联徽标改文档页类；`btn-action` / toast 用专用令牌（暗色不覆写，保持浅底深字）。顶栏「写入活动」实底 CTA 按 V-3 保持。
> - **完整 Plan B**：7 类实时组全部服务端化；测试先行＝先用客户端结果做标准答案、再逐字段对账、再加双支部夹具；服务端为默认源，客户端只留展示派生，失败兜底不得生成新业务事实。`B-500-7b-1` 已完成，`B-500-7b-2` 前置已达、**不以上线为前提**。
> - **数据分层**：`CLAUDE.md H32` 增补「服务端算业务事实 / 客户端算展示派生 / 兜底不得生成新事实」。

## D-857 2026-11-07 — CLAUDE 三层恢复、通知受众 fail-closed 与 SD-60 行动行

> **评议 → 裁定 → 落点**（支书 `/plan` 三项要求后裁定，批次 535）：
> - **CLAUDE 三层**：温层从 0 行恢复为「触发式任务表 + H60–H80」；热层 H10–H50、冷层 H90–H100；乙部删除批次历史叙述，完成项整行删除。守卫新增层边界、温层 3–60 行、乙部 ≤18 行且无「已核实完成 / 已清出」、触发表指针 `existsSync`。落 `CLAUDE.md`、`server/test/doc-lifecycle-guard.test.mjs`、`server/test/claude-parallel-audit.test.mjs::C4`、`server/test/ui-preflight-context.test.mjs::P5`。
> - **通知受众 fail-closed**：系统通知无受众＝不可读；广播必须显式 `audience:['all']`；未登录一律不可读；`project-auth-granted` 定向到被赋权人且授权人姓名由服务端按名册复算；存量迁移标 `legacyUnscoped`。落 `docs/src/services/governance/notice.js`、`server/system-notice-kinds.js`、`server/routes/system-notices.js`、`server/scripts/migrate-notice-audience.mjs`、`server/test/notice-audience-failclosed.test.mjs`。
> - **UI 行动行**：SD-60 四类排布（长组件伸缩 / 多短按钮 / 单枚低价值 / 筛选条），`.card-head` ≥641 不换行、标题让位、aside 不拆组；新增 `action-row-wrap-guard`。落 `DS_06 §二`、`DS_03 §4.2`、`docs/src/styles.css`、`CASE-DESIGN-034`。
> - **未登录公共入口**：只研究不改；三方向（A 最小收紧 / B 学院级入口 / C 公共门户）落 `content/04_web_design/evolution/PUBLIC_ENTRANCE.md`，进丙部 V-11 待裁。

## D-858 2026-11-08 — 党委内容域与公共门厅

> **评议 → 裁定 → 落点**（V-11 三方向比选后，支书裁定取 B 学院级公共门厅并同时立党委内容域，批次 536）：
> - **读面**：未登录只看党委公开内容——党委公开通知全文、党委公开活动摘要、公开资料（列表 / 详情 / 下载）与登录入口；登录后看党委与支部并集。党委组织员获得活动写入、下发、公开与多域写权。
> - **数据边界**：党委内容与支部内容同表，以 `ownerScope='committee'` ＋ `branchId='pc-gsm'` 标识；下发目标支部写 `['all']` 或支部 id。支部侧生成副本，副本只改执行字段（时间 / 地点 / 组织者 / 考勤），与原件手动同步，不自动回写；本支部已有副本时，支部列表隐藏党委原件。
> - **公开边界**：`publishScope` 三档（`branch` / `login` / `public`）；`public` 只归党委，必须有未来有效期，撤下与过期一律 fail-closed（匿名接口 404）；公开、撤下、有效期变更与匿名下载写入 `publication_audits` 留痕。
> - **通知与名册**：党委下发到支部的通知限支部内可见，同文重复下发按 24 小时限频；党委可导入支部名册、接收支部上报与提案，处置仍在支部侧。
> - **品牌**：未登录门厅品牌为党徽 ＋「光华管理学院党建平台」，不出现具体支部名、成员姓名、统计卡与工作组。
> - **未选方案**：A 最小收紧（无法承载公开内容）、C 公共门户（超出当前需求）；多支部 Phase 3–4 不以上线为前提，`ALLOW_MULTI_BRANCH` 保持关闭。
> - **落点**：`server/routes/resources/semantic-routes.js`（党委内容语义端点）、`server/routes/resources/branch-scope.js`、`server/routes/public-portal.js`、`server/routes/resources/publication-audit.js`、`docs/index.html`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md §9a.1`、`content/04_web_design/evolution/PUBLIC_ENTRANCE.md`、`content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §十`。

## D-859 2026-11-08 — 测试瘦身：结果优先、守卫按需

> **评议 → 裁定 → 落点**（支书 2026-11-08 补充裁定第 3 条，批次 537）：
> - **问题**：`test:daily` 已胀到 255 文件 / 1872 断言 / 约 150s，且**结论与过程混跑**——改一个样式要等全部静态守卫与域回归；同时 `server/package.json` 的 `test:daily` 显式清单长 8518 字符，超过 Windows 命令行 8191 上限，Linux 也因 `set X=1&&` 语法不能跑。
> - **裁定**：测试目的＝**暴露结果错误**；结果正确时不检查过程，结果错误时才按需看过程 ⇒ 四层：`daily` 只留**结果门禁**（权限 / 会话 / 数据契约与迁移 / 核心业务结果 / 构建可运行），`guards` 收**静态守卫**（样式 / 字号 / 颜色 / 动效 / 结构 / 文案 / 文档 / 行号 / 页签密度）按需跑，`precommit`＝daily＋guards＋非核心域回归＋e2e，`weekly` 留慢速普查。**不删任何测试文件或断言**，只改分层与触发方式；precommit / full 仍覆盖全部文件。
> - **读数**：daily 255 → **43 文件 / 294 断言**；guards **93 文件 / 759 断言**；precommit 158 文件（含 38 个 e2e）；weekly 2。daily 墙钟实测 **≈123s（并发 4）/ ≈148s（并发 8）**——**未达 ≤60s**：43 文件串行成本约 500s（bcrypt ＋ SQLite / uploads 写盘），并发不再线性加速；压到 60s 需砍到约 20 个文件，会丢登录 / 权限 / 迁移门禁，故保留覆盖并把差距计入 README。后续提速方向＝降测试内固定成本（共享 bootstrap 夹具 / 测试档降 bcrypt 轮数），不是删判据。
> - **未选方案**：① 继续把守卫留在 daily（改样式即等全量，违背「过程按需」）；② 直接删守卫 / 降 `skip`（丢判据，违反 H25）；③ 只把 daily 压到约 20 个文件换 60 秒（丢登录 / 权限 / 迁移结果门禁）。三条均不取。
> - **落点**：`server/test-tier-registry.mjs`（四层 ＋ 四个预算常量）、`server/scripts/{tier-runner,run-daily,run-guards,run-precommit,run-changed}.mjs`、`server/package.json`（`test:daily` / `test:guards` / `test:precommit` / `test:changed`，去掉 `set X=1&&`）、`server/test/test-tier-guard.test.mjs`（T1/T3/T4/T5）、`server/test/doc-consistency.test.mjs::S16`、`server/test/contract-doc-guard.test.mjs`（新增）、`server/test/test-isolation-guard.test.mjs::I1`、四个自查登记守卫（`claude-parallel-audit::C7` / `container-width-guard::C5` / `lf-bar-structure-guard::L5` / `roster-filter-guard::R5`）、`CLAUDE.md H25`、`server/README.md`、`README-server.md`、`server/AGENTS.md`、`server/test/AGENTS.md`。

## D-860 2026-11-08 — 测试瘦身二阶段与安全 / 体验 / 部署梯度

> **评议 → 裁定 → 落点**（支书要求「评分必须带证据卡、未达证据的检查点不加分」，批次 538；只改评分子本与台账，不改代码）：
> - **测试（83 → 85）**：daily **27 文件 / 207 断言 / 60.9s** 全绿，guards **99 文件 / 791 tests / 96.1s** 全绿；四层 runner 按 `test-tier-registry.mjs` 单一源执行，CI `daily.yml` 接 `test:daily` 与 `deploy-verify`。补的是「分层 runner 可复跑 + 结果门禁达时」。
> - **安全（66 → 78）**：B / E / G 三批证据——`security-hardening` 8/8（G4 名册提案复核 / G5 副本同步复核 / L-09 派发位 403 / v14 生成列与索引 / 读口分页 / 公共下载限频 429）、`multi-branch-read-filter` 9 组、`personal-password` 21/21、上传门党委 201 / 普通成员 403。共享口令仍作回退保留；`ALLOW_MULTI_BRANCH` 仍关闭。
> - **体验（68 → 74）**：C 波 2 条 B 项 ＋ 院级内容动作收敛 ＋ 下发通知空态；F 波 5 个 C 页签 IA 三问出结论（1 归档为 A、4 保留改 CTA）；H 波 5 个用户任务在 1440 / 390 双档 PASS，同批修复 `branch-doc` 与 `references` 院级过滤。**75 暂不授予**：用户任务为自动走查、未获真人签收；未登录资料查询页仍只给登录提示。
> - **部署（73 → 74）**：`deploy/verify-linux.sh` 本地 Git Bash 5/6（`bash -n` / `doctor` / `smoke` / `preflight` 过；`package` 因 msys `tar` 失败），PowerShell `package` 断言过；CI 增 `deploy-verify` job。**75 暂不授予**：CI job 未实跑绿、`package` 在 msys `tar` 未过；**80 需真机**。
> - **业务 79 → 80**：G4 / G5 写入前复核 + v14 审计索引 + 党委公开通知写口。**架构 76 → 77**：契约类落地 + registry runner 单源；行号 / 版本戳维护成本仍在。
> - **未选方案**：① 按「功能已做完」直接给体验 75 / 部署 75（违反「未达证据不加分」）；② 把自动走查记作真人签收（证据不成立）；③ 把 CI job 已配置记作已跑绿。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| 用户任务走查 PASS 即等于体验达标，可给 75 | 走查是自动取证，真人签收才算体验验收；未登录资料查询页 GAP 未闭不加分 | 证据强度高估（自动 → 人工） | 加分必须写清证据类型；自动走查只能作下限，不得替代真人签收 |
| CI job 已配置即等于部署可验证 | 未实跑绿、`package` 未过即证据不成立 | 配置 ≠ 运行结果 | 部署类加分只认「本机 / CI 实跑读数」，配置只登记不记分 |
| 测试文件减少即等于测试变强 | 分层只改「哪一层跑」，覆盖不减；加分来自结果门禁达时与 runner 单源 | 手段 ≠ 判据 | 测试类加分按「结果门禁读数 + 覆盖未减」计，不按文件数计 |

> **落点**：`.ctx/ENGINEERING_ASSESSMENT.md`（§一 六维与证据行 / §二 各维结论 / §四 L-02·L-09·L-10·L-11·L-12·L-13 / §5.2 当前值）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/logs/2026-11-EXECUTION_LOG.md`（批次 538）。

## D-861 2026-11-09 — 六维评分批判性修正

> **评议 → 裁定 → 落点**（支书 2026-11-09 要求「六维分数立即修正」，批次 539 波次 S；只改 `.ctx` 台账与评估文档，不改代码 / 不改测试 / 不 commit / 不 bump）：
> - **业务 80 → 79**：D2 只对 3 个计数（`org.roster` 50 = 50、`secretary.group-progress` 3 = 3、`party-committee.branches` 1 = 1）；C2 在 46 页签 **0 pass**（34 skip / 12 exception），只有 `:memory:` 手工往返；`L-16` 表决名单服务端重算未闭。
> - **安全 78 → 77**：上传门代码 `server/routes/uploads.js:68-74` 已用 `requireUploader` 放行 `party-staff`（`security-hardening.test.mjs:304-324` 常驻断言 party-staff 201 / 普通成员 403），但 `server/security/write-policy-matrix.mjs:534-538` 仍登记 `requireCommissioner` / 支委层——唯一机读源与运行期不同批。
> - **体验 74 → 72**：H 波 5 个用户任务实为 **4/5 PASS**（任务 5 未登录资料查询只给登录提示，`R2` GAP）；`B11`（`org.talent` 录入考察沉底）未动；`R1` 台账仍写「只登记不修」，与已修代码不一致。
> - **测试 85 → 83**：daily 60.9s 来自断言 **294 → 207**（12 条域回归移出 daily）；CI `daily` / `deploy-verify` 均无实跑读数；`CLAUDE.md` 乙部 `B-500-7b-2` 仍写「daily 294 断言全绿」。
> - **架构 77 / 部署 74 维持**：本轮无新增可复跑证据。
> - **未选方案**：① 维持原分只加注（等于「已给分不回收」）；② 只调测试分、不动安全 / 体验（同批证据同源，分维口径不一致）；③ 顺手改代码 / 测试 / 版本戳把分补回来（越出「只改台账」授权）。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| D2「计数对账一致」即可代表业务对账覆盖 | 只有 3 个计数被测，其余未测即未覆盖 | 抽样当全量 | 加分须写明样本量；「对账一致」必须给分母 |
| C2 在 `:memory:` 手工往返一次即写口已覆盖 | 46 页签 C2 0 pass（skip / exception），不能算日常门禁 | 一次性手工当常驻 | 写口覆盖只认常驻 tier 内的 pass，skip / exception 不计 |
| 测试断言减少但时长达标即测试变强 | 60.9s 是覆盖变窄换来的，须同报移出清单 | 手段当判据 | 时长与覆盖必须成对报，只报其一不得加分 |
| 上传门代码改了即安全口径已对齐 | 矩阵仍是唯一机读源，代码先行、矩阵未改即单源破裂 | 实现当权威 | 权限类加减分以「矩阵 ≡ 运行期门」为准，代码先行不算 |
| 自动走查 4/5 可记作 5 个任务全部 PASS | 未登录资料查询 GAP 未闭；自动走查不能替代真人签收 | 证据强度高估 | 体验验收按「任务分母 + 未闭 GAP + 签收人」三项计 |

> **落点**：`.ctx/ENGINEERING_ASSESSMENT.md`（§一 六维与证据行 / §二 2.1·2.2·2.3·2.5 / §5.2）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/ACTIVE_RULINGS.md`、`.ctx/evidence/2026-11-08/user-task-test.md`（R1 改准）、`.ctx/TIMESTAMPS.md`。**未改代码 / 测试 / 版本戳，未 commit。**

## D-862 2026-11-09 — 批次 539：待办计算化 + 分工页美学 + 体验 / 部署提分

> **评议 → 裁定 → 落点**（支书 2026-11-09 要求「更新批次 539 最终评分与台账」；只改 `.ctx` 台账与 `CLAUDE.md` 乙部读数，不改代码 / 不 commit / 不 bump）：
> - **业务 79 → 80**：待办「P0 漏提醒」修复——组织委员前置门由「有待办行」改「有成员发展数据」，空 `todos` 库不再吞发展节点 / 半年考察提醒；发展节点 / 半年考察 / 模块周期三类派生迁入 `todo-derive.js` 单一源（`server/routes/todo-groups.js` 删掉约 130 行复刻）；纪检「考勤 / 考察待确认」改由服务端派生（11 类组全同源）；`count === items.length` 成为唯一计数口径（议程派生行另计 `agendaCount`）；演示单据种子行（`todo_seed_*` / `mc-seed-*` / `mcr-seed-*`）纳入 `server/demo-data-guard.js` 的生产演示数据门。**81 不授予**：D2 / C2 覆盖未扩、`L-16` 表决名单重算未闭。
> - **安全维持 77**：`server/security/write-policy-matrix.mjs:534-536` 把 `POST /api/v1/uploads` 登记为 `requireAuth + (party-staff | requireCommissioner)` / `roleGate: 支委层或 party-staff`，唯一机读源与运行期 `requireUploader` 同批一致，补上 `D-861` 的失分项；但多支部读过滤未接线、`ALLOW_MULTI_BRANCH` 仍关闭，**78 不授予**。
> - **体验 72 → 77**：`secretary.work-map` 责任关系由主从两栏改单列对象列表（14 项逐行摊平、行载体走 `list-row.js`、≤640 展开整段说明）；`R2` 未登录资料查询接入匿名门厅读口（`references.js` → `loadPublicPortal`，含匿名下载 / 失败重试 / 「去登录」附注），补上 `D-861` 的 GAP；IA 三条（`party-committee.dispatch` / `leader.write` / `org.member-flow`）落结论；`disc.review` 复盘页动作收敛。**未做**：5 个 B 中 `party-committee.branches` 因既有契约（目录只创建 / 选择）回退。**78 不授予**：真人签收未完成（自动走查 ＋ 截图不计验收）。
> - **测试维持 83**：daily **27 文件 / 210 断言 / 63.5s**、guards **99 文件全绿**；断言 207 → 210 为待办 P0 回归净增，覆盖未缩；`CLAUDE.md` 乙部 `B-500-7b-2` 的「daily 294 断言」同批改准为「daily 210 断言（结果门禁）」。**CI 未实跑，84 不授予**。
> - **架构维持 77**：11 类待办派生收成 `todo-derive.js` 单源；行号 / 版本戳维护成本未降。
> - **部署 74 → 76**：`deploy/package.mjs:269-273` 改在 `OUT_DIR` 下用相对文件名调 `tar`、`deploy/verify-linux.sh:42-48` 用 `cygpath -u` 转 POSIX（修 msys 把 `D:` 当远程主机）；`VERIFY_TMPDIR=D:\…\.tmp` 下 **6/6 · 退出码 0**（语法 3/3 · doctor · 起服务 · smoke --login · preflight strict 阻断 0 / 警告 0 · package 460 文件 / 12.9 MB / 断言 0 命中），PowerShell 侧 package 回归退出 0。**77 / 80 不授予**：GitHub Actions `deploy-verify` 未实跑、真机 `install` / `update` 未验（`L-02`）。
> - **未选方案**：① 把「自动走查 + 截图」记作真人签收换体验 78（证据强度不足）；② 把 `verify-linux` 6/6 记作 CI 已绿、部署给 77（本机无 `gh`、本批不推送）；③ 越过「目录只创建 / 选择」契约强改 `party-committee.branches`（改 IA 契约须先裁定）。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| 待办提醒有服务端组即覆盖完整 | 前置门以「有待办行」为条件会吞掉提醒，须按业务数据判 | 前置条件当业务判据 | 派生组的启用门必须由业务数据决定，不得由别的派生产物决定 |
| 服务端按客户端口径复刻三类派生可接受 | 复刻即双源，改一处必漏一处；应进同一个叶子件 | 实现形态当单一源 | 派生规则只允许一份实现；双端只能 import，不得复刻 |
| 计数含派生批次行是既有口径 | 计数须等于条目数，附加行数另设字段 | 字段混用 | `count` 只数 `items`；任何附加计数必须有独立字段名 |
| verify 5/6 属环境差异、不必修 | 同一根因同时打中打包与校验两处，须同批修 | 环境归因掩盖根因 | 平台报错先定位根因；同一根因的多处调用须同批修 |
| 部署容器 6/6 等于 CI 已绿 | 未在 GitHub Actions 实跑即无读数，配置不算证据 | 本地等价当远端结果 | 部署加分只认目标环境实跑；本地等价仅作下限 |

> **落点**：`.ctx/ENGINEERING_ASSESSMENT.md`（§一 六维与证据行 / 阻断风险注 / §二 2.1–2.6 / §四 L-02·L-12 / §5.2）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/ACTIVE_RULINGS.md §A`、`.ctx/logs/2026-11-EXECUTION_LOG.md`（批次 539）、`.ctx/logs/EXECUTION_LOG_INDEX.md`、`.ctx/TIMESTAMPS.md`、`CLAUDE.md` 乙部 `B-500-7b-2`、`.ctx/evidence/2026-11-09/*/summary.md`。**未改代码 / 测试 / 版本戳，未 commit。**

## D-863 2026-11-10 — 批次 540：前端交互契约与议程 / 表格 / 详情重设计

> **评议 → 裁定 → 落点**（支书 2026-11-10 要求「更新批次 540 判例、评分与台账」；只改文档 / 台账，不改代码、不 commit、不 bump）：
> - **前端交互契约**：待办 / 今天的一行被点后必须发生什么写成契约——每个动作键声明 `mode`（`inline` / `switch` / `direct`）、`kind`、`label` 与六台 `roleOverrides`；`switch` 未命中本台页签时 **fail-closed**（内容区给「本台无该模块」＋ 同义落点），禁 toast-only、禁静默留页、禁整页 `?tab=`。29 类动作 × 6 台已登记，`todo-jump-contract` 全绿。
> - **议程分类与待议池**：来源 → 类型（决策 / 讨论 / 同步）→ 待议池由一份纯函数算（`agenda-classify.js`，六类 ＋ 另纳入两类），客户端与服务端**同源 import**，服务端出 `GET /api/v1/committee/agenda-candidates`；`agenda-classify` 断言六类 × 四反例 × 两端逐项一致 × 双支部过滤。
> - **表格契约**：同列同语义 ≥3 行走 `renderDataTable`；列宽三档、行高 40、`colspan` 插行详情、横滚与首列吸附、列宽拖动、灰字分层；手写 `<table>` 只减不增（`table-contract-guard::T1–T7`）。
> - **详情与分工**：活动详情收为「对象头 → 信息 → 参与 → 议程 → 收口」四段，管理动作进页尾折叠；支部分工视图 4 → 2（责任关系 / 关系矩阵，「按项目」为转置故删除）。
> - **图标着色**：图标只经 `icons.js`；色值只许 `currentColor` / `none` / `var(--token)`；状态色经 `--tint` 取 `-text` 档；hex 扫描含 data-URI 的 `%23`（`icon-color-guard::G1–G5`）。`sidebar` / `person-picker` / `custom-select` / `archive-entry` 四处字面色同批收口。
> - **六维评分**：业务 **80 → 81**（议程链路同源分类，残项 `L-16` 未闭）；安全 **77**（本批不动写口与读面）；体验 **77 → 78**（跳转 / 议程 / 表格 / 详情 / 概况与分工 / SVG 六组落地，**80 不授予**：真人 5 任务签收未完成）；测试 **83 → 84**（daily 29 / 233 / 77.0s、guards 101 / 809，**85 不授予**：CI 未实跑）；架构 **77 → 78**（三份契约 ＋ 两处共享纯函数）；部署 **76**（无新增目标环境证据）。
> - **未选方案**：① 把「自动走查 ＋ 双档截图」记作真人签收换体验 80（证据强度不足）；② 把本机分层读数记作 CI 已绿换测试 85（配置与本地等价都不计）；③ 为凑分把 `L-16` 表决名单重算顺手写进服务端（越出「只改台账」授权，且须支书先定口径）。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| 待办点不动时弹一句 toast 也算「有反馈」 | 点在待办行上，用户要的是「到得了」；本台没有该模块时必须给出同义落点 | 反馈当落点 | 交互契约按「点了之后必须发生什么」写；未命中一律 fail-closed ＋ 同义落点，toast 不作兜底 |
| 同一事项在客户端判一次、服务端再判一次，各写一份类型即可 | 来源与类型只允许一份实现，两端 import 同一函数 | 双源并存 | 跨端派生必须同源 import；新增来源同批改契约、分类表与验收 |
| 表格各页手写 `<table>` 更自由，样式可以局部调 | 同列同语义 ≥3 行必须走同一组件出口；列宽 / 行高 / 截断只许一套 | 局部自写当灵活 | 组件出口纪律（`H31`）适用于表格；手写存量按棘轮只减不增并带反例守卫 |
| 详情页把信息全摊开就是「信息全」 | 首屏按事项轴分段，管理动作退到页尾；块数以「一眼看到主路径」为准 | 信息量当信息架构 | 块数判据同样适用于页面（详情页纳入 SD-57 同族）；超限部分折叠到页尾 |
| 同一份数据多给几种排法，用户总能找到顺手的 | 同一问句的另一种排法不立新视图；转置、平铺、矩阵各留一套只会增加选择成本 | 排列当问句 | 视图数按「问句数」计；同一问句的另一种排法并入已有视图的行内展开 |
| 图标用色只要「点缀色允许」就够了 | 同句后半要求「不单独承担状态语义，须同时有文字标签」 | 半句引用 | 带例外的规范须整句引完「允许 ＋ 例外 ＋ 兜底」（判例 `CASE-AI-009`） |

> **落点**：`content/04_web_design/design-system/CASES.md`（CASE-DESIGN-036…041）、`content/05_ai_coding/CASES.md`（CASE-AI-009）、`content/03_doc_system/CASES_INDEX.md`（＋6 design / ＋1 ai，域入口计数同步）、`.ctx/REVIEW_QUEUE.md`（四条新检查要点）、`.ctx/ENGINEERING_ASSESSMENT.md`（§一 / §二 2.1–2.6 / §四 L-12 / §5.2）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/ACTIVE_RULINGS.md §A`、`.ctx/logs/2026-11-EXECUTION_LOG.md`（批次 540）、`.ctx/logs/EXECUTION_LOG_INDEX.md`、`.ctx/TIMESTAMPS.md`。**未改代码 / 测试 / 版本戳，未 commit。**

## D-864 2026-11-10 — 批次 541：全仓漏网之鱼审计与 P2 统一清理

> **评议 → 裁定 → 落点**（支书 2026-11-10 要求「更新批次 541 最终评分与台账」；本批只改文档 / 台账，不改代码、不 commit、不 bump）：
> - **审计口径**：本轮按「全仓漏网之鱼」重扫——页签全量审计、代码健康评审余项与批次 540 收尾 P2 一并进同一张台账，按 **A / B / C / D / E 五类**分拣，**31 条**：A 11（本批已修）· B 11（带触发条件）· C 2（误报关闭）· D 4（重复，并入宿主）· E 3（不构成工程任务，出表）。台账＝`.ctx/evidence/2026-11-10/p2-cleanup-ledger.md`；B 类落 `.ctx/REVIEW_QUEUE.md`（`B-541-1…11`）。
> - **分拣判据（布尔化）**：A 类＝真缺陷或判据被写坏且本批可修；B 类＝事实成立但开通条件未成立，**必须写触发**，触发未成立不得开工；C 类＝复核证据不成立，关闭不再复核；D 类＝与他条重复或已被常驻守卫覆盖；E 类＝不是工程任务（口径 / 节奏 / 冻结件 / 只能支书本人操作）。**禁止把 B 类当 A 类顺手改**，也禁止把 C 类挂账。
> - **本轮修复面**：① P0——今天页定位键改聚合组键 `groupKey`（`today-tab.js`，待办本体 id 不是行键），支书台考勤 / 考察 / 复盘补同义落点（`todo-actions.js`，支书台无该页签时不再落到「意见反馈」）；② 数据——应到口径单一源 `roster-eligibility.js`（滞留保留身份、应到剔除；已转出前置剔除）、服务端按支部 `config.policyOverrides` 算有效策略（`todo-groups.js`）、专班 `sourceType` 写入口径；③ 安全——公共门厅过期 / 缺失有效期一律 404 fail-closed（`public-portal.js`）、定向通知与支委层兜底同时比对支部（`notice.js`）；④ 守卫与判据——`icon-color-guard` 白名单只免生成点、`styles.css` data-URI hex 退场、判例与 `F10` 对齐、SD-62…SD-65 回填、跳转契约改精确等值并补最小 DOM 真渲、首屏块数改结构化计数、议程页禁本地自判；⑤ P2 S 项——制度下发 409、无附件不出下载链、限频表清理、提案迁移 v15 唯一、档案 422、枚举 422、审计基线、F6 误报复核；⑥ `G-1…G-8` 守卫补齐。
> - **六维评分**：业务 **81 → 82**（应到口径 / `policyOverrides` / `sourceType` / P2 数据项修复；**83 不授予**：`L-16` 表决名单重算未闭、D2 / C2 覆盖未扩）；安全 **77 → 79**（过期 `public` 与定向通知越读修复；**80 不授予**：多支部读过滤未接线、`ALLOW_MULTI_BRANCH` 仍关闭、门函数断言未补）；体验 **78 → 79**（A 类 11 条与今日 / 支书台落点落地；**80 不授予**：真人 5 任务签收仍未完成）；测试 **84 维持**（daily **29 文件 / 246 断言 / 101.6s**、guards **101 文件 / 809 tests / 152.9s** 全绿；**85 不授予**：CI 两 job 仍未实跑）；架构 **78 → 79**（待办读权限单源 `todo-read-policy.mjs`、P2 五类台账、契约 / 守卫同批补齐；**80 不授予**：行号 / 版本戳维护成本未降）；部署 **76 维持**（本批不动 `deploy/**` 与运行档，CI `deploy-verify` 未实跑）。
> - **审计未取终摘要**：`audit-tabs --all` 全量超时未出 summary；本次读数沿用守卫代理报告 **P0 0 / P1 0**，并新增 **3 条真实 P2 基线漂移**（`secretary.calendar` 10 vs 3、`secretary.report-up` 14 vs 4、`visitor.activities` 9 vs 3），登记 `L-22` / `B-541-1`，待支书裁定「按 DOM 实测重基线」。**不盲改 `TAB_BLOCK_BASELINE`**。
> - **未选方案**：① 按 DOM 实测直接改三处 `TAB_BLOCK_BASELINE` 把 P2 清零（会把真漂移洗白，且基线是「实测 ↔ 登记」的锚点）；② 把 B 类 11 条并入本批一起改（开通条件未成立，等于绕过触发条件）；③ 用全量审计未跑完为由把 P2 记 0（未覆盖不等于无问题）。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| 全量审计没跑完，先按「无新增问题」记账 | 没跑完只能说明没覆盖，必须显式写出缺口与替代证据来源 | 未覆盖当无问题 | 审计未出 summary 时只认替代报告并标注覆盖缺口，P2 数不得回落 |
| 基线漂移把 `TAB_BLOCK_BASELINE` 改成 DOM 实测就修好了 | 基线是「实测 ↔ 登记」的比对锚点，盲改会把真漂移洗白 | 同步当修复 | 漂移先定口径（重基线 / 收块）再由支书裁定，裁定前不得动基线 |
| P2 清单逐条修完即可清空 | P2 须按 A/B/C/D/E 分拣，B 类留队列并写触发条件 | 修完当关账 | 清账按类落处置；B 类未写触发即视为未分拣 |
| 过期内容只要不在列表里露出就够 | 过期 / 缺失有效期一律视为不公开，服务端 404 fail-closed | 状态标签当权限 | 可见性判据必须进服务端读口，缺一即拒绝，不给探测差异 |
| 定向通知 `audience` 命中即可读 | 定向通知还须比对支部，命中只是必要条件之一 | 命中一项当全条件 | 多条件可见性逐条判，任一缺失即不可读 |

> **落点**：`.ctx/evidence/2026-11-10/p2-cleanup-ledger.md`（分拣与已修勾选）、`.ctx/REVIEW_QUEUE.md`（`B-541-1…11`）、`.ctx/ENGINEERING_ASSESSMENT.md`（§一 / §二 2.1–2.6 / §四 `L-12`·`L-22` / §5.2）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/ACTIVE_RULINGS.md §A`、`.ctx/logs/2026-11-EXECUTION_LOG.md`（批次 541）、`.ctx/logs/EXECUTION_LOG_INDEX.md`、`.ctx/TIMESTAMPS.md`。**未改代码 / 测试 / 版本戳，未 commit。**

## D-865 2026-11-11 — 六维评分保守回调

> **评议 → 裁定 → 落点**（支书 2026-11-11 要求「六维评分更保守」；只改 `.ctx` 文档 / 台账，不改代码、不 commit、不 bump）：
> - **业务与数据 82 → 81**：工作组 / 活动 / 专班三层关系仍有口径冲突（专班是否独立成层、工作组与活动挂靠哪层未统一）；党小组台账判据与专班考勤口径未统一；`L-16` 表决名单服务端重算未闭；D2 只对 3 个计数、C2 在 46 页签 0 pass。批次 541 的应到口径单源、`policyOverrides`、`sourceType` 与四项 P2 数据修复仍计在基线内，不撤销。**需补证据**：三层关系与党小组 / 专班口径判据表落 content、D2 全量分母、C2 逐页签 pass。
> - **安全与权限 79 → 78**：过期 `public` 与定向通知两处越读已修，但多支部读过滤未接线到生产读面、共享口令回退仍在、CI 两个 job 未跑、门函数 ≡ 角色集合断言未补。**需补证据**：读过滤接读面后复核 0 known-risk、门函数断言、共享口令退出回退的部署证据、CI run id。
> - **最小三成本体验 79 → 78**：P2 三处真实块数漂移（`secretary.calendar` 10 vs 3、`secretary.report-up` 14 vs 4、`visitor.activities` 9 vs 3）说明块数口径可漂移而未被日常审计发现；真人 5 任务签收未完成。**需补证据**：`L-22` 裁定后块数不再漂移、真人签收 5 个用户任务（签收人 ＋ 日期）。
> - **测试与发布质量 84 → 83**：daily **246 断言 / 101.6s**、guards **809 tests / 166.3s** 全绿，但 CI 两个 job 未实跑；P2 基线漂移说明审计仍有盲区。**需补证据**：CI 首跑绿（run id / 日志）、P2 裁定后基线稳定。
> - **架构与可维护性 79 → 78**：对象模型（工作组 / 活动 / 专班 / 党小组）边界未定，三层挂靠关系仍在台账、读面与设计稿各写一份；待办读权限与应到口径两条单源已改善。**需补证据**：对象模型边界判据表、行号 / 版本戳维护成本下降的读数。
> - **运行、部署与跨组织复用 76 维持**：无新增目标环境证据，`deploy/verify-linux.sh` 6/6 读数继续有效。
> - **未选方案**：① 维持 `D-864` 分数只加注（同批证据已指出多层口径未统一，只加注等于不回收）；② 只回调个别维度、其余维持（同源证据跨维，分维口径不一致）；③ 顺手改代码 / 测试 / 契约把分补回来（越出「只改 `.ctx` 台账」授权）。三条均不取。
> - **证据卡**：

| AI 假设 | 人类意图 | 偏差类型 | 泛化规则 |
|---|---|---|---|
| 三条单源收口即可代表对象模型已经定清 | 工作组 / 活动 / 专班 / 党小组的层级与挂靠关系仍是各写一份，单源只覆盖其中一条链路 | 局部单源当全局定清 | 对象模型的加减分以「层级与挂靠关系有一份判据表」为准，不以单条链路收口替代 |
| 权威读数全绿即可维持高分 | 审计仍有盲区（P2 三处真实漂移未被日常发现），CI 未跑即无跨环境证据 | 读数全绿当覆盖完整 | 测试 / 体验分须同时给「绿读数 ＋ 覆盖盲区 ＋ CI 读数」，缺一不得维持原分 |
| 多支部开关关闭、写门未放宽即可按原分记账 | 读过滤未接线、共享口令回退仍在，风险仍在生产侧 | 未放宽当已闭环 | 安全分按「风险项是否闭环」计，不以「本批没有放宽」计 |
| 上批给过的分默认延续 | 分是当前证据的成熟度，证据不足即回调 | 存量分数当既得 | 每轮按证据重算，回调必须写「为何回调 ＋ 需补证据」，不得静默保留 |

> **落点**：`.ctx/ENGINEERING_ASSESSMENT.md`（§一 六维与证据行 / 阻断风险注 / §二 2.1–2.6 / §5.2）、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/ACTIVE_RULINGS.md §A`、`.ctx/logs/DECISION_LOG.md`（月度索引）、`.ctx/TIMESTAMPS.md`。**未改代码 / 测试 / 版本戳，未 commit。**
>
## D-866 2026-11-11 — 产品对象模型 / 组长权限 / 上会广播 / URL 形态

> **评议 → 裁定**（支书 2026-11-11 四项选择；本条目只记录裁定，不含实现）：
> - **工作组对象模型**：采纳「**党小组 → 活动 / 专班 → 工作组**」三层；工作组不设「指导支委」。与仓库现状的差异：现行 `DATA_MODEL` 把活动 / 专班当业务层、工作组当执行载体、党小组当独立组织单元，三层顺序与挂靠关系没有一份判据表；本裁定把党小组置为组织归属层，活动 / 专班挂 `hostGroupId`，工作组挂活动 / 专班 `workgroupId`，不再加指导支委字段。
> - **党小组组长**：采纳 A「组内全权 ＋ 支部提案」：本组活动建 / 改 / 考勤 / 材料 / 归档 / 通知 / 工作组全权；支部级活动只可提案，不直接发布。
> - **上会与广播**：采纳 A「统一上会事项 ＋ 回执」：保留八类来源；状态 `pending→queued→on-agenda→decided→closed/rejected`；回执到提案人，排期到支委，决议通知支委 ＋ 提案人 ＋ 受影响人；建会收口支书 / 副支书，其他支委可提案。
> - **URL 形态**：采纳 B「去后缀 ＋ 兼容」：服务端已支持无后缀（`express.static extensions:['html']`）；只改链接生成层 `page-url.js` / `object-route.js`，旧 `.html` 保持 200，不做 301、不目录化、不改 SPA，开关可回滚。
> - **未选方案**：工作组 B 活动容器 / C 统一 WorkItem；组长 B 提案＋支书发布 / C 共管；上会 B 只支委可报 / C 任何角色＋附议；URL A 只美化手输 / C 彻底 SPA。理由见 2026-11-11 产品调研：B/C 分别带来专班表合并、第二套报备、提案实体与迁移成本；A URL 不解决站内链接，C 会触发 26 页入口与冻结件重做。
> - **落点**：待写产品设计稿（对象模型判据表、权限矩阵、上会状态机、URL 生成单一源）；本条目**未改代码 / 未 commit / 未 bump**。

## D-867 2026-11-11 — 三项子裁定 ＋ URL B 实施

> **评议 → 裁定 → 落点**（支书 2026-11-11 三项追问的选择；URL 取「先做」）：
> - **支部级专班**：存在。`taskforces.hostGroupId` 可空；支部级专班 `organizingScope='branch'`、`hostGroupId=null`，承办方记为支委会；与支部级活动同构。
> - **决议默认受众**：支委层 ＋ 提案人 ＋ 受影响人；全支部知悉须由支书在记录决议时显式勾选。
> - **组长提案可见性**：全体支委可见（统一事项池）；事项池读权限保持 `requireCommissioner`，组长只新增提交口。
> - **URL B 实施**：`page-url.js::pageHref()` 为唯一后缀变换；`resolveDocumentUrl()` 内联调用；`object-route.js` 详情页去后缀；登录 / 登出 / 深链 / 跨台重定向等 `location` 调用统一经 `pageHref()`；`link-normalize.js` 在侧栏与登录页安装，对初始 DOM 与新增节点统一改写站内锚点。`help` / `about` 冻结面跳过；旧 `.html` 保持 200，不做 301；回滚只改 `URL_STYLE`。
> - **未选方案**：① 只改静态 `href`（`docs` 内 375 处 / 100 文件，测试断言 751 处，分类成本与回归面过大）；② 301 到无后缀（地址栏仍显示 `.html` 的旧链接不会变短，且多一次跳转）；③ 彻底 SPA（越出本轮范围，触发 26 页入口重做）。
> - **读数**：`test:guards` **101 文件全绿 / 101.8s**；`test:daily` **29 文件 / 246 断言 / 73.7s** 全绿；真机（Playwright）登录后 URL＝`http://localhost:3000/workspace/secretary?tab=today`，站内 `.html` 锚点剩余 **0**（`help` / `about` 除外）。
> - **落点**：`docs/src/core/base/page-url.js`、`docs/src/core/base/link-normalize.js`（新）、`docs/src/core/domain/object-route.js`、`docs/src/components/shell/{sidebar,header,tab-bar,workspace-shell}.js`、`docs/src/entries/**` 重定向点、`server/test/**` 期望值；设计稿 `content/04_web_design/evolution/OBJECT_MODEL_AND_COMMITTEE_FLOW.md §五 / §七`。

## D-868 2026-11-11 — 对象模型落地（专班承办方 + 工作组挂靠唯一）

> **评议 → 裁定 → 落点**（支书要求「研究清楚活动 / 专班 / 工作组关系」后实施）：
> - **关系定案**：活动与专班是两类并列业务对象，互不挂靠；工作组是二者各自 1:1 的执行载体，不是第三类业务对象，也不是中间层；党小组是承办归属层。
> - **专班补字段**：`organizingScope`（`party-group|branch|null`）、`hostGroupId`（条件必填）、`legacyScope`（历史缺省标记）、`scopeFilledBy/At`（补选留痕）。新记录必须显式选择承办方，不猜；历史缺省显示「待补」，由组织委员 / 支书一次性补选后锁死。
> - **工作组挂靠**：`kind === sourceType`、`sourceId` 非空且指向同支部真实行；不新增 `activityId/taskforceId` 第二套键。
> - **专班不产生考勤**：`work-map.js` 专班产出改为 `['考察','材料']`。
> - **落点**：`content/04_web_design/data/DATA_MODEL.md §附二`、`server/routes/resources/workgroup-routes.js`、`server/routes/resources/index.js`、`docs/src/services/activity/taskforce.js`、`docs/src/entries/tabs/org/taskforce-tab.js`、`docs/src/core/domain/work-map.js`、`server/test/object-model-guard.test.mjs`。

## D-869 2026-11-11 — 支委提案（统一上会事项）与回执

> **评议 → 裁定 → 落点**：
> - **实体**：新增 `committee_proposals` / `committee_proposal_events`（schema v16，运行时域，种子为空）。
> - **状态机**：`pending → queued → on-agenda → decided → closed|rejected`；纯函数单一源 `docs/src/core/domain/committee-proposal.js`，非法迁移返回 `null`。
> - **权限**：组长 / 副组长可提；支委可受理 / 驳回；支书 / 副支书可排期 / 决议 / 归档；来源对象与会议均须同支部。
> - **议程**：只收 `queued` 提案，按现有「意见反馈」类落池，附 `proposalId/proposedBy`，不新增第九类。
> - **回执**：6 个系统通知 kind；提交 → 支委层，受理 / 驳回 / 归档 → 提案人，排期 / 决议 → 支委层 ＋ 提案人 ＋ 受影响人。
> - **决议回写**：`passed` 且无 `sourceId` 时生成同支部 `draft` 活动 / 专班并回指；已有对象不改状态，避免绕过既有审批门。
> - **落点**：`server/routes/committee-proposals.js`（新）、`server/db.js` v16、`server/data/domain-contract.mjs`、`server/system-notice-kinds.js`、`server/routes/system-notices.js`、`server/routes/committee.js`、`docs/src/services/governance/committee-proposal.js`（新）、`docs/src/entries/tabs/{leader/overview-tab,secretary/committee-meeting-tab}.js`、`server/test/committee-proposal-{state,routes}.test.mjs`。

## D-870 2026-11-12 — 三台专项探查 P0 收口

> **评议 → 裁定 → 落点**：
> - **提案 ↔ 议程单一事实**：`decide` 在事务内回写会议议程项 `result`；`recordAgendaResult` 对 `kinds:['proposal']` 只转发 `decide`，不二次写；排期幂等；`canRead` 纳入 `affectedPersonIds`。
> - **支委会写门**：建会 / 改议程 / 记录决议仅支书 / 副支书（党委 `party-staff` 保留入口）；普通活动写权不动，进一步收紧留丙部。
> - **报表读权**：`GET /report/export`、`GET /report/:domain` 收为支书 / 副支书 / 组织委员 / 党委；宣传与纪检委员不默认放开。
> - **宣传台闭环权**：看板移除「确认完成」，活动结束权归组织者 / 支书；专班收尾提示保留。
> - **组长进展读口**：组长仅本组、支委层看支部、其他角色 403；组归属单一源 `party-group-scope.js`。
> - **Harness**：M7/M8 迁移期望由 `SCHEMA_VERSION` 派生；S6 台账行号全量同步；新增写门矩阵 evidence 行号守卫。
> - **未选**：报表放开给全部支委（隐私面过大）；建会写门连普通活动一并收紧（误伤归档 / 议程链）；组长范围算法本批迁服务端（改动面过大，只先加读门）。
> - **落点**：`server/routes/committee-proposals.js`、`resources/gates.js`、`resources/index.js`、`report.js`、`leader-progress.js`、`docs/src/services/activity/agenda-follow-up.js`、`docs/src/services/governance/committee-proposal.js`、`docs/src/entries/tabs/prop/kanban-tab.js`、`docs/src/core/domain/party-group-scope.js`（新）、`server/test/{committee-flow-guard,committee-meeting-gate,report-read-gate,leader-progress-gate,prop-kanban-scope,write-policy-evidence-guard}.test.mjs`（新）。

## D-871 2026-11-13 — 547 边界闭环（真机流程 / 消息页 / issue-unread）

> **评议 → 裁定 → 落点**：
> - 专班三条真机流失败根因＝写块在默认收起的 `<details>` 内；修测试 `open` 链先点 `summary`，不改产品。
> - `messages-entry.js` 使用 `emptyStateHtml` 漏 import，独立页抛 `pageerror`、写私信按钮不渲染；补 import。
> - `issue-unread` 的 `secretary-review` 保留键此前只允许提交人 / 被指派人写；清支书角标是支书 / 副支书的读后动作 ⇒ 允许其写 `unread:false`，其余角色仍 403。
> - 落点：`server/test/form-loop-registry.mjs`、`docs/src/entries/pages/messages-entry.js`、`server/routes/resources/semantic-routes.js`、`server/security/write-policy-matrix.mjs`、`server/test/issue-unread-gate.test.mjs`。

## D-872 2026-11-13 — L-16 表决名单采「建会冻结快照」

> **评议 → 裁定 → 落点**：支书在对话中裁定：建会时按 `users` + 组织归属算一次 `voteConfig.voterIds` 并冻结；会议期间不随组织变动，组织变动下次建会生效。**未选**：每次读时重算（同一会议名单前后可能变化，需处理已投票但失去资格的人）；冻结+变更重算（实现与审计最复杂）。落点：`server/routes/committee.js`（待实现）、`.ctx/REVIEW_QUEUE.md` `B-541-5`、`EA L-16`。

## D-873 2026-11-13 — L-22 / B-541-1 三处 IA 块数按实测重基线

> **评议 → 裁定 → 落点**：支书在对话中裁定：`secretary.calendar` 10 / `secretary.report-up` 14 / `visitor.activities` 9 按 DOM 实测重基线，改 `TAB_BLOCK_BASELINE` 三处并复核例外理由。**未选**：收拢 UI 到 3/4/3（改动面大、可能删有用入口）；分页签处理（需逐页评审）。落点：`server/test/style-baseline.mjs::TAB_BLOCK_BASELINE`（待实现）、`.ctx/REVIEW_QUEUE.md` `B-541-1`、`EA L-22`。

## D-874 2026-11-14 — D-873 复核：三处块数 10/14/9 为探针误报，改探针口径、基线不改

> **评议 → 裁定 → 落点**：实现 D-873 前先证伪——`10 / 14 / 9` 逐条拆开是行内节点：`secretary.calendar` 10 = 9 个图例行内 `span` + 1 张卡；`visitor.activities` 9 = 8 个 SVG 节点（`line`/`rect`/`circle`）+ 1 张卡；`secretary.report-up` 14 = 3 张卡 + 1 个 `.disclosure-host` + 10 个列表行内 `span`/`p`。根因：`dom-probe.mjs::expandBlocks` 把「无子元素的行内叶子」也 push 成顶层块，与自身口径（块＝语义容器）不符。支书裁定「先修探针再按真实块数复核」→ 探针改为「子树有语义容器就只认语义容器；一个都没有时容器整体算 1 块」；修后实测 **2 / 4 / 2**（差额落在表头口径：基线含页头、探针排除页头），三处均 ≤ 4，按 `D-838` 保持 `TAB_BLOCK_BASELINE` 不改，L-22 / `B-541-1` 以「探针误报」关闭。**未选**：按字面登记 10/14/9（把行内元素固化成块定义，日后密度问题不告警）；只修探针不关 L-22（留僵尸条目）。落点：`server/scripts/audit/dom-probe.mjs`、`.ctx/evidence/2026-11-14/d873-block-remeasure.md`、`.ctx/ENGINEERING_ASSESSMENT.md §四 L-22`。

## D-875 2026-11-14 — 提交 / 分支 / 台账三项纪律加固

> **评议 → 裁定 → 落点**：支书指出三处 harness 缺口并裁定：① **提交粒度**——每批 1–3 个按逻辑拆分的 commit（学批次 515 / 516），禁止为回填 hash 追加第二个 commit；执行日志不落 commit hash，改动事实用 `git log --grep "批次 N｜"` 检索；收尾跑 `server/scripts/check-batch-commits.mjs` 自检。② **分支与合并**——`release/2026-11-launch` 自批次 523 累积、30 commit 领先 main 且无远端；取「达标后合并回 main」：合并门槛＝六维均 ≥80 ＋ `test:full` 绿 ＋ `audit-tabs --all` P0/P1=0 ＋ 支书确认；合并后回 main 直做，下一个发布点再开新分支；push 必须支书确认。③ **乙部门槛**——`B-500-7b-2` 与 `B-522-1` 标注「六维均 ≥80 后启动」（当前 81 / 78 / 78 / 83 / 78 / 76）。**未选**：立即合并（失去发布隔离、回滚粒度粗）；长期续用同一条 release 分支（main 长期滞后）；把 5 条 perf P2 升级为真问题（真机重测 p50 2–3ms、不复现）。落点：`CLAUDE.md H20.3 / H20.5 / H26.1 / 乙部`、`content/05_ai_coding/{DOCUMENT_GOVERNANCE,CONTEXT_MANAGEMENT}.md`、`server/scripts/check-batch-commits.mjs`、`.ctx/evidence/2026-11-14/p2-perf-recheck.md`、`.ctx/ACTIVE_CONTEXT.md §1 / §3`。

## D-876 2026-11-15 — 删除活动保留报名 / 表决留痕行 + 活动快照

> **评议 → 裁定 → 落点**：跨层专项发现活动删除事务级联物理删除 `signups` 与 `agenda_votes`，与既有判据「报名记录须保留；只能撤回 / 取消 / 作废，不得物理删除」冲突。支书裁定取「**保留留痕行 + 快照**」：删除活动时两类行不删，同事务写入 `activitySnapshot { id, title, date, type, scenarioId, deletedAt }`，活动本身仍可物理删除；匿名表决仍不得出现 `personId→选项` 映射。**未选**：禁止删除有记录的活动（支书误建时清理成本过高）；活动软删除（读口 / 导出 / 统计全要加过滤，改动面最大）。落点：`server/routes/resources/index.js::deleteActivityCascade`、`docs/src/data/mock-adapter.js`（前端 mock 同口径）、`README-server.md §5.5/§6.1`、`content/04_web_design/data/DATA_MODEL.md`、`server/test/activity-delete.test.mjs`。

## D-877 2026-11-15 — 六维按行业基线严格重评（门槛不降，本批不合并）

> **评议 → 裁定 → 落点**：支书令「重新探查评分，用行业要求约束，做到批判性、严格、不过度自信，该下调就下调；门槛不降」。按 `ENGINEERING_ASSESSMENT §一 行业基线` 重打：业务 **76**（81→76）、安全 **68**（78→68）、体验 **72**（78→72）、测试 **70**（83→70）、架构 **72**（78→72）、部署 **65**（76→65），**六维均 <80 ⇒ 不满足 `H20.5`，未合并回 main**。硬扣分：`npm audit --omit=dev` 4 条（1 critical `proxy-addr` / 2 high `body-parser`·`nodemailer` / 1 moderate `qs`）；CI 仅 `daily.yml`（precommit/full/audit 未进 CI）；`test:full` 1489s > H25 1200s；`L-02` Linux 真机未验；无 observability；无 a11y 常驻守卫；双算派生未摘（`B-500-7b-2`）。**未选**：维持旧分（掩盖 critical 依赖与 CI 缺口）；为凑合并门槛上调（违背支书「该降就降」）。落点：`ENGINEERING_ASSESSMENT §一/§二`、`.ctx/ACTIVE_CONTEXT.md §1/§3`。

## D-878 2026-11-15 — 六维补齐后重评：78 / 78 / 78 / 74 / 76 / 74（仍 <80，继续不合并）

> **评议 → 裁定 → 落点**：支书批准 `close-six-dim-gaps` spec，按「M1 敢用 → M2 好用 → M3 可交接」补齐；补完按**同一行业基线**重评：业务 **78**、安全 **78**、体验 **78**、测试 **74**、架构 **76**、部署 **74**，**六维仍均 <80 ⇒ 继续不合并回 main**（门禁不降，不为凑分上调）。已补证据：`npm audit --omit=dev` **0**；46 页签 **P0 0 / P1 0 / P2 0**（审计工具修复后 191s 真实读数）；匿名 `GET /archiveRecords` 越读修复；支部解析 fail-closed 且 `todo-groups` 与 `todos` 同判；党委进入支部服务端只读（403 `readOnly:true` 四条写口实测）＋ `branch_visits` 留痕（v17）；结构化日志 / 浅深健康检查 / 指标 / 30 分钟节流告警 / 备份每日巡跑 / systemd unit＋timer；恢复演练 57 表 · 864256 B · integrity 前后各一次 ok · exit 0；daily **254**、guards **109 文件 / 836**、夜间四片矩阵已配置。**未给 80 的四条硬缺口**：① CI 无 run id（未推送）、无安全扫描；② `test:full` 自 1489s 后未重跑、无覆盖率、flake 无隔离；③ `L-02` Linux 真机 install/update/preflight 未验、timer 未实触发；④ 共享口令回退（`L-11`）、routes 仍 87 处 / docs 77 处回落未清、无类型检查、真机签收（T11）未完成。**未选**：按「大部分完成」给 80（违背支书「该降就降、门槛不降」）；把多支部整体关掉当完成（违背「N=1 是特例」裁定）。落点：`ENGINEERING_ASSESSMENT §一/§二`、`.ctx/ACTIVE_CONTEXT.md §1/§3`、`.ctx/logs/2026-11-EXECUTION_LOG.md` 批次 554–558。

## D-879 2026-11-16 — 壳层顺手与「数字说真话」：六维 79 / 79 / 80 / 75 / 77 / 74（仍不合并）

> **评议 → 裁定 → 落点**：支书自查指出「页头与页签命中区偏小、侧栏与页签 12px」，并令其后的全栈探查继续找出可改进点。三路取证后逐条请支书裁定：壳层**全局**（页头 / 页签 / 侧栏页脚两档 44px＋13px，卡片与表格分批）；计算**八条全修**；三处支部越权**本轮一并堵**；列表**硬上限 2000 ＋ 水合不截断**（支书质疑 500 过小：200 人支部年考勤约 6000 行）。业务口径四条另裁：未录＝「待录入」且导出留空、表决分母保持冻结并单列「已转出，不计」、`in_progress` 不计逾期但单列「已过截止」、上报按本地日＋CSV 日期列。**落点**：`docs/src/styles.css`、`components/shell/tab-bar.js`、`core/base/date.js`、`services/governance/secretary-overview.js`、`services/activity/{attendance,vote-config,committee-vote}.js`、`server/services/reporting.js`、`server/routes/{uploads.js,resources/{index,gates,semantic-routes,write-validation}.js}`、`server/test/{date-canon-guard,multi-branch-five-proof,resource-write-validation-guard}`。**结论**：六维 **79 / 79 / 80 / 75 / 77 / 74**，仍有四维 <80（架构 77 / 测试 75 / 部署 74 / 业务·安全 79）⇒ **继续不合并**。**未选**：只改移动端（两档分叉）；统一 500（数据截断风险）；把「已转出」按实时应到重算（表决结果不可回溯）。

## D-880 2026-11-17 — 字段错配 / 安全边界 / help / 乐观锁：六维 81 / 80 / 81 / 76 / 78 / 74（仍不合并）

> **评议 → 裁定 → 落点**：支书令「继续查前端、后端、计算与显示逻辑，特别是姓名写成学号这类张冠李戴；更新 help 对齐前沿能力」。三路只读审计（字段错配 / help / 全栈逻辑）后逐条请支书裁定：① 五项字段错配**全修并加契约字段守卫**；② 契约枚举冲突**以实现为准改契约**（`branches: active|inactive`、工作组成员 `active|removed`）；③ 并发整行覆盖做**全资源 `If-Match`**（缺头 428 / 过期 409＋`latest`），`updatedAt` 打底取**应用层回填＋写路径统一**（不加 schema 列）；④ 批次拆为 **562（正确性与安全）/ 563（help）/ 564（乐观锁）** 三条 commit；⑤ help **功能/流程优先、技术压后**；⑥ 三项偏好（空态下一步、门厅截断提示、跨组口径服务端化）全部纳入。**落点**：`docs/src/services/{governance/todo,member/person,governance/issues}.js`、`components/record/{report-inbox,report-entry,other-groups-view,insight-view,todo-tab-shell}.js`、`data/{api-adapter,data-adapter}.js`、`server/data/domain-contract.mjs`、`server/routes/{report,public-portal}.js`、`server/routes/resources/{index,semantic-routes,write-validation}.js`、`server/db.js`（`backfillUpdatedAt`）、`server/server.js`、`docs/help.html`、`server/test/{contract-field-usage-guard,if-match}.test.mjs`。**结论**：六维 **81 / 80 / 81 / 76 / 78 / 74**，仍有三维 <80（测试 76 / 架构 78 / 部署 74）⇒ **继续不合并**。读数：daily **32 文件 / 259 断言 / 100.5s**；guards **111 文件 / 381 项 / 153.3s** 全绿；`If-Match` 真机三态 428 / 409＋`latest` / 200；跨组汇总 32/10、0/0、4/1（实到 ≤ 应到）。**未选**：只修显示可见错配（契约枚举暗雷保留）；以契约为准改实现（历史行迁移成本）；只加 `updatedAt` 不加锁（并发丢字段仍在）；help 只修错不补能力（帮助页继续落后）。**边界**：动作型语义 PATCH 与聚合根行不强制 `If-Match`（由状态机留痕与集合级 `_versions` 承担）；`test:full`、CI run id、Linux 真机仍未补。

## D-881 2026-11-18 — 审计 P0 清零 / B-552 / 全栈专项：六维 82 / 80 / 82 / 76 / 79 / 74（仍不合并）

> **评议 → 裁定 → 落点**：支书令「再查全仓待办与 P0/P1/P2 是否真问题；有判例按判例，无判例就问；无急件则做前端 / 后端 / 全栈 / 计算专项」。盘点结论：唯一阻断是**本仓自己引入的审计 P0 23**（564 上 If-Match 后驱动仍发裸 PATCH）。两项无既有判例事项经支书裁定：① 报名查重**加 v18 唯一索引＋保留最早一条、其余标 `duplicateOf` 不删**；② 44 条审计例外**发布前同批复核＋三类归档**。其余按既有规则处理：`D-849` 一实例一支部（L-10 不升 P1）、`L-11` 共享口令维持回退、`H30` 一改具改（台账三套值统一）、`H25` full 红项分诊（环境 / 陈旧 / 真回归）。**落点**：`server/scripts/audit/{checks-crud,checks-data}.mjs`、`server/test/audit-write-version-guard.test.mjs`、`server/db.js`（v18）、`server/routes/resources/{index,semantic-routes,signup-write-guard,write-validation}.js`、`server/routes/{committee,committee-proposals,system-notices,leader-progress,uploads}.js`、`docs/src/{data/api-adapter,services/activity/attendance,components/record/report-inbox,components/governance/activity-progress,components/ui/list-filter,core/base/utils}.js`、`content/04_web_design/data/{DATA_CONTRACT,DATA_MODEL}.md`、`.ctx/evidence/2026-11-18/`。**结论**：六维 **82 / 80 / 82 / 76 / 79 / 74**，仍有三维 <80 ⇒ **继续不合并**。读数：daily **261 / 127.0s**；guards **112 文件 / 385 项 / 158.0s**；`audit-tabs` **P0 0 / P1 0 / P2 2 / exception 44**；`test:full` 1779s（红项已逐文件分诊修复，未整体重跑）。**未选**：只修 P0 不做专项（支书要求推进）；把性能两项（门户附件全表解析、考察 N+1）一并重写（无判据、改动面大，登记触发条件）；把例外复核做成每日守卫（支书记已裁定不新增）。**边界**：`test:full` 与 CI run id、Linux 真机仍未补。

## D-882 2026-11-19 — 丙部四项裁定落盘（多支部转架构审计 / 生产只走个人密码 / 例外归类 / 性能取乙）

> **评议 → 裁定 → 落点**：支书令「丙部直接在对话框问、给足上下文、落盘后清理 CLAUDE」。四项逐条询问并获裁定：
> - **P-1（多支部）**：支书原话「这还是接入 mock 数据阶段下的考虑对吗？……我们的系统【架构】（框架而不是内容）是否隔离好了多支部？」⇒ 议题从「产品档位」转为**架构级多支部隔离审计**（只读取证，26 条 `file:line`）。结论：**读 / 写 / 报表面已收口**（`server/routes/resources/branch-scope.js:346-441`、`:305-311`、`:443-458`；`server/routes/report.js:80`；`server/routes/todo-groups.js:164`；`server/routes/leader-progress.js:85-106`），通用读口未登记域 fail-closed（`branch-scope.js:298`），双支部夹具在位（`server/test/multi-branch-five-proof.test.mjs:24-60`、30 个测试文件用 `br-b2`）。**但仍存在四条 P0 框架缺口**：① 集合版本键无支部维度——`collection_versions(name PRIMARY KEY)` 全局键（`server/db.js:69`、`server/routes/resources/snapshot-versions.js:84-104`），两支部互相触发 409 并泄露写入节奏；② 身份模型单支部——`sessions` 无支部列（`db.js:47-51`）、`users.branchId` 单值（`domain-contract.mjs:88`）、每请求现取（`auth.js:45-47`），无兼跨支部路径；③ 公共门厅只认党委 owner（`server/routes/public-portal.js:125,136`、`server/routes/public-info.js:35`）；④ 附件表无支部列（`db.js:52-59`），下载按上传人当前支部反推（`uploads.js:113-127`），归属随人员变动漂移。**P1**：12 域 `br-b1` 白名单回落且显式 `branchId:null` 也走回落（`branch-scope.js:23-36`、`:288-299`）；路由内 `|| DEFAULT_BRANCH_ID` 实测 **85 处 / 12 文件**（既有「87 处」口径须复核）；约 44 表无 DB 级下推；`publication_audits` 无支部列。**裁定**：`L-10` 维持 post-launch、不升 P1（一实例一支部下无风险），缺口由 `B-568-1` 承载；`ALLOW_MULTI_BRANCH` 开关条件不变（`D-849`）。
> - **P-2（共享口令）**：支书原话「真实采用一定是用个人密码！我期待的是统一数据倒闸换轨，应该为倒闸换轨做好准备」⇒ **生产与换轨路径只用个人密码**，共享口令仅演示；补齐换轨前置检查与 runbook（缺个人密码即告警 / 阻断），`B-568-2`。
> - **P-3（审计例外归类）**：取 **甲**——两条 C2 同归「驱动跳过」，台账不再拆第三类。
> - **P-4（两项性能）**：取 **乙**——本批做 `/portal` SQL 投影（排除附件正文，接下载同源限频）与考察行级权限 id 集下推（照 `server/routes/leader-progress.js:85-106` 先例），`B-568-3`。
> **未选**：P-1 按产品档位只在甲 / 乙 / 丙间选（支书已把问题提到框架层，档位选择回答不了）；P-2 保留共享口令到上线后稳定版（与「换轨只用个人密码」冲突）；P-3 拆「无配方」第三类（只影响台账精度）；P-4 等触发（支书已定本批做）。**落点**：`CLAUDE.md` 乙部 `B-568-1…3`、丙部清空；`.ctx/ACTIVE_CONTEXT.md`；`.ctx/ENGINEERING_ASSESSMENT.md §四 L-10 / L-11`。

## D-883 2026-11-19 — 六维保守重校（80 / 78 / 79 / 73 / 76 / 71）＋ 历史值隔离规则 `H26.5`

> **评议 → 裁定 → 落点**：支书批注「对于评分一定不要过于乐观！保持谨慎！」。按同一证据、按未闭项折算重校，**只下调不上调**：业务 **82 → 80**、安全 **80 → 78**、体验 **82 → 79**、测试 **76 → 73**、架构 **79 → 76**、部署 **74 → 71**；六维均 <80 ⇒ 继续不合并（门槛不降）。
> - **业务 80**：审计 P0 已清零、读口全 2xx 属实；但 D2 计数对账仅 3 页签、C2 写口往返 0 pass、三层（党小组 / 活动·专班 / 工作组）判据表仍未落 content、宽表无业务索引。原 82 把「工具与一次性修复」计成了「业务正确性成熟」。
> - **安全 78**：矩阵 162 条 / 0 known-risk、个人密码 21/21 属实；但多支部四条 P0 框架缺口在（`D-882`）、共享口令回退仍在、CI 两个 job 无 run id、矩阵未断言门函数 ≡ 角色集合。原 80 未扣「框架层未隔离」。
> - **体验 79**：46 页签 P0/P1 = 0 属实；但 44 条 exception 无固定复核节奏、真人 5 任务签收未做、`B-522-1` 低密度卡与空态未做、a11y 存量未清。原 82 以自动走查替代真人验收。
> - **测试 73**：daily 261 / guards 385 全绿属实；但 `test:full` 1779s 红项修复后**未整体重跑**、CI 无 run id、Linux 真机未验、无覆盖率、flake 无隔离。原 76 距行业基线仍差四项。
> - **架构 76**：三条单一源与四个测试 runner 属实；但路由回落实测 85 处、双算派生未摘、多支部请求级上下文未建、express 5 被守卫耦合阻塞、无类型检查。原 79 未扣多支部框架缺口。
> - **部署 71**：`verify-linux` 6/6、空库 `preflight --strict` exit 0 属实；但 `L-02` 真机未验、`deploy-verify` 无 run id、timer 未实触发、告警外部送达未验、单节点 SQLite、附件与会话手工搬、共享口令不得进生产。原 74 只靠容器等价读数。
> **同批立规**：`CLAUDE.md` 新增 **`H26.5` 历史值隔离**——active 与 reference 台账同一指标只留一个当前值 ＋ `D-xxx` 指针，历史值只进 `.ctx/logs/` 与 git；守卫 `ctx-hygiene-guard::⑪`（历史标记与评分元组同行即红、六维元组每文件至多一处、`ENGINEERING_ASSESSMENT §一` 不得再开「重评 / 旧评分」小节）。**清理**：`ACTIVE_CONTEXT` 三处旧元组、`ACTIVE_RULINGS` 旧元组与「47 表」、`ENGINEERING_ASSESSMENT §一` 五个「重评」小节与「旧评分」段迁出（正文保留在 `D-877…D-881`），§二 六个小标题同步当前值。
> **未选**：维持 82 / 80 / 82 / 76 / 79 / 74（与未闭项不符，支书已明确批注）；为凑合并门槛上调（违背「该降就降」）；把六维改成一个总分（`D-862` 已禁平均）。**落点**：`.ctx/ENGINEERING_ASSESSMENT.md §一 / §二 / §5.2`、`.ctx/ACTIVE_CONTEXT.md §1 / §2`、`.ctx/ACTIVE_RULINGS.md §A`、`CLAUDE.md H26.5`、`server/test/doc-lifecycle-guard.test.mjs::⑪`。

## D-884 2026-11-19 — 一次清仓：规则硬冲突 4 条＋软冲突 9 条清零，G1/G2 守卫与历史基线

> **评议 → 裁定 → 落点**：支书令「一次查清全仓待办 / P0/P1/P2；有规则按规则，无规则先 grill；原则、规则、判例要完备且无冲突；先解冲突、再清余毒；按阶段执行并清理 active context」。三路只读审计（spec 未勾 / 代码残留与数量 / 规则冲突）后，按 `H30` 先裁后清：
> - **硬冲突 4**：① 四层名称以 `test-tier-registry.mjs` 单一源为准 ⇒ `daily/guards/precommit/weekly`，`test:full` 改为「跨层全量 runner」；② 生产共享口令以 `D-882` 为准 ⇒ `ACTIVE_CONTEXT` / `EA L-11` / `server/README` 改「生产不回退，仅非生产演示」；③ commit 上限以 `H20.3` 为准 ⇒ `DOCUMENT_GOVERNANCE` 改「最多两条」；④ 矩阵条数以代码为准 ⇒ `server/README` 141 → 162。
> - **软冲突 9**：审计 canon / playbook / guard inventory 不再写死 P2 与 exception 条数（改指 evidence）；>4 块页签拆成「基线分母 14 / 实际超限 6」；guards 区分「runner 项数 385」与「静态调用点预算 837/860」；`.ctx` 白名单 9→10；党委台页签 5→4；`26=18+8` 与 `15 独立页入口` 加口径标签；EA 旧「809→335」删除；`F6–F9`→`F6–F10`；`45`→`46`。
> - **新守卫**：`single-fact-consistency::G1`（矩阵 / 表数 / 页签 / 党委台页签 / 白名单 / 四层名 ≡ 代码，含反例自证）、`spec-task-consistency::G2`（父项已勾而子项未勾的台账噪声，历史 525 处按「checklist 回勾 ＋ 错父项改 `[ ]`」清零后基线置空，只减不增）。
> - **提交自检**：支书裁定「设历史基线」——`check-batch-commits --limit 1` 为收尾门禁；`--limit >1` 只作历史体检，历史 6 条告警不追罚、不改写 message。
> - **规则与判例**：新增 `H10.8`（特例三档：有规则 / 有原则无细则 / 无原则→丙部 grill）、`H30`「先裁后清」；新增 `CASE-AI-010`（同一指标多值并存）。
> **未选**：一次性把 15 个 spec 的 525 处子项全部回勾（会产生大量未经核对的假勾）；只清文档不建守卫（下轮必复发）；把历史 6 条 commit 追补改写（违反 `H26.1`）。
> **落点**：`CLAUDE.md`（`H10.8` / `H25` / `H30` / `H20.3`）、`server/README.md`、`content/05_ai_coding/{DOCUMENT_GOVERNANCE,AUDIT_CANON,TAB_AUDIT_PLAYBOOK,GUARD_INVENTORY,CASES}.md`、`content/03_doc_system/CASES_INDEX.md`、`content/04_web_design/contracts/PARTY_COMMITTEE_DESIGN.md`、`server/test/{single-fact-consistency,spec-task-consistency}.test.mjs`、`server/test-tier-registry.mjs`、`.ctx/{ACTIVE_CONTEXT,ACTIVE_RULINGS,ENGINEERING_ASSESSMENT,SNAPSHOT,AGENTS}.md`、`.trae/specs/**` 回勾。

## D-885 2026-11-19 — 待裁清零：12 条口径裁定落盘并代码化（批次 573）

> **评议 → 裁定 → 落点**：支书令「待裁先 grill 裁定、落盘到 plan 再执行」。`repo-convergence-and-rule-completeness.md §二 F` 的 12 条已在三轮 grilling 中逐条裁定，本批全部落盘并落点：
> - **收敛门**：`B-500-7b-2` / `B-522-1` **严格保留「六维 ≥80 才启动」**；未选「改成阶段门 / 先做后补分」——门一降，合并判定就失效。
> - **提交自检**：`check-batch-commits` 设历史基线，`--limit 1` 为收尾门禁；未选「追补改写历史 6 条 message」（违反 `H26.1`）。
> - **SOP-B-14**：副组长为**独立身份键**（`deputy-leader` ≠ `leader`），只共享工作台；未选「身份键合一」（会让两人共用账号、无法各自留痕）。
> - **SOP-B-17**：解除组织者指定时补一条**「更正」通知**；未选「只收权、不通知」（原组织者会继续按旧分工行事）。
> - **SOP-B-18**：工作流状态标签改**「待支委会审议 / 已审议」**；未选「保留支委扩大会旧称」（与现行会议类型不一致）。
> - **SOP-B-25**：**两项都做**——按制度领域派生对应主体待办 ＋ 草案改派写口；未选「只做派生」（改派仍靠线下口头）。
> - **SOP-B-27**：进入「发展对象」必须有支委会提案/决议，否则 422；一年考察期默认拦截、可配置放行；未选「只留前端同码门」（直调 API 可绕）。
> - **SOP-B-33**：**不补**「清单全空」夹具（演示库不可达）；未选「专门造空支部」（为一次性点检改种子）。
> - **SOP-B-44**：本阶段补「运行时真装配」守卫（`getDataSource()==='api'`）；未选「继续只守源码调用」（假装配无法发现）。
> - **SOP-F-4**：支委会档**未通过＝退回待批**（不终止）；未选「维持终止」（一次否决即锁死，组织者只能重建活动）。
> - **SOP-F-5-⑥**：取 **① 不做**（培养联系人考察记录仍按人去纪检查考察总表）；未选②③（新增入口无制度依据）。
> - **SOP-B-31**：组织者本人任务**随活动完成自动销项**；未选「组织者手工确认」（多一步且易滞留）。
> - **B-541-8 / H-16**：按现况改准——`DOC_MAP` EA 行已无旧评分数字（本批复核确认），`OPERATIONS_GUIDE` 术语指针对齐 `README-members §八`；未选「标快照」（快照会把旧口径永久化）。
>
> **同批闭环（规则/文档）**：`SOP-B-14` 写入 `SYSTEM_ROLE_PERMISSION.md §9a0`；`SOP-B-18` 同步 `definitions.js` 与 `DATA_MODEL.md` 状态表；`G1` 增「工作流标签 ≡ DATA_MODEL ＋ 旧标签零命中」断言。
> **边界**：`SOP-B-33` / `SOP-F-5-⑥` 裁定为「不做」，只在 `REVIEW_QUEUE` 留一行并删除，不再进乙部。
> **落点**：`content/02_institution/SYSTEM_ROLE_PERMISSION.md`、`content/03_doc_system/OPERATIONS_GUIDE.md`、`content/04_web_design/data/DATA_MODEL.md`、`docs/src/workflow/definitions.js`、`server/test/single-fact-consistency.test.mjs`、`.ctx/REVIEW_QUEUE.md`。

## D-886 2026-11-19 — 制度草案按主体派生待办 ＋ 改派换人；组织者分配进「我的任务」（批次 574）

> **评议 → 裁定 → 落点**：按计划 §三「批次 574」实施 `SOP-B-25` ①② 与 `SOP-B-31` ①③；`SOP-B-31` ② 复核为已落地（`leader/my-tasks-section.js`，2026-10-19 U-35），本批不重写。
> - **SOP-B-25 ①**：制度草案（`purpose='institution' && status='draft'`）按**既有**「领域 → 主体」判据（`work-map.js::institutionSubjectOfDomain`，不另写映射）派生一条推进待办；领域未登记 ⇒ 支书。派生链在 `todo.js::InstitutionTodoDeriver`。
> - **SOP-B-25 ②（改派）**：沿用草案编辑面已有的「制度内容领域」写口（`updateInstitutionDraft({domain})`）；保存后**先撤旧条、再按新领域派生** ⇒ 待办随主体换人，不新造审批流。
> - **SOP-B-31 ①**：活动「工作分工」（`assignments` 表）里指派给本人的具体工作也进「我的任务」，行 id 前缀 `wa:`；勾掉复用工作分工写口（`updateWorkAssignment`）。
> - **SOP-B-31 ③**：演示种子 `SEED_TASKS` 每行补 `executor`（`organizer`/`deep`）；服务端播种同源生效。
> - **未选**：为改派新建一套审批流（既有领域写口已足够）；为「我的任务」新增页签（改 46 页签口径与 tab 审计基数，收益不抵成本）；服务端接管该派生（与 `LifecycleTodoDeriver` 同层属提醒类，服务端 `todo-groups` 只接管实时组）。
> **边界**：草案待办是**按角色的提醒**，不参与实时组统计；活动完结后组织者分配的工作同样不列出（避免陈旧条）。
> **落点**：`docs/src/services/governance/todo.js`、`docs/src/services/branch/branch-doc.js`、`docs/src/services/activity/agenda-follow-up.js`、`docs/src/services/activity/activity.js`、`docs/src/core/domain/todo-actions.js`、`docs/src/components/record/todo-jump.js`、`docs/src/entries/tabs/{visitor/projects-tab,leader/my-tasks-section}.js`、`docs/src/data/mock/seed.js`、`server/test/{institution-todo-derive,my-project-tasks,todo-jump-contract}.test.mjs`、`content/04_web_design/design-system/CASES.md`。

## D-887 2026-11-19 — 发展对象服务端硬门 ＋ 考察期可配置；E4 扩面；名册写口前置校验（批次 575）

> **评议 → 裁定 → 落点**：按计划批次 575 清 `SOP-B-27` / `SOP-B-44` / `B-552-3` / `SOP-B-32` / `B-547-2` / `L-13`。
> - **SOP-B-27 服务端硬门**：`POST /members/:id/develop-stage` 进入「发展对象」前必须存在支委会讨论通过留痕（`member_change_requests` 该人 `toStage='发展对象' && meetingResult='passed'`），否则 422；一年考察期＝`member.activistMinMonths`（默认 12，登记 `POLICY_OVERRIDABLE` 组织域，0 ＝ 不设期限），缺起始日 / 未满均 422。
> - **SOP-B-44 运行时守卫扩面**：`E4` 样本由 3 个工作台扩到「3 工作台 ＋ 5 独立页（activity / notice / messages / archive / person）」，判据不变（运行时 `dataset.dataSource === 'api'`、首屏 `/api/v1/` 4xx 归零）。
> - **B-552-3 名册写口前置校验**：空补丁（`{}` / 仅 id）直接返回「没有可保存的字段」，不发请求；非党委的 `role` / `branchId` 先剔除，剔除后为空同样不发请求（根因：名册行带 `branchId` 会撞 party-staff 门）。
> - **SOP-B-32**：`DATA_MODEL §2.16` issues 表补 `domain` 行（枚举单一源 `ISSUE_DOMAINS`）；同批平移 `README-server.md` 20 处 `DATA_MODEL.md` 行号引用与 `TERMINOLOGY.md` 两处。
> - **B-547-2**：`org/todo-tab.js:209` 注释改为指向 `.ctx/REVIEW_QUEUE.md B-547-2`（触发条件写明）。
> - **L-13**：复核 `org.talent`（卡头 CTA）与 `disc.attendance`（单一层级视图）均已在 2026-11-08 波次 C 落地 ⇒ 台账 A 35/B 11 → **A 37/B 9**，两条未闭项标「已闭环」，不写代码。
> **未选**：讨论门按「提案即可」放宽（与 `D-553` 前置口径冲突）；考察期无起始日时默认放行（无法证明满一年，取拒）；E4 另立新文件（同一守卫、同一判据，避免第二套装配断言）；为 `domain` 行重排 DATA_MODEL（只为加一行，取表内插入 ＋ 行号平移）。
> **边界**：讨论门只管「积极分子 → 发展对象」这一步；`developStageSince` 缺失即 422（提示补起始日）。
> **落点**：`server/routes/member.js`、`docs/src/core/domain/policy-defaults.js`、`docs/src/entries/pages/settings-entry.js`、`docs/src/services/member/person.js`、`docs/src/entries/tabs/org/todo-tab.js`、`content/04_web_design/data/DATA_MODEL.md`、`content/03_doc_system/TERMINOLOGY.md`、`README-server.md`、`server/test/{permission-gate,module-load,roster-write-precheck,docs-governance-guard}.test.mjs`、`server/test-tier-registry.mjs`。

## D-888 2026-11-19 — 多支部键级隔离：schema v19 ＋ 会话固化支部 ＋ 版本按支部（批次 576）

> **评议 → 裁定 → 落点**：按计划批次 576 清 `B-568-1` 的键级三条（版本键 / 会话支部 / 附件归属）。
> - **schema v19（`multi-branch-keys`）**：① `collection_versions` 重建为 `(branch_id, name)` 复合主键，旧行按 `br-b1` 灌入；② `sessions` 加 `branch_id`（登录固化，历史空列回落用户支部）；③ `attachments` 加 `branch_id`（上传固化，历史空值回退上传人现支部）。
> - **版本读写按支部**：`readCollectionVersions` / `bumpCollectionVersion` / `replaceCollectionsAtomic` / `_allCollectionVersions` / `_snapshotVersionConflicts` 全部带 `branchId`（缺省 `br-b1`）；快照与 `/snapshot/versions` 取 `actorBranchId(req.actor) || ?branchId || br-b1` ⇒ 两支部各自 bump，不再互触 409。
> - **附件下载**：优先读记录 `branch_id`；空值（v19 前的历史行）回退上传人现支部，保持旧口径。
> - **迁移期兼容**：v18 仍会调 `bumpCollectionVersion` 而当时表无支部列 ⇒ 读/写函数先探测列存在，无列走旧 SQL（迁移顺序不被破坏）。
> **未选**：给 `attachments` 直接写 NOT NULL（历史行无法回填，取可空 ＋ 读侧回退）；版本键用 `branch||name` 单列字符串（复合主键更直观、SQL 索引直接可用）；会话缺失支部时按请求现取（违反「不得每请求现取」，取回落一次并在登录固化）。
> **边界**：单支部 `br-b1` 行为逐字节不变；`ALLOW_MULTI_BRANCH` 仍关闭，生产仍一实例一支部。
> **落点**：`server/db.js`（v19 / 版本函数）、`server/routes/resources/snapshot-versions.js`、`server/routes/resources/index.js`、`server/routes/auth.js`、`server/routes/uploads.js`、`server/test/multi-branch-five-proof.test.mjs`、`README-server.md`（两处行号改签）。

## D-889 2026-11-19 — 公共门厅支部维度；`B-568-1` 四条 P0 全清并出表（批次 577）

> **评议 → 裁定 → 落点**：按计划批次 577 清 `B-568-1` 最后一条（公共门厅），并把四条 P0 收口。
> - **门厅支部维度**：`/api/public/portal`、`/notices/:id`、`/activities/:id`、`/documents/:id`、`/documents/:id/download` 接受可选 `?branchId=`；未带 ⇒ 现行为逐字节不变（只党委内容）；带上 ⇒ 党委内容 ∪ 该支部 `public` 且未过期内容。判定函数仍单一源（`isPublicNow`）。
> - **附件**：上一批已把归属固化到行内 `branch_id`；本批仅补文档口径。
> - **收口**：`DATA_MODEL` 附三记录 v19 三列与门厅参数；`CLAUDE` 乙部删除 `B-568-1`，丙部脚注改为「已落地并出表」；`ACTIVE_CONTEXT` 数据/风险/下一批同步。
> **未选**：门厅强制支部段（无登录时不知道看哪个支部，且现行为是上线口径）；把支部 `login` 范围内容也放进匿名门厅（`D-858` 已限定匿名只读 `public`）。
> **边界**：`ALLOW_MULTI_BRANCH` 仍关闭；生产仍一实例一支部；前端门厅客户端不传 `branchId` 时行为不变。
> **落点**：`server/routes/public-portal.js`、`server/test/public-portal.test.mjs`、`content/04_web_design/data/DATA_MODEL.md`（附三）、`CLAUDE.md` 乙部/丙部脚注、`.ctx/ACTIVE_CONTEXT.md`。

## D-890 2026-11-19 — sample-diff 8.1–8.5 收口：六条样本全取保留 ＋ 四条口径入判例（批次 578）

> **评议 → 裁定 → 落点**：按计划批次 578 完成分层抽样与支书逐样本裁定；同批按 `H25` 修复 guards 暴露的 574–577 遗留红项（不 skip、不删断言）。
> - **8.1 分层**：高风险面取全量——权限矩阵（162 条 ≡ 运行期写路由）、`/snapshot` 与集合版本门、会话 TTL、production 多支部启动断言，由定向测试与守卫断言核查；低风险文档 / 台账按 574–577 合计 44 个改动文件抽 3 条（≈7%）。
> - **8.2 第一轮（设计口径，全取推荐）**：① `SOP-B-27` 缺 `developStageSince` 维持 422 硬拦；② 公共门厅未带 `?branchId=` 保持现行为（只党委内容，`D-858` 不动）；③ 活动完结后组织者分配项一并不列出。
> - **8.2 第二轮（低风险文档，3/44）**：① 副组长独立身份键保留——支书追问「遗留键」所指，经说明 `commissioner` / `initiator` 两个兼容键与组长 / 副组长无关（两人同用组长台），未提异议，按保留记录；② `DATA_MODEL` issues 表 `domain` 行保留；③ `README-server` 20 处 `DATA_MODEL.md` 行号机械平移保留。
> - **8.3 / 8.4 泛化**：四条可布尔化口径写入 `content/05_ai_coding/TEST_AND_VERIFICATION.md`（缺证据即拒 / 缺省可见性冻结 / 派生随来源终止 / 提问自解释）；逐条比对既有规则无冲突，按 `H10.8` 第一档执行，无需另裁。
> - **8.5 下轮应用**：本批内以「按规则回查本轮六条裁定」执行，Top-5 命中 5/5，另记 1 次表达偏差（遗留键未先给定义）并已改正，详见执行日志批次 578。
> - **同批修复（guards 门禁）**：① 写门矩阵 `member.js` / `auth.js` evidence 行号漂移（10 处）改指实际 handler；② 回落单一源——新增 `branchOrDefault` / `resolveVersionBranchId`，收口 `auth` / `uploads` / `resources` 三文件四处，删 `BRANCH_FALLBACK_BASELINE` 的 uploads 僵尸条目；③ 设置页考察期输入改走 `forms.textInput`（裸输入 / a11y / `text-xs` 三守卫同批归零）；④ `policy-defaults` 日期键改正则取前缀，删 D1c 僵尸基线；⑤ `permission-gate` 测试日期改本地口径；⑥ guards 静态调用点按实然 861 登记、daily 上限与 `DAILY_TEST_BUDGET=262` 取齐；⑦ `roster-write-precheck` 三用例合并为一（断言不减）。
> **偏差记录**：spec 8.2 原文「一次一个样本」，实际按「一轮 ≤3 问、两轮共 6 样本」执行；判据（逐条记录保留 / 改 / 拒与理由）未降，偏差在此登记。
> **未选**：把「遗留键」当缺陷单独立项（无运行期影响，只增噪声）；为低风险文档再抽第三轮（3/44 已落在 5–10% 区间）；把 guards 红项改 `skip` 或上调预算掩盖（`H25` 禁止）；本批借「做了审查」加分（无新业务证据，六维维持）。
> **边界**：除上述守卫收口外不改业务行为；多支部版本隔离与门厅缺省可见性语义不变。
> **落点**：`content/05_ai_coding/TEST_AND_VERIFICATION.md`、`.trae/specs/harden-launch-and-permissions/tasks.md`（8.1–8.5 回勾）、`.ctx/ENGINEERING_ASSESSMENT.md`、`.ctx/ACTIVE_CONTEXT.md`、`server/security/write-policy-matrix.mjs`、`server/routes/{auth,uploads}.js`、`server/routes/resources/{index,branch-scope}.js`、`docs/src/entries/pages/settings-entry.js`、`docs/src/core/domain/policy-defaults.js`、`server/{test-tier-registry.mjs,test/{test-tier-guard,branch-resolve-single-source-guard,date-canon-guard,permission-gate,roster-write-precheck}.test.mjs}`。

## D-891 2026-11-20 — 副支书操作权三档参数：主责仍在支书（批次 579）

> **评议 → 裁定 → 落点**：支书 2026-11-20 裁定「副书记或许确实有地方不同权，设计为可更改的参数」；补充口径「很多主责还都是支书的」。
> - **关系**：副支书是独立账号键（`deputy-secretary` ≠ `secretary`），与支书同页同台；主责归支书，任务 / 提醒 / 统计 / 逾期优先打给支书，无支书才回落副支书。
> - **参数**：`POLICY_DEFAULTS.role.deputySecretary`（`full` 默认 / `standard` / `custom` + 四个 `allow` 布尔），登记 `POLICY_OVERRIDABLE`（支书域）。参数只决定副支书能否代操作，不转移主责。
> - **四类动作**：`activityEdit`（活动信息编辑与发布）· `branchNotice`（全支部通知发布）· `rosterStage`（名册阶段推进与确认）· `branchConfig`（制度参数与支部配置）。
> - **单一判据**：前端 `docs/src/core/domain/deputy-capability.js`；服务端 `server/routes/resources/deputy-policy.js`（`requireSecretaryAction` + `deputyResourceDeny`）；设置中心「支部治理 · 支部制度参数 · 副支书操作权」三档下拉 + `custom` 四项开关。
> - **接线**：`member.js` 的 confirm / develop-stage / residence-status 改用 `requireSecretaryAction(...,'rosterStage')`；`resources/index.js` 的 config 与 rollback 用 `branchConfig`；`gates.js` 对 deputy 的 activities / 全支部 notices 收紧；`inspector.js` 的活动信息编辑改用 `activityEdit`。
> - **共享面修复**：`work-overview.js` 的概况 / 待办组 / 待批计数纳入副支书；`wizard-entry.js` 副支书可进本支部向导；正职优先回落规则保持。
> **未选**：全量角色 × 动作矩阵（与权限矩阵单源、守卫、审计冲突）；默认 `standard`（会改变上线现状）；把主责随参数转给副支书（支书明确否证）。
> **边界**：默认 `full` ＝ 与改造前行为一致；party-staff 与其他角色口径不变；主责仍按 `secretary` 派生。
> **落点**：`docs/src/core/domain/{policy-defaults,deputy-capability}.js`、`server/routes/resources/deputy-policy.js`、`server/routes/{member.js,routes/resources/{index,gates}}.js`、`docs/src/{components/governance/work-overview.js,components/record/inspector.js,entries/pages/{settings-entry,wizard-entry}.js}`、`server/test/deputy-policy.test.mjs`、`server/security/write-policy-matrix.mjs`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md`。

## D-892 2026-11-20 — 全仓历史目标对账：作废 12 项、重规划 6 项、单项证据门（批次 580）

> **评议 → 裁定 → 落点**：按支书「不要局限乙部，放眼全仓库历史登记」的要求，完成只读盘点并落台账。
> - **作废 / 删除**：`B-3`（活动材料页已存在）、`F-3/F-4/F-5`（批次 539 已落地）、`B-8/B-9`（前提消失）、`L-08/L-11/L-12/L-16`（EA 已关闭或已定策）、`B-541-11/H-12/H-18`（3 批无触发）。
> - **重规划**：`L-10` 改「逐读口取证 + 开关演练」；`L-02` / CI run id / 真人签收移入外部门；`L-14/L-15` 合并为「先出方案」；`L-17` 改可测阈值（≥1 万行或 p95 >200ms）。
> - **单项证据门**：`B-522-1`（清单 8 页覆盖率 100%，并入批次 582–583）、`B-500-7b-2`（客户端兜底调用数 = 0 + 7 类对账 8/8，批次 584 后）；取消「六维 ≥80 才启动」。
> - **同一事实**：`L-13` 统一 A 37 / B 9 / C 0；`EA` guards 读数取当前值；`SNAPSHOT` 改 schema v19 / 业务 50 表。
> - **跨平台脚本**：`server/package.json` 的 `set X=1&&` 改 `scripts/with-env.mjs`（node 实现，不新增依赖）。
> **未选**：保留观察项（无触发判据只会继续膨胀）；等六维全局 ≥80（与涨分互锁）；把「外部门」继续挂本机待办。
> **边界**：只改台账与脚本包装，不改业务行为；已关闭项证据仍在 `p2-cleanup-ledger.md` 与 git。
> **落点**：`.ctx/evidence/2026-11-20/backlog-reconcile.md`、`.ctx/REVIEW_QUEUE.md`、`.ctx/ENGINEERING_ASSESSMENT.md §四`、`.ctx/SNAPSHOT.md`、`.ctx/ACTIVE_CONTEXT.md`、`CLAUDE.md` 乙部、`server/package.json`、`server/scripts/with-env.mjs`。

## D-893 2026-11-20 — 前端美学 P0+P1+P2 一次收口：卡厚度 / 卡头 / 状态色 / 越档（批次 581）

> **评议 → 裁定 → 落点**：支书 2026-11-20「前端美学 P0+P1+P2 一次做完」。原计划分 581–583 三批，因同一批文件被机械替换覆盖，合并为一批执行（偏差登记）。
> - **P0 卡厚度**：`DS_03 §4.2 / §4.21.2` 统一为 `.card-standard` 16 / `.card-compact` 12；`p-5` 退出卡内边距；60 个文件 137 处 `card … p-5` 机械替换为 `card … card-standard`；新增 `card-consistency-guard`（卡内边距 / 手写 H3 / 两个出口）。
> - **P0 卡头**：27 处手写 `<h3 class="… font-bold …">` 统一为 `font-semibold`（16/600）；守卫禁止再出现 `font-bold` 手写卡头。⚠ `renderCardHeader` 全量迁移未做（27 处仍手写），登记为后续。
> - **P1**：`text-amber-800` 25 处 + `text-amber-700` 全量改 `text-[var(--status-warning-text)]`（并删暗色僵尸补丁）；`party-committee/review-tab` 删本地 `STATUS_META`、三枚假徽章改 `badgeHtml`、`ring-2` 高亮改 1px 主题边、`rounded-md` 改 `rounded-lg`；三处无名 `<section>` 补 `aria-labelledby` 并降 `p-4`；专班阶段胶囊两处改 `badgeHtml`（去内联 hex）；3 处数字卡 `p-3` → `p-4`；设置页 3px 左条删除；纪检导出 / 打印 / 提交按钮去 `h-8`；`gray-400` 说明字改 `gray-500`；活动 / 资料 / 日历灰底卡改白底。
> - **P2**：今天页计数改 `--neutral-800`、整卡主题淡底撤除；`cs-search-input` 改 13px / 34px；两处单行条卡 `py-3` → `py-2.5`；「请刷新重试」改「请稍后重试」。
> **未选**：把守卫基线抬高掩盖存量；跳过 B-522-1 的低密度页整改（该项仍未完成，保留单项证据门）。
> **边界**：`text-amber-700` 全量替换后删除暗色补丁；`taskforce-tab` hex 清零 ⇒ `HEX_FILE_BASELINE` 44 → 43；`party-workbench-layout` 断言更新为新卡厚度口径。
> **读数**：guards **119 文件 / 867 用例 / 145.8s** 全绿；`module-load` **5/5**；daily **32 文件 / 265 断言 / 113.0s**。
> **落点**：`content/04_web_design/design-system/DS_03_COMPONENTS.md`、`docs/src/**`（约 100 文件）、`server/test/style-ratchet-guard.test.mjs`、`server/test/party-workbench-layout.test.mjs`、`server/test/{style-baseline,hex-hardcode-guard}.mjs`。

## D-894 2026-11-20 — 评分即资产 ＋ 合并门槛两段（批次 584）

> **评议 → 裁定 → 落点**：支书 2026-11-20「每次给分数都伴随评价，评价本身是改进依据与迭代抓手，必须复用知识并写成 Harness 规则」；同轮已裁「合并门槛拆两段」「单项证据门」。
> - **H80 第 6 条「评分即资产」**：每次评分必须同时产出「评价对象 / 证据 `file:line` / 结论 / 可执行改进项 / 复评触发条件」；当前值进 `EA §一/§二/§5.2`，读数进 `.ctx/evidence/`，判例进 `TEST_AND_VERIFICATION.md`；开工先按 Top-5 稀疏检索资产索引，命中写进 `next_prompt`；无新证据不得重评，分数变化必须附新读数。
> - **H20.5 两段门槛**：本机门（daily ＋ guards 绿、`audit-tabs --all` P0/P1=0、工作树干净、六维诊断已刷新）＋ 支书确认即可合并；外部门（`L-02` 真机、CI run id、真人签收、SMTP 实投）只阻断上线。六维 <80 只作诊断。
> - **评价资产索引**：`EA §5.2` 增八行表（六维 ＋ 前端美学 ＋ 台账），每行「已有资产 → 下一改进项（判据 ＋ 落点）」；`EA §二` 2.1–2.6 每节末补「下一改进项 + 复评触发」。
> - **守卫**：`evaluation-asset-guard` 4 条（改进项指针 / 资产索引六维 / H20.5 两段 / 反例自证）。
> **未选**：保留「六维 ≥80」硬门（与 `B-522-1` / `B-500-7b-2` 单项证据门互锁，已由 `D-892` 解除）；把评分细则搬进 `CLAUDE.md` 正文（会超预算，改为 H 节一行 ＋ 指针）。
> **边界**：六维当前值不因本批变化（本批为方法规则，无新证据）；`EA §5.2` 表内不写评分元组，避免 `ctx-hygiene-guard::⑪`（六维元组每文件至多一处）。
> **读数**：定向 `evaluation-asset-guard` ＋ `test-tier-guard` ＋ `spacing-ratchet-guard` **13/13** 绿；guards 预算 121 文件 / 873 用例。
> **落点**：`CLAUDE.md`（H20.5 / H80）、`.ctx/ENGINEERING_ASSESSMENT.md`（§二 / §5.2）、`server/test/evaluation-asset-guard.test.mjs`、`server/test-tier-registry.mjs`、`.ctx/ACTIVE_CONTEXT.md`。

## D-895 2026-11-20 — 六维复核维持 ＋ 批次 579–585 收尾（批次 585）

> **评议 → 裁定 → 落点**：按 `H80` 第 6 条「评分即资产」，只用批次 579–585 新证据复核，不自造分数。
> - **不加分（维持 80 / 78 / 79 / 73 / 76 / 71）**：批次 579–584 的增量属既有基线内加固——副支书参数（`D-891`）、台账对账（`D-892`）、前端美学收口与 3 份新守卫（`D-893` / `D-894`）；外部缺口一条未闭（CI 无 run id、Linux 真机未验、真人签收未做、SMTP 未实投），D2 只对 3 个计数、C2 仍 0 pass。
> - **读数变化**：audit-tabs `--all` **P0 0 / P1 0 / P2 0 · exception 44**（P2 由 2 降 0，批次 565 后首次归零）；guards **121 文件 / 873 用例** 全绿；daily **265 断言 / 116.0s** 全绿。
> - **单项证据门未达**：`B-522-1`（8 页覆盖率 100%）、`B-500-7b-2`（客户端兜底调用数 = 0）均未启动，保留在乙部；`renderCardHeader` 全量迁移同列改进项。
> **未选**：因 P2 归零上调体验分（O-1 门：分数变化必须有新证据，且 P2 归零只证明审计口径内无项，真人签收仍缺）。
> **落点**：`.ctx/ENGINEERING_ASSESSMENT.md §一 / §2.5 / §5.2`、`.ctx/ACTIVE_CONTEXT.md`、`.ctx/TIMESTAMPS.md`、`.ctx/evidence/2026-11-20/tab-audit/summary.md`。

## D-896 2026-11-20 — 卡头单源收口：70 处迁移 renderCardHeader（批次 586）

> **评议 → 裁定 → 落点**：计划 §五 美学验收要求「卡头只从 `renderCardHeader` 出」，批次 581 只统一字重未迁移出口；支书要求计划工作全部落地。
> - **迁移**：`docs/src` 70 处页面级 / 面板级卡头（29 文件，含内嵌面板与「标题 + 徽章 / 计数」同排写法）改 `renderCardHeader`；同排副题 / 徽章 / 按钮收进 `meta` / `actions`。
> - **面板档**：`renderCardHeader` 增 `variant: 'panel'`（14px / 600，`.card-head--panel`，底距 `--space-2`），避免另造第二套卡头。
> - **守卫**：`card-consistency-guard::②` 改为「`docs/src` 不得出现 `text-base|text-sm` + `font-semibold` 的手写卡头 H3」；静态页 `docs/search.html` 单列白名单（无法装配模块）。
> - **连带**：`page-title-guard::P5`、`ui-first-screen-order::F4` 断言改认 `renderCardHeader({ title: … })`；`copy-guard` 导语候选由 100 降 95，下限下调 90（只有标题的卡片不再产字面文本块）；`activity-entry` 行号 +1 引起 `CASES` / `DS_03` / `date-canon` 基线改签。
> **未选**：保留手写卡头并放宽守卫；把 `help.html` / `about.html` 纳入迁移（前者为文档页独立字级，后者冻结件）。
> **边界**：静态页 `docs/search.html` 3 处卡头保留手写（无 JS 装配）；`B-522-1` 低密度卡与空态仍待内容 / IA 决策，不在本批。
> **读数**：guards **121 文件 / 873 用例**全绿；daily **265 断言 / 122.8s** 全绿；真机设置 / 今天 / 活动详情三页 PASS（标题单行、右侧不重叠不溢出、无横向滚动）。
> **落点**：`docs/src/components/shell/page-frame.js`、`docs/src/styles.css`、`docs/src/**`（29 文件）、`server/test/{card-consistency-guard,page-title-guard,ui-first-screen-order,copy-guard,date-canon-guard}.test.mjs`、`content/04_web_design/design-system/{DS_03_COMPONENTS,CASES}.md`。

## D-897 2026-11-21 — 前端存量清零：调色板状态色 / 假徽章 / 越档 h-8（批次 587）

> **评议 → 裁定 → 落点**：支书「有规则的没有遵照规则；特例没有遵照特例」；本轮独立探查取证 286 处调色板文字、38 文件手拼徽章、8 处 h-8。
> - **状态文字**：出勤三态、必填星号、错误态、备注、条件提示改 `--status-*-text`；`group-view` 的 `{label,cls}` 改 `{label,tone}`，四处消费点统一 `badgeHtml`；`report-up` 本地 STATUS_META 同步改 tone。
> - **假徽章**：组织向导 2 处、成员变更面板 2 处、复盘 / 汇报状态胶囊改 `badgeHtml`。
> - **h-8**：日历周 / 日前后翻页 4 处改 `.btn-sm`；只保留「图标关闭 / 低频上传 / 导出 CSV」白名单。
> - **守卫**：`status-palette-text-guard`（按文件棘轮 286 处只减不增 ＋ 卡不得挂调色板底）、`badge-single-source-guard`（38 文件基线只减不增）、`button-height-guard`（h-8 白名单）。
> **未选**：一次性清空全部 286 处调色板文字（语义映射风险高、批次过大）；把 `about.css` 纳入扫描（冻结件）。
> **边界**：`styles.css` 暗色补丁表与静态页 `search.html` 不在守卫扫描面；灰底卡本轮实测已为 0。
> **读数**：三道新守卫 7/7 绿；`module-load` E1/E5 绿；真机首页数字卡收窄后无横向溢出。
> **落点**：`docs/src/**`（10 文件）、`server/test/{status-palette-text-guard,badge-single-source-guard,button-height-guard}.test.mjs`、`DS_03 §4.21.2`。

## D-898 2026-11-21 — B-522-1：低密度卡收窄与空态补内容（批次 588）

> **评议 → 裁定 → 落点**：支书裁定「只改真正低密度的 3 类等尺寸卡 ＋ 给今天/归档补最近动态与下一步」。
> - **数字卡收窄**：新增 `.stat-grid--content` / `.metric-band--cards--content`（`auto-fit minmax(0,max-content)` ＋ `justify-content:start`），只挂首页四数与概况结论带；≤1024 回落两列等宽。真机首页四卡 133.6–157.6px，不再等分铺满。
> - **日历特例**：月历 31 格登记为网格语义特例（`DS_03 §4.21.2` ＋ `DS_06 SD-57`），不计入低密度卡。
> - **今天页**：`today-summary` 增 `recent`（过去 3 条可见活动，同一可见性单一源）；「要办」卡尾并入「最近动态」＋「下一步：<动作组> · N 项」，不新增顶层块。
> - **归档页**：空态补「最近归档 3 条 ＋ 下一步：补齐材料后可归档」，数据取本页 `archiveRecords`。
> - **证据门**：`.ctx/evidence/2026-11-21/density-8pages.md` 8 页逐页读数；归档空态因演示库待归档 34 未触发，如实登记为源级核验。
> **未选**：8 页逐页重排；只收卡片不补内容。
> **读数**：今天页首屏空白 0.715 → 0（内容越过视口 124px，信息量增加）；首页 / 概况栅格同源；`ui-first-screen-order` 块数不变。
> **落点**：`docs/src/{styles.css,components/dashboard/stats.js,components/governance/work-overview.js,entries/tabs/today/today-tab.js,entries/tabs/prop/archive-tab.js,services/governance/today-summary.js}`、`docs/index.html`、`DS_03` / `DS_06`。

## D-899 2026-11-21 — B-500-7b-2：兜底 instrument ＋ 资产命中机检（批次 589）

> **评议 → 裁定 → 落点**：支书裁定「保留失败兜底，但把兜底调用数变成可核读数」，并要求「复用评价知识写成 Harness 规则」再加一层机检。
> - **instrument**：`todo-tab-shell` 增 `_deriveFallbackCount`（仅失败 / mock 分支自增一次）＋ `window.__TODO_DERIVE_FALLBACK__` 只读 getter。
> - **守卫** `todo-derive-instrument-guard`：ok 分支必须 `skipActionKeys`、自增只一处且在 ok return 之后、`UNSUPPORTED_GROUP_KEYS` 必须为空（7 类对账全绿）、反例自证。
> - **Harness**：`check-batch-commits` 增「body 必须有 `资产命中：` 行，且至少一个 `EA §` / `D-xxx`」；`CLAUDE H80-6` 同步一句；`evaluation-asset-guard` 增 1 条断言。
> - **乙部**：`C-3`（无判据）删除；`C-4` 随 587 完成删除；`B-522-1` / `B-500-7b-2` 按单项证据门完成即删；`C-5` 保留棘轮。
> **未选**：删除客户端派生兜底（失败即整块不可用）；只加计数不加守卫。
> **边界**：真机读数以「服务端 ok 路径页面正常渲染服务端组」为准，instrument 的 0 调用由守卫静态锁定；归档空态未取到真机渲染证据（演示库非空）。
> **读数**：`todo-derive-instrument-guard` 3/3、`evaluation-asset-guard` 5/5、`test-tier-guard` 7/7 绿；`check-batch-commits --limit 1` 对缺「资产命中」判红（反例）。
> **落点**：`docs/src/components/record/todo-tab-shell.js`、`server/test/{todo-derive-instrument-guard,evaluation-asset-guard}.test.mjs`、`server/scripts/check-batch-commits.mjs`、`CLAUDE.md`。

## D-900 2026-11-21 — 前端一致性收口：两条表单 SD ＋ 错误态可操作化（批次 590）

> **评议 → 裁定 → 落点**（两轮 grill 六项）：① 议程项 / 发起 / 讨论项徽章统一改 `badgeHtml(..., 'info')`，暗色不再挂 indigo；② 全仓清账分三阶段（590 前端一致性 → 591 清账与 Harness）；③ 堵「留尾巴」采用「新规则 ＋ 守卫」，规则正文进阶段 591；④ 外部门四项单列 `EA §四`，不混入乙部；⑤ 旧计划 9 个未勾项逐条对账后归档；⑥ 两项「有原则无细则」（必填语义 / 筛选行可访问名）先补 SD 再改代码并给守卫。
> - **SD-66 / SD-67**：`required:true` ⇒ 控件 `required` ＋ `aria-required`，错误行 `role="alert"` ＋ `aria-describedby` ＋ `aria-invalid`；筛选行控件必须有 `<label for>` 或 `aria-label`，首项文本不充当名字。判例 `CASE-DESIGN-042` / `043`；守卫 `form-field-guard`（4 条，含反例自证）。
> - **错误态可操作化**：专班登记任务 / 成员流动待确认 / 支委会待议池与提案池 / 会前草案下拉 / 工作概况 —— 失败一律给「重新载入」或点选重试，不透 `error.message` 与 HTTP 状态码；`person-edit-modal` 的失败原因留在浮窗内（`#pe-save-err`）。
> - **行高端口改准**：`DS_03 §4.21.1` 由 32/40/48 改为 **44/48/56**，与 `styles.css:297-299` 与 SD-15 一改具改。
> **未选**：保留 `status-badge` 自建菜单（改为就地补 `aria-expanded/controls` ＋ 方向键，不引入 `menu-button` 的第二套视觉）；一次性清空调色板（维持按文件棘轮）。
> **边界**：删 `html.theme-dark` 的 `purple/rose` 4 条僵尸补丁后，dark 补丁计数下降；`stats.js` hex 清零按收基线纪律删条目（文件数 43 → 42）；`ui-control-system-guard` 控件面下限 200 → 199（考勤下拉改走 `selectInput`）。
> **读数**：guards **126 文件 / 888 断言全绿（146.1s）**；daily **265 / 120.3s**；真机两页 PASS（反馈页三态骨架＋列表；支书台支委会待议池渲染，控制台 0 error）。
> **落点**：`docs/src/**`（约 40 文件）、`content/04_web_design/design-system/{DS_03_COMPONENTS,CASES}.md`、`content/03_doc_system/CASES_INDEX.md`、`server/test/{form-field-guard,style-baseline,terminology-baseline,docs-governance-guard,date-canon-guard,ui-control-system-guard,test-tier-registry}`。

## D-901 2026-11-21 — 清账门：把「留尾巴」做成机检（批次 591）

> **评议 → 裁定 → 落点**：支书追问「乙部还有未完成工作，为什么计划不统一完成、是否是 AI 逃逸」⇒ 根因是四条 open 源（乙部 / `REVIEW_QUEUE` / 计划未勾项 / `EA §四`）没有统一的收尾口径，AI 每批只清眼前那一类。
> - **规则**：`CLAUDE.md` 甲部新增 `H50.3 计划收尾清账门`——每份计划验收必须附清账表，处置四类 open 源；每条只落「已闭环 / 已排批次 / 明确作废 / 外部门」四态之一。
> - **机检**：新增 `open-items-guard`（5 条）——① `REVIEW_QUEUE` 表行不得出现「已闭环」；② 乙部每条四要素齐且状态 ∈ {在办, 待触发}，`待触发` 必带触发条件；③ `.trae/documents/*.md` 有 `- [ ]` 时须 `<!-- parked: D-xxx -->` 或 `status: archived`；④ `EA §四` 必须有「外部门」小节并列出 L-02 / CI / 签收 / SMTP；⑤ 反例自证。
> - **外部门单列**：`EA §四` 新增「外部门（不阻断本机合并）」表——L-02 Linux 真机 / CI run id / 真人签收 / SMTP 实投，责任人统一为支书；乙部、计划清账表、`next_prompt` 只引用不复制。
> - **旧计划归档**：`.trae/documents/2026-11-02-audit-consolidation-and-cutover.md` 9 个未勾项逐条给出结论（均为「已完成」并附现行证据）后标 `status: archived`。
> - **服务守护**：新增 `server/scripts/ensure-service.mjs` ＋ `npm run service:ensure`，`H20.1` 增第 0 步；实测停服后 4s 恢复到 200。
> - **台账清理**：`REVIEW_QUEUE` 删 `B-552-1…6` 六条已闭环行。
> **未选**：只加规则不加守卫（会重复出现「规则在、执行靠自觉」）；把外部门混进乙部（`H50.1` 明令假任务不入表）。
> **边界**：`open-items-guard` 只判结构不判语义（判不了「结论是否真的成立」）；计划文件的 `- [ ]` 允许保留，只要整体已 archived 或逐项 parked。
> **读数**：`open-items-guard` 5/5 绿（含反例自证）；`test-tier-guard` 7/7（registry 127 文件 / 893 断言）；`service:ensure` 停服 → 4s 恢复 200。
> **落点**：`CLAUDE.md`（H20.1 / H50.3）、`.ctx/ENGINEERING_ASSESSMENT.md §四`、`.ctx/REVIEW_QUEUE.md`、`.trae/documents/2026-11-02-audit-consolidation-and-cutover.md`、`server/scripts/ensure-service.mjs`、`server/package.json`、`server/test/doc-lifecycle-guard.test.mjs`、`server/test-tier-registry.mjs`。

## D-902 2026-11-21 — 前端 lens 清账：20 条不一致逐条落（批次 592）

> **评议 → 裁定 → 落点**：支书要求「前端单独用 parallel agents 对照既有原则 / 规则 / 判例查不一致，报后按授意修」。两个独立 lens（视觉 / 交互与数据真值）各出一份带 `file:line` 的报告，支书裁定「19 条一次修完」。
> - **按规则修 16 条**：手拼徽章 → `badgeHtml`（work-map / assign / issue-form）；「已打回」tone 统一 warning；「开放中」success → warning；正式答复与汇报块改令牌底；专班通过 / 拒绝改 `btn-accent-soft` / `btn-outline`；成员变更预载失败补错误态＋重试（H32）；表态收进 `IssueStore.toggleReaction` 单一写口；赋权待办双跳转改单一路径；名册来源徽章 neutral；未读统一 warning；`p-2.5` / `gap-2.5` 归 12 / 8 档；考勤「已补」改 success 令牌；person-picker 补 `aria-controls`；references 三个 `label` 补 `for`；消息撰写框补 `aria-label`；日历移动端日详情补 dialog 语义 + Esc + 回焦。
> - **不修 1 条（冻结件）**：`about-entry.js` 的 `role=button` 死按钮属 `about-freeze-guard` 冻结面，冻结优先。
> - **判为不成立 3 条**：`feedback-tab` 用 `badgeVariantClass` 已属徽章单源；`activity-entry` 无「只读查看」胶囊；考勤行键盘落点=原生复选框属 2026-11-04 Task 3.1 既有裁定（不重开）。
> **未选**：给表态新增服务端写口（`PATCH /issues/:id` 是支委处置门，改权限面须支书裁）⇒ 登记 `REVIEW_QUEUE B-592-1`，未裁前不加端点。
> **边界**：`toggleReaction` 在 api 形态仍只改本机缓存（刷新回落），已在代码注释与队列双处写明；真机点赞验证受沙箱进程回收限制（BLOCKED-BY-ENV），以「页面与两个模块 200 ＋ guards/daily 全绿」代替。
> **读数**：guards **127 文件 / 893 断言全绿（140.2s）**；daily **265 / 108.5s**；`localstorage-key-guard` 删 `gsm1921-issue-cache` 僵尸登记后 10/10。
> **落点**：`docs/src/**`（约 15 文件）、`server/test/navigation-guard.test.mjs`、`docs/src/data/cache-registry.js`、`.ctx/REVIEW_QUEUE.md`。

## D-903 2026-11-21 — 工作树复原与 BOM 唯一性守卫（批次 593）

> **事实 → 裁定 → 落点**：23:48–23:49 一批写入把 4 个文件改成旧值并累加 BOM（`ACTIVE_CONTEXT` / `backup-daily.ps1` 各 3 个 BOM；`TIMESTAMPS` / `DECISION_LOG` 回退到 `D-901`；`TIMESTAMPS` 末行被截断），另有 59 个文件被改成 CRLF（无内容差异），同批 `server/test/**` 整批重写。
> - **裁定**：以 HEAD（`725591797`，`D-902`）为唯一正确版本；只对 4 个文件 `git checkout`，再 `git checkout -- .` 清行尾噪声；不做 `reset --hard`、不做 `git clean`。
> - **实测**：复原后 `git status --porcelain` = 0；`ACTIVE_CONTEXT` 头部回到单 BOM ＋ `---`。
> - **根因与防复发**：PowerShell `Set-Content -Encoding UTF8` 反复重写会累加 BOM（本次在 10 个存量文件里也测到 2–8 个 BOM：`tab-loading.css`、`.ctx/logs/archive/2026-10/specs/**` 8 份、`server/scripts/backup.ps1` 8 个）。新增 `bom-and-eol-guard`（3 条：BOM 唯一性 / frontmatter 锚点 / 反例自证），并把存量 10 个文件统一为「`.ps1` 保留单 BOM，其余 0 BOM」。
> - **顺手修**：`doc-consistency` 的 `read()` 不剥单 BOM，导致 S13 把有 frontmatter 的 `.ctx` 文件误判为「无 frontmatter」（2 行红）；改为解析前剥掉可选单 BOM。
> **未选**：把 BOM 一律禁用（PowerShell 5.1 读非 ASCII `.ps1` 需要单 BOM）；把 CRLF 噪声提交成一次「行尾归一」（会污染 blame，且 `core.autocrlf=true` 下无内容差异）。
> **读数**：`bom-and-eol-guard` 3/3；`doc-consistency` 21/21、`ctx-hygiene` 12/12、`docs-governance` 31/31、`test-tier-guard` 7/7（74/74 合计）；daily **265 / 118.4s**。
> **落点**：`server/test/bom-and-eol-guard.test.mjs`、`server/test/doc-consistency.test.mjs`、`server/test-tier-registry.mjs`（128 文件 / 896 断言）、10 个存量 BOM 文件。

## D-904 2026-11-21 — `.trae` 宣称对账：判定四态 ＋ 归档自洽守卫（批次 594）

> **评议 → 裁定 → 落点**：支书要求「`.trae` 所有文档宣称的工作在结果上已实现，重叠取最后一次状态」⇒ `.trae/` 被 gitignore、不可回滚也不备份，结论只能就地写回。
> - **裁定**：判定只用四态（已实现 / 已被后续覆盖 / 外部门 / 作废）；优先级按批次 590–593 的 `ACTIVE_CONTEXT` 与 `D-900`–`D-903`，不按文档日期。
> - **就地标注**：24 份计划（23 归档 ＋ 本计划 active 至 595）＋ 18 个 spec 全部补 `status: archived` ＋ `archived_at` ＋ 一句话 `archived_note`；正文不改。
> - **未勾项逐行 `concluded`**：24 行 `- [ ]` 逐行给结论（外部门 5 类：L-02 / CI run id / SMTP / M-01 / 真人签收；已排批次：precommit；已实现 2 项；已被覆盖 3 项），保留原勾选状态作审计痕迹。
> - **守卫加强**：`open-items-guard` 新增 ⑥「已归档 spec 仍留无结论未勾项即红」＋ ⑦ 反例——归档声明必须与内容自洽，不能靠加 `status` 掩盖未勾项。
> **未选**：按文档日期排优先级（会与 D-900–D-903 的现行结论冲突）；删正文未勾项（破坏审计痕迹）。
> **读数**：`open-items-guard` 7/7；guards **128 文件 / 898 断言全绿（154.7s）**；`doc-consistency` 21/21。
> **落点**：`.trae/documents/**`（24）、`.trae/specs/**`（18 × 3 文件）、`server/test/doc-lifecycle-guard.test.mjs`、`server/test-tier-registry.mjs`（898）、本文件与执行日志批次 594 节。

## D-905 2026-11-21 — evidence 准入：只留被引用的读数（批次 595）

> **评议 → 裁定 → 落点**：支书两次明确「不是完整备份到 evidence，evidence 也要一起清理，留下真正重要的信息、知识、智慧；历史 evidence 不再重要」⇒ 证据库的职能从「全量留档」改为「只存被 active 台账引用的读数」。
> - **裁定**：`CLAUDE.md` 新增 `H26.3a`——`.ctx/evidence/` 只存被 active 台账引用或被守卫 / 脚本消费的 `.md` / 小型 `.json`；不存截图、压缩包、原始日志；读数转写进 `DECISION_LOG` / `EA` / `ACTIVE_CONTEXT` 后原始件即删，需要时重跑再生。
> - **执行**：删前抽查并转写 6 组读数（恢复演练 / 跨层扫描 / perf 重测 / 页签例外 / 移动端仿真 / 用户任务走查），再整目录 `git rm`；保留 10 份被台账引用的 `.md`，另恢复 2 份被守卫消费的 fixture（`touch-forms.json` / `batch525-filter.json`）。结果 **1272 文件 / 99.1 MB → 12 文件 / 217 KB**。
> - **同批清引用**：`EA` 里 `2026-11-10/activity-detail/` 目录引用改为文字结论（双档实测通过），避免守卫判「引用不存在的证据」。
> - **守卫**：新增 `evidence-hygiene-guard`（4 条：禁 png/jpg/zip ／ 台账双向引用 ／ 单文件 ≤256 KB ／ 反例自证），登记 129 文件 / 902 断言。
> - **外部门**：`EA §四` 补 `M-01`（移动端三任务：回执 / 表决 / 查考勤），`open-items-guard::④` 机检项 4 → 5；AI 375 仿真通过只作下限，不计真人验收。
> **未选**：把证据全量搬到归档目录（支书明确不备份）；保留 `findings.json` 与截图（可重跑再生）；删 `.trae-html-share-packages/*.zip`（仓库内无生成入口，保留并记一行）。
> **边界**：运行态 `server/backups/`、`server/data*.db*`、`server/uploads/` 不属过程件，保留。
> **读数**：`evidence-hygiene-guard` 4/4；`open-items-guard` 7/7；guards **129 文件 / 902 断言全绿（173.7s）**；daily **265 / 128.9s**。
> **落点**：`.ctx/evidence/**`（1272 → 12）、`CLAUDE.md H26.3a`、`.ctx/README.md`、`.ctx/ENGINEERING_ASSESSMENT.md §四`、`server/test/doc-lifecycle-guard.test.mjs`、`server/test-tier-registry.mjs`。

## D-906 2026-11-22 — 意见反馈「表态」上服务端：按人存、匿名单向隐藏（批次 596）

> **评议 → 裁定 → 落点**：支书对 `B-592-1` 裁定「上服务端，按人存」⇒ 普通成员的表态不再只落本机缓存。
> - **写口**：`POST /api/v1/issues/:id/reactions`（`requireAuth`；同支部 + 可读该反馈；只增删本人 personId）。
> - **出口**：只回 `reactionCounts` 与 `myReactions`；`reactions` 原始 personId 数组**一律不出库**——匿名反馈不得借表态反查（与 `_realPersonId` 同口径）。
> - **不放宽原门**：`PATCH /issues/:id` 仍只支委层处置；成员直调 403。
> - **矩阵**：162 → 163（156 enforced / 5 self-service / 2 public / 0 known-risk）。
> - **前端**：`IssueStore.toggleReaction` 改 async（乐观更新 + 失败回滚 + 可读错误）；`reactions.js` / `issue-list.js` 只读计数与我的表态。
> **未选**：取消表态（支书选保留并按人存）；把表态并入 `PATCH /issues/:id`（会放宽处置门）。
> **读数**：`issue-reactions.test.mjs` 4/4（toggle / 出口无身份 / 401 / PATCH 403）；`write-policy-matrix` 与 `permission-gate` 全绿。
> **落点**：`server/routes/resources/index.js`、`server/security/write-policy-matrix.mjs`、`docs/src/{services/governance/issues.js,data/api-adapter.js,components/feedback/reactions.js,components/feedback/issue-list.js}`、`server/test/issue-reactions.test.mjs`。

## D-907 2026-11-22 — `.ctx` 瘦身：同一事实只出现一次（批次 597）

> **评议 → 裁定 → 落点**：支书要求「`.ctx` 必须瘦身，非极重要 / 不影响执行的信息只出现一次」⇒ 删除镜像与逐批沿革，只留当前投影与指针。
> - **ACTIVE_CONTEXT**：§2 由 46 条收到 **12 条**（只留仍影响下一步的）；§1 合并重复的六维 / 评分两条；27.1 KB → **7.8 KB**。
> - **EA**：§二 每维只留「证据 2–3 句 ＋ 下一改进项」（`evaluation-asset-guard` 依赖保留）；§一 表格压到 2 句；P0–P14 总账改一行指针；`L` 表只留未闭；§六改状态表；91.1 KB → **44 KB**。
> - **DECISION_LOG 索引**：2026-09 / 2026-11 巨型概要压为条数 ＋ 主题词；145.4 KB → **4.2 KB**。
> - **TIMESTAMPS**：>80 字备注逐字迁 `.ctx/logs/2026-11-EXECUTION_LOG.md` 附节；纯代码行不再逐条登记（git 为准）；113.1 KB → **49 KB / 216 登记行**；预算 31,400 → **9,000**（只降）。
> - **SNAPSHOT**：§I 树 / §III 页面表降为摘要＋指针；28 KB → **10.7 KB**。**EXECUTION_LOG_INDEX** 删逐条索引：34.4 → **11 KB**。**REVIEW_QUEUE** 删「全局评估总表」镜像、附录压表：17.2 → **9.8 KB**。
> - **守卫**：`ctx-hygiene ⑤` 增「§2 ≤14 条 ＋ ≤16KB」；`⑦` SNAPSHOT 250 → **150 行**。
> **未选**：删 10 月日志（唯一历史，保留）；删 `TIMESTAMPS` 行到 200 以下（`S13` 登记面下限）；把规则正文搬进 `.ctx`（`H26.3` 禁止）。
> **读数**：`.ctx` 顶层 8 文件 **293.9 KB → 140 KB**（TIMESTAMPS 保留 216 行以过 `S13 ≥200` / `N1 ≥210`）；`ctx-hygiene` / `doc-consistency` / `docs-governance` / `evaluation-asset` / `open-items` 同跑 **76/76**。
> **落点**：`.ctx/{ACTIVE_CONTEXT,ENGINEERING_ASSESSMENT,TIMESTAMPS,SNAPSHOT,REVIEW_QUEUE}.md`、`.ctx/logs/{DECISION_LOG,EXECUTION_LOG_INDEX,2026-11-EXECUTION_LOG}.md`、`server/test/{ctx-hygiene-guard,timestamps-note-baseline}.mjs`。

## D-908 2026-11-22 — `.trae` 收尾与过程件清零（批次 598）

> **评议 → 裁定 → 落点**：支书要求「`.trae` 所有宣称在结果上已实现；临时 / 工作过程文件全部清理」⇒ 补最后 9 行逐行结论，并把「归档件仍留未勾项」纳入守卫。
> - **逐行结论**：`2026-11-02-audit-consolidation-and-cutover.md` 的 9 行 `- [ ]` 各加 `<!-- concluded: 已完成（九项核验结论表 #N） -->`。
> - **守卫加强**：`open-items-guard ③` 对 documents 复用 specs ⑥ 的同口径——**归档件仍留未勾项时每行必须有 concluded**，不能靠 `status: archived` 掩盖。
> - **过程件**：删除 `.trae-html-share-packages/`（10 个 zip / 6.5 MB，仓库内无生成入口）；`.tmp/` 清空；`.browsers/**/*.log` 已为 0。
> **未选**：保留分享包（支书裁定删）；把 `.trae` 标 `status: archived` 当作结论（守卫已不允许）。
> **读数**：guards **129 文件 / 902 断言全绿（138.9s）**；daily **265 / 107.4s**；`audit-tabs --all` **P0 0 / P1 0 / P2 0 / exception 44**；`.tmp` 0 文件。
> **落点**：`.trae/documents/2026-11-02-audit-consolidation-and-cutover.md`、`server/test/doc-lifecycle-guard.test.mjs`、`.trae-html-share-packages/`（删除）。

## D-909 2026-11-22 — `.trae` 清零与守卫解耦（批次 599）

> **评议 → 裁定 → 落点**：支书问「`.trae` 的 spec 和 documents 还有残存价值吗？没有可删除」⇒ 全部已归档且未勾项全有结论，结论已在 `.ctx/logs`，保留只剩维护成本。
> - **删除**：`.trae/documents`（25）与 `.trae/specs`（18）整目录删除；`.trae` 被 gitignore，不可回滚，删除前结论已写入执行日志批次 599 节。
> - **守卫解耦**：`open-items-guard ③` 改「若 `.trae/**` 存在则校验 archived ＋ 逐行 `concluded`」；删 ⑥ 与 `spec-task-consistency`（3 条）；4 文件 7 处注释出处改「历史 spec（已删）」。
> - **规则改准**：`CLAUDE.md H50.3` ③ 「`.trae/**`（如存在）」；守卫说明同步外部门五项。
> **未选**：保留 `.trae` 作审计痕迹（支书裁定删）；为删除再加备份（`H26.3a` 不备份过程件）。
> **读数**：guards **129/902 → 128/898**；`.trae` 文件数 43 → 0。
> **落点**：`.trae/**`（删除）、`server/test/doc-lifecycle-guard.test.mjs`、`server/test-tier-registry.mjs`、`CLAUDE.md H50.3`。

## D-910 2026-11-22 — 守卫三层收敛：探针优先、归并不删断言（批次 600）

> **评议 → 裁定 → 落点**：支书「守卫最重要的是探测，其次才是改错；太多守卫容易因硬编码过拟合」⇒ 采三层：结果探针 / 语义守卫 / 样式棘轮归并件。
> - **探针**：`npm run probe:stage` 只报 6 步断点（服务 / 核心页 / 写口 / 契约表 / docs 链接 / 层计数），不维护白名单。
> - **归并**：52 个样式 / 文档 / 导航类守卫 → 5 个（`doc-lifecycle` / `style-ratchet` / `color-ratchet` / `component-ratchet` / `navigation`），源件包进独立块作用域，断言逐条保留。
> - **预算**：`test-tier-guard` 改软告警（超登记值 WARN，超 25% 才红）；`H25` 增「新增守卫先并入归并件」。
> - **引用**：29 个 md 的守卫名 / 断言号前缀批量改指归并件，`§0.2` 与 README 测试清单同批对齐。
> **未选**：删断言到 ≤600（会丢覆盖）；保留 52 个源件（文件数不降）。
> **偏差**：目标 ≤80 文件实到 **81**；断言仍 **898**（未删）；guards 墙钟 157s→260s。
> **读数**：`probe:stage` 6/6；guards 81 文件 / 898 断言全绿（260.5s）；daily 265 全绿；`doc-consistency` 21/21。
> **落点**：`server/test/{doc-lifecycle,style-ratchet,color-ratchet,component-ratchet,navigation}-guard.test.mjs`、`server/scripts/probe-stage.mjs`、`server/test-tier-registry.mjs`、`server/test/test-tier-guard.test.mjs`、`CLAUDE.md H25`、`content/**` 29 文件引用。

## D-911 2026-11-22 — docs 抽公共：help 内联资源外抽（批次 601）

> **评议 → 裁定 → 落点**：`help.html` 315KB 把样式 / 脚本与正文混在一起 ⇒ 只搬不改，抽 `docs/src/help.{css,js}`，页面换 `<link>` / `<script src>`。
> - **移出**：`<style>` 25.9KB → `help.css`；内联 `<script>` 1.6KB → `help.js`；带 `?v=20261120a`。
> - **content 去重缩小范围**：`SD-57` 等为跨文档引用（非重复定义）；`OPERATIONS_GUIDE §19`（规则）与 `TERMINOLOGY.md`（词条）职责不同 ⇒ 不删不改。
> **未选**：删 help 章节（会破 `validation-site-coverage` 覆盖）；大改 README 步骤段（收益低）。
> **偏差**：未达「content −20%」目标，只在 help 上取得 −27KB；原因记为「真正重复的是内联资源，不是制度正文」。
> **读数**：`help.html` 315→287.9KB；相关守卫 25/25。
> **落点**：`docs/help.html`、`docs/src/help.css`、`docs/src/help.js`。

> **本文件续编说明**：本文件按批追加、不改写既有条目；当前止于 `D-911`**（共 **85** 条）。

