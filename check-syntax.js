const fs = require('fs');
const html = fs.readFileSync('deploy/latest/n3ondashj/index.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log('NO SCRIPT'); process.exit(1); }
const body = m[1];

// Write to temp file and try to compile as module
fs.writeFileSync('_temp_check.js', body);
try {
  require('./_temp_check.js');
  console.log('OK');
} catch(e) {
  console.log('ERROR:', e.message);
  if (e.stack) {
    const lines = e.stack.split('\n');
    for (const line of lines.slice(0, 5)) {
      console.log('  ', line);
    }
  }
} finally {
  try { fs.unlinkSync('_temp_check.js'); } catch(_) {}
}
