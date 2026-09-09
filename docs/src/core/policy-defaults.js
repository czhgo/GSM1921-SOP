// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  policy-defaults.js — 业务默认值集中单一源（P3c，2026-09-05；批4 域参数收编 2026-09-09）
// ════════════════════════════════════════════════════════════════
// 纯 ESM、零依赖，浏览器 / Node 双端可加载。
// 默认=本科生党支部设计；开源部署可调；制度裁决固定项勿改。
// 逐项标注 kind + 域负责人：
//   - branch-default = 支部默认值（开源部署可按支部制度调整；登记于 POLICY_OVERRIDABLE 者为
//     「域参数(L2)」——书记 2026-09-09 批：域负责人（纪检=考察确认超期 / 组织=滞留复核窗口 /
//     组长=学期组员进展提醒）可经 config.policyOverrides 覆盖，读侧注入生效，全站判定随参数走）
//   - institutional  = 制度裁决固定项（勿改；改须书记裁决）
// 消费点只引用本文件派生，不在业务层新写字面量（批4 副本收编：inspection-tab 超期天数与文案、
//   secretary-overview 考勤/复盘提醒阈值与 deadline、member-confirmation 滞留复核窗口与文案、
//   组长学期提醒消费——一律改由本文件派生）。
// ════════════════════════════════════════════════════════════════

/** 深拷贝工具（policy 结构纯 JSON 数据；factory 基准深拷贝/复位用） */
function _clone(v) {
  return JSON.parse(JSON.stringify(v));
}

/**
 * 出厂基准（字面量）。POLICY_DEFAULTS 由此深拷贝；读侧注入（config.policyOverrides）只改
 * POLICY_DEFAULTS 副本、本基准恒净（重置 = 从本基准整节回拷）。
 */
