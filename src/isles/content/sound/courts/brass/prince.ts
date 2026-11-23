import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import type { Pt } from '../../../../IslesTypes';
import { dim, glow, lit, mulberry } from '../../../../art/IsleArt';
import { giantHorn, heraldTrumpet, hornBell, lyre, musicStand, note, stave } from './art';
import {
  BRAID, BRASS, BRASS_DARK, BRASS_DEEP, BRASS_LIT, BRASS_SHINE, BRONZE, BRONZE_DARK, CREAM, FANFARE, FANFARE_DARK,
  FANFARE_LIT, NAVY, NAVY_DARK, SCARLET, SCARLET_DARK, SCARLET_LIT, SNOW, WOOD, WOOD_DARK, WOOD_LIT,
} from './palette';
import { clamp, dist, segInfo, wrapAngle } from './util';

/**
 * Prince Fanfare, the Herald of the Hours — the Maestro's first trumpet, governor of the Brass
 * Court.
 *
 * Fanfare was born Tobias Blare, a tanner's boy with the loudest voice on the terrace. When he
 * was nine his mother sang at Vespers in her own key, because she liked it better, and the
 * Tuners took her voice up to the Organ. That year the Maestro gave the boy a trumpet. He has
 * played it louder every year since — so loud, at Compline, that nobody in the Brass Court can
 * hear the Organ. Least of all him. He fights like a parade:
 *
 * • **Herald** (stalking, marching on you): he raises a long herald trumpet and blasts fans of
 *   three beams that flare at the end like a bell; and he plays a flourish, a rising run of notes
 *   that trill side to side as they come.
 * • **Brass Section** (anchored, the gold tint): four horns rise at the corners and play. Five
 *   stave-lines are strung across the arena and the notes ride along them — the gaps between
 *   the lines are safe, until the key changes and the stave shifts. Between bars he gives the
 *   tuba's two beats: a slow OOM ring with a gap in it, and a PAH of brass flecks.
 * • **Sforzando** (hard, blinking): sudden huge blasts. A beat of utter quiet — the room goes
 *   dark and still — then a ring that hurls you back, then a run of tiny quick ones toward you.
 */

const TOP = 96;

// ── Signature: Herald ────────────────────────────────────────────────
// Two fans of three beams. Each beam is traced first as a flaring outline — narrow at his
// trumpet, wide as a bell at its end — then fires. The second fan splits the first's gaps.

interface Beam { a: number; ox: number; oy: number; warnAt: number; fireAt: number; dealt: boolean }

const BEAM_LEN = 900;
const beamHalf = (t: number) => 12 + 40 * Math.pow(t, 2.2);

const herald = (tk: BossToolkit): SignatureMove => {
  let beams: Beam[] = [];
  const outline = (b: Beam): Pt[] => {
    const ca = Math.cos(b.a), sa = Math.sin(b.a);
    const L: Pt[] = [], R: Pt[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, w = beamHalf(t);
      const x = b.ox + ca * BEAM_LEN * t, y = b.oy + sa * BEAM_LEN * t;
      L.push({ x: x - sa * w, y: y + ca * w }); R.push({ x: x + sa * w, y: y - ca * w });
    }
    return [...L, ...R.reverse()];
  };
  return {
    durationMs: 2300,
    windupMs: 560,
    gesture: 'raise',
    hold: 'draw',
    tell: 'HEAR YE',
    cast(time) {
      const base = tk.angleToPlayer();
      const spread = tk.hard ? 0.36 : 0.42;
      beams = [];
      for (let v = 0; v < 2; v++) {
        for (let k = -1; k <= 1; k++) {
          const a = base + k * spread + (v === 1 ? spread / 2 : 0);
          beams.push({ a, ox: tk.bossX, oy: tk.bossY, warnAt: time + v * 620, fireAt: time + tk.warn(900) + v * 620, dealt: false });
        }
      }
      tk.sfx('beam-charge');
    },
    update(time) {
      const p = tk.player;
      for (const b of beams) {
        if (b.dealt || time < b.fireAt) continue;
        b.dealt = true;
        if (b === beams[0] || b === beams[3]) { tk.sfx('train-horn'); tk.sfx('light-beam'); }
        if (!p.active || p.hp <= 0) continue;
        const ex = b.ox + Math.cos(b.a) * BEAM_LEN, ey = b.oy + Math.sin(b.a) * BEAM_LEN;
        const { d, t } = segInfo(p.x, p.y, b.ox, b.oy, ex, ey);
        if (d < beamHalf(t) + 16) tk.hitPlayer(14, p.x, p.y);
      }
      beams = beams.filter((b) => !b.dealt || time < b.fireAt + 420);
    },
    drawGround(g, time) {
      for (const b of beams) {
        if (time < b.warnAt) continue;
        const pts = outline(b);
        if (!b.dealt) {
          const k = clamp((time - b.warnAt) / Math.max(1, b.fireAt - b.warnAt), 0, 1);
          g.fillStyle(FANFARE_LIT, 0.05 + k * 0.12); g.fillPoints(pts, true);
          g.lineStyle(1.5 + k * 1.5, FANFARE_LIT, 0.35 + k * 0.5); g.strokePoints(pts, true);
          // The bell-rim at the end of each beam, drawn as an ellipse of light.
          const ex = b.ox + Math.cos(b.a) * BEAM_LEN * 0.98, ey = b.oy + Math.sin(b.a) * BEAM_LEN * 0.98;
          g.lineStyle(2, BRASS_SHINE, 0.3 + k * 0.4); g.strokeCircle(ex, ey, beamHalf(1) * 0.6);
        }
      }
    },
    drawAir(g, time) {
      for (const b of beams) {
        if (!b.dealt) continue;
        const k = clamp((time - b.fireAt) / 420, 0, 1);
        const pts = outline(b);
        g.fillStyle(FANFARE_LIT, 0.55 * (1 - k)); g.fillPoints(pts, true);
        g.lineStyle(3, 0xffffff, 0.7 * (1 - k)); g.lineBetween(b.ox, b.oy, b.ox + Math.cos(b.a) * BEAM_LEN, b.oy + Math.sin(b.a) * BEAM_LEN);
        // Rings of sound marching down the beam.
        for (let r = 0; r < 5; r++) {
          const t = ((r / 5) + k * 0.6) % 1;
          const x = b.ox + Math.cos(b.a) * BEAM_LEN * t, y = b.oy + Math.sin(b.a) * BEAM_LEN * t;
          g.lineStyle(2, BRASS_SHINE, 0.6 * (1 - k)); g.strokeCircle(x, y, beamHalf(t) * 0.8);
        }
      }
    },
    onPhaseEnd() { beams = []; },
  };
};

