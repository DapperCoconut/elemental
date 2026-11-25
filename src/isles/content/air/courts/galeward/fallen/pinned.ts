import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { weathervane, windStreak } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, ROCK, ROCK_DARK, ROCK_LIT, SKY_LIT, TAR } from '../palette';
import { alive, clamp, dist, stepDt, turnToward } from '../util';

/**
 * Wherever the Pin Goes — Ottilie Fairweather, Vane-Smith of Weathercock Square.
 *
 * In the waking world every vane in Galeward is pinned to point at the toll, and somebody had to
 * pin them. In the star's telling it was Ottilie: she forged the brass collars, drove the split
 * pins, and taught the town that "true north" is wherever the Prince says the wind should go.
 *
 * Four great vanes stand in the corners of the yard. Each beat she drives a lodestone pin into the
 * ground where you stand (its shadow falls first), the four vanes swing round to point at it, and
 * a gust runs down every vane's line toward the pin — four lanes that cross on the spot. Leave the
 * spot, and leave the lines.
 *
 * The exploit is the collars. Strike a vane and its pin springs: the loose vane swings round to
 * point at *her*, and on the next gust its lane runs at the Vane-Smith instead. She never watches a
 * loose vane — she walks over to re-pin it, and if she gets there before the gust it is hers again.
 * Halfway down, the pin turns live: between landing and gust it draws both fighters in toward the
 * crossing, and the beats come quicker.
 */

const ID = fallenId('galeward', 'pinned');
const LANE_HALF = 24;
const DROP_MS = 900;
const WARN_MS = 1050;
const LOCK_MS = 380;
const FIRE_MS = 360;
const REST_MS = 1500;
const REST_LIVE_MS = 850;
const REPIN_R = 54;
const PULL = 40;

