import type Phaser from 'phaser';
import type {
  FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import { Clock, R, RCOL, dist, drawGlint, drawHole, drawIcicle } from './util';

/**
 * The Rimefast Court's goods: four charms from Gimlet's chandlery, Prince Hoarfrost's artifact,
 * and the three fish that come up through the holes in the harbour ice. Every charm plays with
 * the frozen harbour — a hole cut under someone's feet, icicles that only fall on a quiet moment,
 * warmth you must stand close to keep, and a skater's glide.
 */

// ── Charm: Augur Bit ─────────────────────────────────────────────────

/**
 * An ice-auger's cutting bit. Every ten seconds a ring is scored in the ice under the foe and the
 * bit drills it out; if they are still standing in the ring when it breaks through, they go in
 * — a hit, and for three seconds after they are soaked and every hit of yours lands harder.
 */
const augurBit: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let next = -1;
  let mark: { x: number; y: number; at: number; openAt: number } | null = null;
  let hole: { x: number; y: number; at: number } | null = null;
  const RING = 46;
  const DRILL_MS = 1300;
  return {
    update(time: number) {
      clock.tick(time);
      if (next < 0) next = time + 6000;
      const n = ctx.npc;
      if (!mark && time >= next && n.active && n.hp > 0) {
        mark = { x: n.x, y: n.y + 8, at: time, openAt: time + DRILL_MS };
        ctx.sfx('gear-turn');
      }
      if (mark && time >= mark.openAt) {
        hole = { x: mark.x, y: mark.y, at: time };
        ctx.sfx('splash');
        if (n.active && n.hp > 0 && dist(n.x, n.y + 8, mark.x, mark.y) < RING) {
          ctx.hit(n, 12, n.x, n.y);
          ctx.boostDamage(1.2, 3000);
          ctx.float(n.x, n.y - 50, 'IN THE DRINK — SOAKED', RCOL.deep);
        }
        mark = null;
        next = time + 10000;
      }
      if (hole && time - hole.at > 2200) hole = null;
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      if (mark) {
        const k = Math.min(1, (time - mark.at) / DRILL_MS);
        g.lineStyle(2, R.iceDark, 0.5 + k * 0.4); g.strokeEllipse(mark.x, mark.y, RING * 2, RING * 1.3);
        // The scored ring fills in as the bit walks round it.
        g.lineStyle(4, R.iceLit, 0.9);
        g.beginPath(); g.arc(mark.x, mark.y, RING * 0.66, 0, Math.PI * 2 * k, false); g.strokePath();
        // The bit itself: a spiral of shavings at the centre.
        for (let i = 0; i < 6; i++) {
          const a = time / 70 + i * 1.05;
          g.fillStyle(0xffffff, 0.8); g.fillCircle(mark.x + Math.cos(a) * (4 + i * 2), mark.y + Math.sin(a) * (3 + i * 1.4), 1.6);
        }
      }
      if (hole) {
        const open = Math.min(1, (time - hole.at) / 200) * Math.min(1, (2200 - (time - hole.at)) / 600);
        drawHole(g, hole.x, hole.y, 26, time / 1000, hole.x * 0.01, open);
      }
    },
  };
};

// ── Charm: Icicle Tally ──────────────────────────────────────────────

/**
 * A strip of whalebone notched like a tally stick. Each hit you land hangs an icicle over the
 * foe's head (three at most). Go three seconds without being hit and they all drop on them; get
 * hit and the warmth of it melts every one.
 */
const icicleTally: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let count = 0;
  let lastHurt = 0;
  let now = 0;
  let dropAt = -1;
  const QUIET_MS = 3000;
  return {
    update(time: number) {
      clock.tick(time);
      now = time;
      if (count > 0 && dropAt < 0 && time - lastHurt > QUIET_MS) {
        dropAt = time + 260;
        ctx.sfx('whoosh');
      }
      if (dropAt > 0 && time >= dropAt) {
        const n = ctx.npc;
        ctx.hit(n, count * 7, n.x, n.y);
        ctx.flash(n.x, n.y, R.iceLit);
        ctx.float(n.x, n.y - 54, `ICICLES ×${count}`, RCOL.ice);
        ctx.sfx('ice-shatter');
        count = 0;
        dropAt = -1;
      }
    },
    onHitDealt() {
      if (dropAt > 0) return;
      if (count < 3) { count++; ctx.sfx('ice-shard'); }
    },
    onHitTaken() {
      lastHurt = now;
      if (count > 0 && dropAt < 0) {
        ctx.float(ctx.player.x, ctx.player.y - 46, 'MELTED', RCOL.warm);
        count = 0;
      }
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      if (!count) return;
      const n = ctx.npc;
      const quiet = Math.min(1, (time - lastHurt) / QUIET_MS);
      const falling = dropAt > 0 ? 1 - (dropAt - time) / 260 : 0;
      for (let i = 0; i < count; i++) {
        const x = n.x - (count - 1) * 9 + i * 18;
        const y = n.y - 74 + falling * 50;
        drawIcicle(g, x, y, 12 + quiet * 8, 6, 0.95, falling > 0 ? 0 : Math.sin(time / 120 + i) * 0.8);
      }
      // The quiet clock: a thin arc over the icicles that fills while you stay unhurt.
      g.lineStyle(2, R.frost, 0.8);
      g.beginPath(); g.arc(n.x, n.y - 76, 26, Math.PI, Math.PI + Math.PI * quiet, false); g.strokePath();
    },
  };
};

