import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { GALE, GALE_CSS, GALE_LIT, OBS, hudPlate, sideMark } from '../art';
import { type Who, WHO, alive, clampN, dist, fighterOf, inArena, other, stepOf } from './util';

/**
 * SEAT OF THE PLUMB LINE — Councilor Magda Plumb (gravity). *Decree of the Sagging Span.*
 *
 * The Breath-Tax was reckoned in weight: a breath owed is a stone. Here every blow you land hangs
 * a stone of black glass on you (one per 15 damage dealt, up to six). Each stone makes your blows
 * 6% heavier and your feet 4% slower — and the span sags toward whoever is heavier: the lighter
 * fighter is dragged downhill toward them, harder the more stones lie between you.
 *
 * At six stone THE PLUMB DROPS on the heavy one: a ring marks the ground round them for 1.4s, then
 * everything inside it is driven into the deck — 18 damage, pinned (rooted) for a second — and the
 * heavy one sheds every stone. A perfected gravity bot piles on weight fast; when its plumb is
 * coming it walks straight at you to take you down with it. The turn: you can feel the sag and
 * the ring is honest — run uphill. And when *you* are heavy, the councilor is the one being dragged.
 */
const saggingSpan = (ctx: GimmickCtx): EncounterGimmick => {
  const PER_STONE = 15;
  const MAX = 6;
  const PULL = 13;
  const DROP_WARN = ctx.hard ? 1150 : 1400;
  const DROP_R = 120;
  const DROP_DMG = ctx.hard ? 22 : 18;

  const stones: Record<Who, number> = { player: 0, npc: 0 };
  const owed: Record<Who, number> = { player: 0, npc: 0 };
  const drop: Record<Who, number> = { player: 0, npc: 0 };
  const slams: { x: number; y: number; at: number }[] = [];
  let selfHit = false;
  let announced = false;

  const heavier = (): Who | null => (stones.player === stones.npc ? null : stones.player > stones.npc ? 'player' : 'npc');

  const addWeight = (w: Who, amount: number): void => {
    if (drop[w] > 0) return;
    owed[w] += amount;
    while (owed[w] >= PER_STONE && stones[w] < MAX) {
      owed[w] -= PER_STONE;
      stones[w] += 1;
      const f = fighterOf(ctx, w);
      ctx.float(f.x + 22, f.y - 40, `+1 STONE (${stones[w]})`, w === 'player' ? GALE_CSS : '#c9b0ff');
      if (stones[w] >= MAX) {
        drop[w] = ctx.scene.time.now + ctx.tk.warn(DROP_WARN);
        ctx.banner(w === 'player' ? 'YOUR PLUMB IS DROPPING' : 'THE COUNCILOR\'S PLUMB IS DROPPING', w === 'player' ? '#ff9a8a' : GALE_CSS);
        ctx.sfx('countdown-tick');
      }
    }
    if (stones[w] >= MAX) owed[w] = 0;
  };

  const plumb = (w: Who, time: number): void => {
    const f = fighterOf(ctx, w);
    drop[w] = 0;
    stones[w] = 0;
    owed[w] = 0;
    ctx.sfx('gravity-slam');
    slams.push({ x: f.x, y: f.y, at: time });
    selfHit = true;
    for (const v of WHO) {
      const g = fighterOf(ctx, v);
      if (!alive(g) || dist(g.x, g.y, f.x, f.y) > DROP_R) continue;
      ctx.hit(g, DROP_DMG, g.x, g.y);
      ctx.root(g, 1000);
      ctx.float(g.x, g.y - 54, 'PINNED', v === 'player' ? '#ff9a8a' : GALE_CSS);
    }
    selfHit = false;
  };

  return {
    update(time, dt) {
      const d = stepOf(dt);
      if (!announced) { announced = true; ctx.banner('EVERY BLOW ADDS A STONE', GALE_CSS); }
      for (const w of WHO) if (drop[w] > 0 && time >= drop[w]) plumb(w, time);
      // The sag: the lighter one slides downhill toward the heavier.
      const h = heavier();
      if (h) {
        const lw = other(h);
        const hf = fighterOf(ctx, h), lf = fighterOf(ctx, lw);
        if (alive(hf) && alive(lf) && !ctx.isAirborne(lf)) {
          const dd = dist(hf.x, hf.y, lf.x, lf.y);
          if (dd > 46) {
            const s = Math.min(78, (stones[h] - stones[lw]) * PULL + (drop[h] > 0 ? 30 : 0));
            ctx.nudge(lf, ((hf.x - lf.x) / dd) * s * d, ((hf.y - lf.y) / dd) * s * d);
          }
        }
      }
      while (slams.length && time - slams[0].at > 900) slams.shift();
    },
    onNpcHurt(amount) { if (!selfHit) addWeight('player', amount); },
    onPlayerHurt(amount) { if (!selfHit) addWeight('npc', amount); },
    playerSpeedMult() { return 1 - stones.player * 0.04; },
    npcSpeedMult() { return 1 - stones.npc * 0.04; },
    // Heavier blows: the other side takes more.
    playerTakenMult() { return 1 + stones.npc * 0.06; },
    npcTakenMult() { return 1 + stones.player * 0.06; },
    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      // Its own plumb coming: take the player down with it.
      if (drop.npc > 0) return { x: p.x, y: p.y };
      // The player's plumb coming: get well outside the ring.
      if (drop.player > 0) {
        const dd = dist(n.x, n.y, p.x, p.y) || 1;
        return inArena(ctx, p.x + ((n.x - p.x) / dd) * (DROP_R + 90), p.y + ((n.y - p.y) / dd) * (DROP_R + 90));
      }
      return null;
    },
    drawGround(g, time) {
      // The deck's plank seams bowing toward the heavy one — the sag, made visible.
      const h = heavier();
      const hf = h ? fighterOf(ctx, h) : null;
      const depth = h ? Math.abs(stones.player - stones.npc) : 0;
      for (let row = 0; row < 9; row++) {
        const y0 = ctx.top + 30 + row * ((ctx.H - ctx.top - 50) / 8);
        g.lineStyle(1.5, OBS.edge, 0.12 + depth * 0.025);
        g.beginPath();
        for (let x = 0; x <= ctx.W; x += 24) {
          let y = y0;
          if (hf) {
            const dd = dist(x, y0, hf.x, hf.y);
            y += ((hf.y - y0) * depth * 0.06) * Math.exp(-dd / 240);
            const pullX = ((hf.x - x) * depth * 0.03) * Math.exp(-dd / 240);
            if (x === 0) g.moveTo(x + pullX, y); else g.lineTo(x + pullX, y);
          } else if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
      }
      // The low point: rings of strain round the heavier fighter.
      if (hf && alive(hf)) {
        for (let i = 0; i < depth; i++) {
          const r = 40 + i * 22 + ((time / 40) % 22);
          g.lineStyle(1.5, h === 'player' ? GALE : OBS.seam, 0.35 - i * 0.04);
          g.strokeEllipse(hf.x, hf.y + 6, r * 2, r * 1.3);
        }
      }
      // A plumb coming down: the ring on the deck, closing its clock.
      for (const w of WHO) {
        if (drop[w] <= 0) continue;
        const f = fighterOf(ctx, w);
        const k = clampN(1 - (drop[w] - time) / ctx.tk.warn(DROP_WARN), 0, 1);
        g.fillStyle(OBS.glass, 0.25 + k * 0.25); g.fillCircle(f.x, f.y, DROP_R);
        g.lineStyle(3, k > 0.8 && Math.floor(time / 90) % 2 ? 0xffffff : OBS.seamLit, 0.9);
        g.strokeCircle(f.x, f.y, DROP_R);
        g.lineStyle(5, OBS.seam, 0.8);
        g.beginPath(); g.arc(f.x, f.y, DROP_R - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.lineStyle(1.5, OBS.seamLit, 0.5);
          g.lineBetween(f.x + Math.cos(a) * DROP_R * 0.35, f.y + Math.sin(a) * DROP_R * 0.35, f.x + Math.cos(a) * DROP_R * (0.4 + k * 0.55), f.y + Math.sin(a) * DROP_R * (0.4 + k * 0.55));
        }
      }
      // Where a plumb fell: the deck starred with cracks.
      for (const s of slams) {
        const k = (time - s.at) / 900;
        g.lineStyle(3, OBS.seamLit, 1 - k); g.strokeCircle(s.x, s.y, 30 + k * DROP_R);
        for (let i = 0; i < 10; i++) {
          const a = i * 0.63 + s.x;
          g.lineStyle(2, OBS.seam, 0.9 * (1 - k));
          g.lineBetween(s.x, s.y, s.x + Math.cos(a) * DROP_R * 0.9, s.y + Math.sin(a) * DROP_R * 0.9);
        }
      }
    },
    drawAir(g, time) {
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        // The stones, hung on a line from a hook over each fighter like a plumb-bob's weights.
        const n = stones[w];
        if (n > 0) {
          const sway = Math.sin(time / 300 + (w === 'npc' ? 1 : 0)) * 3;
          g.lineStyle(1, OBS.edge, 0.7); g.lineBetween(f.x + 26, f.y - 44, f.x + 26 + sway, f.y - 44 + n * 7 + 4);
          for (let i = 0; i < n; i++) {
            const sx = f.x + 26 + sway * ((i + 1) / n), sy = f.y - 40 + i * 7;
            g.fillStyle(OBS.glass, 1); g.fillTriangle(sx - 5, sy, sx + 5, sy, sx, sy + 7);
            g.fillStyle(w === 'player' ? GALE : OBS.seam, 0.9); g.fillTriangle(sx - 2, sy + 1, sx + 3, sy + 1, sx, sy + 4);
          }
        }
        // The plumb itself, falling out of the sky above them.
        if (drop[w] > 0) {
          const k = clampN(1 - (drop[w] - time) / ctx.tk.warn(DROP_WARN), 0, 1);
          const py = f.y - 260 + k * 230;
          g.lineStyle(1.5, OBS.edge, 0.6); g.lineBetween(f.x, ctx.top, f.x, py - 26);
          g.fillStyle(0x000000, 0.3 * k); g.fillEllipse(f.x, f.y + 8, 40 + k * 30, 12 + k * 8);
          g.fillStyle(OBS.glass, 1);
          g.fillTriangle(f.x - 18, py - 26, f.x + 18, py - 26, f.x, py + 18);
          g.fillStyle(OBS.sheen, 1); g.fillTriangle(f.x, py - 26, f.x + 18, py - 26, f.x, py + 18);
          g.lineStyle(1.2, OBS.edge, 0.9); g.strokeTriangle(f.x - 18, py - 26, f.x + 18, py - 26, f.x, py + 18);
          g.fillStyle(GALE_LIT, 0.8); g.fillCircle(f.x, py - 8, 3);
        }
      }
    },
    drawHud(g) {
      const cx = ctx.W / 2, cy = ctx.top + 20;
      hudPlate(g, cx, cy, 300, 26);
      for (const w of WHO) {
        const dir = w === 'player' ? -1 : 1;
        sideMark(g, cx + dir * 136, cy, w === 'player');
        for (let i = 0; i < MAX; i++) {
          const sx = cx + dir * (24 + i * 17);
          const on = i < stones[w];
          g.fillStyle(on ? (w === 'player' ? GALE : OBS.seamLit) : 0x000000, on ? 1 : 0.5);
          g.fillTriangle(sx - 6, cy - 6, sx + 6, cy - 6, sx, cy + 7);
          g.lineStyle(1, OBS.edge, 0.5); g.strokeTriangle(sx - 6, cy - 6, sx + 6, cy - 6, sx, cy + 7);
        }
      }
      g.lineStyle(1.5, OBS.edge, 0.8); g.lineBetween(cx, cy - 8, cx, cy + 8);
    },
  };
};

export const SAGGING_SPAN: GimmickDef = {
  id: 'bench-air-sagging-span',
  rules: 'Every blow struck hangs a stone on the striker: heavier blows, and the span sags toward the heavier. At six stone the plumb drops.',
  make: saggingSpan,
};
