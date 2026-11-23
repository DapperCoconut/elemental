import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { glow } from '../../../../../art/IsleArt';
import { coin, coinFlat, ledgerCard } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, CARD_RED, GOLD, GOLD_DARK, GOLD_LIT, INK_GREEN, IRON, IRON_DARK, IRON_LIT, STEEL_LIT } from '../palette';
import { alive, clamp, stepDt } from '../util';

/**
 * Interest — Banker Compound.
 *
 * In Compound's counting-house no blow is paid in full. Only a third of any hit lands; the rest
 * is *lent*, written up on a ledger card over the head of whoever it is owed by, and it grows —
 * compound interest, ticking up every second. When the bank's bell rings, every ledger is called
 * and lands at once as a lump. A big enough lump is a foreclosure: it knocks its debtor flat.
 *
 * The strongbox in the middle of the room calls in the striker's loans early. That is the whole
 * game: let a loan ripen, then call it the moment the foe is cornered, or stunned, or about to
 * call theirs. Compound is a patient man; he calls at the bell unless he sees you nearly bust.
 */

/** Share of every blow that lands at once. */
const PAID_NOW = 0.34;
/** Interest per second, compounding. */
const RATE = 0.075;
const BELL_MS = 9000;
const CAP = 90;
const FORECLOSE = 24;
const FORECLOSE_STUN = 900;

interface Ledger { owed: number; since: number; flashAt: number; lastLump: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  /** Keyed by the DEBTOR: what will land on them. */
  const ledgers = new Map<Fighter, Ledger>([[player, { owed: 0, since: 0, flashAt: -9999, lastLump: 0 }], [npc, { owed: 0, since: 0, flashAt: -9999, lastLump: 0 }]]);
  const BOX = { x: W / 2, y: (top + H) / 2 + 20 };
  let bellAt = 0;
  let boxStruckAt = -9999;
  const lockUntil = new Map<string, number>([['player', 0], ['npc', 0]]);
  let paying = false;
  let started = false;
  const coinsFlying: { x: number; y: number; tx: number; ty: number; at: number }[] = [];

  function lend(debtor: Fighter, landed: number): void {
    if (paying || landed <= 0) return;
    const l = ledgers.get(debtor);
    if (!l) return;
    const full = landed / PAID_NOW;
    l.owed = Math.min(CAP, l.owed + full * (1 - PAID_NOW));
  }

  /** Land a debtor's ledger as one blow. */
  function call(debtor: Fighter, why: string, time: number): void {
    const l = ledgers.get(debtor);
    if (!l || l.owed < 1 || !alive(debtor)) return;
    const lump = Math.round(l.owed);
    l.owed = 0;
    l.flashAt = time;
    l.lastLump = lump;
    paying = true;
    // Undo this gimmick's own discount so the lump lands whole.
    try { ctx.hit(debtor, lump / PAID_NOW, debtor.x, debtor.y - 30); } finally { paying = false; }
    ctx.float(debtor.x, debtor.y - 70, `${why} −${lump}`, '#ffe27a');
    if (lump >= FORECLOSE) {
      ctx.stun(debtor, FORECLOSE_STUN);
      ctx.float(debtor.x, debtor.y - 92, 'FORECLOSED', '#ff8a8a');
      ctx.sfx('gravity-slam');
    } else ctx.sfx('money');
    for (let i = 0; i < 6; i++) coinsFlying.push({ x: BOX.x, y: BOX.y - 40, tx: debtor.x + (i - 2.5) * 8, ty: debtor.y - 20, at: time + i * 40 });
  }

