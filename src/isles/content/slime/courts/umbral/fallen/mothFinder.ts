import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { BARK, BARK_DARK, BARK_LIT, CANDLE, CANDLE_LIT, FUNGUS, FUNGUS_DARK, HEART_DARK, IRON, IRON_LIT } from '../palette';
import { alive, clamp, dist } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Moth-Finder — Candle-Finder Corriwen Drave. A yellow flame is contraband in Umbral, and in the
 * King's telling Drave was the man who found them: he let a jar of night-moths loose in a house and
 * followed them to whatever knot-hole the family had hidden its candle in.
 *
 * Five candle-boxes are set in stumps about the yard, each a niche with a shutter. An open box leaks
 * a ring of warm light on the moss. **Drave's moth-cloud flies to the nearest open candle** and
 * settles on it (it gathers tight first — the warning): while it feeds, everyone in that candle's
 * light is swarmed, stung and slowed. When it has fed it smothers the flame and lifts for the next.
 * If every box is dark too long, the box nearest you is opened for him.
 *
 * **Strike a box to throw its shutter** — open or shut. Shut the one the moths are making for and
 * they turn away; open the one by Drave and they come down on him. Past half he uncorks a second jar.
 */

const ID = fallenId('umbral', 'moth-finder');
const LIGHT_R = 88;
const BOX_R = 24;
const FLY = 115;
const SETTLE_MS = 950;
const FEED_MS = 3000;
const TICK_MS = 500;
const DARK_MS = 2600;
const MOTHS = 34;

interface Box { x: number; y: number; open: boolean; target: StrikeTarget | null; struckAt: number; seed: number }
interface Swarm { x: number; y: number; to: number; landAt: number; feedUntil: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const boxes: Box[] = [
    [W * 0.2, top + 120], [W * 0.8, top + 120], [W * 0.5, (top + H) / 2 + 20], [W * 0.2, H - 80], [W * 0.8, H - 80],
  ].map(([x, y], i) => ({ x, y, open: i === 1 || i === 3, target: null, struckAt: -1e9, seed: i * 1.9 }));
  const swarms: Swarm[] = [];
  const nextTick = new Map<Fighter, number>();
  let started = false;
  let late = false;
  let darkSince = -1;

  const inLight = (f: Fighter, b: Box) => alive(f) && dist(f.x, f.y, b.x, b.y) < LIGHT_R;
  const feeding = (s: Swarm, t: number) => s.to >= 0 && s.landAt > 0 && t >= s.landAt && t < s.feedUntil;
  const settling = (s: Swarm, t: number) => s.to >= 0 && s.landAt > 0 && t < s.landAt;

  /** The nearest open candle no other swarm has claimed, or -1. */
  function pick(s: Swarm): number {
    let bi = -1, bd = 1e9;
    boxes.forEach((b, i) => {
      if (!b.open || swarms.some((o) => o !== s && o.to === i)) return;
      const d = dist(s.x, s.y, b.x, b.y);
      if (d < bd) { bd = d; bi = i; }
    });
    return bi;
  }

  function lift(s: Swarm): void { s.to = -1; s.landAt = 0; s.feedUntil = 0; }

  function sting(f: Fighter, time: number): void {
    if ((nextTick.get(f) ?? 0) > time) return;
    nextTick.set(f, time + TICK_MS);
    if (f === player) { tk.hitPlayer(7, f.x, f.y); tk.slowPlayer(0.7, 600); }
    else ctx.hit(npc, 9, f.x, f.y);
    ctx.sfx('drone-buzz');
  }

