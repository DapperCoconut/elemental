import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim } from '../../../../../art/IsleArt';
import { BUOY, FOAM, PILE, SEA, SEA_DEEP, SEA_LIT, SEA_SHALLOW, WETSAND_DARK } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Rip Current — Wader Silt.
 *
 * The bottom of the arena is the surf: a set of breakers rolls in and crashes every few seconds,
 * battering whoever is standing in it and throwing them back up the flats. Across the flats,
 * rip channels open — calm, dark strips of water flagged red and yellow at their head — and
 * for a few seconds everything inside one is dragged straight out toward the breakers.
 *
 * You can't out-walk a rip head on; you get out the way every Tidewater child is taught — swim
 * *sideways*, across it. Silt fights across the rips: when one opens he puts it between you and
 * him, and with his gusts he would very much like to blow you into it. But the rip drags him
 * exactly as hard as it drags you, and the surf does not care whose it is.
 */

const SURF_H = 92;
const SET_MS = 2700;
const CURL_MS = 950;
const DRAG = 125;
const RIP_HALF = 46;
const RIP_WARN = 1600;
const RIP_OPEN = 5000;
const RIP_CLOSE = 700;

interface Rip { x: number; bornAt: number; seed: number; announced: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const surfTop = H - SURF_H;
  const rips: Rip[] = [];
  const maxRips = ctx.hard ? 3 : 2;
  const ripEvery = ctx.hard ? 3600 : 4600;
  let nextRip = 0;
  let nextSet = 0;
  let curlAt = 0;
  let crashFx = 0;
  let started = false;

  const ripState = (r: Rip, time: number): 'warn' | 'open' | 'close' | 'gone' => {
    const k = time - r.bornAt;
    if (k < RIP_WARN) return 'warn';
    if (k < RIP_WARN + RIP_OPEN) return 'open';
    if (k < RIP_WARN + RIP_OPEN + RIP_CLOSE) return 'close';
    return 'gone';
  };
  const inRip = (f: Fighter, time: number): Rip | null => {
    for (const r of rips) {
      if (ripState(r, time) !== 'open') continue;
      if (Math.abs(f.x - r.x) < RIP_HALF && f.y > top + 30) return r;
    }
    return null;
  };

