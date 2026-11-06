# Tasks

- [x] Task 1: 响应式表格卡式行
  - [x] SubTask 1.1 `data-table.js` 输出 `data-label`：调用方给 columns 增加 `label`，`td` 渲染 `data-label`
  - [x] SubTask 1.2 `styles.css` 新增 `@media (max-width: 640px)`：`.data-table` 行转块，`td` 前后用 `data-label`，末列动作不再滑出
  - [x] SubTask 1.3 党小组表、支委会两张表、概况条线表补 `data-label`；390px 每行可读、动作可见
  - [x] SubTask 1.4 补守卫：四张表在 390px 不横向溢出；`td` 带 `data-label`
  - [x] SubTask 1.5 390 顶栏：动作区 `nowrap` / 收缩，品牌名不被压断；「我的档案」收进「更多」或只留图标

- [x] Task 2: 页签溢出渐隐＋箭头
  - [x] SubTask 2.1 `tab-bar.js` 在 `.ws-tab-scroll` 外包一层定位容器，右侧渐隐与左右箭头
  - [x] SubTask 2.2 箭头只在可滚时出现；点击滚动 240px；滚到端点隐藏对应箭头
  - [x] SubTask 2.3 不改 tab 尺寸、选中态、顺序与分组；六台 tab 外观保持现状
  - [x] SubTask 2.4 补守卫：tab-bar 含箭头与渐隐；不出现 tab 尺寸改动

- [x] Task 3: 待答复默认露 2
  - [x] SubTask 3.1 `todo-tab-shell.js` 折叠条默认展开；`report-inbox` embedded 模式限制前 2 条
  - [x] SubTask 3.2 未读通知作为二级折叠；「查看全部待答复」入口保留
  - [x] SubTask 3.3 首屏顺序仍为「待答复 2 条 → 我的待办」；390px 不挤出
  - [x] SubTask 3.4 补守卫：details 默认 open；embedded 限制 2；未读仍折叠

- [x] Task 4: 主 CTA 角色色全强度
  - [x] SubTask 4.1 `styles.css` `.btn-accent` 背景改 `var(--app-accent)` 或 `--app-accent-strong`；不再 mix `#1F2937`
  - [x] SubTask 4.2 校验支书红、组织蓝、宣传、纪检、组长、成员六种主题下白字对比度 ≥ 4.5:1
  - [x] SubTask 4.3 补守卫：`.btn-accent` 不得出现 `color-mix(... #1F2937)`；主按钮用角色色令牌

- [x] Task 5: 选人面板可达
  - [x] SubTask 5.1 `person-picker.js` 增加 Tab/Shift+Tab 焦点陷阱，循环在面板内
  - [x] SubTask 5.2 打开时 `body` 锁滚动；关闭恢复；Esc 关闭并回焦触发按钮
  - [x] SubTask 5.3 监听 resize/orientationchange 重定位；390px 面板不出屏
  - [x] SubTask 5.4 补守卫：源码含焦点陷阱/锁滚动/重定位关键字

- [x] Task 6: 指标单点与重心
  - [x] SubTask 6.1 `work-overview.js` 删除「待我处理」卡头/卡尾重复计数，只留结论带与「共 N 项」溢出行
  - [x] SubTask 6.2 「在办」降为 18px 脚注级或标签「在办（存量）」；不与逾期争最大
  - [x] SubTask 6.3 逾期口径标注：概况「全口径」、待办「待办口径」，避免 62/67 被误读为 bug
  - [x] SubTask 6.4 补守卫：首屏同一 metric 只出现一次；「在办」不再使用 26px 主数值档

- [x] Task 7: 行内动作 1 主 + 1 次
  - [x] SubTask 7.1 党小组操作列改「设/改 + 更多」；改名/解散进更多并二次确认
  - [x] SubTask 7.2 支委会操作列改「改派 + 更多」；撤销进更多并二次确认
  - [x] SubTask 7.3 待办保持 1 主 + 更多；不再新增并列动作
  - [x] SubTask 7.4 补守卫：四页每行可见动作 ≤ 2；危险动作在菜单内

- [x] Task 8: 首页深链与入口
  - [x] SubTask 8.1 「完整日历 →」按角色落 `calendar` / 对应日历页签；不再 `tab=activities`
  - [x] SubTask 8.2 「查看全部 →」落当前角色真实工作组页签（`taskforce` / `tf-view`），不再静默回「今天」
  - [x] SubTask 8.3 深链失败时给可见提示，不静默清空参数
  - [x] SubTask 8.4 补守卫：index.html 的 `data-ws-tab` 值命中各台注册页签

- [x] Task 9: 验证、版本与提交
  - [x] SubTask 9.1 运行新增守卫 + 模块装配 + 文档一致性 + 按钮/表格/间距/行容器守卫
  - [x] SubTask 9.2 真机 1440/390：四张表、页签箭头、待答复 2 条、主 CTA 颜色、选人焦点陷阱
  - [x] SubTask 9.3 版本戳升到 `20261018k`；按 Why / What / Verification / Boundaries 提交 commit

# Task Dependencies

- Task 1、2、4 是基础样式/壳体，先完成
- Task 3、5、6、7、8 可并行
- Task 9 依赖全部任务