  return {
    update(time, dtRaw) {
      const dt = Math.min(dtRaw, 0.1);
      if (!started) {
        started = true;
        swarms.push({ x: W / 2, y: top + 40, to: -1, landAt: 0, feedUntil: 0, seed: 0 });
        boxes.forEach((b) => {
          b.target = ctx.target({
            x: b.x, y: b.y - 18, r: BOX_R,
            onStruck: () => {
              const t = tk.now;
              if (t - b.struckAt < 400) return;
              b.struckAt = t;
              b.open = !b.open;
              ctx.sfx(b.open ? 'sparkle' : 'snap-back');
              // Shut under the moths: they lift and look for another light.
              if (!b.open) for (const s of swarms) if (s.to === boxes.indexOf(b)) lift(s);
            },
          });
        });
      }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        swarms.push({ x: npc.x, y: npc.y - 30, to: -1, landAt: 0, feedUntil: 0, seed: 3.1 });
        ctx.banner('A SECOND JAR OF MOTHS', '#ffd27a');
        ctx.sfx('drone-buzz');
      }
      // Every box dark too long: the one nearest you is opened for him.
      if (boxes.every((b) => !b.open)) {
        if (darkSince < 0) darkSince = time;
        else if (time - darkSince > DARK_MS && alive(player)) {
          let bi = 0;
          boxes.forEach((b, i) => { if (dist(player.x, player.y, b.x, b.y) < dist(player.x, player.y, boxes[bi].x, boxes[bi].y)) bi = i; });
          boxes[bi].open = true; boxes[bi].struckAt = time;
          ctx.sfx('sparkle');
          darkSince = -1;
        }
      } else darkSince = -1;

      for (const s of swarms) {
        if (s.to >= 0 && !boxes[s.to].open) lift(s);
        if (s.to < 0) s.to = pick(s);
        if (s.to < 0) {
          // Nothing lit: the cloud drifts over Drave's head, waiting.
          s.x += (npc.x - s.x) * Math.min(1, dt * 0.8); s.y += (npc.y - 60 - s.y) * Math.min(1, dt * 0.8);
          continue;
        }
        const b = boxes[s.to];
        if (s.landAt === 0) {
          const d = Math.max(1, dist(s.x, s.y, b.x, b.y - 20));
          const step = Math.min(d, FLY * dt);
          s.x += ((b.x - s.x) / d) * step; s.y += ((b.y - 20 - s.y) / d) * step;
          if (d < 10) { s.landAt = time + tk.warn(SETTLE_MS); s.feedUntil = s.landAt + FEED_MS; ctx.sfx('status-debuff'); }
        } else if (feeding(s, time)) {
          for (const f of [player, npc]) if (inLight(f, b)) sting(f, time);
        } else if (time >= s.feedUntil) {
          // Fed: the flame is smothered, and the cloud lifts.
          b.open = false;
          ctx.sfx('hush');
          lift(s);
        }
      }
    },

    npcSpeedMult() {
      const t = tk.now;
      return swarms.some((s) => feeding(s, t) && inLight(npc, boxes[s.to])) ? 0.7 : 1;
    },

    npcSeek() {
      const t = tk.now;
      // Out of any light the moths are coming down on.
      for (const s of swarms) {
        if (s.to < 0) continue;
        const b = boxes[s.to];
        if ((feeding(s, t) || settling(s, t) || dist(s.x, s.y, b.x, b.y) < 160) && dist(npc.x, npc.y, b.x, b.y) < LIGHT_R + 30) {
          const a = Math.atan2(npc.y - b.y, npc.x - b.x);
          return { x: tk.clampX(b.x + Math.cos(a) * (LIGHT_R + 70)), y: tk.clampY(b.y + Math.sin(a) * (LIGHT_R + 70)) };
        }
      }
      // Otherwise go and open the dark box nearest you, from its far side.
      let best: Box | null = null;
      for (const b of boxes) if (!b.open && (!best || dist(player.x, player.y, b.x, b.y) < dist(player.x, player.y, best.x, best.y))) best = b;
      if (!best || dist(player.x, player.y, best.x, best.y) > 200) return null;
      const a = Math.atan2(best.y - player.y, best.x - player.x);
      return { x: tk.clampX(best.x + Math.cos(a) * 40), y: tk.clampY(best.y + Math.sin(a) * 40) };
    },

