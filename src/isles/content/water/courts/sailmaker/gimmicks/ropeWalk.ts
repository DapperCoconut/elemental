import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { HEMP, HEMP_DARK, IRON, OAK, OAK_DARK, PINE, RED_THREAD, dist, rope, segDist, sideOf } from '../art';

/**
 * Rope Walk — Ropewalker Hawser's walk.
 *
 * Ten stake-posts stand round the walk, and Hawser lays rope between them: he walks backwards
 * from one post to another and the rope pays out of his hands behind him. A new rope lies slack
 * on the boards. As it is twisted it takes up strain — it straightens, it thrums, red fibres
 * start to pop — and once it is *taut* anyone who runs through it snaps it. A snapped rope
 * whips back on itself with a crack that hurts everybody near the break, the runner included.
 * Stepping over a slack rope is free (it just drags at your ankles for a moment).
 *
 * Hawser heaves on ropes from their posts to bring them up to strain faster, and he reads them —
 * mostly. The exploit is making *him* the runner: stand well back behind a taut rope and let
 * him come through it to you, or snap one yourself when he is closer to the break than you are.
 */

const POSTS_FRAC: [number, number][] = [
  [0.09, 0.1], [0.36, 0.06], [0.64, 0.06], [0.91, 0.1],
  [0.04, 0.5], [0.96, 0.5],
  [0.09, 0.92], [0.36, 0.95], [0.64, 0.95], [0.91, 0.92],
];
/** Post index pairs Hawser may lay between — all of them cross the open floor. */
const PAIRS: [number, number][] = [
  [0, 9], [3, 6], [1, 8], [2, 7], [4, 5], [1, 7], [2, 8], [0, 5], [3, 4], [4, 9], [5, 6], [1, 9], [2, 6], [0, 8], [3, 7],
];

const MAX_ROPES = 4;
const MAX_ROPES_HARD = 5;
const STRAIN_PER_S = 0.11;
const STRAIN_HARD_PER_S = 0.15;
const HEAVE_PER_S = 0.42;
const TAUT = 0.72;
const SNAP_R = 125;
const SNAP_DAMAGE = 14;
const SNAP_HARD_DAMAGE = 17;
const LAY_SPEED = 230;
const LAY_GAP_MS = 2400;
const CROSS_BAND = 14;
const RECOIL_MS = 520;
const FIGHTER_R = 20;

interface Rope {
  a: number; b: number;
  strain: number;
  /** 0–1 laid out so far (Hawser walking it). 1 = made fast at both posts. */
  laid: number;
  seed: number;
  /** Per-fighter side memory: +1 / −1 of the line, or 0 if not yet known. */
  sideP: number; sideN: number;
  /** Hawser misreads some ropes and walks straight through them. */
  misread: boolean;
}

interface Recoil { ax: number; ay: number; bx: number; by: number; sx: number; sy: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const field = H - top;
  const posts: Pt[] = POSTS_FRAC.map(([fx, fy]) => ({ x: W * fx, y: top + 20 + (field - 40) * fy }));
  const maxRopes = ctx.hard ? MAX_ROPES_HARD : MAX_ROPES;
  const strainRate = ctx.hard ? STRAIN_HARD_PER_S : STRAIN_PER_S;
  const snapDamage = ctx.hard ? SNAP_HARD_DAMAGE : SNAP_DAMAGE;

  let ropes: Rope[] = [];
  let recoils: Recoil[] = [];
  let laying: Rope | null = null;
  let nextLayAt = 1200;
  let heaving: Rope | null = null;
  let announced = false;
  const dragUntil = new Map<Fighter, number>();

  // Two ropes start already strung (slack-ish) so the floor has shape from the bell.
  for (const [a, b] of [PAIRS[0], PAIRS[1]]) {
    ropes.push({ a, b, strain: 0.35 + rng() * 0.2, laid: 1, seed: rng() * 10, sideP: 0, sideN: 0, misread: rng() < 0.3 });
  }

  const end = (r: Rope): { A: Pt; B: Pt } => {
    const A = posts[r.a], P = posts[r.b];
    return { A, B: { x: A.x + (P.x - A.x) * r.laid, y: A.y + (P.y - A.y) * r.laid } };
  };
  const foot = (f: Fighter): Pt => ({ x: f.x, y: f.y + 12 });

