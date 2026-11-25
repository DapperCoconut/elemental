import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit, mixC, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  GLASS_LIT, HEAT_WHITE, IRON, IRON_DARK, IRON_LIT, LIME_DARK, MIRROR_DARK, MOLTEN, MOLTEN_LIT, OAK, OAK_DARK, OAK_LIT,
  QUENCH, QUENCH_LIT, ROUGE, SIDE_NPC, SIDE_PLAYER, SLURRY,
} from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';
import { hpRatio, hudPlate, rivet, unit } from './kit';

/**
 * Keen Edge — Grind-Master Swithin Rasp, bench one of the grinding hall.
 *
 * In the King's telling Rasp set the edge on every halberd the Noon Guard carries, and he fights
 * the way he grinds: everything is about the edge. Both fighters start keen (six notches). Every
 * blow you land takes a notch off your edge — at full edge you hit hard (×1.3), worn down you hit
 * soft, and at no edge at all you are **blunt**: your basic swing is silenced until you regrind.
 *
 * Two treadle grindstones stand in the yard. Stand at one and you grind a notch back every beat —
 * but a working wheel throws its **sparks out the far side**, straight away from the grinder, in a
 * long burning fan that cuts whoever stands in it. So you choose *where* to grind: with your foe
 * behind the wheel and the sparks on him, and never on the wheel's far side while he grinds. Past
 * half the wheels are trued: grinding is quicker and every wheel throws two fans.
 */

const ID = fallenId('workshop', 'keen-edge');
const NOTCHES = 6;
const DMG_PER_NOTCH = 24;
const GRIND_R = 58;
const SPARK_LEN = 560;
const SPARK_HALF = 26;
const SPARK_TICK = 450;

interface Wheel { x: number; y: number; turn: number }
interface Chip { x: number; y: number; vx: number; vy: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const midY = top + (H - top) * 0.55;
  const wheels: Wheel[] = [{ x: 220, y: midY, turn: 0 }, { x: W - 220, y: midY, turn: 0 }];
  const both = (): Fighter[] => [player, npc];
  const other = (f: Fighter): Fighter => (f === player ? npc : player);

  const edge = new Map<Fighter, number>([[player, NOTCHES], [npc, NOTCHES]]);
  const worn = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const grindAcc = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const grindingAt = new Map<Fighter, Wheel | null>([[player, null], [npc, null]]);
  const lastSpark = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const lastBlunt = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const chips: Chip[] = [];
  let own = false;
  let trued = false;

  const sharpMult = (f: Fighter): number => 0.7 + 0.1 * (edge.get(f) ?? NOTCHES);
  const hitOwn = (f: Fighter, amount: number): void => { own = true; ctx.hit(f, amount, f.x, f.y); own = false; };
  /** The spark fans a grinder at a wheel throws: away from the grinder, through the wheel. */
  const fans = (f: Fighter, w: Wheel): { a: number; x: number; y: number }[] => {
    const base = Math.atan2(w.y - f.y, w.x - f.x);
    const as = trued ? [base - 0.22, base + 0.22] : [base];
    return as.map((a) => ({ a, x: w.x + Math.cos(a) * 30, y: w.y + Math.sin(a) * 30 }));
  };
  const inFan = (p: Pt, fan: { a: number; x: number; y: number }): boolean =>
    segDist(p.x, p.y, fan.x, fan.y, fan.x + Math.cos(fan.a) * SPARK_LEN, fan.y + Math.sin(fan.a) * SPARK_LEN) < SPARK_HALF + 14;

