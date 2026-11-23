import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { brandSigil, mixC } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { CAL, dist, makeClock } from '../palette';

/**
 * Do Not Look at the Tower — Bellwarden Coyle Ashby (Sound).
 *
 * "Do not look at the tower," the crew chiefs tell the forge camp, because the bell on it rings
 * for crews that came up short and the warden in it writes down whoever looks up. In the King's
 * telling Coyle wrote down everyone. His tower stands on the north edge of the fight. Every few
 * seconds the bell tolls three times; on the third toll the lantern-eye opens, and anyone
 * *facing* the tower — aiming toward it, or walking toward it — is seen: branded and stunned.
 *
 * A wedge at each fighter's feet shows the forbidden direction, lit while the count runs. You
 * aim with the mouse, so turn your aim away; Coyle faces the way he walks, so be north of him
 * when the third toll comes and let him chase you into it. The bell can be struck from below —
 * a blow starts the count at once. Halfway down a second bell is hung on the south rim, and then
 * the only safe way to look is sideways.
 */

const CONE = (50 * Math.PI) / 180;
const SEEN_DMG = 22;
const SEEN_STUN = 1100;
const REST_MS = 3600;
const TOLL_GAP = 1000;
const BASE_R = 34;

interface Tower { x: number; y: number; bell: StrikeTarget; swingAt: number; eyeAt: number }
interface Seen { f: Fighter; tower: Tower; at: number }

