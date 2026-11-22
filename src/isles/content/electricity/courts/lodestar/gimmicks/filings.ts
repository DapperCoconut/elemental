import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow } from '../../../../../art/IsleArt';
import { FILINGS, FILINGS_LIT, IRON, IRON_DARK, IRON_LIT, NORTH, NORTH_LIT, RUST, SOUTH, SOUTH_LIT, SPARK } from '../palette';
import { along, alive, clamp, dist, fieldArc, lineDist, stepDt } from '../util';

/**
 * Iron Filings — Smith Ferrite.
 *
 * Ferrite's yard floor is a drift of iron filings, and a great bar magnet lies buried under it —
 * its two ends showing, red and blue, through the black. The filings *stand up* along its field
 * lines in bristling ridges from one pole to the other. Wading across a standing ridge is like
 * wading a hedge of pins: you slow right down. Every few seconds the magnet is turned under the
 * floor and the ridges lie down and stand up somewhere else.
 *
 * And the smith shoots along them: a slug of hot iron shot is fed in at the north pole and runs
 * the whole length of one ridge to the south, curving as the field curves, striking whoever is
 * standing in it. The ridge it will run lights up first. The shot does not care who it hits.
 */

const LINE_HALF = 16;
const SHOT_DMG = 10;
const SHOT_MS = 950;
const SHOT_WARN = 750;
const BULGES = [-270, -180, -95, 0, 95, 180, 270];

