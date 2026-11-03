// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test-tier-registry.mjs — 测试分层**单一源**（B-499-5 · Task 9，2026-10-21）
//
//  三层口径（互不重叠、并集 = 磁盘全部 `server/test/*.test.{js,mjs}`）：
//    · daily     —— 每次改完必跑（墙钟目标 ≈4 分钟）。权限、数据真值、迁移、写链、
//                   构建完整性、本批改动面、防假绿守卫，全部纯 node（不 import playwright）。
//    · precommit —— 提交前 / 发布前全量。真机浏览器 e2e、page-sweep、form-loop-sweep 等重活。
//    · weekly    —— 更慢的视觉 / 审计普查；precommit 与 full 仍覆盖（不因分层丢判据）。
//
//  约束（由 `test-tier-guard.test.mjs` 机械核对）：
//    ① 磁盘测试文件 ↔ 三层并集**双向相等**；三层互不重叠；
//    ② 不 import playwright 的纯 node 守卫**必须全部在 daily**（`doc-consistency::S16`）；
//    ③ daily 不含 page-sweep / form-loop-sweep / 任何 `*-e2e`；
//    ④ daily 文件数与静态 `test(` 调用点数不得高于下方预算常量（新增测试须显式改预算）。
//
//  本文件只做数据 + 纯函数：不改判据、不删测试。移层条目在 `reason` 里写明覆盖来源。
// ════════════════════════════════════════════════════════════════

/** 层级名（顺序即执行频次：daily → precommit → weekly） */
export const TIERS = ['daily', 'precommit', 'weekly'];

/** fixture 数据面四类（2026-10-26 Task 6）：
 *  · memory        —— `:memory:` 库 / 纯函数 / 临时 mkdtemp 后即删；
 *  · tmp           —— 临时库或临时目录（`mkdtemp` / `:memory:` + `listen(0)`），测试后不留运行库；
 *  · external-read —— 连外部 `:3000` 服务**只读**审计（依赖已起服务；不起则红属环境类）；
 *  · external-write—— 连外部 `:3000` **写入**（必须 `DB_PATH != server/data.db` 或有 `finally` 清理证据）。
 */
export const FIXTURE_CLASSES = ['memory', 'tmp', 'external-read', 'external-write'];

/** 按层的缺省 fixtureClass（显式字段优先；见 `fixtureClassOf`） */
export const DEFAULT_FIXTURE_CLASS = { daily: 'memory', precommit: 'tmp', weekly: 'tmp' };

/** 查某测试文件的 fixtureClass；未登记返回 undefined。显式 `fixtureClass` → 层缺省。 */
export const fixtureClassOf = (file) => {
  const entry = TEST_TIERS.find((e) => e.file === file);
  if (!entry) return undefined;
  return entry.fixtureClass || DEFAULT_FIXTURE_CLASS[entry.tier];
};

/** 四类各自的文件清单（守卫与报告共用） */
export const filesByFixtureClass = (fixtureClass) => TEST_TIERS
  .filter((e) => fixtureClassOf(e.file) === fixtureClass)
  .map((e) => e.file);

/** daily 文件数预算（含本守卫自身；新增 daily 测试须同批上调并写明理由）
 *  2026-10-21 R5 P1：新增 page-title-guard / ui-contrast-guard，并补登记既有
 *  ui-custom-select / ui-focus-ring（纯 node 守卫）⇒ 209 → 213。
 *  2026-10-22 第七轮 P2：新增 branch-id-literal-guard（缺省支部字面量守卫，纯 node）⇒ 213 → 214。
 *  2026-10-22 第七轮 R7-01：新增 account-rename（人员主键改名受控端点，纯 node）⇒ 214 → 215。
 *  2026-10-22 第九轮 Task 4：新增 activity-workgroup-sync / taskforce-workgroup-source（纯 node）⇒ 215 → 217。
 *  2026-10-22 第九轮 Task 6：新增 ui-motion-guard（卡片悬停 / transition-all 棘轮，纯 node）⇒ 217 → 218。
 *  2026-10-23 R11 Task 12.1：补登 feedback-integrity / modal-contract / schema-split-gate
 *    （此前只落盘未登记）＋ 新增 ui-control-system-guard（均纯 node）⇒ 220 → 224。
 *  2026-10-23 批次 505（spec redesign-theme-palette-and-density Task 9）：新增
 *    theme-palette-guard / density-spacing-guard / hover-state-guard（均纯 node）⇒ 224 → 227。
 *  2026-10-23 批次 507（spec unify-link-and-press-states）：新增 link-color-guard（纯 node）⇒ 227 → 228。
 *  2026-10-24 批次 508：新增 activity-tone-guard / field-shell-guard / motion-guard /
 *    archive-deeplink-guard（均纯 node）⇒ 228 → 232。
 *  2026-10-24 批次 509：frontmatter-freshness / timestamps-note-guard / doc-line-ref / gold-accent-guard /
 *    button-system-guard 五件合并为 docs-governance-guard / theme-palette-guard / ui-control-system-guard
 *    （3+2+2 → 1+1+1）⇒ 232 − 5 ＋ 1 = 228。
 *  2026-10-25 spec restore-visual-hierarchy-and-runtime · Task 1：新增 runtime-tab-lifecycle-guard（纯 node）⇒ 228 → 229。
 *  2026-10-26 同 spec · Task 6（详情路由 direct/locate）：新增 object-route-guard（纯 node）⇒ 229 → 230。
 *  2026-10-26 Task 6（测试残留隔离）：新增 test-isolation-guard（纯 node）⇒ 230 → 231。
 *  2026-10-26 同 spec · Task 4（schema v12 与种子契约）：新增 seed-contract-guard（纯 node，10 条）⇒ 231 → 232。
 *  2026-10-26 同 spec · Task 5（四个月演示窗口）：新增 demo-window-guard（纯 node，5 条）⇒ 232 → 233。
 *  2026-10-26 同 spec · Task 3（写成功可证）：新增 write-truth-guard（纯 node，9 条）⇒ 233 → 234。
 *  2026-10-27 spec refine-ui-three-lenses · Task 12.4：新增 no-about-route-guard（纯 node，5 条）⇒ 234 → 235。
 *  2026-10-27 同 spec · Task 9：新增 no-underline-guard（纯 node，4 条）⇒ 235 → 236。
 *  2026-10-27 同 spec · Task 10：新增 loading-experience-guard（纯 node，6 条）⇒ 236 → 237。
 *  2026-10-29 About 冻结件：新增 about-freeze-guard（纯 node，5 条：5 处内容基线 ＋ 反例）⇒ 226 → 227。
 *  2026-10-29 ESM 解析门禁：新增 esm-parse-guard（纯 node，2 条：全量真 ESM 解析 + 函数体 import 反例）
 *    ——浏览器按 ESM 解析，`node --check`（CommonJS）放过的函数体内 import 会整模块语法失败 ⇒ 227 → 228。
 *  2026-10-29 P3/P4：新增 lf-bar-structure-guard / container-width-guard（均纯 node）⇒ 228 → 230。
 *  2026-10-31 P0/P13–P15：新增 nested-interaction-guard / card-summary-hero-guard（均纯 node）⇒ 231 → 233。
 *  2026-11-03 任务 4（写入口权限矩阵缺口 + 会话 TTL）：新增 write-policy-matrix（4）/ write-policy-gaps（4）/
 *    session-ttl（2）三件，纯 node + `:memory:` ⇒ 文件预算 236 → 239，断言预算 1744 → 1754。
 *  2026-11-03 任务 7（安全红队）：新增 security-redteam（5，纯 node + `:memory:`）⇒ 文件预算 239 → 240。 */
export const DAILY_FILE_BUDGET = 240;

