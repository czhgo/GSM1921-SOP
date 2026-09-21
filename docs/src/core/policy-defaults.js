// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  policy-defaults.js — 业务默认值集中单一源（P3c，2026-09-05；批4 域参数收编 2026-09-09）
// ════════════════════════════════════════════════════════════════
// 纯 ESM、零依赖，浏览器 / Node 双端可加载。
// 默认=本科生党支部设计；开源部署可调；制度裁决固定项勿改。
// 逐项标注 kind + 域负责人：
//   - branch-default = 支部默认值（开源部署可按支部制度调整；登记于 POLICY_OVERRIDABLE 者为
//     「域参数(L2)」——支书 2026-09-09 批：域负责人（纪检=考察确认超期 / 组织=滞留复核窗口 /
//     组长=学期组员进展提醒）可经 config.policyOverrides 覆盖，读侧注入生效，全站判定随参数走）
//   - institutional  = 制度裁决固定项（勿改；改须支书裁决）
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
    // kind 'branch-default'：2026-09-06 支书裁（附录⑩ S2 R2-3，出处 .ctx/REVIEW_QUEUE.md），
    //   取代 2026-09-05 版「应到 2/3 且无异议」（出处 .ctx/ENGINEERING_ASSESSMENT.md 行动线 P3a）。
    //   语义裁定：quorum=2/3 为「严格超过」——出席/应到 >2/3 才达出席门槛（2/3 整界不过，
    //   如应到 3 出席 2 仍不足）；vetoOnObject=true 为「反对=0」——交流式 'object'（异议）与
    //   正式 'oppose'（反对）同口径视为反对，任一即否决；'abstain'（弃权）计出席不计赞成与反对。
    //   开源部署可按支部制度调整；消费点：services/workforce.js evaluateWorkforceVotes（勿另写字面量）。
    //   （制度默认展示位：设置中心·支部制度参数 只读列出；不在 policyOverrides 白名单 = 不可经 UI 覆盖。）
    voteThreshold: { quorum: 2 / 3, vetoOnObject: true },
  },
  attendance: {
    // 会议考勤的类型清单（＝**哪些会议类型设考勤**；上传位按类型分，见下方 recorderByType / noAttendanceTypes 与
    //   services/attendance.js::canUploadAttendance）。kind 'branch-default'：出处 CF §C.1a 会议考勤；导出去重冻结导出面
    //   （MEETING_ATTENDANCE_TYPES 由此派生）。⚠ 2026-09-21 批次 132（支书口径一「三会，支委会规模小可以不考勤」，修正 `D-548` 的一刀切）：支委会不考勤 ⇒ 移出本表、入 `noAttendanceTypes`。
    meetingTypes: ['党课', '支部党员大会', '组织生活会'],
    // **不设考勤的会议类型**（口径一）：单源消费 = canUploadAttendance · 支书台「考勤待录入」提醒 · 设置中心
    noAttendanceTypes: ['支委会'],
    uploaderExceptions: {
      // 支书/副支书例外承担上传位
      // kind 'institutional'：出处 SYSTEM_ROLE_PERMISSION §9b 注——制度裁决固定，勿改。
      secretaryDeputy: ['secretary', 'deputy-secretary'],
    },
    // 会议「应到名单」口径（S1–S4 滞留党员设计，2026-09-06 支书已批）
    // kind 'branch-default'：开源部署可按支部制度调整（如支部大会仅正式党员计应到等）。
    // 语义：应到 = 组织关系在本支部的党员（developStage ∈ partyStages）且非滞留；
    //   滞留 = 组织关系保留但人不在校、不参加日常会议 → 成员身份保留、应到剔除、通知照发。
    //   党课列席（积极分子/发展对象）不计应到；党小组会另按本组党员口径（范围=本组，规则同）。
    // 消费点：services/roster.js getMeetingRoster（派生导出，勿在业务层新写字面量）。
    roster: {
      partyStages: ['正式党员', '预备党员'],
      excludeDetained: true,
    },
    // 会议考勤的「记录人 / 上传位」按活动类型映射（R1-1，支书裁定 2026-09-06；**2026-09-21 批次 132 按支书口径一改准**）
    // kind 'institutional'：出处 .ctx/REVIEW_QUEUE.md 附录⑩ S1 R1-1——制度裁决固定，改须支书裁决。
    // ⚠ 2026-09-21 批次 132（支书原话：「三会，支委会规模小可以不考勤。主要就是党小组会 那就是 会议组织者；
    //   如果是党员大会，那就是纪检委员。会议和活动不一样。」＋「考勤和补课的催办、上传主体主要还是纪检委员，
    //   支书也有权上传。党课比较特殊，不属于三会的范畴」）：上传位**按会议类型分**（修正 `D-548` 的一刀切）——
    //   党课 / 支部党员大会＝纪检（支书 / 副支书照例可代上传）；党小组会＝该场会议组织者（兼本组组长）；
    //   组织生活会 / 主题党日 / 其余＝该场组织者；支委会＝不考勤（`noAttendanceTypes`，本表随之不含）。
    // 本表只列「非组织者位」的会议类型（组织者位与不考勤类型不入表）；上传位门禁同源读本表（canUploadAttendance），
    //   表值同时是设置中心「考勤记录人」的展示源 ⇒ 界面与默认值一致（批次 124 登记的缺口本批收口）。
    recorderByType: {
      支部党员大会: ['disc-commissioner'],
      党课: ['secretary', 'deputy-secretary', 'disc-commissioner'],
      党小组会: ['leader'],
    },
    // 未到（请假/缺席）标因固定枚举（附录⑩ A批·S1 · R1-2，支书裁定 2026-09-06）
    // kind 'institutional'：出处 REVIEW_QUEUE 附录⑩ S1 R1-2——请假/缺席由纪检认定、系统标因=固定枚举，
    //   禁造新枚举（新增须支书裁决）。key=英文（落 attendance.absenceReason 字段），label=中文标签（界面显示）。
    // 2026-09-19 批次 94（SOP-B-16 ⑤「请假分事假 / 病假两档 + 请假时提示时效」）：
    //   R1-2 要求「新增枚举须支书裁决」——支书本批指令已把 ⑤ 列入落地清单 ⇒ 视为该新增已裁决；
    //   出处＝母本《常见工作场景快速指南》「事假必须提前 1 天申请，病假可以事后补假」。
    //   `note` = 该档的时效要求（**界面提示用，不是校验、不拦提交**；消费点 = absenceReasonNote）。
    //   ⚠ 旧键 `leave`（请假）**不再出现在可选枚举**，但标签保留为兼容别名
    //     （存量记录 + 线上参会代记 `declareOnlineAttend` 仍用它，显示照旧「请假」）。
    reasons: [
      { key: 'leave_personal', label: '事假', note: '须提前 1 天申请' },
      { key: 'leave_sick',     label: '病假', note: '可事后补' },
      { key: 'unexcused',      label: '无故', note: '' },
      { key: 'other',          label: '其它', note: '' },
    ],
    // 考勤录入提醒阈值（支书台自动提醒：活动结束 >entryRemindDays 天仍无考勤记录 → 提醒纪检录入）
    // kind 'branch-default'：域=纪检监督侧（支书待办派生消费）。批4 副本收编（2026-09-09 支书批）：
    //   secretary-overview _aggAttendanceRemind 由字面量 3 改引用本常量，勿在业务层另写字面量。
    // ⚠ 默认值＝母本数字（2026-09-20 批次 115 取齐，裁定 `D-536`；可调性依 §9l 通例「母本所写数字即默认值」）：
    //   母本《纪检委员工作流程指南》检查清单「活动结束后」写「24h 内打包确认考勤数据（党小组活动）
    //   或录入考勤（会议）」；本系统以**整日**表达 ⇒ 24h → **1 天**。此前默认 3 天与母本不同数，已取齐。
    entryRemindDays: 1,
    // 考勤明细录入期限（同一提醒项 deadline = 活动日 + summaryDeadlineDays）
    // kind 'branch-default'：域=纪检监督侧（secretary-overview _aggAttendanceRemind 消费；勿另写字面量）。
    // ⚠ 默认值＝母本数字（2026-09-20 批次 115 取齐，裁定 `D-536`）：母本该处相邻一条写「48h 内发出
    //   补课通知」——两处时限同属 §9l 通例的**可调过程时限**，本项按「母本数字即默认值」取 48h → **2 天**
    //   （整日表达）。此前默认 5 天与母本不同数，已取齐。
    summaryDeadlineDays: 2,
    // 出勤率偏低**提示线**（SOP-B-15 / SOP-B-7，2026-09-18 批次 85）
    // kind 'branch-default'：**只作提示、不触发任何动作**（不生成补课 / 不影响评优 / 不生成处置）。
    //   ⚠ 它是**提示线、不是制度门槛**——母本不设达标线（存量无出处的「学期出勤率低于 80%」已删）；
    //   本参数只用来「让相关成员知道出勤率偏低这件事」，支部可自行调整（同 §9l 制度参数可调口径）。
    //   消费点：services/attendance.js::listLowAttendanceSessions（勿在业务层另写字面量）。
    lowRateHint: 80,
  },
  inspection: {
    // 考察超期默认天数（待确认 + 超过 N 天判超期）
    // kind 'branch-default'：域参数(L2) · 纪检确认位（支书 2026-09-09 批）；登记 POLICY_OVERRIDABLE，
    //   可经 config.policyOverrides.inspection.overdueDays 覆盖（1..90，读侧注入生效）；
    //   消费点：getOverdueRecords 缺省阈值 / 纪检台超期文案 / 支书台考察提醒 deadline（均勿另写字面量）。
    overdueDays: 7,
  },
  memberConfirmation: {
    // 学期末滞留集中复核窗口（每学期末一次；组织域 L2，支书 2026-09-09 批）
    // kind 'branch-default'：语义=滞留集中复核 半年窗 起月日-止月日，每窗 [起月,起日,止月,止日]；
    //   默认 [06-15..07-15] ∪ [12-15..次年01-15]（次窗跨年：止月<起月 → 止于次年）。
    //   2026-09-09 从 services/member-confirmation.js shouldShowSemesterDetainedRemind 硬编码迁出，
    //   消费点改派生（窗口判定 + 支书待办窗口文案）；登记 POLICY_OVERRIDABLE → 组织委员可经
    //   config.policyOverrides.memberConfirmation.semesterDetainedWindows 覆盖，支书待办随窗口变化。
    semesterDetainedWindows: [[6, 15, 7, 15], [12, 15, 1, 15]],
  },
  review: {
    // 复盘提交提醒阈值（支书台自动提醒：活动结束 >overdueDays 天仍无复盘 → 提醒组织者提交）
    // kind 'branch-default'：域=纪检监督侧。批4 副本收编（2026-09-09 支书批）：
    //   secretary-overview _aggReviewRemind 由字面量 7 改引用本常量，勿在业务层另写字面量。
    overdueDays: 7,
    // 复盘提交期限（同一提醒项 deadline = 活动日 + deadlineDays）
    // kind 'branch-default'：域=纪检监督侧（secretary-overview _aggReviewRemind 消费；勿另写字面量）。
    deadlineDays: 10,
  },
  leader: {
    // 组长学期组员进展自动归集提醒（组长域 L2，支书 2026-09-09 批「域参数」新参数）
    // kind 'branch-default'：默认开、学期制（每学期开学周提醒一次，组长台消费）；
    //   登记 POLICY_OVERRIDABLE → 组长可经 config.policyOverrides.leader.semesterReportReminder.enabled
    //   关闭；frequency 为展示口径（'semester'=每学期），不在覆盖白名单（固定学期制）。
    semesterReportReminder: { enabled: true, frequency: 'semester' },
  },
  thoughtReport: {
    // 思想汇报篇幅（`SOP-B-11`，2026-09-18 批次 86 落地；依支书 2026-09-17 裁定，
    //   母本 `常见工作场景快速指南.md:342`·`:354` 逐字为：
    //   「建议篇幅 1500 字以上；篇幅少于 1200 字触发警告审阅，不影响提交」）。
    // kind 'branch-default'（**字数类**，与 §9l「简讯字数 / 活动照片张数」同族）：
    //   属**支部可调**的制度参数，**母本所写数字即默认值**。
    // ⚠ 2026-09-21 批次 124（`SOP-B-11` 待定项 ①：支书 2026-09-20 定案「**只给提交人本人**」）：
    //   「警告审阅」的**提醒只给提交人本人**（提交页 / 重交页 / 阅读页的 isSelf）——**不在记录上留
    //   组织侧可见的标记**、组织侧不经手篇幅这件事；「审阅由谁做」随之不再存在（无组织侧环节）。
    // ⚠ 三个数各是各的，不得混用：
    //   · wordHint    ＝ **建议**篇幅（1500）——只写在提示文案里，**不参与任何判定**；
    //   · wordSoftMin ＝ **警告审阅线**（1200）——低于它触发「警告审阅」（**提醒提交人本人**），
    //                     **≠ 门槛、≠ 达标线**；
    //   · 「**不影响提交**」＝**硬约束**——低于任何数字都**照常提交、照常入库归档**，
    //                     系统**不拦截、不自动退回、不自动打回**（见 services/thought-report.js）。
    // 消费点：services/thought-report.js::wordCountHint（提交侧 / 重交侧 / 阅读侧字数提示唯一出口）。
    //   ⚠ 2026-09-18 批次 86：`wordSoftMin` 由 800 跟到 1200（D-387 落地），
    //     并补齐「警告审阅」语义；此前「组织初阅会据此把关」的措辞随初阅门取消一并删除。
    wordHint: 1500,
    wordSoftMin: 1200,
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
 * config.policyOverrides 可覆盖白名单（域参数 L2，支书 2026-09-09 批；全覆盖路径均在
 * POLICY_DEFAULTS 内，kind 均为 branch-default——institutional 键一律不在表内 = 制度裁决固定）。
 * 净化/钳制唯一实现 = core/config-clean.js sanitizeConfigPolicyOverrides（本表唯一消费方，
 * 覆盖写入（services/branch.js savePolicyOverrides）与读侧注入共用，防止两套校验未同步的情况）。
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
