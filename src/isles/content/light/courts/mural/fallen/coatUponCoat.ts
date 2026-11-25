import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { GOLD, GOLD_DARK, OCHRE, SIDE_NPC, SIDE_PLAYER, TIMBER, TIMBER_DARK, TIMBER_LIT, UMBER, UMBER_DARK } from '../palette';
import { clamp, dist, stepDt } from '../util';
import { alive, framePlate, halfDown, pip } from './common';

/**
 * Coat upon Coat — Corentin Flaxley, Varnisher (oil).
 *
 * The court's murals are finished with linseed varnish, laid in thin amber coats with a brush as
 * wide as a broom. One coat is a glaze — you hardly notice it underfoot. Where two coats overlap
 * the varnish is thick and tacky and drags at your boots; where three or more lie on one spot it
 * is a stinging, half-cured mire that bites every moment you stand in it. The varnisher lays his
 * coats round you, one stroke after another, each shown as a wet outline a moment before it lands,
 * so the yard becomes a Venn of amber and the safe ground is wherever the coats do not stack.
 *
 * Coats never move and never go off — they simply dry away after a while. The counter is reading
 * the overlaps: keep to single-coat or bare flags and make him fight you there. And his kettle
 * stands on its trestle at the yard's edge: strike it and his brush-hand turns — his next three
 * coats are laid round *your foe* instead, so he must wade his own stack. Below half he lays two
 * coats at a stroke.
 */

const ID = fallenId('mural', 'coat-upon-coat');

const LAY_MS = 750;
const LIFE_MS = 11000;
const STROKE_MS = 1750;
const STING_MS = 550;
const KETTLE_CD = 3000;
const MAX_COATS = 10;

interface Coat { x: number; y: number; r: number; at: number; ang: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const coats: Coat[] = [];
  const sting = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const kettle: Pt = { x: W / 2, y: H - 34 };
  let turned = 0;
  let turnedOn: Fighter = npc;
  let kettleReady = 0;
  let nextStroke = 0;
  let started = false;
  let struckAt = -1e9;

  const laid = (c: Coat, now: number) => now >= c.at + LAY_MS;
  const count = (x: number, y: number, now: number): number => {
    let n = 0;
    for (const c of coats) if (laid(c, now) && dist(x, y, c.x, c.y) < c.r) n++;
    return n;
  };
  const depth = (f: Fighter) => (alive(f) && !ctx.isAirborne(f) ? count(f.x, f.y, ctx.scene.time.now) : 0);
  const speedFor = (n: number) => (n >= 3 ? 0.45 : n === 2 ? 0.62 : 1);

  const kettleT: StrikeTarget = ctx.target({
    x: kettle.x, y: kettle.y - 10, r: 26,
    onStruck: (by) => {
      const now = ctx.scene.time.now;
      if (now < kettleReady) return;
      kettleReady = now + KETTLE_CD;
      turned = 3; turnedOn = by === 'player' ? npc : player;
      struckAt = now;
      ctx.sfx('clang');
    },
  });

