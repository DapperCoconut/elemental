import type { EncounterDef, EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../IslesTypes';
import type { Fighter } from '../../../../../entities/Fighter';
import { lit } from '../../../../art/IsleArt';
import {
  CANDLE, EBONY, GHOST, GHOST_DEEP, GILT, GILT_LIT, IVORY, LEATHER_LIT, OAK_DARK, RIBBON, SILVER,
  SILVER_LIT, WAX_RED, bellows, ghostMouth, noteHead, organPipe, trebleClef,
} from './art';

/**
 * The Great Organ's three wardens — one at the head of each hall, each the keeper of one part of
 * the instrument, each fight that part of it turned loose in a small room.
 *
 * The Bellows-Master owns the wind: two lungs breathe at the walls, and whoever last pumped a lung
 * aims its breath. The Stopwright owns the pipes: chords sound down columns of the floor, and a
 * pipe struck on its mouth *ciphers* — sticks on, a wall of sound to hide behind or pin a foe in.
 * The Choirwarden owns the voices: at Compline the sealed pipes sing rings that part only round
 * him; strike a pipe to let its voice out, and it sings against him instead.
 */

type Who = 'player' | 'npc';
const WHO: Who[] = ['player', 'npc'];
const alive = (f: Fighter): boolean => f.active && f.hp > 0;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const stepOf = (dt: number): number => clampN(dt, 0, 0.05);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

// ── Warden 1: The Breathing Bellows ──────────────────────────────────

/**
 * Two lungs stand at the west and east walls and breathe by turns. While one *draws* (2.6s) it
 * drags both fighters towards it and its brass nozzle slides along the wall after its mark; then
 * it *swells* (a 0.9s glow along its band — the nozzle stops) and *blows*: whoever is in the band
 * takes 14, is blown across the room and, if the lung was pumped, stunned 0.8s.
 *
 * A lung aims at whoever did NOT last pump it. The warden owns both to start (they aim at you);
 * strike a lung's nozzle while it draws or swells and it is yours — it aims at her. She will come
 * and pump it back.
 */
const breathingBellows = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const DRAW_MS = ctx.hard ? 2200 : 2600;
  const SWELL_MS = 900;
  const BLOW_MS = 480;
  const BAND = 70;
  const PULL = 62;
  const SHOVE = 420;
  const DMG = ctx.hard ? 17 : 14;
  const PUMPED_DMG = ctx.hard ? 22 : 18;

  interface Lung {
    side: -1 | 1;           // -1 west wall, +1 east wall
    x: number;
    ny: number;             // nozzle y
    owner: Who;             // who last pumped it — it aims at the other one
    pumped: boolean;        // pumped since it last blew
    target: StrikeTarget;
    breath: number;         // 0..1, drawn
  }
  const mkLung = (side: -1 | 1): Lung => {
    const x = side < 0 ? 64 : ctx.W - 64;
    const l: Lung = {
      side, x, ny: (top + ctx.H) / 2, owner: 'npc', pumped: false, breath: 0.3,
      target: ctx.target({ x: x - side * 50, y: (top + ctx.H) / 2, r: 30, onStruck: (by) => pump(l, by) }),
    };
    return l;
  };
  const lungs: Lung[] = [];
  let cur = 0;
  let state: 'idle' | 'draw' | 'swell' | 'blow' = 'idle';
  let at = 0;
  const shoveUntil: Record<Who, number> = { player: 0, npc: 0 };
  const shoveDir: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const other = (w: Who): Who => (w === 'player' ? 'npc' : 'player');

  function pump(l: Lung, by: Who): void {
    if (lungs[cur] !== l || (state !== 'draw' && state !== 'swell')) return;
    const was = l.owner;
    l.owner = by;
    l.pumped = true;
    if (was !== by) {
      ctx.float(l.target.x, l.target.y - 40, by === 'player' ? 'YOUR LUNG' : 'HER LUNG', by === 'player' ? '#ffe8a0' : '#ff9a7a');
      ctx.sfx('engine');
    }
  }

  const begin = (time: number) => {
    cur = (cur + 1) % 2;
    state = 'draw';
    at = time + DRAW_MS;
    const l = lungs[cur];
    l.pumped = false;
    ctx.banner(l.side < 0 ? 'THE WEST LUNG DRAWS' : 'THE EAST LUNG DRAWS', '#f0d8b0');
    ctx.sfx('gust');
  };

  const blow = (time: number) => {
    state = 'blow';
    at = time + BLOW_MS;
    const l = lungs[cur];
    ctx.sfx(l.pumped ? 'explosion-medium' : 'tornado');
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f) || Math.abs(f.y - l.ny) > BAND) continue;
      const dmg = l.pumped ? PUMPED_DMG : DMG;
      if (w === 'player') ctx.tk.hitPlayer(dmg, f.x, f.y); else ctx.hit(f, dmg, f.x, f.y);
      shoveUntil[w] = time + BLOW_MS;
      shoveDir[w] = -l.side;
      if (l.pumped) { ctx.stun(f, 800); ctx.float(f.x, f.y - 50, 'WINDED', '#f0d8b0'); }
      ctx.flash(f.x, f.y, 0xf0e0c8);
    }
  };

  return {
    update(time, dtRaw) {
      const dt = stepOf(dtRaw);
      if (lungs.length === 0) { lungs.push(mkLung(-1), mkLung(1)); cur = 1; at = time + 1800; }
      for (const w of WHO) {
        if (time < shoveUntil[w]) ctx.nudge(fighter(w), shoveDir[w] * SHOVE * dt, 0);
      }
      const l = lungs[cur];
      if (state === 'idle') { if (time >= at) begin(time); return; }
      if (state === 'draw') {
        // Draw both fighters in, and slide the nozzle after its mark (whoever its owner is not).
        for (const w of WHO) {
          const f = fighter(w);
          if (alive(f)) ctx.nudge(f, Math.sign(l.x - f.x) * PULL * dt, 0);
        }
        const mark = fighter(other(l.owner));
        const want = clampN(mark.y, top + 70, ctx.H - 60);
        l.ny += clampN(want - l.ny, -110 * dt, 110 * dt);
        l.breath = clampN(l.breath + dt / (DRAW_MS / 1000) * 0.7, 0, 1);
        if (time >= at) { state = 'swell'; at = time + ctx.tk.warn(SWELL_MS); ctx.sfx('beam-charge'); }
      } else if (state === 'swell') {
        if (time >= at) blow(time);
      } else if (state === 'blow') {
        l.breath = clampN(l.breath - dt / (BLOW_MS / 1000) * 0.8, 0.15, 1);
        if (time >= at) { state = 'idle'; at = time + (ctx.hard ? 500 : 900); }
      }
      for (const k of lungs) k.target.moveTo(k.x - k.side * 50, k.ny);
    },
    npcSeek() {
      if (lungs.length === 0) return null;
      const l = lungs[cur];
      const n = ctx.npc;
      if (state === 'swell' || (state === 'draw' && at - ctx.scene.time.now < 700)) {
        // Out of the band before it blows: whichever side of it is nearer.
        if (Math.abs(n.y - l.ny) > BAND + 30) return null;
        const up = l.ny - BAND - 70, down = l.ny + BAND + 70;
        const y = up > top + 40 && (n.y < l.ny || down > ctx.H - 40) ? up : down;
        return { x: n.x, y: clampN(y, top + 40, ctx.H - 40) };
      }
      // You have her lung: she goes and pumps it back.
      if (state === 'draw' && l.owner === 'player') return { x: l.x - l.side * 90, y: l.ny };
      return null;
    },
    destroy() { for (const l of lungs) l.target.remove(); },
    drawGround(g, time) {
      for (let i = 0; i < lungs.length; i++) {
        const l = lungs[i];
        const live = i === cur && state !== 'idle';
        const tint = l.owner === 'player' ? 0xffd870 : 0xff8a6a;
        const x0 = l.side < 0 ? l.x + 40 : 0, x1 = l.side < 0 ? ctx.W : l.x - 40;
        if (!live) {
          g.lineStyle(1, tint, 0.12); g.lineBetween(x0, l.ny - BAND, x1, l.ny - BAND); g.lineBetween(x0, l.ny + BAND, x1, l.ny + BAND);
          continue;
        }
        if (state === 'draw') {
          // Dashed band edges, and lint drifting in towards the drawing lung.
          for (let x = x0; x < x1; x += 28) {
            g.lineStyle(2, tint, 0.3); g.lineBetween(x, l.ny - BAND, x + 14, l.ny - BAND); g.lineBetween(x, l.ny + BAND, x + 14, l.ny + BAND);
          }
          for (let k = 0; k < 18; k++) {
            const ph = ((time / 900 + k / 18) % 1);
            const sx = l.side < 0 ? ctx.W - ph * (ctx.W - 120) : 120 + ph * (ctx.W - 120);
            const sy = top + 20 + ((k * 97) % (ctx.H - top - 40));
            g.fillStyle(IVORY, 0.2 * (1 - ph)); g.fillRect(sx, sy, 8, 1.5);
          }
        } else if (state === 'swell') {
          const k = clampN(1 - (at - time) / ctx.tk.warn(SWELL_MS), 0, 1);
          g.fillStyle(tint, 0.08 + k * 0.2); g.fillRect(x0, l.ny - BAND, x1 - x0, BAND * 2);
          g.lineStyle(3, tint, 0.5 + k * 0.4); g.lineBetween(x0, l.ny - BAND, x1, l.ny - BAND); g.lineBetween(x0, l.ny + BAND, x1, l.ny + BAND);
          if (k > 0.7 && Math.floor(time / 90) % 2 === 0) { g.fillStyle(0xffffff, 0.08); g.fillRect(x0, l.ny - BAND, x1 - x0, BAND * 2); }
        } else {
          // The gust itself: long streaks the width of the band.
          const k = clampN(1 - (at - time) / BLOW_MS, 0, 1);
          g.fillStyle(0xf8ecd8, 0.25 * (1 - k)); g.fillRect(x0, l.ny - BAND, x1 - x0, BAND * 2);
          for (let s = 0; s < 16; s++) {
            const sy = l.ny - BAND + 6 + ((s * 37) % (BAND * 2 - 12));
            const len = 80 + (s % 4) * 40;
            const sx = l.side < 0 ? x0 + k * (ctx.W) - len + ((s * 61) % 200) : x1 - k * ctx.W + ((s * 61) % 200);
            g.lineStyle(2.5, IVORY, 0.6 * (1 - k)); g.lineBetween(sx, sy, sx - l.side * len, sy);
          }
        }
      }
    },
    drawAir(g, time) {
      for (let i = 0; i < lungs.length; i++) {
        const l = lungs[i];
        const face: 1 | -1 = l.side < 0 ? 1 : -1;
        const base = l.ny + 52;
        // The lung itself, against its wall, its nozzle pointing across.
        bellows(g, l.x - face * 6, base, 96, 96, l.breath, face);
        // The pressure gauge over it: needle by breath, and the owner's ribbon.
        const gx = l.x, gy = l.ny - 74;
        g.fillStyle(OAK_DARK, 1); g.fillCircle(gx, gy, 15);
        g.fillStyle(IVORY, 1); g.fillCircle(gx, gy, 12);
        const a = Math.PI * 0.8 + l.breath * Math.PI * 1.4;
        g.lineStyle(2, WAX_RED, 1); g.lineBetween(gx, gy, gx + Math.cos(a) * 10, gy + Math.sin(a) * 10);
        g.fillStyle(l.owner === 'player' ? 0xffd870 : 0xff6a4a, 1); g.fillTriangle(gx - 6, gy + 14, gx + 6, gy + 14, gx, gy + 24);
        if (i === cur && state === 'draw' && l.pumped) {
          g.lineStyle(2, GILT_LIT, 0.5 + Math.sin(time / 80) * 0.3); g.strokeCircle(l.target.x, l.target.y, 30);
        }
      }
      for (const w of WHO) {
        if (ctx.scene.time.now >= shoveUntil[w]) continue;
        const f = fighter(w);
        for (let k = 0; k < 4; k++) { g.lineStyle(2, IVORY, 0.6); g.lineBetween(f.x + shoveDir[w] * -20, f.y - 20 + k * 10, f.x + shoveDir[w] * -50, f.y - 20 + k * 10); }
      }
    },
    drawHud(g, time) {
      if (lungs.length === 0) return;
      const l = lungs[cur];
      const cx = ctx.W / 2, cy = top + 20;
      g.fillStyle(0x140c08, 0.85); g.fillRoundedRect(cx - 130, cy - 12, 260, 24, 8);
      g.lineStyle(2, GILT, 1); g.strokeRoundedRect(cx - 130, cy - 12, 260, 24, 8);
      // Breath meter, the owner's colour.
      g.fillStyle(l.owner === 'player' ? 0xffd870 : 0xff7a5a, 1); g.fillRoundedRect(cx - 120, cy - 5, 240 * l.breath, 10, 4);
      if (state === 'swell' && Math.floor(time / 100) % 2 === 0) { g.lineStyle(2, 0xffffff, 0.8); g.strokeRoundedRect(cx - 122, cy - 7, 244, 14, 5); }
      // An arrow showing which wall breathes.
      const ax = l.side < 0 ? cx - 148 : cx + 148;
      g.fillStyle(LEATHER_LIT, 1); g.fillTriangle(ax, cy, ax + l.side * -12, cy - 8, ax + l.side * -12, cy + 8);
    },
  };
};

