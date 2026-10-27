import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { mixC } from '../../../../../art/IsleArt';
import { CAL, dist, makeClock } from '../palette';

/**
 * Eruption Clock — Ventkeeper Surtr.
 *
 * Three vents ring the floor and go off in a fixed order — west, east, south, again — each
 * one counting down on its own dial. An eruption is three things at once: a pillar of fire on
 * the vent itself, a ring of scoria flung flat across the floor, and three boulders lobbed
 * high that land on their shadows and *stay*. Landed boulders are solid, and they stop
 * scoria: the room slowly fills with cover, and the next vent decides which side of a rock
 * you want to be on.
 *
 * Surtr reads the clock too — before each eruption he ducks behind the nearest rock on the
 * far side from the vent. Rocks are cover for whoever gets there first; a ventkeeper standing
 * on a vent is a ventkeeper you can let the vent hit.
 */

const MAX_BOULDERS = 6;
const BOULDER_R = 30;
const BOULDER_LIFE_MS = 16000;
const COLUMN_R = 80;

interface Vent { x: number; y: number; name: string }
interface Boulder { x: number; y: number; bornAt: number; dieAt: number; seed: number; crumbling: boolean }
interface Lob { fromX: number; fromY: number; x: number; y: number; bornAt: number; landsAt: number; seed: number }
interface Scoria { x: number; y: number; vx: number; vy: number; dieAt: number; spin: number }

