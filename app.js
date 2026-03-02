// ════════════════════════════════════════════════════════════════
//  光华管理学院本科生党支部 SOP 引擎 — app.js
//  Session 24 · High-Fidelity UI Scaffolding & Data Binding
//  2026-03-02
// ════════════════════════════════════════════════════════════════

// ── Constants ────────────────────────────────────────────────
const SOP_PATH = '流程指南/常见工作场景快速指南.md';

/** Four canonical roles + "all" as defined in Session 23 tagging schema */
const ROLES = [
  {
    key:      'all',
    icon:     '🌐',
    name:     '全部场景',
    desc:     '完整工作地图',
    headline: '全部工作场景',
    subline:  '共 9 个工作场景 · 点击左侧角色精准定位你的工作节点',
    patterns: [],
  },
  {
    key:      'leader',
    icon:     '🏛️',
    name:     '党小组组长',
    desc:     '组织统筹决策',
    headline: '党小组组长 的工作节点',
    subline:  '负责活动统筹、主题确定、方案审批与会后指导',
    patterns: ['党小组组长'],
  },
  {
    key:      'commissioner',
    icon:     '📋',
    name:     '块块委员',
    desc:     '组织 / 宣传 / 纪检',
    headline: '块块委员 的工作节点',
    subline:  '跨党小组职能保障：信息通知（组织）、档案归档（宣传）、考勤督办（纪检）',
    patterns: ['组织委员', '宣传委员', '纪检委员'],
  },
  {
    key:      'organizer',
    icon:     '🎯',
    name:     '活动组织者',
    desc:     '策划执行督办',
    headline: '活动组织者 的工作节点',
    subline:  '策划活动方案、执行全程、完成复盘与材料归档',
    patterns: ['活动组织者'],
  },
  {
    key:      'deep',
    icon:     '💼',
    name:     '深度参与者',
    desc:     '承担具体分工',
    headline: '深度参与者 的工作节点',
    subline:  '承担宣传制作等具体工作分工，产出活动摘要与配图',
    patterns: ['深度参与者'],
  },
];

// ── State ─────────────────────────────────────────────────────
let sopSections = [];
let activeRole  = 'all';

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildRolePanels();
  loadSOP();
});

// ════════════════════════════════════════════════════════════════
//  ROLE PANEL CONSTRUCTION
// ════════════════════════════════════════════════════════════════

function buildRolePanels() {
  const desktop = document.getElementById('sidebar-desktop');
  const mobile  = document.getElementById('mobile-sidebar');

  ROLES.forEach(role => {
    desktop.appendChild(makeBtn(role, false));
    mobile.appendChild(makeBtn(role, true));
  });

  applyActiveState('all');
}

function makeBtn(role, isMobile) {
  const btn = document.createElement('button');
  btn.dataset.role = role.key;
  btn.setAttribute('aria-label', role.name);

  if (isMobile) {
    btn.className = 'role-btn role-btn-mobile glass';
    btn.innerHTML = `
      <span class="role-icon">${role.icon}</span>
      <span class="role-name text-gray-700">${esc(role.name)}</span>`;
  } else {
    btn.className = 'role-btn glass rounded-xl w-full px-4 py-3 flex flex-col shadow-md';
    btn.innerHTML = `
      <span class="role-icon text-xl mb-1">${role.icon}</span>
      <span class="role-name font-semibold text-sm text-gray-700">${esc(role.name)}</span>
      <span class="role-desc text-xs text-gray-400 mt-0.5 leading-snug">${esc(role.desc)}</span>`;
  }

  btn.addEventListener('click', () => selectRole(role.key));
  return btn;
}

function applyActiveState(roleKey) {
  document.querySelectorAll('.role-btn').forEach(btn => {
    const isActive = btn.dataset.role === roleKey;
    btn.classList.toggle('active', isActive);
  });
}

// ════════════════════════════════════════════════════════════════
//  DATA LOADING
// ════════════════════════════════════════════════════════════════

