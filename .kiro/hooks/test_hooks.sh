#!/bin/bash
# test_hooks.sh — standing regression suite for .kiro/hooks/*
# Run: bash .kiro/hooks/test_hooks.sh
# Exits 0 if all pass, 1 if any fail.

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
pass=0
fail=0
fails=()

run_test() {
  local name="$1" hook="$2" payload="$3" expected="$4"
  actual=$(echo "$payload" | bash "$hook" >/dev/null 2>&1; echo $?)
  if [ "$actual" = "$expected" ]; then
    pass=$((pass+1))
    echo "  PASS  $name"
  else
    fail=$((fail+1))
    fails+=("$name (expected $expected, got $actual)")
    echo "  FAIL  $name (expected $expected, got $actual)"
  fi
}

echo "=== Kiro hooks regression suite ==="
echo ""

# --- root-file-guard ---
echo "root-file-guard:"
run_test "t1  block evil.txt at root"       "$HOOKS_DIR/root-file-guard.sh" '{"tool_input":{"file_path":"evil.txt"}}'    2
run_test "t2  allow .gitignore (ADR cat B)" "$HOOKS_DIR/root-file-guard.sh" '{"tool_input":{"file_path":".gitignore"}}'  0
run_test "t3  allow src/main.rs (not root)" "$HOOKS_DIR/root-file-guard.sh" '{"tool_input":{"file_path":"src/main.rs"}}' 0

# --- framework-dir-guard ---
echo "framework-dir-guard:"
run_test "t4  allow .ai/handoffs/test.md"       "$HOOKS_DIR/framework-dir-guard.sh" '{"tool_input":{"file_path":".ai/handoffs/test.md"}}'    0
run_test "t5  block .claude/agents/test.md"     "$HOOKS_DIR/framework-dir-guard.sh" '{"tool_input":{"file_path":".claude/agents/test.md"}}'  2
run_test "t5a allow .kirograph/config.json"     "$HOOKS_DIR/framework-dir-guard.sh" '{"tool_input":{"file_path":".kirograph/config.json"}}'  0
run_test "t5b block .codegraph/codegraph.db"    "$HOOKS_DIR/framework-dir-guard.sh" '{"tool_input":{"file_path":".codegraph/codegraph.db"}}' 2
run_test "t5c block .kimigraph/kimigraph.db"    "$HOOKS_DIR/framework-dir-guard.sh" '{"tool_input":{"file_path":".kimigraph/kimigraph.db"}}' 2

# --- sensitive-file-guard ---
echo "sensitive-file-guard:"
run_test "t6  block .env"        "$HOOKS_DIR/sensitive-file-guard.sh" '{"tool_input":{"file_path":".env"}}'        2
run_test "t7  block id_ed25519"  "$HOOKS_DIR/sensitive-file-guard.sh" '{"tool_input":{"file_path":"id_ed25519"}}'  2
run_test "t8  block id_rsa"      "$HOOKS_DIR/sensitive-file-guard.sh" '{"tool_input":{"file_path":"id_rsa"}}'      2
run_test "t9  block server.key"       "$HOOKS_DIR/sensitive-file-guard.sh" '{"tool_input":{"file_path":"server.key"}}'       2
run_test "t10 block secrets.yaml"     "$HOOKS_DIR/sensitive-file-guard.sh" '{"tool_input":{"file_path":"secrets.yaml"}}'     2
run_test "t11 block credentials.json" "$HOOKS_DIR/sensitive-file-guard.sh" '{"tool_input":{"file_path":"credentials.json"}}' 2

# --- destructive-cmd-guard ---
echo "destructive-cmd-guard:"
run_test "t12 block rm -rf /"              "$HOOKS_DIR/destructive-cmd-guard.sh" '{"tool_input":{"command":"rm -rf /"}}'              2
run_test "t13 allow rm -rf /tmp/foo"       "$HOOKS_DIR/destructive-cmd-guard.sh" '{"tool_input":{"command":"rm -rf /tmp/foo"}}'       0
run_test "t14 block rm -rf / (trailing sp)" "$HOOKS_DIR/destructive-cmd-guard.sh" '{"tool_input":{"command":"rm -rf / "}}'            2
run_test "t15 block rm -rf /;echo ok"      "$HOOKS_DIR/destructive-cmd-guard.sh" '{"tool_input":{"command":"rm -rf /;echo ok"}}'      2
run_test "t16 allow rm -rf /usr"           "$HOOKS_DIR/destructive-cmd-guard.sh" '{"tool_input":{"command":"rm -rf /usr"}}'           0
run_test "t17 allow rm -rf ~/foo"          "$HOOKS_DIR/destructive-cmd-guard.sh" '{"tool_input":{"command":"rm -rf ~/foo"}}'          0
run_test "t18 allow rm -rf *.log"          "$HOOKS_DIR/destructive-cmd-guard.sh" '{"tool_input":{"command":"rm -rf *.log"}}'          0
run_test "t19 allow rm -rf ./build"        "$HOOKS_DIR/destructive-cmd-guard.sh" '{"tool_input":{"command":"rm -rf ./build"}}'        0
run_test "t20 block DROP DATABASE (upper)" "$HOOKS_DIR/destructive-cmd-guard.sh" '{"tool_input":{"command":"DROP DATABASE foo"}}'     2
run_test "t21 block Drop Database (mixed)" "$HOOKS_DIR/destructive-cmd-guard.sh" '{"tool_input":{"command":"Drop Database foo"}}'     2
run_test "t22 allow git status"            "$HOOKS_DIR/destructive-cmd-guard.sh" '{"tool_input":{"command":"git status"}}'            0

# --- Summary ---
echo ""
total=$((pass+fail))
if [ $fail -eq 0 ]; then
  echo "PASS: $pass/$total"
  exit 0
else
  echo "FAIL: $fail/$total"
  for f in "${fails[@]}"; do echo "  - $f"; done
  exit 1
fi
