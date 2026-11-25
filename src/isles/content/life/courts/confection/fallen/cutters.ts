import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { CHERRY, CRUMB, CRUMB_DARK, GINGER_DARK, GINGER_PALE, ICING, IRON, SUGAR, dist, segDist } from '../art';
import { alive, clamp } from './util';

/**
 * Biscuit or Dough — Tinsmith Wenna Gauge, who made every biscuit-cutter in the court, and in the
 * King's telling made the patterns the town had to fit: cut to the Prince's shape, or rolled flat.
 *
 * The floor is rolled dough. Tin cutters — a star, a heart, a little gingerbread man — hover over
 * it, their shadows marked on the dough, then stamp down: the cutting edge hurts whoever stands on
 * the line. What lies inside a stamped shape is cut out, a biscuit. Then the great rolling pin
 * comes across the floor from one side to the other, and everyone *not* inside a cut-out is rolled
 * flat — hurt and held a moment. Strike a hovering cutter and it stamps at once, wherever it is;
 * catch Wenna on its edge, or stamp it short of where she was running.
 *
 * Halfway the pattern tightens: only two cutters, the pin rolls out *and back*, and it is one
 * biscuit to a cutter — two fighters in the same shape break it, and both go under the pin. Get
 * into Wenna's biscuit with her. The bot steps off edges while the cutters hover and runs for the
 * nearest shape it can have to itself.
 */

const ID = fallenId('confection', 'cutters');
const HOVER_MS = 1500;
const PIN_DELAY_MS = 650;
const PIN_SPEED = 230;
const PIN_HALF = 26;
const REST_MS = 2200;
const EDGE = 13;
const EDGE_PLAYER = 16;
const EDGE_NPC = 30;
const ROLL_PLAYER = 22;
const ROLL_NPC = 46;
const SCALE = 1;

type Kind = 'star' | 'heart' | 'man';
type Stage = 'rest' | 'hover' | 'pin';

/** A cutter: its outline (world points), where it hovers, whether it has stamped. */
interface Cutter { kind: Kind; x: number; y: number; pts: Pt[]; stamped: boolean; stampedAt: number; broken: boolean; target: StrikeTarget | null }

/** Unit outlines (≈ radius 1), traced clockwise. */
function outline(kind: Kind): Pt[] {
  const out: Pt[] = [];
  if (kind === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.55 : 1.05;
      out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
  } else if (kind === 'heart') {
    for (let i = 0; i < 24; i++) {
      const t = (i / 24) * Math.PI * 2;
      out.push({ x: (16 * Math.pow(Math.sin(t), 3)) / 17, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 });
    }
  } else {
    // Head, arms out, legs apart: a gingerbread man's silhouette.
    const man: [number, number][] = [
      [0, -1.05], [0.3, -0.95], [0.38, -0.68], [0.25, -0.5], [0.95, -0.42], [0.98, -0.18], [0.35, -0.12],
      [0.38, 0.3], [0.72, 0.95], [0.4, 1.05], [0, 0.5], [-0.4, 1.05], [-0.72, 0.95], [-0.38, 0.3],
      [-0.35, -0.12], [-0.98, -0.18], [-0.95, -0.42], [-0.25, -0.5], [-0.38, -0.68], [-0.3, -0.95],
    ];
    for (const [x, y] of man) out.push({ x, y });
  }
  return out;
}

