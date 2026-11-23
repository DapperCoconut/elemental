import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { repeatSign, soundArcs } from './art';
import { BRONZE, BRONZE_DARK, BRONZE_LIT, FLOW_DARK, FLOW_LIT, GHOST, GLOW, GLOW_SOFT, REPRISE_LIT, SILVER_LIT } from './palette';
import { alive, clamp, dist } from '../../../life/courts/bloom/util';

/**
 * The Cavern Court's goods: Mabyn Ringwell's four charms, Prince Reprise's repeat sign, and the
 * ringing pool's three fish. Every charm is a thing that holds a sound and gives it back — the
 * conch, the shell, the rest, the glowworm's silk — and each plays the cave's own rule of
 * "again" in your favour. Scripts are registered below under their item ids.
 */

const ISLE = 'sound';

export const CHARM_CONCH = 'cavern-charm-echo-conch';
export const CHARM_SHELL = 'cavern-charm-answering-shell';
export const CHARM_FERMATA = 'cavern-charm-fermata-pin';
export const CHARM_JAR = 'cavern-charm-glowworm-jar';
export const ART_REPRISE = 'art-reprise';

export const FISH_EEL = 'fish-echo-eel';
export const FISH_ROACH = 'fish-ringing-roach';
export const FISH_GROUPER = 'fish-hollow-grouper';
export const FISHERY = 'cavern-pool';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);
const now = (ctx: ItemScriptCtx) => ctx.scene.time.now;
const isAbility = (slot: string | null) => slot === 'e' || slot === 'r' || slot === 'f' || slot === 'q';

// ── Echo Conch ───────────────────────────────────────────────────────
// Every 4th hit you land is heard again: 0.9s later a ghost of it comes round onto the foe for
// 60% of the blow.

const conch: ItemScriptFactory = (ctx) => {
  let count = 0;
  const pending: { amount: number; at: number }[] = [];
  const landed: { x: number; y: number; at: number }[] = [];
  return {
    update(time) {
      for (let i = pending.length - 1; i >= 0; i--) {
        if (time < pending[i].at) continue;
        const dmg = clamp(Math.round(pending[i].amount * 0.6), 4, 18);
        pending.splice(i, 1);
        if (!foeLive(ctx)) continue;
        ctx.hit(ctx.npc, dmg, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 52, `again ${dmg}`, '#cfd4ff');
        ctx.sfx('sonic-pulse');
        landed.push({ x: ctx.npc.x, y: ctx.npc.y, at: time });
      }
      for (let i = landed.length - 1; i >= 0; i--) if (time - landed[i].at > 500) landed.splice(i, 1);
    },
    onHitDealt(amount) {
      if (amount < 2 || !live(ctx)) return;
      count += 1;
      if (count % 4 === 0) pending.push({ amount, at: now(ctx) + 900 });
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      // The conch at your hip, with four pips that fill as the hits count up.
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 24;
      g.fillStyle(FLOW_DARK, 1); g.fillEllipse(x, y + 1, 14, 10);
      g.fillStyle(FLOW_LIT, 1); g.fillEllipse(x, y, 12, 8);
      g.fillStyle(0xf0c8d8, 1); g.fillEllipse(x - 2, y, 4, 3);
      for (let i = 0; i < 4; i++) { g.fillStyle(i < count % 4 ? GHOST : 0x30324a, 0.9); g.fillCircle(x - 6 + i * 4, y - 9, 1.5); }
      for (const l of landed) {
        const k = (time - l.at) / 500;
        g.lineStyle(2 * (1 - k), GHOST, 1 - k); g.strokeCircle(l.x, l.y, 20 + k * 30);
      }
      for (const pd of pending) {
        if (!foeLive(ctx)) break;
        const k = clamp(1 - (pd.at - time) / 900, 0, 1);
        soundArcs(g, ctx.npc.x, ctx.npc.y, 40 - k * 16, Math.atan2(ctx.player.y - ctx.npc.y, ctx.player.x - ctx.npc.x), 0.6, GHOST, 0.3 + k * 0.6);
      }
    },
  };
};

// ── Answering Shell ──────────────────────────────────────────────────
// The shell keeps what was done to you. Each hit you take fills it (up to 30). Cast an ability
// within 4s of the last hit and it answers: 60% of what it holds goes back into the foe.

