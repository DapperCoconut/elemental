import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import {
  CANVAS_DARK, SAND_DARK, SAND_DEEP, SAND_LIT, SAND_PALE, STONE, STONE_DARK, STONE_DEEP, STONE_LIT, STRIPE_RED,
  TIMBER, TIMBER_DARK, TIMBER_LIT,
} from '../palette';
import { alive, clamp, dist, wrapAngle } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Over the Pole — Hamid, Shaduf-Master of the Hamra pits: in the star's telling the overseer whose
 * shadufs swing the households' stone up out of the dig, and who, when a house digs short, lets
 * the counterweight drop with the stone still in the bucket — over the pole, onto the house.
 *
 * Three great shadufs stand in the yard: two mud-brick pillars, a crossbar, and a long sweep pole
 * with a leather bucket on its short end and a lump of stone on its long one. Each pole points one
 * way, and the sand where it would throw is chalked in a ring. Step into a shaduf's bucket and the
 * counterweight drops: you are flung over the pole in a high arc (out of reach while you fly) and
 * come down in its ring — and whoever is standing there is crushed and stunned. Hamid does the
 * same to you. Every few seconds he also loads a pole with a cut block and lets it go; the ring
 * flares first, and the block crushes anyone in it.
 *
 * Strike a shaduf's pillar to swing its pole a quarter-turn — put its ring on Hamid, then ride it
 * or wait for his own block. At half his poles start to follow you: before each block, the loaded
 * pole swings round to put its ring nearer you. The bot climbs into a bucket whose ring you stand
 * in, and steps out of a ring that is about to be hit.
 */

const ID = fallenId('dunesea', 'shaduf');
const L = 250;
const ARM = 70;
const BUCKET_R = 20;
const LAND_R = 62;
const FLY_MS = 760;
const READY_MS = 2800;
const BLOCK_WARN = 1150;

interface Shaduf { x: number; y: number; a: number; swingAt: number; dipAt: number; target: StrikeTarget | null }
interface Flight { f: Fighter | null; s: Shaduf; from: Pt; to: Pt; at: number; ms: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const shadufs: Shaduf[] = [
    { x: 240, y: top + 170, a: 0 }, { x: W - 240, y: top + 150, a: Math.PI / 2 }, { x: W / 2 - 10, y: H - 130, a: Math.PI },
  ].map((s) => ({ ...s, swingAt: -1e9, dipAt: -1e9, target: null }));
  const flights: Flight[] = [];
  const ready = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let blockEvery = 6200;
  let nextBlock = 0;
  let tracking = false;
  let started = false;

  const bucket = (s: Shaduf): Pt => ({ x: s.x - Math.cos(s.a) * ARM, y: s.y - Math.sin(s.a) * ARM });
  const ring = (s: Shaduf): Pt => ({ x: s.x + Math.cos(s.a) * L, y: s.y + Math.sin(s.a) * L });
  const fits = (s: Shaduf, a: number): boolean => {
    const r = { x: s.x + Math.cos(a) * L, y: s.y + Math.sin(a) * L }, b = { x: s.x - Math.cos(a) * ARM, y: s.y - Math.sin(a) * ARM };
    return r.x > 60 && r.x < W - 60 && r.y > top + 50 && r.y < H - 40 && b.x > 40 && b.x < W - 40 && b.y > top + 30 && b.y < H - 30;
  };
  const busy = (s: Shaduf) => flights.some((f) => f.s === s);

  /** A quarter-turn on, skipping any heading that would throw out of the yard. */
  function swing(s: Shaduf, time: number): void {
    for (let k = 1; k <= 4; k++) { const a = s.a + (Math.PI / 2) * k; if (fits(s, a)) { s.a = wrapAngle(a); break; } }
    s.swingAt = time;
    s.target?.moveTo(s.x, s.y);
  }

  shadufs.forEach((s) => {
    s.target = ctx.target({
      x: s.x, y: s.y, r: 22, passThrough: true,
      onStruck: (by) => {
        if (busy(s) || tk.now - s.swingAt < 700) return;
        swing(s, tk.now);
        ctx.sfx('gear-turn');
        ctx.float(s.x, s.y - 70, by === 'player' ? 'SWUNG' : 'HE SWINGS IT', '#f2d496');
      },
    });
  });

