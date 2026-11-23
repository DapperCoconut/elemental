import type { GeneTree } from '../../../IslesTypes';
import { behavior, cast, cut, effect, enlightened, fade, flat, gain, gene, onCast, stat } from '../../fire/genes/helpers';
import { PRICE } from './prices';

/**
 * Bandstand — Sound's gene tree.
 *
 * Sound is a drum major: a baton always out on its leash, Crescendo's two-second dance that ends
 * in a wave, Fermata's dash-and-slam that puts the foe Out of Tune, Hum to change Soul Song, and
 * the bugle solo of Call of the Void. The tree has three sections: **Brass** (Fermata and the
 * wave — the band that hits), **March** (Crescendo and Hum — tempo, the cooldowns coming round on
 * the beat) and **Choir** (the Smooth song and the solo — breath, felt and bronze).
 *
 * No node keys off the Baton: it re-casts on every click (120ms), metronome hit or miss, so a
 * per-cast rule there would pay for button-mashing rather than for keeping time. Fermata's
 * detonation recast is free and reports no cast, so only the slam itself pays out.
 */
export const SOUND_GENE_TREE: GeneTree = {
  element: 'sound',
  name: 'Bandstand',
  nodes: [
    // ── Tier 0 — the three roots ─────────────────────────────────────
    /** Offence root: the slam rings, and a ringing foe is a soft one. */
    gene({
      id: 'gene-sound-cymbal-crash', name: 'Cymbal Crash', tier: 0, col: 0,
      text: 'Fermata casts make the foe take +4% damage for 3s',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('r', (lv) => ({ damageMult: gain(0.04)(lv), ms: 3000 })),
      mastery: {
        name: 'Rimshot', cost: PRICE.rootMastery,
        text: 'Fermata casts crack off the rim where you land: 16 to everything within 100px',
        grant: onCast('r', { burst: { damage: 16, radius: 100 } }),
      },
    }),
    /** Identity root: a drum major who dances keeps the whole band moving. */
    gene({
      id: 'gene-sound-quickstep', name: 'Quickstep', tier: 0, col: 1,
      text: 'Crescendo casts shave 300ms off every other cooldown',
      maxLevel: 4, cost: PRICE.root,
      grant: cast('e', (lv) => ({ refundOthers: flat(300)(lv) })),
      mastery: {
        name: 'Encore', cost: PRICE.rootMastery,
        text: 'Crescendo casts have a 15% chance to come straight back — the crowd wants it again',
        grant: onCast('e', { refundSelfChance: 0.15 }),
      },
    }),
    /** Defence root: a reed cut true does not crack under a wrong note. */
    gene({
      id: 'gene-sound-tuned-reed', name: 'Tuned Reed', tier: 0, col: 2,
      text: '−2% damage taken',
      maxLevel: 4, cost: PRICE.root,
      grant: stat((lv) => ({ damageTakenMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Bandstand Canopy', cost: PRICE.rootMastery,
        text: 'Start every fight under the canopy: 1 shield charge',
        grant: effect({ shieldCharges: 1 }),
      },
    }),

    // ── Tier 1 ────────────────────────────────────────────────────────
    /** Oompah: the dance's closing wave lands on a foe already reeling from the tuba. */
    gene({
      id: 'gene-sound-oompah', name: 'Oompah', tier: 1, col: 0, needs: ['gene-sound-cymbal-crash'],
      text: 'Crescendo casts make the foe take +3% damage for 2.6s — through the wave at the end',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('e', (lv) => ({ damageMult: gain(0.03)(lv), ms: 2600 })),
      mastery: {
        name: 'Brass Section', cost: PRICE.t1Mastery,
        text: '+5% crit chance — the trombones come in loud',
        grant: effect({ critChance: 0.05 }),
      },
    }),
    /** Key Change: a new Soul Song puts a spring in the step for as long as it is fresh. */
    gene({
      id: 'gene-sound-key-change', name: 'Key Change', tier: 1, col: 1, needs: ['gene-sound-quickstep'],
      text: 'Hum casts give +4% move speed for 2.5s',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('f', (lv) => ({ speedMult: gain(0.04)(lv), ms: 2500 })),
      mastery: {
        name: 'Modulation', cost: PRICE.t1Mastery,
        text: 'Hum casts shave 250ms off every other cooldown',
        grant: onCast('f', { refundOthers: 250 }),
      },
    }),
    /** Bell Cover: the slam's dash ends behind a bronze bell-mouth. */
    gene({
      id: 'gene-sound-bell-cover', name: 'Bell Cover', tier: 1, col: 2, needs: ['gene-sound-tuned-reed'],
      text: 'Fermata casts give you 4 shield HP',
      maxLevel: 4, cost: PRICE.t1,
      grant: cast('r', (lv) => ({ shield: flat(4)(lv) })),
      mastery: {
        name: 'Damper Pedal', cost: PRICE.t1Mastery,
        text: 'When hit, a 15% chance to step out of it: +30% speed for 1.5s (at most every 6s)',
        grant: behavior({ trigger: 'onHitTaken', chance: 0.15, cooldownSec: 6, action: 'tempHaste', mult: 1.3, durationMs: 1500 }),
      },
    }),

    // ── Tier 2 ────────────────────────────────────────────────────────
    /** Forte: everything a little louder. */
    gene({
      id: 'gene-sound-forte', name: 'Forte', tier: 2, col: 0, needs: ['gene-sound-oompah'],
      text: '+3% damage dealt',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ damageMult: gain(0.03)(lv) })),
      mastery: {
        name: 'Sforzando', cost: PRICE.t2Mastery,
        text: 'Hits have an 8% chance to swell: +20% damage for 2s (at most every 8s)',
        grant: behavior({ trigger: 'onHitDealt', chance: 0.08, cooldownSec: 8, action: 'tempDamage', mult: 1.2, durationMs: 2000 }),
      },
    }),
    /** Metronome: the beat bar ticks a hair quicker for you than for anyone else. */
    gene({
      id: 'gene-sound-metronome', name: 'Metronome', tier: 2, col: 1, needs: ['gene-sound-key-change'],
      text: '−2% cooldowns',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ cooldownMult: cut(0.02)(lv) })),
      mastery: {
        name: 'Strict Tempo', cost: PRICE.t2Mastery,
        text: 'Every 8s, on the downbeat, every cooldown skips 0.5s',
        grant: behavior({ trigger: 'everyNSec', periodSec: 8, action: 'cooldownRefund', amount: 500 }),
      },
    }),
    /** Smooth Song: the green Soul Song hums under your breath even when you are not singing it. */
    gene({
      id: 'gene-sound-smooth-song', name: 'Smooth Song', tier: 2, col: 2, needs: ['gene-sound-bell-cover'],
      text: '+0.5 HP regenerated every second',
      maxLevel: 4, cost: PRICE.t2,
      grant: stat((lv) => ({ regenPerSecond: flat(0.5)(lv) })),
      mastery: {
        name: "Bandsman's Lungs", cost: PRICE.t2Mastery,
        text: '+20 max HP — a chest that can hold a sousaphone note',
        grant: effect({ maxHp: 20 }),
      },
    }),

    // ── Tier 3 ────────────────────────────────────────────────────────
    /** Showstopper: the bugle is back at your lips sooner. */
    gene({
      id: 'gene-sound-showstopper', name: 'Showstopper', tier: 3, col: 0, needs: ['gene-sound-forte'],
      text: '−5% Call of the Void (ultimate) cooldown',
      maxLevel: 3, cost: PRICE.t3,
      grant: stat((lv) => ({ ultimateCooldownMult: cut(0.05)(lv) })),
      mastery: {
        name: 'Standing Ovation', cost: PRICE.t3Mastery,
        text: 'Call of the Void casts blast the first note out of the bell: 22 to everything within 140px',
        grant: onCast('q', { burst: { damage: 22, radius: 140 } }),
      },
    }),
    /** Counterpoint: crosses Brass and March — the dance that breathes life back into the dancer. */
    gene({
      id: 'gene-sound-counterpoint', name: 'Counterpoint', tier: 3, col: 1,
      needs: ['gene-sound-metronome', 'gene-sound-forte'],
      text: 'Crescendo casts heal 3 HP',
      maxLevel: 4, cost: PRICE.cross,
      grant: cast('e', (lv) => ({ heal: flat(3)(lv) })),
      mastery: {
        name: 'Da Capo', cost: PRICE.crossMastery,
        text: 'Once per fight, a lethal hit is cancelled and you play it again from the top at 20% HP',
        grant: effect({ reviveHpFrac: 0.2 }),
      },
    }),
    /** Sostenuto: the solo's last held note hangs round you like a pedal tone. */
    gene({
      id: 'gene-sound-sostenuto', name: 'Sostenuto', tier: 3, col: 2, needs: ['gene-sound-smooth-song'],
      text: 'Call of the Void casts give you 8 shield HP — still there when the solo ends',
      maxLevel: 3, cost: PRICE.t3,
      grant: cast('q', (lv) => ({ shield: flat(8)(lv) })),
      mastery: {
        name: 'Bronze Bell', cost: PRICE.t3Mastery,
        text: '−6% damage taken',
        grant: effect({ damageTakenMult: 0.94 }),
      },
    }),

    // ── Tier 4 — Enlightened ─────────────────────────────────────────
    /** Enlightened: one more horn in the band, every season. */
    enlightened({
      id: 'gene-sound-enl-brass', name: 'Enlightened Brass', col: 0, needs: ['gene-sound-showstopper'],
      text: '+0.4% damage dealt',
      grant: stat((lv) => ({ damageMult: gain(0.004)(lv) })),
    }),
    /** Enlightened: the march steps out a little quicker each time it passes. */
    enlightened({
      id: 'gene-sound-enl-march', name: 'Enlightened March', col: 1, needs: ['gene-sound-counterpoint'],
      text: '+0.3% move speed',
      grant: stat((lv) => ({ speedMult: gain(0.003)(lv) })),
    }),
    /** Enlightened: one more breath held under the note, forever. */
    enlightened({
      id: 'gene-sound-enl-breath', name: 'Enlightened Breath', col: 2, needs: ['gene-sound-sostenuto'],
      text: '−0.3% damage taken (compounding)',
      grant: stat((lv) => ({ damageTakenMult: fade(0.003)(lv) })),
    }),
  ],
};
