# 第十轮数据生命周期执行 Spec（R10 · 75 条分四批）

## Why

R10 四路只读审查共 75 条（P1 13 / P2 35 / P3 27），暴露的不是零散文案问题，而是四条系统性断链：种子修复会回滚用户编辑、语义写口不推进集合版本、SOP 生成与制度相反的任务、空值/读错源让已写入的事实看不见。支书裁定：**按主题全量修、分四批**；空字段「可派生则派生，否则必须可写」；mock 与种子**按产品口径重做**；测试总计不超过 3 次。

## What Changes

- **第 1 批 · 数据安全（9 条）**：语义写口统一推进集合版本；专班移出改保留贡献；API 形态不再注入 `br-b1` 种子；考察快照留痕由服务端复算；成员/授权/产出单条写口补版本；恢复归档回收工作组状态；无父键归属 fail-closed；删除 `u_org/u_prop` 幽灵操作人兜底。
- **第 2 批 · 种子与 mock（20 条）**：`seed-manifest` 把用户可编辑字段归 `runtimeFields`；种子派生复用产品同步函数；删除违反制度的演示行；报名样本改挂运行中专班；10 月窗口平移到当前日期；mock 修复面与 API 对等；补终态写门与 `branchId/createdBy`；相对日期。
- **第 3 批 · 制度与单一源（26 条）**：SOP 任务执行人/期限从 policy 现算；流程图随 SOP 派生；补课/复盘/考勤/角色/终态/应到统计/工作组 id 全部收口到单一源；周期归档快照用支部策略；党小组改名后读侧按 `hostGroupId` 现取名字。
- **第 4 批 · 空字段与体验（19 条）**：每个空值二选一（派生或可写）；会议名单读应到名单；组织者/通知收发人/工作考察读对源；组长与纪检的确认判据统一；工作组预载与首页同谓词；补齐无落点的空态；删不可达状态文案。
- **跨批硬约束**：不得为演示数据写产品特判；不得用 `—`/`未填写` 掩盖应有归属；任何「写入成功」必须同时能被主读口看见。

## Impact

- 受影响能力：种子修复、跨端同步、SOP 任务生成、考勤确认、专班贡献、通知收发人、空字段入口。
- 受影响代码：`docs/src/data/{seed-manifest,mock/**,mock-adapter,workgroup-seed-sync,activity-workgroup-sync}.js`、`docs/src/workflow/{sopData,definitions,mermaid-sources}.js`、`docs/src/services/**`、`server/routes/**`、`server/seed*.js`、`server/routes/system-notices.js`。
- **不改**：schema（Todo `branchId` 与拆表另见 `implement-r9-schema-plan`）；不删任何「代录/兜底/监督/审批留痕/知情查看」入口。

## ADDED Requirements

### Requirement: 空字段必有出口
任一用户可见的空值 SHALL 满足其一：按日期/角色/制度现算；有写入口；明确「谁可补、在哪补」。不得只显示「未填写/待定/—」。

#### Scenario: 可派生
- **WHEN** 字段能由活动日期、角色、policy 或父行现算
- **THEN** 读侧调用同一派生函数，不再保存死值

#### Scenario: 不可派生
- **WHEN** 字段必须由人填写且当前为空
- **THEN** 页面给出写入口或明确归属与落点；保存后主读口立即刷新

### Requirement: 种子修复不回滚用户编辑
`seed-manifest` SHALL 把一切用户可编辑字段归入 `runtimeFields`；修复只重建基底。

#### Scenario: 编辑后刷新
- **WHEN** 用户修改活动标题/日期/地点、通知正文与受众、党小组名、思想汇报正文后刷新
- **THEN** 修改保留；种子 repair 前后运行时字段逐字节不变

### Requirement: 语义写口推进集合版本
凡经语义端点改变集合行（通知、待办、考勤、考察、成员、授权、产出、配置）SHALL 在同一事务内 bump 对应 `collection_versions`。

#### Scenario: 跨端并发
- **WHEN** 设备 A 语义写一行，设备 B 随后用旧 baseline 提交整表快照
- **THEN** 服务端返回 409，A 的行不被删除

### Requirement: 演示数据与产品同口径
mock 与种子 SHALL 由产品同一判据生成；违反现行制度的演示行必须删除或改写。

#### Scenario: 制度相反
- **WHEN** 种子包含支委会考勤、专班组 `participant`、已完成专班的 `pending` 报名
- **THEN** 删除或改挂到符合制度的活动/专班；不得以「演示需要」保留

## MODIFIED Requirements

### Requirement: 考勤确认判据
前端与后端 SHALL 统一以 `confirmedBy` 判定确认；`recordedBy` 只表示上传人。出勤/已补的自动确认由同一函数给出。

### Requirement: 工作组任务预载
预载与首页展示 SHALL 使用同一谓词、同一排序、同一上限；未装载才显示「加载中」。

## REMOVED Requirements

### Requirement: 幽灵操作人兜底
**Reason**：`u_org/u_prop` 只存在于 mock 初始账号，API 形态不存在；继续兜底会在审计列留下裸 id，且让产品迁就演示登录。
**Migration**：会话缺失时 fail-closed 并提示重新登录；历史行按真实 `personId` 能解析的保留，解析不出的显示「登记时未采集」。

### Requirement: 周期归档空表演示种子
**Reason**：API 形态注入 `br-b1` 种子会让下一次快照整批 403。
**Migration**：仅 mock 形态保留空表回退；API 形态空就是空，页面给空态。

## 分批与验收

| 批次 | 条目 | 验收（用户可见） |
|---|---|---|
| 1 数据安全 | D01、D02、D03、D05、D09、D12、D14、D16、C15 | 移出成员后贡献仍可回查；两台设备并发不再互相删行；真实支部不再凭空出现 `br-b1` 归档；恢复归档后工作组可写 |
| 2 种子/mock | C01–C14、C16–C20、B21 | 改完刷新不被回滚；取消活动的工作组只读；报名样本全部可执行；10 月基线不过期 |
| 3 制度单一源 | B01–B20、B22、B23、D06、D07、D08、D15 | 支委会不再生成考勤任务；党小组会考勤归组织者；复盘期限跟随 10 天；改名后组长权限不丢 |
| 4 空字段/体验 | A01–A15、D10、D11、D13、D17 | 流入成员阶段必须登记；会议显示应到名单；通知显示真实收发人；首页专班不再永久「加载中」 |

> D04（Todo `branchId`）随 `implement-r9-schema-plan` 实施，不在本 spec 重复。

## 验证预算（支书令：测试不超过 3 次）

1. **定向**：一条命令跑本批新增/改动的守卫与关键用例（清单见 `tasks.md`）。
2. **daily**：`npm run test:daily`。
3. **全量**：`SWEEP_SHARD=all`（`DISABLE_PASSWORD_CHECK=1` / `DEMO_READONLY=0`）。

四批连续实现，**中间不跑套件**；静态守卫可随批新增，但只在第 1 次定向时统一执行。红项只允许单跑失败文件诊断，不得开第四轮套件。
