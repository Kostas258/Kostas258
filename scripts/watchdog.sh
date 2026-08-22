#!/bin/bash
# Restarts the verification runners when they die.
#
# Covers the failure of the night of 21-22 August: the runners were killed at
# 19:30 and nothing restarted them for two hours and twenty-five minutes.
#
# Two bugs found on 22 August at 13:20, both fixed here:
#
#   1. Detection matched any command line containing "node scripts/confirm.js",
#      which includes the shell wrappers that launched it. Those wrappers
#      outlive the process, so the supervisor kept seeing a dead runner as
#      alive and never restarted it. Matching is now anchored to the exact
#      argv, so only the real process counts.
#
#   2. A runner that fails its startup integrity control exits immediately, and
#      the supervisor restarted it every five minutes — each attempt spending
#      two requests on a source that was refusing precisely because it was
#      exhausted. Restarts now back off when a runner dies quickly, so a source
#      that needs a rest gets one.
#
# It restarts, it never overrides: cooldowns live in scripts/cooldown.js and a
# restarted runner waits out whatever is left of a block before its first
# request. dnsrobot is deliberately not supervised.

cd /home/user/Kostas258 || exit 1
LOG=watchdog.log
LOCK=/tmp/kostas-watchdog.lock

# 9>&- on every spawned command matters: the lock fd is inherited by children,
# and a lingering child (the sleep below, or a runner) would keep holding the
# lock after this supervisor died — which is exactly what blocked the restart
# at 13:26, an orphaned "sleep 300" still owning fd 9.
exec 9>"$LOCK"
flock -n 9 || { echo "$(TZ=Europe/Paris date +%H:%M:%S) un superviseur tourne déjà" >>"$LOG"; exit 0; }

log() { echo "$(TZ=Europe/Paris date +%H:%M:%S) $*" >>"$LOG"; }

# Exact argv, not a substring of some other process's command line.
alive() { ps -eo args --no-headers | grep -q "^node scripts/$1\$"; }

declare -A PENALTY=( [crosscheck.js]=0 [confirm.js]=0 )
declare -A STARTED=( [crosscheck.js]=0 [confirm.js]=0 )

# A runner that dies within this many seconds of starting did not do real work:
# it failed its control or hit an immediate error. Backing off is the right
# response — hammering it would only keep the source down.
SHORT_LIFE=120

maybe_restart() { # script, human name, launch command
  local s="$1" name="$2" cmd="$3" now
  alive "$s" && { PENALTY[$s]=0; return; }
  now=$(date +%s)

  if [ "${STARTED[$s]}" -gt 0 ] && [ $((now - ${STARTED[$s]})) -lt $SHORT_LIFE ]; then
    PENALTY[$s]=$(( PENALTY[$s] == 0 ? 900 : PENALTY[$s] * 2 ))
    [ "${PENALTY[$s]}" -gt 7200 ] && PENALTY[$s]=7200
    log "$name est mort en $((now - ${STARTED[$s]}))s (contrôle en échec ?) — pause de $((PENALTY[$s]/60)) min avant de réessayer"
    STARTED[$s]=$(( now + PENALTY[$s] ))   # not before this instant
    return
  fi
  [ "$now" -lt "${STARTED[$s]}" ] && return   # still serving a penalty

  log "$name arrêté — relance"
  STARTED[$s]=$now
  # `env` is required here: nohup cannot parse a VAR=value prefix itself and
  # would try to run "SC_DELAY_MS=60000" as if it were a command.
  eval "setsid nohup env $cmd" >/dev/null 2>&1 9>&- &
}

log "superviseur démarré (pid $$)"

while true; do
  maybe_restart crosscheck.js socialcal \
    "SC_DELAY_MS=60000 SC_MAX_DELAY_MS=300000 node scripts/crosscheck.js >>crosscheck.log 2>&1"

  # vervox is only worth running while candidates remain; otherwise it exits at
  # once and would be respawned in a tight loop.
  left=$(node -e '
    const b=require("./progress_1000.json"),a=require("./progress.json"),sc=require("./socialcal.json").results;
    const V=r=>r&&r.verdict&&r.verdict!=="unknown"?r.verdict:null;
    let n=0;
    for (const [names,res] of [[a.usernames,a.results],[b.names,b.results]])
      for (const u of names)
        if (V(sc[u])==="available" && !V(res[u]) && ((res[u]&&res[u].tries)||0) < 3) n++;
    console.log(n);' 2>/dev/null 9>&- || echo 0)
  if [ "${left:-0}" -gt 0 ]; then
    maybe_restart confirm.js vervox \
      "DELAY_MS=480000 MAX_DELAY_MS=1800000 node scripts/confirm.js >>confirm.log 2>&1"
  fi

  sleep 300 9>&-
done
