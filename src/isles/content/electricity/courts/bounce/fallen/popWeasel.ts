import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Striker } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { BRASS, BRASS_DARK, BRASS_LIT, IRON, LATEX, LATEX_DARK, LATEX_LIT, TIN, TOY_BLUE, TOY_GREEN, TOY_PINK, TOY_RED, TOY_VIOLET, TOY_YELLOW } from '../palette';
import { alive, clamp, dist, segDist, stepDt, wrapAngle } from '../util';

/**
 * Pop Goes the Weasel — Mirabel Tantony, Box-Cranker of the Toy Works: the girl who sat at the
 * end of the finishing bench and cranked every jack-in-the-box through its tune before it went
 * into the Prince's toy chest. In the King's telling she cranked them for the Linemen's yard,
 * where the boxes were set facing the queue for the Draw, and a man who flinched was marked short.
 *
 * Tin jack-boxes stand about the floor, each lid facing one of eight ways. A punched paper roll
 * turns on the HUD, one row of holes per box: when a box's hole reaches the reading bar, its jack
 * POPS — a boxing-gloved jester on a spring that punches the whole lane in front of the lid and
 * shoves whoever it catches. Three beats before, the box rattles and its lane is chalked.
 *
 * Strike a box and its lid steps one notch toward the striker's foe. Turn a box onto Mirabel and
 * its jack lays her out (stunned). Past halfway the tune quickens, a fifth box joins, the bar ends
 * on a POP from every box at once, and each box kicks back a hop when its jack fires, so the floor
 * re-sets itself all fight. The bot steps out of chalked lanes and goes round to strike the box
 * nearest you, so its lid comes round onto you.
 */

const ID = fallenId('bounce', 'pop-weasel');
const LANE = 300;
const HALF_W = 34;
const BOX = 46;
const BAR = 16;
const WARN_BEATS = 3;
const COLORS = [TOY_RED, TOY_BLUE, TOY_GREEN, TOY_VIOLET, TOY_YELLOW];

interface Box { x: number; y: number; dir: number; ang: number; popAt: number; color: number; turnCd: number; kickX: number; kickY: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const midY = (top + H) / 2;
  const mk = (x: number, y: number, dir: number, i: number): Box =>
    ({ x, y, dir, ang: dir * Math.PI / 4, popAt: -1e9, color: COLORS[i], turnCd: 0, kickX: x, kickY: y });
  const boxes: Box[] = [
    mk(W * 0.2, top + 120, 1, 0), mk(W * 0.8, top + 130, 3, 1), mk(W * 0.24, H - 100, 7, 2), mk(W * 0.77, H - 96, 5, 3),
  ];
  const targets = boxes.map((b) => strikeFor(b));
  let half = false;
  let beatMs = 440;
  let beat = 0;
  let nextBeat = 0;
  let started = false;
  /** Which boxes pop on which beat of the bar. */
  let score: number[][] = [];
  const setScore = () => {
    score = Array.from({ length: BAR }, () => [] as number[]);
    if (!half) boxes.forEach((_, i) => score[2 + i * 4].push(i));
    else { boxes.forEach((_, i) => score[1 + i * 3].push(i)); score[15] = boxes.map((_, i) => i); }
  };
  setScore();

  function strikeFor(b: Box) {
    return ctx.target({ x: b.x, y: b.y - 16, r: 30, onStruck: (by: Striker) => turn(b, by) });
  }
  /** Struck: the lid steps one notch (45°) toward the striker's foe. */
  function turn(b: Box, by: Striker): void {
    const now = tk.now;
    if (now < b.turnCd) return;
    const foe = by === 'player' ? npc : player;
    if (!alive(foe)) return;
    const want = Math.atan2(foe.y - b.y, foe.x - b.x);
    const diff = wrapAngle(want - b.dir * Math.PI / 4);
    if (Math.abs(diff) < Math.PI / 8) return;
    b.turnCd = now + 320;
    b.dir = (b.dir + (diff > 0 ? 1 : -1) + 8) % 8;
    ctx.sfx('gear-turn');
  }

