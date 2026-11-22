import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { balloon } from '../art';
import { IRON, IRON_LIT, LATEX_LIT, TOY_BLUE, TOY_COLORS, TOY_PINK, TOY_RED } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Balloon Works — Balloonist Puff.
 *
 * Gasbags are tied down to iron weights round the floor and swell on their own as the works'
 * gas line feeds them. A full balloon pops when anyone strikes it — and the burst throws
 * everyone near it *except the one who popped it* (you prick it from your side; the blast goes
 * the other way). Left too long, an over-full one trembles and goes off by itself.
 *
 * Not every bag holds only air. Red-and-white striped ones are packed with tacks that scatter
 * across the floor when they go; and Puff's own bubble-gum pink ones leave a sticky splat that
 * holds the feet. Every so often Puff blows one up right beside you — fast.
 */

const R_FULL = 30;
const R_POPPABLE = 17;
const BLAST_R = 150;
const MAX_BAGS = 5;
const TACK_R = 14;

type Kind = 'air' | 'tacks' | 'gum';
interface Bag { x: number; y: number; r: number; kind: Kind; color: number; bornAt: number; fullAt: number; rate: number; sway: number; hit: StrikeTarget | null }
interface Tack { x: number; y: number; at: number; vx: number; vy: number; landAt: number }
interface Splat { x: number; y: number; r: number; until: number }
interface Burst { x: number; y: number; at: number; color: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const bags: Bag[] = [];
  const tacks: Tack[] = [];
  const splats: Splat[] = [];
  const bursts: Burst[] = [];
  const slowUntil = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  const spots = [
    { x: 180, y: top + 110 }, { x: 480, y: top + 90 }, { x: 780, y: top + 110 },
    { x: 300, y: (top + H) / 2 }, { x: 660, y: (top + H) / 2 },
    { x: 180, y: H - 80 }, { x: 480, y: H - 70 }, { x: 780, y: H - 80 },
  ];
  const puffEvery = ctx.hard ? 7600 : 9600;
  let nextBag = 0;
  let nextPuff = 0;
  let puffWarnAt = -1;
  let puffAt = { x: 0, y: 0 };
  let started = false;

  function addBag(x: number, y: number, time: number, rate = 1, kind?: Kind): void {
    const k: Kind = kind ?? (rng() < 0.3 ? 'tacks' : rng() < 0.35 ? 'gum' : 'air');
    const b: Bag = {
      x, y, r: 6, kind: k, color: k === 'gum' ? TOY_PINK : k === 'tacks' ? TOY_RED : TOY_COLORS[Math.floor(rng() * TOY_COLORS.length)],
      bornAt: time, fullAt: -1, rate, sway: rng() * 6, hit: null,
    };
    const body = bodyOf(b);
    // The bag is a strike target: a blow on a full one pops it for the striker.
    b.hit = ctx.target({
      x: body.x, y: body.y, r: b.r + 6,
      onStruck: (by) => { if (b.r >= R_POPPABLE) pop(b, ctx.scene.time.now, by === 'player' ? player : npc); },
    });
    bags.push(b);
  }

  /** The bag's body, floating on its string above the weight. */
  const bodyOf = (b: Bag) => ({ x: b.x, y: b.y - 38 - b.r });
  /** Where it stands on the floor: what you walk into, and where the blast goes off. */
  const footOf = (b: Bag) => ({ x: b.x, y: b.y - 12 });

