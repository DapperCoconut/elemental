import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt, Side } from '../gimmicks/shared';
import { live, SIDES } from '../gimmicks/shared';
import type { G } from '../../../../../art/IsleArt';
import { dim, glow, lit, shadow } from '../../../../../art/IsleArt';
import { CAP_RED, CAP_RED_LIT, MOSS_DARK, PLANK, PLANK_DARK, SPORE, SPORE_DARK, STEM } from '../palette';
import { dist } from '../sporeArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * The Heavier Pan — Weighmaster Tare of the Spore Scales.
 *
 * Every household's tithe of mushrooms is weighed on the Spore Scales, and in the King's telling
 * the man at the beam, Tare, kept a brass weight in his palm and his thumb on the pan. Here the
 * two fighters are the two pans. Every blow you land goes on your pan as tithe; every blow he lands
 * goes on his. Every few seconds the beam swings and the **lighter pan is found wanting**: the
 * pruning shears open over that fighter (step out of their bite) and, until the next weighing, the
 * wanting one takes heavier blows.
 *
 * Tare's thumb is real: a brass **weight** sits on the floor, and whichever side owns it adds its
 * heft at the weighing. It starts his. **Strike it** and it is knocked to your side; he will walk
 * over and strike it back. Halfway down he palms a second, smaller weight — two to fight over, and
 * the beam swings faster.
 */

const ID = fallenId('spore', 'heavier-pan');
const SHEAR_R = 92;
const SHEAR_MS = 1150;
const BRASS = 0xc9a24a;
const BRASS_DARK = 0x7a5a22;

interface Weight { x: number; y: number; heft: number; owner: Side; t: ReturnType<GimmickCtx['target']>; flipAt: number }
interface Shears { x: number; y: number; at: number; at0: number; who: Side; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const fOf = (k: Side): Fighter => (k === 'p' ? ctx.player : ctx.npc);
  const tithe: Record<Side, number> = { p: 0, n: 0 };
  let wanting: Side | null = null;
  let tilt = 0; // −1 player's pan down … +1 Tare's pan down (eased, for the HUD beam)
  let tiltWant = 0;
  let shears: Shears[] = [];
  const weights: Weight[] = [];
  let second = false;
  const every = (): number => (second ? 6200 : 8000);
  let weighAt = ctx.scene.time.now + every();

  const spot = (): Pt => {
    for (let i = 0; i < 16; i++) {
      const x = 140 + ctx.rng() * (W - 280), y = top + 80 + ctx.rng() * (H - top - 160);
      if (SIDES.some((k) => dist(fOf(k).x, fOf(k).y, x, y) < 140)) continue;
      if (weights.some((w) => dist(w.x, w.y, x, y) < 200)) continue;
      return { x, y };
    }
    return { x: W / 2, y: (top + H) / 2 };
  };

  const addWeight = (heft: number): void => {
    const at = spot();
    const w: Weight = {
      x: at.x, y: at.y, heft, owner: 'n', flipAt: -1e9,
      t: ctx.target({
        x: at.x, y: at.y - 10, r: 22,
        onStruck(by) {
          const now = ctx.scene.time.now;
          const side: Side = by === 'player' ? 'p' : 'n';
          if (w.owner === side || now - w.flipAt < 400) return;
          w.owner = side;
          w.flipAt = now;
          ctx.sfx('anvil');
          // Knocked across the floor a little, so it has to be walked to again.
          const a = ctx.rng() * Math.PI * 2;
          w.x = Phaser.Math.Clamp(w.x + Math.cos(a) * 110, 90, W - 90);
          w.y = Phaser.Math.Clamp(w.y + Math.sin(a) * 90, top + 70, H - 60);
          w.t.moveTo(w.x, w.y - 10);
        },
      }),
    };
    weights.push(w);
  };
  addWeight(26);

  const weigh = (time: number): void => {
    const pan = { p: tithe.p, n: tithe.n };
    for (const w of weights) pan[w.owner] += w.heft;
    wanting = pan.p < pan.n ? 'p' : pan.n < pan.p ? 'n' : null;
    tiltWant = wanting === 'p' ? 1 : wanting === 'n' ? -1 : 0;
    tithe.p = 0; tithe.n = 0;
    ctx.sfx('clang');
    if (!wanting) { ctx.flash(W / 2, top + 20, SPORE); return; }
    const f = fOf(wanting);
    if (!live(f)) return;
    if (wanting === 'p') tk.spawnZone({ x: f.x, y: f.y, radius: SHEAR_R, warnMs: SHEAR_MS, damage: 15 });
    shears.push({ x: f.x, y: f.y, at: time + tk.warn(SHEAR_MS), at0: time, who: wanting, done: false });
  };

