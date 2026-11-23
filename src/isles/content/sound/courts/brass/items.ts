import type { BakeryDef, FishDef, FisheryDef, IsleItemDef, ItemScriptCtx, ItemScriptFactory, ShopDef } from '../../../../IslesTypes';
import { glow, lit } from '../../../../art/IsleArt';
import { drum, heraldTrumpet, hornBell, note, stave } from './art';
import { BRASS, BRASS_DARK, BRASS_LIT, BRASS_SHINE, CREAM, FANFARE_LIT, NAVY_DARK, SCARLET, SCARLET_LIT, SILVER } from './palette';
import { alive, clamp, dist, segInfo, wrapAngle } from './util';

/**
 * The Brass Court's goods: Cornelius Slide's four charms (every one a piece of a bandsman's
 * kit that plays a court rule in your favour), Prince Fanfare's silver herald, the bandlake's
 * two fish, and what Bertha Bunce bakes from them at *The Oompah Bun*. Scripts are registered
 * below under their item ids.
 */

const ISLE = 'sound';

export const CHARM_MOUTHPIECE = 'brass-charm-herald-mouthpiece';
export const CHARM_METRONOME = 'brass-charm-metronome-pin';
export const CHARM_DRUM = 'brass-charm-bass-drum-badge';
export const CHARM_BELL = 'brass-charm-sousaphone-brooch';
export const ART_FANFARE = 'art-fanfare';

export const FISH_CARP = 'fish-cornet-carp';
export const FISH_BREAM = 'fish-bugle-bream';
export const FISHERY = 'brass-bandlake';

export const FLOUR = 'brass-bun-flour';
export const FOOD_BUN = 'brass-food-oompah-bun';
export const FOOD_CORNETTO = 'brass-food-carp-cornetto';
export const FOOD_BAKE = 'brass-food-bugle-bream-bake';
export const FOOD_PIE = 'brass-food-bandsmans-pie';
export const BAKERY_ID = 'brass-bun';
export const RECIPE_CORNETTO = 'brass-r-carp-cornetto';

const live = (ctx: ItemScriptCtx) => alive(ctx.player);
const foeLive = (ctx: ItemScriptCtx) => alive(ctx.npc);

// ── Herald's Mouthpiece ──────────────────────────────────────────────
// Every fourth cast sounds a fanfare: a cone of brass from you the way you face. A foe in it is
// struck and blown back.

