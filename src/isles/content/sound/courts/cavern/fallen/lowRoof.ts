import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { FLOW, FLOW_LIT, GLOW, LAMP, PLANK, PLANK_DARK, PLANK_LIT, ROCK, ROCK_DARK, ROCK_DEEP, ROCK_LIT, ROCK_PALE } from '../palette';
import { alive, clamp, dist, stepDt } from '../../../../life/courts/bloom/util';

/**
 * Mind Your Head — Ferdy Crump, Shoring-Man, who in the King's telling decided which grottos were
 * "unsafe" and propped their roofs down to a crawl, so the households in them had to come out on
 * their knees past the Tuners' post.
 *
 * Slabs of low roof hang over parts of the floor, their shadows dark on the stone, and creep about
 * as the cave settles on Crump's props. Under a slab there is no headroom: any shot that flies in
 * or is loosed there smacks into the rock and dies (both ways), and a fighter who dashes, blinks
 * or leaps under it cracks their head on the roof — stunned and hurt.
 *
 * So a slab is shelter from his shots and a trap for anyone who moves fast. Duck under to make
 * him come in after you; he likes to close at a dash. At half health Crump knocks the props out:
 * the slabs slide toward whoever dashed last, wherever on the floor they did it.
 */

const ID = fallenId('cavern', 'low-roof');
const RX = 104;
const RY = 66;
const BONK_MS = 850;
const BONK_DMG = 9;
const BONK_CD = 1500;
const LIFT = 40;

/** A slab of low roof; its shadow is the ellipse at (x, y). */
interface Slab { x: number; y: number; vx: number; vy: number; seed: number; lumps: number[] }
/** A shot that hit rock: a puff of grit. */
interface Puff { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const slabs: Slab[] = [
    { x: W * 0.24, y: top + 140, vx: 22, vy: 12 },
    { x: W * 0.72, y: top + 190, vx: -18, vy: 16 },
    { x: W * 0.48, y: H - 120, vx: 20, vy: -14 },
  ].map((s) => ({ ...s, seed: rng() * 10, lumps: Array.from({ length: 14 }, () => 0.86 + rng() * 0.24) }));
  const puffs: Puff[] = [];
  const bonkAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const wasDashing = new Map<Fighter, boolean>([[player, false], [npc, false]]);
  let lastDash: Pt | null = null;
  let started = false;
  let sagging = false;

