import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CLOTH_BLUE, CLOTH_GREEN, CLOTH_RED, EMBER, FLAME, FOE_C, INK, IRON, IRON_LIT, MINE_C, SMOKE, TIMBER,
  TIMBER_DARK, clamp, closedBook, censorSeal, frameClock, inkRect, inked,
} from '../util';
import { alive, pagePlate } from './common';

/**
 * What the Smoke Showed — Aldous Pyre, keeper of the censors' fire, who in the King's telling fed
 * every banned tale in Fable to the flames and watched the smoke for anyone who read it.
 *
 * His brazier stands at the head of the yard, full of seized books. Every few seconds he throws
 * another in, and its smoke does what the sign on the square forbids: it tells the story. The
 * wind carries the smoke to whichever of you stands farthest downwind, and there it gathers into
 * the tale's picture — and the picture acts:
 *   - *The Wolf at the Door*: a wolf of smoke runs the length of the yard along the wind (a band).
 *   - *The Dragon of Evermore*: a coiled smoke dragon drops on the spot (a wide ring of fire).
 *   - *The Seven Sisters' Swords*: five smoke swords fall in a row, with gaps a body fits between.
 * The picture is drawn in smoke for a long beat before it strikes, and it hurts whoever is inside
 * it — the fire-keeper too.
 *
 * The exploit is the bellows beside the brazier: strike it and the wind turns, so the next book's
 * smoke goes to the far side of the yard instead. Keep him downwind of you. At half health the
 * shelf catches: every picture leaves its pages burning where it fell.
 */

const ID = fallenId('fable', 'smoke-showed');
const CYCLE_MS = 5000;
const RISE_MS = 750;
const FORM_MS = 1350;
const ACT_MS = 380;