const shell: ItemScriptFactory = (ctx) => {
  let held = 0;
  let lastHit = -9999;
  let flashAt = -9999;
  return {
    onHitTaken(amount) {
      if (amount <= 0) return;
      held = Math.min(30, held + amount);
      lastHit = now(ctx);
    },
    onCast(_id, slot) {
      if (!isAbility(slot) || held < 4 || !foeLive(ctx) || !live(ctx)) return;
      if (now(ctx) - lastHit > 4000) return;
      const dmg = Math.round(held * 0.6);
      held = 0;
      flashAt = now(ctx);
      ctx.hit(ctx.npc, dmg, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 52, `ANSWERED ${dmg}`, '#bff4ff');
      ctx.sfx('sonic-pulse');
    },
    update(time) {
      // What it holds leaks away once the fight has gone quiet.
      if (time - lastHit > 4000) held = Math.max(0, held - 0.1);
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x - 24, y = p.y - 26;
      const ready = held >= 4 && time - lastHit <= 4000;
      if (ready) glow(g, x, y, 14, GLOW, 0.07, 2);
      g.fillStyle(FLOW_DARK, 1); g.fillEllipse(x, y, 14, 12);
      for (let i = 0; i < 6; i++) { const a = Math.PI + (i / 5) * Math.PI; g.lineStyle(1, FLOW_LIT, 1); g.lineBetween(x, y + 4, x + Math.cos(a) * 7, y + 4 + Math.sin(a) * 7); }
      g.fillStyle(GLOW_SOFT, 0.8); g.fillRect(x - 6, y + 7, 12 * (held / 30), 2);
      if (time - flashAt < 500 && foeLive(ctx)) {
        const k = (time - flashAt) / 500;
        g.lineStyle(3 * (1 - k), GLOW, 1 - k); g.lineBetween(x, y, ctx.npc.x, ctx.npc.y);
      }
    },
  };
};

// ── Fermata Pin ──────────────────────────────────────────────────────
// Hold a rest. Go 2.5s without casting and the pin glows; your next ability lands +35% harder
// for 1.5s and gets 1.2s back on its own cooldown.

const fermata: ItemScriptFactory = (ctx) => {
  let lastCast = 0;
  let firedAt = -9999;
  return {
    onCast(id, slot) {
      const t = now(ctx);
      if (isAbility(slot) && t - lastCast >= 2500) {
        ctx.boostDamage(1.35, 1500);
        ctx.refund(id, 1200);
        firedAt = t;
        ctx.float(ctx.player.x, ctx.player.y - 54, 'FERMATA', '#fff2b0');
        ctx.sfx('crystal-chime');
      }
      lastCast = t;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x, y = p.y - 44;
      const k = clamp((time - lastCast) / 2500, 0, 1);
      // The fermata: an arc over a dot, drawing itself as the rest is held.
      g.lineStyle(2, k >= 1 ? BRONZE_LIT : BRONZE_DARK, k >= 1 ? 1 : 0.6);
      g.beginPath(); g.arc(x, y + 4, 7, Math.PI, Math.PI + k * Math.PI, false); g.strokePath();
      g.fillStyle(k >= 1 ? BRONZE_LIT : BRONZE, 1); g.fillCircle(x, y + 2, 1.8);
      if (k >= 1) glow(g, x, y, 10, BRONZE_LIT, 0.06, 2);
      if (time - firedAt < 600) { const f = (time - firedAt) / 600; g.lineStyle(2, BRONZE_LIT, 1 - f); g.strokeCircle(p.x, p.y, 24 + f * 40); }
    },
  };
};

// ── Glowworm Jar ─────────────────────────────────────────────────────
// Glowworms let down sticky silk from a jar at your hip. Keep the foe within reach for 1.5s in
// all and the threads catch them: stuck fast for half a second, 6 damage. Then the worms rest 7s.

