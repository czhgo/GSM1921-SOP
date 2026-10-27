# Tasks

- [x] Task 1: Round 2 三 lens 独立审查
  - [x] SubTask 1.1 启动三个子代理，分别只加载 `better-layout` / `better-accessibility` / `better-writing`
  - [x] SubTask 1.2 每个代理只拿统一输入（7 台页签清单 + 关键公共页）与输出 schema，不读其他代理报告
  - [x] SubTask 1.3 三路分别输出「现象 / 证据 / 影响 / 建议方向 / 严重度 / 可能冲突」
  - [x] SubTask 1.4 新增 `.ctx/AUDIT_ROUND2_MINIMUM_THREE_COSTS.md`：三路结果 + 共识 / 分歧 / 待裁定
  - [x] SubTask 1.5 主代理核对证据，剔除无证据项；每条标归属（本批修 / 转 R3 / 转 R4 / 结项）

- [x] Task 2: 汇总与一次 grill frontier
  - [x] SubTask 2.1 汇总执行中待问清单与三路待裁定
  - [x] SubTask 2.2 用 grilling frontier 一次性列出全部待裁定（编号 + 推荐答案），每批最多 4 题
  - [x] SubTask 2.3 记录每个裁定的选项 / 选择 / 日期 / 未选方案处理
  - [x] SubTask 2.4 未回答项保持「待裁定」，不写成默认值

- [x] Task 3: P7 表档回退 13px
  - [x] SubTask 3.1 `styles.css`：`.data-table thead th` 字号回 13px，保留 600 / neutral-600
  - [x] SubTask 3.2 `styles.css`：`.data-table tbody td:first-child` 字号回 13px，保留 500
  - [x] SubTask 3.3 新增守卫断言不再出现 12px / 14px 覆盖
  - [x] SubTask 3.4 page-sweep P7 转绿，且未改 `cellPx = 13`

- [x] Task 4: S1 / S19 口径校准
  - [x] SubTask 4.1 `page-sweep::S1` 矩阵门槛 4 → 2，注释写实测与「范围未缩水」
  - [x] SubTask 4.2 根 `README.md` 页签句对齐「逐枚页签（共 67 个）」
  - [x] SubTask 4.3 S1 / S19 转绿；P2 / P3 判据未放宽

- [x] Task 5: U-01 周期归档待审完整闭环
  - [x] SubTask 5.1 支书台「工作概况」新增待审卡（`listPeriodicArchivesPendingReview`）
  - [x] SubTask 5.2 行内「通过 / 退回」接 `reviewPeriodicArchive`；退回可填说明
  - [x] SubTask 5.3 消费 `?highlight=`：定位 / 高亮 / 找不到时提示
  - [x] SubTask 5.4 `work-overview`「待我处理」纳入周报待审（与 PENDING 同源）
  - [x] SubTask 5.5 空态 + 去宣传台唯一下游入口
  - [x] SubTask 5.6 真机走通：通知 → highlight → 通过 / 退回；计数同步

- [x] Task 6: 无障碍验证机检化
  - [x] SubTask 6.1 新增 Chromium 可访问性树断言（dialog 名称 / aria-pressed / label / 空态出口）
  - [x] SubTask 6.2 覆盖招募浮窗、专班三视图、项目分工三子视图、会议活动 select、项目分工空态
  - [x] SubTask 6.3 测试登记进对应测试档；失败即红
  - [x] SubTask 6.4 checklist 中不再保留「留人工」阻塞项

- [x] Task 7: 验证与提交
  - [x] SubTask 7.1 静态 / 守卫组全绿；P7 / S1 / S19 转绿
  - [x] SubTask 7.2 版本戳 bump；TIMESTAMPS / 执行日志更新
  - [x] SubTask 7.3 提交正文含 Why / What / Verification / Boundaries
  - [x] SubTask 7.4 临时脚本 / 证据按「临时上下文退出」纪律处置

- [x] Task 8: Round 2 审计本批修项（低风险、高价值）
  - [x] SubTask 8.1 page-sweep P1：支书台「支部分工」14 行未分页 → `pageSize` 20 → 10
  - [x] SubTask 8.2 L-B03：写入活动浮窗两处 `div onclick` 折叠改 `<button aria-expanded aria-controls>`
  - [x] SubTask 8.3 L-B05：看板卡 keydown 排除内层 button/a/input/textarea/select（回车不再劫持「确认完成」）
  - [x] SubTask 8.4 L-B06：通用浮窗关闭按钮补 `aria-label="关闭"`
  - [x] SubTask 8.5 L-B09：矩阵行首 `th scope="row"`、列头 `scope="col"`；翻页 `nav aria-label` + 当前页 `aria-current="page"`
  - [x] SubTask 8.6 L-B11：考勤队列复选框名称拼「姓名 · 活动 · 状态」；逐人状态/标因下拉补对象名
  - [x] SubTask 8.7 L-C01：活动/专班详情缺对象时补「返回活动列表 / 刷新后再试」下一步说明
  - [x] SubTask 8.8 L-A09 + L-C10：材料页第②步改「核对材料」，去掉「收口核对 / 软归档」内部话术，裸 id 标「活动编号」
  - [x] SubTask 8.9 L-C12：本轮触碰文件内的用户可见省略号统一「…」
  - [x] SubTask 8.10 回归：module-load、a11y-tree、table-type-scale、page-sweep、button/spacing/text 守卫

# Task Dependencies

- Task 2 依赖 Task 1
- Task 3 / 4 / 5 / 6 相互独立，可与 Task 1 并行（3、4 只动样式/守卫/台账；5 只动支书台；6 只加测试）
- Task 8 依赖 Task 1 的审计归属；与 Task 3–6 可并行
- Task 7 依赖全部
