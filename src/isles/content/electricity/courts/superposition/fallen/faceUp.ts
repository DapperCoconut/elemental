import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { crownGlyph, gridCoil } from '../art';
import {
  BASALT, BASALT_DARK, BASALT_LIT, BRASS, BRASS_DARK, BRASS_LIT, COPPER, COPPER_DARK, COPPER_LIT, GROUT,
  STATE_A, STATE_A_LIT, STATE_B, STATE_B_LIT, WELL, WELL_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Neither Face Up — Fountain-Keeper Mehitabel Spurge.
 *
 * Either Square's fountain is full of coins that landed on their edges, and the court says a coin
 * in the air is both faces at once. In the King's telling Spurge is the keeper who settled the
 * Grid's undecided cases with a toss: heads, the house stays lit; tails, it goes dark. She never
 * once let a coin land on its own.
 *
 * The rule: she tosses great copper coins out of her fountain at the top of the yard. Each one
 * flies to a landing shadow, spinning heads-tails-heads, and nobody knows which face it will show
 * until it lands. **Heads** slams down flat and crushes the shadow. **Tails** lands on its edge and
 * rolls away down the chalked axis drawn through the shadow — either way along it. So stand clear
 * of the shadow *and* the axis. Strike a coin's shadow while it flies to **call** it: it is tails,
 * and it rolls away from you — down a fresh axis through the shadow, straight at whoever stands
 * beyond. Past half she plays double or nothing: every coin lands both ways at once, crushing and
 * then rolling.
 *
 * The bot stands behind a coin from you and calls it so it rolls at you; it steps off any shadow or
 * axis it stands on.
 */

const ID = fallenId('superposition', 'face-up');
const FLIGHT_MS = 1500;
const CRUSH_R = 54;
const ROLL_HALF = 22;
const ROLL_SPEED = 360;
const SPIN_UP = 450;

interface Coin {
  sx: number; sy: number; lx: number; ly: number;
  ang: number; dir: 1 | -1 | 0;
  tossAt: number; called: 'player' | 'npc' | null;
  target: StrikeTarget | null;
  state: 'air' | 'roll' | 'done';
  rx: number; ry: number; rolled: number; landedAt: number;
  hit: Set<Fighter>;
}
interface Mark { x: number; y: number; at: number; heads: boolean }
interface Page { face: 'heads' | 'tails' | 'both'; called: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const fountain: Pt = { x: W / 2, y: top + 34 };
  const coins: Coin[] = [];
  const marks: Mark[] = [];
  const book: Page[] = [];
  let nextToss = 0;
  let started = false;
  let doubled = false;
  let aimAtPlayer = true;

  const axisDist = (c: Coin, x: number, y: number) => Math.abs((x - c.lx) * -Math.sin(c.ang) + (y - c.ly) * Math.cos(c.ang));
  const along = (c: Coin, x: number, y: number) => (x - c.lx) * Math.cos(c.ang) + (y - c.ly) * Math.sin(c.ang);
  const flightK = (c: Coin, time: number) => clamp((time - c.tossAt) / FLIGHT_MS, 0, 1);

  function hurt(f: Fighter, pAmt: number, nAmt: number, x: number, y: number): void {
    if (!alive(f)) return;
    if (f === player) tk.hitPlayer(pAmt, x, y); else ctx.hit(npc, nAmt, x, y);
  }

  function toss(time: number): void {
    const f = aimAtPlayer || !alive(npc) ? player : npc;
    aimAtPlayer = !aimAtPlayer;
    const a = rng() * Math.PI * 2, d = rng() * 50;
    const lx = clamp(f.x + Math.cos(a) * d, 70, W - 70);
    const ly = clamp(f.y + Math.sin(a) * d, top + 110, H - 60);
    const c: Coin = {
      sx: fountain.x, sy: fountain.y, lx, ly, ang: rng() * Math.PI, dir: 0, tossAt: time + SPIN_UP, called: null,
      target: null, state: 'air', rx: lx, ry: ly, rolled: 0, landedAt: 0, hit: new Set(),
    };
    c.target = ctx.target({
      x: fountain.x, y: fountain.y, r: 26, passThrough: true,
      onStruck: (by) => {
        if (c.called || c.state !== 'air' || ctx.scene.time.now < c.tossAt) return;
        const s = by === 'player' ? player : npc;
        c.called = by;
        c.ang = Math.atan2(c.ly - s.y, c.lx - s.x);
        c.dir = 1;
        ctx.flash(c.target?.x ?? c.lx, c.target?.y ?? c.ly, BRASS_LIT);
        ctx.sfx('dice');
        c.target?.remove(); c.target = null;
      },
    });
    coins.push(c);
    ctx.sfx('jackpot');
  }

  function land(c: Coin, time: number): void {
    c.target?.remove(); c.target = null;
    const face: Page['face'] = c.called ? 'tails' : doubled ? 'both' : rng() < 0.5 ? 'heads' : 'tails';
    const heads = face !== 'tails';
    const tails = face !== 'heads';
    if (heads) {
      ctx.sfx('stone-slam');
      marks.push({ x: c.lx, y: c.ly, at: time, heads: true });
      for (const f of [player, npc]) if (dist(f.x, f.y, c.lx, c.ly) < CRUSH_R) hurt(f, 24, 30, c.lx, c.ly);
    }
    book.unshift({ face, called: !!c.called });
    if (book.length > 8) book.pop();
    if (tails) {
      if (!c.dir) c.dir = rng() < 0.5 ? 1 : -1;
      c.state = 'roll'; c.rx = c.lx; c.ry = c.ly; c.rolled = 0; c.landedAt = time;
      if (!heads) marks.push({ x: c.lx, y: c.ly, at: time, heads: false });
      ctx.sfx('clang');
    } else c.state = 'done';
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextToss = time + 1400; }
      if (!doubled && npc.hp < npc.maxHp * 0.5) {
        doubled = true;
        ctx.banner('DOUBLE OR NOTHING', '#f4dc94');
        ctx.sfx('jackpot');
      }
      if (time >= nextToss) {
        nextToss = time + (doubled ? 1750 : 2150);
        if (coins.filter((c) => c.state === 'air').length < 3) toss(time);
      }
      for (const c of coins) {
        if (c.state === 'air') {
          const k = flightK(c, time);
          c.target?.moveTo(c.sx + (c.lx - c.sx) * k, c.sy + (c.ly - c.sy) * k);
          if (time >= c.tossAt + FLIGHT_MS) land(c, time);
        } else if (c.state === 'roll') {
          const step = ROLL_SPEED * dt;
          c.rx += Math.cos(c.ang) * c.dir * step; c.ry += Math.sin(c.ang) * c.dir * step; c.rolled += step;
          for (const f of [player, npc]) {
            if (c.hit.has(f) || !alive(f) || dist(f.x, f.y, c.rx, c.ry) > ROLL_HALF + 20) continue;
            c.hit.add(f);
            hurt(f, 20, 26, c.rx, c.ry);
            const s = (f.x - c.rx) * -Math.sin(c.ang) + (f.y - c.ry) * Math.cos(c.ang) >= 0 ? 1 : -1;
            ctx.nudge(f, -Math.sin(c.ang) * 38 * s, Math.cos(c.ang) * 38 * s);
          }
          if (c.rolled > 900 || c.rx < 24 || c.rx > W - 24 || c.ry < top + 6 || c.ry > H - 8) c.state = 'done';
        }
      }
      for (let i = coins.length - 1; i >= 0; i--) if (coins[i].state === 'done') coins.splice(i, 1);
      for (let i = marks.length - 1; i >= 0; i--) if (time - marks[i].at > 1800) marks.splice(i, 1);
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      const keep = (p: Pt): Pt => ({ x: clamp(p.x, 70, W - 70), y: clamp(p.y, top + 70, H - 50) });
      // Off any shadow or axis first.
      for (const c of coins) {
        if (c.state === 'air') {
          const inShadow = dist(npc.x, npc.y, c.lx, c.ly) < CRUSH_R + 34;
          const onAxis = axisDist(c, npc.x, npc.y) < ROLL_HALF + 34 && (!c.dir || along(c, npc.x, npc.y) * c.dir > -20);
          if (inShadow || onAxis) {
            const s = (npc.x - c.lx) * -Math.sin(c.ang) + (npc.y - c.ly) * Math.cos(c.ang) >= 0 ? 1 : -1;
            return keep({ x: c.lx - Math.sin(c.ang) * 110 * s, y: c.ly + Math.cos(c.ang) * 110 * s });
          }
        } else if (c.state === 'roll' && along(c, npc.x, npc.y) * c.dir > along(c, c.rx, c.ry) * c.dir && axisDist(c, npc.x, npc.y) < ROLL_HALF + 34) {
          const s = (npc.x - c.lx) * -Math.sin(c.ang) + (npc.y - c.ly) * Math.cos(c.ang) >= 0 ? 1 : -1;
          return keep({ x: npc.x - Math.sin(c.ang) * 90 * s, y: npc.y + Math.cos(c.ang) * 90 * s });
        }
      }
      // Call a coin from the far side so it rolls at the player.
      for (const c of coins) {
        if (c.state !== 'air' || c.called || !c.target || time < c.tossAt || time > c.tossAt + FLIGHT_MS - 350) continue;
        if (dist(c.lx, c.ly, npc.x, npc.y) > 300) continue;
        const a = Math.atan2(c.ly - player.y, c.lx - player.x);
        return keep({ x: c.target.x + Math.cos(a) * 70, y: c.target.y + Math.sin(a) * 70 });
      }
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return keep({ x: player.x + Math.cos(a) * 240, y: player.y + Math.sin(a) * 240 });
    },

    drawGround(g, time) {
      fountainBasin(g, fountain.x, fountain.y, time);
      for (const m of marks) {
        const k = clamp((time - m.at) / 1800, 0, 1);
        if (m.heads) {
          g.lineStyle(2, GROUT, 0.8 * (1 - k));
          for (let i = 0; i < 9; i++) {
            const a = i * 0.7 + m.x;
            g.lineBetween(m.x + Math.cos(a) * 16, m.y + Math.sin(a) * 10, m.x + Math.cos(a) * (40 + (i % 3) * 10), m.y + Math.sin(a) * (26 + (i % 2) * 8));
          }
          g.lineStyle(2, COPPER_DARK, 0.6 * (1 - k)); g.strokeEllipse(m.x, m.y, CRUSH_R * 1.6, CRUSH_R);
        } else {
          g.lineStyle(3, COPPER_DARK, 0.5 * (1 - k)); g.lineBetween(m.x - 8, m.y, m.x + 8, m.y);
        }
      }
      for (const c of coins) {
        if (c.state !== 'air') continue;
        const k = time < c.tossAt ? 0 : flightK(c, time);
        // The axis: dashed across the yard, chevrons both ways until called.
        const cx = Math.cos(c.ang), cy = Math.sin(c.ang);
        const col = c.called ? (c.called === 'player' ? STATE_B : STATE_A) : BRASS;
        for (let s = -620; s < 620; s += 26) {
          if (c.dir && s < -CRUSH_R) continue;
          const x0 = c.lx + cx * s, y0 = c.ly + cy * s;
          if (x0 < 20 || x0 > W - 20 || y0 < top || y0 > H) continue;
          g.lineStyle(2, col, 0.22 + k * 0.3); g.lineBetween(x0, y0, x0 + cx * 13, y0 + cy * 13);
        }
        for (const s of c.dir ? [1] : [-1, 1]) {
          for (let j = 1; j <= 2; j++) {
            const bx = c.lx + cx * s * (CRUSH_R + 18 * j), by = c.ly + cy * s * (CRUSH_R + 18 * j);
            const nx = -cy * 8, ny = cx * 8;
            g.lineStyle(2, col, 0.4 + k * 0.4);
            g.lineBetween(bx - cx * s * 7 + nx, by - cy * s * 7 + ny, bx, by); g.lineBetween(bx - cx * s * 7 - nx, by - cy * s * 7 - ny, bx, by);
          }
        }
        // Its shadow at the landing spot, darkening, and its travelling shadow underneath.
        g.fillStyle(0x000000, 0.12 + k * 0.28); g.fillEllipse(c.lx, c.ly, CRUSH_R * 2 * (0.5 + k * 0.5), CRUSH_R * 1.3 * (0.5 + k * 0.5));
        g.lineStyle(1.5, c.called ? col : STATE_A, 0.4 + k * 0.5); g.strokeEllipse(c.lx, c.ly, CRUSH_R * 2, CRUSH_R * 1.3);
        if (c.target) { g.fillStyle(0x000000, 0.25); g.fillEllipse(c.target.x, c.target.y, 30, 12); g.lineStyle(1, BRASS_LIT, 0.5); g.strokeEllipse(c.target.x, c.target.y, 34, 14); }
      }
    },

    drawAir(g, time) {
      // The next coin spinning up over the spout.
      const pending = coins.find((c) => c.state === 'air' && time < c.tossAt);
      if (pending) coinFace(g, fountain.x, fountain.y - 52, time, 1);
      for (const c of coins) {
        if (c.state === 'air' && time >= c.tossAt) {
          const k = flightK(c, time);
          const gx = c.sx + (c.lx - c.sx) * k, gy = c.sy + (c.ly - c.sy) * k;
          coinFace(g, gx, gy - 40 - Math.sin(k * Math.PI) * 130, time, 0.9 + Math.sin(k * Math.PI) * 0.4, c.called !== null);
        } else if (c.state === 'roll') rollingCoin(g, c, time);
      }
    },

    drawHud(g) {
      // Spurge's book: the last eight tosses, newest on the left.
      const x0 = 18, y0 = H - 34;
      g.fillStyle(0x0c0b10, 0.72); g.fillRoundedRect(x0 - 8, y0 - 16, 8 * 22 + 8, 32, 6);
      g.lineStyle(1, BRASS_DARK, 1); g.strokeRoundedRect(x0 - 8, y0 - 16, 8 * 22 + 8, 32, 6);
      book.forEach((p, i) => {
        const x = x0 + 4 + i * 22;
        g.fillStyle(COPPER_DARK, 1); g.fillCircle(x, y0 + 1, 9);
        g.fillStyle(p.face === 'tails' ? COPPER : COPPER_LIT, 1); g.fillCircle(x, y0, 9);
        if (p.face === 'both') {
          g.fillStyle(COPPER, 1); g.slice(x, y0, 9, -Math.PI / 2, Math.PI / 2, false); g.fillPath();
          crownGlyph(g, x - 3, y0 + 3, 3.5, COPPER_DARK, 0.9); gridCoil(g, x + 4, y0, 2.2, COPPER_DARK, 0.9);
        } else if (p.face === 'heads') crownGlyph(g, x, y0 + 3, 5, COPPER_DARK, 0.9);
        else gridCoil(g, x, y0, 3.2, COPPER_DARK, 0.9);
        g.lineStyle(1.5, p.called ? BRASS_LIT : p.face === 'heads' ? STATE_A : p.face === 'tails' ? STATE_B : 0x9a6cff, 1); g.strokeCircle(x, y0, 9);
      });
    },

    destroy() { for (const c of coins) c.target?.remove(); },
  };
}

