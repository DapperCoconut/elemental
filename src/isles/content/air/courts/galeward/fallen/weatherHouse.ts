import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CLOUD_DEEP, CLOUD_SHADE, KITE_BLUE, KITE_RED, LIME, LIME_SHADE, SLATE, SLATE_DARK, SLATE_LIT,
  TIMBER, TIMBER_DARK, TIMBER_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Out Comes the Foul Man — Mother Hygrove, Keeper of the Weather House.
 *
 * Prince Zephyr's house is named for the toy on its mantel: a little weather-house where a gut
 * string twists with the damp and turns a carved Fair Maid out of one door and a Foul Man out of
 * the other. In the star's telling Mother Hygrove kept it, and read it to the town every morning —
 * and on a Foul Man day every breath on the meters was billed at double, because she said so.
 *
 * The weather-house stands huge at the north wall, and its two figures ride brass rails down into
 * the yard and back. The Foul Man carries a squall: under his cloud the rain stings and drags. The
 * Fair Maid carries her sun: in its light you mend. Every few seconds the gut creaks (the turntable
 * shivers first) and the figures change places — the storm lands where the sun was, with a crack
 * of thunder on whoever is under it. Bask, then step out before the turn.
 *
 * The exploit is the turntable: strike the house and it turns at once. Wait until she is mending in
 * the Maid's light, then turn the Foul Man onto her. Halfway down the gut is soaked — the turns
 * come quicker and the Man leaves standing rain on the boards where he was.
 */

const ID = fallenId('galeward', 'weather-house');
const RAIL_V = 120;
const STORM_R = 92;
const SUN_R = 78;
const TICK_MS = 500;
const TURN_EVERY = 6200;
const TURN_EVERY_WET = 4200;
const TURN_WARN = 1150;
const STRUCK_WARN = 350;
const TURN_COOL = 1800;
const PUDDLE_MS = 4200;
const PUDDLE_R = 60;

interface Figure { foul: boolean; rail: number; y: number; dir: 1 | -1 }
interface Puddle { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const rails = [W * 0.3, W * 0.7];
  const y0 = top + 120, y1 = H - 60;
  const house: Pt = { x: W / 2, y: top + 92 };
  const man: Figure = { foul: true, rail: 0, y: y0 + 60, dir: 1 };
  const maid: Figure = { foul: false, rail: 1, y: y1 - 80, dir: -1 };
  const puddles: Puddle[] = [];
  const lastTick = new Map<Fighter, number>();
  let turnAt = 0, warnAt = -1, turnedAt = -1e9, struckAt = -1e9, started = false, wet = false;

  const pos = (f: Figure): Pt => ({ x: rails[f.rail], y: f.y });
  const inStorm = (x: number, y: number) => { const p = pos(man); return dist(x, y, p.x, p.y) < STORM_R; };
  const inSun = (x: number, y: number) => { const p = pos(maid); return dist(x, y, p.x, p.y) < SUN_R; };
  const inPuddle = (f: Fighter) => puddles.some((p) => dist(f.x, f.y, p.x, p.y) < PUDDLE_R);

  const table: StrikeTarget = ctx.target({
    x: house.x, y: house.y - 30, r: 34,
    onStruck() {
      if (tk.now - struckAt < TURN_COOL) return;
      struckAt = tk.now;
      warnAt = tk.now; turnAt = tk.now + STRUCK_WARN;
      ctx.sfx('gear-turn');
    },
  });

