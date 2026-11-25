import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { SAND_DARK, SAND_DEEP, STONE, STONE_DARK, STONE_DEEP, STONE_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT, WATER, WATER_DEEP, WATER_LIT } from '../palette';
import { alive, clamp, dist, wrapAngle } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Down the Qanat — Samir, Qanat-Keeper: in the star's telling the man who keeps the old city's
 * buried water-channel, and who opens its sluice to the Palace of Winds and never to the dunes.
 *
 * A qanat runs under the yard: a tunnel bored from a mother well, its line marked on the surface
 * by a row of shaft-mouths, each a ring of spoil with a windlass over it. Step into a mouth and you
 * climb down and crawl the tunnel, coming up out of the next shaft along (out of reach while you
 * crawl) — a way across the yard, and a way out of trouble. Each fighter's legs need a moment
 * before the next climb.
 *
 * Samir opens the sluice. The well-head rattles; then a surge of water runs the tunnel, and every
 * shaft it passes spouts a geyser that hurts and throws whoever stands at its mouth. Anyone caught
 * crawling is swept to the far end and spat out. The exploit: strike a shaft's windlass to cap it.
 * A capped shaft holds — and its pressure bursts out of the next one along, twice the spout. Cap
 * the shaft before the one Samir is standing at. At half the water runs back: the sluice opens at
 * the far end and the tunnel carries you the other way. The bot steps off a mouth the surge is
 * coming for, caps the shaft before yours, and climbs down a shaft to close the distance.
 */

const ID = fallenId('dunesea', 'qanat');
const MOUTH = 17;
const CRAWL_MS = 650;
const SURGE_SPEED = 300;
const SPOUT_R = 52;
const LIMBER_MS = 2600;

interface Shaft { x: number; y: number; capped: boolean; spoutAt: number; spoutR: number; target: StrikeTarget | null }
interface Crawl { f: Fighter; to: number; at: number; swept: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const sx = (k: number) => 110 + (W - 220) * k;
  const shafts: Shaft[] = [0, 0.25, 0.5, 0.75, 1].map((k, i) => ({
    x: sx(k), y: top + 110 + (H - top - 230) * k + (i % 2 ? -26 : 26), capped: false, spoutAt: -1e9, spoutR: SPOUT_R, target: null,
  }));
  let dir = 1;
  let surgeEvery = 7200;
  let nextSurge = 0;
  let warnAt = 0;
  let frontAt = 0;
  let pressure = 0;
  let passed = -1;
  let reversed = false;
  let started = false;
  const crawls: Crawl[] = [];
  const limber = new Map<Fighter, number>([[player, 0], [npc, 0]]);

  const first = () => (dir > 0 ? 0 : shafts.length - 1);
  const along = (i: number) => (dir > 0 ? i : shafts.length - 1 - i);
  /** Distance down the tunnel (from the open sluice) to shaft i. */
  function chain(i: number): number {
    let d = 0;
    for (let j = 0; j < along(i); j++) { const a = shafts[dir > 0 ? j : shafts.length - 1 - j], b = shafts[dir > 0 ? j + 1 : shafts.length - 2 - j]; d += dist(a.x, a.y, b.x, b.y); }
    return d;
  }
  const frontDist = (time: number) => (frontAt ? (time - frontAt) / 1000 * SURGE_SPEED : -1);
  const windlass = (s: Shaft): Pt => ({ x: s.x + 30, y: s.y - 18 });

  shafts.forEach((s) => {
    const w = windlass(s);
    s.target = ctx.target({
      x: w.x, y: w.y, r: 18, passThrough: true,
      onStruck: (by) => {
        if (s.capped) return;
        s.capped = true; ctx.sfx('clang');
        ctx.float(s.x, s.y - 40, by === 'player' ? 'CAPPED' : 'HE CAPS IT', '#9ae0d8');
      },
    });
  });

