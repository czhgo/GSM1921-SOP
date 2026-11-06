# Tasks

## Part A：四处回归修复

- [x] Task 1: 回归归因与基线确认
  - [x] SubTask 1.1 确认首页抬头被批次 480（`661928088`）删除：党徽 + 组织名 H2
  - [x] SubTask 1.2 确认默认金被批次 462-466（`5da2d0d72`）改为 `#A16207`；主 CTA 被批次 478 改为 58% 压深
  - [x] SubTask 1.3 确认党委台支部数据已同步：`支部管理` 实测 50 人 / 21 人；API summary 含 35 活动 / 8 专班 / 14 通知；无计算盲区
  - [x] SubTask 1.4 记录三处分歧到 `.ctx/AUDIT_ROUND2_MINIMUM_THREE_COSTS.md` 或执行日志

- [x] Task 2: 首页抬头式品牌块
  - [x] SubTask 2.1 `docs/index.html` 在统计卡上方恢复党徽 48px + `#dashboard-hero-title` + 副标题
  - [x] SubTask 2.2 `main-entry.js` 引入 `getHeaderTitle`，按登录态写动态支部名；不写死示例支部名
  - [x] SubTask 2.3 新增 `ui-home-hero` 守卫（存在党徽 / 动态标题 / 无硬编码支部名），登记 `test:daily`

- [x] Task 3: 金色与按钮前景对
  - [x] SubTask 3.1 默认金改为 `#F5C518`（styles.css 三件套 + constants.js participant 色）
  - [x] SubTask 3.2 新增 `accentButtonColors(hex)`：亮色返回本色底 + `#1F2937` 深字；暗色返回 58% 压深底 + 白字
  - [x] SubTask 3.3 在 `theme.js` / `bootstrap.js` / `settings-entry.js` / `org-setup-wizard.js` 注入 `--app-accent-strong` / `--app-accent-ink` / `--app-accent-text`
  - [x] SubTask 3.4 `.btn-accent` 用 `--app-accent-strong` 底 + `--app-accent-ink` 字；`.btn-accent-soft` 用 `--app-accent-text`
  - [x] SubTask 3.5 新增金色/前景对守卫（金 `#F5C518`、金底深字、非金色白字），登记 `test:daily`

- [x] Task 4: 半透明按钮体例恢复
  - [x] SubTask 4.1 审计最近批次把 `btn-accent-soft` 改成 `btn-outline` 的高频动作调用点
  - [x] SubTask 4.2 恢复「次主操作 / 高频行内动作」为 `btn-accent-soft`；取消 / 中性 / 低频保留 `btn-outline`
  - [x] SubTask 4.3 不撤销四类按钮体系，不恢复 `.btn-ghost` 作为动作按钮
  - [x] SubTask 4.4 更新按钮守卫基线（只降不升），登记改动点

- [x] Task 5: 党委台支部摘要与行内名册
  - [x] SubTask 5.1 `branches-tab.js` 补「活动 / 专班 / 通知」三列（summary 缺失显示「—」）
  - [x] SubTask 5.2 每行加「名册」展开键：行内显示成员（姓名 / 党小组 / 发展阶段 / 档案入口），按 `branchId` 过滤
  - [x] SubTask 5.3 保留「查看该支部」完整只读页入口
  - [x] SubTask 5.4 新增 `party-branch-directory` 守卫（三列 + 名册展开 + summary 字段）
  - [x] SubTask 5.5 真机 e2e：登录党委组织员，断言 50/21/35/8/14 与行内 50 人名册

- [x] Task 6: Part A 验证与提交
  - [x] SubTask 6.1 静态 / 守卫组全绿；a11y 树断言不回归
  - [x] SubTask 6.2 首页 1440 / 390 真机截图；金色与按钮视觉复核
  - [x] SubTask 6.3 版本戳 bump；TIMESTAMPS / 执行日志更新
  - [x] SubTask 6.4 提交正文含 Why / What / Verification / Boundaries
  - [x] SubTask 6.5 临时脚本与证据按退出纪律处置

## Part B：Round 3 + Round 4 合并审查与修复

- [x] Task 7: Round 3 三 lens 审查
  - [x] SubTask 7.1 启动三个子代理，分别只加载 `frontend-design` / `design-with-taste` / `uicraft`
  - [x] SubTask 7.2 每个代理只拿统一页面清单与输出 schema，不读其他代理报告
  - [x] SubTask 7.3 覆盖 R3 输入清单：L-A01/A02/A04/A05/A06/A07/A10/A11/A12、L-B01/B04/B07/B08/B10/B12、L-C02/C03/C04/C05/C06/C07/C08/C09
  - [x] SubTask 7.4 三路输出现象 / 证据 / 影响 / 建议 / 严重度 / 冲突

- [x] Task 8: Round 4 三 lens 审查
  - [x] SubTask 8.1 启动三个子代理，分别只加载 `fullstack-developer` / `domain-modeling` / `backend-architect`
  - [x] SubTask 8.2 每个代理只拿统一数据/API 清单与输出 schema，不读其他代理报告
  - [x] SubTask 8.3 覆盖 R4 输入清单：L-A03/A08、L-B02、L-C11；只读审查写口 / 权限链 / 数据模型
  - [x] SubTask 8.4 三路输出现象 / 证据 / 影响 / 建议 / 严重度 / 冲突

