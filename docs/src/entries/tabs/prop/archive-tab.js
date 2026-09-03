// role: [工程师]+[AI]
// 宣传委员工作台 Tab：档案归档（T-279 M3 拆分，照 M2 样板）
// 归档记录纯读 + 材料标准/模板 + 归档推进浮窗（材料确认清单）+ 上传宣传材料（attachments 双模式）。

import { icon } from '../../../core/icons.js?v=20260903c';
import { solidAccentStyle } from '../../../core/constants.js?v=20260903c';
import { showToast, downloadCSV, downloadBlob, downloadUrl, _fmtDate } from '../../../core/utils.js?v=20260903c';
import { persist, getAuthToken, getApiBaseUrl } from '../../../core/data-adapter.js?v=20260903c';
import { mockDB } from '../../../core/domain.js?v=20260903c';
import { loadActivities } from '../../../services/activity.js?v=20260903c';
import { isApiMode } from '../../../services/runtime.js?v=20260903c';
import { AuthStore } from '../../../services/auth.js?v=20260903c';
import { _personName } from '../../../mock/index.js?v=20260903c';
import { addExternalDispatch } from '../../../services/external-dispatch.js?v=20260903c';

// ── 档案归档 ─────────────────────────────────────────────
// 种子数据已提升为全局（mock/seed.js SEED_ARCHIVE_RECORDS，loadDB 时注入），
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

  container.innerHTML = `
    <div class="mb-4 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <input id="archive-search" type="text" placeholder="搜索活动名称..." class="input-flat flex-1 pl-8" />
        ${icon('search', { className: 'absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400' })}
      </div>
      <select id="archive-filter-category" class="input-flat">
        <option value="">全部类别</option>
        <option value="新闻稿">新闻稿</option>
        <option value="照片">照片</option>
        <option value="视频">视频</option>
        <option value="其他">其他</option>
      </select>
      <select id="archive-filter-status" class="input-flat">
        <option value="">全部状态</option>
        <option value="pending">待归档</option>
        <option value="in_progress">归档中</option>
        <option value="archived">已归档</option>
      </select>
      <button id="archive-upload-btn" class="text-xs px-3 py-2 rounded-lg text-white transition-colors hover:opacity-90 flex-shrink-0 flex items-center justify-center gap-1.5" style="${solidAccentStyle(ctx.accent, ctx.accentBorder)}">
        ${icon('upload', { className: 'w-3.5 h-3.5' })}
        <span>上传材料</span>
      </button>
    </div>

    <div id="archive-list" class="space-y-2 mb-6">
      ${_renderArchiveList(_loadArchiveRecords())}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          ${icon('fileText', { className: 'w-4 h-4 text-blue-600' })}
          <span class="text-sm font-semibold text-gray-700">材料标准</span>
        </div>
        <div class="space-y-2">
          ${MATERIAL_STANDARDS.map(s => `
            <div class="p-2.5 rounded-lg bg-gray-50">
              <span class="text-xs px-1.5 py-0.5 rounded-full ${ARCHIVE_CATEGORY_STYLE[s.category]} mr-1.5">${s.category}</span>
              <span class="text-xs text-gray-600">${s.standard}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card rounded-xl p-5">
        <div class="flex items-center gap-2 mb-3">
          ${icon('download', { className: 'w-4 h-4 text-purple-600' })}
          <h4 class="text-sm font-bold text-gray-700">模板下载</h4>
        </div>
        <div class="space-y-2">
          ${ARCHIVE_TEMPLATES.map(t => `
            <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50">
              <div>
                <span class="text-xs font-medium text-gray-700">${t.name}</span>
                <span class="text-xs px-1.5 py-0.5 rounded-full ${ARCHIVE_CATEGORY_STYLE[t.category]} ml-1.5">${t.category}</span>
              </div>
              <button class="archive-tpl-btn text-xs px-3 py-1.5 rounded-lg bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors" data-tpl-name="${t.name}">下载</button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // 搜索/筛选事件
  const searchInput = container.querySelector('#archive-search');
  const filterCategory = container.querySelector('#archive-filter-category');
  const filterStatus = container.querySelector('#archive-filter-status');
  const applyFilter = () => {
    const keyword = searchInput.value.trim().toLowerCase();
    const cat = filterCategory.value;
    const status = filterStatus.value;
    const filtered = _loadArchiveRecords().filter(r => {
      if (keyword && !r.activityName.toLowerCase().includes(keyword)) return false;
      if (cat && r.category !== cat) return false;
      if (status && r.status !== status) return false;
      return true;
    });
    container.querySelector('#archive-list').innerHTML = _renderArchiveList(filtered);
  };
  searchInput.addEventListener('input', applyFilter);
  filterCategory.addEventListener('change', applyFilter);
  filterStatus.addEventListener('change', applyFilter);

  // 归档推进按钮：弹出材料确认浮窗而非直接推进
  container.querySelectorAll('.archive-advance-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const recordId = btn.dataset.recordId;
      const record = _loadArchiveRecords().find(r => r.id === recordId);
      if (!record || record.status === 'archived') return;
      _showArchiveAdvancePopover(record, btn, ctx);
    });
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
      if (!window.confirm(`确认删除材料「${record.fileName}」？${record.filePath ? '服务器物理文件将一并删除。' : ''}`)) return;
      await _deleteArchiveFile(record);
      showToast('success', `材料「${record.fileName}」已删除`);
      renderContent(ctx);
    }
  });

  // 上传材料按钮（attachments 双模式：mock base64 / server multipart）
  container.querySelector('#archive-upload-btn')?.addEventListener('click', () => {
    _showArchiveUploadModal(ctx);
  });
}

function _renderArchiveList(records) {
  if (records.length === 0) {
    return '<p class="text-xs text-gray-400 text-center py-8">无匹配的归档记录</p>';
  }
  // 按日期降序排列（新日期在前）
  const sorted = [...records].sort((a, b) => (b.archiveDate || '').localeCompare(a.archiveDate || ''));
  return sorted.map(r => {
    const catStyle = ARCHIVE_CATEGORY_STYLE[r.category] || 'bg-gray-50 text-gray-600';
    const statusStyle = ARCHIVE_STATUS_STYLE[r.status];
    const isFinal = r.status === 'archived';
    const isInProgress = r.status === 'in_progress';
    const advanceLabel = r.status === 'pending' ? '开始归档' : '确认归档';
    const advanceBtn = !isFinal
      ? `<button class="archive-advance-btn text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors" data-record-id="${r.id}" onclick="event.stopPropagation();">${advanceLabel}</button>`
      : '';
    // 归档中状态显示进度
    const progressHtml = isInProgress && r._checklistState
      ? `<span class="text-xs text-blue-600">材料 ${r._checklistState.checked}/${r._checklistState.total}</span>`
      : '';
    // 已归档状态显示完成标记
    const doneHtml = isFinal
      ? `<span class="text-xs text-green-600">✓</span>`
      : '';
    // 已归档材料（上传过文件）显示下载按钮
    const fileBtn = r.fileName
      ? `<button class="archive-file-dl-btn text-xs px-2.5 py-1.5 rounded-lg bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors inline-flex items-center gap-1" data-record-id="${r.id}" title="下载 ${r.fileName}" style="cursor:pointer;">${icon('download', { className: 'w-3 h-3' })} 下载</button>
        <button class="archive-file-del-btn text-xs px-2.5 py-1.5 rounded-lg bg-white text-red-500 border border-red-200 hover:bg-red-50 transition-colors" data-record-id="${r.id}" title="删除该材料（连物理文件）" style="cursor:pointer;">删除</button>`
      : '';
    return `
      <div class="p-3 rounded-xl bg-white hover:bg-gray-50 transition-colors flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-medium text-gray-800 truncate">${r.activityName}</span>
            <span class="text-xs px-1.5 py-0.5 rounded-full ${catStyle} shrink-0">${r.category}</span>
            <span class="text-xs px-1.5 py-0.5 rounded-full border ${statusStyle} shrink-0">${ARCHIVE_STATUS_LABEL[r.status]}</span>
            ${progressHtml}${doneHtml}
          </div>
          <span class="text-xs text-gray-400">归档日期：${r.archiveDate}${r.fileName ? ` · 材料：${r.fileName}` : ''}</span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">${fileBtn}${advanceBtn}</div>
      </div>`;
  }).join('');
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
      <p style="color:#999">（本模板由 GSM1921 党务工作系统生成，请按材料标准填写）</p>
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
    const url = record.filePath.startsWith('http') ? record.filePath : `${baseUrl}${record.filePath}`;
    return downloadUrl(url, record.fileName, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  }
  return false;
}

/** 材料删除（D 档文件闭环）：mock 删本地记录；server 先调 DELETE 接口（联动删物理文件）再删内存记录 */
async function _deleteArchiveFile(record) {
  if (record.filePath) {
    const baseUrl = getApiBaseUrl();
    const token = getAuthToken();
    // server 上传时 fileSpaceRecords 记录 id 由服务端生成，按 filePath 匹配后删除
    const fsRec = (mockDB.fileSpaceRecords || []).find(f => f.filePath === record.filePath);
    if (fsRec) {
      try {
        await fetch(`${baseUrl}/api/v1/fileSpaceRecords/${fsRec.id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch (e) {
        console.warn('[archive] 服务端删除失败：', e);
      }
      mockDB.fileSpaceRecords = mockDB.fileSpaceRecords.filter(f => f.id !== fsRec.id);
    }
  }
  mockDB.archiveRecords = mockDB.archiveRecords.filter(r => r.id !== record.id);
  persist();
  return true;
}

