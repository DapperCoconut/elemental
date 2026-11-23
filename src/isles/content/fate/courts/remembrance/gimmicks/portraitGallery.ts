import type { Fighter } from '../../../../../../entities/Fighter';
import type { StrikeTarget } from '../../../../../../boss/framework/StrikeTargets';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../../art/IsleArt';
import { frame } from '../art';
import { GILT, GILT_LIT, INK, PAPER, SEPIA_DEEP, SEPIA_PALE } from '../palette';
import { alive, asSlot, clamp, dist, fighterColor, segDist, slotOfAbility, stepDt, type Slot } from '../util';

/**
 * Portrait Gallery — Curator Likeness.
 *
 * Empty gilt frames hang round the gallery walls, each with a chalk mark on the boards before it.
 * Stand on a mark and the frame paints you, stroke by stroke; finish, and the painted you steps
 * down out of the frame and fights on its own — it walks after your foe and *repeats your last
 * cast* in chalk and paint, three times over: a click becomes a chalk dart, an E, R or F a splash
 * of paint where the foe stands, a Q a great wet stroke right across the room. Likeness sits for
 * her own portraits the same way, and her painted self does the same to you. A painted double is
 * only paint — two blows and it runs off the canvas; strike a frame while the other fighter is
 * sitting for it and the wet paint smears and they must start again.
 */

const PAINT_MS = 1700;
const SIT_R = 46;
const DOUBLE_EVERY = 2100;
const FRAME_REST = 6500;

interface Frame { x: number; y: number; sx: number; sy: number; w: number; h: number; sitter: 'player' | 'npc' | null; progress: number; restUntil: number; face: number | null; faceUntil: number; target: StrikeTarget | null }

interface Double {
  owner: 'player' | 'npc';
  x: number; y: number;
  slot: Slot;
  nextAt: number;
  left: number;
  wounds: number;
  color: number;
  bornAt: number;
  target: StrikeTarget;
  gone: boolean;
}

interface Splash { kind: 'splash' | 'stroke'; owner: 'player' | 'npc'; x: number; y: number; x2: number; y2: number; at: number; fireAt: number; dmg: number; dealt: boolean; color: number }
interface Dart { owner: 'player' | 'npc'; x: number; y: number; vx: number; vy: number; until: number; color: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const frames: Frame[] = [];
  const mk = (x: number, y: number, sx: number, sy: number, w: number, h: number) =>
    frames.push({ x, y, sx, sy, w, h, sitter: null, progress: 0, restUntil: 0, face: null, faceUntil: 0, target: null });
  // Three on the back wall, one on each side wall.
  for (const x of [200, 480, 760]) mk(x, top + 34, x, top + 110, 64, 56);
  mk(30, 380, 96, 380, 40, 64);
  mk(W - 30, 380, W - 96, 380, 40, 64);
  const doubles: Double[] = [];
  const splashes: Splash[] = [];
  const darts: Dart[] = [];
  const lastSlot: Record<'player' | 'npc', Slot> = { player: 'click', npc: 'e' };
  let now = 0;
  const paintMs = (who: 'player' | 'npc') => (who === 'npc' && ctx.hard ? PAINT_MS * 0.8 : PAINT_MS);

  const fighterOf = (o: 'player' | 'npc'): Fighter => (o === 'player' ? player : npc);
  const foeOf = (o: 'player' | 'npc'): Fighter => (o === 'player' ? npc : player);
  const ownerColor = (o: 'player' | 'npc') => fighterColor(fighterOf(o), o === 'player' ? 0x5ad0c0 : 0xf08aa8);

  for (const f of frames) {
    f.target = ctx.target({
      x: f.x, y: f.y, r: 28, passThrough: true,
      onStruck: (by) => {
        if (!f.sitter || f.sitter === by || f.progress < 0.08) return;
        f.progress = 0;
        ctx.float(f.x, f.y + 36, 'SMEARED', '#efe2c6');
        ctx.sfx('slime-splat');
      },
    });
  }

  function stepOut(fr: Frame, owner: 'player' | 'npc'): void {
    fr.sitter = null; fr.progress = 0; fr.restUntil = now + FRAME_REST;
    fr.face = ownerColor(owner); fr.faceUntil = now + FRAME_REST;
    // One painted double per side: a new portrait replaces the old.
    for (const d of doubles) if (d.owner === owner && !d.gone) { d.gone = true; d.target.remove(); }
    const d: Double = {
      owner, x: fr.sx, y: fr.sy, slot: lastSlot[owner], nextAt: now + 900, left: 3, wounds: 0, color: ownerColor(owner), bornAt: now, gone: false,
      target: ctx.target({
        x: fr.sx, y: fr.sy, r: 22, passThrough: true,
        onStruck: (by) => {
          if (by === owner || d.gone) return;
          d.wounds++;
          ctx.flash(d.x, d.y, d.color);
          if (d.wounds >= 2) { d.gone = true; d.target.remove(); ctx.float(d.x, d.y - 30, 'RUNS OFF THE CANVAS', '#efe2c6'); ctx.sfx('slime-splat'); }
        },
      }),
    };
    doubles.push(d);
    ctx.float(fr.sx, fr.sy - 40, owner === 'player' ? 'YOUR PORTRAIT STEPS OUT' : 'LIKENESS STEPS OUT', owner === 'player' ? '#9ef0e0' : '#f08aa8');
    ctx.sfx('portal');
  }

