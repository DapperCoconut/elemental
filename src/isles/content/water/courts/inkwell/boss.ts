import Phaser from 'phaser';
import type { BossBodyState, SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { mulberry } from '../../../../art/IsleArt';
import {
  BLUE, BLUE_DEEP, BLUE_LIT, BLUE_WASH, GREY, INK, INK_LIT, INK_SOFT, PAPER, PAPER_SHADE, WHITE,
} from './palette';
import {
  distToSeg, glyph, hatchRect, inkBlot, inkBurst, polyline, queenSeal, scribble, splashRing,
} from './inkArt';

/**
 * Prince Blot — the Queen's Censor, governor of the Inkwell Court.
 *
 * Maresa's quiet son. Every Dry Tithe receipt in the Reach is printed under his seal, and every
 * family that cannot pay is blotted from his registry the night before the tide takes their
 * floor — "so the Queen need not read their names". He speaks in fine print, and he fights the
 * way he governs: by writing you out of the page.
 *
 * Phase one (*Fine Print*) is lettering: paragraphs of glyphs marching down the page with only
 * the paragraph breaks to stand in, footnotes that go off in numbered order, the royal quill
 * signing a looping signature across the floor that burns when the ink sets, and the Queen's
 * seal slammed down for Royal Assent. Phase two (*Spilled Well*) tips the inkwell: the room goes
 * dark, he blinks in and out of the ink, floods half the page at a time with paper islands to
 * stand on, sends his silhouette swimming under the surface, and splatters blots from the well.
 * Hard mode's third phase (*Redacted*) blacks the page out line by line around the one line he
 * leaves unredacted, strikes you through, and closes the margins in.
 */

/** The player's hit radius, as the toolkit reckons it. */
const PLAYER_R = 20;
const FIELD_TOP = 96;

// ── Signature: Fine Print (paragraphs) ───────────────────────────────
// Lines of lettering march down the page one after another. Each line is
// solid letters but for one paragraph break wide enough to stand in, and each
// break drifts less than a walk's reach from the last. A pale blue rule shows
// where the next line will be set before it moves.

const LETTER_STEP = 24;
const BREAK_W = 4; // letters
const LINE_SPEED = 128;

const paragraph = (tk: BossToolkit): SignatureMove => {
  interface Line { setAt: number; startAt: number; gap: number; codes: number[]; dealt: boolean }
  let lines: Line[] = [];
  const yOf = (l: Line, time: number): number => FIELD_TOP + 8 + Math.max(0, (time - l.startAt) / 1000) * LINE_SPEED;
  const letterCount = (): number => Math.floor((tk.W - 40) / LETTER_STEP);
  const xOf = (i: number): number => 20 + LETTER_STEP / 2 + i * LETTER_STEP;
  return {
    durationMs: 3200,
    windupMs: 900,
    hold: 'conduct',
    tell: 'FINE PRINT',
    cast(time) {
      tk.sfx('sonic-pulse');
      const count = tk.hard ? 6 : 5;
      const n = letterCount();
      let gap = Phaser.Math.Clamp(Math.round((tk.player.x - 20) / LETTER_STEP) - 1, 1, n - BREAK_W - 1);
      for (let k = 0; k < count; k++) {
        // Drift the break by at most three letters (72px) per line — always reachable.
        if (k > 0) gap = Phaser.Math.Clamp(gap + Math.round((Math.random() - 0.5) * 6), 1, n - BREAK_W - 1);
        const setAt = time + k * 560;
        const codes: number[] = [];
        for (let i = 0; i < n; i++) codes.push(Math.floor(Math.random() * 9999));
        lines.push({ setAt, startAt: setAt + tk.warn(650), gap, codes, dealt: false });
      }
    },
    update(time) {
      const p = tk.player;
      for (const l of lines) {
        if (l.dealt || time < l.startAt) continue;
        const y = yOf(l, time);
        if (Math.abs(p.y - y) > 9 + PLAYER_R) continue;
        const idx = Math.round((p.x - xOf(0)) / LETTER_STEP);
        // Safe only fully inside the break.
        const leftEdge = xOf(l.gap) - LETTER_STEP / 2, rightEdge = xOf(l.gap + BREAK_W - 1) + LETTER_STEP / 2;
        const safe = p.x - PLAYER_R * 0.7 > leftEdge && p.x + PLAYER_R * 0.7 < rightEdge;
        if (!safe && idx >= -1 && idx <= l.codes.length) {
          l.dealt = true;
          tk.hitPlayer(11, p.x, p.y);
          tk.sfx('slash');
        }
      }
      lines = lines.filter((l) => yOf(l, time) < tk.H + 30);
    },
    drawGround(g, time) {
      for (const l of lines) {
        if (time < l.setAt || time >= l.startAt) continue;
        // The rule where the line is being set, and its letters pencilled in blue.
        const k = Phaser.Math.Clamp((time - l.setAt) / Math.max(1, l.startAt - l.setAt), 0, 1);
        const y = FIELD_TOP + 8;
        g.lineStyle(1.5, BLUE, 0.4 + 0.4 * k); g.lineBetween(20, y + 10, tk.W - 20, y + 10);
        for (let i = 0; i < l.codes.length; i++) {
          if (i >= l.gap && i < l.gap + BREAK_W) continue;
          glyph(g, xOf(i), y, 12, l.codes[i], BLUE, 0.25 + 0.4 * k, 1.2);
        }
        // The break, bracketed so it is unmistakable.
        const lx = xOf(l.gap) - LETTER_STEP / 2, rx = xOf(l.gap + BREAK_W - 1) + LETTER_STEP / 2;
        g.lineStyle(2, BLUE, 0.8); g.lineBetween(lx, y - 8, lx, y + 14); g.lineBetween(rx, y - 8, rx, y + 14);
      }
    },
    drawAir(g, time) {
      for (const l of lines) {
        if (time < l.startAt) continue;
        const y = yOf(l, time);
        for (let i = 0; i < l.codes.length; i++) {
          if (i >= l.gap && i < l.gap + BREAK_W) continue;
          const x = xOf(i);
          // Letter-blocks: a type-slug in white with the glyph in thick ink on it.
          g.fillStyle(WHITE, 0.92); g.fillRect(x - 10, y - 10, 20, 20);
          g.lineStyle(1, INK, 0.5); g.strokeRect(x - 10, y - 10, 20, 20);
          glyph(g, x, y, 13, l.codes[i], INK, 1, 2.6);
        }
        g.lineStyle(1, BLUE, 0.5); g.lineBetween(20, y + 12, tk.W - 20, y + 12);
      }
    },
    onPhaseEnd() { lines = []; },
  };
};

// ── Signature: See Footnote ──────────────────────────────────────────
// Asterisks are dotted round the player, each with its number in blue pips.
// Then they go off in order, one, two, three — a burst of fine print each.
// The ring leaves gaps, and the order tells you which way to run.

const footnote = (tk: BossToolkit): SignatureMove => {
  interface Note { x: number; y: number; n: number; born: number; at: number; done: boolean }
  let notes: Note[] = [];
  const R = 62;
  return {
    durationMs: 2600,
    windupMs: 800,
    gesture: 'point',
    tell: 'SEE FOOTNOTE',
    cast(time) {
      tk.sfx('clock-tick');
      const p = tk.player;
      const count = tk.hard ? 6 : 5;
      const a0 = Math.random() * Math.PI * 2;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const pts: { x: number; y: number }[] = [{ x: p.x, y: p.y }];
      for (let i = 0; i < count; i++) {
        const a = a0 + dir * (i / count) * Math.PI * 2;
        pts.push({ x: p.x + Math.cos(a) * 150, y: p.y + Math.sin(a) * 120 });
      }
      const base = time + tk.warn(1200);
      pts.forEach((q, i) => notes.push({
        x: tk.clampX(q.x, 50), y: tk.clampY(q.y, 50), n: i + 1, born: time, at: base + i * 190, done: false,
      }));
    },
    update(time) {
      const p = tk.player;
      for (const nt of notes) {
        if (nt.done || time < nt.at) continue;
        nt.done = true;
        tk.sfx('crit');
        if (Phaser.Math.Distance.Between(p.x, p.y, nt.x, nt.y) < R + PLAYER_R * 0.5) tk.hitPlayer(14, p.x, p.y);
      }
      notes = notes.filter((nt) => time < nt.at + 420);
    },
    drawGround(g, time) {
      for (const nt of notes) {
        if (nt.done) continue;
        const k = Phaser.Math.Clamp((time - nt.born) / Math.max(1, nt.at - nt.born), 0, 1);
        g.lineStyle(1.5, INK, 0.25 + 0.5 * k); g.strokeCircle(nt.x, nt.y, R);
        hatchRect(g, { x: nt.x - R * 0.7, y: nt.y - R * 0.7, w: R * 1.4, h: R * 1.4 }, Math.max(6, 18 - k * 12), INK, 0.08 + 0.18 * k);
      }
    },
    drawAir(g, time) {
      for (const nt of notes) {
        if (!nt.done) {
          // The asterisk and its superscript number.
          const pulse = 1 + Math.sin(time / 90 + nt.n) * 0.08;
          const s = 13 * pulse;
          g.lineStyle(5, WHITE, 0.9);
          for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI; g.lineBetween(nt.x - Math.cos(a) * s, nt.y - Math.sin(a) * s, nt.x + Math.cos(a) * s, nt.y + Math.sin(a) * s); }
          g.lineStyle(3, INK, 1);
          for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI; g.lineBetween(nt.x - Math.cos(a) * s, nt.y - Math.sin(a) * s, nt.x + Math.cos(a) * s, nt.y + Math.sin(a) * s); }
          for (let d = 0; d < nt.n; d++) { g.fillStyle(BLUE, 1); g.fillCircle(nt.x + 16 + d * 6, nt.y - 16, 2.6); }
          continue;
        }
        const k = (time - nt.at) / 420;
        inkBurst(g, nt.x, nt.y, R * (0.5 + 0.5 * k), 1 - k);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + nt.n;
          scribble(g, nt.x + Math.cos(a) * R * k - 10, nt.y + Math.sin(a) * R * k, 22, mulberry(nt.n * 17 + i), INK, 1 - k);
        }
      }
    },
    onPhaseEnd() { notes = []; },
  };
};

