# AGENTS — docs/src

## 读什么（最多 3 条）
1. `content/04_web_design/design-system/DESIGN_SYSTEM.md` §12.11–§12.14（状态语言 / 字段外壳 / 动效令 / 活动类别色）。
2. `content/04_web_design/design-system/CASES.md`（同一改动面的判例与边界）。
3. `server/test/style-baseline.mjs`（hex / 小字 / 死类等存量基线，改前先看已有例外）。

## 改什么
- 页面外壳与启动装配：`core/boot/`、`components/shell/`。
- 工作台 tab：`entries/tabs/<role>/`（disc / leader / org / party-committee / prop / secretary / visitor）。
- 领域单一源：`core/domain/constants.js`（角色、活动类别 tone、状态枚举）。
- 服务层：`services/{activity,branch,core,governance,member}/`。
- 样式：`styles.css` 只消费 token；组件样式落在 `components/ui/*`。
- 数据：运行时门面 `data/data-adapter.js` / `data/api-adapter.js`；演示种子 `data/mock/*`。

## 禁什么（3 条硬禁）
1. 不得在 `docs/**` 新增硬编码 hex（`#RGB` / `#RRGGBB`，含 JS 模板串）。判定：`cd server; node --test test/hex-hardcode-guard.test.mjs`；例外只能登记进 `test/style-baseline.mjs`。
2. 不得用 `color-mix()`、`rgba(主题色)`、`filter: brightness()` 生成主题色。判定：`node --test test/theme-palette-guard.test.mjs`（SD-12 计数为 0）。
3. 不得写裸 `transition: <属性> <毫秒>` 或 `transition: all`；只用 `--motion-*` / `--ease-*` 加白名单属性。判定：`node --test test/motion-guard.test.mjs`（SD-30）。

## 验证命令
```powershell
# 定向（秒级；静态守卫，不需要 3000 端口）
cd server; node --test test/field-shell-guard.test.mjs test/motion-guard.test.mjs test/activity-tone-guard.test.mjs
# 按改动面追加：改色板 → theme-palette-guard + hex-hardcode-guard；改焦点 → ui-focus-ring
# 全量日常（实测 ≈150s，预算 ≤180s）
cd server; npm run test:daily
# 发布 / 大批改动（预算 ≤1200s；README 实测量级 ≈23 分钟，超预算先排除机器负载）
cd server; npm run test:full
```

## 交接口
- 视觉 / 令牌规范：先改 `content/04_web_design/design-system/DESIGN_SYSTEM.md`，判例进 `CASES.md`，再改代码。
- 接口 / 权限：`server/routes/**`（见 `server/AGENTS.md`）。
- 数据模型：`content/04_web_design/data/DATA_MODEL.md`。
- 守卫基线：`server/test/style-baseline.mjs`（同批改，交付说明写理由）。

## 常见坑
- 改 `docs/src/**` 后忘 bump `?v=`：`version-stamp` 必红；同页两个模块实例还会静默空白。
- 把 `docs/src/…js` 路径当数据字符串写进测试，`docs/scripts/bump-version.mjs` 会误改（批次 44 事故）；写成 `SRC + '相对路径'`。
- `data/mock-adapter.js` 的 mock 延迟是单一源且可配置（默认 80ms；`window.__MOCK_DELAY_MS` / `process.env.MOCK_DELAY_MS` 可覆盖，上限 5000ms）；测试变慢不是回归，不要为此改断言。判定：`server/test/frontend-foundations-guard.test.mjs::F11`。

## 防逃逸三件套（示例）
| 件 | 内容 |
|---|---|
| 触发条件 | 新增颜色 / 动效 / 字段外壳用法 |
| 唯一落点 | `styles.css` 令牌 + 组件类；确需例外只登记 `server/test/style-baseline.mjs` |
| 检查方式 | `hex-hardcode-guard` / `theme-palette-guard` / `motion-guard` / `field-shell-guard` 全绿 |
