import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { glint, noonShadow, sunburst } from '../art';
import {
  BEAM, BEAM_HOT, BRASS, BRASS_DARK, BRASS_LIT, GOLD, GOLD_DARK, GOLD_LIT, IRON, IRON_DARK, MARBLE, MARBLE_DARK,
  MARBLE_LIT, SUN,
} from '../palette';
import { alive, clamp, dist, segDist, stepDt, wrapAngle } from '../util';

/**
 * All Light Bends — Preceptor Eudo Lantry, Prince Lumen's tutor.
 *
 * Lantry taught the boy his letters, his sums and the one lesson the Noon is built on: that light
 * is not free, it falls toward whatever is heaviest, and nothing on Solmara is heavier than the
 * crown. In the waking world it was a parable. In the star's telling it is simply true of him.
 *
 * Eight gilt sun-gates stand round the rim of the yard, and they open in turn, clockwise — the
 * next one glows. Each throws a lance of noon at where you stand; but the lance bends toward the
 * Preceptor as it passes him, harder the closer it comes, and its path bends live as he walks
 * until, halfway through the warning, it locks white and fires. Read the bend, and step off it.
 *
 * The exploit is his weight. A lance that passes close enough falls into him and burns him. Stand
 * so the next gate, the Preceptor and you are in a line. Halfway down he sets his lesson-weight —
 * a brass sphere — in the middle of the yard, which bends the light too, and the gates open in pairs.
 */

const ID = fallenId('noon', 'bend');
const STEP = 12;
const MAX_STEPS = 150;
const G_HIM = 26;
const G_WEIGHT = 20;
const CAPTURE_R = 26;
const HALF_W = 18;
const WARN_MS = 1150;
const FIRE_MS = 260;
const EVERY_MS = 1550;
const EVERY_LATE_MS = 1250;
const DMG = 14;
const DMG_FALL = 24;
const DMG_NPC = 14;

