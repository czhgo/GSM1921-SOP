# Tasks

> 执行纪律：三个子专项**严格顺序**；每个子专项内部 3–4 个代理并行，每个代理只用一个独立 skill。上一阶段验证通过才进入下一阶段。
> 文件写权：同一文件同一时间只给一个代理；跨文件才并行。`styles.css` 在第三阶段只给一个代理写，其余代理提交 token/选择器清单。

## 阶段一：最小三成本（3 个并行代理）

- [x] Task 1: 信息成本 / 布局（`better-layout`）
  - [x] SubTask 1.1 390 待办：列表在前、详情在后；未选中不自动渲染详情；选中后再显示或改抽屉。落点 `todo-tab-shell.js`、`todo-list.js`。
  - [x] SubTask 1.2 信息层级：首页/今天页首屏只保留一个“下一步”重心；空态合并为一行 + 单一 CTA（与阶段二空态同一实现，先做结构）。
  - [x] SubTask 1.3 页签条溢出不在本任务重做结构；只记录 390 当前组/页签可见性，交给阶段二。

- [x] Task 2: 操作成本 / 键盘（`better-accessibility`）
  - [x] SubTask 2.1 首次 Tab 落“跳到主要内容”：移除 `tab-bar.js` activate 中的 `scrollIntoView`，改 `scrollLeft`；补 Playwright 断言。
  - [x] SubTask 2.2 顶栏焦点环：`#app-header` 作用域覆盖为白/党徽金，对 `#7A0010` ≥3:1；不改全站 token。
  - [x] SubTask 2.3 侧栏抽屉：打开焦点进入首个导航项；Esc 关闭并回焦；桌面断点恢复常驻或至少把侧栏排到顶栏动作之前。
  - [x] SubTask 2.4 首页日历：`role=grid` + roving tabindex（当前日 0、其余 -1），方向键/Enter；活动条独立停点。
  - [x] SubTask 2.5 守卫：新增/扩展焦点起点、顶栏焦点对比、日历 Tab 停点断言。

- [x] Task 3: 学习成本 / 入口连续性（`better-writing`）
  - [x] SubTask 3.1 “看日历”五台映射：org/prop/disc/leader/visitor 的 `onNav('calendar')` 指到工作概况日历卡或活动动态；无承载面则删入口并给说明。
  - [x] SubTask 3.2 活动“下一步 · 复盘”：仅本场组织者/深度参与者渲染；否则报名/议程/无待办；落点未命中说明原因。
  - [x] SubTask 3.3 普通成员身份：页题改“成员工作台”，恢复已写好的欢迎语或一行“普通成员”说明；不恢复右上角色徽章。
  - [x] SubTask 3.4 术语：删“我的处置”幽灵提示与“原…已并入本页”变更注记；统一“待答复 / 我经办的反馈”。

- [x] Task 4: 阶段一验证
  - [x] SubTask 4.1 定向：`tab-nav` / `ui-tab-overflow` / `ui-first-screen-order` / `todo-urgency` / `page-sweep` / `a11y-tree`。
  - [x] SubTask 4.2 真机 1440/390：首次 Tab、日历键盘、390 待办顺序、看日历落点、普通成员身份。
  - [x] SubTask 4.3 `npm run test:daily` 全绿后进入阶段二。

## 阶段二：脏乱繁（3 个并行代理）

- [x] Task 5: 页标题与重复动作（`web-design-guidelines`）
  - [x] SubTask 5.1 页标题单层：静态台名降为面包屑/眉题或移除；页签 H2 成为唯一页面标题；党委台“支部上报”只出现一次。
  - [x] SubTask 5.2 卡头不复述页签名；活动/专班 H3/H4 顺序合法。
  - [x] SubTask 5.3 重复动作：每行 1 个就地主行动 + 1 个“更多”；详情不重复主行动；删卡内重复“写入活动”，保留顶栏 CTA。
  - [x] SubTask 5.4 内部语清理：活动/专班详情不显示 `act-*`/`tf-*` 原始 ID；变更注记移出界面。
  - [x] SubTask 5.5 守卫：`page-title-guard` 覆盖 `renderTabHeader`；页标题唯一/H3-H4 顺序断言。

- [x] Task 6: 页签条结构与空态（`uicraft`）
  - [x] SubTask 6.1 页签条分层：组名与页签分开；390 两行（组名行 + 页签行）或“当前组 + 更多”；右侧动作移出页签行。
  - [x] SubTask 6.2 溢出：箭头与页签条共轴、不覆盖组名；显示“还有 N 个”或对齐的更多按钮；1440 放开到容器可用宽度。
  - [x] SubTask 6.3 40px 折叠摘要：`activity-calendar-tab` 的整句摘要不再塞进 40×40 槽；改短标签/图标 + aria-label。
  - [x] SubTask 6.4 空态：首页无图不出 16:9 大卡；今天页空态一行 + 单一 CTA；统计卡统一 min-height。
  - [x] SubTask 6.5 守卫：`ui-tab-overflow`、`ui-home-hero`、`home-workgroup-progress`、`responsive-cards-guard`。

- [x] Task 7: 帮助页密度（`better-typography`）
  - [x] SubTask 7.1 390 无整页横溢：`.help-layout` `align-items:stretch`，`.help-main`/`.doc-card` `min-width:0;width:100%`；表格容器自身横滚。
  - [x] SubTask 7.2 章节折叠 + 页首目录：按 8 章折叠；390 目录不消失；搜索保留。
  - [x] SubTask 7.3 行长/行高：桌面正文行长收到约 34–38 汉字；行高回到 1.7–1.8；分数 rem 归一到三档。
  - [x] SubTask 7.4 守卫：390 `scrollWidth<=390`、章节可折叠、目录存在；`help-e2e` 保留。