  return {
    update(time, dt) {
      if (!second && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        second = true;
        addWeight(16);
        ctx.sfx('money');
      }
      if (time >= weighAt) { weighAt = time + every(); weigh(time); }
      tilt += (tiltWant - tilt) * Math.min(1, dt * 4);
      for (const s of shears) {
        if (s.done || time < s.at) continue;
        s.done = true;
        ctx.sfx('slash');
        // The player's bite is the toolkit's zone; Tare's we judge ourselves.
        const n = ctx.npc;
        if (s.who === 'n' && live(n) && dist(n.x, n.y, s.x, s.y) < SHEAR_R + 14) ctx.hit(n, 18, n.x, n.y);
      }
      shears = shears.filter((s) => time < s.at + 450);
    },

    // Every blow is tithe on the striker's pan.
    onNpcHurt(amount) { tithe.p += amount; },
    onPlayerHurt(amount) { tithe.n += amount; },

    playerTakenMult: () => (wanting === 'p' ? 1.25 : 1),
    npcTakenMult: () => (wanting === 'n' ? 1.25 : 1),

    npcSeek(): Pt | null {
      const n = ctx.npc;
      const t = ctx.scene.time.now;
      // Out from under the shears.
      const mine = shears.find((s) => s.who === 'n' && !s.done);
      if (mine) {
        const a = Math.atan2(n.y - mine.y, n.x - mine.x);
        return { x: Phaser.Math.Clamp(mine.x + Math.cos(a) * (SHEAR_R + 50), 50, W - 50), y: Phaser.Math.Clamp(mine.y + Math.sin(a) * (SHEAR_R + 50), top + 40, H - 40) };
      }
      // A weight on the player's side: walk up beside it so his next cast knocks it home.
      const lost = weights.filter((w) => w.owner === 'p').sort((a, b) => b.heft - a.heft)[0];
      if (lost && weighAt - t > 900) {
        const a = Math.atan2(n.y - lost.y, n.x - lost.x);
        return { x: lost.x + Math.cos(a) * 46, y: lost.y + Math.sin(a) * 46 };
      }
      return null;
    },

    drawGround(g, time) {
      for (const w of weights) brassWeight(g, w, time);
      // The shears' bite: a ring of steel teeth closing in, painted for Tare (the player's ring is the toolkit's).
      for (const s of shears) {
        const k = Phaser.Math.Clamp((time - s.at0) / Math.max(1, s.at - s.at0), 0, 1);
        if (s.who === 'n' && !s.done) {
          g.lineStyle(2, CAP_RED_LIT, 0.4 + 0.5 * k); g.strokeCircle(s.x, s.y, SHEAR_R);
          g.fillStyle(CAP_RED, 0.08 + 0.15 * k); g.fillCircle(s.x, s.y, SHEAR_R * k);
        }
        shearsArt(g, s.x, s.y, s.done ? 0 : 1 - k, s.done ? Phaser.Math.Clamp(1 - (time - s.at) / 450, 0, 1) : 1);
      }
      // The wanting fighter wears a red tithe-cord round their feet until the next weighing.
      if (wanting) {
        const f = fOf(wanting);
        if (live(f)) {
          g.lineStyle(3, CAP_RED, 0.75); g.strokeEllipse(f.x, f.y + 14, 52, 16);
          g.fillStyle(CAP_RED_LIT, 0.9); g.fillTriangle(f.x + 24, f.y + 14, f.x + 34, f.y + 8, f.x + 34, f.y + 20);
        }
      }
    },

    drawHud(g, time) {
      // The Spore Scales: a beam on a post, two pans, each heaped with the tithe of blows so far,
      // and the brass weights sitting in whichever pan owns them.
      const cx = W / 2, cy = 112;
      const k = Phaser.Math.Clamp(1 - (weighAt - time) / every(), 0, 1);
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(cx - 120, cy - 18, 240, 52, 10);
      g.fillStyle(PLANK_DARK, 1); g.fillRect(cx - 3, cy - 10, 6, 34);
      g.fillStyle(PLANK, 1); g.fillTriangle(cx - 12, cy + 26, cx + 12, cy + 26, cx, cy + 14);
      const ang = tilt * 0.22;
      const lx = cx - Math.cos(ang) * 80, ly = cy - 8 - Math.sin(ang) * 80;
      const rx = cx + Math.cos(ang) * 80, ry = cy - 8 + Math.sin(ang) * 80;
      g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(lx, ly, rx, ry);
      g.lineStyle(2, BRASS, 1); g.lineBetween(lx, ly - 1, rx, ry - 1);
      g.fillStyle(BRASS, 1); g.fillCircle(cx, cy - 8, 4);
      pan(g, lx, ly + 16, tithe.p, weights.filter((w) => w.owner === 'p'), 'p');
      pan(g, rx, ry + 16, tithe.n, weights.filter((w) => w.owner === 'n'), 'n');
      // The weighing clock under the beam.
      g.fillStyle(SPORE_DARK, 0.6); g.fillRoundedRect(cx - 40, cy + 28, 80, 4, 2);
      g.fillStyle(SPORE, 1); g.fillRoundedRect(cx - 40, cy + 28, 80 * k, 4, 2);
    },

    destroy() { for (const w of weights) w.t.remove(); },
  };
}

