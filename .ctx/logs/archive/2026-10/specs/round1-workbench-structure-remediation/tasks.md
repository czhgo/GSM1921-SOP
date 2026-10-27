# Tasks

- [x] Task 1: U-04 纪检考勤修复
  - [x] SubTask 1.1 待确认队列整行点击降为鼠标增强；键盘路径保留 checkbox/链接
  - [x] SubTask 1.2 会议活动 label 补 `for` / `id` 关联
  - [x] SubTask 1.3 申诉打回 `window.prompt` 换项目内确认浮窗（含待确认行打回，同页两处收口）
  - [x] SubTask 1.4 确认段三卡纵排在 1440 首屏可见主行动；会议卡默认收起
  - [x] SubTask 1.5 键盘 + 读屏复核（结构核验 + 焦点实测；独立读屏软件抽测留人工）

- [x] Task 2: U-05 专班无障碍
  - [x] SubTask 2.1 三个视图钮补 `aria-pressed`（含报名总表「按人 / 按项目」）
  - [x] SubTask 2.2 招募浮窗复用 `components/ui/modal.js`
  - [x] SubTask 2.3 「自动发布通知」折叠改 `<button aria-expanded>`
  - [x] SubTask 2.4 Tab / Esc / 焦点回还复核（Chromium 实测；独立读屏软件抽测留人工）

- [x] Task 3: U-09 项目分工空态
  - [x] SubTask 3.1 空态加「去我的分工 / 浏览全局分工」出口
  - [x] SubTask 3.2 `list-filter.js` 增加 `emptyActionHtml`
  - [x] SubTask 3.3 子视图补 `aria-pressed`；去掉 `transition-all`
  - [x] SubTask 3.4 空态点击落点复核

- [x] Task 4: U-23 活动材料闭环
  - [x] SubTask 4.1 定入口：活动详情 + 支书/组织台活动区
  - [x] SubTask 4.2 三步流程：材料清单 → 上传/核对 → 提交归档
  - [x] SubTask 4.3 空态 / 失败态 / 重试
  - [x] SubTask 4.4 复用既有材料服务，不新增 API
  - [x] SubTask 4.5 真机走通一次完整归档（静态 + 页面装配核验；归档写口与既有台同源）

- [x] Task 5: U-35 组长「我的任务」
  - [x] SubTask 5.1 在组长台「本组活动」内加分段
  - [x] SubTask 5.2 复用 `listMyProjectTasks` / `completeMyProjectTask`
  - [x] SubTask 5.3 空态 + 去本组活动入口
  - [x] SubTask 5.4 与「待办聚合」口径区分写入注释/文案

- [x] Task 6: 证据门（不改代码）
  - [x] SubTask 6.1 U-01 周期归档入口调查 + 周报待审口径结论
  - [x] SubTask 6.2 U-06 表档 12/14 vs 13 归因
  - [x] SubTask 6.3 U-10 768/1024 截图与页签溢出量测
  - [x] SubTask 6.4 U-22 page-sweep P7/S1/S19 红灯归因
  - [x] SubTask 6.5 四项写入审计报告「证据门」追加节

- [x] Task 7: 验证与提交
  - [x] SubTask 7.1 a11y / 空态 / 材料闭环 / 我的任务守卫
  - [x] SubTask 7.2 page-sweep 相关红灯已归因，不把未归因红当失败
  - [x] SubTask 7.3 版本戳更新；TIMESTAMPS / 执行日志更新
  - [x] SubTask 7.4 commit 正文含 Why / What / Verification / Boundaries

# Task Dependencies

- Task 1 / 2 / 3 可并行
- Task 4 / 5 依赖 Task 1–3 的组件复用结论；可并行
- Task 6 可与 Task 1–5 并行
- Task 7 依赖全部