/** Spurge's fountain set into the north wall: basalt basin, lit violet water, a copper spout. */
function fountainBasin(g: G, x: number, y: number, time: number): void {
  shadow(g, x, y + 22, 170, 34, 0.35);
  g.fillStyle(BASALT_DARK, 1); g.fillEllipse(x, y + 8, 168, 54);
  g.fillStyle(BASALT_LIT, 1); g.fillEllipse(x, y + 4, 160, 48);
  g.fillStyle(WELL, 1); g.fillEllipse(x, y + 4, 138, 36);
  for (let i = 0; i < 3; i++) {
    const ph = ((time / 1400) + i / 3) % 1;
    g.lineStyle(1, WELL_LIT, 0.5 * (1 - ph)); g.strokeEllipse(x, y + 4, 20 + ph * 110, 6 + ph * 28);
  }
  for (let k = 0; k < 12; k++) {
    const a = k * 2.4, d = 18 + ((k * 31) % 44);
    g.fillStyle(k % 3 ? COPPER : BRASS, 0.75); g.fillRect(x + Math.cos(a) * d - 1, y + 4 + Math.sin(a) * d * 0.3 - 3, 2, 6);
  }
  g.fillStyle(BASALT, 1); g.fillRect(x - 9, y - 30, 18, 34);
  g.fillStyle(BASALT_LIT, 1); g.fillRect(x - 9, y - 30, 4, 34);
  g.fillStyle(COPPER_DARK, 1); g.fillRect(x - 14, y - 34, 28, 6);
  g.fillStyle(COPPER, 1); g.fillRect(x - 14, y - 34, 28, 3);
  for (let i = 0; i < 5; i++) {
    const ph = ((time / 600) + i / 5) % 1;
    g.fillStyle(lit(WELL_LIT, 0.4), 0.6 * (1 - ph)); g.fillCircle(x + (i - 2) * 6 * ph, y - 30 + ph * ph * 36 - ph * 10, 1.6);
  }
}

