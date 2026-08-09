import Phaser from 'phaser';
import { Element } from '../elements/Element';
import { CastContext } from '../elements/Ability';
import { HealthBar } from '../combat/HealthBar';
import { Sfx } from '../audio';

/**
 * Magic Mastery — Levitate: tracks the last known position of any damage-source object
 * (a puddle, cloud, trap, etc.) so `Fighter.takeDamage` can tell whether it has been sitting
 * in the same spot for at least `thresholdMs`. Keyed by object identity (WeakMap), so callers
 * must pass the same persistent object every tick — a fresh literal each call never "ages".
 */
const stationaryTrackers = new WeakMap<object, { x: number; y: number; lastMovedAt: number }>();

function isStationaryFor(source: object, x: number, y: number, thresholdMs: number): boolean {
  const now = Date.now();
  const rec = stationaryTrackers.get(source);
  if (!rec) {
    stationaryTrackers.set(source, { x, y, lastMovedAt: now });
    return false;
  }
  if (Math.abs(rec.x - x) > 1 || Math.abs(rec.y - y) > 1) {
    rec.x = x; rec.y = y; rec.lastMovedAt = now;
    return false;
  }
  return now - rec.lastMovedAt >= thresholdMs;
}

export interface DamageOpts {
  pierce?: boolean;
  fireDot?: boolean;
  source?: object;
  sourceX?: number;
  sourceY?: number;
  /**
   * Online PvP: this hit was computed on the attacker's machine and relayed. Every
   * multiplier stage (crit, vulnerability, armour, caps) already ran there against a
   * replica carrying the same passives, so only the local absorb layers — invincibility,
   * absorber, shields, clotted/weak HP — are applied again here.
   */
  netApplied?: boolean;
  /**
   * Damage a fighter inflicts on itself through the normal (shielded) pipeline. Exempt
   * from the online damage gate: the opponent's sim has no copy of it to relay, so
   * blocking it would simply delete the ability's cost.
   */
  selfInflicted?: boolean;
}

