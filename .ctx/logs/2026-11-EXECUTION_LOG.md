---
title: "2026年11月执行日志"
type: execution_log
role: "[工程师]+[AI]"
last_updated: 2026-11-03
status: active
---

# 2026年11月执行日志

> **边界**（`CLAUDE.md H26.1` / `R-84`）：只留「为什么 / 拿不准 / 边界 / 读数」；过程流水归 `git`，本文件不复述 diff。

## 批次 529（2026-11-03）· `.ctx` 知识结构与 Active Context 梳理

### 一、盘点结论：`.ctx` 顶层 7 文件的类型 / 频率 / 权威

| 文件 | 知识类型 | 更新频率 | 权威性 | 处置 |
|---|---|---|---|---|
| `ACTIVE_RULINGS.md` | 规则索引（原为规则库） | 每条新裁定 | 投影（权威＝决策日志） | 重写为 ≤150 行索引；规则正文承接进 content |
| `SNAPSHOT.md` | 当前系统形态 | 每批 | 状态基线 | 删除批次小结，只留 §I–§VI |
| `ENGINEERING_ASSESSMENT.md` | 评分 + 证据 + 方法 | 评分批 | 评分权威 | 保留路径，标 `reference`；当前值投影进 ACTIVE_CONTEXT |
| `REVIEW_QUEUE.md` | 待评议项 + 方法索引 | 评议闭环 | 队列 | 删除已闭环；开放项投影 |
| `TIMESTAMPS.md` | 机器元数据 | 每次改文件 | 机检台账 | 保持 reference |
| `logs/` | 过程 / 裁定 / 审计原文 | 追加 | 权威源（裁定） | provenance，按需读 |
| `evidence/` | 原始证据 | 追加 | 证据 | provenance，按需读 |

### 二、ACTIVE_RULINGS 16 章分类（逐节）

> 分类口径：`已覆盖`＝content 已有同一规则；`需补`＝有复用价值但 content 缺；`仅沿革`＝已被取代 / 一次性 / 死场景。逐条明细见四路探查报告（本批 AI 会话记录）；本节只留落点与需补清单。

| 节 | 条数 | content 落点 | 需补（摘要） | 仅沿革 |
|---|---:|---|---|---|
| 一、角色与分工 | 21 | 02 `SYSTEM_ROLE_PERMISSION` / `COMMISSIONER_DUTY_FRAMEWORK` / SOP 定责 | 工作地图 14 模块与缺省主责；组织型主体；制度起草主语＝支委会；换届/党委；信息平台＝本系统；民主评议缺省主责；考察上传位；专班审查；不留真实人名 | mock 人名例外、7 天已删 |
| 二、写入、赋权与通知 | 9 | 02 SRP §9h/§9i、03 ARCHITECTURE §十一 | 全部已覆盖 | — |
| 三、会议与考勤 | 9 | 02 SOP、03 ARCHITECTURE | 考察由组织者上传、本人工作记录不另立 | — |
| 四、补课 | 6 | 02 SOP、policy-defaults | 全部已覆盖 | — |
| 五、思想汇报与考察 | 15 | 02 SOP、04 DATA_MODEL | 活动参与汇总以人为第一列；出勤率不设阈值（只提示支委会＋本人） | — |
| 六、意见反馈 | 7 | 02 SRP §9j、04 DATA_MODEL | 意见与纪检解绑、支书可指派；反馈时间随事项领域（replyHint）；领域只给归口建议不自动派单 | — |
| 七、品牌 | 2 | 02 SOP、04 DATA_MODEL | 全部已覆盖 | — |
| 八、制度制定 | 4 | 02 SOP、04 DATA_MODEL | 制度报送开关（不勾＝通过即现行版，勾＝待党员大会表决） | — |
| 九、活动、经费与外出 | 11 | 02 SOP、03/04 | 活动物理删除连带清理；活动批准门三态 / 待批可见性 / API 门 / 线上表决 | — |
| 十、归档、统计与通知 | 14 | 02 SOP、SRP §9l | 考勤统计交支委会；上传位按会议类型；考勤浮窗默认报名者；出勤率只支委＋本人；专班巡查随任务产生 | — |
| 十一、术语与平台 | 2 | 03 TERMINOLOGY | 智慧党建平台全称；支部党员大会全称首现 | — |
| 十二、死场景与系统形态 | 38 | 03 ARCHITECTURE、04 DS_03/DS_06、05 FILE_OPERATION_RULES | 禁静默回退 mock（与 DEPLOYMENT_GUIDE 冲突）；独立页 hydrate；JS 渲染路径 `./`；三/四域服务端化「清缓存还在」；跨端变更探测；区块顺序服从组织层级；读写分侧；分域以母本为准；IAAA 四口径 | 四个已清场景；文档合并动作；D-655 重建库；旧 .card 计数 |
| 十三、闭环与确认 | 3 | 02 SOP 纪检指南 | 记录人必呈现于总表与导出 | — |
| 十四、工作流块配置面 | 2 | 04 WORKFLOW_BLOCK_CONTRACT §8 | WBC 权威定位澄清（evolution 例外） | — |
| 十五、工作跟着岗位走 | 1 | 02 SRP §9c | 项目角色不落 `users.role`、写门拒收、多岗取并集 | — |
| 十六、界面规范 | 12 | 04 DS_03 | 活动风采置顶 galleryPinned；操作可见性守卫状态更新 | 8 族旧映射；D-740 特批 |

