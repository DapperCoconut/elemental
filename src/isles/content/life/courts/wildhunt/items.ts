import type { IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import {
  BLOOD, FUR, GILT, HUNT_RED, WOLF, WOLF_LIT, clamp, dist, falcon, frameClock, hound, huntingHorn, reedHide,
} from './util';

/**
 * The Wildhunt's wares: four charms from Hesketh Thrum's Antler & Awl, Prince Fang's artifact,
 * and the two fish of the Ford pool. Every charm and the artifact carries a bespoke script.
 */

export const CHARM_COLLAR = 'wildhunt-houndstooth-collar';
export const CHARM_REEDS = 'wildhunt-reed-cloak';
export const CHARM_HORN = 'wildhunt-hallooing-horn';
export const CHARM_GAUNTLET = 'wildhunt-falconers-gauntlet';
export const ART_FANG = 'art-fang';

const alive = (f: { active: boolean; hp: number }): boolean => f.active && f.hp > 0;

// ── Scripts ──────────────────────────────────────────────────────────

/**
 * Houndstooth Collar — every hit you land leaves blood scent on the foe (+1, up to 5; one fades
 * every 4s without a hit). Every 8s, if there is any scent on them, a phantom hound runs in off
 * the nearest edge and bites: 3 damage per stack, and the scent is spent.
 */
const houndstoothCollar: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const MAX = 5, PERIOD = 8000, RUN = 1100;
  let stacks = 0, lastHit = 0;
  let next = ctx.scene.time.now + PERIOD;
  let run: { fx: number; fy: number; at: number; n: number } | null = null;
  let self = false;
  return {
    onHitDealt(amount) {
      if (self || amount <= 0) return;
      lastHit = ctx.scene.time.now;
      stacks = Math.min(MAX, stacks + 1);
    },
    update(time) {
      if (stacks > 0 && time - lastHit > 4000) { stacks--; lastHit = time; }
      if (!run && time >= next) {
        next = time + PERIOD;
        if (stacks > 0 && alive(ctx.npc)) {
          const n = ctx.npc;
          const fx = n.x < ctx.W / 2 ? -30 : ctx.W + 30;
          run = { fx, fy: n.y + (ctx.rng() - 0.5) * 120, at: time, n: stacks };
          ctx.sfx('screech');
        }
      }
      if (run && time - run.at >= RUN) {
        if (alive(ctx.npc)) {
          self = true; ctx.hit(ctx.npc, run.n * 3, ctx.npc.x, ctx.npc.y); self = false;
          ctx.float(ctx.npc.x, ctx.npc.y - 50, `RUN DOWN ×${run.n}`, '#ffb27a');
          ctx.sfx('slash');
        }
        stacks = 0;
        run = null;
      }
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (alive(n) && stacks > 0) {
        for (let i = 0; i < stacks; i++) {
          g.fillStyle(BLOOD, 0.85); g.fillCircle(n.x - 16 + i * 8, n.y - 46, 2.6);
        }
      }
      if (run && alive(n)) {
        const k = clamp((time - run.at) / RUN, 0, 1);
        const x = run.fx + (n.x - run.fx) * k, y = run.fy + (n.y + 6 - run.fy) * k;
        hound(g, x, y, n.x > run.fx ? 1 : -1, 0.9, time / 40, 0xb8c8d8, 0.55 + k * 0.35, HUNT_RED);
      }
    },
  };
};

/**
 * Reed Cloak — keep still 1.2s and reeds weave up round you. While woven, every hit you take is
 * half-mended at once. Leave the weave and your first landed hit within 3s strikes again for
 * 60% of itself — the ambush shot.
 */
