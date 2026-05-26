// N30N DASH J Metrics Worker
// Cloudflare Worker + D1 for anonymous game metrics with HMAC anti-cheat

import dashboardHtml from './dashboard.html';
import dashboardBundle from './dashboard.bundle.js';

const ALLOWED_TYPES = new Set([
  'session_start', 'heartbeat', 'level_start',
  'level_complete', 'level_death', 'purchase', 'ui_event', 'name_set'
]);
const PID_REGEX = /^p_[a-z0-9]{6,30}$/;
const NAME_REGEX = /^[A-Z0-9]{1,10}$/;
const MAX_BODY = 50 * 1024;            // 50 KB
const MAX_BATCH = 500;
const TOKEN_TTL_MS = 60 * 60 * 1000;   // 1 hour
const CLIENT_CLOCK_TOLERANCE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_CLOCK_TOLERANCE_MS = 5 * 60 * 1000;          // 5 minutes
const ONLINE_WINDOW_MS = 5 * 60 * 1000;                    // 5 minutes
const COMPLETE_DELTA_MIN_MS = -1000;   // claimed time can't exceed real elapsed by > 1s
const COMPLETE_DELTA_MAX_MS = 30000;   // allow up to 30s pause/lag

// === Rate limiting ===
const RATE_LIMIT_IP_WINDOW_MS = 5 * 60 * 1000;   // 5 minutes
const RATE_LIMIT_IP_MAX = 600;                   // 600 req per 5 min per IP
const RATE_LIMIT_PID_WINDOW_MS = 5 * 60 * 1000;  // 5 minutes
const RATE_LIMIT_PID_MAX = 300;                  // 300 req per 5 min per pid
const RATE_LIMIT_SESSION_IP_MAX = 10;            // 10 session creates per 5 min per IP

// === Sync constants ===
const SYNC_RATE_LIMIT_SAVE_WINDOW_MS = 60 * 1000;   // 1 minute
const SYNC_RATE_LIMIT_SAVE_MAX = 5;                 // 5 saves per min per IP
const SYNC_RATE_LIMIT_LOAD_WINDOW_MS = 60 * 1000;   // 1 minute
const SYNC_RATE_LIMIT_LOAD_MAX = 10;                // 10 loads per min per IP
const SYNC_LOCKOUT_THRESHOLD = 10;                  // 10 fails = lockout
const SYNC_LOCKOUT_DURATION_MS = 60 * 60 * 1000;    // 1 hour lockout
const SYNC_MAX_DEVICES = 3;
const SYNC_HISTORY_MAX = 5;

// === Helpers ===

function publicCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

function jsonResponse(body, status = 200, usePublicCors = false) {
  const headers = { 'Content-Type': 'application/json', ...securityHeaders() };
  if (usePublicCors) Object.assign(headers, publicCorsHeaders());
  return new Response(JSON.stringify(body), { status, headers });
}

function errResponse(error, status = 400, usePublicCors = false) {
  return jsonResponse({ ok: false, error }, status, usePublicCors);
}

