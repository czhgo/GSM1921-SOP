---
title: "数据同源一致性校验手册"
type: governance
role: "[工程师]+[AI]"
last_updated: 2026-10-03
status: active
related_files: [DATA_MODEL.md, content/03_doc_system/ARCHITECTURE.md, CLAUDE.md]
---

# 数据同源一致性校验手册

> **2026-09-04 迁入**：原 content/04_web_design/evolution/CHECKLIST.md（AI 方法论归 05）；属 05 测试验证纪律域。**配套手册：被「TEST_AND_VERIFICATION.md」『数据同源一致性校验』节引用**。

> **定位：** 本文档供支部成员与 AI 协作使用，是工程质检流程。按数据类别逐步检查：**如果在某处看到了某数据，可以预期在其他地方看到同源的数据。**
> 原话（2026-05-23）："按操作步骤逐步检查——如果在某处看到了某数据，可以预期在其他地方看到同源的数据。"

---

## 使用说明

> 本手册按数据类别组织，每种数据列出存储源、展示页面、同源校验点。
> 校验方式：打开任意校验点涉及的页面，确认数据一致。

---

## 0. 数据一致性评议 · 两层法（2026-09-13 支书裁定推广）

> **支书原话（2026-09-13）**：「结构+数据 双层断言！我觉得这次做的数据一致性评议很重要！我们要推广开来！」
> **适用范围**：任何实体（人 / 活动 / 记录 / 文件 …）的同源一致性评议——本次范本见 §1「跨表一致性（自动化守卫）」与 `server/test/person-consistency.test.mjs`。

**为何两层**

- 只有**数据层**断言 → 新代码可绕开单源：今天对了，明天新写的模块又自造一份口径。
- 只有**结构层**断言 → 数据本身可能已经不一致：口径只有一处，但那处的数据错了，或别的域的快照已经未同步。
- **两层都要**：结构层守住「口径只有一处实现」，数据层守住「同一实体的同一字段在各域取值一致」。

**结构层（静态扫描断言「口径只有一处实现」）**

- [ ] 禁止**模块加载期人员快照**：`const X = PersonStore.getMembers();` 这类模块顶层一次性捕获一律改为 `liveMembers()`（实时视图，只读；写入走 `PersonStore` 写口）
- [ ] 禁止**凭姓名认身份**：`.find(p => p.name === …)` 不得用作身份判定；姓名匹配只允许「**先按 id、姓名仅唯一命中才采纳**」，否则留空
- [ ] 禁止**手写已成单一源的判据**：如活动存储态不得再写 `status==='completed' || archived`，一律走 `core/domain/constants.js::isActivityEnded / isActivityArchived / isActivityNotStarted / isActivityLive`
- [ ] 禁止**把控件档位高度交给环境**（2026-09-14 批次 31，**批次 33 已并档**）：高度须由 `docs/src/styles.css` 的「上下内边距 + **显式行高** + 边框」算式决定——**自批次 33 起并为一档：`10+10+16+2 = 38px`，正文 13px**（批次 31 曾分「紧凑 `34px` / 标准 `42px`」两档，已废止）；靠 UA 默认或 Tailwind CDN 的 `text-*` 工具类提供行高时，环境一变同表单内会出现 42 / 43 / 47 三值并存。**同理：量尺规类真机复核必须在生产同构环境**（Tailwind / 字体 CDN 一律不得 abort——缺 preflight 会让行高退化，量出的尺寸全是伪证；本批曾据此误报「27 处 32px」，后经生产同构复测证伪）

**数据层（以权威源为基准逐域断言）**

- [ ] 同一实体的同一字段在各域取值一致；本次范本＝`server/test/person-consistency.test.mjs`：
  - D1 引用存在性——各域引用的 `personId` 均存在于权威人员源
  - D2 姓名快照一致——各域冗余字段 `personName` 与权威源姓名一致
  - D3 档案字段快照一致——各域冗余的档案字段与权威档案值一致
  - D4 同域双字段自洽——同一域内两字段指向同一实体时相互一致
  - D5 唯一档案 + 账号可解析——每个在册人唯一档案且可由登录账号解析

**推广方法（可套用到活动 / 记录 / 文件等任意实体）**

1. **定权威源**：该实体字段的唯一权威出处（人员＝PersonStore；活动＝activities 域；…）
2. **枚举所有引用该实体的域与字段路径**：逐域列出冗余快照字段与引用字段
3. **写四类断言**：引用存在性 + 快照一致性 + 同域自洽 + 唯一性
4. **写结构层静态扫描**：把「口径只有一处实现」固化为断言，防新代码回潮
5. **实测暴露的问题一律根治**（改单一源）而非打补丁——补丁只会留下第二处实现

> **2026-09-30 批次 309（`D-725`）压缩**：下列 27 段「范本」的**原全文**已**整体逐字迁入** [`.ctx/logs/2026-09-EXECUTION_LOG.md`](../../.ctx/logs/2026-09-EXECUTION_LOG.md) 的「**附：`DATA_CONSISTENCY_CHECKLIST.md §0` 的「范本 2–28」迁出全文**」节（**沿革的权威落点**，同 `CLAUDE.md R-84` / `R-86` / `R-89`）。本处自本批起**只留索引**（范本号 / 批次 / 主题 / 同族纪律）；**日常执行面是下面那 28 条问句**，不是范本正文。查详情：按 `范本 N` 在该节内检索。

| 范本 | 出处 | 主题（标题里的「…」类） | 同族纪律（`CLAUDE.md`） |
| --- | --- | --- | --- |
| 2 | 2026-09-13 批次 22 | 实体 id 唯一性（`id-uniqueness.test.mjs`）——结构层禁令扫描 ＋ 数据层唯一 | R-35 |
| 3 | 2026-09-13 批次 23 | 通知受众口径分裂（`notice-audience.test.mjs`）——写入值与判定同源 | R-36 |
| 4 | 2026-09-14 批次 24 | `RESIDENCE` 枚举「两份同值定义」收敛到叶子模块 | R-37 |
| 5 | 2026-09-14 批次 24 | 版本戳（缓存键）同值——非实体类一致性 | R-38 / R-44 |
| 6 | 2026-09-14 批次 25–35 | 「能力散落在调用点」类——分页 / 矩阵 / 版本号推导 | R-53 / R-54 |
| 7 | 2026-09-14 批次 31 / 33 | 「口径寄生环境」类——控件档位高度不能靠 UA / CDN 供给 | R-51 |
| 8 | 2026-09-14 批次 32 | 「状态与载体失配」类——选中集即时变、回调不触发 | R-52 |
| 9 | 2026-09-14 批次 29 / 16 | 「绕过守卫的等价写法」类——语义等价于被禁的字面 | R-47 |
| 10 | 2026-09-14 批次 30 | 「为修一个 bug 复制一份实现」类——同一动作、两个门 | R-50 |
| 11 | 2026-09-14 批次 37–38 | 「能力已收进引擎 ≠ 已收口」类——须反向枚举实现点 | R-55 |
| 12 | 2026-09-14 批次 38 | 「移动单一源的位置 ＝ 一次全仓改签」类 | R-56 |
| 13 | 2026-09-15 批次 44 | 「同一病灶只修一处 ＝ 没修完」类 | R-67 |
| 14 | 2026-09-15 批次 44 | 「工具脚本会把数据当代码改写」类 | — |
| 15 | 2026-09-15 批次 47-B | 「问句在位但没人守」类——每条问句都要指到一个守卫 | R-68 |
| 16 | 2026-09-15 批次 47-G | 「辅助小字」的合规判据（**样本学习中、尚未定稿**） | `DESIGN_SYSTEM §4.18` |
| 17 | 2026-09-16 批次 47-M | 「病灶不产出文本时，判据自己也看不见它」类 | R-71 |
| 18 | 2026-09-16 批次 47-P | 「守卫只守了接口的一维」类 | R-72 |
| 19 | 2026-09-16 批次 47-Q | 「单一源承载两种可见性」类 | — |
| 20 | 2026-09-16 批次 47-R | 「种子把要测的那一支挡住了」类 | R-78 ③ |
| 21 | 2026-09-16 批次 47-S | 「等待窗口不足会把『慢』误判成『没成』」类 | R-74 |
| 22 | 2026-09-16 批次 47-S | 「判据落在手段上 / 口径写错把病灶盖章」类 | R-75 |
| 23 | 2026-09-16 批次 47-T | 「默认挑中的那一项，恰好是不能写的那一项」类 | R-76 |
| 24 | 2026-09-16 批次 47-U | 「两条判据的语料互相包含 ⇒ 会互相冒充成立」类 | R-77 |
| 25 | 2026-09-16 批次 47-W | 「判据结构性不可达」的处置类 | R-78 |
| 26 | 2026-09-17 批次 47-Z | 「写下的前置条件本身是一条跨人假设」类 | R-78 ⑥ |
| 27 | 2026-09-17 批次 49 | 「判据要落在『用户看到成功』的那一刻」类 | R-79 |
| 28 | （批次 49 前后同族） | 「出口脱敏 ≠ 写口脱敏」类 | R-81 |


---

> **用法（2026-09-14 支书指令）**：「这些经验是要推广开，**让 AI 以此为案例发现新问题来继续询问我的**」。故把上列范本压成**可复述的问句**——AI 每次接到「改表格 / 改控件 / 改数据 / 加能力」的任务时，先自问以下二十八句（2026-09-14 批次 37–39 由十问扩为十二问；2026-09-15 批次 44 增第十三问「同类规模」与第十四问「工具脚本的改写面」；2026-09-15 批次 47-B 增第十五问「小字的用途」；2026-09-16 批次 47-M 增第十六问「静默的成因」；2026-09-16 批次 47-P 增第十七问「守卫守的是一维还是整个接口」；2026-09-16 批次 47-Q 增第十八问「这份内容同时还给谁看」；2026-09-16 批次 47-R 增第十九问「我补的种子会不会把要测的那一支挡住」；2026-09-16 批次 47-S 增第二十问「我等的那个信号，窗口够不够」与第二十一问「这条判据分流的依据是事实还是手段」；2026-09-16 批次 47-T 增第二十二问「我默认挑中的那一项，是能写的那一项吗」；2026-09-16 批次 47-U 增第二十三问「我这条判据的语料，会不会被别人顶替成立」；2026-09-16 批次 47-W 增第二十四问「我造的这个种子，产品自己跑得出来吗」；2026-09-17 批次 47-Z 增第二十五问「我写下的这条前置 / 纳入条件，是**同一会话、同一张页面**就能走到的吗——这份数据到底存在服务端还是只在本会话」；**2026-09-17 批次 49 增第二十六问「我这句『成功』，是不是在还**没确认落库**的时候就说出去了——判据有没有落在『用户看到成功的那一刻』，我登记它的时机是不是太晚（已排程、未 flush 的空窗）」与第二十七问「我这条台账 **每一个字段**都有判据吗——还是只守了『文件在 + 文案在』那一半，行号 / 位置从没人核过」**；另增**第二十八问「我的写口，会不会把只该在出口剥掉的东西顺手从库里擦掉——这条记录上是不是同时存在『读取时脱敏』与『整条回写』」**）；**只要有一句的答案是「不清楚」或「大概吧」，就必须用 AskUserQuestion 问支书，不得自行决断**（本仓已有代价：批次 31 因环境伪证误报缺陷、批次 33 因没问清「统一所指」而反复返工）。
>
> ⚠ **问句在位 ≠ 有人执行**（2026-09-15 批次 47-B 实测，见「范本第十五」）：第四问「量测环境」**2026-09-14 就已写入本表**，但批 43 的真机普查仍把 CDN Tailwind 静音、且**无人发现**，直到批 47-B 支书实报「表格字体小」才暴露。故本表的**每一条问句都应能指到一个守卫**；指不到的就是口号（比没有更危险，因为它让人以为已覆盖）。
>
> **理论口述版**见 `.ctx/ENGINEERING_ASSESSMENT.md §3.4`（含可迁移要点 ①–⑫）；**本处是可执行版**（范本与问句）。「规则 → 守卫 → 状态」的可查索引见下节 §0.2。