/** One pan of the HUD scale: chains, a dish, mushrooms heaped by tithe, brass weights on top. */
function pan(g: G, x: number, y: number, tithe: number, ws: Weight[], who: Side): void {
  g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(x, y - 16, x - 16, y); g.lineBetween(x, y - 16, x + 16, y);
  g.fillStyle(BRASS_DARK, 1); g.fillEllipse(x, y + 2, 40, 10);
  g.fillStyle(BRASS, 1); g.fillEllipse(x, y, 38, 8);
  const heap = Math.min(7, Math.floor(tithe / 8));
  for (let i = 0; i < heap; i++) {
    const hx = x - 12 + (i % 4) * 8, hy = y - 3 - Math.floor(i / 4) * 5;
    g.fillStyle(STEM, 1); g.fillRect(hx - 1, hy - 1, 2, 3);
    g.fillStyle(who === 'p' ? CAP_RED : 0x8f6438, 1); g.fillEllipse(hx, hy - 2, 7, 4);
  }
  ws.forEach((w, i) => {
    const wx = x + 10 - i * 9, wy = y - 10;
    g.fillStyle(BRASS_DARK, 1); g.fillRect(wx - 4, wy - 3, 8, 7);
    g.fillStyle(BRASS, 1); g.fillRect(wx - 3, wy - 3, 5, 6);
    g.fillStyle(BRASS, 1); g.fillCircle(wx, wy - 4, w.heft > 20 ? 2.5 : 1.8);
  });
}

/**
 * Tare's brass weight on the moss: a stepped bell of brass with a ring knob, its heft stamped in
 * pips on the face, and a ribbon that shows whose pan it belongs to (red yours, tan his).
 */
function brassWeight(g: G, w: Weight, time: number): void {
  const s = w.heft > 20 ? 1 : 0.78;
  const jolt = Phaser.Math.Clamp(1 - (time - w.flipAt) / 300, 0, 1);
  const x = w.x, y = w.y - jolt * 12;
  shadow(g, w.x, w.y + 2, 42 * s, 12 * s, 0.45);
  glow(g, x, y - 14 * s, 26 * s, BRASS, 0.04, 3);
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - 18 * s, y - 14 * s, 36 * s, 16 * s, 3);
  g.fillStyle(BRASS, 1); g.fillRoundedRect(x - 17 * s, y - 14 * s, 26 * s, 14 * s, 3);
  g.fillStyle(BRASS_DARK, 1); g.fillRoundedRect(x - 12 * s, y - 26 * s, 24 * s, 13 * s, 3);
  g.fillStyle(lit(BRASS, 0.2), 1); g.fillRoundedRect(x - 11 * s, y - 26 * s, 16 * s, 11 * s, 3);
  g.lineStyle(3 * s, BRASS_DARK, 1); g.strokeCircle(x, y - 31 * s, 5 * s);
  g.lineStyle(1.5 * s, lit(BRASS, 0.4), 1); g.strokeCircle(x - 1, y - 32 * s, 4 * s);
  const pips = Math.round(w.heft / 8);
  for (let i = 0; i < pips; i++) { g.fillStyle(dim(BRASS, 0.5), 1); g.fillCircle(x - 9 * s + i * 6 * s, y - 7 * s, 1.6 * s); }
  const ribbon = w.owner === 'p' ? CAP_RED_LIT : 0x8f6438;
  g.fillStyle(ribbon, 1); g.fillTriangle(x + 6 * s, y - 31 * s, x + 20 * s, y - 36 * s, x + 18 * s, y - 26 * s);
  g.fillStyle(MOSS_DARK, 0.6); g.fillEllipse(w.x - 14, w.y + 2, 10, 4);
}

/** The pruning shears seen from above: two long blades on a rivet, open by `open` (1 wide, 0 shut). */
function shearsArt(g: G, x: number, y: number, open: number, a: number): void {
  if (a <= 0) return;
  const spread = 0.08 + open * 0.55;
  for (const sgn of [-1, 1]) {
    const ang = -Math.PI / 2 + sgn * spread;
    const tx = x + Math.cos(ang) * SHEAR_R, ty = y + Math.sin(ang) * SHEAR_R;
    const hx = x - Math.cos(ang) * 46, hy = y - Math.sin(ang) * 46;
    g.lineStyle(9, 0x5c6066, a); g.lineBetween(x, y, tx, ty);
    g.lineStyle(3, 0xd8dde2, a); g.lineBetween(x + sgn * 2, y, tx + sgn * 2, ty);
    g.lineStyle(6, PLANK_DARK, a); g.lineBetween(x, y, hx, hy);
    g.lineStyle(3, CAP_RED, a); g.strokeCircle(hx, hy, 8);
  }
  g.fillStyle(BRASS, a); g.fillCircle(x, y, 5);
}

export const FALLEN_HEAVIER_PAN: GimmickDef = {
  id: ID,
  rules: 'Your blows weigh on your pan, his on his. The lighter pan is cut and takes more harm. Strike the brass weight to knock it onto your side.',
  make,
};
