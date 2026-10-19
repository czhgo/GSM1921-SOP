---
title: "信息架构批判性专项审查报告（脏乱繁 × 最小三成本）"
type: audit_report
role: "[工程师]+[AI]"
last_updated: "2026-10-19"
status: active
related_files: [.ctx/IA_INVENTORY.md, .ctx/IA_LINK_TRUTH.md, .trae/specs/audit-information-architecture-critical/spec.md]
---

# 信息架构批判性专项审查报告

> 口径：先问「该不该存在」，再问「好不好」。六路 lens 各自只加载一个视角、不互读报告。
> 矩阵：`.ctx/IA_INVENTORY.md`（7 台 / **修复前 67 tab → 修复后 62 tab**；审查时读数 100 卡片 / 124 链接 / 28 深链，修复后重跑为 91 卡片 / 117 链接 / 20 深链）。
> 链接真值：`.ctx/IA_LINK_TRUTH.md`。

## 一、六路结果

### Lens A — Tab 必要性（IA-A）

| 编号 | tab | 结论 | 证据 | 建议 | 严重度 |
|---|---|---|---|---|---|
| IA-A01 | 纪检台 `tf-view` | 删除（常态空壳） | 矩阵 L45；`disc/tf-view-tab.js:25-35`；`work-map.js:339-347` | 旧 id 别名→`calendar`；`taskforceId` 落 `taskforce.html?id=` | 高 |
| IA-A02 | 宣传台 `tf-view` | 删除/并入 `kanban` | 矩阵 L100；`prop/tf-view-tab.js:22-33`；`ws-prop-commissioner-entry.js:31-52` | `?tab=tf-view`→`kanban` 别名 | 高 |
| IA-A03 | 组长台 `tf-view` 的活动段 | 合并到 `calendar` | 矩阵 L60；`leader/tf-view-tab.js:25-28`；`shared/activity-calendar-tab.js:11-15` | 保留 tab（`group` 独有），`views=['group']` | 中 |
| IA-A04 | 组织台 `tf-view` | 并入 `taskforce` | 矩阵 L76；`org/tf-view-tab.js:30-58`；`org/taskforce-tab.js:68-91` | `taskforce` 加「我参与的」筛选；旧 id 别名 | 中 |
| IA-A05 | 党委台 `monitor` | 并入 `branches` 或去重列 | 矩阵 L84/L86；`monitor-tab.js:36-58`；`branches-tab.js:128-158` | 待批复列迁 `branches`；注意隐私边界 | 中 |
| IA-A06 | 党委台 `governance-overview` | 并入 `review` + `branches` | 矩阵 L82；`party-overview.js:2-14`；`review-tab.js:51-61` | 删 tab，`defaultTab=review`；旧 id 别名 | 中 |
| IA-A07 | 宣传 `kanban` 归档桶 | 并入 `archive` | 矩阵 L98-99；`kanban-tab.js:48-77,153`；`archive-tab.js:73-97` | 看板只留进行态；「去归档」改 `?tab=archive` | 中低 |
| IA-A08 | 成员台 `projects` / `tf-view` | 保留，统一专班落点 | 矩阵 L127-133；`ws-visitor-entry.js:68-73` 与 `taskforce-list.js:57` 冲突 | 专班统一落 `tf-view`；`projects` 收窄「我的」 | 中 |

**总量影响（若全采纳）**：67 → 60 tab（纪检 9→8、宣传 9→8、组织 11→10、党委 5→3）。保留：`today/todo/overview`、`work-map/group-progress/committee-meeting`、五台 `my-dispatch`、组织 `roster/talent/member-flow` 等。

### Lens B — 卡片必要性与阅读顺序（IA-B）

