# Checklist

## 一、归因

- [x] 首页抬头删除提交与行号已确认
- [x] 金色变棕提交与令牌已确认
- [x] 党委台数据实测已同步，无计算盲区结论已写

## 二、首页抬头

- [x] 党徽 48px 出现
- [x] 组织名标题为动态支部名
- [x] 未登录不出现硬编码示例支部名
- [x] 副标题存在
- [x] 顶栏 H1 保留
- [x] `ui-home-hero` 守卫通过

## 三、金色与按钮前景

- [x] 默认金为 `#F5C518`
- [x] 金底主 CTA 为深字 `#1F2937`
- [x] 非金色角色仍白字
- [x] `.btn-accent-soft` 使用可读深字
- [x] `--app-accent-ink` / `--app-accent-text` 在四个注入点同源
- [x] 金色/前景对守卫通过

## 四、半透明按钮体例

- [x] 高频动作恢复 `btn-accent-soft`
- [x] 取消/中性/低频保留 `btn-outline`
- [x] 四类按钮体系未撤销
- [x] 按钮守卫通过，基线只降不升

## 五、党委台支部管理

- [x] 活动 / 专班 / 通知三列出现
- [x] summary 缺失显示「—」
- [x] 行内「名册」可展开
- [x] 名册含 50 人且可按 branchId 过滤
- [x] 「查看该支部」保留
- [x] 真机 e2e 读数 50/21/35/8/14 与 50 人名册

## 六、Part A 验证与提交

- [x] 静态 / 守卫组全绿
- [x] a11y 树断言不回归
- [x] 首页 1440 / 390 截图
- [x] 版本戳更新
- [x] TIMESTAMPS / 执行日志更新
- [x] commit 含 Why / What / Verification / Boundaries
- [x] 临时脚本与证据已处置

## 七、Part B：Round 3 三 lens

- [x] `frontend-design` / `design-with-taste` / `uicraft` 各自独立
- [x] R3 输入清单逐条有结论
- [x] 每条有现象 / 证据 / 影响 / 建议 / 严重度 / 冲突

## 八、Part B：Round 4 三 lens

- [x] `fullstack-developer` / `domain-modeling` / `backend-architect` 各自独立
- [x] R4 输入清单逐条有结论
- [x] 服务端写口 / 权限链 / 数据模型只读审查，未改后端

## 九、Part B：合并与修复

- [x] `.ctx/AUDIT_ROUND3_4_COMBINED.md` 落盘
- [x] 六路结果 + 共识 / 分歧 / 待裁定齐备
- [x] 只开一次 frontier
- [x] 未回答项保持「待裁定」
- [x] 修复 batch 1 已落并有守卫
- [x] 修复 batch 2 已落并有守卫
- [x] 未一次性重写 68 页签

## 十、Part B：最终验证与提交

- [x] 静态 / 守卫组全绿
- [x] a11y 树断言不回归
- [x] 版本戳更新
- [x] TIMESTAMPS / 执行日志更新
- [x] commit 含 Why / What / Verification / Boundaries
- [x] 未改数据模型 / 表结构（授权范围内只改授权与写门）

## 十一、边界

- [x] 未撤销四类按钮体系
- [x] 未改首页区块顺序
- [x] 未把 `.btn-ghost` 恢复为动作按钮

## 十二、batch 2A/2B/2C 专项

- [x] 快照写门 / branchId null / users.patch 白名单 / 思想汇报读口 4 项越权测试通过
- [x] openFormModal label/for/required/errors 与四表单接入
- [x] describeWriteError 状态码分流；界面无 HTTP 数字
- [x] 待办窄屏 / 日历键盘 / 专班卡键盘 / 概况标题参数化
- [x] 浮窗退出动效与活动详情 7 处对话框
- [x] 未改数据模型；宽表卡式化与活动创建事务转后续