  const snap = (r: Rope, at: Pt, by: Fighter, time: number): void => {
    const { A, B } = end(r);
    recoils.push({ ax: A.x, ay: A.y, bx: B.x, by: B.y, sx: at.x, sy: at.y, at: time });
    ctx.sfx('whip');
    ctx.sfx('snap-back');
    ctx.scene.cameras.main.shake(140, 0.005);
    for (const f of [ctx.player, ctx.npc]) {
      if (!f.active || f.hp <= 0) continue;
      if (dist(at.x, at.y, f.x, f.y + 12) < SNAP_R + FIGHTER_R * 0.5) ctx.hit(f, snapDamage, f.x, f.y);
    }
    ctx.float(at.x, at.y - 40, by === ctx.player ? 'SNAP!' : 'HE SNAPPED IT', by === ctx.player ? '#ffd27a' : '#9df5c8');
    ropes = ropes.filter((q) => q !== r);
    if (heaving === r) heaving = null;
  };

  /** Pick a pair to lay: prefer one whose line runs between the two fighters. */
  const pickPair = (): [number, number] | null => {
    const used = new Set(ropes.map((r) => `${r.a}-${r.b}`));
    const p = ctx.player, n = ctx.npc;
    let best: [number, number] | null = null, bestScore = -Infinity;
    for (const [a, b] of PAIRS) {
      if (used.has(`${a}-${b}`) || used.has(`${b}-${a}`)) continue;
      const A = posts[a], B = posts[b];
      const between = sideOf(p.x, p.y, A.x, A.y, B.x, B.y) !== sideOf(n.x, n.y, A.x, A.y, B.x, B.y);
      const near = segDist(p.x, p.y, A.x, A.y, B.x, B.y);
      const score = (between ? 300 : 0) - near * 0.5 + rng() * 120;
      if (score > bestScore) { bestScore = score; best = [a, b]; }
    }
    return best;
  };

  const track = (f: Fighter, r: Rope, time: number): void => {
    if (r.laid < 1) return;
    const { A, B } = end(r);
    const p = foot(f);
    const s = sideOf(p.x, p.y, A.x, A.y, B.x, B.y);
    const onSeg = segDist(p.x, p.y, A.x, A.y, B.x, B.y) < CROSS_BAND + 12;
    const key: 'sideP' | 'sideN' = f === ctx.player ? 'sideP' : 'sideN';
    const prev = r[key];
    if (prev !== 0 && s !== prev && onSeg) {
      // A crossing.
      if (r.strain >= TAUT) { snap(r, p, f, time); return; }
      dragUntil.set(f, time + 320);
      r.strain = Math.max(0, r.strain - 0.12);
    }
    if (!onSeg || prev === 0 || s !== prev) r[key] = s;
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; ctx.banner('MIND THE LAY', '#e8c890'); }
      const n = ctx.npc;

      // Strain builds; Hawser heaving at a post builds it faster.
      heaving = null;
      for (const r of ropes) {
        if (r.laid < 1) continue;
        r.strain = Math.min(1, r.strain + strainRate * dt);
        if (dist(n.x, n.y, posts[r.a].x, posts[r.a].y) < 48 || dist(n.x, n.y, posts[r.b].x, posts[r.b].y) < 48) {
          r.strain = Math.min(1, r.strain + HEAVE_PER_S * dt);
          heaving = r;
        }
      }

      // Laying a new rope: he walks it from post A to post B.
      if (!laying && ropes.length < maxRopes && time >= nextLayAt) {
        const pair = pickPair();
        if (pair) {
          laying = { a: pair[0], b: pair[1], strain: 0, laid: 0, seed: rng() * 10, sideP: 0, sideN: 0, misread: rng() < (ctx.hard ? 0.15 : 0.3) };
          ropes.push(laying);
          ctx.float(posts[pair[0]].x, posts[pair[0]].y - 40, 'LAYING', '#e8c890');
        }
        nextLayAt = time + LAY_GAP_MS;
      }
      if (laying) {
        const A = posts[laying.a], B = posts[laying.b];
        const len = dist(A.x, A.y, B.x, B.y);
        if (laying.laid === 0 && dist(n.x, n.y, A.x, A.y) > 60) {
          // Still walking to the first post.
        } else {
          // Pay out behind him, as far as he has walked along the line (never ahead of him).
          const ux = (B.x - A.x) / len, uy = (B.y - A.y) / len;
          const along = Math.max(0, Math.min(len, (n.x - A.x) * ux + (n.y - A.y) * uy));
          laying.laid = Math.max(laying.laid, Math.min(1, along / len), Math.min(1, laying.laid + (LAY_SPEED * 0.25 * dt) / len));
          if (laying.laid >= 0.999 || dist(n.x, n.y, B.x, B.y) < 50) {
            laying.laid = 1;
            ctx.sfx('trap-set');
            ctx.float(B.x, B.y - 40, 'MADE FAST', '#e8c890');
            laying = null;
          }
        }
      }