// ── Signature: The Royal Signature ───────────────────────────────────
// The great quill signs across the floor: its whole looping path is pencilled
// first, then the nib writes it out, leaving wet ink. When the signature is
// complete the ink sets — the whole line flashes and burns. The nib bites too.

const quillStroke = (tk: BossToolkit): SignatureMove => {
  interface Sig { pts: { x: number; y: number }[]; born: number; writeAt: number; doneAt: number; burnAt: number; endAt: number; burnt: boolean; nibHit: number }
  let sig: Sig | null = null;
  const WRITE_MS = 2100;
  const head = (s: Sig, time: number): number => Phaser.Math.Clamp((time - s.writeAt) / WRITE_MS, 0, 1);
  return {
    durationMs: 3400,
    windupMs: 850,
    gesture: 'sweep',
    tell: 'THE ROYAL SIGNATURE',
    cast(time) {
      tk.sfx('whoosh');
      const p = tk.player;
      const dir = p.x < tk.W / 2 ? -1 : 1;
      const x0 = dir < 0 ? tk.W - 60 : 60;
      const L = tk.W - 120;
      const loops = 5;
      const a = L / (Math.PI * 2 * loops);
      const b = a * 1.7;
      const yb = tk.clampY(p.y + 40, 120);
      // A prolate cycloid: the baseline runs across the room and the nib loops over it.
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i <= 160; i++) {
        const th = (i / 160) * Math.PI * 2 * loops;
        pts.push({ x: x0 + dir * (a * th - b * Math.sin(th)), y: tk.clampY(yb - b * 0.85 * (1 - Math.cos(th)), 40) });
      }
      const writeAt = time + tk.warn(750);
      sig = { pts, born: time, writeAt, doneAt: writeAt + WRITE_MS, burnAt: writeAt + WRITE_MS + 550, endAt: writeAt + WRITE_MS + 1100, burnt: false, nibHit: 0 };
    },
    update(time) {
      if (!sig) return;
      const s = sig;
      const p = tk.player;
      const k = head(s, time);
      const idx = Math.floor(k * (s.pts.length - 1));
      const nib = s.pts[idx];
      if (time >= s.writeAt && time < s.doneAt && time - s.nibHit > 500 && Phaser.Math.Distance.Between(p.x, p.y, nib.x, nib.y) < 18 + PLAYER_R) {
        s.nibHit = time;
        tk.hitPlayer(10, p.x, p.y);
      }
      if (!s.burnt && time >= s.burnAt) {
        s.burnt = true;
        tk.sfx('sizzle');
        for (let i = 1; i < s.pts.length; i++) {
          const a = s.pts[i - 1], b = s.pts[i];
          if (distToSeg(p.x, p.y, a.x, a.y, b.x, b.y) < 12 + PLAYER_R) { tk.hitPlayer(17, p.x, p.y); break; }
        }
      }
      if (time > s.endAt) sig = null;
    },
    drawGround(g, time) {
      if (!sig) return;
      const s = sig;
      // Pencil guide of the whole signature.
      if (time < s.doneAt) {
        g.lineStyle(1.5, BLUE, 0.45);
        for (let i = 2; i < s.pts.length; i += 4) g.lineBetween(s.pts[i - 2].x, s.pts[i - 2].y, s.pts[i].x, s.pts[i].y);
      }
      // The wet ink laid so far — thick and thin like a real nib.
      const n = Math.floor(head(s, time) * (s.pts.length - 1));
      const burn = time >= s.burnAt;
      const fade = burn ? 1 - Phaser.Math.Clamp((time - s.burnAt) / (s.endAt - s.burnAt), 0, 1) : 1;
      for (let i = 1; i <= n; i++) {
        const a = s.pts[i - 1], b = s.pts[i];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const w = 4 + Math.abs(Math.sin(ang - Math.PI / 4)) * 9;
        if (burn) { g.lineStyle(w + 10, BLUE_LIT, 0.5 * fade); g.lineBetween(a.x, a.y, b.x, b.y); }
        g.lineStyle(w, INK, fade); g.lineBetween(a.x, a.y, b.x, b.y);
      }
      if (time >= s.doneAt && !burn) {
        // Setting: the gloss on the wet line flickers before it burns.
        const k = (time - s.doneAt) / Math.max(1, s.burnAt - s.doneAt);
        g.lineStyle(2, WHITE, 0.3 + 0.6 * k * (Math.floor(time / 70) % 2));
        polyline(g, s.pts.map((q) => ({ x: q.x - 2, y: q.y - 2 })));
      }
    },
    drawAir(g, time) {
      if (!sig || time < sig.writeAt || time > sig.doneAt) return;
      const s = sig;
      const k = head(s, time);
      const idx = Math.floor(k * (s.pts.length - 1));
      const nib = s.pts[idx];
      // The royal quill: a tall white feather with inked barbs, the nib on the floor.
      const tipX = nib.x + 40, tipY = nib.y - 170;
      g.lineStyle(7, INK, 1); g.lineBetween(nib.x, nib.y, tipX, tipY);
      g.lineStyle(3, WHITE, 1); g.lineBetween(nib.x, nib.y, tipX, tipY);
      const ang = Math.atan2(tipY - nib.y, tipX - nib.x);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const vane: Phaser.Geom.Point[] = [];
      const back: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = 0.25 + (i / 10) * 0.75;
        const bx = nib.x + (tipX - nib.x) * t, by = nib.y + (tipY - nib.y) * t;
        const w = Math.sin(Math.PI * ((t - 0.25) / 0.75)) * 22 + 2;
        vane.push(new Phaser.Geom.Point(bx + nx * w, by + ny * w));
        back.unshift(new Phaser.Geom.Point(bx - nx * w * 0.7, by - ny * w * 0.7));
      }
      const outline = [...vane, ...back];
      g.fillStyle(WHITE, 1); g.fillPoints(outline, true, true);
      g.lineStyle(2.5, INK, 1); g.strokePoints(outline, true, true);
      g.lineStyle(1, INK, 0.7);
      for (let i = 1; i < 10; i++) { const p0 = vane[i]; const t = 0.25 + (i / 10) * 0.75; g.lineBetween(nib.x + (tipX - nib.x) * t, nib.y + (tipY - nib.y) * t, p0.x, p0.y); }
      g.fillStyle(INK, 1); g.fillTriangle(nib.x - 4, nib.y - 12, nib.x + 5, nib.y - 10, nib.x, nib.y + 2);
      splashRing(g, nib.x, nib.y, 14, 0.7, 5);
    },
    onPhaseEnd() { sig = null; },
  };
};

