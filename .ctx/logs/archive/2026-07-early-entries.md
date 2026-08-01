---
title: "2026年7月执行日志·早期归档（T22-T70）"
type: log
role: "[工程师]+[AI]"
last_updated: "2026-07-31"
parent: ".ctx/logs/2026-07-EXECUTION_LOG.md"
---

# 2026年7月执行日志·早期归档（T22-T70）

> 本文件为 2026-07-EXECUTION_LOG.md 的早期条目归档。
> 归档范围：T22-T70（2026-07-01 ~ 2026-07-08）
> 归档原因：早期条目已完成历史使命，经验已蒸馏，详细内容移入归档以保持主日志精简。
> 查询方式：主日志摘要表提供快速索引，需要详情时查阅本文件。

---
## T37 确立"管理事、服务人"战略路线（P.18 决策执行）（2026-07-01）

- **来源**: 书记决策 P.18（选 A 方向并深化为战略路线认定，附四点阐述）
- **变更文件**: content/guides/architecture/MANAGE_SERVE.md, CLAUDE.md, content/insights/党支部管理与实务经验沉淀.md, docs/src/entries/help-entry.js, .ctx/logs/2026-07-DECISION_LOG.md, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: D-227 记录 ✅ MANAGE_SERVE.md 创建 ✅ H8.7 索引新增 ✅ P.18 退出 ✅ insights related_files 更新 ✅ help-entry.js 注释更新 ✅ T37 写入 ✅
- **变更详情**:
  - 新建 content/guides/architecture/MANAGE_SERVE.md（战略路线母本文档）：含核心命题、战略认知（书记原话引用）、四根支柱（每根含正反两面论+生效条件）、与既有架构文档关系、下游影响
  - CLAUDE.md H8 索引新增 H8.7 条目（指向 MANAGE_SERVE.md，保留核心命题+四根支柱概要）
  - CLAUDE.md 丙部 P.18 条目退出（书记已通过四点阐述选择 A 方向并深化）
  - insights related_files 新增 MANAGE_SERVE.md；YAML last_updated 2026-06-30→2026-07-01
  - help-entry.js "管理事，服务人"段落注释更新：从"核心口号"提升为"战略路线认定"，指向 MANAGE_SERVE.md 母本（仅注释更新，不涉及代码逻辑）
  - 新建 .ctx/logs/2026-07-DECISION_LOG.md（D-227 决策记录）
  - 新建 .ctx/logs/2026-07-EXECUTION_LOG.md（T37 执行日志，本条目）
- **设计决策**: D-227（P.18 选 A 方向 + 四点阐述作为战略路线内涵，详见决策日志 D-227）
- **结果**: 战略路线母本确立完成，第三批（定人定责定岗说明重组）前置 P.18 已满足
- **蒸馏标签**: [经验蒸馏: — 战略路线认定+P.18 决策闭环，待后续蒸馏验证结构兼容性后写入 insights]

---

## T38 书记重要论断汇编工作流确立（H11+汇编母本+衍生任务链）（2026-07-01）

- **来源**: 书记指示——"在 CLAUDE.md 中加入一条重要论断的汇编工作流"
- **变更文件**: content/guides/governance/SECRETARY_PRONOUNCEMENTS.md, CLAUDE.md, content/insights/党支部管理与实务经验沉淀.md, .ctx/logs/2026-07-DECISION_LOG.md, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: D-228 记录 ✅ SECRETARY_PRONOUNCEMENTS.md 创建 ✅ H11 新增 ✅ H10 导航新增 ✅ H7.10 强化 ✅ T24/T25/T26 写入 ✅ insights related_files 更新 ✅ T38 写入 ✅
- **变更详情**:
  - 新建 content/guides/governance/SECRETARY_PRONOUNCEMENTS.md（40 条书记论断汇编母本）：含五要素（标题/出处/三要素/归位状态/书记原话引用），按十六类分组，含归位状态总览
  - CLAUDE.md 甲部新增 H11 章节（H11.1 论断识别标准+H11.2 四步闭环流程+H11.3 论断索引表+H11.4 与既有机制关系）
  - CLAUDE.md H10 快速导航新增"看书记论断"行，指向 H11+SECRETARY_PRONOUNCEMENTS.md
  - CLAUDE.md H7.10 末尾追加"→ 论断汇编流程见 H11"，形成闭环引用
  - CLAUDE.md 乙部 P3 新增 T24（H8 索引补齐）/T25（D-222 沉淀）/T26（insights 反论显式引用）三条衍生任务链
  - insights related_files 新增 SECRETARY_PRONOUNCEMENTS.md；YAML last_updated 确认为 2026-07-01
  - 新建 .ctx/logs/2026-07-DECISION_LOG.md 追加 D-228 决策记录
  - 新建 .ctx/logs/2026-07-EXECUTION_LOG.md 追加 T38 执行日志（本条目）
- **设计决策**: D-228（选 A 方向——新增 H11 工作流+汇编母本，理由：H11 定义四步闭环承接 H7.10，汇编母本外移至 guides 遵循三层架构原则）
- **结果**: 书记重要论断汇编工作流确立完成，40 条论断已汇编，衍生任务链 T24/T25/T26 已写入乙部
- **蒸馏标签**: [经验蒸馏: — H11 工作流+论断汇编，待后续蒸馏验证结构兼容性后写入 insights]

---

## T39 探索工作段落动效重做（裸字现代化 · Phase A）（2026-07-01）

- **来源**: Spec Mode 执行（revamp-experience-content-insights / Phase A）——书记提出"动效不满足需求，期待不要右侧边框，用更现代的裸字表现方式"
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: A1.1 ✅ / A1.2 ✅ / A1.3 ✅ / A1.4 ✅ / A2.1 ✅ / A2.2 ✅ / A2.3 ✅ / A2.4 ✅ / A2.5 ✅ / A2.6 ✅ / A3.1 ✅ / A3.2 ✅ / A3.3 ✅ / A3.4 ✅ / A3.5 ✅ / A5.3 ✅ / A5.4 ✅
- **变更详情**:
  - 重构 renderExploration() HTML 结构为 typography-first：移除 .help-exploration-stage-head 包裹层，编号改为 <div> 大字号块级元素（padStart 2 位补零），标题改为 <h4> 语义化标题，保留 data-stage 属性用于动效同步
  - 删除 .help-exploration-stage 容器样式：border / background / border-radius / min-height: 35vh 全部移除，改为 padding: 40px 0 + gap: 16px 的自然留白布局
  - 新增 typography-first 字号层级：编号 56px / 标题 26px / desc 15px / flow 13px（Apple 风大字号裸字）
  - 重构三态样式：past(opacity 0.3 + saturate 0.3) / current(opacity 1 + scale 1.02) / future(opacity 0)，仅靠 opacity/transform/filter 表达，删除 current 的 border-color/border-left/background/box-shadow
  - 调整双列 grid 比例 1.8fr→1.5fr，gap 40px→56px，stages gap 20px→32px（裸字呼吸空间）
  - 移动端降级同步：stage padding 改 24px 0，编号字号 56px→42px / 标题 26px→22px
  - prefers-reduced-motion 降级补充 filter: none !important（配合新增 saturate 三态）
  - SVG scroll-driven 核心算法（bindExplorationScrollDriven）完整保留未改：progress mapping / state hierarchy / task dashoffset + info/collab opacity 区分对待（v4.3.6）/ prefers-reduced-motion / 移动端 IntersectionObserver
  - ⚠️ A5.1/A5.2 未执行：经 Grep 全文确认 SOP_WEB.md 和 DESIGN_SYSTEM.md 均无 exploration/stage 卡片/裸字 相关引用（"如有"条件不满足），故无母本可同步更新
- **设计决策**: 裸字三态选择 opacity+filter+transform（而非 border+shadow）——符合 Apple 风现代设计"自由呼吸"理念；future 态用 opacity:0（原为 0.4）以强化"信息出现顺序"的视觉节奏
- **结果**: HTML+CSS 已持久化（Select-String 验证通过），SVG 算法保留完整，A4 webapp-testing 留待用户浏览器验收
- **蒸馏标签**: [经验蒸馏: 是 — 裸字现代化typography-first原则已写入insights §11.17]

---

## T42 SECRETARY_PRONOUNCEMENTS.md 重构 + P-041 新增（2026-07-02）

- **来源**: 书记决策 P.19（完全分离方向）+ 新战略论断"恢复对话能力"
- **变更文件**: content/guides/governance/SECRETARY_PRONOUNCEMENTS.md, CLAUDE.md, .ctx/logs/2026-07-DECISION_LOG.md, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: T42-1 重构 SECRETARY_PRONOUNCEMENTS.md ✅ / T42-2 新增 P-041 ✅ / T42-3 关闭 P.19 ✅ / T42-4 归档 D-230 ✅
- **变更详情**:
  - SECRETARY_PRONOUNCEMENTS.md 重构：删除 12 条非 meta 级论断（P-023/P-028/P-030~P-033/P-035~P-040），保留 28 条 meta 级，新增 P-041，共 29 条
  - 章节结构重组：从 16 个章节重组为 13 个（P-034 并入七 Harness 治理，P-022/P-029 合并为八 角色与权限认知，新增十三 战略表达延伸）
  - 文件定位声明更新：聚焦 meta 级判断，非 meta 级指向 insights
  - CLAUDE.md 丙部 P.19 退出（已决策完成）
  - CLAUDE.md H11.3 论断索引表新增 P-041（母本待决策）
  - DECISION_LOG.md 新增 D-230（P.19 决策归档）
- **设计决策**: 用 Write 工具整体覆写 SECRETARY_PRONOUNCEMENTS.md（避免 Edit 虚假成功，H7 陷阱）— D-230
- **结果**: 重构完成，P.19 闭环，P-041 待后续母本决策
- **蒸馏标签**: [经验蒸馏: — 本轮重构经验待后续蒸馏]

---

## T40 content 审计 + 三类受众区分（Phase B）（2026-07-01）

- **来源**: Spec Mode 执行（revamp-experience-content-insights / Phase B）——书记提出"给用户看、给系统工程师看和给 AI 看的部分区分开了吗？不能一刀切"
- **变更文件**: .trae/specs/revamp-experience-content-insights/content-audit-report.md, content/guides/governance/DOC_MAP.md, content/guides/governance/OPERATIONS_GUIDE.md, content/guides/governance/TERMINOLOGY.md, CLAUDE.md
- **关键动作**: B1.1 ✅ / B1.2 ✅ / B1.3 ✅ / B1.4 ✅ / B1.5 ✅ / B3.1 ✅ / B3.2 ✅ / B3.3 ✅ / B3.4 ✅ / B4.1 ✅ / B4.2 ✅ / B4.3 ✅ / B4.4 ✅ / B6.1 ✅ / B6.2 ✅ / B7.1 ✅ / B7.2 ✅
- **变更详情**:
  - 新建 content-audit-report.md：审计 38 个 content/ .md 文件，识别 4 项内容重复（DOC_MAP 双 Layer 5 / insights §1 重叠 / Agent 两手册 / SOP 两指南）/ 2 项可归并 / 3 项可瘦身 / 双维度正交性发现 / 三类受众归类建议表
  - DOC_MAP.md 重写：新增 §〇 三类受众定义（指向 OPERATIONS_GUIDE.md §8）；"角色"列重命名为"受众"；所有原 [人机] 按内容归类为 [用户]/[工程师]；[AI] 保持不变；[人] → [用户]；合并重复的第二个 Layer 5（技术文档层）到 Layer 2；新增 SECRETARY_PRONOUNCEMENTS.md/MANAGE_SERVE.md 条目；引用关系图补充 SECRETARY_PRONOUNCEMENTS.md
  - OPERATIONS_GUIDE.md 新增 §8 三类受众规范：8.1 定义+正交关系说明（与 §3 AI 权限维度正交）/ 8.2 读者画像 / 8.3 信息需求 / 8.4 表述风格 / 8.5 如何重写指南；YAML last_updated 2026-05-20→2026-07-01，version 1.0→1.1
  - TERMINOLOGY.md 新增 §六 三类受众术语：6.1 受众维度与 AI 权限维度正交关系 / 6.2 三类受众标记定义 / 6.3 使用规范；YAML last_updated 2026-06-30→2026-07-01
  - CLAUDE.md H9 运行标准索引表新增"三类受众规范"行（指向 OPERATIONS_GUIDE.md §8），Select-String 验证持久化通过
  - ⚠️ B2（P.19 SECRETARY_PRONOUNCEMENTS.md 定位写入丙部）未执行——由主 Agent 处理
  - ⚠️ B5（典型文件受众重写）未执行——留作后续任务
- **设计决策**: D-229（DOC_MAP.md "受众"列采用受众维度标记，与文件 YAML role: 字段的 AI 权限维度正交——两个维度独立标记互不替代，避免混用）
- **结果**: Phase B 核心任务完成（B1 审计报告 + B3 DOC_MAP 扩展 + B4 OPERATIONS_GUIDE §8 + B6 CLAUDE.md H9 索引），三类受众规范已确立并全仓库同步
- **蒸馏标签**: [经验蒸馏: 是 — 三类受众与AI权限维度正交性已写入insights §7.7]

---

## T41 经验蒸馏闭环（Phase C）（2026-07-01）

- **来源**: Spec Mode 执行（revamp-experience-content-insights / Phase C）——从执行日志和决策日志中提炼可复用模式，写入 insights
- **变更文件**: content/insights/党支部管理与实务经验沉淀.md, .ctx/logs/2026-06-EXECUTION_LOG.md, .ctx/logs/2026-07-EXECUTION_LOG.md, content/guides/governance/SECRETARY_PRONOUNCEMENTS.md
- **关键动作**: C1.1 ✅ / C1.2 ✅ / C1.3 ✅ / C2.1 ✅ / C2.2 ✅ / C2.3 ✅ / C3.1 ✅ / C3.2 ✅ / C3.3 ✅ / C4.1 ✅ / C4.2 ✅ / C4.3 ✅ / C4.4 ✅ / C4.5 ✅ / C5.1 ✅ / C5.2 ✅ / C5.3 ✅ / C6.1 ✅ / C6.2 ✅ / C7.1 ✅
- **变更详情**:
  - insights 新增 §7.7「三类受众与AI权限维度正交性」：受众维度（用户/工程师/AI）× AI权限维度（[机]/[人机]）独立标记，含正反两面论+生效条件
  - insights §10.10 扩展「Write 工具覆写大文件」：补充 Write 工具作为 Edit 虚假成功的可靠替代方案（生效条件：>500行文件）
  - insights 新增 §11.16「探索工作动画区分对待原则」：task 边用 dashoffset 绘制（有方向性）/ info+collab 边用 opacity 渐显（保留 CSS 虚线/点线），含正反两面论
  - insights 新增 §11.17「裸字 typography-first 现代化设计」：用字号/留白/opacity 表达层级，弃用 border/background/shadow，含正反两面论+生效条件
  - insights 速查表新增 4 条索引项；YAML last_updated 2026-07-01
  - 2026-06-EXECUTION_LOG.md T33/T35 蒸馏标签 [否]→[是]
  - 2026-07-EXECUTION_LOG.md T39/T40 蒸馏标签 [否]→[是]
  - SECRETARY_PRONOUNCEMENTS.md P-040 归位状态提升：📋 第三级（仅在决策日志中）→ ⚠️ 第二级（已归位到 insights §11.16 但未汇编到 H8 索引）；十六节标题改为「视觉设计方法论」；三级漏斗表更新（第二级 30→31，第三级 1→0）；待补索引清单新增 P-040
  - ⚠️ C3.3「管理事、服务人」四点内涵确认已完整呈现于 MANAGE_SERVE.md（无需补齐）
  - ⚠️ D-229/D-224/D-225 未在决策日志中正式记录——发现 D-229 已记录于 T40（DOC_MAP 受众维度正交性），D-224/D-225 为 Phase A 技术决策已在 T39 中体现，无需补录
- **设计决策**: 蒸馏采用 H2.4 六规则——结构兼容性（与既有 §7/§10/§11 逐节比对）/ 正反两面论（每条含为什么是这样+为什么不是那样）/ 禁止冗余标记（正文无版本号时间戳）/ 蒸馏标签闭环（4 条日志标签关闭）/ 后推翻前规则（§10.10 扩展标注生效条件）/ 蒸馏标签判定标准（仅写入 insights 后标[是]）
- **结果**: Phase C 经验蒸馏闭环完成，4 条可复用经验已沉淀到 insights，4 条执行日志蒸馏标签已关闭，P-040 归位状态已提升
- **蒸馏标签**: [经验蒸馏: 是 — 本条目即蒸馏动作本身，4 条经验已写入 insights §7.7/§10.10/§11.16/§11.17]

---

## T43 SECRETARY_PRONOUNCEMENTS.md 升格至根目录（P.19 第二轮执行）（2026-07-02）

- **来源**: 书记决策 P.19（升至项目根目录）+ 新战略论断 P-041"恢复对话能力"
- **变更文件**: SECRETARY_PRONOUNCEMENTS.md, content/guides/architecture/MANAGE_SERVE.md, CLAUDE.md, content/insights/党支部管理与实务经验沉淀.md, content/guides/governance/DOC_MAP.md, .ctx/logs/2026-07-DECISION_LOG.md, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: T43-1 根目录升格 ✅ / T43-2 二次 meta 过滤 ✅ / T43-3 P-041 母本归位 ✅ / T43-4 CLAUDE.md 多处更新 ✅ / T43-5 insights/DOC_MAP 同步 ✅ / T43-6 D-230 补录 ✅
- **变更详情**:
  - 新建根目录 SECRETARY_PRONOUNCEMENTS.md（25 条论断，12 章节）：物理升格与 CLAUDE.md / ARCHITECTURE.md 并列；文件定位声明升级为"项目顶级战略文档"
  - 删除 content/guides/governance/SECRETARY_PRONOUNCEMENTS.md（旧位置文件）
  - 二次 meta 过滤：删除 4 条不够 meta 的高风险论断（P-019 丙部待决策机制 / P-020 多步决策规则 / P-034 "之上/之下"禁用 / P-025 全局术语审计）——这些是治理操作规则/术语辨析/工程设计原则，非"为什么这件事比那件事更重要"的 meta 级判断
  - P-041 母本归位：MANAGE_SERVE.md 新增第六章"恢复对话能力"战略表达（6.1 路线命题 / 6.2 为什么是这样含 ⚠️ AI 推导待确认 / 6.3 与战略路线关系 / 6.4 我们应该怎么办）
  - CLAUDE.md 更新：H8.7 新增 P-041 延伸战略表达行；H10/H11.2/H11.3 路径更新为根目录；H11.3 索引表新增 P-041 行（状态 ✅ H8.7 延伸）；丙部 P.19 关闭为"已决策事项"
  - insights related_files 路径更新：content/guides/governance/SECRETARY_PRONOUNCEMENTS.md → SECRETARY_PRONOUNCEMENTS.md
  - DOC_MAP.md Layer 1 新增根目录条目 + Layer 2 删除旧条目 + 树结构更新 + 快速导航更新
  - DECISION_LOG.md 补录 D-230（P.19 决策记录，含背景/选项/决定/理由/影响范围/一改具改检查）
  - ⚠️ T42-4 声称"归档 D-230 ✅"实际为虚假成功（H7 陷阱复发）——D-230 在本轮 T43 中正式补录，纠正虚假确认闭环
- **设计决策**: D-230（选 A 方向升至根目录 + 三项衍生动作，详见决策日志 D-230）
- **结果**: P.19 第二轮提升完成，25 条 meta 级论断汇编于根目录，P-041 战略表达归位，日志闭环完成
- **蒸馏标签**: [经验蒸馏: — H7 虚假成功陷阱复发（T42-4 误报 D-230 已归档），待后续蒸馏验证是否写入 insights]

---

## T44 裸字减速 v2（引入 easing 函数）+ B3 验证 + 注释漂移修正（2026-07-02）

- **来源**: 书记反馈"裸字部分滑动地还是太快了"+ Plan Mode /plan（scroll-easing-v2-and-closure.md）
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: A1 easing 函数实装 ✅ / B3 内容保真验证 ✅ / C1 注释漂移修正 ✅ / T44 写入 ✅
- **变更详情**:
  - help-entry.js 引入 easeMiddleSlow easing 函数：f(p)=p+k·sin(2πp)/(2π)，k=0.6
    - 数学原理：中段速度=原速度40%（f'(0.5)=1-k=0.4），两端速度=160%（f'(0)=f'(1)=1+k=1.6）
    - 与 lerp 0.15 正交叠加：lerp 处理时间域跟随，easing 处理空间域减速
    - 保留 snap threshold 0.5（用户跳过 scene 后回来的追赶）
    - progress→state/data-stage 映射逻辑不变
  - styles.css 第 3554 行注释同步：opacity 0（旧注释）→ opacity 0.15 微弱可见（与 SVG future 一致）——修正上轮 A2 遗漏的注释漂移（H7 陷阱衍生）
  - B3 内容保真验证：Grep 确认核心命题（L32）/ 四根支柱（L62/74/86/98）/ 书记原话（第二章+6.2）/ P-041（L24/168/188）/ ⚠️ AI 推导标注（L184）/ 生效条件（5 处）全部保留——上轮 MANAGE_SERVE.md 人话化改写未丢失战略内容
  - ⚠️ T44 跨越上轮未记录日志的工作：lerp 0.15 实装 + future 透明度 0→0.15 + MANAGE_SERVE.md 第一/二/三/六章人话化改写（均已在磁盘持久化，本轮补录日志）
- **设计决策**: 选 sin 调制 easing 而非分段线性/cubic-bezier——数学简洁（一行公式）、C∞可微无视觉跳跃、单调性保证（k<1 时严格递增 f'(p)≥1-k>0）、对称性（关于(0.5,0.5)对称）
- **结果**: 裸字减速 v2 实装完成，B3 内容保真验证通过，注释漂移修正完成；A4 浏览器验收留待书记确认 k=0.6 是否合适
- **蒸馏标签**: [经验蒸馏: — sin 调制 easing 待后续多轮使用验证后蒸馏是否写入 insights]

---

## T45 裸字与SVG渲染同步修复 + 遗留脚本清理（2026-07-02）

