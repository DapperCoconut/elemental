import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CANVAS, CANVAS_DARK, CANVAS_LIT, GILT, GILT_LIT, INK, INK_LIT, IRON_LIT, IVORY, RED, RED_DARK, RED_LIT, TIMBER,
  TIMBER_DARK, TIMBER_LIT, BAIZE_LIT,
} from '../palette';
import { alive, clamp } from '../util';

/**
 * Right of Way — Sabre-Master Casimir Voss, who taught Prince Banneret the sabre, and who in the
 * King's telling taught it to him on drafted boys who were not allowed to strike back.
 *
 * A fencing piste is laid down the middle of the yard, and on it the old rule of the sabre holds:
 * the *right of way* belongs to whoever is attacking. While both fighters stand on the strip, the
 * one who last came forward harder holds it — blows on them glance (they take little) and blows
 * on the other land as touches (they take much more). The president on his stand raises his flag
 * toward whoever holds it. Off the piste there is no right of way at all.
 *
 * Voss flèches down the strip at you: a chalked lunge-line, then a running thrust. Step across the
 * line to slip it, but you give ground and he takes the right of way. A dash straight at him
 * takes it back. Past half the boards are marked: whoever is driven off the far end of the strip
 * has a touch scored against them. The bot comes on hard when it holds priority, leaves the piste
 * when you do, and keeps off the ends.
 */

const ID = fallenId('war', 'right-of-way');
const X0 = 110, X1 = 850, HALF_H = 64, WARN_ZONE = 72;
type Side = 'player' | 'npc' | null;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const YM = Math.round((top + H) / 2);
  let boards = false;
  let started = false;
  let prio: Side = null;
  let prioAt = -1e9;
  let nextLunge = 0;
  let lastP: Pt = { x: player.x, y: player.y }, lastN: Pt = { x: npc.x, y: npc.y };
  let advP = 0, advN = 0;
  let wasOnP = false, wasOnN = false;
  let penP = -1e9, penN = -1e9;

  const onPiste = (f: Fighter) => alive(f) && f.x > X0 && f.x < X1 && Math.abs(f.y - YM) < HALF_H;
  const bothOn = () => onPiste(player) && onPiste(npc);
  const live = (): Side => (bothOn() ? prio : null);

  function take(s: Side, time: number): void {
    if (s === prio) return;
    prio = s; prioAt = time;
    ctx.sfx('clang');
  }

  function offEnd(f: Fighter, isP: boolean, time: number): void {
    if (!boards) return;
    if (isP && time - penP < 1500) return;
    if (!isP && time - penN < 1500) return;
    if (isP) { penP = time; tk.hitPlayer(20, f.x, f.y); take('npc', time); }
    else { penN = time; ctx.hit(npc, 28, f.x, f.y); ctx.float(f.x, f.y - 56, 'OFF THE BOARDS', '#ffe2a8'); take('player', time); }
    ctx.sfx('whip');
  }

  return {
    update(time, dt) {
      if (!started) { started = true; nextLunge = time + 2600; }
      if (!boards && npc.hp < npc.maxHp * 0.5) { boards = true; ctx.banner('THE BOARDS ARE MARKED', '#ffe2a8'); ctx.sfx('judgement'); }
      const d = Math.max(0.001, Math.min(dt, 0.1));
      // Who is coming forward: each fighter's speed toward the other, smoothed.
      const ux = npc.x - player.x, uy = npc.y - player.y, ul = Math.hypot(ux, uy) || 1;
      const vp = ((player.x - lastP.x) * ux + (player.y - lastP.y) * uy) / ul / d;
      const vn = (-(npc.x - lastN.x) * ux - (npc.y - lastN.y) * uy) / ul / d;
      const k = Math.min(1, d / 0.15);
      advP += (clamp(vp, -900, 900) - advP) * k; advN += (clamp(vn, -900, 900) - advN) * k;
      lastP = { x: player.x, y: player.y }; lastN = { x: npc.x, y: npc.y };
      if (bothOn()) {
        if (advP - advN > 70) take('player', time);
        else if (advN - advP > 70) take('npc', time);
      } else if (prio !== null && !onPiste(player) && !onPiste(npc)) prio = null;
      // Off the end of the strip (not its sides) once the boards are marked.
      const endP = wasOnP && Math.abs(player.y - YM) < HALF_H && (player.x <= X0 || player.x >= X1);
      const endN = wasOnN && Math.abs(npc.y - YM) < HALF_H && (npc.x <= X0 || npc.x >= X1);
      if (endP) offEnd(player, true, time);
      if (endN) offEnd(npc, false, time);
      wasOnP = onPiste(player); wasOnN = onPiste(npc);
      // The flèche: a chalked line down the strip, then the running thrust.
      if (time >= nextLunge) {
        nextLunge = time + (boards ? 2800 : 3600);
        if (onPiste(npc) && alive(player) && Math.abs(player.y - npc.y) < 56 && Math.abs(player.x - npc.x) > 90) {
          const s = Math.sign(player.x - npc.x);
          tk.spawnCharge({ toX: clamp(player.x + s * 70, X0 + 10, X1 - 10), toY: npc.y, warnMs: 850, travelMs: 280, halfW: 28, damage: 18 });
          ctx.sfx('slash');
        }
      }
    },

    playerTakenMult() { const s = live(); return s === 'player' ? 0.55 : s === 'npc' ? 1.5 : 1; },
    npcTakenMult() { const s = live(); return s === 'npc' ? 0.55 : s === 'player' ? 1.5 : 1; },

    npcSeek(): Pt | null {
      if (!alive(npc) || !alive(player)) return null;
      if (boards && onPiste(npc) && (npc.x < X0 + 100 || npc.x > X1 - 100)) return { x: npc.x < X0 + 100 ? X0 + 200 : X1 - 200, y: YM };
      const pOn = onPiste(player), nOn = onPiste(npc);
      if (pOn && nOn) {
        if (prio === 'npc') { const s = Math.sign(npc.x - player.x) || 1; return { x: tk.clampX(player.x + s * 60), y: player.y }; }
        return { x: npc.x, y: tk.clampY(YM + (npc.y >= YM ? 1 : -1) * (HALF_H + 70)) };
      }
      if (pOn && !nOn) {
        const s = Math.sign(npc.x - player.x) || 1;
        return { x: clamp(player.x + s * 130, X0 + 40, X1 - 40), y: YM };
      }
      return null;
    },

    drawGround(g, time) {
      drawPiste(g, YM, boards, time);
      drawPresident(g, W / 2, YM - HALF_H - 46, live(), time - prioAt);
      drawRack(g, X0 - 50, YM + HALF_H + 60);
    },

    drawAir(g, time) {
      const s = live();
      if (!s) return;
      const holder = s === 'player' ? player : npc, other = s === 'player' ? npc : player;
      drawPriority(g, holder.x, holder.y - 82, time);
      drawTouch(g, other.x, other.y - 30, time);
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 18;
      const s = live();
      g.fillStyle(0x000000, 0.6); g.fillRoundedRect(x - 60, y - 14, 120, 28, 6);
      g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - 54, y - 10, 108, 20, 4);
      const lamp = (lx: number, on: boolean, c: number) => {
        g.fillStyle(0x1a1a1a, 1); g.fillCircle(lx, y, 8);
        g.fillStyle(on ? c : 0x3a3a3a, 1); g.fillCircle(lx, y, 6);
        if (on) { g.fillStyle(0xffffff, 0.6); g.fillCircle(lx - 2, y - 2, 2); glow(g, lx, y, 14, c, 0.12, 2); }
      };
      lamp(x - 38, s === 'player', BAIZE_LIT);
      lamp(x + 38, s === 'npc', RED_LIT);
      g.lineStyle(2, IRON_LIT, 1); g.lineBetween(x - 20, y + 5, x + 20, y - 5);
      g.lineStyle(3, GILT, 1); g.lineBetween(x - 22, y + 2, x - 16, y + 9);
      if (boards) for (let i = 0; i < 3; i++) { g.fillStyle(RED, 0.5 + Math.sin(time / 300 + i) * 0.3); g.fillRect(x - 6 + i * 5, y - 9, 3, 4); }
    },
  };
}

