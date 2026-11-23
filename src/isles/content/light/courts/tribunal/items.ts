import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { scalesEmblem } from './art';
import { GOLD, GOLD_DARK, GOLD_LIT, INK, PARCH, PARCH_DARK, SIDE_YOU, SUN, SUN_HOT, WAX } from './palette';
import { alive, asSlot, clamp, dist, type Slot } from './util';

/**
 * The Tribunal Court's goods: Ottilie Brief's four charms (the instruments of a trial, each one
 * playing a rule of the court in your favour), Prince Verdict's balance, and the Fountain of
 * Testimony's two fish. Scripts are registered below under their item ids.
 */

const ISLE = 'light';

export const CHARM_AFFIDAVIT = 'tribunal-charm-affidavit';
export const CHARM_TOKEN = 'tribunal-charm-juror-token';
export const CHARM_QUILL = 'tribunal-charm-objection-quill';
export const CHARM_RIBBON = 'tribunal-charm-oath-ribbon';
export const ART_VERDICT = 'art-verdict';

export const FISH_GAR = 'fish-gavel-gar';
export const FISH_BARBEL = 'fish-bail-barbel';
export const FISHERY = 'tribunal-fountain';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Sealed Affidavit ─────────────────────────────────────────────────
// Every hit you take is entered in evidence (three entries). With three entered, your next hit
// reads the evidence back: 40% of the three hits, struck on the foe (at most 24).

const affidavit: ItemScriptFactory = (ctx) => {
  const entries: number[] = [];
  let readAt = -9999;
  return {
    onHitTaken(amount) {
      if (amount < 1 || entries.length >= 3) return;
      entries.push(amount);
      ctx.float(ctx.player.x, ctx.player.y - 50, `ENTERED IN EVIDENCE (${entries.length}/3)`, '#f2e6c4');
    },
    onHitDealt(amount) {
      if (amount < 1 || entries.length < 3 || !foeLive(ctx)) return;
      const sum = entries.reduce((a, b) => a + b, 0);
      entries.length = 0;
      readAt = ctx.scene.time.now;
      ctx.hit(ctx.npc, Math.min(24, Math.round(sum * 0.4)), ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.npc.x, ctx.npc.y - 56, 'THE EVIDENCE IS READ', '#ffd860');
      ctx.sfx('judgement');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // A folded affidavit at the shoulder with a seal for each entry.
      const x = p.x - 30, y = p.y - 34;
      g.fillStyle(PARCH_DARK, 1); g.fillRect(x - 8, y - 6, 16, 12);
      g.fillStyle(PARCH, 1); g.fillRect(x - 7, y - 7, 14, 11);
      g.lineStyle(1, INK, 0.6); g.lineBetween(x - 5, y - 4, x + 5, y - 4); g.lineBetween(x - 5, y - 1, x + 3, y - 1);
      for (let i = 0; i < 3; i++) { g.fillStyle(i < entries.length ? WAX : 0x8a8478, 1); g.fillCircle(x - 6 + i * 6, y + 6, 2.4); }
      if (entries.length >= 3) glow(g, x, y, 14, WAX, 0.06 + Math.sin(time / 120) * 0.03, 2);
      const k = clamp((time - readAt) / 500, 0, 1);
      if (k < 1 && foeLive(ctx)) { g.lineStyle(3 * (1 - k), GOLD_LIT, 1 - k); g.strokeCircle(ctx.npc.x, ctx.npc.y - 10, 20 + k * 30); }
    },
  };
};

// ── Twelfth Juror's Token ────────────────────────────────────────────
// Every hit you land from range (over 280px) wins a juror. Every 10s the token reads its verdict:
// with seven or more jurors, heal 8 and deal +25% for 3s. Then the box clears.

