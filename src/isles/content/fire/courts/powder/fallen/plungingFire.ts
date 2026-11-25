import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, P, PCOL, dist, drawPuff } from '../util';

/**
 * PLUNGING FIRE — Master-Gunner Ambrose Kettering, the Prince's old tutor.
 *
 * Kettering taught a small boy called Fuse that a shell is only arithmetic: charge, elevation, range. In
 * the King's telling he taught him gladly. His fight has a squat siege mortar at the head of the room
 * and, beside it, the brass gunner's quadrant that lays it. The mortar lobs shells at whoever the
 * quadrant is laid on — each one a high slow arc with its landing ring marked on the floor — and a
 * shell bursts on anyone under it, its own tutor included.
 *
 * Strike the quadrant and you re-lay the gun on *him*; he walks up to strike it back. The plumb-bob on
 * the quadrant (and the HUD) says who is under the gun. Past half his strength he fires in brackets —
 * short, on, long — three rings walking down the line of fire.
 */

type Side = 'player' | 'npc';
interface Shell { from: Pt; to: Pt; at: number; flight: number }

const FLIGHT = 1350;
const EVERY = 2300;
const EVERY_BRACKET = 2900;
const BLAST_R = 64;
const BLAST = 24;
const LOCK_MS = 2600;
const BRACKET_STEP = 92;