  const inside = (s: Slab, x: number, y: number) => ((x - s.x) / RX) ** 2 + ((y - s.y) / RY) ** 2 < 1;
  const under = (f: Fighter): Slab | null => slabs.find((s) => inside(s, f.x, f.y)) ?? null;

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; ctx.banner('UNDER THE LOW ROOF SHOTS HIT ROCK — AND A DASH CRACKS YOUR HEAD', '#e8dcc0'); }
      if (!sagging && npc.hp < npc.maxHp * 0.5) {
        sagging = true;
        ctx.banner('HE KNOCKS OUT THE PROPS: THE ROOF SLIDES TO WHOEVER DASHED LAST', '#e8dcc0');
        ctx.sfx('quake');
      }
      for (const s of slabs) {
        if (sagging && lastDash) {
          const a = Math.atan2(lastDash.y - s.y, lastDash.x - s.x), d = dist(s.x, s.y, lastDash.x, lastDash.y);
          const sp = d > 20 ? 40 : 0;
          s.vx += (Math.cos(a) * sp - s.vx) * Math.min(1, dt * 1.5);
          s.vy += (Math.sin(a) * sp - s.vy) * Math.min(1, dt * 1.5);
        }
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < RX + 10 || s.x > W - RX - 10) { s.vx = -s.vx; s.x = clamp(s.x, RX + 10, W - RX - 10); }
        if (s.y < top + RY + 10 || s.y > H - RY - 10) { s.vy = -s.vy; s.y = clamp(s.y, top + RY + 10, H - RY - 10); }
        // Every shot under the slab meets the rock.
        for (const h of ctx.shotsNear(s.x, s.y, RX)) {
          if (!inside(s, h.x, h.y)) continue;
          h.block();
          puffs.push({ x: h.x, y: h.y, at: time });
          if (puffs.length > 24) puffs.shift();
        }
      }
      // Slabs do not stack: shoulder each other apart.
      for (let i = 0; i < slabs.length; i++) for (let j = i + 1; j < slabs.length; j++) {
        const a = slabs[i], b = slabs[j], d = dist(a.x, a.y, b.x, b.y);
        if (d < RX * 1.6 && d > 0) { const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d, p = (RX * 1.6 - d) * 0.5; a.x -= ux * p; a.y -= uy * p; b.x += ux * p; b.y += uy * p; }
      }
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const dashing = ctx.dashing(f);
        if (dashing && !wasDashing.get(f)) lastDash = { x: f.x, y: f.y };
        wasDashing.set(f, dashing);
        if (!dashing || ctx.isAirborne(f) || time - bonkAt.get(f)! < BONK_CD || !under(f)) continue;
        bonkAt.set(f, time);
        ctx.stun(f, BONK_MS);
        ctx.hit(f, BONK_DMG, f.x, f.y);
        ctx.sfx('stone-slam');
        ctx.flash(f.x, f.y - 30, ROCK_PALE);
        puffs.push({ x: f.x, y: f.y - LIFT, at: time });
      }
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      const mine = under(npc);
      // Just cracked its head: get out from under.
      if (mine && now - bonkAt.get(npc)! < 2500) {
        const a = Math.atan2(npc.y - mine.y, npc.x - mine.x);
        return { x: clamp(mine.x + Math.cos(a) * (RX + 60), 50, W - 50), y: clamp(mine.y + Math.sin(a) * (RY + 60), top + 40, H - 40) };
      }
      // The player is sheltering: go in after them.
      const theirs = under(player);
      if (theirs) return { x: player.x, y: player.y };
      // Losing the trade: shelter under the slab nearest, at the edge facing the player.
      if (npc.hp / npc.maxHp < player.hp / player.maxHp) {
        const s = slabs.reduce((a, b) => (dist(a.x, a.y, npc.x, npc.y) < dist(b.x, b.y, npc.x, npc.y) ? a : b));
        const a = Math.atan2(player.y - s.y, player.x - s.x);
        return { x: s.x + Math.cos(a) * RX * 0.55, y: s.y + Math.sin(a) * RY * 0.55 };
      }
      return null;
    },

    drawGround(g, time) {
      for (const s of slabs) {
        // The shadow of no headroom, with knee-scuffs and grit from people crawling under.
        g.fillStyle(ROCK_DEEP, 0.42); g.fillEllipse(s.x, s.y, RX * 2, RY * 2);
        g.fillStyle(ROCK_DEEP, 0.25); g.fillEllipse(s.x, s.y, RX * 1.5, RY * 1.4);
        g.lineStyle(2, ROCK_LIT, 0.35); g.strokeEllipse(s.x, s.y, RX * 2, RY * 2);
        for (let i = 0; i < 7; i++) {
          const a = s.seed + i * 0.9, r = 0.3 + ((i * 37) % 10) / 16;
          const x = s.x + Math.cos(a) * RX * r, y = s.y + Math.sin(a) * RY * r;
          g.lineStyle(1, ROCK_PALE, 0.25); g.lineBetween(x - 8, y, x + 8, y + 1); g.lineBetween(x - 6, y + 3, x + 7, y + 4);
        }
      }
      for (const p of puffs) {
        const k = (time - p.at) / 500;
        if (k < 0 || k > 1) continue;
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05;
          g.fillStyle(i % 2 ? ROCK_PALE : FLOW, 0.6 * (1 - k)); g.fillCircle(p.x + Math.cos(a) * (4 + k * 18), p.y + Math.sin(a) * (3 + k * 12), 2.5 + k * 3);
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const s of slabs) drawSlab(g, s, t);
      // A cracked head: stars and grit circling.
      for (const f of [player, npc]) {
        const k = (time - bonkAt.get(f)!) / BONK_MS;
        if (k < 0 || k > 1 || !alive(f)) continue;
        for (let i = 0; i < 4; i++) {
          const a = t * 7 + i * (Math.PI / 2);
          star(g, f.x + Math.cos(a) * 18, f.y - 36 + Math.sin(a) * 6, 5, i % 2 ? LAMP : FLOW_LIT, 1 - k * 0.6);
        }
        g.lineStyle(2, ROCK_PALE, 1 - k); g.lineBetween(f.x - 10, f.y - LIFT - 6, f.x + 10, f.y - LIFT - 4);
      }
    },

    drawHud(g) {
      // A little crawler under a slab — lit when you are under the low roof.
      const x = ctx.W / 2, y = ctx.top + 22, on = !!under(player);
      g.fillStyle(ROCK_DEEP, 0.7); g.fillRoundedRect(x - 40, y - 16, 80, 32, 7);
      g.fillStyle(on ? ROCK_LIT : ROCK_DARK, 1); g.fillRect(x - 30, y - 10, 60, 7);
      for (let i = -24; i <= 24; i += 12) { g.fillStyle(on ? FLOW : ROCK, 1); g.fillTriangle(x + i - 3, y - 3, x + i + 3, y - 3, x + i, y + 2); }
      g.fillStyle(on ? LAMP : ROCK, 1); g.fillCircle(x - 6, y + 6, 4); g.fillRect(x - 2, y + 4, 16, 5);
      if (on) { g.lineStyle(2, 0xff9a60, 1); g.lineBetween(x + 22, y + 2, x + 30, y + 10); g.lineBetween(x + 30, y + 2, x + 22, y + 10); }
    },
  };
}

