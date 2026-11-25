import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { INK, INK_SOFT, LEAD, LEAD_LIT, PAPER, PAPER_DARK, PAPER_LIT, RED } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';
import { pips, proofSlip } from './common';

/**
 * Hand in Hand — Doll-Cutter Clementine Snipe, who cut the paper dolls the children of Libretto
 * were given at Matins, one for every Part in the choir, all holding hands.
 *
 * She folds a strip concertina-wise, cuts one figure through every fold at once, and opens it:
 * a chain of paper dolls, hand in hand, that walks broadside at whoever is nearest. Touch one and
 * the whole chain closes its hands round you — you are held and squeezed, and the dolls crumple.
 *
 * Strike a chain and it tears in two at the middle: both halves are flung on, away from you, in a
 * spreading V, and the first fighter a flying half meets (never the one who tore it) is bowled
 * over by it. A lone doll struck is only confetti. Tear the chains at her; lead the walkers to her
 * — they want the nearest. Past half her chains are longer, and torn halves that meet join hands.
 */

const SPACING = 22;
const MAX_DOLLS = 18;
const DRESS = [0xc8242c, 0x2a4a9a, 0xd8a93c, 0x3a8a5a, 0x8a3a8a];

interface Chain {
  x: number; y: number; vx: number; vy: number; ang: number;
  n: number; seed: number; born: number;
  flyUntil: number; striker: Fighter | null; torn: boolean;
  t: StrikeTarget;
}
interface Snip { x: number; y: number; at: number; n: number }
interface Scrap { x: number; y: number; vx: number; vy: number; at: number; c: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const chains: Chain[] = [];
  const snips: Snip[] = [];
  const scraps: Scrap[] = [];
  let started = false;
  let half = false;
  let nextSnip = 0;

  const halfLen = (c: Chain): number => ((c.n - 1) * SPACING) / 2;
  const ends = (c: Chain): [number, number, number, number] => {
    const L = halfLen(c), cx = Math.cos(c.ang) * L, cy = Math.sin(c.ang) * L;
    return [c.x - cx, c.y - cy, c.x + cx, c.y + cy];
  };
  const dolls = (): number => chains.reduce((n, c) => n + c.n, 0) + snips.reduce((n, s) => n + s.n, 0);
  const nearest = (x: number, y: number): Fighter | null => {
    const live = [player, npc].filter(alive);
    if (!live.length) return null;
    return live.reduce((a, b) => (dist(a.x, a.y, x, y) <= dist(b.x, b.y, x, y) ? a : b));
  };