export class Fighter extends Phaser.Physics.Arcade.Sprite {
  public hp: number;
  public maxHp: number;
  public speed: number;
  public element: Element;
  public isInvincible = false;
  /**
   * Dummy mode: this body cannot run out of health.
   *
   * Deliberately *not* `isInvincible` — the whole point of a practice target is
   * that hits land, resolve and get counted. Damage is computed normally, every
   * `damaged` listener still fires (which is what feeds the combo tally), the
   * flash and the numbers still happen; the health simply refuses to move and
   * `defeated` is never reached. Real infinity, not a very large number.
   */
  public immortal = false;
  /**
   * Which side landed the most recent hit on this body — stamped at ArenaScene's
   * two damage chokepoints (projectile contact and owner-tagged AoE), which
   * between them carry effectively everything that hurts anyone.
   *
   * Exists so a third party can be *credited* to a fighter: the Graveyard hands
   * its runic charge to whoever actually put a husk down. Deliberately a side
   * rather than a Fighter reference, so nothing holds a body past its death.
   */
  public lastDamageOwner: 'player' | 'npc' | null = null;
  public shieldCharges = 0;
  public shieldHp = 0;
  /** Metal R+ (Blood Clottage): dark-red HP layer. Absorbs damage at half rate and is spent before normal HP. */
  public clottedHp = 0;
  /** Gray "weak HP" layer. Absorbs damage like shield HP (bonus), but decays 3/s. */
  public weakHp = 0;
  /**
   * Audio: true only for the fighter the local player is driving. Set by `Player`
   * rather than tested with `instanceof`, which would make Fighter import its own
   * subclass. Everything else (the NPC, an online replica, a co-op ally) mixes
   * quieter so the player's own actions stay legible in a busy fight.
   */
  public isPlayerFighter = false;
  public incomingDamageMultiplier = 1;
  /** Subterfuge Bribe: 0.75 while this fighter's attacker is bribed (victim-side stand-in for "deals 25% less"). */
  public bribeIncomingMult = 1;
  /**
   * Subterfuge Mastery — Smoke Break: 0.75 while this fighter has a cigarette lit. Kept out of
   * the `armored` status aggregate on purpose — SubterfugeKit shows its own 🚬 timer box, and
   * the cigarette's shrinking duration is the part worth watching.
   */
  public smokeIncomingMult = 1;
  /**
   * Justice: every incoming-damage multiplier that element owns, folded into one field and
   * rewritten from scratch by JusticeKit each frame. Flight's 20% vulnerability, Sheer Will's
   * cowed attacker and a DAMNED verdict all land here, so none of them stomps another
   * system's armour — and a match with no Justice in it never touches this at all.
   */
  public justiceIncomingMult = 1;
  /**
   * Magma Dragon Kin: 0.8 for the twenty seconds after a dragon egg hatches. Its own field
   * rather than a share of `incomingDamageMultiplier` for the same reason Justice has one —
   * MagmaKit rewrites it from scratch every frame, and a shared field would stomp whatever
   * else had written armour that tick.
   */
  public magmaIncomingMult = 1;
  /**
   * Conquest: 0.5 while this fighter is standing on a square it owns. Rewritten from scratch
   * by ConquestKit every frame for the same reason Justice and Magma have their own fields —
   * sharing `incomingDamageMultiplier` would stomp whatever else wrote armour that tick.
   */
  public conquestIncomingMult = 1;
  /**
   * Passion's rose: 0.95^stacks while this fighter is holding one, one stack per hit taken.
   * Its own field for the same reason Justice, Magma and Conquest have theirs — PassionKit
   * rewrites it from scratch every frame, and sharing `incomingDamageMultiplier` would stomp
   * whatever else had written armour that tick.
   */
  public passionIncomingMult = 1;
  /**
   * Fortune (Tax Evasion, F+): 1.2 for the 8 seconds after the auditor's rifle lands, and 1
   * every other frame of the game. Its own field for the same reason Justice, Magma, Conquest
   * and Passion have theirs — FortuneKit rewrites it from scratch every frame, and sharing
   * `incomingDamageMultiplier` would stomp whatever else had written armour that tick.
   */
  public fortuneIncomingMult = 1;
  /**
   * Ruin (Unstoppable Decay): 1.1^stacks of rot on this fighter, times 0.9^stacks carried by
   * whoever is hitting it — the victim-side stand-in for "the decayed deal less", since
   * `takeDamage` has no attacker reference. Rewritten from scratch by RuinKit every frame,
   * and deliberately outside the invertible mitigation block below: decay is a debuff, and
   * Spikes of Ruin turns *buffs* inside out.
   */
  public ruinIncomingMult = 1;
  /**
   * Quantum (Instability): 1 + one point per percent of instability, so a fighter sitting at the
   * 50% cap takes half again as much of everything. Its own field for the same reason Justice,
   * Magma, Conquest and Passion have theirs — and inside the mitigation product on purpose,
   * because carrying two kits is meant to be paid for against every source at once.
   */
  public quantumIncomingMult = 1;
  /**
   * Death (Styx Shot): 1 − 15% per brand this fighter's *attacker* is carrying, doubled under a
   * Hospice noose — the victim-side stand-in for "the branded deal less", since `takeDamage` has
   * no attacker reference. Same shape as `bribeIncomingMult` and `hopelessIncomingMult`, and its
   * own field for the same reason Justice, Magma and Conquest have theirs: DeathKit rewrites it
   * from scratch every frame and must not stomp whatever else wrote armour that tick.
   */
  public deathIncomingMult = 1;
  /**
   * Paper's Journal. Rewritten from scratch by PaperKit every frame onto *both* sides of the
   * fight, meaning two different things depending on who is wearing it: on the Paper player it
   * is the resist entries (below 1), and on everyone Paper is fighting it is the pressure
   * entries (above 1). There is no collision between those two readings because the journal is
   * a save-backed player passive — an npc Paper has no save, so it never writes this at all.
   */
  public journalIncomingMult = 1;
  /**
   * Psychic (Coma): 0.5 while this fighter is under. Its own field for the same reason Justice,
   * Magma and Death have theirs — PsychicKit rewrites it from scratch every frame, and
   * sharing `incomingDamageMultiplier` would stomp whatever else wrote armour that tick. The
   * half of every hit this field eats is not lost: PsychicKit banks it straight back as stress.
   */
  public psychicIncomingMult = 1;
  /**
   * Bind (Shards of Oblivion): 1.1^tithes of vulnerability the patron has charged this fighter
   * for its favours. Its own field for the same reason Justice, Magma and Psychic have
   * theirs — BindKit rewrites it from scratch every frame, and sharing
   * `incomingDamageMultiplier` would stomp whatever else wrote armour that tick. Permanent for
   * the match on purpose: a tithe is not a debuff, it is a price.
   */
  public bindIncomingMult = 1;
  /**
   * Illusion's two upgrade vulnerabilities, folded into one field and rewritten from scratch
   * by IllusionKit every frame — Justice's arrangement, and for Justice's reason. A Phantom's
   * blast marks a body for 1.2 and Mind-Boggle's turning weak point is worth 1.5 while the
   * illusionist is standing on that side of it, and the two are allowed to multiply.
   */
  public illusionIncomingMult = 1;
  /**
   * Marrow (Cytokine Storm, R+): the vulnerability a neutrophil's cytokine pellets stack onto
   * whatever they hit. Its own field for the reason Justice, Illusion and Sound have theirs —
   * MarrowKit rewrites it from scratch every frame off its own stack table, and sharing
   * `incomingDamageMultiplier` would stomp whatever else wrote armour that tick.
   */
  public marrowIncomingMult = 1;
  /**
   * Gluttony (Head Chef, E+ and Murderous Intent, F+): the kitchen's two food-and-teeth
   * multipliers folded into one field — a winter mint's 20% resistance on the cook, and the
   * 15% vulnerability the maw's cone of bullets stacks onto whatever it hits. Its own field
   * for the reason Justice, Illusion and Marrow have theirs: GluttonyKit rewrites it from
   * scratch every frame off its own timers, and sharing `incomingDamageMultiplier` would
   * stomp whatever else wrote armour that tick.
   */
  public gluttonyIncomingMult = 1;
  /**
   * Sound (Sound System, E+): the armour banked by cutting people with the blue record. Its own
   * field for the reason Justice, Magma and Illusion have theirs — SoundKit rewrites it from
   * scratch every frame, and sharing `incomingDamageMultiplier` would stomp whatever else wrote
   * armour that tick. Floored well above zero so a long match cannot make anyone untouchable.
   */
  public soundIncomingMult = 1;
  /**
   * Vault artifacts (Rime Brand): vulnerability written by `ArtifactsKit`. Its own field for
   * the same reason as every neighbour above — the kit rewrites it outright when a freeze
   * lands and again when it lifts, and sharing anyone else's would stomp their value.
   */
  public artifactIncomingMult = 1;
  /**
   * Radiation (Irradiated): `Date.now()` epoch until which every point of healing aimed at this
   * fighter lands as damage instead — see `heal`. One field rather than a hook per healing
   * source, because `heal()` is the single place every heal in the game passes through.
   */
  public healInvertedUntil = 0;
  /** Invoked with the amount whenever an irradiated heal turns into a hit, so a kit can draw it. */
  public onHealInverted: ((amount: number) => void) | null = null;
  /**
   * Radiation (X-Ray Vision): a multiplier on the *physics body only*, leaving the sprite the
   * size it looks. Its own field rather than a share of `sizeMult` because the two mean
   * different things — a target lit up by an X-ray is easier to hit without becoming bigger —
   * and because Fate's slots and Illusion's folds must still own `sizeMult`/`shapeSizeMult`
   * without either of them silently handing a swollen hitbox back.
   */
  public hitboxMult = 1;
  /**
   * Psychic (Migraine): `Date.now()` epoch until which everything this fighter aims goes wide.
   * Applied where `CastContext.targetX/targetY` is built, which is the one place in the game
   * every ability of every element takes its aim from — so one field makes all ~240 of them
   * capable of missing without any of them knowing about it.
   */
  public aimScatterUntil = 0;
  /**
   * Psychic (Opened Eyes): while > 0, this fighter's casts are queued rather than resolved.
   * The cooldown is stamped at the press and the effect lands this many milliseconds later,
   * which is what makes the psychic's foreknowledge honest rather than a guess.
   */
  public castDelayMs = 0;
  /**
   * Installed by PsychicKit alongside `castDelayMs`. Returning true means the kit has taken
   * ownership of the cast and will call `fire` itself; returning false resolves it normally,
   * so a queue that refuses (a dead caster, a full board) can never swallow an ability.
   */
  public queueDelayedCast: ((abilityId: string, delayMs: number, fire: () => void) => boolean) | null = null;
  /** Set for exactly one `announceCast` when a delayed cast resolves — see `onCastStamp`. */
  private pendingCastAim: { x: number; y: number } | null = null;
  /**
   * Ruin (Spikes of Ruin): `scene.time.now` timestamp until which every buff this fighter is
   * wearing comes back as its own opposite. Read at the two places a buff can actually be
   * felt — the speed aggregate in ArenaScene and the mitigation product in `takeDamage` — so
   * a boost owned by any kit is caught without that kit knowing anything about Ruin.
   */
  public buffsInvertedUntil = 0;
  /**
   * Divine perk Order (plasma): nothing this fighter does can hurt it. Both self-harm
   * routes — `applySelfDamage` and a `selfInflicted` `takeDamage` — bail out entirely,
   * which is every way an element can charge itself for its own abilities.
   */
  public selfDamageImmune = false;
  /** Divine perk Order: 1.25 — the price of that immunity is that everyone *else* hits harder. */
  public orderIncomingMult = 1;
  /** Invoked with the amount whenever `selfDamageImmune` swallows a hit, so the kit can draw the tell. */
  public onSelfDamageBlocked: ((amount: number) => void) | null = null;
  /** Creation Buff Potion: 1.25 while whoever is damaging this fighter is potion-empowered (victim-side stand-in for "deals 25% more"). */
  public empoweredIncomingMult = 1;
  /** Creation Protection Potion: 0.75 while this fighter is potion-protected. */
  public potionArmorMult = 1;
  /**
   * World Shift: armour the *arena* is granting, not an element.
   *
   * Its own field rather than a share of `potionArmorMult` because that one is
   * assigned outright by CreationKit every frame while Creation is on the
   * field, which would quietly eat a map's buff in exactly one matchup.
   */
  public mapArmorMult = 1;
  /**
   * Shadow Hopelessness: 0–100. Applied by Shadow's pools, traps and tentacles. Every 2%
   * cuts the afflicted fighter's outgoing damage by 1% (capped at 50% at 100%). Held here
   * rather than in ShadowKit so the status tray and any sim can read it.
   */
  public hopelessness = 0;
  /**
   * Victim-side stand-in for "my attacker is hopeless, so they deal less". ShadowKit keeps
   * this in sync with the opposing fighter's `hopelessness` each frame — same pattern as
   * `bribeIncomingMult`, since `takeDamage` has no attacker reference.
   */
  public hopelessIncomingMult = 1;
  /**
   * Running total of damage aimed at this fighter this match, tallied *before* any of the
   * incoming-damage multipliers below are applied — so a mitigation that saves your life
   * (Shadow's Hopelessness above all) doesn't also erase the fact that you were hit that hard.
   * Achievements read this; nothing in combat does.
   */
  public rawDamageTaken = 0;
  public chargeRatio = 0;   // 0–1, drives the yellow charge bar in HealthBar
  public chargeColor = 0xffdd00; // charge-bar fill color (Rubber Bazooka reddens it while overcharging)
  public lastIncomingDamage = 0; // set in takeDamage() before shield check — used by reflect upgrades
  /**
   * True while a `damaged` event is being emitted from applySelfDamage. Listeners that
   * treat "victim took damage" as "the other side dealt damage" must check this first.
   */
  public damageWasSelfInflicted = false;
  /** Multiply all ability cooldowns by this factor (< 1 = faster, e.g. Reborn post-revival). */
  public cooldownMult = 1;
  /**
   * Death (Amputate): 1.25 with one arm gone, 1.33 with both. Its own field rather than a share
   * of `cooldownMult` because an amputation is permanent for the match while `cooldownMult` is
   * written *wholesale* by Timeless, Rebirth and Slime's Melt table — a kit that folded its own
   * factor in there would be erased the first time any of them set it.
   */
  public amputationCooldownMult = 1;
  /**
   * Quantum (Ability Split): the factor the *next* ability stamped on this fighter carries into
   * its own cooldown, then reset to 1. Kept here rather than in QuantumCoreKit because the
   * charge is explicitly meant to survive a bond collapse — by the time it is spent the caster
   * is usually a different element with a different kit, and only the body is common to both.
   */
  public nextCastCooldownMult = 1;
  /**
   * Per-ability cooldown factors banked by {@link nextCastCooldownMult} at the moment the
   * ability was stamped. An entry lives exactly one cooldown: the next stamp of the same id
   * overwrites it, so a halved cooldown can never be inherited by a later press.
   */
  private cooldownScales = new Map<string, number>();
  /**
   * Abilities a banked {@link nextCastCooldownMult} refuses to be spent on. Exists for exactly
   * one case and is documented rather than hidden: Quantum's Atom Splicers re-cast on a held
   * mouse button, so without this an Ability Split armed on E would be eaten by the Click on
   * the very next frame — and halving a 900ms hold-modifier is worth nothing to anybody.
   */
  public splitExemptAbilities = new Set<string>();
  /**
   * Quantum (Effect Split): `scene.time.now` timestamp until which every generic multiplier on
   * this fighter is pulled halfway back toward 1. Read at the same two places Ruin's
   * `buffsInvertedUntil` is — the mitigation product below and the speed aggregate in
   * ArenaScene — so an effect owned by any kit is halved without that kit knowing about it.
   */
  public effectSplitUntil = 0;
  /** If set, called with the damage amount before shields; return true to absorb the hit entirely. */
  public damageAbsorber: ((amount: number) => boolean) | null = null;
  /** Gauntlet boost: multiplies all incoming damage (stacks with incomingDamageMultiplier). Default 1. */
  public gauntletDamageTakenMult = 1;
  /** When true, skip alpha flash in takeDamage/applySelfDamage and keep alpha at 0 (Stealthy mutation). */
  public forceInvisible = false;
  /** 0–1+ probability that an incoming hit is dodged (can exceed 1.0, stacks). Each dodge subtracts 0.2. */
  public dodgeChance = 0;
  /**
   * Air's wind dodge: a second, independent evasion pool the dancer builds up over a match.
   * Deliberately separate from `dodgeChance` because it obeys different rules — it never decays
   * with time, only ever spends 0.1 on a dodge that actually saved you, and is allowed past
   * 1.0 (where it simply cannot fail until it has been spent back down). Written only by
   * AirKit; kept here so the status tray and any future reader can see it.
   */
  public windDodge = 0;
  /** Timestamp after which the fighter can cast abilities again (Disarm effect). */
  public disarmedUntil = 0;
  /**
   * Creation R (Wrench in your Plans): a wrench is jammed in this fighter's gear. Every
   * ability it uses costs `castPunishDamage` HP until this `Date.now()` timestamp. Held here
   * rather than in CreationKit because the only honest chokepoint for "an ability was used"
   * is the cast stamp itself.
   */
  public castPunishUntil = 0;
  public castPunishDamage = 0;
  /** Invoked with the HP lost whenever a cast backfires, so the kit that applied it can draw the grind. */
  public onCastPunish: ((amount: number) => void) | null = null;
  /**
   * Online play: when true this fighter is a remote-player replica whose HP is
   * network-authoritative. Local damage/heals only play hit feedback and never
   * change vitals — the real numbers arrive via netSyncVitals().
   */
  public netGhost = false;
  /** Invoked with the final computed damage when a netGhost fighter is hit — used to report damage to the authoritative peer (invasion co-op husk replicas, online PvP opponents). */
  public onGhostDamage: ((amount: number, opts?: DamageOpts) => void) | null = null;
  /**
   * Online PvP: this fighter's health is driven by the network. Every hit on it is
   * computed on the *attacker's* machine (where the attacking element's own sim runs at
   * full fidelity) and relayed as a `dmg` message; the local replay of the opponent's
   * casts is for visuals and status effects only. Local damage is therefore dropped
   * unless it arrives with `netApplied`, so a hit can never be counted twice — and,
   * more importantly, an ability whose npc-side replay is incomplete still lands.
   */
  public netAuthoritativeDamage = false;
  /**
   * Online PvP: aggregate slow the opponent's sim is applying to us (≤ 1), mirrored from
   * their replica's speed multiplier. Folded into the local player's movement so slows
   * land regardless of whether the ability that applied them replays locally.
   */
  public netSpeedMult = 1;
  /** Online PvP: cooldown multiplier the opponent's sim is applying to us (≥ 1). */
  public netCooldownMult = 1;
  /**
   * Online PvP, replica side: the owner's own damage reduction, relayed from the machine
   * that owns this fighter. Their armour buffs and mastery passives live only on their
   * sim, but hits are now resolved on ours — without this, defensive abilities would stop
   * working the moment a match went online. Inert (1 / 0 / 0) for a locally-owned fighter.
   */
  public netDefenseMult = 1;
  public netFlatReduction = 0;
  public netDamageCap = 0;
  /** Online PvP: `scene.time.now` timestamp until which a relayed knockback/pull owns our velocity. */
  public netShoveUntil = 0;
  public netShoveVx = 0;
  public netShoveVy = 0;
  /** Invasion co-op: true while this fighter is downed and awaiting revive. Enemies should ignore downed targets. */
  public downed = false;
  /**
   * Invasion co-op: the ally lives in the `npc` slot, so every npc-owned damage
   * path in the game — replayed ally casts, their projectiles, puddles and auras —
   * points straight at the local player. Set on the local player for the whole
   * co-op run so those hits become no-ops. Damage that is legitimately hostile
   * (husks) or self-inflicted is applied inside `Fighter.asNonAllyDamage()`,
   * which lifts the block for the duration of the call.
   */
  public allyDamageBlocked = false;
  /** Depth counter for `asNonAllyDamage` — nested calls must not clear the bypass early. */
  private static nonAllyDepth = 0;