// ── Signature: Flourish ──────────────────────────────────────────────
// A run of eight notes up the scale and back down, each one faster than the last, trilling
// side to side as it comes so its path is a wave you can read.

interface Trill { x: number; y: number; a: number; speed: number; bornAt: number; at: number; phase: number; dealt: boolean; ox: number; oy: number }

const flourish = (tk: BossToolkit): SignatureMove => {
  let notes: Trill[] = [];
  return {
    durationMs: 1900,
    windupMs: 480,
    gesture: 'point',
    hold: 'draw',
    tell: 'FLOURISH',
    cast(time) {
      notes = [];
      const n = tk.hard ? 10 : 8;
      for (let i = 0; i < n; i++) {
        const up = i < n / 2 ? i : n - 1 - i;
        notes.push({
          x: tk.bossX, y: tk.bossY, ox: tk.bossX, oy: tk.bossY, a: 0, speed: 210 + up * 34, bornAt: -1, at: time + i * 130, phase: i * 0.9, dealt: false,
        });
      }
      tk.sfx('crystal-chime');
    },
    update(time) {
      const p = tk.player;
      for (const n of notes) {
        if (time < n.at) continue;
        if (n.bornAt < 0) {
          n.bornAt = time; n.ox = tk.bossX; n.oy = tk.bossY;
          n.a = tk.angleToPlayer(n.ox, n.oy);
          tk.sfx('hit-light');
        }
        const age = (time - n.bornAt) / 1000;
        const along = age * n.speed;
        const side = Math.sin(age * 9 + n.phase) * 30 * Math.min(1, age * 3);
        n.x = n.ox + Math.cos(n.a) * along - Math.sin(n.a) * side;
        n.y = n.oy + Math.sin(n.a) * along + Math.cos(n.a) * side;
        if (!n.dealt && p.active && p.hp > 0 && dist(n.x, n.y, p.x, p.y) < 30) { n.dealt = true; tk.hitPlayer(7, p.x, p.y); }
      }
      notes = notes.filter((n) => n.bornAt < 0 || (!n.dealt && time - n.bornAt < 3200 && n.x > -40 && n.x < tk.W + 40 && n.y > TOP - 40 && n.y < tk.H + 40));
    },
    drawAir(g, time) {
      for (const n of notes) {
        if (n.bornAt < 0) continue;
        // The ribbon of its trill behind it.
        g.lineStyle(2, FANFARE_LIT, 0.35);
        g.beginPath();
        for (let k = 0; k <= 8; k++) {
          const age = Math.max(0, (time - n.bornAt) / 1000 - k * 0.025);
          const along = age * n.speed;
          const side = Math.sin(age * 9 + n.phase) * 30 * Math.min(1, age * 3);
          const x = n.ox + Math.cos(n.a) * along - Math.sin(n.a) * side, y = n.oy + Math.sin(n.a) * along + Math.cos(n.a) * side;
          if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
        glow(g, n.x, n.y, 14, FANFARE_LIT, 0.07, 2);
        note(g, n.x - 4, n.y + 6, 6.5, FANFARE_LIT, 'semi', 1);
      }
    },
    onPhaseEnd() { notes = []; },
  };
};

// ── Signature: Brass Section ─────────────────────────────────────────
// Four horns rise at the corners; five stave-lines are strung across the arena; notes ride the
// lines from the horns. Halfway the key changes — arrows show it — and the stave shifts by
// half a gap. Stand between the lines.

interface Rider { line: number; x: number; dir: number; dealt: boolean }

const section = (tk: BossToolkit): SignatureMove => {
  let startAt = -1;
  let riders: Rider[] = [];
  let nextSpawn: number[] = [];
  const LINES = 5;
  const WARN = 1000;
  const PLAY = 4600;
  const SHIFT_AT = 2200;
  const SHIFT_MS = 600;
  // Lines are spaced so that after the half-gap shift the bottom line sits just above the floor.
  const gap = () => (tk.H - 30 - (TOP + 40)) / (LINES - 0.5);
  const shiftK = (time: number) => clamp((time - startAt - WARN - SHIFT_AT) / SHIFT_MS, 0, 1);
  const lineY = (i: number, time: number) => TOP + 40 + (i + 0.5 * shiftK(time)) * gap();
  const live = (time: number) => startAt >= 0 && time < startAt + WARN + PLAY + 600;
  return {
    durationMs: 5200,
    windupMs: 600,
    gesture: 'raise',
    hold: 'conduct',
    locksBody: true,
    tell: 'BRASS SECTION',
    cast(time) {
      startAt = time;
      riders = [];
      nextSpawn = Array.from({ length: LINES }, (_, i) => time + tk.warn(WARN) + i * 160);
      tk.sfx('boss-phase');
    },
    update(time, dt) {
      if (!live(time)) { if (startAt >= 0 && time > startAt + WARN + PLAY + 600) { startAt = -1; riders = []; } return; }
      const p = tk.player;
      const playing = time >= startAt + tk.warn(WARN) && time < startAt + WARN + PLAY;
      const shifting = time > startAt + WARN + SHIFT_AT - 500 && time < startAt + WARN + SHIFT_AT + SHIFT_MS + 300;
      if (playing && !shifting) {
        for (let i = 0; i < LINES; i++) {
          if (time < nextSpawn[i]) continue;
          nextSpawn[i] = time + (tk.hard ? 380 : 460) + (i % 2) * 90;
          const dir = i % 2 ? -1 : 1;
          riders.push({ line: i, x: dir > 0 ? 40 : tk.W - 40, dir, dealt: false });
          if (i === 0) tk.sfx('hit-light');
        }
      }
      if (time > startAt + WARN + SHIFT_AT - 500 && time < startAt + WARN + SHIFT_AT - 480) tk.sfx('time-warp');
      for (const r of riders) {
        r.x += r.dir * 300 * dt;
        if (r.dealt || !p.active || p.hp <= 0) continue;
        const y = lineY(r.line, time);
        if (Math.abs(p.y - y) < 20 && Math.abs(p.x - r.x) < 30) { r.dealt = true; tk.hitPlayer(10, p.x, p.y); }
      }
      riders = riders.filter((r) => r.x > -20 && r.x < tk.W + 20);
    },
    drawGround(g, time) {
      if (!live(time)) return;
      const k = clamp((time - startAt) / WARN, 0, 1);
      for (let i = 0; i < LINES; i++) {
        const y = lineY(i, time);
        g.lineStyle(3, NAVY_DARK, 0.25 * k); g.lineBetween(0, y + 2, tk.W, y + 2);
        g.lineStyle(2 + k, FANFARE_LIT, 0.25 + k * 0.5); g.lineBetween(tk.W * (0.5 - k * 0.5), y, tk.W * (0.5 + k * 0.5), y);
      }
      // A treble clef stand-in at the left: a brass scroll curling over the stave.
      const y0 = lineY(0, time), y4 = lineY(LINES - 1, time);
      g.lineStyle(4, BRASS, 0.6 * k);
      g.beginPath(); g.arc(70, (y0 + y4) / 2, (y4 - y0) * 0.22, 0, Math.PI * 1.8, false); g.strokePath();
      g.lineBetween(70 + (y4 - y0) * 0.22, (y0 + y4) / 2, 76, y0 - 10);
      // The key change: arrows down the gaps, a beat before the stave shifts.
      const ks = time - (startAt + WARN + SHIFT_AT - 600);
      if (ks > 0 && ks < 600 + SHIFT_MS) {
        for (let i = 0; i < LINES - 1; i++) {
          for (let c = 0; c < 5; c++) {
            const x = 140 + c * ((tk.W - 280) / 4), y = lineY(i, time) + gap() * 0.25;
            g.fillStyle(SCARLET_LIT, 0.5 + Math.sin(time / 80) * 0.3);
            g.fillTriangle(x - 8, y - 6, x + 8, y - 6, x, y + 8);
          }
        }
      }
    },
    drawAir(g, time) {
      if (!live(time)) return;
      const rise = clamp((time - startAt) / WARN, 0, 1);
      // The four horns at the corners, rising up out of the floor as the stave is strung.
      const R = 22 + rise * 12;
      giantHorn(g, 30, TOP + 30, 0.6, R, rise);
      giantHorn(g, tk.W - 30, TOP + 30, Math.PI - 0.6, R, rise);
      giantHorn(g, 30, tk.H - 26, -0.6, R, rise);
      giantHorn(g, tk.W - 30, tk.H - 26, Math.PI + 0.6, R, rise);
      for (const r of riders) {
        const y = lineY(r.line, time);
        glow(g, r.x, y, 16, FANFARE_LIT, 0.06, 2);
        note(g, r.x - 5, y + 4, 7, r.line % 2 ? SCARLET_LIT : FANFARE_LIT, r.line % 2 ? 'crotchet' : 'quaver', 1);
      }
    },
    onPhaseEnd() { startAt = -1; riders = []; },
  };
};

// ── Signature: Oompah ────────────────────────────────────────────────
// The tuba's two beats, three bars of them. OOM: a slow thick bronze ring rolls out from him,
// with a gap in it. PAH: a burst of brass flecks, the gap left clear. The gap drifts each bar.

interface OomRing { at: number; gapA: number; hitDone: boolean }
interface Fleck { x: number; y: number; vx: number; vy: number; bornAt: number; dealt: boolean }

const oompah = (tk: BossToolkit): SignatureMove => {
  let rings: OomRing[] = [];
  let flecks: Fleck[] = [];
  let pahs: { at: number; gapA: number; done: boolean }[] = [];
  let ox = 0, oy = 0;
  const SPEED = 240, BAND = 18, GAP = 0.46;
  return {
    durationMs: 3000,
    windupMs: 600,
    gesture: 'flex',
    hold: 'brace',
    tell: 'OOM-PAH',
    cast(time) {
      ox = tk.bossX; oy = tk.bossY;
      const pa = tk.angleToPlayer();
      const side = Math.random() < 0.5 ? 1 : -1;
      rings = []; pahs = []; flecks = [];
      for (let b = 0; b < 3; b++) {
        const gapA = pa + side * (0.62 - b * 0.18);
        const at = time + tk.warn(700) + b * 820;
        rings.push({ at, gapA, hitDone: false });
        pahs.push({ at: at + 380, gapA, done: false });
      }
      tk.sfx('drum-hit');
    },
    update(time, dt) {
      const p = tk.player;
      for (const r of rings) {
        if (time < r.at || r.hitDone) continue;
        if (time - r.at < 30) tk.sfx('quake');
        const rad = ((time - r.at) / 1000) * SPEED;
        if (!p.active || p.hp <= 0) continue;
        const d = dist(p.x, p.y, ox, oy);
        if (Math.abs(d - rad) < BAND + 18) {
          const off = Math.abs(wrapAngle(Math.atan2(p.y - oy, p.x - ox) - r.gapA));
          if (off > GAP) { r.hitDone = true; tk.hitPlayer(12, p.x, p.y); }
        }
        if (rad > 1100) r.hitDone = true;
      }
      for (const ph of pahs) {
        if (ph.done || time < ph.at) continue;
        ph.done = true;
        tk.sfx('hit-medium');
        const n = 14;
        for (let i = 0; i < n; i++) {
          const a = ph.gapA + Math.PI * 2 * (i / n);
          if (Math.abs(wrapAngle(a - ph.gapA)) < GAP) continue;
          flecks.push({ x: ox, y: oy, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, bornAt: time, dealt: false });
        }
      }
      for (const f of flecks) {
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (!f.dealt && p.active && p.hp > 0 && dist(f.x, f.y, p.x, p.y) < 26) { f.dealt = true; tk.hitPlayer(6, p.x, p.y); }
      }
      flecks = flecks.filter((f) => !f.dealt && time - f.bornAt < 4000);
      rings = rings.filter((r) => time < r.at + 5000);
    },
    drawGround(g, time) {
      for (const r of rings) {
        if (time < r.at) {
          // The breath: a dark ring drawn in at his feet, and the gap marked in gold.
          const k = clamp(1 - (r.at - time) / 700, 0, 1);
          if (k <= 0) continue;
          g.lineStyle(4, BRONZE_DARK, 0.25 + k * 0.4); g.strokeCircle(ox, oy, 60 - k * 20);
          g.lineStyle(4, BRASS_LIT, 0.4 + k * 0.4);
          g.beginPath(); g.arc(ox, oy, 74, r.gapA - GAP, r.gapA + GAP, false); g.strokePath();
          continue;
        }
        const rad = ((time - r.at) / 1000) * SPEED;
        if (rad > 1100) continue;
        g.lineStyle(BAND * 2, BRONZE, 0.5);
        g.beginPath(); g.arc(ox, oy, rad, r.gapA + GAP, r.gapA - GAP + Math.PI * 2, false); g.strokePath();
        g.lineStyle(4, lit(BRONZE, 0.3), 0.8);
        g.beginPath(); g.arc(ox, oy, rad + BAND - 2, r.gapA + GAP, r.gapA - GAP + Math.PI * 2, false); g.strokePath();
        g.lineStyle(2, BRONZE_DARK, 0.8);
        g.beginPath(); g.arc(ox, oy, rad - BAND + 2, r.gapA + GAP, r.gapA - GAP + Math.PI * 2, false); g.strokePath();
      }
    },
    drawAir(g) {
      for (const f of flecks) {
        const a = Math.atan2(f.vy, f.vx);
        g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(f.x - Math.cos(a) * 9, f.y - Math.sin(a) * 9, f.x + Math.cos(a) * 6, f.y + Math.sin(a) * 6);
        g.lineStyle(2, BRASS_SHINE, 1); g.lineBetween(f.x - Math.cos(a) * 7, f.y - Math.sin(a) * 7, f.x + Math.cos(a) * 5, f.y + Math.sin(a) * 5);
      }
    },
    onPhaseEnd() { rings = []; flecks = []; pahs = []; },
  };
};

// ── Signature: Sforzando ─────────────────────────────────────────────
// A beat of utter quiet: the room goes dark, the reach of what's coming is barely drawn. Then a
// huge ring that hurls you back. Then a run of tiny staccato blasts stepping toward where you were.

interface Stacc { x: number; y: number; at: number; warnAt: number; dealt: boolean }

const sforzando = (tk: BossToolkit): SignatureMove => {
  let quietAt = -1;
  let blastAt = -1;
  let blastHit = false;
  let ox = 0, oy = 0;
  let stacc: Stacc[] = [];
  const REACH = 340;
  return {
    durationMs: 3200,
    windupMs: 300,
    gesture: 'clap',
    hold: 'brace',
    tell: 'sfz',
    cast(time) {
      quietAt = time;
      blastAt = time + tk.warn(1100);
      blastHit = false;
      ox = tk.bossX; oy = tk.bossY;
      stacc = [];
      tk.sfx('hush');
    },
    update(time) {
      const p = tk.player;
      if (blastAt < 0) return;
      if (time >= blastAt && !blastHit) {
        const rad = ((time - blastAt) / 380) * REACH;
        if (time - blastAt < 40 && stacc.length === 0) {
          tk.sfx('explosion-large'); tk.sfx('sonic-pulse');
          // The staccato run is laid out now, toward where you stand.
          const a = tk.angleToPlayer(ox, oy);
          for (let i = 0; i < 6; i++) {
            const d = 120 + i * 72;
            const x = clamp(ox + Math.cos(a) * d, 40, tk.W - 40), y = clamp(oy + Math.sin(a) * d, TOP + 30, tk.H - 30);
            stacc.push({ x, y, warnAt: time + 200, at: time + 200 + tk.warn(440) + i * 130, dealt: false });
          }
        }
        if (p.active && p.hp > 0) {
          const d = dist(p.x, p.y, ox, oy);
          if (d < REACH && d < rad + 20) {
            blastHit = true;
            tk.hitPlayer(18, p.x, p.y);
            const a = Math.atan2(p.y - oy, p.x - ox);
            tk.pull(p.x + Math.cos(a) * 600, p.y + Math.sin(a) * 600, 130, 900);
          }
        }
        if (rad >= REACH) blastHit = true;
      }
      for (const s of stacc) {
        if (s.dealt || time < s.at) continue;
        s.dealt = true;
        tk.sfx('hit-light');
        if (p.active && p.hp > 0 && dist(p.x, p.y, s.x, s.y) < 46 + 18) tk.hitPlayer(7, p.x, p.y);
      }
      stacc = stacc.filter((s) => !s.dealt || time < s.at + 260);
      if (time > blastAt + 3000) { blastAt = -1; quietAt = -1; }
    },
    drawGround(g, time) {
      if (quietAt >= 0 && time < blastAt) {
        // Utter quiet: the room dims and its edge is only just drawn.
        const k = clamp((time - quietAt) / Math.max(1, blastAt - quietAt), 0, 1);
        g.fillStyle(NAVY_DARK, 0.15 + k * 0.25); g.fillRect(0, TOP, tk.W, tk.H - TOP);
        g.lineStyle(1.5, CREAM, 0.15 + k * 0.25); g.strokeCircle(ox, oy, REACH);
        g.fillStyle(SCARLET, 0.04 + k * 0.06); g.fillCircle(ox, oy, REACH);
      }
      for (const s of stacc) {
        if (time < s.warnAt) continue;
        if (!s.dealt) {
          const k = clamp((time - s.warnAt) / Math.max(1, s.at - s.warnAt), 0, 1);
          g.lineStyle(2, SCARLET_LIT, 0.4 + k * 0.5); g.strokeCircle(s.x, s.y, 46);
          // An accent mark (>) in the circle.
          g.lineStyle(3, SCARLET_LIT, 0.4 + k * 0.5);
          g.lineBetween(s.x - 14, s.y - 10, s.x + 12, s.y); g.lineBetween(s.x + 12, s.y, s.x - 14, s.y + 10);
        } else {
          const k = clamp((time - s.at) / 260, 0, 1);
          g.fillStyle(SCARLET_LIT, 0.5 * (1 - k)); g.fillCircle(s.x, s.y, 46 * (0.5 + k * 0.5));
        }
      }
    },
    drawAir(g, time) {
      if (blastAt < 0 || time < blastAt) return;
      const k = clamp((time - blastAt) / 380, 0, 1);
      if (k >= 1 && time - blastAt > 600) return;
      const rad = k * REACH;
      const fade = clamp(1 - (time - blastAt - 380) / 220, 0, 1);
      g.lineStyle(16, FANFARE_LIT, 0.6 * fade); g.strokeCircle(ox, oy, rad);
      g.lineStyle(5, 0xffffff, 0.8 * fade); g.strokeCircle(ox, oy, rad);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        g.lineStyle(3, BRASS_SHINE, 0.6 * fade); g.lineBetween(ox + Math.cos(a) * rad * 0.6, oy + Math.sin(a) * rad * 0.6, ox + Math.cos(a) * rad, oy + Math.sin(a) * rad);
      }
    },
    onPhaseEnd() { quietAt = -1; blastAt = -1; stacc = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const FANFARE_BOSS: WorldBossDef = {
  worldId: 'isle:fanfare',
  name: 'Prince Fanfare',
  title: 'the Herald of the Hours',
  color: FANFARE,
  colorLit: FANFARE_LIT,
  colorDark: FANFARE_DARK,
  accent: SCARLET,
  // Tier 1 of the ninth isle.
  damageMult: 1.25,

  intro: [
    'TA-RAAA! Stand for the Prince of the Brass! Stand, I said — every head on this terrace stands when I sound!',
    'You walked up my Parade out of step and talking. TALKING. Between the Hours. Let me drown you out.',
  ],
  banter: [
    'LOUDER! The Maestro likes it LOUD!',
    'Every Hour, I call it first. Every Hour, the isle stands up. That\'s what a herald is for!',
    'A trumpet doesn\'t listen. That\'s the beauty of it. It only plays.',
    'Can you hear the Organ? No? GOOD. Neither can I.',
    'Left, right! Left, right! The whole isle in step — isn\'t it glorious?',
  ],
  defeatLine: 'THE LAST POST',
  resumeLine: 'Back again! You\'ve got lungs, stranger, I\'ll grant you. FALL IN!',

  phases: [
    {
      name: 'Herald',
      line: 'Hear ye, hear ye! By order of the Maestro — STAND STILL AND BE BLOWN AWAY!',
      hp: 510,
      cycle: [
        'sig:herald', 'volley', 'sig:flourish', 'lanes', 'sig:herald',
        'radial', 'sig:flourish', 'homing', 'sig:herald', 'charge',
      ],
      harass: ['h-snipe', 'h-lane'],
      restMs: 1200,
      harassMs: 3300,
    },
    {
      name: 'Brass Section',
      line: 'The full section! Horns to the corners! Every line of the stave is MINE!',
      hp: 590,
      cycle: [
        'sig:section', 'sig:oompah', 'volley', 'sig:herald', 'sig:section',
        'barrage', 'sig:oompah', 'sig:flourish', 'spiral',
      ],
      harass: ['h-flak', 'h-orbs'],
      restMs: 1100,
      harassMs: 2900,
    },
  ],

  hard: {
    introLine: 'SFORZANDO — SUDDENLY, LOUDLY',
    extraPhase: {
      name: 'Sforzando',
      line: '...Shh. Can you hear that? That\'s the Organ. That\'s — NO. NO! LOUDER!',
      hp: 430,
      cycle: [
        'sig:sforzando', 'sig:flourish', 'sig:oompah', 'sweep',
        'sig:sforzando', 'sig:herald', 'minefield', 'sig:section',
      ],
      harass: ['h-rune', 'h-mines'],
      restMs: 950,
      harassMs: 2600,
    },
  },

  tuning: {
    volley: { count: 5, speed: 240, spreadRad: 0.5 },
    radial: { count: 16, speed: 190 },
    lanes: { count: 3, warnMs: 900 },
    spiral: { arms: 4, speed: 175 },
    charge: { warnMs: 900, halfW: 30 },
  },

  signatures: {
    herald,
    flourish,
    section,
    oompah,
    sforzando,
  },

  look: {
    crest: 'none', pattern: 'plates', aura: 'sparks', hands: 'gauntlet',
    torsoR: 34, mouth: 'line', eyes: 2, eyeColor: FANFARE_LIT,
  },
  phaseStyles: [
    { movement: 'stalk', gimmick: 'none' },
    { movement: 'anchor', gimmick: 'none', tint: 'gold', look: { aura: 'coins', mouth: 'grin' } },
    { movement: 'blink', gimmick: 'none', tint: 'pale', look: { aura: 'smoke', mouth: 'maw', pattern: 'rings' } },
  ],

  /**
   * The Herald's silhouette: a tall navy bandmaster's shako banded in gold braid with a brass
   * lyre badge and a scarlet-and-white plume, gold-fringed epaulettes, a cream cross-belt. In
   * Herald he carries the long trumpet with its scarlet tabard, its bell glowing as he casts;
   * in Brass Section a great sousaphone coils round him with its bell over his shoulder; in
   * Sforzando the trumpet is gone and he holds a pair of crash cymbals, a scarlet accent mark
   * (>) burning on his chest.
   */
  drawDecor(g, s) {
    const R = s.radius;
    const sousa = s.phaseIdx === 1;
    const sfz = s.hard && s.phaseIdx >= 2;
    // Cross-belt.
    g.lineStyle(R * 0.16, BRAID, 0.95);
    g.lineBetween(s.x - R * 0.7, s.y - R * 0.55, s.x + R * 0.6, s.y + R * 0.6);
    g.fillStyle(BRASS_LIT, 1); g.fillCircle(s.x - R * 0.05, s.y + R * 0.02, R * 0.1);
    // Epaulettes with gold fringe.
    for (const k of [-1, 1]) {
      const ex = s.x + k * R * 0.86, ey = s.y - R * 0.5;
      g.fillStyle(BRASS_DARK, 1); g.fillEllipse(ex, ey + 1, R * 0.62, R * 0.3);
      g.fillStyle(BRASS, 1); g.fillEllipse(ex, ey, R * 0.56, R * 0.24);
      for (let i = -3; i <= 3; i++) {
        g.lineStyle(1.5, BRASS_LIT, 1);
        g.lineBetween(ex + i * R * 0.07, ey + R * 0.08, ex + i * R * 0.08 + Math.sin(s.t / 200 + i) * 1.2, ey + R * 0.3);
      }
    }
    // The shako.
    const hx = s.x, hy = s.y - R * 0.88;
    const hh = R * 0.95, hw = R * 0.9;
    g.fillStyle(NAVY_DARK, 1); g.fillRect(hx - hw / 2 - 2, hy - hh, hw + 4, hh);
    g.fillStyle(NAVY, 1); g.fillRect(hx - hw / 2, hy - hh, hw, hh - 2);
    g.fillStyle(NAVY_DARK, 1); g.fillEllipse(hx, hy - hh, hw + 4, R * 0.24);
    g.fillStyle(lit(NAVY, 0.15), 1); g.fillEllipse(hx, hy - hh, hw, R * 0.18);
    for (const by of [hy - R * 0.12, hy - hh + R * 0.12]) { g.fillStyle(BRASS_DARK, 1); g.fillRect(hx - hw / 2, by - 2, hw, 5); g.fillStyle(BRASS_LIT, 1); g.fillRect(hx - hw / 2, by - 2, hw, 2); }
    // Gold braid looping across the front.
    g.lineStyle(1.5, BRASS_LIT, 1);
    g.beginPath(); g.arc(hx, hy - hh * 0.55, hw * 0.42, 0.2, Math.PI - 0.2, false); g.strokePath();
    lyre(g, hx, hy - hh * 0.5, R * 0.16, sfz ? SCARLET_LIT : BRASS_LIT);
    // The peak.
    g.fillStyle(0x0a0e1c, 1); g.fillEllipse(hx, hy + 2, hw + 10, R * 0.2);
    g.fillStyle(lit(NAVY_DARK, 0.25), 1); g.fillEllipse(hx - 2, hy, hw * 0.6, R * 0.08);
    // The plume: scarlet over white, nodding.
    const nod = Math.sin(s.t / 260) * 3;
    g.fillStyle(SNOW, 1); g.fillEllipse(hx + nod * 0.5, hy - hh - R * 0.35, R * 0.26, R * 0.7);
    g.fillStyle(SCARLET, 1); g.fillEllipse(hx + nod, hy - hh - R * 0.62, R * 0.22, R * 0.5);
    g.fillStyle(SCARLET_LIT, 0.6); g.fillEllipse(hx + nod - 2, hy - hh - R * 0.7, R * 0.08, R * 0.3);

    const h0 = s.hands[0], h1 = s.hands[1];
    if (sfz) {
      // Crash cymbals in both hands, a burning accent mark on the chest.
      for (const h of [h0, h1]) {
        if (!h) continue;
        const sep = s.castGlow * 6;
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(h.x, h.y - 2 - sep, R * 0.9, R * 0.28);
        g.fillStyle(BRASS, 1); g.fillEllipse(h.x, h.y - 3 - sep, R * 0.84, R * 0.22);
        g.lineStyle(1, BRASS_SHINE, 0.8); g.strokeEllipse(h.x, h.y - 3 - sep, R * 0.5, R * 0.12);
        g.fillStyle(BRASS_DEEP, 1); g.fillCircle(h.x, h.y - 3 - sep, 2.5);
      }
      g.lineStyle(4, SCARLET_LIT, 0.7 + Math.sin(s.t / 90) * 0.3);
      g.lineBetween(s.x - R * 0.35, s.y - R * 0.1, s.x + R * 0.3, s.y + R * 0.15);
      g.lineBetween(s.x + R * 0.3, s.y + R * 0.15, s.x - R * 0.35, s.y + R * 0.4);
    } else if (sousa) {
      // The great sousaphone coiled round him, bell over the left shoulder.
      g.lineStyle(R * 0.3, BRASS_DARK, 1); g.strokeEllipse(s.x, s.y + R * 0.15, R * 2.3, R * 1.5);
      g.lineStyle(R * 0.2, BRASS, 1); g.strokeEllipse(s.x, s.y + R * 0.15, R * 2.3, R * 1.5);
      g.lineStyle(2, BRASS_SHINE, 0.6);
      g.beginPath(); g.arc(s.x, s.y + R * 0.15, R * 1.15, Math.PI * 1.05, Math.PI * 1.5, false); g.strokePath();
      for (let i = 0; i < 3; i++) {
        const vx = s.x + R * 0.55 + i * R * 0.18, vy = s.y + R * 0.75;
        g.fillStyle(BRASS_DARK, 1); g.fillRect(vx - 3, vy - 10, 6, 14);
        g.fillStyle(CREAM, 1); g.fillCircle(vx, vy - 12, 2.5);
      }
      hornBell(g, s.x - R * 0.95, s.y - R * 1.55, -Math.PI / 2 - 0.5, R * 0.78 + s.castGlow * 4, R * 0.9, BRASS, s.castGlow);
    } else if (h0) {
      // The long herald trumpet, pointed where he looks.
      const a = s.facing;
      heraldTrumpet(g, h0.x, h0.y, a, R * 1.6, 1.15, SCARLET, s.castGlow);
      if (s.castGlow > 0.3) glow(g, h0.x + Math.cos(a) * R * 1.6, h0.y + Math.sin(a) * R * 1.6, 22, FANFARE_LIT, 0.07 * s.castGlow, 3);
    }
    // His tuning-reed, pinned at the collar like everyone's.
    g.fillStyle(BRASS_LIT, 1); g.fillRect(s.x - 2, s.y - R * 0.72, 4, R * 0.24);
    g.fillStyle(NAVY_DARK, 1); g.fillRect(s.x - 0.5, s.y - R * 0.7, 1, R * 0.18);
    if (s.enraged) { g.lineStyle(2, SCARLET_LIT, 0.35 + Math.sin(s.t / 110) * 0.2); g.strokeCircle(s.x, s.y, R * 1.5); }
    void h1;
  },

  /**
   * The Bandhall floor: honey parquet laid in herringbone, a crimson carpet runner up the
   * middle to a dais of music stands under the HUD, the great lyre inlaid in brass at the
   * centre inside a ring of notes, and the gilt bells of the hall's horn-pillars along both
   * walls.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xfa4fa2);
    // Herringbone parquet.
    const bw = 40, bh = 12;
    for (let y = 90; y < H + bh; y += bh) {
      for (let x = -bw; x < W + bw; x += bw) {
        const off = (Math.floor((y - 90) / bh) % 2) * (bw / 2);
        const c = [WOOD_LIT, lit(WOOD_LIT, 0.08), dim(WOOD_LIT, 0.08)][(Math.floor(x / bw) + Math.floor(y / bh)) % 3];
        g.fillStyle(c, 1);
        g.fillPoints([{ x: x + off, y }, { x: x + off + bw / 2, y: y - bh / 2 }, { x: x + off + bw, y }, { x: x + off + bw / 2, y: y + bh / 2 }], true);
      }
    }
    for (let i = 0; i < 90; i++) { g.fillStyle(WOOD, 0.25); g.fillRect(rng() * W, 100 + rng() * (H - 100), 8, 1); }
    // Crimson runner.
    g.fillStyle(SCARLET_DARK, 1); g.fillRect(W / 2 - 64, 100, 128, H - 100);
    g.fillStyle(SCARLET, 1); g.fillRect(W / 2 - 58, 100, 116, H - 100);
    g.lineStyle(2, BRASS, 0.8); g.lineBetween(W / 2 - 52, 100, W / 2 - 52, H); g.lineBetween(W / 2 + 52, 100, W / 2 + 52, H);
    // The dais under the HUD with its row of stands.
    g.fillStyle(WOOD_DARK, 1); g.fillRect(0, 70, W, 34);
    g.fillStyle(WOOD, 1); g.fillRect(0, 70, W, 28);
    g.fillStyle(BRASS, 1); g.fillRect(0, 96, W, 3);
    for (let x = 50; x < W; x += 70) musicStand(g, x, 96, 0.8);
    stave(g, 0, 20, W, 8, BRASS_DARK, 0.3, 2);
    // The inlaid lyre in its ring of notes.
    const cx = W / 2, cy = (H + 100) / 2;
    g.fillStyle(dim(SCARLET, 0.2), 1); g.fillCircle(cx, cy, 120);
    g.lineStyle(6, BRASS_DARK, 1); g.strokeCircle(cx, cy, 120);
    g.lineStyle(3, BRASS_LIT, 1); g.strokeCircle(cx, cy, 120);
    lyre(g, cx, cy + 14, 52, BRASS);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      note(g, cx + Math.cos(a) * 150 - 3, cy + Math.sin(a) * 150 + 6, 5, BRASS_DARK, i % 2 ? 'quaver' : 'crotchet', 0.6);
    }
    // Horn-pillars down both walls: brass bells turned to the room.
    for (let y = 170; y < H - 40; y += 140) {
      hornBell(g, 26, y, 0.2, 18, 26, BRASS);
      hornBell(g, W - 26, y + 70, Math.PI - 0.2, 18, 26, BRASS);
    }
    // Warm light from the tall windows, in slanting bars.
    for (let i = 0; i < 6; i++) { g.fillStyle(0xfff0c0, 0.05); g.fillPoints([{ x: 80 + i * 160, y: 100 }, { x: 140 + i * 160, y: 100 }, { x: 260 + i * 160, y: H }, { x: 200 + i * 160, y: H }], true); }
  },
};
