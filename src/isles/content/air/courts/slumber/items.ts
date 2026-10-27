import type {
  FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, Pt, ShopDef,
} from '../../../../IslesTypes';
import { lit } from '../../../../art/IsleArt';
import {
  BOTTLE, BRASS, DREAM, DREAM_LIT, LAMP_DIM, LAMP_FULL, NIGHTMARE, NIGHTMARE_EYE, PLAYER_TINT, WOOL,
  breathBottle, dist, dotted, dreamSheep, nightcapOn, zzz,
} from './art';

/**
 * The Slumber Court's goods: the four charms Mother Eiderdown sells across her counter of pillows,
 * Prince Reverie's artifact, and the Lake of Nod's three fish. Every charm is something the
 * sleeping town keeps by the bed — the fold's sheep-bell, a stolen breath bottle, the lamplighter's
 * snuffer, a sleepwalker's ribbon — turned on whoever you are fighting. Scripts are registered
 * under their item ids. (The court has no bakery: the Lake's catch goes to The Millstone in
 * Galeward and The Rising Loaf at Windlass.)
 */

const ISLE = 'air';
const TOP = 96;

// ── Ids ──────────────────────────────────────────────────────────────

export const CHARM_BELL = 'slumber-sheep-bell';
export const CHARM_BOTTLE = 'slumber-corked-breath';
export const CHARM_SNUFFER = 'slumber-snuffer';
export const CHARM_RIBBON = 'slumber-sleepwalk-ribbon';
export const ART_REVERIE = 'art-reverie';

export const FISH_CARP = 'fish-dozing-carp';
export const FISH_PIKE = 'fish-nightmare-pike';
export const FISH_LOACH = 'fish-lullaby-loach';
export const FISHERY = 'slumber-lake';

const alive = (f: { active: boolean; hp: number }): boolean => f.active && f.hp > 0;
const clampPt = (ctx: ItemScriptCtx, x: number, y: number): Pt => ({
  x: Math.max(50, Math.min(ctx.W - 50, x)),
  y: Math.max(TOP + 30, Math.min(ctx.H - 40, y)),
});

// ── Item defs ────────────────────────────────────────────────────────

export const SLUMBER_ITEMS: IsleItemDef[] = [
  // Charms.
  {
    id: CHARM_BELL, name: 'Fold-Gate Sheep Bell', emoji: '🔔', kind: 'charm', price: 260, isle: ISLE,
    flavor: 'The little bell off the sheepfold gate. Every dream-sheep in the court knows it and comes when it rings.',
    script: CHARM_BELL,
    scriptText: [
      'Every 5s a dream-sheep leaps from you to where the foe is standing. If it lands within 60px of them, it is counted.',
      'At three counted sheep the foe nods off: they take 30% more damage for 3s.',
    ],
  },
  {
    id: CHARM_BOTTLE, name: 'Corked Breath', emoji: '🍾', kind: 'charm', price: 420, isle: ISLE,
    flavor: 'One of the King\'s breath bottles, still sealed in his wax. Nobody knows whose breath it is. It fogs when you\'re hurt.',
    script: CHARM_BOTTLE,
    scriptText: [
      'A third of every hit you take is corked into the bottle (it holds 24).',
      'Land a hit while it holds 8 or more and you uncork it: heal all of it back in one gasp.',
    ],
  },
  {
    id: CHARM_SNUFFER, name: 'Lamplighter\'s Snuffer', emoji: '🕯️', kind: 'charm', price: 580, isle: ISLE,
    flavor: 'A brass cone on a long pole, for putting lamps out under the Dimming Order. It is much better at putting people out.',
    script: CHARM_SNUFFER,
    scriptText: [
      'Every 9s the lights round the foe go down for 3s.',
      'Your first hit on them in the dark lands again for 80% (at least 6).',
    ],
  },
  {
    id: CHARM_RIBBON, name: 'Sleepwalker\'s Ribbon', emoji: '🎀', kind: 'charm', price: 780, isle: ISLE,
    flavor: 'Sleepwalkers on the Long Ward are tied to their bedposts with these. Cut one and it remembers the way you walked.',
    script: CHARM_RIBBON,
    scriptText: [
      'Every 8s a sleepwalking shade of you walks the path you took over the last 2s.',
      'If it walks into the foe it wakes with a start: 12 damage. It fades when its walk is done.',
    ],
  },

  // Artifact.
  {
    id: ART_REVERIE, name: 'Reverie\'s Nightcap', emoji: '🛌', kind: 'artifact', isle: ISLE,
    flavor: 'Lilac silk, a gold moon on the pompom, and a little brass breath-meter sewn inside the brim, needle at nought.',
    effect: { maxHp: 16 },
    script: ART_REVERIE,
    scriptText: [
      'Sweet Dreams: every 9s a sleepy bubble drifts after the foe; it pops for 8 and they take 20% more for 2s.',
      'Night Terror: the first time you drop under 30% health, a nightmare hand grabs the foe from the floor — 20 damage.',
    ],
  },

  // Fish.
  {
    id: FISH_CARP, name: 'Dozing Carp', emoji: '🐟', kind: 'fish', sell: 26, isle: ISLE,
    flavor: 'Fat and golden and fast asleep. It feeds on sweet dreams that sink into the lake and hardly fights at all.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: FISH_LOACH, name: 'Lullaby Loach', emoji: '🐠', kind: 'fish', sell: 38, isle: ISLE,
    flavor: 'A little striped loach that hums when you hold it to your ear. The Long Ward\'s nurses keep them in jars.',
    effect: { damageTakenMult: 0.96 },
  },
  {
    id: FISH_PIKE, name: 'Nightmare Pike', emoji: '🦈', kind: 'fish', sell: 60, isle: ISLE,
    flavor: 'Long, black and toothed like a bad thought. It eats the dreams that sink into the lake — only the bad ones.',
    effect: { damageMult: 1.05 },
  },
];

