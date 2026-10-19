# IA 全量矩阵

> 生成命令：`node server/scripts/ia-inventory.mjs`
> 本文件由脚本生成，可重复运行；排序为稳定排序（工作台按页面名、tab 按声明序、链接按文件+行号）。

## 总览统计

| 指标 | 读数 |
| --- | ---: |
| 工作台数 | 7 |
| tab 数 | 67 |
| core tab 数 | 18 |
| 卡片数（card 容器，文件去重） | 100 |
| 区块标题数（h2/h3 + renderTabHeader） | 74 |
| 链接数（源码位置去重） | 124 |
| 深链参数出现次数 | 28 |
| 扫描文件数 | 73 |

深链参数分布：`tab`=16 · `highlight`=4 · `activityId`=0 · `branchId`=6 · `subview`=2

## 工作台概览

| 工作台 | 页面 | 能力文件 | tab 数 | core | 卡片数（台内文件去重） | 链接数（台内文件去重） |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 纪检委员工作台 | `workspace/disc.html` | `docs/src/capabilities/disc-workspace.js` | 9 | 3 | 22 | 20 |
| 组长工作台 | `workspace/leader.html` | `docs/src/capabilities/leader-workspace.js` | 10 | 3 | 16 | 13 |
| 组织委员工作台 | `workspace/org.html` | `docs/src/capabilities/org-workspace.js` | 11 | 3 | 26 | 19 |
| 党委工作台 | `workspace/party-committee.html` | `docs/src/capabilities/party-committee-workspace.js` | 5 | 0 | 7 | 7 |
| 宣传委员工作台 | `workspace/prop.html` | `docs/src/capabilities/prop-workspace.js` | 9 | 3 | 19 | 15 |
| 支书工作台 | `workspace/secretary.html` | `docs/src/capabilities/secretary-workspace.js` | 12 | 3 | 32 | 26 |
| 成员工作台 | `workspace/visitor.html` | `docs/src/capabilities/visitor-workspace.js` | 11 | 3 | 8 | 11 |

## 纪检委员工作台（`workspace/disc.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 7（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/disc/todo-tab.js` | 0 | — | — |
| `overview` | 工作概况 | 工作台 | 是 | `docs/src/entries/tabs/disc/overview-tab.js` | 0 | — | — |
| `calendar` | 活动日历 | 工作台 | 否 | `docs/src/entries/tabs/shared/activity-calendar-tab.js` | 1（节标题 1） | — | activity.html |
| `my-dispatch` | 我的处置 | 制度与答复 | 否 | `docs/src/entries/tabs/disc/my-dispatch-tab.js` | 0 | — | — |
| `attendance` | 考勤管理 | 我的职责 | 否 | `docs/src/entries/tabs/disc/attendance-tab.js` | 5（节标题 5） | 一次确认所选（${…}） | activity.html<br>help.html<br>person.html |
| `review` | 复盘 | 我的职责 | 否 | `docs/src/entries/tabs/disc/review-tab.js` | 4（节标题 4） | 督促沉淀 | activity.html<br>settings.html |
| `inspection` | 考察管理 | 我的职责 | 否 | `docs/src/entries/tabs/disc/inspection-tab.js` | 4（节标题 4） | 确认 | activity.html<br>person.html<br>settings.html |
| `tf-view` | 知情查看 | 知情查看 | 否 | `docs/src/entries/tabs/disc/tf-view-tab.js` | 1 | — | workspace/disc.html?tab=calendar |

