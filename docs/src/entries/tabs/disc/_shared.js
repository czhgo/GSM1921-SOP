// role: [工程师]+[AI]
// 纪检委员工作台共享上下文（T-279 M3 拆分，照 M2 样板 leader/_shared）
// 各 tab 模块复用的只读配置与纯函数：纪检委员 personId。

import { AuthStore } from '../../../services/auth.js?v=20260901z';

/** 纪检委员 personId（历史常量，多处写入落库字段如 recordedBy/annotatedBy/checkedBy） */
export const DISC_COMMISSIONER_ID = 'p10';

/** 当前纪检委员 personId（数据驱动：AuthStore 当前用户，兜底 'p10'） */
export function getDiscCommissionerId() {
  return AuthStore.getCurrentUser()?.personId || DISC_COMMISSIONER_ID;
}
