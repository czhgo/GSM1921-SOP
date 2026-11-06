# 浮层承载面专项（批次 497）

## Why

第四轮交接把「浮窗已知例外」列为三项（代提交复盘、宣传归档 overlay、内联两列表单），实测后判定范围被低估：

- 唯一浮窗守卫 `ui-modal-form-guard` 的 G3 只扫 `openModal(` 调用点，**自建浮层根本不在扫描面内**；白名单为空造成「零例外」的假绿。
- `docs/src` 仍有 **12 处自建浮层 / 7 文件**：其中 **7 处是写入口**（上传宣传材料、文件外发、上传照片、标注照片、写支部文件、上传新版、一键汇报），关闭即丢已填内容；5 处是只读/确认（参与者摘要、关闭受阻、结束工作组、表决结果、归档详情），无 `role="dialog"` 之外还缺焦点接管与 inert，`a11y-tree` 照不到。
- 同一病灶 ≥3 处 ⇒ 按项目传统升级专项（§12.2），先改引擎与守卫，再回收调用点，不做逐页补丁。

## What

1. **守卫扩容**：`ui-modal-form-guard` 新增「浮层唯一实现」判据——`docs/src/**` 中作为对话框使用的 `position:fixed;inset:0` / `fixed inset-0` 必须走 `openModal`；非对话框固定层（toast / 同步横幅 / 锚定 popover）进白名单并写理由。
2. **迁移 7 个写入口**到 `openModal`：动作进 `footerHtml`，关闭 / Esc / 遮罩统一走 `onCancel`，清理临时资源（objectURL、未提交选择）。
3. **迁移 5 个只读/确认浮层**到 `openModal`：统一 header 纯文本标题、焦点接管、背景 inert、关闭按钮。
4. **复盘表单拆分**：`renderActivityReviewFormHtml` 增加 `showActions` 选项；页面内联保留按钮，`secretary-delegate-review` 浮窗把「提交复盘」放进 footer。
5. **同源改准**：`DESIGN_SYSTEM §4.27 M-4` 的高度口径与代码/守卫一致（`min(92dvh, 900px)`）。

## Verification

- `node --test server/test/ui-modal-form-guard.test.mjs` 全绿，且新判据能报出改造前的 12 处（先红后绿，非空转）。
- `a11y-tree`、`page-sweep`、`module-load`、`form-loop-sweep`、`copy-screen-guard`、`ui-redundancy-guard` 全绿。
- 真机：上传材料 / 上传照片 / 写支部文件 / 一键汇报 / 代提交复盘五窗，390px 与 1440px 各看一次；Esc / 遮罩 / × 三条路径关闭后无残留状态。
- `npm run test:daily` 0 断言失败。

## Boundaries

- 不改页签名、权限、数据模型与业务语义。
- 不重写表单字段与校验；只改承载形态、动作位置与关闭语义。
- 只读浮层只补对话框语义与视觉区，不新增内容。
- 不处理 `window.confirm` / `window.alert` 原生对话框（不在 `openModal` 体系内），留待专项裁定。
