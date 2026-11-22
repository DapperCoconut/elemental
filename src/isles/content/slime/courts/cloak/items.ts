import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { letter, mask, nail } from './art';
import { BRASS, BRASS_DARK, BRASS_LIT, LAMP, MASK_BLACK, MASK_GOLD, WAX, WAX_DARK, WAX_LIT } from './palette';
import { alive, clamp, dist, wrapAngle } from './util';

/**
 * The Cloak Court's goods: Hesper Latch's four charms (each a tool of the listening trade turned
 * the other way), Prince Whisper's unsent letter, and the cistern's three fish. Scripts are
 * registered below under their item ids.
 */

const ISLE = 'slime';

export const CHARM_LANTERN = 'cloak-charm-dark-lantern';
export const CHARM_SIGNET = 'cloak-charm-signet';
export const CHARM_DOMINO = 'cloak-charm-domino';
export const CHARM_TRUMPET = 'cloak-charm-ear-trumpet';
export const ART_WHISPER = 'art-whisper';

export const FISH_CARP = 'fish-cipher-carp';
export const FISH_MINNOW = 'fish-masked-minnow';
export const FISH_EEL = 'fish-eavesdrop-eel';
export const FISHERY = 'cloak-cistern';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Informer's Dark Lantern ──────────────────────────────────────────
// A bullseye beam turns slowly round you, once every 6s. Every 3rd hit you land while the foe
// stands in the beam reports them: 0.9s later a quarrel drops where they stood, for 16.

const lantern: ItemScriptFactory = (ctx) => {
  const PERIOD = 6000, HALF = 0.42, RANGE = 360;
  let hits = 0;
  let bolt: { x: number; y: number; at: number; dealt: boolean } | null = null;
  const beamA = (time: number) => ((time % PERIOD) / PERIOD) * Math.PI * 2;
  const inBeam = (time: number) => foeLive(ctx) && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < RANGE
    && Math.abs(wrapAngle(Math.atan2(ctx.npc.y - ctx.player.y, ctx.npc.x - ctx.player.x) - beamA(time))) < HALF;
  return {
    update(time) {
      if (bolt && !bolt.dealt && time >= bolt.at) {
        bolt.dealt = true;
        ctx.sfx('stab');
        if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, bolt.x, bolt.y) < 46 + 18) ctx.hit(ctx.npc, 16, ctx.npc.x, ctx.npc.y);
      }
      if (bolt && time > bolt.at + 600) bolt = null;
    },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || !live(ctx) || !inBeam(now) || bolt) return;
      hits++;
      if (hits % 3 !== 0) return;
      bolt = { x: ctx.npc.x, y: ctx.npc.y, at: now + 900, dealt: false };
      ctx.float(ctx.npc.x, ctx.npc.y - 56, 'REPORTED', '#ff8a98');
      ctx.sfx('screech');
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player, a = beamA(time);
      const on = inBeam(time);
      for (let k = 0; k < 6; k++) {
        const r0 = 30 + (k / 6) * RANGE, r1 = 30 + ((k + 1) / 6) * RANGE;
        g.fillStyle(on ? WAX_LIT : LAMP, 0.07 * (1 - k / 6));
        g.fillTriangle(p.x + Math.cos(a - HALF) * r0, p.y + Math.sin(a - HALF) * r0, p.x + Math.cos(a + HALF) * r0, p.y + Math.sin(a + HALF) * r0, p.x + Math.cos(a + HALF) * r1, p.y + Math.sin(a + HALF) * r1);
        g.fillTriangle(p.x + Math.cos(a - HALF) * r0, p.y + Math.sin(a - HALF) * r0, p.x + Math.cos(a + HALF) * r1, p.y + Math.sin(a + HALF) * r1, p.x + Math.cos(a - HALF) * r1, p.y + Math.sin(a - HALF) * r1);
      }
      if (bolt && !bolt.dealt) {
        const k = clamp(1 - (bolt.at - time) / 900, 0, 1);
        g.lineStyle(2, WAX, 0.5 + k * 0.5); g.strokeCircle(bolt.x, bolt.y, 46 * (1.3 - k * 0.3));
        g.lineBetween(bolt.x - 46, bolt.y, bolt.x + 46, bolt.y); g.lineBetween(bolt.x, bolt.y - 32, bolt.x, bolt.y + 32);
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player, a = beamA(time);
      const lx = p.x + Math.cos(a) * 16, ly = p.y - 24 + Math.sin(a) * 6;
      g.fillStyle(0x2a2a30, 1); g.fillRect(lx - 4, ly - 5, 8, 9);
      g.fillStyle(LAMP, 1); g.fillCircle(lx + Math.cos(a) * 4, ly, 2.4);
      glow(g, lx + Math.cos(a) * 4, ly, 10, LAMP, 0.06, 2);
      if (bolt && bolt.dealt && time - bolt.at < 600) {
        const k = (time - bolt.at) / 600;
        g.lineStyle(3, 0x3a2a1c, 1 - k); g.lineBetween(bolt.x, bolt.y, bolt.x + 6, bolt.y - 18);
        g.fillStyle(WAX, 1 - k); g.fillTriangle(bolt.x + 6, bolt.y - 18, bolt.x + 2, bolt.y - 26, bolt.x + 10, bolt.y - 24);
      }
    },
  };
};

