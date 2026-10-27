import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { BRASS, BRASS_DARK, BRASS_LIT, IRON, PLASMA, PLASMA_CORE, PLASMA_DEEP, PLASMA_LIT, SUN_RIM } from '../palette';

/**
 * Containment Breach — Specimen Q-7's fight.
 *
 * Q-7 is a lab specimen held together by three spinning containment rings. Every point of
 * damage it takes feeds its **instability** (it also creeps up on its own). At the top of the
 * meter it goes **critical**: a countdown, and a blast ring drawn round it that travels with
 * it — then **nova**. Uncontained, the nova scorches anyone in the ring and staggers Q-7.
 *
 * Three brass **containment plates** are set into the floor. If Q-7 is standing on a plate
 * when it novas, the plate swallows the blast: nothing reaches you, and the backlash rips a
 * big chunk out of Q-7 and leaves it stunned and exposed. Q-7 knows this — when it goes
 * critical it comes for you and keeps off the plates. Lure it across one as the clock runs out.
 */

const PLATE_R = 46;

export const CONTAINMENT_BREACH: GimmickDef = {
  id: 'corona-containment-breach',
  rules: 'Hurting Q-7 builds instability until it novas. Bait it onto a containment plate when it blows.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const plates: Pt[] = [
      { x: W * 0.22, y: top + (H - top) * 0.3 },
      { x: W * 0.78, y: top + (H - top) * 0.3 },
      { x: W * 0.5, y: top + (H - top) * 0.8 },
    ];
    const perDamage = hard ? 1.9 : 1.6;
    const creep = hard ? 2.2 : 1.6; // per second
    const countdownMs = hard ? 2400 : 3000;
    const blastR = hard ? 250 : 230;
    const novaDmg = hard ? 30 : 24;

    let inst = 0;
    let criticalAt = 0; // 0 = not critical
    let selfHit = false;
    let stunUntil = 0;
    let exposedUntil = 0;
    let lastBeep = 0;
    let novaFx = { x: 0, y: 0, at: -99999, contained: false };

    const onPlate = (x: number, y: number): number =>
      plates.findIndex((p) => Phaser.Math.Distance.Between(x, y, p.x, p.y) < PLATE_R);

    const nova = (time: number): void => {
      const n = ctx.npc;
      const plate = onPlate(n.x, n.y);
      const contained = plate >= 0;
      novaFx = { x: n.x, y: n.y, at: time, contained };
      selfHit = true;
      if (contained) {
        ctx.banner('CONTAINED', '#e6d2ff');
        ctx.sfx('shield-break');
        ctx.hit(n, n.maxHp * 0.16, n.x, n.y);
        stunUntil = time + 2600;
        ctx.stun(n, 2600);
        exposedUntil = time + 4200;
      } else {
        ctx.banner('NOVA', '#ffb070');
        ctx.sfx('explosion-large');
        const p = ctx.player;
        if (Phaser.Math.Distance.Between(p.x, p.y, n.x, n.y) < blastR) ctx.hit(p, novaDmg, p.x, p.y);
        ctx.hit(n, n.maxHp * 0.06, n.x, n.y);
        stunUntil = time + 1500;
        ctx.stun(n, 1500);
      }
      selfHit = false;
      ctx.flash(n.x, n.y, PLASMA_CORE);
      inst = 0;
      criticalAt = 0;
    };

    return {
      update(time, dt) {
        if (criticalAt) {
          const left = criticalAt + countdownMs - time;
          const beatMs = left > 1200 ? 500 : 250;
          if (time - lastBeep > beatMs) { lastBeep = time; ctx.sfx('countdown-tick'); }
          if (left <= 0) nova(time);
          return;
        }
        if (time > stunUntil) inst = Math.min(100, inst + creep * dt);
        if (inst >= 100) {
          criticalAt = time;
          ctx.banner('CRITICAL', '#ff8a5a');
          ctx.float(ctx.npc.x, ctx.npc.y - 44, 'Q-7 IS GOING NOVA', '#ff8a5a');
          ctx.sfx('beam-charge');
        }
      },

      onNpcHurt(amount) {
        if (selfHit || criticalAt) return;
        const before = inst;
        inst = Math.min(100, inst + amount * perDamage);
        if (before < 70 && inst >= 70) ctx.float(ctx.npc.x, ctx.npc.y - 40, 'UNSTABLE', '#e6d2ff');
      },

      npcSpeedMult: () => (criticalAt ? 1.08 : 1),
      npcTakenMult: () => (ctx.scene.time.now < exposedUntil ? 1.4 : 1),

      npcSeek() {
        const n = ctx.npc;
        if (!criticalAt) return null;
        // Critical: hug the player, and if it finds itself on a plate, step off away from it.
        const pi = onPlate(n.x, n.y);
        if (pi >= 0) {
          const pl = plates[pi];
          const a = Math.atan2(n.y - pl.y, n.x - pl.x);
          return { x: pl.x + Math.cos(a) * (PLATE_R + 60), y: pl.y + Math.sin(a) * (PLATE_R + 60) };
        }
        // Route round a plate that lies on the straight line to the player.
        const p = ctx.player;
        for (const pl of plates) {
          const mx = (n.x + p.x) / 2, my = (n.y + p.y) / 2;
          if (Phaser.Math.Distance.Between(mx, my, pl.x, pl.y) < PLATE_R + 30) {
            const a = Math.atan2(n.y - pl.y, n.x - pl.x) + 0.9;
            return { x: pl.x + Math.cos(a) * (PLATE_R + 70), y: pl.y + Math.sin(a) * (PLATE_R + 70) };
          }
        }
        return { x: p.x, y: p.y };
      },

      drawGround(g, time) {
        // Containment plates: brass discs, coil teeth, a field that lights when Q-7 is critical.
        for (let i = 0; i < plates.length; i++) {
          const p = plates[i];
          const hot = criticalAt > 0;
          g.fillStyle(0x000000, 0.35); g.fillEllipse(p.x, p.y + 4, PLATE_R * 2 + 10, PLATE_R * 0.9 + 6);
          g.fillStyle(BRASS_DARK, 1); g.fillEllipse(p.x, p.y, PLATE_R * 2, PLATE_R * 0.9);
          g.fillStyle(IRON, 1); g.fillEllipse(p.x, p.y, PLATE_R * 1.3, PLATE_R * 0.58);
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2 + (hot ? time / 300 : 0);
            g.fillStyle(k % 2 ? BRASS : BRASS_LIT, 1);
            g.fillCircle(p.x + Math.cos(a) * PLATE_R * 0.82, p.y + Math.sin(a) * PLATE_R * 0.37, 3);
          }
          g.lineStyle(2, hot ? PLASMA_LIT : PLASMA_DEEP, hot ? 0.6 + Math.sin(time / 90) * 0.3 : 0.5);
          g.strokeEllipse(p.x, p.y, PLATE_R * 2, PLATE_R * 0.9);
          if (hot) { g.fillStyle(PLASMA, 0.15); g.fillEllipse(p.x, p.y, PLATE_R * 2, PLATE_R * 0.9); }
        }
        // The blast ring rides with Q-7 during the countdown, filling as it nears zero.
        if (criticalAt) {
          const n = ctx.npc;
          const k = Phaser.Math.Clamp((time - criticalAt) / countdownMs, 0, 1);
          const safe = onPlate(n.x, n.y) >= 0;
          const col = safe ? PLASMA_LIT : SUN_RIM;
          g.fillStyle(col, 0.06 + k * 0.16); g.fillCircle(n.x, n.y, blastR * k);
          g.lineStyle(3, col, 0.5 + 0.4 * Math.sin(time / 80)); g.strokeCircle(n.x, n.y, blastR);
        }
        // Nova aftermath: scorched ring (or a plate column, if contained).
        const since = time - novaFx.at;
        if (since < 700) {
          const k = since / 700;
          if (novaFx.contained) {
            g.fillStyle(PLASMA_CORE, 0.6 * (1 - k)); g.fillEllipse(novaFx.x, novaFx.y, PLATE_R * 2, PLATE_R * 0.9);
          } else {
            g.lineStyle(18 * (1 - k) + 2, SUN_RIM, 0.7 * (1 - k)); g.strokeCircle(novaFx.x, novaFx.y, blastR * (0.3 + 0.7 * k));
          }
        }
      },

      drawAir(g, time) {
        const n = ctx.npc;
        if (!n.active) return;
        // Containment rings: three tilted ellipses spinning round Q-7, wobbling as they fail.
        const wob = inst / 100;
        const spin = time / (criticalAt ? 90 : 260);
        for (let r = 0; r < 3; r++) {
          const a = spin + (r * Math.PI) / 3;
          const jit = criticalAt ? Math.sin(time / 30 + r) * 5 : Math.sin(time / 200 + r) * wob * 4;
          g.lineStyle(2.5, r === 1 ? BRASS_LIT : BRASS, 0.9);
          g.strokeEllipse(n.x + jit, n.y - 6, 70, 70 * Math.abs(Math.cos(a)) + 8);
        }
        // Leaking filaments once it is past half.
        if (wob > 0.5 || criticalAt) {
          const m = criticalAt ? 7 : Math.floor(wob * 6);
          for (let i = 0; i < m; i++) {
            const a = time / 70 + i * 2.4;
            const l = 30 + Math.sin(time / 50 + i) * 12;
            g.lineStyle(1.5, PLASMA_LIT, 0.8);
            g.lineBetween(n.x, n.y - 6, n.x + Math.cos(a) * l, n.y - 6 + Math.sin(a) * l);
          }
        }
        if (time < stunUntil) {
          // Stunned: rings drop and lie still, little static stars overhead.
          for (let i = 0; i < 3; i++) {
            const a = time / 260 + i * 2.1;
            g.fillStyle(PLASMA_LIT, 0.9); g.fillCircle(n.x + Math.cos(a) * 18, n.y - 40 + Math.sin(a) * 5, 2.5);
          }
        }
        if (criticalAt) {
          const left = Math.max(0, criticalAt + countdownMs - time);
          // Countdown pips over its head — one per half-second left.
          const pips = Math.ceil(left / 500);
          for (let i = 0; i < pips; i++) {
            g.fillStyle(i === pips - 1 ? PLASMA_CORE : SUN_RIM, 1);
            g.fillCircle(n.x - (pips - 1) * 5 + i * 10, n.y - 52, 3.5);
          }
        }
      },

      drawHud(g, time) {
        // A glass specimen tube along the top, filling violet → white.
        const x = W / 2 - 140, y = 104, w = 280, h = 12;
        g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 8);
        g.fillStyle(PLASMA_DEEP, 0.6); g.fillRoundedRect(x, y, w, h, 6);
        const k = criticalAt ? 1 : inst / 100;
        const col = criticalAt ? (Math.floor(time / 120) % 2 ? PLASMA_CORE : SUN_RIM) : k > 0.7 ? PLASMA_LIT : PLASMA;
        if (k > 0.01) { g.fillStyle(col, 1); g.fillRoundedRect(x, y, Math.max(12, w * k), h, 6); }
        g.lineStyle(1.5, BRASS, 1); g.strokeRoundedRect(x, y, w, h, 6);
        g.lineStyle(2, BRASS_LIT, 1); g.lineBetween(x + w * 0.7, y - 2, x + w * 0.7, y + h + 2);
      },
    };
  },
};