// ── Charm: Hand-Warmer Tin ───────────────────────────────────────────

/**
 * A little tin of banked coals. It only stays warm in company: while you fight within arm's
 * length of the foe it heats, and while it is hot every cooldown you have runs about a sixth
 * faster. Back away and it cools again.
 */
const handWarmer: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  const known = new Set<string>();
  let heat = 0;
  let acc = 0;
  let wasHot = false;
  const NEAR = 170;
  return {
    onCast(abilityId: string) { known.add(abilityId); },
    update(time: number) {
      const dt = clock.tick(time);
      if (dt === 0) return;
      const p = ctx.player, n = ctx.npc;
      const near = n.active && n.hp > 0 && dist(p.x, p.y, n.x, n.y) < NEAR;
      heat = Math.max(0, Math.min(1, heat + (near ? dt / 1.6 : -dt / 2.4)));
      const hot = heat > 0.6;
      if (hot && !wasHot) { ctx.float(p.x, p.y - 46, 'WARM HANDS', RCOL.warm); ctx.sfx('status-buff'); }
      wasHot = hot;
      if (!hot) { acc = 0; return; }
      acc += dt;
      if (acc >= 0.25) {
        const ms = Math.round(acc * 160 * heat);
        acc = 0;
        for (const id of known) ctx.refund(id, ms);
      }
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      if (heat < 0.05) return;
      const p = ctx.player;
      g.lineStyle(2, R.ember, 0.15 + heat * 0.4); g.strokeEllipse(p.x, p.y + 16, 50, 16);
      if (heat > 0.6) {
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 900 + i / 3) % 1);
          g.fillStyle(R.emberHot, 0.5 * (1 - ph)); g.fillCircle(p.x - 12 + i * 12, p.y + 10 - ph * 30, 2);
        }
      }
    },
    drawAir(g: Phaser.GameObjects.Graphics) {
      const p = ctx.player;
      // The tin's gauge: a little bar at your hip.
      g.fillStyle(0x000000, 0.4); g.fillRect(p.x + 22, p.y - 14, 5, 24);
      g.fillStyle(heat > 0.6 ? R.ember : R.iceDeep, 1); g.fillRect(p.x + 23, p.y - 13 + 22 * (1 - heat), 3, 22 * heat);
    },
  };
};

// ── Charm: Skater's Spur ─────────────────────────────────────────────

/**
 * A spur filed to a skate's edge. Keep moving without a stop and you build glide, a pip at a
 * time; at five pips your next hit kicks up a spray of ice that cuts the foe and sends you off
 * faster still. Stand about and the glide bleeds away.
 */