// ── Signature: Royal Assent ──────────────────────────────────────────
// The Queen's own seal-stamp hangs over the player, its shadow tightening as
// it falls. It slams; the seal it leaves in blue throws its lettering outward
// in a ring with a gap — the gap opens where the player stood out of it.

const stamp = (tk: BossToolkit): SignatureMove => {
  interface St { x: number; y: number; born: number; at: number; done: boolean; markUntil: number }
  let st: St[] = [];
  const R = 96;
  return {
    durationMs: 2300,
    windupMs: 900,
    gesture: 'slam',
    tell: 'ROYAL ASSENT',
    cast(time) {
      tk.sfx('hammer-forge');
      const p = tk.player;
      const n = tk.hard ? 2 : 1;
      for (let i = 0; i < n; i++) {
        tk.schedule(i * 900, () => {
          const now = tk.now;
          const q = tk.player;
          st.push({ x: tk.clampX(i ? q.x : p.x, 90), y: tk.clampY(i ? q.y : p.y, 80), born: now, at: now + tk.warn(1300), done: false, markUntil: 0 });
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const s of st) {
        if (s.done || time < s.at) continue;
        s.done = true;
        s.markUntil = time + 1800;
        tk.sfx('anvil');
        if (Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) < R) tk.hitPlayer(22, p.x, p.y);
        const toP = Math.atan2(p.y - s.y, p.x - s.x);
        const count = 14, step = (Math.PI * 2) / count;
        for (let i = 0; i < count; i++) {
          const a = toP + step * (i + 0.5);
          if (Math.abs(Phaser.Math.Angle.Wrap(a - toP)) < step * 1.2) continue;
          tk.spawnBullet({ x: s.x + Math.cos(a) * 40, y: s.y + Math.sin(a) * 40, angle: a, speed: 185, damage: 9, r: 6, color: BLUE });
        }
      }
      st = st.filter((s) => !s.done || time < s.markUntil);
    },
    drawGround(g, time) {
      for (const s of st) {
        if (!s.done) {
          const k = Phaser.Math.Clamp((time - s.born) / Math.max(1, s.at - s.born), 0, 1);
          // The stamp's shadow, hatched, tightening.
          const r = R * (1.5 - 0.5 * k);
          g.lineStyle(2, INK, 0.4 + 0.5 * k); g.strokeCircle(s.x, s.y, r);
          hatchRect(g, { x: s.x - r * 0.7, y: s.y - r * 0.7, w: r * 1.4, h: r * 1.4 }, Math.max(5, 14 - 9 * k), INK, 0.1 + 0.25 * k);
          continue;
        }
        const f = Phaser.Math.Clamp((s.markUntil - time) / 600, 0, 1);
        queenSeal(g, s.x, s.y, R * 0.8, f);
      }
    },
    drawAir(g, time) {
      for (const s of st) {
        if (s.done) {
          const since = time - s.at;
          if (since < 300) splashRing(g, s.x, s.y, R * (1 + since / 300), 1 - since / 300, 16, BLUE_DEEP);
          continue;
        }
        const k = Phaser.Math.Clamp((time - s.born) / Math.max(1, s.at - s.born), 0, 1);
        const lift = (1 - k * k) * 220;
        const y = s.y - lift - 30;
        // The seal-stamp: a black turned handle on a blue die, the die's face downward.
        g.fillStyle(BLUE_DEEP, 1); g.fillEllipse(s.x, y + 24, R * 1.3, R * 0.36);
        g.fillStyle(BLUE, 1); g.fillRect(s.x - R * 0.62, y, R * 1.24, 24);
        g.lineStyle(2.5, INK, 1); g.strokeRect(s.x - R * 0.62, y, R * 1.24, 24);
        g.fillStyle(INK, 1); g.fillRect(s.x - 14, y - 70, 28, 72);
        g.fillCircle(s.x, y - 74, 20);
        g.fillStyle(WHITE, 0.6); g.fillRect(s.x - 9, y - 66, 4, 60); g.fillCircle(s.x - 6, y - 80, 4);
      }
    },
    onPhaseEnd() { st = []; },
  };
};

// ── Signature: Spilled Well ──────────────────────────────────────────
// The well tips over one wall: the overflow drips for a beat, then a flood of
// ink runs across that half of the page and sits there. Three paper islands
// stay dry in it — marked before it comes. Wading costs health and pace.

const spill = (tk: BossToolkit): SignatureMove => {
  interface Fl { left: boolean; born: number; runAt: number; fullAt: number; drainAt: number; endAt: number; islands: { x: number; y: number }[]; lastTick: number }
  let fl: Fl | null = null;
  const ISLE_R = 52;
  const reach = (f: Fl, time: number): number => {
    const half = tk.W * 0.55;
    if (time < f.runAt) return 0;
    if (time < f.fullAt) return half * ((time - f.runAt) / (f.fullAt - f.runAt));
    if (time < f.drainAt) return half;
    return half * Math.max(0, 1 - (time - f.drainAt) / (f.endAt - f.drainAt));
  };
  const flooded = (f: Fl, x: number, y: number, time: number): boolean => {
    const r = reach(f, time);
    const inHalf = f.left ? x < r : x > tk.W - r;
    return inHalf && y > FIELD_TOP && !f.islands.some((i) => Phaser.Math.Distance.Between(x, y, i.x, i.y) < ISLE_R - 6);
  };
  return {
    durationMs: 3000,
    windupMs: 1000,
    hold: 'brace',
    tell: 'SPILLED WELL',
    cast(time) {
      tk.sfx('splash');
      const left = tk.player.x < tk.W / 2;
      const runAt = time + tk.warn(1250);
      const islands: { x: number; y: number }[] = [];
      for (let i = 0; i < 3; i++) {
        const x = left ? 90 + Math.random() * (tk.W * 0.4) : tk.W - 90 - Math.random() * (tk.W * 0.4);
        islands.push({ x, y: FIELD_TOP + 90 + i * ((tk.H - FIELD_TOP - 160) / 2) + (Math.random() - 0.5) * 40 });
      }
      fl = { left, born: time, runAt, fullAt: runAt + 650, drainAt: runAt + 650 + 2700, endAt: runAt + 650 + 2700 + 700, islands, lastTick: 0 };
    },
    update(time) {
      if (!fl) return;
      const p = tk.player;
      if (flooded(fl, p.x, p.y, time)) {
        tk.slowPlayer(0.68, 220);
        if (time - fl.lastTick > 500) { fl.lastTick = time; tk.hitPlayer(6, p.x, p.y); }
      }
      if (time > fl.endAt) fl = null;
    },
    drawGround(g, time) {
      if (!fl) return;
      const f = fl;
      if (time < f.runAt) {
        // Overflow dripping down the wall it will come from; islands pencilled in.
        const k = (time - f.born) / Math.max(1, f.runAt - f.born);
        const wx = f.left ? 0 : tk.W - 26;
        g.fillStyle(INK, 0.5 + 0.4 * k); g.fillRect(wx, FIELD_TOP, 26, tk.H - FIELD_TOP);
        for (let i = 0; i < 9; i++) {
          const y = FIELD_TOP + 30 + i * 58;
          const len = (12 + ((i * 7) % 20)) * k + Math.sin(time / 120 + i) * 4;
          g.fillStyle(INK, 1); g.fillEllipse(f.left ? 26 + len / 2 : tk.W - 26 - len / 2, y, len, 9);
        }
        g.lineStyle(1.5, BLUE, 0.4 + 0.4 * k);
        const edge = tk.W * 0.55;
        g.lineBetween(f.left ? edge : tk.W - edge, FIELD_TOP, f.left ? edge : tk.W - edge, tk.H);
        for (const i of f.islands) { g.lineStyle(2, INK, 0.6); g.strokeCircle(i.x, i.y, ISLE_R); g.fillStyle(WHITE, 0.5); g.fillCircle(i.x, i.y, ISLE_R); }
        return;
      }
      const r = reach(f, time);
      if (r <= 0) return;
      // The flood: black ink with a lapping front and bare-paper ripple strokes.
      const x0 = f.left ? 0 : tk.W - r;
      g.fillStyle(INK, 0.94); g.fillRect(x0, FIELD_TOP, r, tk.H - FIELD_TOP);
      const fx = f.left ? r : tk.W - r;
      for (let y = FIELD_TOP; y < tk.H; y += 22) {
        const bulge = Math.sin(y / 30 + time / 160) * 10;
        g.fillCircle(fx + (f.left ? bulge : -bulge), y + 11, 13);
      }
      g.lineStyle(1.5, WHITE, 0.35);
      for (let i = 0; i < 18; i++) {
        const rx = x0 + ((i * 97 + time * 0.03) % Math.max(1, r)), ry = FIELD_TOP + 20 + ((i * 61) % (tk.H - FIELD_TOP - 40));
        g.beginPath(); g.arc(rx, ry, 9, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
      }
      // Paper islands standing dry.
      for (const i of f.islands) {
        if (!(f.left ? i.x < r + ISLE_R : i.x > tk.W - r - ISLE_R)) continue;
        g.fillStyle(PAPER, 1); g.fillCircle(i.x, i.y, ISLE_R);
        g.lineStyle(3, INK, 1); g.strokeCircle(i.x, i.y, ISLE_R);
        g.lineStyle(1, BLUE_LIT, 0.6);
        for (let k = -2; k <= 2; k++) g.lineBetween(i.x - Math.sqrt(Math.max(0, ISLE_R * ISLE_R - (k * 16) ** 2)) + 4, i.y + k * 16, i.x + Math.sqrt(Math.max(0, ISLE_R * ISLE_R - (k * 16) ** 2)) - 4, i.y + k * 16);
      }
    },
    drawAir(g, time) {
      // The room is dark in this phase, so the parts you must read — which half is going under,
      // and where the dry islands are — are drawn over the gloom, not under it.
      if (!fl) return;
      const f = fl;
      const edge = tk.W * 0.55;
      const ex = f.left ? edge : tk.W - edge;
      if (time < f.runAt) {
        const k = (time - f.born) / Math.max(1, f.runAt - f.born);
        const blink = Math.floor(time / 140) % 2 ? 1 : 0.5;
        g.lineStyle(3, BLUE, (0.5 + 0.5 * k) * blink);
        for (let y = FIELD_TOP; y < tk.H; y += 28) g.lineBetween(ex, y, ex, y + 16);
        // Chevrons pointing the way out of the half that floods.
        for (let y = FIELD_TOP + 60; y < tk.H; y += 120) {
          const dx = f.left ? 1 : -1;
          g.lineStyle(3, BLUE_LIT, 0.6 * blink);
          g.lineBetween(ex + dx * 14, y - 12, ex + dx * 30, y); g.lineBetween(ex + dx * 30, y, ex + dx * 14, y + 12);
        }
      }
      if (time < f.drainAt) {
        for (const i of f.islands) {
          g.lineStyle(2.5, WHITE, 0.75); g.strokeCircle(i.x, i.y, ISLE_R);
          g.lineStyle(1.5, BLUE, 0.8); g.strokeCircle(i.x, i.y, ISLE_R - 5);
        }
      }
    },
    onPhaseEnd() { fl = null; },
  };
};

// ── Signature: Under the Surface ─────────────────────────────────────
// Blot's silhouette slips into the ink and swims for the player — a dark shape
// under rippling rings, closing on them at walking pace. It stops, rings
// tighten on the spot, and it bursts up in a column of ink and droplets.

const silhouette = (tk: BossToolkit): SignatureMove => {
  interface Sw { x: number; y: number; born: number; lockAt: number; burstAt: number; done: boolean }
  let swims: Sw[] = [];
  const R = 80;
  return {
    durationMs: 3600,
    windupMs: 800,
    hold: 'draw',
    tell: 'UNDER THE SURFACE',
    cast(time) {
      tk.sfx('bubble');
      const count = tk.hard ? 3 : 2;
      for (let i = 0; i < count; i++) {
        tk.schedule(i * 1100, () => {
          const now = tk.now;
          const lockAt = now + 1300;
          swims.push({ x: tk.bossX, y: tk.bossY, born: now, lockAt, burstAt: lockAt + tk.warn(800), done: false });
        });
      }
    },
    update(time, dt) {
      const p = tk.player;
      for (const s of swims) {
        if (time < s.lockAt) {
          // Swim toward the player, a touch slower than walking.
          const a = Math.atan2(p.y - s.y, p.x - s.x);
          const d = Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y);
          const step = Math.min(d, 175 * dt);
          s.x += Math.cos(a) * step; s.y += Math.sin(a) * step;
        }
        if (!s.done && time >= s.burstAt) {
          s.done = true;
          tk.sfx('geyser');
          if (Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) < R) tk.hitPlayer(20, p.x, p.y);
          const toP = Math.atan2(p.y - s.y, p.x - s.x);
          for (let i = 0; i < 9; i++) {
            const a = toP + Math.PI / 9 + (i / 9) * Math.PI * 2;
            if (Math.abs(Phaser.Math.Angle.Wrap(a - toP)) < 0.45) continue;
            tk.spawnBullet({ x: s.x, y: s.y, angle: a, speed: 170, damage: 8, r: 7, color: INK_LIT });
          }
        }
      }
      swims = swims.filter((s) => time < s.burstAt + 500);
    },
    drawGround(g, time) {
      for (const s of swims) {
        if (s.done) continue;
        // The silhouette: Blot's round body and plume, dark under the surface.
        g.fillStyle(INK, 0.55); g.fillEllipse(s.x, s.y, 60, 40);
        g.fillTriangle(s.x + 6, s.y - 14, s.x + 34, s.y - 38, s.x + 18, s.y - 6);
        // Ripples: travelling while it swims, tightening once it has picked its spot.
        if (time < s.lockAt) {
          for (let k = 0; k < 3; k++) {
            const ph = ((time / 500) + k / 3) % 1;
            g.lineStyle(2, WHITE, 0.6 * (1 - ph)); g.strokeEllipse(s.x, s.y, 40 + ph * 70, 26 + ph * 46);
            g.lineStyle(1, INK, 0.6 * (1 - ph)); g.strokeEllipse(s.x, s.y + 2, 40 + ph * 70, 26 + ph * 46);
          }
        } else {
          const k = Phaser.Math.Clamp((time - s.lockAt) / Math.max(1, s.burstAt - s.lockAt), 0, 1);
          for (let i = 0; i < 3; i++) {
            const r = R * (1.4 - k * 0.4) - i * 14;
            g.lineStyle(2.5, i === 0 ? BLUE : INK, 0.4 + 0.5 * k); g.strokeCircle(s.x, s.y, r);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const s of swims) {
        if (!s.done) continue;
        const k = (time - s.burstAt) / 500;
        // The column: a black pillar of ink rearing up and falling back.
        const h = Math.sin(Math.PI * Math.min(1, k * 1.4)) * 150;
        g.fillStyle(INK, 1 - k * 0.6); g.fillRect(s.x - 22, s.y - h, 44, h);
        g.fillEllipse(s.x, s.y - h, 56, 26);
        g.lineStyle(2, WHITE, 0.6 * (1 - k)); g.lineBetween(s.x - 10, s.y - h + 8, s.x - 10, s.y - 6);
        splashRing(g, s.x, s.y, R * (0.6 + k), 1 - k, 14);
      }
    },
    onPhaseEnd() { swims = []; },
  };
};

// ── Signature: Blot Splatter ─────────────────────────────────────────
// Blot flicks the well: drops of ink arc up out of it and splat round the
// player, each landing where a ring has been showing since it was thrown, and
// each staying as a stinging blot that drags at the feet.

const splatter = (tk: BossToolkit): SignatureMove => {
  interface Drop { fx: number; fy: number; x: number; y: number; at: number; land: number; seed: number }
  interface Pool { x: number; y: number; dieAt: number; seed: number; lastHit: number }
  let drops: Drop[] = [];
  let pools: Pool[] = [];
  const R = 44;
  return {
    durationMs: 2000,
    windupMs: 700,
    gesture: 'raise',
    tell: 'BLOT SPLATTER',
    cast() {
      tk.sfx('slime-splat');
      const count = tk.hard ? 7 : 5;
      for (let i = 0; i < count; i++) {
        tk.schedule(i * 170, () => {
          const p = tk.player;
          const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : 60 + Math.random() * 110;
          const now = tk.now;
          drops.push({
            fx: tk.bossX, fy: tk.bossY - 20, x: tk.clampX(p.x + Math.cos(a) * d, 60), y: tk.clampY(p.y + Math.sin(a) * d, 50),
            at: now, land: now + tk.warn(760), seed: Math.floor(Math.random() * 1e6),
          });
        });
      }
    },
    update(time) {
      const p = tk.player;
      drops = drops.filter((d) => {
        if (time < d.land) return true;
        tk.sfx('splash');
        if (Phaser.Math.Distance.Between(p.x, p.y, d.x, d.y) < R) tk.hitPlayer(12, p.x, p.y);
        pools.push({ x: d.x, y: d.y, dieAt: time + 4500, seed: d.seed, lastHit: time });
        return false;
      });
      for (const pl of pools) {
        if (Phaser.Math.Distance.Between(p.x, p.y, pl.x, pl.y) < R - 6) {
          tk.slowPlayer(0.75, 200);
          if (time - pl.lastHit > 650) { pl.lastHit = time; tk.hitPlayer(5, p.x, p.y); }
        }
      }
      pools = pools.filter((pl) => time < pl.dieAt);
    },
    drawGround(g, time) {
      for (const d of drops) {
        const k = Phaser.Math.Clamp((time - d.at) / Math.max(1, d.land - d.at), 0, 1);
        g.lineStyle(2, INK, 0.35 + 0.55 * k); g.strokeCircle(d.x, d.y, R);
        g.fillStyle(INK, 0.1 + 0.2 * k); g.fillCircle(d.x, d.y, R * k);
      }
      for (const pl of pools) {
        const f = Phaser.Math.Clamp((pl.dieAt - time) / 600, 0, 1);
        inkBlot(g, pl.x, pl.y, R * 0.85, mulberry(pl.seed), INK, 0.9 * f);
      }
    },
    drawAir(g, time) {
      for (const d of drops) {
        const k = Phaser.Math.Clamp((time - d.at) / Math.max(1, d.land - d.at), 0, 1);
        const x = d.fx + (d.x - d.fx) * k, y = d.fy + (d.y - d.fy) * k - Math.sin(Math.PI * k) * 170;
        g.fillStyle(INK, 1); g.fillEllipse(x, y, 13, 17);
        g.fillStyle(WHITE, 0.85); g.fillCircle(x - 3, y - 4, 2.5);
      }
    },
    onPhaseEnd() { drops = []; pools = []; },
  };
};

// ── Signature: Redacted ──────────────────────────────────────────────
// The page is blacked out line by line, top to bottom. One line is left —
// ruled in blue from the first instant — and only that line is safe. The
// line he leaves is always within a short walk of the player.

const redactLine = (tk: BossToolkit): SignatureMove => {
  interface Row { y: number; h: number; warnAt: number; inkAt: number; endAt: number; dealt: boolean; safe: boolean }
  let rows: Row[] = [];
  const ROWS = 7;
  return {
    durationMs: 3600,
    windupMs: 900,
    hold: 'spray',
    tell: 'REDACTED',
    cast(time) {
      tk.sfx('curse-cast');
      const h = (tk.H - FIELD_TOP - 8) / ROWS;
      const pr = Phaser.Math.Clamp(Math.floor((tk.player.y - FIELD_TOP - 4) / h), 0, ROWS - 1);
      let safe = pr + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
      if (safe < 0 || safe >= ROWS) safe = pr + (pr < ROWS / 2 ? 2 : -2);
      safe = Phaser.Math.Clamp(safe, 0, ROWS - 1);
      const cadence = tk.hard ? 210 : 260;
      for (let i = 0; i < ROWS; i++) {
        const inkAt = time + tk.warn(1150) + i * cadence;
        rows.push({ y: FIELD_TOP + 4 + i * h, h, warnAt: time, inkAt, endAt: inkAt + 1000, dealt: false, safe: i === safe });
      }
    },
    update(time) {
      const p = tk.player;
      for (const r of rows) {
        if (r.safe || r.dealt || time < r.inkAt) continue;
        r.dealt = true;
        tk.sfx('stone-slam');
        if (p.y > r.y - 6 && p.y < r.y + r.h + 6) tk.hitPlayer(20, p.x, p.y);
      }
      rows = rows.filter((r) => time < r.endAt);
    },
    drawGround(g, time) {
      for (const r of rows) {
        if (r.safe) {
          // The unredacted line: blue rules and a line of plain text the censor spared.
          g.fillStyle(BLUE_WASH, 0.4); g.fillRect(14, r.y, tk.W - 28, r.h);
          g.lineStyle(2.5, BLUE, 0.9); g.lineBetween(14, r.y, tk.W - 14, r.y); g.lineBetween(14, r.y + r.h, tk.W - 14, r.y + r.h);
          scribble(g, 40, r.y + r.h / 2, tk.W - 80, mulberry(7), BLUE_DEEP, 0.5, 1.4);
          continue;
        }
        if (time < r.inkAt) {
          const k = Phaser.Math.Clamp((time - r.warnAt) / Math.max(1, r.inkAt - r.warnAt), 0, 1);
          g.lineStyle(1.5, INK, 0.3 + 0.5 * k); g.strokeRect(14, r.y + 2, tk.W - 28, r.h - 4);
          hatchRect(g, { x: 14, y: r.y + 2, w: tk.W - 28, h: r.h - 4 }, Math.max(6, 20 - 14 * k), INK, 0.08 + 0.2 * k);
        }
      }
    },
    drawAir(g, time) {
      for (const r of rows) {
        if (r.safe || time < r.inkAt) continue;
        const since = time - r.inkAt;
        const sweep = Phaser.Math.Clamp(since / 160, 0, 1);
        const fade = Phaser.Math.Clamp((r.endAt - time) / 300, 0, 1);
        g.fillStyle(INK, 0.96 * fade); g.fillRect(14, r.y + 3, (tk.W - 28) * sweep, r.h - 6);
        g.lineStyle(2, WHITE, 0.25 * fade); g.lineBetween(30, r.y + r.h * 0.3, 14 + (tk.W - 44) * sweep, r.y + r.h * 0.3);
        // The marker's ragged head as it runs across.
        if (sweep < 1) { g.fillStyle(INK, 1); g.fillCircle(14 + (tk.W - 28) * sweep, r.y + r.h / 2, r.h / 2 - 2); }
      }
    },
    onPhaseEnd() { rows = []; },
  };
};

// ── Signature: Struck Through ────────────────────────────────────────
// A fat marker stroke is drawn straight through the player — pencilled as a
// ruled lane first — and a second crosses it a beat later to make an X. The
// crossing is the worst place to stand; the open triangles are safe.

const strike = (tk: BossToolkit): SignatureMove => {
  interface Stroke { x: number; y: number; a: number; born: number; at: number; endAt: number; dealt: boolean }
  let strokes: Stroke[] = [];
  const HALF = 32;
  return {
    durationMs: 2400,
    windupMs: 800,
    gesture: 'sweep',
    tell: 'STRUCK THROUGH',
    cast(time) {
      tk.sfx('slash');
      const p = tk.player;
      const a = (Math.random() < 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.25);
      const at = time + tk.warn(1000);
      strokes.push({ x: p.x, y: p.y, a, born: time, at, endAt: at + 450, dealt: false });
      tk.schedule(520, () => {
        const q = tk.player;
        const at2 = tk.now + tk.warn(1000);
        strokes.push({ x: q.x, y: q.y, a: -a, born: tk.now, at: at2, endAt: at2 + 450, dealt: false });
      });
    },
    update(time) {
      const p = tk.player;
      for (const s of strokes) {
        if (s.dealt || time < s.at || time > s.endAt) continue;
        const c = Math.cos(s.a), sn = Math.sin(s.a);
        const d = Math.abs(-(p.x - s.x) * sn + (p.y - s.y) * c);
        if (d < HALF + PLAYER_R * 0.6) { s.dealt = true; tk.hitPlayer(19, p.x, p.y); }
      }
      strokes = strokes.filter((s) => time < s.endAt + 300);
    },
    drawGround(g, time) {
      for (const s of strokes) {
        if (time >= s.at) continue;
        const k = Phaser.Math.Clamp((time - s.born) / Math.max(1, s.at - s.born), 0, 1);
        const c = Math.cos(s.a), sn = Math.sin(s.a);
        const L = 1200;
        g.lineStyle(HALF * 2, INK, 0.06 + 0.12 * k); g.lineBetween(s.x - c * L, s.y - sn * L, s.x + c * L, s.y + sn * L);
        g.lineStyle(1.5, BLUE, 0.4 + 0.5 * k);
        for (const side of [-1, 1]) {
          const ox = -sn * side * HALF, oy = c * side * HALF;
          g.lineBetween(s.x - c * L + ox, s.y - sn * L + oy, s.x + c * L + ox, s.y + sn * L + oy);
        }
      }
    },
    drawAir(g, time) {
      for (const s of strokes) {
        if (time < s.at) continue;
        const k = Phaser.Math.Clamp((time - s.at) / 140, 0, 1);
        const f = time > s.endAt ? 1 - (time - s.endAt) / 300 : 1;
        const c = Math.cos(s.a), sn = Math.sin(s.a);
        const L = 1200;
        const x0 = s.x - c * L, y0 = s.y - sn * L;
        const x1 = x0 + c * L * 2 * k, y1 = y0 + sn * L * 2 * k;
        g.lineStyle(HALF * 2, INK, 0.95 * f); g.lineBetween(x0, y0, x1, y1);
        g.lineStyle(3, WHITE, 0.3 * f); g.lineBetween(x0 - sn * HALF * 0.5, y0 + c * HALF * 0.5, x1 - sn * HALF * 0.5, y1 + c * HALF * 0.5);
      }
    },
    onPhaseEnd() { strokes = []; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

export const BLOT_BOSS: WorldBossDef = {
  worldId: 'isle:blot',
  name: 'Prince Blot',
  title: 'The Queen\'s Censor',
  color: 0x1a1a22,
  colorLit: 0x5b84ff,
  colorDark: 0x050507,
  accent: PAPER,
  damageMult: 1.05,

  intro: [
    'You are not in the registry. That is easily corrected — in either direction.',
    'Mother does not read the names of the ones who go under. I see to it she never has to.',
  ],
  banter: [
    'Every receipt in this Reach passes under my seal. Yours will be very short.',
    'A blot is not cruel. It is tidy. The tide does the rest.',
    'I have read your file. It is blank now. I prefer it that way.',
    'Fine print, little reader. Nobody ever reads the fine print.',
    'The drowned are not dead. They are merely... no longer on the page.',
    'Mother keeps the sea. I keep the record. Between us, nothing is ever lost — only filed.',
  ],
  defeatLine: 'THE REGISTRY IS OPEN',
  resumeLine: 'A second copy. How thorough of you. It will be redacted the same.',

  phases: [
    {
      name: 'Fine Print',
      line: 'Read carefully. Every line is binding.',
      hp: 400,
      cycle: [
        'sig:paragraph', 'volley', 'sig:footnote', 'lanes', 'sig:quillStroke',
        'homing', 'sig:stamp', 'sig:paragraph', 'barrage', 'sig:footnote',
      ],
      harass: ['h-flak', 'h-rune', 'h-snipe'],
      restMs: 1080,
      harassMs: 3100,
    },
    {
      name: 'Spilled Well',
      line: 'You have tipped my well. Very well. Swim in it.',
      hp: 480,
      cycle: [
        'sig:spill', 'sig:silhouette', 'sig:splatter', 'spiral',
        'sig:spill', 'hazard', 'sig:silhouette', 'sig:stamp', 'sig:splatter', 'radial',
      ],
      harass: ['h-orbs', 'h-mines', 'h-flak'],
      restMs: 960,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'THE PAGE IS BLACKED OUT',
    extraPhase: {
      name: 'Redacted',
      line: 'There. Now there is only one line left on the page — and I wrote it.',
      hp: 350,
      cycle: [
        'sig:redactLine', 'sig:strike', 'sig:paragraph', 'sweep',
        'sig:redactLine', 'sig:footnote', 'sig:strike', 'sanctuary', 'sig:quillStroke',
      ],
      harass: ['h-lane', 'h-rune', 'h-orbs', 'h-snipe'],
      restMs: 820,
      harassMs: 2400,
    },
  },

  signatures: {
    paragraph,
    footnote,
    quillStroke,
    stamp,
    spill,
    silhouette,
    splatter,
    redactLine,
    strike,
  },

  look: {
    crest: 'plume', pattern: 'drip', aura: 'smoke', hands: 'ball',
    torsoR: 35, eyes: 2, eyeColor: BLUE_LIT, mouth: 'stitch',
  },
  phaseStyles: [
    { movement: 'hover', gimmick: 'none', tint: 'none' },
    { movement: 'blink', gimmick: 'gloom', tint: 'void', look: { pattern: 'smooth', aura: 'bubbles', hands: 'wisp', mouth: 'maw' } },
    { movement: 'stalk', gimmick: 'shrink', tint: 'pale', look: { crest: 'veil', pattern: 'grid', aura: 'none', eyes: 1, mouth: 'none', torsoR: 38 } },
  ],

  /**
   * The censor's look. A black redaction bar is laid across Blot's mouth — he has never once said
   * anything on the record — and he holds a royal quill in his right hand, dripping. Spilled Well
   * melts him: ink runs off him in drips, a pool spreads under him, the bar slides askew. Redacted
   * finishes the job — the bar has spread to cover his eyes, a blue pencil rule runs across him,
   * and only his single eye glows through the black.
   */
  drawDecor(g, s: BossBodyState) {
    const R = s.radius;
    const t = s.t;
    const phase = s.phaseIdx;

    // The pool under him (Spilled Well and after).
    if (phase >= 1) {
      g.fillStyle(INK, 0.55); g.fillEllipse(s.x, s.y + R * 0.95, R * 2.6, R * 0.7);
      g.lineStyle(1.5, WHITE, 0.3);
      g.beginPath(); g.arc(s.x, s.y + R * 0.95, R * 1.1, Math.PI * 1.1, Math.PI * 1.4, false); g.strokePath();
    }

    // The redaction bar across the mouth — or, in Redacted, across the eyes.
    const barY = phase >= 2 ? s.y - R * 0.18 : s.y + R * 0.32;
    const tilt = phase === 1 ? Math.sin(t / 700) * 0.12 + 0.1 : 0;
    const bw = R * (phase >= 2 ? 2.1 : 1.3), bh = R * (phase >= 2 ? 0.42 : 0.3);
    const c = Math.cos(tilt), sn = Math.sin(tilt);
    const corner = (u: number, v: number): Phaser.Geom.Point => new Phaser.Geom.Point(s.x + u * c - v * sn, barY + u * sn + v * c);
    const bar = [corner(-bw / 2, -bh / 2), corner(bw / 2, -bh / 2), corner(bw / 2, bh / 2), corner(-bw / 2, bh / 2)];
    g.fillStyle(INK, 1); g.fillPoints(bar, true, true);
    g.lineStyle(1.5, WHITE, 0.35);
    g.lineBetween(bar[0].x + 4, bar[0].y + 3, bar[1].x - 4, bar[1].y + 3);
    // A blue seal-stamp on the bar's end, as on every censored line.
    const sp = corner(bw / 2 - bh * 0.6, 0);
    g.fillStyle(BLUE, 1); g.fillCircle(sp.x, sp.y, bh * 0.34);
    if (phase >= 2) {
      // His one eye burning through the bar, and the blue pencil rule across his body.
      const ex = s.x + Math.cos(s.facing) * R * 0.15;
      g.fillStyle(BLUE_LIT, 0.35 + s.castGlow * 0.4); g.fillCircle(ex, barY, R * 0.26);
      g.fillStyle(WHITE, 0.9); g.fillCircle(ex, barY, R * 0.09);
      g.lineStyle(2, BLUE, 0.85);
      g.lineBetween(s.x - R * 1.1, s.y + R * 0.55, s.x + R * 1.1, s.y + R * 0.4);
      g.lineBetween(s.x - R * 1.1, s.y + R * 0.75, s.x + R * 1.1, s.y + R * 0.6);
    }

    // Drips running off him (Spilled Well).
    if (phase === 1) {
      for (let i = 0; i < 4; i++) {
        const ph = ((t / 900) + i * 0.27) % 1;
        const dx = s.x + (i - 1.5) * R * 0.45;
        g.fillStyle(INK, 1 - ph * 0.4);
        g.fillEllipse(dx, s.y + R * 0.6 + ph * R * 0.5, 5, 7 + ph * 4);
      }
    }

    // The royal quill in his right hand (not in Redacted — he has stopped writing).
    const hand = s.hands[1] ?? s.hands[0];
    if (hand && phase < 2) {
      const ang = -1.1 + Math.sin(t / 500) * 0.15 + s.castGlow * 0.5;
      const tipX = hand.x + Math.cos(ang) * 62, tipY = hand.y + Math.sin(ang) * 62;
      const nibX = hand.x - Math.cos(ang) * 14, nibY = hand.y - Math.sin(ang) * 14;
      g.lineStyle(4, INK, 1); g.lineBetween(nibX, nibY, tipX, tipY);
      g.lineStyle(1.5, WHITE, 1); g.lineBetween(nibX, nibY, tipX, tipY);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const pts: Phaser.Geom.Point[] = [];
      for (let i = 0; i <= 8; i++) {
        const k = 0.35 + (i / 8) * 0.65;
        const w = Math.sin(Math.PI * ((k - 0.35) / 0.65)) * 10 + 1;
        pts.push(new Phaser.Geom.Point(nibX + (tipX - nibX) * k + nx * w, nibY + (tipY - nibY) * k + ny * w));
      }
      for (let i = 8; i >= 0; i--) {
        const k = 0.35 + (i / 8) * 0.65;
        const w = Math.sin(Math.PI * ((k - 0.35) / 0.65)) * 6 + 1;
        pts.push(new Phaser.Geom.Point(nibX + (tipX - nibX) * k - nx * w, nibY + (tipY - nibY) * k - ny * w));
      }
      g.fillStyle(WHITE, 1); g.fillPoints(pts, true, true);
      g.lineStyle(1.5, INK, 1); g.strokePoints(pts, true, true);
      // A drop of ink hanging off the nib, falling every second.
      const ph = (t % 1000) / 1000;
      g.fillStyle(INK, 1); g.fillCircle(nibX, nibY + ph * 22, 2.4 + ph);
    }
    if (s.hurt) inkBurst(g, s.x + R * 0.8, s.y - R * 0.8, 10, 0.8);
  },

  /**
   * The Prince's floor is his registry: a great ledger page ruled in blue columns, row on row of
   * names in ink — and a third of them blotted out with neat black bars, each with its blue
   * stamp. The Queen's seal heads the page; the spilt well stains one corner.
   */
  drawArena(g, W, H) {
    const rng = mulberry(0xb107);
    g.fillStyle(PAPER, 1); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle(rng() < 0.7 ? PAPER_SHADE : WHITE, 0.35);
      g.fillRect(rng() * W, rng() * H, 1 + rng() * 2, 1);
    }
    const top = FIELD_TOP + 6;
    // Columns ruled in blue.
    const cols = 3;
    const cw = (W - 60) / cols;
    for (let c = 0; c <= cols; c++) {
      g.lineStyle(c === 0 || c === cols ? 2.5 : 1.5, BLUE, 0.55);
      g.lineBetween(30 + c * cw, top, 30 + c * cw, H - 14);
    }
    // Rows of names, a third of them blotted.
    for (let y = top + 22; y < H - 20; y += 26) {
      g.lineStyle(1, BLUE_LIT, 0.4); g.lineBetween(30, y + 7, W - 30, y + 7);
      for (let c = 0; c < cols; c++) {
        const x = 30 + c * cw + 14;
        if (rng() < 0.34) {
          const w = cw * (0.5 + rng() * 0.35);
          g.fillStyle(INK, 0.32); g.fillRect(x - 2, y - 7, w, 13);
          g.fillStyle(BLUE, 0.3); g.fillCircle(x + w - 6, y, 3);
        } else {
          scribble(g, x, y, cw * (0.35 + rng() * 0.4), rng, INK, 0.22);
          g.fillStyle(GREY, 0.25); g.fillRect(30 + (c + 1) * cw - 36, y - 4, 20, 2);
        }
      }
    }
    // The spilt well in the top-left corner, run across the ruling.
    inkBlot(g, 70, top + 40, 52, rng, INK, 0.45, false);
    for (let i = 0; i < 5; i++) {
      g.lineStyle(4 - i * 0.5, INK, 0.4);
      g.lineBetween(70 + i * 14, top + 70, 80 + i * 22, top + 130 + i * 30);
    }
    // The seal at the head of the page.
    queenSeal(g, W / 2, top + 4, 26, 0.5);
    g.lineStyle(3, INK, 0.9); g.strokeRect(10, top - 10, W - 20, H - top);
    g.fillStyle(INK_SOFT, 0.5); g.fillRect(0, H - 8, W, 8);
  },
};
