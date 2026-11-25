import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { HW, alive, barkCurl, clamp, dist, leaf } from '../palette';

/**
 * The Bough Sways — Ropewarden Ivo Hempstead, who keeps the guy-ropes that hold the boughs steady
 * in a gale. In the true world he climbed out in every storm to re-knot them. In the star's
 * telling he slackened the ropes over the short households' boughs, so the wind would do the
 * pruners' work for them, and called it weather.
 *
 * The fight is out on a bough with the drop on both long sides. The wind leans it: a creak and a
 * swing of the ropewarden's plumb-line first, then the whole bough tilts and everyone on it slides
 * downhill, slower than a walk. Slide off an edge and you slip — hurt, held a moment, hauled back
 * by the safety line. Four guy-posts stand on the bough: hold one (stand at it) and the lean
 * cannot move you.
 *
 * Strike a post and its rope snaps loose: it whips whoever is holding it and throws them
 * downhill, and the post is no use until it is re-knotted. So the foe clinging to a post is the
 * foe to cut loose. Past half health the gale comes: the leans come quicker, harder, and slantwise.
 */

const ID = fallenId('heartwood', 'sway');
const EDGE = 52;
const HOLD_R = 46;
const WHIP_R = 72;

interface Post { x: number; y: number; frayedUntil: number; tgt: StrikeTarget | null }
interface Gust { x: number; y: number; a: number; s: number; c: number; dieAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng, tk } = ctx;
  const mid = (top + H) / 2;
  const posts: Post[] = [
    { x: W * 0.16, y: mid - 20 }, { x: W * 0.4, y: mid - 96 }, { x: W * 0.6, y: mid + 96 }, { x: W * 0.84, y: mid + 20 },
  ].map((p) => ({ ...p, frayedUntil: 0, tgt: null }));
  let phase: 'still' | 'warn' | 'lean' = 'still';
  let phaseEnd = 2600;
  let lx = 0, ly = 1;
  let gale = false;
  let now = 0;
  let gusts: Gust[] = [];
  const slipCd = new Map<Fighter, number>();

  const drift = (): number => (gale ? 116 : 86);
  const holding = (f: Fighter): Post | null => posts.find((p) => now >= p.frayedUntil && dist(f.x, f.y, p.x, p.y) < HOLD_R) ?? null;
  const hurt = (f: Fighter, n: number, x: number, y: number): void => {
    if (f === ctx.player) tk.hitPlayer(n, x, y);
    else ctx.hit(f, n * 1.25, x, y);
  };

  for (const p of posts) {
    p.tgt = ctx.target({
      x: p.x, y: p.y - 10, r: 20,
      onStruck: () => {
        if (now < p.frayedUntil) return;
        p.frayedUntil = now + 7000;
        ctx.sfx('whip');
        ctx.float(p.x, p.y - 70, 'ROPE LOOSE', '#f6f3ea');
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || dist(f.x, f.y, p.x, p.y) > WHIP_R) continue;
          hurt(f, 12, f.x, f.y);
          const dx = phase === 'still' ? f.x - p.x : lx, dy = phase === 'still' ? f.y - p.y : ly;
          const m = Math.hypot(dx, dy) || 1;
          ctx.nudge(f, (dx / m) * 90, (dy / m) * 90);
        }
      },
    });
  }

  const pickLean = (): void => {
    const s = rng() < 0.5 ? -1 : 1;
    // Lean toward the side the player is nearer, more often than not: the wind is the warden's.
    const toward = rng() < 0.65 ? (ctx.player.y < mid ? -1 : 1) : s;
    if (gale && rng() < 0.5) { const sx = rng() < 0.5 ? -1 : 1; lx = sx * 0.7; ly = toward * 0.7; } else { lx = 0; ly = toward; }
  };

  return {
    update(time, dtIn) {
      const dt = Math.min(0.05, dtIn);
      now = time;
      if (!gale && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        gale = true;
        ctx.banner('THE GALE', '#c9d3cc');
        ctx.sfx('gust');
      }
      if (time >= phaseEnd) {
        if (phase === 'still') { phase = 'warn'; pickLean(); phaseEnd = time + tk.warn(1300); ctx.sfx('gear-turn'); }
        else if (phase === 'warn') { phase = 'lean'; phaseEnd = time + (gale ? 2900 : 2500); ctx.sfx('gust'); }
        else { phase = 'still'; phaseEnd = time + (gale ? 1500 : 2300); }
      }
      if (phase === 'lean') {
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || holding(f)) continue;
          ctx.nudge(f, lx * drift() * dt, ly * drift() * dt);
        }
        if (rng() < dt * 30) {
          const c = [HW.leafGold, HW.leafRust, HW.leafButter, HW.leafRed][Math.floor(rng() * 4)];
          gusts.push({ x: rng() * W, y: ly > 0 ? top + rng() * 120 : H - rng() * 120, a: Math.atan2(ly, lx || 0.0001), s: 7 + rng() * 5, c, dieAt: time + 1400 });
        }
      }
      for (const q of gusts) { q.x += (lx * 260 + Math.sin(time / 200 + q.s) * 30) * dt; q.y += ly * 260 * dt; q.a += dt * 3; }
      gusts = gusts.filter((q) => time < q.dieAt && q.y > top - 20 && q.y < H + 20);
      // Over an edge: slip, then the safety line hauls you back.
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f) || time < (slipCd.get(f) ?? 0)) continue;
        const north = f.y < top + EDGE, south = f.y > H - EDGE;
        if (!north && !south) continue;
        slipCd.set(f, time + 1600);
        hurt(f, 12, f.x, f.y);
        ctx.stun(f, 600);
        ctx.nudge(f, 0, north ? 150 : -150);
        ctx.float(f.x, f.y - 50, 'SLIPPED', '#c9d3cc');
        ctx.sfx('whoosh');
      }
    },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      if (n.y < top + EDGE + 60 || n.y > H - EDGE - 60) return { x: n.x, y: mid };
      if (phase !== 'still') {
        const downhill = ly > 0 ? H - EDGE - n.y : n.y - top - EDGE;
        const held = holding(p);
        if (held && downhill > 160) {
          return { x: tk.clampX(held.x - lx * 110), y: tk.clampY(held.y - ly * 110) };
        }
        if (downhill < 230 && !holding(n)) {
          const post = posts.filter((q) => now >= q.frayedUntil).sort((a, b) => dist(n.x, n.y, a.x, a.y) - dist(n.x, n.y, b.x, b.y))[0];
          if (post) return { x: post.x, y: post.y + 8 };
          return { x: n.x, y: mid - ly * 120 };
        }
        // Uphill of the player, so the lean carries them away toward the edge.
        return { x: tk.clampX(p.x - lx * 140), y: clamp(p.y - ly * 140, top + EDGE + 70, H - EDGE - 70) };
      }
      return null;
    },

    drawGround(g, time) {
      drawDrop(g, W, top, top + EDGE, -1, time);
      drawDrop(g, W, H - EDGE, H, 1, time);
      // The lean: the downhill half of the bough shades, the uphill catches light.
      if (phase !== 'still') {
        const k = phase === 'warn' ? 0.5 + 0.5 * Math.sin(time / 90) : 1;
        const a = 0.1 * k;
        if (ly > 0) { g.fillStyle(0x000000, a); g.fillRect(0, mid, W, H - mid); g.fillStyle(0xffffff, a * 0.5); g.fillRect(0, top, W, mid - top); }
        else { g.fillStyle(0x000000, a); g.fillRect(0, top, W, mid - top); g.fillStyle(0xffffff, a * 0.5); g.fillRect(0, mid, W, H - mid); }
        // Chevrons down the slope.
        for (let i = 0; i < 5; i++) {
          const cx = W * (0.1 + i * 0.2), cy = mid + Math.sin(time / 300 + i) * 6;
          g.lineStyle(3, HW.whitewash, 0.18 + 0.2 * k);
          g.lineBetween(cx - 16 - lx * 6, cy - ly * 10, cx + lx * 8, cy + ly * 6); g.lineBetween(cx + 16 - lx * 6, cy - ly * 10, cx + lx * 8, cy + ly * 6);
        }
      }
      for (const p of posts) drawPostBase(g, p, now);
    },

    drawAir(g, time) {
      for (const p of posts) drawRope(g, p, now, time, phase === 'lean' ? lx : 0);
      for (const f of [ctx.player, ctx.npc]) {
        const h = alive(f) ? holding(f) : null;
        if (!h) continue;
        g.lineStyle(2.5, HW.rope, 0.95); g.lineBetween(f.x, f.y - 20, h.x, h.y - 34);
      }
      for (const q of gusts) leaf(g, q.x, q.y, q.a, q.s, q.c, 0.9);
    },

    drawHud(g, time) {
      // The ropewarden's plumb-line: it swings out before the lean, then hangs over to its side.
      const x = W / 2, y = H - 40;
      g.fillStyle(HW.plankDark, 0.85); g.fillRoundedRect(x - 60, y - 14, 120, 40, 8);
      g.lineStyle(1.5, gale ? HW.mistDeep : HW.plankLit, 0.9); g.strokeRoundedRect(x - 60, y - 14, 120, 40, 8);
      g.lineStyle(1, HW.whitewash, 0.4);
      g.beginPath(); g.arc(x, y - 8, 26, Math.PI * 0.25, Math.PI * 0.75); g.strokePath();
      const sw = phase === 'warn' ? Math.sin(time / 110) * 0.6 : phase === 'lean' ? (lx !== 0 ? lx : ly) * 0.55 : Math.sin(time / 900) * 0.06;
      const bx = x + Math.sin(sw) * 26, by = y - 8 + Math.cos(sw) * 26;
      g.lineStyle(1.2, HW.rope, 1); g.lineBetween(x, y - 8, bx, by);
      g.fillStyle(phase === 'lean' ? 0xd8262a : HW.amber, 1); g.fillTriangle(bx - 5, by - 2, bx + 5, by - 2, bx, by + 8);
      g.fillStyle(HW.iron, 1); g.fillCircle(x, y - 8, 3);
      const k = clamp((phaseEnd - time) / 2600, 0, 1);
      g.fillStyle(HW.whitewash, 0.7); g.fillRect(x - 50, y + 20, 100 * k, 3);
    },

    destroy() { for (const p of posts) p.tgt?.remove(); gusts = []; },
  };
}

