import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { SUITS, playingCard, rankLabel, strokeText, type Suit } from '../art';
import { CANDLE, GILT, GILT_DARK, GILT_LIT, LAMP_GREEN, MIND_LIT } from '../palette';
import { alive, clamp, dist } from '../util';

/**
 * Poker Face — Bluffer Tell.
 *
 * A card hangs over each fighter's head: face-down to its owner, face-up to the other. You can
 * see Tell's card; you cannot see your own. When the bell rings the higher card strikes the
 * lower, harder the wider the gap.
 *
 * Any blow that lands between you swaps the two cards — so if Tell's card is a king, go and hit
 * him for it; if it is a three, keep away, or he will come and hit you for yours. That is his
 * tell: Tell can see your card, and when he starts walking toward you, yours is the better one.
 * For the last moment before the bell — NO MORE BETS — the cards are locked.
 */

const SWAP_CD = 1100;
const REVEAL_MS = 1500;

interface Hand { rank: number; suit: Suit }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const ROUND = ctx.hard ? 6000 : 7000;
  const LOCK = ctx.hard ? 1300 : 1600;
  const deal = (): Hand => ({ rank: 2 + Math.floor(rng() * 13), suit: SUITS[Math.floor(rng() * 4)] });
  const hands = new Map<Fighter, Hand>([[player, deal()], [npc, deal()]]);
  let bellAt = 0;
  let lockWarned = false;
  let swappedAt = -9999;
  let revealUntil = 0;
  let strikeFx: { from: Fighter; to: Fighter; at: number; hand: Hand } | null = null;
  let dealing = false;
  let started = false;

  const handOf = (f: Fighter) => hands.get(f) as Hand;
  const locked = (time: number) => time >= bellAt - LOCK || time < revealUntil;

  function swap(): void {
    const time = ctx.scene.time.now;
    if (dealing || !started || locked(time) || time - swappedAt < SWAP_CD) return;
    swappedAt = time;
    const a = handOf(player), b = handOf(npc);
    hands.set(player, b); hands.set(npc, a);
    ctx.sfx('snap-back');
    ctx.float((player.x + npc.x) / 2, Math.min(player.y, npc.y) - 70, 'SWAPPED', '#f4dc8a');
  }

  function bell(time: number): void {
    const a = handOf(player), b = handOf(npc);
    revealUntil = time + REVEAL_MS;
    ctx.sfx('judgement');
    dealing = true;
    if (a.rank === b.rank) {
      ctx.float(W / 2, top + 60, `${rankLabel(a.rank)} AND ${rankLabel(b.rank)} - A PUSH`, '#f4dc8a');
      if (alive(player)) ctx.hit(player, 4);
      if (alive(npc)) ctx.hit(npc, 4);
    } else {
      const win = a.rank > b.rank ? player : npc;
      const lose = win === player ? npc : player;
      const gap = Math.abs(a.rank - b.rank);
      const dmg = Math.round((6 + gap * 1.5) * (ctx.hard ? 1.15 : 1));
      strikeFx = { from: win, to: lose, at: time, hand: handOf(win) };
      ctx.float(W / 2, top + 60, `${rankLabel(Math.max(a.rank, b.rank))} BEATS ${rankLabel(Math.min(a.rank, b.rank))}`, win === player ? '#a8ffb8' : '#ffb0b0');
      if (alive(lose)) { ctx.hit(lose, dmg, lose.x, lose.y); ctx.flash(lose.x, lose.y, GILT); }
    }
    dealing = false;
  }

  return {
    update(time) {
      if (!started) { started = true; bellAt = time + ROUND; }
      if (!lockWarned && time >= bellAt - LOCK) {
        lockWarned = true;
        ctx.banner('NO MORE BETS', '#f4dc8a');
        ctx.sfx('countdown-tick');
      }
      if (time >= bellAt) {
        bell(time);
        bellAt = time + REVEAL_MS + ROUND;
        lockWarned = false;
      }
      // A fresh deal once the reveal is done.
      if (revealUntil > 0 && time >= revealUntil) {
        revealUntil = 0;
        hands.set(player, deal()); hands.set(npc, deal());
        ctx.sfx('dice');
      }
    },

    onNpcHurt(amount) { if (amount > 0) swap(); },
    onPlayerHurt(amount) { if (amount > 0) swap(); },

    npcSeek() {
      if (!alive(player)) return null;
      const mine = handOf(npc).rank, yours = handOf(player).rank;
      const time = ctx.scene.time.now;
      // Yours is better: come and take it.
      if (yours > mine && !locked(time)) return { x: player.x, y: player.y };
      // Mine is better: keep it out of reach.
      let best = { x: W / 2, y: (top + H) / 2 }, bd = -1;
      for (let i = 0; i < 9; i++) {
        const x = 90 + (i % 3) * ((W - 180) / 2), y = top + 70 + Math.floor(i / 3) * ((H - top - 120) / 2);
        const d = dist(x, y, player.x, player.y) - dist(x, y, npc.x, npc.y) * 0.3;
        if (d > bd) { bd = d; best = { x, y }; }
      }
      return best;
    },

    drawGround(g) {
      // A card table's lamp-pool under each fighter.
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        g.fillStyle(LAMP_GREEN, 0.18); g.fillEllipse(f.x, f.y + 8, 70, 24);
      }
    },

    drawAir(g, time) {
      const reveal = time < revealUntil;
      const swapK = clamp((time - swappedAt) / 320, 0, 1);
      for (const f of [player, npc]) {
        if (!alive(f)) continue;
        const h = handOf(f);
        const other = f === player ? npc : player;
        // Mid-swap: the cards cross over the fighters' heads.
        let x = f.x, y = f.y - 66;
        if (swapK < 1) { x = other.x + (f.x - other.x) * swapK; y = other.y - 66 + (f.y - other.y) * swapK - Math.sin(swapK * Math.PI) * 40; }
        const bob = Math.sin(time / 300 + (f === player ? 0 : 2)) * 2;
        g.lineStyle(1, GILT_DARK, 0.6); g.lineBetween(f.x, f.y - 34, x, y + 18 + bob);
        // Face-down to its owner (the player), face-up to the other.
        const faceUp = reveal || f === npc;
        if (strikeFx && strikeFx.from === f && time - strikeFx.at < 600) continue;
        playingCard(g, x, y + bob, 26, faceUp ? h.rank : 0, h.suit);
        if (f === player && !reveal) { g.fillStyle(0x000000, 0); strokeText(g, '?', x, y - 28 + bob, 10, MIND_LIT, 0.8, 1.5); }
      }
      // The winning card flies to the loser and breaks on them.
      if (strikeFx) {
        const k = (time - strikeFx.at) / 600;
        if (k > 1) strikeFx = null;
        else {
          const { from, to, hand } = strikeFx;
          const x = from.x + (to.x - from.x) * k, y = from.y - 66 + (to.y - from.y + 50) * k - Math.sin(k * Math.PI) * 60;
          glow(g, x, y, 30, CANDLE, 0.08, 2);
          playingCard(g, x, y, 26 + k * 10, hand.rank, hand.suit);
        }
      }
    },

    drawHud(g, time) {
      // The bell: a gilt bell and an arc counting down the round.
      const x = W / 2, y = top + 18;
      const reveal = time < revealUntil;
      const left = reveal ? 0 : clamp((bellAt - time) / ROUND, 0, 1);
      const isLocked = !reveal && time >= bellAt - LOCK;
      g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 17);
      g.lineStyle(3, isLocked ? 0xff6a5a : GILT_LIT, 0.95);
      g.beginPath(); g.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2, false); g.strokePath();
      const sw = isLocked ? Math.sin(time / 50) * 0.3 : 0;
      const bx = x + Math.sin(sw) * 3;
      g.fillStyle(GILT, 1); g.fillTriangle(bx - 7, y + 5, bx + 7, y + 5, bx, y - 8);
      g.fillCircle(bx, y - 4, 4.5);
      g.fillStyle(GILT_DARK, 1); g.fillCircle(bx, y + 7, 2);
    },
  };
}

export const POKER_FACE: GimmickDef = {
  id: 'mind-poker-face',
  rules: 'Each of you wears a card you cannot see but your foe can. At the bell the higher card strikes the lower. Any blow between you swaps the cards.',
  make,
};
