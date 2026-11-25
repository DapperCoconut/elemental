import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, BRASS_LIT, CREAM, LAKE, LAKE_DEEP, LAKE_LIT, NAVY_DARK, SCARLET, SCARLET_DARK, SNOW, WOOD,
  WOOD_DARK, WOOD_LIT,
} from '../palette';
import { alive, clamp, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Adrift on the Bandlake — Lorcan Moorby, Stage-Master.
 *
 * The Bandlake's floating stage is where the band plays on summer evenings, and Moorby moors it,
 * rows the bandsmen out and keeps the boat-hook. In the star's telling he keeps the stage for the
 * crown, and anyone he does not want aboard goes in the lake.
 *
 * The fight is on the stage, drifting on the lake on its four lines; whoever is aboard drifts
 * with it. Its brass rail keeps walkers on (and swimmers off) except at the two gangway steps —
 * a dash or a hard knock takes you over it. In the water you swim slowly, and after a moment
 * the cold bites. A capstan stands at each corner of the deck: strike one and its line is wound
 * in, hauling the stage hard toward that shore — away from a foe who is swimming.
 * Past half the swell rises: the stage wanders wider and faster and the lake bites harder.
 */

const BASE: Pt = { x: 480, y: 372 };
const HW = 322;
const HH = 140;
const STEP_HALF = 38;
const SWIM_MULT = 0.5;
const COLD_AFTER_MS = 900;
const COLD_EVERY_MS = 500;
const COLD_DMG = 6;
const HAUL = 130;
const HAUL_MAX = 170;

interface Swim { wetSince: number; nextBite: number }

/** A deck capstan: a brass drum on an iron spindle, four bars, the rope wound round it. */
function capstan(g: G, x: number, y: number, a: number, wound: number): void {
  g.fillStyle(NAVY_DARK, 0.4); g.fillEllipse(x, y + 6, 34, 12);
  g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 13);
  g.fillStyle(BRASS, 1); g.fillCircle(x, y, 11);
  g.lineStyle(3, 0x8a6a42, 1); g.strokeCircle(x, y, 8 + wound * 2);
  g.lineStyle(1, 0xc8a878, 0.8); g.strokeCircle(x, y, 7 + wound * 2);
  for (let i = 0; i < 4; i++) {
    const b = a + (i * Math.PI) / 2;
    g.lineStyle(3.5, WOOD_DARK, 1); g.lineBetween(x + Math.cos(b) * 10, y + Math.sin(b) * 10, x + Math.cos(b) * 22, y + Math.sin(b) * 22);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + Math.cos(b) * 22, y + Math.sin(b) * 22, 2.2);
  }
  g.fillStyle(BRASS_LIT, 1); g.fillCircle(x, y, 3.5);
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const t0 = ctx.scene.time.now;
  let period = 16000, ampX = 100, ampY = 56, cold = COLD_DMG;
  let swell = false;
  let haul = { x: 0, y: 0 }, haulTo = { x: 0, y: 0 };
  let S: Pt = { ...BASE };
  const bollards: Pt[] = [
    { x: 50, y: top + 30 }, { x: W - 50, y: top + 30 }, { x: 50, y: H - 30 }, { x: W - 50, y: H - 30 },
  ];
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const;
  const aboard = new Map<Fighter, boolean>([[player, true], [npc, true]]);
  const swims = new Map<Fighter, Swim>();
  const coolUntil = [0, 0, 0, 0];
  const wound = [0, 0, 0, 0];
  const spin = [0, 0, 0, 0];

  const cornerPt = (i: number): Pt => ({ x: S.x + corners[i][0] * (HW - 26), y: S.y + corners[i][1] * (HH - 22) });
  const inside = (f: Fighter) => Math.abs(f.x - S.x) < HW && Math.abs(f.y - S.y) < HH;
  const steps = (): Pt[] => [{ x: S.x, y: S.y - HH }, { x: S.x, y: S.y + HH }];
  const atStep = (f: Fighter) => steps().some((p) => Math.abs(f.x - p.x) < STEP_HALF && Math.abs(f.y - p.y) < 36);

  const caps: StrikeTarget[] = corners.map((_, i) => {
    const p = cornerPt(i);
    return ctx.target({
      x: p.x, y: p.y, r: 22,
      onStruck(by) {
        const now = ctx.scene.time.now;
        if (now < coolUntil[i]) return;
        coolUntil[i] = now + 1300;
        const b = bollards[i];
        const dx = b.x - BASE.x, dy = b.y - BASE.y, m = Math.hypot(dx, dy) || 1;
        haulTo = { x: haulTo.x + (dx / m) * HAUL, y: haulTo.y + (dy / m) * HAUL };
        const hm = Math.hypot(haulTo.x, haulTo.y);
        if (hm > HAUL_MAX) haulTo = { x: (haulTo.x / hm) * HAUL_MAX, y: (haulTo.y / hm) * HAUL_MAX };
        wound[i] = 1;
        ctx.float(cornerPt(i).x, cornerPt(i).y - 34, by === 'player' ? 'HAUL AWAY!' : 'He hauls her over!', by === 'player' ? '#9ad0ff' : '#ffb070');
        ctx.sfx('chain');
      },
    });
  });

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!swell && alive(npc) && npc.hp / npc.maxHp < 0.5) {
        swell = true;
        period = 11000; ampX = 128; ampY = 70; cold = 8;
        ctx.banner('The swell is up — the stage wanders wider and the lake bites harder.', '#bfe4ff');
        ctx.sfx('splash');
      }
      // The drift: a slow figure of eight on the swell, plus whatever the capstans have hauled.
      haul = { x: haul.x + (haulTo.x - haul.x) * Math.min(1, dt * 2.4), y: haul.y + (haulTo.y - haul.y) * Math.min(1, dt * 2.4) };
      haulTo = { x: haulTo.x * (1 - dt * 0.1), y: haulTo.y * (1 - dt * 0.1) };
      const ph = ((time - t0) / period) * Math.PI * 2;
      const nx = clamp(BASE.x + Math.sin(ph) * ampX + haul.x, HW + 18, W - HW - 18);
      const ny = clamp(BASE.y + Math.sin(ph * 2) * ampY * 0.5 + haul.y, top + HH + 8, H - HH - 8);
      const dx = nx - S.x, dy = ny - S.y;
      const was = S;
      S = { x: nx, y: ny };
      for (let i = 0; i < 4; i++) { wound[i] = Math.max(0, wound[i] - dt * 0.7); spin[i] += (wound[i] * 8 + 0.2) * dt; caps[i].moveTo(cornerPt(i).x, cornerPt(i).y); }

      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const on = aboard.get(f) ?? true;
        if (on) {
          // Carried with the deck, as long as they were on it before it moved.
          if (Math.abs(f.x - was.x) < HW && Math.abs(f.y - was.y) < HH) ctx.nudge(f, dx, dy);
          if (!inside(f)) {
            if (atStep(f) || ctx.dashing(f) || Math.abs(f.x - S.x) > HW + 14 || Math.abs(f.y - S.y) > HH + 14) {
              aboard.set(f, false);
              swims.set(f, { wetSince: time, nextBite: time + COLD_AFTER_MS });
              ctx.float(f.x, f.y - 40, 'SPLASH!', '#bfe4ff');
              ctx.sfx('splash');
            } else {
              // The rail holds a walker on the deck.
              ctx.nudge(f, clamp(f.x, S.x - HW + 3, S.x + HW - 3) - f.x, clamp(f.y, S.y - HH + 3, S.y + HH - 3) - f.y);
            }
          }
        } else {
          if (inside(f)) {
            if (atStep(f) || ctx.dashing(f)) {
              aboard.set(f, true); swims.delete(f);
              ctx.float(f.x, f.y - 40, 'aboard', '#ffe2a8');
            } else {
              // The rail (and the moving hull) shoves a swimmer back out to the nearest side.
              const ox = HW - Math.abs(f.x - S.x), oy = HH - Math.abs(f.y - S.y);
              if (ox < oy) ctx.nudge(f, Math.sign(f.x - S.x || 1) * (ox + 3), 0);
              else ctx.nudge(f, 0, Math.sign(f.y - S.y || 1) * (oy + 3));
            }
          }
          const s = swims.get(f);
          if (s && time >= s.nextBite) {
            s.nextBite = time + COLD_EVERY_MS;
            ctx.hit(f, cold, f.x, f.y);
          }
        }
      }
    },

    playerSpeedMult() { return aboard.get(player) === false ? SWIM_MULT : 1; },
    npcSpeedMult() { return aboard.get(npc) === false ? SWIM_MULT : 1; },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      if (aboard.get(npc) === false) {
        // Swim for the nearer gangway step.
        const st = steps();
        const p = Math.hypot(st[0].x - npc.x, st[0].y - npc.y) < Math.hypot(st[1].x - npc.x, st[1].y - npc.y) ? st[0] : st[1];
        return { x: p.x, y: p.y + (p.y < S.y ? -6 : 6) };
      }
      if (aboard.get(player) === false) {
        // Haul the stage away from the swimmer: go to the capstan farthest from them.
        let bi = 0, bd = -1;
        for (let i = 0; i < 4; i++) { const c = cornerPt(i); const d = Math.hypot(c.x - player.x, c.y - player.y); if (d > bd && ctx.scene.time.now >= coolUntil[i]) { bd = d; bi = i; } }
        const c = cornerPt(bi);
        return { x: c.x - corners[bi][0] * 30, y: c.y - corners[bi][1] * 26 };
      }
      // Aboard together: keep to the middle of the deck, away from the rail.
      return { x: clamp(S.x + (npc.x < player.x ? -150 : 150), S.x - HW + 70, S.x + HW - 70), y: clamp(player.y, S.y - HH + 50, S.y + HH - 50) };
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The lake, rippling, with the shore bollards and the lines out to them.
      g.fillStyle(LAKE_DEEP, 1); g.fillRect(0, top, W, H - top);
      for (let y = top + 14; y < H; y += 26) {
        for (let x = (y / 26) % 2 ? 0 : 40; x < W; x += 80) {
          const o = Math.sin(t * 1.4 + x * 0.02 + y * 0.05) * 8;
          g.lineStyle(2, LAKE_LIT, 0.18); g.lineBetween(x + o, y, x + 34 + o, y + Math.sin(t + x) * 2);
        }
      }
      g.fillStyle(LAKE, 0.5); g.fillRect(S.x - HW - 22, S.y - HH - 18, HW * 2 + 44, HH * 2 + 36);
      for (let i = 0; i < 4; i++) {
        const b = bollards[i], c = cornerPt(i);
        const sag = 18 * (1 - wound[i]);
        g.lineStyle(3, 0x8a6a42, 1);
        g.beginPath(); g.moveTo(c.x, c.y);
        for (let k = 1; k <= 10; k++) { const u = k / 10; g.lineTo(c.x + (b.x - c.x) * u, c.y + (b.y - c.y) * u + Math.sin(Math.PI * u) * sag); }
        g.strokePath();
        g.fillStyle(dim(BRASS_DARK, 0.3), 1); g.fillCircle(b.x, b.y + 3, 13);
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(b.x, b.y, 11);
        g.fillStyle(BRASS_LIT, 1); g.fillCircle(b.x - 3, b.y - 3, 4);
      }
      // The pontoon drums under the deck, a ring of wash round the hull.
      g.lineStyle(4, LAKE_LIT, 0.35 + Math.sin(t * 2) * 0.1); g.strokeRect(S.x - HW - 6, S.y - HH - 6, HW * 2 + 12, HH * 2 + 12);
      g.fillStyle(WOOD_DARK, 1); g.fillRect(S.x - HW, S.y - HH, HW * 2, HH * 2 + 10);
      // Deck boards running east–west, cream-painted footlight strip at the front.
      for (let y = S.y - HH, row = 0; y < S.y + HH; y += 20, row++) {
        g.fillStyle(row % 2 ? WOOD : lit(WOOD, 0.08), 1); g.fillRect(S.x - HW, y, HW * 2, 19);
        g.lineStyle(1, WOOD_DARK, 0.7); g.lineBetween(S.x - HW, y + 19, S.x + HW, y + 19);
        for (let x = S.x - HW + ((row * 97) % 140); x < S.x + HW; x += 140) { g.lineBetween(x, y, x, y + 19); g.fillStyle(WOOD_DARK, 1); g.fillCircle(x + 4, y + 10, 1.2); }
      }
      g.fillStyle(SCARLET_DARK, 1); g.fillRect(S.x - 120, S.y - 30, 240, 60);
      g.fillStyle(SCARLET, 1); g.fillRect(S.x - 116, S.y - 26, 232, 52);
      g.lineStyle(2, BRASS_LIT, 0.8); g.strokeRect(S.x - 110, S.y - 20, 220, 40);
      // The brass rail round the deck, broken at the two gangway steps.
      const rail = (x1: number, y1: number, x2: number, y2: number) => {
        g.lineStyle(5, BRASS_DARK, 1); g.lineBetween(x1, y1, x2, y2);
        g.lineStyle(2, BRASS_LIT, 1); g.lineBetween(x1, y1 - 1, x2, y2 - 1);
      };
      const L = S.x - HW, R = S.x + HW, T = S.y - HH, B = S.y + HH;
      rail(L, T, S.x - STEP_HALF, T); rail(S.x + STEP_HALF, T, R, T);
      rail(L, B, S.x - STEP_HALF, B); rail(S.x + STEP_HALF, B, R, B);
      rail(L, T, L, B); rail(R, T, R, B);
      for (let x = L; x <= R; x += 46) for (const y of [T, B]) if (Math.abs(x - S.x) > STEP_HALF) { g.fillStyle(BRASS, 1); g.fillCircle(x, y, 3); }
      for (let y = T; y <= B; y += 46) for (const x of [L, R]) { g.fillStyle(BRASS, 1); g.fillCircle(x, y, 3); }
      // Gangway steps: three treads down to the water, white life-rings hung beside.
      for (const p of steps()) {
        const s = p.y < S.y ? -1 : 1;
        for (let k = 0; k < 3; k++) { g.fillStyle(k % 2 ? WOOD_LIT : WOOD, 1); g.fillRect(p.x - STEP_HALF + 4, p.y + s * (k * 7) - (s < 0 ? 7 : 0), STEP_HALF * 2 - 8, 6); }
        g.lineStyle(4, SNOW, 1); g.strokeCircle(p.x + STEP_HALF + 14, p.y, 9);
        g.lineStyle(4, SCARLET, 1); g.beginPath(); g.arc(p.x + STEP_HALF + 14, p.y, 9, 0, 0.8, false); g.strokePath();
        g.beginPath(); g.arc(p.x + STEP_HALF + 14, p.y, 9, Math.PI, Math.PI + 0.8, false); g.strokePath();
      }
      // The capstans.
      for (let i = 0; i < 4; i++) { const c = cornerPt(i); capstan(g, c.x, c.y, spin[i], wound[i]); }
      // Swimmers: rings of ripples round anyone in the lake.
      for (const f of [player, npc]) {
        if (aboard.get(f) !== false || !alive(f)) continue;
        for (let k = 0; k < 3; k++) {
          const r = 18 + ((time / 18 + k * 12) % 36);
          g.lineStyle(2, CREAM, 0.5 * (1 - (r - 18) / 36)); g.strokeEllipse(f.x, f.y + 4, r * 2, r * 0.8);
        }
      }
    },

    drawHud(g, time) {
      // A cold gauge for whoever is swimming: a frost-rimmed thermometer.
      const x = W - 46, y = top + 12;
      g.fillStyle(NAVY_DARK, 0.75); g.fillRoundedRect(x - 30, y - 6, 60, 52, 8);
      g.lineStyle(1.5, BRASS, 0.9); g.strokeRoundedRect(x - 30, y - 6, 60, 52, 8);
      for (const [f, ox, c] of [[player, -12, 0x9ad0ff], [npc, 12, 0xffa040]] as [Fighter, number, number][]) {
        const s = swims.get(f);
        const k = s ? clamp((time - s.wetSince) / 3000, 0, 1) : 0;
        g.fillStyle(0x1a2030, 1); g.fillRoundedRect(x + ox - 4, y, 8, 36, 4);
        g.fillStyle(s ? LAKE_LIT : dim(c, 0.4), 1); g.fillRoundedRect(x + ox - 3, y + 34 - 33 * (s ? k : 0.15), 6, 33 * (s ? k : 0.15) + 1, 3);
        g.fillStyle(c, 1); g.fillCircle(x + ox, y + 40, 4.5);
      }
    },

    destroy() { for (const c of caps) c.remove(); },
  };
}

export const FALLEN_ADRIFT: GimmickDef = {
  id: fallenId('brass', 'adrift'),
  rules: 'The stage drifts; the rail keeps you aboard but for the steps or a dash. The lake is slow and cold. Strike a capstan to haul the stage from him.',
  make,
};