type Tale = 'wolf' | 'dragon' | 'swords';
const TALES: Tale[] = ['wolf', 'dragon', 'swords'];
const COVERS: Record<Tale, number> = { wolf: CLOTH_BLUE, dragon: CLOTH_GREEN, swords: CLOTH_RED };
interface Picture { tale: Tale; at: number; lockAt: number; actAt: number; p: Pt; wind: number; locked: boolean; done: boolean }
interface Cinder { x: number; y: number; at: number; lastTick: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk, player, npc } = ctx;
  const step = frameClock();
  const BX = W / 2, BY = top + 78;
  const BELLOWS: Pt = { x: BX + 62, y: BY + 6 };

  let started = false;
  let wind = 1;
  let nextThrow = 0;
  let taleIx = 0;
  let lastPuff = -9999;
  let shelfCaught = false;
  let pics: Picture[] = [];
  let cinders: Cinder[] = [];

  /** Whoever stands farthest along the wind is where the smoke comes down. */
  const downwind = (): Fighter => {
    const pa = alive(player), na = alive(npc);
    if (!na) return player;
    if (!pa) return npc;
    return player.x * wind >= npc.x * wind ? player : npc;
  };

  const bellows = ctx.target({
    x: BELLOWS.x, y: BELLOWS.y - 8, r: 18, passThrough: true,
    onStruck: (by) => {
      const now = tk.now;
      if (now - lastPuff < 900) return;
      lastPuff = now;
      wind = -wind;
      ctx.sfx('gust');
      ctx.flash(BELLOWS.x, BELLOWS.y - 8, by === 'player' ? MINE_C : FOE_C);
    },
  });

  /** Is (x, y) inside this picture's shape? */
  function inside(pc: Picture, x: number, y: number): boolean {
    if (pc.tale === 'wolf') return Math.abs(y - pc.p.y) < 40;
    if (pc.tale === 'dragon') return Math.hypot(x - pc.p.x, y - pc.p.y) < 112;
    if (Math.abs(y - pc.p.y) > 150) return false;
    for (let k = -2; k <= 2; k++) if (Math.abs(x - (pc.p.x + k * 92)) < 24) return true;
    return false;
  }

  function act(pc: Picture, time: number): void {
    ctx.sfx(pc.tale === 'dragon' ? 'inferno' : pc.tale === 'wolf' ? 'roar' : 'slash');
    for (const f of [player, npc]) {
      if (!alive(f) || ctx.isAirborne(f) || !inside(pc, f.x, f.y)) continue;
      ctx.hit(f, f === player ? 18 : 26, f.x, f.y);
      ctx.flash(f.x, f.y, EMBER);
    }
    if (shelfCaught) cinders.push({ x: pc.p.x, y: pc.p.y, at: time, lastTick: time });
  }

  return {
    update(time) {
      step(time);
      if (!started) { started = true; nextThrow = time + 2600; }
      if (!shelfCaught && npc.hp < npc.maxHp * 0.5) {
        shelfCaught = true;
        ctx.banner('THE SHELF CATCHES', '#ffb070');
        ctx.sfx('flame-burst');
      }
      if (time >= nextThrow) {
        nextThrow = time + CYCLE_MS;
        const tale = TALES[taleIx++ % TALES.length];
        pics.push({ tale, at: time, lockAt: time + RISE_MS, actAt: 0, p: { x: BX, y: BY }, wind, locked: false, done: false });
        ctx.sfx('fireball');
      }
      for (const pc of pics) {
        if (!pc.locked && time >= pc.lockAt) {
          const f = downwind();
          pc.locked = true; pc.wind = wind;
          pc.p = { x: clamp(f.x, 80, W - 80), y: clamp(f.y, top + 70, H - 60) };
          pc.actAt = time + tk.warn(FORM_MS);
          ctx.sfx('smoke');
        }
        if (pc.locked && !pc.done && time >= pc.actAt) { pc.done = true; act(pc, time); }
      }
      pics = pics.filter((pc) => !pc.done || time - pc.actAt < ACT_MS + 200);
      // Burning pages: a slow tick for both, on their own clock.
      for (const c of cinders) {
        if (time - c.lastTick < 500) continue;
        c.lastTick = time;
        for (const f of [player, npc]) {
          if (alive(f) && Math.hypot(f.x - c.x, f.y - c.y) < 58) ctx.hit(f, f === player ? 5 : 7, f.x, f.y);
        }
      }
      cinders = cinders.filter((c) => time - c.at < 4200);
    },

    npcSeek(): Pt | null {
      const now = tk.now;
      // Out of any picture about to strike.
      for (const pc of pics) {
        if (!pc.locked || pc.done || !inside(pc, npc.x, npc.y)) continue;
        if (pc.tale === 'wolf') return { x: npc.x, y: clamp(pc.p.y + (npc.y < pc.p.y ? -110 : 110), top + 50, H - 50) };
        if (pc.tale === 'dragon') {
          const a = Math.atan2(npc.y - pc.p.y, npc.x - pc.p.x);
          return { x: clamp(pc.p.x + Math.cos(a) * 170, 60, W - 60), y: clamp(pc.p.y + Math.sin(a) * 170, top + 50, H - 50) };
        }
        const k = Math.round((npc.x - pc.p.x) / 92 - 0.5) + 0.5;
        return { x: clamp(pc.p.x + k * 92, 60, W - 60), y: npc.y };
      }
      // Turn the wind when the smoke would come to him.
      const pending = pics.some((pc) => !pc.locked) || nextThrow - now < 1400;
      if (pending && downwind() === npc && now - lastPuff > 900) return { x: BELLOWS.x + 6, y: BELLOWS.y + 34 };
      return null;
    },

    drawGround(g, time) {
      // Scorched flags round the brazier; the burning pages.
      g.fillStyle(0x000000, 0.18); g.fillEllipse(BX, BY + 8, 200, 54);
      g.fillStyle(SMOKE, 0.2); g.fillEllipse(BX, BY + 8, 150, 38);
      for (const c of cinders) {
        const k = clamp((time - c.at) / 4200, 0, 1);
        g.fillStyle(EMBER, 0.18 * (1 - k)); g.fillCircle(c.x, c.y, 58);
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + c.at * 0.001;
          const px = c.x + Math.cos(a) * 30, py = c.y + Math.sin(a) * 18;
          inked(g, [{ x: px - 9, y: py - 5 }, { x: px + 9, y: py - 7 }, { x: px + 8, y: py + 5 }, { x: px - 8, y: py + 6 }], dim(0xeadcb4, 0.3 + k * 0.5), 1 - k * 0.5, 1);
          const fl = 4 + Math.sin(time / 90 + i) * 2;
          g.fillStyle(FLAME, 0.8 * (1 - k)); g.fillTriangle(px - 4, py, px + 4, py, px, py - fl - 4);
        }
      }
      // The smoke pictures' footprints: where each will strike, darkening as it forms.
      for (const pc of pics) {
        if (!pc.locked) continue;
        const k = pc.done ? 1 : clamp(1 - (pc.actAt - time) / tk.warn(FORM_MS), 0, 1);
        const a = pc.done ? 0.5 * (1 - (time - pc.actAt) / (ACT_MS + 200)) : 0.08 + 0.22 * k;
        const col = pc.done ? EMBER : SMOKE;
        g.fillStyle(col, a);
        if (pc.tale === 'wolf') g.fillRect(0, pc.p.y - 40, W, 80);
        else if (pc.tale === 'dragon') g.fillCircle(pc.p.x, pc.p.y, 112);
        else for (let s = -2; s <= 2; s++) g.fillRect(pc.p.x + s * 92 - 24, pc.p.y - 150, 48, 300);
        g.lineStyle(1.6, INK, 0.15 + 0.4 * k);
        if (pc.tale === 'wolf') { g.lineBetween(0, pc.p.y - 40, W, pc.p.y - 40); g.lineBetween(0, pc.p.y + 40, W, pc.p.y + 40); }
        else if (pc.tale === 'dragon') g.strokeCircle(pc.p.x, pc.p.y, 112);
        else for (let s = -2; s <= 2; s++) g.strokeRect(pc.p.x + s * 92 - 24, pc.p.y - 150, 48, 300);
      }
    },

    drawAir(g, time) {
      drawBrazier(g, BX, BY, time, wind);
      drawBellows(g, BELLOWS.x, BELLOWS.y, clamp(1 - (time - lastPuff) / 350, 0, 1), wind);
      for (const pc of pics) drawPicture(g, pc, time, BX, BY, tk.warn(FORM_MS));
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      pagePlate(g, x, y, 170, 28);
      // The wind vane: an arrow of smoke pointing downwind, and which of you it carries to.
      g.lineStyle(3, SMOKE, 0.9); g.lineBetween(x - 70, y + 14, x - 40, y + 14);
      g.fillStyle(SMOKE, 1); g.fillTriangle(x - 55 + wind * 20, y + 14, x - 55 + wind * 12, y + 8, x - 55 + wind * 12, y + 20);
      const d = downwind();
      g.fillStyle(d === player ? MINE_C : FOE_C, 1); g.fillCircle(x - 55 + wind * 26, y + 14, 4);
      // The next three books on the pile, the next one lifted.
      for (let i = 0; i < 3; i++) {
        const tale = TALES[(taleIx + i) % TALES.length];
        const bx = x + 2 + i * 22;
        inkRect(g, bx, y + 7 - (i === 0 ? 2 : 0), 16, 16, COVERS[tale], 1, 1);
        g.fillStyle(0xeadcb4, 1); g.fillRect(bx + 13, y + 8 - (i === 0 ? 2 : 0), 2, 14);
      }
      const k = clamp(1 - (nextThrow - time) / CYCLE_MS, 0, 1);
      g.fillStyle(EMBER, 0.9); g.fillRect(x + 2, y + 25, 62 * k, 2);
      if (shelfCaught) { g.fillStyle(FLAME, 1); g.fillTriangle(x + 72, y + 22, x + 80, y + 22, x + 76, y + 8 + Math.sin(time / 80) * 2); }
    },

    destroy() { bellows.remove(); },
  };
}

