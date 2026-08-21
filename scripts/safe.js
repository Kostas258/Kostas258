/**
 * Shared safety helpers.
 *
 * Two failure modes this guards against, both seen or plausible in this task:
 *
 * 1. Torn checkpoints. The previous session lost about 7 hours of a 13-hour run
 *    to container restarts. A restart landing in the middle of writeFileSync
 *    leaves a truncated progress file, and every verdict already paid for with
 *    a rate-limited request is gone. Writing to a sibling temp file and
 *    renaming makes the swap atomic: readers see either the old file or the
 *    new one, never half of one.
 *
 * 2. Unvalidated names reaching the network layer. The username lists are
 *    parsed out of hand-written markdown, so a malformed row can produce a
 *    "username" that is not one. Requests are already built with execFile and
 *    an argument array (no shell) and JSON.stringify, so this is not an
 *    injection hole — but a junk name still burns a request against a scarce
 *    quota and stores a meaningless verdict. Cheaper to reject it up front.
 */
const fs = require('fs');
const path = require('path');

/** Instagram handles: 1-30 chars, letters, digits, underscore, period. */
const USERNAME_RE = /^[a-zA-Z0-9._]{1,30}$/;

const isValidUsername = u => typeof u === 'string' && USERNAME_RE.test(u);

function assertUsername(u) {
  if (!isValidUsername(u)) throw new Error(`refusing to query an invalid username: ${JSON.stringify(u)}`);
  return u;
}

/** Write JSON so a crash mid-write cannot leave a truncated file behind. */
function writeJsonAtomic(file, obj) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.tmp`);
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, JSON.stringify(obj, null, 2));
    fs.fsyncSync(fd); // rename is only atomic once the bytes are actually on disk
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
}

/** Read JSON, falling back to the temp file if a rename was interrupted. */
function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    const tmp = path.join(path.dirname(file), `.${path.basename(file)}.tmp`);
    if (fs.existsSync(tmp)) {
      const v = JSON.parse(fs.readFileSync(tmp, 'utf8'));
      console.error(`[safe] ${path.basename(file)} was unreadable; recovered from the temp file`);
      return v;
    }
    throw e;
  }
}

module.exports = { isValidUsername, assertUsername, writeJsonAtomic, readJsonSafe, USERNAME_RE };
