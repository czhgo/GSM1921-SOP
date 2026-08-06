# 书记评议队列

> **使用方式**：AI 抽样命题后写入本文件 → 书记填写反馈 → AI 按反馈分流归档 → 清空本文件
> **生命周期**：评议完成后即清空（H5.3），评议记录归档至月度执行日志 T 编号

---

## 当前轮次：T-117 理论复用评议·第4轮——跨目录复用断链检查（2026-08-06）

> 沿用 H5.8.2 四类问题维度（A 断裂链接 / B 已删引用 / C 拓扑错误 / D 表述）。

### 预审报告（AI 产出，等待书记裁决）

**范围**：content/ 全部 5 子目录 + insights/ 的 25 个 .md（168 处链接逐条验证）+ docs/ 14 个 HTML（script src 31 处 + href 42 处）+ docs/src/ import 路径 + server/（db.js 资源表 / routes / seed）+ 权威基线 .ctx/SNAPSHOT.md 双向核对。

**汇总**：A 断裂链接 0 条 ｜ B 已删引用 12 条 ｜ C 拓扑错误 12 条 ｜ D 表述存疑 3 条

### A 断裂链接：0 条（全部 168 处链接目标均存在）

### B 已删引用（12 条）——核心为「数据交接」功能整体移除后的残留（T-224 §6 废除数据交接，由产出物定向路由替代）

| # | 位置 | 引用已删对象 | 建议 |
|---|------|------------|------|
| B1 | SERVICE_CATALOG.md L35 | `services/handover.js`（文件已删）交接管理服务行 | 删除该行 |
| B2 | SERVICE_CATALOG.md L63 | 权限矩阵「交接管理」行（服务不存在） | 删除该行 |
| B3 | CHECKLIST.md §10 L261-277 | 交接数据整节（`SEED_HANDOVERS`/`mockDB.handovers`/`handover.js`/disc.html 交接汇总） | 删除整节 |
| B4 | DATA_ARCHITECTURE.md L36 | §1.2「交接记录」行（`mockDB.handovers`） | 删除该行 |
| B5 | DATA_ARCHITECTURE.md L63 | §1.3 数据流图「交接 Handover」支线（组织者发起、纪检确认） | 删除该支线 |
| B6 | DATA_ARCHITECTURE.md §2.7 L365-377 | 交接数据 (HandoverRecord) 整节数据模型 | 删除整节 |
| B7 | DATA_ARCHITECTURE.md L681 | 「数据交接｜组织者工作台」联动行 | 删除该行 |
| B8 | DATA_ARCHITECTURE.md L948 | mockDB 字段表 `handovers` 行 | 删除该行 |
| B9 | DATA_ARCHITECTURE.md L1066 | §4.4.4 DataAdapter 接口表 handovers 行 | 删除该行 |
| B10 | DATA_ARCHITECTURE.md L1094 | §4.4.5 API 路由表 `/api/v1/handovers` | 删除该行 |
| B11 | ARCHITECTURE.md L261 | mockDB 结构行中的 `handovers` 字段 | 删除该字段 |
| B12 | CHECKLIST.md L226 | `workspace/org-commissioner.html`（已删除，现为 `org.html`） | 修正路径 |

> 注：制度层「交接」概念（P-010 组织者退出交接、FLAT_DESIGN、COMMISSIONER_FRAMEWORK §E.2 将修订）为**真实制度**，不在清理范围；仅清理代码层 mockDB.handovers / handover.js / 交接卡片 / API 端点的残留引用。

### C 拓扑错误（12 条）

| # | 位置 | 声称 | 实际 |
|---|------|------|------|
| C1 | SNAPSHOT.md L48 | services 服务层 20 个 | 19 个（handover.js 已删） |
| C2 | SNAPSHOT.md L55 | db.js 11 JSON 资源表 + sessions/attachments | 14 张资源表（T-218 新增 4 张 niche 表） |
| C3 | README.md L146 | docs/src/services 20 个 | 19 个 |
| C4 | ARCHITECTURE.md L155 | 服务层 20 个 | 19 个 |
| C5 | ARCHITECTURE.md L162 | 根目录存在 `.markdownlintignore` | 不存在（仅 `.markdownlint.json`） |
| C6 | TIMESTAMPS.md L243 | handover.js 登记为活跃服务 | 文件已删，未标删除（对照 members.html 有删除标注） |
| C7 | DATA_ARCHITECTURE.md L1095 | `/api/v1/makeup-tasks` | 实际 `/api/v1/makeupTasks`（驼峰） |
| C8 | DATA_ARCHITECTURE.md L1097 | `/api/v1/authorizations` 端点 | server 无此路由、api-adapter 无此方法（赋权仅存前端 localStorage） |
| C9 | DATA_ARCHITECTURE.md L1099 | `/api/v1/files` | 实际 `/api/v1/fileSpaceRecords` |
| C10 | DATA_ARCHITECTURE.md L1100 | `/api/v1/images` | 实际 `/api/v1/imageRecords` |
| C11 | DATA_ARCHITECTURE.md L1101 | `/api/v1/experiences` | 实际 `/api/v1/experienceDeposits` |
| C12 | DATA_ARCHITECTURE.md L1102 | `/api/v1/compliance-refs` | 实际 `/api/v1/complianceReferences` |

### D 表述存疑（3 条，请书记判定）

| # | 位置 | 文档声称 | 文件实际 |
|---|------|---------|---------|
| D1 | CHECKLIST.md L114 | 考勤 `ATTENDANCE_RECORDS` 60 条 att1~att60 | 43 条 att1~att43（ID 重排为连续序列） |
| D2 | CHECKLIST.md L164 | 通知 `MOCK_NOTICES` 13 条 | 12 条（缺 notice-109） |
| D3 | SCHOOL_IT_DEPLOYMENT.md L115 | api-adapter "28 个端点" | 注释路由表 24 条（含未注释的 bootstrap/snapshot/uploads×2/health 可达 28，口径存疑） |

### 附加观察（不归类）

- `docs/src/entries/workspace-entry.js` 为孤儿文件（无任何 HTML script src 引用、无 import 引用，T-141 角色单页制合并后遗留）
- CLAUDE.md 乙部 T-142 描述引用的 `docs/superpowers/plans/2026-08-02-后端基建-P1.md` 不存在（历史任务描述文本，非可点击链接）

### 书记反馈区（待书记填写）

> A/B/C 类是否授权机械性批量修？D 类 3 条如何判定？附加观察是否纳入处置？

---