// ── Warden 2: The Stuck Note ─────────────────────────────────────────

/**
 * Eight pipes stand along the back of the room, each over a column of the floor with its key at
 * the foot. The Stopwright plays chords: three keys light (1.5s), then their columns sound — 15
 * to whoever is in one, either side. Strike a pipe on its mouth and it *ciphers*: it sticks on for
 * 3.2s after a beat's warning, its column a solid wall of sound that ticks 5 every 0.4s to anyone
 * inside and stops every shot that tries to cross it. A stuck pipe sits out the next chord, and
 * rests 6s before it can stick again. She ciphers the pipe over you.
 */
const stuckNote = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const N = 8;
  const CW = ctx.W / N;
  const HALF = CW / 2 - 14;
  const PIPE_Y = top + 92;           // the pipes' feet
  const MOUTH_Y = PIPE_Y - 22;
  const KEY_Y = ctx.H - 34;
  const CHORD_MS = ctx.hard ? 2900 : 3400;
  const CHORD_WARN = 1500;
  const SOUND_MS = 450;
  const CIPHER_TELL = 500;
  const CIPHER_MS = 3200;
  const CIPHER_REST = 6000;
  const CHORD_DMG = ctx.hard ? 18 : 15;
  const TICK = 5;

  interface Pipe {
    x: number;
    lit: number;              // chord warn begins (0 = not in chord)
    sounds: number;           // when the chord sounds
    stuckAt: number;          // cipher tell start
    stuckBy: Who | null;
    restUntil: number;
    lastTick: number;
    target: StrikeTarget | null;
  }
  const pipes: Pipe[] = [];
  for (let i = 0; i < N; i++) pipes.push({ x: CW * (i + 0.5), lit: 0, sounds: 0, stuckAt: 0, stuckBy: null, restUntil: 0, lastTick: 0, target: null });
  let nextChord = 0;
  let chordAt = 0;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const colOf = (x: number): number => clampN(Math.floor(x / CW), 0, N - 1);
  const inCol = (p: Pipe, f: Fighter): boolean => Math.abs(f.x - p.x) < HALF + 12;
  const stuck = (p: Pipe, now: number): boolean => p.stuckBy !== null && now >= p.stuckAt + CIPHER_TELL && now < p.stuckAt + CIPHER_TELL + CIPHER_MS;
  const sticking = (p: Pipe, now: number): boolean => p.stuckBy !== null && now < p.stuckAt + CIPHER_TELL + CIPHER_MS;

  const strike = (p: Pipe, by: Who): void => {
    const now = ctx.scene.time.now;
    if (sticking(p, now) || now < p.restUntil) return;
    p.stuckBy = by;
    p.stuckAt = now;
    p.restUntil = now + CIPHER_TELL + CIPHER_MS + CIPHER_REST;
    p.lit = 0;
    ctx.float(p.x, MOUTH_Y - 30, 'CIPHER!', by === 'player' ? '#d8e8ff' : '#ff9a8a');
    ctx.sfx('screech');
  };

  const chord = (time: number) => {
    // Three voices: one over the player, two others, never a stuck or resting-from-stuck pipe.
    const free = pipes.map((_, i) => i).filter((i) => !sticking(pipes[i], time));
    const pick: number[] = [];
    const pc = colOf(ctx.player.x);
    if (free.includes(pc) && ctx.rng() < 0.7) pick.push(pc);
    while (pick.length < 3 && pick.length < free.length) {
      const i = free[Math.floor(ctx.rng() * free.length)];
      if (!pick.includes(i)) pick.push(i);
    }
    chordAt = time + ctx.tk.warn(CHORD_WARN);
    for (const i of pick) { pipes[i].lit = time; pipes[i].sounds = chordAt; }
    ctx.sfx('holy-chord');
  };

  return {
    update(time) {
      if (pipes[0].target === null) {
        for (const p of pipes) p.target = ctx.target({ x: p.x, y: MOUTH_Y, r: 24, onStruck: (by) => strike(p, by) });
        nextChord = time + 2200;
      }
      if (time >= nextChord) { chord(time); nextChord = time + CHORD_MS; }
      for (const p of pipes) {
        if (p.lit && time >= p.sounds) {
          p.lit = 0;
          ctx.sfx('sonic-pulse');
          for (const w of WHO) {
            const f = fighter(w);
            if (!alive(f) || !inCol(p, f)) continue;
            if (w === 'player') ctx.tk.hitPlayer(CHORD_DMG, f.x, f.y); else ctx.hit(f, CHORD_DMG, f.x, f.y);
            ctx.flash(f.x, f.y, 0xd8e8ff);
          }
        }
        if (stuck(p, time)) {
          if (time - p.lastTick >= 400) {
            p.lastTick = time;
            for (const w of WHO) {
              const f = fighter(w);
              if (!alive(f) || !inCol(p, f)) continue;
              if (w === 'player') ctx.tk.hitPlayer(TICK, f.x, f.y); else ctx.hit(f, TICK, f.x, f.y);
            }
          }
          // The wall of sound eats shots that try to cross it.
          for (let y = top + 60; y < ctx.H; y += 90) {
            for (const s of ctx.shotsNear(p.x, y, HALF + 30)) { s.block(); ctx.flash(s.x, s.y, 0xd8e8ff); }
          }
        } else if (p.stuckBy && time >= p.stuckAt + CIPHER_TELL + CIPHER_MS) {
          p.stuckBy = null;
          ctx.sfx('snap-back');
        }
      }
    },
    npcSeek() {
      const now = ctx.scene.time.now;
      const n = ctx.npc;
      const danger = (i: number): boolean => (pipes[i].lit > 0) || sticking(pipes[i], now);
      const nc = colOf(n.x);
      if (danger(nc)) {
        // Step sideways into the nearest quiet column.
        for (let d = 1; d < N; d++) {
          for (const s of [-1, 1]) {
            const c = nc + d * s;
            if (c >= 0 && c < N && !danger(c)) return { x: pipes[c].x, y: n.y };
          }
        }
        return null;
      }
      // Nothing lit over her: go and stick the pipe over you, if it will stick.
      const p = pipes[colOf(ctx.player.x)];
      if (!sticking(p, now) && now >= p.restUntil && Math.abs(p.x - n.x) > CW) return { x: p.x + (n.x < p.x ? -CW : CW), y: MOUTH_Y + 46 };
      return null;
    },
    destroy() { for (const p of pipes) p.target?.remove(); },
    drawGround(g, time) {
      for (const p of pipes) {
        const x0 = p.x - HALF, w = HALF * 2;
        // The column's pallet-boards, faint.
        g.fillStyle(0xc8dcff, 0.03); g.fillRect(x0, PIPE_Y, w, KEY_Y - PIPE_Y);
        if (p.lit) {
          const k = clampN((time - p.lit) / Math.max(1, p.sounds - p.lit), 0, 1);
          g.fillStyle(CANDLE, 0.05 + k * 0.16); g.fillRect(x0, PIPE_Y, w, KEY_Y - PIPE_Y);
          g.lineStyle(2, CANDLE, 0.4 + k * 0.5); g.lineBetween(x0, PIPE_Y, x0, KEY_Y); g.lineBetween(x0 + w, PIPE_Y, x0 + w, KEY_Y);
          // A crotchet climbing the column as the beat comes.
          noteHead(g, p.x, KEY_Y - k * (KEY_Y - PIPE_Y), 1.4, CANDLE, 0.8, 1);
        }
        if (sticking(p, time)) {
          const telling = time < p.stuckAt + CIPHER_TELL;
          const c = p.stuckBy === 'player' ? 0xb8d0ff : 0xff9a8a;
          if (telling) {
            if (Math.floor(time / 70) % 2 === 0) { g.fillStyle(c, 0.18); g.fillRect(x0, PIPE_Y, w, KEY_Y - PIPE_Y); }
          } else {
            // The stuck note: a shuddering column of standing waves.
            g.fillStyle(c, 0.28); g.fillRect(x0, PIPE_Y, w, KEY_Y - PIPE_Y);
            for (let y = PIPE_Y; y < KEY_Y; y += 22) {
              const wob = Math.sin(time / 30 + y * 0.2) * 6;
              g.lineStyle(2, lit(c, 0.5), 0.7); g.lineBetween(x0 + 4 + wob, y, x0 + w - 4 - wob, y + 6);
            }
          }
        }
        // The key at the foot.
        const down = p.lit && time >= p.sounds - 120 ? 1 : 0;
        g.fillStyle(EBONY, 1); g.fillRect(x0 - 2, KEY_Y - 2, w + 4, 30);
        g.fillStyle(p.lit ? CANDLE : sticking(p, time) ? 0xd8e0f0 : IVORY, 1); g.fillRect(x0, KEY_Y + down * 3, w, 24 - down * 3);
      }
    },
    drawAir(g, time) {
      // The pipes along the back, their mouths shivering when they speak.
      for (const p of pipes) {
        const speaking = (p.lit && time >= p.sounds - 40 && time < p.sounds + SOUND_MS) || stuck(p, time);
        const h = 66 + ((pipes.indexOf(p) * 37) % 26);
        organPipe(g, p.x + (speaking ? Math.sin(time / 15) * 1.5 : 0), PIPE_Y, 30, h, { metal: SILVER, glow: speaking ? 1 : p.lit ? 0.4 : 0, mouthOpen: speaking ? 0.6 : 0 });
        if (time < p.restUntil && !sticking(p, time)) {
          // Resting from a cipher: a felt damper hung on its mouth.
          g.fillStyle(0x6a2a2a, 0.9); g.fillRect(p.x - 10, MOUTH_Y - 4, 20, 10);
        }
        if (speaking) {
          for (let k = 0; k < 3; k++) {
            const r = ((time / 4 + k * 30) % 90);
            g.lineStyle(2, SILVER_LIT, 0.5 * (1 - r / 90)); g.strokeEllipse(p.x, PIPE_Y + 20 + r * 2, 30 + r * 0.6, 10 + r * 0.2);
          }
        }
      }
    },
    drawHud(g, time) {
      if (!pipes.some((p) => p.lit)) return;
      const cx = ctx.W / 2, cy = top + 12;
      const k = clampN((chordAt - time) / ctx.tk.warn(CHORD_WARN), 0, 1);
      g.fillStyle(0x0c0c14, 0.8); g.fillRoundedRect(cx - 100, cy - 8, 200, 16, 6);
      g.fillStyle(CANDLE, 1); g.fillRoundedRect(cx - 94, cy - 4, 188 * k, 8, 3);
      trebleClef(g, cx - 112, cy + 2, 0.35, GILT_LIT, 1, 2);
    },
  };
};