  function repeat(d: Double): void {
    const foe = foeOf(d.owner);
    if (!alive(foe)) return;
    const a = Math.atan2(foe.y - d.y, foe.x - d.x);
    ctx.sfx(d.slot === 'q' ? 'whip' : d.slot === 'click' ? 'whoosh' : 'slime-splat');
    if (d.slot === 'click') {
      darts.push({ owner: d.owner, x: d.x, y: d.y - 10, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, until: now + 2400, color: d.color });
      return;
    }
    if (d.slot === 'q') {
      const L = 1100;
      splashes.push({ kind: 'stroke', owner: d.owner, x: d.x, y: d.y, x2: d.x + Math.cos(a) * L, y2: d.y + Math.sin(a) * L, at: now, fireAt: now + ctx.tk.warn(1000), dmg: 18, dealt: false, color: d.color });
      return;
    }
    splashes.push({ kind: 'splash', owner: d.owner, x: foe.x, y: foe.y, x2: 0, y2: 0, at: now, fireAt: now + ctx.tk.warn(950), dmg: 11, dealt: false, color: d.color });
  }

  function hurt(o: 'player' | 'npc', n: number): void {
    const v = foeOf(o);
    if (o === 'npc') ctx.tk.hitPlayer(n, v.x, v.y); else ctx.hit(v, n, v.x, v.y);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      now = time;
      // Sitting for a portrait.
      for (const fr of frames) {
        if (time < fr.restUntil) continue;
        if (time > fr.faceUntil) fr.face = null;
        const sitters = (['player', 'npc'] as const).filter((o) => alive(fighterOf(o)) && dist(fighterOf(o).x, fighterOf(o).y, fr.sx, fr.sy) < SIT_R);
        if (fr.sitter && !sitters.includes(fr.sitter)) { fr.progress = Math.max(0, fr.progress - dt * 0.8); if (fr.progress <= 0) fr.sitter = null; }
        if (!fr.sitter && sitters.length === 1) fr.sitter = sitters[0];
        if (fr.sitter && sitters.includes(fr.sitter)) {
          fr.progress += (dt * 1000) / paintMs(fr.sitter);
          if (fr.progress >= 1) stepOut(fr, fr.sitter);
        }
      }
      // Painted doubles walk after the foe, keep a painter's distance, and repeat the cast.
      for (const d of doubles) {
        if (d.gone) continue;
        const foe = foeOf(d.owner);
        if (alive(foe)) {
          const dd = dist(d.x, d.y, foe.x, foe.y);
          const want = d.slot === 'click' || d.slot === 'q' ? 240 : 170;
          const sp = 75 * dt * Math.sign(dd - want);
          if (Math.abs(dd - want) > 20) { d.x += ((foe.x - d.x) / (dd || 1)) * sp; d.y += ((foe.y - d.y) / (dd || 1)) * sp; }
          d.x = clamp(d.x, 50, W - 50); d.y = clamp(d.y, top + 50, H - 40);
          d.target.moveTo(d.x, d.y);
        }
        if (time >= d.nextAt) {
          d.nextAt = time + DOUBLE_EVERY;
          repeat(d);
          d.left--;
          if (d.left <= 0) { d.gone = true; d.target.remove(); }
        }
      }
      // Paint lands.
      for (const s of splashes) {
        if (s.dealt || time < s.fireAt) continue;
        s.dealt = true;
        const v = foeOf(s.owner);
        if (!alive(v)) continue;
        const hitIt = s.kind === 'splash' ? dist(v.x, v.y, s.x, s.y) < 70 : segDist(v.x, v.y, s.x, s.y, s.x2, s.y2) < 42;
        if (hitIt) hurt(s.owner, s.dmg);
      }
      // Chalk darts fly.
      for (const d of darts) {
        d.x += d.vx * dt; d.y += d.vy * dt;
        const v = foeOf(d.owner);
        if (alive(v) && dist(d.x, d.y, v.x, v.y) < 26) { hurt(d.owner, 7); d.until = 0; }
        if (d.x < 0 || d.x > W || d.y < top || d.y > H) d.until = 0;
      }
      for (let i = darts.length - 1; i >= 0; i--) if (time > darts[i].until) darts.splice(i, 1);
      for (let i = splashes.length - 1; i >= 0; i--) if (splashes[i].dealt && time - splashes[i].fireAt > 700) splashes.splice(i, 1);
      for (let i = doubles.length - 1; i >= 0; i--) if (doubles[i].gone && time - doubles[i].bornAt > 12000) doubles.splice(i, 1);
    },

