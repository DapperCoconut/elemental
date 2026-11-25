import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit, type G } from '../../../../../art/IsleArt';
import { BRASS, BRASS_LIT, IRON_LIT, WAX, WAX_DARK, WAX_LIT, WHISPER, WHISPER_DARK, WHISPER_LIT } from '../palette';
import { alive, clamp, dist, stepDt, wrapAngle } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Cloak and Dagger — Cutter Amabel Shrike, who cut and sewed the Cloak Court's cloaks, and in the
 * King's telling sewed into every lining a pocket for the knife.
 *
 * She wears the heaviest of them: a great half-round of velvet that hangs from her shoulders and
 * swings slowly round to face you. Blows that land on the cloak's side are caught in the lining —
 * she takes a third of them — and every few blows caught is another knife sewn in, glinting
 * through the velvet. Then she flings it open: a beat of warning, and every knife it caught comes
 * at you in a fan. While it hangs open she is bare all round, and blows find her full and more.
 *
 * The cloak is heavy, and it turns slower than you can walk round her. The exploit is the flank:
 * get round to her bare side and strike her in the back, and the lining stays empty. Halfway down
 * she cuts the cloak in two — one half on each shoulder, wheeling round her in opposite
 * directions, so the bare side opens and shuts on its own clock.
 */

