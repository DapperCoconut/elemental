import type Phaser from 'phaser';
import type { EncounterDef, EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../IslesTypes';
import type { Fighter } from '../../../../../entities/Fighter';
import { dim } from '../../../../art/IsleArt';
import { BRASS, BRASS_DARK, GOLD, GOLD_LIT, IRON, IRON_LIT, MIRROR, SUN, SUN_HOT, chainLink, cog, lens } from './art';

/**
 * The Heliostat's three wardens — the Despot's machine-keepers, one at the head of each hall.
 *
 * Each fight is the hall it guards, folded down into one landing: the Focal-Warden's great lens
 * hangs over the floor and makes a ring of fire of the sun; the Glass-Warden stands a mirror
 * across the room and sets everybody's reflection fighting; the Ratchet-Warden runs the Sun
 * Chain through the middle of it all, toward the teeth. Every machine works for whoever reads it.
 */

type Who = 'player' | 'npc';
const WHO: Who[] = ['player', 'npc'];
const alive = (f: Fighter): boolean => f.active && f.hp > 0;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const TAU = Math.PI * 2;
type Gfx = Phaser.GameObjects.Graphics;

// ── Warden 1: Focal Length ───────────────────────────────────────────

/**
 * A great lens drifts over the landing on its rail. Under it the sun is focused into a ring of
 * fire at the lens's focal length — 12 damage to anyone the burning ring passes over — and inside
 * the ring everything is MAGNIFIED: whoever stands there hits 35% harder and is hit 35% harder.
 * The lens rises and falls on its chain, so the ring breathes out and in. Strike the crank at the
 * end of the rail to snap the focus to the other extreme: the ring sweeps across everyone between.
 * Every 11s it comes to FULL FOCUS — the ring collapses onto a white point that burns the spot.
 */
const focalLength = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const MIN_R = 60, MAX_R = ctx.hard ? 250 : 230;
  const BAND = 14;
  const RING_DMG = 12;
  const REHIT = 750;
  const MAG = 1.35;
  const FOCUS_EVERY = 11000;
  const FOCUS_WARN = ctx.hard ? 1500 : 1900;
  const midY = (top + ctx.H) / 2;

  let cx = ctx.W / 2, cy = midY;
  let rf = 140;
  let breathe = 1;          // +1 widening, −1 narrowing
  let snapTo = -1;          // target radius while snapping
  let snapFlash = 0;
  let focusAt = 0;          // when the next full focus burns
  let focusState: 'none' | 'closing' | 'burn' = 'none';
  let burnUntil = 0;
  let heldR = 140;
  const lastHit: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const crankAt: Pt = { x: ctx.W - 64, y: top + 64 };
  let crankSpin = 0;
  let crank: StrikeTarget | null = null;

  const inside = (f: Fighter): boolean => dist(f.x, f.y, cx, cy) < rf - BAND;
  const magOf = (f: Fighter): number => (focusState === 'none' && alive(f) && inside(f) ? MAG : 1);

  const snap = () => {
    if (focusState !== 'none') return;
    snapTo = breathe > 0 ? MIN_R : MAX_R;
    breathe = -breathe;
    snapFlash = ctx.scene.time.now;
    ctx.banner('FOCUS SNAPS', '#fff2a8');
    ctx.sfx('gear-turn');
  };

  return {
    update(time, dt) {
      if (!crank) {
        crank = ctx.target({ x: crankAt.x, y: crankAt.y, r: 24, onStruck: () => { crankSpin = ctx.scene.time.now; snap(); } });
        focusAt = time + FOCUS_EVERY;
      }
      const step = clampN(dt, 0, 0.05);
      // The lens drifts on a slow figure-of-eight over the landing.
      cx = ctx.W / 2 + Math.sin(time / 4200) * (ctx.W / 2 - 230);
      cy = midY + Math.sin(time / 2700) * ((ctx.H - top) / 2 - 150);

      if (focusState === 'none') {
        if (snapTo >= 0) {
          const d = snapTo - rf;
          rf += Math.sign(d) * Math.min(Math.abs(d), 520 * step);
          if (Math.abs(snapTo - rf) < 1) snapTo = -1;
        } else {
          rf += breathe * (ctx.hard ? 52 : 44) * step;
          if (rf >= MAX_R) { rf = MAX_R; breathe = -1; }
          if (rf <= MIN_R + 30) { rf = MIN_R + 30; breathe = 1; }
        }
        if (time >= focusAt - ctx.tk.warn(FOCUS_WARN)) { focusState = 'closing'; heldR = rf; ctx.banner('FULL FOCUS', '#ffffff'); ctx.sfx('beam-charge'); }
      } else if (focusState === 'closing') {
        const k = clampN(1 - (focusAt - time) / ctx.tk.warn(FOCUS_WARN), 0, 1);
        rf = heldR + (8 - heldR) * k * k;
        if (time >= focusAt) {
          focusState = 'burn';
          burnUntil = time + 500;
          ctx.sfx('light-beam');
          for (const w of WHO) {
            const f = fighter(w);
            if (alive(f) && dist(f.x, f.y, cx, cy) < 70) {
              ctx.hit(f, 22, f.x, f.y);
              ctx.float(f.x, f.y - 50, 'FOCUSED', '#ffffff');
            }
          }
          ctx.flash(cx, cy, 0xffffff);
        }
      } else if (time >= burnUntil) {
        focusState = 'none';
        rf = MIN_R + 30;
        breathe = 1;
        focusAt = time + FOCUS_EVERY;
      }

      // The burning ring.
      if (focusState !== 'burn') {
        for (const w of WHO) {
          const f = fighter(w);
          if (!alive(f) || time - lastHit[w] < REHIT) continue;
          if (Math.abs(dist(f.x, f.y, cx, cy) - rf) < BAND + 18) {
            lastHit[w] = time;
            ctx.hit(f, RING_DMG, f.x, f.y);
            ctx.float(f.x, f.y - 46, 'SCORCHED', '#ffd27a');
          }
        }
      }
    },
    // Magnified both ways: a fighter in the ring is hit harder, and hits harder from it.
    playerTakenMult() { return magOf(ctx.player) * magOf(ctx.npc); },
    npcTakenMult() { return magOf(ctx.npc) * magOf(ctx.player); },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      if (focusState === 'closing') {
        // Get well clear of the focal point.
        const a = Math.atan2(n.y - cy, n.x - cx);
        return { x: clampN(cx + Math.cos(a) * 160, 60, ctx.W - 60), y: clampN(cy + Math.sin(a) * 160, top + 50, ctx.H - 50) };
      }
      // She likes the magnified floor while she is ahead; behind, she keeps out of it.
      const ahead = n.hp / Math.max(1, n.maxHp) >= p.hp / Math.max(1, p.maxHp);
      const a = Math.atan2(p.y - cy, p.x - cx);
      const r = ahead && rf > 120 ? rf * 0.45 : rf + 90;
      return { x: clampN(cx + Math.cos(a) * r, 60, ctx.W - 60), y: clampN(cy + Math.sin(a) * r, top + 50, ctx.H - 50) };
    },
    drawGround(g, time) {
      // Inside the ring: the magnified floor, its grid swollen and warm.
      if (focusState !== 'burn') {
        g.fillStyle(SUN, 0.1 + (focusState === 'closing' ? 0.15 : 0)); g.fillCircle(cx, cy, Math.max(4, rf - BAND));
        g.lineStyle(1, GOLD, 0.25);
        for (let k = -3; k <= 3; k++) {
          const off = k * rf * 0.28;
          const half = Math.sqrt(Math.max(0, (rf - BAND) ** 2 - off * off));
          g.lineBetween(cx + off, cy - half, cx + off, cy + half);
          g.lineBetween(cx - half, cy + off, cx + half, cy + off);
        }
        // The ring of fire.
        g.lineStyle(BAND * 2 + 10, SUN_HOT, 0.18); g.strokeCircle(cx, cy, rf);
        g.lineStyle(BAND * 2, SUN, 0.55); g.strokeCircle(cx, cy, rf);
        g.lineStyle(4, 0xffffff, 0.9); g.strokeCircle(cx, cy, rf);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU + time / 700;
          const fl = 6 + Math.sin(time / 90 + i * 2.1) * 5;
          g.fillStyle(i % 2 ? SUN_HOT : 0xffffff, 0.7);
          g.fillCircle(cx + Math.cos(a) * rf, cy + Math.sin(a) * rf, 3 + fl * 0.3);
        }
        if (rf > 40) { g.fillStyle(0xffffff, 0.4); g.fillCircle(cx, cy, 5); }
        if (focusState === 'closing' && Math.floor(time / 100) % 2 === 0) { g.lineStyle(2, 0xff6a3a, 0.8); g.strokeCircle(cx, cy, 70); }
      } else {
        const k = (burnUntil - time) / 500;
        g.fillStyle(0xffffff, 0.8 * k); g.fillCircle(cx, cy, 70);
        g.fillStyle(SUN_HOT, 0.4 * k); g.fillCircle(cx, cy, 90);
      }
    },
    drawAir(g, time) {
      // The rail across the top, the lens hanging from its carriage over the ring's heart.
      const ly = top + 30;
      g.lineStyle(8, BRASS_DARK, 0.95); g.lineBetween(30, ly, ctx.W - 30, ly);
      g.lineStyle(3, GOLD_LIT, 0.9); g.lineBetween(30, ly - 2, ctx.W - 30, ly - 2);
      // The chain from carriage to lens: its length is the focal length.
      const lensY = cy - 30 - rf * 0.45;
      g.lineStyle(3, IRON_LIT, 0.8); g.lineBetween(cx, ly, cx, lensY);
      for (let y = ly + 6; y < lensY; y += 10) { g.fillStyle(IRON, 1); g.fillEllipse(cx, y, 4, 7); }
      g.fillStyle(IRON, 1); g.fillRect(cx - 16, ly - 8, 32, 14);
      g.fillStyle(SUN, 0.14); g.fillTriangle(cx - 34, lensY, cx + 34, lensY, cx, cy);
      lens(g, cx, lensY, 32, time, clampN(1 - rf / MAX_R, 0, 1) * 0.8 + 0.2, 0.95);
      // The crank.
      const spin = (time - crankSpin) < 600 ? (time - crankSpin) / 60 : 0;
      cog(g, crankAt.x, crankAt.y, 16, 10, spin, BRASS);
      g.lineStyle(4, IRON, 1); g.lineBetween(crankAt.x, crankAt.y, crankAt.x + Math.cos(spin) * 26, crankAt.y + Math.sin(spin) * 26);
      g.fillStyle(GOLD_LIT, 1); g.fillCircle(crankAt.x + Math.cos(spin) * 26, crankAt.y + Math.sin(spin) * 26, 5);
      if (time - snapFlash < 400) { g.lineStyle(3, 0xffffff, 1 - (time - snapFlash) / 400); g.strokeCircle(crankAt.x, crankAt.y, 30 + (time - snapFlash) / 10); }
      // Magnified fighters wear a little lens-glint.
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f) || focusState !== 'none' || !inside(f)) continue;
        g.lineStyle(2, GOLD_LIT, 0.85); g.strokeCircle(f.x, f.y - 6, 30);
        g.fillStyle(0xffffff, 0.7); g.fillCircle(f.x - 18, f.y - 24, 3);
      }
    },
    drawHud(g, time) {
      if (focusState !== 'none') return;
      const cxh = ctx.W / 2, cyh = top + 20;
      const k = clampN((focusAt - time) / FOCUS_EVERY, 0, 1);
      g.fillStyle(0x14141a, 0.85); g.fillRoundedRect(cxh - 110, cyh - 10, 220, 20, 8);
      g.lineStyle(2, GOLD, 1); g.strokeRoundedRect(cxh - 110, cyh - 10, 220, 20, 8);
      g.fillStyle(k < 0.2 ? 0xffffff : SUN, 1); g.fillRoundedRect(cxh - 104, cyh - 5, 208 * (1 - k), 10, 4);
      lens(g, cxh + 124, cyh, 9, time, 1 - k, 1);
    },
    destroy() { crank?.remove(); crank = null; },
  };
};

