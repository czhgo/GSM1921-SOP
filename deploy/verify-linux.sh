#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  deploy/verify-linux.sh —— 部署件**容器可验证项**一键验证（非 root，可重复）
#
#    bash deploy/verify-linux.sh        # 仓库根执行；任意工作目录均可
#
#  为什么有它（批次 533 波次 D，部署 73→75）：
#    GitHub Actions 的 ubuntu 容器能验证的部署动作必须**机检**，不能继续靠「上测试机跑一遍看看」。
#    本脚本只覆盖**不需要 root / systemd / 真机**的六步：
#      ① shell 语法：deploy/*.sh 全量 `bash -n`
#      ② doctor：review 档，临时库 ＋ 临时 uploads
#      ③ 起服务：production 档，临时库 ＋ 临时 uploads ＋ 随机空闲端口
#      ④ smoke --login：对 ③ 的服务探「存活 ＋ 登录 ＋ 读本人」
#      ⑤ preflight-cutover --strict：对 ③ 产出的临时生产库
#      ⑥ package 出包 ＋ 包内断言（不得含 data.db / uploads / test）
#
#  **不在本脚本**（清单见 deploy/README.md「容器可验证 / 仅真机可验证」）：
#    install.sh 的 useradd / systemd / cron；update.sh 的停服切换与备份；nginx 反代；真实域名与 HTTPS。
#    这些必须上测试机；容器里不跑，也不假跑。
#
#  前置：node ≥ 22、npm、curl、tar；server/node_modules 已装（CI 先 `cd server && npm ci`）。
#  临时目录：mktemp -d（默认 TMPDIR 或 /tmp）；可用 VERIFY_TMPDIR 指定父目录，Windows 原生路径
#    （如 `D:\repo\.tmp`）会被转成 POSIX 再交给 bash / tar（建议设成本盘目录，避免跨盘路径）。
#    trap 负责清理临时目录与后台服务进程。
#  退出码：0 全通过 / 1 任一步失败（失败即停）。
# ════════════════════════════════════════════════════════════════
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die() { printf '\033[31m✖ %s\033[0m\n' "$*" >&2; exit 1; }
ok() { printf '  ✔ %s\n' "$*"; }

