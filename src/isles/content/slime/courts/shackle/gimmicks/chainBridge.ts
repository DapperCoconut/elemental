import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { chainLinks, sagPoints } from '../art';
import {
  GAS, IRON, IRON_DARK, IRON_LIT, MIRE, MIRE_DEEP, MIRE_SCUM, MIRE_SHEEN, RUST, SLIME, TIMBER, TIMBER_DARK,
  TIMBER_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Chain Bridge — Keeper Pontoon.
 *
 * The fight is on the deck of the Great Chain Bridge, out over the mire. The deck is planks, each
 * hung from the great chains on its own hangers — and Pontoon keeps the pins. Every few seconds
 * he calls a pattern (alternate planks, a rolling wave, a cross through you, a chequer) and those
 * planks **creak** — they shake, dust falls, the joints split — and then drop away into the black
 * water. Anyone standing on one goes through, and so does anyone who walks into a hole: **dunked**,
 * hurt, held while the bridge-men haul them back up by the collar onto sound planks, and soaked
 * and slow for a moment after. Dropped planks are winched back up after a few seconds.
 *
 * Two winches stand at the deck's ends. **Strike one** and the planks under your foe creak.
 */

const COLS = 12;
const ROWS = 4;
const GONE_MS = 2600;
const RISE_MS = 450;

type Cell = { c: number; r: number; state: 'solid' | 'creak' | 'gone' | 'rise'; at: number; until: number; seed: number };
type Pattern = 'alternate' | 'wave' | 'cross' | 'chequer';
const CALL: Record<Pattern, string> = { alternate: 'EVERY OTHER!', wave: 'THE WAVE!', cross: 'CROSS THE BOARDS!', chequer: 'CHEQUERS!' };

interface Winch { x: number; y: number; handle: StrikeTarget | null; readyAt: number; spunAt: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const Y0 = top + 18, Y1 = H - 26;
  const CW = W / COLS, RH = (Y1 - Y0) / ROWS;
  const WARN = ctx.hard ? 950 : 1150;
  const EVERY = ctx.hard ? 3700 : 4600;
  const DUNK = ctx.hard ? 12 : 9;
  const cells: Cell[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ c, r, state: 'solid', at: 0, until: 0, seed: rng() * 10 });
  const cellAt = (x: number, y: number): Cell | null => {
    const c = Math.floor(x / CW), r = Math.floor((y - Y0) / RH);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    return cells[r * COLS + c];
  };
  const centre = (cl: Cell) => ({ x: (cl.c + 0.5) * CW, y: Y0 + (cl.r + 0.5) * RH });
  const soakedUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const immuneUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const splashes: { x: number; y: number; at: number }[] = [];
  let nextCall = 0;
  let waveK = 0;
  let order = 0;
  let started = false;
  let botWinchAt = 0;

  const winches: Winch[] = [
    { x: 40, y: (Y0 + Y1) / 2, handle: null, readyAt: 0, spunAt: -9999 },
    { x: W - 40, y: (Y0 + Y1) / 2, handle: null, readyAt: 0, spunAt: -9999 },
  ];
  for (const w of winches) {
    w.handle = ctx.target({
      x: w.x, y: w.y, r: 22,
      onStruck: (by) => {
        const now = ctx.scene.time.now;
        if (now < w.readyAt) return;
        w.readyAt = now + 6500;
        w.spunAt = now;
        const foe = by === 'player' ? npc : player;
        const fc = cellAt(foe.x, foe.y);
        if (!fc) return;
        for (const cl of cells) if (Math.abs(cl.c - fc.c) <= 1 && Math.abs(cl.r - fc.r) <= 0) creak(cl, now, 0);
        if (fc.r + 1 < ROWS) creak(cells[(fc.r + 1) * COLS + fc.c], now, 0);
        if (fc.r - 1 >= 0) creak(cells[(fc.r - 1) * COLS + fc.c], now, 0);
        ctx.sfx('gear-turn');
        ctx.float(foe.x, foe.y - 56, 'THE PINS ARE OUT', by === 'player' ? '#d8f0a0' : '#ffb0a0');
      },
    });
  }

  function creak(cl: Cell, time: number, delay: number): void {
    if (cl.state !== 'solid') return;
    cl.state = 'creak';
    cl.at = time + delay;
    cl.until = time + delay + WARN;
  }

  function call(time: number): void {
    const pats: Pattern[] = ['alternate', 'wave', 'cross', 'chequer'];
    const p = pats[order++ % pats.length];
    const pc = cellAt(player.x, player.y);
    for (const cl of cells) {
      let drop = false, delay = 0;
      if (p === 'alternate') drop = (cl.c + waveK) % 2 === 0;
      else if (p === 'chequer') drop = (cl.c + cl.r + waveK) % 2 === 0;
      else if (p === 'wave') { drop = (cl.c + cl.r * 2 + waveK) % 4 < 2; delay = cl.c * 70; }
      else if (p === 'cross' && pc) drop = cl.c === pc.c || cl.r === pc.r;
      if (drop) creak(cl, time, delay);
    }
    waveK++;
    if (alive(npc)) ctx.float(npc.x, npc.y - 62, CALL[p], '#d8f0a0');
    ctx.sfx('gear-turn');
  }

  function dunk(f: Fighter, time: number): void {
    if (!alive(f) || time < (immuneUntil.get(f) ?? 0)) return;
    immuneUntil.set(f, time + 1700);
    soakedUntil.set(f, time + 2200);
    splashes.push({ x: f.x, y: f.y, at: time });
    ctx.hit(f, DUNK, f.x, f.y);
    ctx.stun(f, 850);
    // Hauled up onto the nearest sound plank.
    let best: Cell | null = null, bd = Infinity;
    for (const cl of cells) {
      if (cl.state !== 'solid') continue;
      const p = centre(cl);
      const d = dist(p.x, p.y, f.x, f.y);
      if (d < bd) { bd = d; best = cl; }
    }
    if (best) { const p = centre(best); ctx.nudge(f, p.x - f.x, p.y - f.y); }
    ctx.float(f.x, f.y - 50, 'DUNKED', f === player ? '#9adf5a' : '#d8f0a0');
    ctx.sfx('splash');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        nextCall = time + 1800;
        ctx.banner('MIND THE CREAKING PLANKS — STRIKE A WINCH TO PULL THE PINS', '#d8f0a0');
      }
      if (time >= nextCall) { nextCall = time + EVERY; call(time); }
      for (const cl of cells) {
        if (cl.state === 'creak' && time >= cl.until) {
          cl.state = 'gone';
          cl.at = time;
          cl.until = time + GONE_MS;
          const p = centre(cl);
          splashes.push({ x: p.x, y: p.y, at: time });
        } else if (cl.state === 'gone' && time >= cl.until) {
          cl.state = 'rise'; cl.at = time; cl.until = time + RISE_MS;
        } else if (cl.state === 'rise' && time >= cl.until) {
          cl.state = 'solid';
        }
      }
      // Anyone over open water goes in (judged from their middle, so the edges of a hole are fair).
      for (const f of [player, npc]) {
        if (!alive(f) || ctx.isAirborne(f)) continue;
        const cl = cellAt(f.x, f.y);
        if (!cl || cl.state !== 'gone') continue;
        const p = centre(cl);
        if (Math.abs(f.x - p.x) < CW / 2 - 6 && Math.abs(f.y - p.y) < RH / 2 - 6) dunk(f, time);
      }
      while (splashes.length && time - splashes[0].at > 900) splashes.shift();
    },

    playerSpeedMult() { return ctx.scene.time.now < (soakedUntil.get(player) ?? 0) ? 0.7 : 1; },
    npcSpeedMult() { return ctx.scene.time.now < (soakedUntil.get(npc) ?? 0) ? 0.7 : 1; },

    npcSeek() {
      if (!alive(npc)) return null;
      const time = ctx.scene.time.now;
      const here = cellAt(npc.x, npc.y);
      // Off a creaking plank — or away from a hole he'd walk into — onto sound boards near you.
      if (here && here.state !== 'solid') {
        let best: Cell | null = null, bs = Infinity;
        for (const cl of cells) {
          if (cl.state !== 'solid') continue;
          const p = centre(cl);
          const s = dist(p.x, p.y, npc.x, npc.y) + dist(p.x, p.y, player.x, player.y) * 0.25;
          if (s < bs) { bs = s; best = cl; }
        }
        return best ? centre(best) : null;
      }
      // Now and then he goes for a winch to pull the pins under you.
      const w = winches.find((wi) => time >= wi.readyAt);
      if (w && time > botWinchAt && dist(w.x, w.y, npc.x, npc.y) < 260) return { x: w.x + (w.x < W / 2 ? 30 : -30), y: w.y };
      if (time > botWinchAt + 4000) botWinchAt = time + 9000;
      // Otherwise near you, but only on sound planks.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      let x = player.x + Math.cos(a) * 170, y = player.y + Math.sin(a) * 170;
      const cl = cellAt(x, y);
      if (cl && cl.state !== 'solid') { x = player.x - Math.cos(a) * 170; y = player.y - Math.sin(a) * 170; }
      return { x: clamp(x, 60, W - 60), y: clamp(y, Y0 + 30, Y1 - 30) };
    },

    drawGround(g, time) {
      // The mire under the bridge.
      g.fillStyle(MIRE, 1); g.fillRect(0, top, W, H - top);
      for (let i = 0; i < 18; i++) {
        const x = ((i * 157) % W) + Math.sin(time / 2000 + i) * 10, y = top + ((i * 97) % (H - top));
        g.fillStyle(MIRE_SHEEN, 0.18); g.fillEllipse(x, y, 60, 6);
      }
      for (const cl of cells) {
        const x0 = cl.c * CW, y0 = Y0 + cl.r * RH;
        if (cl.state === 'gone') {
          // Open water: dark, a plank's edge hanging down on its last hanger, bubbles of gas.
          g.fillStyle(MIRE_DEEP, 1); g.fillRect(x0 + 2, y0 + 2, CW - 4, RH - 4);
          const ph = ((time - cl.at) / 900 + cl.seed) % 1;
          g.lineStyle(1, MIRE_SHEEN, 0.6 * (1 - ph)); g.strokeEllipse(x0 + CW / 2, y0 + RH / 2, 10 + ph * 50, 4 + ph * 20);
          g.fillStyle(TIMBER_DARK, 1); g.fillRect(x0 + 6, y0 + 2, CW - 12, 6);
          g.fillStyle(dim(TIMBER, 0.4), 1); g.fillRect(x0 + 10, y0 + 8, CW - 20, 4 + Math.sin(time / 300 + cl.seed) * 1.5);
          g.fillStyle(MIRE_SCUM, 0.35); g.fillEllipse(x0 + CW * 0.3, y0 + RH * 0.7, 18, 4);
          const bp = ((time / 1000) * 0.6 + cl.seed) % 1;
          g.lineStyle(1, GAS, 0.5 * (1 - bp)); g.strokeCircle(x0 + CW * 0.65, y0 + RH * 0.4, 2 + bp * 5);
          continue;
        }
        let ox = 0, oy = 0, k = 0;
        if (cl.state === 'creak') {
          k = clamp((time - cl.at) / Math.max(1, cl.until - cl.at), 0, 1);
          if (time >= cl.at) { ox = Math.sin(time / 26 + cl.seed) * 2.2 * k; oy = Math.cos(time / 31 + cl.seed) * 1.4 * k; }
        }
        const rise = cl.state === 'rise' ? clamp((time - cl.at) / RISE_MS, 0, 1) : 1;
        const h = (RH - 4) * rise;
        const px = x0 + 2 + ox, py = y0 + 2 + oy + (RH - 4 - h);
        // The plank: two boards per cell, grain, nail heads at the joists.
        for (let b = 0; b < 2; b++) {
          const bx = px + b * (CW - 4) / 2;
          const tone = (cl.c * 3 + cl.r * 5 + b) % 3;
          g.fillStyle([TIMBER, lit(TIMBER, 0.06), dim(TIMBER, 0.12)][tone], 1); g.fillRect(bx, py, (CW - 4) / 2 - 1, h);
          g.lineStyle(1, TIMBER_DARK, 0.5);
          g.lineBetween(bx + 8, py + 4, bx + 10, py + h - 4); g.lineBetween(bx + 22, py + 6, bx + 21, py + h - 8);
          g.fillStyle(TIMBER_LIT, 0.4); g.fillRect(bx, py, 2, h);
          g.fillStyle(IRON_DARK, 1); g.fillCircle(bx + (CW - 4) / 4, py + 5, 1.4); g.fillCircle(bx + (CW - 4) / 4, py + h - 5, 1.4);
        }
        if ((cl.c + cl.r) % 5 === 2) { g.fillStyle(SLIME, 0.25); g.fillEllipse(px + CW * 0.5, py + h * 0.7, 30, 8); }
        if (cl.state === 'creak' && time >= cl.at) {
          // The warning: the joints split, the plank glows sickly at the seams, dust drops.
          g.lineStyle(2, 0xffe2a8, 0.25 + k * 0.6); g.strokeRect(px, py, CW - 5, h);
          g.lineStyle(1.5, 0x1a1208, 0.4 + k * 0.5);
          g.lineBetween(px + CW * 0.2, py + 4, px + CW * 0.35, py + h * 0.5); g.lineBetween(px + CW * 0.35, py + h * 0.5, px + CW * 0.25, py + h - 4);
          g.lineBetween(px + CW * 0.7, py + h * 0.2, px + CW * 0.6, py + h * 0.7);
          for (let i = 0; i < 4; i++) {
            const dp = ((time / 400) + i / 4 + cl.seed) % 1;
            g.fillStyle(0xd8c8a0, 0.6 * (1 - dp)); g.fillCircle(px + 10 + i * 16, py + h - 6 + dp * 10, 1.4);
          }
        }
      }
      // Joists between the rows: riveted iron straps.
      for (let r = 0; r <= ROWS; r++) {
        const y = Y0 + r * RH;
        g.fillStyle(IRON_DARK, 1); g.fillRect(0, y - 3, W, 6);
        g.fillStyle(IRON, 1); g.fillRect(0, y - 3, W, 3);
        for (let x = 10; x < W; x += 40) { g.fillStyle(IRON_LIT, 1); g.fillCircle(x, y - 1.5, 1.4); }
        g.fillStyle(RUST, 0.25); g.fillRect((r * 211) % W, y, 60, 3);
      }
      // Splashes.
      for (const s of splashes) {
        const k = clamp((time - s.at) / 900, 0, 1);
        g.lineStyle(3 * (1 - k), MIRE_SHEEN, 1 - k); g.strokeEllipse(s.x, s.y + 8, 20 + k * 70, 8 + k * 26);
      }
    },

    drawAir(g, time) {
      // The great suspension chains along both rails, and a hanger down to each joist.
      for (const [y, sag] of [[Y0 - 8, 10], [Y1 + 6, 8]] as [number, number][]) {
        chainLinks(g, sagPoints(-20, y - 6, W + 20, y - 6, sag, 24), 16, IRON, 3);
        for (let c = 0; c <= COLS; c += 2) {
          const x = c * CW;
          g.lineStyle(2, IRON_DARK, 1); g.lineBetween(x, y - 6 + Math.sin((x / W) * Math.PI) * sag, x, y);
        }
      }
      // Dropped planks swinging on their one hanger, half under.
      for (const cl of cells) {
        if (cl.state !== 'gone') continue;
        const x = (cl.c + 0.5) * CW, y = Y0 + cl.r * RH + 6;
        const sw = Math.sin(time / 260 + cl.seed) * 0.15;
        g.lineStyle(1.5, IRON_DARK, 1); g.lineBetween(x, y - 4, x + Math.sin(sw) * 14, y + 14);
      }
      // The winches.
      for (const w of winches) {
        const ready = time >= w.readyAt;
        const spin = (time - w.spunAt) < 600 ? (time - w.spunAt) / 60 : 0;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(w.x, w.y + 18, 40, 10);
        g.fillStyle(TIMBER_DARK, 1); g.fillRect(w.x - 16, w.y - 6, 6, 24); g.fillRect(w.x + 10, w.y - 6, 6, 24);
        g.fillStyle(IRON, 1); g.fillCircle(w.x, w.y, 13);
        g.fillStyle(IRON_DARK, 1); g.fillCircle(w.x, w.y, 8);
        for (let i = 0; i < 4; i++) {
          const a = spin + (i / 4) * Math.PI * 2;
          g.lineStyle(3, ready ? IRON_LIT : IRON, 1); g.lineBetween(w.x, w.y, w.x + Math.cos(a) * 18, w.y + Math.sin(a) * 18);
        }
        if (ready) { g.lineStyle(2, 0xd8f0a0, 0.4 + Math.sin(time / 240) * 0.2); g.strokeCircle(w.x, w.y, 24); }
        else {
          const k = clamp(1 - (w.readyAt - time) / 6500, 0, 1);
          g.lineStyle(2, IRON_LIT, 0.6); g.beginPath(); g.arc(w.x, w.y, 24, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      }
      // Soaked fighters drip.
      for (const f of [player, npc]) {
        if (!alive(f) || time >= (soakedUntil.get(f) ?? 0)) continue;
        for (let i = 0; i < 3; i++) {
          const ph = (time / 500 + i / 3) % 1;
          g.fillStyle(MIRE_SCUM, 0.8 * (1 - ph)); g.fillCircle(f.x - 10 + i * 10, f.y - 10 + ph * 26, 2);
        }
      }
    },
  };
}

export const CHAIN_BRIDGE: GimmickDef = {
  id: 'shackle-chain-bridge',
  rules: 'Planks creak and drop away in patterns; fall through and you are dunked, held and hauled back up. Strike a winch to pull the pins under your foe.',
  make,
};
