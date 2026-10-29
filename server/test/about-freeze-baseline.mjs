// role: [工程师]+[AI]
// about-freeze-baseline.mjs — About「独立冻结件」内容基线（给 `about-freeze-guard.test.mjs` 消费）
// 生成日期：2026-10-29 · 依据：支书 2026-10-27 裁定（About 是独立冻结件，与项目 IA 无关）
//
// 口径（本文件只放数据，判据在守卫里）：
//   · `sha256`＝**去 BOM ＋ 换行统一为 `\n`** 后的内容 SHA-256（行尾差异不算改动）。
//   · `locator: null` ⇒ 整文件哈希（三件套：页面 / 样式 / 入口脚本）。
//   · `locator: '…'` ⇒ 只对**包含该定位串的那一行**取 `trim()` 后哈希（引用面用；
//     这两个文件会因别的原因正常变动，整文件哈希会把正常改动也判红）。
//     定位串未命中 ⇒ 守卫判红（文案「定位串未命中，条目可能被删」）。
//
// ⚠ 纪律：本台账**不因「想让它变绿」而改哈希**。About 内容一字不动；确属支书新裁定时，
//   须在批次记录里写明理由并同批重算基线（5 条，不多不少）。

export const ABOUT_FREEZE_BASELINE = [
  {
    file: 'docs/about.html',
    locator: null, // 整文件
    sha256: 'dd7f40ec21a1e503d8b903a70fc3062e71444755a918788edcd25429f3e3b4d7',
    reason: 'About 页面本体：支书 2026-10-27 裁定「原样保留、不作修改」（独立冻结件，不纳入 IA 统计）',
  },
  {
    file: 'docs/src/about.css',
    locator: null, // 整文件
    sha256: '07732c884471c6278651d9f61c06e3006e36411fe8535640adb6b98045f1307b',
    reason: 'About 专属样式（自带 `--ab-*` 暖纸色板、作用域隔离）：随页面一并冻结',
  },
  {
    file: 'docs/src/entries/pages/about-entry.js',
    locator: null, // 整文件
    sha256: '94047a03bc8600f475291da22eae00cd26e3cc68f63c02eef3ee9913d34b918b',
    reason: 'About 入口脚本：与页面 / 样式同属三件套，整文件冻结',
  },
  {
    file: 'docs/src/core/domain/function-catalog.js',
    // 定位串原文（带引号与逗号，避免误命中 `help` 卡里的 `related: ['about']`）：
    //   { id: 'about', name: '关于',
    locator: "{ id: 'about', name: '关于',",
    sha256: '578a384428cdfcf501995d42a4f9464f21de2c1a10c9ff40c1b82b3f4d27750e',
    reason: '引用面①：功能目录「关于」卡（含 `related` 字段）——支书 2026-10-27 裁定不许删、不许改',
  },
  {
    file: 'docs/help.html',
    // 定位串原文：`系统页面分为根页面`（帮助页正文「页面清单」段，段内列举含「关于」）
    locator: '系统页面分为根页面',
    sha256: '57985375f92e2e77d6f967e54237580098db81ad41e36fb3f102b3d8dd05d325',
    reason: '引用面②：帮助页正文的页面清单段（含「关于」）——支书 2026-10-27 裁定不许删、不许改',
  },
];
