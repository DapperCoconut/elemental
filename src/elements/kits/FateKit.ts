import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';
import type { CastContext } from '../Ability';
import { TAU } from './ElementVisuals';
import {
  ArmGesture, CardTones, FATE, FateAura, FateAvatar, FateColorFn, FateFx,
  HOUSE_TONES, NPC_TONES, Suit, TAROT_TONES, fateCardLayered, suitGlyph, tonesFor,
} from './FateVisuals';
// Ash (divine perk) burns discarded cards — real fire, so it borrows fire's own painter
// rather than approximating one out of the card palette.
import { FireFx, FIRE } from './FireVisuals';

// Stub context passed to castAbility() so that cast() calls become no-ops.
// FateKit handles the real logic itself; cast() just needs to not throw.
const FATE_STUB_CTX: CastContext = new Proxy({} as CastContext, {
  get: (_t, _k) => () => {},
});

// ── Card catalogue ────────────────────────────────────────────────────────────

export type FateCardType =
  // ── Base ten (always drawable) ──
  | 'laser' | 'burst' | 'barrier' | 'explosion' | 'infect'
  | 'coin' | 'heal' | 'buff' | 'lightning' | 'slots'
  // ── New Cards! (Click+ upgrade adds these to the draw pool) ──
  | 'boomerang' | 'slash' | 'phase' | 'striker'
  | 'pulse' | 'chill' | 'chain' | 'emperor';

export interface FateCardDef {
  type: FateCardType;
  name: string;
  emoji: string;
  color: number;
  blurb: string;
}

export const FATE_CARD_DEFS: FateCardDef[] = [
  { type: 'laser',     name: 'Laser',     emoji: '🔴', color: 0xff3333, blurb: '15 dmg hitscan laser' },
  { type: 'burst',     name: 'Burst',     emoji: '💥', color: 0xff8800, blurb: '5× 5 dmg cone blast' },
  { type: 'barrier',   name: 'Barrier',   emoji: '🛡️', color: 0x4488ff, blurb: '15× 3 dmg bullet ring' },
  { type: 'explosion', name: 'Explosion', emoji: '💣', color: 0xcc2222, blurb: '20 dmg AoE bomb' },
  { type: 'infect',    name: 'Infect',    emoji: '☠️', color: 0x55cc55, blurb: '3× 5 dmg + poison' },
  { type: 'coin',      name: 'Coin',      emoji: '🪙', color: 0xffcc00, blurb: 'Reflects bullets ×2 dmg' },
  { type: 'heal',      name: 'Heal',      emoji: '💚', color: 0x44dd88, blurb: '12 orbs, 8 HP each' },
  { type: 'buff',      name: 'Buff',      emoji: '💪', color: 0xdd88ff, blurb: '+10% spd/dmg/DR (8s)' },
  { type: 'lightning', name: 'Lightning', emoji: '⚡', color: 0xffee44, blurb: '20 dmg + 2s stun' },
  { type: 'slots',     name: 'Slots',     emoji: '🎰', color: 0xff66cc, blurb: 'Summon a slot machine' },
  // New Cards — colours chosen distinct from every base card above.
  { type: 'boomerang', name: 'Boomerang', emoji: '🪃', color: 0xb87333, blurb: 'Orbits you 3s, 15 dmg on hit' },
  { type: 'slash',     name: 'Slash',     emoji: '⚔️', color: 0x8b0000, blurb: 'Close red slash, 15 dmg' },
  { type: 'phase',     name: 'Phase',     emoji: '💨', color: 0x00c2c7, blurb: 'Dash at cursor, 10 dmg through' },
  { type: 'striker',   name: 'Striker',   emoji: '⚫', color: 0x333344, blurb: 'Very slow black shot, 35 dmg' },
  { type: 'pulse',     name: 'Pulse',     emoji: '🌀', color: 0x00a3ff, blurb: '10 dmg AoE + knockback' },
  { type: 'chill',     name: 'Chill',     emoji: '❄️', color: 0xa8e6ff, blurb: 'Snowball: 5 dmg + big 50% slow' },
  { type: 'chain',     name: 'Chain',     emoji: '🔗', color: 0x7b2ff7, blurb: '10 dmg chaining lightning' },
  { type: 'emperor',   name: 'Emperor',   emoji: '👑', color: 0xffffff, blurb: '12× 3 dmg bullet volley (rare)' },
];
const DEF_BY_TYPE = new Map<FateCardType, FateCardDef>(FATE_CARD_DEFS.map((d) => [d.type, d]));

// Base pool (always drawable) vs. New Cards (only with the Click+ "New Cards!" upgrade).
const BASE_CARD_TYPES: FateCardType[] = ['laser', 'burst', 'barrier', 'explosion', 'infect', 'coin', 'heal', 'buff', 'lightning', 'slots'];
const NEW_CARD_TYPES: FateCardType[] = ['boomerang', 'slash', 'phase', 'striker', 'pulse', 'chill', 'chain', 'emperor'];
const ALL_CARD_TYPES: FateCardType[] = [...BASE_CARD_TYPES, ...NEW_CARD_TYPES];

const ATTACK_TYPES: FateCardType[] = [
  'laser', 'burst', 'barrier', 'explosion', 'infect', 'lightning',
  'boomerang', 'slash', 'phase', 'striker', 'pulse', 'chill', 'chain', 'emperor',
];
const BASE_DMG: Record<FateCardType, number> = {
  laser: 15, burst: 5, barrier: 3, explosion: 20, infect: 5,
  coin: 0, heal: 8, buff: 0, lightning: 20, slots: 0,
  boomerang: 15, slash: 15, phase: 10, striker: 35,
  pulse: 10, chill: 5, chain: 10, emperor: 3,
};

// Emperor is 10× rarer than any other card in the draw pool.
const EMPEROR_RARITY = 10;

// ── E+ "Force the Hand of Fate" — face cards that restrict the draw pool ──
export type FateFaceCard = 'king' | 'queen' | 'jack' | 'ace' | 'jester';
export interface FateFaceCardDef { face: FateFaceCard; name: string; emoji: string; color: number; allow: FateCardType[] | null; }
export const FATE_FACE_CARDS: FateFaceCardDef[] = [
  { face: 'king',   name: 'King',   emoji: '🤴', color: 0xffd54a, allow: ['heal', 'buff', 'barrier', 'phase', 'emperor'] },
  { face: 'queen',  name: 'Queen',  emoji: '👸', color: 0xff6fae, allow: ['explosion', 'lightning', 'chill', 'chain'] },
  { face: 'jack',   name: 'Jack',   emoji: '🃏', color: 0x66d38a, allow: ['boomerang', 'slash', 'burst', 'pulse'] },
  { face: 'ace',    name: 'Ace',    emoji: '🂡', color: 0xd0d0e0, allow: ['laser', 'coin', 'infect', 'striker'] },
  { face: 'jester', name: 'Jester', emoji: '🎭', color: 0xaa77ff, allow: null },
];
const FACE_BY_ID = new Map<FateFaceCard, FateFaceCardDef>(FATE_FACE_CARDS.map((f) => [f.face, f]));

// ── Fate Mastery — "Tarot of Fate" curses ────────────────────────────────────
export type FateCurse =
  | 'painful' | 'immolating' | 'weakening' | 'confusing' | 'vulnerable'
  | 'cursed' | 'stunning' | 'cocky' | 'purging';

export interface FateCurseDef { curse: FateCurse; name: string; emoji: string; blurb: string; }
export const FATE_CURSES: FateCurseDef[] = [
  { curse: 'painful',    name: 'Painful',    emoji: '🩹', blurb: 'Deals 30 damage to you' },
  { curse: 'immolating', name: 'Immolating', emoji: '🔥', blurb: 'Burns every other card out of your hand' },
  { curse: 'weakening',  name: 'Weakening',  emoji: '🦠', blurb: '33% slower for 10s' },
  { curse: 'confusing',  name: 'Confusing',  emoji: '🌀', blurb: 'Inverts WASD for 5s' },
  { curse: 'vulnerable', name: 'Vulnerable', emoji: '🦴', blurb: 'Next hit you take is doubled' },
  { curse: 'cursed',     name: 'Cursed',     emoji: '💀', blurb: '15 purple bullets hunt you for 3 each' },
  { curse: 'stunning',   name: 'Stunning',   emoji: '⭐', blurb: 'No cards for 5s' },
  { curse: 'cocky',      name: 'Cocky',      emoji: '😈', blurb: 'All In wagers all your HP for the rest of the match' },
  { curse: 'purging',    name: 'Purging',    emoji: '✨', blurb: 'Strips your hand; locks Tarot/Preserve/Enchant for 20s' },
];
const CURSE_BY_ID = new Map<FateCurse, FateCurseDef>(FATE_CURSES.map((c) => [c.curse, c]));

/** Multiplier a greatly-enchanted (Tarot) card applies, in place of Enchant's 2x. */
const GREAT_ENCHANT_MULT = 4;
const TAROT_COOLDOWN_MS = 20000;
/** How long Purging locks Tarot / Preserve / Enchant out for. */
const PURGE_LOCK_MS = 20000;
/** How long Stunning blocks card throws for. */
const STUN_LOCK_MS = 5000;
/** Cards binned by the Cycle passive before it deals a fresh pair. */
// ── Ash (divine perk) ────────────────────────────────────────────────────────
const ASH_DAMAGE = 25;
const ASH_RADIUS = 70;
const ASH_BURN_MS = 3000;
/** How far a falling card can drift from the caster before it catches. */
const ASH_SCATTER = 46;
/** Ceiling per discard event, so a full reroll is a spread of fires and not a bombardment. */
const ASH_MAX_BLASTS = 3;

const CYCLE_BIN_TARGET = 3;
const CYCLE_DRAW_COUNT = 2;
/** Damage one card has to rack up to tick the "Big Hand" mastery requirement. */
const BIG_HAND_THRESHOLD = 50;
/** How long a card's damage keeps counting toward Big Hand after it is played. */
const LEDGER_WINDOW_MS = 10000;

const BASE_HAND_SIZE = 6;
const UPGRADED_HAND_SIZE = 8; // R+ "Wonder Preserve"
const DRAW_INTERVAL_MS = 5000;

// Health-bar geometry (mirrors HealthBar.ts) so the Q+ gamble marker lines up.
const HB_W = 52;
const HB_H = 7;
const HB_OFFSET_Y = -38;

interface FateCard {
  type: FateCardType;
  preserved: boolean;
  enchanted: boolean;
  /** Fate Mastery — Tarot of Fate: 4x power, overrules `enchanted`, always paired with a curse. */
  greatEnchanted: boolean;
  /** The curse Tarot stapled on, resolved when this card is played. */
  curse: FateCurse | null;
}

type FateModStat = 'dmgTaken' | 'dmgDealt' | 'speed' | 'cd' | 'size';
interface FateMod { stat: FateModStat; mult: number; until: number; }

/**
 * Everything below is pure data — no sprites. Fate's world objects are repainted from scratch
 * every frame in `drawWorld` so a coin can turn, a wheel can spin and a slot machine's reels can
 * roll. A tweened Arc can do none of those things.
 */
interface FateHealOrb {
  x: number; y: number;
  owner: 'player' | 'npc';
  expiresAt: number;
  amount: number;
  /** F+ "Heal: orbs will very slowly move towards the player". */
  homing: boolean;
  /** Own beat, so a scattered field of orbs doesn't pulse in lockstep. */
  phase: number;
}

interface FateCoinToken {
  x: number; y: number;
  vy: number;
  risingUntil: number;
  expiresAt: number;
  owner: 'player' | 'npc';
  pairId: number;
  /** Big Hand ledger the coin's reflected damage is credited to (0 = untracked). */
  ledgerId: number;
}

interface FateSlotMachine {
  x: number; y: number;
  owner: 'player' | 'npc';
  cycleDmgPlayer: number;
  cycleDmgNpc: number;
  cycleEnd: number;
  /** F+ enchant bonus: halves the damage thresholds needed for buff/jackpot rolls. */
  halfReq: boolean;
}

interface FateAllIn {
  owner: 'player' | 'npc';
  activatesAt: number;
  /** Total orbit window, so the wheel can show how close the bet is to coming due. */
  orbitMs: number;
  orbitAngle: number;
  x: number; y: number;
  radius: number;
  /** HP wagered — fixed 50 normally, or the Q+ gamble-bar amount for the player. */
  wager: number;
  /** Cocky curse: the whole health bar is on the table, and the wheel says so. */
  cocky: boolean;
}

interface FateLightningStrike {
  x: number; y: number;
  owner: 'player' | 'npc';
  dmg: number;
  stunMs: number;
  resolveAt: number;
  /** When the telegraph opened, so the ring can wind up over the whole window. */
  openedAt: number;
  ledgerId: number;
}

interface FatePoison {
  until: number;
  dps: number;
  tickAccum: number;
  ledgerId: number;
}

// ── New Cards! kit-managed objects ─────────────────────────────────────────

interface FateBoomerang {
  owner: 'player' | 'npc';
  angle: number;
  radius: number;
  dmg: number;
  expiresAt: number;
  hitAt: Map<Fighter, number>;
  ledgerId: number;
  /** Live world position, written each frame so drawWorld doesn't recompute the orbit. */
  x: number; y: number;
}

interface FateSnowball {
  x: number; y: number;
  vx: number; vy: number;
  owner: 'player' | 'npc';
  dmg: number;
  slowMs: number;
  expiresAt: number;
  ledgerId: number;
}

/**
 * Fate Mastery — Cursed: a purple bullet swept in from the arena edge that only ever
 * damages the fighter the curse fired on. Kit-managed rather than a real `Projectile`
 * so it can never clip the wrong side.
 */
interface FateCurseBullet {
  x: number; y: number;
  vx: number; vy: number;
  victim: Fighter;
  expiresAt: number;
}

/** Running damage total for one played card — drives the Big Hand mastery requirement. */
interface FateCardLedger {
  total: number;
  expiresAt: number;
  credited: boolean;
}

/** A one-shot forced velocity (Pulse knockback) that overrides a fighter's own movement for a short window. */
interface FateKnock { vx: number; vy: number; until: number; }
/** A temporary movement slow (Slash / Chill) enforced by scaling a fighter's velocity each frame. */
interface FateSlow { factor: number; until: number; }

// ── Arena API ────────────────────────────────────────────────────────────────

export interface FateArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  readonly enemies: Fighter[];
  get scene(): Phaser.Scene;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get nukeChanneling(): boolean;
  get rightPointerWasDown(): boolean;
  get isPlayerFate(): boolean;
  /** Skins: maps a fate visual color through the owner's skin. */
  fateColor(owner: 'player' | 'npc', base: number): number;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  /** True if the local player (Fate) has the given shop upgrade slot equipped. */
  hasUpgrade(slot: string): boolean;
  /** True if the online opponent (Fate) has the given shop upgrade slot equipped. */
  hasNpcUpgrade(slot: string): boolean;
  /** True when the local player is Fate and has Element Mastery switched on. */
  get masteryActive(): boolean;
  /** The mastery enhancement bound over the given ability slot this match, or null. */
  masteryBindFor(slot: string): string | null;
  /** Adds to a Fate mastery progress counter (no-op when the player isn't Fate). */
  recordMasteryStat(key: string, amount: number): void;
  applyPlayerSpeedMult(f: number): void;
  applyNpcSpeedMult(f: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
}