const reedCloak: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const tick = frameClock();
  let still = 0, woven = false, ambushUntil = 0, wovenAt = 0;
  let px = ctx.player.x, py = ctx.player.y;
  let self = false;
  return {
    update(time) {
      const dt = tick(time);
      const moved = dist(ctx.player.x, ctx.player.y, px, py);
      px = ctx.player.x; py = ctx.player.y;
      if (moved < 0.6) {
        still += dt;
        if (!woven && still >= 1.2) { woven = true; wovenAt = time; ctx.sfx('whoosh'); }
      } else {
        if (woven) { ambushUntil = time + 3000; ctx.float(px, py - 50, 'AMBUSH', '#ffe08a'); }
        woven = false; still = 0;
      }
    },
    onHitTaken(amount) {
      if (woven && amount > 0 && alive(ctx.player)) ctx.heal(ctx.player, Math.max(1, Math.round(amount * 0.5)));
    },
    onHitDealt(amount) {
      if (self || amount <= 0) return;
      if (ctx.scene.time.now < ambushUntil) {
        ambushUntil = 0;
        self = true; ctx.hit(ctx.npc, Math.max(1, Math.round(amount * 0.6)), ctx.npc.x, ctx.npc.y); self = false;
        ctx.float(ctx.npc.x, ctx.npc.y - 56, 'FROM THE REEDS', '#ffe08a');
        ctx.sfx('crit');
      }
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!alive(p)) return;
      if (woven) {
        const k = clamp((time - wovenAt) / 300, 0, 1);
        reedHide(g, p.x, p.y + 14, 30 * k + 4, time / 1000, 0.8 * k, true);
      } else if (still > 0.15) {
        g.lineStyle(2, 0xb8a860, 0.7);
        g.beginPath(); g.arc(p.x, p.y + 4, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(still / 1.2, 0, 1), false); g.strokePath();
      }
      if (time < ambushUntil) {
        g.fillStyle(GILT, 0.9); g.fillTriangle(p.x - 5, p.y - 60, p.x + 5, p.y - 60, p.x, p.y - 51);
        g.lineStyle(2, 0xe8dcc0, 0.9); g.lineBetween(p.x, p.y - 60, p.x, p.y - 74);
      }
    },
  };
};

/**
 * Hallooing Horn — every third ability you cast blows the horn: a ring rolls out from you and
 * hits the foe for 6 as it passes them. 1.1s after it reaches the trees, the echo rolls back in
 * from the far side and hits them for 6 again.
 */
const hallooingHorn: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const SPD = 320;
  interface Call { x: number; y: number; at: number; hit: boolean; echoAt: number; echoFromLeft: boolean; echoHit: boolean }
  let casts = 0;
  let calls: Call[] = [];
  return {
    onCast() {
      casts++;
      if (casts % 3 !== 0) return;
      const p = ctx.player, now = ctx.scene.time.now;
      const fromLeft = p.x > ctx.W / 2;
      const reach = (Math.max(p.x, ctx.W - p.x) / SPD) * 1000;
      calls.push({ x: p.x, y: p.y, at: now, hit: false, echoAt: now + reach + 1100, echoFromLeft: fromLeft, echoHit: false });
      ctx.sfx('sonic-pulse');
    },
    update(time) {
      const n = ctx.npc;
      for (const c of calls) {
        const r = ((time - c.at) / 1000) * SPD;
        if (!c.hit && alive(n) && r >= dist(c.x, c.y, n.x, n.y)) {
          c.hit = true; ctx.hit(n, 6, n.x, n.y);
        }
        if (!c.echoHit && time >= c.echoAt && alive(n)) {
          const fx = ((time - c.echoAt) / 1000) * SPD;
          const front = c.echoFromLeft ? fx : ctx.W - fx;
          if (c.echoFromLeft ? front >= n.x : front <= n.x) {
            c.echoHit = true; ctx.hit(n, 6, n.x, n.y);
            ctx.float(n.x, n.y - 50, 'ECHO', '#e8e0ff');
          }
        }
      }
      calls = calls.filter((c) => time < c.echoAt + (ctx.W / SPD) * 1000 + 200);
    },
    drawAir(g, time) {
      for (const c of calls) {
        const r = ((time - c.at) / 1000) * SPD;
        if (r < ctx.W * 1.2) { g.lineStyle(4, 0xffd27a, 0.6 * clamp(1 - r / (ctx.W * 1.2), 0, 1)); g.strokeCircle(c.x, c.y, r); }
        if (time >= c.echoAt) {
          const fx = ((time - c.echoAt) / 1000) * SPD;
          const x = c.echoFromLeft ? fx : ctx.W - fx;
          if (x > -10 && x < ctx.W + 10) {
            g.lineStyle(3, 0xe8e0ff, 0.55);
            for (let y = 100; y < ctx.H; y += 18) g.lineBetween(x, y, x + (c.echoFromLeft ? 4 : -4), y + 10);
          }
        }
      }
      const p = ctx.player;
      if (alive(p) && casts % 3 === 2) huntingHorn(g, p.x - 26, p.y - 30, 8, -1, 0.85);
    },
  };
};

/**
 * Falconer's Gauntlet — a hawk rides with you. Every 9s it marks the foe with its shadow for
 * 2.5s. Land a hit on them while the shadow is on them and the hawk stoops: 18 damage.
 */
