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

  return out;
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
    effect: { maxHp: 20 } },
  { id: 'hot-sauce', name: 'Hot Sauce', emoji: '🌶️', elementId: 'fire', priceSparks: 6,
    flavor: 'Nobody asked how fast it makes you. They asked why you were crying.',
    effect: { speedMult: 1.5, selfDamagePerSec: 1 } },
  { id: 'ember-charm', name: 'Ember Charm', emoji: '🔥', elementId: 'fire', priceSparks: 7,
    flavor: 'A coal that never went out, wrapped in wire and worn close.',
    effect: { damageMult: 1.15 } },

  // ══ Water ═════════════════════════════════════════════════════════
  { id: 'bubble', name: 'Bubble', emoji: '🫧', elementId: 'water', priceSparks: 5,
    flavor: 'Impossibly stubborn for something made of nothing.',
    effect: { shieldCharges: 3 } },
  { id: 'canteen', name: 'Deep Canteen', emoji: '🧴', elementId: 'water', priceSparks: 7,
    flavor: 'Never empties. Nobody has asked where the water comes from.',
    effect: { regenPerSecond: 2 } },
  { id: 'riptide-boots', name: 'Riptide Boots', emoji: '🥾', elementId: 'water', priceSparks: 9,
    flavor: 'The current decides where you go. Usually somewhere useful.',
    effect: { speedMult: 1.12, dodgeChance: 0.10 } },

  // ══ Life ══════════════════════════════════════════════════════════
  { id: 'seedling', name: 'Stubborn Seedling', emoji: '🌱', elementId: 'life', priceSparks: 7,
    flavor: 'It grew through a paving slab. It can grow through this.',
    effect: { maxHp: 30 } },
  { id: 'honeycomb', name: 'Honeycomb', emoji: '🍯', elementId: 'life', priceSparks: 10,
    flavor: 'Everything a hive knows about turning violence into food.',
    effect: { lifestealFrac: 0.08 } },
  { id: 'thornmail', name: 'Thornmail', emoji: '🌵', elementId: 'life', priceSparks: 9,
    flavor: 'Woven, not forged. It grows back overnight.',
    effect: { reflectFraction: 0.20 } },

  // ══ Air ═══════════════════════════════════════════════════════════
  { id: 'stormfeather', name: 'Stormfeather', emoji: '🪶', elementId: 'air', priceSparks: 7,
    flavor: 'Pulled from something that never landed.',
    effect: { speedMult: 1.18 } },
  { id: 'updraft-vial', name: 'Updraft Vial', emoji: '🌪️', elementId: 'air', priceSparks: 8,
    flavor: 'Uncork it and the ground stops being so insistent.',
    effect: { dodgeChance: 0.15 } },
  { id: 'windchime', name: 'Windchime', emoji: '🎐', elementId: 'air', priceSparks: 10,
    flavor: 'It rings a half-second before anything happens.',
    effect: { cooldownMult: 0.85 } },

  // ══ Earth ═════════════════════════════════════════════════════════
  { id: 'granite-slab', name: 'Granite Slab', emoji: '🪨', elementId: 'earth', priceSparks: 7,
    flavor: 'Strapped to the chest. Deeply unfashionable. Extremely effective.',
    effect: { shieldHp: 40 } },
  { id: 'iron-boots', name: 'Iron Boots', emoji: '👢', elementId: 'earth', priceSparks: 9,
    flavor: 'Nothing moves you. You do not move much either.',
    effect: { damageTakenMult: 0.80, speedMult: 0.90 } },
  { id: 'geode-shard', name: 'Geode Shard', emoji: '💠', elementId: 'earth', priceSparks: 10,
    flavor: 'Cracked open at the vein. Still warm.',
    effect: { maxHp: 25, damageMult: 1.10 } },

  // ══ Oil ═══════════════════════════════════════════════════════════
  { id: 'grease-can', name: 'Grease Can', emoji: '🛢️', elementId: 'oil', priceSparks: 12,
    flavor: 'Every moving part you own, complaining less.',
    effect: { cooldownMult: 0.80 } },
  { id: 'slick-soles', name: 'Slick Soles', emoji: '👟', elementId: 'oil', priceSparks: 10,
    flavor: 'Stopping is now a skill issue.',
    effect: { speedMult: 1.25 } },
  { id: 'crude-flask', name: 'Crude Flask', emoji: '⚗️', elementId: 'oil', priceSparks: 11,
    flavor: 'Thrown at the feet. Nobody sprints through that.',
    effect: { enemySpeedMult: 0.85 } },

  // ══ Ice ═══════════════════════════════════════════════════════════
  { id: 'frost-ration', name: 'Frost Ration', emoji: '🍧', elementId: 'ice', priceSparks: 11,
    flavor: 'Preserved perfectly. For rather longer than anyone intended.',
    effect: { maxHp: 50 } },
  { id: 'glacier-plate', name: 'Glacier Plate', emoji: '🧊', elementId: 'ice', priceSparks: 13,
    flavor: 'A thousand winters, compressed into one very cold sheet.',
    effect: { shieldHp: 60 } },
  { id: 'chill-draught', name: 'Chill Draught', emoji: '🥶', elementId: 'ice', priceSparks: 12,
    flavor: 'Cold hands do not swing well.',
    effect: { enemyDamageMult: 0.85 } },

  // ══ Growth ════════════════════════════════════════════════════════
  { id: 'spore-packet', name: 'Spore Packet', emoji: '🍄', elementId: 'growth', priceSparks: 11,
    flavor: 'Do not open indoors. Do not open outdoors either.',
    effect: { regenPerSecond: 3 } },
  { id: 'petri-dish', name: 'Petri Dish', emoji: '🧫', elementId: 'growth', priceSparks: 14,
    flavor: 'Something in here has been eating and it has opinions.',
    effect: { lifestealFrac: 0.12 } },
  { id: 'mutagen', name: 'Mutagen', emoji: '🧬', elementId: 'growth', priceSparks: 12,
    flavor: 'Rewrites you slightly. The new draft hits harder and lives less.',
    effect: { damageMult: 1.20, maxHp: -15 } },

  // ══ Crystal ═══════════════════════════════════════════════════════
  { id: 'prism-lens', name: 'Prism Lens', emoji: '🔍', elementId: 'crystal', priceSparks: 13,
    flavor: 'Shows you exactly where the flaw is. Everything has one.',
    effect: { critChance: 0.20 } },
  { id: 'quartz-ward', name: 'Quartz Ward', emoji: '💎', elementId: 'crystal', priceSparks: 13,
    flavor: 'Four facets. Each one shatters instead of you.',
    effect: { shieldCharges: 4 } },
  { id: 'resonant-core', name: 'Resonant Core', emoji: '🔮', elementId: 'crystal', priceSparks: 14,
    flavor: 'Whatever you inflict, it keeps ringing.',
    effect: { statusDurMult: 1.30, statusDmgMult: 1.20 } },

  // ══ Hunt ══════════════════════════════════════════════════════════
  { id: 'bone-whistle', name: 'Bone Whistle', emoji: '🦴', elementId: 'hunt', priceSparks: 14,
    flavor: 'One note. Everything soft nearby stops moving.',
    effect: { critChance: 0.25, critMult: 2.5 } },
  { id: 'tracker-pelt', name: "Tracker's Pelt", emoji: '🐾', elementId: 'hunt', priceSparks: 13,
    flavor: 'Taken off something that was very good at not being caught.',
    effect: { speedMult: 1.15, dodgeChance: 0.12 } },
  { id: 'raw-steak', name: 'Raw Steak', emoji: '🥩', elementId: 'hunt', priceSparks: 15,
    flavor: 'Eaten mid-fight. Manners are for after.',
    effect: { lifestealFrac: 0.15 } },

  // ══ Soul ══════════════════════════════════════════════════════════
  { id: 'spirit-lantern', name: 'Spirit Lantern', emoji: '🏮', elementId: 'soul', priceSparks: 19,
    flavor: 'It holds one of your endings in reserve, and gives it back once.',
    effect: { reviveHpFrac: 0.35 } },
  { id: 'grave-dust', name: 'Grave Dust', emoji: '⚱️', elementId: 'soul', priceSparks: 13,
    flavor: 'Thrown in the eyes. Everything after that lands softer.',
    effect: { enemyDamageMult: 0.80 } },
  { id: 'ectoplasm', name: 'Ectoplasm', emoji: '👻', elementId: 'soul', priceSparks: 12,
    flavor: 'Slightly less present than you were this morning.',
    effect: { dodgeChance: 0.18 } },

  // ══ Shadow ════════════════════════════════════════════════════════
  { id: 'black-veil', name: 'Black Veil', emoji: '🕶️', elementId: 'shadow', priceSparks: 13,
    flavor: 'The opening exchange happens to somebody else.',
    effect: { invincibleMs: 3000 } },
  { id: 'night-oil', name: 'Night Oil', emoji: '🫙', elementId: 'shadow', priceSparks: 13,
    flavor: 'Rubbed into the knuckles. It works. It is not free.',
    effect: { damageMult: 1.25, damageTakenMult: 1.15 } },
  { id: 'hollow-charm', name: 'Hollow Charm', emoji: '🕳️', elementId: 'shadow', priceSparks: 14,
    flavor: 'Hung where they can see it. Their legs get heavy.',
    effect: { enemySpeedMult: 0.80 } },

  // ══ Creation ══════════════════════════════════════════════════════
  { id: 'toolbelt', name: 'Toolbelt', emoji: '🧰', elementId: 'creation', priceSparks: 15,
    flavor: 'Everything within reach, and reaching takes no time at all.',
    effect: { cooldownMult: 0.75 } },
  { id: 'blueprint', name: 'Master Blueprint', emoji: '📐', elementId: 'creation', priceSparks: 14,
    flavor: 'The big one, drawn out in advance. It comes around sooner.',
    effect: { ultimateCooldownMult: 0.65 } },
  { id: 'brass-plating', name: 'Brass Plating', emoji: '🛡️', elementId: 'creation', priceSparks: 15,
    flavor: 'Riveted on in the field. Ugly. Load-bearing.',
    effect: { shieldHp: 80 } },

  // ══ Gravity ═══════════════════════════════════════════════════════
  { id: 'lead-weight', name: 'Lead Weight', emoji: '🏋️', elementId: 'gravity', priceSparks: 15,
    flavor: 'Not for you. For them.',
    effect: { enemySpeedMult: 0.75 } },
  { id: 'singularity-marble', name: 'Singularity Marble', emoji: '⚫', elementId: 'gravity', priceSparks: 16,
    flavor: 'Weighs as much as a hill. Fits in a pocket. Do not drop it.',
    effect: { damageMult: 1.30 } },
  { id: 'null-field', name: 'Null Field', emoji: '🌌', elementId: 'gravity', priceSparks: 15,
    flavor: 'Incoming things arrive tired.',
    effect: { damageTakenMult: 0.75 } },

  // ══ Time (world id `sand`) ════════════════════════════════════════
  { id: 'hourglass', name: 'Pocket Hourglass', emoji: '⏳', elementId: 'sand', priceSparks: 16,
    flavor: 'Turn it over and the waiting is already done.',
    effect: { cooldownMult: 0.70 } },
  { id: 'stopwatch', name: 'Stopwatch', emoji: '⏱️', elementId: 'sand', priceSparks: 14,
    flavor: 'Four seconds of the fight simply do not happen to you.',
    effect: { invincibleMs: 4000 } },
  { id: 'time-sand', name: 'Hourglass Sand', emoji: '🏜️', elementId: 'sand', priceSparks: 14,
    flavor: 'Poured into a wound, it runs backwards.',
    effect: { maxHp: 40, regenPerSecond: 2 } },

  // ══ Electricity ═══════════════════════════════════════════════════
  { id: 'capacitor', name: 'Capacitor', emoji: '🔋', elementId: 'electricity', priceSparks: 15,
    flavor: 'Holds a grudge, then discharges it all at once.',
    effect: { damageMult: 1.25 } },
  { id: 'copper-coil', name: 'Copper Coil', emoji: '🧵', elementId: 'electricity', priceSparks: 14,
    flavor: 'Wound tight. Everything cycles faster near it.',
    effect: { cooldownMult: 0.80 } },
  { id: 'surge-guard', name: 'Surge Guard', emoji: '⚡', elementId: 'electricity', priceSparks: 16,
    flavor: 'Trips five times before it gives up on you.',
    effect: { shieldCharges: 5 } },

  // ══ Acid (world id `slime`) ═══════════════════════════════════════
  { id: 'acid-vial', name: 'Acid Vial', emoji: '🧪', elementId: 'slime', priceSparks: 17,
    flavor: 'Thrown before the bell. They start the fight already leaking.',
    effect: { enemyMaxHpMult: 0.85 } },
  { id: 'caustic-coat', name: 'Caustic Coat', emoji: '🥼', elementId: 'slime', priceSparks: 15,
    flavor: 'Hitting you is a mistake with consequences.',
    effect: { reflectFraction: 0.30 } },
  { id: 'ooze-flask', name: 'Ooze Flask', emoji: '🟢', elementId: 'slime', priceSparks: 15,
    flavor: 'Whatever you put on them, it clings.',
    effect: { statusDurMult: 1.40 } },

  // ══ Fate ══════════════════════════════════════════════════════════
  { id: 'lucky-coin', name: 'Lucky Coin', emoji: '🪙', elementId: 'fate', priceSparks: 17,
    flavor: 'It has two faces and both of them are yours.',
    effect: { critChance: 0.30 } },
  { id: 'loaded-die', name: 'Loaded Die', emoji: '🎲', elementId: 'fate', priceSparks: 16,
    flavor: 'It lands on "not today" more often than it should.',
    effect: { dodgeChance: 0.20 } },
  { id: 'wild-card', name: 'Wild Card', emoji: '🃏', elementId: 'fate', priceSparks: 17,
    flavor: 'Fast and mean and thin. Play it early.',
    effect: { damageMult: 1.20, speedMult: 1.20, maxHp: -20 } },

  // ══ Sound ═════════════════════════════════════════════════════════
  { id: 'tuning-fork', name: 'Tuning Fork', emoji: '🎵', elementId: 'sound', priceSparks: 15,
    flavor: 'Struck once against the enemy. They keep humming.',
    effect: { statusDmgMult: 1.35 } },
  { id: 'earplugs', name: 'Wax Earplugs', emoji: '🎧', elementId: 'sound', priceSparks: 16,
    flavor: 'Half of what hurts is the noise.',
    effect: { damageTakenMult: 0.75 } },
  { id: 'bass-drum', name: 'Bass Drum', emoji: '🥁', elementId: 'sound', priceSparks: 16,
    flavor: 'Worn on the back. Every hit lands on the downbeat.',
    effect: { damageMult: 1.30, speedMult: 0.85 } },

  // ══ Light ═════════════════════════════════════════════════════════
  { id: 'sunstone', name: 'Sunstone', emoji: '☀️', elementId: 'light', priceSparks: 17,
    flavor: 'Warm all the way through, and it shares.',
    effect: { maxHp: 60, regenPerSecond: 2 } },
  { id: 'mirror-shard', name: 'Mirror Shard', emoji: '🪞', elementId: 'light', priceSparks: 16,
    flavor: 'They keep hitting their own reflection.',
    effect: { reflectFraction: 0.35 } },
  { id: 'flash-lens', name: 'Flash Lens', emoji: '💡', elementId: 'light', priceSparks: 18,
    flavor: 'Everything arrives sooner and lands sharper.',
    effect: { critChance: 0.25, speedMult: 1.25 } },

  // ══ Magnet ════════════════════════════════════════════════════════
  { id: 'lodestone', name: 'Lodestone', emoji: '🧲', elementId: 'magnet', priceSparks: 19,
    flavor: 'They are dragging half their own kit backwards.',
    effect: { enemySpeedMult: 0.70 } },
  { id: 'iron-filings', name: 'Iron Filings', emoji: '⛓️', elementId: 'magnet', priceSparks: 20,
    flavor: 'They ride your strikes in and go in first.',
    effect: { damageMult: 1.35 } },
  { id: 'polarity-band', name: 'Polarity Band', emoji: '💍', elementId: 'magnet', priceSparks: 19,
    flavor: 'Incoming things would rather be elsewhere.',
    effect: { damageTakenMult: 0.70 } },

  // ══ Metal ═════════════════════════════════════════════════════════
  { id: 'steel-plate', name: 'Steel Plate', emoji: '⚙️', elementId: 'metal', priceSparks: 21,
    flavor: 'The honest answer to almost every problem.',
    effect: { shieldHp: 120 } },
  { id: 'whetstone', name: 'Whetstone', emoji: '🔪', elementId: 'metal', priceSparks: 20,
    flavor: 'Twenty minutes of patience for one very good second.',
    effect: { critChance: 0.35, critMult: 2.5 } },
  { id: 'alloy-core', name: 'Alloy Core', emoji: '🔩', elementId: 'metal', priceSparks: 19,
    flavor: 'Heavier than you would like. Sturdier than you deserve.',
    effect: { maxHp: 80, speedMult: 0.90 } },

  // ══ Plasma ════════════════════════════════════════════════════════
  { id: 'fusion-cell', name: 'Fusion Cell', emoji: '🔮', elementId: 'plasma', priceSparks: 21,
    flavor: 'It is not shielded. That was a design decision.',
    effect: { damageMult: 1.45, damageTakenMult: 1.20 } },
  { id: 'containment-ring', name: 'Containment Ring', emoji: '💫', elementId: 'plasma', priceSparks: 20,
    flavor: 'Six good failures before the seventh.',
    effect: { shieldCharges: 6 } },
  { id: 'ion-brace', name: 'Ion Brace', emoji: '🌟', elementId: 'plasma', priceSparks: 22,
    flavor: 'Your hands recharge before you finish the swing.',
    effect: { cooldownMult: 0.65 } },

  // ══ Rubber ════════════════════════════════════════════════════════
  { id: 'bouncy-core', name: 'Bouncy Core', emoji: '🪀', elementId: 'rubber', priceSparks: 20,
    flavor: 'You are extremely difficult to land on.',
    effect: { dodgeChance: 0.30 } },
  { id: 'elastic-band', name: 'Elastic Band', emoji: '➰', elementId: 'rubber', priceSparks: 21,
    flavor: 'Almost half of it goes straight back where it came from.',
    effect: { reflectFraction: 0.45 } },
  { id: 'vulcanised-hide', name: 'Vulcanised Hide', emoji: '🦾', elementId: 'rubber', priceSparks: 20,
    flavor: 'Cured over a fire until it stopped caring.',
    effect: { maxHp: 100 } },

  // ══ Gunpowder ═════════════════════════════════════════════════════
  { id: 'powder-keg', name: 'Powder Keg', emoji: '🧨', elementId: 'gunpowder', priceSparks: 21,
    flavor: 'Carried on the back. Everyone agrees this is a bad idea.',
    effect: { damageMult: 1.50, maxHp: -30 } },
  { id: 'shot-pouch', name: 'Shot Pouch', emoji: '💥', elementId: 'gunpowder', priceSparks: 20,
    flavor: 'Hand-sorted. The good ones go in first.',
    effect: { critChance: 0.30 } },
  { id: 'fuse-cord', name: 'Short Fuse', emoji: '🕯️', elementId: 'gunpowder', priceSparks: 19,
    flavor: 'Cut down to almost nothing. The big one comes fast.',
    effect: { ultimateCooldownMult: 0.60 } },

  // ══ Echo ══════════════════════════════════════════════════════════
  { id: 'sonar-bead', name: 'Sonar Bead', emoji: '🦇', elementId: 'echo', priceSparks: 21,
    flavor: 'You hear the swing before it starts.',
    effect: { dodgeChance: 0.30, speedMult: 1.15 } },
  { id: 'resonance-shell', name: 'Resonance Shell', emoji: '🐚', elementId: 'echo', priceSparks: 20,
    flavor: 'Held to the ear, it cancels most of what is coming.',
    effect: { damageTakenMult: 0.70 } },
  { id: 'clarion', name: 'Clarion', emoji: '📣', elementId: 'echo', priceSparks: 20,
    flavor: 'Everything you inflict comes back around, twice.',
    effect: { statusDurMult: 1.50, statusDmgMult: 1.30 } },

  // ══ Silence ═══════════════════════════════════════════════════════
  { id: 'void-cloak', name: 'Void Cloak', emoji: '🫥', elementId: 'silence', priceSparks: 21,
    flavor: 'For five seconds, the fight cannot find you.',
    effect: { invincibleMs: 5000 } },
  { id: 'muffled-boots', name: 'Muffled Boots', emoji: '👞', elementId: 'silence', priceSparks: 22,
    flavor: 'They keep swinging at where the sound was.',
    effect: { enemyDamageMult: 0.70 } },
  { id: 'still-heart', name: 'Still Heart', emoji: '🖤', elementId: 'silence', priceSparks: 27,
    flavor: 'It stops when yours does, and then it starts again.',
    effect: { reviveHpFrac: 0.50 } },

  // ══ Magic ═════════════════════════════════════════════════════════
  { id: 'mana-tome', name: 'Mana Tome', emoji: '📖', elementId: 'magic', priceSparks: 23,
    flavor: 'The pages turn themselves, slightly ahead of you.',
    effect: { cooldownMult: 0.60 } },
  { id: 'ward-sigil', name: 'Ward Sigil', emoji: '✴️', elementId: 'magic', priceSparks: 23,
    flavor: 'Chalked on the skin. Layered defences, all of them cheating.',
    effect: { shieldCharges: 6, shieldHp: 60 } },
  { id: 'philosophers-stone', name: "Philosopher's Stone", emoji: '💎', elementId: 'magic', priceSparks: 27,
    flavor: 'It does a little of everything, perfectly, and costs accordingly.',
    effect: { maxHp: 40, regenPerSecond: 4, damageMult: 1.15 } },

  // ══ Technology ════════════════════════════════════════════════════
  { id: 'nanite-swarm', name: 'Nanite Swarm', emoji: '🤖', elementId: 'technology', priceSparks: 21,
    flavor: 'They repair you constantly and never ask for a break.',
    effect: { regenPerSecond: 5 } },
  { id: 'overclock-chip', name: 'Overclock Chip', emoji: '💾', elementId: 'technology', priceSparks: 23,
    flavor: 'Well past the rated clock. The warranty is void anyway.',
    effect: { cooldownMult: 0.65, speedMult: 1.15 } },
  { id: 'targeting-suite', name: 'Targeting Suite', emoji: '🎯', elementId: 'technology', priceSparks: 22,
    flavor: 'It picks the soft parts for you.',
    effect: { critChance: 0.40 } },

  // ══ Subterfuge (world id `quantum`) ═══════════════════════════════
  { id: 'burner-phone', name: 'Burner Phone', emoji: '📱', elementId: 'quantum', priceSparks: 25,
    flavor: 'One call, and somebody else takes the hit for you.',
    effect: { reviveHpFrac: 0.40 } },
  { id: 'brass-knuckles', name: 'Brass Knuckles', emoji: '🥊', elementId: 'quantum', priceSparks: 22,
    flavor: 'No craftsmanship. Enormous results.',
    effect: { damageMult: 1.40 } },
  { id: 'smoke-bomb', name: 'Smoke Bomb', emoji: '💨', elementId: 'quantum', priceSparks: 23,
    flavor: 'The first six seconds happen without you in them.',
    effect: { invincibleMs: 6000 } },
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