1. **口径唯一性**——这个数/这份清单，全站有几处在算？我要新增的是第几处？（→ 单一源）
2. **能力归属**——我要加的是「一处能力」还是「一处调用点」？它该在引擎层还是各页各写？（→ 引擎化）
3. **合成量的构成项**——这个尺寸/间距由哪几项合成？每一项都在单一源里显式声明了吗？还是靠 UA / CDN / 继承供给？（→ 算式显式）
4. **量测环境**——我的量测是否跑在与生产同构的环境里（CDN / 字体 / 权限门）？量出的数是**事实**还是**伪证**？
5. **状态与载体**——界面显示的状态（徽标/计数）与承载输入的载体，是否由**同一次变化**驱动？会不会「看着已选好、其实没渲染」？
6. **销毁与回调**——这条路径上有没有「回调里重渲染、重渲染里销毁」？销毁前摘回调了吗？
7. **守卫的语义**——我要加的守卫是按**字面**判还是按**语义**判？有哪些等价写法能绕过它？有没有白名单僵尸风险？
8. **多门同一动作**——这是不是「同一动作、不同入口、不同门」？能不能同一实现体挂多门，而不是再写一份？
9. **规范 vs 实现**——规范里这句话，写的时候想表达什么语义？现在全站有哪几处与它不一致？是**实现错**还是**规范写太宽**？（→ 前者改实现，后者改写规范并登记例外）
10. **无限增长**——这个列表/矩阵/列/页会不会随年份无限长？分页或封顶了吗？（→ 分页铁律 / 列上限）
11. **引用完整性**——我要动的东西（搬迁 / 重命名 / 删除），**除我已知的引用方之外**还有谁在用？我是否**全仓 grep 过旧路径 / 旧名**（含 `?v=` 版本戳形式）？改完后旧路径是否确认 **0 命中**？（→ 单一源搬迁须全仓改签）
12. **反向枚举**——我是否查过「**有没有人绕过这个单一源、自己在写同一件事**」？我扫的是「**单一源的使用点**」还是「**同一能力的全部实现点**」？（→ 能力收进引擎 ≠ 已收口）
13. **同类规模**——我这次修的是「**一处**」还是「**一类**」？同一形态在全站**还有几处**（我数过没有）？>1 处时我建了台账与真机覆盖吗？新增同类时守卫会变红吗？（→ 同类病灶须先数规模再动手；只修一处＝没修完）
14. **工具脚本的改写面**——我这份数据/口径里，有没有会被**工具脚本**命中的字面形态（路径、文件名、版本戳、可被批量替换的名字）？哪个脚本会来改写它？我做了构造免疫与防污染断言吗？（→ 补戳/改名/一改具改/格式化都属此类；被改写要**一眼可辨**，不能伪装成别的问题）
15. **小字的用途**——我加的这段小字（`text-xs` / `text-[11px]` / `text-[10px]`），是在做**辅助**（提示 / 徽标 / 单位 / 状态），还是在**讲背景信息**？若是后者：它该出现在这个页面上吗，还是应归到「知情查看 / 制度与答复」？（支书 2026-09-15 原话：「有很多辅助小字都脱离了使用辅助的功能，而是讲很多背景信息，这是我所不喜欢的」——**拿不准就问支书**，登记 `REVIEW_QUEUE Q-23-39`）
16. **静默的成因**——我说「这里静默失败 / 没反应 / 查不出原因」时，**判据本身是不是只看得见「文本」**？我有没有丢掉**异常 / 状态 / 网络**层面的证据（未捕获脚本错误、请求失败、状态机没推进）？这个「静默」是不是**被某条白名单长期挡在真机之外**才一直没人发现？（→ 批次 47-M：`services/governance/issues.js` 11 处 `showToast` 未导入 ⇒ `ReferenceError`，两类文本判据都只能把它记成「静默失败」而查不出成因；见「范本第十七」）
17. **守卫守的是一维还是整个接口**——我为这个接口/组件建的守卫，是**按「接口的完整约定」逐维覆盖**（参数个数 / 顺序 / 允许枚举 / 返回值 / 状态机），还是**只把「上次踩过的那个坑」写成唯一判据**？同接口的其它形态是否从它眼皮下走过？（→ 批次 47-P：`ux-guard ⑥`「防参数写反」**只匹配两参形态**，而真实存在的**单参** `showToast('文案')` 恰恰从它眼皮下走过 ⇒ 用户只看到「只有图标、没有文字」的空提示；见「范本第十八」）
18. **这份内容同时还给谁看**——我要改的这个文件 / 表 / 数据，是**只有内部可见**，还是**同时也是公开面（或另一种可见性）的来源**？我加进去的东西，**在那个面上该不该出现**？（→ 批次 47-Q：`issues.json` 既是内部汇报的单一源、又是**公开匿名反馈页**的数据源，直种＝内部汇报上公开页；见「范本第十九」）
19. **我补的种子会不会把要测的那一支挡住**——我为了让某个按钮 / 表单出现而补的数据，是否同时决定了它**落在哪个状态分支**（哪一列、哪套 UI、是只读还是可写）？**该分支正是我要测的那一支吗**？这个表单有没有**出厂预填**（尤其是「上一次的内容」）使必填分支走不到？（→ 批次 47-R：给「我的复盘」补归属时挑到了**已有复盘记录**的活动 ⇒ 行卡落进「已复盘」列、渲染只读详情，**没有复盘表单**；见「范本第二十」）
20. **我等的那个信号，窗口够不够**——凡判据是「等某信号出现」（提示 / 列表刷新 / 状态改写），我给的**等待窗口**是否覆盖了该动作的**真实耗时**？这是**长链**吗（串行多写口 / 多次落盘 / 大列表）？我有没有在**没等到**时直接判「静默失败」——把「**慢**」读成「**没成**」？（→ 批次 47-S：`writeActivityWithSOP` **串行建 16 个 SOP 任务**（每口 600ms）⇒ 约 10s 才弹提示，而守卫只等 4s ⇒ 误报「静默失败」，**排查方向被带偏**；见「范本第二十一」）
21. **我这条判据分流，依据是「事实」还是「我用的手段」**——我按某个字段 / 路径 / 标记分流行为时，它对应的是**一种事实**还是**多种事实**（同一手段可达的多种页面形态 / 数据形态）？我对**唯一的事实来源**（页面实测、接口实测）做过核对吗？我沿用的那条**口径**（注释 / 台账里的断言）与**实测**一致吗——不一致时我**更正了什么、原结论是否仍成立**？（→ 批次 47-S：① 「重载后要不要切 tab」原按 `flow.path` 分流，而 `path` 对应**独立页 / 工作台深链**两种形态 ⇒ 深链页假红；② 台账原写「普查全程跑在 mock 态」**是错的**（实为 api 形态），这句错口径**把只在 api 显形的病灶盖章为不存在**；③ **批次 47-V 补**：跨「整页重载」的断言，我**把「页面形态」恢复到位了吗**——详情面板 / 浮窗重载后**会收起**（展开态不落库），不重开就断言只会得到「载体不在位」的**假红**（看着像产品病，其实是守卫没摆好被测对象）⇒ 用 `SUCCESS_FLOWS[].reopen[]`；见「范本第二十二」）
22. **我默认挑中的那一项，是「能写的那一项」吗**——凡动作需要「从若干项里挑一项」（下拉 / 单选 / 列表首行 / 默认 tab），我**显式声明了「挑出来的那一项要满足什么条件」**，还是用了「第一项 / 默认项」代过？**这一项的类型还决定了「这次动作会改变多少」**——我按产品语义选对了吗？默认那一项会不会恰好是**不能写的那一支**（已上传 / 已完成 / 只读态）——于是动作**看着成功、其实空转**？我这条成功路径，除「有成功提示」外**独立验了「当场真生效」吗**？我判据里的数字是**实测**的还是我**推算**的——**就算是实测的，它会不会随「同批其它流程 / 种子」变动**（那样我该判**增量**而不是绝对值）？（→ 批次 47-T：① `selectFirstOption` 挑到的第一条活动**恰好已上传** ⇒ 提示是「新增 **0** 条；重复跳过 2 条」，**有提示却空转**；② 原按推算写「共 55 人」而实测「共 54 人」，**改成实测值后全量跑仍红**（同批流程不同 ⇒ 前序状态不同）⇒ 改判 `countUp`，并加 `text:'党小组会'` 让候选＝本组应到名单；见「范本第二十三」）
23. **我这条判据的语料，会不会被别人顶替成立**——我写进数据里的这段标记文本（写入的标题 / 正文 / 备注），是否**恰好是另一条判据断言语料的子串**？同一条数据面上**还有谁在断言**？如果有，那么**我这条一旦真写入，那条断言就会被顶替成立**——守卫表面全绿、实则判据互相冒充。我有没有把「同一处数据被多条判据引用」的**引用关系**当回事（它和「单一源」一样会成盲区）？我这条新守卫**在旧代码上证明过它会红**吗？（→ 批次 47-U：`secretary-notice-edit-save` 的标记原写成「（成功路径普查）通知标题**已更新**」，与 `secretary-notification-publish` 的「（成功路径普查）通知标题」互为子串 ⇒ 立常驻断言 S5 + 纪律 R-77；见「范本第二十四」）
24. **我造的这个种子，产品自己跑得出来吗**——我把某个点标成「不可达」时，是**结构性不可达**（产品逻辑上就不渲染）还是**当时种子碰巧没有那个前置**？如果我要**造前置**：我打算写进种子里的那个状态，**产品真机上能不能自己到达**（会不会绕过产品自己的校验/派生链，造出「0 票却已通过」这类**永远不可能出现**的状态）——那样换来的绿是**假绿**；这一支有没有**别的、自洽的**达成路径（换活动类型 / 换流程 / 走真实上游动作）？我选的**日期与位置**会不会扰动既有判据？顺手要不要把那些**靠偶然事实成立的入口**显式化（如「日历第一条」→ `[data-act-id]`）？（→ 批次 47-W：3 处「决议落实」由 `machine:false` 转 `true`——**没走「给 act-31 挂 `result`」那条假种子捷径**，改用无 `voteConfig` 的线下支委会 `act-35`（记录决议不经表决硬校验），并放 8 月以免扰动两条既有流程；见「范本第二十五」）
25. **我写下的这条「前置 / 纳入条件」，是同一会话、同一张页面就能走到的吗**——我写「**某人 / 某角色**在**某处**先做一次，这条判据就可达」时，我核过**这份数据到底存在哪里**吗？**存在哪里决定了谁能看见它**：存在**服务端** ⇒ 跨会话可见；只在**本会话 / localStorage / 内存** ⇒ **换个人、换台机器就看不见**（我这条 reason 会不会是一条**从没核过的跨人假设**）；我的判据前置是否**落在另一张页面上**（那就需要显式的跨页前置链，而不是一句「需先…」了事）？「造可达前置」我要选**种子**还是**让产品自己走出来**——**能走出来的就不要造**（少一个「种子是否自洽」的风险）？（→ 批次 47-Z：台账最后一条 `machine:false`（支书台「待办·退回」）的原 reason 后半句是**跨人假设**——成员变更确认队列**纯客户端、两形态都无服务端表**，组织委员在别的会话发起支书根本看不到；真前置是「同一会话内先产生过一条请求」，而支书本人也有该写权 ⇒ 走 `person.html` 改发展阶段 → 回支书台退回，**不造任何数据**；为它补 `{ goto }` / `{ openTab }` 两步跨页能力；见「范本第二十六」）
26. **我这句「成功」，是不是在还没确认落库的时候就说出口了——以及我新加的那条「过渡态」，会不会抢先满足别的判据**——① 凡「先报结果、后台再干活」的地方，**判据有没有落在「用户看到成功的那一刻」**（而不是每个调用点各写一遍 await）？我登记落库的**时机**对不对——会不会是「**已排程、未 flush**」的空窗，让等待方看到「无在途写」就**放行**了？卸载路径（关页 / 刷新）**结算排程**了吗——没结算的话等待的 promise 会**永挂**，比不修更坏？失败是**报出来**了，还是被一句 `console.warn` 吞掉了？**②（本问的第二半，2026-09-17 批次 49 实做时补）** 我为等待期加了一条**过渡态**（「保存中…」/ 加载态 / 提交中）之后，**回头审过所有「等某个东西出现」的判据吗**——那些判据等的到底是**裁决**，还是**过渡态也能把它满足掉**？（实测：成功路径守卫原判据＝「提示容器里有字」，被过渡提示**抢先满足**，读到「保存中…」却被报成「文案不符」，**方向最坏：把人引去改断言字**）修法是**把判据收紧为「只认裁决」并另立一条「一直停在过渡态」的独立违规**——**不是**放宽判据、**也不是**调长窗口（等待条件本身被过渡态满足了，调窗口治不了）。（→ 批次 49：`persist()` 同步 void ⇒ 约 113 处「先弹成功、落库在后台跑」；见「范本第二十七」）
27. **我这条台账 / 清单，每一个字段都有判据吗**——我守的是**整个条目**，还是只守了**其中一半**（`file` 有判据、`msg` 有判据、**`line` 没有** ⇒ 那就是**没人在核**）？我给判据**留了容差**吗（留了容差就等于**放任它继续走偏**）？同族合看：**登记的理由**也要核、**登记的位置**也要核——「文件在 → 文案在 → 位置对」是**三层**，我补齐了几层？（→ 批次 49：为改台账顺手核行号，实测 **93 条里 11 条行号未同步**，而 `S0–S5` **全绿**——**守卫不会替它说话**；见 `R-80` / `§0.2`）
28. **我的写口，会不会把只该在出口剥掉的东西顺手从库里擦掉**——这条记录上是不是同时存在「**读取时脱敏**」与「**整条回写**」（脱敏读出的对象被**整个**写回去）？写回的输入是**未脱敏的原记录**，还是**已经剥过一层的对象**？我剥掉的那个字段，**库里本来该不该有**（该有的被写口擦掉＝**不可逆的损毁**，不是「更安全的清理」）？这件事会发生**几次**（每写一次擦一次吗）、**有提示吗**？（→ 出口脱敏 ≠ 写口脱敏：**脱敏是出口的事，不是写口的事**；见「范本第二十八」）


---

## 0.2 规则 → 守卫 → 状态 总索引（每批任务先扫本表）

> **本表要解决的问题**：同一条规则「**由哪个守卫守 → 当前守没守住**」，此前分散在 **5 处**——① `.ctx/ENGINEERING_ASSESSMENT.md §3.4` 收敛台账（R13–R27）、② `README.md` 的「口径/单一源守卫」清单、③ 各 `server/test/*.test.mjs` 守卫文件、④ `.ctx/REVIEW_QUEUE.md` 的状态行、⑤ 各详述文档。**没有任何一处能一次答全**。本表把它们收成**一处可查**（2026-09-15 立表；支书原话「便于 check」）。

**主从关系（避免重复维护）**

- 方法论「口述版」权威 ＝ `.ctx/ENGINEERING_ASSESSMENT.md §3.4`（含可迁移要点 ①–⑫）。
- 可执行版（范本与问句）权威 ＝ 本文件 §0 / §0.1。
- **守卫实现唯一处** ＝ `server/test/*.test.mjs`；**本表只是索引，不是判据**，断言号以守卫文件实测为准。
- 单一源组件登记处权威 ＝ `README.md`（本表**不重复登记**组件清单）。

