// role: [工程师]+[AI]
// 参考资料板块 — 网站群展示 + 资料下载 + 分类检索

import { icon } from '../core/icons.js';

const SITE_GROUPS = [
  {
    title: 'GSM1921-SOP 系统迭代',
    desc: 'SOP 引擎版本记录与更新日志',
    url: 'https://github.com/GSM1921-SOP',
    cat: 'system',
    icon: 'github',
  },
  {
    title: '光华管理学院官网',
    desc: '学院动态、通知公告、学术资源',
    url: 'https://www.gsm.pku.edu.cn/',
    cat: 'external',
    icon: 'globe',
  },
  {
    title: '北京大学党委组织部',
    desc: '发展党员流程、组织生活指导',
    url: 'https://zzb.pku.edu.cn/',
    cat: 'external',
    icon: 'shield',
  },
  {
    title: '共产党员网',
    desc: '党建知识库、学习材料、政策法规',
    url: 'https://www.12371.cn/',
    cat: 'external',
    icon: 'flag',
  },
  {
    title: '学习强国',
    desc: '时政新闻、理论文章、视频课程',
    url: 'https://www.xuexi.cn/',
    cat: 'tools',
    icon: 'book',
  },
  {
    title: '北大邮箱系统',
    desc: '支部公邮登录入口',
    url: 'https://mail.pku.edu.cn/',
    cat: 'tools',
    icon: 'mail',
  },
];

const REF_DOCS = [
  {
    id: 'doc-01',
    title: '积极分子考察表填写规范',
    cat: 'party-doc',
    format: 'pdf',
    size: '256 KB',
    desc: '含各阶段填写示例与常见错误对照',
    downloadText: '下载模板',
  },
  {
    id: 'doc-02',
    title: '预备党员转正材料清单',
    cat: 'party-doc',
    format: 'pdf',
    size: '180 KB',
    desc: '转正所需全部材料一览表及时间节点',
    downloadText: '下载清单',
  },
  {
    id: 'doc-03',
    title: '党支部工作手册（2025版）',
    cat: 'party-doc',
    format: 'pdf',
    size: '1.2 MB',
    desc: '组织生活、党员管理、纪律检查全流程指导',
    downloadText: '下载手册',
  },
  {
    id: 'doc-04',
    title: 'SOP 引擎 CLAUDE.md（v4.x）',
    cat: 'system',
    format: 'md',
    size: '12 KB',
    desc: '当前项目执行路线图与里程碑节点',
    downloadText: '查看完整',
    url: './CLAUDE.md',
  },
  {
    id: 'doc-05',
    title: '设计系统规范文档',
    cat: 'system',
    format: 'md',
    size: '28 KB',
    desc: '颜色/字体/控件/布局等设计标准',
    downloadText: '查看文档',
    url: './content/design/DESIGN_SYSTEM.md',
  },
  {
    id: 'doc-06',
    title: 'SOP 决策日志汇编',
    cat: 'system',
    format: 'md',
    size: '36 KB',
    desc: '全部设计决策记录，含编号索引',
    downloadText: '查看日志',
    url: './.ctx/logs/DECISION_LOG.md',
  },
  {
    id: 'doc-07',
    title: '中国共产党章程',
    cat: 'party-doc',
    format: 'pdf',
    size: '—',
    desc: '党的根本大法，全体党员必须遵守的行为准则',
    downloadText: '查看',
    url: './content/references/合规文件/【附件11】中国共产党章程.pdf',
  },
  {
    id: 'doc-08',
    title: '党支部工作规范（学生）',
    cat: 'party-doc',
    format: 'pdf',
    size: '—',
    desc: '学生党支部工作流程与标准要求',
    downloadText: '查看',
  },
  {
    id: 'doc-09',
    title: '党员教育管理工作条例',
    cat: 'party-doc',
    format: 'pdf',
    size: '—',
    desc: '党员教育管理的制度化规范文件',
    downloadText: '查看',
  },
  {
    id: 'doc-10',
    title: '发展党员工作细则',
    cat: 'party-doc',
    format: 'pdf',
    size: '—',
    desc: '发展党员各环节程序性规范',
    downloadText: '查看',
  },
  {
    id: 'doc-11',
    title: '高校基层组织工作条例',
    cat: 'party-doc',
    format: 'pdf',
    size: '—',
    desc: '高校党的基层组织设置和运行规范',
    downloadText: '查看',
  },
  {
    id: 'doc-12',
    title: '支部工作条例（试行）',
    cat: 'party-doc',
    format: 'pdf',
    size: '—',
    desc: '党支部工作的基本遵循',
    downloadText: '查看',
  },
  {
    id: 'doc-13',
    title: 'SOP 优化提案反馈卡',
    cat: 'system',
    format: 'md',
    size: '6 KB',
    desc: '提交对 SOP 引擎的优化建议与反馈',
    downloadText: '查看',
    url: './content/references/工作模板/FEEDBACK_FORM.md',
  },
];