// ── Warden 2: The Looking Glass ──────────────────────────────────────

/**
 * A tall mirror stands across the landing, and on its far side everyone has a reflection. When a
 * fighter casts, their reflection casts too: a glass bolt flies from the reflection at the other
 * fighter. Walk into the foe's reflection and it breaks — seven years' bad luck: they take 12 and
 * are silenced for 1.2s; the reflection regrows in 4s. Every 9s the mirror is turned to a new
 * line (its next line is shown first). Stand at the foe's mirror point and your reflection is on
 * top of them — but theirs is on top of you.
 */
const lookingGlass = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const TURN_EVERY = 9000;
  const TURN_WARN = 2200;
  const BREAK_R = 34;
  const REGROW = 4000;
  const BOLT_DMG = 9;
  const midY = (top + ctx.H) / 2;

  interface Line { x: number; y: number; a: number }
  let line: Line = { x: ctx.W / 2, y: midY, a: Math.PI / 2 };
  let next: Line | null = null;
  let turnAt = 0;
  let swingFrom: Line | null = null;
  let swingUntil = 0;
  const brokenUntil: Record<Who, number> = { player: 0, npc: 0 };
  const brokeAt: Record<Who, number> = { player: 0, npc: 0 };
  const lastEcho: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const other = (w: Who): Who => (w === 'player' ? 'npc' : 'player');

  /** Mirror a point across the current line. */
  const mirror = (px: number, py: number, l: Line = line): Pt => {
    const ux = Math.cos(l.a), uy = Math.sin(l.a);
    const dx = px - l.x, dy = py - l.y;
    const along = dx * ux + dy * uy;
    const fx = l.x + ux * along, fy = l.y + uy * along;
    return { x: fx * 2 - px, y: fy * 2 - py };
  };
  const inField = (p: Pt): boolean => p.x > 30 && p.x < ctx.W - 30 && p.y > top + 20 && p.y < ctx.H - 20;
  const reflectionOf = (w: Who): Pt => { const f = fighter(w); return mirror(f.x, f.y); };

  const pickLine = (): Line => {
    const a = (0.15 + ctx.rng() * 0.7) * Math.PI;
    return { x: 260 + ctx.rng() * (ctx.W - 520), y: top + 150 + ctx.rng() * (ctx.H - top - 300), a };
  };

  const echo = (w: Who) => {
    const now = ctx.scene.time.now;
    if (now < brokenUntil[w] || now - lastEcho[w] < 350) return;
    const r = reflectionOf(w);
    if (!inField(r)) return;
    const target = fighter(other(w));
    if (!alive(target)) return;
    lastEcho[w] = now;
    const ang = Math.atan2(target.y - r.y, target.x - r.x);
    ctx.tk.spawnBullet({ x: r.x, y: r.y, angle: ang, speed: 430, damage: BOLT_DMG, r: 6, color: w === 'player' ? 0xc8e8ff : GOLD_LIT, hits: [target], lifeMs: 2200 });
    ctx.sfx('crystal-chime');
  };

  const lineEnds = (l: Line): [Pt, Pt] => {
    const ux = Math.cos(l.a), uy = Math.sin(l.a);
    return [{ x: l.x - ux * 900, y: l.y - uy * 900 }, { x: l.x + ux * 900, y: l.y + uy * 900 }];
  };

  const drawFigure = (g: Gfx, p: Pt, w: Who, time: number, a: number) => {
    const c = w === 'player' ? 0xc8e8ff : GOLD_LIT;
    g.fillStyle(c, 0.18 * a); g.fillCircle(p.x, p.y - 4, 22);
    g.lineStyle(2, c, 0.7 * a); g.strokeCircle(p.x, p.y - 4, 22);
    g.fillStyle(0xffffff, 0.35 * a); g.fillCircle(p.x, p.y - 30, 9);
    g.lineStyle(1.5, c, 0.7 * a); g.strokeCircle(p.x, p.y - 30, 9);
    // Silvered glints sliding over the reflection.
    const s = ((time / 600) % 1) * 44 - 22;
    g.lineStyle(2, 0xffffff, 0.5 * a); g.lineBetween(p.x + s - 6, p.y - 20, p.x + s + 6, p.y + 10);
  };

  return {
    update(time) {
      if (turnAt === 0) turnAt = time + TURN_EVERY;
      if (!next && time >= turnAt - ctx.tk.warn(TURN_WARN)) { next = pickLine(); ctx.banner('THE GLASS TURNS', '#e8f4ff'); ctx.sfx('gear-turn'); }
      if (next && time >= turnAt) { swingFrom = line; line = next; next = null; swingUntil = time + 380; turnAt = time + TURN_EVERY; ctx.sfx('prism'); }
      // Walking into the foe's reflection breaks it.
      for (const w of WHO) {
        const owner = other(w);
        const f = fighter(w), o = fighter(owner);
        if (!alive(f) || !alive(o) || time < brokenUntil[owner]) continue;
        const r = reflectionOf(owner);
        if (!inField(r)) continue;
        if (dist(f.x, f.y, r.x, r.y) < BREAK_R) {
          brokenUntil[owner] = time + REGROW;
          brokeAt[owner] = time;
          ctx.hit(o, 12, o.x, o.y);
          ctx.silence(o, 1200);
          ctx.float(r.x, r.y - 40, 'SHATTERED', '#e8f4ff');
          ctx.float(o.x, o.y - 52, 'SEVEN YEARS', '#ffd27a');
          ctx.sfx('crystal-shatter');
        }
      }
    },
    onPlayerCast() { echo('player'); },
    onNpcCast() { echo('npc'); },
    npcSeek() {
      // Your mirror point is where his reflection lands on you — and yours on him. While his own
      // reflection is broken (nothing of his to shatter) he walks straight onto it to break yours;
      // otherwise he hovers a stride off it, close enough for his echoes to land point-blank.
      const p = ctx.player, n = ctx.npc;
      const m = mirror(p.x, p.y);
      if (!inField(m)) return null;
      let tx = m.x, ty = m.y;
      if (ctx.scene.time.now >= brokenUntil.npc) {
        const d = Math.max(1, dist(n.x, n.y, m.x, m.y));
        tx = m.x + ((n.x - m.x) / d) * 90;
        ty = m.y + ((n.y - m.y) / d) * 90;
      }
      return { x: clampN(tx, 60, ctx.W - 60), y: clampN(ty, top + 50, ctx.H - 50) };
    },
    drawGround(g, time) {
      // The mirror's foot: a gilt line across the floor, and a silvered strip either side.
      const shown = swingFrom && time < swingUntil ? swingFrom : line;
      const [a, b] = lineEnds(shown);
      g.lineStyle(30, MIRROR, 0.12); g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(10, MIRROR, 0.35); g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(3, GOLD, 0.9); g.lineBetween(a.x, a.y, b.x, b.y);
      if (next) {
        const [c, d] = lineEnds(next);
        const k = Math.floor(time / 160) % 2;
        g.lineStyle(2, 0xffffff, k ? 0.7 : 0.3);
        const n = 40;
        for (let i = 0; i < n; i += 2) {
          const f0 = i / n, f1 = (i + 1) / n;
          g.lineBetween(c.x + (d.x - c.x) * f0, c.y + (d.y - c.y) * f0, c.x + (d.x - c.x) * f1, c.y + (d.y - c.y) * f1);
        }
      }
    },
    drawAir(g, time) {
      // The glass itself: a shimmering sheet standing up off the line.
      const [a, b] = lineEnds(line);
      for (let i = 0; i < 18; i++) {
        const f = (i / 18 + time / 9000) % 1;
        const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
        if (x < -20 || x > ctx.W + 20 || y < top - 20 || y > ctx.H + 20) continue;
        g.lineStyle(2, 0xffffff, 0.25 + 0.25 * Math.sin(time / 200 + i));
        g.lineBetween(x, y, x, y - 40);
      }
      // The reflections.
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        const r = reflectionOf(w);
        if (!inField(r)) continue;
        if (time < brokenUntil[w]) {
          const k = clampN((time - brokeAt[w]) / 600, 0, 1);
          if (k < 1) {
            for (let i = 0; i < 9; i++) {
              const ang = (i / 9) * TAU;
              g.fillStyle(MIRROR, 1 - k);
              g.fillTriangle(r.x + Math.cos(ang) * (8 + k * 40), r.y + Math.sin(ang) * (8 + k * 40),
                r.x + Math.cos(ang + 0.3) * (16 + k * 46), r.y + Math.sin(ang + 0.3) * (16 + k * 46),
                r.x + Math.cos(ang + 0.1) * (24 + k * 50), r.y + Math.sin(ang + 0.1) * (24 + k * 50));
            }
          }
          // The empty frame where it was, regrowing.
          const g2 = 1 - (brokenUntil[w] - time) / REGROW;
          g.lineStyle(1.5, 0xffffff, 0.3); g.beginPath(); g.arc(r.x, r.y - 4, 22, -Math.PI / 2, -Math.PI / 2 + g2 * TAU, false); g.strokePath();
          continue;
        }
        drawFigure(g, r, w, time, 1);
        g.lineStyle(1, 0xffffff, 0.15); g.lineBetween(f.x, f.y, r.x, r.y);
      }
    },
  };
};

