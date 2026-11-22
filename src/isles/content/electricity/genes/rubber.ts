import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Vulcanite — Rubber's gene tree.
 *
 * Rubber is all stretch: Rubber Punch from the hand (wound up on hold, launched on release —
 * the cooldown stamps on the release), Sling Shot (two arms to the walls, drag back, fly), Bounce
 * Form (3s as a reflecting plank that can cast nothing else), Rubber Banding (an anchor on a
 * band — the recall and the reel are free, only the plant stamps) and Rubberage (fifteen balls
 * ricocheting and speeding up for 10s). Three lines: **Knuckle** (the punch and the sling — rubber
 * that hits), **Stretch** (the band and your legs — rubber that gives) and **Rebound** (the
 * plank and the hide — rubber that sends it back).
 *
 * Punch casts are at least 350ms apart, so Knuckle's click window is 0.35s and never stacks.
 */
export const RUBBER_GENE_TREE: GeneTree = {
  element: 'rubber',
  name: 'Vulcanite',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a fist that lands like a snapped band across the knuckles. */
    gene({
      id: 'gene-rubber-snap-knuckles', name: 'Snap Knuckles', tier: 0, col: 0,
      text: 'Rubber Punch casts make the foe take +2% damage for 0.35s',
      maxLevel: 4, cost: linear(8, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 350 })),
      mastery: {
        name: 'Welt', cost: 18,
        text: 'Hits have a 12% chance to raise a welt: the foe is 20% slower for 1.5s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 4, action: 'slowEnemy', mult: 0.8, durationMs: 1500 }),
      },
    }),
    /** Identity root: you come off the sling still carrying some of its pull. */
    gene({
      id: 'gene-rubber-taut-line', name: 'Taut Line', tier: 0, col: 1,
      text: 'Sling Shot casts give +4% move speed for 3s',
      maxLevel: 4, cost: linear(8, 2),
      grant: cast('e', (lv) => ({ speedMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Second Wind-Up', cost: 18,
        text: 'Sling Shot casts have a 12% chance to come straight back — the arms never let go of the walls',
        grant: onCast('e', { refundSelfChance: 0.12 }),
      },
    }),
    /** Defence root: sulphur and heat, and a skin that gives instead of tearing. */
    gene({
      id: 'gene-rubber-vulcanized-hide', name: 'Vulcanized Hide', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(8, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Bounce Back', cost: 18,
        text: 'Reflect 5% of damage taken back at the attacker',
        grant: effect({ reflectFraction: 0.05 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Slingshot Knuckle: the launch softens them up for everything that follows it in. */
    gene({
      id: 'gene-rubber-slingshot-knuckle', name: 'Slingshot Knuckle', tier: 1, col: 0, needs: ['gene-rubber-snap-knuckles'],
      text: 'Sling Shot casts make the foe take +4% damage for 3s',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('e', (lv) => ({ damageMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Thrum', cost: 22,
        text: 'Sling Shot casts thrum the band: 16 to everything within 100px',
        grant: onCast('e', { burst: { damage: 16, radius: 100 } }),
      },
    }),
    /** Long Reach: every anchor you plant drags the rest of the kit back into reach. */
    gene({
      id: 'gene-rubber-long-reach', name: 'Long Reach', tier: 1, col: 1, needs: ['gene-rubber-taut-line'],
      text: 'Rubber Banding casts shave 500ms off every other cooldown',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('f', (lv) => ({ refundOthers: flat(500)(lv) })),
      mastery: {
        name: 'Anchor Weight', cost: 22,
        text: 'Planting an anchor braces you: 15 shield HP',
        grant: onCast('f', { shield: 15 }),
      },
    }),
    /** Rebound Form: the plank keeps a skin of give round you after it springs back. */
    gene({
      id: 'gene-rubber-rebound-form', name: 'Rebound Form', tier: 1, col: 2, needs: ['gene-rubber-vulcanized-hide'],
      text: 'Bounce Form casts give you 5 shield HP',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('r', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Spring Steel', cost: 22,
        text: 'When hit, a 20% chance to bounce it off: 14 to everything within 100px (at most every 4s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 4, action: 'burstAoe', amount: 14, radius: 100 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Hard Rubber: ebonite — the same stretch, a heavier strike. */
    gene({
      id: 'gene-rubber-hard-rubber', name: 'Hard Rubber', tier: 2, col: 0, needs: ['gene-rubber-slingshot-knuckle'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Ricochet', cost: 26,
        text: 'Hits have a 10% chance to bounce back for more: +12% damage for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 6, action: 'tempDamage', mult: 1.12, durationMs: 2000 }),
      },
    }),
    /** Give: legs that spring off the floor of the trampoline square. */
    gene({
      id: 'gene-rubber-give', name: 'Give', tier: 2, col: 1, needs: ['gene-rubber-long-reach'],
      text: '+2% move speed',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ speedMult: gain(0.02)(lv) })),
      mastery: {
        name: 'Pogo', cost: 26,
        text: 'Every 7s you hit the floor just right: +25% move speed for 2s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 7, action: 'tempHaste', mult: 1.25, durationMs: 2000 }),
      },
    }),
    /** Shock Absorber: every blow sinks in, and some of it comes back out. */
    gene({
      id: 'gene-rubber-shock-absorber', name: 'Shock Absorber', tier: 2, col: 2, needs: ['gene-rubber-rebound-form'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Tyre Wall', cost: 26,
        text: 'Start every fight behind a 20 HP stack of tyres',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Screensaver: fifteen balls, ten seconds, and nowhere in the room the foe can stand easy. */
    gene({
      id: 'gene-rubber-screensaver', name: 'Screensaver', tier: 3, col: 0, needs: ['gene-rubber-hard-rubber'],
      text: 'Rubberage casts make the foe take +6% damage for the 10s the balls fly',
      maxLevel: 3, cost: linear(16, 4),
      grant: cast('q', (lv) => ({ damageMult: gain(0.06)(lv), ms: 10000 })),
      mastery: {
        name: 'Super Ball', cost: 32,
        text: 'Rubberage casts burst off you before the balls scatter: 22 to everything within 140px',
        grant: onCast('q', { burst: { damage: 22, radius: 140 } }),
      },
    }),
    /** Snapback: crosses Knuckle and Stretch — three seconds as a plank, and the kit comes back loaded. */
    gene({
      id: 'gene-rubber-snapback', name: 'Snapback', tier: 3, col: 1,
      needs: ['gene-rubber-give', 'gene-rubber-hard-rubber'],
      text: 'Bounce Form casts shave 600ms off every other cooldown — they come back while you cannot use them',
      maxLevel: 4, cost: linear(13, 4),
      grant: cast('r', (lv) => ({ refundOthers: flat(600)(lv) })),
      mastery: {
        name: 'Elastic Recovery', cost: 34,
        text: '+1 HP regenerated every second — every dent pops back out',
        grant: effect({ regenPerSecond: 1 }),
      },
    }),
    /** Inner Tube: the balls go out and the air comes back into you. */
    gene({
      id: 'gene-rubber-inner-tube', name: 'Inner Tube', tier: 3, col: 2, needs: ['gene-rubber-shock-absorber'],
      text: 'Rubberage casts heal 6 HP',
      maxLevel: 3, cost: linear(16, 4),
      grant: cast('q', (lv) => ({ heal: flat(6)(lv) })),
      mastery: {
        name: 'Uncrushable', cost: 32,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more twist in the band before you let go. */
    enlightened({
      id: 'gene-rubber-enl-twist', name: 'Enlightened Twist', col: 0, needs: ['gene-rubber-screensaver'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the spring returns a little quicker every season. */
    enlightened({
      id: 'gene-rubber-enl-spring', name: 'Enlightened Spring', col: 1, needs: ['gene-rubber-snapback'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more coat of latex. */
    enlightened({
      id: 'gene-rubber-enl-latex', name: 'Enlightened Latex', col: 2, needs: ['gene-rubber-inner-tube'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