- [x] Task 8: 阶段二验证
  - [x] SubTask 8.1 定向：`page-title-guard` / `ui-tab-overflow` / `ui-redundancy-guard` / `copy-screen-guard` / `help-e2e` / `page-sweep`。
  - [x] SubTask 8.2 真机 1440/390：页标题、页签条、空态、帮助折叠与无横溢。
  - [x] SubTask 8.3 `npm run test:daily` 全绿后进入阶段三。

## 阶段三：其他美学（4 个并行代理）

- [x] Task 9: 胶囊、下划线、字体与页标题（`frontend-design`，唯一写 `styles.css`）
  - [x] SubTask 9.1 胶囊：新增 `--app-accent-tint`（亮/暗，10% 主题淡底）；`.tab-group-label` 无边框、3px、12px/600/0.5、≥24px；选中页签改 solid soft + 更强描边，不用下划线。
  - [x] SubTask 9.2 全站文本下划线清零：110 处/54 文件；链接改颜色 + 箭头/图标/底色 hover；更新 `link-color-guard` 与新增 `no-underline-guard`。
  - [x] SubTask 9.3 字体族：1 个 display serif + 固定回退；页头/卡标题不再两族；字号三档（14–16 / 13 / 12），12px 退回标签/元信息。
  - [x] SubTask 9.4 页标题：与阶段二同源，确认唯一 H2；站名/页名主次不再桌面/移动互换。

- [x] Task 10: 加载与过渡（`design-with-taste`）
  - [x] SubTask 10.1 页签切换：skeleton + “正在加载”；150–200ms 交叉淡入；总 ≤1s；取消整块压暗/插加载行硬替换。
  - [x] SubTask 10.2 页面跳转：顶部 2px 进度条 + 内容 skeleton；淡出 120ms / 淡入 180ms；禁止白屏硬跳。
  - [x] SubTask 10.3 减少动效：只淡入 80ms，无位移；skeleton/文案保留。
  - [x] SubTask 10.4 新增 `loading-experience-guard`：skeleton、淡入、≤1s、无压暗硬替换、reduced-motion 分支；故障注入。

- [x] Task 11: 色彩角色（`better-colors`，只提交 token/选择器清单，CSS 由 Task 9 代理合并）
  - [x] SubTask 11.1 逾期文字：新增 `--status-warning-text`（白底 ≥3:1），不再用 `#F59E0B` 当正文；暗色同步。
  - [x] SubTask 11.2 暗色选中：侧栏选中改主题 soft/角色色，不再借 `--status-error`。
  - [x] SubTask 11.3 目录透明度：只作用未激活圆点；激活标签不透明，≥4.5:1。
  - [x] SubTask 11.4 功能红/金：新增 `--color-functional-red/gold`（亮/暗），三会一课/主题党日使用；与 danger/warning/主题 accent 分离；小面积使用。
  - [x] SubTask 11.5 登录暗色输入：补 `--surface-card`/`--surface-elevated`，placeholder ≥4.5:1。
  - [x] SubTask 11.6 守卫：`ui-contrast-guard`、`theme-palette-guard`、`activity-tone-guard`。

- [x] Task 12: 细节与手感（`better-ui`，非 `styles.css` 文件）
  - [x] SubTask 12.1 登录按钮 `:active` 反馈（实底加深/描边压），或改用 `.btn-accent`/`.btn-outline` + `.motion-press`。
  - [x] SubTask 12.2 390 统计卡统一 min-height；短标签；图标顶对齐。
  - [x] SubTask 12.3 六台“看日历”单按钮不 `flex-1`；详情页内部 ID/错误条/无权提示按阶段二口径收口。
  - [x] SubTask 12.4 About 撤路由：删侧边栏“关于”、帮助目录“关于”、README 指针；`about.html` 文件不改。
  - [x] SubTask 12.5 守卫：About 零入口、统计卡等高、登录按压态。

- [x] Task 13: 阶段三验证与收尾
  - [x] SubTask 13.1 定向：`ui-contrast` / `theme-palette` / `link-color` / `no-underline` / `loading-experience` / `ui-tab-overflow` / `ui-motion` / `page-sweep`。
  - [x] SubTask 13.2 真机 1440/390/暗色：胶囊无边框与不撞色、无下划线、skeleton/≤1s、逾期对比、暗色选中、功能红/金、About 零入口。
  - [x] SubTask 13.3 `npm run test:daily` + 全量三通道；版本戳 bump；中文提交（不 push）。
  - [x] SubTask 13.4 执行日志、SNAPSHOT、TIMESTAMPS、GUARD_INVENTORY、CASES/sample-diff 更新。

# Task Dependencies

- 阶段一（Task 1–3）并行；Task 4 验证通过后才能进入阶段二。
- 阶段二（Task 5–7）并行；Task 8 验证通过后才能进入阶段三。
- 阶段三（Task 9–12）并行；Task 9 是 `styles.css` 唯一写者，Task 11 提交 token/选择器清单由 Task 9 合并；Task 12 只写非 `styles.css` 文件。
- 任何阶段不得跳过上一阶段验证；不得为了并行让两个代理同时写同一文件。
