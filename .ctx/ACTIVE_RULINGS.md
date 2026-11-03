---
title: "现行有效裁定索引"
type: rulings_index
role: "[工程师]+[AI]"
layer: reference
last_updated: "2026-11-03"
status: active
---

# 现行有效裁定索引

> **本文件只答「现在到哪找怎么判」**，不复制规则正文。**只收「现行有效」的索引**；权威源＝当月 `DECISION_LOG`；规则正文＝`content/01–05`；当前投影＝`.ctx/ACTIVE_CONTEXT.md`。
> **三条防漂移判据**：① 每行必带 `D-xxx`；② 不得出现决策日志里没有的口径；③ 改裁时先改 content，再改本索引，最后在决策日志追加新 `D-xxx`。
> **不收**：逐批增量句、已废止裁定、过程流水（git 已记）。

## §A 跨域现行裁定（不能归入单一 content 文件的）

- **写权限唯一机读源＝`server/security/write-policy-matrix.mjs`**；新增 `POST/PATCH/DELETE` 路由未登记即红；审计 C1 查矩阵 + 高风险抽样。（`D-847`）
- **会话 3 小时过期**（`SESSION_TTL_HOURS`，旧 `SESSION_TTL_DAYS` 兼容换算）；过期 token 在 `/auth/me` 与受保护写口 401 并删会话行。（`D-848`）
- **两档运行形态**：review（视觉检验，`npm run start:review` 使用 `server/data.review.db`）/ production（缺口令拒绝、拒绝库降级、多支部拒绝启动、默认不播种）。（`D-848`）
- **多支部同实例只到设计稿**：Phase 1–2（读口统一过滤 / 快照按支部）完成前不得打开 `ALLOW_MULTI_BRANCH`；上线坚持一实例一支部。（`D-849`）
- **规则 / 判例 / 方法先进 content，再进 .ctx 索引**；`.ctx` 不再承担规则正文；`.ctx/ACTIVE_CONTEXT.md` 是唯一热投影（≤300 行 / ≤30KB）。（本批 `D-852`）
- **阻断风险 1–5**：多支部读隔离、通用写口残留、表决名单重算、共享口令、SQLite 宽表；逐条证据见 `.ctx/ENGINEERING_ASSESSMENT.md §一`。（`D-851` 复核）
- **六维评分口径**：只按证据加减分，不因「做了工具」自动加分；当前 79 / 66 / 68 / 83 / 76 / 73。（`D-851`）
- **审计五维口径**：F2 控件行数 ≤2、F4 H2 恰 1、F7 `hasPager()`、C1 矩阵判定、M1–M3 信息经济；唯一表见 `content/05_ai_coding/AUDIT_CANON.md`。（`D-842` / `D-843`）
- **骨架 / 数据契约**：47 表单一源 `server/data/domain-contract.mjs`；`required` 只放两形态都成立的字段；换轨前必须跑 `preflight-cutover --strict`。（`D-844` / `D-845`）
- **「拟上会」清单共六类**（专班报送 / 意见反馈 / 制度草案 / 发展对象推荐 / 支委会表决事项 / 品牌提案）；写议程时从一张清单勾选，不按来源各做导入。（`D-411` · `D-555` · `D-559`）→ `content/02_institution/sop/常见工作场景快速指南.md`
- **上线残项单一台账**：`.ctx/ENGINEERING_ASSESSMENT.md §四` 的 `L-01…L-21`；不再另设平行清单。（`D-850`）

## §B 分域索引（规则正文在 content）