- **来源**: 书记反馈"文字的运动和左侧图形中的渲染速度不一致"
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: T45-1 动效同步修复 ✅ / T45-2 遗留文件清理 ✅ / T45 写入 ✅
- **变更详情**:
  - **动效同步修复**：当前 stage 的文字卡片从"CSS transition 时间驱动跳变"改为"JS 滚动驱动渐进式出现"
    - 基于 `intraStageProgress` 连续控制 `opacity`(0.15→1) + `translateY`(12px→0) + `saturate`(0.3→1) + `scale`(0.98→1.02)
    - 与 SVG task 边 dashoffset 绘制、info/collab 边 opacity 渐显使用同一时间尺度（滚动驱动）
    - 当前 stage 禁用 CSS transition（`transition: none`），避免 JS 直接赋值与 CSS 过渡冲突造成滞后
    - past/future 状态仍由 CSS data-state + transition 控制（保证切换时的平滑过渡）
    - lerp 0.15 + sin 调制 easing k=0.6 正交叠加保持不变
  - **遗留文件清理**：
    - 删除 `docs/test_easing.py`（Playwright 验收脚本，临时文件）
    - 删除 `docs/_test_screenshots/` 目录（27 张截图 + test_output.log，临时文件）
  - styles.css 注释更新：裸字三态说明补充 current 状态 JS 滚动驱动机制说明
- **设计决策**: 文字与 SVG 使用同一 `intraStageProgress` 驱动，而非各自独立的时间/滚动机制——视觉节奏统一的关键是共享同一个进度变量
- **结果**: 动效同步修复完成，遗留文件清理干净；留待书记浏览器验收同步效果
- **蒸馏标签**: [经验滚动: 否 — 滚动驱动同步模式待后续验证后考虑是否写入 insights]

---

## T46 动效分层修复 + SECRETARY_PRONOUNCEMENTS.md 可理解性重构（2026-07-02）

