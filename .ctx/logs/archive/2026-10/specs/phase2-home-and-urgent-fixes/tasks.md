# Tasks

- [x] Task 1: 日历小字对比度（P2-4）
  - [x] SubTask 1.1 `styles.css`：`.cal-cell-compact .cal-activity-tag` 与 `.cal-task-tag` 升到 11px
  - [x] SubTask 1.2 `calendar.js`：标签字色 mix 从 60% 压深到 72%
  - [x] SubTask 1.3 守卫：紧凑日历标签不得低于 11px；calendar.js 不再出现 60% mix

- [x] Task 2: 个人考勤空态（P2-5）
  - [x] SubTask 2.1 `stats.js`：`myTotal === 0` 时标签为「个人考勤（本月无记录）」
  - [x] SubTask 2.2 守卫：空态文案存在，数值仍为「—」

- [x] Task 3: 选人面板（P2-14）
  - [x] SubTask 3.1 `_positionPanel`：向上展开时 `top` 不低于顶栏底部 + 8px，并收缩高度
  - [x] SubTask 3.2 弹窗内打开时 overlay 改透明点击捕获层
  - [x] SubTask 3.3 守卫：定位 clamp 与 `role="dialog"` 分支存在

- [x] Task 4: 卡片 hover 语义（P2-15）
  - [x] SubTask 4.1 `styles.css`：默认 `.card:hover` 不变色；新增 `.card--interactive:hover`
  - [x] SubTask 4.2 `stats.js`：个人考勤卡加 `card--interactive`
  - [x] SubTask 4.3 守卫：`.card:hover` 不得出现 `primary-300`；交互类存在

- [x] Task 5: 首页活动风采真图位
  - [x] SubTask 5.1 `gallery.js`：删除渐变常量与蓝 hover / 上浮；白卡 + 16:9 图位
  - [x] SubTask 5.2 读取 `imageRecords`：同活动取最新未作废照片；base64 / 鉴权 blob 两条路径
  - [x] SubTask 5.3 无图占位：类型图标 + 「暂无活动照片」，中性底
  - [x] SubTask 5.4 `index.html`：活动风采外卡加 `card--static`
  - [x] SubTask 5.5 守卫：gallery 不含渐变与 `text-blue-700`；含 `data-gallery-img`

- [x] Task 6: 验证与提交
  - [x] SubTask 6.1 新增守卫 + 既有 ui-* / module-load / version-stamp
  - [x] SubTask 6.2 390 / 1440 真机复核：日历标签、考勤空态、选人面板、卡片 hover、活动风采
  - [x] SubTask 6.3 版本戳升一档并提交 commit（Why / What / Verification / Boundaries）

## 第二批（2026-10-19）

- [x] Task 7: 页标题统一（四页重点）
  - [x] SubTask 7.1 `page-frame.js` 新增 `renderTabHeader`（H2 + 可选说明 / 动作）
  - [x] SubTask 7.2 概况：H2「全局概况」；条线 / 待我处理 H4→H3
  - [x] SubTask 7.3 待办：H2「待办」；「待答复与未读通知」span→H3
  - [x] SubTask 7.4 支委会：H2 改走统一组件
  - [x] SubTask 7.5 首页：删除重复组织名 H2 与党徽；区块 H3→H2；风采卡 H4→H3
  - [x] SubTask 7.6 DESIGN_SYSTEM 写 H1/H2/H3 层级规范

- [x] Task 8: 零值处理
  - [x] SubTask 8.1 概况条线：0 显示为 0；逾期 0 用弱化数字
  - [x] SubTask 8.2 全站 0/0 清零（分母为 0 用 — 或文字）
  - [x] SubTask 8.3 DESIGN_SYSTEM 写零值口径

- [x] Task 9: 数字对齐与状态列去重
  - [x] SubTask 9.1 `data-table.js` 表头补 `scope="col"`
  - [x] SubTask 9.2 `styles.css` 新增 `is-numeric` / `is-redundant`
  - [x] SubTask 9.3 概况条线、支委会应到、党小组人数改数字列
  - [x] SubTask 9.4 支委会 / 党小组状态列全正常时隐藏

- [x] Task 10: 验证与提交
  - [x] SubTask 10.1 新增守卫 + 既有 ui-* / module-load / version-stamp / doc-consistency
  - [x] SubTask 10.2 1440 / 390 真机复核四页标题层级、0 值、数字对齐、状态列
  - [x] SubTask 10.3 版本戳升到 `20261018n` 并提交 commit（Why / What / Verification / Boundaries）

## 第三批（2026-10-19）

- [x] Task 11: 低风险三项
  - [x] SubTask 11.1 P2-10 待办组详情：非紧急时不再渲染空徽章行，标题回第一行
  - [x] SubTask 11.2 P2-12 六个工作台「返回主页」改中性文字链
  - [x] SubTask 11.3 P2-2 三处 `transition: all` 收成具体属性

- [x] Task 12: 移动端命中区（P2-6）
  - [x] SubTask 12.1 关闭 / 更多 / 危险控件在 ≤640px 抬到 36px
  - [x] SubTask 12.2 普通紧凑按钮与桌面尺寸不变

- [x] Task 13: 工作组「查看全部」
  - [x] SubTask 13.1 活动工作组与专班工作组各自生成「查看全部」
  - [x] SubTask 13.2 活动段按角色落 calendar / activities / monitor
  - [x] SubTask 13.3 专班段按角色落 taskforce / tf-view / monitor
  - [x] SubTask 13.4 守卫按注册表逐角色核对目标页签

- [x] Task 14: 卡片边界（P2-7 · sample-diff-learning）
  - [x] SubTask 14.1 记录 diff：AI 假设「一页一张主卡」 vs 人类意图「按阅读单元分组」
  - [x] SubTask 14.2 党小组「跨组进展」拆成四张并列卡，去掉外包卡
  - [x] SubTask 14.3 DESIGN_SYSTEM §4.2 写入卡片边界判据（含 Boolean 条件与反例）
  - [x] SubTask 14.4 守卫：跨组进展为无卡分区、四卡顺序正确、无卡中卡

- [x] Task 15: 验证与提交
  - [x] SubTask 15.1 新增 U12 守卫 + 既有 110 项相关测试全绿
  - [x] SubTask 15.2 1440 / 390 真机复核：工作组链接、跨组四卡、移动命中区
  - [x] SubTask 15.3 版本戳升到 `20261018o` 并提交 commit（Why / What / Verification / Boundaries）