| 编号 | tab | 问题 | 证据 | 建议 | 严重度 |
|---|---|---|---|---|---|
| IA-B01 | 六台 `today` | 「活动管理」写入口塞进「我的日程」只读卡 | `today-tab.js:401-408,628-638` | 活动管理条移到页头；只留一个写 CTA | 中 |
| IA-B02 | 六台 `today` | 「我的日程」与「近期安排」两卡同属一条时间轴 | `today-tab.js:628-638,388-421` | 合并为一张「日程」卡，两段头 | 低 |
| IA-B03 | 支书 `group-progress` | 归档性「变更留痕」插在决策信息「跨组进展」之前 | `group-progress-tab.js:137-143,336-348` | 留痕下沉到清单底部折叠 | 低 |
| IA-B04 | 支书 `group-progress` | 展开后 8 卡，四卡并列只读 | `group-progress-tab.js:371-388` | 选组改筛选条；汇报+复盘、活动+考勤各并一卡 | 中 |
| IA-B05 | 支书 `calendar` | 同一批活动三处呈现，两个写入口 | `calendar-tab.js:196-204,255-257,400-405` | 党小组活动降为筛选分面；删重复 CTA | 中 |
| IA-B06 | 支书 `calendar` | 「待赋权活动」纯展示、不可点 | `calendar-tab.js:168,268-285,220-221` | 可点锚点直达页尾赋权卡 | 低 |
| IA-B07 | 宣传 `archive` | 展示区插在动作区之间；模板卡沉底 | `archive-tab.js:75-118` | 待归档/初稿前置；展示合并下沉；模板进帮助 | 中 |
| IA-B08 | 宣传 `tasks` | 终态「已提交」与两个行动列等权 | `tasks-tab.js:61-90,221-240` | 已提交折叠/下沉 | 低 |
| IA-B09 | 宣传 `kanban` | 「待归档」与归档页重复，排在进行态之后 | `kanban-tab.js:68-86`；`archive-tab.js:85,91` | 只留汇总+链接，或前置 | 中 |
| IA-B10 | 纪检 `review` | 同一批复盘拆成两张并列卡 | `review-tab.js:118-119,193-227` | 并一张「复盘监督」卡，状态分面 | 中 |
| IA-B11 | 组织 `talent` | 纯展示「参与汇总」居中，写动作「录入考察」沉底 | `talent-tab.js:219-240,110-120,299-309` | 录入考察提为卡头 CTA；参与汇总下沉 | 中 |
| IA-B12 | 组织 `roster` | 统计卡与列表卡分离，低频导入常驻 | `roster-tab.js:138-167,296-309` | 统计并入列表卡头；导入下沉 | 低 |

### Lens C — 链接真值（IA-C）

| 编号 | 链接 | 现状 | 正确落点（分角色） | 严重度 |
|---|---|---|---|---|
| IA-C01 | 材料页「考勤」 | 一律 `disc.html?tab=attendance` | 纪检→disc+activityId；组长→leader；成员组织者→visitor；支书→只读+交接 | P1 |
| IA-C02 | 材料页「考察」 | 一律 `disc.html?tab=inspection` | 纪检→disc；组长→leader；成员→visitor；组织→org talent；支书/宣传→只读 | P1 |
| IA-C03 | 材料页「复盘」 | 一律 `visitor.html?tab=review` | 成员组织者→visitor；组长→leader members；纪检→disc review；支书→group-progress | P1 |
| IA-C04 | 材料页「宣传材料」 | `prop.html?tab=archive` | 仅宣传委员可进；其余角色纯文本交接；宣传补 highlight/focus | P1 |
| IA-C05 | 材料页四行 | 全部无对象参数 | 新增 `focusActivityId` 契约，目标 tab 预选本场 | P1 |
| IA-C06 | 成员台「考勤管理/打回确认」 | 落 `leader.html?tab=attendance` | 普通成员组织者→本台 `?tab=attendance#host`；组长→leader | P1 |
| IA-C07 | 支书概况「去宣传台查看」 | `prop.html?tab=archive` | 本台 `?tab=todo` 代归档，或纯文本 | P2 |
| IA-C08 | 首页党委活动/专班 | `party-committee.html?activityId=` | 党委无消费→`activity.html?id=` 或 `monitor&branchId=` | P2 |
| IA-C09 | 未登录活动/专班 | `login.html?activityId=` | 登录保留 `next`，登录后回对象 | P2 |
| IA-C10 | 材料页「返回」 | 固定活动详情 | 按 referrer 回原台原 tab；区分文案 | P3 |
| IA-C11 | 材料页可见性 | 只校验登录+存在 | 复用 `isActivityVisibleTo`，待批活动不可见 | P2 |
| IA-C12 | 活动详情「材料闭环」 | 对所有角色无条件渲染 | 仅组织者/支委/宣传显示；普通成员只读或隐藏 | P3 |

