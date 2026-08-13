import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import type { CustomStatus } from './StatusHudKit';
import type { ProjectileRegistry, RegisteredProjectile } from '../../combat/ProjectileRegistry';
import { Projectile } from '../../combat/Projectile';
import { STATUS_DESCRIPTORS, isDebuff, seedEffectSnapshot, stretchNewEffects } from '../../combat/StatusEffects';
import { Sfx } from '../../audio';
import {
  FOR, FortuneAvatar, FortuneColorFn, FortuneFx, auditMark, auditor, bouncyBolt, bulletShape,
  daggerShape, gildedAura, goldBeam, goldCone, grenadeShape, healPylon, midasBullet, muzzleOf,
  passTier, pepperFlame, roombaShape, rustyCar, stall, turnstile,
} from './FortuneVisuals';
import { meterGain } from '../../combat/Meters';

type Owner = 'player' | 'npc';

const ARENA_PAD = 32;
const BOTH: Owner[] = ['player', 'npc'];
const TAU_LOCAL = Math.PI * 2;

// ── Passive: Shopkeeper ──────────────────────────────────────────────────────
/** Damage anybody deals, per blood coin it is worth. */
const DAMAGE_PER_COIN = 20;
/** How close you have to stand to the counter to be served. */
const SHOP_RANGE = 132;
/** What an enemy's purchase kicks back to the shopkeeper. */
const KICKBACK = 0.5;
/** How often a bot or a husk wanders up and buys something. */
const BOT_BUY_MS = 9000;

// ── Weapons ──────────────────────────────────────────────────────────────────
const BULLET_LIFE_MS = 1600;
const BULLET_R = 8;
/** Attachments are capped at two. The gun is capped at one. That is the whole loadout. */
const MAX_ATTACHMENTS = 2;
/**
 * Acceleration Gear: how fast the action cycles on the last round compared with a full magazine.
 *
 * Linear in how empty the magazine is, so it is a reason to shoot the thing dry rather than a
 * reason to top it up — and it argues directly against the two magazine mods, because a bigger
 * drum is a longer stretch of the mag spent at the slow end of the ramp.
 */
const ACCEL_MAX = 2.2;

// ── Safe Investment (E) ──────────────────────────────────────────────────────
const DEPOSIT = 5;
const SETTLE_MS = 10_000;
const CAPITAL_GAINS = 0.10;
/** However small the balance, a bank pays *something*. */
const CAPITAL_FLOOR = 1;

// ── Risky Investment (R) ─────────────────────────────────────────────────────
const RISK_DEAL_BAR = 50;
const RISK_TAKE_BAR = 100;
const RISK_UP = 0.20;
const RISK_DOWN = -0.20;
/** Did well and got hit: the market splits the difference rather than picking a side. */
const RISK_MIXED = 0.10;

// ── Paywall (F) ──────────────────────────────────────────────────────────────
const WALL_MS = 5000;
/** Half-width of the band a shot or a body has to be inside to be charged. */
const WALL_HALF = 15;
const TOLL_SHOT = 1;
const TOLL_BODY = 3;
/**
 * What an unpaid coin costs in blood.
 *
 * The turnstile used to wave a broke customer through, which meant that against anybody who was
 * not already running Fortune's economy the whole ability did nothing at all. It is a toll: if
 * they cannot pay it in coin they pay it out of the coin's raw material, and that damage mints
 * its own coins through the ordinary passive.
 */
const BLOOD_PER_COIN = 8;
/** Minimum gap between two blood tolls on one side, so a burst weapon cannot be billed to death. */
const BLOOD_GATE_MS = 400;

// ── Pay-to-Win (Q) ───────────────────────────────────────────────────────────
const BEAM_MS = 8000;
const BEAM_LEN = 520;
const BEAM_HALF = 15;
const BEAM_DPS = 95;
const BEAM_COINS_PER_SEC = 6;
/** Radians per second the beam is allowed to turn. Deliberately slow — it is walked, not aimed. */
const BEAM_TURN = 1.15;

// ── Alt-Fire (Click+) ────────────────────────────────────────────────────────

/** The pistol dump: the whole magazine, as fast as the slide will cycle, aimed by hope. */
const DUMP_SPREAD = 0.34;
const DUMP_GAP_MS = 55;
/** The revolver's spin-up. Three seconds is the whole bar. */
const SPIN_MS = 3000;
const SPIN_DAMAGE = 30;
/** The AR's thrown clip. */
const CLIP_SPEED = 640;
const CLIP_BURST_SPEED = 760;
/** The Midas round. */
const MIDAS_COINS = 5;
const MIDAS_AMMO = 2;
const MIDAS_DAMAGE = 25;
const MIDAS_SPEED = 250;
const GILD_MS = 5000;
/** What a gilded body is worth. Coins, not damage — the mult is on the payout, not the wound. */
const GILD_PAYOUT = 2;

// ── Safe Marketing (E+) ──────────────────────────────────────────────────────
const CHILLY_MS = 12_000;
const CHILLY_EVERY_MS = 3000;
const CHILLY_R = 132;
const CHILLY_SLOW = 0.8;
const CHILLY_SLOW_MS = 5000;
const PYLON_MAX = 4;
const PYLON_HEAL = 10;
const PYLON_COOL_MS = 5000;
const PYLON_R = 30;
const TELE_MS = 12_000;

// ── Risky Marketing (R+) ─────────────────────────────────────────────────────
const GRENADE_DAMAGE = 20;
const GRENADE_R = 94;
const GRENADE_LIFE_MS = 2600;
/** The self-launch: everything at your feet, and you are not here for three seconds. */
const LAUNCH_MS = 3000;
const BOUNCE_MAX = 3;
const LASER_BOUNCES = 12;
const LASER_DAMAGE = 20;
const LASER_AMMO = 4;
/** The grips. Each one is a straight trade between the two triggers. */
const GRIP_SPEC = { main: 0.7, alt: 1.5 };
const GRIP_BASIC = { main: 1.35, alt: 0.6 };

// ── Tax Evasion (F+) ─────────────────────────────────────────────────────────
const WALL_TAX_MULT = 1.5;
/** Coins through one wall before somebody at the revenue service notices. */
const AUDIT_TRIGGER = 10;
const AUDIT_AIM_MS = 5000;
const AUDIT_DAMAGE = 35;
const AUDIT_SLOW = 0.8;
const AUDIT_DEBUFF_MS = 8000;
const AUDIT_VULN = 1.2;

// ── Golden Excess (Q+) ───────────────────────────────────────────────────────
/** Half-angle of the cone, in radians, empty and per coin the beam has burned. */
const EXCESS_HALF0 = 0.10;
const EXCESS_HALF_PER_COIN = 0.011;
const EXCESS_HALF_MAX = 1.2;
/** Damage per second, likewise. There is a ceiling, but it is a long way up. */
const EXCESS_DPS_PER_COIN = 4.5;
const EXCESS_DPS_MAX = 700;
/** The drain accelerates with the cone, so a fortune goes into it in seconds. */
const EXCESS_DRAIN_PER_COIN = 0.22;
const EXCESS_DRAIN_MAX = 70;

// ── Items ────────────────────────────────────────────────────────────────────

const PEPPER_MS = 5000;
const PEPPER_DROP_MS = 70;
const PEPPER_LIFE_MS = 2600;
const PEPPER_R = 22;
const PEPPER_DPS = 26;

const POUCH_CHARGES = 5;
const POUCH_R = 96;
/** Minimum gap between two pouch blasts, so a blast can't detonate the next charge itself. */
const POUCH_GATE_MS = 260;

const CURE_MS = 20_000;
const MIRACLE_MS = 20_000;

const DAGGER_VOLLEYS = 3;
const DAGGER_PER_VOLLEY = 8;
const DAGGER_DAMAGE = 2;
const DAGGER_GAP_MS = 170;
const DAGGER_SPEED = 620;
const DAGGER_SPREAD = 0.62;

const ROOMBA_MAX = 3;
const ROOMBA_DAMAGE = 25;
const ROOMBA_SPEED = 96;
/** Per-victim immunity, or one roomba parked on somebody is a blender. */
const ROOMBA_GATE_MS = 1400;

// ── Mastery passive: the Battle Pass ─────────────────────────────────────────

const PASS_TIERS = 30;
const PASS_COST = 3;
/** Every fifth tier is an item⁺ rather than a buff or an ordinary item off the shelf. */
const PASS_PLUS_EVERY = 5;
/** Roughly a third of the non-plus tiers. The rest are stat buffs, which is the point of it. */
const PASS_ITEM_CHANCE = 0.32;
const PASS_HP = 15;
const PASS_PLATE = 25;

// ── Mastery ability: Drive by Flex ───────────────────────────────────────────

const CAR_ID = 'drive-by-flex';
const CAR_COOLDOWN_MS = 24_000;
/** Deliberately slow. Quick Tires and Speedster are the whole reason the GARAGE tab exists. */
const CAR_SPEED = 155;
const CAR_BOUNCES = 5;
const CAR_RAM = 18;
const CAR_RAM_SPIKED = 34;
/** Per-victim immunity, so a car grinding along somebody is not a blender. */
const CAR_RAM_GATE_MS = 900;
const CAR_MOUNT_R = 54;
/** Half-length of the shell. Used for the bounce inset and for the ram's reach. */
const CAR_L = 27;
const CAR_MAX_BUFFS = 3;
const CAR_DEATH_DAMAGE = 30;
const CAR_DEATH_R = 92;
const SHRAPNEL_N = 16;
const SHRAPNEL_DAMAGE = 8;
const ROBO_EVERY_MS = 333;
const ROBO_DAMAGE = 2;
const ROBO_RANGE = 200;
const TANK_EVERY_MS = 3000;
const TANK_SHELL_DAMAGE = 15;
const TANK_SHELL_R = 70;
const TANK_RANGE = 165;
/** What riding is worth: a faster reload and a faster trigger, and the Sunroof doubles down. */
const RIDE_RELOAD = 0.6;
const RIDE_RATE = 1.35;
const RIDE_RELOAD_SUNROOF = 0.4;
const RIDE_RATE_SUNROOF = 1.7;
const SUNROOF_DAMAGE = 1.2;
const GUNNER_AMMO = 5;
const SPEEDSTER_TRAIL_MS = 80;

// ── Shop tables ──────────────────────────────────────────────────────────────

type Page = 'shop' | 'arms' | 'mods' | 'garage';
const PAGES: Page[] = ['shop', 'arms', 'mods', 'garage'];
const PAGE_NAME: Record<Page, string> = {
  shop: 'GENERAL', arms: 'ARMS ☠', mods: 'MODS ☠', garage: 'GARAGE 🚗',
};
/** The key printed against each row of the counter, in the order `numberKeys` registers them. */
const ROW_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'];

interface ShopEntry {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  page: Page;
  /** One line, shown on the counter. */
  desc: string;
  /**
   * The shop upgrade that puts this line on the shelf. Stock is the *shopkeeper's* — an enemy
   * standing at a counter that sells Tele-Cores can buy one, which is the passive working as
   * designed and not a leak.
   */
  needs?: 'click' | 'e' | 'r' | 'f' | 'q';
}

/**
 * The legal page. Both sides can see it and both sides can buy off it, which is the whole
 * passive: every one of these that an enemy takes hands half its price back to the shopkeeper.
 */
const GENERAL: ShopEntry[] = [
  { id: 'bandages', name: 'Bandages', emoji: '🩹', cost: 4, page: 'shop', desc: 'Heal 20 HP.' },
  { id: 'pepper', name: 'Spicy Pepper', emoji: '🌶️', cost: 3, page: 'shop', desc: 'Burn a fire trail behind you for 5s.' },
  { id: 'pouch', name: 'Explosives Pouch', emoji: '🧨', cost: 3, page: 'shop', desc: 'Next 5 hits blast everyone ELSE nearby.' },
  { id: 'cureall', name: 'Cure-All', emoji: '🧪', cost: 10, page: 'shop', desc: 'Cleanse, heal 50, no new debuffs for 20s.' },
  { id: 'daggers', name: 'Ornate Daggers', emoji: '🗡️', cost: 5, page: 'shop', desc: '3 volleys of 8 daggers, 2 dmg each.' },
  { id: 'roomba', name: 'Death Machine', emoji: '🤖', cost: 8, page: 'shop', desc: 'A knife on a vacuum. 25 dmg on touch, max 3.' },
  { id: 'miracle', name: 'The Miracle', emoji: '🏺', cost: 12, page: 'shop', desc: 'Double every good thing for 20s.' },
  { id: 'donation', name: 'Donation', emoji: '💝', cost: 20, page: 'shop', desc: 'Thank you for your generous support.' },
  { id: 'chilly', name: 'Chilly Pepper', emoji: '🥶', cost: 3, page: 'shop', needs: 'e', desc: 'Freezing ring every 3s for 12s. 20% slow.' },
  { id: 'pylon', name: 'Heal Pylon', emoji: '🗼', cost: 5, page: 'shop', needs: 'e', desc: 'Touch it to heal 10. Recharges every 5s.' },
  { id: 'telecore', name: 'Tele-Core', emoji: '🌀', cost: 8, page: 'shop', needs: 'e', desc: 'Your dash becomes a teleport for 12s.' },
];

/** Guns. One at a time; buying a second replaces the first. */
const ARMS: ShopEntry[] = [
  { id: 'pistol', name: 'Pistol', emoji: '🔫', cost: 0, page: 'arms', desc: '10 dmg · 10 rounds · fast.' },
  { id: 'revolver', name: 'Revolver', emoji: '🎯', cost: 5, page: 'arms', desc: '20 dmg · 6 rounds.' },
  { id: 'rifle', name: 'Rifle', emoji: '🪖', cost: 10, page: 'arms', desc: '30 dmg · 1 round · begging for a mag.' },
  { id: 'ar', name: 'AR', emoji: '💥', cost: 15, page: 'arms', desc: '3-round burst · 8 dmg each · 30 rounds.' },
  { id: 'golden', name: 'Golden Pistol', emoji: '🌟', cost: 30, page: 'arms', desc: 'Hitscan · 20 dmg +1 per 2 coins held.' },
  { id: 'launcher', name: 'Grenade Launcher', emoji: '💣', cost: 20, page: 'arms', needs: 'r', desc: '20 dmg blast · 3 shells · slow reload.' },
  { id: 'bouncy', name: 'Bouncy Blaster', emoji: '🟢', cost: 12, page: 'arms', needs: 'r', desc: '10 dmg · 8 rounds · bounces 3× off walls.' },
];

/** Attachments. Two at a time. */
const MODS: ShopEntry[] = [
  { id: 'silencer', name: 'Silencer', emoji: '🤫', cost: 3, page: 'mods', desc: 'Hits silence for 2s.' },
  { id: 'biggermag', name: 'Bigger Mag', emoji: '📦', cost: 3, page: 'mods', desc: '+3 magazine.' },
  { id: 'drummag', name: 'Drum Mag', emoji: '🥁', cost: 12, page: 'mods', desc: '+10 magazine.' },
  { id: 'hollow', name: 'Hollow Point', emoji: '🔩', cost: 8, page: 'mods', desc: '+5 bullet damage.' },
  { id: 'fiftycal', name: '50 Cal.', emoji: '🛢️', cost: 15, page: 'mods', desc: '+10 bullet damage.' },
  { id: 'scope', name: 'Sniper Scope', emoji: '🔭', cost: 3, page: 'mods', desc: 'Bullets +100% speed and pierce.' },
  { id: 'prop', name: 'Action Movie Prop', emoji: '🎬', cost: 10, page: 'mods', desc: 'Every shot launches you backwards.' },
  { id: 'accelgear', name: 'Acceleration Gear', emoji: '⚙️', cost: 9, page: 'mods', desc: 'Fires up to 2.2× faster as the mag empties.' },
  { id: 'specgrip', name: 'Specialized Grip', emoji: '🖐️', cost: 6, page: 'mods', needs: 'r', desc: 'Alt-fire ×1.5 dmg, normal fire ×0.7.' },
  { id: 'basicgrip', name: 'Basic Grip', emoji: '✊', cost: 6, page: 'mods', needs: 'r', desc: 'Normal fire ×1.35, alt-fire ×0.6.' },
  { id: 'dualgrip', name: 'Dual Grip', emoji: '🤞', cost: 25, page: 'mods', needs: 'r', desc: 'Next gun you buy goes in your right hand.' },
];

/**
 * The GARAGE. A fourth tab that only exists with Fortune Mastery switched on, and only for the
 * shopkeeper — it is not stock, it is a workshop, and the thing it works on is the car.
 *
 * Three of these at a time, ever. Tank alone is seven coins and rules out both of the other
 * expensive ones, which is the whole build decision.
 */
const GARAGE: ShopEntry[] = [
  { id: 'tires', name: 'Quick Tires', emoji: '🛞', cost: 1, page: 'garage', desc: 'The car drives 45% faster.' },
  { id: 'spikes', name: 'Spiked Bumper', emoji: '🔱', cost: 2, page: 'garage', desc: `Ram damage ${CAR_RAM} → ${CAR_RAM_SPIKED}.` },
  { id: 'chassis', name: 'Stronger Chassis', emoji: '🛡️', cost: 2, page: 'garage', desc: '+3 bounces before it goes up.' },
  { id: 'suicide', name: 'Suicide Mission', emoji: '💣', cost: 2, page: 'garage', desc: `Death blast throws ${SHRAPNEL_N} shrapnel rounds.` },
  { id: 'sunroof', name: 'Sunroof', emoji: '🌤️', cost: 3, page: 'garage', desc: 'Far bigger ride bonus, +20% damage aboard.' },
  { id: 'gunner', name: 'Mounted Gunner', emoji: '🎖️', cost: 3, page: 'garage', desc: `+${GUNNER_AMMO} rounds in your gun while riding.` },
  { id: 'robo', name: 'Robo-Gunner', emoji: '🤖', cost: 3, page: 'garage', desc: '3 shots a second, 2 dmg, 200px reach.' },
  { id: 'speedster', name: 'Speedster', emoji: '🏁', cost: 5, page: 'garage', desc: 'Much faster, +10 bounces, burns a fire trail.' },
  { id: 'tank', name: 'Tank', emoji: '🚜', cost: 7, page: 'garage', desc: 'Slow, +5 bounces, huge ram, 15 dmg shell every 3s.' },
];

const CATALOGUE: Record<Page, ShopEntry[]> = { shop: GENERAL, arms: ARMS, mods: MODS, garage: GARAGE };
const ENTRY_BY_ID = new Map<string, ShopEntry>(
  [...GENERAL, ...ARMS, ...MODS, ...GARAGE].map((e) => [e.id, e]),
);
/** Everything the "buy one of everything" mastery requirement counts. The garage is not stock. */
const CATALOGUE_SIZE = GENERAL.length + ARMS.length + MODS.length;

// ── The battle pass ──────────────────────────────────────────────────────────

/**
 * A running total of everything the pass has handed over.
 *
 * One record rather than a list of flags because every buff on the ladder can be rolled twice —
 * the pass is randomised, nothing is unique, and two Filed Triggers should genuinely be two
 * Filed Triggers.
 */
interface Boons {
  /** Multiplier on everything a gun does. */
  damage: number;
  /** Multiplier on how fast the action cycles. Higher is faster. */
  rate: number;
  /** Multiplier on reload time. Lower is faster. */
  reload: number;
  mag: number;
  speed: number;
  /** Multiplier on the coin rate — the passive mints this many times as fast. */
  coin: number;
  /** Added to the bank's 10%. */
  interest: number;
  /** Multiplier on the 10-second settlement drum. Lower settles sooner. */
  settle: number;
  /** Coins handed over every time a magazine comes back. */
  scavenge: number;
  pierce: boolean;
}

function makeBoons(): Boons {
  return {
    damage: 1, rate: 1, reload: 1, mag: 0, speed: 1, coin: 1,
    interest: 0, settle: 1, scavenge: 0, pierce: false,
  };
}

interface PassBuff {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** Folded into the running totals. */
  boon?: (b: Boons) => void;
  /** Anything that has to happen to a body rather than to a number. */
  instant?: 'hp' | 'plate';
}

const PASS_BUFFS: PassBuff[] = [
  { id: 'hollowtips', name: 'Hollowed Tips', emoji: '🔩', desc: '+12% weapon damage', boon: (b) => { b.damage *= 1.12; } },
  { id: 'trigger', name: 'Filed Trigger', emoji: '⚡', desc: '+10% fire rate', boon: (b) => { b.rate *= 1.10; } },
  { id: 'sling', name: 'Speed Sling', emoji: '🎽', desc: '−12% reload time', boon: (b) => { b.reload *= 0.88; } },
  { id: 'pockets', name: 'Deep Pockets', emoji: '📦', desc: '+2 magazine', boon: (b) => { b.mag += 2; } },
  { id: 'boots', name: 'Good Boots', emoji: '👟', desc: '+6% movement speed', boon: (b) => { b.speed *= 1.06; } },
  { id: 'mint', name: 'Private Mint', emoji: '🪙', desc: '+10% coin rate', boon: (b) => { b.coin *= 1.10; } },
  { id: 'dividend', name: 'Dividend', emoji: '💹', desc: '+3% capital gains', boon: (b) => { b.interest += 0.03; } },
  { id: 'quarterly', name: 'Quarterly Results', emoji: '⏱️', desc: 'Investments settle 15% sooner', boon: (b) => { b.settle *= 0.85; } },
  { id: 'scavenger', name: 'Scavenger', emoji: '♻️', desc: '+1 coin every reload', boon: (b) => { b.scavenge += 1; } },
  { id: 'tracer', name: 'Tracer Rounds', emoji: '🎯', desc: 'Your bullets pierce', boon: (b) => { b.pierce = true; } },
  { id: 'vitamins', name: 'Vitamins', emoji: '💊', desc: `+${PASS_HP} maximum health`, instant: 'hp' },
  { id: 'plating', name: 'Cheap Plating', emoji: '🦺', desc: `+${PASS_PLATE} shield HP`, instant: 'plate' },
];

/** The public-shelf items that have a stronger version behind the fifth tier of the pass. */
const PLUS_ITEMS = ['bandages', 'pepper', 'pouch', 'cureall', 'daggers', 'roomba', 'miracle'];

const PLUS_DESC: Record<string, string> = {
  bandages: 'Heal 55 HP.',
  pepper: 'A hotter fire trail, for 12.5s.',
  pouch: '12 hits, and the blast catches the body you hit too.',
  cureall: 'Cleanse, heal 120, no new debuffs for 45s.',
  daggers: '5 volleys of 12 daggers, 6 dmg each.',
  roomba: 'A 45-damage machine, and it ignores the cap of 3.',
  miracle: 'Double every good thing for 45s.',
};