const skaterSpur: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let pips = 0;
  let movingT = 0;
  let stillT = 0;
  let lx = 0, ly = 0, started = false;
  const trail: { x: number; y: number; at: number }[] = [];
  return {
    update(time: number) {
      const dt = clock.tick(time);
      const p = ctx.player;
      if (!started) { lx = p.x; ly = p.y; started = true; return; }
      if (dt === 0) return;
      const sp = dist(p.x, p.y, lx, ly) / dt;
      lx = p.x; ly = p.y;
      if (sp > 110) {
        stillT = 0;
        movingT += dt;
        if (movingT > 0.6 && pips < 5) {
          movingT = 0;
          pips++;
          if (pips === 5) { ctx.float(p.x, p.y - 46, 'FULL GLIDE', RCOL.ice); ctx.sfx('crystal-chime'); }
        }
        if (pips >= 3) trail.push({ x: p.x, y: p.y + 14, at: time });
      } else if (sp < 40) {
        stillT += dt;
        if (stillT > 0.4 && pips > 0) { pips = 0; movingT = 0; }
      }
      while (trail.length && time - trail[0].at > 700) trail.shift();
    },
    onHitDealt() {
      if (pips < 5) return;
      pips = 0;
      const n = ctx.npc;
      ctx.hit(n, 14, n.x, n.y);
      ctx.boostSpeed(1.25, 1200);
      ctx.flash(n.x, n.y, R.frost);
      ctx.float(n.x, n.y - 50, 'ICE SPRAY', RCOL.frost);
      ctx.sfx('ice-shatter');
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      for (let i = 1; i < trail.length; i++) {
        const a = 1 - (time - trail[i].at) / 700;
        g.lineStyle(2, R.iceLit, 0.6 * a); g.lineBetween(trail[i - 1].x - 5, trail[i - 1].y, trail[i].x - 5, trail[i].y);
        g.lineBetween(trail[i - 1].x + 5, trail[i - 1].y, trail[i].x + 5, trail[i].y);
      }
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      if (!pips) return;
      const p = ctx.player;
      for (let i = 0; i < 5; i++) {
        const x = p.x - 16 + i * 8, y = p.y - 46;
        g.fillStyle(0x000000, 0.35); g.fillTriangle(x - 3, y + 3, x + 3, y + 3, x, y - 4);
        if (i < pips) { g.fillStyle(pips === 5 ? 0xffffff : R.ice, 1); g.fillTriangle(x - 2.5, y + 2, x + 2.5, y + 2, x, y - 3); }
      }
      if (pips === 5) drawGlint(g, p.x + 22, p.y - 46, 5, 0.6 + Math.sin(time / 80) * 0.3);
    },
  };
};

// ── Artifact: The Held Breath ────────────────────────────────────────

/**
 * Prince Hoarfrost's circlet-pearl, the one that hung on the Queen's ribbon. Every twelve seconds
 * it holds the moment round your foe for three seconds: a bloom of frost marks them, and all the
 * damage you deal them in that time is remembered. When the moment breaks it shatters over them
 * again for half as much.
 */
