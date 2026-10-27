import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { BRICK, BRICK_DARK, IRON, SMOKE, SOOT } from '../palette';
import { alive, angDiff, darknessGrid, dist, frameClock } from './util';

/**
 * Soot Season — Sweep-Captain Mottle.
 *
 * Four chimney pots stand in the corners of the room, and fat soot clouds roll out of them and
 * drift about, bouncing off the walls. Inside a cloud you choke (a little damage each second),
 * you wade at 60% speed, and if it is *you* in there the room goes black but for a small circle
 * round your feet.
 *
 * Mottle is a sweep with a bellows-brush: every few seconds he plants and *blows*, and a cone of
 * wind (shown a full second ahead, streaks running down it) shoves every cloud it covers toward
 * you. The bot hides behind a cloud before blowing it at you (`npcSeek`).
 *
 * The exploit: the soot doesn't care whose lungs it's in. Dodge the gust and the cloud rolls on
 * past you, off the wall and back — and if you hit Mottle while *he* is inside one, the cloud
 * bursts in his face for a big extra hit and he loses it.
 */

const SLOW = 0.6;
const CHOKE = 3;
const CHOKE_MS = 1000;
const GUST_LEN = 560;
const GUST_HALF = 0.42;
const GUST_WARN = 1000;
const BURST = 9;

interface Cloud {
  x: number; y: number; r: number;
  vx: number; vy: number;
  /** Gust shove — decays to the drift. */
  gx: number; gy: number;
  /** Fades in from its pot. */
  bornAt: number;
  /** Dead clouds wait to roll out of a pot again. */
  respawnAt: number;
  seed: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const step = frameClock();
  const pots: Pt[] = [
    { x: 54, y: top + 48 }, { x: W - 54, y: top + 48 },
    { x: 54, y: H - 40 }, { x: W - 54, y: H - 40 },
  ];
  const clouds: Cloud[] = [];
  const count = ctx.hard ? 5 : 4;
  for (let i = 0; i < count; i++) {
    const p = pots[i % 4];
    clouds.push(newCloud(p, 0, i));
  }
  let gustWarnAt = 0;
  let gustAt = 0;
  let gustAngle = 0;
  let gustFrom: Pt = { x: 0, y: 0 };
  let gustFxUntil = 0;
  let lastChokeP = 0;
  let lastChokeN = 0;
  let vision = 0;
  /** Guards the burst's own hit from bursting a second cloud. */
  let bursting = false;
  let started = false;
  const gustEvery = ctx.hard ? 5200 : 6500;

  function newCloud(pot: Pt, time: number, i: number): Cloud {
    const toward = Math.atan2(H * 0.55 - pot.y, W / 2 - pot.x) + (rng() - 0.5) * 0.9;
    const sp = 30 + rng() * 18;
    return {
      x: pot.x, y: pot.y - 20, r: 78 + rng() * 26,
      vx: Math.cos(toward) * sp, vy: Math.sin(toward) * sp, gx: 0, gy: 0,
      bornAt: time, respawnAt: 0, seed: i * 3.7 + rng() * 5,
    };
  }

  const live = (c: Cloud, time: number) => c.respawnAt === 0 && time - c.bornAt > 400;
  const inside = (c: Cloud, x: number, y: number) => dist(c.x, c.y, x, y) < c.r * 0.85;
  const inAny = (x: number, y: number, time: number) => clouds.some((c) => live(c, time) && inside(c, x, y));