    drawGround(g, time) {
      for (const b of boxes) {
        if (!b.open) continue;
        const claimed = swarms.find((s) => s.to === boxes.indexOf(b));
        const hot = claimed && (feeding(claimed, time) || settling(claimed, time));
        const flick = 1 + Math.sin(time / 90 + b.seed) * 0.04;
        for (let k = 4; k >= 1; k--) { g.fillStyle(CANDLE, 0.035 + (hot ? 0.02 : 0)); g.fillEllipse(b.x, b.y, LIGHT_R * 2 * (k / 4) * flick, LIGHT_R * 1.3 * (k / 4) * flick); }
        g.lineStyle(hot ? 2.5 : 1.5, hot ? CANDLE_LIT : CANDLE, hot ? 0.75 : 0.35);
        g.strokeEllipse(b.x, b.y, LIGHT_R * 2, LIGHT_R * 1.3);
        if (claimed && settling(claimed, time)) {
          const k = clamp(1 - (claimed.landAt - time) / tk.warn(SETTLE_MS), 0, 1);
          g.fillStyle(CANDLE_LIT, 0.06 + 0.1 * k); g.fillEllipse(b.x, b.y, LIGHT_R * 2 * k, LIGHT_R * 1.3 * k);
        }
      }
    },

    drawAir(g, time) {
      for (const b of boxes) drawBox(g, b, time);
      for (const s of swarms) drawSwarm(g, s, s.to >= 0 ? boxes[s.to] : null, feeding(s, time), settling(s, time), time);
    },

    drawHud(g, time) {
      // Five little candle-niches: lit or dark, and a moth over the one each cloud is making for.
      const x0 = W / 2 - 52, y = top + 16;
      g.fillStyle(0x000000, 0.55); g.fillRoundedRect(x0 - 14, y - 13, 132, 26, 6);
      boxes.forEach((b, i) => {
        const x = x0 + i * 26;
        g.fillStyle(BARK, 1); g.fillRoundedRect(x - 7, y - 8, 14, 16, 3);
        g.fillStyle(b.open ? CANDLE : 0x000000, 1); g.fillRect(x - 4, y - 5, 8, 10);
        if (b.open) { g.fillStyle(CANDLE_LIT, 1); g.fillTriangle(x - 1.5, y + 1, x + 1.5, y + 1, x, y - 4); }
        if (swarms.some((s) => s.to === i)) {
          const fl = Math.sin(time / 50) * 2;
          g.fillStyle(FUNGUS, 1); g.fillTriangle(x, y - 11, x - 5, y - 13 - fl, x - 4, y - 8); g.fillTriangle(x, y - 11, x + 5, y - 13 - fl, x + 4, y - 8);
        }
      });
    },

    destroy() { for (const b of boxes) { b.target?.remove(); b.target = null; } },
  };
}

