/**
 * Conquest's four upgrade trees, and every stat derived from them.
 *
 * Kept out of ConquestKit for one reason: the trees are read from three places that must never
 * disagree — the simulation, the upgrade menu that spends the Authority, and the NPC brain that
 * decides what to buy. A stat that lived on the building object would have to be recomputed by
 * hand at every purchase; a stat computed from the tier pair can't drift.
 *
 * The BTD6 rule is the shape of the whole thing: a building may take one path past tier 2, and
 * the other path is then capped there forever. `canBuy` is the only place that rule exists.
 */

export type BuildKind = 'town' | 'barracks' | 'turret' | 'barricade';

/** Tiers bought on each of the two paths, 0–4. */
export type Tiers = [number, number];

export interface UpgradeDef {
  name: string;
  desc: string;
  cost: number;
}

/** Path 0 first, path 1 second; four tiers each, cheapest first. */
export const UPGRADES: Record<BuildKind, [UpgradeDef[], UpgradeDef[]]> = {
  town: [
    [
      { name: 'Richer', desc: '+1 Authority a second.', cost: 20 },
      { name: 'Even Richer', desc: '+1 more Authority a second.', cost: 50 },
      { name: 'Discounted', desc: 'Every building costs 5 less Authority.', cost: 75 },
      { name: 'Capital City', desc: '+2 more Authority a second.', cost: 125 },
    ],
    [
      { name: 'Insurance', desc: 'Every 50 damage you take pays out 2 Authority.', cost: 15 },
      { name: 'Fortress', desc: '+100 HP to every building you own.', cost: 15 },
      { name: 'Military Center', desc: '+1 Authority a second. Troops deal 25% more damage and have 25% more HP.', cost: 35 },
      { name: 'Military HQ', desc: '+1 more Authority a second, and those troop buffs rise to 50%.', cost: 50 },
    ],
  ],
  barracks: [
    [
      { name: 'Recruits', desc: '+1 soldier per square.', cost: 15 },
      { name: 'Crowding', desc: '+1 more soldier per square.', cost: 15 },
      { name: 'Recruitment Office', desc: 'Trains a soldier every 1.5s instead of 3s.', cost: 20 },
      { name: 'Strength in Numbers', desc: 'Soldiers deal +1 damage for every soldier sharing their square.', cost: 100 },
    ],
    [
      { name: 'Axes', desc: '+2 soldier damage.', cost: 25 },
      { name: 'Dual Wield', desc: '+2 more soldier damage.', cost: 45 },
      { name: 'Berserker', desc: '+30% soldier attack speed and +25 soldier HP.', cost: 50 },
      { name: 'Barbarian King', desc: 'Trains one 200 HP king instead, hitting for 20 every 2s. Below a third HP he drinks a potion for 50 HP and double attack speed.', cost: 200 },
    ],
  ],
  turret: [
    [
      { name: 'Stronger Bullets', desc: '+3 bullet damage.', cost: 15 },
      { name: 'Even Stronger Bullets', desc: '+5 more bullet damage.', cost: 25 },
      { name: 'Sniper Nest', desc: 'Bullets become hitscan — they land the instant they are fired.', cost: 35 },
      { name: 'Headhunter', desc: '+3 bullet damage, and a 10% chance of a double-damage headshot.', cost: 75 },
    ],
    [
      { name: 'Faster Bullets', desc: 'Bullets fly 10% faster and the turret fires 20% faster.', cost: 10 },
      { name: 'Even Faster', desc: 'The turret fires another 25% faster.', cost: 20 },
      { name: 'Burst Tower', desc: 'Fires in bursts of 3.', cost: 50 },
      { name: 'Burst Mania', desc: 'Fires 15 bullets in a full circle instead.', cost: 50 },
    ],
  ],
  barricade: [
    [
      { name: 'Stone Walls', desc: '+50 barricade HP.', cost: 10 },
      { name: 'Iron Walls', desc: '+200 more barricade HP.', cost: 20 },
      { name: 'Defender', desc: 'Its damage resistance aura rises to 50%.', cost: 30 },
      { name: 'Spiked Walls', desc: 'Deals 5 damage back for every 20 taken by it or any building beside it.', cost: 30 },
    ],
    [
      { name: 'Regenerating Wall', desc: 'Heals 5 HP a second.', cost: 5 },
      { name: 'Mega Heals', desc: 'Heals 15 HP a second instead.', cost: 20 },
      { name: 'Medical Center', desc: 'Heals every building beside it for 10 HP a second too.', cost: 30 },
      { name: 'Hospital', desc: 'Heals nearby soldiers for 10 HP a second as well.', cost: 35 },
    ],
  ],
};

