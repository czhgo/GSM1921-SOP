export const PEOPLE = [
  // ── 2026-09-06 基线刷新：p1~p15 全部姓名由「数字占位名」替换为常见真实人名（书记=储子禾 p13）──
  // ── S1–S4 滞留党员示范（2026-09-06 书记已批）：成员档案可选字段 residenceStatus('在校'|'滞留')/
  //    residenceNote（备注·原因起止）/ residenceHistory（变更留痕 {from,to,updatedBy,updatedAt}，组织委员
  //    维护、书记可复核）；未标注 = 默认「在校」。示范取 p5/p9 两名「正式党员/普通成员」（经自查：二人
  //    7~8 月历史活动/考勤均在滞留起始 2026-09-01 之前，无未来日期会议分工引用；滞留自 2026-09-01 起）。──
  { id: 'p1',  name: '罗文杰', studentId: '2400012345', partyGroup: '第一党小组', developStage: '正式党员', role: 'leader' },
  { id: 'p2',  name: '郭子睿', studentId: '2400012346', partyGroup: '第二党小组', developStage: '正式党员', role: 'leader' },
  { id: 'p3',  name: '何晓峰', studentId: '2400012347', partyGroup: '第一党小组', developStage: '正式党员', role: 'participant' },
  { id: 'p4',  name: '梁凯文', studentId: '2400012348', partyGroup: '第三党小组', developStage: '正式党员', role: 'leader' },
  { id: 'p5',  name: '宋佳宁', studentId: '2400012349', partyGroup: '第二党小组', developStage: '正式党员', role: 'participant',
    residenceStatus: '滞留', residenceNote: '2026-09 起赴外校交换一学期（至 2027-01），人不在校；组织关系保留、应到剔除、通知照发',
    residenceHistory: [{ from: '在校', to: '滞留', updatedBy: 'p11', updatedAt: '2026-09-01T09:00:00.000Z', note: '交换离校一学期，组织委员核录' }] },
  { id: 'p6',  name: '苏明哲', studentId: '2400012350', partyGroup: '第一党小组', developStage: '发展对象', role: 'participant' },
  { id: 'p7',  name: '曾雨桐', studentId: '2400012351', partyGroup: '第三党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p8',  name: '彭博文', studentId: '2400012352', partyGroup: '第二党小组', developStage: '正式党员', role: 'participant' },
  { id: 'p9',  name: '吕思涵', studentId: '2400012353', partyGroup: '第一党小组', developStage: '正式党员', role: 'participant',
    residenceStatus: '滞留', residenceNote: '2026-09 起参加校外长期实践项目（至 2026-12），人不在校；组织关系保留、应到剔除、通知照发',
    residenceHistory: [{ from: '在校', to: '滞留', updatedBy: 'p11', updatedAt: '2026-09-01T09:30:00.000Z', note: '校外长期实践离校，组织委员核录' }] },
  { id: 'p10', name: '董建军', studentId: '2400012354', partyGroup: '第二党小组', developStage: '正式党员', role: 'disc-commissioner' },
  { id: 'p11', name: '高翔宇', studentId: '2400012355', partyGroup: '第三党小组', developStage: '正式党员', role: 'org-commissioner' },
  { id: 'p12', name: '方文静', studentId: '2400012356', partyGroup: '第一党小组', developStage: '正式党员', role: 'prop-commissioner' },
  { id: 'p13', name: '储子禾', studentId: '2300010001', partyGroup: '第一党小组', developStage: '正式党员', role: 'secretary' },
  { id: 'p14', name: '潘振华', studentId: '2300010002', partyGroup: '第二党小组', developStage: '正式党员', role: 'deputy-secretary' },
  { id: 'p15', name: '丁嘉懿', studentId: '2500010001', partyGroup: '第三党小组', developStage: '积极分子', role: 'participant' },
  // === T3.1 扩充人员（p16~p27，2026-07-16）===
  // p26 为 D-240 organizer 候选（积极分子担任专班组织者，赋权记录由 auth.js 体现）
  { id: 'p16', name: '黄志远', studentId: '2500010002', partyGroup: '第一党小组', developStage: '预备党员', role: 'participant' },
  { id: 'p17', name: '顾文博', studentId: '2500010003', partyGroup: '第一党小组', developStage: '预备党员', role: 'participant' },
  { id: 'p18', name: '谢晓东', studentId: '2500010004', partyGroup: '第一党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p19', name: '唐俊豪', studentId: '2500010005', partyGroup: '第二党小组', developStage: '预备党员', role: 'participant' },
  { id: 'p20', name: '韩雨欣', studentId: '2500010006', partyGroup: '第二党小组', developStage: '预备党员', role: 'participant' },
  { id: 'p21', name: '沈佳琪', studentId: '2500010007', partyGroup: '第二党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p22', name: '邓子涵', studentId: '2500010008', partyGroup: '第二党小组', developStage: '发展对象', role: 'participant' },
  { id: 'p23', name: '程思源', studentId: '2500010009', partyGroup: '第三党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p24', name: '曹雅婷', studentId: '2500010010', partyGroup: '第三党小组', developStage: '预备党员', role: 'participant' },
  { id: 'p25', name: '袁浩然', studentId: '2500010011', partyGroup: '第三党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p26', name: '朱欣怡', studentId: '2500010012', partyGroup: '第三党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p27', name: '许梦琪', studentId: '2500010013', partyGroup: '第三党小组', developStage: '积极分子', role: 'participant' },
  // === 50 人规模扩充（p28~p50，2026-08-01）===
  // 分布自然化：正式12 / 预备9 / 发展对象9 / 积极分子20（原申请人10人并入积极分子，T-2026-08-01 系统身份四阶段），三党小组 17/17/16
  { id: 'p28', name: '陈晓彤', studentId: '2500010014', partyGroup: '第一党小组', developStage: '预备党员', role: 'participant' },
  { id: 'p29', name: '李思远', studentId: '2500010015', partyGroup: '第二党小组', developStage: '预备党员', role: 'participant' },
  { id: 'p30', name: '王嘉怡', studentId: '2500010016', partyGroup: '第三党小组', developStage: '预备党员', role: 'participant' },
  { id: 'p31', name: '刘子昂', studentId: '2500010017', partyGroup: '第一党小组', developStage: '预备党员', role: 'participant' },
  { id: 'p32', name: '张伟',   studentId: '2500010018', partyGroup: '第二党小组', developStage: '发展对象', role: 'participant' },
  { id: 'p33', name: '杨帆',   studentId: '2500010019', partyGroup: '第三党小组', developStage: '发展对象', role: 'participant' },
  { id: 'p34', name: '黄丽丽', studentId: '2500010020', partyGroup: '第一党小组', developStage: '发展对象', role: 'participant' },
  { id: 'p35', name: '周子明', studentId: '2500010021', partyGroup: '第二党小组', developStage: '发展对象', role: 'participant' },
  { id: 'p36', name: '吴昊',   studentId: '2500010022', partyGroup: '第三党小组', developStage: '发展对象', role: 'participant' },
  { id: 'p37', name: '徐静',   studentId: '2500010023', partyGroup: '第一党小组', developStage: '发展对象', role: 'participant' },
  { id: 'p38', name: '孙浩然', studentId: '2500010024', partyGroup: '第二党小组', developStage: '发展对象', role: 'participant' },
  { id: 'p39', name: '赵倩',   studentId: '2500010025', partyGroup: '第三党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p40', name: '郑爽',   studentId: '2500010026', partyGroup: '第一党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p41', name: '钱进',   studentId: '2500010027', partyGroup: '第二党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p42', name: '冯雪',   studentId: '2500010028', partyGroup: '第三党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p43', name: '沈月',   studentId: '2500010029', partyGroup: '第一党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p44', name: '蒋欣怡', studentId: '2500010030', partyGroup: '第二党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p45', name: '韩雪',   studentId: '2500010031', partyGroup: '第三党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p46', name: '姚志强', studentId: '2500010032', partyGroup: '第一党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p47', name: '杜磊',   studentId: '2500010033', partyGroup: '第二党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p48', name: '江珊',   studentId: '2500010034', partyGroup: '第三党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p49', name: '段志远', studentId: '2500010035', partyGroup: '第一党小组', developStage: '积极分子', role: 'participant' },
  { id: 'p50', name: '汪洋',   studentId: '2500010036', partyGroup: '第二党小组', developStage: '积极分子', role: 'participant' },
  // P1 党委后台（2026-09-02）：党委组织员（党务老师，组织级角色——不属于任何支部，branchId:null 保持）
  { id: 'p_pc', name: '党委组织员', studentId: '9000000001', partyGroup: '', developStage: '', role: 'party-staff', branchId: null },
];

// ── P1 党委后台（2026-09-02，书记决策：党员严格单支部）──
// 成员缺省归属本科生党支部 br-b1；党委级人员（party-staff，Step4 引入）显式 branchId: null（不属于支部）
for (const p of PEOPLE) {
  if (p.branchId === undefined) p.branchId = 'br-b1';
}
