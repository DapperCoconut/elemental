import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mixC, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { poly, rivets } from '../art';
import { HEAT_ORANGE, HEAT_RED, HEAT_WHITE, HEAT_YELLOW, IRON, IRON_DARK, IRON_LIT, IRON_SHEEN, RUST, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, heatColor, stepDt } from '../util';
import { hurt, inArc, onFloor } from './kit';

/**
 * Proof Load — Linka Shackleby, Proof-Mistress of the Bridge Works. In the King's telling she does
 * not make bridge chain: she proves the chains the interred are walked down the hill on, and is
 * proud of every one that held.
 *
 * A proving chain is laid across the yard between two winch-bollards and wound tight. The dial
 * climbs to the proof load; somewhere along the chain one link is weak (notched, glowing). When the
 * load is reached that link fails and **both halves whip round their anchors** — each half sweeps a
 * wedge as long as itself, toward the side the chalk arrows point. Break it near one end and that
 * end's whip is a flick while the other half lashes half the yard.
 *
 * **Strike a link to nick it:** it becomes the weak one, so you choose where the chain parts — and
 * so which wedge is long and where it lands. Linka nicks links too. The last stretch of the pull
 * is *locked* (no more nicking) and the wedges are drawn hard, so there is always time to step out.
 * Past half she proves two chains at once, out of step. The bot nicks the link whose whip covers
 * you and stands on the quiet side of the chain while it parts.
 */

const ID = fallenId('forge', 'proof');
const LAY_MS = 700;
const PULL_MS = 4300;
const PULL_LATE_MS = 3600;
const LOCK_MS = 1450;
const SWEEP_MS = 420;
const LIMP_MS = 1300;
const GAP_MS = 900;
const ARC = 1.85;
const WHIP_DMG = 22;
const LINK_R = 17;
const KS = [0.12, 0.215, 0.31, 0.405, 0.5, 0.595, 0.69, 0.785, 0.88];

interface Proof {
  a: Pt; b: Pt; len: number; ang: number; kick: 1 | -1; weak: number;
  layAt: number; lockAt: number; snapAt: number; endAt: number;
  links: StrikeTarget[]; nickAt: number; prevU: number; hit: Set<string>; snapped: boolean;
}
interface Half { o: Pt; len: number; a0: number; span: number }

/** A winch-bollard: a bolted base plate, an iron post, a drum of chain and its ratchet pawl. */
function bollard(g: G, x: number, y: number, k: number, time: number): void {
  shadow(g, x, y + 4, 46, 14, 0.4);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 22, y - 6, 44, 12);
  g.fillStyle(IRON, 1); g.fillRect(x - 22, y - 6, 44, 3);
  rivets(g, x - 18, y, x + 18, y, 3, 1.5);
  g.fillStyle(IRON_DARK, 1); g.fillRect(x - 8, y - 40, 16, 36);
  g.fillStyle(IRON_LIT, 0.7); g.fillRect(x - 6, y - 40, 4, 36);
  // The drum, wound with chain, turning as the load rises.
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, y - 44, 34, 18);
  g.lineStyle(3, IRON, 1); g.strokeEllipse(x, y - 44, 34, 18);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + k * 9;
    g.lineStyle(2, IRON_LIT, 0.9); g.strokeEllipse(x + Math.cos(a) * 9, y - 44 + Math.sin(a) * 3, 7, 4);
  }
  // The ratchet wheel and pawl, ticking.
  const tick = Math.floor(k * 24) % 2;
  g.fillStyle(IRON, 1); g.fillCircle(x + 16, y - 26, 7);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + k * 6;
    g.fillStyle(IRON_SHEEN, 1); g.fillTriangle(x + 16 + Math.cos(a) * 7, y - 26 + Math.sin(a) * 7, x + 16 + Math.cos(a + 0.3) * 10, y - 26 + Math.sin(a + 0.3) * 10, x + 16 + Math.cos(a + 0.5) * 7, y - 26 + Math.sin(a + 0.5) * 7);
  }
  g.lineStyle(2.5, IRON_DARK, 1); g.lineBetween(x + 6, y - 36, x + 15 + tick * 2, y - 31);
  if (k > 0.75) glow(g, x, y - 44, 20, HEAT_RED, 0.03 + 0.03 * Math.sin(time / 50), 2);
}

