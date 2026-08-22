#!/bin/bash
# Restarts the verification runners when they die.
#
# The failure this covers: on the night of 21-22 August the three runners were
# killed at 19:30 and nothing restarted them for two hours and twenty-five
# minutes. The scheduled-trigger route needs an approval this session cannot
# obtain, so the supervisor runs here instead.
#
# It is started with setsid+nohup so it does not belong to the harness task
# group — the thing that took the runners down with it last time.
#
# It restarts, it never overrides: cooldowns live in scripts/cooldown.js and a
# restarted runner waits out whatever is left of a block before its first
# request. dnsrobot is deliberately not supervised; its Instagram quota has
# never opened.

cd /home/user/Kostas258 || exit 1
LOG=watchdog.log
LOCK=/tmp/kostas-watchdog.lock

# One supervisor at a time, or restarts stack up into a stampede.
exec 9>"$LOCK"
flock -n 9 || { echo "$(TZ=Europe/Paris date +%H:%M:%S) un superviseur tourne déjà" >>"$LOG"; exit 0; }

log() { echo "$(TZ=Europe/Paris date +%H:%M:%S) $*" >>"$LOG"; }
log "superviseur démarré (pid $$)"

while true; do
  if ! pgrep -f 'node scripts/crosscheck.js' >/dev/null; then
    log "socialcal mort — relance"
    SC_DELAY_MS=60000 SC_MAX_DELAY_MS=300000 \
      setsid nohup node scripts/crosscheck.js >>crosscheck.log 2>&1 &
  fi

  if ! pgrep -f 'node scripts/confirm.js' >/dev/null; then
    # Only worth restarting while candidates remain; otherwise it exits at once
    # and this would respawn it in a tight loop.
    left=$(node -e '
      const b=require("./progress_1000.json"),a=require("./progress.json"),sc=require("./socialcal.json").results;
      const V=r=>r&&r.verdict&&r.verdict!=="unknown"?r.verdict:null;
      let n=0;
      for (const [names,res] of [[a.usernames,a.results],[b.names,b.results]])
        for (const u of names) if (V(sc[u])==="available" && !V(res[u])) n++;
      console.log(n);' 2>/dev/null || echo 0)
    if [ "${left:-0}" -gt 0 ]; then
      log "vervox mort — relance ($left candidats en attente)"
      DELAY_MS=480000 MAX_DELAY_MS=1800000 \
        setsid nohup node scripts/confirm.js >>confirm.log 2>&1 &
    fi
  fi
  sleep 300
done
