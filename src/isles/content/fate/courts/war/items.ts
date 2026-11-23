import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, Pt, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { fieldDrum, horse, lotToken, warBanner } from './art';
import { BANNERET, GILT, GILT_LIT, INK, IRON_LIT, IVORY, RED, RED_LIT, TIMBER_DARK } from './palette';
import { alive, clamp, clock, dist } from './util';

/**
 * The War Court's goods: Quartermaster Brass's four charms, Prince Banneret's field standard, and
 * the flooded trench's three fish. Every charm is a piece of drill kit that plays war the way the
 * court does — on the beat of the drum, from behind a hedge of pikes, by range flag and battery,
 * and on credit from the House. Scripts are registered below under their item ids.
 */

const ISLE = 'fate';

export const CHARM_STICKS = 'war-charm-drumsticks';
export const CHARM_PIKES = 'war-charm-pike-square';
export const CHARM_FLAGS = 'war-charm-range-flags';
export const CHARM_CHIP = 'war-charm-black-chip';
export const ART_BANNERET = 'art-banneret';

export const FISH_TENCH = 'fish-trench-tench';
export const FISH_MUSKIE = 'fish-muster-muskie';
export const FISH_BARB = 'fish-standard-barb';
export const FISHERY = 'war-trench';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Drummer's Sticks ─────────────────────────────────────────────────
// A four-beat bar ticks at your shoulder (0.6s a beat). Cast on the downbeat and the cast is
// refunded 0.7s, and your next blow inside 1.2s lands 7 harder.

const sticks: ItemScriptFactory = (ctx) => {
  const BEAT = 600, BAR = BEAT * 4, SLOP = 170;
  let armedUntil = 0;
  let hitFx = -9999;
  const onDown = (t: number) => { const ph = t % BAR; return ph < SLOP || ph > BAR - SLOP; };
  return {
    onCast(abilityId) {
      const now = ctx.scene.time.now;
      if (!live(ctx) || !onDown(now)) return;
      ctx.refund(abilityId, 700);
      armedUntil = now + 1200;
      hitFx = now;
      ctx.float(ctx.player.x, ctx.player.y - 52, 'ON THE BEAT', '#f4d67e');
      ctx.sfx('drum-hit');
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 1 || now > armedUntil || !foeLive(ctx)) return;
      armedUntil = 0;
      ctx.hit(ctx.npc, 7, ctx.npc.x, ctx.npc.y - 20);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const beat = Math.floor((time % BAR) / BEAT);
      const k = (time % BEAT) / BEAT;
      const x = p.x - 30, y = p.y - 40;
      fieldDrum(g, x, y + 8, 0.42);
      for (let i = 0; i < 4; i++) {
        const on = i === beat;
        g.fillStyle(i === 0 ? RED : IVORY, on ? 1 : 0.35);
        g.fillCircle(x - 9 + i * 6, y - 8, on ? 2.6 - k : 1.6);
      }
      if (onDown(time)) glow(g, x, y, 12, RED_LIT, 0.08, 2);
      if (time - hitFx < 300) { g.lineStyle(2, GILT_LIT, 1 - (time - hitFx) / 300); g.strokeCircle(x, y, 10 + (time - hitFx) / 20); }
    },
  };
};

// ── Pike Square ──────────────────────────────────────────────────────
// Three pikes stand out round you in a slow-turning ring. When the foe comes within 85px the
// nearest ready pike thrusts: 6 damage and a shove back. Each pike takes 3s to recover.