  /** A blow landed by `by`: wear its edge down a notch per DMG_PER_NOTCH. */
  function landed(by: Fighter, amount: number): void {
    let acc = (worn.get(by) ?? 0) + amount;
    let e = edge.get(by) ?? 0;
    while (acc >= DMG_PER_NOTCH && e > 0) {
      acc -= DMG_PER_NOTCH; e--;
      const a = ctx.rng() * Math.PI * 2;
      chips.push({ x: by.x, y: by.y - 20, vx: Math.cos(a) * 90, vy: -60 - ctx.rng() * 50, at: ctx.scene.time.now });
    }
    if (e === 0) acc = 0;
    worn.set(by, acc); edge.set(by, e);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!trued && hpRatio(npc) < 0.5) { trued = true; ctx.sfx('hammer-forge'); ctx.banner('THE WHEELS ARE TRUED'); }
      const grindMs = trued ? 360 : 600;
      for (const w of wheels) w.turn += dt * (grindingAt.get(player) === w || grindingAt.get(npc) === w ? 9 : 2.2);
      for (const f of both()) {
        let at: Wheel | null = null;
        if (alive(f)) for (const w of wheels) if (dist(f.x, f.y, w.x, w.y) < GRIND_R) at = w;
        const e = edge.get(f) ?? 0;
        // Only an edge that needs it throws sparks: a keen blade on the wheel just polishes.
        if (at && e < NOTCHES) {
          if (grindingAt.get(f) !== at) ctx.sfx('gear-turn');
          let acc = (grindAcc.get(f) ?? 0) + dt * 1000;
          if (acc >= grindMs) { acc -= grindMs; edge.set(f, Math.min(NOTCHES, e + 1)); ctx.sfx('sizzle'); }
          grindAcc.set(f, acc);
          grindingAt.set(f, at);
          if (time - (lastSpark.get(f) ?? 0) >= SPARK_TICK) {
            lastSpark.set(f, time);
            const o = other(f);
            if (alive(o) && fans(f, at).some((fan) => inFan(o, fan))) hitOwn(o, trued ? 6 : 7);
          }
        } else {
          grindingAt.set(f, null);
          grindAcc.set(f, 0);
        }
        // Blunt: the basic swing is silenced, re-sealed on its own clock until a notch is ground back.
        if (alive(f) && (edge.get(f) ?? 0) === 0 && time - (lastBlunt.get(f) ?? 0) >= 450) {
          lastBlunt.set(f, time);
          ctx.silence(f, 650);
        }
      }
      for (let i = chips.length - 1; i >= 0; i--) {
        const c = chips[i];
        c.vy += 260 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        if (time - c.at > 600) chips.splice(i, 1);
      }
    },

    onNpcHurt(amount) { if (!own) landed(player, amount); },
    onPlayerHurt(amount) { if (!own) landed(npc, amount); },
    npcTakenMult: () => sharpMult(player),
    playerTakenMult: () => sharpMult(npc),

    npcSeek() {
      // Worn down: go and grind — from the side that puts the stranger in the sparks.
      if ((edge.get(npc) ?? 0) <= 2) {
        let best: Pt | null = null, bs = Infinity;
        for (const w of wheels) {
          const u = unit(w.x, w.y, player.x, player.y);
          const spot = { x: clamp(w.x - u.x * 44, 50, W - 50), y: clamp(w.y - u.y * 44, top + 40, H - 40) };
          const s = dist(npc.x, npc.y, spot.x, spot.y);
          if (s < bs) { bs = s; best = spot; }
        }
        return best;
      }
      // Never stand in the stranger's fan while she grinds.
      const pw = grindingAt.get(player);
      if (pw) {
        const fan = fans(player, pw).find((f) => inFan(npc, f));
        if (fan) {
          const side = Math.sin(Math.atan2(npc.y - fan.y, npc.x - fan.x) - fan.a) >= 0 ? 1 : -1;
          return { x: clamp(npc.x + Math.cos(fan.a + side * Math.PI / 2) * 120, 50, W - 50), y: clamp(npc.y + Math.sin(fan.a + side * Math.PI / 2) * 120, top + 40, H - 40) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const w of wheels) {
        // The chalk ring of the grinding rest, and the slurry the wheel has thrown on the flags.
        g.fillStyle(SLURRY, 0.35); g.fillEllipse(w.x, w.y + 22, 120, 40);
        g.lineStyle(1.5, LIME_DARK, 0.5);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          g.beginPath(); g.arc(w.x, w.y, GRIND_R, a, a + 0.22, false); g.strokePath();
        }
        drawWheel(g, w, time);
      }
      // Live spark fans: a scorched band first, then the streaks themselves.
      for (const f of both()) {
        const w = grindingAt.get(f);
        if (!w) continue;
        const sideC = f === player ? SIDE_PLAYER : SIDE_NPC;
        for (const fan of fans(f, w)) {
          const ex = fan.x + Math.cos(fan.a) * SPARK_LEN, ey = fan.y + Math.sin(fan.a) * SPARK_LEN;
          g.lineStyle(SPARK_HALF * 2, MOLTEN, 0.08); g.lineBetween(fan.x, fan.y, ex, ey);
          g.lineStyle(2, sideC, 0.3); g.lineBetween(fan.x, fan.y, ex, ey);
        }
      }
    },

    drawAir(g, time) {
      for (const f of both()) {
        const w = grindingAt.get(f);
        if (w && alive(f)) {
          // The blade laid on the stone.
          const a = Math.atan2(w.y - f.y, w.x - f.x);
          const bx = w.x - Math.cos(a) * 24, by = w.y - Math.sin(a) * 24;
          g.lineStyle(4, IRON_DARK, 1); g.lineBetween(f.x, f.y - 10, bx, by - 6);
          g.lineStyle(2, MIRROR_DARK, 1); g.lineBetween(f.x, f.y - 11, bx, by - 7);
          g.lineStyle(1, GLASS_LIT, 0.9); g.lineBetween(f.x + 2, f.y - 12, bx, by - 8);
          for (const fan of fans(f, w)) {
            for (let i = 0; i < 22; i++) {
              const k = ((time / 300) + i / 22 + (fan.a * 3)) % 1;
              const jit = Math.sin(i * 12.9898 + fan.a) * (SPARK_HALF * (0.3 + k * 0.7));
              const nx = -Math.sin(fan.a), ny = Math.cos(fan.a);
              const d = k * SPARK_LEN;
              const px = fan.x + Math.cos(fan.a) * d + nx * jit, py = fan.y + Math.sin(fan.a) * d + ny * jit;
              const c = mixC(HEAT_WHITE, MOLTEN, k);
              g.lineStyle(2 - k, c, 1 - k * 0.8);
              g.lineBetween(px, py, px - Math.cos(fan.a) * (10 + 14 * (1 - k)), py - Math.sin(fan.a) * (10 + 14 * (1 - k)));
            }
            glow(g, fan.x, fan.y, 16, MOLTEN_LIT, 0.1, 3);
          }
        }
        // A glint over a keen fighter; a dull nicked grey over a blunt one.
        if (!alive(f)) continue;
        const e = edge.get(f) ?? 0;
        if (e >= 5) {
          const tw = 0.5 + 0.5 * Math.sin(time / 140 + (f === player ? 0 : 2));
          g.fillStyle(GLASS_LIT, 0.5 + 0.4 * tw);
          g.fillTriangle(f.x + 18, f.y - 44, f.x + 20, f.y - 36, f.x + 22, f.y - 44);
          g.fillTriangle(f.x + 14, f.y - 40, f.x + 20, f.y - 42, f.x + 26, f.y - 40);
        } else if (e === 0) {
          g.lineStyle(2, ROUGE, 0.6 + 0.3 * Math.sin(time / 120)); g.strokeCircle(f.x, f.y, 26);
        }
      }
      for (const c of chips) {
        const k = clamp((ctx.scene.time.now - c.at) / 600, 0, 1);
        g.fillStyle(IRON_LIT, 1 - k); g.fillTriangle(c.x, c.y, c.x + 4, c.y + 1, c.x + 1, c.y + 4);
      }
    },

    drawHud(g, time) {
      blade(g, 16, top + 8, edge.get(player) ?? 0, SIDE_PLAYER, false, time);
      blade(g, W - 16 - 170, top + 8, edge.get(npc) ?? 0, SIDE_NPC, true, time);
    },
  };
}

