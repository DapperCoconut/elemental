import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { DUST, DUST_DARK, DUST_LIT, ROPE, SCREE, SCREE_DARK, SCREE_DEEP, TIMBER_DARK } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Prints in the Dust — Tracker Quenby Lusk, the picker who, in the King's telling, found the hiding
 * families for the Regent's men: the whole buried capital is packed dust, and she could read who
 * had walked it, and when, and where they had gone to ground.
 *
 * Every step you take leaves a print in the dust, and they fade slowly. Quenby's lurcher — a dog of
 * dust and grit — is slipped onto the oldest of them and runs your trail print by print, faster than
 * you walk, biting anyone it passes. Reach your feet and it has you. Where your trail crosses
 * itself it cuts the corner and jumps ahead, so walking in circles feeds it. A dash, blink or leap
 * leaves no prints: at the gap it loses the scent, casts about, and has to be slipped again.
 *
 * The exploit is the trail itself: lay it past Quenby and the dog bites her as it goes by. Halfway
 * down she "reads the old ground": prints last longer, and every print older than a few seconds sets
 * as a snare of twisted rope — step back over your own old trail and you are caught. Hers too, if
 * you walk your snares round her. The bot keeps off the dog's road ahead and off set snares.
 */

const ID = fallenId('rubble', 'coldtrail');
const STRIDE = 24;
const GAP = 70;
const DOG_SPEED = 320;
const BITE_R = 28;
const SNARE_AGE = 4500;