| 规则/口径 | 权威判据出处 | 守卫（文件::断言号） | 状态 | 详述处 |
|---|---|---|---|---|
| R33 **「数据源真装配」可机检**（运行时「页面真用上了服务端数据」必须可断言——防「源码里有装配调用」冒充「真装配成功」；装配标记＝DOM `data-source`，因模块取值在实例内部、另起 `import()` 会读到另一实例 ⇒ 假红） | 装配标记写入点 `docs/src/data/data-adapter.js::setDataSource` · 静态断言 `server/test/module-load.test.mjs::E2` · 真机断言 `::E4` | `module-load.test.mjs::E4`（真登录 → 3 页抽样断言 `dataset.dataSource==='api'`；非空转＝`about.html` 反证） | 已闭环（2026-09-28 批次 241 · 收 `H-3`） | `.ctx/REVIEW_QUEUE.md H-3` |
| R32 **工作流块「可编排性」内核**（组合体检**必须真会判**——防「过滤成空集 ⇒ 恒真 ⇒ 假绿」）＋ 编排产物**是既有 definition 形状的纯数据**（不做第二套引擎） | `docs/src/workflow/blocks/orchestration.js`（`composePlan` / `compilePlan` / `blocksForScope`）· `docs/src/core/base/module-compose.js`（id 取 `id` **或** `blockId`）· 契约源 `WORKFLOW_BLOCK_CONTRACT.md` v1.1 | `block-orchestration.test.mjs::O1–O5` | 已闭环（2026-09-28 批次 239 · G3-3） | `.ctx/ENGINEERING_ASSESSMENT.md §四 P10` |
| R31 **每个 policy 参数恰属「可覆盖白名单」或「不可覆盖固定台账」两类之一**（消灭「未登记」第三态；放行＝移出固定台账并入白名单） | `docs/src/core/domain/policy-defaults.js`（`POLICY_OVERRIDABLE` / `POLICY_FIXED`；放行三条见 `POLICY_FIXED` 头注） | `policy-config.test.mjs::R1–R3` | 已闭环（2026-09-28 批次 238 · G3-2） | `.ctx/ENGINEERING_ASSESSMENT.md §四 P9` |
| R13 版本号推导单一源（同日只允许前进）+ server-test 补戳「缓存键语境」单一源 + **发版一致性**（CHANGELOG ↔ `server/package.json` ↔ tag 取齐；发版走单一入口 `docs/scripts/release.mjs`，默认预演） | `docs/scripts/version-next.mjs`（`nextVersionFor`/`isForward`/`isCommentLine`/`isCacheKeyLine`/`stampTestFileContent`/`cacheKeyStamps` ＋ 批次 236 新增 `nextSemver`/`isSemverForward`/`parseChangelog`/`classifyChanges`）· `docs/scripts/release.mjs` · `CHANGELOG.md` | `version-stamp.test.mjs::S1–S7 + D1–D11`（`S7` 真 spawn 预演并独立复算版本号逐字比对） | 已闭环 | `.ctx/ENGINEERING_ASSESSMENT.md §3.4 R13` |
| R14/R21/R22 分页与翻页标记单一源（调用点不得私自关；手写 `<table>` 收敛台账） | `components/ui/list-filter.js`（引擎内置分页）· `components/ui/pager.js::pagerHtml` | `filter-row.test.mjs::S10–S12` | 已闭环 | `§3.4 R14 / R21 / R22` |
| R17 表格类族与控件档位算式显式（单档 38px × 13px；**正文须直接声明到 th/td**、**数据格禁挂小字类**） | `docs/src/styles.css`（`.data-table` / `.data-table th,td` / `.lf-*` / `.page-btn`） | `filter-row.test.mjs::S1–S13 + D1–D3` | 已闭环 | `§3.4 R17` · `REVIEW_QUEUE Q-23-12 / Q-23-15 / Q-23-38` |
| 「硬编码 hex」存量回归：`DESIGN_SYSTEM.md §2.8` 四层分类取色，**新增即红** · 逐文件处数 ratchet · 搬移例外台账（人工声明 + 逐值对照） | `docs/src/styles.css :root` 取色令牌 · `DESIGN_SYSTEM.md §2.8` | `hex-hardcode-guard.test.mjs::H1–H5` | 已闭环（存量 1957 处 / 168 值 / 92 文件；存量起点 2025 ⇒ ↓68） | `DESIGN_SYSTEM.md §2.8` · `server/test/style-baseline.mjs` |
| 「控件小字」存量回归：`DESIGN_SYSTEM.md §4.3` 控件字号**单档 13px**，禁控件挂 `text-[11px]/[10px]/[9px]`（新增即红 · 逐文件站点数 ratchet） | `DESIGN_SYSTEM.md §4.3` | `control-font-guard.test.mjs::T1–T4` | 已闭环（控件 9 处 / 3 文件；全站 `text-[9/10/11px]` 367 处为进度口径） | `DESIGN_SYSTEM.md §4.3` · `server/test/style-baseline.mjs` |
| R18 选人载体语义两分（选名单成员走 PersonPicker；任命/指派到人允许下拉） | `content/04_web_design/design-system/DESIGN_SYSTEM.md §4.13` | `filter-row.test.mjs::S9` | 已闭环（例外登记 4 处） | `§3.4 R18` · `REVIEW_QUEUE Q-23-13` |
| R15/R23/R24/R25 人×项目矩阵单一源（互为转置 / 项目维封顶 6 / 人维分页 / 只给挂载点不吞语义） | `components/ui/relation-matrix.js` | `relation-matrix.test.mjs::S1–S6 + 真机①②` | 已闭环 | `§3.4 R15 / R23 / R24 / R25` · `DESIGN_SYSTEM.md §4.10` |
| R16 党小组活组清单单一源（禁字面量 / 模块加载期派生快照 / 种子枚举代跑） | `services/member/party-group.js::groupOptions()` | `party-group.test.mjs::S1–S4` | 已闭环 | `§3.4 R16` |
| R19 同一动作多入口（不同角色门）须同一实现体挂多门 | `server/routes/member.js::createMemberRow` | `member-flow.test.mjs::S4` · `permission-gate.test.mjs::⑤d / ⑥ / ⑦` · `member-persist.test.mjs::api ⑫` | 已闭环 | `§3.4 R19` · `REVIEW_QUEUE Q-23-10` |
| R20 状态与载体须同一次变化驱动 + 销毁前先摘回调 | `components/governance/person-picker.js` | `inspection-loop-e2e.test.mjs`（组长台 / 组织台两条真机）· `ux-guard.test.mjs::⑦` | 已闭环 | `§3.4 R20` · `REVIEW_QUEUE Q-23-14` |
| R26 说明文件里的「数字与名称」须指到代码出处（**含「守卫自身须登记进 README 测试清单」**——守卫存在却无人可见＝半个没做） | 各说明文件 ↔ 代码注册数组 · `README.md` 测试清单 | `doc-consistency.test.mjs::S1–S16`（**2026-09-26 批次 205 改准**：原写 `S1–S12`；**2026-09-28 批次 243 续**：现到 **S1–S16**，另含 S13 时间戳↔frontmatter／S14 可数事实对账／S15 弱清单／S16 守卫注册完整性） | 已闭环 | `§3.4 R26` · `REVIEW_QUEUE Q-23-24 / Q-23-37` |
| R28 同一病灶只修一处＝没修完（须数同类规模 + 建台账 + 真机覆盖） | `server/test/form-loop-registry.mjs`（**95** 条校验点台账，**91** 条可自动化 / **4** 条逐条 reason，含「需跨页前置链」「服务层重复守卫」分列——批 47-W/47-X/47-Y/47-Z 由 84/9 升为 **91/2**；**批次 91 再增 2 条**（本组通知发布口，`services/governance/notice.js`）⇒ **现余 4 条＝服务层重复守卫 1 · 缺稳定前置待解锁 3**，各条归属均写在 reason 内） | `form-loop-sweep.test.mjs::S0–S5` + **54 条真机闭环** + **17 条真机成功路径**（每条另加「未捕获脚本错误」判据） | 已闭环 | `§3.4 R28` · `REVIEW_QUEUE Q-23-31 / Q-23-44 / 批次 47-W / 47-X / 47-Y / 47-Z` |
| R73 台账完备性**三缺**——规模不缩水（S0）/ 已登记项全覆盖（S2）/ **全站是否都已登记（漏登记时前三条全绿）**；**③ 缺的守卫已于 2026-10-01 批次 323 落成** | `server/test/form-loop-registry.mjs`（批 47-R 补登 1 处遗漏：`thought-report-entry.js:287`） | `form-loop-sweep.test.mjs::S0–S6` · **`validation-site-coverage.test.mjs::V1`**（漏登记增量检测：按台账开篇同一套登记判据扫 `docs/src/**`，未登记者进**只降不升**的存量基线；落成当天即揪出 5 处真漏登记并同批登记） | 已闭环（批次 323） | `CLAUDE.md R-73` · `REVIEW_QUEUE 批次 47-R` |
| 内容单一源同时承载**可见性不同**的两类数据时，公开面必须显式过滤（且列表与统计同一口径） | `docs/data/issues.json`（公开匿名反馈 + 内部汇报同文件）· `docs/src/components/feedback/issue-list.js` · `server/seed.js::seedIssues()`（按 `kind` 分流脱敏） | `page-sweep.test.mjs`（公开反馈页）· 真机探针取证（公开页 4 行 / 无汇报标题） | 已闭环 | `REVIEW_QUEUE 批次 47-Q` · `范本第十九` |
| 显示接口须按其**完整约定**逐维守卫（参数个数 / 顺序）——只守「见过的错误形态」＝守一半 | `docs/src/core/base/utils.js::showToast(type, message)`（两参） | `ux-guard.test.mjs::⑥`（两维：**参数顺序写反** + **参数个数不足**）· 真机侧 `form-loop-sweep.test.mjs::pc-review-reject-note` | 已闭环（3 处单参真实调用已修） | `CLAUDE.md R-72` · `范本第十八` · `§0.1 第十七问` · `REVIEW_QUEUE 批次 47-P` |
| R28-附 工具脚本会把「数据」当「代码」改写（补戳正则命中路径数据） | `docs/scripts/version-next.mjs::isCacheKeyLine`（缓存键语境单一源；`bump-version.mjs` 补戳与自检同判据） | `form-loop-sweep.test.mjs::S4`（防污染断言：数据里不得出现 `?v=`）· `version-stamp.test.mjs::S4–S6 / D7–D9` | 已闭环（批次 46 ① 根治 Q-23-33） | `范本第十四` · `REVIEW_QUEUE Q-23-33` |
| R-74 「等信号出现」的判据**等待窗口必须覆盖真实耗时**——长链（串行多写口）窗口不足时，会把「**慢**」误判成「**没成**」并把排查方向带偏 | `server/test/form-loop-registry.mjs::SUCCESS_FLOWS[].toastTimeoutMs`（缺省 4s 不动旧行为；长链显式声明） | `form-loop-sweep.test.mjs`（`leader-write-activity-save` 首用；`writeActivityWithSOP` 串行 16 个写口 × 600ms ⇒ 约 10s） | 已闭环 | `CLAUDE.md R-74` · `范本第二十一` · `§0.1 第二十问` · `REVIEW_QUEUE 批次 47-S` |
| R-75 判据要落在**事实**上（页面形态 / 数据形态），不得落在**用来达成事实的手段**上；**口径写错会把病灶盖章为不存在**（发现即须同批更正并写明原结论是否仍成立）；**跨整页重载的断言须先把「页面形态」恢复到位**（详情面板/浮窗重载后收起 ⇒ 不重开会得到假红）；**写死的「今天」类锚点会过期，过期时表现为「误报」——处置是刷锚点不是改数据，且不可改用 `new Date()`** | `server/test/form-loop-registry.mjs`（`independent` 声明 + `open` 声明判据 + `reopen[]`）· 台账口径更正（`page-issue-detail-comment` 注释 · `REVIEW_QUEUE` 批次 47-M 段 · `data-adapter.js` 的 makeupTasks 旧注）· 锚点单一处（`mock-integrity.test.mjs` M2 规则 4） | `form-loop-sweep.test.mjs`（凡 `path` + `reload` 必显式声明 `independent`；`open[]` 按「有没有声明」判；`reopen[]` 首用 `org-taskforce-progress-add`）· `mock-integrity` M2（锚点 2026-09-05 → **2026-09-17**） | 已闭环（`Q-23-45`） | `CLAUDE.md R-75` · `范本第二十二` · `§0.1 第二十一问` · `REVIEW_QUEUE 批次 47-S / 47-V / 47-Y` |
| R-76 **默认挑中的那一项可能是「不能写的那一项」**：凡动作需「从若干项里挑一项」，须显式声明「挑出来的那项要满足什么条件」（含**它的类型决定了会改变多少**），不得用「第一项」代过；**有成功提示 ≠ 动作生效**（提示可把空转写在脸上）；**判据判「改变了什么」（`countUp` 增量），不判「世界此刻正好等于什么」（绝对值会随种子与同批其它流程变动）** | `server/test/form-loop-registry.mjs::SUCCESS_FLOWS[].fill[].selectOption = { selector, notText / text }` · `asserts[].countUp` | `form-loop-sweep.test.mjs`（`selectOption` 选步 + `countUp` 断言；`leader-attendance-upload-submit` 首用） | 已闭环 | `CLAUDE.md R-76` · `范本第二十三` · `§0.1 第二十二问` · `REVIEW_QUEUE 批次 47-T` |
| R-77 **判据之间不得互相冒充**：同一条数据面上，写入的标记**不得是另一条判据断言语料的子串**（否则前者真写入会把后者顶替成立——**把红变成绿**，比假红更难发现） | `server/test/form-loop-registry.mjs::SUCCESS_FLOWS[].asserts[].text`（语料互不包含） | `form-loop-sweep.test.mjs::S5`（「标记子串」常驻断言；**上线前已在旧代码上证明它会红**：改「通知标题」⇒ 三条命中） | 已闭环 | `CLAUDE.md R-77` · `范本第二十四` · `§0.1 第二十三问` · `REVIEW_QUEUE 批次 47-U` |
| R-78 **「判据不可达」只有两条出口**：造出**真机可达**的种子，或**如实登记**为不可达（无第三条路：放宽判据 / 改弱断言 / 改 `machine` 了事，都是「让守卫看起来在守」）；**造的种子必须自洽**（不得绕过产品自身校验造出「永远不可能出现」的状态），且**位置须不扰动既有判据**；顺手把靠偶然事实成立的入口**显式化**；**登记的理由本身也要核**（口径错了等于没登记） | `docs/src/data/mock/activities.js::act-35`（线下支委会·议程项 `result:'passed'`）· `docs/src/data/mock/taskforces.js::tf-001`（补演示账号成员 p5 + **一条待核产出**）· `docs/src/data/mock/seed.js::SEED_MAKEUP_TASKS` + `docs/src/data/mock/attendance.js::att900`（9 月缺勤＝补课任务的**派生源**，两形态同源注入；**id 须落在既有种子 id 空间**——初版 `att-sep-1` 不匹配 `/^att\d+$/` ⇒ `?reset=init` 剔不净，被 `reset-tier-init::C2` 当场抓住）· `server/test/form-loop-registry.mjs::secretary-inspector-resolution` / `visitor-insight-taskforce-contribution` / `org-taskforce-reject-reason` / `visitor-attendance-makeup-proof` / `secretary-todo-reject-reason`（**第 7 处＝无种子可造，改走「同一会话内的真机前链」**） | `form-loop-sweep.test.mjs`（四批共 7 处 `machine:false → true`；`FLOWS_BASELINE` 49 → **54**；新能力 **`dialogAnswer`**（原生 `window.prompt` 校验点须在触发步**之前**注册一次性应答器，否则 dismiss→`null` 连空值分支都到不了）与 **`{ goto }` / `{ openTab }`**（**跨页前置链**：有些校验点的前置**不在同一张页面上**，`open[]` 里先跳走造前置、跳回后切 tab））· `mock-integrity` M1/M2 · `agenda-flow` / `agenda-closure` / `today-summary` / `taskforce-lifecycle` / `workforce-gate` / `member-progress` / `b3-1-makeup-writeback` / `attendance-batch` / `async-vote` / `page-sweep` 复测全绿 | 已闭环（`Q-23-48` 为**换理由**后的待裁项） | `CLAUDE.md R-78` · `范本第二十五 / 第二十六` · `§0.1 第二十四 / 第二十五问` · `REVIEW_QUEUE 批次 47-W / 47-X / 47-Y / 47-Z` |
| R-79 **「成功」是对用户的承诺**：不许在**未确认落库**时声称成功；判据要落在「**用户看到成功的那一刻**」（不逐调用点改 113 处，一处收口 ⇒ 新增写口天然受约束）；**登记须发生在排程那一刻**（否则等待方会在「已排程、未 flush」的空窗里放行）；**卸载路径须结算排程**（否则等待的 promise 永挂 ⇒ 提示永不出，**比不修更坏**）；**失败必须报出来**（不得 `console.warn` 了事——失败的证据不得被成功吞没）；走异步的写链（动态 import）与**外部写链**（REST / 本地缓存）都要登记 | `docs/src/core/session/pending-writes.js`（叶子件：`trackWrite` / `hasPendingWrites` / `settleWrites`）· `docs/src/core/base/utils.js::showToast`（success 分支先 `await settleWrites()`，失败或超时**改报失败**、等待期给「保存中…」过渡态）· `docs/src/data/data-adapter.js`（`persist()` 两分支登记 + **`_scheduleSnapshot` 排程即登记** + `_flushSnapshot` 失败结算并上抛 + `_flushSnapshotSync` 结算排程）· `docs/src/services/core/mock.js::saveDB`（去动态 import，改静态 `persist()`；该文件本就静态 import 同模块）· `docs/src/services/governance/issues.js::_syncIssueToApi` · `docs/src/components/feedback/issue-detail.js`（原**空 `catch`** 补登记）· `docs/src/entries/tabs/leader/attendance-tab.js`（「批量设状态」文案更正——**只改 DOM 不落库者不得写「已设为」**） | `server/test/pending-writes.test.mjs`（W1–W4 行为层：落地 / 失败必抛且只报一次 / 长链期间新登记也等到 / 不产生 unhandledrejection；W5–W9 结构层：success 必先经 `settleWrites`、Toast 渲染单一源、`persist` 与快照**排程**都须登记、flush 失败须结算并上抛、外部写链须登记且 `saveDB` 不得再用动态 import）· `form-loop-sweep.test.mjs::leader-attendance-batch-status`（toast 文案同步改字）· `form-loop-sweep.test.mjs`（`readToast` **只认裁决**——过渡态「保存中…」不算数；并新增「**一直停在过渡态**」独立违规——R-79 ⑧） | 已闭环（⚠ **api 形态的端到端**——真服务端 + 失败注入——**尚无真机证据**，如实登记为缺口） | `CLAUDE.md R-79` · `范本第二十七` · `§0.1 第二十六问` · `REVIEW_QUEUE 批次 49` |
| R-80 **台账里「没被核到的那一半」会自己走偏**：台账条目里**每一个字段都要有判据**（`file` 有、`msg` 有、`line` 没有 ⇒ 只守了一半）；判据取**精确命中**（声明的那一行本身须含该文案），**不给容差**——给容差＝放任它继续走偏 | `server/test/form-loop-registry.mjs`（93 处校验点的 `line` 逐条更正——实做时查出 **11 条行号未同步**：本批改动下移 5 条 + 历史跑偏 6 条） | `form-loop-sweep.test.mjs::S6`（**新增**；与 `S4` 合看＝「**文件在 → 文案在 → 位置对**」三层可核） | 已闭环 | `CLAUDE.md R-80` · `§0.1 第二十七问` · `REVIEW_QUEUE 批次 49` |
| 出口脱敏 ≠ 写口脱敏：**读时脱敏 + 整条回写**并存的写口，会把库里只该在出口剥掉的东西顺手擦掉（**脱敏是出口的事，不是写口的事**；擦除静默且不可逆 ⇒ 判据须常驻） | `server/routes/resources.js::sanitizeIssue`（只剥不外泄、不回写）· `PATCH /issues/:id`（写回须拿**未脱敏的原记录**，或只写本次真要改的字段） | `issue-anonymity.test.mjs::处置不清真身`（支书反复 PATCH 后库里仍含真身，且常规出口始终脱敏） | 已闭环 | `CLAUDE.md R-81` · `范本第二十八` · `§0.1 第二十八问` |
| R27 静态断言锁形态、真机全站普查锁体验（七台 × 全 tab，含真机尺规与**二级视图审次**、**自建列表分页**）+ **普查须与生产同环境** | `server/test/page-sweep.test.mjs` · `server/test/form-loop-sweep.test.mjs` | `page-sweep.test.mjs::S0–S3 + 七台真机普查` · `form-loop-sweep.test.mjs::S0–S6 + 54 条真机流程 + 17 条真机成功路径`（每条流程另加「**未捕获脚本错误**」判据） | 已闭环（`Q-23-40` 两处**已接引擎**、台账清空） | `§3.4 R27` · `CLAUDE.md R-68 / R-71` · `REVIEW_QUEUE Q-23-28 / Q-23-34 / Q-23-40 / Q-23-44`（⚠ **`machine:true` 只保证「必填校验分支」，成功路径另由 `SUCCESS_FLOWS` 覆盖**） |
| R29 授权声明必须可核验：**功能不得随批次「一起进」**；注释里的「支书批 / 裁定」须**同行带日期**（防止给未逐项批准的功能伪造授权凭证） | 各源码注释（`docs/src` + `server`；判据**收窄**到「支书作为批准者的断言」，业务语汇如「报支书确认」不计） | `doc-consistency.test.mjs::S12` | 已闭环（13 条已**逐条回查补齐真实日期**、迁移台账**清空**＝此后零容忍；**日期能否指到问答记录机器查不了**，该半截靠支书复核） | `CLAUDE.md R-70` · `REVIEW_QUEUE Q-23-41 / Q-23-42` |
| R30 面向用户的「人工收集 / 归集 / 汇总」类要求，凡数据可由服务端算出者**须由服务端代劳**；聚合口径**单一源**（两端不得各写一套） | 纯聚合 `docs/src/services/member/member-progress.js::aggregateMemberProgress`（服务端同源 import）· 读接口 `server/routes/leader-progress.js` · 前端双态入口 `loadMemberProgress` | `member-progress.test.mjs::S1–S4`（S1＝**结构单一源**：接口源码不得出现自写判定） | 已闭环（`Q-23-41 ②`；47-I 已落 `today` 呈报实况 + 组长台改走载入器） | `CLAUDE.md R-70` · `REVIEW_QUEUE Q-23-41` |
| 人员字段两层法同源（首个范本：结构层 + 数据层） | `docs/src/data/mock/people.js`（PEOPLE）· `services/member/person.js::liveMembers` | `person-consistency.test.mjs::S1–S4 + D1–D5` | 已闭环 | 本文件 §0 / §1 · `§3.4 R16`（组清单） |
| 实体 id 唯一 + 生成单一源（第二范本） | `core/base/id.js::generateId / randomHex` | `id-uniqueness.test.mjs::S1–S3 + D1–D4` | 已闭环 | 本文件 §0 第二范本 · §跨类别同源校验 |
| 通知受众写入值与判定同源（第三范本） | `core/domain/constants.js::NOTICE_AUDIENCE_SENTINELS` | `notice-audience.test.mjs::N1–N8` | 已闭环 | 本文件 §0 第三范本 · §6 |
| issue 支部归属（写入取本人支部、读侧单一源 `withinBranch`） | `services/branch/branch.js::getBranchIdOfPerson` | `issue-branch.test.mjs::S1–S4 + D1–D3` | 已闭环 | `REVIEW_QUEUE Q-23-27` |
| 表单闭环真机普查台账（校验点不得漏 / 不得有僵尸条目） | `server/test/form-loop-registry.mjs` | `form-loop-sweep.test.mjs::S0–S4` | 已闭环 | `server/test/form-loop-registry.mjs` |
| 编辑完整性：`docs/src` 全模块可加载 | 本文件 §编辑完整性校验 | `module-load.test.mjs::E1` | 已闭环 | 本文件 §编辑完整性校验 |
| 链接完整性四层（静态 / JS 导航 / HTTP / 登录态） | 本文件 §链接完整性校验 | `link-integrity.test.mjs::L1–L5` | 已闭环 | 本文件 §链接完整性校验 |
| 链接完整性·补：**JS 渲染型 href/src 的「裸文件名」**按所在页 `<base>` 规则解析后须指向真实文件（工作台页 `<base href="../">` ⇒ 裸 `x.html` 落到站点根 `docs/x.html`；两种页面基准都汇到 `docs/` ⇒ 与宿主页面无关） | `docs/workspace/*.html` 的 `<base href="../">` · `docs/src/core/base/utils.js::getBasePath` | `link-target-guard.test.mjs::L6–L7` | 已闭环 | 本文件 §链接完整性校验 |
| 清单类同步（功能目录结构 / 链路键集 / 功能地图 / 表决枚举 / 官方制度链接） | `docs/src/core/domain/function-catalog.js` · `mermaid-sources.js` · `vote-config.js` · `components/sections/references.js` | `catalog-sync.test.mjs::T1–T5`（批次 47-F 五件并一） | 已闭环 | `README.md` 顶部功能地图 · `REVIEW_QUEUE` 批次 47-F |
| 高频操作点击成本（进入工作台 → 可执行事项 ≤2 跳） | 本文件 §编辑完整性校验 | `click-cost.test.mjs::C1–C5` | 已闭环 | 本文件 §编辑完整性校验 |
| Mock 数据完整性（引用 / 字段 / id / 类型 / 生命周期） | `docs/src/data/mock/*` | `mock-integrity.test.mjs::M1–M2` | 已闭环 | 本文件 §1–§15 |
| 前端持久化域 ↔ server 表对账口径（分五口径，严禁互相代入） | `docs/src/core/domain/domain.js::mockDB` · `server/db.js::RESOURCE_TABLES` | `doc-consistency.test.mjs::S5` | 已闭环 | 本文件 §跨类别同源校验 · `§3.4 R26` |
| `README-server.md` 的「`文件:行号`」取证引用逐条指向真实位置（含短式 `:192` / 逗号续列 / md 区间不越节 / 「零命中」类关键词取证仍成立 / 行为词型引用须带可校验锚点） | `README-server.md` 的**383 处**引用 · `docs/src/**` 行为词 | `doc-line-ref.test.mjs::R1–R6` | 已闭环（**换说法机检不了** ⇒ 该半落 `CLAUDE.md R-87` 纪律） | `CLAUDE.md R-87` · 本文件 §链接完整性校验 |
| `R-83`「改过文件必须刷 `frontmatter.last_updated`」的机检件（表行日期 ↔ frontmatter ↔ 该文件最后一次提交日） | `.ctx/TIMESTAMPS.md` · 各 `content/**` frontmatter | `frontmatter-freshness.test.mjs::F1–F3`（`F1` git-free · `F2` git〔浅克隆判红、无 git 只报不判〕） | 已闭环（⚠ **`F2` 现存 9 处红**——9 份 `content/**` 的 `last_updated` 早于其最后提交日，属 `content/**` 授权面外、待另路面收） | `CLAUDE.md R-83` · `.ctx/TIMESTAMPS.md` |
| 界面文案与制度母本「**连续 ≥20 字重合即红**」（制度原文不进界面，改写成一行 ＋ `docs/help.html` 深链） | `DESIGN_SYSTEM.md §4.18 C7` · `docs/src/**` 界面文本 | `copy-master-guard.test.mjs::N1–N4` | 已闭环（基线 **11 条 / 9 文件**） | `DESIGN_SYSTEM.md §4.18` |
| 界面文案长度存量回归（卡片导语 ≤60 字 · 单段 ≤80 字 · 单句括注 ≤2 个 · 空态 ≤30 字） | `DESIGN_SYSTEM.md §4.18 C1/C2/C5/C6` | `copy-length-guard.test.mjs::L1–L6` | 已闭环（**源码静态近似**、逐类基线 ratchet；`L6` 只报不判） | `DESIGN_SYSTEM.md §4.18` |
| 同屏复述（归一化后 ≥15 字块出现 ≥2 次）与每屏「文案 ÷ 控件」比值（≤12；12–20 须登记；>20 记待改造） | `DESIGN_SYSTEM.md §4.18 C3/C4` | `copy-screen-guard.test.mjs::M1–M4` | 已闭环（**真机** 7 台 × 默认视图，自起自停） | `DESIGN_SYSTEM.md §4.18` |
| 折叠区口径与 `help.html` 是否**同义**（C8）——**机器判不了「同义」⇒ 只登记不判红** | `DESIGN_SYSTEM.md §4.18 C8` · `docs/src/**` 折叠区 · `docs/help.html` | `copy-fold-guard.test.mjs::F1/F2`（**只报不判**） | 半闭环（如实登记：C8 落「纪律 ＋ 人检清单」，守卫不越界假装覆盖） | `DESIGN_SYSTEM.md §4.18` |
| 口径定点锚点**真机可达 / 可检索**（深链直达且目标可见；搜索 → 点结果 → 卡片高亮） | `docs/help.html` 的 `card-copy-*` 定点卡片 · `help-catalog.js` 运行时索引 | `copy-anchor-guard-e2e.test.mjs::A1–A3` | 已闭环（CDN 一律 `route.abort`、不依赖外网） | `DESIGN_SYSTEM.md §4.18` |
| mock 形态与 api 形态**读数一致** ＋ **服务端是否真按同源播种**（承重臂＝服务端 HTTP 原始行；只看前端缓存会被 `SEED_FALLBACK` 顶替 ⇒ 假绿） | `docs/src/data/mock/**` 语料 · `server/seed.js` · `server/routes/resources.js` | `mock-api-parity.test.mjs::S0 / P1–P3` | 已闭环（表集合 5 张：`todos` / `notices` / `attendances` / `inspections` / `makeupTasks`） | `.ctx/logs/2026-09-DECISION_LOG.md`（`D-658`） |
| 数据库结构变更必须走**版本化迁移**（`PRAGMA user_version` ＋ 有序 `MIGRATIONS`；新建库 / 幂等可重入 / 既有库兼容 / 失败回滚 / 失败不吞） | `server/db.js`（`MIGRATIONS` / `SCHEMA_VERSION` / `applyMigrations`） | `db-migration.test.mjs::M1–M6` | 已闭环 | `.ctx/ACTIVE_RULINGS.md`（`D-650`） |
| SQLite 备份一律用 `db.backup()`、**绝不直接 `copy` 主文件**（WAL 尾部会丢）——备份 → 破坏 → 恢复到新路径演练 | `server/scripts/backup.mjs`（在线备份 API） | `backup-restore.test.mjs::B1` | 已闭环（真 spawn 备份脚本 ＋ 反证「只 `copy` 丢 WAL 尾」） | `.ctx/ACTIVE_RULINGS.md`（`D-650`） |
| 数据库完整性 / 版本自检 ＋ 「**新增结构须写 migration**」纪律（`ALTER TABLE` 只许出现在 migration 段内） | `server/db.js`（`validateMigrations` · v1 冻结基线 45 表） | `db-integrity-guard.test.mjs::G1–G6` | 已闭环 | `.ctx/ACTIVE_RULINGS.md`（`D-650`） |
| 浏览器存储键必须登记（键 ⊆ 三档白名单：服务端权威 / 本机临时 / UI 偏好与会话；**新键未登记即红**） | 本文件 **§0.3 浏览器存储键白名单**（守卫的镜像；**改表即改守卫映射、两处同批动**） | `localstorage-key-guard.test.mjs::L1–L3` | 已闭环 | 本文件 §0.3 |
| **台账备注列预算**（备注只写「现状 / 边界 / 为什么」；逐批沿革一律进 `.ctx/logs/**`——**新增即红、只降不升**） | `.ctx/TIMESTAMPS.md` 备注列 · 存量台账 `server/test/timestamps-note-baseline.mjs` · 纪律 `CLAUDE.md R-89` | `timestamps-note-guard.test.mjs::N1–N7` | 已闭环（存量 **174 条**待专项批收敛；放宽基线＝越权项） | `CLAUDE.md R-89` |

