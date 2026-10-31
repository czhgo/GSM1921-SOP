// role: [工程师]+[AI]
// 宣传委员工作台 Tab：档案归档（T-279 M3 拆分，照 M2 样板）
// 归档记录纯读 + 材料标准/模板 + 归档推进浮窗（材料确认清单）+ 上传宣传材料（attachments 双模式）。

import { icon } from '../../../core/base/icons.js?v=20261031a';
import { solidAccentStyle, activityTypeBadgeVariant, isActivityArchived } from '../../../core/domain/constants.js?v=20261031a';
import { POLICY_DEFAULTS } from '../../../core/domain/policy-defaults.js?v=20261031a';
// 活动类型胶囊（批次 301）：类别色走单一源（三会一课＝brand 红 / 主题党日＝gold 金），渲染唯一源 badge.js
import { badgeHtml } from '../../../components/ui/badges.js?v=20261031a'; // 扎口出口（批次 304 收回，勿直连 badge.js）
import { showToast, downloadCSV, downloadBlob, downloadUrl, _fmtDate, escHtml, todayLocal } from '../../../core/base/utils.js?v=20261031a';
// 2026-10-21 批次 497：本 tab 四个浮层（上传材料 / 文件外发 / 上传照片 / 标注照片）全部改走 `openModal`，
//   不再自建 overlay（统一 dialog 语义、sticky footer 与取消语义）。
import { openModal, closeModal, confirmDanger } from '../../../components/ui/modal.js?v=20261031a';
import { persist, getAuthToken, getApiBaseUrl, getAdapter } from '../../../data/data-adapter.js?v=20261031a';
import { withSelectedBranchScope } from '../../../data/api-adapter.js?v=20261031a';
import { mockDB } from '../../../core/domain/domain.js?v=20261031a';
import { bumpToken } from '../../../core/base/version-token.js?v=20261031a'; // P0 域缓存失效（spec §二.3）
import { loadActivities, listPublicityDrafts, setPublicityDraftStatus, PUBLICITY_DRAFT_STATUS, listGalleryCandidates, setGalleryFeatured, setGalleryPinned, isGalleryFeatured, isGalleryPinned } from '../../../services/activity/activity.js?v=20261031a';
import { isApiMode } from '../../../services/core/runtime.js?v=20261031a';
import { AuthStore, currentUserId } from '../../../services/core/auth.js?v=20261031a';
import { getPersonName } from '../../../services/member/person.js?v=20261031a';
// 批次 352（`D-746` · `D-744`② 业务过程类余项）：照片记录「作废（软）」——统一写口 ＋ 支委层判据
import * as SoftVoid from '../../../services/governance/soft-void.js?v=20261031a';
import { openVoidModal } from '../../../components/ui/void-record.js?v=20261031a';
import { addExternalDispatch, loadExternalDispatches, loadActiveDispatches } from '../../../services/activity/external-dispatch.js?v=20261031a';
// R2-40：归档材料写口（mock/api 同源）——api 落 archive_records、mock 落 localStorage
import { ArchiveStore } from '../../../services/activity/archive.js?v=20261031a';
// A② 归档缺口判据单一源（支书台「宣传材料待归档」实时组同源）：已归档但无归档记录的活动
import { getArchiveGapActivities, getEndedUnarchivedActivities } from '../../../services/governance/secretary-overview.js?v=20261031a';
// 统一检索引擎（支书 2026-09-13 裁定）：第一列是活动的表格一律接入（关键词 + 分面；≤8 行自动不渲染检索条）
import { renderFilteredList } from '../../../components/ui/list-filter.js?v=20261031a';
import { renderTabHeader } from '../../../components/shell/page-frame.js?v=20261031a';
// 材料页深链 focusActivityId 的通用定位（只滚动 + 闪烁，不另造筛选器）
import { focusActivityAnchor } from '../../../components/ui/detail-anchor.js?v=20261031a';
import { renderDisclosure, bindDisclosures } from '../../../components/ui/disclosure.js?v=20261031a';
// Task 6：档案行位于跨对象聚合面（非活动所属工作台）⇒ direct 完整详情页；缺 id 退回纯文本行。
import { objectDetailHref } from '../../../core/domain/object-route.js?v=20261031a';

/** 活动行链接单一出口（Task 6.6：原生 a 即键盘可达；hover 下划线 + 箭头作为可点线索）。 */
import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261031a';
function _activityLinkHtml(activityId, className, innerHtml, title) {
  const href = objectDetailHref('activity', activityId, { entry: 'archive-row' });
  if (!href) return `<div class="${className}">${innerHtml}</div>`;
  return `<a href="./${href}" class="${className} hover:text-accent" title="${escHtml(title || '查看活动详情')}">${innerHtml}</a>`;
}

// ── 档案归档 ─────────────────────────────────────────────
// 种子数据已提升为全局（data/mock/seed.js SEED_ARCHIVE_RECORDS，loadDB 时注入），
// 保证产出物区/关闭条件等跨页同源读取；本页只做纯读。
function _loadArchiveRecords() {
  return mockDB.archiveRecords || [];
}

const ARCHIVE_CATEGORY_STYLE = {
  '新闻稿': 'bg-rose-50 text-rose-700',
  '照片': 'bg-sky-50 text-sky-700',
  '视频': 'bg-violet-50 text-violet-700',
  '其他': 'bg-gray-50 text-gray-600',
};
const ARCHIVE_STATUS_LABEL = { pending: '待归档', in_progress: '归档中', archived: '已归档' };
const ARCHIVE_STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  archived: 'bg-green-50 text-green-700 border-green-200',
};

// ── 材料标准数据 ──
const MATERIAL_STANDARDS = [
  { category: '新闻稿', standard: '含标题、正文、配图（3张以上）、署名，Word + PDF 双格式' },
  { category: '照片', standard: '原图（≥3MB），横版为主，含全景+特写，命名：日期_活动名_序号' },
  { category: '视频', standard: '1080p 及以上，稳定画面，含字幕更佳，MP4 格式' },
  { category: '其他', standard: '根据材料类型确保完整性和可追溯性' },
];

// ── 模板数据 ──
const ARCHIVE_TEMPLATES = [
  { id: 'tpl1', name: '活动新闻稿模板', category: '新闻稿', format: 'Word' },
  { id: 'tpl2', name: '照片归档清单模板', category: '照片', format: 'Excel' },
  { id: 'tpl3', name: '视频元数据表模板', category: '视频', format: 'Excel' },
];

