#!/usr/bin/env bash
# E2E runner: build output must already exist (npm run build). Starts a
# preview server, runs every suite against it, tears down. Exits non-zero
# on the first failing suite.
set -e
cd "$(dirname "$0")/.."

if [ ! -f dist/index.html ]; then npm run build; fi

npx vite preview --port 4174 --host 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
for i in $(seq 1 20); do
  curl -s -o /dev/null http://127.0.0.1:4174/ && break
  sleep 0.5
done

# Chromium path: repo default is the preinstalled /opt/pw-browsers build;
# CI installs playwright's own and exposes it the standard way.
export ASTRUM_E2E=1

node e2e/smoke.mjs
node e2e/offline.mjs
node e2e/sync.mjs
node e2e/ux.mjs
node e2e/roots.mjs
echo "ALL E2E SUITES PASSED"
