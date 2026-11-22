import type { EncounterDef, EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../IslesTypes';
import type { Fighter } from '../../../../../entities/Fighter';
import { dim, lit, mixC } from '../../../../art/IsleArt';
import {
  BRASS, BRASS_DARK, CHAIN, DUST, DUST_DEEP, IRON, MORTAR, SKINS, SOOT, STONE, STONE_DARK, STONE_DEEP, STONE_LIT, STRATA,
  TITHE_RED, ashlar, gravaneSeal, sarcophagus, slitFace,
} from './art';

/**
 * The Sepulchre's three wardens — the Regent's keepers, one at the foot of each hall.
 *
 * Each fight is the hall it closes. The Liftwarden takes you down a shaft on his own lift; the
 * Turnkey keeps a ring of cells and every one of them has a face at the slit; the Sexton sweeps
 * the crypt and lets the dust lie wherever he is not. Every rule cuts both ways: the interred
 * are on your side if you let them be, and dust buries a sexton as well as anyone.
 */

type Who = 'player' | 'npc';
const WHO: Who[] = ['player', 'npc'];
const alive = (f: Fighter): boolean => f.active && f.hp > 0;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
const clampN = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const stepOf = (dt: number): number => clampN(dt, 0, 0.05);

// ── Warden 1: The Descent ────────────────────────────────────────────

/**
 * The fight is on Haske's lift, going down the deepest shaft in the hold. The walls slide
 * upward past both edges. Rock ledges jut from the shaft wall and come up across the cage —
 * a crack glows at the foot of the wall first — and scrape whoever they catch (12 damage,
 * shoved off, slowed). Every so often the counterweight comes up its own chain through the cage
 * (the chain drops in first): 18 damage and a stagger to anyone in its column — the Liftwarden
 * as well. And as the lift passes a landing, whoever stands at its lit door first steps off:
 * braced for 5s (no ledge or weight can touch them, and their hits land 25% harder).
 */
const descent = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const W = ctx.W, H = ctx.H;
  const RISE = 165;               // px/s the shaft walls go by
  const LEDGE_EVERY = ctx.hard ? 3600 : 4400;
  const LEDGE_WARN = 1300;
  const LEDGE_HALF = 26;
  const CW_EVERY = ctx.hard ? 7000 : 8600;
  const CW_WARN = 1700;
  const CW_HALF = 56;
  const CW_PASS = 380;
  const LANDING_EVERY = 7600;
  const LANDING_R = 62;
  const BRACE_MS = 5000;

  interface Ledge { side: -1 | 1; depth: number; y: number; bornAt: number; live: boolean; hit: Record<Who, boolean>; jag: number[] }
  interface Landing { side: -1 | 1; y: number; claimed: Who | null }
  let ledges: Ledge[] = [];
  let landing: Landing | null = null;
  let nextLedge = 0, nextCw = 0, nextLanding = 0;
  let cw: { x: number; at: number; passAt: number; hit: Record<Who, boolean> } | null = null;
  let scroll = 0;
  let depth = 0;
  const bracedUntil: Record<Who, number> = { player: 0, npc: 0 };
  const scrapedUntil: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const now = (): number => ctx.scene.time.now;
  const braced = (w: Who): boolean => now() < bracedUntil[w];

  const inLedge = (l: Ledge, f: Fighter): boolean => {
    if (!l.live) return false;
    const reach = l.side < 0 ? f.x - 20 < l.depth : f.x + 20 > W - l.depth;
    return reach && Math.abs(f.y - l.y) < LEDGE_HALF + 18;
  };

  const spawnLedge = (time: number) => {
    const side: -1 | 1 = ctx.rng() < 0.5 ? -1 : 1;
    const jag: number[] = [];
    for (let k = 0; k < 7; k++) jag.push(ctx.rng());
    ledges.push({ side, depth: 230 + ctx.rng() * (ctx.hard ? 170 : 120), y: H + LEDGE_HALF + 10, bornAt: time, live: false, hit: { player: false, npc: false }, jag });
    ctx.sfx('stone-rise');
  };

  const scrape = (w: Who, l: Ledge) => {
    const f = fighter(w);
    l.hit[w] = true;
    if (braced(w)) { ctx.float(f.x, f.y - 50, 'BRACED', '#ffe2a8'); return; }
    ctx.hit(f, 12, f.x, f.y);
    ctx.nudge(f, -l.side * 70, -24);
    scrapedUntil[w] = now() + 1200;
    ctx.float(f.x, f.y - 48, 'SCRAPED', '#d8c8a8');
    ctx.sfx('rock-throw');
  };

  return {
    update(time, dt) {
      const s = stepOf(dt);
      scroll += RISE * s;
      depth += s * 2.2;
      if (nextLedge === 0) { nextLedge = time + 2200; nextCw = time + 5200; nextLanding = time + 3800; }
      if (time >= nextLedge) { spawnLedge(time); nextLedge = time + LEDGE_EVERY * (0.85 + ctx.rng() * 0.3); }
      // Ledges: a warning crack, then they come up the wall at the shaft's speed.
      for (const l of ledges) {
        if (!l.live && time >= l.bornAt + ctx.tk.warn(LEDGE_WARN)) l.live = true;
        if (!l.live) continue;
        l.y -= RISE * s;
        for (const w of WHO) {
          const f = fighter(w);
          if (alive(f) && !l.hit[w] && inLedge(l, f)) scrape(w, l);
        }
      }
      ledges = ledges.filter((l) => l.y > top - 60);
      // The counterweight: its chain drops in over the player's column, then the weight goes by.
      if (!cw && time >= nextCw) {
        cw = { x: clampN(ctx.player.x, 80, W - 80), at: time, passAt: time + ctx.tk.warn(CW_WARN), hit: { player: false, npc: false } };
        ctx.sfx('chain');
        ctx.banner('THE COUNTERWEIGHT', '#e8d8b8');
      }
      if (cw) {
        if (time >= cw.passAt && time < cw.passAt + CW_PASS) {
          const k = (time - cw.passAt) / CW_PASS;
          const wy = H + 60 - k * (H - top + 140);
          for (const w of WHO) {
            const f = fighter(w);
            if (!alive(f) || cw.hit[w] || Math.abs(f.x - cw.x) > CW_HALF + 16 || Math.abs(f.y - wy) > 70) continue;
            cw.hit[w] = true;
            if (braced(w)) { ctx.float(f.x, f.y - 50, 'BRACED', '#ffe2a8'); continue; }
            ctx.hit(f, 18, f.x, f.y);
            ctx.stun(f, 450);
            ctx.float(f.x, f.y - 50, w === 'npc' ? 'COUNTERWEIGHTED' : 'STRUCK', '#ffd27a');
            ctx.sfx('gravity-slam');
          }
          if (time - cw.passAt < 30) ctx.sfx('whoosh');
        }
        if (time >= cw.passAt + CW_PASS + 200) { cw = null; nextCw = time + CW_EVERY; }
      }
      // Landings come up a wall; the first to its door steps off and braces.
      if (!landing && time >= nextLanding) {
        const busy = ledges.filter((l) => l.y > H - 200).map((l) => l.side);
        const side: -1 | 1 = busy.includes(-1) ? 1 : busy.includes(1) ? -1 : (ctx.rng() < 0.5 ? -1 : 1);
        landing = { side, y: H + 40, claimed: null };
        ctx.float(side < 0 ? 120 : W - 120, H - 30, 'A LANDING', '#ffe2a8');
      }
      if (landing) {
        landing.y -= RISE * s;
        const lx = landing.side < 0 ? 56 : W - 56;
        if (!landing.claimed && landing.y < H - 30) {
          for (const w of WHO) {
            const f = fighter(w);
            if (!alive(f) || dist(f.x, f.y, lx, landing.y) > LANDING_R + 20) continue;
            landing.claimed = w;
            bracedUntil[w] = time + BRACE_MS;
            ctx.float(f.x, f.y - 56, w === 'player' ? 'STEPPED OFF — BRACED' : 'HASKE BRACES', '#ffe2a8');
            ctx.sfx('status-buff');
            break;
          }
        }
        if (landing.y < top - 80) { landing = null; nextLanding = time + LANDING_EVERY; }
      }
    },
    playerSpeedMult() { return now() < scrapedUntil.player ? 0.7 : 1; },
    npcSpeedMult() { return now() < scrapedUntil.npc ? 0.7 : 1; },
    playerTakenMult() { return braced('npc') ? 1.25 : 1; },
    npcTakenMult() { return braced('player') ? 1.25 : 1; },
    npcSeek() {
      const n = ctx.npc;
      if (cw && now() < cw.passAt + CW_PASS && Math.abs(n.x - cw.x) < CW_HALF + 40) {
        return { x: clampN(cw.x + (n.x < cw.x ? -180 : 180), 70, W - 70), y: n.y };
      }
      for (const l of ledges) {
        if (l.y > n.y - 40 && l.y < n.y + 260 && (l.side < 0 ? n.x < l.depth + 40 : n.x > W - l.depth - 40)) {
          return { x: l.side < 0 ? l.depth + 90 : W - l.depth - 90, y: n.y };
        }
      }
      if (landing && !landing.claimed && landing.y < H - 20 && landing.y > top + 60) {
        return { x: landing.side < 0 ? 70 : W - 70, y: landing.y - 50 };
      }
      return null;
    },
    drawGround(g, time) {
      // The shaft walls going by on both sides: strata bands sliding up past the cage.
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? 0 : W - 34;
        const off = scroll % 28;
        for (let k = 0; k < 24; k++) {
          const yy = top + k * 28 - off;
          if (yy > H) break;
          const band = k + Math.floor(scroll / 28);
          g.fillStyle(dim(STRATA[((band % STRATA.length) + STRATA.length) % STRATA.length], 0.25), 1);
          g.fillRect(x0, yy, 34, 28);
          g.lineStyle(1, STONE_DEEP, 0.6); g.lineBetween(x0, yy, x0 + 34, yy + 2);
        }
        g.fillStyle(0x000000, 0.35); g.fillRect(side < 0 ? 34 : W - 40, top, 6, H - top);
      }
      // Ledge warnings: a crack glowing at the foot of the wall.
      for (const l of ledges) {
        if (l.live) continue;
        const k = clampN((time - l.bornAt) / ctx.tk.warn(LEDGE_WARN), 0, 1);
        const x0 = l.side < 0 ? 0 : W - l.depth;
        g.fillStyle(0xffa860, 0.08 + k * 0.18); g.fillRect(x0, H - 40, l.depth, 40);
        g.lineStyle(2, 0xffc890, 0.4 + k * 0.5);
        let px = l.side < 0 ? 0 : W;
        for (let i = 0; i < 7; i++) {
          const nx = l.side < 0 ? (l.depth * (i + 1)) / 7 : W - (l.depth * (i + 1)) / 7;
          const ny = H - 8 - l.jag[i] * 18;
          g.lineBetween(px, H - 8 - (i ? l.jag[i - 1] * 18 : 0), nx, ny);
          px = nx;
        }
      }
      // The counterweight's column: the chain is coming down, chevrons pointing up.
      if (cw && time < cw.passAt) {
        const k = clampN((time - cw.at) / Math.max(1, cw.passAt - cw.at), 0, 1);
        g.fillStyle(0xffd27a, 0.06 + k * 0.14); g.fillRect(cw.x - CW_HALF, top, CW_HALF * 2, H - top);
        g.lineStyle(2, 0xffd27a, 0.3 + k * 0.4);
        for (let y = H - 30 - ((time / 6) % 60); y > top; y -= 60) {
          g.lineBetween(cw.x - 20, y + 12, cw.x, y); g.lineBetween(cw.x, y, cw.x + 20, y + 12);
        }
        if (k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xff8a5a, 0.8); g.strokeRect(cw.x - CW_HALF, top, CW_HALF * 2, H - top); }
      }
      // A landing's lit doorway in the wall, and its threshold.
      if (landing) {
        const lx = landing.side < 0 ? 0 : W - 70;
        g.fillStyle(STONE_DARK, 1); g.fillRect(lx, landing.y - 60, 70, 100);
        g.fillStyle(landing.claimed ? 0x3a2a1a : 0xffc870, landing.claimed ? 0.6 : 0.45); g.fillRect(lx + 10, landing.y - 52, 50, 84);
        g.lineStyle(2, BRASS, 0.9); g.strokeCircle(landing.side < 0 ? 56 : W - 56, landing.y, LANDING_R);
        if (!landing.claimed) { g.fillStyle(0xffe2a8, 0.1 + Math.sin(time / 120) * 0.05); g.fillCircle(landing.side < 0 ? 56 : W - 56, landing.y, LANDING_R); }
      }
    },
    drawAir(g, time) {
      // The ledges: a shelf of rock, lit along its top lip, dust trailing off its tip.
      for (const l of ledges) {
        if (!l.live) continue;
        const x0 = l.side < 0 ? 0 : W, sgn = -l.side;
        const pts: Pt[] = [{ x: x0, y: l.y - LEDGE_HALF - 6 }];
        for (let i = 0; i < 7; i++) {
          const f = (i + 1) / 7;
          pts.push({ x: x0 + sgn * l.depth * f, y: l.y - LEDGE_HALF + l.jag[i] * 12 + f * 8 });
        }
        pts.push({ x: x0 + sgn * l.depth, y: l.y + LEDGE_HALF * 0.4 });
        for (let i = 6; i >= 0; i--) pts.push({ x: x0 + sgn * l.depth * (i / 7), y: l.y + LEDGE_HALF - l.jag[i] * 8 });
        pts.push({ x: x0, y: l.y + LEDGE_HALF + 6 });
        g.fillStyle(0x000000, 0.3); g.fillPoints(pts.map((p) => ({ x: p.x, y: p.y + 14 })), true, true);
        g.fillStyle(STONE_DARK, 0.95); g.fillPoints(pts, true, true);
        g.fillStyle(mixC(STONE, STRATA[1], 0.4), 0.95);
        g.fillPoints(pts.slice(0, 9).concat([{ x: x0 + sgn * l.depth, y: l.y - 6 }, { x: x0, y: l.y - 6 }]), true, true);
        g.lineStyle(2, STONE_LIT, 0.8);
        g.beginPath(); pts.slice(0, 9).forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.strokePath();
        for (let i = 0; i < 6; i++) {
          const ph = ((time / 500) + i / 6) % 1;
          g.fillStyle(DUST, 0.6 * (1 - ph)); g.fillCircle(x0 + sgn * (l.depth - 6) + (i - 3) * 3, l.y + 10 + ph * 50, 2.5);
        }
      }
      // The counterweight: the chain, then the great weight itself tearing up through the cage.
      if (cw) {
        const k = clampN((time - cw.at) / Math.max(1, cw.passAt - cw.at), 0, 1);
        const chainBot = time < cw.passAt ? top + k * (H - top) : H;
        g.lineStyle(5, CHAIN, 0.9); g.lineBetween(cw.x, top, cw.x, chainBot);
        for (let y = top + ((time / 3) % 14); y < chainBot; y += 14) { g.lineStyle(2, lit(CHAIN, 0.3), 1); g.strokeEllipse(cw.x, y, 7, 12); }
        if (time >= cw.passAt && time < cw.passAt + CW_PASS) {
          const f = (time - cw.passAt) / CW_PASS;
          const wy = H + 60 - f * (H - top + 140);
          g.fillStyle(0x000000, 0.3); g.fillRect(cw.x - CW_HALF + 8, wy - 50, CW_HALF * 2, 120);
          g.fillStyle(IRON, 1); g.fillRect(cw.x - CW_HALF, wy - 60, CW_HALF * 2, 120);
          g.fillStyle(lit(IRON, 0.25), 1); g.fillRect(cw.x - CW_HALF, wy - 60, CW_HALF * 2, 6);
          g.lineStyle(3, dim(IRON, 0.5), 1); g.strokeRect(cw.x - CW_HALF + 6, wy - 52, CW_HALF * 2 - 12, 104);
          gravaneSeal(g, cw.x, wy, 26, BRASS_DARK, 0.9);
          for (let i = 0; i < 8; i++) { g.fillStyle(DUST, 0.5); g.fillCircle(cw.x - CW_HALF + i * 16, wy + 66 + (i % 3) * 8, 5); }
        }
      }
      // The braced: a brass tag on a chain round their neck.
      for (const w of WHO) {
        if (!braced(w)) continue;
        const f = fighter(w);
        g.lineStyle(1.5, BRASS, 0.9); g.strokeCircle(f.x, f.y - 6, 26 + Math.sin(time / 120) * 2);
        g.fillStyle(BRASS, 1); g.fillRect(f.x + 14, f.y - 40, 10, 8);
      }
    },
    drawHud(g) {
      // The depth gauge: a brass dial that never stops turning.
      const cx = W - 70, cy = top + 30;
      g.fillStyle(0x0a0806, 0.85); g.fillCircle(cx, cy, 24);
      g.lineStyle(2, BRASS, 1); g.strokeCircle(cx, cy, 24);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.lineBetween(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22); }
      const a = depth * 0.6 - Math.PI / 2;
      g.lineStyle(3, TITHE_RED, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * 18, cy + Math.sin(a) * 18);
      g.fillStyle(BRASS, 1); g.fillCircle(cx, cy, 3);
    },
  };
};

