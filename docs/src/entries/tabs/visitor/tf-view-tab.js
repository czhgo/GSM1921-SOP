// role: [工程师]+[AI]
// 成员工作台 Tab：**专班动态**（2026-09-15 新增，原名「知情查看」；2026-10-04 批次 371 改名）
// ⚠ **2026-10-04 批次 371**（支书逐字「**既然只有专班 为什么不叫 专班动态 呢？请全面思考这个诉求**」）：
//   本台原本「活动 / 专班」两段——**活动那一览已由「活动动态」承载**（其自带 列表 / 日历 / 查询
//   三视图 ＋ 报名 / 表态 / 组织者入口）⇒ 本页**只出「专班」段**（`views: ['taskforce']`），
//   故**改名「专班动态」**（名实相符；与「活动动态」成对）。
//   ⚠ **专班详情卡内的「我的产出填报」写口原地保留**（2026-10-04 批次 370 出表时查清：它是成员
//     自报专班产出的**唯一可达入口**，真机流程 `visitor-insight-taskforce-contribution` 正测它）——
//     本页仍是 `readonly` 只读形态（只读指的是「专班记录不可编辑」，与「本人产出填报」不冲突）。
// 深链兜底：若 URL 带 `activityId`，`insight-view` 会把 `activity` 段临时并入（否则定位目标无处可显）。

export function renderContent(ctx) {
  const el = document.getElementById('visitor-tab-content');
  if (!el) return null;
  return import('../../../components/record/insight-view.js?v=20261006f').then(m => m.renderInsightView(el, {
    // 只出专班段（活动一览在「活动动态」——见头注）
    views: ['taskforce'],
    defaultView: 'taskforce',
    highlightActId: ctx?.highlightActId || null,
    highlightTfId: ctx?.highlightTfId || null,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  }));
}
