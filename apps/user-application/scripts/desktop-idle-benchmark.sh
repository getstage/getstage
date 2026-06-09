#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

MINUTES=30
USE_DMG=0
USE_LOCAL=0
STAGE_APP="/Applications/Stage.app/Contents/MacOS/Stage"
SAMPLE_INTERVAL_SEC=30
MAX_TOTAL_RSS_KB=409600
MAX_AVG_CPU_PERCENT=1
BENCHMARK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_PREVIEW_LOG="${TMPDIR:-/tmp}/stage-local-preview-benchmark.log"
LOCAL_PREVIEW_PID=""
STAGE_PID=""

usage() {
  cat <<'EOF'
Usage: desktop-idle-benchmark.sh [--minutes N] [--dmg] [--local]

Samples Stage CPU/RSS every 30s and exits non-zero when budgets are breached.

Options:
  --minutes N   Duration in minutes (default: 30)
  --dmg         Launch packaged Stage from /Applications before sampling
  --local       Launch this checkout's built Electron app before sampling

Pass budgets (gate uses RSS sum):
  - Total RSS across Stage + Stage Helper + stage-engine < 400 MB (excellence: < 300 MB)
  - Average CPU across samples < 1%
  - stage-engine must not be running at end (no AI used during test)

Memory note:
  - RSS sum (ps) may over-count shared Electron libraries across Helpers.
  - Summary also prints "footprint" per process (vmmap) — comparable to Activity Monitor.

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
    --local)
      USE_LOCAL=1
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

if [[ "$USE_DMG" -eq 1 && "$USE_LOCAL" -eq 1 ]]; then
  echo "Use either --dmg or --local, not both." >&2
  exit 2
fi

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

cleanup_local_preview() {
  if [[ -n "$LOCAL_PREVIEW_PID" ]]; then
    while read -r pid; do
      [[ -z "$pid" ]] && continue
      kill "$pid" 2>/dev/null || true
    done < <(collect_descendant_pids "$LOCAL_PREVIEW_PID" | sort -rn)
    kill "$LOCAL_PREVIEW_PID" 2>/dev/null || true
  fi
}

collect_descendant_pids() {
  local parent="$1"
  local child
  pgrep -P "$parent" 2>/dev/null | while read -r child; do
    [[ -z "$child" ]] && continue
    echo "$child"
    collect_descendant_pids "$child"
  done
}

