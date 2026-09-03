---
title: "模块化 / 插件化 / 开源化评估——统一扎口方向裁决"
type: design
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-09-03"
status: active
related_files: [ARCHITECTURE_EVOLUTION.md, PARTY_COMMITTEE_DESIGN.md, ../module/SOP_WEB.md, ../deploy/DEPLOYMENT_ROADMAP.md]
---

# 模块化 / 插件化 / 开源化评估

> **定位**：书记 2026-09-03 问询「如果做一次 模块化、插件化、开源化 的 100 分评估，你会怎么输出？我以此来指导你」。本文档固化该评估结论与行动优先级，作为后续开发顺序的方向选择依据。
> **受众**：[工程师]+[AI]（架构维护者）+ 书记（方向裁决人）
> **关联**：[ARCHITECTURE_EVOLUTION.md](ARCHITECTURE_EVOLUTION.md)（组件化/插件化演进母文档）、[PARTY_COMMITTEE_DESIGN.md](PARTY_COMMITTEE_DESIGN.md)（两级治理设计）。

---

## 一、评估结论速览

| 维度 | 得分 | 一句话结论 |
|------|------|-----------|
| 模块化 | 80 / 100 | 分层清晰、复用落地真实；短板在**调用面不统一**（组件出口零散、服务直连 UI、数据源直连 mock） |
| 插件化 | 72 / 100 | 已有 capability 自注册 + 支部级模块开关雏形；缺**插件清单/依赖契约/L3 block manifest**，拖拽编排仍属愿景 |
| 开源化 | 74 / 100 | 中文文档与测试较厚；缺 LICENSE/贡献流程/示例数据外置，`?v=` 软版本非语义化发布 |
| **综合** | **≈ 75 / 100** | 最短板恰在书记点名的方向——**统一扎口** |

---

## 二、统一扎口范式（本评估确立的第一个工程范式）

书记定调：**同一域可以有若干个函数（甚至若干个实现文件），但对外只暴露一个库文件；调用方一律 import 该库，不直接触碰内部实现。**

落地样板（P0 试点一，已完成）：

- 新建 `docs/src/components/forms.js` —— 表单域唯一出口，聚合重导出字段积木（form-field：textField/textareaField/selectField/dateField/labelHtml/errorHtml）与外壳（form-shell：recordFormShell）。
- 三个直连调用方（dispatch-tab / write-tab / taskforce-tab）全部收口到库。
- 仓库中已无直接 import form-field.js / form-shell.js 的调用方。
- 回归：模块加载 116/116、party 相关 E2E 5/5 全绿，零行为变化。

**改造纪律（每次扎口必守）**：
1. 新增库聚合重导出，内部实现文件不搬运、不改名。
2. 调用方只改 import 来源一行；运行期零行为变化。
3. 每批扎口后跑 module-load + 受影响 E2E 回归。
4. 禁止双轨：一旦建库，同域内新代码一律走库，存量直连同步收口。

---

## 三、逐维评分依据

### 3.1 模块化 —— 80/100

得分项：
- 五层分层清晰：core / services / components / modules(capabilities) / entries(tabs)。
- tab 动态 import 懒加载；capability 自注册；组件积木化已落地（badge 全站统一、表单字段/外壳、收件箱等）。
- 表单 B1~B4 后输入件已全局收编（input-flat 14px、label for 关联、aria）。

失分项（列入修复线）：
- 组件出口零散：除 forms.js 外，badge/query-view/picker/modal 仍被各层逐文件直连。
- 服务层存在 UI 依赖（如 services/notice.js import badgeHtml 生成 HTML）。
- entries/tabs 直连 `mock/*`，数据源可替换性差（接入真实后端的前置债）。

### 3.2 插件化 —— 72/100

得分项：
- registry 自注册 + 按 scope 组装（workspace:secretary / workspace:party-committee）。
- 支部实例化 + config.modules/blocks 启停 = 模块开关雏形；支部级 fileSpaceIsolated。

失分项（列入修复线）：
- 无插件清单/依赖关系/冲突检测契约。
- 工作台 tab 显隐需 workspace-shell 与 capability tabs 双维护。
- 能力与页面 scope 常量强绑定，未达到"配置即组合"。
- L3 block manifest（块的 inputs 声明、事件、校验）未定义 → 拖拽工作流模块（根 README 总目标）的代码前提未立。