/** The censors' brazier: an iron basket on three legs, crammed with books, a smoke column bending downwind. */
function drawBrazier(g: G, x: number, y: number, time: number, wind: number): void {
  g.lineStyle(4, INK, 0.85);
  g.lineBetween(x - 26, y, x - 16, y - 34); g.lineBetween(x + 26, y, x + 16, y - 34); g.lineBetween(x, y + 4, x, y - 30);
  g.lineStyle(2.5, IRON, 1);
  g.lineBetween(x - 26, y, x - 16, y - 34); g.lineBetween(x + 26, y, x + 16, y - 34); g.lineBetween(x, y + 4, x, y - 30);
  inked(g, [{ x: x - 34, y: y - 54 }, { x: x + 34, y: y - 54 }, { x: x + 24, y: y - 30 }, { x: x - 24, y: y - 30 }], IRON, 1, 2);
  g.lineStyle(1.4, IRON_LIT, 0.8);
  for (let k = -2; k <= 2; k++) g.lineBetween(x + k * 12, y - 54, x + k * 9, y - 30);
  // Books jammed in, spines up, burning.
  const spines = [CLOTH_RED, CLOTH_BLUE, CLOTH_GREEN, 0x8a5a3a, CLOTH_RED];
  for (let i = 0; i < 5; i++) inkRect(g, x - 28 + i * 11, y - 64 + (i % 2) * 4, 10, 14, spines[i], 1, 1);
  for (let i = 0; i < 7; i++) {
    const fx = x - 26 + i * 8.6, fh = 14 + Math.sin(time / 70 + i * 1.7) * 6 + (i % 3) * 4;
    g.fillStyle(EMBER, 0.95); g.fillTriangle(fx - 6, y - 58, fx + 6, y - 58, fx + wind * 3, y - 58 - fh);
    g.fillStyle(FLAME, 0.95); g.fillTriangle(fx - 3, y - 58, fx + 3, y - 58, fx + wind * 2, y - 58 - fh * 0.6);
  }
  // The column of smoke, puffs drifting off downwind.
  for (let i = 0; i < 9; i++) {
    const ph = ((time / 1600) + i / 9) % 1;
    const px = x + wind * ph * ph * 160 + Math.sin(ph * 9 + i) * 6, py = y - 76 - ph * 60;
    g.fillStyle(SMOKE, 0.55 * (1 - ph)); g.fillCircle(px, py, 8 + ph * 16);
  }
  // The seized books waiting beside it, under the seal.
  closedBook(g, x - 70, y + 4, 34, 22, CLOTH_BLUE, 1);
  closedBook(g, x - 72, y - 8, 30, 20, CLOTH_GREEN, 1);
  censorSeal(g, x - 70, y - 24, 6, 1);
}

