import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Heliograph — Light's gene tree.
 *
 * Light is a racer: hold Click to fold into car-mode behind the Light Lance, Blink to snap the
 * heading, Prism Ramps (five, permanent) that boost you and split three lances out of the glass,
 * Light Trick's one-second pop that kicks the car forward, and Supernova — stop dead and pour the
 * speed into a wall-to-wall beam. The tree has three panes: **Prism** (the ramps, their lances
 * and the beam — light that cuts), **Glare** (the Trick and the cooldowns coming round — light
 * that flickers) and **Corona** (mirror, lead glass and the stillness of the beam — light that
 * holds).
 *
 * Keyed only to what reports a cast: Light Lance never does (no cooldown, no cast — it is a
 * held state), and neither does Blink (charges spent inside the kit, never stamped), so no node
 * pays on Click or E. Light Trick re-arms every second, so its window is exactly 1s and can
 * never stack on itself. No move-speed node either: the car writes its own velocity every frame,
 * so a speed multiplier would do nothing while you drive.
 */
export const LIGHT_GENE_TREE: GeneTree = {
  element: 'light',
  name: 'Heliograph',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a prism set down on the road, and everything beyond it in the spectrum. */
    gene({
      id: 'gene-light-refraction', name: 'Refraction', tier: 0, col: 0,
      text: 'Prism Ramp casts make the foe take +3% damage for 4s — long enough to ride it',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('r', (lv) => ({ damageMult: gain(0.03)(lv), ms: 4000 })),
      mastery: {
        name: 'Spectrum Split', cost: PRICE.rootMastery,
        text: 'Prism Ramp casts throw a ring of split colour off you: 16 to everything within 100px',
        grant: onCast('r', { burst: { damage: 16, radius: 100 } }),
      },
    }),
    /** Identity root: every flash of the Trick winds the Heliostat's clockwork a notch. */
    gene({
      id: 'gene-light-flashbulb', name: 'Flashbulb', tier: 0, col: 1,
      text: 'Light Trick casts shave 40ms off every other cooldown — it re-arms every second',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('f', (lv) => ({ refundOthers: flat(40)(lv) })),
      mastery: {
        name: 'Sunlamp', cost: PRICE.rootMastery,
        text: 'Light Trick casts heal 1 HP — a second of warm light on the skin',
        grant: onCast('f', { heal: 1 }),
      },
    }),
    /** Defence root: a racer's goggles, ground from the same lead glass as the Tribunal windows. */
    gene({
      id: 'gene-light-lead-glass', name: 'Lead Glass', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Dazzle', cost: PRICE.rootMastery,
        text: 'Untouchable for the first 1.5s of every fight — nobody can look straight at you yet',
        grant: effect({ invincibleMs: 1500 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Focal Point: the whole beam narrows to one burning spot on the foe. */
    gene({
      id: 'gene-light-focal-point', name: 'Focal Point', tier: 1, col: 0, needs: ['gene-light-refraction'],
      text: 'Supernova casts make the foe take +4% damage for 6s — the longest beam top speed buys',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('q', (lv) => ({ damageMult: gain(0.04)(lv), ms: 6000 })),
      mastery: {
        name: 'Burning Glass', cost: PRICE.t1Mastery,
        text: 'Supernova casts flash white where you stop dead: 24 to everything within 140px',
        grant: onCast('q', { burst: { damage: 24, radius: 140 } }),
      },
    }),
    /** Afterglow: the pop of the Trick leaves the foe blinking for exactly as long as it re-arms. */
    gene({
      id: 'gene-light-afterglow', name: 'Afterglow', tier: 1, col: 1, needs: ['gene-light-flashbulb'],
      text: 'Light Trick casts make the foe take +2% damage for 1s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ damageMult: gain(0.02)(lv), ms: 1000 })),
      mastery: {
        name: 'Second Prism', cost: PRICE.t1Mastery,
        text: 'Prism Ramp casts have a 15% chance to come straight back — a spare pane in the case',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Mirror Coat: setting a prism down silvers your own skin for a moment. */
    gene({
      id: 'gene-light-mirror-coat', name: 'Mirror Coat', tier: 1, col: 2, needs: ['gene-light-lead-glass'],
      text: 'Prism Ramp casts give you 5 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ shield: flat(5)(lv) })),
      mastery: {
        name: 'Glare Back', cost: PRICE.t1Mastery,
        text: 'When hit, a 15% chance to flash the attacker\'s eyes: 30% slower for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'slowEnemy', mult: 0.7, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Hot Spot: every lance a little nearer white. */
    gene({
      id: 'gene-light-hot-spot', name: 'Hot Spot', tier: 2, col: 0, needs: ['gene-light-focal-point'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Caustics', cost: PRICE.t2Mastery,
        text: 'Hits have a 10% chance to leave a dancing caustic that burns 10 over 3s (at most every 3s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 3, action: 'sear', amount: 10, durationMs: 3000 }),
      },
    }),
    /** Clockwork Crown: the mirrors on the summit tilt a hair faster for you. */
    gene({
      id: 'gene-light-clockwork-crown', name: 'Clockwork Crown', tier: 2, col: 1, needs: ['gene-light-afterglow'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Noon Gun', cost: PRICE.t2Mastery,
        text: 'Every 9s the noon gun fires and every cooldown skips 0.6s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 9, action: 'cooldownRefund', amount: 600 }),
      },
    }),
    /** Mirrored Plate: what is thrown at a mirror comes back at the thrower. */
    gene({
      id: 'gene-light-mirrored-plate', name: 'Mirrored Plate', tier: 2, col: 2, needs: ['gene-light-mirror-coat'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Silver Backing', cost: PRICE.t2Mastery,
        text: 'When hit, a 15% chance to re-silver: a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Solar Flare: the star is ready to go out again sooner. */
    gene({
      id: 'gene-light-solar-flare', name: 'Solar Flare', tier: 3, col: 0, needs: ['gene-light-hot-spot'],
      text: '−5% Supernova (ultimate) cooldown',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Corona', cost: PRICE.t3Mastery,
        text: '+5% crit chance — the rim of the sun is the hottest part',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Total Reflection: crosses Prism and Glare — the glass that sends back everything it is given. */
    gene({
      id: 'gene-light-total-reflection', name: 'Total Reflection', tier: 3, col: 1,
      needs: ['gene-light-clockwork-crown', 'gene-light-hot-spot'],
      text: 'Prism Ramp casts heal 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('r', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Second Sunrise', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you rise again at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Eclipse Glass: the moment you stop dead to beam is the moment you are hardest to hurt. */
    gene({
      id: 'gene-light-eclipse-glass', name: 'Eclipse Glass', tier: 3, col: 2, needs: ['gene-light-mirrored-plate'],
      text: 'Supernova casts give you 8 shield HP — the car is parked and the glass is up',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Unblinking', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the lens ground one hair finer, forever. */
    enlightened({
      id: 'gene-light-enl-lens', name: 'Enlightened Lens', col: 0, needs: ['gene-light-solar-flare'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: one more tooth on the Heliostat's gear train. */
    enlightened({
      id: 'gene-light-enl-gear', name: 'Enlightened Gear', col: 1, needs: ['gene-light-total-reflection'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more layer of silver on the back of the glass. */
    enlightened({
      id: 'gene-light-enl-silver', name: 'Enlightened Silver', col: 2, needs: ['gene-light-eclipse-glass'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