// ── Scripts ──────────────────────────────────────────────────────────

/** Fold-Gate Sheep Bell — dream-sheep leap at the foe; three counted and they nod off. */
const sheepBell: ItemScriptFactory = (ctx) => {
  interface Leap { from: Pt; to: Pt; at: number }
  let leap: Leap | null = null;
  let next = 3000;
  let counted = 0;
  let dozeUntil = 0;
  let dozeAt = -9999;
  const LEAP_MS = 900;
  return {
    update(time) {
      const p = ctx.player, n = ctx.npc;
      if (!alive(p) || !alive(n)) return;
      if (!leap && time >= next && time >= dozeUntil) {
        leap = { from: { x: p.x, y: p.y + 10 }, to: clampPt(ctx, n.x, n.y + 10), at: time };
        ctx.sfx('boing');
      }
      if (leap && time - leap.at >= LEAP_MS) {
        if (dist(leap.to.x, leap.to.y, n.x, n.y + 10) < 60) {
          counted++;
          ctx.float(n.x, n.y - 54, counted >= 3 ? 'THREE... ZZZ' : counted === 1 ? 'ONE...' : 'TWO...', '#e4d8ff');
          ctx.sfx('bubble');
          if (counted >= 3) {
            counted = 0;
            dozeAt = time; dozeUntil = time + 3000;
            ctx.boostDamage(1.3, 3000);
            ctx.sfx('status-debuff');
          }
        }
        leap = null;
        next = time + 5000;
      }
    },
    drawGround(g, time) {
      if (!leap) return;
      const k = (time - leap.at) / LEAP_MS;
      // Where it will land: a soft dotted ring.
      g.lineStyle(1.5, DREAM_LIT, 0.35 + 0.3 * k); g.strokeCircle(leap.to.x, leap.to.y, 60);
      dotted(g, [leap.from, leap.to], 14, 1.6, DREAM_LIT, 0.3 * (1 - k), time / 30);
    },
    drawAir(g, time) {
      const t = time / 1000;
      if (leap) {
        const k = Math.min(1, (time - leap.at) / LEAP_MS);
        const x = leap.from.x + (leap.to.x - leap.from.x) * k, y = leap.from.y + (leap.to.y - leap.from.y) * k;
        dreamSheep(g, x, y, 9, leap.to.x >= leap.from.x ? 1 : -1, t, k, 0.95);
      }
      // Counted pips over the foe — little woolly dots.
      const n = ctx.npc;
      if (alive(n)) for (let i = 0; i < counted; i++) { g.fillStyle(WOOL, 0.95); g.fillCircle(n.x - 8 + i * 8, n.y - 62, 3.2); }
      if (time < dozeUntil && alive(n)) {
        nightcapOn(g, n.x, n.y - 28, 14, DREAM, 0.85, 0.6, Math.sin(t * 2) * 2);
        zzz(g, n.x + 14, n.y - 46, 6, t, DREAM_LIT, 0.9);
      }
      const f = (time - dozeAt) / 500;
      if (f >= 0 && f < 1 && alive(n)) { g.lineStyle(2, DREAM_LIT, 1 - f); g.strokeCircle(n.x, n.y, 18 + f * 34); }
    },
  };
};