const falconersGauntlet: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const PERIOD = 9000, MARK = 2500;
  let next = ctx.scene.time.now + 5000;
  let markUntil = 0, stoopAt = -9999, stoopX = 0, stoopY = 0;
  let self = false;
  return {
    update(time) {
      if (time >= next && alive(ctx.npc)) { next = time + PERIOD; markUntil = time + MARK; ctx.sfx('wings'); }
    },
    onHitDealt(amount) {
      if (self || amount <= 0) return;
      const now = ctx.scene.time.now;
      if (now < markUntil && alive(ctx.npc)) {
        markUntil = 0;
        stoopAt = now; stoopX = ctx.npc.x; stoopY = ctx.npc.y;
        self = true; ctx.hit(ctx.npc, 18, ctx.npc.x, ctx.npc.y); self = false;
        ctx.float(ctx.npc.x, ctx.npc.y - 56, 'STOOP!', '#ffd84a');
        ctx.sfx('slash');
      }
    },
    drawGround(g, time) {
      const n = ctx.npc;
      if (time < markUntil && alive(n)) {
        const k = (markUntil - time) / MARK;
        g.fillStyle(0x000000, 0.35); g.fillEllipse(n.x, n.y + 16, 34, 12);
        g.lineStyle(2, 0xffd84a, 0.8);
        g.beginPath(); g.arc(n.x, n.y + 16, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k, false); g.strokePath();
      }
    },
    drawAir(g, time) {
      const ts = time / 1000;
      const n = ctx.npc, p = ctx.player;
      if (time < markUntil && alive(n)) falcon(g, n.x, n.y - 120 + Math.sin(ts * 3) * 6, -Math.PI / 2, Math.sin(ts * 16), 0.9);
      else if (time - stoopAt < 400) {
        const k = (time - stoopAt) / 400;
        falcon(g, stoopX, stoopY - 120 * (1 - k), Math.PI / 2, 0, 0.9, 1 - k * 0.5, 1);
      } else if (alive(p)) {
        falcon(g, p.x + 22, p.y - 26, -Math.PI / 2 + 0.3, 0.2 * Math.sin(ts * 2), 0.55);
      }
    },
  };
};

/**
 * Fang's Hunting Pelt (artifact) — *The Chase*: every half-second you spend closing on the foe
 * builds Chase (up to 8; it bleeds away while you are not). Your next landed hit spends it all:
 * +3 damage per stack. *The Beast Within*: below half health, your hits heal you 15% of what they
 * deal, and you run 10% faster.
 */
const huntingPelt: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const MAX = 8;
  let chase = 0, acc = 0, lastD = dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y);
  let spdUntil = 0;
  let self = false;
  let spentAt = -9999;
  const tick = frameClock();
  const beast = (): boolean => ctx.player.hp < ctx.player.maxHp * 0.5;
  return {
    update(time) {
      const dt = tick(time);
      const d = dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y);
      const closing = d < lastD - 0.5;
      lastD = d;
      acc += closing ? dt : -dt * 0.5;
      if (acc >= 0.5) { acc = 0; if (chase < MAX) chase++; }
      if (acc <= -1) { acc = 0; if (chase > 0) chase--; }
      if (beast() && alive(ctx.player) && time >= spdUntil) { spdUntil = time + 400; ctx.boostSpeed(1.1, 400); }
    },
    onHitDealt(amount) {
      if (self || amount <= 0) return;
      if (chase > 0 && alive(ctx.npc)) {
        self = true; ctx.hit(ctx.npc, chase * 3, ctx.npc.x, ctx.npc.y); self = false;
        ctx.float(ctx.npc.x, ctx.npc.y - 56, `RUN DOWN +${chase * 3}`, '#ff9a6a');
        ctx.sfx('hit-heavy');
        chase = 0; spentAt = ctx.scene.time.now;
      }
      if (beast() && alive(ctx.player)) ctx.heal(ctx.player, Math.max(1, Math.round(amount * 0.15)));
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!alive(p)) return;
      // Chase pips: a row of pawprint dots over your head.
      for (let i = 0; i < chase; i++) { g.fillStyle(HUNT_RED, 0.9); g.fillCircle(p.x - 21 + i * 6, p.y - 52, 2.2); }
      if (beast()) {
        // A wolf-pelt mantle over your shoulders and two ears.
        g.fillStyle(WOLF, 0.85); g.fillEllipse(p.x, p.y - 14, 40, 14);
        g.fillStyle(WOLF_LIT, 0.8);
        g.fillTriangle(p.x - 14, p.y - 26, p.x - 8, p.y - 40, p.x - 3, p.y - 26);
        g.fillTriangle(p.x + 14, p.y - 26, p.x + 8, p.y - 40, p.x + 3, p.y - 26);
      } else {
        g.fillStyle(FUR, 0.6); g.fillEllipse(p.x, p.y - 14, 34, 9);
      }
      if (time - spentAt < 350) {
        const k = (time - spentAt) / 350;
        const n = ctx.npc;
        g.lineStyle(3, 0xffffff, 1 - k);
        for (let i = 0; i < 3; i++) g.lineBetween(n.x - 14 + i * 12, n.y - 22, n.x - 4 + i * 12, n.y + 10);
      }
    },
  };
};

