import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { glow, lit, mixC } from '../../../../../art/IsleArt';
import { pip } from '../art';
import {
  CARD_BLACK, CARD_BLACK_LIT, CARD_RED, CARD_RED_DARK, CARD_RED_LIT, GILT, GILT_DARK, IVORY,
  MAHOGANY_DARK, TAROT_NIGHT,
} from '../palette';
import { alive, clamp, dist, shuffled, stepDt } from '../util';
import { fallenId } from '../../../../meteor/spec';
import { rankCard } from './deck';

/**
 * Shoot the Moon — Perdita Lisk, Hearts-Mistress of the Rail, who in the King's telling taught the
 * favourites' children hearts, and taught them that whoever is left holding the hearts pays.
 *
 * She leads a hand of seven: the six low hearts and the Black Lady, the queen of spades, in among
 * them. Each card is tossed high and comes down on a ringed spot; the fighter *nearest* it when it
 * lands takes it (if nobody is within reach, it falls dead). Every heart you hold makes you take
 * more harm, the Lady far more, and when the hand is done every heart is paid for — a cut for each,
 * a deep one for the Lady. So the plain game is to dodge them and leave her nearer.
 *
 * But take *all seven* — every heart and the Lady — and you shoot the moon: the whole hand turns
 * and flies at her, and she pays it all. She knows the trick too, and will dive in to spoil yours
 * (or run one of her own). Halfway down the cards come down two at a time.
 */

const ID = fallenId('card', 'moon');
const HAND = 7;
const LEAD_MS = 2300;
const LEAD_FAST_MS = 1700;
const FALL_MS = 1150;
const TAKE_R = 90;
const PER_HEART = 0.07;
const LADY = 0.25;
const PAY_HEART = 4;
const PAY_LADY = 14;
const MOON = 34;

