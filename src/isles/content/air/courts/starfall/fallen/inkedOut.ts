import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, glow, mulberry, type G } from '../../../../../art/IsleArt';
import { SF, alive, clamp, dist, inlayStar } from '../palette';
import { fallenId } from '../../../../meteor/spec';

/**
 * Inked Out — Night-Clerk Sable Vantress, in the star's telling the Registry clerk who did the
 * Prince's inking by lamplight, so the Registrar never had to watch.
 *
 * The fight is fought on the Ledger of Stars itself, laid open across the floor: six brass
 * star-plaques set into the page, each one a household's star. A lit plaque keeps whoever stands
 * on it (blows land 30% softer). Vantress inks them out one at a time — her quill scratches over a
 * plaque and a wet blot spreads across it. While the ink is wet, strike the plaque and you sand
 * it: the star is saved and the wet ink is flung off the page in a splash that roots and hurts
 * everyone near it *but* the one who sanded it — the exploit: let her stand on her own blot.
 * Left to dry, the plaque is inked out: a pool of black that grips feet and stains for a while.
 *
 * At half her pen turns to the margin. From then on every plaque that dries writes a stroke
 * against YOUR name; three strokes and you are struck off (silenced, and it hurts). Sanding a
 * blot scratches a stroke back out. The bot sits on lit plaques away from the pen, and walks to
 * a wet blot to sand it whenever you are standing close enough to be splashed.
 */

const ID = fallenId('starfall', 'inked-out');
const PLAQUE_R = 46;
const WET_MS = 2600;
const MARK_EVERY = 3300;
const DRY_MS = 9000;
const SPLASH_R = 120;
const SPLASH_DMG = 18;
const POOL_TICK = 5;
const STRIKE_OFF_DMG = 20;
const KEEP = 0.7;

type State = 'lit' | 'wet' | 'inked';
/** One household star set into the page. */
interface Plaque {
  x: number; y: number; state: State; since: number; seed: number;
  target: StrikeTarget | null; inside: Set<Fighter>; lastGrip: Map<Fighter, number>;
}
/** Ink thrown off a sanded plaque, for the art. */
interface Splash { x: number; y: number; at: number; seed: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cols = [W * 0.24, W * 0.5, W * 0.76];
  const rows = [top + (H - top) * 0.3, top + (H - top) * 0.72];
  const plaques: Plaque[] = [];
  for (const y of rows) for (const x of cols) {
    plaques.push({ x, y, state: 'lit', since: 0, seed: Math.floor(rng() * 1e6), target: null, inside: new Set(), lastGrip: new Map() });
  }
  const splashes: Splash[] = [];
  let nextMark = -1;
  let lastTick = 0;
  let margin = false;
  let strokes = 0;
  let now = 0;

  const on = (f: Fighter, p: Plaque, r = PLAQUE_R): boolean => alive(f) && dist(f.x, f.y, p.x, p.y) < r;
  const kept = (f: Fighter): boolean => plaques.some((p) => p.state === 'lit' && on(f, p));

  /** Sand a wet blot: the star is saved and the ink flies at everyone but the sander. */
  function sand(p: Plaque, by: 'player' | 'npc'): void {
    if (p.state !== 'wet') return;
    p.target?.remove(); p.target = null;
    p.state = 'lit'; p.since = now;
    splashes.push({ x: p.x, y: p.y, at: now, seed: Math.floor(rng() * 1e6) });
    ctx.sfx('splash');
    const spared = by === 'player' ? player : npc;
    for (const f of [player, npc]) {
      if (f === spared || !on(f, p, SPLASH_R)) continue;
      ctx.hit(f, SPLASH_DMG, f.x, f.y);
      ctx.root(f, 700);
    }
    if (by === 'player' && margin && strokes > 0) strokes--;
  }

