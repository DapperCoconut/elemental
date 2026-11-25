import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { mulberry, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { fleuron, textLines } from '../art';
import { GILT, GILT_DARK, INK, IRON, LEAD, LEAD_LIT, OAK, OAK_DARK, PAPER_LIT, RED, RED_DARK, RED_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { proofSlip } from './common';

/**
 * Out of Register — Pressman Caradoc Frisket, who pulls the two-colour hymn sheets in the Press Hall:
 * black for the words, red for the rubrics, two passes through the press for every sheet.
 *
 * He lays a forme where you stand and pulls the black: the platen comes down on a pencilled box.
 * Then the sheet goes through again for the red — and his red never sits true. It lands one fixed
 * step off the black, and that step is the register, shown on every proof as a red box beside the
 * black one, and on the register pin's dial. It creeps round as the press runs.
 *
 * Both passes print whoever stands in them, him included. Step out of the black without stepping
 * into the red; better, keep him standing one register-step from you, on your red. Strike the
 * register pin and the red is screwed round to point from you at him — every pending red with it.
 * Past half he works and turns: he prints at his own feet too, and his red points at you.
 */

const FW = 120, FH = 84;
const REG = 150;
const BLACK_MS = 900, RED_MS = 1700;

interface Print { x: number; y: number; rx: number; ry: number; at: number; black: boolean; red: boolean; seed: number; mine: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const prints: Print[] = [];
  let theta = rng() * Math.PI * 2;
  let started = false;
  let half = false;
  let nextPrint = 0;
  let turn = false;
  let pinTurnedAt = -9999;
  const PIN_SPOTS: Pt[] = [{ x: W / 2, y: H - 70 }, { x: 150, y: top + 120 }, { x: W - 150, y: top + 120 }];
  let pinAt: Pt = PIN_SPOTS[0];
  let pin: StrikeTarget | null = null;

  const inBox = (f: Fighter, x: number, y: number): boolean => Math.abs(f.x - x) < FW / 2 + 10 && Math.abs(f.y - y) < FH / 2 + 12;
  const regOf = (): Pt => ({ x: Math.cos(theta) * REG, y: Math.sin(theta) * REG });
  const clampBox = (x: number, y: number): Pt => ({ x: clamp(x, FW / 2 + 8, W - FW / 2 - 8), y: clamp(y, top + FH / 2 + 6, H - FH / 2 - 6) });

  function placePin(p: Pt): void {
    pin?.remove();
    pinAt = p;
    pin = ctx.target({
      x: p.x, y: p.y - 18, r: 24,
      onStruck: (by) => {
        const f = by === 'player' ? player : npc, o = by === 'player' ? npc : player;
        // Screwed round to point from the striker at the other, to the nearest eighth of a turn.
        const a = Math.atan2(o.y - f.y, o.x - f.x);
        theta = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
        pinTurnedAt = ctx.scene.time.now;
        const r = regOf();
        for (const pr of prints) if (!pr.red) { const c = clampBox(pr.x + r.x, pr.y + r.y); pr.rx = c.x; pr.ry = c.y; }
        ctx.sfx('gear-turn');
      },
    });
  }

  function lay(time: number, at: Fighter, mine: boolean): void {
    const b = clampBox(at.x, at.y);
    const r = regOf();
    const c = clampBox(b.x + r.x, b.y + r.y);
    prints.push({ x: b.x, y: b.y, rx: c.x, ry: c.y, at: time, black: false, red: false, seed: rng() * 1000, mine });
    ctx.sfx('reload');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextPrint = time + 1500; placePin(PIN_SPOTS[0]); }
      if (!half && npc.hp < npc.maxHp * 0.5) { half = true; placePin(PIN_SPOTS[1 + Math.floor(rng() * 2)]); }
      // The press runs and the register creeps.
      if (time - pinTurnedAt > 2500) theta += 0.14 * dt;

      if (time >= nextPrint && alive(npc)) {
        nextPrint = time + (half ? 2200 : 2600);
        if (half && turn) {
          // Work-and-turn: the sheet comes back round at his own feet, his red laid toward you.
          theta = Math.atan2(player.y - npc.y, player.x - npc.x);
          lay(time, npc, true);
        } else lay(time, player, false);
        turn = !turn;
      }
      for (let i = prints.length - 1; i >= 0; i--) {
        const p = prints[i];
        if (!p.black && time >= p.at + BLACK_MS) {
          p.black = true;
          for (const f of [player, npc]) if (alive(f) && !ctx.isAirborne(f) && inBox(f, p.x, p.y)) ctx.hit(f, 10, f.x, f.y);
          ctx.sfx('stone-slam');
        }
        if (!p.red && time >= p.at + RED_MS) {
          p.red = true;
          for (const f of [player, npc]) if (alive(f) && !ctx.isAirborne(f) && inBox(f, p.rx, p.ry)) { ctx.hit(f, 10, f.x, f.y); ctx.flash(f.x, f.y, RED); }
          ctx.sfx('anvil');
        }
        if (time > p.at + RED_MS + 1600) prints.splice(i, 1);
      }
    },

    npcSeek() {
      if (!alive(npc)) return null;
      const r = regOf();
      let best: Pt = { x: npc.x, y: npc.y }, bestScore = Infinity;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rr = i % 2 ? 200 : 270;
        const p = { x: clamp(player.x + Math.cos(a) * rr, 60, W - 60), y: clamp(player.y + Math.sin(a) * rr, top + 50, H - 40) };
        let score = Math.abs(dist(p.x, p.y, npc.x, npc.y) - 60) * 0.3;
        // Never stand on the stranger's red, or in any box still to be pulled.
        if (dist(p.x, p.y, player.x + r.x, player.y + r.y) < 120) score += 800;
        for (const pr of prints) {
          if (!pr.black && Math.abs(p.x - pr.x) < FW / 2 + 40 && Math.abs(p.y - pr.y) < FH / 2 + 40) score += 600;
          if (!pr.red && Math.abs(p.x - pr.rx) < FW / 2 + 40 && Math.abs(p.y - pr.ry) < FH / 2 + 40) score += 600;
        }
        if (score < bestScore) { bestScore = score; best = p; }
      }
      return best;
    },

    drawGround(g, time) {
      for (const p of prints) {
        if (p.black) impression(g, p.x, p.y, p.seed, false, clamp(1 - (time - (p.at + BLACK_MS)) / (RED_MS + 1600 - BLACK_MS), 0, 1));
        if (p.red) impression(g, p.rx, p.ry, p.seed, true, clamp(1 - (time - (p.at + RED_MS)) / 1600, 0, 1));
        // The pencilled boxes still to be pulled, and the register step between them.
        if (!p.black) pencilBox(g, p.x, p.y, INK, clamp((time - p.at) / BLACK_MS, 0, 1), time);
        if (!p.red) {
          pencilBox(g, p.rx, p.ry, RED, clamp((time - p.at) / RED_MS, 0, 1), time);
          g.lineStyle(1.2, RED, 0.5); g.lineBetween(p.x, p.y, p.rx, p.ry);
          cross(g, p.x, p.y, INK, 7); cross(g, p.rx, p.ry, RED, 7);
        }
      }
      // The register pin: an iron foot, a brass screw, a dial whose needle shows the red's step.
      const { x, y } = pinAt;
      g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 2, 44, 12);
      g.fillStyle(IRON, 1); g.fillRect(x - 18, y - 8, 36, 10);
      g.fillStyle(OAK_DARK, 1); g.fillRect(x - 4, y - 30, 8, 22);
      g.fillStyle(GILT_DARK, 1); g.fillCircle(x, y - 34, 14);
      g.fillStyle(PAPER_LIT, 1); g.fillCircle(x, y - 34, 11);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.lineStyle(1, INK, 0.7); g.lineBetween(x + Math.cos(a) * 8, y - 34 + Math.sin(a) * 8, x + Math.cos(a) * 11, y - 34 + Math.sin(a) * 11); }
      g.lineStyle(2.4, RED, 1); g.lineBetween(x, y - 34, x + Math.cos(theta) * 10, y - 34 + Math.sin(theta) * 10);
      g.fillStyle(GILT, 1); g.fillCircle(x, y - 34, 2.5);
      if (time - pinTurnedAt < 500) { g.lineStyle(2, GILT, 1 - (time - pinTurnedAt) / 500); g.strokeCircle(x, y - 34, 16 + (time - pinTurnedAt) / 20); }
    },

    drawAir(g, time) {
      // The platen's shadow coming down on each box as its pass nears.
      for (const p of prints) {
        for (const [bx, by, at, done] of [[p.x, p.y, p.at + BLACK_MS, p.black], [p.rx, p.ry, p.at + RED_MS, p.red]] as [number, number, number, boolean][]) {
          if (done || at - time > 600) continue;
          const k = clamp(1 - (at - time) / 600, 0, 1);
          const lift = (1 - k) * 60;
          g.fillStyle(0x000000, 0.1 + 0.2 * k); g.fillRect(bx - FW / 2, by - FH / 2, FW, FH);
          g.fillStyle(IRON, 0.85); g.fillRect(bx - FW / 2 - 4, by - FH / 2 - lift - 10, FW + 8, 12);
          g.fillStyle(LEAD_LIT, 0.8); g.fillRect(bx - FW / 2 - 4, by - FH / 2 - lift - 10, FW + 8, 3);
          g.lineStyle(4, OAK, 0.9); g.lineBetween(bx, by - FH / 2 - lift - 10, bx, by - FH / 2 - lift - 40);
        }
      }
    },

    drawHud(g) {
      const x = W / 2, y = top + 4;
      proofSlip(g, x, y, 120, 30);
      // The register gauge: black cross at the heart, red cross a step off it.
      const cx = x + 8, cy = y + 15;
      g.lineStyle(1, INK, 0.4); g.strokeCircle(cx, cy, 11);
      cross(g, cx, cy, INK, 5);
      cross(g, cx + Math.cos(theta) * 11, cy + Math.sin(theta) * 11, RED, 5);
    },

    destroy() { pin?.remove(); },
  };
}