kill_existing_local_previews() {
  local launcher main_pid
  while read -r launcher; do
    [[ -z "$launcher" ]] && continue
    while read -r pid; do
      [[ -z "$pid" ]] && continue
      kill -9 "$pid" 2>/dev/null || true
    done < <(collect_descendant_pids "$launcher" | sort -rn)
    kill -9 "$launcher" 2>/dev/null || true
  done < <(ps -axo pid=,args= | awk -v root="$BENCHMARK_ROOT" '
    $0 ~ root && $0 ~ /electron-vite\.js preview/ && $0 !~ /desktop-idle-benchmark/ {
      print $1
    }')

  while read -r main_pid; do
    [[ -z "$main_pid" ]] && continue
    while read -r pid; do
      [[ -z "$pid" ]] && continue
      kill -9 "$pid" 2>/dev/null || true
    done < <(collect_descendant_pids "$main_pid" | sort -rn)
    kill -9 "$main_pid" 2>/dev/null || true
  done < <(find_local_stage_main_pids)
}

find_local_stage_main_pids() {
  ps -axo pid=,ppid=,args= | awk -v root="$BENCHMARK_ROOT" '
    $0 ~ /Electron Helper/ &&
    ($0 ~ "--app-path=" root || $0 ~ /--user-data-dir=.*Application Support\/Stage/) {
      print $2
    }' | sort -u
}

find_local_stage_main_pid() {
  if [[ -n "$LOCAL_PREVIEW_PID" ]]; then
    ps -o pid=,args= -p $(pgrep -P "$LOCAL_PREVIEW_PID" 2>/dev/null | tr "\n" " ") 2>/dev/null | awk '
      $0 ~ /Electron\.app\/Contents\/MacOS\/Electron \.$/ {
        print $1
        exit
      }'
    local main_pid
    main_pid="$(find_local_stage_main_pids | head -1)"
    if [[ -n "$main_pid" ]]; then
      echo "$main_pid"
    fi
    return
  fi

  local launcher main_pid
  launcher="$(ps -axo pid=,args= | awk -v root="$BENCHMARK_ROOT" '
    $0 ~ root && $0 ~ /electron-vite\.js preview/ && $0 !~ /desktop-idle-benchmark/ {
      print $1
      exit
    }')"
  if [[ -n "$launcher" ]]; then
    LOCAL_PREVIEW_PID="$launcher"
    find_local_stage_main_pid
    return
  fi

  main_pid="$(find_local_stage_main_pids | head -1)"
  if [[ -n "$main_pid" ]]; then
    echo "$main_pid"
  fi
}

find_stage_main_pid() {
  if [[ "$USE_LOCAL" -eq 1 ]]; then
    find_local_stage_main_pid
    return
  fi

  pgrep -x Stage | head -1 || true
}

if [[ "$USE_LOCAL" -eq 1 ]]; then
  pkill -9 Stage 2>/dev/null || true
  pkill -9 stage-engine 2>/dev/null || true
  kill_existing_local_previews
  rm -f "$LOCAL_PREVIEW_LOG"
  (cd "$BENCHMARK_ROOT" && env -u ELECTRON_RUN_AS_NODE pnpm exec electron . >"$LOCAL_PREVIEW_LOG" 2>&1) &
  LOCAL_PREVIEW_PID=$!
  trap cleanup_local_preview EXIT

  for _ in {1..30}; do
    STAGE_PID="$(find_stage_main_pid)"
    if [[ -n "$STAGE_PID" ]]; then
      break
    fi
    sleep 1
  done
else
  STAGE_PID="$(find_stage_main_pid)"
fi

if [[ -z "$STAGE_PID" ]]; then
  if [[ "$USE_LOCAL" -eq 1 ]]; then
    echo "Local Stage preview did not start. Last preview log lines:" >&2
    tail -40 "$LOCAL_PREVIEW_LOG" >&2 || true
  else
    echo "Stage is not running. Open Stage, pass --dmg, or pass --local." >&2
  fi
  exit 2
fi

echo "Stage main PID=$STAGE_PID"
if [[ "$USE_LOCAL" -eq 1 ]]; then
  echo "Local preview launcher PID=$LOCAL_PREVIEW_PID"
  echo "Local preview log=$LOCAL_PREVIEW_LOG"
fi
echo "memory_pressure (before):"
memory_pressure 2>/dev/null || true
vm_stat 2>/dev/null | head -8 || true
echo

TOTAL_CPU_SUM=0
MAX_TOTAL_RSS=0
ENGINE_SEEN=0
STAGE_EXITED_EARLY=0
SAMPLES_COMPLETED=0

footprint_kb_vmmap() {
  local pid="$1"
  vmmap --summary "$pid" 2>/dev/null | awk -F': ' '
    /Physical footprint:/ && !/peak/ {
      gsub(/M/, "", $2)
      printf "%d", int($2 * 1024)
      exit
    }'
}

collect_stage_pids() {
  local pid
  if [[ "$USE_LOCAL" -eq 1 ]]; then
    find_local_stage_main_pids | while read -r pid; do
      [[ -z "$pid" ]] && continue
      echo "$pid"
    done
    ps -axo pid=,args= | awk -v root="$BENCHMARK_ROOT" '
      $0 ~ /Electron Helper/ &&
      ($0 ~ "--app-path=" root || $0 ~ /--user-data-dir=.*Application Support\/Stage/) {
        print $1
      }' || true
  else
    pgrep -x Stage 2>/dev/null | head -1 || true
    pgrep -lf "Stage Helper" 2>/dev/null | awk '{print $1}' || true
  fi
  pgrep -lf stage-engine 2>/dev/null | awk '{print $1}' || true
}

print_rss_breakdown() {
  local rows
  rows="$(
    while read -r pid; do
      [[ -z "$pid" ]] && continue
      ps -o pid=,rss=,%cpu=,comm= -p "$pid" 2>/dev/null || true
    done < <(collect_stage_pids | sort -u)
  )"

  if [[ -z "$rows" ]]; then
    echo "RSS by PID: (none)"
    return
  fi

  echo "RSS by PID (largest first):"
  echo "$rows" | sort -k2,2nr | awk '{
    pid=$1
    rss=$2
    cpu=$3
    $1=""
    $2=""
    $3=""
    sub(/^[[:space:]]+/, "")
    printf "  pid=%s rss=%sKB (~%.1fMB) cpu=%s%% %s\n", pid, rss, rss / 1024, cpu, $0
  }'
}