  /** The quill goes to the lit plaque nearest you, always leaving two lit. */
  function mark(): void {
    const lit = plaques.filter((p) => p.state === 'lit');
    if (lit.length <= 2) return;
    lit.sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y));
    const p = lit[0];
    p.state = 'wet'; p.since = now;
    p.target = ctx.target({ x: p.x, y: p.y, r: 40, passThrough: true, onStruck: (by) => sand(p, by) });
    ctx.sfx('curse-cast');
  }

  /** The blot dried: the star is out, and in the margin a stroke goes down against your name. */
  function dry(p: Plaque): void {
    p.target?.remove(); p.target = null;
    p.state = 'inked'; p.since = now;
    p.inside.clear();
    ctx.sfx('slime-splat');
    if (!margin) return;
    strokes++;
    if (strokes >= 3 && alive(player)) {
      strokes = 0;
      ctx.hit(player, STRIKE_OFF_DMG, player.x, player.y);
      ctx.silence(player, 2000);
      ctx.banner('STRUCK OFF THE LEDGER', '#e8dcc0');
      ctx.sfx('judgement');
    }
  }

  return {
    update(time) {
      now = time;
      if (nextMark < 0) nextMark = time + 1800;
      if (!margin && npc.hp < npc.maxHp * 0.5) {
        margin = true;
        ctx.banner('SHE WRITES IN THE MARGIN', '#e8dcc0');
        ctx.sfx('curse-cast');
      }
      if (time >= nextMark) { nextMark = time + (margin ? MARK_EVERY - 500 : MARK_EVERY); mark(); }
      for (const p of plaques) {
        if (p.state === 'wet' && time - p.since >= WET_MS) dry(p);
        else if (p.state === 'inked' && time - p.since >= DRY_MS) { p.state = 'lit'; p.since = time; ctx.sfx('sparkle'); }
        if (p.state !== 'inked') continue;
        // The ink grips whoever steps into it, once per step-in.
        for (const f of [player, npc]) {
          const inNow = on(f, p, PLAQUE_R + 4);
          if (inNow && !p.inside.has(f) && time - (p.lastGrip.get(f) ?? -9999) > 1600) {
            p.lastGrip.set(f, time);
            ctx.root(f, 600);
          }
          if (inNow) p.inside.add(f); else p.inside.delete(f);
        }
      }
      if (time - lastTick >= 500) {
        lastTick = time;
        for (const p of plaques) if (p.state === 'inked') for (const f of [player, npc]) if (on(f, p, PLAQUE_R + 4)) ctx.hit(f, POOL_TICK, f.x, f.y);
      }
      for (let i = splashes.length - 1; i >= 0; i--) if (time - splashes[i].at > 900) splashes.splice(i, 1);
    },

    playerTakenMult: () => (kept(player) ? KEEP : 1),
    npcTakenMult: () => (kept(npc) ? KEEP : 1),

    npcSeek() {
      // A wet blot you are standing by: go and sand it in your face.
      for (const p of plaques) {
        if (p.state === 'wet' && now - p.since < WET_MS - 300 && on(player, p, SPLASH_R - 10)) return { x: p.x + (npc.x < p.x ? -30 : 30), y: p.y };
      }
      // Otherwise sit on a lit star the pen is not near, away from the black.
      let best: Plaque | null = null, bd = Infinity;
      for (const p of plaques) {
        if (p.state !== 'lit') continue;
        const d = dist(npc.x, npc.y, p.x, p.y) - dist(player.x, player.y, p.x, p.y) * 0.3;
        if (d < bd) { bd = d; best = p; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },

    drawGround(g, time) {
      drawPage(g, W, H, top);
      for (const p of plaques) drawPlaque(g, p, time);
      for (const s of splashes) drawSplash(g, s, time);
    },

    drawAir(g, time) {
      // The quill, scratching over each wet blot.
      for (const p of plaques) if (p.state === 'wet') drawQuill(g, p, time);
    },

    drawHud(g) {
      if (!margin) return;
      // A slip of the margin: your name's line, and the strokes against it.
      const x = W / 2 - 70, y = top + 6;
      g.fillStyle(SF.parchment, 0.95); g.fillRoundedRect(x, y, 140, 26, 4);
      g.lineStyle(1, 0xb03030, 0.8); g.lineBetween(x + 14, y + 2, x + 14, y + 24);
      g.lineStyle(1, SF.lapis, 0.5); g.lineBetween(x + 20, y + 18, x + 132, y + 18);
      for (let i = 0; i < 3; i++) {
        const sx = x + 40 + i * 28;
        if (i < strokes) { g.lineStyle(4, SF.ink, 1); g.lineBetween(sx, y + 21, sx + 14, y + 6); }
        else { g.lineStyle(1, SF.ink, 0.25); g.lineBetween(sx, y + 21, sx + 14, y + 6); }
      }
    },

    destroy() { for (const p of plaques) p.target?.remove(); },
  };
}

/** The open Ledger: a vast parchment spread, ruled in faded lapis, the red margin, the gutter. */
function drawPage(g: G, W: number, H: number, top: number): void {
  const x0 = 34, y0 = top + 14, w = W - 68, h = H - top - 34;
  g.fillStyle(0x000000, 0.3); g.fillRect(x0 + 6, y0 + 8, w, h);
  g.fillStyle(dim(SF.parchment, 0.12), 0.9); g.fillRect(x0, y0, w, h);
  g.fillStyle(SF.parchment, 0.55); g.fillRect(x0 + 10, y0 + 8, w / 2 - 22, h - 16);
  g.fillStyle(SF.parchment, 0.55); g.fillRect(W / 2 + 12, y0 + 8, w / 2 - 22, h - 16);
  // The gutter where the two pages meet, and its stitching.
  g.fillStyle(dim(SF.parchment, 0.4), 0.6); g.fillRect(W / 2 - 8, y0, 16, h);
  g.lineStyle(1, SF.brassDark, 0.6);
  for (let y = y0 + 20; y < y0 + h - 10; y += 34) g.lineBetween(W / 2 - 3, y, W / 2 + 3, y + 8);
  // Ruled lines, one per household, and the red margins.
  g.lineStyle(1, SF.lapis, 0.22);
  for (let y = y0 + 30; y < y0 + h - 6; y += 22) { g.lineBetween(x0 + 14, y, W / 2 - 14, y); g.lineBetween(W / 2 + 14, y, x0 + w - 14, y); }
  g.lineStyle(1.5, 0xb03030, 0.4);
  g.lineBetween(x0 + 70, y0 + 8, x0 + 70, y0 + h - 8); g.lineBetween(W / 2 + 70, y0 + 8, W / 2 + 70, y0 + h - 8);
  // Old entries: faint inked names (scribbles, not words) and the stars already struck through.
  const r = mulberry(91);
  for (let y = y0 + 26; y < y0 + h - 10; y += 22) {
    for (const base of [x0 + 80, W / 2 + 80]) {
      let x = base;
      const end = base + 60 + r() * 140;
      g.lineStyle(1, SF.ink, 0.18);
      while (x < end) { const nx = x + 4 + r() * 6; g.lineBetween(x, y - 2 - r() * 4, nx, y - 1 - r() * 3); x = nx; }
      if (r() < 0.3) { g.lineStyle(2, SF.ink, 0.35); g.lineBetween(base - 4, y - 4, end + 6, y - 4); }
    }
  }
}

/** A brass star-plaque set into the page: lit, being inked, or drowned in black. */
function drawPlaque(g: G, p: Plaque, time: number): void {
  const t = time / 1000;
  g.fillStyle(SF.brassDark, 1); g.fillRoundedRect(p.x - 40, p.y - 30, 80, 60, 10);
  g.fillStyle(SF.brass, 1); g.fillRoundedRect(p.x - 36, p.y - 27, 72, 54, 8);
  g.fillStyle(SF.brassLit, 0.6); g.fillRoundedRect(p.x - 34, p.y - 26, 68, 10, 5);
  for (const [dx, dy] of [[-30, -21], [30, -21], [-30, 21], [30, 21]]) { g.fillStyle(SF.brassDark, 1); g.fillCircle(p.x + dx, p.y + dy, 2.2); }
  if (p.state === 'lit') {
    const pulse = 0.8 + Math.sin(t * 2 + p.seed) * 0.2;
    glow(g, p.x, p.y, PLAQUE_R + 6, SF.starGold, 0.05 * pulse, 4);
    g.lineStyle(2, SF.starGold, 0.35 * pulse); g.strokeCircle(p.x, p.y, PLAQUE_R);
    inlayStar(g, p.x, p.y, 18, SF.leaf, 1);
    inlayStar(g, p.x, p.y, 10, SF.starHot, 0.6 * pulse);
    return;
  }
  inlayStar(g, p.x, p.y, 18, dim(SF.leaf, 0.5), 1);
  const rr = mulberry(p.seed);
  if (p.state === 'wet') {
    // A glossy blot spreading from where the nib touched, with runs creeping down the page.
    const k = clamp((time - p.since) / WET_MS, 0, 1);
    const R = 12 + k * (PLAQUE_R - 6);
    for (let i = 0; i < 9; i++) {
      const a = rr() * Math.PI * 2, d = rr() * R * 0.55;
      g.fillStyle(SF.ink, 0.9); g.fillCircle(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.8, R * (0.35 + rr() * 0.3));
    }
    g.fillStyle(SF.ink, 0.92); g.fillCircle(p.x, p.y, R * 0.7);
    for (let i = 0; i < 3; i++) { const dx = (rr() - 0.5) * R; g.fillStyle(SF.ink, 0.85); g.fillRoundedRect(p.x + dx - 2.5, p.y, 5, R * 0.6 + k * 16 * rr(), 2.5); }
    g.fillStyle(0x6a6aa0, 0.55); g.fillEllipse(p.x - R * 0.3, p.y - R * 0.3, R * 0.5, R * 0.22);
    // The warning: the dry-line closing round it.
    g.lineStyle(2, SF.parchment, 0.7); g.beginPath(); g.arc(p.x, p.y, PLAQUE_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k)); g.strokePath();
    return;
  }
  // Inked out: a matte pool, its edges dried to a crust and cracked, the star gone under it.
  const fade = clamp(1 - (time - p.since - (DRY_MS - 1200)) / 1200, 0, 1);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + rr() * 0.4, d = PLAQUE_R * (0.55 + rr() * 0.35);
    g.fillStyle(SF.ink, 0.95 * fade); g.fillCircle(p.x + Math.cos(a) * d * 0.6, p.y + Math.sin(a) * d * 0.6, d * 0.5);
  }
  g.fillStyle(SF.ink, fade); g.fillCircle(p.x, p.y, PLAQUE_R * 0.7);
  g.lineStyle(1, 0x2a2a40, 0.8 * fade);
  for (let i = 0; i < 7; i++) { const a = rr() * Math.PI * 2; g.lineBetween(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14, p.x + Math.cos(a + 0.3) * 40, p.y + Math.sin(a + 0.3) * 40); }
}

