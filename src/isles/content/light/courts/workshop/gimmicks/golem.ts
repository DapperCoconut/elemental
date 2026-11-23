import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, mixC, type G } from '../../../../../art/IsleArt';
import {
  CLAY, CLAY_DARK, CLAY_LIT, IRON_LIT, LIME_DARK, LIME_LIT, OAK, OAK_DARK, SIDE_NPC, SIDE_PLAYER,
} from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Golem — Sculptor Kiln.
 *
 * A clay golem stands half-made on a turntable in the middle of the floor: a lump with the start of
 * legs, a wire armature poking out. Every blow a fighter lands on it *shapes* it — the clay takes
 * that fighter's colour where they struck — and standing close kneads it too. When it is finished
 * it wakes, and fights for whoever shaped it most: it lumbers after their foe and brings both fists
 * down in a telegraphed slam.
 *
 * While it is awake, the side it hunts can knock chunks off it — every blow shortens its waking.
 * Then it slumps back into a lump on the turntable, and the shaping starts again from nothing.
 */

const KNEAD_R = 84;
const KNEAD_EVERY = 1100;
const KNEAD_AMT = 5;
const WAKE_MS = 12000;
const SLAM_EVERY = 2300;
const SLAM_WARN = 900;
const SLAM_R = 92;

interface Slam { x: number; y: number; at: number; dealt: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const home: Pt = { x: W / 2, y: (top + H) / 2 + 20 };
  const NEED = ctx.hard ? 100 : 115;
  const SLAM_DMG = ctx.hard ? 19 : 16;
  const shaped = { player: 0, npc: 0 };
  /** Where each side's colour went on: little thumbprints on the body. */
  const prints: { dx: number; dy: number; side: 'player' | 'npc' }[] = [];
  let state: 'clay' | 'wake' | 'awake' | 'slump' = 'clay';
  let stateAt = 0;
  let owner: 'player' | 'npc' = 'player';
  let wakeUntil = 0;
  let gx = home.x, gy = home.y;
  let facing = 0;
  let nextSlam = 0;
  let slam: Slam | null = null;
  const kneadAt = new Map<Fighter, number>();
  let target: StrikeTarget | null = null;
  let started = false;
  const chips: { x: number; y: number; vx: number; vy: number; at: number }[] = [];

  const progress = () => clamp((shaped.player + shaped.npc) / NEED, 0, 1);
  const foeOf = (s: 'player' | 'npc'): Fighter => (s === 'player' ? npc : player);

  function shape(side: 'player' | 'npc', amount: number): void {
    if (state !== 'clay') return;
    shaped[side] += clamp(amount, 3, 18);
    if (prints.length < 60) prints.push({ dx: (rng() - 0.5) * 40, dy: -10 - rng() * 70 * Math.max(0.3, progress()), side });
    if (shaped.player + shaped.npc >= NEED) {
      state = 'wake';
      stateAt = ctx.scene.time.now;
      owner = shaped.player >= shaped.npc ? 'player' : 'npc';
      ctx.banner(owner === 'player' ? 'THE GOLEM WAKES — IT IS YOURS' : 'THE GOLEM WAKES — IT IS KILN\'S', owner === 'player' ? '#9ad8ff' : '#ffb0a0');
      ctx.sfx('stone-rise');
    }
  }

  function chip(by: 'player' | 'npc', amount: number, time: number): void {
    if (state !== 'awake' || by === owner) return;
    wakeUntil -= clamp(amount, 3, 18) * 70;
    for (let i = 0; i < 3; i++) chips.push({ x: gx + (rng() - 0.5) * 30, y: gy - 40 - rng() * 40, vx: (rng() - 0.5) * 160, vy: -60 - rng() * 80, at: time });
    if (rng() < 0.4) ctx.float(gx, gy - 96, 'CHUNK OFF', '#e8b890');
  }

