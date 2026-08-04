# about 页 v5「电影镜头流」重构设计

> 状态：已获书记裁决（2026-08-04）｜对应文件：`docs/src/entries/about-entry.js` / `docs/src/styles.css` / `docs/about.html`
> 基准：v4（未提交）+ 浏览器实测取证 + web-design-guidelines + improve-animations 标准

## 一、背景与目标

书记连续三轮对 about 页"交互效果"不满意，核心落点（书记自评）：**质感不足、触发时机别扭、不连贯像拼贴**，且背景"太黄"。

浏览器实测（v4）确认：叠层/卡片 scrub/探索区 sticky 均**已生效**，但**终章全屏扩展断头**（Phase B end=9354 超出 maxScroll=9071，仅播 46%）、Cognition 左右分栏未落地、字体未 preload。

**v5 目标**：以"电影镜头流"为统一交互语言重铸全页，一次解决不连贯与触发别扭；修掉终章断头 bug；背景统一淡暖白；顺势放大油墨宋的噪点斑驳肌理，做出"高级印刷质感"。

## 二、书记四项裁决（2026-08-04 AskUserQuestion）

| 维度 | 裁决 |
|---|---|
| 交互骨架 | **A 电影镜头流**——全页一种连续镜头语言，章节像镜头推拉连续交接，终章光圈式全屏扩展 |
| 背景色 | **淡暖白 #FAF8F4** 全页统一（去掉"太黄"，保留纸感但不抢眼） |
| 滚动吸附 | **重新校准停靠**——吸附保留但停靠点精确对准每章头部，柔和磁性不生硬 |
| 噪点风格 | **顺势放大**——南西油墨宋自带噪点斑驳肌理，与纸张噪点呼应做高级印刷质感（**不下载/不调用** gc-minimal-zine-poster skill） |

## 三、交互系统设计「电影镜头流」

### 1. 镜头连续性（治"拼贴"）
- 每一章是一个"镜头场景"；**场景间连续交接，无硬切**：旧场景整体后拉（scale 0.97 + yPercent −3.5 + brightness 0.92），新场景从下方滑入覆盖。
- 全页只有一套"镜头运动语言"，任何元素出现都必须从"某处"移到"某处"（方向一致，无凭空出现）。
- 统一 easing tokens：
  - `--ab-ease-cine: cubic-bezier(0.77, 0, 0.175, 1)` —— 移动/形态变化（镜头推拉、场景交接）
  - `--ab-ease-out: cubic-bezier(0.16, 1, 0.3, 1)` —— 入场元素
  - 严禁 `ease-in` 用于 UI 入场（improve-animations 硬规则）；不得裸 `linear` 入场。

### 2. 胶片时间码（叙事锚点）
- 页面右上角固定角标 `00:00:00:00`（FILM 标签 + 24fps 电影帧），由滚动进度驱动。
- 作用：让用户意识到"这是一部片子"，章节间的时间连续感被视觉化，直接强化"连贯"的感知。

### 3. 章节入场
- 章节标题（壹/贰/叁…）从下方"驶入"到位：yPercent 60→0，scrub 可逆，与新场景交接同步发生（不是各自触发）。
- 章节标题统一**党建红**（`--ab-red`），保留 v4 已修正的红色回归。

### 4. 卡片动画（治"粗糙"）
- 全部滚动驱动、**可逆**（回滚复原，杜绝"一次性淡入"）。
- 入场形态：y 30→0 + scale 0.97→1 + opacity，逐卡 stagger 0.08s（符合 30–80ms 错峰标准）。
- 只动画 `transform` / `opacity` / `clip-path`（compositor 友好）；blur 保持 <20px。
- 印刷凭证式细节保留（序号眉题/细描边/纸面渐变），但入场方式统一为镜头语言。

### 5. 终章全屏扩展（修断头）
- 结构：`renderConclusion` 保持纯宣言式「管理事，服务人」大字 + lead 引语（**无 seal**）。
- 动画：深党建红 #7A0010 全屏 + 光圈（`clip-path: circle()`）从底部展开 + 金色大字 scale 0.88→1 压入 + letter-spacing 0.3em→0.1em。
- **断头修复**：终章全部触发器改用 `start:'top bottom'` / `end:'bottom bottom'`，保证滚到底时进度 100%（v4 的 end 越界 bug 根因即触发器区间超出 maxScroll）。

