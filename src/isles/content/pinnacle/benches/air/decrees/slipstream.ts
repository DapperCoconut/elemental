import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { GALE, GALE_CSS, GALE_LIT, OBS, hudBar, hudPlate, sideMark } from '../art';
import { type Who, WHO, alive, clampN, dist, fighterOf, other, stepOf } from './util';

/**
 * SEAT OF THE GALE — Councilor Aurelian Sough (air). *Decree of the Slipstream.*
 *
 * Every fighter who moves leaves a wake: a ribbon of torn air streaming behind them for a breath
 * and a half (pale blue behind you, violet behind the councilor). Whoever runs inside the OTHER's
 * wake is drafting — carried 35% faster, and their blows land 25% harder (they are behind you).
 * Ride someone's wake for 1.6s without dropping out and you OVERTAKE them: a gust of 10 throws them
 * aside and winds them (rooted half a second). A perfected air dancer lives in your wake.
 *
 * The turn: a wake only exists behind someone who is moving, and it trails where they *were*. Stop,
 * double back, cut tight circles — the councilor seeks the point your wake was 0.6s ago, so it
 * follows the path you choose. Lead it through its own wake and draft it back.
 */
const slipstream = (ctx: GimmickCtx): EncounterGimmick => {
  const SAMPLE = 0.05;
  const LIFE = ctx.hard ? 1.7 : 1.5;
  const FRESH = 0.22;
  const R = 34;
  const OVERTAKE = ctx.hard ? 1.3 : 1.6;
  const COOL = 2600;
  const DMG = ctx.hard ? 12 : 10;

  interface Mark { x: number; y: number; t: number }
  const wake: Record<Who, Mark[]> = { player: [], npc: [] };
  const lastAt: Record<Who, Pt | null> = { player: null, npc: null };
  const draft: Record<Who, number> = { player: 0, npc: 0 };
  const drafting: Record<Who, boolean> = { player: false, npc: false };
  const coolUntil: Record<Who, number> = { player: 0, npc: 0 };
  const gusts: { x: number; y: number; a: number; at: number }[] = [];
  let clock = 0;
  let acc = 0;
  let announced = false;

  const inWake = (w: Who): boolean => {
    const f = fighterOf(ctx, w);
    for (const m of wake[other(w)]) if (clock - m.t > FRESH && dist(f.x, f.y, m.x, m.y) < R) return true;
    return false;
  };

  const overtake = (w: Who, time: number): void => {
    const f = fighterOf(ctx, w), o = fighterOf(ctx, other(w));
    draft[w] = 0;
    coolUntil[w] = time + COOL;
    if (!alive(o)) return;
    const a = Math.atan2(o.y - f.y, o.x - f.x);
    // Thrown aside, off the line they were running — whichever side has more room.
    const side = Math.sin(a + Math.PI / 2) * (ctx.H / 2 - o.y) + Math.cos(a + Math.PI / 2) * (ctx.W / 2 - o.x) >= 0 ? 1 : -1;
    ctx.hit(o, DMG, o.x, o.y);
    ctx.nudge(o, Math.cos(a + (side * Math.PI) / 2) * 90 + Math.cos(a) * 30, Math.sin(a + (side * Math.PI) / 2) * 90 + Math.sin(a) * 30);
    ctx.root(o, 500);
    ctx.float(o.x, o.y - 52, w === 'player' ? 'OVERTAKEN' : 'YOU ARE OVERTAKEN', w === 'player' ? GALE_CSS : '#c9b0ff');
    ctx.flash(o.x, o.y, GALE_LIT);
    ctx.sfx('gust');
    gusts.push({ x: o.x, y: o.y, a, at: time });
  };

  return {
    update(time, dt) {
      const d = stepOf(dt);
      clock += d;
      acc += d;
      if (!announced && clock > 1.5) { announced = true; ctx.banner('RIDE THE WAKE — OR BE OVERTAKEN', GALE_CSS); }
      if (acc >= SAMPLE) {
        acc = 0;
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (!alive(f)) continue;
          const p = lastAt[w];
          // Only a body in motion tears the air: standing still leaves no wake to ride.
          if (!p || dist(p.x, p.y, f.x, f.y) > 3) wake[w].push({ x: f.x, y: f.y, t: clock });
          lastAt[w] = { x: f.x, y: f.y };
        }
      }
      for (const w of WHO) while (wake[w].length && clock - wake[w][0].t > LIFE) wake[w].shift();
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        drafting[w] = alive(f) && time >= coolUntil[w] && !ctx.isAirborne(f) && inWake(w);
        if (drafting[w]) draft[w] += d;
        else draft[w] = Math.max(0, draft[w] - d * 1.5);
        if (draft[w] >= OVERTAKE) overtake(w, time);
      }
      while (gusts.length && time - gusts[0].at > 700) gusts.shift();
    },
    playerSpeedMult() { return drafting.player ? 1.35 : 1; },
    npcSpeedMult() { return drafting.npc ? 1.35 : 1; },
    // The one behind hits harder: the one ahead takes more.
    playerTakenMult() { return drafting.npc ? 1.25 : 1; },
    npcTakenMult() { return drafting.player ? 1.25 : 1; },
    npcSeek() {
      if (ctx.scene.time.now < coolUntil.npc) return null;
      // Where the player's wake was ~0.6s ago: close enough to catch, old enough to count.
      let best: Mark | null = null, bd = Infinity;
      for (const m of wake.player) {
        const age = clock - m.t;
        if (age < FRESH + 0.1) continue;
        const score = Math.abs(age - 0.6) * 400 + dist(ctx.npc.x, ctx.npc.y, m.x, m.y) * 0.4;
        if (score < bd) { bd = score; best = m; }
      }
      return best ? { x: best.x, y: best.y } : null;
    },
    drawGround(g) {
      // Each wake: a ribbon of torn air, widest at its freshest, with streamers either side.
      for (const w of WHO) {
        const marks = wake[w];
        if (marks.length < 2) continue;
        const c = w === 'player' ? GALE : OBS.seamLit;
        for (let i = 1; i < marks.length; i++) {
          const a = marks[i - 1], b = marks[i];
          const age = clock - b.t;
          const k = clampN(1 - age / LIFE, 0, 1);
          const live = age > FRESH;
          g.lineStyle(R * 2 * k * 0.9, c, (live ? 0.1 : 0.04) * k);
          g.lineBetween(a.x, a.y, b.x, b.y);
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          const nx = -Math.sin(ang), ny = Math.cos(ang);
          for (const s of [-1, 1]) {
            const off = (10 + (1 - k) * 18) * s + Math.sin(b.t * 9 + i) * 3;
            g.lineStyle(1.4, c, 0.55 * k);
            g.lineBetween(a.x + nx * off, a.y + ny * off, b.x + nx * off, b.y + ny * off);
          }
          if (i % 4 === 0) { g.fillStyle(w === 'player' ? GALE_LIT : OBS.seamLit, 0.5 * k); g.fillEllipse(b.x, b.y, 8 * k + 2, 3); }
        }
      }
    },
    drawAir(g, time) {
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        const k = draft[w] / OVERTAKE;
        if (drafting[w]) {
          // Speed lines streaming past the drafter, and the shove building as an arc round them.
          const a = ctx.facing(f) + Math.PI;
          for (let i = 0; i < 5; i++) {
            const ph = ((time / 260) + i / 5) % 1;
            const off = (i - 2) * 9;
            const sx = f.x + Math.cos(a) * (20 + ph * 40) - Math.sin(a) * off, sy = f.y + Math.sin(a) * (20 + ph * 40) + Math.cos(a) * off;
            g.lineStyle(1.5, GALE_LIT, 0.6 * (1 - ph));
            g.lineBetween(sx, sy, sx + Math.cos(a) * 16, sy + Math.sin(a) * 16);
          }
        }
        if (k > 0.02) {
          g.lineStyle(4, 0x000000, 0.4);
          g.beginPath(); g.arc(f.x, f.y, 30, -Math.PI / 2, Math.PI * 1.5, false); g.strokePath();
          g.lineStyle(3, k > 0.75 ? GALE_LIT : GALE, 0.9);
          g.beginPath(); g.arc(f.x, f.y, 30, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          if (k > 0.75 && Math.floor(time / 90) % 2 === 0) { g.lineStyle(1, 0xffffff, 0.8); g.strokeCircle(f.x, f.y, 34); }
        }
        if (time < coolUntil[w] && time - (coolUntil[w] - COOL) < 400) {
          g.fillStyle(GALE_LIT, 0.25); g.fillCircle(f.x, f.y, 26);
        }
      }
      // An overtake: a great comma of wind whipping past the one overtaken.
      for (const s of gusts) {
        const k = (time - s.at) / 700;
        for (let i = 0; i < 3; i++) {
          g.lineStyle(4 - i, GALE_LIT, 0.8 * (1 - k));
          g.beginPath(); g.arc(s.x, s.y, 22 + k * 70 + i * 12, s.a - 1.2 + k, s.a + 0.4 + k * 1.6, false); g.strokePath();
        }
      }
    },
    drawHud(g) {
      const cx = ctx.W / 2, cy = ctx.top + 20;
      hudPlate(g, cx, cy, 300, 26);
      sideMark(g, cx - 136, cy, true);
      hudBar(g, cx - 124, cy - 4, 108, 8, draft.player / OVERTAKE, drafting.player ? GALE_LIT : GALE);
      sideMark(g, cx + 136, cy, false);
      hudBar(g, cx + 16, cy - 4, 108, 8, draft.npc / OVERTAKE, drafting.npc ? OBS.seamLit : OBS.seam);
      g.lineStyle(2, GALE, 0.7);
      g.beginPath(); g.arc(cx, cy, 7, Math.PI * 0.2, Math.PI * 1.7, false); g.strokePath();
    },
  };
};

export const SLIPSTREAM: GimmickDef = {
  id: 'bench-air-slipstream',
  rules: 'Who runs in another\'s wake is carried by it, faster and striking harder; who is ridden for long is overtaken.',
  make: slipstream,
};
