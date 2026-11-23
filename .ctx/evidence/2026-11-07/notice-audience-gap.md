# 通知受众：content 规定 ↔ 代码实现 gap 表（2026-11-07 批次 535）

> 用途：逐条对照「文档怎么写 / 代码怎么做 / 差距 / 处置」，不允许只写结论。
> 关联判例：`CASE-AI-007`（系统通知无受众被当广播）。

| # | 规定原文（content） | 实现行为（代码） | 差距 | 处置 |
|---|---|---|---|---|
| 1 | `INFORMATION_COMPUTATION.md §1.2`：支部广播＝无受众字段或 `audience` 含 `all` | 旧 `notice.js::canReadNotice` 第 950 行：`if (!_hasAudience(n) || _isBroadcastAudience(n)) return true` | 无受众 = 广播，定向通知匿名可读 | **本批修**：无受众系统通知不可读；广播必须显式 `all`；文档 §1.2 同步 |
| 2 | `INFORMATION_COMPUTATION.md §1.3` 无登录会话「可见（全放行）」 | 旧 `list()` 第 448–449 行：`if (!_hasAudience(n)) return true; if (!_role) return true;` | 未登录列表全放行，与详情口径不一致 | **本批修**：`list()` 无会话一律 false；文档矩阵改「不可见」 |
| 3 | `INFORMATION_COMPUTATION.md §1.4` 无登录会话「广播可读」 | 旧 `canReadNotice` 第 951 行：无会话才拦，广播已在上一步放行 | 匿名可读广播 | **本批修**：无会话一律不可读；显式广播匿名待 `PUBLIC_ENTRANCE.md` 裁定 |
| 4 | `DATA_MODEL.md §2.9`：受众三源「必填否、默认 []」 | `server/routes/system-notices.js::normalizeSystemNotice` 只校验 `targetType+targetId` | 受众可空且落库；无受众系统通知进入库 | **本批修**：文档改「系统通知至少一项必填」；写侧按 `audiencePolicy` 校验（422） |
| 5 | `DATA_MODEL.md §2.9` 无 `systemKind` 字段 | 落库只有 `kind='system'`，无法识别来源 kind | 存量迁移无法按 kind 补齐 | **本批修**：写侧落 `systemKind`；文档补字段 |
| 6 | `SYSTEM_ROLE_PERMISSION.md` 未写赋权通知受众 | 模板 `project-auth-granted` 不产 `audiencePersons` | 定向通知变成无受众 | **本批修**：模板与 build 写 `audiencePersons=[targetPersonId]`；文档补语义约定 |
| 7 | `SYSTEM_ROLE_PERMISSION.md` 未写授权人复算 | 旧 build 只补 `authorizerId`，`applyRosterNames` 仅在 `Name` 键已存在时覆写 | 直调 API 时授权人姓名缺失 | **本批修**：build 用 `personName(db, actor.id)` 显式复算；失败 500 不落库 |
| 8 | `INFORMATION_COMPUTATION.md §七` 列「无会话可见性」为未统一 | 旧代码列表 / 详情两套口径 | 列表能看到、详情打不开 | **本批修**：统一为不可见 / 不可读；§七 标「已统一」 |
| 9 | `INFORMATION_COMPUTATION.md §八` 待裁定「无会话 list 是否收窄」 | — | — | **本批裁定**：统一不可见；仅「显式广播是否匿名」留待 V-11 |
| 10 | `CASES.md` 无通知受众 fail-open 判例 | — | 经验未沉淀 | **本批补**：`CASE-AI-007` |
| 11 | 存量通知可能无受众 | 旧数据无 `audience` / `systemKind` | 收紧后突然不可读 | **本批补**：`server/scripts/migrate-notice-audience.mjs`（dry-run 默认，补不出标 `legacyUnscoped`） |
| 12 | 未登录看到具体支部名 | `login-entry.js` 读 `DEFAULT_BRANCH_ID` 的 `headerTitle || name` | 访客看到支部品牌 | **登记待裁**：`PUBLIC_ENTRANCE.md` ＋ CLAUDE 丙部 V-11；本批不改 |

## 读侧新口径（单一源）

- 无登录会话 → 一律不可读。
- 系统通知无受众 → 不可读（不得当广播）。
- 公告无受众 → 仍按支部广播（历史兼容）。
- 广播 → 必须显式 `audience:['all']`（登录成员可读）。
- `legacyUnscoped` → 仅发布者可读。

## 写侧新口径（单一源）

`server/system-notice-kinds.js::SYSTEM_NOTICE_AUDIENCE_POLICY`：

- `required`：`project-auth-granted`、`attendance-confirmed`、`activity-agenda-updated`、`workforce-proposal-created`、`activity-notice-draft`、`taskforce-notice-draft`；
- `broadcast`：`activity-created-broadcast`；
- `conditional`：其余。
