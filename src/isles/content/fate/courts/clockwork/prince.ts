import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import { dial, gear, hand, metronome } from './art';
import {
  BLUED, BLUED_LIT, BRASS, BRASS_DARK, BRASS_LIT, CARD_RED, COPPER, ENAMEL, GILT, IRON_DARK, IRON_LIT, NUMERAL,
  PAID_GREY, PAVE_BLACK, PAVE_RED, TOCK, TOCK_DARK, TOCK_LIT, TOCK_STEEL,
} from './palette';
import { clamp, dist, segDist } from './util';

/**
 * Prince Tock, Keeper of the Hours — the Croupier-King's lucky child who governs the Clockwork Court.
 *
 * Tock's Lot has never been called, and he has never paid an hour. He is *paid* them: every
 * afternoon handed in at the Hour Office runs up the brass tube to the Regulator, and Tock wears
 * them. He is older than the oldest woman on Cuckoo Row and looks seventeen. He is perfectly
 * punctual and perfectly polite and he cannot imagine why anyone would want an afternoon back.
 *
 * • **Tick-Tock** (anchored): every blow lands on the beat of a great metronome. Its arm swings
 *   lanes across the room — left, right, and a heavy *tock* down the middle; a clock's two hands
 *   sweep round from the centre of the floor; the twelve hours ring the room and strike in turn.
 * • **Mainspring** (rushing, hot): he rolls toothed wheels across the floor that meet and mesh
 *   where their tracks cross, spraying teeth; he winds the key in his back and lets the spring go
 *   in three bounding dashes; an escapement of rings ticks out with its gap creeping one tooth on.
 * • **Stopped Clock** (hard, blinking, pale): he stops time — you are held where you stand while he
 *   sets knives round you, two gaps left in the ring — and when time restarts they all come at
 *   once; he leaves the seconds he stole standing about the room, each one firing in its turn.
 */

const TOP = 96;
/** The metronome's beat. Every signature's blow lands on it. */
const BEAT = 600;
const onBeat = (t: number): number => Math.ceil(t / BEAT) * BEAT;
const centre = (tk: BossToolkit): Pt => ({ x: tk.W / 2, y: (TOP + tk.H) / 2 });
const alive = (tk: BossToolkit) => tk.player.active && tk.player.hp > 0;

/** Until when the key in his back is spinning (the Mainspring wind-up), read by drawDecor. */
let windingUntil = 0;
/** While time is stopped (Stopped Clock), read by drawDecor. */
let stoppedUntil = 0;

// ── Signature: The Metronome ─────────────────────────────────────────
// A metronome arm as long as the room swings from him on the beat. On each beat it slams a lane
// down where it has swung — tick (left), tock (right), and every third beat a heavy TOCK down
// the middle. Each lane is shaded on the floor a beat and a half before it lands.

interface Slam { at: number; a: number; halfW: number; dmg: number; dealt: boolean }

const metronomeMove = (tk: BossToolkit): SignatureMove => {
  let slams: Slam[] = [];
  let c = 0;
  let start = 0;
  let end = 0;
  const SPREAD = 0.52;
  const LEN = 1300;
  const armAt = (time: number): number => {
    if (!slams.length) return c;
    // Swing smoothly from the last slam's angle to the next one.
    let prev = c, nextS = slams[0];
    for (const s of slams) { if (s.at <= time) prev = s.a; else { nextS = s; break; } }
    if (time >= slams[slams.length - 1].at) return slams[slams.length - 1].a;
    const k = clamp(1 - (nextS.at - time) / BEAT, 0, 1);
    return prev + (nextS.a - prev) * (0.5 - Math.cos(k * Math.PI) / 2);
  };
  return {
    durationMs: 4600,
    windupMs: 500,
    gesture: 'raise',
    hold: 'conduct',
    tell: 'TICK — TOCK',
    cast(time) {
      c = tk.angleToPlayer();
      start = onBeat(time + tk.warn(1100));
      const n = tk.hard ? 7 : 6;
      slams = [];
      for (let i = 0; i < n; i++) {
        const heavy = i % 3 === 2;
        const a = heavy ? c : c + (i % 2 ? SPREAD : -SPREAD);
        slams.push({ at: start + i * BEAT, a, halfW: heavy ? 40 : 24, dmg: heavy ? 16 : 12, dealt: false });
      }
      end = start + n * BEAT + 400;
      tk.sfx('clock-tick');
    },
    update(time) {
      if (!slams.length) return;
      const p = tk.player;
      for (const s of slams) {
        if (s.dealt || time < s.at) continue;
        s.dealt = true;
        tk.sfx(s.halfW > 30 ? 'drum-hit' : 'clock-tick');
        if (!alive(tk)) continue;
        const ex = tk.bossX + Math.cos(s.a) * LEN, ey = tk.bossY + Math.sin(s.a) * LEN;
        if (segDist(p.x, p.y, tk.bossX, tk.bossY, ex, ey) < s.halfW + 12) tk.hitPlayer(s.dmg, p.x, p.y);
      }
      if (time > end) slams = [];
    },
    drawGround(g, time) {
      for (const s of slams) {
        const lead = s.at - time;
        if (lead > BEAT * 1.6 || lead < -260) continue;
        const k = clamp(1 - lead / (BEAT * 1.6), 0, 1);
        const nx = -Math.sin(s.a), ny = Math.cos(s.a);
        const ex = tk.bossX + Math.cos(s.a) * LEN, ey = tk.bossY + Math.sin(s.a) * LEN;
        const fired = lead <= 0;
        g.fillStyle(fired ? TOCK_LIT : s.halfW > 30 ? CARD_RED : TOCK, fired ? 0.5 * (1 + lead / 260) : 0.08 + k * 0.2);
        g.fillTriangle(tk.bossX + nx * s.halfW, tk.bossY + ny * s.halfW, tk.bossX - nx * s.halfW, tk.bossY - ny * s.halfW, ex + nx * s.halfW, ey + ny * s.halfW);
        g.fillTriangle(tk.bossX - nx * s.halfW, tk.bossY - ny * s.halfW, ex + nx * s.halfW, ey + ny * s.halfW, ex - nx * s.halfW, ey - ny * s.halfW);
        if (!fired) {
          // Beat ticks along the lane, filling as the beat comes.
          for (let d = 60; d < 1000; d += 50) {
            g.fillStyle(lit(TOCK, 0.4), 0.15 + k * 0.5 * ((d / 50) % 2));
            g.fillRect(tk.bossX + Math.cos(s.a) * d - 2, tk.bossY + Math.sin(s.a) * d - 2, 4, 4);
          }
        }
      }
    },
    drawAir(g, time) {
      if (!slams.length) return;
      const a = armAt(time);
      const ex = tk.bossX + Math.cos(a) * 520, ey = tk.bossY + Math.sin(a) * 520;
      g.lineStyle(8, IRON_DARK, 0.85); g.lineBetween(tk.bossX, tk.bossY, ex, ey);
      g.lineStyle(3, IRON_LIT, 0.9); g.lineBetween(tk.bossX, tk.bossY, ex, ey);
      // The sliding weight on the arm.
      const wx = tk.bossX + Math.cos(a) * 300, wy = tk.bossY + Math.sin(a) * 300;
      g.fillStyle(GILT, 1); g.fillCircle(wx, wy, 13);
      g.fillStyle(TOCK_LIT, 0.7); g.fillCircle(wx - 3, wy - 4, 5);
      // A flash on the beat.
      const last = slams.filter((s) => s.dealt).pop();
      if (last && time - last.at < 200) glow(g, tk.bossX, tk.bossY, 60, TOCK_LIT, 0.1, 3);
    },
    onPhaseEnd() { slams = []; },
  };
};