/** The bellows: leather between two boards, squeezed flat for a moment after it is struck. */
function drawBellows(g: G, x: number, y: number, squeeze: number, wind: number): void {
  const open = 16 - squeeze * 10;
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 2, 52, 12);
  inked(g, [{ x: x - 20, y: y - 8 - open }, { x: x + 14, y: y - 12 }, { x: x - 20, y: y - 8 + 4 }], 0x7a4a2a, 1, 1.4);
  for (let k = 1; k < 4; k++) { g.lineStyle(1, dim(0x7a4a2a, 0.35), 0.9); g.lineBetween(x - 20 + k * 6, y - 8 - open * (1 - k / 4), x - 20 + k * 6, y - 4); }
  inkRect(g, x - 26, y - 10 - open, 32, 5, TIMBER, 1, 1.2);
  inkRect(g, x - 26, y - 6, 32, 5, TIMBER_DARK, 1, 1.2);
  g.lineStyle(3, IRON, 1); g.lineBetween(x + 6, y - 9, x + 22, y - 12);
  g.lineStyle(2, TIMBER, 1); g.lineBetween(x - 26, y - 8 - open, x - 38, y - 14 - open); g.lineBetween(x - 26, y - 4, x - 38, y - 2);
  if (squeeze > 0) {
    g.lineStyle(2, 0xffffff, 0.6 * squeeze);
    for (let k = 0; k < 3; k++) g.lineBetween(x + 24, y - 14 + k * 4, x + 24 + 22 * (1 - squeeze + 0.3), y - 14 + k * 4 - wind);
  }
}

