// Shared browser harness: connects to a debuggable Chrome (port 9222) or launches one from
// CHROME_PATH, loads the dev server, and hands back { page, ev, step, check, done }.
import puppeteer from 'puppeteer-core';

export async function openHarness() {
  const URL = process.env.URL ?? 'http://localhost:5173';
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: { width: 1280, height: 800 }, protocolTimeout: 240000 });
  } catch {
    const executablePath = process.env.CHROME_PATH;
    if (!executablePath) throw new Error('no Chrome on 9222 and no CHROME_PATH');
    browser = await puppeteer.launch({
      executablePath, headless: true, defaultViewport: { width: 1280, height: 800 }, protocolTimeout: 240000,
      args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
    });
  }
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE EXC', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors.push(m.text()); console.log('CONSOLE ERR', m.text().slice(0, 300)); } });
  const client = await page.target().createCDPSession();
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
  await page.bringToFront();
  await page.goto(URL, { waitUntil: 'load' });
  await page.bringToFront();
  await page.waitForFunction(() => !!window.game, { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));
  // This Chrome does fire rAF, so the game's own loop would race the stepped clock and send
  // scene time backwards. Only the harness steps frames from here on.
  await page.evaluate(() => { window.game.loop.stop(); window.__t = performance.now(); });

  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const step = (n) => page.evaluate((n) => {
    for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); }
  }, n);
  const results = [];
  const check = (name, pass, detail = '') => {
    results.push({ name, pass });
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  };
  const startMatch = async (data) => {
    await ev((data) => {
      for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.scene.key);
      window.game.scene.start('ArenaScene', data);
    }, data);
    await step(30);
  };
  const seedSave = async (mutate) => {
    await ev((src) => {
      const raw = localStorage.getItem('elemental_save');
      const d = raw ? JSON.parse(raw) : {};
      // eslint-disable-next-line no-new-func
      new Function('d', src)(d);
      localStorage.setItem('elemental_save', JSON.stringify(d));
    }, mutate);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => !!window.game, { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.evaluate(() => { window.game.loop.stop(); window.__t = performance.now(); });
  };
  const done = async () => {
    const fails = results.filter((r) => !r.pass).length;
    console.log(`\n${results.length - fails}/${results.length} passed; ${errors.length} page errors`);
    for (const e of errors.slice(0, 10)) console.log('  err:', e.slice(0, 200));
    await page.close();
    try { await browser.disconnect(); } catch {}
    try { await browser.close(); } catch {}
    process.exit(fails || errors.length ? 1 : 0);
  };
  return { page, ev, step, check, startMatch, seedSave, done, errors };
}
