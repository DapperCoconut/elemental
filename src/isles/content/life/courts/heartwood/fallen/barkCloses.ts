import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { HW, alive, birchEye, clamp, dist, lenticel } from '../palette';

/**
 * The Bark Closes — Warden Quillan Burrage, the prince's bark-warden. In the true world he
 * carved new knot-doors for families whose old ones had rotted. In the star's telling he is the
 * man who walked behind the pruners and laid his palm on each emptied door until the bark grew
 * shut over it, the way Prince Birchbark likes.
 *
 * The floor is bark, holed with five knot-holes. The pruners' great shears cut the yard: a band
 * daubed in whitewash, then the blades close along it end to end and cut whoever is in it.
 * Step out of the band — or drop into a knot, where nothing reaches you (but you cannot swing
 * either). A knot with someone in it starts growing shut, its bark lips creeping in; still inside
 * when it closes and you are sealed in — held, hurt, and spat out of a scarred knot.
 *
 * Strike a knot to work the bark: an empty knot splits wide open again; a knot with someone in
 * it grows shut faster — so a foe hiding from the shears can be sealed in. Past half health the
 * pruning begins: the shears cut two crossing bands at once and the bark closes quicker.
 */

const ID = fallenId('heartwood', 'bark-closes');
const KNOT_R = 38;
const IN_R = 30;
const BAND = 64;
const TRAVEL_MS = 450;