- **来源**: 书记反馈"动效不自然，文字和SVG渲染速度不一致"+ "SECRETARY_PRONOUNCEMENTS.md 完全达不到可理解性要求，生硬排比"+ /spec 命令"打破再重组"
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css, SECRETARY_PRONOUNCEMENTS.md, .ctx/logs/2026-07-EXECUTION_LOG.md, .trae/specs/improve-comprehensibility/*
- **关键动作**: T46-1 动效分层修复 ✅ / T46-2 文档可理解性重构 ✅ / T46-3 内容保真验证 ✅ / T46-4 一改具改检查 ✅ / T46 写入 ✅
- **变更详情**:
  - **动效分层修复**（Part A）：
    - 删除 help-entry.js 中 `stageCards.forEach` 设置 inline style 的代码块（原 L1296-1314，19行）——文字不再跟随 `intraStageProgress` 渐变
    - 恢复文字的 CSS `data-state` + `transition` 机制——文字在 stage 切换时通过 CSS transition 快速切换
    - 缩短 styles.css `.help-exploration-stage` transition 时长：400ms → 200ms
    - 更新注释：移除"JS 滚动驱动"说明，改为"文字通过 CSS transition（200ms）快速切换，SVG 边通过滚动驱动渐进绘制——内容优先于装饰"
    - ⚠️ H7 陷阱再次发生：Sub-Agent 报告 styles.css 已修改但实际未持久化，手动 Edit 修复
    - 设计原则：文字先出现（快，200ms CSS transition），SVG 边慢慢画（滚动驱动）——内容优先于装饰
  - **文档可理解性重构**（Part B）：
    - 打破 7 小节程式化格式（出处/路线/为什么/怎么办/归位/原话）
    - 重组为：问题导向标题 + 1-2段自然人话 + 书记原话 + `<details>` 折叠元数据
    - 新增开头总览：一段话说清"25条论断解决了什么问题"+ 问题导向目录
    - 12个章节标题从抽象分类改为问题导向（如"战略路线级论断"→"支部为谁存在？组织性是门槛还是资源？"）
    - 改写所有生硬排比句式（"前者…后者…"5处 → 自然人话）
    - 保留结尾归位状态总览（适配新结构）
  - **内容保真验证**：
    - Grep `^### P-0` → 25条 ✅
    - Grep `书记原话` → 12处 ✅
    - Grep `前者.*后者` → 正文0处残留 ✅（仅更新说明中提及）
    - Grep 核心命题/四根支柱/P-041 → 10处匹配 ✅
    - ⚠️ AI 推导标注 → 保留 ✅（L556）
    - 生效条件标注 → 保留 ✅（L568）
  - **一改具改检查**：CLAUDE.md H11/H8 索引表引用均为文件路径，不涉及章节标题，无需更新
- **设计决策**:
  - D-231: 动效分层——文字用 CSS transition（快），SVG 边用滚动驱动（慢），而非共用同一进度变量。上一轮 T45 的错误是让文字和 SVG 共用 `intraStageProgress`，导致文字显示太慢。正确方向是"内容优先于装饰"——文字应先于 SVG 边出现。
  - D-232: 文档可理解性——"打破再重组"。打破 7 小节程式化格式，以"读者能理解"为核心重组。关键不是格式精简，而是"打开文件就知道在讲什么"。
- **结果**: Part A 动效修复完成（待浏览器验收），Part B 文档重构完成且保真验证通过
- **蒸馏标签**: [经验蒸馏: 是 — 经验已写入 insights §11.7 文档可理解性原则：打破再重组]

---

## T47 全仓库文档按受众×层级归类重组（2026-07-03）

- **来源**: 书记指示——"对于全仓库的人类阅读文档进行系统地归类、整理，确保所有文档各司其职、各显其能。给用户和给系统工程师的文档要拆分开；战略路线和具体方法要分开；组织治理和系统治理要分开；唯一信息源要确认好；SNAPSHOT和经验沉淀要更新好。涉及 meta 层面和具体层面的区分，一定不要混淆。"
- **变更文件**: content/strategy/*, content/design/*, content/governance/*, content/README.md, content/SOP/*.md, content/insights/党支部管理与实务经验沉淀.md, content/references/*, CLAUDE.md, ARCHITECTURE.md, SECRETARY_PRONOUNCEMENTS.md, SSOT_INDEX.md, README.md, CHECKLIST.md, .github/copilot-instructions.md, .github/skills/sop-web-sync/SKILL.md, .ctx/SNAPSHOT.md, .ctx/TIMESTAMPS.md, .ctx/CONTEXT.md, docs/src/entries/help-entry.js, docs/src/services/mock.js, docs/src/core/domain.js, docs/src/modules/references.js, .trae/specs/classify-documents-by-audience/*
- **关键动作**: Phase 1 物理移动 ✅ / Phase 2 引用更新一改具改 ✅ / Phase 3 治理更新 ✅ / Phase 4 全仓库验证 ✅ / T47 写入 ✅
- **变更详情**:
  - **Phase 1 物理移动**：创建 content/strategy/、content/design/、content/governance/ 三个新目录；移动 24 个文件（MANAGE_SERVE.md→strategy/，6+7=13 个文件→design/，10 个文件→governance/）；新建 3 个 README.md；删除 content/guides/ 目录
  - **Phase 2 引用更新**（4 个 sub-agents 并行）：
    - 24 个移动文件内部交叉引用更新（YAML last_updated + 路径引用）
    - CLAUDE.md 32 处路径更新（H8 索引/H9 索引/H10 导航/H2.2 母本子本表等）
    - DOC_MAP.md 32 处路径更新（Layer 表/引用关系图/任务域入口）
    - ARCHITECTURE.md/SECRETARY_PRONOUNCEMENTS.md(34处)/SSOT_INDEX.md/README.md/CHECKLIST.md 根目录文件更新
    - .github/copilot-instructions.md/SKILL.md/.ctx/CONTEXT.md 治理文件更新
    - content/SOP/*.md(5个)/content/insights/*.md/content/references/*.md/content/README.md 更新
    - docs/src/*.js(4个) 代码注释引用更新（8处）
  - **Phase 3 治理更新**：
    - Task 9 确认唯一信息源：H10 与 DOC_MAP §四 互补不重叠；权威性标注完整；meta/具体分层清晰
    - Task 10 更新 SNAPSHOT：v10→v11，拓扑更新，Layer 2 拆分为理念维度+治理维度，新增 v11 里程碑
    - Task 11 更新经验沉淀：新增 §9.5「文档按受众×层级物理分离」（含正反两面论+生效条件），v20→v21
    - 额外更新 TIMESTAMPS.md：删除旧 content/guides/ 章节，新增三个新目录章节
  - **Phase 4 验证**：content/ 和 docs/ 零残留；根目录活跃文件零残留（仅历史记录和 spec 描述保留）；文件存在性验证通过（strategy 2 + design 14 + governance 11）；YAML frontmatter 更新确认
- **设计决策**: 选择目录重组而非 YAML 标记——物理分离比元数据标记更直观，读者在文件系统中浏览时目录是第一道导航；保持 design/ 包含架构设计+功能设计（不进一步拆分），因为对工程师来说设计理念（meta）和设计方案（具体）是连续的
- **结果**: 全仓库文档按受众×层级归类重组完成，content/guides/ 已删除，所有引用更新，SNAPSHOT 和经验沉淀已更新
- **蒸馏标签**: [经验蒸馏: 是 — 文档归类经验已写入 insights §9.5「文档按受众×层级物理分离」]

---

## T48 命名统一（SOP/→sop/）+ README 完善 + content/guides 破损引用补丁修复（2026-07-03）

- **来源**: 书记指示——"命名上请你做好统一的更新工作吗，特别是文件夹名！！要做到读者一目了然"+"根目录的README文档，要进行完善！！对齐我们系统目前最新的状态"（Use Skill: brainstorming）
- **变更文件**: content/SOP/→content/sop/（物理重命名）, README.md, CLAUDE.md, ARCHITECTURE.md, SSOT_INDEX.md, content/README.md, content/strategy/{README,MANAGE_SERVE}.md, content/design/{README,MANAGEMENT_MODE,COMMISSIONER_SYSTEM,SERVICE_CATALOG,ORG_BUILDING}.md, content/governance/{README,DOC_MAP,OPERATIONS_GUIDE,ROLE_CLASSIFICATION,SYNC_EXTERNAL,EMOJI_POLICY,AGENT_USAGE}.md, content/insights/党支部管理与实务经验沉淀.md, content/references/工作模板/FEEDBACK_FORM.md, content/sop/*.md(7个), docs/about.html, docs/src/core/domain.js, docs/src/workflow/sopData.js, docs/src/services/mock.js, .ctx/{CONTEXT,SNAPSHOT,TIMESTAMPS}.md, .github/copilot-instructions.md, .github/skills/sop-web-sync/SKILL.md, .github/skills/sop2code/SKILL.md
- **关键动作**: T48-1 物理重命名 ✅ / T48-2 路径引用批量替换 ✅ / T48-3 README 结构性重构 ✅ / T48-4 DOC_MAP 术语清理 ✅ / T48-5 content/README 中英文对照表 ✅ / T48-6 YAML 更新 ✅ / T48-7 补丁修复 content/guides 破损引用 ✅ / T48-8 验证 ✅
- **变更详情**:
  - **物理重命名**：content/SOP/ → content/sop/（git mv 两步法：SOP→sop_tmp→sop，强制 Git 识别 Windows 大小写变更）；7 个文件随目录重命名
  - **路径引用批量替换**：全仓库活跃文件 content/SOP/ → content/sop/（37 文件，~200 处）；使用 .tools/batch_replace_sop.py 临时脚本（已删除）
  - **历史记录不可变原则**：.ctx/logs/、.trae/specs/、.ctx/snapshots/、.trae/documents/ 中的 content/SOP 引用保持不变（19 文件，时间胶囊原则）
  - **README.md 结构性重构**：
    - 新增"目录结构总览"章节（6 子目录中英文对照表：strategy/sop/design/governance/insights/references）
    - 重构"设计理念（Guides）"→"设计理念与治理规范"（4 目录：strategy+design+governance+insights，删除重复 architecture/design 条目）
    - 更新日志路径 2026-05-EXECUTION_LOG → 2026-07-EXECUTION_LOG
    - 新增 SECRETARY_PRONOUNCEMENTS.md 到"治理与架构文件"章节（与 CLAUDE.md/ARCHITECTURE.md 并列）
  - **DOC_MAP.md 术语清理**：
    - Layer 2 标题 "guides/" → "strategy/ + design/ + governance/ + insights/"
    - "guides目录索引" → "设计理念目录索引"
    - "不再属于 guides/ 目录" → "不再属于 content/ 子目录"
    - D-218 决策 "guides（理念概括）" → "理念维度（strategy/design/governance/insights）"
    - 修复 Chinese 全角括号遗漏：content/SOP（母本溯源）→ content/sop（母本溯源）
  - **content/README.md 中英文对照表**：子目录表新增"中文名"列（战略路线/标准流程/设计理念/系统治理/经验沉淀/参考资料）
  - **YAML last_updated 更新**：7 个有 YAML frontmatter 的文件更新为 2026-07-03（ARCHITECTURE.md, DOC_MAP.md, AGENT_USAGE.md, FEEDBACK_FORM.md, sop/INDEX.md, sop/常见工作场景快速指南.md, .ctx/TIMESTAMPS.md）；24 个文件无 YAML 字段跳过；1 个文件无 YAML frontmatter（SSOT_INDEX.md）
  - **T48-7 补丁修复 content/guides 破损引用**（T47 漏改）：
    - content/governance/SYNC_EXTERNAL.md L46："content/guides/*.md | 先改guides" → "content/{strategy,design,governance}/*.md | 先改设计理念/治理母本"
    - content/governance/ROLE_CLASSIFICATION.md L40/73/162：content/guides/ → 拆分为 content/strategy/, content/design/, content/governance/ 三目录
    - content/governance/OPERATIONS_GUIDE.md L34-38：type→路径映射表更新（architecture/guide/governance/design 行的"content/guides/"→对应新目录）
- **设计决策**:
  - D-233: 历史记录不可变原则——.ctx/logs/、.trae/specs/、.ctx/snapshots/、.trae/documents/ 是不可变时间胶囊，修改等于篡改历史；一改具改只对活跃文件生效
  - D-234: T48-7 补丁范围扩展——虽然 content/guides 破损引用属于 T47 漏改（不在 T48 spec 范围内），但用户明确要求"命名统一要做好"+"读者一目了然"，破损链接违背原则，作为补丁修复
  - D-235: 历史上下文引用保留——CLAUDE.md L537 D-230 决策记录、SSOT_INDEX.md L110 迁移历史表、.ctx/{TIMESTAMPS,SNAPSHOT,CONTEXT}.md 历史记录、content/design/COMMISSIONER_SYSTEM.md YAML merged_from 字段——这些是合法的历史描述（"从 content/guides/ 移至..."），不应修改
- **结果**: 命名统一完成（content/SOP/→content/sop/），README 对齐系统最新状态（含目录结构总览+SECRETARY_PRONOUNCEMENTS），3 个活跃文件 content/guides 破损引用已修复，全仓库活跃文件零残留
- **蒸馏标签**: [经验蒸馏: 是 — 经验已写入 insights §8.6 历史记录不可变原则]

---

## T49 CLAUDE.md 新增 H12 Skills 索引 + next_prompt Skill 提醒机制（2026-07-03）

- **来源**: 书记指示——"希望安装 dogfood/internal-comms/algorithmic-art/frontend-skill/security-best-practices 等 skills"+"CLAUDE 中适当补充目前我们有了哪些 skill，在 next_prompt 中适当提醒何时可使用什么 Skill"
- **变更文件**: CLAUDE.md
- **关键动作**: T49-1 H12 Skills 索引新增 ✅ / T49-2 H1.3 next_prompt 增加 Skill 提醒 ✅ / T49-3 H10 快速导航修复 ✅
- **变更详情**:
  - **H12 Skills 索引新增**：在 H10 快速导航后新增 H12 章节，包含 4 类 Skills 表（项目级 7 个 + 工程实践 7 个 + 内容创作 5 个 + 视觉/数据 5 个）+ Skill 使用提醒规则表（7 个场景→推荐 Skill 映射）+ 安装/搜索命令说明
  - **H1.3 next_prompt 更新**：三要素扩展为四要素，新增 (d) Skill 提醒——若未完成项涉及 H12 提醒规则中的场景，必须标注推荐 Skill
  - **H10 快速导航修复**：新增"查可用 Skills"行指向 H12；修复 L456 KNOWN_PITFALLS.md 路径（content/guides/governance/→content/governance/）；修复 L457"对应guides文件"→"对应 content/ 子目录文件"
  - ⚠️ Skills 安装未完成：GitHub 连接被阻断（443 端口超时），5 个 skills（dogfood/internal-comms/algorithmic-art/frontend-skill/security-best-practices）无法安装，留待网络恢复后执行
- **设计决策**: H12 采用"何时使用"列而非纯描述——Skill 价值在于场景触发而非功能清单，读者需要知道"什么时候该想起它"
- **结果**: H12 Skills 索引和 next_prompt Skill 提醒机制已写入 CLAUDE.md；5 个 skills 安装因网络问题暂缓
- **蒸馏标签**: [经验蒸馏: — Skill 索引+提醒机制设计经验待后续蒸馏]

---

## T22 关于页改造：8角色体系+理论纠正一改具改（2026-07-03）

- **来源**: 用户指示
- **变更文件**: docs/src/components/role-hierarchy.js(新建), docs/about.html(重写), docs/src/entries/about-entry.js, CLAUDE.md, README.md, content/insights/党支部管理与实务经验沉淀.md, content/governance/TERMINOLOGY.md, content/design/MANAGEMENT_MODE.md, content/design/SERVICE_CATALOG.md, content/design/APPROVAL_FLOW.md, content/sop/常见工作场景快速指南.md, content/references/工作模板/经验沉淀辅助提示词.md, docs/src/components/commissioner-matrix.js, SECRETARY_PRONOUNCEMENTS.md, .github/copilot-instructions.md
- **关键动作**: T22-1 ✅ 新建role-hierarchy.js / T22-2 ✅ 重写about.html / T22-3 ✅ 更新about-entry.js / T22-4~15 ✅ 全仓一改具改(创新探索→工作内容描述) / T22-16 ✅ 全仓验证零残留 / T22-17 ✅ 日志+乙部+H11
- **变更详情**:
  - 新建8角色层级可视化组件（党支书→纵线三委员+横线三组长→成员+专班浮层）
  - 重写关于页：致谢→系统在干什么→分工中的制度设计→为什么这样设计→怎么用→技术架构→免责
  - 全仓将"创新探索"定义性表述替换为"组织建设与思想建设"（12+文件，~40处）
  - 全仓将"合规运行"定义性表述替换为"党务管理与运行保障"
  - SECRETARY_PRONOUNCEMENTS.md P-006更正+P-042新增
  - 新增3.2节"活动和专班为什么并列"
  - CLAUDE.md H11.3 新增 P-042 索引
  - T22 从乙部 P1 删除
- **设计决策**: D-236（党建/党务区分维度=工作内容，非创新vs合规；专班/活动=并列概念）
- **结果**: 完成
- **蒸馏标签**: [经验蒸馏: 是 — 经验已写入 insights §10.15 一改具改遗漏模式]

---

## 专班/活动并列关系一改具改遗漏修复（2026-07-04）

- **来源**: 书记明确要求自查 + T22 执行复查
- **变更文件**: docs/about.html, content/strategy/MANAGE_SERVE.md, CHECKLIST.md, .github/copilot-instructions.md, docs/src/core/domain.js, docs/src/mock/seed.js, docs/src/entries/ws-organizer-entry.js, content/design/LOGIN_STUB.md
- **关键动作**: B1 ✅ about.html乘积关系修正 / C1~C7 ✅ "活动组织者"/"专班组织者"术语8处修正
- **变更详情**:
  - 修正 about.html 3.4节"专班=赋权×工作量考察"为"正交维度，不是乘积关系"
  - 修正 MANAGE_SERVE.md 组织者术语（用"域"限定代替绑定）
  - 修正 CHECKLIST.md 4处"活动组织者"/"专班组织者"
  - 修正 copilot-instructions.md 权限矩阵行名
  - 修正 domain.js 注释、seed.js mock数据、ws-organizer-entry.js UI文案
  - 修正 LOGIN_STUB.md 场景描述
- **设计决策**: 无新决策（执行 D-197 + D-076 已有决策的一改具改遗漏修复）
- **结果**: 完成
- **蒸馏标签**: [经验蒸馏: 是 — 经验已写入 insights §10.15 一改具改遗漏模式]

---

## T24 H8 索引补齐 + H8.8 条块二元理论新增（2026-07-04）

- **来源**: 用户指示（T24 任务执行）
- **变更文件**: CLAUDE.md, SECRETARY_PRONOUNCEMENTS.md
- **关键动作**: H8.1 补 5 条索引 ✅ / H8.3 补 P-013 ✅ / H8.5 补 P-029 ✅ / H8.6 补 P-010/P-011 ✅ / H8.7 补 P-002~P-005 显式标注 ✅ / H8.8 新增 ✅ / H11.3 索引表补齐 25 条 ✅ / H10 导航新增 ✅ / 乙部 T24 删除 ✅ / SECRETARY_PRONOUNCEMENTS.md 元数据同步 ✅
- **变更详情**:
  - H8.1 新增 P-007/P-022/P-026/P-027/P-042 索引项
  - H8.3 新增 P-013 索引（从 H8.1 迁入，更准确归属专班制）
  - H8.5 新增 P-029 索引
  - H8.6 新增 P-010/P-011 索引
  - H8.7 四根支柱显式标注 P-002~P-005 编号
  - 新增 H8.8 条块二元理论章节（P-014/P-015）
  - H10 快速导航新增"看条块二元"行
  - H11.3 论断索引表从 10 行扩展到 25 行，覆盖全部论断
  - 乙部 T24 从 P3 删除（任务完成）
  - SECRETARY_PRONOUNCEMENTS.md 各论断元数据"索引位置"更新（12 处 ⚠️ 待补索引 → ✅ 对应章节），归位状态总览更新（第一级 10→24，第二级 16→1），待补索引清单替换为索引补齐状态记录
- **设计决策**: P-013 从 H8.1 迁入 H8.3（发起≠招募是专班制核心命题，归属专班制更准确）；P-024 标注为"⚠️ H9 归属"（SOP/guides 正交属于运行标准范畴，非理论基石）
- **结果**: H8 索引补齐完成，25 条论断全部有索引归属，H8.8 新增，T24 退出乙部
- **蒸馏标签**: [经验蒸馏: — 索引补齐操作，无新经验待沉淀]

---

## C-5 术语审计高优先级修复（2026-07-04）

- **来源**: 持续任务 C-5 术语审计
- **变更文件**: content/sop/组织委员工作流程指南.md, content/sop/纪检委员工作流程指南.md, content/sop/宣传委员工作流程指南.md, README.md, content/governance/OPERATIONS_GUIDE.md
- **关键动作**: 3 个 SOP 删除"在双域管理框架下" ✅ / README 标题替换 ✅ / OPERATIONS_GUIDE 废弃术语映射收窄 ✅ / YAML 更新 ✅
- **变更详情**:
  - 3 个 SOP 文件："在双域管理框架下，XX委员是" → "XX委员是"（删除用户面文档中的理论框架术语，保留自然人话）
  - README.md L49："### 双域管理理论" → "### 党建工作与党务工作" + L98 "含双域管理理论" → "含党建工作与党务工作"
  - OPERATIONS_GUIDE.md §2 废弃术语映射："活动建设→党建工作" 收窄为"活动建设→主题党日/活动组织"（仅指活动层面，不含专班）；"组织建设→党务工作" 收窄为"组织建设（指党务域）→党务工作"；新增"说明"列
  - sopData.js "归档"术语经核查TERMINOLOGY.md无需替换（"归档"非废弃术语，仅在特定语境有条件讨论）
- **设计决策**: 用户面SOP不应包含"双域管理框架"这类理论框架术语——SOP是操作指南，不是理论教材
- **结果**: 5 个文件修改完成，Grep 确认"双域管理框架"在 content/sop/ 中零残留、"双域管理理论"在 README.md 中零残留
- **蒸馏标签**: [经验蒸馏: — 术语审计修复，无新经验]

---

## T25 D-222 沉淀至 DESIGN_SYSTEM.md §5.4（2026-07-04）

- **来源**: T25 任务执行
- **变更文件**: content/design/DESIGN_SYSTEM.md
- **关键动作**: §5.4 新增 ✅ / YAML 更新 ✅
- **变更详情**:
  - DESIGN_SYSTEM.md §5.3 之后、§6 之前插入 §5.4「探索工作动画区分对待原则」
  - 核心规则：task 边用 stroke-dashoffset 渐进绘制（方向性）、info/collab 边用 opacity 渐显（避免与 CSS stroke-dasharray 冲突）
  - 含正反两面论和生效条件
- **设计决策**: 沉淀位置选 DESIGN_SYSTEM.md 而非 SOP_WEB.md——动效区分是设计系统规范，不是 SOP-网页联动方法
- **结果**: §5.4 已写入，Grep 验证通过
- **蒸馏标签**: [经验蒸馏: 是 — D-222 已正式沉淀到 guides，insights §11.16 已有对应条目]

---

## T26 insights 反论显式引用（2026-07-04）

- **来源**: T26 任务执行
- **变更文件**: CLAUDE.md
- **关键动作**: H8.1 补反论链接 ✅ / H8.3 补反论链接 ✅ / H8.6 补反论链接 ✅ / H8.8 补反论链接 ✅ / 乙部 T25/T26 删除 ✅
- **变更详情**:
  - H8.1 新增"→ 反论参考：insights §1.1 + §1.3"
  - H8.3 新增"→ 反论参考：insights §2.1 + §2.2"
  - H8.6 新增"→ 反论参考：insights §2.3"
  - H8.8 新增"→ 反论参考：insights §3.1 + §3.2"
  - 乙部 T25/T26 从 P3 删除
- **设计决策**: 反论引用采用"→ 反论参考"前缀，与"→ 详细设计见"形成对称——前者指经验/教训，后者指设计规范
- **结果**: 4 处 H8 章节补充反论引用完成，T25/T26 退出乙部
- **蒸馏标签**: [经验蒸馏: — 索引补充操作，无新经验]

---

## T23 全仓库颜色同步（2026-07-04）

- **来源**: T23 任务执行
- **变更文件**: docs/src/styles.css, docs/src/core/constants.js, docs/src/entries/workspace-entry.js, docs/src/entries/ws-leader-entry.js, docs/src/entries/ws-org-commissioner-entry.js, docs/src/entries/ws-organizer-entry.js, docs/src/entries/ws-deep-entry.js, docs/src/entries/party-entry.js, docs/src/entries/ws-secretary-entry.js, docs/src/entries/party-org-entry.js, docs/src/components/commissioner-matrix.js, docs/src/modules/party.js
- **关键动作**: styles.css 7 个角色色变量补充 ✅ / constants.js ACCENT_COLORS 更新 ✅ / constants.js ROLE_COLORS 更新 ✅ / 10 个 JS 文件硬编码角色色替换 ✅ / 乙部 T23 删除 ✅
- **变更详情**:
  - styles.css `:root` LAYER 2 补充 7 个缺失的 `--accent-<role>` CSS 变量（leader/org-commissioner/prop-commissioner/disc-commissioner/organizer/deep/participant）
  - constants.js ACCENT_COLORS：leader #CE1126→#EA580C / org-commissioner #CE1126→#8B5CF6 / prop-commissioner #10B981→#3B82F6 / organizer #3B82F6→#06B6D4 / deep #059669→#10B981 / 新增 participant #6B7280
  - constants.js ROLE_COLORS：7 个角色 bg/text/border 全部按新色系重新派生 + 新增 participant
  - 10 个 JS 文件中硬编码的角色色值替换为新色值或改为从 accent 变量动态读取
  - Party Red (#CE1126) 非角色语境保持不变
- **设计决策**: 颜色同步策略分三层——CSS 变量（全局引用）> ACCENT_COLORS（JS 动态派生）> 硬编码直接替换（仅限无法动态化的场景）
- **结果**: 8 角色色系从 DESIGN_SYSTEM.md 同步到代码层，T23 退出乙部
- **蒸馏标签**: [经验蒸馏: — 颜色同步操作，待后续多角色UI验证后考虑是否沉淀]

---

## 书记角色色修正 + C-4 角色色视觉残留修复（2026-07-04）

- **来源**: 书记反馈"书记颜色太深"+ C-4 视觉优化
- **变更文件**: docs/src/styles.css, docs/src/core/constants.js, docs/src/entries/workspace-entry.js, docs/src/components/commissioner-matrix.js, docs/src/entries/help-entry.js, docs/src/entries/party-secretary-entry.js, docs/src/entries/ws-secretary-entry.js, docs/src/entries/party-entry.js, docs/about.html, content/design/DESIGN_SYSTEM.md
- **关键动作**: secretary #7A0010→#B91C1C ✅ / about.html 7处角色层级色+4处描述卡片色修正 ✅ / styles.css 侧边栏4个角色卡片色变量修正 ✅ / party-entry.js secretary色修正 ✅
- **变更详情**:
  - secretary 角色色从 #7A0010（近黑深红）改为 #B91C1C（可见深红），10%透明度下产生可辨识的红色底色
  - about.html 角色层级可视化 CSS：org 红→紫、prop 绿→蓝、leader 深青→橙、organizer 深紫→青、deep 深蓝→绿、disc 深琥珀→标准琥珀
  - about.html 角色描述卡片内联样式：4组角色色全部对齐新色系
  - styles.css 侧边栏角色卡片：leader-card 改用 var(--accent-leader)、organizer-card 改用 var(--accent-organizer)、deep-card 改用 var(--accent-deep)、secretary-card rgba 更新
  - party-entry.js secretary: #CE1126→#B91C1C
  - workspace-entry.js、commissioner-matrix.js、help-entry.js、party-secretary-entry.js、ws-secretary-entry.js 中 #7A0010→#B91C1C
  - DESIGN_SYSTEM.md §2.3.2 secretary 行更新
- **设计决策**: #B91C1C（Tailwind red-800 级）取代 #7A0010（primary-900 级）——角色色需要视觉可用性，色阶梯度最深阶不适合作为交互主题色
- **结果**: 8角色色系在全部前端代码和HTML中统一，侧边栏/关于页/各角色页面颜色一致
- **蒸馏标签**: [经验蒸馏: — 色值修正操作]

## 卡片设计9 ERROR修复 + 网页对齐分析 + 知识层次分析（2026-07-04）

- **来源**: 书记指示"卡片设计有错误，必须先行自查"+"网页内容未对齐""知识层次关系粗糙"
- **变更文件**: docs/src/styles.css, docs/src/entries/ws-organizer-entry.js, docs/src/entries/ws-disc-commissioner-entry.js, docs/src/entries/ws-deep-entry.js, docs/src/entries/ws-prop-commissioner-entry.js, docs/src/entries/ws-org-commissioner-entry.js, docs/src/modules/party.js, docs/src/entries/party-prop-entry.js, docs/src/components/person-picker.css, docs/src/components/modal.js, docs/src/components/role-selector.js, docs/src/core/utils.js, CLAUDE.md
- **关键动作**: E-01 ✅ / E-02 ✅ / E-03~E-06 ✅ / E-07 ✅ / E-08/E-09 ✅ / P.20 丙部重写 ✅ / 网页对齐分析 ✅ / 知识层次分析 ✅
- **变更详情**:
  - E-01: 新增8个 `--accent-<role>-light` CSS变量（styles.css :root），17处 `var(--accent-emerald-light)` 全部替换为对应角色的light变体
  - E-02: ws-organizer-entry.js 中 7处 `var(--accent-blue)` → `var(--accent-organizer)`，4处 `var(--accent-sky)` → `var(--accent-organizer)`，1处 `var(--accent-indigo)` → `var(--accent-organizer-light)`，3处 `#D97706` → `var(--accent-organizer-light/organizer)`，2处 emerald rgba → organizer rgba
  - E-03: ws-disc-commissioner-entry.js 2处 `#3B82F6`/`var(--accent-blue)` → `var(--accent-disc-commissioner/disc-commissioner-light)`
  - E-04/E-06: (通过E-02一并修复)
  - E-05: ws-deep-entry.js 2处 `var(--accent-emerald)` → `var(--accent-deep)`，1处 `#6B7280` → `var(--accent-deep-light)`
  - E-07: 移除5处 `backdrop-filter:blur`（person-picker.css, modal.js, role-selector.js, utils.js, ws-org-commissioner-entry.js）
  - E-08: `.card:hover` 移除 box-shadow，改为 `border-color: var(--primary-300)`；transition 中移除 box-shadow
  - E-09: `.role-card:hover` 移除 box-shadow，改为 `border-color: var(--neutral-300)`
  - 额外修复: `.kanban-card:hover` 移除 box-shadow 和 !important；kanban-domain-tag 颜色修正（组织→紫、宣传→蓝）
  - P.20 丙部重写为可决策格式（用人话，对照表+路线图）
- **设计决策**: 角色色light变体采用Tailwind -300色阶（FCA5A5/FDBA74/C4B5FD/93C5FD/FCD34D/67E8F9/6EE7B7/D1D5DB），保证border-left场景下有足够辨识度
- **结果**: 9 ERROR全部清零，backdrop-filter零残留，emerald-light零残留，organizer页面错误色零残留
- **蒸馏标签**: [经验蒸馏: — 角色色light变体规则值得沉淀：每个角色色需同时定义标准色和-300级light变体]

## 术语治理 + P.19清理 + P.20重写 + 组长颜色改革（2026-07-04）

- **来源**: 书记三点指示："P.19残渣未清理""术语过拟合（支柱/-性/4点数量锁定）""支书和组长颜色太近"
- **变更文件**: CLAUDE.md, content/governance/TERMINOLOGY.md, docs/src/styles.css, docs/src/core/constants.js, docs/about.html, docs/src/entries/workspace-entry.js, docs/src/entries/help-entry.js, docs/src/entries/main-entry.js, docs/src/services/decision-tree.js, content/design/DESIGN_SYSTEM.md
- **关键动作**: P.19删除 ✅ / P.20重写 ✅ / 组长色#EA580C→#65A30D ✅ / 术语权威层级机制 ✅ / 数量过拟合补丁 ✅
- **变更详情**:
  - P.19从丙部删除（决策已完成，残留违反H5.2生命周期规则）
  - P.20重写：不再预设"四根支柱"框架和4点数量，改为请书记确认"观察点怎么组织"（方向A保留4点换标签 vs 方向B书记重新组织）
  - 组长色从橙色(#EA580C, H≈21°)移至石灰绿(#65A30D, H≈84°)，8个文件18处修改，light变体#FDBA74→#BEF264
  - TERMINOLOGY.md 新增§七"术语权威层级"：L1官方表达/L2约定表达/L3工作表达，含升级规则和AI行为约束
  - CLAUDE.md H5.2 新增"数量过拟合补丁"：AI不得自动锁定数量或自造结构性标签
- **设计决策**: 组长色选择石灰绿(#65A30D)而非靛蓝/玫红，因(1)填补色轮38°-160°空白区(2)与书记红相距84°完全可区分(3)语义上黄绿=基层成长
- **结果**: #EA580C在docs/零残留，丙部仅剩P.20待决策，术语层级机制已建立
- **蒸馏标签**: [经验蒸馏: — AI过拟合问题值得沉淀：自然语言散点→结构化表达需要书记确认而非AI自行锁定]

---

## T50 P.20决策执行：MANAGE_SERVE.md战略认知展开从"四根支柱"重构为总分结构（2026-07-05）

- **来源**: 书记决策P.20——确认4点结构（理解真实/善用经验/创新沉淀/框架内对话），指定总分关系，确认标签对称+排版区分，纠正L1命名（书记原话=L2约定表达，非L1官方表达）
- **变更文件**: MANAGE_SERVE.md, CLAUDE.md, SECRETARY_PRONOUNCEMENTS.md, TERMINOLOGY.md, help-entry.js, content/strategy/README.md
- **关键动作**: T50-1 MANAGE_SERVE.md重写 ✅ / T50-2 CLAUDE.md H8.7+H11.3更新 ✅ / T50-3 P.20退出丙部 ✅ / T50-4 SECRETARY_PRONOUNCEMENTS.md更新 ✅ / T50-5 TERMINOLOGY.md §七修正 ✅ / T50-6 全仓术语残留清零 ✅
- **变更详情**:
  - MANAGE_SERVE.md 第三章从"四根支柱"（并列4点，-性标签）重构为总分结构：理解真实（总）→善用经验/创新沉淀/框架内对话（分）
  - 书记补充三个关键语义：善用经验=有先例工作先从工作流开始才和组织发生实际对话；创新沉淀=创新性工作没有权威集体共创；框架内对话=两种工作的方法补充，不要怕说错话（特别怕大家因"党支部"标签而自我审查）
  - CLAUDE.md H8.7替换"四根支柱"为新总分结构，H11.3论断索引表P-002~P-005标题更新，丙部P.20删除（决策完成），T27描述更新
  - SECRETARY_PRONOUNCEMENTS.md P-002~P-005完整重写（新标题+新内容+旧框架吸收说明），目录更新
  - TERMINOLOGY.md §七 L1定义从"制度性文件、上级文件"修正为"红头文件、总书记讲话、上级文件"，新增"重要区分"说明，L2/L3举例更新（新增理解真实/善用经验/创新沉淀/框架内对话为L2，移除旧"四根支柱"和"-性标签"从L3举例）
  - help-entry.js注释"四根支柱"→"战略认知展开"，README.md描述同步更新
  - 全仓库"四根支柱"零残留验证通过（仅.ctx/logs/和.trae/历史记录中保留，D-233合规）
- **设计决策**: D-237（选方案A+总分结构+排版区分，详见决策日志）
- **结果**: MANAGE_SERVE.md战略认知框架完成重构，P.20闭环，全仓术语同步完成
- **蒸馏标签**: [经验蒸馏: 是 — 经验已写入 insights §11.6 总分结构 vs 并列结构的选择]

---

## T51 L1术语层级修正 + T28网页内容对齐（中偏差项）（2026-07-05）

- **来源**: 书记纠正L1定义 + T28执行
- **变更文件**: TERMINOLOGY.md, DECISION_LOG.md, ws-org-commissioner-entry.js, party-org-entry.js, party-entry.js, role-selector.js, commissioner-matrix.js, about.html, party/index.html, party/org.html, COMMISSIONER_SYSTEM.md, SERVICE_CATALOG.md, DATA.md, WRITE_VERIFY.md, ORG_BUILDING.md, ROLE_CLASSIFICATION.md
- **关键动作**: T51-1 L1修正 ✅ / T51-2 T28-1合规→制度 ✅ / T51-3 T28-2条块二元入网页 ✅ / T51-4 设计文档同步 ✅ / T51-5 一改具改验证 ✅
- **变更详情**:
  - TERMINOLOGY.md §七 L1定义从"红头文件、总书记讲话、上级文件的原文用语"修正回"制度性文件、上级文件的原文用语"（书记纠正：去掉"红头文件、总书记讲话"）
  - TERMINOLOGY.md "重要区分"说明从"仅指红头文件和总书记讲话"修正为"仅指制度性文件和上级文件的原文用语。上级文件的用语是非常准确的。"
  - DECISION_LOG.md D-237中两处"红头文件和总书记讲话"修正为"制度性文件和上级文件的原文用语"
  - T28-1: 全仓库UI标签"合规文件"→"制度文件"（9个前端文件：ws-org-commissioner-entry/party-org-entry/party-entry/role-selector/commissioner-matrix/about.html/party/index.html/party/org.html），6个设计文档（COMMISSIONER_SYSTEM/SERVICE_CATALOG/DATA/WRITE_VERIFY/ORG_BUILDING/ROLE_CLASSIFICATION）共20处同步
  - T28-2: about.html 3.1节加入条块二元精化公式"条管功能决策，块管信息触达"及书记协调节点说明
  - 保留不改：目录路径引用（content/references/合规文件/）、references.js文件路径、insights目录命名讨论
- **设计决策**: 书记明确L1定义回归"制度性文件、上级文件的原文用语"——上级文件用语本身非常准确，不需要额外限定"红头文件"或"总书记讲话"
- **结果**: L1定义修正完成，T28中偏差项全部修复，一改具改验证通过（UI功能描述零残留，仅目录路径引用保留"合规文件"）
- **蒸馏标签**: [经验蒸馏: — L1定义范围讨论、UI术语与目录名不一致的处理策略，待后续蒸馏]

---

## T52 T29 知识层次体系重构（8步全流程）（2026-07-05）

- **来源**: 书记决策 T29 方向（6个已决策方向）+ 乙部 T29 执行
- **变更文件**: content/governance/DOC_MAP.md, CLAUDE.md, SSOT_INDEX.md, content/design/PERMISSION_MATRIX.md(新建), content/design/MANAGEMENT_MODE.md, content/design/SERVICE_CATALOG.md, content/design/DATA.md, content/design/DESIGN_SYSTEM.md, content/insights/党支部管理与实务经验沉淀.md, content/governance/KNOWN_PITFALLS.md, content/design/FLAT_DESIGN.md, content/design/ORG_BUILDING.md, content/strategy/MANAGE_SERVE.md, content/design/SOP_WEB.md, SECRETARY_PRONOUNCEMENTS.md, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: T52-1 文档权威层级统一 ✅ / T52-2 H2.2+SSOT_INDEX扩充 ✅ / T52-3 PERMISSION_MATRIX新建 ✅ / T52-4 insights三卷重划分+§11迁移 ✅ / T52-5 KNOWN_PITFALLS分工+§10.10迁移 ✅ / T52-6 FLAT_DESIGN扩充+§2.3迁移 ✅ / T52-7 YAML type修复(6文件) ✅ / T52-8 跨文件术语重复处理 ✅ / T52-9 最终验证 ✅
- **变更详情**:
  - **T52-1 文档权威层级统一**：DOC_MAP.md 从8层模型改为引用 OPERATIONS_GUIDE §7.1 的7层模型（L0-L6）；顶部新增导航说明（§7.1 定义层级 → DOC_MAP 标注层级 → SSOT_INDEX 注册关系）
  - **T52-2 H2.2+SSOT_INDEX扩充**：CLAUDE.md H2.2 改为5条核心原则+指向 SSOT_INDEX 为完整注册表；SSOT_INDEX.md 从7条扩充至约25条级联关系，按权威层级组织
  - **T52-3 PERMISSION_MATRIX新建**：创建 content/design/PERMISSION_MATRIX.md（11章节：角色体系/赋权链/视图模式/核心权限矩阵/服务-角色矩阵/审批权限/登录站位/权限函数/党务管理/默认面板/与其他文件关系）；MANAGEMENT_MODE/SERVICE_CATALOG/DATA 添加权威源切面视图标注
  - **T52-4 insights三卷重划分**：卷三标题从"工具、技术与实操教训"改为"判例与实操教训"；§11（17条网页工程方法论）迁移至 DESIGN_SYSTEM.md §十一；§9添加归属说明（术·物理保留卷三·逻辑归卷二）；附录7条引用更新
  - **T52-5 KNOWN_PITFALLS分工**：KNOWN_PITFALLS.md 聚焦"AI工具使用陷阱"，#1扩充合并§10.10内容（Edit虚假成功→Write整体覆写分层策略）；insights §10.10迁移为交叉引用，附录#62更新
  - **T52-6 FLAT_DESIGN扩充**：从28行扩充至127行；新增§二扁平化设计哲学（P-009/P-010/P-011 elaboration）；§三三重启动判据（迁移自insights §2.3）；§四两种协作模式；insights §2.3保留道层结论+交叉引用
  - **T52-7 YAML type修复**：6个文件type修正——MANAGEMENT_MODE(governance→design)、FLAT_DESIGN(architecture→design)、ORG_BUILDING(architecture→design)、SERVICE_CATALOG(architecture→design)、MANAGE_SERVE(governance→guide)、DATA(缺失→design+title补全)
  - **T52-8 跨文件术语重复处理**：SOP_WEB.md §B.2 三个子节（视图模式三分类/赋权关系链/写入门禁原则）添加 PERMISSION_MATRIX.md 权威源切面视图标注
  - **T52-9 最终验证**：DOC_MAP.md 新增 PERMISSION_MATRIX.md 条目；SECRETARY_PRONOUNCEMENTS.md P-040 母本位置从"insights §11.16"更新为"设计·§11（已迁移）"；CLAUDE.md H8.6 反论参考更新（详细判据表已迁移至 FLAT_DESIGN.md §三）；全仓库一改具改检查通过（无stale引用，历史日志 immutable 保留）
- **设计决策**:
  - 权威源模式：PERMISSION_MATRIX.md 为权限矩阵唯一权威源，其他文件为"切面视图"，冲突时以权威源为准——避免散落=漂移=不一致
  - 三卷边界重定义：道=理论哲学（为什么）、术=方法论（怎么做）、器=判例（踩过什么坑）；§9物理保留卷三但逻辑归卷二（历史排序兼容）
  - 迁移模式：内容迁移后原位置保留交叉引用+迁移说明，附录条目更新卷·节标注——保持引用完整性
  - KNOWN_PITFALLS vs insights §10 分工：AI工具陷阱→KNOWN_PITFALLS，业务/制度教训→insights §10
- **结果**: T29 知识层次体系重构8步全流程完成；6个已决策方向全部落地；全仓库一改具改验证通过；T29 从乙部退出
- **蒸馏标签**: [经验蒸馏: 是 — 经验已写入 insights §9.7 权威源转移与切面视图原则]

## T53 T27 网页内容对齐（高偏差项）（2026-07-05）

- **来源**: 书记决策 T27 方向（"域"是L3表达不出现于网页 + 战略认知展开+P-041加入两页面）+ 乙部 T27 执行
- **变更文件**: docs/src/entries/help-entry.js, docs/src/entries/ws-secretary-entry.js, docs/src/entries/ws-organizer-entry.js, docs/src/services/auth.js, docs/about.html, docs/src/styles.css, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: T53-1 去掉UI中"域"字（4文件8处）✅ / T53-2 帮助页新增 renderCognition() 函数+样式+TOC ✅ / T53-3 关于页新增 3.5 战略认知小节 ✅ / T53-4 一改具改验证（UI零残留）✅
- **变更详情**:
  - **T53-1 去掉"域"字**：UI标签"活动域"→"活动"、"专班域"→"专班"、"赋权域"→"赋权范围"、"权限域"→"赋权范围"、"职能域写入"→"职能写入"、"写入权限域"→"写入范围"；涉及 about.html(5处)、ws-secretary-entry.js(2处)、ws-organizer-entry.js(1处)、auth.js(2处)
  - **T53-2 帮助页 renderCognition()**：在 renderPhilosophy() 之后新增 Section 3.5（战略认知展开+恢复对话能力）；总分结构叙事（理解真实为总，善用经验/创新沉淀/框架内对话为分，三栏卡片）；延伸段落 P-041"恢复对话能力"用左红色边框引文样式；TOC_ITEMS 新增 cognition 条目；styles.css 添加 .help-cognition-* 完整样式+移动端响应式（单列布局）
  - **T53-3 关于页 3.5 小节**：在"三、为什么这样设计"末尾新增 3.5 战略认知小节；简要段落+四要点列表（理解真实/善用经验/创新沉淀/框架内对话）；末尾 P-041 用 bg-red-50/40 + border-l-4 引文样式
  - **T53-4 一改具改验证**：Grep 确认 docs/ 和 docs/src/ 目录下"活动域|专班域|赋权域|权限域|职能域"零残留
- **设计决策**:
  - 帮助页采用三栏卡片布局（.help-cognition-grid）展示三个分论点，与 Section 4 两种工作的两栏卡片视觉呼应但形成 3 列差异——D-238
  - P-041 在帮助页用左红色边框引文样式（.help-cognition-dialogue），与关于页 bg-red-50/40 引文样式形成页面风格统一但实现方式不同的视觉区分——D-239
  - "域"字处理边界：UI 标签全部去掉，但代码注释中的 scope 字段名（activity/taskforce）保留——D-240
- **结果**: T27 三子任务全部完成；UI 中"域"字 L3 表达零残留；战略认知展开和 P-041 在帮助页+关于页均可见；T27 从乙部退出
- **蒸馏标签**: [经验蒸馏: — L3表达不入网页的边界判定待后续蒸馏]

## T54 探索工作 v4.3.8 重构（分阶段小图+时间轴）（2026-07-05）

- **来源**: 书记对探索工作部分"非常不满意"反馈 + AskUserQuestion 选择"分阶段小图+时间轴"方案
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: T54-1 实现 renderMiniNetworkSVG() ✅ / T54-2 重构 renderExploration() 为时间轴布局 ✅ / T54-3 重构 styles.css 探索工作样式 ✅ / T54-4 简化 bindExplorationScrollDriven 为 IntersectionObserver 三态 ✅ / T54-5 修复 IntersectionObserver 初始状态覆盖 bug ✅ / T54-6 Playwright 验证通过 ✅
- **变更详情**:
  - **T54-1 renderMiniNetworkSVG**：新增函数（节点半径28，复用 svgEl/edgePath 工具，三类线样式与 renderNetworkSVG 一致）；节点名字简化（如"党小组组长"→"组长"）适应小图
  - **T54-2 renderExploration 重构**：从双列 sticky 大 SVG 改为垂直时间轴布局；新增 ACTIVITY_STAGE_GRAPHS(6阶段) + TASKFORCE_STAGE_GRAPHS(4阶段) 数据结构；每 stage = marker(编号) + body(标题+描述+mini SVG)；section 顶部新增 legend 图例
  - **T54-3 styles.css 重构**：替换约252行旧样式；新增 .help-exploration-timeline/spine/stage/marker/no/svg + .help-mini-network-svg 完整样式；三态规则 data-state 加在 stage 容器上（past灰化/current满色+红marker/future微弱）；移动端响应式
  - **T54-4 bindExplorationScrollDriven 简化**：从250行复杂 scroll-driven animation 简化为约70行 IntersectionObserver 三态切换；rootMargin '-20% 0px -30% 0px' 形成 50% 视口高度的 current zone
  - **T54-5 初始状态覆盖 bug 修复**：原版回调在 isIntersecting=false 时直接设 past/future，IntersectionObserver 创建时立即对所有 stage 触发 isIntersecting=false（因初始都在视口下方），覆盖初始化的 stage[0]=current；改为"遍历每个 scene，找到 root zone 内最接近视口中心的 stage 作为 current，其余按 idx 设 past/future，无 stage 在 root zone 内则不更新"策略
  - **T54-6 Playwright 验证**：DOM 结构通过（2 timelines, 10 stages, 10 mini SVGs, 10 markers, 1 legend, 2 spines）；三态切换全部正确（10/10 stage 滚到 center 后 state=current）；marker 颜色样式正确（current 红色#CE1126+阴影, past 灰色#E5E7EB）；console 无错误
- **设计决策**:
  - 分阶段小图 vs 单大 SVG：分阶段小图让用户聚焦当前阶段的关系，避免大 SVG 信息过载；时间轴脊柱+marker 提供阶段进度的视觉锚点——D-241
  - IntersectionObserver 替代 scroll-driven animation：代码量从250行降到70行，性能更好（无需 rAF 节流），三态切换由 CSS transition 处理更平滑——D-242
  - 三态切换策略选择"最接近视口中心"而非"最后进入 root zone"：解决多 stage 同时在 root zone 内时的冲突；保证滚动时 current 平滑过渡——D-243
  - 初始状态保持 stage[0]=current 而非全部 future：用户进入 section 时第一站应该已经"在眼前"，避免空白等待——D-244
- **结果**: 探索工作 v4.3.8 重构完成；分阶段小图+时间轴布局替代原双列 sticky 大 SVG；三态切换逻辑+视觉样式全部验证通过；书记对探索工作的"非常不满意"反馈得到响应
- **蒸馏标签**: [经验蒸馏: — IntersectionObserver 初始状态覆盖 bug 模式待后续蒸馏验证是否写入 insights/KNOWN_PITFALLS]

---

## T55 探索工作 v4.4.0 重构（Relational Pulse 关系脉动）（2026-07-05）

- **来源**: 书记反馈"minipictures很清晰，但作为和整个网页相关联的部分，这种显示方式我非常不喜欢" + 要求用 algorithmic-art + frontend-design skill 重新设计 + AskUserQuestion 确认"完全算法艺术化+克制精致"方向
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: T55-1 renderNetworkSVG inline 模式增强（脉搏光点）✅ / T55-2 renderExploration 重写为双列 sticky ✅ / T55-3 styles.css 探索工作样式替换（双列+呼吸+脉搏+三态）✅ / T55-4 bindExplorationScrollDriven 重写+setNetworkState 新增 ✅ / T55-5 webapp-testing Playwright 验证通过 ✅ / T55-6 dogfood 探索式 QA 通过 ✅
- **变更详情**:
  - **T55-1 renderNetworkSVG 增强**：inline 模式下给每条边的 path 加 id（help-edge-path-{i}）；新增脉搏光点（circle r=2.8 + animateMotion + mpath 沿 path 流动）；不同边类型不同颜色不同节奏（task 红 2.8s / info 蓝 3.4s / collab 灰 4s）；错峰启动（begin i*0.3s）避免同步；删除调试 console.log
  - **T55-2 renderExploration 重写**：从 v4.3.8 时间轴+mini SVG 改为双列 sticky 布局（左 sticky 大关系图 + 右滚动阶段说明）；复用 ACTIVITY_NETWORK/TASKFORCE_NETWORK 大关系图数据；每 stage = 编号(48px serif) + body(标题+描述+flows 列表)；section 顶部 subtitle 改为"滚动看关系如何展开，每个阶段都是一次生动的脉动"
  - **T55-3 styles.css 替换**：替换约 290 行 v4.3.8 时间轴样式为约 380 行 v4.4.0 双列 sticky 样式；新增 .help-exploration-scene-body(grid 1fr 1fr) + .help-exploration-network-sticky(position sticky top 80px) + .help-exploration-stages(padding 18vh 0)；节点呼吸动画 @keyframes help-node-breathe（r 40↔42, 4s）+ help-ring-pulse（r 44↔48, opacity 0.25↔0.4）；边脉搏光点 opacity 由 data-state 控制；三态：past(opacity 0.22/0.18, saturate 0.2) / current(opacity 1) / future(opacity 0.12/0.10)；移动端单列降级
  - **T55-4 bindExplorationScrollDriven 重写**：新增 setNetworkState(networkWrap, currentStage) 函数同步更新网络图所有节点和边的 data-state；初始化每个 scene 的 stage 0 为 current，网络图同步到 stage 0；IntersectionObserver 回调中找到 root zone 内最接近视口中心的 stage，同时更新 stage 三态和网络图节点/边三态；prefers-reduced-motion 降级：所有 stage 和节点/边直接 current
  - **T55-5 webapp-testing 验证**：DOM 结构通过（2 scenes, 2 sticky, 2 SVG, 19 脉搏光点, 19 animateMotion, 12 节点 data-stage, 19 边 data-stage）；初始 stage 0 = current ✅；滚动测试 6 stage 全部正确切换 current；网络图 cur_nodes/cur_edges 随 stage 同步变化
  - **T55-6 dogfood 探索式 QA**：桌面端无 console 错误；grid-template-columns 514px 514px 双列正确；sticky position 正确；三态切换完美（滚动到 stage 3: [past,past,past,current,future,future]）；SVG aria-label 正确；12/12 节点 tabindex=0 可键盘导航；移动端+reduced-motion 检查因 Playwright 多页面中断（核心功能已验证）
- **设计决策**:
  - 算法哲学"关系脉动"：把支部关系网络想象成有生命的有机体——节点呼吸（r 循环），边上脉搏流动（彩色光点沿 path），表达"信息和任务在关系中流动"——D-245
  - 脉搏用 SVG SMIL animateMotion+mpath 而非 CSS：CSS 无法沿曲线 path 移动元素，SMIL 是沿路径动画的唯一可靠方案；不同边类型不同节奏避免视觉同步——D-246
  - 节点呼吸用 CSS animation 控制 SVG r 属性而非 SMIL：CSS animation 更易与 data-state 联动（[data-state="current"] 触发），且现代浏览器支持 CSS 动画 SVG r——D-247
  - 一个 signature element 原则（frontend-design）：脉搏光点是唯一的"记忆点"，其余克制——节点呼吸是辅助氛围，三态是功能性的，不过度装饰——D-248
- **结果**: 探索工作 v4.4.0 Relational Pulse 重构完成；算法艺术化+克制精致方向实现；双列 sticky 布局+节点呼吸+边脉搏+三态演化全部验证通过；书记对 minipictures 的"非常不喜欢"反馈得到响应
- **蒸馏标签**: [经验蒸馏: — SVG SMIL animateMotion+mpath 沿路径动画模式待后续蒸馏验证是否写入 insights]

---

## T56 v5.0 行星大动画实现（2026-07-05）

- **来源**: 用户指示（行星运动大动画 + 清理死代码 + 登录绕开 + card audit + SOP对齐）
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css
- **关键动作**: 
  - 2026-07-T56-1 ✅ 添加 v5.0 核心工具函数（PLANETARY_CONFIG + easing + 3D投影 + 贝塞尔插值）
  - 2026-07-T56-2 ✅ 实现 computeStageLayout（恒星-行星 3D 布局 + 单节点 stage fallback）
  - 2026-07-T56-3 ✅ 实现 computeScrollProgress + interpolatePositions（滚动驱动 + 位置插值）
  - 2026-07-T56-4 ✅ 实现 renderNetwork（节点 transform + 边 path 重绘 + stage 混色）
  - 2026-07-T56-5 ✅ 替换 bindExplorationScrollDriven 协调器 + 删除 setNetworkState
  - 2026-07-T56-6 ✅ 清理 v4.4.0 CSS（呼吸/脉搏）+ 添加 v5.0 transition 样式
  - 2026-07-T56-7 ✅ renderNetworkSVG 适配（移除脉搏光点 + data-state→data-role）
  - 2026-07-T56-8 ✅ 添加移动端 + reduced-motion 降级
  - 2026-07-T56-9 ✅ Playwright 集成测试通过（10/10）
  - 2026-07-T56-10 ✅ 清理 v4.3.8 死代码（renderMiniNetworkSVG + ACTIVITY_STAGE_GRAPHS + TASKFORCE_STAGE_GRAPHS，271 行）
- **变更详情**:
  - 添加 PLANETARY_CONFIG 集中配置（focal/zRange/orbitTilt/easingK/transitionStart/transitionEnd/starRadius/planetRadius/inactiveRadius/planetOrbitRadius/inactiveOpacity/inactiveSaturate/inactiveEdgeOpacity/viewRotateXMax/scrollStartVh/scrollEndVhOffset/projectionOpacityFloor/edgeLiftFactor/starScale/planetScale/inactiveScale/activityPeripheralRadius/taskforcePeripheralRadius）
  - 实现 5 个核心组件：computeStageLayout / computeScrollProgress / interpolatePositions / project3DTo2D / renderNetwork
  - 实现 bindExplorationScrollDriven 协调器（RAF 节流 + 滚动驱动 + 视角旋转）
  - 修复 critical bug：computeScrollProgress 坐标系转换（viewport-relative→document-relative）
  - 修复单节点 stage 无激活节点 bug（parse flows when no edges）
  - 修复 per-frame Math.random() 抖动（移除随机 z offset）
  - 移除 v4.4.0 CSS 动画（@keyframes help-node-breathe/ring-pulse + .help-edge-pulse）
  - 移除 v4.4.0 脉搏光点（animateMotion + mpath）
  - 移除 v4.3.8 死代码 271 行
  - 移动端 2D 降级（z:0）+ reduced-motion 无插值
- **设计决策**: D-241 行星大动画采用 3D 引力舞蹈+滚动驱动+边重绘方案（无发光脉冲，视觉克制）
- **结果**: v5.0 行星大动画完整实现，Playwright 集成测试 10/10 通过，所有节点保持可见（opacity ≥ 0.7），滚动驱动丝滑位置变化
- **蒸馏标签**: [经验蒸馏: — v5.0 行星大动画刚实现，待实际使用验证效果]

## T57 v5.1 聚焦驱动动画（用户反馈 3 点调整）（2026-07-05）

- **来源**: 用户指示（v5.0 太逼仄 + 不够大胆 + 连线始终存在 → v5.1 调整）
- **变更文件**: docs/src/entries/help-entry.js, docs/help.html
- **关键动作**:
  - 2026-07-T57-1 ✅ PLANETARY_CONFIG 调整：增大 planetOrbitRadius（110/100/110/130 → 180/160/180/200，间距 18px→88px）；移除 inactive 配置（inactiveRadius/Opacity/Saturate/Scale + peripheralRadius + inactiveEdgeOpacity）；添加 enterDistance/enterScale/enterOpacity + edgeInactiveOpacity
  - 2026-07-T57-2 ✅ computeStageLayout 修改：移除 inactive 节点布局代码，只返回 star+planets 活跃节点
  - 2026-07-T57-3 ✅ interpolatePositions 修改：节点从 SVG 外部滑入（贝塞尔曲线 + 淡入 + 缩放 enterScale→target）；节点滑向外部（淡出 + 缩小→enterScale）
  - 2026-07-T57-4 ✅ renderNetwork 修改：开头先隐藏所有节点/边（opacity=0），再只显示 positions3D 中的活跃节点；边 stroke-dashoffset 绘制效果（totalLength→0 绘制，0→totalLength 反向擦除）；非当前 stage 边 opacity=0 完全隐藏；移除 inactiveRadius 引用，fallback 用 planetRadius
  - 2026-07-T57-5 ✅ help.html 缓存版本号 v=t37→t38
  - 2026-07-T57-6 ✅ Playwright 验收测试通过（9/9 PASS）
- **变更详情**:
  - 增大行星轨道半径消除逼仄感：1 planet 间距 18px→88px
  - 实现聚焦驱动：每个 stage 只显示该 stage 的活跃节点（inactive 完全 opacity=0 不渲染）
  - 实现节点从外部滑入：沿 SVG 中心→节点方向外延 enterDistance=350 作为起始位置，贝塞尔曲线插值到目标
  - 实现连线绘制效果：stroke-dasharray=totalLength + stroke-dashoffset 从 totalLength→0（绘制）/ 0→totalLength（擦除）
  - 实现连线只在对应环节出现：非当前 stage 边 opacity=0 完全隐藏（原 0.15 始终可见）
  - 移除 inactive 节点布局：positions3D 中不再包含 inactive 节点，renderNetwork 自然不渲染
- **设计决策**: D-242 v5.1 采用聚焦驱动设计（只显示活跃节点 + 从外部滑入 + 绘制效果），用户通过 AskUserQuestion 确认节点="从外部滑入"、连线="绘制效果"
- **结果**: Playwright 测试 9/9 PASS — stage 0 只显示 2 节点 1 边；stage 2 切换到 2 节点 1 边；stage 4 显示 4 节点；stroke-dashoffset 绘制效果已应用；reduced-motion + mobile 无错误
- **蒸馏标签**: [经验蒸馏: — v5.1 聚焦驱动刚实现，待用户浏览器验收]

## T58 T3 登录绕开安全审查（security-best-practices）（2026-07-05）

- **来源**: 用户指示（T3 登录系统绕开检查 + 使用 security-best-practices skill）
- **变更文件**: security_best_practices_report.md（新建，审查报告）
- **关键动作**:
  - 2026-07-T58-1 ✅ 并行派发 subagent 调用 security-best-practices skill 审查 bootstrap.js
  - 2026-07-T58-2 ✅ 审查 bootstrap.js L34-48 的 ?dev=ROLE 登录绕过机制
  - 2026-07-T58-3 ✅ 审查 auth.js 的 AuthStore 实现（getLoginStance/setLoginStance/setActiveRole）
  - 2026-07-T58-4 ✅ 生成安全报告 security_best_practices_report.md
- **变更详情**:
  - 发现 1 个 Critical（F-001 生产环境认证绕过与权限提升）+ 1 个 High（F-002 角色参数无白名单校验）+ 2 个 Medium（F-003 URL 参数残留 / F-004 reload 循环）+ 1 个 Low（F-005 sessionStorage）
  - 报告提供两种修复方案：A 基于 hostname + 角色白名单；B 直接移除机制改用 login.html Mock 按钮
  - 未修改任何代码（只读审查）
- **设计决策**: D-243 T3 安全审查采用只读模式出报告，由书记决定修复方案后再实施
- **结果**: 安全报告已生成，发现 1 Critical + 1 High，待书记决策修复方案
- **蒸馏标签**: [经验蒸馏: — 安全审查发现待决策]

---

## T59 v5.2「活的星座」动画重构（dogfood 诊断 + frontend-design 重设计）（2026-07-06）

- **来源**: 用户反馈 v5.1 动画混乱（"似乎只是把连接线都删去了，表现形式很差"），触发 dogfood + frontend-design skill
- **变更文件**: docs/src/entries/help-entry.js, docs/src/styles.css, docs/help.html
- **关键动作**: T59-1 dogfood 诊断 ✅ T59-2 frontend-design 重设计 ✅ T59-3 v5.2 实施 ✅ T59-4 CSS 选择器冲突修复 ✅ T59-5 Playwright 验证通过 ✅
- **变更详情**:
  - dogfood 诊断 v5.1 四个问题：F-1 Critical（dashOffset 始终为 0，绘制效果不可见）/ F-2 High（scroll 驱动每帧调 renderNetwork 导致混乱）/ F-3 Medium（先隐藏所有节点边再显示活跃节点，画面空旷）/ F-4 Low（3D 透视太微妙）
  - frontend-design 重设计 v5.2「活的星座」：stage 驱动（非 scroll 驱动）+ CSS transition（非每帧 JS 重算）+ 所有节点 dim 可见（非隐藏）+ 边绘制效果可见（0.8s CSS transition）+ 恒星脉冲（CSS keyframes）
  - help-entry.js 重写：删除 7 个 v5.0/v5.1 函数（easeMiddleSlow/project3DTo2D/bezier3D/computeControlPoint/computeStageLayout/precomputeAllLayouts/interpolatePositions），新增 identifyActiveNodes + EDGE_LENGTH_CACHE（WeakMap 缓存 path 长度），重写 renderNetwork（用 style.transform 让 CSS transition 生效）+ bindExplorationScrollDriven（仅当 stageIndex 变化时才重渲染）+ computeScrollProgress + PLANETARY_CONFIG
  - styles.css 添加 v5.2 CSS：node transition（opacity+filter+transform 0.6s）+ edge-path transition（stroke-dashoffset 0.8s）+ star-pulse keyframes（2.4s 循环 scale 1↔1.08）+ reduced-motion 降级
  - CSS 选择器优先级修复：v5.2 规则用 `.help-exploration-network-sticky` 前缀（specificity 0,2,0）覆盖 L4217/L4270 旧规则（specificity 0,1,0），确保 transition 在 exploration 场景生效
  - help.html 版本号 t37→t40（强制 CSS 重载）
  - Playwright 验证全部通过：6 个 stage 均符合要求——所有节点始终可见（活跃 opacity=1，非活跃 dim opacity=0.25，0 个完全隐藏）、活跃边 dashOffset=0（绘制态）、非活跃边 dashOffset=totalLength（擦除态）、CSS transition 全部生效（node: opacity+filter+transform 0.6s / edge: opacity 0.4s / path: stroke-dashoffset 0.8s）、star-pulse keyframes 存在并应用
- **设计决策**: D-244 v5.2 用 stage 驱动替代 scroll 驱动（解决 F-2 混乱根因）；D-245 用 CSS transition 替代 JS 每帧重算（性能+丝滑）；D-246 用 style.transform 替代 setAttribute('transform') 让 CSS transition 生效（SVG 属性 vs CSS 属性的关键区别）
- **结果**: v5.2 实施完成，Playwright 验证 6/6 通过，CSS transition 全部生效
- **蒸馏标签**: [经验蒸馏: — v5.2 设计思路待沉淀为 SVG 动画经验]

---

## T60 T3 安全修复方案 A 实施（bootstrap.js hostname + 角色白名单）（2026-07-06）

- **来源**: 书记决策 T3 采用方案 A（hostname 检查 + 角色白名单），具体选择限制 localhost + 127.0.0.1、白名单 = 8 角色枚举 + guest
- **变更文件**: docs/src/core/bootstrap.js
- **关键动作**: T60-1 DEV_HOSTNAME_WHITELIST 添加 ✅ T60-2 DEV_ROLE_WHITELIST 添加 ✅ T60-3 登录检查分支重写 ✅ T60-4 GetDiagnostics 验证无错误 ✅
- **变更详情**:
  - 新增 DEV_HOSTNAME_WHITELIST = new Set(['localhost', '127.0.0.1', '::1'])（hostname 白名单，浏览器实际运行主机名，URL 参数无法伪造）
  - 新增 DEV_ROLE_WHITELIST = new Set(['guest', 'secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner', 'commissioner', 'leader', 'organizer', 'deep'])（9 项角色白名单，复用角色枚举 + guest）
  - 重写登录检查分支：仅当 devRole 存在 + isLocalHost + 角色在白名单时才允许绕过；否则静默跳转登录页（不报错，避免信息泄露）
  - 修复 F-001 Critical（生产环境认证绕过）+ F-002 High（角色参数无白名单）
- **设计决策**: D-247 采用方案 A 而非方案 B（保留开发便利性 + 双重白名单防护）；D-248 静默失败而非报错（避免向攻击者透露机制存在）
- **结果**: T3 安全修复完成，F-001/F-002 已修复，bootstrap.js GetDiagnostics 无错误
- **蒸馏标签**: [经验蒸馏: — 安全修复模式待沉淀]

---

## T61 过程性文件清理（spec/plan/.tools/安全报告）（2026-07-06）

- **来源**: 用户反馈"过程性文件比较多，仓库过分膨胀，spec/plan 如果能整合到 log 就整合进去"
- **变更文件**: 删除 docs/superpowers/（2 文件）、.trae/specs/（24 文件）、.tools/ 过程性文件（22 文件）、security_best_practices_report.md（1 文件）
- **关键动作**: T61-1 过程性文件盘点 ✅ T61-2 AskUserQuestion 确认清理范围 ✅ T61-3 批量删除 49 文件 ✅ T61-4 Harness 规则决策（暂不修改） ✅
- **变更详情**:
  - 盘点过程性文件分布：docs/superpowers/（v5.0 spec+plan，已过时）/ .trae/specs/（8 个已完成任务的 spec/tasks/checklist，成果已沉淀到 content/ 和 CLAUDE.md H11）/ .tools/（v5.1/v5.2 验证脚本+分析结果+截图，验证已完成）/ security_best_practices_report.md（T3 审查报告，方案 A 已实施）
  - security_best_practices_report.md 核心内容（F-001/F-002/F-003 + 方案 A/B）已整合到 T58 和 T60 执行日志
  - 批量删除 49 个过程性文件（docs/superpowers/ 2 + .trae/specs/ 24 + .tools/ 22 + security_report 1）
  - 保留 .tools/ 目录本身（用于将来临时工具脚本）
  - Harness 规则：用户决策"暂不修改 Harness"——先清理文件，观察一段时间再决定是否立法（H5.2 搁置≠待决策）
- **设计决策**: D-249 spec/plan 定性为"过程性文件"（非知识资产），实施完成后核心内容沉淀到 guides/insights/log 后应删除；用户选择暂不立法，观察后再定
- **结果**: 49 个过程性文件已删除，仓库膨胀问题缓解，知识资产不受影响（核心内容已在 content/ 和执行日志中）
- **蒸馏标签**: [经验蒸馏: — spec/plan 生命周期规则待观察后立法]

---

## T62 content/ 文件夹梳理第 1 批 design/ 完成（5 维度审查+9 文件裁剪+方法论回迁）（2026-07-06）

- **来源**: 书记五点指示——文件数多/部分文件过长/角色侧重点混淆/行文格式死板/一致性隐患；触发 /spec + brainstorming 进入 spec 模式
- **变更文件**: content/design/APPROVAL_FLOW.md, content/design/FLAT_DESIGN.md, content/design/MANAGEMENT_MODE.md, content/design/BRAND_ACTIVITY.md, content/design/DATA.md, content/design/CALENDAR.md, content/design/ORG_BUILDING.md, content/design/SERVICE_CATALOG.md, content/design/COMMISSIONER_SYSTEM.md, content/design/SOP_WEB.md, content/design/DESIGN_SYSTEM.md, content/insights/党支部管理与实务经验沉淀.md, .trae/specs/content-audit-design/spec.md, .trae/specs/content-audit-design/tasks.md, .trae/specs/content-audit-design/checklist.md
- **关键动作**: T62-1 spec 编写 ✅ T62-2 design/ 15 文件审查 ✅ T62-3 4 决策点+4 执行细节确认 ✅ T62-4 L3 越界处理 ✅ T62-5 版块裁剪 ✅ T62-6 一致性修复 ✅ T62-7 验收通过 ✅
- **变更详情**:
  - 编写 .trae/specs/content-audit-design/ 三件套（spec.md/tasks.md/checklist.md）：5 维度审查清单+4 批分批流程+母本材料补充规则
  - 5 维度审查 design/ 15 文件（层级归位/术语合规/写作风格/版块裁剪/一致性）
  - 8 轮 AskUserQuestion 确认方向：奥卡姆剃刀剔除"组织建设"+ 行内标注 [工作表达] + L3 越界按内容类型分流 + 方法论回迁 insights + 中等裁剪力度
  - L3 越界处理：DESIGN_SYSTEM.md §十一 17 条方法论回迁 insights §11.1-§11.5；删除 5 文件代码块/伪代码（DATA §六、ORG_BUILDING §五、COMMISSIONER §D、CALENDAR §五）；删除 4 文件实施路径（MANAGEMENT §七、ORG_BUILDING 附录、COMMISSIONER §H、CALENDAR §六）；删除时限表/检查清单/表单（MANAGEMENT §1.2、COMMISSIONER §G、SOP_WEB §D/§F）
  - 版块裁剪 9 文件：APPROVAL_FLOW 241→142（-99）、CALENDAR 466→267（-199）、MANAGEMENT_MODE 723→662（-61）、ORG_BUILDING 310→263（-47）、SERVICE_CATALOG 454→412（-42）、COMMISSIONER 423→393（-30）、BRAND_ACTIVITY 108→74（-34）、DATA 584→526（-58）、WRITE_VERIFY 289→239（-50），总行数 3598→2978（-620，-17.2%）
  - 一致性修复：57 处 `../../../` 引用断裂修复（CALENDAR 16 处最严重 + DATA 16 处 + ORG_BUILDING 4 处 + SERVICE_CATALOG 4 处 + COMMISSIONER 4 处 + MANAGEMENT_MODE 5 处 + 其他 8 处）；3 处"组织建设"剔除（APPROVAL_FLOW L34、FLAT_DESIGN L21、MANAGEMENT_MODE L593）；6 处 -性 标签标注 [工作表达]
  - YAML last_updated 全部更新为 "2026-07-06"；insights version 22.0→23.0
  - 验收：Grep 确认 design/ 下"组织建设"/`../../../`/"活动建设"零残留；GetDiagnostics 仅预存 markdownlint 警告，无新增错误
- **设计决策**: D-250 "组织建设"全仓库剔除（不展开，不等于谁，奥卡姆剃刀）；D-251 -性 标签处理=奥卡姆剃刀+行内标注 [工作表达]；D-252 L3 越界按内容类型分流（时限表/实施路径→sop/，代码块→删除，方法论→insights/）；D-253 版块裁剪力度=中等（核心完整，次要精简，边缘只留结论）
- **结果**: design/ 批次完成，15 文件审查完毕，9 文件裁剪减重 620 行，57 处引用断裂修复，方法论回迁 insights/，验收通过
- **蒸馏标签**: [经验蒸馏: 是 — 经验已写入 insights §9.6 content/ 文件夹梳理方法论]

---

## T63 content/ 文件夹梳理第 2 批 governance/ 完成（术语源头修复+Agent 死文件迁移+机械性修复）（2026-07-06）

- **来源**: content/ 梳理 spec 第 2 批 governance/ 11 文件 5 维度审查
- **变更文件**: content/governance/TERMINOLOGY.md, content/governance/OPERATIONS_GUIDE.md, content/governance/DOC_MAP.md, content/governance/ROLE_CLASSIFICATION.md, content/governance/EMOJI_POLICY.md, content/governance/RECURRING_TASKS.md, content/governance/KNOWN_PITFALLS.md, content/governance/README.md, .github/AGENT_USAGE.md（移入）, .github/AGENT_HANDBOOK.md（移入）, .trae/specs/content-audit-design/tasks.md, .trae/specs/content-audit-design/checklist.md
- **关键动作**: T63-1 11 文件 5 维度审查 ✅ T63-2 6 决策点 AskUserQuestion 确认 ✅ T63-3 术语源头修复 ✅ T63-4 Agent 死文件迁移 ✅ T63-5 机械性修复 ✅ T63-6 验收通过 ✅
- **变更详情**:
  - 子代理审查 governance/ 11 文件，发现 6 决策点 + 多处机械性问题
  - 6 轮 AskUserQuestion 确认：TERMINOLOGY 为术语权威源 + 组织建设改为"服务同学们的核心职能" + audience 逐文件判断 + Agent 死文件移至 .github/ + .github/ 引用保留标注
  - TERMINOLOGY.md 术语源头修复：§1.1"区分要诀"改为"服务同学们的核心职能"+ [工作表达] 标注；§1.1"活动建设"→"活动组织"；章节编号 §四/§五 错乱修复；§五→§四（新增术语条目）+ §四→§五（执行检查）；§五 标题移除时间戳"（2026-06-30）"；行112 引用断裂 `../../insights/`→`../insights/`；§六 三类受众表格改为索引引用 OPERATIONS_GUIDE §8；audience [人机]→[工程师]
  - OPERATIONS_GUIDE.md §2 术语对照表对齐 TERMINOLOGY §1.2：行58"活动建设→主题党日/活动组织"→"活动建设→党建工作"；行59"组织建设（指党务域）"→"组织建设"
  - AGENT_USAGE.md + AGENT_HANDBOOK.md 移至 .github/（Trae 忽略目录）——VSCode 时代 Agent 治理文件在 Trae 中完全失效
  - DOC_MAP.md：AGENT_USAGE/HANDBOOK 引用标注"已移至 .github/"；CLAUDE.md §七/§八→乙部/丙部；.github/ 引用添加 Trae 忽略标注；§〇 三类受众定义精简为索引引用
  - ROLE_CLASSIFICATION.md：§六 重复评分表删除（与 §五 重叠）；4 处 .github/ 引用添加 Trae 忽略标注
  - EMOJI_POLICY.md：audience [人机]→[工程师]；💡 重复条目去重；CLAUDE.md §八→乙部
  - RECURRING_TASKS.md：audience/date/status 三重矛盾修复；DOCUMENTATION_MAP→DOC_MAP（2 处）；CLAUDE.md §八→乙部；2 处 copilot-instructions.md 添加 Trae 忽略标注
  - KNOWN_PITFALLS.md：§1 第 3 个反面论证删除（与生效条件重复）
  - README.md：移除 AGENT_USAGE/HANDBOOK 引用；节标题"三、Agent 与陷阱"→"三、陷阱与同步"
  - 全部修改文件 YAML last_updated 更新为 "2026-07-06"
  - 验收：Grep 确认"CLAUDE.md §七/§八"/DOCUMENTATION_MAP/`../../../` 零残留；"活动建设/组织建设"仅剩术语对照表和废弃声明中的合规引用；GetDiagnostics 无错误
- **设计决策**: D-254 术语对照冲突以 TERMINOLOGY 为权威源（OPERATIONS_GUIDE §2 对齐 TERMINOLOGY §1.2）；D-255 "组织建设"在 §1.1 区分要诀中改为"服务同学们的核心职能"（奥卡姆剃刀，不展开）；D-256 VSCode 时代 Agent 治理文件移至 .github/（Trae 忽略目录，保留历史不删除）；D-257 .github/ 引用保留并添加 Trae 忽略标注（维持 L0/L4 层级定义完整性）；D-258 audience 标记逐文件判断（governance/ 文件主要面向 [工程师]）
- **结果**: governance/ 批次完成，11 文件审查完毕，8 文件修改，2 文件移至 .github/，验收通过
- **蒸馏标签**: [经验蒸馏: — VSCode→Trae 迁移经验待第 4 批完成后整体蒸馏]

---

## T64 content/ 文件夹梳理第 3 批 sop/ 机械性修复+术语合规+L2 分级完成（27 处补 why 拆分至 T-2026-07-001）（2026-07-07）

- **来源**: content/ 梳理 spec 第 3 批 sop/ 6 文件 5 维度审查
- **变更文件**: content/sop/INDEX.md, content/sop/常见工作场景快速指南.md, content/sop/支委与党小组定人定责定岗说明.md, content/sop/组织委员工作流程指南.md, content/sop/宣传委员工作流程指南.md, content/sop/纪检委员工作流程指南.md, content/sop/党小组组长工作手册.md, CLAUDE.md（乙部 P3 新增 T-2026-07-001）
- **关键动作**: T64-1 7 文件 5 维度审查 ✅ T64-2 L2 层次性方案 AskUserQuestion 确认 ✅ T64-3 "网页待实现"全部写入丙部 P.1 ✅ T64-4 机械性修复（路径/版本号/日期） ✅ T64-5 术语合规（"域"泄露+"组织建设"剔除） ✅ T64-6 L2 分级处理（基础性 L2 补 why+链接） ✅ T64-7 INDEX 人名改角色名 ✅ T64-8 27 处补 why 拆分至乙部 T-2026-07-001 ✅ T64-9 验收通过 ✅
- **变更详情**:
  - 子代理审查 sop/ 7 文件，发现 27 处需补 why + 多处机械性问题 + "域"泄露 + "组织建设"残留
  - 2 轮 AskUserQuestion 确认：(1) L2 层次性方案——分级处理（基础性 L2 党建/党务分类补 why+链接；特殊性 L2 条块分工/专班制/赋权关系链/扁平化设计/人才库制度/报备审批只保留链接）；(2) "网页待实现"5 处全部写入丙部 P.1
  - 机械性修复：所有 sop/ 文件 YAML last_updated 更新为 "2026-07-07"；支委与党小组定人定责定岗说明.md 版本号 v2.1→v2.4 统一；路径修复 `../SOP/`→`./`（组织/宣传/纪检委员工作流程指南各 3 处）、`../../content/references/`→`../references/`（常见工作场景快速指南 5 处）
  - 术语合规："域"泄露修复——党建域/党务域→党建工作/党务工作（组织/宣传/纪检委员工作流程指南各 2 处）；组织域/宣传域/纪检域→组织职能/宣传职能/纪检职能（支委与党小组定人定责定岗说明 L62-64）；两大域→两类（支委与党小组定人定责定岗说明 L19）；"组织建设"剔除——"推动组织建设更加扁平化"→"推动分工更加扁平化"（常见工作场景快速指南 L111、支委与党小组定人定责定岗说明 L194）
  - L2 分级处理：基础性 L2（党建/党务分类）在常见工作场景快速指南 L26-27 和支委与党小组定人定责定岗说明 L19 补 why+链接——"党建工作服务同学们的成长需求，党务工作保证组织的规范运行——前者是支部的引领与服务，后者是组织的底线保障。详见 MANAGEMENT_MODE.md"
  - INDEX.md 人名改角色名：组织委员（侯嘉嵘）→组织委员、纪检委员（韩思宁）→纪检委员、宣传委员（闫鑫岳）→宣传委员、支部书记（储子禾）→支部书记（2 处）
  - CLAUDE.md 乙部 P3 新增 T-2026-07-001：27 处补 why 任务拆分至后续 session（用户指示"如果一个session做不完，要写入乙部/丙部"），分布：常见工作场景快速指南 5处、党小组组长工作手册 5处、支委与党小组定人定责定岗说明 5处、纪检委员工作流程指南 5处、组织委员工作流程指南 4处、宣传委员工作流程指南 3处
  - 验收：Grep 确认"组织建设|活动建设|党建域|党务域|组织域|宣传域|纪检域|两大域"零残留；"../SOP/|../../content/references/"零残留；GetDiagnostics 仅预存 markdownlint 警告，sop/ 文件无任何诊断问题
- **设计决策**: D-259 L2 层次性方案——基础性 L2（党建/党务分类，党的建设普遍原则）保留简短定义+简短 why+链接；特殊性 L2（条块分工/专班制/赋权关系链/扁平化设计/人才库制度/报备审批，党支部特殊选择）只保留链接不展开 why；D-260 "网页待实现"5 处全部写入丙部 P.1（用户决策，不自行处置功能去留）；D-261 27 处补 why 拆分至乙部 T-2026-07-001（工作量大需细致构思+母本查阅，适合新开 session 用 spec 模式细化）
- **结果**: sop/ 批次机械性修复+术语合规+L2 分级完成，27 处补 why 拆分至后续任务，验收通过
- **蒸馏标签**: [经验蒸馏: — sop/ 梳理经验待第 4 批完成后整体蒸馏]

---

## T65 P.1 第一步实现（Task 1+2+3 全部完成）（2026-07-07）

- **来源**: 丙部 P.1 第一步决策执行（部分实现：专班招募表单审查优化+每周一报送流程+图片管理，3 项）
- **变更文件**: docs/src/services/taskforce.js, docs/src/entries/ws-org-commissioner-entry.js, docs/src/modules/party.js, docs/src/entries/party-prop-entry.js, docs/src/core/domain.js, docs/src/services/image.js, content/sop/组织委员工作流程指南.md, content/sop/宣传委员工作流程指南.md, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: T65-1 专班状态流转方法 ✅ / T65-2 专班卡片状态按钮+bindStatusButtons ✅ / T65-3 报送内容自动生成逻辑 ✅ / T65-4 refreshWeeklyReport 扩展（按钮+历史记录列表） ✅ / T65-5 NoticeStore 通知发送 ✅ / T65-6 weeklyReportRecords 归档+localStorage 持久化 ✅ / T65-7 ImageRecord 数据结构+ImageRecordStore ✅ / T65-8 图片管理 Tab+上传标注+照片墙 ✅ / T65-9 SOP 标注更新（3 处） ✅ / T65-10 GetDiagnostics 验证通过 ✅
- **变更详情**:
  - **Task 1（专班招募表单审查优化）**：
    - taskforce.js 新增 updateStatus(id, newStatus) 方法：validTransitions 白名单（recruiting→active、active→archived），非法流转返回 null，合法流转调用 update(id, { status: newStatus })
    - ws-org-commissioner-entry.js：_renderTfCard 状态按钮渲染（recruiting→"启动专班"、active→"归档专班"、archived→无按钮）；bindStatusButtons 替换原 bindCompleteButtons；statusLabel/statusColor 扩展（新增 archived: '已归档' / '#6B7280'）；已完结区域过滤（completed ∪ archived）；工作量汇总显示条件新增 archived 可查看
    - 组织委员工作流程指南.md L64：「⚠️ 网页待实现」→「✅ 网页已实现：含 9 字段招募表单 + 支持招募状态跟踪（recruiting → active → archived）」
  - **Task 2（每周一报送流程）**：
    - party.js 新增 WEEKLY_REPORT_STORAGE_KEY 常量 + PEOPLE import；PartyModule.state 新增 weeklyReportRecords 字段
    - 新增 _loadWeeklyReports()/_saveWeeklyReports() 方法：localStorage 持久化（key: workflowos_weekly_report_records_v1）
    - 新增 _buildWeeklySubmissionContent() 方法：汇总最近 7 天活动数据（date/title/type/location/organizer→人员姓名/direction→中文/status→中文），生成报送摘要；与"生成周报"（支部内部亮点/问题/下周计划）区分——每周一报送是向学工周报负责人报送活动信息
    - 新增 submitWeeklyReport(editedSummary) 方法：生成内容 → NoticeStore.add() 发送通知给书记（targetModule: 'party', priority: 'normal'）→ 归档记录（id/submitDate/weekStart/weekEnd/count/summary/items/noticeId/publisher）→ localStorage 持久化
    - 扩展 refreshWeeklyReport()：原"生成周报"按钮（支部内部周报）保留；新增"每周一报送"按钮（蓝色 #0EA5E9 区分）→ 点击弹出 openFormModal（initialValues 预填本周活动汇总，可编辑）→ 提交调用 submitWeeklyReport() + 刷新列表；新增历史报送记录列表（按时间倒序，含周范围/活动数/通知ID/可展开查看报送内容）
  - **Task 3（图片管理精简实现）**：
    - core/domain.js 新增 ImageRecord JSDoc typedef（id/date/title/subject/activityId/base64/uploadedBy/uploadAt）+ mockDB.imageRecords: [] 字段
    - 新建 services/image.js：ImageRecordStore 实现（init/list/add/remove），独立 localStorage 键 gsm1921-image-records（参考 FeedbackStore 模式，避免膨胀主 mockDB）
    - party-prop-entry.js：Tab 列表新增 images（图片管理）；_renderTab 新增 images 分支（上传区 + 照片墙容器 #publicity-image-gallery）；_bindImageUploadEvents（文件选择器+标注表单+FileReader.readAsDataURL+ImageRecordStore.add）
    - party.js 新增 refreshImageGallery()：从 ImageRecordStore.list() 获取，按日期分组，网格展示，点击展开标注
    - 宣传委员工作流程指南.md L70, L126, L128 三处标注更新：「⚠️ 网页待实现」→「✅ 网页已实现」（照片墙功能已实现+每周一报送流程已实现+图片管理规则已实现，保留"拖拽至宣传子任务"和"分级"暂未实现说明）
- **设计决策**:
  - 专班状态流转采用白名单机制（recruiting→active→archived）——与既有 completed 强制解散语义分离，避免状态混淆
  - 报送内容自动生成用最近 7 天而非自然周（周一到周日）——避免跨周边界问题
  - 图片 Base64 数据使用独立 localStorage 键 `gsm1921-image-records`——避免膨胀主 mockDB，参考 FeedbackStore 模式
- **结果**: P.1 第一步 3 项功能全部实现完成；GetDiagnostics 仅 markdownlint 警告，无 JS 错误；SOP 标注 3 处已与代码实现一致；丙部 P.1 已退出（两步均已决策：第一步部分实现，第二步暂缓）
- **蒸馏标签**: [经验蒸馏: — P.1 第一步实现刚完成，待浏览器验收后考虑是否沉淀]

---

## T66 死链死代码清查与第一批清理（2026-07-07）

- **来源**: 用户指示（"对于一些死链、死代码等进行清查、清理"）
- **变更文件**: CHECKLIST.md, content/sop/宣传委员工作流程指南.md, content/sop/纪检委员工作流程指南.md, docs/src/core/utils.js, docs/src/core/state.js, docs/src/core/domain.js, docs/src/services/inspection.js, docs/src/services/makeup.js, docs/src/services/taskforce.js, docs/src/workflow/engine.js, docs/src/workflow/definitions.js, docs/src/workflow/index.js, .ctx/logs/EXECUTION_LOG_INDEX.md, .superpowers/brainstorm/session-001/*（3 文件已删除）, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: T66-1 文档间死链清查与修复 ✅ / T66-2 SOP 标注一致性复检 ✅ / T66-3 死代码清查 ✅ / T66-4 VSCode 遗留死文件清查 ✅ / T66-5 死代码第一批清理（19 处） ✅ / T66-6 .superpowers/ 清理 ✅ / T66-7 EXECUTION_LOG_INDEX.md 更新 ✅
- **变更详情**:
  - **文档死链修复（4 处）**：
    - CHECKLIST.md L359：路径层级错误 `../content/design/WRITE_VERIFY.md` → `content/design/WRITE_VERIFY.md`
    - 宣传委员工作流程指南.md L108：模板文件不存在 → 改为纯文本"模板待创建；网页已支持「每周一报送」自动生成"
    - 宣传委员工作流程指南.md L153：模板文件不存在 → 改为纯文本"宣传报送模板（待创建）"
    - 纪检委员工作流程指南.md L182：模板文件不存在 → 改为纯文本"补课记录模板（模板待创建）"
  - **SOP 标注一致性复检**：content/sop/ 中"⚠️ 网页待实现"零残留，5 处"✅ 网页已实现"标注全部与代码实现一致（含 2 处部分实现标注准确）
  - **死代码第一批清理（19 处，2 处误判跳过）**：
    - utils.js：删除 enterEl、leaveEl 函数（连带清理 TRANSITION_DURATION 无用 import）
    - state.js：删除 DYNAMIC_ROLE_CONTEXT、resolveDynamicRole（连带 SNAPSHOT_DYNAMIC、TIMESTAMPS_DYNAMIC）、canAIModify、AI_CAN_MODIFY_WHITELIST
    - domain.js：删除 can 函数（含 JSDoc）
    - inspection.js：删除 addInspectionRecord、addInspectionRecords、getRecordsByRecorder
    - makeup.js：删除 updateMakeupTask（addMakeupTask/saveMakeupTasks 经验证为活代码，跳过）
    - taskforce.js：删除 renderRecruitmentList
    - engine.js：删除 canTransition、calcTimeoutStatus、EVENT_TYPES、hasPermission、ROLE_PERMISSIONS
    - definitions.js：删除 DIMENSION_DEFINITIONS、findDefinition
    - index.js：同步清理 5 处 re-export
  - **过程文件清理**：删除 .superpowers/brainstorm/session-001/ 下 3 个文件（planetary-motion-variants.html、events、server-stopped）
  - **执行日志索引更新**：EXECUTION_LOG_INDEX.md 补齐 2026-06（36 条）+ 2026-07（34 条）T 编号条目，共 70 条；YAML last_updated 2026-05-02 → 2026-07-07；月度表新增 2026-06、2026-07 行；新增"月度条目索引"章节
- **设计决策**:
  - makeup.js 中 addMakeupTask/saveMakeupTasks 经验证为活代码（autoGenerateMakeupTask → addMakeupTask → saveMakeupTasks 调用链完整，autoGenerateMakeupTask 被 ws-disc-commissioner-entry.js import）——避免误删活代码
  - .github/ 目录中的重要原则已核实确认整合到 CLAUDE.md H8 + content/design/ + content/strategy/，可清理但需一改具改（写入乙部 T-2026-07-002）
  - .ctx/CONTEXT.md 内容已另有出处（ARCHITECTURE.md + CLAUDE.md + SNAPSHOT.md），可清理但需一改具改（写入乙部 T-2026-07-002）
- **结果**: 死链 4 处已修复；死代码第一批 19 处已清理，GetDiagnostics 无 JS 错误；.superpowers/ 已清理；EXECUTION_LOG_INDEX.md 已更新至 2026-07；剩余清理任务（.github/ 目录、CONTEXT.md、2026-03-AUDIT_REPORT.md、死代码第二批）写入乙部 T-2026-07-002
- **蒸馏标签**: [经验蒸馏: — 死链死代码清查经验待第二批清理完成后整体蒸馏]

---

## T67 死代码第二批清理（多余 export + 未消费 re-export）（2026-07-08）

- **来源**: T66 衍生任务（死代码第二批清理）+ 用户指示"继续推进"
- **变更文件**: docs/src/core/utils.js, docs/src/core/state.js, docs/src/core/constants.js, docs/src/components/inspector.js, docs/src/components/role-selector.js, docs/src/services/roles.js, docs/src/services/inspection.js, docs/src/services/handover.js, docs/src/services/assignment.js, docs/src/services/auth.js, docs/src/workflow/index.js, docs/src/workflow/renderer.js, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: T67-1 多余 export 清理（17 处）✅ / T67-2 未消费 re-export 清理（27 处）✅ / T67-3 GetDiagnostics 验证 ✅
- **变更详情**:
  - **A 类（17 处多余 export，移除 export 关键字保留定义）**：
    - utils.js：_pad
    - state.js：ROLE_TYPES、MANAGEMENT_ROLES、isManagementRole、isParticipantRole、getViewTypeByRole、getReferenceRoleBySelectedRole
    - constants.js：hexToRgba
    - inspector.js：renderInspectorList、renderInspectorDetail
    - role-selector.js：showRoleSelector
    - roles.js：saveAssignedRoles、addAssignedRole、removeAssignedRole
    - inspection.js：updateInspectionRecord
    - handover.js：saveHandoverRecords
    - assignment.js：saveAssignmentRecords
  - **B 类（27 处未消费 re-export，删除 re-export 语句）**：
    - auth.js：删除 `export { ROLE_LABELS, MODULE_ROLES, AUTHZ_CHAIN }`
    - workflow/index.js：精简为 4 个被消费的 re-export（sopDatabase、instantiateSOP、renderWorkflow、createStoreWithMockData），删除 18 个未消费 re-export
    - workflow/renderer.js：删除 `export { TEMPLATE_REGISTRY, DEFINITION_META }`，同步删除 DEFINITION_META 的 import
  - **5 处待确认预留 API 未触碰**：services/mock.js 的 Deliverable 系列（createDeliverable、listDeliverables、updateDeliverable、seedOrgLifeDeliverables、getScenarioMilestones）——需用户决策是否为预留 API
- **设计决策**: 5 处待确认预留 API（services/mock.js Deliverable 系列）未自行处理，提交书记决策
- **结果**: 44 处清理完成（17+27），GetDiagnostics 无 JS 错误；5 处待确认预留 API 待用户决策
- **蒸馏标签**: [经验蒸馏: — 死代码分类清理经验待后续蒸馏]

---

## T68 P.2 决策执行（"组织建设"术语一改具改）（2026-07-08）

- **来源**: 书记决策 P.2（"要和TERMINOLOGY对齐"+"奥卡姆剃刀"+"统一用党建工作来代替"）
- **变更文件**: CLAUDE.md, README.md, SECRETARY_PRONOUNCEMENTS.md, content/insights/党支部管理与实务经验沉淀.md, content/governance/TERMINOLOGY.md, docs/about.html, docs/src/components/commissioner-matrix.js, .ctx/logs/2026-07-EXECUTION_LOG.md
- **关键动作**: T68-1 H4.1 甲部修改流程 Step1 修改 H8.1 ✅ / T68-2 Step2 影响评估 ✅ / T68-3 Step4 逐项执行（14 处修改）✅ / T68-4 Step5 全局验证 ✅ / T68-5 YAML 更新（3 文件）✅ / T68-6 丙部 P.2 退出 ✅
- **变更详情**:
  - CLAUDE.md H8.1：`党建工作 = 组织建设、思想建设、作风建设` → `党建工作 = 服务同学们的核心职能（活动组织、专班建设等）`
  - CLAUDE.md 丙部：P.2 条目退出，改为"当前无待决策事项"
  - README.md L55 表格 + L58 正文：并列三词统一改为"服务同学们的核心职能"
  - SECRETARY_PRONOUNCEMENTS.md L171/L175/L177/L595：4 处并列三词统一改为"服务同学们的核心职能"或"党建工作"
  - insights L54/L57/L59/L795/L796：5 处并列三词统一改为"服务同学们的核心职能"或"党建工作"
  - TERMINOLOGY.md L30 注解：改为"党建工作内部不再按'组织建设/思想建设/作风建设'细分，统一用'党建工作'统称（奥卡姆剃刀原则）"
  - docs/about.html L141：并列三词改为"服务同学们的核心职能（活动组织、专班建设等）"
  - commissioner-matrix.js L73：subtitle 从'组织建设与思想建设'改为'服务同学们的核心职能'
  - YAML 更新：TERMINOLOGY.md、insights、SECRETARY_PRONOUNCEMENTS.md last_updated → 2026-07-08
- **设计决策**: 奥卡姆剃刀原则——"组织建设、思想建设、作风建设"并列出现时统一用"党建工作"统称，不展开；党建工作本职定义改为"服务同学们的核心职能（活动组织、专班建设等）"，用具体工作类型代替抽象分类
- **结果**: 14 处修改完成，3 个 YAML 更新；Grep 验证权威文件零残留（剩余仅在 .github/copilot-instructions.md 待清理 + .trae/documents/ 过程文档 + .ctx/logs/ 历史日志）；丙部 P.2 退出
- **蒸馏标签**: [经验蒸馏: — 术语一改具改经验待后续蒸馏]

---

## T69 Deliverable API 删除与残留清理（奥卡姆剃刀）（2026-07-08）

- **来源**: 书记决策（"删除代码保留设计文档"+ 强调奥卡姆剃刀原则）
- **变更文件**: docs/src/services/mock.js, docs/src/core/domain.js, docs/src/mock/seed.js
- **关键动作**: T69-1 删除 mock.js 5 个 Deliverable API ✅ / T69-2 删除 domain.js Deliverable typedef + mockDB.deliverables 字段 ✅ / T69-3 清理 mock.js 4 处残留引用 ✅ / T69-4 删除 seed.js SEED_DELIVERABLES 定义 ✅ / T69-5 删除 domain.js Activity.deliverableIds 字段 ✅ / T69-6 GetDiagnostics + Grep 零残留验证 ✅
- **变更详情**:
  - 删除 mock.js 5 个 API：createDeliverable, listDeliverables, updateDeliverable, seedOrgLifeDeliverables, getScenarioMilestones
  - 删除 domain.js Deliverable typedef（8 个 @property）+ mockDB.deliverables 字段
  - 清理 mock.js 4 处残留引用：import SEED_DELIVERABLES、saveDB deliverables 行、loadDB SANDBOX_MODE deliverables 行、loadDB 注释块 deliverables 行
  - 删除 seed.js SEED_DELIVERABLES 种子数据（5 条记录）
  - 删除 domain.js Activity.deliverableIds 字段（无消费方，奥卡姆剃刀）
- **设计决策**: 奥卡姆剃刀原则——无消费方的代码不应保留；设计文档 DATA.md §2.5 + MANAGEMENT_MODE.md 保留完整需求上下文，删除代码不影响母本
- **结果**: 5 个 API + 1 个 typedef + 1 个 mockDB 字段 + 1 个种子数据 + 4 处残留引用 + 1 个无消费字段全部清理；GetDiagnostics 3 文件均无错误；Grep 零残留（仅剩 mock.js 2 行删除注释用于追溯）
- **蒸馏标签**: [经验蒸馏: — 死代码清理经验待后续蒸馏]

## T70 content/ 层次体系重构（T前缀+4文件合并+索引优化）（2026-07-08）

- **来源**: 用户指示（content/ 文件数量太多、层次不清晰；L 体系打架引入 T 前缀）
- **变更文件**: content/design/PERMISSION_MATRIX.md(删除), content/design/LOGIN_STUB.md(删除), content/design/APPROVAL_FLOW.md(删除), content/design/WRITE_VERIFY.md(删除), content/design/LOGIN_SYSTEM_DESIGN.md(新建), content/design/MANAGEMENT_MODE.md, content/design/COMMISSIONER_SYSTEM.md, content/design/DATA.md, content/design/SERVICE_CATALOG.md, content/design/SOP_WEB.md, content/design/README.md, content/governance/DOC_MAP.md, content/governance/TERMINOLOGY.md, SSOT_INDEX.md, SECRETARY_PRONOUNCEMENTS.md, CHECKLIST.md, .ctx/TIMESTAMPS.md
- **关键动作**: T70-1 Phase A T前缀重构 ✅ / T70-2 B1 PERMISSION_MATRIX精简合并至MANAGEMENT_MODE ✅ / T70-3 B2 LOGIN_STUB拆分(§一~§五→MANAGEMENT_MODE，§六~§十一→LOGIN_SYSTEM_DESIGN.md) ✅ / T70-4 B3 APPROVAL_FLOW全量合并至COMMISSIONER_SYSTEM ✅ / T70-5 B4 WRITE_VERIFY精简合并至DATA(§三/§五删除) ✅ / T70-6 C1-C3 索引更新(README/DOC_MAP/SSOT_INDEX) ✅ / T70-7 D2 最终验证(Grep零残留+索引一致性+行数) ✅
- **变更详情**:
  - Phase A: TERMINOLOGY.md §七术语层次 L1/L2/L3 改为 T1/T2/T3（Terminology），文档层次保留 L0-L6（Layer），正交不冲突；6 文件一改具改
  - B1: PERMISSION_MATRIX.md(270行)精简合并至MANAGEMENT_MODE.md §权限矩阵权威源（仅合并§四核心权限矩阵+§九党务管理权限矩阵，重叠章节链接替代）
  - B2: LOGIN_STUB.md(391行)拆分——§一~§五当前打桩逻辑合并至MANAGEMENT_MODE.md §登录态打桩设计；§六~§十一登录系统设计前置保留为独立文件LOGIN_SYSTEM_DESIGN.md
  - B3: APPROVAL_FLOW.md(192行)全量合并至COMMISSIONER_SYSTEM.md §审批流程规范（8章节调整为子节）
  - B4: WRITE_VERIFY.md(273行)精简合并至DATA.md §写入数据验证设计（§一设计原则+§二数据流清单+§四验证策略合并；§三localStorage键值索引与DATA.md §3.2重叠删除；§五与CHECKLIST关系删除）
  - 更新 SERVICE_CATALOG 10处引用 + TERMINOLOGY 1处 + MANAGEMENT_MODE 1处 + SECRETARY_PRONOUNCEMENTS 1处 + CHECKLIST 1处
  - 更新 README.md/DOC_MAP.md/SSOT_INDEX.md 索引（移除4个已合并文件，添加LOGIN_SYSTEM_DESIGN.md，更新3个目标文件说明）
  - 更新 TIMESTAMPS.md 移除3个已删除文件条目，添加LOGIN_SYSTEM_DESIGN.md
- **设计决策**: 精简合并策略（仅合并核心独有章节，重叠章节以链接替代，控制文件长度）；LOGIN_STUB拆分决策（当前实现vs未来设计定位不同，主题分裂明显）；权威源转移（合并后目标文件承接原文件权威源地位）
- **结果**: 4个文件合并+1个文件拆分+1个文件新建；合并后行数：MANAGEMENT_MODE 703行/COMMISSIONER_SYSTEM 411行/DATA 542行（均在阈值内）；Grep零残留（剩余引用均为来源标注或历史日志）；索引一致性确认
- **蒸馏标签**: [经验蒸馏: 是 — 经验已写入 insights §9.6 content/ 文件夹梳理方法论]
---

## T71 内容治理与可读性优化（4 任务 spec 全流程）（2026-07-08）

- **来源**: 用户指示（4 项内容治理任务：分层梳理+文件分类+反论修订+论断可读性）
- **关键动作**: ✅ Phase 1 分层梳理（LAYERING_FRAMEWORK.md 新建） ✅ Phase 2 文件分类（4 子任务并行） ✅ Phase 3 反论修订（47 处审查，2 处不达标修订） ✅ Phase 4 论断可读性（14 处原话前置+11 过渡段） ✅ Phase 5 全局验证
- **设计决策**: 书记 spec 批准时 2 处修订——(1) 原因分析框架内化为问题意识；(2)"充分利用书记原话"= 原话校准权威+原话优先级提升
- **结果**: 4 任务全部完成；LAYERING_FRAMEWORK.md 8 套分层体系覆盖完整；insights 反论修订 Grep 零残留；SECRETARY_PRONOUNCEMENTS.md 25 条论断完整、14 处原话完整
- **蒸馏标签**: [经验蒸馏: 是 — 经验已写入 insights §11.8 内容治理 spec 全流程经验]

### 修改文件清单
- content/governance/LAYERING_FRAMEWORK.md（新建）
- content/governance/OPERATIONS_GUIDE.md
- content/governance/DOC_MAP.md
- content/governance/RECURRING_TASKS.md
- content/governance/README.md
- SSOT_INDEX.md
- .ctx/TIMESTAMPS.md
- content/insights/党支部管理与实务经验沉淀.md
- SECRETARY_PRONOUNCEMENTS.md
- CLAUDE.md

---

## T72 治理文件功能审计与拆分（CLAUDE.md 精简 + OPERATIONS_GUIDE/KNOWN_PITFALLS 外移 + SECRETARY_PRONOUNCEMENTS 表述修订）（2026-07-09）

- **来源**: 用户指示（治理文件功能审计与拆分 spec：CLAUDE.md 精简+H4/H6/H7 外移+H8-H12 删除+表述修订）
- **关键动作**: ✅ 阶段1 LAYERING_FRAMEWORK.md 删除+合并 ✅ 阶段2 CLAUDE.md 拆分（H4→§12, H6→§13, H7→§8, H8-H12 删除, 新增 H5 书记评议+H6 外部索引） ✅ 阶段3 OPERATIONS_GUIDE §11 表述规范+SECRETARY_PRONOUNCEMENTS 15 处违规修订 ✅ 一改具改（全仓库旧编号引用更新） ✅ 全局验证（Grep 零残留+YAML 同步）
- **设计决策**: 无非显而易见的决策（所有决策已在 spec 批准时由书记确认）
- **结果**: spec 阶段1-3+6 全部完成；CLAUDE.md 精简 48%（666→347 行）；一改具改零残留验证通过；表述违规全部修订
- **蒸馏标签**: [经验蒸馏: 是 — 经验已写入 insights §9.8 治理文件功能审计与拆分]

### 修改文件清单
- CLAUDE.md
- content/governance/OPERATIONS_GUIDE.md
- content/governance/KNOWN_PITFALLS.md
- content/governance/LAYERING_FRAMEWORK.md（删除）
- SECRETARY_PRONOUNCEMENTS.md
- content/governance/DOC_MAP.md
- content/design/COMMISSIONER_SYSTEM.md
- content/design/MANAGEMENT_MODE.md
- content/design/DATA.md
- content/design/SOP_WEB.md
- content/sop/支委与党小组定人定责定岗说明.md
- content/sop/常见工作场景快速指南.md

---

## T73 书记评议·首评（H5 工作流首次执行：抽样+四维度预审）（2026-07-09）

- **来源**: 用户指示（执行 CLAUDE.md H5 书记评议工作流的首次评议首评）
- **关键动作**: ✅ 首评前置确认（扫描 T37-T72 共 36 条） ✅ 抽样 14 条命题（覆盖 content/ 五子目录+SECRETARY_PRONOUNCEMENTS.md） ✅ 四维度预审报告（表述/内容/精神实质/实现方法） ✅ 评议模板呈现（A1-A5 合规确认+B1-B4 存疑项+C1-C2 AI 判断存疑）
- **设计决策**: 无（首评为分析任务，不涉及设计决策）
- **结果**: 首评分析完成并交付；书记反馈已按 H5.4 三层分流归档（详见 T76 执行记录）；H5.6 抽样校验通过
- **蒸馏标签**: [经验蒸馏: — 首评工作流执行经验待后续评估]

### 修改文件清单
- 无（首评为只读分析任务，不修改任何文件）

---

## T74 评议工作流优化（H5.3-H5.6 修订 + REVIEW_QUEUE.md 创建 + spec 三件套）（2026-07-09）

- **来源**: 书记对 H5 工作流两项反馈（①评议产物无固定位置 ②反馈落实缺校验机制防过拟合）
- **关键动作**: ✅ REVIEW_QUEUE.md 创建 ✅ H5.3 修订（4 步扩展为 5 步） ✅ H5.4 修订（三层重定义） ✅ H5.5 修订（新增反馈落实摘要） ✅ H5.6 新增（修订校验原则，一般化表达） ✅ spec 三件套
- **设计决策**: D-230（H5.6 一般化表达策略——不写死具体数字，改为"按修订规模灵活调整"）
- **结果**: 评议工作流优化完成——评议产物有固定位置（REVIEW_QUEUE.md）+ 反馈落实有校验机制防过拟合（H5.6）
- **蒸馏标签**: [经验蒸馏: — 评议工作流优化经验待后续多轮使用后评估]

### 修改文件清单
- .ctx/REVIEW_QUEUE.md（新建）
- CLAUDE.md（H5.3/H5.4/H5.5 修订 + H5.6 新增）
- .trae/specs/review-workflow-optimization/{spec,tasks,checklist}.md

---

## T75 REVIEW_QUEUE.md 功能定位修正 + B1-B4 决策上下文补充 + H1.2 /ask 强调（2026-07-09）

- **来源**: 书记反馈——①REVIEW_QUEUE.md 功能定位需明确 ②B1-B4 待判断项缺乏决策所需上下文 ③CLAUDE.md 须强调"有疑问必须主动 /ask"
- **关键动作**: ✅ REVIEW_QUEUE.md 功能定位为上下文文件（A 方案） ✅ 删除历史轮次章节 ✅ B1-B4 每项补充完整决策上下文（四部分结构） ✅ H5.3 第 5 步修订 ✅ H1.2 歧义消解铁律强化（新增 /ask 强调） ✅ 一改具改验证
- **设计决策**: D-231（REVIEW_QUEUE.md 功能定位为上下文文件 A 方案——遵循"日志与上下文物理分离"原则）
- **结果**: REVIEW_QUEUE.md 功能定位明确；B1-B4 决策上下文补充完成；CLAUDE.md H1.2 /ask 强调已就位
- **蒸馏标签**: [经验蒸馏: — 上下文文件与日志文件分离原则待后续多轮使用后评估]

### 修改文件清单
- .ctx/REVIEW_QUEUE.md
- CLAUDE.md（H5.3 第 5 步 + H1.2 歧义消解铁律）

---

## T76 书记评议·首评 B1-B4 反馈处理执行（即时修订+机械性扫描+H5.6 校验+丙部 P.1+额外发现）（2026-07-10）

- **来源**: 书记在对话中直接反馈 B1-B4 修改意见（不选 A/B 选项，直接给方向），3 个 /ask 已获答复
- **关键动作**: ✅ B1 即时修订 3 处 ✅ B1 巡检发现同类 1 处 ✅ B3 机械性全仓库扫描 5 处 ✅ B4 机械性全仓库扫描 93 处/8 文件 ✅ B2 设计性问题入丙部 P.1 ✅ H5.6 抽样校验 B3 1 处+B4 3 处 ✅ 额外发现"党小组长"22 处/9 文件替换 ✅ T73 补全反馈落实摘要
- **设计决策**: D-232（B1 性质判定——书记未选 A/B 直接给方向，属即时修订）；D-233（"党小组长"作为 B4 H5.6 校验的额外发现）
- **结果**: B1-B4 反馈全部处理完成；H5.6 抽样校验通过；额外发现"党小组长"22 处同步替换完成；Grep 零残留验证通过
- **蒸馏标签**: [经验蒸馏: — 评议反馈处理执行经验待后续多轮使用后评估]

### 修改文件清单
- content/sop/常见工作场景快速指南.md
- content/sop/支委与党小组定人定责定岗说明.md
- content/insights/党支部管理与实务经验沉淀.md
- content/strategy/MANAGE_SERVE.md
- content/sop/党小组组长工作手册.md
- content/design/COMMISSIONER_SYSTEM.md
- content/sop/INDEX.md
- content/governance/DOC_MAP.md
- docs/src/workflow/sopData.js
- docs/src/workflow/definitions.js
- CLAUDE.md（丙部新增 P.1）
- + "党小组长"替换涉及 9 文件

---

## T77 P.1 面向新成员的"组织性"故事重构（brainstorming 全流程 + 第一章重构）（2026-07-10）

- **来源**: 丙部 P.1 第一步决策执行（brainstorming + writing-plans skill 全流程）
- **关键动作**: ✅ brainstorming 设计（P.1 第一步+第二步决策） ✅ spec 文档编写与自审 ✅ writing-plans 实施计划 ✅ 第一章重构执行（总分总结构） ✅ Grep 验证禁用字眼清除 ✅ 丙部 P.1 退出
- **设计决策**: 总分总结构（替代原"核心命题+通俗表达+并列反论"）；三阶段递进（准入→运作→协调）；核心概念对小标题（门槛→途径/等级→过程/服从→整合）；禁用字眼（资源、借力）；禁用句式（不是...而是...）；书记原话有机整合进段落
- **结果**: P.1 完成；第一章从"核心命题+通俗表达+并列反论"重构为总分总叙事结构；丙部 P.1 退出
- **蒸馏标签**: [经验蒸馏: — brainstorming 全流程经验待后续多轮使用后评估]

### 修改文件清单
- content/strategy/MANAGE_SERVE.md（第一章 L32-42 替换为总分总结构）
- CLAUDE.md（丙部 P.1 删除 + YAML 更新）
- .trae/specs/organizational-story-reconstruction/{spec,tasks}.md

---

## T78 T-2026-07-002 VSCode 时代遗留文件清理（含一改具改）（2026-07-10）

- **来源**: 乙部 T-2026-07-002（brainstorming + writing-plans + verification-before-completion skill 全流程）
- **关键动作**: ✅ brainstorming 设计 ✅ 2 个遗留文件删除（CONTEXT.md + AUDIT_REPORT.md） ✅ CLAUDE.md H1.1 修正（移除"读入 .github/copilot-instructions.md"步骤） ✅ 3 子代理并行处理 12 文件 ✅ 全仓库 Grep 验证零残留 ✅ TIMESTAMPS.md 残留修复 ✅ SNAPSHOT.md YAML 修复 ✅ D-186 规则保留
- **设计决策**: 清理方式仅移除引用（非全量删除 .github/ 24 个文件）；ARCHITECTURE.md 分层架构重新指向（Layer 0 → CLAUDE.md，Layer 6 → SNAPSHOT.md，Layer 3 保留 D-186 标注）；D-186 规则保留（.github/ 目录物理保留）
- **结果**: 2 个遗留文件删除+12 个文件一改具改+全仓库 Grep 验证零残留；D-186 规则保留（.github/ 目录物理保留，Trae 中忽略）；乙部 T-2026-07-002 退出
- **蒸馏标签**: [经验蒸馏: — 子代理并行处理+验证零残留模式待后续多轮使用后评估]

### 修改文件清单
- .ctx/CONTEXT.md（删除）
- .ctx/logs/2026-03-AUDIT_REPORT.md（删除）
- CLAUDE.md（H1.1 修正 + 乙部退出 + YAML 更新）
- ARCHITECTURE.md（Layer 0/Layer 6 重新指向 + YAML 更新）
- SSOT_INDEX.md（copilot-instructions.md → CLAUDE.md + YAML 更新）
- .ctx/TIMESTAMPS.md（移除 copilot-instructions.md + CONTEXT.md + AUDIT_REPORT.md 行）
- .ctx/SNAPSHOT.md（Layer 0 重新指向 + YAML 修复）
- content/governance/ROLE_CLASSIFICATION.md
- content/governance/DOC_MAP.md
- content/governance/RECURRING_TASKS.md
- content/governance/OPERATIONS_GUIDE.md
- content/governance/EMOJI_POLICY.md
- content/design/DATA.md
- content/insights/党支部管理与实务经验沉淀.md
- content/references/工作模板/FEEDBACK_FORM.md

---

## T79 书记评议·二评（H5 工作流第二次执行：抽样+四维度预审+B1-B4反馈处理+全仓库验证）（2026-07-10）

- **来源**: 书记指示"组织开展一次系统性的书记评议"（H5.1 按需启动）
- **关键动作**: ✅ Plan Mode 四阶段（brainstorming） ✅ 精确抽样 13 条命题（不重复机制） ✅ 四维度预审（A 类 9 条合规+B 类 4 条存疑） ✅ REVIEW_QUEUE.md 写入 ✅ B1-B4 反馈处理（7 Task 执行） ✅ 全仓库验证零残留
- **设计决策**: B1 重复内容剔除（MANAGE_SERVE.md 第二章与第一章重复）；B2 移除"专班制"概念（保留"专班"存在，新定义"专班是活动之外考察积极分子的载体"）；B3 自检清单设问句保留（属自检提问）；B4 P-041 简化（保留书记原话，删除 AI 推导反论）
- **结果**: 二评抽样+预审+反馈处理完成；专班新定义在 3 个母本权威源中一致；Task 5 暂停→T80 完成
- **蒸馏标签**: [经验蒸馏: — B1 全仓库去重归并（Task 5）待后续 session 完成后统一评估]

### 修改文件清单
- SECRETARY_PRONOUNCEMENTS.md（P-041 原话更新+P-012 重写）
- content/strategy/MANAGE_SERVE.md（§6 P-041 更新+第二章去重）
- content/insights/党支部管理与实务经验沉淀.md（§2 专班新定义）
- content/design/COMMISSIONER_SYSTEM.md（§A.4 重写）
- docs/about.html
- docs/src/entries/help-entry.js
- README.md / TERMINOLOGY.md / SERVICE_CATALOG.md / design/README.md / DOC_MAP.md / MANAGEMENT_MODE.md / SNAPSHOT.md / TIMESTAMPS.md / REVIEW_QUEUE.md / 党小组组长工作手册.md

---

## T80 T-2026-07-003 B1 全仓库去重归并（二评衍生：表述规范+概念定位+受众标记补全）（2026-07-11）

- **来源**: T79 二评 B1 反馈衍生——书记测试 1-4 反馈提炼 R1-R3 判定规则，全仓库扫描修订
- **关键动作**: ✅ brainstorming 全流程（7 轮 AskUserQuestion 澄清） ✅ writing-plans ✅ subagent-driven 7 Task 执行 ✅ 全仓库 Grep 验证零残留
- **设计决策**: R1-R3 判定规则（R1 表述规范类/R2 内容质量类/R3 概念定位类）；"沦为"改为"变成"；P-001 处理（删除重复 AI 展开）；预演场改写；核心命题改写；受众标记补全（7 文件）
- **结果**: 8 个目标术语在项目内容文件中零残留；8 个面向用户文档受众标记完整；YAML last_updated 全部为 2026-07-11
- **蒸馏标签**: [经验蒸馏: — R1-R3 判定规则+"沦为→变成"替换原则+受众标记补全方法论待 C-3 蒸馏]

### 修改文件清单
- content/strategy/MANAGE_SERVE.md（L42 预演场改写+L174/L198/L199 沦为→变成+受众标记）
- content/sop/常见工作场景快速指南.md（受众标记）
- content/sop/支委与党小组定人定责定岗说明.md（受众标记）
- content/sop/宣传委员工作流程指南.md（受众标记）
- content/sop/组织委员工作流程指南.md（受众标记）
- content/sop/纪检委员工作流程指南.md（受众标记）
- content/sop/党小组组长工作手册.md（受众标记）
- SECRETARY_PRONOUNCEMENTS.md（P-001 标题删减+AI 展开 4 段删除+2 处沦为→变成）
- README.md（L105 核心命题改写）
- docs/src/entries/help-entry.js（L613 核心命题改写）
- content/insights/党支部管理与实务经验沉淀.md（L44+L91 沦为→变成）
- content/governance/OPERATIONS_GUIDE.md（L532 筛人的门槛→排他门槛）

---

## T81 术语规范自查 + spec/plan清理 + 三评瘦身（2026-07-11）

- **来源**: 书记三项指示——(1)术语规范自查（以"从申请人到正式党员"为例）(2)书记评议·三评（系统性瘦身）(3)spec/plan文件处理
- **关键动作**: ✅ 术语规范扫描（10 批 Grep，5 类术语问题修复） ✅ spec/plan 文件清理（17 文件+10 spec 目录删除） ✅ 三评瘦身（DESIGN_SYSTEM.md 精简~150 行+insights 精简~20 行） ✅ 验证
- **设计决策**: "积极分子"特例（可简化）；"党支书"保持；瘦身安全边界（书记原话不可删减+必要 why 讲解不可删减）；§9.5 反论合并原则（6→3 核心反论）；§10.10 占位条目删除
- **结果**: 5 类术语在 content/ 和 docs/ 中零残留；17 个过程性文件+10 个 spec 目录删除；DESIGN_SYSTEM.md 精简~150 行；insights 精简~20 行
- **蒸馏标签**: [经验蒸馏: — 术语规范判定标准+三评瘦身方法论待 C-3 蒸馏]

### 修改文件清单
- docs/src/entries/help-entry.js（6 处"申请人"→"入党申请人"）
- ARCHITECTURE.md（2 处"民主评议"→"民主评议党员"）
- content/design/ORG_BUILDING.md（1 处"民主评议"→"民主评议党员"）
- content/sop/常见工作场景快速指南.md（1 处"民主评议"→"民主评议党员"）
- SECRETARY_PRONOUNCEMENTS.md（1 处"缴党费"→"党费缴纳"）
- content/governance/TERMINOLOGY.md（新增"积极分子"特例规则）
- content/design/DESIGN_SYSTEM.md（删除 5 个 CSS 代码块）
- content/insights/党支部管理与实务经验沉淀.md（删除§10.10+合并§9.5 反论+精简迁移说明）
- +27 文件"党员发展"→"发展党员"（子代理批量处理）
- +11 文件"组长"→"党小组组长"（子代理批量处理）

---

## T82 书记评议·三评·项目瘦身专项：design/ 目录纯化（Batch 1-4）（2026-07-11）

- **来源**: 书记指示——"项目瘦身"专项任务（design/ 纯化："权限是工作内容的问题，跟网页设计无关；数据流设计才是网页设计"）
- **关键动作**: ✅ brainstorming 5 节方案 ✅ Batch 1 并行 3 Agent（COMMISSIONER_SYSTEM→strategy/COMMISSIONER_FRAMEWORK 迁移） ✅ Batch 2 并行 2 Agent（索引更新+残留修复） ✅ Batch 3 书记暂停（ROLE_CLASSIFICATION 文件角色分类升级阻塞） ✅ Batch 4 收尾验证
- **设计决策**: design/ 纯化原则（纯系统落地设计）；权限矩阵两层处理；命名规范 `[MODULE]_[TOPIC].md`（"SYSTEM"→"FRAMEWORK"避免歧义）；文档合并必要条件（目标读者群体一致）；文件角色分类体系升级（T-2026-07-005）；术语纠正后置（T-2026-07-004）
- **结果**: 3 文件迁移+18 文件修改；ORG_BUILDING/COMMISSIONER_SYSTEM/SERVICE_CATALOG 残留全部合法
- **蒸馏标签**: [经验蒸馏: — design/ 纯化方法论+命名规范+文件角色分类体系升级判定标准待 C-3 蒸馏]

### 修改文件清单
- SSOT_INDEX.md（已迁移文件索引新增 3 条）
- content/design/README.md
- content/governance/TERMINOLOGY.md
- content/design/MANAGEMENT_MODE.md
- content/governance/DOC_MAP.md
- ARCHITECTURE.md
- .ctx/TIMESTAMPS.md
- CLAUDE.md（P3 表追加 T-2026-07-005/T-2026-07-006）
- content/sop/纪检委员工作流程指南.md
- content/sop/支委与党小组定人定岗说明.md
- content/sop/党小组组长工作手册.md
- content/governance/SERVICE_CATALOG.md
- content/governance/KNOWN_PITFALLS.md
- content/design/COMMISSIONER_SYSTEM.md（删除，迁移至 strategy/COMMISSIONER_FRAMEWORK.md）
- content/strategy/COMMISSIONER_FRAMEWORK.md（新建，554 行）
- content/governance/README.md
- content/governance/SERVICE_CATALOG.md（type 字段 design→governance）

---

## T83 T-2026-07-005 文件角色分类体系升级（[人]/[人机]/[AI] → [用户]/[工程师]/[AI] + 复合标记）（2026-07-11）

- **来源**: 书记在 T82 Batch 3 决策时明确指出"人、人机、AI 是旧的分类。【人】可以划分为'用户'和'工程师'两种角色。这就带来了新的【文件角色划分】"
- **关键动作**: ✅ 母本重写（ROLE_CLASSIFICATION.md 264 行） ✅ 权威源修订（5 subagent 并行） ✅ YAML role 字段更新（3 subagent 并行，~45 文件） ✅ 代码注释更新（49 .js 文件） ✅ 文档引用更新（20 文件~135 处） ✅ 验证通过
- **设计决策**: 新三分类定义（[用户]党支部建设/[工程师]编程系统设计/[AI]Agent 专用）；复合标记规则（`+` 连接，排序固定 [用户]>[工程师]>[AI]）；strategy/ 修正为 [用户]+[AI]（书记指出"strategy 一定是给用户而不是工程师看的"）
- **结果**: T-2026-07-005 完成，解除 design/ 纯化 Batch 3 阻塞；约 100 个文件更新；YAML role 字段零残留
- **蒸馏标签**: [经验蒸馏: — 文件角色分类体系升级方法论待 C-3 蒸馏]

### 修改文件清单
- content/governance/ROLE_CLASSIFICATION.md（母本完整重写 264 行）
- content/governance/OPERATIONS_GUIDE.md（§8 重写）
- content/governance/DOC_MAP.md（§〇+42 处引用更新）
- content/governance/TERMINOLOGY.md（§六整节重写）
- content/insights/党支部管理与实务经验沉淀.md（§7.7 追加修正标注）
- CLAUDE.md / SSOT_INDEX.md（引用更新）
- ~45 文件 YAML role 字段更新
- 49 个 docs/src/ .js 文件代码注释更新
- 20 个文件约 135 处文档引用更新

---

## T84 design/ 纯化 Batch 3 + 网页→系统术语纠正 + 文档精简（2026-07-11）

- **来源**: 书记指示"修改上述工作的目的，是为了进一步优化我们的文档文件夹的设置！！目标清晰明确！"
- **关键动作**: ✅ Batch 3 MANAGEMENT_MODE.md 拆分（PARTICIPANT_DATAFLOW.md 新建+权限矩阵迁移至 ROLE_CLASSIFICATION.md §九） ✅ 网页→系统术语纠正（14 文件） ✅ 文档精简（SYNC_EXTERNAL.md 合并入 OPERATIONS_GUIDE.md §14）
- **设计决策**: MANAGEMENT_MODE.md 拆分权限矩阵处理（T-2026-07-006"暂停"的是内容大改，不是文件位置）；网页→系统术语上下文判断（非简单全局替换）；文档精简判断标准（三条件才合并：小文件+同类内容+独立价值低）
- **结果**: design/ 文件列表 10 文件；"网页"零残留；SYNC_EXTERNAL 已合并
- **蒸馏标签**: [经验蒸馏: — design/ 纯化方法论（权限矩阵位置迁移 vs 内容大改的区分）待 C-3 蒸馏]

### 修改文件清单
- content/design/PARTICIPANT_DATAFLOW.md（新建，数据流设计+界面布局+登录态打桩+差异化视图）
- content/governance/ROLE_CLASSIFICATION.md（§九 权限矩阵追加）
- content/design/MANAGEMENT_MODE.md（删除）
- content/strategy/COMMISSIONER_FRAMEWORK.md（2 处网页→系统）
- content/design/SOP_WEB.md（20+ 处网页→系统）
- content/design/DESIGN_SYSTEM.md（1 处网页→系统）
- content/design/BRAND_ACTIVITY.md（多处网页→系统）
- content/insights/党支部管理与实务经验沉淀.md（5 处网页→系统）
- content/sop/ 5 个文件（多处网页→系统）
- content/governance/EMOJI_POLICY.md（6 处网页→系统）
- content/governance/OPERATIONS_GUIDE.md（§14 新增+§11 表述规范）
- content/governance/SYNC_EXTERNAL.md（删除，合并入 OPERATIONS_GUIDE.md §14）
- +共享文件引用更新（DOC_MAP/SSOT_INDEX/ARCHITECTURE/TIMESTAMPS/SNAPSHOT/design-README/governance-README）

---

## T85 content/ 目录系统性优化与"前提关系"结构调整（2026-07-12）

- **来源**: 书记指示"对 content 目录下剩余文件夹进行系统性的内容优化工作"+"前提关系"结构调整（前提=基础概念/定义/分类框架，结果=具体规则/操作，正确结构=前提前置→结果后置）
- **关键动作**: ✅ 结构调整（4 文件：MANAGE_SERVE/COMMISSIONER_FRAMEWORK/常见工作场景快速指南/支委与党小组定人定责定岗说明） ✅ 跨文件去重（sop/INDEX.md 新增术语段落+6 sop/文件引用） ✅ L3 表达"域"全仓库清理（13 文件） ✅ T84 一改具改遗漏修复 ✅ 瘦身与文风检查 ✅ 验证
- **设计决策**: "前提关系"概念精确把握（MANAGE_SERVE.md 第七章"双域体系"前移为新第四章）；L3 表达"域"三类区分（保留书记原话/保留非 L3 含义/修订 L3 工作表达）；跨文件去重顺序约束（先 INDEX.md 添加段落再各文件引用修改）
- **结果**: MANAGEMENT_MODE 零残留；L3 表达"域"按 spec 零残留；MANAGE_SERVE.md 章节顺序正确；sop/INDEX.md 术语段落已添加；YAML 全部 2026-07-12
- **蒸馏标签**: [经验蒸馏: — "前提关系"结构规范与 L3 表达"域"清理方法论待 C-3 蒸馏]

### 修改文件清单
- content/strategy/MANAGE_SERVE.md（第七章"双域体系"前移为新第四章+瘦身）
- content/strategy/COMMISSIONER_FRAMEWORK.md（A.8 合并到 A.7+A.9 移入附录+瘦身）
- content/sop/INDEX.md（顶部新增"术语与双域定义"段落）
- content/sop/常见工作场景快速指南.md（删除"目录"段+引用 INDEX.md）
- content/sop/支委与党小组定人定责定岗说明.md（删除第六章+引用 INDEX.md+MANAGEMENT_MODE→PARTICIPANT_DATAFLOW）
- content/sop/党小组组长工作手册.md（引用 INDEX.md）
- content/sop/组织委员工作流程指南.md（引用 INDEX.md）
- content/sop/宣传委员工作流程指南.md（引用 INDEX.md）
- content/sop/纪检委员工作流程指南.md（引用 INDEX.md）
- content/design/{DATA,CALENDAR,FLAT_DESIGN,LOGIN_SYSTEM_DESIGN,PARTICIPANT_DATAFLOW,SOP_WEB,PAFFAIRS_UI}.md（"域"清理）
- content/governance/{ROLE_CLASSIFICATION,SERVICE_CATALOG,DOC_MAP,KNOWN_PITFALLS,TERMINOLOGY}.md（"域"清理）
- content/insights/党支部管理与实务经验沉淀.md（"域"清理）

---

## T86 content/ 目录重构与优化（2026-07-12）

- **来源**: 书记指示"优化文档文件夹设置"（spec：content-restructure-optimization）
- **关键动作**: ✅ design/ 目录合并（10→4 文件：DATA_ARCHITECTURE.md+MODULE_UI_DESIGN.md 新建，6 文件删除） ✅ 跨目录迁移（SOP_WEB→governance/，FLAT_DESIGN→strategy/） ✅ 前提关系+一般特殊结构调整（4 文件：EMOJI_POLICY/RECURRING_TASKS/DESIGN_SYSTEM/strategy-README） ✅ 一改具改（5 索引更新+19 文件 49 处引用更新）
- **设计决策**: "为合并找理由"原则（目标读者群体一致为必要非充分条件）；DATA_ARCHITECTURE.md 按前提关系合并（数据架构总览→数据模型→参与者数据流→登录系统→品牌属性→前端数据流）；MODULE_UI_DESIGN.md 合并；SOP_WEB→governance（方法论归入治理）；FLAT_DESIGN→strategy（组织设计归入战略）
- **结果**: design/ 仅含 4 文件；DATA_ARCHITECTURE.md 1196 行≤1200；MODULE_UI_DESIGN.md 283 行≤400；全仓库零残留旧引用；YAML 全部 2026-07-12
- **蒸馏标签**: [经验蒸馏: — 待后续蒸馏]

### 修改文件清单
- content/design/DATA_ARCHITECTURE.md（新建，1196 行，合并 DATA+PARTICIPANT_DATAFLOW+LOGIN_SYSTEM_DESIGN+BRAND_ACTIVITY）
- content/design/MODULE_UI_DESIGN.md（新建，283 行，合并 PAFFAIRS_UI+CALENDAR）
- content/design/DATA.md（删除）
- content/design/PARTICIPANT_DATAFLOW.md（删除）
- content/design/LOGIN_SYSTEM_DESIGN.md（删除）
- content/design/BRAND_ACTIVITY.md（删除）
- content/design/PAFFAIRS_UI.md（删除）
- content/design/CALENDAR.md（删除）
- content/governance/SOP_WEB.md（迁移自 design/）
- content/strategy/FLAT_DESIGN.md（迁移自 design/）
- content/governance/EMOJI_POLICY.md（结构调整）
- content/governance/RECURRING_TASKS.md（结构调整）
- content/design/DESIGN_SYSTEM.md（结构调整）
- content/strategy/README.md（结构调整+新增 FLAT_DESIGN.md）
- content/design/README.md（索引更新）
- content/governance/README.md（新增 SOP_WEB.md）
- content/README.md（YAML 更新）
- content/governance/DOC_MAP.md（8 组引用映射更新）
- SSOT_INDEX.md（母本子本关系更新）
- +19 文件 49 处全仓库引用更新

---

## T87 执行日志瘦身（蒸馏前置 + 早期归档 + 摘要表）（2026-07-12）

- **来源**: 书记指示"执行日志太过于臃肿了，我希望你也帮助它多多瘦身！！思考一下，从哪个方面入手可以让这个文档瘦身40%以上的同时不伤及日志的记录作用"；书记选定方案"归档早期+摘要表"；书记强调"归档前，要优先完成蒸馏！！"
- **关键动作**: ✅ 阶段1 蒸馏前置（8 条经验写入 insights：§8.6/§9.6-9.8/§10.15/§11.6-11.8；10 条日志蒸馏标签 [否]→[是]） ✅ 阶段2 日志归档（T22-T70 详细内容移至 archive/2026-07-early-entries.md，主日志保留一行表格摘要 39 条目） ✅ 阶段3 索引更新（EXECUTION_LOG_INDEX.md 新增归档文件章节；TIMESTAMPS.md 新增归档条目）
- **设计决策**: 蒸馏前置原则（归档前必须先完成蒸馏，避免有价值经验随归档丢失）；归档早期+摘要表方案（T22-T70 归档，T71-T86 保留压缩版）；摘要表 6 列结构（T编号/日期/标题/关键决策/衍生任务/蒸馏状态）
- **结果**: 主日志 1597→415 行（-74%，超额完成 40% 目标）；归档文件 816 行；摘要表 39 条目完整覆盖 T22-T70；T71-T86 保留设计决策编号+蒸馏标签；8 条经验蒸馏至 insights §8.6/§9.6-9.8/§10.15/§11.6-11.8（version 24.0→25.0）
- **蒸馏标签**: [经验蒸馏: 是 — 蒸馏前置原则本身作为经验已写入 insights §8.6 历史记录不可变原则]

### 修改文件清单
- .ctx/logs/archive/2026-07-early-entries.md（新建，816 行，归档 T22-T70）
- .ctx/logs/2026-07-EXECUTION_LOG.md（瘦身 1597→415 行）
- content/insights/党支部管理与实务经验沉淀.md（新增 8 条经验，version 24.0→25.0）
- .ctx/logs/EXECUTION_LOG_INDEX.md（新增归档文件章节）
- .ctx/TIMESTAMPS.md（新增 archive/2026-07-early-entries.md 条目）

---

## T88 governance/ 目录优化与合并（USAGE_POLICY 创建 + RECURRING_TASKS 合并 + 深度审视）（2026-07-12）

- **来源**: 书记指示"governance的优化和合并是否还有工作空间，请思考，并构思执行"；书记选定方向（多选）：合并 TERMINOLOGY+EMOJI_POLICY、合并 RECURRING_TASKS→OPERATIONS_GUIDE、深度审视所有文件
- **关键动作**: ✅ 合并1（TERMINOLOGY.md + EMOJI_POLICY.md → USAGE_POLICY.md，410 行，§一术语规范+§二 Emoji 规范+§三决策记录） ✅ 合并2（RECURRING_TASKS.md → OPERATIONS_GUIDE.md §15 周期性任务，删除原§五附录初始化清单，ASCII 架构图改为表格） ✅ 深度审视（OPERATIONS_GUIDE §2 术语规范改为索引引用 USAGE_POLICY §一；§3 文件角色分类改为索引引用 ROLE_CLASSIFICATION §一，消除内容重叠） ✅ 一改具改（8 个文件引用更新：ARCHITECTURE/CLAUDE/README/SECRETARY_PRONOUNCEMENTS/insights/KNOWN_PITFALLS/ROLE_CLASSIFICATION/SOP_WEB） ✅ 索引更新（README/DOC_MAP/SSOT_INDEX/TIMESTAMPS）
- **设计决策**: USAGE_POLICY.md 命名突出"使用规范"职能（合并后文件名让人一看就知道这个文件是做什么的）；§15 合并保留"经常性工作管理机制"定位，删除原§五附录初始化清单（属于初始化脚本而非治理规范）；§2/§3 改为索引引用而非重复定义（消除 OPERATIONS_GUIDE 与子文件的 内容重叠）
- **结果**: governance/ 10→8 文件；USAGE_POLICY.md 410 行；OPERATIONS_GUIDE.md 712→790 行；3 个原文件删除；全仓库无残留引用（合法保留位置：历史日志/spec/归档文件/合并来源标注/已迁移索引）；SOP_WEB.md L193 过时引用已修正为 USAGE_POLICY.md §1.4.3；YAML last_updated 全部 2026-07-12
- **蒸馏标签**: [经验蒸馏: — governance 合并方法论（"为合并找理由"+索引引用消除重叠）待 C-3 蒸馏]

### 修改文件清单
- content/governance/USAGE_POLICY.md（新建，410 行，合并自 TERMINOLOGY.md + EMOJI_POLICY.md）
- content/governance/OPERATIONS_GUIDE.md（新增 §15 + §2/§3 改索引引用，712→790 行，version 1.7→1.8）
- content/governance/TERMINOLOGY.md（删除）
- content/governance/EMOJI_POLICY.md（删除）
- content/governance/RECURRING_TASKS.md（删除）
- content/governance/README.md（文件清单 10→8）
- content/governance/DOC_MAP.md（L2 理念维度表+引用关系图+任务入口表更新）
- content/governance/SOP_WEB.md（L193 引用修正：TERMINOLOGY.md §5.3 → USAGE_POLICY.md §1.4.3）
- SSOT_INDEX.md（母本子本注册表+同步触发矩阵+已迁移文件索引新增 3 条）
- .ctx/TIMESTAMPS.md（3 文件标记🗑️已删除 + 新增 USAGE_POLICY.md 条目）
- ARCHITECTURE.md（目录树更新）
- CLAUDE.md（H2.2 母本子本表+H3 检查清单+H4.2+H5.1+H6 外部索引表更新）
- README.md（术语查阅入口更新）
- SECRETARY_PRONOUNCEMENTS.md（YAML related_files + 4 处元数据引用更新）
- content/insights/党支部管理与实务经验沉淀.md（§8.6 术语合规引用更新）
- content/governance/KNOWN_PITFALLS.md（§7 定期扫描任务引用更新）
- content/governance/ROLE_CLASSIFICATION.md（§9a/§九/§本节内容索引 3 处引用更新）

---

## T89 书记评议·三评（docs/ 代码文件评议）（2026-07-12）

- **来源**: 书记指示"请再次进行一次书记评议。我这次重点对象是【docs里面的文件——html、json、css等等，特别是mock数据是否合理的问题要仔细检查】"；书记选定范围"mock + JS 核心模块"
- **关键动作**: ✅ 抽样 13 条命题（mock/ 11 文件 + services/auth.js + services/roles.js + services/taskforce.js + modules/party.js + core/domain.js） ✅ 四维度预审（表述/内容/精神实质/实现方法） ✅ 13 条命题逐一 AskUserQuestion 询问书记 ✅ Task 1-7 即时小修订（B1 党课 organizer→p13 / B4 删除 c1 / B5 deputy-secretary 新角色 / D2 COMPLIANCE_FILES 真实路径 / D3 mockDB.users 扩展 7 角色 / E1 dissolved 状态 / E2 AUTHZ_CHAIN 注释） ✅ Task 8 机械性扫描 C2（publicity/inspector A类角色代号替换+B类UI组件保留，H5.6 抽样校验全部通过） ✅ Task 9 机械性扫描 C3（PARTICIPATION_RECORDS→INSPECTION_RECORDS+participation.js 删除） ✅ Task 10 设计性 B2（P.2 决策：全部改为独立，6 个 activityId→null+表单选择器移除+死代码移除） ✅ Task 11 设计性 D1（P.3 决策：系统内表单，TEMPLATE_LIST desc 更新） ✅ Task 12 project_memory 修正（合规文件 T1 vs 制度文件 T2 区分）
- **设计决策**: 书记补充原则"专班因不限时间不限地点，与活动互斥"——这不仅是 mock 数据修改，更是对 D-236 专班/活动并列关系的深化（互斥而非仅并列）；deputy-secretary 角色引入（全仓库只允许一位书记，p14 改为副书记）；活动复盘模板作为"系统内表单"（类似指差确认的标准化工作流）
- **结果**: 13 条命题全部决策完成；7 个即时小修订+2 个机械性扫描+2 个设计性问题+1 个修正+1 个不违规项；GetDiagnostics 零错误；全仓库 Grep 验证零残留（publicity/inspector A类清零、PARTICIPATION_RECORDS 零残留、activityId 非-null 零残留）；丙部 P.2/P.3 已完成决策并从丙部删除
- **蒸馏标签**: [经验蒸馏: — 书记评议工作流的完整执行经验（13 条命题×4 维度预审×逐一询问）待 C-3 蒸馏]

### 书记反馈摘要
- 命题 1 (B1): 改为 p13，全仓库只允许一位书记
- 命题 2 (B2): 全部改为独立，专班与活动互斥
- 命题 3 (B3): 不违规，行政工作是做事内容，过程中考察
- 命题 4 (B4): 删除 c1
- 命题 5 (B5): p14 改为副书记
- 命题 6 (C1): 不违规，合规文件 T1 vs 制度文件 T2 区分正确
- 命题 7 (C2): 替换术语，A类角色代号替换+B类保留
- 命题 8 (C3): 替换+删除
- 命题 9 (D1): 删除虚假模板，保留活动复盘模板
- 命题 10 (D2): 引用真实路径
- 命题 11 (D3): 扩展到 7 个角色
- 命题 12 (E1): 新增 dissolved 状态
- 命题 13 (E2): 保留现状，注释完善

### 反馈落实摘要
- **机械性问题**: C2 全仓库扫描 publicity/inspector 使用（100+ 匹配），分类 A类（角色代号违规 5 文件）+ B类（UI 组件/文件分类/子状态名保留），A类替换后 H5.6 抽样校验 5 项全部通过；C3 PARTICIPATION_RECORDS 全仓库替换+participation.js 删除，零残留
- **设计性问题**: B2 入丙部 P.2，书记选 A 全部改为独立，已执行（6 个 activityId→null+表单移除+死代码移除）；D1 入丙部 P.3，书记选 B 系统内表单，已执行（TEMPLATE_LIST desc 更新）
- **即时小修订**: B1/B4/B5/D2/D3/E1/E2 共 7 项当场修复
- **project_memory 修正**: C1 合规文件 vs 制度文件记录修正（T1/T2 区分）

### 衍生任务编号清单
- 无衍生任务（13 条命题全部决策完成，无新增乙部条目）
- 丙部 P.2/P.3 已完成决策并删除

### 修改文件清单
- docs/src/mock/activities.js（B1: act-6/act-13 organizer→p13）
- docs/src/mock/people.js（B5: p14 roles→deputy-secretary）
- docs/src/mock/party.js（B4: 删除 c1 / D2: COMPLIANCE_FILES 真实路径 / D1: TEMPLATE_LIST 仅保留活动复盘模板+desc 更新 / C2: btn-submit-to-prop-commissioner）
- docs/src/core/domain.js（D3: mockDB.users 扩展 8 个用户）
- docs/src/core/constants.js（B5: ROLE_LABELS 新增 deputy-secretary）
- docs/src/services/auth.js（B5: MODULE_ROLES+AUTHZ_CHAIN 新增 deputy-secretary / E2: AUTHZ_CHAIN 注释完善）
- docs/src/services/taskforce.js（E1: validTransitions 新增 dissolved）
- docs/src/services/roles.js（C2: filter keys publicity/inspector→prop-commissioner/disc-commissioner）
- docs/src/modules/party.js（C2: getActiveCommissioner+renderCommissionerPanel 角色映射+DOM ID）
- docs/party/index.html（C2: data-commissioner+panel ID+DOM ID 前缀全量替换）
- docs/src/entries/party-disc-entry.js（C2: inspector-*→disc-commissioner-*）
- docs/src/entries/party-prop-entry.js（C2: publicity-*→prop-commissioner-*）
- docs/src/mock/index.js（C3: 删除 participation.js 重导出）
- docs/src/entries/ws-organizer-entry.js（C3: import+使用处 PARTICIPATION_RECORDS→INSPECTION_RECORDS）
- docs/src/mock/participation.js（C3: 删除）
- docs/src/mock/taskforces.js（B2: 6 个 activityId→null）
- docs/src/entries/ws-prop-commissioner-entry.js（B2: 移除死代码块）
- docs/src/entries/ws-org-commissioner-entry.js（B2: 移除关联活动选择器+publishedActivities 声明+activityId 变量）
- CLAUDE.md（丙部 P.2/P.3 写入→决策完成→删除，更新决策摘要）
- c:\Users\储子禾\.trae-cn\memory\projects\-d-GitHub-GSM1921-SOP\project_memory.md（C1: 合规文件 vs 制度文件记录修正）

---

## T90 权限系统大改·评议启动（T-2026-07-006 第 1 轮）（2026-07-12）

**来源**：书记指示——"我们进行下一轮的书记评议。这一轮针对的就是T-2026-07-006这个任务。我们目前的docs文档中，对于权限，既有侧边栏的链接、又有上侧栏的标记、又有登录系统。非常复杂，也非常荣誉！这给我们的仓库使用带来了极大的困难！！请你花一点时间做一下评议。我自己对于整个系统的权限设计和 网站系统的交互功能的需求还要再做一次重新的从头到尾的思考！！"
**补充指示**："系统要面向【上线】来做部署了，有很多当时开发阶段的设计和规则可能需要进一步调整，其中最重要的就是这个角色体系的设计和任务流、信息流（包括但不限于赋权等的功能）的明晰，以及在更新后的系统中通过mock数据反复再迭代的过程。这是一项很大很大的任务，我预计要进行3轮以上。"
**Skill**：brainstorming（评议→设计）→ writing-plans（实施计划）
**关键动作**：
1. 探索权限系统全貌：读取 auth.js / sidebar.js / header.js / role-selector.js / permission-manager.js / login-entry.js / login.html / workspace/index.html / party/index.html / ROLE_CLASSIFICATION.md §九 / constants.js / domain.js
2. 整理现状+痛点清单（6 大问题）：
   - 权限三重表达（侧边栏+顶栏+登录页）机制重叠
   - stance/view/mode 三元组概念纠缠
   - AUTHZ_CHAIN（粗粒度）与 scope 字段（细粒度）双轨制
   - 角色清单三处不对齐（login.html 8 卡 / MODULE_ROLES.workspace 8 角色 / MODULE_ROLES.party 5 角色）
   - UI 中三处独立角色切换入口（party 内嵌 tab / sidebar 卡片 / role-selector 弹窗）
   - Mock 登录本质矛盾（假认证但交互像真登录）
3. 书记确认现状分析准确
4. 更新 CLAUDE.md 乙部 T-2026-07-006 状态：⏸️暂停 → 🔄进行中（第 1 轮评议·brainstorming）
5. 留记录：本条目
**设计决策**：无（评议进行中）
**结果**：权限系统大改评议正式启动，brainstorming 流程进行至"逐一提问"阶段
**蒸馏标签**：[经验蒸馏: —]
**状态**：✅ 评议完成，实施完成（第 1 轮）

---

### T90 补充：第 1 轮实施完成

**实施时间**：2026-07-12
**Spec 文档**：`docs/superpowers/specs/2026-07-12-permission-system-redesign-design.md`（approved）
**实施计划**：`docs/superpowers/plans/2026-07-12-permission-system-redesign.md`（17 Tasks）
**Skill**：subagent-driven-development（每 Task 派发独立 implementer + spec reviewer + code quality reviewer）

**新建文件**（4 个）：
- `docs/src/config/branch.json` — 支部配置（支委学号映射）
- `docs/src/mock/accounts.js` — Mock 登录账号（学号+密码→userId）
- `docs/members.html` — 人员管理页面（支委赋权组长）
- `docs/src/entries/members-entry.js` — 人员管理页面入口

**重写文件**（8 个）：
- `docs/src/services/auth.js` — 去掉 stance/view/mode，新增 ROLE_PERMISSIONS + PROJECT_PERMISSIONS + AUTHORIZE_CHAIN + 新 AuthStore API（getCurrentUser/devLogin/canDo/authorize/getPageForRole/getViewableRoles）
- `docs/src/services/permission-manager.js` — 改为从 auth.js re-export
- `docs/login.html` — 账号密码 Mock 校验表单 + 开发模式开关 + 7 张身份卡片
- `docs/src/entries/login-entry.js` — 账号密码登录 + 开发模式卡片点击
- `docs/src/components/sidebar.js` — 去掉身份卡片区块，模块切换改为自动跳转，新增人员管理入口
- `docs/src/components/header.js` — 去掉 mode 标签，改为身份标签 + 只读切换下拉（switchView/clearView）
- `docs/src/core/bootstrap.js` — 新签名 `{ module, accentRole, accentAlpha }` → 返回 `{ user, accent, accentRgba, accentBorder }`
- `docs/src/entries/workspace-entry.js` + `party-entry.js` — 简化为自动跳转

**修改文件**（5 个）：
- `docs/src/mock/people.js` — `roles: ['leader']` → `role: 'leader'`（单一值）
- `docs/src/components/inspector.js` — `getPrimaryRole() || getLoginStance()` → `getCurrentUser()?.role`
- `docs/src/entries/ws-disc-commissioner-entry.js` — 移除 ViewModeStore 引用 + 只读 banner + 事件监听器
- `docs/src/entries/ws-visitor-entry.js` — 移除 ViewModeStore 引用 + 只读 banner + 事件监听器
- `docs/src/entries/main-entry.js` — 根据用户角色动态更新 dashboard 链接

**删除文件**（3 个）：
- `docs/src/components/role-selector.js` — 与 sidebar 功能重叠
- `docs/workspace/index.html` — 中间层，被角色子页面直接跳转取代
- `docs/party/index.html` — 中间层，被角色子页面直接跳转取代

**浏览器验证结果**（9 步测试）：
1. ✅ 登录页正常显示（账号密码表单 + 开发模式开关）
2. ✅ 账号密码登录正常（2300010001/123456 → index.html）
3. ✅ 侧边栏"党建工作台"跳转正确（secretary → workspace/secretary.html）
4. ✅ 侧边栏"党务管理"跳转正确（secretary → party/secretary.html）
5. ✅ 侧边栏"人员管理"跳转正确（members.html，15 人 + 赋权按钮）
6. ✅ 视角切换正常（"党支部书记 · 查看 党小组组长"）
7. ⚠️ 退出登录未直接验证（browser_use 点击坐标限制；代码逻辑正确）
8. ⚠️ 开发模式卡片点击未直接验证（同上；代码逻辑正确）
9. ✅ participant 侧边栏验证通过（无党务管理/人员管理，5 个导航项正确）

**全局残留检查**：
- 旧 API（getLoginStance/setLoginStance/getPrimaryRole/setPrimaryRole/getActiveRole/setActiveRole）：仅在注释中出现，无实际调用
- ViewModeStore：仅在 auth.js 空壳兼容层中出现，无其他文件引用
- AUTHZ_CHAIN/LOGIN_STANCE_KEY/VIEW_MODE_KEY 等：仅注释中出现
- 已删除文件引用：零残留

**第 2 轮待办**（预计）：
- 项目角色赋权机制：从活动/专班数据的 assignments 字段读取项目角色（organizer/deep）
- Mock 数据迭代：配合实际使用场景调整 mock 数据
- 权限矩阵大改：ROLE_CLASSIFICATION.md §九 的权限矩阵需要根据新模型更新
- 全仓库术语对齐：确保文档中的角色术语与代码一致

**蒸馏标签**：[经验蒸馏: —]（待后续从日志提炼可复用模式）
**状态**：✅ 第 1 轮实施完成

---
