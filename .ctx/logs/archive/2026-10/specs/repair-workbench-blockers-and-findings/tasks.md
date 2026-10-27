﻿# Tasks

- [x] Task 1: 阻塞 · 成员考勤上传位收口
  - [x] SubTask 1.1 给 `leader/attendance-tab.js` 增加组织者投影模式：只列「本人组织的活动」，隐藏全组考勤明细、补课名单与本组上传摘要
  - [x] SubTask 1.2 成员「考勤概况」改用投影模式，个人出勤率与本人明细回到页首
  - [x] SubTask 1.3 补守卫：非组织者成员页面不出现其他成员考勤行；组织者只看到本人活动

- [x] Task 2: 阻塞 · 成员考察上传位收口
  - [x] SubTask 2.1 给 `leader/inspection-tab.js` 增加组织者投影模式：只列本人组织的活动，隐藏全支部考察明细
  - [x] SubTask 2.2 成员「我的考察」改用投影模式，本人考察记录与申诉回到页首
  - [x] SubTask 2.3 补守卫：非组织者成员页面不出现他人工支部考察行

- [x] Task 3: 阻塞 · 宣传任务登记与关联
  - [x] SubTask 3.1 增加「登记宣传任务」表单：类型、任务内容、来源、可选关联活动；空内容就地校验
  - [x] SubTask 3.2 写入 `propTasks` 并持久化；列表与导出展示关联活动；刷新后可见
  - [x] SubTask 3.3 补定向测试：登记成功、空值拦截、关联活动显示

- [x] Task 4: 阻塞 · 宣传看板归档判据统一
  - [x] SubTask 4.1 看板三分桶改用 `isActivityArchived` + 生命周期状态，`archived=true` 只进已归档
  - [x] SubTask 4.2 「确认完成」与档案归档的先后关系写清：完成不等于归档，归档是唯一结束判据
  - [x] SubTask 4.3 补守卫：已归档活动不得出现在待启动/进行中

- [x] Task 5: 阻塞 · 支书通知页使命收窄
  - [x] SubTask 5.1 页面文案改为「发布 + 已发布台账」，删除任何催读承诺
  - [x] SubTask 5.2 同步 `help.html`、`README-server.md` 的通知页使命与口径
  - [x] SubTask 5.3 补文档守卫：通知页使命不得再出现「催读」

- [x] Task 6: 繁专项 · 汇报处置单入口
  - [x] SubTask 6.1 `feedback-tab.js` 过滤 `kind='report'`，反馈管理只留反馈
  - [x] SubTask 6.2 今天/概况的汇报行统一落待办「待答复」`PendingTarget`，不再落反馈页
  - [x] SubTask 6.3 补测试：反馈列表不含汇报；汇报行落点正确

- [x] Task 7: 繁专项 · 概况「请我汇报」降级
  - [x] SubTask 7.1 五台概况的汇报区改为只读摘要 + 「去我的处置」
  - [x] SubTask 7.2 「我的处置」保留唯一行内提交，概况不再出第二套表单
  - [x] SubTask 7.3 补守卫：概况不出现汇报提交按钮

- [x] Task 8: 繁专项 · 五台「我的处置」前移
  - [x] SubTask 8.1 组织/宣传/纪检/组长/成员五台把「制度与答复」组前移到工作台之后
  - [x] SubTask 8.2 同步 `help.html` §2.x、`README-server.md`、顺序守卫与支部 tabOrder 兼容
  - [x] SubTask 8.3 真机检查：登录落点不变、深链 `?tab=my-dispatch` 仍可达

- [x] Task 9: 繁专项 · 知情查看活动段收口
  - [x] SubTask 9.1 宣传/纪检/支书「知情查看」撤活动段，只留专班或有新增对象的段
  - [x] SubTask 9.2 组织「知情查看」收窄为「本人被加入/被授权」的对象级下游
  - [x] SubTask 9.3 补守卫：活动段不再出现在上述三台的知情查看

- [x] Task 10: 繁专项 · 党委总览与目录口径
  - [x] SubTask 10.1 治理总览待批复限前 N 条（建议 5），完整队列回「支部上报」
  - [x] SubTask 10.2 支部动态的待批复计数带 `branchId` 深链
  - [x] SubTask 10.3 支部目录恢复缺支书「组织提醒」，与总览同源

- [x] Task 11: 繁专项 · 今天有会落点统一
  - [x] SubTask 11.1 组织/宣传/纪检落活动日历；组长落活动日历或本组活动；成员落活动动态日历视图
  - [x] SubTask 11.2 「今天」只保留今日与逾期，不再列全量待办
  - [x] SubTask 11.3 补守卫：各台「全部」按钮落点存在且可点

- [x] Task 12: 乱专项 · 个人档案分层实现
  - [x] SubTask 12.1 实现 L0 结论带：姓名、支部、阶段、角色、在册状态、待确认/缺口摘要
  - [x] SubTask 12.2 实现组织事实（紧凑 `dl`）、在册与留痕（合并、默认折叠）、本人自述（默认折叠、已填 N/15）
  - [x] SubTask 12.3 27 字段唯一落点；状态只渲染一次；空值词表统一
  - [x] SubTask 12.4 组织委员就地编辑/代录入口；无权时显示只读原因

