import Phaser from 'phaser';
import type {
  FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef,
} from '../../../../IslesTypes';
import {
  BRASS, BRASS_DARK, BRASS_LIT, GLASS_GLINT, PLASMA, PLASMA_CORE, PLASMA_DEEP, PLASMA_LIT, SHADE, SUN,
  SUN_CORE, SUN_RIM,
} from './palette';

/**
 * The Corona Court's goods: four charms from Brightwell's Lenses, Prince Flux's armillary, and the
 * two fish of the glass pool. Every charm and the artifact carries a bespoke script.
 *
 * Note for every script that damages the foe: the engine reports *all* damage the foe takes to
 * `onHitDealt`, including a script's own `ctx.hit`. Each script that hits from inside that hook
 * holds a re-entrancy flag so it never feeds itself.
 */

const angDiff = (a: number, b: number): number => Math.abs(Phaser.Math.Angle.Wrap(a - b));
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(bx - ax, by - ay);

/** A jagged bolt between two points, re-rolled each call (for brief arcs). */
function bolt(g: Phaser.GameObjects.Graphics, ax: number, ay: number, bx: number, by: number, color: number, a: number): void {
  const n = 7;
  let px = ax, py = ay;
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const nx = ax + (bx - ax) * t + (k < n ? (Math.random() - 0.5) * 16 : 0);
    const ny = ay + (by - ay) * t + (k < n ? (Math.random() - 0.5) * 16 : 0);
    g.lineStyle(5, color, a * 0.3); g.lineBetween(px, py, nx, ny);
    g.lineStyle(1.8, PLASMA_CORE, a); g.lineBetween(px, py, nx, ny);
    px = nx; py = ny;
  }
}

// ── Pocket Sun ──────────────────────────────────────────────────────────

/**
 * A thumb-sized sun orbits you once every four seconds, and you cast a shadow away from it. A foe
 * standing in your shadow takes +30% from every hit you land; the mote itself sears whatever it
 * passes through. You fight by keeping the foe on your dark side.
 */
