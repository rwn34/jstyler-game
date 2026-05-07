#!/bin/bash
# Hook 5: Git status at session start
# Inject git status --short into context

if git rev-parse --git-dir > /dev/null 2>&1; then
    STATUS=$(git status --short 2>/dev/null)
    if [ -n "$STATUS" ]; then
        echo '--- Git status (uncommitted changes) ---'
        echo "$STATUS"
        echo '--- end ---'
    else
        echo '--- Git status: working tree clean ---'
    fi
fi