const _FACTORY = {
  workforce: {
    // 票决通过门槛（支委会从严：应到会人数超过 2/3 且无反对，弃权允许）
    // kind 'branch-default'：2026-09-06 书记裁（附录⑩ S2 R2-3，出处 .ctx/REVIEW_QUEUE.md），
    //   取代 2026-09-05 版「应到 2/3 且无异议」（出处 .ctx/ENGINEERING_ASSESSMENT.md 行动线 P3a）。
    //   语义裁定：quorum=2/3 为「严格超过」——出席/应到 >2/3 才达出席门槛（2/3 整界不过，
    //   如应到 3 出席 2 仍不足）；vetoOnObject=true 为「反对=0」——交流式 'object'（异议）与
    //   正式 'oppose'（反对）同口径视为反对，任一即否决；'abstain'（弃权）计出席不计赞成与反对。
    //   开源部署可按支部制度调整；消费点：services/workforce.js evaluateWorkforceVotes（勿另写字面量）。
    //   （制度默认展示位：设置中心·支部制度参数 只读列出；不在 policyOverrides 白名单 = 不可经 UI 覆盖。）
    voteThreshold: { quorum: 2 / 3, vetoOnObject: true },
  },
  attendance: {
    // 会议考勤上传位的活动类型（纪检直接上传并录入）
    // kind 'branch-default'：出处 CF §C.1a 会议考勤；导出去重冻结导出面
    //   （MEETING_ATTENDANCE_TYPES 由此派生，勿在消费点另写字面量数组）。
    meetingTypes: ['党课', '支部党员大会', '组织生活会', '支委会'],
    uploaderExceptions: {
      // 书记/副书记例外承担上传位
      // kind 'institutional'：出处 SYSTEM_ROLE_PERMISSION §9b 注——制度裁决固定，勿改。
      secretaryDeputy: ['secretary', 'deputy-secretary'],
    },
    // 会议「应到名单」口径（S1–S4 滞留党员设计，2026-09-06 书记已批）
    // kind 'branch-default'：开源部署可按支部制度调整（如支部大会仅正式党员计应到等）。
    // 语义：应到 = 组织关系在本支部的党员（developStage ∈ partyStages）且非滞留；
    //   滞留 = 组织关系保留但人不在校、不参加日常会议 → 成员身份保留、应到剔除、通知照发。
    //   党课列席（积极分子/发展对象）不计应到；党小组会另按本组党员口径（范围=本组，规则同）。
    // 消费点：services/roster.js getMeetingRoster（派生导出，勿在业务层新写字面量）。
    roster: {
      partyStages: ['正式党员', '预备党员'],
      excludeDetained: true,
    },
    // 会议考勤「记录人」按活动类型映射（附录⑩ A批·S1 · R1-1，书记裁定 2026-09-06）
    // kind 'institutional'：出处 .ctx/REVIEW_QUEUE.md 附录⑩ S1 R1-1——制度裁决固定，改须书记裁决。
    // 语义正式化：支部党员大会=纪检、党课=书记或纪检（含副书记例外承担）、组织生活会/支委会=纪检、
    //   党小组会=组长（兼组织者）；值为角色键数组（secretary/deputy-secretary/disc-commissioner/leader，
    //   键名见 core/constants.js ROLE_LABELS）。
    // 仅覆盖「会议考勤」类型；主题党日等组织者位活动不入此表（记录人=该活动组织者，由 assignments 定）。
    // 注：上传位门禁实现仍以 services/attendance.js canUploadAttendance 为准（含组织者兜底位，
    //   不据此表做破坏性收紧）；本表为记录人语义的单一源——展示/解释/测试消费，业务层勿新写字面量。
    recorderByType: {
      支部党员大会: ['disc-commissioner'],
      党课: ['secretary', 'deputy-secretary', 'disc-commissioner'],
      组织生活会: ['disc-commissioner'],
      支委会: ['disc-commissioner'],
      党小组会: ['leader'],
    },
    // 未到（请假/缺席）标因固定枚举（附录⑩ A批·S1 · R1-2，书记裁定 2026-09-06）
    // kind 'institutional'：出处 REVIEW_QUEUE 附录⑩ S1 R1-2——请假/缺席由纪检认定、系统标因=固定枚举，
    //   禁造新枚举（新增须书记裁决）。key=英文（落 attendance.absenceReason 字段），label=中文标签（界面显示）。
    reasons: [
      { key: 'leave',     label: '请假' },
      { key: 'unexcused', label: '无故' },
      { key: 'other',     label: '其它' },
    ],
    // 考勤录入提醒阈值（书记台自动提醒：活动结束 >entryRemindDays 天仍无考勤记录 → 提醒纪检录入）
    // kind 'branch-default'：域=纪检监督侧（书记待办派生消费）。批4 副本收编（2026-09-09 书记批）：
    //   secretary-overview _aggAttendanceRemind 由字面量 3 改引用本常量，勿在业务层另写字面量。
    entryRemindDays: 3,
    // 考勤总表录入期限（同一提醒项 deadline = 活动日 + summaryDeadlineDays）
    // kind 'branch-default'：域=纪检监督侧（secretary-overview _aggAttendanceRemind 消费；勿另写字面量）。
    summaryDeadlineDays: 5,
  },
  inspection: {
    // 考察超期默认天数（待确认 + 超过 N 天判超期）
    // kind 'branch-default'：域参数(L2) · 纪检确认位（书记 2026-09-09 批）；登记 POLICY_OVERRIDABLE，
    //   可经 config.policyOverrides.inspection.overdueDays 覆盖（1..90，读侧注入生效）；
    //   消费点：getOverdueRecords 缺省阈值 / 纪检台超期文案 / 书记台考察提醒 deadline（均勿另写字面量）。
    overdueDays: 7,
  },
  memberConfirmation: {
    // 学期末滞留集中复核窗口（每学期末一次；组织域 L2，书记 2026-09-09 批）
    // kind 'branch-default'：语义=滞留集中复核 半年窗 起月日-止月日，每窗 [起月,起日,止月,止日]；
    //   默认 [06-15..07-15] ∪ [12-15..次年01-15]（次窗跨年：止月<起月 → 止于次年）。
    //   2026-09-09 从 services/member-confirmation.js shouldShowSemesterDetainedRemind 硬编码迁出，
    //   消费点改派生（窗口判定 + 书记待办窗口文案）；登记 POLICY_OVERRIDABLE → 组织委员可经
    //   config.policyOverrides.memberConfirmation.semesterDetainedWindows 覆盖，书记待办随窗口变化。
    semesterDetainedWindows: [[6, 15, 7, 15], [12, 15, 1, 15]],
  },
  review: {
    // 复盘提交提醒阈值（书记台自动提醒：活动结束 >overdueDays 天仍无复盘 → 提醒组织者提交）
    // kind 'branch-default'：域=纪检监督侧。批4 副本收编（2026-09-09 书记批）：
    //   secretary-overview _aggReviewRemind 由字面量 7 改引用本常量，勿在业务层另写字面量。
    overdueDays: 7,
    // 复盘提交期限（同一提醒项 deadline = 活动日 + deadlineDays）
    // kind 'branch-default'：域=纪检监督侧（secretary-overview _aggReviewRemind 消费；勿另写字面量）。
    deadlineDays: 10,
  },
  leader: {
    // 组长学期组员进展自动归集提醒（组长域 L2，书记 2026-09-09 批「域参数」新参数）
    // kind 'branch-default'：默认开、学期制（每学期开学周提醒一次，组长台消费）；
    //   登记 POLICY_OVERRIDABLE → 组长可经 config.policyOverrides.leader.semesterReportReminder.enabled
    //   关闭；frequency 为展示口径（'semester'=每学期），不在覆盖白名单（固定学期制）。
    semesterReportReminder: { enabled: true, frequency: 'semester' },
  },
};