    onPlayerCast(abilityId, slot) { lastSlot.player = asSlot(slot) ?? slotOfAbility(player, abilityId) ?? lastSlot.player; },
    onNpcCast(abilityId) { lastSlot.npc = slotOfAbility(npc, abilityId) ?? lastSlot.npc; },

    npcSeek() {
      // Sit for a portrait when she has no painted self out: the free frame farthest from you.
      const hasDouble = doubles.some((d) => d.owner === 'npc' && !d.gone);
      if (!hasDouble) {
        let best: Pt | null = null, bs = -Infinity;
        for (const fr of frames) {
          if (now < fr.restUntil || (fr.sitter && fr.sitter !== 'npc')) continue;
          const s = dist(fr.sx, fr.sy, player.x, player.y) - dist(fr.sx, fr.sy, npc.x, npc.y) * 0.6;
          if (s > bs) { bs = s; best = { x: fr.sx, y: fr.sy }; }
        }
        if (best) return best;
      }
      // Otherwise stand off your painted self, and stay between you and an empty mark.
      const mine = doubles.find((d) => d.owner === 'player' && !d.gone);
      if (mine) return { x: clamp(mine.x + (mine.x - player.x) * 0.3, 60, W - 60), y: clamp(mine.y + 40, top + 60, H - 50) };
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      return { x: clamp(player.x + Math.cos(a) * 200, 60, W - 60), y: clamp(player.y + Math.sin(a) * 170, top + 60, H - 50) };
    },

    drawGround(g, time) {
      for (const fr of frames) {
        // The chalk mark on the boards: a sitter's cross in a circle.
        const busy = time < fr.restUntil;
        g.lineStyle(2, SEPIA_PALE, busy ? 0.25 : 0.6);
        g.strokeCircle(fr.sx, fr.sy, SIT_R - 6);
        g.lineBetween(fr.sx - 10, fr.sy - 10, fr.sx + 10, fr.sy + 10); g.lineBetween(fr.sx - 10, fr.sy + 10, fr.sx + 10, fr.sy - 10);
        if (fr.sitter && fr.progress > 0) {
          const col = ownerColor(fr.sitter);
          g.lineStyle(4, col, 0.85);
          g.beginPath(); g.arc(fr.sx, fr.sy, SIT_R - 2, -Math.PI / 2, -Math.PI / 2 + fr.progress * Math.PI * 2, false); g.strokePath();
        }
      }
      // Wet paint about to land.
      for (const s of splashes) {
        const k = clamp((time - s.at) / Math.max(1, s.fireAt - s.at), 0, 1);
        if (s.dealt) {
          const e = clamp((time - s.fireAt) / 700, 0, 1);
          g.fillStyle(s.color, 0.5 * (1 - e));
          if (s.kind === 'splash') { for (let i = 0; i < 7; i++) { const a = i * 0.9; g.fillCircle(s.x + Math.cos(a) * 38, s.y + Math.sin(a) * 30, 18 - i); } g.fillCircle(s.x, s.y, 44); }
          else { g.lineStyle(70, s.color, 0.45 * (1 - e)); g.lineBetween(s.x, s.y, s.x2, s.y2); }
          continue;
        }
        if (s.kind === 'splash') {
          g.fillStyle(s.color, 0.08 + k * 0.14); g.fillCircle(s.x, s.y, 70);
          g.lineStyle(2, s.color, 0.4 + k * 0.5); g.strokeCircle(s.x, s.y, 70 * (1.25 - k * 0.25));
        } else {
          g.lineStyle(84, s.color, 0.05 + k * 0.1); g.lineBetween(s.x, s.y, s.x2, s.y2);
          g.lineStyle(2, s.color, 0.35 + k * 0.5);
          const nx = -(s.y2 - s.y), ny = s.x2 - s.x, l = Math.hypot(nx, ny) || 1;
          for (const sg of [-1, 1]) g.lineBetween(s.x + (nx / l) * 42 * sg, s.y + (ny / l) * 42 * sg, s.x2 + (nx / l) * 42 * sg, s.y2 + (ny / l) * 42 * sg);
        }
      }
    },