  return {
    update(time) {
      const dt = step(time);
      if (!started) { started = true; gustWarnAt = time + 3500; }

      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        if (c.respawnAt) {
          if (time >= c.respawnAt) clouds[i] = newCloud(pots[Math.floor(rng() * 4)], time, i + Math.floor(time));
          continue;
        }
        c.x += (c.vx + c.gx) * dt;
        c.y += (c.vy + c.gy) * dt;
        const decay = Math.pow(0.35, dt);
        c.gx *= decay; c.gy *= decay;
        // Bounce off the walls — the gust you dodged comes back.
        const minX = c.r * 0.5, maxX = W - c.r * 0.5, minY = top + c.r * 0.4, maxY = H - c.r * 0.4;
        if (c.x < minX) { c.x = minX; c.vx = Math.abs(c.vx); c.gx = Math.abs(c.gx) * 0.6; }
        if (c.x > maxX) { c.x = maxX; c.vx = -Math.abs(c.vx); c.gx = -Math.abs(c.gx) * 0.6; }
        if (c.y < minY) { c.y = minY; c.vy = Math.abs(c.vy); c.gy = Math.abs(c.gy) * 0.6; }
        if (c.y > maxY) { c.y = maxY; c.vy = -Math.abs(c.vy); c.gy = -Math.abs(c.gy) * 0.6; }
      }

      // Choking.
      const pIn = alive(player) && inAny(player.x, player.y, time);
      const nIn = alive(npc) && inAny(npc.x, npc.y, time);
      if (pIn && time - lastChokeP > CHOKE_MS) { lastChokeP = time; ctx.hit(player, CHOKE, player.x, player.y); }
      if (nIn && time - lastChokeN > CHOKE_MS) { lastChokeN = time; ctx.hit(npc, CHOKE, npc.x, npc.y); }
      vision += ((pIn ? 1 : 0) - vision) * Math.min(1, dt * 5);

      // The gust: plant, warn, blow.
      if (gustAt === 0 && time >= gustWarnAt) {
        gustAt = time + GUST_WARN;
        gustFrom = { x: npc.x, y: npc.y };
        gustAngle = Math.atan2(player.y - npc.y, player.x - npc.x);
        ctx.float(npc.x, npc.y - 40, 'DEEP BREATH...', '#d8d2c8');
        ctx.sfx('beam-charge');
      }
      if (gustAt && time >= gustAt) {
        gustAt = 0;
        gustWarnAt = time + gustEvery;
        gustFxUntil = time + 700;
        ctx.sfx('gust');
        let moved = 0;
        for (const c of clouds) {
          if (!live(c, time)) continue;
          if (!inCone(c.x, c.y, c.r * 0.5)) continue;
          c.gx = Math.cos(gustAngle) * 290;
          c.gy = Math.sin(gustAngle) * 290;
          moved++;
        }
        if (alive(player) && inCone(player.x, player.y, 0)) {
          ctx.nudge(player, Math.cos(gustAngle) * 46, Math.sin(gustAngle) * 46);
        }
        if (moved) ctx.float(gustFrom.x, gustFrom.y - 40, 'SWEEP!', '#d8d2c8');
      }
    },

    onNpcHurt(amount) {
      // Hitting Mottle while he's wrapped in soot bursts it in his face.
      const time = ctx.scene.time.now;
      if (bursting || amount < CHOKE + 2) return;
      for (const c of clouds) {
        if (!live(c, time) || !inside(c, npc.x, npc.y)) continue;
        c.respawnAt = time + 4200;
        bursting = true;
        ctx.hit(npc, ctx.hard ? BURST - 2 : BURST, npc.x, npc.y);
        bursting = false;
        ctx.float(npc.x, npc.y - 46, 'SOOT BURST', '#f0e8dc');
        ctx.flash(c.x, c.y, 0x2b2725);
        ctx.sfx('explosion-small');
        break;
      }
    },

    playerSpeedMult: () => (inAny(player.x, player.y, ctx.scene.time.now) ? SLOW : 1),
    npcSpeedMult: () => (inAny(npc.x, npc.y, ctx.scene.time.now) ? SLOW : 1),