print_footprint_breakdown() {
  local pid label footprint_kb total_kb=0
  echo "Footprint (Activity Monitor style, vmmap):"
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    if ! ps -p "$pid" >/dev/null 2>&1; then
      continue
    fi
    footprint_kb="$(footprint_kb_vmmap "$pid")"
    [[ -z "$footprint_kb" ]] && footprint_kb=0
    total_kb=$((total_kb + footprint_kb))
    label="$(ps -o comm= -p "$pid" 2>/dev/null | sed 's/^[[:space:]]*//')"
    echo "  pid=$pid footprint=${footprint_kb}KB (~$(awk "BEGIN { printf \"%.1f\", $footprint_kb / 1024 }")MB) $label"
  done < <(collect_stage_pids | sort -u)
  echo "Footprint sum: ${total_kb}KB (~$(awk "BEGIN { printf \"%.1f\", $total_kb / 1024 }")MB)"
  echo "(Footprint is closer to Activity Monitor; RSS sum above may be higher.)"
}

for ((i = 1; i <= SAMPLES; i++)); do
  echo "--- $(date '+%H:%M:%S') sample $i/$SAMPLES ---"

  MAIN_CPU=0
  MAIN_RSS=0
  if read -r MAIN_CPU MAIN_RSS < <(ps -o %cpu=,rss= -p "$STAGE_PID" 2>/dev/null); then
    :
  else
    echo "Stage main process exited."
    STAGE_EXITED_EARLY=1
    break
  fi

  SAMPLES_COMPLETED=$i

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

  if [[ "$USE_LOCAL" -eq 1 ]]; then
    SAMPLE_CPU=0
    SAMPLE_RSS=0
    while read -r pid cpu rss _; do
      [[ -z "$pid" ]] && continue
      SAMPLE_CPU="$(awk "BEGIN { print $SAMPLE_CPU + $cpu }")"
      SAMPLE_RSS=$((SAMPLE_RSS + rss))
    done < <(
      while read -r pid; do
        [[ -z "$pid" ]] && continue
        ps -o pid=,%cpu=,rss= -p "$pid" 2>/dev/null || true
      done < <(collect_stage_pids | sort -u)
    )
    SAMPLE_CPU="$(awk "BEGIN { printf \"%.2f\", $SAMPLE_CPU }")"
  else
    SAMPLE_CPU="$(awk "BEGIN { printf \"%.2f\", $MAIN_CPU + $HELPER_CPU + $ENGINE_CPU }")"
    SAMPLE_RSS=$((MAIN_RSS + HELPER_RSS + ENGINE_RSS))
  fi
  TOTAL_CPU_SUM="$(awk "BEGIN { print $TOTAL_CPU_SUM + $SAMPLE_CPU }")"
  if [[ "$SAMPLE_RSS" -gt "$MAX_TOTAL_RSS" ]]; then
    MAX_TOTAL_RSS="$SAMPLE_RSS"
  fi

  echo "main pid=$STAGE_PID cpu=${MAIN_CPU}% rss=${MAIN_RSS}KB"
  echo "totals cpu=${SAMPLE_CPU}% rss=${SAMPLE_RSS}KB (~$(awk "BEGIN { printf \"%.1f\", $SAMPLE_RSS / 1024 }")MB)"
  print_rss_breakdown

  if [[ "$i" -lt "$SAMPLES" ]]; then
    sleep "$SAMPLE_INTERVAL_SEC"
  fi
done

AVG_CPU="$(awk "BEGIN { printf \"%.2f\", $TOTAL_CPU_SUM / ($SAMPLES_COMPLETED > 0 ? $SAMPLES_COMPLETED : 1) }")"
ENGINE_AT_END="$(pgrep -lf stage-engine 2>/dev/null || true)"

echo
echo "=== Summary ==="
echo "Finished: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Average CPU: ${AVG_CPU}% (budget < ${MAX_AVG_CPU_PERCENT}%)"
echo "Peak RSS sum (ps): ${MAX_TOTAL_RSS}KB (~$(awk "BEGIN { printf \"%.1f\", $MAX_TOTAL_RSS / 1024 }")MB) — gate budget < ${MAX_TOTAL_RSS_KB}KB (~400MB)"
echo
print_footprint_breakdown
echo
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
if [[ "$STAGE_EXITED_EARLY" -eq 1 ]]; then
  echo "Stage exited before benchmark completed - marking FAIL."
  FAIL=1
fi
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