function inside(pts: Pt[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

function edgeDist(pts: Pt[], x: number, y: number): number {
  let d = Infinity;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; d = Math.min(d, segDist(x, y, a.x, a.y, b.x, b.y)); }
  return d;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  let stage: Stage = 'rest';
  let stageAt = 0;
  let cutters: Cutter[] = [];
  let turned = false;
  let fromWest = true;
  let pinX = -100;
  let pinDir = 1;
  let pinLeg = 0;
  const rolled = new Set<string>();

  const place = (kind: Kind, x: number, y: number): Cutter => {
    const size = (kind === 'man' ? 78 : 74) * SCALE;
    const pts = outline(kind).map((p) => ({ x: x + p.x * size, y: y + p.y * size }));
    return { kind, x, y, pts, stamped: false, stampedAt: 0, broken: false, target: null };
  };
  const removeTargets = (): void => { for (const c of cutters) { c.target?.remove(); c.target = null; } };

  /** Spread the cutters out: one near the player, the rest across the floor. */
  const lay = (time: number): void => {
    removeTargets();
    const kinds: Kind[] = turned ? (rng() < 0.5 ? ['star', 'man'] : ['heart', 'man']) : ['star', 'heart', 'man'];
    const spots: Pt[] = [];
    for (const k of kinds) {
      let best: Pt = { x: W / 2, y: (top + H) / 2 }, bs = -Infinity;
      for (let i = 0; i < 16; i++) {
        const p = { x: 120 + rng() * (W - 240), y: top + 100 + rng() * (H - top - 190) };
        const sep = spots.reduce((m, s) => Math.min(m, dist(p.x, p.y, s.x, s.y)), 999);
        const near = spots.length === 0 ? -Math.abs(dist(p.x, p.y, player.x, player.y) - 170) : 0;
        const s = Math.min(sep, 320) + near;
        if (s > bs) { bs = s; best = p; }
      }
      spots.push(best);
      cutters.push(place(k, best.x, best.y));
    }
    for (const c of cutters) {
      c.target = ctx.target({ x: c.x, y: c.y - 60, r: 24, onStruck: (by) => { if (by === 'player' && stage === 'hover' && !c.stamped) stamp(c, tk.now, true); } });
    }
    stage = 'hover'; stageAt = time;
    ctx.sfx('gear-turn');
  };

  const stamp = (c: Cutter, time: number, early: boolean): void => {
    c.stamped = true; c.stampedAt = time;
    c.target?.remove(); c.target = null;
    ctx.sfx('anvil');
    for (const f of [player, npc]) {
      if (!alive(f) || edgeDist(c.pts, f.x, f.y) > EDGE + 8) continue;
      if (f === player) tk.hitPlayer(EDGE_PLAYER, f.x, f.y);
      else { ctx.hit(npc, EDGE_NPC, f.x, f.y); ctx.float(f.x, f.y - 60, early ? 'CUT SHORT' : 'ON THE EDGE', '#f0e0c0'); }
    }
  };

  const shelter = (f: Fighter): Cutter | undefined => cutters.find((c) => c.stamped && !c.broken && inside(c.pts, f.x, f.y));

  const roll = (time: number): void => {
    stage = 'pin'; stageAt = time;
    pinDir = fromWest ? 1 : -1;
    pinX = fromWest ? -40 : W + 40;
    pinLeg = 0;
    fromWest = !fromWest;
    rolled.clear();
    ctx.sfx('quake');
  };

  return {
    update(time, dt) {
      if (!stageAt) stageAt = time;
      if (!turned && npc.hp < npc.maxHp * 0.5) {
        turned = true;
        ctx.banner('ONE BISCUIT TO A CUTTER — AND THE PIN COMES BACK', '#f0e0c0');
        ctx.sfx('boss-phase');
      }
      const t = time - stageAt;
      if (stage === 'rest' && t >= REST_MS) { cutters = []; lay(time); }
      else if (stage === 'hover') {
        const due = tk.warn(HOVER_MS);
        if (t >= due) for (const c of cutters) if (!c.stamped) stamp(c, time, false);
        if (t >= due + tk.warn(PIN_DELAY_MS)) roll(time);
      } else if (stage === 'pin') {
        // Two in one biscuit break it (after the turn).
        if (turned) for (const c of cutters) {
          if (c.broken || !c.stamped) continue;
          if (alive(player) && alive(npc) && inside(c.pts, player.x, player.y) && inside(c.pts, npc.x, npc.y)) {
            c.broken = true; ctx.sfx('crystal-shatter'); ctx.float(c.x, c.y - 40, 'BROKEN BISCUIT', '#f0e0c0');
          }
        }
        pinX += pinDir * PIN_SPEED * dt;
        for (const f of [player, npc]) {
          const key = `${f === player ? 'p' : 'n'}${pinLeg}`;
          if (!alive(f) || rolled.has(key) || Math.abs(f.x - pinX) > PIN_HALF + 14 || shelter(f)) continue;
          rolled.add(key);
          ctx.root(f, 500);
          if (f === player) tk.hitPlayer(ROLL_PLAYER, f.x, f.y);
          else { ctx.hit(npc, ROLL_NPC, f.x, f.y); ctx.float(f.x, f.y - 60, 'ROLLED FLAT', '#f0e0c0'); }
          ctx.sfx('stone-slam');
        }
        const off = pinDir > 0 ? pinX > W + 40 : pinX < -40;
        if (off) {
          if (turned && pinLeg === 0) { pinLeg = 1; pinDir = -pinDir; ctx.sfx('quake'); }
          else { removeTargets(); stage = 'rest'; stageAt = time; }
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || stage === 'rest') return null;
      const mine = cutters.filter((c) => !c.broken && !(turned && inside(c.pts, player.x, player.y)));
      if (!mine.length) return null;
      mine.sort((a, b) => dist(npc.x, npc.y, a.x, a.y) - dist(npc.x, npc.y, b.x, b.y));
      const c = mine[0];
      // While it hovers, keep well inside — never on the line.
      return { x: tk.clampX(c.x), y: tk.clampY(c.y + (c.kind === 'man' ? -10 : 6)) };
    },

    drawGround(g, time) {
      drawDough(g, W, H, top);
      for (const c of cutters) {
        if (!c.stamped) {
          const k = clamp((time - stageAt) / tk.warn(HOVER_MS), 0, 1);
          g.fillStyle(0x000000, 0.08 + k * 0.14); g.fillPoints(c.pts, true);
          dashed(g, c.pts, 2, CHERRY, 0.35 + k * 0.5, time);
        } else drawBiscuit(g, c, time);
      }
      if (stage === 'pin') {
        // The flattened sheet behind the pin.
        const x0 = pinDir > 0 ? 0 : pinX, x1 = pinDir > 0 ? pinX : W;
        g.fillStyle(lit(CRUMB, 0.2), 0.25); g.fillRect(Math.max(0, x0), top, Math.max(0, Math.min(W, x1) - Math.max(0, x0)), H - top);
      }
    },

    drawAir(g, time) {
      for (const c of cutters) {
        if (c.stamped && time - c.stampedAt > 380) continue;
        const k = c.stamped ? 1 - (time - c.stampedAt) / 380 : 1;
        const hover = c.stamped ? 0 : 44 + Math.sin(time / 260 + c.x) * 4;
        drawCutter(g, c.pts, c.x, c.y, hover, k);
      }
      if (stage === 'pin') drawPin(g, pinX, top, H, time, pinDir);
    },

    drawHud(g) {
      const x = W / 2, y = top + 18;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 66, y - 13, 132, 26, 6);
      cutters.forEach((c, i) => {
        const cx = x - 40 + i * 28;
        const pts = outline(c.kind).map((p) => ({ x: cx + p.x * 9, y: y + p.y * 9 }));
        g.fillStyle(c.broken ? 0x5a4a3a : c.stamped ? GINGER_PALE : 0x3a3036, 1); g.fillPoints(pts, true);
        g.lineStyle(1.5, c.broken ? CHERRY : 0xc8ccd4, 1); g.strokePoints(pts, true);
      });
      // The pin: where it is across the floor.
      g.fillStyle(0x3a3036, 1); g.fillRect(x + 30, y - 3, 30, 6);
      if (stage === 'pin') { g.fillStyle(GINGER_PALE, 1); g.fillRect(x + 30 + clamp(pinX / W, 0, 1) * 26, y - 7, 4, 14); }
    },

    destroy() { removeTargets(); },
  };
}

/** Rolled dough over the whole floor: flour dust, a few air-bubbles, the pin's old ridges. */
function drawDough(g: G, W: number, H: number, top: number): void {
  g.fillStyle(CRUMB, 0.18); g.fillRect(0, top, W, H - top);
  for (let i = 0; i < 90; i++) {
    const x = (i * 211) % W, y = top + ((i * 97) % (H - top));
    g.fillStyle(SUGAR, 0.35); g.fillCircle(x, y, 1 + (i % 3) * 0.6);
  }
  for (let i = 0; i < 12; i++) { const x = ((i * 389) % (W - 80)) + 40, y = top + 30 + ((i * 151) % (H - top - 60)); g.lineStyle(1, CRUMB_DARK, 0.25); g.strokeCircle(x, y, 4 + (i % 3) * 2); }
}

/** A marching dashed outline — the hovering cutter's shadow on the dough. */
function dashed(g: G, pts: Pt[], w: number, color: number, a: number, time: number): void {
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const n = Math.max(1, Math.floor(len / 12));
    for (let j = 0; j < n; j++) {
      if ((j + Math.floor(time / 120)) % 2) continue;
      const t0 = j / n, t1 = (j + 0.6) / n;
      g.lineStyle(w, color, a);
      g.lineBetween(p.x + (q.x - p.x) * t0, p.y + (q.y - p.y) * t0, p.x + (q.x - p.x) * t1, p.y + (q.y - p.y) * t1);
    }
  }
}

