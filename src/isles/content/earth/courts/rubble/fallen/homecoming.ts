import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, lit, mixC, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ashlar, crack } from '../art';
import { DUST, DUST_DARK, DUST_LIT, LIME, LIME_DARK, LIME_LIT, SCREE_DARK, TESS_BLUE } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Stones Go Home — Mender Perpetua Haske, the court's restorer: in the King's telling, the woman who
 * put back only what the Regent wanted standing (his gate, his seals, his walls round the interred)
 * and let the rest of the capital lie.
 *
 * Her trade is time run backwards. Rubble lies about the yard in drifts. Every few seconds the
 * hourglass turns: a gold line runs from each stone to the place in the old wall it fell from, the
 * stones shiver, and then they fly home along their lines — striking whoever stands on one. The wall
 * stands again, whole: no body crosses it and no shot goes through it. Its keystone sits on top.
 *
 * Strike the keystone and the wall falls *away from whoever struck it*, flattening a band on the far
 * side (a short warning shows the band). Left alone, it slumps back to rubble where it stood. Either
 * way the stones lie where they fell, and next turn they fly to a different wall. So the clever
 * player hides behind the wall while it stands, lets Perpetua take the far side, and knocks it on
 * her. Halfway down she mends two walls at once, crossing. The bot stays off the lines while they
 * glow, hides behind the standing wall, and strikes it when you are on the far side.
 */

const ID = fallenId('rubble', 'homecoming');
const STONES = 7;
const STONE_R = 14;
const LIE_MS = 3000;
const LINE_MS = 1350;
const FLY_MS = 460;
const STAND_MS = 4800;
const TIP_MS = 750;
const BAND = 130;

interface Stone { x: number; y: number; fx: number; fy: number; hx: number; hy: number; seed: number; hit: Set<Fighter> }
interface Wall {
  a: Pt; b: Pt; nx: number; ny: number;
  stones: Stone[];
  key: StrikeTarget | null;
  /** +1 / -1: the side of the wall it is falling onto; 0 while it stands. */
  fallSide: number;
  tipAt: number;
  fell: boolean;
}

type Phase = 'lie' | 'line' | 'fly' | 'stand' | 'down';

