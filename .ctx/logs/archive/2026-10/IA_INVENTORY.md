# IA 全量矩阵

> 生成命令：`node server/scripts/ia-inventory.mjs`
> 本文件由脚本生成，可重复运行；排序为稳定排序（工作台按页面名、tab 按声明序、链接按文件+行号）。

## 总览统计

| 指标 | 读数 |
| --- | ---: |
| 工作台数 | 7 |
| tab 数 | 62 |
| core tab 数 | 18 |
| 卡片数（card 容器，文件去重） | 103 |
| 区块标题数（h2/h3 + renderTabHeader） | 112 |
| 链接数（源码位置去重） | 117 |
| 深链参数出现次数 | 18 |
| 扫描文件数 | 69 |

深链参数分布：`tab`=9 · `highlight`=3 · `activityId`=1 · `branchId`=3 · `subview`=2

## 工作台概览

| 工作台 | 页面 | 能力文件 | tab 数 | core | 卡片数（台内文件去重） | 链接数（台内文件去重） |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 纪检委员工作台 | `workspace/disc.html` | `docs/src/capabilities/disc-workspace.js` | 8 | 3 | 19 | 19 |
| 组长工作台 | `workspace/leader.html` | `docs/src/capabilities/leader-workspace.js` | 10 | 3 | 17 | 15 |
| 组织委员工作台 | `workspace/org.html` | `docs/src/capabilities/org-workspace.js` | 10 | 3 | 22 | 15 |
| 党委工作台 | `workspace/party-committee.html` | `docs/src/capabilities/party-committee-workspace.js` | 3 | 0 | 4 | 4 |
| 宣传委员工作台 | `workspace/prop.html` | `docs/src/capabilities/prop-workspace.js` | 8 | 3 | 16 | 15 |
| 支书工作台 | `workspace/secretary.html` | `docs/src/capabilities/secretary-workspace.js` | 12 | 3 | 32 | 27 |
| 成员工作台 | `workspace/visitor.html` | `docs/src/capabilities/visitor-workspace.js` | 11 | 3 | 17 | 11 |

## 纪检委员工作台（`workspace/disc.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 6（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/disc/todo-tab.js` | 0 | — | — |
| `overview` | 工作概况 | 工作台 | 是 | `docs/src/entries/tabs/disc/overview-tab.js` | 0 | — | — |
| `calendar` | 活动日历 | 工作台 | 否 | `docs/src/entries/tabs/shared/activity-calendar-tab.js` | 1（节标题 1） | — | activity.html |
| `my-dispatch` | 我的处置 | 制度与答复 | 否 | `docs/src/entries/tabs/disc/my-dispatch-tab.js` | 0 | — | — |
| `attendance` | 考勤管理 | 我的职责 | 否 | `docs/src/entries/tabs/disc/attendance-tab.js` | 5（节标题 7） | 一次确认所选（${…}） | activity.html<br>help.html<br>person.html |
| `review` | 复盘 | 我的职责 | 否 | `docs/src/entries/tabs/disc/review-tab.js` | 3（节标题 4） | 督促沉淀 | activity.html<br>settings.html |
| `inspection` | 考察管理 | 我的职责 | 否 | `docs/src/entries/tabs/disc/inspection-tab.js` | 4（节标题 5） | 确认${…} | activity.html<br>person.html<br>settings.html |

## 组长工作台（`workspace/leader.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 6（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/leader/todo-tab.js` | 0 | — | — |
| `overview` | 工作概况 | 工作台 | 是 | `docs/src/entries/tabs/leader/overview-tab.js` | 1 | — | — |
| `calendar` | 活动日历 | 工作台 | 否 | `docs/src/entries/tabs/shared/activity-calendar-tab.js` | 1（节标题 1） | — | activity.html |
| `my-dispatch` | 我的处置 | 制度与答复 | 否 | `docs/src/entries/tabs/leader/my-dispatch-tab.js` | 0 | — | — |
| `write` | 本组活动 | 我的职责 | 否 | `docs/src/entries/tabs/leader/write-tab.js` | 3（节标题 4） | 发布本组通知 | settings.html<br>动态 |
| `attendance` | 考勤管理 | 我的职责 | 否 | `docs/src/entries/tabs/leader/attendance-tab.js` | 1（节标题 2） | 提交考勤 | activity.html<br>help.html<br>person.html |
| `inspection` | 考察管理 | 我的职责 | 否 | `docs/src/entries/tabs/leader/inspection-tab.js` | 1（节标题 3） | 提交考察 | activity.html<br>help.html<br>person.html |
| `members` | 组员进展 | 我的职责 | 否 | `docs/src/entries/tabs/leader/members-tab.js` | 4（节标题 5） | 了解进展 | person.html |
| `tf-view` | 知情查看 | 知情查看 | 否 | `docs/src/entries/tabs/leader/tf-view-tab.js` | 0 | — | — |

