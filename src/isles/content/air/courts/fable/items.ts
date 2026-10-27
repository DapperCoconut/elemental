import type { IsleItemDef, ItemScript, ItemScriptCtx, ItemScriptFactory } from '../../../../IslesTypes';
import {
  BEAN, BEAN_LIT, CLOTH_RED, DRAGON, DRAGON_LIT, EMBER, FLAME, GILT, GILT_LIT, INK, MYTH_LIT, PAGE, beanstalk,
  clamp, dist, frameClock, inkEllipse, magicMirror, openBook, segDist,
} from './util';

/**
 * The Fable Court's wares: four charms from Quire Hollowell's bookbindery — each a tale too short
 * to bind, carried rather than told, so the breath-meter never hears it — Prince Legend's
 * artifact, and the two fish of the castle moat. Every charm and the artifact runs a bespoke script.
 */

export const CHARM_GARTER = 'fable-seven-league-garter';
export const CHARM_SEED = 'fable-beanstalk-seed';
export const CHARM_COMPACT = 'fable-fairest-compact';
export const CHARM_LOCKET = 'fable-dragonscale-locket';
export const ART_LEGEND = 'art-legend';

const alive = (f: { active: boolean; hp: number }): boolean => f.active && f.hp > 0;

// ── Scripts ──────────────────────────────────────────────────────────

/**
 * Seven-League Garter — every 260px you walk banks a League (up to 7). Your next ability spends
 * them all: +5% damage per League for 3s, and +4% speed per League for 2s.
 */
const sevenLeagueGarter: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const STEP = 260, MAX = 7;
  let leagues = 0, walked = 0;
  let px = ctx.player.x, py = ctx.player.y;
  let spentAt = -9999, spentN = 0, spentX = 0, spentY = 0, spentA = 0;
  return {
    update() {
      const d = dist(px, py, ctx.player.x, ctx.player.y);
      // A blink or a shove is not walking.
      if (d < 40) walked += d;
      px = ctx.player.x; py = ctx.player.y;
      while (walked >= STEP && leagues < MAX) { walked -= STEP; leagues++; }
      if (leagues >= MAX) walked = 0;
    },
    onCast() {
      if (leagues <= 0 || !alive(ctx.player)) return;
      const n = leagues;
      ctx.boostDamage(1 + 0.05 * n, 3000);
      ctx.boostSpeed(1 + 0.04 * n, 2000);
      ctx.float(ctx.player.x, ctx.player.y - 52, `${n} LEAGUE${n > 1 ? 'S' : ''}`, '#ffe08a');
      ctx.sfx('dash');
      spentAt = ctx.scene.time.now; spentN = n; spentX = ctx.player.x; spentY = ctx.player.y;
      spentA = Math.atan2(ctx.npc.y - spentY, ctx.npc.x - spentX);
      leagues = 0;
    },
    drawGround(g, time) {
      const p = ctx.player;
      if (!alive(p)) return;
      // Seven little boot-pips in an arc at your heels; filled ones are banked Leagues.
      for (let i = 0; i < MAX; i++) {
        const a = Math.PI * 0.15 + (i / (MAX - 1)) * Math.PI * 0.7;
        const x = p.x + Math.cos(a) * 26, y = p.y + 14 + Math.sin(a) * 10;
        g.fillStyle(i < leagues ? GILT : 0x000000, i < leagues ? 0.9 : 0.2);
        g.fillEllipse(x, y, 6, 3.4);
      }
      // Spent: giant strides marching away toward the foe, fading.
      const k = (time - spentAt) / 700;
      if (k >= 0 && k < 1) {
        for (let i = 0; i < spentN; i++) {
          const d = 40 + i * 46;
          const side = i % 2 ? 1 : -1;
          const x = spentX + Math.cos(spentA) * d - Math.sin(spentA) * side * 10, y = spentY + 14 + Math.sin(spentA) * d + Math.cos(spentA) * side * 6;
          g.fillStyle(GILT_LIT, 0.6 * (1 - k)); g.fillEllipse(x, y, 16, 7);
        }
      }
    },
  };
};

/**
 * Beanstalk Seed — every 3rd ability you cast plants a beanstalk at your feet (2 at most). Stand at
 * a root and it feeds you 3 health a second. After 6s it topples toward the foe: 14 to them if they
 * are under it.
 */
