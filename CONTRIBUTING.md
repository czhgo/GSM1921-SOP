# 贡献指南（GSM1921-SOP）

> 本文档面向参与本仓库开发的工程师与 AI 协作方。先读 [README.md](./README.md) 了解项目定位，再读 [CLAUDE.md](./CLAUDE.md) 了解治理约定。

## 一、项目定位与边界

- 光华管理学院本科生党支部的内部工作系统（演示 + 真实运行双态），**不是面向公众的产品**。
- 仓库内 `.ctx/` 执行日志、`content/01_strategy/references/` 历史会议材料为**支部内部资产，随仓库保留上传**——不要脱敏、不要移出、不要加入 `.gitignore`。
- 术语纪律：以制度性文件/上级文件原文（T1）与书记确认表述（T2）为准；**不得自造分类**（"党建/党务二分""组织生活会"等错误范畴已废止，勿再引入）。

## 二、仓库结构速览

| 目录 | 内容 |
|---|---|
| `docs/src/` | 前端（纯静态 ESM + `?v=` 版本戳裸 import，无 npm 依赖） |
| `docs/src/core/` | 纯数据/纯函数：constants、work-map、config-clean、tab-nav、utils（**双端可加载**） |
| `docs/src/components/` + `forms.js/badges.js/reporting.js` | 组件与对外库出口（调用只认库，不直连内部实现文件） |
| `docs/src/services/` | 业务服务（数据域接线：UI 不直连 `mock/*`） |
| `docs/src/entries/` | 页面/工作台 tab 入口（懒加载） |
| `docs/src/modules/capabilities/` | capability 注册（tab 清单唯一声明处） |
| `docs/src/workflow/` | SOP 数据 + L3 block manifest |
| `server/` | Express + better-sqlite3 API（前端 API 模式的同一后端） |
| `content/` | 文档体系（制度/使用规范/设计演进） |

## 三、本地开发起步

```bash
cd server
npm install          # 首次（playwright 需单独下载：npx playwright install chromium）
npm start            # http://localhost:3000
npm test             # 全量测试（node --test 并发 1；自动带 DISABLE_PASSWORD_CHECK=1 测试逃逸门）
```

- 前端静态调试：直接打开 `docs/index.html` 等入口（mock 模式）；API 模式切 `docs/src/config/deploy.js` 的 `DEPLOY_MODE='server'`。
- 沙箱/受限环境跑浏览器测试：把 Playwright 临时目录指向项目内可写目录后再 `npm test`：
  `$env:TMP="<仓库>\server\.tmp\pw"; $env:TEMP=$env:TMP`
- 环境变量模板见 `server/.env.example`。

## 四、工程纪律（改代码前必读）

1. **统一扎口**：同一业务事实只允许一份可编辑副本。新增/发现重复 → 先在库/单一源出口收敛（如 `components/forms.js`、`core/constants.js`、`core/config-clean.js`），再删第二份。判据：同一事实出现第二份即扎口。
2. **数据域接线**：人员/名单/种子一律经 `services/*` 获取，UI 层不得从 `mock/*` 直接 import 数据常量。
3. **跨端共享**：server 与前端要共用的净化/校验/清单 → 放 `docs/src/core/`（零依赖纯 ESM），server 直接 import；**不得在两端各写一份**。
4. **防漂移测试**：任何"双端/多处同义清单"收敛后，补键集双向断言测试（示例：`server/test/flow-catalog-sync.test.mjs`、`roles-sync`、`scene-write-sync`、`vote-option-sync`）。
5. **文件头注释**：沿用 `// role: [工程师]+[AI]` 头注释与中文注释；改动留日期与缘由。
6. **`?v=` 版本戳**：docs/src 内部 import 带 `?v=YYYYMMDDx`（module-load 按同 query 取同实例）。整体失效才 bump（`docs/scripts/bump-version.mjs`），不要为单点改动随意 bump。
7. **不改动的存量**：书记裁定的「历史记录不可变」——`.ctx` 记录、已发生的事态日志等保留原样。

## 五、测试与验收

- 新增/修改功能至少覆盖：相关纯函数/API 单测 + 受影响模块 `module-load.test.mjs` 加载完整性；涉及 UI 交互补 Playwright E2E（等待目标统一为 `isConnected`/`document.readyState`）。
- 改完跑 `cd server && npm test`，全部绿再提交。
- 提交纪律：**少而精**——相关改动攒批合并提交，不要逐文件零碎 commit。
- **push 必须经支部负责人（书记）明确批准**，AI 不得自行 push。

## 六、贡献前 Checklist

- [ ] 无自造分类/术语（对照 T1/T2 权威）
- [ ] 无新增重复实现（重复先扎口）
- [ ] UI 不直连 mock 数据
- [ ] 跨端共用逻辑已收敛（无两端双写）
- [ ] 已跑 `npm test` 全绿
- [ ] 改动攒批、中文注释、留日期缘由
