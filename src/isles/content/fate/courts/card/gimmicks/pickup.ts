import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { card, pip, suitColor } from '../art';
import { BELL, CARD_RED, CHIP_WHITE, GILT, GILT_LIT, MOTLEY_GREEN, MOTLEY_PURPLE } from '../palette';
import { alive, clamp, dist, stepDt, SUITS, type Suit } from '../util';

/**
 * Fifty-Two Pickup — Joker Jape.
 *
 * Every so often Jape flings the whole deck. Cards scatter face down over the floor, bouncing once
 * where they land (he's a rubber man; so are his cards). Walk over one to pick it up, and it plays
 * as you lift it: ♥ heals you, ♦ puts a skip in your step, ♠ flicks itself at your foe, ♣ thumps
 * the floor and shoves your foe away. But two or three in every fling are jokers, and a joker goes
 * off in your hand — a spring-loaded fool on a coil, a bang, a bounce.
 *
 * Jape knows his jokers and walks round them. You can learn them too: a joker's back twitches now
 * and then, as if something inside wants out. And strike a card where it lies — a joker goes off
 * on the spot, catching anyone beside it; anything else just turns face up.
 */

const PICK_R = 30;
const LIFE_MS = 11000;
const BLAST_R = 74;

type Kind = Suit | 'joker';

interface Thrown {
  x: number; y: number;
  /** Flight: from (fx, fy) to (x, y) between `at` and `landAt`. */
  fx: number; fy: number; at: number; landAt: number;
  ang: number; spin: number;
  kind: Kind;
  shown: boolean;
  gone: boolean;
  target: StrikeTarget | null;
  seed: number;
}

