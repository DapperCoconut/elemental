import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRICK, CLOTH_BLUE, CLOTH_PLUM, CLOTH_RED, FOE_C, GILT, INK, INK_SOFT, MEADOW_DARK, MINE_C, PAGE, PARCH,
  PARCH_DARK, PLASTER, THATCH, TIMBER, clamp, frameClock, inkCircle, inkRect, inked, scribble,
} from '../util';
import { alive, pagePlate } from './common';

/**
 * Pressed Flat — Ottoline Crease, binder of the Licensed Editions, who in the King's telling bound
 * the town's own stories shut and pressed the people in them flat between the pages.
 *
 * The whole yard is the open book she binds: a left page and a right page either side of the
 * gutter down the middle. Every few seconds a page turns. First its corner dog-ears up, then the
 * whole leaf lifts off one side and swings over the spine and slams down on the other — and
 * whoever is on the page it lands on is pressed (hurt and stunned). Stand on the page it leaves.
 * The page that turns is announced by the bookmark ribbon at the top of the spine, which leans
 * toward the side the next leaf will land on.
 *
 * Each new spread springs two pop-ups — a tower, a tree, a cottage — that stand as paper cover
 * and stop shots until the next turn folds them flat.
 *
 * The exploit is the ribbon: strike it and the binder loses her place — the next turn goes the
 * other way (struck while a corner is already curling, that corner lays down and the opposite one
 * curls instead). Read where she is standing and turn the page onto her. At half health she riffles:
 * every turn is followed at once by one back the other way, so you must cross the gutter between.
 */

const ID = fallenId('fable', 'pressed-flat');
const EAR_MS = 1100;
const EAR_SECOND_MS = 700;
const LIFT_MS = 800;
const SWING_MS = 500;
const REST_MS = 4300;

