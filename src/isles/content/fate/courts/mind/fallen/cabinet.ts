import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  CANDLE, GILT, GILT_DARK, GILT_LIT, IVORY, MIND, MIND_LIT, VELVET, VELVET_DARK, VELVET_LIT, WOOD, WOOD_DARK, WOOD_LIT,
} from '../palette';
import { alive, clamp, dist, segDist } from '../util';

/**
 * The Spirit Cabinet — Jubal Fother, Cabinet-Medium of Séance Row, whose act was the old one: the
 * medium roped to a bench inside a tall wooden cabinet, the doors shut, and in the dark the
 * spirits play — a tambourine shakes, a handbell rings, a tin trumpet speaks. In the King's
 * telling the trumpet spoke the names of the evening's bluffers, and the House wrote them down.
 *
 * The cabinet stands in the middle of the yard with its doors open. When they swing shut,
 * whoever is standing inside it is the medium, and the spirits play *for* them: the instruments
 * rise out of the cabinet's crown and fly at the other fighter — the tambourine and the bell land
 * on a ring, the trumpet blares down a line. The cabinet's planks take half of every blow on the
 * medium, and the other fighter cannot get in. But the act always ends the same way: the three
 * rope knots on the doors slip, and the doors burst open — the medium is exposed (stunned and
 * struck) and anyone close is slammed. Get out before the knots go.
 *
 * Outside, the committee's trick: strike the shut cabinet three times and the doors burst early,
 * exposing whoever is inside. If nobody is in the cabinet when it shuts, the spirits play wild, at
 * whoever is nearer. Halfway down, the instruments come in pairs.
 */

const ID = fallenId('mind', 'cabinet');
const OPEN_MS = 2600;
const SHUT_MS = 6200;
const SLIP_MS = 1500;
const INSIDE_R = 38;
const SLAM_R = 92;
const INSTR_MS = 1250;
const LAND_MS = 1000;

type Kind = 'tambourine' | 'bell' | 'trumpet';
interface Flight { kind: Kind; victim: Fighter; tx: number; ty: number; ang: number; born: number; hitAt: number; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const CX = W / 2, CY = (top + H) / 2 + 40;
  const MOUTH = { x: CX, y: CY - 150 };
  let phase: 'open' | 'shut' = 'open';
  let phaseAt = 0;
  let burstAt = 0;
  let slipWarned = false;
  let medium: Fighter | null = null;
  let mediumLeft = false;
  let knocks = 0;
  let nextInstr = 0;
  let order = 0;
  let pairs = false;
  let started = false;
  let burstFx = -1e9;
  const flights: Flight[] = [];
  let cab: StrikeTarget | null = null;

  const inside = (f: Fighter) => alive(f) && dist(f.x, f.y, CX, CY) < INSIDE_R;
  const other = (f: Fighter) => (f === player ? npc : player);
  const shutNow = (time: number) => phase === 'shut' && time < burstAt;

  function burst(time: number): void {
    phase = 'open';
    phaseAt = time;
    burstFx = time;
    ctx.sfx('explosion-medium');
    for (const f of [player, npc]) {
      if (!alive(f)) continue;
      const d = dist(f.x, f.y, CX, CY);
      if (f === medium && !mediumLeft && d < INSIDE_R + 8) {
        // Exposed: the lamp is on them, the rope is round their wrists.
        if (f === player) { tk.hitPlayer(24, f.x, f.y); tk.stun(1100); }
        else { ctx.hit(npc, 34, f.x, f.y); ctx.stun(npc, 1100); }
        ctx.flash(f.x, f.y, CANDLE);
      } else if (d < SLAM_R) {
        if (f === player) tk.hitPlayer(14, f.x, f.y); else ctx.hit(npc, 20, f.x, f.y);
        const a = Math.atan2(f.y - CY, f.x - CX);
        ctx.nudge(f, Math.cos(a) * 60, Math.sin(a) * 40);
      }
    }
    medium = null;
    flights.length = 0;
  }

  function launch(time: number, victim: Fighter, delay: number): void {
    const kinds: Kind[] = ['tambourine', 'trumpet', 'bell'];
    const kind = kinds[order++ % 3];
    const ang = Math.atan2(victim.y - MOUTH.y, victim.x - MOUTH.x);
    flights.push({ kind, victim, tx: victim.x, ty: victim.y, ang, born: time + delay, hitAt: time + delay + tk.warn(LAND_MS), done: false });
    ctx.sfx(kind === 'bell' ? 'crystal-chime' : kind === 'trumpet' ? 'beam-charge' : 'dice');
  }