// ── FateKit ──────────────────────────────────────────────────────────────────

/** Every card drives a distinct arm gesture, so a hand never plays the same way twice running. */
const CARD_GESTURES: Record<FateCardType, ArmGesture> = {
  laser: 'punch', burst: 'sweep', barrier: 'flex', explosion: 'slam', infect: 'punch',
  coin: 'punch', heal: 'clap', buff: 'flex', lightning: 'slam', slots: 'slam',
  boomerang: 'sweep', slash: 'sweep', phase: 'dash', striker: 'punch',
  pulse: 'clap', chill: 'punch', chain: 'punch', emperor: 'sweep',
};

/** Suit printed on each card's art, so a type always shows the same pip. */
const CARD_SUITS: Record<FateCardType, Suit> = {
  laser: 'diamond', burst: 'diamond', barrier: 'club', explosion: 'diamond', infect: 'club',
  coin: 'heart', heal: 'heart', buff: 'heart', lightning: 'spade', slots: 'club',
  boomerang: 'club', slash: 'spade', phase: 'diamond', striker: 'spade',
  pulse: 'club', chill: 'diamond', chain: 'spade', emperor: 'heart',
};

export class FateKit {
  // ── Visuals ───────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: FateColorFn;
  private readonly ncol: FateColorFn;
  private readonly pfx: FateFx;
  private readonly nfx: FateFx;
  /** The card-sharp rig (chip arms, eyes, card crown) for each fate fighter. */
  private playerAvatar: FateAvatar | null = null;
  private npcAvatar: FateAvatar | null = null;
  /** Buff-card aura per side, plus the Tarot ring while a loaded card sits in hand. */
  private playerBuffAura: FateAura | null = null;
  private npcBuffAura: FateAura | null = null;
  private tarotAura: FateAura | null = null;
  /** Poison tell riding on each infected fighter — one aura per victim. */
  private poisonAuras = new Map<Fighter, FateAura>();
  /**
   * Two layers, because these objects are not all in the same place. Things lying *on the table*
   * (slot machines, heal orbs, lightning telegraphs) must pass under the fighters; things in the
   * air (coins, boomerangs, snowballs, curse bullets, the All In wheel) must pass over them.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;

  // ── Hands ─────────────────────────────────────────────────────────
  private playerHand: FateCard[] = [];
  private npcHand: FateCard[] = [];
  private playerSelected = 0;
  private playerDrawAccum = 0;
  private npcDrawAccum = 0;
  // Hand size grows 6 → 8 with the R+ "Wonder Preserve" upgrade (per side).
  private playerHandSize = BASE_HAND_SIZE;
  private npcHandSize = BASE_HAND_SIZE;

  // ── E+ "Force the Hand of Fate" (player only) ─────────────────────
  private forceHand: FateFaceCard | null = null;
  private forceHandPending = false;
  private forceOverlay: Phaser.GameObjects.GameObject[] = [];

  // ── New Cards! world objects ──────────────────────────────────────
  private boomerangs: FateBoomerang[] = [];
  private snowballs: FateSnowball[] = [];
  // Pulse knockback + Slash/Chill slows, enforced per-frame in update().
  private knocks = new Map<Fighter, FateKnock>();
  private slows = new Map<Fighter, FateSlow>();

  // ── Q+ "Roulette Expert" gamble bar (player only) ─────────────────
  private gambleHp = 50;
  private gambleGraphics: Phaser.GameObjects.Graphics | null = null;
  private gambleLabel: Phaser.GameObjects.Text | null = null;
  private draggingGamble = false;

  // ── Timed stat modifiers (Buff card, Slots rolls) ──────────────────
  private playerMods: FateMod[] = [];
  private npcMods: FateMod[] = [];

  // ── World objects ─────────────────────────────────────────────────
  private healOrbs: FateHealOrb[] = [];
  private coins: FateCoinToken[] = [];
  private coinPairCounter = 0;
  private slotMachines: FateSlotMachine[] = [];
  private lightningStrikes: FateLightningStrike[] = [];
  private playerAllIn: FateAllIn | null = null;
  private npcAllIn: FateAllIn | null = null;

  // ── Stun (earthStunnedUntil isn't actually consumed by NPC movement or
  // player input anywhere in this codebase, so Lightning enforces its stun
  // itself by zeroing velocity every frame from update()). ─────────────
  private playerStunUntil = 0;
  private npcStunUntil = 0;

  // ── Poison (Infect) ────────────────────────────────────────────────
  private poison = new Map<Fighter, FatePoison>();

  // ── UI: card selection bar ─────────────────────────────────────────
  private barSlots: {
    bg: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Text;
    name: Phaser.GameObjects.Text;
    curse: Phaser.GameObjects.Text;
  }[] = [];
  private barBounds = { x1: 0, y1: 0, x2: 0, y2: 0 };
  private numberKeys: Phaser.Input.Keyboard.Key[] = [];
  /** Slot the mouse is currently over — Tarot of Fate enchants whatever card sits here. */
  private hoveredSlot = -1;

  // ── Fate Mastery ───────────────────────────────────────────────────
  /** Cycle passive: cards binned since the last free pair was dealt. */
  private cycleBinned = 0;
  private tarotLastCastAt = -TAROT_COOLDOWN_MS;
  /** Stunning curse: no card may be played before this timestamp. */
  private cardLockUntil = 0;
  /** Purging curse: Tarot / Preserve / Enchant lockouts. */
  private tarotLockUntil = 0;
  private preserveLockUntil = 0;
  private enchantLockUntil = 0;
  /** Cocky curse: All In wagers the player's entire health bar for the rest of the match. */
  private cockyAllIn = false;
  private curseBullets: FateCurseBullet[] = [];

  // ── Big Hand ledger (damage attributed to a single played card) ────
  private ledgers = new Map<number, FateCardLedger>();
  private ledgerCounter = 0;
  /** Ledger the card currently mid-`executeCard` writes to. 0 = nothing being tracked. */
  private activeLedgerId = 0;

  private lastMouseX = 0;
  private lastMouseY = 0;
  private clickWasDown = false;

  constructor(private arena: FateArenaApi) {
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.fateColor('player', base);
    this.ncol = (base) => arena.fateColor('npc', base);
    this.pfx = new FateFx(arena.scene, this.pcol);
    this.nfx = new FateFx(arena.scene, this.ncol);
    this.reset();
  }

  // ── Visual helpers ────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): FateFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): FateColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** Card stock for a side. */
  private tones(owner: 'player' | 'npc'): CardTones { return tonesFor(owner); }
  /** The rig for a side, if that side is playing Fate. */
  private avatar(owner: 'player' | 'npc'): FateAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private casterOf(owner: 'player' | 'npc'): Fighter {
    return owner === 'player' ? this.arena.player : this.arena.npc;
  }

  /** Ash (divine perk): fire's own painter, built on the first discard that needs it. */
  private ashFx: FireFx | null = null;