async function loadSOP() {
  try {
    const resp = await fetch(SOP_PATH);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} — 无法读取数据源文件`);
    const text = await resp.text();
    sopSections = parseSOP(text);
    showReady();
    renderView('all');
  } catch (err) {
    showError(err.message);
    console.error('[SOP Engine]', err);
  }
}

function showReady() {
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('scenes-container').classList.remove('hidden');
  setStatusPill('已就绪', true);
}

function showError(msg) {
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('error-state').classList.remove('hidden');
  document.getElementById('error-msg').textContent = msg;
  setStatusPill('加载失败', false);
}

function setStatusPill(text, ok) {
  const pill = document.getElementById('status-pill');
  const dot  = document.getElementById('status-dot');
  const lbl  = document.getElementById('status-text');
  pill.classList.remove('hidden');
  lbl.textContent = text;
  dot.className = `w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-300' : 'bg-red-400 pulse-dot'}`;
}

// ════════════════════════════════════════════════════════════════
//  MARKDOWN PARSER
// ════════════════════════════════════════════════════════════════

/**
 * Splits the SOP markdown into scene sections (## N. …).
 * Returns Array<Section>.
 */
function parseSOP(raw) {
  // Remove YAML front-matter
  const text = raw.replace(/^---[\s\S]*?---\s*/, '');

  // Split by lines that start a level-2 heading
  const parts = text.split(/\n(?=## )/);

  const sections = [];
  parts.forEach((part, idx) => {
    if (!part.trimStart().startsWith('## ')) return;

    const nlPos    = part.indexOf('\n');
    const heading  = (nlPos === -1 ? part : part.slice(0, nlPos))
                       .replace(/^##\s+/, '').trim();
    const body     = nlPos === -1 ? '' : part.slice(nlPos + 1).trim();

    // Keep only numbered scenarios (1–9)
    if (!/^\d/.test(heading)) return;

    const numMatch = heading.match(/^(\d+)/);
    sections.push({
      id:           `scene-${idx}`,
      heading,
      number:       numMatch ? numMatch[1] : String(idx),
      displayTitle: heading.replace(/^\d+[.．\s]+/, '').trim(),
      body,
      tableGroups:  extractTableGroups(body),
    });
  });

  return sections;
}

/**
 * Walks the body line-by-line, collecting markdown tables together
 * with the nearest preceding ### / #### sub-heading as context.
 * Returns Array<{ context: string|null, table: ParsedTable }>.
 */
function extractTableGroups(body) {
  const lines   = body.split('\n');
  const groups  = [];
  let ctx       = null;    // current sub-heading context
  let tLines    = [];      // accumulator for the current table block
  let inTable   = false;

  const flushTable = () => {
    if (!inTable || tLines.length < 3) { tLines = []; inTable = false; return; }
    const parsed = parseTable(tLines);
    if (parsed && parsed.rows.length > 0) groups.push({ context: ctx, table: parsed });
    tLines = []; inTable = false;
  };

  for (let i = 0; i <= lines.length; i++) {
    const line    = i < lines.length ? lines[i] : '';
    const trimmed = line.trim();

    if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
      flushTable();
      ctx = trimmed.replace(/^#{3,4}\s+/, '').trim();
    } else if (trimmed.startsWith('|')) {
      inTable = true;
      tLines.push(line);
    } else if (inTable) {
      flushTable();
    }
  }

  return groups;
}

/**
 * Parses a block of raw markdown table lines into { headers, rows }.
 * Each row has: { cells, roles, times }.
 */
function parseTable(lines) {
  const headers = splitTableRow(lines[0]);
  if (headers.length === 0) return null;

  const rows = [];
  for (let i = 2; i < lines.length; i++) {         // skip header + separator
    const trimmed = lines[i].trim();
    if (!trimmed || /^\|[-: |]+\|$/.test(trimmed)) continue;  // skip separator rows

    const cells = splitTableRow(lines[i]);
    if (!cells.length) continue;

    rows.push({
      cells,
      roles: extractTagValues(cells, '角色'),
      times: extractTagValues(cells, '时间'),
    });
  }

  return rows.length ? { headers, rows } : null;
}

/** Split a markdown table row by | into trimmed cell strings. */
function splitTableRow(line) {
  return line.split('|')
    .map(c => c.trim())
    .filter((_, i, a) => i > 0 && i < a.length - 1);
}

/** Extract all `[tagType: value]` values from an array of cell strings. */
function extractTagValues(cells, tagType) {
  const re  = new RegExp(`\\[${tagType}:\\s*([^\\]]+)\\]`, 'g');
  const out = [];
  for (const cell of cells) {
    let m;
    while ((m = re.exec(cell)) !== null) out.push(m[1].trim());
  }
  return out;
}

// ════════════════════════════════════════════════════════════════
//  ROLE SELECTION & VIEW RENDERING
// ════════════════════════════════════════════════════════════════

function selectRole(roleKey) {
  if (roleKey === activeRole) return;
  activeRole = roleKey;
  applyActiveState(roleKey);

  // Animate out → render → animate in
  const container = document.getElementById('scenes-container');
  container.style.transition = 'opacity 0.17s ease, transform 0.17s ease';
  container.style.opacity    = '0';
  container.style.transform  = 'translateY(8px)';

  setTimeout(() => {
    renderView(roleKey);
    container.style.opacity   = '1';
    container.style.transform = 'translateY(0)';
  }, 170);
}

function renderView(roleKey) {
  const role      = ROLES.find(r => r.key === roleKey) ?? ROLES[0];
  const container = document.getElementById('scenes-container');
  const isAll     = roleKey === 'all';

  // Update header labels
  document.getElementById('role-headline').textContent = role.headline;
  document.getElementById('role-subline').textContent  = role.subline;

  let totalNodes = 0;
  const fragments = [];

  for (const section of sopSections) {
    const result = isAll
      ? buildFullCard(section)
      : buildFilteredCard(section, role);

    if (result.html) {
      fragments.push(result.html);
      totalNodes += result.nodeCount;
    }
  }

  // Node counter
  const counterEl = document.getElementById('node-counter');
  if (!isAll && totalNodes > 0) {
    counterEl.classList.remove('hidden');
    document.getElementById('node-count').textContent = totalNodes;
  } else {
    counterEl.classList.add('hidden');
  }

  // Render or show empty state
  if (fragments.length === 0) {
    container.innerHTML = `
      <div class="glass rounded-2xl p-10 border border-white/60 shadow text-center">
        <div class="text-5xl mb-4">🔍</div>
        <p class="text-gray-500 text-sm">当前角色在本 SOP 中暂无匹配的工作节点</p>
      </div>`;
  } else {
    container.innerHTML = fragments.join('');
  }

  // Staggered entrance animation
  container.querySelectorAll('.scene-card').forEach((card, i) => {
    card.style.opacity   = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.32s ease, transform 0.32s ease';
      card.style.opacity    = '1';
      card.style.transform  = 'translateY(0)';
    }, 45 + i * 60);
  });
}

// ── Full card (all mode) ──────────────────────────────────────

function buildFullCard(section) {
  return {
    html: `
      <div class="scene-card glass rounded-2xl border border-white/60 shadow-lg overflow-hidden">
        ${cardHeader(section.number, section.displayTitle, 0, true)}
        <div class="px-5 py-4 prose-sop">${renderMd(section.body)}</div>
      </div>`,
    nodeCount: 0,
  };
}

// ── Filtered card (role mode) ─────────────────────────────────

function buildFilteredCard(section, role) {
  let nodeCount = 0;
  let bodyHTML  = '';

  for (const { context, table } of section.tableGroups) {
    const matched = table.rows.filter(row =>
      row.roles.some(r => role.patterns.some(p => r.includes(p)))
    );
    if (!matched.length) continue;

    nodeCount += matched.length;

    if (context) {
      bodyHTML += `
        <p class="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2 mt-3">
          <span class="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:#CE1126"></span>
          ${esc(context)}
        </p>`;
    }

    bodyHTML += buildTableHTML(table.headers, matched, true);
  }

  if (!nodeCount) return { html: '', nodeCount: 0 };

  return {
    html: `
      <div class="scene-card glass rounded-2xl border border-white/60 shadow-lg overflow-hidden">
        ${cardHeader(section.number, section.displayTitle, nodeCount, false)}
        <div class="px-5 py-4">${bodyHTML}</div>
      </div>`,
    nodeCount,
  };
}

// ── Card Header ───────────────────────────────────────────────

function cardHeader(num, title, nodeCount, isAll) {
  const badge = (!isAll && nodeCount > 0)
    ? `<span class="ml-auto flex-shrink-0 text-xs rounded-full px-2.5 py-0.5 font-semibold"
            style="background:rgba(206,17,38,0.12);color:#9B0000;">${nodeCount} 节点</span>`
    : '';
  return `
    <div class="px-5 py-3.5 border-b border-gray-100/60 flex items-center gap-2.5"
         style="background:rgba(206,17,38,0.04);">
      <span class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style="background:#CE1126;">${esc(num)}</span>
      <h2 class="font-bold text-gray-800 text-sm leading-snug flex-1 min-w-0">${esc(title)}</h2>
      ${badge}
    </div>`;
}

// ── Table Builder ─────────────────────────────────────────────

function buildTableHTML(headers, rows, highlightAll) {
  const headCells = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const bodyRows  = rows.map(row => {
    const cls   = highlightAll ? 'highlighted' : '';
    const cells = row.cells.map(c => `<td>${formatCell(c)}</td>`).join('');
    return `<tr class="${cls}">${cells}</tr>`;
  }).join('');

  return `
    <div class="overflow-x-auto rounded-xl mb-3 border border-gray-100/60">
      <table class="sop-table">
        <thead><tr>${headCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
//  FORMATTING HELPERS
// ════════════════════════════════════════════════════════════════

/**
 * Format a raw markdown table cell:
 * - [角色: xxx] (with or without backticks) → red role badge
 * - [时间: xxx] (with or without backticks) → blue time badge
 * - remaining text → HTML-escaped
 */
function formatCell(raw) {
  const parts = [];
  const re    = /`?\[(角色|时间):\s*([^\]]+)\]`?/g;
  let last = 0, m;

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) parts.push(esc(raw.slice(last, m.index)));
    const [, tagType, val] = m;
    if (tagType === '角色') {
      parts.push(`<span class="badge-role">👤 ${esc(val.trim())}</span>`);
    } else {
      parts.push(`<span class="badge-time">⏱ ${esc(val.trim())}</span>`);
    }
    last = m.index + m[0].length;
  }

  parts.push(esc(raw.slice(last)));
  return parts.join('');
}

/**
 * Render raw markdown via marked.js, then post-process any
 * `<code>[角色: …]</code>` / `<code>[时间: …]</code>` fragments
 * that marked.js emitted from backtick-wrapped tags into styled badges.
 */
function renderMd(md) {
  if (!window.marked) return `<pre class="text-xs text-gray-500 whitespace-pre-wrap">${esc(md)}</pre>`;

  marked.use({ gfm: true, breaks: false });
  const html = marked.parse(md);

  return html
    .replace(/<code>\[角色:\s*([^\]<]+)\]<\/code>/g,
      (_, role) => `<span class="badge-role">👤 ${esc(role.trim())}</span>`)
    .replace(/<code>\[时间:\s*([^\]<]+)\]<\/code>/g,
      (_, time) => `<span class="badge-time">⏱ ${esc(time.trim())}</span>`);
}

/** HTML-escape a string value. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
