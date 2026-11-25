import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { mulberry, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { dustPuff, shard } from '../art';
import {
  CHALK, DUST, EARTH_DARK, GRANITE, GRANITE_DARK, GRANITE_DEEP, GRANITE_LIT, LICHEN, REGENT, REGENT_LIT, SANDSTONE_DARK,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Not One Step — Gethin, called the Shoulder: Prince Bould's sworn man on the Moot table.
 *
 * The Moot table is the great flat stone at the heart of the old ring where Stonehold once settled
 * its quarrels by shoving: two men on the stone, and whoever went off the edge into the pit lost.
 * In the star's telling Gethin stood on that stone for the Prince every quarter-day and shoved
 * the households' champions off it one by one, and was never moved a step.
 *
 * You fight on the table. Every blow you take adds to your *give* (the tablet top left): the more
 * give, the further each blow shoves you, away from whoever struck. Walk to the edge and the lip
 * stops you — but be *shoved* over it and you fall into the pit: hurt, held, your give knocked out
 * of you, and you climb back at the rim. Every few seconds Gethin lowers his shoulder and charges
 * down a scuffed lane: it shoves hard.
 *
 * His blows go by the same law. Hit him enough and he flies further; and a charge keeps going —
 * stand with your back to the edge, step aside at the last moment, and his own charge carries
 * him off the table. Halfway down his give never fades and every shove carries further. The bot
 * keeps to the middle and works round to the inside of you when you near the edge.
 */

const ID = fallenId('stonehold', 'not-one-step');
const DECAY = 6;
const CHARGE_V = 640;

interface Body { give: number; vx: number; vy: number; flungUntil: number; down: boolean; climbAt: number; fellAt: number; falls: number }
interface Puff { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 8;
  const rx = W / 2 - 90, ry = (H - top) / 2 - 62;
  const bodies = new Map<Fighter, Body>([player, npc].map((f) => [f, { give: 0, vx: 0, vy: 0, flungUntil: 0, down: false, climbAt: 0, fellAt: -1e9, falls: 0 }]));
  const puffs: Puff[] = [];
  let internal = false;
  let late = false;
  let started = false;
  let nextCharge = 0;
  let warnAt = 0;
  let chargeDir = { x: 1, y: 0 };
  let chargeLeft = 0;
  let chargeHit = false;

  const rad = (x: number, y: number) => Math.hypot((x - cx) / rx, (y - cy) / ry);
  const B = (f: Fighter): Body => bodies.get(f) as Body;
  const other = (f: Fighter): Fighter => (f === player ? npc : player);

  function shove(f: Fighter, dx: number, dy: number, mag: number): void {
    const b = B(f);
    const d = Math.hypot(dx, dy) || 1;
    const m = Math.min(300, mag * (late ? 1.25 : 1));
    b.vx += (dx / d) * m * DECAY; b.vy += (dy / d) * m * DECAY;
    b.flungUntil = tk.now + 380;
  }

  function hurt(f: Fighter, amount: number): void {
    if (internal || amount <= 0 || B(f).down) return;
    const b = B(f);
    b.give += amount;
    const o = other(f);
    shove(f, f.x - o.x, f.y - o.y, amount * (0.5 + b.give / 45));
  }

  function fall(f: Fighter): void {
    const b = B(f);
    b.down = true; b.fellAt = tk.now; b.climbAt = tk.now + 1150; b.give = 0; b.vx = 0; b.vy = 0; b.falls++;
    internal = true;
    if (f === player) tk.hitPlayer(20, f.x, f.y);
    else { ctx.hit(npc, 38, f.x, f.y); ctx.float(f.x, f.y - 50, 'OFF THE STONE', '#e8d2a8'); }
    internal = false;
    ctx.stun(f, 1150);
    ctx.sfx('stone-slam');
    puffs.push({ x: f.x, y: f.y, at: tk.now });
  }

  return {
    update(time, rawDt) {
      const dt = stepDt(rawDt);
      if (!started) { started = true; nextCharge = time + 3800; }
      if (!late && npc.hp < npc.maxHp * 0.5) { late = true; ctx.banner('GIVE NEVER FADES', '#e8d2a8'); ctx.sfx('roar'); }
      // The shoulder charge: warn down a lane, then go, and keep going.
      if (!warnAt && !chargeLeft && time >= nextCharge && alive(npc) && !B(npc).down) {
        warnAt = time;
        const d = dist(npc.x, npc.y, player.x, player.y) || 1;
        chargeDir = { x: (player.x - npc.x) / d, y: (player.y - npc.y) / d };
        chargeLeft = Math.max(260, d + 150);
        chargeHit = false;
        ctx.sfx('roar');
      }
      if (warnAt && time >= warnAt + tk.warn(900)) { warnAt = 0; ctx.sfx('whoosh'); }
      if (!warnAt && chargeLeft > 0) {
        if (B(npc).down || !alive(npc)) chargeLeft = 0;
        else {
          const step = Math.min(chargeLeft, CHARGE_V * dt);
          ctx.nudge(npc, chargeDir.x * step, chargeDir.y * step);
          B(npc).flungUntil = time + 200;
          chargeLeft -= step;
          if (!chargeHit && alive(player) && dist(npc.x, npc.y, player.x, player.y) < 46) {
            chargeHit = true;
            tk.hitPlayer(12, player.x, player.y);
            shove(player, chargeDir.x, chargeDir.y, 80 + B(player).give * 1.1);
            ctx.sfx('hit-heavy');
          }
          if (chargeLeft <= 0) nextCharge = time + (late ? 4400 : 5600);
        }
        if (chargeLeft <= 0 && nextCharge < time) nextCharge = time + (late ? 4400 : 5600);
      }
      for (const [f, b] of bodies) {
        if (!alive(f)) continue;
        if (!late) b.give = Math.max(0, b.give - 3 * dt);
        if (b.down) {
          if (time >= b.climbAt) {
            const r = rad(f.x, f.y) || 1;
            ctx.nudge(f, cx + (f.x - cx) * (0.88 / r) - f.x, cy + (f.y - cy) * (0.88 / r) - f.y);
            b.down = false;
          }
          continue;
        }
        if (b.vx || b.vy) {
          ctx.nudge(f, b.vx * dt, b.vy * dt);
          const k = Math.exp(-DECAY * dt);
          b.vx *= k; b.vy *= k;
          if (Math.hypot(b.vx, b.vy) < 20) { b.vx = 0; b.vy = 0; }
        }
        const r = rad(f.x, f.y);
        if (r > 1) {
          if (time < b.flungUntil) fall(f);
          else ctx.nudge(f, cx + (f.x - cx) * (0.99 / r) - f.x, cy + (f.y - cy) * (0.99 / r) - f.y);
        }
      }
      while (puffs.length && time - puffs[0].at > 900) puffs.shift();
    },

    onPlayerHurt(amount) { hurt(player, amount); },
    onNpcHurt(amount) { hurt(npc, amount); },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      if (rad(npc.x, npc.y) > 0.74) return { x: cx, y: cy };
      const rp = rad(player.x, player.y);
      if (rp > 0.55) {
        const d = dist(player.x, player.y, cx, cy) || 1;
        return { x: player.x + ((cx - player.x) / d) * 110, y: player.y + ((cy - player.y) / d) * 110 };
      }
      return null;
    },

    drawGround(g, time) {
      drawPit(g, W, H, top);
      drawTable(g, cx, cy, rx, ry);
      for (const p of puffs) dustPuff(g, p.x, p.y, (time - p.at) / 900, 34, DUST);
      if (warnAt || chargeLeft > 0) drawLane(g, npc.x, npc.y, chargeDir, chargeLeft || 400, warnAt ? clamp((time - warnAt) / tk.warn(900), 0, 1) : 1, time);
    },

    drawAir(g, time) {
      for (const [f, b] of bodies) {
        if (b.down && alive(f)) {
          // Down in the pit: dust still settling, chips of the lip coming down after them.
          for (let i = 0; i < 4; i++) {
            const k = ((time - b.fellAt) / 500 + i * 0.25) % 1;
            shard(g, f.x - 18 + i * 12, f.y - 40 + k * 40, 3, time / 120 + i, SANDSTONE_DARK);
          }
        }
        if (time < b.flungUntil && !b.down && Math.hypot(b.vx, b.vy) > 160) {
          const sp = Math.hypot(b.vx, b.vy), ux = b.vx / sp, uy = b.vy / sp;
          for (let i = -1; i <= 1; i++) { g.lineStyle(2, 0xffffff, 0.35); g.lineBetween(f.x - ux * 24 - uy * i * 9, f.y - uy * 24 + ux * i * 9, f.x - ux * 52 - uy * i * 9, f.y - uy * 52 + ux * i * 9); }
        }
      }
    },

    drawHud(g) {
      drawGive(g, W / 2 - 128, top + 6, B(player).give, B(player).falls, 0x5a8ad0);
      drawGive(g, W / 2 + 22, top + 6, B(npc).give, B(npc).falls, 0xd06048);
    },
  };
}

/** The pit round the table: dark trodden earth, scree, the scuffs of a hundred men who went off. */
function drawPit(g: G, W: number, H: number, top: number): void {
  const rng = mulberry(77);
  g.fillStyle(EARTH_DARK, 1); g.fillRect(0, top, W, H - top);
  g.fillStyle(0x000000, 0.25); g.fillRect(0, top, W, H - top);
  for (let i = 0; i < 90; i++) { g.fillStyle(i % 3 ? 0x4e3e2c : 0x6e5a40, 0.8); g.fillCircle(rng() * W, top + rng() * (H - top), 1.5 + rng() * 3); }
}

/** The Moot table: one great flat stone, cup-and-ring marks cut in it, the edge dressed, a lip all round. */
function drawTable(g: G, cx: number, cy: number, rx: number, ry: number): void {
  const rng = mulberry(41);
  g.fillStyle(0x000000, 0.4); g.fillEllipse(cx + 4, cy + 16, rx * 2 + 10, ry * 2 + 18);
  g.fillStyle(GRANITE_DEEP, 1); g.fillEllipse(cx, cy + 10, rx * 2, ry * 2);
  g.fillStyle(GRANITE_DARK, 1); g.fillEllipse(cx, cy + 4, rx * 2, ry * 2);
  g.fillStyle(GRANITE, 1); g.fillEllipse(cx, cy, rx * 2, ry * 2);
  g.fillStyle(GRANITE_LIT, 0.22); g.fillEllipse(cx - rx * 0.2, cy - ry * 0.2, rx * 1.3, ry * 1.2);
  // Tool-dressed band round the edge.
  g.lineStyle(10, GRANITE_LIT, 0.2); g.strokeEllipse(cx, cy, rx * 2 - 12, ry * 2 - 12);
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * (rx - 4), y1 = cy + Math.sin(a) * (ry - 4);
    g.lineStyle(1, GRANITE_DEEP, 0.35); g.lineBetween(x1, y1, cx + Math.cos(a) * (rx - 14), cy + Math.sin(a) * (ry - 14));
  }
  // Cup-and-ring marks: the old people's carving, worn soft.
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2, r = 0.25 + rng() * 0.55;
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    g.fillStyle(GRANITE_DEEP, 0.6); g.fillEllipse(x, y, 8, 5);
    for (let k = 1; k <= 2 + (i % 2); k++) { g.lineStyle(1.4, GRANITE_DEEP, 0.4); g.strokeEllipse(x, y, 8 + k * 9, 5 + k * 6); }
    g.lineStyle(1.2, GRANITE_DEEP, 0.35); g.lineBetween(x, y, x + Math.cos(a) * 30, y + Math.sin(a) * 18);
  }
  // The champions' marks at the heart: two worn foot-hollows and the Prince's seal over the old ring.
  g.lineStyle(2, CHALK, 0.3); g.strokeEllipse(cx, cy, 120, 70);
  g.fillStyle(GRANITE_DEEP, 0.5); g.fillEllipse(cx - 20, cy, 12, 22); g.fillEllipse(cx + 20, cy, 12, 22);
  g.lineStyle(2, REGENT, 0.55); g.strokeCircle(cx, cy - 2, 16);
  g.fillStyle(REGENT, 0.5); g.fillRect(cx - 6, cy - 10, 12, 14);
  g.fillStyle(LICHEN, 0.5);
  for (let i = 0; i < 16; i++) { const a = rng() * Math.PI * 2; g.fillCircle(cx + Math.cos(a) * rx * 0.92, cy + Math.sin(a) * ry * 0.9, 2 + rng() * 3); }
  // Cracks.
  for (let i = 0; i < 5; i++) {
    let x = cx + (rng() - 0.5) * rx * 1.4, y = cy + (rng() - 0.5) * ry * 1.2;
    for (let k = 0; k < 4; k++) { const nx = x + (rng() - 0.5) * 40, ny = y + (rng() - 0.5) * 24; g.lineStyle(1, GRANITE_DEEP, 0.55); g.lineBetween(x, y, nx, ny); x = nx; y = ny; }
  }
}