### Lens D — 跨角色协作（IA-D）

| 编号 | 动作 | 断点 | 建议 | 严重度 |
|---|---|---|---|---|
| IA-D01 | 考察确认 | 上传人可自确认；不落确认人 | 确认白名单纪检/支书/副支书，禁止自确认，落 `confirmedBy` | 高 |
| IA-D02 | 打回态 | 纪检显示「已打回」，其他台仍「待确认」 | 抽 `returned` 派生态，全台统一 | 高 |
| IA-D03 | 支书复核 | 源头台仍显示终态，支书台待复核 | 增加「待支书复核/已复核」第三态 | 中高 |
| IA-D04 | 自动交接 | auto 类型仍派生接收方待办，确认返回 false | auto 不派生待办；toast/badge 改写；confirm 幂等 | 高 |
| IA-D05 | 宣传归档 | 宣传自行到 archived，支书审阅事后可选 | 增加送审态与回执，或明确取消审阅 | 中高 |
| IA-D06 | 会议考勤 | 纪检自传自确认 | 上传统一 `recordedBy:null`，另一支委确认；或明确录入即确认 | 高 |
| IA-D07 | 出勤/已补 | 两端都不确认，界面标已确认 | 明确自动确认地位，支书复核兜住 | 中高 |
| IA-D08 | 组织委员考察 | 页面说可传，服务白名单不含组委 | 纳入 `INSPECTION_ROLE_WRITE` 或封掉直写 | 高 |
| IA-D09 | 考察交接 | 接收方只看到专班类一半 | 组织台补活动类只读段，或按 sourceType 拆单 | 中高 |
| IA-D10 | 成员台考勤/考察 | 个人只读与组织者上传同页混装 | 分区 + 角色 chip | 中 |
| IA-D11 | 「提交至支委会」 | 实际 `to=组织委员`，支书台无收件箱 | 文案改「提交组织委员」；补只读台账 | 中 |
| IA-D12 | 专班复盘 | 提交无通知/无待办，组织台无结果回显 | 派生纪检待批注；组织台回显 reviewStatus | 中 |

### Lens E — 最小三成本（IA-E）

| 编号 | 任务 | 当前成本（估） | 建议后 | 严重度 |
|---|---|---|---|---|
| IA-E01 | 支书查活动 | 3 点击/2 屏；首屏 4 历史统计字段；「活动」7 次 | 2 点击/1.5 屏；统计下沉，党小组活动并台账 | 中 |
| IA-E02 | 六台汇报/答复 | 4 读入口/2 写入口；5 台有跳转死路 | 并「待办收件箱」两栏；今天/概况只留计数 | 高 |
| IA-E03 | 组织录入考察 | 2 点击/2 屏；写动作沉底折叠 | 卡头 CTA；1 点击/0 屏 | 高 |
| IA-E04 | 组织查人 | 跨 3 tab/3 屏/3 搜索框 | 名册行内深链到发展/流动；人才库加流动深链 | 中 |
| IA-E05 | 纪检确认考勤 | 两级切换；4 点击/2 跨 tab | 删二级切换；确认 3 点击/1 跨 tab | 中 |
| IA-E06 | 考察/复盘链路 | 跨 4 台；2-3 跨台；4-5 点击 | 一条状态条；纪检前置待确认 | 中高 |
| IA-E07 | 宣传归档 | 8-9 区块/3-4 屏；两个「待归档」 | 一条优先队列；展示下沉；1 屏 | 高 |
| IA-E08 | 党委批复 | 总览/上报重复；任命跨页 | 预览行原地批/驳；任命行内浮窗 | 中低 |
| IA-E09 | 组长打回确认 | 被本组明细压到卡底 | 打回/补课前置；明细下沉 | 中 |
| IA-E10 | 成员考勤异议 | 首屏历史出勤率；提交无回执；空态不指路 | 出勤率一行+待我处理；回执+CTA | 中 |