  function turn(time: number): void {
    if (wet) puddles.push({ ...pos(man), at: time });
    const r = man.rail; man.rail = maid.rail; maid.rail = r;
    const y = man.y; man.y = maid.y; maid.y = y;
    turnedAt = time; warnAt = -1;
    turnAt = time + (wet ? TURN_EVERY_WET : TURN_EVERY);
    ctx.sfx('thunder');
    const p = pos(man);
    for (const f of [player, npc]) {
      if (!alive(f) || dist(f.x, f.y, p.x, p.y) > STORM_R) continue;
      if (f === player) tk.hitPlayer(11, f.x, f.y); else ctx.hit(npc, 16, f.x, f.y);
      ctx.flash(f.x, f.y - 30, 0xe8f4ff);
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; turnAt = time + TURN_EVERY; }
      if (!wet && npc.hp < npc.maxHp * 0.5) {
        wet = true; ctx.banner('THE GUT IS SOAKED', '#cde9fb'); ctx.sfx('rain');
        turnAt = Math.min(turnAt, time + TURN_EVERY_WET);
      }
      for (const f of [man, maid]) {
        f.y += f.dir * RAIL_V * dt;
        if (f.y > y1) { f.y = y1; f.dir = -1; }
        if (f.y < y0) { f.y = y0; f.dir = 1; }
      }
      if (warnAt < 0 && time >= turnAt - tk.warn(TURN_WARN)) { warnAt = time; ctx.sfx('clock-tick'); }
      if (time >= turnAt) turn(time);
      for (let i = puddles.length - 1; i >= 0; i--) if (time - puddles[i].at > PUDDLE_MS) puddles.splice(i, 1);

      // Rain stings and sun mends, each on its own half-second clock.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        if (time - (lastTick.get(f) ?? 0) < TICK_MS) continue;
        const storm = inStorm(f.x, f.y), sun = inSun(f.x, f.y);
        if (!storm && !sun) continue;
        lastTick.set(f, time);
        if (storm) { if (f === player) tk.hitPlayer(4, f.x, f.y); else ctx.hit(npc, 5, f.x, f.y); }
        else ctx.heal(f, 3);
      }
    },

    playerSpeedMult: () => (inStorm(player.x, player.y) || inPuddle(player) ? 0.65 : 1),
    npcSpeedMult: () => (inStorm(npc.x, npc.y) || inPuddle(npc) ? 0.65 : 1),

    npcSeek(): Pt | null {
      if (!alive(npc)) return null;
      const t = tk.now;
      const m = pos(man), s = pos(maid);
      // The turn is coming: off the Maid's rail, where the storm will land.
      if (warnAt >= 0 && dist(npc.x, npc.y, s.x, s.y) < STORM_R + 30) {
        const side = npc.x < s.x ? -1 : 1;
        return { x: tk.clampX(s.x + side * (STORM_R + 60)), y: npc.y };
      }
      // Out from under the Foul Man.
      if (inStorm(npc.x, npc.y)) {
        const d = Math.max(1, dist(npc.x, npc.y, m.x, m.y));
        return { x: tk.clampX(m.x + ((npc.x - m.x) / d) * (STORM_R + 50)), y: tk.clampY(m.y + ((npc.y - m.y) / d) * (STORM_R + 50)) };
      }
      // You're basking: turn the house on you, if she is near enough to strike it.
      if (alive(player) && inSun(player.x, player.y) && t - struckAt > TURN_COOL && dist(npc.x, npc.y, house.x, house.y) < 240) {
        return { x: house.x, y: house.y + 50 };
      }
      // Otherwise mend in the Maid's light — on the far side of it from the Man.
      if (npc.hp < npc.maxHp * 0.9 && t - turnedAt > 600) return { x: s.x + (s.x < m.x ? -20 : 20), y: s.y };
      return null;
    },

    drawGround(g, time) {
      // Two brass rails running down from the house's doors, sleepers across them.
      for (const x of rails) {
        for (let y = y0 - 20; y < y1 + 20; y += 22) { g.fillStyle(TIMBER_DARK, 0.7); g.fillRect(x - 16, y, 32, 5); }
        g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 10, y0 - 30, 3, y1 - y0 + 60); g.fillRect(x + 7, y0 - 30, 3, y1 - y0 + 60);
        g.fillStyle(BRASS_LIT, 0.7); g.fillRect(x - 10, y0 - 30, 1, y1 - y0 + 60); g.fillRect(x + 7, y0 - 30, 1, y1 - y0 + 60);
        g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(x, y0 - 30, house.x + (x < house.x ? -40 : 40), house.y - 10);
      }
      for (const p of puddles) {
        const k = (time - p.at) / PUDDLE_MS;
        g.fillStyle(SLATE, 0.45 * (1 - k)); g.fillEllipse(p.x, p.y, PUDDLE_R * 2, PUDDLE_R * 1.1);
        g.lineStyle(1, SLATE_LIT, 0.5 * (1 - k)); g.strokeEllipse(p.x, p.y, PUDDLE_R * (1 + ((time / 700) % 1)), PUDDLE_R * 0.55 * (1 + ((time / 700) % 1)));
      }
      const m = pos(man), s = pos(maid);
      // The sun's warm disc on the boards, and the storm's dark wet one.
      glow(g, s.x, s.y, SUN_R, 0xffe08a, 0.08, 4);
      g.lineStyle(2, 0xffd060, 0.6); g.strokeCircle(s.x, s.y, SUN_R);
      g.fillStyle(SLATE_DARK, 0.3); g.fillCircle(m.x, m.y, STORM_R);
      g.lineStyle(2, SLATE_LIT, 0.6); g.strokeCircle(m.x, m.y, STORM_R);
      for (let i = 0; i < 10; i++) {
        const a = i * 0.63 + time / 900, r = ((time / 5 + i * 37) % STORM_R);
        g.lineStyle(1, SLATE_LIT, 0.5 * (1 - r / STORM_R)); g.strokeEllipse(m.x + Math.cos(a) * 30, m.y + Math.sin(a) * 20, r * 0.5, r * 0.25);
      }
      // The turn's warning: the storm's ring ghosted onto the other rail.
      if (warnAt >= 0) {
        const k = clamp((time - warnAt) / Math.max(1, turnAt - warnAt), 0, 1);
        g.lineStyle(3, 0xe8f4ff, 0.3 + k * 0.6); g.strokeCircle(s.x, s.y, STORM_R * (1.3 - k * 0.3));
        g.fillStyle(0xe8f4ff, 0.05 + k * 0.12); g.fillCircle(s.x, s.y, STORM_R);
      }
    },

    drawAir(g, time) {
      const warnK = warnAt >= 0 ? clamp((time - warnAt) / Math.max(1, turnAt - warnAt), 0, 1) : 0;
      drawHouse(g, house.x, house.y, warnK, man.rail === 0, time);
      const m = pos(man), s = pos(maid);
      drawMaid(g, s.x, s.y, time);
      drawMan(g, m.x, m.y, time);
      // His squall overhead, rain slanting east, and the bolt on a turn.
      drawSquall(g, m.x, m.y - 110, time);
      if (time - turnedAt < 220) {
        g.lineStyle(3, 0xffffff, 1 - (time - turnedAt) / 220);
        let x = m.x - 10, y = m.y - 110;
        for (let i = 0; i < 5; i++) { const nx = m.x + ((i * 53) % 30) - 15, ny = y + 22; g.lineBetween(x, y, nx, ny); x = nx; y = ny; }
      }
      // Her sun: a little gilded disc on a stalk over the parasol, rays turning.
      const sx = s.x + 18, sy = s.y - 100;
      glow(g, sx, sy, 34, 0xffe08a, 0.1, 3);
      for (let i = 0; i < 10; i++) {
        const a = i * 0.628 + time / 1500;
        g.lineStyle(2, 0xffd060, 0.9); g.lineBetween(sx + Math.cos(a) * 12, sy + Math.sin(a) * 12, sx + Math.cos(a) * 20, sy + Math.sin(a) * 20);
      }
      g.fillStyle(0xffd060, 1); g.fillCircle(sx, sy, 10); g.fillStyle(0xfff2b0, 1); g.fillCircle(sx - 3, sy - 3, 4);
    },

    drawHud(g, time) {
      // The house's own little dial: FAIR - FOUL, the needle swinging as the gut twists.
      const x = 70, y = top + 34;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 52, y - 24, 104, 40, 8);
      g.fillStyle(0xffd060, 1); g.slice(x, y + 8, 34, Math.PI, Math.PI * 1.5, false); g.fillPath();
      g.fillStyle(SLATE_LIT, 1); g.slice(x, y + 8, 34, Math.PI * 1.5, Math.PI * 2, false); g.fillPath();
      const k = warnAt >= 0 ? clamp((time - warnAt) / Math.max(1, turnAt - warnAt), 0, 1) : clamp(1 - (turnAt - time) / (wet ? TURN_EVERY_WET : TURN_EVERY), 0, 1);
      const a = Math.PI + Math.PI * (man.rail === 0 ? k : 1 - k);
      g.lineStyle(2, 0xffffff, 1); g.lineBetween(x, y + 8, x + Math.cos(a) * 30, y + 8 + Math.sin(a) * 30);
      g.fillStyle(BRASS, 1); g.fillCircle(x, y + 8, 3);
      if (warnAt >= 0 && Math.floor(time / 110) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.9); g.strokeRoundedRect(x - 52, y - 24, 104, 40, 8); }
    },

    destroy() { table.remove(); },
  };
}

