// role: [工程师]+[AI]
// 支书工作台能力：tab 清单注册（T-304 权限收敛 Q3，与其余 5 工作台对齐）
// 自注册模式（M1 同款）：副作用导入即注册。消费点（薄壳入口）经 getCapabilities({scope:'workspace:secretary'})
// 读取本能力，tab 声明（含懒加载 render）不再硬编码在入口。
// requiredRoles：支书/副支书共用支书工作台（ROLE_PAGE_MAP secretary → secretary.html）
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四/§六

import { registerCapability } from '../core/boot/registry.js?v=20261003f';
import { rolesForPage } from '../core/domain/constants.js?v=20261003f';
import { AuthStore } from '../services/core/auth.js?v=20261003f';

registerCapability({
  id: 'secretary-workspace',
  name: '支书工作台',
  version: '20260829q',
  scope: ['workspace:secretary'],
  requiredRoles: rolesForPage('secretary.html'),
  // 分组主轴（2026-09-14 支书裁定·tab 全盘重设）：按行为性质四组——工作台（核心组）/
  //   我的职责（写操作）/ 知情查看（纯只读）/ 制度与答复（必守与要回），组顺序 = 本数组首次出现顺序；
  //   组内按「增量 > 存量」（产生新数据的写操作在前）。核心组判定单一源 = core/domain/constants.js::isCoreTab
  //   （注册表显式声明 coreTab: true，不由显示标签反推），核心组固定显示、不可隐藏、不参与排序。
  tabs: () => [
    // R6-3「今天」置首 + 登录落点（2026-09-07 方案 B）：共享渲染只读速览，数据同源派生；
    // 到期/逾期行 → onNav('todo')（todo tab 六台同 id）；会议/分工行在 today-tab 内直跳 activity.html；
    // 会议「全部」→ onNav('activities')，下方映射到本台活动承载 tab（支书台=活动管理 calendar；无承载台为空操作）
    { id: 'today', label: '今天', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/today/today-tab.js?v=20261003f').then(m => {
      const el = document.getElementById('secretary-tab-content');
      if (el) m.renderTodayTab(el, {
        personId: ctx?.personId || AuthStore.getCurrentUser()?.personId,
        role: 'secretary', // 待办键对齐本台待办 tab（副支书共台亦按 secretary 待办聚合）
        onNav: (tabId) => {
          // 'my-dispatch'（批次 299「今天」页「待我处理」段）在其余五台＝「我的处置」tab；
          //   支书台无此 tab，待处理汇报的承载处＝「反馈管理」⇒ 此处按台映射（与 'activities'→'calendar' 同法）。
          const target = tabId === 'activities' ? 'calendar' : tabId === 'my-dispatch' ? 'feedback' : tabId;
          const btn = document.querySelector(`.secretary-tab-btn[data-secretary-tab="${target}"]`);
          if (btn) btn.click();
        },
        // 2026-09-25（支书裁「按『党小组与活动』这个名落地」）：党小组 tab 更名并收编党小组活动后，
        //   活动管理的写操作从 tab 名上不再一眼可寻 ⇒ 今日页补「建活动 / 看日历」紧凑入口。
        //   实现单一源 = group-progress-tab.js::openActivityWriteEntry（复用既有「写入活动」入口，不新造表单）。
        onCreateActivity: () => import('../entries/tabs/secretary/group-progress-tab.js?v=20261003f').then(m => m.openActivityWriteEntry()),
      });
    }) },
    { id: 'todo', label: '待办', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/secretary/todo-tab.js?v=20261003f').then(m => m.renderContent(ctx)) },
    { id: 'overview', label: '全局概况', groupLabel: '工作台', coreTab: true, render: (ctx) => import('../entries/tabs/secretary/overview-tab.js?v=20261003f').then(m => m.renderContent(ctx)) },
    // ── 我的职责（写操作） ──
    { id: 'calendar', label: '活动管理', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/secretary/calendar-tab.js?v=20261003f').then(m => m.renderContent(ctx?.appState)) },
    // 2026-10-02 批次 351（支书 `D-741`「按这个方案推进 V-3 页签建议序」）：**组内按动作频次重排**——
    //   支委会（议事留痕）是支书**常态动作** ⇒ 前置；上报党委按需 ⇒ 后移。
    //   （原序：活动管理 · 通知发布 · 上报党委 · 党小组与活动 · 支委会 · 成员流动；**组序与条数一律不动**。）
    // 支委会（2026-09-20 批次 105 · D-526 建「支委会会议」入口；2026-09-27 支委会迁移批改名「支委会」并
    //   承接「机构构成」——判据：支部大会选举支委 → 支委会讨论分工）：顶部「机构构成」（支委身份配置：
    //   组织 / 宣传 / 纪检委员；实现单一源＝assign-tab.js::mountCommissionerAssign），下接「支委会会议」
    //   入口（场次统计 + 直达独立页）；开会链路在 docs/party-committee-meeting.html（提取议程 / 委员表态 /
    //   汇总截止 / 查阅讨论结果）。复用既有实体（活动 + agendaVotes + votesLocked），不新增表；
    //   效力口径已定（线上与线下完全同等效力，D-538），可见范围 / 缺席 / 是否并行线下任务三条由该口径推导、
    //   支书未逐条明答（待确认）。
    { id: 'committee-meeting', label: '支委会', groupLabel: '我的职责', render: () => import('../entries/tabs/secretary/committee-meeting-tab.js?v=20261003f').then(m => m.renderContent()) },
    // 党小组与活动（2026-09-14 批次 25 由「党小组进展」升级为「党小组」；2026-09-25 支书裁「按
    //   『党小组与活动』这个名落地」⇒ label 再改并收编「党小组活动」分区；同日再裁「赋权按对象归位」
    //   ⇒ 收编 情景②（活动项目赋权）。2026-09-27 支委会迁移批：情景①b「支委身份配置」按组织层级迁出
    //   （支部层 → 支书台「支委会」tab），本 tab 只余 情景①a 组长指派（组层）。**id 始终保持 group-progress**
    //   以保住 ?tab= 深链 / 个人 tab 顺序偏好 / 支部 config 的 hiddenTabIds·tabOrder 三类既有键）：
    //   本 tab = 管理区（新增/改名/解散 + 未分组行内归组 + 组长指派，写权支书/副支书）+ 党小组活动
    //   （方向 bottom-up 的活动只读列示、可点进详情，新建复用既有写入入口；含活动项目赋权）+
    //   进展区（原跨组只读知情，功能全保留；2026-09-27 支委会迁移批折叠下沉）
    { id: 'group-progress', label: '党小组与活动', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/secretary/group-progress-tab.js?v=20261003f').then(m => m.renderContent(ctx)) },
    // 2026-09-25 支书裁「赋权按对象归位」⇒ 原「赋权管理」`assign` tab **删除**（`?tab=assign` 同删，不做兼容映射）：
    //   情景① 设党小组组长 / 支委身份、情景② 活动项目赋权 → 本台「党小组与活动」（见下 group-progress）；
    //   情景③ 专班赋权 → 组织委员台「专班管理」。
    { id: 'notification', label: '通知发布', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/secretary/notification-tab.js?v=20261003f').then(m => m.renderContent(ctx)) },
    // P3 党委后台（2026-09-02）：支部关键事项上报党委（发展节点/活动报备；党委批驳结论回传本页）
    { id: 'report-up', label: '上报党委', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/secretary/report-up-tab.js?v=20261003f').then(m => m.renderContent(ctx)) },
    // 成员流动（2026-09-29 批次 281，支书裁定「支书台也挂一份」）：支书/副支书**本来就有
    //   流入/流出登记权**（单一源 `MEMBER_FLOW_ROLES`），但身份门把他们从组织台弹回支书台
    //   ⇒ 此前**进不去这页**。此处挂**同源组件**（`org/member-flow-tab.js`，单一实现、两处入口），
    //   容器由调用方给（`secretary-tab-content`）。**不放宽任何权限**：能不能登记仍由 `canRegisterFlow` 判。
    //   ⚠ 页签总数 +1 ⇒ 须同批改准计数口径（`S4` / `page-sweep` / help / README）。
    { id: 'member-flow', label: '成员流动', groupLabel: '我的职责', render: (ctx) => import('../entries/tabs/org/member-flow-tab.js?v=20261003f').then(m => m.renderContent({ ...ctx, container: document.getElementById('secretary-tab-content') })) },
    // ── 知情查看（纯只读：无职责≠无知情权，支书 2026-08-08 裁定） ──
    // L4 支部工作地图（2026-09-03 支书裁决放行）：支部分工 · 平铺/按人双视图（支书/副支书共用支书台）
    // 2026-10-02 批次 351（`D-741` 建议序）：**支部分工更具「职责」属性、读频高于知情查看 ⇒ 组内对调**（仅换序；条数不动）。
    { id: 'work-map', label: '支部分工', groupLabel: '知情查看', render: (ctx) => import('../entries/tabs/secretary/work-map-tab.js?v=20261003f').then(m => m.renderContent(ctx)) },
    // 2026-09-14 批次 25：同质薄壳合并——本 tab 由「专班查看」并入「知情查看」（活动/专班分段，只读），
    //   与纪检/组长/组织三台同名同义（组件单一源 = components/record/insight-view.js）。
    // B1-5：高亮目标由导航路径的 3s 定时器清除（不再 onLocated 即时清除，补渲染可重新应用高亮）
    { id: 'tf-view', label: '知情查看', groupLabel: '知情查看', render: (ctx) => import('../components/record/insight-view.js?v=20261003f').then(m => m.renderInsightView(document.getElementById('secretary-tab-content'), { defaultView: 'taskforce', highlightTfId: ctx?.highlightTfId || null })) },
    // ── 制度与答复 ──
    { id: 'feedback', label: '反馈管理', groupLabel: '制度与答复', render: (ctx) => import('../entries/tabs/secretary/feedback-tab.js?v=20261003f').then(m => m.renderContent(ctx)) },
  ],
});