const mouthpiece: ItemScriptFactory = (ctx) => {
  const REACH = 270, HALF = 0.45;
  let count = 0;
  let blastAt = -9999;
  let blastA = 0;
  return {
    onCast() {
      if (!live(ctx)) return;
      count = (count + 1) % 4;
      if (count !== 0) return;
      const p = ctx.player, n = ctx.npc;
      blastAt = ctx.scene.time.now;
      blastA = ctx.facing(p);
      ctx.sfx('train-horn');
      if (!foeLive(ctx)) return;
      const d = dist(p.x, p.y, n.x, n.y);
      const off = Math.abs(wrapAngle(Math.atan2(n.y - p.y, n.x - p.x) - blastA));
      if (d < REACH && off < HALF) {
        ctx.hit(n, 10, n.x, n.y);
        ctx.nudge(n, Math.cos(blastA) * 90, Math.sin(blastA) * 90);
        ctx.float(n.x, n.y - 46, 'TANTARA!', '#ffe08a');
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // Four pips under a little trumpet at the shoulder: one lit per cast.
      const a = time - blastAt < 400 ? blastA : -0.4;
      heraldTrumpet(g, p.x - 18, p.y - 38, a, 22, 0.55, SCARLET, time - blastAt < 400 ? 1 : 0);
      for (let i = 0; i < 4; i++) { g.fillStyle(i < count ? BRASS_LIT : NAVY_DARK, i < count ? 1 : 0.6); g.fillCircle(p.x - 26 + i * 6, p.y - 28, 2); }
      const k = (time - blastAt) / 420;
      if (k >= 0 && k < 1) {
        for (let w = 0; w < 3; w++) {
          const r = 30 + (k * REACH) - w * 30;
          if (r < 20) continue;
          g.lineStyle(5 - w, BRASS_LIT, 0.7 * (1 - k)); g.beginPath(); g.arc(p.x, p.y, r, blastA - HALF, blastA + HALF, false); g.strokePath();
        }
      }
    },
  };
};

// ── Metronome Pin ────────────────────────────────────────────────────
// A little metronome swings at your collar, ticking every 0.6s. Cast on the tick and the cast
// is on the beat: half a second back off its cooldown, and 15% harder blows for a moment.

const metronome: ItemScriptFactory = (ctx) => {
  const PERIOD = 600, WINDOW = 120;
  let usedTick = -1;
  let fxAt = -9999;
  const tickIdx = (t: number) => Math.round(t / PERIOD);
  const onBeat = (t: number) => Math.abs(t - tickIdx(t) * PERIOD) <= WINDOW;
  return {
    onCast(abilityId) {
      if (!live(ctx)) return;
      const now = ctx.scene.time.now;
      if (!onBeat(now) || tickIdx(now) === usedTick) return;
      usedTick = tickIdx(now);
      fxAt = now;
      ctx.refund(abilityId, 500);
      ctx.boostDamage(1.15, 1200);
      ctx.float(ctx.player.x, ctx.player.y - 50, 'ON THE BEAT', '#fff2b0');
      ctx.sfx('clock-tick');
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const x = p.x + 24, y = p.y - 24;
      // The wedge case.
      g.fillStyle(0x553620, 1); g.fillTriangle(x - 8, y + 6, x + 8, y + 6, x, y - 18);
      g.fillStyle(CREAM, 1); g.fillTriangle(x - 5, y + 4, x + 5, y + 4, x, y - 13);
      // The pendulum: a full swing every two ticks, at the centre on each tick.
      const ph = (time % (PERIOD * 2)) / (PERIOD * 2);
      const a = Math.cos(ph * Math.PI * 2 + Math.PI / 2) * 0.5;
      const near = onBeat(time);
      g.lineStyle(1.5, near ? SCARLET_LIT : BRASS_DARK, 1); g.lineBetween(x, y + 3, x + Math.sin(a) * 14, y + 3 - Math.cos(a) * 14);
      g.fillStyle(near ? SCARLET_LIT : BRASS, 1); g.fillRect(x + Math.sin(a) * 9 - 2, y + 3 - Math.cos(a) * 9 - 1.5, 4, 3);
      if (time - fxAt < 300) { g.lineStyle(2, BRASS_LIT, 1 - (time - fxAt) / 300); g.strokeCircle(p.x, p.y, 24 + (time - fxAt) / 10); }
    },
  };
};

// ── Bass Drum Badge ──────────────────────────────────────────────────
// Every blow you take beats the drum. On the fourth beat it booms: a shockwave round you that
// strikes the foe if near and throws him back.

const bassDrum: ItemScriptFactory = (ctx) => {
  const R = 140;
  let beats = 0;
  let lastBeat = -9999;
  let boomAt = -9999;
  return {
    onHitTaken(amount) {
      if (!live(ctx) || amount <= 0) return;
      const now = ctx.scene.time.now;
      if (now - lastBeat < 400) return;
      lastBeat = now;
      beats++;
      ctx.sfx('drum-hit');
      if (beats < 4) return;
      beats = 0;
      boomAt = now;
      ctx.sfx('quake');
      const p = ctx.player, n = ctx.npc;
      if (foeLive(ctx) && dist(p.x, p.y, n.x, n.y) < R + 20) {
        const a = Math.atan2(n.y - p.y, n.x - p.x);
        ctx.hit(n, 12, n.x, n.y);
        ctx.nudge(n, Math.cos(a) * 110, Math.sin(a) * 110);
        ctx.float(n.x, n.y - 46, 'BOOM', '#ff9a8a');
      }
    },
    drawGround(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // The reach, quartered: a quarter fills per beat.
      g.lineStyle(1.5, SCARLET_LIT, 0.12 + beats * 0.08); g.strokeCircle(p.x, p.y, R);
      const k = (time - boomAt) / 500;
      if (k >= 0 && k < 1) { g.lineStyle(8 * (1 - k), SCARLET_LIT, 0.7 * (1 - k)); g.strokeCircle(p.x, p.y, R * (0.3 + k * 0.8)); }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      const bk = clamp(1 - (time - lastBeat) / 160, 0, 1);
      drum(g, p.x - 26, p.y - 18, 7, SCARLET, true, bk);
      for (let i = 0; i < 4; i++) { g.fillStyle(i < beats ? SCARLET_LIT : NAVY_DARK, i < beats ? 1 : 0.5); g.fillCircle(p.x - 35 + i * 6, p.y - 34, 1.8); }
    },
  };
};

// ── Sousaphone Bell Brooch ───────────────────────────────────────────
// Every 9s the little bell at your shoulder breathes in for 1.2s — drawing a near foe toward
// you — then blows: a foe close in is struck, blasted back and stunned for a moment.

const bellBrooch: ItemScriptFactory = (ctx) => {
  const EVERY = 9000, INHALE = 1200, PULL_R = 320, BLOW_R = 200;
  let start = -1;
  let blowAt = -9999;
  return {
    update(time, dt) {
      if (!live(ctx)) return;
      if (start < 0) start = time;
      const ph = (time - start) % EVERY;
      const inhaling = ph > EVERY - INHALE;
      const p = ctx.player, n = ctx.npc;
      if (inhaling && foeLive(ctx)) {
        const d = dist(p.x, p.y, n.x, n.y);
        if (d < PULL_R && d > 60) ctx.nudge(n, ((p.x - n.x) / d) * 60 * dt, ((p.y - n.y) / d) * 60 * dt);
      }
      if (ph < 40 && time - blowAt > 1000 && time - start > 1000) {
        blowAt = time;
        ctx.sfx('sonic-pulse');
        if (foeLive(ctx) && dist(p.x, p.y, n.x, n.y) < BLOW_R) {
          const a = Math.atan2(n.y - p.y, n.x - p.x);
          ctx.hit(n, 8, n.x, n.y);
          ctx.nudge(n, Math.cos(a) * 150, Math.sin(a) * 150);
          ctx.stun(n, 450);
          ctx.float(n.x, n.y - 46, 'OOMPAH!', '#ffe08a');
        }
      }
    },
    drawAir(g, time) {
      if (!live(ctx) || start < 0) return;
      const p = ctx.player;
      const ph = (time - start) % EVERY;
      const inK = ph > EVERY - INHALE ? (ph - (EVERY - INHALE)) / INHALE : 0;
      hornBell(g, p.x + 20, p.y - 40, -Math.PI / 2 + 0.5, 7 + inK * 2, 9, BRASS, inK);
      if (inK > 0) {
        // Air drawn in: dashes streaming toward the bell.
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + time / 400;
          const r = 80 * (1 - ((time / 300 + i / 8) % 1));
          g.lineStyle(1.5, CREAM, 0.5 * inK); g.lineBetween(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, p.x + Math.cos(a) * (r - 10), p.y + Math.sin(a) * (r - 10));
        }
      }
      const k = (time - blowAt) / 450;
      if (k >= 0 && k < 1) { g.lineStyle(10 * (1 - k), lit(BRASS_LIT, 0.3), 0.7 * (1 - k)); g.strokeCircle(p.x, p.y, BLOW_R * k); }
    },
  };
};