// ── Warden 3: Ratchet and Chain ──────────────────────────────────────

/**
 * A run of the Sun Chain grinds through the middle of the landing toward a cog's mouth at one
 * end. Anyone standing on it is carried along; reach the mouth and the teeth bite (16 and a short
 * stun) and spit you off the chain. Every 6s the pawl lets go a notch and the chain LURCHES
 * forward. Each end cog swings a long tooth round over the floor beside it. Strike the pawl, on
 * its post over the chain, and the ratchet throws the chain into reverse — toward whoever is at
 * the other end.
 */
const ratchetChain = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const cy = (top + ctx.H) / 2 + 10;
  const HALF = ctx.hard ? 58 : 46;
  const SPEED = ctx.hard ? 80 : 66;
  const LURCH_EVERY = 6000;
  const LURCH_MS = 260;
  const LURCH_PX = 150;
  const MOUTH = 90;
  const BITE = 16;
  const ARM = 150;
  const ARM_RAD = ctx.hard ? 1.5 : 1.25;
  const pawlAt: Pt = { x: ctx.W / 2, y: cy - HALF - 54 };

  let dir: 1 | -1 = 1;
  let lurchAt = 0;
  let lurchUntil = 0;
  let travel = 0;           // chain offset, for drawing
  let reversedAt = 0;
  let pawl: StrikeTarget | null = null;
  const bitAt: Record<Who, number> = { player: 0, npc: 0 };
  const armHitAt: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const onChain = (f: Fighter): boolean => Math.abs(f.y - cy) < HALF + 8 && f.x > 40 && f.x < ctx.W - 40;
  const cogs = (): Pt[] => [{ x: 26, y: cy }, { x: ctx.W - 26, y: cy }];
  const armAngle = (i: number, time: number): number => (i === 0 ? 1 : -1) * time / 1000 * ARM_RAD + i * Math.PI;

  const reverse = () => {
    const now = ctx.scene.time.now;
    if (now - reversedAt < 1200) return;
    reversedAt = now;
    dir = dir > 0 ? -1 : 1;
    ctx.banner(dir > 0 ? 'THE CHAIN RUNS EAST' : 'THE CHAIN RUNS WEST', '#ffd27a');
    ctx.sfx('clang');
    // The pawl snaps back and the chain lurches the new way a moment later.
    lurchAt = Math.min(lurchAt, now + 900);
  };

  return {
    update(time, dt) {
      if (!pawl) {
        pawl = ctx.target({ x: pawlAt.x, y: pawlAt.y, r: 24, onStruck: reverse });
        lurchAt = time + LURCH_EVERY;
      }
      const step = clampN(dt, 0, 0.05);
      const lurching = time < lurchUntil;
      const v = dir * (lurching ? LURCH_PX / (LURCH_MS / 1000) : SPEED);
      travel += v * step;
      if (time >= lurchAt) {
        lurchUntil = time + LURCH_MS;
        lurchAt = time + LURCH_EVERY;
        ctx.sfx('anvil');
        ctx.scene.cameras.main.shake(120, 0.003);
      }
      for (const w of WHO) {
        const f = fighter(w);
        if (!alive(f)) continue;
        if (onChain(f)) {
          ctx.nudge(f, v * step, 0);
          // The mouth at the end the chain runs into.
          const atMouth = dir > 0 ? f.x > ctx.W - MOUTH : f.x < MOUTH;
          if (atMouth && time - bitAt[w] > 1200) {
            bitAt[w] = time;
            ctx.hit(f, BITE, f.x, f.y);
            ctx.stun(f, 600);
            ctx.nudge(f, -dir * 60, f.y < cy ? -(HALF + 40) : HALF + 40);
            ctx.float(f.x, f.y - 50, 'BITTEN', '#ff9a6a');
            ctx.sfx('hammer-forge');
          }
        }
        // The long teeth of the end cogs.
        cogs().forEach((c, i) => {
          const a = armAngle(i, time);
          const ex = c.x + Math.cos(a) * ARM, ey = c.y + Math.sin(a) * ARM;
          const dx = ex - c.x, dy = ey - c.y;
          const tt = clampN(((f.x - c.x) * dx + (f.y - c.y) * dy) / (ARM * ARM), 0, 1);
          const d = dist(f.x, f.y, c.x + dx * tt, c.y + dy * tt);
          if (d < 26 && time - armHitAt[w] > 800) {
            armHitAt[w] = time;
            ctx.hit(f, 10, f.x, f.y);
            ctx.float(f.x, f.y - 46, 'GEARED', '#ffd27a');
          }
        });
      }
    },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      // Player riding the chain away from the mouth: go and throw the pawl.
      if (onChain(p)) {
        const toMouth = dir > 0 ? ctx.W - p.x : p.x;
        if (toMouth > ctx.W * 0.55) return { x: pawlAt.x, y: pawlAt.y + 40 };
      }
      // Otherwise keep off the chain and out of the teeth, on the player's side of it.
      const side = p.y < cy ? -1 : 1;
      const y = cy + side * (HALF + 90);
      const x = clampN(p.x, ARM + 60, ctx.W - ARM - 60);
      if (onChain(n)) return { x: n.x, y };
      return { x, y: clampN(y, top + 50, ctx.H - 50) };
    },
    drawGround(g, time) {
      // The bed.
      g.fillStyle(0x0a0a10, 0.85); g.fillRect(0, cy - HALF - 6, ctx.W, HALF * 2 + 12);
      g.fillStyle(IRON, 1); g.fillRect(0, cy - HALF - 6, ctx.W, 4); g.fillRect(0, cy + HALF + 2, ctx.W, 4);
      // The chain: big links lying flat, two strands, running.
      const off = ((travel % 60) + 60) % 60;
      for (let s = -1; s <= 1; s += 2) {
        for (let x = -60 + off; x < ctx.W + 60; x += 60) {
          chainLink(g, x, cy + s * HALF * 0.45, 0, 26, IRON_LIT);
          chainLink(g, x + 30, cy + s * HALF * 0.45, Math.PI / 2, 14, IRON);
        }
      }
      // Chevrons the way it runs.
      for (let x = (time / 8) % 80; x < ctx.W; x += 80) {
        const cx = dir > 0 ? x : ctx.W - x;
        g.lineStyle(3, GOLD, 0.45);
        g.lineBetween(cx - dir * 10, cy - 10, cx, cy); g.lineBetween(cx - dir * 10, cy + 10, cx, cy);
      }
      // The mouth glows where the chain runs into it.
      const mx = dir > 0 ? ctx.W - MOUTH / 2 : MOUTH / 2;
      g.fillStyle(0xff6a2a, 0.18 + 0.08 * Math.sin(time / 120)); g.fillRect(mx - MOUTH / 2, cy - HALF, MOUTH, HALF * 2);
      // The sweep of each end cog's tooth.
      cogs().forEach((c) => { g.lineStyle(2, 0xff9a4a, 0.25); g.strokeCircle(c.x, c.y, ARM); });
    },
    drawAir(g, time) {
      // End cogs, with the long tooth.
      cogs().forEach((c, i) => {
        const a = armAngle(i, time);
        cog(g, c.x, c.y, 54, 14, a * 0.6 + travel / 54, IRON_LIT);
        const ex = c.x + Math.cos(a) * ARM, ey = c.y + Math.sin(a) * ARM;
        g.lineStyle(18, IRON, 1); g.lineBetween(c.x, c.y, ex, ey);
        g.lineStyle(8, IRON_LIT, 1); g.lineBetween(c.x, c.y, ex, ey);
        g.fillStyle(0xff7a2a, 1); g.fillCircle(ex, ey, 9);
        g.fillStyle(0xffe0a0, 1); g.fillCircle(ex, ey, 4);
      });
      // The pawl on its post: a hooked iron tooth over a ratchet wheel.
      const p = pawlAt;
      g.fillStyle(IRON, 1); g.fillRect(p.x - 5, p.y, 10, cy - HALF - p.y);
      const tick = Math.floor(((lurchAt - time) / LURCH_EVERY) * 6);
      cog(g, p.x, p.y, 18, 12, tick * (TAU / 12) * dir, BRASS);
      const flip = time - reversedAt < 300 ? (1 - (time - reversedAt) / 300) : 0;
      const pa = (dir > 0 ? -0.6 : 0.6 + Math.PI) + flip * dir * 1.2;
      g.lineStyle(7, dim(IRON, 0.2), 1); g.lineBetween(p.x, p.y - 22, p.x + Math.cos(pa) * 30, p.y - 22 + Math.sin(pa) * 10);
      g.fillStyle(GOLD_LIT, 1); g.fillCircle(p.x, p.y - 22, 4);
      // The click count to the next lurch.
      const left = Math.ceil((lurchAt - time) / 1000);
      if (left <= 3 && left > 0) {
        for (let i = 0; i < left; i++) { g.fillStyle(SUN_HOT, 1); g.fillCircle(p.x - 12 + i * 12, p.y - 42, 4); }
      }
      if (time < lurchUntil) {
        for (let i = 0; i < 8; i++) {
          g.fillStyle(SUN, 0.8); g.fillCircle(ctx.W * (i / 8) + ((time / 2) % 60), cy + (i % 2 ? -HALF : HALF), 3);
        }
      }
    },
    drawHud(g) {
      // An arrow along the top: which way the chain runs.
      const cx = ctx.W / 2, y = top + 18;
      g.fillStyle(0x14141a, 0.85); g.fillRoundedRect(cx - 70, y - 10, 140, 20, 8);
      g.lineStyle(2, GOLD, 1); g.strokeRoundedRect(cx - 70, y - 10, 140, 20, 8);
      g.fillStyle(GOLD_LIT, 1);
      g.fillTriangle(cx + dir * 50, y, cx + dir * 30, y - 7, cx + dir * 30, y + 7);
      g.fillRect(Math.min(cx - dir * 40, cx + dir * 30), y - 2, 70, 4);
    },
    destroy() { pawl?.remove(); pawl = null; },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const HELIOSTAT_GIMMICKS: GimmickDef[] = [
  {
    id: 'heliostat-focal-length',
    rules: 'A lens focuses a ring of fire. Inside it all hits land 35% harder. Strike the crank to snap the focus; every 11s it burns to a point.',
    make: focalLength,
  },
  {
    id: 'heliostat-looking-glass',
    rules: 'Your reflection casts when you cast, at the foe. Walk into the foe\'s reflection to shatter it (12, silenced). A broken one cannot break again.',
    make: lookingGlass,
  },
  {
    id: 'heliostat-ratchet-chain',
    rules: 'The Sun Chain carries you into the cog\'s teeth and lurches every 6s. Strike the pawl to throw it into reverse.',
    make: ratchetChain,
  },
];

