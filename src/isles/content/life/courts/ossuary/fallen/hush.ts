import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, glow, lit, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, O, OCOL, alive, clamp, dist, drawBone, drawLily, drawSkull, jit } from '../util';

/**
 * WEEP WITHOUT A SOUND — Thomasin Scobie, Mourning-Warden of the Ossuary.
 *
 * "Mourners not admitted." In the King's telling Thomasin walked the Long Beds at night with a
 * hand-bell muffled in felt, and wrote down anyone who wept aloud over a grave. She says the dead
 * sleep light down here, and that noise is how you wake them.
 *
 * The fight is fought over shallow graves. Every ability a fighter casts is NOISE (a basic swing a
 * little, a big ability a lot, an ultimate a great deal), and noise drains away when you are quiet.
 * Whoever's noise brims over wakes the bed under them: a ring of finger-bones breaks the soil where
 * they stand and, a breath later, a buried hand closes there — it roots and crushes everyone inside.
 * Walk out of the ring and it closes on nothing.
 *
 * Thomasin makes noise too: her casts fill her own meter and the dead rise under her just the same.
 * The exploit is to stay quiet while she spends, and to fight beside her ring when it opens — or to
 * let your own ring open, and hold her in it. Halfway down she is weeping herself: the dead reach
 * twice — a second hand follows whoever woke them, wherever they ran.
 */

const ID = fallenId('ossuary', 'hush');
const FULL = 100;
const DECAY = 9;
const GRASP_R = 72;
const CLOSE_MS = 1150;
const FOLLOW_MS = 950;
const HOLD_MS = 650;

type Side = 'player' | 'npc';

interface Grasp {
  x: number; y: number;
  at: number; closeAt: number;
  owner: Side;
  closed: boolean;
  /** A first hand spawns its follower when it closes (second half only). */
  follows: boolean;
  seed: number;
}