const beanstalkSeed: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  /** A planted stalk: it grows, stands, then topples once toward the foe and lies there fading. */
  interface Stalk { x: number; y: number; at: number; fallAt: number; fallA: number; fallen: boolean; struck: boolean }
  const GROW = 1200, LIFE = 6000, FALL = 420, LIE = 900, LEN = 360;
  let casts = 0;
  let stalks: Stalk[] = [];
  let healAcc = 0;
  const tick = frameClock();
  return {
    onCast() {
      casts++;
      if (casts % 3 !== 0 || !alive(ctx.player)) return;
      const now = ctx.scene.time.now;
      // Two standing at once at most: the seed waits for one to fall before it sprouts again.
      if (stalks.filter((s) => !s.fallen).length >= 2) return;
      stalks.push({ x: ctx.player.x, y: ctx.player.y + 16, at: now, fallAt: now + LIFE, fallA: 0, fallen: false, struck: false });
      ctx.sfx('stone-rise');
    },
    update(time) {
      const dt = tick(time);
      const p = ctx.player, n = ctx.npc;
      let rooted = false;
      for (const s of stalks) {
        if (!s.fallen && time - s.at > GROW * 0.5 && dist(p.x, p.y + 16, s.x, s.y) < 40) rooted = true;
        if (!s.fallen && time >= s.fallAt) {
          s.fallen = true;
          s.fallA = Math.atan2(n.y - s.y, n.x - s.x);
          ctx.sfx('thorn');
        }
        if (s.fallen && !s.struck && time >= s.fallAt + FALL) {
          s.struck = true;
          const ex = s.x + Math.cos(s.fallA) * LEN, ey = s.y + Math.sin(s.fallA) * LEN;
          if (alive(n) && segDist(n.x, n.y, s.x, s.y, ex, ey) < 34) {
            ctx.hit(n, 14, n.x, n.y);
            ctx.float(n.x, n.y - 50, 'TIMBER!', '#8ad85a');
          }
          ctx.sfx('stone-slam');
        }
      }
      stalks = stalks.filter((s) => !s.fallen || time < s.fallAt + FALL + LIE);
      if (rooted && alive(p)) {
        healAcc += dt * 3;
        if (healAcc >= 1) { const h = Math.floor(healAcc); healAcc -= h; ctx.heal(p, h); }
      } else healAcc = 0;
    },
    drawGround(g, time) {
      for (const s of stalks) {
        if (s.fallen) {
          // Toppling, then lying where it fell: a long green line with leaves, fading.
          const k = clamp((time - s.fallAt) / FALL, 0, 1);
          const fade = clamp(1 - (time - s.fallAt - FALL) / LIE, 0, 1);
          const len = LEN * k;
          const ex = s.x + Math.cos(s.fallA) * len, ey = s.y + Math.sin(s.fallA) * len;
          g.lineStyle(9, INK, 0.5 * fade); g.lineBetween(s.x, s.y, ex, ey);
          g.lineStyle(6, BEAN, fade); g.lineBetween(s.x, s.y, ex, ey);
          for (let d = 30; d < len; d += 40) {
            const lx = s.x + Math.cos(s.fallA) * d, ly = s.y + Math.sin(s.fallA) * d;
            g.fillStyle(BEAN_LIT, fade); g.fillCircle(lx + Math.sin(s.fallA) * 8, ly - Math.cos(s.fallA) * 8, 5);
          }
        } else {
          // The root ring, and in the last second a line showing where it will fall.
          if (s.fallAt - time < 1000) {
            const a = Math.atan2(ctx.npc.y - s.y, ctx.npc.x - s.x);
            g.lineStyle(2, BEAN_LIT, 0.5); g.lineBetween(s.x, s.y, s.x + Math.cos(a) * LEN, s.y + Math.sin(a) * LEN);
          }
          g.lineStyle(2, BEAN_LIT, 0.35); g.strokeCircle(s.x, s.y, 40);
        }
      }
    },
    drawAir(g, time) {
      for (const s of stalks) {
        if (s.fallen) continue;
        const grow = clamp((time - s.at) / GROW, 0, 1);
        beanstalk(g, s.x, s.y, s.y - 150, time / 1000, grow, 0.9, 0.7);
      }
    },
  };
};