/** The walls of the old capital she mends, in turn (arena coords). */
const PLANS: [Pt, Pt][] = [
  [{ x: 330, y: 340 }, { x: 630, y: 340 }],
  [{ x: 480, y: 190 }, { x: 480, y: 500 }],
  [{ x: 300, y: 230 }, { x: 640, y: 470 }],
  [{ x: 300, y: 470 }, { x: 650, y: 230 }],
];

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  let phase: Phase = 'lie';
  let phaseAt = 0;
  let plan = 0;
  let twin = false;
  let started = false;
  let walls: Wall[] = [];
  /** Rubble lying about, waiting for its next wall. */
  let loose: Pt[] = [];

  const scatter = (): Pt => ({ x: 80 + rng() * (W - 160), y: top + 50 + rng() * (H - top - 100) });

  function buildWalls(): void {
    const n = twin ? 2 : 1;
    const out: Wall[] = [];
    for (let w = 0; w < n; w++) {
      const [a, b] = PLANS[(plan + w * 2) % PLANS.length];
      const len = dist(a.x, a.y, b.x, b.y);
      const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      const stones: Stone[] = [];
      for (let i = 0; i < STONES; i++) {
        const k = (i + 0.5) / STONES;
        const from = loose.shift() ?? scatter();
        stones.push({ x: from.x, y: from.y, fx: from.x, fy: from.y, hx: a.x + (b.x - a.x) * k, hy: a.y + (b.y - a.y) * k, seed: rng() * 9, hit: new Set() });
      }
      out.push({ a, b, nx, ny, stones, key: null, fallSide: 0, tipAt: 0, fell: false });
    }
    walls = out;
    plan = (plan + 1) % PLANS.length;
  }

  const mid = (w: Wall): Pt => ({ x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 });
  /** Signed distance of a point from the wall's line along its normal. */
  const side = (w: Wall, x: number, y: number) => (x - w.a.x) * w.nx + (y - w.a.y) * w.ny;
  /** Along the wall, 0..1. */
  const along = (w: Wall, x: number, y: number) => {
    const dx = w.b.x - w.a.x, dy = w.b.y - w.a.y;
    return ((x - w.a.x) * dx + (y - w.a.y) * dy) / (dx * dx + dy * dy);
  };
  const inBand = (w: Wall, x: number, y: number) => {
    const s = side(w, x, y) * w.fallSide, t = along(w, x, y);
    return s > -10 && s < BAND && t > -0.04 && t < 1.04;
  };

  function strike(f: Fighter, s: Stone): void {
    if (s.hit.has(f)) return;
    s.hit.add(f);
    if (f === player) tk.hitPlayer(15, s.x, s.y);
    else { ctx.hit(npc, 22, s.x, s.y); ctx.float(npc.x, npc.y - 54, 'STONED', '#e6d2a8'); }
    ctx.sfx('rock-throw');
  }

  function topple(w: Wall, by: Fighter): void {
    if (w.fallSide || phase !== 'stand') return;
    const m = mid(w);
    w.fallSide = side(w, m.x, m.y) - side(w, by.x, by.y) >= 0 ? 1 : -1;
    if (Math.abs(side(w, by.x, by.y)) < 2) w.fallSide = 1;
    w.tipAt = tk.now + tk.warn(TIP_MS);
    w.key?.remove(); w.key = null;
    ctx.sfx('stone-rise');
  }

  function crash(w: Wall): void {
    w.fell = true;
    ctx.sfx('quake');
    for (const f of [player, npc]) {
      if (!alive(f) || !inBand(w, f.x, f.y)) continue;
      if (f === player) tk.hitPlayer(24, f.x, f.y);
      else { ctx.hit(npc, 36, f.x, f.y); ctx.float(npc.x, npc.y - 60, 'WALLED', '#ffd08a'); }
      ctx.stun(f, 500);
    }
    // The stones lie where the wall came down.
    for (const s of w.stones) {
      const d = 20 + rng() * (BAND - 30);
      loose.push({ x: clamp(s.hx + w.nx * w.fallSide * d + (rng() - 0.5) * 30, 60, W - 60), y: clamp(s.hy + w.ny * w.fallSide * d, top + 40, H - 40) });
    }
  }

  function slump(w: Wall): void {
    w.key?.remove(); w.key = null;
    for (const s of w.stones) loose.push({ x: clamp(s.hx + (rng() - 0.5) * 160, 60, W - 60), y: clamp(s.hy + (rng() - 0.5) * 160, top + 40, H - 40) });
  }

  const go = (p: Phase, time: number) => { phase = p; phaseAt = time; };

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; for (let i = 0; i < STONES; i++) loose.push(scatter()); buildWalls(); go('lie', time); }
      if (!twin && npc.hp < npc.maxHp * 0.5) { twin = true; ctx.banner('SHE MENDS TWO WALLS', '#e6d2a8'); ctx.sfx('time-warp'); }
      const t = time - phaseAt;
      if (phase === 'lie' && t > LIE_MS) { go('line', time); ctx.sfx('clock-tick'); }
      else if (phase === 'line' && t > tk.warn(LINE_MS)) { go('fly', time); ctx.sfx('time-warp'); }
      else if (phase === 'fly') {
        const k = clamp(t / FLY_MS, 0, 1);
        const e = k * k;
        for (const w of walls) for (const s of w.stones) {
          s.x = s.fx + (s.hx - s.fx) * e; s.y = s.fy + (s.hy - s.fy) * e;
          for (const f of [player, npc]) if (alive(f) && !ctx.isAirborne(f) && dist(s.x, s.y, f.x, f.y) < STONE_R + 20) strike(f, s);
        }
        if (k >= 1) {
          go('stand', time);
          ctx.sfx('stone-slam');
          for (const w of walls) {
            const m = mid(w);
            w.key = ctx.target({ x: m.x, y: m.y - 8, r: 22, onStruck: (by) => topple(w, by === 'player' ? player : npc) });
          }
        }
      } else if (phase === 'stand') {
        for (const w of walls) {
          if (w.fell) continue;
          // A whole wall: bodies are shoved back to their side, shots stop on it.
          for (const f of [player, npc]) {
            if (!alive(f) || segDist(f.x, f.y, w.a.x, w.a.y, w.b.x, w.b.y) > 34) continue;
            const s = side(w, f.x, f.y), push = (34 - Math.abs(s)) * (s >= 0 ? 1 : -1);
            const tt = along(w, f.x, f.y);
            if (tt > 0 && tt < 1) ctx.nudge(f, w.nx * push, w.ny * push);
          }
          const m = mid(w);
          for (const sh of ctx.shotsNear(m.x, m.y, 200)) if (segDist(sh.x, sh.y, w.a.x, w.a.y, w.b.x, w.b.y) < 16) sh.block();
          if (w.fallSide && time >= w.tipAt) crash(w);
        }
        const allDown = walls.every((w) => w.fell);
        if (allDown || t > STAND_MS) {
          for (const w of walls) if (!w.fell) { if (w.fallSide) crash(w); else slump(w); }
          go('down', time);
          if (!allDown) ctx.sfx('land');
        }
      } else if (phase === 'down' && t > 700) {
        buildWalls();
        go('lie', time);
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      if (phase === 'line' || phase === 'fly') {
        // Off every glowing line, the short way.
        for (const w of walls) for (const s of w.stones) {
          if (segDist(npc.x, npc.y, s.fx, s.fy, s.hx, s.hy) > 46) continue;
          const dx = s.hx - s.fx, dy = s.hy - s.fy, l = Math.hypot(dx, dy) || 1;
          const sg = (npc.x - s.fx) * -dy + (npc.y - s.fy) * dx >= 0 ? 1 : -1;
          return { x: tk.clampX(npc.x - (dy / l) * sg * 80), y: tk.clampY(npc.y + (dx / l) * sg * 80) };
        }
        return null;
      }
      if (phase === 'stand') {
        for (const w of walls) {
          if (w.fell) continue;
          if (w.fallSide && inBand(w, npc.x, npc.y)) {
            const m = mid(w);
            return { x: tk.clampX(m.x - w.nx * w.fallSide * 80), y: tk.clampY(m.y - w.ny * w.fallSide * 80) };
          }
          // Wall between us, at the keystone, so a cast of hers drops it on you.
          const ps = side(w, player.x, player.y);
          const pt = along(w, player.x, player.y);
          if (pt > -0.1 && pt < 1.1 && Math.abs(ps) < BAND + 40) {
            const m = mid(w), sg = ps >= 0 ? -1 : 1;
            return { x: tk.clampX(m.x + w.nx * sg * 70), y: tk.clampY(m.y + w.ny * sg * 70) };
          }
        }
      }
      return null;
    },

    drawGround(g, time) {
      const t = time - phaseAt;
      for (const w of walls) {
        // The old footing, chalked faintly where the wall will stand again.
        if (phase === 'lie' || phase === 'line') {
          g.lineStyle(30, DUST_DARK, 0.22); g.lineBetween(w.a.x, w.a.y, w.b.x, w.b.y);
          for (let i = 0; i <= STONES; i++) {
            const k = i / STONES, x = w.a.x + (w.b.x - w.a.x) * k, y = w.a.y + (w.b.y - w.a.y) * k;
            g.lineStyle(1.5, DUST_LIT, 0.4); g.lineBetween(x - w.nx * 15, y - w.ny * 15, x + w.nx * 15, y + w.ny * 15);
          }
        }
        if (phase === 'line' || phase === 'fly') for (const s of w.stones) drawLine(g, s, phase === 'line' ? clamp(t / LINE_MS, 0, 1) : 1, time);
        if (phase === 'stand' && w.fallSide && !w.fell) drawBand(g, w, clamp(1 - (w.tipAt - time) / TIP_MS, 0, 1));
      }
    },

    drawAir(g, time) {
      const t = time - phaseAt;
      for (const w of walls) {
        if (phase === 'lie' || phase === 'line' || phase === 'fly') {
          for (const s of w.stones) drawStone(g, s, phase === 'line' ? Math.sin(time / 30 + s.seed) * 2 * clamp(t / LINE_MS, 0, 1) : 0, phase === 'fly');
        } else if (phase === 'stand' && !w.fell) {
          const tip = w.fallSide ? clamp(1 - (w.tipAt - time) / TIP_MS, 0, 1) : 0;
          drawWall(g, w, tip, time);
        } else if (phase === 'down') {
          // Dust where it came down.
          const k = clamp(t / 700, 0, 1), m = mid(w);
          for (let i = 0; i < 10; i++) {
            const a = i * 0.63, r = 30 + k * 120;
            g.fillStyle(DUST_LIT, 0.4 * (1 - k)); g.fillCircle(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r * 0.5 - k * 20, 14 + k * 18);
          }
        }
      }
      if (phase === 'lie' && t < 700) for (const p of loose) { g.fillStyle(DUST, 0.3 * (1 - t / 700)); g.fillCircle(p.x, p.y, 20); }
    },

    drawHud(g, time) {
      // The hourglass: sand runs down while the rubble lies, turns over when time runs back.
      const x = W / 2, y = top + 20, t = time - phaseAt;
      const k = phase === 'lie' ? clamp(t / LIE_MS, 0, 1) : phase === 'line' ? 1 : phase === 'stand' ? clamp(t / STAND_MS, 0, 1) : 0;
      const flip = phase === 'line' ? clamp(t / LINE_MS, 0, 1) * Math.PI : phase === 'stand' ? Math.PI : 0;
      const c = Math.cos(flip);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 16, y - 20, 32, 40, 6);
      g.lineStyle(3, LIME_DARK, 1); g.lineBetween(x - 12, y - 17, x + 12, y - 17); g.lineBetween(x - 12, y + 17, x + 12, y + 17);
      g.fillStyle(0xdfe8ee, 0.25);
      g.fillTriangle(x - 10, y - 15 * c, x + 10, y - 15 * c, x, y); g.fillTriangle(x - 10, y + 15 * c, x + 10, y + 15 * c, x, y);
      const sand = 0xe0b860;
      const up = 1 - k, sgn = c >= 0 ? 1 : -1;
      g.fillStyle(sand, 1);
      g.fillTriangle(x - 10 * up, y - sgn * 15 * up, x + 10 * up, y - sgn * 15 * up, x, y);
      g.fillTriangle(x - 10, y + sgn * 15, x + 10, y + sgn * 15, x, y + sgn * 15 * (1 - k));
      if (k > 0 && k < 1) { g.lineStyle(1, sand, 1); g.lineBetween(x, y, x, y + sgn * 14); }
      if (twin) { g.fillStyle(sand, 1); g.fillCircle(x + 24, y - 10, 3); g.fillCircle(x + 24, y, 3); }
    },

    destroy() { for (const w of walls) w.key?.remove(); },
  };
}

