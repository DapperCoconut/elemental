import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import { WAX, WICK, dist, flame, smokeCurl, waxPuddle } from '../art';

/**
 * Effigies — Effigist Morrow's gallery.
 *
 * Wax effigies of Morrow stand about the room, each poured round a lock of his hair. Shoulder
 * into one and it topples: the wound lands on Morrow, wherever he is — and the effigy slumps
 * into a puddle of soft wax that drags at anyone in it. Morrow pours a fresh effigy every few
 * seconds (a column rising from the floor, plainly telegraphed).
 *
 * Two illusions keep it from being free damage. Some effigies are *hollow* — poured round
 * nothing — and burst in hot wax on whoever topples them; they weep wax tears and their wick is
 * cold, so they can be told apart if you look. And when you hit Morrow himself he sometimes
 * trades places with one of his statues, a puff of wax-smoke at both ends.
 */

/** Morrow's colours — the effigies are wax copies of him, and the encounter look shares these. */
export const MORROW_BODY = 0xdcd2ea;
export const MORROW_ACCENT = 0x4a2f68;

const START_EFFIGIES = 4;
const MAX_EFFIGIES = 5;
const POUR_EVERY_MS = 6000;
const POUR_EVERY_HARD_MS = 4600;
const RISE_MS = 1200;
const TOPPLE_R = 40;
const TOPPLE_DAMAGE = 15;
const HOLLOW_CHANCE = 0.34;
const HOLLOW_DAMAGE = 12;
const HOLLOW_R = 70;
const PUDDLE_R = 52;
const PUDDLE_MS = 7000;
const PUDDLE_SLOW = 0.55;
const SWAP_CHANCE = 0.4;
const SWAP_COOLDOWN_MS = 3500;

interface Effigy { x: number; y: number; bornAt: number; standsAt: number; hollow: boolean; seed: number }
interface Puddle { x: number; y: number; bornAt: number; dieAt: number; seed: number }
interface Poof { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const pourEvery = ctx.hard ? POUR_EVERY_HARD_MS : POUR_EVERY_MS;
  let effigies: Effigy[] = [];
  let puddles: Puddle[] = [];
  let poofs: Poof[] = [];
  let nextPourAt = 0;
  let lastSwapAt = -99999;
  let hideUntil = 0;
  let hideMode = false;
  let modeSwapAt = 4000;
  let started = false;