  function launch(s: Shaduf, f: Fighter | null, time: number, ms: number): void {
    const from = f ? { x: f.x, y: f.y } : bucket(s);
    flights.push({ f, s, from, to: ring(s), at: time, ms });
    s.dipAt = time;
    if (f) { ctx.airborne(f, ms); ctx.root(f, ms); ready.set(f, time + ms + READY_MS); ctx.sfx('whoosh'); }
    else ctx.sfx('mortar-launch');
  }

  function land(fl: Flight): void {
    ctx.sfx('gravity-slam');
    for (const f of [player, npc]) {
      if (f === fl.f || !alive(f) || dist(f.x, f.y, fl.to.x, fl.to.y) > LAND_R + 12) continue;
      if (f === player) tk.hitPlayer(fl.f ? 24 : 20, f.x, f.y);
      else { ctx.hit(npc, fl.f ? 36 : 30, f.x, f.y); ctx.float(f.x, f.y - 56, 'CRUSHED', '#f2d496'); }
      ctx.stun(f, 700);
    }
  }

  return {
    update(time) {
      if (!started) { started = true; nextBlock = time + 3600; }
      if (!tracking && npc.hp < npc.maxHp * 0.5) {
        tracking = true; blockEvery = 4800;
        ctx.banner('THE POLES FOLLOW YOU', '#f2d496'); ctx.sfx('gear-turn');
      }
      // Into a bucket: the counterweight drops and over you go.
      for (const f of [player, npc]) {
        if (!alive(f) || time < (ready.get(f) ?? 0) || flights.some((fl) => fl.f === f)) continue;
        const s = shadufs.find((q) => !busy(q) && dist(f.x, f.y, bucket(q).x, bucket(q).y) < BUCKET_R);
        if (s) launch(s, f, time, FLY_MS);
      }
      // Hamid loads a block and lets it go.
      if (time >= nextBlock && alive(npc)) {
        nextBlock = time + blockEvery;
        const free = shadufs.filter((s) => !busy(s));
        if (free.length) {
          let s = free[Math.floor(rng() * free.length)];
          if (tracking) {
            s = free.sort((p, q) => dist(ring(p).x, ring(p).y, player.x, player.y) - dist(ring(q).x, ring(q).y, player.x, player.y))[0];
            let best = s.a, bd = dist(ring(s).x, ring(s).y, player.x, player.y);
            for (let k = 1; k < 4; k++) {
              const a = s.a + (Math.PI / 2) * k;
              if (!fits(s, a)) continue;
              const d = dist(s.x + Math.cos(a) * L, s.y + Math.sin(a) * L, player.x, player.y);
              if (d < bd) { bd = d; best = a; }
            }
            if (best !== s.a) { s.a = wrapAngle(best); s.swingAt = time; }
          }
          launch(s, null, time, tk.warn(BLOCK_WARN));
        }
      }
      // Flights: carry the rider along the arc; land.
      for (let i = flights.length - 1; i >= 0; i--) {
        const fl = flights[i];
        const k = clamp((time - fl.at) / fl.ms, 0, 1);
        if (fl.f && alive(fl.f)) {
          const x = fl.from.x + (fl.to.x - fl.from.x) * k, y = fl.from.y + (fl.to.y - fl.from.y) * k;
          ctx.nudge(fl.f, x - fl.f.x, y - fl.f.y);
        }
        if (k >= 1) { flights.splice(i, 1); land(fl); }
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      // A ring about to be hit: out of it.
      for (const fl of flights) {
        if (fl.f === npc || dist(npc.x, npc.y, fl.to.x, fl.to.y) > LAND_R + 40) continue;
        const a = Math.atan2(npc.y - fl.to.y, npc.x - fl.to.x);
        return { x: tk.clampX(fl.to.x + Math.cos(a) * (LAND_R + 90)), y: tk.clampY(fl.to.y + Math.sin(a) * (LAND_R + 90)) };
      }
      // You stand in a ring: climb into that shaduf's bucket.
      if (tk.now >= (ready.get(npc) ?? 0)) {
        for (const s of shadufs) {
          const r = ring(s), b = bucket(s);
          if (busy(s) || dist(r.x, r.y, player.x, player.y) > LAND_R + 10 || dist(b.x, b.y, npc.x, npc.y) > 340) continue;
          return b;
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const s of shadufs) {
        const r = ring(s), b = bucket(s);
        const live = flights.find((f) => f.s === s);
        drawRing(g, r.x, r.y, live ? clamp((time - live.at) / live.ms, 0, 1) : -1, time);
        // The throw-line: little stakes from the pillars to the ring.
        for (let k = 0.3; k < 0.92; k += 0.12) { g.fillStyle(SAND_DEEP, 0.35); g.fillCircle(s.x + (r.x - s.x) * k, s.y + (r.y - s.y) * k, 2.2); }
        g.fillStyle(SAND_DARK, 0.6); g.fillEllipse(b.x, b.y + 4, 48, 24);
        g.lineStyle(1.5, SAND_DEEP, 0.6); g.strokeEllipse(b.x, b.y + 4, 48, 24);
        for (const fl of flights) if (fl.f) { const k = clamp((time - fl.at) / fl.ms, 0, 1); shadow(g, fl.from.x + (fl.to.x - fl.from.x) * k, fl.from.y + (fl.to.y - fl.from.y) * k + 18, 34, 10, 0.35); }
      }
    },

    drawAir(g, time) {
      for (const s of shadufs) {
        const fl = flights.find((f) => f.s === s);
        const dip = fl ? clamp((time - fl.at) / Math.min(fl.ms, 320), 0, 1) : clamp(1 - (time - s.dipAt - 300) / 500, 0, 1);
        drawShaduf(g, s, dip, !!fl && !fl.f && time - fl.at < 120, time - s.swingAt);
      }
      for (const fl of flights) {
        if (fl.f) continue;
        const k = clamp((time - fl.at) / fl.ms, 0, 1);
        const x = fl.from.x + (fl.to.x - fl.from.x) * k, y = fl.from.y + (fl.to.y - fl.from.y) * k - Math.sin(k * Math.PI) * 150;
        drawBlock(g, x, y, k * 7);
      }
    },

    drawHud(g, time) {
      const x0 = W / 2 - 58, y = top + 18;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 12, y - 14, 140, 28, 6);
      shadufs.forEach((s, i) => {
        const cx = x0 + i * 40 + 8;
        g.lineStyle(3, TIMBER_LIT, 1); g.lineBetween(cx - Math.cos(s.a) * 8, y - Math.sin(s.a) * 8, cx + Math.cos(s.a) * 12, y + Math.sin(s.a) * 12);
        g.fillStyle(STONE_DARK, 1); g.fillCircle(cx, y, 3);
        if (busy(s)) { g.lineStyle(2, STRIPE_RED, 1); g.strokeCircle(cx + Math.cos(s.a) * 12, y + Math.sin(s.a) * 12, 4); }
      });
      const k = clamp(1 - (nextBlock - time) / blockEvery, 0, 1);
      g.fillStyle(STONE_DEEP, 1); g.fillRect(x0 + 116, y - 8, 8, 16);
      g.fillStyle(tracking ? STRIPE_RED : STONE_LIT, 1); g.fillRect(x0 + 117, y + 7 - 14 * k, 6, 14 * k);
    },

    destroy() { for (const s of shadufs) { s.target?.remove(); s.target = null; } },
  };
}

/** The chalked landing ring; while something is in the air over it, it fills and pulses red. */
function drawRing(g: G, x: number, y: number, k: number, time: number): void {
  g.lineStyle(2, SAND_PALE, 0.55); g.strokeEllipse(x, y, LAND_R * 2, LAND_R * 1.6);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(SAND_PALE, 0.6); g.fillCircle(x + Math.cos(a) * LAND_R, y + Math.sin(a) * LAND_R * 0.8, 2); }
  if (k < 0) return;
  g.fillStyle(STRIPE_RED, 0.12 + k * 0.22); g.fillEllipse(x, y, LAND_R * 2 * k, LAND_R * 1.6 * k);
  g.lineStyle(3, STRIPE_RED, 0.5 + 0.4 * Math.sin(time / 50)); g.strokeEllipse(x, y, LAND_R * 2, LAND_R * 1.6);
}