/** A treadle grindstone in its oak frame, the sandstone turning in a trough of slurry-grey water. */
function drawWheel(g: G, w: Wheel, time: number): void {
  const { x, y } = w;
  // Trough.
  g.fillStyle(OAK_DARK, 1); g.fillRoundedRect(x - 30, y + 6, 60, 22, 4);
  g.fillStyle(QUENCH, 1); g.fillRoundedRect(x - 26, y + 9, 52, 15, 3);
  g.fillStyle(QUENCH_LIT, 0.5 + 0.2 * Math.sin(time / 300)); g.fillEllipse(x - 8, y + 15, 20, 4);
  // Frame legs and the treadle board.
  g.lineStyle(5, OAK_DARK, 1); g.lineBetween(x - 36, y + 30, x - 22, y - 30); g.lineBetween(x + 36, y + 30, x + 22, y - 30);
  g.lineStyle(3, OAK, 1); g.lineBetween(x - 35, y + 29, x - 22, y - 29); g.lineBetween(x + 35, y + 29, x + 22, y - 29);
  const tread = Math.sin(w.turn) * 3;
  g.fillStyle(OAK, 1); g.fillRect(x - 40, y + 30 + tread, 80, 6);
  g.fillStyle(OAK_LIT, 1); g.fillRect(x - 40, y + 30 + tread, 80, 2);
  g.lineStyle(2, IRON, 1); g.lineBetween(x + 26, y + 32 + tread, x + 20 + Math.cos(w.turn) * 8, y + Math.sin(w.turn) * 8);
  // The stone: an upright sandstone disc, worn concave on its face, chalk ticks turning.
  g.fillStyle(dim(0xc8b28a, 0.25), 1); g.fillCircle(x, y + 2, 30);
  g.fillStyle(0xc8b28a, 1); g.fillCircle(x, y, 30);
  g.fillStyle(lit(0xc8b28a, 0.2), 1); g.fillCircle(x - 4, y - 4, 22);
  g.lineStyle(1, dim(0xc8b28a, 0.35), 0.7);
  for (let i = 0; i < 3; i++) g.strokeCircle(x, y, 10 + i * 7);
  for (let i = 0; i < 8; i++) {
    const a = w.turn + i * (Math.PI / 4);
    g.lineStyle(1.5, i % 2 ? LIME_DARK : dim(0xc8b28a, 0.4), 0.8);
    g.lineBetween(x + Math.cos(a) * 24, y + Math.sin(a) * 24, x + Math.cos(a) * 29, y + Math.sin(a) * 29);
  }
  // Axle and crank.
  g.fillStyle(IRON_DARK, 1); g.fillCircle(x, y, 6);
  rivet(g, x, y, IRON_LIT, 3);
}