  function openRip(time: number): void {
    // One near you, the rest anywhere — but never stacked on another.
    const nearYou = rips.length === 0 || rng() < 0.55;
    for (let tries = 0; tries < 10; tries++) {
      const x = nearYou && tries < 5 ? player.x + (rng() - 0.5) * 260 : 80 + rng() * (W - 160);
      const cx = clamp(x, 70, W - 70);
      if (rips.some((r) => Math.abs(r.x - cx) < RIP_HALF * 3)) continue;
      rips.push({ x: cx, bornAt: time, seed: rng() * 10, announced: false });
      ctx.sfx('water-jet');
      return;
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextRip = time + 2000;
        nextSet = time + 1500;
      }
      if (time >= nextRip) {
        nextRip = time + ripEvery;
        if (rips.length < maxRips) openRip(time);
      }
      for (let i = rips.length - 1; i >= 0; i--) {
        const st = ripState(rips[i], time);
        if (st === 'gone') rips.splice(i, 1);
        else if (st === 'open' && !rips[i].announced) {
          rips[i].announced = true;
          ctx.float(rips[i].x, top + 60, 'RIP!', '#ffd27a');
        }
      }
      // The drag: straight out to sea, with a gentle draw to the channel's middle.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const r = inRip(f, time);
        if (!r) continue;
        ctx.nudge(f, (r.x - f.x) * 0.6 * dt, DRAG * dt);
      }
      // The set: a curl rises, then breaks across the whole surf.
      if (!curlAt && time >= nextSet - CURL_MS) curlAt = nextSet;
      if (time >= nextSet) {
        nextSet = time + SET_MS * (0.85 + rng() * 0.3);
        curlAt = 0;
        crashFx = time;
        ctx.sfx('splash');
        for (const f of [player, npc]) {
          if (!alive(f) || f.y < surfTop - 6) continue;
          ctx.hit(f, ctx.hard ? 12 : 9, f.x, f.y);
          ctx.nudge(f, 0, -54);
          if (f === player) ctx.tk.slowPlayer(0.6, 800);
          ctx.float(f.x, f.y - 40, 'DUMPED', '#eef6f0');
        }
      }
    },

    npcSpeedMult: () => (alive(npc) && npc.y > surfTop ? 0.7 : 1),
    playerSpeedMult: () => (alive(player) && player.y > surfTop ? 0.7 : 1),

    npcSeek() {
      const time = ctx.scene.time.now;
      // Out of the surf first — he respects the sea.
      if (npc.y > surfTop - 10) return { x: npc.x, y: surfTop - 90 };
      // Caught in a rip: swim sideways.
      const mine = inRip(npc, time);
      if (mine) return { x: clamp(mine.x + (npc.x < mine.x ? -1 : 1) * (RIP_HALF + 50), 50, W - 50), y: npc.y - 20 };
      // Fight across an open rip: put it between you and him.
      let best: Rip | null = null;
      let bd = Infinity;
      for (const r of rips) {
        const st = ripState(r, time);
        if (st !== 'open' && st !== 'warn') continue;
        const d = Math.abs(r.x - player.x);
        if (d < bd) { bd = d; best = r; }
      }
      if (best && bd < 260) {
        const side = player.x < best.x ? 1 : -1;
        return { x: clamp(best.x + side * (RIP_HALF + 70), 50, W - 50), y: clamp(player.y, top + 60, surfTop - 60) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const r of rips) drawRip(g, r, ripState(r, time), time, top, H, surfTop);
      drawSurf(g, W, H, surfTop, time, curlAt ? clamp(1 - (curlAt - time) / CURL_MS, 0, 1) : 0, crashFx);
      // Struggling wake round anyone caught in a rip.
      for (const f of [player, npc]) {
        if (!alive(f) || !inRip(f, time)) continue;
        const k = (time / 260) % 1;
        g.lineStyle(2, FOAM, 0.7 * (1 - k)); g.strokeEllipse(f.x, f.y + 14, 26 + k * 34, 9 + k * 8);
        for (let i = 0; i < 3; i++) {
          const yy = f.y + 22 + ((time / 6 + i * 16) % 46);
          g.lineStyle(1.5, FOAM, 0.5); g.lineBetween(f.x - 8 + i * 8, yy, f.x - 8 + i * 8, yy + 8);
        }
      }
    },

    drawHud(g, time) {
      // A little set-counter: the next breaker's curl filling at the bottom-left.
      const x = 30, y = H - 24;
      const k = clamp(1 - (nextSet - time) / SET_MS, 0, 1);
      g.fillStyle(0x000000, 0.4); g.fillCircle(x, y, 14);
      g.lineStyle(3, k > 0.7 ? 0xffffff : SEA_LIT, 0.95);
      g.beginPath(); g.arc(x, y, 11, Math.PI, Math.PI + k * Math.PI * 2, false); g.strokePath();
      g.fillStyle(FOAM, 0.9); g.fillCircle(x - 4, y - 2, 3); g.fillCircle(x + 2, y - 4, 2.5);
    },
  };
}

/** A rip: a calm dark strip with foam streaks running out to sea, flagged at its head. */
function drawRip(
  g: Phaser.GameObjects.Graphics, r: Rip, st: 'warn' | 'open' | 'close' | 'gone', time: number,
  top: number, H: number, surfTop: number,
): void {
  if (st === 'gone') return;
  const k = time - r.bornAt;
  const yTop = top + 40;
  // Flags at the head: red over yellow, lifeguard's warning.
  const flagUp = st === 'warn' ? Math.min(1, k / 500) : st === 'close' ? 1 - (k - RIP_WARN - RIP_OPEN) / RIP_CLOSE : 1;
  for (const side of [-1, 1]) {
    const fx = r.x + side * (RIP_HALF + 8);
    g.fillStyle(PILE, 1); g.fillRect(fx - 1.5, yTop - 34 * flagUp, 3, 34 * flagUp);
    if (flagUp > 0.6) {
      const wave = Math.sin(time / 120 + side) * 3;
      g.fillStyle(BUOY, 1); g.fillTriangle(fx + 1, yTop - 34, fx + 18, yTop - 30 + wave, fx + 1, yTop - 26);
      g.fillStyle(0xf2c94c, 1); g.fillTriangle(fx + 1, yTop - 26, fx + 18, yTop - 22 + wave, fx + 1, yTop - 18);
    }
  }
  if (st === 'warn') {
    const a = Math.min(1, k / RIP_WARN);
    g.fillStyle(SEA_DEEP, 0.12 + a * 0.18); g.fillRect(r.x - RIP_HALF, yTop, RIP_HALF * 2, H - yTop);
    g.lineStyle(2, FOAM, 0.3 + a * 0.4);
    for (let y = yTop; y < H; y += 22) {
      g.lineBetween(r.x - RIP_HALF, y, r.x - RIP_HALF, y + 11); g.lineBetween(r.x + RIP_HALF, y, r.x + RIP_HALF, y + 11);
    }
    if (a > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.5); g.strokeRect(r.x - RIP_HALF, yTop, RIP_HALF * 2, H - yTop); }
    return;
  }
  const a = st === 'close' ? 1 - (k - RIP_WARN - RIP_OPEN) / RIP_CLOSE : 1;
  // The channel: scoured sand edges, dark smooth water.
  g.fillStyle(WETSAND_DARK, 0.6 * a); g.fillRect(r.x - RIP_HALF - 8, yTop, RIP_HALF * 2 + 16, H - yTop);
  g.fillStyle(SEA_DEEP, 0.7 * a); g.fillRect(r.x - RIP_HALF, yTop, RIP_HALF * 2, H - yTop);
  g.fillStyle(SEA, 0.5 * a); g.fillRect(r.x - RIP_HALF * 0.55, yTop, RIP_HALF * 1.1, H - yTop);
  // Foam streaks racing out to sea — the tell that this water is going somewhere.
  for (let i = 0; i < 9; i++) {
    const lane = ((i * 37 + r.seed * 13) % (RIP_HALF * 1.6)) - RIP_HALF * 0.8;
    const y = yTop + ((time * 0.22 + i * 61 + r.seed * 50) % (H - yTop));
    g.lineStyle(2, FOAM, 0.6 * a); g.lineBetween(r.x + lane, y, r.x + lane, y + 16);
    g.fillStyle(FOAM, 0.6 * a);
    g.fillTriangle(r.x + lane - 4, y + 14, r.x + lane + 4, y + 14, r.x + lane, y + 22);
  }
  // Breaking foam on both lips where the channel cuts the sand.
  g.lineStyle(2.5, FOAM, 0.55 * a);
  for (const side of [-1, 1]) {
    g.beginPath();
    for (let y = yTop; y <= H; y += 12) {
      const x = r.x + side * (RIP_HALF + Math.sin(y * 0.08 + time / 200) * 3);
      if (y === yTop) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
  }
  // Where the rip meets the surf it fans out in a mushroom of brown water.
  g.fillStyle(dim(SEA_SHALLOW, 0.3), 0.5 * a); g.fillEllipse(r.x, surfTop + 20, RIP_HALF * 3.4, 40);
}