/**
 * Fairest Compact — every 6s the little mirror asks who is fairest. If your health is the greater
 * share, you are: for 6s, a quarter of every hit you take is cast back at the foe. If not, you are
 * the underdog: +15% damage for 6s.
 */
const fairestCompact: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const PERIOD = 6000;
  let next = ctx.scene.time.now + 3000;
  let mode: 'fair' | 'under' | null = null;
  let until = 0, askedAt = -9999;
  let self = false;
  return {
    update(time) {
      if (time >= until) mode = null;
      if (time < next || !alive(ctx.player) || !alive(ctx.npc)) return;
      next = time + PERIOD; askedAt = time; until = time + PERIOD;
      const mine = ctx.player.hp / Math.max(1, ctx.player.maxHp), theirs = ctx.npc.hp / Math.max(1, ctx.npc.maxHp);
      if (mine > theirs) {
        mode = 'fair';
        ctx.float(ctx.player.x, ctx.player.y - 54, 'FAIREST', '#d8c8ff');
      } else {
        mode = 'under';
        ctx.boostDamage(1.15, PERIOD);
        ctx.float(ctx.player.x, ctx.player.y - 54, 'NOT THE FAIREST', '#ffb0a0');
      }
      ctx.sfx('crystal-chime');
    },
    onHitTaken(amount) {
      if (self || mode !== 'fair' || amount <= 0 || !alive(ctx.npc)) return;
      self = true; ctx.hit(ctx.npc, Math.max(1, Math.round(amount * 0.25)), ctx.npc.x, ctx.npc.y); self = false;
      ctx.flash(ctx.npc.x, ctx.npc.y, 0xd8c8ff);
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!alive(p)) return;
      const k = (time - askedAt) / 900;
      if (k >= 0 && k < 1) magicMirror(g, p.x + 30, p.y - 30, 0.35, time / 1000, 1 - Math.abs(k - 0.5) * 2, mode === 'fair' ? 0xd8c8ff : 0xffb0a0, 1 - k * 0.5);
      if (mode === 'fair') {
        g.lineStyle(1.6, 0xd8c8ff, 0.5); g.strokeCircle(p.x, p.y, 26 + Math.sin(time / 200) * 2);
      } else if (mode === 'under') {
        g.fillStyle(0xffb0a0, 0.7); g.fillTriangle(p.x - 4, p.y - 44, p.x + 4, p.y - 44, p.x, p.y - 52);
      }
    },
  };
};

/**
 * Dragon-Scale Locket — damage you take stokes the scale (30 heat lights it). Lit, your next
 * ability also breathes fire at the foe if they are within 240px: three bursts of 6.
 */
const dragonscaleLocket: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const LIGHT = 30, REACH = 240;
  let heat = 0;
  let breath: { at: number; a: number; x: number; y: number; ticks: number } | null = null;
  return {
    onHitTaken(amount) {
      if (amount > 0) heat = Math.min(LIGHT, heat + amount);
    },
    onCast() {
      if (heat < LIGHT || breath || !alive(ctx.player)) return;
      const p = ctx.player, n = ctx.npc;
      heat = 0;
      breath = { at: ctx.scene.time.now, a: Math.atan2(n.y - p.y, n.x - p.x), x: p.x, y: p.y, ticks: 0 };
      ctx.sfx('flame-burst');
    },
    update(time) {
      if (!breath) return;
      const p = ctx.player, n = ctx.npc;
      breath.x = p.x; breath.y = p.y; breath.a = Math.atan2(n.y - p.y, n.x - p.x);
      const due = Math.floor((time - breath.at) / 200);
      while (breath.ticks < Math.min(3, due + 1)) {
        breath.ticks++;
        if (alive(n) && dist(p.x, p.y, n.x, n.y) < REACH) { ctx.hit(n, 6, n.x, n.y); ctx.sfx('sizzle'); }
      }
      if (time - breath.at > 700) breath = null;
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!alive(p)) return;
      // The locket on your chest: a green scale that reddens as it heats.
      const k = heat / LIGHT;
      inkEllipse(g, p.x + 10, p.y - 4, 9, 11, k >= 1 ? EMBER : DRAGON, 0.95, 1);
      g.fillStyle(DRAGON_LIT, 0.8 * (1 - k)); g.fillEllipse(p.x + 9, p.y - 6, 3, 5);
      if (k >= 1) { g.fillStyle(FLAME, 0.3 + 0.2 * Math.sin(time / 90)); g.fillCircle(p.x + 10, p.y - 4, 10); }
      if (breath) {
        const age = (time - breath.at) / 700;
        for (let i = 0; i < 10; i++) {
          const d = 20 + ((i / 10 + age * 2) % 1) * REACH;
          const spread = (i % 3 - 1) * 0.18;
          const x = breath.x + Math.cos(breath.a + spread) * d, y = breath.y + Math.sin(breath.a + spread) * d;
          g.fillStyle(i % 2 ? EMBER : FLAME, 0.75 * (1 - age)); g.fillCircle(x, y, 6 + d * 0.06);
        }
      }
    },
  };
};

