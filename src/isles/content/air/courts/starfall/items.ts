import type { FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { SF, alive, clamp, comet, dist, heldWindow, makeClock, segDist, star } from './palette';

/**
 * The Starfall Court's goods: four charms from Hesper Quillon's Almanac, Prince Nova's artifact,
 * and the three fish of the Starpool. Every charm and the artifact runs a script that changes how
 * you fight — a comet you call down, a figure you pin into the floor, a lens you hold steady, an
 * eclipse you carry, a star's whole life lived in a few seconds — not just how hard you hit.
 */

// ── Charm scripts ────────────────────────────────────────────────────

/**
 * Comet Tail — every third ability you cast calls a comet down. Its trail is drawn from a high
 * corner of the sky to the foe's feet, and 0.7s later it streaks in and lands for 12 on whoever
 * is still standing in the landing ring (the foe, if it did not move).
 */
const cometTail: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  interface Fall { sx: number; sy: number; x: number; y: number; bornAt: number; landAt: number; done: boolean }
  let casts = 0;
  let now = 0;
  let falls: Fall[] = [];
  const R = 46;
  return {
    update(time) {
      now = time;
      for (const f of falls) {
        if (f.done || time < f.landAt) continue;
        f.done = true;
        ctx.sfx('meteor');
        ctx.flash(f.x, f.y, SF.comet);
        const n = ctx.npc;
        if (alive(n) && dist(n.x, n.y, f.x, f.y) < R) { ctx.hit(n, 12, n.x, n.y); ctx.float(n.x, n.y - 46, 'COMET', '#8fe3ff'); }
      }
      falls = falls.filter((f) => time < f.landAt + 400);
    },
    onCast(_id, slot) {
      if (slot === null) return;
      casts++;
      if (casts % 3 !== 0) return;
      const n = ctx.npc;
      if (!alive(n)) return;
      const sx = n.x < ctx.W / 2 ? ctx.W + 30 : -30;
      falls.push({ sx, sy: 60, x: n.x, y: n.y, bornAt: now, landAt: now + 700, done: false });
      ctx.sfx('beam-charge');
    },
    drawGround(g, time) {
      for (const f of falls) {
        if (f.done) continue;
        const k = clamp((time - f.bornAt) / (f.landAt - f.bornAt), 0, 1);
        g.lineStyle(2, SF.comet, 0.3 + k * 0.5); g.strokeEllipse(f.x, f.y, R * 2, R * 1.25);
        g.lineStyle(1, SF.comet, 0.15 + k * 0.3); g.lineBetween(f.sx, f.sy, f.x, f.y);
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      for (const f of falls) {
        if (f.done) {
          const k = clamp((time - f.landAt) / 400, 0, 1);
          g.lineStyle(3 * (1 - k), SF.starHot, 1 - k); g.strokeCircle(f.x, f.y, R * (0.4 + k));
          continue;
        }
        const k = clamp((time - f.bornAt - 450) / (f.landAt - f.bornAt - 450), 0, 1);
        if (k <= 0) continue;
        comet(g, f.sx + (f.x - f.sx) * k, f.sy + (f.y - f.sy) * k, Math.atan2(f.y - f.sy, f.x - f.sx), 110, 6, t);
      }
      // Two pips over your shoulder: casts toward the next comet.
      const p = ctx.player;
      for (let i = 0; i < 2; i++) star(g, p.x - 6 + i * 12, p.y - 50, 3.5, i < casts % 3 ? SF.comet : 0x4a4f68, 0.9);
    },
  };
};

/**
 * Constellation Pin — every hit you land pins a gold star into the floor where the foe stood
 * (four at most, each lasting 8s). The pins are joined in a figure as they come. When the fourth is
 * pinned the figure flares: if the foe is touching any line of it, it takes 16. The pins are spent.
 */
const constellationPin: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  interface Pin { x: number; y: number; at: number }
  let pins: Pin[] = [];
  let now = 0;
  let lastPin = -9999;
  let flareAt = -9999;
  let flared: Pin[] = [];
  return {
    update(time) {
      now = time;
      pins = pins.filter((p) => time - p.at < 8000);
    },
    onHitDealt(amount) {
      if (amount <= 0 || now - lastPin < 350) return;
      const n = ctx.npc;
      if (!alive(n)) return;
      lastPin = now;
      pins.push({ x: n.x, y: n.y, at: now });
      ctx.sfx('crystal-chime');
      if (pins.length < 4) return;
      flared = pins.slice();
      pins = [];
      flareAt = now;
      let on = false;
      for (let i = 0; i < flared.length; i++) {
        const a = flared[i], b = flared[(i + 1) % flared.length];
        if (segDist(n.x, n.y, a.x, a.y, b.x, b.y) < 30) { on = true; break; }
      }
      ctx.sfx('light-beam');
      if (on) { ctx.hit(n, 16, n.x, n.y); ctx.float(n.x, n.y - 46, 'PINNED', '#ffe08a'); }
    },
    drawGround(g, time) {
      g.lineStyle(1.5, SF.starGold, 0.5);
      for (let i = 0; i < pins.length - 1; i++) g.lineBetween(pins[i].x, pins[i].y, pins[i + 1].x, pins[i + 1].y);
      const k = (time - flareAt) / 500;
      if (k >= 0 && k < 1) {
        g.lineStyle(8 * (1 - k), SF.starHot, 1 - k);
        for (let i = 0; i < flared.length; i++) { const a = flared[i], b = flared[(i + 1) % flared.length]; g.lineBetween(a.x, a.y, b.x, b.y); }
      }
    },
    drawAir(g) {
      for (const p of pins) {
        const life = 1 - (now - p.at) / 8000;
        star(g, p.x, p.y, 7, SF.starGold, 0.4 + 0.6 * life);
      }
    },
  };
};