### Lens F — 数据与路由真值（IA-F）

| 编号 | 参数/链接 | 真值结论 | 建议 | 严重度 |
|---|---|---|---|---|
| IA-F01 | `review&highlight=<rq>` | 壳先清参，页面读 URL 恒空 | 改读 `ctx.navTarget.hl`；失败给提示 | 高 |
| IA-F02 | `thought-review&highlight=<tr>` | 页面不消费，矩阵无锚点 | 通知改落 `thought-report.html?id=` 或补 `data-tr-id` | 高 |
| IA-F03 | `todo&highlight=<mcr>` | 待办不消费，聚合键不同 | sourceId 传 groupKey 或补 `data-mc-request-id` | 高 |
| IA-F04 | 成员变更通知 | 无受众→全站广播 | 补 `audience/actionRoles` | 高 |
| IA-F05 | 作废裁决通知 | 受众可能是委员，落点固定支书台 | 按 `row.role` 生成对应工作台落点 | 高 |
| IA-F06 | `targetUrl` 与 `targetType` 并存 | `targetUrl` 永不生效 | 明确优先级或删 `targetUrl` | 中 |
| IA-F07 | `todo&highlight=<groupKey>` | 页面不消费；`roleMap['*']` 可落 `index.html?tab=todo` | 仅 workspace 加 `tab=todo`；补 highlight 消费 | 中 |
| IA-F08 | `tab` 被支部配置隐藏 | 静默回退到默认 tab，无提示 | 内容区可见提示+替代落点 | 中 |
| IA-F09 | `highlight` 无类型 | 值域混杂；未清理定时器 | 加 `highlightType`/前缀；3s 清理 | 中 |
| IA-F10 | `id/activityId/branchId` | 同名异义；详情页不收别名 | 固定契约；详情页收别名并归一 | 中 |
| IA-F11 | `branchId` 筛选 | 空值被 `||` 回退，mock 不能清除 | `Map.has` 区分；空值删 URL | 中 |
| IA-F12 | 跨台 `prop/disc/visitor` 链接 | 目标页对当前角色不可达，被弹回 | 按角色渲染本位入口/纯文本交接 | 高 |

## 二、共识

1. **最大浪费不是卡片数量，而是同一任务多入口 + 首屏历史统计**：E02/E07/E03/E01 四项即可去掉约 4 个重复入口、3 条历史统计条、6 个首屏区块。
2. **链接真值系统性断裂**：材料闭环四条链接 + 支书概况「去宣传台」+ 成员台「考勤管理」都是角色无关链接，目标页门禁会把用户弹回自己台并丢失上下文（C01-C07、F12）。
3. **`highlight` 协议没有闭环**：壳先清参、页面读 URL、实体类型不区分、定时器不清理；F01/F02/F03/F07/F09 是同一根因。
4. **Tab 重复集中在 `tf-view` 与党委总览**：纪检/宣传空壳、组织重复入口、党委 monitor/governance-overview 与 review/branches 重叠。
5. **卡片阅读顺序普遍“历史在前、行动在后”**：B03/B07/B11 最典型；首屏应先主行动/最高优先级决策。
6. **跨角色交接缺“确认人”与“回执”**：考察/会议考勤自确认、auto 交接反向待办、归档无送审、专班复盘无反馈（D01/D04/D06/D08/D12）。

## 三、分歧（保留原样）