interface Led { x: number; y: number; fromX: number; fromY: number; rank: number; lady: boolean; at: number; landAt: number; spin: number }
type Owner = 'player' | 'npc' | 'dead';
interface Taken { rank: number; lady: boolean; by: Owner; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk, rng } = ctx;
  let order: { rank: number; lady: boolean }[] = [];
  let led = 0;
  const falling: Led[] = [];
  let taken: Taken[] = [];
  let nextLead = 0;
  let scoreAt = 0;
  let started = false;
  let fast = false;
  let now = 0;
  let moonAt = -1e9;
  let moonBy: Fighter = player;

  const who = (o: Owner): Fighter | null => (o === 'player' ? player : o === 'npc' ? npc : null);
  const held = (o: Owner) => taken.filter((t) => t.by === o);
  const mult = (o: Owner) => 1 + held(o).reduce((s, t) => s + (t.lady ? LADY : PER_HEART), 0);
  const allIn = (o: Owner) => taken.length > 0 && taken.every((t) => t.by === o);

  function newHand(time: number): void {
    const hearts = [1, 2, 3, 4, 5, 6].map((rank) => ({ rank, lady: false }));
    order = shuffled(hearts, rng);
    order.splice(2 + Math.floor(rng() * 4), 0, { rank: 12, lady: true });
    led = 0;
    taken = [];
    nextLead = time + 900;
  }

  function lead(time: number): void {
    const c = order[led++];
    // Down between the two of you, leaning to one side or the other, with a little scatter.
    const k = 0.25 + rng() * 0.5;
    const x = clamp(player.x + (npc.x - player.x) * k + (rng() - 0.5) * 140, 60, W - 60);
    const y = clamp(player.y + (npc.y - player.y) * k + (rng() - 0.5) * 120, top + 50, H - 40);
    falling.push({ x, y, fromX: npc.x, fromY: npc.y - 30, rank: c.rank, lady: c.lady, at: time, landAt: time + tk.warn(FALL_MS), spin: rng() * 6 });
    ctx.sfx('whoosh');
  }

  function land(l: Led, time: number): void {
    const dp = alive(player) ? dist(player.x, player.y, l.x, l.y) : Infinity;
    const dn = alive(npc) ? dist(npc.x, npc.y, l.x, l.y) : Infinity;
    const best = Math.min(dp, dn);
    const by: Owner = best > TAKE_R ? 'dead' : dp <= dn ? 'player' : 'npc';
    taken.push({ rank: l.rank, lady: l.lady, by, at: time });
    ctx.sfx(by === 'dead' ? 'land' : l.lady ? 'curse-cast' : 'heartbeat');
    const f = who(by);
    if (f) ctx.flash(f.x, f.y, l.lady ? CARD_BLACK_LIT : CARD_RED_LIT);
  }

  function score(time: number): void {
    for (const o of ['player', 'npc'] as Owner[]) {
      const f = who(o);
      if (!f || !alive(f)) continue;
      if (held(o).length === HAND && allIn(o)) {
        const t = f === player ? npc : player;
        moonAt = time; moonBy = f;
        ctx.banner(f === player ? 'YOU SHOOT THE MOON' : 'SHE SHOOTS THE MOON', '#f7dc84');
        ctx.sfx('holy-chord');
        if (alive(t)) { ctx.hit(t, MOON, t.x, t.y); ctx.stun(t, 700); }
        return;
      }
    }
    for (const o of ['player', 'npc'] as Owner[]) {
      const f = who(o);
      if (!f || !alive(f)) continue;
      const pay = held(o).reduce((s, t) => s + (t.lady ? PAY_LADY : PAY_HEART), 0);
      if (pay > 0) { ctx.hit(f, pay, f.x, f.y); ctx.sfx('slash'); }
    }
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      now = time;
      if (!started) { started = true; newHand(time); ctx.banner('THE NEAREST TAKES EACH CARD — HEARTS HURT YOU — TAKE ALL SEVEN TO SHOOT THE MOON', '#ea5560'); }
      if (!fast && npc.hp < npc.maxHp * 0.5) { fast = true; ctx.banner('TWO AT A TIME', '#ea5560'); ctx.sfx('status-buff'); }
      if (led < HAND && time >= nextLead) {
        lead(time);
        if (fast && led < HAND) lead(time);
        nextLead = time + (fast ? LEAD_FAST_MS : LEAD_MS);
      }
      for (let i = falling.length - 1; i >= 0; i--) if (time >= falling[i].landAt) { land(falling[i], time); falling.splice(i, 1); }
      if (led >= HAND && !falling.length && taken.length >= HAND && !scoreAt) scoreAt = time + 700;
      if (scoreAt && time >= scoreAt) { score(time); scoreAt = 0; newHand(time + 900); }
    },

    playerTakenMult: () => mult('player'),
    npcTakenMult: () => mult('npc'),

    npcSeek() {
      if (!falling.length) return null;
      const yours = held('player').length, hers = held('npc').length;
      // Her own moon, or spoiling yours: dive for the card.
      const spoil = yours >= 3 && hers === 0 && taken.every((t) => t.by !== 'dead');
      const mine = hers >= 2 && yours === 0 && taken.every((t) => t.by === 'npc');
      let next = falling[0];
      for (const l of falling) if (l.landAt < next.landAt) next = l;
      if (spoil || mine) return { x: next.x, y: next.y };
      // Otherwise leave it to you: be farther from the spot than you are.
      const dn = dist(npc.x, npc.y, next.x, next.y), dp = dist(player.x, player.y, next.x, next.y);
      if (dn < TAKE_R + 30 && dn <= dp + 40) {
        const k = (TAKE_R + 120) / Math.max(1, dn);
        return { x: clamp(next.x + (npc.x - next.x) * k, 50, W - 50), y: clamp(next.y + (npc.y - next.y) * k, top + 50, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      for (const l of falling) {
        const k = clamp((time - l.at) / (l.landAt - l.at), 0, 1);
        // The reach ring (nearest within it takes the card), and the shadow growing as it falls.
        const col = l.lady ? CARD_BLACK_LIT : CARD_RED;
        g.fillStyle(col, 0.06 + k * 0.06); g.fillCircle(l.x, l.y, TAKE_R);
        g.lineStyle(1.5, l.lady ? 0x8a8a9a : CARD_RED_LIT, 0.35 + k * 0.4); g.strokeCircle(l.x, l.y, TAKE_R);
        g.lineStyle(2.5, l.lady ? 0xb0b0c0 : CARD_RED_LIT, 0.8); g.beginPath(); g.arc(l.x, l.y, TAKE_R - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        g.fillStyle(0x000000, 0.12 + k * 0.25); g.fillEllipse(l.x, l.y + 4, 10 + k * 22, 4 + k * 8);
        // A line to whoever is nearest right now.
        const dp = alive(player) ? dist(player.x, player.y, l.x, l.y) : Infinity, dn = alive(npc) ? dist(npc.x, npc.y, l.x, l.y) : Infinity;
        const f = dp <= dn ? player : npc;
        if (Math.min(dp, dn) <= TAKE_R) {
          g.lineStyle(1.5, col, 0.25 + k * 0.5);
          for (let s = 0; s < 10; s += 2) g.lineBetween(l.x + (f.x - l.x) * s / 10, l.y + (f.y - l.y) * s / 10, l.x + (f.x - l.x) * (s + 1) / 10, l.y + (f.y - l.y) * (s + 1) / 10);
        }
      }
      // The moon going off: a pale disc swelling over whoever shot it.
      const mk = (time - moonAt) / 900;
      if (mk >= 0 && mk < 1 && alive(moonBy)) { glow(g, moonBy.x, moonBy.y, 60 + mk * 160, 0xfff4d0, 0.1 * (1 - mk), 4); }
    },

    drawAir(g, time) {
      for (const l of falling) {
        const k = clamp((time - l.at) / (l.landAt - l.at), 0, 1);
        const x = l.fromX + (l.x - l.fromX) * k, y = l.fromY + (l.y - l.fromY) * k - Math.sin(k * Math.PI) * 140;
        const flip = Math.cos(time / 90 + l.spin);
        if (l.lady) glow(g, x, y, 26, TAROT_NIGHT, 0.2, 3); else glow(g, x, y, 20, CARD_RED_LIT, 0.1, 2);
        rankCard(g, x, y, 26 * Math.max(0.15, Math.abs(flip)), 36, l.spin + k * 2, l.rank, l.lady ? 'spade' : 'heart');
      }
      // The hearts each fighter holds, pinned in a ring round them like a corsage; the Lady in black.
      for (const o of ['player', 'npc'] as Owner[]) {
        const f = who(o);
        if (!f || !alive(f)) continue;
        const h = held(o);
        h.forEach((t, i) => {
          const a = time / 900 + (i / Math.max(1, h.length)) * Math.PI * 2;
          const x = f.x + Math.cos(a) * 30, y = f.y - 10 + Math.sin(a) * 14;
          const pop = clamp(1 - (time - t.at) / 300, 0, 1);
          if (t.lady) { g.fillStyle(IVORY, 1); g.fillRoundedRect(x - 6, y - 8, 12, 16, 2); pip(g, x, y, 5 + pop * 3, 'spade', CARD_BLACK); g.fillStyle(GILT, 1); g.fillTriangle(x - 3, y - 7, x + 3, y - 7, x, y - 10); }
          else { pip(g, x, y + 1, 5.5 + pop * 3, 'heart', CARD_RED_DARK); pip(g, x, y, 4.6 + pop * 3, 'heart', CARD_RED_LIT); }
        });
      }
      // The moon burst: the hand's cards streaming off the shooter at the other.
      const mk = (time - moonAt) / 520;
      if (mk >= 0 && mk < 1) {
        const t = moonBy === player ? npc : player;
        if (alive(t)) for (let i = 0; i < HAND; i++) {
          const s = (i - 3) * 0.35, x = moonBy.x + (t.x - moonBy.x) * mk + Math.sin(mk * Math.PI) * s * 70, y = moonBy.y + (t.y - moonBy.y) * mk - Math.sin(mk * Math.PI) * 50;
          rankCard(g, x, y, 16, 22, mk * 8 + i, i === 3 ? 12 : 1 + (i % 6), i === 3 ? 'spade' : 'heart');
        }
      }
    },

    drawHud(g) {
      // The trick rail: seven slots edged in who took each; the moon fills while one side holds all.
      const sw = 26, x0 = W / 2 - (HAND * (sw + 6)) / 2 - 24, y0 = top + 8;
      g.fillStyle(MAHOGANY_DARK, 0.9); g.fillRoundedRect(x0 - 8, y0 - 4, HAND * (sw + 6) + 60, 44, 6);
      g.lineStyle(1.5, GILT_DARK, 1); g.strokeRoundedRect(x0 - 8, y0 - 4, HAND * (sw + 6) + 60, 44, 6);
      for (let i = 0; i < HAND; i++) {
        const x = x0 + i * (sw + 6) + sw / 2, y = y0 + 18;
        const t = taken[i];
        if (!t) { g.fillStyle(0x140906, 0.8); g.fillRoundedRect(x - sw / 2 + 2, y - 15, sw - 4, 30, 3); continue; }
        const edge = t.by === 'player' ? 0xffffff : t.by === 'npc' ? CARD_RED_LIT : 0x404048;
        g.fillStyle(edge, 1); g.fillRoundedRect(x - sw / 2, y - 17, sw, 34, 3);
        rankCard(g, x, y, sw - 6, 28, 0, t.rank, t.lady ? 'spade' : 'heart', t.by === 'dead' ? 0.35 : 1);
      }
      // The moon: a pale disc, its lit part how far one side is toward taking every card.
      const mx = x0 + HAND * (sw + 6) + 26, my = y0 + 18;
      const p = held('player').length, n = held('npc').length;
      const run = allIn('player') ? p : allIn('npc') ? n : 0;
      const col = allIn('npc') ? CARD_RED_LIT : 0xfff4d0;
      g.fillStyle(TAROT_NIGHT, 1); g.fillCircle(mx, my, 14);
      g.fillStyle(mixC(TAROT_NIGHT, col, 0.9), 1);
      g.slice(mx, my, 13, -Math.PI / 2, -Math.PI / 2 + (run / HAND) * Math.PI * 2, false); g.fillPath();
      g.lineStyle(1, lit(GILT, 0.3), 0.9); g.strokeCircle(mx, my, 14);
    },
  };
}

export const FALLEN_MOON: GimmickDef = {
  id: ID,
  rules: 'Each card she tosses goes to the nearest fighter; hearts make you take more, then cut. Take all seven, the Lady too, to shoot the moon.',
  make,
};