function sanitizeName(name) {
  if (!name || typeof name !== 'string') return null;
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  return cleaned || null;
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function aesEncrypt(plainText, keyHex) {
  const key = await crypto.subtle.importKey('raw', hexToBytes(keyHex), { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plainText));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return bytesToHex(combined);
}

async function aesDecrypt(cipherHex, keyHex) {
  try {
    const key = await crypto.subtle.importKey('raw', hexToBytes(keyHex), { name: 'AES-GCM' }, false, ['decrypt']);
    const combined = hexToBytes(cipherHex);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return null;
  }
}

async function hashSyncKey(username, mmyy, pin, salt) {
  const msg = `${String(username || '').toUpperCase()}|${String(mmyy || '')}|${String(pin || '')}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// === Rate limiting (in-memory per-isolate) ===
const _rateLimit = new Map();

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}

function isRateLimited(key, windowMs, maxRequests) {
  const now = Date.now();
  const timestamps = _rateLimit.get(key) || [];
  const valid = timestamps.filter(t => now - t < windowMs);
  if (valid.length >= maxRequests) {
    _rateLimit.set(key, valid);
    return true;
  }
  valid.push(now);
  _rateLimit.set(key, valid);
  if (_rateLimit.size > 5000) {
    const oldest = Array.from(_rateLimit.entries()).sort((a, b) => {
      const aMin = a[1].length ? a[1][0] : now;
      const bMin = b[1].length ? b[1][0] : now;
      return aMin - bMin;
    })[0];
    if (oldest) _rateLimit.delete(oldest[0]);
  }
  return false;
}

function rateLimitCheck(request, pid, isSession = false) {
  const ip = getClientIp(request);
  const ipKey = `ip:${ip}`;
  const ipMax = isSession ? RATE_LIMIT_SESSION_IP_MAX : RATE_LIMIT_IP_MAX;
  if (isRateLimited(ipKey, RATE_LIMIT_IP_WINDOW_MS, ipMax)) {
    return { limited: true, retryAfter: Math.ceil(RATE_LIMIT_IP_WINDOW_MS / 1000) };
  }
  if (pid) {
    const pidKey = `pid:${pid}`;
    if (isRateLimited(pidKey, RATE_LIMIT_PID_WINDOW_MS, RATE_LIMIT_PID_MAX)) {
      return { limited: true, retryAfter: Math.ceil(RATE_LIMIT_PID_WINDOW_MS / 1000) };
    }
  }
  return { limited: false };
}

async function hmacSHA256(key, message) {
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateToken() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
}

// === Dashboard auth (server-side cookie gate) ===
const AUTH_COOKIE = 'ndj_dash';
const AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function parseCookies(request) {
  const header = request.headers.get('cookie') || '';
  const out = {};
  header.split(/;\s*/).forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i)] = p.slice(i + 1);
  });
  return out;
}

async function makeAuthCookie(secret) {
  const expiresAt = Date.now() + AUTH_TTL_MS;
  const sig = await hmacSHA256(secret, String(expiresAt));
  return `${expiresAt}.${sig}`;
}

async function verifyAuthCookie(value, secret) {
  if (!value) return false;
  const dot = value.indexOf('.');
  if (dot < 0) return false;
  const expiresAt = parseInt(value.slice(0, dot), 10);
  const sig = value.slice(dot + 1);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = await hmacSHA256(secret, String(expiresAt));
  return expected === sig;
}

async function isAuthed(request, env) {
  const key = env.DASHBOARD_KEY;
  if (!key) return false; // fail-closed: no key = no access
  const cookies = parseCookies(request);
  return await verifyAuthCookie(cookies[AUTH_COOKIE], key);
}

const LOGIN_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>N3ON DashJ Metrics — Locked</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',monospace;background:linear-gradient(180deg,#020208,#0a0a1a 50%,#1a0a2a);color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}h1{font-size:1.4rem;font-weight:900;letter-spacing:3px;background:linear-gradient(90deg,#0ff,#08f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 8px rgba(0,255,255,.3);margin-bottom:8px}.sub{font-size:.55rem;letter-spacing:5px;color:#888;margin-left:8px;-webkit-text-fill-color:#888}.hint{font-size:.7rem;color:#888;font-family:monospace;margin-bottom:24px;letter-spacing:1px}#pw{width:280px;padding:12px 16px;font-size:1rem;font-family:monospace;text-align:center;background:#111;color:#0ff;border:2px solid #0ff;border-radius:8px;letter-spacing:4px;outline:none}#err{color:#f44;font-family:monospace;font-size:.7rem;margin-top:8px;height:14px}#go{margin-top:14px;padding:10px 30px;background:linear-gradient(135deg,#0ff,#08f);color:#000;font-weight:900;border:none;border-radius:8px;cursor:pointer;font-family:inherit;letter-spacing:2px;font-size:.8rem}</style></head><body><h1>★ N3ON DashJ <span class="sub">METRICS ACCESS</span></h1><div class="hint">Enter keyword to view dashboard</div><input id="pw" type="password" autocomplete="off" placeholder="••••••••••" /><div id="err"></div><button id="go">UNLOCK</button><script>(function(){var pw=document.getElementById('pw'),err=document.getElementById('err');function go(){var v=pw.value;if(!v)return;fetch('/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:v})}).then(function(r){if(r.ok){location.href='/dashboard';}else{err.textContent='Incorrect keyword';pw.value='';pw.focus();setTimeout(function(){err.textContent='';},2000);}}).catch(function(){err.textContent='Network error';});}document.getElementById('go').addEventListener('click',go);pw.addEventListener('keydown',function(e){if(e.key==='Enter')go();});pw.focus();})();</script></body></html>`;

async function handleAuth(request, env) {
  const body = await readJsonBody(request);
  const { password } = body || {};
  if (!password || password !== env.DASHBOARD_KEY) {
    return errResponse('invalid keyword', 401);
  }
  const cookieVal = await makeAuthCookie(env.DASHBOARD_KEY);
  const maxAge = Math.floor(AUTH_TTL_MS / 1000);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${AUTH_COOKIE}=${cookieVal}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`,
      ...securityHeaders(),
    },
  });
}

async function readJsonBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error('body too large');
  if (!text) throw new Error('empty body');
  return JSON.parse(text);
}

// === Range helper: ?range=1d|2d|3d|7d|14d|31d|all ===
// Optional `before` param shifts the window: returns (before - duration) instead of (now - duration).
// This enables "previous period" comparison queries without a new endpoint.
function rangeStartTs(range, before) {
  const anchor = before || Date.now();
  const map = { '1d': 86400000, '2d': 2*86400000, '3d': 3*86400000, '7d': 7*86400000, '14d': 14*86400000, '31d': 31*86400000 };
  if (range === 'all') return 0;
  return anchor - (map[range] || map['2d']);
}

// === In-memory cache wrapper (per-isolate, ~5min TTL) ===
const _cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
async function cachedJson(key, freshFn, force) {
  const now = Date.now();
  if (!force) {
    const hit = _cache.get(key);
    if (hit && now - hit.at < CACHE_TTL_MS) return hit.body;
  }
  const body = await freshFn();
  _cache.set(key, { at: now, body });
  // Trim cache if too large
  if (_cache.size > 200) {
    const oldest = Array.from(_cache.entries()).sort((a,b) => a[1].at - b[1].at)[0];
    if (oldest) _cache.delete(oldest[0]);
  }
  return body;
}

// === Routes ===

async function handleSession(request, env) {
  const body = await readJsonBody(request);
  const { pid, ts } = body;
  if (!pid || !PID_REGEX.test(pid)) return errResponse('invalid pid', 400, true);
  if (typeof ts !== 'number') return errResponse('invalid ts', 400, true);

  const rl = rateLimitCheck(request, pid, true);
  if (rl.limited) {
    return new Response(JSON.stringify({ ok: false, error: 'rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter), ...publicCorsHeaders() },
    });
  }

  const serverTs = Date.now();
  if (Math.abs(serverTs - ts) > SESSION_CLOCK_TOLERANCE_MS) {
    return errResponse('clock skew too large', 400, true);
  }

  const token = generateToken();
  const expiresAt = serverTs + TOKEN_TTL_MS;

  await env.DB.prepare(
    'INSERT INTO sessions (token, pid, created_ts, expires_ts) VALUES (?, ?, ?, ?)'
  ).bind(token, pid, serverTs, expiresAt).run();

  return jsonResponse({ ok: true, token, expiresAt, serverTs }, 200, true);
}

// === Banned PID cache (per-isolate, 60s TTL) ===
let _bannedPids = null;
let _bannedPidsAt = 0;
const BANNED_CACHE_TTL_MS = 60 * 1000;

async function getBannedPids(env) {
  const now = Date.now();
  if (_bannedPids && now - _bannedPidsAt < BANNED_CACHE_TTL_MS) return _bannedPids;
  const rows = await env.DB.prepare("SELECT pid FROM player_flags WHERE flag_type = 'banned'").all();
  _bannedPids = new Set((rows && rows.results || []).map(r => r.pid));
  _bannedPidsAt = now;
  return _bannedPids;
}

async function validateAndInsertEvent(env, e, isOffline, request) {
  if (!e || typeof e !== 'object') return;
  const { pid, name, type, data, ts, token, sig } = e;

  if (!pid || !PID_REGEX.test(pid)) return;
  if (!ALLOWED_TYPES.has(type)) return;
  if (typeof ts !== 'number') return;

  const serverTs = Date.now();
  if (Math.abs(serverTs - ts) > CLIENT_CLOCK_TOLERANCE_MS) return;

  let verified = 1;

  // HMAC validation
  if (token && sig) {
    const session = await env.DB.prepare(
      'SELECT pid, expires_ts FROM sessions WHERE token = ?'
    ).bind(token).first();

    if (!session || session.pid !== pid || session.expires_ts < serverTs) {
      verified = 0;
    } else {
      const expectedSig = await hmacSHA256(token, JSON.stringify(data || {}) + ts);
      if (expectedSig !== sig) verified = 0;
    }
  } else {
    // No HMAC = unverified but still recorded for stats
    verified = 0;
  }

  // Server-side delta check for level_complete (online only)
  if (verified === 1 && type === 'level_complete' && data && data.level != null && typeof data.time === 'number' && !isOffline) {
    const claimedTime = data.time;
    const start = await env.DB.prepare(
      "SELECT server_ts FROM events WHERE pid = ? AND type = 'level_start' AND level = ? ORDER BY server_ts DESC LIMIT 1"
    ).bind(pid, data.level).first();

    if (start) {
      const delta = serverTs - start.server_ts;
      // Sanity floor: no level can be cleared faster than 5s in reality
      if (claimedTime < 5000) verified = 0;
      // Required: real wall-clock elapsed (delta) and claimed run-time should be close
      else if (delta < claimedTime + COMPLETE_DELTA_MIN_MS || delta > claimedTime + COMPLETE_DELTA_MAX_MS) {
        verified = 0;
      }
    } else {
      // No matching level_start — suspicious but not fatal
      verified = 0;
    }
  }

  // Offline batch level_complete: skip server-delta (impossible without live records)
  if (isOffline && type === 'level_complete') {
    verified = 0;
  }

  const level = (data && typeof data.level === 'number') ? data.level : null;

  // Augment data with Cloudflare-provided geo info (no IP stored — only country/region)
  const augmented = Object.assign({}, data || {});
  if (request && request.cf) {
    if (request.cf.country) augmented._cc = request.cf.country;
    if (request.cf.region) augmented._region = request.cf.region;
    if (request.cf.city) augmented._city = request.cf.city;
    if (request.cf.timezone) augmented._tz = request.cf.timezone;
  }

  // Check if PID is banned — force unverified
  const bannedSet = await getBannedPids(env);
  if (bannedSet.has(pid)) {
    verified = 0;
    augmented._banned = true;
  }

  await env.DB.prepare(
    'INSERT INTO events (pid, name, type, level, data, client_ts, server_ts, offline, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    pid,
    sanitizeName(name),
    type,
    level,
    JSON.stringify(augmented),
    ts,
    serverTs,
    isOffline ? 1 : 0,
    verified
  ).run();
}

async function handleEvent(request, env) {
  const e = await readJsonBody(request);
  const rl = rateLimitCheck(request, e && e.pid);
  if (rl.limited) {
    return new Response(JSON.stringify({ ok: false, error: 'rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter), ...publicCorsHeaders() },
    });
  }
  await validateAndInsertEvent(env, e, false, request);
  return jsonResponse({ ok: true }, 200, true);
}

async function handleEventsBatch(request, env) {
  const body = await readJsonBody(request);
  const events = body.events || [];
  if (!Array.isArray(events) || events.length === 0) return errResponse('no events', 400, true);
  if (events.length > MAX_BATCH) return errResponse('batch too large', 400, true);

  // Rate limit batch by IP (generous)
  const rl = rateLimitCheck(request, null);
  if (rl.limited) {
    return new Response(JSON.stringify({ ok: false, error: 'rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter), ...publicCorsHeaders() },
    });
  }

  for (const e of events) {
    try {
      await validateAndInsertEvent(env, e, true, request);
    } catch (_) {
      // Skip malformed events
    }
  }
  return jsonResponse({ ok: true }, 200, true);
}

async function handleStats(env, range, force, before) {
  const cacheKey = 'stats:' + range + (before ? ':' + before : '');
  return cachedJson(cacheKey, async () => {
    const now = before || Date.now();
    const fiveMinAgo = now - ONLINE_WINDOW_MS;
    const startTs = rangeStartTs(range, before);
    const HEARTBEAT_MIN = 1.5;

    // Fast path: for 31d/all, try stats_daily first
    if ((range === '31d' || range === 'all') && !before) {
      const dateFrom = range === 'all' ? '2000-01-01' : new Date(startTs).toISOString().slice(0, 10);
      const fastRow = await env.DB.prepare(
        'SELECT SUM(starts) as starts, SUM(completes) as completes, SUM(deaths) as deaths, SUM(sessions) as sessions, SUM(heartbeats) as hb, SUM(gold_earned) as ge, SUM(silver_earned) as se FROM stats_daily WHERE level=99 AND date >= ?'
      ).bind(dateFrom).first();

      if (fastRow && fastRow.starts > 0) {
        // We have aggregated data — use it for the heavy totals, supplement with live queries for real-time fields
        const [onlineRow, activeRow, allPlayersRow, totalRow, verifiedRow] = await Promise.all([
          env.DB.prepare('SELECT COUNT(DISTINCT pid) as o FROM events WHERE server_ts > ?').bind(fiveMinAgo).first(),
          env.DB.prepare('SELECT COUNT(DISTINCT pid) as p FROM events WHERE server_ts > ?').bind(startTs).first(),
          env.DB.prepare('SELECT COUNT(DISTINCT pid) as p FROM events').first(),
          env.DB.prepare('SELECT COUNT(*) as c FROM events').first(),
          env.DB.prepare('SELECT COUNT(*) as v FROM events WHERE verified = 1').first(),
        ]);

        // Daily breakdown from stats_daily
        const dailyRows = await env.DB.prepare(
          'SELECT date, starts + completes + deaths + sessions + heartbeats as c FROM stats_daily WHERE level=99 AND date >= ? ORDER BY date'
        ).bind(dateFrom).all();
        const dayCount = Math.min(31, Math.max(1, Math.ceil((now - startTs) / 86400000)));
        const lastDays = new Array(dayCount).fill(0);
        if (dailyRows && dailyRows.results) {
          const baseDate = new Date(dateFrom).getTime();
          for (const r of dailyRows.results) {
            const idx = Math.floor((new Date(r.date).getTime() - baseDate) / 86400000);
            if (idx >= 0 && idx < dayCount) lastDays[idx] = r.c;
          }
        }

        return {
          ok: true,
          data: {
            range,
            totalEvents: totalRow ? totalRow.c : 0,
            verified: verifiedRow ? verifiedRow.v : 0,
            unverified: (totalRow ? totalRow.c : 0) - (verifiedRow ? verifiedRow.v : 0),
            online: onlineRow ? onlineRow.o : 0,
            activeInRange: activeRow ? activeRow.p : 0,
            totalPlayers: allPlayersRow ? allPlayersRow.p : 0,
            winMatches: fastRow.completes || 0,
            deathMatches: fastRow.deaths || 0,
            totalMinutes: Math.round((fastRow.hb || 0) * HEARTBEAT_MIN),
            last7Days: lastDays,
            generatedAt: now,
            _fastPath: true,
          },
        };
      }
    }

    const [
      totalRow, verifiedRow, onlineRow,
      activeRow, allPlayersRow,
      newPlayersRow, returningRow,
      heartbeatRows, medianHbRows, todayRows, levelRows, deathRows,
      lastDaysRows, avgCompleteRow,
      winRow, deathMatchRow,
      anonRow, namedRow, namedFunnelRow,
    ] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as c FROM events').first(),
      env.DB.prepare('SELECT COUNT(*) as v FROM events WHERE verified = 1').first(),
      env.DB.prepare('SELECT COUNT(DISTINCT pid) as o FROM events WHERE server_ts > ?').bind(fiveMinAgo).first(),
      env.DB.prepare('SELECT COUNT(DISTINCT pid) as p FROM events WHERE server_ts > ?').bind(startTs).first(),
      env.DB.prepare('SELECT COUNT(DISTINCT pid) as p FROM events').first(),
      env.DB.prepare('SELECT COUNT(*) as p FROM (SELECT pid, MIN(server_ts) as fs FROM events GROUP BY pid) WHERE fs > ?').bind(startTs).first(),
      env.DB.prepare('SELECT COUNT(DISTINCT e.pid) as p FROM events e WHERE e.server_ts > ? AND e.pid IN (SELECT pid FROM events GROUP BY pid HAVING MIN(server_ts) <= ?)').bind(startTs, startTs).first(),
      env.DB.prepare(`SELECT CASE WHEN p.fs > ? THEN 'new' ELSE 'ret' END as cohort, COUNT(*) as hb, COUNT(DISTINCT e.pid) as players FROM events e JOIN (SELECT pid, MIN(server_ts) as fs FROM events GROUP BY pid) p ON p.pid = e.pid WHERE e.type = 'heartbeat' AND e.server_ts > ? GROUP BY cohort`).bind(startTs, startTs).all(),
      // Median heartbeats per cohort (more representative than average — pro players are outliers)
      env.DB.prepare(`SELECT cohort, AVG(hb_count) as median_hb FROM (
        SELECT cohort, hb_count,
          ROW_NUMBER() OVER (PARTITION BY cohort ORDER BY hb_count) as rn,
          COUNT(*) OVER (PARTITION BY cohort) as cnt
        FROM (
          SELECT CASE WHEN p.fs > ? THEN 'new' ELSE 'ret' END as cohort, COUNT(*) as hb_count
          FROM events e JOIN (SELECT pid, MIN(server_ts) as fs FROM events GROUP BY pid) p ON p.pid = e.pid
          WHERE e.type='heartbeat' AND e.server_ts > ?
          GROUP BY e.pid
        )
      ) WHERE rn IN ((cnt+1)/2, (cnt+2)/2) GROUP BY cohort`).bind(startTs, startTs).all(),
      env.DB.prepare('SELECT type, COUNT(*) as c FROM events WHERE server_ts > ? GROUP BY type').bind(startTs).all(),
      env.DB.prepare("SELECT level, COUNT(*) as c FROM events WHERE type = 'level_complete' AND server_ts > ? GROUP BY level ORDER BY c DESC LIMIT 20").bind(startTs).all(),
      env.DB.prepare("SELECT level, COUNT(*) as c FROM events WHERE type = 'level_death' AND server_ts > ? GROUP BY level ORDER BY c DESC LIMIT 20").bind(startTs).all(),
      env.DB.prepare("SELECT CAST((server_ts - ?) / 86400000 AS INTEGER) as day, COUNT(*) as c FROM events WHERE server_ts > ? GROUP BY day ORDER BY day").bind(startTs, startTs).all(),
      env.DB.prepare("SELECT level, AVG(CAST(JSON_EXTRACT(data, '$.time') AS REAL)) as avg_ms FROM events WHERE type = 'level_complete' AND verified = 1 AND CAST(JSON_EXTRACT(data,'$.time') AS REAL) >= 5000 AND server_ts > ? GROUP BY level").bind(startTs).all(),
      env.DB.prepare("SELECT COUNT(*) as c FROM events WHERE type='level_complete' AND server_ts > ?").bind(startTs).first(),
      env.DB.prepare("SELECT COUNT(*) as c FROM events WHERE type='level_death' AND server_ts > ?").bind(startTs).first(),
      // Trial / bounced: pids active in range with NO non-null name on any event
      env.DB.prepare("SELECT COUNT(DISTINCT pid) as c FROM events WHERE server_ts > ? AND pid NOT IN (SELECT DISTINCT pid FROM events WHERE name IS NOT NULL)").bind(startTs).first(),
      // Named players in range (for ratio)
      env.DB.prepare("SELECT COUNT(DISTINCT pid) as c FROM events WHERE server_ts > ? AND pid IN (SELECT DISTINCT pid FROM events WHERE name IS NOT NULL)").bind(startTs).first(),
      // name_set events in range (count of users who completed onboarding)
      env.DB.prepare("SELECT COUNT(*) as c FROM events WHERE type='name_set' AND server_ts > ?").bind(startTs).first(),
    ]);

    const today = {};
    if (todayRows && todayRows.results) for (const r of todayRows.results) today[r.type] = r.c;

    const rangeDays = Math.max(1, Math.ceil((now - startTs) / 86400000));
    const dayCount = Math.min(rangeDays, 31);
    const lastDays = new Array(dayCount).fill(0);
    if (lastDaysRows && lastDaysRows.results) {
      for (const r of lastDaysRows.results) {
        const idx = Math.max(0, Math.min(dayCount - 1, r.day));
        lastDays[idx] = r.c;
      }
    }

    const avgByLevel = {};
    if (avgCompleteRow && avgCompleteRow.results) {
      for (const r of avgCompleteRow.results) {
        if (r.level != null && r.avg_ms != null) avgByLevel[r.level] = Math.round(r.avg_ms);
      }
    }

    let newHb = 0, retHb = 0, newPlayersHb = 0, retPlayersHb = 0;
    if (heartbeatRows && heartbeatRows.results) {
      for (const r of heartbeatRows.results) {
        if (r.cohort === 'new') { newHb = r.hb; newPlayersHb = r.players; }
        else if (r.cohort === 'ret') { retHb = r.hb; retPlayersHb = r.players; }
      }
    }
    const totalMinNew = newHb * HEARTBEAT_MIN;
    const totalMinRet = retHb * HEARTBEAT_MIN;

    // Median heartbeat counts per cohort → median minutes
    let medianHbNew = 0, medianHbRet = 0;
    if (medianHbRows && medianHbRows.results) {
      for (const r of medianHbRows.results) {
        if (r.cohort === 'new') medianHbNew = r.median_hb || 0;
        else if (r.cohort === 'ret') medianHbRet = r.median_hb || 0;
      }
    }
    const medianMinNew = medianHbNew * HEARTBEAT_MIN;
    const medianMinRet = medianHbRet * HEARTBEAT_MIN;

    return {
      ok: true,
      data: {
        range,
        totalEvents: totalRow ? totalRow.c : 0,
        verified: verifiedRow ? verifiedRow.v : 0,
        unverified: (totalRow ? totalRow.c : 0) - (verifiedRow ? verifiedRow.v : 0),
        online: onlineRow ? onlineRow.o : 0,
        activeInRange: activeRow ? activeRow.p : 0,
        newPlayers: newPlayersRow ? newPlayersRow.p : 0,
        returningPlayers: returningRow ? returningRow.p : 0,
        totalPlayers: allPlayersRow ? allPlayersRow.p : 0,
        winMatches: winRow ? winRow.c : 0,
        deathMatches: deathMatchRow ? deathMatchRow.c : 0,
        anonPlayers: anonRow ? anonRow.c : 0,
        namedPlayers: namedRow ? namedRow.c : 0,
        nameSetEvents: namedFunnelRow ? namedFunnelRow.c : 0,
        totalMinutes: Math.round((newHb + retHb) * HEARTBEAT_MIN),
        totalMinutesNew: Math.round(totalMinNew),
        totalMinutesReturning: Math.round(totalMinRet),
        avgMinutesNew: newPlayersHb > 0 ? Math.round((totalMinNew / newPlayersHb) * 10) / 10 : 0,
        avgMinutesReturning: retPlayersHb > 0 ? Math.round((totalMinRet / retPlayersHb) * 10) / 10 : 0,
        medianMinutesNew: Math.round(medianMinNew * 10) / 10,
        medianMinutesReturning: Math.round(medianMinRet * 10) / 10,
        today,
        popularLevels: (levelRows && levelRows.results) ? levelRows.results : [],
        deathsByLevel: (deathRows && deathRows.results) ? deathRows.results : [],
        last7Days: lastDays,
        avgCompletionMs: avgByLevel,
        generatedAt: now,
      },
    };
  }, force);
}

// === Per-level detailed stats (all 20 levels) ===
async function handleStatsLevels(env, range, force, before) {
  const cacheKey = 'levels:' + range + (before ? ':' + before : '');
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range, before);

    // Fast path: for 31d/all, try stats_daily
    if ((range === '31d' || range === 'all') && !before) {
      const dateFrom = range === 'all' ? '2000-01-01' : new Date(startTs).toISOString().slice(0, 10);
      const fastRows = await env.DB.prepare(
        'SELECT level, SUM(starts) as starts, SUM(completes) as completes, SUM(deaths) as deaths, SUM(unique_players) as players, AVG(avg_ms) as avg_ms, AVG(p50_ms) as p50_ms FROM stats_daily WHERE level < 20 AND date >= ? GROUP BY level'
      ).bind(dateFrom).all();

      if (fastRows && fastRows.results && fastRows.results.length > 0) {
        const levels = [];
        const fastMap = {};
        for (const r of fastRows.results) fastMap[r.level] = r;
        for (let i = 0; i < 20; i++) {
          const r = fastMap[i];
          if (r) {
            levels.push({
              level: i, starts: r.starts || 0, completes: r.completes || 0, deaths: r.deaths || 0,
              players: r.players || 0, avgMs: r.avg_ms ? Math.round(r.avg_ms) : null,
              medianMs: r.p50_ms ? Math.round(r.p50_ms) : null,
              completionRate: r.starts > 0 ? Math.round((r.completes / r.starts) * 100) : 0,
              avgAttempts: r.completes > 0 ? Number((r.starts / r.completes).toFixed(2)) : null,
              deathCauses: {}, passed: 0, stuck: 0, minMs: null, maxMs: null,
              avgDeaths: null, avgGold: null, avgSilver: null, avgStyle: null, resurrects: 0,
            });
          } else {
            levels.push({ level: i, starts: 0, completes: 0, deaths: 0, players: 0, avgMs: null, medianMs: null, completionRate: 0, avgAttempts: null, deathCauses: {}, passed: 0, stuck: 0, minMs: null, maxMs: null, avgDeaths: null, avgGold: null, avgSilver: null, avgStyle: null, resurrects: 0 });
          }
        }
        return { ok: true, data: { range, levels, generatedAt: Date.now(), _fastPath: true } };
      }
    }

    const [starts, completes, deaths, completeAgg, deathCauses, passedRows, medianRows] = await Promise.all([
      env.DB.prepare("SELECT level, COUNT(*) as c FROM events WHERE type='level_start' AND level IS NOT NULL AND server_ts > ? GROUP BY level").bind(startTs).all(),
      env.DB.prepare("SELECT level, COUNT(*) as c, COUNT(DISTINCT pid) as players FROM events WHERE type='level_complete' AND level IS NOT NULL AND server_ts > ? GROUP BY level").bind(startTs).all(),
      env.DB.prepare("SELECT level, COUNT(*) as c FROM events WHERE type='level_death' AND level IS NOT NULL AND server_ts > ? GROUP BY level").bind(startTs).all(),
      env.DB.prepare("SELECT level, AVG(CAST(JSON_EXTRACT(data,'$.time') AS REAL)) as avg_ms, MIN(CAST(JSON_EXTRACT(data,'$.time') AS REAL)) as min_ms, MAX(CAST(JSON_EXTRACT(data,'$.time') AS REAL)) as max_ms, AVG(CAST(JSON_EXTRACT(data,'$.deaths') AS REAL)) as avg_deaths, AVG(CAST(JSON_EXTRACT(data,'$.gold') AS REAL)) as avg_gold, AVG(CAST(JSON_EXTRACT(data,'$.silver') AS REAL)) as avg_silver, AVG(CAST(JSON_EXTRACT(data,'$.style') AS REAL)) as avg_style, SUM(CASE WHEN JSON_EXTRACT(data,'$.resurrected')=1 THEN 1 ELSE 0 END) as resurrects FROM events WHERE type='level_complete' AND verified=1 AND CAST(JSON_EXTRACT(data,'$.time') AS REAL) >= 5000 AND level IS NOT NULL AND server_ts > ? GROUP BY level").bind(startTs).all(),
      env.DB.prepare("SELECT level, JSON_EXTRACT(data,'$.cause') as cause, COUNT(*) as c FROM events WHERE type='level_death' AND level IS NOT NULL AND server_ts > ? GROUP BY level, cause").bind(startTs).all(),
      // Distinct players who started but never completed (stuck) — per level
      env.DB.prepare(`
        SELECT s.level,
          COUNT(DISTINCT s.pid) as starters,
          COUNT(DISTINCT c.pid) as passers
        FROM (SELECT pid, level FROM events WHERE type='level_start' AND level IS NOT NULL AND server_ts > ? GROUP BY pid, level) s
        LEFT JOIN (SELECT pid, level FROM events WHERE type='level_complete' AND level IS NOT NULL GROUP BY pid, level) c
          ON c.pid = s.pid AND c.level = s.level
        GROUP BY s.level
      `).bind(startTs).all(),
      // Median completion time per level (resilient to pro outliers)
      env.DB.prepare(`SELECT level, AVG(time) as median_ms FROM (
        SELECT level, time,
          ROW_NUMBER() OVER (PARTITION BY level ORDER BY time) as rn,
          COUNT(*) OVER (PARTITION BY level) as cnt
        FROM (
          SELECT level, CAST(JSON_EXTRACT(data,'$.time') AS REAL) as time
          FROM events
          WHERE type='level_complete' AND verified=1 AND CAST(JSON_EXTRACT(data,'$.time') AS REAL) >= 5000 AND level IS NOT NULL AND server_ts > ?
        )
      ) WHERE rn IN ((cnt+1)/2, (cnt+2)/2) GROUP BY level`).bind(startTs).all(),
    ]);

    const levels = {};
    function getLvl(n) {
      if (!levels[n]) levels[n] = { level: n, starts: 0, completes: 0, deaths: 0, players: 0, passed: 0, stuck: 0, avgMs: null, medianMs: null, minMs: null, maxMs: null, avgDeaths: null, avgGold: null, avgSilver: null, avgStyle: null, resurrects: 0, completionRate: 0, avgAttempts: null, deathCauses: {} };
      return levels[n];
    }

    if (starts && starts.results) for (const r of starts.results) getLvl(r.level).starts = r.c;
    if (completes && completes.results) for (const r of completes.results) { var l = getLvl(r.level); l.completes = r.c; l.players = r.players; }
    if (deaths && deaths.results) for (const r of deaths.results) getLvl(r.level).deaths = r.c;
    if (completeAgg && completeAgg.results) {
      for (const r of completeAgg.results) {
        const l = getLvl(r.level);
        l.avgMs = r.avg_ms ? Math.round(r.avg_ms) : null;
        l.minMs = r.min_ms ? Math.round(r.min_ms) : null;
        l.maxMs = r.max_ms ? Math.round(r.max_ms) : null;
        l.avgDeaths = r.avg_deaths ? Number(r.avg_deaths.toFixed(2)) : null;
        l.avgGold = r.avg_gold ? Number(r.avg_gold.toFixed(2)) : null;
        l.avgSilver = r.avg_silver ? Number(r.avg_silver.toFixed(2)) : null;
        l.avgStyle = r.avg_style ? Math.round(r.avg_style) : null;
        l.resurrects = r.resurrects || 0;
      }
    }
    if (deathCauses && deathCauses.results) {
      for (const r of deathCauses.results) {
        if (r.level != null) {
          const cause = r.cause || 'unknown';
          getLvl(r.level).deathCauses[cause] = r.c;
        }
      }
    }
    if (passedRows && passedRows.results) {
      for (const r of passedRows.results) {
        const l = getLvl(r.level);
        l.passed = r.passers;
        l.stuck = Math.max(0, r.starters - r.passers);
      }
    }
    if (medianRows && medianRows.results) {
      for (const r of medianRows.results) {
        const l = getLvl(r.level);
        l.medianMs = r.median_ms ? Math.round(r.median_ms) : null;
      }
    }

    for (const k of Object.keys(levels)) {
      const l = levels[k];
      l.completionRate = l.starts > 0 ? Math.round((l.completes / l.starts) * 100) : 0;
      l.avgAttempts = l.completes > 0 ? Number((l.starts / l.completes).toFixed(2)) : null;
    }

    const out = [];
    for (let i = 0; i < 20; i++) {
      out.push(levels[i] || { level: i, starts: 0, completes: 0, deaths: 0, players: 0, passed: 0, stuck: 0, avgMs: null, medianMs: null, minMs: null, maxMs: null, avgDeaths: null, avgGold: null, avgSilver: null, avgStyle: null, resurrects: 0, completionRate: 0, avgAttempts: null, deathCauses: {} });
    }
    return { ok: true, data: { range, levels: out, generatedAt: Date.now() } };
  }, force);
}

// === Per-player ranking ===
async function handleStatsPlayers(env, range, force, before) {
  const cacheKey = 'players:' + range + (before ? ':' + before : '');
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range, before);
    const [topActive, topCompleters, topDiers, topGold, topChampions, topVerified, newList, retList, perseverance, recent] = await Promise.all([
      env.DB.prepare("SELECT pid, MAX(name) as name, COUNT(*) as events, MAX(server_ts) as last_seen FROM events WHERE server_ts > ? GROUP BY pid HAVING name IS NOT NULL ORDER BY events DESC LIMIT 30").bind(startTs).all(),
      env.DB.prepare("SELECT pid, MAX(name) as name, COUNT(*) as completions, COUNT(DISTINCT level) as unique_levels FROM events WHERE type='level_complete' AND server_ts > ? GROUP BY pid HAVING name IS NOT NULL ORDER BY completions DESC LIMIT 30").bind(startTs).all(),
      env.DB.prepare("SELECT pid, MAX(name) as name, COUNT(*) as deaths FROM events WHERE type='level_death' AND server_ts > ? GROUP BY pid HAVING name IS NOT NULL ORDER BY deaths DESC LIMIT 30").bind(startTs).all(),
      env.DB.prepare("SELECT pid, MAX(name) as name, SUM(CAST(JSON_EXTRACT(data,'$.gold') AS REAL)) as total_gold, SUM(CAST(JSON_EXTRACT(data,'$.silver') AS REAL)) as total_silver FROM events WHERE type='level_complete' AND server_ts > ? GROUP BY pid HAVING name IS NOT NULL ORDER BY total_gold DESC LIMIT 30").bind(startTs).all(),
      env.DB.prepare("SELECT pid, MAX(name) as name, COUNT(DISTINCT level) as cleared FROM events WHERE type='level_complete' GROUP BY pid HAVING cleared >= 20 AND name IS NOT NULL ORDER BY MIN(server_ts) ASC LIMIT 50").all(),
      env.DB.prepare("SELECT pid, MAX(name) as name, SUM(CASE WHEN verified=1 THEN 1 ELSE 0 END) as v, COUNT(*) as total FROM events WHERE server_ts > ? GROUP BY pid HAVING total >= 10 AND name IS NOT NULL ORDER BY (CAST(SUM(CASE WHEN verified=1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*)) ASC LIMIT 30").bind(startTs).all(),
      env.DB.prepare("SELECT p.pid, MAX(e.name) as name, p.fs as first_seen, MAX(e.server_ts) as last_seen, COUNT(e.id) as events FROM (SELECT pid, MIN(server_ts) as fs FROM events GROUP BY pid HAVING fs > ?) p JOIN events e ON e.pid = p.pid GROUP BY p.pid HAVING name IS NOT NULL ORDER BY p.fs DESC LIMIT 30").bind(startTs).all(),
      env.DB.prepare("SELECT p.pid, MAX(e.name) as name, p.fs as first_seen, MAX(e.server_ts) as last_seen, COUNT(e.id) as events FROM (SELECT pid, MIN(server_ts) as fs FROM events GROUP BY pid HAVING fs <= ?) p JOIN events e ON e.pid = p.pid WHERE e.server_ts > ? GROUP BY p.pid HAVING name IS NOT NULL ORDER BY MAX(e.server_ts) DESC LIMIT 30").bind(startTs, startTs).all(),
      // Motivation: max deaths-on-one-level-without-clearing-it (perseverance) + longest consecutive complete streak
      env.DB.prepare(`
        SELECT
          d.pid,
          MAX(e.name) as name,
          MAX(d.deaths_on_level) as perseverance,
          (SELECT COUNT(DISTINCT level) FROM events WHERE pid = d.pid AND type='level_complete' AND server_ts > ?) as streak
        FROM (
          SELECT pid, level, COUNT(*) as deaths_on_level
          FROM events
          WHERE type='level_death' AND server_ts > ?
          GROUP BY pid, level
          HAVING level NOT IN (SELECT DISTINCT level FROM events WHERE type='level_complete' AND pid = events.pid)
        ) d
        JOIN events e ON e.pid = d.pid
        GROUP BY d.pid
        HAVING name IS NOT NULL
        ORDER BY (perseverance + streak * 5) DESC
        LIMIT 30
      `).bind(startTs, startTs).all(),
      env.DB.prepare("SELECT pid, MAX(name) as name, MAX(server_ts) as last_seen, MIN(server_ts) as first_seen FROM events WHERE server_ts > ? GROUP BY pid HAVING name IS NOT NULL ORDER BY last_seen DESC LIMIT 30").bind(startTs).all(),
    ]);

    // Tag recent with new/returning
    const recentList = (recent && recent.results) || [];
    for (const r of recentList) r.cohort = (r.first_seen > startTs) ? 'new' : 'returning';

    return {
      ok: true,
      data: {
        range,
        topActive: (topActive && topActive.results) || [],
        topCompleters: (topCompleters && topCompleters.results) || [],
        topDiers: (topDiers && topDiers.results) || [],
        topGold: (topGold && topGold.results) || [],
        champions: (topChampions && topChampions.results) || [],
        lowestVerified: (topVerified && topVerified.results) || [],
        newPlayers: (newList && newList.results) || [],
        returningPlayers: (retList && retList.results) || [],
        highMotivation: (perseverance && perseverance.results) || [],
        recentActive: recentList,
        generatedAt: Date.now(),
      },
    };
  }, force);
}

// === Sessions / funnel / hourly heat ===
async function handleStatsSessions(env, range, force, before) {
  // TODO Phase 4+: fast path via stats_daily for range='31d'/'all'
  const cacheKey = 'sessions:' + range + (before ? ':' + before : '');
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range, before);
    const HEARTBEAT_MIN = 1.5;

    const [sessionsCount, funnel, hourly, daily, deathCauses, devices, sessionDurations, dowHourly] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) as c FROM events WHERE type='session_start' AND server_ts > ?").bind(startTs).first(),
      env.DB.prepare("SELECT type, COUNT(*) as c FROM events WHERE type IN ('session_start','level_start','level_complete','level_death','purchase') AND server_ts > ? GROUP BY type").bind(startTs).all(),
      env.DB.prepare("SELECT CAST((server_ts / 3600000) % 24 AS INTEGER) as hr, COUNT(*) as c FROM events WHERE server_ts > ? GROUP BY hr").bind(startTs).all(),
      env.DB.prepare("SELECT CAST((server_ts - ?) / 86400000 AS INTEGER) as day, COUNT(DISTINCT pid) as players, COUNT(*) as events, SUM(CASE WHEN type='session_start' THEN 1 ELSE 0 END) as sessions, SUM(CASE WHEN type='level_complete' THEN 1 ELSE 0 END) as completions FROM events WHERE server_ts > ? GROUP BY day ORDER BY day").bind(startTs, startTs).all(),
      env.DB.prepare("SELECT JSON_EXTRACT(data,'$.cause') as cause, COUNT(*) as c FROM events WHERE type='level_death' AND server_ts > ? GROUP BY cause ORDER BY c DESC").bind(startTs).all(),
      env.DB.prepare("SELECT CASE WHEN JSON_EXTRACT(data,'$.ua') LIKE '%Mobi%' OR JSON_EXTRACT(data,'$.ua') LIKE '%Android%' THEN 'mobile' WHEN JSON_EXTRACT(data,'$.ua') LIKE '%iPad%' OR JSON_EXTRACT(data,'$.ua') LIKE '%Tablet%' THEN 'tablet' ELSE 'desktop' END as device, COUNT(*) as c, COUNT(DISTINCT pid) as players FROM events WHERE type='session_start' AND server_ts > ? GROUP BY device").bind(startTs).all(),
      // Session duration distribution: count heartbeats per session approximated by pid+day, classify
      env.DB.prepare(`
        SELECT CASE
          WHEN hb_count < 3 THEN 'short'
          WHEN hb_count < 20 THEN 'medium'
          ELSE 'long'
        END as bucket,
        COUNT(*) as count
        FROM (
          SELECT pid, CAST(server_ts / 86400000 AS INTEGER) as day, COUNT(*) as hb_count
          FROM events
          WHERE type='heartbeat' AND server_ts > ?
          GROUP BY pid, day
        )
        GROUP BY bucket
      `).bind(startTs).all(),
      // Day-of-week × hour heatmap
      env.DB.prepare(`
        SELECT
          CAST(strftime('%w', server_ts/1000, 'unixepoch') AS INTEGER) as dow,
          CAST((server_ts / 3600000) % 24 AS INTEGER) as hr,
          COUNT(*) as c
        FROM events WHERE server_ts > ? GROUP BY dow, hr
      `).bind(startTs).all(),
    ]);

    const funnelMap = {};
    if (funnel && funnel.results) for (const r of funnel.results) funnelMap[r.type] = r.c;

    const hour = new Array(24).fill(0);
    if (hourly && hourly.results) for (const r of hourly.results) hour[r.hr] = r.c;

    const durMap = { short: 0, medium: 0, long: 0 };
    if (sessionDurations && sessionDurations.results) for (const r of sessionDurations.results) durMap[r.bucket] = r.count;

    // Build 7x24 dow heatmap
    const dowHeatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));
    if (dowHourly && dowHourly.results) {
      for (const r of dowHourly.results) {
        if (r.dow >= 0 && r.dow < 7 && r.hr >= 0 && r.hr < 24) {
          dowHeatmap[r.dow][r.hr] = r.c;
        }
      }
    }

    return {
      ok: true,
      data: {
        range,
        sessionsToday: sessionsCount ? sessionsCount.c : 0,
        funnel: funnelMap,
        hourlyActivity: hour,
        dailyBreakdown: (daily && daily.results) || [],
        deathCauses: (deathCauses && deathCauses.results) || [],
        devices: (devices && devices.results) || [],
        sessionDurations: durMap,
        dowHeatmap,
        generatedAt: Date.now(),
      },
    };
  }, force);
}

// === UI / PWA tracking ===
async function handleStatsUI(env, range, force, before) {
  return cachedJson('ui:' + range + (before ? ':' + before : ''), async () => {
    const startTs = rangeStartTs(range, before);
    const [displayMode, pwaSupport, clicks, storeTabs, installFunnel] = await Promise.all([
      env.DB.prepare("SELECT JSON_EXTRACT(data,'$.display') as display, COUNT(*) as c, COUNT(DISTINCT pid) as players FROM events WHERE type='session_start' AND server_ts > ? GROUP BY display").bind(startTs).all(),
      env.DB.prepare("SELECT JSON_EXTRACT(data,'$.pwa') as pwa, COUNT(*) as c, COUNT(DISTINCT pid) as players FROM events WHERE type='session_start' AND server_ts > ? GROUP BY pwa").bind(startTs).all(),
      env.DB.prepare("SELECT JSON_EXTRACT(data,'$.action') as action, COUNT(*) as c, COUNT(DISTINCT pid) as players FROM events WHERE type='ui_event' AND server_ts > ? GROUP BY action").bind(startTs).all(),
      env.DB.prepare("SELECT JSON_EXTRACT(data,'$.meta') as tab, COUNT(*) as c FROM events WHERE type='ui_event' AND JSON_EXTRACT(data,'$.action')='store_tab' AND server_ts > ? GROUP BY tab").bind(startTs).all(),
      env.DB.prepare("SELECT JSON_EXTRACT(data,'$.action') as action, COUNT(*) as c FROM events WHERE type='ui_event' AND JSON_EXTRACT(data,'$.action') IN ('pwa_prompt_shown','pwa_install_accepted','pwa_install_dismissed','pwa_appinstalled') AND server_ts > ? GROUP BY action").bind(startTs).all(),
    ]);
    return {
      ok: true,
      data: {
        range,
        displayMode: (displayMode && displayMode.results) || [],
        pwaSupport: (pwaSupport && pwaSupport.results) || [],
        clicks: (clicks && clicks.results) || [],
        storeTabs: (storeTabs && storeTabs.results) || [],
        installFunnel: (installFunnel && installFunnel.results) || [],
        generatedAt: Date.now(),
      },
    };
  }, force);
}

// === Economy: time-series of gold/silver minted vs spent ===
async function handleStatsEconomy(env, range, force, before) {
  return cachedJson('economy:' + range + (before ? ':' + before : ''), async () => {
    const startTs = rangeStartTs(range, before);

    // Fast path: for 31d/all, use stats_daily for time-series
    if ((range === '31d' || range === 'all') && !before) {
      const dateFrom = range === 'all' ? '2000-01-01' : new Date(startTs).toISOString().slice(0, 10);
      const fastRows = await env.DB.prepare(
        'SELECT date, gold_earned, silver_earned, gold_spent, silver_spent, sessions FROM stats_daily WHERE level=99 AND date >= ? ORDER BY date'
      ).bind(dateFrom).all();

      if (fastRows && fastRows.results && fastRows.results.length > 0) {
        const dayCount = Math.min(31, fastRows.results.length);
        const seriesArrays = { goldEarn: [], silverEarn: [], goldSpent: [], silverSpent: [], goldCirc: [], silverCirc: [] };
        let cumGold = 0, cumSilver = 0, totalGE = 0, totalSE = 0, totalGS = 0, totalSS = 0, totalSessions = 0;
        const recent = fastRows.results.slice(-dayCount);
        for (const r of recent) {
          seriesArrays.goldEarn.push(r.gold_earned || 0);
          seriesArrays.silverEarn.push(r.silver_earned || 0);
          seriesArrays.goldSpent.push(r.gold_spent || 0);
          seriesArrays.silverSpent.push(r.silver_spent || 0);
          cumGold += (r.gold_earned || 0) - (r.gold_spent || 0);
          cumSilver += (r.silver_earned || 0) - (r.silver_spent || 0);
          seriesArrays.goldCirc.push(cumGold);
          seriesArrays.silverCirc.push(cumSilver);
          totalGE += r.gold_earned || 0;
          totalSE += r.silver_earned || 0;
          totalGS += r.gold_spent || 0;
          totalSS += r.silver_spent || 0;
          totalSessions += r.sessions || 0;
        }
        return {
          ok: true,
          data: {
            range,
            totals: {
              goldEarned: totalGE, silverEarned: totalSE, goldSpent: totalGS, silverSpent: totalSS,
              circulatingGold: totalGE - totalGS, circulatingSilver: totalSE - totalSS,
              sessions: totalSessions,
              avgGoldPerSession: totalSessions > 0 ? Math.round(totalGE / totalSessions * 10) / 10 : 0,
              avgSilverPerSession: totalSessions > 0 ? Math.round(totalSE / totalSessions * 10) / 10 : 0,
            },
            timeseries: seriesArrays,
            topItems: [], byCategory: [], topSpenders: [],
            generatedAt: Date.now(), _fastPath: true,
          },
        };
      }
    }

    const [goldEarned, silverEarned, goldSpent, silverSpent, topItems, byCategory, topSpenders, totals] = await Promise.all([
      env.DB.prepare(`SELECT CAST((server_ts - ?) / 86400000 AS INTEGER) as day, SUM(CAST(JSON_EXTRACT(data,'$.gold') AS REAL)) as v FROM events WHERE type='level_complete' AND verified=1 AND server_ts > ? GROUP BY day ORDER BY day`).bind(startTs, startTs).all(),
      env.DB.prepare(`SELECT CAST((server_ts - ?) / 86400000 AS INTEGER) as day, SUM(CAST(JSON_EXTRACT(data,'$.silver') AS REAL)) as v FROM events WHERE type='level_complete' AND verified=1 AND server_ts > ? GROUP BY day ORDER BY day`).bind(startTs, startTs).all(),
      env.DB.prepare(`SELECT CAST((server_ts - ?) / 86400000 AS INTEGER) as day, SUM(CAST(JSON_EXTRACT(data,'$.cost') AS REAL)) as v FROM events WHERE type='purchase' AND JSON_EXTRACT(data,'$.currency')='gold' AND server_ts > ? GROUP BY day ORDER BY day`).bind(startTs, startTs).all(),
      env.DB.prepare(`SELECT CAST((server_ts - ?) / 86400000 AS INTEGER) as day, SUM(CAST(JSON_EXTRACT(data,'$.cost') AS REAL)) as v FROM events WHERE type='purchase' AND JSON_EXTRACT(data,'$.currency')='silver' AND server_ts > ? GROUP BY day ORDER BY day`).bind(startTs, startTs).all(),
      env.DB.prepare(`SELECT JSON_EXTRACT(data,'$.kind') as kind, JSON_EXTRACT(data,'$.id') as id, JSON_EXTRACT(data,'$.cat') as cat, JSON_EXTRACT(data,'$.currency') as currency, COUNT(*) as buys, COUNT(DISTINCT pid) as buyers, SUM(CAST(JSON_EXTRACT(data,'$.cost') AS REAL)) as total_spent FROM events WHERE type='purchase' AND server_ts > ? GROUP BY kind, id ORDER BY buys DESC LIMIT 50`).bind(startTs).all(),
      env.DB.prepare(`SELECT JSON_EXTRACT(data,'$.kind') as kind, JSON_EXTRACT(data,'$.cat') as cat, COUNT(*) as buys, SUM(CAST(JSON_EXTRACT(data,'$.cost') AS REAL)) as total_spent FROM events WHERE type='purchase' AND server_ts > ? GROUP BY kind, cat ORDER BY buys DESC`).bind(startTs).all(),
      env.DB.prepare(`SELECT pid, MAX(name) as name, JSON_EXTRACT(data,'$.currency') as currency, SUM(CAST(JSON_EXTRACT(data,'$.cost') AS REAL)) as total_spent, COUNT(*) as buys FROM events WHERE type='purchase' AND server_ts > ? GROUP BY pid, currency ORDER BY total_spent DESC LIMIT 30`).bind(startTs).all(),
      env.DB.prepare(`SELECT
        SUM(CASE WHEN type='level_complete' AND verified=1 THEN CAST(JSON_EXTRACT(data,'$.gold') AS REAL) ELSE 0 END) as gold_earned,
        SUM(CASE WHEN type='level_complete' AND verified=1 THEN CAST(JSON_EXTRACT(data,'$.silver') AS REAL) ELSE 0 END) as silver_earned,
        SUM(CASE WHEN type='purchase' AND JSON_EXTRACT(data,'$.currency')='gold' THEN CAST(JSON_EXTRACT(data,'$.cost') AS REAL) ELSE 0 END) as gold_spent,
        SUM(CASE WHEN type='purchase' AND JSON_EXTRACT(data,'$.currency')='silver' THEN CAST(JSON_EXTRACT(data,'$.cost') AS REAL) ELSE 0 END) as silver_spent,
        SUM(CASE WHEN type='session_start' THEN 1 ELSE 0 END) as sessions
        FROM events WHERE server_ts > ?`).bind(startTs).first(),
    ]);

    function toSeries(rows) {
      const map = {};
      if (rows && rows.results) for (const r of rows.results) map[r.day] = Math.round(r.v || 0);
      return map;
    }

    const goldEarn = toSeries(goldEarned);
    const silverEarn = toSeries(silverEarned);
    const goldSp = toSeries(goldSpent);
    const silverSp = toSeries(silverSpent);

    // Build cumulative circulating arrays
    const dayCount = Math.min(31, Math.max(1, Math.ceil((Date.now() - startTs) / 86400000)));
    const seriesArrays = { goldEarn: new Array(dayCount).fill(0), silverEarn: new Array(dayCount).fill(0), goldSpent: new Array(dayCount).fill(0), silverSpent: new Array(dayCount).fill(0), goldCirc: new Array(dayCount).fill(0), silverCirc: new Array(dayCount).fill(0) };
    let cumGold = 0, cumSilver = 0;
    for (let i = 0; i < dayCount; i++) {
      seriesArrays.goldEarn[i] = goldEarn[i] || 0;
      seriesArrays.silverEarn[i] = silverEarn[i] || 0;
      seriesArrays.goldSpent[i] = goldSp[i] || 0;
      seriesArrays.silverSpent[i] = silverSp[i] || 0;
      cumGold += seriesArrays.goldEarn[i] - seriesArrays.goldSpent[i];
      cumSilver += seriesArrays.silverEarn[i] - seriesArrays.silverSpent[i];
      seriesArrays.goldCirc[i] = cumGold;
      seriesArrays.silverCirc[i] = cumSilver;
    }

    const tot = totals || {};
    const sessions = tot.sessions || 0;
    return {
      ok: true,
      data: {
        range,
        totals: {
          goldEarned: Math.round(tot.gold_earned || 0),
          silverEarned: Math.round(tot.silver_earned || 0),
          goldSpent: Math.round(tot.gold_spent || 0),
          silverSpent: Math.round(tot.silver_spent || 0),
          circulatingGold: Math.round((tot.gold_earned || 0) - (tot.gold_spent || 0)),
          circulatingSilver: Math.round((tot.silver_earned || 0) - (tot.silver_spent || 0)),
          sessions,
          avgGoldPerSession: sessions > 0 ? Math.round((tot.gold_earned || 0) / sessions * 10) / 10 : 0,
          avgSilverPerSession: sessions > 0 ? Math.round((tot.silver_earned || 0) / sessions * 10) / 10 : 0,
        },
        timeseries: seriesArrays,
        topItems: (topItems && topItems.results) || [],
        byCategory: (byCategory && byCategory.results) || [],
        topSpenders: (topSpenders && topSpenders.results) || [],
        generatedAt: Date.now(),
      },
    };
  }, force);
}

// === Feedback handler ===
async function handleFeedback(request, env) {
  const body = await readJsonBody(request);
  const { pid, name, subject, email, content, ts } = body || {};

  if (!pid || typeof pid !== 'string' || !content || typeof content !== 'string' || content.trim().length < 3) {
    return errResponse('pid and content (min 3 chars) required', 400, true);
  }
  if (content.length > 2000) {
    return errResponse('content too long (max 2000 chars)', 400, true);
  }

  // Rate limit: 5 feedback per 5 min per IP
  const ip = getClientIp(request);
  if (isRateLimited(`feedback:ip:${ip}`, RATE_LIMIT_IP_WINDOW_MS, 5)) {
    return new Response(JSON.stringify({ ok: false, error: 'rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(RATE_LIMIT_IP_WINDOW_MS / 1000)), ...publicCorsHeaders() },
    });
  }

  const serverTs = Date.now();
  const data = JSON.stringify({
    subject: (subject || '').slice(0, 100),
    email: (email || '').slice(0, 120),
    content: content.trim().slice(0, 2000),
  });

  await env.DB.prepare(
    'INSERT INTO events (pid, name, type, level, data, client_ts, server_ts, offline, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    pid,
    sanitizeName(name),
    'feedback',
    null,
    data,
    typeof ts === 'number' ? ts : serverTs,
    serverTs,
    0,
    0
  ).run();

  return jsonResponse({ ok: true }, 200, true);
}

// === Daily Stage stats ===
async function handleStatsDailyStage(env, range, force, before) {
  const cacheKey = 'dailystage:' + range + (before ? ':' + before : '');
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range, before);
    const [
      startsRow, startPlayersRow,
      completesRow, completePlayersRow,
      deathsRow,
      avgTimeRow, bestTimeRow, avgDeathsRow,
      deathCauses, byDay, byDiff,
    ] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) as c FROM events WHERE type='level_start' AND JSON_EXTRACT(data,'$.isDaily')=1 AND server_ts > ?").bind(startTs).first(),
      env.DB.prepare("SELECT COUNT(DISTINCT pid) as c FROM events WHERE type='level_start' AND JSON_EXTRACT(data,'$.isDaily')=1 AND server_ts > ?").bind(startTs).first(),
      env.DB.prepare("SELECT COUNT(*) as c FROM events WHERE type='level_complete' AND JSON_EXTRACT(data,'$.isDaily')=1 AND server_ts > ?").bind(startTs).first(),
      env.DB.prepare("SELECT COUNT(DISTINCT pid) as c FROM events WHERE type='level_complete' AND JSON_EXTRACT(data,'$.isDaily')=1 AND server_ts > ?").bind(startTs).first(),
      env.DB.prepare("SELECT COUNT(*) as c FROM events WHERE type='level_death' AND JSON_EXTRACT(data,'$.isDaily')=1 AND server_ts > ?").bind(startTs).first(),
      env.DB.prepare("SELECT AVG(CAST(JSON_EXTRACT(data,'$.time') AS REAL)) as v FROM events WHERE type='level_complete' AND JSON_EXTRACT(data,'$.isDaily')=1 AND verified=1 AND CAST(JSON_EXTRACT(data,'$.time') AS REAL) >= 5000 AND server_ts > ?").bind(startTs).first(),
      env.DB.prepare("SELECT MIN(CAST(JSON_EXTRACT(data,'$.time') AS REAL)) as v FROM events WHERE type='level_complete' AND JSON_EXTRACT(data,'$.isDaily')=1 AND verified=1 AND CAST(JSON_EXTRACT(data,'$.time') AS REAL) >= 5000 AND server_ts > ?").bind(startTs).first(),
      env.DB.prepare("SELECT AVG(CAST(JSON_EXTRACT(data,'$.deaths') AS REAL)) as v FROM events WHERE type='level_complete' AND JSON_EXTRACT(data,'$.isDaily')=1 AND server_ts > ?").bind(startTs).first(),
      env.DB.prepare("SELECT JSON_EXTRACT(data,'$.cause') as cause, COUNT(*) as c FROM events WHERE type='level_death' AND JSON_EXTRACT(data,'$.isDaily')=1 AND server_ts > ? GROUP BY cause ORDER BY c DESC").bind(startTs).all(),
      env.DB.prepare("SELECT CAST((server_ts - ?) / 86400000 AS INTEGER) as day, COUNT(*) as starts, SUM(CASE WHEN type='level_complete' THEN 1 ELSE 0 END) as completes, COUNT(DISTINCT pid) as players FROM events WHERE JSON_EXTRACT(data,'$.isDaily')=1 AND server_ts > ? GROUP BY day ORDER BY day").bind(startTs, startTs).all(),
      env.DB.prepare("SELECT JSON_EXTRACT(data,'$.diff') as diff, COUNT(*) as starts, SUM(CASE WHEN type='level_complete' THEN 1 ELSE 0 END) as completes FROM events WHERE type='level_start' AND JSON_EXTRACT(data,'$.isDaily')=1 AND server_ts > ? GROUP BY diff").bind(startTs).all(),
    ]);

    const starts = startsRow ? startsRow.c : 0;
    const completes = completesRow ? completesRow.c : 0;
    return {
      ok: true,
      data: {
        range,
        starts,
        startPlayers: startPlayersRow ? startPlayersRow.c : 0,
        completes,
        completePlayers: completePlayersRow ? completePlayersRow.c : 0,
        deaths: deathsRow ? deathsRow.c : 0,
        completionRate: starts > 0 ? Math.round((completes / starts) * 1000) / 10 : 0,
        avgTime: avgTimeRow && avgTimeRow.v ? Math.round(avgTimeRow.v) : 0,
        bestTime: bestTimeRow && bestTimeRow.v ? Math.round(bestTimeRow.v) : 0,
        avgDeaths: avgDeathsRow && avgDeathsRow.v ? Math.round(avgDeathsRow.v * 10) / 10 : 0,
        deathCauses: (deathCauses && deathCauses.results) || [],
        byDay: (byDay && byDay.results) || [],
        byDiff: (byDiff && byDiff.results) || [],
        generatedAt: Date.now(),
      },
    };
  }, force);
}

// === App Version stats ===
async function handleStatsAppVersion(env, range, force, before) {
  const cacheKey = 'appversion:' + range + (before ? ':' + before : '');
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range, before);
    const [
      versionRows,
      totalEventsRow,
      versionTimeSeries,
    ] = await Promise.all([
      env.DB.prepare("SELECT JSON_EXTRACT(data,'$._v') as v, COUNT(*) as c, COUNT(DISTINCT pid) as players FROM events WHERE server_ts > ? AND JSON_EXTRACT(data,'$._v') IS NOT NULL GROUP BY v ORDER BY c DESC").bind(startTs).all(),
      env.DB.prepare('SELECT COUNT(*) as c FROM events WHERE server_ts > ?').bind(startTs).first(),
      env.DB.prepare("SELECT CAST((server_ts - ?) / 86400000 AS INTEGER) as day, JSON_EXTRACT(data,'$._v') as v, COUNT(*) as c FROM events WHERE server_ts > ? AND JSON_EXTRACT(data,'$._v') IS NOT NULL GROUP BY day, v ORDER BY day").bind(startTs, startTs).all(),
    ]);

    const totalEvents = totalEventsRow ? totalEventsRow.c : 0;
    const versions = (versionRows && versionRows.results) || [];

    // Build time-series per version
    const dayCount = Math.min(31, Math.max(1, Math.ceil((Date.now() - startTs) / 86400000)));
    const tsMap = {};
    if (versionTimeSeries && versionTimeSeries.results) {
      for (const r of versionTimeSeries.results) {
        const v = r.v || 'unknown';
        if (!tsMap[v]) tsMap[v] = new Array(dayCount).fill(0);
        const idx = Math.max(0, Math.min(dayCount - 1, r.day));
        tsMap[v][idx] = (tsMap[v][idx] || 0) + r.c;
      }
    }

    return {
      ok: true,
      data: {
        range,
        totalEvents,
        versions: versions.map(function(r) {
          return {
            version: r.v || 'unknown',
            events: r.c,
            players: r.players,
            pct: totalEvents > 0 ? Math.round((r.c / totalEvents) * 1000) / 10 : 0,
            series: tsMap[r.v || 'unknown'] || new Array(dayCount).fill(0),
          };
        }),
        generatedAt: Date.now(),
      },
    };
  }, force);
}

// === Feedback stats ===
async function handleStatsFeedback(env, force) {
  return cachedJson('feedback:latest', async () => {
    const [
      totalRow,
      recentRows,
    ] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) as c FROM events WHERE type='feedback'").first(),
      env.DB.prepare("SELECT e.id, e.pid, e.name, e.data, e.client_ts, e.server_ts, fs.status, fs.notes FROM events e LEFT JOIN feedback_status fs ON fs.event_id = e.id WHERE e.type='feedback' ORDER BY e.server_ts DESC LIMIT 50").all(),
    ]);

    const items = [];
    if (recentRows && recentRows.results) {
      for (const r of recentRows.results) {
        let parsed = {};
        try { parsed = JSON.parse(r.data || '{}'); } catch (_) {}
        items.push({
          id: r.id,
          pid: r.pid,
          name: r.name,
          subject: parsed.subject || '',
          email: parsed.email || '',
          content: parsed.content || '',
          clientTs: r.client_ts,
          serverTs: r.server_ts,
          status: r.status || 'open',
          notes: r.notes || '',
        });
      }
    }

    return {
      ok: true,
      data: {
        total: totalRow ? totalRow.c : 0,
        items,
        generatedAt: Date.now(),
      },
    };
  }, force);
}

// === Cloud Sync stats ===
async function handleStatsSync(env, force) {
  return cachedJson('sync:latest', async () => {
    const [
      totalRow,
      totalDevicesRow,
      recentRows,
      deviceDistRow,
    ] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as c FROM sync_states').first(),
      env.DB.prepare("SELECT SUM(JSON_ARRAY_LENGTH(device_ids)) as total_devices, AVG(JSON_ARRAY_LENGTH(device_ids)) as avg_devices FROM sync_states").first(),
      env.DB.prepare('SELECT key_hash, pid, device_ids, updated_at FROM sync_states ORDER BY updated_at DESC LIMIT 50').all(),
      env.DB.prepare("SELECT JSON_ARRAY_LENGTH(device_ids) as dcount, COUNT(*) as c FROM sync_states GROUP BY dcount ORDER BY dcount").all(),
    ]);

    const items = [];
    if (recentRows && recentRows.results) {
      for (const r of recentRows.results) {
        let devices = [];
        try { devices = JSON.parse(r.device_ids || '[]'); } catch (_) {}
        items.push({
          keyHash: r.key_hash,
          pid: r.pid,
          devices: devices.length,
          updatedAt: r.updated_at,
        });
      }
    }

    return {
      ok: true,
      data: {
        totalAccounts: totalRow ? totalRow.c : 0,
        totalDevices: totalDevicesRow ? totalDevicesRow.total_devices || 0 : 0,
        avgDevicesPerAccount: totalDevicesRow ? Math.round((totalDevicesRow.avg_devices || 0) * 10) / 10 : 0,
        items,
        deviceDistribution: (deviceDistRow && deviceDistRow.results) || [],
        generatedAt: Date.now(),
      },
    };
  }, force);
}

// === Recent events feed (last 100) + summary ===
async function handleStatsFeed(env, force) {
  return cachedJson('feed:latest', async () => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const [rows, summaryRows] = await Promise.all([
      env.DB.prepare("SELECT pid, name, type, level, data, server_ts, verified FROM events ORDER BY server_ts DESC LIMIT 100").all(),
      env.DB.prepare("SELECT type, COUNT(*) as c FROM events WHERE server_ts > ? GROUP BY type").bind(fiveMinAgo).all(),
    ]);
    const summary = {};
    if (summaryRows && summaryRows.results) for (const r of summaryRows.results) summary[r.type] = r.c;
    const totalLast5 = Object.values(summary).reduce((a, b) => a + b, 0);
    return {
      ok: true,
      data: {
        events: (rows && rows.results) || [],
        summary,
        eventsPerMin: Math.round(totalLast5 / 5 * 10) / 10,
        generatedAt: Date.now(),
      },
    };
  }, force);
}

// === Per-player detailed profile ===
async function handleStatsPlayer(env, pid) {
  if (!pid || !PID_REGEX.test(pid)) return errResponse('invalid pid');
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;

  const [
    profileRow, byTypeRows, byLevelRows, completionAggRow, deathAggRow,
    deathCausesRows, purchasesRows, latestStartRow, hourlyRows, sessionsRows,
    countryRow, screenRow, langRow, recentRows, flagRow,
  ] = await Promise.all([
    env.DB.prepare("SELECT MAX(name) as name, MIN(server_ts) as first_seen, MAX(server_ts) as last_seen, COUNT(*) as total_events, SUM(CASE WHEN verified=1 THEN 1 ELSE 0 END) as verified, COUNT(DISTINCT level) as unique_levels FROM events WHERE pid = ?").bind(pid).first(),
    env.DB.prepare("SELECT type, COUNT(*) as c FROM events WHERE pid = ? GROUP BY type").bind(pid).all(),
    env.DB.prepare("SELECT level, type, COUNT(*) as c FROM events WHERE pid = ? AND level IS NOT NULL GROUP BY level, type").bind(pid).all(),
    env.DB.prepare("SELECT level, COUNT(*) as completes, MIN(CAST(JSON_EXTRACT(data,'$.time') AS REAL)) as best_ms, AVG(CAST(JSON_EXTRACT(data,'$.time') AS REAL)) as avg_ms, SUM(CAST(JSON_EXTRACT(data,'$.gold') AS REAL)) as gold, SUM(CAST(JSON_EXTRACT(data,'$.silver') AS REAL)) as silver, SUM(CAST(JSON_EXTRACT(data,'$.deaths') AS REAL)) as deaths_per_run, SUM(CASE WHEN JSON_EXTRACT(data,'$.resurrected')=1 THEN 1 ELSE 0 END) as resurrects FROM events WHERE pid = ? AND type='level_complete' AND verified=1 AND CAST(JSON_EXTRACT(data,'$.time') AS REAL) >= 5000 GROUP BY level").bind(pid).all(),
    env.DB.prepare("SELECT level, COUNT(*) as deaths FROM events WHERE pid = ? AND type='level_death' GROUP BY level").bind(pid).all(),
    env.DB.prepare("SELECT JSON_EXTRACT(data,'$.cause') as cause, COUNT(*) as c FROM events WHERE pid = ? AND type='level_death' GROUP BY cause ORDER BY c DESC").bind(pid).all(),
    env.DB.prepare("SELECT JSON_EXTRACT(data,'$.kind') as kind, JSON_EXTRACT(data,'$.id') as id, JSON_EXTRACT(data,'$.cat') as cat, JSON_EXTRACT(data,'$.currency') as currency, COUNT(*) as c, SUM(CAST(JSON_EXTRACT(data,'$.cost') AS REAL)) as total_spent, MAX(server_ts) as last_buy FROM events WHERE pid = ? AND type='purchase' GROUP BY kind, id ORDER BY last_buy DESC").bind(pid).all(),
    env.DB.prepare("SELECT data, server_ts FROM events WHERE pid = ? AND type='level_start' ORDER BY server_ts DESC LIMIT 1").bind(pid).first(),
    env.DB.prepare("SELECT CAST((server_ts / 3600000) % 24 AS INTEGER) as hr, COUNT(*) as c FROM events WHERE pid = ? GROUP BY hr").bind(pid).all(),
    env.DB.prepare("SELECT COUNT(*) as count, MAX(server_ts) as last_session FROM events WHERE pid = ? AND type='session_start'").bind(pid).first(),
    env.DB.prepare("SELECT JSON_EXTRACT(data,'$._cc') as cc, COUNT(*) as c FROM events WHERE pid = ? AND JSON_EXTRACT(data,'$._cc') IS NOT NULL GROUP BY cc ORDER BY c DESC LIMIT 5").bind(pid).all(),
    env.DB.prepare("SELECT JSON_EXTRACT(data,'$.scr') as scr FROM events WHERE pid = ? AND type='session_start' ORDER BY server_ts DESC LIMIT 1").bind(pid).first(),
    env.DB.prepare("SELECT JSON_EXTRACT(data,'$.lang') as lang, JSON_EXTRACT(data,'$.ua') as ua FROM events WHERE pid = ? AND type='session_start' ORDER BY server_ts DESC LIMIT 1").bind(pid).first(),
    env.DB.prepare("SELECT type, level, data, server_ts FROM events WHERE pid = ? ORDER BY server_ts DESC LIMIT 30").bind(pid).all(),
    env.DB.prepare("SELECT flag_type, reason, flagged_at FROM player_flags WHERE pid = ?").bind(pid).first(),
  ]);

  if (!profileRow || profileRow.total_events === 0) return errResponse('player not found', 404);

  // Aggregate per-level stats
  const perLevel = {};
  function getLvl(n) {
    if (!perLevel[n]) perLevel[n] = { level: n, starts: 0, completes: 0, deaths: 0, bestMs: null, avgMs: null, gold: 0, silver: 0, totalDeaths: 0, resurrects: 0 };
    return perLevel[n];
  }
  if (byLevelRows && byLevelRows.results) {
    for (const r of byLevelRows.results) {
      const l = getLvl(r.level);
      if (r.type === 'level_start') l.starts = r.c;
      else if (r.type === 'level_complete') l.completes = r.c;
      else if (r.type === 'level_death') l.deaths = r.c;
    }
  }
  if (completionAggRow && completionAggRow.results) {
    for (const r of completionAggRow.results) {
      const l = getLvl(r.level);
      l.bestMs = r.best_ms ? Math.round(r.best_ms) : null;
      l.avgMs = r.avg_ms ? Math.round(r.avg_ms) : null;
      l.gold = Math.round(r.gold || 0);
      l.silver = Math.round(r.silver || 0);
      l.totalDeaths = Math.round(r.deaths_per_run || 0);
      l.resurrects = r.resurrects || 0;
    }
  }
  const levelArr = [];
  for (let i = 0; i < 20; i++) levelArr.push(perLevel[i] || { level: i, starts: 0, completes: 0, deaths: 0, bestMs: null, avgMs: null, gold: 0, silver: 0, totalDeaths: 0, resurrects: 0 });

  // Favorite stage = most starts (or completes if tie)
  let favStage = -1, favStarts = -1;
  for (let i = 0; i < levelArr.length; i++) {
    if (levelArr[i].starts > favStarts) { favStarts = levelArr[i].starts; favStage = i; }
  }

  // Latest equipment from latest level_start
  let equipment = null;
  if (latestStartRow && latestStartRow.data) {
    try {
      const d = JSON.parse(latestStartRow.data);
      equipment = { skills: d.skills || [], cosmetics: d.cosmetics || {}, inv: d.inv || {} };
    } catch (_) {}
  }

  // Hourly heatmap (24-hour)
  const hourly = new Array(24).fill(0);
  if (hourlyRows && hourlyRows.results) for (const r of hourlyRows.results) hourly[r.hr] = r.c;

  // Owned items derived from purchases
  const purchases = (purchasesRows && purchasesRows.results) || [];
  const ownedSkills = [], ownedCosmetics = [], ownedConsumables = [];
  let totalGoldSpent = 0, totalSilverSpent = 0;
  for (const p of purchases) {
    if (p.kind === 'skill') ownedSkills.push({ id: p.id, count: p.c, cost: p.total_spent, lastBuy: p.last_buy });
    else if (p.kind === 'cosmetic') ownedCosmetics.push({ id: p.id, cat: p.cat, count: p.c, cost: p.total_spent });
    else if (p.kind === 'consumable') ownedConsumables.push({ id: p.id, count: p.c, cost: p.total_spent });
    if (p.currency === 'gold') totalGoldSpent += (p.total_spent || 0);
    else if (p.currency === 'silver') totalSilverSpent += (p.total_spent || 0);
  }

  // Aggregate gold/silver earned across all completions
  let totalGoldEarned = 0, totalSilverEarned = 0;
  for (const l of levelArr) { totalGoldEarned += l.gold; totalSilverEarned += l.silver; }

  // Returning player heuristic: > 1 day between first_seen and last_seen, or sessions > 1
  const sessionCount = sessionsRows ? sessionsRows.count : 0;
  const daysActive = profileRow.first_seen ? Math.max(1, Math.ceil((profileRow.last_seen - profileRow.first_seen) / 86400000)) : 0;
  const isReturning = sessionCount > 1 || daysActive > 1;
  const isChampion = levelArr.filter(l => l.completes > 0).length >= 20;

  // Recent activity
  const recent = (recentRows && recentRows.results) || [];

  // Most-used skill = skill that appears in most level_start events
  // Simplified: skill in latest equipment is the "current"
  // For favorites we'll rely on latest equipment + purchase history

  return jsonResponse({
    ok: true,
    data: {
      pid,
      name: profileRow.name,
      firstSeen: profileRow.first_seen,
      lastSeen: profileRow.last_seen,
      daysActive,
      sessionCount,
      isReturning,
      isChampion,
      totalEvents: profileRow.total_events,
      verifiedEvents: profileRow.verified,
      verifiedRatio: profileRow.total_events > 0 ? Math.round((profileRow.verified / profileRow.total_events) * 100) : 0,
      uniqueLevels: profileRow.unique_levels,
      country: countryRow && countryRow.results && countryRow.results[0] ? countryRow.results[0].cc : null,
      countryHistory: (countryRow && countryRow.results) || [],
      screen: screenRow ? screenRow.scr : null,
      language: langRow ? langRow.lang : null,
      eventsByType: ((byTypeRows && byTypeRows.results) || []).reduce((m, r) => { m[r.type] = r.c; return m; }, {}),
      perLevel: levelArr,
      favoriteStage: favStage,
      equipment,
      hourlyActivity: hourly,
      deathCauses: (deathCausesRows && deathCausesRows.results) || [],
      ownedSkills,
      ownedCosmetics,
      ownedConsumables,
      totalGoldEarned,
      totalSilverEarned,
      totalGoldSpent: Math.round(totalGoldSpent),
      totalSilverSpent: Math.round(totalSilverSpent),
      goldBalance: Math.round(totalGoldEarned - totalGoldSpent),
      silverBalance: Math.round(totalSilverEarned - totalSilverSpent),
      recent,
      flag: flagRow ? { flag_type: flagRow.flag_type, reason: flagRow.reason, flagged_at: flagRow.flagged_at } : null,
      generatedAt: Date.now(),
    },
  });
}

// === Sync handlers ===

async function checkSyncLockout(keyHash, env) {
  const row = await env.DB.prepare('SELECT fails, last_fail_at FROM sync_attempts WHERE key_hash = ?').bind(keyHash).first();
  if (!row) return { locked: false };
  if (row.fails >= SYNC_LOCKOUT_THRESHOLD && Date.now() - row.last_fail_at < SYNC_LOCKOUT_DURATION_MS) {
    return { locked: true, retryAfter: Math.ceil((SYNC_LOCKOUT_DURATION_MS - (Date.now() - row.last_fail_at)) / 1000) };
  }
  return { locked: false };
}

async function recordSyncFail(keyHash, env) {
  const row = await env.DB.prepare('SELECT fails FROM sync_attempts WHERE key_hash = ?').bind(keyHash).first();
  const fails = (row ? row.fails : 0) + 1;
  await env.DB.prepare(
    'INSERT INTO sync_attempts (key_hash, fails, last_fail_at) VALUES (?, ?, ?) ON CONFLICT(key_hash) DO UPDATE SET fails = excluded.fails, last_fail_at = excluded.last_fail_at'
  ).bind(keyHash, fails, Date.now()).run();
}

async function clearSyncFails(keyHash, env) {
  await env.DB.prepare('DELETE FROM sync_attempts WHERE key_hash = ?').bind(keyHash).run();
}

async function handleSyncSave(request, env) {
  const body = await readJsonBody(request);
  const { username, mmyy, pin, deviceId, data, rewards, pendingPurchases, ts } = body || {};

  if (!username || !mmyy || !pin || !data || typeof data !== 'object') {
    return errResponse('username, mmyy, pin, and data required', 400, true);
  }

  const ip = getClientIp(request);
  const ipKey = `sync-save:ip:${ip}`;
  if (isRateLimited(ipKey, SYNC_RATE_LIMIT_SAVE_WINDOW_MS, SYNC_RATE_LIMIT_SAVE_MAX)) {
    return new Response(JSON.stringify({ ok: false, error: 'rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(SYNC_RATE_LIMIT_SAVE_WINDOW_MS / 1000)), ...publicCorsHeaders() },
    });
  }

  const keyHash = await hashSyncKey(username, mmyy, pin, env.SYNC_SALT);
  const lockout = await checkSyncLockout(keyHash, env);
  if (lockout.locked) {
    return new Response(JSON.stringify({ ok: false, error: 'too many failed attempts' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(lockout.retryAfter), ...publicCorsHeaders() },
    });
  }

  const serverTs = Date.now();

  // Load existing sync state
  const existing = await env.DB.prepare('SELECT pid, data_json, rewards_json, purchase_json, device_ids FROM sync_states WHERE key_hash = ?').bind(keyHash).first();

  let mergedData = { ...data };
  let rewardsLog = {};
  let purchaseLog = [];
  let deviceIds = [];
  let existingPid = data.pid || null;

  if (existing) {
    existingPid = existing.pid;
    try {
      const decrypted = await aesDecrypt(existing.data_json, env.ENCRYPTION_KEY);
      if (decrypted) {
        const parsed = JSON.parse(decrypted);
        // Deep clone parsed as base so we don't lose any keys
        mergedData = JSON.parse(JSON.stringify(parsed));

        // Bring in brand-new top-level fields from data
        for (const key in data) {
          if (!(key in parsed)) {
            mergedData[key] = data[key];
          }
        }

        // Scores: per-level max (iterate ALL keys from BOTH)
        if (parsed.scores || data.scores) {
          mergedData.scores = mergedData.scores || {};
          const allKeys = new Set([...Object.keys(parsed.scores || {}), ...Object.keys(data.scores || {})]);
          for (const k of allKeys) {
            const pv = (parsed.scores && parsed.scores[k]) || 0;
            const dv = (data.scores && data.scores[k]) || 0;
            mergedData.scores[k] = Math.max(pv, dv);
          }
        }

        // Times: per-level min
        if (parsed.times || data.times) {
          mergedData.times = mergedData.times || {};
          const allKeys = new Set([...Object.keys(parsed.times || {}), ...Object.keys(data.times || {})]);
          for (const k of allKeys) {
            const pv = (parsed.times && parsed.times[k]) || Infinity;
            const dv = (data.times && data.times[k]) || Infinity;
            mergedData.times[k] = Math.min(pv, dv);
          }
        }

        // Chips: per-level OR
        if (parsed.chips || data.chips) {
          mergedData.chips = mergedData.chips || {};
          const allKeys = new Set([...Object.keys(parsed.chips || {}), ...Object.keys(data.chips || {})]);
          for (const k of allKeys) {
            const pa = (parsed.chips && parsed.chips[k]) || [];
            const da = (data.chips && data.chips[k]) || [];
            const maxLen = Math.max(pa.length, da.length);
            const merged = [];
            for (let i = 0; i < maxLen; i++) {
              merged[i] = !!pa[i] || !!da[i];
            }
            mergedData.chips[k] = merged;
          }
        }

        // Stats: per-level deep merge
        if (parsed.stats || data.stats) {
          mergedData.stats = mergedData.stats || {};
          const allKeys = new Set([...Object.keys(parsed.stats || {}), ...Object.keys(data.stats || {})]);
          for (const k of allKeys) {
            const ps = (parsed.stats && parsed.stats[k]) || {};
            const ds = (data.stats && data.stats[k]) || {};
            mergedData.stats[k] = {
              ...ps,
              ...ds,
              attempts: Math.max(ps.attempts || 0, ds.attempts || 0),
              completions: Math.max(ps.completions || 0, ds.completions || 0),
              hazards: Math.max(ps.hazards || 0, ds.hazards || 0),
              silver: Math.max(ps.silver || 0, ds.silver || 0),
              timePlayed: Math.max(ps.timePlayed || 0, ds.timePlayed || 0),
              contentVersion: Math.max(ps.contentVersion || 0, ds.contentVersion || 0),
              masterGems: Array.isArray(ds.masterGems) ? ds.masterGems.slice() : (Array.isArray(ps.masterGems) ? ps.masterGems.slice() : []),
            };
          }
        }

        // Unlocked: union
        if (Array.isArray(parsed.unlocked) || Array.isArray(data.unlocked)) {
          const uSet = new Set([...(parsed.unlocked || []), ...(data.unlocked || [])]);
          mergedData.unlocked = Array.from(uSet);
        }

        // Silver: max
        mergedData.silver = Math.max(parsed.silver || 0, data.silver || 0);
        // GoldSpent: max
        mergedData.goldSpent = Math.max(parsed.goldSpent || 0, data.goldSpent || 0);
        // BonusGold: max
        mergedData.bonusGold = Math.max(parsed.bonusGold || 0, data.bonusGold || 0);

        // Owned skills: union
        if (Array.isArray(parsed.ownedSkills) || Array.isArray(data.ownedSkills)) {
          mergedData.ownedSkills = Array.from(new Set([...(parsed.ownedSkills || []), ...(data.ownedSkills || [])]));
        }
        // Owned cosmetics: union
        if (Array.isArray(parsed.ownedCosmetics) || Array.isArray(data.ownedCosmetics)) {
          mergedData.ownedCosmetics = Array.from(new Set([...(parsed.ownedCosmetics || []), ...(data.ownedCosmetics || [])]));
        }
        // Equipped skills: cloud wins (latest device)
        if (Array.isArray(data.equippedSkills)) {
          mergedData.equippedSkills = data.equippedSkills.slice(0, 3);
        }
        // Equipped cosmetics: cloud wins
        if (data.equippedCosmetics && typeof data.equippedCosmetics === 'object') {
          mergedData.equippedCosmetics = { ...data.equippedCosmetics };
        }

        // Consumables: per-item max
        if (parsed.consumableInv || data.consumableInv) {
          mergedData.consumableInv = mergedData.consumableInv || {};
          const allKeys = new Set([...Object.keys(parsed.consumableInv || {}), ...Object.keys(data.consumableInv || {})]);
          for (const k of allKeys) {
            const pv = (parsed.consumableInv && parsed.consumableInv[k]) || 0;
            const dv = (data.consumableInv && data.consumableInv[k]) || 0;
            mergedData.consumableInv[k] = Math.max(pv, dv);
          }
        }

        // globalData: per-key max (cumulative stats)
        if (parsed.globalData || data.globalData) {
          mergedData.globalData = mergedData.globalData || {};
          const allKeys = new Set([...Object.keys(parsed.globalData || {}), ...Object.keys(data.globalData || {})]);
          for (const k of allKeys) {
            const pv = (parsed.globalData && parsed.globalData[k]) || 0;
            const dv = (data.globalData && data.globalData[k]) || 0;
            mergedData.globalData[k] = Math.max(pv, dv);
          }
        }

        // Champion status: OR
        if (parsed.championStatus || data.championStatus) {
          mergedData.championStatus = {
            ...(parsed.championStatus || {}),
            ...(data.championStatus || {}),
            unlocked: !!((parsed.championStatus && parsed.championStatus.unlocked) || (data.championStatus && data.championStatus.unlocked)),
          };
        }

        // Settings: cloud wins (latest device)
        const settingsKeys = ['sfx', 'mus', 'ctrl', 'vibrate', 'orient', 'visualQuality', 'ghostsEnabled', 'showFps', 'autoRetryDelay'];
        for (const sk of settingsKeys) {
          if (sk in data) mergedData[sk] = data[sk];
        }

        // Daily/streak: cloud wins
        if ('dailyStreak' in data) mergedData.dailyStreak = data.dailyStreak;
        if ('streakFreezes' in data) mergedData.streakFreezes = data.streakFreezes;
        if (Array.isArray(data.frozenDays)) mergedData.frozenDays = data.frozenDays;
        if ('lastChest' in data) mergedData.lastChest = data.lastChest;
        if ('lastResurrect' in data) mergedData.lastResurrect = data.lastResurrect;
        if (Array.isArray(data.hintsSeen)) mergedData.hintsSeen = data.hintsSeen;
        if ('tutorialDone' in data) mergedData.tutorialDone = data.tutorialDone;
        if ('ctrlPicked' in data) mergedData.ctrlPicked = data.ctrlPicked;
      }
    } catch (_) {}

    try { rewardsLog = JSON.parse(existing.rewards_json) || {}; } catch (_) {}
    try { purchaseLog = JSON.parse(existing.purchase_json) || []; } catch (_) {}
    try { deviceIds = JSON.parse(existing.device_ids) || []; } catch (_) {}
  }

  // Deduplicate rewards
  const approvedRewards = [];
  if (Array.isArray(rewards)) {
    for (const r of rewards) {
      const key = r.type;
      if (rewardsLog[key] && rewardsLog[key].date === r.date) continue; // duplicate
      rewardsLog[key] = { date: r.date, silver: r.silver, reward: r.reward, claimedAt: serverTs };
      approvedRewards.push(r);
    }
  }

  // Deduplicate and validate purchases
  const approvedPurchases = [];
  const rejectedPurchases = [];
  if (Array.isArray(pendingPurchases)) {
    for (const p of pendingPurchases) {
      // Deduplicate by id + ts
      if (purchaseLog.find(x => x.id === p.id && x.ts === p.ts)) {
        rejectedPurchases.push({ ...p, reason: 'duplicate' });
        continue;
      }

      // Simple balance check: compute total earned vs total spent
      const totalSilverEarned = Object.values(mergedData.stats || {}).reduce((s, st) => s + (st.silver || 0), 0) +
        Object.values(rewardsLog).reduce((s, r) => s + (r.silver || 0), 0);
      const totalGoldEarned = Object.values(mergedData.scores || {}).reduce((s, sc) => s + Math.floor((sc || 0) / 50), 0) + (mergedData.bonusGold || 0);
      const totalSilverSpent = purchaseLog.filter(x => x.currency === 'silver').reduce((s, x) => s + (x.cost || 0), 0);
      const totalGoldSpent = purchaseLog.filter(x => x.currency === 'gold').reduce((s, x) => s + (x.cost || 0), 0);

      if (p.currency === 'silver' && totalSilverEarned - totalSilverSpent < p.cost) {
        rejectedPurchases.push({ ...p, reason: 'insufficient_silver' });
        continue;
      }
      if (p.currency === 'gold' && totalGoldEarned - totalGoldSpent < p.cost) {
        rejectedPurchases.push({ ...p, reason: 'insufficient_gold' });
        continue;
      }

      purchaseLog.push(p);
      approvedPurchases.push(p);
    }
  }

  // Device limit
  if (deviceId && !deviceIds.includes(deviceId)) {
    if (deviceIds.length >= SYNC_MAX_DEVICES) {
      return errResponse('device limit reached (max 3)', 403, true);
    }
    deviceIds.push(deviceId);
  }

  // Encrypt and save
  const encrypted = await aesEncrypt(JSON.stringify(mergedData), env.ENCRYPTION_KEY);

  // Archive to history
  if (existing) {
    await env.DB.prepare(
      'INSERT INTO sync_history (key_hash, version, data_json, created_at) VALUES (?, (SELECT COALESCE(MAX(version), 0) + 1 FROM sync_history WHERE key_hash = ?), ?, ?)'
    ).bind(keyHash, keyHash, existing.data_json, serverTs).run();
    // Trim old history
    await env.DB.prepare(
      'DELETE FROM sync_history WHERE key_hash = ? AND version <= (SELECT MAX(version) - ? FROM sync_history WHERE key_hash = ?)'
    ).bind(keyHash, SYNC_HISTORY_MAX, keyHash).run();
  }

  await env.DB.prepare(
    'INSERT INTO sync_states (key_hash, pid, data_json, rewards_json, purchase_json, device_ids, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(key_hash) DO UPDATE SET pid = excluded.pid, data_json = excluded.data_json, rewards_json = excluded.rewards_json, purchase_json = excluded.purchase_json, device_ids = excluded.device_ids, updated_at = excluded.updated_at'
  ).bind(keyHash, existingPid, encrypted, JSON.stringify(rewardsLog), JSON.stringify(purchaseLog), JSON.stringify(deviceIds), serverTs).run();

  // Upsert username+mmyy lookup for forgot-pin support
  try {
    const userName = (data && data.playerName) || '';
    const userMmyy = (data && data.playerMmyy) || '';
    if (userName && userMmyy) {
      await env.DB.prepare(
        'CREATE TABLE IF NOT EXISTS sync_lookup (username TEXT, mmyy TEXT, key_hash TEXT PRIMARY KEY)'
      ).run();
      await env.DB.prepare(
        'INSERT INTO sync_lookup (username, mmyy, key_hash) VALUES (?, ?, ?) ON CONFLICT(key_hash) DO UPDATE SET username = excluded.username, mmyy = excluded.mmyy'
      ).bind(userName, userMmyy, keyHash).run();
    }
  } catch (_) {}

  await clearSyncFails(keyHash, env);

  return jsonResponse({ ok: true, approvedPurchases, rejectedPurchases, serverTs }, 200, true);
}

async function handleSyncLoad(request, env) {
  const body = await readJsonBody(request);
  const { username, mmyy, pin, deviceId } = body || {};

  if (!username || !mmyy || !pin) {
    return errResponse('username, mmyy, and pin required', 400, true);
  }

  const ip = getClientIp(request);
  const ipKey = `sync-load:ip:${ip}`;
  if (isRateLimited(ipKey, SYNC_RATE_LIMIT_LOAD_WINDOW_MS, SYNC_RATE_LIMIT_LOAD_MAX)) {
    return new Response(JSON.stringify({ ok: false, error: 'rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(SYNC_RATE_LIMIT_LOAD_WINDOW_MS / 1000)), ...publicCorsHeaders() },
    });
  }

  const keyHash = await hashSyncKey(username, mmyy, pin, env.SYNC_SALT);
  const lockout = await checkSyncLockout(keyHash, env);
  if (lockout.locked) {
    return new Response(JSON.stringify({ ok: false, error: 'too many failed attempts' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(lockout.retryAfter), ...publicCorsHeaders() },
    });
  }

  const row = await env.DB.prepare('SELECT pid, data_json, rewards_json, purchase_json, device_ids, updated_at FROM sync_states WHERE key_hash = ?').bind(keyHash).first();
  if (!row) {
    await recordSyncFail(keyHash, env);
    return errResponse('invalid credentials', 401, true);
  }

  // Validate device
  let deviceIds = [];
  try { deviceIds = JSON.parse(row.device_ids) || []; } catch (_) {}
  if (deviceId && !deviceIds.includes(deviceId)) {
    if (deviceIds.length >= SYNC_MAX_DEVICES) {
      return errResponse('device limit reached', 403, true);
    }
    // Auto-register new device on load if within limit
    deviceIds.push(deviceId);
    await env.DB.prepare('UPDATE sync_states SET device_ids = ? WHERE key_hash = ?').bind(JSON.stringify(deviceIds), keyHash).run();
  }

  const decrypted = await aesDecrypt(row.data_json, env.ENCRYPTION_KEY);
  if (!decrypted) {
    return errResponse('decryption failed', 500, true);
  }

  let data;
  try { data = JSON.parse(decrypted); } catch (_) {
    return errResponse('corrupt data', 500, true);
  }

  let rewardsLog = {};
  let purchaseLog = [];
  try { rewardsLog = JSON.parse(row.rewards_json) || {}; } catch (_) {}
  try { purchaseLog = JSON.parse(row.purchase_json) || []; } catch (_) {}

  await clearSyncFails(keyHash, env);

  // Backfill sync_lookup for old accounts
  try {
    const userName = (data && data.playerName) || '';
    const userMmyy = (data && data.playerMmyy) || '';
    if (userName && userMmyy) {
      await env.DB.prepare(
        'CREATE TABLE IF NOT EXISTS sync_lookup (username TEXT, mmyy TEXT, key_hash TEXT PRIMARY KEY)'
      ).run();
      await env.DB.prepare(
        'INSERT INTO sync_lookup (username, mmyy, key_hash) VALUES (?, ?, ?) ON CONFLICT(key_hash) DO UPDATE SET username = excluded.username, mmyy = excluded.mmyy'
      ).bind(userName, userMmyy, keyHash).run();
    }
  } catch (_) {}

  return jsonResponse({
    ok: true,
    data,
    pid: row.pid,
    rewardsLog,
    purchaseLog,
    deviceIds,
    updatedAt: row.updated_at,
  }, 200, true);
}

async function handleSyncCheck(request, env) {
  const body = await readJsonBody(request);
  const { username, mmyy, pin } = body || {};

  if (!username || !mmyy || !pin) {
    return errResponse('username, mmyy, and pin required', 400, true);
  }

  const keyHash = await hashSyncKey(username, mmyy, pin, env.SYNC_SALT);
  const row = await env.DB.prepare('SELECT data_json, device_ids, updated_at FROM sync_states WHERE key_hash = ?').bind(keyHash).first();

  if (!row) {
    console.log('[SYNC CHECK] Not found for username:', String(username).toUpperCase(), 'mmyy:', mmyy);
    return jsonResponse({ ok: false, found: false, error: 'invalid credentials' }, 401, true);
  }

  // Build a lightweight summary from encrypted data (no decryption needed for meta)
  let deviceCount = 0;
  try {
    const ids = JSON.parse(row.device_ids);
    deviceCount = Array.isArray(ids) ? ids.length : 0;
  } catch (_) {}

  // Try to decrypt for a data summary
  let summary = {};
  try {
    const decrypted = await aesDecrypt(row.data_json, env.ENCRYPTION_KEY);
    if (decrypted) {
      const d = JSON.parse(decrypted);
      const levelsCleared = Object.keys(d.stats || {}).filter(k => d.stats[k] && d.stats[k].completions > 0).length;
      summary = {
        playerName: d.playerName || '',
        silver: d.silver || 0,
        gold: (d.scores ? Object.keys(d.scores).reduce((s, k) => s + Math.floor((d.scores[k] || 0) / 50), 0) : 0) + (d.bonusGold || 0),
        levelsCleared: levelsCleared,
        totalLevels: Object.keys(d.scores || {}).length,
        deviceCount: deviceCount,
        updatedAt: row.updated_at,
      };
    }
  } catch (_) {}

  return jsonResponse({ ok: true, found: true, summary }, 200, true);
}

async function handleSyncChangePin(request, env) {
  const body = await readJsonBody(request);
  const { username, mmyy, oldPin, newPin } = body || {};

  if (!username || !mmyy || !oldPin || !newPin) {
    return errResponse('username, mmyy, oldPin, and newPin required', 400, true);
  }

  const ip = getClientIp(request);
  const ipKey = `sync-changepin:ip:${ip}`;
  if (isRateLimited(ipKey, SYNC_RATE_LIMIT_SAVE_WINDOW_MS, SYNC_RATE_LIMIT_SAVE_MAX)) {
    return new Response(JSON.stringify({ ok: false, error: 'rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(SYNC_RATE_LIMIT_SAVE_WINDOW_MS / 1000)), ...publicCorsHeaders() },
    });
  }

  const oldKeyHash = await hashSyncKey(username, mmyy, oldPin, env.SYNC_SALT);
  const row = await env.DB.prepare('SELECT pid, data_json, rewards_json, purchase_json, updated_at FROM sync_states WHERE key_hash = ?').bind(oldKeyHash).first();
  if (!row) {
    return errResponse('invalid credentials', 401, true);
  }

  const newKeyHash = await hashSyncKey(username, mmyy, newPin, env.SYNC_SALT);
  const collision = await env.DB.prepare('SELECT 1 FROM sync_states WHERE key_hash = ?').bind(newKeyHash).first();
  if (collision) {
    return errResponse('new pin collision, try another', 409, true);
  }

  // Move row to new key hash, clear device IDs
  await env.DB.prepare(
    'INSERT INTO sync_states (key_hash, pid, data_json, rewards_json, purchase_json, device_ids, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(newKeyHash, row.pid, row.data_json, row.rewards_json, row.purchase_json, '[]', Date.now()).run();

  await env.DB.prepare('DELETE FROM sync_states WHERE key_hash = ?').bind(oldKeyHash).run();
  await env.DB.prepare('DELETE FROM sync_attempts WHERE key_hash = ?').bind(oldKeyHash).run();
  await env.DB.prepare('DELETE FROM sync_lookup WHERE key_hash = ?').bind(oldKeyHash).run();

  try {
    await env.DB.prepare(
      'INSERT INTO sync_lookup (username, mmyy, key_hash) VALUES (?, ?, ?) ON CONFLICT(key_hash) DO UPDATE SET username = excluded.username, mmyy = excluded.mmyy'
    ).bind(String(username).toUpperCase(), String(mmyy), newKeyHash).run();
  } catch (_) {}

  return jsonResponse({ ok: true }, 200, true);
}

async function handleSyncForgotPin(request, env) {
  const body = await readJsonBody(request);
  const { username, mmyy, newPin } = body || {};

  if (!username || !mmyy || !newPin) {
    return errResponse('username, mmyy, and newPin required', 400, true);
  }
  if (String(username).length < 5 || String(username).length > 10) {
    return errResponse('username must be 5-10 chars', 400, true);
  }
  if (!/^[0-9]{4}$/.test(String(mmyy))) {
    return errResponse('mmyy must be 4 digits', 400, true);
  }
  if (!/^[0-9]{6}$/.test(String(newPin))) {
    return errResponse('newPin must be 6 digits', 400, true);
  }

  const ip = getClientIp(request);
  const ipKey = `sync-forgotpin:ip:${ip}`;
  if (isRateLimited(ipKey, SYNC_RATE_LIMIT_SAVE_WINDOW_MS, 3)) {
    return new Response(JSON.stringify({ ok: false, error: 'rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(SYNC_RATE_LIMIT_SAVE_WINDOW_MS / 1000)), ...publicCorsHeaders() },
    });
  }

  // Ensure sync_lookup table exists
  try {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS sync_lookup (username TEXT, mmyy TEXT, key_hash TEXT PRIMARY KEY)').run();
  } catch (_) {}

  // Lookup existing account by username+mmyy
  let lookupRow = null;
  try {
    lookupRow = await env.DB.prepare('SELECT key_hash FROM sync_lookup WHERE username = ? AND mmyy = ?').bind(username, mmyy).first();
  } catch (_) {}

  // Fallback: scan sync_states for old accounts created before sync_lookup existed
  if (!lookupRow || !lookupRow.key_hash) {
    try {
      const allRows = await env.DB.prepare('SELECT key_hash, data_json FROM sync_states LIMIT 500').all();
      for (const r of allRows.results || []) {
        try {
          const decrypted = await aesDecrypt(r.data_json, env.ENCRYPTION_KEY);
          if (decrypted) {
            const parsed = JSON.parse(decrypted);
            if (parsed.playerName === String(username).toUpperCase() && parsed.playerMmyy === String(mmyy)) {
              lookupRow = { key_hash: r.key_hash };
              // Backfill sync_lookup for future forgot-pin calls
              try {
                await env.DB.prepare(
                  'INSERT INTO sync_lookup (username, mmyy, key_hash) VALUES (?, ?, ?) ON CONFLICT(key_hash) DO UPDATE SET username = excluded.username, mmyy = excluded.mmyy'
                ).bind(String(username).toUpperCase(), String(mmyy), r.key_hash).run();
              } catch (_) {}
              break;
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  if (!lookupRow || !lookupRow.key_hash) {
    return errResponse('no account found with that username and birthday', 404, true);
  }

  const oldKeyHash = lookupRow.key_hash;
  const newKeyHash = await hashSyncKey(username, mmyy, newPin, env.SYNC_SALT);

  // If new key hash is same as old, PIN hasn't changed
  if (newKeyHash === oldKeyHash) {
    return errResponse('new pin must be different from old pin', 409, true);
  }

  const collision = await env.DB.prepare('SELECT 1 FROM sync_states WHERE key_hash = ?').bind(newKeyHash).first();
  if (collision) {
    return errResponse('new pin collision, try another', 409, true);
  }

  const row = await env.DB.prepare('SELECT pid, data_json, rewards_json, purchase_json FROM sync_states WHERE key_hash = ?').bind(oldKeyHash).first();
  if (!row) {
    return errResponse('account data missing', 500, true);
  }

  // Migrate to new key hash, clear device IDs, update PIN inside encrypted data
  let updatedData = row.data_json;
  try {
    const decrypted = await aesDecrypt(row.data_json, env.ENCRYPTION_KEY);
    if (decrypted) {
      const parsed = JSON.parse(decrypted);
      parsed.syncPin = newPin; // update PIN inside data too
      updatedData = await aesEncrypt(JSON.stringify(parsed), env.ENCRYPTION_KEY);
    }
  } catch (_) {}

  await env.DB.prepare(
    'INSERT INTO sync_states (key_hash, pid, data_json, rewards_json, purchase_json, device_ids, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(newKeyHash, row.pid, updatedData, row.rewards_json, row.purchase_json, '[]', Date.now()).run();

  await env.DB.prepare('DELETE FROM sync_states WHERE key_hash = ?').bind(oldKeyHash).run();
  await env.DB.prepare('DELETE FROM sync_attempts WHERE key_hash = ?').bind(oldKeyHash).run();
  await env.DB.prepare('DELETE FROM sync_lookup WHERE key_hash = ?').bind(oldKeyHash).run();

  // Insert new lookup row for the new key hash
  try {
    await env.DB.prepare(
      'INSERT INTO sync_lookup (username, mmyy, key_hash) VALUES (?, ?, ?) ON CONFLICT(key_hash) DO UPDATE SET username = excluded.username, mmyy = excluded.mmyy'
    ).bind(String(username).toUpperCase(), String(mmyy), newKeyHash).run();
  } catch (_) {}

  return jsonResponse({ ok: true, newKeyHash }, 200, true);
}

// === Admin: Player flags ===

async function handleAdminFlagPlayer(request, env) {
  const body = await readJsonBody(request);
  const { pid, reason } = body || {};
  if (!pid || !PID_REGEX.test(pid)) return errResponse('invalid pid', 400);
  await env.DB.prepare(
    "INSERT INTO player_flags (pid, flag_type, reason, flagged_by, flagged_at) VALUES (?, 'review', ?, 'dashboard', ?) ON CONFLICT(pid) DO UPDATE SET flag_type='review', reason=excluded.reason, flagged_at=excluded.flagged_at"
  ).bind(pid, reason || null, Date.now()).run();
  return jsonResponse({ ok: true });
}

async function handleAdminUnflagPlayer(request, env) {
  const body = await readJsonBody(request);
  const { pid } = body || {};
  if (!pid || !PID_REGEX.test(pid)) return errResponse('invalid pid', 400);
  await env.DB.prepare("DELETE FROM player_flags WHERE pid = ?").bind(pid).run();
  _bannedPids = null; // invalidate cache
  return jsonResponse({ ok: true });
}

async function handleAdminBanPid(request, env) {
  const body = await readJsonBody(request);
  const { pid, reason } = body || {};
  if (!pid || !PID_REGEX.test(pid)) return errResponse('invalid pid', 400);
  await env.DB.prepare(
    "INSERT INTO player_flags (pid, flag_type, reason, flagged_by, flagged_at) VALUES (?, 'banned', ?, 'dashboard', ?) ON CONFLICT(pid) DO UPDATE SET flag_type='banned', reason=excluded.reason, flagged_at=excluded.flagged_at"
  ).bind(pid, reason || null, Date.now()).run();
  _bannedPids = null; // invalidate cache
  return jsonResponse({ ok: true });
}

async function handleAdminUnbanPid(request, env) {
  const body = await readJsonBody(request);
  const { pid } = body || {};
  if (!pid || !PID_REGEX.test(pid)) return errResponse('invalid pid', 400);
  await env.DB.prepare("DELETE FROM player_flags WHERE pid = ?").bind(pid).run();
  _bannedPids = null; // invalidate cache
  return jsonResponse({ ok: true });
}

async function handleAdminFeedbackMarkRead(request, env) {
  const body = await readJsonBody(request);
  const { eventId, status, notes } = body || {};
  if (!eventId || typeof eventId !== 'number') return errResponse('eventId required', 400);
  if (!['open', 'read', 'resolved'].includes(status)) return errResponse('status must be open|read|resolved', 400);
  await env.DB.prepare(
    "INSERT INTO feedback_status (event_id, status, notes, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(event_id) DO UPDATE SET status=excluded.status, notes=excluded.notes, updated_at=excluded.updated_at"
  ).bind(eventId, status, notes || null, Date.now()).run();
  // Invalidate feedback cache
  _cache.delete('feedback:latest');
  return jsonResponse({ ok: true });
}

async function handleStatsFlaggedPlayers(env, force) {
  return cachedJson('flagged-players', async () => {
    const rows = await env.DB.prepare(
      "SELECT pf.pid, pf.flag_type, pf.reason, pf.flagged_at, MAX(e.name) as name, MAX(e.server_ts) as last_seen, COUNT(e.id) as events FROM player_flags pf LEFT JOIN events e ON e.pid = pf.pid GROUP BY pf.pid ORDER BY pf.flagged_at DESC"
    ).all();
    return { ok: true, data: { players: (rows && rows.results) || [] } };
  }, force);
}

async function handleAdminSyncResetPin(request, env) {
  const body = await readJsonBody(request);
  const { keyHash, newPin } = body || {};

  if (!keyHash || !newPin) {
    return errResponse('keyHash and newPin required', 400);
  }

  const row = await env.DB.prepare('SELECT username FROM sync_states WHERE key_hash = ?').bind(keyHash).first();
  if (!row) {
    return errResponse('sync state not found', 404);
  }

  // Extract username from decrypted data to compute new hash
  const decrypted = await aesDecrypt(row.data_json, env.ENCRYPTION_KEY);
  let username = '';
  let mmyy = '';
  try {
    const parsed = JSON.parse(decrypted || '{}');
    username = parsed.playerName || '';
    mmyy = parsed.playerMmyy || '';
  } catch (_) {}

  const newKeyHash = await hashSyncKey(username, mmyy, newPin, env.SYNC_SALT);
  const collision = await env.DB.prepare('SELECT 1 FROM sync_states WHERE key_hash = ?').bind(newKeyHash).first();
  if (collision) {
    return errResponse('new pin collision', 409);
  }

  await env.DB.prepare(
    'UPDATE sync_states SET key_hash = ?, device_ids = ?, updated_at = ? WHERE key_hash = ?'
  ).bind(newKeyHash, '[]', Date.now(), keyHash).run();

  await env.DB.prepare('DELETE FROM sync_lookup WHERE key_hash = ?').bind(keyHash).run();
  try {
    await env.DB.prepare(
      'INSERT INTO sync_lookup (username, mmyy, key_hash) VALUES (?, ?, ?) ON CONFLICT(key_hash) DO UPDATE SET username = excluded.username, mmyy = excluded.mmyy'
    ).bind(String(username).toUpperCase(), String(mmyy), newKeyHash).run();
  } catch (_) {}

  return jsonResponse({ ok: true, newKeyHash }, 200);
}

// === Search endpoint ===
async function handleStatsSearch(env, url, force) {
  let q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit')) || 20, 1), 50);
  if (q.length < 1 || q.length > 50) {
    return jsonResponse({ ok: true, data: { players: [] } });
  }
  // Escape SQL LIKE wildcards in user input
  const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
  const pattern = '%' + escaped.toLowerCase() + '%';
  const cacheKey = 'search:' + q.toLowerCase();
  const data = await cachedJson(cacheKey, async () => {
    const rows = await env.DB.prepare(
      "SELECT pid, MAX(name) as name, MAX(server_ts) as last_seen, COUNT(*) as events FROM events WHERE (LOWER(name) LIKE ? ESCAPE '\\' OR pid LIKE ? ESCAPE '\\') AND name IS NOT NULL GROUP BY pid ORDER BY last_seen DESC LIMIT ?"
    ).bind(pattern, pattern, limit).all();
    return { players: (rows && rows.results) || [] };
  }, force);
  return jsonResponse({ ok: true, data });
}

// === Pre-aggregation ===

async function aggregateDailyStats(env, daysBack) {
  const now = Date.now();
  const target = new Date(now - daysBack * 86400000);
  const dateUtc = target.toISOString().slice(0, 10); // YYYY-MM-DD
  const dayStartDate = new Date(dateUtc + 'T00:00:00Z');
  const dayStart = dayStartDate.getTime();
  const dayEnd = dayStart + 86400000;

  // Per-level aggregation
  const rows = await env.DB.prepare(`
    SELECT
      level,
      SUM(CASE WHEN type='level_start' THEN 1 ELSE 0 END) as starts,
      SUM(CASE WHEN type='level_complete' THEN 1 ELSE 0 END) as completes,
      SUM(CASE WHEN type='level_death' THEN 1 ELSE 0 END) as deaths,
      COUNT(DISTINCT pid) as unique_players,
      SUM(CASE WHEN type='session_start' THEN 1 ELSE 0 END) as sessions,
      SUM(CASE WHEN type='heartbeat' THEN 1 ELSE 0 END) as heartbeats
    FROM events
    WHERE server_ts >= ? AND server_ts < ?
    GROUP BY level
  `).bind(dayStart, dayEnd).all();

  // Economy data
  const econRows = await env.DB.prepare(`
    SELECT
      level,
      SUM(CASE WHEN type='level_complete' AND verified=1 THEN CAST(JSON_EXTRACT(data,'$.gold') AS REAL) ELSE 0 END) as gold_earned,
      SUM(CASE WHEN type='level_complete' AND verified=1 THEN CAST(JSON_EXTRACT(data,'$.silver') AS REAL) ELSE 0 END) as silver_earned,
      SUM(CASE WHEN type='purchase' AND JSON_EXTRACT(data,'$.currency')='gold' THEN CAST(JSON_EXTRACT(data,'$.cost') AS REAL) ELSE 0 END) as gold_spent,
      SUM(CASE WHEN type='purchase' AND JSON_EXTRACT(data,'$.currency')='silver' THEN CAST(JSON_EXTRACT(data,'$.cost') AS REAL) ELSE 0 END) as silver_spent
    FROM events
    WHERE server_ts >= ? AND server_ts < ?
    GROUP BY level
  `).bind(dayStart, dayEnd).all();

  // Completion times for p50/p95 (capped at 500 per level for speed)
  const timeRows = await env.DB.prepare(`
    SELECT level, CAST(JSON_EXTRACT(data,'$.time') AS REAL) as time
    FROM events
    WHERE type='level_complete' AND verified=1 AND server_ts >= ? AND server_ts < ?
      AND CAST(JSON_EXTRACT(data,'$.time') AS REAL) >= 5000
    ORDER BY level, time
    LIMIT 10000
  `).bind(dayStart, dayEnd).all();

  // Build time arrays per level
  const timesByLevel = {};
  if (timeRows && timeRows.results) {
    for (const r of timeRows.results) {
      const k = r.level == null ? -1 : r.level;
      if (!timesByLevel[k]) timesByLevel[k] = [];
      timesByLevel[k].push(r.time);
    }
  }

  function percentile(arr, p) {
    if (!arr || arr.length === 0) return null;
    const idx = Math.floor(arr.length * p);
    return arr[Math.min(idx, arr.length - 1)];
  }

  // Build econ map
  const econMap = {};
  if (econRows && econRows.results) {
    for (const r of econRows.results) econMap[r.level == null ? -1 : r.level] = r;
  }

  // Global totals
  let globalStarts = 0, globalCompletes = 0, globalDeaths = 0, globalSessions = 0, globalHeartbeats = 0;
  const globalPlayersRow = await env.DB.prepare('SELECT COUNT(DISTINCT pid) as c FROM events WHERE server_ts >= ? AND server_ts < ?').bind(dayStart, dayEnd).first();
  const globalPlayers = globalPlayersRow ? globalPlayersRow.c : 0;

  const computedAt = Date.now();
  const stmts = [];

  if (rows && rows.results) {
    for (const r of rows.results) {
      if (r.level == null) continue;
      globalStarts += r.starts || 0;
      globalCompletes += r.completes || 0;
      globalDeaths += r.deaths || 0;
      globalSessions += r.sessions || 0;
      globalHeartbeats += r.heartbeats || 0;

      const econ = econMap[r.level] || {};
      const times = timesByLevel[r.level];
      const avg = times && times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;

      stmts.push(env.DB.prepare(
        'INSERT OR REPLACE INTO stats_daily (date, level, starts, completes, deaths, unique_players, avg_ms, p50_ms, p95_ms, gold_earned, silver_earned, gold_spent, silver_spent, sessions, heartbeats, computed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(
        dateUtc, r.level, r.starts || 0, r.completes || 0, r.deaths || 0, r.unique_players || 0,
        avg, percentile(times, 0.5), percentile(times, 0.95),
        Math.round(econ.gold_earned || 0), Math.round(econ.silver_earned || 0),
        Math.round(econ.gold_spent || 0), Math.round(econ.silver_spent || 0),
        r.sessions || 0, r.heartbeats || 0, computedAt
      ));
    }
  }

  // Global row (level = NULL represented as -1 in PK since NULL can't be PK — use special value 99)
  const allTimes = Object.values(timesByLevel).flat().sort((a, b) => a - b);
  const globalEconRow = await env.DB.prepare(`
    SELECT
      SUM(CASE WHEN type='level_complete' AND verified=1 THEN CAST(JSON_EXTRACT(data,'$.gold') AS REAL) ELSE 0 END) as ge,
      SUM(CASE WHEN type='level_complete' AND verified=1 THEN CAST(JSON_EXTRACT(data,'$.silver') AS REAL) ELSE 0 END) as se,
      SUM(CASE WHEN type='purchase' AND JSON_EXTRACT(data,'$.currency')='gold' THEN CAST(JSON_EXTRACT(data,'$.cost') AS REAL) ELSE 0 END) as gs,
      SUM(CASE WHEN type='purchase' AND JSON_EXTRACT(data,'$.currency')='silver' THEN CAST(JSON_EXTRACT(data,'$.cost') AS REAL) ELSE 0 END) as ss
    FROM events WHERE server_ts >= ? AND server_ts < ?
  `).bind(dayStart, dayEnd).first();

  // Use level=99 as sentinel for "global" row (since NULL can't be part of composite PK)
  stmts.push(env.DB.prepare(
    'INSERT OR REPLACE INTO stats_daily (date, level, starts, completes, deaths, unique_players, avg_ms, p50_ms, p95_ms, gold_earned, silver_earned, gold_spent, silver_spent, sessions, heartbeats, computed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(
    dateUtc, 99, globalStarts, globalCompletes, globalDeaths, globalPlayers,
    allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : null,
    percentile(allTimes, 0.5), percentile(allTimes, 0.95),
    Math.round(globalEconRow?.ge || 0), Math.round(globalEconRow?.se || 0),
    Math.round(globalEconRow?.gs || 0), Math.round(globalEconRow?.ss || 0),
    globalSessions, globalHeartbeats, computedAt
  ));

  // Batch execute
  if (stmts.length > 0) {
    await env.DB.batch(stmts);
  }
  console.log('[AGGREGATE] date=' + dateUtc + ' rows=' + stmts.length);
}

async function computeRetention(env) {
  const now = Date.now();
  const twelveWeeksAgo = now - 12 * 7 * 86400000;

  const cohortRows = await env.DB.prepare(`
    SELECT pid, MIN(server_ts) as first_seen FROM events WHERE server_ts > ? GROUP BY pid
  `).bind(twelveWeeksAgo).all();

  if (!cohortRows || !cohortRows.results || cohortRows.results.length === 0) return;

  const weekMap = {};
  for (const r of cohortRows.results) {
    const d = new Date(r.first_seen);
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    const weekKey = d.getFullYear() + '-W' + String(weekNum).padStart(2, '0');
    if (!weekMap[weekKey]) weekMap[weekKey] = [];
    weekMap[weekKey].push(r);
  }

  const stmts = [];
  const computedAt = Date.now();
  for (const [week, members] of Object.entries(weekMap)) {
    let d1 = 0, d7 = 0, d30 = 0;
    for (const m of members) {
      const row = await env.DB.prepare(`
        SELECT
          EXISTS(SELECT 1 FROM events WHERE pid=? AND server_ts>=? AND server_ts<?) as d1,
          EXISTS(SELECT 1 FROM events WHERE pid=? AND server_ts>=? AND server_ts<?) as d7,
          EXISTS(SELECT 1 FROM events WHERE pid=? AND server_ts>=? AND server_ts<?) as d30
      `).bind(
        m.pid, m.first_seen + 86400000, m.first_seen + 2 * 86400000,
        m.pid, m.first_seen + 6 * 86400000, m.first_seen + 8 * 86400000,
        m.pid, m.first_seen + 29 * 86400000, m.first_seen + 31 * 86400000
      ).first();
      if (row) { if (row.d1) d1++; if (row.d7) d7++; if (row.d30) d30++; }
    }
    stmts.push(env.DB.prepare(
      'INSERT OR REPLACE INTO retention_daily (cohort_week, cohort_size, d1_retained, d7_retained, d30_retained, computed_at) VALUES (?,?,?,?,?,?)'
    ).bind(week, members.length, d1, d7, d30, computedAt));
  }
  if (stmts.length > 0) await env.DB.batch(stmts);
  console.log('[RETENTION] computed ' + stmts.length + ' cohort weeks');
}

// === Cron handler ===

async function handleCron(env) {
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 86400 * 1000;

  const deleteResult = await env.DB.prepare(
    'DELETE FROM sessions WHERE expires_ts < ?'
  ).bind(now).run();

  const sessionsResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM sessions'
  ).first();

  const eventsResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM events'
  ).first();

  const oldEventsResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM events WHERE server_ts < ?'
  ).bind(ninetyDaysAgo).first();

  console.log('[CRON] Expired sessions deleted:', deleteResult.meta?.changes ?? 0);
  console.log('[CRON] Remaining sessions:', sessionsResult?.count ?? 0);
  console.log('[CRON] Total events:', eventsResult?.count ?? 0);
  console.log('[CRON] Events older than 90 days:', oldEventsResult?.count ?? 0);

  // Phase 4: Aggregate daily stats
  try {
    await aggregateDailyStats(env, 0); // today (partial, refreshed hourly)
    await aggregateDailyStats(env, 1); // yesterday
  } catch (e) {
    console.log('[CRON] aggregation error:', e.message);
  }

  // Once daily at 1am UTC: recompute last 7 days + retention
  const hour = new Date(now).getUTCHours();
  if (hour === 1) {
    try {
      for (let d = 2; d <= 7; d++) await aggregateDailyStats(env, d);
      await computeRetention(env);
    } catch (e) {
      console.log('[CRON] daily recompute error:', e.message);
    }
  }
}

// === Retention cohorts ===
async function handleStatsRetention(env, range, force, before) {
  // TODO Phase 4+: fast path via retention_daily table
  const cacheKey = 'retention:' + range + '|' + (before || 0);
  return cachedJson(cacheKey, async () => {
    // Always look back 12 weeks for cohorts regardless of range
    const twelveWeeksAgo = (before || Date.now()) - 12 * 7 * 86400000;

    // Step 1: Get cohort assignments (first_seen per pid, bucketed by ISO week)
    const cohortRows = await env.DB.prepare(`
      SELECT pid, MIN(server_ts) as first_seen
      FROM events
      WHERE server_ts > ?
      GROUP BY pid
    `).bind(twelveWeeksAgo).all();

    if (!cohortRows || !cohortRows.results || cohortRows.results.length === 0) {
      return { ok: true, data: { cohorts: [] } };
    }

    // Bucket into weeks
    const weekMap = {}; // week_str -> [{pid, first_seen}]
    for (const r of cohortRows.results) {
      const d = new Date(r.first_seen);
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
      const weekKey = d.getFullYear() + '-W' + String(weekNum).padStart(2, '0');
      if (!weekMap[weekKey]) weekMap[weekKey] = [];
      weekMap[weekKey].push({ pid: r.pid, first_seen: r.first_seen });
    }

    // Step 2: For each cohort, check retention windows
    const cohorts = [];
    const sortedWeeks = Object.keys(weekMap).sort();

    for (const week of sortedWeeks) {
      const members = weekMap[week];
      const cohort_size = members.length;
      let d1 = 0, d7 = 0, d30 = 0;

      // Batch check: for each member, check if they have events in the retention windows
      for (const m of members) {
        const d1Start = m.first_seen + 24 * 3600000;
        const d1End = m.first_seen + 48 * 3600000;
        const d7Start = m.first_seen + 6 * 86400000;
        const d7End = m.first_seen + 8 * 86400000;
        const d30Start = m.first_seen + 29 * 86400000;
        const d30End = m.first_seen + 31 * 86400000;

        const row = await env.DB.prepare(`
          SELECT
            EXISTS(SELECT 1 FROM events WHERE pid=? AND server_ts>=? AND server_ts<?) as d1,
            EXISTS(SELECT 1 FROM events WHERE pid=? AND server_ts>=? AND server_ts<?) as d7,
            EXISTS(SELECT 1 FROM events WHERE pid=? AND server_ts>=? AND server_ts<?) as d30
        `).bind(m.pid, d1Start, d1End, m.pid, d7Start, d7End, m.pid, d30Start, d30End).first();

        if (row) {
          if (row.d1) d1++;
          if (row.d7) d7++;
          if (row.d30) d30++;
        }
      }

      cohorts.push({
        week,
        cohort_size,
        d1, d7, d30,
        d1_pct: cohort_size > 0 ? Math.round((d1 / cohort_size) * 100) : 0,
        d7_pct: cohort_size > 0 ? Math.round((d7 / cohort_size) * 100) : 0,
        d30_pct: cohort_size > 0 ? Math.round((d30 / cohort_size) * 100) : 0,
      });
    }

    return { ok: true, data: { cohorts } };
  }, force);
}

// === Onboarding funnel ===
async function handleStatsFunnel(env, range, force, before) {
  const cacheKey = 'funnel:' + range + '|' + (before || 0);
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range, before);
    const FIRST_SESSION_WINDOW = 30 * 60 * 1000; // 30 minutes

    // Stage 1: pids whose first_seen is in range
    const s1 = await env.DB.prepare(`
      SELECT pid, MIN(server_ts) as first_seen FROM events GROUP BY pid HAVING first_seen > ?
    `).bind(startTs).all();

    const newPids = (s1 && s1.results) || [];
    if (newPids.length === 0) {
      return { ok: true, data: { stages: [
        { key: 'session_start', label: 'New Players', count: 0, drop_pct: 0, conversion_pct: 100 },
        { key: 'name_set', label: 'Named', count: 0, drop_pct: 0, conversion_pct: 0 },
        { key: 'first_level_start', label: 'Started Lvl 1', count: 0, drop_pct: 0, conversion_pct: 0 },
        { key: 'first_level_complete', label: 'Completed Lvl 1', count: 0, drop_pct: 0, conversion_pct: 0 },
        { key: 'next_day_return', label: 'Next-Day Return', count: 0, drop_pct: 0, conversion_pct: 0 },
      ] } };
    }

    const pidSet = new Set(newPids.map(r => r.pid));
    const pidFirstSeen = {};
    for (const r of newPids) pidFirstSeen[r.pid] = r.first_seen;

    // Stage 2: name_set
    const s2 = await env.DB.prepare(`
      SELECT DISTINCT pid FROM events WHERE type='name_set' AND server_ts > ?
    `).bind(startTs).all();
    const namedPids = new Set(((s2 && s2.results) || []).filter(r => pidSet.has(r.pid)).map(r => r.pid));

    // Stage 3: started level 0 within first session (30 min of first_seen)
    const s3 = await env.DB.prepare(`
      SELECT DISTINCT pid FROM events WHERE type='level_start' AND level=0 AND server_ts > ?
    `).bind(startTs).all();
    const startedPids = new Set(((s3 && s3.results) || []).filter(r =>
      namedPids.has(r.pid)
    ).map(r => r.pid));

    // Stage 4: completed level 0 within first session
    const s4 = await env.DB.prepare(`
      SELECT DISTINCT pid FROM events WHERE type='level_complete' AND level=0 AND server_ts > ?
    `).bind(startTs).all();
    const completedPids = new Set(((s4 && s4.results) || []).filter(r =>
      startedPids.has(r.pid)
    ).map(r => r.pid));

    // Stage 5: next-day return (active 24-48h after first_seen)
    let nextDayCount = 0;
    for (const pid of completedPids) {
      const fs = pidFirstSeen[pid];
      const row = await env.DB.prepare(`
        SELECT 1 FROM events WHERE pid=? AND server_ts>=? AND server_ts<? LIMIT 1
      `).bind(pid, fs + 86400000, fs + 2 * 86400000).first();
      if (row) nextDayCount++;
    }

    const counts = [pidSet.size, namedPids.size, startedPids.size, completedPids.size, nextDayCount];
    const labels = ['New Players', 'Named', 'Started Lvl 1', 'Completed Lvl 1', 'Next-Day Return'];
    const keys = ['session_start', 'name_set', 'first_level_start', 'first_level_complete', 'next_day_return'];

    const stages = counts.map((count, i) => ({
      key: keys[i],
      label: labels[i],
      count,
      drop_pct: i > 0 && counts[i - 1] > 0 ? Math.round((1 - count / counts[i - 1]) * 100) : 0,
      conversion_pct: i > 0 && counts[i - 1] > 0 ? Math.round((count / counts[i - 1]) * 100) : 100,
    }));

    return { ok: true, data: { stages } };
  }, force);
}

// === Death cause × level matrix ===
async function handleStatsDeathMatrix(env, range, force, before) {
  const cacheKey = 'deathmatrix:' + range + '|' + (before || 0);
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range, before);
    const rows = await env.DB.prepare(`
      SELECT level, JSON_EXTRACT(data,'$.cause') as cause, COUNT(*) as c
      FROM events
      WHERE type='level_death' AND level IS NOT NULL AND server_ts > ?
      GROUP BY level, cause
    `).bind(startTs).all();

    const allCausesSet = new Set();
    const levelMap = {};
    if (rows && rows.results) {
      for (const r of rows.results) {
        const cause = r.cause || 'unknown';
        allCausesSet.add(cause);
        if (!levelMap[r.level]) levelMap[r.level] = { level: r.level, total: 0, causes: {} };
        levelMap[r.level].causes[cause] = r.c;
        levelMap[r.level].total += r.c;
      }
    }

    const levels = [];
    for (let i = 0; i < 20; i++) {
      levels.push(levelMap[i] || { level: i, total: 0, causes: {} });
    }

    return { ok: true, data: { levels, allCauses: Array.from(allCausesSet).sort() } };
  }, force);
}

// === Geographic aggregation ===
async function handleStatsGeo(env, range, force, before) {
  const cacheKey = 'geo:' + range + '|' + (before || 0);
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range, before);

    const countryRows = await env.DB.prepare(`
      SELECT
        JSON_EXTRACT(data,'$._cc') as cc,
        COUNT(*) as sessions,
        COUNT(DISTINCT pid) as players,
        SUM(CASE WHEN type='level_complete' THEN 1 ELSE 0 END) as completes,
        SUM(CASE WHEN type='level_death' THEN 1 ELSE 0 END) as deaths
      FROM events
      WHERE server_ts > ? AND JSON_EXTRACT(data,'$._cc') IS NOT NULL
      GROUP BY cc
      ORDER BY players DESC
      LIMIT 50
    `).bind(startTs).all();

    const countries = ((countryRows && countryRows.results) || []).map(r => ({
      cc: r.cc,
      sessions: r.sessions,
      players: r.players,
      completes: r.completes,
      deaths: r.deaths,
      completion_rate: (r.completes + r.deaths) > 0 ? Math.round((r.completes / (r.completes + r.deaths)) * 100) : 0,
    }));

    // Top 5 countries → region breakdown
    const top5 = countries.slice(0, 5).map(c => c.cc);
    const regions = {};
    if (top5.length > 0) {
      const regionRows = await env.DB.prepare(`
        SELECT
          JSON_EXTRACT(data,'$._cc') as cc,
          JSON_EXTRACT(data,'$._region') as region,
          COUNT(DISTINCT pid) as players,
          COUNT(*) as sessions
        FROM events
        WHERE server_ts > ? AND JSON_EXTRACT(data,'$._cc') IN (${top5.map(() => '?').join(',')}) AND JSON_EXTRACT(data,'$._region') IS NOT NULL
        GROUP BY cc, region
        ORDER BY players DESC
      `).bind(startTs, ...top5).all();

      if (regionRows && regionRows.results) {
        for (const r of regionRows.results) {
          if (!regions[r.cc]) regions[r.cc] = [];
          regions[r.cc].push({ region: r.region, players: r.players, sessions: r.sessions });
        }
      }
    }

    return { ok: true, data: { countries, regions } };
  }, force);
}

// === Completion time histogram ===
async function handleStatsTimeDistribution(env, range, force, before, level) {
  const cacheKey = 'timedist:' + level + ':' + range + '|' + (before || 0);
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range, before);
    const rows = await env.DB.prepare(`
      SELECT CAST(JSON_EXTRACT(data,'$.time') AS REAL) as time
      FROM events
      WHERE type='level_complete' AND verified=1 AND level=? AND server_ts > ?
        AND CAST(JSON_EXTRACT(data,'$.time') AS REAL) >= 5000
        AND CAST(JSON_EXTRACT(data,'$.time') AS REAL) <= 600000
      LIMIT 5000
    `).bind(level, startTs).all();

    const times = ((rows && rows.results) || []).map(r => r.time).filter(t => t != null).sort((a, b) => a - b);
    if (times.length === 0) {
      return { ok: true, data: { level, buckets: [], total: 0, p25: null, p50: null, p75: null, p99: null } };
    }

    const total = times.length;
    const p25 = times[Math.floor(total * 0.25)];
    const p50 = times[Math.floor(total * 0.50)];
    const p75 = times[Math.floor(total * 0.75)];
    const p99 = times[Math.min(total - 1, Math.floor(total * 0.99))];

    // Build 20 buckets between min and p99
    const minT = times[0];
    const maxT = p99;
    const bucketWidth = (maxT - minT) / 20;
    const buckets = [];
    for (let i = 0; i < 20; i++) {
      const from_ms = Math.round(minT + i * bucketWidth);
      const to_ms = Math.round(minT + (i + 1) * bucketWidth);
      const count = times.filter(t => t >= from_ms && (i === 19 ? t <= to_ms : t < to_ms)).length;
      buckets.push({ from_ms, to_ms, count });
    }

    return { ok: true, data: { level, buckets, total, p25: Math.round(p25), p50: Math.round(p50), p75: Math.round(p75), p99: Math.round(p99) } };
  }, force);
}

// === Champion progression funnel ===
async function handleStatsChampionFunnel(env, range, force, before) {
  const cacheKey = 'champfunnel:' + range + '|' + (before || 0);
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range, before);

    // Stage 1: cohort = pids with first_seen in range
    const cohortRows = await env.DB.prepare(`
      SELECT pid, MIN(server_ts) as first_seen FROM events GROUP BY pid HAVING first_seen > ?
    `).bind(startTs).all();

    const cohort = (cohortRows && cohortRows.results) || [];
    if (cohort.length === 0) {
      return { ok: true, data: { stages: [
        { key: 'cohort', label: 'New Players', count: 0, conversion_pct: 100 },
        { key: 'd1_retained', label: 'D1 Retained', count: 0, conversion_pct: 0 },
        { key: 'cleared_5', label: 'Cleared 5+ Levels', count: 0, conversion_pct: 0 },
        { key: 'cleared_10', label: 'Cleared 10+ Levels', count: 0, conversion_pct: 0 },
        { key: 'cleared_15', label: 'Cleared 15+ Levels', count: 0, conversion_pct: 0 },
        { key: 'champion', label: 'Champion (20)', count: 0, conversion_pct: 0 },
      ], medianTimeToChampionMs: null } };
    }

    const pidFirstSeen = {};
    for (const r of cohort) pidFirstSeen[r.pid] = r.first_seen;
    const cohortPids = cohort.map(r => r.pid);

    // Stage 2: D1 retained
    let d1Pids = [];
    for (const pid of cohortPids) {
      const fs = pidFirstSeen[pid];
      const row = await env.DB.prepare(`
        SELECT 1 FROM events WHERE pid=? AND server_ts>=? AND server_ts<? LIMIT 1
      `).bind(pid, fs + 86400000, fs + 2 * 86400000).first();
      if (row) d1Pids.push(pid);
    }

    // Stages 3-6: unique levels completed per pid (from d1 retained set)
    const levelCounts = {};
    if (d1Pids.length > 0) {
      for (const pid of d1Pids) {
        const row = await env.DB.prepare(`
          SELECT COUNT(DISTINCT level) as c FROM events WHERE pid=? AND type='level_complete'
        `).bind(pid).first();
        levelCounts[pid] = row ? row.c : 0;
      }
    }

    const cleared5 = d1Pids.filter(p => levelCounts[p] >= 5);
    const cleared10 = cleared5.filter(p => levelCounts[p] >= 10);
    const cleared15 = cleared10.filter(p => levelCounts[p] >= 15);
    const champions = cleared15.filter(p => levelCounts[p] >= 20);

    // Median time-to-champion
    let medianTimeToChampionMs = null;
    if (champions.length > 0) {
      const ttcList = [];
      for (const pid of champions) {
        const row = await env.DB.prepare(`
          SELECT MAX(server_ts) as last_complete FROM events WHERE pid=? AND type='level_complete'
        `).bind(pid).first();
        if (row && row.last_complete) {
          ttcList.push(row.last_complete - pidFirstSeen[pid]);
        }
      }
      if (ttcList.length > 0) {
        ttcList.sort((a, b) => a - b);
        medianTimeToChampionMs = ttcList[Math.floor(ttcList.length / 2)];
      }
    }

    const counts = [cohortPids.length, d1Pids.length, cleared5.length, cleared10.length, cleared15.length, champions.length];
    const keys = ['cohort', 'd1_retained', 'cleared_5', 'cleared_10', 'cleared_15', 'champion'];
    const labels = ['New Players', 'D1 Retained', 'Cleared 5+ Levels', 'Cleared 10+ Levels', 'Cleared 15+ Levels', 'Champion (20)'];

    const stages = counts.map((count, i) => ({
      key: keys[i],
      label: labels[i],
      count,
      conversion_pct: i > 0 && counts[i - 1] > 0 ? Math.round((count / counts[i - 1]) * 100) : 100,
    }));

    return { ok: true, data: { stages, medianTimeToChampionMs } };
  }, force);
}

// === Admin: backfill aggregation ===
async function handleAdminAggregate(request, env) {
  const url = new URL(request.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days')) || 30, 1), 90);
  const results = [];
  for (let d = 0; d < days; d++) {
    try {
      await aggregateDailyStats(env, d);
      results.push({ day: d, ok: true });
    } catch (e) {
      results.push({ day: d, ok: false, error: e.message });
    }
  }
  // Also compute retention
  try { await computeRetention(env); } catch (_) {}
  return jsonResponse({ ok: true, days, results });
}

// === Live feed polling endpoint ===
// NOTE: Cloudflare Workers free plan has a 30s response time limit, making true SSE infeasible.
// We implement a polling fallback: client polls every 2s with ?since=<ts> param.
// The client sends the last known server_ts and receives only newer events.
async function handleFeedStream(env, url) {
  const since = parseInt(url.searchParams.get('since')) || (Date.now() - 10000);
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);

  const rows = await env.DB.prepare(
    'SELECT id, pid, name, type, level, data, server_ts, verified FROM events WHERE server_ts > ? ORDER BY server_ts ASC LIMIT ?'
  ).bind(since, limit).all();

  const events = (rows && rows.results) || [];
  const nextSince = events.length > 0 ? Math.max(...events.map(e => e.server_ts)) : since;

  return jsonResponse({
    ok: true,
    data: { events, nextSince, serverTs: Date.now() },
  });
}

// === Anomaly detection ===
async function handleAnomalies(env, force) {
  return cachedJson('anomalies', async () => {
    const now = Date.now();
    const alerts = [];
    let alertId = 0;

    // Use stats_daily for fast lookups
    const today = new Date(now).toISOString().slice(0, 10);
    const d7ago = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
    const d35ago = new Date(now - 35 * 86400000).toISOString().slice(0, 10);

    // Check if stats_daily has data
    const hasData = await env.DB.prepare('SELECT COUNT(*) as c FROM stats_daily WHERE date >= ?').bind(d35ago).first();
    if (!hasData || hasData.c === 0) {
      return { ok: true, data: { alerts: [], computedAt: now, note: 'No aggregated data yet. Run /admin/aggregate to backfill.' } };
    }

    // Per-level anomalies
    for (let level = 0; level < 20; level++) {
      // Recent 7 days
      const recent = await env.DB.prepare(
        'SELECT SUM(starts) as starts, SUM(completes) as completes, SUM(deaths) as deaths, AVG(avg_ms) as avg_ms FROM stats_daily WHERE level=? AND date >= ? AND date <= ?'
      ).bind(level, d7ago, today).first();

      // Baseline: days 8-35
      const baseline = await env.DB.prepare(
        'SELECT SUM(starts) as starts, SUM(completes) as completes, SUM(deaths) as deaths, AVG(avg_ms) as avg_ms FROM stats_daily WHERE level=? AND date >= ? AND date < ?'
      ).bind(level, d35ago, d7ago).first();

      if (!recent || !baseline || !baseline.starts || baseline.starts < 5) continue;

      const recentCR = recent.starts > 0 ? recent.completes / recent.starts : 0;
      const baselineCR = baseline.starts > 0 ? baseline.completes / baseline.starts : 0;

      // Daily completion rates for stddev
      const dailyRows = await env.DB.prepare(
        'SELECT starts, completes FROM stats_daily WHERE level=? AND date >= ? AND date < ? AND starts > 0'
      ).bind(level, d35ago, d7ago).all();

      let stddev = 0;
      if (dailyRows && dailyRows.results && dailyRows.results.length > 1) {
        const rates = dailyRows.results.map(r => r.completes / r.starts);
        const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
        const variance = rates.reduce((a, r) => a + (r - mean) ** 2, 0) / rates.length;
        stddev = Math.sqrt(variance);
      }

      // Completion rate drop
      if (baselineCR > 0 && recentCR < baselineCR - 2 * stddev && stddev > 0) {
        const dropPct = Math.round((1 - recentCR / baselineCR) * 100);
        const severity = dropPct > 50 ? 'high' : dropPct > 25 ? 'medium' : 'low';
        alerts.push({
          id: ++alertId, severity, type: 'completion_rate_drop',
          message: `Level ${level + 1}: completion rate dropped ${dropPct}%`,
          level, value: Math.round(recentCR * 100), baseline: Math.round(baselineCR * 100),
          sigma: stddev > 0 ? Math.round((baselineCR - recentCR) / stddev * 10) / 10 : 0,
          since: d7ago,
        });
      }

      // Death rate spike
      const recentDR = recent.starts > 0 ? recent.deaths / recent.starts : 0;
      const baselineDR = baseline.starts > 0 ? baseline.deaths / baseline.starts : 0;
      if (baselineDR > 0 && dailyRows && dailyRows.results) {
        const deathDailyRows = await env.DB.prepare(
          'SELECT starts, deaths FROM stats_daily WHERE level=? AND date >= ? AND date < ? AND starts > 0'
        ).bind(level, d35ago, d7ago).all();
        if (deathDailyRows && deathDailyRows.results && deathDailyRows.results.length > 1) {
          const dRates = deathDailyRows.results.map(r => r.deaths / r.starts);
          const dMean = dRates.reduce((a, b) => a + b, 0) / dRates.length;
          const dVar = dRates.reduce((a, r) => a + (r - dMean) ** 2, 0) / dRates.length;
          const dStd = Math.sqrt(dVar);
          if (dStd > 0 && recentDR > dMean + 3 * dStd) {
            alerts.push({
              id: ++alertId, severity: 'medium', type: 'death_rate_spike',
              message: `Level ${level + 1}: death rate spiked (${Math.round(recentDR * 100)}% vs ${Math.round(baselineDR * 100)}% baseline)`,
              level, value: Math.round(recentDR * 100), baseline: Math.round(baselineDR * 100),
              sigma: Math.round((recentDR - dMean) / dStd * 10) / 10, since: d7ago,
            });
          }
        }
      }

      // Avg time slowdown >25%
      if (recent.avg_ms && baseline.avg_ms && baseline.avg_ms > 0) {
        const slowdown = (recent.avg_ms - baseline.avg_ms) / baseline.avg_ms;
        if (slowdown > 0.25) {
          alerts.push({
            id: ++alertId, severity: 'low', type: 'avg_time_slowdown',
            message: `Level ${level + 1}: avg completion time ${Math.round(slowdown * 100)}% slower`,
            level, value: Math.round(recent.avg_ms), baseline: Math.round(baseline.avg_ms),
            sigma: 0, since: d7ago,
          });
        }
      }
    }

    // Global: verified % drop
    const recentVerified = await env.DB.prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN verified=1 THEN 1 ELSE 0 END) as v FROM events WHERE server_ts >= ?"
    ).bind(now - 7 * 86400000).first();
    const baselineVerified = await env.DB.prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN verified=1 THEN 1 ELSE 0 END) as v FROM events WHERE server_ts >= ? AND server_ts < ?"
    ).bind(now - 35 * 86400000, now - 7 * 86400000).first();

    if (recentVerified && baselineVerified && recentVerified.total > 10 && baselineVerified.total > 10) {
      const recentPct = recentVerified.v / recentVerified.total * 100;
      const baselinePct = baselineVerified.v / baselineVerified.total * 100;
      const drop = baselinePct - recentPct;
      if (drop > 5) {
        const severity = drop > 10 ? 'high' : 'medium';
        alerts.push({
          id: ++alertId, severity, type: 'verified_pct_drop',
          message: `Verified event % dropped ${Math.round(drop)}pp (${Math.round(recentPct)}% vs ${Math.round(baselinePct)}%)`,
          value: Math.round(recentPct), baseline: Math.round(baselinePct), sigma: 0, since: d7ago,
        });
      }
    }

    // Global: DAU drop
    const recentDAU = await env.DB.prepare(
      'SELECT AVG(unique_players) as avg_dau FROM stats_daily WHERE level=99 AND date >= ?'
    ).bind(d7ago).first();
    const baselineDAU = await env.DB.prepare(
      'SELECT AVG(unique_players) as avg_dau FROM stats_daily WHERE level=99 AND date >= ? AND date < ?'
    ).bind(d35ago, d7ago).first();

    if (recentDAU && baselineDAU && baselineDAU.avg_dau > 0) {
      const dauRatio = recentDAU.avg_dau / baselineDAU.avg_dau;
      if (dauRatio < 0.7) {
        alerts.push({
          id: ++alertId, severity: 'low', type: 'dau_drop',
          message: `DAU dropped to ${Math.round(dauRatio * 100)}% of baseline`,
          value: Math.round(recentDAU.avg_dau), baseline: Math.round(baselineDAU.avg_dau),
          sigma: 0, since: d7ago,
        });
      }
    }

    // Sort: high first, then medium, then low
    const sevOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

    return { ok: true, data: { alerts, computedAt: now } };
  }, force);
}

// === Main router ===

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...publicCorsHeaders(), ...securityHeaders() } });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/session' && request.method === 'POST') {
        return await handleSession(request, env);
      }
      if (path === '/event' && request.method === 'POST') {
        return await handleEvent(request, env);
      }
      if (path === '/events/batch' && request.method === 'POST') {
        return await handleEventsBatch(request, env);
      }
      if (path === '/feedback' && request.method === 'POST') {
        return await handleFeedback(request, env);
      }
      if (path === '/auth' && request.method === 'POST') {
        return await handleAuth(request, env);
      }
      if (path === '/sync/save' && request.method === 'POST') {
        return await handleSyncSave(request, env);
      }
      if (path === '/sync/check' && request.method === 'POST') {
        return await handleSyncCheck(request, env);
      }
      if (path === '/sync/load' && request.method === 'POST') {
        return await handleSyncLoad(request, env);
      }
      if (path === '/sync/change-pin' && request.method === 'POST') {
        return await handleSyncChangePin(request, env);
      }
      if (path === '/sync/forgot-pin' && request.method === 'POST') {
        return await handleSyncForgotPin(request, env);
      }
      // Stats and dashboard endpoints require auth cookie
      const needsAuth = path === '/stats' || path.startsWith('/stats/') || path === '/dashboard' || path === '/' || path.startsWith('/admin/');
      if (needsAuth) {
        const ok = await isAuthed(request, env);
        if (!ok) {
          if (path === '/dashboard' || path === '/') {
            return new Response(LOGIN_HTML, {
              status: 200,
              headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' },
            });
          }
          return errResponse('unauthorized', 401);
        }
      }
      const range = url.searchParams.get('range') || '2d';
      const force = url.searchParams.get('force') === '1';
      const before = url.searchParams.get('before') ? parseInt(url.searchParams.get('before'), 10) : null;
      if (path === '/stats' && request.method === 'GET') {
        return jsonResponse(await handleStats(env, range, force, before));
      }
      if (path === '/stats/levels' && request.method === 'GET') {
        return jsonResponse(await handleStatsLevels(env, range, force, before));
      }
      if (path === '/stats/players' && request.method === 'GET') {
        return jsonResponse(await handleStatsPlayers(env, range, force, before));
      }
      if (path === '/stats/sessions' && request.method === 'GET') {
        return jsonResponse(await handleStatsSessions(env, range, force, before));
      }
      if (path === '/stats/ui' && request.method === 'GET') {
        return jsonResponse(await handleStatsUI(env, range, force, before));
      }
      if (path === '/stats/economy' && request.method === 'GET') {
        return jsonResponse(await handleStatsEconomy(env, range, force, before));
      }
      if (path === '/stats/dailystage' && request.method === 'GET') {
        return jsonResponse(await handleStatsDailyStage(env, range, force, before));
      }
      if (path === '/stats/feed' && request.method === 'GET') {
        return jsonResponse(await handleStatsFeed(env, force));
      }
      if (path === '/stats/feed/stream' && request.method === 'GET') {
        return jsonResponse(await handleFeedStream(env, url));
      }
      if (path === '/stats/anomalies' && request.method === 'GET') {
        return jsonResponse(await handleAnomalies(env, force));
      }
      if (path === '/stats/appversion' && request.method === 'GET') {
        return jsonResponse(await handleStatsAppVersion(env, range, force, before));
      }
      if (path === '/stats/feedback' && request.method === 'GET') {
        return jsonResponse(await handleStatsFeedback(env, force));
      }
      if (path === '/stats/sync' && request.method === 'GET') {
        return jsonResponse(await handleStatsSync(env, force));
      }
      if (path === '/stats/player' && request.method === 'GET') {
        const pid = url.searchParams.get('pid');
        return await handleStatsPlayer(env, pid);
      }
      if (path === '/stats/search' && request.method === 'GET') {
        return await handleStatsSearch(env, url, force);
      }
      if (path === '/stats/retention' && request.method === 'GET') {
        return jsonResponse(await handleStatsRetention(env, range, force, before));
      }
      if (path === '/stats/funnel' && request.method === 'GET') {
        return jsonResponse(await handleStatsFunnel(env, range, force, before));
      }
      if (path === '/stats/death-matrix' && request.method === 'GET') {
        return jsonResponse(await handleStatsDeathMatrix(env, range, force, before));
      }
      if (path === '/stats/geo' && request.method === 'GET') {
        return jsonResponse(await handleStatsGeo(env, range, force, before));
      }
      if (path === '/stats/time-distribution' && request.method === 'GET') {
        const level = parseInt(url.searchParams.get('level'), 10);
        if (isNaN(level) || level < 0 || level > 19) return errResponse('level 0-19 required');
        return jsonResponse(await handleStatsTimeDistribution(env, range, force, before, level));
      }
      if (path === '/stats/champion-funnel' && request.method === 'GET') {
        return jsonResponse(await handleStatsChampionFunnel(env, range, force, before));
      }
      if (path === '/stats/flagged-players' && request.method === 'GET') {
        return jsonResponse(await handleStatsFlaggedPlayers(env, force));
      }
      if (path === '/admin/flag-player' && request.method === 'POST') {
        return await handleAdminFlagPlayer(request, env);
      }
      if (path === '/admin/unflag-player' && request.method === 'POST') {
        return await handleAdminUnflagPlayer(request, env);
      }
      if (path === '/admin/ban-pid' && request.method === 'POST') {
        return await handleAdminBanPid(request, env);
      }
      if (path === '/admin/unban-pid' && request.method === 'POST') {
        return await handleAdminUnbanPid(request, env);
      }
      if (path === '/admin/feedback/mark-read' && request.method === 'POST') {
        return await handleAdminFeedbackMarkRead(request, env);
      }
      if (path === '/admin/sync/reset-pin' && request.method === 'POST') {
        return await handleAdminSyncResetPin(request, env);
      }
      if (path === '/admin/aggregate' && request.method === 'POST') {
        return await handleAdminAggregate(request, env);
      }
      if ((path === '/' || path === '/dashboard') && request.method === 'GET') {
        let html;
        if (!dashboardBundle || dashboardBundle.trim() === '') {
          html = '<!doctype html><html><head><title>N3ON DashJ — Build Required</title></head><body style="background:#020208;color:#f44;font-family:monospace;padding:40px;text-align:center"><h1>Dashboard bundle not found</h1><p>Run <code>npm run build</code> in the cloudflare/ directory, then redeploy.</p></body></html>';
        } else {
          // Escape </script in bundle to prevent premature script tag closure when injected into HTML.
          const safeBundle = dashboardBundle.replace(/<\/script/gi, '<\\/script');
          html = dashboardHtml.replace('/* __BUNDLE__ */', safeBundle);
        }
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'no-store',
            ...securityHeaders(),
          },
        });
      }
      return errResponse('not found', 404);
    } catch (err) {
      return errResponse(err.message || 'server error', 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCron(env));
  },
};
