import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { card, pip, suitColor } from '../art';
import { BAIZE_DARK, BAIZE_LIT, CARD_RED, GILT, GILT_DARK, GILT_LIT, IVORY, IVORY_SHADE, LAMP_LIGHT } from '../palette';
import { alive, clamp, dist, stepDt, SUITS, type Suit } from '../util';

/**
 * Cut the Deck — Dealer Shuffle.
 *
 * A deck as big as a cart lies on a cutting cloth in the middle of the lawn. Strike it and you
 * cut: the cut card turns up, hangs over the table, and for six seconds its suit is the rule for
 * BOTH fighters — ♥ every hit heals the one who landed it, ♠ every hit cuts a third deeper, ♦
 * both run and recover quicker, ♣ every solid hit stuns. Whoever cuts also deals: the cut half
 * fans three card-blades at the other fighter.
 *
 * Shuffle is the dealer and always knows the top card. He walks to the deck and taps it when the
 * next card suits him, and if nobody cuts for long he cuts anyway. But stand by the deck and its
 * corner lifts for you too: you see the next suit, and can cut first — or wait him out.
 */

const RULE_MS = 6000;
const GAP_MS = 900;
const IDLE_MS = 9000;
const DECK_R = 36;
const PEEK_R = 120;

const SUIT_NAME: Record<Suit, string> = {
  heart: '♥ HEARTS — EVERY HIT HEALS THE STRIKER',
  spade: '♠ SPADES — EVERY HIT CUTS DEEPER',
  diamond: '♦ DIAMONDS — QUICK FEET, QUICK HANDS',
  club: '♣ CLUBS — A SOLID HIT STUNS',
};

interface Rule { suit: Suit; at: number; until: number; by: 'player' | 'npc' }
interface Blade { x: number; y: number; vx: number; vy: number; ang: number; at: number; victim: 'player' | 'npc'; suit: Suit; done: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const D: Pt = { x: W / 2, y: (top + H) / 2 + 16 };
  let next: Suit = SUITS[Math.floor(rng() * 4)];
  let rule: Rule | null = null;
  let readyAt = 0;
  let lastRuleEnd = 0;
  let started = false;
  let cutFx = -9999;
  let cutBy: 'player' | 'npc' = 'npc';
  const blades: Blade[] = [];
  const lastStun = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  /** Little suit motes off a fighter when the rule bites (a heal, a deep cut, a stun). */
  const motes: { x: number; y: number; at: number; suit: Suit }[] = [];

  /** The fight clock, as `update` last saw it (hooks read it between frames). */
  let T = 0;
  const now = () => T;
  const active = (s: Suit) => rule !== null && rule.suit === s && now() < rule.until;
  const ratio = (f: Fighter) => f.hp / Math.max(1, f.maxHp);

  /** Does the next card suit the dealer? He reads his own deck. */
  function suitsShuffle(s: Suit): boolean {
    const d = dist(npc.x, npc.y, player.x, player.y);
    if (s === 'heart') return ratio(npc) < 0.6;
    if (s === 'spade') return ratio(player) < ratio(npc) + 0.05;
    if (s === 'club') return d < 260;
    return ratio(npc) >= 0.6;
  }

  function cut(by: 'player' | 'npc', time: number): void {
    if (time < readyAt || !alive(player) || !alive(npc)) return;
    const suit = next;
    next = SUITS[Math.floor(rng() * 4)];
    rule = { suit, at: time, until: time + (ctx.hard ? RULE_MS + 600 : RULE_MS), by };
    readyAt = rule.until + GAP_MS;
    cutFx = time;
    cutBy = by;
    ctx.banner(SUIT_NAME[suit], suit === 'heart' || suit === 'diamond' ? '#ff8a90' : '#e8e8f0');
    ctx.sfx('dice');
    ctx.float(D.x, D.y - 70, by === 'player' ? 'YOU CUT' : 'SHUFFLE CUTS', '#f7dc84');
    // The dealer's privilege: the cut half fans out at the other fighter.
    const victim = by === 'player' ? npc : player;
    const base = Math.atan2(victim.y - D.y, victim.x - D.x);
    for (const k of [-1, 0, 1]) {
      const a = base + k * 0.2;
      blades.push({ x: D.x + Math.cos(a) * 30, y: D.y + Math.sin(a) * 30, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, ang: a, at: time, victim: by === 'player' ? 'npc' : 'player', suit, done: false });
    }
  }

  ctx.target({ x: D.x, y: D.y, r: DECK_R, onStruck: (by) => cut(by, now()) });

  function bite(f: Fighter, amount: number): void {
    if (!rule || now() >= rule.until || amount <= 0) return;
    const other = f === player ? npc : player;
    if (rule.suit === 'heart' && alive(other)) {
      ctx.heal(other, Math.max(1, Math.round(amount * 0.4)));
      motes.push({ x: other.x, y: other.y - 30, at: now(), suit: 'heart' });
    } else if (rule.suit === 'club' && amount >= 3) {
      const t = now();
      if (t - (lastStun.get(f) ?? 0) > 1600) {
        lastStun.set(f, t);
        ctx.stun(f, ctx.hard ? 420 : 360);
        motes.push({ x: f.x, y: f.y - 40, at: t, suit: 'club' });
      }
    } else if (rule.suit === 'spade') {
      motes.push({ x: f.x, y: f.y - 20, at: now(), suit: 'spade' });
    }
  }

