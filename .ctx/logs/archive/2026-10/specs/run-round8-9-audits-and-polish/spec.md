# 第八轮最小三成本 ＋ 第九轮功能与美观 / 全栈数据结构 Spec

## Why

支书要求在两轮「审查 → 修复」之后再走至少 3–4 轮，本轮同时启动第八轮（最小三成本）与第九轮（功能与美观＋全栈数据结构）。四路只读审查已跑完：

- 最小三成本：P1 7 / P2 10 / P3 按 8 屏；最贵的是「同一落点多个名字、待办跳到台却不到条、步骤条指向零控件、同一事实多处计数」。
- 功能与美观：P1 5 / P2 12 / P3 按 14 屏；新发现「通知发布假成功、上报无失败态、可点 div 键盘不可达、首屏无加载态」。
- 全栈数据结构：P1 5 / P2 12 / P3 6 主题；最危险的是「种子修复会把运行时治理结果回滚」与「专班成员/贡献只写兼容镜像」。
- 反方质询：两轮最容易重犯「报告即闭环」（L4），且「一个权威处理位」若执行成「删掉其他入口」会撞 `D-825` 与代录/兜底制度。

支书已圈定四个口径：① 三成本用**信息 / 操作 / 适应学习**；② 第八轮**续审＋对账** Round 2；③ 第九轮**先诊断后实施**；④ 数据结构**只诊断＋出方案**（不改 schema）。

## What Changes

### A. 第八轮：最小三成本（续审＋对账 → 实测 → 修 P1）

- **旧账对账**：Round 2 的 36 条、R5-B/C 与 R6/R7 的 P3 中与本轮同面的条目，逐条回读当前 HEAD，标「已消解（附证据）/ 仍存在 / 已裁不做」，编号沿用旧号，新现象另立 `R8-*`。
- **真机三段实测**（补 Round 2「未实测」的硬伤）：至少 2 个跨角色任务，记录「找入口（点击/跳转）→ 理解权限（是否需读说明/是否 403）→ 完成操作（落库且可回看）」：① 支书建一场活动（复用 `click-cost::C1`）；② 纪检确认一条考勤（当前零覆盖）。
- **修 P1 七条**：材料页一名到底、纪检待办带 id 直达、材料页步骤条与控件一致、功能目录路径改准＋守卫、页签计数单一源、建活动命名与只读态、活动详情「下一步」动作行。
- **判据修正**：`CLAUDE.md B-502-1` 的「学习/使用/维护」改准为权威源的「信息/操作/适应学习」，维护成本归 `ENGINEERING_ASSESSMENT §2.4`，不混入用户成本。

### B. 第九轮 9A：全栈数据结构（只诊断＋出方案，不改 schema）

- 产出**权威源 / 派生口径矩阵**：每个业务事实一行（权威表与字段、写口、读口、派生还是存储、跨支部归属、权限门、现有守卫）。
- 产出 **schema 方案**（只出方案、不实施）：Todo `branchId`（v11）、列表分页与真实列索引、JSON 宽表拆分的触发条件；与 P13 / `B-500-4` / 多支部形态裁定同批再议。
- **修 4 条不改 schema 的 P1**：① 种子修复把 `assignments/agenda/isBrand/brandName/members` 移出 seedOwned（禁止回滚治理结果）；② 专班报名/贡献改走工作组主源；③ 活动 ↔ 工作组创建/编辑/归档同事务同步；④ `workgroup_tasks/outputs` 首屏装载，未装载不显示 0。
- **文档对齐**：只改本轮修到的实体字段；`DATA_MODEL` 全量契约缺口（10+ 实体）登记下一轮，不在本批硬塞。

### C. 第九轮 9B：功能与美观（先修「假成功/不可达/无失败态」，再收视觉语法）

- **功能 P1**：通知发布判返回值、上报党委失败态与提交中禁用、可点容器键盘可达、壳层刷新失败复用错误卡、独立业务页首屏加载态（`aria-busy`）。
- **视觉/可访问 P2（选做 8 条）**：标题层级（党委 H1→H2、设置卡头 H2→H3）、删卡片 hover 阴影/上浮、删除动作改 `.btn-danger`、返回按钮可见、`transition-all` 收敛为颜色/透明度、帮助注释统一 `.help-note`、登录错误 `role=alert`＋`aria-invalid`、名册字段级错误。
- **先定交互语法再铺开**：只动 2–3 个共享载体（页签切换过渡、结果就地反馈、列表↔详情层级），不 62 tab 全站加动效；动效 token 单一源 ＋ 至少 1 条守卫。
- **待裁定不代裁**：登录页品牌渐变与 §5.3、首页 hero 党徽与 §4.25、同名页签是否加范围后缀、支书台「反馈与回复」改名。

### D. 不做（本轮明确排除）

- 不删任何「代录 / 兜底 / 监督 / 审批留痕」入口（`D-825`、`REVIEW_QUEUE` B 判据优先于「一个权威处理位」）。
- 不改 schema、不加索引、不拆宽表（只出方案）。
- 不重做 62 tab 视觉，不做全站动效换皮。
- 不重审 R6/R7 已消解项；P3 不照单执行，先重钉行号再并入实施批。

