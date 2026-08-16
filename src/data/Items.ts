/**
 * Campaign shop items.
 *
 * Every item is a pure data record: a themed name, a price in ⚡ Sparks, one line of
 * flavour, and an `ItemEffect` describing exactly what it changes. `ItemsKit` applies
 * the effect at match start and the shop/inventory UI *generates* its stat lines from
 * the very same object — so an item can never advertise something it doesn't do.
 *
 * Each world stocks three items themed to its element. Prices climb with world depth,
 * and the abstract realm carries a premium.
 */

export interface ItemEffect {
  // ── Vitals ────────────────────────────────────────────────────────
  /** Added to (or, if negative, taken from) max HP. Fully heals on application. */
  maxHp?: number;
  /** Charges that each fully block one incoming hit. */
  shieldCharges?: number;
  /** Bonus HP pool spent before real health. */
  shieldHp?: number;
  /** HP restored per second, all match. */
  regenPerSecond?: number;
  /** Fraction of damage dealt to the enemy that is returned to you as health. */
  lifestealFrac?: number;
  /** Once per match, a lethal hit is cancelled and you are restored to this fraction of max HP. */
  reviveHpFrac?: number;

  // ── Offence ───────────────────────────────────────────────────────
  /** Multiplier on all damage you deal. */
  damageMult?: number;
  /** Added to your critical-hit chance (0–1). */
  critChance?: number;
  /** Raises your critical multiplier to at least this value. */
  critMult?: number;
  /** Multiplier on the duration of status effects you apply. */
  statusDurMult?: number;
  /** Multiplier on the damage of status effects you apply. */
  statusDmgMult?: number;

  // ── Defence ───────────────────────────────────────────────────────
  /** Multiplier on all damage you take. */
  damageTakenMult?: number;
  /** Added to your dodge chance (0–1). */
  dodgeChance?: number;
  /** Fraction of damage taken that is reflected back at the attacker. */
  reflectFraction?: number;
  /** Milliseconds of invincibility at the opening bell. */
  invincibleMs?: number;

  // ── Tempo ─────────────────────────────────────────────────────────
  /** Multiplier on movement speed. */
  speedMult?: number;
  /** Multiplier on every ability cooldown (below 1 is faster). */
  cooldownMult?: number;
  /** Multiplier on your ultimate's cooldown specifically. */
  ultimateCooldownMult?: number;

  // ── Costs ─────────────────────────────────────────────────────────
  /** Damage you take every second for the whole match. */
  selfDamagePerSec?: number;

  // ── Sabotage ──────────────────────────────────────────────────────
  /** Multiplier on the opponent's starting max HP. */
  enemyMaxHpMult?: number;
  /** Multiplier on the opponent's movement speed. */
  enemySpeedMult?: number;
  /** Multiplier on the opponent's outgoing damage. */
  enemyDamageMult?: number;

  // ── Behaviors ─────────────────────────────────────────────────────
  /** Triggered effects — the layer beyond flat stats. ItemsKit runs them. */
  behaviors?: ItemBehavior[];
}

/**
 * A triggered item effect: when `trigger` fires (subject to chance / cooldown /
 * once-per-match), `action` happens. Still pure data — ItemsKit interprets it,
 * and `describeEffect` renders it, so the shop can never overpromise.
 */
export interface ItemBehavior {
  trigger: 'onHitTaken' | 'onHitDealt' | 'onLowHp' | 'everyNSec' | 'onCast';
  /** onLowHp: fires when HP first drops below this fraction. */
  thresholdFrac?: number;
  /** everyNSec: period in seconds. */
  periodSec?: number;
  /** Roll per trigger, 0–1. Default 1. */
  chance?: number;
  /** Minimum seconds between firings. Default 0. */
  cooldownSec?: number;
  /** Fire at most once per match. Default true for onLowHp, else false. */
  oncePerMatch?: boolean;

  action: 'burstAoe' | 'healBurst' | 'tempHaste' | 'tempDamage' | 'shieldCharge'
    | 'cooldownRefund' | 'sear' | 'slowEnemy';
  /** Damage / heal / charges / refund-ms / total sear damage, per action. */
  amount?: number;
  /** burstAoe radius. Default 120. */
  radius?: number;
  /** Duration for temp buffs, sear ticks and slows. */
  durationMs?: number;
  /** tempHaste / tempDamage / slowEnemy multiplier. */
  mult?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  /** World whose shop stocks this item. */
  elementId: string;
  priceSparks: number;
  /** Hand-written line of character. The mechanical read-out is generated. */
  flavor: string;
  effect: ItemEffect;
}

// ── Effect → prose ───────────────────────────────────────────────────

const pct = (mult: number): string => `${Math.round(Math.abs(1 - mult) * 100)}%`;
const raw = (frac: number): string => `${Math.round(frac * 100)}%`;

/**
 * One human line per thing the effect actually changes, in a stable order so
 * comparable items read comparably. Buffs first, costs last.
 */
export function describeEffect(e: ItemEffect): string[] {
  const out: string[] = [];

  if (e.maxHp !== undefined && e.maxHp !== 0) {
    out.push(`${e.maxHp > 0 ? '+' : '−'}${Math.abs(e.maxHp)} Max HP`);
  }
  if (e.shieldCharges) out.push(`Blocks the next ${e.shieldCharges} hit${e.shieldCharges === 1 ? '' : 's'}`);
  if (e.shieldHp) out.push(`+${e.shieldHp} Shield HP`);
  if (e.regenPerSecond) out.push(`+${e.regenPerSecond} HP/sec regen`);
  if (e.lifestealFrac) out.push(`Heal ${raw(e.lifestealFrac)} of damage dealt`);
  if (e.reviveHpFrac) out.push(`Survive one lethal hit at ${raw(e.reviveHpFrac)} HP`);

  if (e.damageMult !== undefined && e.damageMult !== 1) {
    out.push(`${e.damageMult > 1 ? '+' : '−'}${pct(e.damageMult)} damage dealt`);
  }
  if (e.critChance) out.push(`+${raw(e.critChance)} crit chance`);
  if (e.critMult) out.push(`Crits deal ${e.critMult}× damage`);
  if (e.statusDurMult && e.statusDurMult !== 1) out.push(`+${pct(e.statusDurMult)} status duration`);
  if (e.statusDmgMult && e.statusDmgMult !== 1) out.push(`+${pct(e.statusDmgMult)} status damage`);

  if (e.damageTakenMult !== undefined && e.damageTakenMult !== 1) {
    out.push(`${e.damageTakenMult < 1 ? '−' : '+'}${pct(e.damageTakenMult)} damage taken`);
  }
  if (e.dodgeChance) out.push(`+${raw(e.dodgeChance)} dodge chance`);
  if (e.reflectFraction) out.push(`Reflect ${raw(e.reflectFraction)} of damage taken`);
  if (e.invincibleMs) out.push(`Invincible for the first ${(e.invincibleMs / 1000).toFixed(0)}s`);

  if (e.speedMult !== undefined && e.speedMult !== 1) {
    out.push(`${e.speedMult > 1 ? '+' : '−'}${pct(e.speedMult)} move speed`);
  }
  if (e.cooldownMult !== undefined && e.cooldownMult !== 1) {
    out.push(`${e.cooldownMult < 1 ? '−' : '+'}${pct(e.cooldownMult)} cooldowns`);
  }
  if (e.ultimateCooldownMult !== undefined && e.ultimateCooldownMult !== 1) {
    out.push(`${e.ultimateCooldownMult < 1 ? '−' : '+'}${pct(e.ultimateCooldownMult)} ultimate cooldown`);
  }

  if (e.enemyMaxHpMult !== undefined && e.enemyMaxHpMult !== 1) out.push(`Enemy has ${pct(e.enemyMaxHpMult)} less HP`);
  if (e.enemySpeedMult !== undefined && e.enemySpeedMult !== 1) out.push(`Enemy is ${pct(e.enemySpeedMult)} slower`);
  if (e.enemyDamageMult !== undefined && e.enemyDamageMult !== 1) out.push(`Enemy deals ${pct(e.enemyDamageMult)} less damage`);

  if (e.selfDamagePerSec) out.push(`Costs ${e.selfDamagePerSec} HP every second`);

  for (const b of e.behaviors ?? []) out.push(describeBehavior(b));

  return out;
}

