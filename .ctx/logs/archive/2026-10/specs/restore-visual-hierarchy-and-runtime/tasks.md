# Tasks

> 边界：本批先修**正确性**，再修**视觉体系**，最后统一**详情入口**。顺序不可倒：渲染不稳时做视觉验收没有意义。
> 并行边界：Task 1（运行时）与 Task 3（视觉基础）文件不重叠，可并行；Task 2 依赖 Task 1；Task 4 依赖 Task 3 的间距/容器；Task 5 依赖 Task 3/4；Task 6 依赖 Task 3/5；Task 7 最后。

- [x] Task 1: 运行时正确性（Tab 渲染 / 绑定 / loading）
  - [x] SubTask 1.1 renderCtx 改为函数或每次点击取最新 state：`workspace-shell.js` 的 `_renderCtx(state)` 不得只在建栏时算一次；`tab-bar.js` 点击时用最新上下文。补一条可复现测试（切月 → 切走 → 切回）。
  - [x] SubTask 1.2 统一 render 生命周期：`_safeRender` 与 `_renderCurrentTab` 共用同一套（seq、`_renderInFlight` 去重、切换前清 `dataset.currentTab`、等待 Promise、失败可见、陈旧写回丢弃）；`activate()` 返回 Promise 或回调。
  - [x] SubTask 1.3 静默早退与无 catch 的 import 全部补可见错误：`ws-secretary-entry.js`、`overview-tab.js` 的动态 import、`calendar.js` 的节点缺失、各 tab 的容器缺失；统一显示「加载失败，重试」入口。
  - [x] SubTask 1.4 loading 超时恢复：占位 `pointer-events:none` 必须有超时（如 8s）与恢复；promise 永不落定时不得永久灰化；骨架无限动画在超时后停止。
  - [x] SubTask 1.5 绑定幂等：把 `calendar-tab.js` 的 `calFiltersBound`、`visitor/activities-tab.js` 的 `organizerEntryBound`、`org/talent-tab.js` 的 `talentJumpBound` 标记改挂到被重建的元素自身或改事件委托；补「离开再回来筛选仍生效」测试。
  - [x] SubTask 1.6 隐藏/回退页签可见说明：`resolveTargetTab` 回退首个 tab 时给 toast/页内说明，不得「点 A 亮 B」无提示。

- [x] Task 2: 关键性能（首屏 / 鼠标卡帧）
  - [x] SubTask 2.1 600ms 延迟改为可配置（默认降到 ≤120ms，测试/演示可调），并只在需要模拟网络的路径 await；首屏活动+任务并行等待不再硬推迟 600ms。
  - [x] SubTask 2.2 去双 `loadDB`：`workspace-shell.js:273-277` 与 `data-loader.js:58` 合并为一次；每页只做一次种子修复 + `applyDerivedFacts`。
  - [x] SubTask 2.3 首屏串行 await 收敛：`IssueStore.loadAll` / `MilestoneStore.loadAll` 不阻塞 tab 壳，改为壳后再取或并行；版本过期 reload 只在确实需要时触发。
  - [x] SubTask 2.4 鼠标卡帧三源：日历 hover 浮窗改为「先读后写」或 rAF 批处理、限制浮窗 box-shadow 面积；全局 MutationObserver 只观察必要容器或改为「新增 select 的父级」；`setState` 整块重建加去重/节流（与 Task 1.2 同源）。
  - [x] SubTask 2.5 给三条可测基线：首屏模块请求数、首屏内容出现时间、hover 帧间隔 p95；把读数写进执行日志（不设不可达目标，只记录改善）。

