import type { FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow } from '../../../../art/IsleArt';
import { gear, glint, lens } from './art';
import { BLUEPRINT, BRASS, BRASS_DARK, BRASS_LIT, CYAN, GOLD, HEAT_WHITE, IRON_DARK, IRON_LIT, MOLTEN, STEAM, SUN } from './palette';
import { alive, clamp, dist, segDist } from './util';

/**
 * The Workshop Court's goods: Odile Ferrule's four charms, Prince Artifex's mainspring, and the
 * quench tank's three fish. Every charm is a bit of the Workshop that took to fighting — a beetle
 * that marches where you look, a loupe that focuses the noon, tongs that quench you, and a patent
 * seal that pays out for invention. Scripts are registered below under their item ids.
 */

const ISLE = 'light';

export const CHARM_BEETLE = 'workshop-charm-beetle';
export const CHARM_LOUPE = 'workshop-charm-loupe';
export const CHARM_TONGS = 'workshop-charm-tongs';
export const CHARM_PATENT = 'workshop-charm-patent';
export const ART_ARTIFEX = 'art-artifex';

export const FISH_BLEAK = 'fish-brass-bleak';
export const FISH_GUDGEON = 'fish-gear-gudgeon';
export const FISH_LOACH = 'fish-lens-loach';
export const FISHERY = 'workshop-tank';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Wind-Up Beetle ───────────────────────────────────────────────────
// Every 8s a little brass beetle winds up at your feet; when it is wound it sets off the way you are
// facing and marches straight. If it reaches your foe it pops on them.

const beetle: ItemScriptFactory = (ctx) => {
  const EVERY = 8000, WIND = 900, MARCH = 2600, SPEED = 160, REACH = 36;
  let cycle = -1;
  let state: 'wind' | 'march' | 'idle' = 'idle';
  let x = 0, y = 0, a = 0, at = 0;
  let popAt = -9999, popX = 0, popY = 0;
  return {
    update(time, dtRaw) {
      const dt = clamp(dtRaw, 0, 0.1);
      if (!live(ctx)) return;
      if (cycle < 0) cycle = time;
      if (state === 'idle' && time - cycle >= EVERY - WIND) { state = 'wind'; at = time; }
      if (state === 'wind') {
        x = ctx.player.x + 16; y = ctx.player.y + 18;
        if (time - at >= WIND) { state = 'march'; at = time; a = ctx.facing(ctx.player); ctx.sfx('gear-turn'); }
      } else if (state === 'march') {
        x += Math.cos(a) * SPEED * dt; y += Math.sin(a) * SPEED * dt;
        const hitFoe = foeLive(ctx) && dist(x, y, ctx.npc.x, ctx.npc.y) < REACH;
        if (hitFoe || time - at >= MARCH || x < 20 || x > ctx.W - 20 || y < 96 || y > ctx.H - 10) {
          if (hitFoe) {
            ctx.hit(ctx.npc, 12, ctx.npc.x, ctx.npc.y);
            ctx.stun(ctx.npc, 300);
            ctx.float(ctx.npc.x, ctx.npc.y - 50, 'POP!', '#f6d98a');
            ctx.sfx('explosion-small');
          }
          popAt = time; popX = x; popY = y;
          state = 'idle';
          cycle = time;
        }
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      if (state === 'wind' || state === 'march') {
        const k = state === 'wind' ? clamp((time - at) / WIND, 0, 1) : 1;
        const ca = Math.cos(a), sa = Math.sin(a);
        g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 6, 18, 6);
        g.fillStyle(BRASS_DARK, 1); g.fillCircle(x, y, 7);
        g.fillStyle(BRASS, 1); g.fillEllipse(x - sa * 2, y + ca * 2, 11, 7); g.fillEllipse(x + sa * 2, y - ca * 2, 11, 7);
        g.fillStyle(IRON_DARK, 1); g.fillCircle(x + ca * 8, y + sa * 8, 3);
        // Its key, spinning as it winds.
        const r = state === 'wind' ? time / 40 : time / 160;
        g.lineStyle(1.5, BRASS_LIT, 1);
        g.strokeEllipse(x + Math.cos(r) * 3, y - 9, Math.abs(Math.cos(r)) * 5 + 1, 4);
        g.strokeEllipse(x - Math.cos(r) * 3, y - 9, Math.abs(Math.cos(r)) * 5 + 1, 4);
        if (state === 'wind') {
          // Where it will go: your aim, shown as it finishes winding.
          const fa = ctx.facing(ctx.player);
          g.lineStyle(1.5, BRASS_LIT, 0.2 + k * 0.4);
          g.lineBetween(x, y, x + Math.cos(fa) * 70 * k, y + Math.sin(fa) * 70 * k);
        }
      }
      if (time - popAt < 400) {
        const k = (time - popAt) / 400;
        g.lineStyle(2, BRASS_LIT, 1 - k); g.strokeCircle(popX, popY, 8 + k * 26);
      }
    },
  };
};

