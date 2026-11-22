import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { crackle } from '../art';
import { BOLT, BOTH, BOTH_DARK, BOTH_LIT, COPPER, GLASS, IRON, IRON_LIT, STATE_A, STATE_B } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Tunnelling — Phase-Walker Wick.
 *
 * Three walls of crawling light stand in the yard, and each one flickers on its own clock: solid
 * (nobody passes), then thinning (it stutters — the telegraph), then *thin*, when anyone can walk
 * straight through it. Come out the far side of a thin wall and you have tunnelled: for a moment
 * your blows land hard, out of nowhere. But a wall that hardens with you inside it spits you out
 * to one side or the other, scorched and dazed. And a hit that lands on you while you are pressed
 * against a solid wall may knock you clean through it.
 *
 * Wick tunnels on purpose — he lurks behind a wall and comes through it the moment it thins. Hold
 * the wall's far side yourself and meet him coming out.
 */

const HALF = 12;
const SOLID_MS = 3400;
const THINNING_MS = 1200;
const THIN_MS = 1700;
const TUNNEL_BONUS_MS = 2200;
const TUNNEL_MULT = 1.4;
const SPIT_DMG = 9;
const KNOCK_CHANCE = 0.4;

type Phase = 'solid' | 'thinning' | 'thin';

interface Wall { x: number; y0: number; y1: number; offset: number; color: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const walls: Wall[] = [
    { x: W * 0.3, y0: top + 40, y1: top + 330, offset: 0, color: STATE_A },
    { x: W * 0.5, y0: top + 200, y1: H - 30, offset: 0.36, color: BOTH },
    { x: W * 0.7, y0: top + 40, y1: top + 330, offset: 0.68, color: STATE_B },
  ];
  const cycle = SOLID_MS + THINNING_MS + THIN_MS;
  const sides = new Map<Fighter, number[]>([[player, walls.map((w) => Math.sign(player.x - w.x) || -1)], [npc, walls.map((w) => Math.sign(npc.x - w.x) || 1)]]);
  /** Inside a thin wall: which wall, and the side they entered from. */
  const inside = new Map<Fighter, { wall: number; from: number } | null>([[player, null], [npc, null]]);
  const bonusUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const fx: { x: number; y: number; at: number; kind: 'tunnel' | 'spit' | 'knock'; color: number }[] = [];
  let t0 = -1;
  /** Set while the rule itself is dealing damage, so a spit cannot also knock. */
  let dealing = false;

  function phaseOf(w: Wall, time: number): { p: Phase; k: number } {
    const local = ((time - t0) / cycle + w.offset) % 1 * cycle;
    if (local < SOLID_MS) return { p: 'solid', k: local / SOLID_MS };
    if (local < SOLID_MS + THINNING_MS) return { p: 'thinning', k: (local - SOLID_MS) / THINNING_MS };
    return { p: 'thin', k: (local - SOLID_MS - THINNING_MS) / THIN_MS };
  }
  const blocks = (w: Wall, time: number) => phaseOf(w, time).p !== 'thin';
  const inSpan = (w: Wall, y: number) => y > w.y0 - 6 && y < w.y1 + 6;

  function through(f: Fighter, wi: number, from: number, time: number, kind: 'tunnel' | 'knock'): void {
    const w = walls[wi];
    const want = w.x - from * (HALF + 22);
    ctx.nudge(f, want - f.x, 0);
    sides.get(f)![wi] = -from;
    fx.push({ x: want, y: f.y, at: time, kind, color: w.color });
    if (kind === 'tunnel') {
      bonusUntil.set(f, time + TUNNEL_BONUS_MS);
      ctx.float(f.x, f.y - 50, 'TUNNELLED', f === player ? '#b4f6ff' : '#ff9ae0');
      ctx.sfx('blink');
    } else {
      ctx.float(f.x, f.y - 50, 'KNOCKED THROUGH', '#d2c0ff');
      ctx.sfx('glitch');
    }
  }

