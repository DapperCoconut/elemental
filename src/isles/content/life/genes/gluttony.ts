import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Birchmark — Wood's gene tree (element id `gluttony`).
 *
 * Wood is a birch ent living on Sap HP: Carverang loops out and back, Oakbrew turns health into
 * sap behind 15% less damage, Commensalism steps you out of the arena's ringing birches, Digest
 * turns the last five seconds' beating into sap and health, and Final Harvest's scythe kills
 * outright anything you out-health by 60%. The tree grows three rings: **Carving** (the
 * boomerang and the scythe — every pass opens the foe), **Hollows** (Commensalism and the
 * watching birches — stepping out quicker, armoured in fresh sapwood) and **Heartrot** (Oakbrew
 * and Digest — bark, tannin and a gut that turns a beating into a meal).
 *
 * Gene grants cannot write Sap HP itself, so the sap-flavoured nodes grant ordinary shield HP,
 * which the ent spends the same way — before health. Carverang throws every 650ms, so its window
 * is 0.6s.
 */
export const WOOD_GENE_TREE: GeneTree = {
  element: 'gluttony',
  name: 'Birchmark',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: a whittled edge on the boomerang that catches on the way past. */
    gene({
      id: 'gene-wood-whittled-edge', name: 'Whittled Edge', tier: 0, col: 0,
      text: 'Carverang casts make the foe take +2% damage for 0.6s',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 600 })),
      mastery: {
        name: 'Sticky Grain', cost: 12,
        text: 'Hits have a 10% chance to gum the foe with sap: 20% slower for 1.5s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 4, action: 'slowEnemy', mult: 0.8, durationMs: 1500 }),
      },
    }),
    /** Identity root: stepping out of a birch with the root-run still in your legs. */
    gene({
      id: 'gene-wood-root-walk', name: 'Root Walk', tier: 0, col: 1,
      text: 'Commensalism casts give +6% move speed for 2.5s',
      maxLevel: 4, cost: linear(5, 2),
      grant: cast('r', (lv) => ({ speedMult: gain(0.06)(lv), ms: 2500 })),
      mastery: {
        name: 'Splitting Trunk', cost: 12,
        text: 'Commensalism casts burst you out of the bark: 14 to everything within 110px',
        grant: onCast('r', { burst: { damage: 14, radius: 110 } }),
      },
    }),
    /** Defence root: paler, thicker birch bark. */
    gene({
      id: 'gene-wood-paper-bark', name: 'Paper Bark', tier: 0, col: 2,
      text: '+12 max HP',
      maxLevel: 4, cost: linear(5, 2),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Sap Glaze', cost: 12,
        text: 'Start every fight glazed in 20 HP of hardened sap (shield)',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Bitter Steep: an ent with oakbrew in it hits like a falling bough. */
    gene({
      id: 'gene-wood-bitter-steep', name: 'Bitter Steep', tier: 1, col: 0, needs: ['gene-wood-whittled-edge'],
      text: 'Oakbrew casts make the foe take +4% damage for the brew\'s 8s',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('e', (lv) => ({ damageMult: gain(0.04)(lv), ms: 8000 })),
      mastery: {
        name: 'Second Cup', cost: 16,
        text: 'Oakbrew casts have a 15% chance to come straight back — the pot was still warm',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Sapwood: the tree you step out of leaves a ring of green wood on you. */
    gene({
      id: 'gene-wood-sapwood', name: 'Sapwood', tier: 1, col: 1, needs: ['gene-wood-root-walk'],
      text: 'Commensalism casts give 6 shield HP on top of their Sap HP',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('r', (lv) => ({ shield: flat(6)(lv) })),
      mastery: {
        name: 'Watching Birches', cost: 16,
        text: 'When hit, a 15% chance a birch\'s eye catches it first — a shield charge (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'shieldCharge', amount: 1 }),
      },
    }),
    /** Slow Digestion: Digest keeps working after the aura closes. */
    gene({
      id: 'gene-wood-slow-digestion', name: 'Slow Digestion', tier: 1, col: 2, needs: ['gene-wood-paper-bark'],
      text: 'Digest casts heal 4 HP at once',
      maxLevel: 4, cost: linear(6, 3),
      grant: cast('f', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Chewing the Cud', cost: 16,
        text: '+1 HP regenerated every second',
        grant: effect({ regenPerSecond: 1 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Ring Count: every ring in the trunk is a year of getting stronger. */
    gene({
      id: 'gene-wood-ring-count', name: 'Ring Count', tier: 2, col: 0, needs: ['gene-wood-bitter-steep'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Eye Scar', cost: 20,
        text: '+5% crit chance — the birch\'s black eyes see where to cut',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Tannin: whatever the sap gums up stays gummed. */
    gene({
      id: 'gene-wood-tannin', name: 'Tannin', tier: 2, col: 1, needs: ['gene-wood-sapwood'],
      text: '+4% status damage and +4% status duration',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ statusDmgMult: gain(0.04)(lv), statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Haunting Hollows', cost: 20,
        text: 'Every 12s the birches lean your way: +15% move speed for 3s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 12, action: 'tempHaste', mult: 1.15, durationMs: 3000 }),
      },
    }),
    /** Gummed Bark: cut into the ent and the sap comes out on your blade. */
    gene({
      id: 'gene-wood-gummed-bark', name: 'Gummed Bark', tier: 2, col: 2, needs: ['gene-wood-slow-digestion'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(8, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Lifesap', cost: 20,
        text: '4% of the damage you deal comes back to you as health',
        grant: effect({ lifestealFrac: 0.04 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Reaper's Season: the scythe comes off the back sooner. */
    gene({
      id: 'gene-wood-reapers-season', name: 'Reaper\'s Season', tier: 3, col: 0, needs: ['gene-wood-ring-count'],
      text: '−5% Final Harvest (ultimate) cooldown',
      maxLevel: 3, cost: linear(13, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Wide Swathe', cost: 26,
        text: 'Final Harvest casts make whatever survives take +20% damage for 6s',
        grant: onCast('q', { damageMult: 1.2, ms: 6000 }),
      },
    }),
    /** Rings of Plenty: crosses Carving and Hollows — a full belly frees the hands. */
    gene({
      id: 'gene-wood-rings-of-plenty', name: 'Rings of Plenty', tier: 3, col: 1,
      needs: ['gene-wood-tannin', 'gene-wood-ring-count'],
      text: 'Digest casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: linear(10, 4),
      grant: cast('f', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Regrowth', cost: 28,
        text: 'Once per fight, a lethal hit is cancelled and you grow back from the stump at 25% HP',
        grant: effect({ reviveHpFrac: 0.25 }),
      },
    }),
    /** Deadwood: the hard dead core that holds a hollow tree up. */
    gene({
      id: 'gene-wood-deadwood', name: 'Deadwood', tier: 3, col: 2, needs: ['gene-wood-gummed-bark'],
      text: 'The first time you fall below 30% HP, heal 12',
      maxLevel: 3, cost: linear(13, 4),
      grant: stat((lv) => ({ behaviors: [{ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'healBurst', amount: flat(12)(lv) }] })),
      mastery: {
        name: 'Ironbirch', cost: 26,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: a scythe honed on every stone in the wood. */
    enlightened({
      id: 'gene-wood-enl-scythe', name: 'Enlightened Scythe', col: 0, needs: ['gene-wood-reapers-season'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the sap rising a little earlier every spring. */
    enlightened({
      id: 'gene-wood-enl-sap', name: 'Enlightened Sap', col: 1, needs: ['gene-wood-rings-of-plenty'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more ring, forever. */
    enlightened({
      id: 'gene-wood-enl-ring', name: 'Enlightened Ring', col: 2, needs: ['gene-wood-deadwood'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