const pocketSun: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const PERIOD = 4;
  const R = 54;
  const WEDGE = 0.42;
  let ang = 0;
  let busy = false;
  let lastSear = 0;
  const moteX = (): number => ctx.player.x + Math.cos(ang) * R;
  const moteY = (): number => ctx.player.y - 10 + Math.sin(ang) * R * 0.6;
  const inShadow = (): boolean => {
    const p = ctx.player, n = ctx.npc;
    return angDiff(Math.atan2(n.y - p.y, n.x - p.x), ang + Math.PI) < WEDGE;
  };
  return {
    update(time, dt) {
      ang = (ang + dt * (Math.PI * 2) / PERIOD) % (Math.PI * 2);
      const n = ctx.npc;
      if (n.active && n.hp > 0 && dist(moteX(), moteY(), n.x, n.y) < 28 && time - lastSear > 500) {
        lastSear = time;
        busy = true; ctx.hit(n, 4, moteX(), moteY()); busy = false;
        ctx.float(n.x, n.y - 40, 'SEARED', '#ffd54a');
      }
    },
    onHitDealt(amount) {
      if (busy || !inShadow()) return;
      busy = true;
      ctx.hit(ctx.npc, Math.max(1, Math.round(amount * 0.3)));
      busy = false;
    },
    drawGround(g) {
      const p = ctx.player;
      const a = ang + Math.PI;
      const shaded = inShadow();
      g.fillStyle(SHADE, shaded ? 0.42 : 0.24);
      g.slice(p.x, p.y, 230, a - WEDGE, a + WEDGE, false);
      g.fillPath();
      if (shaded) {
        g.lineStyle(2, SUN_RIM, 0.6);
        g.beginPath(); g.arc(p.x, p.y, 230, a - WEDGE, a + WEDGE, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      const x = moteX(), y = moteY();
      g.fillStyle(SUN, 0.18); g.fillCircle(x, y, 13);
      g.fillStyle(SUN_RIM, 1); g.fillCircle(x, y, 6.5);
      g.fillStyle(SUN, 1); g.fillCircle(x - 0.5, y - 0.5, 5);
      g.fillStyle(SUN_CORE, 1); g.fillCircle(x - 1.5, y - 1.5, 2.2);
      for (let i = 0; i < 6; i++) {
        const ra = i * 1.047 + time / 400;
        g.lineStyle(1.2, SUN, 0.7);
        g.lineBetween(x + Math.cos(ra) * 7, y + Math.sin(ra) * 7, x + Math.cos(ra) * 11, y + Math.sin(ra) * 11);
      }
    },
  };
};

// ── Spent Arc-Fuse ──────────────────────────────────────────────────────

/**
 * Every ability you cast stores a charge in the fuse (four at most, crackling round you). Full,
 * it waits: the moment the foe comes within reach, all four jump to them as one arc. Taking a hit
 * grounds one charge out through you — so it pays to cast, close in, and not get touched.
 */
const arcFuse: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const MAX = 4;
  const REACH = 170;
  let charges = 0;
  let arcUntil = 0;
  let arcFrom = { x: 0, y: 0 };
  let arcTo = { x: 0, y: 0 };
  return {
    onCast() {
      if (charges < MAX) {
        charges++;
        if (charges === MAX) ctx.float(ctx.player.x, ctx.player.y - 46, 'FUSE PRIMED', '#e6d2ff');
      }
    },
    onHitTaken() {
      if (charges > 0) {
        charges--;
        ctx.float(ctx.player.x, ctx.player.y - 40, 'grounded', '#9a7acc');
      }
    },
    update(time) {
      const p = ctx.player, n = ctx.npc;
      if (charges < MAX || !n.active || n.hp <= 0) return;
      if (dist(p.x, p.y, n.x, n.y) > REACH) return;
      charges = 0;
      arcUntil = time + 220;
      arcFrom = { x: p.x, y: p.y - 12 };
      arcTo = { x: n.x, y: n.y };
      ctx.hit(n, 16, n.x, n.y);
      ctx.flash(n.x, n.y, PLASMA_LIT);
      ctx.sfx('plasma-arc');
      ctx.float(n.x, n.y - 48, 'ARC!', '#e6d2ff');
    },
    drawGround(g) {
      if (charges < MAX) return;
      const p = ctx.player;
      g.lineStyle(1.5, PLASMA, 0.35);
      g.strokeCircle(p.x, p.y, REACH);
    },
    drawAir(g, time) {
      const p = ctx.player;
      for (let i = 0; i < charges; i++) {
        const a = time / 300 + (i / MAX) * Math.PI * 2;
        const x = p.x + Math.cos(a) * 30, y = p.y - 8 + Math.sin(a) * 14;
        g.fillStyle(PLASMA_DEEP, 0.9); g.fillCircle(x, y, 4);
        g.fillStyle(PLASMA_LIT, 1); g.fillCircle(x, y, 2.4);
      }
      if (charges === MAX && Math.floor(time / 90) % 3 === 0) {
        const a = Math.random() * Math.PI * 2;
        bolt(g, p.x, p.y - 8, p.x + Math.cos(a) * 34, p.y - 8 + Math.sin(a) * 20, PLASMA, 0.7);
      }
      if (time < arcUntil) bolt(g, arcFrom.x, arcFrom.y, arcTo.x, arcTo.y, PLASMA, 1);
    },
  };
};

// ── Ration Mirror ───────────────────────────────────────────────────────

/**
 * The clerks' own instrument, stolen: while you stand still, the mirror over your head soaks up
 * sunlight (up to 36 lumens). Your next cast throws all of it at the foe as a beam — over a dozen
 * damage from a full mirror, anywhere in the room. Moving spills the light slowly.
 */