// ── Warden 2: Faces at the Slits ─────────────────────────────────────

/**
 * Six sealed cells stand in the walls of the Turnkey's yard, and every one has a face at its
 * slit. Stand at a cell door and chip its mortar (1.6s; a ring shows the work). Whoever frees
 * a prisoner has a friend: the prisoner tears a stone out of the wall and hurls it at the other
 * fighter. The Turnkey frees them too — so the stone comes at you. Every few seconds she
 * reseals an open cell, and anyone standing at its door is mortared in with it (rooted, hurt).
 */
const slits = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const W = ctx.W, H = ctx.H;
  const CHIP_MS = ctx.hard ? 1900 : 1600;
  const DOOR_R = 58;
  const RESEAL_EVERY = ctx.hard ? 4200 : 5200;
  const RESEAL_WARN = 1300;

  interface Cell { x: number; y: number; side: -1 | 1; chip: number; by: Who | null; open: boolean; resealAt: number; skin: number; seed: number; thrownAt: number; mortarAt: number }
  const cells: Cell[] = [];
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 3; i++) {
      cells.push({
        x: side < 0 ? 46 : W - 46, y: top + 110 + i * ((H - top - 170) / 2), side, chip: 0, by: null, open: false,
        resealAt: 0, skin: SKINS[(i * 2 + (side < 0 ? 0 : 1)) % SKINS.length], seed: i * 11 + (side < 0 ? 3 : 7), thrownAt: -9999, mortarAt: -9999,
      });
    }
  }
  /** Stones thrown at the Turnkey (the player's friends) — they home, the interred aim well. */
  interface Stone { x: number; y: number; t0: number; spin: number }
  let stones: Stone[] = [];
  let nextReseal = 0;
  const mortaredUntil: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const now = (): number => ctx.scene.time.now;
  const doorPt = (c: Cell): Pt => ({ x: c.x - c.side * 40, y: c.y + 20 });

  const free = (c: Cell, w: Who, time: number) => {
    c.open = true; c.chip = 0; c.by = null; c.thrownAt = time;
    c.resealAt = 0;
    ctx.sfx('stone-slam');
    const d = doorPt(c);
    if (w === 'player') {
      stones.push({ x: c.x, y: c.y, t0: time, spin: ctx.rng() * 6 });
      ctx.float(d.x, d.y - 60, 'FREED — "THAT ONE?"', '#e8dcc0');
    } else {
      const p = ctx.player;
      const a = Math.atan2(p.y - c.y, p.x - c.x);
      ctx.tk.spawnBullet({ x: c.x, y: c.y, angle: a, speed: 470, damage: 16, r: 11, color: STONE_LIT, lifeMs: 2400 });
      ctx.float(d.x, d.y - 60, 'THE TURNKEY FREES ONE', '#c8a8a8');
    }
  };

  return {
    update(time, dt) {
      const s = stepOf(dt);
      if (nextReseal === 0) nextReseal = time + RESEAL_EVERY;
      // Chipping: whoever stands alone at a sealed door works its mortar loose.
      for (const c of cells) {
        if (c.open) continue;
        const d = doorPt(c);
        const at = WHO.filter((w) => alive(fighter(w)) && dist(fighter(w).x, fighter(w).y, d.x, d.y) < DOOR_R);
        if (at.length === 1) {
          if (c.by !== at[0]) { c.by = at[0]; c.chip = Math.max(0, c.chip - 0.25); }
          c.chip += (s * 1000) / CHIP_MS;
          if (Math.floor(time / 260) !== Math.floor((time - s * 1000) / 260)) ctx.sfx('stab');
          if (c.chip >= 1) free(c, at[0], time);
        } else if (at.length === 0) {
          c.chip = Math.max(0, c.chip - s * 0.15);
        }
      }
      // The friends' stones: half a second's flight, bending onto the Turnkey.
      for (const st of stones) {
        const n = ctx.npc;
        const k = (time - st.t0) / 480;
        st.x += (n.x - st.x) * clampN(s * 9, 0, 1);
        st.y += (n.y - 30 - st.y) * clampN(s * 9, 0, 1);
        if (k >= 1 && alive(n)) {
          ctx.hit(n, 18, n.x, n.y);
          ctx.stun(n, 500);
          ctx.float(n.x, n.y - 56, 'STONED', '#e8dcc0');
          ctx.sfx('rock-throw');
          st.t0 = -1;
        }
      }
      stones = stones.filter((st) => st.t0 >= 0 && time - st.t0 < 800);
      // The round: she picks an open cell and trowels it shut again.
      if (time >= nextReseal) {
        const open = cells.filter((c) => c.open && c.resealAt === 0);
        if (open.length) {
          const c = open[Math.floor(ctx.rng() * open.length)];
          c.resealAt = time + ctx.tk.warn(RESEAL_WARN);
          ctx.sfx('trap-set');
        }
        nextReseal = time + RESEAL_EVERY;
      }
      for (const c of cells) {
        if (!c.open || c.resealAt === 0 || time < c.resealAt) continue;
        c.open = false; c.resealAt = 0; c.mortarAt = time;
        const d = doorPt(c);
        ctx.sfx('stone-rise');
        for (const w of WHO) {
          const f = fighter(w);
          if (!alive(f) || dist(f.x, f.y, d.x, d.y) > DOOR_R + 10) continue;
          ctx.hit(f, 10, f.x, f.y);
          ctx.root(f, 1300);
          mortaredUntil[w] = time + 1300;
          ctx.float(f.x, f.y - 52, 'MORTARED IN', '#e8e0c8');
        }
      }
    },
    playerTakenMult() { return now() < mortaredUntil.player ? 1.2 : 1; },
    npcTakenMult() { return now() < mortaredUntil.npc ? 1.2 : 1; },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      // Never stand at a door she is about to reseal.
      for (const c of cells) {
        if (c.open && c.resealAt > 0) {
          const d = doorPt(c);
          if (dist(n.x, n.y, d.x, d.y) < DOOR_R + 30) return { x: W / 2, y: (top + H) / 2 };
        }
      }
      // Go and free the sealed cell that is nearest her and furthest from the player.
      let best: Pt | null = null, bs = -Infinity;
      for (const c of cells) {
        if (c.open) continue;
        const d = doorPt(c);
        const sc = dist(p.x, p.y, d.x, d.y) * 0.7 - dist(n.x, n.y, d.x, d.y) + c.chip * (c.by === 'npc' ? 400 : 0);
        if (sc > bs) { bs = sc; best = d; }
      }
      return best;
    },
    drawGround(g, time) {
      for (const c of cells) {
        const d = doorPt(c);
        // The door-stone, the chip ring and the mortar dust round it.
        g.fillStyle(0x000000, 0.2); g.fillEllipse(d.x, d.y + 6, DOOR_R * 1.8, DOOR_R * 0.7);
        if (!c.open) {
          g.lineStyle(2, MORTAR, 0.35); g.strokeCircle(d.x, d.y, DOOR_R);
          if (c.chip > 0) {
            g.lineStyle(5, c.by === 'player' ? 0xd8f0a8 : 0xd8a0a0, 0.9);
            g.beginPath(); g.arc(d.x, d.y, DOOR_R, -Math.PI / 2, -Math.PI / 2 + c.chip * Math.PI * 2, false); g.strokePath();
          }
        } else if (c.resealAt > 0) {
          const k = clampN(1 - (c.resealAt - time) / ctx.tk.warn(RESEAL_WARN), 0, 1);
          g.fillStyle(MORTAR, 0.12 + k * 0.25); g.fillCircle(d.x, d.y, DOOR_R + 10);
          if (k > 0.75 && Math.floor(time / 100) % 2 === 0) { g.lineStyle(3, 0xff9a7a, 0.8); g.strokeCircle(d.x, d.y, DOOR_R + 10); }
        }
        for (let i = 0; i < 5; i++) { g.fillStyle(MORTAR, 0.3); g.fillCircle(d.x - 20 + i * 10, d.y + 30 - (i % 2) * 6, 2); }
      }
    },
    drawAir(g, time) {
      const p = ctx.player, n = ctx.npc;
      for (const c of cells) {
        const x0 = c.side < 0 ? 0 : W - 84;
        const y0 = c.y - 56;
        // The cell front, set into the yard wall.
        g.fillStyle(STONE_DARK, 1); g.fillRect(x0, y0, 84, 104);
        g.fillStyle(STONE_LIT, 1); g.fillRect(c.side < 0 ? 76 : W - 84, y0, 8, 104);
        g.fillStyle(STONE_LIT, 1); g.fillRect(x0, y0, 84, 8);
        if (!c.open) {
          // Mortared blocks; the more chipped, the more of them crack and shift.
          for (let r = 0; r < 8; r++) {
            for (let q = 0; q < 4; q++) {
              const bx = (c.side < 0 ? 4 : W - 80) + q * 18 + (r % 2) * 6, by = y0 + 10 + r * 11.5;
              const loose = c.chip > (r * 4 + q) / 34;
              const jitter = loose ? Math.sin(time / 40 + r + q) * 1.2 : 0;
              g.fillStyle(loose ? dim(STONE, 0.2) : STONE, 1); g.fillRect(bx + jitter, by, 15, 9.5);
              g.fillStyle(MORTAR, loose ? 0.2 : 0.7); g.fillRect(bx, by + 9.5, 15, 1.5);
            }
          }
          if (time - c.mortarAt < 700) {
            const k = (time - c.mortarAt) / 700;
            g.fillStyle(MORTAR, 0.9 * (1 - k)); g.fillRect(x0, y0, 84, 104);
          }
          // The slit, and the face at it, looking at whoever is nearer.
          const fx = c.x - c.side * 4, fy = y0 + 34;
          g.fillStyle(SOOT, 1); g.fillRect(fx - 18, fy - 6, 36, 12);
          const tgt = dist(p.x, p.y, c.x, c.y) < dist(n.x, n.y, c.x, c.y) ? p : n;
          slitFace(g, fx + clampN((tgt.x - fx) / 200, -1, 1) * 2, fy, 1.05, c.skin, time / 1000, c.seed);
        } else {
          // Open: the dark of the cell, and the prisoner leaning out to throw.
          g.fillStyle(SOOT, 1); g.fillRect(c.side < 0 ? 6 : W - 78, y0 + 10, 70, 92);
          const k = clampN((time - c.thrownAt) / 500, 0, 1);
          const lean = Math.sin(k * Math.PI) * 14 * -c.side;
          const bx = c.x + lean, by = y0 + 64;
          g.fillStyle(dim(c.skin, 0.25), 1); g.fillEllipse(bx, by + 10, 30, 44);
          g.fillStyle(c.skin, 1); g.fillCircle(bx, by - 20, 11);
          g.fillStyle(0x2a2420, 1); g.fillCircle(bx - 4, by - 22, 1.6); g.fillCircle(bx + 4, by - 22, 1.6);
          g.lineStyle(5, c.skin, 1); g.lineBetween(bx, by - 2, bx - c.side * (14 + k * 16), by - 18 - k * 14);
          // A stone collar on them still.
          g.fillStyle(STONE, 1); g.fillEllipse(bx, by - 8, 26, 9);
          if (c.resealAt > 0) {
            const kk = clampN(1 - (c.resealAt - time) / ctx.tk.warn(RESEAL_WARN), 0, 1);
            // The trowel coming, mortar rising up the doorway course by course.
            g.fillStyle(MORTAR, 0.8); g.fillRect(c.side < 0 ? 6 : W - 78, y0 + 102 - 92 * kk, 70, 92 * kk);
            g.fillStyle(IRON, 1);
            g.fillTriangle(c.x - c.side * 30, y0 + 98 - 92 * kk, c.x - c.side * 50, y0 + 104 - 92 * kk, c.x - c.side * 30, y0 + 110 - 92 * kk);
          }
        }
        // The cell's debt plate.
        g.fillStyle(BRASS, 1); g.fillRect(c.x - 9, y0 + 86, 18, 8);
      }
      for (const st of stones) {
        const k = clampN((time - st.t0) / 480, 0, 1);
        g.fillStyle(0x000000, 0.25); g.fillEllipse(st.x, st.y + 40, 18, 6);
        const a = st.spin + k * 9;
        g.fillStyle(STONE, 1);
        g.fillPoints([0, 1, 2, 3, 4].map((i) => ({ x: st.x + Math.cos(a + i * 1.26) * 10, y: st.y + Math.sin(a + i * 1.26) * 9 })), true, true);
        g.fillStyle(STONE_LIT, 1); g.fillCircle(st.x - 3, st.y - 3, 3);
      }
      for (const w of WHO) {
        if (now() >= mortaredUntil[w]) continue;
        const f = fighter(w);
        g.fillStyle(MORTAR, 0.8); g.fillEllipse(f.x, f.y + 4, 46, 16);
        g.fillStyle(lit(MORTAR, 0.2), 0.8); g.fillEllipse(f.x - 6, f.y + 1, 18, 5);
      }
    },
    drawHud(g) {
      // The Turnkey's ring: one key per cell, bright while that cell stands open.
      const cx = ctx.W / 2, cy = top + 20;
      g.lineStyle(2, BRASS_DARK, 1); g.strokeCircle(cx, cy, 14);
      cells.forEach((c, i) => {
        const a = Math.PI * 0.15 + (i / 5) * Math.PI * 0.7;
        const kx = cx + Math.cos(a) * 34 * (i < 3 ? -1 : 1), ky = cy + Math.sin(a) * 6;
        g.fillStyle(c.open ? BRASS : dim(BRASS, 0.55), 1); g.fillCircle(kx, ky, 5); g.fillRect(kx - 1.5, ky, 3, 12);
        g.fillRect(kx, ky + 8, 4, 2); g.fillRect(kx, ky + 11, 3, 2);
      });
    },
  };
};

