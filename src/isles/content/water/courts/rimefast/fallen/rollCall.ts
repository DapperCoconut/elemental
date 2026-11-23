import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { glow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, R, RCOL, alive, dist, drawGlint, jit } from '../util';

/**
 * ROLL CALL UNDER ICE — Bailiff-Crier Wendle Moss (death).
 *
 * Everyone lowered through the Tithe Hole sleeps under the harbour ice, "ballast for the crown".
 * In the star's telling the crier who read their names out on the quay was proud of his voice.
 * The drowned drift beneath the floor as pale shapes, and they turn toward warmth: each one swims
 * slowly after whichever fighter cast a spell most recently. Every few seconds he reads the roll —
 * a ring marks each sleeper while the names are read, and when he finishes, hands come up through
 * the ice and hold whoever stands over one.
 *
 * Strike a sleeper (blows reach through the ice) enough and it remembers itself: it surfaces,
 * gasps, and leaves a breath of air on the ice that heals you. Halfway down he reads faster, and
 * more names.
 *
 * The exploit: they follow the last caster. Go quiet before the roll and let him cast — he always
 * does — and the drowned are under HIS feet when the names run out.
 */

type Side = 'player' | 'npc';

interface Sleeper {
  x: number; y: number; seed: number;
  /** Blows landed on it by you; enough and it wakes. */
  woken: number;
  target: StrikeTarget;
  heading: number;
}

interface Grip { x: number; y: number; at: number; seed: number }

const GRIP_R = 54;
const SWIM = 62;
const WAKE_AT = 40;
const CALL_WARN = 1400;