const rationMirror: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const MAX = 36;
  let lumens = 0;
  let lx = ctx.player.x, ly = ctx.player.y;
  let beamUntil = 0;
  let beamTo = { x: 0, y: 0 };
  let beamFrom = { x: 0, y: 0 };
  return {
    update(_time, dt) {
      const p = ctx.player;
      const moved = dist(lx, ly, p.x, p.y);
      lx = p.x; ly = p.y;
      if (moved < 0.6) lumens = Math.min(MAX, lumens + 12 * dt);
      else lumens = Math.max(0, lumens - 3 * dt);
    },
    onCast(_id, slot) {
      if (slot === null || lumens < 8) return;
      const p = ctx.player, n = ctx.npc;
      if (!n.active || n.hp <= 0) return;
      const dmg = Math.round(lumens * 0.5);
      beamFrom = { x: p.x, y: p.y - 46 };
      beamTo = { x: n.x, y: n.y };
      beamUntil = ctx.scene.time.now + 260;
      ctx.hit(n, dmg, n.x, n.y);
      ctx.flash(n.x, n.y, SUN);
      ctx.sfx('light-beam');
      ctx.float(n.x, n.y - 46, `RATION RETURNED ${dmg}`, '#ffe08a');
      lumens = 0;
    },
    drawAir(g, time) {
      const p = ctx.player;
      const mx = p.x, my = p.y - 46;
      const k = lumens / MAX;
      // The mirror: a brass oval tilted toward the sky, its face filling with gold.
      g.fillStyle(BRASS_DARK, 1); g.fillEllipse(mx, my, 22, 13);
      g.fillStyle(0x56606a, 1); g.fillEllipse(mx, my, 17, 9);
      if (k > 0) { g.fillStyle(SUN, 0.35 + k * 0.6); g.fillEllipse(mx, my, 17 * k, 9 * k); }
      g.fillStyle(GLASS_GLINT, 0.7); g.fillEllipse(mx - 3, my - 2, 5, 2);
      if (k >= 1) {
        g.lineStyle(1, SUN_CORE, 0.5 + 0.5 * Math.sin(time / 80));
        g.strokeEllipse(mx, my, 28, 18);
      }
      if (time < beamUntil) {
        const a = (beamUntil - time) / 260;
        g.lineStyle(12, SUN, 0.3 * a); g.lineBetween(beamFrom.x, beamFrom.y, beamTo.x, beamTo.y);
        g.lineStyle(4, SUN_CORE, a); g.lineBetween(beamFrom.x, beamFrom.y, beamTo.x, beamTo.y);
      }
    },
  };
};

// ── Containment Coil ────────────────────────────────────────────────────

/**
 * A ring of Torus's bottle-wire worn at the hip. Half of every hit you take is caught in the coil
 * instead of in you (up to 40 held). The coil keeps it for four seconds; every hit you land in
 * that time vents a third of the store into the foe. Whatever is still held when time runs out
 * discharges back into you at 70%. Fight back and the coil is armour; turtle and it is a fuse.
 */
const containmentCoil: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const CAP = 40;
  const HOLD_MS = 4000;
  let store = 0;
  let dueAt = 0;
  let busy = false;
  return {
    onHitTaken(amount) {
      if (busy) return;
      const take = Math.min(amount * 0.5, CAP - store);
      if (take <= 0.5) return;
      store += take;
      if (dueAt === 0) dueAt = ctx.scene.time.now + HOLD_MS;
      ctx.heal(ctx.player, take);
    },
    onHitDealt() {
      if (busy || store < 1) return;
      const vent = store / 3;
      store -= vent;
      busy = true;
      ctx.hit(ctx.npc, vent);
      busy = false;
      ctx.float(ctx.npc.x, ctx.npc.y - 44, 'VENTED', '#c89aff');
      if (store < 1) { store = 0; dueAt = 0; }
    },
    update(time) {
      if (dueAt === 0 || time < dueAt) return;
      const back = store * 0.7;
      store = 0; dueAt = 0;
      if (back >= 1) {
        busy = true;
        ctx.hit(ctx.player, back);
        busy = false;
        ctx.float(ctx.player.x, ctx.player.y - 44, 'COIL DISCHARGE', '#ff9ad0');
        ctx.sfx('status-shock');
      }
    },
    drawGround(g, time) {
      const p = ctx.player;
      const k = store / CAP;
      g.lineStyle(3, BRASS_DARK, 0.8); g.strokeEllipse(p.x, p.y + 14, 50, 16);
      if (k <= 0) return;
      const left = dueAt ? Math.max(0, (dueAt - time) / HOLD_MS) : 0;
      g.lineStyle(3, PLASMA, 0.4 + 0.5 * k);
      g.beginPath(); g.arc(p.x, p.y + 14, 25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left, false); g.strokePath();
      for (let i = 0; i < 6; i++) {
        const a = time / 200 + i * 1.05;
        g.fillStyle(PLASMA_LIT, 0.4 + 0.5 * k);
        g.fillCircle(p.x + Math.cos(a) * 25, p.y + 14 + Math.sin(a) * 8, 1.5 + k * 1.5);
      }
    },
  };
};