// ── Sealing-Wax Signet ───────────────────────────────────────────────
// Every 9s the signet warms. Your next hit stamps the foe: 14 more, and they are *named* —
// taking 15% more from you for 3s.

const signet: ItemScriptFactory = (ctx) => {
  const WARM = 9000;
  let since = -1;
  let stampAt = -9999;
  const ready = (time: number) => since >= 0 && time - since >= WARM;
  return {
    update(time) { if (since < 0) since = time; },
    onHitDealt(amount) {
      const now = ctx.scene.time.now;
      if (amount < 2 || !ready(now) || !foeLive(ctx) || !live(ctx)) return;
      since = now;
      stampAt = now;
      ctx.hit(ctx.npc, 14, ctx.npc.x, ctx.npc.y - 20);
      ctx.boostDamage(1.15, 3000);
      ctx.float(ctx.npc.x, ctx.npc.y - 58, 'NAMED', '#ff8a98');
      ctx.sfx('judgement');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const k = since < 0 ? 0 : clamp((time - since) / WARM, 0, 1);
      // The ring on your hand: a red bezel that fills, glowing when warm.
      const x = p.x + 18, y = p.y - 16;
      g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 5.5);
      g.fillStyle(WAX_DARK, 1); g.fillCircle(x, y, 4);
      g.fillStyle(WAX, 1); g.fillRect(x - 4, y + 4 - 8 * k, 8, 8 * k);
      g.lineStyle(1.2, BRASS_LIT, 1); g.strokeCircle(x, y, 5.5);
      if (k >= 1) glow(g, x, y, 12, WAX_LIT, 0.08 + Math.sin(time / 120) * 0.03, 2);
      // The seal on the named foe.
      if (foeLive(ctx) && time - stampAt < 3000) {
        const a = 1 - clamp((time - stampAt - 2600) / 400, 0, 1);
        const n = ctx.npc;
        g.fillStyle(WAX_DARK, a); g.fillCircle(n.x, n.y - 64, 9);
        g.fillStyle(WAX, a); g.fillCircle(n.x, n.y - 65, 8);
        g.lineStyle(1.4, WAX_LIT, a); g.strokeCircle(n.x, n.y - 65, 5);
        g.lineBetween(n.x - 3, n.y - 65, n.x + 3, n.y - 65);
      }
    },
  };
};

// ── Velvet Domino ────────────────────────────────────────────────────
// Once every 9s the mask takes a blow for you: you heal back 70% of that hit, and the cracked
// mask falls. It mends in 9s.