  function pop(b: Bag, time: number, popper: Fighter | null): void {
    const i = bags.indexOf(b);
    if (i < 0) return;
    bags.splice(i, 1);
    b.hit?.remove();
    const body = bodyOf(b);
    const c = footOf(b);
    bursts.push({ x: body.x, y: body.y, at: time, color: b.color });
    ctx.sfx('explosion-small');
    for (const f of [player, npc]) {
      if (!alive(f) || f === popper) continue;
      const d = dist(f.x, f.y, c.x, c.y);
      if (d > BLAST_R) continue;
      const a = Math.atan2(f.y - c.y, f.x - c.x) || 0;
      const k = 1 - d / BLAST_R;
      ctx.nudge(f, Math.cos(a) * (60 + 110 * k), Math.sin(a) * (60 + 110 * k));
      if (d < BLAST_R * 0.65) ctx.hit(f, ctx.hard ? 10 : 8, f.x, f.y);
    }
    if (b.kind === 'tacks') {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + rng() * 0.4;
        const r = 50 + rng() * 90;
        tacks.push({ x: c.x, y: c.y, at: time, vx: Math.cos(a) * r, vy: Math.sin(a) * r * 0.8, landAt: time + 380 });
      }
      ctx.float(body.x, body.y - 30, 'TACKS!', '#ffb0b0');
    } else if (b.kind === 'gum') {
      splats.push({ x: c.x, y: c.y + 10, r: 70, until: time + 5500 });
      ctx.float(body.x, body.y - 30, 'SPLAT', '#ffb0d8');
    } else {
      ctx.float(body.x, body.y - 30, 'POP!', '#ffffff');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextBag = time + 600;
        nextPuff = time + puffEvery;
        for (const s of [spots[1], spots[3], spots[7]]) addBag(s.x, s.y, time, 1.6, 'air');
      }
      // The gas line feeds a new bag at a free weight.
      if (time >= nextBag) {
        nextBag = time + (ctx.hard ? 1900 : 2500);
        if (bags.length < MAX_BAGS) {
          const free = spots.filter((s) => !bags.some((b) => dist(b.x, b.y, s.x, s.y) < 40));
          const s = free[Math.floor(rng() * free.length)];
          if (s) addBag(s.x, s.y, time);
        }
      }
      // Puff blows one up beside you.
      if (puffWarnAt < 0 && time >= nextPuff - 1300 && alive(player)) {
        puffWarnAt = time;
        const a = Math.atan2(npc.y - player.y, npc.x - player.x) + (rng() - 0.5);
        puffAt = { x: clamp(player.x + Math.cos(a) * 70, 60, W - 60), y: clamp(player.y + Math.sin(a) * 70 + 30, top + 80, H - 40) };
        ctx.banner('PUFF BLOWS ONE UP AT YOU', '#ffb0d8');
        ctx.sfx('bubble');
      }
      if (time >= nextPuff) {
        nextPuff = time + puffEvery;
        puffWarnAt = -1;
        addBag(puffAt.x, puffAt.y, time, 4.2, rng() < 0.5 ? 'gum' : 'tacks');
      }

