// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  dashboard/gallery.js — 首页活动风采（方案 B 入口拆分，2026-08-29）
//  自 main-entry.js 迁出：_renderGallery 与类型渐变底（本批已移除）。
//
//  2026-10-19（Phase 2 Task 5）：由「类型渐变底」改为**真图位**——
//    · 图片源复用 `imageRecords`（宣传档案里已上传的活动照片），同一活动取最新一张；
//    · 有图显示真图，无图显示中性占位「暂无活动照片」；不生成假图、不用渐变冒充图片；
//    · 去掉蓝色标题 hover 与整卡上浮，白卡 + 左侧类型色 + 状态徽章。
//  收录权与排序不变（`galleryFeatured` / `galleryPinned` 单一源仍来自 activity.js）。
// ════════════════════════════════════════════════════════════════

import { getAppState } from '../../core/base/state.js?v=20261029b';
import { _fmtDate, escHtml, getBasePath } from '../../core/base/utils.js?v=20261029b';
import { AuthStore } from '../../services/core/auth.js?v=20261029b';
import { getPersonName } from '../../services/member/person.js?v=20261029b';
import { getActivityTypeColors, DASHBOARD_LIMITS } from '../../core/domain/constants.js?v=20261029b';
import { icon } from '../../core/base/icons.js?v=20261029b';
import { mockDB, isActivityClosed } from '../../core/domain/domain.js?v=20261029b';
import { getAuthToken, getApiBaseUrl } from '../../data/data-adapter.js?v=20261029b';
import { withSelectedBranchScope } from '../../data/api-adapter.js?v=20261029b';
// 2026-09-29 批次 294（支书裁：收录权归宣传委员）：本页收录改**人工**——判据单一源 = 活动主源 `galleryFeatured`。
import { isGalleryFeatured, isGalleryPinned } from '../../services/activity/activity.js?v=20261029b';
import { badgeHtml } from '../ui/badges.js?v=20261029b';
import { deriveActivityLifecycleStatus, ACTIVITY_LIFECYCLE } from '../record/inspector.js?v=20261029b';
// Task 6：首页风采标题 → 活动完整详情页（direct）；缺 id 时渲染纯文本，不生成空链接。
import { objectDetailHref } from '../../core/domain/object-route.js?v=20261029b';

import { emptyStateHtml } from '../ui/empty-state.js?v=20261029b';
const ACTIVITY_TYPE_COLORS = getActivityTypeColors({ withLabel: true });

// 同活动只取最新一张未作废照片；无照片的活动不造图。
let _imageByActivityId = new Map();
// 缩略图对象 URL 缓存（filePath → blob URL）
const _photoSrcCache = new Map();

function _collectLatestPhotos() {
  const rows = (mockDB.imageRecords || []).filter(r => r && r.activityId && !r.voided);
  const byActivity = new Map();
  for (const r of rows) {
    const prev = byActivity.get(r.activityId);
    const curKey = String(r.uploadedAt || r.date || '');
    const prevKey = prev ? String(prev.uploadedAt || prev.date || '') : '';
    if (!prev || curKey > prevKey) byActivity.set(r.activityId, r);
  }
  return byActivity;
}

async function _photoObjectUrl(filePath) {
  if (_photoSrcCache.has(filePath)) return _photoSrcCache.get(filePath);
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();
  const scopedPath = withSelectedBranchScope(filePath);
  const url = scopedPath.startsWith('http') ? scopedPath : `${baseUrl}${scopedPath}`;
  const resp = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!resp.ok) throw new Error(`照片加载失败(${resp.status})`);
  const objUrl = URL.createObjectURL(await resp.blob());
  _photoSrcCache.set(filePath, objUrl);
  return objUrl;
}

/** 图片注水：base64 直接挂；服务端文件带 Bearer 取 blob。失败保留占位、不展示破图。 */
function _hydrateGalleryImages(container) {
  for (const img of [...container.querySelectorAll('img[data-gallery-img]')]) {
    const rec = _imageByActivityId.get(img.getAttribute('data-gallery-activity-id'));
    if (!rec) { img.remove(); continue; }
    const cover = img.parentElement;
    const ph = cover?.querySelector('.gallery-card__placeholder');
    const showPlaceholder = () => {
      img.remove();
      if (ph) ph.hidden = false;
    };
    img.addEventListener('error', showPlaceholder, { once: true });
    if (rec.base64) {
      img.src = rec.base64;
      img.hidden = false;
      if (ph) ph.hidden = true;
      continue;
    }
    if (!rec.filePath) { showPlaceholder(); continue; }
    _photoObjectUrl(rec.filePath)
      .then((url) => {
        if (!img.isConnected) return;
        img.src = url;
        img.hidden = false;
        if (ph) ph.hidden = true;
      })
      .catch(showPlaceholder);
  }
}

/** 上传照片入口（2026-10-27 Task 6.4）：照片写口在宣传台「档案归档」，只有宣传委员可上传；
 *  其余角色不渲染入口（不把无权动作摆到首页）。落点＝既有页签 `?tab=archive`，不新造页面。 */
