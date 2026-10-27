# Tasks

- [x] Task 0: 旧账对账（先做，防止重审产生两套编号）
  - [x] SubTask 0.1 建一张对账表：Round 2 的 36 条 ＋ R5-B/C 的 45 条 ＋ R6 的 21 条 P3 ＋ R7 的 23 条 P3 ＋ `B-500-1/2/5/6/7`、`B-502-3/4/6`
  - [x] SubTask 0.2 每条给「当前 HEAD 是否仍存在（`文件:行号`）/ 已裁或待裁 / 归第八或第九轮」；已消解项写证据，不再重开
  - [x] SubTask 0.3 把 `CLAUDE.md B-502-1` 的三成本措辞改准为「信息 / 操作 / 适应学习」，维护成本指向 `ENGINEERING_ASSESSMENT §2.4`

- [x] Task 1: 第八轮真机三段实测（只测 2 个高频任务，不做 62 tab 全量）
  - [x] SubTask 1.1 支书建一场活动：复用 `click-cost::C1`，记录点击/跳转/是否需读说明/是否 403/落库与回看
  - [x] SubTask 1.2 纪检确认一条考勤：从待办进入 → 定位目标行 → 确认 → 回看；记录是否需二次定位、是否带 id
  - [x] SubTask 1.3 产出 `R8-*` 读数表（含「与 Round 2 静态结论的差异」），落 `.ctx/logs/2026-10-AUDIT_R8_THREE_COSTS.md`

- [x] Task 2: 第八轮 P1 修复（7 条，均不改 schema）
  - [x] SubTask 2.1 材料页一名到底：统一可见名为「材料与归档」，清 `材料闭环` 可见文案与 `写纪要` 名实不符
  - [x] SubTask 2.2 纪检待办带 `focusActivityId/recordId` 直达并高亮；未命中才 toast
  - [x] SubTask 2.3 材料页第②步并入①行内（或补真实控件），步骤条与控件一致
  - [x] SubTask 2.4 `function-catalog` 两条导航路径改准 ＋ `catalog-sync` 增断言（usage 页签名 ∈ 角色 capability label 集）
  - [x] SubTask 2.5 页签计数单一源：`page-sweep` 只留当前基线并由注册表现算；README 计数纳入对账，沿革移日志
  - [x] SubTask 2.6 建活动命名统一「写入活动」；`openActivityWriteEntry` 找不到顶栏按钮时直接打开表单；只读下钻不渲染该按钮
  - [x] SubTask 2.7 活动详情标题下加「下一步」动作行（按角色 1 主 2 次），材料入口并入

- [x] Task 3: 第九轮 9A 诊断（只读产出，不改 schema）
  - [x] SubTask 3.1 产出权威源 / 派生口径矩阵：每个业务事实一行（权威表字段 / 写口 / 读口 / 派生或存储 / 跨支部归属 / 权限门 / 现有守卫）
  - [x] SubTask 3.2 产出 schema 方案（不实施）：Todo `branchId` v11、列表分页与真实列索引、JSON 宽表拆分触发条件；写明与 P13 / `B-500-4` / 多支部形态裁定的依赖
  - [x] SubTask 3.3 落 `.ctx/logs/2026-10-AUDIT_R9_DATA_STRUCTURE.md`；含跨层抽查矩阵与「同一事实多处写/读」清单

- [x] Task 4: 9A 数据 P1 修复（4 条，均不改 schema）
  - [x] SubTask 4.1 种子修复语义：`assignments / agenda / isBrand / brandName / members` 移出 seedOwned（`agenda` 拆基底与运行时结果）；补「repair 前后运行时字段不变」测试
  - [x] SubTask 4.2 专班报名审核与代录贡献改走工作组主源（`workgroups.members` / `workgroups.outputs`）；旧镜像只读；服务端加成员不清空历史 contributions
  - [x] SubTask 4.3 活动 ↔ 工作组同步函数：创建 / 编辑 / 归档 / 删除四处同事务同步 `name/status/organizingScope/hostGroupId/recruitmentScope/coordinator`；归档工作组必须 `archived`
  - [x] SubTask 4.4 `workgroup_tasks/outputs` 首屏装载（init 批量或首页按可见组批量）；未装载显示「加载中」而不是 0