// ════════════════════════════════════════════════════════════════
//  归档推进浮窗：弹出材料确认清单，而非直接改状态标签
// ════════════════════════════════════════════════════════════════
function _showArchiveAdvancePopover(record, triggerBtn, ctx) {
  // 移除已有浮窗
  const existing = document.getElementById('archive-advance-popover');
  if (existing) existing.remove();

  const isStart = record.status === 'pending';
  const nextStatus = isStart ? 'in_progress' : 'archived';
  const nextLabel = ARCHIVE_STATUS_LABEL[nextStatus];

  // 根据归档类别获取材料标准
  const categoryStandard = MATERIAL_STANDARDS.find(s => s.category === record.category) || MATERIAL_STANDARDS[MATERIAL_STANDARDS.length - 1];
  // 拆分材料标准为检查项
  const checklist = _parseChecklistFromStandard(categoryStandard.standard, record.category);

  const popover = document.createElement('div');
  popover.id = 'archive-advance-popover';
  popover.style.cssText = 'position:fixed;z-index:100;background:var(--surface-card);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.15);border:1px solid var(--neutral-200);padding:0;width:380px;max-height:80vh;overflow-y:auto;';

  // ── 浮窗内容 ──
  let html = '';
  // 标题栏
  html += `<div class="px-5 pt-4 pb-3 border-b border-gray-100">`;
  html += `<div class="flex items-center justify-between mb-1">`;
  html += `<h3 class="font-title-cn text-sm font-semibold text-gray-800">${isStart ? '开始归档' : '确认归档'}</h3>`;
  html += `<button id="archive-popover-close" class="text-gray-400 hover:text-gray-600 text-sm leading-none">&times;</button>`;
  html += `</div>`;
  html += `<div class="text-xs text-gray-500">${record.activityName} · <span class="px-1 py-0.5 rounded ${ARCHIVE_CATEGORY_STYLE[record.category] || ''}">${record.category}</span></div>`;
  html += `</div>`;

  if (isStart) {
    // 开始归档：显示材料标准检查清单
    html += `<div class="px-5 py-4">`;
    html += `<p class="text-xs text-gray-600 mb-3">请确认以下材料标准是否满足：</p>`;
    html += `<div class="space-y-2 mb-4">`;
    checklist.forEach((item, i) => {
      html += `<label class="flex items-start gap-2.5 cursor-pointer group">`;
      html += `<input type="checkbox" class="archive-checklist-item mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-300" data-check-idx="${i}" />`;
      html += `<span class="text-xs text-gray-700 leading-relaxed group-hover:text-gray-900">${item}</span>`;
      html += `</label>`;
    });
    html += `</div>`;
    html += `<div class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-4">`;
    html += `<p class="text-[12px] text-amber-700">提示：未全部勾选也可推进状态，但请确保后续补齐。</p>`;
    html += `</div>`;
    html += `</div>`;
  } else {
    // 确认归档：显示归档总结
    html += `<div class="px-5 py-4">`;
    html += `<p class="text-xs text-gray-600 mb-3">确认将以下条目归档？归档后将从待处理列表移除。</p>`;
    html += `<div class="rounded-lg bg-gray-50 px-3 py-2.5 mb-4 space-y-1.5">`;
    html += `<div class="flex items-center justify-between text-xs"><span class="text-gray-500">活动名称</span><span class="text-gray-800 font-medium">${record.activityName}</span></div>`;
    html += `<div class="flex items-center justify-between text-xs"><span class="text-gray-500">归档类别</span><span class="text-gray-800">${record.category}</span></div>`;
    html += `<div class="flex items-center justify-between text-xs"><span class="text-gray-500">归档日期</span><span class="text-gray-800">${record.archiveDate}</span></div>`;
    html += `</div>`;
    html += `<div class="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 mb-4">`;
    html += `<p class="text-[12px] text-blue-700">材料标准：${categoryStandard.standard}</p>`;
    html += `</div>`;
    html += `</div>`;
  }

  // 操作按钮
  html += `<div class="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">`;
  html += `<button id="archive-popover-cancel" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">取消</button>`;
  html += `<button id="archive-popover-confirm" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors" style="${solidAccentStyle(ctx.accent, ctx.accentBorder)}">${nextLabel}</button>`;
  html += `</div>`;

  popover.innerHTML = html;
  document.body.appendChild(popover);

  // 定位
  const rect = triggerBtn.getBoundingClientRect();
  let top = rect.bottom + 8;
  let left = rect.left;
  if (left + 380 > window.innerWidth) left = Math.max(8, window.innerWidth - 392);
  if (top + popover.offsetHeight > window.innerHeight) top = Math.max(8, rect.top - popover.offsetHeight - 8);
  popover.style.top = top + 'px';
  popover.style.left = left + 'px';

  const closePopover = () => { popover.remove(); };

  popover.querySelector('#archive-popover-close')?.addEventListener('click', closePopover);
  popover.querySelector('#archive-popover-cancel')?.addEventListener('click', closePopover);

  // 确认推进
  popover.querySelector('#archive-popover-confirm')?.addEventListener('click', () => {
    if (isStart) {
      // 开始归档：收集勾选状态
      const checks = popover.querySelectorAll('.archive-checklist-item');
      const checkedCount = [...checks].filter(c => c.checked).length;
      const totalCount = checks.length;
      record._checklistState = { checked: checkedCount, total: totalCount };
    }
    record.status = nextStatus;
    persist();
    closePopover();
    showToast('success', `「${record.activityName}」${nextLabel}${isStart ? '，请按材料标准准备' : ''}`);
    renderContent(ctx);
  });

  // 点击外部关闭
  const outsideHandler = (e) => {
    if (!popover.contains(e.target) && !triggerBtn.contains(e.target)) {
      closePopover();
      document.removeEventListener('click', outsideHandler, true);
    }
  };
  setTimeout(() => document.addEventListener('click', outsideHandler, true), 0);

  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') { closePopover(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
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
// mock 模式：FileReader → base64 dataURL 存 mockDB.archiveRecords + persist()；
// server 模式：文件本体 POST /api/v1/uploads（multer 落盘 server/uploads/），
// 元数据 POST /api/v1/fileSpaceRecords（server 端无 archiveRecords 表，落文件空间宽表），
// 同时写入内存 archiveRecords 保证当页产出物区/关闭校验联动。
const UPLOAD_MAX_MOCK_MB = 2;  // mock 模式 localStorage 容量约束（base64 膨胀 ~33%）
const UPLOAD_MAX_SERVER_MB = 10; // 与 server/routes/uploads.js 服务端限制一致

function _showArchiveUploadModal(ctx) {
  // 移除已有模态
  const existing = document.getElementById('archive-upload-modal');
  if (existing) existing.remove();

  const activities = loadActivities();
  const apiMode = isApiMode();
  const maxMB = apiMode ? UPLOAD_MAX_SERVER_MB : UPLOAD_MAX_MOCK_MB;

  const overlay = document.createElement('div');
  overlay.id = 'archive-upload-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

  const card = document.createElement('div');
  card.style.cssText = 'background:var(--surface-card);border-radius:14px;padding:0;max-width:440px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);max-height:86vh;display:flex;flex-direction:column;';

  // T223 排序统一：关联活动下拉按 date 降序（新者在前），与全站一致
  const sortedActivities = [...activities].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const activityOptions = sortedActivities.length === 0
    ? '<option value="">（暂无活动，请先创建）</option>'
    : `<option value="">请选择关联活动</option>` + sortedActivities.map(a =>
        `<option value="${a.id}">${a.title}（${a.date || '未定日期'}）</option>`
      ).join('');

  card.innerHTML = `
    <div class="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
      <h3 class="font-title-cn text-sm font-semibold text-gray-800">上传宣传材料</h3>
      <button id="upload-modal-close" class="text-gray-400 hover:text-gray-600 text-sm leading-none">&times;</button>
    </div>
    <div class="px-5 py-4 space-y-3.5 overflow-y-auto">
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">关联活动 <span class="text-red-500">*</span></label>
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
          accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov"
          class="block w-full text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 file:text-xs hover:file:bg-blue-100 transition-colors cursor-pointer" />
        <div id="upload-preview" class="mt-2 space-y-1.5"></div>
      </div>
      <div class="rounded-lg px-3 py-2 text-[11px] leading-relaxed ${apiMode ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}">
        ${apiMode
          ? '服务端模式：文件落服务器磁盘（jpg/png/pdf/docx/xlsx，单文件 ≤' + maxMB + 'MB），元数据写入文件空间记录，产出物区同步可见。'
          : '本地模式：文件以 base64 存入本地存储（单文件 ≤' + maxMB + 'MB），刷新不丢失；产出物区/关闭校验同步可见。'}
      </div>
    </div>
    <div class="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
      <button id="upload-cancel" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
      <button id="upload-confirm" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(ctx.accent, ctx.accentBorder)}">上传</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  let selectedFiles = [];
  let previewUrls = [];

  const closeModal = () => {
    previewUrls.forEach(u => URL.revokeObjectURL(u));
    overlay.remove();
  };

  const renderPreview = () => {
    const previewEl = card.querySelector('#upload-preview');
    previewEl.innerHTML = selectedFiles.map((f, i) => {
      const isImage = f.type && f.type.startsWith('image/');
      const thumb = isImage
        ? `<img src="${previewUrls[i]}" class="w-9 h-9 rounded object-cover border border-gray-200 flex-shrink-0" alt="" />`
        : `<span class="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style="--acc-bg-dark:rgba(96,165,250,0.16);--acc-text-dark:#60A5FA;background:rgba(59,130,246,0.1);color:#3b82f6;">${icon('fileText', { className: 'w-4 h-4' })}</span>`;
      return `<div class="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
        ${thumb}
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${f.name}</p>
          <p class="text-[11px] text-gray-400">${(f.size / 1024).toFixed(1)} KB</p>
        </div>
        <button class="upload-file-remove text-gray-400 hover:text-red-500 text-sm leading-none" data-idx="${i}">&times;</button>
      </div>`;
    }).join('') || '<p class="text-xs text-gray-400 text-center py-3">尚未选择文件</p>';
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
    previewUrls.forEach(u => URL.revokeObjectURL(u));
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
        // 文件流外发确认（书记 2026-08-10 裁定）：材料如需微信外发给对方确认，系统内标记闭环
        _promptExternalDispatch(activityId, activity ? activity.title : '', ctx);
        closeModal();
        renderContent(ctx);
      }
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = '上传';
    }
  });

  // 关闭
  card.querySelector('#upload-modal-close').addEventListener('click', closeModal);
  card.querySelector('#upload-cancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  card.addEventListener('click', e => e.stopPropagation());
}