interface Ripple { x: number; y: number; at: number; big: boolean }
interface Grave { x: number; y: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const clock = new Clock();
  const noise: Record<Side, number> = { player: 0, npc: 0 };
  const grasps: Grasp[] = [];
  const ripples: Ripple[] = [];
  const graves: Grave[] = [];
  for (let i = 0; i < 9; i++) {
    graves.push({ x: 90 + (i % 3) * 320 + ctx.rng() * 140, y: top + 70 + Math.floor(i / 3) * 170 + ctx.rng() * 50, seed: i * 1.7 + 0.3 });
  }
  let now = 0;
  let weeping = false;
  let seq = 0;
  const fighter = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);

  const wake = (s: Side, follows: boolean, delay = CLOSE_MS): void => {
    const f = fighter(s);
    grasps.push({ x: f.x, y: f.y + 10, at: now, closeAt: now + tk.warn(delay), owner: s, closed: false, follows, seed: ++seq * 2.3 });
    ctx.sfx('curse-cast');
    ctx.float(f.x, f.y - 56, s === 'player' ? 'THE BED WAKES UNDER YOU' : 'THE BED WAKES UNDER THOMASIN', s === 'player' ? OCOL.red : OCOL.green);
  };

  const addNoise = (s: Side, amount: number): void => {
    const f = fighter(s);
    noise[s] += amount;
    ripples.push({ x: f.x, y: f.y, at: now, big: amount >= 20 });
    if (noise[s] >= FULL) { noise[s] = 0; wake(s, weeping); }
  };

  const close = (gr: Grasp): void => {
    gr.closed = true;
    ctx.sfx('stone-slam');
    ctx.flash(gr.x, gr.y, O.bone);
    for (const s of ['player', 'npc'] as Side[]) {
      const f = fighter(s);
      if (!alive(f) || dist(f.x, f.y + 10, gr.x, gr.y) > GRASP_R + 14) continue;
      if (s === 'player') { tk.hitPlayer(14, f.x, f.y); ctx.root(f, 1000); }
      else { ctx.hit(f, 24, f.x, f.y); ctx.root(f, 1300); ctx.float(f.x, f.y - 60, 'HELD BY THE DEAD', OCOL.green); }
    }
    if (gr.follows) {
      // The second hand: it goes where the waker went, with its own fair warning.
      const f = fighter(gr.owner);
      if (alive(f)) grasps.push({ x: f.x, y: f.y + 10, at: now, closeAt: now + tk.warn(FOLLOW_MS), owner: gr.owner, closed: false, follows: false, seed: ++seq * 2.3 });
    }
  };

  return {
    update(time: number) {
      const dt = clock.tick(time);
      now = time;
      if (dt === 0) return;
      if (!weeping && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        weeping = true;
        ctx.banner('THOMASIN WEEPS — THE DEAD REACH TWICE', OCOL.holy);
        ctx.sfx('screech');
      }
      for (const s of ['player', 'npc'] as Side[]) noise[s] = Math.max(0, noise[s] - DECAY * dt);
      for (const gr of grasps) if (!gr.closed && now >= gr.closeAt) close(gr);
      for (let i = grasps.length - 1; i >= 0; i--) if (grasps[i].closed && now - grasps[i].closeAt > HOLD_MS) grasps.splice(i, 1);
      while (ripples.length && now - ripples[0].at > 900) ripples.shift();
    },

    onPlayerCast(_id: string, slot: string | null) {
      addNoise('player', slot === 'click' ? 7 : slot === 'q' ? 34 : 16);
    },
    onNpcCast() { addNoise('npc', 13); },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      // An open grave under her: out past its rim, away from you if she can.
      for (const gr of grasps) {
        if (gr.closed) continue;
        const d = dist(n.x, n.y + 10, gr.x, gr.y);
        if (d < GRASP_R + 40) {
          const a = d > 4 ? Math.atan2(n.y + 10 - gr.y, n.x - gr.x) : Math.atan2(n.y - p.y, n.x - p.x);
          return { x: tk.clampX(gr.x + Math.cos(a) * (GRASP_R + 70)), y: tk.clampY(gr.y + Math.sin(a) * (GRASP_R + 70)) };
        }
      }
      // A ring opening under you: she waits at its rim so you have to run toward her to leave it.
      const yours = grasps.find((gr) => !gr.closed && gr.owner === 'player');
      if (yours) {
        const a = Math.atan2(n.y - yours.y, n.x - yours.x);
        return { x: tk.clampX(yours.x + Math.cos(a) * (GRASP_R + 60)), y: tk.clampY(yours.y + Math.sin(a) * (GRASP_R + 60)) };
      }
      // Loud herself: she backs off to let it drain.
      if (noise.npc > 70) {
        const a = Math.atan2(n.y - p.y, n.x - p.x);
        return { x: tk.clampX(n.x + Math.cos(a) * 140), y: tk.clampY(n.y + Math.sin(a) * 140) };
      }
      return null;
    },

    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      for (const gv of graves) drawGrave(g, gv, time, grasps.some((gr) => !gr.closed && dist(gr.x, gr.y, gv.x, gv.y) < 120));
      for (const gr of grasps) drawGrasp(g, gr, time);
    },

    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      for (const gr of grasps) if (gr.closed) drawHand(g, gr, clamp((time - gr.closeAt) / HOLD_MS, 0, 1));
      // Noise goes out as rings of sound, and the lilies nearest flinch.
      for (const r of ripples) {
        const k = (time - r.at) / 900;
        if (k < 0 || k > 1) continue;
        for (let i = 0; i < (r.big ? 3 : 2); i++) {
          const kk = clamp(k - i * 0.18, 0, 1);
          if (kk <= 0) continue;
          g.lineStyle(r.big ? 2.5 : 1.5, O.holy, 0.5 * (1 - kk));
          g.beginPath(); g.arc(r.x, r.y - 6, 20 + kk * (r.big ? 110 : 70), -Math.PI * 0.9, -Math.PI * 0.1); g.strokePath();
        }
      }
      // A little bell-meter over Thomasin: how near she is to waking her own bed.
      const n = ctx.npc;
      if (alive(n)) drawMeter(g, n.x, n.y - 62, noise.npc / FULL, time);
    },

    drawHud(g: Phaser.GameObjects.Graphics, time: number) {
      // Your noise: a skull whose jaw drops as the quiet runs out, over a felt-muffled bar.
      const k = noise.player / FULL;
      const x = 34, y = H - 70;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 22, y - 30, 182, 56, 10);
      const shake = k > 0.75 ? Math.sin(time / 40) * 1.5 : 0;
      drawSkull(g, x + shake, y - 8, 13, 1, { jaw: k, eye: O.marrowLit, eyeA: k > 0.6 ? (k - 0.6) * 2.5 : 0 });
      g.fillStyle(O.loamDeep, 1); g.fillRoundedRect(x + 24, y - 6, 120, 12, 5);
      g.fillStyle(k > 0.75 ? O.sinewLit : k > 0.45 ? O.candle : O.boneShade, 1); g.fillRoundedRect(x + 24, y - 6, Math.max(4, 120 * k), 12, 5);
      for (let i = 1; i < 5; i++) { g.fillStyle(O.loam, 1); g.fillRect(x + 24 + i * 24, y - 6, 1.5, 12); }
      g.lineStyle(1, O.boneShade, 0.6); g.strokeRoundedRect(x + 24, y - 6, 120, 12, 5);
      if (weeping) { g.fillStyle(O.holy, 0.9); for (let i = 0; i < 2; i++) g.fillTriangle(x + 70 + i * 26, y + 12, x + 76 + i * 26, y + 12, x + 73 + i * 26, y + 20); }
      if (k > 0.8) { g.fillStyle(O.sinew, (k - 0.8) * 0.4); g.fillRect(0, H - 12, W, 12); }
    },
  };
}

