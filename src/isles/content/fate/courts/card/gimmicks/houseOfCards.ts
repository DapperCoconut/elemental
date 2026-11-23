import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { mulberry } from '../../../../../art/IsleArt';
import { card, cardHouse, type Weight } from '../art';
import { CARD_BLACK, CARD_RED, CHIP_BLUE, GILT_LIT, IVORY } from '../palette';
import { alive, clamp, dist, stepDt, SUITS, wrapAngle, type Suit } from '../util';

/**
 * House of Cards — Builder Tier.
 *
 * Four tall card-houses stand about the lawn, each up to four storeys of leaning A-frames. Strike
 * one — or land a blow on anyone standing beside it — and it comes down: the cards burst out in a
 * fan on the side AWAY from the blow, cutting whoever is in it (harder the taller it stood), and
 * anyone right beside it. Then Tier's crew rebuild it, storey by storey.
 *
 * So the trick is where you stand. Put a tall house between you and Tier and strike it, and its
 * fan is thrown at him. Tier knows it too: he gets behind a house you are near and pulls a card
 * out of its bottom storey (it wobbles first — move out of the fan).
 */

const STOREYS = 4;
const HOUSE_W = 96;
const HIT_R = 34;
const BESIDE_R = 64;
const HALF = 0.62;

interface Flying { x: number; y: number; vx: number; vy: number; ang: number; spin: number; at: number; suit: Suit; face: boolean }

interface House {
  x: number; y: number;
  storeys: number;
  nextStorey: number;
  /** A storey just went up: a little settle. */
  builtAt: number;
  weight: Weight;
  back: number;
  seed: number;
  target: StrikeTarget | null;
  /** Tier's pull: wobble until `pullAt`, then down toward `pullA`. */
  pullAt: number; pullA: number;
  fellAt: number; fellA: number; fellStoreys: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const midY = (top + H) / 2;
  const spots: [number, number][] = [[W * 0.2, midY - 95], [W * 0.8, midY - 95], [W * 0.32, midY + 150], [W * 0.68, midY + 150]];
  const BUILD_MS = ctx.hard ? 2100 : 2600;
  const PULL_WARN = 1000;
  const houses: House[] = spots.map(([x, y], i) => ({
    x, y, storeys: 2 + (i % 2), nextStorey: 0, builtAt: -9999,
    weight: (['dome', 'bar', 'die', 'dome'] as Weight[])[i], back: i % 2 ? CHIP_BLUE : CARD_RED, seed: 101 + i * 37,
    target: null, pullAt: 0, pullA: 0, fellAt: -9999, fellA: 0, fellStoreys: 0,
  }));
  const flying: Flying[] = [];
  /** Cards that came down and lie on the lawn for a while. */
  const litter: { x: number; y: number; ang: number; at: number; suit: Suit; face: boolean }[] = [];
  let toppling = false;
  let started = false;
  let nextPullOk = 0;

  /** The fight clock, as `update` last saw it (hooks read it between frames). */
  let T = 0;
  const now = () => T;
  const reach = (n: number) => 70 + n * 34;

  function inFan(h: House, a: number, n: number, f: Fighter): boolean {
    const d = dist(h.x, h.y, f.x, f.y);
    if (d < BESIDE_R) return true;
    if (d > reach(n)) return false;
    return Math.abs(wrapAngle(Math.atan2(f.y - h.y, f.x - h.x) - a)) < HALF;
  }

  function topple(h: House, fromX: number, fromY: number): void {
    if (h.storeys < 1 || toppling) return;
    const time = now();
    const a = Math.atan2(h.y - fromY, h.x - fromX);
    const n = h.storeys;
    h.fellAt = time; h.fellA = a; h.fellStoreys = n;
    h.storeys = 0;
    h.pullAt = 0;
    h.nextStorey = time + 1600;
    ctx.sfx('crystal-shatter');
    ctx.flash(h.x, h.y - 40, 0xf5eedb);
    for (let i = 0; i < 10 + n * 5; i++) {
      const b = a + (rng() - 0.5) * HALF * 2;
      const sp = 180 + rng() * 120 + n * 30;
      flying.push({ x: h.x + (rng() - 0.5) * 30, y: h.y - 20 - rng() * n * 30, vx: Math.cos(b) * sp, vy: Math.sin(b) * sp, ang: rng() * 6, spin: (rng() - 0.5) * 20, at: time, suit: SUITS[i % 4], face: rng() < 0.5 });
    }
    toppling = true;
    try {
      for (const f of [player, npc]) {
        if (!alive(f) || !inFan(h, a, n, f)) continue;
        ctx.hit(f, (ctx.hard ? 6 : 4) + n * 3, f.x, f.y);
        const pa = Math.atan2(f.y - h.y, f.x - h.x);
        ctx.nudge(f, Math.cos(pa) * 40, Math.sin(pa) * 40);
      }
    } finally { toppling = false; }
    if (n >= 3) ctx.float(h.x, h.y - 90, 'THE HOUSE COMES DOWN', '#f5eedb');
  }

