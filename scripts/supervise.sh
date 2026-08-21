#!/bin/bash
# Relaunches the drip whenever it dies, re-reading HTTPS_PROXY each time.
# The container reassigns the local proxy port on restart, and a running Node
# process keeps the stale one — that killed the overnight run at 01:21 UTC.
# Stops for good at the 16:00 UTC deadline.

DIR=/tmp/claude-0/-home-user-Kostas258/9a6200c7-81eb-5162-8608-b21f53cc2572/scratchpad
DEADLINE=$(date -u -d "2026-08-21 16:00:00" +%s)

while [ "$(date -u +%s)" -lt "$DEADLINE" ]; do
  # Pick up the current proxy port from a fresh environment read.
  PORT=$(grep -ao 'http://127\.0\.0\.1:[0-9]*' /proc/self/environ 2>/dev/null | head -1)
  [ -n "$PORT" ] && export HTTPS_PROXY="$PORT" https_proxy="$PORT"
  echo "=== $(date -u +%H:%M:%S) launching drip10 with proxy $HTTPS_PROXY" >> "$DIR/supervise.log"

  NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node "$DIR/drip10.js" >> "$DIR/drip10.log" 2>&1
  code=$?
  echo "=== $(date -u +%H:%M:%S) drip10 exited with code $code" >> "$DIR/supervise.log"

  [ "$(date -u +%s)" -ge "$DEADLINE" ] && break
  sleep 60
done
echo "=== $(date -u +%H:%M:%S) deadline reached, supervisor stopping" >> "$DIR/supervise.log"
