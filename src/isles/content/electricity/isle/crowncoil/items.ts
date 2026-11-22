import type { IsleItemDef, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import { AMBER, ARC, BRASS, COPPER, IRON_LIT, bolt, crackle, leydenJar, meterDial } from './art';

/**
 * The Crown Coil's treasures: the Empress's own Grid Key (her artifact — the key to every meter
 * on Voltreach), and two charms found in the tower — an overseer's crank-handle from the
 * Treadmill Galleries, and a pocket Leyden jar from the Capacitor Banks.
 */

const alive = (ctx: ItemScriptCtx, who: 'player' | 'npc'): boolean => {
  const f = who === 'player' ? ctx.player : ctx.npc;
  return f.active && f.hp > 0;
};

// ── art-ohmrine: The Grid Key ────────────────────────────────────────

/**
 * The brass key that opens every meter on the isle. It meters *you*: every hit you land stores
 * a cell of current (up to six, shown as a ring of lamps over you). When a hit lands on you
 * while you hold cells, one cell earths back along a wire into the foe for 8. Fill all six and
 * your next ability cast empties the meter in one bolt: 5 per cell, and the foe takes +20% for
 * 3s — the Brownout.
 */
const gridKey: ItemScriptFactory = (ctx) => {
  const MAX = 6;
  const BACK = 8;
  const PER = 5;
  let cells = 0;
  let wireAt = -9999;
  let boltAt = -9999;
  let lastGain = 0;
  return {
    onHitDealt() {
      const now = ctx.scene.time.now;
      if (cells >= MAX || now - lastGain < 250) return;
      lastGain = now;
      cells++;
      if (cells === MAX) { ctx.float(ctx.player.x, ctx.player.y - 62, 'METER FULL', '#ffc85a'); ctx.sfx('electric-charge'); }
    },
    onHitTaken() {
      if (cells <= 0 || !alive(ctx, 'npc')) return;
      cells--;
      wireAt = ctx.scene.time.now;
      const n = ctx.npc;
      ctx.hit(n, BACK, n.x, n.y);
      ctx.float(n.x, n.y - 48, 'EARTHED', '#bfe8ff');
      ctx.sfx('zap');
    },
    onCast() {
      if (cells < MAX || !alive(ctx, 'npc')) return;
      const n = ctx.npc;
      ctx.hit(n, cells * PER, n.x, n.y);
      ctx.boostDamage(1.2, 3000);
      ctx.float(n.x, n.y - 60, 'BROWNOUT', '#ffc85a');
      ctx.flash(n.x, n.y, ARC);
      ctx.sfx('thunder');
      cells = 0;
      boltAt = ctx.scene.time.now;
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player, n = ctx.npc;
      // The ring of meter lamps over your head.
      for (let i = 0; i < MAX; i++) {
        const a = -Math.PI / 2 + ((i - (MAX - 1) / 2) / MAX) * Math.PI * 0.9;
        const x = p.x + Math.cos(a) * 26, y = p.y - 52 + Math.sin(a) * 10;
        g.fillStyle(0x1a1a1a, 0.8); g.fillCircle(x, y, 3.6);
        if (i < cells) { g.fillStyle(cells >= MAX ? AMBER : ARC, 0.95); g.fillCircle(x, y, 2.6); }
      }
      if (cells >= MAX) crackle(g, p.x, p.y - 52, 18, Math.floor(time / 70), AMBER, 0.7, 4);
      if (time - wireAt < 220 && alive(ctx, 'npc')) bolt(g, p.x, p.y - 20, n.x, n.y - 20, Math.floor(time / 40), ARC, 2, 1 - (time - wireAt) / 220, 0.15, 0);
      if (time - boltAt < 320 && alive(ctx, 'npc')) bolt(g, p.x, p.y - 30, n.x, n.y - 20, Math.floor(time / 30), AMBER, 4, 1 - (time - boltAt) / 320, 0.22, 3);
    },
  };
};

// ── charm-crowncoil-crank ────────────────────────────────────────────

/**
 * An overseer's crank-handle, brass worn bright by forty years of somebody else's hands. Walk
 * and it winds: every 450px you cover stores a turn (up to 3, ticked on a dial at your hip). The
 * next hit you land spends every turn for 6 extra damage each.
 */
const crankHandle: ItemScriptFactory = (ctx) => {
  const STEP = 450;
  const MAX = 3;
  const PER = 6;
  let lx = Number.NaN, ly = Number.NaN;
  let walked = 0;
  let turns = 0;
  let spentAt = -9999;
  return {
    update() {
      const p = ctx.player;
      if (!alive(ctx, 'player')) return;
      if (Number.isNaN(lx)) { lx = p.x; ly = p.y; return; }
      const d = Math.hypot(p.x - lx, p.y - ly);
      lx = p.x; ly = p.y;
      // Ignore teleports and shoves: only steps count.
      if (d > 30 || turns >= MAX) return;
      walked += d;
      if (walked >= STEP) {
        walked -= STEP;
        turns++;
        ctx.sfx('gear-turn');
        ctx.float(p.x, p.y - 50, `TURN ${turns}`, '#ffc85a');
      }
    },
    onHitDealt() {
      if (turns <= 0 || !alive(ctx, 'npc')) return;
      const n = ctx.npc;
      ctx.hit(n, turns * PER, n.x, n.y);
      ctx.float(n.x, n.y - 54, `CRANKED +${turns * PER}`, '#ffc85a');
      ctx.sfx('hammer-forge');
      turns = 0;
      spentAt = ctx.scene.time.now;
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      const k = Math.min(1, walked / STEP);
      meterDial(g, p.x + 24, p.y - 6, 7, (turns + (turns >= MAX ? 0 : k)) / MAX, 0.85);
      // The handle itself, turning as you walk.
      const a = (walked / STEP) * Math.PI * 2;
      g.lineStyle(2, IRON_LIT, 0.9); g.lineBetween(p.x + 24, p.y - 6, p.x + 24 + Math.cos(a) * 11, p.y - 6 + Math.sin(a) * 11);
      g.fillStyle(BRASS, 1); g.fillCircle(p.x + 24 + Math.cos(a) * 11, p.y - 6 + Math.sin(a) * 11, 2.5);
      if (time - spentAt < 260) { g.lineStyle(2, COPPER, 1 - (time - spentAt) / 260); g.strokeCircle(p.x + 24, p.y - 6, 10 + (time - spentAt) / 12); }
    },
  };
};

// ── charm-crowncoil-leyden ───────────────────────────────────────────

/**
 * A Leyden jar the size of a lamp-glass, foil-lined, off the Capacitrix's bench. Every hit that
 * lands on you charges it by the damage taken. At 30 it is full: if the foe is within 320px it
 * discharges into them at once for 18; if not, it holds, crackling, until they come close.
 */
const pocketLeyden: ItemScriptFactory = (ctx) => {
  const FULL = 30;
  const REACH = 320;
  const DMG = 18;
  let charge = 0;
  let firedAt = -9999;
  let tx = 0, ty = 0;
  const tryFire = () => {
    if (charge < FULL || !alive(ctx, 'npc') || !alive(ctx, 'player')) return;
    const p = ctx.player, n = ctx.npc;
    if (Math.hypot(n.x - p.x, n.y - p.y) > REACH) return;
    charge = 0;
    firedAt = ctx.scene.time.now;
    tx = n.x; ty = n.y;
    ctx.hit(n, DMG, n.x, n.y);
    ctx.float(n.x, n.y - 52, 'DISCHARGE', '#bfe8ff');
    ctx.flash(n.x, n.y, ARC);
    ctx.sfx('plasma-arc');
  };
  return {
    update() { tryFire(); },
    onHitTaken(amount) {
      if (charge >= FULL) return;
      charge = Math.min(FULL, charge + Math.max(0, amount));
      if (charge >= FULL) ctx.sfx('electric-charge');
      tryFire();
    },
    drawAir(g, time) {
      if (!alive(ctx, 'player')) return;
      const p = ctx.player;
      leydenJar(g, p.x - 24, p.y + 4, 0.18, charge / FULL, time / 1000);
      if (time - firedAt < 260) bolt(g, p.x - 24, p.y - 22, tx, ty - 10, Math.floor(time / 30), ARC, 3, 1 - (time - firedAt) / 260, 0.2, 2);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const CROWNCOIL_ITEMS: IsleItemDef[] = [
  {
    id: 'art-ohmrine', name: 'The Grid Key', emoji: '🗝️', kind: 'artifact', isle: 'electricity',
    flavor: 'The brass key to every meter on Voltreach. It is warm, and it hums, and it has counted every house on the isle.',
    script: 'art-ohmrine', effect: { maxHp: 20 },
    scriptText: [
      'Each hit you land stores a cell (max 6). Hit while holding cells: one earths into the foe for 8.',
      'At 6 cells your next cast empties the meter: 5 per cell, and the foe takes +20% for 3s.',
    ],
  },
  {
    id: 'charm-crowncoil-crank', name: 'Overseer\'s Crank', emoji: '⚙️', kind: 'charm', isle: 'electricity', sell: 220,
    flavor: 'Worn bright by forty years of somebody else\'s hands. It still wants turning.',
    script: 'charm-crowncoil-crank', effect: { speedMult: 1.03 },
    scriptText: ['Every 450px walked stores a turn (max 3). Your next hit spends them all: +6 damage per turn.'],
  },
  {
    id: 'charm-crowncoil-leyden', name: 'Pocket Leyden Jar', emoji: '🫙', kind: 'charm', isle: 'electricity', sell: 240,
    flavor: 'A jar the size of a lamp-glass off the Capacitrix\'s bench. It is never quite empty.',
    script: 'charm-crowncoil-leyden',
    scriptText: ['Damage you take charges it. At 30 it discharges into the foe for 18 — at once if within 320px, else when they near.'],
  },
];

export const CROWNCOIL_SCRIPTS: Record<string, ItemScriptFactory> = {
  'art-ohmrine': gridKey,
  'charm-crowncoil-crank': crankHandle,
  'charm-crowncoil-leyden': pocketLeyden,
};