const pikeSquare: ItemScriptFactory = (ctx) => {
  const REACH = 85, RELOAD = 3000;
  const ready = [0, 0, 0];
  const thrustAt = [-9999, -9999, -9999];
  let spin = 0;
  const tick = clock();
  const pikeA = (i: number) => spin + (i / 3) * Math.PI * 2;
  return {
    update(time) {
      spin += tick(time) * 0.6;
      if (!live(ctx) || !foeLive(ctx)) return;
      const p = ctx.player, n = ctx.npc;
      if (dist(p.x, p.y, n.x, n.y) > REACH) return;
      const toFoe = Math.atan2(n.y - p.y, n.x - p.x);
      let best = -1, bd = Infinity;
      for (let i = 0; i < 3; i++) {
        if (time < ready[i]) continue;
        const d = Math.abs(Math.atan2(Math.sin(pikeA(i) - toFoe), Math.cos(pikeA(i) - toFoe)));
        if (d < bd) { bd = d; best = i; }
      }
      if (best < 0) return;
      ready[best] = time + RELOAD;
      thrustAt[best] = time;
      ctx.hit(n, 6, n.x, n.y);
      ctx.nudge(n, Math.cos(toFoe) * 50, Math.sin(toFoe) * 50);
      ctx.sfx('stab');
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const foeA = foeLive(ctx) ? Math.atan2(ctx.npc.y - p.y, ctx.npc.x - p.x) : 0;
      for (let i = 0; i < 3; i++) {
        const fresh = time - thrustAt[i] < 260;
        const a = fresh ? foeA : pikeA(i);
        const up = time >= ready[i];
        const r0 = 14, r1 = fresh ? 92 : up ? 58 : 36;
        g.lineStyle(2.5, TIMBER_DARK, up || fresh ? 1 : 0.45);
        g.lineBetween(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0 * 0.8, p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1 * 0.8);
        const tx = p.x + Math.cos(a) * r1, ty = p.y + Math.sin(a) * r1 * 0.8;
        g.fillStyle(IRON_LIT, up || fresh ? 1 : 0.45);
        g.fillTriangle(tx + Math.cos(a) * 8, ty + Math.sin(a) * 6, tx + Math.cos(a + 1.6) * 3, ty + Math.sin(a + 1.6) * 3, tx + Math.cos(a - 1.6) * 3, ty + Math.sin(a - 1.6) * 3);
        if (up) { g.fillStyle(RED, 1); g.fillCircle(tx - Math.cos(a) * 3, ty - Math.sin(a) * 2, 1.6); }
      }
    },
  };
};

// ── Range Flags ──────────────────────────────────────────────────────
// Your blows plant range flags at the foe's feet (at most one every 0.8s). The third flag calls
// the battery: 0.9s later each flag is shelled, and the foe takes 9 for every flag within 70px.

const rangeFlags: ItemScriptFactory = (ctx) => {
  const flags: Pt[] = [];
  let lastPlant = -9999;
  let firesAt = -1;
  let boomAt = -9999;
  let boomed: Pt[] = [];
  return {
    update(time) {
      if (firesAt < 0 || time < firesAt) return;
      firesAt = -1;
      boomed = flags.splice(0);
      boomAt = time;
      ctx.sfx('explosion-medium');
      if (!foeLive(ctx)) return;
      const n = ctx.npc;
      const hits = boomed.filter((f) => dist(f.x, f.y, n.x, n.y) < 70).length;
      if (hits > 0) { ctx.hit(n, 9 * hits, n.x, n.y); ctx.float(n.x, n.y - 54, hits > 1 ? `BRACKETED ×${hits}` : 'ON TARGET', '#ffb0a0'); }
      for (const f of boomed) ctx.flash(f.x, f.y, RED);
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || firesAt >= 0 || now - lastPlant < 800 || !foeLive(ctx)) return;
      lastPlant = now;
      flags.push({ x: ctx.npc.x, y: ctx.npc.y + 6 });
      ctx.sfx('trap-set');
      if (flags.length >= 3) { firesAt = now + 900; ctx.float(ctx.player.x, ctx.player.y - 52, 'FIRE MISSION', '#f4d67e'); ctx.sfx('mortar-launch'); }
    },
    drawGround(g, time) {
      for (const f of flags) {
        if (firesAt >= 0) {
          const k = clamp(1 - (firesAt - time) / 900, 0, 1);
          g.lineStyle(2, RED, 0.4 + k * 0.5); g.strokeCircle(f.x, f.y, 70 * (1.2 - k * 0.2));
        } else { g.lineStyle(1, RED, 0.3); g.strokeCircle(f.x, f.y, 70); }
        g.lineStyle(1.5, TIMBER_DARK, 1); g.lineBetween(f.x, f.y, f.x, f.y - 22);
        g.fillStyle(RED, 1); g.fillTriangle(f.x, f.y - 22, f.x, f.y - 14, f.x + 10, f.y - 18 + Math.sin(time / 120) * 1.5);
      }
      if (time - boomAt < 500) {
        const k = (time - boomAt) / 500;
        for (const f of boomed) { g.fillStyle(0xffd890, 0.5 * (1 - k)); g.fillCircle(f.x, f.y, 20 + k * 50); }
      }
    },
  };
};

// ── Black Chip ───────────────────────────────────────────────────────
// A busted croupier's black chip. A blow of 8 or more against you (at most every 2.5s) banks half
// of it on the chip, up to 30. Your next hit within 5s collects the whole debt off the foe.

