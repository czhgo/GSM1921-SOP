# Tasks

- [x] Task 0: Phase 0 前置正确性（与 IA 并行）
  - [x] SubTask 0.1 R4-D05 考察写门：创建/确认/删除 deny-by-default；本场组织者 / 支书 / 副支书 / 纪检按职责放行；服务端补写门
  - [x] SubTask 0.2 R4-D05 越权测试：普通成员改考察 403；组织者/纪检/支书按职责可写
  - [x] SubTask 0.3 R4-D02 活动创建事务：创建活动同时建工作组与组织者/深度参与者成员关系；mock 与 API 同源
  - [x] SubTask 0.4 R4-D02 测试：新建活动后本会话内详情/工作组/成员立即可见，不依赖刷新
  - [x] SubTask 0.5 R4-D03 状态反推：列出 UI 筛选 / 授权 / 写口实际使用的状态，定义 canonical 集合
  - [x] SubTask 0.6 R4-D03 收敛：旧 `draft/pending_review/completed` 映射或删除；mock 数据重写；枚举/文档/守卫同步
  - [x] SubTask 0.7 mock 多支部过滤：`list(params)` 按 `branchId` 过滤 users/activities/notices/attendances/todos/assignments
  - [x] SubTask 0.8 双支部 mock/api 对照测试 + 非空转
  - [x] SubTask 0.9 D04 另开 `migrate-inspection-workgroup-key` spec（只落盘，不实施）
  - [x] SubTask 0.10 不改表结构；宽表卡式化等 IA 裁定

- [x] Task 1: IA 全量矩阵
  - [x] SubTask 1.1 新增可复现脚本 `server/scripts/ia-inventory.mjs`：扫描 `capabilities/*-workspace.js` 与 `entries/tabs/**`，输出 tab / 卡片 / 链接 / 深链参数
  - [x] SubTask 1.2 生成 `.ctx/IA_INVENTORY.md`：7 台 × tab × 卡片 × 主行动 × 链接去向 × 角色可达性
  - [x] SubTask 1.3 统计 tab 数 / 卡片数 / 链接数 / 深链参数数，作为后续审计基数
  - [x] SubTask 1.4 非空转：矩阵不得漏台、漏 tab、漏链接；脚本可重跑且读数稳定

- [x] Task 2: 六路批判性审查（并行子代理）
  - [x] SubTask 2.1 Lens A「Tab 必要性」：一 tab 一问；合并 / 删除候选 + 深链兼容
  - [x] SubTask 2.2 Lens B「卡片必要性与阅读顺序」：决策/行动判据；主阅读线；同屏 ≤5 张
  - [x] SubTask 2.3 Lens C「入口/出口与链接真值」：角色 + 对象 + 步骤；材料闭环为锚点
  - [x] SubTask 2.4 Lens D「跨角色协作」：责任 / 确认 / 只读；交接点显式
  - [x] SubTask 2.5 Lens E「最小三成本」：信息 / 操作 / 学习成本逐 tab 量化
  - [x] SubTask 2.6 Lens F「数据与路由真值」：`?tab=` / `highlight` / `activityId` / `branchId` / `subview` 是否被消费
  - [x] SubTask 2.7 六路各自只加载一个 lens，不互读报告；输出统一 schema

- [x] Task 3: 链接真值与角色化落点
  - [x] SubTask 3.1 静态扫描所有 `?tab=` / `?highlight=` / `?activityId=` / `?branchId=` 链接，核对目标 page/tab 是否存在
  - [x] SubTask 3.2 核对目标页是否消费该参数（不消费即判红）
  - [x] SubTask 3.3 对材料闭环页逐角色核对：支书 / 组织 / 宣传 / 纪检 / 组长 / 成员各自本位落点
  - [x] SubTask 3.4 真机抽测高风险链接：组长从材料页点「考勤」→ 被弹回 `leader.html`，`tab`/对象丢失
  - [x] SubTask 3.5 产出 `.ctx/IA_LINK_TRUTH.md`：每枚链接的角色化落点与修正建议

- [x] Task 4: sample-diff-learning（人类抽审 5–10%）
  - [x] SubTask 4.1 按风险优先选 5 个样本：材料闭环链接、tab 合并候选、卡片顺序、跨角色交接、深链参数
  - [x] SubTask 4.2 逐个样本用 AskUserQuestion 呈现，收集 Keep / Revise / Reject 与理由
  - [x] SubTask 4.3 每个纠正抽取 `ai_assumption` / `human_intent` / `divergence_type` / `generalization` / `evidence`
  - [x] SubTask 4.4 Conflict Detector：与既有 H21 / 设计裁定冲突时先呈报，不静默存储
  - [x] SubTask 4.5 泛化为带 Boolean 条件的规则，落 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` 与 `CLAUDE.md` H21.3
  - [x] SubTask 4.6 规则压缩 ≤200 字 / 条；项目层持久化，不留在会话

- [x] Task 5: 合并报告与一次 frontier
  - [x] SubTask 5.1 新增 `.ctx/AUDIT_IA_CRITICAL.md`：六路结果 + 共识 / 分歧 / 待裁定 + 归属
  - [x] SubTask 5.2 每条结论必须有证据（文件:行号 / 真机读数 / 矩阵行）
  - [x] SubTask 5.3 只开一次 grill-me frontier：tab 合并/删除、卡片删减、链接落点、跨角色交接
  - [x] SubTask 5.4 未回答项保持「待裁定」，不写成默认值

- [x] Task 6: 修复 spec 与批次
  - [x] SubTask 6.1 基于裁定写 `.trae/specs/ia-critical-remediation/` 修复 spec / tasks / checklist
  - [x] SubTask 6.2 修复按「删/并 → 链接落点 → 卡片顺序 → 交接」排序
  - [x] SubTask 6.3 每条修复给「深链兼容 / 旧 id 是否保留 / 角色差异」说明
  - [x] SubTask 6.4 本批只出 spec，不直接重写 68 页签

- [x] Task 7: H21.3 常设化
  - [x] SubTask 7.1 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` 新增 §11「批判性 IA 审查」
  - [x] SubTask 7.2 `CLAUDE.md` 新增 H21.3 索引与三问
  - [x] SubTask 7.3 新增守卫 `server/test/ia-critical-guard.test.mjs`：两处存在 + 三问关键词 + 矩阵/报告存在
  - [x] SubTask 7.4 守卫登记 `test:daily`

- [x] Task 8: 验证与提交
  - [x] SubTask 8.1 矩阵 / 报告 / 链接真值 / H21.3 四件落盘
  - [x] SubTask 8.2 非空转：67 tab / 124 链接 / 5 样本达标
  - [x] SubTask 8.3 版本戳 bump；TIMESTAMPS / 执行日志更新
  - [x] SubTask 8.4 提交正文含 Why / What / Verification / Boundaries
  - [x] SubTask 8.5 临时脚本与证据按退出纪律处置

# Task Dependencies

- Task 0 与 Task 1–3 可并行；Task 2 / 3 的矩阵读数以 Task 0 修正后的数据为准
- Task 2 依赖 Task 1（矩阵）
- Task 3 依赖 Task 1
- Task 4 依赖 Task 2 + 3（先有候选样本）
- Task 5 依赖 Task 2 + 3 + 4
- Task 6 依赖 Task 5
- Task 7 可与 Task 2–5 并行（只写协议与守卫）
- Task 8 依赖全部