  /** The table layer, under the fighters. Rebuilt lazily after a reset. */
  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) {
      this.groundGfx = this.arena.scene.add.graphics().setDepth(2);
    }
    return this.groundGfx;
  }

  /** The airborne layer, over the fighters. Rebuilt lazily after a reset. */
  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) {
      this.airGfx = this.arena.scene.add.graphics().setDepth(8);
    }
    return this.airGfx;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.playerBuffAura) { this.playerBuffAura.destroy(); this.playerBuffAura = null; }
    if (this.npcBuffAura) { this.npcBuffAura.destroy(); this.npcBuffAura = null; }
    if (this.tarotAura) { this.tarotAura.destroy(); this.tarotAura = null; }
    for (const a of this.poisonAuras.values()) a.destroy();
    this.poisonAuras.clear();
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }

    // R+ "Wonder Preserve": hand grows 6 → 8 for whichever side owns it.
    this.playerHandSize = this.ownerHasUpgrade('player', 'r') ? UPGRADED_HAND_SIZE : BASE_HAND_SIZE;
    this.npcHandSize = this.ownerHasUpgrade('npc', 'r') ? UPGRADED_HAND_SIZE : BASE_HAND_SIZE;

    this.playerSelected = 0;
    this.playerDrawAccum = 0;
    this.npcDrawAccum = 0;

    this.playerMods = [];
    this.npcMods = [];
    this.playerStunUntil = 0;
    this.npcStunUntil = 0;

    // Every world object below is plain data drawn into `worldGfx`, so clearing the arrays is
    // the whole teardown — there are no per-object GameObjects left to destroy.
    this.healOrbs = [];
    this.coins = [];
    this.slotMachines = [];
    this.lightningStrikes = [];
    this.playerAllIn = null;
    this.npcAllIn = null;

    this.boomerangs = [];
    this.snowballs = [];
    this.knocks.clear();
    this.slows.clear();

    this.poison.clear();
    this.curseBullets = [];
    this.ledgers.clear();
    this.activeLedgerId = 0;
    this.cycleBinned = 0;
    // Absolute-clock readiness: the kit's first match runs the constructor, not reset(),
    // so seed the last-cast stamp a full cooldown in the past or Tarot starts locked.
    this.tarotLastCastAt = -TAROT_COOLDOWN_MS;
    this.cardLockUntil = 0;
    this.tarotLockUntil = 0;
    this.preserveLockUntil = 0;
    this.enchantLockUntil = 0;
    this.cockyAllIn = false;
    this.hoveredSlot = -1;
    // No need to clear `invertedControlsUntil` / `vulnerableNextHit` here: reset() runs
    // before ArenaScene builds the match's Player, so `arena.player` is either absent or
    // last match's object — the fresh Fighter starts with both fields already clear.

    this.teardownForceOverlay();
    this.forceHand = null;
    this.forceHandPending = false;

    this.gambleHp = 50;
    this.draggingGamble = false;
    if (this.gambleGraphics) { this.gambleGraphics.destroy(); this.gambleGraphics = null; }
    if (this.gambleLabel) { this.gambleLabel.destroy(); this.gambleLabel = null; }

    // NPC hand always deals immediately; it has no Force-the-Hand choice.
    this.npcHand = Array.from({ length: this.npcHandSize }, () => this.drawCardFor('npc'));

    // Player: with E+ "Force the Hand of Fate" the opening hand is withheld until a
    // face card is chosen (it restricts the pool), so deal nothing yet and prompt.
    if (this.arena.isPlayerFate && this.arena.hasUpgrade('e')) {
      this.playerHand = [];
      this.forceHandPending = true;
      this.buildForceOverlay();
    } else {
      this.playerHand = Array.from({ length: this.playerHandSize }, () => this.drawCardFor('player'));
    }

    this.teardownBar();
    // The card bar is the player's hand HUD — only show it when the player
    // is actually playing Fate (not when only the NPC is).
    if (this.arena.isPlayerFate) {
      this.buildBar();
      this.setupNumberKeys();
      if (this.arena.hasUpgrade('q')) this.gambleGraphics = this.arena.scene.add.graphics().setDepth(11);
    }

    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.clickWasDown = false;
  }

  /** True if the given side (player/npc, Fate) has the shop upgrade `slot` equipped. */
  private ownerHasUpgrade(owner: 'player' | 'npc', slot: string): boolean {
    return owner === 'player'
      ? this.arena.isPlayerFate && this.arena.hasUpgrade(slot)
      : this.arena.hasNpcUpgrade(slot);
  }

  // ── Draw pool (Click+ New Cards, E+ Force the Hand) ───────────────

  /** The card types the given side may currently draw. */
  private allowedTypesFor(owner: 'player' | 'npc'): FateCardType[] {
    let pool = this.ownerHasUpgrade(owner, 'click') ? ALL_CARD_TYPES : BASE_CARD_TYPES;
    if (owner === 'player' && this.forceHand) {
      const def = FACE_BY_ID.get(this.forceHand);
      if (def?.allow) {
        const filtered = pool.filter((t) => def.allow!.includes(t));
        if (filtered.length) pool = filtered;
      }
    }
    return pool;
  }

  /** Weighted random draw from the side's allowed pool (Emperor is 10× rarer). */
  private drawCardFor(owner: 'player' | 'npc'): FateCard {
    const pool = this.allowedTypesFor(owner);
    let total = 0;
    for (const t of pool) total += t === 'emperor' ? 1 : EMPEROR_RARITY;
    let roll = Math.random() * total;
    let pick: FateCardType = pool[0];
    for (const t of pool) {
      roll -= t === 'emperor' ? 1 : EMPEROR_RARITY;
      if (roll < 0) { pick = t; break; }
    }
    // Mastery "Fortune Teller": every card that lands in the player's hand counts,
    // which is why a Reroll is worth a whole hand's worth of progress at once.
    if (owner === 'player') this.arena.recordMasteryStat('cardsDrawn', 1);
    return { type: pick, preserved: false, enchanted: false, greatEnchanted: false, curse: null };
  }

  // ── Card selection bar (mirrors Life's seed bar) ──────────────────

  private teardownBar(): void {
    for (const s of this.barSlots) { s.bg.destroy(); s.icon.destroy(); s.name.destroy(); s.curse.destroy(); }
    this.barSlots = [];
    this.barBounds = { x1: 0, y1: 0, x2: 0, y2: 0 };
  }

  private buildBar(): void {
    const scene = this.arena.scene;
    const n = this.playerHandSize;
    const slotW = 60;
    const gap = 8;
    const total = n * slotW + (n - 1) * gap;
    const startX = scene.scale.width / 2 - total / 2 + slotW / 2;
    const y = 46;
    this.barBounds = {
      x1: startX - slotW / 2, y1: y - 36,
      x2: startX - slotW / 2 + total, y2: y + 36,
    };

    for (let i = 0; i < n; i++) {
      const x = startX + i * (slotW + gap);
      const bg = scene.add.rectangle(x, y, slotW, 58, 0x141420, 0.85)
        .setStrokeStyle(2, 0x88eecc, 0.7)
        .setDepth(200)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const icon = scene.add.text(x, y - 12, '', { fontSize: '20px' })
        .setOrigin(0.5).setDepth(201).setScrollFactor(0);
      const name = scene.add.text(x, y + 8, '', { fontSize: '8px', color: '#bbddcc' })
        .setOrigin(0.5).setDepth(201).setScrollFactor(0);
      // Bottom line: the Tarot curse riding on this card, when it has one.
      const curse = scene.add.text(x, y + 21, '', { fontSize: '10px' })
        .setOrigin(0.5).setDepth(201).setScrollFactor(0);
      bg.on('pointerdown', (p: Phaser.Input.Pointer) => {
        // Mastery "Cycle": right-click bins the card instead of selecting it.
        if (p.rightButtonDown()) { this.tryCycleDelete(i); return; }
        if (i < this.playerHand.length) this.playerSelected = i;
      });
      bg.on('pointerover', () => { this.hoveredSlot = i; });
      bg.on('pointerout', () => { if (this.hoveredSlot === i) this.hoveredSlot = -1; });
      this.barSlots.push({ bg, icon, name, curse });
    }
  }

  private refreshBar(): void {
    for (let i = 0; i < this.barSlots.length; i++) {
      const slot = this.barSlots[i];
      const card = this.playerHand[i];
      if (!card) {
        slot.bg.setVisible(false); slot.icon.setVisible(false);
        slot.name.setVisible(false); slot.curse.setVisible(false);
        continue;
      }
      slot.bg.setVisible(true); slot.icon.setVisible(true); slot.name.setVisible(true);
      const def = DEF_BY_TYPE.get(card.type)!;
      const isSel = i === this.playerSelected;
      const borderColor = card.greatEnchanted ? 0xff33cc
        : card.enchanted ? 0xaa44ff
        : card.preserved ? 0xffee44
        : def.color;
      slot.bg.setFillStyle(isSel ? 0x2a2a44 : 0x141420, isSel ? 0.95 : 0.85);
      slot.bg.setStrokeStyle(card.greatEnchanted ? 4 : isSel ? 3 : 2, borderColor, 1);
      slot.bg.setScale(isSel ? 1.15 : 1);
      slot.icon.setText(def.emoji).setScale(isSel ? 1.2 : 1);
      slot.name.setText(card.greatEnchanted ? `${def.name} ×4` : def.name);
      slot.name.setColor(card.greatEnchanted ? '#ff88dd' : isSel ? '#ffffff' : '#88aa99');
      const curseDef = card.curse ? CURSE_BY_ID.get(card.curse) : undefined;
      slot.curse.setVisible(!!curseDef).setText(curseDef?.emoji ?? '');
    }
  }

  private setupNumberKeys(): void {
    const kb = this.arena.scene.input.keyboard;
    if (!kb) return;
    const codes = [
      Phaser.Input.Keyboard.KeyCodes.ONE, Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE, Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE, Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN, Phaser.Input.Keyboard.KeyCodes.EIGHT,
    ];
    this.numberKeys = codes.map((c) => kb.addKey(c));
  }

  /** True when the pointer is over the card bar — clicks there must never fire an attack. */
  consumedPointer(): boolean {
    const b = this.barBounds;
    return this.lastMouseX >= b.x1 && this.lastMouseX <= b.x2
      && this.lastMouseY >= b.y1 && this.lastMouseY <= b.y2;
  }

  // ── Input (player only) ───────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    if (this.arena.nukeChanneling) { this.clickWasDown = pointer.isDown; return; }

    // While the Force-the-Hand overlay is up, ignore all combat input.
    if (this.forceHandPending) { this.clickWasDown = pointer.isDown; return; }

    const player = this.arena.player;

    // ── Number keys: select card by slot ────────────────────────────
    for (let i = 0; i < this.numberKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.numberKeys[i]) && i < this.playerHand.length) {
        this.playerSelected = i;
      }
    }

    // ── Q+ Roulette Expert: drag the gamble marker on your health bar ──
    if (this.gambleGraphics) {
      if (pointer.isDown && (this.draggingGamble || this.overGambleBar(mouseX, mouseY))) {
        this.draggingGamble = true;
        const left = player.x - HB_W / 2;
        const ratio = Phaser.Math.Clamp((mouseX - left) / HB_W, 0, 1);
        this.gambleHp = Math.min(Math.round(ratio * player.maxHp), Math.ceil(player.hp));
      } else {
        this.draggingGamble = false;
      }
    }

    // ── Right-click: Paper perk card throw (never over the hand — that bins a card) ──
    const rightJustDown = pointer.rightButtonDown() && !this.arena.rightPointerWasDown;
    if (rightJustDown && !this.consumedPointer() && this.arena.hasPerk('player', 'paper') && time >= this.paperCooldownUntil) {
      this.doPaperCardThrow(mouseX, mouseY, time);
    }

    // ── Mastery: Tarot of Fate, on whichever slot it was bound over ──
    const tSlot = this.tarotSlot();
    if (tSlot) {
      const key = tSlot === 'e' ? this.arena.eKey
        : tSlot === 'r' ? this.arena.rKey
        : tSlot === 'f' ? this.arena.fKey
        : this.arena.qKey;
      if (Phaser.Input.Keyboard.JustDown(key)) this.tryCastTarot(time);
    }

    // ── Click (hold): throw the highlighted card ────────────────────
    if (pointer.isDown && !this.consumedPointer() && !this.draggingGamble && time >= this.cardLockUntil) {
      if (player.castAbility('fate-card-throw', FATE_STUB_CTX)) {
        this.doThrowCard(mouseX, mouseY, 'player');
      }
    }
    this.clickWasDown = pointer.isDown;

    // ── F: Enchant ───────────────────────────────────────────────────
    if (tSlot !== 'f' && time >= this.enchantLockUntil && Phaser.Input.Keyboard.JustDown(this.arena.fKey)) {
      if (player.castAbility('fate-enchant', FATE_STUB_CTX)) this.doEnchant('player');
    }

    // ── Q: All In ────────────────────────────────────────────────────
    if (tSlot !== 'q' && Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
      if (player.castAbility('fate-all-in', FATE_STUB_CTX)) this.doAllIn('player');
    }

    this.refreshBar();
  }

  onEKey(): void {
    if (this.tarotSlot() === 'e') return;
    if (this.arena.player.castAbility('fate-reroll', FATE_STUB_CTX)) this.doReroll('player');
  }

  onRKey(): void {
    if (this.tarotSlot() === 'r') return;
    if (this.arena.scene.time.now < this.preserveLockUntil) return;
    if (this.arena.player.castAbility('fate-preserve', FATE_STUB_CTX)) this.doPreserve('player');
  }

  // ── Public accessors ───────────────────────────────────────────────

  getNpcHandTypes(): FateCardType[] { return this.npcHand.map((c) => c.type); }

  // ═══════════════════════════════════════════════════════════════════
  //  Fate Mastery — Cycle (passive) + Tarot of Fate (bindable)
  // ═══════════════════════════════════════════════════════════════════

  /** The slot Tarot of Fate is bound over this match, or null when it isn't bound anywhere. */
  private tarotSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'tarot-of-fate') return s;
    }
    return null;
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar on whichever slot Tarot is bound to. */
  getTarotCooldownRatio(time: number): number {
    const lockLeft = this.tarotLockUntil - time;
    if (lockLeft > 0) return Math.max(0, 1 - lockLeft / PURGE_LOCK_MS);
    return Math.min(1, (time - this.tarotLastCastAt) / TAROT_COOLDOWN_MS);
  }

  /** True while the Purging curse has Preserve (R) or Enchant (F) locked out. */
  isCurseLocked(abilityId: string): boolean {
    const now = this.arena.scene.time.now;
    if (abilityId === 'fate-preserve') return now < this.preserveLockUntil;
    if (abilityId === 'fate-enchant') return now < this.enchantLockUntil;
    return false;
  }

  /** 0 = just locked, 1 = free again. Drives the HUD bar for a Purging-locked ability. */
  getCurseLockRatio(abilityId: string, time: number): number {
    const until = abilityId === 'fate-preserve' ? this.preserveLockUntil : this.enchantLockUntil;
    return Phaser.Math.Clamp(1 - (until - time) / PURGE_LOCK_MS, 0, 1);
  }

  private tryCastTarot(time: number): void {
    if (time < this.tarotLockUntil) return;
    if (time - this.tarotLastCastAt < TAROT_COOLDOWN_MS) return;
    const player = this.arena.player;
    const idx = this.hoveredSlot;
    const card = idx >= 0 ? this.playerHand[idx] : undefined;
    if (!card) {
      this.arena.showFloatingText(player.x, player.y - 36, '🔮 Hover a card!', '#cc99ff');
      return;
    }
    if (card.greatEnchanted) {
      this.arena.showFloatingText(player.x, player.y - 36, '🔮 Already greatly enchanted', '#cc99ff');
      return;
    }
    this.tarotLastCastAt = time;

    // Great enchant overrules a plain enchant outright rather than stacking with it.
    card.enchanted = false;
    card.greatEnchanted = true;
    card.curse = FATE_CURSES[Math.floor(Math.random() * FATE_CURSES.length)].curse;
    const def = CURSE_BY_ID.get(card.curse)!;
    this.arena.showFloatingText(player.x, player.y - 36, '🔮 TAROT OF FATE ×4', '#ff88dd');
    this.arena.showFloatingText(player.x, player.y - 56, `${def.emoji} ${def.name}: ${def.blurb}`, '#ffaa66');
    // Loading a card: the whole deck draws in around the caster, then a magenta ring seals it.
    // The Tarot aura takes over from here and stays up until the card is actually played.
    this.playerAvatar?.play('raise', -Math.PI / 2, 900);
    this.pfx.ante(player.x, player.y, 56, 700,
      () => (player.active ? { x: player.x, y: player.y } : null), 5, TAROT_TONES);
    this.pfx.ring(player.x, player.y, 74, 20, FATE.great, 520, 5, 6);
    this.pfx.sparkle(player.x, player.y, 14, 44, 10, FATE.great);
    this.refreshBar();
  }

  /**
   * Cycle passive: right-clicking a card bins it. Every third bin the deck immediately
   * deals two fresh cards, so a hand of dead draws can be churned back into something live.
   */
  private tryCycleDelete(idx: number): void {
    if (!this.arena.masteryActive) return;
    if (idx < 0 || idx >= this.playerHand.length) return;
    const player = this.arena.player;
    this.playerHand.splice(idx, 1);
    if (this.playerSelected >= this.playerHand.length) {
      this.playerSelected = Math.max(0, this.playerHand.length - 1);
    }
    this.burnDiscards('player', 1);
    this.cycleBinned++;
    if (this.cycleBinned >= CYCLE_BIN_TARGET) {
      this.cycleBinned -= CYCLE_BIN_TARGET;
      let drawn = 0;
      for (let i = 0; i < CYCLE_DRAW_COUNT && this.playerHand.length < this.playerHandSize; i++) {
        this.playerHand.push(this.drawCardFor('player'));
        drawn++;
      }
      this.arena.showFloatingText(player.x, player.y - 36, `🔁 Cycle! +${drawn}`, '#88eecc');
      // Hitting the third bin deals fresh cards, so it gets the riffle rather than the discard.
      this.pfx.riffle(player.x, player.y - 6, 40, 10, HOUSE_TONES);
      this.pfx.ring(player.x, player.y, 8, 44, FATE.mint, 340, 3, 5);
    } else {
      this.arena.showFloatingText(player.x, player.y - 36, `🗑️ Binned (${this.cycleBinned}/${CYCLE_BIN_TARGET})`, '#99aabb');
      // A binned card is thrown away face-down: no gold, no sparkle, nothing gained.
      this.pfx.cards(player.x, player.y - 10, 1, {
        speed: 90, angle: -Math.PI / 2, spread: 0.5, size: 12, life: 520, fall: 80,
        depth: 9, face: FATE.ash, tones: HOUSE_TONES,
      });
    }
    this.refreshBar();
  }

  /**
   * Fires the curse riding on a greatly-enchanted card, the moment that card is played.
   * `survivor` is the played card when Preserve kept it in hand — Immolating spares it,
   * since the curse burns every *other* card.
   */
  private resolveCurse(curse: FateCurse, time: number, survivor: FateCard | null = null): void {
    const player = this.arena.player;
    const def = CURSE_BY_ID.get(curse)!;
    this.arena.showFloatingText(player.x, player.y - 52, `${def.emoji} ${def.name.toUpperCase()}`, '#ff6688');
    switch (curse) {
      case 'painful':
        player.applySelfDamage(30);
        break;
      case 'immolating': {
        // Deliberately does NOT feed the Cycle counter — these cards burn, they aren't binned.
        const kept = survivor && this.playerHand.includes(survivor) ? [survivor] : [];
        const burned = this.playerHand.length - kept.length;
        this.playerHand = kept;
        this.playerSelected = 0;
        if (burned > 0) this.arena.showFloatingText(player.x, player.y - 68, `🔥 −${burned} cards`, '#ff7733');
        // Ash: cards burning out of your hand are still cards leaving it.
        this.burnDiscards('player', burned);
        break;
      }
      case 'weakening':
        this.addMod('player', 'speed', 0.67, 10000);
        break;
      case 'confusing':
        player.invertedControlsUntil = Math.max(player.invertedControlsUntil, time + 5000);
        break;
      case 'vulnerable':
        player.vulnerableNextHit = true;
        break;
      case 'cursed':
        this.spawnCurseBullets(player);
        break;
      case 'stunning':
        this.cardLockUntil = Math.max(this.cardLockUntil, time + STUN_LOCK_MS);
        break;
      case 'cocky':
        this.cockyAllIn = true;
        break;
      case 'purging':
        for (const c of this.playerHand) {
          c.enchanted = false;
          c.greatEnchanted = false;
          c.preserved = false;
          c.curse = null;
        }
        this.tarotLockUntil = time + PURGE_LOCK_MS;
        this.preserveLockUntil = time + PURGE_LOCK_MS;
        this.enchantLockUntil = time + PURGE_LOCK_MS;
        break;
    }
  }

  /** Cursed: 15 purple bullets sweep in from the arena's left and right edges, homing on the victim once. */
  private spawnCurseBullets(victim: Fighter): void {
    const scene = this.arena.scene;
    const W = scene.scale.width;
    const H = scene.scale.height;
    for (let i = 0; i < 15; i++) {
      scene.time.delayedCall(i * 70, () => {
        if (!victim.active || victim.hp <= 0) return;
        const fromLeft = i % 2 === 0;
        const x = fromLeft ? -12 : W + 12;
        const y = 40 + Math.random() * (H - 80);
        const ang = Math.atan2(victim.y - y, victim.x - x);
        const speed = 300;
        this.curseBullets.push({
          x, y,
          vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
          victim, expiresAt: scene.time.now + 6000,
        });
      });
    }
  }

  private updateCurseBullets(time: number, delta: number): void {
    const dt = delta / 1000;
    const W = this.arena.scene.scale.width;
    const H = this.arena.scene.scale.height;
    for (let i = this.curseBullets.length - 1; i >= 0; i--) {
      const b = this.curseBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const hit = b.victim.active && b.victim.hp > 0
        && Phaser.Math.Distance.Between(b.x, b.y, b.victim.x, b.victim.y) <= 24;
      const gone = time > b.expiresAt || b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40;
      if (hit) {
        b.victim.takeDamage(3);
        this.arena.spawnHitFlash(b.x, b.y, FATE.curse);
        // The seal breaks on the victim, so a curse bullet landing is not just a number.
        this.pfx.payout(b.x, b.y, 34, { cards: 4, chips: 2, litter: false, depth: 8, face: FATE.curse, tones: TAROT_TONES });
      }
      if (hit || gone) this.curseBullets.splice(i, 1);
    }
  }

  // ── Big Hand ledger ────────────────────────────────────────────────

  /** Opens a fresh damage tally for a card the player just played. */
  private openLedger(time: number): number {
    const id = ++this.ledgerCounter;
    this.ledgers.set(id, { total: 0, expiresAt: time + LEDGER_WINDOW_MS, credited: false });
    return id;
  }

  /**
   * Credits damage to the card that caused it. Once one card's tally crosses 50 the
   * "Big Hand" mastery requirement ticks — once per card, however far past 50 it goes.
   */
  creditCardDamage(ledgerId: number, amount: number): void {
    if (!ledgerId || amount <= 0) return;
    const ledger = this.ledgers.get(ledgerId);
    if (!ledger || ledger.credited) return;
    ledger.total += amount;
    if (ledger.total >= BIG_HAND_THRESHOLD) {
      ledger.credited = true;
      this.arena.recordMasteryStat('bigCardHits', 1);
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 60, '🃏 BIG HAND!', '#ffee66');
    }
  }

  private pruneLedgers(time: number): void {
    for (const [id, l] of this.ledgers) if (time > l.expiresAt) this.ledgers.delete(id);
  }

  // ── Per-frame update ───────────────────────────────────────────────

  update(time: number, delta: number, isPlayer: boolean, isNpc: boolean): void {
    // Draw timers (Force-the-Hand withholds the player's deal until a face card is picked)
    if (isPlayer && !this.forceHandPending) {
      this.playerDrawAccum += delta;
      if (this.playerDrawAccum >= DRAW_INTERVAL_MS) {
        this.playerDrawAccum -= DRAW_INTERVAL_MS;
        if (this.playerHand.length < this.playerHandSize) this.playerHand.push(this.drawCardFor('player'));
      }
      this.refreshBar();
    }
    if (isNpc) {
      this.npcDrawAccum += delta;
      if (this.npcDrawAccum >= DRAW_INTERVAL_MS) {
        this.npcDrawAccum -= DRAW_INTERVAL_MS;
        if (this.npcHand.length < this.npcHandSize) this.npcHand.push(this.drawCardFor('npc'));
      }
    }

    // Timed stat modifiers
    if (isPlayer) this.recomputeMods('player', time);
    if (isNpc) this.recomputeMods('npc', time);

    // Stun enforcement
    if (time < this.playerStunUntil) (this.arena.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (time < this.npcStunUntil) (this.arena.npc.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    // Slash/Chill slows + Pulse knockback (override movement written earlier this frame)
    this.updateSlowsAndKnocks(time);

    // Poison ticks
    this.updatePoison(time, delta);

    // Heal orbs
    this.updateHealOrbs(time);

    // Coins + slot machines share a single pass over active projectiles
    this.updateProjectileInteractions(time);
    this.updateCoins(time, delta);
    this.updateSlotMachines(time);

    // Lightning strikes
    this.updateLightningStrikes(time);

    // New Cards! world objects
    this.updateBoomerangs(time);
    this.updateSnowballs(time, delta);

    // Fate Mastery: Cursed bullets + expiring Big Hand tallies
    this.updateCurseBullets(time, delta);
    this.pruneLedgers(time);

    // All In orbits
    if (this.playerAllIn) this.updateAllIn(this.playerAllIn, time, 'player');
    if (this.npcAllIn) this.updateAllIn(this.npcAllIn, time, 'npc');

    // Q+ gamble bar overlay (player only)
    if (this.gambleGraphics && isPlayer) this.drawGambleBar();

    // ── Visuals: rigs, auras, and one repaint of every world object ──
    this.updateAvatars(delta, isPlayer, isNpc);
    this.updateAuras(delta, time, isPlayer, isNpc);
    this.drawWorld(time);
  }

  /**
   * Builds (on first frame) and drives the card-sharp rig for whichever fighters are Fate. The
   * player faces the cursor; the NPC faces whoever it is fighting. Intensity climbs while a
   * wager is on the table, which widens the arms and lifts the card crown.
   */
  private updateAvatars(delta: number, isPlayer: boolean, isNpc: boolean): void {
    const { player, npc, scene } = this.arena;

    if (isPlayer && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new FateAvatar(scene, this.pcol, HOUSE_TONES);
      const aimX = this.lastMouseX || player.x + 1;
      const aimY = this.lastMouseY || player.y;
      this.playerAvatar.setFacing(Math.atan2(aimY - player.y, aimX - player.x));
      this.playerAvatar.setIntensity(this.playerAllIn ? 1.4 : this.playerMods.length > 0 ? 1.15 : 1);
      this.playerAvatar.setMastered(this.arena.masteryActive);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
    }

    if (isNpc && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new FateAvatar(scene, this.ncol, NPC_TONES);
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(this.npcAllIn ? 1.4 : 1);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /**
   * Persistent tells: the Buff card's rising suits, the Tarot ring while a loaded card is still
   * in hand, and a drip on every poisoned fighter. Poison in particular has to be readable
   * between ticks, not only on the frame it fires.
   */
  private updateAuras(delta: number, time: number, isPlayer: boolean, isNpc: boolean): void {
    const { player, npc, scene } = this.arena;

    const driveBuff = (owner: 'player' | 'npc', on: boolean) => {
      const fighter = owner === 'player' ? player : npc;
      const cur = owner === 'player' ? this.playerBuffAura : this.npcBuffAura;
      if (!on || !fighter?.active) {
        if (cur) { cur.destroy(); if (owner === 'player') this.playerBuffAura = null; else this.npcBuffAura = null; }
        return;
      }
      let aura = cur;
      if (!aura) {
        aura = new FateAura(scene, this.col(owner), 'buff', 32, 3);
        if (owner === 'player') this.playerBuffAura = aura; else this.npcBuffAura = aura;
      }
      aura.update(delta, fighter.x, fighter.y, fighter.forceInvisible ? 0 : fighter.alpha);
    };
    // Only "helpful" mods raise the buff aura — a Slots penalty shouldn't look like a reward.
    const buffed = (mods: FateMod[]) => mods.some((m) => m.until > time
      && (m.stat === 'dmgTaken' || m.stat === 'cd' || m.stat === 'size' ? m.mult < 1 : m.mult > 1));
    driveBuff('player', isPlayer && buffed(this.playerMods));
    driveBuff('npc', isNpc && buffed(this.npcMods));

    // Tarot ring: up for as long as a greatly-enchanted card is still waiting to be played.
    const loaded = isPlayer && this.playerHand.some((c) => c.greatEnchanted);
    if (loaded && player?.active) {
      if (!this.tarotAura) this.tarotAura = new FateAura(scene, this.pcol, 'tarot', 38, 2);
      this.tarotAura.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);
    } else if (this.tarotAura) {
      this.tarotAura.destroy();
      this.tarotAura = null;
    }

    for (const [victim, aura] of this.poisonAuras) {
      if (!this.poison.has(victim) || !victim.active || victim.hp <= 0) {
        aura.destroy();
        this.poisonAuras.delete(victim);
        continue;
      }
      aura.update(delta, victim.x, victim.y, victim.forceInvisible ? 0 : victim.alpha);
    }
  }

  /**
   * One repaint of every world object the kit owns. All of them turn, spin or roll, so none of
   * them can be a sprite with a tween on it.
   */
  private drawWorld(time: number): void {
    const g = this.ground();
    const air = this.air();
    const t = time / 1000;
    g.clear();
    air.clear();

    for (const sm of this.slotMachines) {
      const req = sm.halfReq ? 25 : 50;
      FateFx.drawSlotMachine(g, this.col(sm.owner), sm.x, sm.y, t,
        (sm.cycleDmgPlayer + sm.cycleDmgNpc) / req);
    }

    for (const s of this.lightningStrikes) {
      // The telegraph tightens over its window, so you can read how long you have to move.
      const span = Math.max(1, s.resolveAt - s.openedAt);
      const ready = Phaser.Math.Clamp((time - s.openedAt) / span, 0, 1);
      const col = this.col(s.owner);
      g.fillStyle(col(0xffee44), 0.14 + ready * 0.16);
      g.fillCircle(s.x, s.y, 70);
      g.lineStyle(2 + ready * 2, col(0xffee44), 0.55 + ready * 0.4);
      g.strokeCircle(s.x, s.y, 70 * (1 - ready * 0.28));
      for (let i = 0; i < 8; i++) {
        const a = t * (1 + ready * 5) + (i / 8) * TAU;
        g.fillStyle(col(i % 2 === 0 ? FATE.gold : FATE.ivory), 0.8);
        g.fillCircle(s.x + Math.cos(a) * 70 * (1 - ready * 0.28), s.y + Math.sin(a) * 70 * (1 - ready * 0.28), 2.6);
      }
    }

    for (const o of this.healOrbs) {
      const col = this.col(o.owner);
      const beat = 0.85 + 0.15 * Math.sin(t * 4 + o.phase);
      g.fillStyle(col(0x44dd88), 0.22);
      g.fillCircle(o.x, o.y, 14 * beat);
      g.fillStyle(col(0x44dd88), 0.9);
      g.fillCircle(o.x, o.y, 7 * beat);
      g.fillStyle(col(FATE.blood), 0.95);
      suitGlyph(g, 'heart', o.x, o.y, 4.4 * beat);
      g.fillStyle(col(FATE.ivory), 0.8);
      g.fillCircle(o.x - 2.4, o.y - 3, 1.6);
    }

    // ── Airborne, over the fighters ──────────────────────────────────
    for (const c of this.coins) {
      const paired = this.coins.some((o) => o !== c && o.pairId === c.pairId);
      FateFx.drawCoin(air, this.col(c.owner), c.x, c.y, 9, t, 1, paired);
    }

    for (const b of this.boomerangs) {
      // Boomerangs are literally thrown cards, so they are drawn as one, mid-tumble.
      FateFx.drawFlyingCard(air, this.col(b.owner), this.tones(b.owner),
        b.x, b.y, b.angle + Math.PI / 2, 15, t * 2, 0xffe000, 'club');
    }

    for (const s of this.snowballs) {
      const col = this.col(s.owner);
      const heading = Math.atan2(s.vy, s.vx);
      air.fillStyle(col(0xa8e6ff), 0.2);
      air.fillCircle(s.x, s.y, 18);
      FateFx.drawFlyingCard(air, col, this.tones(s.owner), s.x, s.y, heading, 14, t * 2.4, 0xd6f2ff, 'diamond');
      // Frost shedding off the leading edge.
      for (let i = 0; i < 3; i++) {
        const a = heading + Math.PI + (i - 1) * 0.5;
        air.fillStyle(col(FATE.ivory), 0.55);
        air.fillCircle(s.x + Math.cos(a) * 13, s.y + Math.sin(a) * 13, 2.4);
      }
    }

    for (const b of this.curseBullets) {
      FateFx.drawCurseBullet(air, this.pcol, b.x, b.y, Math.atan2(b.vy, b.vx), t);
    }

    for (const allIn of [this.playerAllIn, this.npcAllIn]) {
      if (!allIn) continue;
      const span = Math.max(1, allIn.orbitMs);
      const ready = Phaser.Math.Clamp(1 - (allIn.activatesAt - time) / span, 0, 1);
      FateFx.drawWheel(air, this.col(allIn.owner), allIn.x, allIn.y, allIn.radius, t, ready, allIn.cocky);
    }
  }

  // ── Slows (Slash/Chill) + knockback (Pulse) enforcement ────────────

  private applySlow(target: Fighter, factor: number, ms: number): void {
    const now = this.arena.scene.time.now;
    const cur = this.slows.get(target);
    if (!cur || cur.until < now || factor < cur.factor) this.slows.set(target, { factor, until: now + ms });
    else cur.until = Math.max(cur.until, now + ms);
  }

  private applyKnockback(target: Fighter, vx: number, vy: number, ms: number): void {
    this.knocks.set(target, { vx, vy, until: this.arena.scene.time.now + ms });
  }

  private updateSlowsAndKnocks(time: number): void {
    for (const [target, s] of this.slows) {
      if (time >= s.until) { this.slows.delete(target); continue; }
      const body = target.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(body.velocity.x * s.factor, body.velocity.y * s.factor);
    }
    for (const [target, k] of this.knocks) {
      if (time >= k.until) { this.knocks.delete(target); continue; }
      (target.body as Phaser.Physics.Arcade.Body).setVelocity(k.vx, k.vy);
    }
  }

  // ── Mods (Buff card, Slots rolls) ─────────────────────────────────

  private addMod(owner: 'player' | 'npc', stat: FateModStat, mult: number, durationMs: number): void {
    const now = this.arena.scene.time.now;
    const list = owner === 'player' ? this.playerMods : this.npcMods;
    list.push({ stat, mult, until: now + durationMs });
  }

  private combinedMult(owner: 'player' | 'npc', stat: FateModStat, time: number): number {
    const list = owner === 'player' ? this.playerMods : this.npcMods;
    let m = 1;
    for (const mod of list) if (mod.stat === stat && mod.until > time) m *= mod.mult;
    return m;
  }

  private recomputeMods(owner: 'player' | 'npc', time: number): void {
    const list = owner === 'player' ? this.playerMods : this.npcMods;
    for (let i = list.length - 1; i >= 0; i--) if (list[i].until <= time) list.splice(i, 1);

    const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
    const speedMult = this.combinedMult(owner, 'speed', time);
    fighter.incomingDamageMultiplier = this.combinedMult(owner, 'dmgTaken', time);
    fighter.cooldownMult = this.combinedMult(owner, 'cd', time);
    const sizeMult = this.combinedMult(owner, 'size', time);
    if (fighter.sizeMult !== sizeMult) { fighter.sizeMult = sizeMult; fighter.applySizeMult(); }

    if (owner === 'player') this.arena.applyPlayerSpeedMult(speedMult);
    else this.arena.applyNpcSpeedMult(speedMult);
  }

  private dmgMultFor(owner: 'player' | 'npc', time: number): number {
    return this.combinedMult(owner, 'dmgDealt', time);
  }

  // ── Card actions ───────────────────────────────────────────────────

  private pickNpcIndex(hand: FateCard[]): number {
    if (hand.length === 0) return -1;
    const hpRatio = this.arena.npc.hp / this.arena.npc.maxHp;
    let bestIdx = 0;
    let bestScore = -Infinity;
    hand.forEach((c, i) => {
      let s = Math.random();
      if (ATTACK_TYPES.includes(c.type)) s += 2;
      if (c.type === 'heal' && hpRatio < 0.5) s += 3;
      if (c.enchanted) s += 1;
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    });
    return bestIdx;
  }

  doThrowCard(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const hand = owner === 'player' ? this.playerHand : this.npcHand;
    const idx = owner === 'player' ? this.playerSelected : this.pickNpcIndex(hand);
    if (idx < 0 || idx >= hand.length) return;
    const card = hand[idx];
    const time = this.arena.scene.time.now;
    // Stunning curse: the hand is frozen out entirely for a few seconds.
    if (owner === 'player' && time < this.cardLockUntil) return;

    // Open a damage tally so everything this one card ends up dealing — including
    // delayed projectiles, poison ticks and coin bounces — feeds the Big Hand stat.
    const ledgerId = owner === 'player' ? this.openLedger(time) : 0;
    this.activeLedgerId = ledgerId;
    this.paintCardPlayed(card, tx, ty, owner);
    this.executeCard(card, tx, ty, owner, time);
    this.activeLedgerId = 0;

    // R+ "Wonder Preserve": a preserved card keeps its enchanted status too.
    const keepEnchant = card.preserved && this.ownerHasUpgrade(owner, 'r');
    const curse = card.curse;
    if (card.enchanted && !keepEnchant) card.enchanted = false;
    if (card.greatEnchanted && !keepEnchant) { card.greatEnchanted = false; card.curse = null; }
    let survivor: FateCard | null = null;
    if (card.preserved) {
      card.preserved = false;
      survivor = card;
    } else {
      hand.splice(idx, 1);
      if (owner === 'player' && this.playerSelected >= hand.length) {
        this.playerSelected = Math.max(0, hand.length - 1);
      }
    }

    // The curse fires once the hand has settled, so Immolating/Purging see the real hand.
    if (owner === 'player' && curse) this.resolveCurse(curse, time, survivor);
  }

  doReroll(owner: 'player' | 'npc'): void {
    const size = owner === 'player' ? this.playerHandSize : this.npcHandSize;
    // Ash: the hand being thrown away is a hand's worth of discards.
    this.burnDiscards(owner, (owner === 'player' ? this.playerHand : this.npcHand).length);
    const hand: FateCard[] = Array.from({ length: size }, () => this.drawCardFor(owner));
    if (owner === 'player') this.playerHand = hand; else this.npcHand = hand;
    if (owner === 'player') {
      this.playerSelected = 0;
      this.playerDrawAccum = 0;
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, '🔄 Reroll!', '#88eecc');
    } else {
      this.npcDrawAccum = 0;
    }
    // A riffle between the hands — the only shuffle in the game, so it only ever means "new hand".
    const caster = this.casterOf(owner);
    this.avatar(owner)?.play('clap');
    this.fx(owner).riffle(caster.x, caster.y - 6, 46, 10, this.tones(owner));
    this.fx(owner).ring(caster.x, caster.y, 8, 48, FATE.mint, 340, 3, 5);
  }

  doPreserve(owner: 'player' | 'npc'): void {
    const hand = owner === 'player' ? this.playerHand : this.npcHand;
    const idx = owner === 'player' ? this.playerSelected : this.pickNpcIndex(hand);
    if (idx < 0 || idx >= hand.length) return;
    hand[idx].preserved = true;
    if (owner === 'player') this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, '✨ Preserved!', '#ffee44');
    // Sealing a card: a gilt ring closing inward and a scatter of gold.
    const caster = this.casterOf(owner);
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(caster.x, caster.y, 50, 16, FATE.gold, 400, 4, 5);
    this.fx(owner).sparkle(caster.x, caster.y - 10, 9, 30, 10, FATE.gold);
  }

  doEnchant(owner: 'player' | 'npc'): void {
    const hand = owner === 'player' ? this.playerHand : this.npcHand;
    const idx = owner === 'player' ? this.playerSelected : this.pickNpcIndex(hand);
    if (idx < 0 || idx >= hand.length) return;
    // Tarot's great enchant overrules a plain one and never stacks with it.
    if (hand[idx].greatEnchanted) {
      if (owner === 'player') this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, '🔮 Already greatly enchanted', '#cc99ff');
      return;
    }
    hand[idx].enchanted = true;
    if (owner === 'player') this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, '🔮 Enchanted!', '#cc88ff');
    const caster = this.casterOf(owner);
    this.avatar(owner)?.play('flex');
    this.fx(owner).ring(caster.x, caster.y, 52, 18, FATE.enchant, 400, 4, 5);
    this.fx(owner).sparkle(caster.x, caster.y - 10, 9, 30, 10, FATE.enchant);
  }

  private executeCard(card: FateCard, tx: number, ty: number, owner: 'player' | 'npc', time: number): void {
    // A greatly-enchanted (Tarot) card is 4x and replaces Enchant's 2x entirely; for the
    // non-damage "enchanted" perks on individual cards it counts as enchanted too, since
    // it is strictly the stronger version of the same effect.
    const mult = card.greatEnchanted ? GREAT_ENCHANT_MULT : card.enchanted ? 2 : 1;
    const strong = card.enchanted || card.greatEnchanted;
    // F+ "Enchant gives small extra bonuses": only when the card is enchanted AND the side owns F+.
    const ep = strong && this.ownerHasUpgrade(owner, 'f');
    const dmg = Math.round(BASE_DMG[card.type] * mult * this.dmgMultFor(owner, time));
    switch (card.type) {
      case 'laser': this.castLaser(tx, ty, owner, dmg, ep); break;
      case 'burst': this.castBurst(tx, ty, owner, dmg, ep); break;
      case 'barrier': this.castBarrier(owner, dmg, ep); break;
      case 'explosion': this.castExplosion(tx, ty, owner, dmg, ep); break;
      case 'infect': this.castInfect(tx, ty, owner, dmg, strong, ep); break;
      case 'coin': this.castCoin(owner, strong, ep); break;
      case 'heal': this.castHeal(owner, dmg, ep); break;
      case 'buff': this.castBuff(owner, strong, ep); break;
      case 'lightning': this.castLightning(tx, ty, owner, dmg, strong ? 4000 : 2000, ep); break;
      case 'slots': this.castSlots(tx, ty, owner, strong, ep); break;
      case 'boomerang': this.castBoomerang(owner, dmg, ep); break;
      case 'slash': this.castSlash(tx, ty, owner, dmg, ep); break;
      case 'phase': this.castPhase(tx, ty, owner, dmg, ep); break;
      case 'striker': this.castStriker(tx, ty, owner, dmg, ep); break;
      case 'pulse': this.castPulse(owner, dmg, ep); break;
      case 'chill': this.castChill(tx, ty, owner, dmg, ep); break;
      case 'chain': this.castChain(tx, ty, owner, dmg, ep); break;
      case 'emperor': this.castEmperor(tx, ty, owner, dmg, ep); break;
    }
  }

  private opponentsOf(owner: 'player' | 'npc'): Fighter[] {
    return owner === 'player' ? this.arena.enemies : [this.arena.player];
  }

  // ── Ash (divine perk) ─────────────────────────────────────────────────────

  /**
   * Ash: a card that leaves a hand without being played doesn't just vanish — it burns where it
   * falls. Blasts land around the caster's own feet, which makes churning a dead hand into a
   * zoning tool rather than a free ranged nuke, and staggered/capped so a whole rerolled hand
   * reads as a spread of little fires instead of one stacked detonation.
   */
  private burnDiscards(owner: 'player' | 'npc', count: number): void {
    if (count <= 0 || !this.arena.hasPerk(owner, 'ash')) return;
    const caster = this.casterOf(owner);
    if (!caster?.active) return;
    if (!this.ashFx) this.ashFx = new FireFx(this.arena.scene);
    const blasts = Math.min(ASH_MAX_BLASTS, count);
    for (let i = 0; i < blasts; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 14 + Math.random() * ASH_SCATTER;
      const bx = caster.x + Math.cos(a) * d;
      const by = caster.y + Math.sin(a) * d;
      this.arena.scene.time.delayedCall(i * 90, () => this.ashBlast(bx, by, owner));
    }
  }

  private ashBlast(x: number, y: number, owner: 'player' | 'npc'): void {
    const fx = this.ashFx;
    if (!fx) return;
    const time = this.arena.scene.time.now;
    fx.explosion(x, y, ASH_RADIUS, { shards: 10, smoke: 4, duration: 420 });
    fx.scorch(x, y, ASH_RADIUS * 0.5);
    fx.embers(x, y, 7, { speed: 180, size: 3, life: 520, rise: 40 });

    for (const v of this.opponentsOf(owner)) {
      if (!v?.active || v.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, v.x, v.y) > ASH_RADIUS) continue;
      v.takeDamage(ASH_DAMAGE);
      v.burningUntil = Math.max(v.burningUntil, time + Math.round(ASH_BURN_MS * v.statusDurMult));
      this.arena.spawnHitFlash(v.x, v.y, FIRE.orange);
      this.arena.showFloatingText(v.x, v.y - 34, '🌫️ ASH', '#ff8844');
    }
  }

  /**
   * The flourish every card shares: the caster's gesture, the card leaving their hand, and an
   * escalation that scales with how loaded the card was. A greatly-enchanted card is 4× and has
   * to *look* like it — more cards in the flourish, a Tarot-coloured ring, a rain of chips —
   * rather than simply dealing a bigger number.
   */
  private paintCardPlayed(card: FateCard, tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = this.casterOf(owner);
    const fx = this.fx(owner);
    const def = DEF_BY_TYPE.get(card.type)!;
    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    // Cards thrown at your own feet (Buff, Barrier, Coin, Boomerang, Pulse) point up instead,
    // so the flourish doesn't stab sideways at nothing.
    const selfCast = card.type === 'buff' || card.type === 'barrier' || card.type === 'coin'
      || card.type === 'boomerang' || card.type === 'pulse' || card.type === 'heal';
    const gestureAng = selfCast ? -Math.PI / 2 : ang;

    this.avatar(owner)?.play(CARD_GESTURES[card.type], gestureAng);

    const tier = card.greatEnchanted ? 2 : card.enchanted ? 1 : 0;
    const tones = card.greatEnchanted ? TAROT_TONES : this.tones(owner);
    const hand = this.avatar(owner)?.castHand() ?? { x: caster.x, y: caster.y };
    fx.flick(hand.x, hand.y, gestureAng, def.color, 1 + tier * 0.35, 9, tones, CARD_SUITS[card.type]);

    if (tier > 0) {
      // Enchanted: gold. Greatly enchanted: the Tarot magenta, plus chips on the table.
      const glow = card.greatEnchanted ? FATE.great : FATE.gold;
      fx.ring(caster.x, caster.y, 12, 44 + tier * 22, glow, 320 + tier * 140, 3 + tier, 5);
      fx.sparkle(caster.x, caster.y, 5 + tier * 6, 34 + tier * 14, 10, glow);
      if (card.greatEnchanted) fx.chips(caster.x, caster.y, 7, 52, 6, FATE.great);
    }
  }

  // ── Laser ──────────────────────────────────────────────────────────

  private castLaser(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, ep = false): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const lid = this.activeLedgerId;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const range = 1400;
    const W = scene.scale.width; const H = scene.scale.height;

    // F+ "Laser can now bounce off of 3 walls": trace a reflecting polyline.
    const bounces = ep ? 3 : 0;
    const pts: { x: number; y: number }[] = [{ x: caster.x, y: caster.y }];
    let px = caster.x, py = caster.y, dx = Math.cos(angle), dy = Math.sin(angle);
    let remaining = range, segCount = 0;
    for (;;) {
      let tHit = remaining, axis = 0;
      if (dx > 1e-6) { const t = (W - px) / dx; if (t < tHit) { tHit = t; axis = 1; } }
      if (dx < -1e-6) { const t = (0 - px) / dx; if (t < tHit) { tHit = t; axis = 1; } }
      if (dy > 1e-6) { const t = (H - py) / dy; if (t < tHit) { tHit = t; axis = 2; } }
      if (dy < -1e-6) { const t = (0 - py) / dy; if (t < tHit) { tHit = t; axis = 2; } }
      px += dx * tHit; py += dy * tHit; remaining -= tHit;
      pts.push({ x: px, y: py });
      if (axis === 0 || remaining <= 1 || segCount >= bounces) break;
      if (axis === 1) dx = -dx; else dy = -dy;
      segCount++;
    }

    // Damage each opponent at most once across all beam segments.
    for (const target of this.opponentsOf(owner)) {
      if (!target.active || target.hp <= 0) continue;
      let onBeam = false;
      for (let s = 0; s + 1 < pts.length && !onBeam; s++) {
        if (this.pointToSegmentDist(target.x, target.y, pts[s].x, pts[s].y, pts[s + 1].x, pts[s + 1].y) <= 28) onBeam = true;
      }
      if (onBeam) {
        target.takeDamage(dmg);
        this.creditCardDamage(lid, dmg);
        this.arena.spawnHitFlash(target.x, target.y, 0xff3333);
        this.fx(owner).payout(target.x, target.y, 40, {
          cards: 5, chips: 2, litter: false, depth: 9, face: 0xff3333, tones: this.tones(owner),
        });
      }
    }

    // If the first beam segment passes over one of the caster's own coins, it
    // reflects off the nearest one into a 2× (4× if paired) coin bounce.
    const a = pts[0]; const b = pts[1];
    let bestCoinIdx = -1, bestCoinDist = Infinity;
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if ((c.owner === 'player') !== (owner === 'player')) continue;
      const perp = this.pointToSegmentDist(c.x, c.y, a.x, a.y, b.x, b.y);
      const forwardDot = (c.x - a.x) * Math.cos(angle) + (c.y - a.y) * Math.sin(angle);
      if (perp <= 22 && forwardDot > 0 && forwardDot < bestCoinDist) { bestCoinDist = forwardDot; bestCoinIdx = i; }
    }
    if (bestCoinIdx >= 0) this.reflectCoin(bestCoinIdx, dmg);

    // Each leg of the beam is a stream of cards dealt down it — bank shots off the walls read
    // as separate legs rather than as one bent rectangle.
    const fx = this.fx(owner);
    for (let s = 0; s + 1 < pts.length; s++) {
      const p0 = pts[s], p1 = pts[s + 1];
      scene.time.delayedCall(s * 40, () =>
        fx.dealtBeam(p0.x, p0.y, p1.x, p1.y, 0xff3333, 9, this.tones(owner), 4));
    }
  }

  private pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax; const dy = by - ay;
    const lenSq = dx * dx + dy * dy || 1;
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx; const cy = ay + t * dy;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  }

  // ── Burst ──────────────────────────────────────────────────────────

  private castBurst(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, ep = false): void {
    const isPlayer = owner === 'player';
    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const baseAngle = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = 480;
    // F+ "Burst: +2 extra bullets" → 7 pellets instead of 5.
    const degs = ep ? [-30, -20, -10, 0, 10, 20, 30] : [-24, -12, 0, 12, 24];
    for (const deg of degs) {
      const angle = baseAngle + deg * (Math.PI / 180);
      const proj = new Projectile(this.arena.scene, caster.x, caster.y, 'proj-fate-burst', dmg, isPlayer);
      (proj as any).fateLedgerId = this.activeLedgerId;
      this.arena.projectiles.add(proj);
      proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
      proj.setRotation(angle);
    }
    // The cone the pellets left through, so a spray reads as one shot rather than five beads.
    this.fx(owner).cards(caster.x, caster.y, degs.length, {
      speed: 240, spread: (degs.length > 5 ? 0.55 : 0.44), angle: baseAngle,
      size: 10, life: 340, fall: 6, depth: 7, face: 0xff8800, tones: this.tones(owner),
    });
  }

  // ── Barrier ────────────────────────────────────────────────────────

  private castBarrier(owner: 'player' | 'npc', dmg: number, ep = false): void {
    const isPlayer = owner === 'player';
    const caster = isPlayer ? this.arena.player : this.arena.npc;
    // F+ "Barrier: 2× the bullets, bullets move 300% slower".
    const speed = ep ? 380 / 4 : 380;
    const count = ep ? 30 : 15;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const proj = new Projectile(this.arena.scene, caster.x, caster.y, 'proj-fate-barrier', dmg, isPlayer);
      (proj as any).fateLedgerId = this.activeLedgerId;
      this.arena.projectiles.add(proj);
      proj.launch(Math.cos(angle) * speed, Math.sin(angle) * speed);
      proj.setRotation(angle);
    }
    // The wall going up: a full ring of cards laid out around the caster.
    this.fx(owner).ring(caster.x, caster.y, 8, ep ? 70 : 50, 0x4488ff, 420, 4, 6);
  }

  // ── Explosion ──────────────────────────────────────────────────────

  private castExplosion(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, ep = false): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const dist = Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty);
    const travelMs = Math.max(150, (dist / 500) * 1000);
    const lid = this.activeLedgerId;

    const fx = this.fx(owner);
    const tones = this.tones(owner);
    const startX = caster.x, startY = caster.y;
    const heading = Math.atan2(ty - startY, tx - startX);
    // Shared with the detonation below: a bomb that bounced off a coin must not also go off.
    const flight = { reflected: false };

    // The bomb is a card in flight — it tumbles the whole way and its fuse burns visibly down,
    // so a thrown Explosion is legible as a thrown thing rather than as a sliding dot.
    fx.anim(8, travelMs, (g, t) => {
      if (flight.reflected) return;
      const bx = startX + (tx - startX) * t;
      const by = startY + (ty - startY) * t;

      // If the bomb crosses one of the caster's own coins mid-flight, it bounces off into the
      // same 2× (4× if paired) coin beam instead of exploding.
      for (let i = 0; i < this.coins.length; i++) {
        const c = this.coins[i];
        if ((c.owner === 'player') !== (owner === 'player')) continue;
        if (Phaser.Math.Distance.Between(bx, by, c.x, c.y) <= 22) {
          flight.reflected = true;
          this.reflectCoin(i, dmg);
          return;
        }
      }

      FateFx.drawFlyingCard(g, this.col(owner), tones, bx, by, heading, 17, t * 10, 0xcc2222, 'diamond');
      // Fuse: a spark riding the card's leading corner, hotter the closer it is to landing.
      const fuse = 0.5 + 0.5 * Math.sin(t * (14 + t * 40));
      g.fillStyle(this.col(owner)(t > 0.7 ? FATE.ivory : FATE.gold), 0.9 * fuse);
      g.fillCircle(bx + Math.cos(heading) * 11, by + Math.sin(heading) * 11, 2.4 + t * 2.4);
    });

    scene.time.delayedCall(travelMs, () => {
      if (flight.reflected) return;
      // F+ "Explosion: 2× AOE range".
      const radius = ep ? 180 : 90;
      for (const target of this.opponentsOf(owner)) {
        if (!target.active || target.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(tx, ty, target.x, target.y) <= radius) {
          target.takeDamage(dmg);
          this.creditCardDamage(lid, dmg);
        }
      }
      // A doubled blast radius earns a correspondingly bigger hand thrown down, not just a
      // wider circle: more cards, more chips, a longer burn and a harder shake.
      fx.payout(tx, ty, radius, {
        cards: ep ? 16 : 9, chips: ep ? 8 : 4,
        duration: ep ? 620 : 400, depth: 9, face: 0xff8800, tones,
      });
      this.arena.spawnHitFlash(tx, ty, 0xff4400);
      scene.cameras.main.shake(ep ? 260 : 150, ep ? 0.008 : 0.004);
    });
  }

  // ── Infect ─────────────────────────────────────────────────────────

  private castInfect(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, enchanted: boolean, ep = false): void {
    const isPlayer = owner === 'player';
    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const dotDps = enchanted ? 6 : 3;
    // F+ "Infect: 2× infect effect duration" (3s → 6s).
    const durMs = ep ? 6000 : 3000;
    const lid = this.activeLedgerId;
    for (let i = 0; i < 3; i++) {
      this.arena.scene.time.delayedCall(i * 100, () => {
        if (!caster.active) return;
        const dx = tx - caster.x;
        const dy = ty - caster.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const proj = new Projectile(this.arena.scene, caster.x, caster.y, 'proj-fate-infect', dmg, isPlayer);
        (proj as any).fateInfectDps = dotDps;
        (proj as any).fateInfectDurMs = durMs;
        (proj as any).fateLedgerId = lid;
        this.arena.projectiles.add(proj);
        proj.launch((dx / len) * 460, (dy / len) * 460);
      });
    }
  }

  /** Called from ArenaScene's hit pipeline when a proj-fate-infect projectile connects. */
  applyPoison(target: Fighter, dps: number, time: number, durMs = 3000, ledgerId = 0): void {
    let p = this.poison.get(target);
    if (!p) {
      p = { until: 0, dps: 0, tickAccum: 0, ledgerId };
      this.poison.set(target, p);
      // The infection lands with a splash and then leaves a drip that reads between ticks.
      this.pfx.payout(target.x, target.y, 34, {
        cards: 4, chips: 0, litter: false, depth: 9, face: 0x55cc55, tones: HOUSE_TONES,
      });
      this.poisonAuras.set(target, new FateAura(this.arena.scene, this.pcol, 'poison', 26, 4));
    }
    p.until = Math.max(p.until, time + durMs);
    p.dps = Math.max(p.dps, dps);
    // Refreshing with a newer card re-points the tally so its ticks count toward that card.
    if (ledgerId) p.ledgerId = ledgerId;
  }

  private updatePoison(time: number, delta: number): void {
    for (const [target, p] of this.poison) {
      if (time > p.until) {
        this.poison.delete(target);
        continue;
      }
      p.tickAccum += delta;
      if (p.tickAccum >= 1000) {
        p.tickAccum -= 1000;
        if (target.active && target.hp > 0) {
          target.takeDamage(p.dps);
          this.creditCardDamage(p.ledgerId, p.dps);
          // A tick that isn't visible on the victim is just a number appearing out of nowhere.
          this.pfx.cards(target.x, target.y, 2, {
            speed: 60, size: 6, life: 420, fall: 30, depth: 7, face: 0x55cc55, tones: HOUSE_TONES,
          });
        }
      }
    }
  }

  // ── Coin ───────────────────────────────────────────────────────────

  private castCoin(owner: 'player' | 'npc', enchanted: boolean, ep = false): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const time = scene.time.now;
    const count = enchanted ? 2 : 1;
    const pairId = this.coinPairCounter++;
    // F+ "Coin: moves 50% slower" (both the rise speed and the hover-time).
    const slow = ep ? 0.5 : 1;
    for (let i = 0; i < count; i++) {
      const x = caster.x + (i - (count - 1) / 2) * 26;
      this.coins.push({
        x, y: caster.y, vy: -260 * slow,
        risingUntil: time + 500 / slow, expiresAt: time + 6000,
        owner, pairId, ledgerId: this.activeLedgerId,
      });
      // The toss: sparks off the hand as the coin leaves it.
      this.fx(owner).sparkle(x, caster.y, 5, 16, 9, FATE.gold);
    }
    void scene;
  }

  private updateCoins(time: number, delta: number): void {
    const bottom = this.arena.scene.scale.height - 40;
    const dt = delta / 1000;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (time > c.expiresAt) { this.coins.splice(i, 1); continue; }
      if (time < c.risingUntil) {
        c.y += c.vy * dt;
      } else {
        c.vy = 50;
        c.y = Math.min(bottom, c.y + c.vy * dt);
      }
    }
  }

  /** Reflects an owner-matching projectile off a coin into a 2× (4× if paired/enchanted) hitscan laser. */
  private tryReflectOffCoin(proj: Projectile, time: number): boolean {
    void time;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      const sameOwner = (c.owner === 'player') === proj.isFromPlayer;
      if (!sameOwner) continue;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, c.x, c.y) > 18) continue;
      this.reflectCoin(i, proj.damage);
      return true;
    }
    return false;
  }

  /**
   * Bounces `incomingDamage` off the coin at index `i` (and its pair) into a 2×
   * (4× if paired) hitscan beam at the coin's owner's target, then consumes the
   * coin(s). Shared by projectile hits and the Laser card passing over a coin.
   */
  private reflectCoin(i: number, incomingDamage: number): void {
    const c = this.coins[i];
    const partner = this.coins.find((o, j) => j !== i && o.pairId === c.pairId);
    const damage = incomingDamage * (partner ? 4 : 2);
    const caster = c.owner === 'player' ? this.arena.player : this.arena.npc;
    const target = this.opponentsOf(c.owner)[0] ?? (c.owner === 'player' ? this.arena.npc : this.arena.player);

    const fx = this.fx(c.owner);
    const tones = this.tones(c.owner);
    // The bank shot is dealt down each leg, so a paired 4× bounce visibly travels through both
    // coins rather than appearing as one long line.
    if (partner) fx.dealtBeam(caster.x, caster.y, partner.x, partner.y, FATE.gold, 9, tones, 4);
    fx.dealtBeam(c.x, c.y, target.x, target.y, FATE.gold, 9, tones, partner ? 6 : 4);
    fx.flash(c.x, c.y, partner ? 26 : 18, 10, FATE.gold);
    fx.chips(c.x, c.y, partner ? 8 : 4, 40, 8, FATE.gold);

    if (target.active && target.hp > 0) {
      target.takeDamage(damage);
      this.creditCardDamage(c.ledgerId, damage);
      this.arena.spawnHitFlash(target.x, target.y, 0xffee00);
      fx.payout(target.x, target.y, partner ? 60 : 40, {
        cards: partner ? 10 : 5, chips: partner ? 6 : 3,
        litter: false, depth: 9, face: FATE.gold, tones,
      });
    }
    // Mastery "Ricochet": one tick per bounce, whether or not it connected.
    if (c.owner === 'player') this.arena.recordMasteryStat('coinBounces', 1);

    const toRemove = partner ? [i, this.coins.indexOf(partner)] : [i];
    toRemove.sort((a, b) => b - a);
    for (const idx of toRemove) this.coins.splice(idx, 1);
  }

  // ── Heal ───────────────────────────────────────────────────────────

  private castHeal(owner: 'player' | 'npc', amountPerOrb: number, ep = false): void {
    const scene = this.arena.scene;
    const time = scene.time.now;
    const W = scene.scale.width; const H = scene.scale.height;
    const fx = this.fx(owner);
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(60, W - 60);
      const y = Phaser.Math.Between(90, H - 60);
      this.healOrbs.push({
        x, y, owner, expiresAt: time + 8000, amount: amountPerOrb,
        // F+ "Heal: orbs will very slowly move towards the player".
        homing: ep, phase: Math.random() * Math.PI * 2,
      });
      // Each orb is dealt onto the table rather than simply appearing there.
      fx.ring(x, y, 22, 6, 0x44dd88, 300, 2.5, 4);
    }
    void scene;
  }

  private updateHealOrbs(time: number): void {
    for (let i = this.healOrbs.length - 1; i >= 0; i--) {
      const o = this.healOrbs[i];
      if (time > o.expiresAt) { this.healOrbs.splice(i, 1); continue; }
      const fighter = o.owner === 'player' ? this.arena.player : this.arena.npc;
      // F+ homing: drift very slowly toward the owner.
      if (o.homing) {
        const ang = Math.atan2(fighter.y - o.y, fighter.x - o.x);
        o.x += Math.cos(ang) * 0.6;
        o.y += Math.sin(ang) * 0.6;
      }
      if (Phaser.Math.Distance.Between(fighter.x, fighter.y, o.x, o.y) <= 24) {
        fighter.heal(o.amount);
        this.arena.showFloatingText(o.x, o.y - 16, `+${o.amount} HP`, '#44dd88');
        this.fx(o.owner).sparkle(o.x, o.y, 7, 20, 9, 0x44dd88);
        this.fx(o.owner).ring(o.x, o.y, 6, 30, 0x44dd88, 300, 2.5, 5);
        this.healOrbs.splice(i, 1);
      }
    }
  }

  // ── Buff ───────────────────────────────────────────────────────────

  private castBuff(owner: 'player' | 'npc', enchanted: boolean, ep = false): void {
    const pct = enchanted ? 0.20 : 0.10;
    // F+ "Buff: 1.5× buff duration".
    const duration = ep ? 12000 : 8000;
    this.addMod(owner, 'speed', 1 + pct, duration);
    this.addMod(owner, 'dmgDealt', 1 + pct, duration);
    this.addMod(owner, 'dmgTaken', 1 - pct, duration);
    if (owner === 'player') this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 36, `💪 +${Math.round(pct * 100)}%`, '#dd88ff');
    // Ignition burst on the frame the stance turns on; the aura carries it from there.
    const caster = this.casterOf(owner);
    const fx = this.fx(owner);
    fx.ring(caster.x, caster.y, 46, 14, FATE.enchant, 380, 4, 5);
    fx.sparkle(caster.x, caster.y, enchanted ? 12 : 7, 36, 9, FATE.enchant);
  }

  // ── Lightning ──────────────────────────────────────────────────────

  private castLightning(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, stunMs: number, ep = false): void {
    const now = this.arena.scene.time.now;
    // F+ "Lightning: 1.5× AOE duration" (telegraph window before the bolt lands). The ring
    // itself is repainted every frame in drawWorld so it can wind up as the timer runs out.
    this.lightningStrikes.push({
      x: tx, y: ty, owner, dmg, stunMs,
      openedAt: now, resolveAt: now + (ep ? 3000 : 2000),
      ledgerId: this.activeLedgerId,
    });
  }

  private updateLightningStrikes(time: number): void {
    for (let i = this.lightningStrikes.length - 1; i >= 0; i--) {
      const s = this.lightningStrikes[i];
      if (time < s.resolveAt) continue;
      this.lightningStrikes.splice(i, 1);

      const fx = this.fx(s.owner);
      const scene = this.arena.scene;
      // The bolt is dealt out of the sky as a column of cards, then the pot pays out on impact.
      fx.dealtBeam(s.x, s.y - 320, s.x, s.y, 0xffee44, 11, this.tones(s.owner), 7);
      fx.payout(s.x, s.y, 70, {
        cards: 10, chips: 5, depth: 9, face: 0xffee44, tones: this.tones(s.owner),
      });
      this.arena.spawnHitFlash(s.x, s.y, 0xffee44);
      scene.cameras.main.shake(180, 0.005);

      for (const target of this.opponentsOf(s.owner)) {
        if (!target.active || target.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(s.x, s.y, target.x, target.y) <= 70) {
          target.takeDamage(s.dmg);
          this.creditCardDamage(s.ledgerId, s.dmg);
          if (target === this.arena.player) this.playerStunUntil = Math.max(this.playerStunUntil, time + s.stunMs);
          else this.npcStunUntil = Math.max(this.npcStunUntil, time + s.stunMs);
          this.arena.showFloatingText(target.x, target.y - 40, '⚡ STUNNED', '#ffee44');
        }
      }
    }
  }

  // ── Slots ──────────────────────────────────────────────────────────

  private castSlots(tx: number, ty: number, owner: 'player' | 'npc', enchanted: boolean, ep = false): void {
    const scene = this.arena.scene;
    const time = scene.time.now;
    const count = enchanted ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const ownSame = this.slotMachines.filter((sm) => sm.owner === owner);
      if (ownSame.length >= 2) {
        const oldest = ownSame[0];
        const idx = this.slotMachines.indexOf(oldest);
        // The retired cabinet is cashed out rather than simply vanishing.
        this.fx(owner).chips(oldest.x, oldest.y, 5, 34, 7, FATE.brass);
        this.slotMachines.splice(idx, 1);
      }
      const x = tx + (i - (count - 1) / 2) * 50;
      const y = ty;
      this.slotMachines.push({ x, y, owner, cycleDmgPlayer: 0, cycleDmgNpc: 0, cycleEnd: time + 10000, halfReq: ep });
      // Landing thump: the cabinet is dropped onto the table.
      this.fx(owner).ring(x, y, 8, 54, 0xff66cc, 380, 4, 5);
      this.fx(owner).chips(x, y, 4, 30, 7, FATE.gold);
    }
    void scene;
  }

  private updateSlotMachines(time: number): void {
    for (const sm of this.slotMachines) {
      const total = sm.cycleDmgPlayer + sm.cycleDmgNpc;
      // F+ "Slots: ½ requirements to get good rolls" halves the buff/jackpot thresholds.
      const buffReq = sm.halfReq ? 12.5 : 25;
      const jackpotReq = sm.halfReq ? 25 : 50;
      if (time < sm.cycleEnd) continue;

      sm.cycleEnd = time + 10000;
      if (total <= 0) { sm.cycleDmgPlayer = 0; sm.cycleDmgNpc = 0; continue; }

      const winner: 'player' | 'npc' = sm.cycleDmgPlayer >= sm.cycleDmgNpc ? 'player' : 'npc';
      const fighter = winner === 'player' ? this.arena.player : this.arena.npc;
      const isBuff = total >= buffReq;
      const pct = total >= jackpotReq ? 0.35 : 0.15;
      const stat: FateModStat = (['dmgTaken', 'speed', 'size', 'cd', 'dmgDealt'] as FateModStat[])[Math.floor(Math.random() * 5)];
      const mult = isBuff
        ? (stat === 'dmgTaken' ? 1 - pct : stat === 'size' ? 1 - pct : stat === 'cd' ? 1 - pct : 1 + pct)
        : (stat === 'dmgTaken' ? 1 + pct : stat === 'size' ? 1 + pct : stat === 'cd' ? 1 + pct : stat === 'dmgDealt' ? 1 - pct : 1 - pct);
      this.addMod(winner, stat, mult, 10000);

      const jackpot = total >= jackpotReq;
      const label = isBuff ? (jackpot ? `🎰 JACKPOT +${Math.round(pct * 100)}%!` : `🎰 +${Math.round(pct * 100)}%`) : `🎰 -${Math.round(pct * 100)}%`;
      this.arena.showFloatingText(fighter.x, fighter.y - 40, label, isBuff ? '#ffee00' : '#ff6666');
      // The machine pays out where it stands: a jackpot buries the table in chips, a bust
      // coughs up a couple of dud cards.
      const fx = this.fx(winner);
      if (isBuff) {
        fx.chips(sm.x, sm.y, jackpot ? 18 : 8, jackpot ? 90 : 50, 8, FATE.gold);
        fx.sparkle(sm.x, sm.y, jackpot ? 16 : 7, jackpot ? 70 : 40, 10, FATE.gold);
        fx.ring(sm.x, sm.y, 10, jackpot ? 120 : 70, FATE.gold, jackpot ? 520 : 360, 4, 6);
        fx.ring(fighter.x, fighter.y, 44, 12, FATE.gold, 340, 3, 5);
      } else {
        fx.cards(sm.x, sm.y, 4, { speed: 90, size: 9, life: 520, depth: 7, face: FATE.ash, tones: this.tones(winner) });
        fx.ring(fighter.x, fighter.y, 12, 44, FATE.blood, 340, 3, 5);
      }
      sm.cycleDmgPlayer = 0;
      sm.cycleDmgNpc = 0;
    }
  }

  // ── Shared projectile-interaction pass (coins + slot machines) ────

  private updateProjectileInteractions(time: number): void {
    if (this.coins.length === 0 && this.slotMachines.length === 0) return;
    const children = this.arena.projectiles.getChildren() as Projectile[];
    for (const proj of children) {
      if (!proj.active) continue;
      if (this.coins.length > 0 && this.tryReflectOffCoin(proj, time)) {
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        continue;
      }
      for (const sm of this.slotMachines) {
        if (Phaser.Math.Distance.Between(proj.x, proj.y, sm.x, sm.y) > 26) continue;
        if (proj.isFromPlayer) sm.cycleDmgPlayer += proj.damage; else sm.cycleDmgNpc += proj.damage;
        this.arena.spawnHitFlash(sm.x, sm.y, 0xffcc44);
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        break;
      }
    }
  }

  // ── All In (Q) ─────────────────────────────────────────────────────

  doAllIn(owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    // Q+ "Roulette Expert": the player wagers the gamble-bar amount and gets +2s
    // of orbit time before the circle detonates.
    const rouletteExpert = owner === 'player' && this.arena.hasUpgrade('q');
    // Cocky curse: the bet is no longer yours to size — it's the whole health bar.
    const cocky = owner === 'player' && this.cockyAllIn;
    const wager = cocky ? Math.max(1, Math.ceil(caster.hp))
      : rouletteExpert ? Math.max(1, this.gambleHp)
      : 50;
    const orbitMs = rouletteExpert ? 5000 : 3000;
    const allIn: FateAllIn = {
      owner, activatesAt: scene.time.now + orbitMs, orbitMs, orbitAngle: 0,
      x: caster.x + 100, y: caster.y, radius: 50, wager, cocky,
    };
    if (owner === 'player') this.playerAllIn = allIn; else this.npcAllIn = allIn;
    this.arena.showFloatingText(caster.x, caster.y - 36, `${cocky ? '😈' : '🎰'} All In! (${wager} HP)`, cocky ? '#ff6666' : '#ffcc44');
    // Putting the bet on the table: the ante gathers on the caster while the wheel spins up.
    const fx = this.fx(owner);
    this.avatar(owner)?.play('raise', -Math.PI / 2, 900);
    fx.ante(caster.x, caster.y, 52, Math.min(1200, orbitMs),
      () => (caster.active ? { x: caster.x, y: caster.y } : null), 5, this.tones(owner));
    fx.ring(caster.x, caster.y, 10, 96, cocky ? FATE.blood : FATE.gold, 480, 5, 5);
  }

  private updateAllIn(allIn: FateAllIn, time: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const orbitR = 100;
    if (owner === 'player') {
      const dx = this.lastMouseX - caster.x;
      const dy = this.lastMouseY - caster.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      allIn.orbitAngle = Math.atan2(dy / len, dx / len);
    }
    const ax = caster.x + Math.cos(allIn.orbitAngle) * orbitR;
    const ay = caster.y + Math.sin(allIn.orbitAngle) * orbitR;
    // Written for drawWorld, which repaints the wheel (and its ball) every frame.
    allIn.x = ax;
    allIn.y = ay;

    if (time < allIn.activatesAt) return;

    const target = owner === 'player' ? this.arena.npc : this.arena.player;
    const hit = Phaser.Math.Distance.Between(ax, ay, target.x, target.y) <= allIn.radius;
    const fx = this.fx(owner);
    if (hit) {
      target.takeDamage(allIn.wager);
      this.arena.spawnHitFlash(target.x, target.y, 0xffcc44);
      this.arena.showFloatingText(caster.x, caster.y - 50, `🎰 HIT! ${allIn.wager}`, '#ffee44');
      // Mastery "High Roller": only the player's landed wagers count.
      if (owner === 'player') this.arena.recordMasteryStat('allInHits', 1);
      // A won bet pays out in proportion to what was staked.
      const stake = Phaser.Math.Clamp(allIn.wager / 120, 0.3, 1.6);
      fx.payout(ax, ay, allIn.radius * 2, {
        cards: Math.round(10 * stake) + 6, chips: Math.round(10 * stake) + 4,
        duration: 480 + Math.round(stake * 240), depth: 9,
        face: FATE.gold, tones: this.tones(owner),
      });
      fx.dealtBeam(ax, ay, target.x, target.y, FATE.gold, 10, this.tones(owner), 6);
      this.arena.scene.cameras.main.shake(180 + stake * 140, 0.005 + stake * 0.004);
    } else {
      caster.applySelfDamage(allIn.wager);
      this.arena.showFloatingText(caster.x, caster.y - 50, `🎰 MISS! -${allIn.wager} HP`, '#ff8888');
      // A lost bet is swept off the table: dead cards, no chips, no sparkle.
      fx.cards(ax, ay, 9, {
        speed: 130, size: 11, life: 700, fall: 90, depth: 8,
        face: FATE.ash, tones: this.tones(owner),
      });
      fx.litter(ax, ay, allIn.radius, 1, this.tones(owner));
      fx.ring(ax, ay, allIn.radius, 8, FATE.shade, 420, 4, 6);
    }

    if (owner === 'player') this.playerAllIn = null; else this.npcAllIn = null;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  New Cards! (Click+ upgrade card pool)
  // ═══════════════════════════════════════════════════════════════════

  // ── Boomerang: a yellow orb orbits the caster for 3s, 15 dmg on contact ──
  private castBoomerang(owner: 'player' | 'npc', dmg: number, ep: boolean): void {
    const scene = this.arena.scene;
    const time = scene.time.now;
    const count = ep ? 2 : 1; // F+ "Boomerang: summon 2 projectiles instead of 1"
    const caster = this.casterOf(owner);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.boomerangs.push({
        owner, angle, radius: 92, dmg, expiresAt: time + 3000,
        hitAt: new Map(), ledgerId: this.activeLedgerId,
        x: caster.x + Math.cos(angle) * 92, y: caster.y + Math.sin(angle) * 92,
      });
    }
    this.fx(owner).ring(caster.x, caster.y, 20, 92, 0xffe000, 380, 3, 5);
    void scene;
  }

  private updateBoomerangs(time: number): void {
    for (let i = this.boomerangs.length - 1; i >= 0; i--) {
      const b = this.boomerangs[i];
      if (time > b.expiresAt) {
        // It leaves the orbit as a thrown card rather than blinking out.
        this.fx(b.owner).cards(b.x, b.y, 3, {
          speed: 180, angle: b.angle + Math.PI / 2, spread: 0.4,
          size: 12, life: 420, depth: 8, face: 0xffe000, tones: this.tones(b.owner),
        });
        this.boomerangs.splice(i, 1);
        continue;
      }
      const caster = b.owner === 'player' ? this.arena.player : this.arena.npc;
      b.angle += 0.13;
      b.x = caster.x + Math.cos(b.angle) * b.radius;
      b.y = caster.y + Math.sin(b.angle) * b.radius;
      for (const target of this.opponentsOf(b.owner)) {
        if (!target.active || target.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y) > 26) continue;
        const last = b.hitAt.get(target) ?? -1000;
        if (time - last < 500) continue;
        b.hitAt.set(target, time);
        target.takeDamage(b.dmg);
        this.creditCardDamage(b.ledgerId, b.dmg);
        this.arena.spawnHitFlash(target.x, target.y, 0xffe000);
        this.fx(b.owner).payout(target.x, target.y, 34, {
          cards: 4, chips: 2, litter: false, depth: 9, face: 0xffe000, tones: this.tones(b.owner),
        });
      }
    }
  }

  // ── Slash: a close red arc in front of the caster, 15 dmg ──
  private castSlash(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, ep: boolean): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const lid = this.activeLedgerId;
    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    const range = 100;
    const halfCone = Math.PI * 0.42;
    for (const target of this.opponentsOf(owner)) {
      if (!target.active || target.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y) > range + 24) continue;
      const to = Math.atan2(target.y - caster.y, target.x - caster.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(to - ang)) > halfCone) continue;
      target.takeDamage(dmg);
      this.creditCardDamage(lid, dmg);
      this.arena.spawnHitFlash(target.x, target.y, 0xff2222);
      // F+ "Slash: applies a 50% slow for 5 seconds".
      if (ep) { this.applySlow(target, 0.5, 5000); this.arena.showFloatingText(target.x, target.y - 40, '🐌 SLOW', '#88ddff'); }
      this.fx(owner).payout(target.x, target.y, 34, {
        cards: 4, chips: 1, litter: false, depth: 9, face: 0x8b0000, tones: this.tones(owner),
      });
    }
    // The cut itself: a card edge sweeping the arc, thin at both ends and fat in the middle,
    // with the blade-line running just ahead of it.
    const col = this.col(owner);
    this.fx(owner).anim(9, 260, (g, t) => {
      const fade = 1 - t * t;
      const lead = ang - halfCone + t * halfCone * 2;
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const a = ang - halfCone + (i / steps) * halfCone * 2;
        if (a > lead) break;
        const along = Math.sin((i / steps) * Math.PI);
        const w = 2 + along * 9;
        g.fillStyle(col(i % 3 === 0 ? FATE.blood : 0x8b0000), 0.75 * fade * (0.4 + along * 0.6));
        g.fillCircle(caster.x + Math.cos(a) * range, caster.y + Math.sin(a) * range, w);
      }
      // Bright leading edge — where the card actually is right now.
      g.lineStyle(3, col(FATE.ivory), 0.9 * fade);
      g.beginPath();
      g.arc(caster.x, caster.y, range, Math.max(ang - halfCone, lead - 0.4), lead);
      g.strokePath();
    });
    void scene;
  }

  // ── Phase: a short blink toward the cursor, 10 dmg to anyone dashed through ──
  private castPhase(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, ep: boolean): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    const full = Phaser.Math.Distance.Between(caster.x, caster.y, tx, ty);
    let dist = Math.min(full * 0.7, 220);
    if (ep) dist *= 1.5; // F+ "Phase: 1.5× the dash distance"
    const startX = caster.x, startY = caster.y;
    let nx = caster.x + Math.cos(ang) * dist;
    let ny = caster.y + Math.sin(ang) * dist;
    nx = Phaser.Math.Clamp(nx, 24, scene.scale.width - 24);
    ny = Phaser.Math.Clamp(ny, 24, scene.scale.height - 24);

    for (const target of this.opponentsOf(owner)) {
      if (!target.active || target.hp <= 0) continue;
      if (this.pointToSegmentDist(target.x, target.y, startX, startY, nx, ny) <= 28) {
        target.takeDamage(dmg);
        this.creditCardDamage(this.activeLedgerId, dmg);
        this.arena.spawnHitFlash(target.x, target.y, 0x00c2c7);
        this.fx(owner).payout(target.x, target.y, 32, {
          cards: 3, chips: 1, litter: false, depth: 9, face: 0x00c2c7, tones: this.tones(owner),
        });
      }
    }

    (caster.body as Phaser.Physics.Arcade.Body).reset(nx, ny);
    caster.setPosition(nx, ny);
    // A comet of tumbling cards along the path plus a burst at each end, so the blink reads as
    // a body travelling rather than a body teleporting.
    const fx = this.fx(owner);
    const tones = this.tones(owner);
    const col = this.col(owner);
    fx.anim(4, 300, (g, t) => {
      const fade = 1 - t * t;
      const steps = 7;
      for (let k = 0; k <= steps; k++) {
        const f = k / steps;
        const gx = startX + (nx - startX) * f;
        const gy = startY + (ny - startY) * f;
        // The tail thins toward the start — a comet, not a row of stamps.
        const taper = 0.35 + f * 0.65;
        g.fillStyle(col(0x00c2c7), 0.22 * fade * taper);
        g.fillCircle(gx, gy, 17 * taper);
        fateCardLayered(g, col, tones, gx, gy, ang, 12 * taper, 16 * taper,
          Math.cos(t * 8 + k), 0.7 * fade * taper, { face: 0x00c2c7, suit: 'diamond', shadow: false });
      }
    });
    fx.ring(startX, startY, 30, 6, 0x00c2c7, 280, 3, 5);
    fx.ring(nx, ny, 6, 40, 0x00c2c7, 320, 3.5, 5);
    fx.sparkle(nx, ny, 6, 24, 9, 0x00c2c7);
    void scene;
  }

  // ── Striker: a very slow black projectile, 35 dmg on hit ──
  private castStriker(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, ep: boolean): void {
    const isPlayer = owner === 'player';
    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = 130;
    const proj = new Projectile(this.arena.scene, caster.x, caster.y, 'proj-fate-striker', dmg, isPlayer);
    (proj as any).fateLedgerId = this.activeLedgerId;
    this.arena.projectiles.add(proj);
    if (ep) proj.setScale(1.2); // F+ "Striker: 20% larger projectile"
    proj.launch(Math.cos(ang) * speed, Math.sin(ang) * speed);
    proj.setRotation(ang);
  }

  // ── Pulse: an AoE at the caster, 10 dmg + knockback ──
  private castPulse(owner: 'player' | 'npc', dmg: number, ep: boolean): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const radius = 130;
    const kbMult = ep ? 2 : 1; // F+ "Pulse: 2× knockback"
    for (const target of this.opponentsOf(owner)) {
      if (!target.active || target.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(caster.x, caster.y, target.x, target.y) > radius) continue;
      target.takeDamage(dmg);
      this.creditCardDamage(this.activeLedgerId, dmg);
      const ang = Math.atan2(target.y - caster.y, target.x - caster.x);
      const speed = 520 * kbMult;
      this.applyKnockback(target, Math.cos(ang) * speed, Math.sin(ang) * speed, 260);
      this.arena.spawnHitFlash(target.x, target.y, 0x00a3ff);
      // Cards blown off the target in the direction they were shoved.
      this.fx(owner).cards(target.x, target.y, 5, {
        speed: 220 * kbMult, angle: ang, spread: 0.7, size: 10, life: 460, depth: 9,
        face: 0x00a3ff, tones: this.tones(owner),
      });
    }
    // The shove: a hard front plus a second, wider one when the knockback is doubled.
    const fx = this.fx(owner);
    fx.ring(caster.x, caster.y, 10, radius, 0x00a3ff, 320, 5, 7);
    if (ep) scene.time.delayedCall(90, () => fx.ring(caster.x, caster.y, 20, radius * 1.4, 0x66ccff, 400, 3.5, 7));
    fx.flash(caster.x, caster.y, 24, 8, 0x66ccff);
  }

  // ── Chill: an explosive snowball, 5 dmg + a very large 50% slow AoE ──
  private castChill(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, ep: boolean): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const ang = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = 360;
    // F+ "Chill: +3 second slow duration" (5s → 8s).
    this.snowballs.push({
      x: caster.x, y: caster.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      owner, dmg, slowMs: ep ? 8000 : 5000, expiresAt: scene.time.now + 2000,
      ledgerId: this.activeLedgerId,
    });
  }

  private updateSnowballs(time: number, delta: number): void {
    const dt = delta / 1000;
    const W = this.arena.scene.scale.width, H = this.arena.scene.scale.height;
    for (let i = this.snowballs.length - 1; i >= 0; i--) {
      const s = this.snowballs[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      let primary: Fighter | null = null;
      for (const target of this.opponentsOf(s.owner)) {
        if (target.active && target.hp > 0 && Phaser.Math.Distance.Between(s.x, s.y, target.x, target.y) <= 24) { primary = target; break; }
      }
      const offscreen = s.x < 0 || s.x > W || s.y < 0 || s.y > H;
      if (primary || offscreen || time > s.expiresAt) {
        this.explodeSnowball(s, primary);
        this.snowballs.splice(i, 1);
      }
    }
  }

  private explodeSnowball(s: FateSnowball, primary: Fighter | null): void {
    const scene = this.arena.scene;
    const radius = 200;
    if (primary && primary.active && primary.hp > 0) {
      primary.takeDamage(s.dmg);
      this.creditCardDamage(s.ledgerId, s.dmg);
    }
    for (const target of this.opponentsOf(s.owner)) {
      if (!target.active || target.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(s.x, s.y, target.x, target.y) > radius) continue;
      target.takeDamage(s.dmg);
      this.creditCardDamage(s.ledgerId, s.dmg);
      this.applySlow(target, 0.5, s.slowMs);
      this.arena.showFloatingText(target.x, target.y - 40, '❄️ SLOW', '#aaddff');
      this.fx(s.owner).sparkle(target.x, target.y, 6, 22, 9, 0xd6f2ff);
    }
    // A very wide, very cold burst: two fronts, a shower of frozen cards, and frost on the floor.
    const fx = this.fx(s.owner);
    const tones = this.tones(s.owner);
    fx.flash(s.x, s.y, 30, 8, 0xd6f2ff);
    fx.ring(s.x, s.y, 12, radius, 0xbfeaff, 420, 5, 6);
    scene.time.delayedCall(110, () => fx.ring(s.x, s.y, 20, radius * 1.25, 0x88bbdd, 540, 3, 6));
    fx.cards(s.x, s.y, 12, {
      speed: radius * 1.6, size: 10, life: 620, fall: 40, depth: 8, face: 0xd6f2ff, tones,
    });
    fx.litter(s.x, s.y, radius * 0.5, 1, tones);
  }

  // ── Chain: an electric hitscan that arcs between nearby enemies, 10 dmg each ──
  private castChain(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, ep: boolean): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const chainRange = ep ? 340 : 210; // F+ "Chain: Increased range of chaining"
    const pool = this.opponentsOf(owner).filter((t) => t.active && t.hp > 0);
    const aimAng = Math.atan2(ty - caster.y, tx - caster.x);

    let fromX = caster.x, fromY = caster.y;
    // First hop: whichever live opponent is nearest the aim direction / caster.
    let cur: Fighter | null = null;
    let best = Infinity;
    for (const t of pool) {
      const d = Phaser.Math.Distance.Between(fromX, fromY, t.x, t.y);
      const aligned = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(t.y - fromY, t.x - fromX) - aimAng));
      const score = d + aligned * 60;
      if (score < best) { best = score; cur = t; }
    }
    const fx = this.fx(owner);
    const tones = this.tones(owner);
    let hop = 0;
    while (cur) {
      const x1 = fromX, y1 = fromY, tX = cur.x, tY = cur.y;
      // Each hop is dealt a beat after the last, so a long chain visibly walks the room instead
      // of all its links appearing at once.
      scene.time.delayedCall(hop * 70, () => fx.dealtBeam(x1, y1, tX, tY, 0x7b2ff7, 9, tones, 4));
      scene.time.delayedCall(hop * 70, () => fx.payout(tX, tY, 30, {
        cards: 3, chips: 1, litter: false, depth: 9, face: 0x7b2ff7, tones,
      }));
      hop++;
      cur.takeDamage(dmg);
      this.creditCardDamage(this.activeLedgerId, dmg);
      this.arena.spawnHitFlash(cur.x, cur.y, 0x9b5cff);
      pool.splice(pool.indexOf(cur), 1);
      fromX = cur.x; fromY = cur.y;
      let next: Fighter | null = null; best = chainRange;
      for (const t of pool) {
        const d = Phaser.Math.Distance.Between(fromX, fromY, t.x, t.y);
        if (d < best) { best = d; next = t; }
      }
      cur = next;
    }
  }

  // ── Emperor: 12 bullets fired in quick succession, 3 dmg each ──
  private castEmperor(tx: number, ty: number, owner: 'player' | 'npc', dmg: number, ep: boolean): void {
    const isPlayer = owner === 'player';
    const caster = isPlayer ? this.arena.player : this.arena.npc;
    const scene = this.arena.scene;
    const count = ep ? 17 : 12; // F+ "Emperor: +5 bullets launched"
    const speed = 540;
    const lid = this.activeLedgerId;
    for (let i = 0; i < count; i++) {
      scene.time.delayedCall(i * 55, () => {
        if (!caster.active) return;
        const ang = Math.atan2(ty - caster.y, tx - caster.x) + (Math.random() - 0.5) * 0.12;
        const proj = new Projectile(scene, caster.x, caster.y, 'proj-fate-burst', dmg, isPlayer);
        (proj as any).fateLedgerId = lid;
        proj.setTint(0xffe680);
        this.arena.projectiles.add(proj);
        proj.launch(Math.cos(ang) * speed, Math.sin(ang) * speed);
        proj.setRotation(ang);
        // Every shot in the volley recoils off the hand — a rare card should feel expensive.
        this.fx(owner).flick(caster.x, caster.y, ang, FATE.gold, 0.8, 9, this.tones(owner));
      });
    }
    // The crown announcing itself: a gilt ring and a shower of chips at the caster.
    this.fx(owner).ring(caster.x, caster.y, 12, 76, FATE.gold, 520, 5, 6);
    this.fx(owner).chips(caster.x, caster.y, ep ? 12 : 8, 56, 7, FATE.gold);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  E+ "Force the Hand of Fate" — pre-game card-choice overlay
  // ═══════════════════════════════════════════════════════════════════

  private buildForceOverlay(): void {
    const scene = this.arena.scene;
    const W = scene.scale.width, H = scene.scale.height;
    const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setScrollFactor(0).setDepth(500).setInteractive();
    const title = scene.add.text(W / 2, H / 2 - 150, 'Force the Hand of Fate', {
      fontSize: '28px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffcc66',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501);
    const sub = scene.add.text(W / 2, H / 2 - 118, 'Choose a card to limit which cards you can draw this match:', {
      fontSize: '13px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ddddee',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501);
    this.forceOverlay.push(dim, title, sub);

    const n = FATE_FACE_CARDS.length;
    const cw = 148, gap = 14;
    const total = n * cw + (n - 1) * gap;
    const startX = W / 2 - total / 2 + cw / 2;
    const y = H / 2 + 10;
    FATE_FACE_CARDS.forEach((f, i) => {
      const x = startX + i * (cw + gap);
      const hex = '#' + f.color.toString(16).padStart(6, '0');
      const box = scene.add.rectangle(x, y, cw, 190, 0x1a1030, 0.96).setStrokeStyle(3, f.color, 1)
        .setScrollFactor(0).setDepth(501).setInteractive({ useHandCursor: true });
      const emoji = scene.add.text(x, y - 58, f.emoji, { fontSize: '40px' }).setOrigin(0.5).setScrollFactor(0).setDepth(502);
      const name = scene.add.text(x, y - 14, f.name, { fontSize: '20px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: hex }).setOrigin(0.5).setScrollFactor(0).setDepth(502);
      const allowTxt = f.allow ? f.allow.map((t) => DEF_BY_TYPE.get(t)!.name).join(', ') : 'No limit — all cards can be drawn';
      const desc = scene.add.text(x, y + 44, allowTxt, {
        fontSize: '11px', fontFamily: '"Trebuchet MS", "Segoe UI", Tahoma, sans-serif', color: '#ccccdd', align: 'center', wordWrap: { width: cw - 18 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(502);
      box.on('pointerover', () => box.setFillStyle(0x2a1a44, 0.98));
      box.on('pointerout', () => box.setFillStyle(0x1a1030, 0.96));
      box.on('pointerdown', () => this.chooseForceHand(f.face));
      this.forceOverlay.push(box, emoji, name, desc);
    });
  }

  private chooseForceHand(face: FateFaceCard): void {
    this.forceHand = face;
    this.forceHandPending = false;
    this.playerHand = Array.from({ length: this.playerHandSize }, () => this.drawCardFor('player'));
    this.playerSelected = 0;
    this.playerDrawAccum = 0;
    this.teardownForceOverlay();
    this.refreshBar();
    const def = FACE_BY_ID.get(face);
    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, `${def?.emoji} ${def?.name}!`, '#ffcc66');
  }

  private teardownForceOverlay(): void {
    for (const o of this.forceOverlay) o.destroy();
    this.forceOverlay = [];
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Q+ "Roulette Expert" — draggable gamble marker on the health bar
  // ═══════════════════════════════════════════════════════════════════

  private overGambleBar(mx: number, my: number): boolean {
    const p = this.arena.player;
    const left = p.x - HB_W / 2;
    const top = p.y + HB_OFFSET_Y;
    return mx >= left - 6 && mx <= left + HB_W + 6 && my >= top - 8 && my <= top + HB_H + 8;
  }

  private drawGambleBar(): void {
    const g = this.gambleGraphics;
    if (!g) return;
    g.clear();
    const p = this.arena.player;
    if (!p.active || p.hp <= 0) { if (this.gambleLabel) this.gambleLabel.setVisible(false); return; }
    // Never gamble more HP than you currently have.
    this.gambleHp = Math.min(this.gambleHp, Math.ceil(p.hp));
    const left = p.x - HB_W / 2;
    const top = p.y + HB_OFFSET_Y;
    const ratio = Phaser.Math.Clamp(this.gambleHp / p.maxHp, 0, 1);
    // Tint the gambled slice of the bar yellow.
    g.fillStyle(0xffee00, 0.5);
    g.fillRect(left, top, HB_W * ratio, HB_H);
    // Draggable handle.
    const hx = left + HB_W * ratio;
    g.fillStyle(0xffffff, 1);
    g.fillRect(hx - 2, top - 4, 4, HB_H + 8);
    g.lineStyle(1, 0x000000, 1);
    g.strokeRect(hx - 2, top - 4, 4, HB_H + 8);
    if (!this.gambleLabel) {
      this.gambleLabel = this.arena.scene.add.text(0, 0, '', { fontSize: '10px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif', color: '#ffee66' }).setOrigin(0.5, 1).setDepth(12);
    }
    this.gambleLabel.setVisible(true).setText(`🎰 ${this.gambleHp}`).setPosition(p.x, top - 6);
  }

  // ── Paper perk (right-click poker hand throw) ─────────────────────

  private paperCooldownUntil = 0;

  private evaluatePokerHand(cards: { rank: number; suit: number }[]): { name: string; dmg: number } {
    const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
    const suits = cards.map((c) => c.suit);
    const rankCounts: Record<number, number> = {};
    for (const r of ranks) rankCounts[r] = (rankCounts[r] ?? 0) + 1;
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = suits.every((s) => s === suits[0]);
    const isStrRanks = ranks[4] - ranks[0] === 4 && counts[0] === 1;
    const isWheelStraight = JSON.stringify(ranks) === JSON.stringify([2, 3, 4, 5, 14]);
    const isStraight = isStrRanks || isWheelStraight;
    const isRoyal = isFlush && JSON.stringify(ranks) === JSON.stringify([10, 11, 12, 13, 14]);

    if (isRoyal) return { name: 'ROYAL FLUSH!', dmg: 40 };
    if (isFlush && isStraight) return { name: 'STRAIGHT FLUSH!', dmg: 30 };
    if (counts[0] === 4) return { name: 'FOUR OF A KIND!', dmg: 20 };
    if (counts[0] === 3 && counts[1] === 2) return { name: 'FULL HOUSE!', dmg: 14 };
    if (isFlush) return { name: 'FLUSH!', dmg: 10 };
    if (isStraight) return { name: 'STRAIGHT!', dmg: 8 };
    if (counts[0] === 3) return { name: 'THREE OF A KIND!', dmg: 6 };
    if (counts[0] === 2 && counts[1] === 2) return { name: 'TWO PAIR!', dmg: 4 };
    if (counts[0] === 2) return { name: 'PAIR!', dmg: 2 };
    return { name: 'HIGH CARD', dmg: 1 };
  }

  private doPaperCardThrow(tx: number, ty: number, time: number): void {
    const scene = this.arena.scene;
    const player = this.arena.player;
    const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const cards: { rank: number; suit: number }[] = [];
    for (let i = 0; i < 5; i++) {
      cards.push({ rank: RANKS[Math.floor(Math.random() * RANKS.length)], suit: Math.floor(Math.random() * 4) });
    }
    const { name, dmg } = this.evaluatePokerHand(cards);
    const baseAngle = Math.atan2(ty - player.y, tx - player.x);
    for (const deg of [-24, -12, 0, 12, 24]) {
      const angle = baseAngle + deg * (Math.PI / 180);
      const proj = new Projectile(scene, player.x, player.y, 'proj-fate-card', dmg, true);
      this.arena.projectiles.add(proj);
      proj.launch(Math.cos(angle) * 500, Math.sin(angle) * 500);
      proj.setRotation(angle);
    }
    this.arena.showFloatingText(player.x, player.y - 48, `🃏 ${name} ×${dmg}`, '#eeddbb');
    this.paperCooldownUntil = time + 2000;
  }
}
