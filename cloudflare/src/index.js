// N30N DASH J Metrics Worker
// Cloudflare Worker + D1 for anonymous game metrics with HMAC anti-cheat

import dashboardHtml from './dashboard.html';

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
function rangeStartTs(range) {
  const now = Date.now();
  const map = { '1d': 86400000, '2d': 2*86400000, '3d': 3*86400000, '7d': 7*86400000, '14d': 14*86400000, '31d': 31*86400000 };
  if (range === 'all') return 0;
  return now - (map[range] || map['2d']);
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

async function handleStats(env, range, force) {
  const cacheKey = 'stats:' + range;
  return cachedJson(cacheKey, async () => {
    const now = Date.now();
    const fiveMinAgo = now - ONLINE_WINDOW_MS;
    const startTs = rangeStartTs(range);
    const HEARTBEAT_MIN = 1.5;

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
async function handleStatsLevels(env, range, force) {
  const cacheKey = 'levels:' + range;
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range);
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
async function handleStatsPlayers(env, range, force) {
  const cacheKey = 'players:' + range;
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range);
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
async function handleStatsSessions(env, range, force) {
  const cacheKey = 'sessions:' + range;
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range);
    const HEARTBEAT_MIN = 1.5;

    const [sessionsCount, funnel, hourly, daily, deathCauses, devices, sessionDurations] = await Promise.all([
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
    ]);

    const funnelMap = {};
    if (funnel && funnel.results) for (const r of funnel.results) funnelMap[r.type] = r.c;

    const hour = new Array(24).fill(0);
    if (hourly && hourly.results) for (const r of hourly.results) hour[r.hr] = r.c;

    const durMap = { short: 0, medium: 0, long: 0 };
    if (sessionDurations && sessionDurations.results) for (const r of sessionDurations.results) durMap[r.bucket] = r.count;

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
        generatedAt: Date.now(),
      },
    };
  }, force);
}

// === UI / PWA tracking ===
async function handleStatsUI(env, range, force) {
  return cachedJson('ui:' + range, async () => {
    const startTs = rangeStartTs(range);
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
async function handleStatsEconomy(env, range, force) {
  return cachedJson('economy:' + range, async () => {
    const startTs = rangeStartTs(range);
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
async function handleStatsDailyStage(env, range, force) {
  const cacheKey = 'dailystage:' + range;
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range);
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
async function handleStatsAppVersion(env, range, force) {
  const cacheKey = 'appversion:' + range;
  return cachedJson(cacheKey, async () => {
    const startTs = rangeStartTs(range);
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
      env.DB.prepare("SELECT pid, name, data, client_ts, server_ts FROM events WHERE type='feedback' ORDER BY server_ts DESC LIMIT 50").all(),
    ]);

    const items = [];
    if (recentRows && recentRows.results) {
      for (const r of recentRows.results) {
        let parsed = {};
        try { parsed = JSON.parse(r.data || '{}'); } catch (_) {}
        items.push({
          pid: r.pid,
          name: r.name,
          subject: parsed.subject || '',
          email: parsed.email || '',
          content: parsed.content || '',
          clientTs: r.client_ts,
          serverTs: r.server_ts,
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
    countryRow, screenRow, langRow, recentRows,
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
      if (path === '/stats' && request.method === 'GET') {
        return jsonResponse(await handleStats(env, range, force));
      }
      if (path === '/stats/levels' && request.method === 'GET') {
        return jsonResponse(await handleStatsLevels(env, range, force));
      }
      if (path === '/stats/players' && request.method === 'GET') {
        return jsonResponse(await handleStatsPlayers(env, range, force));
      }
      if (path === '/stats/sessions' && request.method === 'GET') {
        return jsonResponse(await handleStatsSessions(env, range, force));
      }
      if (path === '/stats/ui' && request.method === 'GET') {
        return jsonResponse(await handleStatsUI(env, range, force));
      }
      if (path === '/stats/economy' && request.method === 'GET') {
        return jsonResponse(await handleStatsEconomy(env, range, force));
      }
      if (path === '/stats/dailystage' && request.method === 'GET') {
        return jsonResponse(await handleStatsDailyStage(env, range, force));
      }
      if (path === '/stats/feed' && request.method === 'GET') {
        return jsonResponse(await handleStatsFeed(env, force));
      }
      if (path === '/stats/appversion' && request.method === 'GET') {
        return jsonResponse(await handleStatsAppVersion(env, range, force));
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
      if (path === '/admin/sync/reset-pin' && request.method === 'POST') {
        return await handleAdminSyncResetPin(request, env);
      }
      if ((path === '/' || path === '/dashboard') && request.method === 'GET') {
        return new Response(dashboardHtml, {
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
