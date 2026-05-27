# Cloudflare Worker Security Audit — ndj-metrics

- **Date**: 2026-05-26
- **Auditor**: security-auditor
- **Scope**: `cloudflare/src/index.js`, `cloudflare/wrangler.toml`, `cloudflare/build.mjs`, `cloudflare/migrations/*`, `cloudflare/src/dashboard/api.js`, `cloudflare/package.json`
- **Method**: Read-only static review + git history inspection. No scanners executed (no Bash for semgrep/trufflehog available in this sandbox); analysis is manual line-by-line.

This worker is the metrics + cloud-sync backend for the N30N DASH J game. It exposes:
- Public ingest endpoints (`/session`, `/event`, `/events/batch`, `/feedback`)
- Cloud-sync endpoints (`/sync/save|load|check|change-pin|forgot-pin`)
- Cookie-gated dashboard and `/admin/*` mutation endpoints

---

## Severity Summary

| # | Severity | Category | Title |
|---|---|---|---|
| 1 | **CRITICAL** | secret | `DASHBOARD_KEY`, `SYNC_SALT`, `ENCRYPTION_KEY` plaintext in committed `wrangler.toml` |
| 2 | **CRITICAL** | crypto | `ENCRYPTION_KEY` is a placeholder pattern (`0123456789abcdef…`) — appears to be default, not a real key |
| 3 | **CRITICAL** | auth | Forgot-PIN flow allows account takeover with no out-of-band verification |
| 4 | **HIGH** | auth | Non-constant-time secret comparisons (`password !== env.DASHBOARD_KEY`, HMAC sig `expected === sig`) |
| 5 | **HIGH** | crypto | PIN "hashing" is a single HMAC-SHA256 with a known global salt — no per-user salt, no KDF, no work factor |
| 6 | **HIGH** | auth | `sync_lookup` table is keyed by plaintext `username + mmyy` — anyone with DB read can enumerate all accounts and use the forgot-PIN flow |
| 7 | **HIGH** | injection (NoSQL/template) | `handleStatsGeo` builds SQL with string interpolation for `IN (...)` placeholders (low-risk because data is whitelisted, but pattern leaks) |
| 8 | **HIGH** | rate-limit | In-memory per-isolate rate-limit map provides no real protection in Workers — easily bypassed |
| 9 | **HIGH** | idempotency | Sync save's "balance check" recomputes from merged data — race conditions allow double-spend across parallel requests |
| 10 | **MEDIUM** | auth | Auth cookie signature uses HMAC over only `expiresAt` (no user/session id) — cookie is reusable across "users" (only one admin) and can't be revoked without rotating `DASHBOARD_KEY` |
| 11 | **MEDIUM** | input-validation | Sync save accepts arbitrary `data` object with no schema, depth, or per-field size limits; `MAX_BODY = 50KB` is the only cap |
| 12 | **MEDIUM** | input-validation | `username` / `mmyy` / `pin` not validated on `/sync/save`, `/sync/load`, `/sync/check`, `/sync/change-pin` — only enforced on `/sync/forgot-pin` |
| 13 | **MEDIUM** | CORS | `Access-Control-Allow-Origin: *` on every ingest + sync endpoint, no `Vary: Origin`. Combined with the broad attack surface this is permissive |
| 14 | **MEDIUM** | PII / logging | `console.log('[SYNC CHECK] Not found for username:', username, 'mmyy:', mmyy)` logs PII (username + birth month/year) on every failed lookup |
| 15 | **MEDIUM** | config | `wrangler.toml` puts secrets in `[vars]` (worker env, world-readable to anyone with worker access) instead of Cloudflare Secrets |
| 16 | **MEDIUM** | crypto / data | `playerName` and `playerMmyy` are stored in encrypted blob *and* duplicated plaintext in `sync_lookup` |
| 17 | **MEDIUM** | DoS | Several endpoints execute many sequential D1 queries per request (`handleStatsRetention`, `handleStatsFunnel`, `handleStatsChampionFunnel`, `handleSyncForgotPin` fallback scan) — easy to exhaust D1 quota |
| 18 | **MEDIUM** | rate-limit gap | No rate limit on `/sync/check` (account enumeration oracle) |
| 19 | **LOW** | input | `/admin/aggregate` and other `/admin/*` POST endpoints lack CSRF protection (cookie-only auth + same-origin loosely enforced) |
| 20 | **LOW** | dep | `esbuild ^0.20` — older patch range; verify no known DOSes |