// ── Signature: The Hands ─────────────────────────────────────────────
// The floor becomes a clock face and its two hands sweep from the centre: the long minute hand
// (from the hub out to the walls) a half-turn one way, the short hour hand (the hub itself) a
// quarter-turn the other. Their whole paths are shaded first. Hide in the hub from the minute
// hand, behind its start from both — but not in the hour hand's quarter.

interface HandSweep { a0: number; span: number; r0: number; r1: number; halfW: number; dmg: number }

const handsMove = (tk: BossToolkit): SignatureMove => {
  let warnAt = 0, startAt = 0, endAt = 0;
  let sweeps: HandSweep[] = [];
  let lastHit = 0;
  const TRAVEL = 2000;
  const angleAt = (s: HandSweep, time: number) => s.a0 + s.span * clamp((time - startAt) / TRAVEL, 0, 1);
  return {
    durationMs: 3400,
    windupMs: 450,
    gesture: 'point',
    tell: 'THE HANDS',
    cast(time) {
      const c = centre(tk);
      const pa = Math.atan2(tk.player.y - c.y, tk.player.x - c.x);
      const dir = Math.random() < 0.5 ? 1 : -1;
      sweeps = [
        { a0: pa - dir * Math.PI * 0.25, span: dir * Math.PI, r0: 150, r1: 900, halfW: 16, dmg: 15 },
        { a0: pa + dir * Math.PI * 0.6, span: -dir * Math.PI * 0.5, r0: 0, r1: 250, halfW: 22, dmg: 12 },
      ];
      warnAt = time;
      startAt = onBeat(time + tk.warn(1100));
      endAt = startAt + TRAVEL;
      tk.sfx('gear-turn');
    },
    update(time) {
      if (!sweeps.length || time < startAt) return;
      if (time > endAt + 300) { sweeps = []; return; }
      if (!alive(tk) || time - lastHit < 500) return;
      const c = centre(tk), p = tk.player;
      for (const s of sweeps) {
        const a = angleAt(s, time);
        const x0 = c.x + Math.cos(a) * s.r0, y0 = c.y + Math.sin(a) * s.r0;
        const x1 = c.x + Math.cos(a) * s.r1, y1 = c.y + Math.sin(a) * s.r1;
        if (segDist(p.x, p.y, x0, y0, x1, y1) < s.halfW + 12) { lastHit = time; tk.hitPlayer(s.dmg, p.x, p.y); tk.sfx('slash'); break; }
      }
    },
    drawGround(g, time) {
      if (!sweeps.length) return;
      const c = centre(tk);
      const k = clamp((time - warnAt) / Math.max(1, startAt - warnAt), 0, 1);
      // The dial on the floor.
      g.lineStyle(3, BRASS, 0.25 + k * 0.25); g.strokeCircle(c.x, c.y, 150);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.fillStyle(i === 0 ? CARD_RED : BRASS_LIT, 0.4 + k * 0.3); g.fillCircle(c.x + Math.cos(a) * 165, c.y + Math.sin(a) * 165, i % 3 ? 3 : 5);
      }
      // Each hand's remaining path, shaded.
      for (const s of sweeps) {
        const a = angleAt(s, time);
        const a1 = s.a0 + s.span;
        const lo = Math.min(a, a1), hi = Math.max(a, a1);
        if (hi - lo < 0.01) continue;
        g.fillStyle(s.r0 > 0 ? BLUED : CARD_RED, 0.08 + k * 0.1);
        g.beginPath();
        g.arc(c.x, c.y, Math.min(s.r1, 700), lo, hi, false);
        if (s.r0 > 0) g.arc(c.x, c.y, s.r0, hi, lo, true); else g.lineTo(c.x, c.y);
        g.closePath(); g.fillPath();
      }
    },
    drawAir(g, time) {
      if (!sweeps.length) return;
      const c = centre(tk);
      const live = time >= startAt;
      for (const s of sweeps) {
        const a = angleAt(s, time);
        if (s.r0 > 0) {
          // The minute hand: a long blued blade from the hub out.
          const len = Math.min(s.r1, 760);
          g.lineStyle(s.halfW * 2 + 4, dim(BLUED, 0.4), live ? 0.9 : 0.35);
          g.lineBetween(c.x + Math.cos(a) * s.r0, c.y + Math.sin(a) * s.r0, c.x + Math.cos(a) * len, c.y + Math.sin(a) * len);
          g.lineStyle(s.halfW * 2 - 4, BLUED, live ? 1 : 0.4);
          g.lineBetween(c.x + Math.cos(a) * s.r0, c.y + Math.sin(a) * s.r0, c.x + Math.cos(a) * len, c.y + Math.sin(a) * len);
          g.lineStyle(2, BLUED_LIT, live ? 0.8 : 0.3);
          g.lineBetween(c.x + Math.cos(a) * s.r0, c.y + Math.sin(a) * s.r0 - 3, c.x + Math.cos(a) * len, c.y + Math.sin(a) * len - 3);
        } else {
          hand(g, c.x, c.y, a, s.r1, s.halfW * 0.9, live ? GILT : dim(GILT, 0.5));
        }
      }
      g.fillStyle(GILT, 1); g.fillCircle(c.x, c.y, 12);
      g.fillStyle(TOCK_DARK, 1); g.fillCircle(c.x, c.y, 5);
    },
    onPhaseEnd() { sweeps = []; },
  };
};