**使用说明**

1. **本表是索引，不是判据**——判据在守卫文件（`server/test/*.test.mjs`）与「详述处」所指文档；本表只回答「一条规则由谁守、守没守住、去哪看」。
2. **新增 / 修改规则必须同时更新本表**（谁改谁负责）——漏更本表即视为该规则未登记。
3. **本表的数字由 `server/test/doc-consistency.test.mjs::S9` 守卫**——该断言由批次 44 的另一条工作流落地（立表时实测 `doc-consistency` 仅存 S1–S8，尚无 S9）。**在 S9 落地前，本表断言号为人工维护**：改表须重新实测上列守卫文件的断言，不得凭记忆写。**（2026-09-26 批次 205：本表新增 12 行**——把已落地但未登记进本索引的守卫逐条补上：`doc-line-ref` / `frontmatter-freshness` / `copy-master-guard` / `copy-length-guard` / `copy-screen-guard` / `copy-fold-guard` / `copy-anchor-guard-e2e` / `mock-api-parity` / `db-migration` / `backup-restore` / `db-integrity-guard` / `localstorage-key-guard`；**断言号一律实读**各守卫文件里的 `test(...)` 名，不凭记忆。**与 `§3.4` 的关系**：本批新增**均非 R 编号行**，而 `.ctx/ENGINEERING_ASSESSMENT.md §3.4` 收的是 R13–R30 编号规则 ⇒ **无需在 §3.4 补行**；两处是「方法论口述版 ↔ 可执行索引」的分工，非同一批行的两处副本。）