  function spout(s: Shaft, time: number): void {
    if (s.capped) { s.capped = false; pressure++; ctx.sfx('shield-block'); return; }
    const k = pressure; pressure = 0;
    s.spoutAt = time; s.spoutR = SPOUT_R + 24 * k;
    ctx.sfx(k ? 'geyser' : 'water-jet');
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, s.x, s.y) > s.spoutR + 14) continue;
      const a = Math.atan2(f.y - s.y, f.x - s.x);
      ctx.nudge(f, Math.cos(a) * 60, Math.sin(a) * 60);
      if (f === player) tk.hitPlayer(16 + 12 * k, f.x, f.y);
      else { ctx.hit(npc, 26 + 16 * k, f.x, f.y); ctx.float(f.x, f.y - 52, k ? 'DOUBLE SPOUT' : 'SPOUTED', '#9ae0d8'); }
    }
  }

  function climbDown(f: Fighter, i: number, time: number): void {
    let to = i + dir;
    let ms = CRAWL_MS;
    if (to < 0 || to >= shafts.length) { to = first(); ms = CRAWL_MS * 1.8; }
    ctx.airborne(f, ms); ctx.root(f, ms);
    limber.set(f, time + ms + LIMBER_MS);
    crawls.push({ f, to, at: time + ms, swept: false });
    ctx.sfx('land');
  }

  return {
    update(time) {
      if (!started) { started = true; nextSurge = time + 3800; }
      if (!reversed && npc.hp < npc.maxHp * 0.5) {
        reversed = true; dir = -1; surgeEvery = 5600;
        warnAt = 0; frontAt = 0; pressure = 0; nextSurge = time + 2600;
        ctx.banner('THE WATER RUNS BACK', '#9ae0d8'); ctx.sfx('time-warp');
      }

      // Climbing down: a fighter standing in a mouth, legs ready, drops in.
      for (const f of [player, npc]) {
        if (!alive(f) || time < (limber.get(f) ?? 0) || crawls.some((c) => c.f === f)) continue;
        const i = shafts.findIndex((s) => !s.capped && dist(f.x, f.y, s.x, s.y) < MOUTH);
        if (i >= 0) climbDown(f, i, time);
      }
      for (let i = crawls.length - 1; i >= 0; i--) {
        const c = crawls[i];
        if (time < c.at) continue;
        crawls.splice(i, 1);
        if (!alive(c.f)) continue;
        const to = c.swept ? (dir > 0 ? shafts.length - 1 : 0) : c.to;
        const s = shafts[to];
        const ox = s.x < W / 2 ? 38 : -38;
        ctx.nudge(c.f, s.x + ox - c.f.x, s.y + 24 - c.f.y);
        if (c.swept) {
          if (c.f === player) tk.hitPlayer(20, s.x, s.y); else ctx.hit(npc, 30, s.x, s.y);
          ctx.stun(c.f, 600); ctx.sfx('splash');
        }
      }

      // The sluice: rattle, then a surge down the tunnel spouting every shaft it passes.
      if (!warnAt && !frontAt && time >= nextSurge) { warnAt = time; passed = -1; ctx.sfx('gear-turn'); }
      if (warnAt && time >= warnAt + tk.warn(1300)) { warnAt = 0; frontAt = time; ctx.sfx('rain'); }
      if (frontAt) {
        const fd = frontDist(time);
        for (let k = passed + 1; k < shafts.length; k++) {
          const i = dir > 0 ? k : shafts.length - 1 - k;
          if (chain(i) > fd) break;
          passed = k; spout(shafts[i], time);
        }
        for (const c of crawls) c.swept = true;
        if (passed >= shafts.length - 1) { frontAt = 0; pressure = 0; nextSurge = time + surgeEvery; }
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      const fd = frontDist(tk.now);
      const running = warnAt > 0 || frontAt > 0;
      // The surge is coming: off any mouth it has not reached yet.
      if (running) {
        for (let i = 0; i < shafts.length; i++) {
          const s = shafts[i];
          if (fd >= 0 && chain(i) <= fd) continue;
          if (dist(npc.x, npc.y, s.x, s.y) < s.spoutR + 60) {
            const a = Math.atan2(npc.y - s.y, npc.x - s.x);
            return { x: tk.clampX(s.x + Math.cos(a) * 140), y: tk.clampY(s.y + Math.sin(a) * 140) };
          }
        }
      }
      // You stand at a mouth: cap the shaft before yours, so yours spouts double.
      for (let i = 0; i < shafts.length; i++) {
        const s = shafts[i], prev = shafts[i - dir];
        if (!prev || prev.capped || dist(player.x, player.y, s.x, s.y) > 90) continue;
        const w = windlass(prev);
        if (dist(npc.x, npc.y, w.x, w.y) < 260) return { x: w.x + 18, y: w.y + 26 };
      }
      // Far from you: climb down a shaft that comes up nearer.
      if (!running && dist(npc.x, npc.y, player.x, player.y) > 380 && tk.now >= (limber.get(npc) ?? 0)) {
        for (let i = 0; i < shafts.length; i++) {
          const s = shafts[i], out = shafts[clamp(i + dir, 0, shafts.length - 1)];
          if (s.capped || dist(npc.x, npc.y, s.x, s.y) > 170) continue;
          if (dist(out.x, out.y, player.x, player.y) < dist(npc.x, npc.y, player.x, player.y) - 120) return { x: s.x, y: s.y };
        }
      }
      return null;
    },

    drawGround(g, time) {
      const fd = frontDist(time);
      // The tunnel's line under the sand, wet behind the front.
      for (let k = 0; k < shafts.length - 1; k++) {
        const a = shafts[k], b = shafts[k + 1];
        const n = Math.ceil(dist(a.x, a.y, b.x, b.y) / 14);
        for (let j = 0; j < n; j++) { const t = j / n; g.fillStyle(SAND_DEEP, 0.28); g.fillCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 3); }
      }
      if (fd >= 0) drawWet(g, shafts, dir, fd, time);
      drawHead(g, shafts[first()], dir, warnAt ? clamp((time - warnAt) / 1300, 0, 1) : 0, time);
      shafts.forEach((s, i) => {
        const ahead = fd >= 0 && chain(i) > fd && chain(i) - fd < 180;
        drawMouth(g, s, time, ahead || (warnAt > 0 && i === first()));
      });
      for (const c of crawls) { const s = shafts[c.to]; g.fillStyle(SAND_DARK, 0.5); g.fillCircle(s.x, s.y, MOUTH + Math.sin(time / 50) * 2); }
    },

    drawAir(g, time) {
      for (const s of shafts) {
        drawWindlass(g, s, time);
        const k = (time - s.spoutAt) / 750;
        if (k >= 0 && k < 1) drawSpout(g, s.x, s.y, s.spoutR, k, time);
      }
    },

    drawHud(g) {
      const x0 = W / 2 - 64, y = top + 18;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 12, y - 13, 152, 26, 6);
      g.lineStyle(2, WATER_DEEP, 1); g.lineBetween(x0, y, x0 + 128, y);
      const fd = frontDist(tk.now);
      shafts.forEach((s, i) => {
        const x = x0 + i * 32;
        const wet = fd >= 0 && chain(i) <= fd;
        g.fillStyle(wet ? WATER_LIT : STONE_DARK, 1); g.fillCircle(x, y, 6);
        if (s.capped) { g.fillStyle(TIMBER_LIT, 1); g.fillRect(x - 7, y - 3, 14, 6); }
      });
      const ax = dir > 0 ? x0 + 132 : x0 - 4;
      g.fillStyle(warnAt ? WATER_LIT : WATER, 1);
      if (dir > 0) g.fillTriangle(ax, y - 5, ax, y + 5, ax + 7, y); else g.fillTriangle(ax, y - 5, ax, y + 5, ax - 7, y);
    },

    destroy() { for (const s of shafts) { s.target?.remove(); s.target = null; } },
  };
}