### 6. 吸附重新校准（治"位置尴尬"）
- 停靠点 = **每章标题头部**（重算偏移，替换 v4 的 0.36 生硬值）。
- 柔和磁性：`duration: {min:0.35, max:0.7}` + `ease: power2.out` + 轻微 delay（0.1s），不强制整屏、不夺轮。

### 7. 背景统一 + 高级噪点（治"太黄"与"质感"）
- 全页背景统一 `#FAF8F4`（替换 v4 各章的浓黄 #FBF5E6/#F6EEDC）。
- 纸张噪点肌理保留但更克制：opacity 0.05 → **0.035**，`mix-blend-mode: multiply`。
- **顺势放大油墨宋噪点**：南西油墨宋（NanxiYoumosong）大标题的斑驳墨迹与纸张噪点形成同频呼应——这是"高级印刷质感"的核心来源，无需额外下载任何 poster skill。

### 8. 字体
- 油墨宋应用范围：hero 大标题 / 章节标题 / 终章大字（大字号展示，充分发挥斑驳肌理）。
- 正文保持无衬线（Noto Sans SC）。
- 补 `<link rel="preload" as="font">` 加载南西油墨宋 woff2（web-design-guidelines：关键字体必须 preload + `font-display: swap`）。

## 四、技术约束与已知陷阱（浏览器取证沉淀）

| 陷阱 | 对策 |
|---|---|
| `overflow:hidden` 杀 sticky/pin | 仅终章专用；全局用 `overflow-x: clip` |
| 3D rotateX 叠层致横向溢出 | 叠层只用纯 2D transform + clip-path，不用 perspective/rotationX |
| 触发器 end 越界 → 动画断头 | 终章统一 `start:'top bottom'` / `end:'bottom bottom'` |
| scrub 初始态撑文档高度 | 所有 scrub 均 `immediateRender: false` |
| 一次性入场遭书记否定 | 卡片/章节/标题全部 scrub 可逆 |
| reduced-motion 缺失 | 保留 `gsap.matchMedia()` 双分支（no-preference / reduce→静态） |
| 并行 Edit 覆盖 | 同一文件改动串行执行 |

## 五、改动清单

### `docs/src/entries/about-entry.js`
1. 新增 `bindCameraFlow()`：统一入口（替换 v4 的 `bindGentleLayerDepth` + `bindConclusionExpand` 拆分逻辑，内部含——场景连续交接、胶片时间码、章节标题驶入、卡片 stagger scrub）。
2. `renderConclusion`：保持大字宣言结构，微调 HTML 挂 `.ab-iris` 光圈层。
3. 终章/卡片/章节全部 scrub `immediateRender:false`。

### `docs/src/styles.css`（`.ab-about` 作用域）
1. tokens：`--ab-paper-0/1/2` 全部改 `#FAF8F4` 系（淡暖白）；新增 `--ab-ease-cine`。
2. 噪点 opacity 0.05→0.035。
3. 新增 `.ab-tc`（时间码角标）、`.ab-iris`（终章光圈）、`.ab-rail`（进度线）。
4. 卡片/章节标题/终章样式对齐镜头语言（党建红标题保留）。

### `docs/about.html`
1. 版本 bump：`styles.css?v=v16`、`about-entry.js?v=20260804g`。
2. 补南西油墨宋 woff2 `<link rel="preload" as="font" crossorigin>`。

## 五·乙、探索区 v5「分镜式场景叙事」重设计（书记加裁：胆大心细·基于 SOP）

数据层不动（SOP 流程已准确编码于 `EXPLORATION_STAGES`/`ACTIVITY_NETWORK`/`TASKFORCE_NETWORK`），**交互层**升级为电影镜头流的分镜语言：