export const HELIOSTAT_WARDENS: EncounterDef[] = [
  {
    id: 'heliostat-warden-1', court: 'heliostat', name: 'Focal Length',
    foeName: 'Focal-Warden Corisande Brule', foeElement: 'plasma', difficulty: 5, hpMult: 1.15,
    gimmick: 'heliostat-focal-length', at: { x: 900, y: 1765 }, coins: 180,
    look: { body: 0xd8b088, accent: 0x6a3a1a, hat: 'goggles', traits: ['apron', 'glasses', 'bandage'], size: 1.1, eye: 0xfff0a0 },
    challenge: [
      'Every lens in this gallery I ground myself. I can tell you the focal length of each by the smell of the burn.',
      'You are standing a little too close to the ring, by the way. That is not advice. That is a measurement.',
      'Let us see how you look magnified.',
    ],
    beaten: [
      'You snapped my focus. Nobody touches the crank. I have had it oiled twice a day for nobody to touch it.',
      'Go on up. Silvering keeps the maze. Tell him I said to look at himself. He will know what I mean.',
    ],
  },
  {
    id: 'heliostat-warden-2', court: 'heliostat', name: 'The Looking Glass',
    foeName: 'Glass-Warden Isembard Silvering', foeElement: 'illusion', difficulty: 5, hpMult: 1.2,
    gimmick: 'heliostat-looking-glass', at: { x: 900, y: 1170 }, coins: 180,
    look: { body: 0xe8e8f0, accent: 0x8a9ab0, hat: 'tophat', traits: ['mask', 'cane'], size: 1.0, eye: 0xd8f0ff },
    challenge: [
      'Look. No, look. There you are, behind the glass. Quite handsome. Rather less sure of yourself than you are.',
      'In the Heliostat everything is seen. Even you, from the other side. Especially you.',
      'Shall we see which of you wins?',
    ],
    beaten: [
      'You broke my reflection. Nine years unseen, and you broke it. ...It looked frightened. Did you see?',
      'The Chain is above. Pawlesby. She will not let go of it. She has never let go of anything.',
    ],
  },
  {
    id: 'heliostat-warden-3', court: 'heliostat', name: 'Ratchet and Chain',
    foeName: 'Ratchet-Warden Maud Pawlesby', foeElement: 'metal', difficulty: 5, hpMult: 1.25,
    gimmick: 'heliostat-ratchet-chain', at: { x: 900, y: 460 }, coins: 180,
    look: { body: 0xa87858, accent: 0x34405a, hat: 'helmet', traits: ['apron', 'tool', 'pack'], size: 1.3, eye: 0xffc070 },
    challenge: [
      'This chain holds the sun. One notch a minute, all day, every day, so it never slips a hair. I count them.',
      'The pawl does not let go. I do not let go. That is the whole of the Heliostat, really. Nobody letting go.',
      'Step on, then. Let us see where it takes you.',
    ],
    beaten: [
      'You threw my pawl. In twenty-two years nobody has thrown my pawl. ...It ran so freely. I had forgotten.',
      'He is in the Crown, under the sun. When you break him, the chain will go. I am going to let it.',
    ],
  },
];