  function stroke(now: number): void {
    const n = halfDown(npc) ? 2 : 1;
    for (let i = 0; i < n; i++) {
      if (coats.length >= MAX_COATS) coats.shift();
      let on: Fighter = player;
      if (turned > 0) { on = turnedOn; turned--; }
      const a = rng() * Math.PI * 2, d = 20 + rng() * 70;
      coats.push({
        x: clamp(on.x + Math.cos(a) * d, 50, W - 50), y: clamp(on.y + Math.sin(a) * d, top + 40, H - 40),
        r: 92 + rng() * 26, at: now + i * 160, ang: rng() * Math.PI, seed: rng() * 10,
      });
    }
    ctx.sfx('splash');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextStroke = time + 900; }
      if (time >= nextStroke && alive(player) && alive(npc)) { stroke(time); nextStroke = time + STROKE_MS; }
      for (let i = coats.length - 1; i >= 0; i--) if (time - coats[i].at > LIFE_MS) coats.splice(i, 1);
      for (const f of [player, npc]) {
        if (depth(f) < 3) { sting.set(f, 0); continue; }
        const t = (sting.get(f) ?? 0) + dt * 1000;
        if (t >= STING_MS) { sting.set(f, 0); ctx.hit(f, f === npc ? 9 : 7, f.x, f.y); ctx.sfx('sizzle'); } else sting.set(f, t);
      }
    },

    playerSpeedMult() { return speedFor(depth(player)); },
    npcSpeedMult() { return speedFor(depth(npc)); },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const now = ctx.scene.time.now;
      // Coats are being turned on him: go strike the kettle back if it is ready.
      if (turned > 0 && turnedOn === npc && now >= kettleReady) return { x: kettle.x, y: kettle.y - 110 };
      // In a stack: wade to the thinnest ground nearby.
      if (depth(npc) >= 2 || (turned > 0 && turnedOn === npc)) {
        let best: Pt | null = null, bn = 99;
        for (let k = 0; k < 12; k++) {
          const a = k * 0.5236, x = clamp(npc.x + Math.cos(a) * 130, 60, W - 60), y = clamp(npc.y + Math.sin(a) * 130, top + 50, H - 40);
          const n = count(x, y, now) + (dist(x, y, player.x, player.y) < 80 ? 1 : 0);
          if (n < bn) { bn = n; best = { x, y }; }
        }
        return best;
      }
      // The stranger stands on thick varnish: hold off at range on bare flags and let them wade.
      if (depth(player) >= 2) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 240, 60, W - 60), y: clamp(player.y + Math.sin(a) * 240, top + 50, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const c of coats) {
        const age = time - c.at;
        if (age < 0) continue;
        if (age < LAY_MS) {
          // The wet outline of the stroke about to land, and the brush sweeping across it.
          const k = age / LAY_MS;
          g.lineStyle(2, OCHRE, 0.35 + 0.45 * k);
          for (let s = 0; s < 20; s++) { const a = s * 0.314 + c.ang; g.beginPath(); g.arc(c.x, c.y, c.r, a, a + 0.18, false); g.strokePath(); }
          const bx = c.x + Math.cos(c.ang) * c.r * (2 * k - 1), by = c.y + Math.sin(c.ang) * c.r * (2 * k - 1);
          g.lineStyle(10, TIMBER_DARK, 0.8); g.lineBetween(bx - Math.sin(c.ang) * 26, by + Math.cos(c.ang) * 26, bx + Math.sin(c.ang) * 26, by - Math.cos(c.ang) * 26);
          g.lineStyle(5, OCHRE, 0.9); g.lineBetween(bx - Math.sin(c.ang) * 24, by + Math.cos(c.ang) * 24, bx + Math.sin(c.ang) * 24, by - Math.cos(c.ang) * 24);
          continue;
        }
        const fade = clamp((LIFE_MS - age) / 1200, 0, 1);
        // A thin amber glaze: each coat alone is pale; where they stack the alphas build to a deep brown.
        g.fillStyle(OCHRE, 0.16 * fade); g.fillCircle(c.x, c.y, c.r);
        g.lineStyle(1.5, dim(OCHRE, 0.3), 0.45 * fade); g.strokeCircle(c.x, c.y, c.r);
        // Brush-marks across the coat, the way it was laid.
        g.lineStyle(1, lit(OCHRE, 0.3), 0.3 * fade);
        for (let s = -3; s <= 3; s++) {
          const o = s * c.r * 0.26, half = Math.sqrt(Math.max(0, c.r * c.r - o * o)) * 0.9;
          const cx = c.x - Math.sin(c.ang) * o, cy = c.y + Math.cos(c.ang) * o;
          g.lineBetween(cx - Math.cos(c.ang) * half, cy - Math.sin(c.ang) * half, cx + Math.cos(c.ang) * half, cy + Math.sin(c.ang) * half);
        }
        // Wet glints.
        g.fillStyle(0xffffff, 0.35 * fade * (0.5 + 0.5 * Math.sin(time / 300 + c.seed)));
        g.fillEllipse(c.x - c.r * 0.3, c.y - c.r * 0.35, 14, 4);
      }
      // Tacky bubbles where the varnish stacks three deep under a fighter.
      for (const f of [player, npc]) {
        const n = depth(f);
        if (n < 2) continue;
        for (let s = 0; s < (n >= 3 ? 7 : 3); s++) {
          const ph = (time / 700 + s / 7) % 1, a = s * 0.9;
          g.fillStyle(n >= 3 ? UMBER : OCHRE, 0.7 * (1 - ph)); g.fillCircle(f.x + Math.cos(a) * 18, f.y + 12 + Math.sin(a) * 6, 2 + ph * 3);
        }
        g.lineStyle(2, n >= 3 ? UMBER_DARK : OCHRE, 0.6); g.strokeEllipse(f.x, f.y + 12, 40, 12);
      }
      // The kettle's trestle at the yard's edge.
      const kx = kettle.x, ky = kettle.y;
      const sh = time - struckAt < 300 ? Math.sin(time / 20) * 2 : 0;
      g.fillStyle(0x000000, 0.2); g.fillEllipse(kx, ky + 6, 90, 14);
      g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(kx - 36, ky + 4, kx - 28, ky - 22); g.lineBetween(kx + 36, ky + 4, kx + 28, ky - 22);
      g.fillStyle(TIMBER, 1); g.fillRect(kx - 40, ky - 26, 80, 7);
      g.fillStyle(TIMBER_LIT, 1); g.fillRect(kx - 40, ky - 26, 80, 2);
    },

    drawAir(g, time) {
      const kx = kettle.x + (time - struckAt < 300 ? Math.sin(time / 20) * 2 : 0), ky = kettle.y - 26;
      // The copper varnish kettle, its brush across the lip.
      g.fillStyle(0x8a4a22, 1); g.fillEllipse(kx, ky - 12, 40, 30);
      g.fillStyle(0xc8743a, 1); g.fillEllipse(kx - 4, ky - 15, 26, 18);
      g.fillStyle(UMBER_DARK, 1); g.fillEllipse(kx, ky - 25, 28, 7);
      g.fillStyle(OCHRE, 1); g.fillEllipse(kx, ky - 25, 22, 5);
      g.lineStyle(4, TIMBER_DARK, 1); g.lineBetween(kx - 26, ky - 34, kx + 20, ky - 22);
      g.fillStyle(OCHRE, 1); g.fillRect(kx + 16, ky - 27, 12, 8);
      const ready = time >= kettleReady;
      g.lineStyle(2, ready ? GOLD : GOLD_DARK, ready ? 0.5 + 0.4 * Math.sin(time / 200) : 0.6); g.strokeCircle(kx, ky - 14, 26);
      for (let s = 0; s < 3; s++) {
        const ph = (time / 1300 + s / 3) % 1;
        g.fillStyle(0xd8d0c0, 0.3 * (1 - ph)); g.fillCircle(kx - 6 + s * 6 + Math.sin(ph * 6) * 4, ky - 32 - ph * 30, 4 + ph * 6);
      }
      // Turned: a tag in the foe's colour hangs off the kettle, one notch per coat still owed.
      if (turned > 0) {
        const col = turnedOn === npc ? SIDE_PLAYER : SIDE_NPC;
        for (let s = 0; s < turned; s++) pip(g, kx - 12 + s * 12, ky - 52, 4, true, col);
        g.lineStyle(2, col, 0.7); g.lineBetween(turnedOn.x, turnedOn.y - 40, turnedOn.x, turnedOn.y - 50);
        g.fillStyle(col, 0.9); g.fillTriangle(turnedOn.x - 6, turnedOn.y - 50, turnedOn.x + 6, turnedOn.y - 50, turnedOn.x, turnedOn.y - 42);
      }
    },

    drawHud(g, time) {
      const x = W / 2, y = top + 4;
      framePlate(g, x, y, 200, 34);
      // Coats under each fighter: three amber pips, the third dark when it stings.
      for (const [f, col, ox] of [[player, SIDE_PLAYER, -86], [npc, SIDE_NPC, 14]] as const) {
        const n = depth(f);
        g.fillStyle(col, 1); g.fillCircle(x + ox, y + 17, 4);
        for (let i = 0; i < 3; i++) pip(g, x + ox + 14 + i * 13, y + 17, 5, n > i, i === 2 ? UMBER : OCHRE);
        if (n >= 3) { g.lineStyle(2, UMBER_DARK, 0.6 + 0.4 * Math.sin(time / 90)); g.strokeRect(x + ox + 7, y + 9, 42, 16); }
      }
    },

    destroy() { kettleT.remove(); coats.length = 0; },
  };
}

export const FALLEN_COAT_UPON_COAT: GimmickDef = {
  id: ID,
  rules: 'Varnish coats land round you. Two overlapping drag at you; three sting. Strike the kettle: his next three coats are laid round your foe.',
  make,
};
