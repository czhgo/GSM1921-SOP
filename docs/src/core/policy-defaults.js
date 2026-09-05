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
    // 票决通过门槛（应到比例 + 有异议即否）
    // kind 'branch-default'：2026-09-05 书记裁「支委会从严：应到 2/3 且无异议」，
    //   出处 MODULARIZATION_ASSESSMENT §8.5 P3a。开源部署可按支部制度调整。
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
  },
  inspection: {
    // 考察超期默认天数（待确认 + 超过 N 天判超期）
    // kind 'branch-default'：可覆盖（getOverdueRecords 参数），默认 7。
    overdueDays: 7,
  },
};