## 组长工作台（`workspace/leader.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 7（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/leader/todo-tab.js` | 0 | — | — |
| `overview` | 工作概况 | 工作台 | 是 | `docs/src/entries/tabs/leader/overview-tab.js` | 0 | — | — |
| `calendar` | 活动日历 | 工作台 | 否 | `docs/src/entries/tabs/shared/activity-calendar-tab.js` | 1（节标题 1） | — | activity.html |
| `my-dispatch` | 我的处置 | 制度与答复 | 否 | `docs/src/entries/tabs/leader/my-dispatch-tab.js` | 0 | — | — |
| `write` | 本组活动 | 我的职责 | 否 | `docs/src/entries/tabs/leader/write-tab.js` | 3（节标题 1） | 发布本组通知 | settings.html<br>动态 |
| `attendance` | 考勤管理 | 我的职责 | 否 | `docs/src/entries/tabs/leader/attendance-tab.js` | 1（节标题 1） | 提交考勤 | activity.html<br>person.html |
| `inspection` | 考察管理 | 我的职责 | 否 | `docs/src/entries/tabs/leader/inspection-tab.js` | 1（节标题 1） | 提交考察 | activity.html<br>person.html |
| `members` | 组员进展 | 我的职责 | 否 | `docs/src/entries/tabs/leader/members-tab.js` | 3 | 了解进展 | person.html |
| `tf-view` | 知情查看 | 知情查看 | 否 | `docs/src/entries/tabs/leader/tf-view-tab.js` | 0 | — | — |

## 组织委员工作台（`workspace/org.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 7（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/org/todo-tab.js` | 0 | — | person.html |
| `overview` | 工作概况 | 工作台 | 是 | `docs/src/entries/tabs/org/overview-tab.js` | 0 | — | — |
| `calendar` | 活动日历 | 工作台 | 否 | `docs/src/entries/tabs/shared/activity-calendar-tab.js` | 1（节标题 1） | — | activity.html |
| `my-dispatch` | 我的处置 | 制度与答复 | 否 | `docs/src/entries/tabs/org/my-dispatch-tab.js` | 0 | — | — |
| `roster` | 成员名册 | 我的职责 | 否 | `docs/src/entries/tabs/org/roster-tab.js` | 3（节标题 2） | ＋ 新增成员 | person.html<br>settings.html |
| `talent` | 人才库 | 我的职责 | 否 | `docs/src/entries/tabs/org/talent-tab.js` | 3（节标题 3） | — | person.html<br>workspace/org.html?tab=roster<br>动态 |
| `thought-review` | 思想汇报 | 我的职责 | 否 | `docs/src/entries/tabs/org/thought-review-tab.js` | 3（节标题 1） | — | 动态 |
| `taskforce` | 专班管理 | 我的职责 | 否 | `docs/src/entries/tabs/org/taskforce-tab.js` | 5（节标题 4） | 标记完成 | activity-materials.html<br>person.html |
| `member-flow` | 成员流动 | 我的职责 | 否 | `docs/src/entries/tabs/org/member-flow-tab.js` | 2（节标题 2） | ＋ 登记流入 | settings.html |
| `tf-view` | 知情查看 | 知情查看 | 否 | `docs/src/entries/tabs/org/tf-view-tab.js` | 2 | — | workspace/org.html?tab=calendar<br>workspace/org.html?tab=taskforce |

## 党委工作台（`workspace/party-committee.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `governance-overview` | 治理总览 | 党委治理 | 否 | `docs/src/entries/tabs/party-committee/governance-overview-tab.js` | 2 | 处理上报 | branch-config.html<br>workspace/party-committee.html?tab=review |
| `dispatch` | 下发通知 | 党委治理 | 否 | `docs/src/entries/tabs/party-committee/dispatch-tab.js` | 2（节标题 1） | 下发通知 | — |
| `monitor` | 支部动态 | 党委治理 | 否 | `docs/src/entries/tabs/party-committee/monitor-tab.js` | 1 | — | workspace/party-committee.html?tab=review |
| `review` | 支部上报 | 党委治理 | 否 | `docs/src/entries/tabs/party-committee/review-tab.js` | 1 | 批准 | — |
| `branches` | 支部管理 | 党委治理 | 否 | `docs/src/entries/tabs/party-committee/branches-tab.js` | 1 | 新建支部 | 动态 |

