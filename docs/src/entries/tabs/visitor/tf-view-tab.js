// role: [工程师]+[AI]
// 成员工作台 Tab：**专班动态**（2026-09-15 新增，原名「知情查看」；2026-10-04 批次 371 改名）
// ⚠ **2026-10-04 批次 371**（支书逐字「**既然只有专班 为什么不叫 专班动态 呢？请全面思考这个诉求**」）：
//   本页活动一览已由「活动动态」承载（其自带 列表 / 日历 / 查询 三视图 ＋ 报名 / 表态 / 组织者入口）
//   ⇒ 本页**不再出「活动一览」**（活动只在活动详情可办事）。
//   2026-10-24（spec Task 5）补「工作组」只读段（活动工作组）；因页签名锁定「专班动态」，
//   **默认段仍落专班**，工作组作为第二段供知情查看。
//   ⚠ 专班详情卡内的新产出登记写入结构化 `workgroup_outputs`；旧 `members[].contributions` 仅作历史分工只读展示，
//     不再作为新产出的写口，避免历史字段与任务/产出记录继续混写。
// 深链兜底：`activityId` 由 `insight-view` 映射到「工作组」段的所属活动（否则定位目标无处可显）。

let _tfObserver = null;

// 本页＝只读浏览 + 本人产出登记；共享组件 taskforce-view 同时服务组长/纪检只读台，故只在本台渲染后就地校正文案与分区顺序。
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

/**
 * 成员视角的专班只读视图增强（2026-10-25 IA 62→45）：本页签已并入「项目分工 · 专班」区，
 * 增强逻辑（文案归一 + 「我的产出登记」下移独立区）仍只此一份，供 `projects-tab.js` 复用。
 * @param {HTMLElement} container 承载 `taskforce-view` 的容器
 */
export function enhanceTaskforceViewForMember(container) {
  if (!container) return;
  _syncTfCopy(container);
  _liftOutputForm(container);
  _watchTfView(container);
}

export function renderContent(ctx) {
  const el = document.getElementById('visitor-tab-content');
  if (!el) return null;
  return import('../../../components/record/insight-view.js?v=20261028b').then(m => m.renderInsightView(el, {
    title: '专班动态',
    // 工作组 + 专班两段（活动一览在「活动动态」——见头注）；页签名锁定「专班动态」⇒ 默认仍落专班
    views: ['workgroup', 'taskforce'],
    defaultView: 'taskforce',
    highlightWorkgroupId: ctx?.highlightWorkgroupId || null,
    highlightActId: ctx?.highlightActId || null,
    highlightTfId: ctx?.highlightTfId || null,
    onLocated: () => { if (ctx?.onNavLocated) ctx.onNavLocated(); },
  })).then(() => {
    _syncTfCopy(el);
    _liftOutputForm(el);
    _watchTfView(el);
  });
}