interface Knot { x: number; y: number; k: number; shutUntil: number; who: Fighter | null; tgt: StrikeTarget | null; struckAt: number }
interface Cut { ox: number; oy: number; a: number; fireAt: number; hit: Set<Fighter> }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng, tk } = ctx;
  const mid = (top + H) / 2;
  const knots: Knot[] = [
    { x: W * 0.2, y: top + 112 }, { x: W * 0.8, y: top + 112 }, { x: W / 2, y: mid + 10 },
    { x: W * 0.2, y: H - 92 }, { x: W * 0.8, y: H - 92 },
  ].map((p) => ({ ...p, k: 0, shutUntil: 0, who: null, tgt: null, struckAt: -1e9 }));
  let cuts: Cut[] = [];
  let pruning = false;
  let now = 0;
  let nextCut = 2600;
  const hidden = new Map<Fighter, number>();

  const L = Math.hypot(W, H);
  const along = (c: Cut, x: number, y: number): number => (x - c.ox) * Math.cos(c.a) + (y - c.oy) * Math.sin(c.a);
  const across = (c: Cut, x: number, y: number): number => (x - c.ox) * -Math.sin(c.a) + (y - c.oy) * Math.cos(c.a);
  const isHidden = (f: Fighter): boolean => now < (hidden.get(f) ?? 0);
  const hurt = (f: Fighter, n: number, x: number, y: number): void => {
    if (f === ctx.player) tk.hitPlayer(n, x, y);
    else ctx.hit(f, n * 1.25, x, y);
  };

  for (const kn of knots) {
    kn.tgt = ctx.target({
      x: kn.x, y: kn.y, r: KNOT_R, passThrough: true,
      onStruck: () => {
        if (now - kn.struckAt < 450 || now < kn.shutUntil) return;
        kn.struckAt = now;
        if (kn.who) { kn.k = Math.min(1, kn.k + 0.4); ctx.sfx('stone-rise'); ctx.float(kn.x, kn.y - 50, 'GROWING', '#f6f3ea'); }
        else if (kn.k > 0) { kn.k = 0; ctx.sfx('trap-snap'); ctx.float(kn.x, kn.y - 50, 'SPLIT', '#f6f3ea'); }
      },
    });
  }

  const seal = (kn: Knot, f: Fighter): void => {
    ctx.stun(f, 1500);
    const a = Math.atan2(f.y - mid, f.x - W / 2) || 0;
    tk.schedule(200, () => {
      if (!alive(f)) return;
      hurt(f, 16, f.x, f.y);
      ctx.nudge(f, Math.cos(a) * 70, Math.sin(a) * 70);
    });
    kn.shutUntil = now + 3200;
    kn.k = 1;
    ctx.sfx('stone-slam');
    ctx.float(kn.x, kn.y - 54, 'SEALED IN', '#f6f3ea');
  };

  const queueCut = (time: number, a: number): void => {
    const p = ctx.player;
    const ox = clamp(p.x + (rng() - 0.5) * 80, 80, W - 80), oy = clamp(p.y + (rng() - 0.5) * 80, top + 60, H - 60);
    cuts.push({ ox: ox - Math.cos(a) * L, oy: oy - Math.sin(a) * L, a, fireAt: time + tk.warn(1300), hit: new Set() });
  };

  return {
    update(time, dtIn) {
      const dt = Math.min(0.05, dtIn);
      now = time;
      if (!pruning && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        pruning = true;
        ctx.banner('THE PRUNING', '#f6f3ea');
        ctx.sfx('curse-cast');
      }
      if (time >= nextCut) {
        const angles = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4];
        const a = angles[Math.floor(rng() * angles.length)];
        queueCut(time, a);
        if (pruning) queueCut(time, a + Math.PI / 2);
        ctx.sfx('trap-set');
        nextCut = time + (pruning ? 4200 : 5200);
      }
      // Knots: who is inside, how far the bark has grown.
      const closeRate = 1 / (pruning ? 1.8 : 2.5);
      for (const kn of knots) {
        if (time < kn.shutUntil) { kn.who = null; continue; }
        if (kn.shutUntil && time >= kn.shutUntil) { kn.shutUntil = 0; kn.k = 0.2; }
        kn.who = null;
        for (const f of [ctx.player, ctx.npc]) if (alive(f) && dist(f.x, f.y, kn.x, kn.y) < IN_R) kn.who = f;
        if (kn.who) {
          hidden.set(kn.who, time + 140);
          ctx.airborne(kn.who, 140);
          ctx.silence(kn.who, 140);
          kn.k += closeRate * dt;
          if (kn.k >= 1) seal(kn, kn.who);
        } else kn.k = Math.max(0, kn.k - dt / 3);
      }
      // The shears close along each band, end to end.
      for (const c of cuts) {
        if (time < c.fireAt) continue;
        const s = ((time - c.fireAt) / TRAVEL_MS) * L * 2;
        if (time - c.fireAt < 40) ctx.sfx('slash');
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || c.hit.has(f) || isHidden(f)) continue;
          if (Math.abs(across(c, f.x, f.y)) < BAND + 12 && along(c, f.x, f.y) < s) {
            c.hit.add(f);
            hurt(f, 16, f.x, f.y);
            ctx.sfx('hit-heavy');
          }
        }
      }
      cuts = cuts.filter((c) => time < c.fireAt + TRAVEL_MS + 200);
    },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      const mine = knots.find((kn) => kn.who === n);
      const danger = cuts.find((c) => now < c.fireAt + TRAVEL_MS && Math.abs(across(c, n.x, n.y)) < BAND + 30);
      if (mine && (mine.k > 0.6 || !danger)) return { x: tk.clampX(n.x + (n.x < W / 2 ? 90 : -90)), y: tk.clampY(n.y + (n.y < mid ? 80 : -80)) };
      if (danger) {
        const out = BAND + 40 - Math.abs(across(danger, n.x, n.y));
        const open = knots.filter((kn) => !kn.shutUntil && kn.k < 0.5 && kn.who !== p).sort((a, b) => dist(n.x, n.y, a.x, a.y) - dist(n.x, n.y, b.x, b.y))[0];
        if (open && dist(n.x, n.y, open.x, open.y) < out + 30) return { x: open.x, y: open.y };
        const s = across(danger, n.x, n.y) >= 0 ? 1 : -1;
        return { x: tk.clampX(n.x - Math.sin(danger.a) * s * out), y: tk.clampY(n.y + Math.cos(danger.a) * s * out) };
      }
      const held = knots.find((kn) => kn.who === p);
      if (held) return { x: held.x + (n.x < held.x ? -80 : 80), y: held.y };
      return null;
    },

    drawGround(g, time) {
      // The daubed bands: whitewash edges and brush-strokes, the stroke drying as the blades come.
      for (const c of cuts) {
        const k = clamp(1 - (c.fireAt - time) / 1300, 0, 1);
        const ux = Math.cos(c.a), uy = Math.sin(c.a), nx = -uy, ny = ux;
        const live = time >= c.fireAt;
        for (const s of [-1, 1]) {
          const ex = c.ox + nx * BAND * s, ey = c.oy + ny * BAND * s;
          g.lineStyle(live ? 4 : 2 + k * 2, live ? 0xd8262a : HW.whitewash, 0.5 + k * 0.4);
          g.lineBetween(ex, ey, ex + ux * L * 2, ey + uy * L * 2);
        }
        for (let d = 0; d < L * 2; d += 46) {
          const bx = c.ox + ux * d, by = c.oy + uy * d;
          g.lineStyle(6, HW.whitewash, 0.08 + k * 0.14);
          g.lineBetween(bx + nx * (BAND - 8), by + ny * (BAND - 8), bx - nx * (BAND - 8) + ux * 14, by - ny * (BAND - 8) + uy * 14);
        }
      }
      for (const kn of knots) drawKnot(g, kn, time, now);
    },

    drawAir(g, time) {
      for (const c of cuts) {
        if (time < c.fireAt) continue;
        const s = ((time - c.fireAt) / TRAVEL_MS) * L * 2;
        drawShears(g, c.ox + Math.cos(c.a) * s, c.oy + Math.sin(c.a) * s, c.a, clamp((time - c.fireAt) / TRAVEL_MS, 0, 1));
      }
    },

    drawHud(g, time) {
      const kn = knots.find((q) => q.who === ctx.player);
      const x = W / 2, y = H - 26;
      g.fillStyle(HW.barkDark, 0.85); g.fillRoundedRect(x - 90, y - 14, 180, 28, 8);
      // Next cut: five whitewash pips that empty as the shears are readied.
      const pips = 5, left = clamp((nextCut - time) / (pruning ? 4200 : 5200), 0, 1);
      for (let i = 0; i < pips; i++) { g.fillStyle(i < Math.ceil(left * pips) ? HW.whitewash : HW.markSoft, 1); g.fillCircle(x - 76 + i * 12, y, 4); }
      // Bark over your knot, if you are in one.
      g.fillStyle(HW.heartDeep, 1); g.fillRect(x - 10, y - 5, 90, 10);
      if (kn) { g.fillStyle(kn.k > 0.7 && Math.sin(time / 60) > 0 ? 0xd8262a : HW.barkMid, 1); g.fillRect(x - 10, y - 5, 90 * kn.k, 10); }
      g.lineStyle(1.5, pruning ? 0xd8262a : HW.barkMid, 0.9); g.strokeRoundedRect(x - 90, y - 14, 180, 28, 8);
    },

    destroy() { for (const kn of knots) kn.tgt?.remove(); cuts = []; },
  };

}

