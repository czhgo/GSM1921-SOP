# Checklist

## 文档落地（对应支书第 1 条）

- [x] `DATA_MODEL §2.9` 与现行实现一致：`kind` / `targetType+targetId` / `reads[]` / `archivedBy[]` / `archived` / `replyTo`；全文无 `targetModule` 与全局 `read` 残留
- [x] `DATA_MODEL §2.19` 的已读字段与待办幂等键（含 `role/personId`）与代码一致
- [x] 四组页签名在 `DESIGN_SYSTEM` / `ARCHITECTURE` / `MODULE_UI_DESIGN` / `help.html` 全部为「总览 / 我的职责 / 协作与知情 / 制度与答复」，无旧名残留
- [x] `DESIGN_SYSTEM §10.7` 承载面表含「消息」行（列表 `messages.html`、全貌 `notice.html?id=`）
- [x] SD-37 / SD-38 / SD-39 存在，且每条都有守卫或人工检查点；SD-34 含「已读≠回执」三条判据
- [x] `PRODUCT_IA.md` 存在，页签集合与 `function-catalog.js` 完全一致，且 `DOC_MAP` / `04 README` 登记为派生索引
- [x] `help.html` 的分组名、默认视图、知情查看分段、活动管理页头四处漂移已修正

## 术语体系（对应支书第 4 条）

- [x] `TERMINOLOGY.md` 是唯一术语定义源；每条含 9 字段（词条/定义/层级/上位下位/允许并列集/禁用写法/权威文档/代码键/合法别名）
- [x] 首批 18 个词条齐备：活动、专班、项目、工作组、活动工作组、专班工作组、党小组、组织者、深度参与者、分工、考察、能力包、模块、流程块、产出块、授权、报名、会议
- [x] `OPERATIONS_GUIDE §19` 与 `sop/INDEX.md` 术语段只含指针，不含第二份定义
- [x] H-T1 并列组层级一致：`{workgroup,taskforce,group}` 判红，`{activity,taskforce}` 与 `{workgroup(activity),workgroup(taskforce)}` 合法
- [x] H-T2 页签名覆盖段集合：「专班动态」含工作组段判红
- [x] H-T3 结构性标签登记：tab/分段/表头/facet/option 中文名词命中术语表；存量收基线，新增即红
- [x] H-T4 废弃写法零残留：`项目组`、`协作组`、`活动项目赋权`、`专班负责人`、`会议活动` grep=0（否定句/判例豁免）
- [x] 四条 Harness 均能故障注入报红（手工改一处验证），不是空转

## 组件契约（对应支书第 2 条）

- [x] `Disclosure`（details/summary）与 `MenuButton`（button+aria-expanded+aria-controls）组件存在并被调用
- [x] 交互元素内标题为 0：`button` / `summary` / `role=button` 内无 `h1..h6` 与 `role=heading`
- [x] 4 处标题嵌套已修：活动查询、work-overview「我已处理」、待答复与未读通知、活动风采卡
- [x] 4 个 `div` 伪开关全部升级为原生可聚焦控件：成员复盘、组长复盘、组内复盘、动态高级筛选
- [x] 所有阅读型折叠状态可静态回读（`open`）；所有菜单有 `aria-expanded` + `aria-controls`
- [x] 同一文件同类折叠只用一种原语（守卫可判）
- [x] 菜单、折叠、浮窗三类各有唯一实现，不再出现「同一动作 button 与 summary 各写一套」

## 同屏一致（对应支书第 2、4 条）

- [x] 三个样板屏（活动管理 / 知情查看 / 支部分工）的折叠头同字号、同 chevron、同内边距
- [x] 三屏的分区头、行内动作、计数、说明各自只有一档样式
- [x] 说明文字一律后置；同一句 ≥15 字不在同屏出现两次
- [x] 活动管理统计条不再混入「党小组组长」这个组织域指标

## IA 62 → 45（对应支书第 3 条）

- [x] 页签总数精确为 **45**（`function-catalog.js`、`PRODUCT_IA.md`、`help.html`、`doc-consistency` 四处一致）
- [x] 活动管理：查询并入日历工具栏；无 `#query-toggle` / `#query-collapsible`；「新建党小组活动」预置 `direction:'bottom-up'`
- [x] 赋权：活动管理无 `#cal-activity-auth-host`；专班赋权在组织台；`#tf-auth-panel` 深链有重定向
- [x] 知情查看：一级只出现「活动工作组 / 专班工作组」；「其他党小组」独立区；支书/组长/成员三处无同层混排
- [x] 5 台「我的处置」已并入待办「我经办的反馈」，旧深链重定向且有可见说明
- [x] 成员「我的成长」含思想汇报 / 我的考察 / 我的复盘三个子区，旧深链可达
- [x] 每个删除页签都满足三件齐备：新落点 + 深链重定向 + help 更新
- [x] 无空页、无死入口（page-sweep / link-integrity 全绿）

## 守卫与文档

- [x] 新增守卫文件 ≤1；其余为扩展
- [x] `catalog-sync` 能因 IA 地图与页签集合不一致而红
- [x] `page-title-guard` 能因标题进入交互元素而红
- [x] `docs-governance-guard` 承载术语四条与折叠断言，且非空转
- [x] `CASES.md` 增 CASE-DESIGN-017/018/019；`CASES_INDEX` 同步
- [x] sample-diff 五列（样本 / AI 假设 / 人类意图 / 泛化规则 / 守卫）已写入判例库与执行日志
- [x] 技能更新限制已如实登记（18 个更新、网络克隆失败），未把旧版技能当最新

## 验证

- [x] 定向守卫全绿（术语 / 组件 / IA / doc / link / page-sweep）
- [x] `npm run test:daily` 全绿
- [x] `SWEEP_SHARD=all` 三通道 0 失败，墙钟 ≤1200s
- [x] 版本戳 bump；中文提交（不 push）