/** The piste: canvas laid over boards, chalked centre and en-garde lines, the hatched warning zones, the end lines. */
function drawPiste(g: G, ym: number, boards: boolean, time: number): void {
  const y0 = ym - HALF_H, h = HALF_H * 2;
  shadow(g, (X0 + X1) / 2, ym + HALF_H + 4, X1 - X0 + 40, 18, 0.25);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(X0 - 14, y0 - 8, X1 - X0 + 28, h + 16);
  for (let x = X0 - 12; x < X1 + 12; x += 40) { g.lineStyle(1, TIMBER, 0.8); g.lineBetween(x, y0 - 7, x, y0 + h + 7); }
  g.fillStyle(CANVAS_DARK, 1); g.fillRect(X0, y0 + 2, X1 - X0, h);
  g.fillStyle(CANVAS, 1); g.fillRect(X0, y0, X1 - X0, h);
  for (let y = y0 + 8; y < y0 + h; y += 12) { g.lineStyle(1, CANVAS_LIT, 0.25); g.lineBetween(X0, y, X1, y); }
  for (let i = 0; i < 26; i++) { const x = X0 + ((i * 97) % (X1 - X0)), y = y0 + ((i * 53) % h); g.fillStyle(0x7a6448, 0.18); g.fillEllipse(x, y, 10, 4); }
  // Warning zones at each end.
  for (const [a, b] of [[X0, X0 + WARN_ZONE], [X1 - WARN_ZONE, X1]] as [number, number][]) {
    g.fillStyle(RED, boards ? 0.25 + Math.sin(time / 260) * 0.08 : 0.12); g.fillRect(a, y0, b - a, h);
    for (let x = a - h; x < b; x += 14) { g.lineStyle(2, RED_DARK, 0.45); g.lineBetween(Math.max(a, x), y0 + Math.max(0, a - x), Math.min(b, x + h), y0 + Math.min(h, b - x)); }
  }
  // Chalk: borders, centre, en-garde, end lines.
  g.lineStyle(2, IVORY, 0.9); g.strokeRect(X0, y0, X1 - X0, h);
  const cx = (X0 + X1) / 2;
  g.lineStyle(3, IVORY, 0.9); g.lineBetween(cx, y0, cx, y0 + h);
  for (const s of [-1, 1]) { g.lineStyle(2, IVORY, 0.7); g.lineBetween(cx + s * 120, y0 + 8, cx + s * 120, y0 + h - 8); }
  for (const x of [X0, X1]) { g.lineStyle(boards ? 6 : 4, boards ? RED_LIT : IVORY, 1); g.lineBetween(x, y0 - 6, x, y0 + h + 6); }
}