- [x] Task 3: 视觉基础（容器 / 间距 / 表格 / 胶囊）
  - [x] SubTask 3.1 容器语义：`metric-band` 拆 `--static` / `--interactive`；`.card` 的 `section` 只保留带 `aria-label` 的 8 处，其余统一 `div`；`.list-row` 四种载体登记为「展示行/导航行/动作行/主从行」并各给唯一类；删除 `section.metric-band` 与 `div[role=group].metric-band` 的混用。
  - [x] SubTask 3.2 间距：卡内分组 8px / 16px；`metric-band__item` `gap` 从 0 改 8–12px，去掉除首项外的左线；`todo-urgency-header` 4px→8px；`disclosure__body` 4px→8px。
  - [x] SubTask 3.3 竖条与中性色：`today-go` 的 gap 从被 `!important` 压成的 4px 改回 8px（改族口径或 `.today-go` 专属规则）；`neutral-400` 只留装饰，数据零值/可点箭头/状态点改 `neutral-600` 或主题 soft-text。
  - [x] SubTask 3.4 表格：`.wo-lines-table` 与 `.data-table` 关键表加 `table-layout: fixed` + 列宽模板（工作分工/负责人/在办/逾期/待处理）；末列内容贴列尾；≤640 卡片化时动作列 `justify-content:flex-start`；首列 `nowrap` 保留但给最大宽。
  - [x] SubTask 3.5 分组胶囊：**所有宽度可见**，不设 1024/1280 隐藏阈值；窄屏缩小内边距/字号并让页签条横向滚动；形状对比 ≥1.5:1（描边或更深底），高度 ≥24px；删除 `display:none` 规则。
  - [x] SubTask 3.6 守卫：`ui-control-system-guard` 增「同 class 同语义」「胶囊全宽可见且高度 ≥24」「关键表 fixed」；`docs-governance` 的卡头断言不回归。

- [x] Task 4: 色彩分工（主题色层 + 功能色层）
  - [x] SubTask 4.1 主题色层推广：把现有 7 主题 × 亮/暗 × 9 token 写成可复用标准（适用范围、状态组合、禁止借用项），在设计系统中单列「主题色层」；不改动已验证的色盘值，只补表达规则与消费者清单。
  - [x] SubTask 4.2 功能色层：`--functional-*` → `--status-*`；新增 `--color-category-*`、`--color-identity-*`、`--color-link`、`--color-border-subtle/strong`、`--color-text-primary/secondary/tertiary`；功能色只在徽章/圆点/左条/图例使用。
  - [x] SubTask 4.3 身份色单一源：`--accent-<role>` 与 `ROLE_COLORS` 合并；help / inspector / 角色卡只读同一值；删除 CSS 第二份值。
  - [x] SubTask 4.4 暗色分离：三会一课类别红/金与 danger/warning 分开取值；`badge--brand` 不再借 `--functional-error`；暗色对比重新测。
  - [x] SubTask 4.5 链接全量收口：`.help-note__link`、速查链接、角色色链接、about/help 内联蓝链全部并入 `--color-link`；链接必须有下划线或箭头；箭头不得 `neutral-400`；角色色只留左条/图标。
  - [x] SubTask 4.6 删除零消费者 token（`--accent-sky/indigo/violet/blue/emerald/amber`、`--status-live`、`--blue-hover`、`--sky-hover`、`--error-dark`、`--brand-amber-dark` 等 12 个）或在 token 表登记「保留理由」；`theme-palette-guard` 增「僵尸 token 零消费者」。
  - [x] SubTask 4.7 小面积恢复功能色：徽章/圆点/左条/图例恢复状态 4 色与类别 3 色；大面积仍中性；不得恢复渐变卡头与彩色按压；主题色盘本身不改。

- [x] Task 5: 按钮三档与可点性
  - [x] SubTask 5.1 定义并落地三档：动作按钮（描边/底色）、纯文字动作（下划线或箭头，箭头非 neutral-400）、图标按钮（32 视觉 + 44 命中）；行载体（可见 hover 或左条）。
  - [x] SubTask 5.2 清 `btn-ghost` 动作用法（79 处）：`today-tab` 的「写入活动/看日历/全部」、`work-overview` 的筛选 chip 与「去待办」行、`list-row` 动作行等按三档迁移；`btn-ghost` 只留非动作行载体。
  - [x] SubTask 5.3 hover/active 对比：`--surface-hover` 与页面底/卡片的色差 ≥1.2:1；可点行 hover 需同时改变底或边；焦点态保持主题色环。
  - [x] SubTask 5.4 守卫：`ui-control-system-guard` 增「btn-ghost 不得用于动作按钮」「纯文字动作必须有下划线或箭头」「图标按钮有 44 命中区」；`frontend-foundations-guard` 的伪可点断言扩展。