/** The weather-house: a limewashed chalet with a slate roof, two arched doors, a turntable that shivers before a turn. */
function drawHouse(g: G, x: number, y: number, warn: number, manWest: boolean, time: number): void {
  const sh = warn > 0 ? Math.sin(time / 28) * warn * 3 : 0;
  shadow(g, x, y + 4, 170, 26, 0.3);
  g.fillStyle(TIMBER_DARK, 1); g.fillEllipse(x, y, 170, 26);
  g.fillStyle(TIMBER, 1); g.fillEllipse(x, y - 4, 160, 22);
  g.lineStyle(1, TIMBER_LIT, 0.8);
  for (let i = 0; i < 12; i++) { const a = i * 0.52 + sh * 0.1; g.lineBetween(x, y - 4, x + Math.cos(a) * 78, y - 4 + Math.sin(a) * 10); }
  const hx = x + sh;
  g.fillStyle(LIME_SHADE, 1); g.fillRect(hx - 70, y - 78, 140, 70);
  g.fillStyle(LIME, 1); g.fillRect(hx - 70, y - 78, 120, 70);
  g.fillStyle(SLATE_DARK, 1); g.fillTriangle(hx - 86, y - 76, hx + 86, y - 76, hx, y - 128);
  g.fillStyle(SLATE, 1); g.fillTriangle(hx - 78, y - 78, hx + 60, y - 78, hx - 4, y - 122);
  g.lineStyle(1, SLATE_LIT, 0.6); for (let i = 1; i < 4; i++) g.lineBetween(hx - 78 + i * 14, y - 78 - i * 10, hx + 60 - i * 16, y - 78 - i * 10);
  // A carved sun and a carved cloud over the two doors, and the doors themselves, dark inside.
  for (const side of [-1, 1]) {
    const dx = hx + side * 36;
    const isMan = (side < 0) === manWest;
    g.fillStyle(TIMBER_DARK, 1); g.fillRect(dx - 15, y - 54, 30, 46); g.fillCircle(dx, y - 54, 15);
    g.fillStyle(0x1a1614, 1); g.fillRect(dx - 11, y - 52, 22, 44); g.fillCircle(dx, y - 52, 11);
    if (isMan) { g.fillStyle(CLOUD_SHADE, 1); g.fillCircle(dx - 5, y - 72, 5); g.fillCircle(dx + 4, y - 73, 6); }
    else { g.fillStyle(0xffd060, 1); g.fillCircle(dx, y - 73, 5); }
  }
  // The gut string's peg on the gable, twisting.
  g.fillStyle(BRASS, 1); g.fillCircle(hx, y - 100, 5);
  g.lineStyle(1.5, 0xd8c8a0, 1); g.lineBetween(hx, y - 100, hx + Math.cos(time / 200 + warn * 6) * 5, y - 100 + Math.sin(time / 200 + warn * 6) * 5);
}

