import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { glow, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { poly } from '../art';
import {
  BRONZE, BRONZE_DARK, BRONZE_LIT, HEAT_DULL, HEAT_ORANGE, HEAT_RED, HEAT_WHITE, HEAT_YELLOW, IRON, IRON_DARK,
  IRON_LIT, IRON_SHEEN, TIMBER, TIMBER_DARK,
} from '../palette';
import { alive, dist, stepDt } from '../util';
import { hurt, onFloor } from './kit';

/**
 * The Ring Test — Verity Knoll, Ring-Tester of the casting floor. A sound casting rings when it is
 * struck; a flawed one clunks. In the King's telling Verity tests the bells for the names of the
 * interred, and what she condemns goes back in the pot — and so, now and then, does whoever stood
 * too near it.
 *
 * Castings stand about the yard — bells, cauldrons, cog-wheels — and they are solid: they stop shots.
 * - **Strike a sound casting** and it rings true: the striker's cooldowns race for a few seconds.
 * - **A cracked casting** shows its hairline. Strike it and it bursts a moment later, shards
 *   cutting everyone near — the trick is to strike one while Verity stands beside it.
 * - **She condemns** the casting nearest *you* on her own clock: a chalk cross, a crack running
 *   round it, then it bursts. Walk clear — or keep her beside you, and it takes you both.
 *
 * Burst castings are replaced from the pit, some of them flawed. Past half every true ring cracks
 * the casting nearest it. The bot rings sound castings to hasten itself, walks off condemned ones,
 * and never lingers by a cracked one.
 */

const ID = fallenId('forge', 'ring-test');
const RING_MS = 3200;
const RING_RATE = 1.6;
const RING_EACH_MS = 1100;
const CONDEMN_EVERY = 5600;
const CONDEMN_EVERY_LATE = 4500;
const CONDEMN_MS = 1500;
const STRUCK_FUSE = 650;
const BURST_R = 104;
const BURST_DMG = 18;
const REFILL_MS = 3600;
const CAST_R = 24;

type Kind = 'bell' | 'pot' | 'wheel';
type State = 'sound' | 'cracked' | 'fused' | 'gone';
interface Casting {
  home: Pt; kind: Kind; state: State; t: StrikeTarget | null;
  fuseAt: number; fuseMs: number; ringAt: number; goneAt: number; seed: number;
}

/** A bronze bell stood on a timber skid: crown loops, shoulder, waist, the flared sound-bow and lip. */
function bell(g: G, x: number, y: number, c: number): void {
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 24, y - 4, 48, 7);
  g.fillStyle(TIMBER, 1); g.fillRect(x - 24, y - 4, 48, 2);
  poly(g, [
    { x: x - 22, y: y - 4 }, { x: x - 17, y: y - 12 }, { x: x - 13, y: y - 30 }, { x: x - 11, y: y - 40 },
    { x: x + 11, y: y - 40 }, { x: x + 13, y: y - 30 }, { x: x + 17, y: y - 12 }, { x: x + 22, y: y - 4 },
  ], c);
  g.fillStyle(BRONZE_DARK, 1); g.fillEllipse(x, y - 4, 44, 6);
  g.fillStyle(BRONZE_LIT, 0.7); g.fillRect(x - 10, y - 38, 4, 30);
  g.lineStyle(1.5, BRONZE_DARK, 1); g.lineBetween(x - 18, y - 12, x + 18, y - 12); g.lineBetween(x - 13, y - 30, x + 13, y - 30);
  g.lineStyle(3, c, 1); g.beginPath(); g.arc(x, y - 42, 5, Math.PI, 0); g.strokePath();
  // The names round the lip: small cast letters, unread.
  for (let i = 0; i < 6; i++) { g.fillStyle(BRONZE_DARK, 0.9); g.fillRect(x - 14 + i * 5, y - 10, 3, 2); }
}