  /** A spot clear of both fighters and every other effigy. */
  const freeSpot = (): Pt => {
    let best: Pt = { x: W / 2, y: (top + H) / 2 };
    let bestScore = -Infinity;
    for (let i = 0; i < 14; i++) {
      const x = 80 + rng() * (W - 160);
      const y = top + 70 + rng() * (H - top - 130);
      let score = Math.min(dist(x, y, ctx.player.x, ctx.player.y), 260) + Math.min(dist(x, y, ctx.npc.x, ctx.npc.y), 200) * 0.5;
      for (const e of effigies) score = Math.min(score, dist(x, y, e.x, e.y) * 1.2);
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
    return best;
  };

  const pour = (time: number, instant: boolean): void => {
    if (effigies.length >= MAX_EFFIGIES) return;
    const p = freeSpot();
    effigies.push({
      x: p.x, y: p.y, bornAt: time, standsAt: instant ? time : time + RISE_MS,
      hollow: rng() < HOLLOW_CHANCE, seed: rng() * 10,
    });
    if (!instant) ctx.sfx('stone-rise');
  };

  const topple = (e: Effigy, time: number): void => {
    puddles.push({ x: e.x, y: e.y, bornAt: time, dieAt: time + PUDDLE_MS, seed: e.seed });
    ctx.sfx('crystal-shatter');
    if (e.hollow) {
      ctx.float(e.x, e.y - 64, 'HOLLOW!', '#ffb08a');
      ctx.flash(e.x, e.y - 20, 0xffd8a0);
      for (const f of [ctx.player, ctx.npc]) {
        if (f.active && dist(f.x, f.y, e.x, e.y) < HOLLOW_R) ctx.hit(f, HOLLOW_DAMAGE, e.x, e.y);
      }
    } else {
      const n = ctx.npc;
      ctx.hit(n, TOPPLE_DAMAGE, n.x, n.y);
      ctx.float(e.x, e.y - 64, 'THE EFFIGY BLEEDS', '#e6d4ff');
      ctx.flash(n.x, n.y, 0xe6d4ff);
    }
  };

  const inPuddle = (x: number, y: number, time: number): boolean =>
    puddles.some((p) => time < p.dieAt && dist(p.x, p.y, x, y) < PUDDLE_R * 0.9);

  return {
    update(time) {
      if (!started) {
        started = true;
        ctx.banner('WHICH ONE IS MORROW?', '#e6d4ff');
        for (let i = 0; i < START_EFFIGIES; i++) pour(time, true);
        nextPourAt = time + pourEvery;
      }
      if (time >= nextPourAt) { nextPourAt = time + pourEvery; pour(time, false); }

      const p = ctx.player;
      for (const e of effigies) {
        if (time < e.standsAt) continue;
        if (p.active && p.hp > 0 && dist(p.x, p.y, e.x, e.y) < TOPPLE_R) { topple(e, time); e.bornAt = -1; }
      }
      effigies = effigies.filter((e) => e.bornAt >= 0);
      puddles = puddles.filter((pd) => time < pd.dieAt);
      poofs = poofs.filter((pf) => time - pf.at < 900);

      // Morrow alternates between hiding in his gallery and coming for you.
      if (time >= modeSwapAt) {
        hideMode = !hideMode;
        modeSwapAt = time + (hideMode ? 4200 : 3800);
        hideUntil = hideMode ? modeSwapAt : 0;
      }
    },

    onNpcHurt() {
      const time = ctx.scene.time.now;
      if (time - lastSwapAt < SWAP_COOLDOWN_MS) return;
      const standing = effigies.filter((e) => time >= e.standsAt);
      if (!standing.length || rng() > SWAP_CHANCE) return;
      lastSwapAt = time;
      const e = standing[Math.floor(rng() * standing.length)];
      const n = ctx.npc;
      const ox = n.x, oy = n.y;
      ctx.nudge(n, e.x - n.x, e.y - n.y);
      e.x = ox; e.y = oy;
      poofs.push({ x: ox, y: oy, at: time }, { x: n.x, y: n.y, at: time });
      ctx.sfx('teleport');
      ctx.float(n.x, n.y - 58, 'SWAPPED', '#e6d4ff');
    },

    playerSpeedMult() { return inPuddle(ctx.player.x, ctx.player.y, ctx.scene.time.now) ? PUDDLE_SLOW : 1; },
    npcSpeedMult() { return inPuddle(ctx.npc.x, ctx.npc.y, ctx.scene.time.now) ? PUDDLE_SLOW : 1; },

    npcSeek(): Pt | null {
      const time = ctx.scene.time.now;
      if (time >= hideUntil) return null;
      const p = ctx.player;
      const standing = effigies.filter((e) => time >= e.standsAt);
      if (standing.length < 2) return null;
      // Stand at shoulder to the true effigy farthest from you, among his own likenesses.
      let best: Effigy | null = null; let bd = -1;
      for (const e of standing) {
        const d = dist(e.x, e.y, p.x, p.y);
        if (d > bd && !inPuddle(e.x, e.y, time)) { bd = d; best = e; }
      }
      return best ? { x: best.x + 46, y: best.y + 6 } : null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (const pd of puddles) {
        const k = (time - pd.bornAt) / (pd.dieAt - pd.bornAt);
        waxPuddle(g, pd.x, pd.y + 6, PUDDLE_R * (0.85 + Math.min(1, k * 4) * 0.15), t, Math.max(0, k - 0.6) * 1.5, MORROW_BODY, pd.seed);
        // A toppled hat floating in the soft wax.
        if (k < 0.75) {
          g.fillStyle(dim(MORROW_ACCENT, 0.2), 0.8); g.fillEllipse(pd.x + 10, pd.y + 2, 22, 7);
          g.fillRect(pd.x + 4, pd.y - 8, 12, 9);
        }
      }
      // Rising effigies: the column of wax climbing out of the floor.
      for (const e of effigies) {
        if (time >= e.standsAt) continue;
        const k = (time - e.bornAt) / (e.standsAt - e.bornAt);
        g.fillStyle(MORROW_BODY, 0.25); g.fillEllipse(e.x, e.y + 4, 64, 22);
        g.lineStyle(2, MORROW_ACCENT, 0.4 + k * 0.5); g.strokeEllipse(e.x, e.y + 4, 64 * (1.4 - k * 0.4), 22 * (1.4 - k * 0.4));
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const e of effigies) {
        const k = Math.min(1, (time - e.bornAt) / Math.max(1, e.standsAt - e.bornAt));
        if (time < e.standsAt) {
          // The pour: a column, then the shape firming out of it.
          const h = 70 * k;
          g.fillStyle(lit(MORROW_BODY, 0.1), 0.9); g.fillRoundedRect(e.x - 14, e.y - h, 28, h, 10);
          g.fillStyle(0xffffff, 0.4); g.fillRect(e.x - 8, e.y - h + 4, 3, h - 8);
          continue;
        }
        drawEffigy(g, e, t);
      }
      for (const pf of poofs) {
        const k = (time - pf.at) / 900;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + pf.x;
          g.fillStyle(0xe9e2f2, 0.5 * (1 - k));
          g.fillCircle(pf.x + Math.cos(a) * 30 * k, pf.y - 16 + Math.sin(a) * 18 * k - k * 20, 6 + k * 10);
        }
      }
    },
  };
}

