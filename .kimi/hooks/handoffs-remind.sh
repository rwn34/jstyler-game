#!/bin/bash
# Hook 6: Open handoffs reminder at session start
# List pending handoffs for kimi-cli

HANDOFFS_DIR=".ai/handoffs/to-kimi/open"

if [ -d "$HANDOFFS_DIR" ]; then
    COUNT=$(ls -1 "$HANDOFFS_DIR"/*.md 2>/dev/null | wc -l)
    if [ "$COUNT" -gt 0 ]; then
        echo "--- Pending handoffs for kimi-cli ($COUNT) ---"
        ls -1 "$HANDOFFS_DIR"/*.md 2>/dev/null | sed 's|.*/||'
        echo "--- end ---"
    fi
fi
