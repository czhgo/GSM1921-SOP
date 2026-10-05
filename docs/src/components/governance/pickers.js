// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/governance/pickers.js —— **选人域唯一出口**（§3.1「统一扎口」纪律）
//
//  样板：`components/ui/forms.js`（表单域）· `components/ui/badges.js`（徽章域）·
//        `components/record/reporting.js`（汇报域）。同域可以有若干实现文件，
//        **对外只暴露一个库文件**；调用方一律 import 本库，不直连内部实现。
//
//  本域成员（实现文件不搬运、不改名，只在此聚合重导出）：
//    · `person-picker.js`      —— 选人载体（PersonPicker：选名单成员）
//    · `person-edit-modal.js`  —— 成员档案编辑浮窗（openPersonEditModal）
//
//  纪律（G1 第②项，2026-09-28）：
//    ① 新增调用方一律从本库导入；
//    ② 存量直连同步收口（本轮已收 13 处）；
//    ③ 禁止双轨——守卫 `server/test/person-consistency.test.mjs::S5` 逐文件断言
//       「除本库外，全站不得出现对两个实现文件的 import」，回潮即红。
// ════════════════════════════════════════════════════════════════

export { PersonPicker } from './person-picker.js?v=20261005m';
export { openPersonEditModal } from './person-edit-modal.js?v=20261005m';