type Phase = 'idle' | 'ear' | 'lift' | 'swing';
type PopKind = 'tower' | 'tree' | 'cottage';
interface PopUp { x: number; y: number; kind: PopKind; at: number; foldAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk, player, npc } = ctx;
  const step = frameClock();
  const X = W / 2, L = 34, R = W - 34, Y0 = top + 14, Y1 = H - 14;
  const HW = X - L;

  let phase: Phase = 'idle';
  let phaseAt = 0;
  let earMs = EAR_MS;
  let started = false;
  let nextTurn = 0;
  /** −1: the leaf leaves the right page and lands on the left; +1 the other way. */
  let curDir = -1;
  let nextDir = -1;
  let sameRun = 0;
  let second = false;
  let riffle = false;
  let lastRibbon = -9999;
  let pressedAt = -9999;
  let pageNo = 1;
  let pops: PopUp[] = [];

  const side = (f: Fighter): number => (f.x < X ? -1 : 1);
  const pickNext = (): number => {
    let d = ctx.rng() < 0.5 ? -1 : 1;
    if (d === nextDir) { sameRun++; if (sameRun >= 2) { d = -d; sameRun = 0; } } else sameRun = 0;
    return d;
  };

  const ribbon = ctx.target({
    x: X, y: Y0 + 34, r: 16, passThrough: true,
    onStruck: (by) => {
      const now = tk.now;
      if (now - lastRibbon < 900) return;
      if (phase === 'idle') nextDir = -nextDir;
      else if (phase === 'ear') { curDir = -curDir; phaseAt = now; }
      else return;
      lastRibbon = now;
      ctx.sfx('whoosh');
      ctx.flash(X, Y0 + 34, by === 'player' ? MINE_C : FOE_C);
    },
  });

  function springPops(time: number): void {
    const kinds: PopKind[] = ['tower', 'tree', 'cottage'];
    for (const s of [-1, 1]) {
      let p: Pt = { x: X + s * 220, y: (Y0 + Y1) / 2 };
      for (let tries = 0; tries < 8; tries++) {
        const c = { x: X + s * (90 + ctx.rng() * (HW - 150)), y: Y0 + 90 + ctx.rng() * (Y1 - Y0 - 160) };
        p = c;
        if (Math.hypot(c.x - player.x, c.y - player.y) > 90 && Math.hypot(c.x - npc.x, c.y - npc.y) > 90) break;
      }
      pops.push({ x: p.x, y: p.y, kind: kinds[Math.floor(ctx.rng() * 3)], at: time, foldAt: 0 });
    }
    ctx.sfx('snap-back');
  }

  function land(time: number): void {
    pressedAt = time;
    ctx.sfx('stone-slam');
    for (const f of [player, npc]) {
      if (!alive(f) || ctx.isAirborne(f) || side(f) !== curDir) continue;
      const me = f === player;
      ctx.hit(f, me ? 18 : 28, f.x, f.y);
      ctx.stun(f, me ? 900 : 1200);
      ctx.flash(f.x, f.y, PAGE);
    }
    pageNo++;
    springPops(time);
    if (riffle && !second) {
      second = true;
      nextDir = -curDir;
      nextTurn = time + 200;
    } else {
      second = false;
      nextDir = pickNext();
      nextTurn = time + REST_MS;
    }
  }

  return {
    update(time) {
      step(time);
      if (!started) { started = true; nextTurn = time + 3200; nextDir = ctx.rng() < 0.5 ? -1 : 1; springPops(time); }
      if (!riffle && npc.hp < npc.maxHp * 0.5) {
        riffle = true;
        ctx.banner('SHE RIFFLES THE PAGES', '#f6eed6');
        ctx.sfx('gust');
      }
      if (phase === 'idle' && time >= nextTurn) {
        phase = 'ear'; phaseAt = time; curDir = nextDir; earMs = second ? EAR_SECOND_MS : EAR_MS;
        for (const p of pops) if (!p.foldAt) p.foldAt = time;
        ctx.sfx('crystal-chime');
      } else if (phase === 'ear' && time >= phaseAt + tk.warn(earMs)) {
        phase = 'lift'; phaseAt = time; ctx.sfx('wings');
      } else if (phase === 'lift' && time >= phaseAt + LIFT_MS) {
        phase = 'swing'; phaseAt = time;
      } else if (phase === 'swing' && time >= phaseAt + SWING_MS) {
        phase = 'idle';
        land(time);
      }
      pops = pops.filter((p) => !p.foldAt || time - p.foldAt < 320);
      for (const p of pops) {
        if (p.foldAt) continue;
        for (const s of ctx.shotsNear(p.x, p.y - 24, 32)) s.block();
      }
    },

    npcSeek(): Pt | null {
      const now = tk.now;
      const ny = clamp(npc.y, Y0 + 50, Y1 - 50);
      if (phase !== 'idle') {
        return side(npc) === curDir ? { x: X - curDir * 170, y: ny } : null;
      }
      const until = nextTurn - now;
      // Turn the page onto the stranger: she is standing where the next leaf will not land.
      if (until > 900 && now - lastRibbon > 900 && alive(player) && side(player) === -nextDir
        && Math.hypot(npc.x - X, npc.y - ribbon.y) < 320) return { x: X + (npc.x < X ? -14 : 14), y: ribbon.y + 30 };
      if (until < 2600 && side(npc) === nextDir) return { x: X - nextDir * 170, y: ny };
      return null;
    },

    drawGround(g, time) {
      // The cover boards round the book, then the two pages.
      g.fillStyle(dim(CLOTH_PLUM, 0.2), 1); g.fillRect(L - 18, Y0 - 10, R - L + 36, Y1 - Y0 + 20);
      g.lineStyle(2, INK, 0.8); g.strokeRect(L - 18, Y0 - 10, R - L + 36, Y1 - Y0 + 20);
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? L : X;
        inkRect(g, x0, Y0, HW, Y1 - Y0, PAGE, 1, 1.6);
        // Page edges stacked at the outside of each block.
        const ox = s < 0 ? L : R;
        for (let k = 1; k <= 4; k++) { g.lineStyle(1, PARCH_DARK, 0.7); g.lineBetween(ox - s * k * 2.5, Y0 + k, ox - s * k * 2.5, Y1 - k); }
        drawPageText(g, x0, Y0, HW, Y1 - Y0, pageNo * 2 + (s < 0 ? 0 : 1));
      }
      // The gutter's shade.
      for (let k = 0; k < 5; k++) { g.fillStyle(INK, 0.05); g.fillRect(X - 4 - k * 5, Y0, 8 + k * 10, Y1 - Y0); }
      g.lineStyle(1.6, INK, 0.5); g.lineBetween(X, Y0, X, Y1);
      // The leaf's shadow falling on the page it will land on.
      if (phase !== 'idle') {
        const total = tk.warn(earMs) + LIFT_MS + SWING_MS;
        const el = phase === 'ear' ? time - phaseAt : phase === 'lift' ? tk.warn(earMs) + time - phaseAt : tk.warn(earMs) + LIFT_MS + time - phaseAt;
        const k = clamp(el / total, 0, 1);
        const x0 = curDir < 0 ? L : X;
        g.fillStyle(INK, 0.06 + 0.26 * k); g.fillRect(x0, Y0, HW, Y1 - Y0);
        g.lineStyle(1.4, INK, 0.2 + 0.4 * k);
        for (let yy = Y0 + 20; yy < Y1; yy += 34) g.lineBetween(x0 + 6, yy, x0 + HW - 6, yy + 14);
      }
      // Paper dust where the leaf slammed down.
      const since = time - pressedAt;
      if (since < 450) {
        const k = since / 450;
        const x0 = curDir < 0 ? L : X;
        g.lineStyle(2, PARCH, 0.7 * (1 - k));
        for (let i = 0; i < 9; i++) {
          const yy = Y0 + (i + 0.5) * (Y1 - Y0) / 9;
          const ex = curDir < 0 ? x0 - 6 - k * 40 : x0 + HW + 6 + k * 40;
          g.lineBetween(curDir < 0 ? x0 : x0 + HW, yy, ex, yy + (i - 4) * 3);
        }
      }
    },

    drawAir(g, time) {
      for (const p of pops) drawPop(g, p, time);
      // The dog-ear and the turning leaf.
      const sLeave = -curDir;
      const ox = X + sLeave * HW;
      if (phase === 'ear') {
        const k = clamp((time - phaseAt) / tk.warn(earMs), 0, 1);
        const e = 14 + 64 * k + Math.sin(time / 70) * 2 * k;
        g.fillStyle(INK, 0.35); g.fillTriangle(ox, Y1 - e, ox, Y1, ox - sLeave * e, Y1);
        inked(g, [{ x: ox, y: Y1 - e }, { x: ox - sLeave * e, y: Y1 }, { x: ox - sLeave * e * 0.92, y: Y1 - e * 0.92 }], PARCH, 1, 1.4);
        g.fillStyle(PARCH_DARK, 0.5); g.fillTriangle(ox - sLeave * e * 0.2, Y1 - e * 0.8, ox - sLeave * e * 0.8, Y1 - e * 0.2, ox - sLeave * e * 0.92, Y1 - e * 0.92);
      } else if (phase === 'lift' || phase === 'swing') {
        const k = phase === 'lift' ? clamp((time - phaseAt) / LIFT_MS, 0, 1) : 1 + clamp((time - phaseAt) / SWING_MS, 0, 1);
        const th = k * Math.PI / 2;
        const c = Math.cos(th), h = Math.sin(th) * 48;
        const ex = X + sLeave * HW * c;
        const midx = X + (ex - X) * 0.55;
        const front = c > 0;
        const fill = front ? PAGE : dim(PARCH, 0.08);
        const pts: Pt[] = [
          { x: X, y: Y0 }, { x: midx, y: Y0 - h * 0.95 }, { x: ex, y: Y0 - h * 0.6 },
          { x: ex, y: Y1 - h }, { x: midx, y: Y1 - h * 1.25 }, { x: X, y: Y1 },
        ];
        g.fillStyle(0x000000, 0.18); g.fillRect(Math.min(X, ex), Y0, Math.abs(ex - X), Y1 - Y0);
        inked(g, pts, fill, 1, 2);
        // A line of print showing through, squashed with the leaf.
        if (Math.abs(ex - X) > 40) {
          const wx = Math.abs(ex - X) - 40;
          const x0 = Math.min(X, ex) + 20;
          scribble(g, x0, Y0 + 40 - h * 0.7, wx, 5, 16, INK_SOFT, 0.3, pageNo * 7, 1);
          scribble(g, x0, Y1 - 110 - h * 1.1, wx, 4, 16, INK_SOFT, 0.3, pageNo * 11, 1);
        }
        g.lineStyle(1, PARCH_DARK, 0.8); g.lineBetween(ex, Y0 - h * 0.6, ex, Y1 - h);
      }
      // The ribbon at the head of the spine leans toward the page the next leaf lands on.
      const lean = (phase === 'idle' ? nextDir : curDir) * 16 + Math.sin(time / 400) * 2;
      g.fillStyle(GILT, 1); g.fillRect(X - 9, Y0 - 6, 18, 6);
      g.lineStyle(1.2, INK, 0.8); g.strokeRect(X - 9, Y0 - 6, 18, 6);
      inked(g, [
        { x: X - 6, y: Y0 }, { x: X + 6, y: Y0 }, { x: X + lean + 6, y: Y0 + 58 }, { x: X + lean, y: Y0 + 50 }, { x: X + lean - 6, y: Y0 + 58 },
      ], CLOTH_RED, 1, 1.4);
      if (time - lastRibbon < 400) { g.lineStyle(2, GILT, 1 - (time - lastRibbon) / 400); g.strokeCircle(X, Y0 + 34, 22); }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      pagePlate(g, x, y, 156, 28);
      // A little book; the arrow over it shows which way the next leaf goes.
      const d = phase === 'idle' ? nextDir : curDir;
      inkRect(g, x - 70, y + 7, 13, 16, PAGE, 1, 1);
      inkRect(g, x - 57, y + 7, 13, 16, PAGE, 1, 1);
      g.lineStyle(2, CLOTH_RED, 1); g.lineBetween(x - 57 - d * 10, y + 5, x - 57 + d * 9, y + 5);
      g.fillStyle(CLOTH_RED, 1); g.fillTriangle(x - 57 + d * 14, y + 5, x - 57 + d * 8, y + 1, x - 57 + d * 8, y + 9);
      if (riffle) { g.fillStyle(CLOTH_RED, 0.8); g.fillTriangle(x - 57 - d * 14, y + 26, x - 57 - d * 8, y + 22, x - 57 - d * 8, y + 30); }
      // The time until the leaf lands.
      const k = phase === 'idle' ? clamp(1 - (nextTurn - time) / REST_MS, 0, 1) : 1;
      g.fillStyle(INK, 0.2); g.fillRect(x - 36, y + 12, 104, 6);
      g.fillStyle(phase === 'idle' ? INK_SOFT : CLOTH_RED, 0.9); g.fillRect(x - 36, y + 12, 104 * k, 6);
      g.lineStyle(1, INK, 0.7); g.strokeRect(x - 36, y + 12, 104, 6);
      // Which side each of you stands on.
      for (const [f, col, dy] of [[player, MINE_C, -1], [npc, FOE_C, 1]] as const) {
        if (!alive(f)) continue;
        const px = x - 36 + (f.x < X ? 24 : 80);
        g.fillStyle(col, 1); g.fillCircle(px, y + 15 + dy * 6, 2.6);
      }
    },

    destroy() { ribbon.remove(); },
  };
}

