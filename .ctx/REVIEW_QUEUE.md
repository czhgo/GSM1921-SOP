# 书记评议队列

> **使用方式**：AI 抽样命题后写入本文件 → 书记填写反馈 → AI 按反馈分流归档 → 清空本文件
> **生命周期**：评议完成后即清空（H5.3），评议记录归档至月度执行日志 T 编号

---

## 当前轮次：T109/T110 未覆盖遗漏审查（2026-07-18）

**审查依据**：spec 2026-07-18-sidebar-restore-and-emoji-cleanup-design.md §4
**审查范围**：T109（代码硬伤）/T110（organizer 可达性）未覆盖的 4 个维度

---

## 维度 1：术语合规

### 1.1 活动建设/组织建设残留
- **命中数**：0
- **状态**：✅ 零残留

### 1.2 之上/之下
- **命中数**：0
- **状态**：✅ 零残留

### 1.3 "说人话"
- **命中数**：0
- **状态**：✅ 零残留

### 1.4 "双域"等 T3 自造标签
- **命中数**：0
- **状态**：✅ 零残留

### 1.5 "X 而非 Y" 对立表达
- **命中数**：2
- **示例**：
  1. `docs/src/services/runtime.js:20` — "确保提前失败而非静默错误"（技术语境，合理）
  2. `docs/src/entries/workspace-entry.js:39` — "使用 getEffectiveRole 而非 user.role"（技术语境，合理）
- **AI 判断**：两处均为技术语境中的对比说明，非哲学对立表达，**不属于违规**
- **状态**：✅ 合理使用
- **需书记确认**：是否认可此判断？

### 1.6 "所以/因此" 因果链 / 反面假设 / 私加强调 / 元叙事标签
- **命中数**：全部 0
- **状态**：✅ 零残留

---

## 维度 2：UI 一致性

### 2.1 "壳大字小"（CTA 按钮 text-xs + py-2 组合）⚠️ 机械性问题
- **命中数**：6 处 CTA 按钮（违反 user_profile "dislikes 壳大字小" + project_memory "CTA 按钮 text-sm px-4 py-2"）
- **清单**：

| # | 文件 | 行 | 当前 class | 应改为 |
|---|------|----|-----------|--------|
| 1 | `ws-organizer-entry.js` | 160 | `px-4 py-2 text-xs font-medium rounded-lg text-white` | `px-4 py-2 text-sm font-medium rounded-lg text-white` |
| 2 | `ws-organizer-entry.js` | 234 | `px-4 py-2 text-xs font-medium rounded-lg text-white` | `px-4 py-2 text-sm font-medium rounded-lg text-white` |
| 3 | `ws-organizer-entry.js` | 892 | `px-4 py-2 text-xs font-medium rounded-lg text-white` | `px-4 py-2 text-sm font-medium rounded-lg text-white` |
| 4 | `ws-organizer-entry.js` | 1347 | `px-4 py-2 text-xs font-medium rounded-lg text-white` | `px-4 py-2 text-sm font-medium rounded-lg text-white` |
| 5 | `ws-org-commissioner-entry.js` | 227 | `text-xs px-4 py-2 rounded-lg` | `text-sm px-4 py-2 rounded-lg` |
| 6 | `ws-leader-entry.js` | 249 | `px-4 py-2 text-xs font-medium rounded-lg` | `px-4 py-2 text-sm font-medium rounded-lg` |

- **处理建议**：机械性修复（全仓库扫描 `text-xs.*px-4.*py-2` CTA 按钮模式 → 统一改为 `text-sm`）
- **需书记确认**：是否批准批量修复？

### 2.2 嵌套 card border-l-4 边线模式
- **命中数**：0（T110 已修复 30+ 处）
- **状态**：✅ 零残留

### 2.3 党建红颜色
- **命中数**：保留不变（user_profile "党建红 must remain unchanged"）
- **状态**：✅ 符合约束

---

## 维度 3：母本子本一致性

### 3.1 ROLE_PAGE_MAP 引用一致性
- **命中数**：5 处引用（auth.js 4 处定义/使用 + sidebar.js 1 处注释）
- **状态**：✅ 一致

### 3.2 AuthStore 3 API 引用一致性
- **命中数**：7 处引用（auth.js 5 处定义 + workspace-popover.js 1 处 + sidebar.js 1 处）
- **状态**：✅ 一致

### 3.3 ⚠️ T110 新增 API 未在 SSOT_INDEX 注册（设计性问题）
- **问题**：T110 新增的 3 个 API（`getUserProjectRoles` / `hasProjectRole` / `getAccessibleWorkspacePages`）未在 `SSOT_INDEX.md` 中注册母本子本关系
- **影响**：SSOT_INDEX 是母本子本注册表，遗漏会导致后续维护时无法追溯 API 的权威源
- **处理建议**：入丙部 P 编号，由书记决定是否需要在 SSOT_INDEX 中注册这 3 个 API
- **需书记决策**：
  - 方向 A：在 SSOT_INDEX.md 中注册（推荐，保持注册表完整）
  - 方向 B：不注册（理由：API 属于代码层内部实现，非制度性变更）

---

## 维度 4：装饰性 Unicode 符号

### 4.1 ★ ☆ 数学符号
- **命中数**：0（Task 6 已清理 inspector.js L273）
- **状态**：✅ 零残留

### 4.2 ▼ ▶ ▲ 几何符号
- **命中数**：0
- **状态**：✅ 零残留

### 4.3 ● ○ ◆ ◇ ■ □ 等其他装饰符号
- **命中数**：0
- **状态**：✅ 零残留

---

## 审查总结

| 维度 | 机械性问题 | 设计性问题 | 即时小修订 | 零残留 |
|------|-----------|-----------|-----------|--------|
| 1 术语合规 | 0 | 0 | 0 | ✅（2 处"而非"为合理技术语境） |
| 2 UI 一致性 | 6（壳大字小） | 0 | 0 | ⚠️ |
| 3 母本子本 | 0 | 1（SSOT_INDEX 注册） | 0 | ✅ |
| 4 装饰符号 | 0 | 0 | 0 | ✅ |
| **合计** | **6** | **1** | **0** | — |

### 待书记决策项

1. **维度 1.5 "而非"判断**：2 处技术语境"而非"是否认可为合理使用？
2. **维度 2.1 壳大字小修复**：是否批准批量修复 6 处 CTA 按钮（text-xs → text-sm）？
3. **维度 3.3 SSOT_INDEX 注册**：T110 新增 3 API 是否需要在 SSOT_INDEX.md 注册？

---

## 书记反馈区

（请书记在下方填写反馈）

### 反馈 1：维度 1.5 "而非"判断
- [ ] 认可合理使用
- [ ] 需要改写
- 书记意见：

### 反馈 2：维度 2.1 壳大字小修复
- [ ] 批准批量修复
- [ ] 暂不修复
- 书记意见：

### 反馈 3：维度 3.3 SSOT_INDEX 注册
- [ ] 方向 A：在 SSOT_INDEX.md 注册
- [ ] 方向 B：不注册
- 书记意见：