export const towerGimmick: GimmickDef = {
  id: fallenId('caldera', 'tower'),
  rules: 'The bell tolls three times; on the third, anyone facing the tower is seen — branded and stunned. Strike the bell to start the count.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const tick = makeClock();
    const towers: Tower[] = [];
    let second = false;
    let nowT = 0;
    /** Tolls rung so far this count (0 = resting). */
    let tolls = 0;
    let nextAt = -1;
    const seen: Seen[] = [];

    const addTower = (x: number, y: number): void => {
      const t: Tower = {
        x, y, swingAt: -9999, eyeAt: -9999,
        bell: ctx.target({ x, y: y - 52, r: 18, passThrough: true, onStruck: () => {
          if (tolls === 0 && nextAt - nowT > 400) { nextAt = nowT; ctx.sfx('clang'); }
        } }),
      };
      towers.push(t);
    };
    addTower(W / 2, top + 62);

    const angTo = (f: Fighter, t: Tower): number => Math.atan2(t.y - 30 - f.y, t.x - f.x);
    const offBy = (a: number, b: number): number => Math.abs(Phaser.Math.Angle.Wrap(a - b));
    const looking = (f: Fighter): Tower | null => {
      const fa = ctx.facing(f);
      for (const t of towers) if (offBy(fa, angTo(f, t)) < CONE) return t;
      return null;
    };

    const toll = (time: number): void => {
      tolls++;
      for (const t of towers) t.swingAt = time;
      if (tolls < 3) { ctx.sfx('drum-hit'); nextAt = time + TOLL_GAP; return; }
      // The third toll: the eye opens.
      ctx.sfx('sonic-pulse');
      for (const t of towers) t.eyeAt = time;
      for (const f of [ctx.player, ctx.npc]) {
        if (!f.active || f.hp <= 0) continue;
        const t = looking(f);
        if (!t) continue;
        seen.push({ f, tower: t, at: time });
        ctx.hit(f, SEEN_DMG, f.x, f.y);
        ctx.stun(f, SEEN_STUN);
        ctx.flash(f.x, f.y, CAL.sulphur);
      }
      tolls = 0;
      nextAt = time + REST_MS;
    };

    const pushOut = (f: Fighter): void => {
      if (!f.active) return;
      for (const t of towers) {
        const d = dist(t.x, t.y, f.x, f.y), min = BASE_R + 18;
        if (d < min) { const ux = d > 0.01 ? (f.x - t.x) / d : 0, uy = d > 0.01 ? (f.y - t.y) / d : 1; ctx.nudge(f, ux * (min - d), uy * (min - d)); }
      }
    };

    return {
      update(time: number) {
        tick(time);
        nowT = time;
        if (nextAt < 0) nextAt = time + 2600;
        if (!second && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          second = true;
          addTower(W / 2, H - 34);
          ctx.banner('A SECOND BELL ON THE SOUTH RIM — LOOK SIDEWAYS', '#ffd27a');
          ctx.sfx('boss-phase');
        }
        if (time >= nextAt) toll(time);
        while (seen.length && time - seen[0].at > 1400) seen.shift();
        pushOut(ctx.player);
        pushOut(ctx.npc);
      },

      npcSeek(): Pt | null {
        const n = ctx.npc, pl = ctx.player;
        const counting = tolls > 0 || nextAt - nowT < 900;
        if (!counting) return null;
        // In the last breath before the third toll: stand still, so he faces his foe, not the tower.
        if (tolls === 2 && nextAt - nowT < 450) return { x: n.x, y: n.y };
        // Otherwise get where his foe is not toward a tower: north of them, or beside them once there are two.
        const spot = second
          ? { x: pl.x + (n.x >= pl.x ? 170 : -170), y: pl.y }
          : { x: pl.x + (n.x - pl.x) * 0.3, y: pl.y - 170 };
        return { x: Phaser.Math.Clamp(spot.x, 60, W - 60), y: Phaser.Math.Clamp(spot.y, top + 110, H - 90) };
      },

      drawGround(g, time) {
        // The wedge at each fighter's feet: the direction they must not face. It warms through the count.
        const heat = tolls === 0 ? (nextAt - time < 900 ? 0.25 : 0.08) : tolls / 3;
        for (const f of [ctx.player, ctx.npc]) {
          if (!f.active) continue;
          const bad = looking(f);
          for (const t of towers) {
            const a = angTo(f, t);
            g.fillStyle(bad === t && tolls > 0 ? CAL.lava : CAL.sulphur, 0.1 + heat * 0.35);
            g.slice(f.x, f.y, 46, a - CONE, a + CONE, false); g.fillPath();
            g.lineStyle(1.5, CAL.sulphurDark, 0.3 + heat * 0.5);
            g.beginPath(); g.arc(f.x, f.y, 46, a - CONE, a + CONE, false); g.strokePath();
          }
          // Their facing, a small chalk tick past the wedge.
          const fa = ctx.facing(f);
          g.lineStyle(2, bad ? CAL.lavaHot : 0xe8ecef, 0.7);
          g.lineBetween(f.x + Math.cos(fa) * 36, f.y + Math.sin(fa) * 36, f.x + Math.cos(fa) * 54, f.y + Math.sin(fa) * 54);
        }
        // The seen: the King's brand flaring on the floor under them.
        for (const s of seen) {
          const k = 1 - (time - s.at) / 1400;
          brandSigil(g, s.f.x, s.f.y + 4, 26, CAL.lavaLit, 0.8 * k);
        }
        for (const t of towers) { g.fillStyle(0x000000, 0.35); g.fillEllipse(t.x + 6, t.y + 4, 92, 26); }
      },

      drawAir(g, time) {
        for (const t of towers) {
          const { x, y } = t;
          // Four splayed timber legs, cross-braced, to a plank platform.
          g.lineStyle(5, CAL.wood, 1);
          g.lineBetween(x - 34, y, x - 22, y - 40); g.lineBetween(x + 34, y, x + 22, y - 40);
          g.lineStyle(4, mixC(CAL.wood, 0x000000, 0.3), 1);
          g.lineBetween(x - 16, y + 4, x - 12, y - 40); g.lineBetween(x + 16, y + 4, x + 12, y - 40);
          g.lineStyle(2, mixC(CAL.wood, 0x000000, 0.2), 1);
          g.lineBetween(x - 31, y - 8, x + 20, y - 34); g.lineBetween(x + 31, y - 8, x - 20, y - 34);
          g.fillStyle(mixC(CAL.wood, 0xffffff, 0.1), 1); g.fillRect(x - 30, y - 46, 60, 7);
          // The belfry posts and a pitched iron roof.
          g.lineStyle(3, CAL.wood, 1); g.lineBetween(x - 24, y - 46, x - 24, y - 72); g.lineBetween(x + 24, y - 46, x + 24, y - 72);
          g.fillStyle(CAL.iron, 1); g.fillTriangle(x - 32, y - 70, x + 32, y - 70, x, y - 90);
          g.fillStyle(mixC(CAL.iron, 0xffffff, 0.2), 1); g.fillTriangle(x - 32, y - 70, x, y - 70, x, y - 90);
          // The bell, swinging after each toll.
          const age = time - t.swingAt;
          const sw = Math.sin(age / 85) * Math.max(0, 1 - age / 1000) * 0.55;
          const bx = x + Math.sin(sw) * 10, by = y - 66 + Math.cos(sw) * 10;
          g.lineStyle(2, CAL.iron, 1); g.lineBetween(x, y - 68, bx, by - 6);
          g.fillStyle(CAL.sulphurDark, 1);
          g.fillPoints([new Phaser.Geom.Point(bx - 6, by - 6), new Phaser.Geom.Point(bx + 6, by - 6), new Phaser.Geom.Point(bx + 11, by + 10), new Phaser.Geom.Point(bx - 11, by + 10)], true, true);
          g.fillStyle(CAL.sulphur, 1); g.fillEllipse(bx, by + 10, 24, 6);
          g.fillStyle(CAL.iron, 1); g.fillCircle(bx + sw * 8, by + 13, 2.5);
          if (age < 500) { g.lineStyle(2, CAL.sulphur, 0.5 * (1 - age / 500)); g.strokeCircle(bx, by + 2, 18 + age / 12); }
          // The lantern-eye on the platform rail: a hooded lamp whose shutter opens on the third toll.
          const open = Math.max(0, 1 - (time - t.eyeAt) / 900);
          const pre = tolls / 3;
          g.fillStyle(CAL.iron, 1); g.fillEllipse(x, y - 44, 26, 16);
          g.fillStyle(mixC(CAL.seam, CAL.lavaHot, Math.max(open, pre * 0.6)), 1); g.fillEllipse(x, y - 44, 18, 4 + 8 * Math.max(open, pre * 0.35));
          g.fillStyle(0x0a0808, 1); g.fillCircle(x, y - 44, 2.5 + open * 1.5);
          if (open > 0) {
            g.fillStyle(CAL.lavaHot, 0.18 * open); g.fillCircle(x, y - 44, 40 + (1 - open) * 140);
            for (const s of seen) {
              if (s.tower !== t) continue;
              g.lineStyle(6, CAL.lavaHot, 0.35 * open); g.lineBetween(x, y - 44, s.f.x, s.f.y - 10);
            }
          }
        }
      },

      drawHud(g, time) {
        // Three bell pips, top-centre, ringing in as the count runs.
        const cx = W / 2 + 70, y = top + 16;
        for (let i = 0; i < 3; i++) {
          const x = cx + i * 22, rung = i < tolls;
          const last = i === 2 && nextAt - time < 900 && tolls === 2;
          g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, 10);
          g.fillStyle(rung ? CAL.sulphur : last ? CAL.lava : 0x4a4448, 1);
          g.fillTriangle(x - 6, y + 5, x + 6, y + 5, x, y - 6);
          g.fillEllipse(x, y + 5, 14, 4);
        }
        if (second) { g.lineStyle(1.5, 0xffa040, 0.8); g.strokeCircle(cx + 22, y, 15); }
      },

      destroy() { for (const t of towers) t.bell.remove(); towers.length = 0; seen.length = 0; },
    };
  },
};