1. **Tab 删除 vs 既有裁定**：A01/A02/A04/A05/A06 与 D-755、D-807④、立项⑦、2026-09-14「id 保留 tf-view」有冲突；删除前需支书逐项确认。
2. **卡片合并 vs P2-7/批次 373**：B04 四卡合并必须用段头，不能回退卡中卡；B05 党小组活动卡涉及批次 373 定序。
3. **党委 monitor vs branches 隐私边界**：monitor 不暴露成员级记录，branches 行内可展开名册；若边界必须保持，则只去重列、不合并 tab。
4. **宽表卡式化**：IA 可能删/并表，先卡式化会白做；等本报告裁定后再做。

## 四、待裁定（frontier）

1. **Tab 合并/删除**：A01/A02/A04/A05/A06 是否按建议执行？还是只删空壳（A01/A02/A07/A03）？
2. **链接真值**：是否引入 `resolveMaterialHref({role,isOrganizer,actId})` + `focusActivityId` 统一契约，按角色渲染本位入口？
3. **跨角色交接**：是否先修 D01（考察自确认）、D06（会议考勤自确认）、D04（auto 交接反向待办）、D08（组织委员考察写门）四项？
4. **卡片顺序**：先做低风险 B02/B06/B07/B08/B10/B12，还是只做 E02/E07/E03 三个高价值？

## 五、批次建议

- **batch IA-1（先止死链）**：C04、C06、C07、C12；只改链接/显隐，不动结构。
- **batch IA-2（链接契约）**：C05 定 `focusActivityId`，再落 C01/C02/C03；同步 F01/F02/F03/F07/F09/F12。
- **batch IA-3（tab 合并）**：A01/A02/A07/A03 先做不动裁定的；A04/A05/A06 需支书复议。
- **batch IA-4（卡片顺序）**：B02/B06/B07/B08/B10/B12；B01/B03/B04/B05/B09/B11 需复议。
- **batch IA-5（交接）**：D01/D04/D06/D08；D02/D03/D05/D07/D09/D12 随后。
- **batch IA-6（成本）**：E02/E03/E07 三个高价值；其余随版本。

## 六、sample-diff-learning 与裁定（2026-10-19）

### 6.1 五个样本（全部按建议通过）

| 样本 | 人类裁定 | 学到的 Boolean 规则 |
|---|---|---|
| IA-C01 材料页考勤链接 | 按角色拆落点 | AP-IA-01：跨工作台链接必须按角色派生或纯文本交接 |
| IA-A01 纪检 tf-view 空壳 | 删除并别名 | AP-IA-02：稳定空集 tab 删除/合并 + 旧 id 别名 |
| IA-B01 今天日程卡混写入口 | 移出日程卡 | AP-IA-03：读写混装卡拆分，写 CTA 页头唯一 |
| IA-D04 auto 交接派生待办 | auto 不派生待办 | AP-IA-04：auto-confirm 只给只读回执，confirm 幂等 |
| IA-F01 `review&highlight` 壳清参 | 改读 navTarget | AP-IA-05：深链先下发 navTarget 再清参，失败可见提示 |

### 6.2 一次 frontier 裁定

1. **Tab 合并**：五项全做（A01/A02/A04/A05/A06；A03/A07 低风险一并）。
2. **链接契约**：建新契约 `resolveMaterialHref` + `focusActivityId` + `[data-act-id]` + `highlightType`。
3. **跨角色交接**：四项优先 D01/D06/D04/D08。
4. **卡片顺序**：低风险六项 B02/B06/B07/B08/B10/B12。

### 6.3 落点

- 修复 spec：`.trae/specs/ia-critical-remediation/`（spec/tasks/checklist）。
- learned rules：`content/05_ai_coding/PARALLEL_SKILL_AUDIT.md §11.3`；`CLAUDE.md H21.3`。
- 守卫：`server/test/ia-critical-guard.test.mjs`。

## 七、边界

- 本报告只审与出建议；不改生产代码。
- 所有结论均有矩阵行或文件:行号证据；未做真机的标「估」。
- 六路独立，未互读；主代理只汇总共识/分歧/待裁定。