  function confetti(x: number, y: number, n: number): void {
    for (let i = 0; i < 6 + n * 4; i++) {
      const a = rng() * Math.PI * 2, sp = 40 + rng() * 120;
      scraps.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, at: ctx.scene.time.now, c: rng() < 0.3 ? DRESS[Math.floor(rng() * DRESS.length)] : PAPER_LIT });
    }
  }

  function spend(c: Chain): void {
    c.t.remove();
    const i = chains.indexOf(c);
    if (i >= 0) chains.splice(i, 1);
    confetti(c.x, c.y, c.n);
  }

  function addChain(x: number, y: number, n: number, ang: number, time: number, fly?: { vx: number; vy: number; by: Fighter }): Chain {
    const c: Chain = {
      x, y, vx: fly?.vx ?? 0, vy: fly?.vy ?? 0, ang, n, seed: rng() * 100, born: time,
      flyUntil: fly ? time + 600 : 0, striker: fly?.by ?? null, torn: !!fly,
      t: ctx.target({ x, y, r: Math.min(48, 16 + n * 6), onStruck: (by) => tear(c, by === 'player' ? player : npc) }),
    };
    chains.push(c);
    return c;
  }

  /** Torn at the middle: two halves flung on away from whoever tore it. */
  function tear(c: Chain, by: Fighter): void {
    if (!chains.includes(c)) return;
    const time = ctx.scene.time.now;
    if (time - c.born < 150) return;
    ctx.sfx('slash');
    if (c.n <= 1) { spend(c); return; }
    const a = Math.atan2(c.y - by.y, c.x - by.x);
    const n1 = Math.floor(c.n / 2), n2 = c.n - n1;
    const L = halfLen(c) / 2, ax = Math.cos(c.ang) * L, ay = Math.sin(c.ang) * L;
    c.t.remove();
    chains.splice(chains.indexOf(c), 1);
    const parts: [number, number, number][] = [[n1, -1, a - 0.45], [n2, 1, a + 0.45]];
    for (const [n, side, dir] of parts) {
      addChain(c.x + ax * side, c.y + ay * side, n, c.ang, time, { vx: Math.cos(dir) * 330, vy: Math.sin(dir) * 330, by });
    }
    ctx.flash(c.x, c.y, PAPER_LIT);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextSnip = time + 1200; }
      if (!half && npc.hp < npc.maxHp * 0.5) half = true;

      // She snips a new chain beside her, on your side.
      if (time >= nextSnip && alive(npc)) {
        nextSnip = time + (half ? 3600 : 4500);
        const n = half ? 5 + Math.floor(rng() * 4) : 4 + Math.floor(rng() * 3);
        if (dolls() + n <= MAX_DOLLS) {
          const a = Math.atan2(player.y - npc.y, player.x - npc.x);
          snips.push({ x: clamp(npc.x + Math.cos(a) * 70, 70, W - 70), y: clamp(npc.y + Math.sin(a) * 70, top + 50, H - 50), at: time + 900, n });
          ctx.sfx('trap-set');
        }
      }
      for (let i = snips.length - 1; i >= 0; i--) {
        const s = snips[i];
        if (time < s.at) continue;
        snips.splice(i, 1);
        addChain(s.x, s.y, s.n, 0, time);
        ctx.sfx('whoosh');
      }

      for (const c of [...chains]) {
        if (!chains.includes(c)) continue;
        const flying = time < c.flyUntil;
        if (!flying) {
          // Broadside at whoever is nearest, slowly, the way children run holding hands.
          c.striker = null;
          const f = nearest(c.x, c.y);
          if (f) {
            const a = Math.atan2(f.y - c.y, f.x - c.x);
            c.vx += (Math.cos(a) * 55 - c.vx) * Math.min(1, dt * 2.2);
            c.vy += (Math.sin(a) * 55 - c.vy) * Math.min(1, dt * 2.2);
            const want = a + Math.PI / 2;
            let d = Math.atan2(Math.sin(want - c.ang), Math.cos(want - c.ang));
            if (Math.abs(d) > Math.PI / 2) d = Math.atan2(Math.sin(want + Math.PI - c.ang), Math.cos(want + Math.PI - c.ang));
            c.ang += d * Math.min(1, dt * 1.6);
          }
        }
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.x < 40 || c.x > W - 40) { c.vx = -c.vx; c.x = clamp(c.x, 40, W - 40); }
        if (c.y < top + 30 || c.y > H - 30) { c.vy = -c.vy; c.y = clamp(c.y, top + 30, H - 30); }
        c.t.moveTo(c.x, c.y);
        const [x1, y1, x2, y2] = ends(c);
        for (const f of [player, npc]) {
          if (!alive(f) || ctx.isAirborne(f) || f === c.striker) continue;
          if (segDist(f.x, f.y, x1, y1, x2, y2) > (flying ? 26 : 22)) continue;
          if (flying) {
            ctx.hit(f, Math.min(14, 5 * c.n), f.x, f.y);
            const sp = Math.hypot(c.vx, c.vy) || 1;
            ctx.nudge(f, (c.vx / sp) * 34, (c.vy / sp) * 34);
            ctx.sfx('hit-medium');
          } else {
            // The hands close round you.
            ctx.hit(f, Math.min(16, 4 * c.n), f.x, f.y);
            ctx.root(f, 700);
            ctx.sfx('trap-snap');
          }
          spend(c);
          break;
        }
      }
      // Past half, halves that meet join hands again.
      if (half) {
        for (let i = 0; i < chains.length; i++) for (let j = i + 1; j < chains.length; j++) {
          const a = chains[i], b = chains[j];
          if (time < a.flyUntil || time < b.flyUntil || a.n + b.n > 8 || dist(a.x, a.y, b.x, b.y) > 34) continue;
          const n = a.n + b.n, x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, ang = a.ang;
          a.t.remove(); b.t.remove();
          chains.splice(j, 1); chains.splice(i, 1);
          addChain(x, y, n, ang, time);
          ctx.sfx('snap-back');
          i = chains.length;
          break;
        }
      }
      for (let i = scraps.length - 1; i >= 0; i--) {
        const s = scraps[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 160 * dt; s.vx *= 0.97;
        if (time - s.at > 900) scraps.splice(i, 1);
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      let threat: Chain | null = null, behind: Chain | null = null, bd = Infinity;
      for (const c of chains) {
        if (nearest(c.x, c.y) === npc && dist(c.x, c.y, npc.x, npc.y) < 130 && ctx.scene.time.now >= c.flyUntil) threat = c;
        const d = dist(c.x, c.y, npc.x, npc.y);
        if (dist(c.x, c.y, player.x, player.y) < 420 && d < bd) { bd = d; behind = c; }
      }
      if (threat) {
        const a = Math.atan2(npc.y - threat.y, npc.x - threat.x);
        return { x: clamp(npc.x + Math.cos(a) * 160, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 160, top + 50, H - 40) };
      }
      if (behind) {
        // Stand on the far side of a chain from you, so her blow sends the halves your way.
        const a = Math.atan2(behind.y - player.y, behind.x - player.x);
        return { x: clamp(behind.x + Math.cos(a) * 64, 50, W - 50), y: clamp(behind.y + Math.sin(a) * 64, top + 40, H - 40) };
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 240, 60, W - 60), y: clamp(player.y + Math.sin(a) * 220, top + 50, H - 40) };
    },

    drawGround(g) {
      for (const c of chains) {
        const [x1, y1, x2, y2] = ends(c);
        g.lineStyle(14, 0x000000, 0.14); g.lineBetween(x1, y1 + 14, x2, y2 + 14);
      }
      for (const s of snips) { g.fillStyle(0x000000, 0.12); g.fillEllipse(s.x, s.y + 14, 40, 10); }
    },

    drawAir(g, time) {
      // Her scissors working through a folded strip.
      for (const s of snips) {
        const k = clamp(1 - (s.at - time) / 900, 0, 1);
        drawFoldedStrip(g, s.x, s.y, s.n, k);
        const open = Math.abs(Math.sin(time / 70)) * 0.5;
        const sx = s.x - 26 + k * 52, sy = s.y - 30;
        for (const side of [-1, 1]) {
          const a = -Math.PI / 2 + side * open;
          g.lineStyle(3, LEAD, 1); g.lineBetween(sx, sy, sx + Math.cos(a) * 22, sy + Math.sin(a) * 22);
          g.lineStyle(1, LEAD_LIT, 1); g.lineBetween(sx, sy, sx + Math.cos(a) * 20, sy + Math.sin(a) * 20);
          g.lineStyle(2.5, RED, 1); g.strokeCircle(sx - Math.cos(a) * 9, sy - Math.sin(a) * 9, 5);
        }
        g.fillStyle(LEAD_LIT, 1); g.fillCircle(sx, sy, 2);
      }
      for (const c of chains) drawChain(g, c, time);
      for (const s of scraps) {
        const k = (time - s.at) / 900;
        g.fillStyle(s.c, 1 - k);
        g.fillRect(s.x, s.y, 4, 3 + Math.sin(time / 40 + s.x) * 2);
      }
    },

    drawHud(g) {
      const x = W / 2, y = top + 4;
      proofSlip(g, x, y, 150, 26);
      // How many dolls are walking — out of what the strip can hold.
      pips(g, x + 6, y + 13, 9, Math.ceil(dolls() / 2), RED);
    },

    destroy() { for (const c of chains) c.t.remove(); },
  };
}