1. **分镜切换**：活动网络 → 专班网络之间加"镜头横移 + 光圈"切换（`clip-path` 光圈 + scale 横移），两场景共享节点（组织者/深度参与者/组织委员）作**转场锚点** crossfade——"活动/专班两种探索路径"呈现为同一镜头的两个分镜。
2. **SOP 流描边生长**：每条边在对应 stage 激活时沿路径**描边生长**（`stroke-dashoffset` → 0，~1.2s ease-out），方向 = 流方向；生长完成后再点亮节点。信息流从"瞬间亮起"变为"有方向、有时间的流动"。
3. **行星轨道动效**：激活节点沿轨道做轻微公转微动 + 呼吸缩放（沿用 `PLANETARY_CONFIG` 参数化），非激活压暗 0.25 + 去饱和——呼应书记"行星运动"偏好。
4. **对应环节才连线**（书记原则）：网络只亮当前 stage 相关边；过去 stage 的边弱化保留，未来 stage 不提前出现。
5. **镜头语言统一**：sticky 双列 + snap 骨架保持（已定稿），但全部动画 easing 对齐 `--ab-ease-out` / `--ab-ease-cine`，与全页镜头语言一致。

**小心点**：数据层零改动；sticky + snap 骨架零改动；`prefers-reduced-motion` 下静态展示；不引入新依赖；场景切换仅在"活动→专班"一次发生，不做高频动效。

## 五·丙、v5.1 修订（2026-08-04 书记四条指令，已实现并浏览器复验）

书记 v5 验收后提出四条新指令：卡片快翻过才清晰 / 全场运动同速且正倒不对称 / 卡片"黑色" / 背景深浅不一 + hero 非党建红 + 终章突变红。逐条修订如下：

1. **①卡片显示时机**：卡片入场区间压缩——章节顶进入视口后约 1/3 行程即完成显示（`start:'top 80%' → 'top 30%'` 级），ease `power2.out`（先快后慢）+ stagger 0.08s；旧版 `ease:'none'` + 长区间（top 82%→bottom 42%）导致"快翻过去才清晰"。
2. **②速度差异与正倒对称**：全部入场统一 `cardEntrance()`（fromTo + scrub:true，回滚严格还原）；Development 原 `once:true` 一次性动画改为 fromTo scrub 可逆；不同环节速度有差异（power2.out 缓动 + stagger 错峰）。
3. **③卡片黑色根因**（浏览器取证）：`gsap.to(el,{filter:'brightness(0.92)'})` 的 from 态被 GSAP 解析为 `brightness(0)`，滚动区间中段整章压暗至 0.3~0.9（works 章曾至 0.297 近全黑）。**修复**：显式 `gsap.fromTo` `brightness(1)→0.92`，最小亮度 0.92；探索区活动分镜退场 `brightness(0.9)` 同修。
4. **附加硬性要求**：
   - 背景统一：删除 `.ab-page:nth-child(even)` 的 `--ab-paper-1` 交替，全页恒 `--ab-paper-0 #FAF8F4`；
   - hero 大标题 `--ab-ink`（深褐 #3B3226）→ `--ab-red`（党建红 #CE1126）；
   - 终章去突变红：删除 `.ab-iris` 光圈层与 Phase B（#7A0010 深红 + 金化），保留暖白背景 + 党建红大字 + 温和"镜头落位"驶入（scale 0.86→1 + autoAlpha，scrub 可逆）。

浏览器复验结论（2026-08-04）：全页 9 章背景恒 rgb(250,248,244) 无深浅交替；四组章节交接 filter 最低 0.92 无黑块；入场 1/3 行程显示清晰且 power2.out 缓动曲线与理论值精确吻合；正倒采样逐点相等；hero/终章标题均 #CE1126；终章无全屏变红；无横向滚动；console 无业务报错。

## 六、验收标准

1. 滚到底，终章温和落位完成：暖白背景 + 党建红大字清晰呈现，无全屏变红突变（v5.1 已废弃深红扩展，改为镜头落位驶入）。
2. 全程回滚可逆（卡片/章节/终章均 scrub 驱动）。
3. 无横向滚动条、控制台 0 报错。
4. 吸附落点精确对齐每章标题头部。
5. 背景全页统一 #FAF8F4，无浓黄残留。
6. 浏览器取证脚本复跑，量化数据达标。
7. `prefers-reduced-motion: reduce` 下静态展示无错乱。

## 七、不做的事

- 不引入新依赖（GSAP 3.12.5 + ScrollTrigger 已有）。
- 不下载/不调用 gc-minimal-zine-poster 或任何新 skill。
- 不 push（等待书记确认）。
- 探索区数据层（EXPLORATION_STAGES / 网络配置）与 sticky+snap 骨架不改（只升级交互层，见五·乙）。
- Cognition 章保持现有单列 + sticky 章头结构（"左右分栏"非本次目标；本次只统一其入场为镜头语言）。