  /**
   * Run `fn` with the co-op friendly-fire block lifted. Wrap any damage that is
   * known not to originate from an ally (husk attacks, a fighter's own hazards)
   * so it still lands on a player carrying `allyDamageBlocked`.
   */
  static asNonAllyDamage<T>(fn: () => T): T {
    Fighter.nonAllyDepth++;
    try {
      return fn();
    } finally {
      Fighter.nonAllyDepth--;
    }
  }
  /** Online play: invoked whenever a cast is stamped (castAbility success, triggerCooldown, startCooldown). */
  /**
   * `aim` is only passed for a cast that was resolved late (Psychic's delayed queue), where
   * the point it was actually aimed at is two seconds older than wherever the mouse is now.
   */
  public onCastStamp: ((abilityId: string, aim?: { x: number; y: number }) => void) | null = null;
  /** 0–1 probability that outgoing attacks deal a critical hit (2× damage). */
  public critChance = 0;
  /** Damage multiplier applied on a critical hit. Default 2. */
  public critMult = 2;
  /** Additive bonus added to an attacker's critChance when this fighter is the target. */
  public incomingCritBonus = 0;
  /** Visual/physics size multiplier applied by Fate Slots. Default 1. */
  public sizeMult = 1;
  /**
   * Illusion Tesseract: a second, independent size multiplier for a fighter that has been
   * folded into a square, star or rhombus. Its own field rather than a share of `sizeMult`
   * because the two have different owners — Fate rewrites `sizeMult` from its own state, and
   * a slots roll landing mid-fold would otherwise silently hand the shape back.
   */
  public shapeSizeMult = 1;
  /**
   * Slime (Oozorbtion): 1.2 while this fighter has opened up to swallow the next attack. A third
   * independent size multiplier for the same reason `shapeSizeMult` is a second one — Fate's slots
   * own `sizeMult` and Illusion's folds own `shapeSizeMult`, and a roll landing mid-swell would
   * otherwise silently hand the swelling back. Folded into `applySizeMult` so the hitbox grows
   * with the body: being a bigger target is the price of the ability.
   */
  public oozeSizeMult = 1;
  /**
   * Illusion Dance: projectiles pass straight through this fighter. Checked by ArenaScene's
   * two projectile-overlap handlers — the only place in the game where a shot decides whether
   * it has hit somebody. Everything that isn't a projectile (AoE, hitscan, contact, DOTs) is
   * deliberately unaffected.
   */
  public projectilePhase = false;
  /** Walk speed multiplier applied by Fate Slots. Default 1. */
  public walkSpeedMult = 1;

