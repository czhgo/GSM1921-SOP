// role: [工程师]+[AI]
// issue-mock-identity.test.mjs — mock 浏览器持久化不得保留匿名真实身份（D-824）
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('mock 缓存与草稿迁除旧匿名身份，新增草稿也不持久化真身', async () => {
  const previousReadOnly = process.env.DEMO_READONLY;
  process.env.DEMO_READONLY = '0';

  const values = new Map();
  globalThis.localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  globalThis.sessionStorage = {
    getItem(key) { return values.get(`session:${key}`) ?? null; },
    setItem(key, value) { values.set(`session:${key}`, String(value)); },
    removeItem(key) { values.delete(`session:${key}`); },
  };

  try {
    localStorage.setItem('gsm1921-issue-cache-version', '4');
    localStorage.setItem('gsm1921-issue-cache-v3', JSON.stringify([{
      id: 'legacy-anonymous', number: 9001, branchId: 'br-b1', title: '旧匿名反馈', body: '旧正文',
      submittedBy: '匿名', anonymous: true, _realPersonId: 'p5', nested: { realPersonId: 'p5' },
    }]));
    localStorage.setItem('gsm1921-issue-drafts', JSON.stringify([{
      draftId: 'legacy-draft', type: 'new-issue', author: '匿名',
      payload: { title: '旧匿名草稿', submittedBy: '匿名', anonymous: true, _realPersonId: 'p5' },
    }]));
    localStorage.setItem('gsm1921-login-user', JSON.stringify({ personId: 'p5', role: 'participant' }));

    const { IssueStore } = await import('../../docs/src/services/governance/issues.js?v=20261018f');
    await IssueStore.loadAll();
    IssueStore.addDraft({
      type: 'new-issue',
      payload: {
        title: '新匿名草稿', submittedBy: '匿名', anonymous: true,
        _realPersonId: 'p5', nested: { submitterId: 'p5' },
      },
    }, '匿名');

    const cache = JSON.parse(localStorage.getItem('gsm1921-issue-cache-v3'));
    const drafts = JSON.parse(localStorage.getItem('gsm1921-issue-drafts'));
    const legacy = cache.find((row) => row.id === 'legacy-anonymous');
    const oldDraft = drafts.find((row) => row.draftId === 'legacy-draft');
    const newDraft = drafts.find((row) => row.payload?.title === '新匿名草稿');

    assert.equal(legacy.title, '旧匿名反馈', '旧记录业务内容保留');
    assert.equal(oldDraft.payload.title, '旧匿名草稿', '旧草稿业务内容保留');
    assert.ok(newDraft, '新增草稿仍可保存');
    assert.equal(localStorage.getItem('gsm1921-issue-cache-version'), '4', '身份迁移不靠清库升级版本');
    assert.doesNotMatch(JSON.stringify(cache), /_realPersonId|realPersonId|submitterId/);
    assert.doesNotMatch(JSON.stringify(drafts), /_realPersonId|realPersonId|submitterId/);
  } finally {
    if (previousReadOnly === undefined) delete process.env.DEMO_READONLY;
    else process.env.DEMO_READONLY = previousReadOnly;
    delete globalThis.localStorage;
    delete globalThis.sessionStorage;
  }
});