const jurorToken: ItemScriptFactory = (ctx) => {
  let jurors = 0;
  let lastWin = -9999;
  let next = -1;
  let verdictAt = -9999;
  return {
    update(time) {
      if (next < 0) next = time + 10000;
      if (time < next) return;
      next = time + 10000;
      if (!live(ctx)) return;
      verdictAt = time;
      if (jurors >= 7) {
        ctx.heal(ctx.player, 8);
        ctx.boostDamage(1.25, 3000);
        ctx.float(ctx.player.x, ctx.player.y - 56, `VERDICT FOR YOU (${jurors})`, '#ffd860');
        ctx.sfx('holy-chord');
      } else if (jurors > 0) ctx.float(ctx.player.x, ctx.player.y - 56, `A HUNG JURY (${jurors})`, '#f4f0e6');
      jurors = 0;
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || jurors >= 12 || now - lastWin < 600 || !foeLive(ctx)) return;
      if (dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < 280) return;
      jurors++;
      lastWin = now;
      ctx.sfx('sparkle');
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // Twelve little seats round your feet, gold for each juror won.
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const on = i < jurors;
        g.fillStyle(on ? (jurors >= 7 ? GOLD_LIT : SIDE_YOU) : 0x6a6660, on ? 0.9 : 0.35);
        g.fillCircle(p.x + Math.cos(a) * 30, p.y + 4 + Math.sin(a) * 12, on ? 2.6 : 1.8);
      }
      const k = clamp((time - verdictAt) / 600, 0, 1);
      if (k < 1) { g.lineStyle(2 * (1 - k), GOLD, 1 - k); g.strokeEllipse(p.x, p.y + 4, 60 + k * 50, 24 + k * 20); }
    },
  };
};

// ── Objection Quill ──────────────────────────────────────────────────
// When you are hit, you have 0.8s to object: a cast in that window is sustained — 1.5s off its
// cooldown and the foe takes 7. At most once every 4s.

const objectionQuill: ItemScriptFactory = (ctx) => {
  let openUntil = 0;
  let readyAt = 0;
  let sustainedAt = -9999;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 1 || now < readyAt) return;
      openUntil = now + 800;
    },
    onCast(abilityId) {
      const now = ctx.scene.time.now;
      if (now >= openUntil || !live(ctx)) return;
      openUntil = 0;
      readyAt = now + 4000;
      sustainedAt = now;
      ctx.refund(abilityId, 1500);
      if (foeLive(ctx)) ctx.hit(ctx.npc, 7, ctx.npc.x, ctx.npc.y - 20);
      ctx.float(ctx.player.x, ctx.player.y - 56, 'OBJECTION — SUSTAINED', '#ffd860');
      ctx.sfx('snap-back');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const open = time < openUntil;
      const x = p.x + 24, y = p.y - 42;
      // A white quill, upright and glowing while the floor is yours.
      if (open) glow(g, x, y, 16, SUN, 0.1, 2);
      g.lineStyle(1.5, INK, 1); g.lineBetween(x - 2, y + 10, x + 4, y - 12);
      g.fillStyle(open ? 0xffffff : PARCH, open ? 1 : 0.7);
      g.fillTriangle(x + 4, y - 12, x - 4, y + 2, x + 2, y + 4);
      g.fillTriangle(x + 4, y - 12, x + 8, y - 2, x + 2, y + 4);
      if (open) { const k = clamp((openUntil - time) / 800, 0, 1); g.lineStyle(2, GOLD_LIT, 0.9); g.beginPath(); g.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath(); }
      const s = clamp((time - sustainedAt) / 500, 0, 1);
      if (s < 1) { g.lineStyle(3 * (1 - s), GOLD, 1 - s); g.strokeCircle(x, y, 10 + s * 30); }
    },
  };
};

// ── Oath Ribbon ──────────────────────────────────────────────────────
// Every 14s you swear not to cast one of your keys (E, R or F) for 8s. Keep the oath: heal 10
// and deal +30% for 2.5s. Break it and the ribbon simply goes slack until the next oath.

const RIBBON_COLORS: Record<'e' | 'r' | 'f', number> = { e: 0xd8344a, r: 0x3a6ad8, f: 0x3aa860 };

