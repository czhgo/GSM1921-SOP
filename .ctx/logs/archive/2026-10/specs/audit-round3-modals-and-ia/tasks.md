# Tasks

- [x] Task 1: 活动日历承载形态
  - [x] SubTask 1.1 核实「点日期 → 活动页」与右侧 inspector 的实际行为
  - [x] SubTask 1.2 二选一：右侧改「当日清单 + 就地操作」或删除；补真机守卫
- [x] Task 2: 浮窗表单专项
  - [x] SubTask 2.1 盘点全站 modal/drawer（≥15 个）并分级
  - [x] SubTask 2.2 统一体例：标题/分组/必填/默认值/底部动作/滚动
  - [x] SubTask 2.3 删重复说明与「此地无银」注释；新增 `ui-modal-form-guard`
- [x] Task 3: 思想汇报去重
  - [x] SubTask 3.1 对照个人档案与组织台内容，给制度依据
  - [x] SubTask 3.2 删除重复承载面或收窄为「待初阅队列」
- [x] Task 4: 专班管理名实
  - [x] SubTask 4.1 拆分「专班 / 活动工作组」或改名「工作组」
  - [x] SubTask 4.2 同步页签注册、帮助、README、旧 id 别名
- [x] Task 5: 我的处置重排
  - [x] SubTask 5.1 待我处理（紧急度）/ 已处理（折叠）两段
  - [x] SubTask 5.2 去掉重复计数与同义说明
- [x] Task 6: 名册筛选改下拉
  - [x] SubTask 6.1 三个 select（党小组/阶段/在册状态）+ 搜索
  - [x] SubTask 6.2 移除冗余 chip；新增 `roster-filter-guard`
- [x] Task 7: 第三轮平行审查
  - [x] SubTask 7.1 前端「脏乱繁 + 浮窗」报告 ≥20 条
  - [x] SubTask 7.2 全栈开发报告 ≥20 条
  - [x] SubTask 7.3 P1 就地修；P2 按裁定
- [x] Task 8: 学号主键迁移（BREAKING，独立提交）
  - [x] SubTask 8.1 migration v7：p* → 学号/工号，全库引用映射，输出映射率
  - [x] SubTask 8.2 mock/accounts 全量重写；登录旧 id 仅迁移期别名
  - [x] SubTask 8.3 `identity-student-id-guard`；同步测试
  - [x] SubTask 8.4 `npm run test:daily` 全绿

# Dependencies

- Task 2/3/4/5/6 可并行
- Task 7 只读审查与 Task 1–6 并行
- Task 8 独立，最后单独提交

> **回勾依据（2026-10-27 批次 515）**：本文件剩余未勾项经复核均已落地（守卫已存在 / 已提交批次）；逐条依据见 `.ctx/logs/archive/2026-10/specs/SPECS_INDEX.md`。