interface PassReward {
  kind: 'buff' | 'item' | 'plus';
  /** Buff id, or the shop entry id for an item and an item⁺. */
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

interface GunDef {
  damage: number;
  mag: number;
  reloadMs: number;
  /** Minimum gap between trigger pulls. */
  fireMs: number;
  speed: number;
  size: number;
  burst?: number;
  hitscan?: boolean;
  /** Golden pistol: the purse is the damage stat. */
  coinScaled?: boolean;
  sfx: string;
  rate: number;
  /** Bullets that ricochet rather than die on the wall, and how many times. */
  bounces?: number;
  /** A shell rather than a bullet: it flies slowly and bursts where it lands. */
  lobbed?: boolean;
  /** One line for the alt-fire, shown on the counter under the loadout. */
  alt?: string;
}

const GUNS: Record<string, GunDef> = {
  pistol:   { damage: 10, mag: 10, reloadMs: 1150, fireMs: 190, speed: 900, size: 5, sfx: 'musket', rate: 1.55, alt: 'dump the magazine' },
  revolver: { damage: 20, mag: 6, reloadMs: 1500, fireMs: 380, speed: 880, size: 6, sfx: 'musket', rate: 1.15, alt: 'hold to spin up' },
  rifle:    { damage: 30, mag: 1, reloadMs: 1250, fireMs: 420, speed: 1120, size: 7, sfx: 'shotgun', rate: 0.85 },
  ar:       { damage: 8, mag: 30, reloadMs: 1700, fireMs: 340, speed: 980, size: 4.4, burst: 3, sfx: 'musket', rate: 1.9, alt: 'throw the clip' },
  golden:   { damage: 20, mag: 10, reloadMs: 1400, fireMs: 300, speed: 0, size: 5, hitscan: true, sfx: 'light-beam', rate: 1.2, alt: 'Midas round' },
  launcher: { damage: GRENADE_DAMAGE, mag: 3, reloadMs: 2700, fireMs: 700, speed: 380, size: 7, lobbed: true, sfx: 'shotgun', rate: 0.6, alt: 'drop them all and leave' },
  bouncy:   { damage: 10, mag: 8, reloadMs: 1300, fireMs: 260, speed: 700, size: 5, bounces: BOUNCE_MAX, sfx: 'musket', rate: 1.8, alt: 'heavy laser' },
};

// ── World objects ────────────────────────────────────────────────────────────

/** What a bullet is, beyond a slug of lead. Everything the alt-fires add is a flag on this. */
type BulletKind = 'slug' | 'grenade' | 'clip' | 'laser' | 'midas';

interface Bullet {
  owner: Owner;
  kind: BulletKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: boolean;
  silencer: boolean;
  size: number;
  seed: number;
  diesAt: number;
  hit: Set<Fighter>;
  reg: RegisteredProjectile | null;
  /** Wall bounces left. Zero is the ordinary bullet, which dies on the edge of the arena. */
  bounces: number;
  /** Blast radius for the ones that burst rather than land. */
  blast: number;
  /** The AR's thrown clip: how many rounds are folded up inside it. */
  rounds: number;
  /** Where a lobbed shell is trying to land — it bursts there whether or not it hit anybody. */
  toX: number;
  toY: number;
  spin: number;
}

/** A Heal Pylon standing on the floor. The light on it is the cooldown. */
interface Pylon {
  owner: Owner;
  x: number;
  y: number;
  readyAt: number;
  seed: number;
}

/** The revenue service, once a Paywall has collected enough to be worth investigating. */
interface Audit {
  owner: Owner;
  target: Fighter;
  x: number;
  firesAt: number;
  /** Non-zero for a few frames after the shot, purely so the muzzle flash can be drawn. */
  flash: number;
  /** True once the rifle has gone off; he stays on screen for as long as the flash lasts. */
  done: boolean;
}

interface Dagger {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  damage: number;
  diesAt: number;
  hit: Set<Fighter>;
}

/** One scheduled volley of Ornate Daggers still to be thrown. */
interface Volley {
  owner: Owner;
  at: number;
  ang: number;
  /** Thrown off an Ornate Daggers⁺: twelve blades at six rather than eight at two. */
  plus: boolean;
}

interface Flame {
  owner: Owner;
  x: number;
  y: number;
  seed: number;
  bornAt: number;
  diesAt: number;
  /** Multiplier on the patch's damage. A Spicy Pepper⁺ burns hotter than the one on the shelf. */
  power: number;
}

interface Roomba {
  owner: Owner;
  x: number;
  y: number;
  ang: number;
  spin: number;
  plus: boolean;
  gate: Map<Fighter, number>;
}

/**
 * Drive by Flex. A rusted saloon that does not steer — it goes forward, comes off the walls like
 * a DVD logo, and explodes when it runs out of bounces.
 */
interface Car {
  owner: Owner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
  /** What it started with, so the ability card can show how much car is left. */
  maxBounces: number;
  rider: boolean;
  gate: Map<Fighter, number>;
  nextRoboAt: number;
  nextShellAt: number;
  trailAt: number;
  /** Where the roof gun is pointing, which is not where the car is going. */
  turret: number;
  seed: number;
}

interface Wall {
  owner: Owner;
  x: number;
  diesAt: number;
  span: number;
  seed: number;
  /** Shots already charged, so a slow bullet is not billed every frame it is inside the band. */
  tolledShots: Set<object>;
  /**
   * Which side of the line each shot was on last frame. A band the width of the turnstiles is
   * narrower than a fast projectile's step, so presence in it is not a reliable test — the
   * crossing is. Keyed on the projectile object, cleared when it is billed.
   */
  shotSide: Map<object, number>;
  /** Which side of the line each body was on last frame. */
  sideOf: Map<Fighter, number>;
  /** Recent payments, for the turnstile slots to light up. */
  flash: number;
  /** Coins actually collected through this wall — the trigger for the audit. */
  take: number;
  /** True once the auditor has been called out for this wall, so he is only called once. */
  audited: boolean;
}

interface Beam {
  owner: Owner;
  ang: number;
  endsAt: number;
  /** Per-victim tick accumulator, so damage is dealt in readable chunks rather than per frame. */
  tick: number;
  /** Coins this cast has burned. Golden Excess reads everything off it. */
  spent: number;
}

/** A push that has to survive the movement code, so it is applied as displacement in `update`. */
interface Shove {
  vx: number;
  vy: number;
  until: number;
}

/**
 * One weapon in one hand.
 *
 * There is normally exactly one of these. Dual Grip is the reason it is a record rather than a
 * handful of fields on `Side`: the second gun has to hold its own magazine, its own reload and
 * its own burst, and the alternative was writing every one of them twice.
 */
interface Hand {
  gun: string | null;
  ammo: number;
  reloadUntil: number;
  nextShotAt: number;
  burstLeft: number;
  burstAt: number;
  burstAng: number;
  /** Angular error added to each shot of the burst. The pistol dump is the wide one. */
  burstSpread: number;
  burstGap: number;
  /** Whether the burst in progress is an alt-fire, so the grips price it correctly. */
  burstAlt: boolean;
  /**
   * How long the reload in progress was actually going to take. The card counts *this* rather
   * than the gun's own figure, because a Speed Sling and a car roof both shorten it.
   */
  reloadSpan: number;
}

function makeHand(gun: string | null): Hand {
  return {
    gun,
    ammo: gun ? GUNS[gun].mag : 0,
    reloadUntil: 0, nextShotAt: 0,
    burstLeft: 0, burstAt: 0, burstAng: 0, burstSpread: 0.07, burstGap: 70, burstAlt: false,
    reloadSpan: 1,
  };
}

interface Side {
  owner: Owner;
  coins: number;
  /** Damage dealt that has not yet added up to a whole coin. */
  coinFrac: number;
  bank: number;
  bankTimer: number;
  stocks: number;
  stockTimer: number;
  stockDealt: number;
  stockTaken: number;

  main: Hand;
  /** Dual Grip's second gun, once one has been bought for it. */
  off: Hand | null;
  /** Dual Grip bought, waiting for a gun to hand the right trigger to. */
  dualPending: boolean;
  attachments: string[];
  lastShotAt: number;
  /** The revolver's alt-fire: when the right button went down, or 0 while it is not held. */
  spinFrom: number;

  /**
   * The body a lingering item was actually bought for. In Invasion the "npc side" is a whole
   * wave, so re-asking `buyerFor` every frame would walk a fire trail between husks — the
   * purchase pins it to whoever swallowed the pepper.
   */
  effectBody: Fighter | null;
  pepperUntil: number;
  pepperDrop: number;
  /** How hot the trail currently is. 1 off the shelf, more off a Spicy Pepper⁺. */
  pepperPower: number;
  pouch: number;
  pouchGate: number;
  /** An Explosives Pouch⁺ does not spare the body it went off on. */
  pouchPlus: boolean;
  cureUntil: number;
  miracleUntil: number;
  miracleSnap: Map<string, number>;
  /** Safe Marketing's three lines. */
  chillyUntil: number;
  chillyNext: number;
  teleUntil: number;

  wall: Wall | null;
  beam: Beam | null;
  shove: Shove | null;
  audit: Audit | null;
  /** Grenade Launcher alt: off the floor, invisible and untouchable, until this stamp. */
  airborneUntil: number;
  /** Damage the beam has dealt that the passive must not be paid for. */
  unpaid: Map<Fighter, number>;
  /** Gate on paying a toll in blood, so one burst weapon cannot be billed to death. */
  bloodGate: number;

  page: Page;
  aimX: number;
  aimY: number;
  botBuyAt: number;
  /** Lifetime spend, purely so the stall's coin stack has something to shrink about. */
  spent: number;

  // ── Mastery ──
  /** Everything the battle pass has handed over so far, as one set of running totals. */
  boons: Boons;
  /** This match's ladder. Empty until it is rolled, which happens lazily on the first frame. */
  pass: PassReward[];
  /** How many tiers have been bought. The next reward is always `pass[passBought]`. */
  passBought: number;
  carBuffs: string[];
  car: Car | null;
  carCastAt: number;
}

function makeSide(owner: Owner): Side {
  return {
    owner, coins: 0, coinFrac: 0, bank: 0, bankTimer: 0, stocks: 0, stockTimer: 0,
    stockDealt: 0, stockTaken: 0,
    main: makeHand('pistol'), off: null, dualPending: false, attachments: [], lastShotAt: 0,
    spinFrom: 0,
    effectBody: null, pepperUntil: 0, pepperDrop: 0, pepperPower: 1, pouch: 0, pouchGate: 0,
    pouchPlus: false, cureUntil: 0,
    miracleUntil: 0, miracleSnap: new Map(),
    chillyUntil: 0, chillyNext: 0, teleUntil: 0,
    wall: null, beam: null, shove: null, audit: null, airborneUntil: 0,
    unpaid: new Map(), bloodGate: 0,
    page: 'shop', aimX: 0, aimY: 0, botBuyAt: 0, spent: 0,
    // The first match runs the constructor rather than `reset`, and readiness is measured off
    // absolute scene time — so a zero here would lock the car for the first 24 seconds.
    boons: makeBoons(), pass: [], passBought: 0, carBuffs: [], car: null,
    carCastAt: -CAR_COOLDOWN_MS,
  };
}

// ── Arena API ────────────────────────────────────────────────────────────────

export interface FortuneArenaApi {
  get scene(): Phaser.Scene;
  get player(): Fighter;
  get npc(): Fighter;
  /** Everything the player is allowed to hurt — husks in Invasion, the npc in a plain 1v1. */
  get enemies(): Fighter[];
  /** The shared physics group. The Paywall has to be able to bill every shot in the game. */
  get projectiles(): Phaser.Physics.Arcade.Group;
  /** ...and the other half of them, which never join a group. */
  get projectileRegistry(): ProjectileRegistry;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  /** Mounting the car is a Space press, and it has to be taken *before* the dodge sees it. */
  get spaceKey(): Phaser.Input.Keyboard.Key;
  get pointerWasDown(): boolean;
  /** Alt-fire lives on the right button, and every alt-fire is edge-triggered off this. */
  get rightPointerWasDown(): boolean;
  get elementId(): string;
  get npcElementId(): string;
  get width(): number;
  get height(): number;
  get isInvasion(): boolean;
  /** Skins: maps a Fortune visual colour through that side's equipped skin. */
  fortuneColor(owner: Owner, base: number): number;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  getNearestEnemy(x: number, y: number): Fighter | null;
  buildPlayerContext(x: number, y: number): CastContext;
  setStatusIndicator(id: string, status: CustomStatus | null): void;
  get masteryActive(): boolean;
  get npcMasteryActive(): boolean;
  /** Which mastery enhancement each side dropped over an E/R/F/Q slot, or null. */
  masteryBindFor(slot: string): string | null;
  npcMasteryBindFor(slot: string): string | null;
  /** Mastery progress. Gated on the element by the adapter, so the kit records unconditionally. */
  recordMasteryStat(key: string, amount: number): void;
  /** …and the two the "one of everything" requirement needs, which has to read itself back. */
  getMasteryStat(key: string): number;
  recordMasteryBestStat(key: string, value: number): void;
  /** The car is cast off a private timer, so online it needs a message of its own. */
  broadcastMasteryCast(enhId: string): void;
  /** Shop upgrades: the local player's equipped slots. */
  hasUpgrade(slot: string): boolean;
  /** …and the online opponent's, so their upgraded tricks reproduce on this sim. */
  hasNpcUpgrade(slot: string): boolean;
}

// ── FortuneKit ───────────────────────────────────────────────────────────────

export class FortuneKit {
  private api: FortuneArenaApi;

  // ── Visuals ──
  private readonly pcol: FortuneColorFn;
  private readonly ncol: FortuneColorFn;
  private readonly pfx: FortuneFx;
  private readonly nfx: FortuneFx;
  private playerAvatar: FortuneAvatar | null = null;
  private npcAvatar: FortuneAvatar | null = null;
  /** The stall, the paywall footings and the fire trail — under the fighters. */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  /** Bullets, daggers, roombas, turnstile heads and the beam — over them. */
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** The counter panel. Its own layer so the shop can sit over everything in the arena. */
  private shopGfx: Phaser.GameObjects.Graphics | null = null;
  private shopTexts: Phaser.GameObjects.Text[] = [];
  /** Last colour pushed to each row. `setColor` re-renders the texture, so it is guarded. */
  private shopColors: string[] = [];
  /** The battle pass ribbon across the top of the screen. Its own layer, above everything. */
  private passGfx: Phaser.GameObjects.Graphics | null = null;
  private passTexts: Phaser.GameObjects.Text[] = [];
  /** Last style pushed to each ribbon row, guarded for the same reason `shopColors` is. */
  private passColors: string[] = [];
  private vizT = 0;

  // ── Sim ──
  private sides: Record<Owner, Side> = { player: makeSide('player'), npc: makeSide('npc') };
  private bullets: Bullet[] = [];
  private daggers: Dagger[] = [];
  private volleys: Volley[] = [];
  private flames: Flame[] = [];
  private roombas: Roomba[] = [];
  private pylons: Pylon[] = [];
  /** Last seen `rawDamageTaken` per body — the only meter the whole economy runs off. */
  private rawSeen = new Map<Fighter, number>();
  /** Bodies whose debuffs this kit is holding down for a Cure-All. */
  private cured = new Set<Fighter>();
  /** Bodies the Midas round has gilded, and until when. Every coin off them is worth double. */
  private gilded = new Map<Fighter, number>();
  /** Bodies this kit is slowing — the Chilly Pepper's ring and the auditor's rifle. */
  private chilled = new Map<Fighter, { until: number; mult: number }>();
  /** Bodies carrying the auditor's vulnerability, so `fortuneIncomingMult` can be rewritten. */
  private audited = new Map<Fighter, number>();

  // ── Input ──
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];
  private tabKey: Phaser.Input.Keyboard.Key | null = null;
  private passKey: Phaser.Input.Keyboard.Key | null = null;
  private eDownAt = 0;
  private rDownAt = 0;
  private eHeldDone = false;
  private rHeldDone = false;
  private ePrev = false;
  private rPrev = false;
  /**
   * Space's own rising edge. `JustDown` is only called once this has already decided the press
   * belongs to the car — calling it to *ask* would consume the flag and eat the dodge.
   */
  private spacePrev = false;
  /** Whether the free pistol has been credited against the "buy one of everything" grind. */
  private startNoted = false;

  constructor(api: FortuneArenaApi) {
    this.api = api;
    this.pcol = (base) => api.fortuneColor('player', base);
    this.ncol = (base) => api.fortuneColor('npc', base);
    this.pfx = new FortuneFx(api.scene, this.pcol);
    this.nfx = new FortuneFx(api.scene, this.ncol);
    this.setupKeys();
  }

