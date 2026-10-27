import type { FishDef, FisheryDef, IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { mixC } from '../../../../art/IsleArt';
import { ABY, alive, dist, drawEsca, drawJaws, makeClock } from './palette';

/**
 * The Abyssal Court's goods: four charms from Purser Gilly's Pressure Hull, Prince
 * Lanternjaw's artifact, and the three fish of the trench. Every charm and the artifact runs a
 * script that changes how you fight — weight you carry, a chain you string, a gullet you fill,
 * lights you plant — not just how hard you hit.
 */

/**
 * A multiplier held for as long as you keep refreshing it. The kit stacks damage and speed
 * windows multiplicatively, so a script re-issues one only as the last expires — never two at
 * once — and the value can change between windows.
 */
function heldWindow(push: (mult: number, ms: number) => void, ms = 500): (time: number, mult: number) => void {
  let until = 0;
  return (time, mult) => {
    if (time < until || Math.abs(mult - 1) < 0.001) return;
    until = time + ms;
    push(mult, ms);
  };
}

// ── Charm scripts ────────────────────────────────────────────────────

/**
 * Ballast Stone — every hit you take hangs another weight on you (four at most). Each weight
 * slows you 4% and makes your blows land 7% heavier. Cast F to cut the ballast loose: the
 * stones drop all at once in a shockwave that hits a nearby foe for 6 per stone.
 */
const ballast: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let weights = 0;
  let droppedAt = -9999, dropN = 0;
  let now = 0;
  const dmg = heldWindow((m, ms) => ctx.boostDamage(m, ms));
  const spd = heldWindow((m, ms) => ctx.boostSpeed(m, ms));
  return {
    update(time) {
      now = time;
      if (weights > 0) { dmg(time, 1 + weights * 0.07); spd(time, 1 - weights * 0.04); }
    },
    onHitTaken(amount) {
      if (amount <= 0 || weights >= 4) return;
      weights++;
      ctx.float(ctx.player.x, ctx.player.y - 44, weights === 4 ? 'FULL BALLAST' : '+ballast', '#aeb8c4');
      ctx.sfx('stone-rise');
    },
    onCast(_id, slot) {
      if (slot !== 'f' || weights <= 0) return;
      const p = ctx.player, n = ctx.npc;
      dropN = weights; droppedAt = now;
      if (alive(n) && dist(p.x, p.y, n.x, n.y) < 140) {
        ctx.hit(n, 6 * weights, n.x, n.y);
        ctx.float(n.x, n.y - 44, 'BALLAST DROPPED', '#aeb8c4');
      }
      ctx.sfx('gravity-slam');
      weights = 0;
    },
    drawGround(g, time) {
      const p = ctx.player;
      const k = (time - droppedAt) / 500;
      if (k >= 0 && k < 1) {
        g.lineStyle(5 * (1 - k), 0x8a96a4, 0.8 * (1 - k)); g.strokeEllipse(p.x, p.y + 10, 280 * k, 150 * k);
        for (let i = 0; i < dropN; i++) { g.fillStyle(0x4a5058, 1 - k); g.fillEllipse(p.x + (i - dropN / 2) * 14, p.y + 14, 12, 7); }
      }
      // The stones hang off you on cords, swinging as you move.
      for (let i = 0; i < weights; i++) {
        const a = Math.PI * 0.2 + (i / 4) * Math.PI * 0.6 + Math.sin(time / 300 + i) * 0.1;
        const x = p.x + Math.cos(a) * 22, y = p.y + 6 + Math.sin(a) * 12;
        g.lineStyle(1, 0x8a7a5a, 0.8); g.lineBetween(p.x, p.y, x, y);
        g.fillStyle(0x2a3038, 1); g.fillEllipse(x, y + 2, 10, 7);
        g.fillStyle(0x5a6470, 1); g.fillEllipse(x - 1, y, 8, 5);
      }
    },
  };
};