- [x] Task 5: 9B 功能 P1（5 条）
  - [x] SubTask 5.1 通知发布判返回值：失败不提示成功，原位 `role="alert"` ＋ 重试
  - [x] SubTask 5.2 上报党委：提交中禁用、`try/catch`、失败保留表单并给可恢复提示
  - [x] SubTask 5.3 可点容器键盘可达：能改 `<a>` 的改 `<a>`；容器补 `role="button" tabindex="0"` ＋ Enter/Space（复用 `list-row.js` 写法）
  - [x] SubTask 5.4 壳层刷新失败复用 `tab-bar` 错误卡，不再只 `console.error`
  - [x] SubTask 5.5 材料 / 个人档案 / 设置首屏加载态：`aria-busy` ＋ 最小骨架

- [x] Task 6: 9B 视觉与可访问 P2（选做 8 条）
  - [x] SubTask 6.1 标题层级：党委页内 H1→H2；设置卡头 H2→H3
  - [x] SubTask 6.2 删卡片 `hover:shadow-*` / `hover:-translate-y-*`
  - [x] SubTask 6.3 删除动作改 `.btn-danger`，编辑改 `.btn-outline`
  - [x] SubTask 6.4 独立页返回按钮改 `.btn-outline` 或 `<a>`
  - [x] SubTask 6.5 `transition-all` 收敛为颜色/透明度/位移（全仓 25 处，分屏改）
  - [x] SubTask 6.6 帮助注释迁移 `.help-note` / `.help-note__link`（本轮迁移其余屏；`party-committee-meeting-entry.js` 剩 9 处登记 `B-503-6`）
  - [x] SubTask 6.7 登录错误 `role="alert"` ＋ `aria-invalid` ＋ 聚焦首错
  - [x] SubTask 6.8 名册新增字段级错误（`aria-invalid` ＋ 聚焦首错），不用全局 toast 代替

- [x] Task 7: 台账、验证与交付
  - [x] SubTask 7.1 文档：`CLAUDE.md` 乙部登记本轮与待裁项；`DATA_MODEL` 只改本轮修到的实体；`README*` 计数/路径改准；执行日志批次 503（Why/What/Verification/Boundaries/sample-diff）
  - [x] SubTask 7.2 待裁定项单列：登录页渐变 vs §5.3、首页 hero 党徽 vs §4.25、同名页签范围后缀、支书台「反馈与回复」改名
  - [x] SubTask 7.3 守卫：新增「写口失败不得提示成功」「可点非原生控件必须键盘可达」「卡片不得 hover 阴影/上浮」至少各 1 条；登记 `test-tier-registry`（预算只降不升）
  - [x] SubTask 7.4 验证：定向测试 → `npm run test:daily` → `SWEEP_SHARD=all`（带 `DISABLE_PASSWORD_CHECK=1` / `DEMO_READONLY=0`）→ 六项文档守卫
  - [x] SubTask 7.5 版本戳 bump ＋ `version-stamp`；中文提交（不 push），体例：批次 503 ＋ Why / What / Verification / Boundaries

# Task Dependencies

- Task 0 必须先做（对账决定 1/2/5/6 的实际条目）
- Task 1 依赖 Task 0 的旧项清单（实测对象取「仍存在」的 P1）
- Task 2 依赖 Task 1 的读数（以真机证据决定保留/合并/改法）
- Task 3 可与 Task 1/2 并行（只读诊断），但 Task 4 依赖 Task 3 的矩阵结论
- Task 5 与 Task 4 可并行（不同文件面）；Task 6 在 Task 5 后（避免同一组件两次改）
- Task 7 最后