export const FALLEN_ROLL_CALL: GimmickDef = {
  id: fallenId('rimefast', 'roll-call'),
  rules: 'The drowned drift under the ice toward whoever cast last. When the roll is read, hands grip anyone over one. Strike a sleeper to wake it.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, tk, rng } = ctx;
    const sleepers: Sleeper[] = [];
    const grips: Grip[] = [];
    const gasps: { x: number; y: number; at: number }[] = [];
    let now = 0;
    let warm: Side = 'npc';
    let warmAt = 0;
    let callAt = -1;
    let nextCall = 4200;
    let louder = false;
    let calls = 0;
    let respawnAt = 0;

    const spawn = (): void => {
      const edge = Math.floor(rng() * 4);
      const x = edge === 0 ? 60 : edge === 1 ? W - 60 : 80 + rng() * (W - 160);
      const y = edge === 2 ? top + 50 : edge === 3 ? H - 50 : top + 60 + rng() * (H - top - 120);
      const s: Sleeper = {
        x, y, seed: rng() * 100, woken: 0, heading: rng() * Math.PI * 2,
        target: ctx.target({
          x, y, r: 26, passThrough: true,
          onStruck: (by, amount) => {
            if (by !== 'player' || !sleepers.includes(s)) return;
            s.woken += amount;
            if (s.woken >= WAKE_AT) wake(s);
          },
        }),
      };
      sleepers.push(s);
    };

    const wake = (s: Sleeper): void => {
      s.target.remove();
      sleepers.splice(sleepers.indexOf(s), 1);
      gasps.push({ x: s.x, y: s.y, at: now });
      tk.spawnHealOrb(s.x, s.y, 14, 8000);
      ctx.sfx('bubble');
      ctx.float(s.x, s.y - 40, 'REMEMBERED', RCOL.ice);
      respawnAt = now + 5000;
    };

    const cap = (): number => (louder ? 5 : 3);
    for (let i = 0; i < 3; i++) spawn();

    const readRoll = (): void => {
      callAt = -1;
      calls++;
      ctx.sfx('curse-cast');
      for (const s of sleepers) {
        grips.push({ x: s.x, y: s.y, at: now, seed: s.seed });
        for (const f of [ctx.player, ctx.npc] as Fighter[]) {
          if (!alive(f) || ctx.isAirborne(f) || dist(f.x, f.y, s.x, s.y) > GRIP_R) continue;
          ctx.root(f, 1100);
          ctx.hit(f, 12, s.x, s.y);
          ctx.float(f.x, f.y - 54, f === ctx.player ? 'HELD BY THE DROWNED' : 'THEY HOLD THE CRIER', f === ctx.player ? RCOL.red : RCOL.green);
        }
      }
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) return;
        if (!louder && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          louder = true;
          ctx.banner('HE READS LOUDER — more names, sooner', RCOL.warm);
          ctx.sfx('judgement');
        }
        if (sleepers.length < cap() && time >= respawnAt) { spawn(); respawnAt = time + 1500; }
        // The drowned turn toward the warm one — whoever cast last — and drift, never quite straight.
        const f = warm === 'player' ? ctx.player : ctx.npc;
        for (const s of sleepers) {
          const want = Math.atan2(f.y - s.y, f.x - s.x) + Math.sin(time / 900 + s.seed) * 0.5;
          let d = want - s.heading;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          s.heading += Math.max(-2 * dt, Math.min(2 * dt, d));
          const close = dist(s.x, s.y, f.x, f.y);
          const v = callAt >= 0 ? SWIM * 0.4 : close < 30 ? 0 : SWIM;
          s.x = Math.max(40, Math.min(W - 40, s.x + Math.cos(s.heading) * v * dt));
          s.y = Math.max(top + 30, Math.min(H - 30, s.y + Math.sin(s.heading) * v * dt));
          // They keep a little apart, like sleepers do.
          for (const o of sleepers) {
            if (o === s) continue;
            const od = dist(s.x, s.y, o.x, o.y);
            if (od < 70 && od > 0) { s.x += (s.x - o.x) / od * 30 * dt; s.y += (s.y - o.y) / od * 30 * dt; }
          }
          s.target.moveTo(s.x, s.y);
        }
        if (callAt < 0 && time >= nextCall) { callAt = time; ctx.sfx('hush'); }
        if (callAt >= 0 && time - callAt >= CALL_WARN) { readRoll(); nextCall = time + (louder ? 3800 : 5200); }
        while (grips.length && time - grips[0].at > 1100) grips.shift();
        while (gasps.length && time - gasps[0].at > 1200) gasps.shift();
      },

      onPlayerCast() { warm = 'player'; warmAt = now; },
      onNpcCast() { warm = 'npc'; warmAt = now; },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // The names are being read: off any sleeper under him.
        if (callAt >= 0) {
          for (const s of sleepers) {
            const d = dist(s.x, s.y, n.x, n.y);
            if (d > GRIP_R + 40) continue;
            const a = d > 1 ? Math.atan2(n.y - s.y, n.x - s.x) : s.heading + Math.PI;
            return { x: tk.clampX(s.x + Math.cos(a) * (GRIP_R + 90)), y: tk.clampY(s.y + Math.sin(a) * (GRIP_R + 90)) };
          }
        }
        // Otherwise: keep the drowned between himself and you — he walks round so they drift your way.
        if (warm === 'npc' && sleepers.length) {
          const p = ctx.player;
          let near: Sleeper = sleepers[0];
          for (const s of sleepers) if (dist(s.x, s.y, n.x, n.y) < dist(near.x, near.y, n.x, n.y)) near = s;
          if (dist(near.x, near.y, n.x, n.y) < 120) {
            const a = Math.atan2(n.y - p.y, n.x - p.x);
            return { x: tk.clampX(n.x + Math.cos(a) * 90), y: tk.clampY(n.y + Math.sin(a) * 90) };
          }
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        for (const s of sleepers) {
          // A black-ice window opens over each sleeper as it passes, clear enough to see down.
          g.fillStyle(R.blackIce, 0.55); g.fillEllipse(s.x, s.y, 92, 54);
          g.fillStyle(R.water, 0.45); g.fillEllipse(s.x + 3, s.y + 2, 74, 42);
          drawSleeper(g, s, t);
          // The sheen of the ice over them.
          g.lineStyle(1.5, R.iceLit, 0.4); g.lineBetween(s.x - 34, s.y - 12, s.x - 10, s.y - 20);
          g.lineStyle(1, R.iceLit, 0.3); g.lineBetween(s.x + 8, s.y + 16, s.x + 30, s.y + 8);
          // Woken-ness: a rim of pale light growing round the window as you strike it.
          if (s.woken > 0) {
            g.lineStyle(2, R.frost, 0.8);
            g.beginPath(); g.arc(s.x, s.y, 40, -Math.PI / 2, -Math.PI / 2 + (s.woken / WAKE_AT) * Math.PI * 2, false); g.strokePath();
          }
          if (callAt >= 0) {
            const k = (time - callAt) / CALL_WARN;
            g.fillStyle(0x6a8a9a, 0.1 + k * 0.15); g.fillCircle(s.x, s.y, GRIP_R);
            g.lineStyle(2.5, 0xb8d8e8, 0.5 + k * 0.4); g.strokeCircle(s.x, s.y, GRIP_R);
            g.beginPath(); g.arc(s.x, s.y, GRIP_R + 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          }
        }
        for (const gr of grips) {
          const k = (time - gr.at) / 1100;
          // Broken ice where the hands came through.
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2 + gr.seed;
            const r = 16 + jit(gr.seed, i) * 22;
            g.fillStyle(R.iceLit, 0.9 * (1 - k)); g.fillTriangle(gr.x + Math.cos(a) * r, gr.y + Math.sin(a) * r * 0.6, gr.x + Math.cos(a + 0.25) * (r + 12), gr.y + Math.sin(a + 0.25) * (r + 12) * 0.6, gr.x + Math.cos(a) * (r + 6), gr.y + Math.sin(a) * (r + 6) * 0.6 - 5);
          }
          g.fillStyle(R.water, 0.7 * (1 - k)); g.fillEllipse(gr.x, gr.y, 44, 22);
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        // The hands: four or five pale arms up through the ice, fingers spread, then closing.
        for (const gr of grips) {
          const k = (time - gr.at) / 1100;
          const rise = Math.min(1, k * 5) * (1 - Math.max(0, k - 0.7) / 0.3);
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + gr.seed;
            const bx = gr.x + Math.cos(a) * 18, by = gr.y + Math.sin(a) * 9;
            const tx = gr.x + Math.cos(a) * 8, ty = by - 30 * rise;
            g.lineStyle(6, 0x8aa8b4, 0.85 * rise); g.lineBetween(bx, by, tx, ty);
            g.lineStyle(3, 0xc8dce4, 0.8 * rise); g.lineBetween(bx - 1, by, tx - 1, ty);
            const close = Math.min(1, k * 2);
            for (let f = -1; f <= 1; f++) {
              g.lineStyle(1.6, 0xc8dce4, 0.85 * rise);
              g.lineBetween(tx, ty, tx + f * 5 * (1 - close * 0.6) - Math.cos(a) * 3, ty - 7 + close * 3);
            }
            g.fillStyle(R.rime, 0.6 * rise); g.fillCircle(tx, ty + 2, 1.5);
          }
        }
        for (const gp of gasps) {
          const k = (time - gp.at) / 1200;
          for (let i = 0; i < 6; i++) {
            const ph = (k + i * 0.12) % 1;
            g.lineStyle(1.5, 0xffffff, 0.6 * (1 - ph)); g.strokeCircle(gp.x + Math.sin(i * 2 + k * 6) * 8, gp.y - ph * 60, 3 + ph * 4);
          }
          glow(g, gp.x, gp.y - 10, 30, R.frost, 0.08 * (1 - k), 3);
        }
        // The one they are swimming toward: a faint warmth rising off them.
        const wf = warm === 'player' ? ctx.player : ctx.npc;
        if (alive(wf)) {
          const fresh = Math.max(0.3, 1 - (now - warmAt) / 2500);
          for (let i = 0; i < 3; i++) {
            const ph = ((time / 1000) * 0.8 + i * 0.33) % 1;
            g.lineStyle(1.5, R.ember, 0.4 * fresh * (1 - ph));
            g.lineBetween(wf.x - 10 + i * 10, wf.y - 32 - ph * 22, wf.x - 8 + i * 10, wf.y - 40 - ph * 22);
          }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The roll itself: a scroll unrolling as he reads, names struck through as they are called.
        const x = W - 176, y = H - 120;
        const k = callAt >= 0 ? Math.min(1, (time - callAt) / CALL_WARN) : 0;
        const len = 40 + k * 60;
        g.fillStyle(0x000000, 0.35); g.fillRoundedRect(x - 8, y - 8, 168, 120, 6);
        g.fillStyle(0xe6dcc4, 1); g.fillRect(x + 10, y + 10, 120, len);
        g.fillStyle(0x8a6a4a, 1); g.fillRoundedRect(x + 2, y + 2, 136, 10, 4); g.fillRoundedRect(x + 2, y + 6 + len, 136, 10, 4);
        g.fillStyle(R.brass, 1); g.fillCircle(x + 2, y + 7, 3); g.fillCircle(x + 138, y + 7, 3); g.fillCircle(x + 2, y + 11 + len, 3); g.fillCircle(x + 138, y + 11 + len, 3);
        const lines = Math.floor(len / 9);
        for (let i = 0; i < lines; i++) {
          const ly = y + 18 + i * 9;
          const w = 50 + jit(i, calls) * 50;
          g.lineStyle(1.5, 0x3a3230, 0.85); g.lineBetween(x + 18, ly, x + 18 + w, ly);
          if (callAt >= 0 && i < lines * k) { g.lineStyle(1, 0x9a2a2a, 0.9); g.lineBetween(x + 16, ly - 2, x + 22 + w, ly + 1); }
        }
        // Who they swim to: a small flame beside the roll, by your side or his.
        const fy = y + 100;
        g.fillStyle(warm === 'player' ? R.ember : 0x3a3a40, 1); g.fillCircle(x + 20, fy, 6);
        g.fillStyle(warm === 'npc' ? R.ember : 0x3a3a40, 1); g.fillCircle(x + 120, fy, 6);
        g.fillStyle(0xe8e8e8, 0.8); g.fillCircle(x + 20, fy - 12, 3); g.fillRect(x + 111, fy - 16, 18, 3); g.fillCircle(x + 120, fy - 12, 3);
        // Countdown to the next reading: a thin ribbon draining across the bottom.
        const until = callAt >= 0 ? 0 : Math.max(0, Math.min(1, (nextCall - time) / (louder ? 3800 : 5200)));
        g.fillStyle(R.livery, 0.9); g.fillRect(x + 34, fy - 2, 72 * until, 4);
        if (callAt >= 0) drawGlint(g, x + 70, fy, 6, 0.6 + Math.sin(time / 60) * 0.3);
      },

      destroy() { for (const s of sleepers) s.target.remove(); },
    };
  },
};