export function renderContent(ctx) {
  const container = document.getElementById('prop-tab-content');
  if (!container) return;

  const pendingArchives = getArchiveGapActivities().filter(isActivityArchived);
  // B4（2026-09-12）：宣传概况「待归档活动 N 个」判据 = 已结束未归档活动 → 归档页同判据列明细并可直接归档；2026-10-18 繁专项 Task 15：活动归档判据统一走 isActivityArchived（不再用活动状态判断已归档）。
  const endedUnarchived = getEndedUnarchivedActivities().filter(a => !isActivityArchived(a));
  // B07（2026-10-20）：首屏只留「动作面」——待归档活动 / 宣传初稿 / 待补材料按处理先后前置；
  //   归档记录 / 活动风采 / 照片墙属「已归档展示」，同屏会与动作面争首屏 ⇒ 合并进一张折叠区；
  //   模板与材料标准说明是低频查阅 ⇒ 页尾折叠并给 help.html 深链（不占首屏）。
  const archivedRecordCount = _loadArchiveRecords().length;
  const galleryCount = listGalleryCandidates().length;
  const photoCount = _loadImageRecords().length;
  const publicityDrafts = listPublicityDrafts();
  // 2026-10-24 批次 508：三块动作面（待归档活动 / 宣传初稿 / 归档缺口）全空时，页面原只剩标题 +
  //   一个静默空壳（用户以为没加载出来）。改为在**主体位置**给一张空态卡，并把「已归档记录在下方
  //   折叠区」这句去向写出来；「上传材料」按钮仍在上方可见（不藏入口，空态也能直接补材料）。
  const actionFacesEmpty = endedUnarchived.length === 0 && publicityDrafts.length === 0 && pendingArchives.length === 0;
  container.innerHTML = `
    ${renderTabHeader({ title: '档案归档', description: '待归档活动、宣传初稿与待补材料；归档后即可回看。' })}
    ${_renderWeeklySlot()}

    <div class="mb-4 flex flex-col sm:flex-row gap-3 items-center justify-end">
      <button id="archive-upload-btn" class="btn-accent-soft flex-shrink-0 flex items-center justify-center gap-1.5" >
        ${icon('upload', { className: 'w-3.5 h-3.5' })}
        <span>上传材料</span>
      </button>
    </div>

    ${actionFacesEmpty ? _renderEmptyStateCard() : ''}

    ${_renderEndedUnarchivedSection(endedUnarchived)}

    ${_renderPublicityDraftSection(publicityDrafts)}

    ${_renderPendingArchiveSection(pendingArchives)}

    <details class="card rounded-xl p-4 mb-6" id="archive-display-fold">
      <summary class="font-title-cn text-sm font-bold text-gray-700 cursor-pointer select-none">
        已归档展示
        <span class="text-xs font-normal text-gray-500 ml-1.5">归档记录 ${archivedRecordCount} · 活动风采 ${galleryCount} · 照片 ${photoCount}</span>
      </summary>
      <div class="mt-4 space-y-6">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <h4 class="text-sm font-bold text-gray-700">归档记录</h4>
          </div>
          <div id="archive-list"></div>
        </div>
        ${_renderGallerySection()}
        ${_renderPhotoWallSection(ctx)}
      </div>
    </details>

    <details class="card rounded-xl p-4" id="archive-template-fold">
      <summary class="font-title-cn text-sm font-bold text-gray-700 cursor-pointer select-none">
        归档模板与材料标准
        <span class="text-xs font-normal text-gray-500 ml-1.5">下载</span>
      </summary>
      <div class="mt-3 space-y-2">
        ${ARCHIVE_TEMPLATES.map(t => `
          <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
            <div>
              <span class="text-xs font-medium text-gray-700">${t.name}</span>
              <span class="text-xs px-1.5 py-0.5 rounded-full ${ARCHIVE_CATEGORY_STYLE[t.category]} ml-1.5">${t.category}</span>
            </div>
            <button class="btn-outline archive-tpl-btn text-xs px-3 py-1.5" data-tpl-name="${t.name}">下载</button>
          </div>
        `).join('')}
        <p class="help-note pt-1"><a href="./help.html#card-dom38-archive" class="help-note__link">见帮助 · 档案归档</a></p>
      </div>
    </details>
  `;

  // 周报（归档特例）折叠区：懒挂 `weekly-tab.js`（实现单一源，本页只提供宿主容器）
  // 2026-10-25 Task 3：原生 details——展开态在 `open` 属性上，不再用 `_weeklyOpen` + `.hidden`。
  const wDetails = container.querySelector('#archive-weekly');
  const wHost = container.querySelector('#archive-weekly-host');
  if (wDetails && wHost) {
    bindDisclosures(container);
    const mountWeekly = () => {
      if (!wHost.dataset.weeklyMounted) _mountWeekly(wHost, ctx);
    };
    if (wDetails.open) mountWeekly();
    wDetails.addEventListener('toggle', () => {
      if (wDetails.open) mountWeekly();
    });
  }

  // 活动风采收录列表（**统一检索引擎**：行数达门槛即出检索条并分页——见 `page-sweep` P11；
  // 写口单一源 = services/activity/activity.js::setGalleryFeatured）
  const gHost = container.querySelector('#prop-gallery-list');
  if (gHost) {
    renderFilteredList(gHost, {
      stateKey: 'prop-gallery-candidates',
      rows: listGalleryCandidates(),
      keyword: { keys: ['title', 'date'], placeholder: '搜索活动名称…' },
      countUnit: '个',
      listClass: 'space-y-2',
      emptyMessage: '无可收录的活动',
      // 排序权重（2026-09-30 批次 298）：置顶 ＞ 已收录；组内按活动日期倒序
      sort: (a, b) => ((isGalleryPinned(b) ? 1 : 0) - (isGalleryPinned(a) ? 1 : 0))
        || ((isGalleryFeatured(b) ? 1 : 0) - (isGalleryFeatured(a) ? 1 : 0))
        || String(b.date || '').localeCompare(String(a.date || '')),
      rowHtml: _galleryRowHtml,
    });
    // 置顶 / 收录 撤下（容器委托；列表重绘后仍有效）
    gHost.addEventListener('click', (e) => {
      const me = AuthStore.getCurrentUser() || {};
      const pinBtn = e.target.closest('.gallery-pin-btn');
      if (pinBtn) {
        const res = setGalleryPinned({ activityId: pinBtn.dataset.activityId, on: pinBtn.dataset.on !== 'true', by: me.personId, role: me.role });
        if (!res.ok) { showToast('error', res.reason || '操作失败'); return; }
        showToast('success', pinBtn.dataset.on === 'true' ? '已取消置顶' : '已置顶（首页排在最前）');
        renderContent(ctx);
        return;
      }
      const btn = e.target.closest('.gallery-feature-btn');
      if (!btn) return;
      const res = setGalleryFeatured({ activityId: btn.dataset.activityId, on: btn.dataset.on !== 'true', by: me.personId, role: me.role });
      if (!res.ok) { showToast('error', res.reason || '操作失败'); return; }
      showToast('success', btn.dataset.on === 'true' ? '已从活动风采撤下' : '已收录到活动风采');
      renderContent(ctx);
    });
  }

  // 归档记录列表：统一检索引擎（关键词 活动名/材料名 + 分面 类别/状态；≤8 行自动不渲染检索条）
  renderFilteredList(container.querySelector('#archive-list'), {
    stateKey: 'prop-archive-records',
    rows: _loadArchiveRecords(),
    keyword: { keys: ['activityName', 'fileName'], placeholder: '搜索活动名称 / 材料名…' },
    facets: [
      { key: 'category', label: '类别' },
      { key: 'status', label: '状态', format: (v) => ARCHIVE_STATUS_LABEL[v] || v },
    ],
    countUnit: '条',
    listClass: 'space-y-2',
    emptyMessage: '无匹配的归档记录',
    sort: (a, b) => String(b.archiveDate || '').localeCompare(String(a.archiveDate || '')),
    rowHtml: _archiveRowHtml,
  });

  // 归档推进按钮（B3 2026-09-12）：改用列表容器事件委托（见下方 #archive-list 委托）——
  // 旧实现按渲染时一次性 querySelectorAll 绑定，筛选/搜索重写 #archive-list 后新按钮无监听 → 点击全失效。

  // B4：待归档活动区只读（2026-10-21 批次 498 支书裁定）——
  //   「归档活动」是活动生命周期动作，归支书 / 本场组织者在活动详情办理；宣传台只归档材料。
  //   此处保留只读清单（哪些活动材料仍未归档）作为提示，不给第二个写口。
  // 待归档活动：接统一检索引擎（批次 47-H / Q-23-40）——行数达门槛即出检索条并分页；
  // 空数据时 _renderEndedUnarchivedSection 返回 ''，故须判宿主存在再挂。
  const endedHost = container.querySelector('#archive-ended-list');
  if (endedHost) {
    renderFilteredList(endedHost, {
      stateKey: 'archive-ended-unarchived',
      rows: endedUnarchived,
      keyword: { keys: ['title', 'type', 'date'], placeholder: '搜索活动名称 / 类型…' },
      facets: [{ key: 'type', label: '类型', format: (v) => v || '未标类型' }],
      countUnit: '个',
      listClass: 'space-y-2',
      emptyMessage: '无待归档活动',
      rowHtml: _endedUnarchivedCardHtml,
    });
  }

  // ── SOP-B-38 宣传初稿审核位（2026-09-19 批次 94）：定稿 / 退回修改 ──
  // 状态位与写口单一源 = services/activity/activity.js::setPublicityDraftStatus（勿在此另写状态名）。
  container.querySelector('#prop-publicity-draft-list')?.addEventListener('click', (e) => {
    const finalizeBtn = e.target.closest('.pdraft-finalize');
    const returnBtn = e.target.closest('.pdraft-return');
    if (!finalizeBtn && !returnBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const btn = finalizeBtn || returnBtn;
    const activityId = btn.dataset.activityId;
    const index = parseInt(btn.dataset.idx);
    const actorId = AuthStore.getCurrentUser()?.personId;
    let res;
    if (finalizeBtn) {
      res = setPublicityDraftStatus({ activityId, index, status: PUBLICITY_DRAFT_STATUS.FINALIZED, actorId });
      if (res.ok) showToast('success', '已定稿——该宣传成稿可走归档（材料标准检查清单照既有流程）');
    } else {
      const note = window.prompt('退回说明（可留空）——将随留痕显示给撰写人：', '') || '';
      res = setPublicityDraftStatus({ activityId, index, status: PUBLICITY_DRAFT_STATUS.DRAFT, actorId, note });
      if (res.ok) showToast('success', '已退回修改（回到初稿状态）');
    }
    if (!res.ok) { showToast('error', `操作失败：${res.reason}`); return; }
    renderContent(ctx);
  });

  // 模板下载按钮（T-304 A 档：假提示 → 真实文件下载）
  container.querySelectorAll('.archive-tpl-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tpl = ARCHIVE_TEMPLATES.find(t => t.name === btn.dataset.tplName);
      if (!tpl) return;
      _downloadTemplate(tpl);
    });
  });

  // 已归档材料下载（T-304 A 档：mock base64 直下 / server 带鉴权拉取；事件委托防搜索重渲染失效）
  container.querySelector('#archive-list')?.addEventListener('click', async (e) => {
    // B3（2026-09-12）：归档推进按钮同走容器委托——筛选/搜索重写列表后仍可弹出材料确认浮窗
    const advanceBtn = e.target.closest('.archive-advance-btn');
    if (advanceBtn) {
      e.stopPropagation();
      const record = _loadArchiveRecords().find(r => r.id === advanceBtn.dataset.recordId);
      if (!record || record.status === 'archived') return;
      _showArchiveAdvancePopover(record, advanceBtn, ctx);
      return;
    }
    // C④ 2026-09-10 裁定：行内可选外发按钮（上传不再强制弹窗，点击此处才唤起外发确认）
    const dispatchBtn = e.target.closest('.archive-dispatch-btn');
    if (dispatchBtn) {
      const record = _loadArchiveRecords().find(r => r.id === dispatchBtn.dataset.recordId);
      if (!record) return;
      _promptExternalDispatch(record.activityId, record.activityName, ctx, () => renderContent(ctx));
      return;
    }
    // 批次 352b（`D-746`）：外发记录「作废（软）」——支委直接作废 / 其余人报支委会（单一源弹窗）
    const dispatchVoidBtn = e.target.closest('.archive-dispatch-void-btn');
    if (dispatchVoidBtn) {
      const rec = loadExternalDispatches().find(d => d.id === dispatchVoidBtn.dataset.edId);
      if (!rec) return;
      openVoidModal({
        resource: 'externalDispatches', id: rec.id, label: '外发记录',
        subject: rec.refLabel || rec.id,
        onDone: () => renderContent(ctx),
      });
      return;
    }
    // 2026-09-22 批次 145（支书裁定二）：党建平台上报留痕——与「标记已发送」并列的第二枚（只留痕、不对接）
    const platformBtn = e.target.closest('.archive-platform-btn');
    if (platformBtn) {
      const record = _loadArchiveRecords().find(r => r.id === platformBtn.dataset.recordId);
      if (!record) return;
      _markPlatformReported(record);
      showToast('success', '已留痕：该活动材料标记为已上报北京大学智慧党建平台');
      renderContent(ctx);
      return;
    }
    const dlBtn = e.target.closest('.archive-file-dl-btn');
    if (dlBtn) {
      const record = _loadArchiveRecords().find(r => r.id === dlBtn.dataset.recordId);
      if (!record || !record.fileName) return;
      dlBtn.disabled = true;
      const ok = await _downloadArchiveFile(record);
      dlBtn.disabled = false;
      if (ok) showToast('success', `「${record.fileName}」已下载`);
      else showToast('error', `「${record.fileName}」下载失败`);
      return;
    }
    // D 档文件闭环：材料删除（mock 删本地记录；server 连物理文件一起删）
    const delBtn = e.target.closest('.archive-file-del-btn');
    if (delBtn) {
      const record = _loadArchiveRecords().find(r => r.id === delBtn.dataset.recordId);
      if (!record || !record.fileName) return;
      if (!await confirmDanger({ id: 'archive-file-delete', title: `删除材料「${record.fileName}」`, bodyHtml: `<p class="text-sm text-gray-700">从档案归档中删除这条材料。<br>影响：本活动的材料清单少一条${record.filePath ? '，服务器上的物理文件一并删除' : ''}；活动与归档记录本身不变。<br><b>不可恢复</b>。</p>`, confirmLabel: '删除' })) return;
      await _deleteArchiveFile(record);
      showToast('success', `材料「${record.fileName}」已删除`);
      renderContent(ctx);
    }
  });

  // 照片墙（批次 120 · 支书 2026-09-20 定案「建，并入档案归档」）：
  //   上传 → 上传接口拿 URL（不用记录内 base64）；标注 → imageRecords 写口；按拍摄日期分组展示。
  //   展开 / 标注按钮走 #photo-wall-groups 容器委托（分组由本页重渲染重建，防「点了没反应」，见批次 119）。
  container.querySelector('#photo-upload-btn')?.addEventListener('click', () => _showPhotoUploadModal(ctx));
  const photoHost = container.querySelector('#photo-wall-groups');
  if (photoHost) {
    photoHost.addEventListener('click', (e) => {
      const moreBtn = e.target.closest('.pw-more-btn');
      if (moreBtn) {
        e.stopPropagation();
        _photoGroupExpanded.add(moreBtn.dataset.photoDate);
        renderContent(ctx);
        return;
      }
      const annoBtn = e.target.closest('.pw-annotate-btn');
      if (annoBtn) {
        e.stopPropagation();
        const rec = _loadImageRecords().find(r => r.id === annoBtn.dataset.photoId);
        if (rec) _showPhotoAnnotateModal(rec, ctx);
        return;
      }
      // 批次 352（`D-746`）：照片「作废（软）」——支委直接作废 / 其余人报支委会（单一源弹窗）
      const voidBtn = e.target.closest('.pw-void-btn');
      if (voidBtn) {
        e.stopPropagation();
        const rec = _loadImageRecords().find(r => r.id === voidBtn.dataset.photoId);
        if (rec) {
          openVoidModal({
            resource: 'imageRecords', id: rec.id, label: '照片',
            subject: rec.title || rec.fileName || '未命名照片',
            onDone: () => renderContent(ctx),
          });
        }
      }
    });
    _hydratePhotoThumbs(photoHost);
  }

  // 上传材料按钮（attachments 双模式：mock base64 / server multipart）
  container.querySelector('#archive-upload-btn')?.addEventListener('click', () => {
    _showArchiveUploadModal(ctx);
  });

  // 材料页深链（2026-10-20）：本场活动的归档行 / 待归档卡滚到视野。
  // 2026-10-24 批次 508：归档行在「已归档展示」折叠区内——折叠时无法布局，定位必然落空。
  //   ⇒ 先把折叠区展开，再定位；定位函数返回 false（找不到该活动 / 仍不可见）时给明确提示，
  //   不再「滚了但页面没动」的静默失败。
  if (ctx?.focusActivityId) {
    const fold = document.getElementById('archive-display-fold');
    if (fold) fold.open = true;
    if (!focusActivityAnchor(container, ctx.focusActivityId)) {
      showToast('info', '未找到该活动的归档行（可能尚未归档或材料未上传）');
    }
  }
}