### 三、本批"需补"总表（按承接文件）

- `content/02_institution/SYSTEM_ROLE_PERMISSION.md`：组织型主体；活动批准门/待批可见性/API 门/线上表决；考勤上传位按会议类型；出勤率只提示；意见—纪检解绑；事项领域不自动派单；记录人必呈现；项目角色不落 `users.role`。
- `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md`：考察由组织者上传/本人记录不另立；专班需求审查；复盘主体与支委会追加。
- `content/04_web_design/data/DATA_MODEL.md`：工作地图 14 模块与缺省主责；民主评议；换届/党委；信息平台；制度报送开关；活动参与汇总人第一列；反馈时间 replyHint；活动物理删除连带；服务化「清缓存还在」；考勤默认报名者。
- `content/04_web_design/design-system/DS_03_COMPONENTS.md`：活动风采置顶；操作可见性守卫状态。
- `content/04_web_design/design-system/DS_06_LAYOUT_AND_DENSITY.md`：区块顺序服从组织层级；读侧首屏/写侧折叠；分域以母本为准。
- `content/03_doc_system/ARCHITECTURE.md`：独立页 hydrate；JS 渲染路径 `./`。
- `content/03_doc_system/TERMINOLOGY.md`：智慧党建平台全称；支部党员大会全称。
- `content/03_doc_system/OPERATIONS_GUIDE.md`：不留真实人名。
- `content/05_ai_coding/FILE_OPERATION_RULES.md`：JS 渲染路径 `./`（与 ARCHITECTURE 同源）。
- `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md`：改准「不可达静默回退 mock」（与 D-633 冲突）。

### 四、边界与未决

- **未逐条改写 156 条规则正文**：只做「分类 + 承接 + 索引」；规则逐字措辞保持原文，迁入 content 时只做压缩与去重。
- **专班发起/放行**：`D-442` 与组织委员指南「专班不必先经统一表决」冲突，本批不替支书择边；登记为待人工复核（见 REVIEW_QUEUE / ACTIVE_CONTEXT 风险）。
- **WBC 权威定位**：`WORKFLOW_BLOCK_CONTRACT` 自述「唯一权威」，与 `04_web_design/AGENTS.md`「evolution 不承担现行权威」相抵；本批只在 `ARCHITECTURE` 注明 evolution 例外，不改契约正文。
- **不移动** `ENGINEERING_ASSESSMENT.md` / `ACTIVE_RULINGS.md` 路径（分别约 117 / 44 处引用）。

### 五、读数（2026-11-03）

| 文件 | 行数 | 体积 | 预算 |
|---|---:|---:|---|
| `.ctx/ACTIVE_CONTEXT.md` | 88 | 8.7KB | ≤300 行 / 30KB ✅ |
| `.ctx/ACTIVE_RULINGS.md` | 56 | 6.7KB | ≤150 行 ✅ |
| `.ctx/SNAPSHOT.md` | 177 | 28KB | ≤250 行 ✅ |

- 定向守卫：`ctx-hygiene-guard` / `docs-governance-guard` / `doc-consistency` / `doc-line-ref` / `test-tier-guard` **65 / 65 pass**。
- `ACTIVE_CONTEXT` 保鲜：`latest_decision=D-852` ≡ 当月决策日志末条 `D-852`。
- 新会话模拟：只读 `CLAUDE.md` + `ACTIVE_CONTEXT`，可回答「26 页 / 7 工作台 / 47 表；六维 79/66/68/83/76/73；最高风险＝多支部读隔离；下一批 3 件＝Linux 部署验证 / 多支部 Phase 1 / issue-unread；最新 D-852；冲突以当月决策日志为准」。
- 全量 daily：**1765 / 1765**（341s），0 fail。
