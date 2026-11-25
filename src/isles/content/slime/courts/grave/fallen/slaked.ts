import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, mixC, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BONE, BONE_LIT, IRON, IRON_LIT, MIRE, MIRE_DEEP, MIRE_SHEEN, PEAT_DARK, SHROUD, SLAB, SLAB_DARK, SLAB_LIT,
  TIMBER, TIMBER_DARK, TIMBER_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Slaked — Ozias Calx, the Lime-Man.
 *
 * The Grave Court burns its own quicklime in a clamp behind the stone-yard, and Ozias carts it:
 * lime for the chapel whitewash, lime for the mortar, and — in the King's telling — lime for the
 * greyed, shovelled into the pits so that nobody could ever come and claim a face. Quicklime is
 * harmless dry. Wet it and it boils.
 *
 * Two things are on the floor. Ozias lobs sacks of lime at you (a white ring, then a thump): the
 * burst coats whoever it lands on, white to the knees, and so do the lime casks at the yard's ends
 * when struck. And the mire comes up through the peat at four seeps, black water spreading out in a
 * pool and drawing back again. Limed and dry you are fine. Limed and standing in a pool, the lime
 * slakes: it boils on you, steaming, for two seconds, and you cannot wash it off. A dash shakes the
 * coat away. Strike a seep's wooden bung and it gushes, flooding wide at once — so lime him, then
 * drown the ground under him. Halfway the mire stops drawing back and the pools spread wider.
 */

const ID = fallenId('grave', 'slaked');
const SACK_R = 70;
const SACK_WARN = 1050;
const SACK_DMG = 8;
const CASK_R = 112;
const COAT_MS = 9000;
const SLAKE_MS = 2000;
const BURN = 6;
const BURN_EVERY = 500;
const POOL_MAX = 92;
const GUSH_R = 132;
const GUSH_MS = 3200;

interface Coat { f: Fighter; until: number; slakeUntil: number; nextBurn: number; side: 'player' | 'npc' }
interface Seep { x: number; y: number; phase: number; r: number; gushUntil: number; bungBackAt: number; handle: StrikeTarget }
interface Cask { x: number; y: number; readyAt: number; burstAt: number; handle: StrikeTarget }
interface Sack { from: Pt; x: number; y: number; at: number; land: number }
interface Puff { x: number; y: number; r: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const coats: Coat[] = [
    { f: player, until: 0, slakeUntil: 0, nextBurn: 0, side: 'player' },
    { f: npc, until: 0, slakeUntil: 0, nextBurn: 0, side: 'npc' },
  ];
  const [pc, nc] = coats;
  let risen = false;
  let started = false;
  let nextSack = 0;
  const sacks: Sack[] = [];
  const puffs: Puff[] = [];

  const seepSpots: Pt[] = [{ x: 230, y: top + 150 }, { x: W - 230, y: top + 150 }, { x: 300, y: H - 120 }, { x: W - 300, y: H - 120 }];
  const seeps: Seep[] = seepSpots.map((p, i) => {
    const s: Seep = {
      x: p.x, y: p.y, phase: i * 3.1, r: 0, gushUntil: 0, bungBackAt: 0,
      handle: ctx.target({
        x: p.x, y: p.y, r: 18, passThrough: true,
        onStruck: () => {
          const now = ctx.scene.time.now;
          if (now < s.bungBackAt) return;
          s.gushUntil = now + GUSH_MS; s.bungBackAt = now + 6500;
          ctx.sfx('geyser'); ctx.flash(s.x, s.y, MIRE_SHEEN);
        },
      }),
    };
    return s;
  });
  const casks: Cask[] = [{ x: W / 2, y: top + 46 }, { x: W / 2, y: H - 44 }].map((p) => {
    const c: Cask = {
      x: p.x, y: p.y, readyAt: 0, burstAt: -9999,
      handle: ctx.target({
        x: p.x, y: p.y - 18, r: 22,
        onStruck: () => {
          const now = ctx.scene.time.now;
          if (now < c.readyAt) return;
          c.readyAt = now + 8000; c.burstAt = now;
          puff(c.x, c.y - 10, CASK_R);
          ctx.sfx('smoke');
        },
      }),
    };
    return c;
  });