  function step(f: Fighter, time: number): void {
    if (!alive(f)) return;
    const sd = sides.get(f)!;
    const ins = inside.get(f);
    if (ins) {
      const w = walls[ins.wall];
      const dx = f.x - w.x;
      if (Math.abs(dx) >= HALF + 6 || !inSpan(w, f.y)) {
        // Came out: the far side is a tunnel, the near side is just a step back.
        const out = Math.sign(dx) || ins.from;
        if (out !== ins.from && inSpan(w, f.y)) { sd[ins.wall] = out; through(f, ins.wall, ins.from, time, 'tunnel'); }
        else sd[ins.wall] = out;
        inside.set(f, null);
        return;
      }
      if (blocks(w, time)) {
        // Hardened round you: spat out.
        const side = rng() < 0.5 ? -1 : 1;
        ctx.nudge(f, w.x + side * (HALF + 24) - f.x, 0);
        sd[ins.wall] = side;
        inside.set(f, null);
        dealing = true;
        ctx.hit(f, SPIT_DMG, f.x, f.y);
        dealing = false;
        ctx.stun(f, 450);
        fx.push({ x: f.x, y: f.y, at: time, kind: 'spit', color: w.color });
        ctx.float(f.x, f.y - 50, 'DECOHERED', '#ffffff');
        ctx.sfx('plasma-arc');
      }
      return;
    }
    walls.forEach((w, i) => {
      const dx = f.x - w.x;
      if (!inSpan(w, f.y)) { if (Math.abs(dx) > HALF) sd[i] = Math.sign(dx); return; }
      if (Math.abs(dx) >= HALF + 18) { sd[i] = Math.sign(dx); return; }
      if (blocks(w, time)) {
        // Solid: back to your own side.
        ctx.nudge(f, w.x + sd[i] * (HALF + 18) - f.x, 0);
      } else if (Math.abs(dx) < HALF) {
        inside.set(f, { wall: i, from: sd[i] });
      }
    });
  }