/** 活动风采「收录」管理（2026-09-29 批次 294 · 支书裁：「活动是否上传到活动风采」＝宣传委员之权）。
 *  收录 / 撤下写主源 `galleryFeatured`；候选与判据单一源 = services/activity/activity.js
 *  （`listGalleryCandidates` / `isGalleryFeatured` / `setGalleryFeatured`）——本页不另写判据。 */
function _renderGallerySection() {
  const all = listGalleryCandidates();
  if (!all.length) return '';
  const featured = all.filter(isGalleryFeatured);
  return `
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-1.5">
        <h4 class="text-sm font-bold text-gray-700">活动风采</h4>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">已收录 ${featured.length} 项</span>
      </div>
      <div id="prop-gallery-list"></div>
    </div>`;
}

/** 收录行（收 / 撤一枚开关；判据单源见 _renderGallerySection）
 *  ⚠ 2026-09-29 批次 295：**减文案**（贴合 §4.18 C4 每屏文案/控件比）——去掉类型 chip、
 *  「活动日期：」前缀、以及「已收录」徽标（**按钮已说**：是「撤下」就说明已收录 ⇒ UI 自明）。 */
function _galleryRowHtml(a) {
  const on = isGalleryFeatured(a);
  const pinned = isGalleryPinned(a);
  const btnCls = on
    ? 'bg-white text-gray-600 border-gray-200 hover:bg-surface-hover'
    : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100';
  return `
      <div class="p-3 rounded-xl bg-white border border-gray-100 flex items-center justify-between gap-3">
        ${_activityLinkHtml(a.id, 'flex-1 min-w-0', `
          <div class="text-sm font-medium text-gray-800 truncate">${escHtml(a.title || '未命名活动')}</div>
          <span class="text-xs text-gray-500">${escHtml(a.date || '—')} <span class="text-accent" aria-hidden="true">→</span></span>`, a.title || '未命名活动')}
        ${on ? `<button type="button" class="btn-outline gallery-pin-btn text-xs px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${pinned ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-surface-hover'}"
                data-activity-id="${escHtml(a.id)}" data-on="${pinned ? 'true' : 'false'}">${pinned ? '取消置顶' : '置顶'}</button>` : ''}
        <button type="button" class="btn-outline gallery-feature-btn text-xs px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${btnCls}"
                data-activity-id="${escHtml(a.id)}" data-on="${on ? 'true' : 'false'}">${on ? '撤下' : '收录到活动风采'}</button>
      </div>`;
}

// ── 周报（归档特例）折叠区（批次 367 · `#10` 单一轴）───────────────────────────────
// 支书 2026-10-04 逐字裁：「**周报作为 归档的一个 特例即可！！**」⇒ 原独立「周报报送」页签**降为
//   本页页内折叠区**（页签 10 → 9）。**实现单一源仍是 `entries/tabs/prop/weekly-tab.js`**
//   （本页只提供宿主容器 `#archive-weekly-host`，**不复制表单 / 不另写状态**）。
//   2026-10-25 Task 3：展开态由 `<details open>` 承载（原 `_weeklyOpen` 模块变量已删）。

/** 懒挂周报内容到宿主容器（`weekly-tab.js` 的 `renderContent(ctx, host)` 已支持传入宿主） */
function _mountWeekly(host, ctx) {
  host.dataset.weeklyMounted = '1';
  import('./weekly-tab.js?v=20261031a').then(m => {
    if (host.isConnected) m.renderContent(ctx, host);
  });
}

/** 折叠区骨架（默认收起；标题聚焦周期归档，周期来自支部制度参数）。
 *  原「归档兜底不自伤」短路已撤（D-807④ 2026-10-06）：支书/副支书不再进入本台
 *  （代归档在支书台本台浮窗直执）⇒ 本页只有宣传委员可达，周报折叠区恒呈现。 */
function _renderWeeklySlot() {
  return `
    <div class="mb-4 rounded-xl border border-gray-100 bg-white p-4 disclosure-host">
      ${renderDisclosure({
        id: 'archive-weekly',
        title: '周期归档报送',
        meta: `当前按${POLICY_DEFAULTS.archive.periodic.unit === 'month' ? '月' : '周'}`,
        open: false,
        level: 3,
        bodyHtml: '<div id="archive-weekly-host" class="pt-2"></div>',
      })}
    </div>`;
}

/** 动作面全空时的主体空态卡（2026-10-24 批次 508）：
 *  原实现在三块全空时主体一片空白（只剩标题），用户读不出「是没有待办，还是没加载出来」。
 *  这里只补一句事实 + 一句去向（已归档记录在下方折叠区），不放动作按钮——「上传材料」在页头恒在。 */
function _renderEmptyStateCard() {
  return `<div class="card rounded-xl p-6 mb-6" data-archive-empty role="status">
    ${emptyStateHtml({ text: '暂无可归档内容 · 已归档记录在下方折叠区', variant: 'panel' })}
  </div>`;
}

/** 待归档活动区（B4 2026-09-12；2026-10-21 批次 498 改为只读）：
 *  判据单一源 getEndedUnarchivedActivities（已结束未归档）。本区只提示「哪些活动材料还没归档」，
 *  **不提供归档活动写口**——活动归档归支书 / 本场组织者在活动详情办理（宣传委员归档材料，母本口径）。 */
function _renderEndedUnarchivedSection(activities) {
  if (!activities || activities.length === 0) return '';
  // 批次 47-H（支书 2026-09-15 裁定「Q-23-40 现在就接分页」）：本区原为纯 `.map()` 卡片列表——22 条时既不分页
  // 也搜不得，真机 P11 命中。现**接统一检索引擎**（行由 `_endedUnarchivedCardHtml` 渲染）。
  return `
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-1">
        <h4 class="text-sm font-bold text-gray-700">待归档活动</h4>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">${activities.length} 个活动已结束未归档</span>
      </div>
      <p class="text-xs text-gray-500 mb-2">活动归档由支书或本场组织者办理；此处只提示材料是否已补齐。</p>
      <div id="archive-ended-list"></div>
    </div>`;
}

/** 引擎行渲染器（批次 47-H）：待归档活动一卡 */
function _endedUnarchivedCardHtml(a) {
  return `
      <div class="p-3 rounded-xl bg-white border border-gray-100 flex items-center justify-between gap-3" data-archive-id="${escHtml(a.id)}">
        ${_activityLinkHtml(a.id, 'flex-1 min-w-0', `
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-gray-800 truncate">${escHtml(a.title || '未命名活动')}</span>
            ${a.type ? badgeHtml(escHtml(a.type), activityTypeBadgeVariant(a.type)) : ''}
            <span class="text-xs px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 shrink-0">已结束·未归档</span>
          </div>
          <span class="text-xs text-gray-500">活动日期：${escHtml(a.date || '—')} <span class="text-accent" aria-hidden="true">→</span></span>`, '查看活动详情')}
      </div>`;
}

