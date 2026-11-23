import Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { OBS } from '../../../../../art/PinnacleArt';
import { COPPER, COPPER_DARK, COPPER_LIT, RUBBER, SIDE_NPC, SIDE_NPC_CSS, SIDE_PLAYER, SIDE_PLAYER_CSS, VOLT, VOLT_LIT, bumper, sparks } from '../art';
import { type Who, WHO, alive, clamp, dist, other, stepOf } from '../util';

/**
 * DECREE OF THE TABLE — Councilor Gutta Percival, Seat of the Bounce (rubber).
 *
 * Percival wrote the clause that turned the Draw into a game the Bounce Court could sell: crank
 * to light the lamps, light the lamps to win a night's grace. Nobody ever won a night's grace.
 * His room is a pinball table. Three rubber bumpers kick whoever touches them across the floor —
 * a fighter flung into the other one SLAMS them — and a bumper you bounce off, or strike, lights
 * in your colour. Light all three and it is JACKPOT: your blows land a third harder for a while.
 * Two slingshots at the foot of the table kick you back up into play. And the table can be
 * tilted: dash about too much in a few seconds and it locks you out — TILT.
 *
 * A perfected Rubber bot lives on bumpers: it sets one between itself and you and comes off it
 * like a cannonball. The turn: it is a ball in a machine too — strike the bumper it is beside and
 * the pop throws it, and every dash it makes counts toward its own TILT.
 */

const BUMP_R = 34;
const FLING = 640;
const FLING_MS = 420;
const SLAM_DMG = 14;
const BUMP_DMG = 4;
const JACKPOT_MS = 6000;

interface Bumper { x: number; y: number; lit: Who | null; pop: number; target: StrikeTarget | null }
interface Fling { vx: number; vy: number; until: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const bumpers: Bumper[] = [
    { x: 320, y: top + 175 }, { x: W - 320, y: top + 175 }, { x: W / 2, y: top + 345 },
  ].map((p) => ({ x: p.x, y: p.y, lit: null, pop: 0, target: null }));
  const SLINGS: { x: number; y: number; dir: number }[] = [
    { x: 120, y: H - 120, dir: -Math.PI / 3 }, { x: W - 120, y: H - 120, dir: -Math.PI * 2 / 3 },
  ];
  const fling: Record<Who, Fling> = { player: { vx: 0, vy: 0, until: 0 }, npc: { vx: 0, vy: 0, until: 0 } };
  const bumpCd = new Map<string, number>();
  const dashes: Record<Who, number[]> = { player: [], npc: [] };
  const wasDashing: Record<Who, boolean> = { player: false, npc: false };
  const jackpot: Record<Who, number> = { player: 0, npc: 0 };
  const TILT_N = ctx.hard ? 4 : 5;
  let started = false;
  let tiltFx: { who: Who; at: number } | null = null;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const colorOf = (w: Who): number => (w === 'player' ? SIDE_PLAYER : SIDE_NPC);
  const cssOf = (w: Who): string => (w === 'player' ? SIDE_PLAYER_CSS : SIDE_NPC_CSS);

  const launch = (w: Who, ang: number, speed: number, time: number) => {
    const f = fighter(w);
    fling[w] = { vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, until: time + FLING_MS };
    ctx.root(f, FLING_MS - 40);
  };

  const light = (b: Bumper, w: Who, time: number) => {
    b.lit = w;
    b.pop = 1;
    if (bumpers.every((x) => x.lit === w)) {
      jackpot[w] = time + JACKPOT_MS;
      for (const x of bumpers) x.lit = null;
      ctx.banner(w === 'player' ? 'JACKPOT — YOURS' : 'JACKPOT — HIS', cssOf(w));
      ctx.sfx('jackpot');
    }
  };

  for (const b of bumpers) {
    b.target = ctx.target({
      x: b.x, y: b.y, r: BUMP_R + 2,
      onStruck: (by) => {
        const now = ctx.scene.time.now;
        light(b, by, now);
        ctx.sfx('boing');
        // The pop throws anyone stood against it.
        for (const w of WHO) {
          const f = fighter(w);
          if (!alive(f) || dist(f.x, f.y, b.x, b.y) > BUMP_R + 70) continue;
          launch(w, Math.atan2(f.y - b.y, f.x - b.x), FLING * 0.85, now);
          ctx.float(f.x, f.y - 44, 'POP', cssOf(by));
        }
      },
    });
  }