---

## Findings

### 1. CRITICAL — Hard-coded secrets committed to git
**Category**: secret
**Files**: `cloudflare/wrangler.toml:6,7,10`
**Git blame**: `DASHBOARD_KEY = "qwepoi123098"` introduced in commit `8b6b0cf` ("v1.1.14 — major game + metrics dashboard release"). `SYNC_SALT` and `ENCRYPTION_KEY` introduced in commit `67aa7c9` ("v1.2.51"). All three values are still in `HEAD`.

```
DASHBOARD_KEY = "qwepoi123098"
SYNC_SALT     = "ndj-sync-v1-salt"
ENCRYPTION_KEY= "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

**Blast radius**:
- `DASHBOARD_KEY`: full read/write access to the metrics dashboard and every `/admin/*` mutation endpoint (flag/ban PIDs, reset any user's sync PIN, force aggregations). With this single string anyone can log in.
- `SYNC_SALT`: the only ingredient (besides username/mmyy/pin) in `hashSyncKey()`. Knowing it lets an attacker pre-compute the key-hash for any candidate (username, mmyy, pin) tuple offline. Combined with the small PIN space (6 digits = 10^6) every account can be cracked in seconds against the public `sync_lookup`/`sync_states` schema if the DB ever leaks.
- `ENCRYPTION_KEY`: AES-256-GCM key for every cloud save. Anyone with this key + a DB dump can decrypt every player's progress, including playerName, playerMmyy (a low-entropy birth month/year), and `syncPin` (stored plaintext inside the encrypted blob — see finding 3).

**Exploitability**: trivial — the repo is named for a static games portal and the user said it ships as a zip uploaded to Cloudflare Pages. If the repo is ever public (or has ever been pushed to a public fork / `src-1.2.0.zip` artifact in repo root), the keys are world-readable. Even private, every collaborator and every CI runner that clones the repo holds full production credentials.

**Mitigation (prose, no patch)**:
- Treat these three values as compromised immediately. Rotate `DASHBOARD_KEY` (one-line change). Rotate `SYNC_SALT` and `ENCRYPTION_KEY` only with a migration plan — rotation invalidates every existing key-hash and every encrypted save. A practical approach is to dual-key-decrypt during a transition window and re-encrypt on next sync.
- Move all three out of `[vars]` and into Cloudflare Worker Secrets (`wrangler secret put`). Keep `wrangler.toml` checked in but stripped of any value.
- Add a pre-commit guard (gitleaks/trufflehog) so this regresses loudly.
- Purge the git history with `git filter-repo` if the repo is or has ever been public. Otherwise, accept the leak in history and rotate.

**References**: CWE-798 (Use of Hard-coded Credentials), OWASP A02:2021 (Cryptographic Failures), OWASP A07:2021 (Identification & Authentication Failures).

---

### 2. CRITICAL — `ENCRYPTION_KEY` is a placeholder, not a real key
**Category**: crypto
**File**: `cloudflare/wrangler.toml:10`

The committed key is `0123456789abcdef` repeated four times. This is the exact pattern the surrounding comment uses as an *example* ("Generate a random one with: node -e ..."). High probability this was never replaced before deploy. Even if it was overridden via `wrangler secret put` at deploy time, the *committed* value documents a likely production default and is identical to what an attacker would try first.

**Exploitability**: if the deployed worker still uses this literal (verify with `wrangler tail` or by hashing a known plaintext), attackers can decrypt the entire sync DB with zero effort.

**Mitigation**: verify what is actually live, rotate to a CSPRNG-generated 32-byte key, and never commit example keys that look like real ones. Use a clearly-marked placeholder like `"REPLACE_ME_BEFORE_DEPLOY"` plus a deploy-time check that aborts if the env value matches.

**References**: CWE-1394 (Use of Default Cryptographic Key).

---

### 3. CRITICAL — Forgot-PIN flow is an account-takeover oracle
**Category**: auth
**File**: `cloudflare/src/index.js:1926-2037` (`handleSyncForgotPin`)

The flow:
1. Caller submits `{ username, mmyy, newPin }` — no proof of identity beyond the *public* `username` (5–10 char) and `mmyy` (a 4-digit birthday MMYY).
2. Server looks up the account by `(username, mmyy)` in `sync_lookup` *or*, failing that, decrypts up to 500 sync_states rows and matches `playerName + playerMmyy` (line 1966-1985).
3. Server rotates the key-hash to the new PIN, clears device_ids (`'[]'`), and writes `parsed.syncPin = newPin` *inside the AES-GCM blob* (line 2016).
4. New owner gets `ok: true` and can immediately call `/sync/load` with `(username, mmyy, newPin)`.

**Exploit scenario**:
- An attacker who knows a target's player name (visible on dashboards, leaderboards, recent feeds) and guesses the 4-digit MMYY (only 12 × 100 = 1200 plausible birth-month/year combinations; far fewer if you know the target's age range) takes over the account. Rate limit is 3/min/IP — trivially bypassed via residential proxies. Estimated time to take over a known target: minutes.
- Worse: failure attempt fallback (line 1966) decrypts up to **500** rows per request when `sync_lookup` misses, which (a) is a DoS amplifier and (b) means a single attacker request triggers 500 AES-GCM decryptions per try. The decrypted values are scanned in plaintext memory.

**Why this is critical separately from finding 6**: even without DB access, an attacker can take over accounts purely via the public HTTPS endpoint. `mmyy` is not a secret — it is exactly someone's birth month/year, which is widely known or easily guessable for any target with a real-world identity (e.g., a streamer whose game name is on a dashboard).

**Mitigation (prose)**:
- Forgot-PIN must require a second factor that is actually private. Realistic options for an anonymous game: a one-time recovery code generated and shown to the user during onboarding (single string), or a magic-link sent to an optional email collected at sync setup.
- Until that lands, gate `forgot-pin` behind a much stricter rate limit (e.g. 3/day/IP *and* 3/day/username), invalidate active sync_states immediately on PIN reset (force the legitimate device to re-auth and notice the takeover), and surface a clear "PIN was reset on <date> from <country>" warning on next /sync/load.
- Remove the 500-row decryption fallback; it scales as O(n) for every forgot-PIN request and is a DoS vector. If migration is needed, do it offline once.

**References**: OWASP A07:2021 (Identification & Auth Failures), CWE-640 (Weak Password Recovery Mechanism for Forgotten Password).

---

### 4. HIGH — Non-constant-time secret comparisons
**Category**: crypto / auth
**Files**:
- `cloudflare/src/index.js:219` — `password !== env.DASHBOARD_KEY`
- `cloudflare/src/index.js:204` — `expected === sig` (auth cookie signature)
- `cloudflare/src/index.js:341` — `expectedSig !== sig` (event HMAC)

JavaScript `===`/`!==` on strings short-circuits at the first mismatched character. Across the network these timing differences are usually drowned in jitter, but Cloudflare Workers run on shared isolates with high-resolution timers; combined with millions of probes, leakage is non-zero.

**Exploitability**: low-to-medium. The dashboard key is short (`qwepoi123098`) and stable, so even a coarse oracle could narrow it. The HMAC signature is 64 hex chars (256 bits) — practically resistant to timing attacks even with `===` because of the search space, but adopting constant-time compare is defense-in-depth.

**Mitigation**: use a constant-time compare (length check + XOR all bytes, OR-accumulate, return zero only if accumulator is zero). Apply to all three sites.

**References**: CWE-208 (Observable Timing Discrepancy).

---

### 5. HIGH — PIN "hashing" has no per-user salt and no work factor
**Category**: crypto
**File**: `cloudflare/src/index.js:106-111` (`hashSyncKey`)

```
HMAC-SHA256(SYNC_SALT, username.toUpperCase() + '|' + mmyy + '|' + pin)
```

- Single HMAC pass (microseconds — designed for speed, not key derivation).
- Salt is a single global constant, not per-user.
- PIN space is 10^6 (6 digits). With a single global salt and a fast HMAC, an offline attacker with the DB can crack every PIN in the table in a handful of seconds on commodity GPU. The whole table — not one user at a time.

**Exploit scenario**: combine with finding 1 (salt is in git) or any other path to DB access (D1 export, Cloudflare account compromise, backup leak). All PINs fall together.

**Mitigation**:
- Use a slow KDF: Argon2id, scrypt, or at minimum PBKDF2 with ≥600k iterations. Workers runtime supports PBKDF2 via `crypto.subtle.deriveBits`.
- Use a per-account random salt stored alongside the row. The username+mmyy can still be the lookup key, but the KDF input is `(pin, perAccountSalt)`.
- 6-digit PINs are inherently weak — at minimum allow alphanumeric / longer PINs at the client. If you must keep 6 digits, hardware-back the rate limiting and accept the residual risk explicitly.

**References**: CWE-916 (Use of Password Hash With Insufficient Computational Effort), OWASP A02:2021.

---

### 6. HIGH — `sync_lookup` table maps plaintext username+mmyy → key_hash
**Category**: data / auth
**File**: `cloudflare/src/index.js:1737-1740, 1815-1820, 1954-1955`

The lookup table is created on the fly with schema `(username TEXT, mmyy TEXT, key_hash TEXT PRIMARY KEY)`. Both username and `mmyy` are stored plaintext. The whole reason this exists is to power finding 3's forgot-PIN flow, but it also:
- Lets anyone with DB read enumerate every account: usernames, approximate birthdays, and key_hashes (which they can then crack offline given the global salt is in git).
- Survives PIN changes (rows are migrated to the new key_hash).
- `playerMmyy` is also duplicated in the encrypted blob (`parsed.playerMmyy` at line 1972) — defeating the encryption.

**Mitigation**: do not store username/mmyy in plaintext. If you must support lookup, store a hash of `(username, mmyy)` with the same KDF as the PIN hash. Better: drop the forgot-PIN flow entirely (see finding 3) and remove the table.

**References**: CWE-200 (Exposure of Sensitive Information), CWE-256 (Plaintext Storage of a Password / Credentials).

---

### 7. HIGH — String-interpolated IN-list in geo query
**Category**: injection (SQL)
**File**: `cloudflare/src/index.js:2661`

```
'... WHERE ... JSON_EXTRACT(data,'$._cc') IN (' + top5.map(() => '?').join(',') + ') ...'
```

The `?` placeholders are interpolated by JS into the SQL string, then bound separately. Today this is safe because `top5` comes from a prior query (`countries.slice(0,5).map(c => c.cc)`) so the count is controlled. However the *pattern* — concatenating SQL fragments based on data — is brittle. The exact same idiom appears in `handleStatsRetention` (line 2482), where the count is bounded to ≤900 but is again data-derived.

A similar template literal exists in many `env.DB.prepare(\`... ${var} ...\`)` calls (none of them substitute user input today, but the pattern invites regression).

**Exploit today**: not directly exploitable; all interpolated values are server-derived counts of `?` characters, not user input.
**Future risk**: medium — the next change that interpolates a user-controllable identifier breaks the type system silently.

**Mitigation**: build a small helper `inList(n)` that returns `'?,?,?…'` for arity n; lint to forbid raw template literals containing both `${` and any string starting with `SELECT|INSERT|UPDATE|DELETE`. Never interpolate untrusted strings into prepared statement text.

**References**: CWE-89, OWASP A03:2021 (Injection).

---

### 8. HIGH — In-memory rate limiting is per-isolate; ineffective in production
**Category**: rate-limit
**File**: `cloudflare/src/index.js:113-155, 1049, 1474, 1758, 1889, 1945`

`const _rateLimit = new Map()` lives in worker isolate memory. Cloudflare Workers spawn many isolates worldwide and per request; an attacker rotating connections (or just being far enough from a previous request to land on a new isolate) gets a fresh counter. Cache lifetime is also indeterminate — isolates evict.

**Exploit scenario**: 600/5min per IP and 5 saves/min per IP are easy to bypass by spreading load. The `SYNC_LOCKOUT_THRESHOLD = 10` is enforced via D1 (durable), so brute-force PIN guessing is partially protected — but ingest, feedback, forgot-pin, and load endpoints are not.

**Mitigation**: use Cloudflare's built-in Rate Limiting binding (`unsafe.bindings = [{ name = "RL", type = "ratelimit", ... }]`) or a Durable Object counter keyed by IP/account. Don't trust in-memory state in serverless.

**References**: OWASP A04:2021 (Insecure Design), CWE-799 (Improper Control of Interaction Frequency).

---

### 9. HIGH — Race condition in sync_save balance check (double-spend)
**Category**: idempotency / business logic
**File**: `cloudflare/src/index.js:1671-1701`

The flow:
1. Compute `totalSilverEarned`, `totalGoldEarned`, `totalSilverSpent`, `totalGoldSpent` from current state.
2. For each pending purchase, subtract and approve.
3. Append all approved to `purchaseLog`, then write back.

Two concurrent calls (legitimate device + attacker tab) both read state at step 1 and both approve the same purchase before either writes. The "deduplicate by id + ts" check (line 1677) catches identical purchase IDs, but doesn't catch two different purchases that would each succeed alone but not together.

Also: the balance recomputation runs *inside the for-loop* (line 1683) and recomputes totals from `mergedData.stats` (server-merged) but `purchaseLog` is appended to mid-loop — so within a single request the second purchase sees the first one's debit. Across requests, no locking exists.

**Exploit scenario**: open game on two devices, queue purchases on each just below the balance, sync both rapidly. Both will pass the balance check independently; net result: spent more than earned.

**Mitigation**: D1 transactions (begin/commit) around the whole sync_save; or use optimistic concurrency by comparing `updated_at` between read and write and rejecting if changed. Move balance authority server-side instead of reconstructing from a client-supplied `data` blob.

**References**: CWE-362 (Race Condition), OWASP A04:2021 (Insecure Design).

---

### 10. MEDIUM — Auth cookie lacks a stable session identifier; cannot be revoked
**Category**: auth
**File**: `cloudflare/src/index.js:190-205`

```
sig = HMAC(DASHBOARD_KEY, String(expiresAt))
cookie = `${expiresAt}.${sig}`
```

There is no nonce, session id, or rotating jti. Effects:
- Any two logins minted within the same millisecond would produce the same cookie (collisions unlikely in practice but unprincipled).
- Logout is not possible without rotating `DASHBOARD_KEY`. Compromise → 7-day window before natural expiry.
- The cookie is bound only to the dashboard key, not to any role or scope — but there is only one admin so this is currently degenerate.

**Mitigation**: include a random session id in the cookie and store the issued sessions in a small KV/D1 table with revocation flag. Reduce TTL to ~24h with refresh-on-use.

**References**: CWE-613 (Insufficient Session Expiration).

---

### 11. MEDIUM — Sync save accepts arbitrary `data` object with no schema
**Category**: input-validation
**File**: `cloudflare/src/index.js:1464-1746`

`data` is `typeof data !== 'object'` is the only check. It is then deep-cloned, merged, and stored. There are no per-field caps, no length limits on arrays (`unlocked`, `ownedSkills`, `ownedCosmetics`, `frozenDays`, `hintsSeen`), no maximum on object depth, and no allowlist of top-level keys.

`MAX_BODY = 50 * 1024` caps total request size at 50KB which mitigates the worst case, but a 50KB attacker payload of nested objects can still cause O(n^2) merges, balloon stored ciphertext, and bloat the encrypted blob until decryption gets expensive on every load.

**Mitigation**: define and validate an explicit schema (zod-like or hand-rolled) for `data`. Reject unknown top-level keys. Cap array lengths (e.g. `unlocked.length ≤ 50`). Sanitize numeric fields to non-negative integers within sensible ranges (silver ≤ 10^9, scores per level ≤ 10^7, etc.) to defeat overflow tricks in finding 9.

**References**: CWE-20 (Improper Input Validation).

---

### 12. MEDIUM — Sync endpoints do not validate username/mmyy/pin format
**Category**: input-validation
**File**: `cloudflare/src/index.js:1468, 1752, 1838, 1883`

Only `/sync/forgot-pin` enforces `username 5-10 chars`, `mmyy 4 digits`, `newPin 6 digits` (lines 1933-1941). `/sync/save`, `/sync/load`, `/sync/check`, `/sync/change-pin` accept whatever the client sends — empty-but-truthy strings, JSON objects coerced to `[object Object]`, etc. Most of these flow through `hashSyncKey` (which `String()`-coerces), so they end up hashing weird values rather than rejecting them.

**Exploit**: not directly RCE-class, but it enables strange edge cases (object identity confusion at the JS layer, downstream `.toUpperCase()` calls on non-strings throwing 500s, weird key_hash collisions) and makes legitimate authentication brittle.

**Mitigation**: centralize a `validateSyncCreds({username, mmyy, pin})` helper and call it at the top of every sync handler.

**References**: CWE-20.

---

### 13. MEDIUM — Permissive CORS on public endpoints
**Category**: CORS
**File**: `cloudflare/src/index.js:41-47`

`Access-Control-Allow-Origin: *` is sent on `/session`, `/event`, `/events/batch`, `/feedback`, `/sync/*`. The endpoints don't accept credentials (no `Access-Control-Allow-Credentials: true`), so the wildcard is not catastrophic, but:
- Any site can call these from a browser context, including malicious pages that frame the user's game.
- No `Vary: Origin` header, so any CDN/caching layer in front might cache cross-origin responses incorrectly.
- A typo away from adding credentials makes this critical.

**Mitigation**: restrict the origin allowlist to the static game's domain(s). For ingest endpoints where you genuinely want CORS-anywhere (e.g. mirrored downloads), keep `*` but never enable credentials and add `Vary: Origin`.

**References**: OWASP A05:2021 (Security Misconfiguration).

---

### 14. MEDIUM — PII logged to console on sync check
**Category**: PII / logging
**File**: `cloudflare/src/index.js:1846`

```
console.log('[SYNC CHECK] Not found for username:', String(username).toUpperCase(), 'mmyy:', mmyy);
```

Cloudflare worker logs (visible via `wrangler tail`, retained for Logpush sinks) now contain the username and birthday (MMYY) of every failed sync_check. Anyone with log access can enumerate. Combined with finding 3, those logs are a takeover seed list.

**Mitigation**: drop the log, or log only a length / hash prefix. Never log the username + birthday tuple together.

**References**: CWE-532 (Insertion of Sensitive Information into Log File).

---

### 15. MEDIUM — Secrets in `[vars]` instead of Cloudflare Secrets
**Category**: config
**File**: `cloudflare/wrangler.toml:5-10`

Even after rotation, `[vars]` values are visible in plaintext in the Cloudflare dashboard to anyone with worker read access (typically every member of the Cloudflare account). They also persist in deployed worker metadata. `wrangler secret put` writes to a separate secret store that is not visible after creation.

**Mitigation**: move all three to secrets. Document that `wrangler.toml` must not gain new `[vars]` entries that look like secrets.

**References**: OWASP A02:2021.

---

### 16. MEDIUM — playerName and playerMmyy stored both encrypted and plaintext
**Category**: crypto / data
**Files**: `cloudflare/src/index.js:1731-1741, 1972`

The sync_states blob stores `playerName`, `playerMmyy`, and `syncPin` inside the AES-GCM ciphertext (good). But:
- `sync_lookup` table stores `username` and `mmyy` plaintext (see finding 6).
- `events` table can include `name` (uppercase 10-char) for any player in plaintext, joined to PIDs.

So the encryption protects `syncPin` and game progress but not identity. Defenders likely think the data is "encrypted at rest" — partial truth only.

**Mitigation**: document what is and isn't encrypted. Stop duplicating identity fields into `sync_lookup` (see finding 6).

**References**: CWE-200, CWE-311 (Missing Encryption of Sensitive Data).

---

### 17. MEDIUM — DoS surface via per-PID iteration loops
**Category**: DoS
**Files**:
- `handleStatsRetention` (slow path) — `cloudflare/src/index.js:2417-2511`
- `handleStatsFunnel` — `cloudflare/src/index.js:2562-2570` (per-pid query in loop)
- `handleStatsChampionFunnel` — `cloudflare/src/index.js:2746-2787` (multiple loops, three queries per pid)
- `handleSyncForgotPin` fallback — `cloudflare/src/index.js:1966-1985` (up to 500 AES-GCM decryptions per call)

Each authenticated dashboard request can fan out into hundreds or thousands of D1 queries (D1 has hard per-request limits; once those are hit the dashboard 500s). The cron's `computeRetention` does the same fan-out (line 2349-2360) and runs hourly.

The forgot-pin fallback is the worst because it is *unauthenticated* and triggers 500 decryptions per request, rate-limited only to 3/min/IP.

**Exploit scenario**:
- Authenticated dashboard insider can wedge D1 with a single force-refresh of /stats/retention?range=all.
- Unauthenticated attacker can pin one CPU per request via /sync/forgot-pin with junk creds (each call decrypts 500 records) — and the 3/min/IP limit is in-memory (finding 8), so multi-IP fan-out works.

**Mitigation**: convert N+1 loops to single grouped SQL queries; cap dashboard endpoint result sizes; remove the 500-row fallback decryption from forgot-pin. Set a hard maximum on retention cohort size and degrade gracefully.

**References**: OWASP A05/A04, CWE-400 (Uncontrolled Resource Consumption).

---

### 18. MEDIUM — `/sync/check` has no rate limit; account enumeration oracle
**Category**: rate-limit
**File**: `cloudflare/src/index.js:1834-1877`

Returns `{ found: true, summary: {...} }` vs `{ found: false }` based on whether `(username, mmyy, pin)` exists, with no rate limit and no lockout integration. Combined with the 10^6 PIN space, this is a slow but viable brute-force oracle for a known username+mmyy target — and finding 14 confirms the negative answer is also logged.

**Mitigation**: apply the same lockout+rate limit as /sync/load, and don't return decrypted summary fields. The current summary leak includes `playerName, silver, gold, levelsCleared, totalLevels, deviceCount, updatedAt` — all reachable without device registration.

**References**: CWE-307 (Improper Restriction of Excessive Authentication Attempts).

---

### 19. LOW — Admin endpoints lack CSRF protection
**Category**: auth
**File**: `cloudflare/src/index.js:3125-3145`

`/admin/flag-player`, `/admin/ban-pid`, `/admin/sync/reset-pin`, `/admin/aggregate`, etc. accept POSTs with cookie-only authentication. The auth cookie is `SameSite=Strict; HttpOnly; Secure` (line 228) — `Strict` mitigates classic CSRF in modern browsers, so the residual risk is low (older browsers, certain link-prefetch behaviors, subdomain hijacks). Add a CSRF token or `Origin`/`Referer` allowlist for defense in depth.

**References**: CWE-352 (CSRF), OWASP A01:2021 (Broken Access Control).

---

### 20. LOW — Dependency hygiene
**Category**: dependency

`package.json`:
- `preact ^10` — broad. Pin and audit.
- `htm ^3` — broad. Last unmaintained for some time; check for current advisories.
- `@preact/signals ^1` — broad.
- `uplot ^1` — broad.
- `esbuild ^0.20` — older line. Multiple advisories exist for older esbuild versions (e.g., dev server SSRF in `<= 0.24.x`). Even though esbuild is build-time only, a compromised build can inject XSS into the dashboard bundle, which then runs in an authenticated context.
- `wrangler ^4.90.1` — current line, fine.
- `@playwright/test ^1.60.0` — dev only.

No network access in this audit to query CVE feeds. Action: run `npm audit` and `npm outdated` in `cloudflare/`. Pin versions tighter than `^` for build-time tooling.

**References**: OWASP A06:2021 (Vulnerable and Outdated Components).

---

## What I did NOT find (false-positive guard)

- **SQL injection via user input**: all `env.DB.prepare(...).bind(...)` calls use proper parameterization. The few template literals with `${var}` only interpolate server-generated values (counts, range constants, date strings derived from `Date`).
- **JSON parse bombs without limit**: `readJsonBody` enforces `MAX_BODY = 50KB` *before* `JSON.parse`. Good.
- **IV reuse in AES-GCM**: `aesEncrypt` calls `crypto.getRandomValues(new Uint8Array(12))` per encryption — correct random IV per ciphertext, prepended to output. No reuse.
- **HMAC anti-cheat bypass**: server-side delta check (line 349-372) rejects level_complete events with claimed time outside `[5s, real_elapsed + 30s]`. Reasonable.
- **PID format**: `PID_REGEX = /^p_[a-z0-9]{6,30}$/` is consistently checked.
- **`dashboardBundle` injection escape**: line 3152 explicitly escapes `</script` before inlining — good.

---

## Recommended remediation order

1. **Today**: Rotate `DASHBOARD_KEY`. Move all three secrets out of `wrangler.toml` into `wrangler secret put`. Strip the file. (Findings 1, 2, 15.)
2. **This week**: Remove `/sync/forgot-pin` or gate behind an out-of-band factor (recovery code). Remove the 500-row fallback decryption. Add the missing rate limit to `/sync/check`. Stop logging the username+mmyy. (Findings 3, 14, 17, 18.)
3. **This month**: Replace the in-memory rate limiter with Cloudflare's RL binding or a Durable Object. Migrate PIN hashing to PBKDF2/Argon2 with per-account salt (requires a one-time re-hash on next login). Wrap `/sync/save` in a D1 transaction to close the double-spend race. (Findings 5, 8, 9.)
4. **When you can plan the migration**: rotate `SYNC_SALT` and `ENCRYPTION_KEY` with a dual-decrypt window. Until rotated, treat the encrypted sync data as readable-by-anyone-with-git-access. (Finding 1 long tail.)
