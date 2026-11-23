import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, BRASS_DARK, BRASS_LIT, BUOY, BUOY_DARK, DRIFT, DRIFT_DARK, DRIFT_LIT, FOAM, LAMP, PAINT_CREAM, PILE,
  PILE_WET, SAND_LIT, SEA_DEEP, SEA_LIT, WEED, WETSAND_DARK,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * The Wrecker's Lantern — Lamp-Keeper Hesk (light).
 *
 * In the crown's telling the lighthouse keeper keeps two lights: the true one on the headland for
 * the Queen's ships, and a red storm-lantern on a pole for everyone else's — the wrecker's light
 * that walks a hull onto the bar. Wreckage is salvage, and salvage is tithe.
 *
 * The lantern hangs over one fighter at a time (it starts over you). Every few seconds a ghost of
 * a ship comes in off the sea, steering for wherever the lantern stood when it was sighted: a
 * clock-ring marks the spot while the hull glides in, then it runs aground there — a crushing
 * keel-strike to anyone under it. Land a hit on the other fighter and the lantern is theirs.
 * The bearer's blows land harder in its light, so holding it is tempting.
 *
 * The wrecks stay where they ground for a while: broken hulls that nobody can walk through and
 * that stop shots dead. Below half the lighthouse answers and the ships come in pairs, the
 * second steering for where the bearer is going.
 *
 * Hesk is slow to leave his own light. Hand him the lantern just as a ship is sighted and he
 * will stand there admiring the glow a beat too long.
 */

const IMPACT_R = 82;
const WARN_MS = 1700;
const WRECK_R = 40;
const WRECK_MS = 11000;
const IMPACT_DMG = 20;
const PASS_CD_MS = 900;
const BEAR_MULT = 1.2;

/** A ship on its way in: sighted at `from`, it grounds at `at` when the warning runs out. */
interface Ship { from: Pt; at: Pt; ang: number; sighted: number; landed: boolean }
/** A grounded hulk, lying where it struck until the sand takes it. */
interface Wreck { x: number; y: number; ang: number; born: number }

/** A ship's hull from above — keel along `ang`, bow forward — intact or broken open on the bar. */
function hull(g: G, x: number, y: number, ang: number, len: number, alpha: number, broken: boolean): void {
  const w = len * 0.36;
  const c = Math.cos(ang), s = Math.sin(ang);
  const P = (u: number, v: number): Pt => ({ x: x + u * c - v * s, y: y + u * s + v * c });
  const poly = (pts: Pt[], col: number, a: number): void => {
    g.fillStyle(col, a); g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
    g.closePath(); g.fillPath();
  };
  const outer = [P(len / 2, 0), P(len * 0.22, -w / 2), P(-len / 2, -w * 0.4), P(-len / 2, w * 0.4), P(len * 0.22, w / 2)];
  const inner = [P(len * 0.42, 0), P(len * 0.2, -w * 0.38), P(-len * 0.44, -w * 0.3), P(-len * 0.44, w * 0.3), P(len * 0.2, w * 0.38)];
  poly(outer, PILE_WET, alpha);
  poly(inner, broken ? DRIFT_DARK : DRIFT, alpha);
  // Deck planks running fore and aft.
  for (const v of [-0.22, -0.08, 0.08, 0.22]) {
    const a = P(len * 0.3, v * w), b = P(-len * 0.42, v * w);
    g.lineStyle(1, broken ? PILE : DRIFT_LIT, alpha * 0.7); g.lineBetween(a.x, a.y, b.x, b.y);
  }
  if (broken) {
    // Stove in amidships: dark hole, bare ribs across it, splintered ends.
    const hole = [P(len * 0.1, -w * 0.3), P(-len * 0.24, -w * 0.32), P(-len * 0.28, w * 0.26), P(len * 0.04, w * 0.3)];
    poly(hole, 0x14110e, alpha);
    for (let k = 0; k < 5; k++) {
      const u = len * 0.08 - k * len * 0.08;
      const a = P(u, -w * 0.36), b = P(u, w * 0.36), m = P(u + len * 0.03, 0);
      g.lineStyle(3, DRIFT_LIT, alpha); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(m.x, m.y); g.lineTo(b.x, b.y); g.strokePath();
    }
    for (let k = 0; k < 4; k++) {
      const a = P(len * (0.12 - k * 0.1), w * 0.5), b = P(len * (0.16 - k * 0.1), w * 0.72);
      g.lineStyle(2, DRIFT, alpha); g.lineBetween(a.x, a.y, b.x, b.y);
    }
    const wd = P(-len * 0.4, w * 0.32);
    g.fillStyle(WEED, alpha * 0.8); g.fillEllipse(wd.x, wd.y, 18, 6);
  } else {
    // Mast and a torn grey sail bellied over the deck.
    const m = P(len * 0.05, 0), sl = P(len * 0.05, -w * 0.9), sr = P(len * 0.05, w * 0.9), sb = P(-len * 0.12, 0);
    g.fillStyle(PAINT_CREAM, alpha * 0.55); g.beginPath(); g.moveTo(sl.x, sl.y); g.lineTo(sb.x, sb.y); g.lineTo(sr.x, sr.y); g.closePath(); g.fillPath();
    g.lineStyle(2, PILE, alpha); g.lineBetween(sl.x, sl.y, sr.x, sr.y);
    g.fillStyle(PILE, alpha); g.fillCircle(m.x, m.y, 4);
    const bow = P(len / 2 + 6, 0), bl = P(len * 0.3, -w * 0.7), br = P(len * 0.3, w * 0.7);
    g.lineStyle(3, FOAM, alpha * 0.8); g.beginPath(); g.moveTo(bl.x, bl.y); g.lineTo(bow.x, bow.y); g.lineTo(br.x, br.y); g.strokePath();
  }
}