// ── Flux's Armillary (artifact) ─────────────────────────────────────────

/**
 * Prince Flux's own instrument, a hand-span armillary with a seed of the captive sun in it.
 * Three brass rings turn round you; each ability you cast locks one in place. Lock all three and
 * they *align*: a corona bursts out of you (22 damage within 200px, 8 healed) and for three
 * seconds every hit you land is 20% hotter. Then the rings slip free and start turning again.
 */
const fluxArmillary: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const RADIUS = 200;
  let locked = 0;
  let cooldownUntil = 0;
  let burstAt = -1e9;
  let hotUntil = 0;
  return {
    onCast(_id, slot) {
      const now = ctx.scene.time.now;
      if (slot === null || now < cooldownUntil) return;
      locked++;
      ctx.sfx('gear-turn');
      if (locked < 3) return;
      const p = ctx.player, n = ctx.npc;
      locked = 0;
      cooldownUntil = now + 1500;
      burstAt = now;
      hotUntil = now + 3000;
      ctx.sfx('light-beam');
      ctx.float(p.x, p.y - 56, 'ALIGNMENT', '#ffe08a');
      ctx.heal(p, 8);
      ctx.boostDamage(1.2, 3000);
      if (n.active && n.hp > 0 && dist(p.x, p.y, n.x, n.y) <= RADIUS) ctx.hit(n, 22, n.x, n.y);
    },
    drawGround(g, time) {
      const age = time - burstAt;
      if (age < 0 || age > 450) return;
      const p = ctx.player;
      const k = age / 450;
      g.lineStyle(10 * (1 - k), SUN, 0.6 * (1 - k)); g.strokeCircle(p.x, p.y, RADIUS * (0.3 + 0.7 * k));
      g.lineStyle(3, SUN_CORE, 0.9 * (1 - k)); g.strokeCircle(p.x, p.y, RADIUS * (0.3 + 0.7 * k));
    },
    drawAir(g, time) {
      const p = ctx.player;
      const cx = p.x, cy = p.y - 6;
      const hot = time < hotUntil;
      // Three rings, each a different tilt; locked ones stop dead and glow.
      for (let i = 0; i < 3; i++) {
        const isLocked = i < locked || hot;
        const spin = isLocked ? i * 0.9 : time / (500 + i * 170) + i * 2;
        const rx = 30 + i * 4;
        const ry = Math.abs(Math.cos(spin)) * rx * 0.9 + 3;
        g.lineStyle(3, BRASS_DARK, 0.9);
        g.strokeEllipse(cx, cy, rx * 2, ry * 2);
        g.lineStyle(1.5, isLocked ? BRASS_LIT : BRASS, 1);
        g.strokeEllipse(cx, cy, rx * 2, ry * 2);
        if (isLocked) { g.fillStyle(SUN, 0.8); g.fillCircle(cx + rx, cy, 2.4); }
      }
      // The seed of the sun at the hub.
      const pulse = hot ? 1.5 + 0.4 * Math.sin(time / 60) : 1;
      g.fillStyle(SUN, 0.25); g.fillCircle(cx, cy - 34, 7 * pulse);
      g.fillStyle(SUN_RIM, 1); g.fillCircle(cx, cy - 34, 3.2 * pulse);
      g.fillStyle(SUN_CORE, 1); g.fillCircle(cx - 0.6, cy - 34.6, 1.6 * pulse);
    },
  };
};

// ── Items ───────────────────────────────────────────────────────────────