/** A shallow grave: a turf mound, a lily at its head, and a few knuckles showing through the loam. */
function drawGrave(g: Phaser.GameObjects.Graphics, gv: Grave, time: number, stirred: boolean): void {
  const tremble = stirred ? Math.sin(time / 35 + gv.seed) * 1.5 : 0;
  shadow(g, gv.x, gv.y + 10, 90, 24, 0.25);
  g.fillStyle(O.loamDeep, 1); g.fillEllipse(gv.x, gv.y, 92, 40);
  g.fillStyle(O.moss, 0.9); g.fillEllipse(gv.x + tremble, gv.y - 3, 80, 30);
  g.fillStyle(O.mossLit, 0.45); g.fillEllipse(gv.x - 10 + tremble, gv.y - 8, 44, 14);
  for (let i = 0; i < 3; i++) {
    const bx = gv.x - 24 + jit(gv.seed, i) * 48, by = gv.y - 4 + jit(gv.seed, i + 5) * 10;
    drawBone(g, bx, by, bx + 10 + jit(gv.seed, i + 9) * 8, by - 3, 3, O.boneDark, 0.8);
  }
  drawLily(g, gv.x + 36, gv.y - 6, 5, 0.9, (stirred ? Math.sin(time / 50) * 0.6 : 0.15));
}

