import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Firmament — Astra's gene tree.
 *
 * Astra shoots level: Starstruck (four solar shots straight left or right), Solar Flares (a plus
 * then an X of beams from her body), Celestial Smite (lightning on whoever is nearest the top of
 * the screen — her too), Worm Warp (a wormhole that swaps her with whoever it hits) and True Self —
 * the 8-second Star Trial, a stability bar that rises with damage dealt and falls with damage taken;
 * pass it to become the star and aim freely, fail it and Q is gone for the fight. The tree has three
 * lines: **Sunfire** (the shots and the flares), **Wormhole** (the warp and the smite — tempo) and
 * **Stability** (everything that keeps the trial's bar from emptying).
 *
 * Starstruck fires every 750ms, so its window is 0.75s and never stacks on itself.
 */
export const ASTRA_GENE_TREE: GeneTree = {
  element: 'astra',
  name: 'Firmament',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: four shots of sunlight, and the foe is dazzled between them. */
    gene({
      id: 'gene-astra-solar-wind', name: 'Solar Wind', tier: 0, col: 0,
      text: 'Starstruck casts make the foe take +2% damage for 0.75s',
      maxLevel: 4, cost: linear(6, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 750 })),
      mastery: {
        name: 'Sunspot', cost: 14,
        text: 'Hits have a 10% chance to leave a sunspot burning on the foe: 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Identity root: the wormhole folds your timetable as well as the space. */
    gene({
      id: 'gene-astra-wormlight', name: 'Wormlight', tier: 0, col: 1,
      text: 'Worm Warp casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: linear(6, 2),
      grant: cast('f', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Folded Space', cost: 14,
        text: 'Worm Warp casts have a 15% chance to come straight back — the far end opened early',
        grant: onCast('f', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: a corona that burns off a little of every blow — the bar falls slower. */
    gene({
      id: 'gene-astra-corona-veil', name: 'Corona Veil', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(6, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Fixed Star', cost: 14,
        text: 'Start every fight behind a 20 HP shield of starlight',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Flare Season: both blasts erupt inside half a second — be under them when they do. */
    gene({
      id: 'gene-astra-flare-season', name: 'Flare Season', tier: 1, col: 0, needs: ['gene-astra-solar-wind'],
      text: 'Solar Flares casts make the foe take +4% damage for 1.5s — through the plus and the X',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('e', (lv) => ({ damageMult: gain(0.04)(lv), ms: 1500 })),
      mastery: {
        name: 'Coronal Mass', cost: 18,
        text: 'Solar Flares casts throw off a shell of plasma: 14 to everything within 110px',
        grant: onCast('e', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Slingshot Orbit: you come out of the wormhole still carrying its speed. */
    gene({
      id: 'gene-astra-slingshot-orbit', name: 'Slingshot Orbit', tier: 1, col: 1, needs: ['gene-astra-wormlight'],
      text: 'Worm Warp casts make you 10% faster for 2s',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('f', (lv) => ({ speedMult: gain(0.1)(lv), ms: 2000 })),
      mastery: {
        name: 'Dark Lightning', cost: 18,
        text: 'Celestial Smite casts shave 1s off every other cooldown',
        grant: onCast('r', { refundOthers: 1000 }),
      },
    }),
    /** Grounded: the Smite strikes whoever is highest — sometimes that is you. */
    gene({
      id: 'gene-astra-grounded', name: 'Grounded', tier: 1, col: 2, needs: ['gene-astra-corona-veil'],
      text: 'Celestial Smite casts give you 5 shield HP — in case the bolt picks you',
      maxLevel: 4, cost: linear(7, 3),
      grant: cast('r', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Parallax', cost: 18,
        text: '+5% dodge chance — you are never quite where the light says you are',
        grant: effect({ dodgeChance: 0.05 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Magnitude: a brighter star, measured from the summit. */
    gene({
      id: 'gene-astra-magnitude', name: 'Magnitude', tier: 2, col: 0, needs: ['gene-astra-flare-season'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'First Magnitude', cost: 22,
        text: '+5% crit chance — the brightest light in the sky',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Sidereal Day: the sky turns four minutes faster than the sun. */
    gene({
      id: 'gene-astra-sidereal-day', name: 'Sidereal Day', tier: 2, col: 1, needs: ['gene-astra-slingshot-orbit'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Conjunction', cost: 22,
        text: 'Every 10s two planets meet overhead: +15% damage for 3s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'tempDamage', mult: 1.15, durationMs: 3000 }),
      },
    }),
    /** Starlight: old light still arriving, a little at a time. */
    gene({
      id: 'gene-astra-starlight', name: 'Starlight', tier: 2, col: 2, needs: ['gene-astra-grounded'],
      text: '+0.25 HP regenerated every second',
      maxLevel: 4, cost: linear(9, 3),
      grant: stat((lv) => ({ regenPerSecond: flat(0.25)(lv) })),
      mastery: {
        name: 'Binary Star', cost: 22,
        text: 'When hit, a 15% chance for your twin to flare between you — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Brighter Star: the trial calls you again sooner. */
    gene({
      id: 'gene-astra-brighter-star', name: 'Brighter Star', tier: 3, col: 0, needs: ['gene-astra-magnitude'],
      text: '−5% True Self (ultimate) cooldown',
      maxLevel: 3, cost: linear(14, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Supernova', cost: 28,
        text: 'True Self casts flare the star out of you: 20 to everything within 130px — a head start on the bar',
        grant: onCast('q', { burst: { damage: 20, radius: 130 } }),
      },
    }),
    /** Constellation: crosses Sunfire and Wormhole — every flare joins the dots back to you. */
    gene({
      id: 'gene-astra-constellation', name: 'Constellation', tier: 3, col: 1,
      needs: ['gene-astra-sidereal-day', 'gene-astra-magnitude'],
      text: 'Solar Flares casts heal 3 HP',
      maxLevel: 4, cost: linear(11, 4),
      grant: cast('e', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Rekindled', cost: 30,
        text: 'Once per fight, a lethal hit is cancelled and you burn back to life at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Trial by Fire: a shield to hold the stability bar up while it climbs. */
    gene({
      id: 'gene-astra-trial-by-fire', name: 'Trial by Fire', tier: 3, col: 2, needs: ['gene-astra-starlight'],
      text: 'True Self casts give you 8 shield HP for the Star Trial',
      maxLevel: 3, cost: linear(14, 4),
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'White Dwarf', cost: 28,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more photon in every shot. */
    enlightened({
      id: 'gene-astra-enl-photon', name: 'Enlightened Photon', col: 0, needs: ['gene-astra-brighter-star'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the night sky turning, a hair faster each time round. */
    enlightened({
      id: 'gene-astra-enl-precession', name: 'Enlightened Precession', col: 1, needs: ['gene-astra-constellation'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more spark in the star inside you. */
    enlightened({
      id: 'gene-astra-enl-heart', name: 'Enlightened Heart', col: 2, needs: ['gene-astra-trial-by-fire'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