/** SOP-B-38 宣传初稿（待审核）：被分工者交上来的初稿在这里审核 → 定稿 / 退回修改。
 *  判据与状态标签单一源 = services/activity/activity.js（listPublicityDrafts 缺省只列待审核）。
 *  定稿后的去向＝既有宣传材料归档链（OutputType.PUBLICITY），本区块不新开落点。 */
function _renderPublicityDraftSection(rows) {
  if (!rows || rows.length === 0) return '';
  const items = rows.map(r => `
      <div class="p-3 rounded-xl bg-white flex items-center justify-between gap-3">
        ${_activityLinkHtml(r.activity.id, 'flex-1 min-w-0', `
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-gray-800 truncate">${escHtml(r.rec.title || '未命名初稿')}</span>
            <span class="text-xs px-1.5 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200 shrink-0">待审核</span>
          </div>
          <span class="text-xs text-gray-500">${escHtml(r.activity.title || '未命名活动')} · 撰写人 ${escHtml(r.rec.author || (r.rec.recordedBy ? getPersonName(r.rec.recordedBy) : '未署名'))}${r.rec.channel ? ' · 渠道 ' + escHtml(r.rec.channel) : ''} <span class="text-accent" aria-hidden="true">→</span></span>`, '查看活动详情')}
        <div class="flex items-center gap-2 flex-shrink-0">
          <button type="button" class="btn-accent-soft pdraft-finalize text-xs px-3 py-1.5" data-activity-id="${escHtml(r.activity.id)}" data-idx="${r.index}" style="cursor:pointer;">定稿</button>
          <button type="button" class="btn-outline pdraft-return text-xs px-3 py-1.5" data-activity-id="${escHtml(r.activity.id)}" data-idx="${r.index}" style="cursor:pointer;">退回修改</button>
        </div>
      </div>`).join('');
  return `
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-1.5">
        <h4 class="text-sm font-bold text-gray-700">宣传初稿（待审核）</h4>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">${rows.length} 条待审核</span>
      </div>
      <p class="text-xs text-gray-500 mb-2">退回时可写一句修改说明。</p>
      <div class="space-y-2" id="prop-publicity-draft-list">${items}</div>
    </div>`;
}

/** 待归档区（A② 2026-09-10）：归档缺口活动（已归档但宣传材料未提交），带 data-archive-id 锚点。
 *  与下方「归档记录」列表区分：此处是「缺材料」的活动，记录列表是已建的材料条目。 */
function _renderPendingArchiveSection(activities) {
  if (!activities || activities.length === 0) return '';
  const items = activities.filter(isActivityArchived).map(a => {
    const dateLabel = a.archivedAt || a.date || '—';
    const typeLabel = a.type ? badgeHtml(escHtml(a.type), activityTypeBadgeVariant(a.type)) : '';
    return `
      <div class="p-3 rounded-xl bg-amber-50/60 border border-dashed border-amber-200 flex items-center justify-between gap-3" data-archive-id="${escHtml(a.id)}">
        ${_activityLinkHtml(a.id, 'flex-1 min-w-0', `
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-gray-800 truncate">${escHtml(a.title || '未命名活动')}</span>
            ${typeLabel}
            <span class="text-xs px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 shrink-0">待归档</span>
          </div>
          <span class="text-xs text-gray-500">活动日期：${escHtml(dateLabel)} · 宣传材料未提交（归档缺口） <span class="text-accent" aria-hidden="true">→</span></span>`, '查看活动详情')}
      </div>`;
  }).join('');
  return `
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-1.5">
        <h4 class="text-sm font-bold text-gray-700">待归档</h4>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">${activities.length} 个活动待补材料</span>
      </div>
      <div class="space-y-2" id="archive-pending-list">${items}</div>
    </div>`;
}

/** 单条归档记录行（第一列 = 活动名；行内操作按钮经 #archive-list 容器委托绑定，筛选重渲染后仍有效） */
function _archiveRowHtml(r) {
  const catStyle = ARCHIVE_CATEGORY_STYLE[r.category] || 'bg-gray-50 text-gray-600';
  const statusStyle = ARCHIVE_STATUS_STYLE[r.status];
  const isFinal = r.status === 'archived';
  const isInProgress = r.status === 'in_progress';
  const advanceLabel = r.status === 'pending' ? '开始归档' : '确认归档';
  const advanceBtn = !isFinal
    ? `<button class="btn-accent-soft archive-advance-btn text-xs px-3 py-1.5" data-record-id="${r.id}" style="cursor:pointer;">${advanceLabel}</button>`
    : '';
  // 归档中状态显示进度
  const progressHtml = isInProgress && r._checklistState
    ? `<span class="text-xs text-blue-600">材料 ${r._checklistState.checked}/${r._checklistState.total}</span>`
    : '';
  // 已归档状态显示完成标记
  const doneHtml = isFinal
    ? `<span class="text-xs text-green-700">✓</span>`
    : '';
  // 已归档材料（上传过文件）显示下载按钮 + 行内外发按钮/状态徽标
  const fileBtn = r.fileName
    ? `<button class="btn-outline archive-file-dl-btn text-xs px-2.5 py-1.5 inline-flex items-center gap-1" data-record-id="${r.id}" title="下载 ${escHtml(r.fileName)}" style="cursor:pointer;">${icon('download', { className: 'w-3 h-3' })} 下载</button>
      <button class="btn-outline archive-file-del-btn text-xs px-2.5 py-1.5" data-record-id="${r.id}" title="删除该材料（连物理文件）" style="cursor:pointer;">删除</button>`
    : '';
  // C④ 2026-09-10 裁定：外发改行内可选——未外发显示「标记已发送」按钮，已外发以徽标呈现状态
  // B4（2026-09-12）：无材料文件时不再静默隐藏入口 → 给出可见依据提示（避免「入口完全不可见」）
  const dispatchHtml = r.fileName
    ? _renderDispatchCell(r)
    : `<span class="text-xs text-gray-500 flex-shrink-0">上传材料后可标记外发</span>`;
  // 2026-09-22 批次 145（支书裁定二「归档页补一个」）：党建平台上报留痕——与既有那枚「标记已发送（微信/对外）」
  //   并列、两个动作分开记（母本 `宣传委员工作流程指南.md:49` 步 7；同文件 `:88` 周报步 4 已指周报页那枚）。
  const platformHtml = _renderPlatformCell(r);
  // 实体条目可点（2026-09-12 支书裁定）：归档记录行关联活动 → 左区包一层活动详情深链
  //（复用既有深链 activity.html?id=，与待归档区/visitor 活动动态同源；行内操作按钮不受影响）
  const titleBlock = `
      <div class="flex items-center gap-2 mb-0.5">
        <span class="text-sm font-medium text-gray-800 truncate">${r.activityName}</span>
        <span class="text-xs px-1.5 py-0.5 rounded-full ${catStyle} shrink-0">${r.category}</span>
        <span class="text-xs px-1.5 py-0.5 rounded-full border ${statusStyle} shrink-0">${ARCHIVE_STATUS_LABEL[r.status]}</span>
        ${progressHtml}${doneHtml}
        <span class="ml-auto text-accent" aria-hidden="true">→</span>
      </div>
      <span class="text-xs text-gray-500">归档日期：${r.archiveDate}${r.fileName ? ` · 材料：${escHtml(r.fileName)}` : ''} · 上传人：${escHtml(r.uploadedBy ? (getPersonName(r.uploadedBy) || r.uploadedBy) : '登记时未采集')}</span>`;
  const leftBlock = _activityLinkHtml(r.activityId, 'flex-1 min-w-0', titleBlock, '查看关联活动详情');
  return `
    <div class="p-3 rounded-xl bg-white flex items-center justify-between gap-3"${r.activityId ? ` data-archive-id="${r.activityId}"` : ''}>
      ${leftBlock}
      <div class="flex items-center gap-2 flex-shrink-0">${fileBtn}${platformHtml}${dispatchHtml}${advanceBtn}</div>
    </div>`;
}

/** 行内外发单元（C④ 2026-09-10）：未外发 → 行内微操作按钮；已外发 → 状态徽标 ＋ 作废键。
 *  状态语义与 externalDispatches（refType=publicity，refLabel=宣传材料：<活动名>）一致，不改数据模型。
 *  批次 352b（`D-746`）：读侧改走 `loadActiveDispatches()`（已作废的出列）；有记录时并列一枚「作废」。 */
function _renderDispatchCell(r) {
  const label = `宣传材料：${r.activityName || '未命名活动'}`;
  const recs = loadActiveDispatches().filter(d => d.refType === 'publicity' && d.refLabel === label);
  if (recs.length === 0) {
    return `<button class="btn-action btn-action-amber archive-dispatch-btn" data-record-id="${r.id}" style="cursor:pointer;">标记已发送（微信/对外）</button>`;
  }
  const latest = recs[recs.length - 1];
  const confirmed = recs.some(d => d.confirmedAt);
  const badge = `<span class="text-xs px-1.5 py-0.5 rounded-full border shrink-0 ${confirmed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}">${confirmed ? '已确认收到' : '已外发·待确认'}</span>`;
  const voidKey = latest.voidPending && !latest.voided
    ? '<span class="text-xs text-gray-500">待支委会确认</span>'
    : `<button class="btn-action btn-action-gray archive-dispatch-void-btn" data-ed-id="${escHtml(latest.id)}" title="软作废：该外发记录出列（发送方与接收方同时不再显示）、留痕可回查；支委可直接作废，其余人报支委会确认" style="cursor:pointer;">作废</button>`;
  return `${badge}${voidKey}`;
}

// ── 党建平台上报留痕（2026-09-22 批次 145 · 支书裁定二「归档页补一个（推荐）」）─────────────
// 与既有「标记已发送（微信/对外）」并列、**两个动作分开记**：那枚管材料外发（`externalDispatches`），
// 本枚管**报送北京大学智慧党建平台**的留痕。机制照**周报页同款**（`entries/tabs/prop/weekly-tab.js:242-243`）：
//   落 `platformReportedAt` / `platformReportedBy` 两个字段、`persist()` 落库；**只留痕、不对接**
//   （对接方是外部系统，本仓无接口）。归档记录一行一类材料、同一活动可多行 ⇒ 留痕**按活动聚合**
//   （与上面那枚按 `refLabel='宣传材料：<活动名>'` 聚合同口径），行内只是呈现位。
/** 活动聚合键（与「标记已发送」按活动名聚合同口径） */
function _platformReportKey(r) {
  return r.activityId || r.activityName || r.id;
}