  const laneEnds = (b: Box): [Pt, Pt] => {
    const a = b.dir * Math.PI / 4;
    return [{ x: b.x + Math.cos(a) * 20, y: b.y - 14 + Math.sin(a) * 20 }, { x: b.x + Math.cos(a) * LANE, y: b.y - 14 + Math.sin(a) * LANE }];
  };
  const inLane = (b: Box, f: Fighter, pad = 0) => {
    const [s, e] = laneEnds(b);
    return segDist(f.x, f.y, s.x, s.y, e.x, e.y) < HALF_W + 18 + pad;
  };
  /** Milliseconds until a box's next pop on the roll. */
  function msUntil(i: number, time: number): number {
    const frac = clamp(1 - (nextBeat - time) / beatMs, 0, 1);
    for (let d = 1; d <= BAR; d++) if (score[(beat + d) % BAR].includes(i)) return (d - 1 + (1 - frac)) * beatMs;
    return 1e9;
  }

  function pop(b: Box, time: number): void {
    b.popAt = time;
    const a = b.dir * Math.PI / 4;
    ctx.sfx('boing');
    for (const f of [player, npc]) {
      if (!alive(f) || !inLane(b, f)) continue;
      ctx.nudge(f, Math.cos(a) * 90, Math.sin(a) * 90);
      if (f === player) { tk.hitPlayer(15, f.x, f.y); ctx.sfx('hit-heavy'); }
      else { ctx.hit(npc, 28, f.x, f.y); ctx.stun(npc, 450); ctx.float(f.x, f.y - 56, 'JACKED', '#ffd080'); }
    }
    if (half) {
      b.kickX = clamp(b.x - Math.cos(a) * 60, 70, W - 70);
      b.kickY = clamp(b.y - Math.sin(a) * 60, top + 70, H - 50);
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextBeat = time + 2000; }
      if (!half && npc.hp < npc.maxHp * 0.5) {
        half = true;
        beatMs = 350;
        const b = mk(W / 2, midY + 30, 2, 4);
        boxes.push(b);
        targets.push(strikeFor(b));
        setScore();
        ctx.banner('THE TUNE QUICKENS', '#ffd080');
        ctx.sfx('jackpot');
      }
      while (time >= nextBeat) {
        nextBeat += beatMs;
        beat = (beat + 1) % BAR;
        const due = score[beat];
        if (due.length) for (const i of due) pop(boxes[i], time);
        else if (beat % 4 === 0) ctx.sfx('clock-tick');
      }
      boxes.forEach((b, i) => {
        b.ang += wrapAngle(b.dir * Math.PI / 4 - b.ang) * clamp(dt * 14, 0, 1);
        if (half && time - b.popAt > 120) {
          b.x += (b.kickX - b.x) * clamp(dt * 9, 0, 1);
          b.y += (b.kickY - b.y) * clamp(dt * 9, 0, 1);
          targets[i].moveTo(b.x, b.y - 16);
        }
      });
    },

