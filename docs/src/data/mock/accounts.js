// role: [工程师]+[AI]
// data/mock/accounts.js — Mock 登录账号（模拟 IAAA 校验）
// 2026-10-20：账号即学号，personId 与 studentId 同值（支书=储子禾 2300010001）

export const MOCK_ACCOUNTS = [
  { studentId: '2300010001', password: '123456', personId: '2300010001' },  // 支书 储子禾
  { studentId: '2300010002', password: '123456', personId: '2300010002' },  // 副支书 潘振华
  { studentId: '2400012355', password: '123456', personId: '2400012355' },  // 组织委员 高翔宇
  { studentId: '2400012356', password: '123456', personId: '2400012356' },  // 宣传委员 方文静
  { studentId: '2400012354', password: '123456', personId: '2400012354' },  // 纪检委员 董建军
  { studentId: '2400012345', password: '123456', personId: '2400012345'  },  // 组长 罗文杰
  { studentId: '2400012346', password: '123456', personId: '2400012346'  },  // 组长 郭子睿
  // R2-38（2026-10-20）：补第三党小组组长 2400012348 的演示账号——原注释声称「角色覆盖…组长」，
  //   但三个组长里只有第一/第二组有账号 ⇒ 第三组组长台无法进入（与 R2-33 的假待办叠加时更难解释）。
  { studentId: '2400012348', password: '123456', personId: '2400012348'  },  // 组长 梁凯文（第三党小组）
  { studentId: '2400012349', password: '123456', personId: '2400012349'  },  // 普通成员 宋佳宁
  // === T4.4 补充角色切换样本（2026-07-16）===
  { studentId: '2500010012', password: '123456', personId: '2500010012' },  // 积极分子 朱欣怡（D-240 organizer 候选）
  { studentId: '2500010010', password: '123456', personId: '2500010010' },  // 预备党员 曹雅婷
  { studentId: '2500010007', password: '123456', personId: '2500010007' },  // 积极分子 沈佳琪
  // === 演示账号**子集**（2026-08-01；非「50 人规模账号」——名册 51 人而账号刻意更少）===
  // 为什么只保留子集：演示登录按角色取样即可；不伪造账号、不把名册当账号清单。
  // 角色覆盖：支书/副支书/组织/宣传/纪检/组长/普通成员 + 积极分子/预备党员/发展对象/党委组织员。
  { studentId: '2500010002', password: '123456', personId: '2500010002' },  // 预备党员 黄志远
  { studentId: '2500010003', password: '123456', personId: '2500010003' },  // 预备党员 顾文博
  { studentId: '2500010008', password: '123456', personId: '2500010008' },  // 发展对象 邓子涵
  { studentId: '2500010009', password: '123456', personId: '2500010009' },  // 积极分子 程思源
  { studentId: '2500010014', password: '123456', personId: '2500010014' },  // 预备党员 陈晓彤
  { studentId: '2500010025', password: '123456', personId: '2500010025' },  // 积极分子 赵倩
  // P1 党委后台（2026-09-02）：党委组织员账号（组织级，登录直达党委工作台）
  { studentId: '9000000001', password: '123456', personId: '9000000001' },
];

/**
 * Mock 登录校验
 * @param {string} studentId
 * @param {string} password
 * @returns {{ ok: boolean, personId: string|null }}
 */
export function mockLogin(studentId, password) {
  const account = MOCK_ACCOUNTS.find(a => a.studentId === studentId && a.password === password);
  if (!account) return { ok: false, personId: null };
  return { ok: true, personId: account.personId };
}