/** A three-legged cast-iron cauldron with its ears and a rolled rim. */
function pot(g: G, x: number, y: number): void {
  for (const dx of [-14, 0, 14]) { g.fillStyle(IRON_DARK, 1); g.fillRect(x + dx - 2, y - 6, 4, 8); }
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x, y - 18, 40, 30);
  g.fillStyle(IRON, 1); g.fillEllipse(x - 4, y - 20, 30, 22);
  g.fillStyle(IRON_DARK, 1); g.fillEllipse(x, y - 31, 38, 9);
  g.lineStyle(2, IRON_LIT, 1); g.strokeEllipse(x, y - 31, 38, 9);
  g.fillStyle(0x0c0a0a, 1); g.fillEllipse(x, y - 31, 30, 5);
  for (const s of [-1, 1]) { g.lineStyle(3, IRON, 1); g.beginPath(); g.arc(x + s * 21, y - 28, 4, 0, Math.PI * 2); g.strokePath(); }
  g.fillStyle(IRON_SHEEN, 0.5); g.fillEllipse(x - 9, y - 22, 6, 10);
}

/** A cast cog-wheel stood on edge in a chock: teeth, six spokes, a bossed hub. */
function wheel(g: G, x: number, y: number, seed: number): void {
  const cx = x, cy = y - 26, r = 20;
  g.fillStyle(TIMBER_DARK, 1); g.fillRect(x - 18, y - 6, 36, 8);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + seed;
    g.fillStyle(IRON, 1);
    g.fillTriangle(cx + Math.cos(a - 0.12) * r, cy + Math.sin(a - 0.12) * r, cx + Math.cos(a + 0.12) * r, cy + Math.sin(a + 0.12) * r, cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6));
  }
  g.lineStyle(5, IRON, 1); g.strokeCircle(cx, cy, r - 2);
  g.lineStyle(1.5, IRON_LIT, 1); g.strokeCircle(cx, cy, r);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + seed;
    g.lineStyle(3, IRON_DARK, 1); g.lineBetween(cx, cy, cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
  }
  g.fillStyle(IRON_LIT, 1); g.fillCircle(cx, cy, 5);
  g.fillStyle(IRON_DARK, 1); g.fillCircle(cx, cy, 2);
}