  function knock(f: Fighter, amount: number): void {
    if (dealing || !alive(f) || amount < 3 || inside.get(f)) return;
    const time = ctx.scene.time.now;
    const sd = sides.get(f)!;
    for (const [i, w] of walls.entries()) {
      if (!inSpan(w, f.y) || Math.abs(f.x - w.x) > HALF + 26 || !blocks(w, time)) continue;
      if (rng() < KNOCK_CHANCE) through(f, i, sd[i], time, 'knock');
      return;
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (t0 < 0) t0 = time;
      step(player, time);
      step(npc, time);
      for (let i = fx.length - 1; i >= 0; i--) if (time - fx[i].at > 700) fx.splice(i, 1);
    },

    onPlayerHurt(amount) { knock(player, amount); },
    onNpcHurt(amount) { knock(npc, amount); },

    // A tunneller's blow out of nowhere.
    npcTakenMult: () => (ctx.scene.time.now < (bonusUntil.get(player) ?? 0) ? TUNNEL_MULT : 1),
    playerTakenMult: () => (ctx.scene.time.now < (bonusUntil.get(npc) ?? 0) ? TUNNEL_MULT : 1),

    npcSeek() {
      const time = ctx.scene.time.now;
      // A wall between Wick and the player: lurk behind it, and go through when it thins.
      for (const w of walls) {
        if (!inSpan(w, player.y) && !inSpan(w, npc.y)) continue;
        const ps = Math.sign(player.x - w.x), ns = Math.sign(npc.x - w.x);
        if (ps === ns || !ps || !ns) continue;
        const y = clamp(player.y, w.y0 + 20, w.y1 - 20);
        const ph = phaseOf(w, time);
        if (ph.p === 'thin' && ph.k < 0.7) return { x: w.x + ps * 60, y };
        if (ph.p === 'thinning' && ph.k > 0.5) return { x: w.x + ns * 24, y };
        return { x: w.x + ns * 70, y };
      }
      // Otherwise get a wall between you: the nearest one's far side from the player.
      let best = walls[0];
      for (const w of walls) if (Math.abs(w.x - npc.x) < Math.abs(best.x - npc.x)) best = w;
      const ps = Math.sign(player.x - best.x) || 1;
      return { x: clamp(best.x - ps * 80, 60, W - 60), y: clamp((best.y0 + best.y1) / 2 + Math.sin(time / 1300) * 80, top + 50, H - 40) };
    },

    drawGround(g, time) {
      for (const w of walls) {
        const { p, k } = phaseOf(w, time);
        // The rail the wall stands on.
        g.fillStyle(IRON, 1); g.fillRect(w.x - 4, w.y0, 8, w.y1 - w.y0);
        g.fillStyle(IRON_LIT, 0.8); g.fillRect(w.x - 4, w.y0, 2, w.y1 - w.y0);
        if (p === 'thin') { g.fillStyle(w.color, 0.12); g.fillRect(w.x - HALF - 18, w.y0, (HALF + 18) * 2, w.y1 - w.y0); }
        // The countdown ticks along the rail while solid.
        if (p === 'solid') {
          const n = Math.floor(k * 6);
          for (let i = 0; i < 6; i++) { g.fillStyle(i < n ? w.color : 0x222228, 0.9); g.fillCircle(w.x, w.y0 + 12 + i * 10, 2.5); }
        }
      }
      for (const [f, until] of bonusUntil) {
        if (!alive(f) || ctx.scene.time.now > until) continue;
        g.lineStyle(2, f === player ? STATE_B : STATE_A, 0.6); g.strokeEllipse(f.x, f.y + 16, 50, 16);
      }
    },

    drawAir(g, time) {
      for (const [wi, w] of walls.entries()) {
        const { p, k } = phaseOf(w, time);
        // End posts.
        for (const py of [w.y0, w.y1]) {
          g.fillStyle(IRON, 1); g.fillRect(w.x - 6, py - 14, 12, 18);
          g.fillStyle(GLASS, 0.9); g.fillEllipse(w.x, py - 16, 14, 5);
          g.fillStyle(COPPER, 1); g.fillCircle(w.x, py - 20, 4);
        }
        const len = w.y1 - w.y0;
        let a = 0;
        if (p === 'solid') a = 1;
        else if (p === 'thinning') a = 0.35 + 0.65 * (Math.sin(time / (40 + 60 * (1 - k))) > 0 ? 1 - k * 0.6 : 0.15);
        else a = 0.12 + 0.06 * Math.sin(time / 90);
        // The sheet.
        g.fillStyle(dim(w.color, 0.35), 0.55 * a); g.fillRect(w.x - HALF, w.y0, HALF * 2, len);
        g.fillStyle(lit(w.color, 0.2), 0.35 * a); g.fillRect(w.x - 3, w.y0, 6, len);
        for (let i = 0; i < len / 14; i++) {
          const y = w.y0 + ((i * 14 + time / 12 * (wi % 2 ? 1 : -1)) % len + len) % len;
          g.lineStyle(1, BOTH_LIT, 0.4 * a); g.lineBetween(w.x - HALF, y, w.x + HALF, y + 3);
        }
        if (a > 0.6) crackle(g, { x: w.x, y: w.y0 }, { x: w.x, y: w.y1 }, time / 1000, wi * 31, BOLT, 1.4, 0.6 * a, 9);
        if (p === 'thin') {
          // Thin: you can see straight through — a dotted outline only, and drifting phase motes.
          g.lineStyle(1, w.color, 0.5);
          for (let y = w.y0; y < w.y1; y += 10) g.lineBetween(w.x - HALF, y, w.x - HALF, y + 4);
          for (let y = w.y0 + 5; y < w.y1; y += 10) g.lineBetween(w.x + HALF, y, w.x + HALF, y + 4);
          for (let i = 0; i < 6; i++) { const y = w.y0 + ((i * 53 + time / 8) % len); g.fillStyle(BOTH_LIT, 0.6); g.fillCircle(w.x + Math.sin(time / 200 + i) * HALF, y, 1.5); }
        }
      }
      for (const e of fx) {
        const k = clamp((ctx.scene.time.now - e.at) / 700, 0, 1);
        if (e.kind === 'spit') {
          glow(g, e.x, e.y, 40, BOLT, 0.1 * (1 - k), 3);
          for (let i = 0; i < 8; i++) { const a = i * 0.785; g.lineStyle(2, 0xffffff, 1 - k); g.lineBetween(e.x + Math.cos(a) * (10 + k * 30), e.y + Math.sin(a) * (10 + k * 30), e.x + Math.cos(a) * (18 + k * 40), e.y + Math.sin(a) * (18 + k * 40)); }
        } else {
          // A ripple of the wall's colour where they came out, a ghost of them left in the wall.
          g.lineStyle(3 * (1 - k), e.color, 1 - k); g.strokeCircle(e.x, e.y, 14 + k * 36);
          g.fillStyle(BOTH_DARK, 0.4 * (1 - k)); g.fillCircle(e.x + (e.kind === 'knock' ? 0 : 0), e.y, 18 * (1 - k));
        }
      }
    },
  };
}

export const TUNNELLING: GimmickDef = {
  id: 'superposition-tunnel',
  rules: 'Walls flicker solid, thinning, thin. Walk a thin wall to tunnel: your next blows hit hard. Caught inside as it hardens, you are spat out hurt.',
  make,
};