  /** Idempotent — `addKey` hands back the existing Key when one is still registered. */
  private setupKeys(): void {
    const kb = this.api.scene.input.keyboard;
    if (!kb) return;
    // Eleven rows is what a fully stocked general page comes to, so the row keys run past the
    // number row's end. The glyphs in ROW_KEYS are what the counter prints against each line.
    const codes = [
      Phaser.Input.Keyboard.KeyCodes.ONE, Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE, Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE, Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN, Phaser.Input.Keyboard.KeyCodes.EIGHT,
      Phaser.Input.Keyboard.KeyCodes.NINE, Phaser.Input.Keyboard.KeyCodes.ZERO,
      Phaser.Input.Keyboard.KeyCodes.MINUS,
    ];
    this.numberKeys = codes.map((c) => kb.addKey(c));
    this.tabKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    // The pass is not the shop, so it is not on the counter's keys and does not need the counter.
    this.passKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.B);
  }

  // ── Small helpers ──────────────────────────────────────────────────────────

  private get now(): number { return this.api.scene.time.now; }
  private side(owner: Owner): Side { return this.sides[owner]; }
  private fighter(owner: Owner): Fighter { return owner === 'player' ? this.api.player : this.api.npc; }
  private fx(owner: Owner): FortuneFx { return owner === 'player' ? this.pfx : this.nfx; }
  private col(owner: Owner): FortuneColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  private other(owner: Owner): Owner { return owner === 'player' ? 'npc' : 'player'; }
  private body(f: Fighter): Phaser.Physics.Arcade.Body { return f.body as Phaser.Physics.Arcade.Body; }

  private get left(): number { return ARENA_PAD; }
  private get right(): number { return this.api.width - ARENA_PAD; }
  private get top(): number { return ARENA_PAD; }
  private get bottom(): number { return this.api.height - ARENA_PAD; }

  private hex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  private alive(f: Fighter | null | undefined): boolean {
    return !!f && f.active && f.hp > 0;
  }

  private isFortune(owner: Owner): boolean {
    return owner === 'player' ? this.api.elementId === 'fortune' : this.api.npcElementId === 'fortune';
  }

  /**
   * Whether that side has paid for a shop upgrade. The npc branch is the online opponent's
   * loadout — a local bot never owns one, which is why every upgraded path is written to be
   * harmless rather than absent when it says no.
   */
  private owns(owner: Owner, slot: string): boolean {
    return owner === 'player' ? this.api.hasUpgrade(slot) : this.api.hasNpcUpgrade(slot);
  }

  /** Whether that side is playing a mastered Fortune. */
  private masteryOn(owner: Owner): boolean {
    return this.isFortune(owner)
      && (owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
  }

  /** Which slot Drive by Flex was dropped over, or null. Any of the four is a legal target. */
  private carSlot(owner: Owner): 'e' | 'r' | 'f' | 'q' | null {
    if (!this.masteryOn(owner)) return null;
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      const bind = owner === 'player' ? this.api.masteryBindFor(s) : this.api.npcMasteryBindFor(s);
      if (bind === CAR_ID) return s;
    }
    return null;
  }

  /**
   * Mastery progress. Only ever the player's — the grind is the human's — and deliberately not
   * gated on the mastery being switched on, since earning it is the whole point.
   */
  private record(owner: Owner, key: string, amount = 1): void {
    if (owner === 'player') this.api.recordMasteryStat(key, amount);
  }

  /**
   * What is actually on the shelf. The stock is the shopkeeper's — an enemy at a counter that
   * sells Tele-Cores can buy one, and pays the shopkeeper half of it for the privilege.
   *
   * The GARAGE is the exception: it is a workshop rather than stock, and it does not exist at
   * all unless the shopkeeper is playing a mastered Fortune.
   */
  private catalogue(page: Page): ShopEntry[] {
    const shop = this.shopOwner;
    if (page === 'garage' && !(shop && this.masteryOn(shop))) return [];
    return CATALOGUE[page].filter((e) => !e.needs || (!!shop && this.owns(shop, e.needs)));
  }

  /** The tabs the counter will actually cycle through, which is three until the car exists. */
  private pagesFor(shop: Owner): Page[] {
    return this.masteryOn(shop) ? PAGES : PAGES.filter((p) => p !== 'garage');
  }

  /** Which side, if any, owns the stall. There is only ever one shop in an arena. */
  private get shopOwner(): Owner | null {
    if (this.isFortune('player')) return 'player';
    if (this.isFortune('npc')) return 'npc';
    return null;
  }

  private avatar(owner: Owner): FortuneAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }

  private targetsOf(owner: Owner): Fighter[] {
    const list = owner === 'player' ? this.api.enemies : [this.api.player];
    return list.filter((f) => this.alive(f));
  }

  /**
   * Which side gets paid for hurting `victim`.
   *
   * The player is always the npc side's to bleed, and everything in `enemies` is the player's.
   * The npc slot is the one that changes meaning: in Invasion it is a co-op ally, so a husk
   * chewing on it still pays the husks — but in a plain 1v1 it *is* the enemy, and reading it
   * as an ally there paid the player's own hits to the opponent.
   */
  private creditFor(victim: Fighter): Owner {
    if (victim === this.api.player) return 'npc';
    if (victim === this.api.npc) return this.api.isInvasion ? 'npc' : 'player';
    return 'player';
  }

  /** The body that receives an item bought by `owner`. In Invasion the buyers are the husks. */
  private buyerFor(owner: Owner): Fighter | null {
    if (owner === 'player') return this.alive(this.api.player) ? this.api.player : null;
    if (this.api.isInvasion) {
      let best: Fighter | null = null;
      for (const f of this.api.enemies) if (this.alive(f) && (!best || f.hp > best.hp)) best = f;
      return best;
    }
    return this.alive(this.api.npc) ? this.api.npc : null;
  }

  /** Centre of the stall. Middle of the screen, nudged up so the counter is not under the feet. */
  private get stallX(): number { return this.api.width / 2; }
  private get stallY(): number { return this.api.height / 2 - 12; }

  private distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 <= 0 ? 0 : Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  reset(): void {
    // Phaser's KeyboardPlugin destroys every Key in `shutdown()`, so the ones the constructor
    // registered are corpses from the second match on — the counter has to re-claim them here.
    this.setupKeys();
    // A match that ended mid-flight left somebody invisible and untouchable. Hand that back
    // before the sides are thrown away, because the sides are what remember it happened.
    for (const owner of BOTH) {
      if (this.sides[owner].airborneUntil <= 0) continue;
      const f = this.fighter(owner);
      if (f?.active) { f.isInvincible = false; f.setAlpha(1); }
    }
    this.sides = { player: makeSide('player'), npc: makeSide('npc') };
    this.bullets = [];
    this.daggers = [];
    this.volleys = [];
    this.flames = [];
    this.roombas = [];
    this.pylons = [];
    this.rawSeen.clear();
    this.cured.clear();
    this.gilded.clear();
    this.releaseChills();
    this.audited.clear();
    this.vizT = 0;
    this.eDownAt = 0;
    this.rDownAt = 0;
    this.eHeldDone = false;
    this.rHeldDone = false;
    this.ePrev = false;
    this.rPrev = false;
    this.spacePrev = false;
    this.startNoted = false;

    this.playerAvatar?.destroy(); this.playerAvatar = null;
    this.npcAvatar?.destroy(); this.npcAvatar = null;
    this.groundGfx?.destroy(); this.groundGfx = null;
    this.airGfx?.destroy(); this.airGfx = null;
    this.shopGfx?.destroy(); this.shopGfx = null;
    for (const t of this.shopTexts) t.destroy();
    this.shopTexts = [];
    this.shopColors = [];
    this.passGfx?.destroy(); this.passGfx = null;
    for (const t of this.passTexts) t.destroy();
    this.passTexts = [];
    this.passColors = [];
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Runs whenever a shop exists, not only when the player is Fortune — an enemy of a Fortune
   * npc is still a customer, and the number keys are how they pay.
   */
  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    void time;
    const shop = this.shopOwner;
    if (!shop) return;

    const s = this.sides.player;
    s.aimX = mouseX;
    s.aimY = mouseY;

    const p = this.api.player;
    if (!this.alive(p)) return;

    this.handleShopInput(shop);
    if (!this.isFortune('player')) return;

    const ctx = this.api.buildPlayerContext(mouseX, mouseY);
    // Held-trigger fire, but only when the gun is actually ready: `castAbility` is what plays an
    // ability's voice line, so asking it 60 times a second through a reload would be a machine
    // gun made of UI noise.
    if (pointer.isDown && this.canFireNow('player')) p.castAbility('fortune-fire', ctx);
    this.handleRightHand(pointer, mouseX, mouseY);

    // ── Mastery ──
    // The pass is bought from anywhere, and Space is the car's — but only when the car is
    // actually within reach, or the dodge would be eaten by an ability nobody is next to.
    if (this.masteryOn('player')) {
      if (this.passKey && Phaser.Input.Keyboard.JustDown(this.passKey)) this.buyPassTier('player');
      this.handleRideInput();
    }

    const car = this.carSlot('player');
    if (Phaser.Input.Keyboard.JustDown(this.api.fKey)) {
      if (car === 'f') this.tryCar('player', mouseX, mouseY);
      else p.castAbility('fortune-paywall', ctx);
    }
    if (Phaser.Input.Keyboard.JustDown(this.api.qKey)) {
      if (car === 'q') this.tryCar('player', mouseX, mouseY);
      else p.castAbility('fortune-p2w', ctx);
    }

    // ── E and R are tap-to-deposit, hold-to-withdraw ──
    // The tap has to resolve on *release*, because until the key comes back up there is no way
    // to know it was not a hold — so `castAbility` is deliberately not on JustDown here. A slot
    // the car is sitting on loses the tap-and-hold entirely and becomes an ordinary key.
    if (car === 'e') {
      if (Phaser.Input.Keyboard.JustDown(this.api.eKey)) this.tryCar('player', mouseX, mouseY);
    } else {
      this.investKey(this.api.eKey, 'e', ctx);
    }
    if (car === 'r') {
      if (Phaser.Input.Keyboard.JustDown(this.api.rKey)) this.tryCar('player', mouseX, mouseY);
    } else {
      this.investKey(this.api.rKey, 'r', ctx);
    }
  }

  /**
   * Space, while a car of yours is out.
   *
   * Phaser's `JustDown` *consumes* the flag, and ArenaScene's dodge reads the same key a few
   * hundred lines later — so the rising edge is tracked here by hand and `JustDown` is only
   * called once this has already decided the press belongs to the car. Anywhere else, Space is
   * still the dodge.
   */
  private handleRideInput(): void {
    const key = this.api.spaceKey;
    const s = this.sides.player;
    const p = this.api.player;
    const down = key.isDown;
    const rising = down && !this.spacePrev;
    this.spacePrev = down;
    if (!rising) return;

    const car = s.car;
    if (!car) return;
    if (car.rider) {
      Phaser.Input.Keyboard.JustDown(key);
      this.dismount('player');
      return;
    }
    if (Phaser.Math.Distance.Between(p.x, p.y, car.x, car.y) > CAR_MOUNT_R) return;
    Phaser.Input.Keyboard.JustDown(key);
    this.mount('player');
  }

  /**
   * The right button.
   *
   * With Dual Grip and a second gun bought for it, the right hand is simply a second trigger and
   * everything below about alt-fire is bypassed. Otherwise, with Alt-Fire owned, it is the
   * current gun's second trigger — and for the revolver that trigger is held rather than tapped,
   * which is why the spin-up is tracked here rather than inside the fire path.
   */
  private handleRightHand(pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    const s = this.sides.player;
    const down = pointer.rightButtonDown();
    const justDown = down && !this.api.rightPointerWasDown;

    // A revolver swapped out mid-spin leaves the wind-up hanging, so the clock is cleared by
    // anything that is not the revolver's own branch below.
    if (s.off || s.main.gun !== 'revolver') s.spinFrom = 0;

    if (s.off) {
      // Priced as an alt-fire: the grips are sold as "right click attacks", and with Dual Grip
      // fitted the right button is this gun rather than an alt-fire.
      if (down && this.canFireHand('player', s.off)) this.fireHand('player', s.off, mouseX, mouseY, true);
      return;
    }
    if (!this.owns('player', 'click')) return;

    // The revolver is a hold. Wind it up while the button is down, fire it on the release.
    if (s.main.gun === 'revolver') {
      if (justDown && this.canFireHand('player', s.main)) s.spinFrom = this.now;
      if (!down && s.spinFrom > 0) {
        const held = this.now - s.spinFrom;
        s.spinFrom = 0;
        this.fireSpunRound('player', held, mouseX, mouseY);
      }
      return;
    }
    if (justDown) this.doAltFire('player', mouseX, mouseY);
  }

  private investKey(key: Phaser.Input.Keyboard.Key, which: 'e' | 'r', ctx: CastContext): void {
    const HOLD_MS = 340;
    const down = key.isDown;
    const prev = which === 'e' ? this.ePrev : this.rPrev;
    const p = this.api.player;

    if (down && !prev) {
      if (which === 'e') { this.eDownAt = this.now; this.eHeldDone = false; }
      else { this.rDownAt = this.now; this.rHeldDone = false; }
    }
    const downAt = which === 'e' ? this.eDownAt : this.rDownAt;
    const done = which === 'e' ? this.eHeldDone : this.rHeldDone;

    if (down && !done && this.now - downAt >= HOLD_MS) {
      if (which === 'e') this.eHeldDone = true; else this.rHeldDone = true;
      this.withdraw('player', which === 'e' ? 'bank' : 'stocks');
    }
    if (!down && prev && !done) {
      p.castAbility(which === 'e' ? 'fortune-safe' : 'fortune-risky', ctx);
    }
    if (which === 'e') this.ePrev = down; else this.rPrev = down;
  }

  /** Number keys buy; T changes tab, but only for the person who owns the stall. */
  private handleShopInput(shop: Owner): void {
    const p = this.api.player;
    const s = this.sides.player;
    const mine = shop === 'player';
    if (!mine) s.page = 'shop';

    if (Phaser.Math.Distance.Between(p.x, p.y, this.stallX, this.stallY) > SHOP_RANGE) return;

    if (mine && this.tabKey && Phaser.Input.Keyboard.JustDown(this.tabKey)) {
      const pages = this.pagesFor(shop);
      const at = pages.indexOf(s.page);
      s.page = pages[(at + 1) % pages.length];
      Sfx.playAt('ui-tab', p.x, { volume: 0.6 });
    }

    const list = this.catalogue(s.page);
    for (let i = 0; i < this.numberKeys.length && i < list.length; i++) {
      if (!Phaser.Input.Keyboard.JustDown(this.numberKeys[i])) continue;
      this.buy('player', list[i]);
    }
  }

  // ── Ability entry points (called from build*Context) ───────────────────────

  /**
   * Click — fire whatever is in the hand.
   *
   * The ability's own cooldown is deliberately shorter than any gun's cycle: the *gun* is the
   * rate limiter, and refusing here refunds the cast so a held mouse button doesn't quietly
   * burn the cooldown while the slide is still travelling.
   */
  doFire(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f)) { this.refund(f, 'fortune-fire'); return; }
    const s = this.side(owner);
    s.aimX = tx;
    s.aimY = ty;

    if (!this.canFireHand(owner, s.main)) { this.refund(f, 'fortune-fire'); return; }
    if (s.main.ammo <= 0) { this.beginReload(owner, s.main); this.refund(f, 'fortune-fire'); return; }
    this.fireHand(owner, s.main, tx, ty, false);
  }

  /** One trigger pull from one hand, main or off. */
  private fireHand(owner: Owner, hand: Hand, tx: number, ty: number, alt: boolean): void {
    const f = this.fighter(owner);
    const gun = hand.gun ? GUNS[hand.gun] : null;
    if (!gun || !this.alive(f)) return;
    if (hand.ammo <= 0) { this.beginReload(owner, hand); return; }

    const ang = Math.atan2(ty - f.y, tx - f.x);
    // Priced off what is left once this round has gone, which is what `shoot` will see.
    const s = this.side(owner);
    const accel = this.accelMult(s, hand, hand.ammo - 1) * this.rateMult(s);
    hand.nextShotAt = this.now + gun.fireMs / accel;
    if (gun.burst && gun.burst > 1) {
      hand.burstLeft = Math.min(gun.burst, hand.ammo);
      hand.burstAt = this.now;
      hand.burstAng = ang;
      hand.burstSpread = 0.07;
      // The burst tightens with the trigger, so a nearly-dry AR is one hard three-round bark.
      hand.burstGap = 70 / accel;
      hand.burstAlt = alt;
      return;
    }
    this.shoot(owner, ang, hand, { alt, aimX: tx, aimY: ty });
  }

  /**
   * Whether the base ability on `slot` has been replaced by the mastery car. Checked inside the
   * do-methods rather than only at the key, because the npc reaches them through its context
   * rather than through `handleInput`.
   */
  private carTook(owner: Owner, slot: 'e' | 'r' | 'f' | 'q'): boolean {
    return this.carSlot(owner) === slot;
  }

  /** E — put money in the bank. */
  doSafeInvest(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (this.carTook(owner, 'e')) { this.refund(f, 'fortune-safe'); return; }
    if (s.coins <= 0) {
      this.refund(f, 'fortune-safe');
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 44, '🏦 NOTHING TO DEPOSIT', this.hex(FOR.canvasShade));
      return;
    }
    const amount = Math.min(DEPOSIT, s.coins);
    s.coins -= amount;
    s.bank += amount;
    this.fx(owner).cash(f.x, f.y, 30, 420, 12);
    this.api.showFloatingText(f.x, f.y - 44, `🏦 +${amount} BANKED`, this.hex(FOR.gold));
    Sfx.playAt('money', f.x, { volume: 0.6, rate: 1.15 });
  }

  /** R — put money in the market. */
  doRiskyInvest(owner: Owner): void {
    const f = this.fighter(owner);
    const s = this.side(owner);
    if (this.carTook(owner, 'r')) { this.refund(f, 'fortune-risky'); return; }
    if (s.coins <= 0) {
      this.refund(f, 'fortune-risky');
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 44, '📈 NOTHING TO INVEST', this.hex(FOR.canvasShade));
      return;
    }
    const amount = Math.min(DEPOSIT, s.coins);
    s.coins -= amount;
    s.stocks += amount;
    // Fresh money resets the window it will be judged on, or a deposit made at 9.9 seconds
    // would settle on somebody else's damage.
    s.stockTimer = 0;
    s.stockDealt = 0;
    s.stockTaken = 0;
    this.fx(owner).cash(f.x, f.y, 30, 420, 12);
    this.api.showFloatingText(f.x, f.y - 44, `📈 +${amount} INVESTED`, this.hex(FOR.contraband));
    Sfx.playAt('money', f.x, { volume: 0.6, rate: 0.85 });
  }

  /** F — the turnstiles. */
  doPaywall(owner: Owner, tx: number, ty: number): void {
    void ty;
    const f = this.fighter(owner);
    if (!this.alive(f) || this.carTook(owner, 'f')) { this.refund(f, 'fortune-paywall'); return; }
    const s = this.side(owner);
    const span = WALL_MS * (this.owns(owner, 'f') ? WALL_TAX_MULT : 1);
    s.wall = {
      owner,
      x: Phaser.Math.Clamp(tx, this.left + 24, this.right - 24),
      diesAt: this.now + span,
      span,
      seed: Math.random() * 999,
      tolledShots: new Set(),
      shotSide: new Map(),
      sideOf: new Map(),
      flash: 0,
      take: 0,
      audited: false,
    };
    this.avatar(owner)?.play('slam', Math.atan2(ty - f.y, tx - f.x));
    this.api.showFloatingText(s.wall.x, this.top + 30, '🎫 PAYWALL', this.hex(FOR.gold));
    Sfx.playAt('stone-rise', s.wall.x, { volume: 0.8, rate: 1.2 });
    Sfx.playAt('gear-turn', s.wall.x, { volume: 0.6 });
  }

  /** Q — the golden beam. Refuses outright if the purse cannot pay for a single second of it. */
  doPayToWin(owner: Owner, tx: number, ty: number): void {
    const f = this.fighter(owner);
    if (!this.alive(f) || this.carTook(owner, 'q')) { this.refund(f, 'fortune-p2w'); return; }
    const s = this.side(owner);
    if (s.beam) { this.refund(f, 'fortune-p2w'); return; }
    if (s.coins < BEAM_COINS_PER_SEC) {
      this.refund(f, 'fortune-p2w');
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 46, '💸 INSUFFICIENT FUNDS', this.hex(FOR.blood));
      Sfx.playAt('ui-denied', f.x, { volume: 0.7 });
      return;
    }
    s.beam = { owner, ang: Math.atan2(ty - f.y, tx - f.x), endsAt: this.now + BEAM_MS, tick: 0, spent: 0 };
    this.avatar(owner)?.play('raise', s.beam.ang);
    this.api.showFloatingText(f.x, f.y - 50, '💰 PAY-TO-WIN', this.hex(FOR.goldLit));
    Sfx.playAt('beam-charge', f.x, { volume: 0.9, rate: 0.9 });
  }

  private refund(f: Fighter | null, abilityId: string): void {
    if (f?.active) f.resetCooldown(abilityId);
  }

  /**
   * Whether pulling the trigger right now would produce a bullet. Checked *before* the cast
   * rather than inside it, because a refused cast has already stamped (and voiced) itself.
   */
  canFireNow(owner: Owner): boolean {
    const s = this.side(owner);
    return this.canFireHand(owner, s.main) && s.main.ammo > 0;
  }

  /** Whether that hand could put something downrange right now. Ammo is checked separately. */
  private canFireHand(owner: Owner, hand: Hand): boolean {
    const s = this.side(owner);
    if (s.beam || !hand.gun) return false;
    if (this.now < s.airborneUntil) return false;
    if (this.now < hand.reloadUntil || this.now < hand.nextShotAt) return false;
    return true;
  }

  // ── Guns ───────────────────────────────────────────────────────────────────

  /** Every attachment folded into one set of numbers. */
  private loadout(s: Side, hand: Hand): {
    def: GunDef; damage: number; mag: number; speed: number; pierce: boolean; silencer: boolean; prop: boolean;
  } | null {
    const def = hand.gun ? GUNS[hand.gun] : null;
    if (!def) return null;
    const has = (id: string): boolean => s.attachments.includes(id);
    const riding = this.isRiding(s.owner);
    let damage = def.damage;
    if (has('hollow')) damage += 5;
    if (has('fiftycal')) damage += 10;
    // The battle pass rides on top of the attachments rather than replacing them, and the
    // Sunroof is the only part of the car that touches the gun's numbers.
    damage *= s.boons.damage;
    if (riding && this.hasCar(s, 'sunroof')) damage *= SUNROOF_DAMAGE;
    let mag = def.mag;
    if (has('biggermag')) mag += 3;
    if (has('drummag')) mag += 10;
    mag += s.boons.mag;
    if (riding && this.hasCar(s, 'gunner')) mag += GUNNER_AMMO;
    const scope = has('scope');
    return {
      def,
      damage,
      mag,
      // A thrown shell is not a bullet and a scope does not make it fly twice as fast.
      speed: def.speed * (scope && !def.lobbed ? 2 : 1),
      pierce: (scope || s.boons.pierce) && !def.lobbed,
      silencer: has('silencer'),
      prop: has('prop'),
    };
  }

  /**
   * How fast the action is cycling, over and above Acceleration Gear. The pass's Filed Triggers
   * and the car roof both live here, and both are multipliers on the *rate* rather than
   * subtractions from the gap — so stacking them cannot produce a negative wait.
   */
  private rateMult(s: Side): number {
    let m = s.boons.rate;
    if (this.isRiding(s.owner)) m *= this.hasCar(s, 'sunroof') ? RIDE_RATE_SUNROOF : RIDE_RATE;
    return m;
  }

  /** Multiplier on reload time. Lower is faster, and both sources of it are buys. */
  private reloadMult(s: Side): number {
    let m = s.boons.reload;
    if (this.isRiding(s.owner)) m *= this.hasCar(s, 'sunroof') ? RIDE_RELOAD_SUNROOF : RIDE_RELOAD;
    return m;
  }

  /**
   * The grips. Both triggers are always priced, so a grip is a straight trade rather than a
   * bonus — and with neither fitted this is 1 and costs nothing to ask.
   */
  private gripMult(s: Side, alt: boolean): number {
    let mult = 1;
    if (s.attachments.includes('specgrip')) mult *= alt ? GRIP_SPEC.alt : GRIP_SPEC.main;
    if (s.attachments.includes('basicgrip')) mult *= alt ? GRIP_BASIC.alt : GRIP_BASIC.main;
    return mult;
  }

  private magSize(s: Side, hand: Hand): number { return this.loadout(s, hand)?.mag ?? 0; }

  /**
   * Acceleration Gear. The action cycles faster the emptier the magazine is: 1× on a full one,
   * `ACCEL_MAX`× on the last round in it.
   *
   * `rounds` is what will be left *after* the shot being fired, because what this scales is the
   * wait for the *next* one — a gun that has just spat its last round is cycling flat out, and
   * the reload is what takes the speed away again.
   */
  private accelMult(s: Side, hand: Hand, rounds: number): number {
    if (!s.attachments.includes('accelgear')) return 1;
    const mag = this.magSize(s, hand);
    if (mag <= 0) return 1;
    const empty = 1 - Phaser.Math.Clamp(rounds / mag, 0, 1);
    return 1 + (ACCEL_MAX - 1) * empty;
  }

  private beginReload(owner: Owner, hand: Hand): void {
    const s = this.side(owner);
    const kit = this.loadout(s, hand);
    if (!kit || this.now < hand.reloadUntil) return;
    hand.reloadSpan = Math.max(60, kit.def.reloadMs * this.reloadMult(s));
    hand.reloadUntil = this.now + hand.reloadSpan;
    hand.burstLeft = 0;
    const f = this.fighter(owner);
    if (this.alive(f)) {
      if (hand === s.main) this.avatar(owner)?.setGun(null);
      Sfx.playAt('reload', f.x, { volume: 0.65 });
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 40, '🔄 RELOADING', this.hex(FOR.steel));
    }
  }

  /**
   * One round leaving one hand.
   *
   * `opts.alt` only prices the shot — every alt-fire that behaves differently from a normal one
   * is its own method and never comes through here. `aimX/aimY` matter for the shells, which
   * burst where they were aimed rather than where they run out.
   */
  private shoot(owner: Owner, ang: number, hand: Hand,
    opts: { alt?: boolean; aimX?: number; aimY?: number } = {}): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const kit = this.loadout(s, hand);
    if (!kit || !this.alive(f)) return;

    hand.ammo = Math.max(0, hand.ammo - 1);
    s.lastShotAt = this.now;
    const accel = this.accelMult(s, hand, hand.ammo);
    const av = this.avatar(owner);
    av?.play('punch', ang);
    av?.kick(kit.def.hitscan ? 0.6 : 1);
    const mz = muzzleOf(f.x, f.y, ang, hand.gun ?? 'pistol');
    const fx = this.fx(owner);
    fx.muzzle(mz.x, mz.y, ang, kit.def.hitscan ? 0.8 : 1);
    fx.brass(f.x, f.y - 4, ang);
    // The gear is audible and visible before it is readable: the report pitches up and a cog
    // spins out of the port, both harder the emptier the magazine is.
    if (accel > 1.05) fx.gear(mz.x, mz.y, ang, accel);
    Sfx.playAt(kit.def.sfx, f.x, {
      volume: kit.silencer ? 0.28 : 0.8,
      rate: kit.def.rate * (kit.silencer ? 1.5 : 1) * (1 + (accel - 1) * 0.35),
    });

    // Action Movie Prop: the shot moves the shooter. Applied as displacement in `update`,
    // because ArenaScene rewrites the body's velocity from WASD every frame.
    if (kit.prop) {
      const push = kit.def.hitscan ? 250 : 340;
      s.shove = { vx: -Math.cos(ang) * push, vy: -Math.sin(ang) * push, until: this.now + 260 };
    }

    const damage = kit.damage * this.gripMult(s, !!opts.alt);
    if (kit.def.hitscan) {
      this.hitscan(owner, ang, damage, kit.silencer, kit.pierce);
    } else if (kit.def.lobbed) {
      // A shell is aimed at a point on the floor, not at a direction.
      const range = Math.hypot((opts.aimX ?? f.x + Math.cos(ang) * 260) - f.x,
        (opts.aimY ?? f.y + Math.sin(ang) * 260) - f.y);
      this.addBullet(owner, {
        kind: 'grenade', x: mz.x, y: mz.y, ang, speed: kit.speed, damage,
        size: kit.def.size, silencer: kit.silencer, blast: GRENADE_R, life: GRENADE_LIFE_MS,
        toX: f.x + Math.cos(ang) * range, toY: f.y + Math.sin(ang) * range,
      });
    } else {
      this.addBullet(owner, {
        kind: 'slug', x: mz.x, y: mz.y, ang, speed: kit.speed, damage,
        size: kit.def.size, pierce: kit.pierce, silencer: kit.silencer,
        bounces: kit.def.bounces ?? 0,
      });
    }

    if (hand.ammo <= 0) this.beginReload(owner, hand);
  }

  /** Everything that flies goes on the same list, and everything on that list is registered. */
  private addBullet(owner: Owner, o: {
    kind: BulletKind; x: number; y: number; ang: number; speed: number; damage: number;
    size: number; pierce?: boolean; silencer?: boolean; bounces?: number; blast?: number;
    rounds?: number; life?: number; toX?: number; toY?: number;
  }): Bullet {
    const bullet: Bullet = {
      owner,
      kind: o.kind,
      x: o.x, y: o.y,
      vx: Math.cos(o.ang) * o.speed,
      vy: Math.sin(o.ang) * o.speed,
      damage: o.damage,
      pierce: !!o.pierce,
      silencer: !!o.silencer,
      size: o.size,
      seed: Math.random() * 999,
      diesAt: this.now + (o.life ?? BULLET_LIFE_MS),
      hit: new Set(),
      reg: null,
      bounces: o.bounces ?? 0,
      blast: o.blast ?? 0,
      rounds: o.rounds ?? 0,
      toX: o.toX ?? 0,
      toY: o.toY ?? 0,
      spin: Math.random() * TAU_LOCAL,
    };
    const reg: RegisteredProjectile = {
      owner,
      getX: () => bullet.x,
      getY: () => bullet.y,
      damage: bullet.damage,
      steal: () => {
        const i = this.bullets.indexOf(bullet);
        if (i >= 0) this.bullets.splice(i, 1);
      },
    };
    bullet.reg = reg;
    this.api.projectileRegistry.add(reg);
    this.bullets.push(bullet);
    return bullet;
  }

  /** The Golden Pistol. Instant, and the purse is part of the damage roll. */
  private hitscan(owner: Owner, ang: number, base: number, silencer: boolean, pierce: boolean): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const bonus = Math.floor(s.coins / 2);
    const damage = base + bonus;
    const ex = f.x + Math.cos(ang) * BEAM_LEN;
    const ey = f.y + Math.sin(ang) * BEAM_LEN;

    const fx = this.fx(owner);
    fx.anim(11, 220, (g, t) => {
      const a = (1 - t) * 0.9;
      g.lineStyle(7 * (1 - t) + 1, this.col(owner)(FOR.gold), a * 0.35);
      g.lineBetween(f.x, f.y, ex, ey);
      g.lineStyle(2.6 * (1 - t) + 0.6, this.col(owner)(FOR.hot), a);
      g.lineBetween(f.x, f.y, ex, ey);
    });

    // Nearest first, so a non-piercing laser stops at the body actually in the way.
    const along = this.targetsOf(owner)
      .filter((t) => this.distToSegment(t.x, t.y, f.x, f.y, ex, ey) <= 16 * t.sizeMult + 8)
      .sort((a, b) => Phaser.Math.Distance.Between(f.x, f.y, a.x, a.y)
        - Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y));
    for (const t of along) {
      this.landHit(owner, t, damage, ang, silencer);
      if (!pierce) break;
    }
    if (bonus > 0 && owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 54, `🌟 +${bonus} WEALTH`, this.hex(FOR.goldLit));
    }
  }

  /** One bullet landing on one body: damage, the silencer's gag, and the noise. */
  private landHit(owner: Owner, victim: Fighter, damage: number, ang: number, silencer: boolean): void {
    victim.takeDamage(damage);
    this.fx(owner).impact(victim.x, victim.y, ang);
    this.api.spawnHitFlash(victim.x, victim.y, FOR.gold);
    if (silencer) {
      victim.silencedUntil = Math.max(victim.silencedUntil, Date.now() + 2000);
      this.api.showFloatingText(victim.x, victim.y - 34, '🤫 SILENCED', this.hex(FOR.contraband));
      Sfx.playAt('status-silence', victim.x, { volume: 0.5 });
    }
  }

  // ── Alt-fire (Click+) ──────────────────────────────────────────────────────

  /**
   * The right trigger, for every gun whose second one is a tap. The revolver's is a hold and
   * lives in `fireSpunRound`; the rifle has none at all — it is a single round and there is
   * nothing clever to do with one round.
   */
  private doAltFire(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f) || !this.canFireHand(owner, s.main)) return;
    s.aimX = tx;
    s.aimY = ty;
    switch (s.main.gun) {
      case 'pistol': this.dumpMagazine(owner, tx, ty); break;
      case 'ar': this.throwClip(owner, tx, ty); break;
      case 'golden': this.midasRound(owner, tx, ty); break;
      case 'launcher': this.dropAndLeave(owner); break;
      case 'bouncy': this.heavyLaser(owner, tx, ty); break;
      default: break;
    }
  }

  /** Pistol: the whole magazine, as fast as the slide will cycle, at whatever is over there. */
  private dumpMagazine(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const hand = s.main;
    const f = this.fighter(owner);
    if (hand.ammo <= 0) { this.beginReload(owner, hand); return; }
    hand.burstLeft = hand.ammo;
    hand.burstAt = this.now;
    hand.burstAng = Math.atan2(ty - f.y, tx - f.x);
    hand.burstSpread = DUMP_SPREAD;
    hand.burstGap = DUMP_GAP_MS;
    hand.burstAlt = true;
    // The trigger is locked for the length of the dump plus the reload it is about to start.
    hand.nextShotAt = this.now + hand.burstLeft * DUMP_GAP_MS + 140;
    this.avatar(owner)?.play('sweep', hand.burstAng);
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 44, '🔫 MAG DUMP', this.hex(FOR.gold));
  }

  /** Revolver: however long it was spun for, in one round. Three seconds is the whole bar. */
  private fireSpunRound(owner: Owner, heldMs: number, tx: number, ty: number): void {
    const s = this.side(owner);
    const hand = s.main;
    const f = this.fighter(owner);
    if (!this.alive(f) || !this.canFireHand(owner, hand)) return;
    if (hand.ammo <= 0) { this.beginReload(owner, hand); return; }
    const kit = this.loadout(s, hand);
    if (!kit) return;

    const k = Phaser.Math.Clamp(heldMs / SPIN_MS, 0, 1);
    // The attachments ride on top of the spun figure, exactly as they do on the ordinary one.
    const damage = (kit.damage + (SPIN_DAMAGE - GUNS.revolver.damage) * k) * this.gripMult(s, true);
    const ang = Math.atan2(ty - f.y, tx - f.x);

    hand.ammo = Math.max(0, hand.ammo - 1);
    hand.nextShotAt = this.now
      + GUNS.revolver.fireMs / (this.accelMult(s, hand, hand.ammo) * this.rateMult(s));
    s.lastShotAt = this.now;
    const av = this.avatar(owner);
    av?.play('punch', ang);
    av?.kick(1 + k);
    const mz = muzzleOf(f.x, f.y, ang, 'revolver');
    const fx = this.fx(owner);
    fx.muzzle(mz.x, mz.y, ang, 1 + k * 0.9);
    fx.brass(f.x, f.y - 4, ang);
    Sfx.playAt('shotgun', f.x, { volume: 0.7 + k * 0.3, rate: 1.1 - k * 0.35 });

    this.addBullet(owner, {
      kind: 'slug', x: mz.x, y: mz.y, ang,
      speed: GUNS.revolver.speed * (1 + k * 0.5),
      damage, size: GUNS.revolver.size * (1 + k * 0.6),
      pierce: kit.pierce || k >= 1, silencer: kit.silencer,
    });
    if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 46,
        k >= 1 ? '🎯 FULLY SPUN' : `🎯 ${Math.round(k * 100)}% SPUN`, this.hex(k >= 1 ? FOR.goldLit : FOR.gold));
    }
    if (hand.ammo <= 0) this.beginReload(owner, hand);
  }

  /** AR: what is left of the clip, thrown at the cursor in one lump that comes apart there. */
  private throwClip(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const hand = s.main;
    const f = this.fighter(owner);
    const rounds = hand.ammo;
    if (rounds <= 0) { this.beginReload(owner, hand); return; }
    const kit = this.loadout(s, hand);
    if (!kit) return;

    hand.ammo = 0;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    this.addBullet(owner, {
      kind: 'clip', x: f.x + Math.cos(ang) * 20, y: f.y + Math.sin(ang) * 20, ang,
      speed: CLIP_SPEED, damage: kit.damage * this.gripMult(s, true), size: 9,
      silencer: kit.silencer, rounds, toX: tx, toY: ty, life: 3000,
    });
    this.avatar(owner)?.play('sweep', ang);
    Sfx.playAt('whoosh', f.x, { volume: 0.7, rate: 0.8 });
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 44, `💥 CLIP × ${rounds}`, this.hex(FOR.gold));
    this.beginReload(owner, hand);
  }

  /** Golden Pistol: one slow, enormous, gilding round, and it is charged for in coin. */
  private midasRound(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const hand = s.main;
    const f = this.fighter(owner);
    if (s.coins < MIDAS_COINS) {
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 46, `💸 NEED ${MIDAS_COINS - s.coins} MORE`, this.hex(FOR.blood));
      Sfx.playAt('ui-denied', f.x, { volume: 0.7 });
      return;
    }
    if (hand.ammo < MIDAS_AMMO) { this.beginReload(owner, hand); return; }
    const kit = this.loadout(s, hand);
    if (!kit) return;

    s.coins -= MIDAS_COINS;
    s.spent += MIDAS_COINS;
    hand.ammo -= MIDAS_AMMO;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const mz = muzzleOf(f.x, f.y, ang, 'golden');
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).muzzle(mz.x, mz.y, ang, 1.6);
    Sfx.playAt('light-beam', f.x, { volume: 0.85, rate: 0.7 });
    this.addBullet(owner, {
      kind: 'midas', x: mz.x, y: mz.y, ang, speed: MIDAS_SPEED,
      damage: MIDAS_DAMAGE * this.gripMult(s, true), size: 11,
      silencer: kit.silencer, life: 4200,
    });
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 50, '🌟 MIDAS ROUND', this.hex(FOR.goldLit));
    if (hand.ammo <= 0) this.beginReload(owner, hand);
  }

  /** Grenade Launcher: every shell at your own feet, and then you are not there. */
  private dropAndLeave(owner: Owner): void {
    const s = this.side(owner);
    const hand = s.main;
    const f = this.fighter(owner);
    const shells = hand.ammo;
    if (shells <= 0) { this.beginReload(owner, hand); return; }
    const kit = this.loadout(s, hand);
    if (!kit) return;

    hand.ammo = 0;
    const damage = kit.damage * shells * this.gripMult(s, true);
    this.fx(owner).blast(f.x, f.y, GRENADE_R * 1.2);
    this.fx(owner).rift(f.x, f.y + 6, 30);
    Sfx.playAt('explosion-big', f.x, { volume: 0.95 });
    for (const t of this.targetsOf(owner)) {
      if (Phaser.Math.Distance.Between(t.x, t.y, f.x, f.y) > GRENADE_R * 1.2) continue;
      t.takeDamage(damage);
      this.api.spawnHitFlash(t.x, t.y, FOR.gold);
      this.api.showFloatingText(t.x, t.y - 36, '💣 POINT BLANK', this.hex(FOR.blood));
    }

    // Off the floor. Invisible and untouchable until the fall.
    s.airborneUntil = this.now + LAUNCH_MS;
    f.isInvincible = true;
    f.setAlpha(0);
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 60, '🚀 EXIT STRATEGY', this.hex(FOR.goldLit));
    this.beginReload(owner, hand);
  }

  /** Bouncy Blaster: one heavy bolt with a dozen bounces in it. */
  private heavyLaser(owner: Owner, tx: number, ty: number): void {
    const s = this.side(owner);
    const hand = s.main;
    const f = this.fighter(owner);
    if (hand.ammo < LASER_AMMO) { this.beginReload(owner, hand); return; }
    const kit = this.loadout(s, hand);
    if (!kit) return;

    hand.ammo -= LASER_AMMO;
    hand.nextShotAt = this.now + 500;
    const ang = Math.atan2(ty - f.y, tx - f.x);
    const mz = muzzleOf(f.x, f.y, ang, 'bouncy');
    this.avatar(owner)?.play('punch', ang);
    this.fx(owner).muzzle(mz.x, mz.y, ang, 1.4);
    Sfx.playAt('beam-fire', f.x, { volume: 0.8, rate: 1.2 });
    this.addBullet(owner, {
      kind: 'laser', x: mz.x, y: mz.y, ang, speed: 900,
      damage: LASER_DAMAGE * this.gripMult(s, true), size: 8,
      // It passes through bodies rather than stopping on the first one. A bolt bought for a
      // dozen bounces that died on the first shoulder it met would never spend any of them —
      // and the per-victim set is wiped on every wall, so a second pass counts again.
      pierce: true, silencer: kit.silencer, bounces: LASER_BOUNCES, life: 5000,
    });
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 46, '🟢 HEAVY LASER', this.hex(FOR.neon));
    if (hand.ammo <= 0) this.beginReload(owner, hand);
  }

  /** The Midas round landing: they are worth double for five seconds, and they look it. */
  private gild(victim: Fighter): void {
    this.gilded.set(victim, this.now + GILD_MS);
    this.api.showFloatingText(victim.x, victim.y - 40, '🌟 GILDED', this.hex(FOR.goldLit));
    Sfx.playAt('jackpot', victim.x, { volume: 0.7, rate: 1.2 });
  }

  // ── The shop ───────────────────────────────────────────────────────────────

  /**
   * A purchase. The kickback is the passive: everything an outsider buys hands the shopkeeper
   * half of what they paid, which is why a Fortune player wants the enemy shopping.
   */
  private buy(buyer: Owner, entry: ShopEntry): boolean {
    const s = this.side(buyer);
    const shop = this.shopOwner;
    if (!shop) return false;
    // The illegal pages exist for exactly one person.
    if (entry.page !== 'shop' && buyer !== shop) return false;

    const body = this.buyerFor(buyer);
    if (!body) return false;

    if (s.coins < entry.cost) {
      if (buyer === 'player') {
        this.api.showFloatingText(body.x, body.y - 44, `💸 NEED ${entry.cost - s.coins} MORE`, this.hex(FOR.blood));
        Sfx.playAt('ui-denied', body.x, { volume: 0.7 });
      }
      return false;
    }
    if (!this.canBuy(buyer, entry)) {
      if (buyer === 'player') {
        this.api.showFloatingText(body.x, body.y - 44, '🚫 ALREADY OWNED', this.hex(FOR.canvasShade));
        Sfx.playAt('ui-denied', body.x, { volume: 0.7 });
      }
      return false;
    }

    s.coins -= entry.cost;
    s.spent += entry.cost;
    s.effectBody = body;
    this.applyItem(buyer, entry, body);
    // The grind: one of everything on the three real pages, counted for good. The garage is a
    // workshop rather than stock and it only exists once the mastery does, so it cannot count.
    if (buyer === 'player' && entry.page !== 'garage') this.noteBought(entry.id);

    // Kickback. A Fortune user buying from their own stall is only moving money between
    // pockets, so it is skipped rather than paid to themselves.
    if (buyer !== shop && entry.cost > 0) {
      const cut = Math.floor(entry.cost * KICKBACK);
      if (cut > 0) {
        this.earn(shop, cut);
        const kf = this.fighter(shop);
        if (this.alive(kf)) {
          this.fx(shop).coinBurst(kf.x, kf.y - 10, Math.min(6, cut), 26);
          this.api.showFloatingText(kf.x, kf.y - 56, `🪙 +${cut} COMMISSION`, this.hex(FOR.goldLit));
        }
      }
    }

    this.fx(buyer).cash(this.stallX, this.stallY, 46, 520, 22);
    this.api.showFloatingText(body.x, body.y - 48, `${entry.emoji} ${entry.name.toUpperCase()}`, this.hex(FOR.gold));
    Sfx.playAt('ui-purchase', this.stallX, { volume: 0.8 });
    return true;
  }

  /** Whether a purchase would actually change anything. */
  private canBuy(buyer: Owner, entry: ShopEntry): boolean {
    const s = this.side(buyer);
    if (entry.page === 'arms') return s.main.gun !== entry.id && s.off?.gun !== entry.id;
    if (entry.page === 'mods') {
      if (s.attachments.includes(entry.id)) return false;
      return s.attachments.length < MAX_ATTACHMENTS;
    }
    if (entry.page === 'garage') {
      if (s.carBuffs.includes(entry.id)) return false;
      return s.carBuffs.length < CAR_MAX_BUFFS;
    }
    if (entry.id === 'roomba') return this.roombas.filter((r) => r.owner === buyer).length < ROOMBA_MAX;
    if (entry.id === 'pylon') return this.pylons.filter((p) => p.owner === buyer).length < PYLON_MAX;
    return true;
  }

  /**
   * Handing an item over.
   *
   * `plus` is the battle pass's fifth tier: the same item off the same shelf, bought by nobody,
   * and simply better. Every branch that has a plus version reads the flag rather than there
   * being a second table of items — an Ornate Daggers⁺ is the same three lines of code with
   * bigger numbers in them, which is exactly what it should be.
   */
  private applyItem(buyer: Owner, entry: ShopEntry, body: Fighter, plus = false): void {
    const s = this.side(buyer);
    const miracle = this.now < s.miracleUntil ? 2 : 1;

    switch (entry.id) {
      case 'bandages': {
        const hp = (plus ? 55 : 20) * miracle;
        body.heal(hp);
        this.api.showFloatingText(body.x, body.y - 30, `🩹 +${hp}`, this.hex(FOR.blood));
        Sfx.playAt('heal', body.x, { volume: 0.7 });
        break;
      }
      case 'pepper':
        s.pepperUntil = this.now + PEPPER_MS * (plus ? 2.5 : 1) * miracle;
        if (plus) s.pepperPower = 1.8;
        Sfx.playAt('flame-burst', body.x, { volume: 0.6, rate: 1.3 });
        break;
      case 'pouch':
        s.pouch += plus ? 12 : POUCH_CHARGES;
        if (plus) s.pouchPlus = true;
        Sfx.playAt('trap-set', body.x, { volume: 0.7 });
        break;
      case 'cureall':
        this.cleanse(body);
        body.heal((plus ? 120 : 50) * miracle);
        s.cureUntil = this.now + CURE_MS * (plus ? 2.25 : 1) * miracle;
        this.fx(buyer).cash(body.x, body.y, 40, 520, 12);
        Sfx.playAt('potion-drink', body.x, { volume: 0.8 });
        break;
      case 'daggers':
        for (let i = 0; i < (plus ? 5 : DAGGER_VOLLEYS); i++) {
          this.volleys.push({
            owner: buyer, at: this.now + i * DAGGER_GAP_MS, ang: this.aimAngle(buyer, body), plus,
          });
        }
        break;
      case 'roomba':
        this.roombas.push({
          owner: buyer,
          x: Phaser.Math.Clamp(body.x + (Math.random() - 0.5) * 40, this.left + 20, this.right - 20),
          y: Phaser.Math.Clamp(body.y + 22, this.top + 20, this.bottom - 20),
          ang: this.aimAngle(buyer, body),
          spin: Math.random() * 6,
          plus,
          gate: new Map(),
        });
        Sfx.playAt('robot-power', body.x, { volume: 0.8 });
        break;
      case 'miracle':
        s.miracleUntil = this.now + MIRACLE_MS * (plus ? 2.25 : 1);
        seedEffectSnapshot(body, s.miracleSnap);
        Sfx.playAt('holy-chord', body.x, { volume: 0.85 });
        break;
      case 'donation':
        // The item is the joke. It is also the single largest source of income in the element,
        // which is why it is priced where somebody might actually be tempted.
        this.api.showFloatingText(body.x, body.y - 32, '💝 THANK YOU', this.hex(FOR.goldLit));
        Sfx.playAt('jackpot', body.x, { volume: 0.75 });
        break;
      case 'chilly':
        s.chillyUntil = this.now + CHILLY_MS * miracle;
        // The first ring goes off in the buyer's hand rather than three seconds later.
        s.chillyNext = this.now;
        Sfx.playAt('ice-crack', body.x, { volume: 0.7, rate: 1.2 });
        break;
      case 'pylon':
        this.pylons.push({
          owner: buyer,
          x: Phaser.Math.Between(this.left + 60, this.right - 60),
          y: Phaser.Math.Between(this.top + 60, this.bottom - 60),
          readyAt: 0,
          seed: Math.random() * 999,
        });
        Sfx.playAt('robot-power', body.x, { volume: 0.7, rate: 1.3 });
        break;
      case 'telecore':
        s.teleUntil = this.now + TELE_MS * miracle;
        Sfx.playAt('teleport', body.x, { volume: 0.8 });
        break;
      default:
        if (entry.page === 'arms') {
          // Dual Grip: the next gun bought goes in the right hand instead, with its own
          // magazine and its own reload, and the main hand keeps whatever it was holding.
          if (s.dualPending) {
            s.off = makeHand(entry.id);
            s.off.ammo = this.magSize(s, s.off);
            s.dualPending = false;
            this.api.showFloatingText(body.x, body.y - 62, '🤞 OFF HAND', this.hex(FOR.neon));
          } else {
            s.main.gun = entry.id;
            s.main.ammo = this.magSize(s, s.main);
            s.main.reloadUntil = 0;
            s.main.burstLeft = 0;
            this.avatar(buyer)?.setGun(entry.id);
          }
          Sfx.playAt('anvil', body.x, { volume: 0.7, rate: 1.2 });
        } else if (entry.page === 'mods') {
          s.attachments.push(entry.id);
          if (entry.id === 'dualgrip') s.dualPending = true;
          // A bigger magazine that does not go in until you next reload is just a worse item.
          const top = entry.id === 'biggermag' ? 3 : entry.id === 'drummag' ? 10 : 0;
          for (const hand of this.hands(s)) {
            hand.ammo = Math.min(this.magSize(s, hand), hand.ammo + top);
          }
          Sfx.playAt('gear-turn', body.x, { volume: 0.7 });
        } else if (entry.page === 'garage') {
          // Bolted onto the car that is already out, not just the next one — everything the
          // garage sells is re-read off `carBuffs` every frame for exactly this reason.
          s.carBuffs.push(entry.id);
          Sfx.playAt('anvil', body.x, { volume: 0.8, rate: 0.75 });
          Sfx.playAt('gear-turn', body.x, { volume: 0.7, rate: 0.8 });
        }
        break;
    }
  }

  /** Both triggers, in the order they fire. Normally just the one. */
  private hands(s: Side): Hand[] {
    return s.off ? [s.main, s.off] : [s.main];
  }

  private aimAngle(owner: Owner, from: Fighter): number {
    const s = this.side(owner);
    if (owner === 'player') return Math.atan2(s.aimY - from.y, s.aimX - from.x);
    const t = this.targetsOf(owner)[0];
    return t ? Math.atan2(t.y - from.y, t.x - from.x) : 0;
  }

  /**
   * Cure-All. Every writable debuff timer in the descriptor table is set back to zero, plus the
   * handful of stacking effects that have no writer. Re-run every frame for the whole 20
   * seconds, which is what "cannot gain any new negative effects" means in a codebase where
   * statuses are written as bare expiry stamps from forty different places.
   */
  private cleanse(f: Fighter): void {
    for (const desc of STATUS_DESCRIPTORS) {
      if (desc.kind !== 'timer' || !desc.write || !isDebuff(desc)) continue;
      if (desc.read(f) > 0) desc.write(f, 0);
    }
    f.frostStacks = 0;
    f.frostStackTimers = [];
    f.voidFrostStacks = 0;
    f.voidFrostStackTimers = [];
    f.darkVulnStacks = 0;
    f.hopelessness = 0;
    f.bleeding = false;
    f.bleedingUntil = 0;
    f.toxicUntil = 0;
    f.vulnerableNextHit = false;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const shop = this.shopOwner;
    if (!shop && !this.hasLiveState()) return;

    this.vizT += delta / 1000;
    this.ensureLayers();

    // The free pistol is a line of the catalogue you already own on the first frame, and the
    // counter refuses to sell you one — so it is credited here rather than never.
    if (!this.startNoted && this.isFortune('player')) {
      this.startNoted = true;
      this.noteBought('pistol');
    }
    for (const owner of BOTH) if (this.masteryOn(owner)) this.ensurePass(owner);

    this.updateEconomy(delta);
    this.updateInvestments(delta);
    this.updateBursts();
    this.updateBullets(delta);
    this.updateVolleys();
    this.updateDaggers(delta);
    this.updateFlames(delta);
    this.updateRoombas(delta);
    this.updatePylons();
    this.updateChilly();
    this.updateWalls(delta);
    this.updateAudits(delta);
    this.updateBeams(delta);
    this.updateCars(delta);
    this.updateNpcCar();
    this.updateShoves(delta);
    this.updateAirborne();
    this.updateMarks();
    this.updateItemAuras();
    this.updateBots(delta);
    this.updateAvatars(delta);

    this.paintGround();
    this.paintAir();
    this.paintShop(shop);
    this.paintPass();
    this.pushStatuses(shop);
    void time;
  }

  /** Anything of this kit's still standing, whoever is currently Fortune. */
  private hasLiveState(): boolean {
    return this.bullets.length > 0 || this.daggers.length > 0 || this.volleys.length > 0
      || this.flames.length > 0 || this.roombas.length > 0 || this.cured.size > 0
      || this.pylons.length > 0 || this.chilled.size > 0 || this.gilded.size > 0
      || BOTH.some((o) => !!this.sides[o].wall || !!this.sides[o].beam || !!this.sides[o].audit
        || !!this.sides[o].car || this.now < this.sides[o].airborneUntil);
  }

  private ensureLayers(): void {
    const { scene } = this.api;
    // Fighters are depth 5. The stall and the fire trail are things you walk in front of; the
    // bullets, the roombas and the beam are things that pass over you.
    if (!this.groundGfx) this.groundGfx = scene.add.graphics().setDepth(4);
    if (!this.airGfx) this.airGfx = scene.add.graphics().setDepth(9);
  }

  // ── The economy ────────────────────────────────────────────────────────────

  /**
   * The entire passive, in one loop.
   *
   * There is no central "damage dealt" hook in the game, so the meter is `rawDamageTaken` on
   * every body in play, diffed each frame. Whatever a body lost, the other side dealt — and
   * every 20 of it is a blood coin. The same diff drives the Explosives Pouch and the risky
   * market's two thresholds, so all three read exactly the same number.
   */
  private updateEconomy(delta: number): void {
    void delta;
    const seen: Fighter[] = [this.api.player, this.api.npc, ...this.api.enemies];
    for (const f of seen) {
      if (!f || !f.active) continue;
      const prev = this.rawSeen.get(f);
      const raw = f.rawDamageTaken;
      this.rawSeen.set(f, raw);
      if (prev === undefined) continue;

      const earner = this.creditFor(f);
      const s = this.side(earner);
      // The golden beam does not pay for itself. Whatever it burned off this body last frame is
      // subtracted here — the same units, one frame later, because the beam runs after this
      // loop does and the wound is only visible on the next pass.
      const free = s.unpaid.get(f) ?? 0;
      const dealt = Math.max(0, raw - prev - free);
      if (free > 0) s.unpaid.delete(f);
      if (dealt <= 0) continue;

      // Ruin's Combo Breaker halves every meter in the game, and the purse is Fortune's. Taxed
      // on the fraction rather than on the whole coins, so the shortfall carries instead of
      // rounding itself away.
      s.coinFrac += meterGain(this.fighter(earner),
        dealt * (this.now < (this.gilded.get(f) ?? 0) ? GILD_PAYOUT : 1));
      s.stockDealt += dealt;
      this.side(this.other(earner)).stockTaken += dealt;

      // A Private Mint off the battle pass makes every wound worth proportionally more, which is
      // taken off the price of a coin rather than added to the payout — same thing, but the
      // remainder still carries.
      const perCoin = DAMAGE_PER_COIN / s.boons.coin;
      const coins = Math.floor(s.coinFrac / perCoin);
      if (coins > 0) {
        s.coinFrac -= coins * perCoin;
        this.earn(earner, coins);
        this.fx(earner).coinBurst(f.x, f.y - 6, Math.min(5, coins), 24);
      }

      this.tryPouch(earner, f, dealt);
    }

    // Bodies that have left the arena stop being metered, or the map grows for the whole match.
    for (const f of [...this.rawSeen.keys()]) if (!f.active) this.rawSeen.delete(f);
  }

  /**
   * Coins into a purse, and the one place the "make 500 coins" grind is counted.
   *
   * Every source of income goes through here — wounds, commission, tolls and a settled
   * investment — and a withdrawal deliberately does not, because that money was counted on the
   * way in and counting it twice would halve the requirement.
   */
  private earn(owner: Owner, amount: number): void {
    if (amount <= 0) return;
    this.side(owner).coins += amount;
    this.record(owner, 'coinsEarned', amount);
  }

  /**
   * One more distinct line of the catalogue owned, ever.
   *
   * Persisted as a flag per item id and re-counted into the real requirement, the same ratchet
   * Magic's wheel counters and Growth's ultimates use — a plain cumulative counter would let
   * twenty Bandages finish a requirement that asks for one of everything.
   */
  private noteBought(id: string): void {
    const key = `forItem_${id}`;
    if (this.api.getMasteryStat(key) > 0) return;
    this.api.recordMasteryBestStat(key, 1);
    let owned = 0;
    for (const e of ENTRY_BY_ID.values()) {
      if (e.page === 'garage') continue;
      if (this.api.getMasteryStat(`forItem_${e.id}`) > 0) owned++;
    }
    this.api.recordMasteryBestStat('catalogueOwned', owned);
    this.api.showFloatingText(this.stallX, this.stallY - 74,
      `🧾 ${owned}/${CATALOGUE_SIZE} CATALOGUE`, this.hex(FOR.canvasShade));
  }

  /**
   * The Explosives Pouch. The AOE deliberately spares the body that was hit — the item is a
   * cleave onto everything *else*, not a damage multiplier, which is why it is only three coins.
   * An Explosives Pouch⁺ off the battle pass is the version that does not spare them.
   */
  private tryPouch(owner: Owner, victim: Fighter, damage: number): void {
    const s = this.side(owner);
    if (s.pouch <= 0 || damage <= 0) return;
    if (this.now < s.pouchGate) return;
    s.pouchGate = this.now + POUCH_GATE_MS;
    s.pouch--;

    this.fx(owner).boom(victim.x, victim.y, POUCH_R * 0.7);
    Sfx.playAt('explosion-small', victim.x, { volume: 0.8 });
    let struck = 0;
    for (const t of this.targetsOf(owner)) {
      if (t === victim && !s.pouchPlus) continue;
      if (Phaser.Math.Distance.Between(t.x, t.y, victim.x, victim.y) > POUCH_R) continue;
      t.takeDamage(damage);
      this.api.spawnHitFlash(t.x, t.y, FOR.blood);
      struck++;
    }
    if (owner === 'player') {
      this.api.showFloatingText(victim.x, victim.y - 52,
        struck > 0 ? `🧨 SPLASH ×${struck}` : '🧨 NOBODY ELSE', this.hex(FOR.gold));
    }
  }

  /** The two investment vehicles, both settling on the same 10-second drum. */
  private updateInvestments(delta: number): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = this.fighter(owner);
      const miracle = this.now < s.miracleUntil ? 2 : 1;

      // Quarterly Results shortens the drum for both vehicles at once, so a pass full of them
      // is a genuinely different economy rather than a bigger one.
      const settle = SETTLE_MS * s.boons.settle;

      if (s.bank > 0) {
        s.bankTimer += delta;
        if (s.bankTimer >= settle) {
          s.bankTimer -= settle;
          const rate = (CAPITAL_GAINS + s.boons.interest) * miracle;
          const gain = Math.round(meterGain(f,
            Math.max(CAPITAL_FLOOR, Math.floor(s.bank * rate))));
          s.bank += gain;
          this.record(owner, 'coinsEarned', gain);
          this.record(owner, 'investGains', gain);
          if (this.alive(f)) {
            this.fx(owner).coinBurst(f.x, f.y - 14, Math.min(5, gain), 22);
            this.api.showFloatingText(f.x, f.y - 60, `🏦 +${gain} CAPITAL GAINS`, this.hex(FOR.gold));
            Sfx.playAt('money', f.x, { volume: 0.55, rate: 1.35 });
          }
        }
      } else {
        s.bankTimer = 0;
      }

      if (s.stocks > 0) {
        s.stockTimer += delta;
        if (s.stockTimer >= settle) {
          s.stockTimer -= settle;
          const good = s.stockDealt > RISK_DEAL_BAR;
          const bad = s.stockTaken > RISK_TAKE_BAR;
          s.stockDealt = 0;
          s.stockTaken = 0;
          const rate = good && bad ? RISK_MIXED : good ? RISK_UP * miracle : bad ? RISK_DOWN : 0;
          if (rate !== 0) {
            const delta2 = Math.max(1, Math.round(Math.abs(s.stocks * rate))) * Math.sign(rate);
            s.stocks = Math.max(0, s.stocks + delta2);
            if (delta2 > 0) {
              this.record(owner, 'coinsEarned', delta2);
              this.record(owner, 'investGains', delta2);
            }
            if (this.alive(f)) {
              const up = delta2 > 0;
              this.api.showFloatingText(f.x, f.y - 60,
                `${up ? '📈' : '📉'} ${up ? '+' : ''}${delta2} STOCK`,
                this.hex(up ? FOR.contraband : FOR.blood));
              Sfx.playAt(up ? 'money' : 'error-popup', f.x, { volume: 0.6, rate: up ? 1.5 : 1 });
            }
          }
        }
      } else {
        s.stockTimer = 0;
        s.stockDealt = 0;
        s.stockTaken = 0;
      }
    }
  }

  private withdraw(owner: Owner, which: 'bank' | 'stocks'): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    const amount = which === 'bank' ? s.bank : s.stocks;
    if (amount <= 0) {
      if (owner === 'player' && this.alive(f)) {
        this.api.showFloatingText(f.x, f.y - 44, which === 'bank' ? '🏦 EMPTY' : '📈 EMPTY', this.hex(FOR.canvasShade));
      }
      return;
    }
    if (which === 'bank') { s.bank = 0; s.bankTimer = 0; }
    else { s.stocks = 0; s.stockTimer = 0; s.stockDealt = 0; s.stockTaken = 0; }
    s.coins += amount;
    if (this.alive(f)) {
      this.fx(owner).coinBurst(f.x, f.y - 10, Math.min(9, amount), 40, 800);
      this.api.showFloatingText(f.x, f.y - 48, `🪙 WITHDREW ${amount}`, this.hex(FOR.goldLit));
      Sfx.playAt('jackpot', f.x, { volume: 0.7 });
    }
  }

  // ── Weapons upkeep ─────────────────────────────────────────────────────────

  private updateBursts(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      for (const hand of this.hands(s)) {
        if (hand.burstLeft <= 0) continue;
        if (this.now < hand.burstAt) continue;
        if (hand.ammo <= 0) { hand.burstLeft = 0; continue; }
        hand.burstLeft--;
        hand.burstAt = this.now + hand.burstGap;
        this.shoot(owner, hand.burstAng + (Math.random() - 0.5) * hand.burstSpread, hand,
          { alt: hand.burstAlt, aimX: s.aimX, aimY: s.aimY });
      }
    }
    for (const owner of BOTH) {
      const s = this.sides[owner];
      for (const hand of this.hands(s)) {
        // An empty magazine reloads itself. `canFireNow` gates the trigger, so nothing else in
        // the kit would ever notice the gun had run dry.
        if (hand.gun && hand.ammo <= 0 && hand.reloadUntil === 0 && this.isFortune(owner)) {
          this.beginReload(owner, hand);
        }
        // A finished reload puts the gun back in the hand.
        if (hand.reloadUntil > 0 && this.now >= hand.reloadUntil) {
          hand.reloadUntil = 0;
          hand.ammo = this.magSize(s, hand);
          if (hand === s.main) this.avatar(owner)?.setGun(hand.gun);
          const f = this.fighter(owner);
          if (this.alive(f)) Sfx.playAt('ui-click', f.x, { volume: 0.5, rate: 0.8 });
          // Scavenger. The battle pass pays for brass, so an empty magazine is worth something
          // even when every round in it missed.
          if (s.boons.scavenge > 0) {
            this.earn(owner, s.boons.scavenge);
            if (this.alive(f)) this.fx(owner).coinBurst(f.x, f.y - 8, s.boons.scavenge, 18, 520);
          }
        }
      }
    }
  }

  private updateBullets(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const px = b.x;
      const py = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt * 9;
      let ang = Math.atan2(b.vy, b.vx);

      // Ricochet: the Bouncy Blaster's rounds and its heavy laser come off the arena edges
      // rather than dying on them, and spend one bounce doing it.
      if (b.bounces > 0) {
        let hitWall = false;
        if (b.x < this.left || b.x > this.right) {
          b.vx = -b.vx;
          b.x = Phaser.Math.Clamp(b.x, this.left, this.right);
          hitWall = true;
        }
        if (b.y < this.top || b.y > this.bottom) {
          b.vy = -b.vy;
          b.y = Phaser.Math.Clamp(b.y, this.top, this.bottom);
          hitWall = true;
        }
        if (hitWall) {
          b.bounces--;
          ang = Math.atan2(b.vy, b.vx);
          // A ricochet is a fresh shot as far as anybody it has already passed through is
          // concerned — otherwise a bounced laser walks harmlessly back through its own victim.
          b.hit.clear();
          this.fx(b.owner).impact(b.x, b.y, ang, 160);
          Sfx.playAt('ricochet', b.x, { volume: 0.4, rate: 1.3 });
        }
      }

      let spent = false;
      const reach = b.kind === 'midas' ? 16 : b.kind === 'clip' ? 12 : BULLET_R;
      for (const t of this.targetsOf(b.owner)) {
        if (b.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y) > reach + 12 * t.sizeMult) continue;
        b.hit.add(t);
        // A shell and a thrown clip do not *hit* anybody — they stop on them and come apart.
        if (b.blast > 0 || b.kind === 'clip') { spent = true; break; }
        this.landHit(b.owner, t, b.damage, ang, b.silencer);
        if (b.kind === 'midas') this.gild(t);
        if (!b.pierce) { spent = true; break; }
      }

      // A shell bursts where it was aimed even if nothing was standing there — it crosses the
      // landing point once, and the crossing is what sets it off.
      const landed = (b.kind === 'grenade' || b.kind === 'clip')
        && (px - b.toX) * (b.x - b.toX) + (py - b.toY) * (b.y - b.toY) <= 0;
      const timedOut = this.now >= b.diesAt;
      const offArena = b.bounces <= 0
        && (b.x < this.left || b.x > this.right || b.y < this.top || b.y > this.bottom);

      if (!spent && !landed && !timedOut && !offArena) continue;

      if (b.kind === 'clip') this.burstClip(b);
      else if (b.blast > 0) this.burstShell(b);
      else if (!spent) this.fx(b.owner).impact(b.x, b.y, ang + Math.PI, 180);
      if (b.reg) this.api.projectileRegistry.remove(b.reg);
      this.bullets.splice(i, 1);
    }
  }

  /** A grenade going off, wherever it stopped. */
  private burstShell(b: Bullet): void {
    this.fx(b.owner).blast(b.x, b.y, b.blast);
    Sfx.playAt('explosion-small', b.x, { volume: 0.85, rate: 0.85 });
    for (const t of this.targetsOf(b.owner)) {
      const d = Phaser.Math.Distance.Between(b.x, b.y, t.x, t.y);
      if (d > b.blast) continue;
      // Full damage at the centre, half at the rim — a blast you can be on the edge of.
      t.takeDamage(b.damage * (1 - 0.5 * (d / b.blast)));
      this.api.spawnHitFlash(t.x, t.y, FOR.gold);
    }
  }

  /** The AR's thrown clip coming apart into the rounds that were still in it. */
  private burstClip(b: Bullet): void {
    this.fx(b.owner).blast(b.x, b.y, 34);
    Sfx.playAt('explosion-small', b.x, { volume: 0.7, rate: 1.4 });
    for (let k = 0; k < b.rounds; k++) {
      const a = (k / Math.max(1, b.rounds)) * TAU_LOCAL + Math.random() * 0.2;
      this.addBullet(b.owner, {
        kind: 'slug', x: b.x + Math.cos(a) * 8, y: b.y + Math.sin(a) * 8, ang: a,
        speed: CLIP_BURST_SPEED, damage: b.damage, size: 4.4, silencer: b.silencer, life: 900,
      });
    }
  }

  // ── Ornate Daggers ─────────────────────────────────────────────────────────

  private updateVolleys(): void {
    for (let i = this.volleys.length - 1; i >= 0; i--) {
      const v = this.volleys[i];
      if (this.now < v.at) continue;
      this.volleys.splice(i, 1);
      const f = this.fighter(v.owner);
      if (!this.alive(f)) continue;
      // Re-aimed at throw time rather than at purchase: three volleys over half a second
      // should follow a target that has moved, not spray where they used to be.
      const ang = this.aimAngle(v.owner, f);
      const n = v.plus ? 12 : DAGGER_PER_VOLLEY;
      for (let k = 0; k < n; k++) {
        const a = ang + (k / (n - 1) - 0.5) * 2 * DAGGER_SPREAD;
        this.daggers.push({
          owner: v.owner,
          x: f.x + Math.cos(a) * 20,
          y: f.y + Math.sin(a) * 20,
          vx: Math.cos(a) * DAGGER_SPEED,
          vy: Math.sin(a) * DAGGER_SPEED,
          ang: a,
          damage: v.plus ? 6 : DAGGER_DAMAGE,
          diesAt: this.now + 900,
          hit: new Set(),
        });
      }
      this.avatar(v.owner)?.play('sweep', ang);
      Sfx.playAt('whoosh', f.x, { volume: 0.5, rate: 1.5 });
    }
  }

  private updateDaggers(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.daggers.length - 1; i >= 0; i--) {
      const d = this.daggers[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      let spent = false;
      for (const t of this.targetsOf(d.owner)) {
        if (d.hit.has(t)) continue;
        if (Phaser.Math.Distance.Between(d.x, d.y, t.x, t.y) > 12 + 12 * t.sizeMult) continue;
        d.hit.add(t);
        t.takeDamage(d.damage);
        this.api.spawnHitFlash(t.x, t.y, FOR.steel);
        spent = true;
        break;
      }
      const gone = spent || this.now >= d.diesAt
        || d.x < this.left || d.x > this.right || d.y < this.top || d.y > this.bottom;
      if (gone) this.daggers.splice(i, 1);
    }
  }

  // ── Spicy Pepper ───────────────────────────────────────────────────────────

  private updateFlames(delta: number): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (this.now >= s.pepperUntil) continue;
      const f = s.effectBody ?? this.buyerFor(owner);
      if (!this.alive(f)) continue;
      s.pepperDrop += delta;
      if (s.pepperDrop < PEPPER_DROP_MS) continue;
      s.pepperDrop = 0;
      this.flames.push({
        owner, x: f!.x, y: f!.y + 8, seed: Math.random() * 999,
        bornAt: this.now, diesAt: this.now + PEPPER_LIFE_MS, power: s.pepperPower,
      });
    }

    const dt = delta / 1000;
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const fl = this.flames[i];
      if (this.now >= fl.diesAt) { this.flames.splice(i, 1); continue; }
      for (const t of this.targetsOf(fl.owner)) {
        if (Phaser.Math.Distance.Between(fl.x, fl.y, t.x, t.y) > PEPPER_R + 8 * t.sizeMult) continue;
        // One patch's worth of dps, not the sum of every patch you are standing in — a doubled
        // back trail is a wider trap, not a hotter one.
        t.takeDamage(PEPPER_DPS * fl.power * dt * (1 / Math.max(1, this.overlapCount(fl.owner, t))));
        t.burningUntil = Math.max(t.burningUntil, this.now + 900);
      }
    }
  }

  private overlapCount(owner: Owner, t: Fighter): number {
    let n = 0;
    for (const fl of this.flames) {
      if (fl.owner !== owner) continue;
      if (Phaser.Math.Distance.Between(fl.x, fl.y, t.x, t.y) <= PEPPER_R + 8 * t.sizeMult) n++;
    }
    return n;
  }

  // ── Death Machines ─────────────────────────────────────────────────────────

  private updateRoombas(delta: number): void {
    const dt = delta / 1000;
    for (const r of this.roombas) {
      r.spin += dt * 4;
      const targets = this.targetsOf(r.owner);
      let best: Fighter | null = null;
      let bestD = Infinity;
      for (const t of targets) {
        const d = Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y);
        if (d < bestD) { bestD = d; best = t; }
      }
      // No target: potter around the middle of the arena rather than freezing in place.
      const tx = best ? best.x : this.stallX + Math.cos(this.vizT * 0.7) * 90;
      const ty = best ? best.y : this.stallY + Math.sin(this.vizT * 0.9) * 60;
      const want = Math.atan2(ty - r.y, tx - r.x);
      const speed = r.plus ? 150 : ROOMBA_SPEED;
      r.ang = Phaser.Math.Angle.RotateTo(r.ang, want, 3.2 * dt);
      r.x = Phaser.Math.Clamp(r.x + Math.cos(r.ang) * speed * dt, this.left + 12, this.right - 12);
      r.y = Phaser.Math.Clamp(r.y + Math.sin(r.ang) * speed * dt, this.top + 12, this.bottom - 12);

      for (const t of targets) {
        if (Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) > 20 + 12 * t.sizeMult) continue;
        const gate = r.gate.get(t) ?? 0;
        if (this.now < gate) continue;
        r.gate.set(t, this.now + ROOMBA_GATE_MS);
        t.takeDamage(r.plus ? 45 : ROOMBA_DAMAGE);
        this.api.spawnHitFlash(t.x, t.y, FOR.steel);
        this.fx(r.owner).impact(t.x, t.y, r.ang + Math.PI);
        this.api.showFloatingText(t.x, t.y - 36,
          r.plus ? '🤖 DEATH MACHINE+' : '🤖 DEATH MACHINE', this.hex(FOR.steel));
        Sfx.playAt('slash', t.x, { volume: 0.7, rate: 1.2 });
      }
    }
  }

  // ── Safe Marketing ─────────────────────────────────────────────────────────

  /** Everybody on that side. In Invasion the npc side is a whole wave of them. */
  private friendsOf(owner: Owner): Fighter[] {
    if (owner === 'player') return this.alive(this.api.player) ? [this.api.player] : [];
    if (this.api.isInvasion) return this.api.enemies.filter((f) => this.alive(f));
    return this.alive(this.api.npc) ? [this.api.npc] : [];
  }

  /** Heal Pylons. The light on the crystal is the cooldown, and touching a lit one spends it. */
  private updatePylons(): void {
    for (const p of this.pylons) {
      if (this.now < p.readyAt) continue;
      for (const f of this.friendsOf(p.owner)) {
        if (Phaser.Math.Distance.Between(p.x, p.y, f.x, f.y) > PYLON_R + 12 * f.sizeMult) continue;
        // A full-health body does not discharge it — the charge waits for somebody who needs it.
        if (f.hp >= f.maxHp) continue;
        const boost = this.now < this.sides[p.owner].miracleUntil ? 2 : 1;
        f.heal(PYLON_HEAL * boost);
        p.readyAt = this.now + PYLON_COOL_MS;
        this.fx(p.owner).cash(p.x, p.y - 16, 26, 420, 12);
        this.api.showFloatingText(f.x, f.y - 34, `🗼 +${PYLON_HEAL * boost}`, this.hex(FOR.neon));
        Sfx.playAt('heal', p.x, { volume: 0.6, rate: 1.25 });
        break;
      }
    }
  }

  /** The Chilly Pepper's ring, every three seconds for twelve. */
  private updateChilly(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (this.now >= s.chillyUntil || this.now < s.chillyNext) continue;
      s.chillyNext = this.now + CHILLY_EVERY_MS;
      const f = s.effectBody ?? this.buyerFor(owner);
      if (!this.alive(f)) continue;

      this.fx(owner).frost(f!.x, f!.y, CHILLY_R);
      Sfx.playAt('ice-crack', f!.x, { volume: 0.6, rate: 0.9 });
      let struck = 0;
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(t.x, t.y, f!.x, f!.y) > CHILLY_R + 10 * t.sizeMult) continue;
        this.chill(t, CHILLY_SLOW_MS, CHILLY_SLOW, '🥶 CHILLED');
        struck++;
      }
      if (owner === 'player' && struck === 0) {
        this.api.showFloatingText(f!.x, f!.y - 46, '🥶 COLD SNAP', this.hex(0x9fe4ff));
      }
    }
  }

  /**
   * Put a slow on somebody. Strongest wins and the longer clock is kept, so an auditor's rifle
   * landing on an already-chilled body does not read as a weaker effect than the pepper.
   */
  private chill(victim: Fighter, ms: number, mult: number, label: string): void {
    const cur = this.chilled.get(victim);
    this.chilled.set(victim, {
      until: Math.max(cur?.until ?? 0, this.now + ms),
      mult: Math.min(cur?.mult ?? 1, mult),
    });
    this.api.showFloatingText(victim.x, victim.y - 30, label, this.hex(0x9fe4ff));
  }

  /**
   * Everything this kit is holding on somebody else's body, refreshed once a frame.
   *
   * Husks read `walkSpeedMult` themselves. The player and the npc do not — their movement has
   * already resolved by the time this runs — so both are pulled out of `get*SpeedMult` by
   * ArenaScene instead, the same way Justice and Shadow are.
   */
  private updateMarks(): void {
    for (const [f, until] of [...this.gilded]) {
      if (this.now >= until || !f.active) this.gilded.delete(f);
    }
    for (const [f, c] of [...this.chilled]) {
      const done = this.now >= c.until || !f.active;
      if (f.active && f !== this.api.player && f !== this.api.npc) {
        f.walkSpeedMult = done ? 1 : Math.min(f.walkSpeedMult, c.mult);
      }
      if (done) this.chilled.delete(f);
    }
    for (const [f, until] of [...this.audited]) {
      const done = this.now >= until || !f.active;
      if (f.active) f.fortuneIncomingMult = done ? 1 : AUDIT_VULN;
      if (done) this.audited.delete(f);
    }
  }

  /** Hands every mark back. Called on reset, so nothing survives into the next match. */
  private releaseChills(): void {
    for (const f of this.chilled.keys()) if (f.active) f.walkSpeedMult = 1;
    this.chilled.clear();
    for (const f of this.audited.keys()) if (f.active) f.fortuneIncomingMult = 1;
    this.audited.clear();
  }

  /** The three seconds after an Exit Strategy, and the landing at the end of them. */
  private updateAirborne(): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      if (s.airborneUntil === 0) continue;
      const f = this.fighter(owner);
      if (this.now < s.airborneUntil) {
        if (this.alive(f)) { f.isInvincible = true; f.setAlpha(0); }
        continue;
      }
      s.airborneUntil = 0;
      if (!this.alive(f)) continue;
      f.isInvincible = false;
      f.setAlpha(1);
      this.fx(owner).rift(f.x, f.y, 30);
      this.fx(owner).impact(f.x, f.y + 8, -Math.PI / 2, 320);
      Sfx.playAt('stone-rise', f.x, { volume: 0.8, rate: 0.7 });
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 44, '🪂 TOUCHDOWN', this.hex(FOR.gold));
    }
  }

  // ── Paywall ────────────────────────────────────────────────────────────────

  private updateWalls(delta: number): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const w = s.wall;
      if (!w) continue;
      w.flash = Math.max(0, w.flash - delta / 260);
      if (this.now >= w.diesAt) { s.wall = null; continue; }

      const theirs = this.other(owner);
      const mineIsPlayer = owner === 'player';

      // Shots in the shared group.
      for (const obj of this.api.projectiles.getChildren()) {
        const p = obj as Projectile;
        if (!p.active || p.isHeal) continue;
        if (p.isFromPlayer === mineIsPlayer) continue;
        this.tollShot(owner, theirs, w, p, p.x, p.y);
      }
      // ...and the kit-local ones.
      // Radius has to reach the far corners of the arena from the wall's midpoint, or a shot
      // crossing near the top of the screen would slip through unbilled.
      for (const rp of this.api.projectileRegistry.within(theirs, w.x, this.api.height / 2,
        Math.hypot(this.api.width, this.api.height))) {
        this.tollShot(owner, theirs, w, rp, rp.getX(), rp.getY());
      }

      // Bodies. Charged on the crossing, not on standing in the band, so leaning on a turnstile
      // is free and walking through it is not.
      for (const t of this.targetsOf(owner)) {
        const side = Math.sign(t.x - w.x) || 1;
        const prev = w.sideOf.get(t);
        w.sideOf.set(t, side);
        if (prev === undefined || prev === side) continue;
        this.toll(owner, theirs, TOLL_BODY, w.x, t.y, w, t);
      }
    }
  }

  /**
   * One shot at the turnstiles.
   *
   * Billed on the *crossing* rather than on being found inside the band. The band is 30px wide
   * and a rifle round covers twenty of those in a frame, so presence in it was never a reliable
   * test — a fast enough shot simply stepped over the wall and was never charged for it. A shot
   * that spawns inside the band has no previous side to compare against, so that one case still
   * bills on presence.
   */
  private tollShot(owner: Owner, payer: Owner, w: Wall, key: object, x: number, y: number): void {
    if (w.tolledShots.has(key)) return;
    const side = Math.sign(x - w.x) || 1;
    const prev = w.shotSide.get(key);
    w.shotSide.set(key, side);
    const crossed = prev !== undefined && prev !== side;
    if (!crossed && Math.abs(x - w.x) > WALL_HALF) return;
    w.tolledShots.add(key);
    this.toll(owner, payer, TOLL_SHOT, w.x, y, w);
  }

  /**
   * Somebody has just used the turnstile. Take their money and give it to the shopkeeper — and
   * if they have not got any, take it out of them: an unpaid coin is worth `BLOOD_PER_COIN` in
   * damage, which mints its own coins back through the passive at the ordinary rate.
   */
  private toll(owner: Owner, payer: Owner, amount: number, x: number, y: number, w: Wall,
    payerBody?: Fighter): void {
    const from = this.side(payer);
    const paid = Math.min(amount, from.coins);
    w.flash = 1;

    if (paid > 0) {
      from.coins -= paid;
      this.earn(owner, paid);
      w.take += paid;
      this.fx(owner).coinBurst(x, y, Math.min(4, paid), 20, 560);
      this.api.showFloatingText(x, y - 18, `🎫 −${paid}`, this.hex(FOR.gold));
      Sfx.playAt('money', x, { volume: 0.55, rate: 1.4 });
    }
    if (amount - paid > 0) this.bleedToll(payer, amount - paid, x, y, payerBody);
    this.maybeAudit(owner, w);
  }

  /** The other way of paying. Gated, so a burst weapon cannot be billed to death in a second. */
  private bleedToll(payer: Owner, owed: number, x: number, y: number, payerBody?: Fighter): void {
    const from = this.side(payer);
    if (this.now < from.bloodGate) return;
    const body = payerBody ?? this.buyerFor(payer);
    if (!this.alive(body)) return;
    from.bloodGate = this.now + BLOOD_GATE_MS;
    body!.takeDamage(owed * BLOOD_PER_COIN);
    this.api.spawnHitFlash(body!.x, body!.y, FOR.blood);
    this.api.showFloatingText(x, y - 18, `🎫 ${owed * BLOOD_PER_COIN} IN BLOOD`, this.hex(FOR.blood));
    Sfx.playAt('gear-turn', x, { volume: 0.6, rate: 0.8 });
  }

  /**
   * Tax Evasion. A wall that has taken more than ten coins is a wall somebody notices, and the
   * man they send is on the screen for five seconds before he does anything about it.
   */
  private maybeAudit(owner: Owner, w: Wall): void {
    if (w.audited || w.take <= AUDIT_TRIGGER) return;
    if (!this.owns(owner, 'f')) return;
    const s = this.side(owner);
    if (s.audit) return;
    const target = this.targetsOf(owner)
      .sort((a, b) => b.hp - a.hp)[0];
    if (!target) return;

    w.audited = true;
    s.audit = {
      owner,
      target,
      x: Phaser.Math.Clamp(w.x, this.left + 40, this.right - 40),
      firesAt: this.now + AUDIT_AIM_MS,
      flash: 0,
      done: false,
    };
    this.api.showFloatingText(w.x, this.top + 46, '🕵️ AUDIT', this.hex(FOR.blood));
    Sfx.playAt('alarm', w.x, { volume: 0.7 });
  }

  /** The five seconds he takes to be sure, and the one frame in which he is not. */
  private updateAudits(delta: number): void {
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const a = s.audit;
      if (!a) continue;
      a.flash = Math.max(0, a.flash - delta / 240);
      if (a.done) {
        if (a.flash <= 0) s.audit = null;
        continue;
      }
      if (!this.alive(a.target)) { s.audit = null; continue; }
      if (this.now < a.firesAt) continue;

      a.done = true;
      a.flash = 1;
      const t = a.target;
      t.takeDamage(AUDIT_DAMAGE);
      this.chill(t, AUDIT_DEBUFF_MS, AUDIT_SLOW, '🕵️ AUDITED');
      this.audited.set(t, this.now + AUDIT_DEBUFF_MS);
      t.fortuneIncomingMult = AUDIT_VULN;
      this.api.spawnHitFlash(t.x, t.y, FOR.blood);
      this.fx(owner).impact(t.x, t.y, Math.atan2(t.y - this.top, t.x - a.x) + Math.PI, 420);
      this.api.showFloatingText(t.x, t.y - 52, '🎯 ASSESSED', this.hex(FOR.blood));
      Sfx.playAt('shotgun', t.x, { volume: 0.95, rate: 0.7 });
    }
  }

  // ── Pay-to-Win ─────────────────────────────────────────────────────────────

  private updateBeams(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const b = s.beam;
      if (!b) continue;
      const f = this.fighter(owner);

      // Ends on time, on death, or on the money running out — whichever comes first.
      if (!this.alive(f) || this.now >= b.endsAt) { this.endBeam(owner, this.now >= b.endsAt ? 'spent' : 'dead'); continue; }

      const want = Math.atan2(s.aimY - f.y, s.aimX - f.x);
      b.ang = Phaser.Math.Angle.RotateTo(b.ang, want, BEAM_TURN * dt);

      const excess = this.owns(owner, 'q');
      // The bill, taken in whole coins as they come due. Golden Excess makes the drain climb
      // with everything it has already burned, so a full purse goes into it in seconds.
      b.tick += dt * this.beamDrain(b, excess);
      while (b.tick >= 1) {
        b.tick -= 1;
        if (s.coins <= 0) { this.endBeam(owner, 'broke'); break; }
        s.coins--;
        s.spent++;
        b.spent++;
      }
      if (!s.beam) continue;

      const dps = excess ? Math.min(EXCESS_DPS_MAX, BEAM_DPS + b.spent * EXCESS_DPS_PER_COIN) : BEAM_DPS;
      const half = excess ? this.beamHalfAngle(b) : 0;
      for (const t of this.targetsOf(owner)) {
        if (!this.inBeam(f, b, half, t)) continue;
        // The beam is the one source of damage in the element that does not mint coins: it is
        // paid for in them, and paying for it with itself made the ultimate free.
        const before = t.rawDamageTaken;
        t.takeDamage(dps * dt);
        // Recorded as what the meter actually saw rather than as what was asked for, so a hit
        // the target was invincible through does not cancel a real wound on the next frame.
        const landed = t.rawDamageTaken - before;
        if (landed > 0) {
          s.unpaid.set(t, (s.unpaid.get(t) ?? 0) + landed);
          // The one damage figure in the element the grind counts separately, because it is the
          // one you bought rather than fired.
          this.record(owner, 'p2wDamage', landed);
        }
        if (Math.random() < dt * 8) this.api.spawnHitFlash(t.x, t.y, FOR.goldLit);
      }
    }
  }

  /** Coins a second the beam is currently asking for. */
  private beamDrain(b: Beam, excess: boolean): number {
    if (!excess) return BEAM_COINS_PER_SEC;
    return Math.min(EXCESS_DRAIN_MAX, BEAM_COINS_PER_SEC + b.spent * EXCESS_DRAIN_PER_COIN);
  }

  /** Half-angle of the Golden Excess cone, in radians. */
  private beamHalfAngle(b: Beam): number {
    return Math.min(EXCESS_HALF_MAX, EXCESS_HALF0 + b.spent * EXCESS_HALF_PER_COIN);
  }

  /** Inside the line, or inside the wedge once the wedge exists. */
  private inBeam(f: Fighter, b: Beam, half: number, t: Fighter): boolean {
    if (half <= 0) {
      const ex = f.x + Math.cos(b.ang) * BEAM_LEN;
      const ey = f.y + Math.sin(b.ang) * BEAM_LEN;
      return this.distToSegment(t.x, t.y, f.x, f.y, ex, ey) <= BEAM_HALF + 10 * t.sizeMult;
    }
    const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
    if (d > BEAM_LEN + 10 * t.sizeMult) return false;
    const off = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - f.y, t.x - f.x) - b.ang));
    // A body has width: near the emitter that is worth a lot of degrees, far out it is worth
    // almost none, which is what keeps a narrow cone from missing somebody standing on it.
    return off <= half + Math.atan2(BEAM_HALF + 10 * t.sizeMult, Math.max(1, d));
  }

  private endBeam(owner: Owner, why: 'spent' | 'broke' | 'dead'): void {
    const s = this.side(owner);
    if (!s.beam) return;
    const f = this.fighter(owner);
    s.beam = null;
    if (!this.alive(f)) return;
    if (why === 'broke') {
      this.api.showFloatingText(f.x, f.y - 50, '💸 OUT OF MONEY', this.hex(FOR.blood));
      Sfx.playAt('ui-denied', f.x, { volume: 0.8 });
    } else if (why === 'spent') {
      Sfx.playAt('beam-fire', f.x, { volume: 0.5, rate: 0.7 });
    }
  }

  // ── Recoil ─────────────────────────────────────────────────────────────────

  /**
   * The Action Movie Prop. Applied here rather than to the body's velocity because ArenaScene
   * rewrites that from WASD every frame — this runs afterwards, so the push actually lands.
   */
  private updateShoves(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const sh = s.shove;
      if (!sh) continue;
      if (this.now >= sh.until) { s.shove = null; continue; }
      // A rider is being carried by the car, which already wrote their position this frame. A
      // recoil push on top of it would slide them off a roof they are still standing on.
      if (this.isRiding(owner)) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) { s.shove = null; continue; }
      const k = Math.max(0, (sh.until - this.now) / 260);
      const nx = Phaser.Math.Clamp(f.x + sh.vx * dt * k, this.left + 10, this.right - 10);
      const ny = Phaser.Math.Clamp(f.y + sh.vy * dt * k, this.top + 10, this.bottom - 10);
      f.setPosition(nx, ny);
      this.body(f).reset(nx, ny);
    }
  }

  // ── Cure-All / Miracle upkeep ──────────────────────────────────────────────

  private updateItemAuras(): void {
    const wall = Date.now();
    const game = this.now;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const f = s.effectBody ?? this.buyerFor(owner);
      if (!f || !this.alive(f)) continue;

      if (this.now < s.cureUntil) {
        this.cleanse(f);
        this.cured.add(f);
      } else if (this.cured.has(f)) {
        this.cured.delete(f);
      }

      if (this.now < s.miracleUntil) {
        // Only the good half. Doubling the length of everything would hand the enemy's poison
        // twice as long to work, which is the opposite of a miracle.
        stretchNewEffects(f, wall, game, 2, s.miracleSnap, (d) => !isDebuff(d));
      }
    }
  }

  // ── Mastery passive: the Battle Pass ───────────────────────────────────────

  /**
   * Roll this match's ladder, once, lazily.
   *
   * Lazily because `reset()` runs before ArenaScene has finished deciding what the player is
   * carrying, and the ladder reads the upgrade slots to know which items it is allowed to put on
   * it — a pass rolled in `reset` would never stock a Tele-Core.
   */
  private ensurePass(owner: Owner): void {
    const s = this.side(owner);
    if (s.pass.length > 0) return;
    const items = GENERAL.filter((e) => e.id !== 'donation'
      && (!e.needs || this.owns(owner, e.needs)));

    for (let i = 0; i < PASS_TIERS; i++) {
      if ((i + 1) % PASS_PLUS_EVERY === 0) {
        const id = PLUS_ITEMS[Math.floor(Math.random() * PLUS_ITEMS.length)];
        const e = ENTRY_BY_ID.get(id);
        if (e) {
          s.pass.push({ kind: 'plus', id, name: `${e.name}+`, emoji: e.emoji, desc: PLUS_DESC[id] ?? e.desc });
          continue;
        }
      }
      if (items.length > 0 && Math.random() < PASS_ITEM_CHANCE) {
        const e = items[Math.floor(Math.random() * items.length)];
        s.pass.push({ kind: 'item', id: e.id, name: e.name, emoji: e.emoji, desc: e.desc });
        continue;
      }
      const b = PASS_BUFFS[Math.floor(Math.random() * PASS_BUFFS.length)];
      s.pass.push({ kind: 'buff', id: b.id, name: b.name, emoji: b.emoji, desc: b.desc });
    }
  }

  /** Three coins for the next rung of the ladder. Strictly in order — that is the whole shape. */
  private buyPassTier(owner: Owner): boolean {
    if (!this.masteryOn(owner)) return false;
    this.ensurePass(owner);
    const s = this.side(owner);
    const body = this.buyerFor(owner);
    if (!body) return false;

    if (s.passBought >= s.pass.length) {
      if (owner === 'player') {
        this.api.showFloatingText(body.x, body.y - 44, '🎟️ PASS COMPLETE', this.hex(FOR.goldLit));
        Sfx.playAt('ui-denied', body.x, { volume: 0.6 });
      }
      return false;
    }
    if (s.coins < PASS_COST) {
      if (owner === 'player') {
        this.api.showFloatingText(body.x, body.y - 44, `💸 NEED ${PASS_COST - s.coins} MORE`, this.hex(FOR.blood));
        Sfx.playAt('ui-denied', body.x, { volume: 0.7 });
      }
      return false;
    }

    s.coins -= PASS_COST;
    s.spent += PASS_COST;
    const reward = s.pass[s.passBought];
    s.passBought++;
    this.grantPassReward(owner, reward, body);

    this.fx(owner).cash(body.x, body.y - 20, 34, 460, 20);
    this.api.showFloatingText(body.x, body.y - 52,
      `${reward.emoji} ${reward.name.toUpperCase()}`,
      this.hex(reward.kind === 'plus' ? FOR.goldLit : FOR.gold));
    Sfx.playAt(reward.kind === 'plus' ? 'jackpot' : 'ui-purchase', body.x, { volume: 0.85 });
    return true;
  }

  /**
   * What a tier actually hands over. A buff folds into the running totals (or is done to the
   * body once, if it is health); an item and an item⁺ are the ordinary shop path with the flag
   * set, which is why there is no second catalogue of stronger items anywhere in the file.
   */
  private grantPassReward(owner: Owner, reward: PassReward, body: Fighter): void {
    const s = this.side(owner);
    if (reward.kind === 'buff') {
      const buff = PASS_BUFFS.find((b) => b.id === reward.id);
      if (!buff) return;
      buff.boon?.(s.boons);
      if (buff.instant === 'hp') body.increaseMaxHp(PASS_HP);
      if (buff.instant === 'plate') body.shieldHp += PASS_PLATE;
      return;
    }
    const entry = ENTRY_BY_ID.get(reward.id);
    if (!entry) return;
    s.effectBody = body;
    this.applyItem(owner, entry, body, reward.kind === 'plus');
  }

  // ── Mastery ability: Drive by Flex ─────────────────────────────────────────

  private hasCar(s: Side, id: string): boolean { return s.carBuffs.includes(id); }

  /** Whether that side is currently standing on their own roof. */
  private isRiding(owner: Owner): boolean {
    return !!this.sides[owner].car?.rider;
  }

  /**
   * How fast the thing is going. Re-derived every frame rather than baked into the velocity, so
   * a set of Quick Tires bought at the counter speeds up the car already out on the floor.
   */
  private carSpeed(s: Side): number {
    let v = CAR_SPEED;
    if (this.hasCar(s, 'tires')) v *= 1.45;
    if (this.hasCar(s, 'speedster')) v *= 2.4;
    if (this.hasCar(s, 'tank')) v *= 0.45;
    return v;
  }

  private carBounces(s: Side): number {
    let n = CAR_BOUNCES;
    if (this.hasCar(s, 'chassis')) n += 3;
    if (this.hasCar(s, 'speedster')) n += 10;
    if (this.hasCar(s, 'tank')) n += 5;
    return n;
  }

  private carRam(s: Side): number {
    let d = this.hasCar(s, 'spikes') ? CAR_RAM_SPIKED : CAR_RAM;
    if (this.hasCar(s, 'tank')) d *= 2.2;
    return d;
  }

  /** The bound key. One car at a time, and the cooldown does not start until this one is gone. */
  private tryCar(owner: Owner, tx: number, ty: number): boolean {
    const s = this.side(owner);
    const f = this.fighter(owner);
    if (!this.alive(f)) return false;
    if (s.car) {
      if (owner === 'player') {
        this.api.showFloatingText(f.x, f.y - 46, '🚗 ALREADY DRIVING', this.hex(FOR.canvasShade));
      }
      return false;
    }
    if (this.now - s.carCastAt < CAR_COOLDOWN_MS) return false;
    this.spawnCar(owner, Math.atan2(ty - f.y, tx - f.x));
    if (owner === 'player') this.api.broadcastMasteryCast(CAR_ID);
    return true;
  }

  private spawnCar(owner: Owner, ang: number): void {
    const s = this.side(owner);
    const f = this.fighter(owner);
    s.carCastAt = this.now;
    const speed = this.carSpeed(s);
    const bounces = this.carBounces(s);
    s.car = {
      owner,
      x: Phaser.Math.Clamp(f.x + Math.cos(ang) * 44, this.left + CAR_L, this.right - CAR_L),
      y: Phaser.Math.Clamp(f.y + Math.sin(ang) * 44, this.top + CAR_L, this.bottom - CAR_L),
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      bounces,
      maxBounces: bounces,
      rider: false,
      gate: new Map(),
      nextRoboAt: 0,
      nextShellAt: this.now + TANK_EVERY_MS,
      trailAt: 0,
      turret: ang,
      seed: Math.random() * 999,
    };
    this.avatar(owner)?.play('slam', ang);
    this.fx(owner).rift(s.car.x, s.car.y + 8, 26);
    if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 52, '🚗 DRIVE BY FLEX', this.hex(FOR.gold));
    }
    Sfx.playAt('stone-rise', s.car.x, { volume: 0.7, rate: 0.6 });
    Sfx.playAt('robot-power', s.car.x, { volume: 0.8, rate: 0.55 });
  }

  /** Online: the opponent's car, spawned on this sim from their own cast. */
  doNpcDriveBy(tx: number, ty: number): void {
    const f = this.api.npc;
    if (!this.alive(f) || this.sides.npc.car) return;
    this.spawnCar('npc', Math.atan2(ty - f.y, tx - f.x));
  }

  private mount(owner: Owner): void {
    const s = this.side(owner);
    const car = s.car;
    const f = this.fighter(owner);
    if (!car || car.rider || !this.alive(f)) return;
    car.rider = true;
    // Mounted Gunner's rounds go in the moment you are on the roof, not on the next reload.
    if (this.hasCar(s, 'gunner')) {
      for (const hand of this.hands(s)) hand.ammo = Math.min(this.magSize(s, hand), hand.ammo + GUNNER_AMMO);
    }
    this.fx(owner).cash(car.x, car.y - 18, 26, 380, 12);
    if (owner === 'player') this.api.showFloatingText(f.x, f.y - 50, '🚗 ABOARD', this.hex(FOR.goldLit));
    Sfx.playAt('anvil', car.x, { volume: 0.6, rate: 1.4 });
  }

  /** Stepping off, or being thrown off by the thing going up underneath you. */
  private dismount(owner: Owner, thrown = false): void {
    const s = this.side(owner);
    const car = s.car;
    const f = this.fighter(owner);
    if (!car || !car.rider) return;
    car.rider = false;
    // …and the Gunner's extra rounds go back with the roof they came off. `magSize` reads the
    // ride, so this has to run *after* the flag is down.
    for (const hand of this.hands(s)) hand.ammo = Math.min(this.magSize(s, hand), hand.ammo);
    if (!this.alive(f)) return;
    if (thrown) {
      // Off the wreck rather than out of it — a driver is never hurt by their own car.
      const ang = Math.atan2(f.y - car.y, f.x - car.x) || 0;
      s.shove = { vx: Math.cos(ang) * 420, vy: Math.sin(ang) * 420, until: this.now + 260 };
      if (owner === 'player') this.api.showFloatingText(f.x, f.y - 50, '🚗 THROWN CLEAR', this.hex(FOR.gold));
    } else if (owner === 'player') {
      this.api.showFloatingText(f.x, f.y - 50, '🚗 OFF', this.hex(FOR.canvasShade));
    }
    Sfx.playAt('whoosh', f.x, { volume: 0.6, rate: 1.2 });
  }

  /**
   * The car, every frame.
   *
   * It does not steer, it does not chase and it does not stop. Everything the garage sells is
   * read out of `carBuffs` here rather than folded into the object when it spawned, so a buff
   * bought mid-drive applies to the car currently on the floor.
   */
  private updateCars(delta: number): void {
    const dt = delta / 1000;
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const car = s.car;
      if (!car) continue;
      const f = this.fighter(owner);

      // A driver who died is not a driver. The car carries on without them.
      if (car.rider && !this.alive(f)) car.rider = false;

      // Direction is kept; speed is re-read, so Quick Tires does not need a fresh car.
      const speed = this.carSpeed(s);
      const len = Math.hypot(car.vx, car.vy) || 1;
      car.vx = (car.vx / len) * speed;
      car.vy = (car.vy / len) * speed;
      car.x += car.vx * dt;
      car.y += car.vy * dt;

      // The DVD logo. A corner is one bounce and not two, which is why the flag is shared.
      let bounced = false;
      if (car.x < this.left + CAR_L) { car.x = this.left + CAR_L; car.vx = Math.abs(car.vx); bounced = true; }
      else if (car.x > this.right - CAR_L) { car.x = this.right - CAR_L; car.vx = -Math.abs(car.vx); bounced = true; }
      if (car.y < this.top + CAR_L) { car.y = this.top + CAR_L; car.vy = Math.abs(car.vy); bounced = true; }
      else if (car.y > this.bottom - CAR_L) { car.y = this.bottom - CAR_L; car.vy = -Math.abs(car.vy); bounced = true; }
      if (bounced) {
        car.bounces--;
        this.fx(owner).impact(car.x, car.y, Math.atan2(car.vy, car.vx) + Math.PI, 260);
        Sfx.playAt('anvil', car.x, { volume: 0.55, rate: 0.7 });
        if (car.bounces <= 0) { this.wreckCar(owner); continue; }
      }

      // The rider is carried. Written here rather than to their velocity because ArenaScene
      // rewrites that from WASD every frame, and this runs afterwards.
      if (car.rider && this.alive(f)) {
        f.setPosition(car.x, car.y);
        this.body(f).reset(car.x, car.y);
      }

      // Speedster's fire trail, which is the ordinary Spicy Pepper patch with a different owner.
      if (this.hasCar(s, 'speedster') && this.now >= car.trailAt) {
        car.trailAt = this.now + SPEEDSTER_TRAIL_MS;
        this.flames.push({
          owner, x: car.x, y: car.y + 6, seed: Math.random() * 999,
          bornAt: this.now, diesAt: this.now + PEPPER_LIFE_MS, power: 1,
        });
      }

      // The ram.
      const ram = this.carRam(s);
      for (const t of this.targetsOf(owner)) {
        if (Phaser.Math.Distance.Between(car.x, car.y, t.x, t.y) > CAR_L + 12 * t.sizeMult) continue;
        const gate = car.gate.get(t) ?? 0;
        if (this.now < gate) continue;
        car.gate.set(t, this.now + CAR_RAM_GATE_MS);
        t.takeDamage(ram);
        this.api.spawnHitFlash(t.x, t.y, FOR.blood);
        this.fx(owner).impact(t.x, t.y, Math.atan2(car.vy, car.vx), 280);
        this.api.showFloatingText(t.x, t.y - 38, '🚗 RAMMED', this.hex(FOR.blood));
        Sfx.playAt('anvil', t.x, { volume: 0.85, rate: 0.85 });
      }

      // The roof guns. Both of them pick the nearest body inside their own short reach, and the
      // turret is drawn where they are looking rather than where the car is going.
      const near = this.nearestTo(owner, car.x, car.y);
      if (near.target) car.turret = Math.atan2(near.target.y - car.y, near.target.x - car.x);

      if (this.hasCar(s, 'robo') && near.target && near.dist <= ROBO_RANGE && this.now >= car.nextRoboAt) {
        car.nextRoboAt = this.now + ROBO_EVERY_MS;
        this.addBullet(owner, {
          kind: 'slug', x: car.x + Math.cos(car.turret) * 16, y: car.y + Math.sin(car.turret) * 16,
          ang: car.turret, speed: 780, damage: ROBO_DAMAGE, size: 3.6, life: 600,
        });
        this.fx(owner).muzzle(car.x + Math.cos(car.turret) * 18, car.y + Math.sin(car.turret) * 18, car.turret, 0.6);
        Sfx.playAt('musket', car.x, { volume: 0.3, rate: 2.1 });
      }

      if (this.hasCar(s, 'tank') && near.target && near.dist <= TANK_RANGE && this.now >= car.nextShellAt) {
        car.nextShellAt = this.now + TANK_EVERY_MS;
        this.addBullet(owner, {
          kind: 'grenade', x: car.x + Math.cos(car.turret) * 22, y: car.y + Math.sin(car.turret) * 22,
          ang: car.turret, speed: 340, damage: TANK_SHELL_DAMAGE, size: 8,
          blast: TANK_SHELL_R, life: 2200,
          toX: near.target.x, toY: near.target.y,
        });
        this.fx(owner).muzzle(car.x + Math.cos(car.turret) * 26, car.y + Math.sin(car.turret) * 26, car.turret, 1.6);
        Sfx.playAt('shotgun', car.x, { volume: 0.85, rate: 0.6 });
      }
    }
  }

  /** Nearest thing `owner` is allowed to hurt, and how far off it is. */
  private nearestTo(owner: Owner, x: number, y: number): { target: Fighter | null; dist: number } {
    let best: Fighter | null = null;
    let bestD = Infinity;
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return { target: best, dist: bestD };
  }

  /** The last bounce. Everything the car was is now in the air. */
  private wreckCar(owner: Owner): void {
    const s = this.side(owner);
    const car = s.car;
    if (!car) return;
    const suicide = this.hasCar(s, 'suicide');

    // The driver comes off before the car does, so `dismount` still has a car to read.
    if (car.rider) this.dismount(owner, true);
    s.car = null;
    // The cooldown starts from the wreck rather than from the cast — a car that survived a long
    // drive has already been paid for in the time it was out.
    s.carCastAt = this.now;

    this.fx(owner).wreck(car.x, car.y, CAR_DEATH_R * (suicide ? 1.25 : 1));
    Sfx.playAt('explosion-big', car.x, { volume: 0.95, rate: suicide ? 0.72 : 0.95 });
    for (const t of this.targetsOf(owner)) {
      const d = Phaser.Math.Distance.Between(car.x, car.y, t.x, t.y);
      if (d > CAR_DEATH_R) continue;
      t.takeDamage(CAR_DEATH_DAMAGE * (1 - 0.4 * (d / CAR_DEATH_R)));
      this.api.spawnHitFlash(t.x, t.y, FOR.blood);
    }

    if (suicide) {
      for (let i = 0; i < SHRAPNEL_N; i++) {
        const a = (i / SHRAPNEL_N) * TAU_LOCAL + Math.random() * 0.18;
        this.addBullet(owner, {
          kind: 'slug', x: car.x + Math.cos(a) * 12, y: car.y + Math.sin(a) * 12, ang: a,
          speed: 620, damage: SHRAPNEL_DAMAGE, size: 4.2, life: 1100,
        });
      }
      if (owner === 'player') {
        this.api.showFloatingText(car.x, car.y - 46, '💣 SUICIDE MISSION', this.hex(FOR.blood));
      }
    }
  }

  /**
   * The bot's car.
   *
   * Cast off the kit's own timer rather than through the AI, because the car is not an aiming
   * decision — it is thrown at wherever the target happens to be and then stops being anybody's
   * problem. Riding it, though, *is* a decision, and it is the kit's synergy: the whole value of
   * the roof is a faster reload, so the bot climbs on when its magazine is gone and steps off the
   * moment it is loaded again or the fight comes back into range.
   */
  private updateNpcCar(): void {
    if (!this.carSlot('npc')) return;
    const s = this.sides.npc;
    const f = this.api.npc;
    if (!this.alive(f)) return;
    const near = this.nearestTo('npc', f.x, f.y);

    if (!s.car) {
      if (this.now - s.carCastAt < CAR_COOLDOWN_MS || !near.target) return;
      this.tryCar('npc', near.target.x, near.target.y);
      return;
    }

    const car = s.car;
    const reloading = this.now < s.main.reloadUntil || s.main.ammo <= 0;
    if (car.rider) {
      // Off again as soon as the gun is back, or as soon as being carried would take it into a
      // fight it cannot move out of.
      if (!reloading || near.dist < 150) this.dismount('npc');
      return;
    }
    if (!reloading || near.dist < 200) return;
    if (Phaser.Math.Distance.Between(f.x, f.y, car.x, car.y) > CAR_MOUNT_R) return;
    this.mount('npc');
  }

  // ── Bots ───────────────────────────────────────────────────────────────────

  /**
   * Bots and husks shopping. They do not walk to the counter and they do not read the prices —
   * they simply spend, occasionally, on whatever they can afford, which is exactly what the
   * spec asks for and is also the whole reason the shopkeeper's commission ever pays out.
   */
  private updateBots(delta: number): void {
    void delta;
    const shop = this.shopOwner;
    if (!shop) return;
    for (const owner of BOTH) {
      // A human never gets bought for; a Fortune npc buys through its own AI branch instead.
      if (owner === 'player') continue;
      if (owner === shop) { this.botStock(owner); continue; }
      const s = this.sides[owner];
      if (s.botBuyAt === 0) s.botBuyAt = this.now + BOT_BUY_MS;
      if (this.now < s.botBuyAt) continue;
      s.botBuyAt = this.now + BOT_BUY_MS * (0.7 + Math.random() * 0.8);

      const affordable = this.catalogue('shop')
        .filter((e) => e.cost <= s.coins && e.id !== 'donation' && this.canBuy(owner, e));
      if (affordable.length === 0) continue;
      // Bias toward the expensive end of what they can afford — a husk hoarding 19 coins so it
      // can keep buying bandages is not a threat.
      affordable.sort((a, b) => b.cost - a.cost);
      const pick = affordable[Math.random() < 0.6 ? 0 : Math.floor(Math.random() * affordable.length)];
      this.buy(owner, pick);
    }
  }

  /** A Fortune npc restocking itself: guns first, then whatever keeps it alive. */
  private botStock(owner: Owner): void {
    const s = this.sides[owner];
    if (s.botBuyAt === 0) s.botBuyAt = this.now + 4000;
    if (this.now < s.botBuyAt) return;
    s.botBuyAt = this.now + 5000;

    const f = this.fighter(owner);
    if (!this.alive(f)) return;

    // Upgrade the gun whenever it can afford a better one.
    const ladder = ['golden', 'ar', 'rifle', 'revolver'];
    for (const id of ladder) {
      const e = ENTRY_BY_ID.get(id);
      if (!e || s.coins < e.cost || !this.canBuy(owner, e)) continue;
      if (ladder.indexOf(s.main.gun ?? 'pistol') <= ladder.indexOf(id) && s.main.gun !== 'pistol') break;
      this.buy(owner, e);
      return;
    }
    if (s.attachments.length < MAX_ATTACHMENTS) {
      for (const id of ['fiftycal', 'hollow', 'accelgear', 'drummag', 'scope']) {
        const e = ENTRY_BY_ID.get(id);
        if (e && s.coins >= e.cost && this.canBuy(owner, e)) { this.buy(owner, e); return; }
      }
    }
    if (f.hp < f.maxHp * 0.55) {
      const e = ENTRY_BY_ID.get('bandages');
      if (e && s.coins >= e.cost) { this.buy(owner, e); return; }
    }
    // The garage, if it has one. Cheapest-first, so three coins is three buffs rather than none —
    // a bot that saved for a Tank would spend the whole match driving nothing.
    if (this.masteryOn(owner) && s.carBuffs.length < CAR_MAX_BUFFS) {
      for (const id of ['tires', 'spikes', 'chassis', 'suicide', 'robo', 'sunroof']) {
        const e = ENTRY_BY_ID.get(id);
        if (e && s.coins >= e.cost && this.canBuy(owner, e)) { this.buy(owner, e); return; }
      }
    }
    // The pass. A bot has no ribbon to read, but three coins for a stat is a good trade whoever
    // is deciding, so it climbs the ladder with anything it is not saving for a beam.
    if (this.masteryOn(owner) && s.coins >= PASS_COST + 10) {
      this.buyPassTier(owner);
      return;
    }
    if (s.coins >= 8) {
      const e = ENTRY_BY_ID.get('roomba');
      if (e && this.canBuy(owner, e)) this.buy(owner, e);
    }
  }

  // ── Avatars ────────────────────────────────────────────────────────────────

  private updateAvatars(delta: number): void {
    for (const owner of BOTH) {
      const is = this.isFortune(owner);
      const f = this.fighter(owner);
      let av = this.avatar(owner);

      if (!is || !f || !f.active) {
        if (av) { av.destroy(); if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null; }
        continue;
      }
      if (!av) {
        av = new FortuneAvatar(this.api.scene, this.col(owner));
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
        av.setGun(this.sides[owner].main.gun);
      }

      const s = this.sides[owner];
      const target = owner === 'player'
        ? { x: s.aimX, y: s.aimY }
        : (this.targetsOf(owner)[0] ?? { x: s.aimX, y: s.aimY });
      av.setFacing(Math.atan2(target.y - f.y, target.x - f.x));
      av.setWealth(Phaser.Math.Clamp((s.coins + s.bank + s.stocks) / 40, 0, 1));
      av.setGun(this.now < s.main.reloadUntil ? null : s.main.gun);
      av.setMastered(owner === 'player' ? this.api.masteryActive : this.api.npcMasteryActive);
      // The revolver being spun up reads as the same wound-up posture as the beam.
      av.setIntensity(s.beam ? 1.4 : s.spinFrom > 0 ? 1.25 : 1);
      // The beam is cupped in both hands; a gun that has gone off in the last second is held in
      // a two-handed stance. Anything else and the arms go back to the rig's idle sway.
      const aim = Math.atan2(target.y - f.y, target.x - f.x);
      av.setHold(s.beam ? 'ride' : this.now - s.lastShotAt < 900 ? 'brace' : null, s.beam?.ang ?? aim);
      av.update(delta, f.x, f.y, f.alpha);
    }
  }

  // ── Painting ───────────────────────────────────────────────────────────────

  private paintGround(): void {
    const g = this.groundGfx;
    if (!g) return;
    g.clear();

    // The fire trail, oldest first so a fresh dab sits on top of a dying one.
    for (const fl of this.flames) {
      const age = (this.now - fl.bornAt) / PEPPER_LIFE_MS;
      const a = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;
      pepperFlame(g, this.col(fl.owner), fl.x, fl.y, 15 * (1 - age * 0.4), Math.max(0, a) * 0.9,
        { t: this.vizT, seed: fl.seed });
    }

    // Heal Pylons stand on the floor, and are walked in front of.
    for (const p of this.pylons) {
      healPylon(g, this.col(p.owner), p.x, p.y, 1,
        { t: this.vizT + p.seed, ready: this.now >= p.readyAt ? 1 : 0 });
    }

    // The paywall's footings, which are on the floor even though its heads are not.
    for (const owner of BOTH) {
      const w = this.sides[owner].wall;
      if (!w) continue;
      const left = this.remainingRatio(w.diesAt, w.span);
      g.fillStyle(this.col(owner)(FOR.gold), 0.1 + left * 0.12);
      g.fillRect(w.x - WALL_HALF, this.top, WALL_HALF * 2, this.bottom - this.top);
      g.lineStyle(2, this.col(owner)(FOR.gold), 0.35 + left * 0.35);
      g.lineBetween(w.x - WALL_HALF, this.top, w.x - WALL_HALF, this.bottom);
      g.lineBetween(w.x + WALL_HALF, this.top, w.x + WALL_HALF, this.bottom);
    }

    // The stall itself.
    const shop = this.shopOwner;
    if (shop) {
      const s = this.sides[shop];
      stall(g, this.col(shop), this.stallX, this.stallY, 96, 1, {
        t: this.vizT,
        illegal: shop === 'player' && s.page !== 'shop',
        stock: 5 - Math.min(5, Math.floor(s.spent / 12)),
      });
    }
  }

  private paintAir(): void {
    const g = this.airGfx;
    if (!g) return;
    g.clear();

    for (const b of this.bullets) {
      const ang = Math.atan2(b.vy, b.vx);
      const col = this.col(b.owner);
      if (b.kind === 'grenade') {
        grenadeShape(g, col, b.x, b.y, ang, 1, { spin: b.spin, size: b.size });
      } else if (b.kind === 'clip') {
        // The thrown magazine: a box tumbling end over end with its rounds showing.
        grenadeShape(g, col, b.x, b.y, ang, 1, { spin: b.spin * 1.6, size: b.size * 0.8 });
        g.fillStyle(FOR.brass, 0.9);
        g.fillCircle(b.x, b.y, 2.6);
      } else if (b.kind === 'laser') {
        bouncyBolt(g, col, b.x, b.y, ang, b.size, 1,
          { charge: b.bounces / LASER_BOUNCES, t: this.vizT });
      } else if (b.kind === 'midas') {
        midasBullet(g, col, b.x, b.y, ang, 1, { t: this.vizT, seed: b.seed, size: b.size });
      } else if (b.bounces > 0) {
        bouncyBolt(g, col, b.x, b.y, ang, b.size, 1, { charge: b.bounces / BOUNCE_MAX, t: this.vizT });
      } else {
        bulletShape(g, col, b.x, b.y, ang, b.size, 1,
          { seed: b.seed, color: b.pierce ? FOR.goldLit : FOR.steel, tracer: b.pierce ? 1.6 : 1 });
      }
    }

    // Gilded bodies, drawn under whoever the Midas round caught.
    for (const [f, until] of this.gilded) {
      if (!this.alive(f) || this.now >= until) continue;
      gildedAura(g, this.pcol, f.x, f.y, 22 * f.sizeMult, 1, { t: this.vizT });
    }
    for (const d of this.daggers) {
      daggerShape(g, this.col(d.owner), d.x, d.y, d.ang, 1);
    }
    for (const r of this.roombas) {
      const angry = this.targetsOf(r.owner).some(
        (t) => Phaser.Math.Distance.Between(r.x, r.y, t.x, t.y) < 90) ? 1 : 0;
      roombaShape(g, this.col(r.owner), r.x, r.y, r.ang, 1, { spin: r.spin, angry });
    }

    // The car. Every garage buff is bolted on somewhere you can see it, and the paint darkens
    // as the bounces run out.
    for (const owner of BOTH) {
      const s = this.sides[owner];
      const car = s.car;
      if (!car) continue;
      rustyCar(g, this.col(owner), car.x, car.y, Math.atan2(car.vy, car.vx), 1, {
        t: this.vizT + car.seed,
        wear: 1 - Phaser.Math.Clamp(car.bounces / Math.max(1, car.maxBounces), 0, 1),
        rider: car.rider,
        spikes: this.hasCar(s, 'spikes'),
        tires: this.hasCar(s, 'tires'),
        tank: this.hasCar(s, 'tank'),
        speedster: this.hasCar(s, 'speedster'),
        gunner: this.hasCar(s, 'gunner'),
        robo: this.hasCar(s, 'robo'),
        sunroof: this.hasCar(s, 'sunroof'),
        turret: car.turret,
      });
    }

    // Turnstiles, spaced down the arena with their phases offset so the wall reads as a row of
    // separate machines rather than one long texture.
    for (const owner of BOTH) {
      const w = this.sides[owner].wall;
      if (!w) continue;
      const left = this.remainingRatio(w.diesAt, w.span);
      const span = this.bottom - this.top;
      const n = Math.max(3, Math.round(span / 74));
      for (let i = 0; i < n; i++) {
        const y = this.top + ((i + 0.5) / n) * span;
        turnstile(g, this.col(owner), w.x, y, 0.35 + left * 0.65,
          { spin: this.vizT * 1.4 + i * 1.1 + w.seed, hot: w.flash });
      }
    }

    // The auditor, lying at the very top of the arena with a laser on somebody.
    for (const owner of BOTH) {
      const a = this.sides[owner].audit;
      if (!a) continue;
      const t = a.target;
      const ay = this.top - 6;
      const ang = Math.atan2(t.y - ay, t.x - a.x);
      auditor(g, this.col(owner), a.x, ay, ang, 1, { fired: a.done ? a.flash : 0 });
      if (!a.done) {
        const lock = Phaser.Math.Clamp(1 - (a.firesAt - this.now) / AUDIT_AIM_MS, 0, 1);
        auditMark(g, this.col(owner), a.x + Math.cos(ang) * 30, ay + Math.sin(ang) * 30,
          t.x, t.y, 1, { t: this.vizT, lock });
      }
    }

    for (const owner of BOTH) {
      const b = this.sides[owner].beam;
      if (!b) continue;
      const f = this.fighter(owner);
      if (!this.alive(f)) continue;
      const mz = { x: f.x + Math.cos(b.ang) * 26, y: f.y + Math.sin(b.ang) * 26 };
      const half = this.owns(owner, 'q') ? this.beamHalfAngle(b) : 0;
      if (half > 0) {
        goldCone(g, this.col(owner), mz.x, mz.y, b.ang, BEAM_LEN, half, 1,
          { t: this.vizT, heat: Math.min(1, b.spent / 90) });
      } else {
        goldBeam(g, this.col(owner), mz.x, mz.y, b.ang, BEAM_LEN, BEAM_HALF, 1,
          { t: this.vizT, seed: owner === 'player' ? 1 : 2 });
      }
    }
  }

  private remainingRatio(diesAt: number, span: number): number {
    return Phaser.Math.Clamp((diesAt - this.now) / span, 0, 1);
  }

  // ── The counter ────────────────────────────────────────────────────────────

  /**
   * The shop panel. Drawn in world space above the stall, and only while somebody is standing
   * close enough to be served — it is a market stall, not a menu, so walking away closes it.
   */
  private paintShop(shop: Owner | null): void {
    const { scene } = this.api;
    const p = this.api.player;
    const near = !!shop && this.alive(p)
      && Phaser.Math.Distance.Between(p.x, p.y, this.stallX, this.stallY) <= SHOP_RANGE;

    if (!near || !shop) {
      this.shopGfx?.setVisible(false);
      for (const t of this.shopTexts) t.setVisible(false);
      return;
    }

    const s = this.sides.player;
    const mine = shop === 'player';
    const page: Page = mine ? s.page : 'shop';
    const list = this.catalogue(page);
    const accent = page === 'shop' ? FOR.gold : FOR.neon;

    // Sized off the longest row rather than off the stall: an item line is a name, a price and
    // a one-line description, and a description that wraps out of the box is worse than no box.
    const W = 400;
    const rowH = 18;
    const H = 38 + list.length * rowH + 16;
    const x = Phaser.Math.Clamp(this.stallX - W / 2, 8, this.api.width - W - 8);
    const y = Phaser.Math.Clamp(this.stallY - 62 - H, 8, this.api.height - H - 8);

    if (!this.shopGfx) this.shopGfx = scene.add.graphics().setDepth(24);
    const g = this.shopGfx.setVisible(true);
    g.clear();
    g.fillStyle(FOR.ink, 0.9);
    g.fillRect(x, y, W, H);
    g.lineStyle(2, this.col(shop)(accent), 0.9);
    g.strokeRect(x, y, W, H);
    // Tab strip across the top. The two illegal tabs are only drawn for their owner.
    const tabs: Page[] = mine ? PAGES : ['shop'];
    const tw = W / tabs.length;
    for (let i = 0; i < tabs.length; i++) {
      const on = tabs[i] === page;
      g.fillStyle(this.col(shop)(tabs[i] === 'shop' ? FOR.gold : FOR.contraband), on ? 0.85 : 0.2);
      g.fillRect(x + i * tw + 2, y + 2, tw - 4, 16);
    }
    // A row of gutters so the eye can find the number keys.
    for (let i = 0; i < list.length; i++) {
      const ry = y + 36 + i * rowH;
      const owned = !this.canBuy('player', list[i]);
      const poor = s.coins < list[i].cost;
      g.fillStyle(owned ? FOR.soot : poor ? FOR.bloodDark : FOR.timber, owned ? 0.5 : poor ? 0.35 : 0.45);
      g.fillRect(x + 4, ry - 2, W - 8, rowH - 3);
    }

    // Text rows: header, one per item, footer.
    const wanted = list.length + 2;
    while (this.shopTexts.length < wanted) {
      this.shopTexts.push(scene.add.text(0, 0, '', { fontSize: '11px', color: '#ffffff' }).setDepth(25));
    }
    for (const t of this.shopTexts) t.setVisible(false);

    const head = this.shopTexts[0];
    head.setVisible(true).setPosition(x + 8, y + 20)
      .setText(`${PAGE_NAME[page]}  ·  🪙 ${s.coins}${mine ? '   [T] TAB' : ''}`);
    this.tintRow(0, this.hex(accent), '11px', true);

    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const t = this.shopTexts[i + 1];
      const owned = !this.canBuy('player', e);
      const poor = s.coins < e.cost;
      t.setVisible(true).setPosition(x + 8, y + 36 + i * rowH)
        .setText(`${ROW_KEYS[i] ?? '·'} ${e.emoji} ${e.name} — ${e.cost === 0 ? 'FREE' : `${e.cost}🪙`}  ${e.desc}`);
      this.tintRow(i + 1, owned ? '#7d7466' : poor ? '#b3202e' : '#ffffff', '10px', false);
    }

    const foot = this.shopTexts[list.length + 1];
    const mods = s.attachments.map((a) => ENTRY_BY_ID.get(a)?.emoji ?? '?').join(' ') || '—';
    foot.setVisible(true).setPosition(x + 8, y + H - 15)
      .setText(mine ? `${this.handLine(s, s.main)}${s.off ? `  ✚  ${this.handLine(s, s.off)}` : ''} · ${mods}`
        : 'the shopkeeper takes half of everything you spend');
    this.tintRow(list.length + 1, '#c9bda6', '10px', false);
  }

  /**
   * Restyle one row, but only when it has actually changed. `setStyle` rebuilds the text's
   * canvas texture every call, and this panel has eleven rows that are otherwise static — doing
   * it unguarded costs more per frame than everything else the kit draws put together.
   */
  /** One hand's line on the counter: what it is holding and how much of it is left. */
  private handLine(s: Side, hand: Hand): string {
    const name = hand.gun ? (ENTRY_BY_ID.get(hand.gun)?.name ?? hand.gun) : 'none';
    return `${name} ${hand.ammo}/${this.magSize(s, hand)}`;
  }

  private tintRow(i: number, color: string, size: string, bold: boolean): void {
    const key = `${color}|${size}|${bold}`;
    if (this.shopColors[i] === key) return;
    this.shopColors[i] = key;
    this.shopTexts[i].setStyle({ fontSize: size, color, fontStyle: bold ? 'bold' : 'normal' });
  }

  // ── The battle pass ribbon ─────────────────────────────────────────────────

  /**
   * The pass, across the top of the screen.
   *
   * Not a panel you open — it is simply there, all match, because the whole point of it is that
   * it is the one place your money goes that does not require you to walk to the middle of the
   * room. Thirty notches, one per tier, and the only text is what the next one is and what it
   * costs: the ribbon carries the rest.
   */
  private paintPass(): void {
    const { scene } = this.api;
    const s = this.sides.player;
    const on = this.masteryOn('player') && this.alive(this.api.player) && s.pass.length > 0;

    if (!on) {
      this.passGfx?.setVisible(false);
      for (const t of this.passTexts) t.setVisible(false);
      return;
    }

    if (!this.passGfx) this.passGfx = scene.add.graphics().setDepth(23);
    while (this.passTexts.length < 2) {
      this.passTexts.push(scene.add.text(0, 0, '', {
        fontSize: '11px', fontFamily: 'Arial Black', color: '#ffffff',
      }).setDepth(24));
    }
    const g = this.passGfx.setVisible(true);
    g.clear();

    // Threaded between the furniture that is already up there: the "YOU"/"ENEMY" labels sit at
    // y=20 and the status tray's first row starts at y=60, so the ribbon takes the strip in
    // between and the line about the next tier goes above it, between the two labels.
    const pad = 90;
    const y = 44;
    const span = this.api.width - pad * 2;
    const step = span / PASS_TIERS;
    const w = Math.max(4, step - 4);

    g.fillStyle(FOR.ink, 0.72);
    g.fillRect(pad - 10, y - 14, span + 20, 28);
    g.lineStyle(1.4, this.pcol(FOR.brass), 0.7);
    g.strokeRect(pad - 10, y - 14, span + 20, 28);

    for (let i = 0; i < PASS_TIERS; i++) {
      const state = i < s.passBought ? 'owned' : i === s.passBought ? 'next' : 'locked';
      passTier(g, this.pcol, pad + step * (i + 0.5), y, w, 14, 1, {
        state, plus: (i + 1) % PASS_PLUS_EVERY === 0, t: this.vizT,
      });
    }

    const next = s.pass[s.passBought];
    const head = this.passTexts[0];
    head.setVisible(true).setOrigin(0, 0.5).setPosition(this.api.width - pad + 14, y)
      .setText(`🎟️ ${s.passBought}/${PASS_TIERS}`);
    // `setStyle` rebuilds the text's canvas texture, so both rows are guarded the same way the
    // counter's eleven are.
    if (this.passColors[0] !== 'h') {
      this.passColors[0] = 'h';
      head.setStyle({ fontSize: '11px', fontFamily: 'Arial Black', color: this.hex(FOR.goldLit) });
    }

    const foot = this.passTexts[1];
    foot.setVisible(true).setOrigin(0.5, 0.5).setPosition(this.api.width / 2, 20)
      .setText(next
        ? `[B] ${PASS_COST}🪙 — ${next.emoji} ${next.name}: ${next.desc}`
        : 'PASS COMPLETE');
    const tone = !next ? this.hex(FOR.goldLit)
      : s.coins < PASS_COST ? '#b3202e'
        : next.kind === 'plus' ? this.hex(FOR.goldLit) : this.hex(FOR.canvas);
    if (this.passColors[1] !== tone) {
      this.passColors[1] = tone;
      foot.setStyle({ fontSize: '10px', fontFamily: 'Arial Black', color: tone });
    }
  }

  // ── Status tray ────────────────────────────────────────────────────────────

  private pushStatuses(shop: Owner | null): void {
    const s = this.sides.player;
    const mine = shop === 'player';

    this.api.setStatusIndicator('fortune-coins', shop ? {
      name: 'Blood Coins', emoji: '🪙', color: FOR.gold,
      description: `Every 20 damage you deal mints 1 blood coin. Spend them at the stall in the middle of the arena — stand next to it and press 1–8.${mine ? ' Press T to reach the illegal pages.' : ' Half of everything you spend goes to the shopkeeper.'}`,
      count: s.coins, priority: 150,
    } : null);

    this.api.setStatusIndicator('fortune-bank', shop && s.bank > 0 ? {
      name: 'Banked', emoji: '🏦', color: FOR.brass,
      description: 'Coins in the bank. Every 10 seconds the balance pays out 10% of itself, never less than 1. Hold E to take it all back.',
      count: s.bank, priority: 151,
    } : null);

    this.api.setStatusIndicator('fortune-stocks', shop && s.stocks > 0 ? {
      name: 'Invested', emoji: '📈', color: FOR.contraband,
      description: 'Coins in the market. Every 10 seconds: +20% if you dealt over 50 damage, −20% if you took over 100, +10% if both. Hold R to cash out.',
      count: s.stocks, priority: 152,
    } : null);

    const gunName = ENTRY_BY_ID.get(s.main.gun ?? '')?.name ?? 'Unarmed';
    const alt = s.main.gun ? GUNS[s.main.gun]?.alt : undefined;
    this.api.setStatusIndicator('fortune-gun', mine ? {
      name: gunName, emoji: '🔫', color: FOR.steel,
      description: `Your loadout: ${gunName}${s.attachments.length ? ` with ${s.attachments.map((a) => ENTRY_BY_ID.get(a)?.name).join(' and ')}` : ''}. One gun and two attachments at a time.${alt && this.owns('player', 'click') ? ` Right click — ${alt}.` : ''}`,
      count: this.now < s.main.reloadUntil ? 0 : s.main.ammo, suffix: `/${this.magSize(s, s.main)}`, priority: 153,
    } : null);

    this.api.setStatusIndicator('fortune-offhand', mine && s.off ? {
      name: `${ENTRY_BY_ID.get(s.off.gun ?? '')?.name ?? 'Off hand'} (right)`, emoji: '🤞', color: FOR.neon,
      description: 'Dual Grip: your right hand has a gun of its own, with its own magazine and its own reload. Right click fires it.',
      count: this.now < s.off.reloadUntil ? 0 : s.off.ammo, suffix: `/${this.magSize(s, s.off)}`, priority: 154,
    } : null);

    // The gear's whole point is that the number moves, so it gets a box of its own rather than
    // a line in the loadout description: the percentage is the reason to keep the trigger down.
    this.api.setStatusIndicator('fortune-accel', mine && s.attachments.includes('accelgear') ? {
      name: 'Acceleration Gear', emoji: '⚙️', color: FOR.steel,
      description: `Your weapons cycle faster the emptier the magazine is — normal speed on a full one, ${ACCEL_MAX}× on the last round in it. Reloading hands the speed back. It works on both hands, and on the revolver's spun round.`,
      count: Math.round(this.accelMult(s, s.main, s.main.ammo) * 100), suffix: '%', priority: 156,
    } : null);

    this.api.setStatusIndicator('fortune-dual', mine && s.dualPending ? {
      name: 'Dual Grip', emoji: '🤞', color: FOR.neon,
      description: 'Waiting on a gun. The next weapon you buy goes into your right hand instead of replacing the one you are holding.',
      priority: 155,
    } : null);

    this.api.setStatusIndicator('fortune-spin', mine && s.spinFrom > 0 ? {
      name: 'Spinning Up', emoji: '🎯', color: FOR.goldLit,
      description: 'Holding right click winds the revolver. Three seconds walks the round from 20 damage to 30, and a full charge pierces. Release to fire it.',
      count: Math.round(Math.min(1, (this.now - s.spinFrom) / SPIN_MS) * 100), suffix: '%', priority: 107,
    } : null);

    this.api.setStatusIndicator('fortune-chilly', this.now < s.chillyUntil ? {
      name: 'Chilly Pepper', emoji: '🥶', color: 0x9fe4ff,
      description: 'Every 3 seconds you throw out a freezing ring. Anything of theirs it catches moves 20% slower for 5 seconds.',
      until: s.chillyUntil, priority: 126,
    } : null);

    this.api.setStatusIndicator('fortune-tele', this.now < s.teleUntil ? {
      name: 'Tele-Core', emoji: '🌀', color: FOR.neon,
      description: 'Your dash is a teleport. Space puts you at the cursor rather than throwing you in a direction.',
      until: s.teleUntil, priority: 127,
    } : null);

    const minePylons = this.pylons.filter((p) => p.owner === 'player').length;
    this.api.setStatusIndicator('fortune-pylon', minePylons > 0 ? {
      name: 'Heal Pylons', emoji: '🗼', color: FOR.neon,
      description: 'Touch a lit pylon to heal 10 HP. It goes dark for 5 seconds and lights green again when it has another charge in it.',
      count: minePylons, priority: 128,
    } : null);

    this.api.setStatusIndicator('fortune-airborne', this.now < s.airborneUntil ? {
      name: 'Exit Strategy', emoji: '🚀', color: FOR.goldLit,
      description: 'You are somewhere above the arena. Nothing can see you and nothing can touch you until you come down.',
      until: s.airborneUntil, priority: 108,
    } : null);

    this.api.setStatusIndicator('fortune-audit', s.audit ? {
      name: 'Audit', emoji: '🕵️', color: FOR.blood,
      description: 'A man with a rifle is sighted on your enemy. When the laser settles it is 35 damage, a 20% slow, and 20% extra damage taken for 8 seconds.',
      until: s.audit.firesAt, priority: 109,
    } : null);

    // …and the same rifle pointed the other way, when the shopkeeper is the one across the room.
    const marked = this.audited.get(this.api.player) ?? 0;
    this.api.setStatusIndicator('fortune-assessed', this.now < marked ? {
      name: 'Assessed', emoji: '🎯', color: FOR.blood,
      description: 'The revenue service has taken an interest. You move 20% slower and take 20% more damage from everything.',
      until: marked, priority: 40,
    } : null);

    this.api.setStatusIndicator('fortune-pepper', this.now < s.pepperUntil ? {
      name: 'Spicy Pepper', emoji: '🌶️', color: FOR.blood,
      description: 'You are burning a trail wherever you walk. Anything of theirs that stands in it catches fire.',
      until: s.pepperUntil, priority: 121,
    } : null);

    this.api.setStatusIndicator('fortune-pouch', s.pouch > 0 ? {
      name: 'Explosives Pouch', emoji: '🧨', color: FOR.gold,
      description: 'Your next hits each set off a blast around the body you hit, worth the same damage — to everyone ELSE standing near them.',
      count: s.pouch, priority: 122,
    } : null);

    this.api.setStatusIndicator('fortune-cure', this.now < s.cureUntil ? {
      name: 'Cure-All', emoji: '🧪', color: FOR.neon,
      description: 'Nothing negative can stick to you. Every debuff is scrubbed off the moment it lands.',
      until: s.cureUntil, priority: 123,
    } : null);

    this.api.setStatusIndicator('fortune-miracle', this.now < s.miracleUntil ? {
      name: 'The Miracle', emoji: '🏺', color: FOR.goldLit,
      description: 'Every good thing counts double: buffs last twice as long, heals are twice the size, and both investments pay twice the rate.',
      until: s.miracleUntil, priority: 124,
    } : null);

    const mineRoombas = this.roombas.filter((r) => r.owner === 'player').length;
    this.api.setStatusIndicator('fortune-roomba', mineRoombas > 0 ? {
      name: 'Death Machines', emoji: '🤖', color: FOR.steel,
      description: 'Knife-armed vacuums hunting for your enemy. 25 damage to anything they touch.',
      count: mineRoombas, priority: 125,
    } : null);

    this.api.setStatusIndicator('fortune-paywall', s.wall ? {
      name: 'Paywall', emoji: '🎫', color: FOR.gold,
      description: 'Your turnstiles are up. Enemy shots through them cost 1 coin, enemy bodies cost 3, and all of it is paid to you.',
      until: s.wall.diesAt, priority: 126,
    } : null);

    this.api.setStatusIndicator('fortune-beam', s.beam ? {
      name: 'Pay-to-Win', emoji: '💰', color: FOR.goldLit,
      description: 'The golden beam is open. It burns everything it touches and 6 blood coins a second, and it stops the instant you cannot pay.',
      until: s.beam.endsAt, priority: 110,
    } : null);

    // ── Mastery ──
    const passOn = this.masteryOn('player');
    this.api.setStatusIndicator('fortune-pass', passOn ? {
      name: 'Battle Pass', emoji: '🎟️', color: FOR.goldLit,
      description: `The ribbon across the top of the screen. Press B anywhere in the arena to buy the next tier for ${PASS_COST} coins — strictly in order. Most tiers are stat buffs that last the match and stack; some are free shop items; every fifth is an item⁺, a stronger version of something on the public shelf. The whole ladder is rolled fresh every match.`,
      count: s.passBought, suffix: `/${PASS_TIERS}`, priority: 157,
    } : null);

    const buffLine = [
      s.boons.damage !== 1 ? `damage ×${s.boons.damage.toFixed(2)}` : '',
      s.boons.rate !== 1 ? `fire rate ×${s.boons.rate.toFixed(2)}` : '',
      s.boons.reload !== 1 ? `reload ×${s.boons.reload.toFixed(2)}` : '',
      s.boons.mag ? `+${s.boons.mag} magazine` : '',
      s.boons.speed !== 1 ? `speed ×${s.boons.speed.toFixed(2)}` : '',
      s.boons.coin !== 1 ? `coin rate ×${s.boons.coin.toFixed(2)}` : '',
      s.boons.interest ? `+${Math.round(s.boons.interest * 100)}% interest` : '',
      s.boons.settle !== 1 ? `settles ×${s.boons.settle.toFixed(2)}` : '',
      s.boons.scavenge ? `+${s.boons.scavenge} coin per reload` : '',
      s.boons.pierce ? 'bullets pierce' : '',
    ].filter(Boolean).join(', ');
    this.api.setStatusIndicator('fortune-boons', passOn && buffLine ? {
      name: 'Pass Perks', emoji: '📈', color: FOR.brass,
      description: `Everything the pass has handed you so far: ${buffLine}.`,
      count: s.passBought, priority: 158,
    } : null);

    const car = s.car;
    this.api.setStatusIndicator('fortune-car', car ? {
      name: car.rider ? 'Riding' : 'Drive by Flex', emoji: '🚗', color: FOR.timberLit,
      description: car.rider
        ? `You are on the roof. ${this.hasCar(s, 'sunroof') ? '60% faster reload, 70% faster trigger and +20% damage' : '40% faster reload and a 35% faster trigger'}${this.hasCar(s, 'gunner') ? `, plus ${GUNNER_AMMO} extra rounds` : ''}. Space to step off. The car keeps driving either way.`
        : `The car is out. It rams for ${Math.round(this.carRam(s))} and comes off the walls until it runs out of bounces, then it explodes. Press Space within ${CAR_MOUNT_R}px of it to climb on.`,
      count: car.bounces, suffix: ' bounces', priority: 111,
    } : null);

    this.api.setStatusIndicator('fortune-garage', passOn && s.carBuffs.length > 0 ? {
      name: 'Garage', emoji: '🔧', color: FOR.steel,
      description: `Bolted onto the car: ${s.carBuffs.map((b) => ENTRY_BY_ID.get(b)?.name ?? b).join(', ')}. Three is the limit, and it is a limit for the whole match.`,
      count: s.carBuffs.length, suffix: `/${CAR_MAX_BUFFS}`, priority: 159,
    } : null);

    // The other side of the counter: what a Fortune npc is holding, so a player can see the
    // commission they are funding.
    const foe = this.sides.npc;
    this.api.setStatusIndicator('fortune-keeper', shop === 'npc' ? {
      name: 'Shopkeeper', emoji: '🏪', color: FOR.blood,
      description: 'Their purse. Half of everything you buy at their stall goes straight into it, and the golden pistol they might be carrying is priced off it.',
      count: foe.coins + foe.bank + foe.stocks, priority: 3,
    } : null);
  }

  // ── Accessors read by ArenaScene / the NPC ─────────────────────────────────

  /** Ability tray fill — the two abilities that show a state rather than a cooldown. */
  getBarRatio(abilityId: string, time: number): number {
    const p = this.api.player;
    const s = this.sides.player;
    if (abilityId === 'fortune-paywall' && s.wall) {
      return Phaser.Math.Clamp((s.wall.diesAt - time) / s.wall.span, 0, 1);
    }
    if (abilityId === 'fortune-p2w' && s.beam) {
      return Phaser.Math.Clamp((s.beam.endsAt - time) / BEAM_MS, 0, 1);
    }
    if (abilityId === 'fortune-fire' && time < s.main.reloadUntil) {
      // Counted off the reload actually running, not the gun's catalogue figure — a Speed Sling
      // and a car roof both shorten it.
      return Phaser.Math.Clamp((s.main.reloadUntil - time) / Math.max(1, s.main.reloadSpan), 0, 1);
    }
    // A car on the floor counts its own bounces down; the cooldown only starts once it is gone.
    if (abilityId === CAR_ID) {
      if (s.car) return Phaser.Math.Clamp(s.car.bounces / Math.max(1, s.car.maxBounces), 0, 1);
      return Phaser.Math.Clamp((time - s.carCastAt) / CAR_COOLDOWN_MS, 0, 1);
    }
    return p.getCooldownRatio(abilityId);
  }

  /** Coins on that side, for the bot's "can I afford to open the beam" check. */
  coinsOf(owner: Owner): number { return this.sides[owner].coins; }
  bankOf(owner: Owner): number { return this.sides[owner].bank; }
  stocksOf(owner: Owner): number { return this.sides[owner].stocks; }
  /** True while the beam is open — the npc must keep facing its target and stop dodging about. */
  isBeaming(owner: Owner): boolean { return !!this.sides[owner].beam; }
  hasWall(owner: Owner): boolean { return !!this.sides[owner].wall; }
  /**
   * Whether the mastery car has taken that side's bank key. Read by `doFortuneAbilities` so the
   * bot never spends a turn on a cast the kit is going to refuse — a refused cast still stamps
   * and voices itself.
   */
  bankTaken(owner: Owner): boolean { return this.carSlot(owner) === 'e'; }
  /**
   * Rounds the bot could actually put downrange this frame. Deliberately zero while the gun is
   * cycling as well as while it is reloading: a refused cast still stamps and voices itself, so
   * the AI has to be told "not yet" rather than be allowed to find out.
   */
  ammoOf(owner: Owner): number {
    return this.canFireNow(owner) ? this.sides[owner].main.ammo : 0;
  }

  /** Tele-Core (E+): Space is a teleport to the cursor rather than a dash, for 12 seconds. */
  isTeleportDash(): boolean {
    return this.now < this.sides.player.teleUntil;
  }

  /** Off the floor after an Exit Strategy — ArenaScene hides the HUD ring for it. */
  isAirborne(owner: Owner): boolean {
    return this.now < this.sides[owner].airborneUntil;
  }

  /**
   * The Chilly Pepper's ring and the auditor's rifle, on whoever is wearing them. Pulled by
   * ArenaScene rather than pushed, because both bodies' movement resolves before this kit's
   * `update` gets to run — the husks in Invasion read `walkSpeedMult` directly instead.
   */
  getPlayerSpeedMult(): number {
    const c = this.chilled.get(this.api.player);
    return (c && this.now < c.until ? c.mult : 1) * this.sides.player.boons.speed;
  }

  getNpcSpeedMult(): number {
    const c = this.chilled.get(this.api.npc);
    return (c && this.now < c.until ? c.mult : 1) * this.sides.npc.boons.speed;
  }
}