interface Shot { line: number; warnAt: number; fireAt: number; struck: Set<Fighter> }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng, tk } = ctx;
  const C: Pt = { x: W / 2, y: (top + H) / 2 + 8 };
  const SPAN = 230;
  let theta = rng() * Math.PI;
  let lines: Pt[][] = [];
  let standing: number[] = [];
  let standAt = 0;
  let nextTurn = 0;
  let nextShot = 0;
  let shots: Shot[] = [];
  let started = false;
  const turnEvery = ctx.hard ? 5600 : 7000;
  const shotEvery = ctx.hard ? 1900 : 2500;

  const poleN = (): Pt => ({ x: C.x - Math.cos(theta) * SPAN, y: C.y - Math.sin(theta) * SPAN * 0.8 });
  const poleS = (): Pt => ({ x: C.x + Math.cos(theta) * SPAN, y: C.y + Math.sin(theta) * SPAN * 0.8 });

  function lay(time: number): void {
    const n = poleN(), s = poleS();
    lines = BULGES.map((b) => fieldArc(n, s, b, 30));
    const count = ctx.hard ? 5 : 4;
    const pool = BULGES.map((_, i) => i);
    standing = [];
    while (standing.length < count && pool.length) standing.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    standAt = time;
  }

  const ridgeUp = (time: number) => time - standAt > 900;
  const onRidge = (f: Fighter, time: number) => ridgeUp(time) && standing.some((i) => lineDist(f.x, f.y, lines[i]) < LINE_HALF + 12);
  const hurt = (f: Fighter, amount: number) => { if (f === player) tk.hitPlayer(amount, f.x, f.y); else ctx.hit(f, amount, f.x, f.y); };

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; lay(time); nextTurn = time + turnEvery; nextShot = time + 1600; }
      if (time >= nextTurn) {
        nextTurn = time + turnEvery;
        theta += Math.PI / 4 + rng() * Math.PI / 3;
        shots = [];
        lay(time);
        ctx.banner('THE MAGNET TURNS UNDER THE FLOOR', '#c8d0e0');
        ctx.sfx('gear-turn');
      }
      // Load a ridge: Ferrite aims for the one you are on, or the nearest to you.
      if (time >= nextShot && ridgeUp(time) && time < nextTurn - SHOT_WARN - SHOT_MS) {
        nextShot = time + shotEvery;
        let pick = standing[0];
        let pd = Infinity;
        for (const i of standing) {
          const d = lineDist(player.x, player.y, lines[i]) + (rng() < 0.25 ? 200 : 0);
          if (d < pd) { pd = d; pick = i; }
        }
        shots.push({ line: pick, warnAt: time, fireAt: time + tk.warn(SHOT_WARN), struck: new Set() });
        ctx.sfx('reload');
      }
      for (const s of shots) {
        if (time < s.fireAt || time > s.fireAt + SHOT_MS) continue;
        if (time - s.fireAt < 40 && !s.struck.size) ctx.sfx('musket');
        const head = along(lines[s.line], (time - s.fireAt) / SHOT_MS);
        for (const f of [player, npc]) {
          if (!alive(f) || s.struck.has(f)) continue;
          if (dist(head.x, head.y, f.x, f.y) < 30) {
            s.struck.add(f);
            hurt(f, SHOT_DMG);
            ctx.float(f.x, f.y - 44, 'IRON SHOT', '#ffb070');
          }
        }
      }
      shots = shots.filter((s) => time < s.fireAt + SHOT_MS + 200);
      // The poles are solid lumps.
      for (const p of [poleN(), poleS()]) {
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(p.x, p.y, f.x, f.y);
          if (d < 40 && d > 0) ctx.nudge(f, ((f.x - p.x) / d) * (40 - d), ((f.y - p.y) / d) * (40 - d));
        }
      }
    },

    playerSpeedMult: () => (alive(player) && onRidge(player, ctx.scene.time.now) ? 0.5 : 1),
    npcSpeedMult: () => (alive(npc) && onRidge(npc, ctx.scene.time.now) ? 0.5 : 1),

    npcSeek() {
      if (!alive(npc) || !lines.length) return null;
      const time = ctx.scene.time.now;
      // A clear patch near you, off every ridge — and above all off a loaded one.
      let best: Pt | null = null;
      let bs = -Infinity;
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const x = clamp(player.x + Math.cos(a) * 200, 70, W - 70), y = clamp(player.y + Math.sin(a) * 170, top + 50, H - 40);
        let clear = Infinity;
        for (const k of standing) clear = Math.min(clear, lineDist(x, y, lines[k]));
        let loaded = Infinity;
        for (const s of shots) if (time < s.fireAt + SHOT_MS) loaded = Math.min(loaded, lineDist(x, y, lines[s.line]));
        const score = Math.min(clear, 80) + Math.min(loaded, 120) * 2 - dist(x, y, npc.x, npc.y) * 0.1;
        if (score > bs) { bs = score; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      const rise = clamp((time - standAt) / 900, 0, 1);
      // Every line faint (where the filings lie), the standing ones as bristling ridges.
      lines.forEach((pts, i) => {
        const up = standing.includes(i);
        g.lineStyle(up ? 2 : 1, FILINGS_LIT, up ? 0.15 : 0.1); g.strokePoints(pts, false);
        if (!up) return;
        g.lineStyle(LINE_HALF * 2, FILINGS, 0.25 + rise * 0.35); g.strokePoints(pts, false);
        for (let k = 1; k < pts.length; k++) {
          const a = pts[k - 1], b = pts[k];
          const ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;
          for (let j = 0; j < 4; j++) {
            const t = j / 4;
            const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
            const off = (((k * 7 + j * 3) % 9) - 4) * 3;
            const len = 3 + rise * 7;
            const px = x + Math.cos(ang) * off, py = y + Math.sin(ang) * off;
            g.lineStyle(1.4, (k + j) % 3 ? FILINGS : IRON_LIT, 0.9);
            g.lineBetween(px, py + 2, px + Math.cos(Math.atan2(b.y - a.y, b.x - a.x)) * len * 0.3, py + 2 - len);
          }
        }
      });
      // A ridge being loaded: a red-hot glow creeping along it from the north pole.
      for (const s of shots) {
        const pts = lines[s.line];
        if (time < s.fireAt) {
          const k = clamp((time - s.warnAt) / Math.max(1, s.fireAt - s.warnAt), 0, 1);
          g.lineStyle(LINE_HALF * 2 + 6, NORTH, 0.12 + k * 0.25); g.strokePoints(pts, false);
          const tip = along(pts, k);
          g.fillStyle(NORTH_LIT, 0.5 + k * 0.4); g.fillCircle(tip.x, tip.y, 5);
        }
      }
      // The magnet's two ends showing through the filings.
      const n = poleN(), s = poleS();
      for (const [p, c, cl] of [[n, NORTH, NORTH_LIT], [s, SOUTH, SOUTH_LIT]] as [Pt, number, number][]) {
        g.fillStyle(0x000000, 0.35); g.fillEllipse(p.x + 4, p.y + 12, 84, 30);
        g.fillStyle(IRON_DARK, 1); g.fillEllipse(p.x, p.y + 4, 76, 40);
        g.fillStyle(dim(c, 0.3), 1); g.fillEllipse(p.x, p.y, 62, 34);
        g.fillStyle(c, 1); g.fillEllipse(p.x, p.y - 3, 54, 28);
        g.fillStyle(cl, 0.5); g.fillEllipse(p.x - 10, p.y - 8, 18, 8);
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          g.lineStyle(1.6, FILINGS, 0.9);
          g.lineBetween(p.x + Math.cos(a) * 34, p.y + Math.sin(a) * 20, p.x + Math.cos(a) * (44 + (i % 3) * 4), p.y + Math.sin(a) * (26 + (i % 3) * 3));
        }
      }
      // Rust streaks where the shot has run before.
      g.fillStyle(RUST, 0.18); g.fillCircle(n.x, n.y + 24, 20); g.fillCircle(s.x, s.y + 24, 20);
    },

    drawAir(g, time) {
      // The shot: a slug of white-hot iron with a comet of sparks behind it.
      for (const s of shots) {
        if (time < s.fireAt || time > s.fireAt + SHOT_MS) continue;
        const k = (time - s.fireAt) / SHOT_MS;
        const pts = lines[s.line];
        for (let i = 6; i >= 0; i--) {
          const p = along(pts, k - i * 0.025);
          g.fillStyle(i ? 0xffa040 : 0xfff4d0, i ? 0.6 - i * 0.08 : 1);
          g.fillCircle(p.x, p.y - 4, i ? 7 - i * 0.7 : 9);
        }
        const head = along(pts, k);
        glow(g, head.x, head.y - 4, 28, 0xffa040, 0.08, 3);
        g.fillStyle(IRON, 1); g.fillCircle(head.x, head.y - 4, 4);
        for (let i = 0; i < 5; i++) {
          const a = time / 40 + i * 1.3;
          g.fillStyle(SPARK, 0.8); g.fillCircle(head.x + Math.cos(a) * 12, head.y - 4 + Math.sin(a) * 8, 1.4);
        }
      }
      // Pins catching a fighter wading a ridge.
      const now = ctx.scene.time.now;
      for (const f of [player, npc]) {
        if (!alive(f) || !onRidge(f, now)) continue;
        for (let i = 0; i < 6; i++) {
          const x = f.x - 15 + i * 6;
          g.lineStyle(1.2, IRON_LIT, 0.9); g.lineBetween(x, f.y + 14, x + 1, f.y + 4 - (i % 2) * 4);
        }
      }
    },
  };
}

export const FILINGS_GIMMICK: GimmickDef = {
  id: 'lodestar-filings',
  rules: 'Filings stand up along the field lines of a buried magnet; wading a ridge slows you. Iron shot runs the length of a lit ridge from N to S and hits whoever is on it.',
  make,
};
