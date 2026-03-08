**Purpose**: 管理所有与界面呈现相关的变更——HTML 结构、CSS 样式、Mermaid 图表视觉样式。UI 层是变更流水线的终点，只能被上游（SOP/Schema/Service）驱动，不可反向修改。

**Trigger**: UI、页面、按钮、布局、样式、体验、index.html、颜色、icon、动画、视觉

**Allowed Files**: `index.html`, `assets/*`

---

## Binding Constraints

| # | Constraint |
|---|-----------|
| C1 | DOM 写操作须经由 `renderUI()` 唯一入口；禁止在 `main.js` 之外散落 `document.querySelector().innerHTML` 直写 |
| C2 | UI 变更前必须确认 Schema（`domain.js`）和 Service（`service.mock.js` / `service.runtime.js`）已更新 |
| C3 | Mermaid 图表颜色方案：蓝色=条条, 红色=块块, 绿色=起止节点 |
| C4 | 修改前输出三要素声明：Detected Scenario / Allowed Scope / Modification Plan |
| C5 | 禁止将英文指令、YAML 逻辑块或元注释写入 `index.html` 人类可见内容区 |

## Execution Steps

- [ ] 确认上游 SOP/Schema/Service 变更已完成（Change Pipeline 铁律）
- [ ] 输出三要素声明
- [ ] 仅修改 `index.html` / `assets/*`，不触碰 `src/`
- [ ] 更新执行日志 `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`
