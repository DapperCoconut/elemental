import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import { IRON, IRON_DARK, IRON_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';

/**
 * Small Beer — Tapster Jem Grout, in the King's telling the man who kept the Owing House tap and
 * poured for the debtors on the slate, so that every man who came in owing went out owing more.
 *
 * Three casks stand on trestles about the yard. Stand at a spigot and you drink: a draught of health,
 * and a measure of drink — and a fighter in drink hits harder but *reels*: lurches that grow with
 * every measure. Four measures and you pass out cold. Drink wears off slowly.
 *
 * Grout lobs full tankards at you (dodge the splash: it hurts and it souses you a measure). Strike a
 * cask and its spigot blows: a jet of beer drives out the far side, away from you, sousing whoever it
 * catches. Souse him to four and he passes out where he stands. He drinks to heal and mends his casks.
 * Past half he throws two tankards at a time.
 */

const ID = fallenId('shackle', 'small-beer');
const SIP_MS = 900;
const SIP_HEAL = 7;
const SIP_COOL = 1600;
const PASS_OUT = 4;
const SOBER_MS = 6000;
const LURCH_MS = 900;
const LURCH_PX = 20;
const LOB_MS = 3400;
const LOB_WARN = 1050;
const LOB_R = 46;
const LOB_DMG = 9;
const JET_WARN = 380;
const JET_MS = 1100;
const JET_LEN = 440;
const JET_HALF = 32;
const DRY_MS = 7000;

/** A cask on its trestle: who is drinking at it, and when its spigot last blew. */
interface Cask { x: number; y: number; target: StrikeTarget | null; dryUntil: number; jetAt: number; jetA: number; soused: Set<Fighter>; drinking: Map<Fighter, number>; cool: Map<Fighter, number> }
/** One fighter's drink: measures, when the last wears off, and the lurch in progress. */
interface Drunk { level: number; soberAt: number; nextLurch: number; lx: number; ly: number; lurchUntil: number; outUntil: number }
/** A tankard in the air. */
interface Lob { x0: number; y0: number; x: number; y: number; at: number; land: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  const casks: Cask[] = ([
    { x: W * 0.2, y: top + 120 }, { x: W * 0.8, y: top + 120 }, { x: W * 0.5, y: H - 80 },
  ] as Pt[]).map((p) => ({ ...p, target: null, dryUntil: 0, jetAt: 0, jetA: 0, soused: new Set<Fighter>(), drinking: new Map<Fighter, number>(), cool: new Map<Fighter, number>() }));
  const drink = new Map<Fighter, Drunk>([
    [player, { level: 0, soberAt: 0, nextLurch: 0, lx: 0, ly: 0, lurchUntil: 0, outUntil: 0 }],
    [npc, { level: 0, soberAt: 0, nextLurch: 0, lx: 0, ly: 0, lurchUntil: 0, outUntil: 0 }],
  ]);
  const lobs: Lob[] = [];
  const puddles: { x: number; y: number; at: number; r: number }[] = [];
  let nextLob = 0;
  let late = false;
  let started = false;

  const spigot = (c: Cask): Pt => ({ x: c.x, y: c.y + 14 });
  const lvl = (f: Fighter): number => drink.get(f)?.level ?? 0;

  function souse(f: Fighter, time: number): void {
    const d = drink.get(f);
    if (!d || !alive(f) || time < d.outUntil) return;
    d.level++;
    d.soberAt = time + SOBER_MS;
    if (d.level >= PASS_OUT) {
      d.level = 1;
      d.outUntil = time + 1800;
      ctx.stun(f, 1700);
      ctx.float(f.x, f.y - 52, 'PASSED OUT', f === player ? '#ffb0a0' : '#d8f0a0');
      ctx.sfx('status-stun');
    }
  }

  for (const c of casks) {
    c.target = ctx.target({
      x: c.x, y: c.y - 14, r: 26,
      onStruck: (by) => {
        const now = tk.now;
        if (now < c.dryUntil) return;
        const striker = by === 'player' ? player : npc;
        // The jet drives out the far side of the cask from whoever struck it.
        c.jetA = Math.atan2(c.y - striker.y, c.x - striker.x);
        c.jetAt = now + JET_WARN;
        c.dryUntil = now + DRY_MS;
        c.soused.clear();
        ctx.sfx('splash');
      },
    });
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextLob = time + 2600; ctx.banner('DRINK TO MEND AND HIT HARDER — BUT YOU REEL. FOUR AND YOU ARE OUT', '#f0d48a'); }
      if (!late && npc.hp < npc.maxHp * 0.5) { late = true; ctx.banner('A ROUND FOR THE HOUSE', '#ffb0a0'); ctx.sfx('boss-phase'); }
      // Drinking: a fighter at a full cask's spigot takes a draught every so often.
      for (const c of casks) {
        for (const f of [player, npc]) {
          const at = alive(f) && time >= c.dryUntil && dist(f.x, f.y, spigot(c).x, spigot(c).y) < 48 && time >= (c.cool.get(f) ?? 0);
          if (!at) { c.drinking.delete(f); continue; }
          const since = c.drinking.get(f) ?? time;
          c.drinking.set(f, since);
          if (time - since >= SIP_MS) {
            c.drinking.delete(f);
            c.cool.set(f, time + SIP_COOL);
            ctx.heal(f, SIP_HEAL);
            souse(f, time);
            ctx.sfx('bubble');
          }
        }
        // A blown spigot: one jet, each fighter soused at most once by it.
        if (c.jetAt && time >= c.jetAt) {
          if (time > c.jetAt + JET_MS) { c.jetAt = 0; continue; }
          const ex = c.x + Math.cos(c.jetA) * JET_LEN, ey = c.y + Math.sin(c.jetA) * JET_LEN;
          for (const f of [player, npc]) {
            if (c.soused.has(f) || !alive(f) || segDist(f.x, f.y, c.x, c.y, ex, ey) > JET_HALF + 20) continue;
            c.soused.add(f);
            souse(f, time);
            ctx.nudge(f, Math.cos(c.jetA) * 46, Math.sin(c.jetA) * 46);
            if (f === player) tk.hitPlayer(4, f.x, f.y); else ctx.hit(npc, 6, f.x, f.y);
            ctx.sfx('water-jet');
          }
          if (Math.floor(time / 140) % 3 === 0) puddles.push({ x: ex - Math.cos(c.jetA) * rng() * JET_LEN * 0.6, y: ey - Math.sin(c.jetA) * rng() * JET_LEN * 0.6, at: time, r: 14 + rng() * 14 });
        }
      }
      // Drink: wearing off, and the reel.
      for (const [f, d] of drink) {
        if (d.level > 0 && time >= d.soberAt) { d.level--; d.soberAt = time + SOBER_MS; }
        if (!alive(f) || d.level <= 0) continue;
        if (time >= d.nextLurch) {
          d.nextLurch = time + LURCH_MS * (0.8 + rng() * 0.5);
          const a = rng() * Math.PI * 2;
          d.lx = Math.cos(a); d.ly = Math.sin(a);
          d.lurchUntil = time + 280;
        }
        if (time < d.lurchUntil) {
          const px = (LURCH_PX * d.level * dt) / 0.28;
          ctx.nudge(f, d.lx * px, d.ly * px);
        }
      }
      // Tankards, lobbed at you (and past half, at where you are walking).
      if (time >= nextLob && alive(player) && alive(npc)) {
        nextLob = time + LOB_MS;
        const aims: Pt[] = [{ x: player.x, y: player.y }];
        if (late) { const h = ctx.facing(player); aims.push({ x: player.x + Math.cos(h) * 130, y: player.y + Math.sin(h) * 130 }); }
        for (const p of aims) lobs.push({ x0: npc.x, y0: npc.y - 30, x: tk.clampX(p.x, 50), y: tk.clampY(p.y, 50), at: time, land: time + tk.warn(LOB_WARN) });
        ctx.sfx('whoosh');
      }
      for (let i = lobs.length - 1; i >= 0; i--) {
        const l = lobs[i];
        if (time < l.land) continue;
        lobs.splice(i, 1);
        puddles.push({ x: l.x, y: l.y, at: time, r: 30 });
        ctx.sfx('slime-splat');
        if (alive(player) && dist(player.x, player.y, l.x, l.y) < LOB_R + 18) { tk.hitPlayer(LOB_DMG, l.x, l.y); souse(player, time); }
      }
      while (puddles.length > 40) puddles.shift();
    },

    playerTakenMult() { return 1 + 0.1 * lvl(npc); },
    npcTakenMult() { return 1 + 0.12 * lvl(player); },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      const time = tk.now;
      const me = lvl(npc);
      // Sober enough and hurt: drink at the nearest full cask.
      if (me < 2 && npc.hp < npc.maxHp * 0.75) {
        let best: Cask | null = null, bd = Infinity;
        for (const c of casks) { if (time < c.dryUntil) continue; const d = dist(npc.x, npc.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
        if (best) return spigot(best);
      }
      // Too far gone: keep out of every cask's jet line from you.
      if (me >= 2) {
        for (const c of casks) {
          if (dist(npc.x, npc.y, c.x, c.y) > 260) continue;
          const a = Math.atan2(npc.y - c.y, npc.x - c.x) + Math.PI / 2;
          return { x: clamp(npc.x + Math.cos(a) * 140, 60, W - 60), y: clamp(npc.y + Math.sin(a) * 140, top + 60, H - 60) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      for (const p of puddles) {
        const k = clamp((time - p.at) / 9000, 0, 1);
        g.fillStyle(0x8a6a2a, 0.35 * (1 - k)); g.fillEllipse(p.x, p.y, p.r * 2.2, p.r * 0.9);
        g.fillStyle(0xf4ecd0, 0.25 * (1 - k)); g.fillEllipse(p.x - p.r * 0.3, p.y - 1, p.r * 0.7, p.r * 0.2);
      }
      for (const l of lobs) {
        const k = clamp((time - l.at) / (l.land - l.at), 0, 1);
        g.lineStyle(2, 0xf0c060, 0.4 + k * 0.5); g.strokeCircle(l.x, l.y, LOB_R);
        g.fillStyle(0xf0c060, 0.1 + k * 0.15); g.fillCircle(l.x, l.y, LOB_R * k);
      }
      for (const c of casks) {
        if (!c.jetAt) continue;
        const ex = c.x + Math.cos(c.jetA) * JET_LEN, ey = c.y + Math.sin(c.jetA) * JET_LEN;
        if (time < c.jetAt) {
          g.lineStyle(JET_HALF * 2, 0xf0c060, 0.12 + Math.sin(time / 40) * 0.04); g.lineBetween(c.x, c.y, ex, ey);
        }
      }
    },

    drawAir(g, time) {
      for (const c of casks) drawCask(g, c, time);
      for (const l of lobs) {
        const k = clamp((time - l.at) / (l.land - l.at), 0, 1);
        const x = l.x0 + (l.x - l.x0) * k, y = l.y0 + (l.y - l.y0) * k - Math.sin(k * Math.PI) * 140;
        drawTankard(g, x, y, k * 9);
      }
      // Drink on a fighter: froth-bubbles rising off them, more with every measure, and the stars once out.
      for (const [f, d] of drink) {
        if (!alive(f)) continue;
        for (let i = 0; i < d.level * 2; i++) {
          const t = ((time / 1000 + i * 0.37) % 1);
          g.fillStyle(0xf4ecd0, 0.7 * (1 - t)); g.fillCircle(f.x - 12 + ((i * 7) % 24), f.y - 40 - t * 26, 2 + (i % 2));
        }
        if (time < d.outUntil) {
          for (let i = 0; i < 4; i++) {
            const a = time / 260 + (i * Math.PI) / 2;
            const sx = f.x + Math.cos(a) * 16, sy = f.y - 52 + Math.sin(a) * 5;
            g.fillStyle(0xffe08a, 1); g.fillTriangle(sx, sy - 4, sx - 3, sy + 2, sx + 3, sy + 2); g.fillTriangle(sx, sy + 4, sx - 3, sy - 2, sx + 3, sy - 2);
          }
        }
      }
    },

    drawHud(g) {
      // Two pewter pots, bottom corners: how many measures each of you has in you.
      const pots: [Fighter, number][] = [[player, 30], [npc, W - 30 - PASS_OUT * 22]];
      for (const [f, x0] of pots) {
        for (let i = 0; i < PASS_OUT; i++) {
          const x = x0 + i * 22, y = H - 30;
          const full = i < lvl(f);
          g.fillStyle(IRON_DARK, 0.9); g.fillRect(x - 7, y - 10, 14, 20);
          if (full) { g.fillStyle(i === PASS_OUT - 1 ? 0xd85a2a : 0xd8a040, 1); g.fillRect(x - 5, y - 6, 10, 14); g.fillStyle(0xf4ecd0, 1); g.fillEllipse(x, y - 7, 12, 5); }
          g.lineStyle(2, IRON_LIT, 0.9); g.strokeRect(x - 7, y - 10, 14, 20);
          g.beginPath(); g.arc(x + 9, y, 5, -Math.PI / 2, Math.PI / 2, false); g.strokePath();
        }
      }
    },
  };

  function drawCask(g: G, c: Cask, time: number): void {
    const { x, y } = c;
    const dry = time < c.dryUntil;
    shadow(g, x, y + 22, 90, 18, 0.3);
    // The trestle.
    g.fillStyle(TIMBER_DARK, 1);
    g.fillRect(x - 40, y + 2, 6, 22); g.fillRect(x + 34, y + 2, 6, 22); g.fillRect(x - 44, y - 2, 88, 6);
    // The cask on its side: staves, hoops, a bung, the spigot facing the yard.
    g.fillStyle(dim(TIMBER, 0.15), 1); g.fillEllipse(x, y - 14, 76, 40);
    g.fillStyle(TIMBER, 1); g.fillEllipse(x, y - 16, 72, 34);
    g.lineStyle(1, TIMBER_DARK, 0.7);
    for (let i = -2; i <= 2; i++) g.lineBetween(x - 34, y - 16 + i * 6, x + 34, y - 16 + i * 6);
    g.fillStyle(TIMBER_LIT, 0.5); g.fillEllipse(x - 6, y - 26, 44, 6);
    for (const hx of [-24, 24]) { g.lineStyle(4, IRON_DARK, 1); g.lineBetween(x + hx, y - 32, x + hx, y + 0); g.lineStyle(1, IRON_LIT, 0.6); g.lineBetween(x + hx - 1, y - 32, x + hx - 1, y); }
    g.fillStyle(TIMBER_DARK, 1); g.fillCircle(x + 6, y - 30, 3);
    const s = spigot(c);
    if (!dry) {
      g.fillStyle(IRON, 1); g.fillRect(s.x - 3, s.y - 18, 6, 10); g.fillStyle(0xc8a040, 1); g.fillRect(s.x - 6, s.y - 20, 12, 3);
      // Someone drinking: a thin amber pour.
      if (c.drinking.size) { g.lineStyle(2, 0xd8a040, 0.9); g.lineBetween(s.x, s.y - 8, s.x, s.y + 6 + Math.sin(time / 50) * 2); }
      else if (Math.floor(time / 700) % 3 === 0) { g.fillStyle(0xd8a040, 0.9); g.fillCircle(s.x, s.y - 6 + ((time / 8) % 10), 1.6); }
    } else {
      // Blown: a splintered hole, foam crawling down the staves.
      g.fillStyle(0x1a120c, 1); g.fillCircle(s.x, s.y - 14, 5);
      for (let i = 0; i < 5; i++) { g.fillStyle(0xf4ecd0, 0.8); g.fillCircle(s.x - 6 + i * 3, s.y - 10 + (i % 2) * 3, 2.5); }
    }
    // The jet itself.
    if (c.jetAt && time >= c.jetAt) {
      const k = clamp((time - c.jetAt) / JET_MS, 0, 1);
      const ex = x + Math.cos(c.jetA) * JET_LEN, ey = y + Math.sin(c.jetA) * JET_LEN;
      g.lineStyle(JET_HALF * 1.6 * (1 - k * 0.5), 0xd8a040, 0.55 * (1 - k)); g.lineBetween(x, y - 14, ex, ey);
      g.lineStyle(JET_HALF * 0.6, lit(0xd8a040, 0.4), 0.6 * (1 - k)); g.lineBetween(x, y - 14, ex, ey);
      for (let i = 0; i < 10; i++) {
        const t = ((time / 300 + i * 0.1) % 1);
        g.fillStyle(0xf4ecd0, 0.8 * (1 - k)); g.fillCircle(x + (ex - x) * t + Math.sin(i * 3) * 10, y - 14 + (ey - y + 14) * t + Math.cos(i * 3) * 10, 3);
      }
    }
  }

  function drawTankard(g: G, x: number, y: number, spin: number): void {
    const tilt = Math.sin(spin) * 0.4;
    g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x - 8, y - 10, 16, 20, 3);
    g.fillStyle(IRON_LIT, 1); g.fillRect(x - 6, y - 8, 3, 16);
    g.lineStyle(3, IRON, 1); g.beginPath(); g.arc(x + 9, y, 6, -Math.PI / 2, Math.PI / 2, false); g.strokePath();
    g.fillStyle(0xf4ecd0, 1); g.fillEllipse(x + tilt * 6, y - 11, 18, 7);
    g.fillStyle(0xf4ecd0, 0.7); g.fillCircle(x - 6 + tilt * 10, y - 15, 3);
  }
}

export const FALLEN_SMALL_BEER: GimmickDef = {
  id: ID,
  rules: 'Drink at a cask to mend and hit harder, but you reel; four measures and you pass out. Strike a cask: its jet souses whoever is beyond it.',
  make,
};