/**
 * The Unfinished Legend (artifact) — every 9s the book writes its next chapter, in order: *A Hero
 * Rises* (+18% damage for 4s), *Peril* (the next hit you take in 4s is half-mended at once),
 * *Triumph* (14 to the foe). *Happily Ever After*: once a fight, the first time you fall below 25%
 * health, the last page turns and you mend a fifth of your health.
 */
const unfinishedLegend: ItemScriptFactory = (ctx: ItemScriptCtx): ItemScript => {
  const PERIOD = 9000;
  let next = ctx.scene.time.now + 4000;
  let chapter = 0, writtenAt = -9999;
  let perilUntil = 0, everAfter = false, everAt = -9999;
  return {
    update(time) {
      const p = ctx.player;
      if (!everAfter && alive(p) && p.hp < p.maxHp * 0.25) {
        everAfter = true; everAt = time;
        ctx.heal(p, Math.round(p.maxHp * 0.2));
        ctx.float(p.x, p.y - 56, 'HAPPILY EVER AFTER', '#ffe08a');
        ctx.sfx('holy-chord');
      }
      if (time < next || !alive(p)) return;
      next = time + PERIOD;
      writtenAt = time;
      const c = chapter % 3;
      chapter++;
      if (c === 0) { ctx.boostDamage(1.18, 4000); ctx.float(p.x, p.y - 52, 'A HERO RISES', '#ffe08a'); ctx.sfx('status-buff'); }
      else if (c === 1) { perilUntil = time + 4000; ctx.float(p.x, p.y - 52, 'PERIL!', '#b8a4ff'); ctx.sfx('shield-block'); }
      else if (alive(ctx.npc)) { ctx.hit(ctx.npc, 14, ctx.npc.x, ctx.npc.y); ctx.float(ctx.npc.x, ctx.npc.y - 52, 'TRIUMPH', '#ffe08a'); ctx.sfx('judgement'); }
    },
    onHitTaken(amount) {
      if (amount <= 0 || ctx.scene.time.now >= perilUntil || !alive(ctx.player)) return;
      perilUntil = 0;
      ctx.heal(ctx.player, Math.max(1, Math.round(amount * 0.5)));
    },
    drawAir(g, time) {
      const p = ctx.player;
      if (!alive(p)) return;
      // The book floats at your shoulder; it flips open as each chapter is written.
      const bob = Math.sin(time / 400) * 3;
      const bx = p.x - 30, by = p.y - 30 + bob;
      const fresh = clamp(1 - (time - writtenAt) / 600, 0, 1);
      openBook(g, bx, by, 30 + fresh * 10, 14 + fresh * 6, CLOTH_RED, 0.95, true, chapter);
      if (fresh > 0) {
        g.lineStyle(1.4, PAGE, fresh); g.lineBetween(bx, by - 10, bx + 14 * (1 - fresh) - 7, by - 22 * fresh);
      }
      // Chapter pips.
      for (let i = 0; i < 3; i++) { g.fillStyle(i === chapter % 3 ? GILT_LIT : GILT, i === chapter % 3 ? 1 : 0.4); g.fillCircle(bx - 8 + i * 8, by + 6, 2); }
      if (ctx.scene.time.now < perilUntil) { g.lineStyle(2, MYTH_LIT, 0.6); g.strokeCircle(p.x, p.y, 28); }
      const e = (time - everAt) / 1200;
      if (e >= 0 && e < 1) { g.lineStyle(3, GILT_LIT, 1 - e); g.strokeCircle(p.x, p.y, 24 + e * 60); }
    },
  };
};