/** A cut-out: the biscuit standing proud of the dough, baked edge, icing dots; cracked when broken. */
function drawBiscuit(g: G, c: Cutter, time: number): void {
  const k = clamp((time - c.stampedAt) / 300, 0, 1);
  const off = c.pts.map((p) => ({ x: p.x, y: p.y + 4 }));
  g.fillStyle(GINGER_DARK, 0.8); g.fillPoints(off, true);
  g.fillStyle(c.broken ? dim(GINGER_PALE, 0.3) : GINGER_PALE, 0.55 + 0.4 * k); g.fillPoints(c.pts, true);
  g.lineStyle(3, GINGER_DARK, 1); g.strokePoints(c.pts, true);
  g.lineStyle(1.5, ICING, 0.8);
  const inner = c.pts.map((p) => ({ x: c.x + (p.x - c.x) * 0.84, y: c.y + (p.y - c.y) * 0.84 }));
  g.strokePoints(inner, true);
  if (c.kind === 'man') {
    g.fillStyle(CHERRY, 1); g.fillCircle(c.x, c.y - 10, 4); g.fillCircle(c.x, c.y + 12, 4);
    g.fillStyle(ICING, 1); g.fillCircle(c.x - 9, c.y - 62, 3); g.fillCircle(c.x + 9, c.y - 62, 3);
  } else if (c.kind === 'heart') {
    g.fillStyle(CHERRY, 0.8); g.fillCircle(c.x, c.y, 8);
  } else {
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 1.2566; g.fillStyle(ICING, 1); g.fillCircle(c.x + Math.cos(a) * 34, c.y + Math.sin(a) * 34, 3); }
  }
  if (c.broken) {
    g.lineStyle(3, GINGER_DARK, 1);
    g.lineBetween(c.x - 50, c.y - 20, c.x - 6, c.y + 4); g.lineBetween(c.x - 6, c.y + 4, c.x + 20, c.y - 12); g.lineBetween(c.x + 20, c.y - 12, c.x + 56, c.y + 26);
  }
}