/** A shaduf from above and a little to the south: pillars, crossbar, the sweep pole on its heading, weight and bucket. */
function drawShaduf(g: G, s: Shaduf, dip: number, jolt: boolean, sinceSwing: number): void {
  const ux = Math.cos(s.a), uy = Math.sin(s.a), nx = -uy, ny = ux;
  const swingWob = sinceSwing < 400 ? Math.sin(sinceSwing / 40) * (1 - sinceSwing / 400) * 4 : 0;
  shadow(g, s.x, s.y + 4, 70, 18, 0.3);
  for (const k of [-1, 1]) {
    const px = s.x + nx * 22 * k, py = s.y + ny * 22 * k * 0.6;
    g.fillStyle(STONE_DARK, 1); g.fillRect(px - 7, py - 44, 14, 46);
    g.fillStyle(STONE, 1); g.fillRect(px - 6, py - 44, 9, 44);
    for (let r = 0; r < 4; r++) { g.lineStyle(1, STONE_DEEP, 0.7); g.lineBetween(px - 6, py - 34 + r * 10, px + 6, py - 34 + r * 10); }
  }
  const pivot = { x: s.x, y: s.y - 46 };
  g.lineStyle(5, TIMBER_DARK, 1); g.lineBetween(s.x + nx * 26, pivot.y + ny * 15, s.x - nx * 26, pivot.y - ny * 15);
  // Pole: the long (weight) end rises as the bucket end drops, then flips when it throws.
  const lift = (jolt ? 1 : dip) * 34;
  const wx = pivot.x + ux * 120 + nx * swingWob, wy = pivot.y + uy * 120 * 0.8 - 10 + lift - 30 * (1 - dip);
  const bx = pivot.x - ux * ARM, by = pivot.y - uy * ARM * 0.8 + 20 - lift;
  g.lineStyle(6, TIMBER_DARK, 1); g.lineBetween(bx, by, wx, wy);
  g.lineStyle(2, TIMBER_LIT, 0.8); g.lineBetween(bx, by - 2, wx, wy - 2);
  g.fillStyle(STONE_DEEP, 1); g.fillCircle(wx, wy + 5, 13);
  g.fillStyle(STONE_DARK, 1); g.fillCircle(wx - 3, wy + 2, 10);
  g.lineStyle(1.5, CANVAS_DARK, 1); g.lineBetween(wx - 12, wy + 2, wx + 12, wy + 8); g.lineBetween(wx - 2, wy - 8, wx + 3, wy + 16);
  // Rope and leather bucket, hanging to the mark on the sand.
  const b = { x: s.x - ux * ARM, y: s.y - uy * ARM };
  g.lineStyle(1.5, CANVAS_DARK, 1); g.lineBetween(bx, by, b.x, b.y - 14);
  g.fillStyle(0x5a3418, 1); g.fillEllipse(b.x, b.y - 6, 26, 18);
  g.fillStyle(0x7a4a24, 1); g.fillEllipse(b.x, b.y - 10, 24, 9);
  g.lineStyle(1, 0x3a2010, 1); g.strokeEllipse(b.x, b.y - 10, 24, 9);
  g.fillStyle(0x2a1a0e, 0.8); g.fillEllipse(b.x, b.y - 10, 16, 5);
  g.fillStyle(SAND_LIT, 0.8); g.fillCircle(b.x + 4, b.y - 11, 1.6);
}

/** A cut block of the buried city's sandstone, tumbling through the air. */
function drawBlock(g: G, x: number, y: number, spin: number): void {
  const c = Math.cos(spin), s = Math.sin(spin);
  const P = (px: number, py: number) => ({ x: x + px * c - py * s, y: y + px * s + py * c });
  g.fillStyle(STONE_DEEP, 1); g.fillPoints([P(-15, -11), P(15, -11), P(15, 11), P(-15, 11)], true);
  g.fillStyle(STONE, 1); g.fillPoints([P(-13, -9), P(13, -9), P(13, 7), P(-13, 7)], true);
  g.fillStyle(STONE_LIT, 1); g.fillPoints([P(-13, -9), P(13, -9), P(11, -5), P(-11, -5)], true);
  g.lineStyle(1, STONE_DARK, 1); const a = P(-4, -9), b = P(-2, 7); g.lineBetween(a.x, a.y, b.x, b.y);
  glow(g, x, y, 22, SAND_PALE, 0.03, 2);
}

export const FALLEN_SHADUF: GimmickDef = {
  id: ID,
  rules: 'Step into a shaduf\'s bucket to be flung over its pole, crushing whoever stands where you land; he loads blocks too. Strike a pillar to swing it.',
  make,
};