interface Vane { x: number; y: number; ang: number; loose: boolean; aim: Pt; struck: number; target: StrikeTarget | null }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const vanes: Vane[] = [
    { x: 70, y: top + 96 }, { x: W - 70, y: top + 96 }, { x: 70, y: H - 40 }, { x: W - 70, y: H - 40 },
  ].map((p) => ({ ...p, ang: Math.atan2((top + H) / 2 - p.y, W / 2 - p.x), loose: false, aim: { x: W / 2, y: (top + H) / 2 }, struck: -1e9, target: null }));
  const pin: Pt = { x: W / 2, y: (top + H) / 2 };
  let beatAt = 0, dropAt = 0, gustAt = 0, firedAt = -1e9;
  let planted = false, fired = true, live = false, started = false;

  /** A lane: the ray out of the vane toward its aim. Is `f` inside it? */
  const inLane = (v: Vane, x: number, y: number): boolean => {
    const ux = Math.cos(v.ang), uy = Math.sin(v.ang);
    const along = (x - v.x) * ux + (y - v.y) * uy;
    if (along < 10) return false;
    return Math.abs((x - v.x) * -uy + (y - v.y) * ux) < LANE_HALF + 18;
  };
  const warning = (t: number) => planted && !fired && t < gustAt;

  for (const v of vanes) {
    v.target = ctx.target({
      x: v.x, y: v.y - 40, r: 26,
      onStruck(by) {
        if (by === 'npc') { if (v.loose) { v.loose = false; ctx.sfx('magnet-pull'); } return; }
        if (v.loose || tk.now - v.struck < 600) return;
        v.loose = true; v.struck = tk.now;
        ctx.flash(v.x, v.y - 70, BRASS_LIT);
        ctx.sfx('snap-back');
      },
    });
  }

  function gust(f: Fighter, v: Vane): void {
    if (!alive(f) || !inLane(v, f.x, f.y)) return;
    if (f === player) tk.hitPlayer(9, f.x, f.y);
    else { ctx.hit(npc, v.loose ? 16 : 9, f.x, f.y); if (v.loose) ctx.flash(f.x, f.y - 20, SKY_LIT); }
    ctx.nudge(f, Math.cos(v.ang) * 30, Math.sin(v.ang) * 30);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; beatAt = time + 1800; }
      if (!live && npc.hp < npc.maxHp * 0.5) { live = true; ctx.banner('THE PIN IS LIVE', '#f4d68e'); ctx.sfx('magnet-pull'); }

      // A new beat: the pin's shadow falls where you stand.
      if (fired && time >= beatAt) {
        fired = false; planted = false;
        pin.x = tk.clampX(player.x, 60); pin.y = tk.clampY(player.y, 50);
        dropAt = time + tk.warn(DROP_MS);
        gustAt = dropAt + tk.warn(WARN_MS);
        ctx.sfx('whoosh');
      }
      if (!fired && !planted && time >= dropAt) { planted = true; ctx.sfx('anvil'); ctx.flash(pin.x, pin.y, BRASS); }

      // The vanes swing: pinned ones to the pin, loose ones after the smith (until they lock).
      for (const v of vanes) {
        if (v.loose && (!planted || time < gustAt - LOCK_MS)) { v.aim.x = npc.x; v.aim.y = npc.y; }
        else if (!v.loose && planted) { v.aim.x = pin.x; v.aim.y = pin.y; }
        const want = Math.atan2(v.aim.y - v.y, v.aim.x - v.x);
        v.ang = turnToward(v.ang, want, (v.loose ? 7 : 5) * dt);
        // She re-pins a loose vane by laying a hand on it.
        if (v.loose && alive(npc) && dist(npc.x, npc.y, v.x, v.y) < REPIN_R) { v.loose = false; ctx.sfx('magnet-pull'); }
      }

      // A live pin draws everyone toward the crossing.
      if (live && warning(time)) {
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(f.x, f.y, pin.x, pin.y);
          if (d > 30) ctx.nudge(f, ((pin.x - f.x) / d) * PULL * dt, ((pin.y - f.y) / d) * PULL * dt);
        }
      }

      // The gust runs down all four lines at once.
      if (planted && !fired && time >= gustAt) {
        fired = true; firedAt = time;
        ctx.sfx('gust');
        for (const v of vanes) { gust(player, v); gust(npc, v); }
        beatAt = time + (live ? REST_LIVE_MS : REST_MS);
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      const t = tk.now;
      // She sidesteps her own pinned lines — never a loose one; she doesn't believe in them.
      if (warning(t)) {
        for (const v of vanes) {
          if (v.loose || !inLane(v, npc.x, npc.y)) continue;
          const ux = Math.cos(v.ang), uy = Math.sin(v.ang);
          const side = (npc.x - v.x) * -uy + (npc.y - v.y) * ux >= 0 ? 1 : -1;
          return { x: tk.clampX(npc.x - uy * side * 90), y: tk.clampY(npc.y + ux * side * 90) };
        }
      }
      // A sprung collar: walk over and pin it back.
      let best: Vane | null = null;
      for (const v of vanes) if (v.loose && (!best || dist(npc.x, npc.y, v.x, v.y) < dist(npc.x, npc.y, best.x, best.y))) best = v;
      return best ? { x: best.x + (best.x < W / 2 ? 30 : -30), y: best.y - 10 } : null;
    },

    drawGround(g, time) {
      // The square's paving rings round each vane's plinth.
      for (const v of vanes) {
        g.fillStyle(ROCK_DARK, 0.45); g.fillEllipse(v.x, v.y + 2, 74, 26);
        g.fillStyle(ROCK, 0.8); g.fillEllipse(v.x, v.y, 64, 21);
        g.lineStyle(1, ROCK_LIT, 0.5); g.strokeEllipse(v.x, v.y, 48, 15);
      }
      // The lanes: brass for her pins, sky-blue for a sprung one.
      if (planted && (!fired || time - firedAt < FIRE_MS)) {
        const k = fired ? 1 : clamp((time - dropAt) / (gustAt - dropAt), 0, 1);
        for (const v of vanes) drawLane(g, v, k, fired ? 1 - (time - firedAt) / FIRE_MS : 0, time, W);
      }
      // The pin: its shadow growing while it falls, then the spike in a star of cracks.
      if (!fired && !planted) {
        const k = clamp(1 - (dropAt - time) / DROP_MS, 0, 1);
        g.fillStyle(0x000000, 0.12 + k * 0.25); g.fillEllipse(pin.x, pin.y, 20 + k * 30, 8 + k * 11);
        g.lineStyle(2, BRASS_LIT, 0.35 + k * 0.5); g.strokeCircle(pin.x, pin.y, 54 - k * 30);
      } else if (planted) {
        g.lineStyle(2, TAR, 0.6);
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + pin.x * 0.01;
          const r1 = 14 + (i % 3) * 7;
          g.lineBetween(pin.x, pin.y, pin.x + Math.cos(a) * r1, pin.y + Math.sin(a) * r1 * 0.45);
        }
        if (live && warning(time)) {
          for (let i = 0; i < 3; i++) {
            const r = 120 - ((time / 6 + i * 40) % 120);
            g.lineStyle(1.5, BRASS_LIT, 0.15 + (1 - r / 120) * 0.4); g.strokeEllipse(pin.x, pin.y, r * 2, r * 0.9);
          }
        }
      }
    },

    drawAir(g, time) {
      if (!fired && !planted) {
        const k = clamp(1 - (dropAt - time) / DROP_MS, 0, 1);
        drawPin(g, pin.x, pin.y - (1 - k) * 280, 0.8 + k * 0.2, live);
      } else if (planted) drawPin(g, pin.x, pin.y, 1, live);
      for (const v of vanes) drawVane(g, v, time);
      if (fired && time - firedAt < FIRE_MS) {
        const k = (time - firedAt) / FIRE_MS;
        for (const v of vanes) {
          const ux = Math.cos(v.ang), uy = Math.sin(v.ang);
          for (let i = 0; i < 5; i++) {
            const d = 60 + k * 500 + i * 70;
            windStreak(g, v.x + ux * d + (i % 2 ? -uy : uy) * 10, v.y - 30 + uy * d, 46, 0.7 * (1 - k), 1);
          }
        }
      }
    },

    drawHud(g) {
      // Four little vanes: lit brass for a pin she holds, open blue for a collar you sprang.
      const x0 = 34, y = top + 30;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x0 - 16, y - 18, 4 * 30 + 12, 36, 8);
      vanes.forEach((v, i) => {
        const x = x0 + i * 30;
        g.lineStyle(2, v.loose ? 0x7ec4ee : BRASS, 1); g.lineBetween(x, y + 12, x, y - 6);
        g.lineBetween(x - Math.cos(v.ang) * 10, y - 6 - Math.sin(v.ang) * 4, x + Math.cos(v.ang) * 10, y - 6 + Math.sin(v.ang) * 4);
        g.fillStyle(v.loose ? 0x7ec4ee : BRASS_DARK, 1); g.fillCircle(x, y + 4, v.loose ? 3 : 4);
      });
      if (!fired) {
        const k = planted ? clamp((tk.now - dropAt) / (gustAt - dropAt), 0, 1) : 0;
        g.fillStyle(0x000000, 0.45); g.fillRect(x0 - 12, y + 22, 112, 6);
        g.fillStyle(k > 0.7 ? 0xe8642a : BRASS_LIT, 1); g.fillRect(x0 - 11, y + 23, 110 * k, 4);
      }
    },

    destroy() { for (const v of vanes) v.target?.remove(); },
  };
}