    npcSeek() {
      const time = ctx.scene.time.now;
      // Wrapped in soot: get out the short way.
      for (const c of clouds) {
        if (!live(c, time) || !inside(c, npc.x, npc.y)) continue;
        const a = Math.atan2(npc.y - c.y, npc.x - c.x);
        return clampPt({ x: c.x + Math.cos(a) * (c.r + 30), y: c.y + Math.sin(a) * (c.r + 30) });
      }
      // About to blow: put a cloud between himself and the player.
      if (gustAt === 0 && gustWarnAt - time < 2200) {
        let best: Cloud | null = null;
        let bd = 1e9;
        for (const c of clouds) {
          if (!live(c, time)) continue;
          const d = dist(c.x, c.y, npc.x, npc.y) + dist(c.x, c.y, player.x, player.y) * 0.5;
          if (d < bd) { bd = d; best = c; }
        }
        if (best) {
          const a = Math.atan2(best.y - player.y, best.x - player.x);
          return clampPt({ x: best.x + Math.cos(a) * (best.r + 50), y: best.y + Math.sin(a) * (best.r + 50) });
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const p of pots) drawPot(g, p.x, p.y);
      // Soot settles where the clouds have been.
      for (const c of clouds) {
        if (c.respawnAt) continue;
        g.fillStyle(SOOT, 0.12);
        g.fillEllipse(c.x, c.y + c.r * 0.35, c.r * 1.6, c.r * 0.5);
      }
      // The gust cone, warned a full second ahead.
      if (gustAt) {
        const k = 1 - (gustAt - time) / GUST_WARN;
        g.fillStyle(0xe8e2d6, 0.06 + k * 0.1);
        g.beginPath();
        g.moveTo(gustFrom.x, gustFrom.y);
        g.arc(gustFrom.x, gustFrom.y, GUST_LEN, gustAngle - GUST_HALF, gustAngle + GUST_HALF, false);
        g.closePath(); g.fillPath();
        g.lineStyle(2, 0xf0e8dc, 0.5 + k * 0.4);
        for (const s of [-1, 1]) {
          const a = gustAngle + s * GUST_HALF;
          g.lineBetween(gustFrom.x, gustFrom.y, gustFrom.x + Math.cos(a) * GUST_LEN, gustFrom.y + Math.sin(a) * GUST_LEN);
        }
        // Wind streaks running down the cone.
        for (let i = 0; i < 9; i++) {
          const ph = ((time / 500) + i / 9) % 1;
          const a = gustAngle + ((i % 5) - 2) * GUST_HALF * 0.38;
          const d0 = 40 + ph * (GUST_LEN - 80);
          g.lineStyle(1.5, 0xffffff, 0.5 * (1 - ph));
          g.lineBetween(
            gustFrom.x + Math.cos(a) * d0, gustFrom.y + Math.sin(a) * d0,
            gustFrom.x + Math.cos(a) * (d0 + 34), gustFrom.y + Math.sin(a) * (d0 + 34),
          );
        }
      }
    },

    drawAir(g, time) {
      for (const c of clouds) {
        if (c.respawnAt) continue;
        const fade = Math.min(1, (time - c.bornAt) / 600);
        drawCloud(g, c, time, fade);
      }
      if (time < gustFxUntil) {
        const k = 1 - (gustFxUntil - time) / 700;
        g.lineStyle(3, 0xffffff, 0.5 * (1 - k));
        for (let i = -2; i <= 2; i++) {
          const a = gustAngle + i * 0.16;
          const d = 60 + k * GUST_LEN;
          g.lineBetween(gustFrom.x + Math.cos(a) * (d - 60), gustFrom.y + Math.sin(a) * (d - 60),
            gustFrom.x + Math.cos(a) * d, gustFrom.y + Math.sin(a) * d);
        }
      }
      // Mottle's bellows-brush mouth puffs while he winds the gust.
      if (gustAt) {
        const ph = (time % 300) / 300;
        g.fillStyle(SMOKE, 0.6 * (1 - ph));
        g.fillCircle(npc.x + Math.cos(gustAngle) * (26 + ph * 20), npc.y + Math.sin(gustAngle) * (26 + ph * 20), 6 + ph * 6);
      }
    },

    drawHud(g, time) {
      // Blind in the soot: the room goes black but for a small circle round you.
      darknessGrid(g, W, H, top, [{ x: player.x, y: player.y, r: 150 }], 0.9 * vision, 0x0b0908);
      // Gust clock: a little bellows that fills.
      const k = gustAt ? 1 : Math.max(0, Math.min(1, 1 - (gustWarnAt - time) / gustEvery));
      const x = W / 2, y = top + 18;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 54, y - 8, 108, 16, 6);
      g.fillStyle(gustAt && Math.floor(time / 120) % 2 === 0 ? 0xffffff : 0xb8b2a8, 0.95);
      g.fillRoundedRect(x - 51, y - 5, 102 * k, 10, 4);
      g.lineStyle(1.5, IRON, 1); g.strokeRoundedRect(x - 54, y - 8, 108, 16, 6);
    },
  };

  function inCone(x: number, y: number, slack: number): boolean {
    const d = dist(gustFrom.x, gustFrom.y, x, y);
    if (d > GUST_LEN + slack) return false;
    const a = Math.atan2(y - gustFrom.y, x - gustFrom.x);
    const half = GUST_HALF + (d > 1 ? Math.atan(slack / d) : Math.PI);
    return Math.abs(angDiff(a, gustAngle)) < half;
  }

  function clampPt(p: Pt): Pt {
    return { x: Math.max(50, Math.min(W - 50, p.x)), y: Math.max(top + 50, Math.min(H - 50, p.y)) };
  }
}

