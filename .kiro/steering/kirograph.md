# KiroGraph

KiroGraph is a semantic code knowledge graph for Kiro CLI. It parses source code with tree-sitter, stores symbols and relationships in a local SQLite database, and exposes MCP tools for instant codebase exploration.

**Repo:** https://github.com/davide-desio-eleva/kirograph
**Install:** `kirograph install` (from source — not yet on npm)

---

## When KiroGraph is active

If `.kirograph/` exists in the project, use `kirograph_context` as your PRIMARY exploration tool. It returns full source sections for all relevant symbols in one call, replacing many file reads.

**Rules:**
1. Use `kirograph_context` for broad questions ("how does X work?", "fix the auth bug"). It combines exact lookup, FTS, and semantic search in a single call.
2. Do NOT re-read files that `kirograph_context` already returned source code for.
3. Only fall back to `grep`/`glob`/file reads for files not covered by KiroGraph results or if KiroGraph returns nothing.
4. The main session may use lightweight tools directly: `kirograph_search`, `kirograph_callers`, `kirograph_callees`, `kirograph_impact`, `kirograph_node`, `kirograph_path`, `kirograph_type_hierarchy`.

## When KiroGraph is NOT active

If `.kirograph/` does not exist, ask the user:

> "This project doesn't have KiroGraph initialized. Would you like me to run `kirograph install` to set up a code knowledge graph?"

## Quick reference

| Tool | Use for |
|------|---------|
| `kirograph_context` | Primary exploration — full source sections from natural language |
| `kirograph_search` | Find symbols by name |
| `kirograph_callers` | Who calls this symbol |
| `kirograph_callees` | What this symbol calls |
| `kirograph_impact` | What's affected by changing a symbol |
| `kirograph_node` | Single symbol details + source |
| `kirograph_type_hierarchy` | Class/interface inheritance tree |
| `kirograph_path` | Shortest path between two symbols |
| `kirograph_dead_code` | Symbols with zero references (advisory) |
| `kirograph_circular_deps` | Circular import chains (advisory) |
| `kirograph_files` | Indexed file tree with filters |
| `kirograph_status` | Index health and stats |
| `kirograph_hotspots` | Most-connected symbols by edge degree |
| `kirograph_surprising` | Non-obvious cross-file connections |
| `kirograph_diff` | Compare current graph vs saved snapshot |
| `kirograph_architecture` | Package graph + layers (opt-in) |
| `kirograph_coupling` | Ca/Ce/instability metrics (opt-in) |
| `kirograph_package` | Inspect a single package (opt-in) |

## Limitations

- Dynamic imports, reflection, and runtime-generated calls are invisible to static analysis.
- Semantic embeddings are opt-in (`enableEmbeddings: true` in `.kirograph/config.json`).
- Architecture analysis is opt-in (`enableArchitecture: true` in `.kirograph/config.json`).
- KiroGraph auto-syncs via Kiro hooks (`fileEdited`, `fileCreated`, `fileDeleted`, `agentStop`). However, Kiro subagent writes do NOT fire hooks (platform bug #7671) — run `kirograph sync` manually after subagent work if the index seems stale.
- Caveman mode (`cavemanMode` in config) compresses agent prose to save tokens. Opt-in.