# Windows Git Bash 下把 /tmp/... 映射成 node 能识别的原生路径；Linux（CI）下原样返回。
native_path() { if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s\n' "$1"; fi; }
# 取一个空闲端口，避免与 runner / 本机其他进程撞端口。
free_port() {
  node -e 'const s=require("node:net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close();})'
}

# VERIFY_TMPDIR 常被设成 Windows 原生路径（如 D:\repo\.tmp）；统一转成 POSIX 再交给 bash / tar，
# 否则 MSYS tar 把 `D:` 当成远程主机（批次 539 实测）。Linux 上无 cygpath，原样保留。
if [ -n "${VERIFY_TMPDIR:-}" ] && command -v cygpath >/dev/null 2>&1; then
  VERIFY_TMPDIR="$(cygpath -u "$VERIFY_TMPDIR")"
fi
TMP="$(mktemp -d "${VERIFY_TMPDIR:-${TMPDIR:-/tmp}}/gsm1921-verify.XXXXXX")"
TMP_WIN="$(native_path "$TMP")"
SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill -TERM "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT INT TERM

# ── ① shell 语法 ────────────────────────────────────────────────
say "① shell 语法（deploy/*.sh → bash -n）"
shopt -s nullglob
sh_files=(deploy/*.sh)
shopt -u nullglob
[ "${#sh_files[@]}" -gt 0 ] || die "deploy/ 下找不到 .sh"
for f in "${sh_files[@]}"; do bash -n "$f"; ok "bash -n $f"; done

# ── ② 依赖 ─────────────────────────────────────────────────────
say "② 依赖"
[ -d server/node_modules/better-sqlite3 ] || die "server/node_modules 缺 better-sqlite3 —— 先跑：cd server && npm ci"
ok "server/node_modules 就绪"

mkdir -p "$TMP/uploads-review" "$TMP/uploads-prod"

# ── ③ doctor（review 档）───────────────────────────────────────
say "③ doctor（review 档 · 临时库 $TMP/review.db）"
APP_ENV=review LOGIN_PASSWORD=123456 SEED_FALLBACK=0 \
  DB_PATH="$TMP_WIN/review.db" UPLOAD_DIR="$TMP_WIN/uploads-review" \
  node deploy/doctor.mjs || die "doctor（review 档）有拦路项"
ok "doctor 通过（无拦路项）"

# ── ④ 起服务（production 档）＋ smoke --login ──────────────────
say "④ 起服务（production 档）＋ smoke --login"
PORT="$(free_port)"
PASS="verify-$(date +%s)-$$"
PARTY_ID="${BASELINE_PARTY_STAFF_ID:-9000000001}"
BASE="http://127.0.0.1:$PORT"

env APP_ENV=production LOGIN_PASSWORD="$PASS" SEED_FALLBACK=0 \
  DB_PATH="$TMP_WIN/prod.db" UPLOAD_DIR="$TMP_WIN/uploads-prod" PORT="$PORT" \
  node server/server.js >"$TMP/server.log" 2>&1 &
SERVER_PID=$!

ready=0
for _ in $(seq 1 60); do
  if curl -fsS "$BASE/api/v1/health" >/dev/null 2>&1; then ready=1; break; fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    cat "$TMP/server.log" >&2
    die "服务启动即退出（见上方日志）"
  fi
  sleep 0.5
done
if [ "$ready" -ne 1 ]; then
  cat "$TMP/server.log" >&2
  die "服务 30s 内未就绪"
fi
ok "服务已就绪：$BASE（端口随机，不占 3000）"

BASE="$BASE" APP_ENV=production node deploy/smoke.mjs --login "$PARTY_ID" "$PASS" || {
  cat "$TMP/server.log" >&2
  die "smoke --login 未通过"
}

kill -TERM "$SERVER_PID" 2>/dev/null || true
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=""
ok "服务已优雅停止"

# ── ⑤ preflight-cutover --strict ───────────────────────────────
say "⑤ preflight-cutover --strict（同一个临时生产库）"
node server/scripts/preflight-cutover.mjs \
  --db "$TMP_WIN/prod.db" --uploads "$TMP_WIN/uploads-prod" --strict \
  || die "preflight --strict 未通过"
ok "preflight --strict 通过（阻断 0 · 警告 0）"

# ── ⑥ package 出包 ＋ 包内断言 ─────────────────────────────────
say "⑥ package 出包 ＋ 包内断言"
# package.mjs 的 --out 是相对仓库根解析的（path.join(ROOT, out)），故先算相对路径。
PKG_REL="$(node -e 'const p=require("node:path");process.stdout.write(p.relative(process.argv[1], process.argv[2]))' \
  "$(native_path "$REPO_ROOT")" "$TMP_WIN/pkg")"
node deploy/package.mjs --out "$PKG_REL" || die "打包失败"
TARBALL="$(ls "$TMP"/pkg/*.tar.gz 2>/dev/null | head -1 || true)"
[ -n "$TARBALL" ] || die "未生成发布包（$TMP/pkg）"
tar -tzf "$TARBALL" >"$TMP/pkg-list.txt"
if grep -qE '(^|/)data\.db(-wal|-shm)?$' "$TMP/pkg-list.txt"; then die "包内含 data.db"; fi
if grep -qE '(^|/)uploads/' "$TMP/pkg-list.txt"; then die "包内含 uploads/"; fi
if grep -qE '(^|/)test/' "$TMP/pkg-list.txt"; then die "包内含 test/"; fi
ok "包内无 data.db / uploads / test（$(wc -l <"$TMP/pkg-list.txt" | tr -d ' ') 个条目）"

say "结论"
ok "容器可验证项 6/6 通过（shell 语法 · doctor · 起服务 · smoke · preflight · package）"
printf '  · 仅真机可验证：install.sh 的 useradd/systemd/cron、update.sh 的停服切换与备份、nginx 反代。\n'