// ── Fanfare's Silver Herald (artifact) ───────────────────────────────
// Each blow you land writes a note on a stave over your head. Five notes and the stave plays:
// three bell-flared beams fan out from you at the foe and strike a beat later. Once a fight,
// dropping under 30% health, you sound a sforzando: the foe is hurled away and stunned.

const silverHerald: ItemScriptFactory = (ctx) => {
  const LEN = 520;
  const half = (t: number) => 10 + 26 * t * t;
  let notes = 0;
  let lastNote = -9999;
  let beams: { a: number; ox: number; oy: number; at: number; dealt: boolean }[] = [];
  let sfzUsed = false;
  let sfzAt = -9999;
  return {
    onHitDealt(amount) {
      if (!live(ctx) || !foeLive(ctx) || amount < 2) return;
      const now = ctx.scene.time.now;
      if (now - lastNote < 350) return;
      lastNote = now;
      notes++;
      if (notes < 5) return;
      notes = 0;
      const p = ctx.player, n = ctx.npc;
      const a = Math.atan2(n.y - p.y, n.x - p.x);
      beams = [-0.3, 0, 0.3].map((k) => ({ a: a + k, ox: p.x, oy: p.y, at: now + 420, dealt: false }));
      ctx.sfx('beam-charge');
    },
    onHitTaken() {
      if (sfzUsed || !live(ctx) || !foeLive(ctx)) return;
      const p = ctx.player, n = ctx.npc;
      if (p.hp > p.maxHp * 0.3) return;
      sfzUsed = true;
      sfzAt = ctx.scene.time.now;
      const a = Math.atan2(n.y - p.y, n.x - p.x);
      ctx.nudge(n, Math.cos(a) * 200, Math.sin(a) * 200);
      ctx.stun(n, 1000);
      ctx.float(p.x, p.y - 56, 'SFORZANDO', '#fff2b0');
      ctx.sfx('explosion-medium');
    },
    update(time) {
      if (!live(ctx)) return;
      for (const b of beams) {
        if (b.dealt || time < b.at) continue;
        b.dealt = true;
        if (b === beams[1]) ctx.sfx('light-beam');
        if (!foeLive(ctx)) continue;
        const n = ctx.npc;
        const { d, t } = segInfo(n.x, n.y, b.ox, b.oy, b.ox + Math.cos(b.a) * LEN, b.oy + Math.sin(b.a) * LEN);
        if (d < half(t) + 20) ctx.hit(n, 9, n.x, n.y);
      }
      beams = beams.filter((b) => !b.dealt || time < b.at + 360);
    },
    drawGround(g, time) {
      for (const b of beams) {
        const k = b.dealt ? 1 - clamp((time - b.at) / 360, 0, 1) : clamp(1 - (b.at - time) / 420, 0, 1);
        const ca = Math.cos(b.a), sa = Math.sin(b.a);
        const L: { x: number; y: number }[] = [], R: { x: number; y: number }[] = [];
        for (let i = 0; i <= 8; i++) {
          const t = i / 8, w = half(t);
          const x = b.ox + ca * LEN * t, y = b.oy + sa * LEN * t;
          L.push({ x: x - sa * w, y: y + ca * w }); R.push({ x: x + sa * w, y: y - ca * w });
        }
        const pts = [...L, ...R.reverse()];
        g.fillStyle(b.dealt ? FANFARE_LIT : SILVER, (b.dealt ? 0.5 : 0.15) * k); g.fillPoints(pts, true);
        g.lineStyle(1.5, BRASS_SHINE, 0.6 * k); g.strokePoints(pts, true);
      }
    },
    drawAir(g, time) {
      if (!live(ctx)) return;
      const p = ctx.player;
      // The little silver stave over your head, filling with notes.
      const x0 = p.x - 20, y0 = p.y - 66;
      stave(g, x0, y0, 40, 3, SILVER, 0.8);
      for (let i = 0; i < notes; i++) note(g, x0 + 5 + i * 7, y0 + 12 - i * 2, 1.8, BRASS_LIT, 'crotchet', 1);
      const k = (time - sfzAt) / 600;
      if (k >= 0 && k < 1) { g.lineStyle(14 * (1 - k), BRASS_LIT, 0.7 * (1 - k)); g.strokeCircle(p.x, p.y, 40 + k * 220); glow(g, p.x, p.y, 50, BRASS_LIT, 0.08 * (1 - k), 3); }
    },
  };
};