  /** A cloud of lime: whoever is inside is coated white. */
  function puff(x: number, y: number, r: number): void {
    const now = ctx.scene.time.now;
    puffs.push({ x, y, r, at: now });
    for (const c of coats) {
      if (!alive(c.f) || ctx.isAirborne(c.f) || dist(x, y, c.f.x, c.f.y) > r) continue;
      if (now >= c.slakeUntil) c.until = now + COAT_MS;
      ctx.flash(c.f.x, c.f.y, BONE_LIT);
    }
  }

  /** Pool radius of a seep at this moment: it breathes out, holds, and draws back. */
  function poolR(s: Seep, time: number): number {
    if (time < s.gushUntil) return GUSH_R;
    const cyc = 13;
    const t = ((time / 1000 + s.phase) % cyc + cyc) % cyc;
    const max = risen ? POOL_MAX + 26 : POOL_MAX;
    if (risen) return max * (0.72 + 0.28 * Math.sin((t / cyc) * Math.PI * 2));
    if (t < 6) return max * (t / 6);
    if (t < 8) return max;
    if (t < 11) return max * (1 - (t - 8) / 3);
    return 0;
  }
  const inWater = (x: number, y: number, pad = 0) => seeps.some((s) => s.r > 4 && dist(x, y, s.x, s.y) < s.r + pad);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSack = time + 2200; ctx.banner('LIME IS HARMLESS DRY', '#f4f2ea'); }
      if (!risen && npc.hp < npc.maxHp * 0.5) { risen = true; ctx.banner('THE MIRE COMES UP THROUGH THE PEAT', '#9ad070'); ctx.sfx('splash'); }
      for (const s of seeps) {
        const want = poolR(s, time);
        s.r += clamp(want - s.r, -60 * dt, (time < s.gushUntil ? 400 : 40) * dt);
      }
      // Ozias lobs a sack where you stand.
      if (time >= nextSack && alive(npc) && alive(player)) {
        nextSack = time + (risen ? 3600 : 4400);
        sacks.push({ from: { x: npc.x, y: npc.y - 30 }, x: player.x, y: player.y, at: time, land: time + SACK_WARN });
        ctx.sfx('grenade-throw');
      }
      for (let i = sacks.length - 1; i >= 0; i--) {
        const s = sacks[i];
        if (time < s.land) continue;
        sacks.splice(i, 1);
        if (alive(player) && !ctx.isAirborne(player) && dist(s.x, s.y, player.x, player.y) < SACK_R) ctx.hit(player, SACK_DMG, player.x, player.y);
        puff(s.x, s.y, SACK_R);
        ctx.sfx('land');
      }
      for (const c of coats) {
        if (!alive(c.f)) continue;
        const coated = time < c.until;
        if (coated && ctx.dashing(c.f) && time >= c.slakeUntil) { c.until = 0; ctx.flash(c.f.x, c.f.y, BONE_LIT); }
        if (coated && time >= c.slakeUntil && inWater(c.f.x, c.f.y)) {
          c.slakeUntil = time + SLAKE_MS; c.until = time + SLAKE_MS; c.nextBurn = time;
          ctx.sfx('sizzle');
        }
        if (time < c.slakeUntil && time >= c.nextBurn) {
          c.nextBurn = time + BURN_EVERY;
          ctx.hit(c.f, BURN, c.f.x, c.f.y - 10);
        }
      }
      for (let i = puffs.length - 1; i >= 0; i--) if (time - puffs[i].at > 1400) puffs.splice(i, 1);
    },

    playerSpeedMult() { return ctx.scene.time.now < pc.slakeUntil ? 0.72 : 1; },
    npcSpeedMult() { return ctx.scene.time.now < nc.slakeUntil ? 0.72 : 1; },

    npcSeek(): Pt | null {
      const now = ctx.scene.time.now;
      const meLimed = now < nc.until;
      const away = (x: number, y: number): Pt => {
        for (const d of [0, 60, 120, 180]) for (const a of [0, 1.2, -1.2, 2.4, -2.4, Math.PI]) {
          const px = clamp(x + Math.cos(a) * d, 50, W - 50), py = clamp(y + Math.sin(a) * d, top + 40, H - 40);
          if (!inWater(px, py, 40)) return { x: px, y: py };
        }
        return { x: W / 2, y: (top + H) / 2 };
      };
      if (meLimed) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return away(player.x + Math.cos(a) * 180, player.y + Math.sin(a) * 180);
      }
      if (now < pc.until && now >= pc.slakeUntil) {
        // Limed foe: go to the bung of the seep nearest them and gush it.
        let best: Seep | null = null, bd = 190;
        for (const s of seeps) { const d = dist(s.x, s.y, player.x, player.y); if (now >= s.bungBackAt && d < bd) { bd = d; best = s; } }
        if (best) return { x: best.x, y: best.y + 8 };
      } else {
        for (const c of casks) {
          if (now >= c.readyAt && dist(c.x, c.y, player.x, player.y) < CASK_R - 20 && dist(c.x, c.y, npc.x, npc.y) < 260) {
            return { x: c.x + (npc.x < c.x ? -40 : 40), y: c.y };
          }
        }
      }
      return inWater(npc.x, npc.y, 30) ? away(npc.x, npc.y) : null;
    },

    drawGround(g, time) {
      for (const s of seeps) drawPool(g, s, time);
      for (const s of sacks) {
        const k = clamp((time - s.at) / SACK_WARN, 0, 1);
        g.fillStyle(SHROUD, 0.08 + k * 0.14); g.fillCircle(s.x, s.y, SACK_R);
        g.lineStyle(2, BONE_LIT, 0.4 + k * 0.5); g.strokeCircle(s.x, s.y, SACK_R);
        g.lineStyle(3, BONE_LIT, 0.8); g.beginPath(); g.arc(s.x, s.y, SACK_R - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
      }
      for (const p of puffs) {
        const k = (time - p.at) / 1400;
        g.fillStyle(0xf4f2ea, 0.35 * (1 - k)); g.fillCircle(p.x, p.y, p.r * (0.8 + k * 0.3));
      }
    },

    drawAir(g, time) {
      for (const c of casks) drawCask(g, c, time);
      for (const s of sacks) {
        const k = clamp((time - s.at) / SACK_WARN, 0, 1);
        const x = s.from.x + (s.x - s.from.x) * k, y = s.from.y + (s.y - s.from.y) * k - Math.sin(k * Math.PI) * 120;
        drawSack(g, x, y, k * 6);
      }
      for (const p of puffs) {
        const k = (time - p.at) / 1400;
        for (let i = 0; i < 12; i++) {
          const a = i * 0.52 + p.x * 0.01;
          const rr = p.r * (0.3 + k * 0.8) * (0.6 + (i % 3) * 0.2);
          g.fillStyle(i % 2 ? 0xffffff : SHROUD, 0.45 * (1 - k));
          g.fillCircle(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.7 - k * 26, 10 + (i % 4) * 4);
        }
      }
      for (const c of coats) if (alive(c.f)) drawCoat(g, c, time);
    },

    drawHud(g, time) {
      const y = top + 16;
      const plate = (x: number, c: Coat) => {
        const now = ctx.scene.time.now;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 10, y - 12, 96, 24, 7);
        g.fillStyle(c.side === 'player' ? SLAB_LIT : 0xe2b462, 1); g.fillCircle(x, y, 5);
        const coated = now < c.until, slaking = now < c.slakeUntil;
        const frac = slaking ? (c.slakeUntil - now) / SLAKE_MS : coated ? (c.until - now) / COAT_MS : 0;
        g.fillStyle(0x2a2826, 1); g.fillRect(x + 12, y - 4, 64, 8);
        g.fillStyle(slaking ? (Math.floor(time / 120) % 2 ? 0xff9a5a : 0xffe0b0) : BONE_LIT, 1); g.fillRect(x + 12, y - 4, 64 * frac, 8);
      };
      plate(W / 2 - 112, pc);
      plate(W / 2 + 26, nc);
    },

    destroy() { for (const s of seeps) s.handle.remove(); for (const c of casks) c.handle.remove(); },
  };
}

