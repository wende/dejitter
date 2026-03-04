const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const scriptPath = join(__dirname, 'recorder.js');

let _cached = null;

/**
 * Returns the recorder script source as a string.
 * Useful for embedding via eval(), page.evaluate(), or building a <script> tag.
 */
function getRecorderScript() {
  if (!_cached) _cached = readFileSync(scriptPath, 'utf8');
  return _cached;
}

/**
 * Inject the recorder into a Playwright or Puppeteer page.
 * After injection, `window.dejitter` is available in the page context.
 *
 * @param {object} page - A Playwright or Puppeteer Page object
 * @returns {Promise<void>}
 */
async function inject(page) {
  await page.evaluate(getRecorderScript());
}

module.exports = { getRecorderScript, inject };
