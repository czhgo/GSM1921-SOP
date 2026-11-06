# Checklist

## 口径与对账

- [x] 第八轮全文使用「信息成本 / 操作成本 / 适应学习成本」；「维护成本」只作为工程维度并指向 `ENGINEERING_ASSESSMENT §2.4`
- [x] `CLAUDE.md B-502-1` 的措辞已改准，不再出现「学习/使用/维护」三成本混用
- [x] 旧账对账表覆盖 Round 2（36）＋ R5-B/C（45）＋ R6 P3（21）＋ R7 P3（23）＋ 相关 `B-500/B-502` 项
- [x] 每条旧项有「已消解（附 `文件:行号`）/ 仍存在 / 已裁不做」三态之一；已消解项未被重新当新问题
- [x] 新发现使用 `R8-*` 编号并写明与旧号的关系

## 第八轮实测与修复

- [x] 支书建活动实测给出：点击数 / 跳转数 / 是否需读说明 / 是否 403 / 落库与回看结果
- [x] 纪检确认考勤实测给出：从待办进入是否带 id、是否需要二次定位目标行、确认后是否可回看
- [x] 材料页全站只有一个可见名（「材料与归档」），`材料闭环` 仅存在于历史日志或已删除
- [x] 纪检待办跳转带 `focusActivityId` / `recordId` 并高亮目标行；未命中才 toast
- [x] 材料页步骤条每一步都有对应控件或明确动作，不存在「进行中但零控件」
- [x] `function-catalog` 的导航路径与真实入口一致，`catalog-sync` 新增断言通过
- [x] 页签总数只由注册表现算；`README*` / `page-sweep` 不再各写一份
- [x] 建活动入口统一为「写入活动」；只读下钻不渲染该按钮；找不到顶栏按钮时有直接打开表单的兜底
- [x] 活动详情标题下有「下一步」动作行（按角色 1 主 2 次），材料入口并入

## 数据结构（只诊断＋不改 schema）

- [x] 权威源 / 派生口径矩阵覆盖至少 12 个业务事实，每行含「权威表字段 / 写口 / 读口 / 派生或存储 / 跨支部归属 / 权限门 / 现有守卫」
- [x] schema 方案单列（Todo `branchId`、分页与索引、宽表拆分触发条件），明确「本轮不实施」
- [x] 种子修复不再回滚 `assignments / agenda / isBrand / brandName / members`；有「repair 前后运行时字段逐字节不变」测试
- [x] 专班报名审核通过后，`workgroup_members` 主源可见；代录贡献写 `workgroup_outputs`；旧镜像只读
- [x] 活动创建 / 编辑 / 归档 / 删除四处同事务同步工作组；归档后工作组为 `archived`，成员/任务/产出写口拒绝
- [x] 首页工作组进度在 API 形态下不再恒为「任务 —」；未装载显示「加载中」
- [x] 本轮没有任何迁移/schema 改动；`db-migration` 版本仍为 v10

## 功能与美观

- [x] 通知发布失败时不出现成功提示，原位 `role="alert"` ＋ 重试
- [x] 上报党委提交中禁用；失败保留已填内容并给可恢复提示
- [x] 首页活动行、考勤统计卡、归档条目、「我的处置」卡：键盘 Tab 可达，Enter/Space 等效
- [x] 工作台刷新路径的 tab 异常显示统一错误卡（不再只 `console.error`）
- [x] 材料 / 个人档案 / 设置首屏有 `aria-busy` ＋ 最小骨架
- [x] 党委页内 H1→H2、设置卡头 H2→H3；全站 H1 唯一
- [x] 卡片无 `hover:shadow-*` / `hover:-translate-y-*`
- [x] 删除动作使用 `.btn-danger`；编辑使用 `.btn-outline`；独立页返回按钮可见
- [x] `transition-all` 已按屏收敛为颜色/透明度/位移（`ui-motion-guard::M2` 实测 0 处剩余）
- [x] 帮助注释统一 `.help-note` / `.help-note__link`（未迁移 9 处已列于 `B-503-6`）
- [x] 登录错误 `role="alert"` ＋ `aria-invalid` ＋ 聚焦首错
- [x] 名册新增字段级错误（`aria-invalid` ＋ 聚焦首错）
- [x] 「先定语法再铺开」：只动 2–3 个共享载体，未做 62 tab 全站动效

## 边界与待裁

- [x] 未删除任何「代录 / 兜底 / 监督 / 审批留痕 / 知情查看」入口；每条拟合并项都有五类正当性判定
- [x] 登录页品牌渐变、首页 hero 党徽、同名页签后缀、支书台改名四项单列待裁，未自行改
- [x] 本轮未改 schema / 索引 / 宽表；未重审 R6/R7 已消解项

## 验证与交付

- [x] 新增守卫：写口失败不得提示成功（F9）、可点非原生控件必须键盘可达（F8）、卡片不得 hover 阴影/上浮（M1/M2）（至少各 1 条）
- [x] 新守卫已登记 `test-tier-registry`，预算只降不升（文件 218 / 断言 1409，均写明理由）
- [x] 定向测试全绿
- [x] `npm run test:daily` 全绿（1412 / 1412）
- [x] `SWEEP_SHARD=all`（带 `DISABLE_PASSWORD_CHECK=1` / `DEMO_READONLY=0`）三通道 0 失败（node 1414 · e2e-A 57+1skip · e2e-B 179 · 1079.4s）
- [x] `doc-consistency` / `doc-line-ref` / `link-integrity` / `timestamps-note-guard` / `frontmatter-freshness` / `version-stamp` 全绿（61 / 61）
- [x] 版本戳已 bump（`20261022d`）；执行日志批次 503（Why / What / Verification / Boundaries / sample-diff）已落
- [x] 已提交（不 push），提交信息含 Why / What / Verification / Boundaries