const jar: ItemScriptFactory = (ctx) => {
  const REACH = 130;
  let stick = 0;
  let restUntil = 0;
  let caughtAt = -9999;
  let last = -1;
  return {
    update(time) {
      const dt = last < 0 ? 0 : clamp((time - last) / 1000, 0, 0.1);
      last = time;
      if (!live(ctx) || !foeLive(ctx) || time < restUntil) return;
      const near = dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < REACH;
      stick = clamp(stick + (near ? dt : -dt * 0.4), 0, 1.5);
      if (stick >= 1.5) {
        stick = 0;
        restUntil = time + 7000;
        caughtAt = time;
        ctx.stun(ctx.npc, 500);
        ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 50, 'CAUGHT IN SILK', '#bff4ff');
        ctx.sfx('trap-snap');
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const jx = p.x + 18, jy = p.y + 2;
      // The jar.
      g.fillStyle(0x9ab8c0, 0.45); g.fillRoundedRect(jx - 4, jy - 6, 8, 11, 3);
      g.fillStyle(BRONZE, 1); g.fillRect(jx - 4, jy - 7, 8, 2);
      g.fillStyle(GLOW, time < restUntil ? 0.3 : 0.9); g.fillCircle(jx - 1, jy - 1, 1.2); g.fillCircle(jx + 1.5, jy + 2, 1);
      if (!foeLive(ctx)) return;
      // Threads reaching toward the foe while they are close.
      const n = ctx.npc;
      const k = stick / 1.5;
      if (k > 0.05 && time >= restUntil) {
        for (let i = 0; i < 3; i++) {
          const t = k;
          const ex = jx + (n.x - jx) * t + Math.sin(time / 200 + i) * 6, ey = jy + (n.y - jy) * t + Math.cos(time / 230 + i) * 6;
          g.lineStyle(0.8, GLOW_SOFT, 0.5); g.lineBetween(jx, jy, ex, ey);
          for (let d = 1; d < 5; d++) { g.fillStyle(GLOW, 0.7); g.fillCircle(jx + (ex - jx) * (d / 5), jy + (ey - jy) * (d / 5), 1); }
        }
      }
      if (time - caughtAt < 600) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + time / 300;
          g.lineStyle(1, GLOW, 0.7); g.lineBetween(n.x, n.y, n.x + Math.cos(a) * 24, n.y + Math.sin(a) * 20);
        }
      }
    },
  };
};

// ── Reprise's Repeat Sign ────────────────────────────────────────────
// Whatever you do comes again. The damage you deal in the 1.2s after an ability is remembered,
// and 1.5s after the cast 40% of it is dealt again (at most 30). Never more than one at a time.

const repeat: ItemScriptFactory = (ctx) => {
  let rec: { from: number; until: number; fireAt: number; sum: number } | null = null;
  let firedAt = -9999;
  return {
    onCast(_id, slot) {
      if (!isAbility(slot) || rec) return;
      const t = now(ctx);
      rec = { from: t, until: t + 1200, fireAt: t + 1500, sum: 0 };
    },
    onHitDealt(amount) {
      if (rec && now(ctx) <= rec.until) rec.sum += amount;
    },
    update(time) {
      if (!rec || time < rec.fireAt) return;
      const dmg = Math.min(30, Math.round(rec.sum * 0.4));
      rec = null;
      if (dmg < 2 || !foeLive(ctx)) return;
      ctx.hit(ctx.npc, dmg, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 56, `REPRISE ${dmg}`, '#ccd0ff');
      ctx.sfx('crystal-chime');
      firedAt = time;
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const k = rec ? clamp((time - rec.from) / 1500, 0, 1) : 0;
      repeatSign(g, p.x - 4, p.y - 58, 12, rec ? REPRISE_LIT : BRONZE, rec ? 0.5 + k * 0.5 : 0.35);
      if (rec && foeLive(ctx)) {
        g.lineStyle(1.5, GHOST, 0.3 + k * 0.5); g.strokeCircle(ctx.npc.x, ctx.npc.y, 40 - k * 14);
      }
      if (time - firedAt < 500 && foeLive(ctx)) {
        const f = (time - firedAt) / 500;
        repeatSign(g, ctx.npc.x - 6, ctx.npc.y - 30 - f * 20, 20, SILVER_LIT, 1 - f);
      }
    },
  };
};

