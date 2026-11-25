import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, stroke, type G } from '../../../../../art/IsleArt';
import { INK, MASK_TEAL, PAPER, PAPER_DARK, TIMBER, TIMBER_DARK, TIMBER_LIT, WAX, WAX_DARK, WAX_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Spelled Out — Gate-Clerk Wilmot Inkle of the Name Booth, who in the King's telling wrote down
 * every name that came in off the duckboards, and wrote the stranger's as NOBODY, because a
 * nobody can be posted without anyone asking after them.
 *
 * His yard is strewn with great wooden type-sorts, one letter each, and the register is open.
 * Tread on a sort and the clerk writes its letter down — into your *foe's* name if it is the
 * letter their name wants next, otherwise into *your own* if it is yours. So the sort of his next
 * letter (lit teal) is the one to run for, and the sort of your own next letter (hatched red) is
 * a step to keep off. Finish a name and its owner is POSTED: silenced, taking more for a while,
 * and the great stamp comes down where they stand (a beat to step out).
 *
 * Strike a sort and it skids away from you — kick his own next letter under his feet and he
 * spells himself. Every so often the clerk reshuffles his case and the sorts slide to new places;
 * past half he does it far more often.
 */

const ID = fallenId('cloak', 'spelled-out');
const YOURS = 'NOBODY';
const HIS = 'WILMOT';
const TILE_R = 26;
const STAMP_R = 62;
const STAMP_WARN = 800;
const POSTED_MS = 6000;
const SHUFFLE = 11000;
const SHUFFLE_LATE = 6500;
const SLIDE_MS = 900;
const LETTERS = ['N', 'O', 'B', 'O', 'D', 'Y', 'W', 'I', 'L', 'M', 'T', 'O'];

interface Sort {
  ch: string; x: number; y: number; vx: number; vy: number;
  from: Pt; to: Pt; slideAt: number;
  on: Set<Fighter>;
  target: StrikeTarget;
}
interface Stamp { x: number; y: number; at: number; who: Fighter; fell: boolean }

/** Strokes of each letter on a unit box (x right, y down). O is drawn as a ring. */
const GLYPHS: Record<string, [number, number][][]> = {
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  B: [[[0, 1], [0, 0], [0.62, 0], [0.86, 0.12], [0.86, 0.36], [0.62, 0.48], [0, 0.48]], [[0.62, 0.48], [0.95, 0.62], [0.95, 0.86], [0.7, 1], [0, 1]]],
  D: [[[0, 0], [0, 1], [0.55, 1], [0.95, 0.72], [0.95, 0.28], [0.55, 0], [0, 0]]],
  Y: [[[0, 0], [0.5, 0.5], [1, 0]], [[0.5, 0.5], [0.5, 1]]],
  W: [[[0, 0], [0.25, 1], [0.5, 0.42], [0.75, 1], [1, 0]]],
  I: [[[0.5, 0], [0.5, 1]], [[0.2, 0], [0.8, 0]], [[0.2, 1], [0.8, 1]]],
  L: [[[0, 0], [0, 1], [0.9, 1]]],
  M: [[[0, 1], [0, 0], [0.5, 0.62], [1, 0], [1, 1]]],
  T: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]],
};

