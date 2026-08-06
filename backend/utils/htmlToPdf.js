// ==========================================================
// htmlToPdf.js
// Converts an HTML string into a PDF Buffer using the Chromium that
// ships with the environment, driven by playwright-core.
//
// Why Chromium instead of pdfkit for the primary path: the template
// system needs real CSS layout (two-column sidebars, coloured header
// blocks, flexbox, pills). pdfkit draws imperatively and cannot do
// that. Chromium renders the exact same HTML the live preview uses.
//
// This module NEVER hard-crashes an export: if a browser can't be
// found or launched, it throws a tagged error so the export route can
// fall back to the legacy pdfkit generator (see routes/export.js).
// ==========================================================

const fs = require('fs');
const path = require('path');

// Resolve a usable Chromium binary once and cache it.
let _execPath;
function findChromium() {
  if (_execPath !== undefined) return _execPath;

  // Explicit override wins.
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH && fs.existsSync(process.env.PLAYWRIGHT_CHROMIUM_PATH)) {
    _execPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
    return _execPath;
  }

  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const found = [];
  try {
    for (const dir of fs.readdirSync(base)) {
      // headless_shell implements the "old headless" mode playwright-core
      // asks for, so prefer it; fall back to the full chrome binary.
      const shell = path.join(base, dir, 'chrome-linux', 'headless_shell');
      const chrome = path.join(base, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(shell)) found.push({ p: shell, shell: true });
      else if (fs.existsSync(chrome)) found.push({ p: chrome, shell: false });
    }
  } catch {
    /* base dir missing — handled below */
  }

  // Prefer a headless_shell if any was found.
  const pick = found.find(f => f.shell) || found[0];
  _execPath = pick ? pick.p : null;
  return _execPath;
}

async function htmlToPdf(html) {
  const executablePath = findChromium();
  if (!executablePath) {
    const err = new Error('No Chromium binary found for PDF rendering.');
    err.code = 'NO_CHROMIUM';
    throw err;
  }

  let chromium;
  try {
    ({ chromium } = require('playwright-core'));
  } catch (e) {
    const err = new Error('playwright-core is not installed.');
    err.code = 'NO_PLAYWRIGHT';
    throw err;
  }

  let browser;
  try {
    browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    return buffer;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { htmlToPdf, findChromium };
