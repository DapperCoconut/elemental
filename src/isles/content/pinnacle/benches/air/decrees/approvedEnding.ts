import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import { GALE, GALE_CSS, GALE_LIT, OBS, hudPlate, sideMark } from '../art';
import { type Who, WHO, alive, clampN, dist, fighterOf, other, stepOf } from './util';

/**
 * SEAT OF THE LAST WORD — Councilor Ambrose Quill (myth). *Decree of the Approved Ending.*
 *
 * The bench's editor writes this fight as it happens. A great book lies open on the deck and a
 * glass quill hangs over it. Every few seconds the quill writes the next line of the story — "AND
 * THE HERO WAS SLOW AS STONE" — taking 2.6s to write it; then the line holds for five seconds and
 * whatever it says is true of whoever it names. The bad lines are written about the hero; the good
 * ones about the censor.
 *
 * While the line is being written, STRIKE THE QUILL and it is rewritten in your favour: the
 * subject's name is struck out and the other written in. The quill flees to a new spot each time it
 * is struck, and the councilor races you for it. A perfected Myth bot reads the room as a story —
 * this councilor simply edits it. The turn: so can anyone holding a weapon near the quill.
 */

type Key = 'slow' | 'soft' | 'star' | 'forgot' | 'awe' | 'mended' | 'sword' | 'swift';
interface Line { key: Key; text: string; good: boolean }
const LINES: Line[] = [
  { key: 'slow', text: 'WAS SLOW AS STONE', good: false },
  { key: 'soft', text: 'STRUCK LIKE A FEATHER', good: false },
  { key: 'star', text: 'WAS FOUND BY A FALLING STAR', good: false },
  { key: 'forgot', text: 'FORGOT EVERY WORD', good: false },
  { key: 'awe', text: 'STOOD STILL IN AWE', good: false },
  { key: 'mended', text: 'WAS MENDED', good: true },
  { key: 'sword', text: 'WAS GIVEN A SWORD', good: true },
  { key: 'swift', text: 'RAN LIKE THE WIND', good: true },
];
const NAME: Record<Who, string> = { player: 'THE HERO', npc: 'THE CENSOR' };

