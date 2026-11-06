# Checklist

## 阶段一：最小三成本

- [x] 刷新七台任一工作台后首次 Tab 落在“跳到主要内容”，不在页签条/正文中部
- [x] 页签激活只改滚动位置，不再调用 `scrollIntoView`
- [x] 顶栏 5 个常驻控件焦点环在 `#7A0010` 上 ≥3:1，键盘可辨
- [x] 侧栏抽屉打开后焦点进入首个导航项；Esc 关闭并回焦；收起时 `inert` 不吞焦点
- [x] 首页日历只有 1 个 Tab 停点；方向键移动日期，Enter 打开活动；`role=grid` 结构成立
- [x] 390 待办首屏先列表、后详情；未选中不渲染详情
- [x] org/prop/disc/leader/visitor 五台“看日历”点击有真实落点或可见说明，不再无反应
- [x] 普通成员活动详情“下一步”不再跳到无关活动的复盘列表
- [x] 普通成员首屏能看到“成员工作台”或身份说明，不再只有“工作台”
- [x] “我的处置”幽灵提示与“原…已并入本页”变更注记已删除
- [x] 阶段一定向 + daily 全绿；1440/390 真机证据已记录

## 阶段二：脏乱繁

- [x] 每页只有一个 H2 页面标题；工作台名降为面包屑/眉题或移除
- [x] 党委台首屏“支部上报”只出现一次，不再页签+H2+H3 三连
- [x] 活动/专班详情 H3/H4 顺序合法；卡头不再复述页签名
- [x] 每行只有 1 个就地主行动 + 1 个“更多”；详情不重复主行动
- [x] 卡内重复“写入活动”已删，顶栏 CTA 保留
- [x] 活动/专班详情不再把 `act-*`/`tf-*` 原始 ID 当正文徽章
- [x] 页签条组名与页签分层；390 两行或“当前组 + 更多”；右侧动作移出页签行
- [x] 溢出箭头与页签条共轴、不覆盖组名；1440 末签可见或可通过“更多”到达
- [x] `activity-calendar-tab` 的整句摘要不再压进 40×40 槽；有可访问名
- [x] 首页无照片时不出 6 张 16:9 空图位；空态一行 + 单一 CTA
- [x] 今天页空态一行 + 单一 CTA；390 统计卡等高
- [x] 帮助页 390 `documentElement.scrollWidth <= 390`；正文不被裁
- [x] 帮助页章节可折叠；390 目录存在；桌面正文行长约 34–38 汉字
- [x] 阶段二定向 + daily 全绿；1440/390 真机证据已记录

## 阶段三：其他美学

### 胶囊与下划线

- [x] `.tab-group-label` 使用主题 10% 淡底（`--app-accent-tint`），**无边框**
- [x] 胶囊 `border-radius:3px`、12px/600/0.5px、≥24px、全宽可见
- [x] 选中页签用 solid soft 底 + 更强描边，与组名淡底明显不同；不使用下划线
- [x] 全站 `text-decoration: underline` / Tailwind `underline` / `hover:underline` / `text-underline-offset` = **0**
- [x] 链接改用颜色 + 箭头/图标/底色 hover；`link-color-guard` 同步
- [x] 新增 `no-underline-guard`，故障注入可判红

### 字体与标题

- [x] 全站标题只用 1 个 display serif 族 + 固定回退；不再同屏两套宋体
- [x] 字号三档：正文 14–16 / 次要 13 / 元信息 12；12px 不承担正文
- [x] 帮助页分数 rem 归一到三档；行长/行高符合阅读
- [x] 站名/页名主次不再桌面/移动互换
- [x] 每页唯一 H2；H3/H4 顺序合法

### 加载与过渡

- [x] 页签切换超过 120ms 出现 skeleton + “正在加载”
- [x] 新内容 150–200ms 交叉淡入；总等待 ≤1s
- [x] 不再整块 `opacity` 压暗 + 插加载行硬替换
- [x] 页面跳转有顶部进度条/内容 skeleton；淡出 120ms、淡入 180ms
- [x] `prefers-reduced-motion` 只淡入 80ms，无位移；skeleton/文案保留
- [x] 新增 `loading-experience-guard`，故障注入可判红

### 色彩

- [x] 逾期数值/超期标签使用 `--status-warning-text`，白底 ≥3:1；暗色同步
- [x] 暗色侧栏选中不再借 `--status-error`；与未读红点可区分
- [x] 帮助/关于目录透明度只作用未激活圆点；激活标签 ≥4.5:1
- [x] 新增 `--color-functional-red` / `--color-functional-gold`（亮/暗）
- [x] 三会一课红与 danger 红可区分；主题党日金与 warning/主题金可区分
- [x] 功能红/金只用于徽章/圆点/左条/图例，不作大面積
- [x] 登录暗色输入使用表面 token，placeholder ≥4.5:1

### 细节与 About

- [x] 登录两个提交按钮有 `:active` 反馈
- [x] 390 统计卡统一 min-height；短标签；图标顶对齐
- [x] 六台单按钮“看日历”不再全宽 `flex-1`
- [x] 侧边栏、帮助目录、README 无 About 入口；`about.html` 文件未改
- [x] About 零入口守卫通过

### 验证与收尾

- [x] 定向：`ui-contrast` / `theme-palette` / `link-color` / `no-underline` / `loading-experience` / `ui-tab-overflow` / `ui-motion` / `page-sweep` 全绿
- [x] 真机 1440/390/暗色：胶囊无边框不撞色、无下划线、skeleton ≤1s、逾期对比、暗色选中、功能红/金、About 零入口
- [x] `npm run test:daily` 全绿（本次实跑 1634 / 1634；与交接口径 1636 差 2，见日志）
- [x] `SWEEP_SHARD=all` 三通道 0 失败且墙钟 ≤1200s（node 1636 / e2e-A 94 / e2e-B 147+1skip / 837.3s）
- [x] 版本戳 bump；中文提交（不 push）（版本 `20261026b` 已完成；本收尾任务不 commit）
- [x] 执行日志、SNAPSHOT、TIMESTAMPS、GUARD_INVENTORY、CASES/sample-diff 已更新
- **未完成 / 后续**：① `text-xs` 仍剩 **1911 处**，本批只收标题族与三档字号，未逐页迁移；② About 虽已撤导航，`docs/src/core/domain/function-catalog.js` 仍保留「关于」功能卡（不在本批写权面，未删）；③ daily 本次实跑 **1634**，与交接口径 **1636** 差 2 条，差异来源待下批复核；④ `about.html` / `about-entry.js` 文件保留，仅撤路由，不作页面清单 / 导航入口。