/** A page's printing: a drop-capital, two blocks of hand-lettered text and a framed vignette. */
function drawPageText(g: G, x: number, y: number, w: number, h: number, seed: number): void {
  inkRect(g, x + 30, y + 26, 30, 30, [CLOTH_RED, CLOTH_BLUE, GILT][seed % 3], 0.9, 1.2);
  g.lineStyle(2, PAGE, 0.9); g.strokeCircle(x + 45, y + 41, 8);
  scribble(g, x + 70, y + 34, w - 110, 3, 12, INK_SOFT, 0.35, seed, 1);
  const vx = x + 50, vy = y + h * 0.36, vw = w - 100, vh = h * 0.3;
  inkRect(g, vx, vy, vw, vh, PARCH, 0.8, 1.4);
  // The vignette: a hill, a castle on it, a moon — different every spread.
  const hx = vx + vw * (0.3 + (seed % 5) * 0.1);
  g.fillStyle(MEADOW_DARK, 0.6); g.fillEllipse(hx, vy + vh, vw * 0.7, vh * 0.8);
  g.fillStyle(INK_SOFT, 0.45);
  g.fillRect(hx - 16, vy + vh * 0.38, 32, vh * 0.3);
  g.fillRect(hx - 22, vy + vh * 0.3, 10, vh * 0.38); g.fillRect(hx + 12, vy + vh * 0.3, 10, vh * 0.38);
  g.fillCircle(vx + vw * (0.85 - (seed % 3) * 0.25), vy + vh * 0.25, 9);
  scribble(g, x + 30, y + h * 0.72, w - 60, 4, 13, INK_SOFT, 0.33, seed + 40, 1);
  g.lineStyle(1, INK_SOFT, 0.4); g.strokeCircle(x + w / 2, y + h - 18, 6);
}