/** A knot-hole: dark hollow, heartwood-red lip, and two bark lips that creep over it as it closes. */
function drawKnot(g: G, kn: Knot, time: number, now: number): void {
  const { x, y } = kn;
  const shut = now < kn.shutUntil;
  shadow(g, x, y + 4, KNOT_R * 2.4, 22, 0.22);
  g.fillStyle(HW.barkShade, 1); g.fillEllipse(x, y, KNOT_R * 2.5, KNOT_R * 1.6);
  for (let i = 0; i < 4; i++) lenticel(g, x - 34 + i * 22, y - KNOT_R * 0.9 + (i % 2) * 4, 18, 0.8);
  g.fillStyle(HW.heartLit, 1); g.fillEllipse(x, y, KNOT_R * 2, KNOT_R * 1.28);
  g.fillStyle(HW.heart, 1); g.fillEllipse(x, y + 1, KNOT_R * 1.8, KNOT_R * 1.12);
  g.fillStyle(0x140805, 1); g.fillEllipse(x, y + 3, KNOT_R * 1.52, KNOT_R * 0.92);
  if (kn.who) glow(g, x, y, KNOT_R, HW.amberLit, 0.04, 3);
  // The bark lips, growing in from both sides; a scar seam once shut.
  const k = shut ? 1 : kn.k;
  if (k > 0) {
    const w = KNOT_R * 0.8 * k;
    for (const s of [-1, 1]) {
      const ex = x + s * (KNOT_R * 0.8 - w / 2);
      g.fillStyle(HW.bark, 1); g.fillEllipse(ex, y + 2, w + 4, KNOT_R * 1.0);
      g.fillStyle(HW.barkLit, 0.6); g.fillEllipse(ex - s * 2, y - 4, w * 0.6, KNOT_R * 0.5);
      g.lineStyle(1.2, HW.barkShade, 0.9);
      for (let r = 0; r < 3; r++) g.lineBetween(ex - w / 2 + r * 4 * s, y - 12 + r * 6, ex + w / 2 - r * 3 * s, y - 10 + r * 6);
    }
  }
  if (shut) {
    g.lineStyle(2.5, HW.markSoft, 1); g.lineBetween(x, y - KNOT_R * 0.5, x, y + KNOT_R * 0.55);
    birchEye(g, x, y - KNOT_R * 0.95, 26, 0.2 + 0.1 * Math.sin(time / 300));
  }
  if (kn.who && k > 0.7 && Math.sin(time / 60) > 0) { g.lineStyle(2, 0xd8262a, 0.8); g.strokeEllipse(x, y, KNOT_R * 2.1, KNOT_R * 1.36); }
}

/** The pruners' great shears: two long blades on a bolt, closing as they travel the band. */
function drawShears(g: G, x: number, y: number, a: number, k: number): void {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const open = (1 - k) * 0.5 + 0.05;
  const P = (u: number, n: number) => ({ x: x + ux * u + nx * n, y: y + uy * u + ny * n });
  for (const s of [-1, 1]) {
    const tip = P(110 * Math.cos(open), s * 110 * Math.sin(open));
    const base1 = P(0, s * 7), base2 = P(0, -s * 2);
    g.fillStyle(0xc8d0d4, 1); g.fillTriangle(base1.x, base1.y, base2.x, base2.y, tip.x, tip.y);
    g.lineStyle(1.2, 0xffffff, 0.7); g.lineBetween(base2.x, base2.y, tip.x, tip.y);
    const h0 = P(-10, s * 4), h1 = P(-70, s * (18 + open * 50));
    g.lineStyle(8, HW.plankDark, 1); g.lineBetween(h0.x, h0.y, h1.x, h1.y);
    g.lineStyle(3, HW.plankLit, 0.7); g.lineBetween(h0.x, h0.y, h1.x, h1.y);
  }
  g.fillStyle(HW.iron, 1); g.fillCircle(x, y, 7);
  g.fillStyle(HW.ironLit, 1); g.fillCircle(x - 2, y - 2, 2.5);
}

export const FALLEN_BARK_CLOSES: GimmickDef = {
  id: ID,
  rules: 'The shears cut daubed bands. Hide in a knot-hole — but it grows shut and seals you in. Strike a knot: empty, it splits; occupied, it closes faster.',
  make,
};