/** A slab of low roof: a lumpy lip of rock, propped on timbers, pendants and glowworms beneath. */
function drawSlab(g: G, s: Slab, t: number): void {
  const pts: Pt[] = s.lumps.map((k, i) => {
    const a = (i / s.lumps.length) * Math.PI * 2;
    return { x: s.x + Math.cos(a) * RX * k, y: s.y - LIFT + Math.sin(a) * RY * k };
  });
  // The underside: see-through enough that whoever is under it still shows.
  g.fillStyle(ROCK_DARK, 0.3); g.fillPoints(pts, true);
  // The thick front lip.
  g.lineStyle(14, ROCK, 0.85); g.strokePoints(pts, true);
  g.lineStyle(4, ROCK_LIT, 0.6); g.strokePoints(pts.map((p) => ({ x: p.x, y: p.y - 5 })), true);
  g.lineStyle(2, dim(ROCK, 0.5), 0.9); g.strokePoints(pts.map((p) => ({ x: p.x, y: p.y + 6 })), true);
  // Pendants hanging from the lip.
  for (let i = 0; i < pts.length; i += 2) {
    const p = pts[i], len = 7 + ((i * 5) % 7);
    g.fillStyle(FLOW, 0.85); g.fillTriangle(p.x - 4, p.y + 5, p.x + 4, p.y + 5, p.x, p.y + 5 + len);
  }
  // Glowworm specks on the underside.
  for (let i = 0; i < 9; i++) {
    const a = s.seed * 3 + i * 0.7, r = 0.2 + (i % 4) * 0.17;
    g.fillStyle(GLOW, 0.5 + 0.4 * Math.sin(t * 1.5 + i)); g.fillCircle(s.x + Math.cos(a) * RX * r, s.y - LIFT + Math.sin(a) * RY * r, 1.3);
  }
  // Crump's props: two timbers wedged under the lip.
  for (const side of [-1, 1]) {
    const x = s.x + side * RX * 0.8, y0 = s.y - LIFT + RY * 0.35, y1 = s.y + RY * 0.35;
    g.fillStyle(PLANK_DARK, 0.9); g.fillRect(x - 4, y0, 8, y1 - y0);
    g.fillStyle(PLANK, 0.9); g.fillRect(x - 3, y0, 4, y1 - y0);
    g.fillStyle(PLANK_LIT, 0.9); g.fillRect(x - 7, y0 - 2, 14, 4);
  }
}

/** A little five-point star for a cracked head. */
function star(g: G, x: number, y: number, r: number, color: number, a: number): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + i * (Math.PI / 5), rr = i % 2 ? r * 0.45 : r;
    pts.push({ x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr });
  }
  g.fillStyle(color, a); g.fillPoints(pts, true);
  g.lineStyle(1, lit(color, 0.4), a); g.strokePoints(pts, true);
}

export const FALLEN_LOW_ROOF: GimmickDef = {
  id: ID,
  rules: 'Under the low roof shots die on the rock and a dash cracks your head. Shelter there; make him dash in. Later the roof slides to the last to dash.',
  make,
};