/** The Foul Man: a carved figure in a black oilskin and sou'wester, umbrella up, on his rail carriage. */
function drawMan(g: G, x: number, y: number, time: number): void {
  const bob = Math.sin(time / 160) * 1.5;
  shadow(g, x, y + 2, 34, 9, 0.35);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 14, y - 6, 28, 8);
  g.fillStyle(0x23262e, 1); g.fillTriangle(x - 14, y - 6, x + 14, y - 6, x, y - 46 + bob);
  g.fillStyle(0x3a3e48, 1); g.fillTriangle(x - 8, y - 8, x + 4, y - 8, x - 2, y - 42 + bob);
  g.fillStyle(0xd8b494, 1); g.fillCircle(x, y - 50 + bob, 8);
  g.fillStyle(0xd8b040, 1); g.fillEllipse(x, y - 56 + bob, 22, 7); g.fillCircle(x, y - 59 + bob, 6);
  g.fillStyle(0x1a1614, 1); g.fillRect(x - 4, y - 51 + bob, 2, 2); g.fillRect(x + 2, y - 51 + bob, 2, 2);
  g.lineStyle(2, TIMBER_DARK, 1); g.lineBetween(x + 9, y - 30 + bob, x + 9, y - 76 + bob);
  g.fillStyle(0x1a1c22, 1); g.slice(x + 9, y - 74 + bob, 28, Math.PI, Math.PI * 2, false); g.fillPath();
  g.fillStyle(KITE_BLUE, 0.6); g.slice(x + 9, y - 74 + bob, 28, Math.PI * 1.15, Math.PI * 1.4, false); g.fillPath();
}