/** The ring that opens: soil cracking outward, ten finger-bones pushing up through the turf. */
function drawGrasp(g: Phaser.GameObjects.Graphics, gr: Grasp, time: number): void {
  if (gr.closed) return;
  const k = clamp((time - gr.at) / (gr.closeAt - gr.at), 0, 1);
  g.fillStyle(O.loamDeep, 0.35 + k * 0.35); g.fillEllipse(gr.x, gr.y, GRASP_R * 2, GRASP_R * 1.1);
  g.lineStyle(2, gr.owner === 'player' ? O.sinewLit : O.holy, 0.5 + k * 0.4); g.strokeEllipse(gr.x, gr.y, GRASP_R * 2, GRASP_R * 1.1);
  // The closing hand's shadow, shrinking toward the centre as the moment comes.
  g.lineStyle(1.5, O.boneShade, 0.35 + k * 0.4); g.strokeEllipse(gr.x, gr.y, GRASP_R * 2 * (1 - k * 0.8), GRASP_R * 1.1 * (1 - k * 0.8));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + jit(gr.seed, i) * 0.3;
    const len = GRASP_R * (0.3 + k * 0.7) * (0.6 + jit(gr.seed, i + 20) * 0.4);
    g.lineStyle(1, 0x0e0a0c, 0.8);
    g.lineBetween(gr.x, gr.y, gr.x + Math.cos(a) * len, gr.y + Math.sin(a) * len * 0.55);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const fx = gr.x + Math.cos(a) * GRASP_R * 0.9, fy = gr.y + Math.sin(a) * GRASP_R * 0.5;
    const rise = (4 + k * 18) * (0.7 + jit(gr.seed, i + 40) * 0.3);
    const lean = Math.cos(a) * -4 * k;
    drawBone(g, fx, fy, fx + lean, fy - rise, 3.2, O.bone, 0.6 + k * 0.4);
    g.fillStyle(O.boneLit, 0.8); g.fillCircle(fx + lean, fy - rise - 1, 2);
  }
  if (k > 0.7 && Math.floor(time / 90) % 2 === 0) glow(g, gr.x, gr.y, GRASP_R, O.marrow, 0.03, 3);
}

/** The hand that closed: a great skeletal fist risen out of the bed, sinking back as it lets go. */
function drawHand(g: Phaser.GameObjects.Graphics, gr: Grasp, k: number): void {
  const a = 1 - k;
  const x = gr.x, y = gr.y;
  const h = 46 * (1 - k * 0.6);
  g.fillStyle(O.loamDeep, 0.6 * a); g.fillEllipse(x, y, GRASP_R * 1.6, GRASP_R * 0.7);
  // Wrist bones, the knuckle row, and the curled fingers meeting over the centre.
  drawBone(g, x - 8, y + 6, x - 6, y - h * 0.6, 7, O.boneShade, a);
  drawBone(g, x + 8, y + 6, x + 6, y - h * 0.6, 6, O.boneShade, a);
  g.fillStyle(O.bone, a); g.fillEllipse(x, y - h * 0.7, 46, 22);
  g.fillStyle(lit(O.bone, 0.4), a); g.fillEllipse(x - 6, y - h * 0.75, 26, 9);
  for (let i = 0; i < 4; i++) {
    const fx = x - 18 + i * 12;
    g.fillStyle(dim(O.bone, 0.1), a); g.fillRoundedRect(fx - 4, y - h - 4, 9, 18, 4);
    g.fillStyle(O.boneDark, a); g.fillRect(fx - 3, y - h + 4, 7, 1.5);
    g.fillStyle(O.boneLit, a); g.fillCircle(fx, y - h - 2, 2.5);
  }
  g.fillStyle(O.bone, a); g.fillRoundedRect(x + 18, y - h * 0.8, 12, 9, 4);
}

/** Thomasin's muffled hand-bell over her head: felt-wrapped, filling with her own noise. */
function drawMeter(g: Phaser.GameObjects.Graphics, x: number, y: number, k: number, time: number): void {
  const swing = k > 0.7 ? Math.sin(time / 70) * 0.25 : 0;
  const bx = x + Math.sin(swing) * 6;
  g.fillStyle(O.iron, 1); g.fillRect(bx - 1, y - 16, 2, 6);
  g.fillStyle(O.gilt, 1); g.fillTriangle(bx - 9, y, bx + 9, y, bx, y - 12);
  g.fillStyle(O.wax, 0.9); g.fillRect(bx - 9, y - 6, 18, 5);
  g.fillStyle(0x000000, 0.5); g.fillRect(x - 22, y + 4, 44, 6);
  g.fillStyle(k > 0.75 ? O.sinewLit : O.holy, 1); g.fillRect(x - 21, y + 5, 42 * k, 4);
}

export const FALLEN_HUSH: GimmickDef = {
  id: ID,
  rules: 'Casting is noise. Brim over and the grave under you wakes: a hand closes there on all inside. Her noise counts too. At half it reaches twice.',
  make,
};