/** One long edge of the bough: bark lip with curls, then the canopy of the lesser forest far below. */
function drawDrop(g: G, W: number, y0: number, y1: number, side: -1 | 1, time: number): void {
  const rng = ((s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647)(side > 0 ? 77 : 33);
  g.fillStyle(HW.mistDeep, 1); g.fillRect(0, y0, W, y1 - y0);
  for (let i = 0; i < 18; i++) {
    const x = rng() * W, y = y0 + rng() * (y1 - y0);
    g.fillStyle(rng() < 0.5 ? HW.canopy : HW.canopyGold, 0.85); g.fillEllipse(x, y, 50 + rng() * 40, 16 + rng() * 10);
    g.fillStyle(HW.canopyLit, 0.5); g.fillEllipse(x - 6, y - 3, 22, 6);
  }
  const drift = (time / 60) % W;
  g.fillStyle(HW.mist, 0.35); g.fillEllipse(drift, (y0 + y1) / 2, 260, 18);
  g.fillStyle(HW.mist, 0.25); g.fillEllipse((drift + W / 2) % W, (y0 + y1) / 2 + 6, 200, 14);
  const lip = side < 0 ? y1 : y0;
  g.fillStyle(HW.barkShade, 1); g.fillRect(0, lip - 5, W, 10);
  g.fillStyle(HW.bark, 1); g.fillRect(0, lip - (side < 0 ? 1 : 5), W, 4);
  for (let x = 20; x < W; x += 70) barkCurl(g, x + rng() * 30, lip + side * -4, 9, rng);
  g.lineStyle(2, 0xd8262a, 0.25); g.lineBetween(0, lip - side * 12, W, lip - side * 12);
}

/** A guy-post's base: a squat oak bollard bolted into the bough, iron cleat and coiled rope. */
function drawPostBase(g: G, p: Post, now: number): void {
  shadow(g, p.x, p.y + 4, 44, 14, 0.35);
  g.fillStyle(HW.plankDark, 1); g.fillRoundedRect(p.x - 13, p.y - 34, 26, 38, 5);
  g.fillStyle(HW.plank, 1); g.fillRoundedRect(p.x - 10, p.y - 34, 16, 36, 4);
  g.fillStyle(HW.plankLit, 1); g.fillEllipse(p.x, p.y - 34, 26, 8);
  g.lineStyle(1, HW.plankDark, 0.8); g.strokeEllipse(p.x, p.y - 34, 14, 4);
  g.fillStyle(HW.iron, 1); g.fillRect(p.x - 16, p.y - 22, 32, 5);
  g.fillStyle(HW.ironLit, 1); g.fillRect(p.x - 16, p.y - 22, 32, 1.5);
  const frayed = now < p.frayedUntil;
  g.lineStyle(3, HW.rope, 1);
  for (let i = 0; i < 3; i++) g.strokeEllipse(p.x + 20, p.y - 2 - i * 3, 22 - i * 4, 8 - i);
  if (frayed) {
    for (let i = 0; i < 5; i++) { g.lineStyle(1.2, HW.rope, 0.9); g.lineBetween(p.x + 4, p.y - 30, p.x + 10 + i * 3, p.y - 44 - (i % 2) * 6); }
  }
}

/** The guy-rope itself, rising from the post toward the upper bough — taut, or loose and swinging. */
function drawRope(g: G, p: Post, now: number, time: number, lx: number): void {
  const frayed = now < p.frayedUntil;
  const tx = p.x - 60 + lx * -30, ty = p.y - 240;
  const sag = frayed ? 30 + Math.sin(time / 140) * 20 : 6;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    const x = p.x + (tx - p.x) * k + Math.sin(k * Math.PI) * sag, y = p.y - 30 + (ty - p.y + 30) * k;
    pts.push({ x, y });
  }
  for (let i = 0; i < pts.length - 1; i++) {
    if (frayed && i > 6) break;
    g.lineStyle(3, HW.rope, 1 - i * 0.05); g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    g.lineStyle(1, HW.plankDark, 0.5); g.lineBetween(pts[i].x + 1, pts[i].y, pts[i + 1].x + 1, pts[i + 1].y);
  }
  if (!frayed) glow(g, p.x, p.y - 30, 14, HW.rope, 0.04, 2);
}

export const FALLEN_SWAY: GimmickDef = {
  id: ID,
  rules: 'The wind leans the bough and slides you toward the drop; hold a guy-post to stand fast. Strike a post to whip its holder downhill.',
  make,
};
