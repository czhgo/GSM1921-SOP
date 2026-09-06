// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  policy-defaults.js — 业务默认值集中单一源（P3c，2026-09-05）
// ════════════════════════════════════════════════════════════════
// 纯 ESM、零依赖，浏览器 / Node 双端可加载。
// 默认=本科生党支部设计；开源部署可调；制度裁决固定项勿改。
// 逐项标注 kind：
//   - branch-default = 支部默认值（开源部署可按支部制度调整）
//   - institutional  = 制度裁决固定项（勿改；改须书记裁决）
// 消费点只引用本文件派生，不在业务层新写字面量。

export const POLICY_DEFAULTS = {
  workforce: {
    // 票决通过门槛（支委会从严：应到会人数超过 2/3 且无反对，弃权允许）
    // kind 'branch-default'：2026-09-06 书记裁（附录⑩ S2 R2-3，出处 .ctx/REVIEW_QUEUE.md），
    //   取代 2026-09-05 版「应到 2/3 且无异议」（出处 MODULARIZATION_ASSESSMENT §8.5 P3a）。
    //   语义裁定：quorum=2/3 为「严格超过」——出席/应到 >2/3 才达出席门槛（2/3 整界不过，
    //   如应到 3 出席 2 仍不足）；vetoOnObject=true 为「反对=0」——交流式 'object'（异议）与
    //   正式 'oppose'（反对）同口径视为反对，任一即否决；'abstain'（弃权）计出席不计赞成与反对。
    //   开源部署可按支部制度调整；消费点：services/workforce.js evaluateWorkforceVotes（勿另写字面量）。
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
  },
  inspection: {
    // 考察超期默认天数（待确认 + 超过 N 天判超期）
    // kind 'branch-default'：可覆盖（getOverdueRecords 参数），默认 7。
    overdueDays: 7,
  },
};