// ── Grinder's Loupe ──────────────────────────────────────────────────
// The loupe focuses the noon into a burning dot that rides ahead of you along your aim. Hold it on
// your foe and they scorch.

const loupe: ItemScriptFactory = (ctx) => {
  const AHEAD = 150, R = 32, HEAT_MS = 900, COOL_MS = 2500;
  let heat = 0;
  let cooldownUntil = 0;
  let scorchAt = -9999;
  const dot = () => {
    const a = ctx.facing(ctx.player);
    return { x: ctx.player.x + Math.cos(a) * AHEAD, y: ctx.player.y + Math.sin(a) * AHEAD };
  };
  return {
    update(time, dtRaw) {
      const dt = clamp(dtRaw, 0, 0.1);
      if (!live(ctx) || !foeLive(ctx) || time < cooldownUntil) { heat = 0; return; }
      const d = dot();
      if (dist(d.x, d.y, ctx.npc.x, ctx.npc.y) < R) heat += dt * 1000;
      else heat = Math.max(0, heat - dt * 1500);
      if (heat >= HEAT_MS) {
        heat = 0;
        cooldownUntil = time + COOL_MS;
        scorchAt = time;
        ctx.hit(ctx.npc, 11, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 50, 'SCORCHED', '#fff4c0');
        ctx.sfx('sizzle');
      }
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const d = dot();
      const k = clamp(heat / HEAT_MS, 0, 1);
      const cooling = time < cooldownUntil;
      glow(g, d.x, d.y, 10 + k * 16, SUN, cooling ? 0.02 : 0.05 + k * 0.08, 3);
      g.fillStyle(cooling ? 0xd8d0b8 : HEAT_WHITE, cooling ? 0.3 : 0.7 + k * 0.3); g.fillCircle(d.x, d.y, 3 + k * 4);
      if (k > 0) { g.lineStyle(1.5, SUN, 0.5); g.strokeCircle(d.x, d.y, R * (1 - k) + 6); }
      if (time - scorchAt < 500) { const s = (time - scorchAt) / 500; g.fillStyle(0xffffff, 0.6 * (1 - s)); g.fillCircle(ctx.npc.x, ctx.npc.y, 20 + s * 20); }
    },
    drawAir(g) {
      if (!live(ctx)) return;
      // The loupe itself, on a chain at your shoulder.
      const p = ctx.player;
      g.lineStyle(1, BRASS_DARK, 1); g.lineBetween(p.x + 14, p.y - 30, p.x + 20, p.y - 22);
      lens(g, p.x + 22, p.y - 18, 5);
    },
  };
};

// ── Quenching Tongs ──────────────────────────────────────────────────
// A heavy blow quenches you in a burst of steam: every ability you have used this fight cools by
// 1.5s, and a foe standing close is scalded.