      for (const r of [...ropes]) { track(ctx.player, r, time); if (ropes.includes(r)) track(n, r, time); }
      recoils = recoils.filter((rc) => time - rc.at < RECOIL_MS);
    },

    playerSpeedMult() { return ctx.scene.time.now < (dragUntil.get(ctx.player) ?? 0) ? 0.55 : 1; },
    npcSpeedMult() { return ctx.scene.time.now < (dragUntil.get(ctx.npc) ?? 0) ? 0.55 : 1; },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      if (laying) {
        const A = posts[laying.a], B = posts[laying.b];
        return laying.laid === 0 && dist(n.x, n.y, A.x, A.y) > 60 ? A : B;
      }
      // About to walk into a taut rope he has read: go round its nearer end.
      for (const r of ropes) {
        if (r.laid < 1 || r.strain < TAUT - 0.1 || r.misread) continue;
        const A = posts[r.a], B = posts[r.b];
        if (sideOf(n.x, n.y, A.x, A.y, B.x, B.y) === sideOf(p.x, p.y, A.x, A.y, B.x, B.y)) continue;
        if (segDist(n.x, n.y + 12, A.x, A.y, B.x, B.y) > 110) continue;
        const e = dist(n.x, n.y, A.x, A.y) < dist(n.x, n.y, B.x, B.y) ? A : B;
        const o = e === A ? B : A;
        const ux = (e.x - o.x), uy = (e.y - o.y), l = Math.hypot(ux, uy) || 1;
        return { x: e.x + (ux / l) * 50, y: e.y + (uy / l) * 50 };
      }
      // Otherwise, heave on a slack rope that lies near the player.
      const slack = ropes.filter((r) => r.laid >= 1 && r.strain < TAUT);
      if (slack.length && rng() < 0.02) {
        const r = slack[0];
        return dist(n.x, n.y, posts[r.a].x, posts[r.a].y) < dist(n.x, n.y, posts[r.b].x, posts[r.b].y) ? posts[r.a] : posts[r.b];
      }
      return heaving ? (dist(n.x, n.y, posts[heaving.a].x, posts[heaving.a].y) < 48 ? posts[heaving.a] : posts[heaving.b]) : null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The walk itself: a pale strip of packed boards end to end.
      g.fillStyle(0x000000, 0.08); g.fillRect(0, top + field * 0.42, W, field * 0.16);
      // Snap radius warnings on taut ropes under a fighter's feet.
      for (const r of ropes) {
        if (r.laid < 1 || r.strain < TAUT) continue;
        const { A, B } = end(r);
        const pulse = 0.5 + 0.5 * Math.sin(t * 12 + r.seed);
        g.lineStyle(CROSS_BAND * 2, RED_THREAD, 0.08 + pulse * 0.06); g.lineBetween(A.x, A.y, B.x, B.y);
        for (const f of [ctx.player, ctx.npc]) {
          const d = segDist(f.x, f.y + 12, A.x, A.y, B.x, B.y);
          if (d > 90) continue;
          g.lineStyle(2, RED_THREAD, 0.35 * (1 - d / 90)); g.strokeCircle(f.x, f.y + 12, SNAP_R);
        }
      }
      // Recoil scorch where a rope parted.
      for (const rc of recoils) {
        const k = (time - rc.at) / RECOIL_MS;
        g.lineStyle(4 * (1 - k), 0xffffff, 0.7 * (1 - k)); g.strokeCircle(rc.sx, rc.sy, 20 + k * SNAP_R);
        g.fillStyle(HEMP, 0.5 * (1 - k)); g.fillCircle(rc.sx, rc.sy, 10 * (1 - k) + 4);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      // Ropes: slack ones sag and wander; taut ones go straight and thrum.
      for (const r of ropes) {
        const { A, B } = end(r);
        const len = dist(A.x, A.y, B.x, B.y);
        if (len < 2) continue;
        const ux = (B.x - A.x) / len, uy = (B.y - A.y) / len, nx = -uy, ny = ux;
        const slack = 1 - Math.min(1, r.strain / TAUT);
        const taut = r.strain >= TAUT;
        const pts: Pt[] = [];
        const segs = 22;
        for (let i = 0; i <= segs; i++) {
          const k = i / segs;
          const bow = Math.sin(k * Math.PI) * (slack * 26 + 2) * Math.sin(r.seed + k * 3.1);
          const thrum = taut ? Math.sin(t * 60 + k * 18) * Math.sin(k * Math.PI) * 2.2 : 0;
          pts.push({ x: A.x + ux * len * k + nx * (bow + thrum), y: A.y + uy * len * k + ny * (bow + thrum) - 8 });
        }
        rope(g, pts, taut ? 4 : 3.5, taut ? lit(HEMP, 0.06) : HEMP);
        if (r.strain > 0.5) {
          // Popping fibres along the lay — more of them the closer it is to parting.
          const n = Math.floor((r.strain - 0.5) * 16);
          for (let i = 0; i < n; i++) {
            const k = ((i * 0.37 + t * 0.9 + r.seed) % 1);
            const px = A.x + ux * len * k, py = A.y + uy * len * k - 8;
            g.lineStyle(1, RED_THREAD, 0.9);
            g.lineBetween(px, py, px + nx * 6 + Math.sin(t * 20 + i) * 2, py + ny * 6 - 3);
          }
        }
        // Strain gauge at each made-fast end.
        if (r.laid >= 1) {
          for (const P of [A, B]) {
            g.fillStyle(0x1a1410, 0.75); g.fillRect(P.x - 14, P.y - 70, 28, 5);
            g.fillStyle(taut ? RED_THREAD : 0xe8c890, 0.95); g.fillRect(P.x - 13, P.y - 69, 26 * Math.min(1, r.strain), 3);
          }
        }
      }
      // Recoiling halves whip back to their posts.
      for (const rc of recoils) {
        const k = (time - rc.at) / RECOIL_MS;
        const e = 1 - Math.pow(1 - k, 3);
        for (const [px, py] of [[rc.ax, rc.ay], [rc.bx, rc.by]] as [number, number][]) {
          const tx = rc.sx + (px - rc.sx) * e, ty = rc.sy + (py - rc.sy) * e;
          const mx = (tx + px) / 2 + Math.sin(k * 20) * 30 * (1 - k), my = (ty + py) / 2 - 20 * (1 - k);
          rope(g, [{ x: tx, y: ty - 8 }, { x: mx, y: my - 8 }, { x: px, y: py - 8 }], 3.2, HEMP, 1 - k * 0.5);
          // The frayed end.
          for (let i = 0; i < 5; i++) {
            g.lineStyle(1, HEMP, 1 - k); g.lineBetween(tx, ty - 8, tx + Math.cos(i * 1.3 + k * 9) * 9, ty - 8 + Math.sin(i * 1.3 + k * 9) * 9);
          }
        }
      }
      // Stake-posts.
      for (const P of posts) {
        g.fillStyle(0x000000, 0.25); g.fillEllipse(P.x, P.y + 2, 22, 7);
        g.fillStyle(OAK_DARK, 1); g.fillRect(P.x - 5, P.y - 46, 10, 46);
        g.fillStyle(OAK, 1); g.fillRect(P.x - 3, P.y - 46, 4, 46);
        g.fillStyle(OAK_DARK, 1); g.fillRect(P.x - 15, P.y - 50, 30, 6);
        g.fillStyle(PINE, 1); g.fillRect(P.x - 14, P.y - 49, 28, 3);
        g.fillStyle(IRON, 1); g.fillCircle(P.x, P.y - 30, 3);
      }
      // Hawser's hands while laying: the yarn running from his fist.
      if (laying) {
        const n = ctx.npc;
        const { B } = end(laying);
        g.lineStyle(2, HEMP_DARK, 0.9); g.lineBetween(B.x, B.y - 8, n.x, n.y - 4);
        g.fillStyle(dim(HEMP, 0.2), 1); g.fillCircle(n.x + 10, n.y - 4, 7);
        g.fillStyle(HEMP, 1); g.fillCircle(n.x + 10, n.y - 4, 5);
      }
    },
  };
}

export const ROPE_WALK: GimmickDef = {
  id: 'sailmaker-rope-walk',
  rules: 'Ropes take strain as they are twisted. Run through a TAUT rope and it snaps — the crack hurts everyone near the break.',
  make,
};
