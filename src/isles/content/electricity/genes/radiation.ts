import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, linear, onCast, stat } from '../../fire/genes/helpers';

/**
 * Pitchblende — Radiation's gene tree.
 *
 * Radiation is a sniper in lead: Radiation Railgun from the hand (Geiger Tracers that do no
 * damage — the third on one body fires the railgun for 50 and irradiates), Barrage (a sighting
 * cone held on a body for 3s, then five hitscan rounds), Fallout Bunker (75 HP of lead for 10s),
 * Rod Baton (close strike — irradiates, or stuns the already irradiated) and Extermination (five
 * flares into one body calls an airdrop: 200 to everything on screen, you included). Three
 * lines: **Sniper** (the tracer, the cone and the airdrop), **Fallout** (the baton and the
 * statuses that linger) and **Lead** (the bunker and the shielding a sniper wants between
 * themselves and the blast).
 *
 * Engine notes: the tracers deal nothing, so the Click node buys a sniper's relocation (move
 * speed in a 0.6s window, under the 620ms cooldown — it cannot stack) rather than a damage
 * window. The kit refunds a cast only for a dead caster or a cone already open, so its R/F/Q
 * rules never pay out on a refused press in practice.
 */
export const RADIATION_GENE_TREE: GeneTree = {
  element: 'radiation',
  name: 'Pitchblende',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: while the cone closes, the foe already knows how this ends. */
    gene({
      id: 'gene-rad-long-sight', name: 'Long Sight', tier: 0, col: 0,
      text: 'Barrage casts make the foe take +3% damage for 4s — the closing cone and the burst',
      maxLevel: 4, cost: linear(8, 2),
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 4000 })),
      mastery: {
        name: 'Hollow Point', cost: 18,
        text: '+5% crit chance',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Identity root: hot isotopes, slow to cool. */
    gene({
      id: 'gene-rad-hot-isotope', name: 'Hot Isotope', tier: 0, col: 1,
      text: '+3% status damage',
      maxLevel: 4, cost: linear(8, 2),
      grant: stat((lv) => ({ statusDmgMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Contamination', cost: 18,
        text: 'Hits have a 10% chance to contaminate: 14 over 4s (at most every 4s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 4, action: 'sear', amount: 14, durationMs: 4000 }),
      },
    }),
    /** Defence root: the apron every miner in Halflife wears to the face. */
    gene({
      id: 'gene-rad-lead-apron', name: 'Lead Apron', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: linear(8, 2),
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Lead Sheet', cost: 18,
        text: 'Start every fight behind a 20 HP sheet of lead',
        grant: effect({ shieldHp: 20 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Spotter: tag them and move — never take two shots from the same spot. */
    gene({
      id: 'gene-rad-spotter', name: 'Spotter', tier: 1, col: 0, needs: ['gene-rad-long-sight'],
      text: 'Railgun tracer casts give +3% move speed for 0.6s',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('click', (lv) => ({ speedMult: gain(0.03)(lv), ms: 600 })),
      mastery: {
        name: 'Pinned Down', cost: 22,
        text: '−5% foe move speed — they know there is a scope on them',
        grant: effect({ enemySpeedMult: 0.95 }),
      },
    }),
    /** Hot Rod: a uranium baton, and the foe it touches is easier to hurt for a breath. */
    gene({
      id: 'gene-rad-hot-rod', name: 'Hot Rod', tier: 1, col: 1, needs: ['gene-rad-hot-isotope'],
      text: 'Rod Baton casts make the foe take +5% damage for 2s',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('f', (lv) => ({ damageMult: gain(0.05)(lv), ms: 2000 })),
      mastery: {
        name: 'Chain Reaction', cost: 22,
        text: 'Rod Baton casts go critical round you: 16 to everything within 110px',
        grant: onCast('f', { burst: { damage: 16, radius: 110 } }),
      },
    }),
    /** Bunker Lining: a coat of the bunker's lead comes away on you. */
    gene({
      id: 'gene-rad-bunker-lining', name: 'Bunker Lining', tier: 1, col: 2, needs: ['gene-rad-lead-apron'],
      text: 'Fallout Bunker casts give you 6 shield HP',
      maxLevel: 4, cost: linear(9, 3),
      grant: cast('r', (lv) => ({ shield: flat(6)(lv) })),
      mastery: {
        name: 'Sealed Hatch', cost: 22,
        text: 'Fallout Bunker casts take 2s off every other cooldown — reload in the dark',
        grant: onCast('r', { refundOthers: 2000 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Depleted Uranium: denser rounds, deeper holes. */
    gene({
      id: 'gene-rad-depleted-uranium', name: 'Depleted Uranium', tier: 2, col: 0, needs: ['gene-rad-spotter'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Confirmed Kill', cost: 26,
        text: 'Hits have a 10% chance to steady your aim: +12% damage for 2s (at most every 6s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.1, cooldownSec: 6, action: 'tempDamage', mult: 1.12, durationMs: 2000 }),
      },
    }),
    /** Long Half-Life: what you leave in them takes its time decaying. */
    gene({
      id: 'gene-rad-long-half-life', name: 'Long Half-Life', tier: 2, col: 1, needs: ['gene-rad-hot-rod'],
      text: '+4% status duration',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ statusDurMult: gain(0.04)(lv) })),
      mastery: {
        name: 'Background Count', cost: 26,
        text: 'Every 8s the dose catches up with them: 8 over 2s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 8, action: 'sear', amount: 8, durationMs: 2000 }),
      },
    }),
    /** Decontamination: the shower block at the pithead, every shift. */
    gene({
      id: 'gene-rad-decontamination', name: 'Decontamination', tier: 2, col: 2, needs: ['gene-rad-bunker-lining'],
      text: '+0.4 HP regenerated every second',
      maxLevel: 4, cost: linear(11, 3),
      grant: stat((lv) => ({ regenPerSecond: flat(0.4)(lv) })),
      mastery: {
        name: 'Iodine Tablet', cost: 26,
        text: 'The first time you drop below 40% HP, the dose is blocked: two shield charges',
        grant: behavior({ trigger: 'onLowHp', thresholdFrac: 0.4, action: 'shieldCharge', amount: 2 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Flare Spotter: once the flare gun is out, every shot is a shot at a marked body. */
    gene({
      id: 'gene-rad-flare-spotter', name: 'Flare Spotter', tier: 3, col: 0, needs: ['gene-rad-depleted-uranium'],
      text: 'Extermination casts make the foe take +8% damage for 8s while the flares fly',
      maxLevel: 3, cost: linear(16, 4),
      grant: cast('q', (lv) => ({ damageMult: gain(0.08)(lv), ms: 8000 })),
      mastery: {
        name: 'Airdrop Marker', cost: 32,
        text: 'Extermination casts pop a marker charge at your feet: 24 to everything within 140px',
        grant: onCast('q', { burst: { damage: 24, radius: 140 } }),
      },
    }),
    /** Fallout Shelter: crosses Sniper and Fallout — the bunker has a first-aid kit on the wall. */
    gene({
      id: 'gene-rad-fallout-shelter', name: 'Fallout Shelter', tier: 3, col: 1,
      needs: ['gene-rad-long-half-life', 'gene-rad-depleted-uranium'],
      text: 'Fallout Bunker casts heal 4 HP',
      maxLevel: 4, cost: linear(13, 4),
      grant: cast('r', (lv) => ({ heal: flat(4)(lv) })),
      mastery: {
        name: 'Glow in the Dark', cost: 34,
        text: '+10% status damage and +10% status duration',
        grant: effect({ statusDmgMult: 1.1, statusDurMult: 1.1 }),
      },
    }),
    /** Blast Door: the airdrop does not care whose side you are on — be behind something when it lands. */
    gene({
      id: 'gene-rad-blast-door', name: 'Blast Door', tier: 3, col: 2, needs: ['gene-rad-decontamination'],
      text: 'Extermination casts give you 12 shield HP against your own airdrop',
      maxLevel: 3, cost: linear(16, 4),
      grant: cast('q', (lv) => ({ shield: flat(12)(lv) })),
      mastery: {
        name: 'Lead-Lined Coat', cost: 32,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: a richer seam of ore every year. */
    enlightened({
      id: 'gene-rad-enl-enrichment', name: 'Enlightened Enrichment', col: 0, needs: ['gene-rad-flare-spotter'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the clicks of the counter come closer together. */
    enlightened({
      id: 'gene-rad-enl-geiger', name: 'Enlightened Geiger', col: 1, needs: ['gene-rad-fallout-shelter'],
      text: '+0.4% status damage',
      grant: stat((lv) => ({ statusDmgMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: one more layer of lead. */
    enlightened({
      id: 'gene-rad-enl-shielding', name: 'Enlightened Shielding', col: 2, needs: ['gene-rad-blast-door'],
      text: '+1 max HP',
      grant: stat((lv) => ({ maxHp: flat(1)(lv) })),
    }),
  ],
};
