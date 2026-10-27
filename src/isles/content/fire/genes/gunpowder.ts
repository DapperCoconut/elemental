import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from './helpers';

/**
 * Powderhorn — Gunpowder's gene tree.
 *
 * A soldier's drill book in three columns: **Musketry** (Musket Shot's reload rhythm and the
 * BlunderBlast cough-back), **Armoury** (Arsenal Expansion and Fire at Will — a bigger, faster
 * volley) and **Retreat** (Explosive Retreat as a real defensive tool: blast shields, smoke,
 * and a rally drum that gets you back up).
 */
export const GUNPOWDER_GENE_TREE: GeneTree = {
  element: 'gunpowder',
  name: 'Powderhorn',
  nodes: [
    // ── Tier 0 ────────────────────────────────────────────────────────
    /** Rifled Barrel: a musket ball that spins leaves a wound that stays open. */
    gene({
      id: 'gene-gunpowder-rifled-barrel', name: 'Rifled Barrel', tier: 0, col: 0,
      text: 'Musket Shot casts make the foe take +2% damage for 1.2s',
      maxLevel: 5, cost: linear(3, 2),
      grant: cast('click', (lv) => ({ damageMult: gain(0.02)(lv), ms: 1200 })),
      mastery: {
        name: 'Paper Cartridge', cost: 10,
        text: '+5% crit chance',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Quartermaster: drawing a new weapon squares the rest of the kit away. */
    gene({
      id: 'gene-gunpowder-quartermaster', name: 'Quartermaster', tier: 0, col: 1,
      text: 'Arsenal Expansion casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: linear(4, 2),
      grant: cast('f', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Spoils of War', cost: 10,
        text: 'Arsenal Expansion casts also strap on 15 shield',
        grant: onCast('f', { shield: 15 }),
      },
    }),
    /** Powder Burns: scar tissue from a hundred misfires. */
    gene({
      id: 'gene-gunpowder-powder-burns', name: 'Powder Burns', tier: 0, col: 2,
      text: '+12 max HP',
      maxLevel: 4, cost: linear(4, 2),
      grant: stat((lv) => ({ maxHp: flat(12)(lv) })),
      mastery: {
        name: 'Leather Bandolier', cost: 10,
        text: 'Start every fight with 1 shield charge that blocks a whole hit',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Ramrod Rhythm: each musket fired keeps the drill moving. */
    gene({
      id: 'gene-gunpowder-ramrod-rhythm', name: 'Ramrod Rhythm', tier: 1, col: 0, needs: ['gene-gunpowder-rifled-barrel'],
      text: 'Musket Shot casts shave 60ms off every other cooldown',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('click', (lv) => ({ refundOthers: flat(60)(lv) })),
      mastery: {
        name: 'Hot Barrels', cost: 14,
        text: 'Musket Shot casts give +8% move speed for 1s — fire, step, fire',
        grant: onCast('click', { speedMult: 1.08, ms: 1000 }),
      },
    }),
    /** Volley Drill: crosses Musketry and Armoury — every gun at once opens them up. */
    gene({
      id: 'gene-gunpowder-volley-drill', name: 'Volley Drill', tier: 1, col: 1,
      needs: ['gene-gunpowder-quartermaster', 'gene-gunpowder-rifled-barrel'],
      text: 'Fire at Will casts make the foe take +4% damage for 2.5s',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 2500 })),
      mastery: {
        name: 'Broadside', cost: 14,
        text: 'Fire at Will casts also blow powder smoke into everything within 110px for 16',
        grant: onCast('r', { burst: { damage: 16, radius: 110 } }),
      },
    }),
    /** Blast Shield: Explosive Retreat throws a plate up between you and the blast. */
    gene({
      id: 'gene-gunpowder-blast-shield', name: 'Blast Shield', tier: 1, col: 2, needs: ['gene-gunpowder-powder-burns'],
      text: 'Explosive Retreat casts grant 6 shield',
      maxLevel: 4, cost: linear(5, 3),
      grant: cast('e', (lv) => ({ shield: flat(6)(lv) })),
      mastery: {
        name: 'Smoke Cloak', cost: 14,
        text: 'Explosive Retreat casts give +25% move speed for 2s',
        grant: onCast('e', { speedMult: 1.25, ms: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Match Cord: drier powder, harder shot. */
    gene({
      id: 'gene-gunpowder-match-cord', name: 'Match Cord', tier: 2, col: 0, needs: ['gene-gunpowder-ramrod-rhythm'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Grapeshot', cost: 18,
        text: '+4% crit chance, and crits deal at least 1.8× damage',
        grant: effect({ critChance: 0.04, critMult: 1.8 }),
      },
    }),
    /** Armoury: a well-kept rack sometimes hands you a loaded volley straight back. */
    gene({
      id: 'gene-gunpowder-armoury', name: 'Armoury', tier: 2, col: 1, needs: ['gene-gunpowder-volley-drill'],
      text: 'Fire at Will casts have a 7% chance to come straight back off cooldown',
      maxLevel: 3, cost: linear(9, 4),
      grant: cast('r', (lv) => ({ refundSelfChance: flat(0.07)(lv) })),
      mastery: {
        name: 'Powder Monkey', cost: 18,
        text: 'Fire at Will casts also shave 600ms off every other cooldown',
        grant: onCast('r', { refundOthers: 600 }),
      },
    }),
    /** Dug In: a soldier who knows where cover is. */
    gene({
      id: 'gene-gunpowder-dug-in', name: 'Dug In', tier: 2, col: 2, needs: ['gene-gunpowder-blast-shield'],
      text: '−2.5% damage taken',
      maxLevel: 4, cost: linear(7, 3),
      grant: stat((lv) => ({ damageTakenMult: cut(0.025)(lv) })),
      mastery: {
        name: 'Sandbags', cost: 18,
        text: 'When hit, a 20% chance to blow a mine under foes near you for 12 (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'burstAoe', amount: 12, radius: 120 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Swallowed Shot: BlunderBlast's vacuum opens more often. */
    gene({
      id: 'gene-gunpowder-swallowed-shot', name: 'Swallowed Shot', tier: 3, col: 0, needs: ['gene-gunpowder-match-cord'],
      text: '−5% BlunderBlast (ultimate) cooldown',
      maxLevel: 3, cost: linear(12, 4),
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Gutful of Lead', cost: 24,
        text: 'BlunderBlast casts make the foe take +15% damage for 5s — long enough for the cough-back',
        grant: onCast('q', { damageMult: 1.15, ms: 5000 }),
      },
    }),
    /** Field Marshal: the whole battery drills tighter. Crosses Armoury and Retreat. */
    gene({
      id: 'gene-gunpowder-field-marshal', name: 'Field Marshal', tier: 3, col: 1,
      needs: ['gene-gunpowder-armoury', 'gene-gunpowder-dug-in'],
      text: '−3% cooldowns',
      maxLevel: 4, cost: linear(9, 4),
      grant: stat((lv) => ({ cooldownMult: cut(0.03)(lv) })),
      mastery: {
        name: 'Last Volley', cost: 26,
        text: 'The first time you fall below 30% HP, every cooldown skips 4s',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.3, action: 'cooldownRefund', amount: 4000 }),
      },
    }),
    /** Retreat in Good Order: falling back is how you live to reload. */
    gene({
      id: 'gene-gunpowder-good-order', name: 'Retreat in Good Order', tier: 3, col: 2, needs: ['gene-gunpowder-dug-in'],
      text: 'Explosive Retreat casts heal 4 HP',
      maxLevel: 3, cost: linear(12, 4),
      grant: cast('e', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Rally Drum', cost: 24,
        text: 'Once per fight, a lethal hit is cancelled and you are back on your feet at 20% HP',
        grant: effect({ reviveHpFrac: 0.2 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: the powder grows ever so slightly hotter. */
    enlightened({
      id: 'gene-gunpowder-enl-powder', name: 'Enlightened Powder', col: 0, needs: ['gene-gunpowder-swallowed-shot'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the drill gets a little faster every season. */
    enlightened({
      id: 'gene-gunpowder-enl-drill', name: 'Enlightened Drill', col: 1, needs: ['gene-gunpowder-field-marshal'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: the veteran's hide. */
    enlightened({
      id: 'gene-gunpowder-enl-veteran', name: 'Enlightened Veteran', col: 2, needs: ['gene-gunpowder-good-order'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