/** The charge lane: scuffed dust between two scored edges, shoulder chevrons running down it. */
function drawLane(g: G, x: number, y: number, d: { x: number; y: number }, len: number, k: number, time: number): void {
  const nx = -d.y, ny = d.x, hw = 30;
  const P = (u: number, s: number) => ({ x: x + d.x * u + nx * s, y: y + d.y * u + ny * s });
  g.fillStyle(DUST, 0.1 + k * 0.14); g.fillPoints([P(0, -hw), P(len, -hw), P(len, hw), P(0, hw)], true);
  for (const s of [-hw, hw]) { const a = P(0, s), b = P(len, s); g.lineStyle(2, REGENT_LIT, 0.3 + k * 0.5); g.lineBetween(a.x, a.y, b.x, b.y); }
  for (let u = ((time / 6) % 40); u < len; u += 40) {
    const a = P(u, -16), b = P(u + 14, 0), c = P(u, 16);
    g.lineStyle(3, 0xffe8c0, 0.25 + k * 0.45); g.lineBetween(a.x, a.y, b.x, b.y); g.lineBetween(b.x, b.y, c.x, c.y);
  }
}

/** A give tablet: a slab of stone whose bar fills and cracks as the blows mount; notches for falls. */
function drawGive(g: G, x: number, y: number, give: number, falls: number, tint: number): void {
  const w = 106, h = 18;
  g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 4);
  g.fillStyle(GRANITE_DARK, 1); g.fillRoundedRect(x, y, w, h, 3);
  const k = clamp(give / 150, 0, 1);
  g.fillStyle(tint, 0.85); g.fillRect(x + 3, y + 3, (w - 6) * k, h - 6);
  g.fillStyle(0xffffff, 0.25); g.fillRect(x + 3, y + 3, (w - 6) * k, 3);
  for (let i = 0; i < Math.floor(k * 6); i++) {
    const cx = x + 10 + i * 16;
    g.lineStyle(1.2, 0x1a1410, 0.9); g.lineBetween(cx, y + 2, cx + 4, y + 9); g.lineBetween(cx + 4, y + 9, cx + 1, y + h - 2);
  }
  for (let i = 0; i < Math.min(falls, 8); i++) { g.fillStyle(CHALK, 0.9); g.fillRect(x + 3 + i * 5, y + h + 4, 2, 6); }
}

export const FALLEN_NOT_ONE_STEP: GimmickDef = {
  id: ID,
  rules: 'Blows build give: the more give, the further each blow shoves. Shoved off the table, you fall. He charges — step aside at the edge and he goes over.',
  make,
};