export const KIND_LABEL: Record<BuildKind, string> = {
  town: 'TOWN CENTER',
  barracks: 'BARRACKS',
  turret: 'TURRET',
  barricade: 'BARRICADE',
};

export const KIND_EMOJI: Record<BuildKind, string> = {
  town: '🏛️', barracks: '⚔️', turret: '🔫', barricade: '🚧',
};

/** What each path is *for*, shown as the column heading in the menu. */
export const PATH_LABEL: Record<BuildKind, [string, string]> = {
  town: ['ECONOMY', 'MILITARY'],
  barracks: ['NUMBERS', 'STRENGTH'],
  turret: ['POWER', 'SPEED'],
  barricade: ['DEFENCE', 'MEDICAL'],
};

/** Base placement costs, before any town center's Discounted. */
export const BUILD_COST: Record<'barracks' | 'turret' | 'barricade', number> = {
  barracks: 35, turret: 25, barricade: 10,
};

export const EXPANSION_COST = 150;

/**
 * The BTD6 restriction, and the only place it lives: a building may push one path to tier 3 or
 * 4, and doing so pins the other path at 2. Returns the cost of the next upgrade on `path`, or
 * null if it can't be bought at all.
 */
export function nextUpgrade(kind: BuildKind, tiers: Tiers, path: 0 | 1): UpgradeDef | null {
  const tier = tiers[path];
  if (tier >= 4) return null;
  const other = tiers[path === 0 ? 1 : 0];
  // Crossing into tier 3 requires the other path to still be at 2 or below — and once it
  // isn't, this path can never cross either.
  if (tier + 1 >= 3 && other >= 3) return null;
  return UPGRADES[kind][path][tier];
}

/** True when the other path has already committed, so this one is locked at its current tier. */
export function pathLocked(tiers: Tiers, path: 0 | 1): boolean {
  const other = tiers[path === 0 ? 1 : 0];
  return other >= 3 && tiers[path] >= 2;
}

// ── Derived stats ────────────────────────────────────────────────────────────

/**
 * Everything one town center contributes. The owner-wide effects (Fortress, Discounted, the
 * military buffs) are taken as the *best* across your towns rather than summed — two Fortresses
 * are two town centers' worth of income, not two hundred extra HP on every wall.
 */
export interface TownStats {
  income: number;
  discount: number;
  insurance: boolean;
  fortressHp: number;
  troopMult: number;
}

export function townStats(t: Tiers): TownStats {
  let income = 2;
  if (t[0] >= 1) income += 1;
  if (t[0] >= 2) income += 1;
  if (t[0] >= 4) income += 2;
  if (t[1] >= 3) income += 1;
  if (t[1] >= 4) income += 1;
  return {
    income,
    discount: t[0] >= 3 ? 5 : 0,
    insurance: t[1] >= 1,
    fortressHp: t[1] >= 2 ? 100 : 0,
    troopMult: t[1] >= 4 ? 1.5 : t[1] >= 3 ? 1.25 : 1,
  };
}

