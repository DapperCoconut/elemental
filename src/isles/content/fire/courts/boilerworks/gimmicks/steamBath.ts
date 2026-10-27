import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { lit } from '../../../../../art/IsleArt';
import { IRON_DARK, RIVET, STEAM, clamp, dist, frameClock, noise, rivets } from '../util';

/**
 * Steam Bath — Scalder Mira runs the works' scalding room, where they parboil the coal-dust off
 * the night shift. Banks of live steam drift across the floor; **anyone inside a bank takes more
 * damage** (it softens you, she says).
 *
 * The steam is pushable: a fighter wading through a bank drags it along their line of travel,
 * so a player can herd a bank onto Mira and then hit her through it. Two cold-water condenser
 * grates on the floor eat any bank that drifts over them. Every few seconds Mira whistles and
 * vents a fresh bank on top of the player — a rising whistle ring marks the spot first.
 */

interface Bank { x: number; y: number; vx: number; vy: number; r: number; dieAt: number; seed: number; bornAt: number }
interface Whistle { x: number; y: number; firesAt: number; bornAt: number }

const MAX_BANKS = 5;

function makeSteamBath(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, hard } = ctx;
  const takenMult = hard ? 1.5 : 1.35;
  const ventEvery = hard ? 5000 : 6500;
  const tick = frameClock();

  const condensers: Pt[] = [{ x: 150, y: (top + H) / 2 }, { x: W - 150, y: (top + H) / 2 }];
  const banks: Bank[] = [];
  const whistles: Whistle[] = [];
  let seedN = 1;
  const now0 = ctx.scene.time.now;

  const spawnBank = (x: number, y: number, r: number, time: number): void => {
    if (banks.length >= MAX_BANKS) {
      // The oldest bank thins out early rather than the room filling solid.
      let oldest = banks[0];
      for (const b of banks) if (b.bornAt < oldest.bornAt) oldest = b;
      oldest.dieAt = Math.min(oldest.dieAt, time + 900);
    }
    const a = ctx.rng() * Math.PI * 2;
    banks.push({
      x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 50),
      vx: Math.cos(a) * 22, vy: Math.sin(a) * 22, r, dieAt: time + 15000, seed: seedN++, bornAt: time,
    });
  };
  spawnBank(W * 0.32, top + 150, 100, now0);
  spawnBank(W * 0.68, H - 140, 100, now0);
  spawnBank(W * 0.5, (top + H) / 2, 86, now0);

  let nextVent = now0 + 3500;
  const prev = { px: ctx.player.x, py: ctx.player.y, nx: ctx.npc.x, ny: ctx.npc.y };

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const bankAt = (x: number, y: number): Bank | null => {
    for (const b of banks) if (dist(x, y, b.x, b.y) < b.r * fade(b, ctx.scene.time.now)) return b;
    return null;
  };
  /** 0→1 as a bank swells in, 1→0 as it thins out at the end. */
  const fade = (b: Bank, time: number): number =>
    clamp((time - b.bornAt) / 700, 0, 1) * clamp((b.dieAt - time) / 1200, 0, 1);

  const wade = (f: Fighter, vx: number, vy: number, dt: number): void => {
    if (!alive(f)) return;
    const sp = Math.hypot(vx, vy);
    if (sp < 30) return;
    for (const b of banks) {
      if (dist(f.x, f.y, b.x, b.y) > b.r) continue;
      const k = Math.min(1, dt * 2.2);
      b.vx += (vx * 0.75 - b.vx) * k;
      b.vy += (vy * 0.75 - b.vy) * k;
    }
  };

  return {
    update(time) {
      const dt = tick(time);
      if (dt <= 0) return;
      const pvx = (ctx.player.x - prev.px) / dt, pvy = (ctx.player.y - prev.py) / dt;
      const nvx = (ctx.npc.x - prev.nx) / dt, nvy = (ctx.npc.y - prev.ny) / dt;
      prev.px = ctx.player.x; prev.py = ctx.player.y; prev.nx = ctx.npc.x; prev.ny = ctx.npc.y;
      // Teleports and knockbacks are not wading.
      if (Math.hypot(pvx, pvy) < 420) wade(ctx.player, pvx, pvy, dt);
      if (Math.hypot(nvx, nvy) < 420) wade(ctx.npc, nvx, nvy, dt);

      for (const b of banks) {
        // Drag back toward a lazy drift, and bounce off the walls.
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 26) { const k = Math.max(26 / sp, 1 - dt * 0.7); b.vx *= k; b.vy *= k; }
        b.vx += Math.sin(time / 1700 + b.seed) * 6 * dt;
        b.vy += Math.cos(time / 2100 + b.seed * 1.7) * 6 * dt;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < 40 || b.x > W - 40) { b.vx = -b.vx; b.x = clamp(b.x, 40, W - 40); }
        if (b.y < top + 30 || b.y > H - 30) { b.vy = -b.vy; b.y = clamp(b.y, top + 30, H - 30); }
        // Condensers eat steam.
        for (const c of condensers) {
          if (dist(b.x, b.y, c.x, c.y) < b.r * 0.7 && b.dieAt > time + 600) {
            b.r -= 40 * dt;
            if (b.r < 40) { b.dieAt = time + 400; ctx.float(c.x, c.y - 30, 'CONDENSED', '#bfe8ff'); ctx.sfx('splash'); }
          }
        }
      }
      for (let i = banks.length - 1; i >= 0; i--) if (time >= banks[i].dieAt) banks.splice(i, 1);

      // Mira's whistle: a fresh bank vented onto the player.
      if (time >= nextVent && alive(ctx.player)) {
        nextVent = time + ventEvery;
        whistles.push({ x: ctx.player.x, y: ctx.player.y, firesAt: time + 1300, bornAt: time });
        ctx.sfx('screech');
      }
      for (let i = whistles.length - 1; i >= 0; i--) {
        const w = whistles[i];
        if (time < w.firesAt) continue;
        whistles.splice(i, 1);
        spawnBank(w.x, w.y, hard ? 104 : 92, time);
        ctx.sfx('geyser');
        if (alive(ctx.player) && dist(ctx.player.x, ctx.player.y, w.x, w.y) < 70) {
          ctx.hit(ctx.player, 6, ctx.player.x, ctx.player.y);
          ctx.float(ctx.player.x, ctx.player.y - 40, 'SCALDED', '#ffffff');
        }
      }
    },

    playerTakenMult: () => (bankAt(ctx.player.x, ctx.player.y) ? takenMult : 1),
    npcTakenMult: () => (bankAt(ctx.npc.x, ctx.npc.y) ? takenMult : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const mine = bankAt(n.x, n.y);
      if (!mine) return null;
      if (bankAt(ctx.player.x, ctx.player.y) === mine) return null;
      // Step out of the steam the short way.
      const a = Math.atan2(n.y - mine.y, n.x - mine.x);
      return { x: clamp(mine.x + Math.cos(a) * (mine.r + 50), 60, W - 60), y: clamp(mine.y + Math.sin(a) * (mine.r + 50), top + 40, H - 40) };
    },

    drawGround(g, time) {
      // Condenser grates: cold blue water under an iron lattice.
      for (const c of condensers) {
        g.fillStyle(0x6fc8ff, 0.1); g.fillCircle(c.x, c.y, 70);
        g.fillStyle(IRON_DARK, 1); g.fillCircle(c.x, c.y, 44);
        g.fillStyle(0x2f6f9a, 1); g.fillCircle(c.x, c.y, 38);
        g.fillStyle(0x7fd4ff, 0.35 + 0.1 * Math.sin(time / 300)); g.fillCircle(c.x, c.y, 30);
        g.lineStyle(3, 0x23272c, 1);
        for (let k = -30; k <= 30; k += 10) {
          const h = Math.sqrt(Math.max(0, 38 * 38 - k * k));
          g.lineBetween(c.x + k, c.y - h, c.x + k, c.y + h);
          g.lineBetween(c.x - h, c.y + k, c.x + h, c.y + k);
        }
        g.lineStyle(3, RIVET, 1); g.strokeCircle(c.x, c.y, 44);
        rivets(g, { x: c.x - 40, y: c.y - 48 }, { x: c.x + 40, y: c.y - 48 }, 20, 1.3);
      }
      // Wet sheen under each bank.
      for (const b of banks) {
        const f = fade(b, time);
        g.fillStyle(0x9fc4d8, 0.1 * f); g.fillEllipse(b.x, b.y + b.r * 0.15, b.r * 2.1, b.r * 1.5);
        g.lineStyle(1.5, 0xd8f0ff, 0.22 * f); g.strokeCircle(b.x, b.y, b.r * f);
      }
      // Whistle telegraphs: concentric rings tightening on the spot.
      for (const w of whistles) {
        const k = clamp((time - w.bornAt) / (w.firesAt - w.bornAt), 0, 1);
        g.fillStyle(0xffffff, 0.08 + k * 0.12); g.fillCircle(w.x, w.y, 92);
        for (let i = 0; i < 3; i++) {
          const rr = 92 * (1 - ((k + i / 3) % 1));
          g.lineStyle(2.5, 0xffffff, 0.6 * k + 0.2); g.strokeCircle(w.x, w.y, rr);
        }
      }
    },

    drawAir(g, time) {
      for (const b of banks) {
        const f = fade(b, time);
        if (f <= 0) continue;
        // A bank is a crowd of soft puffs orbiting slowly, denser at the core.
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + time / (2600 + (i % 3) * 700) * (i % 2 ? 1 : -1);
          const rr = b.r * (0.25 + noise(b.seed * 13 + i) * 0.55);
          const px = b.x + Math.cos(a) * rr, py = b.y + Math.sin(a) * rr * 0.8;
          const s = b.r * (0.32 + noise(b.seed * 7 + i) * 0.22);
          g.fillStyle(STEAM, 0.16 * f); g.fillCircle(px, py, s);
        }
        g.fillStyle(0xffffff, 0.18 * f); g.fillCircle(b.x, b.y, b.r * 0.45);
        // Curling wisps off the top.
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 1400) + i / 3 + b.seed * 0.17) % 1;
          g.fillStyle(STEAM, 0.25 * f * (1 - ph));
          g.fillCircle(b.x + Math.sin(ph * 6 + i) * b.r * 0.4, b.y - b.r * 0.5 - ph * 40, 8 + ph * 12);
        }
      }
      // A tag over anyone being softened.
      for (const f of [ctx.player, ctx.npc]) {
        if (!alive(f) || !bankAt(f.x, f.y)) continue;
        const y = f.y - 52 + Math.sin(time / 200) * 2;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(f.x - 20, y - 8, 40, 14, 6);
        g.fillStyle(lit(0xff6a4a, 0.2), 1);
        g.fillTriangle(f.x - 14, y + 3, f.x - 8, y - 6, f.x - 2, y + 3);
        g.fillStyle(0xffffff, 0.9);
        for (let i = 0; i < 3; i++) g.fillCircle(f.x + 3 + i * 5, y - 1 + Math.sin(time / 120 + i) * 1.5, 1.6);
      }
    },
  };
}

export const STEAM_BATH: GimmickDef = {
  id: 'boilerworks-steam-bath',
  rules: 'Anyone inside a steam bank takes more damage. Wade through a bank to drag it; condensers eat it.',
  make: makeSteamBath,
};