/**
 * Pocket Lens — a jeweller's loupe of Galilee's glass. Go 1.5s without being hit and the lens
 * comes into focus over you: your next hit lands 70% harder, and then it must refocus. Being hit
 * while focused knocks the focus out.
 */
const pocketLens: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let lastHurt = 0;
  let now = 0;
  let focused = false;
  let usedAt = -9999;
  let start = -1;
  const dmg = heldWindow((m, ms) => ctx.boostDamage(m, ms), 300);
  return {
    update(time) {
      now = time;
      if (start < 0) { start = time; lastHurt = time; }
      if (!focused && time - Math.max(lastHurt, usedAt) >= 1500) {
        focused = true;
        ctx.sfx('crystal-chime');
      }
      if (focused) dmg(time, 1.7);
    },
    onHitTaken() { lastHurt = now; focused = false; },
    onHitDealt(amount) {
      if (!focused || amount <= 0) return;
      focused = false;
      usedAt = now;
      const n = ctx.npc;
      if (alive(n)) ctx.float(n.x, n.y - 50, 'MAGNIFIED', '#c8e8ff');
    },
    drawAir(g, time) {
      const p = ctx.player;
      const k = focused ? 1 : clamp((now - Math.max(lastHurt, usedAt)) / 1500, 0, 1);
      g.lineStyle(2.5, SF.brass, 0.9); g.strokeCircle(p.x + 22, p.y - 40, 8);
      g.fillStyle(SF.comet, focused ? 0.8 : 0.25 * k); g.fillCircle(p.x + 22, p.y - 40, 6);
      if (focused) {
        g.lineStyle(1.5, 0xffffff, 0.6 + 0.3 * Math.sin(time / 90));
        g.strokeCircle(p.x, p.y - 4, 34);
      }
    },
  };
};

/**
 * Eclipse Locket — a locket with a black disc that slides across a gold one. Every 12s it eclipses
 * for 2.5s: while the disc is over the sun, 40% of every hit you take comes back as health. When
 * the disc slides off, the corona flares: a foe within 160px takes 12.
 */
const eclipseLocket: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const tick = makeClock();
  let t0 = -1;
  let wasDark = false;
  let flareAt = -9999;
  let now = 0;
  const PERIOD = 12000, DARK = 2500;
  const phase = (): number => ((now - t0) % PERIOD);
  return {
    update(time) {
      tick(time);
      now = time;
      if (t0 < 0) t0 = time;
      const dark = phase() >= PERIOD - DARK;
      if (dark && !wasDark) { ctx.sfx('hush'); ctx.float(ctx.player.x, ctx.player.y - 50, 'ECLIPSED', '#fff4d0'); }
      if (!dark && wasDark) {
        flareAt = time;
        ctx.sfx('holy-chord');
        const p = ctx.player, n = ctx.npc;
        if (alive(n) && dist(p.x, p.y, n.x, n.y) < 160) { ctx.hit(n, 12, n.x, n.y); ctx.float(n.x, n.y - 46, 'CORONA', '#fff4d0'); }
      }
      wasDark = dark;
    },
    onHitTaken(amount) {
      // The dark half of the locket turns the blow: hand back 40% of it as health.
      if (wasDark && amount > 0) ctx.heal(ctx.player, amount * 0.4);
    },
    drawAir(g, time) {
      const p = ctx.player;
      const x = p.x - 22, y = p.y - 40;
      const ph = phase();
      const k = ph >= PERIOD - DARK ? 1 : clamp((ph - (PERIOD - DARK - 1500)) / 1500, 0, 1);
      g.fillStyle(SF.corona, 1); g.fillCircle(x, y, 6);
      g.fillStyle(SF.nightDeep, 1); g.fillCircle(x - 12 + k * 12, y, 6);
      if (wasDark) {
        g.fillStyle(SF.nightDeep, 0.25); g.fillCircle(p.x, p.y, 34);
        g.lineStyle(2, SF.corona, 0.6); g.strokeCircle(p.x, p.y, 34);
      }
      const f = (time - flareAt) / 450;
      if (f >= 0 && f < 1) { g.lineStyle(5 * (1 - f), SF.corona, 1 - f); g.strokeCircle(p.x, p.y, 40 + f * 130); }
    },
  };
};

