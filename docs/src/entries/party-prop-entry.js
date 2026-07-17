import { registerRenderCallback, getAppState } from '../core/state.js';
import { bootstrapPage } from '../core/bootstrap.js';
import { PartyModule } from '../modules/party.js';
import { loadPartyData } from '../core/data-loader.js';
import { renderTabBar } from '../components/tab-bar.js';
import { ImageRecordStore } from '../services/image.js';
import { ACTIVITIES } from '../mock/index.js';
import { showToast } from '../core/utils.js';
import { renderPartyCrossNav } from '../components/party-cross-nav.js';

const { accent, accentRgba, accentBorder } = bootstrapPage({ module: 'party', accentRole: 'prop-commissioner' });

function renderPropPartyUI() {
  const container = document.getElementById('prop-party-content');
  if (!container) return;

  // 跨支委导航栏（A2: party 跨支委查看权限）
  renderPartyCrossNav('prop-commissioner', document.getElementById('party-cross-nav'));

  const tabBar = renderTabBar({
    prefix: 'propp',
    tabs: [
      { id: 'archives', label: '档案归档', render: () => _renderTab('archives') },
      { id: 'standards', label: '材料标准', render: () => _renderTab('standards') },
      { id: 'weekly', label: '周报报送', render: () => _renderTab('weekly') },
      { id: 'images', label: '图片管理', render: () => _renderTab('images') },
    ],
    accentColor: { accent, accentRgba, accentBorder },
    defaultTab: 'archives',
    storageKey: 'workflowos_tab_propp',
  });

  container.innerHTML = tabBar.html;
  tabBar.bindEvents(container);
  tabBar.activate(tabBar.activeTab);
}

function _renderTab(tab) {
  const tc = document.getElementById('propp-tab-content');
  if (!tc) return;

  if (tab === 'archives') {
    tc.innerHTML = `<div class="card rounded-xl p-5 border-l-4" style="border-left-color:var(--accent-prop-commissioner-light);"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">档案归档</h4><div id="prop-commissioner-archives-list"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
    setTimeout(() => PartyModule.refreshArchives(), 100);
  } else if (tab === 'standards') {
    tc.innerHTML = `<div class="card rounded-xl p-5 border-l-4" style="border-left-color:var(--accent-prop-commissioner-light);"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">材料标准</h4><div id="prop-commissioner-standards-content"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
    setTimeout(() => PartyModule.refreshMaterialStandards(), 100);
  } else if (tab === 'weekly') {
    tc.innerHTML = `<div class="card rounded-xl p-5 border-l-4" style="border-left-color:var(--accent-prop-commissioner-light);"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">周报报送</h4><div id="prop-commissioner-weekly-list"><p class="text-xs text-gray-400">数据加载中...</p></div></div>`;
    setTimeout(() => PartyModule.refreshWeeklyReport(), 100);
  } else if (tab === 'images') {
    ImageRecordStore.init();
    const today = new Date().toISOString().slice(0, 10);
    const activityOptions = ACTIVITIES.map(a => `<option value="${a.id}">${a.title}（${a.date}）</option>`).join('');
    tc.innerHTML = `<div class="card rounded-xl p-5 border-l-4" style="border-left-color:var(--accent-prop-commissioner-light);"><h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">图片管理</h4><div class="space-y-4"><div class="p-4 bg-gray-50 rounded-lg"><h5 class="text-xs font-semibold text-gray-600 mb-2">上传图片 + 标注</h5><div class="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label class="block text-xs text-gray-500 mb-1">选择图片</label><input type="file" id="pub-image-file" accept="image/*" class="text-xs w-full" /></div><div><label class="block text-xs text-gray-500 mb-1">拍摄日期</label><input type="date" id="pub-image-date" value="${today}" class="text-sm w-full border border-gray-300 rounded px-3 py-2" /></div><div><label class="block text-xs text-gray-500 mb-1">图片标题</label><input type="text" id="pub-image-title" placeholder="如：3月主题党日全景" class="text-sm w-full border border-gray-300 rounded px-3 py-2" /></div><div><label class="block text-xs text-gray-500 mb-1">拍摄主体</label><input type="text" id="pub-image-subject" placeholder="如：人物/场景/物件" class="text-sm w-full border border-gray-300 rounded px-3 py-2" /></div><div class="md:col-span-2"><label class="block text-xs text-gray-500 mb-1">关联活动（可选）</label><select id="pub-image-activity" class="text-sm w-full border border-gray-300 rounded px-3 py-2"><option value="">— 不关联 —</option>${activityOptions}</select></div></div><button id="pub-image-upload-btn" class="btn-primary mt-3 text-sm px-4 py-2">上传并保存</button><span id="pub-image-msg" class="text-xs text-gray-400 ml-2"></span></div><div><h5 class="text-xs font-semibold text-gray-600 mb-2">照片墙</h5><div id="prop-commissioner-image-gallery"><p class="text-xs text-gray-400">数据加载中...</p></div></div></div></div>`;
    _bindImageUploadEvents();
    setTimeout(() => PartyModule.refreshImageGallery(), 100);
  }
}

function _bindImageUploadEvents() {
  const btn = document.getElementById('pub-image-upload-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const fileInput = document.getElementById('pub-image-file');
    const file = fileInput && fileInput.files[0];
    if (!file) {
      showToast('error', '请先选择图片文件');
      return;
    }
    const title = document.getElementById('pub-image-title').value.trim();
    if (!title) {
      showToast('error', '请填写图片标题');
      return;
    }
    const date = document.getElementById('pub-image-date').value || new Date().toISOString().slice(0, 10);
    const subject = document.getElementById('pub-image-subject').value.trim();
    const activityId = document.getElementById('pub-image-activity').value;
    const { selectedRole } = getAppState();

    const reader = new FileReader();
    reader.onload = (e) => {
      ImageRecordStore.add({
        date,
        title,
        subject,
        activityId,
        base64: e.target.result,
        uploadedBy: selectedRole || '宣传委员',
      });
      showToast('success', `图片「${title}」已上传`);
      fileInput.value = '';
      document.getElementById('pub-image-title').value = '';
      document.getElementById('pub-image-subject').value = '';
      document.getElementById('pub-image-activity').value = '';
      PartyModule.refreshImageGallery();
    };
    reader.onerror = () => showToast('error', '图片读取失败');
    reader.readAsDataURL(file);
  });
}

registerRenderCallback(renderPropPartyUI);

loadPartyData({ role: 'prop-commissioner', partyModule: PartyModule, renderFn: renderPropPartyUI });