  // ── Per-fighter status effects (set by ArenaScene when hit) ─────
  public burningUntil = 0;
  public burnTickAccum = 0;
  public burnAura: Phaser.GameObjects.Arc | null = null;
  /** Fire Mastery — Cremation stoke bonus: added to burn tick damage; persists through re-ignition, cleared only when burningUntil expires. */
  public fireStokeBonus = 0;

  /** Fire Mastery — Heatwave: while exposed, the next damage taken is amplified 1.5x. */
  public exposedUntil = 0;
  public exposedIcon: Phaser.GameObjects.Text | null = null;
  /** Timestamp exposed was consumed by a hit — short grace window so an ignition from that same hit upgrades to molten fire. */
  public exposedConsumedAt = 0;
  /** Fire Mastery — molten fire: replaces normal burn when an exposed target is ignited. */
  public moltenUntil = 0;
  public moltenTickAccum = 0;
  public moltenAura: Phaser.GameObjects.Arc | null = null;

  public frostStacks = 0;
  /** Expiry timestamps (Date.now()-based) for each individual frost stack — oldest first. */
  public frostStackTimers: number[] = [];
  public frostVisual: Phaser.GameObjects.Text | null = null;
  public frozenUntil = 0;
  public frozenSolidAmpReady = false;

  public voidFrostStacks = 0;
  /** Expiry timestamps (Date.now()-based) for each individual void frost stack — oldest first. */
  public voidFrostStackTimers: number[] = [];
  public voidFrostVisual: Phaser.GameObjects.Text | null = null;
  public voidFrostTickAccum = 0;

  public permafrostStacks = 0;
  public permafrostVisual: Phaser.GameObjects.Text | null = null;
  public permavoidStacks = 0;
  public permavoidVisual: Phaser.GameObjects.Text | null = null;
  public frostImmuneUntil = 0;
  public voidImmuneUntil = 0;

  public toxicUntil = 0;
  public toxicDps = 0;
  public toxicTickAccum = 0;
  public toxicAura: Phaser.GameObjects.Arc | null = null;

  public bleeding = false;
  public bleedingUntil = 0;
  public bleedVisual: Phaser.GameObjects.Arc | null = null;

  public magicChainBound = false;
  public magicChainBoundEnd = 0;

  public slimeConfusedUntil = 0;
  public slimeConfuseVx = 0;
  public slimeConfuseVy = 0;
  public slimeConfuseDirUntil = 0;

  /** Acid Purge (Slime F): timestamp until which positive stat boosts (speed) are suppressed. */
  public purgedUntil = 0;
  /** Acid Purge: multiplier applied on top of a fighter's own speed calc — used to cancel a baked-in variant speed bonus (invasion husks). Default 1. */
  public purgeSpeedMult = 1;

  public earthStunnedUntil = 0;
  /** Earth Mastery — Dust Screen: while active, Husk AI wanders/misfires instead of pathfinding normally. */
  public confusedWanderUntil = 0;

  /** Technology Mastery — Byte-Bomb: laggy connection (rubber-banding, freezes, stalled cooldowns) until this `scene.time.now` timestamp. */
  public laggedUntil = 0;

  /** Fate Mastery — Confusing curse: WASD input is mirrored until this `scene.time.now` timestamp. */
  public invertedControlsUntil = 0;
  /** Fate Mastery — Vulnerable curse: the next hit taken is doubled, then this clears. */
  public vulnerableNextHit = false;

  /** Timestamp until which healing is suppressed (mutations). Date.now() based. */
  public healStopUntil = 0;

  // ── Silence element statuses ─────────────────────────────────────
  /** Silenced: only the click ability can be cast until this Date.now() timestamp. */
  public silencedUntil = 0;
  /** Hallucinating: players get visual horrors (kit-driven); bots/husks miss ~20% of attacks. Date.now() based. */
  public hallucinatingUntil = 0;
  /** Panicked (Silence E+ seeker cone): stabs on this fighter drain only 50 stealth. Date.now() based. */
  public panickedUntil = 0;
  /** Grabber perma-debuff: scales husk bite/attack cadence (>1 = slower). Fighters also get cooldownMult scaled. */
  public attackIntervalMult = 1;
  /** Radians. Players: aim direction; bots/husks: movement direction. Drives backstab checks + facing-eye HUD. */
  public facingAngle = 0;
  /**
   * Silence Mastery — Puppetmaster: someone else is steering this body until this
   * `scene.time.now` timestamp. Its own AI must yield entirely — no movement, no
   * attacks — and leave the velocity to whoever is driving.
   */
  public puppetControlledUntil = 0;

  // Dark magic status effects (Magic element upgrades)
  public darkVulnStacks = 0;         // +25% incoming dmg per stack (acid cloud)
  public darkLinkedUntil = 0;        // Torture Trap link expiry (Date.now() based)
  public darkLinkSource: Fighter | null = null; // healed when this fighter takes damage

  // Magic Mastery — Transmogrify: turned into a chicken, can't cast (Date.now() based)
  public chickenUntil = 0;
  // Magic Mastery — Levitate passive: immune to static ground hazards (puddles, etc.)
  public levitating = false;

  // Oil E+ Oily status
  public oilyUntil = 0;
  public oilyBurnUntil = 0;
  public oilyBurnAccum = 0;

  public lavaRockBurnUntil = 0;
  public lavaRockBurnAccum = 0;

  // Alcohol perk intoxication
  public intoxicatedUntil = 0;
  public intoxicationSlowUntil = 0;
  public intoxicationPendingSlowExtra = 0;

  /** Multiplier applied to all outgoing damage this fighter deals. Default 1 (Lust payload). */
  public outgoingDamageMult = 1;
  /** Additional aim inaccuracy in degrees (added on top of difficulty preset). Default 0 (Anger payload). */
  public aimOffsetBonusDeg = 0;
  /** Timestamp until which aimOffsetBonusDeg is active. */
  public aimOffsetBonusUntil = 0;