| 领域 | 权威落点 | 代表裁定 | 备注 |
|---|---|---|---|
| 一、角色与分工 | `content/02_institution/SYSTEM_ROLE_PERMISSION.md` ＋ `COMMISSIONER_DUTY_FRAMEWORK.md` ＋ `sop/支委与党小组定人定责定岗说明.md` | `D-283` · `D-298` · `D-573` · `D-583` · `D-585` · `D-623` | 组织型主体、代组长、14 模块 |
| 二、写入、赋权与通知 | `SYSTEM_ROLE_PERMISSION §9h/§9i` | `D-308` · `D-309` · `D-494` · `D-601` · `D-808` | 指定即赋权、上传位在成员页 |
| 三、会议与考勤 | `content/02_institution/sop/*` ＋ `SYSTEM_ROLE_PERMISSION` | `D-290` · `D-314` · `D-330` · `D-538` · `D-812` | 主持人、请假两档、线上同等效力 |
| 四、补课 | `SYSTEM_ROLE_PERMISSION §9l` ＋ 纪检指南 | `D-293` · `D-294` · `D-399` · `D-427` · `D-545` | 硬要求不可关、T+7 总窗口 |
| 五、思想汇报与考察 | `SYSTEM_ROLE_PERMISSION §9l` ＋ `DATA_MODEL §2.25` ＋ 组织/纪检指南 | `D-295` · `D-387` · `D-470` · `D-541` · `D-547` · `D-611` | 1500/1200 只提示本人、考察可打回 |
| 六、意见反馈 | `SYSTEM_ROLE_PERMISSION §9j` ＋ `DATA_MODEL §2.16` | `D-301` · `D-414` · `D-551` · `D-598` · `D-824` | 处置归支委层、匿名闭环 |
| 七、品牌 | `常见工作场景快速指南` ＋ `DATA_MODEL` | `D-339` · `D-414` · `D-498` · `D-550` · `D-559` | 提案→支委会通过 |
| 八、制度制定 | `常见工作场景快速指南` ＋ `DATA_MODEL` | `D-305` · `D-341` · `D-343` · `D-555` | 草案→审议→现行版/回流 |
| 九、活动、经费与外出 | `常见工作场景快速指南` | `D-317` · `D-319` · `D-321` · `D-505` · `D-812` | 外出提醒、经费随草案 |
| 十、归档、统计与通知 | `常见工作场景快速指南` ＋ `SYSTEM_ROLE_PERMISSION §9l` | `D-285` · `D-287` · `D-429` · `D-474` · `D-537` · `D-558` | 统计交支委会、出勤率只提示 |
| 十一、术语与平台 | `content/03_doc_system/TERMINOLOGY.md` | `D-302` · `D-303` | 平台全称、党员大会全称 |
| 十二、死场景与系统形态 | `content/03_doc_system/ARCHITECTURE.md` ＋ `DS_06` ＋ `FILE_OPERATION_RULES` | `D-610` · `D-628` · `D-631` · `D-668` · `D-675` | 独立页 hydrate、路径 `./`、分区顺序 |
| 十三、闭环与确认 | 纪检 / 组织指南 | `D-455` · `D-456` · `D-457` | 打包确认、记录人必呈现 |
| 十四、工作流块配置面 | `content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md §8` | `D-686` | 表单轴 / 参与人轴；evolution 为论证档 |
| 十五、工作跟着岗位走 | `SYSTEM_ROLE_PERMISSION §9c` | `D-687` | 项目角色不落 `users.role` |
| 十六、界面规范 | `content/04_web_design/design-system/DS_03_COMPONENTS.md` | `D-698` · `D-710` · `D-713` | 按钮四类两档、活动风采置顶 |

## §C 系统配置类（属本代码库，不进 content）

| 配置 | 当前值 | 单一源 |
|---|---|---|
| 活动批准门 | 三态 `off` / `secretary` / `branch-committee`，默认 `off` | `docs/src/core/policy-defaults.js` |
| 会话有效期 | 3 小时（`SESSION_TTL_HOURS`） | `server/routes/auth.js` |
| review 库 | `server/data.review.db` | `server/scripts/start-review.mjs` |
| 生产单支部 | `ALLOW_MULTI_BRANCH=1` 才允许多支部 | `server/run-mode.js` |
| 写入口矩阵 | 141 行 / 0 known-risk | `server/security/write-policy-matrix.mjs` |
| 页签块基线 | 14 个 >4 块页签有 reason | `server/test/style-baseline.mjs::TAB_BLOCK_BASELINE` |

## §D 迁移说明

- 原 16 章、156 条完整投影已按「已覆盖 / 需补 / 仅沿革」分类；规则正文已承接进 `content/02–05` 的对应附录，本文件只留索引。
- 纯历史 / 死场景 / 已被取代的行已删除；git 保留原文，不再写「见 XXX」指针（`CLAUDE.md H26.2`）。
- 若外部文档引用某条具体旧行，请改指 `content` 对应小节或当月 `DECISION_LOG` 的 `D-xxx`。