    npcSeek() {
      if (!alive(player)) return null;
      const t = tk.now;
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        if (msUntil(i, t) > beatMs * (WARN_BEATS + 0.5) || !inLane(b, npc, 30)) continue;
        const a = b.dir * Math.PI / 4;
        const side = (npc.x - b.x) * -Math.sin(a) + (npc.y - b.y) * Math.cos(a) >= 0 ? 1 : -1;
        return { x: tk.clampX(npc.x - Math.sin(a) * side * 110), y: tk.clampY(npc.y + Math.cos(a) * side * 110) };
      }
      if (Math.floor(t / 3800) % 2) return null;
      let best: Box | null = null, bd = Infinity;
      for (const b of boxes) {
        if (inLane(b, player)) continue;
        const d = dist(b.x, b.y, player.x, player.y);
        if (d < bd) { bd = d; best = b; }
      }
      if (!best) return null;
      const d = Math.max(1, dist(best.x, best.y, player.x, player.y));
      return { x: tk.clampX(best.x + ((best.x - player.x) / d) * 70), y: tk.clampY(best.y + ((best.y - player.y) / d) * 70) };
    },

    drawGround(g, time) {
      boxes.forEach((b, i) => {
        const ms = msUntil(i, time);
        const k = clamp(1 - ms / (beatMs * WARN_BEATS), 0, 1);
        if (k <= 0 && time - b.popAt > 300) return;
        const [s, e] = laneEnds(b);
        const a = b.dir * Math.PI / 4, nx = -Math.sin(a), ny = Math.cos(a);
        const live = time - b.popAt < 300;
        g.fillStyle(live ? b.color : LATEX, live ? 0.22 : 0.05 + k * 0.1);
        g.fillPoints([{ x: s.x + nx * HALF_W, y: s.y + ny * HALF_W }, { x: e.x + nx * HALF_W, y: e.y + ny * HALF_W },
          { x: e.x - nx * HALF_W, y: e.y - ny * HALF_W }, { x: s.x - nx * HALF_W, y: s.y - ny * HALF_W }], true);
        // Chalked edges, dashed, and chevrons walking out toward the lane's end.
        for (const side of [-1, 1]) {
          for (let u = 0; u < LANE - 20; u += 22) {
            const p0 = { x: s.x + Math.cos(a) * u + nx * HALF_W * side, y: s.y + Math.sin(a) * u + ny * HALF_W * side };
            g.lineStyle(2, LATEX_LIT, 0.25 + k * 0.6);
            g.lineBetween(p0.x, p0.y, p0.x + Math.cos(a) * 12, p0.y + Math.sin(a) * 12);
          }
        }
        for (let c = 0; c < 4; c++) {
          const u = 40 + ((c * 70 + time * 0.12 * k) % (LANE - 60));
          const cx = s.x + Math.cos(a) * u, cy = s.y + Math.sin(a) * u;
          g.lineStyle(2.5, b.color, 0.3 + k * 0.5);
          g.lineBetween(cx - Math.cos(a) * 10 + nx * 14, cy - Math.sin(a) * 10 + ny * 14, cx, cy);
          g.lineBetween(cx - Math.cos(a) * 10 - nx * 14, cy - Math.sin(a) * 10 - ny * 14, cx, cy);
        }
      });
      for (const b of boxes) shadow(g, b.x, b.y + 2, BOX * 1.3, BOX * 0.4, 0.35);
    },

    drawAir(g, time) {
      const sorted = boxes.map((b, i) => ({ b, i })).sort((p, q) => p.b.y - q.b.y);
      for (const { b, i } of sorted) {
        const ms = msUntil(i, time);
        const k = clamp(1 - ms / (beatMs * WARN_BEATS), 0, 1);
        drawBox(g, b, k, time);
      }
    },

    drawHud(g, time) {
      drawRoll(g, W / 2, top + 6, boxes, score, beat, clamp(1 - (nextBeat - time) / beatMs, 0, 1), time);
    },

    destroy() { for (const t of targets) t.remove(); },
  };
}