/** A great copper coin turning in the air: its width breathes as it spins, heads (crown) then tails (coil). */
function coinFace(g: G, x: number, y: number, time: number, s: number, called = false): void {
  const k = Math.cos(time / 70);
  const heads = called ? false : k > 0;
  const w = (Math.abs(k) * 34 + 4) * s, h = 36 * s;
  glow(g, x, y, 30 * s, heads ? STATE_A : STATE_B, 0.06, 3);
  g.fillStyle(COPPER_DARK, 1); g.fillEllipse(x + 1.5, y + 2, w + 3, h + 2);
  g.fillStyle(heads ? COPPER_LIT : COPPER, 1); g.fillEllipse(x, y, w, h);
  if (w > 14) {
    g.lineStyle(1, dim(COPPER, 0.3), 0.9); g.strokeEllipse(x, y, w * 0.78, h * 0.78);
    if (heads) crownGlyph(g, x, y + 5 * s, w * 0.22, COPPER_DARK, 0.85);
    else gridCoil(g, x, y, w * 0.12, COPPER_DARK, 0.85);
  }
  // Milling on the rim.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.lineStyle(1, COPPER_DARK, 0.7);
    g.lineBetween(x + Math.cos(a) * w * 0.47, y + Math.sin(a) * h * 0.47, x + Math.cos(a) * w * 0.5, y + Math.sin(a) * h * 0.5);
  }
  g.lineStyle(1.5, called ? BRASS_LIT : heads ? STATE_A_LIT : STATE_B_LIT, 0.9); g.strokeEllipse(x, y, w, h);
}