/**
 * Siphonophore Chain — a colony of glowing links. Every hit you land within reach strings
 * another link between you and the foe (six at most); the chain fades a link at a time if you
 * stop. Step away hard — past 300px — and it snaps, lashing the foe for 5 per link. Hit close,
 * then break off.
 */
const siphonophore: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let links = 0;
  let lastAdd = 0;
  let now = 0;
  let snapAt = -9999, snapX = 0, snapY = 0;
  return {
    update(time) {
      now = time;
      const p = ctx.player, n = ctx.npc;
      if (links > 0 && time - lastAdd > 2500) { links--; lastAdd = time; }
      if (links > 0 && alive(n) && dist(p.x, p.y, n.x, n.y) > 300) {
        ctx.hit(n, links * 5, n.x, n.y);
        ctx.float(n.x, n.y - 44, `CHAIN SNAPS ×${links}`, '#9ff8ec');
        ctx.sfx('snap-back');
        snapAt = time; snapX = (p.x + n.x) / 2; snapY = (p.y + n.y) / 2;
        links = 0;
      }
    },
    onHitDealt() {
      const p = ctx.player, n = ctx.npc;
      if (dist(p.x, p.y, n.x, n.y) > 220 || links >= 6) return;
      links++;
      lastAdd = now;
      if (links === 6) ctx.float(p.x, p.y - 44, 'chain taut', '#9ff8ec');
    },
    drawAir(g, time) {
      const p = ctx.player, n = ctx.npc;
      if (links > 0 && alive(n)) {
        const d = dist(p.x, p.y, n.x, n.y);
        const strain = Math.min(1, d / 300);
        for (let i = 1; i <= links; i++) {
          const t = i / (links + 1);
          const sag = (1 - strain) * 24 * Math.sin(t * Math.PI);
          const x = p.x + (n.x - p.x) * t, y = p.y + (n.y - p.y) * t + sag;
          const pulse = 0.6 + 0.4 * Math.sin(time / 140 - i);
          g.fillStyle(ABY.coralCyan, 0.15 * pulse); g.fillCircle(x, y, 9);
          g.fillStyle(mixC(ABY.coralCyan, 0xff6a6a, strain * 0.6), 0.9 * pulse); g.fillEllipse(x, y, 7, 5);
        }
        g.lineStyle(1, ABY.coralCyan, 0.25 + strain * 0.4); g.lineBetween(p.x, p.y, n.x, n.y);
      }
      const k = (time - snapAt) / 400;
      if (k >= 0 && k < 1) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          g.fillStyle(ABY.coralCyan, 1 - k); g.fillCircle(snapX + Math.cos(a) * 40 * k, snapY + Math.sin(a) * 40 * k, 3);
        }
      }
    },
  };
};

/**
 * Gulper's Gullet — 35% of every hit you take is swallowed rather than kept (up to 40 held).
 * Go 2.5 seconds without being hit and you digest it: the held amount comes back as health over
 * a second and a half. Get hit while digesting and you stop, keeping what is left for later.
 */
const gullet: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const tick = makeClock();
  const CAP = 40;
  let held = 0;
  let lastHit = -9999;
  let now = 0;
  let digesting = false;
  let acc = 0;
  return {
    update(time) {
      const dt = tick(time);
      now = time;
      if (held <= 0) { digesting = false; return; }
      if (!digesting && time - lastHit >= 2500) { digesting = true; ctx.sfx('heal'); ctx.float(ctx.player.x, ctx.player.y - 46, 'digesting…', '#c8ff9a'); }
      if (!digesting) return;
      acc += Math.min(held, (CAP / 1.5) * dt);
      held -= Math.min(held, (CAP / 1.5) * dt);
      if (acc >= 1) { const n = Math.floor(acc); acc -= n; ctx.heal(ctx.player, n); }
    },
    onHitTaken(amount) {
      lastHit = now;
      digesting = false;
      if (amount <= 0) return;
      held = Math.min(CAP, held + amount * 0.35);
    },
    drawAir(g, time) {
      if (held <= 0.5) return;
      const p = ctx.player;
      const k = held / CAP;
      // A swollen belly-sac over the hip, glowing as it works.
      const x = p.x - 26, y = p.y - 6;
      g.fillStyle(0x2a1a20, 0.9); g.fillEllipse(x, y, 12 + k * 8, 14 + k * 10);
      g.fillStyle(digesting ? 0xc8ff9a : ABY.coralRose, 0.4 + (digesting ? 0.3 * Math.sin(time / 90) : 0)); g.fillEllipse(x, y + 1, 8 + k * 6, 10 + k * 8);
    },
  };
};