/** daily 静态 `test(` / `it(` 调用点预算（含子测试；新增断言须同批上调并写明理由）
 *  2026-10-21 R5 P1：页题守卫 4 条 + 对比度守卫 5 条 + 补登记的既有两条守卫 ⇒ 1351 → 1377。
 *  2026-10-21 批次 500 收尾：`todo-role-write-gate` 补 S5–S10（派生待办：支委代办 / 来源可证 / 伪造来源拒 / 无 actionKey 拒 / 推进仍归本人 / 无主 visitor 拒）⇒ 1377 → 1383。
 *  2026-10-22 第七轮 P2：`branch-id-literal-guard` 2 条 + 副组长同权用例 2 条 ⇒ 1383 → 1387。
 *  2026-10-22 第七轮 R7-33：`policy-config` 补考勤/复盘超期现算 2 条纯函数用例 ⇒ 1387 → 1389。
 *  2026-10-22 第七轮 R7-01：`account-rename` 4 条（成功 / 409 / 403 / p* 400）⇒ 1389 → 1393。
 *  2026-10-22 第九轮 Task 4：新增 activity-workgroup-sync（4）/ taskforce-workgroup-source（2），
 *    seed-drift +1、workgroup-api +1、mock-api-parity +1、home-workgroup-progress +1 ⇒ 1393 → 1403。
 *  2026-10-22 第九轮 Task 5：`frontend-foundations-guard` 新增 F8（可点容器键盘可达）1 条 ⇒ 1403 → 1404。
 *  2026-10-22 第八轮 Task 2.8：`r3-data-permission-regression` 新增「纪检确认考勤」1 条 ⇒ 1404 → 1405。
 *  2026-10-22 第九轮 Task 6：新增 ui-motion-guard（M1 悬停 / M2 transition-all / M3 非空转）3 条 ⇒ 1405 → 1408。
 *  2026-10-22 第九轮 Task 7.3：`frontend-foundations-guard` 新增 F9（写口失败不得提示成功）1 条 ⇒ 1408 → 1409。
 *  2026-10-23 批次 504（schema v11）：新增 todo-branch-attribution（6）/ schema-split-shadow（3）⇒ 1409 → 1418。
 *  2026-10-23 R11 Task 12.1：补登 feedback-integrity（12）/ modal-contract（5）/ schema-split-gate（4）
 *    ＋ 新增 ui-control-system-guard（7）⇒ 1418 → 1446。
 *  2026-10-23 批次 505（Task 9）：新增 theme-palette-guard（5）/ density-spacing-guard（7）/
 *    hover-state-guard（5）⇒ 按实况 1464（上批声明 1446 与实际差 1，本批一并校准）。
 *  2026-10-23 批次 507：新增 link-color-guard（5）＋ hover-state-guard 增补按压 H6/H7（2）⇒ 1464 → 1471。
 *  2026-10-24 批次 508：新增 activity-tone-guard（4）/ field-shell-guard（6）/ motion-guard（6）/
 *    archive-deeplink-guard（5）＋ theme-palette-guard 增补 strongHover T6/T7（2）⇒ 1471 → 1494。
 *  2026-10-24 批次 509：删 5 件（doc-line-ref 6 / frontmatter-freshness 3 / timestamps-note-guard 4 /
 *    gold-accent-guard 5 / button-system-guard 7 ＝ 25）＋ docs-governance-guard 18（F1–F3 3 ＋ N1–N7 4
 *    ＋ R1–R6 6 ＋ G4–G8 5）⇒ 净 −7。按守卫实算 **1499**（上批预算 1494 与实况差 12，本批一并按实况校准）。
 *  2026-10-24 spec rebuild-notification-and-data-truth · Task 5：workbench-audit-coverage 增补 1 条
 *    「各台 tf-view 均含工作组段 / 工作组件只读 / 深链被消费」守卫（原 1499 + 1）⇒ 1499 → 1500。
 *  2026-10-25 同 spec · Task 3：notice-audience 增补 N13–N16（逐人归档 / countUnread 同源 /
 *    筛选语义 / 私信线程，4 条）＋ notice-message 增补 N5（kindOf / isArchivedFor，1 条）⇒ 1500 → 1505。
 *  2026-10-25 同 spec · Task 6.1（批次 510 · SD-34）：state-enum-guard 增补 G7–G9（页签状态单一源 /
 *    派生器导出与五态 / 消息种类单一源，3 条）＋ docs-governance-guard 增补 G9–G10（一 tab 一 H2 /
 *    卡头单一源，2 条）＋ mock-api-parity-structure 增补 S3（mock 不得含派生字段，1 条）⇒ 1505 → 1511。
 *  2026-10-25 同 spec · Task 3（组件契约）：ui-control-system-guard 增补 T3-1…T3-3
 *    （交互元素内无标题 / 折叠可静态回读 / 同文件只用一种折叠原语，3 条）⇒ 1511 → 1514。
 *  2026-10-25 同 spec · Task 2（术语对照 Harness）：docs-governance-guard 增补 H-T1…H-T5
 *    （并列组层级 / 页签名覆盖段集合 / 结构性标签登记 / 废弃写法零残留 / 术语单一源，5 条；
 *     均带非空转下限与故障注入说明）⇒ 1514 → 1519。
 *  2026-10-25 同 spec · Task 4（同屏纵向一致）：ui-control-system-guard 增补 T4-1
 *    （同一文件只允许一种折叠头实现：renderDisclosure ↔ 手写 details/summary，1 条；
 *     带非空转下限与逐条理由豁免）⇒ 1519 → 1520。
 *  2026-10-25 spec restore-visual-hierarchy-and-runtime · Task 1（运行时正确性）：
 *    新增 runtime-tab-lifecycle-guard（11 条：renderCtx 最新态 ×2 / 统一生命周期 ×2 / 陈旧写回与失败可见 ×2 /
 *    loading 超时 ×2 / 绑定幂等 / 页内失败态 / 回退提示；含 3 条行为用例与故障注入说明）⇒ 1521 + 11 = 1532；
 *    并入同批工作树里视觉侧已落地的 3 条（page-sweep / ui-contrast-guard / ui-control-system-guard）
 *    ⇒ 按实况校准为 1535。
 *  2026-10-26 同 spec · Task 2（关键性能：首屏 / 鼠标卡帧）：在既有 runtime-tab-lifecycle-guard
 *    增补 P1–P5（可配置延迟 / 单次 loadDB / 首屏不阻塞 / hover 先读后写 + 观察器增量 / 后台刷新不铺占位，
 *    5 条，含 1 条行为用例与故障注入说明；未新增守卫文件）⇒ 1535 + 5 = 1540。
 *  2026-10-26 同 spec · Task 4（色彩分工）：既有守卫内新增 6 条（theme-palette-guard T8 功能色层 + T9 僵尸
 *    token、activity-tone-guard A5 暗色分离、link-color-guard L6 帮助链接 + L7 速查链接 + L8 help/about 锚点），
 *    未新增守卫文件 ⇒ 1540 + 6 = 1546。
 *  2026-10-26 同 spec · Task 5（按钮三档与可点性）：ui-control-system-guard 内新增 V4–V7 四条
 *    （btn-ghost 仅非动作行载体 / 纯文字动作下划线或箭头 / 图标按钮 32 视觉 + 44 命中 / 可点行 hover
 *    对比与左条），未新增守卫文件 ⇒ 1546 + 4 = 1550。
 *  2026-10-26 同 spec · Task 6（详情路由 direct/locate）：新增 object-route-guard 八条
 *    （入口矩阵 / direct·locate 落点 / 门 / 已归档只读 / 生成点收口 / 无空 id / 可点节点可键盘 /
 *     同页单一完整详情面；含故障注入说明）⇒ 1550 + 8 = 1558。
 *  2026-10-26 Task 6（测试残留隔离）：新增 test-isolation-guard 4 条（fixtureClass 四类 / external-write
 *    证据与故障注入 / :3000 归类与运行库字面量 / 临时库登录不写运行库）＋ data-lifecycle-guard 增补 ⑮
 *    （测试残留双条件清理，1 条）⇒ 1558 + 5 = 1563。
 *  2026-10-26 同 spec · Task 4（schema v12 与种子契约）：新增 seed-contract-guard 10 条
 *    （branchId / todos 生成列 / 四组唯一索引 / contributions 形状 / 考察成员 / 死表 /
 *     DATA_MODEL 登记 / 契约四类 / manifest 字段；每条带故障注入或规模下限）⇒ 1563 + 10 = 1573。
 *  2026-10-26 同 spec · Task 2（缓存边界与服务端优先登录）：`localstorage-key-guard` 新增 L4–L10 七条
 *    （四类清单 / registry 无僵尸 / visual 白名单 / 读缓存必须带 `_versions` / auth 不承载业务数据 /
 *    故障注入 / 读口拒收缺版本备份）＋ `auth.test.js` 新增三条（服务端真实账号可登录 / 401 不写登录态 /
 *    登录页 catch 不跳转）⇒ 1573 + 10 = 1583。
 *  2026-10-26 同 spec · Task 5（四个月演示窗口）：新增 demo-window-guard 5 条
 *    （窗口单一源 / 全量日期窗口内＋白名单 / 月覆盖与 11 月计划态 / 关键状态 / 级联顺序）⇒ 1583 + 5 = 1588。
 *  2026-10-26 同 spec · Task 3（写成功可证）：新增 write-truth-guard 9 条
 *    （六处 api 闸门静态 / 单一源逐键 / flush 分流 / outbox 三路径 / 快照照发 /
 *     语义端点 / 不支持形状显式失败 / 失败入 outbox 可重试放弃 / 本机域「未同步」）⇒ 1588 + 9 = 1597。
 *  2026-10-26 同 spec · Task 7（正式数据轨道与切换）：既有 4 件守卫内新增 6 条
 *    （seed-baseline B5 生产默认 SEED_FALLBACK=false / B6 生产含演示种子拒启与 ALLOW_DEMO_DATA 放行 /
 *     B7 seed-repair baseline·生产不修演示 id；backup-restore B2 真跑 restore.mjs；branch-roster-import
 *     api⑦ 名册事务回滚 + 导入后真实账号可登录；permission-gate READ_ONLY 写口 403），未新增守卫文件
 *    ⇒ 1597 + 6 = 1603。
 *  2026-10-27 Spec「refine-ui-three-lenses」阶段一 Task 2（操作成本 / a11y）：
 *    ui-focus-ring 新增 F6（顶栏深红底焦点环作用域 ≥3:1）＋ ui-tab-overflow 新增 T5
 *    （激活页签只改 scrollLeft，不用元素级滚动）两条，未新增守卫文件 ⇒ 1603 + 2 = 1605。
 *  2026-10-27 Spec「refine-ui-three-lenses」阶段二 Task 5（页标题与重复动作）：
 *    page-title-guard 新增 P4（静态壳不再输出页题）/ P5（活动·专班 H3/H4 顺序 + 原始 ID 移出正文）/
 *    P6（党委台卡头不复述页签名）三条；todo-void-flow V6 随结构改准（断言数不变）。
 *    同批并行专项另新增 6 条（a11y-tree / round3-4-batch1 / ui-tab-overflow 等）
 *    ⇒ 实测 1605 + 3 + 6 = 1614。
 *  2026-10-27 Spec「refine-ui-three-lenses」阶段三 Task 12（细节与手感）：
 *    新增 no-about-route-guard 5 条（HTML 零链接 / JS 零路由与侧栏项 / MD 零指针 / 文件保留 / 非空转自检）
 *    ⇒ 1614 + 5 = 1619。
 *  2026-10-27 同 Spec · 阶段三 Task 9（美学）：新增 no-underline-guard 4 条
 *    （扫描面自检 / 判红面清零 / PENDING 台账 / 只降不升）⇒ 1619 + 4 = 1623。
 *  2026-10-27 同 Spec · 阶段三 Task 10（加载与过渡）：新增 loading-experience-guard 6 条
 *    （判据全集 / 骨架形状 / 快速不闪骨架 / 慢渲染骨架与淡入 / 故障注入 / 跳转进度条）
 *    ⇒ 1623 + 6 = 1629。
 *  2026-10-27 同 Spec · 阶段三 Task 11（色彩角色）：ui-contrast-guard 新增 K6（warning 文字档
 *    亮/暗 ≥4.5:1 + 填充语义）+ theme-palette-guard 新增 T10（功能红/金与 danger/warning/主题
 *    accent 不撞值 + 文字对比）两条，未新增守卫文件 ⇒ 1629 + 2 = 1631。
  *  2026-10-27 批次 515（mock ↔ API 最小守卫）：mock-api-parity-structure 增补 S4
  *    （两适配器资源组 / 方法集合双向比对 + 白名单理由，1 条；未新增守卫文件）
  *  2026-10-27 批次 516：version-stamp 增 S8/S9（交付形态：modulepreload 同戳 / CDN 锁版本 / 缓存分流 / gzip，2 条）
 *    ⇒ 1632 + 2 = 1634；同批守卫归并（17 件 → 4 件）只动文件预算、不动断言预算。
 *  2026-10-28 美学专项 Task 7（规范与守卫收口）：copy-guard 增 S1/S2（卡头副题只写范围 + 约束 ·
 *    SD-54，2 条）＋ modal-guard 增 D1/D2（原生 confirm 清零 / confirmDanger 三段式入口 · SD-53，2 条）
 *    ⇒ 1634 + 4 = 1638。
 *  2026-10-28 美学专项 Task 5.4（首页 hero 豁免降级）：ui-home-hero 增 E8（登录且有待办写
 *    data-hero="muted" · 党徽 24px / 标题 --text-xl 左对齐，含反例，1 条）⇒ 1638 + 1 = 1639。
 *  2026-10-28 B-500-4 结案（数据保留期）：data-lifecycle-guard 新增 ⑯（cleanup 删除目标白名单不含任何
 *    业务表 · 以 RESOURCE_TABLES ＋ SEMANTIC_TABLES 为业务表全集，含「DELETE FROM activities」反例，1 条）
 *    ⇒ 1639 + 1 = 1640。
 *  2026-10-28 前端设计审查（根页地标）：docs-governance-guard 新增 G11（9 个根页的 #main-content 必须落在
 *    唯一 <main> 上 · 含正负例自检，1 条；未新增守卫文件）。同批按实况校准：此前台账记 1640，实测已为 1641
 *    （工作树里另有未计入的既有断言 modal-guard M2 / G8、copy-guard T1），本批 +1 ⇒ 实测 1642。
 *  2026-10-28 前端设计审查（浮窗字段类型 / 作废确认 / 二次确认归并）：modal-guard 新增 T1（8 个已知
 *    字段类型原样透传 / 未知类型生产期回退 text，含反例，1 条）⇒ 1642 + 1 = 1643。
 *  2026-10-28 空态全站收口：copy-guard 新增 E1/E2（空态只从 empty-state.js 出 · 白名单 3 条逐条写理由 /
 *    反例命中 + 负例不误伤 + 白名单无僵尸，2 条）⇒ 1643 + 2 = 1645。
 *  2026-10-28 硬编码审计（默认月 / URL / 日期口径）：copy-guard 新增 D1/D2（用户可见渲染串
 *    不写死完整年月日 · 基线 0 ＋ 反例/负例自检，2 条）＋ frontend-foundations-guard 新增 F10
 *    （日历默认月由 now 派生 · 注入两个 now，1 条）⇒ 按实况 1644 + 3 = 1647。
 *  2026-10-28 焦点单环 / 大字号对比：ui-control-system-guard 新增 FOCUS-1…3（双环检测含正反例 ·
 *    搜索框与 <select> 同环 · 「考勤良好」数值 ≥3:1，3 条；未新增守卫文件）⇒ 1647 + 3 = 1650。
 *  2026-10-28 焦点单一体例与交互补齐：ui-control-system-guard 新增 FOCUS-4/5（焦点只允许主题色单环 ·
 *    七色 base 对比度，2 条）＋ hover-state-guard 新增 H8/H9（可点类必须有 hover 或 active ·
 *    role=button 必须可聚焦，2 条）＋ copy-guard 新增 B1/B2（可见支部名字面量 · 旧色名与「十色」，2 条）
 *    ⇒ 1650 + 6 = 1656；另有 3 条既有用例改写后拆分为多条计入 ⇒ 按实况 1659。
 *  2026-10-29 About 冻结件守卫：新增 about-freeze-guard 5 条
 *    （B1 条目数恰好 5 / B2 三件套整文件哈希 / B3 两处引用面定位片段 / B4 定位串恰好命中 1 行 /
 *      B5 临时副本反例：5 处逐个改动判红 ＋ 副本原样判绿）⇒ 1659 + 5 = 1664。
 *  2026-10-29 ESM 解析门禁：新增 esm-parse-guard 2 条（全量模块真 ESM 解析 · 函数体内 import 反例）
 *    ⇒ 1664 + 2 = 1666。
 *  2026-10-29 P1（焦点只有一个信号）：ui-control-system-guard FOCUS-2/FOCUS-4 改写为全量扫描
 *    （输入族零 outline · 按钮族必有环 · 任一规则块 ≤1 层 · 焦点色禁党徽金/党建红，含 5 类反例）
 *    ＋ ui-focus-ring F2/F3、field-shell-guard F2/F3 按新口径判准。断言均在既有 test() 内扩充，
 *    **未新增测试文件 / 未新增静态 test() 调用点** ⇒ 实测 1663 ≤ 1666，预算维持
 *    DAILY_FILE_BUDGET = 228、DAILY_TEST_BUDGET = 1666（不上调；按实况登记，避免预算失去约束力）。
 *  2026-10-29 P2（数字组单一语法）：ui-control-system-guard V1 按新结构改写（判据更严：横排 +
 *    .stat-card__body + 无 min-height + 栅格 4/2/2）＋ 新增 V8 全量扫描（docs/src 下全部 .js 与
 *    docs 根页 .html 的数字组竖排回潮 / 组内内联 hex，含 5 个反例样本）1 条；另按新口径改准
 *    ui-home-hero E7、work-overview W4、ui-phase2-urgent U4、ui-contrast K6、theme-palette G5。
 *    仅新增 1 个静态 test() 调用点、未新增文件 ⇒ 实测 1664 ≤ 1666，预算维持
 *    DAILY_FILE_BUDGET = 228、DAILY_TEST_BUDGET = 1666（差额 2 不作上调，保留约束力）。
 *  2026-10-29 P3/P4（筛选四段 / 容器五档）：新增 lf-bar-structure-guard 5 条
 *    （L1 直接子元素只能是行 / L2 段位与纯范围例外 / L3 两类反例 / L4 产出点下限 / L5 登记）
 *    ＋ container-width-guard 6 条（C0 五档表与 .card-grid / C1+C2 页面只许五档 /
 *    C3 42rem 与 1320px 反例 / C4 页面数下限 / C5 登记）⇒ 新增 11 条、实测 1674；
 *    roster-filter-guard R4 改为通用窄屏规则（断言数不变）。
 *    新增 2 个文件 ⇒ DAILY_FILE_BUDGET 228 → 230；断言预算按实测 1674 上调至 1676
 *    （留 2 条余量，不作「9999 式」放宽）。
 *  2026-10-29 P6 例外补守卫：frontend-foundations-guard 新增 F11（mock 延迟单一源：默认 80ms /
 *    两条覆盖入口 / 上限 5000ms，含 2 类反例，1 条）＋ test-tier-guard 新增 T7（守卫台账标题
 *    数字与正文「现行 N 件」一致，含反例，1 条）＋ ui-control-system-guard V4 内补 3 条
 *    btn-ghost 反例断言（不新增 test() 调用点）；均未新增文件。实测 1674 → 1676，
 *    预算按实况上调至 1678（留 2 条余量）。
 *  2026-10-31 P8（状态色两层 / 暗色色阶补齐）：新增 status-color-guard（S1 填充档不得作 color /
 *    S2 文字档逐色对比度 / S3 文档值=实现值，3 条，含 3 类反例）＋ theme-palette-guard 新增 T11
 *    （暗色段补齐 primary 三档与 identity 基础名、6 个元素亮暗背景不同、暗色对比度，1 条）
 *    ⇒ 本轮 1678 + 4 = 1682；新增 1 个文件 ⇒ 文件预算 230 → 231（随后 P0/P13–P15 并入同批，
 *    最终 233 / 1688，见下条）。预算按实况登记（不留「9999 式」余量）。
 *  2026-10-31 P0/P13–P15（嵌套交互 / 卡片末行 / 折叠头 / hero 特例）：
 *    新增 nested-interaction-guard 3 条（N1 扫描 + 白名单 / N2 双向一致 + 14 处缺陷行 / N3 反例）
 *    ＋ card-summary-hero-guard 3 条（G1 卡片末行只有右对齐动作 / G2 summary 宽 100% 高 ≥44 /
 *    G3 hero 居中白名单；各带反例）⇒ 实测 1682 + 6 = 1688；
 *    ui-home-hero E8 按新裁定改写（断言数不变）。预算 1682 → 1688。
 *  2026-10-31 P9（触控热区 / 表单错误 / 确认弹窗 Esc）：
 *    新增 touch-target-guard 7 条（判定器反例 / 六类命中区规则 / 视觉不变与命中下限 /
 *    相邻不重叠 / 表单三态 aria 成对 / 弹窗 Esc + 焦点回归 / offender 棘轮）
 *    ＋ modal-guard 新增 E1–E3（Esc 可取消 / 焦点回归与 Tab 陷阱 / 表单错误成对，各带反例）
 *    ⇒ 按实况登记 1700（此前台账 1688 与实测 1690 差 2，本批一并校准）。新增 1 个文件 ⇒ 文件预算 233 → 234。 */