/** A seep: a ring of peat-cut stones round a wooden bung, and the black pool breathing out of it. */
function drawPool(g: G, s: Seep, time: number): void {
  const r = s.r;
  if (r > 3) {
    const pts: Pt[] = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const w = 1 + Math.sin(a * 3 + s.phase) * 0.08 + Math.sin(a * 5 + time / 900) * 0.04;
      pts.push({ x: s.x + Math.cos(a) * r * w, y: s.y + Math.sin(a) * r * w * 0.78 });
    }
    g.fillStyle(PEAT_DARK, 0.9); g.fillPoints(pts.map((p) => ({ x: s.x + (p.x - s.x) * 1.06, y: s.y + (p.y - s.y) * 1.06 + 2 })), true);
    g.fillStyle(MIRE, 0.95); g.fillPoints(pts, true);
    g.fillStyle(MIRE_DEEP, 0.9); g.fillEllipse(s.x, s.y, r * 1.1, r * 0.8);
    // Ripples and the sky's sheen.
    for (let i = 0; i < 3; i++) {
      const k = ((time / 1600) + i / 3) % 1;
      g.lineStyle(1.2, MIRE_SHEEN, 0.5 * (1 - k)); g.strokeEllipse(s.x, s.y, r * 1.8 * k, r * 1.4 * k);
    }
    g.fillStyle(lit(MIRE_SHEEN, 0.2), 0.25); g.fillEllipse(s.x - r * 0.3, s.y - r * 0.25, r * 0.6, r * 0.12);
  }
  // The stone ring and its bung.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = s.x + Math.cos(a) * 20, y = s.y + Math.sin(a) * 14;
    g.fillStyle(SLAB_DARK, 1); g.fillEllipse(x, y + 1, 12, 8);
    g.fillStyle(SLAB, 1); g.fillEllipse(x, y, 11, 6);
  }
  const out = time < s.gushUntil;
  if (out) {
    g.fillStyle(TIMBER, 1); g.fillEllipse(s.x + 26, s.y - 10, 14, 8);
    for (let i = 0; i < 6; i++) {
      const k = ((time / 300) + i / 6) % 1;
      g.fillStyle(MIRE_SHEEN, 1 - k); g.fillCircle(s.x + Math.cos(i) * 8, s.y - k * 30, 4 * (1 - k) + 2);
    }
  } else {
    g.fillStyle(TIMBER_DARK, 1); g.fillCircle(s.x, s.y + 1, 9);
    g.fillStyle(TIMBER, 1); g.fillCircle(s.x, s.y, 8);
    g.lineStyle(1, TIMBER_LIT, 0.8); g.strokeCircle(s.x, s.y, 5);
    g.fillStyle(IRON, 1); g.fillRect(s.x - 1.5, s.y - 8, 3, 16);
    const b = ((time / 700) + s.phase) % 1;
    g.fillStyle(MIRE_SHEEN, 0.6 * (1 - b)); g.fillCircle(s.x + 11, s.y - 4 - b * 8, 2.5);
  }
}