  function land(fl: Flight): void {
    fl.done = true;
    const f = fl.victim;
    if (!alive(f)) return;
    let hit = false;
    if (fl.kind === 'trumpet') hit = segDist(f.x, f.y, MOUTH.x, MOUTH.y, MOUTH.x + Math.cos(fl.ang) * 1200, MOUTH.y + Math.sin(fl.ang) * 1200) < 36;
    else hit = dist(f.x, f.y, fl.tx, fl.ty) < (fl.kind === 'tambourine' ? 64 : 54);
    ctx.sfx(fl.kind === 'trumpet' ? 'sonic-pulse' : fl.kind === 'bell' ? 'clang' : 'drum-hit');
    if (!hit) return;
    const dmg = fl.kind === 'trumpet' ? 18 : fl.kind === 'tambourine' ? 16 : 12;
    if (f === player) tk.hitPlayer(dmg, f.x, f.y); else ctx.hit(npc, Math.round(dmg * 1.5), f.x, f.y);
    if (fl.kind === 'bell') ctx.silence(f, 1500);
  }

  return {
    update(time) {
      if (!started) {
        started = true;
        phaseAt = time + 800;
        cab = ctx.target({
          x: CX, y: CY - 80, r: 52,
          onStruck: (by) => {
            const t = ctx.scene.time.now;
            if (!shutNow(t) || !medium || mediumLeft) return;
            if ((by === 'player') === (medium === player)) return;
            knocks++;
            ctx.sfx('hammer-forge');
            if (knocks >= 3 && burstAt - t > 650) {
              burstAt = t + 650;
              slipWarned = true;
              ctx.sfx('snap-back');
            }
          },
        });
      }
      if (!pairs && npc.hp < npc.maxHp * 0.5) { pairs = true; ctx.banner('THE SPIRITS COME IN PAIRS', '#e2ccff'); ctx.sfx('curse-cast'); }

      if (phase === 'open' && time >= phaseAt + OPEN_MS) {
        phase = 'shut';
        phaseAt = time;
        burstAt = time + SHUT_MS;
        slipWarned = false;
        knocks = 0;
        mediumLeft = false;
        const pin = inside(player), nin = inside(npc);
        medium = pin && nin ? (dist(player.x, player.y, CX, CY) <= dist(npc.x, npc.y, CX, CY) ? player : npc) : pin ? player : nin ? npc : null;
        nextInstr = time + 600;
        ctx.sfx('trap-snap');
      }
      if (phase === 'shut') {
        if (medium && !mediumLeft && !inside(medium)) mediumLeft = true;
        // The bolted doors put an outsider back out.
        for (const f of [player, npc]) {
          if (f === medium && !mediumLeft) continue;
          const d = dist(f.x, f.y, CX, CY);
          if (alive(f) && d < INSIDE_R + 6) {
            const a = d > 1 ? Math.atan2(f.y - CY, f.x - CX) : Math.PI / 2;
            ctx.nudge(f, Math.cos(a) * (INSIDE_R + 14 - d), Math.sin(a) * (INSIDE_R + 14 - d));
          }
        }
        if (!slipWarned && time >= burstAt - tk.warn(SLIP_MS)) { slipWarned = true; ctx.sfx('countdown-tick'); }
        if (time >= nextInstr && time < burstAt - 700) {
          const victims: Fighter[] = medium && !mediumLeft ? [other(medium)]
            : medium ? [] : [dist(player.x, player.y, CX, CY) < dist(npc.x, npc.y, CX, CY) ? player : npc];
          for (const v of victims) {
            if (!alive(v)) continue;
            launch(time, v, 0);
            if (pairs) launch(time, v, 380);
          }
          nextInstr = time + INSTR_MS;
        }
        if (time >= burstAt) burst(time);
      }
      for (const fl of flights) if (!fl.done && time >= fl.hitAt) land(fl);
      for (let i = flights.length - 1; i >= 0; i--) if (flights[i].done && time > flights[i].hitAt + 400) flights.splice(i, 1);
    },

    playerTakenMult() { return medium === player && !mediumLeft && shutNow(ctx.scene.time.now) ? 0.5 : 1; },
    npcTakenMult() { return medium === npc && !mediumLeft && shutNow(ctx.scene.time.now) ? 0.5 : 1; },

    npcSeek() {
      if (!alive(npc)) return null;
      const time = ctx.scene.time.now;
      const slipping = phase === 'shut' && time >= burstAt - tk.warn(SLIP_MS) - 300;
      const away = () => {
        const a = Math.atan2(npc.y - CY, npc.x - CX) + (Math.abs(npc.x - CX) < 4 ? 1 : 0);
        return { x: clamp(CX + Math.cos(a) * 150, 60, W - 60), y: clamp(CY + Math.sin(a) * 150, top + 50, H - 50) };
      };
      if (phase === 'open') return { x: CX, y: CY };
      if (medium === npc && !mediumLeft) return slipping ? away() : { x: CX, y: CY };
      if (medium === player && !mediumLeft) {
        if (slipping) return away();
        const a = Math.atan2(npc.y - CY, npc.x - CX);
        return { x: CX + Math.cos(a) * 100, y: CY + Math.sin(a) * 100 };
      }
      return slipping && dist(npc.x, npc.y, CX, CY) < SLAM_R + 30 ? away() : null;
    },

    drawGround(g, time) {
      // The committee's chalk circle round the cabinet, and the slam ring when the knots slip.
      g.lineStyle(2, IVORY, 0.25); g.strokeCircle(CX, CY, SLAM_R);
      const slip = phase === 'shut' && time >= burstAt - tk.warn(SLIP_MS);
      if (slip) {
        const k = clamp(1 - (burstAt - time) / tk.warn(SLIP_MS), 0, 1);
        g.fillStyle(CANDLE, 0.08 + 0.14 * k); g.fillCircle(CX, CY, SLAM_R);
        g.lineStyle(3, CANDLE, 0.5 + 0.5 * k); g.strokeCircle(CX, CY, SLAM_R * (0.4 + 0.6 * k));
      }
      // The cabinet's back wall and floor (the medium stands in front of it), and the bench.
      const bx = CX, by = CY + 10, w = 132, h = 150;
      shadow(g, bx, by, 150, 36, 0.35);
      g.fillStyle(WOOD_DARK, 1); g.fillRect(bx - w / 2, by - h, w, h);
      g.fillStyle(VELVET_DARK, 1); g.fillRect(bx - w / 2 + 8, by - h + 10, w - 16, h - 16);
      for (let i = 0; i < 5; i++) { g.fillStyle(VELVET, 0.5); g.fillRect(bx - w / 2 + 14 + i * 24, by - h + 10, 6, h - 16); }
      g.fillStyle(WOOD, 1); g.fillRect(bx - 46, by - 44, 92, 9);
      g.fillStyle(WOOD_DARK, 1); g.fillRect(bx - 42, by - 35, 5, 30); g.fillRect(bx + 37, by - 35, 5, 30);
      // The rope coiled on the bench, which never held anyone.
      g.lineStyle(2, IVORY, 0.8); g.strokeEllipse(bx + 22, by - 46, 18, 6); g.strokeEllipse(bx + 22, by - 48, 14, 5);
      g.fillStyle(WOOD_LIT, 1); g.fillRect(bx - w / 2 - 4, by - 6, w + 8, 8);
      // Flights' landing marks: a tambourine's jingle ring, a bell's bronze ring, a trumpet's line.
      for (const fl of flights) {
        if (fl.done || time < fl.born) continue;
        const k = clamp((time - fl.born) / Math.max(1, fl.hitAt - fl.born), 0, 1);
        if (fl.kind === 'trumpet') {
          const ex = MOUTH.x + Math.cos(fl.ang) * 1200, ey = MOUTH.y + Math.sin(fl.ang) * 1200;
          g.lineStyle(48, MIND, 0.06 + 0.12 * k); g.lineBetween(MOUTH.x, MOUTH.y, ex, ey);
          g.lineStyle(2, MIND_LIT, 0.3 + 0.5 * k); g.lineBetween(MOUTH.x, MOUTH.y, MOUTH.x + Math.cos(fl.ang) * 1200 * k, MOUTH.y + Math.sin(fl.ang) * 1200 * k);
        } else {
          const r = fl.kind === 'tambourine' ? 64 : 54;
          const col = fl.kind === 'tambourine' ? VELVET_LIT : GILT;
          g.fillStyle(col, 0.06 + 0.14 * k); g.fillCircle(fl.tx, fl.ty, r);
          g.lineStyle(2, col, 0.5 + 0.4 * k); g.strokeCircle(fl.tx, fl.ty, r);
          g.lineStyle(2, col, 0.8); g.strokeCircle(fl.tx, fl.ty, r * (1 - k) + 6);
        }
      }
    },

    drawAir(g, time) {
      const shut = phase === 'shut';
      const occupied = !!(shut && medium && !mediumLeft);
      const bx = CX, by = CY + 10, w = 132, h = 150;
      const fling = clamp((time - burstFx) / 300, 0, 1);
      // The crown: a cornice and a little curtained window where the spirits' hands come out.
      g.fillStyle(WOOD, 1); g.fillRect(bx - w / 2 - 6, by - h - 16, w + 12, 18);
      g.fillStyle(WOOD_LIT, 1); g.fillRect(bx - w / 2 - 10, by - h - 22, w + 20, 7);
      g.fillStyle(GILT_DARK, 1); g.fillCircle(bx, by - h - 26, 6);
      g.fillStyle(VELVET_DARK, 1); g.fillRect(bx - 22, by - h - 14, 44, 12);
      g.fillStyle(VELVET, 1); g.fillTriangle(bx - 22, by - h - 14, bx - 4, by - h - 14, bx - 22, by - h - 2);
      g.fillTriangle(bx + 22, by - h - 14, bx + 4, by - h - 14, bx + 22, by - h - 2);
      if (occupied) glow(g, bx, by - h - 8, 26, MIND, 0.12, 3);
      if (shut) {
        // The doors, shut over the medium: planks, hinges, a brass hasp each.
        for (const side of [-1, 1]) {
          const x0 = side < 0 ? bx - w / 2 : bx;
          g.fillStyle(WOOD, occupied ? 0.86 : 1); g.fillRect(x0, by - h + 2, w / 2, h - 8);
          for (let i = 1; i < 4; i++) { g.lineStyle(1, WOOD_DARK, 0.8); g.lineBetween(x0 + (i * w) / 8, by - h + 4, x0 + (i * w) / 8, by - 8); }
          const hx = x0 + (side < 0 ? 4 : w / 2 - 10);
          g.fillStyle(GILT_DARK, 1); g.fillRect(hx, by - h + 12, 6, 10); g.fillRect(hx, by - 30, 6, 10);
          // A heart-shaped peep-hole, as every cabinet has, glowing when the spirits play.
          const px = x0 + w / 4;
          g.fillStyle(occupied ? MIND_LIT : WOOD_DARK, occupied ? 0.6 + 0.3 * Math.sin(time / 120 + side) : 1);
          g.fillCircle(px - 3, by - h + 28, 4); g.fillCircle(px + 3, by - h + 28, 4); g.fillTriangle(px - 7, by - h + 29, px + 7, by - h + 29, px, by - h + 37);
        }
        // The rope knots across the seam: tight, then slipping one by one (or knocked loose).
        const slipK = clamp(1 - (burstAt - time) / tk.warn(SLIP_MS), 0, 1);
        for (let i = 0; i < 3; i++) {
          const ky = by - h + 52 + i * 32;
          const gone = slipK * 3 > i + 0.01 || knocks > i;
          const sag = gone ? 8 + Math.sin(time / 60 + i) * 2 : 0;
          g.lineStyle(3, IVORY, 0.95);
          g.lineBetween(bx - 20, ky, bx - 4, ky + sag); g.lineBetween(bx + 20, ky, bx + 4, ky + sag);
          g.fillStyle(gone ? CANDLE : IVORY, 1); g.fillCircle(bx, ky + sag, gone ? 3 : 5);
        }
      } else {
        // Doors swung wide on their hinges; flung hard just after a burst.
        for (const side of [-1, 1]) {
          const hinge = bx + side * (w / 2);
          const swing = (w / 2) * (0.38 + 0.3 * (1 - fling));
          g.fillStyle(WOOD, 1);
          g.fillTriangle(hinge, by - h + 2, hinge + side * swing, by - h + 14, hinge, by - 6);
          g.fillTriangle(hinge + side * swing, by - h + 14, hinge + side * swing, by - 14, hinge, by - 6);
          g.lineStyle(1, WOOD_DARK, 0.9);
          g.lineBetween(hinge, by - h + 2, hinge + side * swing, by - h + 14);
          g.lineBetween(hinge + side * swing, by - h + 14, hinge + side * swing, by - 14);
        }
        if (time - burstFx < 500) {
          const k = (time - burstFx) / 500;
          glow(g, bx, by - h / 2, 80 + k * 60, CANDLE, 0.16 * (1 - k), 4);
        }
      }
      // The instruments in flight: out of the crown, up, and down on their mark.
      for (const fl of flights) {
        if (fl.done || time < fl.born) continue;
        const k = clamp((time - fl.born) / Math.max(1, fl.hitAt - fl.born), 0, 1);
        if (fl.kind === 'trumpet') {
          const x = MOUTH.x + Math.cos(fl.ang) * 30, y = MOUTH.y - 18 - Math.sin(k * Math.PI) * 6;
          drawTrumpet(g, x, y, fl.ang, k);
        } else {
          const x = MOUTH.x + (fl.tx - MOUTH.x) * k, y = MOUTH.y + (fl.ty - MOUTH.y) * k - Math.sin(k * Math.PI) * 120;
          if (fl.kind === 'tambourine') drawTambourine(g, x, y, time); else drawBell(g, x, y, time);
        }
      }
    },

    drawHud(g, time) {
      // A cabinet icon: open or shut, the medium's colour on its window, knots remaining.
      const x = W / 2, y = top + 22;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 44, y - 18, 88, 38, 7);
      g.fillStyle(WOOD, 1); g.fillRect(x - 10, y - 13, 20, 28);
      g.fillStyle(phase === 'shut' ? WOOD_DARK : VELVET_DARK, 1); g.fillRect(x - 7, y - 9, 14, 22);
      if (phase === 'shut' && medium && !mediumLeft) {
        g.fillStyle(medium === player ? 0x8af0a0 : 0xff8a6a, 1); g.fillCircle(x, y - 4, 3.5);
      }
      const total = phase === 'shut' ? SHUT_MS : OPEN_MS;
      const left = phase === 'shut' ? clamp((burstAt - time) / total, 0, 1) : clamp((phaseAt + OPEN_MS - time) / total, 0, 1);
      g.lineStyle(3, phase === 'shut' ? CANDLE : GILT_LIT, 0.9);
      g.beginPath(); g.arc(x, y + 1, 17, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      for (let i = 0; i < 3; i++) {
        g.fillStyle(knocks > i ? CANDLE : IVORY, phase === 'shut' ? 1 : 0.35);
        g.fillCircle(x + 26, y - 9 + i * 9, 3);
      }
    },

    destroy() { cab?.remove(); },
  };
}

