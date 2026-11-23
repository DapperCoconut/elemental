import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, BRASS_DARK, BRASS_LIT, GLASS_DEEP, GLASS_GLINT, GLASS_SHEEN, IRON, SUN, SUN_CORE, SUN_DEEP, SUN_RIM,
} from '../palette';
import { awayFrom, inPlay } from './geom';

/**
 * Short Measure — Meter-Reader Pell's fight (the ration clerk).
 *
 * The Corona meters its warmth. One **ration plate** at a time is let into the floor: a brass
 * disc under a ration mirror, with a dial that shows what is left of its allowance. Anyone
 * standing in the metered light recharges **twice as fast**; out of it, everyone is on the
 * short ration (cooldowns at 70%). The plate's allowance drains for every body on it — two on
 * it drain it twice as fast — and when the dial reaches zero the **audit** stamps the plate:
 * whoever is still on it is struck and held.
 *
 * The exploit is Pell's ledger: she reads the meter *for one*. She steps off when the dial
 * would last a moment for a single reader — so stand on the plate with her and her sum is
 * wrong by half. Step off at the red line and let the stamp find her.
 *
 * Halfway the ration is halved: smaller plates that drain faster and are wheeled across the
 * floor while they're live.
 */

const ID = fallenId('corona', 'short-measure');
const WARM_MS = 1000;
const NEXT_MS = 1300;
const STAMP_DMG = 24;
const STAMP_ROOT = 900;
const RED = 25;

interface Plate { x: number; y: number; vx: number; vy: number; r: number; ration: number; bornAt: number; stampedAt: number }