      for (let i = bags.length - 1; i >= 0; i--) {
        const b = bags[i];
        if (b.r < R_FULL) { b.r = Math.min(R_FULL, b.r + dt * 5.2 * b.rate); if (b.r >= R_FULL) b.fullAt = time; }
        else if (time - b.fullAt > 6500) { pop(b, time, null); continue; }
        const body = bodyOf(b);
        b.hit?.moveTo(body.x, body.y);
        b.hit?.setRadius(b.r + 6);
      }
      // Tacks: flying out, then lying point-up.
      for (let i = tacks.length - 1; i >= 0; i--) {
        const t = tacks[i];
        if (time < t.landAt) { t.x += t.vx * dt * 2.6; t.y += t.vy * dt * 2.6; continue; }
        if (time - t.landAt > 7000) { tacks.splice(i, 1); continue; }
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y + 10, t.x, t.y) > TACK_R + 8) continue;
          ctx.hit(f, 4, f.x, f.y);
          slowUntil.set(f, time + 1200);
          ctx.sfx('stab');
          tacks.splice(i, 1);
          break;
        }
      }
      for (let i = splats.length - 1; i >= 0; i--) if (time > splats[i].until) splats.splice(i, 1);
      for (let i = bursts.length - 1; i >= 0; i--) if (time - bursts[i].at > 600) bursts.splice(i, 1);
    },

    playerSpeedMult() {
      const now = ctx.scene.time.now;
      let m = now < (slowUntil.get(player) ?? 0) ? 0.7 : 1;
      if (splats.some((s) => dist(player.x, player.y + 10, s.x, s.y) < s.r)) m *= 0.55;
      return m;
    },
    npcSpeedMult() {
      const now = ctx.scene.time.now;
      let m = now < (slowUntil.get(npc) ?? 0) ? 0.7 : 1;
      if (splats.some((s) => dist(npc.x, npc.y + 10, s.x, s.y) < s.r)) m *= 0.55;
      return m;
    },

    npcSeek() {
      // Puff strikes a full bag from its far side while you are standing on the near side.
      let best: { x: number; y: number } | null = null;
      let bs = Infinity;
      for (const b of bags) {
        if (b.r < R_POPPABLE + 4) continue;
        const c = footOf(b);
        const dp = dist(player.x, player.y, c.x, c.y);
        if (dp > BLAST_R * 0.9) continue;
        const a = Math.atan2(c.y - player.y, c.x - player.x);
        // Stand just past the weight, in reach of the bag's body.
        const spot = { x: clamp(c.x + Math.cos(a) * 24, 50, W - 50), y: clamp(c.y + Math.sin(a) * 24 - 20, top + 40, H - 40) };
        const s = dist(npc.x, npc.y, spot.x, spot.y) + dp;
        if (s < bs) { bs = s; best = spot; }
      }
      if (best) return best;
      // Otherwise she hangs back by the biggest bag, keeping it between you.
      const big = bags.reduce<Bag | null>((m, b) => (!m || b.r > m.r ? b : m), null);
      if (!big) return null;
      const a = Math.atan2(big.y - player.y, big.x - player.x);
      return { x: clamp(big.x + Math.cos(a) * 70, 50, W - 50), y: clamp(big.y + Math.sin(a) * 70, top + 40, H - 40) };
    },

    drawGround(g, time) {
      for (const s of splats) {
        const fade = clamp((s.until - time) / 800, 0, 1);
        g.fillStyle(dim(TOY_PINK, 0.2), 0.55 * fade); g.fillEllipse(s.x, s.y, s.r * 2, s.r * 1.3);
        g.fillStyle(TOY_PINK, 0.5 * fade); g.fillEllipse(s.x - 6, s.y - 4, s.r * 1.4, s.r * 0.8);
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9;
          g.fillStyle(lit(TOY_PINK, 0.3), 0.6 * fade); g.fillCircle(s.x + Math.cos(a) * s.r * 0.9, s.y + Math.sin(a) * s.r * 0.55, 5);
        }
        g.fillStyle(0xffffff, 0.4 * fade); g.fillEllipse(s.x - s.r * 0.3, s.y - s.r * 0.25, s.r * 0.4, s.r * 0.15);
      }
      // The weights, and the shadow of each bag.
      for (const b of bags) {
        g.fillStyle(0x000000, 0.2); g.fillEllipse(b.x, b.y + 4, b.r * 1.6, b.r * 0.5);
        g.fillStyle(IRON, 1); g.fillRoundedRect(b.x - 10, b.y - 6, 20, 12, 3);
        g.fillStyle(IRON_LIT, 1); g.fillRect(b.x - 8, b.y - 5, 16, 2);
        g.lineStyle(1.5, IRON_LIT, 1); g.strokeCircle(b.x, b.y - 8, 3);
        if (b.r >= R_FULL && time - b.fullAt > 4500) {
          g.lineStyle(2, TOY_RED, 0.3 + Math.sin(time / 60) * 0.3); g.strokeCircle(b.x, b.y - 12, BLAST_R * 0.65);
        }
      }
      for (const t of tacks) {
        const landed = time >= t.landAt;
        g.fillStyle(0x000000, 0.3); g.fillCircle(t.x, t.y + 2, 4);
        g.fillStyle(IRON_LIT, 1); g.fillCircle(t.x, t.y, landed ? 4 : 3);
        g.lineStyle(1.5, 0xd8dce4, 1); g.lineBetween(t.x, t.y, t.x, t.y - 7);
        if (landed && Math.sin(time / 200 + t.x) > 0.7) { g.fillStyle(0xffffff, 0.9); g.fillCircle(t.x, t.y - 7, 1.2); }
      }
      // Where Puff's quick one is coming up.
      if (puffWarnAt >= 0) {
        const k = clamp((time - puffWarnAt) / 1300, 0, 1);
        g.lineStyle(2, TOY_PINK, 0.4 + k * 0.5); g.strokeCircle(puffAt.x, puffAt.y - 12, 16 + k * 20);
        g.fillStyle(TOY_PINK, 0.12 + k * 0.15); g.fillCircle(puffAt.x, puffAt.y - 12, 16 + k * 20);
      }
    },

    drawAir(g, time) {
      for (const b of bags) {
        const full = b.r >= R_FULL;
        const tremble = full && time - b.fullAt > 4500 ? Math.sin(time / 25) * 2.5 : 0;
        const sway = Math.sin(time / 700 + b.sway) * 5 + tremble;
        const c = bodyOf(b);
        balloon(g, b.x, b.y - 8, b.r, b.color, 30, sway);
        const bx = b.x + sway, by = c.y;
        if (b.kind === 'tacks') {
          // Red and white stripes, tack points showing through the skin.
          for (let k = -1; k <= 1; k++) { g.fillStyle(LATEX_LIT, 0.85); g.fillEllipse(bx + k * b.r * 0.5, by, b.r * 0.22, b.r * 1.9); }
          for (let k = 0; k < 6; k++) { const a = k * 1.05 + time / 2000; g.fillStyle(IRON_LIT, 0.8); g.fillCircle(bx + Math.cos(a) * b.r * 0.6, by + Math.sin(a) * b.r * 0.7, 1.4); }
        } else if (b.kind === 'gum') {
          g.fillStyle(lit(TOY_PINK, 0.4), 0.5); g.fillCircle(bx + b.r * 0.3, by + b.r * 0.2, b.r * 0.25);
          g.lineStyle(1, dim(TOY_PINK, 0.3), 0.6); g.strokeCircle(bx - b.r * 0.2, by + b.r * 0.35, b.r * 0.18);
        }
        if (!full) {
          // The gas line ticking it up.
          g.lineStyle(1, IRON_LIT, 0.5); g.lineBetween(b.x + 10, b.y - 4, b.x + 18, b.y - 18);
        }
      }
      for (const u of bursts) {
        const k = (time - u.at) / 600;
        g.lineStyle(4 * (1 - k), 0xffffff, 1 - k); g.strokeCircle(u.x, u.y, 20 + k * BLAST_R * 0.9);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + u.x;
          const r = 14 + k * 90;
          g.fillStyle(u.color, 1 - k);
          g.fillTriangle(u.x + Math.cos(a) * r, u.y + Math.sin(a) * r + k * k * 40, u.x + Math.cos(a + 0.2) * (r + 8), u.y + Math.sin(a + 0.2) * (r + 8) + k * k * 40, u.x + Math.cos(a) * (r + 12), u.y + Math.sin(a) * (r + 12) + k * k * 40);
        }
      }
    },

    destroy() { for (const b of bags) b.hit?.remove(); },

    drawHud(g, time) {
      // Puff's next quick one: a pink gauge.
      const k = clamp(1 - (nextPuff - time) / puffEvery, 0, 1);
      const x = W - 150, y = top + 10;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 4, y - 4, 128, 16, 6);
      g.fillStyle(puffWarnAt >= 0 ? 0xffffff : TOY_PINK, 1); g.fillRoundedRect(x, y, Math.max(4, 120 * k), 8, 4);
      g.fillStyle(TOY_BLUE, 1); g.fillCircle(x - 14, y + 4, 5);
    },
  };
}

export const BALLOON_WORKS: GimmickDef = {
  id: 'bounce-balloon-works',
  rules: 'Strike a full balloon to pop it — the blast throws everyone but the popper. Striped ones scatter tacks; pink ones leave sticky gum.',
  make,
};
