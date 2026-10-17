import { test } from 'node:test';
import assert from 'node:assert/strict';

const { deriveArchivePeriod, attachArchivePolicySnapshot, compareArchivePeriodDesc } = await import(
  '../../docs/src/services/governance/periodic-archive.js?v=20261017h'
);

test('周期归档按周生成稳定期次与工作日区间', () => {
  assert.deepEqual(deriveArchivePeriod('week', '2026-10-15'), {
    unit: 'week', key: '2026-W42', label: '第42周', range: '2026-10-12 ~ 2026-10-16',
  });
});

test('周期归档按月生成自然月期次与完整日期区间', () => {
  assert.deepEqual(deriveArchivePeriod('month', '2026-02-14'), {
    unit: 'month', key: '2026-02', label: '2026年2月', range: '2026-02-01 ~ 2026-02-28',
  });
});

test('提交记录冻结当时的规则版本，旧快照不会被后续策略覆盖', () => {
  const submitted = attachArchivePolicySnapshot(
    { id: 'wr-test', status: 'submitted' },
    { unit: 'week' },
    4,
    '2026-10-15',
  );
  assert.deepEqual(submitted.archivePolicySnapshot, {
    id: 'branch-periodic-archive', version: 4, unit: 'week',
    periodKey: '2026-W42', periodLabel: '第42周', periodRange: '2026-10-12 ~ 2026-10-16',
  });
  const afterPolicyChange = attachArchivePolicySnapshot(submitted, { unit: 'month' }, 5, '2026-10-15');
  assert.deepEqual(afterPolicyChange.archivePolicySnapshot, submitted.archivePolicySnapshot);
});

test('周期归档记录按实际期次起始日期排序，兼容周与月策略记录混存', () => {
  const rows = [
    { id: 'old', periodRange: '2026-09-01 ~ 2026-09-30' },
    { id: 'new', periodRange: '2026-10-01 ~ 2026-10-31' },
    { id: 'middle', weekRange: '2026-09-21 ~ 2026-09-25' },
  ];
  assert.deepEqual(rows.sort(compareArchivePeriodDesc).map((row) => row.id), ['new', 'middle', 'old']);
});