export const WILDHUNT_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_COLLAR]: houndstoothCollar,
  [CHARM_REEDS]: reedCloak,
  [CHARM_HORN]: hallooingHorn,
  [CHARM_GAUNTLET]: falconersGauntlet,
  [ART_FANG]: huntingPelt,
};

// ── Item defs ────────────────────────────────────────────────────────

export const WILDHUNT_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_COLLAR, name: 'Houndstooth Collar', emoji: '🦴', kind: 'charm', price: 260, isle: 'life',
    flavor: 'An oxblood pack-collar, a hound\'s tooth threaded on it. Pip says the dog it belonged to still comes when it\'s worn.',
    script: CHARM_COLLAR,
    scriptText: [
      'Your hits leave blood scent on the foe (+1, up to 5; fades 1 per 4s without a hit).',
      'Every 8s a phantom hound runs them down: 3 damage per scent, then the scent is spent.',
    ],
  },
  {
    id: CHARM_REEDS, name: 'Reed Cloak', emoji: '🌾', kind: 'charm', price: 340, isle: 'life',
    flavor: 'One of Blindkeeper Fern\'s old weaves, cut down to a cloak. Stand still and it remembers it was a hide.',
    effect: { maxHp: 6 },
    script: CHARM_REEDS,
    scriptText: [
      'Keep still 1.2s and reeds weave round you: hits taken while woven are half-mended at once.',
      'Leave the weave and your first hit within 3s strikes again for 60% of itself.',
    ],
  },
  {
    id: CHARM_HORN, name: 'Hallooing Horn', emoji: '📯', kind: 'charm', price: 480, isle: 'life',
    flavor: 'Halloo\'s practice horn. It is not loud. The trees still answer it, which is the unsettling part.',
    script: CHARM_HORN,
    scriptText: [
      'Every 3rd ability you cast blows the horn: a ring rolls out and hits the foe for 6.',
      'Its echo rolls back from the far side a moment later and hits them for 6 again.',
    ],
  },
  {
    id: CHARM_GAUNTLET, name: 'Falconer\'s Gauntlet', emoji: '🦅', kind: 'charm', price: 690, isle: 'life',
    flavor: 'Kestrel\'s spare glove, scored by talons. A hawk you never quite see rides it.',
    effect: { critChance: 0.02 },
    script: CHARM_GAUNTLET,
    scriptText: [
      'Every 9s a hawk marks the foe with its shadow for 2.5s.',
      'Land a hit while they are marked and it stoops on them for 18.',
    ],
  },
  {
    id: ART_FANG, name: 'Fang\'s Hunting Pelt', emoji: '🐺', kind: 'artifact', isle: 'life',
    flavor: 'The wolf-skin the Prince rode in, still warm. It wants to run something down, and it is not fussy what.',
    script: ART_FANG,
    scriptText: [
      'The Chase: closing on the foe builds Chase (up to 8). Your next hit spends it: +3 damage per stack.',
      'The Beast Within: below half health, your hits heal 15% of their damage and you run 10% faster.',
    ],
  },
  // The Ford pool's fish.
  {
    id: 'fish-ford-salmon', name: 'Ford Salmon', emoji: '🐟', kind: 'fish', sell: 26, isle: 'life',
    flavor: 'Silver-pink and full of the sea, run up the river to spawn. Ottilie counts them past the stones each year.',
    effect: { regenPerSecond: 0.5 },
  },
  {
    id: 'fish-antler-pike', name: 'Antler Pike', emoji: '🐊', kind: 'fish', sell: 72, isle: 'life',
    flavor: 'Bony ridges over its eyes like a young stag\'s tines. Takes anything bright. Ask the Wades.',
    effect: { damageMult: 1.04 },
  },
];