/** Corked Breath — a third of what you take is bottled; a landed hit uncorks it. */
const corkedBreath: ItemScriptFactory = (ctx) => {
  let held = 0;
  let gaspAt = -9999;
  let gasped = 0;
  const CAP = 24;
  return {
    onHitTaken(amount) {
      held = Math.min(CAP, held + amount / 3);
    },
    onHitDealt() {
      if (held < 8) return;
      const p = ctx.player;
      gasped = Math.round(held);
      ctx.heal(p, gasped);
      ctx.float(p.x, p.y - 56, `UNCORKED +${gasped}`, '#cfe8ff');
      ctx.sfx('whoosh');
      gaspAt = ctx.scene.time.now;
      held = 0;
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!alive(p)) return;
      // The bottle rides at your hip, fogging as it fills.
      breathBottle(g, p.x + 24, p.y - 8, 5, held / CAP, 0.9, Math.sin(time / 400) * 0.12);
      if (held >= 8) { g.lineStyle(1.5, BOTTLE, 0.4 + 0.3 * Math.sin(time / 140)); g.strokeCircle(p.x + 24, p.y - 16, 11); }
      const k = (time - gaspAt) / 700;
      if (k >= 0 && k < 1) {
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.4;
          g.fillStyle(0xffffff, 0.6 * (1 - k));
          g.fillCircle(p.x + 24 + Math.cos(a) * k * 30, p.y - 28 + Math.sin(a) * k * 40, 4 + k * 6);
        }
      }
    },
  };
};

/** Lamplighter's Snuffer — the lights go down round the foe; your first hit in the dark lands twice. */
const snuffer: ItemScriptFactory = (ctx) => {
  let next = 5000;
  let darkAt = -9999;
  let darkUntil = 0;
  let armed = false;
  let struckAt = -9999;
  return {
    update(time) {
      const n = ctx.npc;
      if (!alive(n) || !alive(ctx.player)) return;
      if (time >= next) {
        next = time + 9000;
        darkAt = time; darkUntil = time + 3000; armed = true;
        ctx.sfx('hush');
        ctx.float(n.x, n.y - 54, 'LIGHTS DOWN', '#e8a860');
      }
      if (time >= darkUntil) armed = false;
    },
    onHitDealt(amount) {
      if (!armed) return;
      armed = false;
      const n = ctx.npc;
      const dmg = Math.max(6, Math.round(amount * 0.8));
      ctx.hit(n, dmg, n.x, n.y);
      ctx.float(n.x, n.y - 60, `FROM THE DARK ${dmg}`, '#ffe2a0');
      ctx.sfx('stab');
      struckAt = ctx.scene.time.now;
    },
    drawGround(g, time) {
      if (time >= darkUntil) return;
      const n = ctx.npc;
      const k = Math.min(1, (time - darkAt) / 300) * Math.min(1, (darkUntil - time) / 300);
      // A pool of dark round the foe, edged with the last of the lamplight.
      g.fillStyle(NIGHTMARE, 0.45 * k); g.fillCircle(n.x, n.y + 6, 70);
      g.fillStyle(NIGHTMARE, 0.35 * k); g.fillCircle(n.x, n.y + 6, 48);
      g.lineStyle(2, LAMP_DIM, 0.35 * k); g.strokeCircle(n.x, n.y + 6, 72);
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (time < darkUntil && alive(n)) {
        // The snuffer cone hanging over them on its pole.
        const k = Math.min(1, (time - darkAt) / 300);
        const cy = n.y - 60 - (1 - k) * 30;
        g.lineStyle(2, BRASS, 0.9); g.lineBetween(n.x + 30, cy - 40, n.x + 4, cy - 6);
        g.fillStyle(BRASS, 0.95); g.fillTriangle(n.x - 8, cy + 4, n.x + 10, cy + 4, n.x + 1, cy - 14);
        if (armed) { g.fillStyle(LAMP_FULL, 0.5 + 0.4 * Math.sin(time / 90)); g.fillCircle(n.x + 1, cy + 6, 2.5); }
      }
      const s = (time - struckAt) / 400;
      if (s >= 0 && s < 1 && alive(n)) {
        g.lineStyle(3, LAMP_FULL, 1 - s);
        g.lineBetween(n.x - 20 - s * 10, n.y - 20, n.x + 20 + s * 10, n.y + 10);
      }
    },
  };
};