  /** A blow on someone standing beside a house brings it down (thrown from the other fighter). */
  function blowBeside(f: Fighter): void {
    if (toppling) return;
    const o = f === player ? npc : player;
    for (const h of houses) if (h.storeys >= 1 && dist(h.x, h.y, f.x, f.y) < BESIDE_R + 6) { topple(h, o.x, o.y); break; }
  }

  return {
    update(time, dtRaw) {
      T = time;
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextPullOk = time + 4000;
        for (const h of houses) {
          h.nextStorey = time + BUILD_MS;
          h.target = ctx.target({ x: h.x, y: h.y - 22, r: HIT_R, onStruck: (by) => { const s = by === 'player' ? player : npc; topple(h, s.x, s.y); } });
        }
        ctx.banner('STRIKE A HOUSE — IT FALLS AWAY FROM THE BLOW', '#f5eedb');
      }
      for (const h of houses) {
        // The crew rebuild, a storey at a time — quicker with Tier beside it.
        if (h.storeys < STOREYS && time >= h.nextStorey) {
          h.storeys++;
          h.builtAt = time;
          const tierNear = alive(npc) && dist(npc.x, npc.y, h.x, h.y) < 140;
          h.nextStorey = time + (tierNear ? BUILD_MS * 0.6 : BUILD_MS);
          ctx.sfx('clang');
          if (h.storeys === STOREYS) ctx.float(h.x, h.y - 150, 'FOUR HIGH', '#f7dc84');
        }
        // Tier's pull lands.
        if (h.pullAt && time >= h.pullAt) {
          const a = h.pullA;
          h.pullAt = 0;
          topple(h, h.x - Math.cos(a) * 50, h.y - Math.sin(a) * 50);
        }
      }
      // Tier pulls a card: he is close behind a tall house and you are in its fan.
      if (time >= nextPullOk && alive(npc) && alive(player)) {
        for (const h of houses) {
          if (h.storeys < 2 || h.pullAt) continue;
          if (dist(npc.x, npc.y, h.x, h.y) > 110) continue;
          const a = Math.atan2(h.y - npc.y, h.x - npc.x);
          if (!inFan(h, a, h.storeys, player) || inFan(h, a, h.storeys, npc)) continue;
          h.pullAt = time + PULL_WARN;
          h.pullA = a;
          nextPullOk = time + (ctx.hard ? 4200 : 5600);
          ctx.banner('TIER PULLS A CARD', '#f5eedb');
          ctx.sfx('snap-back');
          break;
        }
      }
      for (let i = flying.length - 1; i >= 0; i--) {
        const c = flying[i];
        const k = (time - c.at) / 1000;
        const drag = Math.max(0, 1 - dt * 2.6);
        c.vx *= drag; c.vy *= drag;
        c.x += c.vx * dt; c.y += c.vy * dt; c.ang += c.spin * dt * Math.max(0, 1 - k);
        if (k > 0.7) {
          flying.splice(i, 1);
          if (litter.length < 60) litter.push({ x: clamp(c.x, 20, W - 20), y: clamp(c.y, top + 10, H - 10), ang: c.ang, at: time, suit: c.suit, face: c.face });
        }
      }
      for (let i = litter.length - 1; i >= 0; i--) if (time - litter[i].at > 7000) litter.splice(i, 1);
    },

    onPlayerHurt() { blowBeside(player); },
    onNpcHurt() { blowBeside(npc); },