/** A gold line from a stone to its place in the wall, grains of sand running home along it. */
function drawLine(g: G, s: Stone, k: number, time: number): void {
  const gold = 0xf0c870;
  g.lineStyle(10, gold, 0.08 + k * 0.1); g.lineBetween(s.fx, s.fy, s.hx, s.hy);
  g.lineStyle(2, gold, 0.4 + k * 0.5); g.lineBetween(s.fx, s.fy, s.hx, s.hy);
  const len = dist(s.fx, s.fy, s.hx, s.hy);
  for (let i = 0; i < len / 26; i++) {
    const ph = ((time / 600) + i * 26 / len) % 1;
    g.fillStyle(0xffe8b0, 0.8 * k); g.fillCircle(s.fx + (s.hx - s.fx) * ph, s.fy + (s.hy - s.fy) * ph, 1.8);
  }
  g.lineStyle(2, gold, 0.6 * k); g.strokeCircle(s.hx, s.hy, 9 + Math.sin(time / 90 + s.seed) * 2);
}

/** A fallen block of the wall: dressed stone, mortar still on one face, a mason's mark. */
function drawStone(g: G, s: Stone, shake: number, flying: boolean): void {
  if (!flying) shadow(g, s.x, s.y + 2, 34, 10, 0.3);
  else { g.fillStyle(0xf0c870, 0.25); g.fillCircle(s.x, s.y - 8, 22); }
  ashlar(g, s.x + shake, s.y + (flying ? -6 : 0), 26, 18, ((s.seed * 10) | 0) % 2 ? LIME : LIME_DARK);
  g.fillStyle(DUST_LIT, 0.8); g.fillRect(s.x + shake - 13, s.y - 4 + (flying ? -6 : 0), 26, 3);
  g.lineStyle(1, LIME_DARK, 1);
  const mx = s.x + shake - 4, my = s.y - 12 + (flying ? -6 : 0);
  g.lineBetween(mx - 3, my, mx + 3, my); g.lineBetween(mx, my - 3, mx, my + 3);
}