/** A coin rolling on its edge down its axis: a narrow upright disc, a turning notch, scuffed dust behind. */
function rollingCoin(g: G, c: Coin, time: number): void {
  const bx = -Math.cos(c.ang) * c.dir, by = -Math.sin(c.ang) * c.dir;
  for (let i = 1; i <= 6; i++) {
    g.fillStyle(0xd8d0b8, 0.18 - i * 0.025); g.fillCircle(c.rx + bx * i * 12 + Math.sin(time / 50 + i) * 3, c.ry + by * i * 12, 5 - i * 0.5);
  }
  g.lineStyle(2, COPPER_LIT, 0.35); g.lineBetween(c.rx, c.ry, c.rx + bx * 70, c.ry + by * 70);
  shadow(g, c.rx, c.ry + 2, 34, 9, 0.35);
  const lean = Math.cos(c.ang) * c.dir * 0.3;
  const cy = c.ry - 24;
  g.fillStyle(COPPER_DARK, 1); g.fillEllipse(c.rx + lean * 6, cy, 14, 46);
  g.fillStyle(COPPER, 1); g.fillEllipse(c.rx + lean * 6 - 2, cy, 11, 44);
  g.fillStyle(COPPER_LIT, 1); g.fillEllipse(c.rx + lean * 6 - 3, cy - 6, 4, 22);
  const spin = (c.rolled / 22) % (Math.PI * 2);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(c.rx + lean * 6 - 2, cy + Math.sin(spin) * 18, 2.5);
  g.lineStyle(1.5, STATE_B_LIT, 0.8); g.strokeEllipse(c.rx + lean * 6 - 2, cy, 11, 44);
}

export const FALLEN_FACE_UP: GimmickDef = {
  id: ID,
  rules: 'Coins fly from the fountain: heads crushes its shadow, tails rolls down its axis. Strike one in flight: tails, rolling away from you.',
  make,
};