/** One vane's lane on the ground: a band out of the plinth with chevrons streaming toward the aim. */
function drawLane(g: G, v: Vane, k: number, fire: number, time: number, W: number): void {
  const ux = Math.cos(v.ang), uy = Math.sin(v.ang);
  const L = W * 1.3;
  const nx = -uy * LANE_HALF, ny = ux * LANE_HALF;
  const col = v.loose ? 0x7ec4ee : BRASS_LIT;
  const pts = [
    { x: v.x + nx, y: v.y + ny }, { x: v.x + ux * L + nx, y: v.y + uy * L + ny },
    { x: v.x + ux * L - nx, y: v.y + uy * L - ny }, { x: v.x - nx, y: v.y - ny },
  ];
  g.fillStyle(fire > 0 ? 0xffffff : col, fire > 0 ? 0.35 * fire : 0.07 + k * 0.13); g.fillPoints(pts, true);
  g.lineStyle(1.5, col, 0.25 + k * 0.45);
  g.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y); g.lineBetween(pts[3].x, pts[3].y, pts[2].x, pts[2].y);
  if (fire > 0) return;
  for (let d = (time / 4) % 46 + 30; d < L; d += 46) {
    const cx = v.x + ux * d, cy = v.y + uy * d;
    g.lineStyle(2, col, 0.2 + k * 0.5);
    g.lineBetween(cx - ux * 9 + nx * 0.5, cy - uy * 9 + ny * 0.5, cx, cy);
    g.lineBetween(cx - ux * 9 - nx * 0.5, cy - uy * 9 - ny * 0.5, cx, cy);
  }
}