/** A lime cask: staves bound in iron hoops, the head stove in and white powder heaped over the rim. */
function drawCask(g: G, c: Cask, time: number): void {
  const x = c.x, y = c.y;
  const empty = time < c.readyAt;
  shadow(g, x + 4, y + 2, 46, 12, 0.3);
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - 18, y - 40, 36, 42, 8);
  for (let i = 0; i < 5; i++) { g.fillStyle(i % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(x - 15 + i * 6, y - 38, 5, 38); }
  for (const hy of [y - 33, y - 6]) { g.fillStyle(IRON, 1); g.fillRect(x - 18, hy, 36, 4); g.fillStyle(IRON_LIT, 1); g.fillRect(x - 18, hy, 36, 1); }
  // The lime-burner's brand on the staves: a circle quartered.
  g.lineStyle(1.4, dim(TIMBER_DARK, 0.4), 1); g.strokeCircle(x, y - 19, 6); g.lineBetween(x - 6, y - 19, x + 6, y - 19); g.lineBetween(x, y - 25, x, y - 13);
  if (!empty) {
    g.fillStyle(BONE, 1); g.fillEllipse(x, y - 40, 36, 12);
    g.fillStyle(0xffffff, 1); g.fillEllipse(x - 3, y - 43, 24, 8);
    for (let i = 0; i < 4; i++) { g.fillStyle(SHROUD, 0.9); g.fillTriangle(x - 16 + i * 10, y - 38, x - 12 + i * 10, y - 26 + (i % 2) * 6, x - 8 + i * 10, y - 38); }
    const k = (time / 1300) % 1;
    g.fillStyle(0xffffff, 0.25 * (1 - k)); g.fillCircle(x + 4, y - 48 - k * 18, 5 + k * 6);
  } else {
    g.fillStyle(dim(TIMBER_DARK, 0.4), 1); g.fillEllipse(x, y - 40, 34, 10);
    g.fillStyle(BONE, 0.4); g.fillEllipse(x, y - 40, 20, 5);
  }
  const since = time - c.burstAt;
  if (since >= 0 && since < 500) { g.lineStyle(4, 0xffffff, 1 - since / 500); g.strokeCircle(x, y - 20, 20 + since / 5); }
}