/** The HUD blade: six notches along its edge, worn ones cut out and dulled. */
function blade(g: G, x: number, y: number, e: number, side: number, flip: boolean, time: number): void {
  hudPlate(g, x - 4, y - 4, 178, 22);
  const seg = 24;
  for (let i = 0; i < NOTCHES; i++) {
    const k = flip ? NOTCHES - 1 - i : i;
    const sx = x + 6 + k * seg;
    const keen = i < e;
    g.fillStyle(keen ? 0xdfe8ee : 0x6a6a70, 1);
    g.fillTriangle(sx, y + 12, sx + seg, y + 12, sx + seg, y + 2);
    g.fillRect(sx, y + 2, seg, 1);
    if (keen) { g.fillStyle(0xffffff, 0.9); g.fillRect(sx + 2, y + 11, seg - 4, 1); }
    else { g.fillStyle(0x000000, 0.6); g.fillTriangle(sx + 8, y + 12, sx + 16, y + 12, sx + 12, y + 6); }
  }
  // Tang and grip in the fighter's colour.
  const hx = flip ? x + 6 + NOTCHES * seg : x - 2;
  g.fillStyle(OAK_DARK, 1); g.fillRect(hx, y + 2, 8, 10);
  g.fillStyle(side, 1); g.fillRect(hx + 2, y + 4, 4, 6);
  if (e === 0) { g.lineStyle(2, ROUGE, 0.6 + 0.4 * Math.sin(time / 110)); g.strokeRoundedRect(x - 4, y - 4, 178, 22, 5); }
}

export const KEEN_EDGE: GimmickDef = {
  id: ID,
  rules: 'Every blow you land dulls your edge: keen hits hard, blunt can\'t swing. Grind at a wheel — its sparks fly out the far side, on whoever stands there.',
  make,
};