const oathRibbon: ItemScriptFactory = (ctx) => {
  let next = -1;
  let sworn: 'e' | 'r' | 'f' | null = null;
  let until = 0;
  let keptAt = -9999;
  let brokeAt = -9999;
  return {
    update(time) {
      if (next < 0) next = time + 3000;
      if (sworn && time >= until) {
        sworn = null;
        if (live(ctx)) {
          keptAt = time;
          ctx.heal(ctx.player, 10);
          ctx.boostDamage(1.3, 2500);
          ctx.float(ctx.player.x, ctx.player.y - 56, 'OATH KEPT', '#fff0a8');
          ctx.sfx('holy-chord');
        }
      }
      if (!sworn && time >= next) {
        next = time + 14000;
        const keys = ['e', 'r', 'f'] as const;
        sworn = keys[Math.floor(ctx.rng() * 3)];
        until = time + 8000;
        if (live(ctx)) ctx.float(ctx.player.x, ctx.player.y - 60, `SWORN: NOT YOUR ${sworn.toUpperCase()}`, '#f2e6c4');
      }
    },
    onCast(abilityId, slot) {
      if (!sworn) return;
      const s: Slot | null = asSlot(slot) ?? asSlot(ctx.slotOf(abilityId));
      if (s !== sworn) return;
      sworn = null;
      brokeAt = ctx.scene.time.now;
      ctx.float(ctx.player.x, ctx.player.y - 56, 'OATH BROKEN', '#b8b0a0');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 22, y = p.y - 40;
      const c = sworn ? RIBBON_COLORS[sworn] : 0x8a8478;
      const slack = time - brokeAt < 1200 || !sworn;
      // A rosette with two tails; taut and fluttering while sworn, drooping when not.
      for (const k of [-1, 1]) {
        const wav = sworn ? Math.sin(time / 120 + k) * 2 : 0;
        g.fillStyle(c, 0.95);
        g.fillTriangle(x - 2 * k, y, x + 2 * k, y, x + k * (slack ? 3 : 7) + wav, y + (slack ? 16 : 13));
      }
      g.fillStyle(GOLD_DARK, 1); g.fillCircle(x, y, 6);
      g.fillStyle(c, 1); g.fillCircle(x, y, 4.5);
      g.fillStyle(GOLD_LIT, 1); g.fillCircle(x, y, 1.6);
      if (sworn) { const k = clamp((until - time) / 8000, 0, 1); g.lineStyle(1.5, GOLD, 0.9); g.beginPath(); g.arc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath(); }
      const kk = clamp((time - keptAt) / 600, 0, 1);
      if (kk < 1) glow(g, x, y, 14 + kk * 20, GOLD_LIT, 0.1 * (1 - kk), 2);
    },
  };
};

// ── Verdict's Balance (artifact) ─────────────────────────────────────
// A little gilt balance rides at your shoulder and weighs every 6s what you dealt against what you
// took. If you took more, the scales tip and the difference is struck on the foe (at most 22).
// If you dealt more, a third of the difference heals you (at most 10).

const verdictBalance: ItemScriptFactory = (ctx) => {
  let dealt = 0, taken = 0;
  let next = -1;
  let tipAt = -9999;
  let tipSide = 0;
  return {
    update(time) {
      if (next < 0) next = time + 6000;
      if (time < next) return;
      next = time + 6000;
      if (!live(ctx)) { dealt = 0; taken = 0; return; }
      tipAt = time;
      if (taken > dealt && foeLive(ctx)) {
        const n = Math.min(22, Math.round(taken - dealt));
        tipSide = 1;
        if (n >= 1) {
          ctx.hit(ctx.npc, n, ctx.npc.x, ctx.npc.y - 20);
          ctx.flash(ctx.npc.x, ctx.npc.y - 20, GOLD_LIT);
          ctx.float(ctx.npc.x, ctx.npc.y - 58, 'THE SCALES TIP', '#ffd860');
          ctx.sfx('judgement');
        }
      } else if (dealt > taken) {
        const n = Math.min(10, Math.round((dealt - taken) / 3));
        tipSide = -1;
        if (n >= 1) { ctx.heal(ctx.player, n); ctx.float(ctx.player.x, ctx.player.y - 58, 'IN THE BALANCE', '#fff0a8'); }
      } else tipSide = 0;
      dealt = 0; taken = 0;
    },
    onHitDealt(amount) { dealt += amount; },
    onHitTaken(amount) { taken += amount; },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 30, y = p.y - 40;
      const lean = clamp((taken - dealt) / 40, -1, 1) * 0.4;
      const k = clamp((time - tipAt) / 700, 0, 1);
      const tilt = k < 1 ? tipSide * 0.6 * (1 - k) : lean;
      if (k < 1 && tipSide) glow(g, x, y, 18, SUN_HOT, 0.1 * (1 - k), 2);
      scalesEmblem(g, x, y, 10, GOLD, 1, tilt);
    },
  };
};

