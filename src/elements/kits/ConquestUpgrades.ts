/**
 * Conquest's five upgrade trees, and every stat derived from them.
 *
 * Kept out of ConquestKit for one reason: the trees are read from three places that must never
 * disagree — the simulation, the upgrade menu that spends the Authority, and the NPC brain that
 * decides what to buy. A stat that lived on the building object would have to be recomputed by
 * hand at every purchase; a stat computed from the tier triple can't drift.
 *
 * The BTD6 rule is the shape of the whole thing: a building may take one path past tier 2, and
 * every other path is then capped there forever. `nextUpgrade` is the only place that rule
 * exists.
 *
 * **The third path of each tree is shop-gated.** It only exists at all once the matching
 * corrupt-shard upgrade is equipped (E+ for barracks, R+ for turret, F+ for barricade, Q+ for
 * the town center; the mastery's market borrows whichever slot it was bound over) — see
 * `SHOP_SLOT` below. The tier numbers themselves are always carried
 * (including over the wire), because a tier past zero is proof enough that its owner has the
 * upgrade; the *unlock* only ever gates buying, never reading.
 */

export type BuildKind = 'town' | 'barracks' | 'turret' | 'barricade' | 'market';

/** Which of the three columns of a tree. */
export type PathIdx = 0 | 1 | 2;

/** Tiers bought on each of the three paths, 0–4. */
export type Tiers = [number, number, number];

/**
 * The shop upgrade slot that unlocks each tree's third path.
 *
 * The market's is empty because it does not have one of its own: it is a mastery ability rather
 * than a base key, so the slot that unlocks its BANKING column is whichever of E/R/F/Q the
 * player dropped the Market on. `ConquestKit.pathUnlocked` is the one place that knows that.
 */
export const SHOP_SLOT: Record<BuildKind, string> = {
  town: 'q', barracks: 'e', turret: 'r', barricade: 'f', market: '',
};

export interface UpgradeDef {
  name: string;
  desc: string;
  cost: number;
}

