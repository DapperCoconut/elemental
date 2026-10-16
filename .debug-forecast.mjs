import puppeteer from 'puppeteer-core';
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE EXC', e.message));
const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => window.game && window.game.loop.frame > 5, { timeout: 60000 });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 1500));
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await ev(() => { for (const s of window.game.scene.getScenes(true)) window.game.scene.stop(s.sys.settings.key); window.game.scene.start('ArenaScene', { elementId: 'tempest', enemyElementId: 'fire', difficulty: 0 }); });
await sleep(1500);
await ev(() => { window.game.loop.sleep(); window.__t = performance.now(); });
const step = (n) => ev((n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } }, n);
const sc = (fn, ...a) => ev((src, ...a) => { const sc = window.game.scene.getScene('ArenaScene'); return (new Function('sc', ...a.map((_, i) => 'a' + i), 'return (' + src + ')(sc,' + a.map((_, i) => 'a' + i).join(',') + ')'))(sc, ...a); }, fn.toString(), ...a);
await step(10);
await sc((sc) => { sc.npc.doAI = () => null; sc.npc.speed = 0; sc.player.body.reset(300, 320); sc.npc.body.reset(420, 320); sc.npc.hp = 500; sc.npc.maxHp = 500;
  const k = sc.tempestKit; const orig = k.land.bind(k); k.land = (o, sp) => { window.__log = (window.__log||[]); window.__log.push(`LAND owner=${o} speed=${sp.toFixed(0)} grab=${!!k.sides[o].grab} foes=${k.foes(o).length} npcHp=${sc.npc.hp} enemies=${sc.enemies.length} npcInEnemies=${sc.enemies.includes(sc.npc)}`); orig(o, sp); window.__log.push(`AFTER npcHp=${sc.npc.hp} inv=${sc.npc.isInvincible} absorber=${!!sc.npc.damageAbsorber} fuse=${!!sc.npc.fuseHitAbsorber}`); };
  const od = sc.npc.takeDamage.bind(sc.npc); sc.npc.takeDamage = (a, o) => { window.__log.push(`takeDamage ${a} ${JSON.stringify(o||{})} hpBefore=${sc.npc.hp}`); od(a, o); window.__log.push(`  hpAfter=${sc.npc.hp} lastIncoming=${sc.npc.lastIncomingDamage}`); };
  window.__log = [];
});
await sc((sc) => sc.tempestKit.doForecast('player', 700, 320));
for (let i = 0; i < 30; i++) {
  await step(10);
  const st = await sc((sc) => { const s = sc.tempestKit.sides.player; return { grab: s.grab ? { crashing: s.grab.crashing, rz: s.grab.releaseZ.toFixed(0) } : null, z: s.z.toFixed(0), vz: s.vz.toFixed(0), air: s.airborne, hp: sc.npc.hp, px: sc.player.x.toFixed(0), nx: sc.npc.x.toFixed(0) }; });
  console.log(i, JSON.stringify(st));
  if (!st.air && i > 3) break;
}
console.log((await ev(() => window.__log)).join('\n'));
await page.close(); await browser.disconnect();
