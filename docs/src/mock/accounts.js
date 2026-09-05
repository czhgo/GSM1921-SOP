// role: [工程师]+[AI]
// mock/accounts.js — Mock 登录账号（模拟 IAAA 校验）
// 2026-09-06 基线刷新：注释中 p1~p15 显示名与 people.js 同步（书记=储子禾 p13）

export const MOCK_ACCOUNTS = [
  { studentId: '2300010001', password: '123456', personId: 'p13' },  // 书记 储子禾
  { studentId: '2300010002', password: '123456', personId: 'p14' },  // 副书记 潘振华
  { studentId: '2400012355', password: '123456', personId: 'p11' },  // 组织委员 高翔宇
  { studentId: '2400012356', password: '123456', personId: 'p12' },  // 宣传委员 方文静
  { studentId: '2400012354', password: '123456', personId: 'p10' },  // 纪检委员 董建军
  { studentId: '2400012345', password: '123456', personId: 'p1'  },  // 组长 罗文杰
  { studentId: '2400012346', password: '123456', personId: 'p2'  },  // 组长 郭子睿
  { studentId: '2400012349', password: '123456', personId: 'p5'  },  // 普通成员 宋佳宁
  // === T4.4 补充角色切换样本（2026-07-16）===
  { studentId: '2500010012', password: '123456', personId: 'p26' },  // 积极分子 朱欣怡（D-240 organizer 候选）
  { studentId: '2500010010', password: '123456', personId: 'p24' },  // 预备党员 曹雅婷
  { studentId: '2500010007', password: '123456', personId: 'p21' },  // 积极分子 沈佳琪
  // === 50 人规模扩充账号（2026-08-01）===
  { studentId: '2500010002', password: '123456', personId: 'p16' },  // 预备党员 黄志远
  { studentId: '2500010003', password: '123456', personId: 'p17' },  // 预备党员 顾文博
  { studentId: '2500010008', password: '123456', personId: 'p22' },  // 发展对象 邓子涵
  { studentId: '2500010009', password: '123456', personId: 'p23' },  // 积极分子 程思源
  { studentId: '2500010014', password: '123456', personId: 'p28' },  // 预备党员 陈晓彤
  { studentId: '2500010025', password: '123456', personId: 'p39' },  // 积极分子 赵倩
  // P1 党委后台（2026-09-02）：党委组织员账号（组织级，登录直达党委工作台）
  { studentId: '9000000001', password: '123456', personId: 'p_pc' },
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