  return {
    update(time, dtRaw) {
      T = time;
      const dt = stepDt(dtRaw);
      if (!started) { started = true; readyAt = time + 1800; lastRuleEnd = time; ctx.banner('STRIKE THE DECK TO CUT — THE CARD SETS THE RULE', '#f7dc84'); }
      if (rule && time >= rule.until && lastRuleEnd < rule.until) lastRuleEnd = rule.until;
      if (rule && time >= rule.until) rule = null;
      // Shuffle taps the deck when he is beside it and the next card is his.
      if (!rule && time >= readyAt && alive(npc) && dist(npc.x, npc.y, D.x, D.y) < DECK_R + 50 && suitsShuffle(next)) cut('npc', time);
      // Nobody has cut for a while: the dealer cuts regardless.
      if (!rule && time >= readyAt && time - lastRuleEnd > IDLE_MS) cut('npc', time);

      for (const b of blades) {
        if (b.done) continue;
        b.x += b.vx * dt; b.y += b.vy * dt; b.ang += dt * 14;
        const f = b.victim === 'player' ? player : npc;
        if (alive(f) && dist(b.x, b.y, f.x, f.y) < 24) {
          b.done = true;
          ctx.hit(f, ctx.hard ? 6 : 5, b.x, b.y);
          ctx.sfx('slash');
        }
        if (b.x < -40 || b.x > W + 40 || b.y < top - 40 || b.y > H + 40 || time - b.at > 2500) b.done = true;
      }
      for (let i = blades.length - 1; i >= 0; i--) if (blades[i].done) blades.splice(i, 1);
      for (let i = motes.length - 1; i >= 0; i--) if (time - motes[i].at > 900) motes.splice(i, 1);
    },

    onPlayerHurt(amount) { bite(player, amount); },
    onNpcHurt(amount) { bite(npc, amount); },
    playerTakenMult() { return active('spade') ? 1.35 : 1; },
    npcTakenMult() { return active('spade') ? 1.35 : 1; },
    playerSpeedMult() { return active('diamond') ? 1.35 : 1; },
    npcSpeedMult() { return active('diamond') ? 1.35 : 1; },
    playerCooldownRate() { return active('diamond') ? 1.3 : 1; },
    npcCooldownRate() { return active('diamond') ? 1.3 : 1; },

    npcSeek() {
      if (!rule && now() >= readyAt - 600 && suitsShuffle(next)) {
        // To the deck, on the side away from you.
        const a = Math.atan2(D.y - player.y, D.x - player.x);
        return { x: D.x + Math.cos(a) * (DECK_R + 26), y: clamp(D.y + Math.sin(a) * (DECK_R + 26), top + 40, H - 40) };
      }
      if (rule && rule.suit === 'heart' && ratio(npc) < ratio(player)) {
        // Hearts while he is behind: keep his distance and trade shots.
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(player.x + Math.cos(a) * 300, 60, W - 60), y: clamp(player.y + Math.sin(a) * 240, top + 50, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      // The cutting cloth: a round of darker baize, gilt-ringed, the four suits at its quarters —
      // the live one lit.
      g.fillStyle(0x000000, 0.18); g.fillEllipse(D.x, D.y + 8, 250, 150);
      g.fillStyle(BAIZE_DARK, 1); g.fillEllipse(D.x, D.y + 4, 236, 138);
      g.lineStyle(3, GILT_DARK, 1); g.strokeEllipse(D.x, D.y + 4, 236, 138);
      g.lineStyle(1.5, GILT, 1); g.strokeEllipse(D.x, D.y + 4, 222, 126);
      SUITS.forEach((s, i) => {
        const a = -Math.PI / 2 + (i / 4) * Math.PI * 2;
        const x = D.x + Math.cos(a) * 92, y = D.y + 4 + Math.sin(a) * 50;
        const on = rule?.suit === s && time < rule.until;
        if (on) glow(g, x, y, 22, s === 'heart' || s === 'diamond' ? CARD_RED : 0xe8e8f0, 0.08, 3);
        pip(g, x, y, on ? 11 : 8, s, on ? (s === 'heart' || s === 'diamond' ? CARD_RED : 0x101018) : dim(GILT, 0.2), on ? 1 : 0.55);
      });
      // The rule's timer: a gilt arc running down round the cloth.
      if (rule && time < rule.until) {
        const k = clamp((rule.until - time) / (rule.until - rule.at), 0, 1);
        g.lineStyle(4, suitColor(rule.suit) === CARD_RED ? CARD_RED : 0xe8e8f0, 0.7);
        g.beginPath(); g.arc(D.x, D.y + 4, 128, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      } else if (time >= readyAt) {
        // Ready to cut: the cloth breathes.
        g.lineStyle(2, GILT_LIT, 0.25 + Math.sin(time / 200) * 0.2); g.strokeEllipse(D.x, D.y + 4, 250, 150);
      }
      // Diamonds: a glitter under both fighters' feet.
      if (active('diamond')) {
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          for (let i = 0; i < 4; i++) { const a = time / 150 + i * 1.57; pip(g, f.x + Math.cos(a) * 18, f.y + 14 + Math.sin(a) * 6, 3, 'diamond', CARD_RED, 0.6); }
        }
      }
    },

    drawAir(g, time) {
      // The deck itself: edges stacked high, the top card's lattice back.
      const ready = time >= readyAt;
      const lift = ready ? 0 : 3;
      for (let i = 0; i < 12; i++) {
        g.fillStyle(i % 2 ? IVORY : IVORY_SHADE, 1); g.fillRect(D.x - 32, D.y + 10 - i * 2.2 - lift, 64, 2.6);
      }
      card(g, D.x, D.y - 18 - lift, 64, 40, 0, { face: false });
      // The peek: stand close and the corner lifts — the next suit shows.
      const peeking = ready && !rule && alive(player) && dist(player.x, player.y, D.x, D.y) < PEEK_R;
      if (peeking) {
        g.fillStyle(IVORY, 1); g.fillTriangle(D.x + 32, D.y - 38, D.x + 32, D.y - 20, D.x + 16, D.y - 38);
        pip(g, D.x + 27, D.y - 33, 4.5, next, suitColor(next));
        glow(g, D.x + 26, D.y - 32, 14, LAMP_LIGHT, 0.06, 2);
      }
      // A cut: the top half lifts and slides off, the turned card spins up.
      const ck = (time - cutFx) / 650;
      if (ck >= 0 && ck < 1 && rule) {
        const side = cutBy === 'player' ? -1 : 1;
        card(g, D.x + side * ck * 70, D.y - 24 - Math.sin(ck * Math.PI) * 30, 64, 40, side * ck * 0.6, { face: false, alpha: 1 - ck });
      }
      // The rule card hangs over the table, spinning in, then turning slowly.
      if (rule && time < rule.until) {
        const k = clamp((time - rule.at) / 400, 0, 1);
        const y = D.y - 60 - k * 46 + Math.sin(time / 500) * 4;
        const sw = Math.abs(Math.cos((1 - k) * Math.PI * 2.5));
        glow(g, D.x, y, 40, suitColor(rule.suit) === CARD_RED ? CARD_RED : 0xd8d8f0, 0.06, 3);
        card(g, D.x, y, 40 * Math.max(0.12, sw), 56, Math.sin(time / 900) * 0.08, { face: k > 0.6, suit: rule.suit, rank: 1 });
      }
      // Blades of the cut half.
      for (const b of blades) card(g, b.x, b.y, 14, 20, b.ang, { face: true, suit: b.suit, rank: 1, cheap: true });
      // Spades: a dark notch over each fighter, a hit lands deeper.
      if (active('spade')) {
        for (const f of [player, npc]) if (alive(f)) pip(g, f.x, f.y - 50, 6, 'spade', 0x101018, 0.7 + Math.sin(time / 120) * 0.2);
      }
      for (const m of motes) {
        const k = (time - m.at) / 900;
        pip(g, m.x + Math.sin(k * 6) * 6, m.y - k * 34, 6 + k * 3, m.suit, m.suit === 'heart' ? lit(CARD_RED, 0.2) : m.suit === 'club' ? 0x101018 : 0x303040, 1 - k);
        if (m.suit === 'club') { g.lineStyle(2, 0xfff2b0, 1 - k); g.strokeCircle(m.x, m.y + 10, 14 + k * 10); }
      }
    },

    drawHud(g, time) {
      // A little card at the top of the table: the live suit and its time left.
      const x = W / 2, y = top + 18;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 70, y - 12, 140, 26, 8);
      if (rule && time < rule.until) {
        card(g, x - 52, y + 1, 14, 20, 0, { face: true, suit: rule.suit, rank: 1, cheap: true });
        const k = clamp((rule.until - time) / (rule.until - rule.at), 0, 1);
        g.fillStyle(BAIZE_LIT, 0.4); g.fillRoundedRect(x - 38, y - 3, 100, 8, 4);
        g.fillStyle(suitColor(rule.suit) === CARD_RED ? CARD_RED : 0xe8e8f0, 1); g.fillRoundedRect(x - 38, y - 3, Math.max(3, 100 * k), 8, 4);
      } else {
        card(g, x - 52, y + 1, 14, 20, 0, { face: false, cheap: true });
        const k = time >= readyAt ? 1 : 0.4;
        g.fillStyle(GILT, 0.5 * k); g.fillRoundedRect(x - 38, y - 3, 100, 8, 4);
      }
    },
  };
}

export const CUT_THE_DECK: GimmickDef = {
  id: 'card-cut-the-deck',
  rules: 'Strike the deck to cut: the turned suit rules both of you for 6s (♥ hits heal the striker, ♠ cut deeper, ♦ quick, ♣ stun). Stand close to peek at the next card.',
  make,
};