/** 2026-10-31 字号/间距低风险收口（只加登记与守卫，不改渲染）：
 *  · `type-scale-guard` 新增 Q1–Q4 四条（档位表外新增判红 / 逐文件逐值棘轮 / 非空转与文档齐备 / 进度）；
 *  · `spacing-scale-guard` 新增 S5–S7 三条（styles.css 非令牌声明 / 行内声明 / 行内属性棘轮）。
 *  均沿用既有守卫文件，未新增文件 ⇒ 实测 1700 + 7 = 1707；文件预算维持 234。 */
/** 2026-10-31 批次 523（首屏 4xx 归零）：`module-load.test.mjs::E4`（真机装配，precommit 层）新增
 *  「每个抽样工作台页首屏 `/api/v1/` 4xx === 0」断言 1 条（逐条带 状态码 + 路径；复核结论：上一轮
 *  审查所称 `memberChangeRequests` / `agendaVotes` 恒 404 系驼峰路径误读，真实端点小写连字符，
 *  带 token 实测 200）。该断言写在既有 `test()` 调用点内、所在文件属 precommit 不进 daily 静态计数，
 *  实况仍 1707 ⇒ 按「新增断言须同批上调预算」上调 1 条留余量：1707 → 1708。 */
/** 2026-11-01 页签模块加载失败自愈：`copy-guard.test.mjs` 新增源件 9 的 F1/F2 两条
 *  （失败态错误串不得暴露模块文件名 / 不含「请刷新」；模块失败分支必须带 reload 动作且按钮为「重新载入」，
 *  各带反例），沿用既有守卫文件、未新增文件 ⇒ 按实况 1708 + 2 = 1710。
 *  2026-11-01 折叠头单一语法 / hover 只变箭头 / 数字卡回线上口径：
 *  · `hover-state-guard` 新增 H10（`.disclosure__summary` 含 hover/active 不得声明非透明背景，
 *    带 2 类反例与 3 类正例）1 条；H3 三态选择器口径放宽以承接
 *    `summary:not(.disclosure__summary):hover`（断言数不变，另加「底色反馈须排除空壳热区」）。
 *  · `type-scale-guard` 新增 Q5（`.disclosure__title` 16/600/24 ＋ 调用点不得再用
 *    `font-title-cn`/`text-sm`，带 14px/800 反例）1 条。
 *  · `ui-home-hero` E7 / `card-summary-hero-guard` G1 按新口径改准（断言数不变）。
 *  均沿用既有守卫文件、未新增文件 ⇒ 实测 1710 + 2 = 1712。 */