/** One honest line per behavior — trigger, odds, and what actually happens. */
function describeBehavior(b: ItemBehavior): string {
  const when =
    b.trigger === 'onHitTaken' ? 'When hit' :
    b.trigger === 'onHitDealt' ? 'On dealing damage' :
    b.trigger === 'onLowHp' ? `Below ${Math.round((b.thresholdFrac ?? 0.3) * 100)}% HP` :
    b.trigger === 'onCast' ? 'On casting' :
    `Every ${b.periodSec ?? 5}s`;
  const odds = b.chance !== undefined && b.chance < 1 ? ` (${Math.round(b.chance * 100)}%)` : '';
  const once = (b.oncePerMatch ?? b.trigger === 'onLowHp') ? ', once per match' : '';
  const secs = (ms?: number): string => `${((ms ?? 3000) / 1000).toFixed(0)}s`;
  const what =
    b.action === 'burstAoe' ? `blast nearby foes for ${b.amount ?? 20}` :
    b.action === 'healBurst' ? `heal ${b.amount ?? 15} HP` :
    b.action === 'tempHaste' ? `+${Math.round(((b.mult ?? 1.3) - 1) * 100)}% speed for ${secs(b.durationMs)}` :
    b.action === 'tempDamage' ? `+${Math.round(((b.mult ?? 1.3) - 1) * 100)}% damage for ${secs(b.durationMs)}` :
    b.action === 'shieldCharge' ? `gain ${b.amount ?? 1} shield charge${(b.amount ?? 1) === 1 ? '' : 's'}` :
    b.action === 'cooldownRefund' ? `cooldowns skip ${secs(b.amount)}` :
    b.action === 'sear' ? `sear the foe for ${b.amount ?? 15} over ${secs(b.durationMs)}` :
    `slow the foe ${Math.round((1 - (b.mult ?? 0.7)) * 100)}% for ${secs(b.durationMs)}`;
  return `${when}${odds}: ${what}${once}`;
}

/** One-line summary for list rows. */
export function shortDescOf(def: ItemDef): string {
  return describeEffect(def.effect).join('  ·  ');
}

/** Flavour line plus the full mechanical read-out, for the detail view. */
export function fullDescOf(def: ItemDef): string {
  return `${def.flavor}\n\n${describeEffect(def.effect).map((l) => `• ${l}`).join('\n')}`;
}

// ── Catalogue ────────────────────────────────────────────────────────

