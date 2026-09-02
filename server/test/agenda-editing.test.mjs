import test from 'node:test';
import assert from 'node:assert/strict';
import { createEditableAgenda, normalizeEditedAgenda } from '../../docs/src/services/agenda-editing.js?v=20260901l';

test('编辑议程文字时保留成员变更和文件讨论的结构字段', () => {
  const editing = createEditableAgenda([
    {
      id: 'agenda-member-1',
      kind: 'member-change',
      item: '讨论原事项',
      host: '组织委员',
      personId: 'p6',
      fromStage: '发展对象',
      toStage: '预备党员',
      result: 'passed',
    },
    {
      id: 'agenda-file-1',
      kind: 'discussion-file',
      item: '讨论旧文件',
      branchDocId: 'bd-1',
      result: null,
    },
  ]);
  editing[0].item = '讨论张同学的发展事项';
  editing[1].host = '书记';

  const saved = normalizeEditedAgenda(editing);

  assert.deepEqual(saved[0], {
    id: 'agenda-member-1',
    kind: 'member-change',
    item: '讨论张同学的发展事项',
    host: '组织委员',
    personId: 'p6',
    fromStage: '发展对象',
    toStage: '预备党员',
    result: 'passed',
  });
  assert.equal(saved[1].branchDocId, 'bd-1');
  assert.equal(saved[1].host, '书记');
});