/** A pop-up springing up out of the spread (or folding flat), drawn as card with a glued tab. */
function drawPop(g: G, p: PopUp, time: number): void {
  const up = clamp((time - p.at) / 260, 0, 1);
  const k = p.foldAt ? clamp(1 - (time - p.foldAt) / 300, 0, 1) : up < 1 ? up * (1.15 - 0.15 * up) : 1;
  if (k <= 0) return;
  const { x, y } = p;
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x + 6, y + 2, 66, 14);
  g.fillStyle(PARCH_DARK, 1); g.fillRect(x - 30, y - 3, 60, 6);
  const sy = (v: number): number => y - v * k;
  if (p.kind === 'tower') {
    inked(g, [{ x: x - 20, y }, { x: x + 20, y }, { x: x + 18, y: sy(62) }, { x: x - 18, y: sy(62) }], PLASTER, 1, 1.6);
    for (let i = 0; i < 4; i++) inkRect(g, x - 20 + i * 11, sy(72), 7, 10 * k, PLASTER, 1, 1.2);
    g.fillStyle(INK, 0.9); g.fillRoundedRect(x - 6, sy(46), 12, 16 * k, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.lineStyle(1.2, INK, 0.9); g.lineBetween(x + 12, sy(72), x + 12, sy(96));
    inked(g, [{ x: x + 12, y: sy(96) }, { x: x + 30, y: sy(90) }, { x: x + 12, y: sy(84) }], CLOTH_BLUE, 1, 1);
    g.lineStyle(1, dim(PLASTER, 0.3), 0.8);
    for (let r = 1; r < 5; r++) g.lineBetween(x - 18, sy(r * 12), x + 18, sy(r * 12));
  } else if (p.kind === 'tree') {
    g.fillStyle(TIMBER, 1); g.fillRect(x - 4, sy(36), 8, 36 * k);
    g.lineStyle(1.4, INK, 0.85); g.strokeRect(x - 4, sy(36), 8, 36 * k);
    inkCircle(g, x, sy(56), 26 * Math.max(0.3, k), MEADOW_DARK, 1, 1.8);
    g.fillStyle(0x8ab45e, 0.8); g.fillCircle(x - 8, sy(62), 12 * Math.max(0.3, k));
    for (let i = 0; i < 3; i++) { g.fillStyle(CLOTH_RED, 1); g.fillCircle(x - 12 + i * 11, sy(50 + (i % 2) * 10), 2.4); }
  } else {
    inkRect(g, x - 22, sy(32), 44, 32 * k, PLASTER, 1, 1.6);
    inked(g, [{ x: x - 28, y: sy(32) }, { x: x + 28, y: sy(32) }, { x, y: sy(58) }], THATCH, 1, 1.6);
    g.fillStyle(TIMBER, 1); g.fillRect(x - 6, sy(20), 12, 20 * k);
    g.fillStyle(0xffe6a0, 1); g.fillRect(x + 9, sy(24), 8, 8 * k);
    g.lineStyle(1, BRICK, 0.8); g.lineBetween(x + 14, sy(52), x + 14, sy(64));
  }
  // The card's fold-crease where it stands out of the page.
  g.lineStyle(1, INK, 0.5); g.lineBetween(x - 28, y - 1, x + 28, y - 1);
}

export const FALLEN_PRESSED_FLAT: GimmickDef = {
  id: ID,
  rules: 'The yard is an open book: a page turns and slams down on one side, pressing whoever is on it. Strike the ribbon to turn it the other way.',
  make,
};