export const TRIBUNAL_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_AFFIDAVIT, name: 'Sealed Affidavit', emoji: '📜', kind: 'charm', price: 460, isle: ISLE,
    flavor: 'A sworn statement folded in three under a red seal. Nobody ever reads these. You will make them.',
    script: CHARM_AFFIDAVIT,
    scriptText: [
      'Each hit you take is entered in evidence, up to three.',
      'With three entered, your next hit reads them back: 40% of their total is struck on the foe (max 24).',
    ],
  },
  {
    id: CHARM_TOKEN, name: 'Twelfth Juror\'s Token', emoji: '🎖️', kind: 'charm', price: 640, isle: ISLE,
    flavor: 'A brass seat-token from the jury box, number twelve. The seat it belongs to has been empty for years.',
    script: CHARM_TOKEN,
    scriptText: [
      'Every hit you land from over 280px away wins a juror (up to 12).',
      'Every 10s the verdict: with 7 or more jurors, heal 8 and deal +25% for 3s. Then the box clears.',
    ],
  },
  {
    id: CHARM_QUILL, name: 'Objection Quill', emoji: '🪶', kind: 'charm', price: 860, isle: ISLE,
    flavor: 'Rebuttal\'s spare quill, trimmed sharp. He objected to losing it. Overruled.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_QUILL,
    scriptText: [
      'When you are hit, you have 0.8s to object: a cast in that window is sustained.',
      'A sustained cast gets 1.5s back off its cooldown and strikes the foe for 7. Once every 4s.',
    ],
  },
  {
    id: CHARM_RIBBON, name: 'Oath Ribbon', emoji: '🎀', kind: 'charm', price: 1100, isle: ISLE,
    flavor: 'A rosette of witness ribbon from the Fountain. Vow pins one on everyone she swears. This one was kept.',
    effect: { maxHp: 8 },
    script: CHARM_RIBBON,
    scriptText: [
      'Every 14s you swear not to cast one key — E, R or F — for 8s (the ribbon shows which).',
      'Keep the oath: heal 10 and deal +30% for 2.5s. Break it and nothing happens but the ribbon going slack.',
    ],
  },
  {
    id: ART_VERDICT, name: 'Verdict\'s Balance', emoji: '⚖️', kind: 'artifact', isle: ISLE,
    flavor: 'The little gilt balance from the Prince\'s bench. It has never once hung level. It does now, sometimes.',
    effect: { maxHp: 15 },
    script: ART_VERDICT,
    scriptText: [
      'Every 6s the balance weighs the damage you dealt against the damage you took.',
      'Took more: the difference is struck on the foe (max 22). Dealt more: heal a third of it (max 10).',
    ],
  },
  {
    id: FISH_BARBEL, name: 'Bail Barbel', emoji: '🐟', kind: 'fish', sell: 26, isle: ISLE,
    flavor: 'A whiskery bottom-feeder from the Fountain. A clerk\'s slip once wrote bail as "barbel". It stuck.',
    effect: { shieldHp: 4 },
  },
  {
    id: FISH_GAR, name: 'Gavel Gar', emoji: '🐡', kind: 'fish', sell: 44, isle: ISLE,
    flavor: 'Long and armoured, with a blunt hammer of a head it knocks on the basin rim. The ushers say: order.',
    effect: { damageMult: 1.03 },
  },
];

export const TRIBUNAL_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_AFFIDAVIT]: affidavit,
  [CHARM_TOKEN]: jurorToken,
  [CHARM_QUILL]: objectionQuill,
  [CHARM_RIBBON]: oathRibbon,
  [ART_VERDICT]: verdictBalance,
};

export const TRIBUNAL_SHOPS: ShopDef[] = [
  { id: 'tribunal-shop', name: 'Brief\'s Notary & Seals', stock: [CHARM_AFFIDAVIT, CHARM_TOKEN, CHARM_QUILL, CHARM_RIBBON], buys: true },
];

export const TRIBUNAL_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Fountain of Testimony', kind: 'pond' }];

export const TRIBUNAL_FISH: FishDef[] = [
  { id: FISH_BARBEL, fisheries: [FISHERY], weight: 6, fight: 3, size: [18, 44] },
  { id: FISH_GAR, fisheries: [FISHERY], weight: 2, fight: 4, size: [40, 96] },
];