/** A registration mark: a ringed cross, as printers put at the corners of a sheet. */
function cross(g: G, x: number, y: number, color: number, r: number): void {
  g.lineStyle(1.4, color, 0.9);
  g.lineBetween(x - r * 1.5, y, x + r * 1.5, y); g.lineBetween(x, y - r * 1.5, x, y + r * 1.5);
  g.strokeCircle(x, y, r);
}

/** A box pencilled on the floor for a pass, drawing itself round as the pass comes due. */
function pencilBox(g: G, x: number, y: number, color: number, k: number, time: number): void {
  g.fillStyle(color, 0.05 + 0.1 * k); g.fillRect(x - FW / 2, y - FH / 2, FW, FH);
  const per = 2 * (FW + FH), len = per * Math.min(1, k * 1.4);
  const corners: Pt[] = [{ x: x - FW / 2, y: y - FH / 2 }, { x: x + FW / 2, y: y - FH / 2 }, { x: x + FW / 2, y: y + FH / 2 }, { x: x - FW / 2, y: y + FH / 2 }, { x: x - FW / 2, y: y - FH / 2 }];
  let left = len;
  g.lineStyle(2, color, 0.55 + Math.sin(time / 90) * 0.1);
  for (let i = 0; i < 4 && left > 0; i++) {
    const a = corners[i], b = corners[i + 1];
    const l = Math.hypot(b.x - a.x, b.y - a.y), t = Math.min(1, left / l);
    g.lineBetween(a.x, a.y, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    left -= l;
  }
}

/** A pulled impression: black type in lines, or the red pass — a rubric initial, a fleuron and red rules. */
function impression(g: G, x: number, y: number, seed: number, red: boolean, a: number): void {
  if (a <= 0) return;
  const rng = mulberry(Math.floor(seed) + (red ? 7 : 0));
  const x0 = x - FW / 2, y0 = y - FH / 2;
  if (!red) {
    g.fillStyle(PAPER_LIT, 0.35 * a); g.fillRect(x0, y0, FW, FH);
    textLines(g, x0 + 30, y0 + 8, FW - 38, FH - 16, INK, 0.85 * a, rng, 6);
    g.lineStyle(1, LEAD, 0.6 * a); g.strokeRect(x0 + 2, y0 + 2, FW - 4, FH - 4);
    return;
  }
  // The rubric: a big red initial in the corner, a red heading rule, a fleuron.
  g.fillStyle(RED, 0.85 * a); g.fillRect(x0 + 6, y0 + 8, 20, 24);
  g.fillStyle(RED_LIT, 0.6 * a); g.fillRect(x0 + 8, y0 + 10, 6, 20);
  g.lineStyle(2, RED_DARK, a); g.strokeRect(x0 + 6, y0 + 8, 20, 24);
  g.lineStyle(2, RED, 0.9 * a); g.lineBetween(x0 + 32, y0 + 10, x0 + FW - 8, y0 + 10);
  for (let ly = y0 + 22; ly < y0 + FH - 10; ly += 14) { g.lineStyle(1.5, RED, 0.7 * a); g.lineBetween(x0 + 32 + rng() * 6, ly, x0 + FW - 10 - rng() * 20, ly); }
  fleuron(g, x, y0 + FH - 8, 6, RED, a);
}

export const FALLEN_OUT_OF_REGISTER: GimmickDef = {
  id: fallenId('libretto', 'out-of-register'),
  rules: 'He prints black where you stand, then red one register-step off, hitting all in either. Keep him on your red; strike the pin to aim it at him.',
  make,
};