- [x] Task 9: 合并报告与一次 frontier
  - [x] SubTask 9.1 新增 `.ctx/AUDIT_ROUND3_4_COMBINED.md`：六路结果 + 共识 / 分歧 / 待裁定
  - [x] SubTask 9.2 逐条核对 R3/R4 输入清单，无静默丢项
  - [x] SubTask 9.3 只开一次 frontier，待裁定集中问；每批最多 4 题
  - [x] SubTask 9.4 未回答项保持「待裁定」，不写成默认值

- [x] Task 10: 修复 batch 1（低风险高价值）
  - [x] SubTask 10.1 R3-D01 金色文字/焦点环统一 `--app-accent-text`，加「禁止裸 accent 作 color/outline」守卫
  - [x] SubTask 10.2 R4-F01 `openFormModal` / `openModal` 全量转义（title/label/placeholder/value/option）
  - [x] SubTask 10.3 R3-U01 组织台「发布招募」移出 `.ws-tab-scroll` 到固定右格
  - [x] SubTask 10.4 R3-F02 通知条目拆嵌套动作 + 铃铛 `aria-label` 带未读数
  - [x] SubTask 10.5 R3-U03 + R3-D05 页签渲染失败错误卡/重试；激活页签 `scrollIntoView`
  - [x] SubTask 10.6 R3-U07 材料页四类清单恒显示 + 步骤条单调
  - [x] SubTask 10.7 R3-U08 「今天」聚合错误态不冒充空态
  - [x] SubTask 10.8 R3-F09 组长台卡点前置
  - [x] SubTask 10.9 R3-F10 成员台活动行动作换行/收纳
  - [x] SubTask 10.10 R4-F07 日历空态 `#cal-main-empty` + 图例 `#legend-items` 槽位
  - [x] SubTask 10.11 R4-D07 DATA_MODEL 持久化字段 35→41 / personId / 状态枚举校准
  - [x] SubTask 10.12 batch 1 回归与守卫

- [x] Task 11: 修复 batch 2A（后端安全，已授权）
  - [x] SubTask 11.1 R4-B01/F02 快照写穿口按资源复算角色门；前端写入路径同步改道
  - [x] SubTask 11.2 R4-B02 `branchId:null` 与历史缺字段分离；未归属账号不得读写 br-b1
  - [x] SubTask 11.3 R4-B03 `users.patch` 字段白名单 + 目标支部等值；拒绝夹带 branchId/transferOut
  - [x] SubTask 11.4 R4-B04 思想汇报读口按 canReadThoughtReport 过滤
  - [x] SubTask 11.5 R4-F03 通知组织者写口两端口径同源
  - [x] SubTask 11.6 R4-F04 考察/考勤/待办读口按 visibility 行级投影
  - [x] SubTask 11.7 越权测试：普通成员伪造考勤/通知/思想汇报/成员字段均 403
  - [x] SubTask 11.8 不改数据模型；回归 mock-api-parity / auth / permission-gate

- [x] Task 12: 修复 batch 2B（表单 / 错误 / 金色文字）
  - [x] SubTask 12.1 R4-F05/B06/D08 `openFormModal` 接入 `form-field.js`：id/for/aria-required/aria-invalid/错误行
  - [x] SubTask 12.2 四个重点表单接入：写活动、成员流入库、工作分工、复盘批注
  - [x] SubTask 12.3 R4-F09/B05/B08 新增 `describeWriteError`：401/403/404/409/428/5xx 分流；界面不显示 HTTP 数字
  - [x] SubTask 12.4 R3-F07 nudge 动词化（写入/催办/赋权/上传）+ 表单按钮具体化
  - [x] SubTask 12.5 a11y 树断言补充 label/required/错误行
  - [x] SubTask 12.6 batch 2B 回归与守卫

- [x] Task 13: 修复 batch 2C（结构性前端）
  - [x] SubTask 13.1 R3-F01/D04 待办窄屏选中即详情（行内展开/抽屉 + 焦点恢复）
  - [x] SubTask 13.2 R3-F03/B01 日历活动条目/日期格键盘可达
  - [x] SubTask 13.3 R3-F04/B04 专班卡键盘可达 + 内层按钮 keydown 守卫
  - [x] SubTask 13.4 R3-D03/F08 六台统一 `page-frame`；删除与页签同名的 H2；`work-overview` 增加 title 参数
  - [x] SubTask 13.5 R3-D06 浮窗退出动效（expo 令牌 + 150ms 淡出，不阻塞 inert/焦点回还）
  - [x] SubTask 13.6 R3-D07 活动详情 7 处原生 confirm/prompt 迁共享浮窗
  - [x] SubTask 13.7 batch 2C 真机复核与守卫

- [x] Task 14: Part B 最终验证与提交
  - [x] SubTask 14.1 静态 / 守卫组全绿；a11y 树断言不回归
  - [x] SubTask 14.2 版本戳 bump；TIMESTAMPS / 执行日志更新
  - [x] SubTask 14.3 提交正文含 Why / What / Verification / Boundaries
  - [x] SubTask 14.4 确认未改数据模型；未重写 68 页签；临时脚本已处置

# Task Dependencies

- Task 2 / 3 / 4 / 5 相互独立，可并行
- Task 6 依赖 Task 1–5
- Task 7 / 8 可并行，依赖 Task 1 的研究结论
- Task 9 依赖 Task 7 + 8
- Task 10 依赖 Task 9
- Task 11 / 12 / 13 可并行（文件边界见 spec §7.1）；Task 11 优先于 12/13 的同一提交验证
- Task 14 依赖 Task 10–13