interface Lance { o: Pt; aim: Pt; pts: Pt[]; fell: 'him' | 'weight' | null; at: number; warn: number; locked: boolean; fired: number }
interface Mass { x: number; y: number; g: number; who: 'him' | 'weight' }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const MID = (top + H) / 2;
  const gates: Pt[] = [
    { x: 300, y: top + 14 }, { x: W - 300, y: top + 14 }, { x: W - 26, y: top + 130 }, { x: W - 26, y: H - 100 },
    { x: W - 300, y: H - 14 }, { x: 300, y: H - 14 }, { x: 26, y: H - 100 }, { x: 26, y: top + 130 },
  ];
  const weight: Pt = { x: W / 2, y: MID + 10 };
  const lances: Lance[] = [];
  let next = 0;
  let nextAt = 0;
  let late = false;
  let started = false;

  const masses = (): Mass[] => {
    const m: Mass[] = [];
    if (alive(npc)) m.push({ x: npc.x, y: npc.y - 14, g: G_HIM, who: 'him' });
    if (late) m.push({ x: weight.x, y: weight.y - 18, g: G_WEIGHT, who: 'weight' });
    return m;
  };

  /** The path of noon from a gate toward an aim point, bent toward every mass it passes. */
  function trace(o: Pt, aim: Pt, ms: Mass[]): { pts: Pt[]; fell: Lance['fell'] } {
    let x = o.x, y = o.y, dir = Math.atan2(aim.y - o.y, aim.x - o.x);
    const pts: Pt[] = [{ x, y }];
    for (let i = 0; i < MAX_STEPS; i++) {
      for (const m of ms) {
        const d = dist(x, y, m.x, m.y);
        if (d < CAPTURE_R) { pts.push({ x: m.x, y: m.y }); return { pts, fell: m.who }; }
        const to = Math.atan2(m.y - y, m.x - x);
        const diff = wrapAngle(to - dir);
        // Bend ∝ 1/d²: a lance passing at 100 px turns ~45° in all, at 200 px ~20°.
        const turn = Math.min(0.3, (m.g * STEP) / (d * d));
        dir += Math.abs(diff) < turn ? diff : Math.sign(diff) * turn;
      }
      x += Math.cos(dir) * STEP; y += Math.sin(dir) * STEP;
      if (i % 2 === 1) pts.push({ x, y });
      if (x < -20 || x > W + 20 || y < top - 20 || y > H + 20) break;
    }
    pts.push({ x, y });
    return { pts, fell: null };
  }

  const pathDist = (pts: Pt[], x: number, y: number): number => {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) best = Math.min(best, segDist(x, y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y));
    return best;
  };

  function throwLance(time: number): void {
    const o = gates[next];
    next = (next + 1) % gates.length;
    const aim: Pt = { x: player.x, y: player.y - 10 };
    const tr = trace(o, aim, masses());
    lances.push({ o, aim, pts: tr.pts, fell: tr.fell, at: time, warn: tk.warn(WARN_MS), locked: false, fired: -1 });
    ctx.sfx('beam-charge');
  }

  function fire(l: Lance, time: number): void {
    l.fired = time;
    ctx.sfx('light-beam');
    if (alive(player) && pathDist(l.pts, player.x, player.y - 10) < HALF_W + 12) tk.hitPlayer(DMG, player.x, player.y);
    if (!alive(npc)) return;
    const end = l.pts[l.pts.length - 1];
    if (l.fell === 'him' && dist(npc.x, npc.y - 14, end.x, end.y) < CAPTURE_R + 20) {
      ctx.hit(npc, DMG_FALL, npc.x, npc.y);
      ctx.flash(npc.x, npc.y - 20, BEAM_HOT);
      ctx.sfx('gravity-slam');
    } else if (pathDist(l.pts, npc.x, npc.y - 10) < HALF_W + 12) ctx.hit(npc, DMG_NPC, npc.x, npc.y);
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextAt = time + 1500; }
      if (!late && npc.hp < npc.maxHp * 0.5) { late = true; ctx.banner('THE LESSON-WEIGHT IS SET', '#eccd82'); ctx.sfx('anvil'); }
      if (time >= nextAt) {
        throwLance(time);
        if (late) throwLance(time + 1);
        nextAt = time + (late ? EVERY_LATE_MS : EVERY_MS);
      }
      for (let i = lances.length - 1; i >= 0; i--) {
        const l = lances[i];
        const el = time - l.at;
        if (!l.locked) {
          const tr = trace(l.o, l.aim, masses());
          l.pts = tr.pts; l.fell = tr.fell;
          if (el >= l.warn * 0.5) { l.locked = true; ctx.sfx('crystal-chime'); }
        }
        if (l.fired < 0 && el >= l.warn) fire(l, time);
        if (l.fired >= 0 && time - l.fired > FIRE_MS) lances.splice(i, 1);
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Keep off every drawn path and off the straight line from the next gate to you.
      const g0 = gates[next];
      let best: Pt | null = null, bs = -Infinity;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const x = tk.clampX(player.x + Math.cos(a) * 250, 60), y = tk.clampY(player.y + Math.sin(a) * 210, 50);
        let s = -dist(x, y, npc.x, npc.y) * 0.3;
        for (const l of lances) if (l.fired < 0 && pathDist(l.pts, x, y) < 90) s -= 300;
        if (segDist(x, y, g0.x, g0.y, player.x, player.y) < 110) s -= 220;
        if (late && dist(x, y, weight.x, weight.y) < 70) s -= 80;
        if (s > bs) { bs = s; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      // The bend of the square round him: rings of paving light pulled in toward his feet.
      if (alive(npc)) drawWell(g, npc.x, npc.y, 1, time);
      if (late) drawWell(g, weight.x, weight.y, 0.75, time);
      for (const [i, p] of gates.entries()) drawGate(g, p, i === next, clamp(1 - (nextAt - tk.now) / EVERY_MS, 0, 1), W, top, H);
      for (const l of lances) {
        const el = tk.now - l.at;
        if (l.fired >= 0) {
          const k = clamp((tk.now - l.fired) / FIRE_MS, 0, 1);
          g.lineStyle(HALF_W * 2 + 10, BEAM, 0.4 * (1 - k)); g.strokePoints(l.pts, false);
          g.lineStyle(HALF_W, BEAM_HOT, 0.9 * (1 - k)); g.strokePoints(l.pts, false);
          g.lineStyle(4, 0xffffff, 1 - k); g.strokePoints(l.pts, false);
          continue;
        }
        const k = clamp(el / l.warn, 0, 1);
        if (!l.locked) {
          // Live: a wavering thread of gold, dashed, bending as he walks.
          g.lineStyle(HALF_W * 2, SUN, 0.05 + k * 0.08); g.strokePoints(l.pts, false);
          for (let j = 1; j < l.pts.length; j += 2) {
            const p0 = l.pts[j - 1], p1 = l.pts[j];
            g.lineStyle(2, GOLD_LIT, 0.4 + k * 0.4); g.lineBetween(p0.x, p0.y, p1.x, p1.y);
          }
        } else {
          g.lineStyle(HALF_W * 2, SUN, 0.14 + k * 0.14); g.strokePoints(l.pts, false);
          g.lineStyle(2, 0xffffff, 0.6 + k * 0.4); g.strokePoints(l.pts, false);
        }
        if (l.fell) {
          const e = l.pts[l.pts.length - 1];
          for (let r = 0; r < 3; r++) {
            const rr = 30 - ((time / 12 + r * 10) % 30);
            g.lineStyle(2, l.fell === 'him' ? 0xffb35a : BRASS_LIT, 0.3 + (1 - rr / 30) * 0.5); g.strokeCircle(e.x, e.y, rr + 4);
          }
        }
      }
    },

    drawAir(g, time) {
      if (late) drawWeight(g, weight.x, weight.y, time);
      for (const l of lances) {
        if (l.fired >= 0) continue;
        const k = clamp((tk.now - l.at) / l.warn, 0, 1);
        glint(g, l.o.x, l.o.y - 10, 10 + k * 14 + Math.sin(time / 60) * 2, 0.9);
      }
    },

    drawHud(g) {
      // A compass of the eight gates: the next one lit, its fuse round it.
      const cx = 52, cy = top + 30, r = 18;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(cx - 34, cy - 26, 68, 52, 8);
      g.lineStyle(1.5, GOLD_DARK, 1); g.strokeCircle(cx, cy, r);
      gates.forEach((p, i) => {
        const a = Math.atan2(p.y - MID, p.x - W / 2);
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.8;
        g.fillStyle(i === next ? GOLD_LIT : GOLD_DARK, 1); g.fillCircle(x, y, i === next ? 4 : 2.5);
      });
      const k = clamp(1 - (nextAt - tk.now) / (late ? EVERY_LATE_MS : EVERY_MS), 0, 1);
      g.lineStyle(2, 0xffffff, 0.9); g.beginPath(); g.arc(cx, cy, 7, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      g.fillStyle(0xffb35a, 1); g.fillCircle(cx, cy, 2.5);
    },
  };
}