### 3.3 开源化 —— 74/100

得分项：
- 全程中文可读设计/规范文档；design（content）与 spec 职责已纠偏。
- 代码带 role 标注与设计源链接；测试覆盖厚（116 模块加载 + 多组 E2E）。
- 根 README 已收录「工作流模块化」总目标（L1→L5 愿景）。

失分项（列入修复线）：
- mock 数据内嵌示例姓名/账号；dev 登录卡直连 mock → 需"示例数据外置"才可他人部署。
- 无 LICENSE / CONTRIBUTING / 发布（release）工作流。
- `?v=` 软版本利于日常整体失效，但非语义化版本发布。

---

## 四、行动优先级（书记据此裁决开发顺序）

| 优先级 | 行动 | 现状 | 验收标准 |
|--------|------|------|---------|
| P0 | 统一扎口推广：以 forms.js 为样板，为徽章/状态、数据视图等高频组件域逐一建库出口，全站收口 | forms.js、badges.js、reporting.js 三库完成（组件平铺层同域多文件已收敛） | 每建一库跑 module-load + E2E；仓库无该域直连残留 |
| P0 | 数据域自动接线：tab/能力声明依赖的 service + mock 整体可替换 | person 域试点完成；其余域收口推进中 | 新增 demo 分支或后端接入时 UI 零改动（data-adapter 双实现全量走通） |
| P1 | 开源合规包：LICENSE、示例账号外置 env、部署/贡献说明 | 未开工 | 新机器按 README 可独立跑通并自建数据 |
| P2 | L3 block manifest + 拖拽编排（根 README 总目标） | 契约 v1 已出稿待书记确认（BLOCK_MANIFEST_CONTRACT.md） | 块声明 inputs/事件/校验契约定稿并经用户确认后编码 |

---

## 五、数据域接线契约 v1（2026-09-03 person 域试点确立）

**背景**：盘点显示全站 68 处直连 mock；mock/index.js 实为"旧兼容中转"（person 函数早已落到 services/person.js 又被 re-export 回 mock）。债根 = **UI/服务层 import 面挂在 mock，而非真正实现所在的 service**。

**试点（person 域，已完成）**：
- 全站人名函数（getPersonById/getPersonName/PersonStore）import 面从 `mock/index`、`mock/people` 统一迁至 **`services/person.js`**（唯一服务出口）；`_personName` 兼容别名调用点全部改 `getPersonName`。
- `mock/index.js` 清除 person 中转段（不再 re-export person 函数），退化为**纯种子/展示格式化数据仓**。
- 涉及约 40 个文件；module-load + party/multi-user/write-hover/function-catalog 7/7 回归绿。

**批次二（展示格式化提升，已完成 2026-09-03）**：
- 5 个纯展示格式化函数自 mock/* 原样提升至对应业务 service：`attendanceToLong` → services/attendance.js；`inspectionToDisplay/inspectionToLong/inspectionToWide` → services/inspection.js；`reviewToDisplay` → services/review.js。
- mock/attendance|inspection|review.js 仅剩种子数组（冗余 person/activities/标签依赖随之清理）；mock/index.js 不再中转任何格式化函数。
- 7 个 UI 调用方 import 面改挂 services；module-load + mock-integrity + party + multi-user 7/7 回归绿。

**契约条款**：
1. **人名与人员对象获取**（getPersonById/getPersonName/PersonStore）唯一出口 = `services/person.js`；任何层禁止从 `mock/*` 获取人名。
2. **种子数据**（PEOPLE/ACTIVITIES/MOCK_* 等）只许 service 层引用；UI/tab/组件层不直连种子数组（PEOPLE 收口为下一批）。
3. **展示格式化函数**（attendanceToLong/inspectionToLong/reviewToDisplay 等）统一栖身各业务 domain service（attendance/inspection/review），随记录读写同域演进；mock 数据模块不承载格式化逻辑。
4. 新代码一律遵守 1~3；存量收口按批次推进，每批回归。

---

## 六、复核约定

- 每完成一个 P0 扎口试点，回本表更新"现状"列并留 T- 日志。
- 评分按季度或重大架构变更后复核一次，防"评估僵尸化"。
- 用户否决某条优先级时，只调顺序不改表结构；新方向裁决追加为 P3+ 行。
