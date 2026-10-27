# Tasks

- [x] Task 1: 修正汇报受众与组织汇总（BREAKING，覆盖批次 498 口径）
  - [x] SubTask 1.1 `canReadIssue` 扩展：支委层全量＋当事人＋该工作组组织者＋汇报人党小组组长；判据需可注入组织者/党小组解析（纯函数）
  - [x] SubTask 1.2 前端读口与服务端 `GET /issues` 同步；补回归测试（支委层、组织者、组长、无关成员四类）
  - [x] SubTask 1.3 汇总面：活动/专班上下文按工作组汇总；组长台按党小组汇总；复用既有汇报收件箱组件，不造第二套渲染
  - [x] SubTask 1.4 空态与计数：无汇报、无工作组、无党小组时给 `—` 与明确下一步；不造假入口
- [x] Task 2: 原则落盘
  - [x] SubTask 2.1 `SECRETARY_DIRECTIVES.md` 增一条支书原话（逐字＋日期）：支委知情权、组织者按工作组汇总、组长按党小组汇总
  - [x] SubTask 2.2 `DATA_MODEL.md §2.16` 改准受众与汇总口径；`PARALLEL_SKILL_AUDIT §11.3` 增 Boolean 规则（组织汇总）
  - [x] SubTask 2.3 同步 frontmatter / TIMESTAMPS（一改具改，Grep 零残留）
- [x] Task 3: 专项台账与每批报告
  - [x] SubTask 3.1 `.ctx/ENGINEERING_ASSESSMENT.md §四` 新增「专项台账」表（专项 / 性质 / 状态 / 下一动作 / 单一源指针）
  - [x] SubTask 3.2 `CLAUDE.md H20.3` next_prompt 增加「台账快照＋下轮建议」为必报项
  - [x] SubTask 3.3 台账收录现行专项：浮层、反馈受众与汇报、数据生命周期、IA 剩余、宽表卡式化、form-loop 存量红、测试分层、第五轮脏乱繁、mock 结构对齐、全栈延期（任命事务化等）
- [x] Task 4: mock ↔ API 结构真值
  - [x] SubTask 4.1 新增对照脚本 / 测试：种子库 API 字段集合 vs mock 字段集合，输出「多出 / 缺失 / 类型不符」
  - [x] SubTask 4.2 按报告修 mock 与适配器（以 API 为准）；客户端投影字段进白名单并写理由
  - [x] SubTask 4.3 守卫：结构漂移超出白名单即红；报告可重跑
- [x] Task 5: seed 行漂移检测与修复
  - [x] SubTask 5.1 启动时或迁移中检测既有 seed id 行是否落后于当前 `SEED_*`
  - [x] SubTask 5.2 幂等修复：只更新既有 seed id，不新增/删除用户数据；输出修复条数
  - [x] SubTask 5.3 回归：旧种子行 → 升级 → 与当前种子一致；重复执行零改写
- [x] Task 6: daily test 分层与精简
  - [x] SubTask 6.1 采集每个测试文件耗时与断言数，产出「关键 probe / 周期守卫 / 真机普查」三层清单
  - [x] SubTask 6.2 `test:daily` 收敛到预算内（关键 probe：权限、数据真值、迁移、写链、构建完整性、本批改动面）；全量另立脚本
  - [x] SubTask 6.3 删除 / 降层每条须附证据（覆盖来源或 mutation 验证）；新增分层登记守卫与预算守卫
- [x] Task 7: 第五轮【脏乱繁】平行审查
  - [x] SubTask 7.1 主代理定题：7 台 / 62 tab，四问与「模式还是个案」判据
  - [x] SubTask 7.2 三路 lens 并行（web-design-guidelines / design-with-taste / frontend-design），每路只读、不互读
  - [x] SubTask 7.3 汇总共识 / 分歧 / 待裁定；共识落原则文档，修复另落 spec；本篇报告归档 `.ctx/logs/archive/2026-10/`
- [x] Task 8: 验证与交付
  - [x] SubTask 8.1 `test:daily` / 分层套件 / 真机普查按新档运行；记录读数
  - [x] SubTask 8.2 bump 版本戳并复跑 version-stamp（防编辑器旧缓冲回写）
  - [x] SubTask 8.3 执行日志（Why / What / Verification / Boundaries / sample-diff）＋ 中文提交

# Task Dependencies

- Task 1 最先（受众与汇总改动会影响审查基线）
- Task 2 / 3 依赖 Task 1 的口径定稿
- Task 7 在 Task 1 完成后启动，可与 Task 4 / 5 并行
- Task 6 依赖 Task 4 / 5 / 7（以最终测试面收敛分层）
- Task 8 最后

> **回勾依据（2026-10-27 批次 515）**：本文件剩余未勾项经复核均已落地（守卫已存在 / 已提交批次）；逐条依据见 `.ctx/logs/archive/2026-10/specs/SPECS_INDEX.md`。
