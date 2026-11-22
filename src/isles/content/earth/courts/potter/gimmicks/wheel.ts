import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../../art/IsleArt';
import { IRON, IRON_LIT, MARL_DARK, SLIP, SLIP_DARK, SLIP_DEEP, SLIP_LIT, STRATA, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Potter's Wheel — Thrower Wenna.
 *
 * The whole yard is the head of the court's Great Wheel, and it is turning — slowly at first,
 * faster all fight. Anyone standing on it is carried round with it, and the further out you
 * stand the harder you are flung toward the rim; flung clean off the edge at speed, you land in
 * the splash pan, hurt and dazed. The rim throws gobs of slip off as it goes.
 *
 * The middle — the hub — is still. But every few seconds Wenna "opens" the clay: a ring of slip
 * glistens round the hub, then rises into a pot wall and *collars in*, closing toward the
 * centre. Anyone inside the wall when it rises is shut in and squeezed when it closes. Step out
 * over the slip ring before it rises — or, better, let the spin herd her into the hub and leave
 * her there when the ring starts to shine.
 */

const R = 250;
const HUB = 66;
const WALL_R0 = 190;
const WALL_R1 = 46;
const WARN_MS = 1400;
const COLLAR_MS = 3200;
const THROWN_DMG = 6;
const SQUEEZE_DMG = 14;

interface Gob { x: number; y: number; vx: number; vy: number; born: number; hit: boolean }
interface Rider { lastD: number; thrownAt: number; trapped: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cx = W / 2, cy = (top + H) / 2;
  const maxSpin = ctx.hard ? 1.5 : 1.25;
  let spin = 0.35;
  /** The wheel's turned angle, for drawing. */
  let theta = 0;
  const riders = new Map<Fighter, Rider>([[player, { lastD: 999, thrownAt: -9999, trapped: false }], [npc, { lastD: 999, thrownAt: -9999, trapped: false }]]);
  const gobs: Gob[] = [];
  let nextGob = 0;
  // The pot wall's clock.
  const wallEvery = ctx.hard ? 7600 : 9400;
  let nextWall = 0;
  let warnAt = -1;
  let riseAt = -1;
  let wallR = WALL_R0;
  let shatterAt = -9999;
  /** The bot's reaction to a warning: noticed at once, or a beat late. */
  let botNoticeAt = 0;
  let started = false;

  function squeeze(time: number): void {
    for (const [f, r] of riders) {
      if (!r.trapped || !alive(f)) continue;
      ctx.hit(f, SQUEEZE_DMG, f.x, f.y);
      ctx.stun(f, 900);
      ctx.float(f.x, f.y - 46, 'COLLARED!', '#e2bc98');
    }
    for (const r of riders.values()) r.trapped = false;
    shatterAt = time;
    ctx.sfx('crystal-shatter');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextWall = time + 5200; nextGob = time + 3000; }
      spin = Math.min(maxSpin, spin + dt * (ctx.hard ? 0.016 : 0.012));
      theta += spin * dt;

      // The pot wall: warn → rise and collar in → squeeze.
      if (warnAt < 0 && riseAt < 0 && time >= nextWall - WARN_MS) {
        warnAt = time;
        botNoticeAt = time + (rng() < 0.55 ? 150 : 850);
        ctx.banner('WENNA OPENS THE CLAY', '#e2bc98');
        ctx.sfx('slime-splat');
      }
      if (warnAt >= 0 && time >= nextWall) {
        warnAt = -1;
        riseAt = time;
        nextWall = time + wallEvery;
        wallR = WALL_R0;
        for (const [f, r] of riders) r.trapped = alive(f) && dist(f.x, f.y, cx, cy) < WALL_R0;
        ctx.sfx('stone-rise');
      }
      if (riseAt >= 0) {
        const k = clamp((time - riseAt) / COLLAR_MS, 0, 1);
        wallR = WALL_R0 + (WALL_R1 - WALL_R0) * (k * k * (3 - 2 * k));
        if (k >= 1) { riseAt = -1; squeeze(time); }
      }

      // Riding the wheel.
      for (const [f, r] of riders) {
        if (!alive(f)) continue;
        const dx = f.x - cx, dy = f.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        const ux = dx / d, uy = dy / d;
        if (d < R && d > HUB) {
          const carry = spin * d * 0.7 * dt;
          let push = 0;
          if (d > R * 0.5) push = spin * spin * d * 0.36 * dt * ((d - R * 0.5) / (R * 0.5) + 0.4);
          ctx.nudge(f, -uy * carry + ux * push, ux * carry + uy * push);
        }
        // The pot wall holds the trapped in and the rest out.
        if (riseAt >= 0) {
          const nd = dist(f.x, f.y, cx, cy) || 1;
          if (r.trapped && nd > wallR - 16) ctx.nudge(f, -ux * (nd - (wallR - 16)), -uy * (nd - (wallR - 16)));
          else if (!r.trapped && nd < wallR + 18) ctx.nudge(f, ux * (wallR + 18 - nd), uy * (wallR + 18 - nd));
        }
        // Thrown off the rim at speed.
        const nd = dist(f.x, f.y, cx, cy);
        if (r.lastD < R && nd >= R && spin > 0.62 && time - r.thrownAt > 2500) {
          r.thrownAt = time;
          ctx.hit(f, THROWN_DMG, f.x, f.y);
          ctx.stun(f, 380);
          ctx.nudge(f, ux * 40, uy * 40);
          ctx.float(f.x, f.y - 44, 'THROWN OFF', '#dcb48e');
          ctx.sfx('slime-splat');
        }
        r.lastD = nd;
      }

      // Gobs of slip off the rim, tangential, once it is going.
      if (spin > 0.75 && time >= nextGob) {
        nextGob = time + (ctx.hard ? 1100 : 1500) - spin * 300;
        const a = rng() * Math.PI * 2;
        const gx = cx + Math.cos(a) * R, gy = cy + Math.sin(a) * R;
        const sp = 140 + spin * 120;
        gobs.push({ x: gx, y: gy, vx: -Math.sin(a) * sp + Math.cos(a) * 40, vy: Math.cos(a) * sp + Math.sin(a) * 40, born: time, hit: false });
        ctx.sfx('splash');
      }
      for (let i = gobs.length - 1; i >= 0; i--) {
        const b = gobs[i];
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (!b.hit) {
          for (const f of [player, npc]) {
            if (alive(f) && dist(b.x, b.y, f.x, f.y) < 26) {
              b.hit = true;
              ctx.hit(f, 5, b.x, b.y);
              ctx.flash(b.x, b.y, SLIP);
              break;
            }
          }
        }
        if (b.hit || b.x < -20 || b.x > W + 20 || b.y < top - 20 || b.y > H + 20 || time - b.born > 4000) gobs.splice(i, 1);
      }
    },

    npcSpeedMult() {
      // Wading against the spin near the rim.
      const d = dist(npc.x, npc.y, cx, cy);
      return d > R * 0.7 && d < R ? 0.9 : 1;
    },
    playerSpeedMult() {
      const d = dist(player.x, player.y, cx, cy);
      return d > R * 0.7 && d < R ? 0.9 : 1;
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      const r = riders.get(npc);
      const nd = dist(npc.x, npc.y, cx, cy);
      // A ring is shining: get out over it — unless she was slow to see it.
      if ((warnAt >= 0 && time >= botNoticeAt) || (riseAt >= 0 && r && !r.trapped)) {
        if (nd < WALL_R0 + 50 || riseAt >= 0) {
          const a = Math.atan2(npc.y - cy, npc.x - cx);
          return { x: clamp(cx + Math.cos(a) * (WALL_R0 + 70), 60, W - 60), y: clamp(cy + Math.sin(a) * (WALL_R0 + 70), top + 50, H - 40) };
        }
        return null;
      }
      // Fast spin: she rides the still hub and makes you come to her.
      if (spin > 0.85 && riseAt < 0) return { x: cx + (player.x > cx ? -30 : 30), y: cy };
      // Otherwise keep you between her and the rim, so the spin flings you.
      const a = Math.atan2(player.y - cy, player.x - cx);
      return { x: clamp(cx + Math.cos(a) * 110, 60, W - 60), y: clamp(cy + Math.sin(a) * 110, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The splash pan: a wet clay floor round the wheel, slung slip in streaks.
      g.fillStyle(SLIP_DEEP, 0.35); g.fillCircle(cx, cy, R + 60);
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2 + 0.3;
        const r0 = R + 14 + ((i * 37) % 30);
        g.lineStyle(3, SLIP_DARK, 0.5); g.lineBetween(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a + 0.12) * (r0 + 30), cy + Math.sin(a + 0.12) * (r0 + 30));
      }
      // The wheel-head: stone, iron-rimmed, its throwing rings and the slip on it turning.
      g.fillStyle(IRON, 1); g.fillCircle(cx, cy, R + 6);
      g.fillStyle(IRON_LIT, 1); g.fillCircle(cx, cy - 2, R + 3);
      g.fillStyle(STRATA[2], 1); g.fillCircle(cx, cy, R);
      for (let rr = HUB + 10; rr < R; rr += 18) { g.lineStyle(1.5, dim(STRATA[2], 0.2), 0.55); g.strokeCircle(cx, cy, rr); }
      // Slip smeared on the head, in spirals, turning with it.
      for (let i = 0; i < 10; i++) {
        const a0 = theta + (i / 10) * Math.PI * 2;
        g.lineStyle(6, mixC(SLIP, SLIP_DARK, (i % 3) / 3), 0.55);
        g.beginPath();
        for (let k = 0; k <= 12; k++) {
          const rr = HUB + 8 + k * ((R - HUB - 20) / 12);
          const a = a0 + k * 0.07;
          const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
          if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
      }
      // Lumps of clay riding round.
      for (let i = 0; i < 6; i++) {
        const a = theta + i * 1.05, rr = HUB + 40 + ((i * 53) % (R - HUB - 70));
        g.fillStyle(MARL_DARK, 1); g.fillEllipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr + 2, 18, 10);
        g.fillStyle(SLIP_DARK, 1); g.fillEllipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 16, 9);
      }
      // Motion blur at the rim, stronger with speed.
      const blur = clamp((spin - 0.3) / 1.0, 0, 1);
      for (let i = 0; i < 6; i++) {
        const a = theta * 1.3 + i * 1.05;
        g.lineStyle(10, lit(STRATA[2], 0.2), 0.2 * blur);
        g.beginPath(); g.arc(cx, cy, R - 14, a, a + 0.5 + blur * 0.6, false); g.strokePath();
      }
      // The still hub: the iron spindle cap.
      g.fillStyle(TIMBER_DARK, 1); g.fillCircle(cx, cy, HUB);
      g.fillStyle(dim(STRATA[3], 0.2), 1); g.fillCircle(cx, cy, HUB - 4);
      g.fillStyle(IRON, 1); g.fillCircle(cx, cy, 16);
      g.fillStyle(IRON_LIT, 1); g.fillCircle(cx - 4, cy - 4, 5);
      // The warning: a ring of wet slip glistening where the wall will rise.
      if (warnAt >= 0) {
        const k = clamp((time - warnAt) / WARN_MS, 0, 1);
        g.lineStyle(14, SLIP, 0.35 + k * 0.45); g.strokeCircle(cx, cy, WALL_R0);
        g.lineStyle(2, SLIP_LIT, 0.4 + Math.sin(time / 60) * 0.3); g.strokeCircle(cx, cy, WALL_R0 - 5);
      }
      // Shards of the cut-off pot.
      if (time - shatterAt < 900) {
        const k = (time - shatterAt) / 900;
        for (let i = 0; i < 18; i++) {
          const a = i * 0.35, d = WALL_R1 + k * 160;
          g.fillStyle(SLIP_DARK, 1 - k); g.fillTriangle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, cx + Math.cos(a + 0.08) * (d + 10), cy + Math.sin(a + 0.08) * (d + 10), cx + Math.cos(a - 0.05) * (d + 6), cy + Math.sin(a - 0.05) * (d + 6));
        }
      }
    },

    drawAir(g, time) {
      // The pot wall, rising and collaring in: a wet clay cylinder with throwing rings.
      if (riseAt >= 0) {
        const k = clamp((time - riseAt) / 400, 0, 1);
        const hgt = 34 * k;
        const tw = 14;
        g.fillStyle(SLIP_DARK, 0.9); g.fillEllipse(cx, cy, wallR * 2 + tw, (wallR * 2 + tw));
        g.fillStyle(SLIP_DEEP, 1); g.fillEllipse(cx, cy, wallR * 2 - tw, wallR * 2 - tw);
        // Height: the lip drawn up off the floor.
        g.lineStyle(tw, SLIP, 1); g.strokeCircle(cx, cy - hgt * 0.3, wallR);
        g.lineStyle(3, SLIP_LIT, 0.8); g.strokeCircle(cx, cy - hgt * 0.3 - 4, wallR - 2);
        for (let i = 0; i < 3; i++) { g.lineStyle(1, SLIP_DARK, 0.8); g.strokeCircle(cx, cy - hgt * 0.1 * i, wallR + 4 - i); }
        // Fingers of the potter, pressing in from the outside.
        for (let i = 0; i < 2; i++) {
          const a = time / 300 + i * Math.PI;
          const fx = cx + Math.cos(a) * (wallR + 16), fy = cy + Math.sin(a) * (wallR + 16);
          g.fillStyle(0xd8b090, 0.8); g.fillEllipse(fx, fy, 16, 10);
        }
      }
      // Slip gobs in flight.
      for (const b of gobs) {
        g.fillStyle(SLIP_DARK, 1); g.fillCircle(b.x, b.y, 7);
        g.fillStyle(SLIP, 1); g.fillCircle(b.x - 1, b.y - 1, 5.5);
        g.fillStyle(SLIP_LIT, 0.8); g.fillCircle(b.x - 2.5, b.y - 2.5, 2);
        g.lineStyle(3, SLIP, 0.35); g.lineBetween(b.x, b.y, b.x - b.vx * 0.05, b.y - b.vy * 0.05);
      }
      // Dizzy rings over anyone just thrown.
      for (const [f, r] of riders) {
        if (!alive(f) || time - r.thrownAt > 700) continue;
        const k = (time - r.thrownAt) / 700;
        g.lineStyle(2, SLIP_LIT, 1 - k); g.strokeEllipse(f.x, f.y - 44, 26, 8);
      }
    },

    drawHud(g) {
      // A spin dial: the needle climbs as the wheel speeds up.
      const x = 36, y = top + 32;
      g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 22);
      g.lineStyle(3, SLIP_DARK, 1); g.beginPath(); g.arc(x, y, 18, Math.PI * 0.75, Math.PI * 2.25, false); g.strokePath();
      const k = clamp((spin - 0.3) / (maxSpin - 0.3), 0, 1);
      g.lineStyle(3, k > 0.7 ? 0xff8a2a : SLIP_LIT, 1); g.beginPath(); g.arc(x, y, 18, Math.PI * 0.75, Math.PI * 0.75 + k * Math.PI * 1.5, false); g.strokePath();
      const a = Math.PI * 0.75 + k * Math.PI * 1.5;
      g.lineStyle(2, 0xffffff, 1); g.lineBetween(x, y, x + Math.cos(a) * 14, y + Math.sin(a) * 14);
      g.fillStyle(IRON_LIT, 1); g.fillCircle(x, y, 3);
    },
  };
}

export const POTTERS_WHEEL: GimmickDef = {
  id: 'potter-wheel',
  rules: 'The yard is a turning wheel, faster all fight: it carries you round and flings you rimward. The still hub throws up a pot wall that closes in — get out over the slip ring.',
  make,
};