/** A chain from `a` along angle `ang` for `len` px: links alternately face-on and edge-on. */
function chain(g: G, a: Pt, ang: number, len: number, heat: number, shake: number, time: number, weakAt = -1, weakGlow = 0): void {
  const n = Math.max(2, Math.round(len / 13));
  const ux = Math.cos(ang), uy = Math.sin(ang);
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) * (len / n);
    const j = Math.sin(time / 22 + i * 1.7) * shake;
    const x = a.x + ux * s - uy * j, y = a.y + uy * s + ux * j;
    const isWeak = weakAt >= 0 && Math.abs(s - weakAt) < len / n / 2 + 0.5;
    const c = isWeak ? heatColor(0.45 + weakGlow * 0.5) : mixC(IRON, HEAT_RED, heat * 0.45);
    if (i % 2 === 0) {
      const pts: Pt[] = [];
      for (let q = 0; q < 10; q++) {
        const t = (q / 10) * Math.PI * 2;
        const ex = Math.cos(t) * 8, ey = Math.sin(t) * 4.5;
        pts.push({ x: x + ex * ux - ey * uy, y: y + ex * uy + ey * ux });
      }
      g.lineStyle(isWeak ? 3.2 : 2.6, c, 1); g.strokePoints(pts, true);
      g.lineStyle(1, IRON_SHEEN, 0.5); g.lineBetween(x - ux * 5 - uy * 3, y - uy * 5 + ux * 3, x + ux * 3 - uy * 4, y + uy * 3 + ux * 4);
    } else {
      g.lineStyle(isWeak ? 4.5 : 3.6, c, 1); g.lineBetween(x - ux * 8, y - uy * 8, x + ux * 8, y + uy * 8);
      g.lineStyle(1, IRON_LIT, 0.8); g.lineBetween(x - ux * 6, y - uy * 6 - 1, x + ux * 6, y + uy * 6 - 1);
    }
    if (isWeak) {
      // The file-notch across the weak link, and its heat.
      g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x - uy * 6, y + ux * 6, x + uy * 6, y - ux * 6);
      glow(g, x, y, 16 + weakGlow * 10, HEAT_ORANGE, 0.04 + weakGlow * 0.04, 3);
    }
  }
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const cy = (top + H - 40) / 2;
  const LAYS: [Pt, Pt][] = [
    [{ x: 46, y: cy }, { x: W - 46, y: cy }],
    [{ x: 74, y: top + 44 }, { x: W - 74, y: H - 50 }],
    [{ x: W - 74, y: top + 44 }, { x: 74, y: H - 50 }],
    [{ x: W * 0.5, y: top + 30 }, { x: W * 0.5, y: H - 44 }],
    [{ x: 46, y: top + 150 }, { x: W - 46, y: top + 150 }],
    [{ x: 46, y: H - 140 }, { x: W - 46, y: H - 140 }],
  ];
  const slots: (Proof | null)[] = [null, null];
  const nextAt = [0, Infinity];
  let lastLay = -1;
  let late = false;
  let started = false;
  let now = 0;

  const pullMs = () => (late ? PULL_LATE_MS : PULL_MS);
  const tension = (p: Proof, t: number) => clamp((t - p.layAt - LAY_MS) / (p.snapAt - p.layAt - LAY_MS), 0, 1);

  function halves(p: Proof, weak = p.weak): [Half, Half] {
    const k = KS[weak];
    return [
      { o: p.a, len: p.len * k, a0: p.ang, span: p.kick * ARC },
      { o: p.b, len: p.len * (1 - k), a0: p.ang + Math.PI, span: -p.kick * ARC },
    ];
  }
  const inHalf = (h: Half, x: number, y: number, pad = 24) => {
    const r = dist(h.o.x, h.o.y, x, y);
    return r > 6 && r <= h.len + pad && inArc(Math.atan2(y - h.o.y, x - h.o.x), h.a0, h.span);
  };
  const inWedges = (p: Proof, x: number, y: number, weak = p.weak) => halves(p, weak).some((h) => inHalf(h, x, y));

  function lay(slot: number, time: number): void {
    let i = Math.floor(rng() * LAYS.length);
    if (i === lastLay || slots.some((s) => s && LAYS.findIndex((l) => l[0] === s.a) === i)) i = (i + 1 + Math.floor(rng() * 3)) % LAYS.length;
    lastLay = i;
    const [a, b] = LAYS[i];
    const p: Proof = {
      a, b, len: dist(a.x, a.y, b.x, b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), kick: rng() < 0.5 ? 1 : -1,
      weak: Math.floor(rng() * KS.length), layAt: time, lockAt: time + LAY_MS + pullMs(), snapAt: 0, endAt: 0,
      links: [], nickAt: -1e9, prevU: 0, hit: new Set(), snapped: false,
    };
    p.snapAt = p.lockAt + LOCK_MS;
    p.endAt = p.snapAt + SWEEP_MS + LIMP_MS;
    p.links = KS.map((k, idx) => ctx.target({
      x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, r: LINK_R, passThrough: true,
      onStruck: (by) => nick(p, idx, by),
    }));
    slots[slot] = p;
    ctx.sfx('chain');
  }

  function nick(p: Proof, idx: number, by: 'player' | 'npc'): void {
    if (now >= p.lockAt || p.weak === idx || now - p.nickAt < 200) return;
    p.weak = idx;
    p.nickAt = now;
    const t = p.links[idx];
    ctx.float(t.x, t.y - 26, by === 'player' ? 'NICKED' : 'LINKA NICKS IT', by === 'player' ? '#ffe2a8' : '#ffb070');
    ctx.sfx('clang');
  }

  function snap(p: Proof): void {
    p.snapped = true;
    for (const t of p.links) t.remove();
    p.links = [];
    const k = KS[p.weak];
    ctx.flash(p.a.x + (p.b.x - p.a.x) * k, p.a.y + (p.b.y - p.a.y) * k, HEAT_WHITE);
    ctx.sfx('whip');
  }

  function whip(p: Proof, time: number): void {
    const u = clamp((time - p.snapAt) / SWEEP_MS, 0, 1);
    const e0 = 1 - (1 - p.prevU) ** 2, e1 = 1 - (1 - u) ** 2;
    halves(p).forEach((h, hi) => {
      for (const f of [ctx.player, ctx.npc]) {
        const key = `${hi}${f === ctx.player ? 'p' : 'n'}`;
        if (!alive(f) || p.hit.has(key)) continue;
        const r = dist(h.o.x, h.o.y, f.x, f.y);
        if (r < 6 || r > h.len + 24) continue;
        if (!inArc(Math.atan2(f.y - h.o.y, f.x - h.o.x), h.a0 + h.span * e0 - Math.sign(h.span) * 0.06, h.span * (e1 - e0) + Math.sign(h.span) * 0.12)) continue;
        p.hit.add(key);
        hurt(ctx, f, WHIP_DMG);
        const na = h.a0 + h.span * e1 + Math.sign(h.span) * Math.PI / 2;
        ctx.nudge(f, Math.cos(na) * 46, Math.sin(na) * 46);
        ctx.float(f.x, f.y - 50, 'WHIPPED', '#ffb070');
      }
    });
    p.prevU = u;
  }

  /** The link the bot wants nicked: its whip covers you and spares her. */
  function botLink(p: Proof): number {
    const pl = ctx.player, n = ctx.npc;
    let best = -1, bestD = 1e9;
    for (let i = 0; i < KS.length; i++) {
      if (!inWedges(p, pl.x, pl.y, i) || inWedges(p, n.x, n.y, i)) continue;
      const t = p.links[i];
      if (!t) continue;
      const d = dist(t.x, t.y, n.x, n.y);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function safeFrom(ps: Proof[]): Pt | null {
    const n = ctx.npc, pl = ctx.player;
    if (!ps.some((p) => inWedges(p, n.x, n.y))) return null;
    let best: Pt | null = null, bestS = 1e9;
    for (let r = 90; r <= 270; r += 60) {
      for (let i = 0; i < 12; i++) {
        const q = onFloor(ctx, n.x + Math.cos(i * 0.52) * r, n.y + Math.sin(i * 0.52) * r);
        if (ps.some((p) => inWedges(p, q.x, q.y))) continue;
        const s = dist(q.x, q.y, n.x, n.y) + 0.3 * dist(q.x, q.y, pl.x, pl.y);
        if (s < bestS) { bestS = s; best = q; }
      }
    }
    return best;
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      now = time;
      if (!started) { started = true; nextAt[0] = time + 1600; }
      if (!late && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        late = true;
        nextAt[1] = time + 2200;
        ctx.banner('TWO CHAINS ON THE PROOF', '#ffb070');
        ctx.sfx('chain');
      }
      for (let s = 0; s < 2; s++) {
        const p = slots[s];
        if (!p) { if (time >= nextAt[s]) lay(s, time); continue; }
        if (!p.snapped && time >= p.snapAt) snap(p);
        if (p.snapped && time < p.snapAt + SWEEP_MS + 40) whip(p, time);
        if (time >= p.endAt) { slots[s] = null; nextAt[s] = time + GAP_MS; }
      }
    },

    npcSeek() {
      const live = slots.filter((p): p is Proof => !!p);
      const locked = live.filter((p) => now >= p.lockAt);
      const safe = safeFrom(locked);
      if (safe) return safe;
      for (const p of live) {
        if (now >= p.lockAt || now < p.layAt + LAY_MS) continue;
        const i = botLink(p);
        if (i < 0 || i === p.weak) continue;
        const t = p.links[i];
        const nx = -Math.sin(p.ang) * p.kick, ny = Math.cos(p.ang) * p.kick;
        return onFloor(ctx, t.x - nx * 44, t.y - ny * 44);
      }
      const pl = ctx.player, n = ctx.npc;
      return onFloor(ctx, pl.x + (n.x < pl.x ? -130 : 130), pl.y);
    },

    drawGround(g, time) {
      for (const p of slots) {
        if (!p) continue;
        // The chalked lay: arrows on the side the halves will kick.
        const nx = -Math.sin(p.ang) * p.kick, ny = Math.cos(p.ang) * p.kick;
        for (let i = 1; i < 10; i++) {
          const x = p.a.x + (p.b.x - p.a.x) * (i / 10) + nx * 22, y = p.a.y + (p.b.y - p.a.y) * (i / 10) + ny * 22;
          g.lineStyle(2, 0xf4ecd8, 0.5);
          g.lineBetween(x - Math.cos(p.ang) * 7, y - Math.sin(p.ang) * 7, x + nx * 9, y + ny * 9);
          g.lineBetween(x + Math.cos(p.ang) * 7, y + Math.sin(p.ang) * 7, x + nx * 9, y + ny * 9);
        }
        if (p.snapped) continue;
        // The two wedges the current weak link would throw: faint while it can change, hard once locked.
        const lockedK = time >= p.lockAt ? clamp((time - p.lockAt) / LOCK_MS, 0, 1) : -1;
        for (const h of halves(p)) {
          const steps = 18;
          const pts: Pt[] = [{ x: h.o.x, y: h.o.y }];
          for (let s = 0; s <= steps; s++) {
            const a = h.a0 + h.span * (s / steps);
            pts.push({ x: h.o.x + Math.cos(a) * h.len, y: h.o.y + Math.sin(a) * h.len });
          }
          if (lockedK >= 0) {
            poly(g, pts, HEAT_RED, 0.1 + lockedK * 0.22);
            g.lineStyle(2.5, HEAT_YELLOW, 0.5 + lockedK * 0.45); g.strokePoints(pts, true);
          } else {
            poly(g, pts, HEAT_RED, 0.05);
            g.lineStyle(1.5, HEAT_ORANGE, 0.28); g.strokePoints(pts, true);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const p of slots) {
        if (!p) continue;
        const k = tension(p, time);
        const layK = clamp((time - p.layAt) / LAY_MS, 0, 1);
        bollard(g, p.a.x, p.a.y, k, time);
        bollard(g, p.b.x, p.b.y, k, time);
        if (!p.snapped) {
          const weakAt = p.len * KS[p.weak];
          chain(g, p.a, p.ang, p.len * layK, k, k * k * 2.6, time, weakAt, 0.5 + 0.5 * Math.sin(time / (90 - k * 50)));
          // Links you can nick show a small ring; locked, they don't.
          if (time < p.lockAt) {
            for (const t of p.links) { g.lineStyle(1, 0xf4ecd8, 0.3); g.strokeCircle(t.x, t.y, LINK_R); }
          }
        } else {
          const u = clamp((time - p.snapAt) / SWEEP_MS, 0, 1);
          const e = 1 - (1 - u) ** 2;
          for (const h of halves(p)) {
            const a = h.a0 + h.span * e;
            chain(g, h.o, a, h.len, Math.max(0, 0.8 - u), 0, time);
            if (u < 1) {
              // The lash: a fan of after-images behind the flying half.
              for (let s = 1; s <= 4; s++) {
                const ab = h.a0 + h.span * Math.max(0, e - s * 0.07);
                g.lineStyle(3, HEAT_YELLOW, 0.25 - s * 0.05);
                g.lineBetween(h.o.x, h.o.y, h.o.x + Math.cos(ab) * h.len, h.o.y + Math.sin(ab) * h.len);
              }
              const tip = { x: h.o.x + Math.cos(a) * h.len, y: h.o.y + Math.sin(a) * h.len };
              glow(g, tip.x, tip.y, 26, HEAT_WHITE, 0.08, 3);
            }
          }
        }
      }
    },

    drawHud(g, time) {
      // A proving dial per chain: the needle climbing to the red proof mark.
      slots.forEach((p, s) => {
        if (!p) return;
        const x = s === 0 ? W / 2 - 40 : W / 2 + 40, y = top + 26, r = 18;
        const k = tension(p, time);
        g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, r + 4);
        g.fillStyle(0xe8dcc0, 1); g.fillCircle(x, y, r);
        g.lineStyle(2, IRON_DARK, 1); g.strokeCircle(x, y, r);
        const a0 = Math.PI * 0.75, span = Math.PI * 1.5;
        for (let i = 0; i <= 10; i++) {
          const a = a0 + span * (i / 10);
          g.lineStyle(i === 10 ? 3 : 1, i >= 9 ? HEAT_RED : IRON_DARK, 1);
          g.lineBetween(x + Math.cos(a) * (r - 5), y + Math.sin(a) * (r - 5), x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1));
        }
        const na = a0 + span * (p.snapped ? 1 : k);
        g.lineStyle(2, p.snapped ? HEAT_ORANGE : RUST, 1); g.lineBetween(x, y, x + Math.cos(na) * (r - 3), y + Math.sin(na) * (r - 3));
        g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y, 2.5);
        if (time >= p.lockAt && !p.snapped) { g.lineStyle(2, HEAT_YELLOW, 0.6 + 0.4 * Math.sin(time / 70)); g.strokeCircle(x, y, r + 3); }
      });
    },

    destroy() {
      for (const p of slots) if (p) for (const t of p.links) t.remove();
    },
  };
}

/** Proof Load: a proving chain parts where it is nicked, and its halves whip round their anchors. */
export const FALLEN_PROOF: GimmickDef = {
  id: ID,
  rules: 'The proving chain parts at its weak link and both halves whip round their anchors. Strike a link to nick it and choose the break. Two chains at half.',
  make,
};