/** 该活动是否已留痕；返回留痕所在记录（无则 null） */
function _platformReportOf(r) {
  const key = _platformReportKey(r);
  return _loadArchiveRecords().find(x => _platformReportKey(x) === key && x.platformReportedAt) || null;
}

/** 行内单元：未留痕 → 行内按钮；已留痕 → 状态徽标（同周报页口径） */
function _renderPlatformCell(r) {
  const rec = _platformReportOf(r);
  if (rec) {
    return `<span class="text-xs px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200 shrink-0" title="上报留痕：${(rec.platformReportedAt || '').slice(0, 16).replace('T', ' ')}">已上报党建平台</span>`;
  }
  return `<button class="btn-outline archive-platform-btn text-xs px-2.5 py-1.5 shrink-0" data-record-id="${r.id}" title="材料已报送北京大学智慧党建平台（党旗飘飘）时，在此留痕——只留痕、不对接" style="cursor:pointer;">标记已上报党建平台</button>`;
}

/** 标记「已上报党建平台」：写该活动的**全部**归档记录（同活动多行同步）＋ persist 落库 */
function _markPlatformReported(record) {
  const me = AuthStore.getCurrentUser();
  const at = new Date().toISOString();
  const by = (me && (me.personId || me.id)) || '';
  const key = _platformReportKey(record);
  for (const r of _loadArchiveRecords().filter(x => _platformReportKey(x) === key)) {
    r.platformReportedAt = at;
    r.platformReportedBy = by;
  }
  persist();
}

// ════════════════════════════════════════════════════════════════
//  T-304 A 档下载闭环：模板真实下载 + 材料下载
// ════════════════════════════════════════════════════════════════

/** 模板真实下载：新闻稿 → Word 兼容 .doc；照片/视频 → CSV（Excel 直开，UTF-8 BOM） */
function _downloadTemplate(tpl) {
  const stamp = _fmtDate(new Date());
  if (tpl.category === '新闻稿') {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>
      <h1>${tpl.name}</h1>
      <p>标题：＿＿＿＿＿＿＿＿＿＿</p>
      <p><b>一、活动背景与目的</b>：2-3 句说明为何开展。</p>
      <p><b>二、活动过程</b>：按环节展开，突出亮点与互动。</p>
      <p><b>三、活动成效与反响</b>：引用参与者反馈。</p>
      <p><b>四、配图</b>：3 张以上原图，横版为主，命名：日期_活动名_序号。</p>
      <p><b>署名</b>：＿＿＿＿（撰稿人）</p>
      <p style="color:#999">（本模板由 GSM1921 系统生成，请按材料标准填写）</p>
    </body></html>`;
    downloadBlob(`${tpl.name}_${stamp}.doc`, new Blob([html], { type: 'application/msword' }));
  } else {
    const headers = tpl.category === '照片'
      ? ['序号', '照片文件名', '拍摄日期', '活动名称', '摄影者', '备注']
      : ['序号', '视频文件名', '拍摄日期', '活动名称', '时长', '分辨率', '是否含字幕', '备注'];
    downloadCSV(`${tpl.name}_${stamp}.csv`, headers, []);
  }
  showToast('success', `模板「${tpl.name}」已下载`);
}

/** 已归档材料下载：mock=base64 dataURL 直下；server=受保护静态下载（带鉴权拉取） */
async function _downloadArchiveFile(record) {
  if (record.fileData) {
    const a = document.createElement('a');
    a.href = record.fileData;
    a.download = record.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
  if (record.filePath) {
    const baseUrl = getApiBaseUrl();
    const token = getAuthToken();
    const filePath = withSelectedBranchScope(record.filePath);
    const url = filePath.startsWith('http') ? filePath : `${baseUrl}${filePath}`;
    return downloadUrl(url, record.fileName, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  }
  return false;
}

/** 材料删除（D 档文件闭环）：mock 删本地记录；server 先调 DELETE 接口（联动删物理文件）再删内存记录 */
async function _deleteArchiveFile(record) {
  if (record.filePath) {
    // server 上传时 fileSpaceRecords 记录 id 由服务端生成，按 filePath 匹配后删除
    const fsRec = (mockDB.fileSpaceRecords || []).find(f => f.filePath === record.filePath);
    if (fsRec) {
      try {
        // 2026-10-02 批次 343（`D-744` D 档写口纪律）：**统一走适配器写口**（原为直连 `fetch` DELETE）；
        //   api 形态＝`DELETE /api/v1/fileSpaceRecords/:id`（服务端联动删物理文件），
        //   mock 形态＝`MockAdapter` 就内存 + `_saveToStorage`。
        await getAdapter().fileSpaceRecords.delete(fsRec.id);
      } catch (e) {
        console.warn('[archive] 文件空间记录删除失败：', e);
      }
      mockDB.fileSpaceRecords = mockDB.fileSpaceRecords.filter(f => f.id !== fsRec.id);
    }
  }
  // R2-40：归档记录同步走服务层删除（api → DELETE /api/v1/archiveRecords/:id；mock → localStorage）
  await ArchiveStore.removeMaterial(record.id);
  bumpToken('archiveRecord'); // P0：档案材料删除写口
  persist();
  return true;
}

// ════════════════════════════════════════════════════════════════
//  归档推进浮窗：弹出材料确认清单，而非直接改状态标签
// ════════════════════════════════════════════════════════════════
function _showArchiveAdvancePopover(record, _triggerBtn, ctx) {
  const isStart = record.status === 'pending';
  const nextStatus = isStart ? 'in_progress' : 'archived';
  const nextLabel = ARCHIVE_STATUS_LABEL[nextStatus];

  // 根据归档类别获取材料标准
  const categoryStandard = MATERIAL_STANDARDS.find(s => s.category === record.category) || MATERIAL_STANDARDS[MATERIAL_STANDARDS.length - 1];
  // 拆分材料标准为检查项
  const checklist = _parseChecklistFromStandard(categoryStandard.standard, record.category);

  // R5A-08：原自建 fixed 定位浮层（固定 380px / 无 dialog 语义 / 监听泄漏）统一迁到 openModal，
  //   复用 role=dialog、aria-modal、背景 inert、焦点接管与回还、Esc/遮罩取消。
  let bodyHtml = `<p class="text-xs text-gray-500 mb-3">${escHtml(record.activityName)} · <span class="px-1 py-0.5 rounded ${ARCHIVE_CATEGORY_STYLE[record.category] || ''}">${escHtml(record.category)}</span></p>`;

  if (isStart) {
    bodyHtml += `<p class="text-xs text-gray-600 mb-3">请确认以下材料标准是否满足：</p>`;
    bodyHtml += `<div class="space-y-2 mb-4">`;
    checklist.forEach((item, i) => {
      bodyHtml += `<label class="flex items-start gap-2.5 cursor-pointer group">`;
      bodyHtml += `<input type="checkbox" class="archive-checklist-item mt-0.5 rounded border-gray-300 text-blue-600 focus-ring" data-check-idx="${i}" />`;
      bodyHtml += `<span class="text-xs text-gray-700 leading-relaxed group-hover:text-[var(--neutral-900)]">${escHtml(item)}</span>`;
      bodyHtml += `</label>`;
    });
    bodyHtml += `</div>`;
    bodyHtml += `<div class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-4">`;
    bodyHtml += `<p class="text-[12px] text-amber-700">提示：未全部勾选也可推进状态，但请确保后续补齐。</p>`;
    bodyHtml += `</div>`;
  } else {
    bodyHtml += `<p class="text-xs text-gray-600 mb-3">确认将以下条目归档？归档后将从待处理列表移除。</p>`;
    bodyHtml += `<div class="rounded-lg bg-gray-50 px-3 py-2.5 mb-4 space-y-1.5">`;
    bodyHtml += `<div class="flex items-center justify-between text-xs"><span class="text-gray-500">活动名称</span><span class="text-gray-800 font-medium">${escHtml(record.activityName)}</span></div>`;
    bodyHtml += `<div class="flex items-center justify-between text-xs"><span class="text-gray-500">归档类别</span><span class="text-gray-800">${escHtml(record.category)}</span></div>`;
    bodyHtml += `<div class="flex items-center justify-between text-xs"><span class="text-gray-500">归档日期</span><span class="text-gray-800">${escHtml(record.archiveDate || '—')}</span></div>`;
    bodyHtml += `</div>`;
    bodyHtml += `<div class="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 mb-4">`;
    bodyHtml += `<p class="text-[12px] text-blue-700">材料标准：${escHtml(categoryStandard.standard)}</p>`;
    bodyHtml += `</div>`;
  }

  openModal({
    id: 'archive-advance',
    title: isStart ? '开始归档' : '确认归档',
    size: 'md',
    bodyHtml,
    footerHtml: `
      <button type="button" data-modal-cancel="archive-advance" class="btn-outline text-xs px-3 py-1.5" style="cursor:pointer;">取消</button>
      <button type="button" data-archive-advance-confirm class="btn-accent text-xs px-3 py-1.5">${nextLabel}</button>`,
    onMount: (panel) => {
      panel.querySelector('[data-archive-advance-confirm]')?.addEventListener('click', () => {
        if (isStart) {
          const checks = panel.querySelectorAll('.archive-checklist-item');
          const checkedCount = [...checks].filter(c => c.checked).length;
          record._checklistState = { checked: checkedCount, total: checks.length };
        }
        record.status = nextStatus;
        bumpToken('archiveRecord'); // P0：档案状态推进写口（pending→in_progress→archived，长度不变须显式 bump）
        persist();
        closeModal('archive-advance');
        showToast('success', `「${record.activityName}」${nextLabel}${isStart ? '，请按材料标准准备' : ''}`);
        renderContent(ctx);
      });
    },
  });
}

/**
 * 从材料标准文本解析出检查清单项
 */