/**
 * Photophore Studs — your hits plant glowing studs on the foe (six at most; they fade if you
 * leave it alone for six seconds). Every fifth ability you cast flashes them all: 4 damage per
 * stud, and the ability you just cast comes back 0.25s sooner for each one.
 */
const photophores: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  let studs = 0;
  let lastStud = 0;
  let casts = 0;
  let now = 0;
  let flashAt = -9999, flashN = 0;
  return {
    update(time) {
      now = time;
      if (studs > 0 && time - lastStud > 6000) studs = 0;
    },
    onHitDealt(amount) {
      if (amount <= 0 || studs >= 6) return;
      studs++;
      lastStud = now;
    },
    onCast(id) {
      casts++;
      if (casts < 5) return;
      casts = 0;
      if (studs <= 0) return;
      const n = ctx.npc;
      if (alive(n)) ctx.hit(n, studs * 4, n.x, n.y);
      ctx.refund(id, studs * 250);
      ctx.float(n.x, n.y - 46, `FLASH ×${studs}`, '#9fd4ff');
      ctx.sfx('prism');
      flashAt = now; flashN = studs;
      studs = 0;
    },
    drawAir(g, time) {
      const n = ctx.npc;
      if (!alive(n)) return;
      for (let i = 0; i < studs; i++) {
        const a = (i / 6) * Math.PI * 2 + time / 700;
        g.fillStyle(ABY.photo, 0.2); g.fillCircle(n.x + Math.cos(a) * 20, n.y + Math.sin(a) * 14, 6);
        g.fillStyle(ABY.photo, 0.95); g.fillCircle(n.x + Math.cos(a) * 20, n.y + Math.sin(a) * 14, 2.4);
      }
      const k = (time - flashAt) / 350;
      if (k >= 0 && k < 1) {
        g.fillStyle(ABY.photo, 0.35 * (1 - k)); g.fillCircle(n.x, n.y, 30 + flashN * 6 * k);
      }
      // Your cast count, as five tiny lights over your head.
      const p = ctx.player;
      for (let i = 0; i < 5; i++) {
        g.fillStyle(i < casts ? ABY.photo : 0x223040, i < casts ? 0.95 : 0.6);
        g.fillCircle(p.x - 12 + i * 6, p.y - 50, 1.8);
      }
    },
  };
};

// ── Artifact script ──────────────────────────────────────────────────

/**
 * Lanternjaw's Esca — the prince's own lure, still lit. Every 7 seconds it drifts from you to
 * hang over the foe: while it hangs your blows land 30% harder. It follows the foe for a moment,
 * then settles and flickers — and jaws close where it hangs, biting the foe for 18 if it did
 * not step out from under the light.
 */