interface Print { x: number; y: number; t: number; a: number; gap: boolean; left: boolean; snare: boolean }
type DogState = 'kennel' | 'run' | 'lost';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, top, player, npc, tk } = ctx;
  const prints: Print[] = [];
  let lastX = 0, lastY = 0;
  let leftFoot = false;
  let started = false;
  let reading = false;
  let life = 7000;
  let gapNext = false;
  const dog = { x: 0, y: 0, i: 0, state: 'kennel' as DogState, until: 0, heading: 0, bitAt: new Map<Fighter, number>() };

  function slip(time: number): void {
    if (prints.length < 4) { dog.state = 'kennel'; dog.until = time + 600; return; }
    dog.state = 'run';
    dog.i = 0;
    dog.x = prints[0].x; dog.y = prints[0].y;
    ctx.sfx('roar');
  }

  function bite(f: Fighter, time: number): boolean {
    if (!alive(f) || ctx.isAirborne(f) || dist(dog.x, dog.y, f.x, f.y) > BITE_R + 18) return false;
    if (time - (dog.bitAt.get(f) ?? -1e9) < 1400) return false;
    dog.bitAt.set(f, time);
    if (f === player) { tk.hitPlayer(16, f.x, f.y); ctx.root(f, 450); }
    else { ctx.hit(npc, 26, f.x, f.y); ctx.root(npc, 650); ctx.float(npc.x, npc.y - 56, 'BITTEN', '#e6d2a8'); }
    ctx.sfx('slash');
    return true;
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; lastX = player.x; lastY = player.y; dog.x = npc.x; dog.y = npc.y; dog.until = time + 3000; }
      if (!reading && npc.hp < npc.maxHp * 0.5) {
        reading = true; life = 11000;
        ctx.banner('SHE READS THE OLD GROUND — OLD PRINTS SNARE', '#e6d2a8');
        ctx.sfx('trap-set');
      }

      // Lay prints: one per stride; a jump leaves no prints between.
      if (alive(player)) {
        const d = dist(lastX, lastY, player.x, player.y);
        if (ctx.dashing(player) || ctx.isAirborne(player) || d > GAP) { gapNext = true; if (d > GAP) { lastX = player.x; lastY = player.y; } }
        else if (d >= STRIDE) {
          leftFoot = !leftFoot;
          prints.push({ x: player.x, y: player.y + 10, t: time, a: Math.atan2(player.y - lastY, player.x - lastX), gap: gapNext, left: leftFoot, snare: false });
          gapNext = false;
          lastX = player.x; lastY = player.y;
        }
      }
      // Old prints blow away; under the reading, older ones set as snares.
      while (prints.length && time - prints[0].t > life) { prints.shift(); dog.i = Math.max(0, dog.i - 1); }
      if (reading) for (const p of prints) if (!p.snare && time - p.t > SNARE_AGE) p.snare = true;
      for (let i = prints.length - 1; i >= 0; i--) {
        const p = prints[i];
        if (!p.snare) continue;
        for (const f of [player, npc]) {
          if (!alive(f) || ctx.isAirborne(f) || dist(p.x, p.y - 10, f.x, f.y) > 18) continue;
          if (f === player) { tk.hitPlayer(8, f.x, f.y); ctx.root(f, 700); }
          else { ctx.hit(npc, 14, f.x, f.y); ctx.root(npc, 950); ctx.float(npc.x, npc.y - 56, 'SNARED', '#d8b880'); }
          ctx.sfx('trap-snap');
          prints.splice(i, 1);
          if (dog.i > i) dog.i--;
          break;
        }
      }

      // The lurcher.
      if (dog.state === 'kennel') {
        dog.x += (npc.x - dog.x) * Math.min(1, dt * 4); dog.y += (npc.y + 20 - dog.y) * Math.min(1, dt * 4);
        if (time >= dog.until && alive(npc)) slip(time);
      } else if (dog.state === 'lost') {
        dog.heading += dt * 7;
        if (time >= dog.until) { dog.state = 'kennel'; dog.until = time + 900; }
      } else {
        let step = DOG_SPEED * (reading ? 1.1 : 1) * dt;
        while (step > 0 && dog.i < prints.length) {
          const p = prints[dog.i];
          if (p.gap && dog.i > 0) { dog.state = 'lost'; dog.until = time + 1300; ctx.float(dog.x, dog.y - 30, '?', '#e6d2a8'); break; }
          const d = dist(dog.x, dog.y, p.x, p.y);
          if (d <= step) { dog.x = p.x; dog.y = p.y; step -= d; dog.i++; }
          else { dog.heading = Math.atan2(p.y - dog.y, p.x - dog.x); dog.x += ((p.x - dog.x) / d) * step; dog.y += ((p.y - dog.y) / d) * step; step = 0; }
          // Cutting the corner where the trail crosses itself.
          for (let j = prints.length - 1; j > dog.i + 6; j--) {
            if (dist(prints[j].x, prints[j].y, dog.x, dog.y) < 34 && !prints.slice(dog.i + 1, j + 1).some((q) => q.gap)) { dog.i = j; break; }
          }
        }
        if (dog.state === 'run') {
          bite(npc, time);
          if (bite(player, time)) { dog.state = 'kennel'; dog.until = time + 1500; }
          else if (dog.i >= prints.length) {
            // At your heels: it runs you down.
            const d = dist(dog.x, dog.y, player.x, player.y);
            if (d > 2) { dog.heading = Math.atan2(player.y - dog.y, player.x - dog.x); dog.x += ((player.x - dog.x) / d) * Math.min(d, DOG_SPEED * dt); dog.y += ((player.y + 10 - dog.y) / d) * Math.min(d, DOG_SPEED * dt); }
          }
        }
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      const road = dog.state === 'run' ? prints.slice(dog.i, dog.i + 30) : [];
      let best = { x: npc.x, y: npc.y }, bs = -Infinity;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const x = tk.clampX(player.x + Math.cos(a) * 240), y = tk.clampY(player.y + Math.sin(a) * 200);
        let sc = -dist(npc.x, npc.y, x, y) * 0.3;
        for (const p of road) { const d = dist(p.x, p.y, x, y); if (d < 70) sc -= 300 - d * 3; }
        for (const p of prints) if (p.snare || (reading && tk.now - p.t > SNARE_AGE - 800)) { const d = dist(p.x, p.y, x, y); if (d < 40) sc -= 200; }
        // Mind the line from here to there too.
        for (const p of road) if (dist(p.x, p.y, (x + npc.x) / 2, (y + npc.y) / 2) < 50) sc -= 120;
        if (sc > bs) { bs = sc; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      for (let i = 0; i < prints.length; i++) {
        const p = prints[i];
        const age = (time - p.t) / life;
        const hot = dog.state === 'run' && i >= dog.i && i < dog.i + 14;
        if (p.snare) drawSnare(g, p, time);
        else drawPrint(g, p, clamp(1 - age, 0, 1), hot, reading && time - p.t > SNARE_AGE - 900);
      }
      if (dog.state === 'lost') {
        g.lineStyle(1.5, DUST_LIT, 0.5); g.strokeEllipse(dog.x, dog.y + 6, 60 + Math.sin(time / 120) * 8, 24);
      }
    },

    drawAir(g, time) {
      drawLurcher(g, dog.x, dog.y, dog.heading, time, dog.state);
    },

    drawHud(g) {
      // How much trail lies between the dog and you: paw pips that go out as it closes.
      const x0 = W / 2 - 60, y = top + 18;
      const left = dog.state === 'run' ? prints.length - dog.i : prints.length;
      const n = clamp(Math.ceil(left / 6), 0, 10);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 10, y - 12, 140, 24, 6);
      for (let k = 0; k < 10; k++) drawPaw(g, x0 + k * 12 + 4, y, k < n ? (dog.state === 'run' && n < 3 ? 0xff9a5a : DUST_LIT) : SCREE_DEEP);
    },
  };
}

/** A boot print in the dust, hobnails showing; fading with age, warming on the dog's road ahead. */
function drawPrint(g: G, p: Print, k: number, hot: boolean, setting: boolean): void {
  const side = p.left ? -1 : 1;
  const ox = Math.cos(p.a + Math.PI / 2) * 6 * side, oy = Math.sin(p.a + Math.PI / 2) * 6 * side;
  const x = p.x + ox, y = p.y + oy;
  const ux = Math.cos(p.a), uy = Math.sin(p.a);
  g.fillStyle(DUST_DARK, 0.6 * k); g.fillEllipse(x + ux * 3, y + uy * 3, 9, 6);
  g.fillStyle(DUST_DARK, 0.55 * k); g.fillEllipse(x - ux * 5, y - uy * 5, 7, 5);
  g.fillStyle(SCREE_DARK, 0.6 * k);
  for (let i = 0; i < 3; i++) g.fillCircle(x + ux * (5 - i * 3), y + uy * (5 - i * 3), 0.9);
  if (hot) { g.lineStyle(1.2, 0xffb070, 0.6 * k); g.strokeEllipse(x, y, 16, 10); }
  if (setting) { g.lineStyle(1, ROPE, 0.5); g.strokeCircle(x, y, 7); }
}

