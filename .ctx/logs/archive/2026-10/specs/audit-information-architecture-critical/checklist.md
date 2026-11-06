# Checklist

## 零、Phase 0 前置正确性

- [x] D05 考察创建/确认/删除均为 deny-by-default
- [x] 本场组织者 / 支书 / 副支书 / 纪检按职责可写
- [x] 普通成员改考察 403，有接口测试
- [x] D02 新建活动同时建工作组与组织者/深度参与者
- [x] 新建后本会话内详情/工作组/成员立即可见
- [x] D03 状态集合由 UI 流程反推，canonical 集合落盘
- [x] 旧 draft/pending_review/completed 已映射或删除；mock 已重写
- [x] mock 多支部过滤按 branchId 生效，双支部对照测试通过
- [x] D04 迁移 spec 已另开落盘（未实施）
- [x] 未改表结构；宽表卡式化未提前做

## 一、IA 矩阵

- [x] 7 台全部纳入，无漏台
- [x] 全部 tab 纳入，tab 数 67 ≥ 60
- [x] 每个 tab 的卡片顺序 / 主行动 / 链接去向齐备
- [x] 每枚链接标注 page / tab / 对象 id / 角色可达性
- [x] 矩阵可重跑，读数稳定（SHA256 两次一致）
- [x] 统计基数（67 tab / 100 卡片 / 124 链接 / 28 深链）落盘

## 二、Tab 必要性

- [x] 67 个 tab 逐条套用「一 tab 一问」
- [x] 合并候选给出「谁迁到哪 + 深链兼容 + 旧 id 处理」
- [x] 删除候选给出独有主行动 / 数据 / 角色缺失证据
- [x] 不以「看起来多」作为删除理由

## 三、卡片必要性与阅读顺序

- [x] 全量卡片入矩阵；12 个高信号 tab 深审通过
- [x] 其余 tab 按矩阵 + 三问初筛，未发现需单列的高信号
- [x] 每个深审 tab 只有一条主阅读线
- [x] 同屏卡片 >5 的 tab 有分组/下沉方案
- [x] 卡片关系是因果/上下游/汇总-明细，不是并列堆叠

## 四、链接真值

- [x] 目标 page 对该角色可达
- [x] 目标 tab 存在且是动作本位
- [x] 对象 id 携带且被目标页消费
- [x] 材料闭环逐角色落点核对
- [x] 至少 1 例角色无关错误落点被真机确认（组长点考勤 → 被弹回 `leader.html`）
- [x] `.ctx/IA_LINK_TRUTH.md` 落盘

## 五、跨角色协作

- [x] 12 条跨角色链路逐条核对责任 / 确认 / 只读
- [x] 交接点断裂已给显式修复建议
- [x] 同一对象多台状态口径不一致已列证据

## 六、最小三成本

- [x] 10 条主任务有信息 / 操作 / 学习成本读数
- [x] 合并/删除建议附前后成本对比（估，含假设）
- [x] 不只用主观「感觉」下结论

## 七、sample-diff-learning

- [x] 5 个高风险样本经人类抽审
- [x] 每个纠正抽取 ai_assumption / human_intent / divergence_type / generalization / evidence
- [x] Conflict Detector 已运行（与 D-755 / D-807④ / P2-7 等冲突已列入分歧）
- [x] Boolean 条件可验证（AP-IA-01..05）
- [x] 规则落 PARALLEL_SKILL_AUDIT.md §11.3 与 CLAUDE.md H21.3，不只在会话

## 八、报告与 frontier

- [x] `.ctx/AUDIT_IA_CRITICAL.md` 落盘
- [x] 六路独立，未互读
- [x] 每条有矩阵行或文件:行号证据
- [x] 共识 / 分歧 / 待裁定齐备
- [x] 只开一次 frontier（tab / 链接 / 交接 / 卡片）
- [x] 未回答项保持「待裁定」

## 九、H21.3 常设化

- [x] `PARALLEL_SKILL_AUDIT.md §11` 存在
- [x] `CLAUDE.md H21.3` 存在
- [x] 三问关键词齐备：tab 是否必须存在 / 卡片是否改变决策 / 链接是否指向正确落点
- [x] `ia-critical-guard` 通过并登记 `test:daily`

## 十、修复 spec 与批次

- [x] `.trae/specs/ia-critical-remediation/` spec/tasks/checklist 落盘
- [x] tab 合并 67→60 方案 + 旧 id 别名
- [x] 链接契约 `resolveMaterialHref` + `focusActivityId` + `[data-act-id]` + `highlightType`
- [x] 交接四项 D01/D06/D04/D08
- [x] 卡片六项 B02/B06/B07/B08/B10/B12
- [x] 本批只出修复 spec，未重写 68 页签

## 十一、验证与提交

- [x] 矩阵 / 报告 / 链接真值 / H21.3 四件落盘
- [x] 非空转下限达标（67 tab / 124 链接 / 5 样本）
- [x] Phase 0 四个新守卫通过（inspection-write-gate / activity-creation-transaction / state-enum-guard / mock-multi-branch）
- [x] 版本戳更新
- [x] TIMESTAMPS / 执行日志更新
- [x] commit 含 Why / What / Verification / Boundaries

## 十二、边界

- [x] Phase 0 仅改授权/写门/枚举，未改表结构
- [x] D04 迁移未实施，只落 spec
- [x] 宽表卡式化未提前做
- [x] A08 / B01/B03/B04/B05/B09/B11 / D02/D03/D05/D07/D09/D12 留后续
- [x] 未把「入口多」简单等同于「删入口」