const heldBreath: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const clock = new Clock();
  let next = -1;
  let heldUntil = 0;
  let heldFrom = 0;
  let bank = 0;
  let now = 0;
  return {
    update(time: number) {
      clock.tick(time);
      now = time;
      if (next < 0) next = time + 7000;
      const n = ctx.npc;
      if (heldUntil === 0 && time >= next && n.active && n.hp > 0) {
        heldFrom = time;
        heldUntil = time + 3000;
        bank = 0;
        ctx.sfx('time-warp');
        ctx.float(n.x, n.y - 54, 'HELD', RCOL.frost);
      }
      if (heldUntil > 0 && time >= heldUntil) {
        if (bank > 0) {
          const back = Math.min(45, Math.round(bank * 0.5));
          ctx.hit(n, back, n.x, n.y);
          ctx.flash(n.x, n.y, R.glassLit);
          ctx.float(n.x, n.y - 54, `THE MOMENT BREAKS −${back}`, RCOL.ice);
          ctx.sfx('crystal-shatter');
        }
        heldUntil = 0;
        next = time + 12000;
      }
    },
    onHitDealt(amount: number) {
      if (heldUntil > 0 && now < heldUntil) bank += amount;
    },
    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      if (heldUntil === 0) return;
      const n = ctx.npc;
      const k = (time - heldFrom) / 3000;
      // Frost ferns spreading out from under them.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const len = 20 + k * 26;
        g.lineStyle(1.5, R.frost, 0.7);
        g.lineBetween(n.x, n.y + 14, n.x + Math.cos(a) * len, n.y + 14 + Math.sin(a) * len * 0.4);
      }
    },
    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      if (heldUntil === 0) return;
      const n = ctx.npc;
      const k = (heldUntil - time) / 3000;
      g.lineStyle(2, R.glassLit, 0.8);
      g.beginPath(); g.arc(n.x, n.y, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      for (let i = 0; i < 5; i++) drawGlint(g, n.x + Math.cos(i * 1.26) * 30, n.y + Math.sin(i * 1.26) * 30, 3, 0.7);
      // The remembered damage, as a pale core that swells with every hit.
      if (bank > 0) { g.fillStyle(R.frost, 0.25); g.fillCircle(n.x, n.y, Math.min(30, 8 + bank * 0.4)); }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const RIMEFAST_ITEMS: IsleItemDef[] = [
  {
    id: 'rimefast-augur-bit', name: 'Augur Bit', emoji: '🔩', kind: 'charm', price: 220, isle: 'water',
    flavor: 'The cutting bit off Old Tom\'s best ice-auger. He swears it can smell water through a yard of ice.',
    effect: { critChance: 0.02 },
    script: 'rimefast-augur-bit',
    scriptText: ['Every 10s a hole is drilled under the foe (1.3s, ringed on the ice).', 'Still in the ring when it breaks: 12 damage, and your hits land 20% harder for 3s.'],
  },
  {
    id: 'rimefast-icicle-tally', name: 'Icicle Tally', emoji: '🧊', kind: 'charm', price: 260, isle: 'water',
    flavor: 'A whalebone tally stick from the harbour children. Every notch is somebody the Thaw-Collector missed.',
    effect: { maxHp: 8 },
    script: 'rimefast-icicle-tally',
    scriptText: ['Each hit you land hangs an icicle over the foe (max 3).', 'Go 3s without being hit and they drop: 7 damage each. Getting hit melts them.'],
  },
  {
    id: 'rimefast-hand-warmer', name: 'Hand-Warmer Tin', emoji: '🥫', kind: 'charm', price: 340, isle: 'water',
    flavor: 'A tobacco tin of banked coals, wrapped in a sock. Unlicensed. Keep it in your pocket and say nothing.',
    effect: { damageTakenMult: 0.97 },
    script: 'rimefast-hand-warmer',
    scriptText: ['Fighting within arm\'s length of the foe heats the tin; backing off cools it.', 'While it is hot, all your cooldowns run about 16% faster.'],
  },
  {
    id: 'rimefast-skater-spur', name: "Skater's Spur", emoji: '⛸️', kind: 'charm', price: 480, isle: 'water',
    flavor: 'Brisa filed it from a broken blade. "Glide," she says, "don\'t stamp. The ice can hear you stamping."',
    effect: { speedMult: 1.04 },
    script: 'rimefast-skater-spur',
    scriptText: ['Keep moving to build glide (a pip every 0.6s, max 5). Stopping drains it.', 'At 5 pips your next hit sprays ice: +14 damage and +25% speed for 1.2s.'],
  },
  {
    id: 'art-hoarfrost', name: 'The Held Breath', emoji: '❄️', kind: 'artifact', isle: 'water',
    flavor: 'The frozen pearl from Hoarfrost\'s ribbon. Hold it to your ear and you hear nothing at all, perfectly.',
    effect: { maxHp: 15, damageTakenMult: 0.96 },
    script: 'art-hoarfrost',
    scriptText: ['Every 12s the moment round your foe is held for 3s.', 'When it breaks, half the damage you dealt them in it lands again (max 45).'],
  },
  {
    id: 'fish-icicle-smelt', name: 'Icicle Smelt', emoji: '🐟', kind: 'fish', sell: 9, isle: 'water',
    flavor: 'Thin and clear as an icicle — you can watch its heart beat. Smells faintly of cucumber, for some reason.',
    effect: { speedMult: 1.05 },
  },
  {
    id: 'fish-frostback-char', name: 'Frostback Char', emoji: '🐠', kind: 'fish', sell: 26, isle: 'water',
    flavor: 'Red-bellied, with a back silvered like rime on a window. Bites best when the holes are freshly cut.',
    effect: { damageTakenMult: 0.95 },
  },
  {
    id: 'fish-glacier-cod', name: 'Glacier Cod', emoji: '🐡', kind: 'fish', sell: 52, isle: 'water',
    flavor: 'A great slow cod that sleeps under the ice all winter. Hauling one up the hole is a two-person job.',
    effect: { maxHp: 14 },
  },
];

export const RIMEFAST_SCRIPTS: Record<string, ItemScriptFactory> = {
  'rimefast-augur-bit': augurBit,
  'rimefast-icicle-tally': icicleTally,
  'rimefast-hand-warmer': handWarmer,
  'rimefast-skater-spur': skaterSpur,
  'art-hoarfrost': heldBreath,
};

export const RIMEFAST_SHOPS: ShopDef[] = [
  { id: 'rimefast-shop', name: "Gimlet's Ship-Chandlery", stock: ['rimefast-augur-bit', 'rimefast-icicle-tally', 'rimefast-hand-warmer', 'rimefast-skater-spur'], buys: true },
];

export const RIMEFAST_FISHERIES: FisheryDef[] = [{ id: 'rimefast-holes', name: 'The Rimefast Holes', kind: 'ice' }];

export const RIMEFAST_FISH: FishDef[] = [
  { id: 'fish-icicle-smelt', fisheries: ['rimefast-holes'], weight: 8, fight: 1, size: [9, 20] },
  { id: 'fish-frostback-char', fisheries: ['rimefast-holes'], weight: 5, fight: 3, size: [32, 74] },
  { id: 'fish-glacier-cod', fisheries: ['rimefast-holes'], weight: 2, fight: 5, size: [70, 150] },
];