/** The surf: shallow green over the bottom strip, a curl that rises and breaks on the set. */
function drawSurf(g: Phaser.GameObjects.Graphics, W: number, H: number, surfTop: number, time: number, curl: number, crashFx: number): void {
  g.fillStyle(SEA_SHALLOW, 0.75); g.fillRect(0, surfTop, W, H - surfTop);
  g.fillStyle(SEA, 0.7); g.fillRect(0, surfTop + 34, W, H - surfTop - 34);
  g.fillStyle(SEA_DEEP, 0.7); g.fillRect(0, surfTop + 64, W, H - surfTop - 64);
  // Swash lines.
  for (let i = 0; i < 3; i++) {
    const yy = surfTop + 6 + i * 9 + Math.sin(time / 500 + i) * 3;
    g.lineStyle(1.5, FOAM, 0.5 - i * 0.12);
    g.beginPath(); g.moveTo(0, yy);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, yy + Math.sin(x * 0.03 + time / 300 + i) * 3);
    g.strokePath();
  }
  // The curl: a lip of water climbing out of the deep, its shadow on the swash.
  if (curl > 0) {
    const y = H - 12 - curl * (SURF_H - 30);
    g.fillStyle(SEA_DEEP, 0.5 * curl); g.fillRect(0, y, W, H - y);
    g.lineStyle(6 + curl * 4, SEA_LIT, 0.6 + curl * 0.3);
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= W; x += 14) g.lineTo(x, y + Math.sin(x * 0.04 + time / 150) * 4);
    g.strokePath();
    g.fillStyle(FOAM, 0.7 * curl);
    for (let x = 0; x <= W; x += 26) g.fillCircle(x + Math.sin(x) * 5, y - 4, 3 + curl * 3);
    if (curl > 0.75 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.8); g.lineBetween(0, surfTop - 4, W, surfTop - 4); }
  }
  if (crashFx && time - crashFx < 700) {
    const k = (time - crashFx) / 700;
    g.fillStyle(FOAM, 0.75 * (1 - k)); g.fillRect(0, surfTop - 16 - k * 26, W, SURF_H + 16);
    for (let x = 0; x < W; x += 30) {
      g.fillStyle(0xffffff, 0.8 * (1 - k)); g.fillCircle(x + 15, surfTop - 10 - k * 40 - Math.sin(x) * 10, 5 * (1 - k) + 2);
    }
  }
}

export const RIP_CURRENT: GimmickDef = {
  id: 'tidewater-rip-current',
  rules: 'Flagged rips open and drag everyone in them out to the surf, where breakers pound on a clock. Swim sideways to escape. Silt is dragged too.',
  make,
};
