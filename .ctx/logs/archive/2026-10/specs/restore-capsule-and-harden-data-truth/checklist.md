# Checklist

## 分组胶囊（对应“完全忽略了我所说的指令”）

- [x] `.tab-group-label` 底色 = `--app-accent-soft-bg`，文字 = `--app-accent-soft-text`，不是 `neutral-200/500`
- [x] `border-radius:3px`，不是 999px；`font-weight:600`、`letter-spacing:0.5px`
- [x] 高度仍 ≥24px；390/768/1024/1280/1440 五档均可见
- [x] 亮/暗两套主题都取 soft 三件套；文字对比 ≥4.5:1
- [x] 形状对比 ≥1.5:1（描边或更深底承担）
- [x] 未使用 `color-mix()` / `rgba(主题色)` / `filter:brightness()`
- [x] SD-3、SD-36、§12.3 已登记例外；`ui-contrast-guard::K3` 与 `ui-control-system-guard::V2` 同步
- [x] 真机 1440/390 截图或读数已记录（圆角、底色、高度）

## 缓存边界（对应“哪些保留浏览器，哪些只能走服务端”）

- [x] 纯展示偏好白名单：主题 / 字号 / 强调色 / 页签顺序 / 开学提醒关闭
- [x] 会话鉴权：登录快照、tabId、session 快照、API token 仍在 sessionStorage/localStorage 且可解释
- [x] 业务读缓存带集合版本；清缓存重登后业务可恢复
- [x] 业务写不得以本地 `persist()` 成功作为成功；服务端行/快照请求/语义端点 2xx 至少一项可证
- [x] 非快照域（committeeBroadcasts / agendaVotes / memberChangeRequests 等）有语义端点或明确“未同步”
- [x] 断网保存显示“未同步”，不显示“保存成功”；恢复后可重试
- [x] 缓存键四类清单已落盘，新增未登记键会被守卫判红

## 登录与数据形态

- [x] 有 server 时先 `POST /api/v1/auth/login`，成功才写本地登录态
- [x] 后端失败停留登录页并显示错误，不跳工作台
- [x] 真实服务端账号可登录（不依赖本机 `gsm1921-accounts` 预置）
- [x] 登录后 `getRuntimeMode()` 为 `{source:'api', hasToken:true}`
- [x] api 形态空库访问六台后，`activities/attendances/inspections/notices/signups/todos` 计数保持 0
- [x] api 形态页面不出现 `act-* / att* / notice-* / tf-* / tsk-*` 演示 id
- [x] `SEED_FALLBACK` 只在 mock/显式演示模式生效

## 种子与 schema（对应“数据表是否契合功能”）

- [x] `DATA_SEED_CONTRACT` 已落盘：必须种子 / 可派生 / 可交叉验证 / 展示专用
- [x] `activities / attendances / inspections` 种子行均有有效 `branchId`
- [x] `archive_records` 的 `materialOnly` 行有 `branchId`，支部账号可见
- [x] `prop_tasks / external_dispatches / handoffs / member_confirmations / auth_audit` 有 `branchId`
- [x] `todos.branch_id` 与 JSON `branchId` 一致，查询命中索引
- [x] `contributions` 全为对象数组；影子表无 `$."0"` 字符键
- [x] 考察记录 `personId` ∈ 父工作组成员（或模型已明确放宽）
- [x] 唯一索引生效：考勤 `(activityId,personId)`、党小组 `(branchId,name)`、应到名单 `activityId`、工作组成员 `(workgroupId,personId)`
- [x] `issue_reveals` / `committee_broadcasts` 已明确 DROP 或保留只读，并有读口白名单
- [x] 语义 7 表与辅助集合已有 `DATA_MODEL` 字段表
- [x] UI 写入但未登记的字段已登记或删除
- [x] `seed-contract-guard` 至少覆盖 8 条可机检断言

## 四个月演示窗口（对应“保留 8–11 月，旧数据删去”）

- [x] `DEMO_WINDOW = 2026-08-01–2026-11-30` 是单一源
- [x] 8/9/10/11 每月至少一场活动；11 月为 draft/published 计划态
- [x] 复盘五态、考勤 present/leave/absent/made_up、专班 active/completed/dissolved 各至少一条
- [x] 组织骨架与跨期实体（tf-002、auth_audit、appointment_records）未被按日期误删
- [x] 7 月及更早业务内容已重排，不是直接 DELETE
- [x] 运行库通过 `rebuild-demo` 重建并 `integrity_check=ok`、零孤立引用
- [x] 旧库已备份；替换后 wal/shm 已清
- [x] 固定 ID 测试锚点已改为新窗口内存在或相对夹具
- [x] 窗口守卫：mock 日期在窗口内，例外有理由

## 测试残留（对应“清除所有测试用例”）

- [x] 自动化测试套件保留（268 个文件），未删断言/未 skip 变绿
- [x] `b3-1` 使用临时库，`finally` 清理；失败也不污染 `data.db`
- [x] `cleanup.mjs` 修复后 dry-run 可跑通，不因 `shadow_history` 报错
- [x] `npm run test:clean` 可清 `act-b31-* / att-b31-* / mk-b31-* / act-ce46b61e / todo_seed_7 / 测试通知 / 测试议题`，真实业务行不动
- [x] `npm run test:full:safe` 跑前备份、跑后清理
- [x] `test-isolation-guard` 断言 external-write 不指向 `server/data.db`
- [x] 测试后无新增 sessions / 孤儿 uploads / `.tmp` 残留

## 正式轨道（对应“部署后集中倒闸”）

- [x] 生产形态默认 `SEED_FALLBACK=false`
- [x] 生产库含演示种子行时默认拒绝启动，`ALLOW_DEMO_DATA=1` 才放行
- [x] `seed-repair` 在 baseline/生产形态不修复演示 seed id
- [x] `import-branch` dry-run 不写库；正式导入失败整体回滚
- [x] `restore.mjs` 可完成停服校验、integrity、替换 db+uploads、清 wal/shm
- [x] 只读演练模式下所有写口 403/只读提示，页面可完整浏览
- [x] 名册导入单事务；导入后真实成员可登录
- [x] 部署文档有四开关矩阵与切换/回滚步骤

## 规范、判例与验证

- [x] `DESIGN_SYSTEM` 增 SD-47/SD-48；`DATA_MODEL` 增契约指针与 v12；`PRODUCT_IA` 增数据形态说明
- [x] `CASES.md` 增 CASE-DESIGN-025 与 CASE-DATA-001；索引同步
- [x] sample-diff 五列已覆盖 4 条样本
- [x] 执行日志批次 513、SNAPSHOT、TIMESTAMPS、GUARD_INVENTORY 已更新
- [x] 定向全绿；`npm run test:daily` 全绿；真机胶囊五档 + 登录 + 空库/演示库通过
- [x] `SWEEP_SHARD=all` 三通道 0 失败且墙钟 ≤1200s
- [x] 版本戳 bump；中文提交（不 push）
