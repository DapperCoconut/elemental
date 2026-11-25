import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CANAL, CANAL_DEEP, CANAL_LIT, CANDLE, GILT, GILT_DARK, IRON, ISTRIA, ISTRIA_DARK, LACQUER, LACQUER_LIT, OAK, OAK_DARK,
  OAK_LIT, RIBBON, VELVET_DARK,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * The Last Boat Up — Night-Caller Orsola Brenta, who stood on the landings after Compline and
 * called the names for the curtained night boats, and who in the King's telling still calls them:
 * the boats go up the canal to the Organ full, and come back empty.
 *
 * A canal runs along the top of the yard with three wooden landings jutting out of it. The black
 * boat glides from landing to landing (the next stop's lantern is lit) and lies at each a few
 * seconds with its felze curtains open. Whoever is HELD on the landing where it lies — stunned,
 * or roped — is taken aboard: hauled in, carried up the canal and thrown out at the far stage.
 *
 * Orsola throws mooring loops at your feet; caught, you are roped a moment — harmless on open
 * ground, fatal on a landing with the boat at it. The exploit: each landing's bollard. Strike it
 * and its line drops over whoever ELSE is on that landing — so when she walks out to rope you,
 * get to her bollard first. Her own loops catch her too. Halfway down, a second boat comes.
 */

const ID = fallenId('masque', 'last-boat');
const WATER_H = 44;
const DECK_LEN = 112;
const LAND_HALF = 66;
const BOAT_SPEED = 170;
const DOCK_MS = 4200;
const DOCK_HALF_MS = 3300;
const LOOP_EVERY = 5600;
const LOOP_HALF_EVERY = 4300;
const LOOP_WARN = 950;
const LOOP_R = 46;
const ROPE_MS = 1300;

interface Landing { x: number; bollard: Pt; t: StrikeTarget; struckAt: number; dropAt: number }
interface Boat { x: number; to: number; at: number; docked: boolean; until: number; open: number }
interface Loop { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const waterY = top + WATER_H;
  const deckEnd = waterY + DECK_LEN;
  const roped = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const takenAt = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  const loops: Loop[] = [];
  const takings: { x: number; y: number; at: number }[] = [];
  let nextLoop = 0;
  let second = false;
  let started = false;

  const landings: Landing[] = [W * 0.19, W * 0.5, W * 0.81].map((x) => {
    const l: Landing = { x, bollard: { x: x + 44, y: waterY + 18 }, struckAt: -9999, dropAt: -9999, t: null as unknown as StrikeTarget };
    l.t = ctx.target({ x: l.bollard.x, y: l.bollard.y - 8, r: 15, onStruck: (by) => strikeBollard(l, by === 'player' ? player : npc) });
    return l;
  });
  const boats: Boat[] = [{ x: -120, to: Math.floor(rng() * 3), at: 0, docked: false, until: 0, open: 0 }];

  const onLanding = (f: Fighter, l: Landing): boolean => alive(f) && Math.abs(f.x - l.x) < LAND_HALF && f.y < deckEnd && f.y > waterY - 6;
  const held = (f: Fighter, now: number): boolean => Date.now() < f.stunnedUntil || now < (roped.get(f) ?? 0);

  function rope(f: Fighter, now: number): void {
    ctx.root(f, ROPE_MS);
    roped.set(f, now + ROPE_MS);
    ctx.float(f.x, f.y - 50, 'ROPED', '#e6d2b0');
  }

  /** Struck: the bollard's line drops over whoever else stands on its landing. */
  function strikeBollard(l: Landing, by: Fighter): void {
    const now = tk.now;
    if (now - l.struckAt < 1200) return;
    l.struckAt = now;
    l.dropAt = now;
    ctx.sfx('chain');
    for (const f of [player, npc]) if (f !== by && onLanding(f, l)) rope(f, now);
  }

  /** The next stop: the landing nearest the player that no boat is at or bound for. */
  function nextStop(b: Boat): number {
    let best = -1, bd = Infinity;
    landings.forEach((l, i) => {
      if (i === b.to || boats.some((o) => o !== b && o.to === i)) return;
      const d = Math.abs(l.x - player.x) + rng() * 120;
      if (d < bd) { bd = d; best = i; }
    });
    return best < 0 ? (b.to + 1) % 3 : best;
  }

  /** Lying at a landing, or due there within `ms`. */
  const comingTo = (i: number, ms: number): boolean => boats.some((b) =>
    b.to === i && (b.docked || Math.abs(b.x - landings[i].x) / BOAT_SPEED * 1000 < ms));

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextLoop = time + 3000; }
      if (!second && npc.hp <= npc.maxHp * 0.5) {
        second = true;
        const b: Boat = { x: W + 120, to: 0, at: 0, docked: false, until: 0, open: 0 };
        b.to = nextStop(b);
        boats.push(b);
        ctx.banner('A second boat comes down the canal. It is never full.', '#e6d2b0');
        ctx.sfx('train-horn');
      }

      for (const b of boats) {
        const l = landings[b.to];
        if (b.docked) {
          b.open = Math.min(1, b.open + dt * 3);
          for (const f of [player, npc]) {
            if (!onLanding(f, l) || !held(f, time) || time - (takenAt.get(f) ?? 0) < 2500) continue;
            takeAboard(f, b.to, time);
          }
          if (time >= b.until) { b.docked = false; b.to = nextStop(b); ctx.sfx('whoosh'); }
        } else {
          b.open = Math.max(0, b.open - dt * 3);
          const d = l.x - b.x;
          const step = BOAT_SPEED * dt;
          if (Math.abs(d) <= step) {
            b.x = l.x; b.docked = true; b.at = time; b.until = time + (second ? DOCK_HALF_MS : DOCK_MS);
            ctx.sfx('splash');
          } else b.x += Math.sign(d) * step;
        }
      }

      // Her mooring loops.
      if (time >= nextLoop - LOOP_WARN && !loops.some((p) => p.at > time) && alive(player) && alive(npc)) {
        loops.push({ x: player.x, y: player.y, at: nextLoop });
        nextLoop += second ? LOOP_HALF_EVERY : LOOP_EVERY;
        ctx.sfx('whip');
      }
      for (let i = loops.length - 1; i >= 0; i--) {
        const p = loops[i];
        if (time < p.at) continue;
        loops.splice(i, 1);
        ctx.sfx('trap-snap');
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, p.x, p.y) > LOOP_R + 8) continue;
          rope(f, time);
          if (f === player) tk.hitPlayer(6, f.x, f.y);
        }
      }
      while (takings.length && time - takings[0].at > 900) takings.shift();
    },

    playerSpeedMult() { return wading(player) ? 0.55 : 1; },
    npcSpeedMult() { return wading(npc) ? 0.55 : 1; },

    npcSeek() {
      for (let i = 0; i < landings.length; i++) {
        const l = landings[i];
        if (!comingTo(i, 1500)) continue;
        if (onLanding(npc, l)) {
          // On a landing with the boat at it: rope the player first if they are on it too, else get off.
          if (onLanding(player, l)) return { x: l.bollard.x - 10, y: l.bollard.y + 22 };
          return { x: clamp(npc.x, 60, W - 60), y: deckEnd + 70 };
        }
        if (onLanding(player, l)) return { x: l.bollard.x - 10, y: l.bollard.y + 22 };
      }
      return null;
    },

    drawGround(g, time) {
      // The canal: green water, lamplit ripples, a white Istrian kerb along its lip.
      g.fillStyle(CANAL_DEEP, 1); g.fillRect(0, top - 4, W, WATER_H + 4);
      g.fillStyle(CANAL, 1); g.fillRect(0, top + 6, W, WATER_H - 10);
      for (let i = 0; i < 26; i++) {
        const x = ((i * 53 + time * 0.02) % (W + 40)) - 20;
        const y = top + 10 + ((i * 17) % (WATER_H - 16));
        g.lineStyle(1, CANAL_LIT, 0.35 + 0.2 * Math.sin(time / 600 + i)); g.lineBetween(x, y, x + 14, y);
      }
      g.fillStyle(ISTRIA_DARK, 1); g.fillRect(0, waterY - 2, W, 8);
      g.fillStyle(ISTRIA, 1); g.fillRect(0, waterY - 4, W, 4);
      // The landings: plank decks on piles, a striped palina at each head, the next stop's lantern lit.
      landings.forEach((l, i) => {
        const x0 = l.x - LAND_HALF;
        g.fillStyle(OAK_DARK, 1); g.fillRect(x0 - 2, top + 8, LAND_HALF * 2 + 4, deckEnd - top - 6);
        for (let k = 0; k < 9; k++) {
          const px = x0 + k * ((LAND_HALF * 2) / 9);
          g.fillStyle(k % 2 ? OAK : OAK_LIT, 1); g.fillRect(px + 1, top + 10, (LAND_HALF * 2) / 9 - 2, deckEnd - top - 12);
        }
        g.lineStyle(1, OAK_DARK, 0.6);
        for (let yy = top + 30; yy < deckEnd; yy += 26) g.lineBetween(x0, yy, x0 + LAND_HALF * 2, yy);
        const lit2 = comingTo(i, 99999) ? 1 : 0;
        if (lit2) {
          const docked = boats.some((b) => b.to === i && b.docked);
          g.fillStyle(docked ? 0xff8a4a : CANDLE, docked ? 0.16 + 0.06 * Math.sin(time / 140) : 0.08);
          g.fillRect(x0, waterY, LAND_HALF * 2, DECK_LEN);
          g.lineStyle(2, docked ? 0xff8a4a : CANDLE, docked ? 0.8 : 0.4); g.strokeRect(x0, waterY, LAND_HALF * 2, DECK_LEN);
        }
        // Dropped mooring line.
        if (time - l.dropAt < 500) {
          const k = (time - l.dropAt) / 500;
          g.lineStyle(3, 0xc8a070, 1 - k); g.strokeEllipse(l.x, waterY + DECK_LEN / 2, LAND_HALF * 2 * (1 - k * 0.3), DECK_LEN * (1 - k * 0.3));
        }
      });
      // Her loops: a coil of rope dropping on the spot.
      for (const p of loops) {
        const k = clamp(1 - (p.at - time) / LOOP_WARN, 0, 1);
        g.lineStyle(2, 0xc8a070, 0.35 + 0.5 * k); g.strokeCircle(p.x, p.y, LOOP_R);
        g.lineStyle(4, 0x8a6a40, 0.25 + 0.5 * k); g.strokeCircle(p.x, p.y, LOOP_R * (1.6 - 0.6 * k));
      }
    },

    drawAir(g, time) {
      landings.forEach((l, i) => {
        drawPalina(g, l.x - LAND_HALF + 6, waterY + 2, comingTo(i, 99999), time);
        drawBollard(g, l.bollard.x, l.bollard.y, time - l.struckAt < 400);
      });
      for (const b of boats) drawBoat(g, b.x, top + 22, b.open, time);
      for (const t of takings) {
        const k = (time - t.at) / 900;
        for (let i = 0; i < 5; i++) {
          g.lineStyle(2, RIBBON, 0.7 * (1 - k));
          const yy = t.y - k * 60 - i * 8;
          g.lineBetween(t.x - 10 + i * 5, yy, t.x - 6 + i * 5 + Math.sin(time / 90 + i) * 4, yy - 12);
        }
      }
      // Roped fighters wear the line.
      for (const f of [player, npc]) {
        if (tk.now >= (roped.get(f) ?? 0) || !alive(f)) continue;
        g.lineStyle(3, 0xc8a070, 0.9); g.strokeEllipse(f.x, f.y - 10, 40, 16);
        g.lineStyle(1, 0x6a4a28, 0.9); g.strokeEllipse(f.x, f.y - 10, 36, 13);
      }
    },

    drawHud(g, time) {
      // The night-caller's slate: three landings, each boat's stop marked, a lamp for the one lying in.
      const x = W / 2 - 60, y = top + 6;
      g.fillStyle(0x0c1418, 0.72); g.fillRoundedRect(x - 8, y - 2, 136, 26, 6);
      g.lineStyle(2, CANAL_LIT, 0.8); g.lineBetween(x, y + 8, x + 120, y + 8);
      landings.forEach((_, i) => {
        const px = x + 10 + i * 50;
        const b = boats.find((o) => o.to === i);
        g.fillStyle(b ? (b.docked ? 0xff8a4a : CANDLE) : 0x3a4448, 1); g.fillCircle(px, y + 8, 5);
        if (b?.docked) {
          const k = clamp((b.until - time) / (second ? DOCK_HALF_MS : DOCK_MS), 0, 1);
          g.fillStyle(0xff8a4a, 0.9); g.fillRect(px - 10, y + 16, 20 * k, 3);
        }
      });
      for (const b of boats) { g.fillStyle(LACQUER_LIT, 1); g.fillRect(x + clamp((b.x / W) * 120, 0, 120) - 4, y + 5, 8, 6); }
    },

    destroy() {
      for (const l of landings) l.t.remove();
    },
  };

  function wading(f: Fighter): boolean {
    return alive(f) && f.y < waterY && !landings.some((l) => Math.abs(f.x - l.x) < LAND_HALF);
  }

  /** Held on the landing the boat lies at: hauled in, carried up and thrown out at the far stage. */
  function takeAboard(f: Fighter, at: number, time: number): void {
    takenAt.set(f, time);
    roped.set(f, 0);
    takings.push({ x: f.x, y: f.y, at: time });
    let far = 0, fd = -1;
    landings.forEach((l, i) => { const d = Math.abs(l.x - landings[at].x); if (d > fd) { fd = d; far = i; } });
    if (f === player) tk.hitPlayer(22, f.x, f.y); else ctx.hit(f, 30, f.x, f.y);
    ctx.nudge(f, landings[far].x - f.x, deckEnd + 40 - f.y);
    ctx.stun(f, 1100);
    ctx.float(f.x, f.y - 54, 'TAKEN ABOARD', '#ffffff');
    ctx.sfx('hush');
  }
}

