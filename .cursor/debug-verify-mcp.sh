#!/usr/bin/env bash
# Debug verification for convex_mcp + omp background settings
LOG="/Users/wernerjohannesdieben/stage_mvp/.cursor/debug-f19495.log"
SESSION="f19495"
RUN_ID="${1:-post-fix}"

log() {
  local hyp="$1" loc="$2" msg="$3" data="$4"
  printf '{"sessionId":"%s","runId":"%s","hypothesisId":"%s","location":"%s","message":"%s","data":%s,"timestamp":%s}\n' \
    "$SESSION" "$RUN_ID" "$hyp" "$loc" "$msg" "$data" "$(date +%s000)" >> "$LOG"
}

# H1: convex_mcp args in ~/.codex/config.toml point to stage_mvp
CODEX_ARGS=$(rg 'args = \[' /Users/wernerjohannesdieben/.codex/config.toml | head -1)
log "H1" "debug-verify-mcp.sh:codex" "codex convex_mcp args" "{\"argsLine\":$(python3 -c "import json; print(json.dumps('$CODEX_ARGS'))")}"

# H2: invalid deploy disable flag removed
HAS_DEPLOY=$(echo "$CODEX_ARGS" | rg -c 'deploy' || true)
log "H2" "debug-verify-mcp.sh:deploy" "deploy flag present in args" "{\"hasDeploy\":$HAS_DEPLOY}"

# H3: dpcode/synara removed
DP_EXISTS=$([ -d /Users/wernerjohannesdieben/.dpcode ] && echo true || echo false)
SY_EXISTS=$([ -d /Users/wernerjohannesdieben/.synara ] && echo true || echo false)
log "H3" "debug-verify-mcp.sh:dirs" "legacy overlay dirs" "{\"dpcodeExists\":$DP_EXISTS,\"synaraExists\":$SY_EXISTS}"

# H4: omp background cursor calls disabled
RECAP=$(omp config get recap.enabled 2>/dev/null || echo unknown)
REMOTE=$(omp config get compaction.remoteEnabled 2>/dev/null || echo unknown)
log "H4" "debug-verify-mcp.sh:omp" "omp background settings" "{\"recapEnabled\":\"$RECAP\",\"compactionRemoteEnabled\":\"$REMOTE\"}"

# H5: convex MCP process starts without immediate crash
TMPERR=$(mktemp)
(pnpm dlx convex@latest mcp start \
  --project-dir /Users/wernerjohannesdieben/stage_mvp/packages/data-ops \
  --disable-tools envSet,envRemove 2>"$TMPERR") &
PID=$!
sleep 4
if kill -0 "$PID" 2>/dev/null; then
  MCP_OK=true
  kill "$PID" 2>/dev/null
  wait "$PID" 2>/dev/null || true
else
  MCP_OK=false
fi
ERR=$(python3 -c "import json; print(json.dumps(open('$TMPERR').read()[:500]))")
log "H5" "debug-verify-mcp.sh:mcp-start" "convex mcp startup" "{\"startedOk\":$MCP_OK,\"stderr\":$ERR}"
rm -f "$TMPERR"

echo "Verification logged to $LOG"