/** 文件流外发确认（书记 2026-08-10 裁定）：材料已归档，如需微信外发则系统内标记闭环 */
function _promptExternalDispatch(activityId, activityName, ctx) {
  const user = AuthStore.getCurrentUser();
  if (!user) return;
  const receiverOptions = [
    { value: 'secretary', label: '党支部书记（审核）' },
    { value: 'disc-commissioner', label: '纪检委员（留档）' },
    { value: 'org-commissioner', label: '组织委员' },
  ];
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.4);display:flex;align-items:center;justify-content:center;z-index:200;';
  overlay.innerHTML = `
    <div class="card rounded-xl w-full max-w-md" style="max-height:80vh;overflow-y:auto;">
      <div class="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
        <h3 class="font-title-cn text-sm font-semibold text-gray-800">文件外发确认</h3>
        <button id="ed-modal-close" class="text-gray-400 hover:text-gray-600 text-sm leading-none">&times;</button>
      </div>
      <div class="px-5 py-4 space-y-3.5">
        <div class="rounded-lg px-3 py-2 text-[11px] leading-relaxed bg-amber-50 text-amber-700 border border-amber-100">
          宣传材料已归档到系统。若还需通过<b>微信</b>把文件发给对方确认（如新闻稿送书记审核），
          请在此标记「已外发」——对方收到后会在其工作台确认，形成可审计闭环（谁 / 何时 / 发给谁 / 何时确认）。
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
      </div>
      <div class="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
        <button id="ed-skip" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">暂不外发</button>
        <button id="ed-confirm" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="${solidAccentStyle(ctx.accent, ctx.accentBorder)};cursor:pointer;">标记已通过微信发送</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#ed-modal-close').addEventListener('click', close);
  overlay.querySelector('#ed-skip').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#ed-confirm').addEventListener('click', () => {
    const receiverRole = overlay.querySelector('#ed-receiver').value;
    const note = overlay.querySelector('#ed-note').value.trim();
    addExternalDispatch({
      refType: 'publicity',
      refLabel: `宣传材料：${activityName || '未命名活动'}`,
      senderId: user.personId,
      senderName: _personName(user.personId) || '宣传委员',
      receiverRole,
      note,
    });
    showToast('success', '已标记外发，对方确认后将闭环');
    close();
  });
}

async function _handleArchiveUpload(files, activityId, activityName, category) {
  const today = new Date().toISOString().slice(0, 10);
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
        // 元数据 → fileSpaceRecords（server RESOURCE_TABLES 无 archiveRecords 表）
        const metaResp = await fetch(`${baseUrl}/api/v1/fileSpaceRecords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            activityId, activityName, category,
            fileName: file.name, fileSize: file.size, filePath: path,
            status: 'archived', archiveDate: today, uploadedBy: 'p12',
          }),
        });
        if (!metaResp.ok) throw new Error(`元数据写入失败(${metaResp.status})`);
        const metaRow = await metaResp.json();
        // 同步写入内存 fileSpaceRecords：persist() 的全量快照会按 mockDB 状态整表覆盖
        // server 端表（快照写穿清表缺口），不 push 则刚落库的元数据被空数组擦除
        mockDB.fileSpaceRecords.push(metaRow);
        // 同步写入内存 archiveRecords → 产出物区/关闭校验同源联动
        mockDB.archiveRecords.push({
          id: `ar-u-${Date.now()}-${saved}`, activityId, activityName,
          archiveDate: today, category, status: 'archived',
          fileName: file.name, fileSize: file.size, filePath: path,
        });
        saved++;
      } catch (err) {
        showToast('error', `「${file.name}」${err.message || '上传失败'}`);
      }
    }
  } else {
    // ── mock 模式：base64 dataURL 持久化 ──
    for (const file of files) {
      try {
        const dataUrl = await _readFileAsDataURL(file);
        mockDB.archiveRecords.push({
          id: `ar-u-${Date.now()}-${saved}`, activityId, activityName,
          archiveDate: today, category, status: 'archived',
          fileName: file.name, fileSize: file.size, fileData: dataUrl,
        });
        saved++;
      } catch (err) {
        showToast('error', `「${file.name}」读取失败`);
      }
    }
  }

  if (saved > 0) persist();
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