/** One book's smoke: rising off the fire, drifting to its spot, drawing the tale, then striking. */
function drawPicture(g: G, pc: Picture, time: number, bx: number, by: number, formMs: number): void {
  if (!pc.locked) {
    const k = clamp((time - pc.at) / RISE_MS, 0, 1);
    for (let i = 0; i < 5; i++) { g.fillStyle(SMOKE, 0.5); g.fillCircle(bx + Math.sin(i * 2 + time / 200) * 8, by - 70 - k * 50 - i * 8, 10 + i * 2); }
    return;
  }
  const k = pc.done ? 1 : clamp(1 - (pc.actAt - time) / formMs, 0, 1);
  // The trail from the fire to where the tale comes down.
  for (let i = 0; i < 8; i++) {
    const t = clamp(k * 1.4 - i / 10, 0, 1);
    if (t <= 0 || t >= 1) continue;
    const px = bx + (pc.p.x - bx) * t, py = by - 90 + (pc.p.y - 40 - by + 90) * t - Math.sin(t * Math.PI) * 50;
    g.fillStyle(SMOKE, 0.35 * (1 - t)); g.fillCircle(px, py, 14);
  }
  const a = pc.done ? clamp(1 - (time - pc.actAt) / (ACT_MS + 200), 0, 1) : 0.15 + 0.6 * k;
  const col = pc.done ? EMBER : SMOKE;
  const { x, y } = pc.p;
  if (pc.tale === 'wolf') {
    // A running wolf of smoke, nose to the wind; done, it has crossed the yard.
    const wx = pc.done ? x + pc.wind * (time - pc.actAt) * 2.4 : x - pc.wind * 30 * (1 - k);
    smokeWolf(g, wx, y, pc.wind, a, col, time);
  } else if (pc.tale === 'dragon') {
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2 * k + time / 900;
      g.fillStyle(col, a * 0.8); g.fillCircle(x + Math.cos(ang) * 96, y + Math.sin(ang) * 96, 12 + (i % 3) * 3);
    }
    const ha = Math.PI * 2 * k + time / 900;
    const hx = x + Math.cos(ha) * 96, hy = y + Math.sin(ha) * 96;
    g.fillStyle(col, a); g.fillEllipse(hx, hy, 34, 22);
    g.fillStyle(lit(EMBER, 0.3), a); g.fillCircle(hx + 6, hy - 4, 3);
    g.fillStyle(col, a); g.fillTriangle(hx - 8, hy - 10, hx - 2, hy - 22, hx + 2, hy - 10);
  } else {
    for (let s = -2; s <= 2; s++) {
      const sx = x + s * 92;
      const drop = pc.done ? 0 : (1 - k) * 60;
      const top = y - 150 - drop, bot = y + 130 - drop;
      g.fillStyle(col, a * 0.8); g.fillRect(sx - 5, top + 40, 10, bot - top - 40);
      g.fillTriangle(sx - 5, bot, sx + 5, bot, sx, bot + 18);
      g.fillStyle(col, a); g.fillRect(sx - 20, top + 34, 40, 7);
      g.fillRect(sx - 3, top + 6, 6, 28);
      g.fillCircle(sx, top + 4, 6);
    }
  }
}

/** A wolf drawn in smoke-puffs, running toward `dir`. */
function smokeWolf(g: G, x: number, y: number, dir: number, a: number, col: number, time: number): void {
  g.fillStyle(col, a * 0.85);
  g.fillEllipse(x, y, 90, 36);
  g.fillEllipse(x + dir * 52, y - 14, 40, 28);
  g.fillTriangle(x + dir * 64, y - 18, x + dir * 94, y - 10, x + dir * 64, y - 4);
  g.fillTriangle(x + dir * 44, y - 24, x + dir * 50, y - 44, x + dir * 56, y - 24);
  g.fillTriangle(x - dir * 40, y - 6, x - dir * 90, y - 26, x - dir * 44, y + 8);
  const st = Math.sin(time / 60) * 12;
  g.lineStyle(7, col, a * 0.85);
  g.lineBetween(x + dir * 26, y + 12, x + dir * (30 + st), y + 38);
  g.lineBetween(x - dir * 26, y + 12, x - dir * (30 - st), y + 38);
  g.fillStyle(EMBER, a); g.fillCircle(x + dir * 60, y - 18, 3.4);
}

export const FALLEN_SMOKE_SHOWED: GimmickDef = {
  id: ID,
  rules: 'Burning books send their tale as smoke to whoever stands downwind, where it strikes. Strike the bellows to turn the wind onto him.',
  make,
};