const ID = fallenId('cloak', 'cloak-and-dagger');
const ARC = 1.25;
const HALF_ARC = 0.78;
const TURN = 1.15;
const SPIN = 1.2;
const THROW_EVERY = 5600;
const THROW_LATE = 4400;
const WARN = 760;
const OPEN_MS = 1100;
const PER_KNIFE = 14;
const MAX_KNIVES = 6;
const R_IN = 28, R_OUT = 52;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  let ang = 0;
  let halves: [number, number] = [0, Math.PI];
  let cut = false;
  let started = false;
  let caught = 0;
  let nextThrow = 0;
  let warnAt = -1;
  let openUntil = 0;
  let lastCatch = -1e9;

  const knives = (): number => Math.min(MAX_KNIVES, Math.floor(caught / PER_KNIFE));
  const bearing = (): number => Math.atan2(player.y - npc.y, player.x - npc.x);
  /** The angles the cloak covers right now, as [centre, half-width] pairs. */
  const pieces = (): [number, number][] => (cut ? [[halves[0], HALF_ARC], [halves[1], HALF_ARC]] : [[ang, ARC]]);
  const covered = (): boolean => {
    if (!alive(player) || !alive(npc)) return false;
    const b = bearing();
    return pieces().some(([c, w]) => Math.abs(wrapAngle(b - c)) < w);
  };
  const isOpen = (): boolean => tk.now < openUntil || warnAt >= 0;

  function fling(time: number): void {
    warnAt = -1;
    openUntil = time + OPEN_MS;
    nextThrow = time + (cut ? THROW_LATE : THROW_EVERY);
    if (!alive(player) || !alive(npc)) { caught = 0; return; }
    const n = 2 + knives();
    const b = bearing();
    const spread = 1.2;
    for (let i = 0; i < n; i++) {
      const a = b + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * spread);
      tk.spawnBullet({ x: npc.x + Math.cos(a) * 30, y: npc.y - 16 + Math.sin(a) * 30, angle: a, speed: 330, damage: 9, r: 5, lifeMs: 2600, color: IRON_LIT });
    }
    caught = 0;
    ctx.sfx('slash');
  }

  return {
    update(time, dt) {
      const s = stepDt(dt);
      if (!started) { started = true; nextThrow = time + THROW_EVERY; ang = alive(player) ? bearing() : 0; }
      if (!cut && npc.hp < npc.maxHp * 0.5) {
        cut = true;
        halves = [ang - 0.6, ang + 0.6];
        ctx.banner('AMABEL CUTS HER CLOAK IN TWO', '#e8c8f0');
        ctx.sfx('slash');
      }
      if (alive(player) && alive(npc)) {
        if (cut) { halves = [wrapAngle(halves[0] + SPIN * s), wrapAngle(halves[1] - SPIN * s)]; }
        else {
          const d = wrapAngle(bearing() - ang);
          ang = wrapAngle(ang + clamp(d, -TURN * s, TURN * s));
        }
      }
      if (warnAt < 0 && time >= nextThrow - WARN && time >= openUntil) { warnAt = time; ctx.sfx('whip'); }
      if (knives() >= MAX_KNIVES && warnAt < 0 && time >= openUntil) { warnAt = time; nextThrow = time + WARN; ctx.sfx('whip'); }
      if (warnAt >= 0 && time >= nextThrow) fling(time);
    },

    npcTakenMult: () => (isOpen() ? 1.3 : covered() ? 0.33 : 1.25),

    onNpcHurt(amount) {
      if (isOpen() || !covered()) {
        if (!isOpen() && alive(npc)) ctx.float(npc.x, npc.y - 64, 'IN THE BACK', '#e8c8f0');
        return;
      }
      caught += amount * 2;
      lastCatch = tk.now;
      ctx.sfx('shield-block');
    },

    npcSeek() {
      if (!alive(player) || !alive(npc)) return null;
      // Walk so the stranger's bearing lies in the middle of a cloak: the nearest piece's centre.
      const b = bearing();
      let best = pieces()[0][0], bd = Infinity;
      for (const [c] of pieces()) { const d = Math.abs(wrapAngle(b - c)); if (d < bd) { bd = d; best = c; } }
      if (bd < 0.35 && !cut) return null;
      const r = clamp(dist(npc.x, npc.y, player.x, player.y), 190, 290);
      return { x: clamp(player.x - Math.cos(best) * r, 60, W - 60), y: clamp(player.y - Math.sin(best) * r, top + 50, H - 40) };
    },

    drawGround(g, time) {
      if (!alive(npc)) return;
      // The bare side, chalked on the floor so you can see where to stand.
      const open = isOpen();
      g.lineStyle(2, WAX_LIT, open ? 0.6 : 0.22);
      g.strokeCircle(npc.x, npc.y, R_OUT + 30);
      for (const [c, w] of pieces()) {
        g.fillStyle(WHISPER_DARK, open ? 0.05 : 0.22);
        g.slice(npc.x, npc.y, R_OUT + 30, c - w, c + w, false); g.fillPath();
      }
      if (warnAt >= 0 && alive(player)) {
        // The knives' lines, laid out from her as she draws the cloak back.
        const k = clamp((time - warnAt) / WARN, 0, 1);
        const n = 2 + knives(), b = bearing();
        for (let i = 0; i < n; i++) {
          const a = b + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 2.4);
          g.lineStyle(2, IRON_LIT, 0.15 + k * 0.45);
          g.lineBetween(npc.x + Math.cos(a) * 40, npc.y + Math.sin(a) * 40, npc.x + Math.cos(a) * (120 + k * 260), npc.y + Math.sin(a) * (120 + k * 260));
        }
      }
    },

    drawAir(g, time) {
      if (!alive(npc)) return;
      const open = isOpen();
      const k = warnAt >= 0 ? clamp((time - warnAt) / WARN, 0, 1) : tk.now < openUntil ? 1 - clamp((tk.now - openUntil + OPEN_MS) / OPEN_MS, 0, 1) : 0;
      const flash = clamp(1 - (time - lastCatch) / 220, 0, 1);
      const n = knives();
      pieces().forEach(([c, w], pi) => {
        // Flung open, the half-round lifts and spreads behind her shoulders.
        const ww = open ? w + k * 0.9 : w;
        drawCloak(g, npc.x, npc.y - 18, c + (open ? Math.PI * k * 0.5 * (pi ? -1 : 1) * (cut ? 1 : 0) : 0), ww, k, cut, time, flash);
        // Knives sewn into the lining, glinting through.
        const per = cut ? Math.ceil(n / 2) : n;
        for (let i = 0; i < per; i++) {
          const idx = cut ? i * 2 + pi : i;
          if (idx >= n) break;
          const a = c + ((i + 0.5) / per - 0.5) * ww * 1.6;
          const r = (R_IN + R_OUT) / 2 + (open ? k * 10 : 0);
          const x = npc.x + Math.cos(a) * r, y = npc.y - 18 + Math.sin(a) * r * 0.75;
          g.lineStyle(2.5, IRON_LIT, 0.9); g.lineBetween(x - Math.cos(a) * 7, y - Math.sin(a) * 5, x + Math.cos(a) * 7, y + Math.sin(a) * 5);
          g.lineStyle(2, BRASS, 1); g.lineBetween(x - Math.sin(a) * 3, y + Math.cos(a) * 3, x + Math.sin(a) * 3, y - Math.cos(a) * 3);
          g.fillStyle(0xffffff, 0.4 + Math.sin(time / 130 + i) * 0.4); g.fillCircle(x + Math.cos(a) * 5, y + Math.sin(a) * 4, 1.2);
        }
      });
      // The clasp at her throat: brass and a wax drop.
      g.fillStyle(BRASS, 1); g.fillCircle(npc.x, npc.y - 40, 4);
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(npc.x - 1, npc.y - 41, 1.4);
      g.fillStyle(WAX, 1); g.fillCircle(npc.x, npc.y - 35, 2);
    },

    drawHud(g, time) {
      // The lining: six knife-pockets, sewn shut or holding a blade.
      const x0 = W - 128, y = top + 20;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 12, y - 16, 120, 32, 8);
      g.fillStyle(WAX_DARK, 1); g.fillRoundedRect(x0 - 6, y - 11, 108, 22, 5);
      const n = knives();
      for (let i = 0; i < MAX_KNIVES; i++) {
        const x = x0 + 4 + i * 17;
        g.lineStyle(1, WAX_LIT, 0.6); g.strokeRect(x - 5, y - 8, 10, 16);
        if (i < n) {
          g.lineStyle(2.5, IRON_LIT, 1); g.lineBetween(x, y - 9, x, y + 4);
          g.lineStyle(2, BRASS, 1); g.lineBetween(x - 4, y + 4, x + 4, y + 4);
          g.lineStyle(3, 0x2a1a12, 1); g.lineBetween(x, y + 5, x, y + 10);
        }
      }
      const k = warnAt >= 0 ? 1 : clamp(1 - (nextThrow - time) / (cut ? THROW_LATE : THROW_EVERY), 0, 1);
      g.fillStyle(warnAt >= 0 ? WAX_LIT : WHISPER_LIT, 0.9); g.fillRect(x0 - 6, y + 13, 108 * k, 2);
    },
  };
}