// ── Food ─────────────────────────────────────────────────────────────
// The Carp Cornetto: every 8s your next blow (within 3s of it coming ready) gives a little parp.

const cornetto: ItemScriptFactory = (ctx) => {
  let readyAt = 0;
  let started = false;
  return {
    update(time) { if (!started) { started = true; readyAt = time + 8000; } },
    onHitDealt(amount) {
      if (!live(ctx) || !foeLive(ctx) || amount < 2) return;
      const now = ctx.scene.time.now;
      if (now < readyAt || now > readyAt + 3000) { if (now > readyAt + 3000) readyAt = now + 8000; return; }
      readyAt = now + 8000;
      ctx.hit(ctx.npc, 6, ctx.npc.x, ctx.npc.y);
      ctx.float(ctx.npc.x, ctx.npc.y - 46, 'PARP', '#ffe08a');
      ctx.sfx('boing');
    },
    drawAir(g, time) {
      if (!live(ctx) || time < readyAt || time > readyAt + 3000) return;
      const p = ctx.player;
      hornBell(g, p.x - 22, p.y - 44, -Math.PI / 2 - 0.4, 5, 8, BRASS, 0.5 + Math.sin(time / 90) * 0.5);
    },
  };
};

export const BRASS_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_MOUTHPIECE, name: 'Herald\'s Mouthpiece', emoji: '📯', kind: 'charm', price: 440, isle: ISLE,
    flavor: 'A silver-plated mouthpiece from one of Clarion\'s long trumpets, the rim worn to the brass by forty Hours.',
    script: CHARM_MOUTHPIECE,
    scriptText: [
      'Every 4th cast sounds a fanfare: a cone of brass from you the way you face (about 270px).',
      'A foe in it takes 10 and is blown back 90px.',
    ],
  },
  {
    id: CHARM_METRONOME, name: 'Metronome Pin', emoji: '⏱️', kind: 'charm', price: 640, isle: ISLE,
    flavor: 'A brass metronome the size of a thimble, worn at the collar by drill-masters. It never once lost time.',
    script: CHARM_METRONOME,
    scriptText: [
      'A metronome at your collar ticks every 0.6s; its pendulum turns red on the tick.',
      'Cast on the tick: that ability gets 0.5s back, and you deal +15% damage for 1.2s (once per tick).',
    ],
  },
  {
    id: CHARM_DRUM, name: 'Bass Drum Badge', emoji: '🥁', kind: 'charm', price: 860, isle: ISLE,
    flavor: 'An enamelled badge of the big drum, given to bass drummers who have marched a thousand Hours. Strut has none.',
    effect: { damageTakenMult: 0.97 },
    script: CHARM_DRUM,
    scriptText: [
      'Every blow you take beats the drum (at most every 0.4s).',
      'On the 4th beat it booms: a foe within 140px takes 12 and is thrown back 110px.',
    ],
  },
  {
    id: CHARM_BELL, name: 'Sousaphone Bell Brooch', emoji: '🎺', kind: 'charm', price: 1100, isle: ISLE,
    flavor: 'A brooch spun on the foundry lathe from the offcut of a sousaphone bell. Hold it to your ear: it breathes.',
    effect: { maxHp: 8 },
    script: CHARM_BELL,
    scriptText: [
      'Every 9s the bell breathes in for 1.2s, drawing a foe within 320px toward you.',
      'Then it blows: a foe within 200px takes 8, is blasted back 150px and stunned 0.45s.',
    ],
  },
  {
    id: ART_FANFARE, name: 'Fanfare\'s Silver Herald', emoji: '🎺', kind: 'artifact', isle: ISLE,
    flavor: 'The Prince\'s own herald trumpet, silver under the brass. Inside the bell somebody has scratched a lullaby.',
    effect: { maxHp: 15 },
    script: ART_FANFARE,
    scriptText: [
      'Each blow you land writes a note on a stave over your head. At 5 notes, three bell-flared beams fan out at the foe: 9 each.',
      'Once a fight, dropping under 30% health, a sforzando hurls the foe 200px away and stuns them 1s.',
    ],
  },
  {
    id: FISH_CARP, name: 'Cornet Carp', emoji: '🐟', kind: 'fish', sell: 12, isle: ISLE,
    flavor: 'A golden carp with a mouth like a cornet\'s bell. It rises to the floating stage when the band plays.',
    effect: { regenPerSecond: 0.4 },
  },
  {
    id: FISH_BREAM, name: 'Bugle Bream', emoji: '🐠', kind: 'fish', sell: 28, isle: ISLE,
    flavor: 'A deep-bodied bream that calls across the lake at dusk with one clear note, the same note every night.',
    effect: { damageMult: 1.03 },
  },
  {
    id: FLOUR, name: 'Bun Flour', emoji: '🌾', kind: 'material', price: 18, sell: 6, isle: ISLE,
    flavor: 'Fine terrace flour, milled on the lower slopes. Bertha Bunce will bake anything you bring her with it.',
  },
  {
    id: FOOD_BUN, name: 'Oompah Bun', emoji: '🥯', kind: 'food', sell: 18, isle: ISLE,
    flavor: 'A round, shiny, enormous bun with a hole in it like a tuba\'s coil. Bandsmen eat one before every Hour.',
    effect: { maxHp: 10 },
  },
  {
    id: FOOD_CORNETTO, name: 'Carp Cornetto', emoji: '🥐', kind: 'food', sell: 44, isle: ISLE,
    flavor: 'A pastry horn stuffed with cornet carp and herbs. Blow down the narrow end before you bite. Everybody does.',
    script: FOOD_CORNETTO,
    scriptText: ['Every 8s a parp comes ready: your next blow within 3s deals 6 extra.'],
  },
  {
    id: FOOD_BAKE, name: 'Bugle Bream Bake', emoji: '🥧', kind: 'food', sell: 58, isle: ISLE,
    flavor: 'Bugle bream baked whole under a crust scored like a stave. The crust sings a little as it cools.',
    effect: { damageMult: 1.05, damageTakenMult: 0.97 },
  },
  {
    id: FOOD_PIE, name: 'Bandsman\'s Pie', emoji: '🍲', kind: 'food', sell: 76, isle: ISLE,
    flavor: 'A deep pie for a band on the march: two carp and a bream under a lid as thick as a drumskin.',
    effect: { maxHp: 14, regenPerSecond: 0.5, speedMult: 1.03 },
  },
];