export const FABLE_SCRIPTS: Record<string, ItemScriptFactory> = {
  [CHARM_GARTER]: sevenLeagueGarter,
  [CHARM_SEED]: beanstalkSeed,
  [CHARM_COMPACT]: fairestCompact,
  [CHARM_LOCKET]: dragonscaleLocket,
  [ART_LEGEND]: unfinishedLegend,
};

// ── Item defs ────────────────────────────────────────────────────────

export const FABLE_ITEMS: IsleItemDef[] = [
  {
    id: CHARM_GARTER, name: 'Seven-League Garter', emoji: '🥾', kind: 'charm', price: 280, isle: 'air',
    flavor: 'A ribbon off the boots in the old tale, bound into a garter. It remembers how far you\'ve walked.',
    script: CHARM_GARTER,
    scriptText: [
      'Every 260px you walk banks a League (up to 7).',
      'Your next ability spends them: +5% damage per League for 3s and +4% speed per League for 2s.',
    ],
  },
  {
    id: CHARM_SEED, name: 'Beanstalk Seed', emoji: '🫘', kind: 'charm', price: 390, isle: 'air',
    flavor: 'One of Jem\'s, swapped for nothing. It is very impatient to be planted.',
    effect: { maxHp: 6 },
    script: CHARM_SEED,
    scriptText: [
      'Every 3rd ability plants a beanstalk at your feet (2 standing at most). At its root you mend 3 health a second.',
      'After 6s it topples toward the foe: 14 damage if they are under it.',
    ],
  },
  {
    id: CHARM_COMPACT, name: 'Fairest Compact', emoji: '🪞', kind: 'charm', price: 560, isle: 'air',
    flavor: 'A pocket mirror cut from the corner of Gilt\'s. It still asks the question. It is still never kind.',
    script: CHARM_COMPACT,
    scriptText: [
      'Every 6s it asks who is fairest. If your health share is greater, a quarter of every hit you take is cast back.',
      'If not, you are the underdog: +15% damage until it asks again.',
    ],
  },
  {
    id: CHARM_LOCKET, name: 'Dragon-Scale Locket', emoji: '🐉', kind: 'charm', price: 780, isle: 'air',
    flavor: 'A scale Wyrmwood shed in the year she was chained. Bramwell sold it to pay for lamp-oil. It is warm.',
    effect: { maxHp: 8 },
    script: CHARM_LOCKET,
    scriptText: [
      'Damage you take stokes the scale; at 30 it is lit.',
      'Lit, your next ability also breathes fire on the foe within 240px: three bursts of 6.',
    ],
  },
  {
    id: ART_LEGEND, name: 'The Unfinished Legend', emoji: '📖', kind: 'artifact', isle: 'air',
    flavor: 'Prince Legend\'s own book, the pages after "and he was given the pen" still blank. Write in it.',
    script: ART_LEGEND,
    scriptText: [
      'Every 9s it writes a chapter in turn: A Hero Rises (+18% damage 4s), Peril (next hit in 4s half-mended), Triumph (14 to the foe).',
      'Happily Ever After: once a fight, falling below 25% health mends a fifth of your health.',
    ],
  },
  // The castle moat's fish.
  {
    id: 'fish-wishing-carp', name: 'Wishing Carp', emoji: '🐟', kind: 'fish', sell: 34, isle: 'air',
    flavor: 'Gold fins and a wise old face. Catch one fair and it owes you a small wish. Eat one and it owes you nothing.',
    effect: { critChance: 0.03 },
  },
  {
    id: 'fish-bard-bass', name: 'Bard Bass', emoji: '🎶', kind: 'fish', sell: 62, isle: 'air',
    flavor: 'It hums back any song sung near the moat for a year. Half of Fable\'s banned tunes are living in bass.',
    effect: { cooldownMult: 0.97 },
  },
];