/** The tin cutter in the air: a folded tin strip with a rolled top lip and a bracing handle. */
function drawCutter(g: G, pts: Pt[], cx: number, cy: number, hover: number, a: number): void {
  const up = pts.map((p) => ({ x: p.x, y: p.y - hover }));
  if (hover > 0) shadow(g, cx, cy + 4, 90, 24, 0.15 * a);
  g.lineStyle(9, dim(0xc8ccd4, 0.45), a); g.strokePoints(up.map((p) => ({ x: p.x, y: p.y + 4 })), true);
  g.lineStyle(7, 0xc8ccd4, a); g.strokePoints(up, true);
  g.lineStyle(2, 0xffffff, 0.7 * a); g.strokePoints(up.map((p) => ({ x: p.x, y: p.y - 2 })), true);
  // The handle: a strap of tin riveted across the top.
  const hx0 = cx - 46, hx1 = cx + 46, hy = cy - hover - 12;
  g.lineStyle(6, IRON, a); g.lineBetween(hx0, hy + 8, cx - 30, hy - 10); g.lineBetween(cx - 30, hy - 10, cx + 30, hy - 10); g.lineBetween(cx + 30, hy - 10, hx1, hy + 8);
  g.lineStyle(2, 0x8a8690, a); g.lineBetween(cx - 30, hy - 12, cx + 30, hy - 12);
  g.fillStyle(0x8a8690, a); g.fillCircle(hx0, hy + 8, 3); g.fillCircle(hx1, hy + 8, 3);
}

/** The great rolling pin, end-on down the whole floor: grained wood, turned handles, flour puffs. */
function drawPin(g: G, x: number, top: number, H: number, time: number, dir: number): void {
  const y0 = top + 14, y1 = H - 14;
  g.fillStyle(0x000000, 0.22); g.fillRect(x - PIN_HALF + 6 * dir, y0, PIN_HALF * 2, y1 - y0);
  g.fillStyle(0x9a6a3a, 1); g.fillRoundedRect(x - PIN_HALF, y0, PIN_HALF * 2, y1 - y0, 10);
  g.fillStyle(lit(0x9a6a3a, 0.25), 1); g.fillRect(x - PIN_HALF + 5, y0 + 6, 8, y1 - y0 - 12);
  for (let i = 0; i < 10; i++) {
    const ph = ((time / 1000) * 3 * dir + i / 10) % 1;
    const gx = x - PIN_HALF + ((ph + 1) % 1) * PIN_HALF * 2;
    g.lineStyle(1, dim(0x9a6a3a, 0.35), 0.8); g.lineBetween(gx, y0 + 4, gx, y1 - 4);
  }
  for (const hy of [y0 - 2, y1 + 2]) { g.fillStyle(GINGER_DARK, 1); g.fillRoundedRect(x - 9, hy - 10, 18, 20, 6); }
  for (let i = 0; i < 8; i++) {
    const py = y0 + ((i * 71 + time / 4) % (y1 - y0));
    g.fillStyle(SUGAR, 0.45); g.fillCircle(x - dir * (PIN_HALF + 8 + (i % 3) * 5), py, 3 + (i % 2) * 2);
  }
}

export const FALLEN_CUTTERS: GimmickDef = {
  id: ID,
  rules: 'Tin cutters stamp shapes into the dough: the edge cuts, then the rolling pin flattens everyone outside a cut-out. Strike a cutter to stamp it now.',
  make,
};
