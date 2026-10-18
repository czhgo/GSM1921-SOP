// role: [工程师]+[AI]
// 成员工作台 Tab：**专班动态**（2026-09-15 新增，原名「知情查看」；2026-10-04 批次 371 改名）
// ⚠ **2026-10-04 批次 371**（支书逐字「**既然只有专班 为什么不叫 专班动态 呢？请全面思考这个诉求**」）：
//   本台原本「活动 / 专班」两段——**活动那一览已由「活动动态」承载**（其自带 列表 / 日历 / 查询
//   三视图 ＋ 报名 / 表态 / 组织者入口）⇒ 本页**只出「专班」段**（`views: ['taskforce']`），
//   故**改名「专班动态」**（名实相符；与「活动动态」成对）。
//   ⚠ 专班详情卡内的新产出登记写入结构化 `workgroup_outputs`；旧 `members[].contributions` 仅作历史分工只读展示，
//     不再作为新产出的写口，避免历史字段与任务/产出记录继续混写。
//     本页仍是 `readonly` 只读形态（只读指的是「专班记录不可编辑」，与「本人产出填报」不冲突）。
// 深链兜底：若 URL 带 `activityId`，`insight-view` 会把 `activity` 段临时并入（否则定位目标无处可显）。

let _tfObserver = null;

// 2026-10-18 脏专项：本页实际能力＝只读浏览 + 本人产出登记，页头不再写「只读」。
// 共享组件 taskforce-view 同时服务组长/纪检只读台，故不改组件，只在本台渲染后就地校正文案与分区顺序。
function _syncTfCopy(container) {
  container.querySelectorAll('h3').forEach((h) => {
    if (h.textContent.trim() === '专班查看') h.textContent = '专班动态';
  });
  container.querySelectorAll('span').forEach((s) => {
    const text = s.textContent || '';
    if (text.includes('全支部专班一览') && text.includes('只读')) {
      s.textContent = '全支部专班一览 · 点击卡片查看详情；本人所属运行中专班可登记产出';
    } else if (text.includes('全支部一览') && text.includes('只读')) {
      s.textContent = '全支部专班一览 · 本人所属运行中专班可登记产出';
    }
  });
}

// 产出登记是「我的产出」写口，不是专班只读信息的一部分：移到详情下部独立区，已有产出在上。
function _liftOutputForm(container) {
  const panel = container.querySelector('#tfv-detail');
  const addBtn = panel?.querySelector('#tfv-output-add');
  if (!addBtn) return;
  const section = addBtn.closest('.pt-3');
  if (!section || section.id === 'tfv-output-section') return;
  section.id = 'tfv-output-section';
  const title = section.querySelector('h5');
  if (title) title.textContent = '我的产出登记 · 仅写入本人产出，不改专班只读信息';
  panel.appendChild(section);
}

function _watchTfView(container) {
  _tfObserver?.disconnect();
  if (typeof MutationObserver === 'undefined') return;
  _tfObserver = new MutationObserver(() => {
    _syncTfCopy(container);
    _liftOutputForm(container);
  });
  _tfObserver.observe(container, { childList: true, subtree: true });
}

export function renderContent(ctx) {
  const el = document.getElementById('visitor-tab-content');
  if (!el) return null;
  return import('../../../components/record/insight-view.js?v=20261018h').then(m => m.renderInsightView(el, {
    // 只出专班段（活动一览在「活动动态」——见头注）
    views: ['taskforce'],
    defaultView: 'taskforce',
    highlightActId: ctx?.highlightActId || null,
    highlightTfId: ctx?.highlightTfId || null,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  })).then(() => {
    _syncTfCopy(el);
    _liftOutputForm(el);
    _watchTfView(el);
  });
}
