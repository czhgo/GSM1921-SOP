# Tasks

- [x] Task 0: 恢复绿基线
  - [x] SubTask 0.1 刷 `组织委员工作流程指南.md` frontmatter 与 TIMESTAMPS 表行（批次 496 漏刷）
- [x] Task 1: 守卫扩容
  - [x] SubTask 1.1 新增自建浮层扫描（`position:fixed;inset:0` / `fixed inset-0`）+ 非对话框白名单
  - [x] SubTask 1.2 先跑出改造前清单（7 文件 / 12 处），登记为证据
- [x] Task 2: 写入口迁移（7）
  - [x] SubTask 2.1 `prop/archive-tab.js` 上传宣传材料 / 文件外发 / 上传照片 / 标注照片
  - [x] SubTask 2.2 `components/sections/references.js` 写支部文件 / 上传新版
  - [x] SubTask 2.3 `components/record/report-entry.js` 一键汇报
- [x] Task 3: 只读/确认迁移（5）
  - [x] SubTask 3.1 `components/record/inspector.js` 参与者摘要 / 关闭受阻
  - [x] SubTask 3.2 `entries/tabs/org/taskforce-tab.js` 结束工作组
  - [x] SubTask 3.3 `entries/tabs/secretary/todo-tab.js` 表决结果
  - [x] SubTask 3.4 `entries/pages/archive-entry.js` 归档详情
- [x] Task 4: 复盘表单拆分
  - [x] SubTask 4.1 `services/governance/review.js` 增加 `showActions`（默认 true）
  - [x] SubTask 4.2 `secretary-delegate-review` 提交按钮进 footer，保留原提交语义与代填留痕
- [x] Task 5: 文档与版本
  - [x] SubTask 5.1 `DESIGN_SYSTEM §4.27 M-4` 高度口径改准
  - [x] SubTask 5.2 bump 版本戳；同步 import 版本后缀
- [x] Task 6: 验证与记录
  - [x] SubTask 6.1 守卫子集 + 真机普查
  - [x] SubTask 6.2 `test:daily`
  - [x] SubTask 6.3 执行日志 + 中文提交

# Dependencies

- Task 1 先于 Task 2/3（先有判据，再改实现）
- Task 2 / 3 / 4 互不依赖，可按文件并行
- Task 5 依赖 2/3/4 完成（import 后缀统一）