/** The Fair Maid: a carved girl in a red skirt and white apron, a parasol over her shoulder. */
function drawMaid(g: G, x: number, y: number, time: number): void {
  const bob = Math.sin(time / 140 + 1) * 1.5;
  shadow(g, x, y + 2, 34, 9, 0.3);
  g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 14, y - 6, 28, 8);
  g.fillStyle(KITE_RED, 1); g.fillTriangle(x - 15, y - 6, x + 15, y - 6, x, y - 40 + bob);
  g.fillStyle(LIME, 1); g.fillTriangle(x - 7, y - 8, x + 7, y - 8, x, y - 34 + bob);
  g.fillStyle(lit(KITE_RED, 0.2), 1); g.fillRect(x - 5, y - 44 + bob, 10, 8);
  g.fillStyle(0xf0dcc4, 1); g.fillCircle(x, y - 50 + bob, 8);
  g.fillStyle(0xe0a02a, 1); g.fillEllipse(x - 6, y - 52 + bob, 6, 12); g.fillEllipse(x + 6, y - 52 + bob, 6, 12);
  g.fillStyle(0x1a1614, 1); g.fillRect(x - 4, y - 51 + bob, 2, 2); g.fillRect(x + 2, y - 51 + bob, 2, 2);
  g.lineStyle(1.5, TIMBER_LIT, 1); g.lineBetween(x - 8, y - 34 + bob, x - 18, y - 74 + bob);
  g.fillStyle(0xf6e8f0, 1); g.slice(x - 18, y - 72 + bob, 22, Math.PI * 1.05, Math.PI * 1.95, false); g.fillPath();
  g.lineStyle(1, dim(0xf6e8f0, 0.3), 1);
  for (let i = 0; i < 5; i++) { const a = Math.PI * (1.1 + i * 0.2); g.lineBetween(x - 18, y - 72 + bob, x - 18 + Math.cos(a) * 22, y - 72 + bob + Math.sin(a) * 22); }
}

/** The squall that rides over the Foul Man: a heaped grey cloud and rain slanting east on the west wind. */
function drawSquall(g: G, x: number, y: number, time: number): void {
  g.lineStyle(1, 0xcde9fb, 0.55);
  for (let i = 0; i < 22; i++) {
    const rx = x - 80 + ((i * 47) % 160), ry = y + ((time / 2 + i * 31) % 110);
    g.lineBetween(rx, ry, rx + 6, ry + 14);
  }
  for (const [dx, dy, r, c] of [[-40, 4, 24, CLOUD_DEEP], [0, -6, 32, SLATE], [36, 2, 26, CLOUD_DEEP], [-14, 8, 22, SLATE_DARK], [18, 10, 20, SLATE_DARK]] as [number, number, number, number][]) {
    g.fillStyle(c, 0.95); g.fillCircle(x + dx, y + dy, r);
  }
  g.fillStyle(SLATE_LIT, 0.5); g.fillCircle(x - 8, y - 16, 14);
}

export const FALLEN_WEATHER_HOUSE: GimmickDef = {
  id: ID,
  rules: 'The Foul Man\'s squall stings, the Maid\'s sun mends. When the gut turns they swap, thunder on whoever is caught. Strike the house to turn it on her.',
  make,
};