export const SHORT_MEASURE: GimmickDef = {
  id: ID,
  rules: 'On the ration plate your cooldowns run double; off it, short. Each body drains it; at zero the audit stamps whoever stayed.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    let half = false;
    let plate: Plate | null = null;
    let nextAt = ctx.scene.time.now + 900;
    let lastX = W / 2, lastY = (top + H) / 2;
    let tickAcc = 0;

    const perOne = (): number => (half ? 17 : 13);

    const place = (time: number): void => {
      let x = W / 2, y = (top + H) / 2;
      for (let tries = 0; tries < 12; tries++) {
        x = 150 + ctx.rng() * (W - 300);
        y = top + 100 + ctx.rng() * (H - top - 190);
        if (Math.hypot(x - lastX, y - lastY) > 260) break;
      }
      lastX = x; lastY = y;
      const a = ctx.rng() * Math.PI * 2;
      const sp = half ? 52 : 0;
      plate = { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: half ? 48 : 62, ration: 100, bornAt: time, stampedAt: 0 };
      ctx.sfx('money');
    };

    const live = (): boolean => !!plate && !plate.stampedAt && ctx.scene.time.now - plate.bornAt >= WARM_MS;
    const on = (f: Fighter): boolean => !!plate && live() && inPlay(f) && Math.hypot(f.x - plate.x, f.y - plate.y) < plate.r;

    const audit = (p: Plate, time: number): void => {
      p.stampedAt = time;
      ctx.sfx('anvil');
      ctx.flash(p.x, p.y, SUN_RIM);
      for (const f of [ctx.player, ctx.npc]) {
        if (!inPlay(f) || Math.hypot(f.x - p.x, f.y - p.y) >= p.r) continue;
        ctx.hit(f, STAMP_DMG, f.x, f.y);
        ctx.root(f, STAMP_ROOT);
        ctx.sfx('status-stun');
      }
      nextAt = time + NEXT_MS;
    };

    return {
      update(time, dt) {
        if (!half && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          half = true;
          ctx.banner('THE RATION IS HALVED', '#ffd54a');
          ctx.sfx('boss-phase');
        }
        if (!plate && time >= nextAt) place(time);
        if (!plate) return;
        const p = plate;
        if (p.stampedAt) {
          if (time - p.stampedAt > 420) plate = null;
          return;
        }
        if (time - p.bornAt < WARM_MS) return;
        // Wheeled about on the turn: bounce off the room's walls.
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 110 || p.x > W - 110) { p.vx = -p.vx; p.x = Math.max(110, Math.min(W - 110, p.x)); }
        if (p.y < top + 80 || p.y > H - 70) { p.vy = -p.vy; p.y = Math.max(top + 80, Math.min(H - 70, p.y)); }
        const bodies = (on(ctx.player) ? 1 : 0) + (on(ctx.npc) ? 1 : 0);
        const before = p.ration;
        p.ration -= dt * (bodies ? perOne() * bodies : 3);
        if (before >= RED && p.ration < RED) ctx.sfx('countdown-tick');
        if (p.ration < RED) {
          tickAcc += dt;
          if (tickAcc > 0.3) { tickAcc = 0; ctx.sfx('clock-tick'); }
        }
        if (p.ration <= 0) audit(p, time);
      },

      playerCooldownRate() { return on(ctx.player) ? 2 : 0.7; },
      npcCooldownRate() { return on(ctx.npc) ? 2 : 0.7; },

      npcSeek() {
        if (!plate || plate.stampedAt) return null;
        const me = { x: ctx.npc.x, y: ctx.npc.y };
        // Pell's ledger: she reckons the time left as if she were the only reader.
        const reckoned = plate.ration / perOne();
        if (live() && reckoned < 0.8) {
          return Math.hypot(me.x - plate.x, me.y - plate.y) < plate.r + 40 ? awayFrom(me, plate, 130) : null;
        }
        return { x: plate.x, y: plate.y };
      },

      drawGround(g, time) {
        const p = plate;
        if (!p) return;
        const warm = Math.min(1, (time - p.bornAt) / WARM_MS);
        const red = p.ration < RED;
        // The brass disc, riveted into the glass.
        g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x, p.y + 6, p.r * 2 + 12, p.r * 0.7 * 2 + 10);
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(p.x, p.y, p.r + 4);
        g.fillStyle(BRASS, 1); g.fillCircle(p.x, p.y, p.r);
        g.fillStyle(GLASS_DEEP, 1); g.fillCircle(p.x, p.y, p.r - 8);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.fillStyle(BRASS_LIT, 1); g.fillCircle(p.x + Math.cos(a) * (p.r - 3), p.y + Math.sin(a) * (p.r - 3), 1.8);
        }
        // The allowance: a gold sector sweeping down the dial, red past the line.
        const frac = Math.max(0, p.ration) / 100;
        const a0 = -Math.PI / 2;
        g.fillStyle(red ? SUN_DEEP : SUN, (0.35 + 0.4 * warm) * (red && Math.floor(time / 120) % 2 ? 0.6 : 1));
        g.slice(p.x, p.y, p.r - 10, a0, a0 + frac * Math.PI * 2, false); g.fillPath();
        // Ten graduations and the red line.
        for (let i = 0; i < 10; i++) {
          const a = a0 + (i / 10) * Math.PI * 2;
          g.lineStyle(1.5, BRASS_LIT, 0.8);
          g.lineBetween(p.x + Math.cos(a) * (p.r - 16), p.y + Math.sin(a) * (p.r - 16), p.x + Math.cos(a) * (p.r - 9), p.y + Math.sin(a) * (p.r - 9));
        }
        const ar = a0 + (RED / 100) * Math.PI * 2;
        g.lineStyle(3, SUN_DEEP, 1);
        g.lineBetween(p.x + Math.cos(ar) * (p.r - 20), p.y + Math.sin(ar) * (p.r - 20), p.x + Math.cos(ar) * (p.r - 8), p.y + Math.sin(ar) * (p.r - 8));
        // The sun-coin hub and its needle.
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(p.x, p.y, 13);
        g.fillStyle(SUN, 1); g.fillCircle(p.x, p.y, 9);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + time / 2000;
          g.fillStyle(SUN_RIM, 1); g.fillTriangle(p.x + Math.cos(a) * 9, p.y + Math.sin(a) * 9,
            p.x + Math.cos(a + 0.2) * 13, p.y + Math.sin(a + 0.2) * 13, p.x + Math.cos(a + 0.4) * 9, p.y + Math.sin(a + 0.4) * 9);
        }
        const na = a0 + frac * Math.PI * 2;
        g.lineStyle(3, IRON, 1); g.lineBetween(p.x, p.y, p.x + Math.cos(na) * (p.r - 14), p.y + Math.sin(na) * (p.r - 14));
        g.fillStyle(IRON, 1); g.fillCircle(p.x, p.y, 3);
        // The audit's stamp casts its shadow as the dial runs red.
        if (red && !p.stampedAt) {
          const k = 1 - p.ration / RED;
          g.fillStyle(0x000000, 0.12 + 0.3 * k); g.fillRect(p.x - p.r * (0.5 + 0.5 * k), p.y - p.r * 0.35 * (0.5 + 0.5 * k), p.r * (1 + k), p.r * 0.7 * (0.5 + 0.5 * k));
        }
        if (p.stampedAt) {
          const k = 1 - (time - p.stampedAt) / 420;
          g.lineStyle(4, SUN_RIM, k); g.strokeCircle(p.x, p.y, p.r + (1 - k) * 30);
        }
      },

      drawAir(g, time) {
        const p = plate;
        if (!p) return;
        const warm = Math.min(1, (time - p.bornAt) / WARM_MS);
        // The ration mirror on its post, throwing a cone of metered light onto the plate.
        const mx = p.x + p.r + 14, my = p.y - 92;
        g.lineStyle(4, IRON, 1); g.lineBetween(mx, p.y + 2, mx, my + 10);
        g.fillStyle(BRASS_DARK, 1); g.fillRect(mx - 4, p.y - 4, 8, 6);
        if (!p.stampedAt) {
          g.fillStyle(SUN, 0.09 * warm);
          g.fillPoints([{ x: mx - 8, y: my }, { x: mx + 4, y: my + 6 }, { x: p.x + p.r * 0.9, y: p.y + 8 }, { x: p.x - p.r * 0.9, y: p.y - 8 }], true);
          g.fillStyle(SUN_CORE, 0.06 * warm);
          g.fillPoints([{ x: mx - 4, y: my + 2 }, { x: mx + 1, y: my + 4 }, { x: p.x + p.r * 0.4, y: p.y + 4 }, { x: p.x - p.r * 0.4, y: p.y - 4 }], true);
        }
        g.fillStyle(BRASS, 1); g.fillEllipse(mx, my, 26, 18);
        g.fillStyle(p.stampedAt ? GLASS_DEEP : GLASS_SHEEN, 1); g.fillEllipse(mx, my, 20, 13);
        g.fillStyle(GLASS_GLINT, 0.4 + 0.5 * warm); g.fillEllipse(mx - 4, my - 3, 7, 4);
        // The stamp: a brass block with a sun-and-bar die, dropping on the dial.
        const red = p.ration < RED;
        if (red || p.stampedAt) {
          const k = p.stampedAt ? 1 : 1 - p.ration / RED;
          const sy = p.stampedAt ? p.y - 6 : p.y - 150 + k * 110;
          const w = p.r * 1.1;
          g.lineStyle(5, IRON, 1); g.lineBetween(p.x, top, p.x, sy - 26);
          g.fillStyle(BRASS_DARK, 1); g.fillRect(p.x - w / 2, sy - 26, w, 22);
          g.fillStyle(BRASS, 1); g.fillRect(p.x - w / 2 + 3, sy - 24, w - 6, 8);
          g.fillStyle(IRON, 1); g.fillRect(p.x - w / 2 - 4, sy - 6, w + 8, 8);
          g.fillStyle(SUN_DEEP, 1); g.fillCircle(p.x, sy - 15, 6); g.fillRect(p.x - 12, sy - 16, 24, 2);
        }
      },

      drawHud(g, time) {
        const x = W / 2 - 150, y = 104, w = 300, h = 10;
        g.fillStyle(0x000000, 0.55); g.fillRect(x - 3, y - 3, w + 6, h + 6);
        const frac = plate && !plate.stampedAt ? Math.max(0, plate.ration) / 100 : 0;
        const red = frac * 100 < RED;
        g.fillStyle(red ? (Math.floor(time / 120) % 2 ? SUN_DEEP : SUN_RIM) : SUN, 1); g.fillRect(x, y, w * frac, h);
        g.fillStyle(SUN_DEEP, 1); g.fillRect(x + w * (RED / 100) - 1, y - 4, 2, h + 8);
        // Your rate lamp: a little sun, lit while you stand in the metered light.
        const lit = on(ctx.player);
        g.fillStyle(0x000000, 0.55); g.fillCircle(x + w + 22, y + 5, 11);
        g.fillStyle(lit ? SUN : IRON, 1); g.fillCircle(x + w + 22, y + 5, 7);
        if (lit) for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + time / 300;
          g.lineStyle(2, SUN_CORE, 1); g.lineBetween(x + w + 22 + Math.cos(a) * 8, y + 5 + Math.sin(a) * 8, x + w + 22 + Math.cos(a) * 11, y + 5 + Math.sin(a) * 11);
        }
      },
    };
  },
};