const approvedEnding = (ctx: GimmickCtx): EncounterGimmick => {
  const WRITE = ctx.hard ? 2200 : 2600;
  const HOLD = 5000;
  const PAUSE = ctx.hard ? 1300 : 1700;
  const STAR_R = 62;
  const STAR_DMG = ctx.hard ? 14 : 12;
  const top = ctx.top;
  const book = { x: ctx.W / 2, y: ctx.H - 120 };

  let state: 'pause' | 'write' | 'hold' = 'pause';
  let at = 0;
  let line: Line = LINES[0];
  let subject: Who = 'player';
  let lastKey: Key | null = null;
  let flipAt = 0;
  let quillPos: Pt = { x: book.x + 40, y: book.y - 70 };
  let quillTo: Pt = { ...quillPos };
  const flips: { from: Who; at: number }[] = [];
  let stars: { x: number; y: number; hitAt: number; done: boolean }[] = [];
  let quill: StrikeTarget | null = null;

  /** Is the current line written in this side's favour? */
  const favours = (w: Who): boolean => (line.good ? subject === w : subject !== w);

  const newSpot = (): Pt => {
    for (let i = 0; i < 12; i++) {
      const p = { x: 120 + ctx.rng() * (ctx.W - 240), y: top + 90 + ctx.rng() * (ctx.H - top - 260) };
      if (dist(p.x, p.y, ctx.player.x, ctx.player.y) > 160 && dist(p.x, p.y, ctx.npc.x, ctx.npc.y) > 160) return p;
    }
    return { x: 120 + ctx.rng() * (ctx.W - 240), y: top + 120 };
  };

  const begin = (time: number): void => {
    let l = LINES[Math.floor(ctx.rng() * LINES.length)];
    if (l.key === lastKey) l = LINES[(LINES.indexOf(l) + 3) % LINES.length];
    line = l;
    lastKey = l.key;
    subject = l.good ? 'npc' : 'player';
    state = 'write';
    at = time + ctx.tk.warn(WRITE);
    quillTo = newSpot();
    ctx.banner(`AND ${NAME[subject]} ${line.text}…`, line.good ? '#c9b0ff' : '#ffb0a0');
    ctx.sfx('curse-cast');
  };

  const struck = (by: Who): void => {
    const now = ctx.scene.time.now;
    if (state !== 'write' || now < flipAt || favours(by)) return;
    const from = subject;
    subject = line.good ? by : other(by);
    flipAt = now + 450;
    flips.push({ from, at: now });
    quillTo = newSpot();
    ctx.float(quillPos.x, quillPos.y - 30, `STRUCK OUT: ${NAME[from]}`, by === 'player' ? GALE_CSS : '#c9b0ff');
    ctx.sfx('slash');
  };

  const hold = (time: number): void => {
    state = 'hold';
    at = time + HOLD;
    const f = fighterOf(ctx, subject);
    ctx.banner(`AND ${NAME[subject]} ${line.text}.`, favours('player') ? GALE_CSS : '#ff9a8a');
    ctx.sfx('judgement');
    if (line.key === 'awe' && alive(f)) ctx.root(f, 1700);
    if (line.key === 'star') {
      stars = [0, 1, 2].map((i) => ({ x: f.x, y: f.y, hitAt: time + 900 + i * 1100, done: false }));
    }
  };

  const active = (k: Key, w: Who): boolean => state === 'hold' && line.key === k && subject === w;

  return {
    update(time, dt) {
      const d = stepOf(dt);
      if (!quill) {
        quill = ctx.target({ x: quillPos.x, y: quillPos.y, r: 24, passThrough: true, onStruck: (by) => struck(by) });
        at = time + 2800;
        ctx.banner('THE STORY IS WRITTEN AS YOU FIGHT — STRIKE THE QUILL', GALE_CSS);
      }
      // The quill glides to where it is going; outside a line it rests over the book.
      const goal = state === 'write' ? quillTo : { x: book.x + 60, y: book.y - 60 };
      quillPos = { x: quillPos.x + (goal.x - quillPos.x) * Math.min(1, d * 4), y: quillPos.y + (goal.y - quillPos.y) * Math.min(1, d * 4) };
      quill.moveTo(quillPos.x, quillPos.y);
      if (state === 'pause' && time >= at) begin(time);
      else if (state === 'write' && time >= at) hold(time);
      else if (state === 'hold') {
        // The star line: three stars hunt the subject's footprints, one after another.
        for (const s of stars) {
          if (s.done) continue;
          const f = fighterOf(ctx, subject);
          if (time < s.hitAt - 900 + 300 && alive(f)) { s.x = f.x; s.y = f.y; }
          if (time >= s.hitAt) {
            s.done = true;
            ctx.sfx('meteor');
            for (const w of WHO) {
              const g = fighterOf(ctx, w);
              if (alive(g) && dist(g.x, g.y, s.x, s.y) < STAR_R) ctx.hit(g, STAR_DMG, g.x, g.y);
            }
          }
        }
        if (line.key === 'mended') { const f = fighterOf(ctx, subject); if (alive(f)) ctx.heal(f, 4 * d); }
        if (time >= at) { state = 'pause'; at = time + PAUSE; stars = []; }
      }
      while (flips.length && time - flips[0].at > 900) flips.shift();
    },
    playerSpeedMult() { return active('slow', 'player') ? 0.6 : active('swift', 'player') ? 1.4 : 1; },
    npcSpeedMult() { return active('slow', 'npc') ? 0.6 : active('swift', 'npc') ? 1.4 : 1; },
    playerTakenMult() {
      return (active('soft', 'npc') ? 0.6 : 1) * (active('sword', 'npc') ? 1.35 : 1) * (active('awe', 'player') ? 1.15 : 1);
    },
    npcTakenMult() {
      return (active('soft', 'player') ? 0.6 : 1) * (active('sword', 'player') ? 1.35 : 1) * (active('awe', 'npc') ? 1.15 : 1);
    },
    playerCooldownRate() { return active('forgot', 'player') ? 0.4 : 1; },
    npcCooldownRate() { return active('forgot', 'npc') ? 0.4 : 1; },
    npcSeek() {
      const n = ctx.npc;
      if (state === 'write' && !favours('npc')) return { ...quillPos };
      if (state === 'hold' && line.key === 'star' && subject === 'npc') {
        for (const s of stars) if (!s.done && dist(n.x, n.y, s.x, s.y) < STAR_R + 20) return { x: clampN(n.x + (n.x < s.x ? -130 : 130), 60, ctx.W - 60), y: n.y };
      }
      return null;
    },
    destroy() { quill?.remove(); quill = null; },
    drawGround(g, time) {
      const bx = book.x, by = book.y;
      // The book: two great pages of black glass on a lectern-slab, ruled in pale air-light.
      g.fillStyle(0x000000, 0.4); g.fillEllipse(bx, by + 46, 360, 40);
      g.fillStyle(OBS.glass, 1); g.fillRoundedRect(bx - 170, by - 40, 340, 90, 8);
      for (const side of [-1, 1]) {
        g.fillStyle(OBS.facet, 1);
        g.fillPoints([pt(bx, by - 46), pt(bx + side * 160, by - 54), pt(bx + side * 164, by + 38), pt(bx, by + 44)], true);
        g.lineStyle(1, OBS.edge, 0.7);
        g.strokePoints([pt(bx, by - 46), pt(bx + side * 160, by - 54), pt(bx + side * 164, by + 38), pt(bx, by + 44)], true);
        for (let r = 0; r < 7; r++) {
          const ly = by - 38 + r * 11;
          const written = side < 0 || state !== 'pause' ? 1 : 0.4;
          g.lineStyle(1.2, GALE, 0.35 * written);
          for (let w = 0; w < 5; w++) {
            const lx = bx + side * (14 + w * 28);
            g.lineBetween(lx, ly + Math.sin(r * 3 + w) * 1.5, lx + side * (14 + ((r * 7 + w * 3) % 10)), ly);
          }
        }
      }
      g.lineStyle(2, OBS.edge, 0.9); g.lineBetween(bx, by - 46, bx, by + 44);
      // A ribbon marker hanging off the spine.
      g.fillStyle(OBS.seam, 0.9); g.fillRect(bx - 3, by + 40, 6, 26);
      g.fillTriangle(bx - 3, by + 66, bx + 3, by + 66, bx, by + 60);
      // While a line is written, the right page fills with it, stroke by stroke.
      if (state === 'write') {
        const k = clampN(1 - (at - time) / ctx.tk.warn(WRITE), 0, 1);
        const n = Math.floor(k * 18);
        for (let i = 0; i < n; i++) {
          const r = Math.floor(i / 6), c = i % 6;
          const lx = bx + 16 + c * 24, ly = by - 30 + r * 16;
          g.lineStyle(2, line.good ? OBS.seamLit : GALE_LIT, 0.95);
          g.beginPath(); g.arc(lx, ly, 5, Math.PI * (0.2 + (i % 3) * 0.3), Math.PI * (1.4 + (i % 2) * 0.4), false); g.strokePath();
        }
        // The name, struck out wherever the quill was struck.
        for (const fl of flips) {
          const kk = clampN((time - fl.at) / 300, 0, 1);
          g.lineStyle(3, 0xffffff, 0.9); g.lineBetween(bx + 12, by - 34, bx + 12 + 60 * kk, by - 26);
        }
      }
      // A page turning between lines.
      if (state === 'pause') {
        const k = clampN(1 - (at - time) / PAUSE, 0, 1);
        const px = bx + Math.cos(k * Math.PI) * 160;
        g.fillStyle(OBS.sheen, 0.7 * Math.sin(k * Math.PI));
        g.fillPoints([pt(bx, by - 46), pt(px, by - 54 - Math.sin(k * Math.PI) * 30), pt(px, by + 38 - Math.sin(k * Math.PI) * 30), pt(bx, by + 44)], true);
      }
      // Falling-star marks for the star line.
      for (const s of stars) {
        if (s.done) continue;
        const k = clampN(1 - (s.hitAt - time) / 900, 0, 1);
        if (time < s.hitAt - 900) continue;
        g.fillStyle(OBS.star, 0.08 + k * 0.14); g.fillCircle(s.x, s.y, STAR_R);
        g.lineStyle(2, OBS.star, 0.9); g.strokeCircle(s.x, s.y, STAR_R);
        g.beginPath(); g.arc(s.x, s.y, STAR_R - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.lineStyle(4, OBS.starDeep, 0.8); g.strokePath();
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      // Ink running from the quill down to the page while it writes.
      if (state === 'write') {
        for (let i = 0; i < 8; i++) {
          const ph = (t * 1.6 + i / 8) % 1;
          const x = quillPos.x + (book.x + 60 - quillPos.x) * ph + Math.sin(ph * 9 + i) * 10;
          const y = quillPos.y + (book.y - 20 - quillPos.y) * ph - Math.sin(ph * Math.PI) * 40;
          g.fillStyle(line.good ? OBS.seamLit : GALE_LIT, 0.7 * (1 - ph)); g.fillCircle(x, y, 2.5);
        }
        g.lineStyle(2, favours('player') ? GALE : OBS.seamLit, 0.6 + 0.3 * Math.sin(t * 8));
        g.strokeCircle(quillPos.x, quillPos.y, 30);
      }
      drawQuill(g, quillPos.x, quillPos.y, t, state === 'write');
      // The quill's flight path after a strike: a scratch of ink across the air.
      for (const fl of flips) {
        const k = (time - fl.at) / 900;
        g.lineStyle(2, 0xffffff, 0.6 * (1 - k)); g.strokeCircle(quillPos.x, quillPos.y, 20 + k * 40);
      }
      // Over the line's subject while it holds: a ribbon of manuscript, pale if it is a blessing,
      // violet if it is a curse.
      if (state === 'hold') {
        const f = fighterOf(ctx, subject);
        if (alive(f)) {
          const bad = !line.good;
          const c = bad ? OBS.seam : GALE;
          const y = f.y - 56 + Math.sin(t * 2.5) * 2;
          g.fillStyle(OBS.glass, 0.9); g.fillRoundedRect(f.x - 24, y - 7, 48, 14, 3);
          g.lineStyle(1.5, c, 1); g.strokeRoundedRect(f.x - 24, y - 7, 48, 14, 3);
          for (let i = 0; i < 4; i++) { g.lineStyle(1.5, c, 0.9); g.lineBetween(f.x - 18 + i * 10, y, f.x - 12 + i * 10, y - 2); }
          if (line.key === 'mended') { g.fillStyle(GALE_LIT, 0.25); g.fillCircle(f.x, f.y, 30 + Math.sin(t * 6) * 4); }
          if (line.key === 'slow' || line.key === 'awe') { g.lineStyle(2, c, 0.6); g.strokeEllipse(f.x, f.y + 14, 50, 16); }
        }
      }
      // A falling star, streaking down onto its mark in the last half-second.
      for (const s of stars) {
        if (s.done) continue;
        const k = clampN(1 - (s.hitAt - time) / 500, 0, 1);
        if (k <= 0) continue;
        const sx = s.x + (1 - k) * 160, sy = s.y - (1 - k) * 420;
        g.lineStyle(4, OBS.star, 0.6); g.lineBetween(sx, sy, sx + 50, sy - 120);
        g.fillStyle(OBS.starCore, 1); g.fillCircle(sx, sy, 7);
      }
    },
    drawHud(g) {
      if (state === 'pause') return;
      const cx = ctx.W / 2, cy = ctx.top + 20;
      hudPlate(g, cx, cy, 240, 26);
      for (const w of WHO) {
        const x = cx + (w === 'player' ? -60 : 60);
        sideMark(g, x, cy, w === 'player');
        if (subject === w) {
          g.lineStyle(2, line.good ? GALE_LIT : OBS.seamLit, 1); g.strokeCircle(x, cy, 11);
        } else {
          g.lineStyle(2, 0xffffff, 0.7); g.lineBetween(x - 9, cy - 9, x + 9, cy + 9);
        }
      }
      g.lineStyle(2, OBS.edge, 0.9); g.lineBetween(cx - 12, cy + 8, cx + 12, cy - 8);
      g.fillStyle(GALE, 0.9); g.fillTriangle(cx - 12, cy + 8, cx - 8, cy + 8, cx - 12, cy + 4);
    },
  };
};

/** Shorthand for a Geom point (fillPoints wants them). */
function pt(x: number, y: number): Phaser.Geom.Point {
  return { x, y } as Phaser.Geom.Point;
}

/** The censor's quill: a long feather of black glass with a pale-blue vane, nib down, bobbing. */
function drawQuill(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number, writing: boolean): void {
  const bob = Math.sin(t * 2.2) * 4;
  const tilt = writing ? Math.sin(t * 9) * 0.12 : 0.1;
  const ax = Math.sin(0.5 + tilt), ay = -Math.cos(0.5 + tilt);
  const nx = x, ny = y + 26 + bob;
  const tx = nx + ax * 78, ty = ny + ay * 78;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(x, y + 60, 40, 8);
  // The vane: two soft blades either side of the shaft.
  const px = -ay, py = ax;
  for (const s of [-1, 1]) {
    g.fillStyle(s < 0 ? OBS.facet : OBS.sheen, 0.95);
    g.fillTriangle(nx + ax * 18, ny + ay * 18, tx, ty, nx + ax * 50 + px * s * 16, ny + ay * 50 + py * s * 16);
    g.lineStyle(1, GALE, 0.55);
    for (let i = 0; i < 5; i++) {
      const f = 0.3 + i * 0.13;
      const sx = nx + ax * 78 * f, sy = ny + ay * 78 * f;
      g.lineBetween(sx, sy, sx + px * s * 12 * (1 - Math.abs(f - 0.6)) + ax * 6, sy + py * s * 12 * (1 - Math.abs(f - 0.6)) + ay * 6);
    }
  }
  g.lineStyle(2, OBS.edge, 1); g.lineBetween(nx, ny, tx, ty);
  // The nib: a hot point of air-light, dripping when it writes.
  g.fillStyle(OBS.glass, 1); g.fillTriangle(nx - px * 4, ny - py * 4, nx + px * 4, ny + py * 4, nx - ax * 10, ny - ay * 10);
  g.fillStyle(GALE_LIT, 1); g.fillCircle(nx - ax * 9, ny - ay * 9, 2.2);
  if (writing) { g.fillStyle(GALE_LIT, 0.5); g.fillCircle(nx - ax * 9, ny - ay * 9 + ((t * 60) % 14), 1.6); }
}

export const APPROVED_ENDING: GimmickDef = {
  id: 'bench-air-approved-ending',
  rules: 'The story is written as the fight goes, line by line, and each line holds. Strike the quill as it writes to rewrite the line in your favour.',
  make: approvedEnding,
};