/** 2026-11-01 批次 524 C/D（嵌套卡去重 / 语义标签 / 只读按权限计算）：
 *  · `card-summary-hero-guard` 新增 G4（`workgroup-view` / `taskforce-view` 的 `opts.embedded`
 *    分叉 + 嵌入模板无 `class="card` + `insight-view` 两处传 `embedded: true`，含 3 类反例）1 条；
 *  · `frontend-foundations-guard` 新增 F12（`canWriteResource` / `readonlyMeta` 角色矩阵、
 *    registry 角色键 ∈ `ROLE_KEYS`、4 处硬编码文案清零，含反例）1 条；
 *  · `a11y-tree.test.mjs` 新增 A10（5 页真机 `section` 名称 / 嵌套审计 + 合成 DOM 反例）
 *    写在 precommit 层，不进 daily 静态计数。
 *  沿用既有守卫文件、未新增文件 ⇒ 1718 + 2 = 1720。 */
/** 2026-11-01 批次 524 E（功能色分工）：`ui-color-semantics.test.mjs` 新增 C6（工作台结论带
 *  「待…」/ 逾期 / 组员汇报指标只取 --status-*-text / --neutral-*，出现 --app-accent 即红）、
 *  C7（待答复直达条取 --status-info-text，不得再用角色主题色）、C8（旧 / 新写法正反例非空转）三条。
 *  沿用既有守卫文件、未新增文件 ⇒ 实测 1715 + 3 = 1718（与同批其它改动并行时按实况登记）。 */