- [x] Task 13: 乱专项 · 个人档案验收
  - [x] SubTask 13.1 补结构测试：L0 存在、自述/留痕默认折叠、字段唯一落点、状态渲染一次
  - [x] SubTask 13.2 真机检查桌面与 390px：首屏四问可答、展开无横向溢出
  - [x] SubTask 13.3 档案读取、编辑保存、确认链报送三条路径回归

- [x] Task 14: 脏专项 · 组织台优先修复
  - [x] SubTask 14.1 今天「全部」落活动日历；概况缺口补动作，「发展党员」指向有效页签
  - [x] SubTask 14.2 待办详情按组渲染真实下一步，不出空转「去处理」
  - [x] SubTask 14.3 专班四对象分层、详情锚定；日历右栏可进详情；名册届别可编辑
  - [x] SubTask 14.4 人才库提示槽分离；思想汇报补状态图例/筛选；成员流动页首不再写死「成员名册」

- [x] Task 15: 脏专项 · 宣传/纪检台优先修复
  - [x] SubTask 15.1 宣传今天/概况收敛为摘要 + 回指；档案归档与看板判据一致
  - [x] SubTask 15.2 纪检待办实时组排除已打回；概况缺口补动作
  - [x] SubTask 15.3 纪检考勤/复盘/考察的队列与详情动作落点对齐

- [x] Task 16: 脏专项 · 组长/成员台优先修复
  - [x] SubTask 16.1 成员今天「看日历」改落活动动态日历视图；组长今天补「建活动」
  - [x] SubTask 16.2 成员活动动态内外层视图降级为单一主切换，消除两个「列表」
  - [x] SubTask 16.3 组长本组活动列表收窄，子记录写口按 `roleEditable` 关闭
  - [x] SubTask 16.4 组长考察来源说明与范围对齐；成员专班动态写作分层；我的处置主对象前移

- [x] Task 17: 脏专项 · 支书台优先修复
  - [x] SubTask 17.1 今天汇报行落点统一；反馈管理与汇报分流
  - [x] SubTask 17.2 活动管理右栏可进详情；党小组页删除重复「跨组进展」标题
  - [x] SubTask 17.3 成员流动页首页签名一致；支部分工关系表补表头与责任列

- [ ] Task 18: 验证、版本与分批提交
  - [ ] SubTask 18.1 定向测试：阻塞 5 项、繁专项、个人档案、各台优先修复
  - [x] SubTask 18.2 模块装配、文档一致性、顺序守卫、文本档位与版本戳全绿
  - [ ] SubTask 18.3 真机检查桌面与 390px；记录本轮未覆盖项
  - [x] SubTask 18.4 按批次 441 惯例提交 commit：`批次 NNN：短标题`

- [ ] Task 19: 真机写链边界修复（本轮验证新发现，非 5 个阻塞）
  - [ ] SubTask 19.1 组长活动创建：活动 POST 成功但 snapshot 写穿 403，导致 `wg-activity-*` 不存在、`/workgroups/:id/grants` 404；改为资源 API 写链或放行受控快照
  - [ ] SubTask 19.2 组长考勤上传：应到名单冻结返回 403；核对 `freezeExpectedRosterForActivity` 的 actor 与权限门
  - [ ] SubTask 19.3 向导：`#wz-create-appoint` 选择器漂移与「首任支书」校验未触发，先定「任命是否必填」再改准
  - [ ] SubTask 19.4 `pc-review-reject-note`：真机流缺少稳定待批复前置；补种子或改流程前置

- [x] Task 20: API 语义写链（活动 / 专班）
  - [x] SubTask 20.1 `mock.js::createActivity` 在 API 形态改走 `getAdapter().activities.create`，同步本地 mockDB 与 token
  - [x] SubTask 20.2 `mock.js::createTaskforce` 同理改走 `getAdapter().taskforces.create`
  - [x] SubTask 20.3 补守卫：API 形态下活动/专班创建不得依赖 snapshot 新增记录
  - [ ] SubTask 20.4 复跑 `leader-write-activity-save`、`leader-attendance-upload-submit`、`org-taskforce-recruit-publish`，确认 403/404 消失

- [x] Task 21: 工作组概念全仓对齐
  - [x] SubTask 21.1 扫描 `content/**`，列出仍用旧概念或缺少「活动工作组 / 专班工作组 / 组内承办 / 跨组承办」的段落
  - [x] SubTask 21.2 组织扁平化设计 §G 开篇先立工作组载体，再讲平等协作；不重写支书论断原文
  - [x] SubTask 21.3 同步角色体系、权限矩阵、数据模型、架构、SOP 指南与术语表；不新造制度，缺口标「待裁定」
  - [x] SubTask 21.4 补文档守卫：关键概念词在指定文档中存在，旧词（如「项目组」）不再回潮