## 宣传委员工作台（`workspace/prop.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 7（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/prop/todo-tab.js` | 0 | — | — |
| `overview` | 工作概况 | 工作台 | 是 | `docs/src/entries/tabs/prop/overview-tab.js` | 0 | — | — |
| `calendar` | 活动日历 | 工作台 | 否 | `docs/src/entries/tabs/shared/activity-calendar-tab.js` | 1（节标题 1） | — | activity.html |
| `my-dispatch` | 我的处置 | 制度与答复 | 否 | `docs/src/entries/tabs/prop/my-dispatch-tab.js` | 0 | — | — |
| `tasks` | 宣传任务 | 我的职责 | 否 | `docs/src/entries/tabs/prop/tasks-tab.js` | 4（节标题 1） | 登记 | — |
| `kanban` | 项目看板 | 我的职责 | 否 | `docs/src/entries/tabs/prop/kanban-tab.js` | 4 | 确认完成 | archive.html<br>动态 |
| `archive` | 档案归档 | 我的职责 | 否 | `docs/src/entries/tabs/prop/archive-tab.js` | 2（节标题 5） | 归档 | activity.html<br>settings.html<br>动态 |
| `tf-view` | 知情查看 | 知情查看 | 否 | `docs/src/entries/tabs/prop/tf-view-tab.js` | 1 | — | workspace/prop.html?tab=calendar |

## 支书工作台（`workspace/secretary.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 7（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/secretary/todo-tab.js` | 0 | 归档 | activity-materials.html<br>activity.html |
| `overview` | 全局概况 | 工作台 | 是 | `docs/src/entries/tabs/secretary/overview-tab.js` | 1（节标题 1） | 确认退回 | workspace/prop.html?tab=archive |
| `calendar` | 活动管理 | 我的职责 | 否 | `docs/src/entries/tabs/secretary/calendar-tab.js` | 6（节标题 3） | + 新建党小组活动 | activity.html<br>search.html<br>settings.html<br>动态 |
| `committee-meeting` | 支委会 | 我的职责 | 否 | `docs/src/entries/tabs/secretary/committee-meeting-tab.js` | 2（节标题 3） | 改派 | help.html<br>party-committee-meeting.html |
| `group-progress` | 党小组 | 我的职责 | 否 | `docs/src/entries/tabs/secretary/group-progress-tab.js` | 8 | + 新增党小组 | activity.html<br>help.html<br>person.html |
| `notification` | 通知发布 | 我的职责 | 否 | `docs/src/entries/tabs/secretary/notification-tab.js` | 2（节标题 2） | 发布通知 | notice.html |
| `report-up` | 上报党委 | 我的职责 | 否 | `docs/src/entries/tabs/secretary/report-up-tab.js` | 0 | + 发起上报 | — |
| `member-flow` | 成员流动 | 我的职责 | 否 | `docs/src/entries/tabs/org/member-flow-tab.js` | 2（节标题 2） | ＋ 登记流入 | settings.html |
| `work-map` | 支部分工 | 知情查看 | 否 | `docs/src/entries/tabs/secretary/work-map-tab.js` | 2（节标题 1） | — | — |
| `tf-view` | 知情查看 | 知情查看 | 否 | `docs/src/components/record/insight-view.js` | 0 | — | — |
| `feedback` | 反馈管理 | 制度与答复 | 否 | `docs/src/entries/tabs/secretary/feedback-tab.js` | 2（节标题 2） | 指派 | 动态 |

## 成员工作台（`workspace/visitor.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 7（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/visitor/todo-tab.js` | 0 | — | — |
| `overview` | 工作概况 | 工作台 | 是 | `docs/src/entries/tabs/visitor/overview-tab.js` | 0 | — | — |
| `my-dispatch` | 我的处置 | 制度与答复 | 否 | `docs/src/entries/tabs/visitor/my-dispatch-tab.js` | 0 | — | — |
| `activities` | 活动动态 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/activities-tab.js` | 0 | — | workspace/leader.html?tab=attendance<br>动态 |
| `projects` | 项目分工 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/projects-tab.js` | 0 | 勾掉 | 动态 |
| `attendance` | 考勤概况 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/attendance-tab.js` | 0 | 我参加了但没记上 | settings.html |
| `thought-report` | 思想汇报 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/thought-report-tab.js` | 0 | 提交 | thought-report.html |
| `inspection` | 我的考察 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/inspection-tab.js` | 0 | 提交给纪检委员 | activity.html |
| `review` | 我的复盘 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/review-tab.js` | 1（节标题 1） | — | — |
| `tf-view` | 专班动态 | 知情查看 | 否 | `docs/src/entries/tabs/visitor/tf-view-tab.js` | 0 | — | — |

