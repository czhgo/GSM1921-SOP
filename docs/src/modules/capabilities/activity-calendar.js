// role: [工程师]+[AI]
// 能力声明：首页活动日历（T-279 M1 首个示例迁移）
// 自注册模式：import 本模块即触发注册（副作用导入），消费点经注册表发现后 mount。
// 改造前 main-entry.js 直接调用 renderCalendarForDashboard(state, targetMonth)；
// 改造后经注册表 mountCapability('activity-calendar', null, { state, targetMonth }) —— 同一函数、同一参数。

import { registerCapability } from '../../core/registry.js?v=20260829l';
import { renderCalendarForDashboard } from '../../components/calendar.js?v=20260829l';

registerCapability({
  id: 'activity-calendar',
  name: '首页活动日历',
  version: '20260822a',
  scope: ['dashboard'],
  requiredRoles: null,
  deps: ['data-adapter'],
  mount: (_container, ctx) => renderCalendarForDashboard(ctx.state, ctx.targetMonth),
});