// ── Signature: On the Hour ───────────────────────────────────────────
// The twelve hours stand round the room in brass. They strike in turn on the half-beat, from the
// hour opposite you, two runs coming round both ways to meet at your hour. At twelve he chimes:
// twelve shots out of him at once.

const chimeMove = (tk: BossToolkit): SignatureMove => {
  let posts: Pt[] = [];
  let fireAt: number[] = [];
  let chimeAt = 0;
  let chimed = true;
  return {
    durationMs: 4200,
    windupMs: 500,
    gesture: 'clap',
    tell: 'ON THE HOUR',
    cast(time) {
      const c = centre(tk);
      posts = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        posts.push({ x: c.x + Math.cos(a) * (tk.W * 0.4), y: c.y + Math.sin(a) * ((tk.H - TOP) * 0.38) });
      }
      let mine = 0, md = Infinity;
      posts.forEach((p, i) => { const d = dist(p.x, p.y, tk.player.x, tk.player.y); if (d < md) { md = d; mine = i; } });
      const t0 = onBeat(time + tk.warn(1000));
      fireAt = new Array(12).fill(0);
      for (let step = 0; step <= 6; step++) {
        const at = t0 + step * (BEAT / 2);
        fireAt[(mine + 6 + step) % 12] = at;
        fireAt[(mine + 6 - step + 12) % 12] = at;
      }
      for (let i = 0; i < 12; i++) {
        tk.spawnZone({ x: posts[i].x, y: posts[i].y, radius: 86, warnMs: Math.max(200, (fireAt[i] - time) / tk.telegraphScale), damage: 13, fall: false });
      }
      chimeAt = t0 + 7 * (BEAT / 2) + BEAT;
      chimed = false;
      tk.sfx('countdown-tick');
    },
    update(time) {
      if (chimed || time < chimeAt) return;
      chimed = true;
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < 12; i++) tk.spawnBullet({ x: tk.bossX, y: tk.bossY, angle: base + (i / 12) * Math.PI * 2, speed: 190, damage: 10, r: 6, color: GILT });
      tk.sfx('holy-chord');
    },
    drawGround(g, time) {
      posts.forEach((p, i) => {
        if (!fireAt[i] || time > fireAt[i] + 600) return;
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(p.x, p.y + 3, 34, 14);
        g.fillStyle(BRASS, 1); g.fillEllipse(p.x, p.y, 30, 12);
        // The hour, as strokes.
        g.lineStyle(2, NUMERAL, 0.9);
        const n = i === 0 ? 12 : i;
        for (let s = 0; s < Math.min(n, 6); s++) g.lineBetween(p.x - 8 + s * 3.2, p.y - 3, p.x - 8 + s * 3.2, p.y + 3);
        if (n > 6) { g.lineStyle(2, CARD_RED, 0.9); g.lineBetween(p.x + 9, p.y - 3, p.x + 13, p.y + 3); }
      });
    },
    drawAir(g, time) {
      posts.forEach((p, i) => {
        const since = time - fireAt[i];
        if (!fireAt[i] || since < 0 || since > 500) return;
        const k = since / 500;
        g.lineStyle(3 * (1 - k), GILT, 1 - k);
        for (let r = 0; r < 3; r++) { g.beginPath(); g.arc(p.x, p.y - 20, 16 + k * 30 + r * 8, -2.4, -0.7, false); g.strokePath(); }
      });
    },
    onPhaseEnd() { posts = []; chimed = true; },
  };
};

// ── Signature: Gear Train ────────────────────────────────────────────
// Three toothed wheels roll in from the edges along tracks drawn first — across your row, down
// your column, and on a slant — timed to arrive at your spot together. Where two meet they mesh,
// stop dead grinding, and spit teeth in a ring; then roll on.

interface Rolling { x: number; y: number; vx: number; vy: number; r: number; turn: number; stopUntil: number; startAt: number; meshed: Set<number> }