const tongs: ItemScriptFactory = (ctx) => {
  const COOLDOWN = 8000, REFUND = 1500, R = 130;
  const used = new Set<string>();
  let readyAt = 0;
  let ventAt = -9999;
  return {
    onCast(abilityId) { used.add(abilityId); },
    onHitTaken(amount) {
      const now = ctx.scene.time.now;
      if (amount < 10 || now < readyAt || !live(ctx)) return;
      readyAt = now + COOLDOWN;
      ventAt = now;
      for (const id of used) ctx.refund(id, REFUND);
      if (foeLive(ctx) && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < R) {
        ctx.hit(ctx.npc, 7, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 50, 'SCALDED', '#d8f0f0');
      }
      ctx.float(ctx.player.x, ctx.player.y - 56, 'QUENCHED', '#d8f0f0');
      ctx.sfx('sizzle');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      if (time - ventAt < 900) {
        const k = (time - ventAt) / 900;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          g.fillStyle(STEAM, 0.4 * (1 - k)); g.fillCircle(p.x + Math.cos(a) * (20 + k * 90), p.y + Math.sin(a) * (16 + k * 70) - k * 30, 10 + k * 18);
        }
      }
      // Ready: the tongs glint at your hip; spent: they glow cherry and cool.
      const cooling = time < readyAt;
      const c = cooling ? MOLTEN : IRON_LIT;
      g.lineStyle(2, c, 1); g.lineBetween(p.x - 18, p.y + 4, p.x - 22, p.y + 20); g.lineBetween(p.x - 14, p.y + 4, p.x - 12, p.y + 20);
      if (!cooling && Math.sin(time / 400) > 0.9) glint(g, p.x - 18, p.y + 6, 0.8, 6);
    },
  };
};

// ── Patent Pending ───────────────────────────────────────────────────
// Invention pays. Cast four different abilities in a row — no repeats — and the patent is granted:
// the foe takes a heavy hit and your blows land harder for a while. Repeat yourself and the draft
// is torn up.

