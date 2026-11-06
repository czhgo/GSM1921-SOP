# Tasks

- [x] Task 1: 间距五档与组件采用矩阵
  - [x] SubTask 1.1 `styles.css` 新增 `--space-1..--space-6`（4/8/12/16/24）与行高/字号档位，禁止再以页面零散值覆盖
  - [x] SubTask 1.2 `DESIGN_SYSTEM.md` 新增 §4.21：五档定义、组件采用矩阵（页面区块 / 标准卡 / 紧凑卡 / 列表行 / 表格单元 / 表单 / 徽章）
  - [x] SubTask 1.3 补守卫：统计自由间距值存量并设基线，只降不升；新文件不得出现 `p-[14px]`、`gap-[10px]` 一类自由值

- [x] Task 2: 七个复用模块
  - [x] SubTask 2.1 新增 `components/ui/list-row.js`：标题/次级/描述/状态点/行尾动作插槽；分隔线由父容器出，行本身不带完整边框
  - [x] SubTask 2.2 新增 `components/ui/filter-bar.js` 与 `components/ui/data-table.js`：关键词 + 分面、列定义、首列 sticky、末列动作、空态
  - [x] SubTask 2.3 新增 `components/ui/empty-state.js`；`pager.js` 与 `relation-matrix.js` 收口为同一采用口径
  - [x] SubTask 2.4 七个模块各接入至少一个代表页面；补守卫统计手写 `div` 行容器存量，只降不升

- [x] Task 3: 支委会 tab 清爽目录
  - [x] SubTask 3.1 `committee-meeting-tab.js` 改为「支委构成表 + 会议表 + 新建入口」，删除大段说明与全局表单
  - [x] SubTask 3.2 委员表：姓名 / 身份 / 来源 / 状态 / 行尾「改派或撤销」；复用 `PersonPicker` 就地完成
  - [x] SubTask 3.3 会议表：日期 / 议题 / 状态 / 应到 / 进入；状态覆盖待召开、线上表态中、已截止、已留存
  - [x] SubTask 3.4 补守卫：tab 内不出现超过一行的说明段；不出现独立「选人 → 选身份 → 确认」全局表单

- [x] Task 4: 独立会议页去说明化
  - [x] SubTask 4.1 `party-committee-meeting-entry.js` 顶部改为「范围 → 议程 → 表态 → 截止 → 留存」步骤条
  - [x] SubTask 4.2 当前步骤只保留一个主行动；解释性长文移入 `help.html` 对应锚点
  - [x] SubTask 4.3 保持既有写链与权限门不变；深链 `?id=` 与新建入口回归

- [x] Task 5: 我的待办四档与摘要
  - [x] SubTask 5.1 `todo-tab-shell.js` 顶部新增四数摘要：逾期 / 今日 / 本周 / 待处理；全部纯中文
  - [x] SubTask 5.2 `todo-list.js` 默认分组改为四档；空组不渲染；业务域降为行内 12px 次级标签
  - [x] SubTask 5.3 行内只留标题 + 一句说明 + 一个主行动；作废等次要动作收进行尾「更多」
  - [x] SubTask 5.4 保持 `?tab=todo&group=<groupKey>` 深链定位；补守卫：页面文案不出现 `Overdue` 等中英混排

- [x] Task 6: 选择人员去框与行层级
  - [x] SubTask 6.1 `person-picker.js` 删除姓氏头像框；行结构改为姓名 14px/500 + 次级 12px
  - [x] SubTask 6.2 `person-picker.css` 行高 40px、内边距 4/12；选中态只用整行底色 + 右侧勾，去掉行边框
  - [x] SubTask 6.3 单选点行即选并关闭；多选保留底部「已选 N 人 / 确认选择」；搜索框 34px、筛选 28px
  - [x] SubTask 6.4 检查所有调用方（赋权、考察、专班成员、报名）无布局回归

- [x] Task 7: 六台工作概况三层骨架
  - [x] SubTask 7.1 重写 `work-overview.js`：结论带 / 条线表 / 待我处理三层；删除独立「汇报」卡与重复计数
  - [x] SubTask 7.2 六台角色配置：支书（组织/宣传/纪检/党小组/专班）、组织、宣传、纪检、组长、成员各自条线与四数指标
  - [x] SubTask 7.3 「待我处理」前 5 条，每条标题 + 一句原因 + 一个动作；溢出统一回待办
  - [x] SubTask 7.4 补守卫：六个 overview tab 均走同一骨架；页面不出现「汇报」独立卡

- [x] Task 8: 首页工作组进展
  - [x] SubTask 8.1 `index.html` 标题改「工作组进展」；`dashboard/taskforce-list.js` 改为读 `workgroups`（活动 + 专班）
  - [x] SubTask 8.2 卡内分「活动工作组 / 专班工作组」两组，各前 3 个；行含组名、成员数、任务完成数、状态
  - [x] SubTask 8.3 进度用 `workgroup_tasks` 完成数，不再用报名人数填充率；单类存在只显示该类，两类都无则整卡隐藏
  - [x] SubTask 8.4 同步 `INFORMATION_COMPUTATION.md` 与 `help.html` 的口径

- [x] Task 9: 表格规范补章与复用清单
  - [x] SubTask 9.1 `DESIGN_SYSTEM.md` §4.20 增加「表格内部三类行型」：对象行 / 关系行 / 留痕行
  - [x] SubTask 9.2 增加「复用模块采用矩阵」：四类载体 × 七个模块 × 代表页面 × 阈值
  - [x] SubTask 9.3 补文档守卫：§4.20 与 §4.21 的关键术语与模块名齐备

- [x] Task 10: 脏乱繁第四轮抽样复核
  - [x] SubTask 10.1 用 sample-diff-learning 按「支委会 / 待办 / 概况 / 选人 / 工作组进展」分层各抽 1 例，共 6 例记录 diff
  - [x] SubTask 10.2 按 web-design-guidelines 检查可点区域、焦点、空态、键盘可达与信息层级，就地修
  - [x] SubTask 10.3 把本轮新增判例写入 `DESIGN_SYSTEM.md` §4.22；不新造第二套规则

- [x] Task 11: 验证、版本与提交
  - [x] SubTask 11.1 运行模块装配、文档一致性、按钮、表格、行容器、间距、待办、概况守卫（173/173 通过）
  - [x] SubTask 11.2 真机检查桌面与 390px：六台概况、待办、支委会 tab 与独立页、选人面板、首页工作组卡
  - [x] SubTask 11.3 版本戳升到 `20261018g`；按 Why / What / Verification / Boundaries 提交 commit

# Task Dependencies

- Task 2 依赖 Task 1 的间距令牌与采用矩阵
- Task 3、4 共享支委会数据读取与写口，必须同批完成
- Task 5 依赖 Task 2 的 `list-row` 与 `empty-state`
- Task 6 依赖 Task 1 的字号/行高档位
- Task 7 依赖 Task 2 的 `list-row` / `data-table` / `empty-state`
- Task 8 依赖 Task 2 的 `list-row`，并与 Task 9 的口径文档同步
- Task 9 依赖 Task 1、2 的最终档位与模块名
- Task 10 依赖 Task 3–8 全部落地
- Task 11 依赖全部任务