  const box: StrikeTarget = ctx.target({
    x: BOX.x, y: BOX.y - 24, r: 34, passThrough: true,
    onStruck: (by) => {
      const now = ctx.scene.time.now;
      if (now < (lockUntil.get(by) ?? 0)) return;
      lockUntil.set(by, now + 1500);
      boxStruckAt = now;
      // The striker's loans are the ones on the OTHER fighter's card.
      call(by === 'player' ? npc : player, 'CALLED IN', now);
      ctx.sfx('clang');
    },
  });

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        bellAt = time + BELL_MS;
        ctx.banner('EVERY BLOW IS A LOAN', '#ffe27a');
      }
      for (const l of ledgers.values()) {
        if (l.owed > 0) l.owed = Math.min(CAP, l.owed * (1 + RATE * dt));
      }
      if (time >= bellAt) {
        bellAt = time + (ctx.hard ? BELL_MS - 1500 : BELL_MS);
        ctx.banner('THE BELL — ALL LOANS CALLED', '#ffe27a');
        ctx.sfx('holy-chord');
        call(player, 'BELL', time);
        call(npc, 'BELL', time);
      } else if (bellAt - time < 1000 && Math.floor((bellAt - time) / 250) !== Math.floor((bellAt - time + dt * 1000) / 250)) {
        ctx.sfx('countdown-tick');
      }
      for (let i = coinsFlying.length - 1; i >= 0; i--) if (time - coinsFlying[i].at > 500) coinsFlying.splice(i, 1);
    },

    npcSeek() {
      const yours = ledgers.get(player);
      const his = ledgers.get(npc);
      if (!yours || !his) return null;
      const now = ctx.scene.time.now;
      const wantCall = now >= (lockUntil.get('npc') ?? 0) && (yours.owed >= player.hp || yours.owed >= FORECLOSE + 6 || (bellAt - now > 4000 && yours.owed > his.owed + 14));
      if (wantCall) {
        const a = Math.atan2(npc.y - BOX.y, npc.x - BOX.x);
        return { x: BOX.x + Math.cos(a) * 60, y: BOX.y + Math.sin(a) * 50 };
      }
      // Keep the strongbox between you and him when his own card runs high.
      if (his.owed > yours.owed + 10) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return { x: clamp(BOX.x + Math.cos(a) * 220, 60, W - 60), y: clamp(BOX.y + Math.sin(a) * 180, top + 50, H - 50) };
      }
      return null;
    },

    playerTakenMult: () => PAID_NOW,
    npcTakenMult: () => PAID_NOW,
    onPlayerHurt(amount) { lend(player, amount); },
    onNpcHurt(amount) { lend(npc, amount); },

    drawGround(g, time) {
      // The counting-house floor round the strongbox: a ring of brass inlay, the bell's clock.
      const k = clamp(1 - (bellAt - time) / BELL_MS, 0, 1);
      g.lineStyle(3, BRASS_DARK, 0.6); g.strokeEllipse(BOX.x, BOX.y, 220, 130);
      g.lineStyle(5, GOLD, 0.55);
      g.beginPath(); g.arc(BOX.x, BOX.y, 104, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        g.fillStyle(BRASS, 0.7); g.fillCircle(BOX.x + Math.cos(a) * 104, BOX.y + Math.sin(a) * 104, 2.5);
      }
      // The strongbox: iron-bound, riveted, its lid ajar on a strike.
      const struck = time - boxStruckAt < 300 ? 1 - (time - boxStruckAt) / 300 : 0;
      g.fillStyle(0x000000, 0.3); g.fillEllipse(BOX.x, BOX.y + 4, 90, 22);
      g.fillStyle(IRON_DARK, 1); g.fillRect(BOX.x - 38, BOX.y - 44, 76, 46);
      g.fillStyle(IRON, 1); g.fillRect(BOX.x - 36, BOX.y - 42, 72, 40);
      g.fillStyle(IRON_LIT, 0.5); g.fillRect(BOX.x - 36, BOX.y - 42, 72, 4);
      for (const bx of [-24, 0, 24]) { g.fillStyle(BRASS_DARK, 1); g.fillRect(BOX.x + bx - 3, BOX.y - 44, 6, 46); }
      for (let i = 0; i < 8; i++) { g.fillStyle(BRASS_LIT, 1); g.fillCircle(BOX.x - 32 + i * 9, BOX.y - 38, 1.4); }
      g.fillStyle(IRON_DARK, 1); g.fillRect(BOX.x - 40, BOX.y - 52 - struck * 10, 80, 10);
      g.fillStyle(IRON_LIT, 1); g.fillRect(BOX.x - 40, BOX.y - 52 - struck * 10, 80, 3);
      if (struck > 0) { glow(g, BOX.x, BOX.y - 46, 40, GOLD_LIT, 0.12 * struck, 3); for (let i = 0; i < 5; i++) coinFlat(g, BOX.x - 24 + i * 12, BOX.y - 46, 4); }
      // Keyhole and a dial.
      g.fillStyle(BRASS, 1); g.fillCircle(BOX.x, BOX.y - 22, 7);
      g.fillStyle(IRON_DARK, 1); g.fillCircle(BOX.x, BOX.y - 24, 2); g.fillRect(BOX.x - 1, BOX.y - 23, 2, 6);
    },

    drawAir(g, time) {
      for (const [f, l] of ledgers) {
        if (!alive(f)) continue;
        const x = f.x - 26, y = f.y - 96;
        const flash = time - l.flashAt < 600 ? 1 - (time - l.flashAt) / 600 : 0;
        if (l.owed < 1 && flash <= 0) continue;
        ledgerCard(g, x, y, 52, 28);
        // Owed: a bar of gold ink that fills toward the cap, red past foreclosure.
        const fw = (l.owed / CAP) * 40;
        g.fillStyle(l.owed >= FORECLOSE ? CARD_RED : INK_GREEN, 0.9); g.fillRect(x + 10, y + 16, Math.max(1, fw), 5);
        g.lineStyle(1, CARD_RED, 0.8); g.lineBetween(x + 10 + (FORECLOSE / CAP) * 40, y + 13, x + 10 + (FORECLOSE / CAP) * 40, y + 24);
        // Tally of whole tens.
        for (let i = 0; i < Math.floor(l.owed / 10); i++) { g.fillStyle(INK_GREEN, 1); g.fillRect(x + 11 + i * 4, y + 6, 1.5, 7); }
        // A coin bobbing on the card's corner, spinning faster as it grows.
        coin(g, x + 50, y + 2, 6, 'gold', Math.cos(time / (240 - Math.min(200, l.owed * 2))), 'head');
        if (flash > 0) { g.lineStyle(3, GOLD_LIT, flash); g.strokeRect(x - 4 * (1 - flash), y - 4 * (1 - flash), 52 + 8 * (1 - flash), 28 + 8 * (1 - flash)); }
      }
      // Paid-out coins arc from the strongbox onto the debtor.
      for (const c of coinsFlying) {
        const k = clamp((time - c.at) / 500, 0, 1);
        if (k <= 0) continue;
        const x = c.x + (c.tx - c.x) * k, y = c.y + (c.ty - c.y) * k - Math.sin(k * Math.PI) * 60;
        coin(g, x, y, 5, 'gold', Math.cos(time / 30 + c.tx), 'head');
      }
    },

    drawHud(g, time) {
      // The bell: a little brass bell at the top centre with the seconds left as a ring.
      const x = W / 2, y = top + 18;
      const k = clamp((bellAt - time) / BELL_MS, 0, 1);
      g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 17);
      g.lineStyle(3, k < 0.15 ? CARD_RED : GOLD, 0.95);
      g.beginPath(); g.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      const sway = k < 0.12 ? Math.sin(time / 40) * 0.3 : 0;
      g.fillStyle(BRASS, 1);
      g.fillTriangle(x - 8 + sway * 10, y + 7, x + 8 + sway * 10, y + 7, x + sway * 4, y - 9);
      g.fillStyle(BRASS_LIT, 1); g.fillCircle(x + sway * 4, y - 9, 2.5);
      g.fillStyle(GOLD_DARK, 1); g.fillCircle(x + sway * 12, y + 8, 2.4);
      g.fillStyle(STEEL_LIT, 0.5); g.fillRect(x - 6 + sway * 10, y + 1, 3, 4);
    },

    destroy() { box.remove(); },
  };
}

export const INTEREST: GimmickDef = {
  id: 'treasury-interest',
  rules: 'Only a third of each blow lands — the rest is a loan that grows with interest and falls at the bell. Strike the strongbox to call in your loans early.',
  make,
};
