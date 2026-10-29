// role: [工程师]+[AI]
// esm-parse-worker.mjs — 在 --experimental-vm-modules 下用真正的 ESM 解析器遍历文件。
// 只做「解析」：SourceTextModule 构造即完成静态语法解析（含 import/export 位置检查），
// 但不会链接依赖、不会执行模块体 —— 因此不需要文件之间的依赖可用。
//
// 输入：argv[2] = 一个 JSON 文件路径，内容形如 { "files": ["绝对路径", ...] }
// 输出：stdout = { "total": N, "failures": [{ file, name, message }] }
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const payload = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const failures = [];

for (const file of payload.files) {
  try {
    // 注意：不能换成 `node --check` —— 它按 CommonJS 解析，函数体内的 `import` 不报错。
    new vm.SourceTextModule(readFileSync(file, 'utf8'), { identifier: file });
  } catch (err) {
    failures.push({
      file,
      name: err && err.name ? String(err.name) : 'Error',
      message: err && err.message ? String(err.message) : String(err),
    });
  }
}

process.stdout.write(JSON.stringify({ total: payload.files.length, failures }));