## 非工作台页面扫描

| 页面入口 | 卡片数 | 区块标题 | 链接数 | 主行动（若有） |
| --- | ---: | ---: | ---: | --- |
| `docs/src/entries/pages/activity-entry.js` | 2 | 11 | 2 | — |
| `docs/src/entries/pages/activity-materials-entry.js` | 0 | 4 | 12 | — |
| `docs/src/entries/pages/main-entry.js` | 0 | 0 | 6 | — |

## 链接明细

> 来源为 `文件:行号`；同一源码位置只记一条。「角色可达性」仅做静态判定：工作台页需登录，页签存在性取自 capabilities 声明；页面级门控与运行时权限未展开的标「待真机」。

| 来源文件:行号 | 文本 | 目标 page | 目标 tab | 对象 id | 深链参数 | 角色可达性 |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/src/entries/pages/activity-entry.js:163` | [JS] window.location.href | index.html | — | — | — | 公开：首页（匿名可访） |
| `docs/src/entries/pages/activity-entry.js:450` | 材料闭环 → | activity-materials.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/pages/activity-materials-entry.js:41` | [JS] window.location.href | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/pages/activity-materials-entry.js:43` | [JS] window.location.href | index.html | — | — | — | 公开：首页（匿名可访） |
| `docs/src/entries/pages/activity-materials-entry.js:64` | 回首页 | index.html | — | — | — | 公开：首页（匿名可访） |
| `docs/src/entries/pages/activity-materials-entry.js:69` | 去登录 | login.html | — | — | — | 公开：登录页 |
| `docs/src/entries/pages/activity-materials-entry.js:74` | 回首页 | index.html | — | — | — | 公开：首页（匿名可访） |
| `docs/src/entries/pages/activity-materials-entry.js:104` | 查看活动详情 → | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/pages/activity-materials-entry.js:105` | 宣传台 · 档案归档 → | workspace/prop.html | archive | — | tab=archive | 可达：宣传委员工作台·档案归档 |
| `docs/src/entries/pages/activity-materials-entry.js:117` | 宣传材料（照片） | workspace/prop.html | archive | — | tab=archive | 可达：宣传委员工作台·档案归档 |
| `docs/src/entries/pages/activity-materials-entry.js:118` | 考勤 | workspace/disc.html | attendance | — | tab=attendance | 可达：纪检委员工作台·考勤管理 |
| `docs/src/entries/pages/activity-materials-entry.js:119` | 考察 | workspace/disc.html | inspection | — | tab=inspection | 可达：纪检委员工作台·考察管理 |
| `docs/src/entries/pages/activity-materials-entry.js:125` | 复盘 | workspace/visitor.html | review | — | tab=review | 可达：成员工作台·我的复盘 |
| `docs/src/entries/pages/activity-materials-entry.js:203` | （动态文本） | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/pages/main-entry.js:74` | [JS] a.href | 动态 | 动态 | — | tab=${…} | 待真机（动态目标） |
| `docs/src/entries/pages/main-entry.js:77` | [JS] a.href | login.html | — | — | — | 公开：登录页 |
| `docs/src/entries/pages/main-entry.js:136` | [JS] window.location.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/pages/main-entry.js:145` | [JS] window.location.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/pages/main-entry.js:154` | [JS] window.location.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/pages/main-entry.js:164` | [JS] window.location.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/disc/attendance-tab.js:570` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/attendance-tab.js:776` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/attendance-tab.js:822` | 见帮助 · 考勤上传位 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/attendance-tab.js:849` | 见帮助 · 考勤录入口径 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/attendance-tab.js:1313` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/attendance-tab.js:1317` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:75` | 超期天数 → 纪检职责参数（设置） | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:129` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:212` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:213` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:602` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:604` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/makeup-tab.js:70` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/makeup-tab.js:94` | 见帮助 · 补课范围与归档 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/review-tab.js:126` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/review-tab.js:325` | 纪检职责参数（考察确认超期天数）→ 设置 | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/tf-view-tab.js:33` | 去活动日历 | workspace/disc.html | calendar | — | tab=calendar | 可达：纪检委员工作台·活动日历 |
| `docs/src/entries/tabs/leader/attendance-tab.js:259` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/attendance-tab.js:260` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/inspection-tab.js:200` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/inspection-tab.js:201` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/members-tab.js:110` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/my-tasks-section.js:52` | 查看本组活动 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/leader/my-tasks-section.js:87` | 详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/review-tab.js:81` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/review-tab.js:133` | 见帮助 · 活动复盘 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/write-tab.js:95` | [JS] location | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/leader/write-tab.js:847` | 组长职责参数（学期组员进展自动归集提醒）→ 设置 | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/write-tab.js:1045` | [JS] location | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/org/inspection-tab.js:160` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/inspection-tab.js:200` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/member-flow-tab.js:280` | 组织职责参数（学期末滞留集中复核窗口）→ 设置 | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/roster-tab.js:155` | 滞留集中复核窗口 → 组织职责参数（设置） | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/roster-tab.js:240` | 档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/talent-tab.js:136` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/talent-tab.js:204` | 查看完整档案 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/org/talent-tab.js:279` | [JS] window.location | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/talent-tab.js:286` | [JS] window.location.href | workspace/org.html | roster | — | tab=roster<br>highlight= | 可达：组织委员工作台·成员名册 |
| `docs/src/entries/tabs/org/taskforce-tab.js:718` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/taskforce-tab.js:907` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/taskforce-tab.js:1684` | 材料闭环 | activity-materials.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/tf-view-tab.js:46` | 去活动日历 | workspace/org.html | calendar | — | tab=calendar | 可达：组织委员工作台·活动日历 |
| `docs/src/entries/tabs/org/tf-view-tab.js:55` | 专班管理在「专班管理」页 | workspace/org.html | taskforce | — | tab=taskforce | 可达：组织委员工作台·专班管理 |
| `docs/src/entries/tabs/org/thought-review-tab.js:182` | （动态文本） | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/org/todo-tab.js:87` | [JS] window.location | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/party-committee/branches-tab.js:63` | （动态文本） | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/party-committee/branches-tab.js:63` | 查看档案 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/party-committee/branches-tab.js:155` | 支部设置 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/party-committee/governance-overview-tab.js:33` | 查看全部上报 | workspace/party-committee.html | review | — | tab=review | 可达：党委工作台·支部上报 |
| `docs/src/entries/tabs/party-committee/governance-overview-tab.js:47` | 处理上报 | workspace/party-committee.html | review | — | tab=review<br>highlight=${…} | 可达：党委工作台·支部上报 |
| `docs/src/entries/tabs/party-committee/governance-overview-tab.js:64` | 去任命 | branch-config.html | — | ${…} | branchId=${…} | 待真机（页面级门控） |
| `docs/src/entries/tabs/party-committee/monitor-tab.js:52` | 查看该支部待批复上报 | workspace/party-committee.html | review | ${…} | tab=review<br>branchId=${…} | 可达：党委工作台·支部上报 |
| `docs/src/entries/tabs/prop/archive-tab.js:395` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/archive-tab.js:460` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/archive-tab.js:479` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/archive-tab.js:511` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/archive-tab.js:574` | 查看关联活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/archive-tab.js:672` | [JS] a.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/prop/archive-tab.js:914` | 设置首页（宣传台无支部治理分区） | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/kanban-tab.js:125` | [JS] window.location.href | 动态 | — | ${…} | — | 待真机（动态目标） |
| `docs/src/entries/tabs/prop/kanban-tab.js:153` | 去归档 | archive.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/tf-view-tab.js:31` | 去活动日历 | workspace/prop.html | calendar | — | tab=calendar | 可达：宣传委员工作台·活动日历 |
| `docs/src/entries/tabs/secretary/assign-tab.js:121` | 见帮助 · 项目赋权 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/assign-tab.js:134` | 见帮助 · 专班赋权 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/assign-tab.js:390` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/assign-tab.js:476` | 见帮助 · 常设赋权 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/assign-tab.js:683` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:156` | 去资料查询写入 → | search.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:327` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:389` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:514` | 活动制度口径（票决门槛 / 应到名单核对 / 会议考勤类型与记录人）→ 支部制… | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:1300` | [JS] location | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:1751` | [JS] a.href | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/committee-meeting-tab.js:142` | 进入 › | party-committee-meeting.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/committee-meeting-tab.js:242` | 新建线上支委会 → | party-committee-meeting.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/committee-meeting-tab.js:252` | 帮助 · 支委身份 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/feedback-tab.js:248` | [JS] a.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:215` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:250` | 见帮助 · 党小组与组长 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:293` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:510` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:573` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:611` | 见帮助 · 活动复盘 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/notification-tab.js:356` | [JS] window.location.href | notice.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/overview-tab.js:105` | 去宣传台查看 › | workspace/prop.html | archive | — | tab=archive | 可达：宣传委员工作台·档案归档 |
| `docs/src/entries/tabs/secretary/todo-tab.js:218` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/todo-tab.js:227` | 材料闭环 | activity-materials.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/todo-tab.js:233` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/todo-tab.js:241` | 材料闭环 | activity-materials.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/workforce-panel.js:133` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/workforce-panel.js:155` | 去表决 | party-committee-meeting.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/shared/activity-calendar-tab.js:80` | [JS] window.location | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/shared/activity-calendar-tab.js:111` | [JS] link.href | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/today/today-tab.js:511` | 本条提醒开关 → 组长职责参数（设置） | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/today/today-tab.js:670` | [JS] window.location | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/today/today-tab.js:706` | [JS] window.location.href | notice.html | — | noticeId | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/visitor/activities-tab.js:31` | 去报名 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/visitor/activities-tab.js:37` | 去表态 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/visitor/activities-tab.js:53` | 考勤管理 / 打回确认 | workspace/leader.html | attendance | — | tab=attendance | 可达：组长工作台·考勤管理 |
| `docs/src/entries/tabs/visitor/activities-tab.js:63` | 查看活动详情：${…} | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/visitor/attendance-tab.js:164` | 设置首页（外观 / 我的工作台） | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/visitor/inspection-tab.js:158` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/visitor/projects-tab.js:261` | [JS] window.location.href | 动态 | — | tfId \|\| actId | — | 待真机（动态目标） |
| `docs/src/entries/tabs/visitor/thought-report-tab.js:100` | （动态文本） | thought-report.html | — | ${…} | — | 待真机（页面级门控） |

## 口径说明

- **卡片数**：`class` / `className` 中含独立 `card` token 的容器数；括号内为节标题数（`<h2>`/`<h3>` 文本 + `renderTabHeader` 调用）。
- **主行动**：该渲染文件中第一个静态 `btn-accent` 控件（按钮或链接）的可见文本；无则记「—」。
- **链接**：`<a href>`、对象字面量 `href:`（组件/辅助渲染配置）、`.href =` / `window.location(.href) =` 赋值、独立 `resolveDocumentUrl(...)` 调用；一行一条，按源码位置去重。
- **深链参数**：`tab` / `highlight` / `activityId` / `branchId` / `subview` 在源码字面量中的出现次数（含链接目标与查询串构造函数），加上 `URLSearchParams.get(...)` 的读取次数；与「链接明细」逐行值可能不等，因为并非每个参数都出现在链接行内。
- **`activityId` 读数**：本次扫描范围内（tabs/** 与三个入口页）对象定位统一用 `?id=` 承载；`entries/workspace/**` 对 `?activityId=` 的消费不在扫描范围，故该参数计数为 0。
- **对应文件**：取 `render` 中第一个静态 `import(...)` 的目标；目标可落在 `entries/tabs/**` 之外（如支书台 `tf-view` → `components/record/insight-view.js`），仍按同一规则计数。
- **共享渲染文件**：`today-tab.js`、`shared/activity-calendar-tab.js`、`record/insight-view.js`、`org/member-flow-tab.js` 等被多台复用的文件，在「链接明细」中按文件只列一次；各 tab 行按其映射文件展示，故会重复出现。
- **薄壳委托**：如 `my-dispatch-tab.js` 只调用共享组件的 `renderMyDispatchTab(...)`，本矩阵不展开其内部 DOM，故该 tab 卡片数为 0。
- **动态**：`render` 无静态 import 字面量、或链接目标为运行时变量时标「动态」/「待真机」，不省略。