/** A sack of quicklime in flight: tied neck, a seam, powder trailing. */
function drawSack(g: G, x: number, y: number, spin: number): void {
  g.fillStyle(mixC(0xc8b48a, BONE, 0.3), 1); g.fillEllipse(x, y, 20, 24);
  g.fillStyle(lit(0xc8b48a, 0.3), 1); g.fillEllipse(x - 4, y - 3, 8, 12);
  g.lineStyle(1, dim(0xc8b48a, 0.4), 1); g.lineBetween(x + 4, y - 10, x + 5, y + 10);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 4 + Math.sin(spin) * 2, y - 16, 8, 4);
  for (let i = 0; i < 4; i++) { g.fillStyle(0xffffff, 0.5 - i * 0.1); g.fillCircle(x - 6 - i * 6, y + 6 + i * 4, 3 - i * 0.5); }
}

/**
 * Lime on a fighter: white powder caked up the legs and spattered on the body; slaking, it boils —
 * steam curling off, a white-hot hiss at the feet and bubbles where the water touches.
 */
function drawCoat(g: G, c: Coat, time: number): void {
  const now = time;
  const coated = now < c.until;
  if (!coated) return;
  const { x, y } = c.f;
  const slaking = now < c.slakeUntil;
  g.fillStyle(0xffffff, 0.75); g.fillEllipse(x, y + 14, 34, 12);
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7;
    g.fillStyle(i % 2 ? BONE_LIT : 0xffffff, 0.8);
    g.fillCircle(x + Math.cos(a) * 12, y + 4 + Math.sin(a) * 8, 2 + (i % 3));
  }
  if (slaking) {
    glow(g, x, y + 8, 34, 0xffd8a0, 0.08, 3);
    for (let i = 0; i < 7; i++) {
      const k = ((now / 650) + i / 7) % 1;
      const sx = x + Math.sin(i * 2.1 + k * 4) * (8 + k * 10);
      g.fillStyle(0xffffff, 0.5 * (1 - k)); g.fillCircle(sx, y + 6 - k * 60, 5 + k * 9);
    }
    for (let i = 0; i < 5; i++) {
      const k = ((now / 240) + i / 5) % 1;
      g.lineStyle(1.2, 0xfff0d0, 1 - k); g.strokeCircle(x + Math.cos(i * 1.3) * 14, y + 16, 2 + k * 3);
    }
  }
}

export const FALLEN_SLAKED: GimmickDef = {
  id: ID,
  rules: 'Lime sacks and struck casks coat you white. Limed in a seep\'s black pool, it boils on you; a dash shakes it off. Strike a bung to gush its pool wide.',
  make,
};
