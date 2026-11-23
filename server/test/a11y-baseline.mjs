// role: [工程师]+[AI]
// a11y-baseline.mjs — 可访问性静态守卫的存量基线（`close-six-dim-gaps` T10 · 2026-11-15）
//
// 纪律（同 `style-baseline.mjs`）：**只减不增**。修掉存量后同批下调对应计数；
// 不得为变绿上调，也不得缩窄扫描面（`scan` 是下限，防「把判红面改小 ⇒ 恒绿」）。
// 计数口径见 `a11y-guard.test.mjs` 文件头（六条静态近似判据）。
//
// 2026-11-15 首版实跑读数（329 文件 / 样本 934 钮与链接 · 266 表单控件 · 71 section ·
//   12 role=tab · 26 role=button 容器 · 27 纯图标钮）：
//   names 0（按钮 / 链接名称已全部具备）· labels 82 · sections 18 · tabs 0 ·
//   roleButtons 4 · iconButtons 0。
//   本轮只修 T8/T9 路径上的违规（`docs/archive.html` 检索框补 aria-label）；
//   其余存量原样登记，后续批次收敛时**同批下调**。
export const A11Y_BASELINE = {
  // 六类违规的存量上限
  names: 0,
  labels: 82,
  sections: 18,
  tabs: 0,
  roleButtons: 4,
  iconButtons: 0,
  // 扫描面下限（非空转）：文件数与各类被判元素的最小样本量
  scan: { files: 300, names: 900, labels: 250, sections: 60, tabs: 10, roleButtons: 20, iconButtons: 20 },
};
