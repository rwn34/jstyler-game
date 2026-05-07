#!/bin/bash
# Hook: preToolUse — block destructive shell commands
# See docs/architecture/0001-root-file-exceptions.md and consolidated audit for pattern rationale

CMD=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || \
      python  -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || \
      echo "")
[ -z "$CMD" ] && exit 0
CMD=$(echo "$CMD" | tr '[:upper:]' '[:lower:]')

# Normalize whitespace for boundary matching
NORM=$(echo "$CMD" | tr -s ' \t' '  ')

# rm -rf with dangerous target (/, ~, *, .) — boundary-aware
rm_flags='(-[rf]+|-r[[:space:]]+-f|-f[[:space:]]+-r|--recursive[[:space:]]+--force|--force[[:space:]]+--recursive)'
rm_target='(/|~|\*|\.)'
rm_tail='([[:space:]]|[;|&]|$)'
if [[ " $NORM " =~ [[:space:]]rm[[:space:]]+${rm_flags}[[:space:]]+${rm_target}${rm_tail} ]]; then
    echo "BLOCKED: Destructive command — rm -rf with dangerous target." >&2
    exit 2
fi

case "$CMD" in
  *"git push --force"*|*"git push -f "*|*"git push --force-with-lease"*) echo "BLOCKED: Force-push not allowed. Use release-engineer for controlled pushes." >&2; exit 2 ;;
  *"git reset --hard"*) echo "BLOCKED: Hard reset not allowed without explicit user approval." >&2; exit 2 ;;
  *"drop database"*|*"drop table"*|*"drop schema"*) echo "BLOCKED: Destructive SQL — DROP not allowed via hook. Use data-migrator with reversible migrations." >&2; exit 2 ;;
  *"truncate table"*) echo "BLOCKED: Destructive SQL — TRUNCATE not allowed via hook. Use data-migrator with reversible migrations." >&2; exit 2 ;;
esac
exit 0