  /** Oil Mastery — Drone Array: 0.9^drones incoming damage while drones orbit. Default 1. */
  public droneArmorMult = 1;

  /** Electricity Mastery — Kinetic Shield: incoming damage resistance scaling with kinetic power. Default 1. */
  public kineticShieldMult = 1;

  /** Earth Mastery — Unbreakable: forced-velocity effects from other abilities skip this fighter. Default false. */
  public knockbackImmune = false;
  /** Earth Mastery — Unbreakable: caps any single hit's damage to this value. 0 = no cap. */
  public hardDamageCap = 0;

  /**
   * Light Mastery — Unstoppable: this fighter ignores every stun, root and slow. Checked by
   * ArenaScene's speed/stun chokepoint (which clears the generic control fields each frame)
   * and by kits that hold their own stun timers.
   */
  public unstoppable = false;
  /**
   * Light Mastery — Killer Kebab: `scene.time.now` timestamp until which this fighter is
   * skewered on a light lance — dragged along with it and unable to act.
   */
  public skeweredUntil = 0;

  /**
   * Gravity F+ (Anti-Grav) and Q+ (Crushing Field): pinned under enormous gravity until this
   * `scene.time.now` timestamp. Not a slow — it kills *movement effects*: speed multipliers are
   * clamped back to 1, the Space dodge is refused, and `dashCaster` (the chokepoint every
   * dash-style ability goes through) becomes a no-op. Cleared by Unstoppable like any other
   * control effect.
   */
  public highGravityUntil = 0;

  /**
   * Growth Mastery — Syringe Shot: sick until this `scene.time.now` timestamp. Deliberately a
   * single field: every sickness upgrade (extra ticks, vulnerability, slows, weakening, spread)
   * rides on this one effect rather than adding its own status box.
   */
  public sicknessUntil = 0;
  /** Growth Mastery — Carrier: permanent leftovers of a survived sickness. Never clears. */
  public sicknessCarrier = false;

  /** Metal Mastery — Natural Clot: flat amount subtracted from every incoming hit. Default 0. */
  public flatDamageReduction = 0;
  /** Metal Mastery — Steel Shield: incoming damage multiplier while the shield is up. Default 1. */
  public steelShieldMult = 1;

  // ── Gauntlet card stat fields ────────────────────────────────────────
  /** Card: reduces all incoming damage. Default 1 (Protected card). */
  public cardDamageTakenMult = 1;
  /** Card: multiplies all outgoing damage from this fighter. Default 1 (Deadly card on player). */
  public cardOutgoingDamageMult = 1;
  /** Card: HP regeneration per second (Regenerative card). Processed by ArenaScene update. */
  public regenPerSecond = 0;
  /** Accumulator (ms) for regen ticks. Managed by ArenaScene. */
  public regenAccumMs = 0;
  /** Card: multiplies duration of status effects applied TO this fighter by the player (Painful card, set on NPC). */
  public statusDurMult = 1;
  /** Card: multiplies damage of status effects applied TO this fighter by the player (Painful card, set on NPC). */
  public statusDmgMult = 1;
  /** Card: reduces Q-ability cooldowns. Default 1 (Finality card on player). */
  public ultimateCooldownMult = 1;
  /** Card: fraction of incoming damage reflected back to the attacker (Thorns card). */
  public reflectFraction = 0;
  /** Card: burn damage multiplier for DOT ticks applied to this fighter (Painful card, set on NPC). */
  public burnDpsMult = 1;

  /**
   * Ruin (Lockdown): the last ability this fighter actually got off, which is the only thing
   * a lock can be aimed at. Written by `stampCast`, so charge-and-release abilities that
   * never touch `castAbility` still count.
   */
  public lastCastAbilityId: string | null = null;

  private incomingCritCtx: { chance: number; mult: number } | null = null;
  private cooldowns: Map<string, number> = new Map();
  /**
   * Ruin (Lockdown): a hard "not before" per ability, kept apart from `cooldowns` because the
   * two count different things. A lock is a fixed wall-clock wait that no cooldown reduction
   * may shorten, and lifting it must not hand back a cooldown that was already running.
   * `ms` is stored alongside so the ability bar can drain the lock rather than the cooldown.
   */
  private lockouts: Map<string, { until: number; ms: number }> = new Map();
  private healthBar: HealthBar;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    element: Element,
    maxHp = 100,
    speed = 200,
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.maxHp = maxHp;
    this.hp = maxHp;
    this.speed = speed;
    this.element = element;

    // Circular physics body matching the drawn circle (radius 22 inside 48x48 texture)
    const radius = 22;
    const offset = (48 - radius * 2) / 2;
    (this.body as Phaser.Physics.Arcade.Body).setCircle(radius, offset, offset);
    (this.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

    this.healthBar = new HealthBar(scene, maxHp);
    this.setDepth(5);
  }

  /** Called by the attacker (or damage source) just before takeDamage to supply crit context for this hit. */
  setIncomingCritContext(chance: number, mult: number): void {
    this.incomingCritCtx = { chance, mult };
  }

  /** Update visual scale and physics body to match sizeMult. Call after changing sizeMult. */
  applySizeMult(): void {
    // Folded shapes ride on top of whatever else is scaling this fighter, so any other
    // system calling this keeps the fold rather than quietly cancelling it.
    const scale = this.sizeMult * this.shapeSizeMult * this.oozeSizeMult;
    this.setScale(scale);
    const baseRadius = 22;
    // `hitboxMult` deliberately misses `setScale` above: an X-rayed target is easier to hit
    // without looking any different, which is the whole trade the ability makes.
    const radius = Math.round(baseRadius * scale * this.hitboxMult);
    const offset = (48 - radius * 2) / 2;
    (this.body as Phaser.Physics.Arcade.Body).setCircle(radius, offset, offset);
  }

  reduceMaxHp(amount: number): void {
    this.maxHp = Math.max(1, this.maxHp - amount);
    this.hp = Math.min(this.hp, this.maxHp);
    this.healthBar.setMaxHp(this.maxHp);
  }

  increaseMaxHp(amount: number): void {
    this.maxHp += amount;
    this.healthBar.setMaxHp(this.maxHp);
  }