/** A striped mooring pole (palina) with a lantern hung on a crook — lit when a boat is due. */
function drawPalina(g: G, x: number, y: number, on: boolean, time: number): void {
  for (let k = 0; k < 6; k++) { g.fillStyle(k % 2 ? 0xf4f0f6 : 0x5b3f9a, 1); g.fillRect(x - 3, y - 70 + k * 12, 6, 12); }
  g.fillStyle(GILT, 1); g.fillCircle(x, y - 72, 4);
  g.lineStyle(2, IRON, 1); g.lineBetween(x, y - 62, x + 12, y - 62); g.lineBetween(x + 12, y - 62, x + 12, y - 56);
  g.fillStyle(IRON, 1); g.fillRect(x + 7, y - 56, 10, 12);
  if (on) {
    glow(g, x + 12, y - 50, 20, CANDLE, 0.08 + 0.03 * Math.sin(time / 160), 3);
    g.fillStyle(CANDLE, 1); g.fillRect(x + 9, y - 54, 6, 8);
  } else { g.fillStyle(0x2a2a2a, 1); g.fillRect(x + 9, y - 54, 6, 8); }
}

/** An iron bollard with the landing's mooring line coiled on it. */
function drawBollard(g: G, x: number, y: number, hot: boolean): void {
  shadow(g, x, y + 2, 26, 8, 0.35);
  g.fillStyle(IRON, 1); g.fillRect(x - 7, y - 18, 14, 18);
  g.fillStyle(LACQUER_LIT, 1); g.fillEllipse(x, y - 18, 20, 8);
  g.fillStyle(dim(IRON, 0.3), 1); g.fillRect(x + 2, y - 16, 4, 15);
  for (let k = 0; k < 3; k++) { g.lineStyle(3, hot ? 0xffd890 : 0xb08a58, 1); g.strokeEllipse(x, y - 8 - k * 4, 22, 7); }
}