/** One letter, `s` px tall, centred on (x, y). */
function glyph(g: G, ch: string, x: number, y: number, s: number, w: number, color: number, a = 1): void {
  if (ch === 'O') { g.lineStyle(w, color, a); g.strokeEllipse(x, y, s * 0.78, s); return; }
  const box = s * 0.72;
  for (const line of GLYPHS[ch] ?? []) stroke(g, line.map(([u, v]) => ({ x: x - box / 2 + u * box, y: y - s / 2 + v * s })), w, color, a);
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const sorts: Sort[] = [];
  const stamps: Stamp[] = [];
  /** How far each name is written. */
  const done = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const postedUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let late = false;
  let nextShuffle = 0;
  let started = false;

  const nameOf = (f: Fighter): string => (f === player ? YOURS : HIS);
  const foeOf = (f: Fighter): Fighter => (f === player ? npc : player);
  const nextOf = (f: Fighter): string => nameOf(f)[done.get(f) ?? 0] ?? '';

  /** Twelve spread spots: a jittered 4×3 grid, shuffled. */
  function spots(): Pt[] {
    const out: Pt[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      out.push({ x: W * (0.14 + c * 0.24) + (rng() - 0.5) * 90, y: top + (H - top) * (0.2 + r * 0.3) + (rng() - 0.5) * 70 });
    }
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }

  const start = spots();
  LETTERS.forEach((ch, i) => {
    const p = start[i];
    const s: Sort = {
      ch, x: p.x, y: p.y, vx: 0, vy: 0, from: p, to: p, slideAt: -1e9, on: new Set(),
      target: ctx.target({ x: p.x, y: p.y, r: 22, passThrough: true, onStruck: (by) => kick(s, by === 'player' ? player : npc) }),
    };
    sorts.push(s);
  });

  function kick(s: Sort, by: Fighter): void {
    const d = Math.max(1, dist(by.x, by.y, s.x, s.y));
    s.vx = ((s.x - by.x) / d) * 460; s.vy = ((s.y - by.y) / d) * 460;
    s.slideAt = -1e9;
    ctx.sfx('rock-throw');
  }

  const sliding = (s: Sort, time: number): boolean => time - s.slideAt < SLIDE_MS;

  function post(f: Fighter, time: number): void {
    done.set(f, 0);
    postedUntil.set(f, time + POSTED_MS);
    ctx.silence(f, 1500);
    stamps.push({ x: f.x, y: f.y, at: time, who: f, fell: false });
    ctx.banner(f === player ? 'YOU ARE POSTED — NOBODY' : 'THE CLERK IS POSTED — WILMOT INKLE', f === player ? '#ff9a9a' : '#9ff0e8');
    ctx.sfx('judgement');
  }

  function tread(f: Fighter, s: Sort, time: number): void {
    const foe = foeOf(f);
    let who: Fighter | null = null;
    if (nextOf(foe) === s.ch) who = foe;
    else if (nextOf(f) === s.ch) who = f;
    if (!who) return;
    done.set(who, (done.get(who) ?? 0) + 1);
    ctx.sfx('stab');
    ctx.flash(s.x, s.y, who === player ? WAX_LIT : MASK_TEAL);
    if ((done.get(who) ?? 0) >= nameOf(who).length) post(who, time);
  }

  return {
    update(time, dt) {
      const st = stepDt(dt);
      if (!started) { started = true; nextShuffle = time + SHUFFLE; }
      if (!late && npc.hp < npc.maxHp * 0.5) {
        late = true;
        nextShuffle = Math.min(nextShuffle, time + 1500);
        ctx.banner('THE CLERK SHAKES OUT HIS CASE', '#f4e2c0');
        ctx.sfx('boss-phase');
      }
      if (time >= nextShuffle) {
        nextShuffle = time + (late ? SHUFFLE_LATE : SHUFFLE);
        const to = spots();
        sorts.forEach((s, i) => { s.from = { x: s.x, y: s.y }; s.to = to[i]; s.slideAt = time; s.vx = 0; s.vy = 0; });
        ctx.sfx('gear-turn');
      }
      for (const s of sorts) {
        if (sliding(s, time)) {
          const k = clamp((time - s.slideAt) / SLIDE_MS, 0, 1), e = k * k * (3 - 2 * k);
          s.x = s.from.x + (s.to.x - s.from.x) * e; s.y = s.from.y + (s.to.y - s.from.y) * e;
        } else if (s.vx || s.vy) {
          s.x += s.vx * st; s.y += s.vy * st;
          const drag = Math.pow(0.04, st);
          s.vx *= drag; s.vy *= drag;
          if (s.x < 50 || s.x > W - 50) s.vx = -s.vx;
          if (s.y < top + 40 || s.y > H - 40) s.vy = -s.vy;
          s.x = clamp(s.x, 50, W - 50); s.y = clamp(s.y, top + 40, H - 40);
          if (Math.hypot(s.vx, s.vy) < 12) { s.vx = 0; s.vy = 0; }
        }
        s.target.moveTo(s.x, s.y);
        for (const f of [player, npc]) {
          const inside = alive(f) && dist(f.x, f.y, s.x, s.y) < TILE_R;
          if (inside && !s.on.has(f)) { s.on.add(f); if (!sliding(s, time)) tread(f, s, time); }
          else if (!inside) s.on.delete(f);
        }
      }
      for (let i = stamps.length - 1; i >= 0; i--) {
        const p = stamps[i];
        if (!p.fell && time >= p.at + tk.warn(STAMP_WARN)) {
          p.fell = true;
          ctx.sfx('stone-slam');
          const f = p.who;
          if (alive(f) && dist(f.x, f.y, p.x, p.y) < STAMP_R) {
            if (f === player) tk.hitPlayer(24, f.x, f.y); else ctx.hit(npc, 42, f.x, f.y);
          }
        }
        if (time - p.at > 3200) stamps.splice(i, 1);
      }
    },

    playerTakenMult: () => (tk.now < (postedUntil.get(player) ?? 0) ? 1.3 : 1),
    npcTakenMult: () => (tk.now < (postedUntil.get(npc) ?? 0) ? 1.35 : 1),

    npcSeek() {
      if (!alive(player)) return null;
      const t = tk.now;
      const stamp = stamps.find((p) => !p.fell && p.who === npc);
      if (stamp) {
        const a = Math.atan2(npc.y - stamp.y, npc.x - stamp.x);
        return { x: tk.clampX(stamp.x + Math.cos(a) * (STAMP_R + 50)), y: tk.clampY(stamp.y + Math.sin(a) * (STAMP_R + 50)) };
      }
      // Run for the sort of the stranger's next letter, round any sort that would spell himself.
      const want = nextOf(player), avoid = nextOf(npc);
      let best: Sort | null = null, bd = Infinity;
      for (const s of sorts) {
        if (s.ch !== want || sliding(s, t)) continue;
        let d = dist(npc.x, npc.y, s.x, s.y);
        for (const o of sorts) {
          if (o.ch !== avoid || o.ch === want) continue;
          const ax = s.x - npc.x, ay = s.y - npc.y, l2 = ax * ax + ay * ay || 1;
          const u = clamp(((o.x - npc.x) * ax + (o.y - npc.y) * ay) / l2, 0, 1);
          if (dist(o.x, o.y, npc.x + ax * u, npc.y + ay * u) < TILE_R + 26) d += 400;
        }
        if (d < bd) { bd = d; best = s; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      const want = nextOf(npc), mine = nextOf(player);
      for (const s of sorts) drawSort(g, s, time, s.ch === want ? 'his' : s.ch === mine ? 'yours' : 'none');
      for (const p of stamps) {
        if (!p.fell) {
          const k = clamp((time - p.at) / tk.warn(STAMP_WARN), 0, 1);
          g.fillStyle(WAX, 0.08 + k * 0.16); g.fillCircle(p.x, p.y, STAMP_R);
          g.lineStyle(2, WAX_LIT, 0.4 + k * 0.5); g.strokeCircle(p.x, p.y, STAMP_R);
          shadow(g, p.x, p.y, STAMP_R * (0.8 + k * 0.9), STAMP_R * (0.4 + k * 0.5), 0.2 + k * 0.25);
        } else {
          // The impression it leaves: the court's eye, in red, fading.
          const a = clamp(1 - (time - p.at - tk.warn(STAMP_WARN)) / 2200, 0, 1);
          drawEyeSeal(g, p.x, p.y, STAMP_R - 8, a);
        }
      }
    },

    drawAir(g, time) {
      for (const p of stamps) {
        if (p.fell) continue;
        const k = clamp((time - p.at) / tk.warn(STAMP_WARN), 0, 1);
        drawStamp(g, p.x, p.y - 30 - (1 - k * k) * 150, 1 - (1 - k) * 0.3);
      }
      for (const f of [player, npc]) {
        if (tk.now >= (postedUntil.get(f) ?? 0) || !alive(f)) continue;
        // A posted bill nailed to the shoulders: the named one's sheet, sealed.
        const x = f.x + 16, y = f.y - 62 + Math.sin(time / 300) * 2;
        g.fillStyle(PAPER, 0.95); g.fillRect(x - 9, y - 11, 18, 22);
        g.lineStyle(1, PAPER_DARK, 1); g.strokeRect(x - 9, y - 11, 18, 22);
        for (let i = 0; i < 3; i++) { g.lineStyle(1, INK, 0.7); g.lineBetween(x - 6, y - 6 + i * 4, x + 6, y - 6 + i * 4); }
        g.fillStyle(WAX, 1); g.fillCircle(x, y + 6, 3);
      }
    },

    drawHud(g, time) {
      // The register: his name above, yours below; written letters in ink, the rest in pencil.
      const cx = W / 2, y0 = top + 14;
      g.fillStyle(PAPER, 0.92); g.fillRoundedRect(cx - 78, y0 - 10, 156, 48, 4);
      g.lineStyle(1, PAPER_DARK, 1); g.strokeRoundedRect(cx - 78, y0 - 10, 156, 48, 4);
      g.lineStyle(1, 0xb08080, 0.6); g.lineBetween(cx - 56, y0 - 10, cx - 56, y0 + 38);
      ([[npc, HIS, y0 + 2, MASK_TEAL], [player, YOURS, y0 + 24, WAX]] as [Fighter, string, number, number][]).forEach(([f, name, y, col]) => {
        g.fillStyle(col, 1); g.fillCircle(cx - 67, y, 4);
        const n = done.get(f) ?? 0;
        for (let i = 0; i < name.length; i++) {
          const x = cx - 40 + i * 18;
          if (i < n) glyph(g, name[i], x, y, 13, 2.2, INK, 1);
          else glyph(g, name[i], x, y, 13, 1, 0x8a8478, 0.45);
          if (i === n) { g.lineStyle(2, col, 0.6 + Math.sin(time / 120) * 0.4); g.lineBetween(x - 6, y + 9, x + 6, y + 9); }
        }
      });
    },

    destroy() { for (const s of sorts) s.target.remove(); },
  };
}

/**
 * A printer's sort as big as a stool, seen from above: a block of end-grain wood, bevelled, its
 * raised letter inked black. A teal halo marks the letter his name wants (tread it); red hatching
 * marks the one yours wants (keep off it).
 */
function drawSort(g: G, s: Sort, time: number, mark: 'his' | 'yours' | 'none'): void {
  const x = s.x, y = s.y, r = 20;
  shadow(g, x, y + r * 0.7, r * 2.3, r * 0.6, 0.3);
  if (mark === 'his') { glow(g, x, y, r * 1.9, MASK_TEAL, 0.07 + Math.sin(time / 160) * 0.03, 3); g.lineStyle(2, MASK_TEAL, 0.8); g.strokeCircle(x, y, r * 1.45); }
  if (mark === 'yours') {
    g.lineStyle(2, WAX_LIT, 0.75); g.strokeCircle(x, y, r * 1.45);
    for (let i = -3; i <= 3; i++) { g.lineStyle(1.5, WAX, 0.45); g.lineBetween(x + i * 8 - 8, y + r * 1.2, x + i * 8 + 8, y - r * 1.2); }
  }
  g.fillStyle(TIMBER_DARK, 1); g.fillRoundedRect(x - r, y - r + 4, r * 2, r * 2, 4);
  g.fillStyle(TIMBER, 1); g.fillRoundedRect(x - r, y - r, r * 2, r * 2, 4);
  g.fillStyle(TIMBER_LIT, 0.8); g.fillRect(x - r + 3, y - r + 2, r * 2 - 6, 3);
  // End-grain rings.
  g.lineStyle(1, TIMBER_DARK, 0.35); g.strokeCircle(x + 6, y + 5, 7); g.strokeCircle(x + 6, y + 5, 12);
  // The raised face, inked.
  g.fillStyle(0xcdb890, 0.5); g.fillRect(x - 12, y - 13, 24, 26);
  glyph(g, s.ch, x + 1, y + 1, 21, 4.5, 0x8a7a5c, 0.6);
  glyph(g, s.ch, x, y, 21, 4.5, INK, 1);
}

/** The great hand-stamp: a turned knob, a long shaft, a block faced with red rubber. */
function drawStamp(g: G, x: number, y: number, a: number): void {
  g.fillStyle(TIMBER_DARK, a); g.fillRect(x - 5, y - 70, 10, 46);
  g.fillStyle(TIMBER_LIT, a); g.fillRect(x - 5, y - 70, 3, 46);
  g.fillStyle(TIMBER, a); g.fillCircle(x, y - 76, 13);
  g.fillStyle(TIMBER_LIT, a * 0.7); g.fillCircle(x - 4, y - 80, 4);
  g.fillStyle(TIMBER, a); g.fillRoundedRect(x - 48, y - 26, 96, 20, 4);
  g.fillStyle(TIMBER_DARK, a); g.fillRect(x - 48, y - 10, 96, 4);
  g.fillStyle(WAX_DARK, a); g.fillRect(x - 46, y - 6, 92, 6);
}

/** The court's posting seal pressed into the cobbles: an eye inside a ring of nails. */
function drawEyeSeal(g: G, x: number, y: number, r: number, a: number): void {
  if (a <= 0) return;
  g.lineStyle(3, WAX, a * 0.8); g.strokeCircle(x, y, r);
  g.lineStyle(2.5, WAX, a * 0.9);
  g.beginPath(); g.arc(x, y + r * 0.55, r * 0.85, -2.3, -0.84, false); g.strokePath();
  g.beginPath(); g.arc(x, y - r * 0.55, r * 0.85, 0.84, 2.3, false); g.strokePath();
  g.fillStyle(WAX, a * 0.9); g.fillCircle(x, y, r * 0.22);
  for (let i = 0; i < 10; i++) { const t = i * 0.628; g.fillStyle(WAX_DARK, a); g.fillCircle(x + Math.cos(t) * (r + 6), y + Math.sin(t) * (r + 6), 2); }
}

export const FALLEN_SPELLED_OUT: GimmickDef = {
  id: ID,
  rules: 'Tread a letter and it is written into your foe\'s name if it is their next, else into yours. Finish a name: posted. Strike a letter to kick it.',
  make,
};
