import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Lullaby — Dream's gene tree.
 *
 * Dream is the sandman: Sandmen (two little guns, held, bucking with every shot), Pillow Fight and
 * Sleep Tight to pile drowsiness on until the foe drops asleep, Delve to step into a sleeper's
 * dream and fight them there, and Nightmare to blind and terrify anyone 50% drowsy. The tree has
 * three lines: **Guns** (aim through the kick — crits, then the Nightmare), **Lull** (the pillow and
 * the delve — tempo) and **Featherbed** (the dagger's leech and a warm, thick quilt).
 *
 * Sandmen fires every 125ms while held — no window or heal is hung on the click, it would stack
 * eight deep. A sleeper takes no damage, so the offence here leans on crits and the Nightmare, not
 * on bursts the pillow would waste.
 */
export const DREAM_GENE_TREE: GeneTree = {
  element: 'dream',
  name: 'Lullaby',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: the guns buck, and a steady hand drags them back onto the head. */
    gene({
      id: 'gene-dream-steady-hands', name: 'Steady Hands', tier: 0, col: 0,
      text: '+1% crit chance',
      maxLevel: 4, cost: linear(6, 2),
      grant: stat((lv) => ({ critChance: flat(0.01)(lv) })),
      mastery: {
        name: 'Hollow Point', cost: 14,
        text: 'Crits hit for 2.3× instead of 2×',
        grant: effect({ critMult: 2.3 }),
      },
    }),
    /** Identity root: a pillow to the face, and the rest of the bedtime routine comes sooner. */
    gene({
      id: 'gene-dream-feather-pillow', name: 'Feather Pillow', tier: 0, col: 1,
      text: 'Pillow Fight casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(6, 2),
      grant: cast('r', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Pillow Pile', cost: 14,
        text: 'Pillow Fight casts have a 15% chance to come straight back — there was another on the bed',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: down from the dream-sheep that graze the cloud pastures. */
    gene({
      id: 'gene-dream-eiderdown', name: 'Eiderdown', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(6, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Night-Light', cost: 14,
        text: 'Untouchable for the first 2s of every fight — you are still half in a dream',
        grant: effect({ invincibleMs: 2000 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Bad Dream: the Nightmare's terror runs deeper than its own +25%. */
    gene({
      id: 'gene-dream-bad-dream', name: 'Bad Dream', tier: 1, col: 0, needs: ['gene-dream-steady-hands'],
      text: 'Nightmare casts make the foe take a further +5% damage for its 3s',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('q', (lv) => ({ damageMult: gain(0.05)(lv), ms: 3000 })),
      mastery: {
        name: 'Night Terror', cost: 18,
        text: 'Nightmare casts let out a scream around you: 18 to everything within 130px',
        grant: onCast('q', { burst: { damage: 18, radius: 130 } }),
      },
    }),
    /** Sleepwalk: you go into the dream light on your feet. */
    gene({
      id: 'gene-dream-sleepwalk', name: 'Sleepwalk', tier: 1, col: 1, needs: ['gene-dream-feather-pillow'],
      text: 'Delve casts make you 10% faster for 4s',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('e', (lv) => ({ speedMult: gain(0.1)(lv), ms: 4000 })),
      mastery: {
        name: 'Lucid', cost: 18,
        text: 'Delve casts shave 1.5s off every other cooldown — in a dream you know what comes next',
        grant: onCast('e', { refundOthers: 1500 }),
      },
    }),
    /** Warm Milk: the dagger's sleepy poison goes down easier for the one who throws it. */
    gene({
      id: 'gene-dream-warm-milk', name: 'Warm Milk', tier: 1, col: 2, needs: ['gene-dream-eiderdown'],
      text: 'Sleep Tight casts heal 3 HP',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('f', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Yawn', cost: 18,
        text: 'When hit, a 20% chance to set the attacker yawning: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Recoil Spring: the kick that bucks the gun goes into the round instead. */
    gene({
      id: 'gene-dream-recoil-spring', name: 'Recoil Spring', tier: 2, col: 0, needs: ['gene-dream-bad-dream'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Two in the Chamber', cost: 22,
        text: 'Hits have a 6% chance to load a heavy round: +25% damage for 3s (at most every 6s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.06, cooldownSec: 6, action: 'tempDamage', mult: 1.25, durationMs: 3000 }),
      },
    }),
    /** Counting Sheep: each one over the fence a little quicker. */
    gene({
      id: 'gene-dream-counting-sheep', name: 'Counting Sheep', tier: 2, col: 1, needs: ['gene-dream-sleepwalk'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Lullaby Bell', cost: 22,
        text: 'Every 10s the bell tolls the hour for sleepers: heal 6',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'healBurst', amount: 6 }),
      },
    }),
    /** Down Quilt: thick enough that a blow has to find you first. */
    gene({
      id: 'gene-dream-down-quilt', name: 'Down Quilt', tier: 2, col: 2, needs: ['gene-dream-warm-milk'],
      text: '+6 max HP',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ maxHp: flat(6)(lv) })),
      mastery: {
        name: 'Tossing and Turning', cost: 22,
        text: 'When hit, a 15% chance to roll over into the quilt — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Recurring Dream: the same nightmare, sooner every night. */
    gene({
      id: 'gene-dream-recurring-dream', name: 'Recurring Dream', tier: 3, col: 0, needs: ['gene-dream-recoil-spring'],
      text: '−5% Nightmare (ultimate) cooldown',
      maxLevel: 3, cost: linear(14, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Something Under the Bed', cost: 28,
        text: 'Nightmare casts make the foe take +20% damage for 5s — it does not leave when the lights come on',
        grant: onCast('q', { damageMult: 1.2, ms: 5000 }),
      },
    }),
    /** Dreamcatcher: crosses Guns and Lull — every pillow catches a good dream for you. */
    gene({
      id: 'gene-dream-dreamcatcher', name: 'Dreamcatcher', tier: 3, col: 1,
      needs: ['gene-dream-counting-sheep', 'gene-dream-recoil-spring'],
      text: 'Pillow Fight casts heal 2 HP',
      maxLevel: 4, cost: linear(11, 4),
      grant: cast('r', (lv) => ({ heal: flat(2)(lv) })),
      mastery: {
        name: 'Wake Up Gasping', cost: 30,
        text: 'Once per fight, a lethal hit is cancelled — it was only a dream — and you wake at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Pillow Fort: the dagger thrown from behind a wall of cushions. */
    gene({
      id: 'gene-dream-pillow-fort', name: 'Pillow Fort', tier: 3, col: 2, needs: ['gene-dream-down-quilt'],
      text: 'Sleep Tight casts give you 5 shield HP',
      maxLevel: 3, cost: linear(14, 4),
      grant: cast('f', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Sound Asleep', cost: 28,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more grain of sand in every round. */
    enlightened({
      id: 'gene-dream-enl-sand', name: 'Enlightened Sand', col: 0, needs: ['gene-dream-recurring-dream'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: a night that passes a little faster every time. */
    enlightened({
      id: 'gene-dream-enl-night', name: 'Enlightened Night', col: 1, needs: ['gene-dream-dreamcatcher'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more feather in the pillow. */
    enlightened({
      id: 'gene-dream-enl-feather', name: 'Enlightened Feather', col: 2, needs: ['gene-dream-pillow-fort'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
