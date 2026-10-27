import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { BRASS, BRASS_DARK, BRASS_LIT, PLASMA, PLASMA_CORE, PLASMA_DEEP, PLASMA_LIT, SUN_RIM } from '../palette';

/**
 * Magnetic Bottle — Torus the Bottle-Keeper's fight.
 *
 * The fight happens inside a plasma bottle: an elliptical wall of field lines held by two
 * brass **mirror coils**, one at each end. The bottle **breathes** — it slowly swells to fill
 * the room, then draws in until the two of you are nose to nose. The wall burns and throws
 * back anyone who touches it.
 *
 * At the bottom of every inhale the mirrors **kick**: both coils glow, then blast everything
 * near them back toward the middle. And the centre of the bottle is where the plasma is
 * densest — anyone standing in the **hot core** takes 25% more damage.
 *
 * Torus holds the ring between core and wall. The clever play is the breath itself: be on the
 * far side of the core when the bottle closes, so the shrinking wall walks Torus through it.
 */

const CORE_E = 0.16; // normalised radius² of the hot core
const KICK_R = 130;

export const MAGNETIC_BOTTLE: GimmickDef = {
  id: 'corona-magnetic-bottle',
  rules: 'The bottle wall breathes in and out and burns to touch. Its hot core makes you take +25%. Mirrors kick at full inhale.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const cx = W / 2;
    const cy = (top + H) / 2;
    const rxMax = W / 2 - 50, rxMin = hard ? 210 : 235;
    const ryMax = (H - top) / 2 - 22, ryMin = hard ? 140 : 155;
    const period = hard ? 10000 : 12500;
    const burn = hard ? 10 : 8;
    const kickDmg = hard ? 14 : 11;
    const t0 = ctx.scene.time.now;

    let rx = rxMax, ry = ryMax;
    let breath = 0; // 0 = fully out, 1 = fully in
    let cycle = 0;
    let kickArmed = false;
    let kickAt = 0;
    const kickWarn = 1100;
    const lastBurn = new Map<Fighter, number>();
    const kicking: { f: Fighter; vx: number; vy: number; until: number }[] = [];

    const eOf = (x: number, y: number): number => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    const mirrors = (): Pt[] => [{ x: cx - rx, y: cy }, { x: cx + rx, y: cy }];

    return {
      update(time, dt) {
        const ph = ((time - t0) / period) % 1;
        // Ease in and out: out (0) → in (1) → out.
        breath = (1 - Math.cos(ph * Math.PI * 2)) / 2;
        rx = rxMax + (rxMin - rxMax) * breath;
        ry = ryMax + (ryMin - ryMax) * breath;

        const c = Math.floor((time - t0) / period);
        if (c !== cycle) { cycle = c; kickArmed = false; }
        // The inhale bottoms out at ph = 0.5; the mirrors warn just before.
        if (!kickArmed && ph > 0.5 - kickWarn / period) {
          kickArmed = true;
          kickAt = time + kickWarn;
          ctx.float(cx, top + 26, 'MIRRORS CHARGING', '#e6d2ff');
          ctx.sfx('magnet-pull');
        }
        if (kickAt && time >= kickAt) {
          kickAt = 0;
          ctx.sfx('sonic-pulse');
          for (const m of mirrors()) {
            ctx.flash(m.x, m.y, PLASMA_CORE);
            for (const f of [ctx.player, ctx.npc]) {
              if (!f.active || f.hp <= 0) continue;
              const d = Phaser.Math.Distance.Between(f.x, f.y, m.x, m.y);
              if (d > KICK_R) continue;
              ctx.hit(f, kickDmg, f.x, f.y);
              ctx.float(f.x, f.y - 30, 'KICKED', '#e6d2ff');
              const a = Math.atan2(cy - m.y + (f.y - cy) * 0.5, cx - m.x);
              kicking.push({ f, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, until: time + 380 });
            }
          }
        }
        // Kick travel — a positional shove spread over a few frames.
        for (let i = kicking.length - 1; i >= 0; i--) {
          const k = kicking[i];
          if (time > k.until) { kicking.splice(i, 1); continue; }
          ctx.nudge(k.f, k.vx * dt, k.vy * dt);
        }
        // The wall: anyone outside it is burned and pressed back in.
        for (const f of [ctx.player, ctx.npc]) {
          if (!f.active || f.hp <= 0) continue;
          const e = eOf(f.x, f.y);
          if (e <= 1) continue;
          const s = 1 / Math.sqrt(e);
          const tx = cx + (f.x - cx) * s, ty = cy + (f.y - cy) * s;
          const dx = tx - f.x, dy = ty - f.y;
          const d = Math.hypot(dx, dy) || 1;
          const step = Math.min(d + 6, 16);
          ctx.nudge(f, (dx / d) * step, (dy / d) * step);
          if (time - (lastBurn.get(f) ?? 0) > 420) {
            lastBurn.set(f, time);
            ctx.hit(f, burn, f.x, f.y);
            ctx.sfx('sizzle');
          }
        }
      },

      playerTakenMult: () => (eOf(ctx.player.x, ctx.player.y) < CORE_E ? 1.25 : 1),
      npcTakenMult: () => (eOf(ctx.npc.x, ctx.npc.y) < CORE_E ? 1.25 : 1),

      npcSeek() {
        // Hold the ring between core and wall, on the player's side, off the mirrors.
        const p = ctx.player;
        let a = Math.atan2((p.y - cy) / ry, (p.x - cx) / rx);
        const mirrorDanger = kickAt > 0 || breath > 0.75;
        if (mirrorDanger && Math.abs(Math.cos(a)) > 0.6) a = Math.sign(Math.sin(a) || 1) * Math.PI / 2;
        const r = 0.62;
        return { x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r };
      },

      drawGround(g, time) {
        // Outside the bottle: the floor sinks into dark — thick strokes hug the wall from without.
        g.lineStyle(260, 0x07040c, 0.5);
        g.strokeEllipse(cx, cy, (rx + 130) * 2, (ry + 130) * 2);
        g.lineStyle(400, 0x07040c, 0.5);
        g.strokeEllipse(cx, cy, (rx + 460) * 2, (ry + 460) * 2);
        g.fillStyle(PLASMA_DEEP, 0.16); g.fillEllipse(cx, cy, rx * 2, ry * 2);
        // The hot core.
        const cr = Math.sqrt(CORE_E);
        g.fillStyle(PLASMA, 0.13 + Math.sin(time / 160) * 0.04);
        g.fillEllipse(cx, cy, rx * 2 * cr, ry * 2 * cr);
        g.lineStyle(1.5, PLASMA_LIT, 0.45);
        g.strokeEllipse(cx, cy, rx * 2 * cr, ry * 2 * cr);
        // Kick footprints while the mirrors charge.
        if (kickAt) {
          const k = 1 - (kickAt - time) / kickWarn;
          for (const m of mirrors()) {
            g.fillStyle(PLASMA_LIT, 0.08 + k * 0.2); g.fillCircle(m.x, m.y, KICK_R);
            g.lineStyle(2, PLASMA_CORE, 0.6); g.strokeCircle(m.x, m.y, KICK_R * (0.3 + 0.7 * k));
          }
        }
      },

      drawAir(g, time) {
        // The bottle wall: nested field lines pinched at the mirrors, with plasma bunches
        // racing round them.
        for (let l = 0; l < 3; l++) {
          const s = 1 + l * 0.035;
          g.lineStyle(l === 0 ? 4 : 1.5, l === 0 ? PLASMA_LIT : PLASMA, l === 0 ? 0.8 : 0.45);
          g.beginPath();
          for (let i = 0; i <= 48; i++) {
            const a = (i / 48) * Math.PI * 2;
            // Pinch: the ends draw in toward the coil throats.
            const pinch = 1 - 0.12 * Math.pow(Math.abs(Math.cos(a)), 8);
            const x = cx + Math.cos(a) * rx * s, y = cy + Math.sin(a) * ry * s * pinch;
            if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.strokePath();
        }
        for (let i = 0; i < 10; i++) {
          const a = time / 700 * (i % 2 ? 1 : -1) + i * 0.63;
          g.fillStyle(PLASMA_CORE, 0.85);
          g.fillCircle(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry * (1 - 0.12 * Math.pow(Math.abs(Math.cos(a)), 8)), 2.5);
        }
        // Mirror coils: brass rings stacked edge-on, glowing on a charge.
        const glow = kickAt ? 1 - (kickAt - time) / kickWarn : 0;
        for (const m of mirrors()) {
          for (let k = -1; k <= 1; k++) {
            g.fillStyle(BRASS_DARK, 1); g.fillEllipse(m.x + k * 9, m.y + 1, 12, 64);
            g.fillStyle(k === 0 ? BRASS_LIT : BRASS, 1); g.fillEllipse(m.x + k * 9, m.y, 9, 60);
          }
          if (glow > 0) {
            g.fillStyle(PLASMA_LIT, glow * 0.5); g.fillCircle(m.x, m.y, 20 + glow * 18);
            g.fillStyle(PLASMA_CORE, glow); g.fillCircle(m.x, m.y, 8);
          }
        }
      },

      drawHud(g) {
        // Breath gauge: a bar that empties as the bottle draws in.
        const x = W / 2 - 120, y = 104, w = 240, h = 8;
        g.fillStyle(0x000000, 0.55); g.fillRect(x - 3, y - 3, w + 6, h + 6);
        g.fillStyle(breath > 0.75 ? SUN_RIM : PLASMA, 1);
        g.fillRect(x + (w * breath) / 2, y, w * (1 - breath), h);
      },
    };
  },
};