const blackChip: ItemScriptFactory = (ctx) => {
  let debt = 0;
  let dueBy = 0;
  let lastBank = -9999;
  let paidAt = -9999;
  return {
    update(time) { if (debt > 0 && time > dueBy) { debt = 0; } },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 8 || now - lastBank < 2500 || !live(ctx)) return;
      lastBank = now;
      debt = Math.min(30, debt + Math.round(amount / 2));
      dueBy = now + 5000;
      ctx.float(ctx.player.x, ctx.player.y - 50, `ON THE CHIP: ${debt}`, '#c8c0d0');
      ctx.sfx('money');
    },
    onHitDealt(amount) {
      if (amount < 1 || debt <= 0 || !foeLive(ctx)) return;
      const d = debt;
      debt = 0;
      paidAt = ctx.scene.time.now;
      ctx.hit(ctx.npc, d, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 60, `COLLECTED ${d}`, '#f4d67e');
      ctx.sfx('jackpot');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 28, y = p.y - 40 + Math.sin(time / 300) * 2;
      if (debt > 0) {
        const k = clamp((dueBy - time) / 5000, 0, 1);
        glow(g, x, y, 14, 0xc8c0d0, 0.06, 2);
        g.lineStyle(2, GILT, 0.9); g.beginPath(); g.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
      lotToken(g, x, y, 6.5, debt, true);
      if (time - paidAt < 400) { const k = (time - paidAt) / 400; g.lineStyle(2, GILT_LIT, 1 - k); g.strokeCircle(x, y, 8 + k * 20); }
    },
  };
};

// ── Banneret's Field Standard ────────────────────────────────────────
// Every 10s a banner plants itself at your feet. Within 120px of it your blows land 20% harder.
// The first time the foe steps inside its ring, a rider bursts from it at them: 14 damage.

const fieldStandard: ItemScriptFactory = (ctx) => {
  const R = 120, EVERY = 10000;
  let at: Pt | null = null;
  let plantAt = 0;
  let charged = false;
  let ride: { fx: number; fy: number; tx: number; ty: number; goAt: number; dealt: boolean } | null = null;
  let boostUntil = 0;
  return {
    update(time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (plantAt === 0) plantAt = time + 1500;
      if (time >= plantAt) {
        at = { x: p.x, y: p.y + 4 };
        plantAt = time + EVERY;
        charged = false;
        ctx.sfx('hammer-forge');
      }
      if (!at) return;
      if (dist(p.x, p.y, at.x, at.y) < R && time >= boostUntil) { ctx.boostDamage(1.2, 260); boostUntil = time + 250; }
      if (!charged && foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, at.x, at.y) < R) {
        charged = true;
        ride = { fx: at.x, fy: at.y, tx: ctx.npc.x, ty: ctx.npc.y, goAt: time + 500, dealt: false };
        ctx.sfx('train-horn');
      }
      if (ride && !ride.dealt && time >= ride.goAt + 300) {
        ride.dealt = true;
        if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, ride.tx, ride.ty) < 90) {
          ctx.hit(ctx.npc, 14, ctx.npc.x, ctx.npc.y);
          ctx.float(ctx.npc.x, ctx.npc.y - 54, 'RIDDEN DOWN', '#ff8a7a');
        }
      }
      if (ride && time > ride.goAt + 900) ride = null;
    },
    drawGround(g, time) {
      if (!at) return;
      const near = live(ctx) && dist(ctx.player.x, ctx.player.y, at.x, at.y) < R;
      g.fillStyle(BANNERET, near ? 0.1 : 0.05); g.fillCircle(at.x, at.y, R);
      g.lineStyle(1.5, GILT, near ? 0.7 : 0.35); g.strokeCircle(at.x, at.y, R);
      if (ride && time < ride.goAt) {
        const k = clamp(1 - (ride.goAt - time) / 500, 0, 1);
        g.lineStyle(20, RED, 0.12 + k * 0.2); g.lineBetween(ride.fx, ride.fy, ride.tx, ride.ty);
      }
    },
    drawAir(g, time) {
      if (!at) return;
      warBanner(g, at.x, at.y, 74, charged ? INK : BANNERET, 'lot', time / 220);
      if (ride && time >= ride.goAt && time < ride.goAt + 600) {
        const k = (time - ride.goAt) / 600;
        const x = ride.fx + (ride.tx - ride.fx) * k * 1.3, y = ride.fy + (ride.ty - ride.fy) * k * 1.3;
        horse(g, x, y + 16, 0.55, ride.tx >= ride.fx ? 1 : -1, time / 50, RED);
      }
    },
  };
};

