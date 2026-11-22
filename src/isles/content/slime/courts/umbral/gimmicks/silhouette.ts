import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { CANDLE, CANDLE_LIT, IRON, IRON_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Silhouette — Lampman Silhou.
 *
 * Silhou keeps the only true flame in the Umbral Court: a great oil lamp on a long boom, licensed
 * by the Prince for the fights so the crowd can see who is winning. It swings over the yard on its
 * chain like a pendulum, and under it both fighters throw long shadows across the floor — longer
 * the further they stand from the lamp.
 *
 * A blow that lands on someone's shadow *hurts its owner* — the shadow's head is a real target any
 * shot, slash or blast can strike. So the fight is about where the lamp is: stand far from it and
 * your shadow is a long dark road reaching right up to your foe's feet. When Silhou trims the
 * wick, the lamp flares — every shadow doubles in length for a breath — and spits burning oil
 * under itself on the way.
 */

const SHADOW_HIT_FRAC = 0.75;
const SHADOW_HIT_MIN = 3;
const HEAD_R = 26;
const FLARE_EVERY = 7600;
const FLARE_WARN = 1100;
const FLARE_MS = 2200;

interface Shade {
  owner: Fighter;
  target: StrikeTarget | null;
  /** Unit direction the shadow lies (away from the lamp), and its length. */
  ux: number; uy: number; len: number;
  /** Struck flash, and a short guard so one AoE does not land five times. */
  struckAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  // The boom's pivot is far above the yard; the lamp swings on a long chain.
  const PIVOT = { x: W / 2, y: top - 330 };
  const CHAIN = ctx.hard ? 540 : 500;
  const SWING = 0.72;
  const OMEGA = ctx.hard ? 1.2 : 1.0;
  let lampX = W / 2, lampY = PIVOT.y + CHAIN;
  let nextFlare = 0;
  let flareWarnAt = -1;
  let flareUntil = 0;
  let started = false;

  const shades: Shade[] = [player, npc].map((owner) => ({ owner, target: null, ux: 0, uy: 1, len: 100, struckAt: -9999 }));

  const head = (s: Shade) => ({ x: s.owner.x + s.ux * s.len * 0.86, y: s.owner.y + s.uy * s.len * 0.86 });

  function strike(s: Shade, by: 'player' | 'npc', amount: number): void {
    const time = ctx.scene.time.now;
    const ownerIsPlayer = s.owner === player;
    // Only the owner's foe can hurt them through their shadow; striking your own does nothing.
    if ((by === 'player') === ownerIsPlayer) return;
    if (time - s.struckAt < 220 || !alive(s.owner) || amount <= 0) return;
    s.struckAt = time;
    const dmg = Math.max(SHADOW_HIT_MIN, Math.round(amount * SHADOW_HIT_FRAC));
    ctx.hit(s.owner, dmg, s.owner.x, s.owner.y - 20);
    const h = head(s);
    ctx.float(h.x, h.y - 20, 'SHADOW STRUCK', '#ffd27a');
    ctx.flash(h.x, h.y, CANDLE);
    ctx.sfx('hit-medium');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) {
        started = true;
        nextFlare = time + FLARE_EVERY * 0.7;
        for (const s of shades) {
          s.target = ctx.target({ x: s.owner.x, y: s.owner.y + 80, r: HEAD_R, passThrough: true, onStruck: (by, amount) => strike(s, by, amount) });
        }
      }
      // The pendulum.
      const th = SWING * Math.sin((time / 1000) * OMEGA);
      lampX = PIVOT.x + Math.sin(th) * CHAIN;
      lampY = PIVOT.y + Math.cos(th) * CHAIN;

      // Silhou trims the wick: a flare, and a gout of burning oil under the lamp.
      if (flareWarnAt < 0 && time >= nextFlare - FLARE_WARN) {
        flareWarnAt = time;
        ctx.banner('SILHOU TRIMS THE WICK', '#ffd27a');
        ctx.sfx('beam-charge');
      }
      if (time >= nextFlare) {
        nextFlare = time + (ctx.hard ? FLARE_EVERY * 0.8 : FLARE_EVERY);
        flareWarnAt = -1;
        flareUntil = time + FLARE_MS;
        ctx.sfx('flame-burst');
        // Oil spits where the lamp will be a moment from now.
        const th2 = SWING * Math.sin(((time + 700) / 1000) * OMEGA);
        const ox = clamp(PIVOT.x + Math.sin(th2) * CHAIN, 80, W - 80), oy = clamp(PIVOT.y + Math.cos(th2) * CHAIN + 40, top + 60, H - 60);
        ctx.tk.spawnZone({ x: ox, y: oy, radius: 64, warnMs: 900, damage: 10, poolMs: 2400, poolDamage: 3 });
      }
      const flaring = time < flareUntil;

      // Shadows: away from the lamp, longer the further from it you stand.
      for (const s of shades) {
        const d = Math.max(1, dist(lampX, lampY, s.owner.x, s.owner.y));
        s.ux = (s.owner.x - lampX) / d; s.uy = (s.owner.y - lampY) / d;
        const base = clamp(50 + d * 0.5, 70, 300);
        s.len = flaring ? Math.min(520, base * 2) : base;
        const h = head(s);
        if (s.target) {
          s.target.moveTo(clamp(h.x, 10, W - 10), clamp(h.y, top + 6, H - 6));
          // A dead owner casts nothing.
          s.target.setRadius(alive(s.owner) ? HEAD_R : 1);
        }
      }
    },

    npcSeek() {
      // Stand on the player's shadow's head (anything it throws will strike it), and keep its own
      // shadow pointing away from the player — i.e. stand between the player and the lamp.
      const ps = shades[0];
      const h = head(ps);
      const toward = dist(npc.x, npc.y, h.x, h.y);
      if (toward > 40) return { x: clamp(h.x, 60, W - 60), y: clamp(h.y, top + 50, H - 40) };
      const mx = (player.x + lampX) / 2, my = (player.y + lampY) / 2;
      return { x: clamp(mx, 60, W - 60), y: clamp(my, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The pool of lamplight on the floor, warm and swinging.
      const ly = clamp(lampY + 40, top, H);
      const flaring = time < flareUntil;
      for (let k = 5; k >= 1; k--) { g.fillStyle(CANDLE, (flaring ? 0.07 : 0.045)); g.fillEllipse(lampX, ly, 140 * k * 0.5 + 60, 90 * k * 0.5 + 40); }
      // The shadows: each a long silhouette laid flat, feet at the owner.
      for (const s of shades) {
        if (!alive(s.owner)) continue;
        const a = Math.atan2(s.uy, s.ux);
        const fx = s.owner.x, fy = s.owner.y + 6;
        const L = s.len;
        const px = -s.uy, py = s.ux;
        // Legs, body, shoulders, head — built from quads along the shadow.
        const seg = (u0: number, u1: number, w0: number, w1: number, al: number) => {
          const x0 = fx + s.ux * L * u0, y0 = fy + s.uy * L * u0, x1 = fx + s.ux * L * u1, y1 = fy + s.uy * L * u1;
          g.fillStyle(0x020104, al);
          g.fillTriangle(x0 + px * w0, y0 + py * w0, x0 - px * w0, y0 - py * w0, x1 + px * w1, y1 + py * w1);
          g.fillTriangle(x0 - px * w0, y0 - py * w0, x1 - px * w1, y1 - py * w1, x1 + px * w1, y1 + py * w1);
        };
        seg(0, 0.42, 9, 12, 0.5);
        seg(0.42, 0.74, 12, 17, 0.55);
        seg(0.74, 0.78, 17, 7, 0.55);
        const h = head(s);
        g.fillStyle(0x020104, 0.6); g.fillEllipse(h.x, h.y, 30, 30);
        // Arms flung out a little, so it reads as a person.
        for (const k of [-1, 1]) {
          const ax = fx + s.ux * L * 0.62 + px * k * 16, ay = fy + s.uy * L * 0.62 + py * k * 16;
          g.lineStyle(6, 0x020104, 0.45); g.lineBetween(ax, ay, ax + s.ux * L * 0.18 + px * k * 12, ay + s.uy * L * 0.18 + py * k * 12);
        }
        // The head ring: the target. Bright when it was just struck; the owner's colour otherwise.
        const struck = time - s.struckAt < 300;
        const mine = s.owner === player;
        g.lineStyle(struck ? 3 : 1.5, struck ? CANDLE_LIT : mine ? 0x8ab8ff : 0xff9a7a, struck ? 0.9 : 0.35 + 0.15 * Math.sin(time / 260 + a));
        g.strokeCircle(h.x, h.y, HEAD_R);
      }
    },

    drawAir(g, time) {
      // The boom chain from above the HUD, the lamp cage, the real flame.
      const flaring = time < flareUntil;
      const warn = flareWarnAt >= 0 ? clamp((time - flareWarnAt) / FLARE_WARN, 0, 1) : 0;
      const cx = PIVOT.x + (lampX - PIVOT.x) * ((top - 10 - PIVOT.y) / (lampY - PIVOT.y));
      for (let i = 0; i < 14; i++) {
        const u0 = i / 14, u1 = (i + 0.6) / 14;
        g.lineStyle(2, i % 2 ? IRON_LIT : IRON, 1);
        g.lineBetween(cx + (lampX - cx) * u0, top - 10 + (lampY - 22 - (top - 10)) * u0, cx + (lampX - cx) * u1, top - 10 + (lampY - 22 - (top - 10)) * u1);
      }
      glow(g, lampX, lampY - 4, flaring ? 60 : 38, CANDLE, flaring ? 0.08 : 0.05, 4);
      // Cage.
      g.fillStyle(IRON, 1); g.fillTriangle(lampX - 13, lampY - 18, lampX + 13, lampY - 18, lampX, lampY - 28);
      g.fillStyle(lit(CANDLE, 0.4), 0.35); g.fillRect(lampX - 11, lampY - 18, 22, 24);
      g.lineStyle(1.5, IRON, 1);
      for (const k of [-11, -4, 4, 11]) g.lineBetween(lampX + k, lampY - 18, lampX + k, lampY + 6);
      g.fillStyle(IRON, 1); g.fillRect(lampX - 13, lampY + 5, 26, 4);
      // The flame: real, orange, licking — bigger at a flare.
      const fl = (flaring ? 1.8 : 1 + warn * 0.4) * (1 + Math.sin(time / 70) * 0.1);
      g.fillStyle(0xff8a2a, 0.9); g.fillTriangle(lampX - 5 * fl, lampY + 2, lampX + 5 * fl, lampY + 2, lampX + Math.sin(time / 90) * 2, lampY - 14 * fl);
      g.fillStyle(CANDLE_LIT, 1); g.fillTriangle(lampX - 2.5 * fl, lampY + 1, lampX + 2.5 * fl, lampY + 1, lampX, lampY - 8 * fl);
      // The wick-trim warning: sparks spitting from the cage.
      if (warn > 0) {
        for (let i = 0; i < 6; i++) {
          const a = time / 90 + i;
          g.fillStyle(CANDLE_LIT, warn); g.fillCircle(lampX + Math.cos(a) * (14 + warn * 10), lampY - 6 + Math.sin(a) * (10 + warn * 8), 1.5);
        }
      }
      // Oil dripping off it all the time.
      const dk = (time / 600) % 1;
      g.fillStyle(dim(CANDLE, 0.5), 0.8 * (1 - dk)); g.fillCircle(lampX + 6, lampY + 10 + dk * 30, 1.6);
    },

    destroy() {
      for (const s of shades) { s.target?.remove(); s.target = null; }
    },
  };
}

export const SILHOUETTE: GimmickDef = {
  id: 'umbral-silhouette',
  rules: 'A lamp swings over the yard and you both cast long shadows. A blow on someone\'s shadow hurts its owner. When the wick is trimmed, the lamp flares and every shadow doubles.',
  make,
};