/** A tin spirit trumpet: a long flared cone, its bell glowing as it draws breath. */
function drawTrumpet(g: G, x: number, y: number, ang: number, k: number): void {
  const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
  const L = 52;
  g.fillStyle(0xb8c0c8, 1);
  g.fillTriangle(x + nx * 2, y + ny * 2, x - nx * 2, y - ny * 2, x + c * L + nx * 13, y + s * L + ny * 13);
  g.fillTriangle(x - nx * 2, y - ny * 2, x + c * L - nx * 13, y + s * L - ny * 13, x + c * L + nx * 13, y + s * L + ny * 13);
  g.lineStyle(2, 0x6a7078, 1); g.lineBetween(x + c * L + nx * 13, y + s * L + ny * 13, x + c * L - nx * 13, y + s * L - ny * 13);
  g.lineStyle(1, 0xffffff, 0.6); g.lineBetween(x + nx, y + ny, x + c * L + nx * 10, y + s * L + ny * 10);
  glow(g, x + c * L, y + s * L, 16 + 14 * k, MIND_LIT, 0.08 + 0.1 * k, 3);
}

/** A tambourine: a hoop with its jingles flashing as it shakes. */
function drawTambourine(g: G, x: number, y: number, time: number): void {
  const wob = Math.sin(time / 40) * 0.25;
  g.fillStyle(IVORY, 0.95); g.fillEllipse(x, y, 30, 22 + wob * 8);
  g.lineStyle(4, WOOD, 1); g.strokeEllipse(x, y, 32, 24 + wob * 8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + time / 200;
    g.fillStyle(GILT_LIT, 1); g.fillCircle(x + Math.cos(a) * 16, y + Math.sin(a) * 12, 2.6);
  }
  g.fillStyle(VELVET, 0.8); g.fillCircle(x, y, 3);
}

/** A brass handbell swinging on its own. */
function drawBell(g: G, x: number, y: number, time: number): void {
  const sw = Math.sin(time / 90) * 0.5;
  const bx = x + sw * 4;
  g.fillStyle(WOOD_DARK, 1); g.fillRect(x - 2, y - 22, 4, 12);
  g.fillStyle(GILT, 1); g.fillTriangle(bx - 12, y + 6, bx + 12, y + 6, bx, y - 12);
  g.fillCircle(bx, y - 8, 6);
  g.fillStyle(GILT_LIT, 1); g.fillTriangle(bx - 9, y + 4, bx - 3, y + 4, bx - 2, y - 8);
  g.fillStyle(GILT_DARK, 1); g.fillEllipse(bx, y + 6, 26, 5);
  g.fillCircle(bx - sw * 6, y + 9, 3);
}

export const FALLEN_CABINET: GimmickDef = {
  id: ID,
  rules: 'Inside the cabinet when its doors shut, you are the medium: the spirits fly at your foe. Get out before the knots slip. Strike it thrice to burst it.',
  make,
};