  function struck(by: 'player' | 'npc', amount: number): void {
    const time = ctx.scene.time.now;
    if (state === 'clay') shape(by, amount);
    else chip(by, amount, time);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        target = ctx.target({ x: gx, y: gy - 30, r: 36, onStruck: struck });
      }
      if (state === 'clay') {
        // Standing close kneads it.
        for (const [f, side] of [[player, 'player'], [npc, 'npc']] as [Fighter, 'player' | 'npc'][]) {
          if (!alive(f) || dist(f.x, f.y, gx, gy) > KNEAD_R) continue;
          const last = kneadAt.get(f) ?? 0;
          if (time - last >= KNEAD_EVERY) {
            kneadAt.set(f, time);
            ctx.float(gx + (f.x < gx ? -30 : 30), gy - 70, 'knead', side === 'player' ? '#9ad8ff' : '#ffb0a0');
            shape(side, KNEAD_AMT);
          }
        }
      } else if (state === 'wake' && time - stateAt >= 1000) {
        state = 'awake';
        stateAt = time;
        wakeUntil = time + WAKE_MS;
        nextSlam = time + 1200;
      } else if (state === 'awake') {
        const foe = foeOf(owner);
        if (alive(foe)) {
          const d = dist(gx, gy, foe.x, foe.y);
          facing = Math.atan2(foe.y - gy, foe.x - gx);
          if (!slam && d > 70) {
            const sp = (ctx.hard ? 100 : 86) * dt;
            gx = clamp(gx + Math.cos(facing) * sp, 60, W - 60);
            gy = clamp(gy + Math.sin(facing) * sp, top + 60, H - 40);
          }
          if (!slam && time >= nextSlam && d < 260) {
            // Both fists up; the slam lands where the foe is now, a little ahead of the golem.
            slam = { x: clamp(gx + Math.cos(facing) * Math.min(d, 90), 40, W - 40), y: clamp(gy + Math.sin(facing) * Math.min(d, 90), top + 40, H - 30), at: time, dealt: false };
            ctx.sfx('beam-charge');
          }
        }
        if (slam && !slam.dealt && time - slam.at >= SLAM_WARN) {
          slam.dealt = true;
          const f = foeOf(owner);
          if (alive(f) && dist(f.x, f.y, slam.x, slam.y) < SLAM_R) {
            ctx.hit(f, SLAM_DMG, f.x, f.y);
            const a = Math.atan2(f.y - slam.y, f.x - slam.x);
            ctx.nudge(f, Math.cos(a) * 70, Math.sin(a) * 70);
          }
          ctx.sfx('quake');
          nextSlam = time + SLAM_EVERY;
        }
        if (slam && time - slam.at > SLAM_WARN + 450) slam = null;
        target?.moveTo(gx, gy - 30);
        if (time >= wakeUntil) {
          state = 'slump';
          stateAt = time;
          slam = null;
          ctx.banner('THE GOLEM SLUMPS BACK TO CLAY', '#e8b890');
          ctx.sfx('stone-slam');
        }
      } else if (state === 'slump') {
        // It shuffles back onto its turntable, crumbling.
        const k = clamp((time - stateAt) / 1600, 0, 1);
        gx += (home.x - gx) * Math.min(1, dt * 3);
        gy += (home.y - gy) * Math.min(1, dt * 3);
        target?.moveTo(gx, gy - 30);
        if (k >= 1) {
          state = 'clay';
          stateAt = time;
          gx = home.x; gy = home.y;
          shaped.player = 0; shaped.npc = 0;
          prints.length = 0;
        }
      }
      for (let i = chips.length - 1; i >= 0; i--) {
        const c = chips[i];
        c.vy += 400 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        if (time - c.at > 900) chips.splice(i, 1);
      }
    },

    npcSeek() {
      if (state === 'clay') {
        // Knead it from the side away from the stranger, striking as he goes.
        const a = Math.atan2(gy - player.y, gx - player.x);
        return { x: clamp(gx + Math.cos(a) * 60, 60, W - 60), y: clamp(gy + Math.sin(a) * 50, top + 50, H - 40) };
      }
      if ((state === 'awake' || state === 'wake') && owner === 'player') {
        // Run from his own sculpture, round the far side of the stranger.
        const a = Math.atan2(npc.y - gy, npc.x - gx);
        return { x: clamp(gx + Math.cos(a) * 330, 60, W - 60), y: clamp(gy + Math.sin(a) * 260, top + 50, H - 40) };
      }
      // His golem hunts you: he keeps you between it and him.
      const a = Math.atan2(player.y - gy, player.x - gx);
      return { x: clamp(player.x + Math.cos(a) * 160, 60, W - 60), y: clamp(player.y + Math.sin(a) * 140, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The turntable and a spatter of clay round it.
      g.fillStyle(OAK_DARK, 1); g.fillEllipse(home.x, home.y + 4, 120, 40);
      g.fillStyle(OAK, 1); g.fillEllipse(home.x, home.y, 112, 34);
      g.lineStyle(1, OAK_DARK, 0.6); g.strokeEllipse(home.x, home.y, 80, 22);
      for (let i = 0; i < 14; i++) {
        const a = i * 0.9, d = 70 + (i % 4) * 12;
        g.fillStyle(i % 2 ? CLAY : CLAY_DARK, 0.5); g.fillCircle(home.x + Math.cos(a) * d, home.y + Math.sin(a) * d * 0.45, 3 + (i % 3));
      }
      // The kneading ring while it can still be shaped.
      if (state === 'clay') {
        g.lineStyle(1.5, CLAY_LIT, 0.3 + Math.sin(time / 300) * 0.1);
        g.strokeEllipse(gx, gy, KNEAD_R * 2, KNEAD_R * 0.9);
      }
      // The slam's telegraph: a cracking circle where the fists will land.
      if (slam && !slam.dealt) {
        const k = clamp((time - slam.at) / SLAM_WARN, 0, 1);
        const c = owner === 'player' ? SIDE_PLAYER : SIDE_NPC;
        g.fillStyle(c, 0.08 + k * 0.18); g.fillEllipse(slam.x, slam.y, SLAM_R * 2, SLAM_R * 1.2);
        g.lineStyle(2, c, 0.5 + k * 0.4); g.strokeEllipse(slam.x, slam.y, SLAM_R * 2 * k, SLAM_R * 1.2 * k);
        g.lineStyle(2, c, 0.8); g.strokeEllipse(slam.x, slam.y, SLAM_R * 2, SLAM_R * 1.2);
      } else if (slam && slam.dealt) {
        const k = clamp((time - slam.at - SLAM_WARN) / 450, 0, 1);
        g.lineStyle(4 * (1 - k), CLAY_LIT, 1 - k); g.strokeEllipse(slam.x, slam.y, SLAM_R * 2 * (0.8 + k * 0.5), SLAM_R * 1.2 * (0.8 + k * 0.5));
        for (let i = 0; i < 6; i++) { const a = i * 1.05; g.lineStyle(2, CLAY_DARK, 1 - k); g.lineBetween(slam.x, slam.y, slam.x + Math.cos(a) * SLAM_R * 0.8, slam.y + Math.sin(a) * SLAM_R * 0.5); }
      }
      g.fillStyle(0x000000, 0.25); g.fillEllipse(gx, gy + 4, 70, 18);
    },

    drawAir(g, time) {
      const p = state === 'clay' ? progress() : 1;
      const ratio = shaped.player + shaped.npc > 0 ? shaped.player / (shaped.player + shaped.npc) : 0.5;
      const base = state === 'clay' ? CLAY : mixC(CLAY, owner === 'player' ? SIDE_PLAYER : SIDE_NPC, 0.28);
      const wake = state === 'wake' ? clamp((time - stateAt) / 1000, 0, 1) : state === 'awake' ? 1 : 0;
      const slump = state === 'slump' ? clamp((time - stateAt) / 1600, 0, 1) : 0;
      const sag = slump * 30;
      const step = state === 'awake' && !slam ? Math.sin(time / 160) * 4 : 0;
      const lift = slam && !slam.dealt ? clamp((time - slam.at) / SLAM_WARN, 0, 1) : 0;
      drawGolem(g, gx, gy, p, base, wake, sag, step, facing, lift, time);
      // Thumbprints of colour where each side shaped it.
      if (state === 'clay') {
        for (const pr of prints) {
          const c = pr.side === 'player' ? SIDE_PLAYER : SIDE_NPC;
          g.fillStyle(c, 0.55); g.fillEllipse(gx + pr.dx * (0.5 + p * 0.5), gy + pr.dy, 7, 5);
        }
      }
      // The meter of colour on the plinth: who is shaping it more.
      if (state === 'clay') {
        const w = 110, x0 = home.x - w / 2, y0 = home.y + 26;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, y0 - 2, w + 4, 10, 4);
        const fill = w * p;
        g.fillStyle(SIDE_PLAYER, 0.95); g.fillRect(x0 + (w - fill) / 2, y0, fill * ratio, 6);
        g.fillStyle(SIDE_NPC, 0.95); g.fillRect(x0 + (w - fill) / 2 + fill * ratio, y0, fill * (1 - ratio), 6);
        g.lineStyle(1, LIME_LIT, 0.6); g.strokeRoundedRect(x0 - 2, y0 - 2, w + 4, 10, 4);
      }
      if (state === 'awake') {
        // The waking clock, crumbling down.
        const left = clamp((wakeUntil - time) / WAKE_MS, 0, 1);
        g.lineStyle(3, owner === 'player' ? SIDE_PLAYER : SIDE_NPC, 0.8);
        g.beginPath(); g.arc(gx, gy - 120, 10, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      }
      for (const c of chips) {
        const k = clamp((time - c.at) / 900, 0, 1);
        g.fillStyle(CLAY_DARK, 1 - k); g.fillCircle(c.x, c.y, 4);
      }
    },

    drawHud(g) {
      if (state !== 'clay') return;
      const w = 160, x0 = W / 2 - w / 2, y0 = top + 8;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 3, y0 - 3, w + 6, 14, 5);
      const pw = clamp(shaped.player / NEED, 0, 1) * w;
      const nw = clamp(shaped.npc / NEED, 0, 1) * w;
      g.fillStyle(SIDE_PLAYER, 0.95); g.fillRoundedRect(x0, y0, Math.max(2, pw), 8, 3);
      g.fillStyle(SIDE_NPC, 0.95); g.fillRoundedRect(x0 + w - Math.max(2, nw), y0, Math.max(2, nw), 8, 3);
      g.fillStyle(LIME_DARK, 1); g.fillRect(W / 2 - 1, y0 - 4, 2, 16);
    },

    destroy() { target?.remove(); },
  };
}