/** 2026-11-01 批次 524 A/B（表头去灰 / 行选中柔和化，支书 #2 #6）新增 2 个静态 test() 调用点：
 *  · `ui-control-system-guard` V9 —— `.data-table th` / `.data-table thead th` 规则体内不得出现
 *    background（带 2 条合成反例 ＋ 2 条正例）；同文件 V7 按新裁定改写（可点行 hover 改
 *    `--app-accent-tint` ＋ `::before` 左条，灰底只留静态分隔；断言数不变，仍逐条核 token / 过渡）。
 *  · `hover-state-guard` H11 —— `.list-row` 8px 圆角 / hover 主题 10% 淡底 / `::before` 3px 左条带
 *    opacity 过渡（带 3 条反例 ＋ 1 条「无过渡」反例）；同文件 H2 按新裁定只放行「装饰伪元素
 *    （::before / ::after）的 opacity」，元素级 opacity 与 filter / transform / box-shadow 仍判红
 *    （断言数不变，另加 5 条正反例自检）。
 *  · `frontend-foundations-guard` F8 的行载体 hover token 随新裁定改准（断言数不变）。
 *  两条已落在上一条并行登记的余量内（实测 1716 ≤ 1718），故本批不再另行上调常量；
 *  若后续批次回收余量，须按「实测 + 2」重算。
 *  2026-11-01 批次 524（#7 待办动作表 + 深链）：`tab-nav.test.mjs` 新增 G1–G4 四条
 *    （旧页签直点/写死 URL 零残留 + TODO_ACTIONS 覆盖各台 actionKey/actionType 字面量
 *    + resolveTodoAction 优先级/覆盖 + data-ws-tab-btn 与目标页 PendingTarget 消费，各带反例）
 *    ⇒ 1720 → 1724。
 *  2026-11-01 批次 524（F 输入单一源 + 搜索框收窄 + 自动补全）：`field-shell-guard` 新增
 *    R1（裸输入逐文件只减不增 ＋ 未登记文件即红 ＋ 僵尸条目判红）、R2（总数/文件数与
 *    `RAW_INPUT_TOTAL_BASELINE` / `RAW_INPUT_FILE_BASELINE` 一致、forms.js 仍导出 textInput/selectInput）、
 *    R3（合成裸 input 必须判红、textInput/selectInput 产物必须不命中）三条静态 test() ⇒ 1724 → 1727。
 *  2026-11-01 spec consolidate-tab-density-and-filter-bars · Task 1（页签密度基线）：
 *    `ui-first-screen-order` 新增 F6–F9 四条（注册页签集合 ↔ `TAB_BLOCK_BASELINE` 双向相等 /
 *    >4 块必须有非空 reason / 两条反例 / 非空转规模与字段），沿用既有守卫文件、未新增文件
 *    ⇒ 1727 → 1731。
 *  2026-11-01 同 spec · Task 2（筛选条两行）＋ Task 3（去原生 datalist）：
 *    · `filter-row` 新增 S14（`.lf-bar` 不得 flex-direction: column、行须 display: contents、
 *      reset 不得 flex-basis:100%，3 类反例）＋ S15（四页真机 1440 读数 ≤2 行 / ≤96px，
 *      读 `.ctx/evidence/2026-11-01/batch525-filter.json`，含 4 行 184px 反例）两条；
 *    · `field-shell-guard` 新增 R4（`docs/src` 原生 list 属性 / datalist 标签清零 ＋ 反例、
 *      data-*-list 负例）＋ R5（`suggestInput` 产物 combobox ARIA 齐全、无 list 属性 ＋ 无 ARIA 反例）两条
 *    ⇒ 1731 + 4 = 1735。
 *  2026-11-01 同 spec · Task 6（专班管理块收敛 ≤4）：`taskforce-history-copy` 第三测试改写为
 *    「四段对象区 + 贡献核验块 + 9 个分块刷新容器」并新增 1 条「顶层区块收敛到 4（一卡两视图 /
 *    卡头筛选 / 详情默认隐藏 / 赋权折叠）」⇒ 1735 → 1736。
 *  2026-11-01 同 spec · Task 8（规范与指针落盘）：`docs-governance-guard` 新增 G12
 *    （当前状态类 8 份文档不得再出现「五编」/「Q-01…Q-21」；`第五编` 不误伤、合成反例判红、
 *    CLAUDE.md 批次 521 历史句与 `.ctx/logs/**` 豁免）1 条 ⇒ 1736 → 1737。
 *  2026-11-02 批次 527 · Wave 2（领域契约单一源）：新增 `data-contract.test.mjs` 6 条
 *    （47 表覆盖 / required 命中 / 枚举只来自契约 / 三类反例 / 成员变更读时别名 / deprecated 保留），
 *    纯 node + `:memory:` ⇒ daily；文件预算 234 → 235，断言预算 1737 → 1743。
 *  2026-11-03 任务 2（运行档固化）：新增 `run-mode.test.mjs` 7 条
 *    （R1–R2 两档文案 / R3 生产多支部拒 / R4 ALLOW_MULTI_BRANCH=1 放行 / R5 review 不拦 /
 *      R6 执行器 exit(1) / R7 缺省复用 env.js），纯 node + `:memory:`
 *    ⇒ 文件预算 235 → 236，断言预算按实测 1743 → 1744。
 *  2026-11-03 任务 4（写入口权限矩阵缺口 + 会话 TTL）：新增 `write-policy-matrix` 4、
 *    `write-policy-gaps` 4、`session-ttl` 2 条（均纯 node + `:memory:` 真跑 HTTP）
 *    ⇒ 文件预算 236 → 239，断言预算 1744 → 1754。
 *  2026-11-03 任务 7（安全红队）：新增 `security-redteam` 5 条（快照清空/改写聚合子记录、
 *    组织者不误伤、考勤与通知门防回归，纯 node + `:memory:`）⇒ 文件预算 239 → 240，
 *    断言预算 1754 → 1759。 */