  return {
    update(time, dt) {
      const s = stepOf(dt);
      if (!started) {
        started = true;
        ctx.banner('DECREE OF THE TABLE — LIGHT ALL THREE. DO NOT TILT.', '#ffe14a');
      }
      for (const b of bumpers) b.pop = Math.max(0, b.pop - s * 3);
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        // TILT: count fresh dashes.
        const dashing = ctx.dashing(f);
        if (dashing && !wasDashing[w]) {
          dashes[w].push(time);
          while (dashes[w].length && time - dashes[w][0] > 5000) dashes[w].shift();
          if (dashes[w].length >= TILT_N) {
            dashes[w] = [];
            ctx.silence(f, 2000);
            ctx.float(f.x, f.y - 50, 'TILT', '#ff7a5a');
            ctx.sfx('status-stun');
            tiltFx = { who: w, at: time };
          }
        }
        wasDashing[w] = dashing;
        // Flight: carry, rebound off the cushions, slam into the other.
        const fl = fling[w];
        if (time < fl.until) {
          if ((f.x < 60 && fl.vx < 0) || (f.x > W - 60 && fl.vx > 0)) fl.vx = -fl.vx * 0.8;
          if ((f.y < top + 50 && fl.vy < 0) || (f.y > H - 50 && fl.vy > 0)) fl.vy = -fl.vy * 0.8;
          ctx.nudge(f, fl.vx * s, fl.vy * s);
          fl.vx *= 1 - 1.6 * s; fl.vy *= 1 - 1.6 * s;
          const o = fighter(other(w));
          if (alive(o) && Math.hypot(fl.vx, fl.vy) > 280 && dist(f.x, f.y, o.x, o.y) < 50) {
            ctx.hit(o, SLAM_DMG, o.x, o.y);
            ctx.float(o.x, o.y - 48, 'SLAM', cssOf(w));
            ctx.sfx('hit-heavy');
            ctx.flash(o.x, o.y, colorOf(w));
            launch(other(w), Math.atan2(fl.vy, fl.vx), FLING * 0.7, time);
            fl.until = time;
          }
          continue;
        }
        // Bumpers kick on touch.
        for (const b of bumpers) {
          const key = `${w}${b.x}`;
          if ((bumpCd.get(key) ?? 0) > time) continue;
          if (dist(f.x, f.y, b.x, b.y) < BUMP_R + 22) {
            bumpCd.set(key, time + 400);
            launch(w, Math.atan2(f.y - b.y, f.x - b.x), FLING, time);
            ctx.hit(f, BUMP_DMG, f.x, f.y);
            light(b, w, time);
            ctx.sfx('boing');
            break;
          }
        }
        // Slingshots at the foot kick you back up the table.
        for (const sl of SLINGS) {
          const key = `${w}s${sl.x}`;
          if ((bumpCd.get(key) ?? 0) > time) continue;
          if (dist(f.x, f.y, sl.x, sl.y) < 52) {
            bumpCd.set(key, time + 600);
            launch(w, sl.dir, FLING * 0.9, time);
            ctx.sfx('snap-back');
          }
        }
      }
    },
    playerTakenMult() { return ctx.scene.time.now < jackpot.npc ? 1.35 : 1; },
    npcTakenMult() { return ctx.scene.time.now < jackpot.player ? 1.35 : 1; },
    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      if (ctx.scene.time.now < fling.npc.until) return null;
      // Line a bumper up behind it and come off it at the player.
      for (const b of bumpers) {
        const dp = dist(b.x, b.y, p.x, p.y);
        if (dp > 380 || dp < 60) continue;
        const a = Math.atan2(b.y - p.y, b.x - p.x);
        const spot = { x: b.x + Math.cos(a) * (BUMP_R + 8), y: b.y + Math.sin(a) * (BUMP_R + 8) };
        if (dist(n.x, n.y, spot.x, spot.y) < 260) return spot;
      }
      // Steal the lamp the player needs; else light its own.
      const playerLit = bumpers.filter((b) => b.lit === 'player').length;
      const want = bumpers.filter((b) => (playerLit >= 2 ? b.lit !== 'player' : b.lit !== 'npc'));
      const goal = want.sort((a, b) => dist(n.x, n.y, a.x, a.y) - dist(n.x, n.y, b.x, b.y))[0];
      if (!goal) return null;
      const a = Math.atan2(n.y - goal.y, n.x - goal.x);
      return { x: goal.x + Math.cos(a) * (BUMP_R + 10), y: goal.y + Math.sin(a) * (BUMP_R + 10) };
    },
    drawGround(g, time) {
      const t = time / 1000;
      // The playfield: guide-rails in copper round the top, rollover lamps, chevrons at each bumper.
      g.lineStyle(6, COPPER_DARK, 0.9);
      g.beginPath(); g.arc(W / 2, top + 330, 420, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
      g.lineStyle(2, COPPER_LIT, 0.7);
      g.beginPath(); g.arc(W / 2, top + 330, 418, Math.PI * 1.1, Math.PI * 1.9, false); g.strokePath();
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 1.15 + (i / 8) * Math.PI * 0.7;
        const x = W / 2 + Math.cos(a) * 390, y = top + 330 + Math.sin(a) * 390;
        const on = Math.floor(t * 6 + i) % 9 < 3;
        g.fillStyle(OBS.glass, 1); g.fillCircle(x, y, 7);
        g.fillStyle(on ? VOLT : 0x3a3020, on ? 0.95 : 0.8); g.fillCircle(x, y, 5);
      }
      for (const b of bumpers) {
        for (let k = 0; k < 3; k++) {
          const a = Math.atan2(b.y - (H - 60), b.x - W / 2);
          const d = BUMP_R + 26 + k * 16;
          const x = b.x - Math.cos(a) * d, y = b.y - Math.sin(a) * d;
          const on = Math.floor(t * 5) % 3 === 2 - k;
          g.fillStyle(on ? VOLT : 0x3a3020, on ? 0.8 : 0.5);
          g.fillTriangle(x + Math.cos(a) * 7, y + Math.sin(a) * 7, x + Math.cos(a + 2.4) * 7, y + Math.sin(a + 2.4) * 7, x + Math.cos(a - 2.4) * 7, y + Math.sin(a - 2.4) * 7);
        }
      }
      // Slingshots: rubber-banded triangles of black glass.
      for (const sl of SLINGS) {
        const flip = sl.x < W / 2 ? 1 : -1;
        const pts = [new Phaser.Geom.Point(sl.x - 40 * flip, sl.y - 50), new Phaser.Geom.Point(sl.x - 40 * flip, sl.y + 40), new Phaser.Geom.Point(sl.x + 44 * flip, sl.y + 40)];
        g.fillStyle(0x000000, 0.4); g.fillTriangle(pts[0].x + 4, pts[0].y + 6, pts[1].x + 4, pts[1].y + 6, pts[2].x + 4, pts[2].y + 6);
        g.fillStyle(OBS.facet, 1); g.fillPoints(pts, true);
        g.lineStyle(7, RUBBER, 1); g.lineBetween(pts[0].x, pts[0].y, pts[2].x, pts[2].y);
        g.lineStyle(2, VOLT, 0.5 + 0.3 * Math.sin(t * 4)); g.lineBetween(pts[0].x + 4 * flip, pts[0].y + 4, pts[2].x - 4 * flip, pts[2].y - 3);
        g.fillStyle(COPPER, 1); for (const p of pts) g.fillCircle(p.x, p.y, 4);
      }
      for (const b of bumpers) bumper(g, b.x, b.y, BUMP_R, b.lit ? colorOf(b.lit) : null, b.pop, t);
    },
    drawAir(g, time) {
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        const fl = fling[w];
        if (time < fl.until) {
          // A streak behind a flung fighter.
          const sp = Math.hypot(fl.vx, fl.vy) || 1;
          for (let i = 1; i <= 4; i++) {
            g.fillStyle(colorOf(w), 0.22 - i * 0.04);
            g.fillCircle(f.x - (fl.vx / sp) * i * 14, f.y - (fl.vy / sp) * i * 14, 20 - i * 3);
          }
        }
        if (time < jackpot[w]) {
          g.lineStyle(2, VOLT_LIT, 0.6 + 0.3 * Math.sin(time / 90)); g.strokeCircle(f.x, f.y, 30);
          sparks(g, f.x + 22, f.y - 26, 10, Math.floor(time / 60), VOLT, 0.8);
        }
        // Dash count toward TILT: small lamps over the head.
        const n = dashes[w].filter((d) => time - d < 5000).length;
        for (let i = 0; i < TILT_N - 1; i++) {
          g.fillStyle(i < n ? 0xff7a5a : 0x2a2436, i < n ? 1 : 0.5); g.fillCircle(f.x - (TILT_N - 2) * 5 + i * 10, f.y - 44, 3);
        }
      }
      if (tiltFx && time - tiltFx.at < 900) {
        const f = fighter(tiltFx.who);
        const k = (time - tiltFx.at) / 900;
        g.lineStyle(4, 0xff7a5a, 1 - k);
        g.strokeRect(f.x - 30 - k * 20, f.y - 30 - k * 20, 60 + k * 40, 60 + k * 40);
      }
    },
    drawHud(g, time) {
      const cx = W / 2, cy = top + 18;
      g.fillStyle(OBS.glass, 0.88); g.fillRoundedRect(cx - 70, cy - 12, 140, 24, 10);
      g.lineStyle(1.5, COPPER, 0.9); g.strokeRoundedRect(cx - 70, cy - 12, 140, 24, 10);
      bumpers.forEach((b, i) => {
        const x = cx - 36 + i * 36;
        g.fillStyle(RUBBER, 1); g.fillCircle(x, cy, 9);
        g.fillStyle(b.lit ? colorOf(b.lit) : 0x3a3020, 1); g.fillCircle(x, cy, 6);
      });
      for (const w of WHO) {
        if (time < jackpot[w]) {
          const k = (jackpot[w] - time) / JACKPOT_MS;
          g.fillStyle(colorOf(w), 1); g.fillRect(cx - 60, cy + 9, 120 * k, 3);
        }
      }
    },
    destroy() { for (const b of bumpers) { b.target?.remove(); b.target = null; } },
  };
}

export const DECREE_TABLE: GimmickDef = {
  id: 'bench-electricity-table',
  rules: 'A pinball table: bumpers kick and light in your colour; flung into the other, you slam them. Light all three: JACKPOT. Dash too much: TILT.',
  make,
};
