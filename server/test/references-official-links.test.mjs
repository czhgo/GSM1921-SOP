// references-official-links.test.mjs — 官方制度文件链接断言（2026-08-30 自 docs/test/ 移入，并入 npm test）
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const modulePath = new URL('../../docs/src/modules/references.js?v=20260901m', import.meta.url);

const officialDocs = [
  'official-01',
  'official-02',
  'official-03',
  'official-04',
  'official-05',
];

test('官方制度文件均链接至 12371 官方原文并在新标签页打开', async () => {
  const source = await readFile(modulePath, 'utf8');

  for (const id of officialDocs) {
    const entry = source.match(new RegExp(`id: '${id}'[\\s\\S]*?(?=\\n  },|\\n\\];)`));
    assert.ok(entry, `缺少 ${id} 文档条目`);
    assert.match(entry[0], /url: 'https:\/\/(?:www\.)?12371\.cn\//, `${id} 必须使用 12371 官方链接`);
  }

  assert.match(
    source,
    /class="ref-download-btn" href="\$\{d\.url\}"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
    '有链接的文档按钮应在新标签页安全打开',
  );
});