/** Sleepwalker's Ribbon — a shade of you walks your last two seconds again, into the foe. */
const ribbon: ItemScriptFactory = (ctx) => {
  const trail: { x: number; y: number; at: number }[] = [];
  let walk: { pts: { x: number; y: number }[]; at: number; hit: boolean } | null = null;
  let next = 5000;
  let wokeAt = -9999;
  let woke: Pt = { x: 0, y: 0 };
  const WALK_MS = 2000;
  return {
    update(time) {
      const p = ctx.player, n = ctx.npc;
      if (!alive(p)) return;
      if (trail.length === 0 || time - trail[trail.length - 1].at >= 50) trail.push({ x: p.x, y: p.y, at: time });
      while (trail.length && time - trail[0].at > WALK_MS) trail.shift();
      if (!walk && time >= next && trail.length > 8) {
        walk = { pts: trail.map((q) => ({ x: q.x, y: q.y })), at: time, hit: false };
        ctx.sfx('blink');
      }
      if (walk) {
        const k = (time - walk.at) / WALK_MS;
        if (k >= 1) { walk = null; next = time + 8000; return; }
        const i = Math.min(walk.pts.length - 1, Math.floor(k * walk.pts.length));
        const s = walk.pts[i];
        if (!walk.hit && alive(n) && dist(s.x, s.y, n.x, n.y) < 36) {
          walk.hit = true;
          ctx.hit(n, 12, n.x, n.y);
          ctx.float(n.x, n.y - 54, 'BUMPED AWAKE', '#b89cff');
          ctx.sfx('hit-medium');
          wokeAt = time; woke = { x: s.x, y: s.y };
          walk = null; next = time + 8000;
        }
      }
    },
    drawGround(g, time) {
      if (!walk) return;
      const k = (time - walk.at) / WALK_MS;
      const i = Math.floor(k * walk.pts.length);
      // The route still to walk, dotted on the floor.
      dotted(g, walk.pts.slice(i), 12, 1.6, DREAM_LIT, 0.4, time / 40);
    },
    drawAir(g, time) {
      const t = time / 1000;
      if (walk) {
        const k = (time - walk.at) / WALK_MS;
        const i = Math.min(walk.pts.length - 1, Math.floor(k * walk.pts.length));
        const s = walk.pts[i];
        const fade = Math.min(1, (1 - k) * 4) * Math.min(1, k * 6);
        // A pale shade of you in a nightcap, arms out in front, a ribbon trailing off its wrist.
        g.fillStyle(PLAYER_TINT, 0.25 * fade); g.fillCircle(s.x, s.y, 20);
        g.fillStyle(DREAM_LIT, 0.45 * fade); g.fillCircle(s.x, s.y, 15);
        g.lineStyle(3, DREAM_LIT, 0.5 * fade);
        g.lineBetween(s.x - 8, s.y - 2, s.x - 8 + 16, s.y - 6); g.lineBetween(s.x + 8, s.y - 2, s.x + 22, s.y - 6);
        nightcapOn(g, s.x, s.y - 8, 13, lit(DREAM, 0.3), 0.55 * fade, 0.6);
        const back = walk.pts[Math.max(0, i - 6)];
        g.lineStyle(2, 0xff9ac8, 0.6 * fade); g.lineBetween(s.x + 20, s.y - 6, back.x + 10, back.y + Math.sin(t * 6) * 4);
      }
      const w = (time - wokeAt) / 500;
      if (w >= 0 && w < 1) {
        g.lineStyle(2, DREAM_LIT, 1 - w);
        for (let j = 0; j < 4; j++) { const a = j * 1.6; g.lineBetween(woke.x + Math.cos(a) * 10, woke.y - 20 + Math.sin(a) * 10, woke.x + Math.cos(a) * (18 + w * 20), woke.y - 20 + Math.sin(a) * (18 + w * 20)); }
      }
    },
  };
};

