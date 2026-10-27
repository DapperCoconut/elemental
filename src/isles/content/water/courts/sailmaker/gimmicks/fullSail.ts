import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { CANVAS, HEMP_DARK, OAK, OAK_DARK, PINE, RED_THREAD, TAN_SAIL, TAR, cleat, dist, grommet, windStreaks } from '../art';

/**
 * Full Sail — Sailwright Gale's test rig, brought indoors.
 *
 * One wall of the loft is a great tanned sail on a standing yard. It luffs, slack and flapping,
 * then fills — the canvas bellies into the room — and then the gust comes through: everyone not
 * sheltering is shoved bodily across the floor toward the far rail, and anyone pinned against
 * the rail is battered on it. The only shelter is the *lee* of the iron cleats bolted to the
 * floor: a calm wedge of air downwind of each one, shown as soon as the sail starts to fill.
 * Standing in the sail's belly when it fills is worse still — it cracks full and throws you.
 *
 * During a gust the fighter nearer the sail has the weather gauge: blows carried downwind land
 * harder, blows flung into the wind land softer. Every third gust the yard goes about to the
 * opposite wall, and every lee flips with it.
 *
 * Gale runs for the lee every time — she was born on a deck. Her one blind spot: she picks the
 * lee nearest *her*, so take the one between her and the sail and you keep the weather gauge.
 */

const LUFF_MS = 3200;
const FILL_MS = 1600;
const FILL_HARD_MS = 1200;
const GUST_MS = 2500;
const TACK_EVERY = 3;
const PUSH_PX_S = 125;
const BELLY_DEPTH = 86;
const BELLY_THROW = 150;
const BELLY_DAMAGE = 11;
const RAIL_ZONE = 64;
const RAIL_TICK_MS = 500;
const RAIL_DAMAGE = 5;
const LEE_LEN = 190;
const LEE_HALF = 36;
const CLEATS = 5;
const GAUGE_UP = 1.22;
const GAUGE_DOWN = 0.85;