/** The red storm-lantern: hood, ring, caged glass and a flame that gutters. */
function lantern(g: G, x: number, y: number, time: number): void {
  const fl = Math.sin(time / 70) * 0.5 + Math.sin(time / 131) * 0.5;
  g.fillStyle(BUOY, 0.1); g.fillCircle(x, y + 2, 26 + fl * 2);
  g.fillStyle(BUOY, 0.16); g.fillCircle(x, y + 2, 16);
  g.lineStyle(1.5, BRASS_DARK, 1); g.strokeCircle(x, y - 17, 4);
  g.fillStyle(BRASS_DARK, 1); g.fillTriangle(x - 9, y - 9, x + 9, y - 9, x, y - 15);
  g.fillStyle(BUOY_DARK, 1); g.fillRect(x - 7, y - 9, 14, 18);
  g.fillStyle(BUOY, 0.85); g.fillRect(x - 5.5, y - 8, 11, 16);
  g.fillStyle(LAMP, 0.95); g.fillEllipse(x, y + 1 - fl, 5, 9 + fl * 2);
  g.fillStyle(0xffffff, 0.9); g.fillEllipse(x, y + 2 - fl, 2, 4);
  g.lineStyle(1.2, BRASS, 1);
  g.lineBetween(x - 3, y - 8, x - 3, y + 8); g.lineBetween(x + 3, y - 8, x + 3, y + 8);
  g.fillStyle(BRASS, 1); g.fillRect(x - 8, y + 8, 16, 3);
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  let bearer: Fighter = player;
  let passReady = 0;
  let ships: Ship[] = [];
  let wrecks: Wreck[] = [];
  let started = false;
  let nextShip = 0;
  let selfHit = false;
  let answered = false;

  const other = (f: Fighter): Fighter => (f === player ? npc : player);

  function hurt(f: Fighter, amount: number): void {
    selfHit = true;
    if (f === player) tk.hitPlayer(amount, f.x, f.y); else ctx.hit(f, amount, f.x, f.y);
    selfHit = false;
  }

  function pass(to: Fighter): void {
    const time = ctx.scene.time.now;
    if (selfHit || bearer === to || time < passReady) return;
    bearer = to;
    passReady = time + PASS_CD_MS;
    ctx.sfx('whoosh');
    ctx.flash(to.x, to.y - 50, BUOY);
  }

  /** Sight a ship for `at`, coming in off the nearest sea edge (west, east or south). */
  function sight(at: Pt, time: number): void {
    const p = { x: clamp(at.x, 60, W - 60), y: clamp(at.y, top + 60, H - 50) };
    const edges: Pt[] = [{ x: -60, y: p.y }, { x: W + 60, y: p.y }, { x: p.x, y: H + 60 }];
    const from = edges.reduce((b, e) => (dist(e.x, e.y, p.x, p.y) < dist(b.x, b.y, p.x, p.y) ? e : b));
    ships.push({ from, at: p, ang: Math.atan2(p.y - from.y, p.x - from.x), sighted: time, landed: false });
    ctx.sfx('beam-charge');
  }

  function ground(s: Ship, time: number): void {
    s.landed = true;
    tk.boom(s.at.x, s.at.y, IMPACT_R, DRIFT_DARK);
    ctx.sfx('explosion-medium');
    ctx.sfx('splash');
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const d = dist(f.x, f.y, s.at.x, s.at.y);
      if (d > IMPACT_R + 18) continue;
      hurt(f, IMPACT_DMG);
      ctx.nudge(f, ((f.x - s.at.x) / (d || 1)) * 40, ((f.y - s.at.y) / (d || 1)) * 40);
    }
    wrecks.push({ x: s.at.x, y: s.at.y, ang: s.ang + (ctx.rng() - 0.5) * 0.6, born: time });
    if (wrecks.length > 3) wrecks.shift();
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; nextShip = time + 4500; }
      if (!answered && npc.hp < npc.maxHp * 0.55) {
        answered = true;
        ctx.banner('THE LIGHTHOUSE ANSWERS — they come in pairs', '#ffe3a0');
        ctx.sfx('light-beam');
      }
      if (time >= nextShip) {
        nextShip = time + (answered ? 5600 : 6500);
        sight({ x: bearer.x, y: bearer.y }, time);
        if (answered) {
          tk.schedule(900, () => {
            const b = bearer;
            const a = ctx.facing(b);
            sight({ x: b.x + Math.cos(a) * 110, y: b.y + Math.sin(a) * 110 }, ctx.scene.time.now);
          });
        }
      }
      for (const s of ships) if (!s.landed && time >= s.sighted + WARN_MS) ground(s, time);
      ships = ships.filter((s) => !s.landed || time < s.sighted + WARN_MS + 400);
      wrecks = wrecks.filter((w) => time < w.born + WRECK_MS);
      // Wrecks are solid and stop shots.
      for (const w of wrecks) {
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(f.x, f.y, w.x, w.y);
          if (d < WRECK_R + 14) ctx.nudge(f, ((f.x - w.x) / (d || 1)) * (WRECK_R + 14 - d), ((f.y - w.y) / (d || 1)) * (WRECK_R + 14 - d));
        }
        for (const sh of ctx.shotsNear(w.x, w.y, WRECK_R + 4)) sh.block();
      }
    },

    onNpcHurt() { if (bearer === player) pass(npc); },
    onPlayerHurt() { if (bearer === npc) pass(player); },
    npcTakenMult: () => (bearer === player ? BEAR_MULT : 1),
    playerTakenMult: () => (bearer === npc ? BEAR_MULT : 1),

    npcSeek() {
      const time = ctx.scene.time.now;
      // Clear of a grounding — but only once the hull is well in. He likes the light.
      for (const s of ships) {
        if (s.landed || time - s.sighted < 520) continue;
        const d = dist(npc.x, npc.y, s.at.x, s.at.y);
        if (d < IMPACT_R + 50) {
          const a = d > 4 ? Math.atan2(npc.y - s.at.y, npc.x - s.at.x) : Math.atan2(player.y - s.at.y, player.x - s.at.x);
          return { x: clamp(s.at.x + Math.cos(a) * (IMPACT_R + 80), 60, W - 60), y: clamp(s.at.y + Math.sin(a) * (IMPACT_R + 80), top + 60, H - 50) };
        }
      }
      // Lantern on Hesk: he wants it off him, so he closes in to land a blow.
      if (bearer === npc && alive(player)) return { x: player.x, y: player.y };
      // Lantern on you: keep a wreck between you and him if one stands.
      const w = wrecks.find((k) => dist(k.x, k.y, npc.x, npc.y) < 260);
      if (w) {
        const a = Math.atan2(w.y - player.y, w.x - player.x);
        return { x: clamp(w.x + Math.cos(a) * 70, 60, W - 60), y: clamp(w.y + Math.sin(a) * 70, top + 60, H - 50) };
      }
      return null;
    },

    drawGround(g, time) {
      // The false light's pool on the sand round the bearer: red, rayed, guttering.
      if (alive(bearer)) {
        const fl = Math.sin(time / 90) * 4;
        g.fillStyle(BUOY, 0.07); g.fillEllipse(bearer.x, bearer.y + 10, 190 + fl, 90 + fl);
        g.fillStyle(BUOY, 0.08); g.fillEllipse(bearer.x, bearer.y + 10, 110, 52);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + time / 3000;
          g.lineStyle(2, BUOY, 0.1);
          g.lineBetween(bearer.x + Math.cos(a) * 30, bearer.y + 10 + Math.sin(a) * 14, bearer.x + Math.cos(a) * 100, bearer.y + 10 + Math.sin(a) * 46);
        }
      }
      // Each sighting: a clock-ring where it will ground, and the ghost-wake running in to it.
      for (const s of ships) {
        if (s.landed) {
          const k = clamp((time - s.sighted - WARN_MS) / 400, 0, 1);
          g.fillStyle(SAND_LIT, 0.5 * (1 - k)); g.fillCircle(s.at.x, s.at.y, IMPACT_R * (0.8 + k * 0.4));
          continue;
        }
        const k = clamp((time - s.sighted) / WARN_MS, 0, 1);
        g.fillStyle(WETSAND_DARK, 0.25); g.fillCircle(s.at.x, s.at.y, IMPACT_R);
        g.fillStyle(BUOY, 0.18); g.beginPath(); g.slice(s.at.x, s.at.y, IMPACT_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.fillPath();
        g.lineStyle(2.5, BUOY, 0.7 + k * 0.3); g.strokeCircle(s.at.x, s.at.y, IMPACT_R);
        g.lineStyle(1.5, FOAM, 0.35); g.strokeCircle(s.at.x, s.at.y, IMPACT_R - 8);
        const hx = s.from.x + (s.at.x - s.from.x) * k, hy = s.from.y + (s.at.y - s.from.y) * k;
        for (let i = 1; i <= 7; i++) {
          const t = Math.max(0, k - i * 0.05);
          const wx = s.from.x + (s.at.x - s.from.x) * t, wy = s.from.y + (s.at.y - s.from.y) * t;
          const sp = 10 + i * 5;
          g.fillStyle(FOAM, 0.4 - i * 0.04);
          g.fillEllipse(wx - Math.sin(s.ang) * sp, wy + Math.cos(s.ang) * sp, 10, 4);
          g.fillEllipse(wx + Math.sin(s.ang) * sp, wy - Math.cos(s.ang) * sp, 10, 4);
        }
        g.fillStyle(SEA_DEEP, 0.3); g.fillEllipse(hx, hy + 8, 90, 34);
      }
      // Wrecks lie in scoured sand.
      for (const w of wrecks) {
        const fade = clamp((w.born + WRECK_MS - time) / 1000, 0, 1);
        g.fillStyle(WETSAND_DARK, 0.5 * fade); g.fillEllipse(w.x, w.y + 6, 130, 70);
        g.fillStyle(SEA_LIT, 0.25 * fade); g.fillEllipse(w.x + 30, w.y + 22, 40, 8);
      }
    },

    drawAir(g, time) {
      for (const w of wrecks) {
        const fade = clamp((w.born + WRECK_MS - time) / 1000, 0, 1);
        hull(g, w.x, w.y, w.ang, 110, fade, true);
      }
      for (const s of ships) {
        if (s.landed) continue;
        const k = clamp((time - s.sighted) / WARN_MS, 0, 1);
        const hx = s.from.x + (s.at.x - s.from.x) * k, hy = s.from.y + (s.at.y - s.from.y) * k;
        hull(g, hx, hy - 6 + Math.sin(time / 160) * 2, s.ang, 110, 0.35 + k * 0.5, false);
      }
      if (alive(bearer)) {
        const sway = Math.sin(time / 300) * 3;
        g.lineStyle(2, PILE, 1); g.lineBetween(bearer.x + 14, bearer.y - 30, bearer.x + 6 + sway, bearer.y - 66);
        g.lineBetween(bearer.x + 6 + sway, bearer.y - 66, bearer.x - 4 + sway, bearer.y - 66);
        lantern(g, bearer.x - 4 + sway, bearer.y - 48, time);
      }
    },

    drawHud(g, time) {
      // Who bears the light: a small lantern hangs over your side or Hesk's.
      const x = W / 2, y = top + 22;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 64, y - 18, 128, 34, 8);
      g.fillStyle(SEA_LIT, 1); g.fillCircle(x - 42, y + 6, 6);
      g.fillStyle(BUOY_DARK, 1); g.fillCircle(x + 42, y + 6, 6);
      lantern(g, bearer === player ? x - 42 : x + 42, y - 4, time);
      // The next sighting: a wake-line filling between them.
      const k = clamp(1 - (nextShip - time) / (answered ? 5600 : 6500), 0, 1);
      g.lineStyle(3, DRIFT_DARK, 1); g.lineBetween(x - 22, y + 8, x + 22, y + 8);
      g.lineStyle(3, k > 0.8 ? BRASS_LIT : BRASS, 1); g.lineBetween(x - 22, y + 8, x - 22 + 44 * k, y + 8);
      g.fillStyle(PILE_WET, 1); g.fillTriangle(x - 22 + 44 * k + 6, y + 2, x - 22 + 44 * k - 6, y - 2, x - 22 + 44 * k - 6, y + 6);
    },

    destroy() {
      ships = [];
      wrecks = [];
    },
  };
}

export const FALLEN_WRECKERS_LANTERN: GimmickDef = {
  id: fallenId('tidewater', 'wreckers-lantern'),
  rules: 'Ships steer for the lantern and run aground where it stood. Land a hit to pass the lantern on. Its bearer hits harder; the wrecks stop shots.',
  make,
};