// ── Artifact script ──────────────────────────────────────────────────

/**
 * The Evening Star — Nova's own star, taken out of the sky and set in a ring. It lives a star's
 * life over and over, 6 seconds an age: STARLIGHT (each ability you cast shaves 0.4s off your
 * others), RED GIANT (your hits land 25% harder and a foe within 120px burns for 3 a second), WHITE
 * DWARF (you move 30% faster).
 */
const eveningStar: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const tick = makeClock();
  let t0 = -1;
  let now = 0;
  let lastAge = -1;
  let burnAcc = 0;
  const used = new Set<string>();
  const dmg = heldWindow((m, ms) => ctx.boostDamage(m, ms));
  const spd = heldWindow((m, ms) => ctx.boostSpeed(m, ms));
  const AGE_MS = 6000;
  const NAMES = ['STARLIGHT', 'RED GIANT', 'WHITE DWARF'];
  const COLS = ['#f4f0ff', '#ff6a3a', '#ffffff'];
  const age = (): number => Math.floor((now - t0) / AGE_MS) % 3;
  return {
    update(time) {
      const dt = tick(time);
      now = time;
      if (t0 < 0) t0 = time;
      const a = age();
      if (a !== lastAge) {
        lastAge = a;
        ctx.float(ctx.player.x, ctx.player.y - 56, NAMES[a], COLS[a]);
        ctx.sfx(a === 1 ? 'flame-burst' : a === 2 ? 'blink' : 'sparkle');
      }
      if (a === 1) {
        dmg(time, 1.25);
        const p = ctx.player, n = ctx.npc;
        if (alive(n) && dist(p.x, p.y, n.x, n.y) < 120) {
          burnAcc += 3 * dt;
          if (burnAcc >= 1) { const d = Math.floor(burnAcc); burnAcc -= d; ctx.hit(n, d, n.x, n.y); }
        }
      }
      if (a === 2) spd(time, 1.3);
    },
    onCast(id, slot) {
      if (slot === null) return;
      used.add(id);
      if (age() !== 0) return;
      for (const other of used) if (other !== id) ctx.refund(other, 400);
    },
    drawGround(g) {
      if (age() !== 1) return;
      const p = ctx.player;
      g.fillStyle(SF.giant, 0.08); g.fillCircle(p.x, p.y, 120);
      g.lineStyle(1.5, SF.giant, 0.35); g.strokeCircle(p.x, p.y, 120);
    },
    drawAir(g, time) {
      const p = ctx.player;
      const t = time / 1000;
      const a = age();
      const x = p.x, y = p.y - 62;
      if (a === 0) star(g, x, y, 7 + Math.sin(t * 3), SF.star, 1);
      else if (a === 1) { g.fillStyle(SF.giant, 0.9); g.fillCircle(x, y, 7); g.fillStyle(SF.giantLit, 0.9); g.fillCircle(x - 2, y - 2, 3); }
      else { star(g, x, y, 4, 0xffffff, 1); g.lineStyle(1, 0xffffff, 0.8); g.lineBetween(x - 12, y, x + 12, y); g.lineBetween(x, y - 12, x, y + 12); }
      // How far through this age.
      const k = ((now - t0) % AGE_MS) / AGE_MS;
      g.lineStyle(1.5, SF.starGold, 0.6); g.beginPath(); g.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const STARFALL_ITEMS: IsleItemDef[] = [
  {
    id: 'starfall-comet-tail',
    name: 'Comet Tail',
    emoji: '☄️',
    kind: 'charm',
    price: 260,
    flavor: 'A twist of comet-hair in a brass ferrule. Vega swears she combed it out of a falling star with her fingers.',
    script: 'starfall-comet-tail',
    scriptText: [
      'Every 3rd ability you cast calls a comet down on the foe\'s feet.',
      'It lands 0.7s later in a ring: 12 damage if the foe is still standing in it.',
    ],
    isle: 'air',
  },
  {
    id: 'starfall-constellation-pin',
    name: 'Constellation Pin',
    emoji: '📌',
    kind: 'charm',
    price: 430,
    flavor: 'A gold pin with a star for a head, from Ursa\'s chart-table. Wherever you stick it, a figure starts to form.',
    script: 'starfall-constellation-pin',
    scriptText: [
      'Each hit pins a star where the foe stood (max 4, 8s each), joined into a figure.',
      'The 4th pin flares the figure: 16 damage if the foe is touching any of its lines.',
    ],
    effect: { critChance: 0.02 },
    isle: 'air',
  },
  {
    id: 'starfall-pocket-lens',
    name: 'Pocket Lens',
    emoji: '🔍',
    kind: 'charm',
    price: 590,
    flavor: 'A loupe ground from a chip of Galilee\'s great lens. Everything through it looks larger. Including your temper.',
    script: 'starfall-pocket-lens',
    scriptText: [
      'Go 1.5s without being hit and the lens focuses: your next hit lands 70% harder.',
      'Then it must refocus. Being hit while focused knocks it out of focus.',
    ],
    isle: 'air',
  },
  {
    id: 'starfall-eclipse-locket',
    name: 'Eclipse Locket',
    emoji: '🌑',
    kind: 'charm',
    price: 780,
    flavor: 'A gold locket with a black disc on a track inside. Umbra winds it every night. It keeps better time than he does.',
    script: 'starfall-eclipse-locket',
    scriptText: [
      'Every 12s the locket eclipses for 2.5s: 40% of every hit you take then comes back as health.',
      'As the disc slides off, the corona flares: a foe within 160px takes 12.',
    ],
    effect: { maxHp: 10 },
    isle: 'air',
  },
  {
    id: 'art-nova',
    name: 'The Evening Star',
    emoji: '🌟',
    kind: 'artifact',
    flavor: 'Prince Nova\'s own star, taken out of the sky and set in a ring. It is very small and very heavy and it will not stop living.',
    effect: { maxHp: 25, damageMult: 1.04 },
    script: 'art-nova',
    scriptText: [
      'Lives a star\'s life on a loop, 6s an age.',
      'STARLIGHT: each ability cast shaves 0.4s off your others. RED GIANT: +25% damage; a foe within 120px burns 3/s.',
      'WHITE DWARF: you move 30% faster.',
    ],
    isle: 'air',
  },
  {
    id: 'fish-comet-minnow',
    name: 'Comet Minnow',
    emoji: '🐟',
    kind: 'fish',
    sell: 60,
    flavor: 'A darting sliver of a fish trailing a little tail of light. It never stops moving, and after you eat one, neither do you.',
    effect: { speedMult: 1.05 },
    isle: 'air',
  },
  {
    id: 'fish-nebula-ray',
    name: 'Nebula Ray',
    emoji: '🐠',
    kind: 'fish',
    sell: 115,
    flavor: 'A soft ray, pink and teal and full of tiny stars, that glides through the Starpool like a cloud of gas. Settles the breath.',
    effect: { regenPerSecond: 0.7 },
    isle: 'air',
  },
  {
    id: 'fish-meteor-perch',
    name: 'Meteor Perch',
    emoji: '🐡',
    kind: 'fish',
    sell: 170,
    flavor: 'A heavy, pitted perch that sinks like a stone and fights like a falling one. Its scales are iron. So, afterwards, is your hide.',
    effect: { shieldHp: 16 },
    isle: 'air',
  },
];

export const STARFALL_SCRIPTS: Record<string, ItemScriptFactory> = {
  'starfall-comet-tail': cometTail,
  'starfall-constellation-pin': constellationPin,
  'starfall-pocket-lens': pocketLens,
  'starfall-eclipse-locket': eclipseLocket,
  'art-nova': eveningStar,
};

export const STARFALL_SHOPS: ShopDef[] = [
  {
    id: 'starfall-shop',
    name: 'The Almanac',
    stock: ['starfall-comet-tail', 'starfall-constellation-pin', 'starfall-pocket-lens', 'starfall-eclipse-locket'],
    buys: true,
  },
];

export const STARFALL_FISHERIES: FisheryDef[] = [
  { id: 'starfall-pool', name: 'The Starpool', kind: 'aurora' },
];

/** The Starpool is starlight, not water: its 'aurora' kind needs the skyline rod. */
export const STARFALL_FISH: FishDef[] = [
  { id: 'fish-comet-minnow', fisheries: ['starfall-pool'], weight: 50, fight: 3, size: [10, 24] },
  { id: 'fish-nebula-ray', fisheries: ['starfall-pool'], weight: 33, fight: 3, size: [30, 70] },
  { id: 'fish-meteor-perch', fisheries: ['starfall-pool'], weight: 17, fight: 5, size: [35, 80] },
];
