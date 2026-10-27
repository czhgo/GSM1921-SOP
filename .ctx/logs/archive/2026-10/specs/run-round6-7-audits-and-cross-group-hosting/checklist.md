# Checklist

## 跨组承办（Task 1–4）

- [x] `organizingScope` 生产路径只产出 `party-group` / `branch`；`docs/src` 与 `server/routes` 中已无 `organizingScope: 'cross-group'` 写入（grep 0 命中）
- [x] 旧数据迁移 v10 后：`cross-group` 全部归一为 `party-group`；有承办组的保留，无承办组的标 `legacyHostGroup`；重复执行结果不变（`db-migration` v10 用例通过；演示库实测归一 14 条）
- [x] 支书创建非支部级活动未选承办组时无法提交，提示可懂；提交后落库 `organizingScope='party-group'` ＋ `hostGroupId`
- [x] 支书勾选「跨组招募」后：`recruitmentScope='cross-group'` ＋ 协调人＝本支部组织委员；`organizingScope` 仍为 `party-group`
- [x] 组织者选择器默认只列承办组成员；切「显示全部成员」选他组时必填说明
- [x] 直连 API：他组组织者且无 `organizerExceptionReason` → 400；带说明 → 201 且留痕（`activity-party-group-assignment` 新用例）
- [x] 外部调用方仍传 `organizingScope='cross-group'` 时服务端归一为 `party-group` 并在响应回写（新用例：201 ＋ 回写）
- [x] 任意页面展示该活动时显示「承办党小组：X」与「跨组招募 N 人（组织委员协调）」，`docs/src` 无「跨组承办」文案
- [x] 组织台补选历史 `legacyHostGroup` 活动后写 `party-group`，且补选前不能保存
- [x] 跨组深参无招募标记 / 无协调人时仍被拒绝（`cross-group-recruitment` 全绿）

## 第六轮：脏乱繁（此地无银）

- [x] 审查使用 ≥3 个前端设计 skill，并行 ≥3 路且各带独立 lens（报告写明 4 路与交叉验证规则）
- [x] 报告逐条给 `文件:行号` 与「删掉后是否仍能完成动作 / 理解代码」的判断
- [x] 报告含 sample-diff 表（AI 假设 → 支书意图 → 偏差类型 → Boolean 规则）
- [x] 代码注释类：复述代码字面、自证「不是 bug」、解释显而易见行为的注释已删除或压成一句「为什么」
- [x] 界面文案类：同义重复、导语重复标题、按钮旁解释「点击即可…」的句式已删或改为控件
- [x] P1/P2 本轮已修（P2 两处按禁区/立项转 `B-502-3`）；P3 已登记 `CLAUDE.md` 乙部
- [x] 相关静态守卫（copy-length / copy-master / copy-fold / copy-screen / dead-selector / small-text）通过

## 第七轮：数据生命周期

- [x] 空值清单覆盖「字段 × 屏幕 × 写入口」，13 条逐条给出处置与理由
- [x] 不存在「长期显示未填写且无任何写入口」的字段；在册备注改为「随状态变更时必填」、阶段起始日缺失不渲染、可派生项从 `memberChangeRequests` 派生
- [x] 「有入口但读侧不刷新」类问题按缺陷修复（账号重命名端点同步主键 / 会话 / JSON 引用；学号改只读）
- [x] 工作流相关硬编码（角色/状态集合、人数、页签数、时限、日期阈值、支部 id）已改为单一源或现算；「缺省支部」151 处 / 44 文件替换 ＋ 新守卫
- [x] mock 与种子随代码同批更新（`enrollYear` 进 mock 与 `seed-manifest`，parity 4/4）；无「为迁就旧 mock 改产品逻辑」
- [x] 旧审计报告逐条回读：已消解项标注并给证据；`u_*` 一条按证据修正原判（系统账号保留）
- [x] 报告含 sample-diff 表；P1/P2 本轮已修（`overdue` 现算、状态集合单一源、补课文案参数化等），P3 登记 `B-502-4`

## 遗留与后续轮次

- [x] `CLAUDE.md` 乙部更新：本轮未完成项 `B-502-3…7` ＋ 第八轮「最小三成本」`B-502-1` ＋ 第九轮「功能与美观＋全栈数据结构」`B-502-2`
- [x] 涉及制度口径 / 权限边界 / 跨角色行为的决定有 `AskUserQuestion` 记录（四问四答），并落 `D-826` / 执行日志
- [x] 本轮没有把「已解决」的旧审计项重复当新问题修（R7 报告「已消解（附证据）」节）

## 文档与台账

- [x] `SECRETARY_DIRECTIVES.md` P-018 补 2026-10-22 原话与「跨组不是第三落点」
- [x] `DECISION_LOG` 新增 `D-826`（含原话、边界、迁移口径），四处计数同步为 98 条 / 止于 D-826
- [x] `DATA_MODEL.md §2.1/§2.3` 与实现一致；`README-server.md` 路由计数 87/89/202、迁移 v10 与行号引用同批改准
- [x] `ENGINEERING_ASSESSMENT §四`、`TIMESTAMPS`、执行日志批次 502 同批刷新
- [x] 版本戳已 bump 到 `20261022c` 且 `version-stamp` 绿

## 验证

- [x] 定向测试：跨组 / 活动创建 / 工作组 / 迁移 / 权限门 / 账号重命名相关文件全绿
- [x] `npm run test:daily`：1396 / 1396 通过
- [x] `SWEEP_SHARD=all`（带 `DISABLE_PASSWORD_CHECK=1` / `DEMO_READONLY=0`）：node 1398 / 1398 · e2e-A 57 + 1 skip · e2e-B 179 / 179，0 失败（1171.8s）
- [x] `doc-consistency` / `doc-line-ref` / `frontmatter-freshness` / `timestamps-note-guard` / `link-integrity` / `version-stamp` 61/61
- [x] 已提交（不 push），提交信息含 Why / What / Verification / Boundaries