- [x] Task 6: 详情路由（直达 vs 定位）
  - [x] SubTask 6.1 新增 `resolveObjectRoute({type,obj,viewer,entry})` 纯函数：返回 `{mode:'direct'|'locate'|'none', href, readOnly, reason}`；矩阵覆盖 状态 × 入口 × 角色，并给每个入口标注「为什么不是另一种」。
  - [x] SubTask 6.2 落地 direct：通知/待办对象卡、跨页分享/深链、非所属工作台入口 → `activity.html?id=` / `taskforce.html?id=`；已归档仍 direct 但只读。
  - [x] SubTask 6.3 落地 locate：入口已在对象所属工作台（支书活动管理、组织台专班管理、成员项目分工等）→ 同页预览 + 「打开完整页」；不得整页跳走丢失筛选/列表上下文。
  - [x] SubTask 6.4 已归档只读：`activity-entry` 的 `canManageMembers` 纳入 `archived`；归档详情显示只读说明；组织台终态与归档库终态统一 `isTerminal`；归档弹窗补「打开完整页」。
  - [x] SubTask 6.5 门与提示：缺 id 不渲染可点入口；跨支部调用 `canViewObjectDetail` 并提示；归档库深链校验状态与失败提示；组织台 `?taskforceId=` 失败提示。
  - [x] SubTask 6.6 可点 affordance 与键盘：`taskforce-view`、`visitor/projects-tab` 卡、`inspector` 卡补 `role/tabindex/keydown`；宣传档案五类行补 hover/下划线/箭头；移除活动风采整卡 `cursor:pointer` 或整卡可点二选一。
  - [x] SubTask 6.7 守卫：新增/扩展 1 个「对象入口」断言（空 id、可点节点可键盘、已归档只读、每个入口必须声明 mode 且与实际 href 一致、同页不得出现两种完整详情面）。

- [x] Task 7: 规范、判例与验证
  - [x] SubTask 7.1 `DESIGN_SYSTEM` 增 SD-41（容器语义）、SD-42（胶囊可见）、SD-43（按钮三档）、SD-44（表格列模板）、SD-45（详情单一承载面）；`CASES.md` 增 CASE-DESIGN-020…023；`PRODUCT_IA` 增详情入口矩阵。
  - [x] SubTask 7.2 sample-diff 五列：把支书 7 条视觉 + 2 条运行时反馈逐条写「样本 / AI 假设 / 人类意图 / 泛化规则 / 守卫」，落判例库与执行日志。
  - [x] SubTask 7.3 执行日志批次 512 六节 + SNAPSHOT 5 行 + TIMESTAMPS 刷新 + GUARD_INVENTORY 扩展记录。
  - [x] SubTask 7.4 验证：定向（ui-control/theme/link/docs/runtime）→ daily → 全量三通道；版本戳 bump；中文提交（不 push）。

# Task Dependencies

- Task 2 依赖 Task 1 的生命周期与去重（先稳再快）。
- Task 4 依赖 Task 3 的 token 与间距落点；Task 5 依赖 Task 3/4 的控件与色板。
- Task 6 依赖 Task 3/5 的 affordance 与容器；Task 1/3 可并行（运行时 vs 样式）。
- Task 7 最后写，避免与前面守卫重复。

> **回勾依据（2026-10-27 批次 515）**：本文件剩余未勾项经复核均已落地（守卫已存在 / 已提交批次）；逐条依据见 `.ctx/logs/archive/2026-10/specs/SPECS_INDEX.md`。
