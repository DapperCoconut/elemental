import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { OBS, seam } from '../../../../../art/PinnacleArt';
import { lit, mixC } from '../../../../../art/IsleArt';
import { sleeper, splashRing, titheCoin } from '../art';
import { DROWNED, FOAM, SEA_MID, TIDE, TIDE_DEEP, TIDE_LIT, TIDE_PALE } from '../palette';
import { type Who, WHO, alive, clamp, dist, fighterOf, SIDE_CSS } from './util';

/**
 * DECREE OF THE DRY TITHE — Councilor Ysolde Neap, Seat of the Tide (water).
 *
 * The clause she drafted for the Drowned Reach, read out in her own room: floor is given back to
 * those who pay for it. Every few seconds the tithe is *called*: three dry tithe-stones rise out of
 * the glass and a wave gathers along one wall. When it is called in, the wave crosses the whole
 * floor — anyone it finds off a stone is LEFT UNDER (hurt, thrown along it, slowed).
 *
 * A stone shelters anyone until somebody *pays* it — strikes it with anything — and after that it
 * shelters its payer only. Neap is perfected water: geysers and wet ground make her the fastest
 * thing on the floor, and she will be on a stone before you are. So pay first. Pay *her* nearest
 * stone from across the room, and the one she is running to is closed to her.
 */

const STONES = 3;
const STONE_R = 34;
const SHELTER_R = 50;
type Edge = 'w' | 'e' | 'n' | 's';