/** Reverie's Nightcap — sleepy bubbles after the foe; one nightmare hand when you are low. */
const nightcap: ItemScriptFactory = (ctx): ItemScript => {
  let nextBubble = 4000;
  let bubble: { x: number; y: number; at: number } | null = null;
  let popAt = -9999;
  let popPt: Pt = { x: 0, y: 0 };
  let terrorUsed = false;
  let grabAt = -9999;
  let grabPt: Pt = { x: 0, y: 0 };
  return {
    update(time, dt) {
      const p = ctx.player, n = ctx.npc;
      if (!alive(p)) return;
      if (!bubble && time >= nextBubble && alive(n)) { bubble = { x: p.x, y: p.y - 30, at: time }; ctx.sfx('bubble'); }
      if (bubble) {
        const a = Math.atan2(n.y - 10 - bubble.y, n.x - bubble.x);
        const sp = 120 + (time - bubble.at) * 0.05;
        bubble.x += Math.cos(a) * sp * dt + Math.sin(time / 300) * 0.6;
        bubble.y += Math.sin(a) * sp * dt;
        if (alive(n) && dist(bubble.x, bubble.y, n.x, n.y - 10) < 26) {
          ctx.hit(n, 8, n.x, n.y);
          ctx.boostDamage(1.2, 2000);
          ctx.float(n.x, n.y - 54, 'SWEET DREAMS', '#e4d8ff');
          ctx.sfx('bubble');
          popAt = time; popPt = { x: bubble.x, y: bubble.y };
          bubble = null; nextBubble = time + 9000;
        } else if (time - bubble.at > 5000 || !alive(n)) { bubble = null; nextBubble = time + 9000; }
      }
      if (!terrorUsed && p.hp < p.maxHp * 0.3 && alive(n)) {
        terrorUsed = true;
        ctx.hit(n, 20, n.x, n.y);
        ctx.float(n.x, n.y - 60, 'NIGHT TERROR', '#ff5a7a');
        ctx.sfx('screech');
        grabAt = time; grabPt = { x: n.x, y: n.y };
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      if (bubble) {
        const r = 11 + Math.sin(t * 5) * 1.2;
        g.fillStyle(DREAM, 0.2); g.fillCircle(bubble.x, bubble.y, r);
        g.lineStyle(1.6, DREAM_LIT, 0.8); g.strokeCircle(bubble.x, bubble.y, r);
        g.fillStyle(0xffffff, 0.7); g.fillCircle(bubble.x - r * 0.4, bubble.y - r * 0.4, 2.4);
        zzz(g, bubble.x - 3, bubble.y + 2, 3, t, DREAM_LIT, 0.7);
      }
      const pk = (time - popAt) / 400;
      if (pk >= 0 && pk < 1) {
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(DREAM_LIT, 1 - pk); g.fillCircle(popPt.x + Math.cos(a) * (10 + pk * 20), popPt.y + Math.sin(a) * (10 + pk * 20), 2); }
      }
      const gk = (time - grabAt) / 900;
      if (gk >= 0 && gk < 1) {
        // A black hand up out of the floor, fingers closing.
        const rise = Math.min(1, gk * 3);
        const close = Math.min(1, Math.max(0, gk * 3 - 0.6));
        const x = grabPt.x, y = grabPt.y + 16;
        g.fillStyle(NIGHTMARE, 0.6 * (1 - gk)); g.fillEllipse(x, y, 70, 18);
        g.fillStyle(NIGHTMARE, 0.95 * (1 - gk * 0.6));
        g.fillRect(x - 9, y - 50 * rise, 18, 50 * rise);
        for (let f = 0; f < 4; f++) {
          const fa = -Math.PI / 2 + (f - 1.5) * (0.45 - close * 0.3);
          g.lineStyle(5, NIGHTMARE, 0.95 * (1 - gk * 0.6));
          g.lineBetween(x + (f - 1.5) * 5, y - 50 * rise, x + (f - 1.5) * 5 + Math.cos(fa) * 26 * rise, y - 50 * rise + Math.sin(fa) * 26 * rise);
        }
        g.fillStyle(NIGHTMARE_EYE, 1 - gk); g.fillCircle(x - 4, y - 30 * rise, 2); g.fillCircle(x + 4, y - 30 * rise, 2);
      }
    },
  };
};

export const SLUMBER_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_BELL]: sheepBell,
  [CHARM_BOTTLE]: corkedBreath,
  [CHARM_SNUFFER]: snuffer,
  [CHARM_RIBBON]: ribbon,
  [ART_REVERIE]: nightcap,
};

// ── Shop and fish ────────────────────────────────────────────────────

export const SLUMBER_SHOPS: ShopDef[] = [{
  id: 'slumber-shop',
  name: 'Mother Eiderdown\'s Feathers & Bedding',
  stock: [CHARM_BELL, CHARM_BOTTLE, CHARM_SNUFFER, CHARM_RIBBON],
  buys: true,
}];

export const SLUMBER_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Lake of Nod', kind: 'pond' }];

export const SLUMBER_FISH: FishDef[] = [
  { id: FISH_CARP, fisheries: [FISHERY], weight: 7, fight: 1, size: [30, 70] },
  { id: FISH_LOACH, fisheries: [FISHERY], weight: 4, fight: 3, size: [8, 20] },
  { id: FISH_PIKE, fisheries: [FISHERY], weight: 2, fight: 5, size: [80, 300] },
];