const domino: ItemScriptFactory = (ctx) => {
  const MEND = 9000;
  let crackedAt = -MEND;
  let fall: { x: number; y: number; at: number } | null = null;
  return {
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 3 || now - crackedAt < MEND || !live(ctx)) return;
      crackedAt = now;
      ctx.heal(ctx.player, Math.max(2, Math.round(amount * 0.7)));
      fall = { x: ctx.player.x, y: ctx.player.y, at: now };
      ctx.float(ctx.player.x, ctx.player.y - 56, 'THE MASK TOOK IT', '#e8dcff');
      ctx.sfx('crystal-shatter');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (time - crackedAt >= MEND) {
        mask(g, p.x, p.y - 36, 0.55, 'domino', MASK_BLACK);
        g.fillStyle(MASK_GOLD, 0.8); g.fillRect(p.x - 5, p.y - 38, 3, 1);
      } else {
        // Mending: a faint outline that fills in.
        const k = (time - crackedAt) / MEND;
        g.lineStyle(1, 0xe8dcff, 0.2 + k * 0.4); g.strokeEllipse(p.x, p.y - 36, 14 * k + 2, 4);
      }
      if (fall && time - fall.at < 700) {
        const k = (time - fall.at) / 700;
        mask(g, fall.x + k * 14, fall.y - 36 + k * k * 40, 0.55, 'domino', MASK_BLACK, 1 - k);
        g.lineStyle(1.2, 0xffffff, 1 - k); g.lineBetween(fall.x + k * 14 - 2, fall.y - 40 + k * k * 40, fall.x + k * 14 + 2, fall.y - 32 + k * k * 40);
      }
    },
  };
};

// ── Pocket Ear-Trumpet ───────────────────────────────────────────────
// Every E/R/F/Q you cast is whispered again 0.8s later where the foe stood when you cast it:
// if they are still within 70px, 9 damage (18 for a Q).

const trumpet: ItemScriptFactory = (ctx) => {
  const echoes: { x: number; y: number; at: number; dmg: number; dealt: boolean }[] = [];
  return {
    update(time) {
      for (let i = echoes.length - 1; i >= 0; i--) {
        const e = echoes[i];
        if (!e.dealt && time >= e.at) {
          e.dealt = true;
          if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, e.x, e.y) < 70) {
            ctx.hit(ctx.npc, e.dmg, ctx.npc.x, ctx.npc.y);
            ctx.float(ctx.npc.x, ctx.npc.y - 52, '…said again', '#e8dcff');
          }
          ctx.sfx('sonic-pulse');
        }
        if (time > e.at + 500) echoes.splice(i, 1);
      }
    },
    onCast(_id, slot) {
      if (!slot || slot === 'click' || !foeLive(ctx) || !live(ctx)) return;
      echoes.push({ x: ctx.npc.x, y: ctx.npc.y, at: ctx.scene.time.now + 800, dmg: slot === 'q' ? 18 : 9, dealt: false });
    },
    drawGround(g, time) {
      for (const e of echoes) {
        if (!e.dealt) {
          const k = clamp(1 - (e.at - time) / 800, 0, 1);
          g.lineStyle(1.5, 0xe8dcff, 0.3 + k * 0.5); g.strokeCircle(e.x, e.y, 70);
          g.lineStyle(2, BRASS, 0.5 + k * 0.4); g.strokeCircle(e.x, e.y, 70 * (1 - k) + 6);
        } else {
          const k = (time - e.at) / 500;
          for (let i = 0; i < 3; i++) { g.lineStyle(2, 0xe8dcff, 1 - k); g.strokeCircle(e.x, e.y, 20 + i * 14 + k * 30); }
        }
      }
    },
    drawAir(g) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // A little brass horn at your ear.
      g.lineStyle(2, BRASS_DARK, 1); g.lineBetween(p.x - 10, p.y - 38, p.x - 22, p.y - 44);
      g.fillStyle(BRASS, 1); g.fillEllipse(p.x - 24, p.y - 45, 6, 9);
      g.fillStyle(0x1a140c, 1); g.fillEllipse(p.x - 25, p.y - 45, 3, 5);
    },
  };
};

