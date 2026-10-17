// role: [工程师]+[AI]
// 通过档案专用读口加载页面数据；mock 与 API 都必须经过同一档案策略。
import { canReadMemberProfile } from '../../core/domain/profile-access.js?v=20261016b';

export async function loadMemberProfile({ personId, actor, dataSource, apiGet, mockGet } = {}) {
  if (!personId) return null;
  const member = dataSource === 'api'
    ? await apiGet(personId)
    : await mockGet(personId);
  if (!member) return null;
  if (!canReadMemberProfile(actor, member)) {
    const error = new Error('无权限：仅本人或本支部支委可查看成员档案');
    error.status = 403;
    error.type = 'PermissionError';
    throw error;
  }
  return member;
}
