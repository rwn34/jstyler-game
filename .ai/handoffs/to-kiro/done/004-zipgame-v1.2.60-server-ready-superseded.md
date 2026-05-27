# SUPERSEDED — see to-kiro/open/004-server-stable-rebuild-client.md

This handoff was written before Kimi's PBKDF2-iteration-fix deploy + 17/17 prod smoke test landed. The preflight curl smoke test it recommended is now moot — Kimi already verified `/sync/set-recovery-code`, `/sync/forgot-pin`, `/sync/change-pin`, two-device merge, and rapid-race against prod, all passing.

**Use this instead:** `.ai/handoffs/to-kiro/open/004-server-stable-rebuild-client.md` (written by Kimi after the smoke test).

Move this stub to `done/` (or rename to `004a-...-superseded.md`) when you sweep the open/ directory.

If you want extra context from the version you're replacing — CHANGELOG hints for v1.2.60, post-ship monitoring checklist — read the original version in git history before this overwrite, or ask claude-code for a re-paste.