function _parseChecklistFromStandard(standard, category) {
  // 尝试按逗号/顿号分隔
  const parts = standard.split(/[，,、；;]/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts;
  // 无法分隔时按类别返回默认清单
  const defaults = {
    '新闻稿': ['含标题', '正文完整', '配图3张以上', '署名', 'Word+PDF双格式'],
    '照片': ['原图≥3MB', '横版为主', '含全景+特写', '命名：日期_活动名_序号'],
    '视频': ['1080p及以上', '画面稳定', '含字幕（可选）', 'MP4格式'],
    '其他': ['材料完整性确认', '可追溯性确认'],
  };
  return defaults[category] || ['材料完整性确认', '可追溯性确认'];
}

// ── 上传宣传材料（attachments 双模式：mock base64 持久化 / server multipart 落盘）──
// spec §8 增量：宣传委员上传照片/简讯/报送 → 写入 archiveRecords（产出物区/关闭校验同源读取）。
// 两形态统一经 `ArchiveStore.createMaterial`（R2-40）：
// mock 模式：FileReader → base64 dataURL → MockAdapter.archiveRecords（localStorage，刷新可读）；
// server 模式：文件本体 POST /api/v1/uploads（multer 落盘 server/uploads/），
// 元数据 → fileSpaceRecords 宽表 + `POST /api/v1/archiveRecords`（archive_records 表），
// 两条记录都落库 ⇒ 刷新后产出物区/关闭校验仍能读到。
const UPLOAD_MAX_MOCK_MB = 2;  // mock 模式 localStorage 容量约束（base64 膨胀 ~33%）
const UPLOAD_MAX_SERVER_MB = 10; // 与 server/routes/uploads.js 服务端限制一致

function _showArchiveUploadModal(ctx) {
  const MODAL_ID = 'archive-upload';
  const activities = loadActivities();
  const apiMode = isApiMode();
  const maxMB = apiMode ? UPLOAD_MAX_SERVER_MB : UPLOAD_MAX_MOCK_MB;

  // T223 排序统一：关联活动下拉按 date 降序（新者在前），与全站一致
  const sortedActivities = [...activities].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const activityOptions = sortedActivities.length === 0
    ? '<option value="">（暂无活动，请先创建）</option>'
    : `<option value="">请选择关联活动</option>` + sortedActivities.map(a =>
        `<option value="${a.id}">${escHtml(a.title)}（${escHtml(a.date || '未定日期')}）</option>`
      ).join('');

  let selectedFiles = [];
  let previewUrls = [];
  /** 取消 / 关闭 / 上传成功后都要撤销预览 URL（M-5：取消＝放弃，不能留临时资源） */
  const cleanup = () => {
    previewUrls.forEach(u => URL.revokeObjectURL(u));
    previewUrls = [];
  };

  openModal({
    id: MODAL_ID,
    title: '上传宣传材料',
    width: '440px',
    bodyHtml: `
      <div class="space-y-3.5">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">关联活动 <span class="text-red-600">*</span></label>
          <select id="upload-activity" class="input-flat w-full">${activityOptions}</select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="upload-category">材料类别</label>
          <select id="upload-category" class="input-flat w-full">
            ${MATERIAL_STANDARDS.map(s => `<option value="${s.category}">${s.category}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="upload-file">选择文件（可多选）</label>
          <input id="upload-file" type="file" multiple
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xlsx,.mp4"
            class="block w-full text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 file:text-xs hover:file:bg-blue-100 transition-colors cursor-pointer" />
          <div id="upload-preview" class="mt-2 space-y-1.5"></div>
        </div>
        <div class="rounded-lg px-3 py-2 text-xs leading-relaxed ${apiMode ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}">
          ${apiMode
            ? '服务端模式：文件落服务器磁盘（jpg/png/pdf/doc/docx/xlsx/mp4，单文件 ≤' + maxMB + 'MB），元数据写入文件空间记录，产出物区同步可见。'
            : '本地模式：文件以 base64 存入本地存储（单文件 ≤' + maxMB + 'MB），刷新不丢失；产出物区/关闭校验同步可见。'}
        </div>
      </div>`,
    footerHtml: `
      <button id="upload-cancel" type="button" data-modal-cancel="${MODAL_ID}" class="btn-outline text-xs px-3 py-1.5">取消</button>
      <button id="upload-confirm" type="button" class="btn-accent-soft text-xs px-3 py-1.5" style="cursor:pointer">上传</button>`,
    onCancel: cleanup,
    onMount: (card) => {
      const renderPreview = () => {
        const previewEl = card.querySelector('#upload-preview');
        previewEl.innerHTML = selectedFiles.map((f, i) => {
          const isImage = f.type && f.type.startsWith('image/');
          const thumb = isImage
            ? `<img src="${previewUrls[i]}" class="w-9 h-9 rounded object-cover border border-gray-200 flex-shrink-0" alt="" />`
            : `<span class="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 tint-fill" data-tone="info">${icon('fileText', { className: 'w-4 h-4' })}</span>`;
          return `<div class="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            ${thumb}
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-700 truncate">${escHtml(f.name)}</p>
              <p class="text-xs text-gray-500">${(f.size / 1024).toFixed(1)} KB</p>
            </div>
            <button class="btn-outline btn-icon upload-file-remove" data-idx="${i}" aria-label="移除该文件">&times;</button>
          </div>`;
        }).join('') || '<p class="text-xs text-gray-500 text-center py-3">尚未选择文件</p>';
      };

      // 文件选择：过滤超限文件并渲染预览
      card.querySelector('#upload-file').addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        const maxBytes = maxMB * 1024 * 1024;
        const oversized = files.filter(f => f.size > maxBytes);
        if (oversized.length > 0) {
          showToast('error', `${oversized.map(f => f.name).join('、')} 超出 ${maxMB}MB 限制，已剔除`);
        }
        selectedFiles = files.filter(f => f.size <= maxBytes);
        cleanup();
        previewUrls = selectedFiles.map(f => URL.createObjectURL(f));
        renderPreview();
      });

      // 移除单个文件
      card.querySelector('#upload-preview').addEventListener('click', (e) => {
        const btn = e.target.closest('.upload-file-remove');
        if (!btn) return;
        const idx = Number(btn.dataset.idx);
        selectedFiles.splice(idx, 1);
        URL.revokeObjectURL(previewUrls[idx]);
        previewUrls.splice(idx, 1);
        renderPreview();
      });

      // 提交上传
      card.querySelector('#upload-confirm').addEventListener('click', async () => {
        const activityId = card.querySelector('#upload-activity').value;
        const category = card.querySelector('#upload-category').value;
        if (!activityId) {
          showToast('error', '请先选择关联活动');
          return;
        }
        if (selectedFiles.length === 0) {
          showToast('error', '请先选择文件');
          return;
        }
        const activity = activities.find(a => a.id === activityId);
        const confirmBtn = card.querySelector('#upload-confirm');
        confirmBtn.disabled = true;
        confirmBtn.textContent = '上传中…';
        try {
          const saved = await _handleArchiveUpload(selectedFiles, activityId, activity ? activity.title : '', category);
          if (saved > 0) {
            showToast('success', `已归档 ${saved} 项宣传材料`);
            // C④ 2026-09-10 裁定：上传成功不再无条件弹「文件外发确认」二次浮窗，
            // 外发改由归档行内「标记已发送（微信/对外）」按钮按需触发（见 _archiveRowHtml）。
            cleanup();
            closeModal(MODAL_ID);
            renderContent(ctx);
          }
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = '上传';
        }
      });
    },
  });
}

/** 文件流外发确认（支书 2026-08-10 裁定；C④ 2026-09-10 改为行内按需触发）：
 *  材料已归档，如需微信外发则系统内标记闭环。「暂不外发」= 不写入任何记录（语义不变）。
 *  @param {Function} [onSent] 标记成功后的回调（行内场景用于重渲染显示状态徽标） */
function _promptExternalDispatch(activityId, activityName, ctx, onSent) {
  const user = AuthStore.getCurrentUser();
  if (!user) return;
  const receiverOptions = [
    { value: 'secretary', label: '支书（审核）' },
    { value: 'disc-commissioner', label: '纪检委员（留档）' },
    { value: 'org-commissioner', label: '组织委员' },
  ];
  const MODAL_ID = 'external-dispatch';
  openModal({
    id: MODAL_ID,
    title: '文件外发确认',
    size: 'md',
    bodyHtml: `
      <div class="space-y-3.5">
        <div class="rounded-lg px-3 py-2 text-xs leading-relaxed bg-amber-50 text-amber-700 border border-amber-100">
          宣传材料已归档到系统。若还需通过<b>微信</b>把文件发给对方确认（如新闻稿送支书审核），
          请在此标记「已外发」——对方收到后会在其工作台确认，形成可审计记录（谁 / 何时 / 发给谁 / 何时确认）。
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="ed-receiver">接收方</label>
          <select id="ed-receiver" class="input-flat w-full">
            ${receiverOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="ed-note">备注（可选）</label>
          <input id="ed-note" type="text" class="input-flat w-full" placeholder="如：新闻稿终稿，请审核…" />
        </div>
      </div>`,
    footerHtml: `
      <button id="ed-skip" type="button" data-modal-cancel="${MODAL_ID}" class="btn-outline text-xs px-3 py-1.5">暂不外发</button>
      <button id="ed-confirm" type="button" class="btn-accent-soft text-xs px-3 py-1.5" style="cursor:pointer">标记已通过微信发送</button>`,
    onMount: (panel) => {
      panel.querySelector('#ed-confirm').addEventListener('click', () => {
        const receiverRole = panel.querySelector('#ed-receiver').value;
        const note = panel.querySelector('#ed-note').value.trim();
        addExternalDispatch({
          refType: 'publicity',
          refLabel: `宣传材料：${activityName || '未命名活动'}`,
          senderId: user.personId,
          senderName: getPersonName(user.personId) || '宣传委员',
          receiverRole,
          note,
        });
        showToast('success', '已标记外发，对方确认后完成');
        closeModal(MODAL_ID);
        if (typeof onSent === 'function') onSent();
      });
    },
  });
}

async function _handleArchiveUpload(files, activityId, activityName, category) {
  const today = todayLocal();
  // R2-10：上传留痕必须是**当前登录人**——写死 p12 会在换人/代上传后把审计链记到固定账号。
  // 无会话即拒绝写入（不清空已选文件之外的任何数据），提示重新登录。
  const uploadedBy = currentUserId();
  if (!uploadedBy) {
    showToast('error', '登录状态已失效，请重新登录后再上传');
    return;
  }
  let saved = 0;

  if (isApiMode()) {
    // ── server 模式：文件本体落盘 + 元数据入文件空间宽表 ──
    const token = getAuthToken();
    const baseUrl = getApiBaseUrl();
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const resp = await fetch(`${baseUrl}/api/v1/uploads`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!resp.ok) throw new Error(`上传失败(${resp.status})`);
        const { path } = await resp.json();
        // 元数据 → fileSpaceRecords（文件空间宽表：文件名/大小/路径）
        // 2026-10-02 批次 343（`D-744` D 档写口纪律）：**统一走适配器写口**（原为直连 `fetch` POST）
        const metaRow = await getAdapter().fileSpaceRecords.create({
          activityId, activityName, category,
          fileName: file.name, fileSize: file.size, filePath: path,
          status: 'archived', archiveDate: today, uploadedBy,
        });
        // 同步写入内存 fileSpaceRecords：persist() 的全量快照会按 mockDB 状态整表覆盖
        // server 端表（快照写穿清表缺口），不 push 则刚落库的元数据被空数组擦除
        mockDB.fileSpaceRecords.push(metaRow);
        // R2-40：归档记录走服务层写口（api → POST /api/v1/archiveRecords 落 archive_records 表；
        //   mock → MockAdapter 写 localStorage）。原实现只 push 内存 ⇒ api 形态刷新后记录消失，
        //   「产出物区/关闭校验」读不到刚上传的材料（服务端其实一直有 archive_records 表）。
        await ArchiveStore.createMaterial({
          activityId, activityName, archiveDate: today, category, status: 'archived',
          fileName: file.name, fileSize: file.size, filePath: path, uploadedBy,
        });
        saved++;
      } catch (err) {
        showToast('error', `「${file.name}」${err.message || '上传失败'}`);
      }
    }
  } else {
    // ── mock 模式：base64 dataURL 持久化（同样走 ArchiveStore，保持单一写口）──
    for (const file of files) {
      try {
        const dataUrl = await _readFileAsDataURL(file);
        await ArchiveStore.createMaterial({
          activityId, activityName, archiveDate: today, category, status: 'archived',
          fileName: file.name, fileSize: file.size, fileData: dataUrl, uploadedBy,
        });
        saved++;
      } catch (err) {
        showToast('error', `「${file.name}」读取失败`);
      }
    }
  }

  if (saved > 0) {
    bumpToken('archiveRecord'); // P0：档案材料上传写口
    persist();
  }
  return saved;
}

function _readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

// ════════════════════════════════════════════════════════════════
//  照片墙（批次 120 · 支书 2026-09-20 定案「建，并入「档案归档」（推荐）」）
//  ── 两条路取齐（D-542）──
//  ① 统一走**既有上传接口**：文件本体 POST /api/v1/uploads（multer 白名单 / 单文件 ≤10MB）→ 拿回
//     `path`（/api/v1/uploads/<uuid>.png）存进图片记录；**不在记录里内嵌 base64**（记录体积、
//     白名单与 10MB 上限、按日期分组展示三处都与内嵌形态相抵）。
//  ② 既有内嵌 base64 的两处（本页「上传材料」/ 资料查询「支部文件」）**本批一字未改**——属既有实现。
//  ⚠ 本地（无服务端）模式**没有上传接口** ⇒ 上传按钮禁用并写明依据（不自造第二套 base64 通道）。
//  数据侧：图片记录域与 typedef 早已在（core/domain/domain.js::ImageRecord / mock-adapter CRUD /
//  data-adapter 拉取清单），本批补的是**界面消费者**（此前 `imageRecords` 无任何读渲染点）。
// ════════════════════════════════════════════════════════════════

/** 图片记录读口（API 模式由 data-adapter init() 按域拉取填充，与其它域同源）
 *  批次 352（`D-746`）：默认列表把已作废（`voided`）挡在外面（作废＝从墙上下架；留痕仍可回查）。 */
function _loadImageRecords() {
  return SoftVoid.filterActive('imageRecords', mockDB.imageRecords || []);
}

/** 每个日期组默认展示张数（超出给「展开该日全部」）——分组内同构块不无限增长 */
const PHOTO_GROUP_INIT = 9;
/** 已展开的日期组（随模块自持，重渲染后仍展开） */
const _photoGroupExpanded = new Set();
/** 缩略图对象 URL 缓存（filePath → blob URL） */
const _photoSrcCache = new Map();

/** 按拍摄日期分组（日期倒序；组内按上传时间倒序） */
function _groupPhotosByDate(records) {
  const byDate = new Map();
  for (const r of records) {
    const d = r.date || '未标注日期';
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(r);
  }
  return [...byDate.entries()]
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .map(([date, rows]) => ({
      date,
      rows: rows.slice().sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || ''))),
    }));
}

/** 照片墙区块（页面中段；不新开 tab / 不新开页面） */
function _renderPhotoWallSection(ctx) {
  const records = _loadImageRecords();
  const groups = _groupPhotosByDate(records);
  const canUpload = isApiMode();
  const uploadBtn = canUpload
    ? `<button id="photo-upload-btn" class="btn-accent-soft text-xs px-3 py-2 flex-shrink-0 flex items-center justify-center gap-1.5" style="cursor:pointer">
         ${icon('upload', { className: 'w-3.5 h-3.5' })}<span>上传照片</span>
       </button>`
    : `<button id="photo-upload-btn" class="btn-neutral text-xs px-3 py-2 flex-shrink-0 flex items-center justify-center gap-1.5" disabled title="照片走服务端上传接口（multipart），本地模式无此接口——请在服务端模式使用" style="cursor:not-allowed;">
         ${icon('upload', { className: 'w-3.5 h-3.5' })}<span>上传照片</span>
       </button>`;
  const hint = canUpload
    ? '活动照片走服务端上传接口（jpg / png，单张 ≤10MB），按拍摄日期分组展示；每张可标注标题与拍摄主体。'
    : '活动照片走服务端上传接口，本地模式无此接口——照片墙需在服务端模式使用。';
  return `
    <div class="mb-6" id="archive-photo-wall">
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <div class="flex items-center gap-2">
          <h4 class="text-sm font-bold text-gray-700">照片墙</h4>
          <span class="text-xs px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">${records.length} 张 · ${groups.length} 个日期</span>
        </div>
        ${uploadBtn}
      </div>
      <p class="text-xs text-gray-500 mb-2">${hint}</p>
      <section id="photo-wall-groups" class="space-y-3">${groups.length
        ? groups.map(g => _photoGroupHtml(g)).join('')
        : emptyStateHtml({ text: '暂无照片', variant: 'inline', className: 'py-3' })}</section>
    </div>`;
}

/** 单个日期组（组内缩略图 + 标注入口；超出上限给展开按钮） */
function _photoGroupHtml(group) {
  const expanded = _photoGroupExpanded.has(group.date);
  const shown = expanded ? group.rows : group.rows.slice(0, PHOTO_GROUP_INIT);
  const cards = shown.map(r => `
      <figure class="rounded-lg border border-gray-100 overflow-hidden bg-white" data-photo-id="${escHtml(r.id)}">
        <div class="w-full bg-gray-100 flex items-center justify-center overflow-hidden" style="height:96px;">
          <img data-photo-src="${escHtml(r.id)}" alt="${escHtml(r.title || '活动照片')}" style="width:100%;height:100%;object-fit:cover;" />
        </div>
        <figcaption class="p-2">
          <p class="text-xs text-gray-800 truncate" title="${escHtml(r.title || '未命名照片')}">${escHtml(r.title || '未命名照片')}</p>
          <p class="text-xs text-gray-500 truncate">拍摄主体：${escHtml(r.subject || '—')}</p>
          <div class="flex items-center gap-1.5 mt-1">
            <button type="button" class="btn-outline pw-annotate-btn px-2 py-1" data-photo-id="${escHtml(r.id)}" style="cursor:pointer;">标注</button>
            ${r.voidPending && !r.voided
              ? '<span class="text-xs text-gray-500">待支委会确认</span>'
              : `<button type="button" class="btn-action btn-action-gray pw-void-btn" data-photo-id="${escHtml(r.id)}" title="软作废：照片从墙上出列、留痕可回查；支委可直接作废，其余人报支委会确认">作废</button>`}
          </div>
        </figcaption>
      </figure>`).join('');
  const more = (!expanded && group.rows.length > PHOTO_GROUP_INIT)
    ? `<button type="button" class="btn-outline pw-more-btn text-xs px-3 py-1.5 mt-2" data-photo-date="${escHtml(group.date)}" style="cursor:pointer;">展开该日全部 ${group.rows.length} 张</button>`
    : '';
  return `
    <div class="rounded-xl border border-gray-100 p-3" data-photo-group="${escHtml(group.date)}">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs font-semibold text-gray-700">${escHtml(group.date)}</span>
        <span class="text-xs text-gray-500">${group.rows.length} 张</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${cards}</div>
      ${more}
    </div>`;
}

/** 缩略图注水：服务端下载走 requireAuth + 支部隔离（带 Bearer），而 `<img src>` 带不上 token
 *  ⇒ 先带鉴权取回 blob 再置 objectURL；组内图多时逐个串行取（张数有限、避免瞬时并发）。 */
async function _hydratePhotoThumbs(host) {
  for (const img of [...host.querySelectorAll('img[data-photo-src]')]) {
    const rec = _loadImageRecords().find(r => r.id === img.getAttribute('data-photo-src'));
    if (!rec) continue;
    try {
      if (rec.base64) { img.src = rec.base64; continue; }
      if (!rec.filePath) { img.alt = '该记录没有图片文件'; continue; }
      const url = await _photoObjectUrl(rec.filePath);
      if (img.isConnected) img.src = url;
    } catch (e) {
      if (img.isConnected) { img.alt = '图片加载失败'; img.title = (e && e.message) || '图片加载失败'; }
    }
  }
}

async function _photoObjectUrl(filePath) {
  if (_photoSrcCache.has(filePath)) return _photoSrcCache.get(filePath);
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();
  const scopedPath = withSelectedBranchScope(filePath);
  const url = scopedPath.startsWith('http') ? scopedPath : `${baseUrl}${scopedPath}`;
  const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!resp.ok) throw new Error(`缩略图加载失败(${resp.status})`);
  const objUrl = URL.createObjectURL(await resp.blob());
  _photoSrcCache.set(filePath, objUrl);
  return objUrl;
}

/** 上传照片浮窗（关联活动 / 拍摄日期 / 标题 / 拍摄主体 + 多选图片） */
function _showPhotoUploadModal(ctx) {
  const MODAL_ID = 'photo-upload';
  const activities = [...loadActivities()].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const today = todayLocal();
  const activityOptions = `<option value="">（不关联活动）</option>` + activities.map(a =>
    `<option value="${a.id}">${escHtml(a.title)}（${escHtml(a.date || '未定日期')}）</option>`).join('');

  let selectedFiles = [];
  let previewUrls = [];
  const cleanup = () => {
    previewUrls.forEach(u => URL.revokeObjectURL(u));
    previewUrls = [];
  };

  openModal({
    id: MODAL_ID,
    title: '上传照片',
    width: '440px',
    bodyHtml: `
      <div class="space-y-3.5">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="photo-upload-activity">关联活动（可不选）</label>
          <select id="photo-upload-activity" class="input-flat w-full">${activityOptions}</select>
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="photo-upload-date">拍摄日期</label>
          <input id="photo-upload-date" type="date" class="input-flat w-full" value="${today}" />
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="photo-upload-title">标题</label>
          <input id="photo-upload-title" type="text" class="input-flat w-full" placeholder="如：主题党日合影（留空取文件名）" />
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="photo-upload-subject">拍摄主体</label>
          <input id="photo-upload-subject" type="text" class="input-flat w-full" placeholder="如：全体党员 / 主讲人 / 会场全景" />
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="photo-upload-file">选择图片（可多选）</label>
          <input id="photo-upload-file" type="file" multiple accept=".jpg,.jpeg,.png"
            class="block w-full text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 file:text-xs hover:file:bg-blue-100 transition-colors cursor-pointer" />
          <div id="photo-upload-preview" class="mt-2 space-y-1.5"></div>
        </div>
        <div class="rounded-lg px-3 py-2 text-xs leading-relaxed bg-teal-50 text-teal-700 border border-teal-100">
          照片走服务端上传接口（jpg / png，单张 ≤10MB）落盘，元数据进图片记录；同批照片共用上方日期与标注。
        </div>
      </div>`,
    footerHtml: `
      <button id="photo-upload-cancel" type="button" data-modal-cancel="${MODAL_ID}" class="btn-outline text-xs px-3 py-1.5">取消</button>
      <button id="photo-upload-confirm" type="button" class="btn-accent-soft text-xs px-3 py-1.5" style="cursor:pointer">上传</button>`,
    onCancel: cleanup,
    onMount: (card) => {
      const renderPreview = () => {
        card.querySelector('#photo-upload-preview').innerHTML = selectedFiles.map((f, i) => `
          <div class="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <img src="${previewUrls[i]}" class="w-9 h-9 rounded object-cover border border-gray-200 flex-shrink-0" alt="" />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-700 truncate">${escHtml(f.name)}</p>
              <p class="text-xs text-gray-500">${(f.size / 1024).toFixed(1)} KB</p>
            </div>
            <button class="btn-outline btn-icon photo-file-remove" data-idx="${i}" aria-label="移除该照片">&times;</button>
          </div>`).join('') || '<p class="text-xs text-gray-500 text-center py-3">尚未选择图片</p>';
      };

      card.querySelector('#photo-upload-file').addEventListener('change', (e) => {
        const maxBytes = UPLOAD_MAX_SERVER_MB * 1024 * 1024; // 与 server/routes/uploads.js 同一上限
        const files = Array.from(e.target.files || []);
        const oversized = files.filter(f => f.size > maxBytes);
        if (oversized.length > 0) showToast('error', `${oversized.map(f => f.name).join('、')} 超出 ${UPLOAD_MAX_SERVER_MB}MB 限制，已剔除`);
        selectedFiles = files.filter(f => f.size <= maxBytes);
        cleanup();
        previewUrls = selectedFiles.map(f => URL.createObjectURL(f));
        renderPreview();
      });

      card.querySelector('#photo-upload-preview').addEventListener('click', (e) => {
        const btn = e.target.closest('.photo-file-remove');
        if (!btn) return;
        const idx = Number(btn.dataset.idx);
        selectedFiles.splice(idx, 1);
        URL.revokeObjectURL(previewUrls[idx]);
        previewUrls.splice(idx, 1);
        renderPreview();
      });

      card.querySelector('#photo-upload-confirm').addEventListener('click', async () => {
        if (selectedFiles.length === 0) { showToast('error', '请先选择图片'); return; }
        const meta = {
          date: card.querySelector('#photo-upload-date').value || today,
          title: card.querySelector('#photo-upload-title').value.trim(),
          subject: card.querySelector('#photo-upload-subject').value.trim(),
          activityId: card.querySelector('#photo-upload-activity').value,
        };
        const confirmBtn = card.querySelector('#photo-upload-confirm');
        confirmBtn.disabled = true;
        confirmBtn.textContent = '上传中…';
        try {
          const saved = await _handlePhotoUpload(selectedFiles, meta);
          if (saved > 0) {
            showToast('success', `已上传 ${saved} 张照片，照片墙按拍摄日期分组展示`);
            cleanup();
            closeModal(MODAL_ID);
            renderContent(ctx);
          }
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = '上传';
        }
      });
    },
  });
}

/** 上传本体：文件 → 上传接口（拿 path）→ 元数据 → imageRecords（服务端表 + 内存同源） */
async function _handlePhotoUpload(files, meta) {
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();
  const me = AuthStore.getCurrentUser();
  let saved = 0;
  for (const file of files) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const upResp = await fetch(`${baseUrl}/api/v1/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!upResp.ok) throw new Error(`上传失败(${upResp.status})`);
      const up = await upResp.json();
      const row = {
        date: meta.date,
        title: meta.title || file.name.replace(/\.[^.]+$/, ''),
        subject: meta.subject || '',
        activityId: meta.activityId || '',
        fileName: up.filename || file.name,
        filePath: up.path, // 上传接口拿 URL —— 记录内不内嵌 base64
        uploadedBy: (me && me.personId) || '',
        uploadedAt: new Date().toISOString(),
      };
      // 2026-10-02 批次 343（`D-744` D 档写口纪律）：**统一走适配器写口**（原为直连 `fetch` POST）
      const savedRow = await getAdapter().imageRecords.create(row);
      // 立即上屏：服务端已落库，此处只同步内存（不触发整表快照写穿，避免覆盖他人并发写）
      mockDB.imageRecords = [...mockDB.imageRecords, savedRow];
      saved++;
    } catch (err) {
      showToast('error', `「${file.name}」${(err && err.message) || '上传失败'}`);
    }
  }
  if (saved > 0) bumpToken('imageRecord'); // P0：照片上传写口
  return saved;
}

/** 标注浮窗（日期 / 标题 / 拍摄主体 / 关联活动） */
function _showPhotoAnnotateModal(record, ctx) {
  const MODAL_ID = 'photo-annotate';
  const activities = [...loadActivities()].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const activityOptions = `<option value="">（不关联活动）</option>` + activities.map(a =>
    `<option value="${a.id}"${a.id === record.activityId ? ' selected' : ''}>${escHtml(a.title)}（${escHtml(a.date || '未定日期')}）</option>`).join('');

  openModal({
    id: MODAL_ID,
    title: '标注照片',
    width: '440px',
    bodyHtml: `
      <div class="space-y-3.5">
        <p class="text-xs text-gray-500">${escHtml(record.fileName || '照片')}</p>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="photo-annotate-date">拍摄日期</label>
          <input id="photo-annotate-date" type="date" class="input-flat w-full" value="${escHtml(record.date || '')}" />
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="photo-annotate-title">标题</label>
          <input id="photo-annotate-title" type="text" class="input-flat w-full" value="${escHtml(record.title || '')}" />
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="photo-annotate-subject">拍摄主体</label>
          <input id="photo-annotate-subject" type="text" class="input-flat w-full" value="${escHtml(record.subject || '')}" />
        </div>
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="photo-annotate-activity">关联活动（可不选）</label>
          <select id="photo-annotate-activity" class="input-flat w-full">${activityOptions}</select>
        </div>
      </div>`,
    footerHtml: `
      <button id="photo-annotate-cancel" type="button" data-modal-cancel="${MODAL_ID}" class="btn-outline text-xs px-3 py-1.5">取消</button>
      <button id="photo-annotate-confirm" type="button" class="btn-accent-soft text-xs px-3 py-1.5" style="cursor:pointer">保存</button>`,
    onMount: (card) => {
      card.querySelector('#photo-annotate-confirm').addEventListener('click', async () => {
        const patch = {
          date: card.querySelector('#photo-annotate-date').value || record.date || '',
          title: card.querySelector('#photo-annotate-title').value.trim(),
          subject: card.querySelector('#photo-annotate-subject').value.trim(),
          activityId: card.querySelector('#photo-annotate-activity').value,
        };
        try {
          await _savePhotoAnnotation(record.id, patch);
          showToast('success', '标注已保存');
          closeModal(MODAL_ID);
          renderContent(ctx);
        } catch (err) {
          showToast('error', `保存失败：${(err && err.message) || err}`);
        }
      });
    },
  });
}

/** 标注写口：2026-10-02 批次 343（`D-744` D 档）起**两形态统一走 `getAdapter().imageRecords.update`**
 *  （api＝`PATCH /api/v1/imageRecords/:id` 局部合并；mock＝就内存 + `_saveToStorage`）；
 *  原为「api 直连 `fetch` ＋ mock 就内存 + `persist()`」两套写法。 */
async function _savePhotoAnnotation(id, patch) {
  const merged = await getAdapter().imageRecords.update(id, patch);
  mockDB.imageRecords = mockDB.imageRecords.map(r => (r.id === id ? merged : r));
  bumpToken('imageRecord'); // P0：照片标注写口
}
