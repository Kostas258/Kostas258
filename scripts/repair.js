/**
 * Clears results that were mislabelled by the old full-text CAPTCHA detector,
 * so the resumable runner re-checks them for real instead of skipping them.
 */
const fs = require('fs');
const files = ['/home/user/Kostas258/progress.json', '/home/user/Kostas258/progress_1000.json'];
const BAD = /CAPTCHA \/ anti-bot page detected/;

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const p = JSON.parse(fs.readFileSync(f, 'utf8'));
  const cleared = [];
  for (const [name, entry] of Object.entries(p.results || {})) {
    if (f.endsWith('progress.json')) {
      for (const site of ['vervox', 'brandsnag']) {
        if (entry[site] && entry[site].error && BAD.test(entry[site].error)) {
          delete entry[site];
          cleared.push(`${name}/${site}`);
        }
      }
    } else if (entry && entry.error && BAD.test(entry.error)) {
      delete p.results[name];
      p.checked = Object.keys(p.results).length;
      cleared.push(name);
    }
  }
  if (cleared.length) {
    fs.writeFileSync(f, JSON.stringify(p, null, 2));
    console.log(`${f}: cleared ${cleared.length} mislabelled -> ${cleared.join(', ')}`);
  } else {
    console.log(`${f}: nothing to clear`);
  }
}
