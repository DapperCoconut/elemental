// World-boss harness 5: close-ups of the rig, one Sovereign per shot, with the
// intro banners already lapsed so nothing sits over the body.
import puppeteer from 'puppeteer-core';

const OUT = process.argv[2] || '/tmp/claude-1000/-home-kids-dev-elemental/6b091e0b-bf8f-4ef7-85bc-1733fd656fee/scratchpad';
const browser = await puppeteer.connect({
  browserURL: 'http://127.0.0.1:9222',
  defaultViewport: { width: 1280, height: 800 },
  protocolTimeout: 240000,
});
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
const client = await page.target().createCDPSession();
await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
try { await client.send('Page.setWebLifecycleState', { state: 'active' }); } catch {}
await page.bringToFront();
await page.goto('http://localhost:5181', { waitUntil: 'networkidle0' });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 2500));

const cases = process.argv[3]
  ? [process.argv[3].split(':')]
  : [['fire', '0'], ['ice', '0'], ['gluttony', '0'], ['technology', '0'], ['amalgam', '0'], ['magma', '2']];

for (const [bossId, phaseStr] of cases) {
  const phase = Number(phaseStr);
  await page.evaluate((bossId) => {
    window.game.scene.stop('TitleScene');
    window.game.scene.start('ArenaScene', {
      mode: 'worldboss', bossId, elementId: 'fire', enemyElementId: 'fire', difficulty: 0,
      campaign: { hardMode: true, slot: 0, worldId: bossId },
    });
  }, bossId);
  await new Promise((r) => setTimeout(r, 1600));

  const info = await page.evaluate((phase) => {
    const sc = window.game.scene.getScene('ArenaScene');
    const kit = sc.worldBossKit;
    window.__t = performance.now();
    const step = (n) => { for (let i = 0; i < n; i++) { window.__t += 16; window.game.loop.step(window.__t); } };
    sc.player.setPosition(480, 560);
    step(260);                                   // past the intro and its banners
    for (let p = 0; p < phase; p++) { sc.npc.hp = 1; sc.npc.takeDamage(50); step(290); }
    kit.harassNextAt = Number.MAX_SAFE_INTEGER;
    kit.nextMoveAt = Number.MAX_SAFE_INTEGER;
    kit.pendingMove = null;
    kit.tk.clearHazards();
    // Park the body dead centre of the upper half and let the rig settle there.
    for (let i = 0; i < 120; i++) { kit.bx = 480; kit.by = 300; step(1); sc.player.hp = sc.player.maxHp; }
    return {
      boss: kit.def.name, phase: kit.phaseIdx, phaseName: kit.phases[kit.phaseIdx].name,
      look: kit.look, bodyRadius: sc.npc.body.radius,
      hands: [0, 1, 2, 3].slice(0, kit.look.arms ?? 2)
        .map((i) => { const h = kit.rig.handAt(i); return { dx: Math.round(h.x - 480), dy: Math.round(h.y - 300) }; }),
    };
  }, phase);
  console.log(info.boss, '| phase', info.phase, info.phaseName, '| hitbox r', info.bodyRadius,
    '| hands', JSON.stringify(info.hands));
  // Logical arena is 960x640 shown in a 1280-wide viewport: the body at (480,300).
  const scale = 1280 / 960;
  await page.screenshot({
    path: `${OUT}/rig-${bossId}-p${phase}.png`,
    clip: { x: 480 * scale - 150, y: 300 * scale - 150, width: 300, height: 300 },
  });
}
console.log('\npage exceptions:', errs.length ? errs : 'none');
await page.close();
await browser.disconnect();