/** Ink flung off a sanded plaque, and the gold sand still settling on it. */
function drawSplash(g: G, s: Splash, time: number): void {
  const k = clamp((time - s.at) / 900, 0, 1);
  const rr = mulberry(s.seed);
  for (let i = 0; i < 16; i++) {
    const a = rr() * Math.PI * 2, d = 20 + k * SPLASH_R * (0.6 + rr() * 0.5);
    g.fillStyle(SF.ink, 0.9 * (1 - k * 0.6)); g.fillCircle(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 3 + rr() * 5);
  }
  g.lineStyle(2, SF.ink, 0.5 * (1 - k)); g.strokeCircle(s.x, s.y, SPLASH_R * k);
  for (let i = 0; i < 24; i++) {
    const a = rr() * Math.PI * 2, d = rr() * 34;
    g.fillStyle(SF.leaf, 0.9 * (1 - k)); g.fillCircle(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - (1 - k) * 18, 1.3);
  }
}

/** Vantress's quill over a wet blot: a long grey feather, a steel nib, a bead of ink at the tip. */
function drawQuill(g: G, p: Plaque, time: number): void {
  const t = time / 1000;
  const tx = p.x + Math.sin(t * 11) * 10, ty = p.y + Math.cos(t * 7) * 6 - 4;
  const bx = tx + 46, by = ty - 70;
  g.fillStyle(0x000000, 0.25); g.fillEllipse(tx + 20, ty + 6, 46, 8);
  g.lineStyle(2, 0x5a5468, 1); g.lineBetween(tx, ty, bx, by);
  for (let i = 0; i < 9; i++) {
    const k = 0.3 + i * 0.075;
    const px = tx + (bx - tx) * k, py = ty + (by - ty) * k;
    g.lineStyle(2, i % 2 ? 0xb8b0c8 : 0x9a90b0, 0.9);
    g.lineBetween(px, py, px - 14 + i * 0.6, py - 4 - i * 0.4); g.lineBetween(px, py, px + 10 - i * 0.4, py + 6 - i * 0.6);
  }
  g.fillStyle(SF.silver, 1); g.fillTriangle(tx, ty, tx + 4, ty - 9, tx + 9, ty - 5);
  g.fillStyle(SF.ink, 1); g.fillCircle(tx, ty + 1, 2.5);
}

export const FALLEN_INKED_OUT: GimmickDef = {
  id: ID,
  rules: 'Lit star-plaques soften blows. She inks them: strike a wet blot to sand it and splash everyone else near. At half, dried blots strike your name.',
  make,
};
