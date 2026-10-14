// role: [工程师]+[AI]
// Help 的轻量导航目录。重目录留在本文件，help-catalog 的功能地图仍按需加载。

export const HELP_TOC_CHAPTERS = [
  { id: 'sec-ack', label: '致谢' },
  { id: 'sec-entries', label: '0 入口速查' },
  { id: 'sec-quickstart', label: '1 快速上手' },
  { id: 'sec-roles', label: '2 角色工作台导览' },
  { id: 'sec-domains', label: '3 域手册' },
  { id: 'sec-settings', label: '4 设置逐项' },
  { id: 'sec-flows', label: '5 业务链路' },
  { id: 'sec-admin', label: '6 党委与配置' },
  { id: 'sec-what', label: '7 这个系统在干什么' },
  { id: 'sec-tech', label: '8 技术架构' },
  { id: 'sec-disclaimer', label: '免责声明' },
];

export const HELP_BROWSE_ROLES = [
  { id: 'secretary', label: '支书 / 副支书', terms: ['支书', '书记', '副支书'] },
  { id: 'organization', label: '组织委员', terms: ['组织委员'] },
  { id: 'publicity', label: '宣传委员', terms: ['宣传委员'] },
  { id: 'discipline', label: '纪检委员', terms: ['纪检委员'] },
  { id: 'group-leader', label: '党小组组长', terms: ['党小组组长', '组长', '代组长'] },
  { id: 'member', label: '党员 / 成员', terms: ['普通党员', '党员', '成员本人'] },
  { id: 'party-committee', label: '党委组织员', terms: ['党委组织员', '党委台'] },
];

export const HELP_QUICK_TASKS = [
  { label: '创建会议活动', href: '#card-dom31-meeting-create' },
  { label: '编排议程与记录决议', href: '#card-dom31-agenda' },
  { label: '查看线上表决', href: '#card-dom31-vote' },
  { label: '上传会议考勤', href: '#card-dom31-att-upload' },
  { label: '查设置说明', href: '#sec-settings' },
  { label: '按角色看工作台', href: '#sec-roles' },
];
