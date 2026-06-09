#!/usr/bin/env bash
set -euo pipefail

MINUTES=30
USE_DMG=0
STAGE_APP="/Applications/Stage.app/Contents/MacOS/Stage"
SAMPLE_INTERVAL_SEC=30
MAX_TOTAL_RSS_KB=409600
MAX_AVG_CPU_PERCENT=1

usage() {
  cat <<'EOF'
Usage: desktop-idle-benchmark.sh [--minutes N] [--dmg]

Samples Stage CPU/RSS every 30s and exits non-zero when budgets are breached.

Options:
  --minutes N   Duration in minutes (default: 30)
  --dmg         Launch packaged Stage from /Applications before sampling

Pass budgets:
  - Total RSS across Stage + Stage Helper + stage-engine < 400 MB (excellence: < 300 MB)
  - Average CPU across samples < 1%
  - stage-engine must not be running at end (no AI used during test)

Do not touch Stage during the run.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --minutes)
      MINUTES="${2:?--minutes requires a value}"
      shift 2
      ;;
    --dmg)
      USE_DMG=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! [[ "$MINUTES" =~ ^[0-9]+$ ]] || [[ "$MINUTES" -lt 1 ]]; then
  echo "--minutes must be a positive integer" >&2
  exit 2
fi

SAMPLES=$(( (MINUTES * 60) / SAMPLE_INTERVAL_SEC ))
if [[ "$SAMPLES" -lt 1 ]]; then
  SAMPLES=1
fi

echo "=== Stage desktop idle benchmark ==="
echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Duration: ${MINUTES} min (${SAMPLES} samples every ${SAMPLE_INTERVAL_SEC}s)"
echo "DO NOT touch Stage during this run."
echo

if [[ "$USE_DMG" -eq 1 ]]; then
  if [[ ! -x "$STAGE_APP" ]]; then
    echo "Packaged Stage not found at $STAGE_APP" >&2
    exit 2
  fi

  pkill -9 Stage 2>/dev/null || true
  pkill -9 stage-engine 2>/dev/null || true
  sleep 1
  "$STAGE_APP" &
  sleep 3
fi

STAGE_PID="$(pgrep -x Stage | head -1 || true)"
if [[ -z "$STAGE_PID" ]]; then
  echo "Stage is not running. Open Stage or pass --dmg." >&2
  exit 2
fi

echo "Stage main PID=$STAGE_PID"
echo "memory_pressure (before):"
memory_pressure 2>/dev/null || true
vm_stat 2>/dev/null | head -8 || true
echo

TOTAL_CPU_SUM=0
MAX_TOTAL_RSS=0
ENGINE_SEEN=0

for ((i = 1; i <= SAMPLES; i++)); do
  echo "--- $(date '+%H:%M:%S') sample $i/$SAMPLES ---"

  MAIN_CPU=0
  MAIN_RSS=0
  if read -r MAIN_CPU MAIN_RSS < <(ps -o %cpu=,rss= -p "$STAGE_PID" 2>/dev/null); then
    :
  else
    echo "Stage main process exited."
    break
  fi

  HELPER_CPU=0
  HELPER_RSS=0
  while read -r pid cpu rss _; do
    HELPER_CPU="$(awk "BEGIN { print $HELPER_CPU + $cpu }")"
    HELPER_RSS=$((HELPER_RSS + rss))
  done < <(pgrep -lf "Stage Helper" 2>/dev/null | awk '{print $1}' | xargs -I{} ps -o pid=,%cpu=,rss= -p {} 2>/dev/null || true)

  ENGINE_CPU=0
  ENGINE_RSS=0
  ENGINE_LINES="$(pgrep -lf stage-engine 2>/dev/null || true)"
  if [[ -n "$ENGINE_LINES" ]]; then
    ENGINE_SEEN=1
    echo "$ENGINE_LINES"
    while read -r pid cpu rss _; do
      ENGINE_CPU="$(awk "BEGIN { print $ENGINE_CPU + $cpu }")"
      ENGINE_RSS=$((ENGINE_RSS + rss))
    done < <(pgrep -lf stage-engine 2>/dev/null | awk '{print $1}' | xargs -I{} ps -o pid=,%cpu=,rss= -p {} 2>/dev/null || true)
  else
    echo "(no stage-engine)"
  fi

  SAMPLE_CPU="$(awk "BEGIN { printf \"%.2f\", $MAIN_CPU + $HELPER_CPU + $ENGINE_CPU }")"
  SAMPLE_RSS=$((MAIN_RSS + HELPER_RSS + ENGINE_RSS))
  TOTAL_CPU_SUM="$(awk "BEGIN { print $TOTAL_CPU_SUM + $SAMPLE_CPU }")"
  if [[ "$SAMPLE_RSS" -gt "$MAX_TOTAL_RSS" ]]; then
    MAX_TOTAL_RSS="$SAMPLE_RSS"
  fi

  echo "main pid=$STAGE_PID cpu=${MAIN_CPU}% rss=${MAIN_RSS}KB"
  echo "totals cpu=${SAMPLE_CPU}% rss=${SAMPLE_RSS}KB (~$(awk "BEGIN { printf \"%.1f\", $SAMPLE_RSS / 1024 }")MB)"

  if [[ "$i" -lt "$SAMPLES" ]]; then
    sleep "$SAMPLE_INTERVAL_SEC"
  fi
done

AVG_CPU="$(awk "BEGIN { printf \"%.2f\", $TOTAL_CPU_SUM / $SAMPLES }")"
ENGINE_AT_END="$(pgrep -lf stage-engine 2>/dev/null || true)"

echo
echo "=== Summary ==="
echo "Finished: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Average CPU: ${AVG_CPU}% (budget < ${MAX_AVG_CPU_PERCENT}%)"
echo "Peak RSS: ${MAX_TOTAL_RSS}KB (budget < ${MAX_TOTAL_RSS_KB}KB)"
echo "Engine seen during run: $([[ "$ENGINE_SEEN" -eq 1 ]] && echo yes || echo no)"
echo "Engine at end:"
if [[ -n "$ENGINE_AT_END" ]]; then
  echo "$ENGINE_AT_END"
else
  echo "(none)"
fi
echo
echo "memory_pressure (after):"
memory_pressure 2>/dev/null || true
vm_stat 2>/dev/null | head -8 || true

FAIL=0
awk "BEGIN { exit !($AVG_CPU > $MAX_AVG_CPU_PERCENT) }" || FAIL=1
if [[ "$MAX_TOTAL_RSS" -gt "$MAX_TOTAL_RSS_KB" ]]; then
  FAIL=1
fi
if [[ -n "$ENGINE_AT_END" ]]; then
  FAIL=1
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo "RESULT: PASS"
  exit 0
fi

echo "RESULT: FAIL"
exit 1
