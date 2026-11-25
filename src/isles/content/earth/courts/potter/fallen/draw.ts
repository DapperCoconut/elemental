import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, mixC, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { kilnFront } from '../art';
import {
  BISQUE, BISQUE_DARK, BISQUE_LIT, BRICK, BRICK_DARK, FIRE, FIRE_DEEP, FIRE_LIT, GREENWARE, OXBLOOD_LIT, SAGGAR, SAGGAR_DARK, SOOT, SOOT_LIT,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Drawn Green — Fireman Odile Sayer, who kept the firing book of the Glost House.
 *
 * A firing is time: ware goes in, the kiln climbs, and nothing comes out until it is *drawn*.
 * Open the door too soon and the ware is green — it cracks. Odile kept the book that said whose
 * ware was drawn and whose was left in. In the King's telling, she left people in.
 *
 * Here each fighter has a kiln in the north wall, a coloured plaque under it. Everything you cast
 * goes into your kiln; while it fires, your cooldowns crawl, and slower still once it is fired and
 * waiting. Strike your door when it is fired and the ware comes out — your cooldowns rush back for
 * a breath. Strike it early and the ware is drawn green: it cracks and stings you. Strike *her*
 * door when it is fired and you draw it for yourself; strike it early and it cools, and her
 * firing starts again. Every loaded kiln throws hot clinker at whoever is nearest its door
 * (a shadow first), so each trip to the wall is a risk. Halfway down, the kilns fire faster and
 * throw harder. The bot goes to draw its own kiln, raids yours when it is ready, and steps out
 * from under clinker.
 */

const ID = fallenId('potter', 'draw');
const FIRE_S = 5;
const FIRE_LATE_S = 3.8;
const WARE_MAX = 6;
const RUSH_MS = 2500;
const GREEN_MS = 2000;
const GREEN_STING = 6;
const DOOR_GAP = 800;
const CLINK_R = 40;
const CLINK_FALL = 1000;
const CLINK_DMG = 9;
const PLAYER_C = 0x8fd0ff;
const FOE_C = 0xffa040;

interface Kiln { owner: Fighter; x: number; ware: number; heat: number; rushUntil: number; greenUntil: number; struckAt: number; throwAt: number; tgt: StrikeTarget | null; col: number }
interface Clinker { x: number; y: number; fromX: number; at: number; land: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const kilns: Kiln[] = [
    { owner: player, x: W * 0.28, ware: 0, heat: 0, rushUntil: 0, greenUntil: 0, struckAt: -1e9, throwAt: 0, tgt: null, col: PLAYER_C },
    { owner: npc, x: W * 0.72, ware: 0, heat: 0, rushUntil: 0, greenUntil: 0, struckAt: -1e9, throwAt: 0, tgt: null, col: FOE_C },
  ];
  const clinkers: Clinker[] = [];
  let half = false;
  let now = 0;
  const doorY = top + 38;

  const kilnOf = (f: Fighter) => (f === player ? kilns[0] : kilns[1]);

  function rate(k: Kiln): number {
    if (now < k.rushUntil) return 2.6;
    if (now < k.greenUntil) return 0.5;
    if (k.ware <= 0) return 1;
    return k.heat >= 1 ? 0.45 : 0.62;
  }

  function struck(k: Kiln, by: Fighter): void {
    if (now - k.struckAt < DOOR_GAP || k.ware <= 0) return;
    k.struckAt = now;
    const mine = kilnOf(by);
    if (fired(k)) {
      mine.rushUntil = now + RUSH_MS;
      k.ware = 0; k.heat = 0;
      ctx.float(k.x, doorY + 20, k === mine ? 'DRAWN' : by === player ? 'YOU DRAW HER KILN' : 'SHE DRAWS YOUR KILN', by === player ? '#8fd0ff' : '#ffa040');
      ctx.sfx('time-warp');
    } else if (k === mine) {
      k.ware = 0; k.heat = 0;
      mine.greenUntil = now + GREEN_MS;
      ctx.hit(by, GREEN_STING, by.x, by.y);
      ctx.float(k.x, doorY + 20, 'DRAWN GREEN', '#d8505a');
      ctx.sfx('crystal-shatter');
    } else {
      k.heat = 0;
      ctx.float(k.x, doorY + 20, 'THE DOOR COOLS IT', '#bcab98');
      ctx.sfx('hush');
    }
  }

  for (const k of kilns) {
    k.tgt = ctx.target({ x: k.x, y: doorY, r: 32, passThrough: true, onStruck: (by) => struck(k, by === 'player' ? player : npc) });
  }

  function throwClinker(k: Kiln): void {
    // At whoever is nearest the door — or, if nobody is close, onto the placers' lane in front of it.
    let aim: Pt = { x: k.x + (rng() - 0.5) * 200, y: doorY + 60 + rng() * 140 };
    let best = 320;
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const d = dist(f.x, f.y, k.x, doorY);
      if (d < best) { best = d; aim = { x: f.x + (rng() - 0.5) * 70, y: f.y + (rng() - 0.5) * 50 }; }
    }
    clinkers.push({ x: clamp(aim.x, 50, W - 50), y: clamp(aim.y, top + 40, H - 40), fromX: k.x, at: now, land: now + CLINK_FALL });
    ctx.sfx('mortar-launch');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      if (!half && npc.hp < npc.maxHp * 0.5) {
        half = true;
        ctx.banner('Odile opens the flues: the kilns fire faster and throw harder.', '#ffd27a');
        ctx.sfx('inferno');
      }
      for (const k of kilns) {
        if (k.ware > 0 && k.heat < 1) {
          k.heat = Math.min(1, k.heat + dt / (half ? FIRE_LATE_S : FIRE_S));
          if (k.heat >= 1) { ctx.float(k.x, doorY + 30, 'FIRED', '#ffd27a'); ctx.sfx('countdown-go'); }
        }
        if (k.ware > 0 && time >= k.throwAt) {
          k.throwAt = time + (fired(k) ? 750 : 1150) * (half ? 0.8 : 1);
          throwClinker(k);
        }
      }
      for (let i = clinkers.length - 1; i >= 0; i--) {
        const c = clinkers[i];
        if (time < c.land) continue;
        clinkers.splice(i, 1);
        for (const f of [player, npc]) {
          if (!alive(f) || ctx.isAirborne(f) || dist(f.x, f.y, c.x, c.y) > CLINK_R + 16) continue;
          ctx.hit(f, CLINK_DMG * (half ? 1.2 : 1), f.x, f.y);
        }
        ctx.flash(c.x, c.y, FIRE);
        ctx.sfx('explosion-small');
      }
    },

    onPlayerCast() { const k = kilns[0]; if (k.ware === 0) k.heat = 0; k.ware = Math.min(WARE_MAX, k.ware + 1); },
    onNpcCast() { const k = kilns[1]; if (k.ware === 0) k.heat = 0; k.ware = Math.min(WARE_MAX, k.ware + 1); },
    playerCooldownRate() { return rate(kilns[0]); },
    npcCooldownRate() { return rate(kilns[1]); },

    npcSeek() {
      if (!alive(npc)) return null;
      // Out from under a falling clinker first.
      for (const c of clinkers) {
        if (c.land - now < 700 && dist(npc.x, npc.y, c.x, c.y) < CLINK_R + 30) {
          const d = dist(npc.x, npc.y, c.x, c.y) || 1;
          return { x: clamp(c.x + (npc.x - c.x) / d * 110, 60, W - 60), y: clamp(c.y + (npc.y - c.y) / d * 110 + 1, top + 40, H - 40) };
        }
      }
      const mine = kilns[1], yours = kilns[0];
      if (fired(mine)) return { x: mine.x, y: doorY + 80 };
      if (fired(yours) && dist(npc.x, npc.y, yours.x, doorY) < dist(player.x, player.y, yours.x, doorY) + 120) return { x: yours.x, y: doorY + 80 };
      return null;
    },

    drawGround(g, time) {
      // The placers' lane in front of each kiln: worn saggar-shard paving, swept.
      for (const k of kilns) {
        for (let i = 0; i < 9; i++) {
          const x = k.x - 70 + (i % 3) * 48 + ((i / 3) | 0) * 6, y = doorY + 40 + ((i / 3) | 0) * 34;
          g.fillStyle(SAGGAR_DARK, 0.5); g.fillRoundedRect(x - 20, y - 12, 42, 26, 4);
          g.fillStyle(SAGGAR, 0.35); g.fillRoundedRect(x - 18, y - 12, 38, 20, 4);
        }
      }
      // Clinker shadows swelling where they will land.
      for (const c of clinkers) {
        const k = clamp((time - c.at) / CLINK_FALL, 0, 1);
        shadow(g, c.x, c.y, CLINK_R * 2 * (0.4 + 0.6 * k), CLINK_R * 0.7 * (0.4 + 0.6 * k), 0.2 + 0.35 * k);
        g.lineStyle(1.5, FIRE_DEEP, 0.3 + 0.5 * k); g.strokeEllipse(c.x, c.y, CLINK_R * 2, CLINK_R * 0.8);
      }
    },

    drawAir(g, time) {
      for (const k of kilns) drawKiln(g, k, doorY, top, time, now);
      // Clinker in flight: a black-crusted lump glowing red through its cracks, trailing sparks.
      for (const c of clinkers) {
        const k = clamp((time - c.at) / CLINK_FALL, 0, 1);
        const x = c.fromX + (c.x - c.fromX) * k;
        const y = (top + 10) + (c.y - top - 10) * k - Math.sin(Math.PI * k) * 120;
        for (let i = 1; i <= 4; i++) { g.fillStyle(FIRE_LIT, 0.4 * (1 - i / 5)); g.fillCircle(x - (c.x - c.fromX) * 0.02 * i, y - 6 * i, 2); }
        g.fillStyle(SOOT, 1); g.fillCircle(x, y, 8);
        g.fillStyle(SOOT_LIT, 1); g.fillCircle(x - 2, y - 2, 5);
        g.lineStyle(1.5, FIRE, 0.9); g.lineBetween(x - 5, y + 1, x + 1, y - 3); g.lineBetween(x + 1, y - 3, x + 5, y + 2);
        glow(g, x, y, 14, FIRE, 0.08, 2);
      }
    },

    drawHud(g) {
      // Each kiln's load and heat: little pots stacked inside an arch, a heat bar beneath.
      kilns.forEach((k, i) => {
        const w = 118, x = i === 0 ? 20 : W - 20 - w, y = top + 8;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 2, y - 2, w + 4, 34, 6);
        g.fillStyle(BRICK_DARK, 1); g.fillRoundedRect(x + 2, y + 2, 26, 26, { tl: 13, tr: 13, bl: 2, br: 2 });
        g.fillStyle(mixC(0x3a1a10, FIRE, k.heat), 1); g.fillRoundedRect(x + 6, y + 6, 18, 20, { tl: 9, tr: 9, bl: 1, br: 1 });
        for (let p = 0; p < k.ware; p++) {
          const px = x + 36 + (p % 6) * 13, py = y + 14;
          g.fillStyle(k.heat >= 1 ? BISQUE_LIT : GREENWARE, 1); g.fillEllipse(px, py, 9, 11);
          g.fillStyle(k.heat >= 1 ? BISQUE_DARK : 0x6a5a4a, 1); g.fillRect(px - 2, py - 7, 4, 3);
        }
        g.fillStyle(0x1a1210, 1); g.fillRect(x + 34, y + 24, w - 38, 5);
        g.fillStyle(k.heat >= 1 ? FIRE_LIT : FIRE, 1); g.fillRect(x + 34, y + 24, (w - 38) * k.heat, 5);
        if (now < k.rushUntil) { g.lineStyle(2, k.col, 1); g.strokeRoundedRect(x - 2, y - 2, w + 4, 34, 6); }
        else if (now < k.greenUntil) { g.lineStyle(2, OXBLOOD_LIT, 1); g.strokeRoundedRect(x - 2, y - 2, w + 4, 34, 6); }
        g.fillStyle(k.col, 1); g.fillRect(i === 0 ? x - 2 : x + w - 2, y - 2, 4, 34);
      });
    },

    destroy() { for (const k of kilns) k.tgt?.remove(); },
  };
}

