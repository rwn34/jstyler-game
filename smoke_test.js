const base = 'https://ndj-metrics.jstylr.workers.dev';
let pass = 0;
let fail = 0;
const failures = [];

async function post(path, body) {
  const resp = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: resp.status, text, json };
}

async function get(path) {
  const resp = await fetch(`${base}${path}`);
  const text = await resp.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: resp.status, text, json };
}

function ok(name, condition, detail = '') {
  if (condition) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    fail++;
    failures.push({ name, detail });
    console.log(`✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
}

async function run() {
  const ts = Date.now();
  const user = 'SMOKE' + (ts % 10000);
  const mmyy = '1225';
  const pin = '123456';
  const deviceId = 'dev_smoke';

  console.log(`=== Smoke Test: ${user} ===\n`);

  // 1. Save
  const save = await post('/sync/save', {
    username: user, mmyy, pin, deviceId,
    data: { playerName: user, playerMmyy: mmyy, scores: { 1: 100 }, silver: 50 },
    ts,
  });
  ok('save new account', save.status === 200 && save.json?.ok === true, `status=${save.status}`);

  // 2. Load
  const load = await post('/sync/load', { username: user, mmyy, pin, deviceId });
  ok('load with correct PIN', load.status === 200 && load.json?.ok === true && load.json?.data?.silver === 50, `status=${load.status}`);

  // 3. Wrong PIN
  const wrong = await post('/sync/load', { username: user, mmyy, pin: '000000', deviceId });
  ok('load with wrong PIN → 401', wrong.status === 401, `status=${wrong.status}`);

  // 4. Check
  const check = await post('/sync/check', { username: user, mmyy, pin });
  ok('sync/check exists', check.status === 200 && check.json?.found === true, `status=${check.status}`);

  // 5. Set recovery code
  const rc = await post('/sync/set-recovery-code', {
    username: user, mmyy, pin,
    recoveryCode: 'ABCD-EFGH-IJKL-MNOP',
  });
  ok('set-recovery-code', rc.status === 200 && rc.json?.ok === true, `status=${rc.status} body=${rc.text}`);

  // 6. Change PIN
  const cp = await post('/sync/change-pin', {
    username: user, mmyy, oldPin: pin, newPin: '654321',
  });
  ok('change-pin', cp.status === 200 && cp.json?.ok === true, `status=${cp.status} body=${cp.text}`);

  // 7. Load with new PIN
  const load2 = await post('/sync/load', { username: user, mmyy, pin: '654321', deviceId });
  ok('load with new PIN', load2.status === 200 && load2.json?.ok === true, `status=${load2.status}`);

  // 8. Old PIN no longer works
  const oldFail = await post('/sync/load', { username: user, mmyy, pin, deviceId });
  ok('old PIN rejected after change', oldFail.status === 401, `status=${oldFail.status}`);

  // 9. Forgot PIN with recovery code
  const fp = await post('/sync/forgot-pin', {
    username: user, mmyy, newPin: '111111',
    recoveryCode: 'ABCD-EFGH-IJKL-MNOP',
  });
  ok('forgot-pin with recovery code', fp.status === 200 && fp.json?.ok === true, `status=${fp.status} body=${fp.text}`);

  // 10. Load with reset PIN
  const load3 = await post('/sync/load', { username: user, mmyy, pin: '111111', deviceId });
  ok('load after forgot-pin reset', load3.status === 200 && load3.json?.ok === true, `status=${load3.status}`);

  // 11. CORS preflight
  const cors = await fetch(`${base}/sync/save`, { method: 'OPTIONS' });
  ok('CORS OPTIONS', cors.status === 200 && cors.headers.get('access-control-allow-origin') === '*', `status=${cors.status}`);

  // 12. Event
  const ev = await post('/event', {
    pid: 'test_pid_smoke', name: 'level_complete', type: 'game',
    level: 1, data: JSON.stringify({ score: 100 }), clientTs: ts, serverTs: ts,
  });
  ok('/event', ev.status === 200 && ev.json?.ok === true, `status=${ev.status}`);

  // 13. Auth
  const auth = await post('/auth', { password: 'wrong' });
  ok('/auth wrong password → 401', auth.status === 401, `status=${auth.status}`);

  // 14. Dashboard stats (no auth)
  const stats = await get('/stats');
  ok('/stats without auth → 401', stats.status === 401, `status=${stats.status}`);

  // 15. Save with merge (device2)
  const save2 = await post('/sync/save', {
    username: user, mmyy, pin: '111111', deviceId: 'dev2',
    data: { playerName: user, playerMmyy: mmyy, scores: { 2: 200 }, silver: 30 },
    ts: ts + 1,
  });
  ok('save from second device', save2.status === 200 && save2.json?.ok === true, `status=${save2.status}`);

  // 16. Load after merge — scores should have both devices
  const load4 = await post('/sync/load', { username: user, mmyy, pin: '111111', deviceId: 'dev2' });
  const mergedScores = load4.json?.data?.scores;
  ok('merge preserves both scores', load4.status === 200 && mergedScores?.['1'] === 100 && mergedScores?.['2'] === 200, `scores=${JSON.stringify(mergedScores)}`);

  // 17. Rapid sequential saves (race test)
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(post('/sync/save', {
      username: user, mmyy, pin: '111111', deviceId: 'dev2',
      data: { playerName: user, playerMmyy: mmyy, scores: { 3: 300 + i }, silver: 10 + i },
      ts: ts + 10 + i,
    }));
  }
  const rapid = await Promise.all(promises);
  const all200 = rapid.every(r => r.status === 200);
  ok('rapid sequential saves all 200', all200, `statuses=${rapid.map(r=>r.status).join(',')}`);

  console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  - ${f.name}: ${f.detail}`));
  }
}

run().catch(e => console.error('FATAL:', e.message));