/** A strip folded concertina-wise, its doll outline pencilled on the top fold, opening as `k` runs to 1. */
function drawFoldedStrip(g: G, x: number, y: number, n: number, k: number): void {
  const w = 22 + k * (n - 1) * 3;
  for (let i = 0; i < n; i++) {
    const ox = (i - (n - 1) / 2) * (w / n);
    g.fillStyle(i % 2 ? PAPER_DARK : PAPER, 1); g.fillRect(x + ox - 11, y - 30, 22, 34);
  }
  g.lineStyle(1, INK_SOFT, 0.6); g.strokeRect(x - w / 2 - 11 + w / n / 2, y - 30, w + 22 - w / n, 34);
  g.lineStyle(1, INK, 0.5); g.strokeCircle(x, y - 22, 5); g.lineBetween(x - 10, y - 12, x + 10, y - 12);
}

/** A chain of paper dolls standing up off the floor, joined at the hands, concertina creases between. */
function drawChain(g: G, c: Chain, time: number): void {
  const L = halfLenOf(c.n);
  const ca = Math.cos(c.ang), sa = Math.sin(c.ang);
  const pts: Pt[] = [];
  for (let i = 0; i < c.n; i++) {
    const u = -L + i * SPACING;
    pts.push({ x: c.x + ca * u, y: c.y + sa * u });
  }
  const walk = Math.sin(time / 120 + c.seed);
  // The joined hands: one strip running through every doll at shoulder height.
  g.lineStyle(4, PAPER_DARK, 1);
  for (let i = 0; i < pts.length - 1; i++) g.lineBetween(pts[i].x, pts[i].y - 18, pts[i + 1].x, pts[i + 1].y - 18);
  g.lineStyle(2.4, PAPER_LIT, 1);
  for (let i = 0; i < pts.length - 1; i++) g.lineBetween(pts[i].x, pts[i].y - 18, pts[i + 1].x, pts[i + 1].y - 18);
  pts.forEach((p, i) => {
    const shade = i % 2 ? PAPER_DARK : PAPER_LIT;
    const bob = (i % 2 ? walk : -walk) * 1.5;
    // Legs.
    g.fillStyle(shade, 1); g.fillRect(p.x - 6, p.y - 6 + bob, 4, 7); g.fillRect(p.x + 2, p.y - 6 - bob, 4, 7);
    // Frock: a trapezoid, crayoned on a few of them.
    g.fillStyle(shade, 1); g.fillTriangle(p.x - 10, p.y - 5, p.x + 10, p.y - 5, p.x, p.y - 24);
    g.fillRect(p.x - 5, p.y - 24, 10, 8);
    const dress = DRESS[Math.floor(c.seed + i * 1.7) % DRESS.length];
    if ((i + Math.floor(c.seed)) % 3 === 0) {
      g.lineStyle(1.4, dress, 0.75);
      for (let k = 0; k < 4; k++) g.lineBetween(p.x - 7 + k * 4, p.y - 7, p.x - 3 + k * 2, p.y - 18);
    }
    // Head, with a child's face drawn in pencil.
    g.fillStyle(shade, 1); g.fillCircle(p.x, p.y - 30, 6);
    g.fillStyle(INK, 0.8); g.fillCircle(p.x - 2, p.y - 31, 0.9); g.fillCircle(p.x + 2, p.y - 31, 0.9);
    g.lineStyle(0.8, INK, 0.7); g.beginPath(); g.arc(p.x, p.y - 29, 2.2, 0.3, Math.PI - 0.3, false); g.strokePath();
    // The concertina crease down the middle of each hand.
    if (i < pts.length - 1) {
      const mx = (p.x + pts[i + 1].x) / 2, my = (p.y + pts[i + 1].y) / 2;
      g.lineStyle(0.8, INK_SOFT, 0.45); g.lineBetween(mx, my - 21, mx, my - 15);
    }
  });
  // Torn ends: a ragged edge where the hands came apart.
  if (c.torn && pts.length) {
    for (const p of [pts[0], pts[pts.length - 1]]) {
      g.fillStyle(PAPER_LIT, 1);
      for (let k = 0; k < 3; k++) g.fillTriangle(p.x - 2 + k * 2, p.y - 20, p.x + k * 2, p.y - 16, p.x + 2 + k * 2, p.y - 21);
    }
  }
  // Flying halves blur.
  if (time < c.flyUntil) {
    const sp = Math.hypot(c.vx, c.vy) || 1;
    g.lineStyle(1.5, PAPER_LIT, 0.5);
    for (const p of pts) g.lineBetween(p.x, p.y - 20, p.x - (c.vx / sp) * 26, p.y - 20 - (c.vy / sp) * 26);
  }
}

const halfLenOf = (n: number): number => ((n - 1) * SPACING) / 2;

export const FALLEN_HAND_IN_HAND: GimmickDef = {
  id: fallenId('libretto', 'hand-in-hand'),
  rules: 'Paper-doll chains walk at whoever is nearest; touched, they hold you. Strike one: it tears and both halves fly on away from you. Tear them at her.',
  make,
};