---

## 0.3 浏览器存储键白名单（2026-09-24 批次 169，支书逐字「不能什么都依靠浏览器缓存」）

> **一句话**：全仓每一个 `localStorage` / `sessionStorage` 键都必须落进下面**三档之一**；**新键未登记即红灯**。
> **机器判据**＝`server/test/localstorage-key-guard.test.mjs`（纯 node，断言 L1–L3）：枚举全仓键字面量、逐键归类、
> 命中未登记键时给出「请登记到白名单或改为服务端权威」的提示。**本表是它的镜像**（改表即改守卫映射，两处同批动）。
> **三档口径**：
> - **A 服务端权威**（server-authoritative）：该键的真相在服务端表 / 快照，本机键只是镜像 / 缓存 / mock 形态的对应物；**清了不丢数据**（或只是回到服务端值）。
> - **B 本机临时白名单**（local-only）：语义上**就应当只在本机**（草稿 / 预览 / mock 形态专属 / 设计如此）——**不上服务端**，逐条写理由。
> - **C UI 偏好与会话**（ui-pref-session）：主题 / 字号 / 强调色 / 个人偏好前缀 / 登录会话 / 标签页 / 令牌。

**A 档：服务端权威（16 个键）**

| 键 | 语义 | 服务端对应物 |
|---|---|---|
| `workflowos_branch_db_v1` | mock 形态整库落盘 | api 形态＝服务端快照与各业务表 |
| `gsm1921-residence-overrides` | 在册/滞留状态（**本机键仅 mock 形态用**） | `users` 行的 `residenceStatus`/`residenceNote`/`residenceHistory` |
| `gsm1921-member-confirmations` | 成员变更确认队列 | 表 `member_confirmations`（批次 163） |
| `gsm1921-attendance-appeals` | 出勤申诉队列 | 表 `attendance_appeals`（批次 169） |
| `gsm1921-inspection-appeals` | 考察申诉队列 | 表 `inspection_appeals`（批次 169） |
| `gsm1921-issue-unread-`（前缀） | 逐人未读标记 | 表 `issue_unread`（批次 169） |
| `sop_org_os_auth_audit` | 授权审计留痕 | 表 `auth_audit`（批次 169） |
| `gsm1921-issue-cache-v3` / `gsm1921-issue-cache` / `gsm1921-issue-cache-version` | 意见反馈读缓存 + 版本号 | 表 `issues` |
| `gsm1921-feedback-migrated` / `gsm1921-feedback-submissions` | 旧版反馈迁移标记 / 迁移源 | 同上（迁移的是种子，非用户数据） |
| `issue_reveals` | 匿名反馈「查看真身」留痕（mock 形态本地同构） | 表 `issue_reveals` |
| `gsm1921-milestone-cache` | 批次里程碑读缓存 | 表 `milestones`（内容单一源 `docs/data/milestones.json`） |
| `workflowos_taskforces_v1` / `workflowos_notices_v1` | 专班 / 通知旧单域键（已被整库键取代） | 服务端资源表 `taskforces` / `notices` |

**B 档：本机临时白名单（10 个键）——「允许只在本机」及理由**

| 键 | 语义 | 为什么**不上服务端** |
|---|---|---|
| `gsm1921-base-data-preview` | 本机临时·**预览**（换组织前「本地看效果」） | 服务的正是「只看效果、不改真数据」——服务端化会把「预览」变成「真改」（`org-base-data-preview.js`） |
| `gsm1921-issue-drafts` | 本机临时·**草稿**（未提交的反馈/评论） | 草稿 payload 可能含**匿名真身** ⇒ 落服务端即破坏匿名承诺（`issues.js`） |
| `gsm1921-workforce-draft` | 本机临时·**草稿**（支书台「拟定分工」未提交内容） | 属该设备上未完成的工作，不是组织决定（`workforce-panel.js`） |
| `workflowos_leader_activity_draft` | 本机临时·**草稿**（组长「写入活动」表单暂存） | 同上；刷新恢复用（`write-tab.js`） |
| `wizard-draft-`（前缀） | 本机临时·**草稿**（换组织向导未走完，按支部一份） | 同上（`org-setup-wizard.js`） |
| `gsm1921-members-overlay` | **mock 形态专属**：成员档案覆盖层 | api 形态读链走 server `users`、写走 `/members*` 端点 ⇒ 无需服务端化（`person.js`） |
| `gsm1921-accounts` | **mock 形态专属**：可持久化账号层 | api 形态账号承载＝server `users` 表行（`accounts.js`） |
| `gsm1921-dev-stage-overrides` | **遗留键（2026-09-28 已服务端化）**：原「进入当前阶段日期」本机覆盖档案 | 该事实已改挂成员档案字段 **`developStageSince`**（服务端权威、随 `users` 表落库、跨设备可读）；写口＝支书确认生效（`member-confirmation.js::_applyApproved` 与 `developStage` 同一笔），读口＝`loadStageEntryDates()`。本键只剩「init 档移除清单」引用（清旧机残留），**不得再出现业务读写**（`member-confirmation.js` / `init-reset.js`） |
| `gsm1921-issue-submitter-token` | **设计如此·本机令牌**（随机、不可反查人的防刷令牌） | 按设计只在本设备；落服务端反成身份线索（`issues.js`） |
| `gsm1921-init-state` | 本机·初始化态闸门（「正在初始化」的内存语义落盘位） | 非业务数据，纯本标签页运行态（`init-reset.js`） |

**C 档：UI 偏好与会话（19 个键）**

| 键 | 语义 |
|---|---|
| `workflowos_theme` / `workflowos_font_size` / `workflowos_accent_role` | UI 偏好·主题 / 字号 / 强调色 |
| `gsm1921-pref-`（前缀） | UI 偏好·个人偏好键空间（`theme.js` / `preferences.js`） |
| `workflowos_tab_*`（6 个：`secretary`/`org`/`prop`/`disc`/`leader`/`visitor`） | UI 偏好·工作台页签记忆（各 `ws-*-entry.js` 的 `storageKey`） |
| `gsm1921-api-token` / `gsm1921-login-user` / `gsm1921-tab-id` / `gsm1921-session-snap` | 会话·API token / 登录人 / 本标签页 ID / 会话快照 |
| `sop_org_os_session` / `sop_org_os_data_version` / `cps-`（前缀） | 会话·跨页状态会话 / 数据版本 / 跨页单值参数前缀 |
| `gsm1921-remote-probe` | UI 偏好·远端变更探测开关（`off`/`0`/`false`＝关） |
| `sop_org_os_assigned_roles` | 历史遗留键·仅启动清理一次（`roles.js` 已无调用方） |

> **新增键怎么办（判据即提示）**：① 若它的真相应当由服务端承载（可被他人 / 其他设备读到）⇒ **改为服务端权威**（照 `server/db.js::SEMANTIC_TABLES` + `server/routes/resources.js` 的「语义端点域」模板）；② 若它**确实只应在本机** ⇒ 登记进上表 B 档 + `server/test/localstorage-key-guard.test.mjs` 的同名映射，并写明「为什么不上服务端」。

---

## 1. 人员数据

**存储**：`docs/src/data/mock/people.js` → `PEOPLE` 常量（50 条记录，p1~p50）
**运行时**：`mockDB.users`（由 `docs/src/data/mock/people.js` PEOPLE 经 `seed.js` 注入）
**登录映射**：`docs/src/data/mock/accounts.js` → `MOCK_ACCOUNTS`（17 条，studentId ↔ personId）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 首页日历中的组织者信息 | 全部 |
| workspace/secretary.html | 赋权管理 tab：常设赋权（设组长）+项目赋权（organizer/deep）；人员选择器、统计卡片 | 支书 |
| workspace/org.html | 人员选择器、发展党员追踪 | 组织委员 |
| workspace/prop.html | 宣传任务关联人员 | 宣传委员 |
| workspace/disc.html | 考勤/考察/补课涉及人员 | 纪检委员 |
| workspace/leader.html | 人员选择器、党小组成员 | 党小组组长 |
| workspace/visitor.html | 只读人员信息 | 访客 |
| login.html | 学号+密码登录 | 全部 |

**同源校验点**：

- [ ] 支书工作台赋权管理 tab 中被赋权人候选列表对应 PEOPLE 中非支委成员
- [ ] 各工作台人员选择器中的列表对应 PEOPLE 全部成员（PersonPicker 默认可注入 filter；特定场景由调用方传过滤，如发展党员候选为非正式党员、支书赋权被赋权人为非支委）
- [ ] 人员发展阶段在各页面中一致（正式党员/预备党员/发展对象/积极分子），与 people.js 定义相同
- [ ] 登录页输入 accounts.js 中的学号+密码 → 成功登录后跳转首页，首页顶栏展示对应角色工作台入口（login-entry.js 登录后跳 index.html；main-entry.js 按角色改写 workspace 链接）
- [ ] 支书工作台赋权管理 tab 中常设角色标签（支书/支委/组长）对应 PEOPLE 中 role 字段 + AuthStore 赋权记录
- [ ] 发展党员追踪候选人（由 PEOPLE 中 developStage 非'正式党员' 的成员动态派生）的 stage 与 developStage 一致

**跨表一致性（自动化守卫）**（`server/test/person-consistency.test.mjs`，2026-09-13 批次 21 新增，7/7 通过）：

- [ ] **S1 结构层**：禁止模块加载期人员快照——模块顶层 `const X = PersonStore.getMembers()` 一律改 `liveMembers()` 实时视图
- [ ] **S2 结构层**：禁止凭姓名认身份——`.find(p => p.name === …)` 不得作身份判据，须「先按 id、姓名仅唯一命中才采纳」
- [ ] **S3 结构层**：禁止手写已成单一源的活动存储态判据——一律走 `core/domain/constants.js` 的 `isActivityEnded / isActivityArchived / isActivityNotStarted / isActivityLive`
- [ ] **D1 数据层**：引用存在性——各域引用的 `personId` 均存在于权威人员源
- [ ] **D2 数据层**：姓名快照一致——各域冗余 `personName` 与权威源姓名一致
- [ ] **D3 数据层**：档案字段快照一致——各域冗余档案字段与权威档案值一致
- [ ] **D4 数据层**：同域双字段自洽——同一域内两字段指向同一实体时相互一致
- [ ] **D5 数据层**：唯一档案 + 账号可解析——每个在册人唯一档案且可由登录账号解析

---

## 2. 活动数据