/** A set snare: a loop of twisted rope round a peg in the old print, dust kicked over it. */
function drawSnare(g: G, p: Print, time: number): void {
  g.fillStyle(DUST_DARK, 0.5); g.fillEllipse(p.x, p.y, 26, 12);
  g.lineStyle(2.2, ROPE, 0.95); g.strokeEllipse(p.x, p.y, 22 + Math.sin(time / 300 + p.t) * 1.5, 10);
  g.lineStyle(1, TIMBER_DARK, 0.8); g.strokeEllipse(p.x, p.y, 18, 7);
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(p.x + 9, p.y - 9, 3, 9);
  g.lineStyle(1.5, ROPE, 0.9); g.lineBetween(p.x + 10, p.y - 8, p.x + 4, p.y - 2);
}

/** A paw print for the HUD. */
function drawPaw(g: G, x: number, y: number, c: number): void {
  g.fillStyle(c, 1); g.fillEllipse(x, y + 2, 6, 5);
  for (let i = 0; i < 3; i++) g.fillCircle(x - 3 + i * 3, y - 3 + (i === 1 ? -1 : 0), 1.5);
}

/**
 * Quenby's lurcher: a long dog of dust and grit, ribs of scree showing, ears back, nose to the
 * trail; it streams dust behind it as it runs, sits ragged at her heel in the kennel, circles lost.
 */
function drawLurcher(g: G, x: number, y: number, a: number, time: number, state: DogState): void {
  const run = state === 'run';
  const dir = Math.cos(a) >= 0 ? 1 : -1;
  const gait = run ? time / 55 : time / 300;
  shadow(g, x, y + 4, 46, 12, 0.3);
  if (run) for (let i = 0; i < 6; i++) {
    const ph = ((time / 180) + i / 6) % 1;
    g.fillStyle(DUST, 0.45 * (1 - ph)); g.fillCircle(x - Math.cos(a) * (18 + ph * 40), y - 8 - ph * 10 - Math.sin(a) * (18 + ph * 40), 5 + ph * 8);
  }
  // Legs: four thin strokes, scissoring.
  for (let i = 0; i < 4; i++) {
    const lx = x + dir * (i < 2 ? 12 : -12) + (i % 2 ? 3 : -3);
    const sw = Math.sin(gait + i * 1.6) * (run ? 7 : 1.5);
    g.lineStyle(3, SCREE_DARK, 1); g.lineBetween(lx, y - 10, lx + sw, y);
  }
  // Body: a deep chest, tucked waist.
  g.fillStyle(DUST_DARK, 1); g.fillEllipse(x + dir * 6, y - 14, 26, 14);
  g.fillStyle(DUST_DARK, 1); g.fillEllipse(x - dir * 10, y - 13, 18, 10);
  g.fillStyle(DUST, 1); g.fillEllipse(x + dir * 5, y - 16, 20, 8);
  for (let i = 0; i < 3; i++) { g.lineStyle(1, SCREE, 0.8); g.lineBetween(x + dir * (i * 4), y - 19, x + dir * (i * 4 - 2), y - 10); }
  // Tail, streaming.
  g.lineStyle(2.5, DUST_DARK, 1); g.lineBetween(x - dir * 18, y - 15, x - dir * 30, y - 18 + Math.sin(time / 90) * 3);
  // Neck and long head, nose down to the trail when running.
  const hx = x + dir * 22, hy = y - (run ? 14 : 22);
  g.lineStyle(5, DUST_DARK, 1); g.lineBetween(x + dir * 12, y - 18, hx, hy);
  g.fillStyle(DUST, 1); g.fillEllipse(hx + dir * 4, hy, 14, 7);
  g.fillStyle(SCREE_DEEP, 1); g.fillCircle(hx + dir * 11, hy + 1, 2);
  g.fillStyle(DUST_DARK, 1); g.fillTriangle(hx - dir * 2, hy - 3, hx - dir * 8, hy - 8, hx - dir * 6, hy - 1);
  g.fillStyle(0xffa040, 1); g.fillCircle(hx + dir * 4, hy - 2, 1.4);
  if (state === 'lost') { g.lineStyle(1, DUST_LIT, 0.8); g.strokeCircle(hx + dir * 12, hy, 4 + Math.sin(time / 80) * 2); }
}

export const FALLEN_COLDTRAIL: GimmickDef = {
  id: ID,
  rules: 'Her dog runs your prints from the oldest, biting all it passes. Crossing your trail feeds it; a dash breaks it. Lead it past her. Later, prints snare.',
  make,
};