export const CORONA_ITEMS: IsleItemDef[] = [
  {
    id: 'corona-pocket-sun', name: 'Pocket Sun', emoji: '🌞', kind: 'charm', price: 280, sell: 90, isle: 'fire',
    flavor: 'A bead of the captive sun Ottoline swears she found on the plaza. It is warm. It is always warm.',
    script: 'corona-pocket-sun',
    scriptText: [
      'A tiny sun orbits you every 4s; you cast a shadow on the far side.',
      'A foe in your shadow takes +30% from your hits.',
      'The sun itself sears (4) whatever it passes through.',
    ],
  },
  {
    id: 'corona-arc-fuse', name: 'Spent Arc-Fuse', emoji: '🧯', kind: 'charm', price: 220, sell: 70, isle: 'fire',
    flavor: 'Pulled warm from a pylon. Galvana says spent fuses remember being full, and try to be again.',
    script: 'corona-arc-fuse',
    scriptText: [
      'Each cast stores a charge (max 4).',
      'Full: the moment the foe is within 170px, all four jump to them as an arc (16).',
      'Every hit you take grounds one charge out.',
    ],
  },
  {
    id: 'corona-ration-mirror', name: 'Ration Mirror', emoji: '🪞', kind: 'charm', price: 340, sell: 110, isle: 'fire',
    flavor: 'A meter-clerk\'s mirror, the seal scratched off. It still knows exactly how much light it is owed.',
    script: 'corona-ration-mirror',
    scriptText: [
      'Standing still fills the mirror with light (up to 36).',
      'Your next cast fires it all at the foe as a beam: half the stored light in damage, any range.',
      'Moving slowly spills the light.',
    ],
  },
  {
    id: 'corona-containment-coil', name: 'Containment Coil', emoji: '🌀', kind: 'charm', price: 420, sell: 140, isle: 'fire',
    flavor: 'Bottle-wire off the works at the south road. Torus will want it back. Torus can ask.',
    script: 'corona-containment-coil',
    effect: { maxHp: 10 },
    scriptText: [
      'Half of each hit you take is held in the coil instead (up to 40).',
      'For 4s, each hit you land vents a third of the store into the foe.',
      'Whatever is still held after 4s discharges back into you at 70%.',
    ],
  },
  {
    id: 'art-flux', name: 'Flux\'s Armillary', emoji: '🔭', kind: 'artifact', isle: 'fire',
    flavor: 'The Prince\'s hand-armillary, with a seed of the captive sun in it. It still turns to his rhythm.',
    script: 'art-flux',
    effect: { maxHp: 15 },
    scriptText: [
      'Three brass rings turn round you; each cast locks one.',
      'All three locked: ALIGNMENT — a corona burst (22 within 200px), heal 8,',
      'and +20% damage for 3s. The rings free themselves after 1.5s.',
    ],
  },
  {
    id: 'fish-photon-tetra', name: 'Photon Tetra', emoji: '🐟', kind: 'fish', sell: 22, isle: 'fire',
    flavor: 'A finger of a fish that stores sunlight in its scales and blinks it out at night. Crunchy. Bright.',
    effect: { speedMult: 1.05 },
  },
  {
    id: 'fish-sunscale', name: 'Sunscale', emoji: '🐠', kind: 'fish', sell: 75, isle: 'fire',
    flavor: 'Its scales are warm to the touch long after it is landed. Hesper keeps one under her pillow.',
    effect: { regenPerSecond: 0.6, damageMult: 1.03 },
  },
];

export const CORONA_SCRIPTS: Record<string, ItemScriptFactory> = {
  'corona-pocket-sun': pocketSun,
  'corona-arc-fuse': arcFuse,
  'corona-ration-mirror': rationMirror,
  'corona-containment-coil': containmentCoil,
  'art-flux': fluxArmillary,
};

export const CORONA_SHOPS: ShopDef[] = [
  {
    id: 'corona-shop',
    name: 'Brightwell\'s Lenses',
    stock: ['corona-arc-fuse', 'corona-pocket-sun', 'corona-ration-mirror', 'corona-containment-coil'],
    buys: true,
  },
];

export const CORONA_FISHERIES: FisheryDef[] = [
  { id: 'corona-glasspool', name: 'The Glass Pool', kind: 'pond' },
];

export const CORONA_FISH: FishDef[] = [
  { id: 'fish-photon-tetra', fisheries: ['corona-glasspool'], weight: 7, fight: 2, size: [3, 7] },
  { id: 'fish-sunscale', fisheries: ['corona-glasspool'], weight: 2, fight: 4, size: [28, 56] },
];