  takeDamage(amount: number, opts?: DamageOpts): void {
    // Invasion co-op: friendly fire from the ally replica never lands. Checked
    // before anything else so a blocked hit can't consume a buff or a shield.
    if (this.allyDamageBlocked && Fighter.nonAllyDepth === 0) return;
    // Online PvP: only relayed hits change our health — see `netAuthoritativeDamage`.
    if (this.netAuthoritativeDamage && !opts?.netApplied && !opts?.selfInflicted) return;
    // Divine perk Order: self-inflicted costs are refused outright.
    if (opts?.selfInflicted && this.selfDamageImmune) { this.onSelfDamageBlocked?.(amount); return; }
    // Magic Mastery — Levitate: immune to damage from a source that hasn't moved in 3s.
    this.damageWasSelfInflicted = false;
    if (this.levitating && opts?.source && opts.sourceX !== undefined && opts.sourceY !== undefined
        && isStationaryFor(opts.source, opts.sourceX, opts.sourceY, 3000)) return;
    if (!opts?.pierce && this.isInvincible) return;

    let isCrit = false;
    if (opts?.netApplied) {
      // Already multiplied through on the attacker's sim; don't let a stale crit
      // context leak into the next locally-computed hit.
      this.incomingCritCtx = null;
      this.rawDamageTaken += amount;
    } else {
      // Crit roll: use any incoming crit context set by the attacker
      const critCtx = this.incomingCritCtx;
      this.incomingCritCtx = null;
      const effectiveCritChance = critCtx ? Math.min(1, critCtx.chance + this.incomingCritBonus) : 0;
      isCrit = effectiveCritChance > 0 && Math.random() < effectiveCritChance;
      if (isCrit) {
        amount = Math.round(amount * (critCtx?.mult ?? 2));
      }

      // Tallied here: after the crit roll (a crit really is a bigger hit) but before every
      // mitigation multiplier on the line below, which is what "damage aimed at you" means.
      this.rawDamageTaken += amount;
      let mitigation = this.incomingDamageMultiplier * this.gauntletDamageTakenMult * this.bribeIncomingMult * this.smokeIncomingMult * this.cardDamageTakenMult * this.droneArmorMult * this.kineticShieldMult * this.steelShieldMult * this.empoweredIncomingMult * this.potionArmorMult * this.hopelessIncomingMult * this.justiceIncomingMult * this.magmaIncomingMult * this.conquestIncomingMult * this.passionIncomingMult * this.quantumIncomingMult * this.deathIncomingMult * this.journalIncomingMult * this.psychicIncomingMult * this.bindIncomingMult * this.illusionIncomingMult * this.soundIncomingMult * this.artifactIncomingMult * this.marrowIncomingMult * this.gluttonyIncomingMult * this.orderIncomingMult * this.fortuneIncomingMult * this.mapArmorMult * this.netDefenseMult;
      // Ruin's spikes turn armour inside out — 25% less damage taken comes back as 25% more.
      // Only a net *buff* is flipped; a fighter already taking extra damage is left alone.
      if (mitigation < 1 && this.scene.time.now < this.buffsInvertedUntil) mitigation = 2 - mitigation;
      // Quantum's Effect Split: everything riding on this body is running at half strength, so
      // whatever the product came out as is dragged halfway back to neutral. Applied after the
      // Ruin flip so a split armour buff is still a buff when the spikes turn it over.
      if (this.scene.time.now < this.effectSplitUntil) mitigation = 1 + (mitigation - 1) * 0.5;
      amount = Math.round(amount * mitigation * this.ruinIncomingMult);
      if (this.darkVulnStacks > 0) amount = Math.round(amount * (1 + 0.25 * this.darkVulnStacks));
      // Fire Mastery — Heatwave: exposed amplifies the next hit, then is consumed.
      // Fire damage-over-time is exempt on both counts: burn/molten ticks are neither
      // amplified nor allowed to eat the buff, so a tick can't rob the next real hit.
      if (!opts?.fireDot && this.exposedUntil > this.scene.time.now) {
        amount = Math.round(amount * 1.5);
        this.exposedUntil = 0;
        this.exposedConsumedAt = this.scene.time.now;
      }
      // Fate Mastery — Vulnerable curse: doubles exactly one incoming hit, then clears.
      if (this.vulnerableNextHit) {
        amount = Math.round(amount * 2);
        this.vulnerableNextHit = false;
      }
      // Metal Mastery — Natural Clot: flat reduction on the final amount. A fully-absorbed
      // hit spends nothing (no shield charge, no clotted HP) — it simply bounces off.
      const flatReduction = Math.max(this.flatDamageReduction, this.netFlatReduction);
      if (flatReduction > 0) {
        amount = Math.max(0, amount - flatReduction);
        if (amount <= 0) { this.lastIncomingDamage = 0; this.emit('damaged', 0); return; }
      }
      // Earth Mastery — Unbreakable: applied last so nothing upstream can push a hit back above the cap.
      const damageCap = this.hardDamageCap > 0 && this.netDamageCap > 0
        ? Math.min(this.hardDamageCap, this.netDamageCap)
        : Math.max(this.hardDamageCap, this.netDamageCap);
      if (damageCap > 0) amount = Math.min(amount, damageCap);
    }
    this.lastIncomingDamage = amount;
    if (isCrit) {
      this.emit('damaged-crit', amount);
      Sfx.crit(this.x);
    }

    if (this.netGhost) {
      // Hit feedback only — vitals come from the network. Report the computed
      // amount so the local owner can forward it to the authoritative peer.
      this.onGhostDamage?.(amount, opts);
      // Sound is part of that feedback: without this, landing a hit on a remote
      // opponent would be silent, since the ghost never reaches the real-hit path.
      if (amount > 0 && !isCrit) Sfx.hit(amount, this.x, false);
      if (!this.forceInvisible) {
        this.setAlpha(0.5);
        this.scene.time.delayedCall(120, () => {
          if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1);
        });
      }
      return;
    }

    if (!opts?.pierce && this.damageAbsorber && this.damageAbsorber(amount)) return;