/** The flaw: a hairline zigzag down the casting's face, lengthening and heating as it goes. */
function crack(g: G, x: number, y: number, seed: number, k: number, hot: boolean): void {
  const pts: Pt[] = [];
  const n = 2 + Math.round(k * 7);
  for (let i = 0; i <= n; i++) pts.push({ x: x - 4 + Math.sin(seed * 5 + i * 2.7) * 7, y: y - 40 + i * (36 / 9) });
  g.lineStyle(hot ? 2.2 : 1.4, hot ? HEAT_ORANGE : 0x140c0a, 1); g.strokePoints(pts, false);
  if (hot) { g.lineStyle(1, HEAT_WHITE, 0.8); g.strokePoints(pts, false); }
  else { g.lineStyle(1, HEAT_DULL, 0.6); g.strokePoints(pts.map((p) => ({ x: p.x + 1, y: p.y })), false); }
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const cy = (top + H - 40) / 2;
  const homes: Pt[] = [
    { x: W * 0.2, y: top + 140 }, { x: W * 0.5, y: top + 118 }, { x: W * 0.8, y: top + 140 },
    { x: W * 0.35, y: cy + 34 }, { x: W * 0.65, y: cy + 34 },
    { x: W * 0.2, y: H - 96 }, { x: W * 0.8, y: H - 96 },
  ];
  const kinds: Kind[] = ['bell', 'pot', 'wheel'];
  const casts: Casting[] = [];
  const shards: { x: number; y: number; at: number; seed: number }[] = [];
  const ringUntil = new Map<Fighter, number>();
  let late = false;
  let started = false;
  let nextCondemn = 0;
  let now = 0;

  const ringing = (f: Fighter) => now < (ringUntil.get(f) ?? 0);

  function place(c: Casting, flawed: boolean): void {
    c.state = flawed ? 'cracked' : 'sound';
    c.kind = kinds[Math.floor(rng() * kinds.length)];
    c.seed = rng() * 6;
    c.t = ctx.target({ x: c.home.x, y: c.home.y - 16, r: CAST_R, onStruck: (by) => struck(c, by === 'player' ? ctx.player : ctx.npc) });
  }

  function fuse(c: Casting, ms: number): void {
    c.state = 'fused';
    c.fuseAt = now;
    c.fuseMs = ms;
    ctx.sfx('crystal-shatter');
  }

  function struck(c: Casting, by: Fighter): void {
    if (c.state === 'cracked') { fuse(c, STRUCK_FUSE); ctx.float(c.home.x, c.home.y - 56, 'CLUNK', '#ff9a6a'); return; }
    if (c.state !== 'sound' || now - c.ringAt < RING_EACH_MS) return;
    c.ringAt = now;
    ringUntil.set(by, now + RING_MS);
    ctx.float(c.home.x, c.home.y - 56, 'RINGS TRUE', '#e8f4ff');
    ctx.sfx('crystal-chime');
    if (late) {
      const near = casts.filter((o) => o !== c && o.state === 'sound')
        .sort((a, b) => dist(a.home.x, a.home.y, c.home.x, c.home.y) - dist(b.home.x, b.home.y, c.home.x, c.home.y))[0];
      if (near) { near.state = 'cracked'; ctx.flash(near.home.x, near.home.y - 20, HEAT_ORANGE); }
    }
  }

  function burst(c: Casting): void {
    for (const f of [ctx.player, ctx.npc]) {
      if (alive(f) && dist(f.x, f.y, c.home.x, c.home.y - 10) < BURST_R) hurt(ctx, f, BURST_DMG, c.home.x, c.home.y);
    }
    for (let i = 0; i < 12; i++) shards.push({ x: c.home.x, y: c.home.y - 20, at: now, seed: i * 0.52 + rng() * 0.3 });
    ctx.flash(c.home.x, c.home.y - 20, HEAT_WHITE);
    ctx.sfx('explosion-small');
    c.t?.remove();
    c.t = null;
    c.state = 'gone';
    c.goneAt = now;
  }

  function condemn(): void {
    const p = ctx.player;
    const pick = casts.filter((c) => c.state === 'sound' || c.state === 'cracked')
      .sort((a, b) => dist(a.home.x, a.home.y, p.x, p.y) - dist(b.home.x, b.home.y, p.x, p.y))[0];
    if (!pick) return;
    fuse(pick, CONDEMN_MS);
    ctx.float(pick.home.x, pick.home.y - 60, 'CONDEMNED', '#ffb070');
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      now = time;
      if (!started) {
        started = true;
        nextCondemn = time + 3400;
        homes.forEach((h, i) => {
          const c: Casting = { home: h, kind: 'bell', state: 'sound', t: null, fuseAt: 0, fuseMs: 0, ringAt: -1e9, goneAt: 0, seed: 0 };
          place(c, i === 1 || i === 6);
          casts.push(c);
        });
      }
      if (!late && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        late = true;
        ctx.banner('EVERY RING CRACKS ITS NEIGHBOUR', '#e8f4ff');
      }
      if (time >= nextCondemn) { condemn(); nextCondemn = time + (late ? CONDEMN_EVERY_LATE : CONDEMN_EVERY); }
      for (const c of casts) {
        if (c.state === 'fused' && time >= c.fuseAt + c.fuseMs) burst(c);
        if (c.state === 'gone' && time - c.goneAt > REFILL_MS
          && [ctx.player, ctx.npc].every((f) => dist(f.x, f.y, c.home.x, c.home.y) > 80)) place(c, rng() < 0.32);
      }
      while (shards.length && time - shards[0].at > 450) shards.shift();
    },

    playerCooldownRate() { return ringing(ctx.player) ? RING_RATE : 1; },
    npcCooldownRate() { return ringing(ctx.npc) ? RING_RATE : 1; },

    npcSeek() {
      const n = ctx.npc, p = ctx.player;
      for (const c of casts) {
        if (c.state !== 'fused') continue;
        const d = dist(n.x, n.y, c.home.x, c.home.y);
        if (d < BURST_R + 30) {
          const a = Math.atan2(n.y - c.home.y, n.x - c.home.x);
          return onFloor(ctx, c.home.x + Math.cos(a) * (BURST_R + 70), c.home.y + Math.sin(a) * (BURST_R + 70));
        }
      }
      if (!ringing(n)) {
        const sound = casts.filter((c) => c.state === 'sound' && dist(c.home.x, c.home.y, n.x, n.y) < 320)
          .sort((a, b) => dist(a.home.x, a.home.y, n.x, n.y) - dist(b.home.x, b.home.y, n.x, n.y))[0];
        if (sound) {
          const a = Math.atan2(p.y - sound.home.y, p.x - sound.home.x);
          return onFloor(ctx, sound.home.x + Math.cos(a) * 46, sound.home.y + Math.sin(a) * 46);
        }
      }
      // Press in, but never stand by a cracked casting.
      let t = onFloor(ctx, p.x + (n.x < p.x ? -130 : 130), p.y);
      for (const c of casts) {
        if (c.state !== 'cracked' || dist(t.x, t.y, c.home.x, c.home.y) > BURST_R + 10) continue;
        const a = Math.atan2(t.y - c.home.y, t.x - c.home.x);
        t = onFloor(ctx, c.home.x + Math.cos(a) * (BURST_R + 40), c.home.y + Math.sin(a) * (BURST_R + 40));
      }
      return t;
    },

    drawGround(g, time) {
      for (const c of casts) {
        // The chalked stand-mark each casting is set on.
        g.lineStyle(2, 0xf4ecd8, 0.2); g.strokeRect(c.home.x - 26, c.home.y - 8, 52, 14);
        if (c.state === 'fused') {
          const k = Math.min(1, (time - c.fuseAt) / c.fuseMs);
          g.fillStyle(HEAT_RED, 0.08 + k * 0.2); g.fillCircle(c.home.x, c.home.y - 10, BURST_R * (0.3 + 0.7 * k));
          g.lineStyle(2.5, HEAT_YELLOW, 0.45 + k * 0.5); g.strokeCircle(c.home.x, c.home.y - 10, BURST_R);
        } else if (c.state === 'cracked') {
          g.lineStyle(1.5, HEAT_ORANGE, 0.22); g.strokeCircle(c.home.x, c.home.y - 10, BURST_R);
        }
        if (c.state === 'sound' && time - c.ringAt < 900) {
          const k = (time - c.ringAt) / 900;
          for (let i = 0; i < 3; i++) {
            const kk = (k + i * 0.18) % 1;
            g.lineStyle(2, 0xe8f4ff, 0.6 * (1 - kk)); g.strokeEllipse(c.home.x, c.home.y - 2, 40 + kk * 160, 14 + kk * 56);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const c of casts) {
        if (c.state === 'gone') continue;
        const { x, y } = c.home;
        const shake = c.state === 'fused' ? Math.sin(time / 25) * 2 * Math.min(1, (time - c.fuseAt) / c.fuseMs) : 0;
        shadow(g, x, y + 2, 52, 13, 0.36);
        const tint = c.state === 'sound' && time - c.ringAt < 400 ? BRONZE_LIT : BRONZE;
        if (c.kind === 'bell') bell(g, x + shake, y, tint);
        else if (c.kind === 'pot') pot(g, x + shake, y);
        else wheel(g, x + shake, y, c.seed);
        if (c.state === 'cracked') crack(g, x + shake, y, c.seed, 1, false);
        if (c.state === 'fused') {
          const k = Math.min(1, (time - c.fuseAt) / c.fuseMs);
          crack(g, x + shake, y, c.seed, k, true);
          // The tester's chalk cross on what she has condemned.
          g.lineStyle(3, 0xf4ecd8, 0.9); g.lineBetween(x - 9, y - 58, x + 9, y - 44); g.lineBetween(x + 9, y - 58, x - 9, y - 44);
          glow(g, x, y - 20, 24 + k * 20, HEAT_ORANGE, 0.03 + k * 0.05, 3);
        }
        if (c.state === 'sound' && time - c.ringAt < 900) glow(g, x, y - 22, 30, 0xe8f4ff, 0.05 * (1 - (time - c.ringAt) / 900), 3);
      }
      // Shards of a burst casting, flying out and tumbling.
      for (const s of shards) {
        const k = (time - s.at) / 450;
        const a = s.seed * 3.1;
        const r = k * BURST_R;
        const sx = s.x + Math.cos(a) * r, sy = s.y + Math.sin(a) * r * 0.7 - Math.sin(k * Math.PI) * 18;
        const rot = k * 9 + s.seed;
        g.fillStyle(s.seed % 1 > 0.5 ? BRONZE_LIT : IRON_LIT, 1 - k);
        g.fillTriangle(sx + Math.cos(rot) * 6, sy + Math.sin(rot) * 6, sx + Math.cos(rot + 2.2) * 4, sy + Math.sin(rot + 2.2) * 4, sx + Math.cos(rot + 4) * 5, sy + Math.sin(rot + 4) * 5);
      }
    },

    drawHud(g, time) {
      // A tuning-fork bar each: lit while that fighter's cooldowns are racing from a true ring.
      for (const [f, x, d] of [[ctx.player, 20, 1], [ctx.npc, W - 20, -1]] as [Fighter, number, number][]) {
        const until = ringUntil.get(f) ?? 0;
        const k = Math.max(0, (until - time) / RING_MS);
        const x0 = d > 0 ? x : x - 110;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 2, top + 8, 114, 12, 5);
        g.fillStyle(IRON_DARK, 1); g.fillRoundedRect(x0, top + 10, 110, 8, 4);
        if (k > 0) { g.fillStyle(0xe8f4ff, 1); g.fillRoundedRect(d > 0 ? x0 : x0 + 110 - 110 * k, top + 10, 110 * k, 8, 4); }
        const fx = d > 0 ? x0 + 118 : x0 - 8;
        g.lineStyle(2, k > 0 ? 0xe8f4ff : IRON_LIT, 1);
        g.lineBetween(fx - 3, top + 8, fx - 3, top + 16); g.lineBetween(fx + 3, top + 8, fx + 3, top + 16);
        g.lineBetween(fx - 3, top + 16, fx + 3, top + 16); g.lineBetween(fx, top + 16, fx, top + 22);
      }
      // Her next condemnation, as a closing arc.
      const k = Math.max(0, Math.min(1, 1 - (nextCondemn - time) / (late ? CONDEMN_EVERY_LATE : CONDEMN_EVERY)));
      g.lineStyle(4, IRON_DARK, 1); g.strokeCircle(W / 2, top + 18, 10);
      g.lineStyle(4, HEAT_ORANGE, 1); g.beginPath(); g.arc(W / 2, top + 18, 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
      g.lineStyle(2, 0xf4ecd8, 0.9); g.lineBetween(W / 2 - 4, top + 14, W / 2 + 4, top + 22); g.lineBetween(W / 2 + 4, top + 14, W / 2 - 4, top + 22);
    },

    destroy() { for (const c of casts) c.t?.remove(); },
  };
}

/** The Ring Test: sound castings ring and hasten the striker; cracked ones burst; she condemns the one by you. */
export const FALLEN_RING_TEST: GimmickDef = {
  id: ID,
  rules: 'Ring a sound casting and your cooldowns race. A cracked one bursts on all near. She condemns the casting nearest you. Past half, rings crack.',
  make,
};