export const BRASS_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_MOUTHPIECE]: mouthpiece,
  [CHARM_METRONOME]: metronome,
  [CHARM_DRUM]: bassDrum,
  [CHARM_BELL]: bellBrooch,
  [ART_FANFARE]: silverHerald,
  [FOOD_CORNETTO]: cornetto,
};

export const BRASS_SHOPS: ShopDef[] = [
  { id: 'brass-shop', name: 'Slide\'s Valves & Mouthpieces', stock: [CHARM_MOUTHPIECE, CHARM_METRONOME, CHARM_DRUM, CHARM_BELL, FLOUR], buys: true },
];

export const BRASS_BAKERIES: BakeryDef[] = [{
  id: BAKERY_ID,
  name: 'The Oompah Bun',
  recipes: [
    { id: 'brass-r-oompah-bun', name: 'Oompah Bun', inputs: [{ item: FLOUR, count: 2 }], coins: 20, output: FOOD_BUN, makes: 2 },
    { id: RECIPE_CORNETTO, name: 'Carp Cornetto', inputs: [{ item: FISH_CARP, count: 1 }, { item: FLOUR, count: 1 }], coins: 26, output: FOOD_CORNETTO },
    { id: 'brass-r-bream-bake', name: 'Bugle Bream Bake', inputs: [{ item: FISH_BREAM, count: 1 }, { item: FLOUR, count: 1 }], coins: 34, output: FOOD_BAKE },
    {
      id: 'brass-r-bandsmans-pie', name: 'Bandsman\'s Pie',
      inputs: [{ item: FISH_CARP, count: 2 }, { item: FISH_BREAM, count: 1 }, { item: FLOUR, count: 1 }], coins: 40, output: FOOD_PIE,
    },
  ],
}];

export const BRASS_FISHERIES: FisheryDef[] = [{ id: FISHERY, name: 'The Bandlake', kind: 'pond' }];

export const BRASS_FISH: FishDef[] = [
  { id: FISH_CARP, fisheries: [FISHERY], weight: 6, fight: 2, size: [14, 38] },
  { id: FISH_BREAM, fisheries: [FISHERY], weight: 2, fight: 3, size: [18, 44] },
];