function _photoUploadHref() {
  let user = null;
  try { user = AuthStore.getCurrentUser(); } catch (_) { user = null; }
  if (!user || user.role !== 'prop-commissioner') return '';
  return `${getBasePath()}workspace/prop.html?tab=archive`;
}

/** 渲染首页活动风采（品牌 + 已归档活动，前 6 条） */
export function renderGallery(activities) {
  const container = document.getElementById('dashboard-gallery');
  if (!container) return;

  // 2026-09-30 批次 298（支书裁「排序＝加『置顶』」）：排序权重 **置顶 ＞ 未完成 ＞ 已完成**，
  //   组内均按 date 降序（新者在前）。置顶写口单一源 ＝ activity.js::setGalleryPinned。
  // 「已完成 / 已取消」闭环判据单一源 = domain.js::isActivityClosed（R7-16）
  const isDone = isActivityClosed;
  const candidates = activities.filter(a => isGalleryFeatured(a));
  const sortByDate = (arr) => [...arr].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const pinned = candidates.filter(a => isGalleryPinned(a));
  const rest = candidates.filter(a => !isGalleryPinned(a));
  const display = [
    ...sortByDate(pinned.filter(a => !isDone(a))), ...sortByDate(pinned.filter(a => isDone(a))),
    ...sortByDate(rest.filter(a => !isDone(a))), ...sortByDate(rest.filter(a => isDone(a))),
  ].slice(0, DASHBOARD_LIMITS.gallery);

  // 过拟合修正（2026-09-13）：活动风采为支部自创展示位（品牌活动），首页不为其保留常驻空卡
  //（原空态「暂无风采展示」恒占位）。无内容 → 整卡不出（含标题）。
  if (display.length === 0) {
    document.getElementById('dashboard-gallery-card')?.classList.add('hidden');
    container.innerHTML = '';
    return;
  }
  document.getElementById('dashboard-gallery-card')?.classList.remove('hidden');

  _imageByActivityId = _collectLatestPhotos();

  // 2026-10-27 Task 6.4（脏乱繁 · 空态）：一张照片都没有时**不出 16:9 大图位**——
  //   原实现给每个入选活动铺 335px 高的空图位（6 张）把首屏撑满。现只留一行「暂无活动照片」
  //   ＋上传入口（仅宣传委员）；有照片才走图位卡片。
  if (!display.some(a => _imageByActivityId.has(a.id))) {
    const uploadHref = _photoUploadHref();
    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3" data-gallery-empty>
        ${emptyStateHtml({ text: '暂无活动照片', variant: 'inline' })}
        ${uploadHref ? `<a class="text-xs text-accent" href="${uploadHref}">上传照片</a>` : ''}
      </div>`;
    return;
  }

  container.innerHTML = '<div class="gallery-grid">' +
    display.map(a => {
      const color = ACTIVITY_TYPE_COLORS[a.type] || { dot: '#6B7280', label: a.type || '活动' };
      const organizerName = getPersonName(a.organizer);
      const lifecycle = ACTIVITY_LIFECYCLE[deriveActivityLifecycleStatus(a, getAppState()?.tasks || [])] || ACTIVITY_LIFECYCLE.draft;
      const hasPhoto = _imageByActivityId.has(a.id);
      const rec = hasPhoto ? _imageByActivityId.get(a.id) : null;
      const detailHref = objectDetailHref('activity', a.id, { entry: 'home' });

      return `
        <div class="card card--static gallery-card"
             style="border-left:2px solid ${color.dot};">
          <div class="gallery-card__cover">
            ${rec ? `<img data-gallery-img="${escHtml(a.id)}" data-gallery-activity-id="${escHtml(a.id)}" alt="${escHtml(a.title || '活动照片')}" hidden />` : ''}
            <div class="gallery-card__placeholder"${rec ? ' hidden' : ''}>
              ${icon('calendarHero', { className: 'w-6 h-6' })}
              <span>暂无活动照片</span>
            </div>
          </div>
          <div class="gallery-card__body">
            <div class="gallery-card__type">
              <span class="gallery-card__dot" style="background:${color.dot};"></span>
              <span>${escHtml(color.label)}</span>
            </div>
            <h3 class="gallery-card__title">${detailHref
              ? `<a class="gallery-card__open" href="./${escHtml(detailHref)}" data-gallery-activity-id="${escHtml(a.id)}" title="查看活动：${escHtml(a.title || '未命名活动')}">${escHtml(a.title || '未命名活动')} →</a>`
              : `<span>${escHtml(a.title || '未命名活动')}</span>`}</h3>
            <p class="gallery-card__meta">${a.date ? _fmtDate(new Date(a.date)) : ''}${organizerName ? ' · ' + escHtml(organizerName) : ''}</p>
            <div class="gallery-card__badge">${badgeHtml(lifecycle.label, lifecycle.variant)}</div>
          </div>
        </div>
      `;
    }).join('') + '</div>';

  _hydrateGalleryImages(container);
}