/** The band a falling wall will flatten: a dark shadow growing as the wall leans over it. */
function drawBand(g: G, w: Wall, k: number): void {
  const pts = [w.a, w.b, { x: w.b.x + w.nx * w.fallSide * BAND, y: w.b.y + w.ny * w.fallSide * BAND }, { x: w.a.x + w.nx * w.fallSide * BAND, y: w.a.y + w.ny * w.fallSide * BAND }];
  g.fillStyle(0x000000, 0.12 + k * 0.3); g.fillPoints(pts, true);
  g.lineStyle(3, 0xffb050, 0.5 + k * 0.5); g.strokePoints(pts, true);
  for (let i = 0; i < 6; i++) {
    const tt = (i + 0.5) / 6, x = w.a.x + (w.b.x - w.a.x) * tt, y = w.a.y + (w.b.y - w.a.y) * tt;
    crack(g, x, y, BAND * (0.5 + k * 0.5), Math.atan2(w.ny * w.fallSide, w.nx * w.fallSide) + (i % 2 ? 0.2 : -0.2), SCREE_DARK, 0.6, 1.5);
  }
}

/** The wall stood up again: three courses of dressed stone, the keystone on top, a blue tile frieze. */
function drawWall(g: G, w: Wall, tip: number, time: number): void {
  const len = dist(w.a.x, w.a.y, w.b.x, w.b.y);
  const ux = (w.b.x - w.a.x) / len, uy = (w.b.y - w.a.y) / len;
  const lean = tip * 40 * w.fallSide;
  const n = Math.max(6, Math.round(len / 34));
  for (let i = 0; i < n; i++) {
    const k = (i + 0.5) / n, x = w.a.x + ux * len * k, y = w.a.y + uy * len * k;
    shadow(g, x, y + 4, 40, 12, 0.3);
    for (let c = 0; c < 3; c++) {
      const off = c * (lean / 3);
      ashlar(g, x + (c % 2 ? 6 : 0) + w.nx * off, y - c * 16 + w.ny * off, 34, 16, c === 1 ? LIME_DARK : LIME, (i + c) % 3 === 0);
    }
    g.fillStyle(TESS_BLUE, 0.9); g.fillRect(x - 15 + w.nx * lean, y - 52 + w.ny * lean, 30, 4);
    g.fillStyle(lit(TESS_BLUE, 0.3), 1); g.fillRect(x - 15 + w.nx * lean, y - 52 + w.ny * lean, 6, 4);
  }
  // The keystone: a wedge of honey stone, gold-lit while it can be struck.
  const mx = (w.a.x + w.b.x) / 2 + w.nx * lean, my = (w.a.y + w.b.y) / 2 - 56 + w.ny * lean;
  if (!w.fallSide) glow(g, mx, my, 26, 0xf0c870, 0.05 + Math.sin(time / 200) * 0.02, 3);
  g.fillStyle(mixC(LIME_LIT, 0xf0c870, 0.4), 1);
  g.fillPoints([{ x: mx - 14, y: my - 12 }, { x: mx + 14, y: my - 12 }, { x: mx + 9, y: my + 8 }, { x: mx - 9, y: my + 8 }], true);
  g.lineStyle(1.5, LIME_DARK, 1);
  g.strokePoints([{ x: mx - 14, y: my - 12 }, { x: mx + 14, y: my - 12 }, { x: mx + 9, y: my + 8 }, { x: mx - 9, y: my + 8 }], true);
  // An hourglass cut in its face.
  g.lineBetween(mx - 4, my - 7, mx + 4, my + 3); g.lineBetween(mx + 4, my - 7, mx - 4, my + 3); g.lineBetween(mx - 4, my - 7, mx + 4, my - 7);
  if (tip > 0) for (let i = 0; i < 5; i++) { g.fillStyle(DUST, 0.6); g.fillCircle(mx + (i - 2) * 30, my + 40 + ((time / 4 + i * 37) % 40), 2.5); }
}

export const FALLEN_HOMECOMING: GimmickDef = {
  id: ID,
  rules: 'Time runs back: rubble flies home along gold lines and the wall stands again. Strike its keystone and it falls away from you. At half, two walls.',
  make,
};