export const WAR_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_STICKS, name: 'Drummer\'s Sticks', emoji: '🥁', kind: 'charm', price: 420, isle: ISLE,
    flavor: 'Rosewood sticks worn pale at the tips. Every drummer-boy on the hill learns the Draw cadence on a pair like these.',
    script: CHARM_STICKS,
    scriptText: [
      'A four-beat bar ticks at your shoulder, 0.6s a beat; the red dot is the downbeat.',
      'Cast on the downbeat: that ability is refunded 0.7s, and your next hit within 1.2s deals +7.',
    ],
  },
  {
    id: CHARM_PIKES, name: 'Pike Square', emoji: '🔱', kind: 'charm', price: 600, isle: ISLE,
    flavor: 'Three pike-heads on a brass ring, the kind the Muster hands out. Wear it and the drill does itself.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_PIKES,
    scriptText: [
      'Three pikes stand out round you in a slow-turning ring.',
      'When your foe comes within 85px, the nearest ready pike thrusts for 6 and shoves them back. Each recovers in 3s.',
    ],
  },
  {
    id: CHARM_FLAGS, name: 'Range Flags', emoji: '🚩', kind: 'charm', price: 780, isle: ISLE,
    flavor: 'A bundle of little red flags on wire stakes, from the Engineer\'s own satchel. He counts them every night.',
    script: CHARM_FLAGS,
    scriptText: [
      'Your hits plant a range flag at your foe\'s feet (at most every 0.8s).',
      'The third flag calls the battery: 0.9s later every flag is shelled — 9 to your foe for each flag within 70px of them.',
    ],
  },
  {
    id: CHARM_CHIP, name: 'Black Chip', emoji: '⚫', kind: 'charm', price: 1050, isle: ISLE,
    flavor: 'The chip they hang on a busted man\'s chain in place of his Lot. Old Hask says it remembers every debt.',
    effect: { maxHp: 5 },
    script: CHARM_CHIP,
    scriptText: [
      'A hit of 8 or more against you banks half of it on the chip, up to 30 (at most every 2.5s).',
      'Your next hit within 5s collects the whole debt as extra damage. Unpaid after 5s, the debt is lost.',
    ],
  },
  {
    id: ART_BANNERET, name: 'Banneret\'s Field Standard', emoji: '🚩', kind: 'artifact', isle: ISLE,
    flavor: 'The Prince\'s own swallowtail, Lot No. 1 stitched on the fly in gilt thread. It was made for a boy who was never called.',
    effect: { maxHp: 15 },
    script: ART_BANNERET,
    scriptText: [
      'Every 10s a banner plants itself at your feet. Within 120px of it you deal +20% damage.',
      'The first time your foe steps inside its ring, a rider charges from the banner at them for 14.',
    ],
  },
  {
    id: FISH_TENCH, name: 'Trench Tench', emoji: '🐟', kind: 'fish', sell: 30, isle: ISLE,
    flavor: 'A slow olive fish that lives in the flooded sap and eats what falls in. The sappers call it the Corporal.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_BARB, name: 'Standard Barb', emoji: '🐠', kind: 'fish', sell: 44, isle: ISLE,
    flavor: 'Striped red and black like a House banner, with a swallowtail fin. It darts in ranks of six.',
    effect: { speedMult: 1.04 },
  },
  {
    id: FISH_MUSKIE, name: 'Muster Muskie', emoji: '🐊', kind: 'fish', sell: 62, isle: ISLE,
    flavor: 'A long toothed brute that took a sergeant\'s whistle off his lanyard once. It still has it.',
    effect: { damageMult: 1.04 },
  },
];

export const WAR_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_STICKS]: sticks,
  [CHARM_PIKES]: pikeSquare,
  [CHARM_FLAGS]: rangeFlags,
  [CHARM_CHIP]: blackChip,
  [ART_BANNERET]: fieldStandard,
};

export const WAR_SHOPS: ShopDef[] = [
  { id: 'war-shop', name: 'Brass\'s Quartermaster Stores', stock: [CHARM_STICKS, CHARM_PIKES, CHARM_FLAGS, CHARM_CHIP], buys: true },
];

export const WAR_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Flooded Sap', kind: 'bog' }];

export const WAR_FISH: FishDef[] = [
  { id: FISH_TENCH, fisheries: [FISHERY], weight: 6, fight: 2, size: [18, 44] },
  { id: FISH_BARB, fisheries: [FISHERY], weight: 3, fight: 3, size: [12, 30] },
  { id: FISH_MUSKIE, fisheries: [FISHERY], weight: 1.5, fight: 4, size: [50, 120] },
];