/** A tin jack-in-the-box: harlequin-painted sides, a crank on its flank, the lid hinged at the back. */
function drawBox(g: G, b: Box, warn: number, time: number): void {
  const shake = warn > 0 ? Math.sin(time / 22) * warn * 2.5 : 0;
  const x = b.x + shake, y = b.y, s = BOX;
  const popK = (time - b.popAt) / 900;
  const out = popK < 0 || popK > 1 ? 0 : popK < 0.1 ? popK / 0.1 : popK < 0.35 ? 1 : 1 - (popK - 0.35) / 0.65;
  // Front face with the harlequin diamonds.
  g.fillStyle(dim(b.color, 0.35), 1); g.fillRect(x - s / 2, y - s * 0.7, s, s * 0.7);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const cx = x - s / 2 + s / 8 + c * s / 4, cy = y - s * 0.7 + s * 0.175 + r * s * 0.35;
    g.fillStyle((r + c) % 2 ? TOY_YELLOW : lit(b.color, 0.1), 1);
    g.fillTriangle(cx, cy - s * 0.15, cx + s / 8, cy, cx, cy + s * 0.15);
    g.fillTriangle(cx, cy - s * 0.15, cx - s / 8, cy, cx, cy + s * 0.15);
  }
  g.lineStyle(2, BRASS_DARK, 1); g.strokeRect(x - s / 2, y - s * 0.7, s, s * 0.7);
  // Top face.
  g.fillStyle(lit(b.color, 0.15), 1);
  g.fillPoints([{ x: x - s / 2, y: y - s * 0.7 }, { x: x + s / 2, y: y - s * 0.7 }, { x: x + s / 2 - 6, y: y - s * 0.95 }, { x: x - s / 2 + 6, y: y - s * 0.95 }], true);
  // Crank on the side, turning with the roll.
  const ca = time / 120;
  const hx = x + s / 2 + 4, hy = y - s * 0.38;
  g.fillStyle(BRASS, 1); g.fillCircle(hx, hy, 4);
  g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(hx, hy, hx + Math.cos(ca) * 10, hy + Math.sin(ca) * 6);
  g.fillStyle(TOY_RED, 1); g.fillCircle(hx + Math.cos(ca) * 10, hy + Math.sin(ca) * 6, 3);
  // The lid: a brass arrow painted on it shows the way the jack will come out.
  const a = b.ang, lx = x, ly = y - s * 0.82;
  if (out <= 0) {
    g.fillStyle(BRASS_LIT, 0.9);
    g.fillTriangle(lx + Math.cos(a) * 14, ly + Math.sin(a) * 7, lx + Math.cos(a + 2.5) * 9, ly + Math.sin(a + 2.5) * 4.5, lx + Math.cos(a - 2.5) * 9, ly + Math.sin(a - 2.5) * 4.5);
  } else {
    // Lid flung back on its hinge.
    g.fillStyle(lit(b.color, 0.25), 1);
    g.fillPoints([{ x: lx - Math.cos(a) * 18 - 16, y: ly - 30 }, { x: lx - Math.cos(a) * 18 + 16, y: ly - 30 }, { x: lx + 16, y: ly }, { x: lx - 16, y: ly }], true);
    // The spring and the jester on the end of it.
    const reach = (LANE - 30) * out;
    const ex = lx + Math.cos(a) * reach, ey = ly + Math.sin(a) * reach + 10 * out;
    const coils = 10, nx = -Math.sin(a), ny = Math.cos(a);
    let px = lx, py = ly;
    for (let c = 1; c <= coils * 2; c++) {
      const t = c / (coils * 2);
      const qx = lx + (ex - lx) * t + nx * (c % 2 ? 7 : -7), qy = ly + (ey - ly) * t + ny * (c % 2 ? 7 : -7);
      g.lineStyle(3, IRON, 1); g.lineBetween(px, py, qx, qy);
      g.lineStyle(1, 0xb8bcc4, 1); g.lineBetween(px, py - 1, qx, qy - 1);
      px = qx; py = qy;
    }
    drawJester(g, ex, ey, a, b.color);
  }
  if (warn > 0.6) glow(g, x, y - s * 0.5, 40, b.color, 0.05 * warn, 2);
}