    drawAir(g, time) {
      for (const fr of frames) {
        const painting = fr.sitter ? fr.progress : 0;
        const face = fr.sitter ? ownerColor(fr.sitter) : fr.face;
        frame(g, fr.x, fr.y, fr.w, fr.h, face, fr.sitter ? painting : fr.face !== null ? 1 : 0);
        if (fr.sitter) {
          // A floating brush laying on strokes.
          const bx = fr.x - fr.w / 2 + 10 + ((time / 6) % (fr.w - 20)), by = fr.y - 6 + Math.sin(time / 90) * 8;
          g.lineStyle(2, 0x6a4a30, 1); g.lineBetween(bx, by, bx + 10, by - 14);
          g.fillStyle(ownerColor(fr.sitter), 1); g.fillCircle(bx, by, 3);
        }
      }
      // Painted doubles: a chalk-outlined figure in the owner's colour, brush-strokes for a body.
      for (const d of doubles) {
        if (d.gone) continue;
        const age = clamp((time - d.bornAt) / 500, 0, 1);
        const c = d.color;
        g.fillStyle(0x000000, 0.18); g.fillEllipse(d.x, d.y + 18, 34, 10);
        for (let i = 0; i < 6; i++) {
          const yy = d.y + 12 - i * 6;
          g.lineStyle(7, i % 2 ? c : lit(c, 0.2), 0.65 * age);
          g.lineBetween(d.x - 12 + Math.sin(time / 300 + i) * 2, yy, d.x + 12 + Math.sin(time / 300 + i) * 2, yy - 3);
        }
        g.fillStyle(mixC(c, 0xf0d0b0, 0.5), 0.8 * age); g.fillCircle(d.x, d.y - 26, 9);
        g.lineStyle(1.5, SEPIA_PALE, 0.9 * age); g.strokeCircle(d.x, d.y - 26, 9); g.strokeEllipse(d.x, d.y - 4, 30, 40);
        g.fillStyle(INK, age); g.fillCircle(d.x - 3, d.y - 27, 1.3); g.fillCircle(d.x + 3, d.y - 27, 1.3);
        // Drips running off the canvas, and the cast it will repeat chalked over its head.
        for (let i = 0; i < 3; i++) { const ph = (time / 700 + i / 3) % 1; g.fillStyle(c, 0.7 * (1 - ph)); g.fillCircle(d.x - 8 + i * 8, d.y + 16 + ph * 14, 2); }
        g.fillStyle(PAPER, 0.9); g.fillRoundedRect(d.x - 14, d.y - 52, 28, 13, 4);
        g.lineStyle(1, GILT, 1); g.strokeRoundedRect(d.x - 14, d.y - 52, 28, 13, 4);
        const pips = d.left;
        for (let i = 0; i < pips; i++) { g.fillStyle(c, 1); g.fillCircle(d.x - 7 + i * 7, d.y - 45.5, 2.4); }
        if (d.wounds > 0) { g.lineStyle(2, SEPIA_DEEP, 0.7); g.lineBetween(d.x - 10, d.y - 20, d.x + 8, d.y + 4); }
      }
      for (const d of darts) {
        const a = Math.atan2(d.vy, d.vx);
        g.lineStyle(4, dim(d.color, 0.2), 0.9); g.lineBetween(d.x, d.y, d.x - Math.cos(a) * 18, d.y - Math.sin(a) * 18);
        g.fillStyle(lit(d.color, 0.4), 1); g.fillTriangle(d.x + Math.cos(a) * 8, d.y + Math.sin(a) * 8, d.x + Math.cos(a + 2.5) * 6, d.y + Math.sin(a + 2.5) * 6, d.x + Math.cos(a - 2.5) * 6, d.y + Math.sin(a - 2.5) * 6);
      }
    },

    drawHud(g) {
      // Which cast each side's portrait would repeat.
      const keyOf = (s: Slot) => ({ click: 1, e: 2, r: 3, f: 4, q: 5 })[s];
      for (const [o, x] of [['player', 24], ['npc', W - 24]] as ['player' | 'npc', number][]) {
        const y = top + 12;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 14, y - 6, 28, 26, 5);
        g.lineStyle(1.5, GILT_LIT, 0.8); g.strokeRoundedRect(x - 12, y - 4, 24, 22, 3);
        for (let i = 0; i < keyOf(lastSlot[o]); i++) { g.fillStyle(ownerColor(o), 1); g.fillRect(x - 9 + i * 4, y + 2, 3, 10); }
      }
    },

    destroy() {
      for (const fr of frames) fr.target?.remove();
      for (const d of doubles) d.target.remove();
    },
  };
}

export const PORTRAIT_GALLERY: GimmickDef = {
  id: 'remembrance-portrait-gallery',
  rules: 'Stand on a frame\'s mark and it paints you: your portrait steps out and repeats your last cast three times. Two blows smear a double; strike a frame to spoil a sitting.',
  make,
};