const lanternjawEsca: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const tick = makeClock();
  type St = 'home' | 'drift' | 'hang' | 'settle' | 'snap';
  let st: St = 'home';
  let at = -1;
  let x = 0, y = 0;
  return {
    update(time) {
      const dt = tick(time);
      if (at < 0) at = time;
      const p = ctx.player, n = ctx.npc;
      const el = time - at;
      switch (st) {
        case 'home':
          x = p.x + 20; y = p.y - 50;
          if (el >= 7000 && alive(n)) { st = 'drift'; at = time; }
          break;
        case 'drift': {
          const tx = n.x, ty = n.y - 50;
          const d = dist(x, y, tx, ty);
          const step = 420 * dt;
          if (d <= step) { x = tx; y = ty; st = 'hang'; at = time; ctx.boostDamage(1.3, 2400); ctx.sfx('sparkle'); ctx.float(n.x, n.y - 64, 'THE LURE HANGS', '#ffcf5a'); }
          else { x += ((tx - x) / d) * step; y += ((ty - y) / d) * step; }
          if (el > 2000) { st = 'home'; at = time; }
          break;
        }
        case 'hang':
          x += (n.x - x) * Math.min(1, dt * 5); y += (n.y - 50 - y) * Math.min(1, dt * 5);
          if (el >= 1600) { st = 'settle'; at = time; ctx.sfx('beam-charge'); }
          break;
        case 'settle':
          if (el >= 800) {
            st = 'snap'; at = time;
            ctx.sfx('slash');
            if (alive(n) && dist(x, y + 50, n.x, n.y) < 56) { ctx.hit(n, 18, n.x, n.y); ctx.flash(n.x, n.y, ABY.tooth); }
          }
          break;
        case 'snap':
          if (el >= 500) { st = 'home'; at = time; }
          break;
      }
    },
    drawGround(g, time) {
      if (st !== 'settle' && st !== 'snap') return;
      const k = Math.min(1, (time - at) / (st === 'settle' ? 800 : 500));
      drawJaws(g, x, y + 50, 56, st === 'settle' ? 1 - k * 0.4 : 0, st === 'settle' ? 0.4 + k * 0.6 : 1 - k, 11);
    },
    drawAir(g, time) {
      const t = time / 1000;
      const flick = st === 'settle' ? (Math.sin(time / 45) > 0 ? 1 : 0.4) : 1;
      if (st === 'hang' || st === 'settle') {
        g.fillStyle(ABY.lure, 0.1 * flick); g.fillEllipse(x, y + 52, 120, 60);
      }
      drawEsca(g, x, y, st === 'home' ? 4 : 6, t, flick);
    },
  };
};

// ── Defs ─────────────────────────────────────────────────────────────