export const PLUNGING_FIRE: GimmickDef = {
  id: fallenId('powder', 'plunging-fire'),
  rules: 'A mortar shells whoever the brass quadrant is laid on. Strike the quadrant to lay the gun on him — he will walk up to lay it back.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top } = ctx;
    const mortar: Pt = { x: W / 2, y: top + 46 };
    const quadAt: Pt = { x: W / 2 + 92, y: top + 52 };
    let laidOn: Side = 'player';
    let lockedUntil = 0;
    let swingAt = -9999;
    let nextFire = -1;
    let recoilAt = -9999;
    const shells: Shell[] = [];
    let bursts: { x: number; y: number; at: number }[] = [];

    const late = (): boolean => ctx.npc.hp < ctx.npc.maxHp * 0.5;
    const victim = (): Fighter => (laidOn === 'player' ? ctx.player : ctx.npc);

    const quad: StrikeTarget = ctx.target({
      x: quadAt.x, y: quadAt.y, r: 24,
      onStruck(by) {
        const now = ctx.tk.now;
        if (now < lockedUntil) return;
        const next: Side = by === 'player' ? 'npc' : 'player';
        if (next === laidOn) return;
        laidOn = next; lockedUntil = now + LOCK_MS; swingAt = now;
        ctx.sfx('gear-turn');
        if (next === 'npc') ctx.float(ctx.npc.x, ctx.npc.y - 48, 'UNDER HIS OWN GUN', PCOL.spark);
        else ctx.float(ctx.player.x, ctx.player.y - 48, 'RE-LAID', PCOL.red);
      },
    });

    const fire = (now: number): void => {
      const v = victim();
      recoilAt = now;
      ctx.sfx('mortar-launch');
      const aim = { x: ctx.tk.clampX(v.x, 50), y: ctx.tk.clampY(v.y, 60) };
      if (!late()) {
        shells.push({ from: { ...mortar }, to: aim, at: now, flight: FLIGHT });
        return;
      }
      // Bracket: short, on, long — down the bearing from the mortar, landing a beat apart.
      const a = Math.atan2(aim.y - mortar.y, aim.x - mortar.x);
      [-1, 0, 1].forEach((k, i) => {
        const to = { x: ctx.tk.clampX(aim.x + Math.cos(a) * BRACKET_STEP * k, 50), y: ctx.tk.clampY(aim.y + Math.sin(a) * BRACKET_STEP * k, 60) };
        shells.push({ from: { ...mortar }, to, at: now, flight: FLIGHT + i * 240 });
      });
    };

    const burst = (s: Shell, now: number): void => {
      bursts.push({ x: s.to.x, y: s.to.y, at: now });
      ctx.tk.boom(s.to.x, s.to.y, BLAST_R, P.flame);
      ctx.sfx('explosion-medium');
      for (const f of [ctx.player, ctx.npc]) {
        if (f.hp <= 0 || dist(f.x, f.y, s.to.x, s.to.y) > BLAST_R + 14) continue;
        ctx.hit(f, BLAST, f.x, f.y);
        if (f === ctx.npc) ctx.float(f.x, f.y - 44, 'A LESSON', PCOL.spark);
      }
    };

    return {
      update(time: number) {
        clock.tick(time);
        if (nextFire < 0) nextFire = time + 2200;
        if (time >= nextFire) { fire(time); nextFire = time + (late() ? EVERY_BRACKET : EVERY); }
        for (let i = shells.length - 1; i >= 0; i--) {
          if (time - shells[i].at >= shells[i].flight) { burst(shells[i], time); shells.splice(i, 1); }
        }
        bursts = bursts.filter((b) => time - b.at < 900);
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // A shell coming down on him: step out of its ring, sideways to the line of fire.
        for (const s of shells) {
          if (dist(s.to.x, s.to.y, n.x, n.y) < BLAST_R + 30) {
            const a = Math.atan2(s.to.y - mortar.y, s.to.x - mortar.x) + Math.PI / 2;
            const side = (n.x - s.to.x) * Math.cos(a) + (n.y - s.to.y) * Math.sin(a) >= 0 ? 1 : -1;
            return { x: ctx.tk.clampX(s.to.x + Math.cos(a) * side * 130, 70), y: ctx.tk.clampY(s.to.y + Math.sin(a) * side * 130, 70) };
          }
        }
        // Laid on him: walk up and strike the quadrant back the moment it unlocks.
        if (laidOn === 'npc') return { x: quadAt.x + 10, y: quadAt.y + 46 };
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // The gun-park's range lines: chalked arcs out from the mortar every hundred paces.
        for (let r = 140; r < 700; r += 120) {
          g.lineStyle(2, P.saltpetre, 0.12);
          g.beginPath(); g.arc(mortar.x, mortar.y, r, 0.15, Math.PI - 0.15); g.strokePath();
        }
        for (let a = 0.35; a < Math.PI; a += 0.4) {
          g.lineStyle(1, P.saltpetre, 0.08);
          g.lineBetween(mortar.x + Math.cos(a) * 110, mortar.y + Math.sin(a) * 110, mortar.x + Math.cos(a) * 700, mortar.y + Math.sin(a) * 700);
        }
        // Landing rings: a shadow that grows darker and smaller as the shell drops.
        for (const s of shells) {
          const k = Math.min(1, (time - s.at) / s.flight);
          g.lineStyle(2, P.redcoat, 0.35 + k * 0.55); g.strokeCircle(s.to.x, s.to.y, BLAST_R);
          g.fillStyle(P.redcoat, 0.05 + k * 0.12); g.fillCircle(s.to.x, s.to.y, BLAST_R * k);
          g.fillStyle(0x000000, 0.15 + k * 0.4); g.fillEllipse(s.to.x, s.to.y, 10 + k * 18, 5 + k * 8);
          // Range-finder's cross on the ring.
          g.lineStyle(1, P.saltpetre, 0.4); g.lineBetween(s.to.x - 10, s.to.y, s.to.x + 10, s.to.y); g.lineBetween(s.to.x, s.to.y - 10, s.to.x, s.to.y + 10);
        }
        for (const b of bursts) {
          const k = (time - b.at) / 900;
          g.fillStyle(0x140d08, 0.5 * (1 - k)); g.fillCircle(b.x, b.y, 34);
          for (let i = 0; i < 7; i++) {
            const a = i * 0.9 + b.x;
            g.fillStyle(P.earthDark, 0.6 * (1 - k)); g.fillCircle(b.x + Math.cos(a) * (30 + k * 20), b.y + Math.sin(a) * (22 + k * 14), 3);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // The mortar: a fat bronze tube on an oak bed, recoiling on each shot.
        const rec = Math.max(0, 1 - (time - recoilAt) / 300) * 6;
        const { x, y } = mortar;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 3, y + 22, 84, 18);
        g.fillStyle(P.oakDark, 1); g.fillRect(x - 38, y + 4, 76, 18);
        g.fillStyle(P.oak, 1); g.fillRect(x - 36, y + 4, 72, 12);
        g.fillStyle(P.iron, 1); g.fillCircle(x - 28, y + 18, 5); g.fillCircle(x + 28, y + 18, 5);
        g.fillStyle(dim(P.brass, 0.2), 1); g.fillEllipse(x, y + 2 - rec, 46, 30);
        g.fillStyle(P.brass, 1); g.fillEllipse(x, y - 2 - rec, 40, 24);
        g.fillStyle(lit(P.brass, 0.3), 1); g.fillEllipse(x - 8, y - 6 - rec, 10, 8);
        g.fillStyle(P.powder, 1); g.fillEllipse(x, y - 8 - rec, 24, 10);
        g.lineStyle(2, P.brassDark, 1); g.strokeEllipse(x, y - 8 - rec, 28, 12);
        if (time - recoilAt < 700) drawPuff(g, x, y - 24 - (time - recoilAt) / 20, 16 + (time - recoilAt) / 40, P.smoke, 0.6 * (1 - (time - recoilAt) / 700), 3);
        // Shells in flight: a high arc (the shell is drawn small at the top of its climb).
        for (const s of shells) {
          const k = Math.min(1, (time - s.at) / s.flight);
          const sx = s.from.x + (s.to.x - s.from.x) * k;
          const sy = s.from.y + (s.to.y - s.from.y) * k - Math.sin(k * Math.PI) * 240;
          const sz = 5 + Math.sin(k * Math.PI) * 3;
          g.fillStyle(P.iron, 1); g.fillCircle(sx, sy, sz);
          g.fillStyle(P.ironLit, 1); g.fillCircle(sx - sz * 0.3, sy - sz * 0.3, sz * 0.35);
          g.fillStyle(P.spark, 0.9); g.fillCircle(sx, sy - sz, 2);
        }
        // The gunner's quadrant: a brass quarter-circle on a stake, plumb-bob swinging to the victim.
        const qx = quadAt.x, qy = quadAt.y;
        const locked = ctx.tk.now < lockedUntil;
        g.lineStyle(3, P.oakDark, 1); g.lineBetween(qx, qy + 24, qx, qy - 6);
        g.fillStyle(P.brass, 1);
        g.slice(qx, qy - 6, 26, Math.PI, Math.PI * 1.5, false); g.fillPath();
        g.lineStyle(1.5, P.brassDark, 1); g.strokeCircle(qx, qy - 6, 26);
        for (let i = 0; i <= 9; i++) {
          const a = Math.PI + (i / 9) * (Math.PI / 2);
          g.lineBetween(qx + Math.cos(a) * 20, qy - 6 + Math.sin(a) * 20, qx + Math.cos(a) * 26, qy - 6 + Math.sin(a) * 26);
        }
        const swing = Math.max(0, 1 - (time - swingAt) / 900);
        const base = laidOn === 'player' ? -0.45 : 0.45;
        const ba = Math.PI / 2 + base + Math.sin(time / 70) * 0.4 * swing;
        const bx = qx + Math.cos(ba) * 30, by = qy - 6 + Math.sin(ba) * 30;
        g.lineStyle(1, P.saltpetre, 1); g.lineBetween(qx, qy - 6, bx, by);
        g.fillStyle(laidOn === 'player' ? 0x8fb4ff : P.redcoat, 1); g.fillTriangle(bx - 4, by - 3, bx + 4, by - 3, bx, by + 6);
        if (!locked) {
          g.lineStyle(2, P.spark, 0.4 + Math.sin(time / 160) * 0.3); g.strokeCircle(qx, qy - 2, 30);
        }
        // Who is under the gun: a chalk crosshair floating over their head.
        const v = victim();
        g.lineStyle(2, P.redcoat, 0.8); g.strokeCircle(v.x, v.y - 52, 8);
        g.lineBetween(v.x - 12, v.y - 52, v.x + 12, v.y - 52); g.lineBetween(v.x, v.y - 64, v.x, v.y - 40);
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // Next shell: a fuse-timer dial; and the lay — whose silhouette the gun is pointed at.
        const x = 24, y = top + 22;
        const span = late() ? EVERY_BRACKET : EVERY;
        const k = Math.max(0, Math.min(1, 1 - (nextFire - time) / span));
        g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 15);
        g.fillStyle(P.brass, 0.85); g.slice(x, y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.fillPath();
        g.lineStyle(1.5, P.brassDark, 1); g.strokeCircle(x, y, 13);
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x + 22, y - 13, 62, 26, 6);
        const col = laidOn === 'player' ? 0x8fb4ff : P.redcoat;
        g.fillStyle(col, 1); g.fillCircle(x + 53, y - 4, 6); g.fillRoundedRect(x + 45, y + 2, 16, 10, 4);
        g.lineStyle(1.5, P.saltpetre, 0.9); g.strokeCircle(x + 53, y, 11);
        const lockK = Math.max(0, (lockedUntil - ctx.tk.now) / LOCK_MS);
        if (lockK > 0) { g.fillStyle(P.iron, 0.9); g.fillRect(x + 26, y + 9, 54 * lockK, 3); }
      },

      destroy() { quad.remove(); },
    };
  },
};