    npcSeek() {
      // Behind the tallest house you are in reach of, so its fan points at you.
      let best: House | null = null;
      let bs = 0;
      for (const h of houses) {
        if (h.storeys < 2) continue;
        const d = dist(h.x, h.y, player.x, player.y);
        if (d > reach(h.storeys) - 20 || d < BESIDE_R) continue;
        const s = h.storeys * 100 - d;
        if (s > bs) { bs = s; best = h; }
      }
      if (best) {
        const a = Math.atan2(best.y - player.y, best.x - player.x);
        return { x: clamp(best.x + Math.cos(a) * 84, 50, W - 50), y: clamp(best.y + Math.sin(a) * 84, top + 50, H - 40) };
      }
      // Otherwise keep clear of any house you might bring down on him.
      for (const h of houses) {
        if (h.storeys >= 2 && dist(h.x, h.y, npc.x, npc.y) < BESIDE_R + 30) {
          const a = Math.atan2(npc.y - h.y, npc.x - h.x);
          return { x: clamp(h.x + Math.cos(a) * 150, 50, W - 50), y: clamp(h.y + Math.sin(a) * 150, top + 50, H - 40) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      // Litter of fallen cards, fading.
      for (const c of litter) {
        const a = clamp(1 - (time - c.at - 5500) / 1500, 0, 1);
        card(g, c.x, c.y, 12, 17, c.ang, { face: c.face, suit: c.suit, rank: 1, cheap: true, alpha: a });
      }
      for (const h of houses) {
        // The footprint: chalked on the lawn, with peg holes for the ropes.
        g.lineStyle(1.5, IVORY, 0.25); g.strokeEllipse(h.x, h.y, HOUSE_W + 24, 30);
        // Tier's pull: the fan it will throw, filling as the house wobbles.
        if (h.pullAt) {
          const k = clamp(1 - (h.pullAt - time) / PULL_WARN, 0, 1);
          const r = reach(h.storeys);
          g.fillStyle(CARD_RED, 0.1 + k * 0.18);
          g.beginPath(); g.slice(h.x, h.y, r, h.pullA - HALF, h.pullA + HALF, false); g.fillPath();
          g.lineStyle(2, CARD_RED, 0.4 + k * 0.5);
          g.beginPath(); g.arc(h.x, h.y, r * k, h.pullA - HALF, h.pullA + HALF, false); g.strokePath();
          g.lineBetween(h.x, h.y, h.x + Math.cos(h.pullA - HALF) * r, h.y + Math.sin(h.pullA - HALF) * r);
          g.lineBetween(h.x, h.y, h.x + Math.cos(h.pullA + HALF) * r, h.y + Math.sin(h.pullA + HALF) * r);
        }
        // Just fallen: the swept fan of the blow.
        const fk = (time - h.fellAt) / 500;
        if (fk >= 0 && fk < 1) {
          g.fillStyle(IVORY, 0.25 * (1 - fk));
          g.beginPath(); g.slice(h.x, h.y, reach(h.fellStoreys) * Math.min(1, fk * 2), h.fellA - HALF, h.fellA + HALF, false); g.fillPath();
        }
        // A reach ring for a tall house, so you can read whether you stand in it.
        if (h.storeys >= 2) { g.lineStyle(1, GILT_LIT, 0.12); g.strokeCircle(h.x, h.y, reach(h.storeys)); }
      }
    },

    drawAir(g, time) {
      for (const h of houses) {
        if (h.storeys <= 0) {
          // The flat card base the crew start from.
          g.fillStyle(IVORY, 0.8); g.fillRect(h.x - HOUSE_W / 2, h.y - 4, HOUSE_W, 5);
          g.fillStyle(CARD_BLACK, 0.4); g.fillRect(h.x - HOUSE_W / 2, h.y + 1, HOUSE_W, 2);
          continue;
        }
        const wob = h.pullAt ? Math.sin(time / 40) * 3 * clamp(1 - (h.pullAt - time) / 1000, 0.2, 1) : 0;
        const settle = clamp((time - h.builtAt) / 240, 0, 1);
        cardHouse(g, h.x + wob, h.y, HOUSE_W, h.storeys, mulberry(h.seed), h.weight, h.back);
        if (settle < 1) {
          // A new storey dropping into place: a puff of dust at its foot.
          g.fillStyle(IVORY, 0.4 * (1 - settle)); g.fillEllipse(h.x, h.y - (h.storeys - 1) * HOUSE_W * 0.38, HOUSE_W * (0.8 + settle * 0.4), 10);
        }
      }
      for (const c of flying) card(g, c.x, c.y, 13, 18, c.ang, { face: c.face, suit: c.suit, rank: 1, cheap: true });
    },
  };
}

export const HOUSE_OF_CARDS: GimmickDef = {
  id: 'card-house-of-cards',
  rules: 'Strike a card-house (or hit someone beside it) and it falls in a fan AWAY from the blow, cutting whoever stands there. Tier rebuilds them — and pulls cards.',
  make,
};