// ── Warden 3: Compline ───────────────────────────────────────────────

/**
 * Six sealed pipes stand about the room, a voice in each. Every 7.5s the Choirwarden calls
 * Compline: the sealed mouths open (1.8s), then each sings a ring outward — 10 and a 1.4s silence
 * to you if it catches you. The voices sing *for* him: every ring has its gap facing him, so the
 * safe place is the line between a pipe and the warden. Strike a sealed pipe to cut its ribbon: its
 * voice comes out and follows you for 6s, and while it does he is silenced whenever he is within
 * 180px of it and takes +20%. An emptied pipe does not sing — until he walks to it and ties it
 * shut again; touch the voice himself and he seals it back early.
 */
const compline = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const PERIOD = ctx.hard ? 6200 : 7500;
  const WARN = 1800;
  const RING_SPEED = 290;
  const RING_MAX = 460;
  const BAND = 14;
  const GAP = 0.44;
  const RING_DMG = ctx.hard ? 13 : 10;
  const SILENCE_MS = 1400;
  const VOICE_MS = 6000;
  const VOICE_REACH = 180;
  const RESEAL_MS = 800;
  const SPOTS: Pt[] = [
    { x: 300, y: top + 64 }, { x: ctx.W - 300, y: top + 64 },
    { x: 70, y: (top + ctx.H) / 2 + 30 }, { x: ctx.W - 70, y: (top + ctx.H) / 2 + 30 },
    { x: 300, y: ctx.H - 40 }, { x: ctx.W - 300, y: ctx.H - 40 },
  ];

  interface Pipe { x: number; y: number; state: 'sealed' | 'free' | 'open'; freedAt: number; resealT: number; target: StrikeTarget | null }
  interface Ring { cx: number; cy: number; born: number; gapA: number; hit: boolean }
  interface Voice { pipe: Pipe; x: number; y: number; until: number; lastHush: number }
  const pipes: Pipe[] = SPOTS.map((s) => ({ x: s.x, y: s.y, state: 'sealed', freedAt: 0, resealT: 0, target: null }));
  let rings: Ring[] = [];
  let voices: Voice[] = [];
  let next = 0;
  let calling = 0;   // compline warn start (0 = not calling)

  const strike = (p: Pipe, by: Who) => {
    if (by !== 'player' || p.state !== 'sealed') return;
    const now = ctx.scene.time.now;
    p.state = 'free';
    p.freedAt = now;
    voices.push({ pipe: p, x: p.x, y: p.y - 40, until: now + VOICE_MS, lastHush: 0 });
    ctx.float(p.x, p.y - 70, 'A VOICE GETS OUT', '#d8f0ff');
    ctx.sfx('wings');
  };

  const sing = (time: number) => {
    for (const p of pipes) {
      if (p.state !== 'sealed') continue;
      rings.push({ cx: p.x, cy: p.y - 30, born: time, gapA: Math.atan2(ctx.npc.y - (p.y - 30), ctx.npc.x - p.x), hit: false });
    }
    ctx.sfx('holy-chord');
  };

  const nearVoice = (): boolean => voices.some((v) => dist(v.x, v.y, ctx.npc.x, ctx.npc.y) < VOICE_REACH);

  return {
    update(time, dtRaw) {
      const dt = stepOf(dtRaw);
      if (pipes[0].target === null) {
        for (const p of pipes) p.target = ctx.target({ x: p.x, y: p.y - 30, r: 26, onStruck: (by) => strike(p, by) });
        next = time + 3000;
      }
      if (!calling && time >= next - ctx.tk.warn(WARN)) { calling = time; ctx.banner('COMPLINE', '#d8e8ff'); ctx.sfx('countdown-tick'); }
      if (calling && time >= next) { sing(time); calling = 0; next = time + PERIOD; }
      // Rings: hit the player once each, outside the gap.
      const p = ctx.player;
      for (const r of rings) {
        const rad = 20 + ((time - r.born) / 1000) * RING_SPEED;
        if (r.hit || !alive(p)) continue;
        const d = dist(p.x, p.y, r.cx, r.cy);
        if (Math.abs(d - rad) < BAND + 18) {
          const off = Math.abs(wrap(Math.atan2(p.y - r.cy, p.x - r.cx) - r.gapA));
          if (off > GAP) {
            r.hit = true;
            ctx.tk.hitPlayer(RING_DMG, p.x, p.y);
            ctx.silence(p, SILENCE_MS);
            ctx.float(p.x, p.y - 50, 'HUSHED', '#d8e8ff');
          }
        }
      }
      rings = rings.filter((r) => 20 + ((time - r.born) / 1000) * RING_SPEED < RING_MAX);
      // Freed voices follow you and sing at him.
      const n = ctx.npc;
      for (const v of voices) {
        const tx = p.x - 34, ty = p.y - 46;
        v.x += (tx - v.x) * Math.min(1, dt * 4);
        v.y += (ty - v.y) * Math.min(1, dt * 4);
        if (alive(n) && dist(v.x, v.y, n.x, n.y) < VOICE_REACH && time - v.lastHush > 400) {
          v.lastHush = time;
          ctx.silence(n, 500);
        }
        if (alive(n) && dist(v.x, v.y, n.x, n.y) < 50) {
          v.until = time;
          ctx.float(v.x, v.y - 20, 'SEALED BACK', '#ff9a8a');
          ctx.sfx('hush');
        }
        if (time >= v.until) {
          v.pipe.state = v.pipe.state === 'free' && dist(v.x, v.y, n.x, n.y) < 50 ? 'sealed' : 'open';
        }
      }
      voices = voices.filter((v) => time < v.until);
      // He ties emptied pipes shut by standing at them.
      for (const pp of pipes) {
        if (pp.state !== 'open') { pp.resealT = 0; continue; }
        if (alive(n) && dist(n.x, n.y, pp.x, pp.y) < 70) {
          pp.resealT += dt * 1000;
          if (pp.resealT >= RESEAL_MS) { pp.state = 'sealed'; pp.resealT = 0; ctx.float(pp.x, pp.y - 70, 'RIBBONED', '#ff9a8a'); ctx.sfx('whip'); }
        } else pp.resealT = Math.max(0, pp.resealT - dt * 500);
      }
    },
    npcTakenMult() { return nearVoice() ? 1.2 : 1; },
    npcSeek() {
      const n = ctx.npc;
      if (voices.length) return { x: voices[0].x, y: voices[0].y };
      let best: Pt | null = null, bd = Infinity;
      for (const p of pipes) {
        if (p.state !== 'open') continue;
        const d = dist(n.x, n.y, p.x, p.y);
        if (d < bd) { bd = d; best = { x: p.x, y: clampN(p.y - 10, top + 30, ctx.H - 30) }; }
      }
      return best;
    },
    destroy() { for (const p of pipes) p.target?.remove(); },
    drawGround(g, time) {
      // While Compline is called, chalk the safe line from every sealed pipe towards him.
      if (calling) {
        const k = clampN((time - calling) / ctx.tk.warn(WARN), 0, 1);
        for (const p of pipes) {
          if (p.state !== 'sealed') continue;
          const a = Math.atan2(ctx.npc.y - (p.y - 30), ctx.npc.x - p.x);
          g.fillStyle(GHOST, 0.05 + k * 0.08);
          g.slice(p.x, p.y - 30, RING_MAX, a - GAP, a + GAP, false); g.fillPath();
          g.lineStyle(1.5, GHOST, 0.2 + k * 0.4);
          g.strokeCircle(p.x, p.y - 30, 30 + k * 30);
        }
      }
      for (const r of rings) {
        const rad = 20 + ((time - r.born) / 1000) * RING_SPEED;
        const a = 1 - rad / RING_MAX;
        // The ring, broken at the gap; ghostly notes riding on it.
        g.lineStyle(BAND * 2, GHOST_DEEP, 0.25 * a);
        g.beginPath(); g.arc(r.cx, r.cy, rad, r.gapA + GAP, r.gapA - GAP + Math.PI * 2, false); g.strokePath();
        g.lineStyle(3, GHOST, 0.8 * a);
        g.beginPath(); g.arc(r.cx, r.cy, rad, r.gapA + GAP, r.gapA - GAP + Math.PI * 2, false); g.strokePath();
        for (let k = 0; k < 6; k++) {
          const na = r.gapA + GAP + 0.3 + k * ((Math.PI * 2 - GAP * 2 - 0.6) / 5);
          noteHead(g, r.cx + Math.cos(na) * rad, r.cy + Math.sin(na) * rad, 0.9, GHOST, 0.8 * a, 1);
        }
      }
    },
    drawAir(g, time) {
      for (const p of pipes) {
        const singing = calling && p.state === 'sealed';
        organPipe(g, p.x, p.y, 28, 96, { metal: SILVER, sealed: p.state === 'sealed', glow: singing ? 0.6 + Math.sin(time / 60) * 0.3 : 0 });
        if (p.state === 'sealed') {
          const open = singing ? 0.5 + Math.sin(time / 90) * 0.4 : 0.1 + Math.sin(time / 600 + p.x) * 0.08;
          ghostMouth(g, p.x, p.y - 22, 0.7, open, singing ? 1 : 0.5);
        } else if (p.state === 'open') {
          // Cut ribbon trailing; his half-tied bow growing as he reseals.
          g.fillStyle(RIBBON, 0.8); g.fillRect(p.x + 10, p.y - 60, 3, 30);
          if (p.resealT > 0) {
            const k = p.resealT / RESEAL_MS;
            g.lineStyle(3, RIBBON, 0.9); g.beginPath(); g.arc(p.x, p.y - 52, 16, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          }
        }
      }
      for (const v of voices) {
        const k = clampN((v.until - time) / VOICE_MS, 0, 1);
        // The freed voice: a pale singing face with its cut ribbon streaming behind it.
        g.lineStyle(1, GHOST, 0.15); g.strokeCircle(v.x, v.y, VOICE_REACH);
        g.lineStyle(3, RIBBON, 0.7 * k);
        g.beginPath(); g.moveTo(v.x, v.y);
        for (let i = 1; i <= 8; i++) g.lineTo(v.x + i * 6, v.y + 12 + Math.sin(time / 120 + i) * 6);
        g.strokePath();
        ghostMouth(g, v.x, v.y + 8, 1.1, 0.6 + Math.sin(time / 110) * 0.35, 0.5 + k * 0.5);
        if (Math.floor(time / 300) % 2 === 0) noteHead(g, v.x - 18, v.y - 28 - ((time / 20) % 20), 0.9, GHOST, 0.8 * k, 1, true);
      }
      // A ribbon of hush over the warden while a voice is on him.
      if (nearVoice()) {
        const n = ctx.npc;
        g.fillStyle(RIBBON, 0.85); g.fillRect(n.x - 16, n.y - 12, 32, 5);
      }
    },
    drawHud(g, time) {
      const cx = ctx.W / 2, cy = top + 14;
      for (let i = 0; i < pipes.length; i++) {
        const x = cx - 60 + i * 24;
        g.fillStyle(pipes[i].state === 'sealed' ? 0x3a3a48 : GHOST, 1); g.fillRect(x - 4, cy - 8, 8, 16);
        if (pipes[i].state === 'sealed') { g.fillStyle(WAX_RED, 1); g.fillCircle(x, cy, 2.5); }
      }
      if (calling) {
        const k = clampN((time - calling) / ctx.tk.warn(WARN), 0, 1);
        g.lineStyle(3, GHOST, 0.9); g.beginPath(); g.arc(cx + 100, cy, 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      }
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const ORGAN_GIMMICKS: GimmickDef[] = [
  {
    id: 'organ-bellows',
    rules: 'Two lungs breathe by turns: they draw you in, then blow down their band. A lung aims at whoever did not last pump it — strike its nozzle.',
    make: breathingBellows,
  },
  {
    id: 'organ-cipher',
    rules: 'Lit keys sound their columns. Strike a pipe\'s mouth and it sticks on: a wall of sound that hurts whoever is in it and stops shots.',
    make: stuckNote,
  },
  {
    id: 'organ-compline',
    rules: 'At Compline the sealed pipes sing rings with their gaps toward the warden. Strike a pipe to free its voice — it silences him.',
    make: compline,
  },
];

export const ORGAN_WARDENS: EncounterDef[] = [
  {
    id: 'organ-warden-1', court: 'organ', name: 'The Breathing Bellows',
    foeName: 'Bellows-Master Hogarth Wynd', foeElement: 'pressure', difficulty: 5, hpMult: 1.2,
    gimmick: 'organ-bellows', at: { x: 900, y: 1775 }, coins: 170,
    look: { body: 0xb87a5a, accent: 0x4a2414, hat: 'bandmaster', traits: ['apron', 'beard', 'tool'], size: 1.3, eye: 0xffd8a0 },
    challenge: [
      'Breathe IN. ...And hold. And hold. Nobody walks my hall without the lungs knowing about it.',
      'Sixty blowers on that wheel, and every breath they make goes up to him. Yours too, now.',
      'Mind the gust, little noise. It comes from whoever pumped last — and I always pump last.',
    ],
    beaten: [
      '*wheezing* You... pumped my own lung at me. Nobody pumps my lungs. Nobody but me.',
      'Go on up. The pipes will speak when you pass. I shall sit here and get my breath back. My OWN breath.',
    ],
  },
  {
    id: 'organ-warden-2', court: 'organ', name: 'The Stuck Note',
    foeName: 'Stopwright Ignatia Rank', foeElement: 'metal', difficulty: 5, hpMult: 1.25,
    gimmick: 'organ-cipher', at: { x: 900, y: 1130 }, coins: 170,
    look: { body: 0x8a8a9a, accent: 0xd8b048, hat: 'helmet', traits: ['glasses', 'tool', 'satchel'], size: 1.05, eye: 0xd8e8ff },
    challenge: [
      'Do you know what a cipher is? A pipe that will not stop. A voice that will not be told. A fault.',
      'I find them. I fix them. Eleven thousand pipes, and every one of them silent until he says.',
      'Hold still and I will tune you. It is quicker if you are in the right column.',
    ],
    beaten: [
      'You stuck them on me. On purpose. You made my pipes cipher on PURPOSE.',
      '...It sounded rather well, actually. Go up. The Loft is past the glass. Do not listen to them too closely.',
    ],
  },
  {
    id: 'organ-warden-3', court: 'organ', name: 'Compline',
    foeName: 'Choirwarden Absolom Seal', foeElement: 'silence', difficulty: 5, hpMult: 1.3,
    gimmick: 'organ-compline', at: { x: 900, y: 450 }, coins: 170,
    look: { body: 0xe8e4dc, accent: 0x2a2a34, hat: 'mitre', traits: ['mask', 'cane', 'book'], size: 1.15, eye: 0xa8c8ff },
    challenge: [
      'Shh. Shh. They are singing Compline. You may stand at the back, if you stand very still.',
      'Every voice in this loft I ribboned myself. They sing for him, and when they sing, they sing round me.',
      'Stand where they part for me, or stand nowhere at all.',
    ],
    beaten: [
      '...you let them out. One at a time, and they sang at me. They have never sung AT me.',
      'He is through the curtain. He knows you are coming; he has been conducting your footsteps for an hour.',
    ],
  },
];