/** A wax likeness of Morrow: his round body in pale wax, a top hat, a mask — and a wick. */
function drawEffigy(g: G, e: Effigy, t: number): void {
  const { x, y } = e;
  shadow(g, x, y + 4, 52, 14, 0.3);
  // Plinth of set wax.
  g.fillStyle(dim(WAX, 0.2), 1); g.fillEllipse(x, y + 2, 50, 16);
  g.fillStyle(WAX, 1); g.fillEllipse(x, y, 44, 12);
  // Body.
  const body = lit(MORROW_BODY, 0.05);
  g.fillStyle(dim(body, 0.35), 1); g.fillCircle(x, y - 24, 23);
  g.fillStyle(body, 1); g.fillCircle(x, y - 25, 21);
  g.fillStyle(lit(body, 0.3), 0.9); g.fillEllipse(x - 8, y - 33, 12, 8);
  // Runs of wax down the body.
  for (let i = 0; i < 3; i++) {
    const dx = x - 10 + i * 9;
    const len = 8 + ((i * 5 + Math.floor(e.seed)) % 7);
    g.fillStyle(lit(body, 0.2), 1); g.fillRoundedRect(dx - 2, y - 14, 4, len, 2);
    g.fillCircle(dx, y - 14 + len, 2.4);
  }
  // The mask — Morrow's own, white with violet eye-slits.
  g.fillStyle(0xf6f2fa, 1); g.fillEllipse(x + 2, y - 28, 26, 13);
  g.fillStyle(MORROW_ACCENT, 1);
  g.fillEllipse(x - 4, y - 29, 6, 3); g.fillEllipse(x + 8, y - 29, 6, 3);
  if (e.hollow) {
    // Wax tears — the tell.
    g.fillStyle(lit(MORROW_BODY, 0.2), 1);
    g.fillRoundedRect(x - 5.5, y - 28, 3, 10 + Math.sin(t * 2 + e.seed) * 2, 1.5);
    g.fillRoundedRect(x + 6.5, y - 28, 3, 8 + Math.cos(t * 2 + e.seed) * 2, 1.5);
  }
  // Top hat.
  g.fillStyle(dim(MORROW_ACCENT, 0.2), 1); g.fillEllipse(x, y - 44, 34, 8);
  g.fillStyle(MORROW_ACCENT, 1); g.fillRect(x - 10, y - 66, 20, 22);
  g.fillStyle(lit(MORROW_ACCENT, 0.25), 1); g.fillRect(x - 10, y - 50, 20, 4);
  // The wick through the crown of the hat — lit if there is a lock of him inside.
  g.lineStyle(1.5, WICK, 1); g.lineBetween(x, y - 66, x + 1, y - 72);
  if (e.hollow) smokeCurl(g, x + 1, y - 72, t + e.seed, 0.25, 26);
  else flame(g, x + 1, y - 72, 4, t, e.seed, 0.04);
}

export const EFFIGIES: GimmickDef = {
  id: 'candlewick-effigies',
  rules: 'Walk into Morrow\'s effigies to topple them and wound him. Weeping, unlit ones are hollow and burst.',
  make,
};
