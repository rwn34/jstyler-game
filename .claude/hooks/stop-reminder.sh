#!/bin/bash
# Stop hook — reminders before Claude ends the turn.
# (1) Activity log not updated in last 60 min → remind to log substantive work.
# (2) Uncommitted changes beyond the activity log → remind to delegate commit.
# Both non-blocking (exit 0).

# --- Reminder 1: activity log ---
if [ -f .ai/activity/log.md ] && [ -z "$(find .ai/activity/log.md -mmin -60 2>/dev/null)" ]; then
    echo "REMINDER: .ai/activity/log.md was not updated in this session. If you made substantive changes (file edits, tests run, decisions), prepend an entry before ending."
fi

# --- Reminder 2: uncommitted changes beyond the activity log ---
# Filter out the activity log line from git status; if anything else is uncommitted, remind.
unpushed=$(git status --short 2>/dev/null | grep -vE '\.ai/activity/log\.md$')
if [ -n "$unpushed" ]; then
    echo ""
    echo "REMINDER: Uncommitted changes beyond the activity log:"
    echo "$unpushed" | head -10
    echo ""
    echo "You can't commit directly as orchestrator (no Bash tool). Delegate the commit to infra-engineer with an explicit commit message, or ask the user to commit manually."
fi

exit 0