const patent: ItemScriptFactory = (ctx) => {
  const NEED = 4;
  let run: string[] = [];
  let grantedAt = -9999;
  let tornAt = -9999;
  return {
    onCast(abilityId) {
      if (!live(ctx)) return;
      const now = ctx.scene.time.now;
      if (run.includes(abilityId)) {
        if (run.length >= 2) { tornAt = now; ctx.float(ctx.player.x, ctx.player.y - 56, 'DRAFT TORN', '#a8c0e0'); }
        run = [abilityId];
        return;
      }
      run.push(abilityId);
      if (run.length >= NEED) {
        run = [];
        grantedAt = now;
        if (foeLive(ctx)) ctx.hit(ctx.npc, 18, ctx.npc.x, ctx.npc.y);
        ctx.boostDamage(1.25, 3000);
        ctx.float(ctx.player.x, ctx.player.y - 60, 'PATENT GRANTED', '#f2c84a');
        ctx.sfx('jackpot');
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // Four pips over your head: each a different invention drafted.
      for (let i = 0; i < NEED; i++) {
        const x = p.x - 18 + i * 12, y = p.y - 50;
        g.fillStyle(i < run.length ? CYAN : BLUEPRINT, i < run.length ? 0.95 : 0.55); g.fillRect(x - 4, y - 4, 8, 8);
        g.lineStyle(1, BRASS, 0.8); g.strokeRect(x - 4, y - 4, 8, 8);
      }
      if (time - grantedAt < 3000) {
        const k = (time - grantedAt) / 3000;
        g.fillStyle(GOLD, 0.9 * (1 - k)); g.fillCircle(p.x + 24, p.y - 46, 6);
        g.lineStyle(1.5, BRASS_DARK, 1 - k); g.strokeCircle(p.x + 24, p.y - 46, 6);
      }
      if (time - tornAt < 500) {
        const k = (time - tornAt) / 500;
        for (let i = 0; i < 4; i++) { g.fillStyle(BLUEPRINT, 1 - k); g.fillRect(p.x - 10 + i * 6 + k * (i - 1.5) * 20, p.y - 50 + k * 20, 5, 7); }
      }
    },
  };
};

// ── Artifex's Mainspring ─────────────────────────────────────────────
// Every cast winds it a tooth. At six it lets go: a lens-beam lances from you along your aim. Once a
// fight, dropping low, it unwinds into you instead.

const mainspring: ItemScriptFactory = (ctx) => {
  const TEETH = 6, LEN = 700, HALF = 24;
  let wound = 0;
  let beamAt = -9999, beamA = 0, bx = 0, by = 0;
  let saved = false;
  let healUntil = 0, healAcc = 0;
  return {
    onCast() {
      if (!live(ctx)) return;
      wound++;
      if (wound < TEETH) { ctx.sfx('clock-tick'); return; }
      wound = 0;
      beamAt = ctx.scene.time.now;
      beamA = ctx.facing(ctx.player);
      bx = ctx.player.x; by = ctx.player.y - 14;
      ctx.sfx('light-beam');
      if (foeLive(ctx) && segDist(ctx.npc.x, ctx.npc.y, bx, by, bx + Math.cos(beamA) * LEN, by + Math.sin(beamA) * LEN) < HALF) {
        ctx.hit(ctx.npc, 20, ctx.npc.x, ctx.npc.y);
        ctx.float(ctx.npc.x, ctx.npc.y - 52, 'MAINSPRING', '#ffe08a');
      }
    },
    onHitTaken() {
      if (saved || !live(ctx) || ctx.player.hp > ctx.player.maxHp * 0.3) return;
      saved = true;
      healUntil = ctx.scene.time.now + 3000;
      ctx.boostSpeed(1.3, 3000);
      ctx.float(ctx.player.x, ctx.player.y - 56, 'UNWOUND', '#ffe08a');
      ctx.sfx('gear-turn');
    },
    update(time, dtRaw) {
      const dt = clamp(dtRaw, 0, 0.1);
      if (time < healUntil && live(ctx)) {
        healAcc += 8 * dt;
        if (healAcc >= 1) { const n = Math.floor(healAcc); healAcc -= n; ctx.heal(ctx.player, n); }
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // The mainspring at your shoulder: a gear whose teeth light as it winds.
      const gx = p.x - 24, gy = p.y - 30;
      gear(g, gx, gy, 7, TEETH, BRASS, 1, time < healUntil ? -time / 60 : wound * 0.6);
      for (let i = 0; i < wound; i++) {
        const a = -Math.PI / 2 + (i / TEETH) * Math.PI * 2;
        g.fillStyle(SUN, 1); g.fillCircle(gx + Math.cos(a) * 10, gy + Math.sin(a) * 10, 1.8);
      }
      if (time - beamAt < 260) {
        const k = (time - beamAt) / 260;
        const ex = bx + Math.cos(beamA) * LEN, ey = by + Math.sin(beamA) * LEN;
        g.lineStyle(HALF * 1.4, SUN, 0.25 * (1 - k)); g.lineBetween(bx, by, ex, ey);
        g.lineStyle(6, 0xffffff, 0.9 * (1 - k)); g.lineBetween(bx, by, ex, ey);
      }
    },
  };
};

export const WORKSHOP_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_BEETLE, name: 'Wind-Up Beetle', emoji: '🪲', kind: 'charm', price: 480, isle: ISLE,
    flavor: 'A brass beetle the length of a thumb, from one of Gizmo\'s rejected batches. It marches. It is not sure why.',
    script: CHARM_BEETLE,
    scriptText: [
      'Every 8s a little beetle winds up at your feet, then marches straight the way you are facing.',
      'If it reaches your foe it pops on them: 12 damage and a short stagger.',
    ],
  },
  {
    id: CHARM_LOUPE, name: 'Grinder\'s Loupe', emoji: '🔍', kind: 'charm', price: 720, isle: ISLE,
    flavor: 'A lens-grinder\'s eyepiece on a chain. Hold it the wrong way round and it focuses the noon into a dot.',
    script: CHARM_LOUPE,
    scriptText: [
      'A burning dot rides 150px ahead of you along your aim.',
      'Hold it on your foe for about a second to scorch them for 11 (then it cools for 2.5s).',
    ],
  },
  {
    id: CHARM_TONGS, name: 'Quenching Tongs', emoji: '🔧', kind: 'charm', price: 880, isle: ISLE,
    flavor: 'Old Sprue\'s spare pair, black from forty years in the quench tank. They hiss when you pick them up.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_TONGS,
    scriptText: [
      'Taking a hit of 10 or more quenches you (at most every 8s): every ability you have used cools 1.5s.',
      'A foe within 130px of you when it vents is scalded for 7.',
    ],
  },
  {
    id: CHARM_PATENT, name: 'Patent Pending', emoji: '📜', kind: 'charm', price: 1150, isle: ISLE,
    flavor: 'A brass seal from the Patent Office, its die worn smooth. Hesper Vane says it was never used to grant anything.',
    effect: { maxHp: 6 },
    script: CHARM_PATENT,
    scriptText: [
      'Cast four different abilities in a row, no repeats, and the patent is granted:',
      'the foe takes 18 and you deal +25% damage for 3s. Repeating an ability tears up the draft.',
    ],
  },
  {
    id: ART_ARTIFEX, name: 'Artifex\'s Mainspring', emoji: '⚙️', kind: 'artifact', isle: ISLE,
    flavor: 'The spring meant to drive the Magnum Opus. It was always wound. He never let it go.',
    effect: { maxHp: 14 },
    script: ART_ARTIFEX,
    scriptText: [
      'Every cast winds it one tooth. At 6 it lets go: a lens-beam along your aim hits the foe for 20.',
      'Once a fight, dropping under 30% health, it unwinds into you: heal 24 over 3s and +30% speed.',
    ],
  },
  {
    id: FISH_BLEAK, name: 'Brass Bleak', emoji: '🐟', kind: 'fish', sell: 24, isle: ISLE,
    flavor: 'A thin quick fish with scales like filed brass. Bred itself in the quench tank\'s heat. Tastes of pennies.',
    effect: { speedMult: 1.03 },
  },
  {
    id: FISH_GUDGEON, name: 'Gear Gudgeon', emoji: '🐠', kind: 'fish', sell: 40, isle: ISLE,
    flavor: 'Its dorsal fin is notched like a cog. It nibbles at the tank\'s cold-pipes and makes them tick.',
    effect: { cooldownMult: 0.97 },
  },
  {
    id: FISH_LOACH, name: 'Lens Loach', emoji: '🐡', kind: 'fish', sell: 64, isle: ISLE,
    flavor: 'Clear as ground glass from nose to tail. Hold it up and it focuses the sun into a dot on your palm.',
    effect: { critChance: 0.04 },
  },
];

export const WORKSHOP_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_BEETLE]: beetle,
  [CHARM_LOUPE]: loupe,
  [CHARM_TONGS]: tongs,
  [CHARM_PATENT]: patent,
  [ART_ARTIFEX]: mainspring,
};

export const WORKSHOP_SHOPS: ShopDef[] = [
  { id: 'workshop-shop', name: 'The Spare Parts', stock: [CHARM_BEETLE, CHARM_LOUPE, CHARM_TONGS, CHARM_PATENT], buys: true },
];

export const WORKSHOP_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Quench Tank', kind: 'steam' }];

export const WORKSHOP_FISH: FishDef[] = [
  { id: FISH_BLEAK, fisheries: [FISHERY], weight: 6, fight: 1, size: [9, 22] },
  { id: FISH_GUDGEON, fisheries: [FISHERY], weight: 3, fight: 3, size: [14, 30] },
  { id: FISH_LOACH, fisheries: [FISHERY], weight: 1, fight: 4, size: [18, 40] },
];