export const ABYSSAL_ITEMS: IsleItemDef[] = [
  {
    id: 'abyssal-ballast',
    name: 'Ballast Stone',
    emoji: '🪨',
    kind: 'charm',
    price: 180,
    flavor: 'A diver\'s weight on a cord. The deep pulls on whatever you carry. Carry something heavy, and pull back.',
    script: 'abyssal-ballast',
    scriptText: [
      'Each hit you take adds a ballast weight (max 4): −4% speed and +7% damage per weight.',
      'Cast F to cut it loose: a shockwave hits a nearby foe for 6 per weight.',
    ],
    isle: 'water',
  },
  {
    id: 'abyssal-siphon-chain',
    name: 'Siphonophore Chain',
    emoji: '🪼',
    kind: 'charm',
    price: 320,
    flavor: 'A colony of tiny glowing animals that agreed to be a necklace. They do not like to be stretched.',
    script: 'abyssal-siphon-chain',
    scriptText: [
      'Each hit you land within 220px strings a glowing link to the foe (max 6; one fades every 2.5s).',
      'Move more than 300px away and the chain snaps, hitting the foe for 5 per link.',
    ],
    isle: 'water',
  },
  {
    id: 'abyssal-gullet',
    name: 'Gulper\'s Gullet',
    emoji: '🫙',
    kind: 'charm',
    price: 460,
    flavor: 'A gulper eel\'s stomach, dried, waxed and worn as a pouch. It will hold anything. It will hold a great deal of it.',
    script: 'abyssal-gullet',
    scriptText: [
      '35% of every hit you take is swallowed (up to 40 held).',
      'After 2.5s without being hit you digest it, healing what was held over 1.5s.',
    ],
    effect: { maxHp: 10 },
    isle: 'water',
  },
  {
    id: 'abyssal-photophore',
    name: 'Photophore Studs',
    emoji: '💠',
    kind: 'charm',
    price: 620,
    flavor: 'Six blue lights from a lanternfish\'s flank, set in silver. Prick someone with one and they glow for you.',
    script: 'abyssal-photophore',
    scriptText: [
      'Your hits plant studs on the foe (max 6; they fade after 6s idle).',
      'Every 5th ability you cast flashes them: 4 damage each, and that ability comes back 0.25s sooner per stud.',
    ],
    effect: { critChance: 0.03 },
    isle: 'water',
  },
  {
    id: 'art-lanternjaw',
    name: 'Lanternjaw\'s Esca',
    emoji: '🏮',
    kind: 'artifact',
    flavor: 'The lure off Prince Lanternjaw\'s brow, still warm, still lit. It still wants to be followed.',
    effect: { maxHp: 25, damageTakenMult: 0.95 },
    script: 'art-lanternjaw',
    scriptText: [
      'Every 7s the lure drifts to the foe and hangs over it: +30% damage for 2.4s.',
      'Then it settles and jaws snap beneath it — 18 damage if the foe is still under the light.',
    ],
    isle: 'water',
  },
  {
    id: 'fish-lanternfish',
    name: 'Lanternfish',
    emoji: '🐟',
    kind: 'fish',
    sell: 60,
    flavor: 'A finger of a fish with a row of blue lights down its belly. Eaten raw your eyes see a little further in the dark.',
    effect: { critChance: 0.03 },
    isle: 'water',
  },
  {
    id: 'fish-gulper-eel',
    name: 'Gulper Eel',
    emoji: '🐍',
    kind: 'fish',
    sell: 120,
    flavor: 'All mouth. A whip of a tail and a jaw like an open umbrella. Fills you up — mostly with the idea of being full.',
    effect: { maxHp: 14 },
    isle: 'water',
  },
  {
    id: 'fish-ghost-grenadier',
    name: 'Ghost Grenadier',
    emoji: '👻',
    kind: 'fish',
    sell: 170,
    flavor: 'A pale rattail from the very bottom of the line, white as a sleeper. You feel lighter on your feet after. Unsettlingly so.',
    effect: { dodgeChance: 0.05 },
    isle: 'water',
  },
];

export const ABYSSAL_SCRIPTS: Record<string, ItemScriptFactory> = {
  'abyssal-ballast': ballast,
  'abyssal-siphon-chain': siphonophore,
  'abyssal-gullet': gullet,
  'abyssal-photophore': photophores,
  'art-lanternjaw': lanternjawEsca,
};

export const ABYSSAL_SHOPS: ShopDef[] = [
  {
    id: 'abyssal-shop',
    name: 'The Pressure Hull',
    stock: ['abyssal-ballast', 'abyssal-siphon-chain', 'abyssal-gullet', 'abyssal-photophore'],
    buys: true,
  },
];

export const ABYSSAL_FISHERIES: FisheryDef[] = [
  { id: 'abyssal-trench', name: 'The Abyssal Trench', kind: 'abyss' },
];

export const ABYSSAL_FISH: FishDef[] = [
  { id: 'fish-lanternfish', fisheries: ['abyssal-trench'], weight: 52, fight: 3, size: [6, 15], rod: 'rod-whalebone' },
  { id: 'fish-gulper-eel', fisheries: ['abyssal-trench'], weight: 30, fight: 4, size: [45, 180], rod: 'rod-whalebone' },
  { id: 'fish-ghost-grenadier', fisheries: ['abyssal-trench'], weight: 14, fight: 5, size: [40, 110], rod: 'rod-whalebone' },
];