type Stage = 'luff' | 'fill' | 'gust';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const fillMs = ctx.hard ? FILL_HARD_MS : FILL_MS;
  const field = H - top;

  // Cleats scattered through the middle of the floor, never too close to each other.
  const cleats: Pt[] = [];
  for (let tries = 0; tries < 200 && cleats.length < CLEATS; tries++) {
    const x = W * 0.24 + rng() * W * 0.52;
    const y = top + 50 + rng() * (field - 100);
    if (cleats.some((c) => Math.abs(c.x - x) < 120 && Math.abs(c.y - y) < 110)) continue;
    cleats.push({ x, y });
  }

  /** +1: the sail is on the west wall and the wind blows east; −1 the other way. */
  let dir = 1;
  let stage: Stage = 'luff';
  let stageAt = 0;
  let gusts = 0;
  let announced = false;
  let tackFlash = 0;
  const railTick = new Map<Fighter, number>();

  const sailX = (): number => (dir > 0 ? 34 : W - 34);
  const railX = (): number => (dir > 0 ? W - 30 : 30);

  /** True if a point sits in the calm wedge downwind of a cleat. */
  const inLee = (x: number, y: number): boolean => cleats.some((c) => {
    const along = (x - c.x) * dir;
    if (along < 8 || along > LEE_LEN) return false;
    const half = LEE_HALF * (1 - (along / LEE_LEN) * 0.45);
    return Math.abs(y - c.y) < half;
  });
  const sheltered = (f: Fighter): boolean => inLee(f.x, f.y + 10);
  /** How far this fighter stands from the sail (bigger = further downwind). */
  const downwind = (f: Fighter): number => (f.x - sailX()) * dir;

  const bellyAt = (time: number): number => {
    if (stage === 'luff') return 10 + Math.sin(time / 120) * 6;
    if (stage === 'fill') return 10 + (BELLY_DEPTH - 10) * Math.min(1, (time - stageAt) / fillMs);
    return BELLY_DEPTH + Math.sin(time / 90) * 4;
  };

  const startGust = (time: number): void => {
    stage = 'gust'; stageAt = time;
    ctx.sfx('gust');
    // The belly cracks full — anyone standing in it is thrown.
    for (const f of [ctx.player, ctx.npc]) {
      if (!f.active || f.hp <= 0) continue;
      if (downwind(f) < BELLY_DEPTH + 20) {
        ctx.hit(f, BELLY_DAMAGE, f.x, f.y);
        ctx.nudge(f, dir * BELLY_THROW, 0);
        ctx.float(f.x, f.y - 48, 'CRACKED FULL', '#f0c8a0');
      }
    }
  };

  return {
    update(time, dt) {
      if (!announced) { announced = true; stageAt = time; ctx.banner('FIND THE LEE', '#f0c8a0'); }
      const age = time - stageAt;
      if (stage === 'luff' && age >= LUFF_MS) {
        stage = 'fill'; stageAt = time;
        ctx.float(sailX() + dir * 60, top + 40, 'THE SAIL FILLS', '#f0c8a0');
        ctx.sfx('wings');
      } else if (stage === 'fill' && age >= fillMs) {
        startGust(time);
      } else if (stage === 'gust' && age >= GUST_MS) {
        stage = 'luff'; stageAt = time;
        gusts++;
        if (gusts % TACK_EVERY === 0) {
          dir = -dir;
          tackFlash = time;
          ctx.banner('GO ABOUT!', '#f0c8a0');
          ctx.sfx('whoosh');
        }
      }

      if (stage === 'gust') {
        for (const f of [ctx.player, ctx.npc]) {
          if (!f.active || f.hp <= 0) continue;
          if (sheltered(f)) continue;
          ctx.nudge(f, dir * PUSH_PX_S * dt, 0);
          const atRail = (railX() - f.x) * dir < RAIL_ZONE;
          if (atRail && time - (railTick.get(f) ?? 0) > RAIL_TICK_MS) {
            railTick.set(f, time);
            ctx.hit(f, RAIL_DAMAGE, f.x, f.y);
            ctx.float(f.x, f.y - 44, 'ON THE RAIL', '#c8d8e8');
            ctx.sfx('hit-light');
          }
        }
      }
    },

    playerTakenMult() {
      if (stage !== 'gust') return 1;
      return downwind(ctx.player) > downwind(ctx.npc) ? GAUGE_UP : GAUGE_DOWN;
    },
    npcTakenMult() {
      if (stage !== 'gust') return 1;
      return downwind(ctx.npc) > downwind(ctx.player) ? GAUGE_UP : GAUGE_DOWN;
    },

    npcSeek(): Pt | null {
      if (stage === 'luff' && ctx.scene.time.now - stageAt < LUFF_MS - 900) {
        // Stay out of the belly while it is slack.
        const n = ctx.npc;
        return downwind(n) < BELLY_DEPTH + 40 ? { x: sailX() + dir * (BELLY_DEPTH + 120), y: n.y } : null;
      }
      // Fill coming or gust blowing: the lee nearest her.
      const n = ctx.npc;
      let best: Pt | null = null, bd = Infinity;
      for (const c of cleats) {
        const spot = { x: c.x + dir * 60, y: c.y - 10 };
        const d = dist(n.x, n.y, spot.x, spot.y);
        if (d < bd) { bd = d; best = spot; }
      }
      return best;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The rail along the downwind wall: a bulwark with a gunwale.
      const rx = railX();
      g.fillStyle(OAK_DARK, 1); g.fillRect(rx - 10, top, 20, field);
      g.fillStyle(OAK, 1); g.fillRect(rx - 7, top, 6, field);
      for (let y = top + 20; y < H; y += 48) { g.fillStyle(TAR, 1); g.fillRect(rx - 10, y, 20, 6); }
      g.fillStyle(0x000000, 0.15); g.fillRect(dir > 0 ? rx - RAIL_ZONE : rx + 10, top, RAIL_ZONE - 10, field);
      // Lees: calm wedges downwind of each cleat — shown from the moment the sail starts to fill.
      const show = stage !== 'luff' ? 1 : Math.max(0, 1 - (time - stageAt) / 600);
      for (const c of cleats) {
        const pts: Phaser.Geom.Point[] = [
          new Phaser.Geom.Point(c.x + dir * 8, c.y - LEE_HALF),
          new Phaser.Geom.Point(c.x + dir * LEE_LEN, c.y - LEE_HALF * 0.55),
          new Phaser.Geom.Point(c.x + dir * LEE_LEN, c.y + LEE_HALF * 0.55),
          new Phaser.Geom.Point(c.x + dir * 8, c.y + LEE_HALF),
        ];
        const pulse = stage === 'fill' ? 0.5 + 0.5 * Math.sin(t * 9) : 0.5;
        g.fillStyle(0x9ad8e8, (0.08 + pulse * 0.1) * Math.max(show, 0.25));
        g.fillPoints(pts, true, true);
        g.lineStyle(2, 0xd8f4ff, 0.25 + 0.45 * show); g.strokePoints(pts, true, true);
      }
      for (const c of cleats) cleat(g, c.x, c.y + 6, 15);
      // Tack flash: the whole floor's lees swap with a sweep of light.
      const tk = (time - tackFlash) / 700;
      if (tk >= 0 && tk < 1) {
        const x = dir > 0 ? W * tk : W * (1 - tk);
        g.fillStyle(0xffffff, 0.15 * (1 - tk)); g.fillRect(x - 40, top, 80, field);
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      const sx = sailX();
      // The yard (vertical spar) along the wall, its brace lines.
      g.fillStyle(OAK_DARK, 1); g.fillRect(sx - 8, top - 6, 16, field + 6);
      g.fillStyle(PINE, 1); g.fillRect(sx - 4, top - 6, 5, field + 6);
      // The sail: luffing ripples, or a full belly bowing into the room.
      const belly = bellyAt(time);
      const pts: Phaser.Geom.Point[] = [];
      const n = 24;
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const y = top + 4 + (field - 8) * k;
        const luff = stage === 'luff' ? Math.sin(t * 14 + k * 16) * 9 * Math.sin(k * Math.PI) : 0;
        pts.push(new Phaser.Geom.Point(sx + dir * (Math.sin(k * Math.PI) * belly + luff), y));
      }
      pts.push(new Phaser.Geom.Point(sx, H - 4));
      pts.push(new Phaser.Geom.Point(sx, top + 4));
      g.fillStyle(dim(TAN_SAIL, 0.4), 0.95); g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x + dir * 3, p.y + 3)), true, true);
      g.fillStyle(TAN_SAIL, 0.95); g.fillPoints(pts, true, true);
      // Cloths (panels) bowing with it.
      for (let c = 1; c < 6; c++) {
        const y = top + 4 + ((field - 8) / 6) * c;
        const k = (y - top) / field;
        g.lineStyle(1.5, dim(TAN_SAIL, 0.3), 0.9);
        g.lineBetween(sx, y, sx + dir * Math.sin(k * Math.PI) * belly, y);
        g.lineStyle(1, lit(TAN_SAIL, 0.2), 0.6);
        g.lineBetween(sx, y + 2, sx + dir * Math.sin(k * Math.PI) * belly * 0.97, y + 2);
      }
      // Highlight where it bellies.
      if (belly > 40) {
        g.fillStyle(lit(TAN_SAIL, 0.18), 0.6);
        g.fillEllipse(sx + dir * belly * 0.55, top + field * 0.5, belly * 0.6, field * 0.5);
      }
      // Grommets and the bolt-rope along the edge.
      for (let i = 0; i < 9; i++) grommet(g, sx + dir * 4, top + 30 + i * ((field - 60) / 8), 3);
      g.lineStyle(2.5, HEMP_DARK, 1);
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i <= n; i++) g.lineTo(pts[i].x, pts[i].y);
      g.strokePath();
      // The belly's danger strip, while filling.
      if (stage === 'fill') {
        const k = Math.min(1, (time - stageAt) / fillMs);
        g.fillStyle(RED_THREAD, 0.08 + 0.14 * k);
        g.fillRect(dir > 0 ? sx : sx - (BELLY_DEPTH + 20), top, BELLY_DEPTH + 20, field);
        if (k > 0.8 && Math.floor(time / 90) % 2 === 0) {
          g.lineStyle(3, 0xffffff, 0.4); g.strokeRect(dir > 0 ? sx : sx - (BELLY_DEPTH + 20), top, BELLY_DEPTH + 20, field);
        }
      }
      // Wind across the room during a gust (and a breath of it while filling).
      if (stage !== 'luff') {
        const strength = stage === 'gust' ? 1 : (time - stageAt) / fillMs * 0.4;
        windStreaks(g, 0, top + 6, W, field - 12, t, dir > 0 ? 0 : Math.PI, Math.floor(46 * strength), 760, 0.5 * strength, 3);
        // The lee stays calm: draw a quiet tuft of telltale in each.
        for (const c of cleats) {
          g.lineStyle(2, CANVAS, 0.8);
          g.lineBetween(c.x + dir * 30, c.y - 34, c.x + dir * 30 + Math.sin(t * 2 + c.x) * 3, c.y - 22);
        }
      }
      // Telltales on the yard show which way the wind will blow.
      for (let i = 0; i < 4; i++) {
        const y = top + 60 + i * ((field - 120) / 3);
        const flutter = stage === 'gust' ? Math.sin(t * 30 + i) * 3 : Math.sin(t * 4 + i) * 6;
        g.lineStyle(3, RED_THREAD, 0.95); g.lineBetween(sx, y, sx + dir * 22, y + flutter);
      }
    },

    drawHud(g, time) {
      // A small wind clock: luff → fill → gust, with an arrow for the wind's way.
      const cx = W / 2, cy = top + 14;
      const total = LUFF_MS + fillMs + GUST_MS;
      const into = stage === 'luff' ? 0 : stage === 'fill' ? LUFF_MS : LUFF_MS + fillMs;
      const k = Math.min(1, (into + (time - stageAt)) / total);
      g.fillStyle(0x10181c, 0.7); g.fillRoundedRect(cx - 90, cy - 8, 180, 16, 6);
      g.fillStyle(0x6a8a96, 0.9); g.fillRect(cx - 86, cy - 4, 172 * (LUFF_MS / total), 8);
      g.fillStyle(0xf0c8a0, 0.9); g.fillRect(cx - 86 + 172 * (LUFF_MS / total), cy - 4, 172 * (fillMs / total), 8);
      g.fillStyle(0xffffff, 0.9); g.fillRect(cx - 86 + 172 * ((LUFF_MS + fillMs) / total), cy - 4, 172 * (GUST_MS / total), 8);
      g.fillStyle(0x10181c, 1); g.fillRect(cx - 86 + 172 * k - 1.5, cy - 7, 3, 14);
      const ax = cx + dir * 104;
      g.fillStyle(0xf0c8a0, 1);
      g.fillTriangle(ax + dir * 10, cy, ax - dir * 4, cy - 7, ax - dir * 4, cy + 7);
      g.fillRect(dir > 0 ? ax - 14 : ax + 4, cy - 2, 10, 4);
    },
  };
}

export const FULL_SAIL: GimmickDef = {
  id: 'sailmaker-full-sail',
  rules: 'The sail fills, then blasts the room toward the rail. Shelter in the lee behind a cleat. Upwind blows land harder.',
  make,
};