/**
 * A sleeper seen down through clear ice: a pale figure lying face up, hair drifting off the head,
 * one arm reaching ahead the way it swims, a slow string of bubbles from the mouth.
 */
function drawSleeper(g: Phaser.GameObjects.Graphics, s: Sleeper, t: number): void {
  const c = Math.cos(s.heading), sn = Math.sin(s.heading);
  const at = (u: number, v: number): Pt => ({ x: s.x + c * u - sn * v, y: s.y + (sn * u + c * v) * 0.6 });
  const head = at(18, 0), hip = at(-12, 0), foot = at(-30, Math.sin(t * 2 + s.seed) * 4);
  const hand = at(36, -6 + Math.sin(t * 1.5 + s.seed) * 5), elbow = at(22, -10);
  g.lineStyle(9, 0x6a8a9a, 0.45); g.lineBetween(head.x, head.y, hip.x, hip.y);
  g.lineStyle(6, 0x6a8a9a, 0.4); g.lineBetween(hip.x, hip.y, foot.x, foot.y);
  g.lineStyle(3, 0x8aa8b4, 0.5); g.lineBetween(at(12, -4).x, at(12, -4).y, elbow.x, elbow.y); g.lineBetween(elbow.x, elbow.y, hand.x, hand.y);
  g.fillStyle(0x9ab8c4, 0.55); g.fillCircle(head.x, head.y, 6);
  for (let i = 0; i < 4; i++) {
    const h0 = at(14, -4 + i * 2.6), h1 = at(4 - Math.sin(t * 1.3 + i) * 3, -6 + i * 4);
    g.lineStyle(1, 0x3a4a52, 0.55); g.lineBetween(h0.x, h0.y, h1.x, h1.y);
  }
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.6 + s.seed + i * 0.33) % 1;
    g.lineStyle(1, 0xffffff, 0.5 * (1 - ph)); g.strokeCircle(head.x + Math.sin(t * 3 + i) * 2, head.y - ph * 14, 1.2 + ph);
  }
}