/**
 * A firing kiln in the north wall: the brick front and door from the court's art, a bottle
 * chimney above it breathing smoke, the owner's coloured plaque, ware glimpsed through the
 * spyhole, a glow round the door when it is fired and waiting.
 */
function drawKiln(g: G, k: Kiln, doorY: number, top: number, time: number, now: number): void {
  const x = k.x;
  // Bottle chimney behind, cut off by the top of the yard.
  g.fillStyle(BRICK_DARK, 1); g.fillTriangle(x - 60, top + 4, x + 60, top + 4, x, top - 30);
  g.fillStyle(BRICK, 1); g.fillTriangle(x - 52, top + 4, x + 52, top + 4, x, top - 24);
  if (k.ware > 0) {
    for (let i = 0; i < 4; i++) {
      const ph = ((time / 1400) + i / 4) % 1;
      g.fillStyle(SOOT_LIT, 0.35 * (1 - ph)); g.fillCircle(x + Math.sin(ph * 5 + i) * 10, top - ph * 20, 8 + ph * 14);
    }
  }
  kilnFront(g, x, top, 96, true, k.ware > 0 ? 0.25 + 0.75 * k.heat : 0.05);
  // Ware inside, seen through the door: saggars stacked, the pots on top colouring as they fire.
  for (let p = 0; p < Math.min(k.ware, 4); p++) {
    const px = x - 27 + p * 18, py = top + 30;
    g.fillStyle(mixC(GREENWARE, BISQUE, k.heat), 0.9); g.fillEllipse(px, py, 10, 12);
  }
  // The owner's plaque.
  g.fillStyle(SOOT, 1); g.fillRoundedRect(x - 24, doorY + 10, 48, 10, 3);
  g.fillStyle(k.col, 0.95); g.fillRoundedRect(x - 21, doorY + 12, 42, 6, 2);
  if (fired(k)) {
    const p = 0.5 + 0.5 * Math.sin(time / 140);
    glow(g, x, doorY - 4, 60, FIRE_LIT, 0.08 + 0.06 * p, 4);
    g.lineStyle(2, FIRE_LIT, 0.4 + 0.4 * p); g.strokeRect(x - 50, top + 6, 100, 36);
  }
  if (now < k.greenUntil) {
    g.lineStyle(1.5, 0x1a0e0a, 0.9);
    g.lineBetween(x - 20, top + 14, x - 8, top + 30); g.lineBetween(x - 8, top + 30, x - 16, top + 40);
    g.lineBetween(x + 14, top + 12, x + 8, top + 26);
  }
}

function fired(k: Kiln): boolean { return k.ware > 0 && k.heat >= 1; }

export const FALLEN_DRAW: GimmickDef = {
  id: ID,
  rules: 'Casting loads your kiln and slows your cooldowns. Strike its door when fired for a rush; early, it cracks. Draw hers when it is ready.',
  make,
};