// ── Whisper's Unsent Letter ──────────────────────────────────────────
// Every 4th hit nails a letter to the floor under the foe; it bursts 1s later for 16 if they
// are within 50px. Once a fight, dropping under 35%, you vanish into rumour: heal 24 over 2s and
// run 40% faster for 2.5s.

const unsent: ItemScriptFactory = (ctx) => {
  let hits = 0;
  const nailed: { x: number; y: number; at: number; dealt: boolean }[] = [];
  let rumourAt = -1;
  let healed = 0;
  return {
    update(time) {
      for (let i = nailed.length - 1; i >= 0; i--) {
        const n = nailed[i];
        if (!n.dealt && time >= n.at) {
          n.dealt = true;
          ctx.sfx('explosion-small');
          ctx.flash(n.x, n.y, WAX_LIT);
          if (foeLive(ctx) && dist(ctx.npc.x, ctx.npc.y, n.x, n.y) < 50) ctx.hit(ctx.npc, 16, n.x, n.y);
        }
        if (time > n.at + 500) nailed.splice(i, 1);
      }
      if (rumourAt < 0 && live(ctx) && ctx.player.hp < ctx.player.maxHp * 0.35) {
        rumourAt = time;
        ctx.boostSpeed(1.4, 2500);
        ctx.float(ctx.player.x, ctx.player.y - 60, 'ONLY A RUMOUR', '#d8c8f0');
        ctx.sfx('blink');
      }
      if (rumourAt >= 0 && healed < 24 && live(ctx)) {
        const want = Math.min(24, Math.floor(((time - rumourAt) / 2000) * 24));
        if (want > healed) { ctx.heal(ctx.player, want - healed); healed = want; }
      }
    },
    onHitDealt(amount) {
      if (amount < 2 || !foeLive(ctx)) return;
      hits++;
      if (hits % 4 !== 0) return;
      nailed.push({ x: ctx.npc.x, y: ctx.npc.y + 4, at: ctx.scene.time.now + 1000, dealt: false });
      ctx.sfx('hammer-forge');
    },
    drawGround(g, time) {
      for (const n of nailed) {
        if (n.dealt) {
          const k = (time - n.at) / 500;
          for (let i = 0; i < 6; i++) letter(g, n.x + Math.cos(i) * k * 40, n.y + Math.sin(i) * k * 20 - k * 20, 0.7, i + k * 6, false, 1 - k);
          continue;
        }
        const k = clamp(1 - (n.at - time) / 1000, 0, 1);
        g.lineStyle(1.5, WAX, 0.3 + k * 0.6); g.strokeCircle(n.x, n.y, 50);
        letter(g, n.x, n.y, 1.3, 0.1);
        nail(g, n.x - 8, n.y - 5, 1.3); nail(g, n.x + 8, n.y - 5, 1.3);
      }
    },
    drawAir(g, time) {
      if (rumourAt < 0 || time - rumourAt > 2500 || !live(ctx)) return;
      const p = ctx.player;
      const k = (time - rumourAt) / 2500;
      for (let i = 0; i < 4; i++) {
        const a = time / 200 + i * 1.6;
        g.fillStyle(0x3e3150, 0.35 * (1 - k)); g.fillEllipse(p.x + Math.cos(a) * 20, p.y - 20 + Math.sin(a) * 10, 22, 12);
      }
    },
  };
};