interface Stone { x: number; y: number; payer: Who | null; target: StrikeTarget | null; paidAt: number }

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, rng } = ctx;
  const CALL_MS = ctx.hard ? 3400 : 4200;
  const REST_MS = ctx.hard ? 3800 : 5200;
  const CROSS_MS = 1250;
  const DMG = ctx.hard ? 22 : 18;
  const WET_MS = 2000;

  let state: 'idle' | 'call' | 'wave' | 'rest' = 'idle';
  let at = 0;
  let waveAt = 0;
  let edge: Edge = 'w';
  let stones: Stone[] = [];
  const done: Record<Who, boolean> = { player: false, npc: false };
  const wetUntil: Record<Who, number> = { player: 0, npc: 0 };
  const splashes: { x: number; y: number; at: number }[] = [];
  const now = () => ctx.scene.time.now;

  /** How far the wave has come, 0 at its wall to 1 at the far one. */
  const waveK = (time: number) => clamp((time - waveAt) / CROSS_MS, 0, 1);
  /** The front's coordinate along the travel axis. */
  const frontAt = (k: number): number => {
    if (edge === 'w') return -40 + k * (W + 80);
    if (edge === 'e') return W + 40 - k * (W + 80);
    if (edge === 'n') return top - 40 + k * (H - top + 80);
    return H + 40 - k * (H - top + 80);
  };
  const passed = (x: number, y: number, front: number): boolean =>
    edge === 'w' ? front >= x : edge === 'e' ? front <= x : edge === 'n' ? front >= y : front <= y;
  const travel = (): { x: number; y: number } => (edge === 'w' ? { x: 1, y: 0 } : edge === 'e' ? { x: -1, y: 0 } : edge === 'n' ? { x: 0, y: 1 } : { x: 0, y: -1 });

  const shelterOf = (w: Who): Stone | null => {
    const f = fighterOf(ctx, w);
    for (const s of stones) if ((s.payer === null || s.payer === w) && dist(f.x, f.y, s.x, s.y) <= SHELTER_R) return s;
    return null;
  };

  const clearStones = () => { for (const s of stones) s.target?.remove(); stones = []; };

  const call = (time: number) => {
    clearStones();
    const edges: Edge[] = ['w', 'e', 'n', 's'];
    edge = edges[Math.floor(rng() * (rng() < 0.7 ? 2 : 4))];
    // Three stones, well apart, never hard against the wall the wave comes from.
    for (let tries = 0; stones.length < STONES && tries < 80; tries++) {
      const x = 120 + rng() * (W - 240), y = top + 90 + rng() * (H - top - 160);
      if (stones.some((s) => dist(s.x, s.y, x, y) < 220)) continue;
      const stone: Stone = { x, y, payer: null, target: null, paidAt: 0 };
      stone.target = ctx.target({
        x, y, r: STONE_R, passThrough: true,
        onStruck: (by) => {
          if (state !== 'call' || stone.payer) return;
          stone.payer = by;
          stone.paidAt = now();
          ctx.sfx('money');
          ctx.float(stone.x, stone.y - 44, by === 'player' ? 'PAID — YOURS' : 'PAID — HERS', SIDE_CSS[by]);
        },
      });
      stones.push(stone);
    }
    state = 'call';
    at = time + CALL_MS;
    ctx.banner('THE DRY TITHE IS CALLED', '#9ad8ff');
    ctx.sfx('stone-rise');
  };

  const leftUnder = (w: Who, time: number) => {
    const f = fighterOf(ctx, w);
    const d = travel();
    ctx.hit(f, DMG, f.x, f.y);
    ctx.nudge(f, d.x * 110, d.y * 110);
    wetUntil[w] = time + WET_MS;
    splashes.push({ x: f.x, y: f.y, at: time });
    if (w === 'player') ctx.float(f.x, f.y - 50, 'LEFT UNDER', '#9ad8ff');
  };

  return {
    update(time) {
      if (state === 'idle') { if (at === 0) at = time + 2200; if (time >= at) call(time); return; }
      if (state === 'call' && time >= at) {
        state = 'wave'; waveAt = time; done.player = false; done.npc = false;
        ctx.sfx('water-jet');
        return;
      }
      if (state === 'wave') {
        const front = frontAt(waveK(time));
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (done[w] || !alive(f) || !passed(f.x, f.y, front)) continue;
          done[w] = true;
          if (shelterOf(w)) { ctx.flash(f.x, f.y, TIDE_LIT); continue; }
          leftUnder(w, time);
        }
        if (time >= waveAt + CROSS_MS + 150) { state = 'rest'; at = time + REST_MS; clearStones(); ctx.sfx('splash'); }
        return;
      }
      if (state === 'rest' && time >= at) call(time);
      for (let i = splashes.length - 1; i >= 0; i--) if (time - splashes[i].at > 700) splashes.splice(i, 1);
    },
    playerSpeedMult() { return now() < wetUntil.player ? 0.72 : 1; },
    npcSpeedMult() { return now() < wetUntil.npc ? 0.72 : 1; },
    npcSeek() {
      if (state !== 'call') return null;
      const n = ctx.npc, p = ctx.player;
      // Her own stone if she has paid one; else the nearest she may still use — unless it is
      // nearer you than her, in which case she goes for the next and lets her shots pay it.
      let best: Stone | null = null, bd = Infinity;
      for (const s of stones) {
        if (s.payer === 'player') continue;
        const d = dist(n.x, n.y, s.x, s.y) - (s.payer === 'npc' ? 400 : 0) + (dist(p.x, p.y, s.x, s.y) < dist(n.x, n.y, s.x, s.y) * 0.6 ? 160 : 0);
        if (d < bd) { bd = d; best = s; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },
    destroy() { clearStones(); },
    drawGround(g, time) {
      const callK = state === 'call' ? clamp(1 - (at - time) / CALL_MS, 0, 1) : state === 'wave' ? 1 : 0;
      // The wave gathering along its wall: a deepening band with drowned shapes in it.
      if (state === 'call') drawGather(g, time, callK);
      // Floor still wet where the wave has been.
      if (state === 'wave' || state === 'rest') {
        const k = state === 'wave' ? waveK(time) : 1;
        const fade = state === 'rest' ? clamp((at - time) / REST_MS, 0, 1) : 1;
        const front = frontAt(k);
        g.fillStyle(TIDE_DEEP, 0.22 * fade);
        if (edge === 'w') g.fillRect(0, top, Math.max(0, front), H - top);
        else if (edge === 'e') g.fillRect(front, top, W - front, H - top);
        else if (edge === 'n') g.fillRect(0, top, W, Math.max(0, front - top));
        else g.fillRect(0, front, W, H - front);
      }
      // The stones.
      for (const s of stones) drawStone(g, s, time, callK);
      for (const sp of splashes) splashRing(g, sp.x, sp.y + 14, (time - sp.at) / 700, 40);
    },
    drawAir(g, time) {
      if (state === 'wave') drawWave(g, time, waveK(time));
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f) || now() >= wetUntil[w]) continue;
        for (let i = 0; i < 4; i++) {
          const k = ((time / 500) + i / 4) % 1;
          g.fillStyle(TIDE_LIT, 0.8 * (1 - k)); g.fillCircle(f.x - 12 + i * 8, f.y - 6 + k * 24, 1.8);
        }
      }
    },
    drawHud(g, time) {
      if (state !== 'call') return;
      const cx = W / 2, cy = top + 22;
      const k = clamp((at - time) / CALL_MS, 0, 1);
      g.fillStyle(OBS.glass, 0.9); g.fillRoundedRect(cx - 132, cy - 13, 264, 26, 8);
      g.lineStyle(1.5, OBS.edge, 0.7); g.strokeRoundedRect(cx - 132, cy - 13, 264, 26, 8);
      g.fillStyle(k < 0.25 ? TIDE_PALE : TIDE, 1); g.fillRoundedRect(cx - 104, cy - 5, 176 * k, 10, 4);
      // A pip per stone: brass while unpaid, your colour or hers once paid.
      stones.forEach((s, i) => {
        const px = cx + 92 + i * 13;
        if (s.payer) { g.fillStyle(s.payer === 'player' ? TIDE_PALE : OBS.seamLit, 1); g.fillCircle(px, cy, 5); }
        else titheCoin(g, px, cy, 5);
      });
      titheCoin(g, cx - 118, cy, 8);
    },
  };

  function drawStone(g: Phaser.GameObjects.Graphics, s: Stone, time: number, k: number): void {
    const rise = state === 'call' ? clamp(k * 4, 0, 1) : 1;
    const r = STONE_R * (0.5 + rise * 0.5);
    const col = s.payer === 'player' ? TIDE_PALE : s.payer === 'npc' ? OBS.seamLit : 0x8c8458;
    // Shelter ring on the floor.
    g.lineStyle(2, col, 0.25 + rise * 0.35); g.strokeCircle(s.x, s.y, SHELTER_R);
    g.fillStyle(col, 0.06); g.fillCircle(s.x, s.y, SHELTER_R);
    // The stone: a squat drum of black glass with the tithe-coin set in its top.
    g.fillStyle(0x000000, 0.4); g.fillEllipse(s.x, s.y + r * 0.5, r * 2.3, r * 0.8);
    g.fillStyle(OBS.glass, 1); g.fillRect(s.x - r, s.y - r * 0.2, r * 2, r * 0.6);
    g.fillStyle(OBS.facet, 1); g.fillEllipse(s.x, s.y + r * 0.4, r * 2, r * 0.7);
    g.fillStyle(OBS.glass, 1); g.fillRect(s.x - r, s.y - r * 0.25, r * 2, r * 0.6);
    g.fillStyle(OBS.sheen, 1); g.fillEllipse(s.x, s.y - r * 0.25, r * 2, r * 0.72);
    g.lineStyle(1.2, OBS.edge, 0.7); g.strokeEllipse(s.x, s.y - r * 0.25, r * 2, r * 0.72);
    titheCoin(g, s.x, s.y - r * 0.27, r * 0.5);
    if (s.payer) {
      const pk = clamp((time - s.paidAt) / 400, 0, 1);
      g.lineStyle(3 * (1 - pk) + 1.5, col, 0.9); g.strokeEllipse(s.x, s.y - r * 0.25, r * 2 + pk * 30, r * 0.72 + pk * 12);
      seam(g, [{ x: s.x - r * 0.8, y: s.y + r * 0.1 }, { x: s.x - r * 0.2, y: s.y + r * 0.25 }, { x: s.x + r * 0.6, y: s.y }], 1, 0.9, 0.5, s.payer === 'player' ? TIDE : OBS.seam);
    }
    // Water streaming off it as it rises.
    if (state === 'call' && k < 0.35) {
      for (let i = 0; i < 6; i++) { g.fillStyle(TIDE_LIT, 0.6); g.fillCircle(s.x - r + (i / 5) * r * 2, s.y + r * 0.2 + ((time / 8 + i * 13) % 14), 1.5); }
    }
  }

  function drawGather(g: Phaser.GameObjects.Graphics, time: number, k: number): void {
    const depth = 20 + k * 70;
    const t = time / 1000;
    const horiz = edge === 'n' || edge === 's';
    const along = horiz ? W : H - top;
    g.fillStyle(SEA_MID, 0.35 + k * 0.4);
    for (let i = 0; i < 24; i++) {
      const u0 = (i / 24) * along, u1 = ((i + 1) / 24) * along;
      const s0 = depth + Math.sin(t * 3 + i * 0.8) * 8 * (0.4 + k), s1 = depth + Math.sin(t * 3 + (i + 1) * 0.8) * 8 * (0.4 + k);
      if (edge === 'w') g.fillPoints([pt(0, top + u0), pt(s0, top + u0), pt(s1, top + u1), pt(0, top + u1)], true);
      else if (edge === 'e') g.fillPoints([pt(W, top + u0), pt(W - s0, top + u0), pt(W - s1, top + u1), pt(W, top + u1)], true);
      else if (edge === 'n') g.fillPoints([pt(u0, top), pt(u0, top + s0), pt(u1, top + s1), pt(u1, top)], true);
      else g.fillPoints([pt(u0, H), pt(u0, H - s0), pt(u1, H - s1), pt(u1, H)], true);
    }
    // Foam along its lip and the drowned turning in it.
    for (let i = 0; i < 18; i++) {
      const u = ((i + 0.5) / 18) * along;
      const sw = depth + Math.sin(t * 3 + i * 1.07) * 8 * (0.4 + k);
      const p = edge === 'w' ? { x: sw, y: top + u } : edge === 'e' ? { x: W - sw, y: top + u } : edge === 'n' ? { x: u, y: top + sw } : { x: u, y: H - sw };
      g.fillStyle(FOAM, 0.35 + k * 0.4); g.fillCircle(p.x, p.y, 3 + (i % 3));
      if (i % 5 === 2 && k > 0.3) {
        const q = edge === 'w' ? { x: sw * 0.45, y: p.y } : edge === 'e' ? { x: W - sw * 0.45, y: p.y } : edge === 'n' ? { x: p.x, y: top + sw * 0.45 } : { x: p.x, y: H - sw * 0.45 };
        sleeper(g, q.x, q.y, 13, t + i, { alpha: (k - 0.3) * 0.9 });
      }
    }
    // Chevrons on the floor: which way it will run.
    const d = travel();
    for (let i = 0; i < 5; i++) {
      const ph = ((time / 700) + i / 5) % 1;
      const base = edge === 'w' || edge === 'e' ? { x: edge === 'w' ? 120 + ph * 200 : W - 120 - ph * 200, y: top + 60 + i * ((H - top - 120) / 4) } : { x: 120 + i * ((W - 240) / 4), y: edge === 'n' ? top + 110 + ph * 180 : H - 110 - ph * 180 };
      const a = Math.atan2(d.y, d.x);
      g.lineStyle(3, TIDE_LIT, 0.3 * Math.sin(ph * Math.PI) * (0.4 + k));
      g.lineBetween(base.x + Math.cos(a + 2.5) * 16, base.y + Math.sin(a + 2.5) * 16, base.x, base.y);
      g.lineBetween(base.x + Math.cos(a - 2.5) * 16, base.y + Math.sin(a - 2.5) * 16, base.x, base.y);
    }
  }

  function drawWave(g: Phaser.GameObjects.Graphics, time: number, k: number): void {
    const front = frontAt(k);
    const t = time / 1000;
    const horiz = edge === 'n' || edge === 's';
    const sign = edge === 'w' || edge === 'n' ? -1 : 1;
    const along = horiz ? W : H - top;
    const BODY = 150;
    // The body of the wave behind its front: three layered bands, darkening backward.
    for (let layer = 0; layer < 3; layer++) {
      const back = BODY * (1 - layer * 0.3);
      const col = mixC(SEA_MID, TIDE, layer * 0.35);
      g.fillStyle(col, 0.55 + layer * 0.12);
      if (!horiz) g.fillRect(Math.min(front, front + sign * back), top, back, H - top);
      else g.fillRect(0, Math.min(front, front + sign * back), W, back);
    }
    // The curling lip: overlapping arcs of foam all along the front.
    for (let i = 0; i < 26; i++) {
      const u = (i / 25) * along;
      const wob = Math.sin(t * 9 + i * 0.9) * 10;
      const p = !horiz ? { x: front + wob, y: top + u } : { x: u, y: front + wob };
      g.fillStyle(lit(TIDE, 0.5), 0.9); g.fillCircle(p.x, p.y, 16 + (i % 3) * 3);
      g.fillStyle(FOAM, 0.95); g.fillCircle(p.x - sign * (horiz ? 0 : 6), p.y - sign * (horiz ? 6 : 0), 9 + (i % 2) * 3);
      // Spray thrown ahead.
      for (let j = 0; j < 2; j++) {
        const sk = ((t * 3 + i * 0.37 + j * 0.5) % 1);
        const off = -sign * (10 + sk * 40);
        g.fillStyle(FOAM, 0.7 * (1 - sk));
        g.fillCircle(p.x + (!horiz ? off : (j - 0.5) * 14), p.y + (horiz ? off : (j - 0.5) * 14), 2);
      }
    }
    // Hands of the drowned reaching out of the face of it.
    for (let i = 0; i < 6; i++) {
      const u = ((i + 0.5) / 6) * along + Math.sin(i * 7.1) * 30;
      const reach = 22 + Math.sin(t * 6 + i) * 8;
      const base = !horiz ? { x: front + sign * 30, y: top + u } : { x: u, y: front + sign * 30 };
      const tip = !horiz ? { x: base.x - sign * reach * 1.6, y: base.y - 8 } : { x: base.x + 8, y: base.y - sign * reach * 1.6 };
      g.lineStyle(5, DROWNED, 0.75); g.lineBetween(base.x, base.y, tip.x, tip.y);
      g.fillStyle(DROWNED, 0.85); g.fillCircle(tip.x, tip.y, 5);
      for (let f = -1; f <= 1; f++) g.lineBetween(tip.x, tip.y, tip.x + (!horiz ? -sign * 7 : f * 4), tip.y + (!horiz ? f * 4 : -sign * 7));
    }
  }

  function pt(x: number, y: number): Phaser.Geom.Point { return new Phaser.Geom.Point(x, y); }
};

export const DRY_TITHE: GimmickDef = {
  id: 'bench-water-dry-tithe',
  rules: 'When the tithe is called, a wave crosses the floor; only a tithe-stone keeps you dry. A stone struck is paid, and shelters its payer alone.',
  make,
};
