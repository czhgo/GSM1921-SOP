# Checklist

- [x] 首页（`docs/index.html`）不再出现「本系统面向各类党支部与学生组织……」平台化小字，支部名与其余版面结构完整（真机：`tagline=false`；支部名下方直接接「重要通知」）
- [x] 帮助页（`docs/help.html`）不再出现该小字，正文其余内容不变（真机：`tagline=false`；「GSM1921-SOP · 系统说明书」一行保留）
- [x] 关于页（`docs/src/entries/pages/about-entry.js`）不再出现该小字，hero 其余内容（「从入党申请人到正式党员」「以本支部为例」）保留（真机：`tagline=false`）
- [x] 全仓 `docs/` 内「本系统面向各类党支部与学生组织」零命中（`.ctx/logs` 历史留痕除外）
- [x] `docs/src/data/mock/activities.js` 中 `act-36` 的 `status` 为 `'published'`，其说明注释与状态自洽（不再写「已举办」）
- [x] `act-37`（10-22）保持 `'published'` 不变，与 `act-36` 同处「未完成」分组
- [x] 生命周期派生正确：`act-36` 不判为 `executed` / `pending_archive`（真机首页活动列表实测徽章＝**已发布**）
- [x] 归档库「已结束」口径不含 `act-36`（真机：归档库最新归档止于 2026-08-12，无「党建思想学习会」；活动风采亦不含它）
- [x] `server/test/copy-master-guard.test.mjs`：`about-entry.js` 基线条目已收档，`BASELINE_FILE_COUNT`=8、`BASELINE_TOTAL`=10，N3 下限同步为 8 / 10，且 N1–N4 全绿
- [x] 收基线正当性（非空转）：about-entry.js 现零重合命中，若保留其基线条目即触发 N3 的 `emptied` 断言（「重合已清零却仍在 BASELINE ⇒ 判红」）——由守卫既有断言按代码逻辑成立；改后 N1–N4 实测 4/4 绿
- [x] 因删除行产生的行号引用漂移已全部改准：`doc-line-ref` R1–R6 全绿、`doc-consistency` S1–S18 全绿（README-server.md 未引用被删行，无需平移）
- [x] 连带修复工作区既存的决策日志缺口：`2026-10-DECISION_LOG.md` 补回 `D-810` 节 ＋ 本月目录 `D-810` 行，并登记本批 `D-811`（四处计数同源：文首 / 续编说明 / 本月目录 / 月度索引）；`doc-consistency::S14` 由红转绿
- [x] 全站版本戳已 bump（`node docs/scripts/bump-version.mjs` → `20261011b`，`CODE_VERSION 421 → 422`），陈旧戳自检 0 处残留
- [x] 回归档全绿且 ≤ 时长纪律：全量档 `npm run test:full` = `[node]` 797/0 ＋ `[e2e-A]` 58/0 ＋ `[e2e-B]` 164/0 ⇒ **1019/0**，**1025.3s（≈17.1min ≤ 20min）**
- [x] 真机复核：首页默认月 2026-10、两活动条 `act-36`(15) / `act-37`(22) 均在；重要通知含十月两条；归档库不含 `act-36`；首页/帮助页/关于页无平台化小字；控制台无 pageerror
- [x] 待办页逾期计数如实核对：显示 13 / 10 / 39 条逾期（系 7 月复盘·考勤·考察等**真实派生积压**，**2026-10-11 支书裁定「既然是真实数据，这些内容都应该计算出来才对呀」⇒ 保留**）；**种子待办本身无过去截止**（守卫 G3 绿）
- [x] 已 commit（**不 push**）：批次 441（`D-811`）commit `e58493260`（353 files）；`git status` 干净