/** The black night boat: lacquered hull, six-toothed ferro, felze cabin with curtains that part. */
function drawBoat(g: G, x: number, y: number, open: number, time: number): void {
  const bob = Math.sin(time / 500) * 1.5;
  const yy = y + bob;
  g.fillStyle(CANAL_DEEP, 0.6); g.fillEllipse(x, yy + 10, 200, 16);
  const hull: Pt[] = [
    { x: x - 96, y: yy - 12 }, { x: x - 80, y: yy + 4 }, { x: x - 40, y: yy + 10 }, { x: x + 40, y: yy + 10 },
    { x: x + 82, y: yy + 3 }, { x: x + 100, y: yy - 16 }, { x: x + 76, y: yy - 4 }, { x: x - 74, y: yy - 4 },
  ];
  g.fillStyle(LACQUER, 1); g.fillPoints(hull, true);
  g.lineStyle(1, LACQUER_LIT, 0.8); g.lineBetween(x - 74, yy - 2, x + 76, yy - 2);
  // Ferro at the prow.
  g.fillStyle(0xd8dce0, 1); g.fillRect(x + 94, yy - 30, 4, 16);
  for (let k = 0; k < 6; k++) g.fillRect(x + 98, yy - 28 + k * 3, 6, 1.6);
  g.fillTriangle(x + 94, yy - 30, x + 104, yy - 34, x + 98, yy - 26);
  // Felze: a black cabin, gilt-edged; its curtains part when it lies in.
  const fx = x - 10, fw = 64, fh = 26;
  g.fillStyle(0x0a080c, 1); g.fillRect(fx - fw / 2, yy - 4 - fh, fw, fh);
  if (open > 0) {
    g.fillStyle(0x1a1420, 1); g.fillRect(fx - (fw / 2) * open, yy - 2 - fh, fw * open, fh - 4);
    for (let k = 0; k < 4; k++) {
      const rx = fx - 18 + k * 12;
      g.lineStyle(2, RIBBON, 0.55 * open); g.lineBetween(rx, yy - 22, rx + Math.sin(time / 300 + k) * 3, yy - 10);
    }
  }
  const cw = (fw / 2) * (1 - open * 0.8);
  g.fillStyle(VELVET_DARK, 1); g.fillRect(fx - fw / 2, yy - 4 - fh, cw, fh); g.fillRect(fx + fw / 2 - cw, yy - 4 - fh, cw, fh);
  g.lineStyle(1, GILT_DARK, 1); g.strokeRect(fx - fw / 2, yy - 4 - fh, fw, fh);
  g.fillStyle(GILT, 1); g.fillRect(fx - fw / 2 - 2, yy - 6 - fh, fw + 4, 3);
  // The hooded boatman at the stern, and his oar on the forcola.
  g.fillStyle(0x1a1420, 1); g.fillEllipse(x - 70, yy - 22, 14, 26);
  g.fillStyle(0x0a080c, 1); g.fillCircle(x - 70, yy - 36, 7);
  g.fillStyle(0xffa040, 0.9); g.fillCircle(x - 68, yy - 36, 1.4);
  g.lineStyle(3, OAK, 1); g.lineBetween(x - 66, yy - 26, x - 40, yy + 14);
  g.fillStyle(OAK_LIT, 1); g.fillEllipse(x - 40, yy + 14, 6, 12);
  // A lantern at the prow.
  glow(g, x + 70, yy - 20, 18, CANDLE, 0.06, 3);
  g.fillStyle(lit(CANDLE, 0.2), 1); g.fillRect(x + 66, yy - 26, 8, 10);
}

export const FALLEN_LAST_BOAT: GimmickDef = {
  id: ID,
  rules: 'The black boat docks at each landing in turn: whoever is held on its landing is taken aboard. Strike a bollard to rope whoever else is on its landing.',
  make,
};
