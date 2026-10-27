import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Bloodtrail — Hunt's gene tree.
 *
 * Hunt is three forms on one set of keys, and gene rules key off the KEY, so every slot rule here
 * names what it means in each: Click is Crossbow Shot / Slash / Shotgun Blast, E is Blast /
 * Pounce / Tactical Roll, R is Grenade / Roar / Hook, F is Scent Trail / Grapple / Adrenaline,
 * Q is Blood Scent (the beast's ultimate; Release the Beast is a timer, not a cast) / Give In.
 * The three trails: **Quarry** (bolts and claws — opening the foe, barbs that bleed), **Snare**
 * (the trail and the traps — speed off the scent, R coming round) and **Pelt** (hide, scars and
 * the cornered animal that bites back).
 *
 * The beast's Slash and Blast both fire every 400ms, so the Click and E windows are 0.4s.
 */
export const HUNT_GENE_TREE: GeneTree = {
  element: 'hunt',
  name: 'Bloodtrail',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a broadhead bolt, a hooked claw — the wound opens wider. */
    gene({
      id: 'gene-hunt-broadhead', name: 'Broadhead', tier: 0, col: 0,
      text: 'Click casts (Crossbow, Slash, Shotgun) make the foe take +2% damage for 0.4s',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 400 })),
      mastery: {
        name: 'Deadeye', cost: 12,
        text: '+5% crit chance',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Identity root: you run the quarry's own blood down. */
    gene({
      id: 'gene-hunt-scent-hound', name: 'Scent Hound', tier: 0, col: 1,
      text: 'F casts (Scent Trail, Grapple, Adrenaline) give +6% move speed for 3s',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('f', (lv) => ({ speedMult: gain(0.06)(lv), ms: 3000 })),
      mastery: {
        name: 'Fresh Spoor', cost: 12,
        text: 'F casts have a 15% chance to come straight back off cooldown',
        grant: onCast('f', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: a hide coat over the hunter and fur on the beast. */
    gene({
      id: 'gene-hunt-hide-coat', name: 'Hide Coat', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(5, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Winter Pelt', cost: 12,
        text: 'Start every fight under a 20 HP shield of matted fur',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Point Blank: the shotgun or the pounce, close enough to smell. */
    gene({
      id: 'gene-hunt-point-blank', name: 'Point Blank', tier: 1, col: 0, needs: ['gene-hunt-broadhead'],
      text: 'E casts (Blast, Pounce, Roll) make the foe take +3% damage for 0.4s',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 400 })),
      mastery: {
        name: 'Rending Claws', cost: 16,
        text: 'Hits have a 12% chance to tear a wound that bleeds 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Snare Line: a set trap frees the hands for the rest of the kit. */
    gene({
      id: 'gene-hunt-snare-line', name: 'Snare Line', tier: 1, col: 1, needs: ['gene-hunt-scent-hound'],
      text: 'R casts (Grenade, Roar, Hook) shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('r', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Shrapnel', cost: 16,
        text: 'R casts throw a shockwave off you: 14 to everything within 110px',
        grant: onCast('r', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Scarred: every old wound left the hide thicker. */
    gene({
      id: 'gene-hunt-scarred', name: 'Scarred', tier: 1, col: 2, needs: ['gene-hunt-hide-coat'],
      text: '+12 max HP',
      maxLevel: 4, cost: linear(6, 3),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Cornered Animal', cost: 16,
        text: 'When hit, a 15% chance to turn on the attacker: +15% damage for 3s (at most every 8s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 8, action: 'tempDamage', mult: 1.15, durationMs: 3000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Apex: top of the island's food chain. */
    gene({
      id: 'gene-hunt-apex', name: 'Apex', tier: 2, col: 0, needs: ['gene-hunt-point-blank'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Feeding', cost: 20,
        text: '4% of the damage you deal comes back to you as health',
        grant: effect({ lifestealFrac: 0.04 }),
      },
    }),
    /** Musk: Roar's slow and every bleed cling to the quarry. */
    gene({
      id: 'gene-hunt-musk', name: 'Musk', tier: 2, col: 1, needs: ['gene-hunt-snare-line'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Restless Beast', cost: 20,
        text: 'Every 10s the beast in you paces: +15% move speed for 3s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'tempHaste', mult: 1.15, durationMs: 3000 }),
      },
    }),
    /** Hunter's Leathers: oiled, stitched and quiet. */
    gene({
      id: 'gene-hunt-leathers', name: 'Hunter\'s Leathers', tier: 2, col: 2, needs: ['gene-hunt-scarred'],
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Into the Brush', cost: 20,
        text: '+5% dodge chance',
        grant: effect({ dodgeChance: 0.05 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Blood Moon: the frenzy comes round sooner. */
    gene({
      id: 'gene-hunt-blood-moon', name: 'Blood Moon', tier: 3, col: 0, needs: ['gene-hunt-apex'],
      text: '−5% ultimate cooldown (Blood Scent)',
      maxLevel: 3, cost: linear(13, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Frenzy', cost: 26,
        text: 'Q casts (Blood Scent, Give In) make the foe take +20% damage for the 8s of frenzy',
        grant: onCast('q', { damageMult: 1.2, ms: 8000 }),
      },
    }),
    /** Field Dressing: crosses Quarry and Snare — the hunter binds a wound between chases. */
    gene({
      id: 'gene-hunt-field-dressing', name: 'Field Dressing', tier: 3, col: 1,
      needs: ['gene-hunt-musk', 'gene-hunt-apex'],
      text: 'F casts (Scent Trail, Grapple, Adrenaline) heal 4 HP',
      maxLevel: 4, cost: linear(10, 4),
      grant: cast('f', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Lick the Wound', cost: 28,
        text: 'Once per fight, a lethal hit is cancelled and you get back up snarling at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Last Stand: the animal is most dangerous wounded. */
    gene({
      id: 'gene-hunt-last-stand', name: 'Last Stand', tier: 3, col: 2, needs: ['gene-hunt-leathers'],
      text: 'The first time you fall below 30% HP, heal 12',
      maxLevel: 3, cost: linear(13, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: flat(12)(lv) }] })),
      mastery: {
        name: 'Old Boar', cost: 26,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more notch on the crossbow stock. */
    enlightened({
      id: 'gene-hunt-enl-notch', name: 'Enlightened Notch', col: 0, needs: ['gene-hunt-blood-moon'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the trail you never quite lose. */
    enlightened({
      id: 'gene-hunt-enl-trail', name: 'Enlightened Trail', col: 1, needs: ['gene-hunt-field-dressing'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more scar, forever. */
    enlightened({
      id: 'gene-hunt-enl-scar', name: 'Enlightened Scar', col: 2, needs: ['gene-hunt-last-stand'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