/** 2026-11-03 批次 529：`ctx-hygiene-guard` 新增 ⑤–⑦ 三条（active 预算 / ACTIVE_RULINGS 索引 / SNAPSHOT 去批次小结）⇒ 实测 1762，按 1764 登记（留 2 条余量，不作「9999 式」放宽）。 */
/** 2026-11-03 批次 530（CLAUDE 分层与 UI 清单）：`ctx-hygiene-guard` 新增 ⑩（H20.3 next_prompt 六要素 + commit 模板，1 条）；
 *  `ui-preflight-context` 由「热层 10 问同源」改为「热层指针 + 温层 8 组」，断言数 4 → 4（不变）
 *  ⇒ 实测 1765，按 1767 登记（留 2 条余量，不作「9999 式」放宽）。未新增测试文件，文件预算维持 240。 */
export const DAILY_TEST_BUDGET = 1767;

const group = (tier, reason, list) => list.map((file) => ({ file, tier, reason }));

/** 全量分层登记表：每条 = { file, tier, reason } */
export const TEST_TIERS = [
  // daily · 权限 / 角色 / 受众 / 作用域
  ...group('daily', '权限 / 角色 / 受众 / 作用域', [
    'activity-member-privacy.test.mjs',
    // 2026-10-22 第九轮 Task 4.3：活动 ↔ 工作组同事务同步（纯 node；含服务端 HTTP + mock 镜像）
    'activity-workgroup-sync.test.mjs',
    // 2026-10-23 批次 504：v11 Todo 归属（回填 / 400 / 兼容期）与影子子表（回填 / 篡改 / 回滚）
    'schema-split-shadow.test.mjs',
    'todo-branch-attribution.test.mjs',
    'auth-audit-scope.test.mjs',
    'auth-password.test.mjs',
    'auth.test.js',
    'block-field-policy.test.mjs',
    'capability-package-catalog.test.mjs',
    'capability-registry.test.mjs',
    'handoff-state-guard.test.mjs',
    'iaaa-onboarding.test.mjs',
    'inspection-write-gate.test.mjs',
    'issue-audience-projection.test.mjs',
    'issue-branch-policy.test.mjs',
    'module-owner-authz.test.mjs',
    'notice-audience.test.mjs',
    'output-block-policy.test.mjs',
    'participant-scope.test.mjs',
    'periodic-archive-policy.test.mjs',
    'periodic-archive-scope.test.mjs',
    'permission-gate.test.mjs',
    'policy-config.test.mjs',
    'r3-data-permission-regression.test.mjs',
    'roles-sync.test.mjs',
    'round3-4-security.test.mjs',
    'system-notice-project-auth-authorize.test.mjs',
    'todo-cross-role-safety.test.mjs',
    'todo-role-write-gate.test.mjs',
    'workforce-gate.test.mjs',
    'workgroup-branch-scope.test.mjs',
    'workgroup-member-grant-revoke.test.mjs',
    // 2026-11-03 任务 4：写入口权限矩阵守卫（运行期路由表 ≡ 矩阵，纯 node）
    'write-policy-matrix.test.mjs',
    // 2026-11-03 任务 4：矩阵 6 条真实缺口回归（考勤删除 / 聚合子记录 / 未读标记，纯 node + :memory:）
    'write-policy-gaps.test.mjs',
    // 2026-11-03 任务 4：会话 TTL（默认 7 天，非法值回落；过期即删，/auth/me 与写口 401，纯 node + :memory:）
    'session-ttl.test.mjs',
    // 2026-11-03 任务 7：安全红队 P0 回归（快照整表写穿不得清空聚合子记录；组织者不误伤，纯 node + :memory:）
    'security-redteam.test.mjs',
  ]),
  // daily · 数据真值 / 迁移 / 种子 / 备份
  ...group('daily', '数据真值 / 迁移 / 种子 / 备份', [
    'account-rename.test.mjs',
    'archive-action-guard.test.mjs',
    'archive-record-write.test.mjs',
    'backup-restore.test.mjs',
    'catalog-sync.test.mjs',
    // 2026-11-02 批次 527 · Wave 2：领域契约单一源（47 表覆盖 / required / enums / 反例，纯 node）
    'data-contract.test.mjs',
    'data-lifecycle-guard.test.mjs',
    'db-integrity-guard.test.mjs',
    'db-migration.test.mjs',
    'id-uniqueness.test.mjs',
    'identity-student-id-guard.test.mjs',
    'material-link-truth.test.mjs',
    'mock-api-parity-structure.test.mjs',
    'mock-api-parity.test.mjs',
    'mock-multi-branch.test.mjs',
    'periodic-archive-api.test.mjs',
    'periodic-archive-migration.test.mjs',
    'person-consistency.test.mjs',
    'reset-tier-init.test.mjs',
    'reset-tier.test.mjs',
    // 2026-10-23 R11 Task 12.1：拆表切换闸门（C2 埋点 / C4 历史 / NOT_READY 不切读路径，纯 node）
    'schema-split-gate.test.mjs',
    'seed-baseline.test.mjs',
    // 2026-11-03 任务 2：运行档（review / production）与生产单支部硬断言（纯 node，:memory:）
    'run-mode.test.mjs',
    // 2026-10-26 Task 5：四个月演示窗口（2026-08-01~2026-11-30）日期/月覆盖/11 月计划态/关键状态（纯 node）
    'demo-window-guard.test.mjs',
    // 2026-10-26 Task 4：schema v12 种子契约（branchId / 唯一索引 / todos 生成列 / contributions / 考察成员 / 死表）
    'seed-contract-guard.test.mjs',
    'seed-drift.test.mjs',
  ]),
  // daily · 文档真值 / 版本 / 构建完整性
  ...group('daily', '文档真值 / 版本 / 构建完整性', [
    'claude-parallel-audit.test.mjs',
    'ctx-hygiene-guard.test.mjs',
    'doc-consistency.test.mjs',
    // 2026-10-24 批次 509：frontmatter-freshness / timestamps-note-guard / doc-line-ref 三件合并为
    //   docs-governance-guard（F1–F3 / N1–N7 / R1–R6 断言全数搬入，另加 README / AGENTS / SNAPSHOT / 判例索引）
    'docs-governance-guard.test.mjs',
    'import-path-guard.test.mjs',
    // 2026-10-29：真 ESM 解析门禁（浏览器口径；node --check 为 CommonJS 语义，不能替代）＋ 函数体内 import 反例
    'esm-parse-guard.test.mjs',
    'version-stamp.test.mjs',
  ]),
  // daily · 静态结构 / UI / 文案 / 防假绿守卫
  ...group('daily', '静态结构 / UI / 文案 / 防假绿守卫', [
    'activity-block-gate.test.mjs',
    // 2026-10-24 批次 508：活动类别 tone 单一源 / info 语义隔离 / 党建红 ≠ 错误红（纯 node）
    'activity-tone-guard.test.mjs',
    // 2026-10-24 批次 508：归档 ?tab=/?id= 深链、focusActivityId 展开折叠区、复盘落点（纯 node）
    'archive-deeplink-guard.test.mjs',
    'block-orchestration.test.mjs',
    'branch-id-literal-guard.test.mjs',
    // 2026-10-31 P13–P15：卡片末行 / 折叠头 summary / hero 居中白名单（各带反例，纯 node）
    'card-summary-hero-guard.test.mjs',
    // 2026-10-31 P9：390 触控命中区（六类）/ 相邻不重叠 / 表单错误 aria 成对 / 确认弹窗 Esc；
    //   真机遍历读数由 scripts/touch-target-audit.mjs 产出，本守卫做棘轮（纯 node）
    'touch-target-guard.test.mjs',
    'committee-meeting-density.test.mjs',
    'committee-tab-density.test.mjs',
    // 2026-10-27 批次 516（B-515-2 归并）：copy-fold / copy-length / copy-master / self-evident-copy 四件合一
    'copy-guard.test.mjs',
    'date-canon-guard.test.mjs',
    'dead-selector-guard.test.mjs',
    // 2026-10-24 批次 508：字段外壳焦点态唯一源 / 禁用只读分态 / select 统一增强（纯 node）
    'field-shell-guard.test.mjs',
    // 2026-10-23 批次 505（Task 9）：组件密度 / 按钮高度 / 间距五档 / Tailwind 数值档棘轮（纯 node）
    'density-spacing-guard.test.mjs',
    // 2026-10-23 R11 Task 12.1：操作结果反馈可信（作用域写等待 / 失败不报成功，纯 node）
    'feedback-integrity.test.mjs',
    'filter-row.test.mjs',
    'frontend-foundations-guard.test.mjs',
    'hex-hardcode-guard.test.mjs',
    // 2026-10-23 批次 505（Task 9）：hover/active/selected 三态、@media (hover:hover) 门控、静态行无 hover（纯 node）
    'hover-state-guard.test.mjs',
    'ia-critical-guard.test.mjs',
    // 2026-10-23 批次 507：跳转链接颜色单一源（`<a>` 不得用 Tailwind 蓝；`.link` 消费 softText，纯 node）
    'link-color-guard.test.mjs',
    // 2026-10-29 P3：筛选四段结构（`.lf-bar` 直接子元素只许 `.lf-bar__row` / 段位与纯范围例外 / 反例，纯 node）
    'lf-bar-structure-guard.test.mjs',
    // 2026-10-29 P4：页面容器五档（HTML 宽度类与 max-width rem/px 定值 / About 豁免 / 反例，纯 node）
    'container-width-guard.test.mjs',
    // 2026-10-27 spec refine-ui-three-lenses · Task 10：加载体验（骨架/120ms/180ms 淡入/≤1s/跳转进度条，纯 node）
    'loading-experience-guard.test.mjs',
    'localstorage-key-guard.test.mjs',
    // 2026-10-23 R11 Task 12.1：弹窗交互闭环契约（提交中禁止关闭 / alert / onSubmit 契约，纯 node）
    // 2026-10-27 批次 516（B-515-2 归并）：modal-contract / modal-escape / ui-modal-form 三件合一
    'modal-guard.test.mjs',
    // 2026-10-27 spec refine-ui-three-lenses · Task 12.4：About 撤路由（HTML/JS/MD 零入口 + 文件保留，纯 node）
    'no-about-route-guard.test.mjs',
    // 2026-10-29 About 独立冻结件：5 处内容基线（3 件套整文件哈希 + 功能目录「关于」卡 / help 页面清单定位片段，纯 node）
    'about-freeze-guard.test.mjs',
    // 2026-10-27 spec refine-ui-three-lenses · Task 9：全站文本下划线清零（源码口径 + PENDING 台账，纯 node）
    'no-underline-guard.test.mjs',
    // 2026-10-24 批次 508：动效令牌 / 时长与属性白名单 / reduced-motion / .motion-* 四件套（纯 node）
    'motion-guard.test.mjs',
    // 2026-10-31 P0：可点容器内嵌 button/a —— 未标记 / 未登记即判红（含 14 处缺陷行白名单，纯 node）
    'nested-interaction-guard.test.mjs',
    'page-title-guard.test.mjs',
    'party-branch-directory-context.test.mjs',
    'party-branch-directory-guard.test.mjs',
    'party-workbench-layout.test.mjs',
    // 2026-10-27 批次 516（B-515-2 归并）：perf-render / todo-agg-cache / version-token / index-equivalence 四件合一
    'perf-guard.test.mjs',
    'person-picker-density.test.mjs',
    'publicity-static-guard.test.mjs',
    'responsive-cards-guard.test.mjs',
    'roster-filter-guard.test.mjs',
    'round1-remediation-guard.test.mjs',
    'round3-4-batch1.test.mjs',
    'row-markup-guard.test.mjs',
    // 2026-10-25 Task 1：Tab 运行时正确性（renderCtx 最新态 / 统一生命周期 / loading 超时 / 绑定幂等，纯 node）
    'runtime-tab-lifecycle-guard.test.mjs',
    // 2026-10-26 Task 6：详情路由 direct/locate/none 矩阵、门、已归档只读、生成点收口（纯 node）
    'object-route-guard.test.mjs',
    'spacing-scale-guard.test.mjs',
    'state-enum-guard.test.mjs',
    'structural-round3.test.mjs',
    'suite-shard.test.mjs',
    'tab-alias-guard.test.mjs',
    'tab-nav.test.mjs',
    // 2026-10-27 批次 516（B-515-2 归并）：small-text / text-tier / table-type-scale / control-font 四件合一
    'type-scale-guard.test.mjs',
    // 2026-10-23 批次 505（Task 9）：7 主题 × 亮/暗 × 8 token 色板、对比度/彩度、固定语义色分离（纯 node）
    'theme-palette-guard.test.mjs',
    // 2026-10-31 P8：状态色填充档不得作 color（含反例）/ 三个文字档逐色对比度 / 文档值=实现值（纯 node）
    'status-color-guard.test.mjs',
    'ui-button-four-types.test.mjs',
    'ui-color-semantics.test.mjs',
    'ui-contrast-guard.test.mjs',
    // 2026-10-23 R11 Task 12.1：控件层单一源（SD-1/2/3/4/6/9/10 静态断言，纯 node）
    'ui-control-system-guard.test.mjs',
    'ui-custom-select.test.mjs',
    'ui-first-screen-order.test.mjs',
    'ui-focus-ring.test.mjs',
    'ui-help-note.test.mjs',
    'ui-home-deeplink.test.mjs',
    'ui-home-hero.test.mjs',
    // 2026-10-22 第九轮 Task 6：卡片悬停不得上浮/加阴影 ＋ transition-all 棘轮（纯 node）
    'ui-motion-guard.test.mjs',
    'ui-phase2-urgent.test.mjs',
    'ui-picker-focus.test.mjs',
    'ui-preflight-context.test.mjs',
    'ui-primary-cta-color.test.mjs',
    'ui-redundancy-guard.test.mjs',
    'ui-row-interaction.test.mjs',
    'ui-select-appearance-guard.test.mjs',
    'ui-tab-overflow.test.mjs',
    'ux-guard.test.mjs',
    'validation-site-coverage.test.mjs',
    'work-overview-layers.test.mjs',
    'workbench-audit-coverage.test.mjs',
    'workbench-revision-contract.test.mjs',
    'workflow-block-config.test.mjs',
  ]),
  // daily · 业务域回归 / 写链 / 事务 / 状态机
  ...group('daily', '业务域回归 / 写链 / 事务 / 状态机', [
    'activity-calendar-sharing.test.mjs',
    'activity-creation-transaction.test.mjs',
    'activity-delete-client.test.mjs',
    'activity-delete.test.mjs',
    'activity-party-group-assignment.test.mjs',
    'agenda-closure-core.test.mjs',
    'agenda-editing.test.mjs',
    'agenda-follow-up.test.mjs',
    'agenda-quorum.test.mjs',
    'agenda-relations.test.mjs',
    'agenda-votes.test.mjs',
    'attendance-batch.test.mjs',
    'attendance-matrix-model.test.mjs',
    'attendance-roster-union.test.mjs',
    'base-data-preview.test.mjs',
    'branch-affiliation.test.mjs',
    'branch-appoint-inline.test.mjs',
    'branch-appointment-atomic.test.mjs',
    'branch-config-audit.test.mjs',
    'branch-doc.test.mjs',
    'branch-module-catalog.test.mjs',
    'branch-resource-isolation.test.mjs',
    'branch-roster-import.test.mjs',
    'branch-status.test.mjs',
    'cross-group-activity-probe.test.mjs',
    'cross-group-recruitment.test.mjs',
    'empty-template.test.mjs',
    'group-view.test.mjs',
    'home-workgroup-progress.test.mjs',
    'inspection-workgroup-key.test.mjs',
    'issue-branch.test.mjs',
    'issue-mock-identity.test.mjs',
    'link-target-guard.test.mjs',
    'meeting-attendance-rules.test.mjs',
    'member-change-cross-session.test.js',
    'member-change-flow.test.js',
    'member-confirmation.test.mjs',
    'member-flow.test.mjs',
    'member-persist.test.mjs',
    'member-progress.test.mjs',
    'member-roster-api-read.test.mjs',
    'module-compose.test.mjs',
    'module-config.test.mjs',
    'module-cycle-remind.test.mjs',
    'notice-deeplink-guard.test.mjs',
    'notice-message.test.mjs',
    'org-config.test.mjs',
    'page-navigation-url.test.mjs',
    'party-group.test.mjs',
    'party-overview-model.test.mjs',
    'pending-writes.test.mjs',
    // 2026-10-26 Task 3：写成功可证（api 去 mock 回退 / 非快照域语义端点 / outbox 重试放弃；纯 node）
    'write-truth-guard.test.mjs',
    'person-profile-presentation.test.mjs',
    'person-profile-service.test.mjs',
    'report-branch-webhook.test.mjs',
    'report-count.test.mjs',
    'report.test.js',
    'resolution-followup.test.mjs',
    'roster-ui-logic.test.mjs',
    'roster.test.mjs',
    'scene-write-sync.test.mjs',
    'secretary-overview-attendance.test.mjs',
    'self-profile-import.test.mjs',
    'self-profile.test.mjs',
    'server-base.test.mjs',
    'setup-status.test.mjs',
    'signup-onsite-roster.test.mjs',
    'skeleton.test.js',
    'soft-void.test.mjs',
    'system-notice-branch-source.test.mjs',
    'taskforce-history-copy.test.mjs',
    'taskforce-lifecycle.test.mjs',
    // 2026-10-22 第九轮 Task 4.2：专班成员 / 贡献走工作组主源（纯 node）
    'taskforce-workgroup-source.test.mjs',
    'theme-pref.test.mjs',
    'thought-report-panel.test.mjs',
    'thought-review.test.mjs',
    'today-summary.test.mjs',
    'todo-deriver-domain.test.mjs',
    'todo-domain-view.test.mjs',
    'todo-domain.test.mjs',
    'todo-urgency.test.mjs',
    'todo-void-flow.test.mjs',
    'wizard-config.test.mjs',
    'wizard-report.test.mjs',
    'work-map.test.mjs',
    'workgroup-api.test.mjs',
    'workgroup-batch-adapter.test.mjs',
    'workgroup-member-editor.test.mjs',
    'workgroup-member-semantics.test.mjs',
    'write-path-guard.test.mjs',
  ]),
  // daily · 测试分层 / 预算 / 防假绿编排守卫
  ...group('daily', '测试分层 / 预算 / 防假绿编排守卫', [
    'test-tier-guard.test.mjs',
    // 2026-10-26 Task 6：fixtureClass 四类 / external-write 证据 / 运行库 sessions·uploads 不增长（纯 node）
    'test-isolation-guard.test.mjs',
  ]),
  { file: 'a11y-tree.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：可访问性树真机核对' },
  { file: 'agenda-closure.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：议程闭环真机' },
  { file: 'agenda-flow.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：议程流转真机' },
  { file: 'async-vote.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：异步投票真机' },
  { file: 'attendance-queue-selection-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：纪检考勤队列选择真机流程' },
  { file: 'b3-1-makeup-writeback.test.mjs', tier: 'precommit', fixtureClass: 'tmp', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：补录回写真机（2026-10-26 Task 6 起自托管临时库 + listen(0)，不再写 server/data.db）' },
  { file: 'block-canvas-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：区块画布真机' },
  { file: 'block-config-ui-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：区块配置 UI 真机' },
  { file: 'block-entry-guard-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：区块入口守卫真机' },
  { file: 'block-manifest.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：区块清单真机' },
  { file: 'copy-anchor-guard-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：文案锚点真机' },
  { file: 'e2e-login.test.js', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：登录流程真机' },
  { file: 'form-loop-sweep.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：全站表单校验 / 载体闭环真机普查' },
  { file: 'help-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：帮助页真机' },
  { file: 'iaaa-ui-onboarding.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：IAAA 引导 UI 真机' },
  { file: 'inspection-loop-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：纪检闭环真机' },
  { file: 'issue-anonymity.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：议题匿名真机' },
  { file: 'link-integrity.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：链接完整性真机' },
  { file: 'list-filter-chip-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：列表筛选 chip 真机' },
  { file: 'mock-integrity.test.mjs', tier: 'precommit', fixtureClass: 'external-read', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：mock 完整性真机（连 :3000 只读审计）' },
  { file: 'module-config-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：模块配置真机' },
  { file: 'module-load.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：模块装载真机' },
  { file: 'multi-tab-sync.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：多标签同步真机' },
  { file: 'multi-user-write.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：多用户写入真机' },
  { file: 'online-committee.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：线上支委真机' },
  { file: 'page-sweep.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：全站分页 / 宽表 / 检索真机普查' },
  { file: 'party-committee-dispatch.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：党委台派发真机' },
  { file: 'party-committee-review.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：党委台审议真机' },
  { file: 'party-committee.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：党委台真机' },
  { file: 'preferences.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：偏好设置真机' },
  { file: 'records-endpoints.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：记录端点真机' },
  { file: 'relation-matrix.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：关系矩阵真机' },
  { file: 'self-profile-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：个人资料真机' },
  { file: 'today-action-groups-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：今日行动分组真机' },
  { file: 'write-grant-prompt-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（daily 移出 → precommit 落点）：写权限提示真机' },
  { file: 'write-hover-e2e.test.mjs', tier: 'precommit', reason: '真机浏览器 e2e（原分片池 → precommit 全量）：写入悬停态真机' },
  { file: 'click-cost.test.mjs', tier: 'weekly', fixtureClass: 'external-read', reason: '点击成本审计（慢速视觉 / 审计；weekly 频率，precommit/full 仍覆盖；连 :3000 只读审计）' },
  { file: 'copy-screen-guard.test.mjs', tier: 'weekly', reason: '逐屏文案视觉普查（慢速视觉 / 审计；weekly 频率，precommit/full 仍覆盖）' },
];

// ── 纯函数（守卫与脚本共用；不读磁盘、不依赖 cwd）──────────────────────────
/** 按层取文件（保持登记顺序） */
export const filesByTier = (tier) => TEST_TIERS.filter((e) => e.tier === tier).map((e) => e.file);

export const dailyFiles = filesByTier('daily');
export const precommitFiles = filesByTier('precommit');
export const weeklyFiles = filesByTier('weekly');

/** 三层并集（去重前的原样数组；重复项由 `diffTiers` 判红） */
export const allRegisteredFiles = () => TEST_TIERS.map((e) => e.file);

/** 查某文件的层级；未登记返回 undefined */
export const tierOf = (file) => TEST_TIERS.find((e) => e.file === file)?.tier;

/** 判定源码是否 import playwright（与 `sweep-shard.mjs` 的 e2e 标记同口径） */
export const isPlaywrightSource = (src) => /from\s+['\"]playwright['\"]|import\(\s*['\"]playwright['\"]\s*\)/.test(src);

/** 静态 `test(` / `it(` 调用点计数（含 `t.test(`；预算与守卫共用同一口径） */
export const countTestCases = (src) => (src.match(/^\s*(?:await\s+)?(?:test|it|t\.test)\s*\(/gm) || []).length;

/**
 * 比较磁盘文件与登记表，返回 { missing, extra, duplicates }；
 * 纯函数（便于守卫以人为构造的差集自检，证明比较器不是恒真）。
 */
export function diffTiers(diskFiles, entries = TEST_TIERS) {
  const registered = entries.map((e) => e.file);
  const seen = new Set();
  const duplicates = [];
  for (const f of registered) {
    if (seen.has(f)) duplicates.push(f);
    seen.add(f);
  }
  const disk = new Set(diskFiles);
  const missing = [...disk].filter((f) => !seen.has(f)).sort();
  const extra = [...seen].filter((f) => !disk.has(f)).sort();
  return { missing, extra, duplicates: [...new Set(duplicates)].sort() };
}

/** 从 npm script 里解析显式 `test/xxx.test.mjs` 清单（与 `doc-consistency::S16` 同口径） */
export const parseScriptFiles = (cmd) => (String(cmd).match(/test\/[A-Za-z0-9_.-]+\.test\.m?js/g) || [])
  .map((x) => x.replace(/^test\//, ''));
