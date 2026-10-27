# Checklist

> 每条都必须能用「代码/真机/守卫」之一判定；不能判定的条目应在 spec 中降级为「报告项」。

## 审查

- [x] `.ctx/logs/2026-10-AUDIT_UI_R11.md` 已产出，覆盖字体/字号/颜色/间距/圆角/控件/按钮/空态/密度/文案
- [x] 每条「繁」都有「删什么 / 为什么无新增信息 / 删后仍能完成什么」，无「此地无银」式删减
- [x] 支书本轮 9 条反馈逐条对到具体 `file:line`
- [x] SD-1…SD-11 已落成可断言清单

## 控件层

- [x] `.input-flat` 与 `.input-flat-sm` 都声明背景、1px 中性描边、8px 圆角、13px 字号、行高、placeholder、focus
- [x] 全仓无 `input-flat … text-sm`（0 处；原 5 处）
- [x] 全仓无控件上的 `rounded`/`rounded-lg` 覆盖（0 处；原 2 处）
- [x] 全仓无文本/日期/下拉/多行控件使用无颜色 `border`（0 处）
- [x] 所有日期控件与文本控件同高（38px / 紧凑 32px）
- [x] 搜索类输入（person-picker / help / cs-search）与 `.input-flat` 同描边、同 8px 圆角、同焦点环
- [x] 真机抽检 5 处无黑边、无缺描边、圆角一致

## 按钮

- [x] 尺寸为 36（标准）/ 32（紧凑）/ 28（小号）；`.btn-sm` 为 28px
- [x] 页头/空态/弹窗主行动＝主题实底白字；卡片内＝浅主题底深主题字；工具位＝白底中性描边深灰字；行内辅助＝无框
- [x] 全仓不存在「白底 + 主题色文字」的按钮（0 处）
- [x] `.btn-accent-soft` 背景不为白/近白，且有同色系 1px 描边
- [x] 行内动作水平内边距 ≥10px、图标与文字间距 ≥6px；同一行最多一个浅底按钮
- [x] 本批触碰的按钮不再依赖被 `!important` 覆盖的死工具类

## 页签

- [x] 七个工作台桌面端每个分组都显示非空组名（含首组）
- [x] 组间有 1px 分隔线；分隔线 `aria-hidden`
- [x] ≤1280px 只隐藏组名、保留分隔；≤1024px 页签不换行、不遮挡末页签
- [x] 党委台单组场景有可见组名

## 今天 / 待办

- [x] 指标带为白底 + 中性描边 + 12px 圆角；不再使用 `neutral-50` 整块底
- [x] 逾期为 0 时不显示警示色；大于 0 时显示
- [x] 今天页与待办字号只用 12/13/14/16；`text-[10px]`/`text-[11px]` 计数为 0
- [x] 今天页空态与正常态共用同一标题行（含「全部 ›」）
- [x] 卡片标题 16 / 段标题 14 / 行标题 13–14 / meta 12，层级不再倒置

## 披露控件

- [x] `summary` 全局无 UA 三角（33 处统一）
- [x] 每处恰有一个 chevron，展开态方向改变
- [x] 键盘 Enter/Space 行为不变
- [x] 逐点 `list-none` 例外已删除

## 反馈（toast）

- [x] 成功提示只依赖本次动作自己的写结果
- [x] A 失败/B 成功并发时互不污染
- [x] catch 后不得再报成功（`activity-entry` / `activity-materials-entry` / `issues` / `review-tab` 四处已修）
- [x] 失败文案按 401/403/408/409/5xx 分级，不显示原始异常/状态码
- [x] error 使用 `role="alert"`；toast 可关闭、悬停暂停、同文案去重、最多 3 条
- [x] 「保存中」过渡态被最终结果替换，不叠加
- [x] `feedback-integrity.test.mjs` 四类场景全绿

## 反馈（弹窗）

- [x] 打开锁滚动、关闭恢复
- [x] 焦点陷阱：Tab/Shift+Tab 在弹窗内循环
- [x] 提交中 Esc/遮罩/×/取消均不能关闭，且 `aria-busy=true`
- [x] 有未保存改动时关闭二次确认
- [x] 错误区 `role="alert"`；字段错误被播报，修正后清 `aria-invalid`
- [x] `onSubmit` 返回 `undefined` 不再被当成功；未知字段类型开发期报错
- [x] 原有原生 `prompt()/confirm()` 三处已移除
- [x] 真机抽检五个弹窗全部通过

## R10 P3

- [x] R6 P3 21 条逐条有改前/改后/依据
- [x] R7 P3 仍存在 18 条逐条处理（空值词表、快照语义、角色单一源、演示数据一致）
- [x] `party-committee-meeting-entry.js` 9 处帮助注释已迁
- [x] 对账表完整；无「批量替换后无法定位」条目

## 拆表闸门

- [x] C2 已埋点并可查询「同一行 7 天 409」次数
- [x] C4 已保留 ≥7 天影子比对历史
- [x] `schema-split-readiness.mjs` 读取真实 C2/C4，输出 C1–C5 读数与证据
- [x] 脚本仍输出 `NOT_READY`（C5 未裁）；读路径仍走 JSON
- [x] 守卫断言「`NOT_READY` 时读路径不得切到影子表」

## 治理文档

- [x] 乙部 8 条已完成条目已删除
- [x] `B-504-1` 判据正文已迁到脚本 + `DATA_MODEL`，5 处外部引用已改指
- [x] `B-503-2` 残项已迁到 `ENGINEERING_ASSESSMENT.md`
- [x] `B-500-4`、T-903、「评议待办 · 执行型」空表头仍在
- [x] `doc-consistency` / `ctx-hygiene-guard` / `timestamps-note-guard` / `frontmatter-freshness` 全绿
- [x] `TIMESTAMPS` 与 `DESIGN_SYSTEM`（组件层）已同步

## 验证与交付

- [x] 第 1 次定向测试全绿
- [x] 第 2 次 `npm run test:daily` 全绿
- [x] 第 3 次 `SWEEP_SHARD=all` 三通道 0 失败
- [x] 全程套件级运行不超过 3 次；红项只单跑失败文件诊断
- [x] 版本戳已 bump；中文提交（不 push），含 Why / What / Verification / Boundaries
- [x] 执行日志与本 spec 的 `tasks.md` 已勾选
