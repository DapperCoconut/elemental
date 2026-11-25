import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, shadow } from '../../../../../art/IsleArt';
import { stitchedMouth } from '../art';
import { FELT, FELT_DARK, FELT_LIT, FELT_OAT, FINE_RED, INK, LAMP, SILK, SNOW_LIT, WARDEN, WARDEN_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Tossed in a Blanket — Griselda Hoy, Blanket-Sergeant.
 *
 * Hush does not beat its noisy; a beating makes a noise. It tosses them in a blanket — four wardens
 * at the corners of a great felt blanket, and up you go without a sound, again and again, until you
 * have learnt to hold your tongue. In the star's telling the sergeant who calls the heave is the
 * most patient woman on the terrace.
 *
 * The blanket shuffles after you across the yard. Each **heave** is called with three tugs: a chalk
 * arrow shows which way the wardens will step. On the heave **everyone on the blanket is tossed** —
 * aloft, nothing can touch them — and while they are up the wardens **lurch the blanket the way the
 * arrow points**. Come down on the felt and you are caught. Come down where it was and you **land
 * hard**. Come down on the other fighter and you land on *them*.
 *
 * **Strike a corner warden during the tugs and the blanket lurches toward his corner instead.** Past
 * half, Hoy calls a second heave straight after the first.
 */

const SLUG = 'tossed';
const BW = 300;
const BH = 180;
const LURCH = 150;
const WARN = 1300;
const TOSS = 1200;
const EVERY = 5200;
const DRIFT = 40;
const FALL_DMG = 18;
const FALL_STUN = 1000;
const LAND_ON = 12;

interface Toss { f: Fighter; landAt: number; from: Pt }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const minX = BW / 2 + 36, maxX = W - BW / 2 - 36, minY = top + BH / 2 + 24, maxY = H - BH / 2 - 24;
  let bx = W / 2, by = (top + H) / 2;
  let fromX = bx, fromY = by, toX = bx, toY = by, lurchAt = -9999;
  let warnAt = -1;
  let nextHeave = 0;
  let ux = 1, uy = 0;
  let steered = false;
  let half = false;
  let encore = false;
  let started = false;
  let heaveAt = -9999;
  const tosses: Toss[] = [];
  const corners: StrikeTarget[] = [];
  const CORNER_DIRS: Pt[] = [{ x: -1, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }];

  const rect = (cx: number, cy: number): Rect => ({ x: cx - BW / 2, y: cy - BH / 2, w: BW, h: BH });
  const inRect = (r: Rect, p: Pt, pad = 0): boolean => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
  const onBlanket = (f: Fighter): boolean => alive(f) && !ctx.isAirborne(f) && inRect(rect(bx, by), f);
  const lurched = (): Pt => ({ x: clamp(bx + ux * LURCH, minX, maxX), y: clamp(by + uy * LURCH, minY, maxY) });
  const cornerAt = (i: number, cx = bx, cy = by): Pt => ({ x: cx + CORNER_DIRS[i].x * (BW / 2 + 16), y: cy + CORNER_DIRS[i].y * (BH / 2 + 12) });

  /** The way to step that throws the stranger off: the direction that leaves them farthest outside. */
  function chooseDir(): void {
    let best = -1e9;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
      const nx = clamp(bx + dx * LURCH, minX, maxX), ny = clamp(by + dy * LURCH, minY, maxY);
      const r = rect(nx, ny);
      const ox = Math.max(r.x - player.x, 0, player.x - r.x - r.w), oy = Math.max(r.y - player.y, 0, player.y - r.y - r.h);
      const score = Math.hypot(ox, oy) + Math.hypot(nx - bx, ny - by) * 0.2;
      if (score > best) { best = score; ux = dx; uy = dy; }
    }
  }

  function startWarn(time: number): void {
    warnAt = time;
    steered = false;
    chooseDir();
    ctx.sfx('countdown-tick');
  }

  function heave(time: number): void {
    warnAt = -1;
    heaveAt = time;
    const r = rect(bx, by);
    for (const f of [player, npc]) {
      if (!alive(f) || ctx.isAirborne(f) || !inRect(r, f)) continue;
      ctx.airborne(f, TOSS);
      ctx.root(f, TOSS);
      tosses.push({ f, landAt: time + TOSS + 30, from: { x: f.x, y: f.y } });
      ctx.float(f.x, f.y - 56, 'UP', '#dfe6ee');
    }
    const to = lurched();
    fromX = bx; fromY = by; toX = to.x; toY = to.y; lurchAt = time + 200;
    ctx.sfx('boing');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextHeave = time + 3200;
        for (let i = 0; i < 4; i++) {
          const c = cornerAt(i);
          corners.push(ctx.target({
            x: c.x, y: c.y, r: 24, passThrough: true,
            onStruck: () => {
              if (warnAt < 0 || steered) return;
              steered = true;
              const d = CORNER_DIRS[i];
              ux = d.x / Math.SQRT2; uy = d.y / Math.SQRT2;
              ctx.float(cornerAt(i).x, cornerAt(i).y - 40, 'THIS WAY', '#ffe2a8');
              ctx.sfx('hit-light');
            },
          }));
        }
      }
      if (!half && npc.hp < npc.maxHp * 0.5) { half = true; ctx.banner('HOY CALLS THE HEAVE TWICE', '#dfe6ee'); }
      // The lurch, while the tossed are aloft.
      const lk = clamp((time - lurchAt) / 500, 0, 1);
      if (time >= lurchAt && lk <= 1 && (fromX !== toX || fromY !== toY)) {
        const e = lk * lk * (3 - 2 * lk);
        bx = fromX + (toX - fromX) * e; by = fromY + (toY - fromY) * e;
        if (lk >= 1) { fromX = toX; fromY = toY; }
      } else if (warnAt < 0 && tosses.length === 0 && alive(player)) {
        // Shuffling after the stranger.
        const d = dist(bx, by, player.x, player.y);
        if (d > 20) { bx = clamp(bx + ((player.x - bx) / d) * DRIFT * dt, minX, maxX); by = clamp(by + ((player.y - by) / d) * DRIFT * dt, minY, maxY); }
      }
      for (let i = 0; i < 4; i++) { const c = cornerAt(i); corners[i]?.moveTo(c.x, c.y); }
      if (warnAt < 0 && tosses.length === 0 && time >= nextHeave) startWarn(time);
      if (warnAt >= 0 && time - warnAt >= WARN) heave(time);
      // Landings.
      for (let i = tosses.length - 1; i >= 0; i--) {
        const t = tosses[i];
        if (time < t.landAt) continue;
        tosses.splice(i, 1);
        const f = t.f;
        if (!alive(f)) continue;
        const o = f === player ? npc : player;
        if (alive(o) && !ctx.isAirborne(o) && dist(f.x, f.y, o.x, o.y) < 46) {
          ctx.hit(o, LAND_ON, o.x, o.y);
          ctx.root(o, 600);
          ctx.float(o.x, o.y - 52, 'LANDED ON', '#ffe2a8');
          ctx.sfx('hit-heavy');
        }
        if (inRect(rect(bx, by), f, 4)) {
          ctx.float(f.x, f.y - 52, 'CAUGHT', '#dfe6ee');
          ctx.sfx('boing');
        } else {
          ctx.hit(f, FALL_DMG, f.x, f.y);
          ctx.stun(f, FALL_STUN);
          ctx.float(f.x, f.y - 52, 'DROPPED', '#ffb0a0');
          ctx.sfx('gravity-slam');
        }
        if (tosses.length === 0) {
          if (half && !encore) { encore = true; nextHeave = time + 250; } else { encore = false; nextHeave = time + EVERY - TOSS; }
        }
      }
      if (tosses.length === 0 && warnAt < 0 && heaveAt === time) nextHeave = time + EVERY;
    },

    playerSpeedMult: () => (onBlanket(player) ? 0.85 : 1),
    npcSpeedMult: () => (onBlanket(npc) ? 0.85 : 1),

    npcSeek() {
      if (!alive(npc)) return null;
      if (warnAt < 0) return null;
      const old = rect(bx, by), nw = lurched(), nr = rect(nw.x, nw.y);
      if (inRect(old, npc)) {
        // On the blanket for a heave: stand where the felt will still be.
        const x0 = Math.max(old.x, nr.x) + 34, x1 = Math.min(old.x + old.w, nr.x + nr.w) - 34;
        const y0 = Math.max(old.y, nr.y) + 30, y1 = Math.min(old.y + old.h, nr.y + nr.h) - 30;
        if (x0 < x1 && y0 < y1) return { x: clamp(npc.x, x0, x1), y: clamp(npc.y, y0, y1) };
        return { x: clamp(npc.x + (npc.x - bx) * 2, 60, W - 60), y: clamp(npc.y + (npc.y - by) * 2, top + 50, H - 40) };
      }
      if (!steered && onBlanket(player)) {
        // Go to the corner that would step the felt out from under you.
        let bi = 0, bd = -1;
        for (let i = 0; i < 4; i++) {
          const d = CORNER_DIRS[i];
          const nx = clamp(bx + (d.x / Math.SQRT2) * LURCH, minX, maxX), ny = clamp(by + (d.y / Math.SQRT2) * LURCH, minY, maxY);
          const r = rect(nx, ny);
          const out = Math.hypot(Math.max(r.x - player.x, 0, player.x - r.x - r.w), Math.max(r.y - player.y, 0, player.y - r.y - r.h));
          if (out > bd) { bd = out; bi = i; }
        }
        const c = cornerAt(bi);
        return { x: clamp(c.x + CORNER_DIRS[bi].x * 30, 60, W - 60), y: clamp(c.y + CORNER_DIRS[bi].y * 30, top + 50, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      const r = rect(bx, by);
      const warnK = warnAt >= 0 ? clamp((time - warnAt) / WARN, 0, 1) : 0;
      const tug = warnAt >= 0 ? Math.floor(warnK * 3) : -1;
      const up = time - heaveAt < 500 ? 1 - (time - heaveAt) / 500 : 0;
      shadow(g, bx, by + BH / 2 + 6, BW + 20, 24, 0.25);
      // The felt: a deep sag in the middle, quilted in diamonds, a fringe at the ends.
      const pull = tug >= 0 ? (Math.sin(warnK * Math.PI * 6) * 0.5 + 0.5) * 6 : 0;
      g.fillStyle(FELT_DARK, 1); g.fillRect(r.x - pull, r.y - pull, r.w + pull * 2, r.h + pull * 2);
      g.fillStyle(FELT, 1); g.fillRect(r.x + 4 - pull, r.y + 4 - pull, r.w - 8 + pull * 2, r.h - 8 + pull * 2);
      g.fillStyle(dim(FELT, 0.25), 0.7 - up * 0.5); g.fillEllipse(bx, by + 6, BW * 0.7, BH * 0.62);
      g.fillStyle(dim(FELT, 0.4), 0.5 - up * 0.4); g.fillEllipse(bx, by + 8, BW * 0.38, BH * 0.32);
      if (up > 0) { g.fillStyle(FELT_LIT, up * 0.6); g.fillEllipse(bx, by - 10, BW * 0.8, BH * 0.7); }
      g.lineStyle(1, FELT_LIT, 0.5);
      for (let i = 1; i < 6; i++) {
        const x = r.x + (r.w / 6) * i;
        g.lineBetween(x - 30, r.y + 6, x + 30, r.y + r.h - 6);
        g.lineBetween(x + 30, r.y + 6, x - 30, r.y + r.h - 6);
      }
      for (let i = 0; i < 26; i++) {
        const fx = r.x + 6 + (i * (r.w - 12)) / 25;
        g.lineStyle(2, FELT_OAT, 0.9); g.lineBetween(fx, r.y + r.h, fx + Math.sin(time / 300 + i) * 2, r.y + r.h + 8); g.lineBetween(fx, r.y, fx + Math.sin(time / 300 + i) * 2, r.y - 8);
      }
      // Hush's mark in the middle: the stitched mouth.
      stitchedMouth(g, bx, by, 26, dim(FELT, 0.5), 0.8);
      g.fillStyle(SNOW_LIT, 0.5); g.fillEllipse(r.x + 40, r.y + 20, 40, 6); g.fillEllipse(r.x + r.w - 60, r.y + r.h - 22, 50, 6);
      // During the tugs: the chalk arrow, and the strip that will be bare ground when you come down.
      if (warnAt >= 0) {
        const nw = lurched(), nr = rect(nw.x, nw.y);
        const sx0 = Math.max(r.x, nr.x), sx1 = Math.min(r.x + r.w, nr.x + nr.w), sy0 = Math.max(r.y, nr.y), sy1 = Math.min(r.y + r.h, nr.y + nr.h);
        g.fillStyle(FINE_RED, 0.22 + warnK * 0.15);
        if (sx0 > r.x) g.fillRect(r.x, r.y, sx0 - r.x, r.h);
        if (sx1 < r.x + r.w) g.fillRect(sx1, r.y, r.x + r.w - sx1, r.h);
        if (sy0 > r.y) g.fillRect(Math.max(r.x, sx0), r.y, Math.min(r.x + r.w, sx1) - Math.max(r.x, sx0), sy0 - r.y);
        if (sy1 < r.y + r.h) g.fillRect(Math.max(r.x, sx0), sy1, Math.min(r.x + r.w, sx1) - Math.max(r.x, sx0), r.y + r.h - sy1);
        g.lineStyle(2, SILK, 0.5); g.strokeRect(nr.x, nr.y, nr.w, nr.h);
        const len = 80, ax = bx + ux * len, ay = by + uy * len;
        g.lineStyle(9, INK, 0.5); g.lineBetween(bx - ux * 30, by - uy * 30, ax, ay);
        g.lineStyle(6, SILK, 0.95); g.lineBetween(bx - ux * 30, by - uy * 30, ax, ay);
        g.fillStyle(SILK, 0.95); g.fillTriangle(ax + ux * 22, ay + uy * 22, ax - uy * 16, ay + ux * 16, ax + uy * 16, ay - ux * 16);
      }
      // The tossed: their shadows on the ground, small while they are high.
      for (const t of tosses) {
        const k = clamp(1 - (t.landAt - time) / TOSS, 0, 1);
        const hgt = Math.sin(k * Math.PI);
        g.fillStyle(0x000000, 0.35 - hgt * 0.15); g.fillEllipse(t.f.x, t.f.y + 16, 40 - hgt * 18, 12 - hgt * 5);
      }
    },

    drawAir(g, time) {
      const warnK = warnAt >= 0 ? clamp((time - warnAt) / WARN, 0, 1) : 0;
      const crouch = warnAt >= 0 ? Math.abs(Math.sin(warnK * Math.PI * 3)) : 0;
      const heaved = time - heaveAt < 400 ? 1 - (time - heaveAt) / 400 : 0;
      // The four corner wardens: indigo greatcoats and earmuffs, leaning back on their corners.
      for (let i = 0; i < 4; i++) {
        const c = cornerAt(i), d = CORNER_DIRS[i];
        const x = c.x + d.x * 8, y = c.y + d.y * 6 + 14;
        const lean = crouch * 8 - heaved * 10;
        shadow(g, x, y + 2, 30, 8);
        g.fillStyle(dim(WARDEN, 0.2), 1); g.fillRect(x - 9, y - 12, 7, 12); g.fillRect(x + 2, y - 12, 7, 12);
        g.fillStyle(WARDEN, 1); g.fillRoundedRect(x - 12 + d.x * lean * 0.3, y - 40 + lean, 24, 30, 6);
        g.fillStyle(WARDEN_LIT, 1); g.fillRect(x - 2 + d.x * lean * 0.3, y - 38 + lean, 3, 26);
        g.fillStyle(0xe0c8b0, 1); g.fillCircle(x + d.x * lean * 0.3, y - 47 + lean, 8);
        g.fillStyle(FELT_DARK, 1); g.fillRoundedRect(x - 9 + d.x * lean * 0.3, y - 56 + lean, 18, 6, 3);
        g.fillStyle(FINE_RED, 1); g.fillCircle(x - 9 + d.x * lean * 0.3, y - 47 + lean, 4); g.fillCircle(x + 9 + d.x * lean * 0.3, y - 47 + lean, 4);
        // Arms to the corner of the felt, white-knuckled in the tugs.
        g.lineStyle(4, WARDEN, 1); g.lineBetween(x + d.x * lean * 0.3, y - 30 + lean, c.x - d.x * 10, c.y - d.y * 8);
        g.fillStyle(SNOW_LIT, 1); g.fillCircle(c.x - d.x * 10, c.y - d.y * 8, 4);
      }
      // The sergeant's tug pips over the blanket.
      if (warnAt >= 0) {
        const tug = Math.floor(warnK * 3);
        for (let i = 0; i < 3; i++) {
          g.fillStyle(i <= tug ? LAMP : 0x333333, 1); g.fillCircle(bx - 24 + i * 24, by - BH / 2 - 26, i === 2 ? 7 : 5);
        }
      }
      // The tossed, up in the air: a ring of rushing air round them.
      for (const t of tosses) {
        const k = clamp(1 - (t.landAt - time) / TOSS, 0, 1);
        const hgt = Math.sin(k * Math.PI);
        g.lineStyle(2, SILK, 0.5 * hgt); g.strokeEllipse(t.f.x, t.f.y + 10, 46 + hgt * 20, 14 + hgt * 6);
        for (let j = 0; j < 3; j++) { g.lineStyle(1.5, lit(SILK, 0.2), 0.4 * hgt); g.lineBetween(t.f.x - 14 + j * 14, t.f.y + 20, t.f.x - 14 + j * 14, t.f.y + 34 + hgt * 10); }
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 16;
      const k = warnAt >= 0 ? 1 : clamp(1 - (nextHeave - time) / EVERY, 0, 1);
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 60, y - 9, 120, 18, 8);
      g.fillStyle(warnAt >= 0 ? LAMP : FELT_LIT, 1); g.fillRoundedRect(x - 54, y - 4, 108 * k, 8, 4);
    },

    destroy() { for (const c of corners) c.remove(); },
  };
}

export const FALLEN_TOSSED: GimmickDef = {
  id: fallenId('hush', SLUG),
  rules: 'On the heave all on the blanket are tossed and it lurches the chalked way: come down off it hard. Strike a corner man to steer it.',
  make,
};