/** The jester: ruff, white face, red nose, three-pointed cap with bells, and a great red glove punching ahead. */
function drawJester(g: G, x: number, y: number, a: number, c: number): void {
  g.fillStyle(LATEX_LIT, 1);
  for (let k = 0; k < 8; k++) { const r = (k / 8) * Math.PI * 2; g.fillCircle(x + Math.cos(r) * 11, y + 6 + Math.sin(r) * 4, 5); }
  g.fillStyle(TIN, 1); g.fillCircle(x, y - 4, 11);
  g.fillStyle(0x222222, 1); g.fillCircle(x - 4, y - 6, 1.6); g.fillCircle(x + 4, y - 6, 1.6);
  g.fillStyle(TOY_RED, 1); g.fillCircle(x, y - 2, 3);
  g.lineStyle(1.5, TOY_RED, 1); g.beginPath(); g.arc(x, y - 1, 6, 0.4, Math.PI - 0.4, false); g.strokePath();
  for (const [dx, cc] of [[-11, c], [0, TOY_YELLOW], [11, c]] as [number, number][]) {
    g.fillStyle(cc, 1); g.fillTriangle(x - 7 + dx * 0.5, y - 12, x + 7 + dx * 0.5, y - 12, x + dx * 1.6, y - 28);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + dx * 1.6, y - 28, 2.5);
  }
  const gx = x + Math.cos(a) * 20, gy = y - 2 + Math.sin(a) * 12;
  g.fillStyle(dim(TOY_RED, 0.3), 1); g.fillCircle(gx + 1, gy + 1, 10);
  g.fillStyle(TOY_RED, 1); g.fillCircle(gx, gy, 9);
  g.fillStyle(lit(TOY_RED, 0.4), 1); g.fillCircle(gx - 3, gy - 3, 3);
  g.fillStyle(LATEX_LIT, 1); g.fillRect(gx - Math.cos(a) * 10 - 4, gy - Math.sin(a) * 6 - 3, 8, 6);
}

/** The punched paper roll: a row of holes per box scrolling to the reading bar; a brass crank turns it. */
function drawRoll(g: G, cx: number, y: number, boxes: Box[], score: number[][], beat: number, frac: number, time: number): void {
  const rows = boxes.length, step = 22, ahead = 12;
  const w = step * ahead + 40, h = rows * 8 + 10, x0 = cx - w / 2;
  g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 6, y - 4, w + 30, h + 8, 5);
  g.fillStyle(LATEX, 1); g.fillRect(x0, y, w, h);
  g.fillStyle(LATEX_DARK, 0.6); for (let k = 0; k < 6; k++) g.fillRect(x0 + ((k * 61 - time * 0.02 * 22) % w + w) % w, y, 1, h);
  const barX = x0 + 26;
  for (let d = 0; d <= ahead; d++) {
    const col = score[(beat + d) % 16];
    const bx = barX + (d - frac) * step;
    if (bx < x0 + 4 || bx > x0 + w - 4) continue;
    for (const i of col) {
      if (i >= rows) continue;
      g.fillStyle(0x1a1716, 1); g.fillRoundedRect(bx - 6, y + 5 + i * 8, 12, 5, 2);
      g.fillStyle(boxes[i].color, 0.9); g.fillRoundedRect(bx - 5, y + 6 + i * 8, 10, 3, 1);
    }
  }
  g.lineStyle(2, TOY_RED, 1); g.lineBetween(barX, y - 3, barX, y + h + 3);
  // Spools at each end, and the crank.
  for (const sx of [x0 - 3, x0 + w + 3]) { g.fillStyle(BRASS_DARK, 1); g.fillRect(sx - 3, y - 3, 6, h + 6); }
  const hx = x0 + w + 16, hy = y + h / 2, a = time / 160;
  g.fillStyle(BRASS, 1); g.fillCircle(hx, hy, 5);
  g.lineStyle(2.5, BRASS_LIT, 1); g.lineBetween(hx, hy, hx + Math.cos(a) * 9, hy + Math.sin(a) * 9);
  g.fillStyle(TOY_PINK, 1); g.fillCircle(hx + Math.cos(a) * 9, hy + Math.sin(a) * 9, 2.5);
}

export const FALLEN_POP_WEASEL: GimmickDef = {
  id: ID,
  rules: 'A paper roll cranks the tune: when a box\'s hole reaches the bar its jack punches down its lane. Strike a box to turn it a notch at your foe.',
  make,
};