/** A candle-box: a stump hollowed to a niche, an iron-hinged shutter, and — when open — the forbidden flame. */
function drawBox(g: G, b: Box, time: number): void {
  const { x, y } = b;
  shadow(g, x, y + 3, 50, 12, 0.4);
  g.fillStyle(BARK_DARK, 1); g.fillEllipse(x, y, 46, 16);
  g.fillStyle(BARK, 1); g.fillRect(x - 20, y - 40, 40, 40);
  g.fillStyle(BARK_LIT, 1); g.fillEllipse(x, y - 40, 40, 12);
  g.fillStyle(FUNGUS_DARK, 1); g.fillEllipse(x, y - 40, 30, 8);
  for (let i = 0; i < 3; i++) { g.lineStyle(1, BARK_DARK, 0.8); g.strokeEllipse(x, y - 40, 10 + i * 7, 3 + i * 2); }
  for (let i = -2; i <= 2; i++) { g.lineStyle(1, BARK_DARK, 0.6); g.lineBetween(x + i * 8, y - 36, x + i * 8 + 2, y - 4); }
  // A shelf-fungus on the bark.
  g.fillStyle(FUNGUS, 1); g.fillEllipse(x + 16, y - 14, 12, 5);
  // The niche.
  g.fillStyle(HEART_DARK, 1); g.fillRoundedRect(x - 10, y - 32, 20, 22, 4);
  if (b.open) {
    glow(g, x, y - 24, 26, CANDLE, 0.07, 3);
    g.fillStyle(lit(FUNGUS, 0.3), 1); g.fillRect(x - 3, y - 22, 6, 10);
    const f = 1 + Math.sin(time / 70 + b.seed) * 0.15;
    g.fillStyle(CANDLE, 1); g.fillTriangle(x - 3 * f, y - 22, x + 3 * f, y - 22, x + Math.sin(time / 90) * 1.2, y - 31 * f + 2);
    g.fillStyle(CANDLE_LIT, 1); g.fillTriangle(x - 1.4, y - 22, x + 1.4, y - 22, x, y - 27);
    // The shutter swung back on its hinge.
    g.fillStyle(dim(BARK, 0.2), 1); g.fillRect(x - 24, y - 32, 12, 22);
    g.lineStyle(1, IRON_LIT, 1); g.strokeRect(x - 24, y - 32, 12, 22);
  } else {
    g.fillStyle(dim(BARK, 0.15), 1); g.fillRoundedRect(x - 11, y - 33, 22, 24, 3);
    g.lineStyle(1, BARK_DARK, 1); g.lineBetween(x, y - 32, x, y - 10);
    // A crack of yellow round the shutter: the candle is still in there.
    g.lineStyle(1, CANDLE, 0.25 + Math.sin(time / 400 + b.seed) * 0.1); g.strokeRoundedRect(x - 11, y - 33, 22, 24, 3);
  }
  g.fillStyle(IRON, 1); g.fillRect(x - 12, y - 29, 3, 3); g.fillRect(x - 12, y - 15, 3, 3);
  if (time - b.struckAt < 300) { g.lineStyle(2, CANDLE_LIT, 1 - (time - b.struckAt) / 300); g.strokeCircle(x, y - 22, 26); }
}

/** The moth-cloud: pale wings with eye-spots, loose in flight, drawn tight as it settles, whirling as it feeds. */
function drawSwarm(g: G, s: Swarm, b: Box | null, feed: boolean, settle: boolean, time: number): void {
  const cx = feed && b ? b.x : s.x, cy = feed && b ? b.y - 20 : s.y;
  const spread = feed ? LIGHT_R * 0.9 : settle ? 22 : 40;
  for (let i = 0; i < MOTHS; i++) {
    const ph = i * 2.399 + s.seed;
    const sp = feed ? 2.4 : 1 + (i % 5) * 0.2;
    const a = ph + (time / 1000) * sp * (i % 2 ? 1 : -1);
    const r = spread * (0.35 + 0.65 * ((i * 0.618) % 1));
    const mx = cx + Math.cos(a) * r, my = cy + Math.sin(a) * r * 0.6 + Math.sin(time / 130 + i) * 3;
    const fl = Math.abs(Math.sin(time / 35 + i * 1.3));
    const w = 4 + fl * 2;
    g.fillStyle(FUNGUS, 0.9);
    g.fillTriangle(mx, my, mx - w, my - 3 - fl * 2, mx - w + 1, my + 2);
    g.fillTriangle(mx, my, mx + w, my - 3 - fl * 2, mx + w - 1, my + 2);
    g.fillStyle(FUNGUS_DARK, 1); g.fillRect(mx - 0.6, my - 2, 1.2, 4);
    g.fillStyle(0x000000, 0.8); g.fillCircle(mx - w * 0.6, my - 1, 0.8); g.fillCircle(mx + w * 0.6, my - 1, 0.8);
  }
  if (!feed) { g.fillStyle(0x000000, 0.18); g.fillEllipse(s.x, s.y + 60, spread * 1.6, spread * 0.4); }
}

export const FALLEN_MOTH_FINDER: GimmickDef = {
  id: ID,
  rules: 'Moths fly to the nearest open candle and sting all in its light, then smother it. Strike a candle-box to open or shut it: bring them down on Drave.',
  make,
};
