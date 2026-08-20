/**
 * Anti-bot / CAPTCHA detection.
 *
 * Deliberately NOT a full-text scan: vervox ships every localized error string
 * ("accès refusé", "trop de requêtes", ...) inside its JS bundle, so matching on
 * page text produces false positives on pages that are working perfectly.
 * We key on challenge widgets, challenge-specific titles, and HTTP status instead.
 */

const CHALLENGE_SEL = [
  'iframe[src*="recaptcha"]',
  'iframe[src*="hcaptcha"]',
  'iframe[src*="turnstile"]',
  'iframe[src*="challenges.cloudflare.com"]',
  'script[src*="challenges.cloudflare.com"]',
  '.cf-turnstile',
  '.g-recaptcha',
  '.h-captcha',
  '#challenge-form',
  '#challenge-running',
  '[data-sitekey]',
];

const CHALLENGE_TITLE = /just a moment|attention required|un instant|verifying you are human|security check|access denied|forbidden/i;

async function detectAntiBot(page) {
  try {
    return await page.evaluate(sels => {
      for (const s of sels) if (document.querySelector(s)) return `challenge widget: ${s}`;
      const t = (document.title || '').trim();
      if (/just a moment|attention required|un instant|verifying you are human|security check|access denied|forbidden/i.test(t)) {
        return `challenge page title: "${t}"`;
      }
      // A real block page is tiny; the working tool page is ~1.4 MB of markup.
      if (document.body && document.body.innerHTML.length < 2000 &&
          /captcha|robot|blocked|denied|429|too many/i.test(document.body.innerText || '')) {
        return 'minimal block page';
      }
      return null;
    }, CHALLENGE_SEL);
  } catch (e) { return null; }
}

module.exports = { detectAntiBot, CHALLENGE_SEL, CHALLENGE_TITLE };