function _iconSVG(name) {
  if (name === 'github') return icon('github', { size: 16, fill: 'currentColor', stroke: 'none' });
  return icon(name, { size: 16 }) || icon('globe', { size: 16 });
}

function _formatIcon(icon) {
  const map = {
    pdf: '<span class="ref-file-badge pdf">PDF</span>',
    md: '<span class="ref-file-badge md">MD</span>',
    docx: '<span class="ref-file-badge docx">DOCX</span>',
    xlsx: '<span class="ref-file-badge xlsx">XLSX</span>',
    png: '<span class="ref-file-badge img">IMG</span>',
    jpg: '<span class="ref-file-badge img">IMG</span>',
  };
  return map[icon] || `<span class="ref-file-badge">${(icon || 'FILE').toUpperCase()}</span>`;
}

export class ReferencesModule {
  static _currentCat = 'all';
  static _searchTerm = '';

  static init() {
    ReferencesModule._bindCategoryTabs();
    ReferencesModule._bindSearch();
  }

  static _bindCategoryTabs() {
    const container = document.getElementById('ref-category-tabs');
    if (!container) return;
    container.querySelectorAll('.ref-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.ref-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ReferencesModule._currentCat = btn.dataset.cat;
        ReferencesModule.render();
      });
    });
  }

  static _bindSearch() {
    const input = document.getElementById('ref-search-input');
    if (!input) return;
    input.addEventListener('input', () => {
      ReferencesModule._searchTerm = input.value.trim().toLowerCase();
      ReferencesModule.render();
    });
  }

  static render() {
    ReferencesModule._renderSites();
    ReferencesModule._renderDocs();
  }

  static _renderSites() {
    const grid = document.getElementById('ref-sites-grid');
    if (!grid) return;

    let sites = SITE_GROUPS;
    if (ReferencesModule._currentCat !== 'all') {
      sites = sites.filter(s => s.cat === ReferencesModule._currentCat);
    }
    if (ReferencesModule._searchTerm) {
      const q = ReferencesModule._searchTerm;
      sites = sites.filter(s => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
    }

    grid.innerHTML = sites.map(s => `
      <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="ref-site-card">
        <div class="ref-site-icon">${_iconSVG(s.icon)}</div>
        <div class="ref-site-info">
          <span class="ref-site-title">${s.title}</span>
          <span class="ref-site-desc">${s.desc}</span>
        </div>
      </a>
    `).join('');
  }

  static _renderDocs() {
    const list = document.getElementById('ref-docs-list');
    const empty = document.getElementById('ref-docs-empty');
    const count = document.getElementById('ref-result-count');
    if (!list) return;

    let docs = REF_DOCS;
    if (ReferencesModule._currentCat !== 'all') {
      docs = docs.filter(d => d.cat === ReferencesModule._currentCat);
    }
    if (ReferencesModule._searchTerm) {
      const q = ReferencesModule._searchTerm;
      docs = docs.filter(d => d.title.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q));
    }

    if (count) count.textContent = `共 ${docs.length} 项`;

    if (docs.length === 0) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');

    list.innerHTML = docs.map(d => `
      <div class="ref-doc-item">
        <div class="ref-doc-left">
          ${_formatIcon(d.format)}
          <div class="ref-doc-info">
            <span class="ref-doc-title">${d.title}</span>
            <span class="ref-doc-meta">${d.desc}</span>
          </div>
        </div>
        <div class="ref-doc-right">
          <span class="ref-doc-size">${d.size}</span>
          <a class="ref-download-btn" href="${d.url || '#'}" ${d.url ? '' : 'onclick="return false;"'}>
            ${icon('download', { size: 14 })}
            ${d.downloadText || '下载'}
          </a>
        </div>
      </div>
    `).join('');
  }
}