**存储**：`docs/src/data/mock/activities.js` → `ACTIVITIES` 常量（**33 条记录，act-1~act-35（act-28 已删除）**；实测口径＝`mock-integrity` M1 打印 `ACTIVITIES`）
**运行时**：`mockDB.activities`（由 `seed.js` 注入）
**Service**：`docs/src/services/activity/activity.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 首页日历标记+活动列表+招募区 | 全部 |
| workspace/secretary.html | 决策树活动写入+统计卡片+日历 | 支书 |
| workspace/org.html | 专班管理+活动列表 | 组织委员 |
| workspace/prop.html | 活动/专班看板 | 宣传委员 |
| workspace/disc.html | 考勤关联活动 | 纪检委员 |
| workspace/leader.html | 决策树活动写入+日历 | 党小组组长 |
| workspace/visitor.html | 只读活动查询 | 访客 |
| help.html | 权限体系说明（谁可创建活动） | 全部 |

**同源校验点**：

- [ ] 首页日历/列表中的活动数量 = ACTIVITIES 中未归档的记录数（仅过滤 archived；已取消活动如 act-20 仍显示并带「已取消」徽章，成员可感知取消事实）
- [ ] 支书工作台全局概况「活动与专班进度」= 未归档活动数（activeActivities）+ 进行中/招募中专班数（activeTaskforces）+ 待赋权活动数（pendingAuth，bottom-up 且 assignments 无 organizer）+ 复盘问题数（reviewIssues，活跃活动复盘 issues 总条数）
- [ ] 首页统计卡「本月活动」= 未归档且日期属本月（main-entry `_renderStats`，与支书概况口径同源）
- [ ] 活动状态在各页面中一致：draft/published/ongoing/completed/cancelled
- [ ] 品牌活动在日历/看板中标有品牌标记（isBrand=true 的活动；isBrand 为属性标签，无独立计数统计）
- [ ] 活动的 organizer 字段（如 p3=王五）在首页和各工作台中一致
- [ ] help.html 中"创建活动仅限党支书和党小组组长"= auth.js ROLE_PERMISSIONS 中的 create_activity 权限

---

## 3. 专班数据

**存储**：`docs/src/data/mock/taskforces.js` → `MOCK_TASKFORCES` 常量（8 条记录，tf-001~tf-008）
**运行时**：`mockDB.taskforces`（由 `seed.js` 注入）
**Service**：`docs/src/services/activity/taskforce.js` → `TaskForceRecordStore`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 首页招募区（recruiting 状态专班） | 全部 |
| workspace/secretary.html | 专班总览+赋权管理 tab（专班成员赋权记录） | 支书 |
| workspace/org.html | 专班看板（待启动/进行中/已完成）+发布招募 | 组织委员 |
| workspace/prop.html | 专班看板 | 宣传委员 |
| workspace/disc.html | 专班考察记录 | 纪检委员 |
| workspace/visitor.html | 只读专班信息 | 访客 |

**同源校验点**：

- [ ] 首页招募区的专班 = MOCK_TASKFORCES 中 status='recruiting' 的记录（tf-005/tf-006）
- [ ] 组织委员看板中的专班分类与 MOCK_TASKFORCES 的 status 字段一致
- [ ] 专班成员 personId 在 PEOPLE 中存在
- [ ] 已解散专班（tf-008 status='dissolved'）在各工作台不显示为活跃专班
- [ ] 首页通知"五四主题党日筹备专班已组建"→ 组织委员看板可见 tf-003（completed）

---

## 4. 考勤数据

**存储**：`docs/src/data/mock/attendance.js` → `ATTENDANCE_RECORDS` 常量（**152 条记录**：显式种子段 `att1`~`att43` ＋ 隔离段 `att900`，`att44`~`att151` 由 8 月活动生成器追加〔`_AUGUST_EVENTS`：act-26 全员 50 ＋ act-27 支委班子 8 ＋ act-29 全员 50 ＝ 108〕；**2026-09-26 批次 205 改准**：原写「151 条记录，att1~att151」——既漏计隔离段 `att900`，且批次 192/195 剔除党委组织员 `p_pc`〔`_ALL_PERSON_IDS` 按 `branchId` 过滤〕后实测为 **152**）
**运行时**：`mockDB.attendances`（由 `seed.js` 注入）
**Service**：`docs/src/services/activity/attendance.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 考勤明细（宽格式/长格式切换）+考勤确认 | 纪检委员 |
| workspace/leader.html | 考勤上传（党小组组长） | 党小组组长 |
| workspace/visitor.html | 只读考勤视图 | 访客 |

**同源校验点**：

- [ ] 纪检委员考勤明细中某活动的出勤人数 = ATTENDANCE_RECORDS 中该 activityId 且 status=present 的记录数
- [ ] 考勤记录的 personId 在 PEOPLE 中存在
- [ ] 考勤记录的 activityId 在 ACTIVITIES 中存在
- [ ] 已补课考勤记录（status='made_up'）= 补课任务中 status='completed' 的记录对应（att27/att14 已完成补课）
- [ ] 组织生活会（act-19）考勤记录含 studentId/developStage/partyGroup 字段
- [ ] 缺勤考勤记录中 overdue=true 的（att10/att33）应在补课任务中有对应 pending 项

---

## 5. 考察数据

**存储**：`docs/src/data/mock/inspection.js` → `INSPECTION_RECORDS` 常量（42 条记录，insp-1~insp-43（insp-17 已删除））
**运行时**：`mockDB.inspections`（由 `seed.js` 注入）
**Service**：`docs/src/services/activity/inspection.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 考察档案（以人为中心/按来源分组） | 纪检委员 |
| workspace/leader.html | 考察上传 | 党小组组长 |

**同源校验点**：

- [ ] 考察记录的 personId 在 PEOPLE 中存在
- [ ] 活动考察记录（sourceType='activity'）的 activityId 在 ACTIVITIES 中存在
- [ ] 专班考察记录（sourceType='taskforce'）的 sourceName 在 MOCK_TASKFORCES 中有对应名称
- [ ] 考察层级（organize/deep）= 活动的 assignments 中对应人员角色
- [ ] 参与过活动/专班（assignments 中 role=organizer/deep）的人员**应有**对应考察记录——业务期望，考察为组长/组织委员手工上传，数量依赖录入行为，非自动从 assignments 派生（B4-2 修正 2026-08-24）
- [ ] 考察记录字段语义（P1-5 固化）：考察内容入 `content` 字段，`role` 存角色职责标签，禁止把内容文本塞进 role
- [ ] 组长/组织委员录入的考察子记录同步写入正式考察库（P0-2 固化），同一数据仅一套正式存储

---

## 6. 通知数据

**存储**：`docs/src/data/mock/notices.js` → `MOCK_NOTICES` 常量（12 条记录，notice-101~notice-108 + notice-110 + notice-001/notice-005/notice-011）
**运行时**：`mockDB.notices`（由 `seed.js` 注入）
**Service**：`docs/src/services/governance/notice.js` → `NoticeStore`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 通知铃铛+通知列表 | 全部 |
| notice.html | 通知详情页（含通知者/被通知者/时间） | 全部 |
| 各工作台 | 通知→待办派生（[DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md) §2.19 机制） | 各角色 |

**同源校验点**：

- [ ] 首页通知铃铛未读数 = MOCK_NOTICES 中 read=false 且未过期的记录数
- [ ] 紧急通知（priority='urgent'）在首页标红显示
- [ ] 已过期通知（expireDate < 当前日期）不在首页通知列表中显示
- [ ] 通知详情页内容 = MOCK_NOTICES 中对应 id 的完整数据
- [ ] 通知 targetModule 与实际页面对应：activity→活动相关、party→发展党员、workspace→工作台、attendance→考勤

---

## 7. 待办数据

**存储**：`mockDB.todos`（运行时由 NoticeTodoDeriver/LifecycleTodoDeriver 派生）
**Service**：`docs/src/services/governance/todo.js` → `TodoStore` + `NoticeTodoDeriver` + `LifecycleTodoDeriver`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/secretary.html | 待办 tab（双栏布局：分类+列表） | 支书 |
| workspace/org.html | 待办 tab | 组织委员 |
| workspace/prop.html | 待办 tab | 宣传委员 |
| workspace/disc.html | 待办 tab | 纪检委员 |
| workspace/leader.html | 待办 tab | 党小组组长 |
| workspace/visitor.html | 待办 tab（只读） | 访客 |

**同源校验点**：

- [ ] 通知类待办（TodoCategory.NOTICE）= actionable=true 且 actionRoles 非空的通知，为每个角色派生一条（NoticeTodoDeriver，字段驱动而非关键词判断）
- [ ] 审核类待办（TodoCategory.REVIEW）= 待审核的考勤/考察/复盘记录派生
- [ ] 赋权类待办（TodoCategory.AUTH）= 活动创建→组长赋权待办（LifecycleTodoDeriver.deriveFromActivityCreate）+ 专班创建→组织委员赋权待办（deriveFromTaskforceCreate）+ 支书待赋权活动派生
- [ ] 各角色工作台的待办列表仅含与该角色相关的待办
- [ ] 待办状态流转：pending → in_progress → completed（或 expired）
- [ ] 支书待办 8 组动态聚合（SecretaryTodoDeriver.computeAggregates）：4 提醒类（考勤>3天未录入/考察超期/复盘>7天未提交/归档材料缺失）+ 4 复核类（考勤/考察/复盘/归档 secretaryConfirmedAt 为空），空组不展示

---

## 8. 赋权数据

**架构（T-190 赋权整合闭环）**：一主源 + 一审计快照 + 双写 + 单读
- **主源**：活动角色 `mockDB.activities[].assignments` / 专班成员 `mockDB.taskforces[].members`（统一英文编码 `organizer`/`deep`）
- **审计快照**：localStorage `sop_org_os_auth_audit`（只增不改；revoke 为追加记录，判定取最新一条）
- **常设赋权**（党小组组长 leader）：AuthStore 赋权链（AUTHORIZE_CHAIN），快照同样记录
- **Service**：`docs/src/services/core/auth.js` → `AuthStore`（authorize / revokeAuthorization / syncProjectRoles 三合一：写主源 + 追加快照 + 通知）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/secretary.html | 赋权管理 tab：常设赋权（设为/取消组长）+项目赋权（organizer/deep） | 支书 |
| workspace/leader.html | 活动详情内联编辑角色（保存走 syncProjectRoles） | 组长 |
| workspace/org.html | 专班详情内联编辑成员角色（保存走 syncProjectRoles） | 组织委员 |

**同源校验点**：

- [ ] 支书工作台赋权管理 tab 的「已赋权记录」= 审计快照 `sop_org_os_auth_audit`
- [ ] 活动/专班项目角色（organizer/deep）主源 = `activity.assignments` / `taskforce.members`，新建数据在主源可查
- [ ] 赋权记录中 targetPersonId 在 PEOPLE 中存在
- [ ] 被赋权角色（organizer/deep/leader）在 auth.js AUTHORIZE_CHAIN 中有赋权链定义
- [ ] 赋权后，被赋权者工作台出现对应角色页面，AuthStore.canDo() 返回 true
- [ ] 撤销/解散专班回收赋权后：主源角色被移除 + 快照追加 revoke，被赋权者恢复为普通参与者
- [ ] 全仓禁止无主源写入点的字段：授权记录上的 `authorizedBy`/`scope` 必须有主源写入点（巡检 P0-1/P0-3 缺口固化）

---

## 9. 反馈数据

**存储**：`docs/data/issues.json`（权威源）+ localStorage `gsm1921-issue-drafts`（个人草稿）
**Service**：`docs/src/services/governance/issues.js` → `IssueStore`（旧 FeedbackStore 已弃用，保留 shim 兼容）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| feedback.html | GitHub Issue 风格反馈列表+提交表单 | 全部 |
| workspace/secretary.html | 反馈统计（意见处置＝支委层：状态变更/关闭/隐藏/编辑） | 支委层 |

**同源校验点**：

- [ ] feedback.html 的反馈列表 = issues.json 中的记录
- [ ] 支书面板的反馈统计 = IssueStore.countByStatus() 的结果
- [ ] 意见处置权限（关闭 issue/隐藏评论/编辑他人 issue）＝支委层 = auth.js 中的 _ISSUE_PERMS_DISPOSITION（2026-09-21 批次 126 前为支书专属 _ISSUE_PERMS_SECRETARY）
- [ ] 旧 FeedbackStore.getAll() 返回数据 = IssueStore 数据的兼容映射

---

## 11. 补课数据

**存储**：`mockDB.makeupTasks`（`core/domain/domain.js` 初始化 `[]`，经 `data/data-adapter.js` 持久化；服务端模式路由 `/api/v1/makeupTasks`）
**运行时**：`mockDB.makeupTasks`
**Service**：`docs/src/services/activity/makeup.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 补课任务列表+确认补课 | 纪检委员 |
| workspace/leader.html | 补课状态查看 | 党小组组长 |

**同源校验点**：

- [ ] 补课任务的 personId 在 PEOPLE 中存在
- [ ] 补课任务的 activityId 在 ACTIVITIES 中存在
- [ ] 补课任务的 attendanceRecordId 在 ATTENDANCE_RECORDS 中存在且对应记录 status 为 absent 或 leave
- [ ] 纪检「确认完成」补课任务时，按 attendanceRecordId 回写对应考勤记录 status='made_up' + overdue 清除（B3-1 修复 2026-08-24，完成必须对应真实产物）
- [ ] 已完成补课（status='completed'）对应的考勤记录 status='made_up'（att27/att14）
- [ ] 刚性考勤活动类型（支部党员大会/党小组会/党课/主题党日）的补课 isMandatory=true
- [ ] 补课截止日期 = 缺勤日期 +7 天

---

## 12. 复盘数据

