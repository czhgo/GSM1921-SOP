# 权限功能合一收敛设计（ROLE_SSOT）

> **权威源**：本文档为「角色权限四处分散声明 → 单一事实源」的收敛设计（书记 2026-08-29 全收敛裁定 + 2026-08-29 实施）。
> 角色权限矩阵的**业务权威源**见 [ROLE_CLASSIFICATION.md](../../02_institution/ROLE_CLASSIFICATION.md) §9a0 角色键全表与 §9b/9c 权限矩阵。

## 1. 背景：四处分散声明

角色权限在代码层散落四处，键集与语义各自为政：

| 声明 | 位置 | 现状（收敛前） |
|------|------|----------------|
| 能力注册表 requiredRoles | `core/registry.js` + `modules/capabilities/*.js` | 全仓无任何非空值（死代码）；书记工作台无能力注册 |
| sidebar/导航可见性 | `components/sidebar.js` | 读 `auth.js` ROLE_PAGE_MAP，不读能力清单 |
| auth 角色判定 | `services/auth.js` | 无单一 ROLES 常量，4 表 1 集合散落 |
| constants 角色色彩 | `core/constants.js` | 4 张表键集不一致，色值冲突 |

## 2. 差异清单（收敛前审计结论）

1. **COMMISSIONER_ROLES 双定义语义冲突**：auth.js:114-116（含书记/副书记，授权语义）vs constants.js:194-196（不含，条条委员语义）→ `inspector.js` 与 `assign-tab.js` 消费结果不同。
2. **workflow requiredRoles 游离硬编码**：`workflow/definitions.js:83,137` 硬编码 `['organizer','leader','secretary','disc-commissioner','prop-commissioner']`，缺 org/deputy/participant/deep，且与能力 requiredRoles 同名易误读。
3. **能力注册表不对称**：书记工作台无 `secretary-workspace` 能力（tab 硬编码入口）；5 个 workspace 能力未声明 requiredRoles；全部 `getCapabilities` 调用未传 role（死代码）。
4. **语义色 vs 强调色值不一致**：organizer（#0369A1 vs #7DD3FC）、deep（#7C3AED vs #94a3b8），注释自称同源但值不同。
5. **ROLE_LABELS 缺 initiator**（ROLE_COLORS 有键，标签表无对应）。
6. **ROLE_THEME_CLASS 仅 5 键**（缺三委员/participant/deputy-secretary）。
7. **ACCENT_PALETTE（10 键）vs ACCENT_COLORS（12 键）键集不一致**（palette 多 purple、少 deputy-secretary/commissioner）。
8. **visitor 键歧义**：`participant → visitor.html` 但 tab/待办聚合键用 `'visitor'`，易与「访客（未登录）」混淆。
9. **遗留键污染**：`commissioner`（条条委员）在 auth 体系已不存在；`initiator` 无标签；`all` 为兜底。
10. **无代码层单一角色枚举**：auth 4 表 1 集合 + constants 4 表，角色集合靠人工维护。

## 3. 收敛目标：单一事实源 → 派生

```
┌─────────────────────────────┐
│  单一事实源（ROLE_KEYS 枚举）    │  core/constants.js ROLE_KEYS
│  + ROLE_CLASSIFICATION §9a0    │  内容层角色键全表
└─────────────┬───────────────┘
              │ 派生（键集强制一致）
   ┌──────────┼──────────┬──────────────┐
   ▼          ▼          ▼              ▼
能力 requiredRoles  sidebar 可见性   auth 角色判定   constants 角色色彩
(6 workspace)   (ROLE_PAGE_MAP)  (ROLE_PERMISSIONS)  (LABELS/COLORS/ACCENT)
```

原则：
- **角色键集合只定义一处**（ROLE_KEYS），各表键集与其对齐（新增角色必须同步两处：constants + 内容层 §9a0）。
- **语义区分显式化**：同名概念（COMMISSIONER_ROLES）若语义不同必须注释声明、不得静默复用。
- **能力 requiredRoles 从死代码转为活性声明**：与 ROLE_PAGE_MAP 一一对应，作为「该能力属哪些角色」的权威声明。

## 4. 迁移路径

### 4.1 已实施（2026-08-29 Q3，浏览器验证通过）

| 步骤 | 内容 | 状态 |
|------|------|------|
| S1 | constants.js 新增 `ROLE_KEYS`（9 业务键）+ `ROLE_LEGACY_KEYS`（3 遗留键） | ✅ |
| S2 | 6 个工作台能力声明 `requiredRoles`（visitor/leader/org/prop/disc + 新建 `secretary-workspace`） | ✅ |
| S3 | 书记入口 tab 清单从硬编码改为经能力注册表读取（renderCtx 模式，与组长入口同构） | ✅ |
| S4 | COMMISSIONER_ROLES 双定义语义注释区分（constants 条条委员 / auth 授权链），代码不改行为 | ✅ |
| S5 | ROLE_CLASSIFICATION.md §9a0 角色键全表入库（12 键 + 访客不属于角色 + 语义约定） | ✅ |

### 4.2 后续步骤（书记 2026-08-30 裁定：实施无行为变更项 S6/S7/S8/S10；S9 文档登记映射不改代码）

| 步骤 | 内容 | 状态 |
|------|------|------|
| S6 | 色值统一：organizer/deep 的语义色与强调色同源（消除差异 4）——deep 强调色 #94a3b8 → #A78BFA（violet-400，与语义色 #7C3AED 同色系）；organizer 亮天蓝与语义色 sky-700 同源关系显式注释 | ✅（2026-08-30） |
| S7 | ROLE_LABELS 补 `initiator`；ROLE_THEME_CLASS 补全三委员/participant/deputy-secretary（deputy 同书记红） | ✅（2026-08-30） |
| S8 | ACCENT_PALETTE 与 ACCENT_COLORS 键集对齐：色板键集 ⊆ ACCENT_COLORS 显式注释；purple 标记为色板专用别名键（非角色键）；deep 色板标签 灰→雾紫 | ✅（2026-08-30） |
| S9 | `visitor` 待办聚合键去歧义 → 按书记裁定**文档登记映射，不改代码**：todo.js 派生处注释 + 本文档登记 participant↔visitor 映射 | ✅ 文档登记（2026-08-30，行为零变更） |
| S10 | workflow/definitions.js requiredRoles 从 ROLE_KEYS 校验：引入 WORKFLOW_ROLES 白名单 + 运行时键集校验 + 业务依据注释（组织委员不参与活动筹备的业务说明） | ✅（2026-08-30） |

## 5. 验收标准（全部达成，2026-08-30）

- [x] 全仓能力 requiredRoles 无死代码（6 工作台全覆盖）
- [x] 书记/副书记共用书记工作台（secretary-workspace requiredRoles）
- [x] 角色键全表内容层 + 代码层双源对齐
- [x] COMMISSIONER_ROLES 语义区分文档化
- [x] 色值/标签键集完全对齐（S6-S8）
- [x] workflow requiredRoles 与 ROLE_KEYS 单一事实源校验（S10）
- [x] visitor 待办聚合键歧义已文档登记（S9，行为零变更）