/**
 * 有效默认（对外单一源；默认 = factory 深拷贝）。
 * ⚠️ 读侧注入（core/config-clean.js applyBranchPolicyOverrides）会把当前支部
 * config.policyOverrides 就地覆盖到本对象（白名单键）；跨支部切换先 resetPolicyDefaults() 再覆盖，
 * 故本对象 = 「当前生效默认」。业务层一律 call-time 读本对象，勿缓存嵌套引用。
 */
export const POLICY_DEFAULTS = _clone(_FACTORY);

/**
 * config.policyOverrides 可覆盖白名单（域参数 L2，书记 2026-09-09 批；全覆盖路径均在
 * POLICY_DEFAULTS 内，kind 均为 branch-default——institutional 键一律不在表内 = 制度裁决固定）。
 * 净化/钳制唯一实现 = core/config-clean.js sanitizeConfigPolicyOverrides（本表唯一消费方，
 * 覆盖写入（services/branch.js savePolicyOverrides）与读侧注入共用，防两套校验漂移）。
 */
export const POLICY_OVERRIDABLE = [
  { path: ['inspection', 'overdueDays'], type: 'int', min: 1, max: 90, domain: 'disc-commissioner' },
  { path: ['memberConfirmation', 'semesterDetainedWindows'], type: 'windows', domain: 'org-commissioner' },
  { path: ['leader', 'semesterReportReminder', 'enabled'], type: 'boolean', domain: 'leader' },
];

/** policyOverrides 顶层节白名单（由 POLICY_OVERRIDABLE 派生；写口校验/删除语义用） */
export const POLICY_OVERRIDE_SECTIONS = [...new Set(POLICY_OVERRIDABLE.map(o => o.path[0]))];

/** 复位全部有效默认为出厂基准（读侧注入/跨支部切换前调用；幂等） */
export function resetPolicyDefaults() {
  for (const k of Object.keys(_FACTORY)) {
    POLICY_DEFAULTS[k] = _clone(_FACTORY[k]);
  }
}

/**
 * 按白名单把「已净化」的 overrides 就地 merge 进 POLICY_DEFAULTS（clean 须已过
 * sanitizeConfigPolicyOverrides——本函数不再做类型校验，防两处校验口径分叉）。
 * @param {Object} clean { 节: { 叶: 值 } }（仅白名单合法键）
 * @returns {number} 实际覆盖的叶数
 */
export function applyPolicyOverrides(clean) {
  let n = 0;
  if (!clean || typeof clean !== 'object' || Array.isArray(clean)) return 0;
  for (const spec of POLICY_OVERRIDABLE) {
    const [s0, s1, s2] = spec.path;
    const holder = clean[s0];
    if (!holder || typeof holder !== 'object' || Array.isArray(holder)) continue;
    const target = POLICY_DEFAULTS[s0];
    if (!target || typeof target !== 'object' || Array.isArray(target)) continue;
    if (s2 === undefined) {
      if (!Object.prototype.hasOwnProperty.call(holder, s1)) continue;
      target[s1] = _clone(holder[s1]); // 深拷贝防 config 对象别名穿透
      n += 1;
    } else {
      const mid = holder[s1];
      if (!mid || typeof mid !== 'object' || Array.isArray(mid)) continue;
      if (!Object.prototype.hasOwnProperty.call(mid, s2)) continue;
      const sub = target[s1];
      if (!sub || typeof sub !== 'object' || Array.isArray(sub)) continue;
      sub[s2] = _clone(mid[s2]);
      n += 1;
    }
  }
  return n;
}