## 组织委员工作台（`workspace/org.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 6（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/org/todo-tab.js` | 0 | — | person.html |
| `overview` | 工作概况 | 工作台 | 是 | `docs/src/entries/tabs/org/overview-tab.js` | 1 | — | — |
| `calendar` | 活动日历 | 工作台 | 否 | `docs/src/entries/tabs/org/activity-calendar-tab.js` | 2 | 标记协调完成 | — |
| `my-dispatch` | 我的处置 | 制度与答复 | 否 | `docs/src/entries/tabs/org/my-dispatch-tab.js` | 0 | — | — |
| `roster` | 成员名册 | 我的职责 | 否 | `docs/src/entries/tabs/org/roster-tab.js` | 2（节标题 3） | ＋ 新增成员 | person.html<br>settings.html |
| `talent` | 人才库 | 我的职责 | 否 | `docs/src/entries/tabs/org/talent-tab.js` | 3（节标题 4） | — | person.html<br>workspace/org.html?tab=roster<br>动态 |
| `thought-review` | 思想汇报 | 我的职责 | 否 | `docs/src/entries/tabs/org/thought-review-tab.js` | 3（节标题 4） | — | 动态 |
| `taskforce` | 专班管理 | 我的职责 | 否 | `docs/src/entries/tabs/org/taskforce-tab.js` | 3（节标题 3） | 标记完成 | person.html |
| `member-flow` | 成员流动 | 我的职责 | 否 | `docs/src/entries/tabs/org/member-flow-tab.js` | 2（节标题 3） | ＋ 登记流入 | settings.html |

## 党委工作台（`workspace/party-committee.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `dispatch` | 下发通知 | 党委治理 | 否 | `docs/src/entries/tabs/party-committee/dispatch-tab.js` | 2（节标题 2） | 下发通知 | — |
| `review` | 支部上报 | 党委治理 | 否 | `docs/src/entries/tabs/party-committee/review-tab.js` | 1（节标题 1） | 批准 | — |
| `branches` | 支部管理 | 党委治理 | 否 | `docs/src/entries/tabs/party-committee/branches-tab.js` | 1（节标题 1） | 新建支部 | workspace/party-committee.html?tab=review<br>动态 |

## 宣传委员工作台（`workspace/prop.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 6（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/prop/todo-tab.js` | 0 | — | — |
| `overview` | 工作概况 | 工作台 | 是 | `docs/src/entries/tabs/prop/overview-tab.js` | 1 | — | — |
| `calendar` | 活动日历 | 工作台 | 否 | `docs/src/entries/tabs/shared/activity-calendar-tab.js` | 1（节标题 1） | — | activity.html |
| `my-dispatch` | 我的处置 | 制度与答复 | 否 | `docs/src/entries/tabs/prop/my-dispatch-tab.js` | 0 | — | — |
| `tasks` | 宣传任务 | 我的职责 | 否 | `docs/src/entries/tabs/prop/tasks-tab.js` | 4（节标题 2） | 登记 | — |
| `kanban` | 项目看板 | 我的职责 | 否 | `docs/src/entries/tabs/prop/kanban-tab.js` | 2（节标题 1） | 确认完成 | workspace/prop.html?tab=archive<br>动态 |
| `archive` | 档案归档 | 我的职责 | 否 | `docs/src/entries/tabs/prop/archive-tab.js` | 2（节标题 1） | 定稿 | activity.html<br>help.html<br>settings.html<br>动态 |