const gearsMove = (tk: BossToolkit): SignatureMove => {
  let wheels: Rolling[] = [];
  let tracks: { x0: number; y0: number; x1: number; y1: number }[] = [];
  let lastHit = 0;
  let dieAt = 0;
  const SPEED = 270;
  const R = 34;
  return {
    durationMs: 2400,
    windupMs: 500,
    gesture: 'sweep',
    tell: 'GEAR TRAIN',
    cast(time) {
      const p = { x: tk.player.x, y: tk.player.y };
      const startAt = time + tk.warn(1000);
      const lead = 1.5;
      const dirs = [0, Math.PI / 2, Math.random() < 0.5 ? Math.PI / 4 : -Math.PI / 4].map((a) => a + (Math.random() < 0.5 ? 0 : Math.PI));
      wheels = []; tracks = [];
      for (const a of dirs) {
        const vx = Math.cos(a) * SPEED, vy = Math.sin(a) * SPEED;
        const sx = p.x - vx * lead, sy = p.y - vy * lead;
        wheels.push({ x: sx, y: sy, vx, vy, r: R, turn: 0, stopUntil: 0, startAt, meshed: new Set() });
        tracks.push({ x0: sx, y0: sy, x1: p.x + vx * 3, y1: p.y + vy * 3 });
      }
      dieAt = startAt + 5200;
      tk.sfx('gear-turn');
    },
    update(time, dt) {
      if (!wheels.length) return;
      if (time > dieAt) { wheels = []; tracks = []; return; }
      wheels.forEach((w, i) => {
        if (time < w.startAt || time < w.stopUntil) return;
        w.x += w.vx * dt; w.y += w.vy * dt; w.turn += (SPEED / R) * dt;
        // Meet another moving wheel: mesh.
        wheels.forEach((o, j) => {
          if (j === i || w.meshed.has(j) || time < o.startAt) return;
          if (dist(w.x, w.y, o.x, o.y) < w.r + o.r) {
            w.meshed.add(j); o.meshed.add(i);
            const until = time + 900;
            w.stopUntil = until; o.stopUntil = until;
            const mx = (w.x + o.x) / 2, my = (w.y + o.y) / 2;
            const base = Math.random() * Math.PI;
            for (let k = 0; k < 10; k++) tk.spawnBullet({ x: mx, y: my, angle: base + (k / 10) * Math.PI * 2, speed: 200, damage: 9, r: 5, color: BRASS_LIT });
            tk.sfx('clang');
          }
        });
      });
      const p = tk.player;
      if (alive(tk) && time - lastHit > 600) {
        for (const w of wheels) if (time >= w.startAt && dist(w.x, w.y, p.x, p.y) < w.r + 18) { lastHit = time; tk.hitPlayer(14, p.x, p.y); tk.sfx('hit-medium'); break; }
      }
    },
    drawGround(g, time) {
      for (const t of tracks) {
        g.lineStyle(18, IRON_DARK, 0.35); g.lineBetween(t.x0, t.y0, t.x1, t.y1);
        g.lineStyle(2, BRASS, 0.5); g.lineBetween(t.x0, t.y0, t.x1, t.y1);
        // Tooth marks pressed into the track.
        const len = dist(t.x0, t.y0, t.x1, t.y1);
        for (let d = 0; d < len; d += 24) {
          const x = t.x0 + ((t.x1 - t.x0) * d) / len, y = t.y0 + ((t.y1 - t.y0) * d) / len;
          g.fillStyle(BRASS_LIT, 0.25 + (Math.sin(time / 120 - d / 30) > 0.6 ? 0.3 : 0)); g.fillRect(x - 2, y - 2, 4, 4);
        }
      }
      for (const w of wheels) { g.fillStyle(0x000000, 0.25); g.fillEllipse(w.x + 4, w.y + w.r * 0.8, w.r * 2, w.r * 0.6); }
    },
    drawAir(g, time) {
      for (const w of wheels) {
        const grinding = time < w.stopUntil;
        gear(g, w.x + (grinding ? Math.sin(time / 20) * 1.5 : 0), w.y, w.r, 12, w.turn + (grinding ? time / 40 : 0), grinding ? lit(COPPER, 0.2) : COPPER, 1, 4);
        if (grinding) for (let k = 0; k < 4; k++) { const a = time / 50 + k * 1.6; g.fillStyle(BRASS_LIT, 0.9); g.fillCircle(w.x + Math.cos(a) * (w.r + 6), w.y + Math.sin(a) * (w.r + 6), 2); }
      }
    },
    onPhaseEnd() { wheels = []; tracks = []; },
  };
};

// ── Signature: Wind the Mainspring ───────────────────────────────────
// He stops, and the great key in his back turns, click by click. Then the spring goes: three
// bounding dashes, each aimed fresh at you and each shown as a lane before it, shorter and quicker
// as the spring runs down.