**存储**：`docs/src/data/mock/review.js` → `REVIEW_RECORDS`（11 条活动复盘）+ `TASKFORCE_REVIEW_RECORDS`（2 条专班复盘）
**运行时**：`mockDB.activityReviews` / `mockDB.taskforceReviews`（P1-4 修复后写入 mockDB + persist()，刷新不丢失）
**Service**：`docs/src/services/governance/review.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 复盘审核（批注/打回/确认） | 纪检委员 |
| workspace/leader.html | 复盘提交 | 党小组组长 |

**同源校验点**：

- [ ] 活动复盘的 activityId 在 ACTIVITIES 中存在
- [ ] 专班复盘的 sourceName 在 MOCK_TASKFORCES 中有对应名称
- [ ] 复盘状态流转覆盖 5 种：未提交→已上传→批注中→已确认/已打回
- [ ] 已打回复盘（rev7 act-7）有 annotation 和 annotatedBy 字段
- [ ] 复盘的 organizerId = 对应活动/专班的 organizer 字段
- [ ] 复盘提交后持久化（P1-4 固化）：刷新页面后记录仍在；支书全局概况按**复盘问题数**（reviewIssues，活跃活动复盘中 issues 数组总条数）统计——2026-08-10 裁定复盘改问题导向，复盘完成率已废弃

---

## 13. 分工数据

**存储**：`docs/src/data/mock/seed.js` → `SEED_ASSIGNMENTS`（5 条种子数据）
**运行时**：`mockDB.assignments`
**Service**：无独立 Service——分工数据经 `data/data-adapter.js`（adapter.assignments）读写，权限联动 `services/core/auth.js`（syncProjectRoles）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/secretary.html | 分工记录总览 | 支书 |

**同源校验点**：

- [ ] 分工记录的 assigneeId 在 PEOPLE 中存在
- [ ] 分工记录的 activityId 在 ACTIVITIES 中存在
- [ ] 分工状态（pending/in_progress/completed）与 data-adapter.js 的状态流转一致

---

## 14. 图片数据

**存储**：`mockDB.imageRecords`（运行时动态创建）
**Service**：`docs/src/data/data-adapter.js`（imageRecords 聚合）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/prop.html | 图片管理（上传/标注/查看） | 宣传委员 |

**同源校验点**：

- [ ] 图片记录的 uploadedBy 在 PEOPLE 中存在
- [ ] 图片关联的 activityId（若有）在 ACTIVITIES 中存在

---

## 15. 文件空间数据

**存储**：`mockDB.fileSpaceRecords`（运行时动态创建）
**Service**：`docs/src/services/core/mock.js`（通用 CRUD）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/prop.html | 文件管理（经验沉淀/原始文件/宣传素材） | 宣传委员 |

**同源校验点**：

- [ ] 文件记录的 uploadedBy 在 PEOPLE 中存在
- [ ] 文件分类（experience/raw/publicity）与 category 字段一致

---

## 16. 登录与身份门控（2026-08-24 新增，B1-3）

> 认证与页面门控链路（设计权威源：AUTHENTICATION_MODEL.md §四 登录门控四层）。核心：登录态由 auth.js 单一判定，页面身份校验防错位。

**存储**：`localStorage gsm1921-login-user`（`{personId, role, tabId}`）+ `sessionStorage gsm1921-tab-id` / `gsm1921-session-snap`
**Service**：`docs/src/services/core/auth.js` → `AuthStore`（login / devLogin / logout / getCurrentUser）；`docs/src/core/boot/bootstrap.js`（门控执行）

**同源校验点**：

- [ ] 已登录用户访问 login.html → 直接跳转首页（login-entry.js L10-13）
- [ ] 账号密码登录成功后 → 跳转首页，首页顶栏展示对应角色工作台入口（ROLE_PAGE_MAP 角色→页面映射）
- [ ] 工作台页面身份校验：用户访问非其身份对应工作台 → 自动跳转身份对应页面（bootstrap.js 登录快照角色页面 + 内存判定角色页面集合）
- [ ] `?dev=ROLE` 绕过仅限本地 hostname（localhost/127.0.0.1/::1）+ 白名单角色，生产环境拒绝（bootstrap.js DEV_HOSTNAME_WHITELIST / DEV_ROLE_WHITELIST）
- [ ] 登录态多标签页防串扰：getCurrentUser() 校验 tabId，tabId 不匹配回退本标签页快照（auth.js + login-snapshot.js 键名硬同步）
- [ ] CODE_VERSION 代码版本自检：旧 tab 持有旧 ES 模块时自动刷新一次加载新模块（cross-page-state.js isStaleCodeVersion + bootstrap.js）

---

## 跨类别同源校验

> 以下校验点涉及多种数据类别之间的关联一致性。

- [ ] 缺勤→补课→考勤联动：缺勤考勤记录（absent/leave）自动生成补课任务→补课完成后考勤状态变 made_up
- [ ] 通知→待办派生：actionable=true 且 actionRoles 非空的通知自动为各角色派生待办（字段驱动；含"确认/提交/审核"等关键词仅旧表述，实际以字段为准）
- [ ] 活动/专班→待办派生：状态变更（新建/到期/超时）自动派生审核类/归档类待办
- [ ] 活动 assignments → 考察记录：assignments 中 role=organizer/deep 的人员**应有**对应考察记录（业务期望，手工录入；非自动派生）
- [ ] 发展党员候选人 stage ↔ people.js developStage：候选人阶段与人员发展阶段一致
- [ ] 专班成员 personId ↔ people.js：专班 members 数组中 personId 在 PEOPLE 中存在
- [ ] 活动写入→日历/统计联动：支书/组长写入活动后，首页日历和统计卡片同步更新
- [ ] 首页统计卡口径（main-entry `_renderStats`）：本月活动=未归档且属本月 / 活跃专班=active+recruiting / 未读通知=activeOnly 且未读 / 个人考勤率=(present+made_up)/total（90/70 阈值三色）
- [ ] 活动生命周期展示态（deriveActivityLifecycleStatus）：草稿→已发布→进行中→已执行/待归档→已归档（+已取消）；全站徽章统一按此展示，不直接读 status 字面值（**单一源位置＝`components/record/inspector.js` 的 `ACTIVITY_LIFECYCLE` + `deriveActivityLifecycleStatus` + `activityLifecycleBadgeHtml`，2026-09-13 确认唯一**）
- [ ] 活动存储态判据单一源（`isActivityEnded / isActivityArchived / isActivityNotStarted / isActivityLive`，`core/domain/constants.js`）：活动「已结束/已归档/未开始/仍在办」判据全站禁止手写 `status==='completed' || archived`，一律引用该单一源
- [ ] 按人视图口径（SecretaryOverviewStore.getPersonOverview）：4 角色（org/prop/disc/leader，副支书除外）；todoCount=聚合卡 count 求和；在办活动/专班按职责关系投影（manager=统筹/initiator=发起/member=成员）
- [ ] **前端持久化域 ↔ server 表对账（B5-2 2026-08-24 立；2026-09-15 收敛为实测口径，Q-23-1 结案）**——**口径定义**（下列五个数各自统计什么，严禁混用/互相代入）：
  - **mockDB 顶层业务域** ＝ `docs/src/core/domain/domain.js::mockDB` 的顶层非 `_` 键数 → **实测 34**（含 `users` 与仅内存读链的 `pendingMemberConfirmations`；2026-10-02 批次 342 删 `complianceReferences` ⇒ 35 → 34）
  - **localStorage 持久化域** ＝ `docs/src/data/mock-adapter.js::_saveToStorage()` 序列化字段数 → **实测 33**（含 `users`；users 在 mock 形态走「members 持久覆盖层」子域；同上批删 `complianceReferences` ⇒ 34 → 33）
  - **server 表** ＝ `server/db.js::RESOURCE_TABLES` 长度 → **实测 34**（含 `issues` / `member_change_requests` / `committee_broadcasts` / `agenda_votes` / `issue_reveals` 五张语义端点表——不进通用资源名映射；`issue_reveals` 为 2026-09-17 支书裁定「查看匿名的权限只有党委有」的留痕表，仅 `GET /api/v1/issues/reveal` 命中时写入）
  - **资源名映射** ＝ `server/routes/resources.js::RESOURCE_TABLES` 键数 → **实测 29**
  - **快照 payload 键** ＝ `docs/src/data/data-adapter.js::_buildSnapshotPayload()` 键数 → **实测 24**
  - 四数之差有据：资源名 29 ＋ 语义端点表 5 ＝ server 表 34；持久化域 33 − 快照排除的 9 域（`users` / `branchDocs` ＋ `memberChangeRequests` / `committeeBroadcasts` / `agendaVotes` / `handoffs` / `branches` / `appointmentRecords` / `reviewRequests`）＝ 快照 24。**结论：三者非「一一映射」，须按上述分口径读**（旧文件「27 域 / 28 表一一映射」的表述已作废）。
- [ ] 快照写穿边界（B5-1/B5-3 2026-08-24）：全量快照（`_buildSnapshotPayload`）覆盖 **24** 个键，**不含 users 与 branchDocs**；branchDocs 走 per-item CRUD（POST/PATCH/DELETE `/api/v1/branchDocs`）且仅支委可写（COMMISSIONER_WRITE）——**严禁将 branchDocs 加入快照 payload**，否则 references.js 本地缓存与 server 会产生覆盖竞态
  > **口径维护**：实测值以本节上列五行为唯一口径；此后新增域须同步更新这五个值，勿只改其中一处。
  > **迁出去向说明**：本处原有三条批次注（批次 25 新增 `partyGroups` / `memberFlows` 两域、2026-09-15 收口替换并列旧数、2026-09-17 由 34 改为 35）已于 2026-09-17 **逐字迁出**至 `.ctx/logs/2026-09-EXECUTION_LOG.md` 的「**附：稳定文档迁出的逐批沿革（2026-09-17 批次 58）**」节。**为什么迁**：本手册是现行判据，批次史与「本注不改上文历史记载」类元注记不属此处。**现在要查**：当前五数看本节上列五行（口径定义同处）；沿革去上述日志附节。
- [ ] 聚合域存储模式（B5 对账 2026-08-24）：actSubRecords/tfSubRecords 服务端以「__root__ 单行」存储（`{id:'__root__', body:<原对象>}`），init() 拉取解包、快照写穿包装，round-trip 对称
- [ ] 实体 id 生成单一源（`core/base/id.js::generateId(prefix, sep)` + `randomHex()`，降级链 `crypto.randomUUID` → `crypto.getRandomValues` → `Math.random` 单一源）：全站实体 id 一律经此生成，禁止 `前缀 + Date.now()`、禁止 `Math.random()` 参与 id；**连字符前缀契约**——`tf-`/`notice-`（及 `cmt-`/`mc-`）必须显式传 `sep='-'`，否则打断 `sourceId.startsWith` 契约
- [ ] 受众写入值与判定同源（`NOTICE_AUDIENCE_SENTINELS`，`core/domain/constants.js`）：发布侧写入的受众标识（sentinel）与消费侧可见性判定**必须取自同一注册表**；**语义维度不止角色**（还可能是发展阶段——`activists`/`candidates`＝入党积极分子/发展对象），勿假设「受众＝角色键」
- [ ] 取数口与可见性门分离：按 id / 主键取数（`getById` 一类）**不得**复用「列表可见性过滤」；可见性判定须有**独立入口**（`canReadNotice`）并在消费点显式调用，否则会出现「详情打不开」与「拆门即泄露」两难
- [ ] 成员档案枚举单一源（`RESIDENCE`，`core/domain/constants.js`，2026-09-14 批次 24 收敛）：在册状态字面量全站**只允许一处定义**，消费点一律 import 该单一源（原 `services/member/roster.js` 与 `services/branch/org-base-data-preview.js` 各持一份同值副本已撤销）；**断言方式**＝结构层 `person-consistency.test.mjs::S4`（唯一性静态扫描）+ 数据层取值契约；**同类**：`DEVELOP_STAGES`、`SEARCH_FILTER_MIN_ROWS`、`NOTICE_AUDIENCE_SENTINELS` 一律同址单一源
- [ ] 版本戳同值（缓存键一致性）：全站 `?v=<release>` 与本次发布版本**处处一致**——`docs/scripts/bump-version.mjs` 收尾自检须报「陈旧戳 0 处残留」；任一 `?v=` 落后即会让浏览器按 URL 分裂出第二个模块实例（注册表/共享状态读空）。**注意**：注释里的版本号是人工注记、不算缓存键（自检与改写同源跳过注释行）；**模板字符串动态 import**（`` import(`…/${stem}-workspace.js?v=…`) ``）也在覆盖范围内
- [ ] 党小组清单单一源（2026-09-14 收敛，批次 29 加固）：全站「组清单」只允许来自党小组实体（活组取 `status === 'active'` 者、按 `seq` 排序，读口 `services/member/party-group.js::groupOptions()`）；禁再出现写死组名数组（原三处：支书台赋权管理的组清单、组长建活动承办组选项、演示用户域）；**且须防两类绕过「字面量扫描」的等价病灶**——① 模块加载期**派生快照**（`const X = [...new Set(PEOPLE.map(p => p.partyGroup))]`：展开 `liveMembers()` 的 Proxy 即把实时视图冻结，与 `const PEOPLE = getMembers()` 同病；实测病灶 `components/governance/person-picker.js`）；② 运行时用**种子枚举代跑**（`org-base-data-preview::PARTY_GROUP_OPTIONS` 只属预览种子期口径，运行时一律 `groupOptions()`；实测病灶 `services/member/branch-roster-import.js` 的导入行净化与按组应到统计、`entries/tabs/visitor/projects-tab.js` 的筛选项）。断言方式＝结构层 `party-group.test.mjs::S4`；「未分组」即 `partyGroup` 为空字符串，禁在各页自造别名判断
- [ ] 账号与成员档案同源（2026-09-14）：账号由学号派生（账号即学号），成员新增/流出与账号建号/停用必须成对发生；禁出现「档案有此人、账号层没有」或反向的孤项
- [ ] 档案「软标记」与撤销同源（2026-09-14 批次 29）：凡以**软标记**表达的状态（`transferOut` 等）都必须有**对称的清除口**，且清除须走**语义端点**——只打标记不清标记，会出现「撤销后账号仍 401 / 读链仍排除该行＝成员实际回不来」（实测病灶：API 形态撤销流出）。**口径**：mock 形态「save 即复活」自动清 `removedIds`，API 形态须 `POST /members/:id/undo-transfer-out`（与打标记端**同角色集** + 同支部 + 幂等 + 不接收字段）；接线选项 `saveMember(record, { restoreFromTransferOut: true })`。断言方式＝`member-persist.test.mjs` api ⑪（含病灶复现）+ `permission-gate.test.mjs` ⑤c + `member-flow.test.mjs` S4
- [ ] 版本戳单一源（2026-09-14 批次 29 常态守卫）：除发版脚本的收尾自检外，**「全站活动版本戳取值集合规模为 1」已升为测试常驻守卫**（`version-stamp.test.mjs::S3`）；发版脚本无参运行须按「读仓库现有戳 → 同日 max 字母 +1」推导，且**只允许前进**（小于现有最大戳即报错退出，防「同日版本号回退」静默通过）
- [ ] 「同一实现体、两个写门」须显式声明（2026-09-14 批次 30）：当同一业务动作因**入口不同而角色门不同**时（如名册新增 `/members` 组织委员专属 vs 成员流动流入 `/members/intake` 组织委员+支书/副支书），须抽同一实现体并分别挂门（`createMemberRow` 挂两次 `requireRole`），**禁用复制粘贴出第二份实现**；且须断言「原门未被放宽」（守卫：`member-flow.test.mjs::S4` 断言 `/members` 仍为 `ORG_COMMISSIONER_ROLES`）
- [ ] 「死代码清理」须先验存量兼容（2026-09-14 批次 29 处置原则）：删任何分支前先查**本地存储持久层能否带出该分支的旧数据**（如 `gsm1921-member-confirmations` 可跨刷新带出旧版 pending）——若该分支是其唯一出口，删除会造成「既处理不掉又持续拦截」的死锁；正确做法＝**真死代码删（无调用方者）、存量兼容留并原地加注**，保留者一处不少

---

# 手动检查清单（浏览器实测）

> 本章收录**电脑自动化检查难以覆盖、需人工浏览器实测**的检查项。按 URL 逐条实测，勾选验证结果。
> 背景：T-235 首页跳转直达（J1/J2/J3/J4）已实施完毕，AI 冒烟验证 4/8 用例 PASS，其余 4 项修复后需人工复核（2026-08-09 搁置浏览器自动化验证，转人工）。

## T-235 首页跳转直达（2026-08-09 追加）

> 检查方式：按角色登录后，直接访问下列带参数 URL，观察是否直达目标 tab + 目标条目高亮 + 高亮约 3 秒后自动褪去。
> 通用预期：① 落在目标 tab（不是默认「待办」）；② URL 参数被消费（地址栏参数消失）；③ 目标条目有蓝色高亮且自动褪去。

| # | 角色 | 访问 URL | 预期行为 | 第2轮冒烟结果 | 第3轮实测（2026-08-24 Playwright） |
|---|------|----------|----------|---------------|---------------|
| 1 | 支书 | `/workspace/secretary.html?activityId=act-15` | 落「活动管理」tab + 月份切到 2026-06 + 详情面板打开 act-15「6月共建」 + 日历条目高亮褪去 | ❌ 修复后待人工复核（原死循环已修） | ✅ PASS（tab/月份/详情/参数消费） |
| 2 | 支书 | `/workspace/secretary.html?taskforceId=tf-001` | 落「知情查看」tab + tf-001 卡片高亮褪去（不得被「待办」内容覆盖）〔2026-09-14 合并为知情查看（活动/专班分段），tab id 仍为 tf-view〕 | ❌ 修复后待人工复核（原懒加载竞态已修） | ✅ PASS（tab/高亮） |
| 3 | 组织委员 | `/workspace/org.html?activityId=act-15` | 落「知情查看」tab（默认「活动」分段）+ 月份切到 2026-06 + 详情面板打开 act-15 + 日历条目高亮褪去〔2026-09-14 原「活动查看」并入知情查看（活动/专班分段），tab id 由 activity-view 改为 tf-view〕 | ❌ 修复后待人工复核（原月份未跟随已修） | ✅ PASS（tab/详情） |
| 4 | 组织委员 | `/workspace/org.html?taskforceId=tf-002` | 落「专班管理」tab + tf-002 卡片高亮 + 详情展开 | ✅ PASS | ✅ PASS（卡片存在+高亮） |
| 5 | 宣传委员 | `/workspace/prop.html?activityId=act-1` | 落「项目看板」tab + act-1 看板卡片高亮褪去 | ✅ PASS | ✅ PASS（卡片高亮） |
| 6 | 纪检委员 | `/workspace/disc.html?taskforceId=tf-001` | 落「知情查看」tab + tf-001 卡片高亮褪去〔2026-09-14 合并为知情查看（活动/专班分段），tab id 仍为 tf-view〕 | ✅ PASS | ✅ PASS（高亮） |
| 7 | 党小组组长 | `/workspace/leader.html?activityId=act-2` | 落「活动管理」tab + act-2 详情展开 + 条目高亮褪去（注：act-1 属 p3 bottom-up，组长不可见属正常权限） | ❌ 修复后待人工复核（原 SignupStore 未导入已修，改用 act-2） | ✅ PASS（条目存在+高亮） |
| 8 | 访客 | `/workspace/visitor.html?activityId=act-1` | 落「活动动态」tab + act-1 条目高亮**自动褪去**（修复"一直亮着"） | ✅ PASS | ✅ PASS（条目存在+高亮+褪去） |

> **2026-08-24 第 3 轮说明（T-280 B1-2/B1-5）**：8 用例 + 附加 4 项全部浏览器实测 PASS（34/34，专项脚本 `server/test/t235-browser-regression.mjs` 已随 2026-08-30 脚本清理归档）。
> 实测中发现并修复 B1-5 缺陷：URL 直达高亮原被 `loadWorkspaceData` 二次 setState 重渲染冲掉（实际可见仅 ~300ms），已按方案 A 修复——
> 各工作台入口导航落点后 3 秒条件抑制当前 tab 重渲染（仅当导航目标已在 DOM 时抑制，目标缺失放行延迟数据补渲染），高亮目标存活至抑制窗口结束，一次性定位改为轮询定位。

### 附加检查项

- [ ] **view=activities 参数**：`/workspace/secretary.html?view=activities` 落「活动管理」tab；`/workspace/org.html?view=activities` 落「知情查看」tab（默认「活动」分段）；其余角色同理
- [ ] **首页日历条目点击**：首页日历中点击任一活动条目 → 跳转工作台并直达该活动（与活动列表卡片行为一致，J3）
- [ ] **首页专班卡片点击**：首页招募区点击专班卡片 → 跳转工作台并直达该专班（J2）
- [ ] **首页活动列表卡片点击**：点击「查看更多」外的活动卡片 → 跳转工作台直达该活动（J1）
- [ ] **高亮褪去一致性**：所有直达场景高亮均为约 3 秒自动褪去，无一例"一直亮着"

## T-280-B1 待办/通知直达跳转（2026-08-24 新增，B1-4）

> 检查方式：登录各角色后进入「待办」tab，点击通知类/审核类待办的行动按钮或聚合卡「处理」按钮，观察是否直达对应处理页/详情页。
> 背景：最小三成本 / 高频零跳转理念落地——待办行动按钮直达处理界面，减少中间跳转（DESIGN_SYSTEM.md 原则10）。
> **2026-08-24 浏览器实测：29/29 全过**——7 条全部代码化断言验证（URL / tab 激活态 / 详情面板 DOM；专项脚本已随 2026-08-30 脚本清理归档）。实测修复 2 缺陷：
> ① leader todo-tab 无 actionKey 级 tabMap → `review-submit` 复盘待办点「去提交」误跳考勤上传，已对齐 disc 的 actionKey 级映射；
> ② 赋权待办聚合对象无 sourceId + 懒加载 tab 渲染异步 → 同步 querySelector 找不到活动条目、直达详情失效，已改为 items[0] 取 sourceId + 以「详情面板打开」为完成条件的轮询点击。

- [x] **通知阅读待办**：点击「去阅读」→ 跳转 `notice.html?id=xxx` 打开对应通知详情（各角色 todo-tab 聚合时取首条 noticeId）——实测：leader 构造 actionable 通知 → 按钮「去阅读」→ URL=notice.html?id=ntc-b1test ✅
- [x] **报名审核待办**（组织/组长）：点击「去审核」→ 跳转 `activity.html?id=xxx` 或 `taskforce.html?id=xxx`（sourceId 以 tf- 前缀判定专班）——实测：支书真实数据 signup-review→taskforce.html?id=tf-005；组织构造活动报名→activity.html?id=act-15 ✅
- [x] **组长赋权待办**：点击「去赋权」→ 切到「活动管理」tab 并直达该活动详情内联编辑（≤2 跳，T-190 兜底）——实测：聚合卡「处理」→ write tab 激活 + act-2 详情面板自动打开 ✅
- [x] **组长考勤上传待办**：点击「去提交」→ 切到「考勤上传」tab——实测：构造 submit 待办 → attendance tab 激活 ✅
- [x] **组长复盘待办**：点击「去提交」→ 切到「复盘提交」tab——实测：构造 review-submit 待办 → review tab 激活（修复①后）✅
- [x] **支书通知发布 tab**：点击通知条目 → 跳转 `notice.html?id=xxx` 直达详情——实测：notification tab 点击行 → notice.html?id=notice-110（id 与行一致）✅
- [x] **聚合卡直达一致性**：聚合卡「处理」按钮与明细待办行动按钮跳转行为一致——实测：同 actionKey 聚合卡「处理」→ 与明细「去赋权」同一处理函数（onActionTodo → _handleTodoAction），行为一致 ✅

## T-280-B5 前后端数据模型对账（2026-08-24 新增，B5-2）

> 检查方式：对照 `server/db.js` / `server/routes/resources.js` / `server/seed.js` 与前端 `data-adapter.js` / `mock-adapter.js` 的持久化域，逐表核对映射与写穿边界。
> 背景：T-280 B5 前后端对账——server 表 / 资源名 / 快照 payload 三者口径已于 2026-09-15 收敛（见 §跨类别同源校验「前端持久化域 ↔ server 表对账」：`db.js` 35 表（2026-09-17 起，含匿名核查留痕表 `issue_reveals`）/ 资源名 30 / 快照 25 / 持久化域 34 / `mockDB` 35）；snapshot 全量写穿与 per-item CRUD 两条写路径边界清晰。
> **2026-08-24 实测：6/6 全过**——API 级代码断言（无浏览器依赖；专项脚本已随 2026-08-30 脚本清理归档）。实测说明：V2/V3 因 server seed 仅在空库执行（db 持久化），archiveRecords 等「初始有种子」与 attendances 等「初始为空」改代码级断言（读 seed.js/mock/seed.js 源码印证）；V4 验证 login 路由在 `/api/v1/auth/login`。

- [x] **表↔域映射**：资源名 list 全部返回 200+数组（`resources.js` RESOURCE_TABLES **当前 30 名**全通；本条为 2026-08-24 当时的 **26 名**实测记录，口径详见 §跨类别同源校验）✅
- [x] **seed 复用**：运行时 users 50/taskforces 8/activities 29+ 基线 + 代码级确认 `data/mock/seed.js` SEED_ARCHIVE_RECORDS/SEED_SIGNUPS 常量与 `server/seed.js` 的 archive_records/signups 注入 ✅
- [x] **空表回退**：**2026-08-24 当时**代码级确认 `server/seed.js` 仅 seed 8 集合、**不覆盖 attendances/inspections/todos**（前端 init 空表回退本地种子的必要性印证；运行时回退行为由 b3-1/e2e-login 浏览器验证）✅ —— **2026-09-26 批次 205 改准**：`server/seed.js` 现 `replaceCollection` **30 个集合**，**已覆盖** `attendances`（152 条，同源 `data/mock/attendance.js::ATTENDANCE_RECORDS`）/ `inspections`（42 条）/ `todos`（2 条，同源 `docs/src/services/governance/todo.js::SEED_TODOS`），系批次 189（补 15 表）→ 192/195（考勤 / 考察 / 复盘 / 思想汇报）→ 198（todos）逐步补种；⇒ API 形态首启这些表**不再恒空**、`init()` 的空表回退分支**不再被走到**（守见 `mock-api-parity.test.mjs::P1`）
- [x] **branchDocs 写权限**：未登录 POST→401；非支委（leader p1）POST→403；支委（secretary p13）POST→201 + 删除 204（COMMISSIONER_WRITE 强制支委身份）✅
- [x] **聚合域 round-trip**：快照写穿 `[{id:'__root__', body}]` → 读回 `__root__` 单行 + body 深比较一致 → 清理写回空 ✅
- [x] **auth 测试**：`server/test` 全量测试通过（2026-08-24：21/21，含 b3-1 回写 5 项等；历史票证专项脚本已随 2026-08-30 清理归档），含 e2e-login 回归

## T223 活动排序统一（2026-08-09 追加）

> 背景：曾发现党小组组长「活动写入」的已有关联活动按时间正序排列（旧在前），违反 T223「未完成在前、已完成在后，组内按 date 降序（新者在前）」统一基准。已修复 `_renderWriteContent` + 宣传委员「关联活动」下拉。
> 2026-08-09 彻查补充（指令"必须彻查"）：全仓 53 处排序点逐一排查，新增修复 4 处——组长考勤上传「选择活动」下拉、组长考察上传「选择具体来源」下拉、组长复盘分桶列表、专班查看组件桶内排序，全部按 T223 基准落地。
> 通用预期：所有活动/专班列表均为「未完成在前、已完成在后，组内新者在前」；活动按 date 降序、专班按 createdAt 降序。

- [ ] **党小组组长「活动写入」已有关联活动**：未完成（草稿/已发布/进行中）在前、已完成（已执行/已取消）在后，组内按 date 降序（新者在前）
- [ ] **党小组组长「考勤上传」选择活动下拉**：选项按 date 降序（新者在前）（ws-leader-entry L994-999，2026-08-09 修复）
- [ ] **党小组组长「考察上传」选择具体来源下拉**：活动选项按 date 降序（ws-leader-entry L1238-1242，2026-08-09 修复）
- [ ] **党小组组长「复盘提交」待复盘/已复盘分桶**：桶内按 date 降序（ws-leader-entry L1459-1465，2026-08-09 修复）
- [ ] **知情查看组件（支书/组长「知情查看」的「专班」分段）**：各状态桶内按 createdAt 降序（taskforce-view.js，2026-08-09 修复；2026-09-14 原「专班查看」合并为知情查看（活动/专班分段）)
- [ ] **宣传委员「上传宣传材料」关联活动下拉**：选项按 date 降序（新者在前）
- [ ] **首页活动列表/日历**：未完成在前、已完成在后，组内 date 降序（main-entry L293-298 / calendar.js L352）
- [ ] **访客「活动动态」**：date 降序且仅显示未取消未归档（ws-visitor-entry L324）
- [ ] **各角色项目/专班看板**：宣传/组织委员看板桶内新者在前（ws-prop L369-383 / ws-org L92-93）
- [ ] **支书「专班总览」**：专班按 createdAt 降序（新者在前）

## 编辑完整性校验（T-283 新增，2026-08-27）

> 背景：T-283 功能开发中多次出现「多轮 Edit 导致误删/重复」系统性损坏——重复声明（SyntaxError）、函数/绑定被误删（ReferenceError 或点击静默失效）、声明误删。支书指令：此类共性问题须成为 checklist 重要部分并全局检查。机制与判例详见 [FILE_OPERATION_RULES.md §14.1（同区域连续编辑覆盖）](FILE_OPERATION_RULES.md)。

- [ ] **GetDiagnostics 全仓零错误**（每次多文件修改后的最低检查：语法错误/未定义引用/重复声明）
- [ ] **模块加载完整性审计**：`node --test server/test/module-load.test.mjs`（浏览器 import 全部 docs/src 模块全量通过——模块数随演进变化，不在本文维护具体数值；已入 npm test 回归）
- [ ] **新增功能浏览器回归**：功能路径实测（如三会一课议程：创建写入→详情显示→行内编辑→保存→持久化，server/test/agenda-flow.test.mjs A1-A3）
- [ ] **点击成本回归**：进入工作台→可执行事项 ≤2 跳；高频操作点击次数达标（server/test/click-cost.test.mjs C1-C3）
- [ ] **数据完整性回归**：Mock 数据引用/字段/id/类型 + 生命周期一致性（server/test/mock-integrity.test.mjs M1-M2）
- [ ] **删除性 Edit 复核**：删除代码块后 Read 复核邻近区域，确认无连带误删

## 链接完整性校验（T-284 新增，2026-08-27）

> 支书指令「所有链接的审查，每一个都要查」。四层法：静态存在与跳转合理相区分。全量审计脚本 `server/test/link-integrity.test.mjs`（L1-L5，已入 npm test 回归）。

- [ ] **L1 静态链接**：全部 HTML href/src 目标文件存在 + `#锚点` 有效（含 `<base href>` 解析与 `?v=` 剥离）
- [ ] **L2 JS 导航**：`location.href`/`replace`/`assign` 目标存在（模板插值动态跳转抽取 `.html` 字面量片段校验）
- [ ] **L3 HTTP 层**：自包含 server 下每个链接 200 + 工作台门控可达
- [ ] **L4 登录态逻辑**：首页链接登录态感知——已登录直达角色工作台 / 未登录直达 login.html（不出现「公开页→工作台→门控踢→login」绕路）；登录页须有「返回主页」闭环
- [ ] **版本戳同步**：测试内嵌 import 的 `?v=` 戳（evaluate 字符串内）bump 脚本不覆盖，bump 后须 grep 检查 `server/test` 残留旧戳




