import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Lodeblood — Magnet's gene tree.
 *
 * Magnet is a scrap-metal magician: Coin Flip from the hand (a coin that lands 3s later),
 * Repulse (a close cone that fires every coin, spike, nail and scrap the way you face), Nail
 * Implant (again: rip every nail out), Steel Spike (a rod that follows the cursor 2s, then slams
 * — again: ride to it) and Mecha Massacre (stand still 7.5s as scrap gathers, then pilot a mech
 * for 15s). Three lines: **Repulsion** (the cone, the slam, the mech — iron that hits),
 * **Ironmonger** (nails, rods and cooldowns — iron that moves) and **Field** (plates, poles and
 * the cockpit — iron that holds).
 *
 * Engine notes: the "again" presses (rip-out, ride) never touch a cooldown, so only the first
 * nail and the first spike pay a gene rule out. The coin lands 3s after its cast, so a 0.45s
 * click window would miss it — no node keys off Click.
 */
export const MAGNET_GENE_TREE: GeneTree = {
  element: 'magnet',
  name: 'Lodeblood',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: the cone leaves the foe's iron ringing for as long as it takes to recharge. */
    gene({
      id: 'gene-magnet-repel', name: 'Like Poles', tier: 0, col: 0,
      text: 'Repulse casts make the foe take +3% damage for 2.5s',
      maxLevel: 4, cost: linear(8, 2),
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 2500 })),
      mastery: {
        name: 'Polarity', cost: 18,
        text: 'Hits have a 12% chance to magnetise your hand: +10% damage for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.12, cooldownSec: 5, action: 'tempDamage', mult: 1.1, durationMs: 2000 }),
      },
    }),
    /** Identity root: each nail that goes in pulls the rest of the kit round on its field. */
    gene({
      id: 'gene-magnet-pull-of-the-nail', name: 'Pull of the Nail', tier: 0, col: 1,
      text: 'Nail Implant casts shave 250ms off every other cooldown',
      maxLevel: 4, cost: linear(8, 2),
      grant: cast('r', (lv) => ({ refundOthers: flat(250)(lv) })),
      mastery: {
        name: 'Iron in the Boots', cost: 18,
        text: '−5% foe move speed — every nail you have ever thrown is still in their soles',
        grant: effect({ enemySpeedMult: 0.95 }),
      },
    }),
    /** Defence root: a coat of combed filings, lying flat along the field. */
    gene({
      id: 'gene-magnet-iron-filings', name: 'Iron Filings', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(8, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Scrap Plate', cost: 18,
        text: 'Start every fight behind one plate of scrap: a shield charge',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Spike Slam: two seconds of rod overhead and the foe flinches before it falls. */
    gene({
      id: 'gene-magnet-spike-slam', name: 'Spike Slam', tier: 1, col: 0, needs: ['gene-magnet-repel'],
      text: 'Steel Spike casts make the foe take +5% damage for 2.5s — the follow and the slam',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('f', (lv) => ({ damageMult: gain(0.05)(lv), ms: 2500 })),
      mastery: {
        name: 'Shrapnel Cone', cost: 22,
        text: 'Repulse casts shed loose scrap all round you: 14 to everything within 100px',
        grant: onCast('e', { burst: { damage: 14, radius: 100 } }),
      },
    }),
    /** Field Lines: throw the nail and walk the line it draws. */
    gene({
      id: 'gene-magnet-field-lines', name: 'Field Lines', tier: 1, col: 1, needs: ['gene-magnet-pull-of-the-nail'],
      text: 'Nail Implant casts give +5% move speed for 2s',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('r', (lv) => ({ speedMult: gain(0.05)(lv), ms: 2000 })),
      mastery: {
        name: 'Spare Nail', cost: 22,
        text: 'Nail Implant casts have a 15% chance to come straight back — there was a second nail in your teeth',
        grant: onCast('r', { refundSelfChance: 0.15 }),
      },
    }),
    /** Pole Shield: the cone pushes out, and the field it leaves pushes everything else off you. */
    gene({
      id: 'gene-magnet-pole-shield', name: 'Pole Shield', tier: 1, col: 2, needs: ['gene-magnet-iron-filings'],
      text: 'Repulse casts give you 4 shield HP',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('e', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Counter-Field', cost: 22,
        text: 'When hit, a 20% chance to flip the field on them: 25% slower for 2s (at most every 5s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.2, cooldownSec: 5, action: 'slowEnemy', mult: 0.75, durationMs: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Tempered Steel: every coin and nail quenched harder. */
    gene({
      id: 'gene-magnet-tempered-steel', name: 'Tempered Steel', tier: 2, col: 0, needs: ['gene-magnet-spike-slam'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Lodestone Eye', cost: 26,
        text: '+5% crit chance — you can feel where the iron in them is thinnest',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Strong Pull: everything you have thrown wants to come home sooner. */
    gene({
      id: 'gene-magnet-strong-pull', name: 'Strong Pull', tier: 2, col: 1, needs: ['gene-magnet-field-lines'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Compass Needle', cost: 26,
        text: 'Every 10s the needle swings round to you: −1s on every cooldown',
        grant: behavior({ trigger: 'everyNSec', periodSec: 10, action: 'cooldownRefund', amount: 1000 }),
      },
    }),
    /** Eddy Current: a hit through a moving field drags a current back the other way. */
    gene({
      id: 'gene-magnet-eddy-current', name: 'Eddy Current', tier: 2, col: 2, needs: ['gene-magnet-pole-shield'],
      text: 'Reflect 3% of damage taken back at the attacker',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ reflectFraction: flat(0.03)(lv) })),
      mastery: {
        name: 'Keeper Bar', cost: 26,
        text: 'The first time you drop below 35% HP, a keeper bar snaps across you: two shield charges',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.35, action: 'shieldCharge', amount: 2 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Scrap Tide: from the first scrap gathering to the mech's last step, the foe is in the field. */
    gene({
      id: 'gene-magnet-scrap-tide', name: 'Scrap Tide', tier: 3, col: 0, needs: ['gene-magnet-tempered-steel'],
      text: 'Mecha Massacre casts make the foe take +6% damage for 22.5s — the gathering and the mech',
      maxLevel: 3, cost: linear(16, 4),
      grant: cast('q', (lv) => ({ damageMult: gain(0.06)(lv), ms: 22500 })),
      mastery: {
        name: 'Scrap Storm', cost: 32,
        text: 'Mecha Massacre casts rip every loose bolt in reach toward you: 22 to everything within 150px',
        grant: onCast('q', { burst: { damage: 22, radius: 150 } }),
      },
    }),
    /** Recycler: crosses Repulsion and Ironmonger — the rod comes back as a splint. */
    gene({
      id: 'gene-magnet-recycler', name: 'Recycler', tier: 3, col: 1,
      needs: ['gene-magnet-strong-pull', 'gene-magnet-tempered-steel'],
      text: 'Steel Spike casts heal 4 HP',
      maxLevel: 4, cost: linear(13, 4),
      grant: cast('f', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Salvage Yard', cost: 34,
        text: 'Every 12s you patch yourself from the scrap round your feet: heal 8',
        grant: behavior({ trigger: 'everyNSec', periodSec: 12, action: 'healBurst', amount: 8 }),
      },
    }),
    /** Cockpit Armour: seven and a half seconds stood still — the scrap guards you while it gathers. */
    gene({
      id: 'gene-magnet-cockpit-armour', name: 'Cockpit Armour', tier: 3, col: 2, needs: ['gene-magnet-eddy-current'],
      text: 'Mecha Massacre casts give you 12 shield HP while the scrap gathers',
      maxLevel: 3, cost: linear(16, 4),
      grant: cast('q', (lv) => ({ shield: flat(12)(lv) })),
      mastery: {
        name: 'Hull Plating', cost: 32,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more wrap of wire round the core. */
    enlightened({
      id: 'gene-magnet-enl-winding', name: 'Enlightened Winding', col: 0, needs: ['gene-magnet-scrap-tide'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the field a hair stronger, every aurora. */
    enlightened({
      id: 'gene-magnet-enl-field', name: 'Enlightened Field', col: 1, needs: ['gene-magnet-recycler'],
      text: '−0.3% cooldowns (compounding)',
      grant: stat((lv) => ({ cooldownMult: fade(0.003)(lv) })),
    }),
    /** Enlightened: one more plate bolted on. */
    enlightened({
      id: 'gene-magnet-enl-plate', name: 'Enlightened Plate', col: 2, needs: ['gene-magnet-cockpit-armour'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