export const CLOAK_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_LANTERN, name: 'Informer\'s Dark Lantern', emoji: '🏮', kind: 'charm', price: 420, isle: ISLE,
    flavor: 'A tin bullseye with a shutter you can work with a thumb. Taken off an informer who will not be needing it.',
    script: CHARM_LANTERN,
    scriptText: [
      'A lantern beam turns slowly round you, once every 6s.',
      'Every 3rd hit you land with the foe in the beam reports them: 0.9s later a quarrel drops where they stood, for 16.',
    ],
  },
  {
    id: CHARM_SIGNET, name: 'Sealing-Wax Signet', emoji: '💍', kind: 'charm', price: 560, isle: ISLE,
    flavor: 'A clerk\'s ring cut with the Hall\'s eye. Press it in hot wax and the letter is official. Press it in a face…',
    script: CHARM_SIGNET,
    scriptText: [
      'Every 9s the signet warms. Your next hit stamps the foe for 14 more.',
      'A stamped foe is named: they take 15% more damage from you for 3s.',
    ],
  },
  {
    id: CHARM_DOMINO, name: 'Velvet Domino', emoji: '🎭', kind: 'charm', price: 760, isle: ISLE,
    flavor: 'A black half-mask lined in plum velvet. In Cloak, the face that takes the blame is never the one underneath.',
    effect: { maxHp: 5 },
    script: CHARM_DOMINO,
    scriptText: [
      'Once every 9s, the mask takes a blow for you: heal back 70% of that hit.',
      'The cracked mask falls, and mends itself 9s later.',
    ],
  },
  {
    id: CHARM_TRUMPET, name: 'Pocket Ear-Trumpet', emoji: '📯', kind: 'charm', price: 1020, isle: ISLE,
    flavor: 'A brass horn no longer than a finger, from the gallery\'s own foundry. It hears a thing, then it says it again.',
    script: CHARM_TRUMPET,
    scriptText: [
      'Every E, R, F or Q you cast is whispered again 0.8s later where the foe stood when you cast.',
      'If they are still within 70px it hits for 9 (18 for a Q). Best against a foe who stands still.',
    ],
  },
  {
    id: ART_WHISPER, name: 'Whisper\'s Unsent Letter', emoji: '✉️', kind: 'artifact', isle: ISLE,
    flavor: 'Sealed, addressed to his mother, never posted. You have not opened it. You are the only person in Cloak who would not.',
    effect: { maxHp: 18 },
    script: ART_WHISPER,
    scriptText: [
      'Every 4th hit you land nails a letter under the foe; it bursts 1s later for 16 if they are still on it.',
      'Once a fight, dropping under 35% health: heal 24 over 2s and move 40% faster for 2.5s.',
    ],
  },
  {
    id: FISH_MINNOW, name: 'Masked Minnow', emoji: '🐟', kind: 'fish', sell: 18, isle: ISLE,
    flavor: 'A slip of a fish with a black band across its eyes, like a domino. Shoals under the floating letters.',
    effect: { dodgeChance: 0.02 },
  },
  {
    id: FISH_CARP, name: 'Cipher Carp', emoji: '🐠', kind: 'fish', sell: 34, isle: ISLE,
    flavor: 'Fat, slow and black, and it eats paper. Its scales are speckled like a page of code. Spies hate it.',
    effect: { critChance: 0.03 },
  },
  {
    id: FISH_EEL, name: 'Eavesdrop Eel', emoji: '🐍', kind: 'fish', sell: 64, isle: ISLE,
    flavor: 'A long grey eel with fins like ears, that lies under the cistern\'s lip and listens. Bites when you whisper.',
    effect: { cooldownMult: 0.97 },
  },
];

export const CLOAK_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_LANTERN]: lantern,
  [CHARM_SIGNET]: signet,
  [CHARM_DOMINO]: domino,
  [CHARM_TRUMPET]: trumpet,
  [ART_WHISPER]: unsent,
};

export const CLOAK_SHOPS: ShopDef[] = [
  { id: 'cloak-shop', name: 'Latch & Lining — Quiet Things', stock: [CHARM_LANTERN, CHARM_SIGNET, CHARM_DOMINO, CHARM_TRUMPET], buys: true },
];

export const CLOAK_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Letter Cistern', kind: 'ink' }];

export const CLOAK_FISH: FishDef[] = [
  { id: FISH_MINNOW, fisheries: [FISHERY], weight: 6, fight: 2, size: [6, 14] },
  { id: FISH_CARP, fisheries: [FISHERY], weight: 4, fight: 3, size: [24, 58] },
  { id: FISH_EEL, fisheries: [FISHERY], weight: 1.5, fight: 5, size: [60, 140] },
];