// ── Warden 3: Grave Dust ─────────────────────────────────────────────

/**
 * The crypt floor gathers grave-dust all the time; only feet keep it down, and dust underfoot
 * slows you. Four tomb-slabs are set in the floor; every few seconds one groans and its lid
 * slides (dust trickles out first) and the dead exhale — a burst of dust over everything near.
 * Anyone in the burst who is standing in deep dust is BURIED: rooted, hurt, and taking more
 * for a moment. The Sexton sweeps as he goes; keep your own ground clear and walk him into drifts.
 */
const graveDust = (ctx: GimmickCtx): EncounterGimmick => {
  const top = ctx.top;
  const W = ctx.W, H = ctx.H;
  const T = 48;
  const COLS = Math.ceil(W / T), ROWS = Math.ceil((H - top) / T);
  const SETTLE = ctx.hard ? 0.075 : 0.058;  // depth per second
  const SCUFF = 1.6, SWEEP = 2.4;            // depth cleared per second under a fighter / the sexton
  const DEEP = 0.55;
  const GROAN_EVERY = ctx.hard ? 4800 : 5800;
  const GROAN_WARN = 1800;
  const BURST_R = 210;
  const BURIED_MS = 1500;

  const dust = new Float32Array(COLS * ROWS);
  for (let i = 0; i < dust.length; i++) dust[i] = 0.15 + ctx.rng() * 0.35;
  const idx = (x: number, y: number): number => {
    const c = clampN(Math.floor(x / T), 0, COLS - 1), r = clampN(Math.floor((y - top) / T), 0, ROWS - 1);
    return r * COLS + c;
  };
  const depthAt = (x: number, y: number): number => dust[idx(x, y)];
  const SLABS: Pt[] = [{ x: 210, y: top + 150 }, { x: W - 210, y: top + 150 }, { x: 210, y: H - 110 }, { x: W - 210, y: H - 110 }];
  let groan: { i: number; at: number; burstAt: number } | null = null;
  let burstFx: { x: number; y: number; at: number } | null = null;
  let nextGroan = 0;
  let lastSlab = -1;
  const buriedUntil: Record<Who, number> = { player: 0, npc: 0 };
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);
  const now = (): number => ctx.scene.time.now;

  const clearUnder = (f: Fighter, rate: number, rad: number, s: number) => {
    const c0 = Math.floor((f.x - rad) / T), c1 = Math.floor((f.x + rad) / T);
    const r0 = Math.floor((f.y - top - rad) / T), r1 = Math.floor((f.y - top + rad) / T);
    for (let r = Math.max(0, r0); r <= Math.min(ROWS - 1, r1); r++) {
      for (let c = Math.max(0, c0); c <= Math.min(COLS - 1, c1); c++) {
        const i = r * COLS + c;
        dust[i] = Math.max(0, dust[i] - rate * s);
      }
    }
  };

  const exhale = (time: number, slab: Pt) => {
    ctx.sfx('quake');
    burstFx = { x: slab.x, y: slab.y, at: time };
    for (const w of WHO) {
      const f = fighter(w);
      if (!alive(f) || dist(f.x, f.y, slab.x, slab.y) > BURST_R) continue;
      if (depthAt(f.x, f.y) >= DEEP) {
        ctx.hit(f, 14, f.x, f.y);
        ctx.root(f, BURIED_MS);
        buriedUntil[w] = time + BURIED_MS;
        ctx.float(f.x, f.y - 52, w === 'npc' ? 'THE SEXTON IS BURIED' : 'BURIED', '#e8d8b8');
      } else {
        ctx.float(f.x, f.y - 46, 'SWEPT CLEAN', '#c8d8b8');
      }
    }
    // The breath lays a fresh drift over everything near the slab.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * T + T / 2, y = top + r * T + T / 2;
        const d = dist(x, y, slab.x, slab.y);
        if (d < BURST_R) dust[r * COLS + c] = Math.min(1, dust[r * COLS + c] + 0.6 * (1 - d / BURST_R) + 0.15);
      }
    }
  };

  return {
    update(time, dt) {
      const s = stepOf(dt);
      for (let i = 0; i < dust.length; i++) dust[i] = Math.min(1, dust[i] + SETTLE * s);
      if (alive(ctx.player)) clearUnder(ctx.player, SCUFF, 22, s);
      if (alive(ctx.npc)) clearUnder(ctx.npc, SWEEP, 44, s);
      if (nextGroan === 0) nextGroan = time + 3600;
      if (!groan && time >= nextGroan) {
        let i = Math.floor(ctx.rng() * SLABS.length);
        if (i === lastSlab) i = (i + 1) % SLABS.length;
        lastSlab = i;
        groan = { i, at: time, burstAt: time + ctx.tk.warn(GROAN_WARN) };
        ctx.sfx('stone-rise');
        ctx.float(SLABS[i].x, SLABS[i].y - 50, 'THE DEAD STIR', '#d8c8a8');
      }
      if (groan && time >= groan.burstAt) {
        exhale(time, SLABS[groan.i]);
        groan = null;
        nextGroan = time + GROAN_EVERY;
      }
    },
    playerSpeedMult() { return 1 - 0.45 * depthAt(ctx.player.x, ctx.player.y); },
    npcSpeedMult() { return 1 - 0.3 * depthAt(ctx.npc.x, ctx.npc.y); },
    playerTakenMult() { return now() < buriedUntil.player ? 1.3 : 1; },
    npcTakenMult() { return now() < buriedUntil.npc ? 1.3 : 1; },
    npcSeek() {
      if (!groan) return null;
      const n = ctx.npc;
      const sl = SLABS[groan.i];
      if (dist(n.x, n.y, sl.x, sl.y) > BURST_R + 30 && depthAt(n.x, n.y) < DEEP) return null;
      // Find clear ground outside the burst — the Sexton knows his floor.
      let best: Pt | null = null, bd = Infinity;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = c * T + T / 2, y = top + r * T + T / 2;
          if (x < 60 || x > W - 60 || y > H - 40) continue;
          if (dist(x, y, sl.x, sl.y) < BURST_R + 40) continue;
          const d = dist(x, y, n.x, n.y) + dust[r * COLS + c] * 300;
          if (d < bd) { bd = d; best = { x, y }; }
        }
      }
      return best;
    },
    drawGround(g, time) {
      // The tomb-slabs set in the floor; the groaning one's lid sliding.
      SLABS.forEach((sl, i) => {
        const shift = groan && groan.i === i ? clampN((time - groan.at) / Math.max(1, groan.burstAt - groan.at), 0, 1) * 0.35 : 0;
        sarcophagus(g, sl.x, sl.y + 40, 70, 90, shift, false, 0.9);
      });
      // The dust, tile by tile, lumped so it reads as drift and not as a grid.
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const d = dust[r * COLS + c];
          if (d < 0.08) continue;
          const x = c * T + T / 2, y = top + r * T + T / 2;
          const wob = ((c * 7 + r * 13) % 5) - 2;
          g.fillStyle(DUST_DEEP, 0.25 + d * 0.35); g.fillEllipse(x + wob, y + 3, T * (0.9 + d * 0.4), T * (0.55 + d * 0.3));
          g.fillStyle(DUST, 0.2 + d * 0.55); g.fillEllipse(x + wob, y, T * (0.75 + d * 0.4), T * (0.45 + d * 0.25));
          if (d >= DEEP) { g.fillStyle(lit(DUST, 0.25), 0.35); g.fillEllipse(x + wob - 6, y - 5, T * 0.4, T * 0.15); }
        }
      }
      if (groan) {
        const sl = SLABS[groan.i];
        const k = clampN((time - groan.at) / Math.max(1, groan.burstAt - groan.at), 0, 1);
        g.lineStyle(3, 0xe8d8b8, 0.25 + k * 0.5); g.strokeCircle(sl.x, sl.y, BURST_R);
        g.fillStyle(0xe8d8b8, 0.04 + k * 0.1); g.fillCircle(sl.x, sl.y, BURST_R * k);
        if (k > 0.8 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(3, 0xff9a7a, 0.7); g.strokeCircle(sl.x, sl.y, BURST_R); }
        for (let i = 0; i < 8; i++) {
          const ph = ((time / 400) + i / 8) % 1;
          g.fillStyle(DUST, 0.6 * (1 - ph)); g.fillCircle(sl.x - 30 + i * 8, sl.y + 10 - ph * 20, 2 + ph * 2);
        }
      }
    },
    drawAir(g, time) {
      if (burstFx && time - burstFx.at < 900) {
        const k = (time - burstFx.at) / 900;
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * Math.PI * 2 + i;
          const r = BURST_R * (0.2 + k * 0.9) * (0.7 + (i % 3) * 0.15);
          g.fillStyle(i % 2 ? DUST : lit(DUST, 0.2), 0.55 * (1 - k));
          g.fillCircle(burstFx.x + Math.cos(a) * r, burstFx.y + Math.sin(a) * r * 0.7 - k * 30, 14 + k * 20);
        }
      }
      for (const w of WHO) {
        const f = fighter(w);
        if (now() < buriedUntil[w]) {
          // Heaped to the waist, a little stream still pouring off the top.
          g.fillStyle(DUST_DEEP, 0.95); g.fillEllipse(f.x, f.y + 2, 60, 26);
          g.fillStyle(DUST, 0.95); g.fillEllipse(f.x, f.y - 2, 52, 20);
          g.fillStyle(lit(DUST, 0.25), 0.7); g.fillEllipse(f.x - 8, f.y - 7, 20, 6);
        }
      }
      // The Sexton's broom-wake: puffs off his heels.
      const n = ctx.npc;
      if (alive(n)) {
        for (let i = 0; i < 4; i++) {
          const ph = ((time / 300) + i / 4) % 1;
          g.fillStyle(DUST, 0.4 * (1 - ph)); g.fillCircle(n.x - 24 + i * 16, n.y + 10 - ph * 16, 4 + ph * 4);
        }
      }
    },
    drawHud(g) {
      // How deep it is under your feet: a little hourglass of dust.
      const d = depthAt(ctx.player.x, ctx.player.y);
      const x = 40, y = top + 16;
      g.fillStyle(0x0a0806, 0.85); g.fillRoundedRect(x - 14, y - 4, 28, 50, 6);
      g.lineStyle(2, BRASS, 1); g.strokeRoundedRect(x - 14, y - 4, 28, 50, 6);
      g.fillStyle(d >= DEEP ? 0xff9a7a : DUST, 1); g.fillRect(x - 9, y + 42 - 40 * d, 18, 40 * d);
      g.lineStyle(1, STONE_LIT, 0.7); g.lineBetween(x - 11, y + 42 - 40 * DEEP, x + 11, y + 42 - 40 * DEEP);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const SEPULCHRE_GIMMICKS: GimmickDef[] = [
  {
    id: 'sepulchre-descent',
    rules: 'The lift is going down. Ledges scrape in from the walls; the counterweight comes up its chain. First to a landing door is braced.',
    make: descent,
  },
  {
    id: 'sepulchre-slits',
    rules: 'Chip a cell\'s mortar to free its prisoner: they stone whoever did not free them. Stand at a door as she reseals it and you are mortared in.',
    make: slits,
  },
  {
    id: 'sepulchre-grave-dust',
    rules: 'Dust settles everywhere feet are not; it slows you. When a tomb-slab breathes out, anyone standing in deep dust nearby is buried.',
    make: graveDust,
  },
];

export const SEPULCHRE_WARDENS: EncounterDef[] = [
  {
    id: 'sepulchre-warden-1', court: 'sepulchre', name: 'The Descent',
    foeName: 'Liftwarden Corbel Haske', foeElement: 'gravity', difficulty: 5, hpMult: 1.15,
    gimmick: 'sepulchre-descent', at: { x: 900, y: 1690 }, coins: 130,
    look: { body: 0x9a8a78, accent: 0x3a3836, hat: 'miner', traits: ['beard', 'tool', 'pack'], size: 1.2, eye: 0xffd27a },
    challenge: [
      'Thirty years I have taken them down. Debtors, mostly. A song, once. A whole library, in crates.',
      'Nobody has ever asked to come down. You asked. That makes you the strangest cargo I have carried.',
      'Get in the cage, then. It only goes the one way.',
    ],
    beaten: [
      'You rode the counterweight\'s draught and stepped off at the landings like a liftman born. Huh.',
      'The galleries are below. I will send the cage up empty — the first time it has gone up with nobody to fetch.',
    ],
  },
  {
    id: 'sepulchre-warden-2', court: 'sepulchre', name: 'Faces at the Slits',
    foeName: 'Turnkey Agathe Mortlake', foeElement: 'silence', difficulty: 5, hpMult: 1.2,
    gimmick: 'sepulchre-slits', at: { x: 1000, y: 1030 }, coins: 130,
    look: { body: 0xa89a88, accent: 0x2a2a30, hat: 'hood', traits: ['mask', 'satchel', 'lantern'], size: 1.0, eye: 0xc8d8e8 },
    challenge: [
      'Hush. Every cell in my yard is asleep. Do not wake them.',
      'Six debts on this ring. I know every one by the sound their door makes. They know me by my keys.',
      'If you open a door down here, you had better know who is behind it. I always do.',
    ],
    beaten: [
      'They threw for you. Every one of them. Not one for me, in all these years of bringing their bread.',
      'Take the ring. No — take it. Open whatever you like. The crypt is below; Lorrimer keeps the dead tidy.',
    ],
  },
  {
    id: 'sepulchre-warden-3', court: 'sepulchre', name: 'Grave Dust',
    foeName: 'Sexton Lorrimer Dask', foeElement: 'dune', difficulty: 5, hpMult: 1.25,
    gimmick: 'sepulchre-grave-dust', at: { x: 900, y: 375 }, coins: 130,
    look: { body: 0x8a7e70, accent: 0x4a3e30, hat: 'tophat', traits: ['scarf', 'cane'], size: 1.15, eye: 0xd8c8a8 },
    challenge: [
      'Shh. Shh. They are sleeping. All the old line, and their households, and their dogs. Do not scuff.',
      'I sweep the crypt every hour. It is the only clean floor in the hold. The dust goes where I am not.',
      'So I suggest you stand where I am. Oh — you cannot. I am always moving.',
    ],
    beaten: [
      'Buried in my own sweepings. Forty years of tidy, and I go under like a dropped glove.',
      'He is at the bottom. On the King\'s box. Do not ask him what is in it. He has never dared to look.',
    ],
  },
];