interface Flick { x: number; y: number; vx: number; vy: number; ang: number; victim: Fighter; at: number; done: boolean }
interface Pop { x: number; y: number; at: number; kind: Kind }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const FLING_EVERY = ctx.hard ? 7200 : 8600;
  const FLING_WARN = 1100;
  const cards: Thrown[] = [];
  const flicks: Flick[] = [];
  const pops: Pop[] = [];
  const quick = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let nextFling = 0;
  let warnAt = -1;
  let started = false;
  let T = 0;

  function play(c: Thrown, f: Fighter, time: number): void {
    c.gone = true;
    c.target?.remove();
    const other = f === player ? npc : player;
    pops.push({ x: c.x, y: c.y, at: time, kind: c.kind });
    switch (c.kind) {
      case 'joker': {
        ctx.hit(f, ctx.hard ? 12 : 10, f.x, f.y);
        const a = rng() * Math.PI * 2;
        ctx.nudge(f, Math.cos(a) * 90, Math.sin(a) * 90);
        ctx.float(f.x, f.y - 46, 'JOKER!', '#f2d040');
        ctx.sfx('boing');
        break;
      }
      case 'heart': ctx.heal(f, ctx.hard ? 5 : 6); ctx.sfx('heal'); break;
      case 'diamond': quick.set(f, time + 2500); ctx.sfx('dash'); break;
      case 'spade':
        if (alive(other)) {
          const a = Math.atan2(other.y - f.y, other.x - f.x);
          flicks.push({ x: f.x, y: f.y - 10, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, ang: a, victim: other, at: time, done: false });
          ctx.sfx('slash');
        }
        break;
      case 'club':
        ctx.sfx('drum-hit');
        if (alive(other) && dist(other.x, other.y, f.x, f.y) < 150) {
          const a = Math.atan2(other.y - f.y, other.x - f.x);
          ctx.nudge(other, Math.cos(a) * 80, Math.sin(a) * 80);
          ctx.hit(other, 5, other.x, other.y);
        }
        break;
    }
  }

  /** A joker struck where it lies goes off on the spot. */
  function detonate(c: Thrown, time: number): void {
    c.gone = true;
    c.target?.remove();
    pops.push({ x: c.x, y: c.y, at: time, kind: 'joker' });
    ctx.sfx('explosion-small');
    for (const f of [player, npc]) if (alive(f) && dist(f.x, f.y, c.x, c.y) < BLAST_R) ctx.hit(f, ctx.hard ? 12 : 10, c.x, c.y);
  }

  function fling(time: number): void {
    const n = ctx.hard ? 14 : 12;
    const jokers = ctx.hard ? 3 : 2;
    const kinds: Kind[] = [];
    for (let i = 0; i < n; i++) kinds.push(i < jokers ? 'joker' : SUITS[i % 4]);
    const ox = alive(npc) ? npc.x : W / 2, oy = alive(npc) ? npc.y : (top + H) / 2;
    for (let i = 0; i < n; i++) {
      // Some round you, the rest anywhere on the floor.
      let x: number, y: number;
      if (i % 5 < 2 && alive(player)) {
        const a = rng() * Math.PI * 2, d = 70 + rng() * 150;
        x = player.x + Math.cos(a) * d; y = player.y + Math.sin(a) * d;
      } else { x = 60 + rng() * (W - 120); y = top + 50 + rng() * (H - top - 90); }
      x = clamp(x, 40, W - 40); y = clamp(y, top + 30, H - 30);
      const c: Thrown = {
        x, y, fx: ox, fy: oy - 20, at: time, landAt: time + 480 + rng() * 360, ang: rng() * 6, spin: (rng() - 0.5) * 18,
        kind: kinds[i], shown: false, gone: false, target: null, seed: rng() * 10,
      };
      cards.push(c);
    }
    ctx.sfx('whoosh');
  }

  return {
    update(time, dtRaw) {
      T = time;
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextFling = time + 2400; ctx.banner('PICK UP THE CARDS — MIND THE JOKERS', '#f2d040'); }
      if (warnAt < 0 && time >= nextFling - FLING_WARN) { warnAt = time; ctx.banner('JAPE FLINGS THE DECK', '#f2d040'); ctx.sfx('boing'); }
      if (time >= nextFling) { nextFling = time + FLING_EVERY; warnAt = -1; fling(time); }

      for (const c of cards) {
        if (c.gone) continue;
        if (time < c.landAt) continue;
        if (!c.target) {
          // Landed: now it can be struck where it lies.
          c.target = ctx.target({
            x: c.x, y: c.y, r: 18, passThrough: true,
            onStruck: () => {
              if (c.gone) return;
              if (c.kind === 'joker') detonate(c, T);
              else if (!c.shown) { c.shown = true; ctx.sfx('dice'); }
            },
          });
        }
        if (time - c.landAt > LIFE_MS) { c.gone = true; c.target.remove(); continue; }
        if (time - c.landAt < 250) continue;
        for (const f of [player, npc]) {
          if (alive(f) && dist(f.x, f.y, c.x, c.y) < PICK_R) { play(c, f, time); break; }
        }
      }
      for (let i = cards.length - 1; i >= 0; i--) if (cards[i].gone) cards.splice(i, 1);

      for (const fl of flicks) {
        if (fl.done) continue;
        fl.x += fl.vx * dt; fl.y += fl.vy * dt; fl.ang += dt * 18;
        if (alive(fl.victim) && dist(fl.x, fl.y, fl.victim.x, fl.victim.y) < 24) { fl.done = true; ctx.hit(fl.victim, ctx.hard ? 9 : 8, fl.x, fl.y); }
        if (time - fl.at > 1600 || fl.x < -30 || fl.x > W + 30 || fl.y < top - 30 || fl.y > H + 30) fl.done = true;
      }
      for (let i = flicks.length - 1; i >= 0; i--) if (flicks[i].done) flicks.splice(i, 1);
      for (let i = pops.length - 1; i >= 0; i--) if (time - pops[i].at > 700) pops.splice(i, 1);
    },

    playerSpeedMult() { return T < (quick.get(player) ?? 0) ? 1.3 : 1; },
    npcSpeedMult() { return T < (quick.get(npc) ?? 0) ? 1.3 : 1; },

    npcSeek() {
      // The nearest card that is not a joker, walking round any joker in the way.
      let best: Thrown | null = null;
      let bd = 420;
      for (const c of cards) {
        if (c.gone || c.kind === 'joker' || T < c.landAt) continue;
        const d = dist(npc.x, npc.y, c.x, c.y);
        if (d < bd) { bd = d; best = c; }
      }
      if (!best) return null;
      let x = best.x, y = best.y;
      for (const c of cards) {
        if (c.kind !== 'joker' || c.gone) continue;
        const mx = (npc.x + x) / 2, my = (npc.y + y) / 2;
        if (dist(mx, my, c.x, c.y) < 50) { x += (mx - c.x) * 0.8; y += (my - c.y) * 0.8; }
      }
      return { x: clamp(x, 40, W - 40), y: clamp(y, top + 30, H - 30) };
    },

    drawGround(g, time) {
      // Where the deck is about to come down: a spray of faint marks from Jape.
      if (warnAt >= 0 && alive(npc)) {
        const k = clamp((time - warnAt) / FLING_WARN, 0, 1);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + time / 400;
          g.lineStyle(2, BELL, 0.2 + k * 0.5);
          g.lineBetween(npc.x + Math.cos(a) * 26, npc.y + Math.sin(a) * 26, npc.x + Math.cos(a) * (40 + k * 60), npc.y + Math.sin(a) * (40 + k * 60));
        }
      }
      for (const c of cards) {
        if (time < c.landAt) { g.fillStyle(0x000000, 0.18); g.fillEllipse(c.x, c.y + 4, 22, 8); continue; }
        const age = time - c.landAt;
        const fade = clamp((LIFE_MS - age) / 800, 0, 1);
        // One rubbery hop as it lands.
        const hop = age < 360 ? Math.sin((age / 360) * Math.PI) * 10 : 0;
        // A joker's back twitches every so often.
        const twitch = c.kind === 'joker' && Math.sin(time / 260 + c.seed * 7) > 0.86 ? Math.sin(time / 25) * 0.25 : 0;
        g.fillStyle(0x000000, 0.2 * fade); g.fillEllipse(c.x, c.y + 6, 24, 8);
        if (c.shown) card(g, c.x, c.y - hop, 20, 28, c.ang * 0.15, { face: true, suit: c.kind as Suit, rank: 1, alpha: fade });
        else card(g, c.x, c.y - hop, 20, 28, c.ang * 0.15 + twitch, { face: false, back: MOTLEY_PURPLE, alpha: fade });
        // The Joker's motley stitching on every back: a green diamond in the purple.
        if (!c.shown) pip(g, c.x, c.y - hop, 4, 'diamond', MOTLEY_GREEN, fade * 0.9);
      }
    },

    drawAir(g, time) {
      // Cards in flight, arcing high and spinning.
      for (const c of cards) {
        if (time >= c.landAt) continue;
        const k = clamp((time - c.at) / (c.landAt - c.at), 0, 1);
        const x = c.fx + (c.x - c.fx) * k, y = c.fy + (c.y - c.fy) * k - Math.sin(k * Math.PI) * 120;
        card(g, x, y, 18, 26, c.ang + c.spin * k, { face: false, back: MOTLEY_PURPLE, cheap: true });
      }
      for (const fl of flicks) card(g, fl.x, fl.y, 14, 20, fl.ang, { face: true, suit: 'spade', rank: 1, cheap: true });
      for (const p of pops) {
        const k = (time - p.at) / 700;
        if (p.kind === 'joker') {
          // The jack-in-the-box: a coil springs up, a grinning fool's head on it, a bang.
          const h = Math.sin(Math.min(1, k * 2.4) * Math.PI * 0.5) * 40;
          g.lineStyle(2, GILT, 1 - k);
          for (let i = 0; i < 6; i++) g.lineBetween(p.x - 6, p.y - (i / 6) * h, p.x + 6, p.y - ((i + 0.5) / 6) * h);
          g.fillStyle(0xf0c8a8, 1 - k); g.fillCircle(p.x, p.y - h - 6, 8);
          g.fillStyle(MOTLEY_PURPLE, 1 - k); g.fillTriangle(p.x - 10, p.y - h - 10, p.x - 2, p.y - h - 10, p.x - 14, p.y - h - 24);
          g.fillStyle(MOTLEY_GREEN, 1 - k); g.fillTriangle(p.x + 2, p.y - h - 10, p.x + 10, p.y - h - 10, p.x + 14, p.y - h - 24);
          g.fillStyle(BELL, 1 - k); g.fillCircle(p.x - 14, p.y - h - 24, 2.5); g.fillCircle(p.x + 14, p.y - h - 24, 2.5);
          g.lineStyle(3, BELL, (1 - k) * 0.8); g.strokeCircle(p.x, p.y - 10, 16 + k * 54);
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(i % 2 ? CARD_RED : CHIP_WHITE, 1 - k); g.fillRect(p.x + Math.cos(a) * k * 60, p.y - 10 + Math.sin(a) * k * 50, 4, 3); }
        } else {
          // The card lifts and turns face up over the one who picked it.
          const y = p.y - 20 - k * 40;
          if (p.kind === 'heart') glow(g, p.x, y, 20, CARD_RED, 0.08 * (1 - k), 2);
          if (p.kind === 'diamond') glow(g, p.x, y, 20, GILT_LIT, 0.08 * (1 - k), 2);
          card(g, p.x, y, 18, 26, Math.sin(k * 6) * 0.2, { face: true, suit: p.kind, rank: 1, alpha: 1 - k });
          if (p.kind === 'club') { g.lineStyle(3, suitColor('club'), (1 - k) * 0.6); g.strokeCircle(p.x, p.y, 20 + k * 120); }
        }
      }
      // A quick step: little diamonds at the heels.
      for (const [f, until] of quick) {
        if (!alive(f) || time >= until) continue;
        for (let i = 0; i < 3; i++) pip(g, f.x - 10 + i * 10, f.y + 18 + Math.sin(time / 60 + i) * 2, 3, 'diamond', CARD_RED, 0.7);
      }
    },
  };
}

export const FIFTY_TWO_PICKUP: GimmickDef = {
  id: 'card-fifty-two-pickup',
  rules: 'Jape flings the deck. Walk over a card to play it (♥ heal, ♦ quick, ♠ flick at foe, ♣ shove) — but jokers go off in your hand. A joker\'s back twitches; strike one to set it off.',
  make,
};