/**
 * The golem: built up in stages as `p` (0..1) rises — a lump; legs; a barrel torso; arms; a head with
 * a thumbed-in face. Awake (`wake` 1), its eye-holes glow and it leans toward its foe; `lift` raises
 * both fists over its head before a slam; `sag` melts it down as it slumps.
 */
function drawGolem(g: G, x: number, y: number, p: number, base: number, wake: number, sag: number, step: number, facing: number, lift: number, time: number): void {
  const dark = dim(base, 0.3), light = lit(base, 0.15);
  const lean = wake * Math.cos(facing) * 4;
  // Armature wire, showing where the clay hasn't covered it.
  if (p < 0.9) {
    g.lineStyle(1.5, IRON_LIT, 0.9);
    g.lineBetween(x, y - 10, x, y - 104); g.lineBetween(x - 34, y - 70, x + 34, y - 70);
    g.lineBetween(x - 34, y - 70, x - 40, y - 34); g.lineBetween(x + 34, y - 70, x + 40, y - 34);
  }
  // Legs.
  const legs = clamp(p / 0.25, 0, 1);
  for (const s of [-1, 1]) {
    const lh = 34 * legs;
    const st = s * step;
    g.fillStyle(dark, 1); g.fillRoundedRect(x + s * 14 - 10 + lean * 0.3, y - lh + st * 0.5, 20, lh, 6);
    g.fillStyle(base, 1); g.fillRoundedRect(x + s * 14 - 8 + lean * 0.3, y - lh + st * 0.5, 15, lh - 3, 5);
  }
  if (p < 0.12) { g.fillStyle(base, 1); g.fillEllipse(x, y - 10, 50, 26); g.fillStyle(light, 0.6); g.fillEllipse(x - 8, y - 16, 20, 8); return; }
  // Torso.
  const torso = clamp((p - 0.2) / 0.3, 0, 1);
  const ty = y - 34 + sag * 0.6;
  const th = 56 * torso;
  if (torso > 0) {
    g.fillStyle(dark, 1); g.fillEllipse(x + lean, ty - th / 2, 64, th + 8);
    g.fillStyle(base, 1); g.fillEllipse(x + lean, ty - th / 2 - 2, 58, th);
    g.fillStyle(light, 0.5); g.fillEllipse(x - 12 + lean, ty - th * 0.7, 18, th * 0.4);
    // Tool marks.
    g.lineStyle(1, dark, 0.7);
    for (let i = 0; i < 4; i++) g.lineBetween(x - 18 + i * 10 + lean, ty - th * 0.2 - i * 6, x - 10 + i * 10 + lean, ty - th * 0.3 - i * 6);
  }
  // Arms: hanging, or raised for a slam.
  const arms = clamp((p - 0.5) / 0.25, 0, 1);
  if (arms > 0) {
    for (const s of [-1, 1]) {
      const sx = x + s * 30 + lean, sy = ty - th + 12;
      const ex = sx + s * (16 - lift * 8), ey = sy + 40 * arms - lift * 86;
      g.lineStyle(16, dark, 1); g.lineBetween(sx, sy, ex, ey);
      g.lineStyle(12, base, 1); g.lineBetween(sx, sy, ex, ey);
      g.fillStyle(dark, 1); g.fillCircle(ex, ey, 11 * arms);
      g.fillStyle(base, 1); g.fillCircle(ex - 1, ey - 1, 9 * arms);
    }
  }
  // Head with a thumbed-in face.
  const head = clamp((p - 0.75) / 0.25, 0, 1);
  if (head > 0) {
    const hx = x + lean * 1.3, hy = ty - th - 14 + sag * 0.4;
    g.fillStyle(dark, 1); g.fillCircle(hx, hy, 16 * head);
    g.fillStyle(base, 1); g.fillCircle(hx - 1, hy - 1, 14 * head);
    const eyeC = wake > 0 ? mixC(0x2a1a10, 0xffd27a, wake * (0.7 + Math.sin(time / 120) * 0.3)) : 0x3a2414;
    g.fillStyle(eyeC, 1); g.fillCircle(hx - 5, hy - 2, 3 * head); g.fillCircle(hx + 5, hy - 2, 3 * head);
    g.lineStyle(1.5, dark, 1); g.lineBetween(hx - 4, hy + 6, hx + 4, hy + 6);
  }
  if (sag > 0) { g.fillStyle(base, 0.8); g.fillEllipse(x, y - 4, 60 + sag * 2, 18); }
}

export const GOLEM_GIMMICK: GimmickDef = {
  id: 'workshop-golem',
  rules: 'Every blow on the half-made golem shapes it toward you, and standing close kneads it. Finished, it wakes and fights for whoever shaped it most. Strike it awake to knock chunks off.',
  make,
};