/** The lodestone pin: a brass spike, a split collar, and an iron head with its two poles. */
function drawPin(g: G, x: number, y: number, s: number, live: boolean): void {
  shadow(g, x, y, 22 * s, 7 * s, 0.3);
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x - 5 * s, y - 34 * s, x + 5 * s, y - 34 * s, x, y + 2);
  g.fillStyle(BRASS, 1); g.fillTriangle(x - 3 * s, y - 34 * s, x + 2 * s, y - 34 * s, x - 0.5, y);
  g.fillStyle(BRASS_LIT, 1); g.fillRect(x - 7 * s, y - 38 * s, 14 * s, 5 * s);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 1, y - 38 * s, 2, 5 * s);
  g.fillStyle(0x3a3a44, 1); g.fillEllipse(x, y - 47 * s, 22 * s, 18 * s);
  g.fillStyle(0xc8402e, 1); g.fillEllipse(x - 5 * s, y - 48 * s, 9 * s, 12 * s);
  g.fillStyle(0x3a6fb8, 1); g.fillEllipse(x + 5 * s, y - 48 * s, 9 * s, 12 * s);
  g.fillStyle(0xffffff, 0.35); g.fillEllipse(x - 4 * s, y - 52 * s, 6 * s, 3 * s);
  if (live) glow(g, x, y - 47 * s, 30 * s, BRASS_LIT, 0.07, 4);
}

/** A great vane: a stone plinth, an iron post, the court's cockerel vane — and its pin collar. */
function drawVane(g: G, v: Vane, time: number): void {
  const wob = v.loose ? Math.sin(time / 40) * 0.05 : 0;
  g.fillStyle(ROCK_DARK, 1); g.fillRect(v.x - 14, v.y - 16, 28, 16);
  g.fillStyle(ROCK_LIT, 1); g.fillRect(v.x - 14, v.y - 16, 28, 4);
  weathervane(g, v.x, v.y - 14, 66, v.ang + wob, 1.35, v.loose ? lit(BRASS, 0.2) : BRASS);
  // The collar on the post just under the cross.
  const cy = v.y - 60;
  if (!v.loose) {
    g.fillStyle(BRASS_DARK, 1); g.fillRect(v.x - 6, cy - 4, 12, 8);
    g.fillStyle(BRASS_LIT, 1); g.fillRect(v.x - 6, cy - 4, 12, 2);
    g.fillStyle(dim(BRASS, 0.5), 1); g.fillRect(v.x + 6, cy - 1, 7, 2); g.fillCircle(v.x + 13, cy, 1.6);
  } else {
    g.fillStyle(BRASS_DARK, 1);
    g.fillRect(v.x - 10, cy - 4, 5, 8); g.fillRect(v.x + 5, cy - 4, 5, 8);
    for (let i = 0; i < 4; i++) {
      const a = time / 90 + i * 1.7;
      g.fillStyle(i % 2 ? 0x7ec4ee : BRASS_LIT, 0.9);
      g.fillCircle(v.x + Math.cos(a) * 12, cy + Math.sin(a) * 6, 1.5);
    }
    glow(g, v.x, cy, 18, 0x7ec4ee, 0.05, 3);
  }
}

export const FALLEN_PINNED: GimmickDef = {
  id: ID,
  rules: 'She drives a pin where you stand and four vanes gust down their lines to it. Strike a vane to spring its pin: it turns on her until she re-pins it.',
  make,
};