/** A chimney pot standing in the floor's corner, coughing soot. */
function drawPot(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0x000000, 0.35); g.fillEllipse(x, y + 4, 60, 16);
  g.fillStyle(BRICK_DARK, 1); g.fillRect(x - 22, y - 34, 44, 38);
  g.fillStyle(BRICK, 1); g.fillRect(x - 20, y - 32, 40, 34);
  for (let k = 0; k < 4; k++) { g.fillStyle(BRICK_DARK, 0.6); g.fillRect(x - 20, y - 26 + k * 8, 40, 1.5); }
  g.fillStyle(IRON, 1); g.fillRect(x - 26, y - 40, 52, 8);
  g.fillStyle(SOOT, 1); g.fillEllipse(x, y - 40, 36, 8);
}

/** A soot cloud: lumpy, heavy, with a darker core and loose flakes falling out of it. */
function drawCloud(g: Phaser.GameObjects.Graphics, c: Cloud, time: number, fade: number): void {
  const t = time / 1000;
  g.fillStyle(SOOT, 0.22 * fade);
  g.fillEllipse(c.x, c.y + c.r * 0.3, c.r * 1.9, c.r * 0.6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + c.seed;
    const rr = c.r * (0.45 + 0.12 * Math.sin(t * 1.3 + i * 1.9 + c.seed));
    const px = c.x + Math.cos(a) * c.r * 0.42;
    const py = c.y + Math.sin(a) * c.r * 0.3 - c.r * 0.1;
    g.fillStyle(i % 2 ? 0x2b2725 : 0x3a3532, 0.55 * fade);
    g.fillCircle(px, py, rr);
  }
  g.fillStyle(0x161312, 0.6 * fade); g.fillCircle(c.x, c.y - c.r * 0.08, c.r * 0.5);
  g.fillStyle(0x6f6a66, 0.25 * fade); g.fillCircle(c.x - c.r * 0.2, c.y - c.r * 0.38, c.r * 0.28);
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.8 + i / 6 + c.seed) % 1;
    g.fillStyle(SOOT, 0.7 * (1 - ph) * fade);
    g.fillRect(c.x + Math.sin(i * 2.3 + c.seed) * c.r * 0.6, c.y + c.r * 0.2 + ph * c.r * 0.5, 2.5, 2.5);
  }
}

export const SOOT_SEASON: GimmickDef = {
  id: 'hearth-soot-season',
  rules: 'Soot clouds slow and choke whoever is inside, and blind you. Mottle blows them at you. Hit him in one to burst it.',
  make,
};
