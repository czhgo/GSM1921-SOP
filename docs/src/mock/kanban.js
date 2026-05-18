export const KANBAN_MOCKS = {
  tf: {
    pending: [
      { id:'t1', title:'宣传联络专班', count:4, skill:'文案写作·摄影·排版', duration:'2026春', desc:'为支部品牌活动提供日常宣传支持，产出新闻稿与活动推送', sub:[
        { id:'t1-s1', title:'招募文案撰写人', done:false },
        { id:'t1-s2', title:'对接各党小组活动日程', done:false },
        { id:'t1-s3', title:'搭建宣传材料模板库', done:false },
      ]},
      { id:'t2', title:'学术研讨专班', count:5, skill:'政策研究·数据分析', duration:'2026春~夏', desc:'围绕习近平经济思想开展理论研讨，产出学习心得与研讨简报', sub:[
        { id:'t2-s1', title:'确定研讨主题清单', done:true },
        { id:'t2-s2', title:'招募学术骨干成员', done:false },
      ]},
    ],
    active: [
      { id:'t3', title:'考勤纪检专班', count:3, skill:'考勤记录·数据整理', duration:'2026全年', desc:'统筹支部全体活动考勤，按月产出出勤统计报告，跟踪补课进度', sub:[
        { id:'t3-s1', title:'建立考勤登记模板', done:true },
        { id:'t3-s2', title:'Q1考勤数据汇总', done:false },
        { id:'t3-s3', title:'补课通知机制上线', done:false },
        { id:'t3-s4', title:'月度复盘报告模板', done:true },
      ]},
      { id:'t4', title:'支部大会筹备专班', count:6, skill:'会务统筹·主持·记录', duration:'2026-05', desc:'筹备二季度支部党员大会，统筹议程、主持、会议记录各项分工', sub:[
        { id:'t4-s1', title:'拟定大会议程', done:true },
        { id:'t4-s2', title:'通知全体党员', done:false },
        { id:'t4-s3', title:'准备大会材料', done:false },
      ]},
    ],
  },
  prop: {
    pending: [
      { id:'pa1', title:'四月主题党日新闻稿', type:'活动', domain:'宣传', desc:'活动已完成，待撰写推送稿件，配图待筛选', sub:[
        { id:'pa1-s1', title:'活动照片整理', done:true },
        { id:'pa1-s2', title:'撰写新闻稿初稿', done:false },
        { id:'pa1-s3', title:'推送排版与审核', done:false },
      ]},
      { id:'pt1', title:'宣传联络专班', type:'专班', domain:'宣传', desc:'为支部品牌活动提供日常宣传支持', sub:[
        { id:'pt1-s1', title:'招募文案撰写人', done:false },
        { id:'pt1-s2', title:'搭建宣传材料模板库', done:false },
      ]},
    ],
    active: [
      { id:'pa2', title:'支部品牌宣传方案', type:'活动', domain:'宣传', desc:'讨论中，初稿待审', sub:[
        { id:'pa2-s1', title:'调研兄弟支部宣传模式', done:true },
        { id:'pa2-s2', title:'撰写品牌方案初稿', done:false },
        { id:'pa2-s3', title:'提交支委会审议', done:false },
      ]},
    ],
  },
  disc: {
    pending: [
      { id:'da1', title:'四月党小组会考勤统计', type:'活动', domain:'纪检', desc:'3个党小组考勤数据待汇总录入', sub:[
        { id:'da1-s1', title:'第一党小组考勤表收集', done:true },
        { id:'da1-s2', title:'第二党小组考勤表收集', done:true },
        { id:'da1-s3', title:'第三党小组考勤表收集', done:false },
        { id:'da1-s4', title:'全支部出勤率汇总', done:false },
      ]},
      { id:'dt1', title:'考勤纪检专班', type:'专班', domain:'纪检', desc:'统筹支部全体活动考勤', sub:[
        { id:'dt1-s1', title:'补课通知机制上线', done:false },
        { id:'dt1-s2', title:'月度复盘报告模板', done:false },
      ]},
    ],
    active: [
      { id:'da2', title:'季度考勤报告', type:'活动', domain:'纪检', desc:'Q1出勤率统计中', sub:[
        { id:'da2-s1', title:'Q1全量活动列表核对', done:true },
        { id:'da2-s2', title:'逐活动统计出勤数据', done:false },
        { id:'da2-s3', title:'补课完成情况检查', done:true },
      ]},
    ],
  },
};