/** A shaft-mouth: a crater ring of old spoil, a mud-brick lip, and the dark well of the shaft. */
function drawMouth(g: G, s: Shaft, time: number, bubbling: boolean): void {
  g.fillStyle(SAND_DARK, 1); g.fillEllipse(s.x, s.y + 2, 84, 52);
  g.fillStyle(SAND_DEEP, 0.6); g.fillEllipse(s.x, s.y + 4, 64, 38);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const bx = s.x + Math.cos(a) * 24, by = s.y + Math.sin(a) * 17;
    g.fillStyle(i % 2 ? STONE : STONE_DARK, 1); g.fillRect(bx - 4, by - 3, 8, 6);
  }
  g.fillStyle(0x140c08, 1); g.fillEllipse(s.x, s.y, 36, 25);
  g.fillStyle(WATER_DEEP, 0.5); g.fillEllipse(s.x, s.y + 3, 24, 14);
  if (bubbling) for (let i = 0; i < 4; i++) { const ph = (time / 300 + i / 4) % 1; g.lineStyle(1.5, WATER_LIT, 1 - ph); g.strokeEllipse(s.x, s.y + 2, 8 + ph * 22, 5 + ph * 14); }
  if (s.capped) {
    for (let i = -2; i <= 2; i++) { g.fillStyle(i % 2 ? TIMBER : TIMBER_LIT, 1); g.fillRect(s.x - 22, s.y - 12 + i * 5, 44, 5); }
    g.lineStyle(1, TIMBER_DARK, 1); g.strokeRect(s.x - 22, s.y - 14, 44, 25);
    for (const [ox, oy] of [[-10, -4], [9, 3], [2, -8]]) { g.fillStyle(STONE_DARK, 1); g.fillCircle(s.x + ox, s.y + oy, 5); g.fillStyle(STONE_LIT, 1); g.fillCircle(s.x + ox - 1, s.y + oy - 1, 3); }
  }
}