export const ITEMS: ItemDef[] = [
  // ══ Fire ══════════════════════════════════════════════════════════
  { id: 'grilled-cheese', name: 'Grilled Cheese', emoji: '🧀', elementId: 'fire', priceSparks: 4,
    flavor: 'Pressed on a shovel over the coals. Still the best thing in the world.',
    effect: { maxHp: 20,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: 25 }] } },
  { id: 'hot-sauce', name: 'Hot Sauce', emoji: '🌶️', elementId: 'fire', priceSparks: 6,
    flavor: 'Nobody asked how fast it makes you. They asked why you were crying.',
    effect: { speedMult: 1.5, selfDamagePerSec: 1,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.18, cooldownSec: 4, action: 'sear', amount: 8, durationMs: 2500 }] } },
  { id: 'ember-charm', name: 'Ember Charm', emoji: '🔥', elementId: 'fire', priceSparks: 7,
    flavor: 'A coal that never went out, wrapped in wire and worn close.',
    effect: { damageMult: 1.1,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.15, cooldownSec: 4, action: 'sear', amount: 12, durationMs: 3000 }] } },

  // ══ Water ═════════════════════════════════════════════════════════
  { id: 'bubble', name: 'Bubble', emoji: '🫧', elementId: 'water', priceSparks: 5,
    flavor: 'Impossibly stubborn for something made of nothing.',
    effect: { shieldCharges: 2,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'shieldCharge', amount: 2 }] } },
  { id: 'canteen', name: 'Deep Canteen', emoji: '🧴', elementId: 'water', priceSparks: 7,
    flavor: 'Never empties. Nobody has asked where the water comes from.',
    effect: { regenPerSecond: 2,
      behaviors: [{ trigger: 'everyNSec', periodSec: 10, action: 'healBurst', amount: 8 }] } },
  { id: 'riptide-boots', name: 'Riptide Boots', emoji: '🥾', elementId: 'water', priceSparks: 9,
    flavor: 'The current decides where you go. Usually somewhere useful.',
    effect: { speedMult: 1.12, dodgeChance: 0.10,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.25, cooldownSec: 5, action: 'tempHaste', mult: 1.35, durationMs: 1800 }] } },

  // ══ Life ══════════════════════════════════════════════════════════
  { id: 'seedling', name: 'Stubborn Seedling', emoji: '🌱', elementId: 'life', priceSparks: 7,
    flavor: 'It grew through a paving slab. It can grow through this.',
    effect: { maxHp: 30,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.25, action: 'healBurst', amount: 35 }] } },
  { id: 'honeycomb', name: 'Honeycomb', emoji: '🍯', elementId: 'life', priceSparks: 10,
    flavor: 'Everything a hive knows about turning violence into food.',
    effect: { lifestealFrac: 0.06,
      behaviors: [{ trigger: 'everyNSec', periodSec: 8, action: 'healBurst', amount: 6 }] } },
  { id: 'thornmail', name: 'Thornmail', emoji: '🌵', elementId: 'life', priceSparks: 9,
    flavor: 'Woven, not forged. It grows back overnight.',
    effect: { reflectFraction: 0.20,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 4, action: 'burstAoe', amount: 16, radius: 110 }] } },

  // ══ Air ═══════════════════════════════════════════════════════════
  { id: 'stormfeather', name: 'Stormfeather', emoji: '🪶', elementId: 'air', priceSparks: 7,
    flavor: 'Pulled from something that never landed.',
    effect: { speedMult: 1.18,
      behaviors: [{ trigger: 'everyNSec', periodSec: 9, action: 'tempHaste', mult: 1.3, durationMs: 2000 }] } },
  { id: 'updraft-vial', name: 'Updraft Vial', emoji: '🌪️', elementId: 'air', priceSparks: 8,
    flavor: 'Uncork it and the ground stops being so insistent.',
    effect: { dodgeChance: 0.15,
      behaviors: [{ trigger: 'onHitTaken', cooldownSec: 7, action: 'tempHaste', mult: 1.5, durationMs: 1400 }] } },
  { id: 'windchime', name: 'Windchime', emoji: '🎐', elementId: 'air', priceSparks: 10,
    flavor: 'It rings a half-second before anything happens.',
    effect: { cooldownMult: 0.9,
      behaviors: [{ trigger: 'onCast', chance: 0.2, action: 'cooldownRefund', amount: 600 }] } },

  // ══ Earth ═════════════════════════════════════════════════════════
  { id: 'granite-slab', name: 'Granite Slab', emoji: '🪨', elementId: 'earth', priceSparks: 7,
    flavor: 'Strapped to the chest. Deeply unfashionable. Extremely effective.',
    effect: { shieldHp: 40,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.12, cooldownSec: 5, action: 'burstAoe', amount: 14, radius: 110 }] } },
  { id: 'iron-boots', name: 'Iron Boots', emoji: '👢', elementId: 'earth', priceSparks: 9,
    flavor: 'Nothing moves you. You do not move much either.',
    effect: { damageTakenMult: 0.80, speedMult: 0.90,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.18, cooldownSec: 6, action: 'shieldCharge', amount: 1 }] } },
  { id: 'geode-shard', name: 'Geode Shard', emoji: '💠', elementId: 'earth', priceSparks: 10,
    flavor: 'Cracked open at the vein. Still warm.',
    effect: { maxHp: 25, damageMult: 1.10,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 5, action: 'burstAoe', amount: 18, radius: 100 }] } },

  // ══ Oil ═══════════════════════════════════════════════════════════
  { id: 'grease-can', name: 'Grease Can', emoji: '🛢️', elementId: 'oil', priceSparks: 12,
    flavor: 'Every moving part you own, complaining less.',
    effect: { cooldownMult: 0.80,
      behaviors: [{ trigger: 'onCast', chance: 0.15, action: 'cooldownRefund', amount: 500 }] } },
  { id: 'slick-soles', name: 'Slick Soles', emoji: '👟', elementId: 'oil', priceSparks: 10,
    flavor: 'Stopping is now a skill issue.',
    effect: { speedMult: 1.18,
      behaviors: [{ trigger: 'onHitTaken', cooldownSec: 6, action: 'tempHaste', mult: 1.4, durationMs: 2000 }] } },
  { id: 'crude-flask', name: 'Crude Flask', emoji: '⚗️', elementId: 'oil', priceSparks: 11,
    flavor: 'Thrown at the feet. Nobody sprints through that.',
    effect: { enemySpeedMult: 0.85,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.15, cooldownSec: 3, action: 'slowEnemy', mult: 0.65, durationMs: 1600 }] } },

  // ══ Ice ═══════════════════════════════════════════════════════════
  { id: 'frost-ration', name: 'Frost Ration', emoji: '🍧', elementId: 'ice', priceSparks: 11,
    flavor: 'Preserved perfectly. For rather longer than anyone intended.',
    effect: { maxHp: 50,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'healBurst', amount: 45 }] } },
  { id: 'glacier-plate', name: 'Glacier Plate', emoji: '🧊', elementId: 'ice', priceSparks: 13,
    flavor: 'A thousand winters, compressed into one very cold sheet.',
    effect: { shieldHp: 60,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 6, action: 'slowEnemy', mult: 0.55, durationMs: 2000 }] } },
  { id: 'chill-draught', name: 'Chill Draught', emoji: '🥶', elementId: 'ice', priceSparks: 12,
    flavor: 'Cold hands do not swing well.',
    effect: { enemyDamageMult: 0.88,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 3, action: 'slowEnemy', mult: 0.6, durationMs: 1500 }] } },

  // ══ Growth ════════════════════════════════════════════════════════
  { id: 'spore-packet', name: 'Spore Packet', emoji: '🍄', elementId: 'growth', priceSparks: 11,
    flavor: 'Do not open indoors. Do not open outdoors either.',
    effect: { regenPerSecond: 3,
      behaviors: [{ trigger: 'everyNSec', periodSec: 8, action: 'sear', amount: 6, durationMs: 3000 }] } },
  { id: 'petri-dish', name: 'Petri Dish', emoji: '🧫', elementId: 'growth', priceSparks: 14,
    flavor: 'Something in here has been eating and it has opinions.',
    effect: { lifestealFrac: 0.12,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 4, action: 'healBurst', amount: 12 }] } },
  { id: 'mutagen', name: 'Mutagen', emoji: '🧬', elementId: 'growth', priceSparks: 12,
    flavor: 'Rewrites you slightly. The new draft hits harder and lives less.',
    effect: { damageMult: 1.20, maxHp: -15,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 2000 }] } },

  // ══ Crystal ═══════════════════════════════════════════════════════
  { id: 'prism-lens', name: 'Prism Lens', emoji: '🔍', elementId: 'crystal', priceSparks: 13,
    flavor: 'Shows you exactly where the flaw is. Everything has one.',
    effect: { critChance: 0.20,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 6, action: 'tempDamage', mult: 1.2, durationMs: 2200 }] } },
  { id: 'quartz-ward', name: 'Quartz Ward', emoji: '💎', elementId: 'crystal', priceSparks: 13,
    flavor: 'Four facets. Each one shatters instead of you.',
    effect: { shieldCharges: 4,
      behaviors: [{ trigger: 'everyNSec', periodSec: 14, action: 'shieldCharge', amount: 1 }] } },
  { id: 'resonant-core', name: 'Resonant Core', emoji: '🔮', elementId: 'crystal', priceSparks: 14,
    flavor: 'Whatever you inflict, it keeps ringing.',
    effect: { statusDurMult: 1.30, statusDmgMult: 1.20,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.14, cooldownSec: 4, action: 'sear', amount: 10, durationMs: 3500 }] } },

  // ══ Hunt ══════════════════════════════════════════════════════════
  { id: 'bone-whistle', name: 'Bone Whistle', emoji: '🦴', elementId: 'hunt', priceSparks: 14,
    flavor: 'One note. Everything soft nearby stops moving.',
    effect: { critChance: 0.25, critMult: 2.5,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 7, action: 'burstAoe', amount: 30, radius: 130 }] } },
  { id: 'tracker-pelt', name: "Tracker's Pelt", emoji: '🐾', elementId: 'hunt', priceSparks: 13,
    flavor: 'Taken off something that was very good at not being caught.',
    effect: { speedMult: 1.15, dodgeChance: 0.12,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.15, cooldownSec: 4, action: 'slowEnemy', mult: 0.7, durationMs: 1500 }] } },
  { id: 'raw-steak', name: 'Raw Steak', emoji: '🥩', elementId: 'hunt', priceSparks: 15,
    flavor: 'Eaten mid-fight. Manners are for after.',
    effect: { lifestealFrac: 0.15,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'tempDamage', mult: 1.3, durationMs: 5000 }] } },

  // ══ Soul ══════════════════════════════════════════════════════════
  { id: 'spirit-lantern', name: 'Spirit Lantern', emoji: '🏮', elementId: 'soul', priceSparks: 19,
    flavor: 'It holds one of your endings in reserve, and gives it back once.',
    effect: { reviveHpFrac: 0.35,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.25, action: 'shieldCharge', amount: 2 }] } },
  { id: 'grave-dust', name: 'Grave Dust', emoji: '⚱️', elementId: 'soul', priceSparks: 13,
    flavor: 'Thrown in the eyes. Everything after that lands softer.',
    effect: { enemyDamageMult: 0.80,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.6, durationMs: 1800 }] } },
  { id: 'ectoplasm', name: 'Ectoplasm', emoji: '👻', elementId: 'soul', priceSparks: 12,
    flavor: 'Slightly less present than you were this morning.',
    effect: { dodgeChance: 0.18,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.22, cooldownSec: 5, action: 'tempHaste', mult: 1.4, durationMs: 1600 }] } },

  // ══ Shadow ════════════════════════════════════════════════════════
  { id: 'black-veil', name: 'Black Veil', emoji: '🕶️', elementId: 'shadow', priceSparks: 13,
    flavor: 'The opening exchange happens to somebody else.',
    effect: { invincibleMs: 3000,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'burstAoe', amount: 40, radius: 160 }] } },
  { id: 'night-oil', name: 'Night Oil', emoji: '🫙', elementId: 'shadow', priceSparks: 13,
    flavor: 'Rubbed into the knuckles. It works. It is not free.',
    effect: { damageMult: 1.25, damageTakenMult: 1.15,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 6, action: 'sear', amount: 14, durationMs: 3000 }] } },
  { id: 'hollow-charm', name: 'Hollow Charm', emoji: '🕳️', elementId: 'shadow', priceSparks: 14,
    flavor: 'Hung where they can see it. Their legs get heavy.',
    effect: { enemySpeedMult: 0.80,
      behaviors: [{ trigger: 'everyNSec', periodSec: 12, action: 'slowEnemy', mult: 0.6, durationMs: 2500 }] } },

  // ══ Creation ══════════════════════════════════════════════════════
  { id: 'toolbelt', name: 'Toolbelt', emoji: '🧰', elementId: 'creation', priceSparks: 15,
    flavor: 'Everything within reach, and reaching takes no time at all.',
    effect: { cooldownMult: 0.75,
      behaviors: [{ trigger: 'onCast', chance: 0.18, action: 'cooldownRefund', amount: 550 }] } },
  { id: 'blueprint', name: 'Master Blueprint', emoji: '📐', elementId: 'creation', priceSparks: 14,
    flavor: 'The big one, drawn out in advance. It comes around sooner.',
    effect: { ultimateCooldownMult: 0.65,
      behaviors: [{ trigger: 'onCast', chance: 0.12, action: 'cooldownRefund', amount: 900 }] } },
  { id: 'brass-plating', name: 'Brass Plating', emoji: '🛡️', elementId: 'creation', priceSparks: 15,
    flavor: 'Riveted on in the field. Ugly. Load-bearing.',
    effect: { shieldHp: 80,
      behaviors: [{ trigger: 'onHitTaken', cooldownSec: 9, action: 'shieldCharge', amount: 1 }] } },

  // ══ Gravity ═══════════════════════════════════════════════════════
  { id: 'lead-weight', name: 'Lead Weight', emoji: '🏋️', elementId: 'gravity', priceSparks: 15,
    flavor: 'Not for you. For them.',
    effect: { enemySpeedMult: 0.75,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.18, cooldownSec: 3, action: 'slowEnemy', mult: 0.55, durationMs: 1700 }] } },
  { id: 'singularity-marble', name: 'Singularity Marble', emoji: '⚫', elementId: 'gravity', priceSparks: 16,
    flavor: 'Weighs as much as a hill. Fits in a pocket. Do not drop it.',
    effect: { damageMult: 1.30,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 7, action: 'burstAoe', amount: 34, radius: 150 }] } },
  { id: 'null-field', name: 'Null Field', emoji: '🌌', elementId: 'gravity', priceSparks: 15,
    flavor: 'Incoming things arrive tired.',
    effect: { damageTakenMult: 0.75,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 7, action: 'shieldCharge', amount: 1 }] } },

  // ══ Time (world id `sand`) ════════════════════════════════════════
  { id: 'hourglass', name: 'Pocket Hourglass', emoji: '⏳', elementId: 'sand', priceSparks: 16,
    flavor: 'Turn it over and the waiting is already done.',
    effect: { cooldownMult: 0.70,
      behaviors: [{ trigger: 'onCast', chance: 0.2, action: 'cooldownRefund', amount: 700 }] } },
  { id: 'stopwatch', name: 'Stopwatch', emoji: '⏱️', elementId: 'sand', priceSparks: 14,
    flavor: 'Four seconds of the fight simply do not happen to you.',
    effect: { invincibleMs: 4000,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'tempHaste', mult: 1.6, durationMs: 4000 }] } },
  { id: 'time-sand', name: 'Hourglass Sand', emoji: '🏜️', elementId: 'sand', priceSparks: 14,
    flavor: 'Poured into a wound, it runs backwards.',
    effect: { maxHp: 40, regenPerSecond: 2,
      behaviors: [{ trigger: 'everyNSec', periodSec: 11, action: 'healBurst', amount: 14 }] } },

  // ══ Electricity ═══════════════════════════════════════════════════
  { id: 'capacitor', name: 'Capacitor', emoji: '🔋', elementId: 'electricity', priceSparks: 15,
    flavor: 'Holds a grudge, then discharges it all at once.',
    effect: { damageMult: 1.25,
      behaviors: [{ trigger: 'onCast', chance: 0.15, cooldownSec: 3, action: 'burstAoe', amount: 20, radius: 120 }] } },
  { id: 'copper-coil', name: 'Copper Coil', emoji: '🧵', elementId: 'electricity', priceSparks: 14,
    flavor: 'Wound tight. Everything cycles faster near it.',
    effect: { cooldownMult: 0.80,
      behaviors: [{ trigger: 'onCast', chance: 0.16, action: 'cooldownRefund', amount: 600 }] } },
  { id: 'surge-guard', name: 'Surge Guard', emoji: '⚡', elementId: 'electricity', priceSparks: 16,
    flavor: 'Trips five times before it gives up on you.',
    effect: { shieldCharges: 5,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.16, cooldownSec: 6, action: 'burstAoe', amount: 22, radius: 130 }] } },

  // ══ Acid (world id `slime`) ═══════════════════════════════════════
  { id: 'acid-vial', name: 'Acid Vial', emoji: '🧪', elementId: 'slime', priceSparks: 17,
    flavor: 'Thrown before the bell. They start the fight already leaking.',
    effect: { enemyMaxHpMult: 0.85,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.14, cooldownSec: 4, action: 'sear', amount: 12, durationMs: 3500 }] } },
  { id: 'caustic-coat', name: 'Caustic Coat', emoji: '🥼', elementId: 'slime', priceSparks: 15,
    flavor: 'Hitting you is a mistake with consequences.',
    effect: { reflectFraction: 0.30,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.22, cooldownSec: 4, action: 'sear', amount: 10, durationMs: 3000 }] } },
  { id: 'ooze-flask', name: 'Ooze Flask', emoji: '🟢', elementId: 'slime', priceSparks: 15,
    flavor: 'Whatever you put on them, it clings.',
    effect: { statusDurMult: 1.40,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.16, cooldownSec: 4, action: 'slowEnemy', mult: 0.62, durationMs: 2200 }] } },

  // ══ Fate ══════════════════════════════════════════════════════════
  { id: 'lucky-coin', name: 'Lucky Coin', emoji: '🪙', elementId: 'fate', priceSparks: 17,
    flavor: 'It has two faces and both of them are yours.',
    effect: { critChance: 0.30,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.07, cooldownSec: 8, action: 'healBurst', amount: 20 }] } },
  { id: 'loaded-die', name: 'Loaded Die', emoji: '🎲', elementId: 'fate', priceSparks: 16,
    flavor: 'It lands on "not today" more often than it should.',
    effect: { dodgeChance: 0.20,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'tempHaste', mult: 1.45, durationMs: 1800 }] } },
  { id: 'wild-card', name: 'Wild Card', emoji: '🃏', elementId: 'fate', priceSparks: 17,
    flavor: 'Fast and mean and thin. Play it early.',
    effect: { damageMult: 1.20, speedMult: 1.20, maxHp: -20,
      behaviors: [{ trigger: 'onCast', chance: 0.14, cooldownSec: 5, action: 'tempDamage', mult: 1.25, durationMs: 2500 }] } },

  // ══ Sound ═════════════════════════════════════════════════════════
  { id: 'tuning-fork', name: 'Tuning Fork', emoji: '🎵', elementId: 'sound', priceSparks: 15,
    flavor: 'Struck once against the enemy. They keep humming.',
    effect: { statusDmgMult: 1.35,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.15, cooldownSec: 4, action: 'sear', amount: 13, durationMs: 3200 }] } },
  { id: 'earplugs', name: 'Wax Earplugs', emoji: '🎧', elementId: 'sound', priceSparks: 16,
    flavor: 'Half of what hurts is the noise.',
    effect: { damageTakenMult: 0.75,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.18, cooldownSec: 7, action: 'shieldCharge', amount: 1 }] } },
  { id: 'bass-drum', name: 'Bass Drum', emoji: '🥁', elementId: 'sound', priceSparks: 16,
    flavor: 'Worn on the back. Every hit lands on the downbeat.',
    effect: { damageMult: 1.30, speedMult: 0.85,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 6, action: 'burstAoe', amount: 28, radius: 140 }] } },

  // ══ Light ═════════════════════════════════════════════════════════
  { id: 'sunstone', name: 'Sunstone', emoji: '☀️', elementId: 'light', priceSparks: 17,
    flavor: 'Warm all the way through, and it shares.',
    effect: { maxHp: 60, regenPerSecond: 2,
      behaviors: [{ trigger: 'everyNSec', periodSec: 9, action: 'healBurst', amount: 15 }] } },
  { id: 'mirror-shard', name: 'Mirror Shard', emoji: '🪞', elementId: 'light', priceSparks: 16,
    flavor: 'They keep hitting their own reflection.',
    effect: { reflectFraction: 0.35,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'burstAoe', amount: 24, radius: 120 }] } },
  { id: 'flash-lens', name: 'Flash Lens', emoji: '💡', elementId: 'light', priceSparks: 18,
    flavor: 'Everything arrives sooner and lands sharper.',
    effect: { critChance: 0.25, speedMult: 1.25,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 5, action: 'tempHaste', mult: 1.4, durationMs: 1600 }] } },

  // ══ Magnet ════════════════════════════════════════════════════════
  { id: 'lodestone', name: 'Lodestone', emoji: '🧲', elementId: 'magnet', priceSparks: 19,
    flavor: 'They are dragging half their own kit backwards.',
    effect: { enemySpeedMult: 0.70,
      behaviors: [{ trigger: 'everyNSec', periodSec: 10, action: 'slowEnemy', mult: 0.55, durationMs: 2600 }] } },
  { id: 'iron-filings', name: 'Iron Filings', emoji: '⛓️', elementId: 'magnet', priceSparks: 20,
    flavor: 'They ride your strikes in and go in first.',
    effect: { damageMult: 1.35,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 7, action: 'burstAoe', amount: 32, radius: 130 }] } },
  { id: 'polarity-band', name: 'Polarity Band', emoji: '💍', elementId: 'magnet', priceSparks: 19,
    flavor: 'Incoming things would rather be elsewhere.',
    effect: { damageTakenMult: 0.70,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.16, cooldownSec: 6, action: 'slowEnemy', mult: 0.6, durationMs: 2000 }] } },

  // ══ Metal ═════════════════════════════════════════════════════════
  { id: 'steel-plate', name: 'Steel Plate', emoji: '⚙️', elementId: 'metal', priceSparks: 21,
    flavor: 'The honest answer to almost every problem.',
    effect: { shieldHp: 120,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'shieldCharge', amount: 3 }] } },
  { id: 'whetstone', name: 'Whetstone', emoji: '🔪', elementId: 'metal', priceSparks: 20,
    flavor: 'Twenty minutes of patience for one very good second.',
    effect: { critChance: 0.35, critMult: 2.5,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.09, cooldownSec: 6, action: 'tempDamage', mult: 1.22, durationMs: 2400 }] } },
  { id: 'alloy-core', name: 'Alloy Core', emoji: '🔩', elementId: 'metal', priceSparks: 19,
    flavor: 'Heavier than you would like. Sturdier than you deserve.',
    effect: { maxHp: 80, speedMult: 0.90,
      behaviors: [{ trigger: 'onHitTaken', cooldownSec: 8, action: 'shieldCharge', amount: 1 }] } },

  // ══ Plasma ════════════════════════════════════════════════════════
  { id: 'fusion-cell', name: 'Fusion Cell', emoji: '🔮', elementId: 'plasma', priceSparks: 21,
    flavor: 'It is not shielded. That was a design decision.',
    effect: { damageMult: 1.45, damageTakenMult: 1.20,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 8, action: 'burstAoe', amount: 38, radius: 150 }] } },
  { id: 'containment-ring', name: 'Containment Ring', emoji: '💫', elementId: 'plasma', priceSparks: 20,
    flavor: 'Six good failures before the seventh.',
    effect: { shieldCharges: 6,
      behaviors: [{ trigger: 'everyNSec', periodSec: 12, action: 'shieldCharge', amount: 1 }] } },
  { id: 'ion-brace', name: 'Ion Brace', emoji: '🌟', elementId: 'plasma', priceSparks: 22,
    flavor: 'Your hands recharge before you finish the swing.',
    effect: { cooldownMult: 0.65,
      behaviors: [{ trigger: 'onCast', chance: 0.18, action: 'cooldownRefund', amount: 700 }] } },

  // ══ Rubber ════════════════════════════════════════════════════════
  { id: 'bouncy-core', name: 'Bouncy Core', emoji: '🪀', elementId: 'rubber', priceSparks: 20,
    flavor: 'You are extremely difficult to land on.',
    effect: { dodgeChance: 0.30,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.25, cooldownSec: 4, action: 'tempHaste', mult: 1.5, durationMs: 1500 }] } },
  { id: 'elastic-band', name: 'Elastic Band', emoji: '➰', elementId: 'rubber', priceSparks: 21,
    flavor: 'Almost half of it goes straight back where it came from.',
    effect: { reflectFraction: 0.45,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'burstAoe', amount: 26, radius: 125 }] } },
  { id: 'vulcanised-hide', name: 'Vulcanised Hide', emoji: '🦾', elementId: 'rubber', priceSparks: 20,
    flavor: 'Cured over a fire until it stopped caring.',
    effect: { maxHp: 100,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: 60 }] } },

  // ══ Gunpowder ═════════════════════════════════════════════════════
  { id: 'powder-keg', name: 'Powder Keg', emoji: '🧨', elementId: 'gunpowder', priceSparks: 21,
    flavor: 'Carried on the back. Everyone agrees this is a bad idea.',
    effect: { damageMult: 1.50, maxHp: -30,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'burstAoe', amount: 60, radius: 170 }] } },
  { id: 'shot-pouch', name: 'Shot Pouch', emoji: '💥', elementId: 'gunpowder', priceSparks: 20,
    flavor: 'Hand-sorted. The good ones go in first.',
    effect: { critChance: 0.30,
      behaviors: [{ trigger: 'onCast', chance: 0.12, cooldownSec: 4, action: 'burstAoe', amount: 24, radius: 120 }] } },
  { id: 'fuse-cord', name: 'Short Fuse', emoji: '🕯️', elementId: 'gunpowder', priceSparks: 19,
    flavor: 'Cut down to almost nothing. The big one comes fast.',
    effect: { ultimateCooldownMult: 0.60,
      behaviors: [{ trigger: 'onCast', chance: 0.14, action: 'cooldownRefund', amount: 800 }] } },

  // ══ Echo ══════════════════════════════════════════════════════════
  { id: 'sonar-bead', name: 'Sonar Bead', emoji: '🦇', elementId: 'echo', priceSparks: 21,
    flavor: 'You hear the swing before it starts.',
    effect: { dodgeChance: 0.25, speedMult: 1.12,
      behaviors: [{ trigger: 'onHitTaken', cooldownSec: 8, action: 'cooldownRefund', amount: 900 }] } },
  { id: 'resonance-shell', name: 'Resonance Shell', emoji: '🐚', elementId: 'echo', priceSparks: 20,
    flavor: 'Held to the ear, it cancels most of what is coming.',
    effect: { damageTakenMult: 0.70,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.18, cooldownSec: 6, action: 'burstAoe', amount: 24, radius: 135 }] } },
  { id: 'clarion', name: 'Clarion', emoji: '📣', elementId: 'echo', priceSparks: 20,
    flavor: 'Everything you inflict comes back around, twice.',
    effect: { statusDurMult: 1.50, statusDmgMult: 1.30,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.14, cooldownSec: 5, action: 'sear', amount: 16, durationMs: 3600 }] } },

  // ══ Silence ═══════════════════════════════════════════════════════
  { id: 'void-cloak', name: 'Void Cloak', emoji: '🫥', elementId: 'silence', priceSparks: 21,
    flavor: 'For five seconds, the fight cannot find you.',
    effect: { invincibleMs: 5000,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'tempHaste', mult: 1.6, durationMs: 4500 }] } },
  { id: 'muffled-boots', name: 'Muffled Boots', emoji: '👞', elementId: 'silence', priceSparks: 22,
    flavor: 'They keep swinging at where the sound was.',
    effect: { enemyDamageMult: 0.70,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 6, action: 'slowEnemy', mult: 0.55, durationMs: 2200 }] } },
  { id: 'still-heart', name: 'Still Heart', emoji: '🖤', elementId: 'silence', priceSparks: 27,
    flavor: 'It stops when yours does, and then it starts again.',
    effect: { reviveHpFrac: 0.50,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.25, action: 'shieldCharge', amount: 3 }] } },

  // ══ Magic ═════════════════════════════════════════════════════════
  { id: 'mana-tome', name: 'Mana Tome', emoji: '📖', elementId: 'magic', priceSparks: 23,
    flavor: 'The pages turn themselves, slightly ahead of you.',
    effect: { cooldownMult: 0.60,
      behaviors: [{ trigger: 'onCast', chance: 0.2, action: 'cooldownRefund', amount: 750 }] } },
  { id: 'ward-sigil', name: 'Ward Sigil', emoji: '✴️', elementId: 'magic', priceSparks: 23,
    flavor: 'Chalked on the skin. Layered defences, all of them cheating.',
    effect: { shieldCharges: 4, shieldHp: 50,
      behaviors: [{ trigger: 'everyNSec', periodSec: 15, action: 'shieldCharge', amount: 1 }] } },
  { id: 'philosophers-stone', name: "Philosopher's Stone", emoji: '💎', elementId: 'magic', priceSparks: 27,
    flavor: 'It does a little of everything, perfectly, and costs accordingly.',
    effect: { maxHp: 40, regenPerSecond: 4, damageMult: 1.15,
      behaviors: [{ trigger: 'everyNSec', periodSec: 8, action: 'healBurst', amount: 16 }] } },

  // ══ Technology ════════════════════════════════════════════════════
  { id: 'nanite-swarm', name: 'Nanite Swarm', emoji: '🤖', elementId: 'technology', priceSparks: 21,
    flavor: 'They repair you constantly and never ask for a break.',
    effect: { regenPerSecond: 4,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: 40 }] } },
  { id: 'overclock-chip', name: 'Overclock Chip', emoji: '💾', elementId: 'technology', priceSparks: 23,
    flavor: 'Well past the rated clock. The warranty is void anyway.',
    effect: { cooldownMult: 0.65, speedMult: 1.15,
      behaviors: [{ trigger: 'onCast', chance: 0.14, cooldownSec: 4, action: 'tempHaste', mult: 1.35, durationMs: 1800 }] } },
  { id: 'targeting-suite', name: 'Targeting Suite', emoji: '🎯', elementId: 'technology', priceSparks: 22,
    flavor: 'It picks the soft parts for you.',
    effect: { critChance: 0.40,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 7, action: 'tempDamage', mult: 1.25, durationMs: 2600 }] } },

  // ══ Subterfuge (world id `subterfuge`) ═══════════════════════════════
  { id: 'burner-phone', name: 'Burner Phone', emoji: '📱', elementId: 'subterfuge', priceSparks: 25,
    flavor: 'One call, and somebody else takes the hit for you.',
    effect: { reviveHpFrac: 0.40,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'shieldCharge', amount: 2 }] } },
  { id: 'brass-knuckles', name: 'Brass Knuckles', emoji: '🥊', elementId: 'subterfuge', priceSparks: 22,
    flavor: 'No craftsmanship. Enormous results.',
    effect: { damageMult: 1.3,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.15, cooldownSec: 5, action: 'tempDamage', mult: 1.25, durationMs: 2500 }] } },
  { id: 'smoke-bomb', name: 'Smoke Bomb', emoji: '💨', elementId: 'subterfuge', priceSparks: 23,
    flavor: 'The first six seconds happen without you in them.',
    effect: { invincibleMs: 6000,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 7, action: 'slowEnemy', mult: 0.5, durationMs: 2400 }] } },

  // ════════════════════════════════════════════════════════════════════
  // CORRUPT REALM — endgame stock at endgame prices.
  // ════════════════════════════════════════════════════════════════════

  // ══ Ruin ══════════════════════════════════════════════════════════
  { id: 'keystone', name: 'Salvaged Keystone', emoji: '🚧', elementId: 'ruin', priceSparks: 30,
    flavor: 'The one stone the collapse could not argue with.',
    effect: { maxHp: 120,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: 70 }] } },
  { id: 'wrecking-fist', name: 'Wrecking Fist', emoji: '🔨', elementId: 'ruin', priceSparks: 34,
    flavor: 'Condemns whatever it touches. You are the paperwork.',
    effect: { damageMult: 1.35, critMult: 2.2,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 4, action: 'burstAoe', amount: 25, radius: 130 }] } },
  { id: 'rubble-mantle', name: 'Rubble Mantle', emoji: '🗿', elementId: 'ruin', priceSparks: 32,
    flavor: 'Wear the ruin. It has already survived worse than this fight.',
    effect: { damageTakenMult: 0.65, speedMult: 0.92,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.18, cooldownSec: 6, action: 'burstAoe', amount: 30, radius: 145 }] } },

  // ══ Death ═════════════════════════════════════════════════════════
  { id: 'second-bell', name: 'The Second Bell', emoji: '🔔', elementId: 'death', priceSparks: 40,
    flavor: 'It rings once for free. For you, it rings twice.',
    effect: { reviveHpFrac: 0.60,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'burstAoe', amount: 55, radius: 180 }] } },
  { id: 'obol', name: 'Ferryman’s Obol', emoji: '💰', elementId: 'death', priceSparks: 32,
    flavor: 'Held under the tongue. The toll is prepaid; the crossing keeps waiting.',
    effect: { shieldCharges: 3, lifestealFrac: 0.08,
      behaviors: [{ trigger: 'everyNSec', periodSec: 10, action: 'shieldCharge', amount: 1 }] } },
  { id: 'pallbearer-gloves', name: 'Pallbearer Gloves', emoji: '🧤', elementId: 'death', priceSparks: 34,
    flavor: 'Steady hands. They have carried heavier things than a fight.',
    effect: { damageMult: 1.25, statusDurMult: 1.5,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 5, action: 'sear', amount: 18, durationMs: 4000 }] } },

  // ══ Illusion ══════════════════════════════════════════════════════
  { id: 'false-face', name: 'False Face', emoji: '🎭', elementId: 'illusion', priceSparks: 34,
    flavor: 'A third of everything aimed at you was aimed at someone who is not there.',
    effect: { dodgeChance: 0.28,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.3, cooldownSec: 5, action: 'tempHaste', mult: 1.5, durationMs: 1500 }] } },
  { id: 'stage-mirror', name: 'Stage Mirror', emoji: '🔮', elementId: 'illusion', priceSparks: 33,
    flavor: 'Whatever they perform at you, half the show is returned.',
    effect: { reflectFraction: 0.50,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'burstAoe', amount: 30, radius: 140 }] } },
  { id: 'prop-dagger', name: 'Prop Dagger', emoji: '🗡️', elementId: 'illusion', priceSparks: 32,
    flavor: 'A fake blade that cuts real things is just a blade with better marketing.',
    effect: { critChance: 0.35, critMult: 2.4,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 7, action: 'tempDamage', mult: 1.25, durationMs: 2600 }] } },

  // ══ Conquest ══════════════════════════════════════════════════════
  { id: 'war-banner', name: 'War Banner', emoji: '🚩', elementId: 'conquest', priceSparks: 34,
    flavor: 'Planted at match start. Everything past it is yours by decree.',
    effect: { damageMult: 1.25, speedMult: 1.1,
      behaviors: [{ trigger: 'everyNSec', periodSec: 12, action: 'tempDamage', mult: 1.3, durationMs: 4000 }] } },
  { id: 'siege-rations', name: 'Siege Rations', emoji: '🥫', elementId: 'conquest', priceSparks: 31,
    flavor: 'Designed for a ten-year encirclement. One fight is nothing.',
    effect: { maxHp: 90, regenPerSecond: 4,
      behaviors: [{ trigger: 'everyNSec', periodSec: 8, action: 'healBurst', amount: 18 }] } },
  { id: 'tribute-chest', name: 'Tribute Chest', emoji: '📦', elementId: 'conquest', priceSparks: 33,
    flavor: 'The enemy pays into it every time they fail to kill you.',
    effect: { damageTakenMult: 0.75, enemyDamageMult: 0.85,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.16, cooldownSec: 6, action: 'shieldCharge', amount: 1 }] } },

  // ══ Gluttony ══════════════════════════════════════════════════════
  { id: 'endless-plate', name: 'The Endless Plate', emoji: '🍽️', elementId: 'gluttony', priceSparks: 35,
    flavor: 'Every wound you deal is, in some culinary sense, a meal.',
    effect: { lifestealFrac: 0.18,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 6, action: 'healBurst', amount: 12 }] } },
  { id: 'chefs-crown', name: 'Chef’s Crown', emoji: '👨‍🍳', elementId: 'gluttony', priceSparks: 32,
    flavor: 'Authority in the kitchen is authority everywhere.',
    effect: { maxHp: 70, damageMult: 1.2,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 5, action: 'healBurst', amount: 16 }] } },
  { id: 'grease-armor', name: 'Grease Armour', emoji: '🍮', elementId: 'gluttony', priceSparks: 31,
    flavor: 'Disgusting. Slippery. Extremely difficult to hold onto.',
    effect: { dodgeChance: 0.2, speedMult: 1.18,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.25, cooldownSec: 4, action: 'tempHaste', mult: 1.45, durationMs: 1700 }] } },

  // ══ Cloth ════════════════════════════════════════════════════════
  { id: 'scarf-weave', name: 'Second Scarf', emoji: '🧣', elementId: 'cloth', priceSparks: 36,
    flavor: 'Wound over the first one. Twice as much of you to catch, twice as much to cut through.',
    effect: { maxHp: 110,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'shieldCharge', amount: 3 }] } },
  { id: 'thimble-plate', name: 'Thimble Plate', emoji: '🪡', elementId: 'cloth', priceSparks: 34,
    flavor: 'Brass, dented all over, and it has stopped a great deal more than needles.',
    effect: { shieldHp: 130,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.5, durationMs: 2400 }] } },
  { id: 'needle-tin', name: 'Tin Of Needles', emoji: '📌', elementId: 'cloth', priceSparks: 33,
    flavor: 'Kept loose on purpose. Anything that reaches in for you finds all of them at once.',
    effect: { enemySpeedMult: 0.78,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.18, cooldownSec: 3, action: 'slowEnemy', mult: 0.55, durationMs: 2000 }] } },

  // ══ Bind ══════════════════════════════════════════════════════════
  { id: 'oath-shackle', name: 'Oath Shackle', emoji: '⛓️', elementId: 'bind', priceSparks: 35,
    flavor: 'Locked to your own wrist. You keep every promise now, including "win".',
    effect: { damageMult: 1.25, damageTakenMult: 0.88,
      behaviors: [{ trigger: 'onCast', chance: 0.15, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 2000 }] } },
  { id: 'anchor-chain', name: 'Anchor Chain', emoji: '⚓', elementId: 'bind', priceSparks: 32,
    flavor: 'The enemy drags it everywhere they go. They just cannot see it.',
    effect: { enemySpeedMult: 0.8, enemyDamageMult: 0.9,
      behaviors: [{ trigger: 'everyNSec', periodSec: 10, action: 'slowEnemy', mult: 0.5, durationMs: 2800 }] } },
  { id: 'warding-links', name: 'Warding Links', emoji: '🔗', elementId: 'bind', priceSparks: 33,
    flavor: 'Seven links, seven refusals.',
    effect: { shieldCharges: 7,
      behaviors: [{ trigger: 'everyNSec', periodSec: 11, action: 'shieldCharge', amount: 1 }] } },

  // ══ Paper ═════════════════════════════════════════════════════════
  { id: 'errata-slip', name: 'Errata Slip', emoji: '📝', elementId: 'paper', priceSparks: 34,
    flavor: 'A correction, filed in advance, to the paragraph where you die.',
    effect: { reviveHpFrac: 0.45,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.1, cooldownSec: 8, action: 'cooldownRefund', amount: 1200 }] } },
  { id: 'paper-armor', name: 'Folded Armour', emoji: '📄', elementId: 'paper', priceSparks: 30,
    flavor: 'A thousand folds. Each one is a small, stubborn no.',
    effect: { shieldHp: 90, dodgeChance: 0.12,
      behaviors: [{ trigger: 'onHitTaken', cooldownSec: 8, action: 'shieldCharge', amount: 1 }] } },
  { id: 'red-ink', name: 'Red Ink', emoji: '🖋️', elementId: 'paper', priceSparks: 33,
    flavor: 'Everything you write on them takes longer to fade.',
    effect: { statusDurMult: 1.8, statusDmgMult: 1.4,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.15, cooldownSec: 4, action: 'sear', amount: 20, durationMs: 4200 }] } },

  // ══ Chalk ═════════════════════════════════════════════════════════
  { id: 'gym-chalk', name: 'Gym Chalk', emoji: '🖍️', elementId: 'chalk', priceSparks: 31,
    flavor: 'A better grip on everything, including the fight.',
    effect: { critChance: 0.28, damageMult: 1.18,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.09, cooldownSec: 6, action: 'tempDamage', mult: 1.22, durationMs: 2500 }] } },
  { id: 'outline', name: 'Your Own Outline', emoji: '⬜', elementId: 'chalk', priceSparks: 34,
    flavor: 'Drawn around where you were standing. Attacks keep hitting the drawing.',
    effect: { dodgeChance: 0.25,
      behaviors: [{ trigger: 'onHitTaken', cooldownSec: 10, action: 'tempHaste', mult: 1.6, durationMs: 1200 }] } },
  { id: 'dust-cloud', name: 'Dust Cloud', emoji: '🌫️', elementId: 'chalk', priceSparks: 30,
    flavor: 'Clap twice. The room forgets its own geometry.',
    effect: { enemyDamageMult: 0.8,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.22, cooldownSec: 5, action: 'slowEnemy', mult: 0.55, durationMs: 2200 }] } },

  // ══ Psychic ═══════════════════════════════════════════════════════
  { id: 'third-eye-drops', name: 'Third Eye Drops', emoji: '👁️', elementId: 'psychic', priceSparks: 35,
    flavor: 'You see the swing while it is still a thought.',
    effect: { dodgeChance: 0.24, cooldownMult: 0.85,
      behaviors: [{ trigger: 'onCast', chance: 0.2, cooldownSec: 4, action: 'cooldownRefund', amount: 700 }] } },
  { id: 'migraine-band', name: 'Migraine Band', emoji: '🤕', elementId: 'psychic', priceSparks: 32,
    flavor: 'Your headache, worn outward. Now it is everyone’s problem.',
    effect: { reflectFraction: 0.4, damageTakenMult: 0.9,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'burstAoe', amount: 28, radius: 150 }] } },
  { id: 'lucid-charm', name: 'Lucid Charm', emoji: '🔮', elementId: 'psychic', priceSparks: 33,
    flavor: 'Perfect clarity. The big one arrives whenever you want it.',
    effect: { ultimateCooldownMult: 0.5,
      behaviors: [{ trigger: 'onCast', chance: 0.15, action: 'cooldownRefund', amount: 850 }] } },

  // ══ Passion ═══════════════════════════════════════════════════════
  { id: 'burning-heart', name: 'Burning Heart', emoji: '💖', elementId: 'passion', priceSparks: 34,
    flavor: 'It hurts. It also refuses, categorically, to stop.',
    effect: { damageMult: 1.35, selfDamagePerSec: 2,
      behaviors: [{ trigger: 'onHitTaken', cooldownSec: 3, action: 'sear', amount: 8, durationMs: 2000 }] } },
  { id: 'love-letter', name: 'Unsent Letter', emoji: '💌', elementId: 'passion', priceSparks: 33,
    flavor: 'Kept over the heart. It has stopped one ending already.',
    effect: { reviveHpFrac: 0.5,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'tempDamage', mult: 1.35, durationMs: 5000 }] } },
  { id: 'rose-thorns', name: 'Rose Thorns', emoji: '🌹', elementId: 'passion', priceSparks: 31,
    flavor: 'Hold me and find out.',
    effect: { reflectFraction: 0.45,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.22, cooldownSec: 4, action: 'sear', amount: 14, durationMs: 3200 }] } },

  // ══ Sand ══════════════════════════════════════════════════════════
  { id: 'powder-horn', name: 'Powder Horn', emoji: '🦬', elementId: 'dune', priceSparks: 36,
    flavor: 'A full charge every time. It does not ask what the barrel can take.',
    effect: { damageMult: 1.6, maxHp: -60,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 6, action: 'burstAoe', amount: 30, radius: 140 }] } },
  { id: 'mirage-glass', name: 'Mirage Glass', emoji: '🔍', elementId: 'dune', priceSparks: 33,
    flavor: 'It shows the enemy exactly what they are doing to you. Precisely half of it.',
    effect: { reflectFraction: 0.5,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'burstAoe', amount: 32, radius: 145 }] } },
  { id: 'cut-sandstone', name: 'Cut Sandstone', emoji: '🧱', elementId: 'dune', priceSparks: 32,
    flavor: 'Dressed and stacked until falling over became someone else’s job.',
    effect: { shieldHp: 100, shieldCharges: 2,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'shieldCharge', amount: 3 }] } },

  // ══ Fortune ═══════════════════════════════════════════════════════
  { id: 'weighted-die', name: 'Weighted Die', emoji: '🎲', elementId: 'fortune', priceSparks: 35,
    flavor: 'It always comes up you.',
    effect: { critChance: 0.35, critMult: 2.2,
      behaviors: [{ trigger: 'everyNSec', periodSec: 9, chance: 0.5, action: 'tempDamage', mult: 1.5, durationMs: 2000 }] } },
  { id: 'golden-parachute', name: 'Golden Parachute', emoji: '☂️', elementId: 'fortune', priceSparks: 38,
    flavor: 'The one contract that pays out on the way down.',
    effect: { reviveHpFrac: 0.55,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: 55 }] } },
  { id: 'insurance-policy', name: 'Insurance Policy', emoji: '📜', elementId: 'fortune', priceSparks: 32,
    flavor: 'Comprehensive coverage. The premiums are somebody else’s HP.',
    effect: { damageTakenMult: 0.7,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 7, action: 'healBurst', amount: 14 }] } },

  // ══ Magma ═════════════════════════════════════════════════════════
  { id: 'core-sample', name: 'Core Sample', emoji: '🌋', elementId: 'magma', priceSparks: 34,
    flavor: 'A piece of the planet’s temper, still holding a grudge.',
    effect: { damageMult: 1.25, statusDmgMult: 1.4,
      behaviors: [{ trigger: 'onHitDealt', chance: 0.15, cooldownSec: 5, action: 'sear', amount: 18, durationMs: 3000 }] } },
  { id: 'obsidian-skin', name: 'Obsidian Skin', emoji: '🖤', elementId: 'magma', priceSparks: 33,
    flavor: 'Cooled fury. Harder than anything that stayed calm.',
    effect: { damageTakenMult: 0.72, speedMult: 0.95,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.16, cooldownSec: 6, action: 'sear', amount: 16, durationMs: 3000 }] } },
  { id: 'vent-heart', name: 'Vent Heart', emoji: '♨️', elementId: 'magma', priceSparks: 32,
    flavor: 'Pressure in, power out. Do not ask where the gauge went.',
    effect: { cooldownMult: 0.7, maxHp: 40,
      behaviors: [{ trigger: 'onCast', chance: 0.16, action: 'cooldownRefund', amount: 700 }] } },

  // ══ Radiation ═════════════════════════════════════════════════════
  { id: 'lead-vest', name: 'Lead Vest', emoji: '🎽', elementId: 'radiation', priceSparks: 33,
    flavor: 'Heavy, ugly, and the only reason you still have a future.',
    effect: { damageTakenMult: 0.68, speedMult: 0.9,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.16, cooldownSec: 7, action: 'shieldCharge', amount: 1 }] } },
  { id: 'isotope-core', name: 'Isotope Core', emoji: '☢️', elementId: 'radiation', priceSparks: 36,
    flavor: 'It gives constantly. That is the entire problem with it.',
    effect: { damageMult: 1.3, selfDamagePerSec: 2,
      behaviors: [{ trigger: 'everyNSec', periodSec: 6, action: 'burstAoe', amount: 14, radius: 110 }] } },
  { id: 'iodine-tabs', name: 'Iodine Tablets', emoji: '💊', elementId: 'radiation', priceSparks: 31,
    flavor: 'Chased with water. The half-life becomes a whole one.',
    effect: { regenPerSecond: 6, maxHp: 30,
      behaviors: [{ trigger: 'everyNSec', periodSec: 7, action: 'healBurst', amount: 14 }] } },

  // ══ Depths ════════════════════════════════════════════════════════
  { id: 'lure-light', name: 'Lure Light', emoji: '🏮', elementId: 'depths', priceSparks: 34,
    flavor: 'They come to you. That was always the trap.',
    effect: { enemySpeedMult: 0.9, damageMult: 1.2,
      behaviors: [{ trigger: 'everyNSec', periodSec: 10, action: 'slowEnemy', mult: 0.65, durationMs: 2000 }] } },
  { id: 'pressure-hull', name: 'Pressure Hull', emoji: '👓', elementId: 'depths', priceSparks: 35,
    flavor: 'Rated for the trench. A fight is barely weather.',
    effect: { maxHp: 110, damageTakenMult: 0.85,
      behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: 65 }] } },
  { id: 'black-water', name: 'Black Water', emoji: '🌊', elementId: 'depths', priceSparks: 32,
    flavor: 'Bottled where light gives up. Drink before the bell.',
    effect: { invincibleMs: 6000, regenPerSecond: 3,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.18, cooldownSec: 6, action: 'slowEnemy', mult: 0.5, durationMs: 2600 }] } },

  // ══ Slime (world id `gum`) ════════════════════════════════════════
  { id: 'ooze-core', name: 'Ooze Core', emoji: '🤢', elementId: 'gum', priceSparks: 33,
    flavor: 'You are now, structurally speaking, mostly forgiveness.',
    effect: { maxHp: 80, regenPerSecond: 5,
      behaviors: [{ trigger: 'everyNSec', periodSec: 8, action: 'healBurst', amount: 20 }] } },
  { id: 'sticky-strand', name: 'Sticky Strand', emoji: '🕸️', elementId: 'gum', priceSparks: 32,
    flavor: 'Everything that touches you leaves slower and angrier.',
    effect: { enemySpeedMult: 0.85,
      behaviors: [{ trigger: 'onHitTaken', cooldownSec: 4, action: 'slowEnemy', mult: 0.6, durationMs: 2000 }] } },
  { id: 'gel-membrane', name: 'Gel Membrane', emoji: '💦', elementId: 'gum', priceSparks: 34,
    flavor: 'Hits arrive, reconsider, and leave much smaller.',
    effect: { damageTakenMult: 0.7, dodgeChance: 0.1,
      behaviors: [{ trigger: 'onHitTaken', chance: 0.22, cooldownSec: 5, action: 'slowEnemy', mult: 0.55, durationMs: 2300 }] } },
];

export function getItemsForElement(elementId: string): ItemDef[] {
  return ITEMS.filter((i) => i.elementId === elementId);
}

export function getItem(id: string): ItemDef | undefined {
  return ITEMS.find((i) => i.id === id);
}

/** Per-match consumed set — cleared at ArenaScene.create() after buffs are applied. */
export const consumedItemIds = new Set<string>();

export function clearConsumedItems(): void {
  consumedItemIds.clear();
}