export const CAVERN_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_CONCH, name: 'Echo Conch', emoji: '🐚', kind: 'charm', price: 480, isle: ISLE,
    flavor: 'A pink-lipped conch from the ringing pool. Hold it to your ear and you hear the last thing you said, twice.',
    script: CHARM_CONCH,
    scriptText: [
      'Every 4th hit you land is heard again: 0.9s later it comes round onto the foe for 60% (4–18).',
    ],
  },
  {
    id: CHARM_SHELL, name: 'Answering Shell', emoji: '🦪', kind: 'charm', price: 680, isle: ISLE,
    flavor: 'A cockle the size of a fist, nacre inside. The cave-folk keep one by the door to catch what the Tuners say.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_SHELL,
    scriptText: [
      'Hits you take fill the shell (up to 30).',
      'Cast an ability within 4s of being hit and it answers: 60% of what it holds goes back into the foe.',
    ],
  },
  {
    id: CHARM_FERMATA, name: 'Fermata Pin', emoji: '📍', kind: 'charm', price: 880, isle: ISLE,
    flavor: 'A bronze pin in the shape of a pause mark. Brother Cantle gives them to the children who learn to wait for the beat.',
    script: CHARM_FERMATA,
    scriptText: [
      'Go 2.5s without casting and the pin glows.',
      'Your next ability then lands +35% harder for 1.5s and refunds 1.2s of its own cooldown.',
    ],
  },
  {
    id: CHARM_JAR, name: 'Glowworm Jar', emoji: '🫙', kind: 'charm', price: 1120, isle: ISLE,
    flavor: 'Six glowworms in a stoppered jar, fed on cave-midge. Their silk is sticky enough to hold a bat.',
    effect: { maxHp: 5 },
    script: CHARM_JAR,
    scriptText: [
      'Keep the foe within close reach for 1.5s in all (it fades slowly when they step away).',
      'The silk catches them: stuck fast for 0.5s and 6 damage. Then the worms rest for 7s.',
    ],
  },
  {
    id: ART_REPRISE, name: 'Reprise\'s Repeat Sign', emoji: '🔁', kind: 'artifact', isle: ISLE,
    flavor: 'The silver sign from the Prince\'s circlet. He said it was the only true thing in music: that it comes again.',
    effect: { maxHp: 14 },
    script: ART_REPRISE,
    scriptText: [
      'After an ability, the damage you deal in the next 1.2s is remembered.',
      '1.5s after the cast, 40% of it is dealt to the foe again (at most 30).',
    ],
  },
  {
    id: FISH_ROACH, name: 'Ringing Roach', emoji: '🐟', kind: 'fish', sell: 18, isle: ISLE,
    flavor: 'A little silver roach whose scales ring when it flips. A bucket of them sounds like a chandelier in a draught.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_EEL, name: 'Echo Eel', emoji: '🐍', kind: 'fish', sell: 32, isle: ISLE,
    flavor: 'A pale blind eel that finds its way by clicking. Hold one up and it clicks back at you.',
    effect: { cooldownMult: 0.97 },
  },
  {
    id: FISH_GROUPER, name: 'Hollow Grouper', emoji: '🐡', kind: 'fish', sell: 64, isle: ISLE,
    flavor: 'A vast slow grouper with a swim-bladder like a drum. Tap it and the whole pool booms.',
    effect: { maxHp: 10, damageTakenMult: 0.98 },
  },
];

export const CAVERN_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_CONCH]: conch,
  [CHARM_SHELL]: shell,
  [CHARM_FERMATA]: fermata,
  [CHARM_JAR]: jar,
  [ART_REPRISE]: repeat,
};

export const CAVERN_SHOPS: ShopDef[] = [
  { id: 'cavern-shop', name: 'Ringwell\'s Chimes & Lanterns', stock: [CHARM_CONCH, CHARM_SHELL, CHARM_FERMATA, CHARM_JAR], buys: true },
];

export const CAVERN_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Ringing Pool', kind: 'resonant' }];

export const CAVERN_FISH: FishDef[] = [
  { id: FISH_ROACH, fisheries: [FISHERY], weight: 6, fight: 2, size: [10, 24] },
  { id: FISH_EEL, fisheries: [FISHERY], weight: 3, fight: 3, size: [34, 92] },
  { id: FISH_GROUPER, fisheries: [FISHERY], weight: 1, fight: 5, size: [56, 128] },
];