## 支书工作台（`workspace/secretary.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 6（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/secretary/todo-tab.js` | 0 | 归档 | activity-materials.html<br>activity.html |
| `overview` | 全局概况 | 工作台 | 是 | `docs/src/entries/tabs/secretary/overview-tab.js` | 1（节标题 1） | 确认退回 | workspace/secretary.html?tab=todo |
| `calendar` | 活动管理 | 我的职责 | 否 | `docs/src/entries/tabs/secretary/calendar-tab.js` | 7（节标题 4） | + 新建党小组活动 | activity.html<br>search.html<br>settings.html<br>动态 |
| `committee-meeting` | 支委会 | 我的职责 | 否 | `docs/src/entries/tabs/secretary/committee-meeting-tab.js` | 2（节标题 3） | 改派 | help.html<br>party-committee-meeting.html |
| `group-progress` | 党小组 | 我的职责 | 否 | `docs/src/entries/tabs/secretary/group-progress-tab.js` | 8（节标题 3） | + 新增党小组 | activity.html<br>help.html<br>person.html |
| `notification` | 通知发布 | 我的职责 | 否 | `docs/src/entries/tabs/secretary/notification-tab.js` | 2（节标题 3） | 发布通知 | help.html<br>notice.html |
| `report-up` | 上报党委 | 我的职责 | 否 | `docs/src/entries/tabs/secretary/report-up-tab.js` | 0（节标题 1） | + 发起上报 | — |
| `member-flow` | 成员流动 | 我的职责 | 否 | `docs/src/entries/tabs/org/member-flow-tab.js` | 2（节标题 3） | ＋ 登记流入 | settings.html |
| `work-map` | 支部分工 | 知情查看 | 否 | `docs/src/entries/tabs/secretary/work-map-tab.js` | 2（节标题 3） | — | — |
| `tf-view` | 知情查看 | 知情查看 | 否 | `docs/src/components/record/insight-view.js` | 0（节标题 1） | — | — |
| `feedback` | 反馈管理 | 制度与答复 | 否 | `docs/src/entries/tabs/secretary/feedback-tab.js` | 2（节标题 3） | 指派 | 动态 |

## 成员工作台（`workspace/visitor.html`）

| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |
| --- | --- | --- | :---: | --- | --- | --- | --- |
| `today` | 今天 | 工作台 | 是 | `docs/src/entries/tabs/today/today-tab.js` | 6（节标题 6） | 去「组员进展」看汇总 | activity.html<br>notice.html<br>settings.html |
| `todo` | 待办 | 工作台 | 是 | `docs/src/entries/tabs/visitor/todo-tab.js` | 0 | — | — |
| `overview` | 工作概况 | 工作台 | 是 | `docs/src/entries/tabs/visitor/overview-tab.js` | 1 | — | — |
| `my-dispatch` | 我的处置 | 制度与答复 | 否 | `docs/src/entries/tabs/visitor/my-dispatch-tab.js` | 0 | — | — |
| `activities` | 活动动态 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/activities-tab.js` | 1（节标题 1） | 去报名 | 动态 |
| `projects` | 项目分工 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/projects-tab.js` | 1（节标题 1） | 勾掉 | 动态 |
| `attendance` | 考勤概况 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/attendance-tab.js` | 3（节标题 1） | 我参加了但没记上 | settings.html |
| `thought-report` | 思想汇报 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/thought-report-tab.js` | 2（节标题 2） | 提交 | thought-report.html |
| `inspection` | 我的考察 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/inspection-tab.js` | 2（节标题 2） | 提交给纪检委员 | activity.html |
| `review` | 我的复盘 | 我的职责 | 否 | `docs/src/entries/tabs/visitor/review-tab.js` | 1（节标题 2） | — | — |
| `tf-view` | 专班动态 | 知情查看 | 否 | `docs/src/entries/tabs/visitor/tf-view-tab.js` | 0 | — | — |

## 非工作台页面扫描

| 页面入口 | 卡片数 | 区块标题 | 链接数 | 主行动（若有） |
| --- | ---: | ---: | ---: | --- |
| `docs/src/entries/pages/activity-entry.js` | 2 | 11 | 2 | — |
| `docs/src/entries/pages/activity-materials-entry.js` | 0 | 4 | 8 | — |
| `docs/src/entries/pages/main-entry.js` | 0 | 0 | 6 | — |

## 链接明细

> 来源为 `文件:行号`；同一源码位置只记一条。「角色可达性」仅做静态判定：工作台页需登录，页签存在性取自 capabilities 声明；页面级门控与运行时权限未展开的标「待真机」。

| 来源文件:行号 | 文本 | 目标 page | 目标 tab | 对象 id | 深链参数 | 角色可达性 |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/src/entries/pages/activity-entry.js:163` | [JS] window.location.href | index.html | — | — | — | 公开：首页（匿名可访） |
| `docs/src/entries/pages/activity-entry.js:478` | 材料闭环 → | activity-materials.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/pages/activity-materials-entry.js:53` | [JS] window.location.href | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/pages/activity-materials-entry.js:55` | [JS] window.location.href | index.html | — | — | — | 公开：首页（匿名可访） |
| `docs/src/entries/pages/activity-materials-entry.js:76` | 回首页 | index.html | — | — | — | 公开：首页（匿名可访） |
| `docs/src/entries/pages/activity-materials-entry.js:81` | 去登录 | login.html | — | — | — | 公开：登录页 |
| `docs/src/entries/pages/activity-materials-entry.js:87` | 回首页 | index.html | — | — | — | 公开：首页（匿名可访） |
| `docs/src/entries/pages/activity-materials-entry.js:129` | 查看活动详情 → | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/pages/activity-materials-entry.js:130` | 宣传台 · 档案归档 → | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/pages/activity-materials-entry.js:218` | （动态文本） | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/pages/main-entry.js:76` | [JS] a.href | 动态 | 动态 | — | tab=${…} | 待真机（动态目标） |
| `docs/src/entries/pages/main-entry.js:80` | [JS] a.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/pages/main-entry.js:152` | [JS] window.location.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/pages/main-entry.js:157` | [JS] window.location.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/pages/main-entry.js:162` | [JS] window.location.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/pages/main-entry.js:168` | [JS] window.location.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/disc/attendance-tab.js:589` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/attendance-tab.js:797` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/attendance-tab.js:845` | 见帮助 · 考勤上传位 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/attendance-tab.js:872` | 见帮助 · 考勤录入口径 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/attendance-tab.js:1323` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/attendance-tab.js:1327` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:82` | 超期天数 → 纪检职责参数（设置） | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:136` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:224` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:225` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:631` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/inspection-tab.js:633` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/makeup-tab.js:70` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/makeup-tab.js:94` | 见帮助 · 补课范围与归档 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/review-tab.js:159` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/disc/review-tab.js:378` | 制度参数 → | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/attendance-tab.js:191` | 见帮助 · 请假档别 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/attendance-tab.js:263` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/attendance-tab.js:264` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/inspection-tab.js:148` | 见帮助 · 考察上传 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/inspection-tab.js:209` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/inspection-tab.js:210` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/members-tab.js:118` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/my-tasks-section.js:53` | 查看本组活动 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/leader/my-tasks-section.js:88` | 详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/review-tab.js:81` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/review-tab.js:133` | 见帮助 · 活动复盘 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/write-tab.js:98` | [JS] location | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/leader/write-tab.js:863` | 制度参数 → | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/leader/write-tab.js:1082` | [JS] location | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/org/inspection-tab.js:159` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/inspection-tab.js:199` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/member-flow-tab.js:289` | 制度参数 → | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/roster-tab.js:188` | 滞留集中复核窗口 → 组织职责参数（设置） | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/roster-tab.js:269` | 档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/talent-tab.js:149` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/talent-tab.js:219` | 查看完整档案 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/org/talent-tab.js:293` | [JS] window.location | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/talent-tab.js:300` | [JS] window.location.href | workspace/org.html | roster | — | tab=roster<br>highlight= | 可达：组织委员工作台·成员名册 |
| `docs/src/entries/tabs/org/taskforce-tab.js:773` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/taskforce-tab.js:961` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/org/thought-review-tab.js:58` | 查看 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/org/thought-review-tab.js:59` | 档案 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/org/todo-tab.js:87` | [JS] window.location | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/party-committee/branches-tab.js:64` | （动态文本） | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/party-committee/branches-tab.js:64` | 查看档案 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/party-committee/branches-tab.js:156` | 查看该支部待批复上报 | workspace/party-committee.html | review | ${…} | tab=review<br>branchId=${…} | 可达：党委工作台·支部上报 |
| `docs/src/entries/tabs/party-committee/branches-tab.js:168` | 支部设置 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/prop/archive-tab.js:134` | 见帮助 · 档案归档 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/archive-tab.js:402` | （动态文本） | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/archive-tab.js:466` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/archive-tab.js:484` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/archive-tab.js:516` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/archive-tab.js:578` | 查看关联活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/archive-tab.js:676` | [JS] a.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/prop/archive-tab.js:866` | 制度参数 → | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/prop/kanban-tab.js:62` | 去档案归档 | workspace/prop.html | archive | — | tab=archive | 可达：宣传委员工作台·档案归档 |
| `docs/src/entries/tabs/prop/kanban-tab.js:111` | [JS] window.location.href | 动态 | — | ${…} | — | 待真机（动态目标） |
| `docs/src/entries/tabs/secretary/assign-tab.js:120` | 见帮助 · 项目赋权 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/assign-tab.js:133` | 见帮助 · 专班赋权 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/assign-tab.js:388` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/assign-tab.js:474` | 见帮助 · 常设赋权 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/assign-tab.js:680` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:256` | 去资料查询写入 → | search.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:428` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:490` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:646` | 制度参数 → | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:1471` | [JS] location | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/secretary/calendar-tab.js:1969` | [JS] a.href | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/committee-meeting-tab.js:142` | 进入 › | party-committee-meeting.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/committee-meeting-tab.js:242` | 新建线上支委会 → | party-committee-meeting.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/committee-meeting-tab.js:252` | 帮助 · 支委身份 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/feedback-tab.js:250` | [JS] a.href | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:216` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:251` | 见帮助 · 党小组与组长 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:294` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:509` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:572` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/group-progress-tab.js:610` | 见帮助 · 活动复盘 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/notification-tab.js:115` | 见帮助 · 线上参会记录 | help.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/notification-tab.js:381` | [JS] window.location.href | notice.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/overview-tab.js:109` | 去待办（代归档） › | workspace/secretary.html | todo | — | tab=todo | 可达：支书工作台·待办 |
| `docs/src/entries/tabs/secretary/todo-tab.js:218` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/todo-tab.js:227` | 材料闭环 | activity-materials.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/todo-tab.js:233` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/todo-tab.js:241` | 材料闭环 | activity-materials.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/workforce-panel.js:133` | 查看完整档案 | person.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/secretary/workforce-panel.js:155` | 去表决 | party-committee-meeting.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/shared/activity-calendar-tab.js:82` | [JS] window.location | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/shared/activity-calendar-tab.js:113` | [JS] link.href | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/today/today-tab.js:517` | 本条提醒开关 → 组长职责参数（设置） | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/today/today-tab.js:675` | [JS] window.location | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/today/today-tab.js:711` | [JS] window.location.href | notice.html | — | noticeId | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/visitor/activities-tab.js:32` | 去报名 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/visitor/activities-tab.js:38` | 去表态 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/visitor/activities-tab.js:61` | 考勤管理 / 打回确认 | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/visitor/activities-tab.js:72` | 查看活动详情：${…} | 动态 | — | — | — | 待真机（动态目标） |
| `docs/src/entries/tabs/visitor/attendance-tab.js:189` | 制度参数 → | settings.html | — | — | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/visitor/inspection-tab.js:162` | 查看活动详情 | activity.html | — | ${…} | — | 待真机（页面级门控） |
| `docs/src/entries/tabs/visitor/projects-tab.js:262` | [JS] window.location.href | 动态 | — | tfId \|\| actId | — | 待真机（动态目标） |
| `docs/src/entries/tabs/visitor/thought-report-tab.js:102` | （动态文本） | thought-report.html | — | ${…} | — | 待真机（页面级门控） |

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