/** The owner-wide totals, folded across every town centre that side owns. */
export interface EmpireStats {
  income: number;
  discount: number;
  insurance: boolean;
  fortressHp: number;
  troopMult: number;
}

export function empireStats(towns: Tiers[]): EmpireStats {
  const out: EmpireStats = { income: 0, discount: 0, insurance: false, fortressHp: 0, troopMult: 1 };
  for (const t of towns) {
    const s = townStats(t);
    out.income += s.income;
    out.discount = Math.max(out.discount, s.discount);
    out.insurance = out.insurance || s.insurance;
    out.fortressHp = Math.max(out.fortressHp, s.fortressHp);
    out.troopMult = Math.max(out.troopMult, s.troopMult);
  }
  return out;
}

export interface BarracksStats {
  maxHp: number;
  spawnMs: number;
  /** Soldiers allowed in one square. */
  cap: number;
  troopDamage: number;
  troopAtkMs: number;
  troopHp: number;
  /** Strength in Numbers: +1 damage per soldier sharing the square. */
  crowdBonus: boolean;
  king: boolean;
}

export function barracksStats(t: Tiers, fortressHp: number): BarracksStats {
  const king = t[1] >= 4;
  let dmg = 3;
  if (t[1] >= 1) dmg += 2;
  if (t[1] >= 2) dmg += 2;
  let hp = 25;
  if (t[1] >= 3) hp += 25;
  let atkMs = 1000;
  if (t[1] >= 3) atkMs /= 1.3;
  return {
    maxHp: 250 + fortressHp,
    spawnMs: t[0] >= 3 ? 1500 : 3000,
    cap: king ? 1 : 3 + (t[0] >= 1 ? 1 : 0) + (t[0] >= 2 ? 1 : 0),
    troopDamage: king ? 20 : dmg,
    troopAtkMs: king ? 2000 : atkMs,
    troopHp: king ? 200 : hp,
    crowdBonus: t[0] >= 4,
    king,
  };
}

export interface TurretStats {
  maxHp: number;
  damage: number;
  fireMs: number;
  bulletSpeed: number;
  hitscan: boolean;
  headhunter: boolean;
  /** Shots per volley, and whether that volley is a full circle rather than an aimed burst. */
  burst: number;
  radial: boolean;
  range: number;
}

export function turretStats(t: Tiers, fortressHp: number): TurretStats {
  let dmg = 10;
  if (t[0] >= 1) dmg += 3;
  if (t[0] >= 2) dmg += 5;
  if (t[0] >= 4) dmg += 3;
  let fireMs = 2000;
  if (t[1] >= 1) fireMs /= 1.2;
  if (t[1] >= 2) fireMs /= 1.25;
  return {
    maxHp: 100 + fortressHp,
    damage: dmg,
    fireMs,
    bulletSpeed: t[1] >= 1 ? 462 : 420,
    hitscan: t[0] >= 3,
    headhunter: t[0] >= 4,
    burst: t[1] >= 4 ? 15 : t[1] >= 3 ? 3 : 1,
    radial: t[1] >= 4,
    range: 220,
  };
}

export interface BarricadeStats {
  maxHp: number;
  /** Damage multiplier granted to neighbouring buildings — 0.75, or 0.5 with Defender. */
  wardMult: number;
  spikes: boolean;
  selfRegen: number;
  neighbourRegen: number;
  troopRegen: number;
}

export function barricadeStats(t: Tiers, fortressHp: number): BarricadeStats {
  return {
    maxHp: 300 + (t[0] >= 1 ? 50 : 0) + (t[0] >= 2 ? 200 : 0) + fortressHp,
    wardMult: t[0] >= 3 ? 0.5 : 0.75,
    spikes: t[0] >= 4,
    selfRegen: t[1] >= 2 ? 15 : t[1] >= 1 ? 5 : 0,
    neighbourRegen: t[1] >= 3 ? 10 : 0,
    troopRegen: t[1] >= 4 ? 10 : 0,
  };
}