const windMove = (tk: BossToolkit): SignatureMove => {
  let trails: { x0: number; y0: number; x1: number; y1: number; at: number }[] = [];
  const dash = (k: number) => {
    if (!alive(tk)) return;
    const a = tk.angleToPlayer();
    const reach = Math.min(dist(tk.bossX, tk.bossY, tk.player.x, tk.player.y) + 140, 700 - k * 120);
    const toX = tk.clampX(tk.bossX + Math.cos(a) * reach), toY = tk.clampY(tk.bossY + Math.sin(a) * reach);
    const x0 = tk.bossX, y0 = tk.bossY;
    const travel = 360 - k * 50;
    tk.spawnCharge({ toX, toY, warnMs: 720 - k * 90, travelMs: travel, halfW: 30, damage: 16 });
    tk.schedule(tk.warn(720 - k * 90) + travel, () => { trails.push({ x0, y0, x1: toX, y1: toY, at: tk.now }); tk.sfx('snap-back'); });
    if (k < 2) tk.schedule(tk.warn(720 - k * 90) + travel + 160, () => dash(k + 1));
  };
  return {
    durationMs: 3600,
    windupMs: 1400,
    gesture: 'flex',
    hold: 'brace',
    locksBody: true,
    tell: 'WINDING…',
    cast(time) {
      windingUntil = time;
      trails = [];
      tk.sfx('reload');
      dash(0);
    },
    update(time) {
      trails = trails.filter((t) => time - t.at < 700);
    },
    drawGround(g, time) {
      for (const t of trails) {
        const k = (time - t.at) / 700;
        // A sprung coil left along the dash.
        const len = dist(t.x0, t.y0, t.x1, t.y1) || 1;
        const ux = (t.x1 - t.x0) / len, uy = (t.y1 - t.y0) / len;
        g.lineStyle(3, BRASS_LIT, 0.7 * (1 - k));
        g.beginPath();
        for (let d = 0; d <= len; d += 6) {
          const w = Math.sin(d / 9) * 16 * (1 - d / len);
          const x = t.x0 + ux * d - uy * w, y = t.y0 + uy * d + ux * w;
          if (d === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
      }
    },
    onPhaseEnd() { trails = []; windingUntil = 0; },
  };
};

// ── Signature: Escapement ────────────────────────────────────────────
// The escape wheel ticks: rings of teeth go out from him one per beat, each with one gap where
// the pallet lifts — and the gap creeps on one tooth every ring, always the same way. Follow it.

const escapementMove = (tk: BossToolkit): SignatureMove => {
  let gapA = 0;
  let step = 0;
  let ticks: number[] = [];
  let ox = 0, oy = 0;
  const GAP_HALF = 0.46;
  const TOOTH = 0.27;
  return {
    durationMs: 3600,
    windupMs: 500,
    gesture: 'slam',
    tell: 'ESCAPEMENT',
    cast(time) {
      ox = tk.bossX; oy = tk.bossY;
      gapA = tk.angleToPlayer();
      step = (Math.random() < 0.5 ? 1 : -1) * TOOTH;
      const n = tk.hard ? 6 : 5;
      const t0 = onBeat(time + 300);
      ticks = [];
      for (let i = 0; i < n; i++) {
        const at = t0 + i * (BEAT * 0.9);
        ticks.push(at);
        tk.spawnRing({ cx: ox, cy: oy, delayMs: at - time, speed: 300, gapCentre: gapA + step * i, gapHalf: GAP_HALF, band: 16, damage: 12 });
      }
      tk.sfx('gear-turn');
    },
    update(time) {
      for (let i = 0; i < ticks.length; i++) if (ticks[i] && time >= ticks[i]) { ticks[i] = 0; tk.sfx('clock-tick'); }
    },
    drawGround(g, time) {
      if (!ticks.some((t) => t)) return;
      // The escape wheel round him, and the pallet showing the next gap.
      const done = ticks.filter((t) => !t).length;
      const a = gapA + step * Math.min(done, ticks.length - 1);
      gear(g, ox, oy, 70, 20, time / 1500 * Math.sign(step), dim(BRASS, 0.2), 1, 6);
      g.lineStyle(4, BLUED, 0.9);
      g.lineBetween(ox + Math.cos(a - GAP_HALF) * 90, oy + Math.sin(a - GAP_HALF) * 90, ox + Math.cos(a) * 110, oy + Math.sin(a) * 110);
      g.lineBetween(ox + Math.cos(a + GAP_HALF) * 90, oy + Math.sin(a + GAP_HALF) * 90, ox + Math.cos(a) * 110, oy + Math.sin(a) * 110);
      g.lineStyle(2, BLUED_LIT, 0.5);
      for (let d = 130; d < 600; d += 40) g.lineBetween(ox + Math.cos(a) * d, oy + Math.sin(a) * d, ox + Math.cos(a + step * 0.4) * (d + 20), oy + Math.sin(a + step * 0.4) * (d + 20));
    },
    onPhaseEnd() { ticks = []; },
  };
};

// ── Signature: Stopped Clock ─────────────────────────────────────────
// He stops time. The room greys, you are held where you stood, and knives appear round you one
// by one — a full ring but for two gaps. Time restarts, a half-beat passes, and they all come in
// at once, meeting where you stood and no further. Be out through a gap by then.

interface Knife { a: number; at: number }

const stopMove = (tk: BossToolkit): SignatureMove => {
  let knives: Knife[] = [];
  let P: Pt = { x: 0, y: 0 };
  let freezeUntil = 0;
  let fireAt = 0;
  let fired = true;
  const RING = 190;
  const FREEZE = 1900;
  return {
    durationMs: 3000,
    windupMs: 800,
    gesture: 'raise',
    hold: 'reach',
    tell: 'STOP',
    cast(time) {
      P = { x: tk.player.x, y: tk.player.y };
      freezeUntil = time + FREEZE;
      stoppedUntil = freezeUntil;
      // Time stops: a real root, held where they stood until it restarts (hands still move).
      if (alive(tk)) tk.stun(FREEZE);
      fireAt = freezeUntil + (tk.hard ? 450 : 520);
      fired = false;
      const n = 16;
      const g1 = Math.floor(Math.random() * n);
      const g2 = (g1 + 6 + Math.floor(Math.random() * 5)) % n;
      knives = [];
      for (let i = 0; i < n; i++) {
        if ([g1, (g1 + 1) % n, g2, (g2 + 1) % n].includes(i)) continue;
        knives.push({ a: (i / n) * Math.PI * 2, at: time + 150 + knives.length * 95 });
      }
      tk.sfx('time-warp');
    },
    update(time) {
      if (!fired && time >= fireAt) {
        fired = true;
        for (const k of knives) {
          const x = P.x + Math.cos(k.a) * RING, y = P.y + Math.sin(k.a) * RING;
          tk.spawnBullet({ x, y, angle: k.a + Math.PI, speed: 460, damage: 12, r: 6, lifeMs: (RING / 460) * 1000, color: PAID_GREY });
        }
        tk.sfx('slash');
        knives = [];
      }
    },
    drawGround(g, time) {
      if (fired) return;
      g.lineStyle(2, PAID_GREY, 0.5); g.strokeCircle(P.x, P.y, RING);
      g.lineStyle(1, PAID_GREY, 0.3); g.strokeCircle(P.x, P.y, 30);
    },
    drawAir(g, time) {
      if (fired) return;
      // The grey of stopped time over the whole floor.
      if (time < freezeUntil) {
        g.fillStyle(PAID_GREY, 0.16); g.fillRect(0, TOP, tk.W, tk.H - TOP);
        dial(g, P.x, P.y - 52, 12, 1.1, 0.0, 0xd8d8d0, 0x8a8a84);
      }
      for (const k of knives) {
        if (time < k.at) continue;
        const x = P.x + Math.cos(k.a) * RING, y = P.y + Math.sin(k.a) * RING;
        const ia = k.a + Math.PI;
        const cx = Math.cos(ia), cy = Math.sin(ia);
        // A clock-hand knife, frozen in the air, pointing in.
        g.lineStyle(5, dim(TOCK_STEEL, 0.4), 1); g.lineBetween(x - cx * 14, y - cy * 14, x + cx * 16, y + cy * 16);
        g.lineStyle(3, time >= freezeUntil ? BLUED_LIT : TOCK_STEEL, 1); g.lineBetween(x - cx * 14, y - cy * 14, x + cx * 16, y + cy * 16);
        g.fillStyle(GILT, 1); g.fillCircle(x - cx * 14, y - cy * 14, 3);
        if (time >= freezeUntil) { g.lineStyle(1, BLUED_LIT, 0.35); g.lineBetween(x, y, P.x, P.y); }
      }
    },
    onPhaseEnd() { knives = []; fired = true; stoppedUntil = 0; },
  };
};

// ── Signature: Lost Seconds ──────────────────────────────────────────
// He blinks about the room and leaves a stopped copy of himself at every spot — the seconds he
// took from someone. One after another each copy wakes, turns its face to you, and fires a lane.

const afterimageMove = (tk: BossToolkit): SignatureMove => {
  let ghosts: { x: number; y: number; wakeAt: number; fireAt: number; a: number; fired: boolean }[] = [];
  return {
    durationMs: 2800,
    windupMs: 500,
    gesture: 'point',
    tell: 'LOST SECONDS',
    cast(time) {
      const spots: Pt[] = [{ x: tk.bossX, y: tk.bossY }];
      const corners = [[90, TOP + 70], [tk.W - 90, TOP + 70], [90, tk.H - 70], [tk.W - 90, tk.H - 70], [tk.W / 2, TOP + 60], [tk.W / 2, tk.H - 60]];
      corners.sort(() => Math.random() - 0.5);
      for (const [x, y] of corners.slice(0, tk.hard ? 4 : 3)) spots.push({ x, y });
      ghosts = spots.map((s, i) => {
        const wakeAt = time + 300 + i * 520;
        return { x: s.x, y: s.y, wakeAt, fireAt: wakeAt + tk.warn(900), a: 0, fired: false };
      });
      tk.sfx('blink');
    },
    update(time) {
      for (const gh of ghosts) {
        if (time >= gh.wakeAt && !gh.fired && gh.a === 0) {
          gh.a = tk.angleToPlayer(gh.x, gh.y) || 0.0001;
          tk.spawnLane({ x: gh.x, y: gh.y, angle: gh.a, halfW: 22, warnMs: 900, damage: 13 });
          tk.sfx('clock-tick');
        }
        if (!gh.fired && time >= gh.fireAt) gh.fired = true;
      }
      ghosts = ghosts.filter((gh) => !gh.fired || time < gh.fireAt + 500);
    },
    drawAir(g, time) {
      for (const gh of ghosts) {
        const awake = time >= gh.wakeAt;
        const fade = gh.fired ? clamp(1 - (time - gh.fireAt) / 500, 0, 1) : 1;
        // A pale stopped Tock: walnut body gone grey, a dial for a face, the key still.
        g.fillStyle(PAID_GREY, 0.35 * fade); g.fillCircle(gh.x, gh.y, 30);
        g.lineStyle(2, awake ? BLUED_LIT : PAID_GREY, 0.8 * fade); g.strokeCircle(gh.x, gh.y, 30);
        dial(g, gh.x, gh.y - 2, 14, awake ? gh.a + Math.PI / 2 : 0, awake ? time / 100 : 0, 0xe0e0d8, 0x9a9a94);
        g.lineStyle(3, PAID_GREY, 0.8 * fade); g.lineBetween(gh.x, gh.y - 32, gh.x, gh.y - 46);
        g.strokeCircle(gh.x - 6, gh.y - 50, 5); g.strokeCircle(gh.x + 6, gh.y - 50, 5);
      }
    },
    onPhaseEnd() { ghosts = []; },
  };
};

export const TOCK_BOSS: WorldBossDef = {
  worldId: 'isle:tock',
  name: 'Prince Tock',
  title: 'Keeper of the Hours',
  color: TOCK,
  colorLit: TOCK_LIT,
  colorDark: TOCK_DARK,
  accent: TOCK_STEEL,
  // Tier 2 of the eighth isle.
  damageMult: 1.3,

  intro: [
    'You are four minutes and eleven seconds late. I have been counting. I count everything.',
    'Do sit. No? Then stand, and I shall take the time you would have spent sitting.',
  ],
  banter: [
    'An afternoon is such a small thing. Nobody misses one. Everybody pays one.',
    'I have never been drawn. Father says I am lucky. I say I am punctual.',
    'Every hour on this hill ends up in me. I am eighty-one years old, you know. Don\'t I look well?',
    'Tick. And — tock. You see? You can feel it coming. Everyone can.',
    'The queue at the Hour Office moves so beautifully. Like a second hand.',
  ],
  defeatLine: 'THE CLOCK RUNS DOWN',
  resumeLine: 'You again. You\'ve kept me waiting. I shall take it out of your afternoon.',

  phases: [
    {
      name: 'Tick-Tock',
      line: 'Listen. Do you hear it? Everything I do lands on the beat. Everything.',
      hp: 520,
      cycle: [
        'sig:metronome', 'volley', 'sig:hands', 'radial', 'sig:chime',
        'sig:metronome', 'homing', 'sig:hands', 'sig:chime',
      ],
      harass: ['h-snipe', 'h-orbs'],
      restMs: 1200,
      harassMs: 3400,
    },
    {
      name: 'Mainspring',
      line: 'You have made me lose the beat. How rude. Then let me wind up — properly.',
      hp: 600,
      cycle: [
        'sig:gears', 'sig:wind', 'sig:escapement', 'barrage', 'sig:gears',
        'charge', 'sig:wind', 'lanes', 'sig:escapement',
      ],
      harass: ['h-flak', 'h-lane'],
      restMs: 1100,
      harassMs: 3000,
    },
  ],

  hard: {
    introLine: 'TIME IS MINE TO STOP',
    extraPhase: {
      name: 'Stopped Clock',
      line: 'Enough. I am going to stop. Everything. And you are going to stand very, very still.',
      hp: 440,
      cycle: [
        'sig:stop', 'sig:afterimage', 'sig:hands', 'sweep',
        'sig:stop', 'sig:escapement', 'sig:afterimage', 'spiral',
      ],
      harass: ['h-rune', 'h-mines'],
      restMs: 1000,
      harassMs: 2700,
    },
  },

  tuning: {
    volley: { count: 5, speed: 230, spreadRad: 0.5 },
    radial: { count: 12, speed: 185 },
    homing: { count: 3 },
    barrage: { count: 12 },
    spiral: { arms: 4, speed: 170 },
  },

  signatures: {
    metronome: metronomeMove,
    hands: handsMove,
    chime: chimeMove,
    gears: gearsMove,
    wind: windMove,
    escapement: escapementMove,
    stop: stopMove,
    afterimage: afterimageMove,
  },

  look: {
    crest: 'none', pattern: 'gears', aura: 'sparks', hands: 'gauntlet',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: TOCK_STEEL,
  },
  phaseStyles: [
    { movement: 'anchor', gimmick: 'none', tint: 'gold' },
    { movement: 'rush', gimmick: 'none', tint: 'hot', look: { aura: 'coins', hands: 'claw', mouth: 'grate' } },
    { movement: 'blink', gimmick: 'none', tint: 'pale', look: { aura: 'dust', hands: 'wisp', mouth: 'none' } },
  ],

  /**
   * Tock's tells. A gilt bezel of twelve hour-studs rides round him like the rim of a watch case;
   * a great bow winding key stands up out of his back; a pendulum hangs beneath him. Tick-Tock: a
   * little metronome on his shoulder keeps the beat with the fight. Mainspring: a coiled spring
   * shows on his chest, and the key whirls when he winds. Stopped Clock: the bezel goes grey and
   * cracked, the studs stop, and his face is a dial whose hands do not move.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const stopped = s.hard && s.phaseIdx >= 2;
    const spring = s.phaseIdx === 1;
    const rim = stopped ? PAID_GREY : GILT;
    // The pendulum beneath him.
    const pa = stopped ? 0.18 : Math.sin(s.t / (BEAT / Math.PI)) * 0.35;
    const px = s.x + Math.sin(pa) * R * 1.3, py = s.y + R * 0.6 + Math.cos(pa) * R * 1.3;
    g.lineStyle(3, BRASS_DARK, 1); g.lineBetween(s.x, s.y + R * 0.6, px, py);
    g.fillStyle(rim, 1); g.fillCircle(px, py, 9);
    g.fillStyle(lit(rim, 0.4), 0.7); g.fillCircle(px - 2, py - 3, 3.5);
    // The bezel ring and its twelve studs.
    g.lineStyle(3, dim(rim, 0.3), 0.9); g.strokeCircle(s.x, s.y, R * 1.38);
    g.lineStyle(1.5, lit(rim, 0.3), 0.8); g.strokeCircle(s.x, s.y, R * 1.32);
    const spin = stopped ? 0 : s.t / 3000;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + spin;
      const sx = s.x + Math.cos(a) * R * 1.38, sy = s.y + Math.sin(a) * R * 1.38;
      g.fillStyle(i === 0 ? CARD_RED : rim, 1); g.fillCircle(sx, sy, i % 3 ? 2.5 : 4);
    }
    if (stopped) {
      // Cracks across the bezel.
      g.lineStyle(1.5, 0x5a5a54, 1);
      g.lineBetween(s.x + R * 1.0, s.y - R * 0.9, s.x + R * 1.5, s.y - R * 0.4);
      g.lineBetween(s.x - R * 1.4, s.y + R * 0.3, s.x - R * 1.1, s.y + R * 0.9);
    }
    // The winding key out of his back.
    const now = s.t;
    // Whirling through the wind-up (the cast glow) and the dashes that follow it.
    const whirl = (spring && s.castGlow > 0.1) || (windingUntil > 0 && now - windingUntil < 1800);
    const keySpin = whirl ? now / 40 : stopped ? 0 : now / 900;
    const kx = s.x, ky = s.y - R * 1.15;
    g.lineStyle(5, BRASS_DARK, 1); g.lineBetween(kx, s.y - R * 0.7, kx, ky - 8);
    const bow = Math.cos(keySpin);
    for (const k of [-1, 1]) {
      g.fillStyle(rim, 1); g.fillEllipse(kx + k * 12 * bow, ky - 14, 18 * Math.max(0.25, Math.abs(bow)), 14);
      g.fillStyle(TOCK_DARK, 1); g.fillEllipse(kx + k * 12 * bow, ky - 14, 8 * Math.max(0.25, Math.abs(bow)), 6);
    }
    g.fillStyle(rim, 1); g.fillCircle(kx, ky - 14, 4);
    if (s.phaseIdx === 0) {
      // A metronome on his shoulder, ticking.
      metronome(g, s.x + R * 0.95, s.y - R * 0.45, 26, Math.sin(s.t / (BEAT / Math.PI)) * 0.5);
    } else if (spring) {
      // The mainspring coiled on his chest, tighter as he is hurt.
      g.lineStyle(2, BRASS_LIT, 0.9);
      g.beginPath();
      const turns = 3 + (1 - s.hpRatio) * 2;
      for (let k = 0; k <= 60; k++) {
        const a = (k / 60) * turns * Math.PI * 2 + s.t / 500;
        const rr = 2 + (k / 60) * R * 0.45;
        const x = s.x + Math.cos(a) * rr, y = s.y + R * 0.15 + Math.sin(a) * rr;
        if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
    } else if (stopped) {
      // A dial over his face: hands frozen at the minute time stopped.
      dial(g, s.x, s.y - R * 0.1, R * 0.42, 2.6, 0.9, 0xd8d8d0, 0x8a8a84);
    }
    if (s.enraged) { g.lineStyle(1.5, TOCK_LIT, 0.35 + Math.sin(s.t / 120) * 0.2); g.strokeCircle(s.x, s.y, R * 1.6); }
    if (stoppedUntil && s.t < stoppedUntil) { g.lineStyle(2, PAID_GREY, 0.8); g.strokeCircle(s.x, s.y, R * 1.8); }
  },

  /**
   * Inside the Regulator's case: a walnut-and-brass floor laid as a clock dial — black and red
   * setts in twelve wedges, a brass chapter ring with the hours as gilt batons, the pendulum's
   * groove scored across the floor, and the back wall a wall of wheels behind glass.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0x70c4);
    const cx = W / 2, cy = (H + TOP) / 2;
    // Walnut parquet.
    g.fillStyle(TOCK_DARK, 1); g.fillRect(0, 0, W, H);
    for (let y = TOP; y < H; y += 24) {
      for (let x = (y / 24) % 2 ? -24 : 0; x < W; x += 48) {
        g.fillStyle(((x + y) / 24) % 2 ? lit(TOCK_DARK, 0.08) : dim(TOCK_DARK, 0.1), 1); g.fillRect(x + 1, y + 1, 46, 22);
      }
    }
    // The dial: twelve wedges of black and red, a brass ring.
    const R = 250;
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2 - Math.PI / 2, a1 = a0 + Math.PI / 6;
      g.fillStyle(i % 2 ? PAVE_RED : PAVE_BLACK, 0.8);
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1, false); g.closePath(); g.fillPath();
    }
    g.lineStyle(12, BRASS_DARK, 1); g.strokeCircle(cx, cy, R);
    g.lineStyle(6, BRASS, 1); g.strokeCircle(cx, cy, R);
    g.lineStyle(2, BRASS_LIT, 0.8); g.strokeCircle(cx, cy, R - 4);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      g.lineStyle(i % 3 ? 5 : 9, GILT, 1);
      g.lineBetween(cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14), cx + Math.cos(a) * (R + 40), cy + Math.sin(a) * (R + 40));
    }
    g.fillStyle(ENAMEL, 0.9); g.fillCircle(cx, cy, 44);
    g.lineStyle(3, BRASS, 1); g.strokeCircle(cx, cy, 44);
    g.fillStyle(CARD_RED, 1); g.fillCircle(cx, cy - 30, 4);
    // The pendulum's groove across the floor.
    g.lineStyle(10, 0x000000, 0.25);
    g.beginPath(); g.arc(cx, TOP - 300, 620, Math.PI / 2 - 0.55, Math.PI / 2 + 0.55, false); g.strokePath();
    g.lineStyle(2, BRASS, 0.4);
    g.beginPath(); g.arc(cx, TOP - 300, 620, Math.PI / 2 - 0.55, Math.PI / 2 + 0.55, false); g.strokePath();
    // The back wall: wheels behind glass, under the HUD.
    g.fillStyle(dim(TOCK_DARK, 0.4), 1); g.fillRect(0, 0, W, TOP + 6);
    for (let i = 0; i < 16; i++) gear(g, 30 + i * 62 + rng() * 10, 40 + rng() * 40, 20 + rng() * 14, 12, rng() * 3, i % 3 ? BRASS : COPPER, 1, 4);
    g.fillStyle(0xcfe6ea, 0.12); g.fillRect(0, 0, W, TOP + 6);
    for (let x = 0; x <= W; x += 120) { g.fillStyle(GILT, 1); g.fillRect(x - 3, 0, 6, TOP + 8); }
    g.fillStyle(GILT, 1); g.fillRect(0, TOP + 4, W, 5);
    // Gilt pilasters down the sides.
    for (const x of [14, W - 14]) {
      g.fillStyle(BRASS_DARK, 1); g.fillRect(x - 10, TOP, 20, H - TOP);
      g.fillStyle(GILT, 1); g.fillRect(x - 6, TOP, 6, H - TOP);
      for (let y = TOP + 60; y < H; y += 120) { g.fillStyle(GILT, 1); g.fillCircle(x, y, 7); g.fillStyle(TOCK_DARK, 1); g.fillCircle(x, y, 3); }
    }
  },
};