## Impact

- Affected specs：`audit-round2-minimum-three-costs`（本轮续审）、`round5-dirty-audit-and-truth-baseline`、`plan-four-round-audit-program`（第九轮拆为 9A/9B）、`run-round6-7-audits-and-cross-group-hosting`（R6/R7 报告作为输入）。
- Affected code：`docs/src/entries/**`、`docs/src/components/**`、`docs/src/services/member/**`、`docs/src/services/activity/**`、`docs/src/data/{seed-manifest,seed-drift,mock-adapter,data-adapter}.js`、`server/{db,seed-repair}.js`、`server/routes/resources/**`、相关测试与守卫。
- Affected docs：`CLAUDE.md` 乙部（口径改准＋本轮登记）、`DATA_MODEL.md`（仅本轮修到的实体）、`README.md` / `README-server.md`（计数与路径）、`.ctx/**` 台账。

## ADDED Requirements

### Requirement: 三成本口径唯一

第八轮 SHALL 使用「信息成本 / 操作成本 / 适应学习成本」，并以「找入口 → 理解权限 → 完成操作」三段取证。

#### Scenario: 口径对账
- **WHEN** 报告引用「维护成本」
- **THEN** 标为工程维度并指向 `ENGINEERING_ASSESSMENT §2.4`，不计入用户三成本

### Requirement: 旧账先对账再续审

#### Scenario: 每条旧项三态
- **WHEN** 开始第八轮
- **THEN** Round 2 的 36 条逐条标「已消解（附 `文件:行号`）/ 仍存在 / 已裁不做」；已消解项不得重新当新问题

#### Scenario: 编号可追溯
- **WHEN** 发现新问题
- **THEN** 用 `R8-*` 新号，并在报告中写「与旧号的关系」

### Requirement: 真实任务三段实测

#### Scenario: 支书建活动
- **WHEN** 记录实测
- **THEN** 给出点击数/跳转数/是否需读说明/是否 403/落库与回看结果

#### Scenario: 纪检确认考勤
- **WHEN** 记录实测
- **THEN** 同上；并记录「从待办进入是否需要二次定位目标行」

### Requirement: 一个权威处理位 ≠ 删入口

#### Scenario: 拟合并/删除入口
- **WHEN** 判定某入口为重复
- **THEN** 必须先证明它不属于「代录 / 兜底 / 监督 / 审批留痕 / 知情查看」五类正当处理位，否则不得删

### Requirement: 权威源 / 派生口径矩阵

#### Scenario: 每个业务事实一行
- **WHEN** 产出数据轮诊断
- **THEN** 每行给：权威表与字段、写口（函数/路由）、读口、派生还是存储、跨支部归属、权限门、现有守卫

#### Scenario: schema 只出方案
- **WHEN** 发现需要 v11 / 索引 / 拆表
- **THEN** 只写方案与触发条件，不实施；与 P13 / `B-500-4` 同批再议

### Requirement: 种子修复不得回滚运行时治理结果

#### Scenario: 升级首启
- **WHEN** `seed_meta` 触发 seed repair
- **THEN** `assignments / agenda / isBrand / brandName / members` 等业务动作写入的字段不发生回滚；测试断言 repair 前后逐字节不变

### Requirement: 镜像与主源同笔

#### Scenario: 专班报名审核通过
- **WHEN** 成员加入专班
- **THEN** 同时写 `workgroup_members`（主源）与兼容镜像；成员数、考察父键、权限判断均按主源

#### Scenario: 活动归档
- **WHEN** 活动被归档
- **THEN** 对应工作组同事务置 `archived`；历史只读，成员/任务/产出写口拒绝

### Requirement: 失败必须可见、加载必须可感知

#### Scenario: 写口返回空/抛错
- **WHEN** 通知发布或上报党委失败
- **THEN** 不出现成功提示；原位给 `role="alert"` 与重试；提交中禁用防重复

#### Scenario: 首屏数据未到
- **WHEN** 材料 / 个人档案 / 设置页初始化
- **THEN** 容器 `aria-busy="true"` ＋ 最小骨架；完成后切换为 false

## MODIFIED Requirements

### Requirement: 卡片与动效语法

卡片不得用 `hover:shadow-*` / `hover:-translate-y-*` 伪装可点；`transition-all` 收敛为颜色/透明度/位移；动效 token 单一源，遵循 `prefers-reduced-motion`。

### Requirement: 标题与帮助注释

全站 H1 唯一；首页不再出现与顶栏同名的组织名 H2；设置卡头用 H3。帮助注释只用 `.help-note` / `.help-note__link`，不得手写第二种链接风格。

### Requirement: 页签与计数单一源

页签总数由注册表现算；`README.md` / `README-server.md` / `page-sweep` 不再各写一份；沿革移 `.ctx` 日志。

## REMOVED Requirements

无（本轮不删任何制度入口；待裁定项保留原状）。