/** The paving bending toward a mass: rings of marble-light squeezed in, and spiralling seams. */
function drawWell(g: G, x: number, y: number, s: number, time: number): void {
  for (let i = 0; i < 4; i++) {
    const r = (40 + i * 34) * s;
    const squeeze = 1 - 0.08 * Math.sin(time / 500 + i);
    g.lineStyle(1.5, i % 2 ? GOLD_LIT : MARBLE_LIT, 0.16 - i * 0.03); g.strokeEllipse(x, y, r * 2 * squeeze, r * 1.1 * squeeze);
  }
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2 + time / 4000;
    const pts: Pt[] = [];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8, r = (150 - t * 120) * s, a = a0 + t * 1.2;
      pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.55 });
    }
    g.lineStyle(1, GOLD, 0.14); g.strokePoints(pts, false);
  }
}

/** A sun-gate on the rim: a marble plinth, a standing gilt ring, a sunburst at its heart. */
function drawGate(g: G, p: Pt, lit_: boolean, k: number, W: number, top: number, H: number): void {
  const inward = Math.atan2((top + H) / 2 - p.y, W / 2 - p.x);
  const x = p.x, y = p.y + 8;
  noonShadow(g, x, y, 36, 0.25);
  g.fillStyle(MARBLE_DARK, 1); g.fillRect(x - 13, y - 10, 26, 10);
  g.fillStyle(MARBLE, 1); g.fillRect(x - 13, y - 10, 26, 3);
  g.fillStyle(GOLD_DARK, 1); g.fillEllipse(x, y - 26, 30, 30);
  g.fillStyle(MARBLE_LIT, 1); g.fillEllipse(x, y - 26, 20, 20);
  sunburst(g, x, y - 26, 9, 10, 1, lit_ ? GOLD_LIT : GOLD);
  g.lineStyle(2, lit_ ? 0xffffff : GOLD, 1); g.strokeEllipse(x, y - 26, 30, 30);
  // A gilt pointer showing which way it throws.
  g.fillStyle(GOLD, 1);
  g.fillTriangle(x + Math.cos(inward) * 22, y - 26 + Math.sin(inward) * 22, x + Math.cos(inward + 0.4) * 15, y - 26 + Math.sin(inward + 0.4) * 15,
    x + Math.cos(inward - 0.4) * 15, y - 26 + Math.sin(inward - 0.4) * 15);
  if (lit_) {
    glow(g, x, y - 26, 26 + k * 16, SUN, 0.06 + k * 0.08, 4);
    g.lineStyle(2.5, 0xffffff, 0.9); g.beginPath(); g.arc(x, y - 26, 19, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
  }
}

/** The lesson-weight: a brass sphere engraved with meridians, in an iron cradle. */
function drawWeight(g: G, x: number, y: number, time: number): void {
  noonShadow(g, x, y, 56, 0.32);
  for (const fx of [-18, 18]) { g.lineStyle(5, IRON_DARK, 1); g.lineBetween(x + fx, y, x + fx * 0.6, y - 16); g.lineStyle(2, IRON, 1); g.lineBetween(x + fx, y, x + fx * 0.6, y - 16); }
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x, y - 14, 40, 10);
  const cy = y - 34;
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, cy, 24);
  g.fillStyle(BRASS, 1); g.fillCircle(x - 2, cy - 2, 22);
  g.fillStyle(lit(BRASS_LIT, 0.3), 0.8); g.fillEllipse(x - 9, cy - 10, 14, 8);
  for (let i = 0; i < 3; i++) {
    const w = 44 * Math.abs(Math.cos(time / 1600 + i * 1.05));
    g.lineStyle(1, BRASS_DARK, 0.8); g.strokeEllipse(x - 2, cy - 2, Math.max(2, w), 44);
  }
  g.lineStyle(1, BRASS_DARK, 0.8); g.strokeEllipse(x - 2, cy - 2, 44, 12);
  glint(g, x - 10, cy - 12, 8, 0.8);
}

export const FALLEN_BEND: GimmickDef = {
  id: ID,
  rules: 'The lit gate throws a lance at you that bends toward the Preceptor as it passes; close enough, it falls into him. Line up the gate, him and you.',
  make,
};