/** The windlass: two forked posts, a crossbar wound with rope, a leather bucket swinging. */
function drawWindlass(g: G, s: Shaft, time: number): void {
  const x = s.x + 30, y = s.y - 18;
  shadow(g, x, y + 22, 40, 10, 0.25);
  for (const ox of [-16, 16]) {
    g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(x + ox, y + 20, x + ox, y - 14);
    g.lineBetween(x + ox, y - 14, x + ox - 5, y - 20); g.lineBetween(x + ox, y - 14, x + ox + 5, y - 20);
  }
  g.lineStyle(6, TIMBER, 1); g.lineBetween(x - 18, y - 16, x + 18, y - 16);
  for (let i = -3; i <= 3; i++) { g.lineStyle(1.5, 0xc4a478, 1); g.lineBetween(x + i * 3, y - 19, x + i * 3 + 2, y - 13); }
  g.lineStyle(3, TIMBER_DARK, 1); g.lineBetween(x + 18, y - 16, x + 26, y - 6);
  const sw = Math.sin(time / 500) * 3;
  g.lineStyle(1, 0xc4a478, 1); g.lineBetween(x - 2, y - 14, s.x + sw, s.y - 6);
  g.fillStyle(0x6a3e22, 1); g.fillRoundedRect(s.x + sw - 6, s.y - 8, 12, 9, 3);
}

/** The mother well at the open end: a stone well-head and its sluice board, juddering before a surge. */
function drawHead(g: G, s: Shaft, dir: number, warn: number, time: number): void {
  const x = s.x - dir * 70, y = s.y - 40;
  const j = warn > 0 ? Math.sin(time / 30) * 2 * warn : 0;
  g.fillStyle(SAND_DEEP, 0.4); g.fillEllipse(x, y + 8, 76, 34);
  g.fillStyle(STONE_DARK, 1); g.fillEllipse(x, y, 60, 30);
  g.fillStyle(STONE, 1); g.fillEllipse(x, y - 3, 56, 26);
  g.fillStyle(WATER_DEEP, 1); g.fillEllipse(x, y - 3, 38, 16);
  g.fillStyle(WATER, 0.8); g.fillEllipse(x + Math.sin(time / 400) * 3, y - 4, 22, 7);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x + dir * 24 - 5 + j, y - 26, 10, 30);
  g.fillStyle(TIMBER, 1); g.fillRect(x + dir * 24 - 3 + j, y - 24 - warn * 10, 6, 22);
  if (warn > 0) glow(g, x, y, 40, WATER_LIT, 0.05 * warn, 3);
}

/** The surge under the sand: a dark wet line behind the front, glinting at the front itself. */
function drawWet(g: G, shafts: Shaft[], dir: number, fd: number, time: number): void {
  let left = fd;
  const order = dir > 0 ? shafts : [...shafts].reverse();
  for (let k = 0; k < order.length - 1 && left > 0; k++) {
    const a = order[k], b = order[k + 1];
    const L = dist(a.x, a.y, b.x, b.y), t = Math.min(1, left / L);
    const ex = a.x + (b.x - a.x) * t, ey = a.y + (b.y - a.y) * t;
    g.lineStyle(14, SAND_DEEP, 0.45); g.lineBetween(a.x, a.y, ex, ey);
    g.lineStyle(4, WATER, 0.5); g.lineBetween(a.x, a.y, ex, ey);
    if (t < 1) { glow(g, ex, ey, 26, WATER_LIT, 0.08, 3); g.fillStyle(WATER_LIT, 0.8); g.fillCircle(ex + Math.sin(time / 40) * 2, ey, 5); }
    left -= L;
  }
}

/** A geyser out of a shaft: a white column, spray falling round it, mud splashed on the rim. */
function drawSpout(g: G, x: number, y: number, r: number, k: number, time: number): void {
  const h = (r * 2.2) * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - k * 0.6);
  g.fillStyle(WATER, 0.35 * (1 - k)); g.fillCircle(x, y, r);
  g.lineStyle(2, WATER_LIT, 0.8 * (1 - k)); g.strokeCircle(x, y, r * (0.7 + k * 0.4));
  for (let i = 0; i < 6; i++) {
    const w = 18 - i * 2.4;
    g.fillStyle(i % 2 ? WATER_LIT : 0xffffff, 0.85 * (1 - k)); g.fillEllipse(x + Math.sin(time / 50 + i) * 3, y - (h / 6) * i - 6, w, 14);
  }
  for (let i = 0; i < 12; i++) {
    const a = wrapAngle(i * 0.52 + 1.1);
    const t = k * (0.8 + (i % 3) * 0.1);
    g.fillStyle(WATER_LIT, 0.9 * (1 - k)); g.fillCircle(x + Math.cos(a) * r * t, y - h * 0.8 * Math.sin(t * Math.PI) + Math.sin(a) * r * 0.4 * t, 2.5);
  }
}

export const FALLEN_QANAT: GimmickDef = {
  id: ID,
  rules: 'Step into a qanat shaft to crawl to the next. When the sluice opens, each shaft spouts as the surge passes. Strike a windlass: the next spouts double.',
  make,
};