/** The president of the bout on his little rostrum, flag raised toward whoever holds the right of way. */
function drawPresident(g: G, x: number, y: number, prio: Side, since: number): void {
  shadow(g, x, y + 2, 60, 14);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 26, y - 14, 52, 14);
  g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 26, y - 14, 52, 3);
  g.fillStyle(RED, 1); g.fillRect(x - 24, y - 10, 48, 4);
  const by = y - 14;
  g.fillStyle(INK, 1); g.fillRect(x - 5, by - 12, 4, 12); g.fillRect(x + 1, by - 12, 4, 12);
  g.fillStyle(INK_LIT, 1); g.fillRoundedRect(x - 8, by - 34, 16, 24, 4);
  g.fillStyle(IVORY, 1); g.fillTriangle(x - 3, by - 34, x + 3, by - 34, x, by - 26);
  g.fillStyle(0xd8b08a, 1); g.fillCircle(x, by - 40, 6);
  g.fillStyle(0xe8e2d6, 1); g.fillEllipse(x, by - 45, 12, 5);
  const s = prio === 'player' ? -1 : prio === 'npc' ? 1 : 0;
  const lift = s ? clamp(since / 180, 0, 1) : 0;
  for (const side of [-1, 1]) {
    const up = side === s ? lift : 0;
    const hx = x + side * (10 + 8 * up), hy = by - 30 - 16 * up;
    g.lineStyle(3, INK_LIT, 1); g.lineBetween(x + side * 7, by - 30, hx, hy);
    g.lineStyle(1.5, TIMBER_LIT, 1); g.lineBetween(hx, hy, hx + side * 4, hy - 20 - up * 6);
    g.fillStyle(side < 0 ? BAIZE_LIT : RED, 1);
    const fx = hx + side * 4, fy = hy - 20 - up * 6;
    g.fillRect(side < 0 ? fx - 14 : fx, fy, 14, 9);
  }
}

/** A sabre rack at the end of the strip: three blades, guards and grips. */
function drawRack(g: G, x: number, y: number): void {
  shadow(g, x, y + 2, 44, 10);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 20, y - 46, 4, 46); g.fillRect(x + 16, y - 46, 4, 46);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 22, y - 40, 44, 5); g.fillRect(x - 22, y - 12, 44, 5);
  for (let i = 0; i < 3; i++) {
    const bx = x - 10 + i * 10;
    g.lineStyle(2, IRON_LIT, 1); g.lineBetween(bx, y - 10, bx + 3, y - 56);
    g.lineStyle(2.5, GILT, 1); g.beginPath(); g.arc(bx - 1, y - 12, 5, 0.2, Math.PI - 0.2); g.strokePath();
    g.fillStyle(INK, 1); g.fillRect(bx - 1.5, y - 10, 3, 8);
  }
}

/** The right of way, shown over its holder: two gilt sabres crossed under a little crown of points. */
function drawPriority(g: G, x: number, y: number, time: number): void {
  const b = Math.sin(time / 200) * 2;
  glow(g, x, y + b, 20, GILT_LIT, 0.08, 3);
  for (const s of [-1, 1]) {
    g.lineStyle(2.5, IRON_LIT, 1); g.lineBetween(x - s * 14, y + 10 + b, x + s * 12, y - 12 + b);
    g.lineStyle(3, GILT, 1); g.beginPath(); g.arc(x - s * 10, y + 7 + b, 5, 0, Math.PI); g.strokePath();
  }
  g.fillStyle(GILT_LIT, 1); g.fillTriangle(x - 6, y - 14 + b, x + 6, y - 14 + b, x, y - 22 + b);
}

/** The target over whoever is without it: a chalk lozenge where a touch will land. */
function drawTouch(g: G, x: number, y: number, time: number): void {
  const p = 0.5 + Math.sin(time / 120) * 0.3;
  g.lineStyle(2, RED_LIT, p);
  g.strokePoints([{ x, y: y - 14 }, { x: x + 10, y }, { x, y: y + 14 }, { x: x - 10, y }], true);
  g.fillStyle(RED_LIT, p); g.fillCircle(x, y, 2.5);
}

export const FALLEN_RIGHT_OF_WAY: GimmickDef = {
  id: ID,
  rules: 'Both on the piste, whoever last came forward holds the right of way: blows on them glance, on the other land hard. Dash at Voss to take it.',
  make,
};