export const eruptionClockGimmick: GimmickDef = {
  id: 'caldera-eruption',
  rules: 'Three vents erupt in order. Landed boulders are solid and block the scoria ring — hide behind them.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, rng, hard } = ctx;
    const tick = makeClock();
    const vents: Vent[] = [
      { x: W * 0.15, y: top + 120, name: 'WEST' },
      { x: W * 0.85, y: top + 140, name: 'EAST' },
      { x: W * 0.5, y: H - 78, name: 'SOUTH' },
    ];
    const gapMs = hard ? 2900 : 3700;
    const columnDmg = hard ? 26 : 22;
    const scoriaDmg = hard ? 10 : 9;
    const boulderDmg = hard ? 18 : 16;
    const scoriaCount = hard ? 16 : 14;

    let next = 0;
    let nextAt = -1;
    let lastCount = 0;
    let nowT = 0;
    const columns: { v: Vent; at: number }[] = [];
    const boulders: Boulder[] = [];
    const lobs: Lob[] = [];
    const scoria: Scoria[] = [];

    const hitBoth = (x: number, y: number, r: number, dmg: number): void => {
      for (const f of [ctx.player, ctx.npc]) {
        if (f.active && f.hp > 0 && dist(x, y, f.x, f.y) <= r + 18) ctx.hit(f, dmg, f.x, f.y);
      }
    };

    const clampPt = (x: number, y: number): Pt => ({
      x: Phaser.Math.Clamp(x, 60, W - 60),
      y: Phaser.Math.Clamp(y, top + 50, H - 50),
    });

    const erupt = (v: Vent, now: number): void => {
      columns.push({ v, at: now });
      ctx.sfx('explosion-large');
      ctx.flash(v.x, v.y, CAL.lavaLit);
      hitBoth(v.x, v.y, COLUMN_R, columnDmg);
      // The scoria ring — flat, fast, stopped by boulders.
      const a0 = rng() * Math.PI * 2;
      for (let i = 0; i < scoriaCount; i++) {
        const a = a0 + (i / scoriaCount) * Math.PI * 2;
        scoria.push({ x: v.x + Math.cos(a) * 40, y: v.y + Math.sin(a) * 40, vx: Math.cos(a) * 235, vy: Math.sin(a) * 235, dieAt: now + 3600, spin: rng() * 6 });
      }
      // Three boulders: one on you, one on Surtr, one anywhere.
      const p = ctx.player, n = ctx.npc;
      const targets: Pt[] = [
        clampPt(p.x + (rng() - 0.5) * 50, p.y + (rng() - 0.5) * 50),
        clampPt(n.x + (rng() - 0.5) * 90, n.y + (rng() - 0.5) * 90),
        clampPt(80 + rng() * (W - 160), top + 70 + rng() * (H - top - 140)),
      ];
      targets.forEach((t, i) => {
        lobs.push({ fromX: v.x, fromY: v.y, x: t.x, y: t.y, bornAt: now + i * 140, landsAt: now + i * 140 + (hard ? 1150 : 1350), seed: Math.floor(rng() * 9999) });
      });
    };

    const pushOut = (f: Fighter): void => {
      if (!f.active) return;
      for (const b of boulders) {
        if (b.crumbling) continue;
        const d = dist(b.x, b.y, f.x, f.y);
        const min = BOULDER_R + 16;
        if (d < min) {
          const ux = d > 0.01 ? (f.x - b.x) / d : 1, uy = d > 0.01 ? (f.y - b.y) / d : 0;
          ctx.nudge(f, ux * (min - d), uy * (min - d));
        }
      }
    };

    return {
      update(time: number) {
        const dt = tick(time);
        nowT = time;
        if (nextAt < 0) nextAt = time + 4200;
        // The clock.
        const left = nextAt - time;
        const count = Math.ceil(left / 1000);
        if (count !== lastCount && count >= 1 && count <= 3) {
          const v = vents[next];
          ctx.float(v.x, v.y - 56, `${count}`, '#ffd27a');
          ctx.sfx('countdown-tick');
        }
        lastCount = count;
        if (left <= 0) {
          erupt(vents[next], time);
          next = (next + 1) % vents.length;
          nextAt = time + gapMs;
        }
        // Boulders in flight.
        for (let i = lobs.length - 1; i >= 0; i--) {
          const l = lobs[i];
          if (time < l.landsAt) continue;
          lobs.splice(i, 1);
          hitBoth(l.x, l.y, BOULDER_R + 10, boulderDmg);
          ctx.sfx('rock-throw');
          ctx.flash(l.x, l.y, CAL.basaltLit);
          boulders.push({ x: l.x, y: l.y, bornAt: time, dieAt: time + BOULDER_LIFE_MS, seed: l.seed, crumbling: false });
          const live = boulders.filter((b) => !b.crumbling);
          if (live.length > MAX_BOULDERS) { live[0].crumbling = true; live[0].dieAt = time + 600; }
        }
        for (let i = boulders.length - 1; i >= 0; i--) {
          const b = boulders[i];
          if (!b.crumbling && time > b.dieAt - 600) b.crumbling = true;
          if (time >= b.dieAt) boulders.splice(i, 1);
        }
        // Scoria: flat shrapnel, stopped by rock, hurts whoever it reaches.
        for (let i = scoria.length - 1; i >= 0; i--) {
          const s = scoria[i];
          s.x += s.vx * dt; s.y += s.vy * dt;
          let dead = time > s.dieAt || s.x < -20 || s.x > W + 20 || s.y < top - 10 || s.y > H + 20;
          if (!dead) {
            for (const b of boulders) {
              if (!b.crumbling && dist(b.x, b.y, s.x, s.y) < BOULDER_R) { dead = true; ctx.flash(s.x, s.y, CAL.ash); break; }
            }
          }
          if (!dead) {
            for (const f of [ctx.player, ctx.npc]) {
              if (f.active && f.hp > 0 && dist(f.x, f.y, s.x, s.y) < 24) { ctx.hit(f, scoriaDmg, s.x, s.y); dead = true; break; }
            }
          }
          if (dead) scoria.splice(i, 1);
        }
        while (columns.length && time - columns[0].at > 900) columns.shift();
        pushOut(ctx.player);
        pushOut(ctx.npc);
      },

      npcSeek(): Pt | null {
        const left = nextAt - nowT;
        if (left > 1900 || left < 0) return null;
        const v = vents[next];
        const n = ctx.npc;
        // Behind the nearest rock, on the side away from the vent.
        let best: Pt | null = null;
        let bestD = Infinity;
        for (const b of boulders) {
          if (b.crumbling) continue;
          const d = dist(v.x, v.y, b.x, b.y) || 1;
          const spot = { x: b.x + ((b.x - v.x) / d) * (BOULDER_R + 26), y: b.y + ((b.y - v.y) / d) * (BOULDER_R + 26) };
          const dn = dist(n.x, n.y, spot.x, spot.y);
          if (dn < bestD) { bestD = dn; best = spot; }
        }
        if (best && bestD < 360) return clampPt(best.x, best.y);
        // No rock in reach: just get off the vent.
        if (dist(n.x, n.y, v.x, v.y) < COLUMN_R + 70) {
          const a = Math.atan2(n.y - v.y, n.x - v.x);
          return clampPt(v.x + Math.cos(a) * 240, v.y + Math.sin(a) * 240);
        }
        return null;
      },

      drawGround(g, time) {
        const now = time;
        // Vents: a scorched cone with a sulphur-crusted lip, its throat brightening on the count.
        vents.forEach((v, i) => {
          const isNext = i === next;
          const heat = isNext ? Phaser.Math.Clamp(1 - (nextAt - now) / gapMs, 0, 1) : 0.15;
          g.fillStyle(0x000000, 0.35); g.fillEllipse(v.x, v.y + 8, 150, 60);
          g.fillStyle(CAL.basaltDark, 1); g.fillEllipse(v.x, v.y, 128, 64);
          g.fillStyle(CAL.basalt, 1); g.fillEllipse(v.x, v.y - 4, 106, 50);
          // Sulphur crust in uneven clots round the lip.
          for (let k = 0; k < 10; k++) {
            const a = (k / 10) * Math.PI * 2 + i;
            g.fillStyle(k % 3 === 0 ? CAL.sulphur : CAL.sulphurDark, 0.85);
            g.fillEllipse(v.x + Math.cos(a) * 40, v.y - 4 + Math.sin(a) * 18, 12 + (k % 3) * 4, 6);
          }
          g.fillStyle(mixC(CAL.crust, CAL.lava, heat), 1); g.fillEllipse(v.x, v.y - 5, 50, 22);
          g.fillStyle(mixC(CAL.seam, CAL.lavaHot, heat), 0.5 + heat * 0.5); g.fillEllipse(v.x, v.y - 5, 30 * (0.5 + heat * 0.5), 12);
          // The dial: a ring of 12 basalt teeth that light up as the vent counts down.
          const lit = isNext ? Math.floor(heat * 12) : 0;
          for (let k = 0; k < 12; k++) {
            const a = -Math.PI / 2 + (k / 12) * Math.PI * 2;
            const r = 74;
            g.fillStyle(k < lit ? (heat > 0.75 ? CAL.lavaHot : CAL.lavaLit) : CAL.basaltDark, k < lit ? 0.95 : 0.7);
            g.fillCircle(v.x + Math.cos(a) * r, v.y + Math.sin(a) * r * 0.55, 4.5);
          }
          if (isNext && heat > 0.7) {
            g.lineStyle(3, CAL.lava, 0.25 + Math.sin(now / 60) * 0.2);
            g.strokeCircle(v.x, v.y, COLUMN_R);
          }
        });
        // Where the lobbed boulders will land.
        for (const l of lobs) {
          const k = Phaser.Math.Clamp((now - l.bornAt) / (l.landsAt - l.bornAt), 0, 1);
          g.fillStyle(0x000000, 0.2 + k * 0.4); g.fillEllipse(l.x, l.y, (BOULDER_R + 10) * 2 * (0.4 + k * 0.6), (BOULDER_R + 10) * (0.4 + k * 0.6));
          g.lineStyle(2, CAL.lavaLit, 0.4 + k * 0.5); g.strokeEllipse(l.x, l.y, (BOULDER_R + 10) * 2, BOULDER_R + 10);
        }
        // Landed boulders: fresh ones still glow in their cracks, cooling to plain stone.
        for (const b of boulders) {
          const age = now - b.bornAt;
          const fade = b.crumbling ? Math.max(0, (b.dieAt - now) / 600) : 1;
          const heat = Math.max(0, 1 - age / 5000);
          g.fillStyle(0x000000, 0.35 * fade); g.fillEllipse(b.x, b.y + 10, BOULDER_R * 2.3, BOULDER_R * 0.9);
          const pts: Phaser.Geom.Point[] = [];
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            const rr = BOULDER_R * (0.82 + (((b.seed * (k + 3)) % 17) / 17) * 0.3) * (b.crumbling ? 0.7 + fade * 0.3 : 1);
            pts.push(new Phaser.Geom.Point(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr * 0.8 - 6));
          }
          g.fillStyle(CAL.basaltDark, fade); g.fillPoints(pts, true, true);
          g.fillStyle(CAL.basaltMid, fade);
          g.fillPoints(pts.map((q) => new Phaser.Geom.Point(b.x + (q.x - b.x) * 0.85, b.y - 8 + (q.y - b.y + 6) * 0.85)), true, true);
          g.lineStyle(2, mixC(CAL.basaltDark, CAL.lavaHot, heat), 0.4 + heat * 0.6 * fade);
          g.lineBetween(b.x - 12, b.y - 14, b.x + 2, b.y - 2);
          g.lineBetween(b.x + 2, b.y - 2, b.x + 14, b.y - 10);
          g.lineBetween(b.x + 2, b.y - 2, b.x - 2, b.y + 8);
        }
      },

      drawAir(g, time) {
        const now = time;
        // Eruption pillars.
        for (const c of columns) {
          const k = (now - c.at) / 900;
          const h = 220 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (1 - Math.max(0, k - 0.6) * 2.5);
          const w = 54 * (1 - k * 0.5);
          g.fillStyle(CAL.lava, 0.75 * (1 - k)); g.fillEllipse(c.v.x, c.v.y - h / 2, w, h);
          g.fillStyle(CAL.lavaHot, 0.85 * (1 - k)); g.fillEllipse(c.v.x, c.v.y - h / 2, w * 0.45, h * 0.9);
          g.fillStyle(0x2a2226, 0.5 * (1 - k)); g.fillCircle(c.v.x + Math.sin(k * 7) * 20, c.v.y - h - 10, 26 + k * 30);
          g.lineStyle(3, CAL.lavaLit, 0.8 * (1 - k)); g.strokeCircle(c.v.x, c.v.y, COLUMN_R * Math.min(1, k * 3));
        }
        // Boulders in the air on a high arc — the shadow below is where they come down.
        for (const l of lobs) {
          if (now < l.bornAt) continue;
          const k = Phaser.Math.Clamp((now - l.bornAt) / (l.landsAt - l.bornAt), 0, 1);
          const x = l.fromX + (l.x - l.fromX) * k;
          const y = l.fromY + (l.y - l.fromY) * k - Math.sin(k * Math.PI) * 240;
          const r = 15 + Math.sin(k * Math.PI) * 9;
          g.fillStyle(CAL.basaltDark, 1); g.fillCircle(x, y, r);
          g.fillStyle(CAL.basaltMid, 1); g.fillCircle(x - 3, y - 3, r * 0.75);
          g.fillStyle(CAL.lavaLit, 0.8); g.fillCircle(x + r * 0.3, y + r * 0.2, r * 0.25);
          g.fillStyle(0x3a3036, 0.35); g.fillCircle(x - (l.x - l.fromX) * 0.03, y + 12, r * 0.6);
        }
        // Scoria: spinning clinkers with a hot core.
        for (const s of scoria) {
          const a = s.spin + now / 90;
          g.fillStyle(0x1b1418, 1);
          g.fillTriangle(s.x + Math.cos(a) * 8, s.y + Math.sin(a) * 8, s.x + Math.cos(a + 2.2) * 7, s.y + Math.sin(a + 2.2) * 7, s.x + Math.cos(a + 4.1) * 7, s.y + Math.sin(a + 4.1) * 7);
          g.fillStyle(CAL.lavaLit, 0.95); g.fillCircle(s.x, s.y, 2.5);
          g.lineStyle(2, CAL.lava, 0.35); g.lineBetween(s.x, s.y, s.x - s.vx * 0.06, s.y - s.vy * 0.06);
        }
      },

      drawHud(g, time) {
        // The order of play, top-centre: three vent pips, the next one filling.
        const cx = W / 2, y = top + 14;
        vents.forEach((_, i) => {
          const x = cx + (i - 1) * 34;
          const isNext = i === next;
          const k = isNext ? Phaser.Math.Clamp(1 - (nextAt - time) / gapMs, 0, 1) : 0;
          g.fillStyle(0x000000, 0.55); g.fillCircle(x, y, 11);
          g.fillStyle(isNext ? CAL.lava : CAL.basaltMid, 0.9); g.fillCircle(x, y, 8);
          if (isNext) {
            g.lineStyle(3, CAL.lavaHot, 1);
            g.beginPath(); g.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
          }
        });
      },

      destroy() { boulders.length = 0; lobs.length = 0; scoria.length = 0; },
    };
  },
};