/**
 * The great cloak as a half-round of velvet hung round her, seen from above: a dark outer fall
 * with folds running out to the hem, a silver-thread edge, the wine lining showing at the cut,
 * and — once halved — ragged edges where the shears went through.
 */
function drawCloak(g: G, x: number, y: number, c: number, w: number, open: number, cut: boolean, time: number, flash: number): void {
  const a0 = c - w, a1 = c + w;
  const steps = 16;
  const rOut = R_OUT + open * 14;
  const outer: { x: number; y: number }[] = [], inner: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const ripple = Math.sin(time / 260 + i * 0.9) * 2.5 + (i % 2 ? 2 : 0);
    outer.push({ x: x + Math.cos(a) * (rOut + ripple), y: y + Math.sin(a) * (rOut + ripple) * 0.75 });
    inner.push({ x: x + Math.cos(a) * R_IN, y: y + Math.sin(a) * R_IN * 0.75 });
  }
  const body = [...outer, ...inner.reverse()];
  g.fillStyle(dim(WHISPER, 0.4), 0.95); g.fillPoints(body.map((p) => ({ x: p.x + 2, y: p.y + 3 })), true);
  g.fillStyle(WHISPER, 0.95); g.fillPoints(body, true);
  if (flash > 0) { g.fillStyle(WHISPER_LIT, flash * 0.5); g.fillPoints(body, true); }
  // Folds.
  for (let i = 1; i < steps; i += 2) {
    const a = a0 + ((a1 - a0) * i) / steps;
    g.lineStyle(1.5, dim(WHISPER, 0.5), 0.8);
    g.lineBetween(x + Math.cos(a) * (R_IN + 4), y + Math.sin(a) * (R_IN + 4) * 0.75, x + Math.cos(a) * (rOut - 3), y + Math.sin(a) * (rOut - 3) * 0.75);
    g.lineStyle(1, lit(WHISPER, 0.25), 0.4);
    const b = a + 0.05;
    g.lineBetween(x + Math.cos(b) * (R_IN + 6), y + Math.sin(b) * (R_IN + 6) * 0.75, x + Math.cos(b) * (rOut - 6), y + Math.sin(b) * (rOut - 6) * 0.75);
  }
  // Silver-thread hem.
  g.lineStyle(1.5, 0xcfc8e0, 0.8);
  g.beginPath(); g.moveTo(outer[0].x, outer[0].y); for (const p of outer) g.lineTo(p.x, p.y); g.strokePath();
  // The lining at each edge (and the frayed cut once halved).
  for (const a of [a0, a1]) {
    const ox = x + Math.cos(a) * rOut, oy = y + Math.sin(a) * rOut * 0.75, ix = x + Math.cos(a) * R_IN, iy = y + Math.sin(a) * R_IN * 0.75;
    g.lineStyle(4, WAX, 0.9); g.lineBetween(ix, iy, ox, oy);
    if (cut) for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5, px = ix + (ox - ix) * t, py = iy + (oy - iy) * t;
      const n = a === a0 ? -1 : 1;
      g.lineStyle(1.5, WHISPER_LIT, 0.8);
      g.lineBetween(px, py, px - Math.sin(a) * 5 * n, py + Math.cos(a) * 5 * n);
    }
  }
  if (open > 0) glow(g, x, y, rOut, WAX_LIT, 0.04 * open, 2);
}

export const FALLEN_CLOAK_AND_DAGGER: GimmickDef = {
  id: ID,
  rules: 'Blows on Amabel\'s cloak are caught and sewn in as knives, then flung at you in a fan. It turns slowly: strike her bare side. At half it is cut in two.',
  make,
};