/** Path 0 first, then 1, then the shop-gated 2; four tiers each, cheapest first. */
export const UPGRADES: Record<BuildKind, [UpgradeDef[], UpgradeDef[], UpgradeDef[]]> = {
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
    [
      { name: 'Enchantment', desc: 'Your Banner Bash hits for 5 more.', cost: 25 },
      { name: 'Wizard Tower', desc: 'A fireball forms over this town every 10s. Drag it off to hurl it for 30.', cost: 35 },
      { name: 'Wizard School', desc: 'Every 20s one of your soldiers becomes a wizard: double HP, three squares of reach, half the damage.', cost: 40 },
      { name: 'Academy of Ash', desc: 'Fireballs and wizards hit 50% harder, and a dying wizard bursts for 25.', cost: 50 },
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
    [
      { name: 'Speedy', desc: 'Its soldiers march two squares at a time.', cost: 10 },
      { name: 'Surprise!', desc: "A soldier's first swing after arriving somewhere new hits for 10 more.", cost: 30 },
      { name: 'Shadow Cloak', desc: 'Its soldiers dodge the first hit aimed at them outright, then a quarter of everything after.', cost: 20 },
      { name: 'Assassin Guild', desc: 'Dodge rises to 50%, every swing hits for 2 more, and marching through the enemy cuts them for 12.', cost: 45 },
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
    [
      { name: 'Boom Bullets', desc: 'Every bullet that lands bursts for 3 more around it.', cost: 15 },
      { name: 'Boom Back', desc: 'Hit this tower and it lobs an 8 damage bomb back at whoever did it.', cost: 25 },
      { name: 'Blast Nucleus', desc: 'The gun is replaced by a close-range blast worth double a bullet.', cost: 40 },
      { name: 'Atomic Annihilation', desc: 'Blasts are 25% wider, ordnance hits 25% harder, and revenge bombs drag their victim in.', cost: 60 },
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
    [
      { name: 'Speedy Walls', desc: 'Stand near it and you move 15% faster. Stacks, up to four walls.', cost: 10 },
      { name: 'Moving Walls', desc: 'The wall can be dragged a square at a time, like a garrison.', cost: 20 },
      { name: 'Personal Wall', desc: 'Link to it from this menu and it takes your hits instead of you.', cost: 50 },
      { name: 'Force Shield', desc: 'While you are linked to it you move 25% faster and hit 20% harder.', cost: 50 },
    ],
  ],
  // Conquest Mastery. The only tree that spends money on money — and the only one whose third
  // column is unlocked by the slot the ability was bound over rather than by a slot of its own.
  market: [
    [
      { name: 'Economic boost', desc: '+1 Authority a second.', cost: 35 },
      { name: 'Thrive', desc: '+1 more Authority a second.', cost: 50 },
      { name: 'Market Revolution', desc: 'Every other market you own earns +1 Authority a second.', cost: 75 },
      { name: 'Money Mania', desc: 'Every town centre you own pays double.', cost: 100 },
    ],
    [
      { name: 'Cash out', desc: 'Pays every 0.8s instead of every second — a quarter more income.', cost: 25 },
      { name: 'Warmongering', desc: 'Every 50 damage you deal pays 3 Authority.', cost: 35 },
      { name: 'Blood money', desc: 'Turrets and soldiers near it hit up to 50% harder, on how much is banked.', cost: 45 },
      { name: 'Loan Shark', desc: 'A LOAN button in this menu: 25 of your own health for 5 Authority.', cost: 50 },
    ],
    [
      { name: 'Banking', desc: 'Up to +2 more Authority a second, on how much is lying around.', cost: 50 },
      { name: 'Investing', desc: 'Your bank grows 10% every 5 seconds, up to 25 a time.', cost: 50 },
      { name: 'Securities', desc: 'A vault in the stall instead: deposit up to 200, +25% every 5s, lost if it falls.', cost: 75 },
      { name: 'Propaganda Central', desc: 'A PROPAGANDA button: 8s of paying for hits in Authority instead of health.', cost: 75 },
    ],
  ],
};

export const KIND_LABEL: Record<BuildKind, string> = {
  town: 'TOWN CENTER',
  barracks: 'BARRACKS',
  turret: 'TURRET',
  barricade: 'BARRICADE',
  market: 'MARKET',
};

export const KIND_EMOJI: Record<BuildKind, string> = {
  town: '🏛️', barracks: '⚔️', turret: '🔫', barricade: '🧱', market: '🏪',
};

/** What each path is *for*, shown as the column heading in the menu. */
export const PATH_LABEL: Record<BuildKind, [string, string, string]> = {
  town: ['ECONOMY', 'MILITARY', 'ARCANE'],
  barracks: ['NUMBERS', 'STRENGTH', 'SHADOW'],
  turret: ['POWER', 'SPEED', 'ORDNANCE'],
  barricade: ['DEFENCE', 'MEDICAL', 'BULWARK'],
  market: ['ECONOMY', 'WAR', 'BANKING'],
};

/** Base placement costs, before any town center's Discounted. */
export const BUILD_COST: Record<'barracks' | 'turret' | 'barricade' | 'market', number> = {
  barracks: 35, turret: 25, barricade: 10, market: 30,
};

export const EXPANSION_COST = 150;
/** Q+ (Expansion Enhanced) — a second capital for two thirds of the price. */
export const EXPANSION_COST_ENHANCED = 100;

export const PATHS: PathIdx[] = [0, 1, 2];

/** The two paths that aren't this one. */
function others(path: PathIdx): PathIdx[] {
  return PATHS.filter((p) => p !== path);
}

/**
 * The BTD6 restriction, and the only place it lives: a building may push one path to tier 3 or
 * 4, and doing so pins every other path at 2. Returns the cost of the next upgrade on `path`, or
 * null if it can't be bought at all.
 *
 * Note this is the *rule*, not the *unlock* — a third path that the shop hasn't opened yet is
 * simply never offered by the caller. Keeping the gate out of here means a remote opponent's
 * board, which arrives as tier numbers with no save behind it, reads back exactly as they built it.
 */
export function nextUpgrade(kind: BuildKind, tiers: Tiers, path: PathIdx): UpgradeDef | null {
  const tier = tiers[path];
  if (tier >= 4) return null;
  // Crossing into tier 3 requires every other path to still be at 2 or below — and once one
  // isn't, this path can never cross either.
  if (tier + 1 >= 3 && others(path).some((p) => tiers[p] >= 3)) return null;
  return UPGRADES[kind][path][tier];
}

/** True when another path has already committed, so this one is locked at its current tier. */
export function pathLocked(tiers: Tiers, path: PathIdx): boolean {
  return others(path).some((p) => tiers[p] >= 3) && tiers[path] >= 2;
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
  /** Enchantment: flat damage added to Banner Bash. */
  bannerBonus: number;
  /** Wizard Tower: this town grows a hurlable fireball. */
  fireball: boolean;
  /** Wizard School: this town promotes one soldier to a wizard every 20s. */
  wizardSchool: boolean;
  /** Academy of Ash: fireballs and wizards hit harder, and a dying wizard bursts. */
  ash: boolean;
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
    bannerBonus: t[2] >= 1 ? 5 : 0,
    fireball: t[2] >= 2,
    wizardSchool: t[2] >= 3,
    ash: t[2] >= 4,
  };
}

/** The owner-wide totals, folded across every town centre that side owns. */
export interface EmpireStats {
  income: number;
  discount: number;
  insurance: boolean;
  fortressHp: number;
  troopMult: number;
  bannerBonus: number;
  ash: boolean;
}

export function empireStats(towns: Tiers[]): EmpireStats {
  const out: EmpireStats = {
    income: 0, discount: 0, insurance: false, fortressHp: 0, troopMult: 1,
    bannerBonus: 0, ash: false,
  };
  for (const t of towns) {
    const s = townStats(t);
    out.income += s.income;
    out.discount = Math.max(out.discount, s.discount);
    out.insurance = out.insurance || s.insurance;
    out.fortressHp = Math.max(out.fortressHp, s.fortressHp);
    out.troopMult = Math.max(out.troopMult, s.troopMult);
    // Owner-wide like Fortress rather than summed: two Enchantments are two capitals' worth of
    // income, not ten more damage on the same pike.
    out.bannerBonus = Math.max(out.bannerBonus, s.bannerBonus);
    out.ash = out.ash || s.ash;
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
  /** Speedy: squares a stack from here can cross in one drag. */
  marchRange: number;
  /** Surprise!: +10 on the first swing after arriving somewhere new. */
  surprise: boolean;
  /** Shadow Cloak: the first hit aimed at one of these soldiers always misses. */
  cloak: boolean;
  /** Chance every later hit misses too. */
  dodge: number;
  /** Assassin Guild: marching through the enemy cuts them. */
  guild: boolean;
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
  const guild = t[2] >= 4;
  return {
    maxHp: 250 + fortressHp,
    spawnMs: t[0] >= 3 ? 1500 : 3000,
    cap: king ? 1 : 3 + (t[0] >= 1 ? 1 : 0) + (t[0] >= 2 ? 1 : 0),
    // The Guild's +2 is added after the king branch on purpose: it arms the man, and the king
    // is a man.
    troopDamage: (king ? 20 : dmg) + (guild ? 2 : 0),
    troopAtkMs: king ? 2000 : atkMs,
    troopHp: king ? 200 : hp,
    crowdBonus: t[0] >= 4,
    king,
    marchRange: t[2] >= 1 ? 2 : 1,
    surprise: t[2] >= 2,
    cloak: t[2] >= 3,
    dodge: guild ? 0.5 : t[2] >= 3 ? 0.25 : 0,
    guild,
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
  /** Boom Bullets: every landed bullet bursts. */
  boomBullets: boolean;
  boomDamage: number;
  boomRadius: number;
  /** Boom Back: a bomb lobbed at whoever last hurt the tower. */
  boomBack: boolean;
  bombDamage: number;
  /** Atomic Annihilation: revenge bombs haul their victim in toward the tower. */
  bombDrag: boolean;
  /** Blast Nucleus: the gun is replaced by a short, wide detonation. */
  blast: boolean;
  blastDamage: number;
  blastRadius: number;
  /** Atomic Annihilation — carried for the visuals, which get a second violet ring. */
  atomic: boolean;
}

export function turretStats(t: Tiers, fortressHp: number): TurretStats {
  let dmg = 10;
  if (t[0] >= 1) dmg += 3;
  if (t[0] >= 2) dmg += 5;
  if (t[0] >= 4) dmg += 3;
  let fireMs = 2000;
  if (t[1] >= 1) fireMs /= 1.2;
  if (t[1] >= 2) fireMs /= 1.25;
  // Atomic's boost rides only the ordnance path's own output — blasts, bursts and bombs. The
  // plain bullet is the POWER path's business and is left alone.
  const atomic = t[2] >= 4;
  const ord = atomic ? 1.25 : 1;
  const blast = t[2] >= 3;
  return {
    maxHp: 100 + fortressHp,
    damage: dmg,
    fireMs,
    bulletSpeed: t[1] >= 1 ? 462 : 420,
    hitscan: t[0] >= 3,
    headhunter: t[0] >= 4,
    burst: t[1] >= 4 ? 15 : t[1] >= 3 ? 3 : 1,
    radial: t[1] >= 4,
    // A blast tower has to be walked up to; that shorter leash is what pays for double damage.
    range: blast ? 140 : 220,
    boomBullets: t[2] >= 1,
    boomDamage: Math.round(3 * ord),
    boomRadius: 34 * ord,
    boomBack: t[2] >= 2,
    bombDamage: Math.round(8 * ord),
    bombDrag: atomic,
    blast,
    blastDamage: Math.round(dmg * 2 * ord),
    blastRadius: 70 * ord,
    atomic,
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
  /** Speedy Walls: standing near it hurries its owner along. */
  speedAura: boolean;
  /** Moving Walls: it can be dragged a square at a time. */
  movable: boolean;
  /** Personal Wall: it can be linked to, and then eats its owner's hits. */
  linkable: boolean;
  /** Force Shield: being linked to it is also a buff. */
  forceShield: boolean;
}

export function barricadeStats(t: Tiers, fortressHp: number): BarricadeStats {
  return {
    maxHp: 300 + (t[0] >= 1 ? 50 : 0) + (t[0] >= 2 ? 200 : 0) + fortressHp,
    wardMult: t[0] >= 3 ? 0.5 : 0.75,
    spikes: t[0] >= 4,
    selfRegen: t[1] >= 2 ? 15 : t[1] >= 1 ? 5 : 0,
    neighbourRegen: t[1] >= 3 ? 10 : 0,
    troopRegen: t[1] >= 4 ? 10 : 0,
    speedAura: t[2] >= 1,
    movable: t[2] >= 2,
    linkable: t[2] >= 3,
    forceShield: t[2] >= 4,
  };
}

// ── Market (Conquest Mastery) ────────────────────────────────────────────────

/** The stall itself. Deliberately the flimsiest thing on the board — it is a bank, not a wall. */
export const MARKET_HP = 50;
export const MARKET_INCOME = 1;
/** Cash out: the same money on a 0.8s clock rather than a 1s one. */
export const CASH_OUT_MULT = 1.25;
/** Warmongering. */
export const WARMONGER_PER = 50;
export const WARMONGER_PAYS = 3;
/** Blood money: how far the stall's patronage reaches, and how fast the bank buys damage. */
export const BLOOD_RANGE = 128;
export const BLOOD_PER = 50;
export const BLOOD_STEP = 0.05;
export const BLOOD_MAX = 0.5;
/** Loan Shark. */
export const LOAN_DAMAGE = 25;
export const LOAN_PAYS = 5;
/** Banking: the ceiling, and the bank size that reaches it. */
export const BANKING_MAX = 2;
export const BANKING_AT = 200;
/**
 * Investing and Securities share one five-second clock. The cap on Investing is the only
 * number here that is not the player's: ten per cent of an uncapped bank compounds into
 * unbounded Blood money and an unbounded Dictatorship pike inside a minute.
 */
export const INTEREST_MS = 5000;
export const INVEST_RATE = 0.1;
export const INVEST_CAP = 25;
export const VAULT_RATE = 0.25;
export const VAULT_MAX = 200;
/** How much one press of the DEPOSIT button moves. */
export const VAULT_STEP = 25;
/** Propaganda Central. */
export const PROPAGANDA_MS = 8000;
export const PROPAGANDA_COOLDOWN_MS = 20000;
/** Authority charged per point of damage taken — cheaper than health because it is harder to get. */
export const PROPAGANDA_RATE = 0.6;
/** What the rest of the window costs once the bank is dry. */
export const PROPAGANDA_PENALTY = 2;

/** Dictatorship: Authority per point of Banner Bash, and the ceiling. */
export const DICTATORSHIP_PER = 10;
export const DICTATORSHIP_MAX = 30;

export interface MarketStats {
  maxHp: number;
  /** Authority a second this stall pays on its own, Cash out included. */
  income: number;
  /** Market Revolution: every *other* market of this owner earns one more a second. */
  revolution: boolean;
  /** Money Mania: this owner's town centres pay double. */
  mania: boolean;
  /** Warmongering: damage dealt pays out. */
  warmonger: boolean;
  /** Blood money: turrets and soldiers near this stall hit harder on the bank. */
  bloodMoney: boolean;
  /** Loan Shark: the menu grows a LOAN button. */
  loans: boolean;
  /** Banking: a second income that scales with what is lying around. */
  banking: boolean;
  /**
   * Investing: the whole bank grows on the interest clock. False again at Securities — the two
   * are the same tier line, and the vault is what replaces it.
   */
  investing: boolean;
  /** Securities: this stall holds a vault of its own. */
  securities: boolean;
  /** Propaganda Central: the menu grows a PROPAGANDA button. */
  propaganda: boolean;
}

export function marketStats(t: Tiers, fortressHp: number): MarketStats {
  let income = MARKET_INCOME;
  if (t[0] >= 1) income += 1;
  if (t[0] >= 2) income += 1;
  if (t[1] >= 1) income *= CASH_OUT_MULT;
  return {
    maxHp: MARKET_HP + fortressHp,
    income,
    revolution: t[0] >= 3,
    mania: t[0] >= 4,
    warmonger: t[1] >= 2,
    bloodMoney: t[1] >= 3,
    loans: t[1] >= 4,
    banking: t[2] >= 1,
    // Securities is the next tier up the same column, so a stall that has one has always bought
    // the other — which is exactly what "cannot get this boost and the investing boost" means.
    investing: t[2] === 2,
    securities: t[2] >= 3,
    propaganda: t[2] >= 4,
  };
}

// ── Banner Bearer (Click+) ───────────────────────────────────────────────────

/** Which standard the commander is carrying. Right-click cycles them in this order. */
export type BannerForm = 'offense' | 'defense' | 'healing';

export const BANNER_ORDER: BannerForm[] = ['offense', 'defense', 'healing'];

export interface BannerStats {
  label: string;
  color: number;
  /** Base pike damage before the home-ground quarter. */
  damage: number;
  /** Factor on Banner Bash's own cooldown. */
  cooldownMult: number;
  /** Extra damage on every friendly soldier standing in the commander's aura. */
  troopDamage: number;
  /** Damage multiplier on friendly buildings inside the aura. */
  buildingMult: number;
  /** HP a second poured into friendly soldiers inside the aura. */
  troopHeal: number;
}

/** How far the standard's influence reaches — a little over two squares. */
export const BANNER_AURA = 150;

export const BANNER_STATS: Record<BannerForm, BannerStats> = {
  offense: {
    label: 'OFFENSIVE', color: 0xd83a3a,
    damage: 20, cooldownMult: 1, troopDamage: 3, buildingMult: 1, troopHeal: 0,
  },
  defense: {
    label: 'DEFENSIVE', color: 0x3a7fd8,
    damage: 10, cooldownMult: 0.5, troopDamage: 0, buildingMult: 0.8, troopHeal: 0,
  },
  healing: {
    label: 'HEALING', color: 0x4fc46a,
    damage: 25, cooldownMult: 1.5, troopDamage: 0, buildingMult: 1, troopHeal: 3,
  },
};
