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
/** Devotion Mastery: an averting fighter only turns away from an Ark it would look within this of. */
export const GAZE_AVERT_CONE = Phaser.Math.DegToRad(26);

/** A Q with a cooldown under this already has a gate of its own and is not charged. */
const ULT_MIN_TIMER_MS = 5000;
/** Ultimate price: a flat floor plus a little for every second of the old cooldown. */
const ULT_BASE_COST = 60;
const ULT_COST_PER_SEC = 6;
/**
 * Ultimates charged by a resource of their own kit, which keep it: Magma's pendant, Conquest's
 * Authority, Metal's blood bar — and Myth's rocket, a Final Destiny gun that only wears a Q.
 */
const SELF_CHARGED_ULTIMATES = new Set(['magma-mutiny', 'conquest-expansion', 'metal-clot-armor', 'myth-rocket']);

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
  /**
   * Myth's Truth Breaker: **true damage**. Everything `pierce` skips (absorbers, shields,
   * every kind of extra health, the menu cut) plus the whole mitigation stage — armour,
   * resistances, flat reductions and caps — and Clay's Fuse. Only outright invincibility
   * frames and `immortal` still stop it. Relayed online as its own flag.
   */
  trueDamage?: boolean;
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
   * This hit arrived as an area blast rather than as a shot or a swing. Set centrally by
   * ArenaScene's `dealAoeDamage`, so every kit that routes its explosions through it gets the
   * flag for free. Read by Cloth's Casual Hoodie outfit and nothing else so far.
   */
  aoe?: boolean;
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
   * In-match menu UIs this fighter currently has open (evolve tree, tapestry draft,
   * upgrade modal…), keyed so overlapping UIs cannot stomp each other's close.
   *
   * While any is open, incoming damage is cut to 5% in `takeDamage` — the standard
   * "you are in a menu" protection that replaced the old outright menu invincibility.
   * Kits sync their key every frame from their own open flag, so every close path
   * (buy, cancel, timeout, match end) clears it without needing its own call site.
   */
  private menuGuards = new Set<string>();
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
   * Justice (Indomitable Will, R+): health may not be driven below this value.
   *
   * Deliberately *not* `immortal` and not `isInvincible` — every hit lands, is computed in
   * full, spends whatever it spends and shows the number it dealt; the last point of health
   * simply refuses to go. The floor is only ever a clamp on a subtraction, never a top-up,
   * so a body already below it is left where it is. Set to 0 by everything that isn't
   * holding it, and cleared by the owning kit's `reset()`.
   */
  public minHpFloor = 0;
  /**
   * Cloth Mastery (Bleed Stop): how much more damage this body may take before every further
   * point is refused. -1 is "no budget". Clamped after every mitigation and the menu cut, and
   * applied to relayed (`netApplied`) hits as well, so the victim's sim is the one that honours
   * it online. Cleared by the owning kit when its window closes and by its `reset()`.
   */
  public damageBudget = -1;

  /**
   * Myth — Final Destiny's pistol: each hit is a stack of 5% more damage taken, up to four,
   * for five seconds (`Date.now()` clock). Victim-side, mirrored online as `mythv`. The
   * shotgun reads the stacks for its own doubling.
   */
  public mythVulnStacks = 0;
  public mythVulnUntil = 0;
  /** Myth — The Crowd: jeered until this `Date.now()` timestamp, 10% more damage taken. */
  public mythJeeredUntil = 0;
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
  /**
   * Earth Q+ — Symbiosis: 0.8 while an Earth user stands in their own Ice biome. Its own field
   * for the reason Justice and Conquest have theirs — EarthKit rewrites it from scratch every
   * frame, and sharing `incomingDamageMultiplier` would stomp whatever else wrote armour that tick.
   */
  public earthBiomeIncomingMult = 1;
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
   * Wax: candlelight armour multiplied by bee, poison and sticky-bomb vulnerability. WaxKit
   * rewrites the whole product from scratch every frame — on both fighters and every husk —
   * so an unlimited number of attached bees can stack without borrowing another kit's field.
   */
  public waxIncomingMult = 1;
  /**
   * Wax Mastery. `waxSmokeDodge` (Smoke-out) is the chance a hit is lost in the smoke while the
   * fighter stands in its own cloud; `waxHoneyShell` (Honey Shell) eats the next hit of 30 or more
   * whole. Both are rolled on the body's own machine — WaxKit never arms them on a replica — and
   * each has a counter so the kit can see it happen and say so.
   */
  public waxSmokeDodge = 0;
  public waxSmokeDodges = 0;
  public waxHoneyShell = false;
  public waxHoneyShellPops = 0;
  /** Clay Mastery — Bedrock: 0.8 while the fighter stands within 175px of its own golem. Rewritten every frame by ClayKit. */
  public clayIncomingMult = 1;
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
   * Devotion Mastery (Ark of the Covenant): this fighter's sight is being bent by an Ark at
   * (gazeX, gazeY). A positive `gazeTurnRad` pulls every aim up to that far toward it; a negative
   * one turns an aim that would look within {@link GAZE_AVERT_CONE} of it away by that much.
   * PassionKit refreshes it every frame on the sim that owns this fighter's aim, so it lapses on
   * its own once the Ark is gone. Date.now() based.
   */
  public gazeX = 0;
  public gazeY = 0;
  public gazeTurnRad = 0;
  public gazeUntil = 0;
  /**
   * Gold (element id `fortune`), Advance's Gilded Hide: 0.93 per pick on the alchemist, 1 on
   * everybody else. Its own field for the same reason Justice, Magma, Conquest and Passion have
   * theirs — FortuneKit rewrites it from scratch every frame, and sharing
   * `incomingDamageMultiplier` would stomp whatever else had written armour that tick.
   */
  public fortuneIncomingMult = 1;
  /**
   * Gold's Heart of Gold: scene time the gold heart stops, and how full of stress it is (0–1;
   * a full heart is a heart attack). Fields rather than kit state so the status tray and the
   * online status mirror carry them — FortuneKit treats them as the truth.
   */
  public goldHeartUntil = 0;
  public goldHeartStress = 0;
  /** Gold's Midas Curse: scene time the curse lifts. Mirrored online like the heart. */
  public midasUntil = 0;
  /**
   * Gold upgrades. The two timers are scene time and mirrored online like the heart; the rest are
   * written every frame by FortuneKit (its one writer) and handed back by its `reset()`.
   *
   * - `goldHexUntil` (F+ Gold Hex): every cooling ability on this body recharges at half speed.
   * - `goldStatueUntil` (Q+ Full Metal Alchemy): a solid gold statue — no moving, no casting.
   * - `goldCooldownMult` (E+ Ruby Haste): every cooldown stretched. Relayed online through `cd`.
   * - `goldVigorCut` (E+ Ruby Vigor): max HP taken away. The kit applies it as a delta.
   * - `goldSpeedMult` (E+ Ruby Stride): read by Husk.moveSpeed; the duel pair is slowed through the
   *   kit's own speed mults instead, which is also what reaches an online victim.
   * - `goldCloakDodge` (R+ Glittery Cloak): the chance a hit is dodged; `goldCloakDodges` counts
   *   them so the kit can say so.
   */
  public goldHexUntil = 0;
  public goldStatueUntil = 0;
  public goldCooldownMult = 1;
  public goldVigorCut = 0;
  public goldSpeedMult = 1;
  public goldCloakDodge = 0;
  /**
   * Magnet Mastery (Mag-Lev): a magnetised body caught on the magnet's maglev ground is held back.
   * Written every frame by MagnetKit (its one writer), read by Husk.moveSpeed; the duel pair is
   * slowed through the kit's own speed mults instead.
   */
  public magnetSlowMult = 1;
  /**
   * Tempest Q+ (Herald of Doom): standing in a storm puddle. Written every frame by TempestKit
   * (its one writer), read by Husk.moveSpeed; the duel pair is slowed through the kit's own speed
   * mults instead.
   */
  public tempestSlowMult = 1;
  /**
   * Dream: the claw's slow and Sleep Paralysis' (Q+). Written every frame by DreamKit (its one
   * writer), read by Husk.moveSpeed; the duel pair is slowed through the kit's own speed mults.
   */
  public dreamSlowMult = 1;
  /**
   * Dream E+ (Lucid Dream): the chance a hit misses a dreamer who has dreamt themselves stronger.
   * Rolled on the body's own machine, like the cloak's; DreamKit is its one writer.
   */
  public dreamLucidDodge = 0;
  public goldCloakDodges = 0;
  /**
   * Ruin (Unstoppable Decay): 1.1^stacks of rot on this fighter, times 0.9^stacks carried by
   * whoever is hitting it — the victim-side stand-in for "the decayed deal less", since
   * `takeDamage` has no attacker reference. Rewritten from scratch by RuinKit every frame,
   * and deliberately outside the invertible mitigation block below: decay is a debuff, and
   * Spikes of Ruin turns *buffs* inside out.
   */
  public ruinIncomingMult = 1;
  /**
   * Ruin Mastery (Combo Breaker): 0.5 while a mastered Ruin is on the other side of the fight,
   * and 1 otherwise. Every resource meter in the game — kinetic charge, fear, inflammation,
   * love, hunger, anger, hype, Authority, DNA, blood, stress — multiplies whatever it was
   * about to gain by this before banking it, through {@link meterGain}. Rewritten from scratch
   * by RuinKit every frame, exactly like `ruinIncomingMult`.
   *
   * Deliberately only touches *gains*: a bar that drains on a timer drains at its own speed, so
   * the passive makes meters slower to fill rather than shorter to hold.
   */
  public meterGainMult = 1;
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
   * Paper Mastery (Spirit of the Story): the open storybook's statline, and — like the journal
   * above — two opposite things depending on who is wearing it. On the mastered Paper it is the
   * Knight book's 20% armour; on everyone Paper is fighting it is the Alien book's 20% extra
   * damage. Deliberately *not* folded into `journalIncomingMult`: that one is save-backed and
   * player-only, while this is a live passive that an online Paper opponent has too, and the
   * two would stomp each other the first time both sides of a match were Paper. PaperKit
   * rewrites it from scratch every frame.
   */
  public paperIncomingMult = 1;
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
   * Illusion's damage bonuses, folded into one field and rewritten from scratch by IllusionKit
   * every frame — Justice's arrangement, and for Justice's reason. A Phantom's blast marks a
   * body for 1.2, the Masquerade mask is worth 1.5 and Re-Trick's surprise 1.25, and all three
   * are allowed to multiply.
   */
  public illusionIncomingMult = 1;
  /**
   * Cloth: the tailor's own armour, folded into one number — Survive III's 20% off the top, the
   * and the Heavy Coat outfit. Its own field for the reason
   * Justice, Illusion and Sound have theirs: ClothKit rewrites it from scratch every frame off
   * its own state, and sharing `incomingDamageMultiplier` would stomp whatever else wrote
   * armour that tick.
   */
  public clothIncomingMult = 1;
  /**
   * Marrow (Cytokine Storm, R+): the vulnerability a neutrophil's cytokine pellets stack onto
   * whatever they hit. Its own field for the reason Justice, Illusion and Sound have theirs —
   * MarrowKit rewrites it from scratch every frame off its own stack table, and sharing
   * `incomingDamageMultiplier` would stomp whatever else wrote armour that tick.
   */
  public marrowIncomingMult = 1;
  /**
   * Cloth mastery, Casual Hoodie: 20% off anything that arrives as an area blast or a piercing
   * shot. Separate from `clothIncomingMult` because it is conditional on the hit rather than on
   * the wearer — see the `aoe` and `pierce` flags on {@link DamageOpts}.
   */
  public clothAoeMult = 1;
  /**
   * Cloth (Pin Cushion, F): health the tailor has stabbed through with pins. Spent before
   * normal HP like weak HP, but at {@link pinnedVulnMult} rate — it is *worse* health, not a
   * shield — and whatever it eats is reported to {@link onPinnedAbsorb} so the kit can throw a
   * share of it back at the attacker.
   */
  public pinnedHp = 0;
  /** How fast Pinned HP burns relative to the damage it is soaking. Thorns III drops it to 1. */
  public pinnedVulnMult = 1.25;
  /** Called with the Pinned HP actually consumed by a hit. Wired by ClothKit for thorns. */
  public onPinnedAbsorb: ((spent: number) => void) | null = null;
  /**
   * Cloth's Thick Skin artwork: incoming hits stop counting as piercing, so every absorb layer
   * — invincibility, the absorber, shields, weak HP, clotted HP and Pinned HP — gets to see them.
   */
  public pierceImmune = false;
  /** Cloth's Quick artworks, multiplied into every cooldown the tailor pays. */
  public clothCooldownMult = 1;
  /**
   * Harvest (element id `gluttony`, Reaping Hour): the permanent 15%-a-hit vulnerability the
   * scythe leaves on everything it cuts, compounded. Its own field for the reason Justice,
   * Illusion and Cloth have theirs: GluttonyKit rewrites it from scratch every frame off its own
   * per-body stack count, and sharing `incomingDamageMultiplier` would stomp whatever else wrote
   * armour that tick.
   */
  public gluttonyIncomingMult = 1;
  /**
   * Harvest F+ Corrupt Cooking: Meat Broth's armour on the scarecrow itself (0.67 while it lasts).
   * Separate from `gluttonyIncomingMult` because that one is the Reaping Hour vulnerability the
   * *attacker* writes on its victims; this one is self-granted, so it travels online in `dm`.
   */
  public harvestIncomingMult = 1;
  /**
   * Harvest R+ Poison Payload: poisoned by a crow's vial until this `Date.now()` time. The kit owns
   * the ticking; this field is the tray's and the online mirror's view of it.
   */
  public harvestPoisonUntil = 0;
  /**
   * Harvest: how far the rot has got into this body, 0–100. Written by GluttonyKit on whoever
   * stands on the scarecrow's mold, bites into its Corrupt HP, or is bitten while it is half rot;
   * read back by its lifesteal, the crows and the scythe's execute line. A plain field so the
   * status tray and the online mirror pick it up — the attacker's sim decides it.
   */
  public harvestCorruption = 0;
  /**
   * Devotion: faith poured into this body by the priest (id `passion`). Nothing lowers it; at the
   * cap (200 in a duel) the body is converted. A plain field so the status tray and the online
   * mirror carry it — only the attacker's sim ever raises it.
   */
  public devotionFaith = 0;
  /**
   * Harvest: Corrupt HP, a purple layer spent after weak HP and before clotted HP. Whatever it
   * soaks is reported to {@link onCorruptAbsorb} so the kit can rot whoever did the soaking.
   */
  public corruptHp = 0;
  public onCorruptAbsorb: ((spent: number, opts?: DamageOpts) => void) | null = null;
  /**
   * Sound (the Smooth soul song): 20% damage resistance while it plays. Its own field for the
   * reason Justice, Magma and Illusion have theirs — SoundKit rewrites it from scratch every
   * frame, and sharing `incomingDamageMultiplier` would stomp whatever else wrote armour that tick.
   */
  public soundIncomingMult = 1;
  /**
   * Sound (Fermata): Out of Tune, `Date.now()`-based. While it runs a quarter of this fighter's
   * ability presses misfire inside `castAbility` — the cooldown is spent, nothing happens. Husks
   * roll the same chance on their bites and shots. `lastTuneMissAt` stamps the latest misfire so
   * SoundKit can call it out over the victim's head.
   */
  public outOfTuneUntil = 0;
  public lastTuneMissAt = 0;
  /**
   * A generic hard stun, `Date.now()`-based (Sound's Fermata detonation). The writer also
   * disarms; whichever kit wrote it holds the body still post-movement. Mirrored online as
   * `stunned` so the victim's own sim freezes them too.
   */
  public stunnedUntil = 0;
  /**
   * Vault artifacts (Rime Brand): vulnerability written by `ArtifactsKit`. Its own field for
   * the same reason as every neighbour above — the kit rewrites it outright when a freeze
   * lands and again when it lifts, and sharing anyone else's would stomp their value.
   */
  public artifactIncomingMult = 1;
  /**
   * Dream (Nightmare): the extra damage a fighter takes from everything while a nightmare has
   * them. Its own field for the reason every neighbour above has one — DreamKit rewrites it
   * every frame off `dreamNightmareUntil`, and sharing `incomingDamageMultiplier` would stomp
   * whatever else wrote armour that tick.
   */
  public dreamIncomingMult = 1;
  /**
   * Dream: drowsiness, 0–100, on the body it is happening to. At 100 the fighter falls asleep
   * (`dreamAsleep`) and burns 5 a second until it runs out and they wake. Fighter fields rather
   * than kit state so the status tray reads them on any victim and `NetStatusSync` can mirror
   * them to an online victim, whose own sim then puts them to sleep. DreamKit owns both.
   */
  public dreamDrowsy = 0;
  public dreamAsleep = false;
  /**
   * Online only: the drowsiness and sleep the opponent's sim last reported for this body
   * (`NetStatusSync`). Kept apart from the two fields above so DreamKit can refuse a stale
   * report that arrives just after a hit woke the sleeper here.
   */
  public dreamNetDrowsy = 0;
  public dreamNetAsleep = false;
  /** Dream (Nightmare): scene-time expiry of the darkness, the panic and the damage-over-time. */
  public dreamNightmareUntil = 0;
  /** Dream (dreaming R, the claw swipe): scene-time expiry of the slow it leaves. */
  public dreamClawedUntil = 0;
  /**
   * Dream Q+ (Sleep Paralysis): scene-time expiry of the window a Nightmare leaves behind, in
   * which the victim's drowsiness cannot go down at all and they move 20% slower.
   */
  public dreamParalysisUntil = 0;
  /**
   * Sand (Sand Barrier, R+): the veil of sand a parkouring Sand player is wrapped in. Its own
   * field for the same reason — SandKit rewrites it every frame off the state of the course.
   */
  public duneIncomingMult = 1;
  /**
   * Radiation's slot in the mitigation product. RadiationKit rewrites it every frame from
   * `overRadiatedUntil` (Q+ Complete Annihilation).
   */
  public radiationIncomingMult = 1;
  /**
   * Life's garden afflictions, all on the game clock and all ticked/rewritten by LifeKit:
   * a Frost Lily shard's chill (slow) and frailty (+damage taken, folded in here as
   * `lifeIncomingMult`), a Flaming Sprout's burn, and Nightcap essence's uncapped poison stacks.
   * Their own fields rather than the generic burning/toxic ones, because those only tick on the
   * npc side and the garden fights both ways.
   */
  public lifeIncomingMult = 1;
  public lifeSlowUntil = 0;
  public lifeFrailUntil = 0;
  public lifeBurnUntil = 0;
  public lifePoisonStacks = 0;
  public lifePoisonUntil = 0;

  /**
   * Magic — the Wind summon's hurricane. Everything the storm can reach takes more while the
   * conjurer is standing in its eye, which is the deal that ability makes: the safest square on
   * the board is the middle of your own disaster.
   */
  public magicIncomingMult = 1;
  /**
   * Mutations (see `src/mutations/MutationKit.ts`): a Duel's tripled stakes, a Bulwark's plate,
   * a Feast-fattened opponent, a Fragile player's glass-cannon trade and a Warden's second
   * phase, folded into one field and rewritten from scratch by MutationKit every frame.
   *
   * Its own field for the reason every neighbour above has one — and pointedly *not* a share of
   * `incomingDamageMultiplier`, which the older inline mutations (Molten, Order) already assign
   * to outright. Two mutations writing the same field would silently cancel each other, which
   * is exactly what stacking mutations must never do.
   */
  public mutationIncomingMult = 1;
  /**
   * Radiation (Irradiated): `Date.now()` epoch until which every point of healing aimed at this
   * fighter lands as damage instead — see `heal`. One field rather than a hook per healing
   * source, because `heal()` is the single place every heal in the game passes through.
   */
  public healInvertedUntil = 0;
  /** Invoked with the amount whenever an irradiated heal turns into a hit, so a kit can draw it. */
  public onHealInverted: ((amount: number) => void) | null = null;
  /**
   * Radiation F+ Mutation: `Date.now()` epoch until which this fighter's hitbox is 25% bigger.
   * RadiationKit turns the timer into `hitboxMult` on every sim, so a mirrored timer grows the
   * body there too.
   */
  public radMutatedUntil = 0;
  /**
   * Radiation Q+ Complete Annihilation: `Date.now()` epoch until which this fighter is
   * over-radiated — half speed, and +30% damage taken through `radiationIncomingMult`.
   */
  public overRadiatedUntil = 0;
  /**
   * Devotion Q+ (the sky ride's yellow-fire pillars): `Date.now()` epoch until which this fighter
   * is slowed. Read through `devotionSlowMult()` by every mover.
   */
  public devotionSlowUntil = 0;
  /**
   * Sound E+ (Infectious Moves): `Date.now()` epoch until which this fighter is dancing — it can
   * move but not attack. The cast lock itself is `disarmedUntil`; this is the dance the kit paints
   * and husks read (they have no castAbility to refuse).
   */
  public soundDanceUntil = 0;
  /**
   * Sound Mastery: out of tune twice over — a Fermata's and a Forte Piano's at once. Slower (see
   * `soundDissonanceSlowMult`) and bleeding until either stack is detonated. The bleed is the
   * Sound kit's; this is the slow every mover reads.
   */
  public soundDissonantUntil = 0;
  /**
   * A multiplier on the *physics body only*, leaving the sprite the size it looks (Cloth's
   * scarf; first added for Radiation's retired X-Ray Vision). Its own field rather than a share of `sizeMult` because the two mean
   * different things — a target lit up by an X-ray is easier to hit without becoming bigger —
   * and because Fate's slots and Illusion's folds must still own `sizeMult`/`shapeSizeMult`
   * without either of them silently handing a swollen hitbox back.
   */
  public hitboxMult = 1;
  /**
   * Paint: damage-taken factor the Paint kit owns outright — Masterpiece green's resistance on
   * the painter, Still Life red's tenderness on its subject. Single writer: rewritten from
   * scratch every frame, so it never shares `incomingDamageMultiplier` with anyone.
   */
  public paintIncomingMult = 1;
  /**
   * Paint: walk-speed factor for bodies that read their own speed (husks). The 1v1 pair is
   * slowed through the kit's pulled speed multipliers instead. Single writer: the Paint kit.
   */
  public paintSlowMult = 1;
  /**
   * Paint (Still Life F+): the subject's painted-red parts take more from a shot that lands on
   * them. Installed by the kit while the transformation lasts; asked by the projectile hit paths
   * with the point the shot struck. Null when nothing is painted on this body.
   */
  public paintZoneMult: ((x: number, y: number) => number) | null = null;
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
  /**
   * Soul's Ward perk: 0.7 while two or more of your amalgams are standing near you.
   *
   * It used to assign `incomingDamageMultiplier` directly, which has nine other raw writers —
   * the Order mutation reassigns it every frame, so Ward silently did nothing in those fights.
   * A field of its own is the house pattern for exactly this reason.
   */
  public wardIncomingMult = 1;
  /**
   * Soul: 0.8 while at least one of your Amalgams is standing — they take 20% of every hit for
   * you. SoulKit is the single writer (both fighters, every frame) and routes the other 20% onto
   * an Amalgam off this fighter's 'damaged' event.
   */
  public soulTankIncomingMult = 1;
  /**
   * World-boss wards. Owned solely by WorldBossKit's `wards` phase gimmick, which is why it
   * is not folded into `wardIncomingMult` — Soul rewrites that one every frame on both
   * fighters, and the two would clobber each other on a Soul-versus-Sovereign fight.
   */
  public bossWardIncomingMult = 1;
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
   * Death Mastery (Delay The Inevitable): 1.25 for the eight seconds of the window, so the
   * ability slows the caster's own kit down as well as the clock. Separate from
   * `amputationCooldownMult` for the same reason that one is separate from `cooldownMult` — the
   * two can be true at once and neither may overwrite the other.
   */
  public deathDelayCooldownMult = 1;
  /**
   * Dream (Delve): the shorter cooldowns a dreamer enjoys inside somebody else's dream. Its
   * own field for the same reason `deathDelayCooldownMult` is separate from
   * `amputationCooldownMult`: `cooldownMult` is written *wholesale* by Timeless, Rebirth and
   * Slime's Melt table, and a share folded in there would be erased the first time any of them
   * fired. Written by DreamKit every frame and handed back by its `reset()`.
   */
  public dreamCooldownMult = 1;
  /**
   * Justice Mastery (Combo Excelsius): the cooldown reduction the current style rank is paying
   * out — 1 at D, 0.68 at SS. Its own field for the same reason `dreamCooldownMult` is one:
   * `cooldownMult` is written wholesale by Timeless, Rebirth and Slime's Melt table, and a
   * share folded in there would be erased the first time any of them fired.
   */
  public justiceCooldownMult = 1;
  /**
   * Per-element perks that reshape a whole kit's tempo (Fire's Blaze + Melt halves every
   * cooldown). Its own field for the same reason the others are: `cooldownMult` is written
   * wholesale elsewhere. Written by the owning kit every frame and handed back by its reset().
   */
  public perkCooldownMult = 1;
  /**
   * Psychic Mastery (Outplayed): 1.10 / 1.25 / 1.33 while this fighter is far enough behind a
   * mastered psychic on health. Its own field for the same reason the others are. Written every
   * frame by PsychicKit and handed back by its reset().
   */
  public psychicCooldownMult = 1;
  /**
   * Psychic Mastery (Pre-move): per-ability cooldown stretches. Every stamp of that id while
   * `until` (Date.now()) has not passed is banked at `mult` times its length. Written through
   * {@link penalizeCooldown}.
   */
  public cooldownPenalties = new Map<string, { mult: number; until: number }>();
  /**
   * The last ability this fighter *pressed* — committed at the press, before any Opened Eyes
   * queue holds it back — and when (Date.now()). Polled by Psychic's Pre-move, which has to know
   * about a press the moment it happens, not two seconds later when the world hears of it.
   */
  public lastPressAbilityId = '';
  public lastPressAt = 0;
  /**
   * Bots: Date.now() of the last frame this body spent dodging a shot — the bot's Space. Written
   * by NpcOpponent; read by Pre-move, which treats the first frame of a dodge as a press.
   */
  public dodgingAt = 0;
  /** Psychic Mastery (Pre-move): Date.now() until which this fighter walks 30% slower. */
  public premoveSlowUntil = 0;
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
  /**
   * Run-long absorbers consulted right after `damageAbsorber` (City invasion relics: an item's
   * revive, an artifact's mirror shell). A list rather than a chained `damageAbsorber` because
   * element kits clear that slot to null all the time, and a relic has to outlive hours of that.
   * The owner removes its own entries on reset.
   */
  public relicAbsorbers: Array<(amount: number) => boolean> = [];
  /**
   * Clay's Fuse: a hit counter rather than a health pool. Runs before invincibility, pierce and
   * every multiplier because the fused body counts *attacks* — a needle and a meteor each wear
   * away exactly one of its layers — and `damageAbsorber` never sees a piercing hit at all.
   */
  public fuseHitAbsorber: ((amount: number, opts?: DamageOpts) => boolean) | null = null;
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
   * Illusion Guise: a second, independent size multiplier (0.2 while the illusionist hides
   * behind their clone). Its own field rather than a share of `sizeMult` because the two have
   * different owners — Fate rewrites `sizeMult` from its own state, and a slots roll landing
   * mid-Guise would otherwise silently hand the illusionist their full size back.
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
   * Ruin Mastery (Second Skin): 0.8 for every layer this fighter has shed, and it never goes
   * back up — five casts is 0.33× and that is the smallest anybody gets. A fourth independent
   * size multiplier for the same reason `oozeSizeMult` is a third: Fate's slots own `sizeMult`,
   * Illusion's folds own `shapeSizeMult`, Slime's swell owns `oozeSizeMult`, and any of the
   * three landing after a shed would otherwise silently hand the layer back.
   */
  public ruinSizeMult = 1;
  /** Clay's Fuse: the bigger body. Its own factor so no other size system can erase it. */
  public claySizeMult = 1;
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
  /**
   * Illusion Q+ — Bomb Dance: turned around until this `scene.time.now` timestamp. On the local
   * player it swings the camera; a bot or a husk has its walking turned instead.
   */
  public viewTurnedUntil = 0;
  /** …and by how much, in quarter turns (1–3). 0 when not turned. */
  public viewTurnQuarter = 0;
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
  /** Radians. Players: aim direction; bots/husks: movement direction. Drives backstab checks + back-shadow HUD. */
  public facingAngle = 0;
  /**
   * Stalked (Silence F): facing turns slowly instead of snapping, and every cast is aimed down
   * that facing (ArenaScene.scatterAim) rather than at the cursor. Date.now() based.
   */
  public stalkedUntil = 0;
  /**
   * Despress (Silence F+): each stack is 10% slower movement and strips 10 points of whatever
   * damage resistance this fighter has (never past neutral). Date.now() based.
   */
  public despressUntil = 0;
  public despressStacks = 0;

  /** Add Despress stacks; a lapsed status starts counting from zero again. */
  addDespress(stacks: number, ms: number): void {
    const now = Date.now();
    this.despressStacks = Math.min(10, (now < this.despressUntil ? this.despressStacks : 0) + stacks);
    this.despressUntil = Math.max(this.despressUntil, now + ms);
  }

  /** Live Despress stack count (0 once it has lapsed). */
  activeDespressStacks(): number {
    return Date.now() < this.despressUntil ? this.despressStacks : 0;
  }

  /** Movement factor from Despress, for every mover (player, bot, husk). */
  despressSlowMult(): number {
    return Math.max(0.2, 1 - 0.1 * this.activeDespressStacks());
  }

  /** Movement factor from Radiation's over-radiation (Q+), for movers no kit steers (husks). */
  overRadiatedSpeedMult(): number {
    return Date.now() < this.overRadiatedUntil ? 0.5 : 1;
  }

  /** Movement factor from a sprung Pre-move on a movement key, for every mover. */
  premoveSlowMult(): number {
    return Date.now() < this.premoveSlowUntil ? 0.7 : 1;
  }

  /**
   * Psychic Mastery (Pre-move): stretch `abilityId`'s cooldown by `mult` — the one already running
   * and every stamp of it for the next `ms`. A stronger or longer penalty wins over a weaker one.
   */
  penalizeCooldown(abilityId: string, mult: number, ms: number): void {
    const until = Date.now() + ms;
    const cur = this.cooldownPenalties.get(abilityId);
    if (!cur || cur.until < Date.now() || cur.mult <= mult) {
      this.cooldownPenalties.set(abilityId, { mult, until: Math.max(until, cur?.until ?? 0) });
    }
    this.scaleStampedCooldown(abilityId, mult);
  }

  /** The Pre-move stretch a stamp of `abilityId` would be banked with right now. */
  private cooldownPenalty(abilityId: string): number {
    const pen = this.cooldownPenalties.get(abilityId);
    if (!pen) return 1;
    if (Date.now() >= pen.until) { this.cooldownPenalties.delete(abilityId); return 1; }
    return pen.mult;
  }

  private notePress(abilityId: string): void {
    this.lastPressAbilityId = abilityId;
    this.lastPressAt = Date.now();
  }

  /** Movement factor from Sound Mastery's Dissonance (two Out of Tune stacks), for every mover. */
  soundDissonanceSlowMult(): number {
    return Date.now() < this.soundDissonantUntil ? 0.6 : 1;
  }

  /** Movement factor from Devotion's yellow-fire pillars (Q+), for every mover. */
  devotionSlowMult(): number {
    return Date.now() < this.devotionSlowUntil ? 0.6 : 1;
  }
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
  /**
   * Tempest — Flight: this body is off the floor. Melee swings (the generic `dealMeleeDamage`
   * chokepoints) skip it; floor hazards skip it through `levitating`, which TempestKit sets
   * alongside. Shots and area blasts still land. Written every frame by the kit.
   */
  public airborne = false;

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

  /**
   * Per-element perks' damage-taken factor (Fire's Alcohol: 0.8 while standing in your own
   * booze). Single writer: the owning kit sets it every frame and resets it to 1.
   */
  public perkIncomingMult = 1;

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
   * Magic — Splash+: mobility refused until this `scene.time.now` timestamp. Deliberately *not*
   * High Gravity, which also clamps speed multipliers back to 1 — a putrid pool is a heavy slow
   * you cannot dash out of, so clamping would undo the slow that is the point of standing in it.
   * Gates the Space dodge and `dashCaster`; ordinary walking is untouched.
   */
  public mobilityBlockedUntil = 0;

  /**
   * Growth Mastery — Syringe Shot: sick until this `scene.time.now` timestamp. Deliberately a
   * single field: every sickness upgrade (extra ticks, vulnerability, slows, weakening, spread)
   * rides on this one effect rather than adding its own status box.
   */
  public sicknessUntil = 0;
  /** Growth Mastery — Carrier: permanent leftovers of a survived sickness. Never clears. */
  public sicknessCarrier = false;

  /**
   * Invasion — an aligned constellation's ward (The Bulwark). Its own field rather than a
   * share of `incomingDamageMultiplier` for the same reason every other armour source has
   * one: the observatory's buff lasts the whole run, and sharing the common field would
   * stomp whatever else wrote armour that tick.
   */
  public starIncomingMult = 1;

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

  /**
   * Ultimate charge. An ultimate (the Q ability) is not on a timer: it is paid for in points
   * earned by dealing and taking damage, and a match starts with the bank empty. The price is
   * read off what the cooldown used to be — {@link ultCost} — so a short ultimate is still a
   * cheap one, and every cooldown multiplier (Finality, Rebirth, Timeless…) still discounts it.
   *
   * Off by default: ArenaScene turns it on for the two duellists. A replica (`netGhost`) is
   * never gated — its casts are replayed from the peer, who paid for them on their own machine.
   */
  public ultChargeEnabled = false;
  public ultCharge = 0;
  /**
   * Ultimates this fighter can reach that are not in `element.abilities` right now — Quantum's
   * tray carries one element's Q while another element is live. Only read for the bank's cap.
   */
  public ultExtraDefs: ReadonlyArray<{ id: string; cooldown: number; displayKey?: string; isUltimate?: boolean }> = [];
  /**
   * Who to credit for a hit that just landed on `victim` — wired by ArenaScene, which is the
   * only one that knows which side every body is on. Called for real hits and for hits on a
   * replica (the attacker's own sim is where a hit on a remote body is resolved).
   */
  public static creditUltDamage: ((victim: Fighter, amount: number) => void) | null = null;
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

  /** Declare an in-match menu UI open or closed on this fighter. Idempotent — safe to sync every frame. */
  setMenuGuard(key: string, open: boolean): void {
    if (open) this.menuGuards.add(key);
    else this.menuGuards.delete(key);
  }

  /** True while any in-match menu UI is open on this fighter (incoming damage is cut to 5%). */
  get inMenuUi(): boolean {
    return this.menuGuards.size > 0;
  }

  /** Called by the attacker (or damage source) just before takeDamage to supply crit context for this hit. */
  setIncomingCritContext(chance: number, mult: number): void {
    this.incomingCritCtx = { chance, mult };
  }

  /** Update visual scale and physics body to match sizeMult. Call after changing sizeMult. */
  applySizeMult(): void {
    // Every kit's size field rides on top of the others, so any system calling this keeps
    // a Guise, a swell or a shrink rather than quietly cancelling it.
    const scale = this.sizeMult * this.shapeSizeMult * this.oozeSizeMult * this.ruinSizeMult
      * this.claySizeMult;
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

  /** The two Myth amplifiers, as one factor for `takeDamage`. 1 when neither is on. */
  mythIncomingMult(): number {
    const now = Date.now();
    const vuln = now < this.mythVulnUntil ? 1 + 0.05 * this.mythVulnStacks : 1;
    const jeer = now < this.mythJeeredUntil ? 1.1 : 1;
    return vuln * jeer;
  }

  takeDamage(amount: number, opts?: DamageOpts): void {
    // Invasion co-op: friendly fire from the ally replica never lands. Checked
    // before anything else so a blocked hit can't consume a buff or a shield.
    if (this.allyDamageBlocked && Fighter.nonAllyDepth === 0) return;
    // Online PvP: only relayed hits change our health — see `netAuthoritativeDamage`.
    if (this.netAuthoritativeDamage && !opts?.netApplied && !opts?.selfInflicted) return;
    // Divine perk Order: self-inflicted costs are refused outright.
    if (opts?.selfInflicted && this.selfDamageImmune) { this.onSelfDamageBlocked?.(amount); return; }
    // Myth's true damage: nothing on this side gets a say except invincibility itself.
    const trueDamage = !!opts?.trueDamage;
    // Clay's Fuse counts the hit and eats it whole — see `fuseHitAbsorber`.
    if (amount > 0 && !opts?.selfInflicted && !trueDamage && this.fuseHitAbsorber?.(amount, opts)) return;
    // Magic Mastery — Levitate: immune to damage from a source that hasn't moved in 3s.
    this.damageWasSelfInflicted = false;
    if (this.levitating && !trueDamage && opts?.source && opts.sourceX !== undefined && opts.sourceY !== undefined
        && isStationaryFor(opts.source, opts.sourceX, opts.sourceY, 3000)) return;
    // Cloth's Thick Skin artwork revokes the pierce flag outright, so every absorb layer below
    // gets to see the hit. Resolved once here rather than at each layer so they cannot disagree.
    // True damage is pierce that Thick Skin cannot revoke.
    const pierce = trueDamage || (!!opts?.pierce && !this.pierceImmune);
    if (!pierce && this.isInvincible) return;
    // Gold's Glittery Cloak: a hit that never finds the body in the glitter. Rolled on the body's
    // own machine (a replica's chance is always 0), so a relayed hit is dodged by the victim.
    if (!pierce && !opts?.selfInflicted && amount > 0 && this.goldCloakDodge > 0 && Math.random() < this.goldCloakDodge) {
      this.goldCloakDodges++;
      this.lastIncomingDamage = 0;
      return;
    }
    // Dream E+ — a dreamer who has dreamt themselves quicker. Same rules: the victim rolls.
    if (!pierce && !opts?.selfInflicted && amount > 0 && this.dreamLucidDodge > 0 && Math.random() < this.dreamLucidDodge) {
      this.lastIncomingDamage = 0;
      return;
    }
    // Wax Mastery — Smoke-out, then Honey Shell. Same rules as the cloak above: the victim rolls.
    if (!pierce && !opts?.selfInflicted && amount > 0 && this.waxSmokeDodge > 0 && Math.random() < this.waxSmokeDodge) {
      this.waxSmokeDodges++;
      this.lastIncomingDamage = 0;
      return;
    }
    if (!pierce && !opts?.selfInflicted && amount >= 30 && this.waxHoneyShell) {
      this.waxHoneyShell = false;
      this.waxHoneyShellPops++;
      this.lastIncomingDamage = 0;
      return;
    }

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
      let mitigation = trueDamage ? 1 : this.incomingDamageMultiplier * this.gauntletDamageTakenMult * this.bribeIncomingMult * this.smokeIncomingMult * this.cardDamageTakenMult * this.droneArmorMult * this.kineticShieldMult * this.steelShieldMult * this.empoweredIncomingMult * this.potionArmorMult * this.hopelessIncomingMult * this.justiceIncomingMult * this.magmaIncomingMult * this.waxIncomingMult * this.clayIncomingMult * this.conquestIncomingMult * this.passionIncomingMult * this.quantumIncomingMult * this.deathIncomingMult * this.journalIncomingMult * this.paperIncomingMult * this.psychicIncomingMult * this.bindIncomingMult * this.illusionIncomingMult * this.soundIncomingMult * this.artifactIncomingMult * this.clothIncomingMult * this.marrowIncomingMult * this.gluttonyIncomingMult * this.harvestIncomingMult * this.orderIncomingMult * this.wardIncomingMult * this.soulTankIncomingMult * this.bossWardIncomingMult * this.fortuneIncomingMult * this.dreamIncomingMult * this.duneIncomingMult * this.radiationIncomingMult * this.lifeIncomingMult * this.magicIncomingMult * this.mutationIncomingMult * this.mapArmorMult * this.starIncomingMult * this.earthBiomeIncomingMult * this.perkIncomingMult * this.paintIncomingMult * this.netDefenseMult;
      // Ruin's spikes turn armour inside out — 25% less damage taken comes back as 25% more.
      // Only a net *buff* is flipped; a fighter already taking extra damage is left alone.
      if (mitigation < 1 && this.scene.time.now < this.buffsInvertedUntil) mitigation = 2 - mitigation;
      // Quantum's Effect Split: everything riding on this body is running at half strength, so
      // whatever the product came out as is dragged halfway back to neutral. Applied after the
      // Ruin flip so a split armour buff is still a buff when the spikes turn it over.
      if (this.scene.time.now < this.effectSplitUntil) mitigation = 1 + (mitigation - 1) * 0.5;
      // Silence's Despress strips resistance a point at a time, but only resistance: it lifts a
      // reduction back toward neutral and never turns into a vulnerability of its own.
      const despress = this.activeDespressStacks();
      if (despress > 0 && mitigation < 1) mitigation = Math.min(1, mitigation + 0.1 * despress);
      // Casual Hoodie is conditional on how the hit arrived, so it sits outside the product
      // above rather than inside it — an ordinary shot must not pick it up.
      if (opts?.aoe || opts?.pierce) mitigation *= this.clothAoeMult;
      // Myth: pistol vulnerability stacks and the crowd's jeer, both plain amplifiers.
      mitigation *= this.mythIncomingMult();
      amount = Math.round(amount * mitigation * (trueDamage ? 1 : this.ruinIncomingMult));
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
      const flatReduction = trueDamage ? 0 : Math.max(this.flatDamageReduction, this.netFlatReduction);
      if (flatReduction > 0) {
        amount = Math.max(0, amount - flatReduction);
        if (amount <= 0) { this.lastIncomingDamage = 0; this.emit('damaged', 0); return; }
      }
      // Earth Mastery — Unbreakable: applied last so nothing upstream can push a hit back above the cap.
      const damageCap = this.hardDamageCap > 0 && this.netDamageCap > 0
        ? Math.min(this.hardDamageCap, this.netDamageCap)
        : Math.max(this.hardDamageCap, this.netDamageCap);
      if (damageCap > 0 && !trueDamage) amount = Math.min(amount, damageCap);
    }
    // In a menu you are distracted, not absent: hits land at 5% instead of being blocked
    // outright. Applied to relayed (netApplied) hits too — only the victim's sim knows a
    // menu is open. Pierce ignored the old menu invincibility, so it skips the cut as well.
    if (!pierce && this.menuGuards.size > 0 && amount > 0) {
      amount = Math.max(1, Math.round(amount * 0.05));
    }
    if (this.damageBudget >= 0 && amount > 0 && !trueDamage) {
      amount = Math.min(amount, Math.floor(this.damageBudget));
      this.damageBudget = Math.max(0, this.damageBudget - amount);
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
      if (amount > 0 && !opts?.selfInflicted) Fighter.creditUltDamage?.(this, amount);
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

    if (!pierce && this.damageAbsorber && this.damageAbsorber(amount)) return;
    if (!pierce && this.relicAbsorbers.length > 0 && this.relicAbsorbers.some((f) => f(amount))) return;

    if (!pierce && this.shieldCharges > 0) {
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

    if (!pierce && this.shieldHp > 0) {
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
    if (!pierce && this.weakHp > 0) {
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

    // Harvest: Corrupt HP soaks like weak HP, and tells the kit who it was soaking.
    if (!pierce && this.corruptHp > 0) {
      const absorbed = Math.min(this.corruptHp, amount);
      this.corruptHp -= absorbed;
      amount -= absorbed;
      if (absorbed > 0) {
        Sfx.playAt('shield-absorb', this.x, { rate: 0.7, volume: 0.8 });
        this.onCorruptAbsorb?.(absorbed, opts);
      }
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
    if (!pierce && this.clottedHp > 0) {
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

    // Cloth F (Pin Cushion): Pinned HP is spent before normal HP, and spent *faster* than the
    // damage it soaks — 10 through the pins costs 12.5 of them at the default 1.25 rate. That is
    // the whole trade: the pool is worse health, bought back by the share of it thrown at the
    // attacker in `onPinnedAbsorb`.
    if (!pierce && this.pinnedHp > 0) {
      const rate = Math.max(1, this.pinnedVulnMult);
      const spent = Math.min(this.pinnedHp, amount * rate);
      this.pinnedHp -= spent;
      amount = Math.max(0, amount - spent / rate);
      if (spent > 0) {
        Sfx.playAt('shield-absorb', this.x, { rate: 0.95, volume: 0.75 });
        this.onPinnedAbsorb?.(spent);
      }
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
    // `minHpFloor` is clamped to the current health first so it can only ever stop a fall,
    // never raise one — a floor applied to somebody already under it must not revive them.
    if (!this.immortal) this.hp = Math.max(Math.min(this.minHpFloor, this.hp), this.hp - amount);
    this.emit('damaged', amount);
    if (amount > 0 && !opts?.selfInflicted) Fighter.creditUltDamage?.(this, amount);
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

  /** Devotion Mastery: an aim angle after the Ark has had its say (see `gazeTurnRad`). */
  bendGaze(angle: number): number {
    if (this.gazeTurnRad === 0 || Date.now() >= this.gazeUntil) return angle;
    const diff = Phaser.Math.Angle.Wrap(Math.atan2(this.gazeY - this.y, this.gazeX - this.x) - angle);
    if (this.gazeTurnRad > 0) return angle + Math.sign(diff) * Math.min(Math.abs(diff), this.gazeTurnRad);
    if (Math.abs(diff) > GAZE_AVERT_CONE) return angle;
    return angle - (diff >= 0 ? 1 : -1) * -this.gazeTurnRad;
  }

  /** {@link bendGaze} for an aim point: the point swung round this fighter, distance kept. */
  bendGazePoint(x: number, y: number): { x: number; y: number } {
    if (this.gazeTurnRad === 0 || Date.now() >= this.gazeUntil) return { x, y };
    const d = Math.hypot(x - this.x, y - this.y);
    const a = this.bendGaze(Math.atan2(y - this.y, x - this.x));
    return { x: this.x + Math.cos(a) * d, y: this.y + Math.sin(a) * d };
  }

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
    if (!this.immortal) this.hp = Math.max(Math.min(this.minHpFloor, this.hp), this.hp - amount);
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
    if (this.isChargedUltimate(ability)) {
      if (this.ultCharge + 0.001 < this.ultCost(ability)) return false;
    } else if (now - (this.cooldowns.get(abilityId) ?? 0) < this.storedCooldown(abilityId, ability)) return false;
    this.notePress(abilityId);

    // Sound — Out of Tune: a quarter of presses misfire. The cooldown is paid, nothing is cast,
    // nothing is announced or relayed.
    if (now < this.outOfTuneUntil && Math.random() < 0.25) {
      this.cooldowns.set(abilityId, now);
      this.cooldownScales.set(abilityId, 1);
      this.spendUltCharge(abilityId);
      this.lastTuneMissAt = now;
      return false;
    }

    // Psychic (Opened Eyes): the press is real — it commits the cooldown here and now — but
    // the ability itself is handed to the kit to resolve two seconds later. Everything the
    // cast is *announced* by (the sound, the online relay, the Wrenched backfire) waits with
    // it, so the world only learns about the ability at the moment it actually happens.
    if (this.castDelayMs > 0 && this.queueDelayedCast) {
      this.cooldowns.set(abilityId, now);
      this.spendUltCharge(abilityId);
      // The cooldown is paid here, so this is where it is banked — never with a scale left over
      // from the last time this id was stamped.
      this.cooldownScales.set(abilityId, this.cooldownPenalty(abilityId));
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
    this.spendUltCharge(abilityId);
    // Quantum's Ability Split is spent here rather than at the press, so it lands on whatever
    // ability actually went off — including the charge-and-release ones that never reach
    // `castAbility`. Always written, never merely set, so an id that had a split last time
    // does not keep it.
    const exempt = this.splitExemptAbilities.has(abilityId);
    this.cooldownScales.set(abilityId, (exempt ? 1 : this.nextCastCooldownMult) * this.cooldownPenalty(abilityId));
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
      * this.amputationCooldownMult * this.deathDelayCooldownMult * this.dreamCooldownMult
      * this.justiceCooldownMult * this.perkCooldownMult * this.psychicCooldownMult * this.clothCooldownMult * this.goldCooldownMult * ultimateExtra;
  }

  /** As {@link effectiveCooldown}, including whatever split was banked when this id was stamped. */
  private storedCooldown(abilityId: string, ability: { cooldown: number; isUltimate?: boolean }): number {
    return this.effectiveCooldown(ability) * (this.cooldownScales.get(abilityId) ?? 1);
  }

  // ── Ultimate charge ───────────────────────────────────────────────

  /**
   * True when `ability` is an ultimate this fighter pays for in charge rather than time. A Q
   * with a near-zero cooldown already has a gate of its own (Growth's DNA, Time's bounty, the
   * Hunt beast's clock), and a few longer ones are charged by their own resource — those keep
   * the system they were built around.
   */
  isChargedUltimate(ability: { id?: string; cooldown: number; displayKey?: string }, id = ability.id): boolean {
    if (!this.ultChargeEnabled || this.netGhost) return false;
    if (ability.displayKey !== 'Q' || ability.cooldown < ULT_MIN_TIMER_MS) return false;
    return !id || !SELF_CHARGED_ULTIMATES.has(id);
  }

  /** {@link isChargedUltimate} by id, for the tray. Reads `ultExtraDefs` too. */
  isChargedUltimateId(abilityId: string): boolean {
    const ability = this.element.abilities.find((a) => a.id === abilityId)
      ?? this.ultExtraDefs.find((a) => a.id === abilityId);
    return !!ability && this.isChargedUltimate(ability);
  }

  /**
   * Points an ultimate costs: a flat 60 plus 6 for every second its cooldown used to run, so
   * a 20s ultimate is 180 and a 60s one 420. Scaled by every cooldown multiplier on the body.
   */
  ultCost(ability: { cooldown: number; isUltimate?: boolean }): number {
    const base = ULT_BASE_COST + ULT_COST_PER_SEC * (ability.cooldown / 1000);
    return ability.cooldown > 0 ? base * (this.effectiveCooldown(ability) / ability.cooldown) : base;
  }

  /** The bank never holds more than the dearest ultimate in reach — no saving up two casts. */
  private ultChargeCap(): number {
    let cap = 0;
    for (const a of this.element.abilities) if (this.isChargedUltimate(a)) cap = Math.max(cap, this.ultCost(a));
    for (const a of this.ultExtraDefs) if (this.isChargedUltimate(a)) cap = Math.max(cap, this.ultCost(a));
    return cap;
  }

  /** Bank `points` of ultimate charge (1 point = 1 damage dealt or taken). */
  addUltCharge(points: number): void {
    if (!this.ultChargeEnabled || this.netGhost || !(points > 0)) return;
    this.ultCharge = Math.min(this.ultChargeCap(), this.ultCharge + points);
  }

  /** Pay for `abilityId` out of the bank if it is a charged ultimate. */
  private spendUltCharge(abilityId: string): void {
    const ability = this.element.abilities.find((a) => a.id === abilityId);
    if (!ability || !this.isChargedUltimate(ability)) return;
    this.ultCharge = Math.max(0, this.ultCharge - this.ultCost(ability));
  }

  /** 0–1 progress toward affording `ability`. */
  private ultChargeRatio(ability: { cooldown: number; isUltimate?: boolean }): number {
    const cost = this.ultCost(ability);
    return cost <= 0 ? 1 : Math.min(1, this.ultCharge / cost);
  }

  /** The cooldown-shaped helpers below speak milliseconds; this is their exchange rate. */
  private ultPointsForMs(ability: { cooldown: number; isUltimate?: boolean }, ms: number): number {
    const eff = this.effectiveCooldown(ability);
    return eff > 0 ? (ms / eff) * this.ultCost(ability) : this.ultCost(ability);
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
    this.notePress(abilityId);
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
    this.notePress(abilityId);
    this.stampCast(abilityId);
  }

  /** Reduce remaining cooldown of an ability by byMs milliseconds (cannot make it readier than fully ready). */
  reduceCooldown(abilityId: string, byMs: number): void {
    const ult = this.element.abilities.find((a) => a.id === abilityId);
    if (ult && this.isChargedUltimate(ult)) { this.addUltCharge(this.ultPointsForMs(ult, byMs)); return; }
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
    this.spendUltCharge(abilityId);
  }

  /** Make an ability immediately ready (clears its cooldown). */
  resetCooldown(abilityId: string): void {
    this.cooldowns.set(abilityId, 0);
    const ult = this.element.abilities.find((a) => a.id === abilityId);
    if (ult && this.isChargedUltimate(ult)) this.ultCharge = Math.max(this.ultCharge, this.ultCost(ult));
  }

  /**
   * Every ability comes back at once (Air Mastery — Winds of Change). `exceptId` is the caster
   * itself: a refresh that swept up its own stamp would be a free infinite recast, so the
   * ability driving this always names itself and keeps the cooldown it just paid.
   */
  clearAllCooldowns(exceptId?: string): void {
    const kept = exceptId !== undefined ? this.cooldowns.get(exceptId) : undefined;
    this.cooldowns.clear();
    if (kept !== undefined) this.cooldowns.set(exceptId!, kept);
    const ult = this.element.abilities.find((a) => a.id !== exceptId && this.isChargedUltimate(a));
    if (ult) this.ultCharge = Math.max(this.ultCharge, this.ultCost(ult));
  }

  /**
   * Air (Spin Dance): pull every running cooldown forward by up to `ms`, and report how much
   * was actually taken off. The clamp matters — an ability with 400ms left can only give up
   * 400ms, and the mastery requirement counts *time removed*, not times pressed.
   */
  /**
   * The opposite of {@link reduceCooldowns}: push every ability still cooling `ms` further from
   * ready. Gold's Hex calls it every frame with half the frame, so the bars charge at half speed.
   */
  delayCooldowns(ms: number): void {
    if (ms <= 0) return;
    const now = Date.now();
    for (const [id, stamp] of this.cooldowns) {
      const ability = this.element.abilities.find((a) => a.id === id);
      if (!ability || this.isChargedUltimate(ability)) continue;
      if (this.storedCooldown(id, ability) - (now - stamp) <= 0) continue;
      this.cooldowns.set(id, Math.min(now, stamp + ms));
    }
  }

  /**
   * One ability's half of {@link delayCooldowns}: push it `ms` further from ready if it is still
   * cooling, never past "cast this instant". Paint's Yin-Yang slows only the bars it painted.
   */
  delayCooldown(abilityId: string, ms: number): void {
    if (ms <= 0) return;
    const stamp = this.cooldowns.get(abilityId);
    if (stamp === undefined) return;
    const ability = this.element.abilities.find((a) => a.id === abilityId);
    if (!ability || this.isChargedUltimate(ability)) return;
    const now = Date.now();
    if (this.storedCooldown(abilityId, ability) - (now - stamp) <= 0) return;
    this.cooldowns.set(abilityId, Math.min(now, stamp + ms));
  }

  reduceCooldowns(ms: number, exceptId?: string): number {
    const now = Date.now();
    let removed = 0;
    // A charged ultimate has no stamp to pull forward; the same milliseconds buy charge instead.
    const ult = this.element.abilities.find((a) => a.id !== exceptId && this.isChargedUltimate(a));
    if (ult && ms > 0) {
      const before = this.ultCharge;
      this.addUltCharge(this.ultPointsForMs(ult, ms));
      const cost = this.ultCost(ult);
      if (cost > 0) removed += ((this.ultCharge - before) / cost) * this.effectiveCooldown(ult);
    }
    for (const [id, stamp] of this.cooldowns) {
      if (id === exceptId) continue;
      const ability = this.element.abilities.find((a) => a.id === id);
      if (!ability) continue;
      if (this.isChargedUltimate(ability)) continue;
      const left = this.storedCooldown(id, ability) - (now - stamp);
      if (left <= 0) continue;
      const take = Math.min(ms, left);
      this.cooldowns.set(id, stamp - take);
      removed += take;
    }
    return removed;
  }

  /** Returns 0 = on cooldown, 1 = ready */
  /**
   * `def` is for a bar that belongs to an element this fighter is not currently wearing —
   * Unbound Quantum's tray carries five elements' cards at once, and only one of them is in
   * `this.element` at any moment.
   */
  getCooldownRatio(abilityId: string, def?: { cooldown: number; isUltimate?: boolean; displayKey?: string }): number {
    const ability = def ?? this.element.abilities.find((a) => a.id === abilityId);
    if (!ability) return 1;
    const elapsed = Date.now() - (this.cooldowns.get(abilityId) ?? 0);
    const ratio = this.isChargedUltimate(ability, abilityId)
      ? this.ultChargeRatio(ability)
      : Math.min(1, elapsed / this.storedCooldown(abilityId, ability));
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
    this.healthBar.update(this.x, this.y, this.hp, this.shieldHp, this.chargeRatio, this.clottedHp, this.weakHp, this.chargeColor, this.corruptHp);
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