- [x] Task 22: 图标语义去重与界面细节
  - [x] SubTask 22.1 侧边栏「我的私信」改 `mail`，「意见反馈」保留 `message`；检查全站同语义图标
  - [x] SubTask 22.2 用 sample-diff-learning 复核本轮新增/改动界面，记录重复、层级与节奏问题并就地修
  - [x] SubTask 22.3 按 web-design-guidelines 检查按钮、空态、折叠与键盘可达

- [ ] Task 23: 脏专项剩余需修（第三波）
  - [ ] SubTask 23.1 按审计「优先修复」修共享组件与跨台模式：待办详情动作、概况缺口、知情查看、日历详情
  - [ ] SubTask 23.2 修单页层级与动作：组织/宣传/纪检/组长/成员/支书各取未修项
  - [ ] SubTask 23.3 补定向守卫并复跑各台真机页签

- [ ] Task 24: 提交规范与收尾
  - [x] SubTask 24.1 在工程文档写明 commit 正文规范（Why / What / Verification / Boundaries）
  - [x] SubTask 24.2 运行静态组、文档组、真机写链与页签普查
  - [x] SubTask 24.3 用规范正文提交本批 commit

- [x] Task 25: 按钮全局归一
  - [x] SubTask 25.1 `styles.css` 给 8 个语义族统一 min-height / padding / font-size / gap / 单行
  - [x] SubTask 25.2 收紧 button 守卫：语义族内不得再被零散尺寸类改写；列出并修离群按钮
  - [x] SubTask 25.3 真机检查主操作、次操作、文字、危险四类同屏厚度与字号

- [x] Task 26: 条目边框收敛
  - [x] SubTask 26.1 通知下拉、名单、待办、我的处置等纯展示行去完整边框，改分组分隔线
  - [x] SubTask 26.2 可交互卡片保留边框，并统一为 hairline + 单一 neutral 令牌
  - [x] SubTask 26.3 补守卫：纯展示行不得再出现 `border` 全框；可交互卡片不受影响

- [x] Task 27: 表格设计规范章节
  - [x] SubTask 27.1 `DESIGN_SYSTEM.md` 新增四类表格/列表：数据表、关系矩阵、台账、卡片列表
  - [x] SubTask 27.2 写清选择四问、阈值（>8 检索/分页、<12 卡片列表）、行动作、空态、窄屏与键盘
  - [x] SubTask 27.3 补文档守卫：章节存在且四类术语齐备

- [x] Task 28: 信息计算文档与党委铃铛
  - [x] SubTask 28.1 新增 `INFORMATION_COMPUTATION.md`：通知可见性、铃铛角标、紧急保留、待办派生、概况计数、今日摘要
  - [x] SubTask 28.2 `NoticeStore.list` 增加 `scope:'committee'`；header 铃铛与角标在 party-staff 下使用
  - [x] SubTask 28.3 补测试：党委铃铛不含支部广播、角标不把支部紧急计入；普通支部角色不受影响

- [x] Task 29: 脏乱繁第三轮
  - [x] SubTask 29.1 用 sample-diff-learning 复核按钮/边框/表格/铃铛，记录 5 条以内问题并处置
  - [x] SubTask 29.2 按 web-design-guidelines 修正可点区域、焦点、空态与文案
  - [x] SubTask 29.3 真机检查党委台与一个支部台的默认视图

- [ ] Task 30: 验证与提交
  - [ ] SubTask 30.1 运行按钮/边框/文档/通知/模块装配/版本戳守卫
  - [ ] SubTask 30.2 真机验证党委铃铛与按钮厚度
  - [ ] SubTask 30.3 用 Why / What / Verification / Boundaries 提交本批 commit

# Task Dependencies

- Task 1、2 共享 `leader/*` 实现，必须同批由一人完成
- Task 3、4 同在宣传台，可与 Task 1、2 并行
- Task 5 依赖 Task 6 的反馈/通知文案口径
- Task 6、7 共享 `work-overview.js`、`issue-dispatch-view.js`，必须先后完成
- Task 8 依赖 Task 6、7 的落点结论，且需同步帮助页与顺序守卫
- Task 9 依赖 Task 8 的页签结构稳定
- Task 12、13 依赖现有共享页框与折叠组件，不依赖其它任务
- Task 14–17 依赖 Task 6–11 的共享组件改动完成，避免重复改同一文件
- Task 18 依赖全部任务









- [x] Task 31: 支书抽样复核修正
  - [x] SubTask 31.1 未读通知：首页与工作台共用 `.notice-row`；紧急/重要标签同步；去掉第二动作
  - [x] SubTask 31.2 侧栏页脚：恢复历史间距（4px 8px、2px 行间），只把字号提到 12px 下限
  - [x] SubTask 31.3 考察依托工作组：制度、权限、数据模型、信息计算、设计规范、SOP 与代码注释全仓对齐
  - [x] SubTask 31.4 矩阵判据：人员×活动可用，人员×工作组不画矩阵；写入 DESIGN_SYSTEM §4.20.6