    if (!opts?.pierce && this.shieldCharges > 0) {
      this.shieldCharges--;
      // A charge blocking a hit rings; the layers below (shield HP, weak HP,
      // clotted HP) only soak it, so they get the duller absorb thud instead.
      Sfx.playAt('shield-block', this.x);
      if (this.shieldCharges === 0) Sfx.playAt('shield-break', this.x, { volume: 0.7 });
      if (!this.forceInvisible) {
        this.setAlpha(0.7);
        this.scene.time.delayedCall(200, () => {
          if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1);
        });
      }
      this.emit('damaged', 0); // 0 = shield blocked
      return;
    }

    if (!opts?.pierce && this.shieldHp > 0) {
      const absorbed = Math.min(this.shieldHp, amount);
      this.shieldHp -= absorbed;
      amount -= absorbed;
      if (absorbed > 0) Sfx.playAt('shield-absorb', this.x);
      if (this.shieldHp === 0) Sfx.playAt('shield-break', this.x, { volume: 0.7 });
      if (amount === 0) {
        this.emit('damaged', 0);
        if (!this.forceInvisible) {
          this.setAlpha(0.7);
          this.scene.time.delayedCall(200, () => { if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1); });
        }
        return;
      }
    }

    // Weak HP: a gray bonus layer that soaks damage like shield HP.
    if (!opts?.pierce && this.weakHp > 0) {
      const absorbed = Math.min(this.weakHp, amount);
      this.weakHp -= absorbed;
      amount -= absorbed;
      if (absorbed > 0) Sfx.playAt('shield-absorb', this.x, { rate: 1.25, volume: 0.8 });
      if (amount === 0) {
        this.emit('damaged', 0);
        if (!this.forceInvisible) {
          this.setAlpha(0.7);
          this.scene.time.delayedCall(200, () => { if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1); });
        }
        return;
      }
    }

    // Metal R+ (Blood Clottage): clotted HP is spent before normal HP and soaks
    // damage at half rate — 50 incoming removes 25 clotted and deals 25 through.
    if (!opts?.pierce && this.clottedHp > 0) {
      const clotAbsorb = Math.min(this.clottedHp, amount / 2);
      this.clottedHp = Math.max(0, this.clottedHp - clotAbsorb);
      amount = Math.max(0, amount - clotAbsorb * 2);
      if (clotAbsorb > 0) Sfx.playAt('shield-absorb', this.x, { rate: 0.8, volume: 0.85 });
      if (amount === 0) {
        this.emit('damaged', 0);
        if (!this.forceInvisible) {
          this.setAlpha(0.7);
          this.scene.time.delayedCall(200, () => { if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1); });
        }
        return;
      }
    }

    // Practice target: the hit is fully resolved and reported, it just never sticks.
    if (!this.immortal) this.hp = Math.max(0, this.hp - amount);
    this.emit('damaged', amount);
    // A crit already announced itself above with its own, louder sound.
    if (amount > 0 && !isCrit) Sfx.hit(amount, this.x, this.isPlayerFighter);
    if (amount > 0 && this.onDamaged) this.onDamaged(amount);

    // Torture Trap lifesteal: heal the link source for actual damage taken
    if (amount > 0 && this.darkLinkSource && this.darkLinkSource.active && Date.now() < this.darkLinkedUntil) {
      this.darkLinkSource.heal(amount);
    }

    if (!this.forceInvisible) {
      this.setAlpha(0.3);
      this.scene.time.delayedCall(150, () => {
        if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1);
      });
    }

    if (this.hp <= 0) {
      this.emit('defeated');
      Sfx.playAt(this.isPlayerFighter ? 'death-player' : 'death-npc', this.x);
    }
  }

  /** Optional callback invoked with the actual HP gained (> 0) whenever healing occurs. */
  public onHeal?: (actualAmount: number) => void;

  /** Optional callback invoked with the final post-mitigation damage (> 0) whenever a real hit lands. */
  public onDamaged?: (amount: number) => void;

  heal(amount: number): void {
    if (this.netGhost) return;
    if (this.healStopUntil > 0 && Date.now() < this.healStopUntil) return;
    // Radiation (Irradiated): the heal arrives, it just arrives the wrong way round. Pierced,
    // because a shield spent soaking your own regeneration would be a very strange thing to
    // watch, and routed as non-ally damage so it still lands on a co-op player.
    if (this.healInvertedUntil > 0 && Date.now() < this.healInvertedUntil) {
      const harm = Math.round(amount);
      if (harm > 0) {
        Fighter.asNonAllyDamage(() => this.takeDamage(harm, { pierce: true }));
        this.onHealInverted?.(harm);
      }
      return;
    }
    const before = this.hp;
    // Clotted HP occupies part of the max-HP pool — normal HP can only refill
    // up to what isn't clotted, so total (hp + clottedHp) never exceeds maxHp.
    this.hp = Math.min(this.maxHp - this.clottedHp, this.hp + amount);
    const actual = this.hp - before;
    // Regeneration ticks call this many times a second; the recipe's own minGap
    // collapses those into an occasional chime rather than a continuous tone.
    if (actual > 0) Sfx.playAt('heal', this.x, { volume: this.isPlayerFighter ? 1 : 0.6 });
    if (actual > 0 && this.onHeal) this.onHeal(actual);
  }

  /** Online play: apply network-authoritative vitals to a replica fighter. */
  netSyncVitals(hp: number, maxHp: number, shieldHp: number, shieldCharges: number): void {
    if (maxHp !== this.maxHp) {
      this.maxHp = maxHp;
      this.healthBar.setMaxHp(maxHp);
    }
    this.hp = hp;
    this.shieldHp = shieldHp;
    this.shieldCharges = shieldCharges;
  }

  setMaxHp(newMax: number): void {
    this.maxHp = newMax;
    this.hp = newMax;
    this.healthBar.setMaxHp(newMax);
  }

  setHealthBarVisible(visible: boolean): void {
    if (visible) {
      this.healthBar.visible = true;
    } else {
      this.healthBar.hide();
    }
  }

  hideHealthBar(): void {
    this.healthBar.hide();
  }

  /** Like takeDamage but bypasses isInvincible — used for self-inflicted effects. */
  applySelfDamage(amount: number): void {
    if (this.netGhost) return;
    // Divine perk Order: the other self-harm route — see `selfDamageImmune`.
    if (this.selfDamageImmune) { this.onSelfDamageBlocked?.(amount); return; }
    this.damageWasSelfInflicted = true;
    if (!this.immortal) this.hp = Math.max(0, this.hp - amount);
    this.emit('damaged', amount);
    // Quieter than a real hit: self-damage is usually a steady drip (Flame Body,
    // Pain Battery) and shouldn't compete with the fight for attention.
    if (amount > 0) Sfx.playAt('hit-light', this.x, { volume: 0.55, rate: 1.2 });

    if (!this.forceInvisible) {
      this.setAlpha(0.3);
      this.scene.time.delayedCall(150, () => {
        if (this.active) this.setAlpha(this.forceInvisible ? 0 : 1);
      });
    }

    if (this.hp <= 0) {
      this.emit('defeated');
      Sfx.playAt(this.isPlayerFighter ? 'death-player' : 'death-npc', this.x);
    }
  }

  /** Roll a dodge. Returns true if the hit is dodged; subtracts 0.2 from dodgeChance on success. */
  rollDodge(): boolean {
    if (this.dodgeChance <= 0) return false;
    if (Math.random() < Math.min(1, this.dodgeChance)) {
      this.dodgeChance = Math.max(0, this.dodgeChance - 0.2);
      return true;
    }
    return false;
  }

  /** Apply a Disarm effect lasting `ms` milliseconds (prevents ability casts). */
  applyDisarm(ms: number): void {
    this.disarmedUntil = Math.max(this.disarmedUntil, Date.now() + ms);
  }

  castAbility(abilityId: string, ctx: CastContext): boolean {
    const ability = this.element.abilities.find((a) => a.id === abilityId);
    if (!ability) return false;

    const now = Date.now();
    if (now < this.disarmedUntil || now < this.chickenUntil) return false;
    if (now < this.silencedUntil && ability.displayKey !== 'Click') return false;
    if (now < (this.lockouts.get(abilityId)?.until ?? 0)) return false;
    if (now - (this.cooldowns.get(abilityId) ?? 0) < this.storedCooldown(abilityId, ability)) return false;

    // Psychic (Opened Eyes): the press is real — it commits the cooldown here and now — but
    // the ability itself is handed to the kit to resolve two seconds later. Everything the
    // cast is *announced* by (the sound, the online relay, the Wrenched backfire) waits with
    // it, so the world only learns about the ability at the moment it actually happens.
    if (this.castDelayMs > 0 && this.queueDelayedCast) {
      this.cooldowns.set(abilityId, now);
      const taken = this.queueDelayedCast(abilityId, this.castDelayMs, () => {
        // The aim travels with the cast: by the time this runs the mouse has moved on, and
        // the relay OnlineKit builds off `onCastStamp` would otherwise point somewhere else.
        this.pendingCastAim = { x: ctx.targetX, y: ctx.targetY };
        this.announceCast(abilityId);
        ability.cast(ctx);
      });
      if (taken) return true;
    }

    this.stampCast(abilityId);
    ability.cast(ctx);
    return true;
  }

  /**
   * Everything that counts as "this fighter used an ability" funnels through here: the
   * cooldown stamp, the online broadcast hook, and the Wrenched backfire. Charge-and-release
   * abilities stamp through `triggerCooldown`/`startCooldown` rather than `castAbility`, so
   * all three routes go via this — otherwise a wrenched fighter could dodge the cost simply
   * by picking the right key.
   */
  private stampCast(abilityId: string): void {
    this.cooldowns.set(abilityId, Date.now());
    // Quantum's Ability Split is spent here rather than at the press, so it lands on whatever
    // ability actually went off — including the charge-and-release ones that never reach
    // `castAbility`. Always written, never merely set, so an id that had a split last time
    // does not keep it.
    const exempt = this.splitExemptAbilities.has(abilityId);
    this.cooldownScales.set(abilityId, exempt ? 1 : this.nextCastCooldownMult);
    if (!exempt && this.nextCastCooldownMult !== 1) {
      this.nextCastCooldownMult = 1;
      this.onCooldownSplitSpent?.(abilityId);
    }
    this.announceCast(abilityId);
  }

  /**
   * The real length of an ability's cooldown, with every multiplier that can stretch or
   * shorten it. Three call sites need this in agreement — the refusal in `castAbility`, the
   * clamp in `reduceCooldowns` and the bar in `getCooldownRatio` — and they disagreed once.
   */
  private effectiveCooldown(ability: { cooldown: number; isUltimate?: boolean }): number {
    const ultimateExtra = ability.isUltimate ? this.ultimateCooldownMult : 1;
    return ability.cooldown * (this.cooldownMult || 1) * this.netCooldownMult
      * this.amputationCooldownMult * ultimateExtra;
  }

  /** As {@link effectiveCooldown}, including whatever split was banked when this id was stamped. */
  private storedCooldown(abilityId: string, ability: { cooldown: number; isUltimate?: boolean }): number {
    return this.effectiveCooldown(ability) * (this.cooldownScales.get(abilityId) ?? 1);
  }

  /**
   * Stretch (or shorten) the cooldown of the cast that just went off, for one key that resolves
   * into two different abilities — Sound's Q is a cheap Coda until it maxes, then becomes Solo
   * and has to pay full ultimate price. Multiplies the scale `stampCast` banked, so it composes
   * with a Quantum split rather than overwriting it, and the next stamp clears it.
   */
  scaleStampedCooldown(abilityId: string, mult: number): void {
    this.cooldownScales.set(abilityId, (this.cooldownScales.get(abilityId) ?? 1) * mult);
  }

  /** Fired when a banked Ability Split is actually spent, so QuantumCoreKit can draw it. */
  public onCooldownSplitSpent: ((abilityId: string) => void) | null = null;

  /**
   * The half of `stampCast` that is about the ability *happening* rather than about it being
   * paid for. Split out for Psychic's delayed casts, which stamp the cooldown two seconds
   * before any of this runs — see `castDelayMs`.
   */
  private announceCast(abilityId: string): void {
    this.lastCastAbilityId = abilityId;
    // The one place every ability passes through is also the only honest place to count
    // them, so bond research listens here rather than in each kit. Emitted for both sides;
    // ArenaScene subscribes on the player alone.
    this.emit('cast', abilityId);
    // The one place every ability in the game passes through, so it is also the
    // one place any of them needs to be given a voice — see `AbilitySounds.ts`.
    const ability = this.element.abilities.find((a) => a.id === abilityId);
    Sfx.ability(abilityId, this.element.id, ability?.displayKey, {
      isPlayer: this.isPlayerFighter, x: this.x,
    });
    this.onCastStamp?.(abilityId, this.pendingCastAim ?? undefined);
    this.pendingCastAim = null;
    if (this.castPunishDamage > 0 && Date.now() < this.castPunishUntil) {
      const cost = this.castPunishDamage;
      // The wrench belongs to whoever threw it, so this is not self-inflicted damage — it
      // still has to land on a co-op player carrying `allyDamageBlocked`.
      Fighter.asNonAllyDamage(() => this.takeDamage(cost));
      this.onCastPunish?.(cost);
    }
  }

  /** Starts the cooldown for an ability without calling cast() — for charge-and-release abilities. */
  triggerCooldown(abilityId: string): void {
    this.stampCast(abilityId);
  }

  /** Shift all stored cooldown timestamps forward by deltaMs (used to compensate for real-time elapsed during a game pause). */
  shiftCooldowns(deltaMs: number): void {
    for (const [k, v] of this.cooldowns) this.cooldowns.set(k, v + deltaMs);
    // Locks are wall-clock waits, so a pause has to move them too or a 20s lockdown
    // quietly expires while the game is sitting on the pause menu.
    for (const [, lock] of this.lockouts) lock.until += deltaMs;
  }

  /**
   * Ruin (Lockdown): refuse `abilityId` for `ms`, however ready its cooldown is. Never
   * shortens a lock already in place.
   */
  lockAbility(abilityId: string, ms: number): void {
    const until = Date.now() + ms;
    const cur = this.lockouts.get(abilityId);
    if (cur && cur.until >= until) return;
    this.lockouts.set(abilityId, { until, ms });
  }

  /** Milliseconds left on an ability's lock, or 0 if it isn't locked. */
  lockRemaining(abilityId: string): number {
    return Math.max(0, (this.lockouts.get(abilityId)?.until ?? 0) - Date.now());
  }

  /** Every ability currently locked out, newest expiry last. Read by the status tray. */
  lockedAbilities(): string[] {
    const now = Date.now();
    return [...this.lockouts.entries()].filter(([, l]) => l.until > now).map(([id]) => id);
  }

  clearLocks(): void {
    this.lockouts.clear();
  }

  /** Force an ability's cooldown to start right now (used by kits that manage their own CD timing). */
  startCooldown(abilityId: string): void {
    this.stampCast(abilityId);
  }

  /** Reduce remaining cooldown of an ability by byMs milliseconds (cannot make it readier than fully ready). */
  reduceCooldown(abilityId: string, byMs: number): void {
    const stored = this.cooldowns.get(abilityId) ?? 0;
    this.cooldowns.set(abilityId, stored - byMs);
  }

  /**
   * Restart an ability's cooldown from now without casting, voicing or relaying anything —
   * Psychic's Mind Control, which takes an ability out of the queue *after* it was paid for
   * and has to make the thief pay for it a second time.
   */
  restampCooldown(abilityId: string): void {
    this.cooldowns.set(abilityId, Date.now());
  }

  /** Make an ability immediately ready (clears its cooldown). */
  resetCooldown(abilityId: string): void {
    this.cooldowns.set(abilityId, 0);
  }

  /** Every ability comes back at once (Air Mastery — Winds of Change). */
  clearAllCooldowns(): void {
    this.cooldowns.clear();
  }

  /**
   * Air (Spin Dance): pull every running cooldown forward by up to `ms`, and report how much
   * was actually taken off. The clamp matters — an ability with 400ms left can only give up
   * 400ms, and the mastery requirement counts *time removed*, not times pressed.
   */
  reduceCooldowns(ms: number, exceptId?: string): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, stamp] of this.cooldowns) {
      if (id === exceptId) continue;
      const ability = this.element.abilities.find((a) => a.id === id);
      if (!ability) continue;
      const left = this.storedCooldown(id, ability) - (now - stamp);
      if (left <= 0) continue;
      const take = Math.min(ms, left);
      this.cooldowns.set(id, stamp - take);
      removed += take;
    }
    return removed;
  }

  /** Returns 0 = on cooldown, 1 = ready */
  getCooldownRatio(abilityId: string): number {
    const ability = this.element.abilities.find((a) => a.id === abilityId);
    if (!ability) return 1;
    const elapsed = Date.now() - (this.cooldowns.get(abilityId) ?? 0);
    const ratio = Math.min(1, elapsed / this.storedCooldown(abilityId, ability));
    // A lock outranks the cooldown underneath it: whichever has longer to run is what the
    // card should be draining, or a locked ability would show as ready and refuse the press.
    const lock = this.lockouts.get(abilityId);
    if (!lock) return ratio;
    const left = lock.until - Date.now();
    return left <= 0 ? ratio : Math.min(ratio, 1 - left / lock.ms);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    // Weak HP decays steadily at 3/s.
    if (this.weakHp > 0) this.weakHp = Math.max(0, this.weakHp - 3 * (delta / 1000));
    this.healthBar.update(this.x, this.y, this.hp, this.shieldHp, this.chargeRatio, this.clottedHp, this.weakHp, this.chargeColor);
  }

  destroy(fromScene?: boolean): void {
    this.healthBar.destroy();
    if (this.burnAura) { this.burnAura.destroy(); this.burnAura = null; }
    if (this.frostVisual) { this.frostVisual.destroy(); this.frostVisual = null; }
    if (this.voidFrostVisual) { this.voidFrostVisual.destroy(); this.voidFrostVisual = null; }
    if (this.toxicAura) { this.toxicAura.destroy(); this.toxicAura = null; }
    if (this.bleedVisual) { this.bleedVisual.destroy(); this.bleedVisual = null; }
    if (this.permafrostVisual) { this.permafrostVisual.destroy(); this.permafrostVisual = null; }
    if (this.permavoidVisual) { this.permavoidVisual.destroy(); this.permavoidVisual = null; }
    super.destroy(fromScene);
  }
}
